# Carnet de séquences — Sciences et technologie

Application web (statique, sans build) pour rédiger, valider et partager des séquences
de sciences et technologie, cycles 1 à 3 (programmes Nouvelle-Calédonie).

- **Site public** (`index.html`) : n'importe quel enseignant, sans compte, choisit un
  cycle et un thème → fiche séquence → séances (démarche d'investigation, 7 étapes) →
  **envoie la séquence pour validation**. Il garde la possibilité de télécharger en
  **Word / PDF**. Un **pseudonyme** calédonien remplace le vrai nom ; un e-mail de
  contact facultatif reste privé.
- **Zone de validation** (`admin.html`) : le conseiller relit, retouche, renforce avec
  l'IA (aller-retour manuel), puis **publie / masque / refuse / supprime**. Historique
  des versions, détection de doublons.

## Lancer en local

Aucune dépendance. Servir le dossier avec un serveur HTTP (les `js/*.js` et les `fetch`
ne fonctionnent pas en `file://`) :

```bash
python -m http.server 4173
```

- Site public : http://localhost:4173
- Zone de validation : http://localhost:4173/admin.html — code maquette : **`iep1`**

## Structure

| Fichier | Rôle |
|---|---|
| `index.html` / `admin.html` | Les deux pages ; chargent les scripts dans l'ordre |
| `assets/styles.css` · `assets/admin.css` | Styles |
| `data/sequences.json` | **Seed** : 47 séquences (AP3 anonymisées + modèles IA). Migrera dans Supabase |
| `js/data.js` | Données de référence : programmes, thèmes, aide par étape |
| `js/store.js` | **Couche d'accès aux séquences** — seed + état local (localStorage). C'est ici que Supabase se branchera |
| `js/sequences-modeles.js` | Expose `EXISTING_SEQUENCES` au site public via `Store.listPublished()` |
| `js/storage.js` | Brouillon de saisie (`localStorage`, `Draft`) |
| `js/pseudonym.js` | Pseudonymes calédoniens |
| `js/zip.js` | Création / lecture d'archives `.zip` (export Word) |
| `js/ia-prompt.js` | Aller-retour IA : construction du prompt, lecture de la réponse, fusion — voir `docs/PROMPT-IA.md` |
| `js/app.js` | Application enseignant (site public) |
| `js/admin.js` | Zone de validation |

Scripts classiques (pas de modules ES) : les `const`/`let` de premier niveau sont
partagés entre fichiers, **l'ordre de chargement compte**. `app.js` et `admin.js` ne
s'amorcent que si leur conteneur (`#app` / `#admin`) est présent — `admin.html` charge
`app.js` uniquement pour réutiliser ses fonctions d'affichage et d'export.

Les `<script>` / `<link>` portent `?v=AAAAMMJJx` : **incrémenter à chaque mise en ligne**
pour forcer le rechargement (cache navigateur).

## État des données (maquette)

Tant que Supabase n'est pas branché, `js/store.js` garde l'état « vivant »
(soumissions, statuts, révisions, retouches) dans le `localStorage` du navigateur
(clé `cds:store:v1`). La zone admin permet d'**exporter / importer** cet état en JSON,
et de le réinitialiser. Le seed (`data/sequences.json`) reste la référence versionnée.

## Déploiement

Site statique → GitHub Pages ou Netlify, sans build. `admin.html` porte `noindex`.

## Feuille de route

1. **Fait** — modules, `git`, sauvegarde locale, pseudonymes anonymes, extraction du
   seed, couche `Store`, flux de soumission, **zone de validation (maquette)**,
   aller-retour IA.
2. **En cours** — recueil des retours sur la maquette admin.
3. **Supabase** : table `sequences` (JSONB) + vue publique + Auth (lien magique) ;
   réécriture interne de `js/store.js` ; import du seed.
4. **Mise en ligne** (Netlify / GitHub Pages) + variables d'environnement.

Voir `docs/SCHEMA-SUPABASE.md` (décisions, schéma, RLS) et `docs/PROMPT-IA.md`.
