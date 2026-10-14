import React, { useRef } from 'react';
import { X, Printer, AlertTriangle } from 'lucide-react';
import type { Territory, LocationItem, CongregationSettings } from '../types';

interface PrintTerritoryModalProps {
  territory: Territory;
  locations: LocationItem[];
  settings: CongregationSettings;
  onClose: () => void;
}

export const PrintTerritoryModal: React.FC<PrintTerritoryModalProps> = ({
  territory,
  locations,
  settings,
  onClose
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null);
  const territoryLocations = locations.filter(l => l.territoryId === territory.id);

  const handlePrint = () => {
    window.print();
  };

  const totalDoors = territoryLocations.reduce((acc, l) => acc + (l.units.length > 0 ? l.units.length : 1), 0);
  const doNotCalls = territoryLocations.filter(l => l.status === 'do_not_call' || l.units.some(u => u.status === 'do_not_call'));

  // Groupement par rue
  const streetsMap = new Map<string, LocationItem[]>();
  territoryLocations.forEach(loc => {
    const list = streetsMap.get(loc.streetName) || [];
    list.push(loc);
    streetsMap.set(loc.streetName, list);
  });

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 3400,
      padding: '1rem'
    }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '900px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', background: '#0b0f19', border: '1px solid var(--border-subtle)' }}>
        {/* Barre d'action supérieure (masquée à l'impression) */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(16, 21, 34, 0.9)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '0.45rem', background: 'rgba(2, 132, 199, 0.2)', color: '#38bdf8', borderRadius: '8px' }}>
              <Printer size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Imprimer la fiche du Territoire {territory.number}</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mise en page officielle A4 prête pour la prédication</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button onClick={handlePrint} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
              <Printer size={16} /> Lancer l'impression
            </button>
            <button onClick={onClose} className="btn btn-secondary" style={{ padding: '0.5rem' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Zone de contenu imprimable */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
          <div 
            ref={printAreaRef}
            className="printable-sheet"
            style={{
              background: '#ffffff',
              color: '#0f172a',
              padding: '2.5rem',
              borderRadius: '8px',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}
          >
            {/* En-tête Fiche Territoire */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0f172a', paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
              <div>
                <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', fontWeight: 700 }}>
                  Congrégation des Témoins de Jéhovah &bull; {settings.congregationName}
                </div>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 900, margin: '4px 0', color: '#0f172a' }}>
                  FICHE DE TERRITOIRE N° {territory.number}
                </h1>
                <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#334155' }}>
                  {territory.label} ({territory.type === 'urban' ? 'Urbain' : territory.type === 'residential' ? 'Résidentiel' : 'Rural'})
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#475569' }}>
                  <div>Proclamateur : <strong>{territory.assignee || '___________________'}</strong></div>
                  <div>Attribué le : <strong>{territory.dateAssigned || '____ / ____ / 2026'}</strong></div>
                  <div>À rendre avant le : <strong>{territory.dateDue || '____ / ____ / 2026'}</strong></div>
                  <div style={{ marginTop: '4px', fontSize: '0.75rem', color: '#0284c7' }}>Code : {territory.shortUrlCode}</div>
                </div>

                <div style={{ padding: '6px', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`${window.location.origin}/#territory=${territory.id}`)}&color=0f172a&bgcolor=ffffff`}
                    alt="QR Code Territoire"
                    style={{ width: 75, height: 75, display: 'block' }}
                  />
                </div>
              </div>
            </div>

            {/* Consignes / Notes du territoire */}
            {territory.notes && (
              <div style={{ background: '#f8fafc', borderLeft: '4px solid #0284c7', padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.85rem', color: '#334155' }}>
                <strong>Remarques générales :</strong> {territory.notes}
              </div>
            )}

            {/* Adresses Ne pas appeler */}
            {doNotCalls.length > 0 && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1.25rem' }}>
                <div style={{ color: '#dc2626', fontWeight: 800, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertTriangle size={15} /> NE PAS APPELER (À RESPECTER STRICTEMENT) :
                </div>
                <div style={{ fontSize: '0.8rem', color: '#991b1b', marginTop: '4px' }}>
                  {doNotCalls.map((dnc, idx) => (
                    <span key={dnc.id}>
                      {dnc.number} {dnc.streetName} {dnc.units.filter(u => u.status === 'do_not_call').map(u => `(${u.unitNumber})`).join(' ')}
                      {idx < doNotCalls.length - 1 ? ' • ' : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Tableau quadrillé des rues */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, borderBottom: '1px solid #cbd5e1', paddingBottom: '4px', marginBottom: '0.75rem' }}>
                Liste des adresses et relevé des passages ({territoryLocations.length} adresses / {totalDoors} portes)
              </h3>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
                    <th style={{ padding: '6px 8px', width: '22%' }}>Rue</th>
                    <th style={{ padding: '6px 8px', width: '8%' }}>N°</th>
                    <th style={{ padding: '6px 8px', width: '16%' }}>Étage / Porte</th>
                    <th style={{ padding: '6px 8px', width: '14%' }}>Code / Accès</th>
                    <th style={{ padding: '6px 8px', width: '22%' }}>Passages (Date &amp; Résultat)</th>
                    <th style={{ padding: '6px 8px', width: '18%' }}>Remarques</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from(streetsMap.entries()).map(([streetName, locs]) => {
                    return locs.map((loc, lIdx) => {
                      const isDnc = loc.status === 'do_not_call';
                      if (loc.units && loc.units.length > 0) {
                        return loc.units.map((unit, uIdx) => (
                          <tr key={`${loc.id}-${unit.id}`} style={{ borderBottom: '1px solid #e2e8f0', background: unit.status === 'do_not_call' ? '#fee2e2' : 'transparent' }}>
                            {lIdx === 0 && uIdx === 0 && (
                              <td rowSpan={locs.reduce((a, b) => a + (b.units.length || 1), 0)} style={{ padding: '6px 8px', fontWeight: 700, verticalAlign: 'top', borderRight: '1px solid #e2e8f0' }}>
                                {streetName}
                              </td>
                            )}
                            {uIdx === 0 && (
                              <td rowSpan={loc.units.length} style={{ padding: '6px 8px', fontWeight: 600, verticalAlign: 'top', borderRight: '1px solid #e2e8f0' }}>
                                {loc.number}
                              </td>
                            )}
                            <td style={{ padding: '5px 8px', borderRight: '1px solid #e2e8f0' }}>
                              {unit.floor ? `${unit.floor} - ` : ''}{unit.unitNumber}
                            </td>
                            <td style={{ padding: '5px 8px', borderRight: '1px solid #e2e8f0', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                              {loc.digicode || '-'}
                            </td>
                            <td style={{ padding: '5px 8px', borderRight: '1px solid #e2e8f0' }}>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <span style={{ display: 'inline-block', width: 22, height: 18, border: '1px solid #94a3b8', borderRadius: 2 }}></span>
                                <span style={{ display: 'inline-block', width: 22, height: 18, border: '1px solid #94a3b8', borderRadius: 2 }}></span>
                                <span style={{ display: 'inline-block', width: 22, height: 18, border: '1px solid #94a3b8', borderRadius: 2 }}></span>
                              </div>
                            </td>
                            <td style={{ padding: '5px 8px', fontSize: '0.75rem', color: '#475569' }}>
                              {unit.status === 'do_not_call' ? 'NE PAS APPELER' : (loc.notes || '')}
                            </td>
                          </tr>
                        ));
                      }

                      return (
                        <tr key={loc.id} style={{ borderBottom: '1px solid #e2e8f0', background: isDnc ? '#fee2e2' : 'transparent' }}>
                          {lIdx === 0 && (
                            <td rowSpan={locs.reduce((a, b) => a + (b.units.length || 1), 0)} style={{ padding: '6px 8px', fontWeight: 700, verticalAlign: 'top', borderRight: '1px solid #e2e8f0' }}>
                              {streetName}
                            </td>
                          )}
                          <td style={{ padding: '6px 8px', fontWeight: 600, borderRight: '1px solid #e2e8f0' }}>
                            {loc.number}
                          </td>
                          <td style={{ padding: '5px 8px', borderRight: '1px solid #e2e8f0' }}>
                            Maison individuelle
                          </td>
                          <td style={{ padding: '5px 8px', borderRight: '1px solid #e2e8f0', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                            {loc.digicode || '-'}
                          </td>
                          <td style={{ padding: '5px 8px', borderRight: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <span style={{ display: 'inline-block', width: 22, height: 18, border: '1px solid #94a3b8', borderRadius: 2 }}></span>
                              <span style={{ display: 'inline-block', width: 22, height: 18, border: '1px solid #94a3b8', borderRadius: 2 }}></span>
                              <span style={{ display: 'inline-block', width: 22, height: 18, border: '1px solid #94a3b8', borderRadius: 2 }}></span>
                            </div>
                          </td>
                          <td style={{ padding: '5px 8px', fontSize: '0.75rem', color: '#475569' }}>
                            {isDnc ? 'NE PAS APPELER' : (loc.notes || '')}
                          </td>
                        </tr>
                      );
                    });
                  })}
                </tbody>
              </table>
            </div>

            {/* Bilan & Signature à la restitution */}
            <div style={{ borderTop: '2px dashed #94a3b8', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#475569' }}>
              <div>
                <div>Date de fin de parcours : ________________________</div>
                <div style={{ marginTop: '4px' }}>Toutes les adresses ont été visitées : [ ] Oui &nbsp;&nbsp; [ ] Non</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div>Signature du proclamateur : ________________________</div>
                <div style={{ marginTop: '4px', fontSize: '0.75rem', fontStyle: 'italic' }}>À rendre au serviteur aux territoires à l'issue des 4 mois</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
