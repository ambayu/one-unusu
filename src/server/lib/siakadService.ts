import https from 'https';
import querystring from 'querystring';

export interface SiakadStudentProfile {
  nim: string;
  nama: string;
  prodi?: string | null;
  fakultas?: string | null;
  angkatan?: string | null;
  jenisKelamin?: string | null;
  fotoUrl?: string | null;
  noHp?: string | null;
  email?: string | null;
  nik?: string | null;
  tempatLahir?: string | null;
  tanggalLahir?: string | null;
  statusAkademik?: string | null;
  alamat?: string | null;
  asalSekolah?: string | null;
  namaIbuKandung?: string | null;
}

export interface SiakadLecturerProfile {
  nidn: string;
  nama: string;
  prodi?: string | null;
  fakultas?: string | null;
  email?: string | null;
  noHp?: string | null;
  nik?: string | null;
  tempatLahir?: string | null;
  tanggalLahir?: string | null;
  jenisKelamin?: string | null;
  alamat?: string | null;
  statusAkademik?: string | null;
  kodeSia?: string | null;
}

function cleanHtmlText(text: string): string {
  return text
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function makeRequest(urlStr: string, opts: {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}): Promise<{ statusCode: number; headers: Record<string, any>; setCookie?: string[]; body: string }> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(urlStr);
    const method = opts.method || 'GET';
    const reqHeaders: Record<string, any> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
      ...opts.headers,
    };

    if (opts.body) {
      reqHeaders['Content-Length'] = Buffer.byteLength(opts.body);
    }

    const req = https.request({
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method,
      headers: reqHeaders,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({
        statusCode: res.statusCode || 200,
        headers: res.headers,
        setCookie: res.headers['set-cookie'],
        body: data,
      }));
    });

    req.on('error', reject);
    req.setTimeout(8000, () => {
      req.destroy(new Error('Koneksi ke SIAKAD timeout (8 detik).'));
    });

    if (opts.body) req.write(opts.body);
    req.end();
  });
}

/**
 * 1. Autentikasi Credential via SIAKAD JSON API (/auth/index.php)
 */
export async function authenticateSiakadApi(username: string, password: string): Promise<{
  success: boolean;
  message?: string;
  role?: string;
  idLevelUser?: string;
}> {
  try {
    const payload = JSON.stringify({ username, password });
    const res = await makeRequest('https://siakad.unusu.ac.id/auth/index.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: payload,
    });

    const parsed = JSON.parse(res.body);
    if (parsed && parsed.status === 'success' && parsed.data) {
      return {
        success: true,
        role: parsed.data.level_user,
        idLevelUser: parsed.data.id_level_user,
      };
    }
    return {
      success: false,
      message: parsed?.message || 'Username atau password salah di SIAKAD.',
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || 'Gagal menghubungi gerbang autentikasi SIAKAD.',
    };
  }
}

/**
 * 2. Ambil Profil Lengkap Mahasiswa Langsung dari Portal Mahasiswa
 */
