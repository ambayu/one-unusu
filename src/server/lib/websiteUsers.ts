type HasilValidasiIds = { ids?: number[]; error?: never } | { error: string; ids?: never };

export function validasiIdsPengguna(
  body: Record<string, unknown>,
): HasilValidasiIds {
  if (!Object.hasOwn(body, "ids")) return {};
  const ids: unknown = body.ids;
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 50) {
    return { error: "Parameter `ids` wajib berupa array berisi 1 sampai 50 id pengguna." };
  }
  if (!ids.every((id: unknown) => typeof id === "number" && Number.isSafeInteger(id) && id > 0)) {
    return { error: "Setiap nilai `ids` wajib berupa angka bilangan bulat positif yang aman." };
  }
  if (["search", "role", "fakultas", "prodi", "limit"].some((key) => Object.hasOwn(body, key))) {
    return { error: "Parameter `ids` tidak boleh digabung dengan `search`, `role`, `fakultas`, `prodi`, atau `limit`." };
  }
  return { ids: [...new Set<number>(ids)] };
}
