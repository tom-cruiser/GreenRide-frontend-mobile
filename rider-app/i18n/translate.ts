import { getLocales } from 'expo-localization';
import { en } from './en';
import { fr, type Strings } from './fr';

// The dictionaries and lookup, without React or storage, so services and
// helpers outside components can translate too (tr). The provider in
// index.tsx keeps the language in use up to date.

export type Locale = 'fr' | 'en';
const DICTS: Record<Locale, Strings> = { fr, en };

type Paths<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Paths<T[K], `${P}${K}.`>;
}[keyof T & string];
export type TKey = Paths<Strings>;
export type Values = Record<string, string | number>;

export const deviceLocale = (): Locale => (getLocales()[0]?.languageCode === 'en' ? 'en' : 'fr');

export const translate = (locale: Locale, key: TKey, values?: Values) => {
  const found = key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], DICTS[locale]);
  const text = typeof found === 'string' ? found : key;
  return values ? text.replace(/\{(\w+)\}/g, (m, name) => (name in values ? String(values[name]) : m)) : text;
};

let current: Locale = deviceLocale();
// The language the rider picked (null until they have): sent with the push
// token so the backend writes notifications in it.
let picked: Locale | null = null;
export const setCurrentLocale = (locale: Locale) => {
  current = locale;
  picked = locale;
};
export const pickedLocale = () => picked;
export const tr = (key: TKey, values?: Values) => translate(current, key, values);
