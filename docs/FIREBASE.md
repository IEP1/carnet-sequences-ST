# Backend Firebase

Projet Firebase : **carnet-sequences** (créé sur un compte Google personnel, pour
éviter les restrictions d'organisation d'un compte `@gouv.nc`).

## Pourquoi Firebase (et pas Supabase)

Supabase a été le premier choix, mais deux frictions ont fait pencher pour Firebase :
- Plan gratuit Supabase : projet mis en **pause après 7 jours d'inactivité**.
- Plan gratuit Supabase : **2 projets actifs maximum par compte** (pas par
  organisation) — bloquant sur le compte déjà utilisé pour d'autres projets.

Firebase (plan **Spark**, gratuit) n'a ni pause pour inactivité, ni plafond de ce
genre. Supabase reste envisagé plus tard uniquement pour une **fonction serveur**
(appel automatique à une IA), ses Edge Functions étant utilisables sans carte
bancaire même en gratuit — voir `docs/SCHEMA-SUPABASE.md` (conservé pour mémoire).

## Services utilisés

- **Firestore** (base de données documents, mode production, région proche de la
  Nouvelle-Calédonie).
- **Authentication** — connexion **Google**, restreinte à une seule adresse
  (`vince.renais@gmail.com`, définie dans `js/admin.js` → `ADMIN_EMAIL` **et** dans
  `firestore.rules` → `isAdmin()` — les deux doivent rester synchronisés).

## Schéma

### Collection `sequences`
Un document par séquence. Champs :

| champ | type | note |
|---|---|---|
| `status` | string | `soumis` · `publie` · `masque` · `rejete` · `supprime` (+ import initial : `existante` / `assistee` / `ia`, traités comme publiés) |
| `origin` | string | `ap3-2025` · `modele-ia` · `enseignant` · `conseiller` |
| `data` | map | l'objet séquence complet (cycle, thème, pseudonyme, séances…) — même forme que l'ancien fichier `data/sequences.json` |
| `contactEmail` | string | privé, jamais exposé côté public |
| `adminNote` | string | note interne |
| `rejectReason` | string | motif de refus |
| `sourceId` | string \| null | si c'est une proposition de modification |
| `createdAt` / `updatedAt` / `publishedAt` | string (ISO) | |
| `revisions` | array de `{label, data, at}` | historique complet, jamais purgé |

### Collection `suggestions`
`{ text, author, status: 'nouveau'|'traitee'|'ecartee', createdAt, updatedAt }`

## Règles de sécurité — `firestore.rules`

Le fichier à la racine du dépôt est la référence. À **coller manuellement** dans
Firebase Console → Firestore Database → onglet **Règles** → Publier, à chaque fois
qu'il change (pas de déploiement automatique tant que le CLI Firebase n'est pas
utilisé).

Logique :
- Lecture publique limitée aux séquences dont le statut est publié.
- Création publique autorisée uniquement avec `status: 'soumis'` (une soumission ne
  peut jamais s'auto-publier).
- Tout le reste (modification, suppression, lecture complète) réservé à `isAdmin()`.
- Suggestions : création publique libre, lecture/gestion réservées à l'admin.

## Étapes de configuration (déjà faites)

1. Projet Firebase créé (compte personnel, pas d'organisation).
2. Firestore activé, mode production.
3. Authentication → fournisseur Google activé.
4. Application Web enregistrée → identifiants dans `js/firebase-config.js`.

## Étapes restantes côté console (à faire une fois)

1. **Coller `firestore.rules`** dans Firestore Database → Règles → Publier.
2. **Autoriser le domaine du site** : Authentication → Settings → Authorized domains
   → Add domain → `iep1.github.io` (nécessaire pour que la connexion Google fonctionne
   depuis le site publié ; `localhost` est autorisé par défaut).
3. Se connecter une fois sur `admin.html` avec le compte Google admin, puis cliquer
   **« 🌱 Importer / rétablir les séquences de référence »** pour peupler Firestore
   avec les 47 séquences de `data/sequences.json`.

## Notes techniques

- SDK chargé en version **compat** (`firebase-app-compat.js`, etc., via CDN) : ça
  attache tout sur l'objet global `firebase`, cohérent avec le reste du site qui
  n'utilise pas de modules ES.
- Lecture publique : requête ponctuelle (`.get()`) au chargement — pas d'écoute
  temps réel, pour ménager le quota gratuit face à un trafic potentiellement large.
- Lecture admin : écoute temps réel (`onSnapshot`) — un seul utilisateur, ça permet
  de voir arriver une soumission sans recharger la page.
- Les identifiants de `js/firebase-config.js` sont publics par nature (comme la
  clé "anon" de Supabase) : la sécurité vient uniquement des règles ci-dessus.
