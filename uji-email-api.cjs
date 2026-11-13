// Uji ujung-ke-ujung PUT /api/auth/profile: email milik akun lain harus DITOLAK.
//
// Cara pakai (kredensial hanya lewat argumen, TIDAK ditulis ke berkas ini):
//   node uji-email-api.cjs <username> <password>
//
// Keamanan data:
//   - permintaan memakai email yang SUDAH dipakai akun lain, sehingga perbaikan
//     yang benar akan menolaknya SEBELUM `prisma.user.update` dijalankan.
//   - setelah uji, email akun yang diuji dibaca ulang dan dibandingkan; bila
//     berubah, skrip melaporkan GAGAL keras.
//   - kredensial tidak disimpan, tidak dicetak, dan tidak masuk log.
//   - berkas ini boleh dihapus setelah uji.
const BASE = process.env.API_BASE ?? 'http://localhost:5000';

const [username, password] = process.argv.slice(2);

if (!username || !password) {
  console.log('  Pakai: node uji-email-api.cjs <username> <password>');
  process.exit(1);
}

const hasil = [];
const catat = (nama, lulus, detail) => {
  hasil.push({ nama, lulus });
  console.log(`  ${lulus ? 'LULUS' : 'GAGAL'}  ${nama}\n         ${detail}`);
};

function selesai() {
  const gagal = hasil.filter((h) => !h.lulus).length;
  console.log('');
  console.log(gagal === 0 ? `  SEMUA ${hasil.length} PEMERIKSAAN LULUS` : `  ${gagal} DARI ${hasil.length} GAGAL`);
  process.exit(gagal === 0 ? 0 : 1);
}

async function main() {
  // --- 1. Login ---
  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: username, password }),
  });
  const login = await loginRes.json().catch(() => ({}));
  if (!login?.status || !login?.data?.token) {
    catat('Login uji', false, `HTTP ${loginRes.status} ${login?.message ?? ''}`);
    return selesai();
  }
  const token = login.data.token;
  const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  catat('Login uji', true, 'token diterima');

  // --- 2. Keadaan email saya saat ini ---
  const meRes = await fetch(`${BASE}/api/auth/me`, { headers: auth });
  const me = await meRes.json().catch(() => ({}));
  const emailAwal = me?.data?.email ?? null;
  const idSaya = me?.data?.id;

  // --- 3. Cari email milik akun lain ---
  const usersRes = await fetch(`${BASE}/api/admin/users`, { headers: auth });
  if (!usersRes.ok) {
    catat('Ambil daftar pengguna', false, `HTTP ${usersRes.status} (butuh izin user:view)`);
    return selesai();
  }
  const users = await usersRes.json().catch(() => ({}));
  const lain = (users?.data ?? []).find(
    (u) => typeof u.email === 'string' && u.email.trim() && u.id !== idSaya
  );
  if (!lain) {
    catat('Cari email akun lain', false, 'tidak ada akun lain yang punya email');
    return selesai();
  }
  catat('Cari email akun lain', true, `${lain.email} (milik ${lain.username})`);

  // --- 4. Kirim email milik akun lain. HARUS 409 ---
  const res = await fetch(`${BASE}/api/auth/profile`, {
    method: 'PUT',
    headers: auth,
    body: JSON.stringify({ email: lain.email }),
  });
  const body = await res.json().catch(() => ({}));
  const pesan = String(body?.message ?? '');

  catat(
    'Email dipakai akun lain ditolak 409',
    res.status === 409 && /sudah digunakan/i.test(pesan),
    `HTTP ${res.status} | "${pesan}"`
  );

  catat(
    'Pesan menyebut sebab, bukan menyalahkan sistem',
    !/gagal memperbarui profil|kesalahan sistem/i.test(pesan),
    `pesan: "${pesan}"`
  );

  // --- 5. Beda huruf besar/kecil tetap ditolak ---
  const resBesar = await fetch(`${BASE}/api/auth/profile`, {
    method: 'PUT',
    headers: auth,
    body: JSON.stringify({ email: lain.email.toUpperCase() }),
  });
  const bodyBesar = await resBesar.json().catch(() => ({}));
  catat(
    'Beda huruf besar/kecil tetap ditolak',
    resBesar.status === 409,
    `HTTP ${resBesar.status} | "${bodyBesar?.message ?? ''}"`
  );

  // --- 6. Bukti tidak ada penulisan ---
  const cekRes = await fetch(`${BASE}/api/auth/me`, { headers: auth });
  const cek = await cekRes.json().catch(() => ({}));
  const emailAkhir = cek?.data?.email ?? null;
  catat(
    'Email saya tidak berubah',
    emailAkhir === emailAwal,
    `${emailAwal ?? '(kosong)'} -> ${emailAkhir ?? '(kosong)'}`
  );

  // --- 7. Email milik sendiri tetap diterima ---
  if (emailAwal) {
    const resSendiri = await fetch(`${BASE}/api/auth/profile`, {
      method: 'PUT',
      headers: auth,
      body: JSON.stringify({ email: emailAwal.toUpperCase() }),
    });
    const bodySendiri = await resSendiri.json().catch(() => ({}));
    catat(
      'Email milik sendiri tetap diterima',
      resSendiri.status === 200 && bodySendiri?.status === true,
      `HTTP ${resSendiri.status} | "${bodySendiri?.message ?? ''}"`
    );

    // Kembalikan kapitalisasi email ke keadaan semula bila server menyimpan
    // versi huruf besar. Ini menjaga data uji tetap seperti sebelum diuji.
    if (emailAkhir !== emailAwal) {
      await fetch(`${BASE}/api/auth/profile`, {
        method: 'PUT',
        headers: auth,
        body: JSON.stringify({ email: emailAwal }),
      });
      console.log(`         (email dikembalikan ke "${emailAwal}")`);
    }
  }

  selesai();
}

main().catch((e) => {
  console.log(`  Galat uji: ${e.message}`);
  process.exit(1);
});
