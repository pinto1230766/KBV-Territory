import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, getTranslation } from './translations';
import type { LanguageCode, Translations } from './translations';
import { StorageService } from '../services/storage';

interface LanguageContextType {
  language: LanguageCode;
  t: Translations;
  setLanguage: (lang: LanguageCode) => void;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'fr',
  t: translations.fr,
  setLanguage: () => {}
});

export const LanguageProvider: React.FC<{ children: React.ReactNode; initialLanguage?: string }> = ({ 
  children, 
  initialLanguage = 'fr' 
}) => {
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    const valid = (initialLanguage || 'fr').toLowerCase() as LanguageCode;
    return translations[valid] ? valid : 'fr';
  });

  useEffect(() => {
    if (initialLanguage && initialLanguage !== language) {
      const valid = initialLanguage.toLowerCase() as LanguageCode;
      if (translations[valid]) {
        setLanguageState(valid);
      }
    }
  }, [initialLanguage]);

  const setLanguage = (newLang: LanguageCode) => {
    setLanguageState(newLang);
    // Persist in settings
    StorageService.getSettings().then(current => {
      if (current.language !== newLang) {
        StorageService.saveSettings({ ...current, language: newLang });
      }
    }).catch(console.error);
  };

  const t = getTranslation(language);

  return (
    <LanguageContext.Provider value={{ language, t, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  return useContext(LanguageContext);
};
