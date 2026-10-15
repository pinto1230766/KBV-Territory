import React, { useState } from 'react';
import { X, Copy, Check, Download, QrCode, Lock, ShieldCheck } from 'lucide-react';
import type { Territory, LocationItem } from '../types';
import { CryptoService } from '../services/crypto';

interface ShareModalProps {
  territory: Territory;
  locations: LocationItem[];
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  territory,
  locations,
  onClose
}) => {
  const [copied, setCopied] = useState(false);
  const [secretPassword, setSecretPassword] = useState('');
  const [isEncrypting, setIsEncrypting] = useState(false);

  const territoryLocations = locations.filter(l => l.territoryId === territory.id);
  const shareUrl = `${window.location.origin}${window.location.pathname}#/p/${territory.shortUrlCode || territory.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = async (encrypted: boolean) => {
    const exportData = {
      format: 'TerritoryHelperProgressShare',
      version: '3.1.1',
      exportedAt: new Date().toISOString(),
      territory,
      locations: territoryLocations
    };

    const jsonString = JSON.stringify(exportData, null, 2);

    if (encrypted && secretPassword.trim()) {
      setIsEncrypting(true);
      try {
        const encryptedBlob = await CryptoService.encryptThShare(jsonString, secretPassword.trim());
        const url = URL.createObjectURL(encryptedBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Territoire_${territory.number}_${territory.label.replace(/\s+/g, '_')}.thshare`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (e) {
        console.error('Erreur chiffrement:', e);
        alert('Erreur lors du chiffrement du fichier.');
      } finally {
        setIsEncrypting(false);
      }
    } else {
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Territoire_${territory.number}_${territory.label.replace(/\s+/g, '_')}.thshare.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}&color=0284c7&bgcolor=101522`;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 3000,
      padding: '1rem'
    }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '450px', padding: '1.75rem', background: '#101522', position: 'relative' }}>
        <button 
          onClick={onClose}
          style={{ position: 'absolute', right: '16px', top: '16px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
        >
          <X size={20} />
        </button>

        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <div style={{ 
            display: 'inline-flex', 
            padding: '0.5rem', 
            borderRadius: '12px', 
            background: 'var(--bg-tertiary)', 
            marginBottom: '0.5rem',
            color: '#38bdf8' 
          }}>
            <QrCode size={28} />
          </div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>Partager le Territoire {territory.number}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{territory.label}</p>
        </div>

        {/* Aperçu QR Code */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          marginBottom: '1.25rem',
          padding: '0.75rem',
          background: 'rgba(15, 23, 42, 0.7)',
          borderRadius: '12px',
          border: '1px solid var(--border-subtle)'
        }}>
          <img 
            src={qrCodeUrl} 
            alt={`QR Code Territoire ${territory.number}`}
            style={{ width: '160px', height: '160px', borderRadius: '8px' }}
          />
        </div>

        {/* Lien de partage direct */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
            Lien daccès direct
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input 
              type="text" 
              readOnly 
              value={shareUrl}
              style={{
                flex: 1,
                padding: '0.45rem 0.75rem',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                color: 'var(--text-secondary)',
                fontSize: '0.75rem',
                fontFamily: 'var(--font-mono)'
              }}
            />
            <button onClick={handleCopyLink} className="btn btn-secondary" style={{ padding: '0.45rem 0.75rem' }}>
              {copied ? <Check size={15} color="#10b981" /> : <Copy size={15} />}
            </button>
          </div>
        </div>

        {/* Option de chiffrement .thshare */}
        <div style={{ marginBottom: '1.25rem', padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 600, color: '#38bdf8', marginBottom: '6px' }}>
            <Lock size={13} /> Mot de passe de protection (format .thshare officiel)
          </label>
          <input
            type="password"
            placeholder="Laisser vide pour fichier JSON standard"
            value={secretPassword}
            onChange={(e) => setSecretPassword(e.target.value)}
            style={{
              width: '100%',
              padding: '0.45rem 0.75rem',
              background: '#0a0d14',
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
              color: 'white',
              fontSize: '0.8rem'
            }}
          />
        </div>

        {/* Boutons d'export */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {secretPassword.trim() ? (
            <button 
              onClick={() => handleExport(true)} 
              disabled={isEncrypting}
              className="btn btn-primary" 
              style={{ width: '100%', fontSize: '0.85rem' }}
            >
              <ShieldCheck size={16} />
              {isEncrypting ? 'Chiffrement...' : 'Exporter le fichier chiffré (.thshare)'}
            </button>
          ) : (
            <button 
              onClick={() => handleExport(false)} 
              className="btn btn-primary" 
              style={{ width: '100%', fontSize: '0.85rem' }}
            >
              <Download size={16} />
              Exporter (.thshare / JSON)
            </button>
          )}

          <button onClick={onClose} className="btn btn-ghost" style={{ width: '100%', fontSize: '0.8rem' }}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
