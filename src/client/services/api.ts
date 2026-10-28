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

// Interceptor response untuk menangani session expired (401 / 403)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      // Jika token kedaluwarsa saat mengakses endpoint private
      if (window.location.pathname !== import.meta.env.BASE_URL + 'login') {
        localStorage.removeItem('one_unusu_token');
        localStorage.removeItem('one_unusu_user');
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
  createdAt?: string;
  updatedAt?: string;
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

export const createAdminApp = (data: Partial<SsoAppItem> & { clientKey: string }) =>
  api.post<{ status: boolean; message: string; data: SsoAppItem }>('/admin/apps', data);

export const updateAdminApp = (id: number, data: Partial<SsoAppItem> & { clientKey?: string }) =>
  api.put<{ status: boolean; message: string; data: SsoAppItem }>(`/admin/apps/${id}`, data);

export default api;
