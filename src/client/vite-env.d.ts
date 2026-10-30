/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Tautan tombol "Portal Publik UNUSU" pada topbar panel admin.
   * Bila kosong, dipakai halaman depan aplikasi ini (`BASE_URL`).
   */
  readonly VITE_PUBLIC_PORTAL_URL?: string;
}
