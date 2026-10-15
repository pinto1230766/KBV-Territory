export type LanguageCode = 'fr' | 'pt' | 'kea' | 'en' | 'es';

export interface Translations {
  appName: string;
  territories: string;
  globalMap: string;
  visitHistory: string;
  accountManagement: string;
  campaigns: string;
  settings: string;
  scanQr: string;
  requestTerritory: string;
  designer: string;
  searchPlaceholder: string;
  filterAll: string;
  filterAvailable: string;
  filterAssigned: string;
  filterOverdue: string;
  backToTerritories: string;
  annotate: string;
  viewAnnotation: string;
  directions: string;
  print: string;
  share: string;
  qrCode: string;
  assign: string;
  returnTerritory: string;
  fieldNotes: string;
  addNote: string;
  clearDrawings: string;
  drawCross: string;
  drawPen: string;
  erase: string;
  statusAvailable: string;
  statusAssigned: string;
  statusInProgress: string;
  statusOverdue: string;
  statusArchived: string;
  visitNotVisited: string;
  visitNotAtHome: string;
  visitVisited: string;
  visitReturnVisit: string;
  visitDoNotCall: string;
  save: string;
  saved: string;
  close: string;
  cancel: string;
  delete: string;
  confirm: string;
  congregationName: string;
  appLanguage: string;
  displayTheme: string;
  themeDark: string;
  themeLight: string;
  themeSystem: string;
  mapPreview: string;
  mapPreviewDesc: string;
  defaultDueDuration: string;
  months1: string;
  months2: string;
  months3: string;
  months4: string;
  months6: string;
  tabGeneral: string;
  tabPublisher: string;
  tabPrivacy: string;
  tabBackups: string;
  tabAbout: string;
  backupBtn: string;
  restoreBtn: string;
  clearCache: string;
  cacheCleared: string;
  reportBug: string;
  bugReported: string;
  resetDefaults: string;
  logout: string;
  publisherNameLabel: string;
  publisherEmailLabel: string;
  gdprTitle: string;
  gdprDesc: string;
  addresses: string;
  stats: string;
  completion: string;
  doorsWorked: string;
  lastWorked: string;
  neverWorked: string;
  dueDate: string;
  assignee: string;
  serviceGroup: string;
  allGroups: string;
  noTerritoriesFound: string;
  newAddress: string;
  number: string;
  street: string;
  notes: string;
  saveChanges: string;
  activeCampaignBadge: string;
  assignedTo: string;
  dueOn: string;
  notAssigned: string;
}

