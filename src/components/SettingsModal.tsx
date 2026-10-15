import React, { useRef, useState, useEffect } from 'react';
import { 
  X, 
  Download, 
  Upload, 
  RefreshCw, 
  Check, 
  Settings, 
  Database, 
  User, 
  Mail, 
  LogOut, 
  Globe, 
  Map, 
  ShieldCheck, 
  FileText, 
  Bug, 
  Trash2, 
  ExternalLink,
  Info,
  Calendar
} from 'lucide-react';
import { StorageService } from '../services/storage';
import type { CongregationSettings } from '../types';
import { useTranslation } from '../i18n/LanguageContext';
import type { LanguageCode } from '../i18n/translations';

interface SettingsModalProps {
  settings: CongregationSettings;
  onUpdateSettings: (settings: CongregationSettings) => void;
  onDataImported: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onDataImported,
  onClose
}) => {
  const { t, language, setLanguage } = useTranslation();
  const [localSettings, setLocalSettings] = useState<CongregationSettings>({
    ...settings,
    publisherEmail: settings.publisherEmail || 'jean.dupont@congre.org',
    showMapPreview: settings.showMapPreview !== undefined ? settings.showMapPreview : true,
    defaultAssignmentMonths: settings.defaultAssignmentMonths || 4,
    appVersion: settings.appVersion || '4.2.1-fr'
  });

  const [activeTab, setActiveTab] = useState<'general' | 'account' | 'privacy' | 'data' | 'about'>('general');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [cacheClearedSuccess, setCacheClearedSuccess] = useState(false);
  const [bugReportGenerated, setBugReportGenerated] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalSettings(prev => ({
      ...prev,
      ...settings
    }));
  }, [settings]);

  const languages = [
    { code: 'fr', label: 'Français', flag: '🇫🇷', native: 'Français (France)' },
    { code: 'pt', label: 'Português', flag: '🇵🇹', native: 'Português (Portugal/Brasil)' },
    { code: 'kea', label: 'Kriolu kabuverdianu', flag: '🇨🇻', native: 'Cap-Verdien (Kabuverdianu)' },
    { code: 'en', label: 'English', flag: '🇬🇧', native: 'English' },
    { code: 'es', label: 'Español', flag: '🇪🇸', native: 'Español' }
  ];

  const handleLanguageChange = (langCode: string) => {
    const updated = { ...localSettings, language: langCode };
    setLocalSettings(updated);
    setLanguage(langCode as LanguageCode);
    onUpdateSettings(updated);
  };

  const handleThemeChange = (th: 'dark' | 'light' | 'system') => {
    const updated = { ...localSettings, theme: th };
    setLocalSettings(updated);
    onUpdateSettings(updated);
    const resolved = th === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : th;
    document.documentElement.setAttribute('data-theme', resolved);
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onUpdateSettings(localSettings);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleLogout = () => {
    if (confirm('Voulez-vous vraiment vous déconnecter de la session active ? Les données locales resteront sécurisées sur cet appareil.')) {
      const updated: CongregationSettings = {
        ...localSettings,
        publisherName: 'Invité / Non connecté',
        publisherEmail: ''
      };
      setLocalSettings(updated);
      onUpdateSettings(updated);
      alert('Vous avez été déconnecté avec succès.');
    }
  };

  const handleExportFullBackup = async () => {
    const json = await StorageService.exportData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `KBV_Territory_Backup_${new Date().toISOString().split('T')[0]}.thbackup`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (content) {
        const ok = await StorageService.importData(content);
        if (ok) {
          alert('Données et territoires importés avec succès !');
          onDataImported();
          onClose();
        } else {
          alert('Fichier invalide ou corrompu.');
        }
      }
    };
    reader.readAsText(file);
  };

  const handleClearCache = async () => {
    if (confirm('Vider le cache de l\'application ? Cela nettoiera la mémoire tampon des cartes et libérera de l\'espace.')) {
      try {
        const keysToRemove = Object.keys(localStorage).filter(k => k.startsWith('th_cache_') || k.startsWith('leaflet_'));
        keysToRemove.forEach(k => localStorage.removeItem(k));
        setCacheClearedSuccess(true);
        setTimeout(() => setCacheClearedSuccess(false), 3000);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleGenerateBugReport = () => {
    const report = {
      app: 'KBV Territory',
      version: localSettings.appVersion || '4.2.1-fr',
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      screenResolution: `${window.innerWidth}x${window.innerHeight}`,
      language: localSettings.language,
      gdprCompliant: localSettings.gdprCompliant,
      storageKeysCount: Object.keys(localStorage).length,
      status: 'Diagnostic généré sans aucune donnée personnelle transmise.'
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BugReport-${new Date().toISOString().replace(/[:.]/g, '-')}.thbug`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setBugReportGenerated(true);
    setTimeout(() => setBugReportGenerated(false), 4000);
  };

  const handleReset = async () => {
    if (confirm('Êtes-vous sûr de vouloir réinitialiser les données aux territoires par défaut ?')) {
      await StorageService.resetToDefaults();
      onDataImported();
      onClose();
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 3000,
      padding: '1rem'
    }}>
      <div className="glass-panel" style={{ 
        width: '100%', 
        maxWidth: '580px', 
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-secondary)', 
        position: 'relative',
        borderRadius: '16px',
        border: '1px solid var(--border-subtle)',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
      }}>
        {/* En-tête */}
        <div style={{ 
          padding: '1.25rem 1.5rem', 
          borderBottom: '1px solid var(--border-subtle)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          background: 'rgba(255, 255, 255, 0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '0.55rem', background: 'rgba(56, 189, 248, 0.15)', borderRadius: '10px', color: '#38bdf8' }}>
              <Settings size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>{t.settings}</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', margin: 0 }}>KBV Territory</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Barre d'onglets */}
        <div style={{ 
          display: 'flex', 
          gap: '0.25rem', 
          padding: '0.5rem 1rem', 
          background: 'var(--bg-tertiary)', 
          borderBottom: '1px solid var(--border-subtle)',
          overflowX: 'auto'
        }}>
          {[
            { id: 'general', label: t.tabGeneral, icon: <Settings size={14} /> },
            { id: 'account', label: t.tabPublisher, icon: <User size={14} /> },
            { id: 'privacy', label: t.tabPrivacy, icon: <ShieldCheck size={14} /> },
            { id: 'data', label: t.tabBackups, icon: <Database size={14} /> },
            { id: 'about', label: t.tabAbout, icon: <Info size={14} /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.8rem',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: activeTab === tab.id ? 700 : 500,
                background: activeTab === tab.id ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                border: activeTab === tab.id ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid transparent',
                color: activeTab === tab.id ? '#38bdf8' : 'var(--text-secondary)',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Corps du modal défilable */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem' }}>
          
          {/* ONGLET 1: GÉNÉRAL */}
          {activeTab === 'general' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}>
                  {t.congregationName}
                </label>
                <input 
                  type="text" 
                  value={localSettings.congregationName}
                  onChange={(e) => {
                    const updated = { ...localSettings, congregationName: e.target.value };
                    setLocalSettings(updated);
                    onUpdateSettings(updated);
                  }}
                  style={{ width: '100%', padding: '0.6rem 0.75rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                />
              </div>

              {/* Coordonnées du préposé aux territoires pour WhatsApp */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}>
                    Frère préposé aux territoires
                  </label>
                  <input 
                    type="text" 
                    placeholder="ex: Frère Silva"
                    value={localSettings.territoryServantName || ''}
                    onChange={(e) => {
                      const updated = { ...localSettings, territoryServantName: e.target.value };
                      setLocalSettings(updated);
                      onUpdateSettings(updated);
                    }}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}>
                    N° WhatsApp du préposé
                  </label>
                  <input 
                    type="tel" 
                    placeholder="ex: +33612345678"
                    value={localSettings.territoryServantPhone || ''}
                    onChange={(e) => {
                      const updated = { ...localSettings, territoryServantPhone: e.target.value };
                      setLocalSettings(updated);
                      onUpdateSettings(updated);
                    }}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              {/* Choix de langues multilingues */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  <Globe size={15} color="#38bdf8" /> {t.appLanguage}
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem' }}>
                  {languages.map(lang => {
                    const isSelected = (language === lang.code) || (localSettings.language === lang.code);
                    return (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => handleLanguageChange(lang.code)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.6rem 0.75rem',
                          borderRadius: '8px',
                          background: isSelected ? 'rgba(56, 189, 248, 0.18)' : 'var(--bg-tertiary)',
                          border: isSelected ? '1px solid #38bdf8' : '1px solid var(--border-subtle)',
                          color: isSelected ? '#38bdf8' : 'var(--text-primary)',
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        <span style={{ fontSize: '1.2rem' }}>{lang.flag}</span>
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontWeight: isSelected ? 700 : 500 }}>{lang.label}</div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {lang.native}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Thème clair / sombre / système */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}>
                  {t.displayTheme}
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {([
                    { id: 'dark', label: t.themeDark },
                    { id: 'light', label: t.themeLight },
                    { id: 'system', label: t.themeSystem }
                  ] as const).map(th => (
                    <button
                      key={th.id}
                      type="button"
                      onClick={() => handleThemeChange(th.id)}
                      style={{
                        flex: 1,
                        padding: '0.55rem',
                        borderRadius: '6px',
                        background: localSettings.theme === th.id ? 'rgba(56, 189, 248, 0.2)' : 'var(--bg-tertiary)',
                        border: localSettings.theme === th.id ? '1px solid #38bdf8' : '1px solid var(--border-subtle)',
                        color: localSettings.theme === th.id ? '#38bdf8' : 'var(--text-secondary)',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {th.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Durée par défaut d'attribution */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}>
                  <Calendar size={15} color="#38bdf8" /> {t.defaultDueDuration}
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.45rem' }}>
                  {[
                    { m: 1, label: t.months1 },
                    { m: 2, label: t.months2 },
                    { m: 3, label: t.months3 },
                    { m: 4, label: t.months4 },
                    { m: 6, label: t.months6 }
                  ].map(opt => {
                    const isSelected = localSettings.defaultAssignmentMonths === opt.m;
                    return (
                      <button
                        key={opt.m}
                        type="button"
                        onClick={() => {
                          const updated = { ...localSettings, defaultAssignmentMonths: opt.m };
                          setLocalSettings(updated);
                          onUpdateSettings(updated);
                        }}
                        style={{
                          padding: '0.5rem 0.6rem',
                          borderRadius: '8px',
                          background: isSelected ? 'rgba(56, 189, 248, 0.2)' : 'var(--bg-tertiary)',
                          border: isSelected ? '1px solid #38bdf8' : '1px solid var(--border-subtle)',
                          color: isSelected ? '#38bdf8' : 'var(--text-secondary)',
                          fontSize: '0.75rem',
                          fontWeight: isSelected ? 700 : 500,
                          cursor: 'pointer',
                          textAlign: 'center'
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Poursuite de la carte / Aperçu de la carte */}
              <div style={{ 
                padding: '0.85rem', 
                background: 'var(--bg-tertiary)', 
                borderRadius: '8px', 
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Map size={18} color="#38bdf8" />
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>{t.mapPreview}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {t.mapPreviewDesc}
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={localSettings.showMapPreview}
                  onChange={(e) => {
                    const updated = { ...localSettings, showMapPreview: e.target.checked };
                    setLocalSettings(updated);
                    onUpdateSettings(updated);
                  }}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#38bdf8' }}
                />
              </div>

              {/* Code PIN de sécurité Responsable / Administrateur */}
              <div style={{
                background: 'rgba(2, 132, 199, 0.08)',
                border: '1px solid rgba(2, 132, 199, 0.3)',
                borderRadius: '10px',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.6rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <ShieldCheck size={20} color="#38bdf8" />
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Code PIN Administrateur (Console Responsable)
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      Protège les fonctions de gestion, découpage et registres S-12 / S-13.
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="1914"
                    value={localSettings.adminPin || '1914'}
                    onChange={(e) => {
                      const updated = { ...localSettings, adminPin: e.target.value.replace(/[^0-9]/g, '') };
                      setLocalSettings(updated);
                      onUpdateSettings(updated);
                    }}
                    style={{
                      width: '120px',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '8px',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-subtle)',
                      color: '#38bdf8',
                      fontSize: '1.1rem',
                      fontWeight: 800,
                      letterSpacing: '0.2em',
                      textAlign: 'center'
                    }}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    (4 à 6 chiffres, par défaut : <strong>1914</strong>)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ONGLET 2: COMPTE / PROCLAMATEUR */}
          {activeTab === 'account' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #0ea5e9, #38bdf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '1.1rem' }}>
                  {localSettings.publisherName ? localSettings.publisherName[0].toUpperCase() : 'P'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>{localSettings.publisherName || 'Proclamateur'}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Mail size={12} /> {localSettings.publisherEmail || 'Non renseigné'}
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}>
                  {t.publisherNameLabel}
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 10, top: 11 }} />
                  <input 
                    type="text" 
                    value={localSettings.publisherName}
                    onChange={(e) => {
                      const updated = { ...localSettings, publisherName: e.target.value };
                      setLocalSettings(updated);
                      onUpdateSettings(updated);
                    }}
                    style={{ width: '100%', padding: '0.6rem 0.75rem 0.6rem 2.2rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}>
                  {t.publisherEmailLabel}
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 10, top: 11 }} />
                  <input 
                    type="email" 
                    value={localSettings.publisherEmail || ''}
                    placeholder="exemple@domaine.com"
                    onChange={(e) => {
                      const updated = { ...localSettings, publisherEmail: e.target.value };
                      setLocalSettings(updated);
                      onUpdateSettings(updated);
                    }}
                    style={{ width: '100%', padding: '0.6rem 0.75rem 0.6rem 2.2rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={handleLogout}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    width: '100%',
                    padding: '0.65rem',
                    borderRadius: '8px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#ef4444',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  <LogOut size={16} /> {t.logout}
                </button>
              </div>
            </div>
          )}

          {/* ONGLET 3: RGPD & CNIL */}
          {activeTab === 'privacy' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{
                background: 'rgba(56, 189, 248, 0.08)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                borderRadius: '10px',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <ShieldCheck size={24} color="#38bdf8" />
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#38bdf8' }}>
                        {t.gdprTitle}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                        Règlement UE 2016/679 & Décisions CNIL
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={localSettings.gdprCompliant}
                    onChange={(e) => {
                      const updated = { ...localSettings, gdprCompliant: e.target.checked };
                      setLocalSettings(updated);
                      onUpdateSettings(updated);
                    }}
                    style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#38bdf8' }}
                  />
                </div>

                <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.5, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div>
                    <strong>• Article 9 du RGPD :</strong> Interdiction totale d'enregistrer des informations révélant les opinions religieuses ou philosophiques d'une personne sans son consentement exprès.
                  </div>
                  <div>
                    <strong>• Interdiction du profilage individuel :</strong> Aucun nom de famille d'habitant, aucune attitude personnelle ne doit être partagée ou centralisée.
                  </div>
                  <div>
                    <strong>• Notes matérielles autorisées uniquement :</strong> Seules les caractéristiques physiques d'accès au bâtiment (code porte, interphone, sonnette, entrée cour) peuvent être consignées.
                  </div>
                  <div>
                    <strong>• Droit d'opposition (DNC - Art. 21 du RGPD) :</strong> La mention "Ne pas appeler" est strictement liée à l'adresse postale pour respecter la volonté de l'occupant.
                  </div>
                </div>
              </div>

              {/* Liens légaux officiels */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <a
                  href="https://www.territoryhelper.com/Legal/Privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.7rem 0.85rem',
                    background: 'var(--bg-tertiary)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '0.8rem',
                    textDecoration: 'none'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileText size={16} color="#38bdf8" /> Politique de Confidentialité
                  </span>
                  <ExternalLink size={14} color="var(--text-muted)" />
                </a>

                <a
                  href="https://www.territoryhelper.com/Legal/Terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.7rem 0.85rem',
                    background: 'var(--bg-tertiary)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '0.8rem',
                    textDecoration: 'none'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileText size={16} color="#38bdf8" /> Conditions Générales d'Utilisation
                  </span>
                  <ExternalLink size={14} color="var(--text-muted)" />
                </a>
              </div>
            </div>
          )}

          {/* ONGLET 4: DONNÉES, SAUVEGARDES & CACHE */}
          {activeTab === 'data' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={handleExportFullBackup}
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.65rem', fontSize: '0.8rem' }}
                >
                  <Download size={16} /> {t.backupBtn}
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.65rem', fontSize: '0.8rem' }}
                >
                  <Upload size={16} /> {t.restoreBtn}
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileSelect} 
                  accept=".json,.thbackup" 
                  style={{ display: 'none' }} 
                />
              </div>

              {/* Maintenance : Vider le cache & Signaler bug */}
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  Maintenance & Assistance
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                  <button
                    type="button"
                    onClick={handleClearCache}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      padding: '0.6rem',
                      borderRadius: '8px',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '0.78rem',
                      cursor: 'pointer'
                    }}
                  >
                    <Trash2 size={15} color="#f59e0b" />
                    {cacheClearedSuccess ? t.cacheCleared : t.clearCache}
                  </button>

                  <button
                    type="button"
                    onClick={handleGenerateBugReport}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      padding: '0.6rem',
                      borderRadius: '8px',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '0.78rem',
                      cursor: 'pointer'
                    }}
                  >
                    <Bug size={15} color="#38bdf8" />
                    {bugReportGenerated ? t.bugReported : t.reportBug}
                  </button>
                </div>

                {bugReportGenerated && (
                  <div style={{ padding: '0.5rem', background: 'rgba(56, 189, 248, 0.1)', borderRadius: '6px', fontSize: '0.72rem', color: '#38bdf8' }}>
                    ✓ Fichier .thbug de diagnostic généré et téléchargé avec succès.
                  </div>
                )}
                {cacheClearedSuccess && (
                  <div style={{ padding: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '6px', fontSize: '0.72rem', color: '#10b981' }}>
                    ✓ La mémoire tampon et les tuiles de cartes temporaires ont été nettoyées.
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleReset}
                  className="btn btn-ghost"
                  style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.5rem', alignSelf: 'flex-start' }}
                >
                  <RefreshCw size={13} /> {t.resetDefaults}
                </button>
              </div>
            </div>
          )}

          {/* ONGLET 5: À PROPOS & VERSION */}
          {activeTab === 'about' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ width: 56, height: 56, borderRadius: '14px', background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', color: 'white', fontWeight: 900, fontSize: '1.25rem', letterSpacing: '-0.02em', boxShadow: '0 10px 20px -5px rgba(14, 165, 233, 0.5)' }}>
                KBV
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 4px 0', color: 'var(--text-primary)' }}>KBV Territory</h3>
                <div style={{ fontSize: '0.8rem', color: '#38bdf8', fontWeight: 600 }}>
                  Version {localSettings.appVersion || '4.2.1-fr'} (Build 2026.10)
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Suite d'applications KBV pour la gestion des territoires et visites
                </div>
              </div>

              <div style={{ 
                margin: '0.5rem 0',
                padding: '0.85rem', 
                background: 'var(--bg-tertiary)', 
                borderRadius: '8px', 
                border: '1px solid var(--border-subtle)', 
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.5,
                textAlign: 'left'
              }}>
                <div><strong>• Cartographie :</strong> Moteur multi-fournisseurs (14 fonds de carte OSM, Esri, CartoDB, Google Maps)</div>
                <div><strong>• Chiffrement :</strong> Protection locale des données selon les directives CNIL & RGPD</div>
                <div><strong>• Mode Hors-ligne :</strong> Stockage persistant IndexedDB & localforage</div>
              </div>

              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                © 2026 KBV Territory. Développé pour la gestion et l'organisation harmonieuse des territoires.
              </div>
            </div>
          )}
        </div>

        {/* Pied de page avec Enregistrer */}
        <div style={{ 
          padding: '1rem 1.5rem', 
          borderTop: '1px solid var(--border-subtle)', 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(255, 255, 255, 0.02)'
        }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            v{localSettings.appVersion || '4.2.1-fr'}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button 
              type="button" 
              onClick={onClose} 
              className="btn btn-secondary" 
              style={{ padding: '0.45rem 0.9rem', fontSize: '0.82rem' }}
            >
              {t.close}
            </button>
            <button 
              type="button" 
              onClick={() => handleSave()} 
              className="btn btn-primary" 
              style={{ padding: '0.45rem 1.1rem', fontSize: '0.82rem' }}
            >
              {savedSuccess ? <Check size={16} color="#10b981" /> : null}
              {savedSuccess ? t.saved : t.save}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
