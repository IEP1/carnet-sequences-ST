const app = {
  state:{ view:'home', cycle:'C1', theme:null, form:null, hasDownloaded:false, pendingDraft:null },

  /* Normalisation tolérante pour comparer des libellés d'attendus
     (apostrophes typographiques, espaces multiples, casse). */
  normTxt(s){
    return (s===undefined||s===null?'':String(s))
      .toLowerCase().replace(/[’‘‛`´]/g,"'").replace(/\s+/g,' ').trim();
  },

  blankSeance(){
    const steps={}; STEPS.forEach(([k])=>{ steps[k]={enseignant:'',eleve:'',consigne:'',materiel:'',modalite:''}; });
    return {titre:'', objectifOp:'', differenciation:'', steps, collapsedSteps:{}, endedEarly:false, resumeAt:null, rappel:'', bilan:''};
  },
  findProgrammeMatch(cycle, attenduText){
    const target=this.normTxt(attenduText);
    const comps=PROGRAMMES_DATA[cycle]||[];
    for(const comp of comps){
      const idx=comp.attendus.findIndex(a=>this.normTxt(a)===target);
      if(idx>-1) return {comp, attenduIdx:idx};
    }
    return null;
  },
  blankForm(theme, cycle){
    const match=this.findProgrammeMatch(cycle, theme.obj);
    return {
      cycle, theme: theme.t,
      teacherName: Pseudonym.current(), contactEmail:'', school:'', niveauClasse:'', nbEleves:'',
      domaineSocle: match ? [...match.comp.domainesSocle] : [], domaineEnseignement:DOMAINE_ENSEIGNEMENT_PAR_CYCLE[cycle]||'Sciences et technologie', composante: match ? match.comp.nom : '',
      attendu: theme.obj, objectif:'', vocabulaire:'', prerequis:'', materiel:'', evaluation:'',
      nbSeances:3, seanceTitles:['','',''], currentSeanceIndex:0,
      seances:[this.blankSeance(),this.blankSeance(),this.blankSeance()]
    };
  },
  updateProgDomaine(compNom){
    const f=this.state.form;
    f.composante=compNom;
    const comp=(PROGRAMMES_DATA[f.cycle]||[]).find(c=>c.nom===compNom);
    if(comp){
      f.domaineSocle=[...comp.domainesSocle];
      // On conserve l'attendu déjà saisi s'il appartient à la composante choisie.
      const stillValid=comp.attendus.some(a=>this.normTxt(a)===this.normTxt(f.attendu));
      if(!stillValid) f.attendu='';
    }
    else { f.domaineSocle=[]; f.attendu=''; }
    this.markDirty();
    this.render();
  },
  updateProgAttendu(attenduText){
    const f=this.state.form;
    f.attendu=attenduText;
    const found=(PROGRAMMES_DATA[f.cycle]||[]).find(c=>c.attendus.some(a=>this.normTxt(a)===this.normTxt(attenduText)));
    if(found){ f.composante=found.nom; f.domaineSocle=[...found.domainesSocle]; }
    this.markDirty();
    this.render();
  },

  setView(v){ this.state.view=v; this.writeDraftNow(); window.scrollTo({top:0,behavior:'smooth'}); this.render(); },
  chooseCycle(c){ this.state.cycle=c; this.render(); },

  /* ---------- brouillon local (localStorage) — voir js/storage.js ---------- */
  persistDraft(){
    clearTimeout(this._draftTimer);
    this._draftTimer=setTimeout(()=>this.writeDraftNow(), 700);
  },
  writeDraftNow(){
    clearTimeout(this._draftTimer);
    const s=this.state;
    if(!s.form) return;
    Draft.save({
      view:s.view, cycle:s.cycle, theme:s.theme, form:s.form,
      isModification:s.isModification||false,
      originalSnapshot:s.originalSnapshot||null,
      modificationSource:s.modificationSource||null
    });
  },
  resumeDraft(){
    const d=Draft.load(); if(!d) return;
    const p=d.payload;
    this.state.form=p.form;
    this.state.cycle=p.cycle||p.form.cycle||'C1';
    this.state.isModification=p.isModification||false;
    this.state.originalSnapshot=p.originalSnapshot||null;
    this.state.modificationSource=p.modificationSource||null;
    const cyc=p.form.cycle;
    const idx=(THEMES[cyc]||[]).findIndex(t=>t.t===p.form.theme);
    this.state.theme=p.theme||(idx>-1?THEMES[cyc][idx]:{t:p.form.theme, obj:p.form.attendu||'', cat:'', ex:''});
    if(typeof this.state.form.currentSeanceIndex!=='number') this.state.form.currentSeanceIndex=0;
    this.state.pendingDraft=null;
    this.state.hasDownloaded=false;
    this.setView(p.view && p.view!=='home' ? p.view : 'sequence');
  },
  discardDraft(){ Draft.clear(); this.state.pendingDraft=null; this.render(); },
  relTime(ts){
    if(!ts) return '';
    const m=Math.round((Date.now()-ts)/60000);
    if(m<1) return "à l'instant";
    if(m<60) return "il y a "+m+" min";
    const h=Math.round(m/60);
    if(h<24) return "il y a "+h+" h";
    const j=Math.round(h/24);
    return "il y a "+j+" j";
  },

  chooseTheme(cycle, idx){
    const theme=THEMES[cycle][idx];
    this.state.theme=theme;
    this.state.form=this.blankForm(theme, cycle);
    this.state.hasDownloaded=false;
    this.state.isModification=false;
    this.state.originalSnapshot=null;
    this.state.modificationSource=null;
    this.setView('sequence');
  },

  findExistingForTheme(cycle, themeName){
    const out={existante:[], assistee:[], ia:[]};
    EXISTING_SEQUENCES.forEach((entry,i)=>{
      if(entry.data.cycle===cycle && entry.data.theme===themeName) out[entry.status].push(i);
    });
    return out;
  },
  viewExisting(index){
    this.state.viewingExisting=index;
    this.setView('presentation');
  },
  proposeModification(index){
    const entry=EXISTING_SEQUENCES[index];
    const clone=JSON.parse(JSON.stringify(entry.data));
    const original=JSON.parse(JSON.stringify(entry.data));
    clone.currentSeanceIndex=0;
    // Celui qui propose une modification signe de SON pseudonyme ;
    // l'auteur d'origine est conservé dans modificationSource / le diff.
    clone.teacherName=Pseudonym.current();
    clone.contactEmail='';
    this.state.form=clone;
    this.state.pseudoOptions=null;
    this.state.originalSnapshot=original;
    this.state.isModification=true;
    this.state.modificationSource={teacherName: entry.status==='ia' ? "la séquence modèle IA" : entry.data.teacherName, status:entry.status};
    this.state.cycle=entry.data.cycle;
    const idx=(THEMES[entry.data.cycle]||[]).findIndex(t=>t.t===entry.data.theme);
    this.state.theme = idx>-1 ? THEMES[entry.data.cycle][idx] : {t:entry.data.theme, obj:entry.data.attendu, cat:'', ex:''};
    this.state.hasDownloaded=false;
    this.setView('sequence');
  },
  computeDiff(){
    const o=this.state.originalSnapshot, f=this.state.form;
    if(!o || !f) return [];
    const diffs=[];
    const fieldLabels={teacherName:"Pseudonyme", school:"École", niveauClasse:"Niveau / Classe", nbEleves:"Nb élèves", attendu:"Attendu", objectif:"Objectif général", vocabulaire:"Vocabulaire", prerequis:"Prérequis", materiel:"Matériel (séquence)", evaluation:"Évaluation", nbSeances:"Nombre de séances"};
    Object.keys(fieldLabels).forEach(k=>{
      const before=o[k]===undefined?'':String(o[k]), after=f[k]===undefined?'':String(f[k]);
      if(before!==after) diffs.push({label:fieldLabels[k], before, after});
    });
    const socleBefore=(o.domaineSocle||[]).join(', '), socleAfter=(f.domaineSocle||[]).join(', ');
    if(socleBefore!==socleAfter) diffs.push({label:"Domaines du socle", before:socleBefore, after:socleAfter});

    const stepLabels={enseignant:"Rôle enseignant", eleve:"Rôle élève", consigne:"Consignes", materiel:"Matériel", modalite:"Modalité"};
    (f.seances||[]).forEach((s,i)=>{
      const os=(o.seances||[])[i];
      if(!os){ diffs.push({label:`Séance ${i+1}`, before:'(nouvelle séance)', after:s.titre||'(sans titre)'}); return; }
      if((os.titre||'')!==(s.titre||'')) diffs.push({label:`Séance ${i+1} — Titre`, before:os.titre||'—', after:s.titre||'—'});
      if((os.objectifOp||'')!==(s.objectifOp||'')) diffs.push({label:`Séance ${i+1} — Objectif opérationnel`, before:os.objectifOp||'—', after:s.objectifOp||'—'});
      if((os.bilan||'')!==(s.bilan||'')) diffs.push({label:`Séance ${i+1} — Bilan`, before:os.bilan||'—', after:s.bilan||'—'});
      if((os.differenciation||'')!==(s.differenciation||'')) diffs.push({label:`Séance ${i+1} — Différenciation`, before:os.differenciation||'—', after:s.differenciation||'—'});
      STEPS.forEach(([key,label])=>{
        const ost=(os.steps||{})[key]||{}, st=s.steps[key]||{};
        Object.keys(stepLabels).forEach(sk=>{
          const before=ost[sk]||'', after=st[sk]||'';
          if(before!==after) diffs.push({label:`Séance ${i+1} — ${label} — ${stepLabels[sk]}`, before:before||'—', after:after||'—'});
        });
      });
    });
    return diffs;
  },

  triggerImport(){ document.getElementById('import-input').click(); },
  handleImportFile(file){
    if(!file) return;
    const name=(file.name||'').toLowerCase();
    const isZip = name.endsWith('.zip') || file.type==='application/zip' || file.type==='application/x-zip-compressed';
    if(isZip){
      const r=new FileReader();
      r.onload=(evt)=>{
        try{
          const files=unzipStored(new Uint8Array(evt.target.result));
          const jsonFile=files.find(f=>f.name.toLowerCase().endsWith('.json'));
          if(!jsonFile) throw new Error("aucun fichier .json dans l'archive");
          this.loadSequenceObject(JSON.parse(new TextDecoder().decode(jsonFile.data)));
        }catch(e){ alert("Impossible de lire cette archive : "+e.message); }
      };
      r.readAsArrayBuffer(file);
      return;
    }
    const reader=new FileReader();
    reader.onload=(evt)=>{
      try{ this.loadSequenceObject(JSON.parse(evt.target.result)); }
      catch(e){ alert("Impossible de lire ce fichier : "+e.message); }
    };
    reader.readAsText(file);
  },
  loadSequenceObject(data){
    if(!data || !data.cycle || !data.theme || !data.seances){ alert("Ce fichier ne ressemble pas à une séquence valide."); return; }
    const idx=THEMES[data.cycle] ? THEMES[data.cycle].findIndex(t=>t.t===data.theme) : -1;
    this.state.theme = idx>-1 ? THEMES[data.cycle][idx] : {t:data.theme, obj:data.attendu||'', cat:'', ex:''};
    this.state.cycle = data.cycle;
    this.state.form = data;
    this.state.isModification = false;
    this.state.originalSnapshot = null;
    this.state.modificationSource = data._modificationInfo
      ? {teacherName: data._modificationInfo.sequenceOriginale, status: data._modificationInfo.statutOriginal}
      : null;
    this.state.hasDownloaded=false;
    this.state.pendingDraft=null;
    if(typeof this.state.form.currentSeanceIndex !== 'number') this.state.form.currentSeanceIndex=0;
    this.setView('sequence');
  },

  markDirty(){ this.state.hasDownloaded=false; this.persistDraft(); },
  updateForm(field, value){ this.state.form[field]=value; this.markDirty(); },

  /* ---------- pseudonyme (voir js/pseudonym.js) ---------- */
  setPseudo(val){
    val=(val||'').trim();
    this.state.form.teacherName=val;
    Pseudonym.remember(val);
    this.markDirty();
  },
  rerollPseudo(){
    const val=Pseudonym.generate();
    this.state.form.teacherName=val;
    Pseudonym.remember(val);
    this.markDirty();
    this.render();
  },
  choosePseudo(val){ this.setPseudo(val); this.render(); },
  toggleSocle(code){
    const f=this.state.form; const i=f.domaineSocle.indexOf(code);
    if(i>-1) f.domaineSocle.splice(i,1); else f.domaineSocle.push(code);
    this.markDirty();
  },
  updateNbSeances(n){
    n=Math.max(1, Math.min(10, parseInt(n)||1));
    const f=this.state.form;
    f.nbSeances=n;
    while(f.seanceTitles.length<n){ f.seanceTitles.push(''); f.seances.push(this.blankSeance()); }
    while(f.seanceTitles.length>n){ f.seanceTitles.pop(); f.seances.pop(); }
    this.markDirty();
    this.render();
  },
  updateSeanceTitle(i,val){ this.state.form.seanceTitles[i]=val; this.state.form.seances[i].titre=val; this.markDirty(); },

  goToSeances(){
    const f=this.state.form;
    if(!f.teacherName.trim()){ alert("Merci de choisir un pseudonyme (bouton « Un autre » ou saisie libre) avant de continuer."); return; }
    f.seances.forEach((s,i)=>{ s.titre=f.seanceTitles[i]; });
    f.currentSeanceIndex=0;
    this.setView('seances');
  },
  backFromSeances(){
    const i=this.state.form.currentSeanceIndex||0;
    if(i>0) this.goToSeanceIndex(i-1); else this.setView('sequence');
  },
  goToSeanceIndex(idx){ this.state.form.currentSeanceIndex=idx; this.setView('seances'); },
  updateSeanceField(i,field,val){ this.state.form.seances[i][field]=val; this.markDirty(); },
  updateSeanceStepField(i,stepKey,subKey,val){ this.state.form.seances[i].steps[stepKey][subKey]=val; this.markDirty(); },
  toggleStepCollapse(i, stepKey){
    const seance=this.state.form.seances[i];
    if(!seance.collapsedSteps) seance.collapsedSteps={};
    seance.collapsedSteps[stepKey]=!seance.collapsedSteps[stepKey];
    this.render();
  },
  toggleEndedEarly(i, checked){
    const s=this.state.form.seances[i];
    s.endedEarly=checked;
    if(checked && !s.resumeAt) s.resumeAt=this.autoDetectResume(s);
    this.markDirty();
    this.render();
  },
  autoDetectResume(seance){
    for(let idx=1; idx<STEPS.length; idx++){
      const st=seance.steps[STEPS[idx][0]];
      if(!st.enseignant && !st.eleve && !st.consigne) return idx+1;
    }
    return 7;
  },
  computeResumeStart(i){
    if(i===0) return 1;
    const prev=this.state.form.seances[i-1];
    if(prev.endedEarly && prev.resumeAt) return prev.resumeAt;
    return 1;
  },
  finishSeance(i){
    const f=this.state.form;
    if(i < f.seances.length-1){ this.goToSeanceIndex(i+1); }
    else { this.setView('review'); }
  },

  restart(){ Draft.clear(); this.state.view='home'; this.state.theme=null; this.state.form=null; this.state.hasDownloaded=false; this.state.isModification=false; this.state.originalSnapshot=null; this.state.modificationSource=null; this.state.viewingExisting=null; this.state.pendingDraft=null; this.state.pseudoOptions=null; this.setView('home'); },

  slugify(s){
    return (s||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'') || 'sequence';
  },

  /* ---------- fichier .zip (JSON + version imprimable) ---------- */
  /* ---------- génération d'un vrai fichier Word (.docx) pour l'enseignant ---------- */
  docxEsc(s){
    return (s===undefined||s===null?'':String(s))
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
  },
  docxRun(text, opts){
    opts=opts||{};
    const props=[];
    if(opts.bold) props.push('<w:b/>');
    if(opts.italic) props.push('<w:i/>');
    if(opts.color) props.push('<w:color w:val="'+opts.color+'"/>');
    if(opts.size) props.push('<w:sz w:val="'+(opts.size*2)+'"/>');
    const rPr=props.length?'<w:rPr>'+props.join('')+'</w:rPr>':'';
    const lines=String(text||'').split('\n');
    const t=lines.map((l,i)=>(i>0?'<w:br/>':'')+'<w:t xml:space="preserve">'+this.docxEsc(l)+'</w:t>').join('');
    return '<w:r>'+rPr+t+'</w:r>';
  },
  docxPara(text, opts){
    opts=opts||{};
    const pProps=[];
    if(opts.style) pProps.push('<w:pStyle w:val="'+opts.style+'"/>');
    pProps.push('<w:spacing w:after="'+(opts.spacingAfter!==undefined?opts.spacingAfter:120)+'"/>');
    const pPr='<w:pPr>'+pProps.join('')+'</w:pPr>';
    return '<w:p>'+pPr+this.docxRun(text, opts)+'</w:p>';
  },
  docxParaLabelValue(label, value, opts){
    opts=opts||{};
    const pProps=['<w:spacing w:after="'+(opts.spacingAfter!==undefined?opts.spacingAfter:80)+'"/>'];
    const pPr='<w:pPr>'+pProps.join('')+'</w:pPr>';
    const labelRun=this.docxRun(label+' : ', {bold:true, color: opts.labelColor||'2F5233'});
    const valueRun=this.docxRun(value, {});
    return '<w:p>'+pPr+labelRun+valueRun+'</w:p>';
  },
  docxCell(text, opts){
    opts=opts||{};
    const shade=opts.shade?'<w:shd w:val="clear" w:color="auto" w:fill="'+opts.shade+'"/>':'';
    return '<w:tc><w:tcPr><w:tcW w:w="'+(opts.width||2000)+'" w:type="dxa"/>'+shade+'</w:tcPr>'+this.docxPara(text,{bold:opts.bold,spacingAfter:0})+'</w:tc>';
  },
  docxTable(rowsCells){
    const rows=rowsCells.map(cells=>'<w:tr>'+cells.join('')+'</w:tr>').join('');
    return '<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="0" w:type="auto"/><w:tblBorders>'
      +'<w:top w:val="single" w:sz="4" w:color="D6D0B5"/><w:left w:val="single" w:sz="4" w:color="D6D0B5"/>'
      +'<w:bottom w:val="single" w:sz="4" w:color="D6D0B5"/><w:right w:val="single" w:sz="4" w:color="D6D0B5"/>'
      +'<w:insideH w:val="single" w:sz="4" w:color="D6D0B5"/><w:insideV w:val="single" w:sz="4" w:color="D6D0B5"/>'
      +'</w:tblBorders></w:tblPr>'+rows+'</w:tbl>';
  },
  buildDocxXml(e){
    let body='';
    body+=this.docxPara(e.theme, {style:'Titre', size:26, bold:true, spacingAfter:40});
    body+=this.docxPara(CYCLE_LABEL[e.cycle]||e.cycle, {italic:true, color:'5C7A80', spacingAfter:200});

    body+=this.docxTable([
      [this.docxCell("Enseignant·e",{bold:true,width:2450,shade:'EFEBD8'}), this.docxCell(e.teacherName,{width:2916}), this.docxCell("École",{bold:true,width:1800,shade:'EFEBD8'}), this.docxCell(e.school,{width:3300})],
      [this.docxCell("Niveau / Classe",{bold:true,width:2450,shade:'EFEBD8'}), this.docxCell(e.niveauClasse,{width:2916}), this.docxCell("Nb élèves",{bold:true,width:1800,shade:'EFEBD8'}), this.docxCell(e.nbEleves,{width:3300})],
      [this.docxCell("Domaines du socle",{bold:true,width:2450,shade:'EFEBD8'}), this.docxCell((e.domaineSocle||[]).join(', ')||'—',{width:8016})],
      [this.docxCell("Domaine d'enseignement",{bold:true,width:2450,shade:'EFEBD8'}), this.docxCell(e.domaineEnseignement,{width:2916}), this.docxCell("Composante",{bold:true,width:1800,shade:'EFEBD8'}), this.docxCell(e.composante,{width:3300})],
    ]);
    body+=this.docxPara('', {spacingAfter:100});
    body+=this.docxTable([
      [this.docxCell("Attendu de fin de cycle",{bold:true,width:2800,shade:'EFEBD8'}), this.docxCell(e.attendu,{width:7666})],
      [this.docxCell("Objectif général",{bold:true,width:2800,shade:'EFEBD8'}), this.docxCell(e.objectif||'—',{width:7666})],
      [this.docxCell("Vocabulaire spécifique",{bold:true,width:2800,shade:'EFEBD8'}), this.docxCell(e.vocabulaire||'—',{width:7666})],
      [this.docxCell("Prérequis",{bold:true,width:2800,shade:'EFEBD8'}), this.docxCell(e.prerequis||'—',{width:7666})],
      [this.docxCell("Matériel",{bold:true,width:2800,shade:'EFEBD8'}), this.docxCell(e.materiel||'—',{width:7666})],
      [this.docxCell("Évaluation / Critères",{bold:true,width:2800,shade:'EFEBD8'}), this.docxCell(e.evaluation||'—',{width:7666})],
    ]);
    body+=this.docxPara('', {spacingAfter:100});

    if((e.seances||[]).length){
      const recapRows=[[this.docxCell("N°",{bold:true,width:800,shade:'EFEBD8'}), this.docxCell("Titre de la séance",{bold:true,width:3700,shade:'EFEBD8'}), this.docxCell("Objectif opérationnel",{bold:true,width:5966,shade:'EFEBD8'})]];
      e.seances.forEach((s,i)=>{ recapRows.push([this.docxCell(String(i+1),{width:800}), this.docxCell(s.titre||'(sans titre)',{width:3700}), this.docxCell(s.objectifOp||'—',{width:5966})]); });
      body+=this.docxTable(recapRows);
      body+=this.docxPara('', {spacingAfter:200});
    }

    (e.seances||[]).forEach((s,i)=>{
      const materielList=[...new Set(STEPS.map(([key])=>(s.steps[key]||{}).materiel).filter(m=>m&&m.trim()).map(m=>m.trim()))];
      body+=this.docxPara('Séance '+(i+1)+' — '+(s.titre||'(sans titre)'), {style:'Titre2', bold:true, size:18, spacingAfter:80});
      body+=this.docxParaLabelValue('Objectif opérationnel', s.objectifOp||'—', {labelColor:'2F5233'});
      if(materielList.length) body+=this.docxParaLabelValue('Matériel nécessaire', materielList.join(', '), {labelColor:'8A5A1E'});
      if(s.endedEarly) body+=this.docxPara('Séance interrompue — reprise prévue à l\'étape '+(s.resumeAt||'?'), {italic:true, color:'3E6E8E', spacingAfter:80});
      if(s.rappel) body+=this.docxPara('Rappel de la séance précédente : '+s.rappel, {spacingAfter:80});

      const visibleSteps = STEPS.filter(([key])=>{ const st=s.steps[key]||{}; return ['enseignant','eleve','consigne','materiel','modalite'].some(k=>(st[k]||'').trim()); });
      const cols=this.activeStepColumns(s, visibleSteps);
      if(cols.length){
        const colWidth=Math.floor(8466/cols.length);
        const stepRows=[[this.docxCell("Étape",{bold:true,width:2000,shade:'EFEBD8'})].concat(cols.map(c=>this.docxCell(c.label,{bold:true,width:colWidth,shade:'EFEBD8'})))];
        visibleSteps.forEach(([key,label])=>{
          const st=s.steps[key]||{};
          stepRows.push([this.docxCell(label,{bold:true,width:2000})].concat(cols.map(c=>this.docxCell(st[c.key]||'—',{width:colWidth}))));
        });
        body+=this.docxTable(stepRows);
      } else {
        body+=this.docxPara('Aucune étape renseignée pour cette séance.', {italics:true, color:'5C7A80', spacingAfter:80});
      }
      if(s.differenciation) body+=this.docxParaLabelValue('Différenciation', s.differenciation, {labelColor:'3E6E8E'});
      if(s.bilan) body+=this.docxParaLabelValue('Bilan de la séance / Trace écrite', s.bilan, {labelColor:'2F5233'});
      body+=this.docxPara('', {spacingAfter:200});
    });

    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      +'<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
      +'<w:body>'+body+'<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720"/></w:sectPr></w:body></w:document>';
  },
  downloadDocx(entryOverride){
    const f=entryOverride||this.state.form;
    const base=this.fileNameBase(f);
    const documentXml=this.buildDocxXml(f);
    const contentTypes='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      +'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
      +'<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
      +'<Default Extension="xml" ContentType="application/xml"/>'
      +'<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
      +'<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'
      +'<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>'
      +'</Types>';
    const rootRels='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      +'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      +'<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
      +'<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>'
      +'</Relationships>';
    const docRels='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      +'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      +'<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
      +'</Relationships>';
    const styles='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      +'<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
      +'<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="21"/></w:rPr></w:rPrDefault></w:docDefaults>'
      +'<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>'
      +'<w:style w:type="paragraph" w:styleId="Titre"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:sz w:val="40"/><w:color w:val="17323A"/></w:rPr></w:style>'
      +'<w:style w:type="paragraph" w:styleId="Titre2"><w:name w:val="Heading2"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:sz w:val="26"/><w:color w:val="2F5233"/></w:rPr></w:style>'
      +'<w:style w:type="table" w:styleId="TableGrid"><w:name w:val="Table Grid"/></w:style>'
      +'</w:styles>';
    const coreProps='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      +'<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/">'
      +'<dc:title>'+this.docxEsc(f.theme)+'</dc:title><dc:creator>'+this.docxEsc(f.teacherName)+'</dc:creator>'
      +'</cp:coreProperties>';

    const blob=createZip([
      {name:'[Content_Types].xml', data: strToUint8(contentTypes)},
      {name:'_rels/.rels', data: strToUint8(rootRels)},
      {name:'word/document.xml', data: strToUint8(documentXml)},
      {name:'word/_rels/document.xml.rels', data: strToUint8(docRels)},
      {name:'word/styles.xml', data: strToUint8(styles)},
      {name:'docProps/core.xml', data: strToUint8(coreProps)},
    ]);
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url; a.download=base+'.docx';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(()=>URL.revokeObjectURL(url), 2000);
    this.state.hasDownloaded=true;
  },
  fileNameBase(entryOverride){
    const f=entryOverride||this.state.form;
    return 'Sequence_'+f.cycle+'_'+this.slugify(f.theme)+'_'+this.slugify(f.teacherName);
  },
  downloadZip(){
    const f=this.state.form;
    const base=this.fileNameBase();
    const exportData = this.state.isModification
      ? Object.assign({}, f, {_modificationInfo: {proposeePar: f.teacherName, sequenceOriginale: (this.state.modificationSource||{}).teacherName, statutOriginal: (this.state.modificationSource||{}).status, modifications: this.computeDiff()}})
      : f;
    const jsonBytes=strToUint8(JSON.stringify(exportData, null, 2));
    const blob=createZip([
      {name: base+'.json', data: jsonBytes}
    ]);
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url; a.download=base+'.zip';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(()=>URL.revokeObjectURL(url), 2000);
    this.state.hasDownloaded=true;
  },

  /* ---------- email : webmail direct (Gmail / Outlook) ou logiciel local, + copie de secours ---------- */
  emailParts(){
    const f=this.state.form;
    const isModif=this.state.isModification;
    const tag=isModif ? SUBJECT_TAG_MODIF : SUBJECT_TAG;
    const subject=tag+' '+CYCLE_LABEL[f.cycle]+' — '+f.theme+' — '+(f.teacherName||'sans nom');
    const modifLine = isModif ? ("- Proposition de modification de la séquence de : "+((this.state.modificationSource||{}).teacherName||'—')+"\n") : "";
    const body=
      "Bonjour,\n\n"+
      (isModif ? "Récapitulatif d'une proposition de modification :\n" : "Récapitulatif de l'envoi :\n")+
      modifLine+
      "- Groupe / enseignant·e : "+(f.teacherName||'—')+"\n"+
      "- École : "+(f.school||'—')+"\n"+
      "- Cycle : "+CYCLE_LABEL[f.cycle]+"\n"+
      "- Séquence : "+f.theme+"\n"+
      "- Niveau / classe : "+(f.niveauClasse||'—')+"\n\n"+
      (isModif ? "Le détail des modifications proposées est dans le fichier .zip joint (champ _modificationInfo).\n\n" : "")+
      "⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️\n"+
      "N'OUBLIEZ PAS DE METTRE LE FICHIER ZIP EN PIÈCE JOINTE AVANT D'ENVOYER !\n"+
      "⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️\n\n"+
      "Cordialement";
    return {subject, body};
  },
  openGmailWeb(){
    const {subject, body}=this.emailParts();
    window.open("https://mail.google.com/mail/?view=cm&fs=1&to="+encodeURIComponent(CONSEILLER_EMAIL)+"&su="+encodeURIComponent(subject)+"&body="+encodeURIComponent(body), '_blank');
  },
  openMailClient(){
    const {subject, body}=this.emailParts();
    window.location.href="mailto:"+encodeURIComponent(CONSEILLER_EMAIL)+"?subject="+encodeURIComponent(subject)+"&body="+encodeURIComponent(body);
  },
  copyEmailText(){
    const {subject, body}=this.emailParts();
    const text="À : "+CONSEILLER_EMAIL+"\nObjet : "+subject+"\n\n"+body+"\n\n(N'oubliez pas de joindre le fichier .zip téléchargé.)";
    navigator.clipboard && navigator.clipboard.writeText(text);
    alert("Le texte de l'email a été copié. Ouvrez votre messagerie, créez un nouveau message vers "+CONSEILLER_EMAIL+", et collez (Ctrl+V) ce texte.");
  },

  activeStepColumns(s, stepsSubset){
    const list = stepsSubset || STEPS;
    const cols=[
      {key:'modalite', label:'Modalité'},
      {key:'enseignant', label:"Rôle de l'enseignant"},
      {key:'eleve', label:"Rôle de l'élève"},
      {key:'consigne', label:'Consignes données'},
    ];
    return cols.filter(c => list.some(([key])=>{ const st=s.steps[key]||{}; return (st[c.key]||'').trim(); }));
  },
  entryDetailHTML(e){
    let html=`<div class="chapeau">
      <h2 style="margin-bottom:2px;">${this.esc(e.theme)}</h2>
      <p style="color:var(--ink-soft);margin-top:0;">${CYCLE_LABEL[e.cycle]||e.cycle}</p>
      <table>
        <tr><th>Enseignant·e</th><td>${this.esc(e.teacherName)}</td><th>École</th><td>${this.esc(e.school)}</td></tr>
        <tr><th>Niveau / Classe</th><td>${this.esc(e.niveauClasse)}</td><th>Nb élèves</th><td>${this.esc(e.nbEleves)}</td></tr>
        <tr><th>Domaines du socle</th><td colspan="3">${this.esc((e.domaineSocle||[]).join(', '))||'—'}</td></tr>
        <tr><th>Domaine d'enseignement</th><td>${this.esc(e.domaineEnseignement)}</td><th>Composante</th><td>${this.esc(e.composante)}</td></tr>
      </table>
      <table>
        <tr><th>Attendu de fin de cycle</th><td>${this.esc(e.attendu)}</td></tr>
        <tr><th>Objectif général</th><td>${this.esc(e.objectif)||'—'}</td></tr>
        <tr><th>Vocabulaire spécifique</th><td>${this.esc(e.vocabulaire)||'—'}</td></tr>
        <tr><th>Prérequis</th><td>${this.esc(e.prerequis)||'—'}</td></tr>
        <tr><th>Matériel</th><td>${this.esc(e.materiel)||'—'}</td></tr>
        <tr><th>Évaluation / Critères</th><td>${this.esc(e.evaluation)||'—'}</td></tr>
      </table>
    </div>`;
    if((e.seances||[]).length){
      html+=`<table style="margin-top:4px;margin-bottom:22px;">
        <tr><th style="width:8%;">N°</th><th style="width:32%;">Titre de la séance</th><th>Objectif opérationnel</th></tr>
        ${e.seances.map((s,i)=>`<tr><td>${i+1}</td><td>${this.esc(s.titre)||'(sans titre)'}</td><td>${this.esc(s.objectifOp)||'—'}</td></tr>`).join('')}
      </table>`;
    }
    (e.seances||[]).forEach((s,i)=>{
      const materielList=[...new Set(STEPS.map(([key])=>(s.steps[key]||{}).materiel).filter(m=>m && m.trim()).map(m=>m.trim()))];
      const visibleSteps = STEPS.filter(([key])=>{ const st=s.steps[key]||{}; return ['enseignant','eleve','consigne','materiel','modalite'].some(k=>(st[k]||'').trim()); });
      const cols=this.activeStepColumns(s, visibleSteps);
      const stepsTable = cols.length ? `<table>
          <tr><th>Étape</th>${cols.map(c=>`<th>${c.label}</th>`).join('')}</tr>
          ${visibleSteps.map(([key,label])=>{ const st=s.steps[key]||{}; return `<tr><td><strong>${label}</strong></td>${cols.map(c=>`<td>${this.esc(st[c.key])||'—'}</td>`).join('')}</tr>`; }).join('')}
        </table>` : `<p style="font-size:12.5px;color:var(--ink-soft);font-style:italic;">Aucune étape renseignée pour cette séance.</p>`;
      html+=`<div class="seance">
        <h3>Séance ${i+1} — ${this.esc(s.titre)||'(sans titre)'}</h3>
        <p style="font-size:13.5px;"><strong>🎯 Objectif opérationnel :</strong> ${this.esc(s.objectifOp)||'—'}</p>
        ${materielList.length?`<div style="background:#F5F1E4;border-radius:8px;padding:9px 13px;margin-bottom:10px;font-size:12.5px;"><strong>🧰 Matériel nécessaire pour cette séance :</strong> ${this.esc(materielList.join(', '))}</div>`:''}
        ${s.endedEarly?`<p style="font-size:12.5px;color:var(--sky);"><em>Séance interrompue — reprise prévue à l'étape ${s.resumeAt||'?'}. Les étapes suivantes ne sont pas encore abordées.</em></p>`:''}
        ${s.rappel?`<p style="font-size:12.5px;"><strong>Rappel de la séance précédente :</strong> ${this.esc(s.rappel)}</p>`:''}
        ${stepsTable}
        ${s.differenciation?`<p style="font-size:13px;"><strong>🎛️ Différenciation :</strong> ${this.esc(s.differenciation)}</p>`:''}
        ${s.bilan?`<p style="font-size:13px;"><strong>Bilan de la séance / Trace écrite :</strong> ${this.esc(s.bilan)}</p>`:''}
      </div>`;
    });
    return html;
  },
  printEntry(e){
    const body=this.entryDetailHTML(e);
    const html=`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>${this.esc(e.theme)} — Fiche séquence</title>
    <style>
      body{font-family:Georgia,'Times New Roman',serif;color:#1D2B22;padding:32px;max-width:900px;margin:0 auto;}
      h2{margin-bottom:2px;} h3{margin-bottom:4px;}
      table{width:100%;border-collapse:collapse;margin-bottom:14px;}
      th,td{border:1px solid #999;padding:7px 9px;font-size:12.5px;text-align:left;vertical-align:top;}
      th{background:#EFEBD8;width:20%;}
      .seance{margin-top:20px;padding-top:14px;border-top:2px solid #999;page-break-inside:avoid;}
      @media print{ body{padding:10px;} }
    </style></head><body>${body}
    <script>window.onload=function(){ setTimeout(function(){ window.print(); }, 300); };<\/script>
    </body></html>`;
    const w=window.open('', '_blank');
    if(!w){ alert("Veuillez autoriser les fenêtres pop-up pour générer le PDF (utilisez ensuite « Imprimer → Enregistrer en PDF »)."); return; }
    w.document.write(html); w.document.close();
  },

  esc(s){ return (s===undefined||s===null?'':String(s)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); },

  /* ============================================================ RENDER ============================================================ */
  render(){
    const el=document.getElementById('app'); const s=this.state;
    let html=this.renderTopbar();
    if(s.view==='home') html+=this.renderHome();
    else if(s.view==='sequence') html+=this.renderSequenceForm();
    else if(s.view==='seances') html+=this.renderSeances();
    else if(s.view==='review') html+=this.renderReview();
    else if(s.view==='presentation') html+=this.renderPresentation();
    el.innerHTML=html;
    this.attachHandlers();
    el.querySelectorAll('textarea, input[type=text]').forEach(node=>{
      node.setAttribute('spellcheck','true');
      node.setAttribute('lang','fr');
    });
  },

  renderTopbar(){
    return `
    <div class="topbar">
      <div class="brand" role="button" tabindex="0" title="Retour à l'accueil" onclick="app.restart()" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();app.restart();}">
        <div class="mark">S·T</div>
        <div><div class="title">Carnet de séquences</div><div class="sub">Sciences et technologie — Cycles 1, 2, 3 — Nouvelle-Calédonie</div></div>
      </div>
      <button class="import-link" onclick="app.triggerImport()">📂 Reprendre un travail (.json ou .zip)</button>
    </div>`;
  },

  renderHome(){
    const s=this.state;
    const tabs=['C1','C2','C3'].map(c=>`<button class="tab ${c===s.cycle?'active':''}" onclick="app.chooseCycle('${c}')"><span class="n">${c}</span><span class="label">${CYCLE_LABEL[c]}</span></button>`).join('');
    const cards=THEMES[s.cycle].map((th,i)=>{
      const ex=this.findExistingForTheme(s.cycle, th.t);
      const badge=(indices,cls,labelSingular,labelPlural)=>{
        if(!indices.length) return '';
        let titleText;
        if(cls==='ia'){
          titleText='Séquence rédigée entièrement par une IA, à titre de modèle — à relire avant utilisation';
        } else {
          const names=indices.map(idx=>EXISTING_SEQUENCES[idx].data.teacherName).join(', ');
          const suffix=cls==='assistee' ? ' et assisté par IA' : '';
          titleText='Réalisé par : '+names+suffix;
        }
        return `<div class="existing-badge ${cls}" role="button" tabindex="0" onclick="app.viewExisting(${indices[0]})" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();app.viewExisting(${indices[0]});}" title="${this.esc(titleText)}">${indices.length} ${indices.length>1?labelPlural:labelSingular}</div>`;
      };
      return `
      <div class="theme-card">
        <span class="badge">${this.esc(th.cat)}</span>
        <h3>${this.esc(th.t)}</h3>
        <p>${this.esc(th.obj)}</p>
        <p class="example">Exemple d'activité : ${this.esc(th.ex)}</p>
        <div class="existing-badges">
          ${badge(ex.existante,'existante','existante','existantes')}
          ${badge(ex.assistee,'assistee','avec IA','avec IA')}
          ${badge(ex.ia,'ia',"modèle IA","modèles IA")}
        </div>
        <button class="choose-btn" onclick="app.chooseTheme('${s.cycle}', ${i})">Choisir cette séquence →</button>
      </div>`;
    }).join('');
    const draftBanner = s.pendingDraft ? `
    <div class="draft-banner">
      <div class="draft-banner-txt">
        <strong>Reprendre votre travail en cours&nbsp;?</strong>
        <span>${this.esc(s.pendingDraft.theme||'Séquence')}${s.pendingDraft.teacherName?' — '+this.esc(s.pendingDraft.teacherName):''} · enregistré ${this.relTime(s.pendingDraft.savedAt)}</span>
      </div>
      <div class="draft-banner-actions">
        <button class="btn btn-primary" onclick="app.resumeDraft()">Reprendre</button>
        <button class="btn btn-ghost" onclick="app.discardDraft()">Ignorer</button>
      </div>
    </div>` : '';
    return `
    ${draftBanner}
    <p style="max-width:660px;color:var(--ink-soft);font-size:14.5px;">Choisissez un cycle puis une séquence. Votre travail est enregistré automatiquement dans ce navigateur au fur et à mesure. À la fin, vous pourrez télécharger votre travail en PDF/Word et l'envoyer par email.</p>
    <div class="tabs">${tabs}</div>
    <div class="panel"><div class="theme-grid">${cards}</div></div>`;
  },

  renderSequenceForm(){
    const f=this.state.form, th=this.state.theme;
    if(!this.state.pseudoOptions) this.state.pseudoOptions=Pseudonym.options(5);
    const pseudoOptions=this.state.pseudoOptions;
    const socleChecks=DOMAINES_SOCLE.map(([code,label])=>`<label class="check-pill"><input type="checkbox" ${f.domaineSocle.includes(code)?'checked':''} onchange="app.toggleSocle('${code}')"> ${code} — ${label}</label>`).join('');
    return `
    <div class="stamp-box"><span class="eyebrow">Séquence choisie · ${CYCLE_LABEL[f.cycle]}</span><h3>${this.esc(th.t)}</h3><p>${this.esc(th.obj)}</p></div>
    <div class="panel">
      <h2 style="margin-top:0;">Fiche séquence</h2>

      <div class="identity-box">
        <span class="eyebrow">Votre signature</span>
        <p class="identity-hint">La séquence sera publiée sous ce pseudonyme — pas besoin de donner votre vrai nom.</p>
        <div class="identity-row">
          <input type="text" id="f-teacherName" value="${this.esc(f.teacherName)}" aria-label="Pseudonyme">
          <button type="button" class="btn-ghost identity-btn" onclick="app.rerollPseudo()">🎲 Un autre</button>
        </div>
        <div class="identity-choices">
          ${pseudoOptions.map(p=>`<button type="button" class="pseudo-chip" onclick="app.choosePseudo('${p.replace(/'/g,"\\'")}')">${this.esc(p)}</button>`).join('')}
        </div>
        <div class="field" style="margin:12px 0 0;">
          <label>E-mail de contact <span class="hint">Facultatif — jamais affiché. Sert uniquement à ce que le conseiller puisse vous recontacter.</span></label>
          <input type="text" id="f-contactEmail" placeholder="prenom.nom@example.nc" value="${this.esc(f.contactEmail||'')}">
        </div>
      </div>

      <div class="row3">
        <div class="field"><label>École <span class="hint">facultatif</span></label><input type="text" id="f-school" value="${this.esc(f.school)}"></div>
        <div class="field"><label>Niveau / Classe</label><input type="text" id="f-niveauClasse" placeholder="ex. CE2" value="${this.esc(f.niveauClasse)}"></div>
        <div class="field"><label>Nombre d'élèves</label><input type="text" id="f-nbEleves" value="${this.esc(f.nbEleves)}"></div>
      </div>

      <div class="field"><label>Domaines du socle concernés <span class="hint">Cochées automatiquement selon la composante choisie ci-dessous — modifiables</span></label><div class="checks">${socleChecks}</div></div>
      <div class="row2">
        <div class="field"><label>Domaine d'enseignement</label><input type="text" id="f-domaineEnseignement" value="${this.esc(f.domaineEnseignement)}"></div>
        <div class="field"><label>Composante</label>
          <select onchange="app.updateProgDomaine(this.value)">
            <option value="">— Choisir —</option>
            ${(PROGRAMMES_DATA[f.cycle]||[]).map(c=>`<option value="${this.esc(c.nom)}" ${f.composante===c.nom?'selected':''}>${this.esc(c.nom)}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="field"><label>Attendu de fin de cycle <span class="hint">Si une composante est choisie ci-dessus, la liste est filtrée ; sinon, tous les attendus du cycle sont proposés</span></label>
        <select onchange="app.updateProgAttendu(this.value)">
          <option value="">— Choisir —</option>
          ${f.composante
            ? ((PROGRAMMES_DATA[f.cycle]||[]).find(c=>c.nom===f.composante)?.attendus||[]).map(a=>`<option value="${this.esc(a)}" ${f.attendu===a?'selected':''}>${this.esc(a)}</option>`).join('')
            : (PROGRAMMES_DATA[f.cycle]||[]).map(c=>`<optgroup label="${this.esc(c.nom)}">${c.attendus.map(a=>`<option value="${this.esc(a)}" ${f.attendu===a?'selected':''}>${this.esc(a)}</option>`).join('')}</optgroup>`).join('')
          }
        </select>
      </div>
      <div class="field"><label>Objectif général de la séquence</label><textarea id="f-objectif" placeholder="La visée générale de la séquence, dont chaque séance décline un objectif opérationnel précis">${this.esc(f.objectif)}</textarea></div>
      <div class="row2">
        <div class="field"><label>Vocabulaire spécifique</label><textarea id="f-vocabulaire">${this.esc(f.vocabulaire)}</textarea></div>
        <div class="field"><label>Prérequis</label><textarea id="f-prerequis">${this.esc(f.prerequis)}</textarea></div>
      </div>
      <div class="row2">
        <div class="field"><label>Matériel</label><textarea id="f-materiel">${this.esc(f.materiel)}</textarea></div>
        <div class="field"><label>Évaluation / Critères de réussite</label><textarea id="f-evaluation">${this.esc(f.evaluation)}</textarea></div>
      </div>
      <div class="field"><label>Nombre de séances</label><input type="number" id="f-nbSeances" min="1" max="10" value="${f.nbSeances}" style="max-width:120px;" onchange="app.updateNbSeances(this.value)"></div>
      <div class="field"><label>Titres des séances</label>
        ${f.seanceTitles.map((t,i)=>`<input type="text" style="margin-bottom:8px;" placeholder="Titre de la séance ${i+1}" value="${this.esc(t)}" oninput="app.updateSeanceTitle(${i}, this.value)">`).join('')}
      </div>
      <div class="btn-row">
        <button class="btn btn-ghost" onclick="app.restart()">← Changer de séquence</button>
        <button class="btn btn-primary" onclick="app.goToSeances()">Continuer vers les séances →</button>
      </div>
    </div>`;
  },

  renderSeances(){
    const f=this.state.form; const i=f.currentSeanceIndex||0; const s=f.seances[i];
    const resumeStart=this.computeResumeStart(i);
    const dots=f.seances.map((sc,idx)=>`<button class="dot ${idx===i?'active':''}" onclick="app.goToSeanceIndex(${idx})">${idx+1}</button>`).join('');
    const rappelBox = resumeStart>1 ? `
      <div class="stamp-box" style="border-color:var(--sky);background:var(--sky-soft);">
        <span class="eyebrow" style="color:var(--sky);">Reprise de la séance précédente</span>
        <h3>On reprend à l'étape ${resumeStart} — ${STEPS[resumeStart-1][1].replace(/^\d+\.\s*/,'')}</h3>
        <label style="display:block;font-weight:600;font-size:13.5px;margin-top:8px;margin-bottom:4px;">Rappel de ce qui a été vu la dernière fois</label>
        <textarea oninput="app.updateSeanceField(${i},'rappel',this.value)">${this.esc(s.rappel)}</textarea>
      </div>` : '';
    const stepsHtml=STEPS.map(([key,label],idx)=>{
      const muted = idx+1 < resumeStart;
      const st=s.steps[key];
      const collapsed = ((s.collapsedSteps||{})[key] !== undefined) ? s.collapsedSteps[key] : muted;
      const help=STEP_HELP[key];
      const helpBox = help ? `
        <div class="help-pop">
          <strong>Objectifs de l'étape</strong>
          <ul>${help.objectifs.map(o=>`<li>${this.esc(o)}</li>`).join('')}</ul>
          <strong>Rôle de l'enseignant</strong>
          <ul>${help.role.map(o=>`<li>${this.esc(o)}</li>`).join('')}</ul>
        </div>` : '';
      const body = collapsed ? '' : `
        <div class="row3">
          <div class="field"><label>Rôle de l'enseignant</label><textarea oninput="app.updateSeanceStepField(${i},'${key}','enseignant',this.value)">${this.esc(st.enseignant)}</textarea></div>
          <div class="field"><label>Rôle de l'élève</label><textarea oninput="app.updateSeanceStepField(${i},'${key}','eleve',this.value)">${this.esc(st.eleve)}</textarea></div>
          <div class="field"><label>Consignes données</label><textarea oninput="app.updateSeanceStepField(${i},'${key}','consigne',this.value)">${this.esc(st.consigne)}</textarea></div>
        </div>
        <div class="field materiel-line"><label>🧰 Matériel nécessaire</label><input type="text" value="${this.esc(st.materiel)}" oninput="app.updateSeanceStepField(${i},'${key}','materiel',this.value)" placeholder="ex. loupes, gobelets, graines, chronomètre..."></div>`;
      return `<div class="step-row ${muted?'muted':''}">
        <div class="step-row-head">
          <button type="button" class="collapse-toggle" onclick="app.toggleStepCollapse(${i},'${key}')" title="${collapsed?'Déplier':'Replier'}">${collapsed?'▸':'▾'}</button>
          <span class="help-trigger" tabindex="0" onclick="this.classList.toggle('show')">${label}${muted?' <span class="tag">déjà vue en séance précédente</span>':''} <span class="help-icon">ⓘ</span>${helpBox}</span>
          <select class="modalite-select" aria-label="Modalité de travail pour l'étape ${this.esc(label)}" onchange="app.updateSeanceStepField(${i},'${key}','modalite',this.value)">
            <option value="">Modalité...</option>
            ${MODALITES.map(m=>`<option value="${m}" ${st.modalite===m?'selected':''}>${m}</option>`).join('')}
          </select>
        </div>
        ${body}
      </div>`;
    }).join('');
    const endSessionBox = `
      <div class="floating-endsession">
        <div class="fe-icon">⏸</div>
        <span class="fe-eyebrow">Fin de séance</span>
        <label class="fe-check"><input type="checkbox" ${s.endedEarly?'checked':''} onchange="app.toggleEndedEarly(${i}, this.checked)"> Je m'arrête avant la fin des 7 étapes</label>
        ${s.endedEarly?`
        <div class="fe-resume">
          <label>La séance suivante commencera à :</label>
          <select onchange="app.updateSeanceField(${i},'resumeAt', parseInt(this.value)); app.render();">
            ${STEPS.slice(1).map(([k,l],idx2)=>{ const num=idx2+2; return `<option value="${num}" ${s.resumeAt===num?'selected':''}>${l}</option>`; }).join('')}
          </select>
          <button type="button" class="fe-badge" onclick="app.finishSeance(${i})" title="Aller directement à la séance suivante">▸ Séance ${i+2<=f.seances.length?i+2:'suivante'} : démarre à l'étape ${s.resumeAt||'?'}<br>(cliquer pour y aller)</button>
        </div>` : ''}
      </div>`;
    return `
    <div class="panel">
      ${endSessionBox}
      <div class="seance-nav"><div class="dots">${dots}</div><div class="seance-count">Séance ${i+1} / ${f.seances.length}</div></div>
      <div class="field"><label>Titre de la séance</label><input type="text" id="seance-titre-${i}" value="${this.esc(s.titre)}"></div>
      <div class="objectif-bar">
        <label>🎯 Objectif opérationnel de cette séance <span class="hint">Ce que l'élève doit savoir faire à l'issue de CETTE séance précisément — observable et mesurable</span></label>
        <input type="text" id="seance-objectif-${i}" value="${this.esc(s.objectifOp)}" placeholder="ex. L'élève sait formuler une hypothèse testable à partir d'une observation">
      </div>
      ${rappelBox}
      ${stepsHtml}
      <div class="field" style="margin-top:20px;">
        <label>Bilan de la séance / Trace écrite <span class="hint">Ce qui est retenu, la trace écrite produite, une remarque pour la suite</span></label>
        <textarea oninput="app.updateSeanceField(${i},'bilan',this.value)">${this.esc(s.bilan)}</textarea>
      </div>
      <div class="field">
        <label>🎛️ Différenciation <span class="hint">Adaptations prévues pour certains élèves (étayage, tâche allégée, défi supplémentaire...)</span></label>
        <textarea oninput="app.updateSeanceField(${i},'differenciation',this.value)">${this.esc(s.differenciation)}</textarea>
      </div>
      <div class="btn-row">
        <button class="btn btn-ghost" onclick="app.backFromSeances()">← ${i===0?'Modifier la fiche séquence':'Séance précédente'}</button>
        <button class="btn btn-primary" onclick="app.finishSeance(${i})">${i<f.seances.length-1?'Terminer cette séance et passer à la suivante →':'Terminer cette séance et voir le récapitulatif →'}</button>
      </div>
    </div>`;
  },

  renderPresentation(){
    const idx=this.state.viewingExisting;
    const entry=EXISTING_SEQUENCES[idx];
    const styles={
      existante:{bg:'var(--sky-soft)', border:'var(--sky)', label:'Séquence existante', by:'Réalisé par : '+this.esc(entry.data.teacherName)},
      assistee:{bg:'var(--ochre-soft)', border:'var(--ochre)', label:'Séquence complétée avec assistance', by:'Réalisé par : '+this.esc(entry.data.teacherName)+' et assisté par IA'},
      ia:{bg:'var(--forest-soft, #E4EEE6)', border:'var(--forest)', label:'Séquence produite par l\'IA', by:'Séquence modèle rédigée entièrement par l\'IA — à relire avant utilisation en classe'},
    };
    const st=styles[entry.status];
    return `<div class="panel">
      <div class="stamp-box" style="background:${st.bg};border-color:${st.border};">
        <span class="eyebrow">${st.label}</span>
        <h3>${this.esc(entry.data.theme)} — ${CYCLE_LABEL[entry.data.cycle]}</h3>
        <p>${st.by}</p>
      </div>
      ${this.entryDetailHTML(entry.data)}
      <div class="btn-row" style="margin-top:24px;">
        <button class="btn btn-ghost" onclick="app.restart()">← Retour à l'accueil</button>
        <button class="btn btn-primary" onclick="app.downloadDocx(EXISTING_SEQUENCES[${idx}].data)">📝 Télécharger en Word</button>
        <button class="btn btn-primary" onclick="app.proposeModification(${idx})">✏️ Proposer une modification</button>
      </div>
    </div>`;
  },

  renderReview(){
    const f=this.state.form;
    const isModif=this.state.isModification;
    const diffs=isModif ? this.computeDiff() : [];
    const diffBox = isModif ? `
      <div class="stamp-box" style="background:var(--ochre-soft);border-color:var(--ochre);">
        <span class="eyebrow">Proposition de modification</span>
        <h3 style="margin-bottom:6px;">Ce qui a changé par rapport à l'original de ${this.esc((this.state.modificationSource||{}).teacherName||'')}</h3>
        ${diffs.length ? `<table style="width:100%;border-collapse:collapse;margin-top:8px;">
          <tr><th style="text-align:left;font-size:12px;padding:4px 6px;border-bottom:1px solid var(--ochre);">Champ</th><th style="text-align:left;font-size:12px;padding:4px 6px;border-bottom:1px solid var(--ochre);">Avant</th><th style="text-align:left;font-size:12px;padding:4px 6px;border-bottom:1px solid var(--ochre);">Après</th></tr>
          ${diffs.map(d=>`<tr><td style="font-size:12px;padding:4px 6px;vertical-align:top;font-weight:600;">${this.esc(d.label)}</td><td style="font-size:12px;padding:4px 6px;vertical-align:top;color:var(--ink-soft);">${this.esc(d.before)}</td><td style="font-size:12px;padding:4px 6px;vertical-align:top;">${this.esc(d.after)}</td></tr>`).join('')}
        </table>` : `<p style="font-size:13px;">Aucune modification détectée pour l'instant.</p>`}
      </div>` : '';
    return `<div class="panel">
      <h2 style="margin-top:0;">Récapitulatif complet</h2>
      ${this.entryDetailHTML(f)}
      ${diffBox}

      <h2>Finaliser et envoyer</h2>
      <div class="send-steps">
        <div class="send-step"><div class="num"></div><div class="body">
          <strong>Télécharger votre fiche (.docx)</strong>
          <p>Un vrai document Word, à garder pour vous : à adapter, imprimer ou classer comme vous le souhaitez.</p>
          <button class="btn btn-primary" style="margin-top:8px;" onclick="app.downloadDocx()">📝 Télécharger la fiche Word</button>
          <button class="btn btn-ghost" style="margin-top:8px;margin-left:8px;" onclick="app.printEntry(app.state.form)">🖨️ Aperçu / imprimer maintenant</button>
        </div></div>
        <div class="send-step"><div class="num"></div><div class="body">
          <strong>Télécharger le pack pour le conseiller (.zip)</strong>
          <p>Les données de la séquence, dans un format que le conseiller pédagogique pourra réutiliser. C'est ce fichier qu'il faut joindre à l'email — pas le Word.</p>
          <button class="btn btn-primary" style="margin-top:8px;" onclick="app.downloadZip()">📦 Télécharger le pack (.zip)</button>
        </div></div>
        <div class="send-step"><div class="num"></div><div class="body">
          <strong>Envoyer par email à ${this.esc(CONSEILLER_EMAIL)}</strong>
          <p>Message pré-rempli. Joignez le fichier .zip téléchargé juste avant, puis envoyez.</p>
          <button class="btn btn-primary" style="margin-top:8px;" onclick="app.openGmailWeb()">✉️ Gmail (navigateur)</button>
          <button class="btn btn-primary" style="margin-top:8px;margin-left:8px;" onclick="app.openMailClient()">✉️ Mon logiciel de messagerie</button>
          <p style="margin-top:10px;">Aucun des deux boutons ne fonctionne ? <button class="btn btn-ghost" onclick="app.copyEmailText()">📋 Copier le texte de l'email</button> puis collez-le manuellement dans un nouveau message vers ${this.esc(CONSEILLER_EMAIL)}.</p>
        </div></div>
      </div>

      <div class="btn-row">
        <button class="btn btn-ghost" onclick="app.goToSeanceIndex(${f.seances.length-1})">← Revenir aux séances</button>
        <button class="btn btn-ghost" onclick="app.restart()">Nouvelle séquence</button>
      </div>
    </div>`;
  },

  attachHandlers(){
    const f=this.state.form;
    if(f){
      const bind=(id,field)=>{ const el=document.getElementById(id); if(el) el.oninput=()=>this.updateForm(field, el.value); };
      const pseudoEl=document.getElementById('f-teacherName');
      if(pseudoEl) pseudoEl.oninput=()=>this.setPseudo(pseudoEl.value);
      bind('f-contactEmail','contactEmail'); bind('f-school','school'); bind('f-niveauClasse','niveauClasse');
      bind('f-nbEleves','nbEleves'); bind('f-domaineEnseignement','domaineEnseignement');
      bind('f-objectif','objectif');
      bind('f-vocabulaire','vocabulaire'); bind('f-prerequis','prerequis'); bind('f-materiel','materiel'); bind('f-evaluation','evaluation');
      const i=f.currentSeanceIndex||0;
      const titreEl=document.getElementById('seance-titre-'+i);
      if(titreEl) titreEl.oninput=()=>this.updateSeanceField(i,'titre',titreEl.value);
      const objEl=document.getElementById('seance-objectif-'+i);
      if(objEl) objEl.oninput=()=>this.updateSeanceField(i,'objectifOp',objEl.value);
    }
  }
};

document.getElementById('import-input').addEventListener('change', function(e){
  if(e.target.files && e.target.files[0]) app.handleImportFile(e.target.files[0]);
  e.target.value='';
});

window.addEventListener('beforeunload', function(e){
  // Le brouillon est déjà sauvegardé en local ; on prévient tout de même
  // tant que l'enseignant n'a rien exporté (fichier .zip / .docx).
  if(app.state.form && !app.state.hasDownloaded){
    e.preventDefault();
    e.returnValue = '';
  }
});

/* Un brouillon local existe-t-il ? On propose de le reprendre depuis l'accueil. */
(function(){
  var d=Draft.load();
  if(d && d.payload && d.payload.form){
    app.state.pendingDraft={
      savedAt:d.savedAt,
      theme:d.payload.form.theme||'',
      teacherName:d.payload.form.teacherName||''
    };
  }
})();

app.render();

/* Les séquences publiées arrivent de façon asynchrone (data/sequences.json,
   puis Supabase) : on redessine quand elles sont là. */
if(typeof SEQUENCES_READY !== 'undefined'){
  SEQUENCES_READY.then(function(){ app.render(); });
}
