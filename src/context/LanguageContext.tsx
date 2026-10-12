"use client";

/**
 * LanguageContext — single source of truth for UI language.
 *
 * Stability contract:
 *  1. SSR seed: the layout reads the `jp-bench-lang` cookie and passes it as
 *     `initialLanguage`, so the server-rendered HTML already matches the
 *     client's first render. No hydration mismatch, no JP→EN→JP flip.
 *  2. Single live state: every localized string is rendered by a client
 *     component that subscribes to this context (the `<T/>` family and
 *     `useLanguage()` consumers). Switching language only updates React
 *     state — no router.refresh(), no navigation, no re-mount. Scroll
 *     position and focus are untouched.
 *  3. Persistence: setLanguage() writes localStorage (durable user
 *     preference) and a cookie (SSR seed for the next full page load).
 *  4. Deterministic mount-sync: on mount we only *adopt* the persisted
 *     value if it differs from the seed — state change is local, so it
 *     can never cause a scroll jump or full-page flash.
 *  5. First-visit detection: with neither storage nor cookie set, the
 *     browser language decides (ja* → ja, otherwise → en).
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_LANGUAGE,
  LANG_COOKIE,
  LANG_STORAGE,
  translate,
  type I18nKey,
  type Language,
} from "@/i18n";

type Vars = Record<string, string | number>;

export interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: I18nKey, vars?: Vars) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function cookieValue(lang: Language): string {
  return `${LANG_COOKIE}=${lang}; path=/; max-age=31536000; samesite=lax`;
}

export function LanguageProvider({
  initialLanguage,
  children,
}: {
  /** Seeded from the SSR cookie — identical for server and first client render. */
  initialLanguage: Language;
  children: ReactNode;
}) {
  const [language, setLanguageState] = useState<Language>(initialLanguage);

  /** The ONLY writer. Pure state update + persistence; never navigates. */
  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(LANG_STORAGE, lang);
    } catch {
      /* storage unavailable (private mode) — cookie still persists */
    }
    document.cookie = cookieValue(lang);
    document.documentElement.lang = lang;
  }, []);

  /**
   * Mount-only sync. Runs after hydration; adopts the persisted preference
   * (localStorage > cookie > navigator) when it differs from the SSR seed.
   * State-only change — zero reloads, zero refreshes.
   */
  useEffect(() => {
    let persisted: string | null = null;
    try {
      persisted = localStorage.getItem(LANG_STORAGE);
    } catch {
      persisted = null;
    }
    const cookieHas = document.cookie.includes(`${LANG_COOKIE}=`);
    const detected: Language =
      persisted === "ja" || persisted === "en"
        ? persisted
        : !cookieHas && (navigator.language ?? "").toLowerCase().startsWith("ja")
          ? "ja"
          : !cookieHas
            ? "en"
            : language;

    if (detected !== language) {
      setLanguage(detected);
    } else {
      // Keep storage and DOM attribute converged even without a change.
      try {
        localStorage.setItem(LANG_STORAGE, language);
      } catch {
        /* noop */
      }
      if (!cookieHas) document.cookie = cookieValue(language);
      document.documentElement.lang = language;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const t = useCallback(
    (key: I18nKey, vars?: Vars) => translate(language, key, vars),
    [language],
  );

  const value = useMemo(
    () => ({ language, setLanguage, t }),
    [language, setLanguage, t],
  );
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    // Defensive fallback for isolated renders (tests, storybook).
    return {
      language: DEFAULT_LANGUAGE,
      setLanguage: () => {},
      t: (key, vars) => translate(DEFAULT_LANGUAGE, key, vars),
    };
  }
  return ctx;
}
