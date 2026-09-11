# Vision produit + piste de schéma Supabase

> **Statut (2026-09-11) : superseded pour le stockage.** Le backend réel du site est
> **Firebase** (Firestore + Auth) — voir `docs/FIREBASE.md`. Raison du changement :
> pause automatique des projets Supabase gratuits après 7 jours d'inactivité, et
> plafond de 2 projets gratuits par compte (pas par organisation), tous deux bloquants
> sur le compte utilisé. Ce document reste comme trace de la réflexion produit
> (vision, anonymat, workflow de validation — toujours valable) et parce que
> **Supabase reste une option envisagée pour une fonction serveur IA** plus tard
> (Edge Functions utilisables sans carte bancaire, contrairement à Firebase Cloud
> Functions qui exigent le plan payant Blaze).

> Cadre les décisions avant d'ouvrir un projet Supabase. Rien n'est encore branché.

## Vision confirmée (2026-09-07)

- Le site est **public** : toute personne ayant le lien peut venir créer une séquence,
  sans compte.
- À la fin, la séquence est **soumise** — elle arrive dans une **zone privée (admin)**
  réservée au conseiller.
- Dans cette zone, le conseiller peut : **relire, modifier, valider, supprimer**, ou
  **améliorer avec l'IA**.
- Une fois **validée**, la séquence apparaît publiquement sur le site.
- Chaque séquence = une ligne en base.
- L'ancien circuit **JSON + email est abandonné** : plus de pièce jointe, tout passe
  par la zone admin.
- Les enseignants gardent la possibilité de **télécharger en PDF / Word** à tout moment.

### Identité des enseignants — « plus anonyme »

Retenu : **pseudonyme public + e-mail privé facultatif**, sans compte obligatoire.

- Pseudonyme calédonien auto-généré (`js/pseudonym.js`), relançable, ou choisi dans une
  liste, ou saisi librement. Mémorisé par navigateur (`localStorage cds:pseudonym:v1`).
  C'est le nom affiché publiquement sur la séquence publiée.
- E-mail de contact **facultatif**, **jamais affiché** : visible seulement dans la zone
  admin, pour recontacter l'enseignant (retour, publication...).
- Le conseiller peut **remplacer le nom affiché** dans la zone admin (anonymiser
  davantage, ou signer « Équipe de circonscription » pour les séquences très retravaillées).
- Évolution possible : connexion par lien magique (magic link) pour permettre à
  l'enseignant de **retrouver / modifier ses séquences** sur un autre appareil. Le
  pseudonyme reste la couche d'affichage.

## Tables envisagées

### `sequences`
| colonne | type | note |
|---|---|---|
| `id` | uuid (PK) | |
| `status` | text | `soumis` · `en_revue` · `publie` · `rejete` · `archive` (+ seed : `existante` / `assistee` / `ia`) |
| `cycle` | text | `C1` / `C2` / `C3` |
| `theme` | text | |
| `title` | text | |
| `display_author` | text | pseudonyme affiché publiquement |
| `contact_email` | text (nullable) | **privé** — jamais renvoyé au public |
| `content` | jsonb | l'objet séquence complet (fiche + `seances[]`), format actuel inchangé |
| `admin_note` | text (nullable) | note interne du conseiller |
| `reject_reason` | text (nullable) | motif du refus (interne ; communiqué à l'enseignant si comptes) |
| `source_id` | uuid (nullable, FK → sequences) | si c'est une proposition de modification |
| `submitted_at` / `updated_at` / `published_at` | timestamptz | |

Tout le corps en `jsonb` ⇒ migration quasi nulle : `js/storage.js` sérialise déjà
exactement cet objet.

### `sequence_revisions` (si l'on veut l'historique / revenir en arrière)
`id`, `sequence_id`, `content` jsonb, `label` (« version enseignant », « retouche
conseiller », « proposition IA »), `created_at`.

Garder **toujours** la version originale de l'enseignant, même après retouche.

### `admin_users`
Liste blanche d'e-mails autorisés à accéder à la zone admin (le conseiller, et
éventuellement des relecteurs).

## RLS (esquisse)

- Public (clé anon, non connecté) :
  - **lecture** de `sequences` uniquement si `status = 'publie'`, et **sans** les
    colonnes privées (`contact_email`, `admin_note`, `reject_reason`) → exposer une
    **vue** `public_sequences` restreinte plutôt que la table.
  - **insertion** autorisée avec `status = 'soumis'` (+ anti-spam, voir plus bas).
- Admin (connecté, e-mail dans `admin_users`) : accès complet.

## Faut-il une base de données ? (décision)

Besoin central : **n'importe quel enseignant, sans compte, soumet une séquence qui
arrive directement dans la zone privée du conseiller.**

Un site statique hébergé sur GitHub **ne peut rien réécrire dans GitHub**. Sans
backend, la soumission repasse forcément par « l'enseignant exporte un fichier → il
te l'envoie → tu l'ajoutes à la main » = l'ancien circuit qu'on abandonne.

