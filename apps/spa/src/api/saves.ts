import type {
  CloneSaveBody,
  CreateSaveBody,
  ListSavesResponse,
  SaveDetail,
  SaveFilter,
  SaveResponse,
  SaveSummary,
  UpdateSaveBody,
} from '@disccotools/shared';
import { apiFetch } from './client.js';

export async function listSaves(filter?: SaveFilter): Promise<SaveSummary[]> {
  const url = filter && filter !== 'all' ? `/api/saves?filter=${filter}` : '/api/saves';
  const res = await apiFetch(url);
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
