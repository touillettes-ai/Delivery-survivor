// ==== Personnages jouables : la Delivery Team ====
// Chacun démarre avec 1 arme (weapon) et 1 bonus :
// - soit un effet direct : bonus { icon, name, desc } + apply(p)
// - soit un processus ITIL déjà acquis : passives { id: 1 } (nom et descriptif repris de PASSIVES)
// Et 1 super pouvoir (touche Espace) : special { name, icon, desc, type, ... }, types gérés dans game.js :
// rain (pluie d'objets), dash (fonce sur les ennemis), giant (suiveur géant), squad (renforts),
// barrage (projectiles sur chaque ennemi), train (gros train), laugh (fou rire général), shout (cri)
const TEAMS = ['Management', 'Support', 'Opérationnel', 'Agilité', 'Process'];

// Annonces vocales du jeu (enregistrables dans le studio recorder.html : voices/<key>.webm)
const ANNOUNCES = [
  { key: 'boss',      label: "Arrivée d'un directeur", text: 'Un directeur arrive !' },
  { key: 'fatality',  label: "Mort d'un directeur",    text: 'Fatality !' },
  { key: 'legendary', label: 'Arme légendaire',        text: 'Arme légendaire !' },
  { key: 'chocolate', label: 'Pluie de chocolat',      text: 'Pluie de chocolat !' },
];

// Répliques des directeurs : arrival = réplique d'arrivée (lue à voix haute, enregistrable : voices/boss_<id>.webm),
// taunts = petites piques en bulle pendant le combat
const BOSS_LINES = {
  dsi: { name: 'DSI', arrival: 'Qui a redémarré le serveur de prod ?!', taunts: ['Ton ticket est en attente.', 'Tu as essayé de redémarrer ?', "Ce n'est pas dans le périmètre.", 'On verra ça au prochain COPIL.'] },
  drh: { name: 'DRH', arrival: "Il faut qu'on parle de ton entretien annuel…", taunts: ['Tu as bien posé tes congés ?', 'Ça restera entre nous.', "J'ai recruté des stagiaires !", 'Ta mutuelle couvre ça ?'] },
  daf: { name: 'DAF', arrival: 'On va devoir parler de ton budget…', taunts: ["Cette dépense n'était pas prévue.", 'Il faut faire des économies !', "C'est hors budget.", 'Tu as une note de frais ?'] },
  pdg: { name: 'PDG', arrival: 'Bonjour à tous : petite réorganisation !', taunts: ['On est une grande famille.', 'Il faut être agile !', "La vision, c'est moi.", 'Les résultats sont excellents… pour moi.'] },
};

// Niveau 4 : les directeurs deviennent des monstres (voix enregistrable : voices/fboss_<id>.webm)
const FAIRY_BOSSES = {
  dsi: { name: 'Dragon', sprite: 'dragon', banner: '⚠ Un dragon surgit !', arrival: 'GRRR… Qui a encore touché à mon trésor ?', taunts: ['Je vais tout brûler !', "Mon trésor, c'est la prod !", 'Roooaaar !', 'Ça sent le roussi…'] },
  drh: { name: 'Sorcière', sprite: 'witch', banner: '⚠ Une sorcière approche !', arrival: "Hé hé hé… Mes petites fées, à l'attaque !", taunts: ['Un sort pour ton entretien annuel…', 'Abracadabra !', 'Tu veux une pomme ?', 'Mon chaudron déborde de CV.'] },
  daf: { name: 'Loup-garou', sprite: 'werewolf', banner: '⚠ Un loup-garou rôde !', arrival: 'Aouuuh ! Les budgets sont maigres ce mois-ci…', taunts: ["J'ai les crocs !", 'Aouuuh !', 'Cette dépense, je la croque.', 'Pleine lune, plein budget.'] },
  pdg: { name: 'Roi des Trolls', sprite: 'trollking', banner: '⚠ Le Roi des Trolls arrive !', arrival: "Ici, c'est MON pont… et MA réorganisation !", taunts: ['Péage obligatoire !', 'Les trolls, une grande famille.', 'Qui ose traverser ?', 'Je troll, donc je suis.'] },
};

// Niveau 2 : mascottes qui gardent les couloirs (voix enregistrable : voices/mascot_<id>.webm)
const MASCOT_BOSSES = {
  rabbit: { name: 'Lapin mascotte', icon: '🐰', sprite: 'mascotRabbit', ai: ['charge'], arrival: "Tu n'iras pas plus loin sans badge !", taunts: ['Hop hop hop !', 'Une carotte ?', "Badge, s'il vous plaît !"],
    angry: "Tu m'as abîmé mon beau costume ! Tu vas me le payer !", angryTaunts: ['Mes oreilles sont toutes tordues !', 'Ça va être ta fête !', 'Plus de carottes pour toi !'] },
  bear: { name: 'Ourson mascotte', icon: '🐻', sprite: 'mascotBear', ai: ['charge', 'summon'], arrival: 'Grrr… Personne ne passe sans mon badge !', taunts: ["Câlin d'ours !", 'Grrr !', 'Accès refusé !'],
    angry: "GRRR ! Regarde ma fourrure ! Personne n'entre dans la salle PI !", angryTaunts: ['Je suis tout recousu !', 'GRRR !', 'La PI, c\u2019est fermé !'] },
};

