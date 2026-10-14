import React, { useState } from 'react';
import { X, UserCheck, RotateCcw } from 'lucide-react';
import type { Territory, Publisher, ServiceGroup, LocationItem } from '../types';

interface AssignReturnModalProps {
  territory: Territory;
  mode: 'assign' | 'return';
  publishers: Publisher[];
  serviceGroups: ServiceGroup[];
  locations: LocationItem[];
  onAssign: (territoryId: string, publisherName: string, serviceGroupId: string | null, dueDate: string) => void;
  onReturn: (territoryId: string, resetStatuses: boolean, notes: string) => void;
  onClose: () => void;
}

export const AssignReturnModal: React.FC<AssignReturnModalProps> = ({
  territory,
  mode,
  publishers,
  serviceGroups,
  locations,
  onAssign,
  onReturn,
  onClose
}) => {
  // État Attribution
  const [selectedPublisher, setSelectedPublisher] = useState(territory.assignee || (publishers[0]?.name || ''));
  const [selectedGroup, setSelectedGroup] = useState(territory.serviceGroupId || (serviceGroups[0]?.id || ''));
  
  // Calcul automatique de la date d'échéance : 4 mois après aujourd'hui
  const defaultDueDate = () => {
    const d = new Date();
    d.setMonth(d.getMonth() + 4);
    return d.toISOString().split('T')[0];
  };
  const [dueDate, setDueDate] = useState(defaultDueDate());

  // État Restitution
  const [resetStatuses, setResetStatuses] = useState(true);
  const [returnNotes, setReturnNotes] = useState('');

  // Statistiques du territoire pour le bilan de restitution
  const terrLocs = locations.filter(l => l.territoryId === territory.id);
  let totalDoors = 0;
  let visitedDoors = 0;
  let notAtHomeDoors = 0;
  let returnVisitDoors = 0;

  terrLocs.forEach(l => {
    if (l.units.length > 0) {
      l.units.forEach(u => {
        totalDoors++;
        if (u.status === 'visited') visitedDoors++;
        else if (u.status === 'not_at_home') notAtHomeDoors++;
        else if (u.status === 'return_visit') returnVisitDoors++;
      });
    } else {
      totalDoors++;
      if (l.status === 'visited') visitedDoors++;
      else if (l.status === 'not_at_home') notAtHomeDoors++;
      else if (l.status === 'return_visit') returnVisitDoors++;
    }
  });

  const percent = totalDoors > 0 ? Math.round((visitedDoors / totalDoors) * 100) : 0;

  const handleAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPublisher.trim()) return;
    onAssign(territory.id, selectedPublisher.trim(), selectedGroup || null, dueDate);
    onClose();
  };

  const handleReturnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onReturn(territory.id, resetStatuses, returnNotes.trim());
    onClose();
  };

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
      zIndex: 3100,
      padding: '1rem'
    }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', padding: '1.75rem', background: '#101522', position: 'relative' }}>
        <button 
          onClick={onClose}
          style={{ position: 'absolute', right: '16px', top: '16px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
        >
          <X size={20} />
        </button>

        {mode === 'assign' ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ padding: '0.5rem', background: 'var(--bg-tertiary)', borderRadius: '10px', color: '#38bdf8' }}>
                <UserCheck size={24} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Attribuer le Territoire {territory.number}</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{territory.label}</p>
              </div>
            </div>

            <form onSubmit={handleAssignSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Proclamateur
                </label>
                <select
                  value={selectedPublisher}
                  onChange={(e) => setSelectedPublisher(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'white' }}
                >
                  {publishers.map(p => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Groupe de prédication
                </label>
                <select
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'white' }}
                >
                  <option value="">Aucun groupe particulier</option>
                  {serviceGroups.map(g => (
                    <option key={g.id} value={g.id}>{g.name} ({g.overseerName})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Date d'échéance (règle officielle : 4 mois)
                </label>
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'white' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" onClick={onClose} className="btn btn-secondary">Annuler</button>
                <button type="submit" className="btn btn-primary">Valider l'attribution</button>
              </div>
            </form>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ padding: '0.5rem', background: 'var(--bg-tertiary)', borderRadius: '10px', color: '#10b981' }}>
                <RotateCcw size={24} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Rendre le Territoire {territory.number}</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Attribué à {territory.assignee || 'Inconnu'}</p>
              </div>
            </div>

            {/* Bilan du parcours */}
            <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '10px', marginBottom: '1.25rem', border: '1px solid var(--border-subtle)' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem', color: '#38bdf8' }}>Bilan de la campagne</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem' }}>
                <div>Couverture totale : <strong>{percent}%</strong></div>
                <div>Portes visitées : <strong>{visitedDoors} / {totalDoors}</strong></div>
                <div>Absents restants : <strong>{notAtHomeDoors}</strong></div>
                <div>Revisites trouvées : <strong>{returnVisitDoors}</strong></div>
              </div>
            </div>

            <form onSubmit={handleReturnSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Remarques pour le serviteur aux territoires (optionnel)
                </label>
                <textarea
                  placeholder="Territoire terminé entièrement, quelques absents à retenter en soirée..."
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'white', resize: 'vertical', minHeight: '60px' }}
                />
              </div>

              <div style={{ padding: '0.75rem', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', fontSize: '0.8rem', color: '#e2e8f0' }}>
                  <input
                    type="checkbox"
                    checked={resetStatuses}
                    onChange={(e) => setResetStatuses(e.target.checked)}
                    style={{ marginTop: '2px' }}
                  />
                  <span>
                    <strong>Remettre les portes à l'état non-visité</strong> pour la prochaine attribution (les adresses "Ne pas appeler" et l'historique restent sauvegardés).
                  </span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={onClose} className="btn btn-secondary">Annuler</button>
                <button type="submit" className="btn btn-primary" style={{ background: '#10b981' }}>Confirmer le retour</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
