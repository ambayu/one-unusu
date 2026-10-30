const BASE_URL = import.meta.env.BASE_URL;

/**
 * Menyusun URL aset statis mengikuti base path hasil build.
 *
 * Path absolut seperti "/assets/hero/x.png" hanya benar bila aplikasi dipasang
 * di akar domain. Di produksi aplikasi ini berada di sub-path (mis. "/sso/"),
 * sehingga path tersebut harus diawali base agar tidak jatuh ke aplikasi lain.
 */
export function assetUrl(path: string): string {
  const normalized = path.startsWith("/") ? path.slice(1) : path;
  return `${BASE_URL}${normalized}`;
}
