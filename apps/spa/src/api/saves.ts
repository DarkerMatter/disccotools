import type {
  CloneSaveBody,
  CreateSaveBody,
  ListSavesResponse,
  SaveDetail,
  SaveFilter,
  SaveResponse,
  SaveSummary,
  SharedTemplate,
  SharedTemplateResponse,
  UpdateSaveBody,
  UseTemplateBody,
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

// "Use" a template the current user owns: makes a child save bound to the template
export async function useTemplate(
  id: string,
  opts: UseTemplateBody = {},
): Promise<SaveDetail> {
  const res = await apiFetch(`/api/saves/${id}/use`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(opts),
  });
  const body = (await res.json()) as SaveResponse;
  return body.save;
}

// Generate (or fetch the existing) share token for a template I own.
export async function shareTemplate(id: string): Promise<SaveDetail> {
  const res = await apiFetch(`/api/saves/${id}/share`, { method: 'POST' });
  const body = (await res.json()) as SaveResponse;
  return body.save;
}

// Stop sharing a template — kills any URL pointing at it.
export async function revokeShare(id: string): Promise<SaveDetail> {
  const res = await apiFetch(`/api/saves/${id}/share`, { method: 'DELETE' });
  const body = (await res.json()) as SaveResponse;
  return body.save;
}

// Public: fetch a shared template by token. No auth required.
export async function getSharedTemplate(token: string): Promise<SharedTemplate> {
  const res = await apiFetch(`/api/templates/share/${token}`);
  const body = (await res.json()) as SharedTemplateResponse;
  return body.template;
}

// Auth: import a shared template into my account.
export async function importSharedTemplate(
  token: string,
  opts: UseTemplateBody = {},
): Promise<SaveDetail> {
  const res = await apiFetch(`/api/templates/share/${token}/import`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(opts),
  });
  const body = (await res.json()) as SaveResponse;
  return body.save;
}
