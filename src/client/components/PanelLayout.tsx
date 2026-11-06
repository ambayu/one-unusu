import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { SidebarLayout } from './SidebarLayout';
import { UserProfile, fetchMe } from '../services/api';

const USER_STORAGE_KEY = 'one_unusu_user';

/**
 * Membaca profil pengguna dari cache localStorage.
 *
 * Dipakai sebagai nilai awal agar sidebar langsung tampil tanpa menunggu
 * jaringan. Bila cache kosong, sidebar tetap dirender dengan data null dan
 * akan terisi setelah GET /auth/me selesai.
 */
function readCachedUser(): UserProfile | null {
  const raw = localStorage.getItem(USER_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

/**
 * PanelLayout — pembungkus TUNGGAL untuk semua halaman panel ONE UNUSU.
 *
 * Sebelumnya `SidebarLayout` dipasang di dalam setiap halaman (`Dashboard`,
 * `Profile`, dan setiap halaman `/admin/*` lewat `AdminPanelTemplate`). Karena
 * React Router melepas pohon komponen halaman lama saat berpindah rute,
 * sidebar ikut unmount lalu mount ulang pada setiap perpindahan menu. Efeknya
 * terlihat sebagai "kedip / reload": status collapse kembali terbuka, drawer
 * tertutup, dan animasi mulai dari awal.
 *
 * Dengan menjadikan layout ini elemen induk dari nested route (dan memakai
 * `<Outlet />` sebagai slot isi), sidebar dipasang sekali saja dan tidak
 * pernah dilepas selama pengguna berada di area panel. Status lokalnya
 * (collapsed, drawer, dropdown) jadi awet antar-halaman.
 *
 * Catatan: komponen ini SENGAJA tidak melakukan validasi sesi. Penjagaan rute
 * tetap ditangani `ProtectedRoute`/`AdminPanelRoute` di App.tsx.
 */
export const PanelLayout: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(() => readCachedUser());

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await fetchMe();
        if (cancelled || !response.data?.status) return;

        setUser(response.data.data);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(response.data.data));
      } catch {
        // Sesi tidak valid sudah ditangani interceptor API (bersihkan sesi lalu
        // alihkan ke /login). Cache terakhir dibiarkan agar sidebar tidak
        // tiba-tiba kehilangan identitas saat gangguan jaringan sesaat.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SidebarLayout user={user}>
      <Outlet />
    </SidebarLayout>
  );
};

export default PanelLayout;
