const WebSocket = require('ws');

const PORT = process.env.PORT || 8080;
const BUS_SECRET = process.env.BUS_SECRET;

if (!BUS_SECRET) {
  console.error('❌ BUS_SECRET is not set');
}

const wss = new WebSocket.Server({ port: PORT });

console.log(`✅ WebSocket server running on port ${PORT}`);

wss.on('connection', (ws) => {
  console.log('🔗 Client connected');

  ws.on('message', (rawMessage) => {
    let message;

    try {
      message = JSON.parse(rawMessage.toString());
    } catch (err) {
      // Ignore invalid JSON
      return;
    }

    // --------------------------------------------------
    // 🔐 Token validation ONLY for driver messages
    // --------------------------------------------------
    if (message.type === 'bus_location') {
      if (message.token !== BUS_SECRET) {
        console.warn('❌ Rejected bus message with invalid token');
        return;
      }
    }

    // Expecting driver payload: { token, type, data }
    const payload = message.data;

    if (
      !payload ||
      typeof payload.latitude !== 'number' ||
      typeof payload.longitude !== 'number'
    ) {
      // Ignore malformed payloads
      return;
    }

    // --------------------------------------------------
    // ✅ FLATTEN PAYLOAD FOR PASSENGER APP
    // --------------------------------------------------
    const outgoing = JSON.stringify({
      busId: payload.busId,
      latitude: payload.latitude,
      longitude: payload.longitude,
      timestamp: payload.timestamp,

      // 👇 NEW (SAFE, OPTIONAL FIELD)
  direction: message.direction || null,
    });

    // --------------------------------------------------
    // 📡 Broadcast to all connected clients
    // --------------------------------------------------
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(outgoing);
      }
    });
  });

  ws.on('close', () => {
    console.log('❌ Client disconnected');
  });
});
