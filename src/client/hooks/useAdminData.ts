import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  AdminStats,
  SsoAppItem,
  UserProfile,
  fetchAdminApps,
  fetchAdminStats,
  fetchAdminUsers,
  fetchMe,
} from '../services/api';

export interface AdminData {
  currentUser: UserProfile | null;
  stats: AdminStats | null;
  users: UserProfile[];
  apps: SsoAppItem[];
  loading: boolean;
  reload: () => Promise<void>;
}

/**
 * Sumber data bersama untuk halaman tata kelola SSO.
 *
 * Semua request dijalankan dengan allSettled karena tiap endpoint dilindungi
 * permission berbeda: pengguna dengan izin terbatas tetap mendapat data yang
 * boleh dibaca, tanpa membuat seluruh halaman gagal.
 */
export function useAdminData(): AdminData {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [apps, setApps] = useState<SsoAppItem[]>([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  const reload = useCallback(async () => {
    try {
      setLoading(true);

      const [meResult, statsResult, usersResult, appsResult] = await Promise.allSettled([
        fetchMe(),
        fetchAdminStats(),
        fetchAdminUsers(),
        fetchAdminApps(),
      ]);

      if (meResult.status === 'fulfilled' && meResult.value.data.status) {
        setCurrentUser(meResult.value.data.data);
        localStorage.setItem('one_unusu_user', JSON.stringify(meResult.value.data.data));
      }

      if (meResult.status === 'rejected') {
        const status = axios.isAxiosError(meResult.reason) ? meResult.reason.response?.status : undefined;
        if (status === 401 || status === 403) {
          navigate('/login');
          return;
        }
      }

      if (statsResult.status === 'fulfilled' && statsResult.value.data.status) {
        setStats(statsResult.value.data.data);
      }

      if (usersResult.status === 'fulfilled' && usersResult.value.data.status) {
        setUsers(usersResult.value.data.data);
      }

      if (appsResult.status === 'fulfilled' && appsResult.value.data.status) {
        setApps(appsResult.value.data.data);
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { currentUser, stats, users, apps, loading, reload };
}
