import indonesian from "./id.json";
export type Locale = "id" | "en";
export const localeCookie = "hirevelo-language";
export function parseLocale(value: unknown): Locale {
  return value === "en" ? "en" : "id";
}
const messages: Record<string, string> = indonesian;
export function createTranslator(locale: Locale) {
  function translate<T>(
    value: T,
    parameters?: Record<string, string | number>,
  ): T {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    let translated =
      locale === "id"
        ? Object.hasOwn(messages, value)
          ? messages[value]
          : Object.hasOwn(messages, trimmed)
            ? messages[trimmed]
            : undefined
        : undefined;
    if (locale === "id" && !translated) {
      const limit = trimmed.match(
        /^(String|Number) must (contain|be) (at least|at most|greater than|less than or equal to) (\d+)( character\(s\))?$/,
      );
      if (limit)
        translated = `${limit[1] === "String" ? "Teks" : "Angka"} ${limit[3] === "at least" ? "minimal" : limit[3] === "greater than" ? "harus lebih dari" : "maksimal"} ${limit[4]}${limit[5] ? " karakter" : ""}.`;
      else if (/^Invalid (email|date|cuid)$/.test(trimmed))
        translated = "Format data tidak valid.";
      else if (
        trimmed.startsWith("Invalid enum value.") ||
        trimmed.startsWith("Invalid input:")
      )
        translated = "Pilih nilai yang valid.";
      else if (trimmed === "Expected integer, received float")
        translated = "Masukkan angka bulat.";
      else if (trimmed === "Required") translated = "Wajib diisi.";
      else if (/^Expected (number|string), received/.test(trimmed))
        translated = "Masukkan data dengan format yang sesuai.";
    }
    let result = translated ? value.replace(trimmed, translated.trim()) : value;
    if (parameters)
      result = result.replace(/\{(\w+)\}/g, (match, key: string) =>
        Object.hasOwn(parameters, key) ? String(parameters[key]) : match,
      );
    return result as T;
  }
  return Object.assign(translate, { locale });
}
