/* ============================================================
   CHARGEMENT DES SÉQUENCES DÉJÀ PUBLIÉES

   Source actuelle : data/sequences.json (seed — propositions AP3 2025
   + modèles rédigés par IA, extraits de l'ancien fichier codé en dur).

   Deviendra une requête Supabase (`status = 'publie'`) sans toucher au
   reste de l'application : `EXISTING_SEQUENCES` garde la même forme
   `{ id, status, origin, data }` et `SEQUENCES_READY` reste une promesse
   résolue quand les données sont disponibles.
   ============================================================ */
let EXISTING_SEQUENCES = [];

const SEQUENCES_READY = fetch('data/sequences.json?v=20260907b')
  .then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); })
  .then(function(rows){
    EXISTING_SEQUENCES = Array.isArray(rows) ? rows : [];
  })
  .catch(function(err){
    console.error('Séquences non chargées :', err);
    EXISTING_SEQUENCES = [];
  });
