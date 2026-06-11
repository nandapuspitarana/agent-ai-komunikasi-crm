import 'server-only';

export type Locale = 'en' | 'id' | 'zh' | 'ko' | 'th';

const dictionaries = {
  en: () => import('@/dictionaries/en.json').then((module) => module.default),
  id: () => import('@/dictionaries/id.json').then((module) => module.default),
  zh: () => import('@/dictionaries/zh.json').then((module) => module.default),
  ko: () => import('@/dictionaries/ko.json').then((module) => module.default),
  th: () => import('@/dictionaries/th.json').then((module) => module.default),
};

export const getDictionary = async (locale: Locale) => {
  if (dictionaries[locale]) {
    return dictionaries[locale]();
  }
  return dictionaries['en'](); // Fallback to English if invalid locale (e.g. favicon.ico) is routed
};