export async function scrapeMahasiswaProfile(nim: string, password: string): Promise<SiakadStudentProfile | null> {
  try {
    const bodyStr = querystring.stringify({
      nama_sistem: 'Sistem',
      username: nim,
      password,
    });

    const loginRes = await makeRequest('https://siakad.unusu.ac.id/mahasiswa/index.php?module=login&action=cek_login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': 'https://siakad.unusu.ac.id/mahasiswa/index.php',
      },
      body: bodyStr,
    });

    if (!loginRes.body.includes('sukses')) {
      return null;
    }

    const cookie = (loginRes.setCookie || []).map(c => c.split(';')[0]).join('; ');
    if (!cookie) return null;

    // Ambil halaman profil utama
    const pageRes = await makeRequest('https://siakad.unusu.ac.id/mahasiswa/index.php?module=home', {
      headers: {
        'Cookie': cookie,
        'Referer': 'https://siakad.unusu.ac.id/mahasiswa/index.php',
      },
    });

    const clean = cleanHtmlText(pageRes.body);

    const getField = (regex: RegExp): string | null => {
      const match = clean.match(regex);
      return match && match[1] ? match[1].trim() : null;
    };

    const nama = getField(/Nama Lengkap\s+([A-Za-z0-9\s.,'"`-]+?)(?=\s+Tempat Lahir|\s+NIK|\s+NISN|$)/i) ||
                 getField(/Hi,\s*([A-Za-z0-9\s.,'"`-]+?)(?=\s+[A-Z0-9]+|\s+NIM:|$)/i) ||
                 'Mahasiswa UNUSU';

    const prodi = getField(/NIM\s*:\s*[0-9]+\s+([A-Za-z\s]+?)(?=\s+Data Telah|\s+Biodata|$)/i) ||
                  getField(/Program Studi\s*:\s*([A-Za-z0-9\s-]+?)(?=\s+Fakultas|\s+Semester|$)/i);

    const noHp = getField(/No\.\s*HP\s*:\s*([0-9+]+)/i) ||
                 getField(/No\.\s*Telepon\s*\/\s*HP\s*([0-9+]+)/i);

    const nik = getField(/NIK\s*\(Nomor Induk Kependudukan\)\s*([0-9]+)/i);
    const tempatLahir = getField(/Tempat Lahir\s*([A-Za-z0-9\s]+?)(?=\s+Tanggal Lahir|$)/i);
    const tanggalLahir = getField(/Tanggal Lahir\s*([0-9-]+)/i);
    const jenisKelamin = getField(/Jenis Kelamin\s*([A-Za-z-]+)/i);
    const alamat = getField(/Alamat\s*\/\s*Jalan\s*(.+?)(?=\s+Dusun|\s+RT|\s+RW|\s+Kelurahan|$)/i);
    const asalSekolah = getField(/Nama SLTA\s*(.+?)(?=\s+Jurusan|\s+Nomor STTB|$)/i);
    const namaIbuKandung = getField(/Nama Ibu\s*(.+?)(?=\s+NIK Ibu|$)/i);

    return {
      nim,
      nama: nama.toUpperCase(),
      prodi,
      fakultas: prodi ? mapProdiToFakultas(prodi) : null,
      noHp,
      nik,
      tempatLahir,
      tanggalLahir,
      jenisKelamin,
      alamat,
      asalSekolah,
      namaIbuKandung,
      statusAkademik: 'Aktif',
    };
  } catch {
    return null;
  }
}

/**
 * 3. Login Admin SIA & Tarik Seluruh Dosen
 */
export async function scrapeAllDosenFromSia(adminUsername: string, adminPass: string): Promise<SiakadLecturerProfile[]> {
  const bodyStr = querystring.stringify({
    nama_sistem: 'Sistem Akademik',
    username: adminUsername,
    password: adminPass,
  });

  const loginRes = await makeRequest('https://siakad.unusu.ac.id/sia/index.php?module=login&action=cek_login&tpl=no', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Referer': 'https://siakad.unusu.ac.id/sia/index.php',
    },
    body: bodyStr,
  });

  if (!loginRes.body.includes('sukses') && !loginRes.body.includes('Login Berhasil')) {
    throw new Error('Gagal login admin ke SIAKAD. Periksa kredensial admin.');
  }

  const cookie = (loginRes.setCookie || []).map(c => c.split(';')[0]).join('; ');
  if (!cookie) throw new Error('Cookie sesi admin SIAKAD tidak diperoleh.');

  const page = await makeRequest('https://siakad.unusu.ac.id/sia/index.php?main=dosen&module=data_dosen', {
    headers: {
      'Cookie': cookie,
      'Referer': 'https://siakad.unusu.ac.id/sia/index.php',
    },
  });

  const lecturers: SiakadLecturerProfile[] = [];
  const rows = page.body.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];

  for (const r of rows) {
    const cells = (r.match(/<td[^>]*>[\s\S]*?<\/td>/gi) || []).map(cell => cleanHtmlText(cell));
    // Tabel dosen SIAKAD memiliki 6 kolom:
    // cells[0]: Inisial (misal: "SKR")
    // cells[1]: NIDN (misal: "NIDN 0105069201")
    // cells[2]: Nama & Gelar (misal: "SITI KHAIRANI, SST., M.Agr")
    // cells[3]: Username SIAKAD (misal: "sitikhairani")
    // cells[4]: Homebase Prodi (misal: "Budidaya Pertanian")
    // cells[5]: Aksi (terdapat href edit_dosen&kode=...)
    const kodeMatch = r.match(/action=edit_dosen&kode=([0-9]+)/i);
    const kodeSia = kodeMatch ? kodeMatch[1] : null;

    if (cells.length >= 5) {
      const nidnMatch = cells[1].match(/([0-9]{8,15})/);
      const nidn = nidnMatch ? nidnMatch[1].trim() : '';
      const nama = cells[2]?.trim() || '';
      const prodi = cells[4]?.trim() || '';

      if (nidn && nama) {
        lecturers.push({
          nidn,
          nama,
          prodi,
          fakultas: mapProdiToFakultas(prodi),
          statusAkademik: 'Aktif',
          kodeSia,
        });
        continue;
      }
    }

    // Fallback regex jika struktur tabel sedikit berbeda
    const text = cleanHtmlText(r);
    const match = text.match(/NIDN\s*([0-9]{8,15})\s+(.+?)\s+([a-zA-Z0-9_.-]+)\s+([A-Za-z\s]+)$/i);
    if (match) {
      const nidn = match[1].trim();
      const nama = match[2].trim();
      const prodi = match[4].trim();
      lecturers.push({
        nidn,
        nama,
        prodi,
        fakultas: mapProdiToFakultas(prodi),
        statusAkademik: 'Aktif',
        kodeSia,
      });
    }
  }

  return lecturers;
}

/**
 * 4. Scrape Detail Biodata Dosen dari Form SIAKAD
 */
export async function scrapeDosenDetailFromSia(
  adminUsername: string,
  adminPass: string,
  kodeSia: string
): Promise<Partial<SiakadLecturerProfile> | null> {
  try {
    const bodyStr = querystring.stringify({
      nama_sistem: 'Sistem Akademik',
      username: adminUsername,
      password: adminPass,
    });

    const loginRes = await makeRequest('https://siakad.unusu.ac.id/sia/index.php?module=login&action=cek_login&tpl=no', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': 'https://siakad.unusu.ac.id/sia/index.php',
      },
      body: bodyStr,
    });

    const cookie = (loginRes.setCookie || []).map(c => c.split(';')[0]).join('; ');
    if (!cookie) return null;

    const page = await makeRequest(`https://siakad.unusu.ac.id/sia/index.php?main=dosen&module=data_dosen&action=edit_dosen&kode=${kodeSia}`, {
      headers: {
        'Cookie': cookie,
        'Referer': 'https://siakad.unusu.ac.id/sia/index.php?main=dosen&module=data_dosen',
      },
    });

    const getVal = (name: string): string => {
      const m = page.body.match(new RegExp(`name=["']${name}["'][^>]*value=["']([^"']*)["']`, 'i')) ||
                page.body.match(new RegExp(`value=["']([^"']*)["'][^>]*name=["']${name}["']`, 'i'));
      return m && m[1] ? m[1].trim() : '';
    };

    const nik = getVal('ktp');
    const tempatLahir = getVal('tempat_lahir');
    const tanggalLahirRaw = getVal('tanggal_lahir');
    const tanggalLahir = tanggalLahirRaw && tanggalLahirRaw !== '00-00-0000' ? tanggalLahirRaw : null;
    const noHp = getVal('telepon');
    const kabupaten = getVal('kabupaten');
    const kecamatan = getVal('kecamatan');
    const alamatDetail = [kecamatan, kabupaten].filter(Boolean).join(', ');

    // Jenis kelamin biasanya select
    let jenisKelamin: string | null = null;
    if (page.body.includes('name="jenis_kelamin"') || page.body.includes("name='jenis_kelamin'")) {
      const jkMatch = page.body.match(/<select[^>]*name=["']jenis_kelamin["'][\s\S]*?<\/select>/i);
      if (jkMatch) {
        const selected = jkMatch[0].match(/<option[^>]*selected[^>]*value=["']([^"']*)["']/i);
        if (selected && selected[1]) {
          jenisKelamin = selected[1].toUpperCase() === 'L' ? 'L' : selected[1].toUpperCase() === 'P' ? 'P' : selected[1];
        }
      }
    }

    return {
      nik: nik || null,
      tempatLahir: tempatLahir || null,
      tanggalLahir: tanggalLahir || null,
      noHp: noHp || null,
      alamat: alamatDetail || null,
      jenisKelamin: jenisKelamin || null,
    };
  } catch {
    return null;
  }
}

/**
 * 4. Helper Program Studi SIAKAD Master Map
 */
export const SIAKAD_PRODI_LIST = [
  { id: '13', nama: 'Hukum Keluarga Islam (Akhwal Syakhshiyyah)', fakultas: 'Fakultas Agama Islam' },
  { id: '11', nama: 'Pendidikan Islam Anak Usia Dini (PIAUD)', fakultas: 'Fakultas Agama Islam' },
  { id: '12', nama: 'S1 Pendidikan Agama Islam (PAI)', fakultas: 'Fakultas Agama Islam' },
  { id: '14', nama: 'S1 Studi Islam (Dirasah Islamiyah)', fakultas: 'Fakultas Agama Islam' },
  { id: '2',  nama: 'Manajemen', fakultas: 'Fakultas Ekonomi' },
  { id: '10', nama: 'D3 Analis Kesehatan', fakultas: 'Fakultas Ilmu Kesehatan' },
  { id: '9',  nama: 'Ilmu Gizi', fakultas: 'Fakultas Ilmu Kesehatan' },
  { id: '1',  nama: 'Pendidikan Guru Sekolah Dasar (PGSD)', fakultas: 'Fakultas Ilmu Pendidikan' },
  { id: '6',  nama: 'Ilmu Komputer', fakultas: 'Fakultas Ilmu Komputer' },
  { id: '7',  nama: 'Sistem Informasi', fakultas: 'Fakultas Ilmu Komputer' },
  { id: '8',  nama: 'Teknik Informatika', fakultas: 'Fakultas Ilmu Komputer' },
  { id: '5',  nama: 'Agribisnis', fakultas: 'Fakultas Pertanian' },
  { id: '3',  nama: 'Budidaya Pertanian', fakultas: 'Fakultas Pertanian' },
  { id: '4',  nama: 'Ilmu Dan Teknologi Pangan', fakultas: 'Fakultas Pertanian' },
];

/**
 * 5. Tarik Mahasiswa dari SIAKAD via Admin SIA
 * Parameter opsional:
 * - idJurusan: ID Program Studi (misal: '7')
 * - angkatan: Tahun angkatan (misal: '2026')
 */
export async function scrapeMahasiswaFromSia(
  adminUsername: string,
  adminPass: string,
  filter?: { idJurusan?: string; angkatan?: string }
): Promise<SiakadStudentProfile[]> {
  const bodyStr = querystring.stringify({
    nama_sistem: 'Sistem Akademik',
    username: adminUsername,
    password: adminPass,
  });

  const loginRes = await makeRequest('https://siakad.unusu.ac.id/sia/index.php?module=login&action=cek_login&tpl=no', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Referer': 'https://siakad.unusu.ac.id/sia/index.php',
    },
    body: bodyStr,
  });

  if (!loginRes.body.includes('sukses') && !loginRes.body.includes('Login Berhasil')) {
    throw new Error('Gagal login admin ke SIAKAD. Periksa kredensial admin.');
  }

  const cookie = (loginRes.setCookie || []).map(c => c.split(';')[0]).join('; ');
  if (!cookie) throw new Error('Cookie sesi admin SIAKAD tidak diperoleh.');

  const targetJurusanList = filter?.idJurusan
    ? SIAKAD_PRODI_LIST.filter(p => p.id === filter.idJurusan)
    : SIAKAD_PRODI_LIST;

  const results: SiakadStudentProfile[] = [];

  for (const jurusan of targetJurusanList) {
    // Ambil daftar angkatan untuk jurusan ini
    const jurusanPage = await makeRequest(`https://siakad.unusu.ac.id/sia/index.php?main=mahasiswa&module=data_mahasiswa&id_jurusan=${jurusan.id}`, {
      headers: {
        'Cookie': cookie,
        'Referer': 'https://siakad.unusu.ac.id/sia/index.php?main=mahasiswa&module=data_mahasiswa',
      },
    });

    // Cari link-link angkatan
    // Contoh link: action=tampil_mhs&angkatan=2026
    const linkMatches = jurusanPage.body.match(/href=["'][^"']*action=tampil_mhs[^"']*angkatan=([0-9]{4})[^"']*["']/gi) || [];
    const angkatanSet = new Set<string>();

    for (const lm of linkMatches) {
      const match = lm.match(/angkatan=([0-9]{4})/i);
      if (match) {
        angkatanSet.add(match[1]);
      }
    }

    const angkatansToScrape = filter?.angkatan
      ? [filter.angkatan].filter(a => angkatanSet.has(a) || angkatanSet.size === 0)
      : Array.from(angkatanSet);

    for (const angk of angkatansToScrape) {
      const mhsPage = await makeRequest(
        `https://siakad.unusu.ac.id/sia/index.php?main=mahasiswa&module=data_mahasiswa&id_jurusan=${jurusan.id}&action=tampil_mhs&angkatan=${angk}`,
        {
          headers: {
            'Cookie': cookie,
            'Referer': `https://siakad.unusu.ac.id/sia/index.php?main=mahasiswa&module=data_mahasiswa&id_jurusan=${jurusan.id}`,
          },
        }
      );

      const rows = mhsPage.body.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
      for (const r of rows) {
        if (r.includes('<th')) continue; // Skip header

        const cells = (r.match(/<td[^>]*>[\s\S]*?<\/td>/gi) || []);
        if (cells.length < 5) continue;

        // cells[1]: Foto <img src="..." />
        // cells[2]: NIM
        // cells[3]: Nama Lengkap
        // cells[4]: L/P
        // cells[7]: Status
        const imgMatch = cells[1]?.match(/src=["']([^"']+)["']/i);
        let fotoUrl: string | null = null;
        if (imgMatch && imgMatch[1] && !imgMatch[1].includes('blank') && !imgMatch[1].includes('default')) {
          fotoUrl = imgMatch[1].startsWith('..')
            ? `https://siakad.unusu.ac.id/sia/${imgMatch[1].replace(/^\.\.\//, '')}`
            : imgMatch[1];
        }

        const nim = cleanHtmlText(cells[2] || '');
        const nama = cleanHtmlText(cells[3] || '');
        const jkRaw = cleanHtmlText(cells[4] || '');
        const statusRaw = cells[7] ? cleanHtmlText(cells[7]) : 'Aktif';

        if (nim && /^[0-9]+$/.test(nim) && nama) {
          results.push({
            nim,
            nama: nama.toUpperCase(),
            prodi: jurusan.nama,
            fakultas: jurusan.fakultas,
            angkatan: angk,
            jenisKelamin: jkRaw === 'L' ? 'L' : jkRaw === 'P' ? 'P' : null,
            statusAkademik: statusRaw.toLowerCase().includes('aktif') ? 'Aktif' : statusRaw,
            fotoUrl,
          });
        }
      }
    }
  }

  return results;
}

/**
 * 6. Helper Pemetaan Nama Prodi ke Fakultas Resmi UNUSU
 */
export function mapProdiToFakultas(prodi: string): string {
  const p = prodi.toLowerCase();
  if (p.includes('informatika') || p.includes('komputer') || p.includes('sistem informasi')) {
    return 'Fakultas Ilmu Komputer';
  }
  if (p.includes('guru') || p.includes('paud') || p.includes('pgsd') || p.includes('inggris') || p.includes('pendidikan')) {
    return 'Fakultas Ilmu Pendidikan';
  }
  if (p.includes('manajemen') || p.includes('akuntansi') || p.includes('ekonomi')) {
    return 'Fakultas Ekonomi';
  }
  if (p.includes('tani') || p.includes('agroteknologi') || p.includes('agribisnis') || p.includes('pangan') || p.includes('budidaya')) {
    return 'Fakultas Pertanian';
  }
  if (p.includes('sehat') || p.includes('gizi') || p.includes('masyarakat') || p.includes('kesehatan') || p.includes('analis')) {
    return 'Fakultas Ilmu Kesehatan';
  }
  if (p.includes('agama') || p.includes('islam') || p.includes('syariah') || p.includes('ahwal') || p.includes('hukum')) {
    return 'Fakultas Agama Islam';
  }
  return 'Universitas Nahdlatul Ulama Sumatera Utara';
}
