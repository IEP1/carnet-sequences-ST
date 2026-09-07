/* ============================================================
   DONNÉES DE RÉFÉRENCE — programmes, thèmes, aide par étape
   ============================================================ */

const THEMES = {
  C1: [
    {t:"Le développement animal", cat:"Vivant", obj:"Reconnaître les principales étapes du développement d'un animal.", ex:"Installer et observer un élevage dans la classe ; repérer et dater les naissances."},
    {t:"Le développement végétal", cat:"Vivant", obj:"Reconnaître les principales étapes du développement d'un végétal, dans une situation d'observation du réel ou sur une image.", ex:"Mettre en place des plantations en classe pour faire le lien entre graine, fleur et fruit."},
    {t:"Les besoins des animaux", cat:"Vivant", obj:"Connaître les besoins essentiels de quelques animaux.", ex:"Participer à l'entretien quotidien des élevages en fournissant la nourriture adaptée et en assurant le nettoyage."},
    {t:"Les besoins des végétaux", cat:"Vivant", obj:"Connaître les besoins essentiels de quelques végétaux.", ex:"Arroser et entretenir les plantations pour comprendre l'impact de l'eau et de la lumière sur leur croissance."},
    {t:"Le corps humain", cat:"Corps & santé", obj:"Situer et nommer les différentes parties du corps humain, sur soi ou sur une représentation.", ex:"Dessiner un être humain complet et articulé ; repérer et nommer ses articulations (coude, genou) lors de jeux ou parcours de motricité."},
    {t:"L'hygiène et la santé", cat:"Corps & santé", obj:"Connaître et mettre en œuvre quelques règles d'hygiène et de vie saine pour soi, pour les autres et pour l'environnement.", ex:"Pratiquer et analyser le rituel du lavage des mains, du mouchage de nez ou du brossage des dents."},
    {t:"La protection du vivant", cat:"Vivant", obj:"Commencer à adopter une attitude responsable en matière de respect des lieux et de protection du vivant.", ex:"Sensibiliser au gaspillage, mettre en place le tri et la réduction des déchets ; entretenir les espaces verts de l'école."},
    {t:"Les matériaux et les outils", cat:"Objets & techniques", obj:"Choisir, utiliser et savoir désigner des outils et des matériaux adaptés à une situation, à des actions techniques spécifiques (plier, couper, coller, assembler, actionner…).", ex:"Réaliser une recette de cuisine (pâte à tarte, compote) ; s'entraîner avec ciseaux, gabarits ou perforatrices."},
    {t:"Les caractéristiques sensorielles", cat:"Matière", obj:"Distinguer des réalités différentes selon leurs caractéristiques sensorielles.", ex:"Trier et comparer des objets ou des matériaux en utilisant ses 5 sens (goût, odeur, texture)."},
    {t:"Les constructions et maquettes", cat:"Objets & techniques", obj:"Réaliser des constructions – construire des maquettes simples en fonction de plans ou d'instructions de montage.", ex:"Fabriquer des « objets de l'eau » (bateau, moulin) ; monter un objet en kit à l'aide d'une notice illustrée."},
    {t:"Les dangers domestiques", cat:"Corps & santé", obj:"Prendre en compte les risques de l'environnement familier proche (objets et comportements dangereux, produits toxiques).", ex:"Identifier, justifier et alerter sur les objets dangereux, les risques de coupures, brûlures ou d'électrocution dans la classe."},
    {t:"Les outils numériques", cat:"Numérique", obj:"Utiliser des objets numériques : appareil photo, tablette, ordinateur.", ex:"Photographier une sortie scolaire ou les étapes d'une fabrication ; utiliser un clavier pour taper son prénom ou une courte phrase."}
  ],
  C2: [
    {t:"Les caractéristiques du vivant", cat:"Vivant", obj:"Connaître des caractéristiques du monde vivant, ses interactions, sa diversité.", ex:"Créer et observer de petits écosystèmes dans la mare ou le jardin de l'école ; construire le schéma simple d'une chaîne alimentaire locale."},
    {t:"La santé et le corps humain", cat:"Corps & santé", obj:"Reconnaître des comportements favorables à sa santé.", ex:"Utiliser toise et balance pour créer des graphiques de croissance ; repérer les 4 familles d'aliments ; modéliser la flexion/extension du bras avec des pantins articulés."},
    {t:"Les états de la matière", cat:"Matière", obj:"Identifier les trois états de la matière et observer des changements d'états.", ex:"Le « défi glaçon » pour observer fusion et solidification ; seringues, pompes à vélo et ballons pour prouver l'existence de l'air."},
    {t:"L'eau dans la vie quotidienne", cat:"Matière", obj:"Identifier un changement d'état de l'eau dans un phénomène de la vie quotidienne.", ex:"Mettre en lien la météo locale avec les états de l'eau (pluie, nuages, glace)."},
    {t:"La fonction des objets", cat:"Objets & techniques", obj:"Comprendre la fonction et le fonctionnement d'objets fabriqués.", ex:"Démonter et analyser les composants d'une lampe de poche, ou comparer différents objets servant à presser un citron."},
    {t:"Les circuits électriques", cat:"Objets & techniques", obj:"Réaliser quelques objets et circuits électriques simples, en respectant des règles élémentaires de sécurité.", ex:"Construire un jeu d'adresse électrique, une maquette de maison éclairée, ou tester la conductivité de matériaux (isolants/conducteurs)."},
    {t:"L'environnement numérique", cat:"Numérique", obj:"Commencer à s'approprier un environnement numérique.", ex:"Rédiger le compte-rendu ou la une d'un journal scolaire en utilisant un traitement de texte, la mise en page et le correcteur orthographique."}
  ],
  C3: [
    {t:"Classification et évolution", cat:"Vivant", obj:"Classer les organismes, exploiter les liens de parenté pour comprendre et expliquer l'évolution des organismes.", ex:"Réaliser une classification d'animaux en « groupes emboîtés » ; construire un arbre de parenté ; observer des cellules au microscope."},
    {t:"Alimentation humaine", cat:"Corps & santé", obj:"Expliquer les besoins variables en aliments de l'être humain ; l'origine et les techniques mises en œuvre pour transformer et conserver les aliments.", ex:"Fabriquer du yaourt ou du pain pour observer l'action des micro-organismes ; analyser étiquettes et dates de péremption."},
    {t:"Prévention et santé", cat:"Corps & santé", obj:"Apprendre à devenir responsable pour sa santé : prévenir les comportements à risques (addictions…).", ex:"Mener des recherches documentaires sur la toxicité du tabac, de l'alcool, du cannabis pour débattre et faire des choix responsables."},
    {t:"Développement et reproduction", cat:"Vivant", obj:"Décrire comment les êtres vivants se développent et deviennent aptes à se reproduire.", ex:"Suivre le cycle de développement du moustique pour lutter contre la dengue ; nommer et situer les changements liés à la puberté."},
    {t:"La matière organique", cat:"Matière", obj:"Expliquer l'origine de la matière organique des êtres vivants et son devenir.", ex:"Expériences avec des végétaux plantés avec/sans eau ou avec/sans lumière ; observer le rôle des décomposeurs via le compostage."},
    {t:"L'évolution des objets", cat:"Objets & techniques", obj:"Identifier les principales évolutions du besoin et des objets.", ex:"Construire une frise chronologique des évolutions techniques et des matériaux d'un objet (vélo, lampe...) au fil du temps."},
    {t:"Fonctionnement des objets techniques", cat:"Objets & techniques", obj:"Décrire le fonctionnement d'objets techniques, leurs fonctions et leurs constitutions.", ex:"Isoler les pièces d'un mécanisme en fonctionnement pour en faire des schémas d'explication ou des croquis à main levée."},
    {t:"Les familles de matériaux", cat:"Matière", obj:"Identifier les principales familles de matériaux.", ex:"Justifier le choix d'un matériau pour une maquette selon ses contraintes, son aptitude au recyclage ou son impact environnemental."},
    {t:"Conception technologique", cat:"Objets & techniques", obj:"Concevoir et produire tout ou partie d'un objet technique en équipe pour traduire une solution technologique répondant à un besoin.", ex:"Créer la maquette réelle ou le prototype virtuel d'un objet en respectant un cahier des charges, un planning et des protocoles d'assemblage."},
    {t:"Gestion de l'information", cat:"Numérique", obj:"Repérer et comprendre la communication et la gestion de l'information.", ex:"Découvrir l'algorithmique de base avec des logiciels visuels simples ; utiliser un ENT pour stocker et partager des données de groupe."},
    {t:"Constitution de la matière", cat:"Matière", obj:"Décrire les états et la constitution de la matière à l'échelle macroscopique.", ex:"Réaliser un mélange eau/sable puis eau/sucre pour distinguer mélange et dissolution ; observer et expliquer un changement d'état."},
    {t:"Les mouvements", cat:"Matière", obj:"Observer et décrire différents types de mouvements.", ex:"Observer et comparer des mouvements du quotidien (rectiligne, circulaire, translation) : bille, balançoire, roue de vélo."},
    {t:"L'énergie", cat:"Matière", obj:"Identifier différentes ressources en énergie et connaître quelques conversions d'énergie.", ex:"Identifier les sources d'énergie utilisées à l'école et observer une conversion d'énergie avec une dynamo de vélo ou un panneau solaire."},
    {t:"Le signal et l'information", cat:"Numérique", obj:"Identifier un signal et une information.", ex:"Coder et transmettre un message simple (morse, lampe, drapeaux) pour identifier le signal utilisé et l'information transmise."},
    {t:"La Terre dans le système solaire", cat:"Terre", obj:"Situer la Terre dans le système solaire et caractériser les conditions de la vie terrestre.", ex:"Construire une maquette simple du système solaire à l'échelle et situer la Terre parmi les planètes."},
    {t:"Enjeux environnementaux", cat:"Terre", obj:"Identifier des enjeux liés à l'environnement.", ex:"Enquêter sur le tri des déchets de l'école et proposer des actions concrètes pour réduire son impact environnemental."}
  ]
};
const CYCLE_LABEL = {C1:"Cycle 1", C2:"Cycle 2", C3:"Cycle 3"};
const DOMAINES_SOCLE = [
  ["D1","Les langages pour penser et communiquer"],
  ["D2","Les méthodes et outils pour apprendre"],
  ["D3","La formation de la personne et du citoyen"],
  ["D4","Les systèmes naturels et les systèmes techniques"],
  ["D5","Les représentations du monde et l'activité humaine"]
];
const STEPS = [
  ["situation","1. Situation déclenchante"],
  ["questionnement","2. Questionnement"],
  ["hypotheses","3. Hypothèses"],
  ["investigation","4. Investigation"],
  ["miseEnCommun","5. Mise en commun"],
  ["structuration","6. Structuration"],
  ["reinvestissement","7. Réinvestissement"]
];
const MODALITES = ["Individuel", "Binôme", "Petit groupe", "Collectif"];
const DOMAINE_ENSEIGNEMENT_PAR_CYCLE = { C1: "Explorer le monde", C2: "Questionner le monde", C3: "Sciences et technologie" };

