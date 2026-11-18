import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AcademicCapIcon,
  ArrowPathIcon,
  BriefcaseIcon,
  CheckIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PlusIcon,
  ShieldCheckIcon,
  TrashIcon,
  UsersIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { AdminPanelTemplate } from '../../components/templates/AdminPanelTemplate';
import { BiodataEditor } from '../../components/BiodataEditor';
import { DataTable } from '../../components/DataTable';
import { useAdminData } from '../../hooks/useAdminData';
import { NotificationModal, NotificationType } from '../../components/NotificationModal';
import {
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
  syncDosenFromSiakad,
  syncMahasiswaFromSiakad,
  fetchSiakadProdiList,
  fetchAdminRoles,
  fetchAcademicHierarchy,
  AcademicFacultyItem,
  RoleItem,
  UserProfile,
  UserRole,
} from '../../services/api';

interface FeedbackMessage {
  type: 'success' | 'error';
  text: string;
}

const ROLE_BADGE: Record<string, string> = {
  SUPERADMIN: 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]',
  ADMIN_SSO: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  DOSEN: 'bg-[#F0FDF4] text-[#166534] border-[#BBF7D0]',
  MAHASISWA: 'bg-[#F1F5F2] text-[#475569] border-[#D8E5DC]',
};

/**
 * Warna lencana untuk peran buatan Superadmin.
 *
 * Peran kustom tidak punya warna tetap di kode, jadi dipilih deterministik dari
 * kodenya agar satu peran selalu tampil dengan warna yang sama.
 */
const BADGE_PALETTE = [
  'bg-blue-50 text-blue-800 border-blue-200',
  'bg-purple-50 text-purple-800 border-purple-200',
  'bg-amber-50 text-amber-800 border-amber-200',
  'bg-cyan-50 text-cyan-800 border-cyan-200',
  'bg-indigo-50 text-indigo-800 border-indigo-200',
  'bg-orange-50 text-orange-800 border-orange-200',
];

function badgeForRole(code: string): string {
  const tetap = ROLE_BADGE[code];
  if (tetap) return tetap;

  let hash = 0;
  for (let i = 0; i < code.length; i += 1) {
    hash = (hash * 31 + code.charCodeAt(i)) % BADGE_PALETTE.length;
  }
  return BADGE_PALETTE[hash];
}

/**
 * Inisial nama untuk pengganti foto profil.
 *
 * Diambil dari maksimal dua kata pertama. Nama yang hanya satu kata tetap
 * menghasilkan satu huruf, bukan string kosong.
 */
function inisialNama(nama: string | null | undefined): string {
  const bersih = (nama ?? '').trim();
  if (!bersih) return '?';
  const kata = bersih.split(/\s+/).filter(Boolean);
  const inisial = kata.slice(0, 2).map((k) => k[0]).join('');
  return inisial.toUpperCase();
}

