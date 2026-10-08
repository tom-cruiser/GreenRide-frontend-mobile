import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { en } from './en';
import { fr, type Strings } from './fr';

// French and English. The phone's language by default; the driver can change
// it in Account. Keys are typed: a missing translation is a type error.

export type Locale = 'fr' | 'en';
const DICTS: Record<Locale, Strings> = { fr, en };
const KEY = 'driverLocale';

type Paths<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Paths<T[K], `${P}${K}.`>;
}[keyof T & string];
export type TKey = Paths<Strings>;

type I18n = { locale: Locale; setLocale: (l: Locale) => void; t: (key: TKey, values?: Record<string, string | number>) => string };
const I18nContext = createContext<I18n | null>(null);

const deviceLocale = (): Locale => (getLocales()[0]?.languageCode === 'en' ? 'en' : 'fr');

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(deviceLocale);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((saved) => {
        if (saved === 'fr' || saved === 'en') setLocaleState(saved);
      })
      .catch(() => {});
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    AsyncStorage.setItem(KEY, l).catch(() => {});
  }, []);

  const t = useCallback(
    (key: TKey, values?: Record<string, string | number>) => {
      const found = key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], DICTS[locale]);
      const text = typeof found === 'string' ? found : key;
      return values ? text.replace(/\{(\w+)\}/g, (m, name) => (name in values ? String(values[name]) : m)) : text;
    },
    [locale],
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useT() {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useT must be used inside I18nProvider');
  return value;
}
