import type { BoxEventOut, BoxEventType, BoxOut, BoxScanOut, ImportBatchOut, ImportConfirmOut, InventorySessionOut, InventorySummaryOut, ProjectDetailOut, ProjectOut, UserOut, UserRole, WarehouseCode } from '@/types';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const TOKEN_KEY = 'stem_wms_token';

export function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string) { localStorage.setItem(TOKEN_KEY, token); }
export function clearToken() { localStorage.removeItem(TOKEN_KEY); }

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : await res.text();
  if (!res.ok) {
    const detail = typeof data === 'object' && data !== null ? (data.detail ?? JSON.stringify(data)) : data;
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
  }
  return data as T;
}

export async function login(identifier: string, password: string) {
  const form = new URLSearchParams();
  form.append('username', identifier);
  form.append('password', password);
  const res = await fetch(`${API_URL}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form });
  if (!res.ok) throw new Error('Неверный логин или пароль');
  return res.json() as Promise<{ access_token: string; token_type: string }>;
}

export const api = {
  deleteBox: (code: string) => apiFetch('/boxes/' + encodeURIComponent(code), { method: 'DELETE' }),
  me: () => apiFetch<UserOut>('/auth/me'),
  users: () => apiFetch<UserOut[]>('/users'),
  createUser: (payload: { name: string; email?: string; phone?: string; password: string; role: UserRole; warehouse?: string | null }) => apiFetch<UserOut>('/users', { method: 'POST', body: JSON.stringify(payload) }),
  projects: () => apiFetch<ProjectOut[]>('/projects'),
  project: (id: string) => apiFetch<ProjectDetailOut>(`/projects/${id}`),
  createProject: (payload: unknown) => apiFetch<ProjectOut>('/projects', { method: 'POST', body: JSON.stringify(payload) }),
  createBox: (payload: unknown) => apiFetch<BoxOut>('/boxes', { method: 'POST', body: JSON.stringify(payload) }),
  box: (code: string) => apiFetch<BoxOut>(`/boxes/${encodeURIComponent(code)}`),
  publicBox: (token: string) => fetch(`${API_URL}/public/boxes/${encodeURIComponent(token)}`).then(r => r.json()),
  boxEvents: (code: string) => apiFetch<BoxEventOut[]>(`/boxes/${encodeURIComponent(code)}/events`),
  scanBox: (payload: { box_code: string; event_type: BoxEventType; location?: string; comment?: string }) => apiFetch<BoxScanOut>('/scan/box', { method: 'POST', body: JSON.stringify(payload) }),
  upload1c: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return apiFetch<ImportBatchOut>('/imports/1c-excel', { method: 'POST', body: fd });
  },
  confirmImport: (id: string) => apiFetch<ImportConfirmOut>('/imports/' + id + '/confirm', { method: 'POST' }),

  changePassword: (payload: { old_password: string; new_password: string }) =>
  apiFetch<{ ok: boolean }>('/auth/change-password', { method: 'POST', body: JSON.stringify(payload) }),
};

export function publicLabelPdfUrl(publicToken: string) {
  return `${API_URL}/public/boxes/${encodeURIComponent(publicToken)}/label.pdf`;
}

