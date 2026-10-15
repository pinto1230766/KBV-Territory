import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  BookOpen, 
  Compass, 
  Clock, 
  Target, 
  Camera,
  HelpCircle
} from 'lucide-react';
import type { 
  Territory, 
  LocationItem, 
  VisitStatus, 
  CongregationSettings, 
  VisitRecord, 
  Campaign,
  Publisher,
  ServiceGroup,
  FieldNote,
  FreehandDrawing
} from './types';
import { StorageService } from './services/storage';
import { TerritoryList } from './components/TerritoryList';
import { TerritoryDetail } from './components/TerritoryDetail';
import { TerritoryMap } from './components/TerritoryMap';
import { VisitsHistory } from './components/VisitsHistory';
import { ShareModal } from './components/ShareModal';
import { SettingsModal } from './components/SettingsModal';
import { CampaignsModal } from './components/CampaignsModal';
import { QrScannerModal } from './components/QrScannerModal';
import { PolygonEditorModal } from './components/PolygonEditorModal';
import { AssignReturnModal } from './components/AssignReturnModal';
import { AnnotationCanvasModal } from './components/AnnotationCanvasModal';
import { PrintTerritoryModal } from './components/PrintTerritoryModal';
import { RequestTerritoryModal } from './components/RequestTerritoryModal';
import { AccountTerritoriesView } from './components/AccountTerritoriesView';
import { TerritoryDesignerModal } from './components/TerritoryDesignerModal';
import { FileSpreadsheet } from 'lucide-react';
import { useTranslation } from './i18n/LanguageContext';
import type { LanguageCode } from './i18n/translations';

