import React, { useState, useEffect } from 'react';
import { 
  X, 
  HelpCircle, 
  Send, 
  User, 
  Building2, 
  Home, 
  Trees, 
  Target, 
  Sparkles, 
  MessageSquare, 
  Phone, 
  MapPin, 
  ArrowRight 
} from 'lucide-react';
import type { Territory, TerritoryType, TerritoryRequest, CongregationSettings } from '../types';
import { StorageService } from '../services/storage';

interface RequestTerritoryModalProps {
  settings: CongregationSettings;
  territories?: Territory[];
  onOpenTerritory?: (territory: Territory) => void;
  onClose: () => void;
  onRequestSubmitted?: () => void;
}

export const RequestTerritoryModal: React.FC<RequestTerritoryModalProps> = ({
  settings,
  territories = [],
  onOpenTerritory,
  onClose,
  onRequestSubmitted
}) => {
  const [publisherName, setPublisherName] = useState(settings.publisherName || 'Proclamateur');
  const [publisherPhone, setPublisherPhone] = useState('');
  const [servantPhone, setServantPhone] = useState(settings.territoryServantPhone || '');
  const [selectedTerritoryId, setSelectedTerritoryId] = useState<string>('any');
  const [preferredType, setPreferredType] = useState<TerritoryType | 'any'>('any');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [previousRequests, setPreviousRequests] = useState<TerritoryRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');

  const availableTerritories = territories.filter(t => t.status === 'available');

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    const list = await StorageService.getTerritoryRequests();
    setPreviousRequests(list);
  };

  const quickMessages = [
    "Prêt pour un nouveau territoire disponible.",
    "De préférence accessible à pied ou en transports.",
    "Secteur pavillonnaire pour les sorties du samedi matin.",
    "Immeubles ou appartements pour les fins d'après-midi.",
    "Territoire rural pour la prédication en groupe ce week-end."
  ];

  // Construction du message WhatsApp formatté
  const generateWhatsAppMessage = () => {
    const chosenTerritory = availableTerritories.find(t => t.id === selectedTerritoryId);
    const terrText = chosenTerritory 
      ? `Territoire N° ${chosenTerritory.number} (${chosenTerritory.label})` 
      : 'N\'importe quel territoire disponible';

    const typeText = preferredType === 'urban' ? 'Immeubles / Urbain'
      : preferredType === 'residential' ? 'Pavillons / Résidentiel'
      : preferredType === 'rural' ? 'Rural'
      : preferredType === 'campaign' ? 'Campagne spéciale'
      : 'Indifférent (selon les besoins)';

    const lines = [
      `*DEMANDE DE TERRITOIRE - KBV Territory*`,
      `🏛️ *Congrégation :* ${settings.congregationName || 'Assemblée Locale'}`,
      `👤 *Proclamateur :* ${publisherName}`,
      publisherPhone ? `📱 *Tél :* ${publisherPhone}` : '',
      `🗺️ *Territoire demandé :* ${terrText}`,
      `📌 *Type préféré :* ${typeText}`,
      message.trim() ? `💬 *Précisions :* ${message.trim()}` : '',
      `📅 *Date :* ${new Date().toLocaleDateString('fr-FR')}`,
      ``,
      `Merci beaucoup mon frère pour l'attribution ! 🙏`
    ].filter(Boolean);

    return lines.join('\n');
  };

  const handleSendWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const chosenTerritory = availableTerritories.find(t => t.id === selectedTerritoryId);

    const newRequest: TerritoryRequest = {
      id: 'req-' + Date.now(),
      publisherName: publisherName.trim() || 'Proclamateur',
      publisherEmail: settings.publisherEmail,
      publisherPhone: publisherPhone.trim() || undefined,
      message: message.trim() || 'Demande de territoire standard',
      preferredType,
      requestedTerritoryId: chosenTerritory ? chosenTerritory.id : null,
      requestedTerritoryNumber: chosenTerritory ? chosenTerritory.number : null,
      createdAt: new Date().toISOString(),
      status: 'pending'
    };

    // 1. Sauvegarde locale dans l'application
    await StorageService.saveTerritoryRequest(newRequest);
    await loadRequests();

    // 2. Préparation du lien WhatsApp
    const waText = encodeURIComponent(generateWhatsAppMessage());
    let waUrl = `https://api.whatsapp.com/send?text=${waText}`;
    if (servantPhone.trim()) {
      const cleanPhone = servantPhone.replace(/[^0-9]/g, '');
      waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${waText}`;
    }

    setIsSubmitting(false);
    setSuccess(true);

    if (onRequestSubmitted) {
      onRequestSubmitted();
    }

    // Ouverture de WhatsApp
    window.open(waUrl, '_blank');

    setTimeout(() => {
      setSuccess(false);
      setActiveTab('history');
    }, 1500);
  };

  const handleSaveOnly = async () => {
    setIsSubmitting(true);
    const chosenTerritory = availableTerritories.find(t => t.id === selectedTerritoryId);

    const newRequest: TerritoryRequest = {
      id: 'req-' + Date.now(),
      publisherName: publisherName.trim() || 'Proclamateur',
      publisherEmail: settings.publisherEmail,
      publisherPhone: publisherPhone.trim() || undefined,
      message: message.trim() || 'Demande de territoire standard',
      preferredType,
      requestedTerritoryId: chosenTerritory ? chosenTerritory.id : null,
      requestedTerritoryNumber: chosenTerritory ? chosenTerritory.number : null,
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
    }, 1500);
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
        maxWidth: '580px',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-secondary)',
        position: 'relative',
        borderRadius: '16px',
        border: '1px solid var(--border-subtle)',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
      }}>
        {/* En-tête */}
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
              width: 42,
              height: 42,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #25D366, #128C7E)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: '0 4px 15px rgba(37, 211, 102, 0.35)'
            }}>
              <HelpCircle size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                Demande de territoire
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', margin: 0 }}>
                {settings.congregationName || 'Assemblée Locale'} • Envoi direct via WhatsApp
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

        {/* Onglets */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-tertiary)' }}>
          <button
            type="button"
            onClick={() => setActiveTab('new')}
            style={{
              flex: 1,
              padding: '0.7rem',
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
              padding: '0.7rem',
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
            <form onSubmit={handleSendWhatsApp} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              {/* Bannière d'information */}
              <div style={{
                padding: '0.85rem',
                borderRadius: '10px',
                background: 'rgba(37, 211, 102, 0.08)',
                border: '1px solid rgba(37, 211, 102, 0.3)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem'
              }}>
                <MessageSquare size={20} color="#25D366" style={{ marginTop: 2, flexShrink: 0 }} />
                <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', lineHeight: 1.45 }}>
                  <strong>Fais ta demande au frère responsable des territoires.</strong>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: 3 }}>
                    Elle sera enregistrée dans l'application et transmise directement par <strong>WhatsApp</strong> pour une attribution immédiate.
                  </div>
                </div>
              </div>

              {/* Demandeur & Coordonnées */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Nom du Proclamateur *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <User size={15} color="var(--text-muted)" style={{ position: 'absolute', left: 10, top: 10 }} />
                    <input
                      type="text"
                      required
                      value={publisherName}
                      onChange={(e) => setPublisherName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.6rem 0.55rem 2.1rem',
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                        fontSize: '0.85rem'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Mon Téléphone / WhatsApp
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Phone size={15} color="var(--text-muted)" style={{ position: 'absolute', left: 10, top: 10 }} />
                    <input
                      type="tel"
                      placeholder="ex: 06 12 34 56 78"
                      value={publisherPhone}
                      onChange={(e) => setPublisherPhone(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.6rem 0.55rem 2.1rem',
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                        fontSize: '0.85rem'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Sélection d'un territoire disponible ou quelconque */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}>
                  <MapPin size={14} color="#38bdf8" style={{ display: 'inline', marginRight: 4 }} />
                  Territoire souhaité
                </label>
                <select
                  value={selectedTerritoryId}
                  onChange={(e) => setSelectedTerritoryId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.75rem',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  <option value="any">✨ Premier territoire disponible (au choix du responsable)</option>
                  {availableTerritories.map(t => (
                    <option key={t.id} value={t.id}>
                      N° {t.number} - {t.label} ({t.type})
                    </option>
                  ))}
                </select>
                {availableTerritories.length > 0 && (
                  <div style={{ fontSize: '0.72rem', color: '#10b981', marginTop: 4 }}>
                    ✓ {availableTerritories.length} territoire(s) actuellement disponible(s) dans la congrégation.
                  </div>
                )}
              </div>

              {/* Préférence de secteur */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Préférence de secteur (si territoire au choix)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(95px, 1fr))', gap: '6px' }}>
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

              {/* Suggestions rapides */}
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Précisions rapides en 1 clic :
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {quickMessages.map((q, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setMessage(q)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        background: 'var(--bg-tertiary)',
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

              {/* Message personnalisé */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Message pour le frère des territoires
                </label>
                <textarea
                  rows={3}
                  placeholder="Écris ton message ici (ex: tes jours de prédication, avec qui tu seras...)"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.75rem',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Numéro du frère responsable (facultatif si direct) */}
              <div style={{ padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Numéro WhatsApp du préposé aux territoires (laisser vide pour choisir dans WhatsApp) :
                </label>
                <input
                  type="tel"
                  placeholder="ex: +33612345678"
                  value={servantPhone}
                  onChange={(e) => setServantPhone(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.45rem 0.65rem',
                    background: 'rgba(0,0,0,0.2)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '0.8rem'
                  }}
                />
              </div>

              {/* Boutons d'action */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                    color: 'white',
                    border: 'none',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.6rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(37, 211, 102, 0.4)'
                  }}
                >
                  <Send size={18} />
                  {success ? '✓ Transmis via WhatsApp !' : 'Envoyer la demande via WhatsApp 💬'}
                </button>

                <button
                  type="button"
                  onClick={handleSaveOnly}
                  className="btn btn-secondary"
                  style={{ padding: '0.55rem', fontSize: '0.8rem' }}
                >
                  Enregistrer uniquement dans l'application
                </button>
              </div>
            </form>
          ) : (
            /* ONGLET HISTORIQUE DES DEMANDES */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {previousRequests.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
                  <HelpCircle size={40} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                  <p style={{ fontSize: '0.85rem', margin: 0 }}>Aucune demande enregistrée pour le moment.</p>
                </div>
              ) : (
                previousRequests.map(req => {
                  const assignedTerr = req.fulfilledTerritoryId 
                    ? territories.find(t => t.id === req.fulfilledTerritoryId)
                    : null;

                  return (
                    <div
                      key={req.id}
                      style={{
                        padding: '1rem',
                        background: 'var(--bg-tertiary)',
                        borderRadius: '10px',
                        border: req.status === 'fulfilled' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--border-subtle)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.6rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: req.status === 'fulfilled' ? 'rgba(16, 185, 129, 0.18)' : 'rgba(245, 158, 11, 0.18)',
                            color: req.status === 'fulfilled' ? '#10b981' : '#f59e0b',
                            border: req.status === 'fulfilled' ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(245, 158, 11, 0.35)'
                          }}>
                            {req.status === 'fulfilled' ? '✓ Attribué' : '⏳ En attente du responsable'}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {new Date(req.createdAt).toLocaleDateString('fr-FR')}
                          </span>
                        </div>

                        {req.requestedTerritoryNumber && (
                          <span style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 600 }}>
                            Demandé : Territoire N° {req.requestedTerritoryNumber}
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                        « {req.message} »
                      </div>

                      {/* Si le territoire a été attribué : bouton pour l'ouvrir immédiatement ! */}
                      {req.status === 'fulfilled' && assignedTerr && (
                        <div style={{
                          marginTop: '0.25rem',
                          padding: '0.65rem 0.85rem',
                          background: 'rgba(16, 185, 129, 0.08)',
                          borderRadius: '8px',
                          border: '1px solid rgba(16, 185, 129, 0.25)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.5rem',
                          flexWrap: 'wrap'
                        }}>
                          <div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#10b981' }}>
                              Territoire attribué : N° {assignedTerr.number} - {assignedTerr.label}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              {assignedTerr.dateDue ? `À parcourir jusqu'au ${new Date(assignedTerr.dateDue).toLocaleDateString('fr-FR')}` : 'Prêt à être prêché'}
                            </div>
                          </div>

                          {onOpenTerritory && (
                            <button
                              type="button"
                              onClick={() => {
                                onOpenTerritory(assignedTerr);
                                onClose();
                              }}
                              className="btn btn-primary"
                              style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}
                            >
                              <span>Ouvrir mon territoire</span>
                              <ArrowRight size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Pied de page */}
        <div style={{
          padding: '0.85rem 1.5rem',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(255, 255, 255, 0.02)'
        }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            KBV Territory
          </div>
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
