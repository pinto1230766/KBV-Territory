# 🗺️ KBV Territory

Application moderne, performante et complète de gestion des territoires de prédication et d'assistance au ministère, conçue en parfaite harmonie avec la suite **KBV**.

---

## 🌟 Fonctionnalités Principales

### 🗺️ Cartographie Avancée Multi-Fournisseurs (14 Calques)
- **14 fonds de carte intégrés :** OpenStreetMap, OSM France, CartoDB (Positron, Dark Matter, Voyager), Stamen Watermark, Toner B&W, Esri Satellite HD, Esri Street, Google Maps (Plan, Satellite, Hybride, Relief) et support de serveurs de tuiles XYZ personnalisés.
- **Rendu vectoriel Leaflet :** Polygones délimitant les secteurs, rectangles englobants, cercles de repérage et polylignes de voies.
- **Gestion des étiquettes et des filtres :** Affichage ou masquage sélectif des adresses selon leur statut (Tous, Non visités, Absents, Visités, Revisites, Ne pas appeler).

### 🖊️ Tracé Direct & Annotations sur la Carte
- **Outil Croix ❌ instantané :** 1 clic sur un bâtiment ou un angle de rue dépose immédiatement une croix repère géolocalisée.
- **Crayon & Surligneur en direct :** Dessinez librement sur la carte (contours, flèches, délimitations) à la souris ou au doigt avec sauvegarde vectorielle des coordonnées GPS.
- **Prise de notes au clic :** Renseignez des remarques matérielles avec suggestions en 1 clic (*« 47 Rue Pasteur »*, *« 🔑 Digicode »*, *« 🚪 Entrée cour »*, *« ⚠️ Chien de garde »*).
- **Navigation GPS en un clic :** Lancement direct de l'itinéraire vers une adresse ou un repère dans **Google Maps, Waze, Apple Maps ou OpenStreetMap**.

### ⚖️ Conformité Stricte RGPD & CNIL (France / UE)
- **Mode RGPD actif par défaut :** Respect absolu de l'Article 9 (interdiction des données sensibles / religieuses) et de l'Article 21 (droit d'opposition légal).
- **Séparation stricte des notes :**
  - Notes publiques partagées strictement restreintes aux accès physiques (digicodes, interphones, accès).
  - Notes personnelles isolées localement sur l'appareil du proclamateur.
- **Droit d'opposition garanti :** La mention *« Ne pas appeler »* (DNC) est strictement attachée à l'adresse postale sans enregistrer le nom de l'occupant.

### 📩 Demande de Territoire (?)
- Bouton officiel **(?)** permettant de signaler directement au préposé aux territoires le souhait d'un nouveau secteur avec préférences (Immeubles, Pavillons, Rural, Campagne) et message d'accompagnement.
- Suivi de l'état des demandes (*En attente du préposé* / *Attribué*).

### 🖨️ Impression Officielle A4 & QR Code
- Génération d'une fiche A4 prête à imprimer avec cartouche de territoire, date d'attribution, échéance (règle officielle des 4 mois), QR code, liste détaillée des rues avec cases à cocher et bloc d'alerte pour les adresses « Ne pas appeler ».
- Scanner de QR codes intégré pour charger instantanément un territoire papier sur smartphone ou tablette via la caméra.

### 💾 Sauvegardes & Mode Hors-ligne
- Stockage local ultra-rapide et persistant via IndexedDB (`localforage`).
- Export et restauration complète sous format `.thbackup` ou JSON.
- Importation des fichiers chiffrés `.thshare` (chiffrement AES-CBC + PBKDF2).

---

## 🛠️ Stack Technique

- **Framework :** [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Bundler & Dev Server :** [Vite](https://vite.dev/)
- **Cartographie :** [Leaflet](https://leafletjs.com/)
- **Stockage Hors-Ligne :** [LocalForage](https://localforage.github.io/localForage/)
- **Icônes :** [Lucide React](https://lucide.dev/)
- **Scanner QR :** [HTML5-QRCode](https://github.com/mebjas/html5-qrcode)

---

## 🚀 Installation & Démarrage

```bash
# Cloner le dépôt
git clone https://github.com/pinto1230766/KBV-Territory.git
cd KBV-Territory

# Installer les dépendances
npm install

# Lancer le serveur de développement local
npm run dev

# Compiler pour la production
npm run build
```

---

## 📄 Licence & Crédits

Développé pour la gestion harmonieuse et le suivi rigoureux des territoires.  
© 2026 **KBV Territory**.
