/**
 * Menormalkan URL eksternal http/https dan mengembalikan null bila URL tidak valid.
 *
 * @param value - String URL yang akan divalidasi dan dinormalkan
 * @returns String URL yang valid atau null bila tidak valid
 */
export function normalizeExternalUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed || !/^https?:\/\//i.test(trimmed) || /[\s\\]/.test(trimmed)) return null;

  try {
    const url = new URL(trimmed);
    if (!url.hostname || url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}
