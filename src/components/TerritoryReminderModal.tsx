import React, { useState } from 'react';
import { 
  Bell, 
  X, 
  MessageCircle, 
  Send, 
  Copy, 
  Check, 
  Calendar, 
  Clock, 
  Flame, 
  Sparkles 
} from 'lucide-react';
import type { Territory, Publisher } from '../types';

interface TerritoryReminderModalProps {
  territory: Territory;
  publishers: Publisher[];
  campaignName?: string;
  onSendReminder: (territoryId: string, method: 'whatsapp' | 'sms' | 'copy') => void;
  onClose: () => void;
}

export const TerritoryReminderModal: React.FC<TerritoryReminderModalProps> = ({
  territory,
  publishers,
  campaignName,
  onSendReminder,
  onClose
}) => {
  const matchedPublisher = publishers.find(p => p.name.toLowerCase() === territory.assignee?.toLowerCase());
  const [phoneNumber, setPhoneNumber] = useState(matchedPublisher?.phone || '');
  const [reminderType, setReminderType] = useState<'campaign' | 'friendly' | 'overdue'>('campaign');
  const [copied, setCopied] = useState(false);

  // Calcul du temps de détention
  const getMonthsHeld = (): number => {
    if (!territory.dateAssigned) return 0;
    const assigned = new Date(territory.dateAssigned).getTime();
    const now = new Date().getTime();
    const diffDays = Math.floor((now - assigned) / (1000 * 3600 * 24));
    return Math.max(1, Math.round((diffDays / 30.4) * 10) / 10);
  };

  const monthsHeld = getMonthsHeld();
  const directLink = `${window.location.origin}${window.location.pathname}#territory=${territory.id}`;

  // Génération du texte automatique
  const generateMessage = (): string => {
    const publisherName = territory.assignee || 'cher proclamateur';
    const terrName = `N° ${territory.number} - ${territory.label}`;
    const dateStr = territory.dateAssigned ? new Date(territory.dateAssigned).toLocaleDateString('fr-FR') : 'quelques temps';
    const campaignContext = campaignName ? `🎯 *Pour la ${campaignName} :*\n` : `🎯 *Pour les campagnes spéciales :*\n`;

    if (reminderType === 'campaign') {
      return (
        `*RAPPEL AMICAL - KBV Territory* 🗺️✨\n` +
        `Bonjour ${publisherName} ! J'espère que tu vas bien et que ta prédication se passe bien. 🙏\n\n` +
        `Tu disposes actuellement du territoire *${terrName}* qui t'a été attribué le ${dateStr} (soit depuis environ ${monthsHeld} mois).\n\n` +
        `${campaignContext}` +
        `Nous préparons la réattribution des territoires afin d'intensifier la prédication dans notre congrégation. Pourrais-tu nous indiquer où tu en es dans son parcours ?\n\n` +
        `👉 S'il est terminé, pourrais-tu nous le restituer pour qu'un autre proclamateur ou pionnier puisse le parcourir ?\n\n` +
        `📱 *Lien direct de ton territoire :*\n${directLink}\n\n` +
        `Merci infiniment pour ton zèle et ton beau travail fraternel ! ✨`
      );
    }

    if (reminderType === 'overdue') {
      return (
        `*SUIVI DES TERRITOIRES - KBV Territory* ⏰\n` +
        `Bonjour ${publisherName} ! Petit message fraternel pour prendre des nouvelles. 😊\n\n` +
        `Le territoire *${terrName}* t'a été confié le ${dateStr} (soit depuis ${monthsHeld} mois). L'échéance des 4 mois est arrivée à son terme.\n\n` +
        `Pourrais-tu nous dire s'il te reste quelques rues à terminer ou si tu peux le rendre cette semaine ? Si tu as besoin d'aide avec des pionniers ou d'autres proclamateurs pour le boucler, n'hésite pas !\n\n` +
        `📱 *Lien direct :*\n${directLink}\n\n` +
        `Merci beaucoup pour ta fidélité et tes efforts dans le ministère ! 🙏`
      );
    }

    // Friendly reminder standard
    return (
      `*NOUVELLES DU TERRITOIRE - KBV Territory* 🤝\n` +
      `Bonjour ${publisherName} ! J'espère que tout va bien pour toi.\n\n` +
      `Tu as en ta possession le territoire *${terrName}* depuis le ${dateStr} (${monthsHeld} mois).\n\n` +
      `As-tu pu bien avancer dans les rues et les immeubles ? Penses-tu pouvoir le terminer prochainement, ou souhaites-tu nous le restituer ?\n\n` +
      `📱 *Fiche de ton territoire :*\n${directLink}\n\n` +
      `Merci pour ton zèle et bonne semaine de prédication ! 🌟`
    );
  };

  const [customMessage, setCustomMessage] = useState(generateMessage());

  // Mise à jour si le type de relance change
  const handleTypeChange = (newType: 'campaign' | 'friendly' | 'overdue') => {
    setReminderType(newType);
    const publisherName = territory.assignee || 'cher proclamateur';
    const terrName = `N° ${territory.number} - ${territory.label}`;
    const dateStr = territory.dateAssigned ? new Date(territory.dateAssigned).toLocaleDateString('fr-FR') : 'quelques temps';
    const campaignContext = campaignName ? `🎯 *Pour la ${campaignName} :*\n` : `🎯 *Pour les campagnes spéciales :*\n`;

    if (newType === 'campaign') {
      setCustomMessage(
        `*RAPPEL AMICAL - KBV Territory* 🗺️✨\n` +
        `Bonjour ${publisherName} ! J'espère que tu vas bien et que ta prédication se passe bien. 🙏\n\n` +
        `Tu disposes actuellement du territoire *${terrName}* qui t'a été attribué le ${dateStr} (soit depuis environ ${monthsHeld} mois).\n\n` +
        `${campaignContext}` +
        `Nous préparons la réattribution des territoires afin d'intensifier la prédication dans notre congrégation. Pourrais-tu nous indiquer où tu en es dans son parcours ?\n\n` +
        `👉 S'il est terminé, pourrais-tu nous le restituer pour qu'un autre proclamateur ou pionnier puisse le parcourir ?\n\n` +
        `📱 *Lien direct de ton territoire :*\n${directLink}\n\n` +
        `Merci infiniment pour ton zèle et ton beau travail fraternel ! ✨`
      );
    } else if (newType === 'overdue') {
      setCustomMessage(
        `*SUIVI DES TERRITOIRES - KBV Territory* ⏰\n` +
        `Bonjour ${publisherName} ! Petit message fraternel pour prendre des nouvelles. 😊\n\n` +
        `Le territoire *${terrName}* t'a été confié le ${dateStr} (soit depuis ${monthsHeld} mois). L'échéance des 4 mois est arrivée à son terme.\n\n` +
        `Pourrais-tu nous dire s'il te reste quelques rues à terminer ou si tu peux le rendre cette semaine ? Si tu as besoin d'aide avec des pionniers ou d'autres proclamateurs pour le boucler, n'hésite pas !\n\n` +
        `📱 *Lien direct :*\n${directLink}\n\n` +
        `Merci beaucoup pour ta fidélité et tes efforts dans le ministère ! 🙏`
      );
    } else {
      setCustomMessage(
        `*NOUVELLES DU TERRITOIRE - KBV Territory* 🤝\n` +
        `Bonjour ${publisherName} ! J'espère que tout va bien pour toi.\n\n` +
        `Tu as en ta possession le territoire *${terrName}* depuis le ${dateStr} (${monthsHeld} mois).\n\n` +
        `As-tu pu bien avancer dans les rues et les immeubles ? Penses-tu pouvoir le terminer prochainement, ou souhaites-tu nous le restituer ?\n\n` +
        `📱 *Fiche de ton territoire :*\n${directLink}\n\n` +
        `Merci pour ton zèle et bonne semaine de prédication ! 🌟`
      );
    }
  };

  // Envoi WhatsApp
  const handleSendWhatsApp = () => {
    const text = encodeURIComponent(customMessage);
    let url = `https://api.whatsapp.com/send?text=${text}`;
    if (phoneNumber.trim()) {
      const clean = phoneNumber.replace(/[^0-9]/g, '');
      url = `https://api.whatsapp.com/send?phone=${clean}&text=${text}`;
    }
    window.open(url, '_blank');
    onSendReminder(territory.id, 'whatsapp');
  };

  // Envoi SMS
  const handleSendSMS = () => {
    const text = encodeURIComponent(customMessage);
    const clean = phoneNumber.replace(/[^0-9]/g, '');
    const url = clean ? `sms:${clean}?body=${text}` : `sms:?body=${text}`;
    window.location.href = url;
    onSendReminder(territory.id, 'sms');
  };

  // Copier dans le presse-papier
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(customMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onSendReminder(territory.id, 'copy');
    } catch {
      alert('Texte copié !');
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
          maxWidth: '650px',
          maxHeight: '92vh',
          overflowY: 'auto',
          borderRadius: '16px',
          padding: '1.75rem',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7)',
          border: '1px solid rgba(245, 158, 11, 0.35)'
        }}
      >
        {/* En-tête */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: '0 4px 15px rgba(245, 158, 11, 0.4)'
            }}>
              <Bell size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#fff' }}>
                Rappel & Relance Territoire
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0' }}>
                Territoire N° {territory.number} - {territory.label} • Proclamateur : <strong style={{ color: '#fbbf24' }}>{territory.assignee}</strong>
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

        {/* Détails détention */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: '0.75rem',
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          borderRadius: '10px',
          padding: '0.85rem 1rem',
          marginBottom: '1.25rem'
        }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#fbbf24', fontWeight: 700, textTransform: 'uppercase' }}>
              Date d'attribution
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff', marginTop: '2px', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Calendar size={14} color="#fbbf24" />
              {territory.dateAssigned ? new Date(territory.dateAssigned).toLocaleDateString('fr-FR') : 'Non renseignée'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.72rem', color: '#fbbf24', fontWeight: 700, textTransform: 'uppercase' }}>
              Durée de détention
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: monthsHeld >= 4 ? '#f87171' : '#fbbf24', marginTop: '2px', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Clock size={14} />
              {monthsHeld} mois (depuis attribution)
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.72rem', color: '#fbbf24', fontWeight: 700, textTransform: 'uppercase' }}>
              Dernière relance
            </div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: territory.lastReminderDate ? '#34d399' : 'var(--text-muted)', marginTop: '2px' }}>
              {territory.lastReminderDate ? `Envoyée le ${new Date(territory.lastReminderDate).toLocaleDateString('fr-FR')}` : 'Aucune relance'}
            </div>
          </div>
        </div>

        {/* Sélection de la tonalité / motif */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
            Motif & Tonalité du message de rappel :
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem' }}>
            
            <button
              type="button"
              onClick={() => handleTypeChange('campaign')}
              style={{
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                textAlign: 'left',
                border: reminderType === 'campaign' ? '1px solid #f59e0b' : '1px solid var(--border-subtle)',
                background: reminderType === 'campaign' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                color: reminderType === 'campaign' ? '#fbbf24' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Flame size={14} color="#f59e0b" /> Campagne Spéciale
              </div>
              <div style={{ fontSize: '0.7rem', marginTop: '2px', opacity: 0.8 }}>
                Besoin du territoire pour la campagne
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleTypeChange('overdue')}
              style={{
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                textAlign: 'left',
                border: reminderType === 'overdue' ? '1px solid #ef4444' : '1px solid var(--border-subtle)',
                background: reminderType === 'overdue' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                color: reminderType === 'overdue' ? '#f87171' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Clock size={14} color="#ef4444" /> Échéance Dépassée
              </div>
              <div style={{ fontSize: '0.7rem', marginTop: '2px', opacity: 0.8 }}>
                Rappel des 4 mois officiels
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleTypeChange('friendly')}
              style={{
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                textAlign: 'left',
                border: reminderType === 'friendly' ? '1px solid #38bdf8' : '1px solid var(--border-subtle)',
                background: reminderType === 'friendly' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                color: reminderType === 'friendly' ? '#38bdf8' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Sparkles size={14} color="#38bdf8" /> Prise de Nouvelles
              </div>
              <div style={{ fontSize: '0.7rem', marginTop: '2px', opacity: 0.8 }}>
                Rappel bienveillant standard
              </div>
            </button>

          </div>
        </div>

        {/* Téléphone WhatsApp / SMS */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
            Numéro de téléphone du proclamateur (WhatsApp / SMS) :
          </label>
          <input
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="ex: 06 12 34 56 78 ou +33 6 12 34 56 78"
            style={{
              width: '100%',
              padding: '0.6rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-tertiary)',
              color: 'white',
              fontSize: '0.88rem'
            }}
          />
        </div>

        {/* Zone de prévisualisation du message */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
              Message pré-rédigé (vous pouvez le modifier librement) :
            </label>
            <button
              type="button"
              onClick={handleCopy}
              className="btn btn-ghost"
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4, color: copied ? '#10b981' : '#38bdf8' }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copié !' : 'Copier texte'}
            </button>
          </div>

          <textarea
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            rows={8}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(10, 15, 25, 0.7)',
              color: '#f8fafc',
              fontSize: '0.85rem',
              lineHeight: 1.5,
              fontFamily: 'inherit',
              resize: 'vertical'
            }}
          />
        </div>

        {/* Actions d'envoi en bas */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost"
            style={{ padding: '0.6rem 1.1rem' }}
          >
            Fermer
          </button>

          <button
            type="button"
            onClick={handleSendSMS}
            className="btn btn-secondary"
            style={{
              padding: '0.6rem 1.1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              borderColor: '#38bdf8',
              color: '#38bdf8'
            }}
            title="Ouvrir l'application SMS native"
          >
            <Send size={16} />
            <span>Envoyer par SMS</span>
          </button>

          <button
            type="button"
            onClick={handleSendWhatsApp}
            className="btn"
            style={{
              padding: '0.6rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: 700,
              background: '#25D366',
              color: '#ffffff',
              boxShadow: '0 4px 15px rgba(37, 211, 102, 0.4)'
            }}
            title="Ouvrir WhatsApp avec le message pré-rempli"
          >
            <MessageCircle size={18} />
            <span>Envoyer via WhatsApp</span>
          </button>
        </div>

      </div>
    </div>
  );
};
