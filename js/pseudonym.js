/* ============================================================
   PSEUDONYMES — attribution « douce » et anonyme des séquences

   L'enseignant n'a pas besoin de donner son vrai nom. On lui propose
   un pseudonyme calédonien (nom d'espèce / de plante + adjectif), qu'il
   peut relancer ou choisir dans une liste, ou remplacer par un texte libre.

   Le pseudonyme qualifie l'espèce, pas la personne : l'accord au masculin
   suit le nom commun et ne présume rien du genre de l'enseignant.

   Un e-mail de contact peut être saisi séparément : il n'est JAMAIS affiché
   publiquement, il ne sert qu'à ce que le conseiller puisse recontacter.
   ============================================================ */
const Pseudonym = (function(){
  const KEY = 'cds:pseudonym:v1';

  // Noms communs masculins (faune, flore, milieux de Nouvelle-Calédonie)
  // — accord de l'adjectif au masculin, cohérent avec le nom commun.
  const NOMS = [
    "Cagou","Notou","Niaouli","Kaori","Banian","Houp","Bourao","Flamboyant",
    "Gecko","Nautile","Bénitier","Picot","Dawa","Corail","Lagon","Récif",
    "Tamanou","Santal","Balbuzard","Pandanus","Bec-de-corail","Méliphage",
    "Héron","Martin-pêcheur","Perroquet","Dugong","Napoléon","Pétrel"
  ];
  const ADJECTIFS = [
    "curieux","studieux","méthodique","observateur","ingénieux","patient",
    "éclairé","rigoureux","attentif","astucieux","aventureux","savant",
    "réfléchi","tenace","appliqué","perspicace","inventif","persévérant"
  ];

  function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

  function generate(){
    return pick(NOMS) + " " + pick(ADJECTIFS);
  }

  /* Quelques propositions distinctes, pour un choix « au clic ». */
  function options(n){
    const set = new Set();
    let guard = 0;
    while(set.size < (n||6) && guard++ < 100) set.add(generate());
    return [...set];
  }

  function stored(){
    try{ return localStorage.getItem(KEY) || ''; }catch(e){ return ''; }
  }
  function remember(name){
    try{ if(name) localStorage.setItem(KEY, name); }catch(e){}
  }

  /* Pseudonyme courant : celui déjà mémorisé, sinon on en crée un. */
  function current(){
    let p = stored();
    if(!p){ p = generate(); remember(p); }
    return p;
  }

  return { generate, options, current, remember, NOMS, ADJECTIFS };
})();
