'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import type { Locale } from '../i18n';

// Define a type for the dictionary structure
type Dictionary = any;

interface I18nContextType {
  locale: Locale;
  dictionary: Dictionary;
  t: (namespace: string, key: string, fallback?: string) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export const useTranslation = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }
  return {
    t: context.t,
    locale: context.locale
  };
};

interface I18nProviderProps {
  children: ReactNode;
  locale: Locale;
  dictionary: Dictionary;
}

export const I18nProvider = ({ children, locale, dictionary }: I18nProviderProps) => {
  const t = (namespace: string, key: string, fallback?: string): string => {
    try {
      const ns = dictionary[namespace];
      if (!ns) return fallback || key;
      const text = ns[key];
      return text !== undefined ? text : (fallback || key);
    } catch (e) {
      return fallback || key;
    }
  };

  return (
    <I18nContext.Provider value={{ locale, dictionary, t }}>
      {children}
    </I18nContext.Provider>
  );
};