| | Tout dans GitHub | **Supabase (retenu)** |
|---|---|---|
| Soumission anonyme directe | ✗ (formulaire tiers / envoi manuel) | ✓ écriture directe en table (clé anon + RLS) |
| Vraie zone admin (publier/masquer/éditer en direct) | ✗ (édition de fichiers + commits) | ✓ |
| Changement de statut | 1 commit + 1 build | instantané (une colonne) |
| Déploiement quand on publie une séquence | à chaque fois | **jamais** (le contenu n'est plus dans le repo) |
| Historique / doublons / recherche | manuel / limité | requêtes SQL |
| Coût | 0 | 0 (plan gratuit large ; pause après 7 j **sans aucune** activité) |
| Verrouillage | aucun | aucun (bouton export JSON + seed dans git) |

**Retenu : hybride.** GitHub = code + seed (`data/sequences.json`, sauvegarde et
référence). Supabase = séquences vivantes + zone admin + révisions. Réversible à tout
moment (export JSON, le seed reste versionné).

## Zone admin — fonctions retenues

- **File des soumissions** : filtre par statut / cycle / thème / date, recherche, tri.
- **Aperçu + édition en place** (réutilise le formulaire et le rendu existants).
- **Liste des séquences + changement de statut** : `publie` · `masque` (retiré de la
  publication **sans suppression**) · `supprime`.
- Actions : Publier · Masquer · Supprimer · Renvoyer à l'enseignant avec un motif ·
  Dupliquer.
- **Historique** : toutes les versions proposées d'une séquence sont conservées
  (`sequence_revisions`), consultables et restaurables.
- **Détection de doublons** (même thème + pseudo, ou contenu très proche).
- **Métadonnées d'affichage** : nom affiché, masquer l'école, marquer « modèle » /
  « coup de cœur », tags.
- **Tableau de bord** : nb par cycle/thème, soumissions par mois, thèmes sans séquence.
- **Export global** (toutes les séquences en JSON) pour sauvegarde.
- **Journal** des changements de statut.

## « Améliorer avec l'IA » — sans clé API (aller-retour manuel)

Pas de clé API disponible → aucun appel automatique. À la place :

1. Bouton **« Préparer une demande d'aide IA »** → génère un texte à copier :
   un **gabarit de prompt** (consigne pédagogique claire + rôle) + les **données de
   la séquence** + le **format de réponse imposé** (bloc ```json``` de la même
   structure que `data/sequences.json`, clés identiques, rien d'autre).
2. Le conseiller colle ce texte dans n'importe quelle IA → réponse au format imposé.
3. Bouton **« Coller la réponse IA »** → le site **parse et valide** le JSON, affiche
   le **diff** avant/après (déjà codé), et sur acceptation → nouvelle révision /
   séquence validée.
4. JSON malformé → message clair, rien n'est modifié.

Gabarit de prompt + schéma de réponse : à figer dans `docs/PROMPT-IA.md` (à créer).
Réalisable tout de suite, hors Supabase.

## Modification proposée par un enseignant — validation

Un enseignant modifie une séquence publiée → crée une **soumission liée**
(`source_id` = l'originale), `status = 'soumis'`. À la validation, le conseiller choisit :

- **Remplacer** : la nouvelle version remplace l'ancienne (ancienne → historique).
- **Publier en parallèle** : les deux restent en ligne (variantes assumées).

La version d'origine de l'enseignant est **toujours** conservée dans l'historique.

## Idées côté site public (une fois les séquences en base)

- Recherche et filtres (cycle, thème, niveau, mot-clé), tri par date.
- « Signaler une erreur » sur une séquence publiée → arrive en zone admin.
- Compteur de vues / téléchargements (utile au pilotage).
- Licence de réutilisation affichée (ex. CC BY-NC-SA) — les séquences sont partagées.
- Page « vie privée » courte : pseudonyme public, e-mail facultatif et privé, hébergement.
- « Proposer une modification » (déjà codé) → nouvelle soumission liée à l'originale.

## Anti-spam (site public sans compte)

- Honeypot + délai minimal de remplissage côté client.
- Rate-limit par IP / navigateur à l'insertion (Edge Function).
- Modération **a priori** de fait : rien n'est public avant validation manuelle.
- Éventuellement un captcha léger (hCaptcha/Turnstile) seulement à la soumission.

## Côté client — `js/store.js` existe déjà

Le module `Store` est en place (aujourd'hui : seed + localStorage). Le branchement
Supabase = réécrire l'**intérieur** de ces fonctions, l'interface ne bouge pas :

```
Store.init()                       -> charge les séquences publiées
Store.listPublished({cycle})       -> pour l'accueil (EXISTING_SEQUENCES)
Store.submit({data, contactEmail, sourceId})  -> insert status='soumis'
// zone admin (après auth) :
Store.listAll() / findById(id) / patch(id, changes) / setStatus(id, status)
Store.addRevision / restoreRevision / duplicate / hardDelete / duplicatesOf / stats
```

`js/app.js` ne change presque pas : il manipule toujours `state.form`.

## Clés

- Clé **anon** (publique) dans le HTML : OK — tout repose sur les policies RLS / la vue publique.
- Clé **service_role** : jamais dans le dépôt ni le navigateur. Uniquement en variable
  d'environnement d'une fonction serveur.
