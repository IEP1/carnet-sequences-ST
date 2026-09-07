/* ============================================================
   STORE — accès aux séquences (couche isolée)

   Aujourd'hui :
     - seed en lecture seule : data/sequences.json
     - état « vivant » (soumissions, changements de statut, révisions,
       retouches) : localStorage (clé cds:store:v1)

   Demain : Supabase. Seul l'intérieur de ces fonctions changera ;
   le site et la zone admin continueront d'appeler Store.xxx().

   Forme d'un enregistrement :
     { id, status, origin, data,
       contactEmail, adminNote, rejectReason,
       sourceId, createdAt, updatedAt, publishedAt, revisions:[{label,data,at}] }

   status : soumis · en_revue · publie · masque · rejete · supprime
            (+ seed : existante · assistee · ia  → considérés « en ligne »)
   ============================================================ */
const Store = (function(){
  const LS_KEY   = 'cds:store:v1';
  const SEED_URL = 'data/sequences.json?v=20260908a';

  const PUBLISHED = ['publie','existante','assistee','ia'];

  let seed  = [];
  let local = { submissions: [], overrides: {} };
  let ready = null;
  let seedError = null;   // message si le seed n'a pas pu être chargé

  /* ---------------- localStorage ---------------- */
  function loadLocal(){
    try{
      const raw = localStorage.getItem(LS_KEY);
      if(raw){
        const o = JSON.parse(raw) || {};
        local = {
          submissions: Array.isArray(o.submissions) ? o.submissions : [],
          overrides:  (o.overrides && typeof o.overrides === 'object') ? o.overrides : {}
        };
      }
    }catch(e){ /* mode privé / corrompu : on repart vide */ }
  }
  function saveLocal(){
    try{ localStorage.setItem(LS_KEY, JSON.stringify(local)); }catch(e){}
  }

  /* ---------------- init ---------------- */
  function init(){
    if(ready) return ready;
    loadLocal();
    ready = fetch(SEED_URL)
      .then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); })
      .then(function(rows){ seed = Array.isArray(rows) ? rows : []; seedError = null; })
      .catch(function(err){
        console.error('Seed non chargé :', err);
        seed = [];
        seedError = (location.protocol === 'file:')
          ? "La page a été ouverte directement (file://). Lancez un petit serveur — dans le dossier du projet : « python -m http.server 4173 » puis ouvrez http://localhost:4173"
          : "Impossible de charger data/sequences.json (" + err.message + ").";
      });
    return ready;
  }
  function seedStatus(){ return { count: seed.length, error: seedError }; }

  /* ---------------- helpers ---------------- */
  function norm(s){ return (s||'').toString().toLowerCase().replace(/\s+/g,' ').trim(); }
  function slug(s){
    return (s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'') || 'x';
  }
  function nowISO(){ return new Date().toISOString(); }
  function clone(o){ return JSON.parse(JSON.stringify(o)); }

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

  /* seed + override local fusionnés */
  function resolved(){
    const out = seed.map(function(s){
      const ov = local.overrides[s.id];
      return ov ? Object.assign({}, s, ov) : Object.assign({}, s);
    });
    local.submissions.forEach(function(sub){
      const ov = local.overrides[sub.id];
      out.push(ov ? Object.assign({}, sub, ov) : sub);
    });
    return out;
  }
  function findById(id){ return resolved().filter(function(r){ return r.id===id; })[0] || null; }

  /* ---------------- API site public ---------------- */
  function listPublished(filter){
    let rows = resolved().filter(function(r){ return PUBLISHED.indexOf(r.status)>-1; });
    if(filter && filter.cycle) rows = rows.filter(function(r){ return r.data.cycle===filter.cycle; });
    return rows;
  }

  /* Soumission enseignant. payload = { data, contactEmail?, sourceId? } */
  function submit(payload){
    const data = payload.data || payload;
    const t = nowISO();
    const base = data.cycle+'__'+slug(data.theme)+'__'+slug(data.teacherName);
    let id = base, n = 2;
    while(findById(id)) id = base+'-'+(n++);
    const rec = {
      id: id, status: 'soumis', origin: 'enseignant',
      data: data,
      contactEmail: payload.contactEmail || data.contactEmail || '',
      adminNote: '', rejectReason: '',
      sourceId: payload.sourceId || null,
      createdAt: t, updatedAt: t, publishedAt: null,
      revisions: [{ label: 'Version enseignant', data: clone(data), at: t }]
    };
    local.submissions.push(rec);
    saveLocal();
    return rec;
  }

  /* ---------------- API zone admin ---------------- */
  function listAll(){ return resolved(); }

  function patch(id, changes){
    const t = nowISO();
    const sub = local.submissions.filter(function(s){ return s.id===id; })[0];
    if(sub){ Object.assign(sub, changes, { updatedAt: t }); }
    else { local.overrides[id] = Object.assign({}, local.overrides[id], changes, { updatedAt: t }); }
    saveLocal();
    return findById(id);
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
    local.submissions = local.submissions.filter(function(s){ return s.id!==id; });
    if(local.overrides[id]) delete local.overrides[id];
    // un enregistrement seed ne peut pas être vraiment supprimé : on le masque en 'supprime'
    if(seed.some(function(s){ return s.id===id; })) local.overrides[id] = { status: 'supprime', updatedAt: nowISO() };
    saveLocal();
  }

  /* Doublons : même cycle + même thème. */
  function duplicatesOf(rec){
    return resolved().filter(function(r){
      return r.id!==rec.id
        && r.data.cycle===rec.data.cycle
        && norm(r.data.theme)===norm(rec.data.theme)
        && r.status!=='supprime';
    });
  }

  function stats(){
    const rows = resolved();
    const published = rows.filter(function(r){ return PUBLISHED.indexOf(r.status)>-1; });
    const byCycle = {C1:0,C2:0,C3:0};
    published.forEach(function(r){ if(byCycle[r.data.cycle]!==undefined) byCycle[r.data.cycle]++; });
    const counts = {};
    rows.forEach(function(r){ const b = bucket(r); counts[b] = (counts[b]||0)+1; });
    return { total: rows.length, published: published.length, byCycle: byCycle, buckets: counts };
  }

  /* ---------------- sauvegarde ---------------- */
  function exportAll(){
    return JSON.stringify({ exportedAt: nowISO(), seed: seed, local: local }, null, 1);
  }
  function importLocal(json){
    const o = JSON.parse(json);
    if(o.local && typeof o.local === 'object'){
      local = {
        submissions: Array.isArray(o.local.submissions) ? o.local.submissions : [],
        overrides: (o.local.overrides && typeof o.local.overrides === 'object') ? o.local.overrides : {}
      };
      saveLocal();
    }
  }
  function resetLocal(){ local = { submissions: [], overrides: {} }; saveLocal(); }

  return {
    init: init, seedStatus: seedStatus,
    listPublished: listPublished, submit: submit,
    listAll: listAll, findById: findById, patch: patch, setStatus: setStatus,
    addRevision: addRevision, restoreRevision: restoreRevision,
    duplicate: duplicate, hardDelete: hardDelete, duplicatesOf: duplicatesOf,
    bucket: bucket, BUCKET_LABEL: BUCKET_LABEL, originLabel: originLabel, stats: stats,
    exportAll: exportAll, importLocal: importLocal, resetLocal: resetLocal
  };
})();
