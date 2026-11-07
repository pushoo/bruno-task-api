const http = require('http');
const path = require('path');
const express = require('express');
const restRouter = require('./src/rest');
const { handleMcp, methodNotAllowed } = require('./src/mcp');
const { graphqlHandler } = require('./src/graphql');
const { attachWebSocket } = require('./src/ws');
const { startGrpc } = require('./src/grpc');

const app = express();
app.disable('x-powered-by');
app.use(express.json());

// Simple request log so viewers can see each Bruno call hit the server
app.use((req, res, next) => {
  res.on('finish', () => console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode}`));
  next();
});

app.get('/health', (req, res) => res.json({ status: 'ok', uptime: Math.round(process.uptime()) }));
app.use('/api', restRouter);

// The API contract, for Bruno's API Specs section and the mock server
app.get('/openapi.yaml', (req, res) => res.type('application/yaml').sendFile(path.join(__dirname, 'openapi.yaml')));

app.all('/graphql', graphqlHandler);

app.post('/mcp', handleMcp);
app.get('/mcp', methodNotAllowed);
app.delete('/mcp', methodNotAllowed);

app.use((req, res) => res.status(404).json({ error: `No route for ${req.method} ${req.path}` }));

// Bad JSON bodies -> 400 instead of a crash
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body' });
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = Number(process.env.PORT || 3000);
const GRPC_PORT = Number(process.env.GRPC_PORT || 50051);

const server = http.createServer(app);
attachWebSocket(server);

server.listen(PORT, async () => {
  console.log(`Task API running on http://localhost:${PORT}`);
  console.log(`  REST:      http://localhost:${PORT}/api/tasks`);
  console.log(`  MCP:       http://localhost:${PORT}/mcp`);
  console.log(`  GraphQL:   http://localhost:${PORT}/graphql`);
  console.log(`  WebSocket: ws://localhost:${PORT}/ws`);
  console.log(`  OpenAPI:   http://localhost:${PORT}/openapi.yaml`);
  try {
    const { port } = await startGrpc(GRPC_PORT);
    console.log(`  gRPC:      localhost:${port} (reflection on)`);
  } catch (err) {
    console.log(`  gRPC:      not started (${err.message})`);
  }
});
