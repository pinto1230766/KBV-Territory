import React, { useState, useEffect } from 'react';
import { 
  X, 
  HelpCircle, 
  Send, 
  CheckCircle2, 
  User, 
  Building2, 
  Home, 
  Trees, 
  Target, 
  Sparkles,
  MessageSquare
} from 'lucide-react';
import type { TerritoryType, TerritoryRequest, CongregationSettings } from '../types';
import { StorageService } from '../services/storage';

interface RequestTerritoryModalProps {
  settings: CongregationSettings;
  onClose: () => void;
  onRequestSubmitted?: () => void;
}

export const RequestTerritoryModal: React.FC<RequestTerritoryModalProps> = ({
  settings,
  onClose,
  onRequestSubmitted
}) => {
  const [message, setMessage] = useState('');
  const [preferredType, setPreferredType] = useState<TerritoryType | 'any'>('any');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [previousRequests, setPreviousRequests] = useState<TerritoryRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    const list = await StorageService.getTerritoryRequests();
    setPreviousRequests(list);
  };

  const quickMessages = [
    "Prêt pour un nouveau territoire disponible.",
    "De préférence accessible à pied depuis la salle du Royaume.",
    "Secteur pavillonnaire pour les sorties du samedi matin.",
    "Immeubles ou appartements pour les fins d'après-midi.",
    "Territoire rural pour la prédication en groupe le week-end."
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const newRequest: TerritoryRequest = {
      id: 'req-' + Date.now(),
      publisherName: settings.publisherName || 'Proclamateur',
      publisherEmail: settings.publisherEmail,
      message: message.trim() || 'Demande de territoire standard',
      preferredType,
      createdAt: new Date().toISOString(),
      status: 'pending'
    };

    await StorageService.saveTerritoryRequest(newRequest);
    await loadRequests();
    setIsSubmitting(false);
    setSuccess(true);

    if (onRequestSubmitted) {
      onRequestSubmitted();
    }

    setTimeout(() => {
      setSuccess(false);
      setActiveTab('history');
    }, 2000);
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
        maxWidth: '540px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#0d131f',
        position: 'relative',
        borderRadius: '16px',
        border: '1px solid var(--border-subtle)',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
      }}>
        {/* En-tête avec l'icône officielle ? */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255, 255, 255, 0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: '0 4px 15px rgba(14, 165, 233, 0.4)'
            }}>
              <HelpCircle size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>Demande de territoire</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', margin: 0 }}>
                {settings.congregationName || 'Assemblée locale'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Onglets : Nouvelle demande / Demandes en cours */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(0,0,0,0.2)' }}>
          <button
            type="button"
            onClick={() => setActiveTab('new')}
            style={{
              flex: 1,
              padding: '0.65rem',
              fontSize: '0.82rem',
              fontWeight: 700,
              background: activeTab === 'new' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'new' ? '2px solid #38bdf8' : '2px solid transparent',
              color: activeTab === 'new' ? '#38bdf8' : 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            Nouvelle demande
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            style={{
              flex: 1,
              padding: '0.65rem',
              fontSize: '0.82rem',
              fontWeight: 700,
              background: activeTab === 'history' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'history' ? '2px solid #38bdf8' : '2px solid transparent',
              color: activeTab === 'history' ? '#38bdf8' : 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            Mes demandes ({previousRequests.length})
          </button>
        </div>

        {/* Contenu défilable */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem' }}>
          {activeTab === 'new' ? (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              {/* Message officiel Territory Helper */}
              <div style={{
                padding: '0.85rem',
                borderRadius: '10px',
                background: 'rgba(56, 189, 248, 0.08)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem'
              }}>
                <MessageSquare size={18} color="#38bdf8" style={{ marginTop: 2, flexShrink: 0 }} />
                <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', lineHeight: 1.45 }}>
                  <strong>Signaler aux préposés aux territoires de ton assemblée que tu aimerais un territoire.</strong>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                    Ta demande sera directement transmise au responsable des territoires avec tes préférences.
                  </div>
                </div>
              </div>

              {/* Demandeur */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <User size={16} color="#38bdf8" />
                <div style={{ fontSize: '0.82rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Demandeur : </span>
                  <strong>{settings.publisherName || 'Proclamateur'}</strong>
                  {settings.publisherEmail && (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginLeft: 6 }}>
                      ({settings.publisherEmail})
                    </span>
                  )}
                </div>
              </div>

              {/* Préférence de type de territoire */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Préférence de secteur (optionnel)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                  {[
                    { id: 'any', label: 'Indifférent', icon: <Sparkles size={14} /> },
                    { id: 'urban', label: 'Immeubles', icon: <Building2 size={14} /> },
                    { id: 'residential', label: 'Pavillons', icon: <Home size={14} /> },
                    { id: 'rural', label: 'Rural', icon: <Trees size={14} /> },
                    { id: 'campaign', label: 'Campagne', icon: <Target size={14} /> }
                  ].map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setPreferredType(item.id as any)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 5,
                        padding: '6px 8px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: preferredType === item.id ? 700 : 500,
                        background: preferredType === item.id ? 'rgba(56, 189, 248, 0.2)' : 'var(--bg-tertiary)',
                        border: preferredType === item.id ? '1px solid #38bdf8' : '1px solid var(--border-subtle)',
                        color: preferredType === item.id ? '#38bdf8' : 'var(--text-secondary)',
                        cursor: 'pointer'
                      }}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Suggestions rapides en 1 clic */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Suggestions de message rapide :
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {quickMessages.map((q, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setMessage(q)}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-secondary)',
                        fontSize: '0.72rem',
                        cursor: 'pointer'
                      }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Zone de texte du message */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Message pour le préposé aux territoires
                </label>
                <textarea
                  rows={4}
                  placeholder="Écris ton message ici (ex: précisions sur tes disponibilités, avec qui tu prêches...)"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '0.85rem',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Bouton Envoyer */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary"
                style={{
                  padding: '0.75rem',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  marginTop: '0.25rem'
                }}
              >
                {success ? <CheckCircle2 size={18} color="#10b981" /> : <Send size={18} />}
                {success ? 'Demande envoyée au préposé !' : 'Signaler et envoyer ma demande'}
              </button>
            </form>
          ) : (
            /* ONGLET HISTORIQUE DES DEMANDES */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {previousRequests.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
                  <HelpCircle size={36} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                  <p style={{ fontSize: '0.85rem', margin: 0 }}>Aucune demande enregistrée pour le moment.</p>
                </div>
              ) : (
                previousRequests.map(req => (
                  <div
                    key={req.id}
                    style={{
                      padding: '0.85rem 1rem',
                      background: 'var(--bg-tertiary)',
                      borderRadius: '10px',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.4rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          background: req.status === 'fulfilled' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: req.status === 'fulfilled' ? '#10b981' : '#f59e0b',
                          border: req.status === 'fulfilled' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)'
                        }}>
                          {req.status === 'fulfilled' ? '✓ Attribué' : '⏳ En attente du préposé'}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {new Date(req.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)', marginTop: 2 }}>
                      « {req.message} »
                    </div>

                    {req.preferredType && req.preferredType !== 'any' && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Type souhaité : <strong>{req.preferredType}</strong>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Pied de page */}
        <div style={{
          padding: '0.75rem 1.5rem',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'flex-end',
          background: 'rgba(255, 255, 255, 0.02)'
        }}>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: '0.45rem 1rem', fontSize: '0.82rem' }}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
