import sanitizeHtml from "sanitize-html";

/**
 * Batas karakter biografi, disamakan dengan batas yang sudah dipakai pada
 * penyimpanan profil maupun panel admin.
 */
export const BATAS_BIO = 5000;

/**
 * Format yang boleh disimpan dari editor biodata.
 *
 * Hanya penanda teks dasar; gambar, tabel, skrip, dan atribut gaya dibuang
 * supaya halaman yang menampilkan biografi tidak bisa disisipi HTML berbahaya.
 */
const OPSI_SANITASI: sanitizeHtml.IOptions = {
  allowedTags: ["p", "br", "strong", "em", "u", "ul", "ol", "li", "h3", "a"],
  allowedAttributes: { a: ["href", "target", "rel"] },
  allowedSchemes: ["http", "https", "mailto"],
  transformTags: {
    b: "strong",
    i: "em",
    div: "p",
    a: (_tagName, attribs) => ({
      tagName: "a",
      attribs: { ...attribs, target: "_blank", rel: "noopener noreferrer" },
    }),
  },
};

/** Membersihkan HTML editor biodata dan memotongnya pada batas kolom. */
export function bersihkanBio(html: string): string {
  const bersih = sanitizeHtml(html, OPSI_SANITASI).trim().slice(0, BATAS_BIO);
  // Editor menyisakan tag kosong (mis. "<br>") setelah isinya dihapus.
  return bersih.replace(/<[^>]*>/g, "").trim() ? bersih : "";
}

const ENTITAS: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&nbsp;": " ",
};

/**
 * Bentuk teks polos dari biografi ber-HTML.
 *
 * Dipakai pemanggil API (Portal Prodi, Sarpras) yang menampilkan biografi
 * sebagai teks biasa: setiap blok menjadi baris sendiri dan butir daftar
 * ditandai "• " agar isinya tetap terbaca.
 */
export function bioKeTeks(html: string | null | undefined): string | null {
  if (!html) return null;

  const berbaris = html
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<\/(?:p|li|h3|div|ul|ol)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n");

  const teks = sanitizeHtml(berbaris, { allowedTags: [], allowedAttributes: {} });

  return (
    teks
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/&[a-z#0-9]+;/gi, (entitas) => ENTITAS[entitas.toLowerCase()] ?? entitas)
      .trim() || null
  );
}
