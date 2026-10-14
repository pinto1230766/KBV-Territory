import React, { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X, Camera } from 'lucide-react';

interface QrScannerModalProps {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  onScanSuccess,
  onClose
}) => {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      'qr-reader-container',
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        rememberLastUsedCamera: true,
        supportedScanTypes: []
      },
      false
    );

    scannerRef.current = scanner;

    scanner.render(
      (decodedText) => {
        scanner.clear();
        onScanSuccess(decodedText);
      },
      () => {
        // Frame non décodée, analyse continue
      }
    );

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, [onScanSuccess]);

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
      zIndex: 3500,
      padding: '1rem'
    }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '460px', padding: '1.5rem', background: '#101522', position: 'relative' }}>
        <button 
          onClick={onClose}
          style={{ position: 'absolute', right: '16px', top: '16px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
        >
          <X size={20} />
        </button>

        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'inline-flex', padding: '0.5rem', borderRadius: '12px', background: 'var(--bg-tertiary)', color: '#38bdf8', marginBottom: '0.5rem' }}>
            <Camera size={26} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Scanner une Carte de Territoire</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
            Pointez votre appareil photo vers le QR Code imprimé sur la fiche
          </p>
        </div>

        <div 
          id="qr-reader-container" 
          style={{ 
            width: '100%', 
            minHeight: '280px', 
            borderRadius: '10px', 
            overflow: 'hidden',
            border: '1px solid var(--border-subtle)',
            background: '#0a0d14'
          }} 
        />

        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
          <button onClick={onClose} className="btn btn-secondary" style={{ width: '100%', fontSize: '0.85rem' }}>
            Fermer le scanner
          </button>
        </div>
      </div>
    </div>
  );
};
