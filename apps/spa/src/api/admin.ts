import {
  AdminUserDetailResponseSchema,
  ListAdminAssetsResponseSchema,
  ListAdminCustomIconsResponseSchema,
  ListAdminSavesResponseSchema,
  ListAdminUsersResponseSchema,
  type AdminUserDetailResponse,
  type ListAdminAssetsResponse,
  type ListAdminCustomIconsResponse,
  type ListAdminSavesResponse,
  type ListAdminUsersResponse,
} from '@disccotools/shared';
import { apiFetch } from './client.js';

export async function listAdminUsers(
  search?: string,
): Promise<ListAdminUsersResponse> {
  const q = search ? `?search=${encodeURIComponent(search)}` : '';
  const res = await apiFetch(`/api/admin/users${q}`);
  return ListAdminUsersResponseSchema.parse(await res.json());
}

export async function getAdminUser(id: string): Promise<AdminUserDetailResponse> {
  const res = await apiFetch(`/api/admin/users/${encodeURIComponent(id)}`);
  return AdminUserDetailResponseSchema.parse(await res.json());
}

export async function setAdminUserPerm(
  id: string,
  level: number,
  reason?: string,
): Promise<void> {
  const body: { level: number; reason?: string } = { level };
  if (reason) body.reason = reason;
  await apiFetch(`/api/admin/users/${encodeURIComponent(id)}/perm`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function deleteAdminUser(id: string, reason: string): Promise<void> {
  await apiFetch(`/api/admin/users/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
}

export async function listAdminAssets(
  userId?: string,
): Promise<ListAdminAssetsResponse> {
  const q = userId ? `?userId=${encodeURIComponent(userId)}` : '';
  const res = await apiFetch(`/api/admin/assets${q}`);
  return ListAdminAssetsResponseSchema.parse(await res.json());
}

export async function deleteAdminAsset(id: string, reason: string): Promise<void> {
  await apiFetch(`/api/admin/assets/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
}

export async function listAdminSaves(
  userId?: string,
): Promise<ListAdminSavesResponse> {
  const q = userId ? `?userId=${encodeURIComponent(userId)}` : '';
  const res = await apiFetch(`/api/admin/saves${q}`);
  return ListAdminSavesResponseSchema.parse(await res.json());
}

export async function deleteAdminSave(id: string, reason: string): Promise<void> {
  await apiFetch(`/api/admin/saves/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
}

export async function listAdminCustomIcons(): Promise<ListAdminCustomIconsResponse> {
  const res = await apiFetch('/api/admin/icon-pack/custom');
  return ListAdminCustomIconsResponseSchema.parse(await res.json());
}

export async function deleteAdminCustomIcon(key: string): Promise<void> {
  await apiFetch(
    `/api/admin/icon-pack/custom?key=${encodeURIComponent(key)}`,
    { method: 'DELETE' },
  );
}
