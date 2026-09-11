/* ============================================================
   STORE — accès aux séquences (couche isolée)

   Backend : Firebase Firestore (voir js/firebase-config.js pour la connexion).
   Le site public et la zone admin n'appellent que Store.xxx() ; si on change
   un jour de backend, seul l'intérieur de ce fichier bouge.

   Lecture publique : une requête ponctuelle au chargement (site à fort trafic
   potentiel → on évite un flux temps réel par visiteur).
   Lecture admin (Store.watchAdmin) : écoute en temps réel — un seul utilisateur,
   et c'est ce qui permet de voir arriver les soumissions sans recharger.

   Forme d'un enregistrement :
     { id, status, origin, data,
       contactEmail, adminNote, rejectReason,
       sourceId, createdAt, updatedAt, publishedAt, revisions:[{label,data,at}] }

   status : soumis · publie · masque · rejete · supprime
            (+ import initial : existante · assistee · ia  → considérés « en ligne »)
   ============================================================ */
const Store = (function(){
  const PUBLISHED = ['publie','existante','assistee','ia'];

  let db = null;
  let pubCache = [];       // site public : séquences publiées
  let allCache = [];       // admin : toutes les séquences
  let sugCache = [];       // admin : suggestions
  let ready = null;
  let seedError = null;
  let adminUnsubs = [];

  function getDb(){ if(!db) db = firebase.firestore(); return db; }
  function nowISO(){ return new Date().toISOString(); }
  function clone(o){ return JSON.parse(JSON.stringify(o)); }
  function norm(s){ return (s||'').toString().toLowerCase().replace(/\s+/g,' ').trim(); }
  function toRecord(doc){ return Object.assign({ id: doc.id }, doc.data()); }
  function withoutId(rec){ const o=Object.assign({}, rec); delete o.id; return o; }

  /* Écrit vers Firestore en tâche de fond ; on a déjà mis à jour le cache local
     avant l'appel (voir chaque fonction), donc l'interface reste synchrone. */
  function bg(promise){
    promise.catch(function(err){
      console.error('Firestore :', err);
      alert("Problème de connexion à la base de données : " + err.message);
    });
  }

  /* ---------------- init (site public) ---------------- */
  function init(){
    if(ready) return ready;
    ready = getDb().collection('sequences').where('status','in',PUBLISHED).get()
      .then(function(snap){ pubCache = snap.docs.map(toRecord); seedError = null; })
      .catch(function(err){
        console.error('Séquences non chargées :', err);
        pubCache = [];
        seedError = "Impossible de charger les séquences (" + err.message + ").";
      });
    return ready;
  }
  function seedStatus(){ return { count: pubCache.length, error: seedError }; }

  function bucket(rec){
    if(rec.status==='soumis' || rec.status==='en_revue') return 'a_valider';
    if(rec.status==='masque')  return 'masquee';
    if(rec.status==='rejete')  return 'refusee';
    if(rec.status==='supprime') return 'corbeille';
    if(PUBLISHED.indexOf(rec.status)>-1) return 'en_ligne';
    return 'autre';
  }
  const BUCKET_LABEL = {
    a_valider:'À valider', en_ligne:'En ligne', masquee:'Masquée',
    refusee:'Refusée', corbeille:'Corbeille', autre:'—'
  };
  function originLabel(rec){
    return ({
      'ap3-2025':'Proposée en AP3', 'modele-ia':'Modèle IA',
      'enseignant':'Soumise par un enseignant', 'conseiller':'Créée par le conseiller'
    })[rec.origin] || rec.origin || '';
  }

  function findById(id){ return allCache.filter(function(r){ return r.id===id; })[0] || null; }

  /* ---------------- API site public ---------------- */
  function listPublished(filter){
    let rows = pubCache;
    if(filter && filter.cycle) rows = rows.filter(function(r){ return r.data.cycle===filter.cycle; });
    return rows;
  }

  /* Soumission enseignant. payload = { data, contactEmail?, sourceId? } */
  function submit(payload){
    const data = payload.data || payload;
    const t = nowISO();
    const id = getDb().collection('sequences').doc().id;
    const rec = {
      id: id, status: 'soumis', origin: 'enseignant',
      data: data,
      contactEmail: payload.contactEmail || data.contactEmail || '',
      adminNote: '', rejectReason: '',
      sourceId: payload.sourceId || null,
      createdAt: t, updatedAt: t, publishedAt: null,
      revisions: [{ label: 'Version enseignant', data: clone(data), at: t }]
    };
    allCache.push(rec);
    bg(getDb().collection('sequences').doc(id).set(withoutId(rec)));
    return rec;
  }

  /* ---------------- API zone admin ---------------- */
  /* Écoute en temps réel : appelle onChange() à chaque chargement/mise à jour
     (y compris les soumissions arrivées depuis un autre appareil). */
  function watchAdmin(onChange){
    unwatchAdmin();
    const u1 = getDb().collection('sequences').onSnapshot(function(snap){
      allCache = snap.docs.map(toRecord);
      onChange();
    }, function(err){ console.error('Admin séquences :', err); });
    const u2 = getDb().collection('suggestions').onSnapshot(function(snap){
      sugCache = snap.docs.map(toRecord).sort(function(a,b){ return (b.createdAt||'').localeCompare(a.createdAt||''); });
      onChange();
    }, function(err){ console.error('Admin suggestions :', err); });
    adminUnsubs = [u1, u2];
  }
  function unwatchAdmin(){ adminUnsubs.forEach(function(u){ u(); }); adminUnsubs = []; allCache=[]; sugCache=[]; }

  function listAll(){ return allCache; }

  function patch(id, changes){
    const t = nowISO();
    const rec = findById(id);
    if(rec) Object.assign(rec, changes, { updatedAt: t });
    bg(getDb().collection('sequences').doc(id).set(Object.assign({}, changes, { updatedAt: t }), { merge: true }));
    return rec;
  }

  function setStatus(id, status, extra){
    const changes = Object.assign({ status: status }, extra || {});
    if(status==='publie') changes.publishedAt = nowISO();
    return patch(id, changes);
  }

  /* Nouvelle version du contenu (garde l'historique). */
  function addRevision(id, data, label){
    const t = nowISO();
    const rec = findById(id);
    const revs = (rec && rec.revisions ? rec.revisions.slice() : []);
    revs.push({ label: label || 'Révision', data: clone(data), at: t });
    return patch(id, { data: data, revisions: revs });
  }
  function restoreRevision(id, index){
    const rec = findById(id);
    if(!rec || !rec.revisions || !rec.revisions[index]) return rec;
    return addRevision(id, clone(rec.revisions[index].data), 'Restauration : ' + rec.revisions[index].label);
  }

  function duplicate(id){
    const rec = findById(id);
    if(!rec) return null;
    const copy = clone(rec.data);
    copy.theme = copy.theme + ' (copie)';
    return submit({ data: copy, sourceId: id });
  }

  function hardDelete(id){
    allCache = allCache.filter(function(r){ return r.id!==id; });
    bg(getDb().collection('sequences').doc(id).delete());
  }

  /* Doublons : même cycle + même thème. */
  function duplicatesOf(rec){
    return allCache.filter(function(r){
      return r.id!==rec.id
        && r.data.cycle===rec.data.cycle
        && norm(r.data.theme)===norm(rec.data.theme)
        && r.status!=='supprime';
    });
  }

  function stats(){
    const rows = allCache;
    const published = rows.filter(function(r){ return PUBLISHED.indexOf(r.status)>-1; });
    const byCycle = {C1:0,C2:0,C3:0};
    published.forEach(function(r){ if(byCycle[r.data.cycle]!==undefined) byCycle[r.data.cycle]++; });
    const counts = {};
    rows.forEach(function(r){ const b = bucket(r); counts[b] = (counts[b]||0)+1; });
    return { total: rows.length, published: published.length, byCycle: byCycle, buckets: counts };
  }

  /* ---------------- suggestions d'amélioration du site ---------------- */
  function submitSuggestion(payload){
    const t = nowISO();
    const id = getDb().collection('suggestions').doc().id;
    const rec = {
      id: id,
      text: (payload.text || '').trim(),
      author: (payload.author || '').trim(),
      status: 'nouveau',          // nouveau · traitee · ecartee
      createdAt: t, updatedAt: t
    };
    bg(getDb().collection('suggestions').doc(id).set(withoutId(rec)));
    return rec;
  }
  function listSuggestions(){ return sugCache; }
  function patchSuggestion(id, changes){
    const t = nowISO();
    const s = sugCache.filter(function(x){ return x.id===id; })[0];
    if(s) Object.assign(s, changes, { updatedAt: t });
    bg(getDb().collection('suggestions').doc(id).set(Object.assign({}, changes, { updatedAt: t }), { merge: true }));
    return s || null;
  }
  function deleteSuggestion(id){
    sugCache = sugCache.filter(function(x){ return x.id!==id; });
    bg(getDb().collection('suggestions').doc(id).delete());
  }

  /* ---------------- import initial (seed) — zone admin uniquement ---------------- */
  function importSeed(rows){
    const t = nowISO();
    const batch = getDb().batch();
    rows.forEach(function(row){
      const ref = getDb().collection('sequences').doc(row.id);
      batch.set(ref, {
        status: row.status, origin: row.origin, data: row.data,
        contactEmail: '', adminNote: '', rejectReason: '', sourceId: null,
        createdAt: t, updatedAt: t,
        publishedAt: PUBLISHED.indexOf(row.status)>-1 ? t : null,
        revisions: [{ label: 'Import initial', data: row.data, at: t }]
      }, { merge: true });
    });
    return batch.commit();
  }

  return {
    init: init, seedStatus: seedStatus,
    listPublished: listPublished, submit: submit,
    watchAdmin: watchAdmin, unwatchAdmin: unwatchAdmin,
    listAll: listAll, findById: findById, patch: patch, setStatus: setStatus,
    addRevision: addRevision, restoreRevision: restoreRevision,
    duplicate: duplicate, hardDelete: hardDelete, duplicatesOf: duplicatesOf,
    bucket: bucket, BUCKET_LABEL: BUCKET_LABEL, originLabel: originLabel, stats: stats,
    submitSuggestion: submitSuggestion, listSuggestions: listSuggestions,
    patchSuggestion: patchSuggestion, deleteSuggestion: deleteSuggestion,
    importSeed: importSeed
  };
})();
