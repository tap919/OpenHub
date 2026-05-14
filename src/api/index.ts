function getCsrfToken(): string {
  const get = (name: string) =>
    document.cookie
      .split('; ')
      .find((row) => row.startsWith(`${name}=`))
      ?.split('=')[1] ?? '';
  return get('__Host-csrf-token') || get('__Secure-csrf-token') || get('csrf-token');
}

function apiHeaders(method?: string): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const csrf = getCsrfToken();
    if (csrf) headers['X-CSRF-Token'] = csrf;
  }
  return headers;
}

async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: 'include',
    ...options,
    headers: { ...apiHeaders(options?.method), ...options?.headers },
  });
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
  return res.json();
}

// ===================== REPOS =====================

export async function fetchRepos() {
  return fetchApi<any>('/api/repos');
}

export async function createRepo(data: { name: string; description?: string; isPrivate?: boolean }) {
  return fetchApi<any>('/api/repos', { method: 'POST', body: JSON.stringify(data) });
}

export async function fetchRepoContents(owner: string, repo: string, subPath?: string) {
  const path = subPath ? `?path=${encodeURIComponent(subPath)}` : '';
  return fetchApi<any>(`/api/repos/${owner}/${repo}/contents${path}`);
}

export async function updateFile(owner: string, repo: string, data: { path: string; content: string; message?: string }) {
  return fetchApi<any>(`/api/repos/${owner}/${repo}/contents`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// ===================== GIT =====================

export async function fetchCommits(owner: string, repo: string) {
  return fetchApi<any>(`/api/repos/${owner}/${repo}/commits`);
}

export async function fetchBranches(owner: string, repo: string) {
  return fetchApi<any>(`/api/repos/${owner}/${repo}/branches`);
}

export async function fetchCommit(owner: string, repo: string, sha: string) {
  return fetchApi<any>(`/api/repos/${owner}/${repo}/commits/${sha}`);
}

export async function fetchDiff(owner: string, repo: string, sha: string) {
  return fetchApi<any>(`/api/repos/${owner}/${repo}/diff?sha=${sha}`);
}

export async function createCommit(owner: string, repo: string, data: { filePath: string; content: string; message: string }) {
  return fetchApi<any>(`/api/repos/${owner}/${repo}/commits`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ===================== PIPELINE =====================

export async function triggerPipeline(repoId: string, commitMessage: string, mode?: string) {
  return fetchApi<{ runId: string; mode: string }>('/api/pipeline/run', {
    method: 'POST',
    body: JSON.stringify({ repoId, commitMessage, mode }),
  });
}

export async function fetchPipelineStatus(runId: string) {
  return fetchApi<any>(`/api/pipeline/status/${runId}`);
}

// ===================== SSH KEYS =====================

export async function fetchSSHKeys() {
  return fetchApi<any>('/api/settings/ssh-keys');
}

export async function addSSHKey(data: { title: string; key: string }) {
  return fetchApi<any>('/api/settings/ssh-keys', { method: 'POST', body: JSON.stringify(data) });
}

export async function deleteSSHKey(id: string) {
  return fetchApi<any>(`/api/settings/ssh-keys/${id}`, { method: 'DELETE' });
}

// ===================== REGISTRY =====================

export async function fetchRegistryItems() {
  return fetchApi<any>('/api/registry');
}

export async function addRegistryItem(item: any) {
  return fetchApi<any>('/api/registry', { method: 'POST', body: JSON.stringify(item) });
}

export async function updateRegistryItemStatus(id: string, status: string) {
  return fetchApi<any>(`/api/registry/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
}

// ===================== SECURITY SCAN =====================

export async function scanFile(content: string, fileName: string) {
  return fetchApi<any>('/api/scan', {
    method: 'POST',
    body: JSON.stringify({ content, fileName }),
  });
}

// ===================== AUDIT LOGS =====================

export async function logAudit(action: string, details: string, repoId: string) {
  return fetchApi<any>('/api/audit-logs', {
    method: 'POST',
    body: JSON.stringify({ action, details, repoId }),
  });
}
