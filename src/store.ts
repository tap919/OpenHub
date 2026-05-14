import { create } from 'zustand';

export type User = {
  id: string;
  username: string;
  avatarUrl: string;
};

export type FileNode = {
  name: string;
  type: 'file' | 'dir';
  content?: string;
  size?: number;
  lastCommitMessage?: string;
  lastCommitDate?: string;
  children?: FileNode[];
};

export type Repository = {
  id: string;
  owner: string;
  name: string;
  description: string;
  isPrivate: boolean;
  stars: number;
  forks: number;
  language: string;
  updatedAt: string;
  defaultBranch: string;
  branches: string[];
  files: FileNode[];
};

export type Issue = {
  id: string;
  repoId: string;
  number: number;
  title: string;
  state: 'open' | 'closed';
  author: User;
  createdAt: string;
  comments: number;
  labels: { name: string; color: string }[];
};

export type PullRequest = {
  id: string;
  repoId: string;
  number: number;
  title: string;
  state: 'open' | 'closed' | 'merged';
  author: User;
  createdAt: string;
  sourceBranch: string;
  targetBranch: string;
  comments: number;
};

export type SecurityFinding = {
  id: string;
  type: 'SAST' | 'SCA' | 'Secret' | 'DAST' | 'IaC';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  file?: string;
  line?: number;
  description: string;
  status: 'open' | 'resolved' | 'ignored';
};

export type QualityGate = {
  id: string;
  name: string;
  status: 'passed' | 'failed' | 'warning';
  value: string;
  threshold: string;
};

export type PipelineStage = {
  id: string;
  name: string;
  status: 'success' | 'failure' | 'running' | 'pending' | 'skipped';
  duration?: string;
  logs?: string[];
};

export type ActionRun = {
  id: string;
  repoId: string;
  workflowName: string;
  status: 'success' | 'failure' | 'running' | 'queued';
  commitMessage: string;
  author: User;
  createdAt: string;
  duration: string;
  stages: PipelineStage[];
  findings: SecurityFinding[];
  gates: QualityGate[];
  sbomUrl?: string;
  signatureVerified?: boolean;
};

export type AuditLogEntry = {
  id: string;
  repoId: string;
  action: string;
  user: User;
  timestamp: string;
  ip: string;
  details: string;
};

export type BranchProtectionRule = {
  id: string;
  repoId: string;
  pattern: string;
  requireReviews: boolean;
  requireCI: boolean;
  enforceAdmins: boolean;
  signedCommits: boolean;
};

export type WikiPage = {
  id: string;
  repoId: string;
  title: string;
  content: string;
  updatedAt: string;
};

export type RegistryItemType = 'cli' | 'mcp' | 'cron' | 'agent';

export type RegistryItem = {
  id: string;
  name: string;
  type: RegistryItemType;
  description: string;
  status: 'active' | 'inactive' | 'error';
  lastRun?: string;
  config?: any;
  author: string;
  version: string;
};

export type SSHKey = {
  id: string;
  title: string;
  key: string;
  createdAt: string;
};

interface OpenHubStore {
  currentUser: User;
  sshKeys: SSHKey[];
  repositories: Repository[];
  issues: Issue[];
  pullRequests: PullRequest[];
  actionRuns: ActionRun[];
  wikiPages: WikiPage[];
  auditLogs: AuditLogEntry[];
  branchProtection: BranchProtectionRule[];
  registryItems: RegistryItem[];
  beginnerMode: boolean;
  toggleBeginnerMode: () => void;
  setCurrentUser: (user: User) => void;
  scanFile: (content: string, fileName: string) => Promise<SecurityFinding[]>;
  triggerPipeline: (repoId: string, commitMessage: string) => Promise<string>;
  getPipelineStatus: (runId: string) => Promise<any>;
  logAuditAction: (action: string, details: string, repoId: string) => Promise<void>;
  fetchRepositories: () => Promise<void>;
  fetchRegistryItems: () => Promise<void>;
  fetchSSHKeys: () => Promise<void>;
  addSSHKey: (title: string, key: string) => Promise<void>;
  deleteSSHKey: (id: string) => Promise<void>;
  createRepo: (name: string, description: string, isPrivate: boolean) => Promise<Repository | null>;
  addRegistryItem: (item: Omit<RegistryItem, 'id' | 'status'>) => Promise<void>;
  updateRegistryItemStatus: (id: string, status: RegistryItem['status']) => Promise<void>;
}

function getCsrfToken(): string {
  const get = (name: string) =>
    document.cookie
      .split('; ')
      .find((row) => row.startsWith(`${name}=`))
      ?.split('=')[1] ?? '';
  return get('__Host-csrf-token') || get('__Secure-csrf-token') || get('csrf-token');
}

const apiHeaders = (method?: string) => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const csrf = getCsrfToken();
    if (csrf) headers['X-CSRF-Token'] = csrf;
  }
  return headers;
};

