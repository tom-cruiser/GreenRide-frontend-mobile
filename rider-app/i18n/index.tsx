import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../services/api';
import { deviceLocale, setCurrentLocale, translate, type Locale, type TKey, type Values } from './translate';

export { tr, type Locale, type TKey } from './translate';

// French and English. The rider picks one on first launch (the phone's
// language is preselected) and can change it in Settings. Keys are typed: a
// missing translation is a type error.

const KEY = 'riderLocale';

type I18n = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  // null while the saved choice loads; false until the rider has picked one.
  chosen: boolean | null;
  t: (key: TKey, values?: Values) => string;
};
const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(deviceLocale);
  const [chosen, setChosen] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((saved) => {
        if (saved === 'fr' || saved === 'en') {
          setCurrentLocale(saved);
          setLocaleState(saved);
        }
        setChosen(saved === 'fr' || saved === 'en');
      })
      .catch(() => setChosen(false));
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setCurrentLocale(l);
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

  const t = useCallback((key: TKey, values?: Values) => translate(locale, key, values), [locale]);

  const value = useMemo(() => ({ locale, setLocale, chosen, t }), [locale, setLocale, chosen, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useT() {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useT must be used inside I18nProvider');
  return value;
}
