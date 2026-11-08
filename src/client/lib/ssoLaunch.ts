/**
 * Pembukaan aplikasi cabang melalui SSO pada tab baru.
 *
 * Alur tiket SSO v2 menerbitkan token sekali pakai berumur 5 menit lewat
 * `GET /api/sso/app-client/:clientId/v2/redirect`. Token itu ditempelkan pada
 * URL callback aplikasi cabang, lalu ditukar menjadi sesi lokal di sana.
 *
 * Sebelumnya URL callback langsung dipasang ke `window.location.href`, sehingga
 * portal ONE UNUSU hilang dari tab aktif setiap kali pengguna membuka aplikasi
 * lain. Pengguna harus menekan tombol kembali untuk meneruskan pekerjaan di
 * portal. Karena itu jendela tujuan sekarang dibuka terpisah.
 *
 * Satu batasan browser yang menentukan bentuk fungsi ini: `window.open` hanya
 * diizinkan selama masih di dalam gestur klik pengguna. Setelah `await`, gestur
 * dianggap selesai dan popup blocker menolak jendela baru. Karena itu jendela
 * kosong dibuka lebih dulu oleh `openTabTujuan`, lalu URL-nya diisi setelah
 * tiket diterbitkan oleh `arahkanTab`.
 */

/**
 * Membuka tab kosong sebagai tempat tujuan. Harus dipanggil secara langsung di
 * dalam penangan klik, sebelum permintaan jaringan apa pun.
 *
 * `noopener` mencegah tab baru memegang `window.opener`, sehingga aplikasi
 * cabang tidak dapat mengarahkan portal ke halaman lain. Konsekuensinya
 * `window.open` mengembalikan `null`, jadi tab dikenali dari jendela yang
 * dibuka dengan nama unik.
 */
const NAMA_TAB = 'unusu_app_launch';

export type TabTujuan = Window | null;

export function openTabTujuan(): TabTujuan {
  // Nama tetap dipakai agar jendela yang sama dapat ditemukan kembali bila
  // pengguna menekan tombol dua kali sebelum permintaan pertama selesai.
  const tab = window.open('', NAMA_TAB);
  if (tab) {
    // Memutus referensi ke portal induk sedini mungkin.
    tab.opener = null;
  }
  return tab;
}

/**
 * Mengisi tab tujuan dengan URL callback SSO.
 *
 * `location.replace` dipakai, bukan `location.href`, agar halaman kosong
 * perantara tidak tersimpan di riwayat tab baru — tombol kembali di aplikasi
 * cabang langsung menuju halaman sebelumnya, bukan ke `about:blank`.
 *
 * Bila tab sudah ditutup pengguna atau diblokir, URL dibuka pada tab baru
 * sebagai upaya terakhir. Tiket sudah terbit dan berumur pendek, jadi
 * membiarkannya tidak terpakai hanya menghasilkan percobaan masuk yang
 * menggantung.
 */
export function arahkanTab(tab: TabTujuan, url: string): void {
  if (tab && !tab.closed) {
    tab.location.replace(url);
    return;
  }

  const tabPengganti = window.open(url, '_blank');
  if (tabPengganti) {
    tabPengganti.opener = null;
  }
}

/** Menutup tab tujuan bila proses penerbitan tiket gagal. */
export function tutupTab(tab: TabTujuan): void {
  if (tab && !tab.closed) {
    tab.close();
  }
}