export const translations: Record<LanguageCode, Translations> = {
  fr: {
    appName: 'KBV Territory',
    territories: 'Territoires',
    globalMap: 'Carte Globale',
    visitHistory: 'Historique des Visites',
    accountManagement: 'Gestion & Attributions',
    campaigns: 'Campagnes',
    settings: 'Réglages',
    scanQr: 'Scanner QR Code',
    requestTerritory: 'Demander un territoire',
    designer: 'Atelier Découpage',
    searchPlaceholder: 'Rechercher un territoire ou une rue...',
    filterAll: 'Tous',
    filterAvailable: 'Disponibles',
    filterAssigned: 'Attribués',
    filterOverdue: 'En retard',
    backToTerritories: 'Retour aux territoires',
    annotate: 'Annoter',
    viewAnnotation: 'Voir Annotation ✏️',
    directions: 'Itinéraire',
    print: 'Imprimer',
    share: 'Partager (.thshare)',
    qrCode: 'QR Code',
    assign: 'Attribuer',
    returnTerritory: 'Restituer',
    fieldNotes: 'Notes de terrain',
    addNote: 'Ajouter une note',
    clearDrawings: 'Effacer les tracés',
    drawCross: 'Croix',
    drawPen: 'Crayon',
    erase: 'Gomme',
    statusAvailable: 'Disponible',
    statusAssigned: 'Attribué',
    statusInProgress: 'En cours',
    statusOverdue: 'En retard',
    statusArchived: 'Archivé',
    visitNotVisited: 'Non visité',
    visitNotAtHome: 'Absent',
    visitVisited: 'Visité / Parlé',
    visitReturnVisit: 'Nouvelle visite',
    visitDoNotCall: 'Ne pas appeler (DNC)',
    save: 'Enregistrer',
    saved: 'Enregistré !',
    close: 'Fermer',
    cancel: 'Annuler',
    delete: 'Supprimer',
    confirm: 'Confirmer',
    congregationName: 'Nom de la Congrégation / Assemblée',
    appLanguage: "Langue de l'application",
    displayTheme: "Thème d'affichage",
    themeDark: '🌙 Sombre',
    themeLight: '☀️ Clair',
    themeSystem: '💻 Système',
    mapPreview: 'Poursuite / Aperçu de la carte',
    mapPreviewDesc: 'Afficher la carte interactive miniature sur les fiches de territoires',
    defaultDueDuration: "Durée d'attribution par défaut",
    months1: '1 mois (Campagne spéciale)',
    months2: '2 mois',
    months3: '3 mois',
    months4: '4 mois (Standard recommandé)',
    months6: '6 mois',
    tabGeneral: 'Général',
    tabPublisher: 'Proclamateur',
    tabPrivacy: 'RGPD & CNIL',
    tabBackups: 'Sauvegardes',
    tabAbout: 'À propos',
    backupBtn: 'Sauvegarder (.thbackup)',
    restoreBtn: 'Restaurer sauvegarde',
    clearCache: 'Vider le cache',
    cacheCleared: 'Cache vidé !',
    reportBug: 'Rapporter un bug',
    bugReported: 'Rapport généré !',
    resetDefaults: 'Réinitialiser aux données par défaut',
    logout: 'Se déconnecter de ce profil',
    publisherNameLabel: 'Nom complet du Proclamateur',
    publisherEmailLabel: 'Adresse e-mail',
    gdprTitle: 'Mode Conformité RGPD Strict (France / UE)',
    gdprDesc: 'Règlement UE 2016/679 & Décisions CNIL. Notes matérielles seules autorisées.',
    addresses: 'Adresses',
    stats: 'Statistiques',
    completion: 'Avancement',
    doorsWorked: 'portes traitées',
    lastWorked: 'Dernière visite',
    neverWorked: 'Jamais parcouru',
    dueDate: 'Échéance',
    assignee: 'Attribué à',
    serviceGroup: 'Groupe de service',
    allGroups: 'Tous les groupes',
    noTerritoriesFound: 'Aucun territoire trouvé.',
    newAddress: 'Nouvelle adresse',
    number: 'Numéro',
    street: 'Rue',
    notes: 'Remarques & notes',
    saveChanges: 'Enregistrer les modifications',
    activeCampaignBadge: 'Campagne active',
    assignedTo: 'Attribué à',
    dueOn: 'Pour le',
    notAssigned: 'Non attribué'
  },
  pt: {
    appName: 'KBV Territory',
    territories: 'Territórios',
    globalMap: 'Mapa Geral',
    visitHistory: 'Histórico de Visitas',
    accountManagement: 'Gestão & Designações',
    campaigns: 'Campanhas',
    settings: 'Configurações',
    scanQr: 'Escanear QR Code',
    requestTerritory: 'Pedir um território',
    designer: 'Oficina de Divisão',
    searchPlaceholder: 'Pesquisar território ou rua...',
    filterAll: 'Todos',
    filterAvailable: 'Disponíveis',
    filterAssigned: 'Designados',
    filterOverdue: 'Atrasados',
    backToTerritories: 'Voltar aos territórios',
    annotate: 'Anotar',
    viewAnnotation: 'Ver Anotação ✏️',
    directions: 'Itinerário',
    print: 'Imprimir',
    share: 'Partilhar (.thshare)',
    qrCode: 'QR Code',
    assign: 'Designar',
    returnTerritory: 'Devolver',
    fieldNotes: 'Notas de campo',
    addNote: 'Adicionar uma nota',
    clearDrawings: 'Apagar traçados',
    drawCross: 'Cruz',
    drawPen: 'Caneta',
    erase: 'Borracha',
    statusAvailable: 'Disponível',
    statusAssigned: 'Designado',
    statusInProgress: 'Em andamento',
    statusOverdue: 'Atrasado',
    statusArchived: 'Arquivado',
    visitNotVisited: 'Não visitado',
    visitNotAtHome: 'Não em casa',
    visitVisited: 'Visitado / Falou',
    visitReturnVisit: 'Revisita',
    visitDoNotCall: 'Não telefonar/visitar (DNC)',
    save: 'Guardar',
    saved: 'Guardado!',
    close: 'Fechar',
    cancel: 'Cancelar',
    delete: 'Eliminar',
    confirm: 'Confirmar',
    congregationName: 'Nome da Congregação / Assembleia',
    appLanguage: 'Idioma do aplicativo',
    displayTheme: 'Tema de exibição',
    themeDark: '🌙 Escuro',
    themeLight: '☀️ Claro',
    themeSystem: '💻 Sistema',
    mapPreview: 'Pré-visualização do mapa',
    mapPreviewDesc: 'Exibir mini mapa interativo nos cartões de território',
    defaultDueDuration: 'Prazo padrão de designação',
    months1: '1 mês (Campanha especial)',
    months2: '2 meses',
    months3: '3 meses',
    months4: '4 meses (Padrão recomendado)',
    months6: '6 meses',
    tabGeneral: 'Geral',
    tabPublisher: 'Publicador',
    tabPrivacy: 'Privacidade & RGPD',
    tabBackups: 'Cópias de segurança',
    tabAbout: 'Sobre',
    backupBtn: 'Criar cópia (.thbackup)',
    restoreBtn: 'Restaurar cópia',
    clearCache: 'Limpar cache',
    cacheCleared: 'Cache limpo!',
    reportBug: 'Reportar um erro',
    bugReported: 'Relatório gerado!',
    resetDefaults: 'Repor dados padrão de exemplo',
    logout: 'Terminar sessão deste perfil',
    publisherNameLabel: 'Nome completo do Publicador',
    publisherEmailLabel: 'Endereço de e-mail',
    gdprTitle: 'Modo de Conformidade RGPD Estrito (UE)',
    gdprDesc: 'Regulamento UE 2016/679. Apenas anotações físicas de acesso são autorizadas.',
    addresses: 'Endereços',
    stats: 'Estatísticas',
    completion: 'Progresso',
    doorsWorked: 'portas trabalhadas',
    lastWorked: 'Última visita',
    neverWorked: 'Nunca percorrido',
    dueDate: 'Data limite',
    assignee: 'Designado a',
    serviceGroup: 'Grupo de serviço',
    allGroups: 'Todos os grupos',
    noTerritoriesFound: 'Nenhum território encontrado.',
    newAddress: 'Novo endereço',
    number: 'Número',
    street: 'Rua',
    notes: 'Observações & notas',
    saveChanges: 'Guardar alterações',
    activeCampaignBadge: 'Campanha ativa',
    assignedTo: 'Designado para',
    dueOn: 'Até',
    notAssigned: 'Não designado'
  },
  kea: {
    appName: 'KBV Territory',
    territories: 'Teritórius',
    globalMap: 'Mapa Jeral',
    visitHistory: 'Istóriku di Vizitas',
    accountManagement: 'Jeston & Atribuisons',
    campaigns: 'Kanpanhas',
    settings: 'Konfigurason',
    scanQr: 'Skaner QR Code',
    requestTerritory: 'Pidi un teritóriu',
    designer: 'Ofisina di Divizon',
    searchPlaceholder: 'Djobi un teritóriu ô rua...',
    filterAll: 'Tudu',
    filterAvailable: 'Disponível',
    filterAssigned: 'Atribuidu',
    filterOverdue: 'Atrasadu',
    backToTerritories: 'Volta pa teritórius',
    annotate: 'Anota',
    viewAnnotation: 'Odja Anotason ✏️',
    directions: 'Itineráriu',
    print: 'Inprimi',
    share: 'Partilha (.thshare)',
    qrCode: 'Kódigu QR',
    assign: 'Atribui',
    returnTerritory: 'Devolve',
    fieldNotes: 'Notash di kanpu',
    addNote: 'Poi un nota',
    clearDrawings: 'Bora risku',
    drawCross: 'Krus',
    drawPen: 'Káneta',
    erase: 'Boratxa',
    statusAvailable: 'Disponível',
    statusAssigned: 'Atribuidu',
    statusInProgress: 'Na andamentu',
    statusOverdue: 'Atrasadu',
    statusArchived: 'Arkivadu',
    visitNotVisited: 'Ka vizitadu',
    visitNotAtHome: 'Ka staba na kaza',
    visitVisited: 'Vizitadu / Papia',
    visitReturnVisit: 'Revizita',
    visitDoNotCall: 'Ka txoma (DNC)',
    save: 'Grava',
    saved: 'Gravadu!',
    close: 'Fetxa',
    cancel: 'Kansela',
    delete: 'Bora',
    confirm: 'Konfirma',
    congregationName: 'Nomi di Kongregason / Asenbleia',
    appLanguage: 'Lingua di aplikativu',
    displayTheme: 'Tema di visualizason',
    themeDark: '🌙 Sukuru',
    themeLight: '☀️ Klaru',
    themeSystem: '💻 Sistema',
    mapPreview: 'Odja mapa primeru',
    mapPreviewDesc: 'Mostra mapa pikinoti na kada teritóriu',
    defaultDueDuration: 'Ténpu padron di atribuison',
    months1: '1 mes (Kanpanha spesial)',
    months2: '2 mes',
    months3: '3 mes',
    months4: '4 mes (Padron rikomendadu)',
    months6: '6 mes',
    tabGeneral: 'Jeral',
    tabPublisher: 'Publikador',
    tabPrivacy: 'Privasidadi & RGPD',
    tabBackups: 'Kópias di seguransa',
    tabAbout: 'Sobri',
    backupBtn: 'Grava kópia (.thbackup)',
    restoreBtn: 'Restaura kópia',
    clearCache: 'Linpa cache',
    cacheCleared: 'Cache linpu!',
    reportBug: 'Aviza un erro',
    bugReported: 'Rilatóriu fetu!',
    resetDefaults: 'Restaura dadus padron',
    logout: 'Sai di seson',
    publisherNameLabel: 'Nomi konpletu di Publikador',
    publisherEmailLabel: 'Imeil',
    gdprTitle: 'Módu di Konformidadi RGPD Stritu',
    gdprDesc: 'Regulamentu UE 2016/679. Sô notas físiku di porta sta permitidu.',
    addresses: 'Enderésus',
    stats: 'Estatístikas',
    completion: 'Progresu',
    doorsWorked: 'pórtas trabadjadu',
    lastWorked: 'Últimu vizita',
    neverWorked: 'Nuka trabadjadu',
    dueDate: 'Data límiti',
    assignee: 'Atribuidu pa',
    serviceGroup: 'Grupu di sirvisu',
    allGroups: 'Tudu grupus',
    noTerritoriesFound: 'Nenhum teritóriu atxadu.',
    newAddress: 'Novu enderésu',
    number: 'Númeru',
    street: 'Rua',
    notes: 'Notas & observasons',
    saveChanges: 'Grava mudansas',
    activeCampaignBadge: 'Kanpanha ativu',
    assignedTo: 'Atribuidu pa',
    dueOn: 'Ti',
    notAssigned: 'Ka sta atribuidu'
  },
  en: {
    appName: 'KBV Territory',
    territories: 'Territories',
    globalMap: 'Global Map',
    visitHistory: 'Visit History',
    accountManagement: 'Management & Assignments',
    campaigns: 'Campaigns',
    settings: 'Settings',
    scanQr: 'Scan QR Code',
    requestTerritory: 'Request a territory',
    designer: 'Territory Designer',
    searchPlaceholder: 'Search territory or street...',
    filterAll: 'All',
    filterAvailable: 'Available',
    filterAssigned: 'Assigned',
    filterOverdue: 'Overdue',
    backToTerritories: 'Back to territories',
    annotate: 'Annotate',
    viewAnnotation: 'View Annotation ✏️',
    directions: 'Directions',
    print: 'Print',
    share: 'Share (.thshare)',
    qrCode: 'QR Code',
    assign: 'Assign',
    returnTerritory: 'Return',
    fieldNotes: 'Field notes',
    addNote: 'Add a note',
    clearDrawings: 'Clear drawings',
    drawCross: 'Cross',
    drawPen: 'Pen',
    erase: 'Eraser',
    statusAvailable: 'Available',
    statusAssigned: 'Assigned',
    statusInProgress: 'In progress',
    statusOverdue: 'Overdue',
    statusArchived: 'Archived',
    visitNotVisited: 'Not visited',
    visitNotAtHome: 'Not at home',
    visitVisited: 'Visited / Spoke',
    visitReturnVisit: 'Return visit',
    visitDoNotCall: 'Do not call (DNC)',
    save: 'Save',
    saved: 'Saved!',
    close: 'Close',
    cancel: 'Cancel',
    delete: 'Delete',
    confirm: 'Confirm',
    congregationName: 'Congregation / Assembly Name',
    appLanguage: 'Application language',
    displayTheme: 'Display theme',
    themeDark: '🌙 Dark',
    themeLight: '☀️ Light',
    themeSystem: '💻 System',
    mapPreview: 'Map preview',
    mapPreviewDesc: 'Show interactive mini-map on territory cards',
    defaultDueDuration: 'Default assignment period',
    months1: '1 month (Special campaign)',
    months2: '2 months',
    months3: '3 months',
    months4: '4 months (Standard recommended)',
    months6: '6 months',
    tabGeneral: 'General',
    tabPublisher: 'Publisher',
    tabPrivacy: 'GDPR & Privacy',
    tabBackups: 'Backups',
    tabAbout: 'About',
    backupBtn: 'Backup (.thbackup)',
    restoreBtn: 'Restore backup',
    clearCache: 'Clear cache',
    cacheCleared: 'Cache cleared!',
    reportBug: 'Report a bug',
    bugReported: 'Diagnostic report generated!',
    resetDefaults: 'Reset to sample defaults',
    logout: 'Log out from this profile',
    publisherNameLabel: 'Publisher full name',
    publisherEmailLabel: 'Email address',
    gdprTitle: 'Strict GDPR Compliance Mode (EU)',
    gdprDesc: 'EU Regulation 2016/679. Only physical building entry notes allowed.',
    addresses: 'Addresses',
    stats: 'Statistics',
    completion: 'Completion',
    doorsWorked: 'doors completed',
    lastWorked: 'Last visit',
    neverWorked: 'Never worked',
    dueDate: 'Due date',
    assignee: 'Assigned to',
    serviceGroup: 'Service group',
    allGroups: 'All groups',
    noTerritoriesFound: 'No territory found.',
    newAddress: 'New address',
    number: 'Number',
    street: 'Street',
    notes: 'Notes & observations',
    saveChanges: 'Save changes',
    activeCampaignBadge: 'Active campaign',
    assignedTo: 'Assigned to',
    dueOn: 'Due on',
    notAssigned: 'Not assigned'
  },
  es: {
    appName: 'KBV Territory',
    territories: 'Territorios',
    globalMap: 'Mapa Global',
    visitHistory: 'Historial de Visitas',
    accountManagement: 'Gestión y Asignaciones',
    campaigns: 'Campañas',
    settings: 'Ajustes',
    scanQr: 'Escanear QR Code',
    requestTerritory: 'Solicitar un territorio',
    designer: 'Taller de División',
    searchPlaceholder: 'Buscar territorio o calle...',
    filterAll: 'Todos',
    filterAvailable: 'Disponibles',
    filterAssigned: 'Asignados',
    filterOverdue: 'Atrasados',
    backToTerritories: 'Volver a los territorios',
    annotate: 'Anotar',
    viewAnnotation: 'Ver Anotación ✏️',
    directions: 'Ruta',
    print: 'Imprimir',
    share: 'Compartir (.thshare)',
    qrCode: 'QR Code',
    assign: 'Asignar',
    returnTerritory: 'Devolver',
    fieldNotes: 'Notas de campo',
    addNote: 'Agregar una nota',
    clearDrawings: 'Borrar trazos',
    drawCross: 'Cruz',
    drawPen: 'Lápiz',
    erase: 'Goma',
    statusAvailable: 'Disponible',
    statusAssigned: 'Asignado',
    statusInProgress: 'En curso',
    statusOverdue: 'Atrasado',
    statusArchived: 'Archivado',
    visitNotVisited: 'No visitado',
    visitNotAtHome: 'Ausente',
    visitVisited: 'Visitado / Habló',
    visitReturnVisit: 'Revisita',
    visitDoNotCall: 'No llamar (DNC)',
    save: 'Guardar',
    saved: '¡Guardado!',
    close: 'Cerrar',
    cancel: 'Cancelar',
    delete: 'Eliminar',
    confirm: 'Confirmar',
    congregationName: 'Nombre de la Congregación',
    appLanguage: 'Idioma de la aplicación',
    displayTheme: 'Tema de visualización',
    themeDark: '🌙 Oscuro',
    themeLight: '☀️ Claro',
    themeSystem: '💻 Sistema',
    mapPreview: 'Vista previa del mapa',
    mapPreviewDesc: 'Mostrar mini mapa interactivo en las tarjetas de territorio',
    defaultDueDuration: 'Plazo predeterminado de asignación',
    months1: '1 mes (Campaña especial)',
    months2: '2 meses',
    months3: '3 meses',
    months4: '4 meses (Estándar recomendado)',
    months6: '6 meses',
    tabGeneral: 'General',
    tabPublisher: 'Publicador',
    tabPrivacy: 'Privacidad y RGPD',
    tabBackups: 'Copias de seguridad',
    tabAbout: 'Acerca de',
    backupBtn: 'Guardar copia (.thbackup)',
    restoreBtn: 'Restaurar copia',
    clearCache: 'Limpiar caché',
    cacheCleared: '¡Caché limpio!',
    reportBug: 'Reportar un error',
    bugReported: '¡Informe generado!',
    resetDefaults: 'Restablecer a valores de ejemplo',
    logout: 'Cerrar sesión de este perfil',
    publisherNameLabel: 'Nombre completo del Publicador',
    publisherEmailLabel: 'Correo electrónico',
    gdprTitle: 'Modo de Cumplimiento RGPD Estricto (UE)',
    gdprDesc: 'Reglamento UE 2016/679. Solo se permiten notas físicas sobre el acceso al edificio.',
    addresses: 'Direcciones',
    stats: 'Estadísticas',
    completion: 'Progreso',
    doorsWorked: 'puertas trabajadas',
    lastWorked: 'Última visita',
    neverWorked: 'Nunca recorrido',
    dueDate: 'Fecha límite',
    assignee: 'Asignado a',
    serviceGroup: 'Grupo de servicio',
    allGroups: 'Todos los grupos',
    noTerritoriesFound: 'No se encontró ningún territorio.',
    newAddress: 'Nueva dirección',
    number: 'Número',
    street: 'Calle',
    notes: 'Notas y observaciones',
    saveChanges: 'Guardar cambios',
    activeCampaignBadge: 'Campaña activa',
    assignedTo: 'Asignado a',
    dueOn: 'Para el',
    notAssigned: 'No asignado'
  }
};

export const getTranslation = (lang?: string): Translations => {
  const code = (lang || 'fr').toLowerCase() as LanguageCode;
  if (translations[code]) {
    return translations[code];
  }
  if (code.startsWith('pt')) return translations.pt;
  if (code.startsWith('kea') || code.startsWith('kbv')) return translations.kea;
  if (code.startsWith('es')) return translations.es;
  if (code.startsWith('en')) return translations.en;
  return translations.fr;
};