/* Repères de progressivité officiels — Sciences et technologie, Nouvelle-Calédonie (C1 à C3) */
const PROGRAMMES_DATA = {
  C1: [
    {
      nom: "Explorer le monde du vivant, de la matière et des objets",
      domainesSocle: ["D1","D2","D4"],
      competences: "Non détaillées séparément dans les repères du cycle 1 (structure propre à la maternelle) — chaque attendu intègre déjà la compétence visée.",
      attendus: [
        "Reconnaître les principales étapes du développement d'un animal.",
        "Reconnaître les principales étapes du développement d'un végétal, dans une situation d'observation du réel ou sur une image.",
        "Connaître les besoins essentiels de quelques animaux.",
        "Connaître les besoins essentiels de quelques végétaux.",
        "Situer et nommer les différentes parties du corps humain, sur soi ou sur une représentation.",
        "Connaître et mettre en œuvre quelques règles d'hygiène et de vie saine pour soi, pour les autres et pour l'environnement.",
        "Commencer à adopter une attitude responsable en matière de respect des lieux et de protection du vivant.",
        "Choisir, utiliser et savoir désigner des outils et des matériaux adaptés à une situation, à des actions techniques spécifiques (plier, couper, coller, assembler, actionner…).",
        "Distinguer des réalités différentes selon leurs caractéristiques sensorielles.",
        "Réaliser des constructions – construire des maquettes simples en fonction de plans ou d'instructions de montage.",
        "Prendre en compte les risques de l'environnement familier proche (objets et comportements dangereux, produits toxiques).",
        "Utiliser des objets numériques : appareil photo, tablette, ordinateur.",
      ],
    },
  ],
  C2: [
    {
      nom: "Questionner le monde du vivant (Comment reconnaître le monde vivant ?)",
      domainesSocle: ["D1","D2","D3","D4"],
      competences: "Pratiquer des démarches scientifiques : pratiquer, avec l'aide des enseignants, quelques moments d'une démarche d'investigation (questionnement, observation, expérience, description, raisonnement, conclusion). S'approprier des outils et des méthodes : choisir ou utiliser le matériel adapté ; manipuler avec soin. Pratiquer des langages : communiquer à l'oral et à l'écrit avec précision ; lire des textes documentaires ; restituer des observations. Adopter un comportement éthique et responsable : développer un comportement responsable vis-à-vis de l'environnement et de la santé ; mettre en pratique des éco-gestes.",
      attendus: [
        "Connaître des caractéristiques du monde vivant, ses interactions, sa diversité.",
        "Reconnaître des comportements favorables à sa santé.",
      ],
    },
    {
      nom: "Questionner le monde de la matière (Qu'est-ce que la matière ?)",
      domainesSocle: ["D1","D2","D4","D5"],
      competences: "Pratiquer des démarches scientifiques : pratiquer, avec l'aide des enseignants, quelques moments d'une démarche d'investigation. S'approprier des outils et des méthodes : choisir ou utiliser le matériel adapté ; manipuler avec soin. Pratiquer des langages : communiquer à l'oral et à l'écrit avec précision ; lire des textes documentaires ; restituer des observations.",
      attendus: [
        "Identifier les trois états de la matière et observer des changements d'états.",
        "Identifier un changement d'état de l'eau dans un phénomène de la vie quotidienne.",
      ],
    },
    {
      nom: "Questionner le monde des objets techniques",
      domainesSocle: ["D1","D2","D4","D5"],
      competences: "S'approprier des outils et des méthodes : choisir ou utiliser le matériel adapté ; manipuler avec soin. Pratiquer des langages : communiquer à l'oral et à l'écrit avec précision ; lire des textes documentaires ; restituer des observations. Pratiquer des démarches scientifiques : pratiquer, avec l'aide des enseignants, quelques moments d'une démarche d'investigation. Imaginer, réaliser : observer des objets simples et des situations de la vie quotidienne ; imaginer et réaliser des objets simples et de petits montages.",
      attendus: [
        "Comprendre la fonction et le fonctionnement d'objets fabriqués.",
        "Réaliser quelques objets et circuits électriques simples, en respectant des règles élémentaires de sécurité.",
        "Commencer à s'approprier un environnement numérique.",
      ],
    },
  ],
  C3: [
    {
      nom: "Le vivant, sa diversité et les fonctions qui le caractérisent",
      domainesSocle: ["D1","D2","D4","D5"],
      competences: "Pratiquer des démarches scientifiques et technologiques (D4) : formuler une question ou une problématique simple ; proposer une ou des hypothèses ; proposer des expériences pour tester une hypothèse ; interpréter un résultat ; formaliser sa recherche à l'écrit ou à l'oral. Concevoir, créer, réaliser (D4/D5). S'approprier des outils et des méthodes (D2) : choisir le matériel adapté, mesurer, garder une trace écrite, mener des recherches documentaires. Pratiquer des langages (D1) : rendre compte avec un vocabulaire précis, exploiter des documents, utiliser différents modes de représentation.",
      attendus: [
        "Classer les organismes, exploiter les liens de parenté pour comprendre et expliquer l'évolution des organismes.",
        "Expliquer les besoins variables en aliments de l'être humain ; l'origine et les techniques mises en œuvre pour transformer et conserver les aliments.",
        "Apprendre à devenir responsable pour sa santé : prévenir les comportements à risques (addictions…).",
        "Décrire comment les êtres vivants se développent et deviennent aptes à se reproduire.",
        "Expliquer l'origine de la matière organique des êtres vivants et son devenir.",
      ],
    },
    {
      nom: "Matière, mouvement, énergie, information",
      domainesSocle: ["D1","D2","D4","D5"],
      competences: "Pratiquer des démarches scientifiques et technologiques (D4) : formuler une question ou une problématique simple ; proposer une ou des hypothèses ; proposer des expériences pour tester une hypothèse ; interpréter un résultat ; formaliser sa recherche à l'écrit ou à l'oral. Concevoir, créer, réaliser (D4/D5). S'approprier des outils et des méthodes (D2) : choisir le matériel adapté, mesurer, garder une trace écrite, mener des recherches documentaires. Pratiquer des langages (D1) : rendre compte avec un vocabulaire précis, exploiter des documents, utiliser différents modes de représentation.",
      attendus: [
        "Décrire les états et la constitution de la matière à l'échelle macroscopique.",
        "Observer et décrire différents types de mouvements.",
        "Identifier différentes ressources en énergie et connaître quelques conversions d'énergie.",
        "Identifier un signal et une information.",
      ],
    },
    {
      nom: "Matériaux et objets techniques",
      domainesSocle: ["D1","D2","D4","D5"],
      competences: "Pratiquer des démarches scientifiques et technologiques (D4) : formuler une question ou une problématique simple ; proposer une ou des hypothèses ; proposer des expériences pour tester une hypothèse ; interpréter un résultat ; formaliser sa recherche à l'écrit ou à l'oral. Concevoir, créer, réaliser (D4/D5). S'approprier des outils et des méthodes (D2) : choisir le matériel adapté, mesurer, garder une trace écrite, mener des recherches documentaires. Pratiquer des langages (D1) : rendre compte avec un vocabulaire précis, exploiter des documents, utiliser différents modes de représentation.",
      attendus: [
        "Identifier les principales évolutions du besoin et des objets.",
        "Décrire le fonctionnement d'objets techniques, leurs fonctions et leurs constitutions.",
        "Identifier les principales familles de matériaux.",
        "Concevoir et produire tout ou partie d'un objet technique en équipe pour traduire une solution technologique répondant à un besoin.",
        "Repérer et comprendre la communication et la gestion de l'information.",
      ],
    },
    {
      nom: "La planète Terre. Les êtres vivants dans leur environnement",
      domainesSocle: ["D1","D2","D4","D5"],
      competences: "Pratiquer des démarches scientifiques et technologiques (D4) : formuler une question ou une problématique simple ; proposer une ou des hypothèses ; proposer des expériences pour tester une hypothèse ; interpréter un résultat ; formaliser sa recherche à l'écrit ou à l'oral. Concevoir, créer, réaliser (D4/D5). S'approprier des outils et des méthodes (D2) : choisir le matériel adapté, mesurer, garder une trace écrite, mener des recherches documentaires. Pratiquer des langages (D1) : rendre compte avec un vocabulaire précis, exploiter des documents, utiliser différents modes de représentation.",
      attendus: [
        "Situer la Terre dans le système solaire et caractériser les conditions de la vie terrestre.",
        "Identifier des enjeux liés à l'environnement.",
      ],
    },
  ],
};

