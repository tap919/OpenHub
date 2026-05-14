import { spawn, ChildProcess } from 'child_process';
import * as readline from 'readline';
import path from 'path';

export class MCPClient {
  private process: ChildProcess | null = null;
  private rl: readline.Interface | null = null;
  private pendingRequests: Map<string, (result: any) => void> = new Map();
  private requestId = 0;

  constructor(private pythonPath: string, private projectRoot: string) {}

  async start() {
    console.log(`Starting MCP Server: ${this.pythonPath} -m vibeserve (root: ${this.projectRoot})`);
    const vibeserveDir = path.join(this.projectRoot, 'vibeserve');
    const env = { ...process.env, PYTHONPATH: vibeserveDir };
    this.process = spawn(this.pythonPath, ['-m', 'vibeserve'], {
      stdio: ['pipe', 'pipe', 'inherit'],
      env
    });

    this.rl = readline.createInterface({
      input: this.process.stdout!,
    });

    this.rl.on('line', (line) => {
      try {
        const response = JSON.parse(line);
        if (response.id !== undefined && this.pendingRequests.has(response.id.toString())) {
          const resolve = this.pendingRequests.get(response.id.toString())!;
          this.pendingRequests.delete(response.id.toString());
          resolve(response.result || response.error);
        }
      } catch (e) {
        console.error('Failed to parse MCP response:', line);
      }
    });

    // Wait for server to be ready (could implement a proper handshake)
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  async callTool(name: string, args: object): Promise<any> {
    const id = (++this.requestId).toString();
    const request = {
      jsonrpc: '2.0',
      method: 'call_tool',
      params: {
        name,
        arguments: args,
      },
      id,
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, resolve);
      this.process?.stdin?.write(JSON.stringify(request) + '\n');
      
      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`MCP call_tool timed out: ${name}`));
        }
      }, 30000);
    });
  }

  stop() {
    this.process?.kill();
  }
}
