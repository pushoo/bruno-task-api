// MCP server: exposes the same task store as MCP tools over Streamable HTTP.
// Stateless mode: every POST /mcp gets a fresh server + transport, and responses
// come back as plain JSON — so you can test it with Bruno like any REST call.

const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/streamableHttp.js');
const { z } = require('zod');
const store = require('./store');

const asText = (data) => ({ content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] });
const notFound = (id) => ({ isError: true, content: [{ type: 'text', text: `Task ${id} not found` }] });

function buildServer() {
  const server = new McpServer({ name: 'task-api-mcp', version: '1.0.0' });

  server.registerTool('list_tasks', {
    title: 'List tasks',
    description: 'List tasks, optionally filtered by done status, priority or a search word.',
    inputSchema: {
      done: z.boolean().optional().describe('Only tasks with this done status'),
      priority: z.enum(['low', 'medium', 'high']).optional(),
      search: z.string().optional().describe('Text the title must contain'),
    },
  }, async (args) => asText(store.list(args)));

  server.registerTool('get_task', {
    title: 'Get a task',
    description: 'Get one task by its id.',
    inputSchema: { id: z.string().describe('Task id') },
  }, async ({ id }) => {
    const task = store.get(id);
    return task ? asText(task) : notFound(id);
  });

  server.registerTool('create_task', {
    title: 'Create a task',
    description: 'Create a new task.',
    inputSchema: {
      title: z.string().min(3),
      priority: z.enum(['low', 'medium', 'high']).optional(),
    },
  }, async (args) => asText(store.create(args)));

  server.registerTool('update_task', {
    title: 'Update a task',
    description: 'Change a task title, priority or done status.',
    inputSchema: {
      id: z.string(),
      title: z.string().min(3).optional(),
      done: z.boolean().optional(),
      priority: z.enum(['low', 'medium', 'high']).optional(),
    },
  }, async ({ id, ...changes }) => {
    const task = store.update(id, changes);
    return task ? asText(task) : notFound(id);
  });

  server.registerTool('delete_task', {
    title: 'Delete a task',
    description: 'Delete a task by id.',
    inputSchema: { id: z.string() },
  }, async ({ id }) => (store.remove(id) ? asText({ deleted: id }) : notFound(id)));

  return server;
}

async function handleMcp(req, res) {
  const server = buildServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless
    enableJsonResponse: true, // plain JSON instead of an SSE stream
  });
  res.on('close', () => {
    transport.close();
    server.close();
  });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error('MCP error:', err);
    if (!res.headersSent) {
      res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal server error' }, id: null });
    }
  }
}

function methodNotAllowed(req, res) {
  res.status(405).json({ jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed. Use POST /mcp.' }, id: null });
}

module.exports = { handleMcp, methodNotAllowed };
