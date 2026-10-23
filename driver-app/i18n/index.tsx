import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../services/api';
import { en } from './en';
import { fr, type Strings } from './fr';
import { setPickedLocale } from './picked';

// French and English. The driver picks one on first launch (the phone's
// language is preselected) and can change it in Account. Keys are typed: a
// missing translation is a type error.

export type Locale = 'fr' | 'en';
const DICTS: Record<Locale, Strings> = { fr, en };
const KEY = 'driverLocale';

type Paths<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Paths<T[K], `${P}${K}.`>;
}[keyof T & string];
export type TKey = Paths<Strings>;

type I18n = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  // null while the saved choice loads; false until the driver has picked one.
  chosen: boolean | null;
  t: (key: TKey, values?: Record<string, string | number>) => string;
};
const I18nContext = createContext<I18n | null>(null);

const deviceLocale = (): Locale => (getLocales()[0]?.languageCode === 'en' ? 'en' : 'fr');

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(deviceLocale);
  const [chosen, setChosen] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((saved) => {
        if (saved === 'fr' || saved === 'en') {
          setPickedLocale(saved);
          setLocaleState(saved);
        }
        setChosen(saved === 'fr' || saved === 'en');
      })
      .catch(() => setChosen(false));
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setPickedLocale(l);
    setLocaleState(l);
    setChosen(true);
    AsyncStorage.setItem(KEY, l).catch(() => {});
  }, []);

  // The backend writes notifications and pushes in this language: tell it
  // after sign-in and on every change.
  const { token } = useAuth();
  useEffect(() => {
    if (token && chosen) authAPI.updateProfile(token, { language: locale }).catch(() => {});
  }, [token, chosen, locale]);

  const t = useCallback(
    (key: TKey, values?: Record<string, string | number>) => {
      const found = key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], DICTS[locale]);
      const text = typeof found === 'string' ? found : key;
      return values ? text.replace(/\{(\w+)\}/g, (m, name) => (name in values ? String(values[name]) : m)) : text;
    },
    [locale],
  );

  const value = useMemo(() => ({ locale, setLocale, chosen, t }), [locale, setLocale, chosen, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useT() {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useT must be used inside I18nProvider');
  return value;
}
