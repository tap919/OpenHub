import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from './index';

// ===================== REPOS =====================

export function useRepos() {
  return useQuery({
    queryKey: ['repos'],
    queryFn: api.fetchRepos,
    staleTime: 30_000,
  });
}

export function useCreateRepo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createRepo,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['repos'] }),
  });
}

export function useRepoContents(owner: string, repo: string, subPath?: string) {
  return useQuery({
    queryKey: ['repo-contents', owner, repo, subPath],
    queryFn: () => api.fetchRepoContents(owner, repo, subPath),
    enabled: !!owner && !!repo,
  });
}

// ===================== GIT =====================

export function useCommits(owner: string, repo: string) {
  return useQuery({
    queryKey: ['commits', owner, repo],
    queryFn: () => api.fetchCommits(owner, repo),
    enabled: !!owner && !!repo,
    staleTime: 10_000,
  });
}

export function useBranches(owner: string, repo: string) {
  return useQuery({
    queryKey: ['branches', owner, repo],
    queryFn: () => api.fetchBranches(owner, repo),
    enabled: !!owner && !!repo,
    staleTime: 60_000,
  });
}

export function useCommit(owner: string, repo: string, sha: string) {
  return useQuery({
    queryKey: ['commit', owner, repo, sha],
    queryFn: () => api.fetchCommit(owner, repo, sha),
    enabled: !!owner && !!repo && !!sha,
  });
}

export function useDiff(owner: string, repo: string, sha: string) {
  return useQuery({
    queryKey: ['diff', owner, repo, sha],
    queryFn: () => api.fetchDiff(owner, repo, sha),
    enabled: !!owner && !!repo && !!sha,
  });
}

export function useCreateCommit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ owner, repo, data }: { owner: string; repo: string; data: { filePath: string; content: string; message: string } }) =>
      api.createCommit(owner, repo, data),
    onSuccess: (_, { owner, repo }) => {
      qc.invalidateQueries({ queryKey: ['commits', owner, repo] });
      qc.invalidateQueries({ queryKey: ['repo-contents', owner, repo] });
    },
  });
}

// ===================== PIPELINE =====================

export function useTriggerPipeline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ repoId, commitMessage, mode }: { repoId: string; commitMessage: string; mode?: string }) =>
      api.triggerPipeline(repoId, commitMessage, mode),
    onSuccess: (_, { repoId }) => {
      qc.invalidateQueries({ queryKey: ['pipeline-runs', repoId] });
    },
  });
}

export function usePipelineStatus(runId: string | null, enabled = true) {
  return useQuery({
    queryKey: ['pipeline-status', runId],
    queryFn: () => api.fetchPipelineStatus(runId!),
    enabled: enabled && !!runId,
    refetchInterval: (query) => {
      const data = query.state.data;
      return data?.status === 'running' ? 3000 : false;
    },
  });
}

// ===================== SSH KEYS =====================

export function useSSHKeys() {
  return useQuery({
    queryKey: ['ssh-keys'],
    queryFn: api.fetchSSHKeys,
    staleTime: 60_000,
  });
}

export function useAddSSHKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.addSSHKey,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ssh-keys'] }),
  });
}

export function useDeleteSSHKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deleteSSHKey,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ssh-keys'] }),
  });
}

// ===================== REGISTRY =====================

export function useRegistryItems() {
  return useQuery({
    queryKey: ['registry-items'],
    queryFn: api.fetchRegistryItems,
    staleTime: 60_000,
  });
}

export function useAddRegistryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.addRegistryItem,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['registry-items'] }),
  });
}

export function useUpdateRegistryItemStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.updateRegistryItemStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['registry-items'] }),
  });
}

// ===================== SECURITY SCAN =====================

export function useScanFile() {
  return useMutation({
    mutationFn: ({ content, fileName }: { content: string; fileName: string }) =>
      api.scanFile(content, fileName),
  });
}