export const useStore = create<OpenHubStore>((set, get) => ({
  beginnerMode: false,
  toggleBeginnerMode: () => set((state) => ({ beginnerMode: !state.beginnerMode })),
  currentUser: { id: '', username: '', avatarUrl: '' },
  sshKeys: [],
  repositories: [],
  issues: [],
  pullRequests: [],
  actionRuns: [],
  wikiPages: [],
  auditLogs: [],
  branchProtection: [],
  registryItems: [],

  setCurrentUser: (user) => set({ currentUser: user }),

  scanFile: async (content: string, fileName: string) => {
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        credentials: 'include', headers: apiHeaders('POST'),
        body: JSON.stringify({ content, fileName }),
      });
      const data = await res.json();
      return data.findings;
    } catch {
      return [];
    }
  },

  triggerPipeline: async (repoId: string, commitMessage: string) => {
    try {
      const res = await fetch('/api/pipeline/run', {
        method: 'POST',
        credentials: 'include', headers: apiHeaders('POST'),
        body: JSON.stringify({ repoId, commitMessage }),
      });
      const { runId } = await res.json();
      const newRun: ActionRun = {
        id: runId,
        repoId,
        workflowName: 'OpenHub CI Pipeline',
        status: 'running',
        commitMessage,
        author: get().currentUser,
        createdAt: new Date().toISOString(),
        duration: '0s',
        stages: [
          { id: 's1', name: 'Checkout', status: 'success', duration: '0.5s' },
          { id: 's2', name: 'Secret Scan', status: 'running' },
          { id: 's3', name: 'Lint & Typecheck', status: 'pending' },
          { id: 's4', name: 'AI Code Review', status: 'pending' },
          { id: 's5', name: 'Build', status: 'pending' },
        ],
        findings: [],
        gates: [],
      };
      set((s) => ({ actionRuns: [newRun, ...s.actionRuns] }));
      return runId;
    } catch {
      return '';
    }
  },

  getPipelineStatus: async (runId: string) => {
    try {
      const res = await fetch(`/api/pipeline/status/${runId}`);
      const data = await res.json();
      set((s) => ({
        actionRuns: s.actionRuns.map((r) =>
          r.id === runId ? { ...r, status: data.status, stages: data.stages } : r
        ),
      }));
      return data;
    } catch {
      return null;
    }
  },

  logAuditAction: async (action: string, details: string, repoId: string) => {
    try {
      const res = await fetch('/api/audit-logs', {
        method: 'POST',
        credentials: 'include', headers: apiHeaders('POST'),
        body: JSON.stringify({ action, details, repoId }),
      });
      const log = await res.json();
      set((s) => ({
        auditLogs: [{ ...log, user: get().currentUser, timestamp: log.created_at, ip: '' }, ...s.auditLogs],
      }));
    } catch {
      // silently fail
    }
  },

  fetchRepositories: async () => {
    try {
      const res = await fetch('/api/repos', { headers: apiHeaders() });
      if (!res.ok) return;
      const payload = await res.json();
      const repos = payload.data || payload;
      set({
        repositories: repos.map((r: any) => ({
          id: r.id,
          owner: r.owner_name || 'unknown',
          name: r.name,
          description: r.description || '',
          isPrivate: !!r.is_private,
          stars: 0,
          forks: 0,
          language: r.language || '',
          updatedAt: r.updated_at,
          defaultBranch: r.default_branch || 'main',
          branches: [r.default_branch || 'main'],
          files: [],
        })),
      });
    } catch {
      // offline
    }
  },

  fetchRegistryItems: async () => {
    try {
      const res = await fetch('/api/registry', { headers: apiHeaders() });
      if (!res.ok) return;
      const payload = await res.json();
      const items = payload.data || payload;
      set({ registryItems: items });
    } catch {
      // offline
    }
  },

  fetchSSHKeys: async () => {
    try {
      const res = await fetch('/api/settings/ssh-keys', { headers: apiHeaders() });
      if (!res.ok) return;
      const keys = await res.json();
      set({ sshKeys: keys.map((k: any) => ({ id: k.id, title: k.title, key: k.public_key, createdAt: k.created_at })) });
    } catch {
      // offline
    }
  },

  addSSHKey: async (title, key) => {
    try {
      const res = await fetch('/api/settings/ssh-keys', {
        method: 'POST',
        credentials: 'include', headers: apiHeaders('POST'),
        body: JSON.stringify({ title, key }),
      });
      const newKey = await res.json();
      set((s) => ({ sshKeys: [{ id: newKey.id, title: newKey.title, key: newKey.public_key, createdAt: newKey.created_at }, ...s.sshKeys] }));
    } catch {
      // offline
    }
  },

  deleteSSHKey: async (id) => {
    try {
      await fetch(`/api/settings/ssh-keys/${id}`, { method: 'DELETE', credentials: 'include', headers: apiHeaders('DELETE') });
      set((s) => ({ sshKeys: s.sshKeys.filter((k) => k.id !== id) }));
    } catch {
      // offline
    }
  },

  createRepo: async (name, description, isPrivate) => {
    try {
      const res = await fetch('/api/repos', {
        method: 'POST',
        credentials: 'include', headers: apiHeaders('POST'),
        body: JSON.stringify({ name, description, isPrivate }),
      });
      if (!res.ok) return null;
      const r = await res.json();
      const newRepo: Repository = {
        id: r.id,
        owner: r.owner_name,
        name: r.name,
        description: r.description,
        isPrivate: !!r.is_private,
        stars: 0,
        forks: 0,
        language: '',
        updatedAt: r.created_at,
        defaultBranch: 'main',
        branches: ['main'],
        files: [],
      };
      set((s) => ({ repositories: [newRepo, ...s.repositories] }));
      return newRepo;
    } catch {
      return null;
    }
  },

  addRegistryItem: async (item) => {
    try {
      const res = await fetch('/api/registry', {
        method: 'POST',
        credentials: 'include', headers: apiHeaders('POST'),
        body: JSON.stringify(item),
      });
      const newItem = await res.json();
      set((s) => ({ registryItems: [newItem, ...s.registryItems] }));
    } catch {
      // offline
    }
  },

  updateRegistryItemStatus: async (id, status) => {
    try {
      await fetch(`/api/registry/${id}`, {
        method: 'PATCH',
        credentials: 'include', headers: apiHeaders('PATCH'),
        body: JSON.stringify({ status }),
      });
      set((s) => ({
        registryItems: s.registryItems.map((item) =>
          item.id === id ? { ...item, status } : item
        ),
      }));
    } catch {
      // offline
    }
  },
}));
