/* ============================================================
   ZONE DE VALIDATION (maquette)

   Fonctionne sur la couche Store (js/store.js). Pour l'instant les données
   « vivantes » sont dans le localStorage du navigateur : c'est une maquette
   pour valider l'ergonomie. Le branchement Supabase ne changera que Store
   et remplacera la porte d'entrée (code) par une vraie authentification.
   ============================================================ */
const admin = {
  MOCK_CODE: 'iep1',
  state: {
    unlocked: false,
    view: 'list',
    filter: 'a_valider',
    search: '',
    cycle: '',
    selectedId: null,
    editing: false,
    editData: null,
    ia: null            // { mode:'prompt'|'paste', text:'', merged:null, error:'' }
  },

  esc(s){ return app.esc(s); },

  boot(){
    try{ this.state.unlocked = sessionStorage.getItem('cds:admin') === '1'; }catch(e){}
    this.render();
    Store.init().then(()=>this.render());
  },

  /* ---------------- porte d'entrée (maquette) ---------------- */
  tryUnlock(){
    const v = (document.getElementById('gate-code')||{}).value || '';
    if(v.trim().toLowerCase() === this.MOCK_CODE){
      this.state.unlocked = true;
      try{ sessionStorage.setItem('cds:admin','1'); }catch(e){}
      this.render();
    } else {
      alert('Code incorrect (maquette : « '+this.MOCK_CODE+' »).');
    }
  },
  lock(){ try{ sessionStorage.removeItem('cds:admin'); }catch(e){} this.state.unlocked=false; this.render(); },

  /* ---------------- navigation ---------------- */
  setFilter(f){ this.state.filter=f; this.state.view='list'; this.state.selectedId=null; this.render(); },
  open(id){ this.state.selectedId=id; this.state.view='detail'; this.state.editing=false; this.state.editData=null; this.state.ia=null; window.scrollTo({top:0}); this.render(); },
  back(){ this.state.view='list'; this.state.selectedId=null; this.state.editing=false; this.state.ia=null; this.render(); },

  current(){ return this.state.selectedId ? Store.findById(this.state.selectedId) : null; },

  /* ---------------- actions ---------------- */
  // Un seul contrôle de statut, identique quelle que soit la séquence.
  STATUS_STEPS: [
    { bucket:'a_valider', status:'soumis',   label:'À valider' },
    { bucket:'en_ligne',  status:'publie',   label:'En ligne'  },
    { bucket:'masquee',   status:'masque',   label:'Masquée'   },
    { bucket:'refusee',   status:'rejete',   label:'Refusée'   },
    { bucket:'corbeille', status:'supprime', label:'Corbeille' }
  ],
  setStatusTo(status){
    const id=this.state.selectedId;
    if(status==='rejete'){
      const why=prompt("Motif du refus (note interne pour l'instant ; sera communiqué à l'enseignant quand les comptes existeront) :", (this.current()||{}).rejectReason||'');
      if(why===null) return;
      Store.setStatus(id,'rejete',{ rejectReason: why });
    } else {
      Store.setStatus(id, status);
    }
    this.render();
  },
  doHardDelete(){ if(confirm("Supprimer définitivement ? (irréversible)")){ Store.hardDelete(this.state.selectedId); this.back(); } },
  doDuplicate(){ const r=Store.duplicate(this.state.selectedId); if(r) this.open(r.id); },
  doPublish(){ Store.setStatus(this.state.selectedId,'publie'); this.render(); },
  saveNote(v){ Store.patch(this.state.selectedId,{ adminNote: v }); },
  saveDisplay(field,v){
    const rec=this.current(); if(!rec) return;
    const data=Object.assign({}, rec.data); data[field]=v;
    Store.patch(this.state.selectedId,{ data });
  },

  /* ---------------- édition en place ---------------- */
  startEdit(){ const r=this.current(); this.state.editData=JSON.parse(JSON.stringify(r.data)); this.state.editing=true; this.render(); },
  cancelEdit(){ this.state.editing=false; this.state.editData=null; this.render(); },
  editField(path,v){
    // path ex: "objectif" ou "seances.0.titre" ou "seances.0.steps.situation.enseignant"
    const parts=path.split('.'); let o=this.state.editData;
    for(let i=0;i<parts.length-1;i++) o=o[parts[i]];
    o[parts[parts.length-1]]=v;
  },
  saveEdit(){
    Store.addRevision(this.state.selectedId, this.state.editData, 'Retouche conseiller');
    this.state.editing=false; this.state.editData=null;
    this.render();
  },

  /* ---------------- historique ---------------- */
  viewRevision(i){
    const rec=this.current(); const rev=rec.revisions[i];
    const w=window.open('','_blank');
    if(!w) return alert('Autorisez les pop-ups.');
    w.document.write('<title>'+this.esc(rev.label)+'</title><body style="font-family:system-ui;padding:24px;max-width:900px;margin:auto;">'+app.entryDetailHTML(rev.data)+'</body>');
    w.document.close();
  },
  restoreRevision(i){ if(confirm('Restaurer cette version ? (une nouvelle révision sera créée)')){ Store.restoreRevision(this.state.selectedId,i); this.render(); } },

  /* ---------------- IA ---------------- */
  iaPrompt(){
    const rec=this.current();
    this.state.ia={ mode:'prompt', text:IaPrompt.build(rec.data), merged:null, error:'' };
    this.render();
  },
  iaPaste(){ this.state.ia={ mode:'paste', text:'', merged:null, error:'' }; this.render(); },
  iaAnalyse(){
    const rec=this.current();
    const raw=(document.getElementById('ia-response')||{}).value||'';
    try{
      const parsed=IaPrompt.parseResponse(raw);
      const merged=IaPrompt.merge(rec.data, parsed);
      this.state.ia={ mode:'paste', text:raw, merged, error:'' };
    }catch(e){
      this.state.ia={ mode:'paste', text:raw, merged:null, error:e.message };
    }
    this.render();
  },
  iaAccept(){
    Store.addRevision(this.state.selectedId, this.state.ia.merged, 'Proposition IA (relue par le conseiller)');
    this.state.ia=null;
    this.render();
  },
  copyText(id){
    const el=document.getElementById(id); if(!el) return;
    el.select(); el.setSelectionRange(0, el.value.length);
    try{ navigator.clipboard.writeText(el.value); }catch(e){ document.execCommand('copy'); }
    alert('Copié.');
  },

  /* ---------------- outils ---------------- */
  resetMock(){ if(confirm("Vider les données locales de la maquette (soumissions, statuts, révisions) ? Les séquences de référence restent intactes.")){ Store.resetLocal(); this.back(); } },
  downloadWord(){ app.downloadDocx(this.current().data); },

  /* ---------------- rendu ---------------- */
  render(){
    const el=document.getElementById('admin');
    if(!this.state.unlocked){ el.innerHTML=this.renderGate(); this.wire(); return; }
    let html=this.renderTop();
    html+= this.state.view==='detail' && this.current() ? this.renderDetail() : this.renderList();
    el.innerHTML=html;
    if(typeof app!=='undefined' && app.autoGrowAll) app.autoGrowAll(el);
    this.wire();
  },

  renderGate(){
    return `<div class="admin-wrap"><div class="admin-gate">
      <span class="eyebrow">Carnet de séquences</span>
      <h1 style="margin:6px 0;">Zone de validation</h1>
      <p style="font-size:13px;color:var(--ink-soft);">Espace réservé au conseiller pédagogique.</p>
      <input type="text" id="gate-code" placeholder="code d'accès" autocomplete="off">
      <button class="btn btn-primary" onclick="admin.tryUnlock()" style="width:100%;">Entrer</button>
      <p class="mock-flag" style="margin-top:14px;">Maquette — accès réel par lien magique une fois Supabase branché</p>
    </div></div>`;
  },

  renderTop(){
    return `<div class="admin-wrap"><div class="admin-top">
      <div><h1>Zone de validation <span class="mock-flag">maquette locale</span></h1>
        <div class="sub">Les changements sont enregistrés dans ce navigateur uniquement.</div></div>
      <div><a class="btn btn-ghost" href="index.html" target="_blank">Voir le site public ↗</a>
        <button class="btn btn-ghost" onclick="admin.lock()">Quitter</button></div>
    </div>`;
  },

  renderList(){
    const all=Store.listAll();
    const counts={};
    all.forEach(r=>{ const b=Store.bucket(r); counts[b]=(counts[b]||0)+1; });

    const bigTab=(b,label)=>`<button class="big-tab ${this.state.filter===b?'active':''}" onclick="admin.setFilter('${b}')">
      <span class="bt-label">${label}</span><span class="bt-count">${counts[b]||0}</span></button>`;
    const smTab=(b,label)=>`<button class="filter-tab ${this.state.filter===b?'active':''}" onclick="admin.setFilter('${b}')">${label}<span class="c">${counts[b]||0}</span></button>`;

    let rows=all.filter(r=> this.state.filter==='all' ? true : Store.bucket(r)===this.state.filter);
    if(this.state.cycle) rows=rows.filter(r=>r.data.cycle===this.state.cycle);
    const q=this.state.search.trim().toLowerCase();
    if(q) rows=rows.filter(r=> (r.data.theme+' '+r.data.teacherName+' '+(r.data.objectif||'')).toLowerCase().includes(q));
    rows.sort((a,b)=> (b.updatedAt||b.createdAt||'').localeCompare(a.updatedAt||a.createdAt||''));

    return `${this.renderDash()}
    <div class="big-tabs">
      ${bigTab('a_valider','⏳ En attente de validation')}
      ${bigTab('en_ligne','✅ Publiées / existant')}
    </div>
    <div class="filters">
      ${smTab('masquee','Masquées')} ${smTab('refusee','Refusées')} ${smTab('corbeille','Corbeille')}
      <button class="filter-tab ${this.state.filter==='all'?'active':''}" onclick="admin.setFilter('all')">Toutes<span class="c">${all.length}</span></button>
    </div>
    <div style="display:flex;gap:8px;margin:12px 0;flex-wrap:wrap;">
      <input type="text" placeholder="Rechercher (thème, pseudo, objectif)…" value="${this.esc(this.state.search)}"
        oninput="admin.state.search=this.value; admin.render()" style="flex:1;min-width:200px;">
      <select onchange="admin.state.cycle=this.value; admin.render()">
        <option value="">Tous les cycles</option>
        ${['C1','C2','C3'].map(c=>`<option value="${c}" ${this.state.cycle===c?'selected':''}>${CYCLE_LABEL[c]}</option>`).join('')}
      </select>
    </div>
    <div class="seq-list">
      ${rows.length ? rows.map(r=>this.rowHTML(r)).join('') : '<div class="empty">Aucune séquence dans cette vue.</div>'}
    </div>
    <div class="admin-tools">
      <button class="btn btn-ghost" style="font-size:12px;padding:6px 12px;" onclick="admin.resetMock()">♻️ Réinitialiser la maquette (données locales)</button>
    </div></div>`;
  },

  rowHTML(r){
    const b=Store.bucket(r);
    const dups=Store.duplicatesOf(r);
    const d=r.updatedAt||r.createdAt;
    let quick='';
    if(b==='en_ligne') quick=`<button class="row-act" onclick="event.stopPropagation();admin.quickHide('${r.id}')">Masquer</button>`;
    else if(b==='masquee') quick=`<button class="row-act primary" onclick="event.stopPropagation();admin.quickPublish('${r.id}')">Publier</button>`;
    else if(b==='a_valider') quick=`<button class="row-act primary" onclick="event.stopPropagation();admin.quickPublish('${r.id}')">Publier</button>`;
    return `<div class="seq-row ${this.state.selectedId===r.id?'sel':''}" role="button" tabindex="0"
        onclick="admin.open('${r.id}')" onkeydown="if(event.key==='Enter')admin.open('${r.id}')">
      <div class="l1"><span class="theme">${this.esc(r.data.theme)}</span>
        <span style="display:flex;gap:6px;align-items:center;"><span class="pill ${b}">${Store.BUCKET_LABEL[b]}</span>${quick}</span></div>
      <div class="l2">
        <span>${CYCLE_LABEL[r.data.cycle]||r.data.cycle}</span>
        <span>· ${this.esc(r.data.teacherName||'—')}</span>
        <span>· ${Store.originLabel(r)}</span>
        ${d?`<span>· ${new Date(d).toLocaleDateString('fr-FR')}</span>`:''}
        ${dups.length?`<span class="dup-flag">⚠ doublon possible (${dups.length})</span>`:''}
        ${r.sourceId?`<span class="dup-flag" style="background:var(--sky-soft);color:var(--sky);">modification proposée</span>`:''}
      </div>
    </div>`;
  },
  quickPublish(id){ Store.setStatus(id,'publie'); this.render(); },
  quickHide(id){ Store.setStatus(id,'masque'); this.render(); },

  renderDash(){
    const st=Store.stats();
    const missing=this.missingThemes();
    return `<div class="dash">
      <div class="card"><b>${st.buckets.a_valider||0}</b> en attente</div>
      <div class="card"><b>${st.published}</b> publiées</div>
      <div class="card"><b>${st.byCycle.C1} / ${st.byCycle.C2} / ${st.byCycle.C3}</b> C1 / C2 / C3</div>
      <div class="card" style="max-width:440px;"><b>${missing.length}</b> thème(s) sans séquence publiée
        ${missing.length?`<div style="font-size:11.5px;color:var(--ink-soft);margin-top:4px;">${missing.slice(0,6).map(m=>this.esc(m)).join(' · ')}${missing.length>6?'…':''}</div>`:''}</div>
    </div>`;
  },
  missingThemes(){
    const pub=Store.listPublished();
    const have=new Set(pub.map(r=>r.data.cycle+'|'+r.data.theme));
    const out=[];
    ['C1','C2','C3'].forEach(c=>(THEMES[c]||[]).forEach(t=>{ if(!have.has(c+'|'+t.t)) out.push(c+' — '+t.t); }));
    return out;
  },

  /* -------- détail -------- */
  renderDetail(){
    const r=this.current();
    const b=Store.bucket(r);
    const src=r.sourceId?Store.findById(r.sourceId):null;
    const dups=Store.duplicatesOf(r);

    const statusCtl=`<div class="status-ctl">
      ${this.STATUS_STEPS.map(s=>`<button class="status-opt ${b===s.bucket?'on '+s.bucket:''}" onclick="admin.setStatusTo('${s.status}')">${s.label}</button>`).join('')}
      ${b==='corbeille'?`<button class="status-opt danger" onclick="admin.doHardDelete()">Supprimer définitivement</button>`:''}
    </div>`;

    const secondary=`<div class="detail-actions">
      ${this.state.editing
        ? `<button class="btn btn-primary" onclick="admin.saveEdit()">💾 Enregistrer les retouches</button>
           <button class="btn btn-ghost" onclick="admin.cancelEdit()">Annuler</button>`
        : `<button class="btn btn-ghost" onclick="admin.startEdit()">✏️ Modifier le contenu</button>`}
      <button class="btn btn-ghost" onclick="admin.doDuplicate()">⧉ Dupliquer</button>
      <button class="btn btn-ghost" onclick="admin.downloadWord()">📝 Word</button>
    </div>`;

    const chips=`<div class="detail-chips">
      <span class="chip">${Store.originLabel(r)}</span>
      ${r.publishedAt?`<span class="chip">Publiée le ${new Date(r.publishedAt).toLocaleDateString('fr-FR')}</span>`:''}
      <span class="chip">Modifiée ${r.updatedAt?new Date(r.updatedAt).toLocaleDateString('fr-FR'):'—'}</span>
    </div>`;

    const identity=`<div class="admin-block"><h3>Attribution</h3>
      <div class="id-row">
        <label>Pseudonyme affiché<input type="text" value="${this.esc(r.data.teacherName||'')}" onchange="admin.saveDisplay('teacherName',this.value)"></label>
        <label>Contact (privé, jamais affiché)<input type="text" value="${this.esc(r.contactEmail||r.data.contactEmail||'')}" onchange="admin.saveDisplay('contactEmail',this.value)" placeholder="—"></label>
      </div>
      ${r.rejectReason?`<p class="reject-note">Motif de refus : ${this.esc(r.rejectReason)}</p>`:''}
    </div>`;

    const dupBlock=dups.length?`<div class="admin-block warn"><h3>⚠ Doublons possibles — même cycle et même thème</h3>
      <ul class="rev-list">${dups.map(d=>`<li><span>${this.esc(d.data.theme)} — ${this.esc(d.data.teacherName)} <span class="pill ${Store.bucket(d)}">${Store.BUCKET_LABEL[Store.bucket(d)]}</span></span><button class="link-btn" onclick="admin.open('${d.id}')">Ouvrir →</button></li>`).join('')}</ul></div>`:'';

    const diffBlock=src?`<div class="admin-block"><h3>Modification proposée — écart avec « ${this.esc(src.data.teacherName)} »</h3>
      ${this.diffTable(app.diffSequences(src.data, r.data))}
      <p style="font-size:12.5px;color:var(--ink-soft);margin-top:8px;">Pour <b>remplacer</b> : passez cette séquence « En ligne » et masquez l'originale.
      Pour <b>garder les deux</b> : passez celle-ci « En ligne » sans toucher à l'originale.</p></div>`:'';

    return `<div class="admin-wrap-inner"><div class="detail">
      <button class="link-btn" onclick="admin.back()">← Retour à la liste</button>
      <h2>${this.esc(r.data.theme)}</h2>
      <p class="detail-sub">${CYCLE_LABEL[r.data.cycle]} · ${this.esc(r.data.niveauClasse||'niveau non précisé')}</p>
      ${chips}

      <div class="admin-block"><h3>Statut sur le site</h3>${statusCtl}</div>
      ${secondary}

      ${identity}
      <div class="admin-block"><h3>Note interne</h3>
        <textarea placeholder="Visible seulement ici, jamais publiée" onchange="admin.saveNote(this.value)">${this.esc(r.adminNote||'')}</textarea></div>
      ${dupBlock}
      ${diffBlock}
      ${this.state.editing ? this.renderEditor() : `<div class="admin-block"><h3>Aperçu de la séquence</h3>${app.entryDetailHTML(r.data)}</div>`}
      ${this.renderIa(r)}
      ${this.renderHistory(r)}
    </div></div></div>`;
  },

  diffTable(diffs){
    if(!diffs.length) return '<p style="font-size:13px;">Aucune différence.</p>';
    return `<table class="diff-table"><tr><th>Champ</th><th>Avant</th><th>Après</th></tr>
      ${diffs.map(d=>`<tr><td><b>${this.esc(d.label)}</b></td><td class="before">${this.esc(d.before)}</td><td class="after">${this.esc(d.after)}</td></tr>`).join('')}</table>`;
  },

  renderHistory(r){
    const revs=r.revisions||[];
    if(!revs.length) return '';
    return `<div class="admin-block"><h3>Historique des versions (${revs.length})</h3>
      <ul class="rev-list">
        ${revs.slice().reverse().map((rev,ri)=>{ const i=revs.length-1-ri; return `<li>
          <span>${this.esc(rev.label)} — <span style="color:var(--ink-soft)">${new Date(rev.at).toLocaleString('fr-FR')}</span></span>
          <span><button class="btn btn-ghost" style="padding:3px 9px;font-size:12px;" onclick="admin.viewRevision(${i})">Voir</button>
          <button class="btn btn-ghost" style="padding:3px 9px;font-size:12px;" onclick="admin.restoreRevision(${i})">Restaurer</button></span>
        </li>`; }).join('')}
      </ul></div>`;
  },

  renderIa(r){
    const ia=this.state.ia;
    let inner=`<div style="display:flex;gap:8px;flex-wrap:wrap;">
      <button class="btn btn-ghost" onclick="admin.iaPrompt()">🧩 Préparer une demande d'IA</button>
      <button class="btn btn-ghost" onclick="admin.iaPaste()">📥 Coller la réponse de l'IA</button>
    </div>`;
    if(ia && ia.mode==='prompt'){
      inner+=`<p style="font-size:12.5px;color:var(--ink-soft);margin:10px 0 4px;">Copiez ce texte, collez-le dans une IA (ChatGPT, Claude, Le Chat…), puis revenez coller sa réponse.</p>
      <textarea id="ia-prompt-text" class="ia-text" readonly>${this.esc(ia.text)}</textarea>
      <div style="margin-top:6px;"><button class="btn btn-primary" onclick="admin.copyText('ia-prompt-text')">📋 Copier le prompt</button>
      <button class="btn btn-ghost" onclick="admin.iaPaste()">Puis coller la réponse →</button></div>`;
    }
    if(ia && ia.mode==='paste'){
      inner+=`<p style="font-size:12.5px;color:var(--ink-soft);margin:10px 0 4px;">Collez ici la réponse complète de l'IA (le bloc JSON suffit) :</p>
      <textarea id="ia-response" class="ia-text" placeholder='{ "objectif": "...", "seances": [ ... ] }'>${this.esc(ia.text||'')}</textarea>
      <div style="margin-top:6px;"><button class="btn btn-primary" onclick="admin.iaAnalyse()">Analyser la réponse</button></div>
      ${ia.error?`<p style="color:var(--danger);font-size:13px;margin-top:8px;">⚠ ${this.esc(ia.error)}</p>`:''}
      ${ia.merged?`<div style="margin-top:12px;"><h4 style="margin:0 0 6px;">Ce que la proposition changerait :</h4>
        ${this.diffTable(app.diffSequences(r.data, ia.merged))}
        <div style="margin-top:8px;"><button class="btn btn-primary" onclick="admin.iaAccept()">✅ Appliquer comme nouvelle version</button>
        <button class="btn btn-ghost" onclick="admin.state.ia=null; admin.render()">Abandonner</button></div></div>`:''}`;
    }
    return `<div class="admin-block"><h3>Renfort par IA (aller-retour manuel)</h3>${inner}</div>`;
  },

  /* -------- éditeur de contenu -------- */
  renderEditor(){
    const d=this.state.editData;
    const F=(label,path,ml)=>`<div class="field"><label>${label}</label>${ml
      ? `<textarea oninput="admin.editField('${path}',this.value)">${this.esc(this.getPath(path))}</textarea>`
      : `<input type="text" value="${this.esc(this.getPath(path))}" oninput="admin.editField('${path}',this.value)">`}</div>`;
    const seances=(d.seances||[]).map((s,i)=>`
      <div class="edit-seance">
        <h4>Séance ${i+1}</h4>
        ${F('Titre','seances.'+i+'.titre')}
        ${F('Objectif opérationnel','seances.'+i+'.objectifOp')}
        ${STEPS.map(([k,lbl])=>`
          <div class="edit-step"><div class="lbl">${lbl}</div>
            <div class="mini-grid">
              ${F("Rôle enseignant",'seances.'+i+'.steps.'+k+'.enseignant',true)}
              ${F("Rôle élève",'seances.'+i+'.steps.'+k+'.eleve',true)}
              ${F("Consignes",'seances.'+i+'.steps.'+k+'.consigne',true)}
              ${F("Matériel",'seances.'+i+'.steps.'+k+'.materiel')}
            </div>
            <div class="field" style="margin-top:6px;"><label>Modalité</label>
              <select onchange="admin.editField('seances.${i}.steps.${k}.modalite',this.value)">
                <option value="">—</option>
                ${MODALITES.map(m=>`<option value="${m}" ${((s.steps[k]||{}).modalite===m)?'selected':''}>${m}</option>`).join('')}
              </select></div>
          </div>`).join('')}
        ${F('Bilan / trace écrite','seances.'+i+'.bilan',true)}
        ${F('Différenciation','seances.'+i+'.differenciation',true)}
      </div>`).join('');
    return `<div class="admin-block edit-form"><h3>Retouche du contenu</h3>
      <div style="max-width:280px;">${F('Niveau / classe','niveauClasse')}</div>
      ${F('Attendu de fin de cycle','attendu',true)}
      ${F('Objectif général','objectif',true)}
      <div class="mini-grid">${F('Vocabulaire','vocabulaire',true)}${F('Prérequis','prerequis',true)}</div>
      <div class="mini-grid">${F('Matériel (séquence)','materiel',true)}${F('Évaluation','evaluation',true)}</div>
      ${seances}
      <button class="btn btn-primary" onclick="admin.saveEdit()">💾 Enregistrer les retouches</button>
      <button class="btn btn-ghost" onclick="admin.cancelEdit()">Annuler</button>
    </div>`;
  },
  getPath(path){
    const parts=path.split('.'); let o=this.state.editData;
    for(const p of parts){ if(o==null) return ''; o=o[p]; }
    return o==null?'':o;
  },

  wire(){
    const gate=document.getElementById('gate-code');
    if(gate) gate.addEventListener('keydown',e=>{ if(e.key==='Enter') admin.tryUnlock(); });
  }
};

if(document.getElementById('admin')) admin.boot();
