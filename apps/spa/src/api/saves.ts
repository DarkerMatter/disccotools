import type {
  CloneSaveBody,
  CreateSaveBody,
  ImportSharedSaveBody,
  ListSavesResponse,
  SaveDetail,
  SaveResponse,
  SaveSummary,
  SharedSave,
  SharedSaveResponse,
  UpdateSaveBody,
} from '@disccotools/shared';
import { apiFetch } from './client.js';

export async function listSaves(): Promise<SaveSummary[]> {
  const res = await apiFetch('/api/saves');
  const body = (await res.json()) as ListSavesResponse;
  return body.saves;
}

export async function createSave(input: CreateSaveBody): Promise<SaveDetail> {
  const res = await apiFetch('/api/saves', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  const body = (await res.json()) as SaveResponse;
  return body.save;
}

export async function getSave(id: string): Promise<SaveDetail> {
  const res = await apiFetch(`/api/saves/${id}`);
  const body = (await res.json()) as SaveResponse;
  return body.save;
}

export async function updateSave(id: string, patch: UpdateSaveBody): Promise<SaveDetail> {
  const res = await apiFetch(`/api/saves/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(patch),
  });
  const body = (await res.json()) as SaveResponse;
  return body.save;
}

export async function deleteSave(id: string): Promise<void> {
  await apiFetch(`/api/saves/${id}`, { method: 'DELETE' });
}

export async function cloneSave(id: string, opts: CloneSaveBody = {}): Promise<SaveDetail> {
  const res = await apiFetch(`/api/saves/${id}/clone`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(opts),
  });
  const body = (await res.json()) as SaveResponse;
  return body.save;
}

// Generate (or fetch the existing) share token for a save I own.
export async function shareSave(id: string): Promise<SaveDetail> {
  const res = await apiFetch(`/api/saves/${id}/share`, { method: 'POST' });
  const body = (await res.json()) as SaveResponse;
  return body.save;
}

// Stop sharing a save — kills any URL pointing at it.
export async function revokeShare(id: string): Promise<SaveDetail> {
  const res = await apiFetch(`/api/saves/${id}/share`, { method: 'DELETE' });
  const body = (await res.json()) as SaveResponse;
  return body.save;
}

// Public: fetch a shared save by token. No auth required.
export async function getSharedSave(token: string): Promise<SharedSave> {
  const res = await apiFetch(`/api/share/${token}`);
  const body = (await res.json()) as SharedSaveResponse;
  return body.save;
}

// Auth: import a shared save into my account.
export async function importSharedSave(
  token: string,
  opts: ImportSharedSaveBody = {},
): Promise<SaveDetail> {
  const res = await apiFetch(`/api/share/${token}/import`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(opts),
  });
  const body = (await res.json()) as SaveResponse;
  return body.save;
}
