import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { spawn, type ChildProcess } from 'child_process';
import { execSync } from 'child_process';
import { initializeDatabase, getDb } from './src/auth/db.js';
import { v4 as uuidv4 } from 'uuid';
import { AuthConfigurator } from 'awesome-node-auth';
import { SQLiteUserStore } from './src/auth/ana-user-store.js';
import { fireWebhook } from './src/services/webhooks.js';

interface AuthUser {
  sub: string;
  email: string;
  username?: string;
  role?: string;
}

function getUser(req: express.Request): AuthUser {
  return req.user as unknown as AuthUser;
}

interface PaginatedResult<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

function paginate<T>(items: T[], page: number, limit: number): PaginatedResult<T> {
  const total = items.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const start = (page - 1) * limit;
  const end = start + limit;
  const data = items.slice(start, end);
  return { data, pagination: { total, page, limit, totalPages } };
}

function getPaginationParams(req: express.Request): { page: number; limit: number } {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  return { page, limit };
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPOS_ROOT = process.env.OPENHUB_REPOS_ROOT
  || path.join(os.homedir(), 'Documents', 'openhub', 'repos');

let mcpProcess: ChildProcess | null = null;
let orchestratorWSS: any = null;

function launchMCP() {
  try {
    const pythonPath = process.platform === 'win32' ? 'python' : 'python3';
    console.log(`[Server] Launching MCP server: ${pythonPath} -m vibeserve`);

    mcpProcess = spawn(pythonPath, ['-m', 'vibeserve'], {
      stdio: ['pipe', 'pipe', 'inherit'],
      env: { ...process.env, PYTHONPATH: path.join(__dirname, 'vibeserve') },
    });

    mcpProcess.on('exit', (code) => {
      console.log(`[Server] MCP server exited with code ${code}`);
      mcpProcess = null;
    });

    mcpProcess.on('error', (err) => {
      console.error('[Server] Failed to start MCP server:', err.message);
      mcpProcess = null;
    });
  } catch (err: any) {
    console.warn('[Server] MCP server not available (Python not found?):', err.message);
  }
}

async function launchOrchestrator() {
  try {
    const { WSServer } = await import('./orchestrator/ws-server.js');
    const wsPort = parseInt(process.env.WS_PORT || '3001', 10);
    orchestratorWSS = new WSServer(wsPort);
    console.log(`[Server] Orchestrator WebSocket started on port ${wsPort}`);
  } catch (err: any) {
    console.warn('[Server] Orchestrator not available:', err.message);
  }
}

async function startServer() {
  initializeDatabase();

  const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'openhub-dev-access-token-secret-min-32-chars';
  const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'openhub-dev-refresh-token-secret-min-32-chars';

  const userStore = new SQLiteUserStore();
  const auth = new AuthConfigurator({
    accessTokenSecret: ACCESS_TOKEN_SECRET,
    refreshTokenSecret: REFRESH_TOKEN_SECRET,
    accessTokenExpiresIn: '15m',
    refreshTokenExpiresIn: '7d',
    cookieOptions: {
      sameSite: 'lax',
    },
    csrf: { enabled: true },
    emailVerificationMode: 'none',
    buildTokenPayload: (user) => {
      return {
        username: user.firstName || user.email?.split('@')[0] || 'user',
        avatarUrl: null,
      };
    },
  }, userStore);

  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "ws://localhost:3001"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));

  app.use(express.json({ limit: '50mb' }));

  // CORS for local development
  app.use((_req, res, next) => {
    res.header('Access-Control-Allow-Origin', _req.headers.origin || 'http://localhost:3000');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    if (_req.method === 'OPTIONS') return res.sendStatus(200);
    next();
  });

  // ===================== AUTH ROUTES =====================

  app.use('/api/auth', auth.router({
    onRegister: async (data) => {
      const hashedPassword = await auth.passwordService.hash(data.password);
      return userStore.create({
        email: data.email,
        password: hashedPassword,
        username: data.username,
        firstName: data.firstName,
        lastName: data.lastName,
      });
    },
  }));

  // /api/auth/me is handled by auth.router()

  // Legacy logout - use auth's /auth/logout instead

  // ===================== SSH KEYS =====================

  app.get('/api/settings/ssh-keys', auth.middleware(), (req, res) => {
    const db = getDb();
    const keys = db.prepare(
      'SELECT id, title, public_key, fingerprint, created_at FROM ssh_keys WHERE user_id = ? ORDER BY created_at DESC'
    ).all(getUser(req).sub);
    res.json(keys);
  });

  app.post('/api/settings/ssh-keys', auth.middleware(), (req, res) => {
    const db = getDb();

    const { title, key } = req.body;
    if (!title || !key) return res.status(400).json({ error: 'Title and key required' });

    const id = uuidv4();
    const newKey = { id, user_id: getUser(req).sub, title, public_key: key, fingerprint: null, created_at: new Date().toISOString() };

    db.prepare(
      'INSERT INTO ssh_keys (id, user_id, title, public_key, created_at) VALUES (?, ?, ?, ?, ?)'
    ).run(id, getUser(req).sub, title, key, newKey.created_at);

    res.json(newKey);
  });

  app.delete('/api/settings/ssh-keys/:id', auth.middleware(), (req, res) => {
    const db = getDb();
    db.prepare('DELETE FROM ssh_keys WHERE id = ? AND user_id = ?').run(req.params.id, getUser(req).sub);
    res.json({ success: true });
  });

  // ===================== REPOSITORIES =====================

  app.get('/api/repos', auth.middleware(), (req, res) => {
    const db = getDb();
    const { page, limit } = getPaginationParams(req);
    const repos = db.prepare(`
      SELECT r.*, u.username as owner_name
      FROM repositories r
      JOIN users u ON r.owner_id = u.id
      WHERE r.owner_id = ?
      ORDER BY r.updated_at DESC
    `).all(getUser(req).sub);
    res.json(paginate(repos, page, limit));
  });

  app.post('/api/repos', auth.middleware(), (req, res) => {
    const db = getDb();

    const { name, description, isPrivate } = req.body;
    if (!name) return res.status(400).json({ error: 'Repository name required' });

    const id = uuidv4();
    const user = req.user as unknown as AuthUser;
    const ownerDir = path.join(REPOS_ROOT, user.username);
    const fullPath = path.join(ownerDir, name);

    if (fs.existsSync(fullPath)) {
      return res.status(409).json({ error: 'Repository already exists' });
    }

    fs.mkdirSync(fullPath, { recursive: true });

    try {
      execSync('git init', { cwd: fullPath, stdio: 'ignore' });
    } catch {
      console.warn(`[Repo] git init failed for ${fullPath} — git may not be installed`);
    }

    db.prepare(`
      INSERT INTO repositories (id, owner_id, name, description, full_path, is_private)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, getUser(req).sub, name, description || '', fullPath, isPrivate ? 1 : 0);

    const repo = {
      id,
      owner_id: getUser(req).sub,
      owner_name: getUser(req).username,
      name,
      description: description || '',
      full_path: fullPath,
      is_private: isPrivate ? 1 : 0,
      default_branch: 'main',
      language: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    fireWebhook(getUser(req).sub, 'repo.created', { repo: { id, name, description, isPrivate } }).catch(() => {});

    res.json(repo);
  });

  app.get('/api/repos/:owner/:repoName/contents', (req, res) => {
    const { owner, repoName } = req.params;
    const repoPath = path.join(REPOS_ROOT, owner, repoName);

    if (!fs.existsSync(repoPath)) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    const subPath = req.query.path as string || '';
    const fullPath = path.join(repoPath, subPath);

    if (!fullPath.startsWith(repoPath)) {
      return res.status(403).json({ error: 'Path traversal denied' });
    }

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'Path not found' });
    }

    const stat = fs.statSync(fullPath);
    if (stat.isFile()) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const ext = path.extname(fullPath).slice(1) || 'text';
      return res.json({ type: 'file', name: path.basename(fullPath), path: subPath, content, size: stat.size, language: ext });
    }

    const entries = fs.readdirSync(fullPath, { withFileTypes: true });
    const items = entries.map((entry) => ({
      name: entry.name,
      type: entry.isDirectory() ? 'dir' : 'file',
      path: subPath ? `${subPath}/${entry.name}` : entry.name,
      size: entry.isFile() ? fs.statSync(path.join(fullPath, entry.name)).size : 0,
    }));
    res.json({ type: 'dir', path: subPath, entries: items });
  });

  app.put('/api/repos/:owner/:repoName/contents', auth.middleware(), (req, res) => {
    const { owner, repoName } = req.params;
    const { path: filePath, content, message } = req.body;
    const repoPath = path.join(REPOS_ROOT, owner, repoName);
    const fullPath = path.join(repoPath, filePath);

    if (!fullPath.startsWith(repoPath)) {
      return res.status(403).json({ error: 'Path traversal denied' });
    }

    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, 'utf-8');
    res.json({ success: true, path: filePath });
  });

  // ===================== FILE WATCH / SCAN =====================

  app.post('/api/scan', auth.middleware(), (req, res) => {
    const { content, fileName } = req.body;
    const patterns = [
      { name: 'AWS Key', regex: /AKIA[0-9A-Z]{16}/g },
      { name: 'Generic Token', regex: /token:[a-zA-Z0-9-._~+/]{20,}/g },
      { name: 'Private Key', regex: /-----BEGIN RSA PRIVATE KEY-----/g },
      { name: 'Firebase Config', regex: /apiKey:\s*"[a-zA-Z0-9-_]{39}"/g },
      { name: 'GitHub Token', regex: /ghp_[a-zA-Z0-9]{36}/g },
    ];

    const findings: any[] = [];
    const lines = (content || '').split('\n');

    patterns.forEach((p) => {
      let match;
      while ((match = p.regex.exec(content)) !== null) {
        const lineNum = lines.findIndex((l) => l.includes(match![0])) + 1;
        findings.push({
          id: Math.random().toString(36).substring(2, 11),
          type: 'Secret',
          severity: 'CRITICAL',
          title: `Detected ${p.name}`,
          file: fileName,
          line: lineNum || 0,
          description: `A potential ${p.name} was found in source code.`,
          status: 'open',
        });
      }
    });

    res.json({ findings });
  });

  // ===================== PIPELINE / ACTIONS =====================

  let pipelineRuns: Record<string, any> = {};

  const FAST_PIPELINE = process.env.E2E_FAST_PIPELINE === '1';
  const STAGE_DELAYS = FAST_PIPELINE ? [0.5, 1.0, 1.5, 2.0] : [8, 20, 30, 35];

  app.post('/api/pipeline/run', auth.middleware(), async (req, res) => {
    const { repoId, commitMessage, workflow } = req.body;
    const runId = `run-${Math.random().toString(36).substring(2, 11)}`;

    pipelineRuns[runId] = {
      id: runId,
      repoId,
      workflowName: workflow?.name || 'Dynamic CI Pipeline',
      status: 'running',
      startTime: Date.now(),
      commitMessage: commitMessage || 'Local push',
      author: req.user as unknown as AuthUser,
      createdAt: new Date().toISOString(),
      stages: [
        { id: 's1', name: 'Checkout', status: 'success', duration: '0.5s' },
        { id: 's2', name: 'Secret Scan', status: 'success', duration: '1.2s' },
        { id: 's3', name: 'Lint & Typecheck', status: 'running' },
        { id: 's4', name: 'AI Code Review', status: 'pending' },
        { id: 's5', name: 'Build', status: 'pending' },
        { id: 's6', name: 'Artifact Signing', status: 'pending' },
      ],
      gates: [
        { id: 'g1', name: 'Code Coverage', status: 'passed', value: '--', threshold: '> 80%' },
        { id: 'g2', name: 'Critical CVEs', status: 'passed', value: '0', threshold: '0' },
        { id: 'g3', name: 'Bundle Size', status: 'passed', value: '--', threshold: '< 1MB' },
      ],
      findings: [],
    };

    if (orchestratorWSS) {
      orchestratorWSS.broadcast({
        type: 'PIPELINE_EVENT',
        phase: 'init',
        status: 'started',
        data: { runId, repoId, commitMessage },
      });
    }

    const keys = Object.keys(pipelineRuns);
    if (keys.length > 50) {
      const oldest = keys.reduce((a, b) => pipelineRuns[a].startTime < pipelineRuns[b].startTime ? a : b);
      delete pipelineRuns[oldest];
    }

    res.json({ runId });
  });

  app.get('/api/pipeline/status/:runId', auth.middleware(), (req, res) => {
    const run = pipelineRuns[req.params.runId];
    if (!run) return res.status(404).json({ error: 'Pipeline run not found' });

    const elapsed = (Date.now() - run.startTime) / 1000;
    const stages = run.stages;

    if (elapsed > STAGE_DELAYS[0] && stages[2].status === 'running') {
      stages[2].status = 'success';
      stages[2].duration = FAST_PIPELINE ? '0.4s' : '8.2s';
      stages[3].status = 'running';
    }
    if (elapsed > STAGE_DELAYS[1] && stages[3].status === 'running') {
      stages[3].status = 'success';
      stages[3].duration = FAST_PIPELINE ? '0.4s' : '14.1s';
      stages[4].status = 'running';
    }
    if (elapsed > STAGE_DELAYS[2] && stages[4].status === 'running') {
      stages[4].status = 'success';
      stages[4].duration = FAST_PIPELINE ? '0.4s' : '4.5s';
      stages[5].status = 'running';
    }
    if (elapsed > STAGE_DELAYS[3] && stages[5].status === 'running') {
      stages[5].status = 'success';
      stages[5].duration = FAST_PIPELINE ? '0.3s' : '1.1s';
      run.status = 'success';

      if (run.author?.sub) {
        fireWebhook(run.author.sub, 'pipeline.completed', {
          runId: run.id,
          repoId: run.repoId,
          status: 'success',
          duration: elapsed + 's',
        }).catch(() => {});
      }
    }

    res.json(run);
  });

  // ===================== AUDIT LOGS =====================

  app.get('/api/audit-logs', auth.middleware(), (req, res) => {
    const db = getDb();
    const { page, limit } = getPaginationParams(req);
    const logs = db.prepare(`
      SELECT al.*, u.username as user_name
      FROM audit_logs al
      JOIN users u ON al.user_id = u.id
      WHERE al.user_id = ?
      ORDER BY al.created_at DESC
    `).all(getUser(req).sub);
    res.json(paginate(logs, page, limit));
  });

  app.post('/api/audit-logs', auth.middleware(), (req, res) => {
    const db = getDb();

    const { action, details, repoId } = req.body;

    const id = uuidv4();
    db.prepare(
      'INSERT INTO audit_logs (id, user_id, repo_id, action, details, ip) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, getUser(req).sub, repoId || null, action, details || '', req.ip);

    res.json({ id, user_id: getUser(req).sub, action, details, created_at: new Date().toISOString() });
  });

  // ===================== REGISTRY =====================

  app.get('/api/registry', auth.middleware(), (req, res) => {
    const db = getDb();
    const { page, limit } = getPaginationParams(req);
    const items = db.prepare('SELECT * FROM registry_items ORDER BY created_at DESC').all();
    res.json(paginate(items, page, limit));
  });

  app.post('/api/registry', auth.middleware(), (req, res) => {
    const db = getDb();

    const { name, type, description, author, version, config } = req.body;

    const id = uuidv4();
    db.prepare(`
      INSERT INTO registry_items (id, name, type, description, status, author, version, config)
      VALUES (?, ?, ?, ?, 'active', ?, ?, ?)
    `).run(id, name, type || 'cli', description || '', author || getUser(req).username, version || '0.1.0', JSON.stringify(config || {}));

    const item = db.prepare('SELECT * FROM registry_items WHERE id = ?').get(id);
    res.json(item);
  });

  app.patch('/api/registry/:id', auth.middleware(), (req, res) => {
    const db = getDb();
    const { status, config } = req.body;

    if (status) db.prepare('UPDATE registry_items SET status = ? WHERE id = ?').run(status, req.params.id);
    if (config) db.prepare('UPDATE registry_items SET config = ? WHERE id = ?').run(JSON.stringify(config), req.params.id);

    const item = db.prepare('SELECT * FROM registry_items WHERE id = ?').get(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  });

  // ===================== WEBHOOKS =====================

  app.get('/api/webhooks', auth.middleware(), (req, res) => {
    const db = getDb();
    const hooks = db.prepare('SELECT * FROM webhooks WHERE user_id = ? ORDER BY created_at DESC').all(getUser(req).sub);
    res.json(hooks);
  });

  app.post('/api/webhooks', auth.middleware(), (req, res) => {
    const db = getDb();
    const { url, secret, events } = req.body;
    if (!url) return res.status(400).json({ error: 'URL required' });

    const id = uuidv4();
    db.prepare(`
      INSERT INTO webhooks (id, user_id, url, secret, events, active)
      VALUES (?, ?, ?, ?, ?, 1)
    `).run(id, getUser(req).sub, url, secret || null, JSON.stringify(events || ['*']));

    const hook = db.prepare('SELECT * FROM webhooks WHERE id = ?').get(id);
    res.json(hook);
  });

  app.delete('/api/webhooks/:id', auth.middleware(), (req, res) => {
    const db = getDb();
    db.prepare('DELETE FROM webhooks WHERE id = ? AND user_id = ?').run(req.params.id, getUser(req).sub);
    res.json({ success: true });
  });

  app.post('/api/webhooks/:id/test', auth.middleware(), async (req, res) => {
    const db = getDb();
    const hook = db.prepare('SELECT * FROM webhooks WHERE id = ? AND user_id = ?').get(req.params.id, getUser(req).sub) as any;
    if (!hook) return res.status(404).json({ error: 'Webhook not found' });

    try {
      await fireWebhook(getUser(req).sub, 'webhook.test', { message: 'Test webhook from OpenHub' });
      res.json({ success: true, message: 'Test webhook fired' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ===================== MCP PROXY =====================

  const mcpPending = new Map<string, (data: any) => void>();

  if (mcpProcess?.stdout) {
    const rl = (await import('readline')).createInterface({ input: mcpProcess.stdout! });
    rl.on('line', (line: string) => {
      try {
        const response = JSON.parse(line);
        if (response.id !== undefined) {
          const resolve = mcpPending.get(String(response.id));
          if (resolve) {
            mcpPending.delete(String(response.id));
            resolve(response.result || response.error || response);
          }
        }
      } catch { /* partial line */ }
    });
  }

  app.post('/api/mcp/:tool', auth.middleware(), async (req, res) => {
    if (!mcpProcess || !mcpProcess.stdin) {
      return res.status(503).json({ error: 'MCP server not running' });
    }

    try {
      const requestId = String(Date.now()) + Math.random().toString(36).substring(2, 7);
      const request = {
        jsonrpc: '2.0',
        method: 'call_tool',
        params: { name: req.params.tool, arguments: req.body },
        id: requestId,
      };

      const result = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          mcpPending.delete(requestId);
          reject(new Error('MCP call timed out'));
        }, 120000);

        mcpPending.set(requestId, (data: any) => {
          clearTimeout(timer);
          resolve(data);
        });

        try {
          mcpProcess!.stdin!.write(JSON.stringify(request) + '\n');
        } catch (e) {
          clearTimeout(timer);
          mcpPending.delete(requestId);
          reject(e);
        }
      });

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'MCP call failed' });
    }
  });

  // ===================== HEALTH =====================

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      mcp: mcpProcess?.pid ? 'running' : 'stopped',
      orchestrator: orchestratorWSS ? 'running' : 'stopped',
      timestamp: new Date().toISOString(),
    });
  });

  // ===================== VITE / STATIC =====================

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] OpenHub running on http://localhost:${PORT}`);
    console.log(`[Server] Repos root: ${REPOS_ROOT}`);
  });
}

startServer().then(() => {
  launchMCP();
  launchOrchestrator();
});
