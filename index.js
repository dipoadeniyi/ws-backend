const WebSocket = require('ws');

const PORT = process.env.PORT || 8080;
const BUS_SECRET = process.env.BUS_SECRET;

if (!BUS_SECRET) {
  console.error('❌ BUS_SECRET is not set');
}

const wss = new WebSocket.Server({ port: PORT });

console.log(`WebSocket server running on port ${PORT}`);

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', (rawMessage) => {
    let data;

    try {
      data = JSON.parse(rawMessage.toString());
    } catch (err) {
      // Ignore non-JSON messages
      return;
    }

    // 🔐 HARDENING CHECK (Layer 1)
    if (data.token !== BUS_SECRET) {
      console.warn('❌ Rejected message with invalid token');
      return;
    }

    // Strip token before broadcasting
    const { token, ...safePayload } = data;

    const outgoing = JSON.stringify(safePayload);

    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(outgoing);
      }
    });
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});
