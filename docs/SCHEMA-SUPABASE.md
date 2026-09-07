# Piste de schéma Supabase (à valider)

> Brouillon de travail. Rien n'est branché — ce document sert à cadrer les décisions
> avant d'ouvrir un projet Supabase.

## Décisions à trancher d'abord

1. **Authentification** : les enseignant·es se connectent-ils ? (lien magique par email,
   éventuellement restreint au domaine `@gouv.nc` / listes d'écoles).
2. **Workflow** : `brouillon` → `soumis` → **validé par le conseiller** → `publié` ?
   Ou publication directe ?
3. **Qui modifie quoi** : seulement l'auteur ? proposition de modification par un tiers
   (le mécanisme « diff » existe déjà côté client) ? versionnage ?
4. **Données personnelles** : nom d'enseignant + école affichés publiquement → mention
   d'information / consentement / possibilité de retrait. Les exemples actuels sont
   partiellement anonymisés, à harmoniser.
5. **Les `EXISTING_SEQUENCES`** deviennent-elles des lignes `sequences` (seed) ?

## Tables envisagées

### `profiles`
| colonne | type | note |
|---|---|---|
| `id` | uuid (PK, = `auth.users.id`) | |
| `full_name` | text | |
| `school` | text | |
| `role` | text | `enseignant` / `conseiller` |
| `created_at` | timestamptz | |

### `sequences`
| colonne | type | note |
|---|---|---|
| `id` | uuid (PK) | |
| `author_id` | uuid (FK → profiles) | |
| `status` | text | `brouillon` / `soumis` / `publie` (+ `existante` / `assistee` / `ia` pour le seed) |
| `cycle` | text | `C1` / `C2` / `C3` |
| `theme` | text | |
| `title` | text | |
| `content` | jsonb | l'objet séquence actuel (fiche + `seances[]`) tel quel |
| `source_id` | uuid (FK → sequences, nullable) | si proposition de modification |
| `created_at` / `updated_at` | timestamptz | |

Garder tout le corps de la séquence en `jsonb` = migration quasi nulle depuis le
format actuel (`js/storage.js` sérialise déjà exactement cet objet).

### `sequence_revisions` (optionnel — si versionnage)
`id`, `sequence_id`, `content` jsonb, `author_id`, `created_at`.

## RLS (esquisse)

- `sequences` en lecture publique **uniquement** si `status = 'publie'`.
- lecture/écriture de ses propres lignes : `author_id = auth.uid()`.
- rôle `conseiller` : lecture de tout, passage de `status` à `publie`.
- `profiles` : chacun lit/écrit sa ligne ; `full_name` + `school` lisibles par tous
  seulement si l'enseignant a des séquences publiées (ou champ `display_name` distinct).

## Côté client

`js/storage.js` gagnera, à côté de `Draft`, un module `Store` :

```
Store.listPublished({cycle})      -> remplace EXISTING_SEQUENCES sur l'accueil
Store.get(id)
Store.saveDraft(content)          -> upsert status='brouillon' pour l'utilisateur
Store.submit(id)                  -> status='soumis'
```

Le reste de `js/app.js` ne bouge pas : il manipule toujours `state.form`.

## Clés

- Clé **anon** (publique) : dans le HTML, OK — tout repose alors sur les policies RLS.
- Clé **service_role** : jamais dans le dépôt ni le navigateur. Uniquement en variable
  d'environnement côté fonction serveur si besoin.
