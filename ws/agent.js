import { WebSocketServer } from 'ws';

export function setupAgentWS(server, clients, pendingJobs) {
  const wss = new WebSocketServer({ server, path: '/agent' });

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const clientId = url.searchParams.get('clientId');
    const token = url.searchParams.get('token');

     const expectedToken = process.env[`AGENT_TOKEN_${clientId.toUpperCase().replace(/-/g, '_')}`];

    if (!clientId || !token || token !== expectedToken) {
      ws.close(4003, 'Unauthorized');
      console.warn(`[WS] unauthorized connection for ${clientId}`);
      return;
    }

    clients.set(clientId, ws);
    console.log(`[WS] connected: ${clientId}`);

    // Entregar trabajos pendientes
    const pending = pendingJobs.get(clientId) || [];
    while (pending.length) {
      const job = pending.shift();
      try { ws.send(JSON.stringify(job)); } catch {}
    }
    pendingJobs.delete(clientId);

    ws.on('message', (msg) => {
      try {
        const evt = JSON.parse(msg.toString());
        if (evt.type === 'ack') {
          console.log(`[ACK] ${clientId} job=${evt.jobId} ok=${evt.ok}`);
        } else if (evt.type === 'error') {
          console.error(`[AGENT_ERR] ${clientId} job=${evt.jobId} err=${evt.error}`);
        }
      } catch {}
    });

    ws.on('close', () => {
      console.log(`[WS] disconnected: ${clientId}`);
      if (clients.get(clientId) === ws) {
        clients.delete(clientId);
      }
    });
  });
}