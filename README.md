# Carnet de séquences — Sciences et technologie

Application web (statique, sans build) pour rédiger, valider et partager des séquences
de sciences et technologie, cycles 1 à 3 (programmes Nouvelle-Calédonie).

- **Site public** (`index.html`) : n'importe quel enseignant, sans compte, choisit un
  cycle et un thème → fiche séquence → séances (démarche d'investigation, 7 étapes) →
  **envoie la séquence pour validation**. Il garde la possibilité de télécharger en
  **Word / PDF**. Un **pseudonyme** calédonien remplace le vrai nom ; un e-mail de
  contact facultatif reste privé. Bouton **💡 Suggérer une amélioration**.
- **Zone de validation** (`admin.html`) : connexion Google réservée au conseiller
  pédagogique. Il relit, retouche, renforce avec l'IA (aller-retour manuel), puis
  **publie / masque / refuse / supprime**. Historique des versions, détection de
  doublons, suggestions des enseignants dans un onglet dédié.
- **Backend : Firebase** (Firestore + Authentication). Voir `docs/FIREBASE.md`.

## Lancer en local

Aucune dépendance. Servir le dossier avec un serveur HTTP (les `js/*.js` et les `fetch`
ne fonctionnent pas en `file://`) :

```bash
python -m http.server 4173
```

- Site public : http://localhost:4173
- Zone de validation : http://localhost:4173/admin.html — connexion Google, réservée à
  l'adresse définie dans `js/admin.js` (`ADMIN_EMAIL`) et dans `firestore.rules`.

## Structure

| Fichier | Rôle |
|---|---|
| `index.html` / `admin.html` | Les deux pages ; chargent les scripts dans l'ordre |
| `assets/styles.css` · `assets/admin.css` | Styles |
| `js/firebase-config.js` | Identifiants publics du projet Firebase (comparable à une clé "anon") |
| `firestore.rules` | Règles de sécurité Firestore — à coller dans la console Firebase à chaque évolution |
| `data/sequences.json` | **Seed** : 47 séquences de référence (AP3 anonymisées + modèles IA), importées une fois dans Firestore via le bouton admin |
| `js/data.js` | Données de référence : programmes, thèmes, aide par étape |
| `js/store.js` | **Couche d'accès aux séquences** — parle à Firestore. Si le backend change un jour, seul ce fichier bouge |
| `js/sequences-modeles.js` | Expose `EXISTING_SEQUENCES` au site public via `Store.listPublished()` |
| `js/storage.js` | Brouillon de saisie (`localStorage`, `Draft`) |
| `js/pseudonym.js` | Pseudonymes calédoniens |
| `js/zip.js` | Création d'archives `.zip` (export Word) |
| `js/ia-prompt.js` | Aller-retour IA : construction du prompt, lecture de la réponse, fusion — voir `docs/PROMPT-IA.md` |
| `js/app.js` | Application enseignant (site public) |
| `js/admin.js` | Zone de validation |

Scripts classiques (pas de modules ES) : les `const`/`let` de premier niveau sont
partagés entre fichiers, **l'ordre de chargement compte**. `app.js` et `admin.js` ne
s'amorcent que si leur conteneur (`#app` / `#admin`) est présent — `admin.html` charge
`app.js` uniquement pour réutiliser ses fonctions d'affichage et d'export.

Les `<script>` / `<link>` portent `?v=AAAAMMJJx` : **incrémenter à chaque mise en ligne**
pour forcer le rechargement (cache navigateur).

## Déploiement

Site statique → GitHub Pages ou Netlify, sans build. `admin.html` porte `noindex`.
Un job GitHub Actions (`.github/workflows/keepalive.yml`) existe côté Supabase pour un
usage futur ; il est inactif tant que ses secrets ne sont pas renseignés.

## Feuille de route

1. **Fait** — modules, `git`, sauvegarde locale, pseudonymes anonymes, zone de
   validation, aller-retour IA, suggestions, **backend Firebase (Firestore + Auth)**.
2. **En cours** — premières séquences réelles, retours d'usage.
3. **Plus tard** — automatiser l'appel IA (fonction serveur — probablement via
   Supabase Edge Functions, gratuites sans carte bancaire, gardé de côté pour ça).

Voir `docs/FIREBASE.md` (schéma, règles, étapes de configuration) et `docs/PROMPT-IA.md`.
`docs/SCHEMA-SUPABASE.md` documente la réflexion initiale (conservée pour mémoire) ;
le stockage a finalement été fait sur Firebase, Supabase restant une option pour l'IA.
