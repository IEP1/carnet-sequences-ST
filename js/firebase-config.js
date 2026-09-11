/* ============================================================
   CONFIGURATION FIREBASE

   Ces valeurs sont publiques par nature (comparable à la clé "anon" de
   Supabase) : elles identifient le projet, elles ne donnent aucun accès —
   la sécurité vient des règles Firestore (voir firestore.rules), pas du
   secret de ces champs.
   ============================================================ */
firebase.initializeApp({
  apiKey: "AIzaSyA2w5ECv7ranreCZWVibBCQbr6aATkJyNM",
  authDomain: "carnet-sequences.firebaseapp.com",
  projectId: "carnet-sequences",
  storageBucket: "carnet-sequences.firebasestorage.app",
  messagingSenderId: "642077971264",
  appId: "1:642077971264:web:fbd722e2c48fc8bbd6e0a5"
});
