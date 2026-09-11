/* ============================================================
   SÉQUENCES PUBLIÉES — exposées au site public

   Passe par la couche Store (js/store.js), branchée sur Firestore.
   `EXISTING_SEQUENCES` garde la forme { id, status, origin, data }
   et `SEQUENCES_READY` est résolu quand les données sont disponibles.
   ============================================================ */
let EXISTING_SEQUENCES = [];

const SEQUENCES_READY = Store.init().then(function(){
  EXISTING_SEQUENCES = Store.listPublished();
});