// Super pouvoir partagé par les deux Delivery Managers
const SPECIAL_MEP = { name: 'Pluie de MEP', icon: '📋', desc: 'Une pluie de demandes de mise en production tombe du ciel sur les ennemis.', type: 'rain', sprite: 'request' };

const CHARACTERS = {
  coline: {
    name: 'Coline', role: 'Manager Delivery', team: 'Management',
    desc: "Toujours entre deux salles de réunion, c'est elle la cheffe.",
    weapon: 'postit',
    bonus: { icon: '🏃', name: 'Marathon de réunions', desc: '+15% de vitesse' },
    apply: p => p.speed *= 1.15,
    special: { name: 'Enchaînement de réu', icon: '🏃‍♀️', desc: "Fonce sur les ennemis à l'écran et les élimine un par un.", type: 'dash' },
  },
  amelie: {
    name: 'Amélie', role: 'Appui Management', team: 'Management',
    desc: "Quand on ne lui remonte pas d'alertes, elle chante du Céline Dion avec une justesse inégalée.",
    weapon: 'diaper',
    bonus: { icon: '🤝', name: 'Appui au management', desc: '+0,5 PV / seconde' },
    apply: p => p.regen += 0.5,
    special: { name: "Remontée d'alerte", icon: '🚨', desc: 'Une pluie d\'alarmes tombe du ciel sur les ennemis.', type: 'rain', sprite: 'alarm' },
  },
  sheryna: {
    name: 'Sheryna', role: 'Coordinatrice CAC', team: 'Support',
    desc: "Petite, rapide, son rire porte si loin qu'on l'entend rire depuis la Corse.",
    weapon: 'laugh',
    bonus: { icon: '⚡', name: 'Petite et rapide', desc: '+30% de vitesse' },
    apply: p => { p.speed *= 1.3; p.r = 11; }, // r : hitbox plus petite, comme son sprite
    follower: true, // un collègue qui la suit partout, sans aucune utilité
    special: { name: 'Au secours !', icon: '🆘', desc: "Le collègue qui la suit devient géant et écrase les ennemis à l'écran.", type: 'giant' },
  },
  youssef: {
    name: 'Youssef', role: 'Configuration Manager', team: 'Support',
    desc: 'Il balance la CMDB à la figure des intrus. Entre deux lancers, il ajoute de nouveaux serveurs.',
    weapon: 'database',
    bonus: { icon: '👑', name: 'Roi de la CMDB', desc: '+30% de vitesse des projectiles' },
    apply: p => p.projSpeed *= 1.3,
    special: { name: 'Remplissage de la CMDB', icon: '🗄️', desc: 'Une pluie de bases de données tombe du ciel sur les ennemis.', type: 'rain', sprite: 'database' },
  },
  imen: {
    name: 'Imen', role: 'Contrôleuse de gestion', team: 'Support',
    desc: "Aucune dépense ne lui échappe, et elle optimise chaque point d'expérience.",
    weapon: 'diaper',
    bonus: { icon: '💶', name: 'Optimisation budgétaire', desc: "+20% d'XP gagnée" },
    apply: p => p.xpMult *= 1.2,
    special: { name: 'Remplissage du PMT', icon: '💵', desc: 'Une pluie de dollars tombe du ciel sur les ennemis.', type: 'rain', sprite: 'dollar' },
  },
  cecile: {
    name: 'Cécile', role: 'Delivery Manager', team: 'Opérationnel',
    desc: "C'est elle qui dit GO ou NO GO.",
    weapon: 'gonogo',
    bonus: { icon: '🧲', name: 'Radar à livraisons', desc: '+50% de rayon de ramassage' },
    apply: p => p.magnet *= 1.5,
    special: SPECIAL_MEP,
  },
  franck: {
    name: 'Franck', role: 'Delivery Manager', team: 'Opérationnel',
    desc: "C'est lui qui dit GO ou NO GO. Sauf pour Prépa V2 : il a dit GO, et la suite… on la connaît.",
    weapon: 'gonogo',
    bonus: { icon: '🧘', name: 'Zen en toute circonstance', desc: '+1 PV / seconde' },
    apply: p => p.regen += 1,
    special: SPECIAL_MEP,
  },
  danila: {
    name: 'Danila', role: 'Responsable Qualité', team: 'Opérationnel',
    desc: "Agent Danila : avec elle, aucune mission n'est impossible.",
    weapon: 'beer',
    bonus: { icon: '✅', name: 'Zéro défaut', desc: '-3 dégâts subis par coup' },
    apply: p => p.armor += 3,
    special: { name: 'Visite en ACR', icon: '🦺', desc: '5 renforts (4 au collier rouge, 1 au collier bleu) débarquent et éliminent les ennemis.', type: 'squad' },
  },
  hakim: {
    name: 'Hakim', role: 'Expert IA', team: 'Opérationnel',
    desc: "Il bombarde les collègues de logos d'IA qui trouvent leur cible tout seuls.",
    weapon: 'ai',
    passives: { magnet: 1 },
    special: { name: 'Prompt magique', icon: '💻', desc: 'Sort son PC et tape un prompt : chaque ligne de code part éliminer un ennemi.', type: 'barrage', sprites: ['code1', 'code2', 'code3'], laptop: true },
  },
  matthieu: {
    name: 'Matthieu', role: 'Release Train Engineer', team: 'Agilité',
    desc: "Le train part à l'heure, avec ou sans toi.",
    weapon: 'train',
    bonus: { icon: '🗓️', name: 'Organisation de PI', desc: '-10% de temps de recharge' },
    apply: p => p.cdMult *= 0.9,
    special: { name: 'Clôture du PI', icon: '📯', desc: 'Un coup de sifflet fige tout le monde, puis un énorme train roule sur les ennemis.', type: 'train' },
  },
  arno: {
    name: 'Arno', role: 'Chef de projet Agile', team: 'Agilité',
    desc: 'Ses avions en papier livrent à chaque sprint.',
    weapon: 'plane',
    passives: { speed: 1 },
    special: { name: 'Népal attitude', icon: '🧘', desc: 'Entre en lévitation, et des rochers tombent du ciel sur les ennemis.', type: 'rain', sprite: 'rock', levitate: true },
  },
  justine: {
    name: 'Justine', role: 'Release Train Engineer', team: 'Agilité',
    desc: "Le train part à l'heure, avec ou sans toi.",
    weapon: 'train',
    bonus: { icon: '🗓️', name: 'Organisation de PI', desc: '-10% de temps de recharge' },
    apply: p => p.cdMult *= 0.9,
    special: { name: 'Rire communicatif', icon: '🤣', desc: 'Éclate de rire : tous les ennemis se mettent à rire et meurent de rire.', type: 'laugh', lines: ['HAHAHAHA !'] },
  },
  sandie: {
    name: 'Sandie', role: 'Change Manager', team: 'Process',
    desc: 'Aucun changement ne passe sans elle. Aucune dérogation possible !',
    weapon: 'stapler',
    passives: { haste: 1 },
    special: { name: 'ECAB du vendredi 17h25', icon: '😱', desc: 'Crie « NOOOOON ! » : les ondes de choc tuent les ennemis sur le coup.', type: 'shout' },
  },
  stephan: {
    name: 'Stephan', role: 'Incident Problème Crise Manager', team: 'Process',
    desc: "Des crises, il en a vu d'autres.",
    weapon: 'keyboard',
    passives: { might: 1 },
    special: {
      name: 'Blague de Stef', icon: '🃏', desc: 'Raconte une blague : tous les ennemis meurent de rire.', type: 'laugh',
      lines: ["Un ticket entre dans un bar… il est résolu !", 'Tu connais la blague du serveur ? Il est down.', "C'est pas un bug, c'est une feature !"],
    },
  },
  bastien: {
    name: 'Bastien', role: 'Incident Manager', team: 'Process',
    desc: 'Son crâne chauve reflète les néons. Aucun incident ne lui résiste.',
    weapon: 'mouse',
    passives: { might: 1 },
    special: { name: 'Distribution de tickets', icon: '🎫', desc: 'Lance des tickets sur tous les ennemis pour les éliminer.', type: 'barrage', sprites: ['ticket'] },
  },
  olivier: {
    name: 'Olivier', role: 'Référent SPICE Demande de service', team: 'Process',
    desc: 'Chignon et grande barbe rousse, et une patience à toute épreuve.',
    weapon: 'cable',
    bonus: { icon: '🔀', name: 'Nouveau Workflow', desc: '+40 PV max' },
    apply: p => { p.maxHp += 40; p.hp += 40; },
    special: { name: 'SPICE master', icon: '📊', desc: 'Envoie des graphiques sur tous les ennemis.', type: 'barrage', sprites: ['chart1', 'chart2'] },
  },
};

// Bonus de départ d'un personnage, au format { icon, name, desc }
function charBonus(c) {
  if (c.bonus) return c.bonus;
  const d = PASSIVES[Object.keys(c.passives)[0]];
  return { icon: d.icon, name: d.name, desc: d.desc };
}
