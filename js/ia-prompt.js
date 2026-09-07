/* ============================================================
   ALLER-RETOUR IA (sans clé API)

   IaPrompt.build(data)      -> texte à copier : consigne + séquence + format imposé
   IaPrompt.parseResponse(t) -> objet JS extrait de la réponse de l'IA (JSON)
   IaPrompt.merge(orig, ai)  -> applique la proposition sur une copie de l'original
                                (structure et identité préservées)
   ============================================================ */
const IaPrompt = (function(){

  const STEP_KEYS  = STEPS.map(function(s){ return s[0]; });
  const STEP_LABEL = STEPS.reduce(function(a,s){ a[s[0]] = s[1]; return a; }, {});

  const INTRO =
`Tu es conseiller pédagogique en sciences et technologie pour le premier degré
(Nouvelle-Calédonie, cycles 1 à 3). On te donne une séquence rédigée par un enseignant,
parfois incomplète. Ta mission : la RENFORCER sans la dénaturer.

Règles :
- Respecte l'intention, le thème, l'attendu de fin de cycle et le niveau de classe.
- Complète ce qui manque (étapes vides, objectifs, trace écrite, différenciation),
  reformule ce qui est confus, garde ce qui est déjà bon.
- Suis la démarche d'investigation en 7 étapes : ${STEPS.map(function(s){return s[1];}).join(' · ')}.
- Reste concret et directement utilisable en classe : consignes réalistes, matériel
  courant d'une école primaire calédonienne, formulations adaptées à l'âge.
- N'invente pas de matériel coûteux ou introuvable. Pas de sortie hors du réalisable.
- Français clair. Pas de blabla, pas d'introduction, pas de conclusion.
- Une étape non pertinente pour cette séance : laisse ses champs vides ("").
- "modalite" ∈ ["Individuel","Binôme","Petit groupe","Collectif"] (ou "").`;

  const RESPONSE_RULES =
`Réponds UNIQUEMENT avec un bloc \`\`\`json ... \`\`\` valide, EXACTEMENT à ce format
(mêmes clés, rien de plus, rien en dehors du bloc) :`;

  function schema(){
    const step = '{ "enseignant": "", "eleve": "", "consigne": "", "materiel": "", "modalite": "" }';
    const stepsObj = STEP_KEYS.map(function(k){ return '      "'+k+'": '+step; }).join(',\n');
    return [
'{',
'  "objectif": "objectif général de la séquence",',
'  "vocabulaire": "",',
'  "prerequis": "",',
'  "materiel": "matériel global de la séquence",',
'  "evaluation": "critères de réussite / évaluation",',
'  "seances": [',
'    {',
'      "titre": "",',
'      "objectifOp": "objectif opérationnel, observable",',
'      "bilan": "trace écrite / ce qui est retenu",',
'      "differenciation": "",',
'      "steps": {',
stepsObj,
'      }',
'    }',
'  ]',
'}'
    ].join('\n');
  }

  /* Ne transmet PAS l'identité (pseudo, e-mail, école). */
  function publicData(data){
    return {
      cycle: data.cycle,
      theme: data.theme,
      attendu: data.attendu,
      niveau: data.niveauClasse || '',
      objectif: data.objectif || '',
      vocabulaire: data.vocabulaire || '',
      prerequis: data.prerequis || '',
      materiel: data.materiel || '',
      evaluation: data.evaluation || '',
      seances: (data.seances || []).map(function(s){
        return {
          titre: s.titre || '',
          objectifOp: s.objectifOp || '',
          bilan: s.bilan || '',
          differenciation: s.differenciation || '',
          steps: STEP_KEYS.reduce(function(acc,k){
            var st = (s.steps && s.steps[k]) || {};
            acc[k] = {
              enseignant: st.enseignant || '', eleve: st.eleve || '',
              consigne: st.consigne || '', materiel: st.materiel || '',
              modalite: st.modalite || ''
            };
            return acc;
          }, {})
        };
      })
    };
  }

  function build(data){
    return [
      INTRO, '',
      '## Séquence à renforcer',
      '```json',
      JSON.stringify(publicData(data), null, 1),
      '```', '',
      '## Format de réponse EXIGÉ',
      RESPONSE_RULES,
      '```json',
      schema(),
      '```'
    ].join('\n');
  }

  function parseResponse(text){
    if(!text || !text.trim()) throw new Error('Réponse vide.');
    var jsonText = null;
    var m = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if(m){ jsonText = m[1]; }
    else {
      var a = text.indexOf('{'), b = text.lastIndexOf('}');
      if(a > -1 && b > a) jsonText = text.slice(a, b + 1);
    }
    if(!jsonText) throw new Error("Aucun bloc JSON trouvé dans la réponse.");
    var obj;
    try { obj = JSON.parse(jsonText); }
    catch(e){ throw new Error("Le JSON est invalide : " + e.message); }
    if(!obj || typeof obj !== 'object') throw new Error("Réponse inattendue.");
    if(!Array.isArray(obj.seances)) throw new Error('Le JSON ne contient pas de tableau "seances".');
    return obj;
  }

  function pick(o, keys){
    return keys.reduce(function(a,k){ if(typeof o[k] === 'string') a[k] = o[k]; return a; }, {});
  }

  function merge(original, ai){
    var out = JSON.parse(JSON.stringify(original));
    ['objectif','vocabulaire','prerequis','materiel','evaluation'].forEach(function(k){
      if(typeof ai[k] === 'string' && ai[k].trim()) out[k] = ai[k];
    });
    if(Array.isArray(ai.seances)){
      ai.seances.forEach(function(s, i){
        if(!out.seances[i]) return;
        ['titre','objectifOp','bilan','differenciation'].forEach(function(k){
          if(typeof s[k] === 'string' && s[k].trim()) out.seances[i][k] = s[k];
        });
        if(s.steps){
          STEP_KEYS.forEach(function(key){
            if(s.steps[key]){
              out.seances[i].steps[key] = Object.assign(
                {}, out.seances[i].steps[key],
                pick(s.steps[key], ['enseignant','eleve','consigne','materiel','modalite'])
              );
            }
          });
        }
      });
    }
    return out;
  }

  return { build: build, parseResponse: parseResponse, merge: merge, STEP_KEYS: STEP_KEYS, STEP_LABEL: STEP_LABEL };
})();