/* Aide condensée par étape (objectifs + rôle de l'enseignant), affichée au survol/clic du titre */
const STEP_HELP = {
  situation: {
    objectifs: ["Éveiller la curiosité et l'intérêt", "Créer un questionnement", "Introduire le phénomène à explorer"],
    role: ["Proposer une situation riche et accessible", "Valoriser toutes les réactions des élèves", "Relancer sans donner de réponse"]
  },
  questionnement: {
    objectifs: ["Formuler une ou plusieurs questions", "Cibler le problème à résoudre", "Définir l'objectif de la recherche"],
    role: ["Aider à trier et faire émerger les idées", "Guider vers la question la plus investigable", "S'assurer qu'elle est claire et adaptée"]
  },
  hypotheses: {
    objectifs: ["Mobiliser connaissances et imagination", "Formuler des réponses possibles à tester", "Justifier et prédire un résultat"],
    role: ["Encourager toutes les idées sans juger", "Aider à formuler et justifier", "Rappeler qu'il n'y a pas de mauvaise idée"]
  },
  investigation: {
    objectifs: ["Tester les hypothèses (expérience, observation)", "Recueillir des données fiables", "Respecter les règles de sécurité"],
    role: ["Expliquer le protocole et les consignes", "Organiser matériel et groupes", "Accompagner sans donner la réponse"]
  },
  miseEnCommun: {
    objectifs: ["Présenter ses résultats clairement", "Comparer et confronter les idées", "Dégager points communs et différences"],
    role: ["Organiser les prises de parole", "Garantir un climat d'écoute", "Relancer la discussion par des questions"]
  },
  structuration: {
    objectifs: ["Synthétiser les résultats et idées essentielles", "Construire une trace écrite claire", "Valider et corriger les erreurs"],
    role: ["Guider pour dégager l'essentiel", "Aider à rédiger la trace écrite collective", "Enrichir le vocabulaire abordé"]
  },
  reinvestissement: {
    objectifs: ["Mobiliser les connaissances ailleurs", "Transférer les savoirs à un nouveau contexte", "Ancrer les apprentissages"],
    role: ["Proposer une situation nouvelle et porteuse de sens", "Accompagner sans donner la réponse", "Valoriser réussites et progrès"]
  }
};
