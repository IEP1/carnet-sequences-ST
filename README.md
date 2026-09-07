# Carnet de séquences — Sciences et technologie

Application web (statique, sans build) permettant aux enseignant·es de rédiger, consulter
et partager des séquences de sciences et technologie pour les cycles 1, 2 et 3
(programmes Nouvelle-Calédonie).

Parcours : choix d'un cycle et d'un thème → fiche séquence → séances détaillées
selon la démarche d'investigation (7 étapes) → récapitulatif, export **Word (.docx)**
et **pack conseiller (.zip)**, envoi par email.

## Lancer en local

Aucune dépendance. Il faut juste servir le dossier avec un petit serveur HTTP
(les modules `js/*.js` ne se chargent pas correctement en `file://`).

```bash
python -m http.server 4173
# puis http://localhost:4173
```

## Structure

| Fichier | Rôle |
|---|---|
| `index.html` | Page unique, charge les scripts dans l'ordre |
| `assets/styles.css` | Styles |
| `js/data.js` | Données de référence : programmes, thèmes, aide par étape, email du conseiller |
| `js/sequences-modeles.js` | Séquences existantes / modèles (`EXISTING_SEQUENCES`) — *seed*, migrera vers Supabase |
| `js/zip.js` | Création et lecture d'archives `.zip` (sans dépendance) |
| `js/storage.js` | Persistance du brouillon (`localStorage`). **Couche isolée** : c'est ici que Supabase se branchera |
| `js/app.js` | Logique applicative + rendu |

Les scripts sont des scripts classiques (pas de modules ES) : les `const` de premier
niveau sont partagées entre fichiers. L'ordre de chargement dans `index.html` compte.

## Sauvegarde automatique

Depuis cette version, la saisie est enregistrée en continu dans le navigateur
(`localStorage`, clé `cds:draft:v1`). À l'ouverture, si un brouillon existe, l'accueil
propose de le reprendre. `js/storage.js` expose `Draft.save / load / clear`.

## Déploiement

Site statique → GitHub Pages ou Netlify, sans étape de build. Servir la racine du dépôt.

## Feuille de route

1. **Fait** — découpage en modules, `git`, sauvegarde locale, corrections (import `.zip`,
   `mailto:` générique, correspondance tolérante des attendus).
2. **À décider** — modèle d'authentification, workflow de validation, données personnelles
   (voir `docs/SCHEMA-SUPABASE.md`).
3. Branchement Supabase : Auth + version Supabase de `js/storage.js`, migration de
   `EXISTING_SEQUENCES` en table.
4. Mise en ligne (Netlify / GitHub Pages) + variables d'environnement.
