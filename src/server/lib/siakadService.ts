import https from 'https';
import querystring from 'querystring';

export interface SiakadStudentProfile {
  nim: string;
  nama: string;
  prodi?: string | null;
  fakultas?: string | null;
  noHp?: string | null;
  email?: string | null;
  nik?: string | null;
  jenisKelamin?: string | null;
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
  statusAkademik?: string | null;
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
    const text = cleanHtmlText(r);
    // Contoh baris: "AGR NIDN 0129088903 ABDUL GAFUR, S.KOM., M.KOM abdulgafur Teknik Informatika"
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
      });
    }
  }

  return lecturers;
}

/**
 * 4. Helper Pemetaan Nama Prodi ke Fakultas Resmi UNUSU
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
  if (p.includes('tani') || p.includes('agroteknologi') || p.includes('agribisnis')) {
    return 'Fakultas Pertanian';
  }
  if (p.includes('sehat') || p.includes('gizi') || p.includes('masyarakat') || p.includes('kesehatan')) {
    return 'Fakultas Ilmu Kesehatan';
  }
  if (p.includes('agama') || p.includes('islam') || p.includes('syariah') || p.includes('ahwal')) {
    return 'Fakultas Agama Islam';
  }
  return 'Universitas Nahdlatul Ulama Sumatera Utara';
}
