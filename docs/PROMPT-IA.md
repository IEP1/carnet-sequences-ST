# Aller-retour IA (sans clé API)

Le renfort par IA se fait **manuellement**, depuis la zone de validation :

1. Ouvrir une séquence → bloc **« Renfort par IA »** → **« Préparer une demande d'IA »**.
2. **Copier** le texte généré, le coller dans une IA (ChatGPT, Claude, Le Chat, Gemini…).
3. Revenir → **« Coller la réponse de l'IA »**, coller la réponse, **« Analyser »**.
4. Le site affiche le **diff** (avant / après). Si c'est bon → **« Appliquer comme
   nouvelle version »** : une révision « Proposition IA (relue par le conseiller) »
   est ajoutée à l'historique, sans écraser les versions précédentes.

Tout est dans [`js/ia-prompt.js`](../js/ia-prompt.js) :

| fonction | rôle |
|---|---|
| `IaPrompt.build(data)` | fabrique le texte à copier (consigne + séquence + format imposé) |
| `IaPrompt.parseResponse(texte)` | extrait le JSON de la réponse (bloc ```` ```json ```` ou premier `{…}`) et le valide a minima |
| `IaPrompt.merge(original, ai)` | applique la proposition sur une **copie** de l'original ; ne touche ni à l'identité, ni à la structure (nombre de séances, clés d'étapes) |

## Ce qui est envoyé à l'IA

**Jamais** l'identité : ni pseudonyme, ni e-mail, ni école. Seulement : cycle, thème,
attendu de fin de cycle, niveau, et le contenu pédagogique (objectifs, vocabulaire,
prérequis, matériel, évaluation, séances et leurs 7 étapes).

## Consigne (résumé)

> Conseiller pédagogique sciences et technologie premier degré (Nouvelle-Calédonie).
> Renforcer la séquence **sans la dénaturer** : respecter l'intention, le thème,
> l'attendu, le niveau ; compléter les manques, reformuler le confus, garder le bon ;
> suivre la démarche d'investigation en 7 étapes ; rester concret et utilisable en
> classe avec du matériel courant ; français clair, aucune introduction ni conclusion.

## Format de réponse imposé

Un unique bloc ```` ```json ```` :

```json
{
  "objectif": "...",
  "vocabulaire": "...",
  "prerequis": "...",
  "materiel": "...",
  "evaluation": "...",
  "seances": [
    {
      "titre": "...",
      "objectifOp": "...",
      "bilan": "...",
      "differenciation": "...",
      "steps": {
        "situation":       { "enseignant": "", "eleve": "", "consigne": "", "materiel": "", "modalite": "" },
        "questionnement":   { "...": "" },
        "hypotheses":       { "...": "" },
        "investigation":    { "...": "" },
        "miseEnCommun":     { "...": "" },
        "structuration":    { "...": "" },
        "reinvestissement": { "...": "" }
      }
    }
  ]
}
```

`modalite` ∈ `["Individuel","Binôme","Petit groupe","Collectif"]` ou `""`.

## Robustesse

- Réponse sans JSON, JSON invalide, ou sans tableau `seances` → message d'erreur clair,
  **rien n'est modifié**.
- L'IA renvoie plus de séances que l'original → les séances en trop sont ignorées
  (`merge` s'aligne sur la structure d'origine).
- Un champ vide dans la réponse n'écrase pas un champ rempli de l'original.
