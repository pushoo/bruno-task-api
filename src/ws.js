// WebSocket endpoint: ws://localhost:3000/ws
// Pushes a live event whenever a task changes, from REST, GraphQL, gRPC or MCP.
// Send "ping" (or {"type":"ping"}) and the server answers with a pong.

const { WebSocketServer } = require('ws');
const store = require('./store');

function attachWebSocket(httpServer) {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (socket) => {
    console.log(`WS connected (${wss.clients.size} client${wss.clients.size === 1 ? '' : 's'})`);
    socket.send(JSON.stringify({
      type: 'welcome',
      message: 'Connected to the Task API. You will get task.created, task.updated and task.deleted events here.',
      tasks: store.list().length,
    }));

    socket.on('message', (raw) => {
      const text = raw.toString().trim();
      let msg = { type: text };
      try { msg = JSON.parse(text); } catch { /* plain text message */ }
      if (msg.type === 'ping') {
        console.log('WS ping -> pong');
        socket.send(JSON.stringify({ type: 'pong', at: new Date().toISOString() }));
      } else {
        socket.send(JSON.stringify({ type: 'error', message: 'Unknown message. Try "ping".' }));
      }
    });

    socket.on('close', () => console.log('WS disconnected'));
  });

  store.events.on('change', (event) => {
    const payload = JSON.stringify({ ...event, at: new Date().toISOString() });
    let sent = 0;
    for (const client of wss.clients) {
      if (client.readyState === client.OPEN) { client.send(payload); sent++; }
    }
    if (sent) console.log(`WS event ${event.type} -> ${sent} client${sent === 1 ? '' : 's'}`);
  });

  return wss;
}

module.exports = { attachWebSocket };
