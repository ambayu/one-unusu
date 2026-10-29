import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: Number(import.meta.env.VITE_API_TIMEOUT) || 8000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor untuk menyematkan JWT Token otomatis di setiap request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('one_unusu_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Interceptor response untuk menangani sesi berakhir.
 *
 * Hanya 401 yang berarti sesi tidak lagi sah. 403 berarti pengguna sah namun
 * tidak berizin pada endpoint tersebut, sehingga sesi tidak boleh dihapus.
 * Setelah token dibersihkan, pengguna diarahkan ke halaman login: tanpa
 * pengalihan, komponen sempat dirender dengan data pengguna kosong dan
 * meninggalkan tampilan panel tanpa menu.
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const loginPath = `${import.meta.env.BASE_URL}login`;
      const onLoginPage = window.location.pathname === loginPath;

      localStorage.removeItem('one_unusu_token');
      localStorage.removeItem('one_unusu_user');

      // Di halaman login, biarkan formulir yang menampilkan pesan galat.
      if (!onLoginPage) {
        window.location.replace(loginPath);
      }
    }
    return Promise.reject(error);
  }
);

export type UserRole = 'SUPERADMIN' | 'DOSEN' | 'MAHASISWA';

export interface UserProfile {
  id: number;
  username: string;
  nama: string;
  email?: string | null;
  noHp?: string | null;
  role: UserRole;
  nim?: string | null;
  nidn?: string | null;
  fakultas?: string | null;
  prodi?: string | null;
  avatar?: string | null;
  isActive: boolean;
  permissions?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface PermissionItem {
  id: number;
  key: string;
  resource: string;
  action: string;
  label: string;
}

export interface RoleItem {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  isSystem: boolean;
  userCount: number;
  permissionKeys: string[];
}

export interface SsoAppItem {
  id: number;
  clientId: string;
  nameApp: string;
  description?: string;
  icon?: string;
  badge?: string;
  urlRedirect: string;
  targetRoles: string;
  isActive: boolean;
  order: number;
}

export interface DirectoryItem {
  id: number;
  nama: string;
  kategori: string;
  deskripsi: string | null;
  urlTarget: string;
  icon: string | null;
  isExternal: boolean;
  urutan: number;
  active: boolean;
}

export interface AdminStats {
  totalUsers: number;
  totalMahasiswa: number;
  totalDosen: number;
  totalApps: number;
  totalTokens: number;
}

// ==========================================
// AUTH API
// ==========================================
export const loginSso = (identifier: string, password: string) =>
  api.post<{ status: boolean; message: string; token: string; data: UserProfile }>('/auth/login', {
    identifier,
    password,
  });

export const fetchMe = () =>
  api.get<{ status: boolean; data: UserProfile }>('/auth/me');

export const updateProfile = (data: { email?: string; noHp?: string; avatar?: string; currentPassword?: string; newPassword?: string }) =>
  api.put<{ status: boolean; message: string; data: UserProfile }>('/auth/profile', data);

// ==========================================
// SSO ENGINE API (TOKEN V2)
// ==========================================
export const fetchSsoApps = () =>
  api.get<{ status: boolean; data: SsoAppItem[] }>('/sso/apps');

export const getSsoRedirectV2 = (clientId: string) =>
  api.get<{ status: boolean; message: string; token: string; redirectUrl: string }>(`/sso/app-client/${clientId}/v2/redirect`);

// ==========================================
// ADMIN API
// ==========================================
export const fetchAdminStats = () =>
  api.get<{ status: boolean; data: AdminStats }>('/admin/stats');

export const fetchAdminUsers = () =>
  api.get<{ status: boolean; data: UserProfile[] }>('/admin/users');

export const createAdminUser = (data: Partial<UserProfile> & { password: string }) =>
  api.post<{ status: boolean; message: string; data: UserProfile }>('/admin/users', data);

export const fetchAdminApps = () =>
  api.get<{ status: boolean; data: SsoAppItem[] }>('/admin/apps');

export const createAdminApp = (data: Partial<SsoAppItem> & { clientKey: string; icon?: string }) =>
  api.post<{ status: boolean; message: string; data: SsoAppItem }>('/admin/apps', data);

export const updateAdminApp = (id: number, data: Partial<SsoAppItem> & { clientKey?: string }) =>
  api.put<{ status: boolean; message: string; data: SsoAppItem }>(`/admin/apps/${id}`, data);

export const deleteAdminApp = (id: number) =>
  api.delete<{ status: boolean; message: string }>(`/admin/apps/${id}`);

// ==========================================
// PERMISSION & ROLE API
// ==========================================
export const fetchAdminPermissions = () =>
  api.get<{ status: boolean; data: PermissionItem[] }>('/admin/permissions');

export const fetchAdminRoles = () =>
  api.get<{ status: boolean; data: RoleItem[] }>('/admin/roles');

export const createAdminRole = (data: { code: string; name: string; description?: string }) =>
  api.post<{ status: boolean; message: string }>('/admin/roles', data);

export const updateAdminRole = (id: number, data: { name?: string; description?: string }) =>
  api.put<{ status: boolean; message: string }>(`/admin/roles/${id}`, data);

export const updateAdminRolePermissions = (id: number, permissionKeys: string[]) =>
  api.put<{ status: boolean; message: string; data: { roleId: number; totalPermissions: number } }>(
    `/admin/roles/${id}/permissions`,
    { permissionKeys }
  );

export const deleteAdminRole = (id: number) =>
  api.delete<{ status: boolean; message: string }>(`/admin/roles/${id}`);

// ==========================================
// DIREKTORI PUBLIK API
// ==========================================
export const fetchDirectories = () =>
  api.get<{ status: boolean; data: DirectoryItem[] }>('/directories');

export const fetchAdminDirectories = () =>
  api.get<{ status: boolean; data: DirectoryItem[] }>('/admin/directories');

export const createAdminDirectory = (data: Partial<DirectoryItem>) =>
  api.post<{ status: boolean; message: string; data: DirectoryItem }>('/admin/directories', data);

export const updateAdminDirectory = (id: number, data: Partial<DirectoryItem>) =>
  api.put<{ status: boolean; message: string; data: DirectoryItem }>(`/admin/directories/${id}`, data);

export const deleteAdminDirectory = (id: number) =>
  api.delete<{ status: boolean; message: string }>(`/admin/directories/${id}`);

export default api;
