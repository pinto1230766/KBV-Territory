import React, { useState, useRef } from 'react';
import { 
  Upload, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle
} from 'lucide-react';
import { parseTerritoryHelperFile } from '../utils/territoryHelperImporter';
import type { ImportResult } from '../utils/territoryHelperImporter';
import { StorageService } from '../services/storage';
import type { Territory } from '../types';

interface TerritoryHelperImportModalProps {
  onImportComplete: () => void;
  onClose: () => void;
}

export const TerritoryHelperImportModal: React.FC<TerritoryHelperImportModalProps> = ({
  onImportComplete,
  onClose
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<'upload' | 'preview'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (file: File) => {
    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        const result = parseTerritoryHelperFile(content, file.name);
        setImportResult(result);
        setIsProcessing(false);
        if (result.success && result.territories.length > 0) {
          setCurrentStep('preview');
        }
      }
    };
    reader.onerror = () => {
      setIsProcessing(false);
      alert('Erreur lors de la lecture du fichier.');
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files[0]);
    }
  };

  const handleConfirmImport = async () => {
    if (!importResult || importResult.territories.length === 0) return;

    try {
      if (importMode === 'replace') {
        await StorageService.saveTerritories(importResult.territories);
      } else {
        // Merge : fusionne par ID ou par Numéro
        const existing = await StorageService.getTerritories();
        const merged: Territory[] = [...existing];

        importResult.territories.forEach(newTerr => {
          const idx = merged.findIndex(t => t.number.toLowerCase() === newTerr.number.toLowerCase());
          if (idx !== -1) {
            // Mise à jour de la frontière et des données
            merged[idx] = {
              ...merged[idx],
              boundary: newTerr.boundary,
              centerCoordinates: newTerr.centerCoordinates,
              label: newTerr.label || merged[idx].label
            };
          } else {
            merged.push(newTerr);
          }
        });
        await StorageService.saveTerritories(merged);
      }

      alert(`✓ ${importResult.territories.length} territoire(s) importé(s) avec succès dans votre application !`);
      onImportComplete();
      onClose();
    } catch (err) {
      alert(`Erreur lors de l'enregistrement : ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(5, 10, 20, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '1rem'
    }}>
      <div 
        className="glass-panel" 
        style={{
          width: '100%',
          maxWidth: '750px',
          maxHeight: '92vh',
          overflowY: 'auto',
          borderRadius: '16px',
          padding: '1.75rem',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7)',
          border: '1px solid rgba(56, 189, 248, 0.35)'
        }}
      >
        {/* En-tête */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: '0 4px 15px rgba(2, 132, 199, 0.4)'
            }}>
              <Upload size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, color: '#fff' }}>
                Importer depuis Territory Helper
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0' }}>
                Récupérez tous vos territoires découpés, polygones GPS et adresses existants
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="btn-icon" 
            style={{ color: 'var(--text-muted)', padding: '0.4rem' }}
          >
            <X size={20} />
          </button>
        </div>

        {currentStep === 'upload' ? (
          <div>
            {/* Guide pas-à-pas : Comment faire sur Territory Helper */}
            <div style={{
              background: 'rgba(2, 132, 199, 0.08)',
              border: '1px solid rgba(2, 132, 199, 0.25)',
              borderRadius: '12px',
              padding: '1rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: 6, marginBottom: '0.5rem' }}>
                <HelpCircle size={16} /> Comment exporter depuis Territory Helper (3 clics) :
              </div>
              <ol style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.6 }}>
                <li>
                  Connectez-vous à <strong>territoryhelper.com</strong> avec le compte de votre congrégation.
                </li>
                <li>
                  Allez dans l'onglet <strong>Territoires</strong>, cliquez sur <strong>Actions</strong> (ou <strong>Exporter</strong>) puis choisissez :
                  <ul style={{ marginTop: '0.25rem', color: '#94a3b8' }}>
                    <li><strong style={{ color: '#fff' }}>Google Earth (KML)</strong> <em>(Recommandé : contient 100% des polygones et frontières découpées)</em></li>
                    <li>ou <strong style={{ color: '#fff' }}>GeoJSON</strong> / <strong style={{ color: '#fff' }}>Sauvegarde JSON</strong></li>
                  </ul>
                </li>
                <li>
                  Glissez-déposez le fichier téléchargé dans la zone ci-dessous.
                </li>
              </ol>
            </div>

            {/* Zone de Drag and Drop */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: dragActive ? '2px dashed #38bdf8' : '2px dashed rgba(255, 255, 255, 0.2)',
                background: dragActive ? 'rgba(56, 189, 248, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                borderRadius: '12px',
                padding: '2.5rem 1.5rem',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                marginBottom: '1.25rem'
              }}
            >
              <input 
                ref={fileInputRef}
                type="file" 
                accept=".kml,.geojson,.json,.csv,.thshare,.thbackup"
                style={{ display: 'none' }}
                onChange={(e) => e.target.files?.[0] && handleFiles(e.target.files[0])}
              />

              <div style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'rgba(56, 189, 248, 0.15)',
                color: '#38bdf8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem auto'
              }}>
                <Upload size={28} />
              </div>

              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.35rem' }}>
                {isProcessing ? 'Analyse du fichier en cours...' : 'Cliquez ici ou déposez votre fichier Territory Helper'}
              </div>

              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Formats acceptés : <strong>.kml</strong>, <strong>.geojson</strong>, <strong>.csv</strong>, <strong>.json</strong>
              </div>
            </div>

            {/* Message d'erreur éventuel */}
            {importResult && !importResult.success && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid #ef4444',
                color: '#f87171',
                fontSize: '0.85rem'
              }}>
                <AlertCircle size={18} />
                <span>{importResult.message}</span>
              </div>
            )}
          </div>
        ) : (
          /* Étape 2 : Prévisualisation des territoires trouvés */
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '10px',
              padding: '0.85rem 1rem',
              marginBottom: '1.25rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={20} color="#10b981" />
                <div>
                  <div style={{ fontWeight: 700, color: '#34d399', fontSize: '0.92rem' }}>
                    {importResult?.importedCount} territoire(s) détecté(s) avec succès !
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Tous les polygones et frontières géographiques ont été extraits.
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setCurrentStep('upload')}
                className="btn btn-ghost"
                style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
              >
                Changer de fichier
              </button>
            </div>

            {/* Mode d'importation */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.45rem' }}>
                Mode d'intégration dans votre application :
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setImportMode('merge')}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '8px',
                    textAlign: 'left',
                    border: importMode === 'merge' ? '1px solid #38bdf8' : '1px solid var(--border-subtle)',
                    background: importMode === 'merge' ? 'rgba(56, 189, 248, 0.18)' : 'rgba(255, 255, 255, 0.03)',
                    color: importMode === 'merge' ? '#38bdf8' : 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Fusionner / Ajouter</div>
                  <div style={{ fontSize: '0.72rem', opacity: 0.8, marginTop: '2px' }}>
                    Met à jour les territoires existants et ajoute les nouveaux sans rien effacer.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setImportMode('replace')}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '8px',
                    textAlign: 'left',
                    border: importMode === 'replace' ? '1px solid #f59e0b' : '1px solid var(--border-subtle)',
                    background: importMode === 'replace' ? 'rgba(245, 158, 11, 0.18)' : 'rgba(255, 255, 255, 0.03)',
                    color: importMode === 'replace' ? '#fbbf24' : 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Remplacer totalement</div>
                  <div style={{ fontSize: '0.72rem', opacity: 0.8, marginTop: '2px' }}>
                    Remplace tous les territoires actuels par ceux du fichier importé.
                  </div>
                </button>
              </div>
            </div>

            {/* Liste aperçu des territoires */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Aperçu des territoires à importer :
              </div>
              <div style={{
                maxHeight: '220px',
                overflowY: 'auto',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                background: 'rgba(0,0,0,0.2)'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.05)', textAlign: 'left', borderBottom: '1px solid var(--border-subtle)' }}>
                      <th style={{ padding: '0.45rem 0.75rem' }}>N°</th>
                      <th style={{ padding: '0.45rem 0.75rem' }}>Nom</th>
                      <th style={{ padding: '0.45rem 0.75rem' }}>Points GPS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importResult?.territories.map(t => (
                      <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '0.45rem 0.75rem', fontWeight: 700, color: '#38bdf8' }}>{t.number}</td>
                        <td style={{ padding: '0.45rem 0.75rem', color: '#fff' }}>{t.label}</td>
                        <td style={{ padding: '0.45rem 0.75rem', color: 'var(--text-muted)' }}>{t.boundary.length} coordonnées</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions de confirmation */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setCurrentStep('upload')}
                className="btn btn-ghost"
                style={{ padding: '0.6rem 1.1rem' }}
              >
                Retour
              </button>

              <button
                type="button"
                onClick={handleConfirmImport}
                className="btn btn-primary"
                style={{
                  padding: '0.6rem 1.35rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontWeight: 700
                }}
              >
                <CheckCircle2 size={18} />
                <span>Confirmer l'importation ({importResult?.importedCount})</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
