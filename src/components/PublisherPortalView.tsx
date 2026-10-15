import React, { useState } from 'react';
import { 
  Search, 
  QrCode, 
  HelpCircle, 
  Lock, 
  Calendar, 
  Clock, 
  Compass, 
  User,
  ArrowRight
} from 'lucide-react';
import type { Territory, LocationItem, Publisher } from '../types';

interface PublisherPortalViewProps {
  territories: Territory[];
  locations: LocationItem[];
  publishers: Publisher[];
  currentPublisherName: string;
  onSelectPublisherName: (name: string) => void;
  onOpenTerritory: (territory: Territory) => void;
  onOpenScanner: () => void;
  onRequestTerritory: () => void;
  onRequestAdminLogin: () => void;
}

export const PublisherPortalView: React.FC<PublisherPortalViewProps> = ({
  territories,
  locations,
  publishers,
  currentPublisherName,
  onSelectPublisherName,
  onOpenTerritory,
  onOpenScanner,
  onRequestTerritory,
  onRequestAdminLogin
}) => {
  const [accessCodeInput, setAccessCodeInput] = useState('');
  const [codeError, setCodeError] = useState('');

  // Territoires attribués au proclamateur actuel
  const myAssignedTerritories = territories.filter(t => 
    t.status !== 'available' && 
    t.assignee && 
    t.assignee.trim().toLowerCase() === currentPublisherName.trim().toLowerCase()
  );

  const handleAccessCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = accessCodeInput.trim().toUpperCase();
    if (!clean) return;

    // Recherche par shortUrlCode (ex: LYON01), par numéro (ex: 01, 1), ou par id
    const found = territories.find(t => 
      t.shortUrlCode?.toUpperCase() === clean ||
      t.number.toUpperCase() === clean ||
      t.id.toUpperCase() === clean
    );

    if (found) {
      setCodeError('');
      onOpenTerritory(found);
    } else {
      setCodeError(`Aucun territoire trouvé avec le code "${clean}".`);
    }
  };

  // Calcul du taux d'avancement pour un territoire donné
  const getProgressPercent = (territoryId: string) => {
    const terrLocs = locations.filter(l => l.territoryId === territoryId);
    if (terrLocs.length === 0) return 0;
    const completed = terrLocs.filter(l => l.status === 'visited').length;
    return Math.round((completed / terrLocs.length) * 100);
  };

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto', padding: '1.25rem 1rem' }}>
      
      {/* En-tête Espace Proclamateur */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.5rem',
        padding: '1.25rem 1.5rem',
        background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.15), rgba(16, 185, 129, 0.1))',
        border: '1px solid rgba(2, 132, 199, 0.3)',
        borderRadius: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: '#0284c7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 4px 12px rgba(2, 132, 199, 0.4)'
          }}>
            <Compass size={26} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#38bdf8', fontWeight: 700 }}>
              Prédication de congrégation
            </div>
            <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Espace Proclamateur
            </h1>
          </div>
        </div>

        {/* Sélecteur de profil proclamateur + bouton cadenas responsable */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--bg-tertiary)', padding: '0.35rem 0.65rem', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
            <User size={15} color="#38bdf8" />
            <select
              value={currentPublisherName}
              onChange={(e) => onSelectPublisherName(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              {publishers.map(p => (
                <option key={p.id} value={p.name} style={{ background: '#101522', color: '#fff' }}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={onRequestAdminLogin}
            className="btn btn-secondary"
            title="Déverrouiller l'accès responsable / serviteur des territoires (Code PIN)"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.78rem',
              padding: '0.45rem 0.75rem',
              borderColor: 'rgba(255, 255, 255, 0.15)',
              color: 'var(--text-muted)'
            }}
          >
            <Lock size={14} />
            <span>Responsable</span>
          </button>
        </div>
      </div>

      {/* SECTION 1 : Mes territoires en cours */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            Mes Territoires Attribués ({myAssignedTerritories.length})
          </h2>
          <button
            onClick={onRequestTerritory}
            className="btn btn-secondary"
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <HelpCircle size={15} color="#38bdf8" />
            <span>Demander un territoire</span>
          </button>
        </div>

        {myAssignedTerritories.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {myAssignedTerritories.map(terr => {
              const progress = getProgressPercent(terr.id);
              return (
                <div
                  key={terr.id}
                  onClick={() => onOpenTerritory(terr)}
                  className="glass-panel"
                  style={{
                    padding: '1.25rem',
                    borderRadius: '14px',
                    cursor: 'pointer',
                    background: 'var(--bg-secondary)',
                    border: '1px solid rgba(56, 189, 248, 0.25)',
                    transition: 'all 0.2s ease',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = '#38bdf8'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.25)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                    <div style={{
                      padding: '0.25rem 0.65rem',
                      borderRadius: '8px',
                      background: 'rgba(56, 189, 248, 0.15)',
                      color: '#38bdf8',
                      fontWeight: 800,
                      fontSize: '0.9rem'
                    }}>
                      N° {terr.number}
                    </div>

                    {!terr.receiptAcknowledged && (
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '0.2rem 0.5rem',
                        borderRadius: '999px',
                        background: 'rgba(245, 158, 11, 0.2)',
                        color: '#fbbf24',
                        border: '1px solid rgba(245, 158, 11, 0.4)'
                      }}>
                        À confirmer
                      </span>
                    )}
                  </div>

                  <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {terr.label}
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.85rem' }}>
                    {terr.dateAssigned && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Calendar size={13} color="var(--text-muted)" />
                        <span>Attribué le {new Date(terr.dateAssigned).toLocaleDateString('fr-FR')}</span>
                      </div>
                    )}
                    {terr.dateDue && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Clock size={13} color="#f59e0b" />
                        <span>Échéance : {new Date(terr.dateDue).toLocaleDateString('fr-FR')}</span>
                      </div>
                    )}
                  </div>

                  {/* Barre d'avancement */}
                  <div style={{ marginBottom: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                      <span>Portes visitées</span>
                      <span style={{ fontWeight: 700, color: '#38bdf8' }}>{progress}%</span>
                    </div>
                    <div style={{ height: '6px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #0284c7, #10b981)', borderRadius: '999px' }} />
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '0.65rem',
                    borderTop: '1px solid var(--border-subtle)',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: '#38bdf8'
                  }}>
                    <span>Ouvrir la carte & les rues</span>
                    <ArrowRight size={15} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{
            padding: '2rem',
            textAlign: 'center',
            background: 'var(--bg-secondary)',
            borderRadius: '14px',
            border: '1px dashed var(--border-subtle)',
            color: 'var(--text-secondary)'
          }}>
            <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem' }}>
              Aucun territoire ne vous est actuellement attribué au nom de <strong>{currentPublisherName}</strong>.
            </p>
            <button
              onClick={onRequestTerritory}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}
            >
              <HelpCircle size={16} />
              <span>Demander un nouveau territoire</span>
            </button>
          </div>
        )}
      </div>

      {/* SECTION 2 : Saisir un code d'accès ou Scanner un QR Code */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1.25rem',
        marginBottom: '2rem'
      }}>
        {/* Entrer un code d'accès */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '14px', background: 'var(--bg-secondary)' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Search size={18} color="#38bdf8" />
            Accéder par Code ou N°
          </h3>
          <p style={{ margin: '0 0 1rem 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            Entrez le code d'accès de territoire reçu par WhatsApp ou le numéro du territoire (ex: LYON01, 01, 02).
          </p>

          <form onSubmit={handleAccessCodeSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              placeholder="ex: LYON01"
              value={accessCodeInput}
              onChange={(e) => {
                setAccessCodeInput(e.target.value);
                setCodeError('');
              }}
              style={{
                flex: 1,
                padding: '0.6rem 0.85rem',
                borderRadius: '8px',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
                textTransform: 'uppercase',
                fontWeight: 700
              }}
            />
            <button
              type="submit"
              className="btn btn-primary"
              style={{ padding: '0.6rem 1rem', fontSize: '0.85rem' }}
            >
              Ouvrir
            </button>
          </form>

          {codeError && (
            <div style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '0.5rem' }}>
              {codeError}
            </div>
          )}
        </div>

        {/* Scanner QR Code */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '14px', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <QrCode size={18} color="#10b981" />
              Scanner un QR Code
            </h3>
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Scannez le QR code imprimé sur la carte papier ou affiché à la salle du Royaume pour charger immédiatement le territoire.
            </p>
          </div>

          <button
            onClick={onOpenScanner}
            className="btn btn-secondary"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.65rem',
              borderColor: 'rgba(16, 185, 129, 0.4)',
              color: '#34d399',
              background: 'rgba(16, 185, 129, 0.1)'
            }}
          >
            <QrCode size={18} />
            <span>Ouvrir l'appareil photo</span>
          </button>
        </div>
      </div>

      {/* Pied de page discret */}
      <div style={{
        textAlign: 'center',
        padding: '1.5rem 0',
        borderTop: '1px solid var(--border-subtle)',
        fontSize: '0.75rem',
        color: 'var(--text-muted)'
      }}>
        <span>KBV Territory • Vous êtes le frère préposé aux territoires ? </span>
        <button
          onClick={onRequestAdminLogin}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#38bdf8',
            cursor: 'pointer',
            fontWeight: 600,
            padding: 0,
            textDecoration: 'underline'
          }}
        >
          Déverrouiller la console de gestion (Code PIN)
        </button>
      </div>

    </div>
  );
};
