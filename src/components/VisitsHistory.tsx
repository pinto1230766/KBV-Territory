import React, { useState } from 'react';
import { 
  Clock, 
  Search, 
  Trash2, 
  Calendar, 
  User 
} from 'lucide-react';
import type { VisitRecord, Territory, VisitStatus } from '../types';

interface VisitsHistoryProps {
  visits: VisitRecord[];
  territories: Territory[];
  onDeleteVisit: (visitId: string) => void;
  onSelectTerritory: (territory: Territory) => void;
}

export const VisitsHistory: React.FC<VisitsHistoryProps> = ({
  visits,
  territories,
  onDeleteVisit,
  onSelectTerritory
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedTerritoryId, setSelectedTerritoryId] = useState<string>('all');

  const filteredVisits = visits.filter(v => {
    const matchesSearch = 
      v.addressLabel.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.publisherName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.notes && v.notes.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;
    if (selectedStatus !== 'all' && v.status !== selectedStatus) return false;
    if (selectedTerritoryId !== 'all' && v.territoryId !== selectedTerritoryId) return false;
    return true;
  });

  const statusLabels: Record<VisitStatus, { text: string; color: string; bg: string }> = {
    not_visited: { text: 'Non visité', color: '#94a3b8', bg: 'rgba(100, 116, 139, 0.15)' },
    not_at_home: { text: 'Absent', color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.15)' },
    visited: { text: 'Visité', color: '#34d399', bg: 'rgba(16, 185, 129, 0.15)' },
    return_visit: { text: 'Revisite', color: '#38bdf8', bg: 'rgba(14, 165, 233, 0.15)' },
    do_not_call: { text: 'Ne pas appeler', color: '#f87171', bg: 'rgba(239, 68, 68, 0.15)' }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '1.25rem' }} className="animate-fade-in">
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={24} color="#38bdf8" /> Journal & Historique des Visites
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          Chronologie des passages enregistrés par les proclamateurs
        </p>
      </div>

      {/* Barre de recherche et filtres */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <div style={{ position: 'relative', flex: '1 1 250px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Rechercher par adresse, proclamateur ou note..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.6rem 1rem 0.6rem 2.4rem',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              color: 'white',
              fontSize: '0.85rem'
            }}
          />
        </div>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          style={{ padding: '0.6rem 1rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', color: 'white', fontSize: '0.85rem' }}
        >
          <option value="all">Tous les statuts</option>
          <option value="visited">Visité (Contact établi)</option>
          <option value="not_at_home">Absent</option>
          <option value="return_visit">Revisite</option>
          <option value="do_not_call">Ne pas appeler</option>
        </select>

        <select
          value={selectedTerritoryId}
          onChange={(e) => setSelectedTerritoryId(e.target.value)}
          style={{ padding: '0.6rem 1rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', color: 'white', fontSize: '0.85rem' }}
        >
          <option value="all">Tous les territoires</option>
          {territories.map(t => (
            <option key={t.id} value={t.id}>Territoire {t.number} - {t.label}</option>
          ))}
        </select>
      </div>

      {/* Liste chronologique */}
      {filteredVisits.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Aucune visite enregistrée correspondant aux critères.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filteredVisits.map(visit => {
            const terr = territories.find(t => t.id === visit.territoryId);
            const statusConfig = statusLabels[visit.status] || statusLabels.not_visited;

            return (
              <div 
                key={visit.id}
                className="glass-panel"
                style={{ 
                  padding: '1rem 1.25rem', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.75rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '999px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: statusConfig.color,
                    background: statusConfig.bg,
                    border: `1px solid ${statusConfig.color}40`,
                    whiteSpace: 'nowrap'
                  }}>
                    {statusConfig.text}
                  </span>

                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                      {visit.addressLabel}
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {terr && (
                        <span 
                          onClick={() => onSelectTerritory(terr)}
                          style={{ cursor: 'pointer', color: '#38bdf8', fontWeight: 600 }}
                        >
                          Territoire {terr.number}
                        </span>
                      )}
                      <span>
                        <User size={13} style={{ display: 'inline', marginRight: 3 }} />
                        {visit.publisherName}
                      </span>
                      <span>
                        <Calendar size={13} style={{ display: 'inline', marginRight: 3 }} />
                        {formatDate(visit.timestamp)}
                      </span>
                    </div>

                    {visit.notes && (
                      <div style={{ fontSize: '0.8rem', color: '#cbd5e1', marginTop: '0.35rem', fontStyle: 'italic' }}>
                        "{visit.notes}"
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <button 
                    onClick={() => onDeleteVisit(visit.id)}
                    className="btn btn-ghost"
                    style={{ padding: '0.4rem', color: '#f87171' }}
                    title="Supprimer cette visite"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