export const App: React.FC = () => {
  const { t, setLanguage } = useTranslation();
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [visits, setVisits] = useState<VisitRecord[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [printingTerritory, setPrintingTerritory] = useState<Territory | null>(null);
  const [settings, setSettings] = useState<CongregationSettings>({
    congregationName: 'Lyon Centre',
    language: 'fr',
    publisherName: 'Jean Dupont',
    allowDoNotCallDisplay: true,
    theme: 'dark',
    defaultAssignmentMonths: 4,
    gdprCompliant: true,
    publisherEmail: 'jean.dupont@congre.org',
    showMapPreview: true,
    appVersion: '4.2.1-fr'
  });

  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [serviceGroups, setServiceGroups] = useState<ServiceGroup[]>([]);
  const [assigningTerritory, setAssigningTerritory] = useState<Territory | null>(null);
  const [returningTerritory, setReturningTerritory] = useState<Territory | null>(null);
  const [annotatingTerritory, setAnnotatingTerritory] = useState<Territory | null>(null);

  const [currentView, setCurrentView] = useState<'list' | 'map' | 'history' | 'account'>('list');
  const [selectedTerritory, setSelectedTerritory] = useState<Territory | null>(null);
  const [shareTerritory, setShareTerritory] = useState<Territory | null>(null);
  const [editingBoundaryTerritory, setEditingBoundaryTerritory] = useState<Territory | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCampaignsOpen, setIsCampaignsOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isRequestTerritoryOpen, setIsRequestTerritoryOpen] = useState(false);
  const [isDesignerOpen, setIsDesignerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Chargement global des données
  const loadAllData = async () => {
    try {
      setIsLoading(true);
      const [tList, lList, vList, cList, sList, pList, gList] = await Promise.all([
        StorageService.getTerritories(),
        StorageService.getLocations(),
        StorageService.getVisits(),
        StorageService.getCampaigns(),
        StorageService.getSettings(),
        StorageService.getPublishers(),
        StorageService.getServiceGroups()
      ]);
      setTerritories(tList);
      setLocations(lList);
      setVisits(vList);
      setCampaigns(cList);
      setSettings(sList);
      if (sList.language) {
        setLanguage(sList.language as LanguageCode);
      }
      setPublishers(pList);
      setServiceGroups(gList);
    } catch (e) {
      console.error('Erreur chargement:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Application automatique du thème (sombre / clair / système)
  useEffect(() => {
    const th = settings.theme || 'dark';
    const resolved = th === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : th;
    document.documentElement.setAttribute('data-theme', resolved);
  }, [settings.theme]);

  // Détection des URL directes / QR Code (ex: #territory=terr-01 ou #account)
  useEffect(() => {
    const hash = window.location.hash.toLowerCase();
    const pathname = window.location.pathname.toLowerCase();
    if (hash.includes('account') || pathname.includes('account') || hash.includes('territories')) {
      setCurrentView('account');
      setSelectedTerritory(null);
    } else if (hash.includes('territory=')) {
      const terrId = hash.split('territory=')[1];
      const target = territories.find(t => t.id === terrId);
      if (target) {
        setSelectedTerritory(target);
      }
    }
  }, [territories]);

  // Enregistrement / mise à jour d'un statut de maison
  const handleUpdateLocationStatus = async (locationId: string, status: VisitStatus) => {
    const updated = locations.map(loc => {
      if (loc.id === locationId) {
        return {
          ...loc,
          status,
          dateLastVisited: new Date().toISOString().split('T')[0]
        };
      }
      return loc;
    });

    setLocations(updated);
    await StorageService.saveLocations(updated);

    const target = locations.find(l => l.id === locationId);
    if (target) {
      const newRec = await StorageService.recordVisit({
        territoryId: target.territoryId,
        locationId: target.id,
        addressLabel: `${target.number} ${target.streetName}`,
        status,
        publisherName: settings.publisherName,
        campaignId: settings.activeCampaignId
      });
      setVisits(prev => [newRec, ...prev]);
    }
  };

  // Enregistrement / mise à jour d'un statut d'appartement
  const handleUpdateUnitStatus = async (locationId: string, unitId: string, status: VisitStatus) => {
    const updated = locations.map(loc => {
      if (loc.id === locationId) {
        const updatedUnits = loc.units.map(u => {
          if (u.id === unitId) {
            return {
              ...u,
              status,
              dateLastVisited: new Date().toISOString().split('T')[0]
            };
          }
          return u;
        });

        const allVisited = updatedUnits.every(u => u.status === 'visited');
        const anyAbsent = updatedUnits.some(u => u.status === 'not_at_home');

        let newBuildingStatus = loc.status;
        if (allVisited) newBuildingStatus = 'visited';
        else if (anyAbsent) newBuildingStatus = 'not_at_home';

        return {
          ...loc,
          status: newBuildingStatus,
          units: updatedUnits
        };
      }
      return loc;
    });

    setLocations(updated);
    await StorageService.saveLocations(updated);

    const target = locations.find(l => l.id === locationId);
    const unitTarget = target?.units.find(u => u.id === unitId);
    if (target && unitTarget) {
      const newRec = await StorageService.recordVisit({
        territoryId: target.territoryId,
        locationId: target.id,
        unitId,
        addressLabel: `${target.number} ${target.streetName} - ${unitTarget.floor ? `${unitTarget.floor} - ` : ''}${unitTarget.unitNumber}`,
        status,
        publisherName: settings.publisherName,
        campaignId: settings.activeCampaignId
      });
      setVisits(prev => [newRec, ...prev]);
    }
  };

  const handleUpdateNotes = async (locationId: string, notes: string, personalNotes?: string) => {
    const updated = locations.map(loc => {
      if (loc.id === locationId) {
        return { 
          ...loc, 
          notes,
          personalNotes: personalNotes !== undefined ? personalNotes : loc.personalNotes
        };
      }
      return loc;
    });
    setLocations(updated);
    await StorageService.saveLocations(updated);
  };

  // Attribution officielle d'un territoire à un proclamateur
  const handleAssignTerritory = async (territoryId: string, publisherName: string, serviceGroupId: string | null, dueDate: string) => {
    const updated = territories.map(t => {
      if (t.id === territoryId) {
        return {
          ...t,
          status: 'assigned' as const,
          assignee: publisherName,
          serviceGroupId: serviceGroupId,
          dateAssigned: new Date().toISOString().split('T')[0],
          dateDue: dueDate
        };
      }
      return t;
    });
    setTerritories(updated);
    await StorageService.saveTerritories(updated);

    if (selectedTerritory?.id === territoryId) {
      setSelectedTerritory(prev => prev ? {
        ...prev,
        status: 'assigned',
        assignee: publisherName,
        serviceGroupId: serviceGroupId,
        dateAssigned: new Date().toISOString().split('T')[0],
        dateDue: dueDate
      } : null);
    }
    setAssigningTerritory(null);
  };

  // Restitution d'un territoire avec réinitialisation optionnelle des statuts
  const handleReturnTerritory = async (territoryId: string, resetStatuses: boolean, notes: string) => {
    await StorageService.returnTerritory(territoryId, resetStatuses, notes);
    const [tList, lList] = await Promise.all([
      StorageService.getTerritories(),
      StorageService.getLocations()
    ]);
    setTerritories(tList);
    setLocations(lList);

    if (selectedTerritory?.id === territoryId) {
      const found = tList.find(t => t.id === territoryId);
      setSelectedTerritory(found || null);
    }
    setReturningTerritory(null);
  };

  // Sauvegarde des dessins ou annotations manuscrites sur la carte
  const handleSaveAnnotation = async (territoryId: string, dataUrl: string | null) => {
    const updated = territories.map(t => {
      if (t.id === territoryId) {
        return {
          ...t,
          annotationDataUrl: dataUrl
        };
      }
      return t;
    });
    setTerritories(updated);
    await StorageService.saveTerritories(updated);

    if (selectedTerritory?.id === territoryId) {
      setSelectedTerritory(prev => prev ? { ...prev, annotationDataUrl: dataUrl } : null);
    }
    setAnnotatingTerritory(null);
  };

  // Enregistrement d'une note de terrain posée par clic sur la carte
  const handleSaveFieldNote = async (territoryId: string, note: Omit<FieldNote, 'id' | 'createdAt'>) => {
    const saved = await StorageService.saveFieldNote(territoryId, note);
    const updated = territories.map(t => {
      if (t.id === territoryId) {
        return {
          ...t,
          fieldNotes: [...(t.fieldNotes || []), saved]
        };
      }
      return t;
    });
    setTerritories(updated);
    if (selectedTerritory?.id === territoryId) {
      setSelectedTerritory(prev => prev ? { ...prev, fieldNotes: [...(prev.fieldNotes || []), saved] } : null);
    }
  };

  // Suppression d'une note de terrain
  const handleDeleteFieldNote = async (territoryId: string, noteId: string) => {
    await StorageService.deleteFieldNote(territoryId, noteId);
    const updated = territories.map(t => {
      if (t.id === territoryId) {
        return {
          ...t,
          fieldNotes: (t.fieldNotes || []).filter(n => n.id !== noteId)
        };
      }
      return t;
    });
    setTerritories(updated);
    if (selectedTerritory?.id === territoryId) {
      setSelectedTerritory(prev => prev ? { ...prev, fieldNotes: (prev.fieldNotes || []).filter(n => n.id !== noteId) } : null);
    }
  };

  // Enregistrement des tracés manuscrits et croix sur la carte
  const handleSaveFreehandDrawing = async (territoryId: string, drawing: FreehandDrawing) => {
    await StorageService.saveFreehandDrawing(territoryId, drawing);
    const updated = territories.map(t => {
      if (t.id === territoryId) {
        return {
          ...t,
          freehandDrawings: [...(t.freehandDrawings || []), drawing]
        };
      }
      return t;
    });
    setTerritories(updated);
    if (selectedTerritory?.id === territoryId) {
      setSelectedTerritory(prev => prev ? { ...prev, freehandDrawings: [...(prev.freehandDrawings || []), drawing] } : null);
    }
  };

  const handleClearFreehandDrawings = async (territoryId: string) => {
    await StorageService.clearFreehandDrawings(territoryId);
    const updated = territories.map(t => {
      if (t.id === territoryId) {
        return {
          ...t,
          freehandDrawings: []
        };
      }
      return t;
    });
    setTerritories(updated);
    if (selectedTerritory?.id === territoryId) {
      setSelectedTerritory(prev => prev ? { ...prev, freehandDrawings: [] } : null);
    }
  };

  // Création d'une nouvelle adresse directement à un point GPS cliqué sur la carte
  const handleAddNewLocationAtPoint = async (latLng: [number, number]) => {
    const targetTerr = selectedTerritory || territories[0];
    if (!targetTerr) return;
    const newLoc: LocationItem = {
      id: 'loc-' + Date.now(),
      territoryId: targetTerr.id,
      streetName: 'Nouvelle Adresse',
      number: '1',
      latLng: latLng,
      type: 'house',
      status: 'not_visited',
      units: []
    };
    const updated = [...locations, newLoc];
    setLocations(updated);
    await StorageService.saveLocations(updated);
  };

  // Sauvegarde des frontières éditées sur la carte
  const handleSaveBoundary = async (territoryId: string, boundary: [number, number][], center: [number, number]) => {
    const updated = territories.map(t => {
      if (t.id === territoryId) {
        return {
          ...t,
          boundary,
          centerCoordinates: center
        };
      }
      return t;
    });

    setTerritories(updated);
    await StorageService.saveTerritories(updated);
    if (selectedTerritory?.id === territoryId) {
      setSelectedTerritory(prev => prev ? { ...prev, boundary, centerCoordinates: center } : null);
    }
  };

  // Suppression d'une visite
  const handleDeleteVisit = async (visitId: string) => {
    await StorageService.deleteVisit(visitId);
    setVisits(prev => prev.filter(v => v.id !== visitId));
  };

  // Callback du scanner caméra QR code
  const handleScanSuccess = (decodedText: string) => {
    setIsScannerOpen(false);
    // Recherche si c'est un lien direct de territoire ou un ID
    const match = decodedText.match(/territory=([a-zA-Z0-9_-]+)/);
    const terrId = match ? match[1] : decodedText;

    const found = territories.find(t => t.id === terrId || t.shortUrlCode === terrId || t.number === terrId);
    if (found) {
      setSelectedTerritory(found);
      setCurrentView('list');
    } else {
      alert(`QR Code scanné : "${decodedText}". Aucun territoire correspondant trouvé dans votre base locale.`);
    }
  };

  // Ajout d'un nouveau territoire
  const handleAddNewTerritory = async (newTerritoryData: Omit<Territory, 'id' | 'shortUrlCode'>) => {
    const newTerritory: Territory = {
      ...newTerritoryData,
      id: 'terr-' + Date.now(),
      shortUrlCode: 'TH' + Math.random().toString(36).substr(2, 4).toUpperCase()
    };

    const updated = [...territories, newTerritory];
    setTerritories(updated);
    await StorageService.saveTerritories(updated);
  };

  // Sauvegarde des modifications globales de l'Atelier de Découpage (Designer)
  const handleSaveDesignerTerritories = async (updatedTerritories: Territory[], updatedLocations: LocationItem[]) => {
    setTerritories(updatedTerritories);
    setLocations(updatedLocations);
    await StorageService.saveTerritories(updatedTerritories);
    await StorageService.saveLocations(updatedLocations);
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', color: '#38bdf8' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🗺️</div>
          <div style={{ fontWeight: 600 }}>Initialisation de KBV Territory...</div>
        </div>
      </div>
    );
  }

  const activeCampaign = campaigns.find(c => c.id === settings.activeCampaignId);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Barre de navigation principale */}
      <header style={{
        background: 'rgba(16, 21, 34, 0.9)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border-subtle)',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        padding: '0.75rem 1.5rem'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          {/* Logo & Titre KBV Territory */}
          <div 
            onClick={() => {
              setSelectedTerritory(null);
              setCurrentView('list');
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
          >
            <div style={{
              width: 38,
              height: 38,
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 15px rgba(14, 165, 233, 0.4)',
              color: 'white',
              fontWeight: 900,
              fontSize: '0.85rem',
              letterSpacing: '-0.03em'
            }}>
              KBV
            </div>

            <div>
              <div style={{ fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '6px', color: '#f8fafc' }}>
                KBV Territory
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {settings.congregationName ? `${settings.congregationName}` : 'KBV'} {activeCampaign ? `• 🎯 ${activeCampaign.name}` : ''}
              </div>
            </div>
          </div>

          {/* Navigation centrale */}
          <nav style={{ display: 'flex', gap: '0.35rem', background: 'var(--bg-tertiary)', padding: '4px', borderRadius: '10px' }}>
            <button
              onClick={() => {
                setSelectedTerritory(null);
                setCurrentView('list');
              }}
              className={`btn ${currentView === 'list' && !selectedTerritory ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
            >
              <BookOpen size={16} />
              {t.territories} ({territories.length})
            </button>

            <button
              onClick={() => {
                setSelectedTerritory(null);
                setCurrentView('map');
              }}
              className={`btn ${currentView === 'map' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
            >
              <Compass size={16} />
              {t.globalMap}
            </button>

            <button
              onClick={() => {
                setSelectedTerritory(null);
                setCurrentView('history');
              }}
              className={`btn ${currentView === 'history' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
            >
              <Clock size={16} />
              {t.visitHistory} ({visits.length})
            </button>

            <button
              onClick={() => {
                setSelectedTerritory(null);
                setCurrentView('account');
              }}
              className={`btn ${currentView === 'account' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ 
                padding: '0.45rem 0.85rem', 
                fontSize: '0.85rem',
                border: currentView === 'account' ? undefined : '1px solid rgba(2, 132, 199, 0.4)',
                background: currentView === 'account' ? '#0284c7' : 'rgba(2, 132, 199, 0.1)',
                color: currentView === 'account' ? '#fff' : '#38bdf8'
              }}
              title="Portail Officiel d'Administration des Territoires (Account/Territories)"
            >
              <FileSpreadsheet size={16} />
              {t.accountManagement}
            </button>
          </nav>

          {/* Actions à droite */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={() => setIsScannerOpen(true)}
              className="btn btn-secondary"
              style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem' }}
              title="Scanner un QR code avec l appareil photo"
            >
              <Camera size={16} /> {t.scanQr}
            </button>

            <button
              onClick={() => setIsCampaignsOpen(true)}
              className={`btn ${activeCampaign ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem' }}
              title="Campagnes"
            >
              <Target size={16} /> {t.campaigns}
            </button>

            <button
              onClick={() => setIsRequestTerritoryOpen(true)}
              className="btn btn-secondary"
              style={{
                padding: '0.45rem 0.75rem',
                fontSize: '0.8rem',
                background: 'rgba(14, 165, 233, 0.12)',
                border: '1px solid rgba(14, 165, 233, 0.35)',
                color: '#38bdf8',
                display: 'flex',
                alignItems: 'center',
                gap: 5
              }}
              title="Demande de territoire auprès du responsable"
            >
              <HelpCircle size={16} /> {t.requestTerritory}
            </button>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="btn btn-secondary"
              style={{ padding: '0.5rem' }}
              title={t.settings}
            >
              <Settings size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Vue principale dynamique */}
      <main style={{ flex: 1 }}>
        {selectedTerritory ? (
          <TerritoryDetail
            territory={selectedTerritory}
            locations={locations}
            onBack={() => setSelectedTerritory(null)}
            onUpdateLocationStatus={handleUpdateLocationStatus}
            onUpdateUnitStatus={handleUpdateUnitStatus}
            onUpdateNotes={handleUpdateNotes}
            onShare={(t) => setShareTerritory(t)}
            onOpenAnnotate={(t) => setAnnotatingTerritory(t)}
            onReturnTerritory={(t) => setReturningTerritory(t)}
            onAssignTerritory={(t) => setAssigningTerritory(t)}
            onPrint={(t) => setPrintingTerritory(t)}
            onSaveFieldNote={handleSaveFieldNote}
            onDeleteFieldNote={handleDeleteFieldNote}
            onAddNewLocationAtPoint={handleAddNewLocationAtPoint}
            onSaveFreehandDrawing={handleSaveFreehandDrawing}
            onClearFreehandDrawings={handleClearFreehandDrawings}
          />
        ) : currentView === 'map' ? (
          <div style={{ height: 'calc(100vh - 65px)', width: '100%' }}>
            <TerritoryMap
              territories={territories}
              selectedTerritory={null}
              locations={locations}
              onSelectTerritory={(t) => setSelectedTerritory(t)}
              onSaveFieldNote={handleSaveFieldNote}
              onDeleteFieldNote={handleDeleteFieldNote}
              onAddNewLocationAtPoint={handleAddNewLocationAtPoint}
              onSaveFreehandDrawing={handleSaveFreehandDrawing}
              onClearFreehandDrawings={handleClearFreehandDrawings}
              onStartDrawing={() => {
                const target = selectedTerritory || territories[0];
                if (target) setAnnotatingTerritory(target);
              }}
            />
          </div>
        ) : currentView === 'history' ? (
          <VisitsHistory
            visits={visits}
            territories={territories}
            onDeleteVisit={handleDeleteVisit}
            onSelectTerritory={(t) => setSelectedTerritory(t)}
          />
        ) : currentView === 'account' ? (
          <AccountTerritoriesView
            territories={territories}
            locations={locations}
            publishers={publishers}
            serviceGroups={serviceGroups}
            settings={settings}
            onOpenTerritory={(t) => {
              setSelectedTerritory(t);
              setCurrentView('list');
            }}
            onAssignTerritory={(t) => setAssigningTerritory(t)}
            onReturnTerritory={(t) => setReturningTerritory(t)}
            onEditBoundary={(t) => setEditingBoundaryTerritory(t)}
            onPrintTerritory={(t) => setPrintingTerritory(t)}
            onRefreshData={loadAllData}
            onSwitchToPublisherView={() => {
              setSelectedTerritory(null);
              setCurrentView('list');
            }}
            onOpenDesigner={() => setIsDesignerOpen(true)}
          />
        ) : (
          <TerritoryList
            territories={territories}
            locations={locations}
            onSelectTerritory={(t) => setSelectedTerritory(t)}
            onOpenMap={() => setCurrentView('map')}
            onAddNewTerritory={handleAddNewTerritory}
            onShareTerritory={(t) => setShareTerritory(t)}
            onOpenScanner={() => setIsScannerOpen(true)}
            onAssignTerritory={(t) => setAssigningTerritory(t)}
            onReturnTerritory={(t) => setReturningTerritory(t)}
            onPrintTerritory={(t) => setPrintingTerritory(t)}
            onRequestTerritory={() => setIsRequestTerritoryOpen(true)}
          />
        )}
      </main>

      {/* Modals & Outils */}
      {shareTerritory && (
        <ShareModal
          territory={shareTerritory}
          locations={locations}
          onClose={() => setShareTerritory(null)}
        />
      )}

      {isScannerOpen && (
        <QrScannerModal
          onScanSuccess={handleScanSuccess}
          onClose={() => setIsScannerOpen(false)}
        />
      )}

      {editingBoundaryTerritory && (
        <PolygonEditorModal
          territory={editingBoundaryTerritory}
          onSaveBoundary={handleSaveBoundary}
          onClose={() => setEditingBoundaryTerritory(null)}
        />
      )}

      {annotatingTerritory && (
        <AnnotationCanvasModal
          territory={annotatingTerritory}
          onSaveAnnotation={handleSaveAnnotation}
          onClose={() => setAnnotatingTerritory(null)}
        />
      )}

      {assigningTerritory && (
        <AssignReturnModal
          territory={assigningTerritory}
          mode="assign"
          publishers={publishers}
          serviceGroups={serviceGroups}
          locations={locations}
          onAssign={handleAssignTerritory}
          onReturn={handleReturnTerritory}
          onClose={() => setAssigningTerritory(null)}
        />
      )}

      {returningTerritory && (
        <AssignReturnModal
          territory={returningTerritory}
          mode="return"
          publishers={publishers}
          serviceGroups={serviceGroups}
          locations={locations}
          onAssign={handleAssignTerritory}
          onReturn={handleReturnTerritory}
          onClose={() => setReturningTerritory(null)}
        />
      )}

      {printingTerritory && (
        <PrintTerritoryModal
          territory={printingTerritory}
          locations={locations}
          settings={settings}
          onClose={() => setPrintingTerritory(null)}
        />
      )}

      {isCampaignsOpen && (
        <CampaignsModal
          campaigns={campaigns}
          activeCampaignId={settings.activeCampaignId}
          onSetActiveCampaign={async (campId) => {
            const updated = { ...settings, activeCampaignId: campId };
            setSettings(updated);
            await StorageService.saveSettings(updated);
          }}
          onAddCampaign={async (newCamp) => {
            const campWithId: Campaign = { ...newCamp, id: 'camp-' + Date.now() };
            const updated = [...campaigns, campWithId];
            setCampaigns(updated);
            await StorageService.saveCampaigns(updated);
          }}
          onClose={() => setIsCampaignsOpen(false)}
        />
      )}

      {isSettingsOpen && (
        <SettingsModal
          settings={settings}
          onUpdateSettings={async (newSettings) => {
            setSettings(newSettings);
            if (newSettings.language) {
              setLanguage(newSettings.language as LanguageCode);
            }
            await StorageService.saveSettings(newSettings);
          }}
          onDataImported={loadAllData}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      {isRequestTerritoryOpen && (
        <RequestTerritoryModal
          settings={settings}
          onClose={() => setIsRequestTerritoryOpen(false)}
          onRequestSubmitted={() => {
            // Rechargement éventuel
          }}
        />
      )}

      {isDesignerOpen && (
        <TerritoryDesignerModal
          territories={territories}
          locations={locations}
          onSaveTerritories={handleSaveDesignerTerritories}
          onClose={() => setIsDesignerOpen(false)}
        />
      )}
    </div>
  );
};

export default App;
