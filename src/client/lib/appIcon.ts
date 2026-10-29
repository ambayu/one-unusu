/**
 * Kolom `icon` pada SsoApp menyimpan dua bentuk nilai: nama ikon lama
 * (misal "GraduationCap") atau sumber gambar hasil unggahan registrasi SSO.
 * Helper ini memastikan hanya nilai berupa sumber gambar yang dirender sebagai <img>.
 */
export function isImageSource(value?: string | null): boolean {
  const source = value?.trim();
  if (!source) {
    return false;
  }

  return (
    source.startsWith('data:image/') ||
    source.startsWith('http://') ||
    source.startsWith('https://') ||
    source.startsWith('/')
  );
}
