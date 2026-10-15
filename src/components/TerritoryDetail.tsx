import React, { useState } from 'react';
import { 
  ArrowLeft, 
  MapPin, 
  Building2, 
  Home, 
  AlertTriangle, 
  Share2, 
  FileText, 
  QrCode, 
  Calendar, 
  UserCheck, 
  Key, 
  PenTool, 
  RotateCcw, 
  ArrowUpDown,
  Lock,
  Globe,
  Printer,
  Navigation,
  CheckCircle2,
  MessageCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { Territory, LocationItem, VisitStatus, FieldNote, FreehandDrawing } from '../types';
import { sortLocationsByOrder } from '../utils/sorting';
import type { StreetSortOrder } from '../utils/sorting';
import { TerritoryMap } from './TerritoryMap';
import { NavigationModal } from './NavigationModal';
import { useTranslation } from '../i18n/LanguageContext';
import { StorageService } from '../services/storage';

interface TerritoryDetailProps {
  territory: Territory;
  locations: LocationItem[];
  onBack: () => void;
  onUpdateLocationStatus: (locationId: string, status: VisitStatus) => void;
  onUpdateUnitStatus: (locationId: string, unitId: string, status: VisitStatus) => void;
  onUpdateNotes: (locationId: string, notes: string, personalNotes?: string) => void;
  onShare: (territory: Territory) => void;
  onOpenAnnotate?: (territory: Territory) => void;
  onReturnTerritory?: (territory: Territory) => void;
  onAssignTerritory?: (territory: Territory) => void;
  onPrint?: (territory: Territory) => void;
  onSaveFieldNote?: (territoryId: string, note: Omit<FieldNote, 'id' | 'createdAt'>) => void;
  onDeleteFieldNote?: (territoryId: string, noteId: string) => void;
  onAddNewLocationAtPoint?: (latLng: [number, number]) => void;
  onSaveFreehandDrawing?: (territoryId: string, drawing: FreehandDrawing) => void;
  onClearFreehandDrawings?: (territoryId: string) => void;
}

export const TerritoryDetail: React.FC<TerritoryDetailProps> = ({
  territory,
  locations,
  onBack,
  onUpdateLocationStatus,
  onUpdateUnitStatus,
  onUpdateNotes,
  onShare,
  onOpenAnnotate,
  onReturnTerritory,
  onAssignTerritory,
  onPrint,
  onSaveFieldNote,
  onDeleteFieldNote,
  onAddNewLocationAtPoint,
  onSaveFreehandDrawing,
  onClearFreehandDrawings
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'streets' | 'map'>('streets');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'not_at_home' | 'not_visited' | 'visited'>('all');
  const [expandedBuildingId, setExpandedBuildingId] = useState<string | null>(null);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [tempPublicNotes, setTempPublicNotes] = useState<string>('');
  const [tempPersonalNotes, setTempPersonalNotes] = useState<string>('');
  const [navigationTarget, setNavigationTarget] = useState<{ latLng: [number, number]; title: string; subtitle?: string } | null>(null);
  const [acknowledged, setAcknowledged] = useState<boolean>(Boolean(territory.receiptAcknowledged));
  const [acknowledgedSuccess, setAcknowledgedSuccess] = useState<boolean>(false);

  const handleAcknowledgeReceipt = async () => {
    setAcknowledged(true);
    setAcknowledgedSuccess(true);
    await StorageService.acknowledgeTerritoryReceipt(territory.id);
    setTimeout(() => setAcknowledgedSuccess(false), 5000);
  };

  const handleSendThankYouWhatsApp = () => {
    const lines = [
      `*CONFIRMATION DE RÉCEPTION - KBV Territory*`,
      `Bonjour mon frère ! 🙏`,
      ``,
      `J'ai bien reçu la carte du *Territoire N° ${territory.number} - ${territory.label}*.`,
      `Merci beaucoup, je commence à le prêcher ! ✨`
    ];
    const text = encodeURIComponent(lines.join('\n'));
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  // Gestion du tri par rue (Ordre 1, 2, 3... / Pairs d'abord / Impairs d'abord)
  const [streetSortOrders, setStreetSortOrders] = useState<Record<string, StreetSortOrder>>({});

  const territoryLocations = locations.filter(l => l.territoryId === territory.id);

  // Calcul des statistiques
  let totalPoints = 0;
  let visitedPoints = 0;
  let notAtHomePoints = 0;
  let notVisitedPoints = 0;
  let returnVisitPoints = 0;
  let doNotCallPoints = 0;

  territoryLocations.forEach(loc => {
    if (loc.units.length > 0) {
      loc.units.forEach(u => {
        totalPoints++;
        if (u.status === 'visited') visitedPoints++;
        else if (u.status === 'not_at_home') notAtHomePoints++;
        else if (u.status === 'return_visit') returnVisitPoints++;
        else if (u.status === 'do_not_call') doNotCallPoints++;
        else notVisitedPoints++;
      });
    } else {
      totalPoints++;
      if (loc.status === 'visited') visitedPoints++;
      else if (loc.status === 'not_at_home') notAtHomePoints++;
      else if (loc.status === 'return_visit') returnVisitPoints++;
      else if (loc.status === 'do_not_call') doNotCallPoints++;
      else notVisitedPoints++;
    }
  });

  const progressPercent = totalPoints > 0 ? Math.round((visitedPoints / totalPoints) * 100) : 0;

  const handleStatusChange = (locId: string, status: VisitStatus, unitId?: string) => {
    if (unitId) {
      onUpdateUnitStatus(locId, unitId, status);
    } else {
      onUpdateLocationStatus(locId, status);
    }

    if (visitedPoints + 1 >= totalPoints && totalPoints > 0 && status === 'visited') {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  };

  // Bascule du tri pour une rue donnée
  const toggleStreetSort = (streetName: string) => {
    setStreetSortOrders(prev => {
      const current = prev[streetName] || 'numeric';
      let next: StreetSortOrder = 'even_odd';
      if (current === 'even_odd') next = 'odd_even';
      else if (current === 'odd_even') next = 'numeric';
      return { ...prev, [streetName]: next };
    });
  };

  // Groupement des adresses par rue
  const streetsMap = new Map<string, LocationItem[]>();
  territoryLocations.forEach(loc => {
    const matches = selectedFilter === 'all' 
      ? true 
      : loc.status === selectedFilter || loc.units.some(u => u.status === selectedFilter);

    if (matches) {
      const list = streetsMap.get(loc.streetName) || [];
      list.push(loc);
      streetsMap.set(loc.streetName, list);
    }
  });

  const sortOrderLabels: Record<StreetSortOrder, string> = {
    numeric: 'Numérique (1, 2, 3...)',
    even_odd: 'Pairs d abord (2, 4... puis 1, 3...)',
    odd_even: 'Impairs d abord (1, 3... puis 2, 4...)'
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.25rem' }} className="animate-fade-in">
      {/* Barre supérieure de navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <button onClick={onBack} className="btn btn-secondary">
          <ArrowLeft size={18} />
          {t.backToTerritories}
        </button>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {onOpenAnnotate && (
            <button onClick={() => onOpenAnnotate(territory)} className="btn btn-secondary" title="Annoter ou dessiner au doigt sur la carte">
              <PenTool size={16} />
              {territory.annotationDataUrl ? t.viewAnnotation : t.annotate}
            </button>
          )}

          <button 
            onClick={() => setNavigationTarget({ latLng: territory.centerCoordinates, title: `Territoire ${territory.number}`, subtitle: territory.label })} 
            className="btn btn-secondary"
            title="Lancer l'itinéraire GPS vers le territoire (Google Maps, Waze...)"
          >
            <Navigation size={16} color="#38bdf8" />
            {t.directions}
          </button>

          {onPrint && (
            <button 
              onClick={() => onPrint(territory)} 
              className="btn btn-secondary"
              title="Imprimer la fiche officielle du territoire"
            >
              <Printer size={16} />
              {t.print}
            </button>
          )}

          <button onClick={() => onShare(territory)} className="btn btn-secondary">
            <Share2 size={16} />
            {t.share}
          </button>

          <button onClick={() => onShare(territory)} className="btn btn-primary">
            <QrCode size={16} />
            {t.qrCode}
          </button>

          {onAssignTerritory && territory.status === 'available' && (
            <button 
              onClick={() => onAssignTerritory(territory)} 
              className="btn btn-primary"
              style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
              title="Attribuer ce territoire à un proclamateur"
            >
              <UserCheck size={16} />
              Attribuer
            </button>
          )}

          {onReturnTerritory && territory.status !== 'available' && (
            <button 
              onClick={() => onReturnTerritory(territory)} 
              className="btn btn-secondary" 
              style={{ color: '#34d399', borderColor: 'rgba(16, 185, 129, 0.4)' }}
              title="Rendre le territoire à la congrégation"
            >
              <RotateCcw size={16} />
              Rendre
            </button>
          )}
        </div>
      </div>

      {/* Bannière Accusé de réception pour le proclamateur */}
      {territory.status !== 'available' && !acknowledged && (
        <div style={{
          marginBottom: '1.25rem',
          padding: '0.85rem 1.25rem',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.15), rgba(16, 185, 129, 0.15))',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <CheckCircle2 size={24} color="#10b981" />
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Nouveau territoire attribué !
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Confirme au frère responsable que tu as bien reçu cette carte sur ton appareil.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleAcknowledgeReceipt}
            className="btn btn-primary"
            style={{ 
              padding: '0.45rem 1rem', 
              fontSize: '0.82rem', 
              background: '#10b981', 
              borderColor: '#10b981',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <CheckCircle2 size={16} />
            <span>✓ Confirmer la bonne réception</span>
          </button>
        </div>
      )}

      {/* Message temporaire de confirmation avec bouton WhatsApp */}
      {acknowledgedSuccess && (
        <div style={{
          marginBottom: '1.25rem',
          padding: '0.85rem 1.25rem',
          borderRadius: '12px',
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid #10b981',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap'
        }}>
          <div style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 700 }}>
            ✓ Réception confirmée avec succès ! Le responsable des territoires a été informé.
          </div>
          <button
            type="button"
            onClick={handleSendThankYouWhatsApp}
            style={{
              padding: '0.4rem 0.85rem',
              borderRadius: '8px',
              background: '#25D366',
              color: 'white',
              border: 'none',
              fontSize: '0.8rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              cursor: 'pointer'
            }}
          >
            <MessageCircle size={15} />
            <span>Envoyer un mot par WhatsApp 💬</span>
          </button>
        </div>
      )}

      {/* En-tête résumé du territoire */}
      <div className="glass-panel" style={{ padding: '1.75rem', marginBottom: '1.5rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
              <span style={{ 
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', 
                color: 'white', 
                fontWeight: 800, 
                fontSize: '1.25rem', 
                padding: '0.2rem 0.75rem', 
                borderRadius: '8px',
                fontFamily: 'var(--font-mono)'
              }}>
                N° {territory.number}
              </span>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {territory.label}
              </h1>
            </div>

            <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-secondary)', fontSize: '0.875rem', flexWrap: 'wrap' }}>
              {territory.assignee && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <UserCheck size={15} color="#38bdf8" /> Proclamateur : <strong>{territory.assignee}</strong>
                </span>
              )}
              {territory.dateDue && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Calendar size={15} color="#f59e0b" /> Échéance (4 mois) : {territory.dateDue}
                </span>
              )}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
              {progressPercent}%
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Progression
            </div>
          </div>
        </div>

        {/* Barre de progression multi-statut */}
        <div style={{ height: '8px', width: '100%', background: 'rgba(255,255,255,0.06)', borderRadius: '999px', overflow: 'hidden', display: 'flex', marginBottom: '1.25rem' }}>
          <div style={{ width: `${(visitedPoints / (totalPoints || 1)) * 100}%`, background: '#10b981' }} title="Visités" />
          <div style={{ width: `${(returnVisitPoints / (totalPoints || 1)) * 100}%`, background: '#0ea5e9' }} title="Revisites" />
          <div style={{ width: `${(notAtHomePoints / (totalPoints || 1)) * 100}%`, background: '#f59e0b' }} title="Absents" />
          <div style={{ width: `${(doNotCallPoints / (totalPoints || 1)) * 100}%`, background: '#ef4444' }} title="Ne pas appeler" />
        </div>

        {/* Badges de comptage rapide */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div className="status-badge not_visited">
            <span>⬜ Non visités :</span>
            <strong>{notVisitedPoints}</strong>
          </div>
          <div className="status-badge not_at_home">
            <span>🟧 Absents :</span>
            <strong>{notAtHomePoints}</strong>
          </div>
          <div className="status-badge visited">
            <span>🟩 Visités :</span>
            <strong>{visitedPoints}</strong>
          </div>
          <div className="status-badge return_visit">
            <span>🟦 Revisites :</span>
            <strong>{returnVisitPoints}</strong>
          </div>
          {doNotCallPoints > 0 && (
            <div className="status-badge do_not_call">
              <span>🟥 Refus / Ne pas appeler :</span>
              <strong>{doNotCallPoints}</strong>
            </div>
          )}
        </div>
      </div>

      {/* Onglets : Rues ou Carte */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', background: 'var(--bg-tertiary)', padding: '4px', borderRadius: '10px', gap: '4px' }}>
          <button 
            onClick={() => setActiveTab('streets')}
            className={`btn ${activeTab === 'streets' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
          >
            <Building2 size={16} />
            Vue Rues & Portes ({territoryLocations.length})
          </button>
          <button 
            onClick={() => setActiveTab('map')}
            className={`btn ${activeTab === 'map' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
          >
            <MapPin size={16} />
            Vue Carte GPS
          </button>
        </div>

        {activeTab === 'streets' && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              onClick={() => setSelectedFilter('all')} 
              className={`btn ${selectedFilter === 'all' ? 'btn-secondary' : 'btn-ghost'}`}
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
            >
              Tous
            </button>
            <button 
              onClick={() => setSelectedFilter('not_at_home')} 
              className={`btn ${selectedFilter === 'not_at_home' ? 'btn-secondary' : 'btn-ghost'}`}
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', color: '#fbbf24' }}
            >
              Absents ({notAtHomePoints})
            </button>
            <button 
              onClick={() => setSelectedFilter('not_visited')} 
              className={`btn ${selectedFilter === 'not_visited' ? 'btn-secondary' : 'btn-ghost'}`}
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', color: '#94a3b8' }}
            >
              Non visités
            </button>
          </div>
        )}
      </div>

      {/* Contenu principal */}
      {activeTab === 'map' ? (
        <div className="glass-panel" style={{ height: 'clamp(380px, 60vh, 620px)', overflow: 'hidden' }}>
          <TerritoryMap 
            territories={[territory]} 
            selectedTerritory={territory} 
            locations={territoryLocations} 
            onSaveFieldNote={onSaveFieldNote}
            onDeleteFieldNote={onDeleteFieldNote}
            onAddNewLocationAtPoint={onAddNewLocationAtPoint}
            onSaveFreehandDrawing={onSaveFreehandDrawing}
            onClearFreehandDrawings={onClearFreehandDrawings}
            onStartDrawing={() => onOpenAnnotate && onOpenAnnotate(territory)}
          />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {Array.from(streetsMap.entries()).map(([streetName, streetLocations]) => {
            const currentSort = streetSortOrders[streetName] || 'numeric';
            const sortedStreetLocations = sortLocationsByOrder(streetLocations, currentSort);

            return (
              <div key={streetName} className="glass-panel" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MapPin size={18} color="#38bdf8" />
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>{streetName}</h3>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      ({streetLocations.length} adresse{streetLocations.length > 1 ? 's' : ''})
                    </span>
                  </div>

                  {/* Bouton de tri Pair / Impair (EvenOddComparer) */}
                  <button
                    onClick={() => toggleStreetSort(streetName)}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem', display: 'flex', alignItems: 'center', gap: 5 }}
                    title="Changer l ordre de parcours de la rue"
                  >
                    <ArrowUpDown size={13} color="#38bdf8" />
                    {sortOrderLabels[currentSort]}
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {sortedStreetLocations.map(loc => {
                    const isExpanded = expandedBuildingId === loc.id;
                    const isBuilding = loc.type === 'apartment_building';

                    return (
                      <div 
                        key={loc.id} 
                        style={{ 
                          background: 'rgba(15, 23, 42, 0.6)', 
                          border: '1px solid var(--border-subtle)', 
                          borderRadius: '10px',
                          padding: '1rem'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{ 
                              fontSize: '1.1rem', 
                              fontWeight: 800, 
                              fontFamily: 'var(--font-mono)',
                              background: 'var(--bg-tertiary)',
                              padding: '0.2rem 0.6rem',
                              borderRadius: '6px'
                            }}>
                              N° {loc.number}
                            </span>

                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {isBuilding ? (
                                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', color: '#818cf8', fontWeight: 600 }}>
                                    <Building2 size={14} /> Immeuble ({loc.units.length} sonnettes)
                                  </span>
                                ) : (
                                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', color: '#38bdf8', fontWeight: 600 }}>
                                    <Home size={14} /> Maison individuelle
                                  </span>
                                )}
                                
                                <span className={`status-badge ${loc.status}`}>
                                  {loc.status === 'not_visited' && 'Non visité'}
                                  {loc.status === 'not_at_home' && 'Absent'}
                                  {loc.status === 'visited' && 'Visité'}
                                  {loc.status === 'return_visit' && 'Revisite'}
                                  {loc.status === 'do_not_call' && 'Ne pas appeler'}
                                </span>

                                {loc.digicode && (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(236, 72, 153, 0.2)', border: '1px solid rgba(236, 72, 153, 0.4)', color: '#f472b6', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                                    <Key size={12} /> Code : {loc.digicode}
                                  </span>
                                )}
                              </div>

                              {loc.notes && (
                                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem', fontStyle: 'italic' }}>
                                  🌐 <strong>Note publique :</strong> {loc.notes}
                                </div>
                              )}

                              {loc.personalNotes && (
                                <div style={{ fontSize: '0.8rem', color: '#38bdf8', marginTop: '0.25rem', fontStyle: 'italic' }}>
                                  🔒 <strong>Note personnelle :</strong> {loc.personalNotes}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Actions selon le type (Immeuble ou Maison) */}
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {isBuilding ? (
                              <button 
                                onClick={() => setExpandedBuildingId(isExpanded ? null : loc.id)} 
                                className="btn btn-secondary"
                                style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
                              >
                                {isExpanded ? 'Masquer sonnettes ▲' : 'Voir les sonnettes ▼'}
                              </button>
                            ) : (
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <button 
                                  onClick={() => handleStatusChange(loc.id, 'not_at_home')}
                                  className="btn touch-target"
                                  style={{ 
                                    padding: '0.45rem 0.8rem', 
                                    fontSize: '0.8rem', 
                                    fontWeight: 600,
                                    background: loc.status === 'not_at_home' ? 'rgba(245, 158, 11, 0.4)' : 'rgba(245, 158, 11, 0.15)', 
                                    color: '#fbbf24', 
                                    border: loc.status === 'not_at_home' ? '1px solid #f59e0b' : '1px solid rgba(245, 158, 11, 0.35)',
                                    minHeight: '38px'
                                  }}
                                  title="Marquer Absent"
                                >
                                  Absent
                                </button>
                                <button 
                                  onClick={() => handleStatusChange(loc.id, 'visited')}
                                  className="btn touch-target"
                                  style={{ 
                                    padding: '0.45rem 0.8rem', 
                                    fontSize: '0.8rem', 
                                    fontWeight: 600,
                                    background: loc.status === 'visited' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(16, 185, 129, 0.15)', 
                                    color: '#34d399', 
                                    border: loc.status === 'visited' ? '1px solid #10b981' : '1px solid rgba(16, 185, 129, 0.35)',
                                    minHeight: '38px'
                                  }}
                                  title="Marquer Visité"
                                >
                                  Visité
                                </button>
                                <button 
                                  onClick={() => handleStatusChange(loc.id, 'return_visit')}
                                  className="btn touch-target"
                                  style={{ 
                                    padding: '0.45rem 0.8rem', 
                                    fontSize: '0.8rem', 
                                    fontWeight: 600,
                                    background: loc.status === 'return_visit' ? 'rgba(14, 165, 233, 0.4)' : 'rgba(14, 165, 233, 0.15)', 
                                    color: '#38bdf8', 
                                    border: loc.status === 'return_visit' ? '1px solid #0ea5e9' : '1px solid rgba(14, 165, 233, 0.35)',
                                    minHeight: '38px'
                                  }}
                                  title="Marquer Revisite"
                                >
                                  Revisite
                                </button>
                              </div>
                            )}

                            <button 
                              onClick={() => setNavigationTarget({ latLng: loc.latLng, title: `${loc.number} ${loc.streetName}`, subtitle: 'Adresse' })}
                              className="btn btn-ghost"
                              style={{ padding: '0.35rem 0.5rem', color: '#38bdf8' }}
                              title="Lancer l'itinéraire GPS vers cette adresse (Google Maps, Waze...)"
                            >
                              <Navigation size={15} />
                            </button>

                            <button 
                              onClick={() => {
                                setEditingNotesId(loc.id);
                                setTempPublicNotes(loc.notes || '');
                                setTempPersonalNotes(loc.personalNotes || '');
                              }}
                              className="btn btn-ghost"
                              style={{ padding: '0.35rem 0.5rem' }}
                              title="Ajouter ou modifier des notes"
                            >
                              <FileText size={15} />
                            </button>
                          </div>
                        </div>

                        {/* Édition de Notes Publiques vs Privées */}
                        {editingNotesId === loc.id && (
                          <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <div>
                              <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>
                                <Globe size={13} /> Note publique (digicode, sonnette, visible par tous) :
                              </label>
                              <input 
                                type="text" 
                                value={tempPublicNotes} 
                                onChange={(e) => setTempPublicNotes(e.target.value)}
                                placeholder="Code porte, interphone..."
                                style={{ width: '100%', padding: '0.45rem', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'white', fontSize: '0.8rem' }}
                              />
                            </div>

                            <div>
                              <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', color: '#38bdf8', marginBottom: 2 }}>
                                <Lock size={13} /> Note personnelle privée (vos revisites et centres dintérêt) :
                              </label>
                              <input 
                                type="text" 
                                value={tempPersonalNotes} 
                                onChange={(e) => setTempPersonalNotes(e.target.value)}
                                placeholder="M. Martin s intéresse à la Bible, repasser samedi..."
                                style={{ width: '100%', padding: '0.45rem', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'white', fontSize: '0.8rem' }}
                              />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                              <button onClick={() => setEditingNotesId(null)} className="btn btn-ghost" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>Annuler</button>
                              <button onClick={() => {
                                onUpdateNotes(loc.id, tempPublicNotes, tempPersonalNotes);
                                setEditingNotesId(null);
                              }} className="btn btn-primary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>Enregistrer</button>
                            </div>
                          </div>
                        )}

                        {/* Accordéon des sonnettes pour les immeubles */}
                        {isBuilding && isExpanded && (
                          <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.65rem' }}>
                              {loc.units.map(unit => (
                                <div 
                                  key={unit.id}
                                  style={{ 
                                    background: 'rgba(30, 41, 69, 0.4)', 
                                    padding: '0.65rem 0.85rem', 
                                    borderRadius: '8px', 
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '0.5rem'
                                  }}
                                >
                                  <div>
                                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                                      {unit.floor ? `${unit.floor} - ` : ''}{unit.unitNumber}
                                    </div>
                                    {unit.occupantName && (
                                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        {unit.occupantName}
                                      </div>
                                    )}
                                    {unit.status === 'do_not_call' && (
                                      <div style={{ color: '#ef4444', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 3, fontWeight: 700 }}>
                                        <AlertTriangle size={12} /> NE PAS APPELER
                                      </div>
                                    )}
                                  </div>

                                  <div style={{ display: 'flex', gap: '5px' }}>
                                    <button 
                                      onClick={() => handleStatusChange(loc.id, 'not_at_home', unit.id)}
                                      className="touch-target"
                                      style={{
                                        padding: '6px 10px',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        minHeight: '34px',
                                        border: unit.status === 'not_at_home' ? '1px solid #f59e0b' : '1px solid rgba(255,255,255,0.1)',
                                        background: unit.status === 'not_at_home' ? 'rgba(245, 158, 11, 0.4)' : 'rgba(255,255,255,0.06)',
                                        color: unit.status === 'not_at_home' ? '#fbbf24' : 'var(--text-secondary)'
                                      }}
                                    >
                                      Absent
                                    </button>
                                    <button 
                                      onClick={() => handleStatusChange(loc.id, 'visited', unit.id)}
                                      className="touch-target"
                                      style={{
                                        padding: '6px 10px',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        minHeight: '34px',
                                        border: unit.status === 'visited' ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.1)',
                                        background: unit.status === 'visited' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255,255,255,0.06)',
                                        color: unit.status === 'visited' ? '#34d399' : 'var(--text-secondary)'
                                      }}
                                    >
                                      Visité
                                    </button>
                                    <button 
                                      onClick={() => handleStatusChange(loc.id, 'return_visit', unit.id)}
                                      className="touch-target"
                                      style={{
                                        padding: '6px 10px',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        minHeight: '34px',
                                        border: unit.status === 'return_visit' ? '1px solid #0ea5e9' : '1px solid rgba(255,255,255,0.1)',
                                        background: unit.status === 'return_visit' ? 'rgba(14, 165, 233, 0.4)' : 'rgba(255,255,255,0.06)',
                                        color: unit.status === 'return_visit' ? '#38bdf8' : 'var(--text-secondary)'
                                      }}
                                    >
                                      Revisite
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de sélection d'itinéraire GPS */}
      {navigationTarget && (
        <NavigationModal
          title={navigationTarget.title}
          subtitle={navigationTarget.subtitle}
          latLng={navigationTarget.latLng}
          onClose={() => setNavigationTarget(null)}
        />
      )}
    </div>
  );
};
