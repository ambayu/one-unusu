import type { UserProfile } from '../services/api';

/**
 * Biodata dianggap lengkap untuk keperluan GERBANG SSO bila email dan nomor
 * WhatsApp sudah terisi.
 *
 * Fungsi ini sengaja tetap sempit: ia dipakai sebelum menerbitkan tiket SSO,
 * sedangkan `ringkasBiodata()` di bawah menghitung progres tampilan yang jauh
 * lebih luas. Memakai `ringkasBiodata().lengkap` sebagai gerbang akan
 * memblokir pengguna karena butir opsional seperti alamat atau foto profil.
 */
export function isBiodataComplete(
  user: Pick<UserProfile, 'email' | 'noHp'> | null | undefined
): boolean {
  if (!user) return false;
  return Boolean(user.email?.trim() && user.noHp?.trim());
}

/**
 * Satu butir biodata yang ikut dihitung pada progres kelengkapan.
 *
 * `kunci` dipakai sebagai identitas React sekaligus penanda butir mana yang
 * masih kosong, sehingga antarmuka dapat menyebutkan nama butirnya kepada
 * pengguna ("Nomor WhatsApp belum diisi") alih-alih hanya menampilkan angka.
 */
export interface ButirBiodata {
  kunci: string;
  label: string;
  /** Butir wajib memblokir pembukaan aplikasi SSO; opsional hanya menambah nilai. */
  wajib: boolean;
  terisi: boolean;
}

/**
 * Daftar butir biodata sesuai peran pengguna.
 *
 * Butir wajib sengaja dibatasi pada email dan nomor WhatsApp — keduanya yang
 * dipakai server sebagai gerbang pembukaan aplikasi SSO (lihat
 * `isBiodataComplete`). Butir lain dihitung untuk memberi gambaran progres,
 * bukan sebagai syarat.
 */
function daftarButir(peran: UserProfile['role']): { kunci: string; label: string; wajib: boolean }[] {
  // Butir dasar berlaku untuk semua peran, termasuk admin. Nama, email, dan
  // nomor WhatsApp adalah data akun yang selalu ada di tabel `User`, bukan
  // data civitas — sehingga tetap relevan untuk pengelola sistem.
  const dasar = [
    { kunci: 'nama', label: 'Nama lengkap', wajib: false },
    { kunci: 'email', label: 'Email', wajib: true },
    { kunci: 'noHp', label: 'Nomor WhatsApp', wajib: true },
  ];

  if (peran === 'DOSEN') {
    return [
      ...dasar,
      { kunci: 'avatar', label: 'Foto profil', wajib: false },
      { kunci: 'jenisKelamin', label: 'Jenis kelamin', wajib: false },
      { kunci: 'tanggalLahir', label: 'Tanggal lahir', wajib: false },
      { kunci: 'alamat', label: 'Alamat', wajib: false },
      { kunci: 'nidn', label: 'NIDN / NUP', wajib: false },
      { kunci: 'fakultas', label: 'Fakultas', wajib: false },
      { kunci: 'prodi', label: 'Program studi', wajib: false },
      { kunci: 'jabatanAkademik', label: 'Jabatan akademik', wajib: false },
      { kunci: 'pendidikanTerakhir', label: 'Pendidikan terakhir', wajib: false },
      { kunci: 'bidangKeahlian', label: 'Bidang keahlian', wajib: false },
      { kunci: 'sintaId', label: 'ID SINTA', wajib: false },
    ];
  }

  if (peran === 'MAHASISWA') {
    return [
      ...dasar,
      { kunci: 'avatar', label: 'Foto profil', wajib: false },
      { kunci: 'jenisKelamin', label: 'Jenis kelamin', wajib: false },
      { kunci: 'tanggalLahir', label: 'Tanggal lahir', wajib: false },
      { kunci: 'alamat', label: 'Alamat', wajib: false },
      { kunci: 'nim', label: 'NIM', wajib: false },
      { kunci: 'fakultas', label: 'Fakultas', wajib: false },
      { kunci: 'prodi', label: 'Program studi', wajib: false },
      { kunci: 'angkatan', label: 'Angkatan', wajib: false },
      { kunci: 'asalSekolah', label: 'Asal sekolah', wajib: false },
      { kunci: 'namaIbuKandung', label: 'Nama ibu kandung', wajib: false },
    ];
  }

  // Admin dan peran pengelola lain tidak memiliki data civitas (NIDN, fakultas,
  // prodi, angkatan). Menghitung foto profil, jenis kelamin, tanggal lahir, dan
  // alamat sebagai kekurangan akan menampilkan ajakan "lengkapi profil
  // akademik" yang tidak berlaku bagi mereka. Cukup tiga butir akun di atas.
  return dasar;
}

export interface RingkasanBiodata {
  butir: ButirBiodata[];
  total: number;
  terisi: number;
  /** 0–100, dibulatkan. Bernilai 0 bila tidak ada butir sama sekali. */
  persen: number;
  /** Butir WAJIB yang masih kosong — penghalang pembukaan aplikasi SSO. */
  wajibKurang: ButirBiodata[];
  /** Butir opsional yang masih kosong, dipakai sebagai saran pelengkapan. */
  opsionalKurang: ButirBiodata[];
  lengkap: boolean;
}

/**
 * Menghitung kelengkapan biodata beserta rinciannya.
 *
 * Berbeda dari `isBiodataComplete` yang hanya menjawab ya/tidak untuk gerbang
 * SSO, fungsi ini memberi angka progres dan menyebut butir mana yang kosong,
 * supaya dashboard dapat menampilkan ajakan yang konkret.
 */
export function ringkasBiodata(
  user: Pick<
    UserProfile,
    | 'nama'
    | 'email'
    | 'noHp'
    | 'avatar'
    | 'jenisKelamin'
    | 'tanggalLahir'
    | 'alamat'
    | 'nidn'
    | 'fakultas'
    | 'prodi'
    | 'jabatanAkademik'
    | 'pendidikanTerakhir'
    | 'bidangKeahlian'
    | 'sintaId'
    | 'nim'
    | 'angkatan'
    | 'asalSekolah'
    | 'namaIbuKandung'
    | 'role'
  > | null
  | undefined
): RingkasanBiodata {
  if (!user) {
    return {
      butir: [],
      total: 0,
      terisi: 0,
      persen: 0,
      wajibKurang: [],
      opsionalKurang: [],
      lengkap: false,
    };
  }

  const butir: ButirBiodata[] = daftarButir(user.role).map((item) => {
    const nilai = (user as Record<string, unknown>)[item.kunci];
    const teks = typeof nilai === 'string' ? nilai.trim() : nilai;
    return { ...item, terisi: Boolean(teks) };
  });

  const total = butir.length;
  const terisi = butir.filter((b) => b.terisi).length;

  return {
    butir,
    total,
    terisi,
    persen: total ? Math.round((terisi / total) * 100) : 0,
    wajibKurang: butir.filter((b) => b.wajib && !b.terisi),
    opsionalKurang: butir.filter((b) => !b.wajib && !b.terisi),
    // "Lengkap" berarti seluruh butir terisi. Butir wajib saja terpenuhi belum
    // cukup untuk menyebut biodata lengkap pada kartu progres, meski sudah
    // membuka gerbang SSO.
    lengkap: terisi === total,
  };
}
