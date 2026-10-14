import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Printer, 
  UserCheck, 
  RotateCcw, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  MapPin, 
  Inbox, 
  Download, 
  Eye, 
  Trash2, 
  ChevronUp, 
  ChevronDown,
  Building,
  Home,
  Briefcase,
  Trees,
  Layers
} from 'lucide-react';
import type { 
  Territory, 
  Publisher, 
  ServiceGroup, 
  LocationItem, 
  TerritoryRequest, 
  CongregationSettings,
  TerritoryType
} from '../types';
import { StorageService } from '../services/storage';

interface AccountTerritoriesViewProps {
  territories: Territory[];
  locations: LocationItem[];
  publishers: Publisher[];
  serviceGroups: ServiceGroup[];
  settings: CongregationSettings;
  onOpenTerritory: (territory: Territory) => void;
  onAssignTerritory: (territory: Territory) => void;
  onReturnTerritory: (territory: Territory) => void;
  onEditBoundary: (territory: Territory) => void;
  onPrintTerritory: (territory: Territory) => void;
  onRefreshData: () => void;
  onSwitchToPublisherView: () => void;
}

export const AccountTerritoriesView: React.FC<AccountTerritoriesViewProps> = ({
  territories,
  locations,
  publishers,
  serviceGroups,
  settings,
  onOpenTerritory,
  onAssignTerritory,
  onReturnTerritory,
  onEditBoundary,
  onPrintTerritory,
  onRefreshData,
  onSwitchToPublisherView
}) => {
  // Filtres
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'assigned' | 'in_progress' | 'overdue'>('all');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [publisherFilter, setPublisherFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Tri
  const [sortField, setSortField] = useState<'number' | 'label' | 'status' | 'dateAssigned' | 'dateDue' | 'dateLastCompleted'>('number');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // Sélection multiple
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modales
  const [isRequestsModalOpen, setIsRequestsModalOpen] = useState(false);
  const [requests, setRequests] = useState<TerritoryRequest[]>([]);
  const [isNewTerritoryModalOpen, setIsNewTerritoryModalOpen] = useState(false);
  const [batchPrintTerritories, setBatchPrintTerritories] = useState<Territory[] | null>(null);

  // Formulaire nouveau territoire
  const [newNumber, setNewNumber] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState<TerritoryType>('urban');
  const [newGroupId, setNewGroupId] = useState(serviceGroups[0]?.id || '');
  const [newNotes, setNewNotes] = useState('');

  // Charger les demandes
  const loadRequests = async () => {
    const list = await StorageService.getTerritoryRequests();
    setRequests(list);
  };

  React.useEffect(() => {
    loadRequests();
  }, []);

  // Calcul du statut de retard (Overdue) : supérieur à settings.defaultAssignmentMonths (ex. 4 mois)
  const isTerritoryOverdue = (terr: Territory): boolean => {
    if (terr.status === 'available') return false;
    if (!terr.dateDue) return false;
    const today = new Date();
    const due = new Date(terr.dateDue);
    return today > due;
  };

  const getDaysOverdue = (terr: Territory): number => {
    if (!terr.dateDue) return 0;
    const today = new Date().getTime();
    const due = new Date(terr.dateDue).getTime();
    const diff = today - due;
    if (diff <= 0) return 0;
    return Math.floor(diff / (1000 * 3600 * 24));
  };

  const getDaysAssigned = (terr: Territory): number => {
    if (!terr.dateAssigned) return 0;
    const today = new Date().getTime();
    const assigned = new Date(terr.dateAssigned).getTime();
    const diff = today - assigned;
    if (diff <= 0) return 0;
    return Math.floor(diff / (1000 * 3600 * 24));
  };

  // KPIs
  const totalCount = territories.length;
  const assignedCount = territories.filter(t => t.status === 'assigned' || t.status === 'in_progress').length;
  const availableCount = territories.filter(t => t.status === 'available').length;
  const overdueCount = territories.filter(t => isTerritoryOverdue(t)).length;
  const pendingRequestsCount = requests.filter(r => r.status === 'pending').length;
  const percentAssigned = totalCount > 0 ? Math.round((assignedCount / totalCount) * 100) : 0;

  // Filtrage et tri des données
  const filteredTerritories = useMemo(() => {
    return territories.filter(t => {
      // Filtre statut
      if (statusFilter === 'available' && t.status !== 'available') return false;
      if (statusFilter === 'assigned' && t.status !== 'assigned') return false;
      if (statusFilter === 'in_progress' && t.status !== 'in_progress') return false;
      if (statusFilter === 'overdue' && !isTerritoryOverdue(t)) return false;

      // Filtre groupe
      if (groupFilter !== 'all' && t.serviceGroupId !== groupFilter) return false;

      // Filtre proclamateur
      if (publisherFilter !== 'all' && t.assignee !== publisherFilter) return false;

      // Filtre type
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;

      // Filtre recherche textuelle
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const numMatch = t.number.toLowerCase().includes(q);
        const labelMatch = t.label.toLowerCase().includes(q);
        const assigneeMatch = t.assignee?.toLowerCase().includes(q) || false;
        if (!numMatch && !labelMatch && !assigneeMatch) return false;
      }

      return true;
    }).sort((a, b) => {
      let comparison = 0;
      if (sortField === 'number') {
        const numA = parseInt(a.number, 10) || 0;
        const numB = parseInt(b.number, 10) || 0;
        comparison = numA === numB ? a.number.localeCompare(b.number) : numA - numB;
      } else if (sortField === 'label') {
        comparison = a.label.localeCompare(b.label);
      } else if (sortField === 'status') {
        comparison = a.status.localeCompare(b.status);
      } else if (sortField === 'dateAssigned') {
        comparison = (a.dateAssigned || '').localeCompare(b.dateAssigned || '');
      } else if (sortField === 'dateDue') {
        comparison = (a.dateDue || '').localeCompare(b.dateDue || '');
      } else if (sortField === 'dateLastCompleted') {
        comparison = (a.dateLastCompleted || '').localeCompare(b.dateLastCompleted || '');
      }
      return sortAsc ? comparison : -comparison;
    });
  }, [territories, statusFilter, groupFilter, typeFilter, searchQuery, sortField, sortAsc]);

  // Gestion de la sélection multiple
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredTerritories.map(t => t.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Création d'un territoire
  const handleCreateTerritory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNumber.trim() || !newLabel.trim()) return;

    // Coordonnées approximatives au centre de la congrégation
    const baseCenter: [number, number] = territories[0]?.centerCoordinates || [45.7624, 4.8276];
    const offset = (territories.length * 0.003);
    const newCenter: [number, number] = [baseCenter[0] + offset, baseCenter[1] + offset];

    const newTerritory: Territory = {
      id: 'terr-' + Date.now().toString(36),
      number: newNumber.trim(),
      label: newLabel.trim(),
      type: newType,
      boundary: [
        [newCenter[0] - 0.0015, newCenter[1] - 0.0015],
        [newCenter[0] + 0.0015, newCenter[1] - 0.0015],
        [newCenter[0] + 0.0015, newCenter[1] + 0.0015],
        [newCenter[0] - 0.0015, newCenter[1] + 0.0015]
      ],
      centerCoordinates: newCenter,
      shortUrlCode: 'LYON' + newNumber.trim().toUpperCase(),
      status: 'available',
      assignee: null,
      serviceGroupId: newGroupId || null,
      dateAssigned: null,
      dateDue: null,
      dateLastCompleted: null,
      notes: newNotes.trim() || undefined
    };

    const updated = [...territories, newTerritory];
    await StorageService.saveTerritories(updated);
    setIsNewTerritoryModalOpen(false);
    setNewNumber('');
    setNewLabel('');
    setNewNotes('');
    onRefreshData();
  };

  // Suppression d'un territoire
  const handleDeleteTerritory = async (terr: Territory) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement le Territoire ${terr.number} - "${terr.label}" ?`)) {
      return;
    }
    const updated = territories.filter(t => t.id !== terr.id);
    await StorageService.saveTerritories(updated);
    setSelectedIds(prev => prev.filter(id => id !== terr.id));
    onRefreshData();
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Numéro', 'Nom', 'Type', 'Statut', 'Assigné à', 'Groupe', 'Date Attribution', 'Date Échéance', 'Dernière fois terminé', 'Jours attribués'];
    const rows = territories.map(t => [
      `"${t.number}"`,
      `"${t.label.replace(/"/g, '""')}"`,
      `"${t.type}"`,
      `"${t.status}"`,
      `"${(t.assignee || '').replace(/"/g, '""')}"`,
      `"${serviceGroups.find(g => g.id === t.serviceGroupId)?.name || ''}"`,
      `"${t.dateAssigned || ''}"`,
      `"${t.dateDue || ''}"`,
      `"${t.dateLastCompleted || ''}"`,
      `"${getDaysAssigned(t)}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `KBV_Territoires_Account_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Traiter une demande
  const handleFulfillRequest = async (req: TerritoryRequest, territory: Territory) => {
    // 1. Assigner le territoire au demandeur
    const d = new Date();
    d.setMonth(d.getMonth() + (settings.defaultAssignmentMonths || 4));
    const dueDate = d.toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];

    const updatedTerritories = territories.map(t => {
      if (t.id === territory.id) {
        return {
          ...t,
          status: 'assigned' as const,
          assignee: req.publisherName,
          dateAssigned: today,
          dateDue: dueDate
        };
      }
      return t;
    });

    await StorageService.saveTerritories(updatedTerritories);
    await StorageService.updateTerritoryRequestStatus(req.id, 'fulfilled');
    await loadRequests();
    onRefreshData();
    alert(`Territoire ${territory.number} attribué avec succès à ${req.publisherName} !`);
  };

  // Traiter le rejet ou l'archivage d'une demande
  const handleCancelRequest = async (reqId: string) => {
    await StorageService.updateTerritoryRequestStatus(reqId, 'cancelled');
    await loadRequests();
  };

  // Imprimer les cartes sélectionnées
  const handleBatchPrint = () => {
    const selected = territories.filter(t => selectedIds.includes(t.id));
    if (selected.length === 0) return;
    setBatchPrintTerritories(selected);
  };

  const getTypeIcon = (type: TerritoryType) => {
    switch (type) {
      case 'urban': return <Building size={14} className="text-cyan-400" />;
      case 'residential': return <Home size={14} className="text-emerald-400" />;
      case 'rural': return <Trees size={14} className="text-amber-400" />;
      case 'business': return <Briefcase size={14} className="text-purple-400" />;
      default: return <MapPin size={14} />;
    }
  };

  const getTypeLabel = (type: TerritoryType) => {
    switch (type) {
      case 'urban': return 'Urbain';
      case 'residential': return 'Résidentiel';
      case 'rural': return 'Rural';
      case 'business': return 'Commercial';
      case 'campaign': return 'Campagne';
      default: return type;
    }
  };

  return (
    <div className="account-territories-container" style={{ padding: '1.25rem 1.5rem', maxWidth: '1600px', margin: '0 auto' }}>
      
      {/* Barre de navigation supérieure Web Portal */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', padding: '0.2rem 0.6rem', borderRadius: '6px', background: 'rgba(2, 132, 199, 0.2)', color: '#38bdf8', fontWeight: 600 }}>
              PORTAIL CONGRÉGATION / ACCOUNT TERRITORIES
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Congrégation de {settings.congregationName}
            </span>
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Gestion des Territoires
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Bouton retour vue Proclamateur */}
          <button 
            onClick={onSwitchToPublisherView}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', padding: '0.55rem 0.95rem' }}
          >
            <Layers size={16} />
            <span>Vue Proclamateur</span>
          </button>

          {/* Bouton Demandes de territoire */}
          <button 
            onClick={() => setIsRequestsModalOpen(true)}
            className="btn btn-secondary"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              fontSize: '0.85rem', 
              padding: '0.55rem 0.95rem',
              position: 'relative',
              borderColor: pendingRequestsCount > 0 ? '#38bdf8' : undefined
            }}
          >
            <Inbox size={16} />
            <span>Demandes</span>
            {pendingRequestsCount > 0 && (
              <span style={{ 
                background: '#0284c7', 
                color: '#fff', 
                fontSize: '0.7rem', 
                fontWeight: 700, 
                padding: '0.1rem 0.45rem', 
                borderRadius: '999px',
                marginLeft: '0.25rem'
              }}>
                {pendingRequestsCount}
              </span>
            )}
          </button>

          {/* Bouton Exporter */}
          <button 
            onClick={handleExportCSV}
            className="btn btn-secondary"
            title="Exporter la liste au format CSV"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', padding: '0.55rem 0.95rem' }}
          >
            <Download size={16} />
            <span>Exporter CSV</span>
          </button>

          {/* Bouton Nouveau Territoire */}
          <button 
            onClick={() => setIsNewTerritoryModalOpen(true)}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', padding: '0.55rem 1.1rem' }}
          >
            <Plus size={16} />
            <span>Nouveau Territoire</span>
          </button>
        </div>
      </div>

      {/* Cartes KPIs / Statistiques officielles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        
        {/* Total */}
        <div className="glass-panel" style={{ padding: '1rem 1.25rem', borderLeft: '4px solid #38bdf8' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>
            <span>TOTAL TERRITOIRES</span>
            <Layers size={18} color="#38bdf8" />
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, marginTop: '0.25rem', color: '#fff' }}>
            {totalCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Répertoire officiel actif
          </div>
        </div>

        {/* Attribués */}
        <div className="glass-panel" style={{ padding: '1rem 1.25rem', borderLeft: '4px solid #0284c7' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>
            <span>ATTRIBUÉS</span>
            <UserCheck size={18} color="#0284c7" />
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, marginTop: '0.25rem', color: '#38bdf8' }}>
            {assignedCount} <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-muted)' }}>({percentAssigned}%)</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            En cours d'activité sur le terrain
          </div>
        </div>

        {/* Disponibles */}
        <div className="glass-panel" style={{ padding: '1rem 1.25rem', borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>
            <span>DISPONIBLES</span>
            <CheckCircle2 size={18} color="#10b981" />
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, marginTop: '0.25rem', color: '#34d399' }}>
            {availableCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Prêts pour attribution immédiate
          </div>
        </div>

        {/* En retard (> 4 mois) */}
        <div 
          className="glass-panel" 
          onClick={() => setStatusFilter(statusFilter === 'overdue' ? 'all' : 'overdue')}
          style={{ 
            padding: '1rem 1.25rem', 
            borderLeft: '4px solid #ef4444', 
            cursor: 'pointer',
            background: statusFilter === 'overdue' ? 'rgba(239, 68, 68, 0.15)' : undefined 
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>
            <span>EN RETARD (&gt; 4 MOIS)</span>
            <AlertTriangle size={18} color="#ef4444" />
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, marginTop: '0.25rem', color: overdueCount > 0 ? '#f87171' : '#fff' }}>
            {overdueCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: overdueCount > 0 ? '#f87171' : 'var(--text-muted)', marginTop: '0.25rem' }}>
            {overdueCount > 0 ? 'À relancer ou restituer' : 'Tous dans les délais'}
          </div>
        </div>

        {/* Demandes en attente */}
        <div 
          className="glass-panel" 
          onClick={() => setIsRequestsModalOpen(true)}
          style={{ padding: '1rem 1.25rem', borderLeft: '4px solid #a855f7', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>
            <span>DEMANDES PROCLAMATEURS</span>
            <Inbox size={18} color="#a855f7" />
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, marginTop: '0.25rem', color: '#c084fc' }}>
            {pendingRequestsCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Reçues via l'application
          </div>
        </div>

      </div>

      {/* Barre de Filtres et d'Outils Territory Helper */}
      <div className="glass-panel" style={{ padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
        
        {/* Ligne 1 : Onglets d'état rapides */}
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.75rem', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-subtle)' }}>
          <button
            onClick={() => setStatusFilter('all')}
            style={{
              padding: '0.4rem 0.9rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              background: statusFilter === 'all' ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
              color: statusFilter === 'all' ? '#fff' : 'var(--text-secondary)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              whiteSpace: 'nowrap'
            }}
          >
            <span>Tous les territoires</span>
            <span style={{ fontSize: '0.75rem', opacity: 0.8, padding: '0.05rem 0.35rem', background: 'rgba(0,0,0,0.2)', borderRadius: '4px' }}>
              {territories.length}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('assigned')}
            style={{
              padding: '0.4rem 0.9rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              background: statusFilter === 'assigned' ? '#0284c7' : 'rgba(255, 255, 255, 0.05)',
              color: statusFilter === 'assigned' ? '#fff' : 'var(--text-secondary)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              whiteSpace: 'nowrap'
            }}
          >
            <span>Attribués</span>
            <span style={{ fontSize: '0.75rem', opacity: 0.8, padding: '0.05rem 0.35rem', background: 'rgba(0,0,0,0.2)', borderRadius: '4px' }}>
              {territories.filter(t => t.status === 'assigned').length}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('available')}
            style={{
              padding: '0.4rem 0.9rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              background: statusFilter === 'available' ? '#059669' : 'rgba(255, 255, 255, 0.05)',
              color: statusFilter === 'available' ? '#fff' : 'var(--text-secondary)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              whiteSpace: 'nowrap'
            }}
          >
            <span>Disponibles</span>
            <span style={{ fontSize: '0.75rem', opacity: 0.8, padding: '0.05rem 0.35rem', background: 'rgba(0,0,0,0.2)', borderRadius: '4px' }}>
              {territories.filter(t => t.status === 'available').length}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('in_progress')}
            style={{
              padding: '0.4rem 0.9rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              background: statusFilter === 'in_progress' ? '#6366f1' : 'rgba(255, 255, 255, 0.05)',
              color: statusFilter === 'in_progress' ? '#fff' : 'var(--text-secondary)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              whiteSpace: 'nowrap'
            }}
          >
            <span>En cours</span>
            <span style={{ fontSize: '0.75rem', opacity: 0.8, padding: '0.05rem 0.35rem', background: 'rgba(0,0,0,0.2)', borderRadius: '4px' }}>
              {territories.filter(t => t.status === 'in_progress').length}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('overdue')}
            style={{
              padding: '0.4rem 0.9rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              background: statusFilter === 'overdue' ? '#dc2626' : 'rgba(255, 255, 255, 0.05)',
              color: statusFilter === 'overdue' ? '#fff' : 'var(--text-secondary)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              whiteSpace: 'nowrap'
            }}
          >
            <span>En retard (&gt; 4 mois)</span>
            <span style={{ fontSize: '0.75rem', opacity: 0.8, padding: '0.05rem 0.35rem', background: 'rgba(0,0,0,0.2)', borderRadius: '4px' }}>
              {overdueCount}
            </span>
          </button>
        </div>

        {/* Ligne 2 : Recherche et sélecteurs de filtres */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          
          {/* Recherche texte */}
          <div style={{ position: 'relative', flex: '1 1 260px' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text"
              placeholder="Rechercher par numéro, nom, proclamateur..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field"
              style={{ width: '100%', paddingLeft: '2.5rem', fontSize: '0.85rem', height: '38px' }}
            />
          </div>

          {/* Filtre Groupe */}
          <div style={{ flex: '0 1 200px' }}>
            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="input-field"
              style={{ width: '100%', fontSize: '0.85rem', height: '38px' }}
            >
              <option value="all">Tous les groupes</option>
              {serviceGroups.map(grp => (
                <option key={grp.id} value={grp.id}>{grp.name}</option>
              ))}
            </select>
          </div>

          {/* Filtre Proclamateur */}
          <div style={{ flex: '0 1 180px' }}>
            <select
              value={publisherFilter}
              onChange={(e) => setPublisherFilter(e.target.value)}
              className="input-field"
              style={{ width: '100%', fontSize: '0.85rem', height: '38px' }}
            >
              <option value="all">Tous proclamateurs</option>
              {publishers.map(pub => (
                <option key={pub.id} value={pub.name}>{pub.name}</option>
              ))}
            </select>
          </div>

          {/* Filtre Type */}
          <div style={{ flex: '0 1 180px' }}>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="input-field"
              style={{ width: '100%', fontSize: '0.85rem', height: '38px' }}
            >
              <option value="all">Tous les types</option>
              <option value="urban">Urbain</option>
              <option value="residential">Résidentiel</option>
              <option value="rural">Rural</option>
              <option value="business">Commercial</option>
              <option value="campaign">Campagne</option>
            </select>
          </div>

          {/* Actions de sélection multiple si des cases sont cochées */}
          {selectedIds.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
              <span style={{ fontSize: '0.8rem', color: '#38bdf8', fontWeight: 600 }}>
                {selectedIds.length} sélectionné(s)
              </span>
              <button
                onClick={handleBatchPrint}
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem', padding: '0.45rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <Printer size={15} />
                <span>Imprimer lot</span>
              </button>
              <button
                onClick={() => setSelectedIds([])}
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem', padding: '0.45rem 0.8rem' }}
              >
                Annuler
              </button>
            </div>
          )}

        </div>

      </div>

      {/* Grille de données / Tableau des Territoires (Data Grid) */}
      <div className="glass-panel" style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: 'rgba(15, 23, 42, 0.75)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
              
              {/* Checkbox sélection générale */}
              <th style={{ padding: '0.85rem 1rem', width: '40px' }}>
                <input 
                  type="checkbox"
                  checked={filteredTerritories.length > 0 && selectedIds.length === filteredTerritories.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  style={{ cursor: 'pointer', borderRadius: '4px' }}
                />
              </th>

              {/* N° */}
              <th 
                onClick={() => handleSort('number')}
                style={{ padding: '0.85rem 1rem', cursor: 'pointer', userSelect: 'none', width: '90px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span>N°</span>
                  {sortField === 'number' && (sortAsc ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                </div>
              </th>

              {/* Nom / Libellé */}
              <th 
                onClick={() => handleSort('label')}
                style={{ padding: '0.85rem 1rem', cursor: 'pointer', userSelect: 'none', minWidth: '200px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span>Nom du Territoire</span>
                  {sortField === 'label' && (sortAsc ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                </div>
              </th>

              {/* Type */}
              <th style={{ padding: '0.85rem 1rem', width: '130px' }}>
                <span>Type</span>
              </th>

              {/* Statut */}
              <th 
                onClick={() => handleSort('status')}
                style={{ padding: '0.85rem 1rem', cursor: 'pointer', userSelect: 'none', width: '150px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span>Statut</span>
                  {sortField === 'status' && (sortAsc ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                </div>
              </th>

              {/* Proclamateur */}
              <th style={{ padding: '0.85rem 1rem', minWidth: '160px' }}>
                <span>Assigné à</span>
              </th>

              {/* Groupe */}
              <th style={{ padding: '0.85rem 1rem', minWidth: '150px' }}>
                <span>Groupe</span>
              </th>

              {/* Date attribution */}
              <th 
                onClick={() => handleSort('dateAssigned')}
                style={{ padding: '0.85rem 1rem', cursor: 'pointer', userSelect: 'none', width: '140px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span>Attribué le</span>
                  {sortField === 'dateAssigned' && (sortAsc ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                </div>
              </th>

              {/* Date échéance */}
              <th 
                onClick={() => handleSort('dateDue')}
                style={{ padding: '0.85rem 1rem', cursor: 'pointer', userSelect: 'none', width: '150px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span>Échéance (4 m.)</span>
                  {sortField === 'dateDue' && (sortAsc ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                </div>
              </th>

              {/* Dernier retour */}
              <th 
                onClick={() => handleSort('dateLastCompleted')}
                style={{ padding: '0.85rem 1rem', cursor: 'pointer', userSelect: 'none', width: '130px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span>Dernier retour</span>
                  {sortField === 'dateLastCompleted' && (sortAsc ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                </div>
              </th>

              {/* Portes / Adresses */}
              <th style={{ padding: '0.85rem 1rem', width: '90px', textAlign: 'center' }}>
                <span>Portes</span>
              </th>

              {/* Actions */}
              <th style={{ padding: '0.85rem 1rem', width: '160px', textAlign: 'right' }}>
                <span>Actions</span>
              </th>

            </tr>
          </thead>
          <tbody>
            {filteredTerritories.length === 0 ? (
              <tr>
                <td colSpan={12} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Layers size={36} style={{ margin: '0 auto 0.75rem auto', opacity: 0.4 }} />
                  <p style={{ fontSize: '1rem', fontWeight: 600 }}>Aucun territoire ne correspond aux filtres sélectionnés</p>
                  <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Essayez de réinitialiser la recherche ou le filtre de statut.</p>
                </td>
              </tr>
            ) : (
              filteredTerritories.map(terr => {
                const isOverdue = isTerritoryOverdue(terr);
                const daysOverdue = getDaysOverdue(terr);
                const daysAssigned = getDaysAssigned(terr);
                const isSelected = selectedIds.includes(terr.id);
                const group = serviceGroups.find(g => g.id === terr.serviceGroupId);
                const terrLocs = locations.filter(l => l.territoryId === terr.id);
                const doorCount = terrLocs.reduce((acc, l) => acc + (l.units.length > 0 ? l.units.length : 1), 0);

                return (
                  <tr 
                    key={terr.id}
                    style={{ 
                      borderBottom: '1px solid var(--border-subtle)',
                      background: isSelected ? 'rgba(2, 132, 199, 0.12)' : (isOverdue ? 'rgba(239, 68, 68, 0.05)' : 'transparent'),
                      transition: 'background 0.15s ease'
                    }}
                  >
                    {/* Checkbox */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <input 
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(terr.id)}
                        style={{ cursor: 'pointer', borderRadius: '4px' }}
                      />
                    </td>

                    {/* N° */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span style={{ 
                        display: 'inline-block',
                        padding: '0.25rem 0.55rem',
                        borderRadius: '6px',
                        fontWeight: 800,
                        fontSize: '0.9rem',
                        background: terr.status === 'available' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(2, 132, 199, 0.2)',
                        color: terr.status === 'available' ? '#34d399' : '#38bdf8'
                      }}>
                        {terr.number}
                      </span>
                    </td>

                    {/* Nom / Libellé */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.9rem' }}>
                        {terr.label}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.15rem' }}>
                        <span>Code: {terr.shortUrlCode}</span>
                        {terr.notes && (
                          <span title={terr.notes} style={{ cursor: 'help', color: 'var(--text-secondary)' }}>• 📝 note</span>
                        )}
                      </div>
                    </td>

                    {/* Type */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                        {getTypeIcon(terr.type)}
                        <span>{getTypeLabel(terr.type)}</span>
                      </div>
                    </td>

                    {/* Statut */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      {terr.status === 'available' && (
                        <span style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '0.35rem',
                          background: 'rgba(16, 185, 129, 0.15)', 
                          color: '#34d399', 
                          padding: '0.25rem 0.6rem', 
                          borderRadius: '999px',
                          fontSize: '0.75rem',
                          fontWeight: 700
                        }}>
                          <CheckCircle2 size={12} />
                          Disponible
                        </span>
                      )}

                      {terr.status === 'assigned' && !isOverdue && (
                        <span style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '0.35rem',
                          background: 'rgba(2, 132, 199, 0.15)', 
                          color: '#38bdf8', 
                          padding: '0.25rem 0.6rem', 
                          borderRadius: '999px',
                          fontSize: '0.75rem',
                          fontWeight: 700
                        }}>
                          <UserCheck size={12} />
                          Attribué
                        </span>
                      )}

                      {terr.status === 'in_progress' && !isOverdue && (
                        <span style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '0.35rem',
                          background: 'rgba(99, 102, 241, 0.15)', 
                          color: '#818cf8', 
                          padding: '0.25rem 0.6rem', 
                          borderRadius: '999px',
                          fontSize: '0.75rem',
                          fontWeight: 700
                        }}>
                          <Clock size={12} />
                          En cours
                        </span>
                      )}

                      {isOverdue && (
                        <span style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '0.35rem',
                          background: 'rgba(239, 68, 68, 0.2)', 
                          color: '#f87171', 
                          padding: '0.25rem 0.6rem', 
                          borderRadius: '999px',
                          fontSize: '0.75rem',
                          fontWeight: 700
                        }}>
                          <AlertTriangle size={12} />
                          En retard (+{daysOverdue} j)
                        </span>
                      )}
                    </td>

                    {/* Proclamateur */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      {terr.assignee ? (
                        <div style={{ fontWeight: 600, color: '#fff' }}>
                          {terr.assignee}
                        </div>
                      ) : (
                        <button
                          onClick={() => onAssignTerritory(terr)}
                          style={{
                            background: 'rgba(2, 132, 199, 0.15)',
                            color: '#38bdf8',
                            border: '1px dashed #0284c7',
                            padding: '0.25rem 0.6rem',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          + Assigner
                        </button>
                      )}
                    </td>

                    {/* Groupe */}
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)' }}>
                      {group ? group.name : '—'}
                    </td>

                    {/* Date attribution */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      {terr.dateAssigned ? (
                        <div>
                          <div>{new Date(terr.dateAssigned).toLocaleDateString('fr-FR')}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            il y a {daysAssigned} j
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>

                    {/* Date échéance */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      {terr.dateDue ? (
                        <div>
                          <div style={{ color: isOverdue ? '#f87171' : 'inherit', fontWeight: isOverdue ? 700 : 'normal' }}>
                            {new Date(terr.dateDue).toLocaleDateString('fr-FR')}
                          </div>
                          {isOverdue && (
                            <div style={{ fontSize: '0.7rem', color: '#f87171' }}>
                              dépassé de {daysOverdue} j
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>

                    {/* Dernier retour */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      {terr.dateLastCompleted ? (
                        new Date(terr.dateLastCompleted).toLocaleDateString('fr-FR')
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>Jamais</span>
                      )}
                    </td>

                    {/* Portes */}
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                      <span style={{ 
                        fontSize: '0.8rem', 
                        fontWeight: 700, 
                        background: 'rgba(255, 255, 255, 0.05)', 
                        padding: '0.2rem 0.5rem', 
                        borderRadius: '6px' 
                      }}>
                        {doorCount}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }}>
                        
                        {/* Ouvrir la fiche / Voir */}
                        <button
                          onClick={() => onOpenTerritory(terr)}
                          className="btn-icon"
                          title="Ouvrir la fiche de terrain"
                          style={{ padding: '0.35rem', color: 'var(--text-secondary)' }}
                        >
                          <Eye size={16} />
                        </button>

                        {/* Imprimer la carte */}
                        <button
                          onClick={() => onPrintTerritory(terr)}
                          className="btn-icon"
                          title="Imprimer la fiche (S-12/S-13)"
                          style={{ padding: '0.35rem', color: 'var(--text-secondary)' }}
                        >
                          <Printer size={16} />
                        </button>

                        {/* Assigner ou Restituer */}
                        {terr.status === 'available' ? (
                          <button
                            onClick={() => onAssignTerritory(terr)}
                            className="btn-icon"
                            title="Attribuer à un proclamateur"
                            style={{ padding: '0.35rem', color: '#38bdf8' }}
                          >
                            <UserCheck size={16} />
                          </button>
                        ) : (
                          <button
                            onClick={() => onReturnTerritory(terr)}
                            className="btn-icon"
                            title="Restituer le territoire"
                            style={{ padding: '0.35rem', color: '#f59e0b' }}
                          >
                            <RotateCcw size={16} />
                          </button>
                        )}

                        {/* Modifier les frontières */}
                        <button
                          onClick={() => onEditBoundary(terr)}
                          className="btn-icon"
                          title="Modifier les frontières (polygone)"
                          style={{ padding: '0.35rem', color: 'var(--text-secondary)' }}
                        >
                          <MapPin size={16} />
                        </button>

                        {/* Supprimer */}
                        <button
                          onClick={() => handleDeleteTerritory(terr)}
                          className="btn-icon"
                          title="Supprimer ce territoire"
                          style={{ padding: '0.35rem', color: '#ef4444' }}
                        >
                          <Trash2 size={16} />
                        </button>

                      </div>
                    </td>

                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MODALE : Demandes de territoires (Pending Requests) */}
      {isRequestsModalOpen && (
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
          zIndex: 3500,
          padding: '1rem'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '780px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ padding: '0.45rem', background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', borderRadius: '8px' }}>
                  <Inbox size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Demandes de Territoires des Proclamateurs</h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Attribution et validation des requêtes soumises</p>
                </div>
              </div>
              <button onClick={() => setIsRequestsModalOpen(false)} className="btn-icon">
                ✕
              </button>
            </div>

            <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1 }}>
              {requests.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem 0', color: 'var(--text-muted)' }}>
                  <Inbox size={40} style={{ margin: '0 auto 0.75rem auto', opacity: 0.3 }} />
                  <p style={{ fontWeight: 600 }}>Aucune demande enregistrée pour le moment</p>
                  <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Les proclamateurs peuvent formuler des demandes via le bouton « ? » sur leur vue.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {requests.map(req => {
                    const availableTerritories = territories.filter(t => t.status === 'available');

                    return (
                      <div 
                        key={req.id} 
                        style={{ 
                          padding: '1rem 1.25rem', 
                          borderRadius: '10px', 
                          background: 'rgba(255, 255, 255, 0.03)', 
                          border: '1px solid var(--border-subtle)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.75rem'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>
                              {req.publisherName}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              Demandé le {new Date(req.createdAt).toLocaleDateString('fr-FR')} • Type souhaité : <strong style={{ color: '#38bdf8' }}>{req.preferredType || 'Tous types'}</strong>
                            </div>
                          </div>

                          <span style={{
                            padding: '0.2rem 0.6rem',
                            borderRadius: '999px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: req.status === 'pending' ? 'rgba(245, 158, 11, 0.2)' : (req.status === 'fulfilled' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.1)'),
                            color: req.status === 'pending' ? '#fbbf24' : (req.status === 'fulfilled' ? '#34d399' : 'var(--text-muted)')
                          }}>
                            {req.status === 'pending' ? 'En attente' : (req.status === 'fulfilled' ? 'Attribué' : 'Archivé')}
                          </span>
                        </div>

                        {req.message && (
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.25)', padding: '0.6rem 0.85rem', borderRadius: '6px', fontStyle: 'italic' }}>
                            « {req.message} »
                          </div>
                        )}

                        {req.status === 'pending' && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Attribuer immédiatement :</span>
                            {availableTerritories.length === 0 ? (
                              <span style={{ fontSize: '0.8rem', color: '#ef4444' }}>Aucun territoire disponible</span>
                            ) : (
                              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                {availableTerritories.slice(0, 4).map(avail => (
                                  <button
                                    key={avail.id}
                                    onClick={() => handleFulfillRequest(req, avail)}
                                    className="btn btn-secondary"
                                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', borderColor: '#0284c7' }}
                                  >
                                    N° {avail.number} ({avail.label})
                                  </button>
                                ))}
                              </div>
                            )}

                            <button
                              onClick={() => handleCancelRequest(req.id)}
                              className="btn btn-secondary"
                              style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', marginLeft: 'auto', color: '#ef4444' }}
                            >
                              Refuser / Archiver
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODALE : Nouveau Territoire */}
      {isNewTerritoryModalOpen && (
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
          zIndex: 3500,
          padding: '1rem'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '540px' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ padding: '0.45rem', background: 'rgba(2, 132, 199, 0.2)', color: '#38bdf8', borderRadius: '8px' }}>
                  <Plus size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Créer un Nouveau Territoire</h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ajout d'une carte au répertoire de la congrégation</p>
                </div>
              </div>
              <button onClick={() => setIsNewTerritoryModalOpen(false)} className="btn-icon">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTerritory} style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Numéro de territoire * (ex: 04, 15A)
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="ex: 04"
                  value={newNumber}
                  onChange={(e) => setNewNumber(e.target.value)}
                  className="input-field"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Nom / Libellé du territoire * (ex: Croix-Rousse Plateau)
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="ex: Quartier des Brotteaux"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="input-field"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Type de terrain
                  </label>
                  <select 
                    value={newType} 
                    onChange={(e) => setNewType(e.target.value as TerritoryType)}
                    className="input-field"
                    style={{ width: '100%' }}
                  >
                    <option value="urban">Urbain</option>
                    <option value="residential">Résidentiel</option>
                    <option value="rural">Rural</option>
                    <option value="business">Commercial</option>
                    <option value="campaign">Campagne</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Groupe de service associé
                  </label>
                  <select 
                    value={newGroupId} 
                    onChange={(e) => setNewGroupId(e.target.value)}
                    className="input-field"
                    style={{ width: '100%' }}
                  >
                    {serviceGroups.map(grp => (
                      <option key={grp.id} value={grp.id}>{grp.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Notes ou instructions particulières
                </label>
                <textarea 
                  rows={3}
                  placeholder="ex: Accès par la rue centrale, stationnement recommandé place de l'église..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', resize: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button 
                  type="button" 
                  onClick={() => setIsNewTerritoryModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                >
                  Enregistrer le territoire
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE : Impression en lot */}
      {batchPrintTerritories && (
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
          zIndex: 3500,
          padding: '1rem'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '850px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="no-print" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ padding: '0.45rem', background: 'rgba(2, 132, 199, 0.2)', color: '#38bdf8', borderRadius: '8px' }}>
                  <Printer size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Imprimer la Sélection ({batchPrintTerritories.length} territoires)</h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Impression groupée des fiches et récapitulatif pour la congrégation</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => window.print()} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Printer size={16} />
                  <span>Lancer l'impression</span>
                </button>
                <button onClick={() => setBatchPrintTerritories(null)} className="btn-icon">
                  ✕
                </button>
              </div>
            </div>

            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
              <div style={{ border: '1px solid #ddd', padding: '1.5rem', background: '#fff', color: '#000', borderRadius: '8px' }}>
                <div style={{ borderBottom: '2px solid #000', paddingBottom: '0.75rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h2 style={{ fontSize: '1.3rem', fontWeight: 900, textTransform: 'uppercase', margin: 0 }}>RÉCAPITULATIF DES TERRITOIRES S-13</h2>
                    <div style={{ fontSize: '0.85rem' }}>Congrégation : {settings.congregationName}</div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '0.85rem' }}>
                    <div>Date : {new Date().toLocaleDateString('fr-FR')}</div>
                    <div>{batchPrintTerritories.length} cartes sélectionnées</div>
                  </div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: '#f3f4f6', borderBottom: '2px solid #000' }}>
                      <th style={{ padding: '0.5rem', border: '1px solid #ccc' }}>N°</th>
                      <th style={{ padding: '0.5rem', border: '1px solid #ccc' }}>Nom du Territoire</th>
                      <th style={{ padding: '0.5rem', border: '1px solid #ccc' }}>Type</th>
                      <th style={{ padding: '0.5rem', border: '1px solid #ccc' }}>Statut</th>
                      <th style={{ padding: '0.5rem', border: '1px solid #ccc' }}>Assigné à</th>
                      <th style={{ padding: '0.5rem', border: '1px solid #ccc' }}>Date Attribution</th>
                      <th style={{ padding: '0.5rem', border: '1px solid #ccc' }}>Date Échéance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchPrintTerritories.map(t => (
                      <tr key={t.id}>
                        <td style={{ padding: '0.5rem', border: '1px solid #ccc', fontWeight: 700, textAlign: 'center' }}>{t.number}</td>
                        <td style={{ padding: '0.5rem', border: '1px solid #ccc' }}>{t.label}</td>
                        <td style={{ padding: '0.5rem', border: '1px solid #ccc' }}>{getTypeLabel(t.type)}</td>
                        <td style={{ padding: '0.5rem', border: '1px solid #ccc' }}>{t.status === 'available' ? 'Disponible' : (t.status === 'assigned' ? 'Attribué' : t.status)}</td>
                        <td style={{ padding: '0.5rem', border: '1px solid #ccc' }}>{t.assignee || '—'}</td>
                        <td style={{ padding: '0.5rem', border: '1px solid #ccc' }}>{t.dateAssigned ? new Date(t.dateAssigned).toLocaleDateString('fr-FR') : '—'}</td>
                        <td style={{ padding: '0.5rem', border: '1px solid #ccc' }}>{t.dateDue ? new Date(t.dateDue).toLocaleDateString('fr-FR') : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
