import { WebSocketServer, WebSocket } from 'ws';
import { EventEmitter } from 'events';

export interface PipelineEvent {
  type: 'PIPELINE_EVENT' | 'MODEL_DISCOVERY' | 'COST_UPDATE';
  phase: string;
  status: 'started' | 'streaming' | 'complete' | 'error' | 'failed' | 'unauthorized';
  data?: any;
}

const WS_SECRET = process.env.VIBESERVE_WS_SECRET || process.env.VIBESERVE_API_SECRET || '';
const AUTH_ENABLED = WS_SECRET.length > 0;

function verifyToken(token: unknown): boolean {
  if (!AUTH_ENABLED) return true;
  if (typeof token !== 'string') return false;
  return token === WS_SECRET;
}

export class WSServer extends EventEmitter {
  private wss: WebSocketServer;
  private clients: Set<WebSocket> = new Set();

  constructor(port: number) {
    super();
    const host = process.env.WS_HOST || '127.0.0.1';
    this.wss = new WebSocketServer({ port, host });
    console.log(`WebSocket server started on ${host}:${port}${AUTH_ENABLED ? ' (auth enabled)' : ''}`);

    this.wss.on('connection', (ws, req) => {
      const url = new URL(req.url || '/', `http://${req.headers.host}`);
      const token = url.searchParams.get('token') || req.headers['x-api-key'];

      if (!verifyToken(token)) {
        ws.send(JSON.stringify({
          type: 'PIPELINE_EVENT',
          phase: 'connection',
          status: 'unauthorized',
          data: { message: 'Invalid or missing auth token' },
        }));
        ws.close(4001, 'Unauthorized');
        return;
      }

      this.clients.add(ws);
      console.log('Client connected to WebSocket');

      ws.send(JSON.stringify({
        type: 'PIPELINE_EVENT',
        phase: 'connection',
        status: 'complete',
        data: { message: 'Connected to VibeServe Orchestrator' },
      }));

      const interval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.ping();
        }
      }, 30000);

      ws.on('close', () => {
        clearInterval(interval);
        this.clients.delete(ws);
        console.log('Client disconnected');
      });

      ws.on('pong', () => {});

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          this.handleMessage(ws, data);
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      });
    });
  }

  private handleMessage(ws: WebSocket, message: any) {
    if (message.type === 'RUN_PIPELINE') {
      console.log('Starting pipeline run with spec:', message.spec || message.repos);
      this.emit('RUN_PIPELINE', message);
    }
  }

  broadcast(event: PipelineEvent) {
    const payload = JSON.stringify(event);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  }
}
