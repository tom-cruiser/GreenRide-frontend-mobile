import type { Locale } from './index';

// The language the driver picked (null until they have), outside React: sent
// with the push token so the backend writes notifications in it.
let picked: Locale | null = null;
export const setPickedLocale = (locale: Locale) => {
  picked = locale;
};
export const pickedLocale = () => picked;
