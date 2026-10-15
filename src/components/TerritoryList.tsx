import React, { useState } from 'react';
import { 
  Search, 
  Plus, 
  Calendar, 
  UserCheck, 
  Share2, 
  Layers,
  Camera,
  RotateCcw,
  Printer,
  HelpCircle
} from 'lucide-react';
import type { Territory, LocationItem, TerritoryType } from '../types';
import { useTranslation } from '../i18n/LanguageContext';

interface TerritoryListProps {
  territories: Territory[];
  locations: LocationItem[];
  onSelectTerritory: (territory: Territory) => void;
  onOpenMap: () => void;
  onAddNewTerritory: (territory: Omit<Territory, 'id' | 'shortUrlCode'>) => void;
  onShareTerritory: (territory: Territory) => void;
  onOpenScanner?: () => void;
  onAssignTerritory?: (territory: Territory) => void;
  onReturnTerritory?: (territory: Territory) => void;
  onPrintTerritory?: (territory: Territory) => void;
  onRequestTerritory?: () => void;
}

export const TerritoryList: React.FC<TerritoryListProps> = ({
  territories,
  locations,
  onSelectTerritory,
  onOpenMap,
  onAddNewTerritory,
  onShareTerritory,
  onOpenScanner,
  onAssignTerritory,
  onReturnTerritory,
  onPrintTerritory,
  onRequestTerritory
}) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'assigned' | 'available' | 'in_progress'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Formulaire nouveau territoire
  const [newNumber, setNewNumber] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState<TerritoryType>('urban');
  const [newAssignee, setNewAssignee] = useState('');
  const [newDueDate, setNewDueDate] = useState('');

  // Filtrage des territoires
  const filteredTerritories = territories.filter(t => {
    const matchesSearch = 
      t.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.assignee && t.assignee.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;
    if (selectedFilter === 'all') return true;
    return t.status === selectedFilter;
  });

  // Calcul du % pour chaque territoire
  const getTerritoryStats = (territoryId: string) => {
    const terrLocs = locations.filter(l => l.territoryId === territoryId);
    let total = 0;
    let visited = 0;

    terrLocs.forEach(l => {
      if (l.units.length > 0) {
        l.units.forEach(u => {
          total++;
          if (u.status === 'visited') visited++;
        });
      } else {
        total++;
        if (l.status === 'visited') visited++;
      }
    });

    const percent = total > 0 ? Math.round((visited / total) * 100) : 0;
    return { total, visited, percent };
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNumber.trim() || !newLabel.trim()) return;

    onAddNewTerritory({
      number: newNumber.trim(),
      label: newLabel.trim(),
      type: newType,
      status: newAssignee.trim() ? 'assigned' : 'available',
      assignee: newAssignee.trim() || null,
      dateAssigned: newAssignee.trim() ? new Date().toISOString().split('T')[0] : null,
      dateDue: newDueDate || null,
      boundary: [
        [45.7600, 4.8300],
        [45.7620, 4.8340],
        [45.7600, 4.8360],
        [45.7580, 4.8320]
      ],
      centerCoordinates: [45.7600, 4.8330],
      notes: ''
    });

    setIsModalOpen(false);
    setNewNumber('');
    setNewLabel('');
    setNewAssignee('');
    setNewDueDate('');
  };

  const typeLabels: Record<TerritoryType, string> = {
    urban: '🏢 Urbain',
    residential: '🏡 Résidentiel',
    rural: '🌾 Rural',
    business: '💼 Commercial',
    campaign: '🎯 Campagne'
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.25rem' }}>
      {/* Barre d'actions et recherche */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ position: 'relative', flex: '1 1 300px', maxWidth: '450px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.65rem 1rem 0.65rem 2.4rem',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: '0.875rem'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {onOpenScanner && (
            <button onClick={onOpenScanner} className="btn btn-secondary" title="Scanner une carte de territoire papier">
              <Camera size={16} />
              {t.scanQr}
            </button>
          )}

          {onRequestTerritory && (
            <button 
              onClick={onRequestTerritory} 
              className="btn btn-secondary" 
              style={{
                background: 'rgba(14, 165, 233, 0.12)',
                border: '1px solid rgba(14, 165, 233, 0.35)',
                color: '#38bdf8'
              }}
              title="Demander un territoire au responsable"
            >
              <HelpCircle size={16} />
              {t.requestTerritory}
            </button>
          )}

          <button onClick={onOpenMap} className="btn btn-secondary">
            <Layers size={16} />
            {t.globalMap}
          </button>

          <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
            <Plus size={16} />
            + {t.territories}
          </button>
        </div>
      </div>

      {/* Filtres de statut */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '4px' }}>
        <button
          onClick={() => setSelectedFilter('all')}
          className={`btn ${selectedFilter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ fontSize: '0.8rem', padding: '0.45rem 0.9rem' }}
        >
          {t.filterAll} ({territories.length})
        </button>
        <button
          onClick={() => setSelectedFilter('in_progress')}
          className={`btn ${selectedFilter === 'in_progress' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ fontSize: '0.8rem', padding: '0.45rem 0.9rem' }}
        >
          {t.statusInProgress}
        </button>
        <button
          onClick={() => setSelectedFilter('assigned')}
          className={`btn ${selectedFilter === 'assigned' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ fontSize: '0.8rem', padding: '0.45rem 0.9rem' }}
        >
          {t.filterAssigned}
        </button>
        <button
          onClick={() => setSelectedFilter('available')}
          className={`btn ${selectedFilter === 'available' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ fontSize: '0.8rem', padding: '0.45rem 0.9rem' }}
        >
          {t.filterAvailable}
        </button>
      </div>

      {/* Bannière invitation à demander un territoire */}
      {onRequestTerritory && (
        <div style={{
          marginBottom: '1.25rem',
          padding: '0.75rem 1rem',
          borderRadius: '10px',
          background: 'rgba(14, 165, 233, 0.08)',
          border: '1px solid rgba(14, 165, 233, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(14, 165, 233, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8' }}>
              <HelpCircle size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#38bdf8' }}>
                Tu aimerais un nouveau territoire ?
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                Signale aux préposés aux territoires de ton assemblée le secteur ou créneau que tu souhaites prêcher.
              </div>
            </div>
          </div>
          <button
            onClick={onRequestTerritory}
            className="btn btn-primary"
            style={{ padding: '0.4rem 0.85rem', fontSize: '0.78rem' }}
          >
            Faire une demande (?)
          </button>
        </div>
      )}

      {/* Grille des territoires */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
        {filteredTerritories.map(territory => {
          const stats = getTerritoryStats(territory.id);

          return (
            <div 
              key={territory.id} 
              className="glass-panel-interactive"
              onClick={() => onSelectTerritory(territory)}
              style={{ padding: '1.35rem', position: 'relative' }}
            >
              {/* Entête de carte */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <span style={{ 
                    fontFamily: 'var(--font-mono)', 
                    fontWeight: 800, 
                    fontSize: '1.15rem', 
                    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', 
                    color: 'white', 
                    padding: '0.2rem 0.6rem', 
                    borderRadius: '6px' 
                  }}>
                    {territory.number}
                  </span>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {territory.label}
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {typeLabels[territory.type]}
                    </span>
                  </div>
                </div>

                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '999px',
                  background: territory.status === 'available' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                  color: territory.status === 'available' ? '#34d399' : '#38bdf8',
                  border: `1px solid ${territory.status === 'available' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(56, 189, 248, 0.3)'}`
                }}>
                  {territory.status === 'available' ? 'Disponible' : territory.status === 'in_progress' ? 'En cours' : 'Attribué'}
                </span>
              </div>

              {/* Attribution */}
              <div style={{ marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {territory.assignee ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#e2e8f0' }}>
                    <UserCheck size={15} color="#38bdf8" /> Proclamateur : <strong>{territory.assignee}</strong>
                  </div>
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    Non attribué actuellement
                  </div>
                )}
                {territory.dateDue && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', marginTop: '3px', color: '#f59e0b' }}>
                    <Calendar size={13} /> À rendre avant le : {territory.dateDue}
                  </div>
                )}
              </div>

              {/* Barre de progression */}
              <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Couverture du territoire</span>
                  <span style={{ fontWeight: 700, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>{stats.percent}%</span>
                </div>
                <div style={{ height: '6px', width: '100%', background: 'rgba(255,255,255,0.06)', borderRadius: '999px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${stats.percent}%`, background: 'linear-gradient(90deg, #0284c7, #10b981)', borderRadius: '999px' }} />
                </div>
              </div>

              {/* Pied de carte */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <span>{stats.total} adresse(s) répertoriée(s)</span>

                <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                  {territory.status === 'available' && onAssignTerritory && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAssignTerritory(territory);
                      }}
                      className="btn btn-ghost"
                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', color: '#34d399' }}
                      title="Attribuer"
                    >
                      <UserCheck size={14} /> Attribuer
                    </button>
                  )}
                  {territory.status !== 'available' && onReturnTerritory && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onReturnTerritory(territory);
                      }}
                      className="btn btn-ghost"
                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', color: '#fbbf24' }}
                      title="Rendre"
                    >
                      <RotateCcw size={14} /> Rendre
                    </button>
                  )}
                  {onPrintTerritory && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPrintTerritory(territory);
                      }}
                      className="btn btn-ghost"
                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                      title="Imprimer la fiche de ce territoire"
                    >
                      <Printer size={14} /> Imprimer
                    </button>
                  )}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onShareTerritory(territory);
                    }}
                    className="btn btn-ghost" 
                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                  >
                    <Share2 size={14} /> Partager
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Création Territoire */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '1rem'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', padding: '1.75rem', background: '#101522' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.25rem' }}>Nouveau Territoire</h2>

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Numéro du Territoire (ex: 04, 12B) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="04"
                  value={newNumber}
                  onChange={(e) => setNewNumber(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'white' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Nom / Quartier / Secteur *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Quartier Part-Dieu / Vivier Merle"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'white' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Type de Territoire
                </label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as TerritoryType)}
                  style={{ width: '100%', padding: '0.6rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'white' }}
                >
                  <option value="urban">🏢 Urbain (Immeubles)</option>
                  <option value="residential">🏡 Résidentiel (Pavillons / Maisons)</option>
                  <option value="commercial">💼 Commercial</option>
                  <option value="rural">🌾 Rural</option>
                  <option value="campaign">🎯 Campagne spéciale</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Attribuer à un proclamateur (optionnel)
                </label>
                <input
                  type="text"
                  placeholder="Nom du frère / sœur"
                  value={newAssignee}
                  onChange={(e) => setNewAssignee(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'white' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary">
                  Créer le Territoire
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
