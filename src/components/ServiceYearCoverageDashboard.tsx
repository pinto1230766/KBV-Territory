import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  Download, 
  X, 
  Layers 
} from 'lucide-react';
import type { Territory, Publisher, ServiceGroup } from '../types';

interface ServiceYearCoverageDashboardProps {
  territories: Territory[];
  publishers: Publisher[];
  serviceGroups: ServiceGroup[];
  congregationName: string;
  onOpenTerritory: (terr: Territory) => void;
  onAssignTerritory: (terr: Territory) => void;
  onClose: () => void;
}

export const ServiceYearCoverageDashboard: React.FC<ServiceYearCoverageDashboardProps> = ({
  territories,
  congregationName,
  onOpenTerritory,
  onAssignTerritory,
  onClose
}) => {
  // Calcul de l'année de service actuelle (1er septembre -> 31 août)
  const today = new Date();
  const currentYear = today.getFullYear();
  const isPastSeptember = today.getMonth() >= 8; // 8 = septembre (0-indexed)
  
  const defaultStartYear = isPastSeptember ? currentYear : currentYear - 1;
  const [selectedServiceYear, setSelectedServiceYear] = useState<number>(defaultStartYear);
  const [filterType, setFilterType] = useState<'all' | 'covered' | 'uncovered' | 'multiple'>('all');

  const serviceYearStart = new Date(selectedServiceYear, 8, 1); // 1er sept
  const serviceYearEnd = new Date(selectedServiceYear + 1, 7, 31, 23, 59, 59); // 31 août

  // Calcul du nombre de fois qu'un territoire a été parcouru durant l'année de service
  const territoryStats = useMemo(() => {
    return territories.map(terr => {
      let timesCompleted = 0;
      const completionDates: string[] = [];

      // Vérifie la date de dernier achèvement direct
      if (terr.dateLastCompleted) {
        const d = new Date(terr.dateLastCompleted);
        if (d >= serviceYearStart && d <= serviceYearEnd) {
          timesCompleted++;
          completionDates.push(terr.dateLastCompleted);
        }
      }

      // Vérifie dans l'historique des attributions
      if (terr.assignmentHistory) {
        terr.assignmentHistory.forEach(h => {
          if (h.status === 'completed' && h.dateReturned) {
            const d = new Date(h.dateReturned);
            if (d >= serviceYearStart && d <= serviceYearEnd && !completionDates.includes(h.dateReturned)) {
              timesCompleted++;
              completionDates.push(h.dateReturned);
            }
          }
        });
      }

      return {
        territory: terr,
        timesCompleted,
        completionDates,
        isCurrentlyAssigned: terr.status === 'assigned' || terr.status === 'in_progress'
      };
    });
  }, [territories, selectedServiceYear, serviceYearStart, serviceYearEnd]);

  // Statistiques globales
  const totalTerritories = territories.length;
  const coveredTerritories = territoryStats.filter(s => s.timesCompleted >= 1).length;
  const uncoveredTerritories = totalTerritories - coveredTerritories;
  const multipleCoveredTerritories = territoryStats.filter(s => s.timesCompleted >= 2).length;
  const coveragePercent = totalTerritories > 0 ? Math.round((coveredTerritories / totalTerritories) * 100) : 0;

  // Répartition mensuelle (12 mois : Septembre à Août)
  const monthlyData = useMemo(() => {
    const months = [
      { key: '09', name: 'Sept', monthIdx: 8, year: selectedServiceYear },
      { key: '10', name: 'Oct', monthIdx: 9, year: selectedServiceYear },
      { key: '11', name: 'Nov', monthIdx: 10, year: selectedServiceYear },
      { key: '12', name: 'Déc', monthIdx: 11, year: selectedServiceYear },
      { key: '01', name: 'Janv', monthIdx: 0, year: selectedServiceYear + 1 },
      { key: '02', name: 'Févr', monthIdx: 1, year: selectedServiceYear + 1 },
      { key: '03', name: 'Mars', monthIdx: 2, year: selectedServiceYear + 1 },
      { key: '04', name: 'Avr', monthIdx: 3, year: selectedServiceYear + 1 },
      { key: '05', name: 'Mai', monthIdx: 4, year: selectedServiceYear + 1 },
      { key: '06', name: 'Juin', monthIdx: 5, year: selectedServiceYear + 1 },
      { key: '07', name: 'Juil', monthIdx: 6, year: selectedServiceYear + 1 },
      { key: '08', name: 'Août', monthIdx: 7, year: selectedServiceYear + 1 }
    ];

    return months.map(m => {
      let count = 0;
      territoryStats.forEach(ts => {
        ts.completionDates.forEach(dateStr => {
          const d = new Date(dateStr);
          if (d.getFullYear() === m.year && d.getMonth() === m.monthIdx) {
            count++;
          }
        });
      });
      return { ...m, count };
    });
  }, [territoryStats, selectedServiceYear]);

  const maxMonthCount = Math.max(...monthlyData.map(m => m.count), 1);

  // Filtrage du tableau de bord
  const filteredList = territoryStats.filter(item => {
    if (filterType === 'covered') return item.timesCompleted >= 1;
    if (filterType === 'uncovered') return item.timesCompleted === 0;
    if (filterType === 'multiple') return item.timesCompleted >= 2;
    return true;
  });

  // Export CSV S-13
  const handleExportS13CSV = () => {
    const headers = ['Numéro', 'Nom du Territoire', 'Type', 'Statut Actuel', 'Assigné à', 'Fois parcouru cette année', 'Dates achèvement'];
    const rows = territoryStats.map(s => [
      `"${s.territory.number}"`,
      `"${s.territory.label.replace(/"/g, '""')}"`,
      `"${s.territory.type}"`,
      `"${s.territory.status}"`,
      `"${s.territory.assignee || ''}"`,
      `"${s.timesCompleted}"`,
      `"${s.completionDates.join(', ')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `KBV_Registre_S13_AnneeService_${selectedServiceYear}_${selectedServiceYear + 1}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(5, 10, 20, 0.88)',
      backdropFilter: 'blur(10px)',
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
          maxWidth: '1200px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8)',
          border: '1px solid rgba(56, 189, 248, 0.3)'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.75rem',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          background: 'rgba(15, 23, 42, 0.6)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #0284c7 0%, #6366f1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: '0 4px 15px rgba(2, 132, 199, 0.4)'
            }}>
              <BarChart3 size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', fontWeight: 700 }}>
                  REGISTRE S-13 OFFICIEL
                </span>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Congrégation de {congregationName}
                </span>
              </div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0.15rem 0 0 0', color: '#fff' }}>
                Couverture de l'Année de Service {selectedServiceYear} – {selectedServiceYear + 1}
              </h2>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            {/* Sélecteur d'année de service */}
            <select
              value={selectedServiceYear}
              onChange={(e) => setSelectedServiceYear(parseInt(e.target.value, 10))}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-tertiary)',
                color: 'white',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {[defaultStartYear + 1, defaultStartYear, defaultStartYear - 1, defaultStartYear - 2].map(yr => (
                <option key={yr} value={yr}>
                  Année {yr} – {yr + 1} (1er Sept. – 31 Août)
                </option>
              ))}
            </select>

            <button
              onClick={handleExportS13CSV}
              className="btn btn-secondary"
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 5 }}
              title="Exporter le registre S-13 au format CSV"
            >
              <Download size={15} />
              <span>Export S-13</span>
            </button>

            <button 
              onClick={onClose}
              className="btn-icon" 
              style={{ color: 'var(--text-muted)', padding: '0.4rem' }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Corps défilable */}
        <div style={{ padding: '1.5rem 1.75rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Cartes KPIs de couverture */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
            
            {/* Taux global de couverture */}
            <div className="glass-panel" style={{ padding: '1.1rem', borderLeft: '4px solid #10b981' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 700 }}>
                <span>COUVERTURE ANNUELLE</span>
                <TrendingUp size={16} color="#10b981" />
              </div>
              <div style={{ fontSize: '2.1rem', fontWeight: 900, color: '#34d399', marginTop: '0.25rem' }}>
                {coveragePercent}%
              </div>
              <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, marginTop: '0.5rem', overflow: 'hidden' }}>
                <div style={{ width: `${coveragePercent}%`, height: '100%', background: '#10b981', borderRadius: 3, transition: 'width 0.5s ease' }} />
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                {coveredTerritories} sur {totalTerritories} territoires parcourus
              </div>
            </div>

            {/* Parcourus 1 fois ou plus */}
            <div 
              className="glass-panel" 
              onClick={() => setFilterType(filterType === 'covered' ? 'all' : 'covered')}
              style={{ 
                padding: '1.1rem', 
                borderLeft: '4px solid #0284c7', 
                cursor: 'pointer',
                background: filterType === 'covered' ? 'rgba(2, 132, 199, 0.15)' : undefined 
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 700 }}>
                <span>PARCOURUS AU MOINS 1 FOIS</span>
                <CheckCircle2 size={16} color="#0284c7" />
              </div>
              <div style={{ fontSize: '2.1rem', fontWeight: 900, color: '#38bdf8', marginTop: '0.25rem' }}>
                {coveredTerritories}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                {multipleCoveredTerritories} parcourus 2 fois ou plus
              </div>
            </div>

            {/* Territoires non encore parcourus (Priorité !) */}
            <div 
              className="glass-panel" 
              onClick={() => setFilterType(filterType === 'uncovered' ? 'all' : 'uncovered')}
              style={{ 
                padding: '1.1rem', 
                borderLeft: '4px solid #ef4444', 
                cursor: 'pointer',
                background: filterType === 'uncovered' ? 'rgba(239, 68, 68, 0.15)' : undefined 
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 700 }}>
                <span>NON PARCOURUS CETTE ANNÉE</span>
                <AlertCircle size={16} color="#ef4444" />
              </div>
              <div style={{ fontSize: '2.1rem', fontWeight: 900, color: uncoveredTerritories > 0 ? '#f87171' : '#34d399', marginTop: '0.25rem' }}>
                {uncoveredTerritories}
              </div>
              <div style={{ fontSize: '0.75rem', color: uncoveredTerritories > 0 ? '#fca5a5' : 'var(--text-muted)', marginTop: '0.5rem' }}>
                {uncoveredTerritories > 0 ? 'À distribuer en priorité pour boucler le secteur' : 'Tous les territoires ont été parcourus !'}
              </div>
            </div>

            {/* Total territoires congrégation */}
            <div 
              className="glass-panel" 
              onClick={() => setFilterType('all')}
              style={{ 
                padding: '1.1rem', 
                borderLeft: '4px solid #a855f7',
                cursor: 'pointer',
                background: filterType === 'all' ? 'rgba(168, 85, 247, 0.15)' : undefined 
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 700 }}>
                <span>TOTAL TERRITOIRES</span>
                <Layers size={16} color="#a855f7" />
              </div>
              <div style={{ fontSize: '2.1rem', fontWeight: 900, color: '#c084fc', marginTop: '0.25rem' }}>
                {totalTerritories}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                Congrégation de {congregationName}
              </div>
            </div>

          </div>

          {/* Graphique de Couverture Mensuelle (Septembre -> Août) */}
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Calendar size={17} color="#38bdf8" /> Rythme Mensuel de Couverture (Territoires achevés par mois)
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
                  Évolution du 1er Septembre {selectedServiceYear} au 31 Août {selectedServiceYear + 1}
                </p>
              </div>

              <div style={{ fontSize: '0.78rem', color: '#38bdf8', fontWeight: 600 }}>
                Total : {monthlyData.reduce((acc, m) => acc + m.count, 0)} parcours terminés
              </div>
            </div>

            {/* Graphique en barres CSS moderne */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(12, 1fr)',
              gap: '0.5rem',
              height: '180px',
              alignItems: 'flex-end',
              paddingBottom: '0.5rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              {monthlyData.map(m => {
                const heightPercent = maxMonthCount > 0 ? Math.round((m.count / maxMonthCount) * 100) : 0;
                const isCurrentMonth = today.getFullYear() === m.year && today.getMonth() === m.monthIdx;

                return (
                  <div key={m.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: m.count > 0 ? '#38bdf8' : 'var(--text-muted)', marginBottom: '4px' }}>
                      {m.count > 0 ? m.count : ''}
                    </div>
                    <div
                      title={`${m.name} : ${m.count} territoire(s) achevé(s)`}
                      style={{
                        width: '80%',
                        maxWidth: '36px',
                        height: `${Math.max(heightPercent, 4)}%`,
                        background: m.count > 0 
                          ? (isCurrentMonth 
                              ? 'linear-gradient(180deg, #38bdf8 0%, #0284c7 100%)' 
                              : 'linear-gradient(180deg, #6366f1 0%, #4338ca 100%)')
                          : 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '6px 6px 2px 2px',
                        boxShadow: m.count > 0 ? '0 4px 12px rgba(99, 102, 241, 0.3)' : 'none',
                        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                      }}
                    />
                    <div style={{
                      fontSize: '0.72rem',
                      fontWeight: isCurrentMonth ? 800 : 600,
                      color: isCurrentMonth ? '#38bdf8' : 'var(--text-secondary)',
                      marginTop: '6px'
                    }}>
                      {m.name}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Registre détaillé S-13 avec filtres rapides */}
          <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: '#fff' }}>
                  Registre des Territoires ({filteredList.length})
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0' }}>
                  État de parcours pour l'année de service active
                </p>
              </div>

              {/* Filtres rapides */}
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setFilterType('all')}
                  style={{
                    padding: '4px 10px',
                    fontSize: '0.75rem',
                    borderRadius: '6px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: filterType === 'all' ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)',
                    background: filterType === 'all' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.03)',
                    color: filterType === 'all' ? '#38bdf8' : 'var(--text-secondary)'
                  }}
                >
                  Tous ({totalTerritories})
                </button>

                <button
                  type="button"
                  onClick={() => setFilterType('uncovered')}
                  style={{
                    padding: '4px 10px',
                    fontSize: '0.75rem',
                    borderRadius: '6px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: filterType === 'uncovered' ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.1)',
                    background: filterType === 'uncovered' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.03)',
                    color: filterType === 'uncovered' ? '#f87171' : 'var(--text-secondary)'
                  }}
                >
                  ⚠️ Non parcourus ({uncoveredTerritories})
                </button>

                <button
                  type="button"
                  onClick={() => setFilterType('covered')}
                  style={{
                    padding: '4px 10px',
                    fontSize: '0.75rem',
                    borderRadius: '6px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: filterType === 'covered' ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.1)',
                    background: filterType === 'covered' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.03)',
                    color: filterType === 'covered' ? '#34d399' : 'var(--text-secondary)'
                  }}
                >
                  ✓ Parcourus ({coveredTerritories})
                </button>
              </div>
            </div>

            {/* Tableau du Registre */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.03)', textAlign: 'left', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '0.65rem 0.75rem' }}>N°</th>
                    <th style={{ padding: '0.65rem 0.75rem' }}>Nom du Territoire</th>
                    <th style={{ padding: '0.65rem 0.75rem' }}>Parcours cette année</th>
                    <th style={{ padding: '0.65rem 0.75rem' }}>Dates de retour (S-13)</th>
                    <th style={{ padding: '0.65rem 0.75rem' }}>Statut & Assignation</th>
                    <th style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.map(({ territory: terr, timesCompleted, completionDates, isCurrentlyAssigned }) => (
                    <tr 
                      key={terr.id}
                      style={{ 
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        background: timesCompleted === 0 ? 'rgba(239, 68, 68, 0.04)' : undefined
                      }}
                    >
                      {/* N° */}
                      <td style={{ padding: '0.65rem 0.75rem' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.2rem 0.45rem',
                          borderRadius: '6px',
                          fontWeight: 800,
                          fontSize: '0.85rem',
                          background: 'rgba(2, 132, 199, 0.2)',
                          color: '#38bdf8'
                        }}>
                          {terr.number}
                        </span>
                      </td>

                      {/* Nom */}
                      <td style={{ padding: '0.65rem 0.75rem', fontWeight: 600, color: '#fff' }}>
                        {terr.label}
                      </td>

                      {/* Nombre de fois parcouru */}
                      <td style={{ padding: '0.65rem 0.75rem' }}>
                        {timesCompleted === 0 ? (
                          <span style={{ color: '#f87171', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <AlertCircle size={13} /> 0 fois
                          </span>
                        ) : (
                          <span style={{ color: '#34d399', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <CheckCircle2 size={13} /> {timesCompleted} fois
                          </span>
                        )}
                      </td>

                      {/* Dates d'achèvement */}
                      <td style={{ padding: '0.65rem 0.75rem', color: 'var(--text-secondary)' }}>
                        {completionDates.length > 0 ? (
                          completionDates.map(d => new Date(d).toLocaleDateString('fr-FR')).join(', ')
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>Non parcouru depuis le 01/09</span>
                        )}
                      </td>

                      {/* Statut & assignation actuelle */}
                      <td style={{ padding: '0.65rem 0.75rem' }}>
                        {isCurrentlyAssigned ? (
                          <span style={{ color: '#38bdf8', fontWeight: 600 }}>
                            👤 {terr.assignee}
                          </span>
                        ) : (
                          <span style={{ color: '#10b981', fontWeight: 600 }}>
                            Disponible
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                          <button
                            onClick={() => {
                              onOpenTerritory(terr);
                              onClose();
                            }}
                            className="btn btn-ghost"
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                          >
                            Voir fiche
                          </button>

                          {!isCurrentlyAssigned && (
                            <button
                              onClick={() => {
                                onAssignTerritory(terr);
                                onClose();
                              }}
                              className="btn btn-primary"
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                            >
                              Assigner
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
