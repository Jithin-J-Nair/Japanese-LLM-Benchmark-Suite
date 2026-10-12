import { cookies } from "next/headers";
import { DEFAULT_LANGUAGE, LANG_COOKIE, translate, type Language, type I18nKey } from "@/i18n";

/** Server-side language resolution (reads the cookie set by the client). */
export async function getServerLang(): Promise<Language> {
  const store = await cookies();
  const v = store.get(LANG_COOKIE)?.value;
  return v === "en" || v === "ja" ? v : DEFAULT_LANGUAGE;
}

/** Convenience bound translator for server components. */
export async function serverT() {
  const lang = await getServerLang();
  return (key: I18nKey, vars?: Record<string, string | number>) => translate(lang, key, vars);
}
