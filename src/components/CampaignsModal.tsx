import React, { useState } from 'react';
import { X, Target, Calendar, Plus } from 'lucide-react';
import type { Campaign } from '../types';

interface CampaignsModalProps {
  campaigns: Campaign[];
  activeCampaignId?: string | null;
  onSetActiveCampaign: (campaignId: string | null) => void;
  onAddCampaign: (campaign: Omit<Campaign, 'id'>) => void;
  onClose: () => void;
}

export const CampaignsModal: React.FC<CampaignsModalProps> = ({
  campaigns,
  activeCampaignId,
  onSetActiveCampaign,
  onAddCampaign,
  onClose
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAddCampaign({
      name: name.trim(),
      startDate: startDate || new Date().toISOString().split('T')[0],
      endDate: endDate || new Date().toISOString().split('T')[0],
      isActive: true,
      notes: notes.trim()
    });

    setIsCreating(false);
    setName('');
    setStartDate('');
    setEndDate('');
    setNotes('');
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
      zIndex: 3000,
      padding: '1rem'
    }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '520px', padding: '1.75rem', background: '#101522', position: 'relative' }}>
        <button 
          onClick={onClose}
          style={{ position: 'absolute', right: '16px', top: '16px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
        >
          <X size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{ padding: '0.5rem', background: 'var(--bg-tertiary)', borderRadius: '10px', color: '#38bdf8' }}>
            <Target size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Campagnes Spéciales</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Mémorial, Assemblée régionale & invitations</p>
          </div>
        </div>

        {/* Campagne active en cours */}
        <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {campaigns.map(camp => {
            const isActive = activeCampaignId === camp.id;

            return (
              <div 
                key={camp.id}
                style={{
                  padding: '1rem',
                  borderRadius: '10px',
                  background: isActive ? 'rgba(2, 132, 199, 0.15)' : 'var(--bg-tertiary)',
                  border: `1px solid ${isActive ? 'rgba(56, 189, 248, 0.4)' : 'var(--border-subtle)'}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'white', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {camp.name}
                    {isActive && (
                      <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: '#10b981', color: 'white', borderRadius: '4px' }}>
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    <Calendar size={13} style={{ display: 'inline', marginRight: 4 }} />
                    Du {camp.startDate} au {camp.endDate}
                  </div>
                  {camp.notes && (
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
                      {camp.notes}
                    </div>
                  )}
                </div>

                <button 
                  onClick={() => onSetActiveCampaign(isActive ? null : camp.id)}
                  className={`btn ${isActive ? 'btn-secondary' : 'btn-primary'}`}
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                >
                  {isActive ? 'Désactiver' : 'Activer'}
                </button>
              </div>
            );
          })}
        </div>

        {/* Formulaire ajout campagne */}
        {isCreating ? (
          <form onSubmit={handleSubmit} style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>Nouvelle Campagne</h4>
            <input 
              type="text"
              required
              placeholder="Nom de la campagne (ex: Mémorial 2026)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', background: '#0a0d14', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'white' }}
            />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input 
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ flex: 1, padding: '0.5rem', background: '#0a0d14', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'white' }}
              />
              <input 
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ flex: 1, padding: '0.5rem', background: '#0a0d14', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'white' }}
              />
            </div>
            <textarea
              placeholder="Notes ou consignes pour la campagne..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', background: '#0a0d14', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'white', resize: 'vertical', minHeight: '60px' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button type="button" onClick={() => setIsCreating(false)} className="btn btn-ghost" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}>Annuler</button>
              <button type="submit" className="btn btn-primary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}>Enregistrer</button>
            </div>
          </form>
        ) : (
          <button onClick={() => setIsCreating(true)} className="btn btn-secondary" style={{ width: '100%', fontSize: '0.85rem' }}>
            <Plus size={16} /> Ajouter une campagne
          </button>
        )}
      </div>
    </div>
  );
};