export const ManajemenPengguna: React.FC = () => {
  const { currentUser, stats, users, loading, reload } = useAdminData();
  const [searchParams, setSearchParams] = useSearchParams();

  // Peran dimuat dari database: Superadmin dapat membuat peran baru kapan saja,
  // jadi daftar tetap di kode akan selalu tertinggal.
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [academicHierarchy, setAcademicHierarchy] = useState<AcademicFacultyItem[]>([]);
  const [academicLoading, setAcademicLoading] = useState(true);
  const [notify, setNotify] = useState<{
    isOpen: boolean;
    type: NotificationType;
    title?: string;
    message: string;
  }>({
    isOpen: false,
    type: 'info',
    message: '',
  });

  const loadRoles = React.useCallback(async (isCancelled?: () => boolean) => {
    setRolesLoading(true);
    try {
      const res = await fetchAdminRoles();
      if (!isCancelled?.() && res.data?.data) setRoles(res.data.data);
    } catch (error: unknown) {
      const status =
        typeof error === 'object' && error !== null && 'response' in error
          ? (error as { response?: { status?: number } }).response?.status
          : undefined;
      if (!isCancelled?.() && status !== 403) {
        setNotify({
          isOpen: true,
          type: 'error',
          title: 'Gagal Memuat Peran',
          message: 'Gagal memuat daftar peran pengguna dari server.',
        });
      }
    } finally {
      if (!isCancelled?.()) setRolesLoading(false);
    }
  }, []);

  const handleRefresh = React.useCallback(async () => {
    await Promise.all([reload(), loadRoles()]);
  }, [reload, loadRoles]);

  React.useEffect(() => {
    let cancelled = false;

    void loadRoles(() => cancelled);

    fetchAcademicHierarchy()
      .then((res) => {
        if (!cancelled && res.data?.data) setAcademicHierarchy(res.data.data);
      })
      .catch(() => {
        // Fallback ditangani di backend, jika network gagal biarkan kosong/input manual
      })
      .finally(() => {
        if (!cancelled) setAcademicLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [loadRoles]);

  const roleCatalog = React.useMemo(() => {
    const byCode = new Map<UserRole, string>(roles.map((role) => [role.code, role.name]));
    users.forEach((user) => {
      user.roles?.forEach((role) => {
        if (!byCode.has(role.code)) byCode.set(role.code, role.name);
      });
    });
    return Array.from(byCode.entries());
  }, [roles, users]);

  const ROLE_OPTIONS = React.useMemo<UserRole[]>(
    () => roleCatalog.map(([code]) => code),
    [roleCatalog]
  );

  const ROLE_LABEL = React.useMemo<Record<string, string>>(
    () => Object.fromEntries(roleCatalog),
    [roleCatalog]
  );

  const roleParam = searchParams.get('role');
  const validRoleFilter: 'ALL' | UserRole =
    roleParam && (rolesLoading || loading || ROLE_OPTIONS.includes(roleParam as UserRole) || roleParam === 'ALL')
      ? (roleParam as 'ALL' | UserRole)
      : 'ALL';

  const [search, setSearch] = useState('');
  const [filterRole, setFilterRoleState] = useState<'ALL' | UserRole>(validRoleFilter);

  type StatusFilter = 'ALL' | 'AKTIF' | 'NONAKTIF';
  const statusParam = searchParams.get('status');
  const validStatusFilter: StatusFilter =
    statusParam === 'aktif' ? 'AKTIF' : statusParam === 'nonaktif' ? 'NONAKTIF' : 'ALL';
  const [filterStatus, setFilterStatusState] = useState<StatusFilter>(validStatusFilter);

  /*
   * Filter fakultas & program studi.
   *
   * Pilihannya diturunkan dari data pengguna yang sedang dimuat, bukan dari
   * tabel master `fakultas`/`prodi` — kedua tabel itu masih kosong, dan
   * menampilkan daftar kosong akan membuat filter tidak berguna. Dengan cara
   * ini yang muncul hanya nilai yang benar-benar ada pada akun.
   *
   * Nilai kosong dinormalkan: kolom `prodi` berisi "-" atau null pada akun yang
   * belum punya homebase, dan keduanya digabung ke satu pilihan "Belum diisi".
   */
  const [filterFakultas, setFilterFakultas] = useState('ALL');
  const [filterProdi, setFilterProdi] = useState('ALL');

  const KOSONG = '__KOSONG__';

  /** Nilai fakultas yang dipakai untuk penyaringan; kosong dinormalkan. */
  const fakultasKunci = (user: UserProfile): string => {
    const nilai = (user.fakultas ?? '').trim();
    if (!nilai || nilai === '-') return KOSONG;
    return nilai;
  };

  /** Nilai prodi yang dipakai untuk penyaringan; kosong dinormalkan. */
  const prodiKunci = (user: UserProfile): string => {
    const nilai = (user.prodi ?? '').trim();
    if (!nilai || nilai === '-') return KOSONG;
    return nilai;
  };

  const opsiFakultas = useMemo(() => {
    const hitung = new Map<string, number>();
    users.forEach((user) => {
      const kunci = fakultasKunci(user);
      hitung.set(kunci, (hitung.get(kunci) ?? 0) + 1);
    });
    return Array.from(hitung.entries())
      .sort(([a], [b]) => {
        // "Belum diisi" selalu paling bawah agar tidak menutupi fakultas nyata.
        if (a === KOSONG) return 1;
        if (b === KOSONG) return -1;
        return a.localeCompare(b, 'id');
      })
      .map(([nilai, jumlah]) => ({ nilai, jumlah }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users]);

  /*
   * Pilihan prodi menyempit mengikuti fakultas terpilih. Tanpa ini, memilih
   * "Fakultas Ekonomi" tetap menampilkan prodi fakultas lain dan pengguna bisa
   * memilih kombinasi yang tidak pernah ada.
   */
  const opsiProdi = useMemo(() => {
    const sumber =
      filterFakultas === 'ALL'
        ? users
        : users.filter((user) => fakultasKunci(user) === filterFakultas);

    const hitung = new Map<string, number>();
    sumber.forEach((user) => {
      const kunci = prodiKunci(user);
      hitung.set(kunci, (hitung.get(kunci) ?? 0) + 1);
    });
    return Array.from(hitung.entries())
      .sort(([a], [b]) => {
        if (a === KOSONG) return 1;
        if (b === KOSONG) return -1;
        return a.localeCompare(b, 'id');
      })
      .map(([nilai, jumlah]) => ({ nilai, jumlah }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users, filterFakultas]);

  /** Label yang tampil pada dropdown. */
  const labelWilayah = (nilai: string) => (nilai === KOSONG ? 'Belum diisi' : nilai);

  const hasActiveFilters = filterRole !== 'ALL' || filterStatus !== 'ALL' ||
    filterFakultas !== 'ALL' || filterProdi !== 'ALL' || search.trim() !== '';

  // Sinkronisasi jika query param URL berubah dari luar atau daftar peran selesai dimuat
  React.useEffect(() => {
    setFilterRoleState(validRoleFilter);
  }, [validRoleFilter]);

  React.useEffect(() => {
    setFilterStatusState(validStatusFilter);
  }, [statusParam]);

  const updateStatusFilter = (newStatus: StatusFilter, role: 'ALL' | UserRole = filterRole) => {
    setFilterRoleState(role);
    setFilterStatusState(newStatus);
    const newParams = new URLSearchParams(searchParams);
    if (role === 'ALL') newParams.delete('role');
    else newParams.set('role', role);
    if (newStatus === 'ALL') {
      newParams.delete('status');
    } else {
      newParams.set('status', newStatus === 'AKTIF' ? 'aktif' : 'nonaktif');
    }
    setSearchParams(newParams, { replace: true });
  };

  const resetFilters = () => {
    setFilterRoleState('ALL');
    setFilterStatusState('ALL');
    setFilterFakultas('ALL');
    setFilterProdi('ALL');
    setSearch('');
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('role');
    newParams.delete('status');
    newParams.delete('fakultas');
    newParams.delete('prodi');
    setSearchParams(newParams, { replace: true });
  };

  /**
   * Mengubah fakultas yang disaring.
   *
   * Prodi ikut direset bila sudah tidak ada di fakultas yang baru. Tanpa ini,
   * memilih "Teknik Informatika" lalu berganti ke "Fakultas Ekonomi" akan
   * menghasilkan tabel kosong tanpa penjelasan.
   */
  const updateFakultasFilter = (nilai: string) => {
    setFilterFakultas(nilai);
    setFilterProdi('ALL');

    const newParams = new URLSearchParams(searchParams);
    newParams.delete('prodi');
    if (nilai === 'ALL') {
      newParams.delete('fakultas');
    } else {
      newParams.set('fakultas', nilai);
    }
    setSearchParams(newParams, { replace: true });
  };

  const updateProdiFilter = (nilai: string) => {
    setFilterProdi(nilai);

    const newParams = new URLSearchParams(searchParams);
    if (nilai === 'ALL') {
      newParams.delete('prodi');
    } else {
      newParams.set('prodi', nilai);
    }
    setSearchParams(newParams, { replace: true });
  };

  const updateRoleFilter = (newFilter: 'ALL' | UserRole) => {
    setFilterRoleState(newFilter);
    const newParams = new URLSearchParams(searchParams);
    if (newFilter === 'ALL') {
      newParams.delete('role');
    } else {
      newParams.set('role', newFilter);
    }
    setSearchParams(newParams, { replace: true });
  };

  const handleCardClick = (role: 'ALL' | UserRole) => {
    // Klik card yang sama = toggle off (reset), klik card lain = ganti filter.
    const nextFilter: 'ALL' | UserRole = filterRole === role && role !== 'ALL' ? 'ALL' : role;

    setFilterRoleState(nextFilter);
    // Filter status direset agar hasil dari card peran konsisten
    setFilterStatusState('ALL');

    const params = new URLSearchParams(searchParams);
    params.delete('status');
    if (nextFilter === 'ALL') {
      params.delete('role');
    } else {
      params.set('role', nextFilter);
    }
    setSearchParams(params, { replace: true });
  };

  const [showModal, setShowModal] = useState(false);
  const [newRoleIds, setNewRoleIds] = useState<number[]>([]);
  const [newUsername, setNewUsername] = useState('');
  const [newNama, setNewNama] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newNoHp, setNewNoHp] = useState('');
  const [newProdi, setNewProdi] = useState('');
  const [newFakultas, setNewFakultas] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State Edit Pengguna
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editNama, setEditNama] = useState('');
  const [editRoleIds, setEditRoleIds] = useState<number[]>([]);
  const [editEmail, setEditEmail] = useState('');
  const [editNoHp, setEditNoHp] = useState('');
  const [editProdi, setEditProdi] = useState('');
  const [editFakultas, setEditFakultas] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editNewPassword, setEditNewPassword] = useState('');
  /* Kolom identitas civitas. Diedit bebas oleh admin, termasuk NIM/NIDN
     yang sebelumnya tidak tampil di formulir sama sekali. */
  const [editNim, setEditNim] = useState('');
  const [editNidn, setEditNidn] = useState('');
  const [editJenisKelamin, setEditJenisKelamin] = useState('');
  const [editTempatLahir, setEditTempatLahir] = useState('');
  const [editTanggalLahir, setEditTanggalLahir] = useState('');
  const [editNik, setEditNik] = useState('');
  const [editAngkatan, setEditAngkatan] = useState('');
  const [editStatusAkademik, setEditStatusAkademik] = useState('');
  const [editAlamat, setEditAlamat] = useState('');
  const [editAsalSekolah, setEditAsalSekolah] = useState('');
  const [editNamaIbuKandung, setEditNamaIbuKandung] = useState('');
  const [editGelarDepan, setEditGelarDepan] = useState('');
  const [editGelarBelakang, setEditGelarBelakang] = useState('');
  const [editNip, setEditNip] = useState('');
  const [editJabatanAkademik, setEditJabatanAkademik] = useState('');
  const [editBidangKeahlian, setEditBidangKeahlian] = useState('');
  const [editPendidikanTerakhir, setEditPendidikanTerakhir] = useState('');
  const [editSintaId, setEditSintaId] = useState('');
  const [editLinkSinta, setEditLinkSinta] = useState('');
  const [editGoogleScholar, setEditGoogleScholar] = useState('');
  const [editOrcid, setEditOrcid] = useState('');
  const [editScopusId, setEditScopusId] = useState('');
  const [editBiografi, setEditBiografi] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // State Hapus Pengguna
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingUser, setDeletingUser] = useState<UserProfile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSyncingSiakad, setIsSyncingSiakad] = useState(false);
  const [showSyncConfirm, setShowSyncConfirm] = useState(false);

  // State Tarik Mahasiswa SIAKAD
  const [showSyncMhsModal, setShowSyncMhsModal] = useState(false);
  const [isSyncingMhs, setIsSyncingMhs] = useState(false);
  const [siakadProdiOptions, setSiakadProdiOptions] = useState<Array<{ id: string; nama: string; fakultas: string }>>([]);
  const [selectedMhsProdi, setSelectedMhsProdi] = useState('');
  const [selectedMhsAngkatan, setSelectedMhsAngkatan] = useState('');

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();

    return users.filter((user) => {
      const userRoleCodes = user.roles && user.roles.length > 0
        ? user.roles.map((r) => r.code)
        : [user.role];
      const matchRole = filterRole === 'ALL' || userRoleCodes.includes(filterRole);
      const matchStatus =
        filterStatus === 'ALL' ||
        (filterStatus === 'AKTIF' ? user.isActive : !user.isActive);
      const matchSearch =
        !term ||
        user.username.toLowerCase().includes(term) ||
        user.nama.toLowerCase().includes(term) ||
        (user.prodi ?? '').toLowerCase().includes(term) ||
        (user.fakultas ?? '').toLowerCase().includes(term) ||
        (user.email ?? '').toLowerCase().includes(term);

      const matchFakultas =
        filterFakultas === 'ALL' || fakultasKunci(user) === filterFakultas;
      const matchProdi = filterProdi === 'ALL' || prodiKunci(user) === filterProdi;

      return matchRole && matchStatus && matchSearch && matchFakultas && matchProdi;
    });
  }, [users, search, filterRole, filterStatus, filterFakultas, filterProdi]);

  const openModal = () => {
    const defaultRole = roles.find((r) => r.code === 'MAHASISWA') || roles[0];
    setNewRoleIds(defaultRole ? [defaultRole.id] : []);
    setNewUsername('');
    setNewNama('');
    setNewPassword('');
    setNewEmail('');
    setNewNoHp('');
    setNewProdi('');
    setNewFakultas('');
    setShowModal(true);
  };

  const toggleNewRole = (roleId: number) => {
    setNewRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  };

  const toggleEditRole = (roleId: number) => {
    setEditRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  };

  const availableNewProdis = useMemo(() => {
    if (!newFakultas) {
      return academicHierarchy.flatMap((f) => f.studyPrograms);
    }
    const found = academicHierarchy.find((f) => f.name === newFakultas);
    return found ? found.studyPrograms : [];
  }, [newFakultas, academicHierarchy]);

  const availableEditProdis = useMemo(() => {
    if (!editFakultas) {
      return academicHierarchy.flatMap((f) => f.studyPrograms);
    }
    const found = academicHierarchy.find((f) => f.name === editFakultas);
    return found ? found.studyPrograms : [];
  }, [editFakultas, academicHierarchy]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (newRoleIds.length === 0) {
      setNotify({
        isOpen: true,
        type: 'warning',
        title: 'Peran Belum Dipilih',
        message: 'Silakan pilih minimal satu peran untuk akun pengguna yang akan dibuat.',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await createAdminUser({
        username: newUsername,
        password: newPassword,
        nama: newNama,
        roleIds: newRoleIds,
        email: newEmail || null,
        noHp: newNoHp || null,
        prodi: newProdi || null,
        fakultas: newFakultas || null,
      });

      if (res.data.status) {
        setShowModal(false);
        setNotify({
          isOpen: true,
          type: 'success',
          title: 'Akun Berhasil Dibuat',
          message: `Akun pengguna atas nama ${newNama} (${newUsername}) berhasil ditambahkan ke sistem.`,
        });
        await reload();
      } else {
        setNotify({
          isOpen: true,
          type: 'error',
          title: 'Gagal Menambahkan Akun',
          message: res.data.message || 'Gagal membuat akun pengguna baru.',
        });
      }
    } catch (error: unknown) {
      const text =
        typeof error === 'object' && error !== null && 'response' in error
          ? String((error as { response?: { data?: { message?: string } } }).response?.data?.message ?? '')
          : '';
      setNotify({
        isOpen: true,
        type: 'error',
        title: 'Kesalahan Sistem',
        message: text || 'Terjadi kesalahan pada server saat menambahkan akun pengguna.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (user: UserProfile) => {
    setEditingUser(user);
    setEditUsername(user.username);
    setEditNama(user.nama);

    let initialRoleIds: number[] = [];
    if (user.roles && user.roles.length > 0) {
      initialRoleIds = user.roles.map((r) => r.id);
    } else if (user.roleIds && user.roleIds.length > 0) {
      initialRoleIds = user.roleIds;
    } else if (user.roleId) {
      initialRoleIds = [user.roleId];
    } else {
      const matched = roles.find((r) => r.code === user.role);
      if (matched) initialRoleIds = [matched.id];
    }

    setEditRoleIds(initialRoleIds);
    setEditEmail(user.email || '');
    setEditNoHp(user.noHp || '');
    setEditProdi(user.prodi || '');
    setEditFakultas(user.fakultas || '');
    setEditIsActive(Boolean(user.isActive));
    setEditNewPassword('');
    setEditNim(user.nim || '');
    setEditNidn(user.nidn || '');
    setEditJenisKelamin(user.jenisKelamin || '');
    setEditTempatLahir(user.tempatLahir || '');
    // Input date menuntut YYYY-MM-DD; nilai dari server bisa ISO lengkap.
    setEditTanggalLahir(
      user.tanggalLahir ? new Date(user.tanggalLahir).toISOString().slice(0, 10) : ''
    );
    setEditNik(user.nik || '');
    setEditAngkatan(user.angkatan || '');
    setEditStatusAkademik(user.statusAkademik || '');
    setEditAlamat(user.alamat || '');
    setEditAsalSekolah(user.asalSekolah || '');
    setEditNamaIbuKandung(user.namaIbuKandung || '');
    setEditGelarDepan(user.gelarDepan || '');
    setEditGelarBelakang(user.gelarBelakang || '');
    setEditNip(user.nip || '');
    setEditJabatanAkademik(user.jabatanAkademik || '');
    setEditBidangKeahlian(user.bidangKeahlian || '');
    setEditPendidikanTerakhir(user.pendidikanTerakhir || '');
    setEditSintaId(user.sintaId || '');
    setEditLinkSinta(user.linkSinta || '');
    setEditGoogleScholar(user.googleScholar || '');
    setEditOrcid(user.orcid || '');
    setEditScopusId(user.scopusId || '');
    setEditBiografi(user.biografi || '');
    setShowEditModal(true);
  };

  const handleUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingUser) return;

    if (editRoleIds.length === 0) {
      setNotify({
        isOpen: true,
        type: 'warning',
        title: 'Peran Wajib Dipilih',
        message: 'Pengguna harus memiliki minimal satu peran aktif.',
      });
      return;
    }

    try {
      setIsUpdating(true);
      const payload: Partial<UserProfile> & { password?: string; roleIds?: number[] } = {
        username: editUsername.trim(),
        nama: editNama.trim(),
        roleIds: editRoleIds,
        email: editEmail.trim() || undefined,
        noHp: editNoHp.trim() || undefined,
        prodi: editProdi.trim() || undefined,
        fakultas: editFakultas.trim() || undefined,
        nim: editNim.trim() || undefined,
        nidn: editNidn.trim() || undefined,
        jenisKelamin: editJenisKelamin || undefined,
        tempatLahir: editTempatLahir.trim() || undefined,
        tanggalLahir: editTanggalLahir || undefined,
        nik: editNik.trim() || undefined,
        angkatan: editAngkatan.trim() || undefined,
        statusAkademik: editStatusAkademik.trim() || undefined,
        alamat: editAlamat.trim() || undefined,
        asalSekolah: editAsalSekolah.trim() || undefined,
        namaIbuKandung: editNamaIbuKandung.trim() || undefined,
        gelarDepan: editGelarDepan.trim() || undefined,
        gelarBelakang: editGelarBelakang.trim() || undefined,
        nip: editNip.trim() || undefined,
        jabatanAkademik: editJabatanAkademik.trim() || undefined,
        bidangKeahlian: editBidangKeahlian.trim() || undefined,
        pendidikanTerakhir: editPendidikanTerakhir.trim() || undefined,
        sintaId: editSintaId.trim() || undefined,
        linkSinta: editLinkSinta.trim() || undefined,
        googleScholar: editGoogleScholar.trim() || undefined,
        orcid: editOrcid.trim() || undefined,
        scopusId: editScopusId.trim() || undefined,
        biografi: editBiografi.trim() || undefined,
        isActive: editIsActive,
      };

      if (editNewPassword.trim()) {
        payload.password = editNewPassword.trim();
      }

      const res = await updateAdminUser(editingUser.id, payload);
      if (res.data.status) {
        setShowEditModal(false);
        const usernameUpdated = editingUser.username;
        setEditingUser(null);
        setNotify({
          isOpen: true,
          type: 'success',
          title: 'Akun Berhasil Diperbarui',
          message: `Data akun ${usernameUpdated} berhasil disimpan dan diperbarui di sistem.`,
        });
        await reload();
      } else {
        setNotify({
          isOpen: true,
          type: 'error',
          title: 'Gagal Memperbarui Akun',
          message: res.data.message || 'Gagal memperbarui akun pengguna.',
        });
      }
    } catch (error: unknown) {
      const text =
        typeof error === 'object' && error !== null && 'response' in error
          ? String((error as { response?: { data?: { message?: string } } }).response?.data?.message ?? '')
          : '';
      setNotify({
        isOpen: true,
        type: 'error',
        title: 'Kesalahan Sistem',
        message: text || 'Gagal memperbarui data pengguna.',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleOpenDelete = (user: UserProfile) => {
    setDeletingUser(user);
    setShowDeleteModal(true);
  };

  const handleSyncSiakadDosen = async () => {
    setShowSyncConfirm(false);
    try {
      setIsSyncingSiakad(true);
      const res = await syncDosenFromSiakad();
      if (res.data.status) {
        setNotify({
          isOpen: true,
          type: 'success',
          title: 'Sinkronisasi SIAKAD Selesai',
          message: res.data.message || 'Sinkronisasi data dosen dari SIAKAD berhasil diselesaikan.',
        });
        await reload();
      } else {
        setNotify({
          isOpen: true,
          type: 'error',
          title: 'Gagal Sinkronisasi',
          message: res.data.message || 'Gagal menyinkronkan data dosen dari SIAKAD.',
        });
      }
    } catch (err: any) {
      setNotify({
        isOpen: true,
        type: 'error',
        title: 'Kesalahan Sinkronisasi',
        message: err.response?.data?.message || 'Terjadi kesalahan saat menyinkronkan data dosen.',
      });
    } finally {
      setIsSyncingSiakad(false);
    }
  };

  const handleOpenSyncMhs = async () => {
    setShowSyncMhsModal(true);
    if (siakadProdiOptions.length === 0) {
      try {
        const res = await fetchSiakadProdiList();
        if (res.data.status && res.data.data) {
          setSiakadProdiOptions(res.data.data);
        }
      } catch {
        // Fallback jika gagal ambil list
      }
    }
  };

  const handleExecuteSyncMhs = async () => {
    try {
      setIsSyncingMhs(true);
      const res = await syncMahasiswaFromSiakad({
        idJurusan: selectedMhsProdi || undefined,
        angkatan: selectedMhsAngkatan || undefined,
      });

      setShowSyncMhsModal(false);
      if (res.data.status) {
        setNotify({
          isOpen: true,
          type: 'success',
          title: 'Sinkronisasi Mahasiswa Berhasil',
          message: res.data.message || 'Data mahasiswa dari SIAKAD berhasil disinkronkan ke ONE UNUSU.',
        });
        await reload();
      } else {
        setNotify({
          isOpen: true,
          type: 'error',
          title: 'Gagal Sinkronisasi Mahasiswa',
          message: res.data.message || 'Gagal menyinkronkan data mahasiswa dari SIAKAD.',
        });
      }
    } catch (err: any) {
      setShowSyncMhsModal(false);
      setNotify({
        isOpen: true,
        type: 'error',
        title: 'Kesalahan Sinkronisasi',
        message: err.response?.data?.message || 'Terjadi kesalahan saat menyinkronkan data mahasiswa.',
      });
    } finally {
      setIsSyncingMhs(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingUser) return;

    try {
      setIsDeleting(true);
      const res = await deleteAdminUser(deletingUser.id);
      if (res.data.status) {
        setShowDeleteModal(false);
        const deletedUsername = deletingUser.username;
        setDeletingUser(null);
        setNotify({
          isOpen: true,
          type: 'success',
          title: 'Akun Dihapus',
          message: `Akun pengguna ${deletedUsername} berhasil dihapus permanen dari sistem.`,
        });
        await reload();
      } else {
        setNotify({
          isOpen: true,
          type: 'error',
          title: 'Gagal Menghapus Akun',
          message: res.data.message || 'Gagal menghapus akun pengguna.',
        });
      }
    } catch (error: unknown) {
      const text =
        typeof error === 'object' && error !== null && 'response' in error
          ? String((error as { response?: { data?: { message?: string } } }).response?.data?.message ?? '')
          : '';
      setNotify({
        isOpen: true,
        type: 'error',
        title: 'Kesalahan Sistem',
        message: text || 'Gagal menghapus akun pengguna.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AdminPanelTemplate
      user={currentUser}
      title="Manajemen Pengguna"
      description="Kelola akun civitas akademika, peran akses, dan status keaktifan identitas SSO."
      onRefresh={handleRefresh}
      refreshing={loading || rolesLoading}
      headerAction={
        <>
          <button
            onClick={() => setShowSyncConfirm(true)}
            disabled={isSyncingSiakad || isSyncingMhs}
            title="Tarik seluruh data Dosen dari SIAKAD UNUSU"
            className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-3 rounded-[8px] bg-white hover:bg-[#F0FDF4] border border-[#166534] text-[#166534] font-semibold text-sm shadow-sm transition disabled:opacity-60"
          >
            <ArrowPathIcon className={`w-3.5 h-3.5 ${isSyncingSiakad ? 'animate-spin' : ''}`} />
            <span>{isSyncingSiakad ? 'Menyinkronkan Dosen...' : 'Tarik Dosen SIAKAD'}</span>
          </button>
          <button
            onClick={handleOpenSyncMhs}
            disabled={isSyncingSiakad || isSyncingMhs}
            title="Tarik data Mahasiswa dari SIAKAD UNUSU berdasarkan Prodi & Angkatan"
            className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-3 rounded-[8px] bg-white hover:bg-[#F0FDF4] border border-[#166534] text-[#166534] font-semibold text-sm shadow-sm transition disabled:opacity-60"
          >
            <ArrowPathIcon className={`w-3.5 h-3.5 ${isSyncingMhs ? 'animate-spin' : ''}`} />
            <span>{isSyncingMhs ? 'Menyinkronkan Mhs...' : 'Tarik Mahasiswa SIAKAD'}</span>
          </button>
          <button
            onClick={openModal}
            className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-3 rounded-[8px] bg-[#166534] hover:bg-[#14532D] text-white font-semibold text-sm shadow-sm transition"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span>Tambah Akun Baru</span>
          </button>
        </>
      }
    >
      {/* Cards Statistik Interaktif */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div
          className={`min-w-0 p-5 rounded-[14px] border shadow-sm ${
            filterRole === 'ALL'
              ? 'bg-[#F0FDF4] border-[#166534] ring-1 ring-[#166534]'
              : 'bg-white border-[#D8E5DC]'
          }`}
        >
          <button
            type="button"
            onClick={() => handleCardClick('ALL')}
            aria-pressed={filterRole === 'ALL' && filterStatus === 'ALL'}
            className="w-full text-left flex items-center justify-between gap-3 rounded-[8px] focus:outline-none focus:ring-2 focus:ring-[#166534]"
          >
            <span className="min-w-0">
              <span className="block text-xs font-semibold text-[#64748B]">Total Pengguna</span>
              <span className="block mt-1 text-2xl font-bold text-[#1E293B]">{stats?.totalUsers ?? 0}</span>
              <span className="block text-[11px] text-[#64748B] mt-0.5">Semua akun terdaftar</span>
            </span>
            <span className="w-13 h-13 rounded-[14px] border border-[#BBF7D0] bg-[#DCFCE7] text-[#166534] flex items-center justify-center flex-shrink-0">
              <UsersIcon className="w-8 h-8" />
            </span>
          </button>
          <div role="group" aria-label="Status akun" className="mt-3 flex flex-wrap gap-2">
            {([
              { key: 'AKTIF' as StatusFilter, label: 'Aktif', count: users.filter((user) => user.isActive).length },
              { key: 'NONAKTIF' as StatusFilter, label: 'Nonaktif', count: users.filter((user) => !user.isActive).length },
            ]).map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => updateStatusFilter(item.key, 'ALL')}
                aria-label={`Semua pengguna ${item.label}: ${item.count}`}
                aria-pressed={filterRole === 'ALL' && filterStatus === item.key}
                className={`min-h-[44px] px-4 py-3 text-sm font-semibold rounded-[8px] border focus:outline-none focus:ring-2 focus:ring-[#166534] ${
                  filterRole === 'ALL' && filterStatus === item.key
                    ? 'bg-[#166534] border-[#166534] text-white'
                    : 'bg-white border-[#D8E5DC] text-[#475569] hover:bg-[#F0FDF4]'
                }`}
              >
                {item.label} <span className="tabular-nums">{item.count}</span>
              </button>
            ))}
          </div>
        </div>

        <div
          className={`min-w-0 p-5 rounded-[14px] border shadow-sm ${
            filterRole === 'MAHASISWA'
              ? 'bg-[#F0FDF4] border-[#166534] shadow-sm ring-1 ring-[#166534]'
              : 'bg-white border-[#D8E5DC] hover:border-[#86EFAC] hover:bg-[#F9FDFB] shadow-sm'
          }`}
        >
          <button type="button" onClick={() => handleCardClick('MAHASISWA')} aria-pressed={filterRole === 'MAHASISWA' && filterStatus === 'ALL'} className="w-full text-left flex items-center justify-between gap-3 rounded-[8px] focus:outline-none focus:ring-2 focus:ring-[#166534]">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-[#64748B]">Mahasiswa</span>
              {filterRole === 'MAHASISWA' && (
                <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#166534] text-white">
                  Terpilih
                </span>
              )}
            </div>
            <p className="mt-1 text-2xl font-bold text-[#1E293B]">{stats?.totalMahasiswa ?? 0}</p>
            <p className="text-[11px] text-[#64748B] mt-0.5">Identitas NIM</p>
          </div>
          <div
            className={`w-13 h-13 rounded-[14px] border flex items-center justify-center flex-shrink-0 transition-colors ${
              filterRole === 'MAHASISWA'
                ? 'bg-[#166534] border-[#166534] text-white'
                : 'bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]'
            }`}
          >
            <AcademicCapIcon className="w-8 h-8" />
          </div>
          </button>
          <div role="group" aria-label="Status mahasiswa" className="mt-3 flex flex-wrap gap-2">
            {(['AKTIF', 'NONAKTIF'] as const).map((status) => {
              const label = status === 'AKTIF' ? 'Aktif' : 'Nonaktif';
              const count = users.filter((user) => user.role === 'MAHASISWA' && user.isActive === (status === 'AKTIF')).length;
              const selected = filterRole === 'MAHASISWA' && filterStatus === status;
              return (
                <button key={status} type="button" onClick={() => updateStatusFilter(status, 'MAHASISWA')}
                  aria-label={`Mahasiswa ${label}: ${count}`} aria-pressed={selected}
                  className={`min-h-[44px] px-4 py-3 text-sm font-semibold rounded-[8px] border focus:outline-none focus:ring-2 focus:ring-[#166534] ${selected ? 'bg-[#166534] border-[#166534] text-white' : 'bg-white border-[#D8E5DC] text-[#475569] hover:bg-[#F0FDF4]'}`}>
                  {label} <span className="tabular-nums">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div
          className={`min-w-0 p-5 rounded-[14px] border shadow-sm ${
            filterRole === 'DOSEN'
              ? 'bg-[#FEFCE8] border-[#B45309] shadow-sm ring-1 ring-[#B45309]'
              : 'bg-white border-[#D8E5DC] hover:border-[#FDE68A] hover:bg-[#FFFDF5] shadow-sm'
          }`}
        >
          <button type="button" onClick={() => handleCardClick('DOSEN')} aria-pressed={filterRole === 'DOSEN' && filterStatus === 'ALL'} className="w-full text-left flex items-center justify-between gap-3 rounded-[8px] focus:outline-none focus:ring-2 focus:ring-[#166534]">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-[#64748B]">Dosen</span>
              {filterRole === 'DOSEN' && (
                <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#B45309] text-white">
                  Terpilih
                </span>
              )}
            </div>
            <p className="mt-1 text-2xl font-bold text-[#1E293B]">{stats?.totalDosen ?? 0}</p>
            <p className="text-[11px] text-[#64748B] mt-0.5">Identitas NIDN</p>
          </div>
          <div
            className={`w-13 h-13 rounded-[14px] border flex items-center justify-center flex-shrink-0 transition-colors ${
              filterRole === 'DOSEN'
                ? 'bg-[#B45309] border-[#B45309] text-white'
                : 'bg-[#FEF3C7] border-[#FDE68A] text-[#B45309]'
            }`}
          >
            <BriefcaseIcon className="w-8 h-8" />
          </div>
          </button>
          <div role="group" aria-label="Status dosen" className="mt-3 flex flex-wrap gap-2">
            {(['AKTIF', 'NONAKTIF'] as const).map((status) => {
              const label = status === 'AKTIF' ? 'Aktif' : 'Nonaktif';
              const count = users.filter((user) => user.role === 'DOSEN' && user.isActive === (status === 'AKTIF')).length;
              const selected = filterRole === 'DOSEN' && filterStatus === status;
              return (
                <button key={status} type="button" onClick={() => updateStatusFilter(status, 'DOSEN')}
                  aria-label={`Dosen ${label}: ${count}`} aria-pressed={selected}
                  className={`min-h-[44px] px-4 py-3 text-sm font-semibold rounded-[8px] border focus:outline-none focus:ring-2 focus:ring-[#166534] ${selected ? 'bg-[#166534] border-[#166534] text-white' : 'bg-white border-[#D8E5DC] text-[#475569] hover:bg-[#F0FDF4]'}`}>
                  {label} <span className="tabular-nums">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div
          className={`min-w-0 p-5 rounded-[14px] border shadow-sm ${
            filterRole === 'SUPERADMIN'
              ? 'bg-[#EFF6FF] border-[#1D4ED8] shadow-sm ring-1 ring-[#1D4ED8]'
              : 'bg-white border-[#D8E5DC] hover:border-[#BFDBFE] hover:bg-[#F8FAFC] shadow-sm'
          }`}
        >
          <button type="button" onClick={() => handleCardClick('SUPERADMIN')} aria-pressed={filterRole === 'SUPERADMIN' && filterStatus === 'ALL'} className="w-full text-left flex items-center justify-between gap-3 rounded-[8px] focus:outline-none focus:ring-2 focus:ring-[#166534]">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-[#64748B]">Superadmin</span>
              {filterRole === 'SUPERADMIN' && (
                <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#1D4ED8] text-white">
                  Terpilih
                </span>
              )}
            </div>
            <p className="mt-1 text-2xl font-bold text-[#1E293B]">
              {users.filter((user) => user.role === 'SUPERADMIN').length}
            </p>
            <p className="text-[11px] text-[#64748B] mt-0.5">Akses tata kelola</p>
          </div>
          <div
            className={`w-13 h-13 rounded-[14px] border flex items-center justify-center flex-shrink-0 transition-colors ${
              filterRole === 'SUPERADMIN'
                ? 'bg-[#1D4ED8] border-[#1D4ED8] text-white'
                : 'bg-[#EFF6FF] border-[#BFDBFE] text-[#1D4ED8]'
            }`}
          >
            <ShieldCheckIcon className="w-8 h-8" />
          </div>
          </button>
          <div role="group" aria-label="Status superadmin" className="mt-3 flex flex-wrap gap-2">
            {(['AKTIF', 'NONAKTIF'] as const).map((status) => {
              const label = status === 'AKTIF' ? 'Aktif' : 'Nonaktif';
              const count = users.filter((user) => user.role === 'SUPERADMIN' && user.isActive === (status === 'AKTIF')).length;
              const selected = filterRole === 'SUPERADMIN' && filterStatus === status;
              return (
                <button key={status} type="button" onClick={() => updateStatusFilter(status, 'SUPERADMIN')}
                  aria-label={`Superadmin ${label}: ${count}`} aria-pressed={selected}
                  className={`min-h-[44px] px-4 py-3 text-sm font-semibold rounded-[8px] border focus:outline-none focus:ring-2 focus:ring-[#166534] ${selected ? 'bg-[#166534] border-[#166534] text-white' : 'bg-white border-[#D8E5DC] text-[#475569] hover:bg-[#F0FDF4]'}`}>
                  {label} <span className="tabular-nums">{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <section aria-labelledby="filter-pengguna-heading" className="bg-white rounded-[16px] border border-[#D8E5DC] p-4 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="filter-pengguna-heading" className="text-base font-bold text-[#1E293B]">Filter Pengguna</h2>
          {hasActiveFilters && (
            <button type="button" onClick={resetFilters} className="min-h-[44px] px-4 py-3 text-sm font-semibold text-[#166534] hover:bg-[#F0FDF4] rounded-[8px] focus:outline-none focus:ring-2 focus:ring-[#166534]">
              Reset Semua Filter
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="min-w-0 sm:col-span-3">
            <label htmlFor="pengguna-search" className="block mb-2 text-sm font-semibold text-[#475569]">Pencarian</label>
            <div className="relative">
            <MagnifyingGlassIcon
              className="w-5 h-5 text-[#94A3B8] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="pengguna-search"
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari NIM, NIDN, nama, atau prodi..."
              aria-label="Cari pengguna berdasarkan NIM, NIDN, nama, atau prodi"
              className="min-w-0 w-full pl-12 pr-4 py-3 text-sm bg-white border border-[#D8E5DC] rounded-[8px] text-[#1E293B] placeholder:text-[#94A3B8] focus:outline-none focus:ring-1 focus:ring-[#166534] focus:border-[#166534]"
            />
            </div>
          </div>

          <div className="min-w-0">
            <label htmlFor="pengguna-peran" className="block mb-2 text-sm font-semibold text-[#475569]">Peran</label>
            <select
              id="pengguna-peran"
              value={filterRole}
              onChange={(event) => updateRoleFilter(event.target.value as 'ALL' | UserRole)}
              className="min-w-0 w-full px-4 py-3 text-sm bg-white border border-[#D8E5DC] rounded-[8px] text-[#475569] focus:outline-none focus:ring-1 focus:ring-[#166534]"
            >
              <option value="ALL">Semua Peran</option>
              {ROLE_OPTIONS.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABEL[role]}
                </option>
              ))}
            </select>

          </div>

          <div className="min-w-0">
            <label htmlFor="pengguna-fakultas" className="block mb-2 text-sm font-semibold text-[#475569]">Fakultas</label>
            <select
              id="pengguna-fakultas"
              value={filterFakultas}
              onChange={(event) => updateFakultasFilter(event.target.value)}
              aria-label="Saring menurut fakultas"
              className="min-w-0 w-full px-4 py-3 text-sm bg-white border border-[#D8E5DC] rounded-[8px] text-[#475569] focus:outline-none focus:ring-1 focus:ring-[#166534]"
            >
              <option value="ALL">Semua Fakultas</option>
              {opsiFakultas.map((opsi) => (
                <option key={opsi.nilai} value={opsi.nilai}>
                  {labelWilayah(opsi.nilai)} ({opsi.jumlah})
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-0">
            <label htmlFor="pengguna-prodi" className="block mb-2 text-sm font-semibold text-[#475569]">Prodi</label>
            <select
              id="pengguna-prodi"
              value={filterProdi}
              onChange={(event) => updateProdiFilter(event.target.value)}
              aria-label="Saring menurut program studi"
              className="min-w-0 w-full px-4 py-3 text-sm bg-white border border-[#D8E5DC] rounded-[8px] text-[#475569] focus:outline-none focus:ring-1 focus:ring-[#166534]"
            >
              <option value="ALL">Semua Prodi</option>
              {opsiProdi.map((opsi) => (
                <option key={opsi.nilai} value={opsi.nilai}>
                  {labelWilayah(opsi.nilai)} ({opsi.jumlah})
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <div className="bg-white rounded-[14px] border border-[#D8E5DC] shadow-sm overflow-hidden">
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-x-4 gap-y-2 px-4 py-3 border-b border-[#D8E5DC] text-sm text-[#475569] break-words">
            <span className="font-semibold">Filter aktif:</span>
            {filterRole !== 'ALL' && (
              <span>Peran: {ROLE_LABEL[filterRole as UserRole] ?? filterRole}</span>
            )}
            {filterStatus !== 'ALL' && (
              <span>Status: {filterStatus === 'AKTIF' ? 'Aktif' : 'Nonaktif'}</span>
            )}
            {filterFakultas !== 'ALL' && (
              <span>Fakultas: {labelWilayah(filterFakultas)}</span>
            )}
            {filterProdi !== 'ALL' && (
              <span>Prodi: {labelWilayah(filterProdi)}</span>
            )}
            {search.trim() !== '' && <span>Pencarian: {search.trim()}</span>}
          </div>
        )}
        <DataTable<UserProfile>
          data={filteredUsers}
          kunciBaris={(user) => user.id}
          lebarMinimal="1040px"
          labelRingkasan={(dari, sampai, total) =>
            `Menampilkan ${dari}-${sampai} dari ${total} akun`
          }
          kosong={
            <>
              <p className="text-xs font-semibold text-[#475569]">
                Tidak ada akun yang sesuai dengan filter
                {filterRole !== 'ALL' ? ` "${ROLE_LABEL[filterRole as UserRole] ?? filterRole}"` : ''}
                {filterStatus !== 'ALL'
                  ? ` dengan status ${filterStatus === 'AKTIF' ? 'Aktif' : 'Nonaktif'}`
                  : ''}
                {filterFakultas !== 'ALL' ? ` di ${labelWilayah(filterFakultas)}` : ''}
                {filterProdi !== 'ALL' ? ` prodi ${labelWilayah(filterProdi)}` : ''}
                {search.trim() ? ` dan kata kunci "${search.trim()}"` : ''}.
              </p>
            </>
          }
          kolom={[
            {
              key: 'akun',
              judul: 'Pengguna (NIM / NIDN)',
              kelas: 'font-mono font-semibold text-[#1E293B]',
              sel: (user) => user.nim || user.nidn || user.username,
            },
            {
              key: 'nama',
              judul: 'Nama Lengkap',
              kelas: 'font-semibold text-[#1E293B]',
              sel: (user) => (
                <div className="flex items-center gap-2.5 min-w-[180px]">
                  {/* Foto profil di sebelah kiri nama. Bila belum diunggah,
                      ditampilkan inisial supaya kolom tidak tampak kosong. */}
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={`Foto ${user.nama}`}
                      loading="lazy"
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-[#D8E5DC] bg-[#F0FDF4]"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="w-8 h-8 rounded-full flex-shrink-0 bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0] flex items-center justify-center text-[11px] font-bold uppercase"
                    >
                      {inisialNama(user.nama)}
                    </span>
                  )}
                  <span className="truncate">{user.nama}</span>
                </div>
              ),
            },
            {
              key: 'peran',
              judul: 'Peran',
              sel: (user) => (
                <div className="flex flex-wrap gap-1 max-w-[220px]">
                  {user.roles && user.roles.length > 0 ? (
                    user.roles.map((r) => (
                      <span
                        key={r.id}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${badgeForRole(r.code)}`}
                      >
                        {r.name || r.code}
                      </span>
                    ))
                  ) : (
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${badgeForRole(user.role)}`}
                    >
                      {ROLE_LABEL[user.role] ?? user.role}
                    </span>
                  )}
                </div>
              ),
            },
            {
              key: 'fakultas',
              judul: 'Fakultas',
              kelas: 'text-[#475569]',
              /*
               * Nilai kosong atau "-" ditampilkan sebagai "-" biasa, bukan chip,
               * supaya tinggi baris tidak berubah dan kolom tetap rata.
               */
              sel: (user) => (user.fakultas && user.fakultas.trim() !== '-' ? user.fakultas : '-'),
            },
            {
              key: 'prodi',
              judul: 'Program Studi',
              kelas: 'text-[#475569]',
              sel: (user) => user.prodi || '-',
            },
            {
              key: 'kontak',
              judul: 'Kontak',
              kelas: 'text-[#475569]',
              sel: (user) => (
                <>
                  <p className="text-[11px] font-mono">{user.email || '-'}</p>
                  <p className="text-[10px] text-[#94A3B8] font-mono">{user.noHp || '-'}</p>
                </>
              ),
            },
            {
              key: 'status',
              judul: 'Status',
              sel: (user) => (
                <span
                  className={`inline-flex items-center gap-1 font-semibold text-[11px] ${
                    user.isActive ? 'text-[#166534]' : 'text-[#B91C1C]'
                  }`}
                >
                  <ShieldCheckIcon className="w-3.5 h-3.5" />
                  <span>{user.isActive ? 'Aktif' : 'Nonaktif'}</span>
                </span>
              ),
            },
            {
              key: 'aksi',
              judul: 'Aksi',
              rataTengah: true,
              sel: (user) => (
                <div className="inline-flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(user)}
                    title="Ubah Pengguna"
                    aria-label={`Ubah Pengguna ${user.nama}`}
                    className="p-1.5 rounded-lg text-[#166534] bg-[#F0FDF4] hover:bg-[#DCFCE7] border border-[#BBF7D0] transition"
                  >
                    <PencilSquareIcon className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenDelete(user)}
                    title="Hapus Pengguna"
                    aria-label={`Hapus Pengguna ${user.nama}`}
                    disabled={user.username.toLowerCase() === 'admin' || user.id === currentUser?.id}
                    className="p-1.5 rounded-lg text-[#B91C1C] bg-[#FEF2F2] hover:bg-[#FEE2E2] border border-[#FECACA] disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              ),
            },
          ]}
        />
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-[#1E293B]/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-[#D8E5DC] my-8">
            <div className="flex justify-between items-start pb-3 border-b border-[#E8EFEA]">
              <div>
                <h3 className="font-bold text-[#1E293B] text-sm">Tambah Akun Pengguna</h3>
                <p className="text-[11px] text-[#64748B]">Buat akun akses SSO untuk civitas UNUSU.</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-md text-[#94A3B8] hover:text-[#475569] hover:bg-[#F1F5F2]"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#475569] mb-1">
                  Peran (Role) <span className="text-[#B91C1C]">*</span> (Bisa Multi-Role)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 bg-[#F9FDFB] border border-[#D8E5DC] rounded-lg max-h-40 overflow-y-auto">
                  {roles.map((role) => {
                    const isChecked = newRoleIds.includes(role.id);
                    return (
                      <label
                        key={role.id}
                        className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition text-xs ${
                          isChecked
                            ? 'bg-[#F0FDF4] border-[#86EFAC] text-[#166534] font-semibold'
                            : 'bg-white border-[#E2E8F0] text-[#475569] hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleNewRole(role.id)}
                          className="w-3.5 h-3.5 rounded text-[#166534] accent-[#166534]"
                        />
                        <span className="truncate">{role.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#475569] mb-1">
                  {(() => {
                    const selectedRoleCodes = roles
                      .filter((r) => newRoleIds.includes(r.id))
                      .map((r) => r.code);
                    if (selectedRoleCodes.includes('MAHASISWA')) return 'Nomor Induk Mahasiswa (NIM)';
                    if (selectedRoleCodes.includes('DOSEN')) return 'NIDN / NUP';
                    return 'Username';
                  })()}
                </label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(event) => setNewUsername(event.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#D8E5DC] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#166534]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#475569] mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={newNama}
                  onChange={(event) => setNewNama(event.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#D8E5DC] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#166534]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#475569] mb-1">Email</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(event) => setNewEmail(event.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#D8E5DC] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#166534]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#475569] mb-1">Nomor WhatsApp</label>
                  <input
                    type="text"
                    value={newNoHp}
                    onChange={(event) => setNewNoHp(event.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#D8E5DC] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#166534]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#475569] mb-1">Fakultas</label>
                  {academicHierarchy.length > 0 ? (
                    <select
                      value={newFakultas}
                      onChange={(event) => {
                        const nextFakultas = event.target.value;
                        setNewFakultas(nextFakultas);
                        // Reset prodi jika tidak sesuai fakultas terpilih
                        if (nextFakultas) {
                          const targetFaculty = academicHierarchy.find((f) => f.name === nextFakultas);
                          const isProdiValid = targetFaculty?.studyPrograms.some((p) => p.name === newProdi);
                          if (!isProdiValid) setNewProdi('');
                        }
                      }}
                      className="w-full px-3 py-2 bg-white border border-[#D8E5DC] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#166534]"
                    >
                      <option value="">-- Pilih Fakultas (Opsional) --</option>
                      {academicHierarchy.map((fac) => (
                        <option key={fac.id} value={fac.name}>
                          {fac.name} {fac.code ? `(${fac.code})` : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="Contoh: Fakultas Ilmu Komputer"
                      value={newFakultas}
                      onChange={(event) => setNewFakultas(event.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#D8E5DC] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#166534]"
                    />
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-[#475569] mb-1">Program Studi</label>
                  {academicHierarchy.length > 0 ? (
                    <select
                      value={newProdi}
                      onChange={(event) => {
                        const selectedProdiName = event.target.value;
                        setNewProdi(selectedProdiName);
                        // Auto-select fakultas jika belum dipilih
                        if (selectedProdiName && !newFakultas) {
                          const parentFac = academicHierarchy.find((f) =>
                            f.studyPrograms.some((p) => p.name === selectedProdiName)
                          );
                          if (parentFac) setNewFakultas(parentFac.name);
                        }
                      }}
                      className="w-full px-3 py-2 bg-white border border-[#D8E5DC] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#166534]"
                    >
                      <option value="">-- Pilih Program Studi (Opsional) --</option>
                      {availableNewProdis.map((p) => (
                        <option key={p.id} value={p.name}>
                          {p.degree ? `${p.degree} ` : ''}{p.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="Contoh: Teknik Informatika"
                      value={newProdi}
                      onChange={(event) => setNewProdi(event.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#D8E5DC] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#166534]"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#475569] mb-1">Kata Sandi Awal</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#D8E5DC] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#166534]"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-[#E8EFEA]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3.5 py-2 rounded-lg text-[#475569] bg-[#F1F5F2] hover:bg-[#E8EFEA] font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-[8px] text-white bg-[#166534] hover:bg-[#14532D] font-semibold text-xs shadow-sm disabled:opacity-50 transition"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Tambah Akun'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Pengguna */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 z-50 bg-[#1E293B]/60 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 space-y-4 shadow-2xl border border-[#D8E5DC] my-8">
            <div className="flex justify-between items-start pb-3 border-b border-[#E8EFEA]">
              <div>
                <h3 className="font-bold text-[#1E293B] text-sm">Ubah Akun Pengguna</h3>
                <p className="text-[11px] text-[#64748B]">
                  Seluruh kolom dapat disunting: identitas, peran, data pribadi, akademik, ketenagaan, dan tautan akademik.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingUser(null);
                }}
                className="p-1 rounded-md text-[#94A3B8] hover:text-[#475569] hover:bg-[#F1F5F2]"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#475569] mb-1" htmlFor="edit-username">
                  Username / NIM / NIDN
                </label>
                <input
                  id="edit-username"
                  type="text"
                  required
                  maxLength={60}
                  value={editUsername}
                  onChange={(event) => setEditUsername(event.target.value)}
                  disabled={editingUser.id === currentUser?.id}
                  className={`w-full px-3 py-2 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-[#166534] ${
                    editingUser.id === currentUser?.id
                      ? 'bg-[#F1F5F2] border border-[#D8E5DC] text-[#64748B] cursor-not-allowed'
                      : 'bg-white border border-[#D8E5DC] text-[#1E293B]'
                  }`}
                />
                <p className="text-[11px] text-[#94A3B8] mt-1">
                  {editingUser.id === currentUser?.id
                    ? 'Username akun sendiri tidak dapat diubah di sini — minta admin lain melakukannya.'
                    : 'Dipakai untuk login. Tidak boleh mengandung spasi dan harus unik.'}
                </p>
              </div>

              <div>
                <label className="block font-semibold text-[#475569] mb-1">
                  Peran (Role) <span className="text-[#B91C1C]">*</span> (Bisa Multi-Role)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 bg-[#F9FDFB] border border-[#D8E5DC] rounded-lg max-h-40 overflow-y-auto">
                  {roles.map((role) => {
                    const isChecked = editRoleIds.includes(role.id);
                    return (
                      <label
                        key={role.id}
                        className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition text-xs ${
                          isChecked
                            ? 'bg-[#F0FDF4] border-[#86EFAC] text-[#166534] font-semibold'
                            : 'bg-white border-[#E2E8F0] text-[#475569] hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleEditRole(role.id)}
                          className="w-3.5 h-3.5 rounded text-[#166534] accent-[#166534]"
                        />
                        <span className="truncate">{role.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#475569] mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={editNama}
                  onChange={(event) => setEditNama(event.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#D8E5DC] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#166534]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#475569] mb-1">Email</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(event) => setEditEmail(event.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#D8E5DC] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#166534]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#475569] mb-1">Nomor WhatsApp</label>
                  <input
                    type="text"
                    value={editNoHp}
                    onChange={(event) => setEditNoHp(event.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#D8E5DC] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#166534]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#475569] mb-1">Fakultas</label>
                  {academicHierarchy.length > 0 ? (
                    <select
                      value={editFakultas}
                      onChange={(event) => {
                        const nextFakultas = event.target.value;
                        setEditFakultas(nextFakultas);
                        if (nextFakultas) {
                          const targetFaculty = academicHierarchy.find((f) => f.name === nextFakultas);
                          const isProdiValid = targetFaculty?.studyPrograms.some((p) => p.name === editProdi);
                          if (!isProdiValid) setEditProdi('');
                        }
                      }}
                      className="w-full px-3 py-2 bg-white border border-[#D8E5DC] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#166534]"
                    >
                      <option value="">-- Pilih Fakultas (Opsional) --</option>
                      {academicHierarchy.map((fac) => (
                        <option key={fac.id} value={fac.name}>
                          {fac.name} {fac.code ? `(${fac.code})` : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="Contoh: Fakultas Ilmu Komputer"
                      value={editFakultas}
                      onChange={(event) => setEditFakultas(event.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#D8E5DC] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#166534]"
                    />
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-[#475569] mb-1">Program Studi</label>
                  {academicHierarchy.length > 0 ? (
                    <select
                      value={editProdi}
                      onChange={(event) => {
                        const selectedProdiName = event.target.value;
                        setEditProdi(selectedProdiName);
                        if (selectedProdiName && !editFakultas) {
                          const parentFac = academicHierarchy.find((f) =>
                            f.studyPrograms.some((p) => p.name === selectedProdiName)
                          );
                          if (parentFac) setEditFakultas(parentFac.name);
                        }
                      }}
                      className="w-full px-3 py-2 bg-white border border-[#D8E5DC] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#166534]"
                    >
                      <option value="">-- Pilih Program Studi (Opsional) --</option>
                      {availableEditProdis.map((p) => (
                        <option key={p.id} value={p.name}>
                          {p.degree ? `${p.degree} ` : ''}{p.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="Contoh: Teknik Informatika"
                      value={editProdi}
                      onChange={(event) => setEditProdi(event.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#D8E5DC] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#166534]"
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#475569] mb-1" htmlFor="edit-nim">
                    NIM
                  </label>
                  <input
                    id="edit-nim"
                    type="text"
                    maxLength={40}
                    value={editNim}
                    onChange={(event) => setEditNim(event.target.value)}
                    placeholder="Nomor Induk Mahasiswa"
                    className="w-full px-3 py-2 bg-white border border-[#D8E5DC] rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-[#166534]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#475569] mb-1" htmlFor="edit-nidn">
                    NIDN / NUP
                  </label>
                  <input
                    id="edit-nidn"
                    type="text"
                    maxLength={40}
                    value={editNidn}
                    onChange={(event) => setEditNidn(event.target.value)}
                    placeholder="Nomor Induk Dosen Nasional"
                    className="w-full px-3 py-2 bg-white border border-[#D8E5DC] rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-[#166534]"
                  />
                </div>
              </div>

              {/* --- Data pribadi --- */}
              <div className="pt-2 border-t border-[#E8EFEA]">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#9BB5A3] mb-2">
                  Data Pribadi
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[#475569] mb-1" htmlFor="edit-jk">
                      Jenis Kelamin
                    </label>
                    <select
                      id="edit-jk"
                      value={editJenisKelamin}
                      onChange={(event) => setEditJenisKelamin(event.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#D8E5DC] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#166534]"
                    >
                      <option value="">-- Belum diisi --</option>
                      <option value="L">Laki-laki</option>
                      <option value="P">Perempuan</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-[#475569] mb-1" htmlFor="edit-nik">
                      NIK
                    </label>
                    <input
                      id="edit-nik"
                      type="text"
                      maxLength={32}
                      value={editNik}
                      onChange={(event) => setEditNik(event.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#D8E5DC] rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-[#166534]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#475569] mb-1" htmlFor="edit-tempat-lahir">
                      Tempat Lahir
                    </label>
                    <input
                      id="edit-tempat-lahir"
                      type="text"
                      maxLength={100}
                      value={editTempatLahir}
                      onChange={(event) => setEditTempatLahir(event.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#D8E5DC] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#166534]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#475569] mb-1" htmlFor="edit-tanggal-lahir">
                      Tanggal Lahir
                    </label>
                    <input
                      id="edit-tanggal-lahir"
                      type="date"
                      value={editTanggalLahir}
                      onChange={(event) => setEditTanggalLahir(event.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#D8E5DC] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#166534]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#475569] mb-1" htmlFor="edit-ibu">
                      Nama Ibu Kandung
                    </label>
                    <input
                      id="edit-ibu"
                      type="text"
                      maxLength={150}
                      value={editNamaIbuKandung}
                      onChange={(event) => setEditNamaIbuKandung(event.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#D8E5DC] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#166534]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#475569] mb-1" htmlFor="edit-asal-sekolah">
                      Asal Sekolah
                    </label>
                    <input
                      id="edit-asal-sekolah"
                      type="text"
                      maxLength={200}
                      value={editAsalSekolah}
                      onChange={(event) => setEditAsalSekolah(event.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#D8E5DC] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#166534]"
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block font-semibold text-[#475569] mb-1" htmlFor="edit-alamat">
                    Alamat
                  </label>
                  <textarea
                    id="edit-alamat"
                    rows={2}
                    maxLength={500}
                    value={editAlamat}
                    onChange={(event) => setEditAlamat(event.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#D8E5DC] rounded-lg resize-y focus:outline-none focus:ring-1 focus:ring-[#166534]"
                  />
                </div>
              </div>

              {/* --- Data akademik --- */}
              <div className="pt-2 border-t border-[#E8EFEA]">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#9BB5A3] mb-2">
                  Data Akademik
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[#475569] mb-1" htmlFor="edit-angkatan">
                      Angkatan
                    </label>
                    <input
                      id="edit-angkatan"
                      type="text"
                      maxLength={10}
                      value={editAngkatan}
                      onChange={(event) => setEditAngkatan(event.target.value)}
                      placeholder="Contoh: 2024"
                      className="w-full px-3 py-2 bg-white border border-[#D8E5DC] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#166534]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#475569] mb-1" htmlFor="edit-status-akademik">
                      Status Akademik
                    </label>
                    <input
                      id="edit-status-akademik"
                      type="text"
                      maxLength={50}
                      value={editStatusAkademik}
                      onChange={(event) => setEditStatusAkademik(event.target.value)}
                      placeholder="Aktif / Cuti / Lulus"
                      className="w-full px-3 py-2 bg-white border border-[#D8E5DC] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#166534]"
                    />
                  </div>
                </div>
              </div>

              {/* --- Data ketenagaan dosen --- */}
              <div className="pt-2 border-t border-[#E8EFEA]">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#9BB5A3] mb-2">
                  Ketenagaan
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[#475569] mb-1" htmlFor="edit-gelar-depan">
                      Gelar Depan
                    </label>
                    <input
                      id="edit-gelar-depan"
                      type="text"
                      maxLength={50}
                      value={editGelarDepan}
                      onChange={(event) => setEditGelarDepan(event.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#D8E5DC] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#166534]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#475569] mb-1" htmlFor="edit-gelar-belakang">
                      Gelar Belakang
                    </label>
                    <input
                      id="edit-gelar-belakang"
                      type="text"
                      maxLength={80}
                      value={editGelarBelakang}
                      onChange={(event) => setEditGelarBelakang(event.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#D8E5DC] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#166534]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#475569] mb-1" htmlFor="edit-nip">
                      NIP
                    </label>
                    <input
                      id="edit-nip"
                      type="text"
                      maxLength={40}
                      value={editNip}
                      onChange={(event) => setEditNip(event.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#D8E5DC] rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-[#166534]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#475569] mb-1" htmlFor="edit-jabatan">
                      Jabatan Akademik
                    </label>
                    <input
                      id="edit-jabatan"
                      type="text"
                      maxLength={100}
                      value={editJabatanAkademik}
                      onChange={(event) => setEditJabatanAkademik(event.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#D8E5DC] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#166534]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#475569] mb-1" htmlFor="edit-bidang">
                      Bidang Keahlian
                    </label>
                    <input
                      id="edit-bidang"
                      type="text"
                      maxLength={200}
                      value={editBidangKeahlian}
                      onChange={(event) => setEditBidangKeahlian(event.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#D8E5DC] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#166534]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#475569] mb-1" htmlFor="edit-pendidikan">
                      Pendidikan Terakhir
                    </label>
                    <input
                      id="edit-pendidikan"
                      type="text"
                      maxLength={100}
                      value={editPendidikanTerakhir}
                      onChange={(event) => setEditPendidikanTerakhir(event.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#D8E5DC] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#166534]"
                    />
                  </div>
                </div>
              </div>

              {/* --- Tautan akademik --- */}
              <div className="pt-2 border-t border-[#E8EFEA]">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#9BB5A3] mb-2">
                  Tautan Akademik
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[#475569] mb-1" htmlFor="edit-sinta">
                      SINTA ID
                    </label>
                    <input
                      id="edit-sinta"
                      type="text"
                      maxLength={60}
                      value={editSintaId}
                      onChange={(event) => setEditSintaId(event.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#D8E5DC] rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-[#166534]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#475569] mb-1" htmlFor="edit-link-sinta">
                      Tautan SINTA
                    </label>
                    <input
                      id="edit-link-sinta"
                      type="url"
                      maxLength={255}
                      value={editLinkSinta}
                      onChange={(event) => setEditLinkSinta(event.target.value)}
                      placeholder="https://sinta.kemdikbud.go.id/..."
                      className="w-full px-3 py-2 bg-white border border-[#D8E5DC] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#166534]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#475569] mb-1" htmlFor="edit-scholar">
                      Google Scholar
                    </label>
                    <input
                      id="edit-scholar"
                      type="url"
                      maxLength={255}
                      value={editGoogleScholar}
                      onChange={(event) => setEditGoogleScholar(event.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#D8E5DC] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#166534]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#475569] mb-1" htmlFor="edit-orcid">
                      ORCID
                    </label>
                    <input
                      id="edit-orcid"
                      type="text"
                      maxLength={60}
                      value={editOrcid}
                      onChange={(event) => setEditOrcid(event.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#D8E5DC] rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-[#166534]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#475569] mb-1" htmlFor="edit-scopus">
                      Scopus ID
                    </label>
                    <input
                      id="edit-scopus"
                      type="text"
                      maxLength={60}
                      value={editScopusId}
                      onChange={(event) => setEditScopusId(event.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#D8E5DC] rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-[#166534]"
                    />
                  </div>
                </div>
                {/* Biografi hanya milik peran dosen, sama seperti di halaman profil. */}
                {editRoleIds.some((id) => roles.some((r) => r.id === id && r.code === 'DOSEN')) && (
                  <div className="mt-3">
                    <label className="block font-semibold text-[#475569] mb-1" htmlFor="edit-biografi">
                      Biografi
                    </label>
                    <BiodataEditor
                      id="edit-biografi"
                      nilai={editBiografi}
                      onUbah={setEditBiografi}
                      placeholder="Latar belakang pendidikan, mata kuliah yang diampu, atau pengalaman profesional..."
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-[#475569] mb-1">Status Keaktifan</label>
                <div className="flex items-center gap-4 pt-1">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="editStatus"
                      checked={editIsActive}
                      onChange={() => setEditIsActive(true)}
                      className="text-[#166534] focus:ring-[#166534]"
                    />
                    <span className="text-xs font-semibold text-[#166534]">Aktif</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="editStatus"
                      checked={!editIsActive}
                      onChange={() => setEditIsActive(false)}
                      className="text-[#B91C1C] focus:ring-[#B91C1C]"
                    />
                    <span className="text-xs font-semibold text-[#B91C1C]">Nonaktif</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#475569] mb-1">
                  Kata Sandi Baru <span className="font-normal text-[#94A3B8]">(kosongkan bila tidak diubah)</span>
                </label>
                <input
                  type="password"
                  minLength={8}
                  placeholder="Minimal 8 karakter..."
                  value={editNewPassword}
                  onChange={(event) => setEditNewPassword(event.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#D8E5DC] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#166534]"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-[#E8EFEA]">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingUser(null);
                  }}
                  className="px-3.5 py-2 rounded-lg text-[#475569] bg-[#F1F5F2] hover:bg-[#E8EFEA] font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-4 py-2 rounded-[8px] text-white bg-[#166534] hover:bg-[#14532D] font-semibold text-xs shadow-sm disabled:opacity-50 transition"
                >
                  {isUpdating ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Dialog Konfirmasi Hapus */}
      <NotificationModal
        isOpen={showDeleteModal && Boolean(deletingUser)}
        type="confirm"
        title="Hapus Akun Pengguna?"
        message={`Apakah Anda yakin ingin menghapus akun "${deletingUser?.nama}" (${deletingUser?.username})? Tindakan ini akan mencabut seluruh tiket sesi SSO dan tidak dapat dibatalkan.`}
        confirmLabel="Ya, Hapus Akun"
        cancelLabel="Batal"
        loading={isDeleting}
        onConfirm={handleDelete}
        onClose={() => {
          setShowDeleteModal(false);
          setDeletingUser(null);
        }}
      />

      {/* Modal Dialog Konfirmasi Sinkronisasi Massal Dosen SIAKAD */}
      <NotificationModal
        isOpen={showSyncConfirm}
        type="confirm"
        title="Tarik Data Dosen SIAKAD?"
        message="Sistem akan menghubungkan kredensial ke portal akademik SIAKAD UNUSU dan menyinkronkan seluruh direktori dosen resmi beserta NIDN dan program studinya ke database ONE UNUSU."
        confirmLabel="Tarik Data Sekarang"
        cancelLabel="Batal"
        loading={isSyncingSiakad}
        onConfirm={handleSyncSiakadDosen}
        onClose={() => setShowSyncConfirm(false)}
      />

      {/* Modal Dialog Tarik Mahasiswa SIAKAD dengan Filter */}
      {showSyncMhsModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[16px] shadow-2xl max-w-lg w-full p-6 sm:p-7 border border-[#D8E5DC] space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-bold text-[#1E293B] flex items-center gap-2">
                  <ArrowPathIcon className="w-5 h-5 text-[#166534]" />
                  <span>Tarik Mahasiswa SIAKAD</span>
                </h3>
                <p className="text-xs text-[#64748B]">
                  Pilih program studi atau tahun angkatan untuk menarik data mahasiswa secara bertarget dari server SIAKAD.
                </p>
              </div>
              <button
                type="button"
                onClick={() => !isSyncingMhs && setShowSyncMhsModal(false)}
                className="p-1 rounded-lg text-[#94A3B8] hover:text-[#1E293B] transition"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#1E293B]">
                  Filter Program Studi
                </label>
                <select
                  value={selectedMhsProdi}
                  onChange={(e) => setSelectedMhsProdi(e.target.value)}
                  disabled={isSyncingMhs}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#CBD5E1] rounded-[8px] focus:outline-none focus:ring-1 focus:ring-[#166534] focus:border-[#166534]"
                >
                  <option value="">-- Semua Program Studi & Fakultas --</option>
                  {siakadProdiOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nama} ({p.fakultas})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-[#64748B]">
                  Biarkan opsi default untuk menyinkronkan seluruh prodi sekaligus.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#1E293B]">
                  Tahun Angkatan (Opsional)
                </label>
                <input
                  type="text"
                  value={selectedMhsAngkatan}
                  onChange={(e) => setSelectedMhsAngkatan(e.target.value)}
                  placeholder="Misal: 2026, 2025, 2024 (kosongkan untuk semua angkatan)"
                  disabled={isSyncingMhs}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#CBD5E1] rounded-[8px] focus:outline-none focus:ring-1 focus:ring-[#166534] focus:border-[#166534]"
                />
              </div>

              <div className="p-3 bg-[#F0FDF4] rounded-[10px] border border-[#BBF7D0] text-xs text-[#166534] space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <CheckIcon className="w-4 h-4" />
                  <span>Ketentuan Sinkronisasi SSO</span>
                </p>
                <p className="text-[11px] text-[#14532D] leading-relaxed">
                  Mahasiswa yang ditarik otomatis dibuatkan akun portal SSO dengan password default <span className="font-mono font-bold">Unusu123!</span> dan foto profil resmi dari direktori SIAKAD (jika tersedia).
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-[#E8EFEA] flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowSyncMhsModal(false)}
                disabled={isSyncingMhs}
                className="px-4 py-2 rounded-[8px] border border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] text-xs font-semibold text-[#64748B] transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteSyncMhs}
                disabled={isSyncingMhs}
                className="px-5 py-2 rounded-[8px] bg-[#166534] hover:bg-[#14532D] text-white text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSyncingMhs ? (
                  <>
                    <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                    <span>Menarik Data SIAKAD...</span>
                  </>
                ) : (
                  <>
                    <ArrowPathIcon className="w-3.5 h-3.5" />
                    <span>Mulai Sinkronisasi</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Notifikasi Hasil Aksi (Berhasil / Gagal) */}
      <NotificationModal
        isOpen={notify.isOpen}
        type={notify.type}
        title={notify.title}
        message={notify.message}
        onClose={() => setNotify((prev) => ({ ...prev, isOpen: false }))}
      />
    </AdminPanelTemplate>
  );
};
