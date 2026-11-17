import axios from 'axios';

/*
 * Alamat API.
 *
 * Nilai cadangan `http://localhost:5000/api` tidak boleh ikut tertanam ke bundle
 * produksi: browser pengunjung akan menghubungi komputer mereka sendiri dan
 * seluruh permintaan gagal. Cadangan dibuat jalur relatif agar selalu menuju
 * host yang sedang dibuka.
 */
const BASE_URL = import.meta.env.VITE_API_URL || '/api';

if (import.meta.env.PROD && /localhost|127\.0\.0\.1/.test(BASE_URL)) {
  console.error(
    '[ONE] VITE_API_URL mengarah ke ' + BASE_URL + '. Perbaiki .env server lalu build ulang.'
  );
}

const api = axios.create({
  baseURL: BASE_URL,
  timeout: Number(import.meta.env.VITE_API_TIMEOUT) || 8000,
  // Sesi portal disimpan pada cookie HttpOnly, jadi setiap request wajib
  // membawa kredensial. Frontend tidak pernah membaca token secara langsung.
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor untuk menyematkan JWT Token otomatis di setiap request
api.interceptors.request.use(
  (config) => {
    // Klien lama masih menyimpan token di storage; bila ada, tetap dikirim
    // sebagai header agar tidak memutus sesi yang sedang berjalan.
    const legacyToken = localStorage.getItem('one_unusu_token');
    if (legacyToken && config.headers) {
      config.headers.Authorization = `Bearer ${legacyToken}`;
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
      const baseUrl = import.meta.env.BASE_URL;
      const loginPath = `${baseUrl}login`;
      const onLoginPage = window.location.pathname === loginPath;

      localStorage.removeItem('one_unusu_token');
      localStorage.removeItem('one_unusu_user');

      // Di halaman login, biarkan formulir yang menampilkan pesan galat.
      if (!onLoginPage) {
        // Sertakan tujuan semula supaya pengguna kembali ke halaman yang sama
        // setelah login, termasuk saat masuk lewat tautan aplikasi cabang.
        const path = window.location.pathname.startsWith(baseUrl)
          ? `/${window.location.pathname.slice(baseUrl.length)}`
          : window.location.pathname;
        const nextPath = `${path}${window.location.search}`;
        const safeNext = nextPath.startsWith('//') ? '' : nextPath;

        window.location.replace(`${loginPath}?next=${encodeURIComponent(safeNext)}`);
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Kode peran pengguna.
 *
 * Bukan lagi daftar tertutup: peran dibuat Superadmin di panel Peran & Izin,
 * sehingga kodenya bisa bertambah tanpa mengubah aplikasi. Konstanta di sini
 * hanya peran sistem yang dibutuhkan kode untuk keputusan tampilan.
 */
export type UserRole = string;

/** Peran yang dibutuhkan kode klien untuk keputusan tampilan. */
export const SUPERADMIN_ROLE = 'SUPERADMIN';

export interface UserProfile {
  id: number;
  username: string;
  nama: string;
  email?: string | null;
  noHp?: string | null;
  /** Kode peran utama / representasi teks peran. */
  role: UserRole;
  /** Seluruh peran yang dimiliki pengguna (multi-role). */
  roles?: RoleItem[];
  /** ID seluruh peran yang ditautkan. */
  roleIds?: number[];
  roleId?: number | null;
  nim?: string | null;
  nidn?: string | null;
  fakultas?: string | null;
  prodi?: string | null;
  avatar?: string | null;
  jenisKelamin?: string | null;
  tempatLahir?: string | null;
  tanggalLahir?: string | null;
  nik?: string | null;
  angkatan?: string | null;
  statusAkademik?: string | null;
  alamat?: string | null;
  asalSekolah?: string | null;
  namaIbuKandung?: string | null;
  gelarDepan?: string | null;
  gelarBelakang?: string | null;
  nip?: string | null;
  jabatanAkademik?: string | null;
  bidangKeahlian?: string | null;
  pendidikanTerakhir?: string | null;
  sintaId?: string | null;
  linkSinta?: string | null;
  googleScholar?: string | null;
  orcid?: string | null;
  scopusId?: string | null;
  biografi?: string | null;
  syncedAt?: string | null;
  isActive: boolean;
  permissions?: string[];
  /**
   * `true` selama akun masih memakai kata sandi bawaan hasil provisioning
   * SIAKAD. Portal menampilkan modal ganti kata sandi yang tidak dapat ditutup
   * sampai nilainya menjadi `false`.
   */
  harusGantiPassword?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PermissionItem {
  id: number;
  key: string;
  resource: string;
  action: string;
  label: string;
  roleCount?: number;
  isUsed?: boolean;
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
  /**
   * Rahasia server-to-server. Server hanya mengirim nilai ini kepada pengguna
   * yang memegang izin `application:edit` sekaligus berperan admin gateway;
   * selain itu bernilai `null`.
   */
  clientKey?: string | null;
  nameApp: string;
  description?: string;
  icon?: string;
  badge?: string;
  urlRedirect: string;
  /** Keterangan saja; otorisasi memakai izin masuk (`tingkatMasuk`). */
  targetRoles: string;
  /** Tingkat masuk yang dimiliki pengguna untuk aplikasi ini. */
  tingkatMasuk?: string[];
  /** Dihitung server dari izin masuk global milik pengguna. */
  isAllowed?: boolean;
  isActive: boolean;
  order: number;
}

export interface SsoHistoryItem {
  id: number;
  clientId: string;
  nameApp: string;
  icon: string | null;
  badge: string;
  createdAt: string;
  expiresAt: string;
  isUsed: boolean;
  usedAt: string | null;
  requestIp: string | null;
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

export interface BannerSliderItem {
  id: number;
  judul: string;
  subjudul?: string | null;
  gambarUrl: string;
  gambarMobileUrl?: string | null;
  linkUrl?: string | null;
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

export interface PanelAppAccess {
  clientId: string;
  nameApp: string;
  isAllowed: boolean;
  /** Tingkat masuk yang dimiliki pengguna (admin/dosen/mahasiswa). */
  tingkat?: string[];
}

export interface PanelAccess {
  role: UserRole;
  permissions: string[];
  panel: 'admin' | 'dashboard';
  canOpenAdminPanel: boolean;
  apps: PanelAppAccess[];
}

/** Keputusan navigasi pasca-login (panel admin vs dashboard civitas + akses aplikasi). */
export const fetchPanelAccess = () =>
  api.get<{ status: boolean; data: PanelAccess }>('/auth/panel-access');

export const logoutSession = () =>
  api.post<{ status: boolean; message: string }>('/auth/logout');

export const updateProfile = (data: Partial<UserProfile> & { currentPassword?: string; newPassword?: string }) =>
  api.put<{ status: boolean; message: string; data: UserProfile }>('/auth/profile', data);

export const syncProfileFromSiakad = () =>
  api.post<{ status: boolean; message: string; data: UserProfile }>('/auth/sync-siakad');

// ==========================================
// SSO ENGINE API (TOKEN V2)
// ==========================================
export const fetchSsoApps = () =>
  api.get<{ status: boolean; data: SsoAppItem[] }>('/sso/apps');

export const fetchSsoHistory = () =>
  api.get<{ status: boolean; data: SsoHistoryItem[] }>('/sso/history');

export const getSsoRedirectV2 = (clientId: string) =>
  api.get<{ status: boolean; message: string; token: string; redirectUrl: string }>(`/sso/app-client/${clientId}/v2/redirect`);

// ==========================================
// ADMIN API
// ==========================================
export const fetchAdminStats = () =>
  api.get<{ status: boolean; data: AdminStats }>('/admin/stats');

export const fetchAdminUsers = () =>
  api.get<{ status: boolean; data: UserProfile[] }>('/admin/users');

export const createAdminUser = (data: Omit<Partial<UserProfile>, 'role' | 'roleId'> & { password: string; roleIds?: number[]; roleId?: number | null }) =>
  api.post<{ status: boolean; message: string; data: UserProfile }>('/admin/users', data);

export const updateAdminUser = (id: number, data: Omit<Partial<UserProfile>, 'role' | 'roleId'> & { password?: string; roleIds?: number[]; roleId?: number | null }) =>
  api.put<{ status: boolean; message: string; data: UserProfile }>(`/admin/users/${id}`, data);

export const deleteAdminUser = (id: number) =>
  api.delete<{ status: boolean; message: string }>(`/admin/users/${id}`);

export const syncDosenFromSiakad = () =>
  api.post<{
    status: boolean;
    message: string;
    data: {
      totalSia: number;
      created: number;
      updated: number;
    };
  }>('/admin/siakad/sync-dosen');

export const fetchSiakadProdiList = () =>
  api.get<{
    status: boolean;
    data: Array<{ id: string; nama: string; fakultas: string }>;
  }>('/admin/siakad/prodi-list');

export const syncMahasiswaFromSiakad = (filter?: { idJurusan?: string; angkatan?: string }) =>
  api.post<{
    status: boolean;
    message: string;
    data: {
      totalSia: number;
      created: number;
      updated: number;
    };
  }>('/admin/siakad/sync-mahasiswa', filter);

// ==========================================
// ADMIN API — REGISTRY APLIKASI
// ==========================================
export const fetchAdminApps = () =>
  api.get<{ status: boolean; data: SsoAppItem[] }>('/admin/apps');

export const syncAdminApps = () =>
  api.post<{
    status: boolean;
    message: string;
    data: {
      createdCount: number;
      updatedCount: number;
      totalApps: number;
    };
  }>('/admin/apps/sync');

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

export const createAdminPermission = (data: { resource: string; action: string; label?: string }) =>
  api.post<{ status: boolean; message: string; data: PermissionItem }>('/admin/permissions', data);

export const deleteAdminPermission = (id: number) =>
  api.delete<{ status: boolean; message: string }>(`/admin/permissions/${id}`);

export const cleanupUnusedPermissions = () =>
  api.post<{ status: boolean; message: string; data: { cleanedCount: number; cleanedKeys: string[] } }>(
    '/admin/permissions/cleanup'
  );

export const syncAdminPermissions = () =>
  api.post<{ status: boolean; message: string }>('/admin/permissions/sync');

export const fetchAdminRoles = () =>
  api.get<{ status: boolean; data: RoleItem[] }>('/admin/roles');

export interface RoleAppItem {
  id: number;
  nameApp: string;
  isActive: boolean;
  selected: boolean;
  canGrant: boolean;
}

export const fetchAdminRoleApps = (id: number) =>
  api.get<{ status: boolean; data: RoleAppItem[] }>(`/admin/roles/${id}/apps`);

export const updateAdminRoleApps = (id: number, appIds: number[]) =>
  api.put<{ status: boolean; message: string }>(`/admin/roles/${id}/apps`, { appIds });

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

// ==========================================
// FOTO SLIDER HERO (BannerSlider)
// ==========================================
export const fetchSliders = () =>
  api.get<{ status: boolean; data: BannerSliderItem[] }>('/sliders');

export const fetchAdminSliders = () =>
  api.get<{ status: boolean; data: BannerSliderItem[] }>('/admin/sliders');

/**
 * Media slider dikirim sebagai `multipart/form-data`, bukan JSON base64.
 *
 * `Content-Type` sengaja dihapus agar peramban menuliskannya sendiri lengkap
 * dengan `boundary`; tanpa itu multer menolak body dan berkas tidak terbaca.
 * Berkas hanya disertakan bila benar-benar ada, sehingga penyuntingan teks saja
 * tidak mengirim field kosong yang akan dianggap galat oleh server.
 */
const kirimFormSlider = <T>(metode: 'post' | 'put', url: string, payload: SliderKiriman) =>
  api[metode]<T>(url, buatFormSlider(payload), { headers: { 'Content-Type': undefined } });

export interface SliderKiriman {
  judul?: string;
  subjudul?: string | null;
  linkUrl?: string | null;
  urutan?: number;
  active?: boolean;
  /** Berkas gambar atau video baru pengganti media lama. */
  berkas?: File | null;
}

const buatFormSlider = ({ berkas, ...teks }: SliderKiriman): FormData => {
  const form = new FormData();
  Object.entries(teks).forEach(([kunci, nilai]) => {
    if (nilai !== undefined && nilai !== null) form.append(kunci, String(nilai));
  });
  if (berkas) form.append('berkas', berkas);
  return form;
};

export const createAdminSlider = (data: SliderKiriman) =>
  kirimFormSlider<{ status: boolean; message: string; data: BannerSliderItem }>('post', '/admin/sliders', data);

export const updateAdminSlider = (id: number, data: SliderKiriman) =>
  kirimFormSlider<{ status: boolean; message: string; data: BannerSliderItem }>('put', `/admin/sliders/${id}`, data);

export const deleteAdminSlider = (id: number) =>
  api.delete<{ status: boolean; message: string }>(`/admin/sliders/${id}`);

// ==========================================
// KATALOG APLIKASI PUBLIK (hanya yang terhubung ke registry SSO)
// ==========================================
export interface AppCatalogItem {
  id: number;
  clientId: string;
  name: string;
  description: string | null;
  badge: string | null;
  icon: string | null;
  targetRoles: string[];
  tingkatMasuk: string[];
  origin: string;
}

export const fetchAppCatalog = () =>
  api.get<{ status: boolean; data: AppCatalogItem[] }>('/applications/catalog');

// ==========================================
// HIERARKI AKADEMIK (Fakultas & Prodi dari prodi-unusu / fallback lokal)
// ==========================================
export interface AcademicProgramItem {
  id: number | string;
  code?: string;
  name: string;
  degree?: string;
}

export interface AcademicFacultyItem {
  id: number | string;
  code?: string;
  name: string;
  studyPrograms: AcademicProgramItem[];
}

export const fetchAcademicHierarchy = () =>
  api.get<{ status: boolean; data: AcademicFacultyItem[] }>('/academic/hierarchy');

// ==========================================
// BERKAS DOSEN (unggah mandiri dosen, verifikasi admin)
// ==========================================
export interface DosenBerkasTipeItem {
  id: number;
  kode: string;
  nama: string;
  deskripsi: string | null;
  urutan: number;
  isRequired: boolean;
  sudahDiunggah: boolean;
}

export interface DosenBerkasPemilik {
  id: number;
  nama: string;
  nidn: string | null;
  prodi: string | null;
  fakultas: string | null;
  avatar: string | null;
}

export interface DosenBerkasItem {
  id: number;
  tipeKode: string;
  tipeNama: string;
  namaFile: string;
  nomorDokumen: string | null;
  tahunSK: string | null;
  keterangan: string | null;
  fileUrl: string;
  fileSize: number;
  uploadedAt: string;
  isArchived: boolean;
  pemilik: DosenBerkasPemilik | null;
}

export const fetchDosenBerkasTipe = () =>
  api.get<{ status: boolean; data: DosenBerkasTipeItem[] }>('/berkas-dosen/tipe');

export const fetchDosenBerkasList = (params?: { userId?: number }) =>
  api.get<{ status: boolean; data: DosenBerkasItem[]; meta: { peran: 'pemilik' | 'pengelola' } }>(
    '/berkas-dosen/list',
    { params }
  );

/**
 * Mengunggah satu berkas PDF.
 *
 * Header `Content-Type` sengaja dikosongkan agar browser menuliskan sendiri
 * `multipart/form-data` beserta boundary-nya. Nilai bawaan instance axios
 * (`application/json`) akan membuat server gagal membaca bagian berkas.
 */
export const uploadDosenBerkas = (formData: FormData, onProgress?: (persen: number) => void) =>
  api.post<{ status: boolean; message: string; data: { id: number; namaFile: string } }>(
    '/berkas-dosen/upload',
    formData,
    {
      headers: { 'Content-Type': undefined },
      // Unggahan 10 MB pada jaringan lambat bisa melampaui batas bawaan 8 detik.
      timeout: 120000,
      onUploadProgress: (event) => {
        if (!onProgress || !event.total) return;
        onProgress(Math.round((event.loaded / event.total) * 100));
      },
    }
  );

export const deleteDosenBerkas = (id: number) =>
  api.delete<{ status: boolean; message: string }>(`/berkas-dosen/${id}`);

/**
 * Rekap kelengkapan berkas seluruh dosen untuk panel monitoring.
 *
 * Berbeda dari `fetchDosenBerkasList` yang hanya mengembalikan baris berkas,
 * endpoint ini berangkat dari daftar pengguna berperan DOSEN sehingga dosen
 * yang belum mengunggah apa pun tetap muncul.
 */
export interface MonitoringBerkasDosenItem extends DosenBerkasPemilik {
  berkas: DosenBerkasItem[];
  totalJenisBerkas: number;
  totalBerkasTerunggah: number;
  totalBarisBerkas: number;
  totalTipeWajib: number;
  wajibTerpenuhi: number;
  wajibLengkap: boolean;
  sudahMengunggah: boolean;
  jenisBelumDiunggah: { kode: string; nama: string; isRequired: boolean }[];
}

export interface MonitoringBerkasDosenMeta {
  totalDosen: number;
  sudahMengunggah: number;
  belumMengunggah: number;
  totalTipeBerkas: number;
  totalTipeWajib: number;
  tipeBerkas: { id: number; kode: string; nama: string; isRequired: boolean }[];
}

export const fetchMonitoringBerkasDosen = () =>
  api.get<{
    status: boolean;
    data: MonitoringBerkasDosenItem[];
    meta: MonitoringBerkasDosenMeta;
  }>('/admin/berkas-dosen/monitoring');

/**
 * Mengambil isi berkas sebagai blob untuk dipratinjau / diunduh.
 *
 * Berkas tidak dapat ditautkan langsung karena endpoint-nya menuntut sesi
 * login; tautan biasa dari tab baru tidak membawa header otorisasi.
 */
export const fetchDosenBerkasBlob = (fileUrl: string) =>
  api.get<Blob>(fileUrl.replace(/^\/api/, ''), { responseType: 'blob', timeout: 60000 });

// ==========================================
// ARSIP DOKUMEN LPM & LPPM (Integrasi & API Hub)
// ==========================================
export interface DokumenIntegrasiItem {
  id: number;
  judul: string;
  nomor?: string | null;
  kategoriId?: number;
  kategori?: { id: number; nama: string; deskripsi?: string | null } | null;
  tahun: number;
  tanggalDokumen?: string | null;
  tanggalMulaiBerlaku?: string | null;
  tanggalBerakhir?: string | null;
  keterangan?: string | null;
  filePdfUrl?: string | null;
  fileSize?: number | null;
  status: string;
  tujuanPublish?: string | null;
  prodiCode?: string | null;
  prodiName?: string | null;
  createdAt?: string;
  /** Label aplikasi sumber (`LPM` / `LPPM`) — ditetapkan klien sesuai endpoint yang dipanggil. */
  sumber: 'LPM' | 'LPPM';
  /** Tautan panel arsip aplikasi sumber. */
  tautanArsip?: string;
}

export interface DokumenIntegrasiParams {
  search?: string;
  status?: string;
  tahun?: number;
  tujuanPublish?: string;
  prodiCode?: string;
  skip?: number;
  take?: number;
}

export interface KurikulumProdiItem {
  id: number;
  name: string;
  year: number;
  description?: string;
  isActive: boolean;
  studyProgram: {
    id: number;
    code: string;
    name: string;
    degree: string;
    faculty: string | null;
  };
  totalCourses: number;
  totalCredits: number;
  courses: Array<{
    id: number;
    source: string;
    courseId: number | null;
    code: string;
    name: string;
    credits: number;
    description?: string;
    academicSemester: {
      id: number;
      code: string;
      name: string;
      isActive: boolean;
    } | null;
    lecturers: any[];
    rpsDocuments: Array<{
      id: number;
      title: string;
      fileUrl: string;
      revision: number;
    }>;
  }>;
}

export interface KurikulumProdiParams {
  prodi?: string;
  year?: string | number;
  semester?: string;
  search?: string;
  isActive?: boolean | string;
}

/** Mengambil seluruh kurikulum prodi terintegrasi dari Prodi UNUSU */
export const fetchKurikulumProdi = (params?: KurikulumProdiParams) =>
  api.get<{
    success: boolean;
    totalCurriculums: number;
    curriculums: KurikulumProdiItem[];
    message?: string;
  }>('/inter-service/kurikulum-prodi', { params });

/** Arsip dokumen milik aplikasi LPM UNUSU. */
export const fetchDokumenLpm = (params?: DokumenIntegrasiParams) =>
  api.get<{ status: boolean; app: string; data: DokumenIntegrasiItem[]; message?: string }>(
    '/inter-service/dokumen-lpm',
    { params }
  );

/** Arsip dokumen milik aplikasi LPPM UNUSU. */
export const fetchDokumenLppm = (params?: DokumenIntegrasiParams) =>
  api.get<{ status: boolean; app: string; data: DokumenIntegrasiItem[]; message?: string }>(
    '/inter-service/dokumen-lppm',
    { params }
  );

// ==========================================
// INTEGRASI & API HUB
// ==========================================

/** Entri katalog endpoint lintas-aplikasi. */
export interface ApiEndpointItem {
  id: number;
  name: string;
  description: string | null;
  endpoint: string;
  method: string;
  sourceApp: string;
  category: string;
  exampleRequest: string | null;
  exampleResponse: string | null;
  isActive: boolean;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * API key seperti yang tampil di daftar.
 *
 * `key` sudah dipotong oleh server. Nilai utuh hanya diterima sekali pada
 * respons pembuatan key (`ApiKeyBaru`).
 */
export interface ApiKeyItem {
  id: number;
  name: string;
  description: string | null;
  key: string;
  appId: number;
  appName: string;
  allowedEndpoints: number[] | null;
  isActive: boolean;
  revoked: boolean;
  revokedAt: string | null;
  revokedReason: string | null;
  lastUsedAt: string | null;
  lastUsedIp: string | null;
  usageCount: number;
  createdAt: string;
}

/** Hasil pembuatan key — satu-satunya respons berisi nilai key utuh. */
export interface ApiKeyBaru {
  id: number;
  name: string;
  description: string | null;
  key: string;
  appId: number;
  appName: string;
  allowedEndpoints: number[] | null;
  isActive: boolean;
  revoked: boolean;
  usageCount: number;
  createdAt: string;
}

/** Satu baris riwayat pemakaian API key. */
export interface ApiUsageLogItem {
  id: number;
  keyId: number;
  keyName: string;
  appName: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  requestIp: string | null;
  userAgent: string | null;
  errorMessage: string | null;
  createdAt: string;
}

/** Aplikasi yang boleh memiliki API key. */
export interface ApiHubAppItem {
  id: number;
  nameApp: string;
  isActive: boolean;
}

/** Bentuk data yang dikirim saat menyimpan endpoint. */
export interface ApiEndpointKiriman {
  name: string;
  endpoint: string;
  method: string;
  sourceApp: string;
  category?: string;
  description?: string | null;
  exampleRequest?: string | null;
  exampleResponse?: string | null;
  isActive?: boolean;
  isPublic?: boolean;
}

export const fetchApiEndpoints = (params?: { search?: string; sourceApp?: string }) =>
  api.get<{ status: boolean; data: ApiEndpointItem[]; meta: { total: number } }>(
    '/admin/api-hub/endpoints',
    { params }
  );

export const createApiEndpoint = (data: ApiEndpointKiriman) =>
  api.post<{ status: boolean; message: string; data: ApiEndpointItem }>(
    '/admin/api-hub/endpoints',
    data
  );

export const updateApiEndpoint = (id: number, data: Partial<ApiEndpointKiriman>) =>
  api.put<{ status: boolean; message: string; data: ApiEndpointItem }>(
    `/admin/api-hub/endpoints/${id}`,
    data
  );

export const deleteApiEndpoint = (id: number) =>
  api.delete<{ status: boolean; message: string }>(`/admin/api-hub/endpoints/${id}`);

export const fetchApiHubApps = () =>
  api.get<{ status: boolean; data: ApiHubAppItem[] }>('/admin/api-hub/apps');

export const fetchApiKeys = (params?: { search?: string }) =>
  api.get<{ status: boolean; data: ApiKeyItem[]; meta: { total: number } }>('/admin/api-hub/keys', {
    params,
  });

export const createApiKey = (data: {
  name: string;
  appId: number;
  description?: string | null;
  allowedEndpoints?: number[] | null;
}) =>
  api.post<{ status: boolean; message: string; data: ApiKeyBaru }>('/admin/api-hub/keys', data);

export const updateApiKey = (
  id: number,
  data: { name?: string; description?: string | null; allowedEndpoints?: number[] | null; isActive?: boolean }
) =>
  api.put<{ status: boolean; message: string; data: ApiKeyItem }>(`/admin/api-hub/keys/${id}`, data);

/** Mencabut key. Baris tidak dihapus; `revoked` diisi dan key langsung mati. */
export const revokeApiKey = (id: number, reason?: string) =>
  api.delete<{ status: boolean; message: string }>(`/admin/api-hub/keys/${id}`, {
    data: { reason },
  });

export const fetchApiUsageLogs = (params?: { take?: number; endpoint?: string; statusCode?: number }) =>
  api.get<{ status: boolean; data: ApiUsageLogItem[]; meta: { total: number; take: number } }>(
    '/admin/api-hub/logs',
    { params }
  );

export default api;
