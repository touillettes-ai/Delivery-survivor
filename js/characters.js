// ==== Personnages jouables : la Delivery Team ====
// Chacun démarre avec 1 arme (weapon) et 1 bonus :
// - soit un effet direct : bonus { icon, name, desc } + apply(p)
// - soit un processus ITIL déjà acquis : passives { id: 1 } (nom et descriptif repris de PASSIVES)
const TEAMS = ['Management', 'Support', 'Opérationnel', 'Agilité', 'Process'];

const CHARACTERS = {
  coline: {
    name: 'Coline', role: 'Manager Delivery', team: 'Management',
    desc: 'Longs cheveux bruns ondulés, toujours entre deux salles de réunion.',
    weapon: 'postit',
    bonus: { icon: '🏃', name: 'Marathon de réunions', desc: '+15% de vitesse' },
    apply: p => p.speed *= 1.15,
  },
  amelie: {
    name: 'Amélie', role: 'Appui Management', team: 'Management',
    desc: "Sa crinière rousse se repère de loin dans l'open space. Et ses couches aussi.",
    weapon: 'diaper',
    bonus: { icon: '🤝', name: 'Appui au management', desc: '+0,5 PV / seconde' },
    apply: p => p.regen += 0.5,
  },
  sheryna: {
    name: 'Sheryna', role: 'Coordinatrice CAC', team: 'Support',
    desc: 'Cheveux bruns lisses. Petite, rapide, et son rire porte loin.',
    weapon: 'laugh',
    bonus: { icon: '⚡', name: 'Petite et rapide', desc: '+30% de vitesse' },
    apply: p => { p.speed *= 1.3; p.r = 11; }, // r : hitbox plus petite, comme son sprite
    follower: true, // un collègue qui la suit partout, sans aucune utilité
  },
  youssef: {
    name: 'Youssef', role: 'Configuration Manager', team: 'Support',
    desc: 'Barbe noire impeccable. Il balance la CMDB à la figure des intrus.',
    weapon: 'database',
    bonus: { icon: '👑', name: 'Roi de la CMDB', desc: '+30% de vitesse des projectiles' },
    apply: p => p.projSpeed *= 1.3,
  },
  imen: {
    name: 'Imen', role: 'Contrôleuse de gestion', team: 'Support',
    desc: "Aucune dépense ne lui échappe, et elle optimise chaque point d'expérience.",
    weapon: 'diaper',
    bonus: { icon: '💶', name: 'Optimisation budgétaire', desc: "+20% d'XP gagnée" },
    apply: p => p.xpMult *= 1.2,
  },
  cecile: {
    name: 'Cécile', role: 'Delivery Manager', team: 'Opérationnel',
    desc: "Blonde aux cheveux ondulés. C'est elle qui dit GO ou NO GO.",
    weapon: 'gonogo',
    bonus: { icon: '🧲', name: 'Radar à livraisons', desc: '+50% de rayon de ramassage' },
    apply: p => p.magnet *= 1.5,
  },
  franck: {
    name: 'Franck', role: 'Delivery Manager', team: 'Opérationnel',
    desc: "Lunettes et grand sourire. L'expérience parle.",
    weapon: 'gonogo',
    bonus: { icon: '🧘', name: 'Zen en toute circonstance', desc: '+1 PV / seconde' },
    apply: p => p.regen += 1,
  },
  danila: {
    name: 'Danila', role: 'Responsable Qualité', team: 'Opérationnel',
    desc: 'Zéro défaut toléré, et les coups glissent sur elle.',
    weapon: 'beer',
    bonus: { icon: '✅', name: 'Zéro défaut', desc: '-3 dégâts subis par coup' },
    apply: p => p.armor += 3,
  },
  hakim: {
    name: 'Hakim', role: 'Expert IA', team: 'Opérationnel',
    desc: "Il bombarde les collègues de logos d'IA qui trouvent leur cible tout seuls.",
    weapon: 'ai',
    passives: { magnet: 1 },
  },
  matthieu: {
    name: 'Matthieu', role: 'Release Train Engineer', team: 'Agilité',
    desc: "Le train part à l'heure, avec ou sans toi.",
    weapon: 'train',
    bonus: { icon: '🗓️', name: 'Organisation de PI', desc: '-10% de temps de recharge' },
    apply: p => p.cdMult *= 0.9,
  },
  arno: {
    name: 'Arno', role: 'Chef de projet Agile', team: 'Agilité',
    desc: 'Barbe poivre et sel. Ses avions en papier livrent à chaque sprint.',
    weapon: 'plane',
    passives: { speed: 1 },
  },
  justine: {
    name: 'Justine', role: 'Chef de projet Agile', team: 'Agilité',
    desc: 'Cheveux bruns frisés. Ses rétros vont toujours à la cause racine.',
    weapon: 'plane',
    passives: { area: 1 },
  },
  sandie: {
    name: 'Sandie', role: 'Change Manager', team: 'Process',
    desc: 'Longs cheveux châtains. Aucun changement ne passe sans elle.',
    weapon: 'stapler',
    passives: { haste: 1 },
  },
  stephan: {
    name: 'Stephan', role: 'Incident Problème Crise Manager', team: 'Process',
    desc: "Cheveux blancs en bataille. Des crises, il en a vu d'autres.",
    weapon: 'keyboard',
    passives: { might: 1 },
  },
  bastien: {
    name: 'Bastien', role: 'Incident Manager', team: 'Process',
    desc: 'Son crâne chauve reflète les néons. Personne ne lui résiste.',
    weapon: 'coffee',
    passives: { might: 1 },
  },
  olivier: {
    name: 'Olivier', role: 'Référent SPICE Demande de service', team: 'Process',
    desc: 'Chignon et grande barbe rousse, et une patience à toute épreuve.',
    weapon: 'cable',
    bonus: { icon: '🔀', name: 'Nouveau Workflow', desc: '+40 PV max' },
    apply: p => { p.maxHp += 40; p.hp += 40; },
  },
};

// Bonus de départ d'un personnage, au format { icon, name, desc }
function charBonus(c) {
  if (c.bonus) return c.bonus;
  const d = PASSIVES[Object.keys(c.passives)[0]];
  return { icon: d.icon, name: d.name, desc: d.desc };
}
