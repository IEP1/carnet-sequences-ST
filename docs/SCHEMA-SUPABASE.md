# Vision produit + piste de schéma Supabase

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
| `reject_reason` | text (nullable) | motif, consultable par l'enseignant via son code de suivi |
| `tracking_code` | text | court, ex. `SEQ-7F3K` — donné à l'enseignant à la soumission |
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
  - lecture d'une ligne par `tracking_code` (fonction RPC dédiée) pour suivre l'état.
- Admin (connecté, e-mail dans `admin_users`) : accès complet.

## Zone admin — fonctions envisagées

- **File des soumissions** : filtre par statut / cycle / thème / date, recherche plein
  texte, tri.
- **Aperçu + édition en place** (réutilise le formulaire et le rendu existants).
- Actions : Publier · Renvoyer à l'enseignant avec un motif · Rejeter (motif) ·
  Supprimer · Dupliquer · Retirer temporairement une séquence publiée.
- **Améliorer avec l'IA** : un clic envoie le contenu à un LLM avec une consigne
  pédagogique ; retour d'une version proposée que le conseiller compare (diff déjà
  codé) et accepte ou non. ⚠️ nécessite une **fonction serveur** (clé API jamais dans
  le navigateur) — Netlify Function / Edge Function Supabase.
- **Métadonnées d'affichage** : éditer le nom affiché, masquer l'école, marquer
  « modèle » / « coup de cœur », tags.
- **Tableau de bord** : nb de séquences par cycle/thème, soumissions par mois, thèmes
  encore sans aucune séquence (pour orienter les enseignants).
- **Détection de doublons** (même thème + pseudo, ou contenu très proche).
- **Export global** (toutes les séquences en JSON / classeur) pour sauvegarde.
- **Journal** des changements de statut (quoi / quand).

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

## Côté client — évolution de `js/storage.js`

Ajouter, à côté de `Draft`, un module `Store` :

```
Store.listPublished({cycle})   -> remplace EXISTING_SEQUENCES sur l'accueil
Store.get(id)
Store.submit(content)          -> insert status='soumis', renvoie tracking_code
Store.bySuivi(code)            -> état d'une soumission
// admin (après login) :
Admin.list(filters) / Admin.update(id, patch) / Admin.publish(id) / Admin.remove(id)
```

`js/app.js` ne change presque pas : il manipule toujours `state.form`.

## Clés

- Clé **anon** (publique) dans le HTML : OK — tout repose sur les policies RLS / la vue publique.
- Clé **service_role** : jamais dans le dépôt ni le navigateur. Uniquement en variable
  d'environnement d'une fonction serveur.
