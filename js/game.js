// ==== Boucle principale du jeu ====
const MAX_ENEMIES = 500;
const MAX_WEAPONS = 4, MAX_PASSIVES = 4;
const DEMO_MODE = false; // Mode démo : chaque personnage démarre avec son arme en version légendaire
const XP_FACTOR = 0.95; // XP nécessaire pour monter de niveau (0.95 = -5%)

// Les collègues qui veulent "juste 5 minutes" de ton temps (flying : ignore le mobilier)
const ENEMIES = {
  intern:     { hp: 5,  speed: 100, dmg: 5,  r: 12, xp: 1,  color: '#40a060' },
  coworker:   { hp: 16, speed: 55,  dmg: 8,  r: 14, xp: 2,  color: '#d8dce4' },
  commercial: { hp: 22, speed: 95,  dmg: 10, r: 14, xp: 3,  color: '#4a6a9a' },
  manager:    { hp: 28, speed: 80,  dmg: 12, r: 14, xp: 4,  color: '#2a2a3a' },
  rh:         { hp: 45, speed: 50,  dmg: 14, r: 14, xp: 5,  color: '#e07090' },
  director:   { hp: 0,  speed: 60,  dmg: 25, r: 30, xp: 50, color: '#1a1a2a', name: 'Directeur' }, // boss, PV calculés à l'apparition
};

// Qui arrive à partir de quand (secondes) et avec quel poids
const SPAWN_TABLE = [
  { type: 'intern',     from: 0,   w: 3 },
  { type: 'coworker',   from: 30,  w: 3 },
  { type: 'commercial', from: 90,  w: 2 },
  { type: 'manager',    from: 150, w: 2 },
  { type: 'rh',         from: 240, w: 1.5 },
];
const BOSS_TIMES = [120, 240, 360, 480];
const GAME_DURATION = 600; // 10 minutes = de 9h00 à 18h00

// Difficulté par paliers : toutes les 1 min 30, plus d'ennemis et plus résistants
const STAGE_DURATION = 90;
const SPAWN_BASE_INTERVAL = 0.8; // secondes entre deux ennemis au palier 0
const SPAWN_GROWTH = 1.45;       // cadence multipliée à chaque palier (palier 6 ≈ 11 ennemis/s)
const HP_PER_STAGE = 0.75;       // +75% de PV des ennemis par palier
const stageAt = t => Math.floor(t / STAGE_DURATION);
// Chaque arme légendaire rend la partie un peu plus dure (cadence d'apparition et PV des ennemis)
const LEGEND_DIFFICULTY = 0.15;  // +15% par arme légendaire
const LEGEND_BOSS_DELAY = 4;     // secondes avant qu'un directeur vienne quand une arme est au max
const MAX_LEGENDARY = 2;         // nombre max d'armes légendaires par partie
const legendCount = () => game.weapons.filter(w => w.legendary).length;
const legendMult = () => 1 + LEGEND_DIFFICULTY * game.weapons.filter(w => w.legendary).length;

// Le collègue qui suit Sheryna : taille (1 = taille normale) et ce qu'il raconte
const FOLLOWER_SIZE = 0.8;
const FOLLOWER_LINES = [
  'Coucou Sheryna !',
  'Tu vas où ?',
  'Attends-moi !',
  'On se fait un café ?',
  'Tu as 5 minutes ?',
  'T\'as vu mon mail ?',
  'On mange ensemble ?',
  'c est quand le CAC ?',
  'tu vas courir ?',
];
// De temps en temps il fonce sur un ennemi proche et l'élimine d'un coup (sauf élites et directeurs)
const FOLLOWER_DASH_EVERY = [8, 15]; // secondes entre deux attaques (min, max)
const FOLLOWER_DASH_RANGE = 250;     // distance max de Sheryna à la cible
const FOLLOWER_DASH_SPEED = 400;
const FOLLOWER_KILL_LINES = ["Je t'ai géré ça !", 'Pas de quoi Sheryna !'];
const FOLLOWER_MEETING = 30; // durée de sa réunion (double-clic dessus), en secondes

// Couleur de l'aura des armes selon leur niveau (index = niveau, 1 = pas d'aura)
// Index 7 = version légendaire
const LEVEL_COLORS = [null, null, '#ffffff', '#7fd8ff', '#3ad06a', '#b060ff', '#ffd040', '#ff3a6a'];
const LEGENDARY_LEVEL = 7;
const LEVEL_MAX_SPARKLE = 6; // à partir de ce niveau, les projectiles laissent des étincelles
const visualLevel = w => w.legendary ? LEGENDARY_LEVEL : w.level;

// ---- Niveaux ----
// props : [type de meuble, probabilité par zone]
const LEVELS = {
  gtar: {
    icon: '🏢', name: 'Survie à une journée au GTAR',
    desc: "Tiens bon dans l'open space de 9h00 à 18h00. Un directeur débarque toutes les 2 minutes.",
    floor: 'floor', props: [['island', 0.5], ['plant', 0.15], ['printer', 0.1], ['cooler', 0.08]],
  },
  pi: {
    icon: '🌳', name: 'Rejoins la salle PI',
    desc: 'Récupère ton badge, puis traverse les bureaux au parquet, entre patios et arbres, pour ouvrir la salle PI avant 18h00. Suis la flèche !',
    floor: 'parquet', props: [['patio', 0.3], ['sofa', 0.15], ['plant', 0.2], ['cooler', 0.08]],
    goal: true,
  },
};
const PI_DISTANCE = 8000;    // distance entre le départ et la porte de la salle PI
const BADGE_DISTANCE = 4000; // distance entre le départ et le badge (sur le côté)
const PI_ROOM_W = 640, PI_ROOM_H = 480, PI_WALL = 16, PI_DOOR = 140;
const PI_TALK = [
  'Bienvenue au PI !',
  'Voici les objectifs du PI',
  'On passe aux dépendances',
  'Les risques, on les ROAM ?',
  'Vote de confiance : à vos doigts !',
  'Des questions ?',
];

// ---- Événements aléatoires ----
// dur : durée en secondes (événement en cours affiché en bas de l'écran), sinon effet immédiat
const EVENTS = [
  { id: 'incident', text: '🔥 Incident majeur ! Les collègues affluent', label: '🔥 Incident majeur', dur: 20 },
  { id: 'bonus',    text: '🎯 Objectifs atteints : XP ×2 pendant 20 s', label: '🎯 XP ×2', dur: 20 },
  { id: 'coffee',   text: '☕ Pause café ! Des croissants ont été livrés' },
  { id: 'mail',     text: '📧 Mail de 18h : un collègue très énervé arrive !' },
  { id: 'blackout', text: '🔌 Panne de courant : tout le monde est figé !' },
];
const FIRST_EVENT = 45;          // premier événement après 45 s
const EVENT_EVERY = [50, 80];    // puis toutes les 50 à 80 s
const INCIDENT_SPAWN_MULT = 2.5; // incident majeur : 2,5 fois plus d'ennemis

// ---- Objets au sol ----
const TICKET_EVERY = [15, 25];   // un ticket apparaît toutes les 15 à 25 s (3 max au sol)
const TICKET_XP = 0.35;          // un ticket donne 35% de l'XP du niveau en cours
const PRINTER_HP = 25;
const PRINTER_BLAST_R = 110;     // rayon de l'explosion d'une imprimante
const PRINTER_BLAST_DMG = 40;    // + 15 par palier de difficulté
const PRINTER_TICKET_CHANCE = 0.5;

// Plantes cassables
const PLANT_HP = 12;
const PLANT_BOLT_CHANCE = 0.35; // probabilité de lâcher un éclair
const BOLT_HEAL = 15;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let W = 0, H = 0;
function resize() {
  W = canvas.width = innerWidth;
  H = canvas.height = innerHeight;
  ctx.imageSmoothingEnabled = false;
}
addEventListener('resize', resize);
resize();
const floorPatterns = {
  floor: ctx.createPattern(Textures.floor, 'repeat'),
  parquet: ctx.createPattern(Textures.parquet, 'repeat'),
};

let game;
let selectedChar = 'coline';
let selectedLevel = 'gtar';

// ---- Entrées ----
const keys = {};
addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.key && e.key.toLowerCase() === 'm' && !e.repeat) Sfx.toggle(); // couper / remettre le son (e.key : touche M en AZERTY comme en QWERTY)
  if (game.state === 'title') {
    if (e.code === 'Enter' || e.code === 'Space') openCharSelect();
    return;
  }
  if (game.state === 'start') {
    const mv = { ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0], ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1] }[e.code];
    if (mv) { e.preventDefault(); moveCharCursor(...mv); }
    if ((e.code === 'Enter' || e.code === 'Space') && !e.repeat) { e.preventDefault(); openLevelSelect(cursorChar); }
    return;
  }
  if (game.state === 'levels') {
    const ids = Object.keys(LEVELS), i = ids.indexOf(selectedLevel);
    const dy = { ArrowUp: -1, KeyW: -1, ArrowDown: 1, KeyS: 1 }[e.code];
    if (dy) { e.preventDefault(); selectLevel(ids[(i + dy + ids.length) % ids.length]); }
    const digit = /^(Digit|Numpad)[1-9]$/.test(e.code) ? +e.code.slice(-1) - 1 : -1;
    if (ids[digit]) startGame(selectedChar, ids[digit]);
    if ((e.code === 'Enter' || e.code === 'Space') && !e.repeat) { e.preventDefault(); startGame(selectedChar, selectedLevel); }
    if (e.code === 'Escape') { hide('levels'); openCharSelect(); }
    return;
  }
  if (e.code === 'Escape' || e.code === 'KeyP') togglePause();
  if (e.code === 'Space' && game.state === 'play') { e.preventDefault(); activateSpecial(); }
  const digit = /^(Digit|Numpad)[1-9]$/.test(e.code) ? +e.code.slice(-1) - 1 : -1;
  if (digit >= 0 && game.state === 'levelup') pickChoice(digit);
  if ((e.code === 'Enter' || e.code === 'Space') && game.state === 'chest') closeChest();
  else if (e.code === 'Enter' && game.state === 'over') startGame(selectedChar);
});
addEventListener('keyup', e => keys[e.code] = false);
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

// Joystick tactile / souris : on glisse depuis le point de départ
const touch = { active: false, sx: 0, sy: 0, x: 0, y: 0 };
const lastTap = { t: 0, x: 0, y: 0 };
canvas.addEventListener('pointerdown', e => {
  // Clic / tap sur le bouton du super pouvoir
  if (game.state === 'play') {
    const b = specialBtnPos();
    if (Math.hypot(e.clientX - b.x, e.clientY - b.y) < SPECIAL_BTN_R + 8) { activateSpecial(); return; }
  }
  // Double-clic / double tap sur le suiveur de Sheryna : il part en réunion
  const now = performance.now();
  if (now - lastTap.t < 350 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 30) {
    lastTap.t = 0;
    sendFollowerToMeeting(e.clientX, e.clientY);
  } else Object.assign(lastTap, { t: now, x: e.clientX, y: e.clientY });
  touch.active = true;
  touch.sx = touch.x = e.clientX;
  touch.sy = touch.y = e.clientY;
});
addEventListener('pointermove', e => { if (touch.active) { touch.x = e.clientX; touch.y = e.clientY; } });
addEventListener('pointerup', () => touch.active = false);

function sendFollowerToMeeting(sx, sy) {
  const f = game.follower, p = game.player;
  if (!f || f.mode !== 'follow' || game.state !== 'play') return;
  const img = Sprites.follower.right, wx = sx + p.x - W / 2, wy = sy + p.y - H / 2; // écran → monde
  if (Math.abs(wx - f.x) > img.width * FOLLOWER_SIZE / 2 + 8 || Math.abs(wy - f.y) > img.height * FOLLOWER_SIZE / 2 + 8) return;
  game.playerBubble = { text: "Je te laisse, j'ai une réunion", t: 2.5 };
  const dx = f.x - p.x, dy = f.y - p.y, d = Math.hypot(dx, dy) || 1;
  Object.assign(f, { mode: 'leaving', awayT: 2.5, target: null, leaveX: dx / d, leaveY: dy / d, bubble: 0 });
}

// e.code = position physique : KeyW/A/S/D correspond aussi à ZQSD sur AZERTY
function inputDir() {
  let x = 0, y = 0;
  if (keys.KeyW || keys.ArrowUp) y--;
  if (keys.KeyS || keys.ArrowDown) y++;
  if (keys.KeyA || keys.ArrowLeft) x--;
  if (keys.KeyD || keys.ArrowRight) x++;
  if (touch.active) {
    const dx = touch.x - touch.sx, dy = touch.y - touch.sy, d = Math.hypot(dx, dy);
    if (d > 8) { x = dx / Math.max(d, 50); y = dy / Math.max(d, 50); }
  }
  const len = Math.hypot(x, y);
  if (len > 1) { x /= len; y /= len; }
  return { x, y };
}

// ---- Initialisation ----
function newGame(charId, levelId = selectedLevel) {
  game = {
    state: 'start', level: levelId, time: 0, kills: 0, shake: 0,
    player: {
      charId, x: 0, y: 0, r: 14, hp: 100, maxHp: 100, speed: 150,
      level: 1, xp: 0, xpNext: Math.round(5 * XP_FACTOR), pendingLevels: 0,
      magnet: 70, might: 1, cdMult: 1, area: 1, regen: 0, armor: 0, xpMult: 1, projSpeed: 1,
      invuln: 0, facing: { x: 1, y: 0 }, dirX: 1, moving: false,
    },
    enemies: [], projectiles: [], gems: [], pickups: [], effects: [], particles: [], texts: [],
    weapons: [], passives: {}, choices: [],
    spawnTimer: 0, stage: 0, eliteTimer: 60, bossIndex: 0, bossKills: 0, legendBossT: LEGEND_BOSS_DELAY, banner: null,
    eventT: FIRST_EVENT, event: null, ticketT: TICKET_EVERY[0], stats: {},
    specialCd: 0, special: null, // super pouvoir prêt dès le début
  };
  chunkCache.clear(); // les plantes cassées repoussent à chaque partie
  if (LEVELS[levelId].goal) createPiRoom();
  const ch = CHARACTERS[charId];
  if (ch.follower) game.follower = { x: -30, y: 0, r: 10, dirX: 1, moving: false, bubble: 0, bubbleTimer: 3, text: '', target: null, dashT: 0, dashTimer: 6, mode: 'follow', awayT: 0 };
  if (ch.apply) ch.apply(game.player);
  for (const [id, lvl] of Object.entries(ch.passives || {})) {
    game.passives[id] = lvl;
    for (let i = 0; i < lvl; i++) PASSIVES[id].apply(game.player);
  }
  addWeapon(ch.weapon);
  // Mode démo : l'arme de départ est directement légendaire
  if (DEMO_MODE) Object.assign(game.weapons[0], { level: WEAPONS[ch.weapon].maxLevel, legendary: true });
}

function startGame(charId, levelId = selectedLevel) {
  if (!CHARACTERS[charId] || !LEVELS[levelId]) return;
  selectedChar = charId;
  selectedLevel = levelId;
  newGame(charId, levelId);
  game.state = 'play';
  if (game.goal) game.banner = { text: '🎯 Récupère ton badge, puis rejoins la salle PI !', t: 4 };
  for (const id of ['start', 'levels', 'gameover', 'levelup', 'pause', 'chest']) hide(id);
}

// ---- Sélection du niveau (après le personnage) ----
function buildLevelSelect() {
  const box = document.getElementById('levelList');
  box.innerHTML = '';
  Object.entries(LEVELS).forEach(([id, lv], i) => {
    const b = document.createElement('button');
    b.className = 'card';
    b.dataset.id = id;
    b.innerHTML = `<span class="key">${i + 1}</span><span class="icon">${lv.icon}</span>
      <div><b>Niveau ${i + 1} : ${lv.name}</b><p>${lv.desc}</p></div>`;
    b.onclick = () => startGame(selectedChar, id);
    b.onmouseenter = () => selectLevel(id);
    box.appendChild(b);
  });
}

function selectLevel(id) {
  selectedLevel = id;
  for (const b of document.querySelectorAll('#levelList .card')) b.classList.toggle('selected', b.dataset.id === id);
}

function openLevelSelect(charId) {
  if (!CHARACTERS[charId]) return;
  selectedChar = charId;
  hide('start');
  show('levels');
  game.state = 'levels';
  document.getElementById('levelChar').textContent = 'avec ' + CHARACTERS[charId].name;
  selectLevel(selectedLevel);
}

// ---- Salle PI (niveau 2) : quelque part au nord, porte en bas, verrouillée sans badge ----
// Le badge est posé sur le côté (est ou ouest) : il faut faire un détour avant d'aller à la salle
function createPiRoom() {
  const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.6;
  const doorX = Math.cos(a) * PI_DISTANCE, doorY = Math.sin(a) * PI_DISTANCE;
  const x = doorX - PI_ROOM_W / 2, y = doorY - PI_ROOM_H, w = PI_ROOM_W, h = PI_ROOM_H, T = PI_WALL;
  const side = (w - PI_DOOR) / 2;
  const ba = a + (Math.random() < 0.5 ? -1 : 1) * (Math.PI / 3 + Math.random() * Math.PI / 4);
  game.goal = {
    x, y, w, h, doorX, doorY, talkT: 0, talker: 0, line: PI_TALK[0], seats: [],
    badgeX: Math.cos(ba) * BADGE_DISTANCE, badgeY: Math.sin(ba) * BADGE_DISTANCE, lockedHintT: 0,
  };
  game.hasBadge = false;
  game.walls = [
    { x, y, w, h: T + 36 },                       // mur du fond (avec sa façade)
    { x, y, w: T, h },                             // mur gauche
    { x: x + w - T, y, w: T, h },                  // mur droit
    { x, y: y + h - T, w: side, h: T },            // mur avant, de part et d'autre de la porte
    { x: x + w - side, y: y + h - T, w: side, h: T },
    { x: x + side, y: y + h - T, w: PI_DOOR, h: T, door: true }, // la porte, retirée quand on a le badge
  ];
  // Public assis face à la scène, avec une allée centrale
  for (let row = 0; row < 5; row++)
    for (let col = 0; col < 10; col++) {
      if (col === 4 || col === 5) continue;
      game.goal.seats.push({
        x: x + 64 + col * 57, y: y + 190 + row * 50,
        empty: Math.random() < 0.15,
        hair: ['#2a1a10', '#6a4020', '#d8a040', '#1a1a1a', '#a04020', '#888'][Math.random() * 6 | 0],
        shirt: ['#3a6ab0', '#c03a5a', '#3fa04a', '#e0a020', '#6a4aa0', '#d8dce4'][Math.random() * 6 | 0],
        phase: Math.random() * 10,
      });
    }
}

function insidePiRoom(o) {
  const g = game.goal;
  return o.x > g.x + PI_WALL && o.x < g.x + g.w - PI_WALL && o.y > g.y + PI_WALL && o.y < g.y + g.h - PI_WALL - o.r;
}

function openCharSelect() {
  hide('title');
  show('start');
  game.state = 'start';
  selectChar(selectedChar);
  fitCharSelect();
}

function showCharSelect() {
  newGame(selectedChar);
  hide('gameover');
  show('start');
  selectChar(selectedChar);
  fitCharSelect();
}

// ---- Sélection du personnage : organigramme par équipe, navigable aux flèches ----
let cursorChar = selectedChar;
let charRows = []; // ids des personnages, une ligne par équipe

function buildCharSelect() {
  const box = document.getElementById('chars');
  box.innerHTML = '';
  charRows = TEAMS.map(t => Object.keys(CHARACTERS).filter(id => CHARACTERS[id].team === t));
  TEAMS.forEach((team, r) => {
    const row = document.createElement('div');
    row.className = 'team';
    row.innerHTML = `<span class="team-label">${team}</span><div class="members"></div>`;
    for (const id of charRows[r]) {
      const c = CHARACTERS[id], img = Sprites[id].right;
      const b = document.createElement('button');
      b.className = 'char';
      b.dataset.id = id;
      b.innerHTML = `<span class="portrait"><img src="${img.toDataURL()}" style="width:${img.width * 1.25}px" alt=""></span>
        <span class="name">${c.name}</span><span class="role">${c.role}</span>`;
      b.onclick = () => openLevelSelect(id);
      b.onmouseenter = () => selectChar(id);
      row.lastElementChild.appendChild(b);
    }
    box.appendChild(row);
  });
}

function selectChar(id) {
  cursorChar = id;
  for (const b of document.querySelectorAll('.char')) b.classList.toggle('selected', b.dataset.id === id);
  renderCharInfo(id);
}

function renderCharInfo(id) {
  const c = CHARACTERS[id], w = WEAPONS[c.weapon], b = charBonus(c);
  document.getElementById('charInfo').innerHTML =
    `<b>${c.name}</b> · ${c.role}<p>${c.desc}</p><small>Arme : ${w.icon} <b>${w.name}</b> — ${w.desc}<br>Bonus : ${b.icon} <b>${b.name}</b> — ${b.desc}` +
    (c.special ? `<br>Super pouvoir (Espace, toutes les 1 min 30) : ${c.special.icon} <b>${c.special.name}</b> — ${c.special.desc}` : '') + `</small>`;
}

function moveCharCursor(dx, dy) {
  let r = charRows.findIndex(row => row.includes(cursorChar)), i = charRows[r].indexOf(cursorChar);
  if (dy) { r = (r + dy + charRows.length) % charRows.length; i = Math.min(i, charRows[r].length - 1); }
  else i = (i + dx + charRows[r].length) % charRows[r].length;
  selectChar(charRows[r][i]);
}

// Réduit le panneau de sélection pour qu'il tienne toujours entièrement à l'écran
function fitCharSelect() {
  const panel = document.querySelector('#start .panel');
  if (!panel.offsetHeight) return; // écran masqué
  // L'encart prend la hauteur du plus long descriptif : rien n'est coupé et le panneau ne bouge pas
  const info = document.getElementById('charInfo');
  info.style.height = 'auto';
  let h = 0;
  for (const id in CHARACTERS) { renderCharInfo(id); h = Math.max(h, info.offsetHeight); }
  info.style.height = h + 'px';
  renderCharInfo(cursorChar);
  const k = Math.min(1, (innerHeight - 16) / panel.offsetHeight, (innerWidth - 16) / panel.offsetWidth);
  panel.style.transform = `scale(${k})`;
}
addEventListener('resize', fitCharSelect);

function addWeapon(id) {
  game.weapons.push({ id, level: 1, timer: 0 });
}

// ---- Grille spatiale (accélère les collisions) ----
const CELL = 64;
const grid = new Map();
const cellKey = (cx, cy) => (cx + 32768) * 65536 + (cy + 32768);

function buildGrid() {
  grid.clear();
  for (const e of game.enemies) {
    const k = cellKey(Math.floor(e.x / CELL), Math.floor(e.y / CELL));
    let c = grid.get(k);
    if (!c) grid.set(k, c = []);
    c.push(e);
  }
}

function queryEnemies(x, y, r, fn) {
  const x0 = Math.floor((x - r) / CELL), x1 = Math.floor((x + r) / CELL);
  const y0 = Math.floor((y - r) / CELL), y1 = Math.floor((y + r) / CELL);
  for (let cx = x0; cx <= x1; cx++)
    for (let cy = y0; cy <= y1; cy++) {
      const c = grid.get(cellKey(cx, cy));
      if (c) for (const e of c) fn(e);
    }
}

// ---- Mobilier généré par zones (déterministe, infini) ----
const CHUNK = 320;
const chunkCache = new Map();

function chunkProps(cx, cy) {
  const k = cellKey(cx, cy);
  let list = chunkCache.get(k);
  if (list) return list;
  list = [];
  // Zone de départ dégagée autour de (0,0), et rien autour de la salle PI
  const g = game.goal, m = 120;
  const nearGoal = g && (
    (cx * CHUNK < g.x + g.w + m && (cx + 1) * CHUNK > g.x - m && cy * CHUNK < g.y + g.h + m && (cy + 1) * CHUNK > g.y - m) ||
    (cx === Math.floor(g.badgeX / CHUNK) && cy === Math.floor(g.badgeY / CHUNK))); // badge toujours accessible
  if (!((cx === 0 || cx === -1) && (cy === 0 || cy === -1)) && !nearGoal) {
    const rnd = mulberry32((cx * 73856093) ^ (cy * 19349663));
    const r = rnd();
    let type = null, acc = 0;
    for (const [t, w] of LEVELS[game.level].props) if (r < (acc += w)) { type = t; break; }
    if (type) {
      const def = PROPS[type];
      const x = cx * CHUNK + 96 + rnd() * (CHUNK - 192);
      const y = cy * CHUNK + 96 + rnd() * (CHUNK - 192);
      list.push({ type, img: def.img, x, y, w: def.w, h: def.h, drawX: Math.round(x - def.img.width / 2), drawY: Math.round(y - def.h / 2 - def.top) });
    }
  }
  chunkCache.set(k, list);
  return list;
}

function forPropsNear(x, y, fn, range = 1) {
  const cx = Math.floor(x / CHUNK), cy = Math.floor(y / CHUNK);
  for (let i = -range; i <= range; i++)
    for (let j = -range; j <= range; j++)
      for (const pr of chunkProps(cx + i, cy + j)) fn(pr);
}

// Une plante ou une imprimante proche du joueur devient une cible fixe que les armes peuvent casser
const BREAKABLE = {
  plant:   { hp: PLANT_HP,   r: 12, color: '#3fa04a' },
  printer: { hp: PRINTER_HP, r: 20, color: '#b8bcc4' },
};

function spawnBreakable(pr) {
  const b = BREAKABLE[pr.type];
  const e = {
    type: pr.type, prop: pr, x: pr.x, y: pr.drawY + pr.img.height / 2,
    hp: b.hp, maxHp: b.hp, speed: 0, dmg: 0, r: b.r, scale: 1, xp: 0, color: b.color,
    flash: 0, kx: 0, ky: 0, hitT: {}, phase: 0, dead: false,
  };
  pr.entity = e;
  game.enemies.push(e);
}

function breakProp(e) {
  const pr = e.prop;
  pr.broken = true;
  pr.entity = null;
  if (pr.type === 'printer') { explodePrinter(e); return; }
  for (let i = 0; i < 12; i++) {
    const a = Math.random() * Math.PI * 2, s = 40 + Math.random() * 90;
    game.particles.push({ x: e.x, y: e.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0, life: 0.5, color: i % 3 ? '#3fa04a' : '#b0603a' });
  }
  if (Math.random() < PLANT_BOLT_CHANCE) game.pickups.push({ x: pr.x, y: pr.y, kind: 'bolt' });
}

// L'imprimante cassée explose et blesse tous les ennemis autour (et peut en faire exploser d'autres)
function explodePrinter(e) {
  Sfx.explosion();
  game.shake = Math.max(game.shake, 8);
  game.effects.push({ type: 'blast', x: e.x, y: e.y, r: PRINTER_BLAST_R, t: 0, life: 0.45 });
  for (let i = 0; i < 24; i++) {
    const a = Math.random() * Math.PI * 2, s = 60 + Math.random() * 160;
    game.particles.push({ x: e.x, y: e.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0, life: 0.6, color: ['#ff7020', '#ffd040', '#f4f4f4', '#555'][i % 4] });
  }
  const prev = dmgSource;
  dmgSource = 'printer';
  const dmg = PRINTER_BLAST_DMG + 15 * stageAt(game.time);
  queryEnemies(e.x, e.y, PRINTER_BLAST_R + 40, o => {
    if (o.dead || o === e) return;
    const dx = o.x - e.x, dy = o.y - e.y, d = Math.hypot(dx, dy) || 1;
    if (d < PRINTER_BLAST_R + o.r) hitEnemy(o, dmg, dx / d * 250, dy / d * 250);
  });
  dmgSource = prev;
  if (Math.random() < PRINTER_TICKET_CHANCE) game.pickups.push({ x: e.x, y: e.y, kind: 'ticket' });
}

// Un ticket apparaît au sol pas trop loin du joueur, hors des meubles
function spawnTicket() {
  const p = game.player;
  for (let tries = 0; tries < 8; tries++) {
    const a = Math.random() * Math.PI * 2, d = 200 + Math.random() * 200;
    const x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d;
    let blocked = false;
    forPropsNear(x, y, pr => {
      if (!pr.broken && Math.abs(x - pr.x) < pr.w / 2 + 16 && Math.abs(y - pr.y) < pr.h / 2 + 30) blocked = true;
    });
    if (game.walls) for (const wl of game.walls) if (x > wl.x - 16 && x < wl.x + wl.w + 16 && y > wl.y - 16 && y < wl.y + wl.h + 16) blocked = true;
    if (!blocked) { game.pickups.push({ x, y, kind: 'ticket' }); return; }
  }
}

// ---- Événements aléatoires ----
const eventActive = id => game.event && game.event.id === id;

function triggerEvent() {
  const p = game.player;
  const pool = EVENTS.filter(ev => !(ev.dur && game.event)); // un seul événement durable à la fois
  const ev = pool[Math.random() * pool.length | 0];
  game.banner = { text: ev.text, t: 3.5 };
  Sfx.event();
  if (ev.dur) game.event = { id: ev.id, label: ev.label, t: ev.dur };
  if (ev.id === 'coffee') {
    for (let i = 0; i < 3; i++) {
      const a = Math.random() * Math.PI * 2;
      game.pickups.push({ x: p.x + Math.cos(a) * 130, y: p.y + Math.sin(a) * 130, kind: 'croissant' });
    }
  } else if (ev.id === 'mail') {
    spawnEnemy(pickEnemyType(), 'elite');
  } else if (ev.id === 'blackout') {
    for (const e of game.enemies) if (!e.prop) e.stun = Math.max(e.stun || 0, e.boss ? 1 : 3);
  }
}

// ---- Statistiques de dégâts par arme (écran de fin) ----
let dmgSource = null; // qui inflige les dégâts en ce moment : id d'arme, 'printer' ou 'follower'
function statOf(src) {
  return game.stats[src] || (game.stats[src] = { dmg: 0, kills: 0 });
}

// ---- Super pouvoirs (touche Espace, voir special dans characters.js) ----
const SPECIAL_COOLDOWN = 90;  // 1 min 30 entre deux super pouvoirs
const SPECIAL_DURATION = 5;
const SPECIAL_BIG_DMG = 150;  // élites et directeurs encaissent ces dégâts par coup ; les autres meurent sur le coup
const SPECIAL_BTN_R = 30;     // bouton rond en bas à droite (cliquable / tactile)
const specialBtnPos = () => ({ x: W - SPECIAL_BTN_R - 20, y: H - SPECIAL_BTN_R - 28 });

function onScreenEnemies(margin = 20) {
  const p = game.player;
  return game.enemies.filter(e => !e.dead && !e.prop && Math.abs(e.x - p.x) < W / 2 + margin && Math.abs(e.y - p.y) < H / 2 + margin);
}

// Coup de super pouvoir : mort immédiate, sauf élites et directeurs (gros dégâts, au plus 3 fois par seconde)
function specialHit(e) {
  if (e.dead || e.prop) return;
  const prev = dmgSource;
  dmgSource = 'special';
  if (e.boss || e.elite) {
    if (game.time - (e.hitT.special || -9) >= 0.33) {
      e.hitT.special = game.time;
      hitEnemy(e, SPECIAL_BIG_DMG);
    }
  } else {
    statOf('special').dmg += Math.max(0, e.hp);
    killEnemy(e);
  }
  dmgSource = prev;
}

// Impact d'un objet tombé du ciel : élimine tout dans le rayon
function specialImpact(x, y, r) {
  queryEnemies(x, y, r + 40, e => {
    if (!e.dead && !e.prop && Math.hypot(e.x - x, e.y - y) < r + e.r) specialHit(e);
  });
  for (let i = 0; i < 8; i++) {
    const a = Math.random() * Math.PI * 2, s = 40 + Math.random() * 100;
    game.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0, life: 0.35, color: i % 2 ? '#ffd866' : '#fff' });
  }
  Sfx.impact();
}

function activateSpecial() {
  const p = game.player, sp = CHARACTERS[p.charId].special;
  if (!sp || game.state !== 'play' || game.special || game.specialCd > 0) return;
  const s = game.special = { ...sp, t: SPECIAL_DURATION, tick: 0, items: [], waves: [], allies: [], trains: [], nextTrain: 0.5, nextWave: 0 };
  game.specialCd = SPECIAL_COOLDOWN;
  game.banner = { text: `${sp.icon} ${sp.name} !`, t: 2.5 };
  Sfx.special();
  if (s.type === 'squad') {
    // Les renforts arrivent depuis les bords de l'écran
    Sprites.allies.forEach((spr, i) => {
      const a = i * Math.PI * 2 / Sprites.allies.length + Math.random() * 0.5, d = Math.hypot(W, H) / 2 + 20;
      s.allies.push({ x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d, r: 12, spr, dirX: 1 });
    });
  } else if (s.type === 'train') {
    Sfx.whistle();
    game.playerBubble = { text: '🎵 TUUUUT !', t: 1.5 };
    for (const e of game.enemies) if (!e.prop) e.stun = Math.max(e.stun || 0, e.boss ? 2 : SPECIAL_DURATION);
  } else if (s.type === 'laugh') {
    game.playerBubble = { text: s.lines[Math.random() * s.lines.length | 0], t: 3 };
  } else if (s.type === 'shout') {
    Sfx.shout();
    game.playerBubble = { text: 'NOOOOON !!!', t: 2.5 };
  } else if (s.type === 'giant' && game.follower) {
    const f = game.follower;
    if (f.mode !== 'follow') { f.mode = 'follow'; f.x = p.x - 30; f.y = p.y; } // revient de réunion en urgence
    f.target = null;
    f.giant = true;
    f.text = "J'arrive Sheryna !";
    f.bubble = 2;
  }
}

function updateSpecial(dt) {
  const s = game.special, p = game.player;
  s.t -= dt;
  const active = s.t > 0, elapsed = SPECIAL_DURATION - s.t;
  if (active) p.invuln = Math.max(p.invuln, 0.1); // intouchable pendant le super pouvoir
  const prev = dmgSource;
  dmgSource = 'special';
  const pickTarget = () => { const l = onScreenEnemies(); return l.length ? l[Math.random() * l.length | 0] : null; };
  const nearestOnScreen = (x, y) => {
    let best = null, bd = Infinity;
    for (const e of onScreenEnemies()) { const d = (e.x - x) ** 2 + (e.y - y) ** 2; if (d < bd) { bd = d; best = e; } }
    return best;
  };
  // Se déplace vers une cible et l'élimine au contact ; renvoie true si la cible est atteinte
  const chase = (o, t, speed, reach) => {
    const dx = t.x - o.x, dy = t.y - o.y, d = Math.hypot(dx, dy) || 1;
    if (Math.abs(dx) > 2) o.dirX = Math.sign(dx);
    if (d <= reach + t.r) { specialHit(t); return true; }
    const step = Math.min(d, speed * dt);
    o.x += dx / d * step;
    o.y += dy / d * step;
    return false;
  };

  if (s.type === 'rain') {
    // Pluie d'objets qui tombent sur les ennemis à l'écran
    if (active && (s.tick -= dt) <= 0) {
      s.tick = 0.06;
      const t = pickTarget();
      const x = t ? t.x : p.x + (Math.random() - 0.5) * W, y = t ? t.y : p.y + (Math.random() - 0.5) * H;
      s.items.push({ x: x + (Math.random() - 0.5) * 20, y, t: 0, dur: 0.45, rot: Math.random() * 6 });
    }
    for (const it of s.items) if ((it.t += dt) >= it.dur) { it.dead = true; specialImpact(it.x, it.y, 45); }
    s.items = s.items.filter(it => !it.dead);
  } else if (s.type === 'dash' && active) {
    // Fonce d'un ennemi à l'autre (les commandes sont ignorées pendant ce temps)
    const t = nearestOnScreen(p.x, p.y);
    if (t) {
      p.moving = true;
      chase(p, t, 750, p.r + 6);
      pushOutOfProps(p);
      if (Math.random() < 0.5) game.particles.push({ x: p.x, y: p.y + 10, vx: 0, vy: 0, t: 0, life: 0.3, color: '#ffd866' });
    }
  } else if (s.type === 'giant' && game.follower) {
    const f = game.follower;
    if (active) {
      const t = nearestOnScreen(f.x, f.y);
      f.moving = !!t;
      if (t) chase(f, t, 650, 30);
      // Écrase aussi tout ce qui est sous ses pieds
      queryEnemies(f.x, f.y, 80, e => { if (Math.hypot(e.x - f.x, e.y - f.y) < 40 + e.r) specialHit(e); });
    } else if (f.giant) {
      f.giant = false;
      f.text = 'Pas de quoi Sheryna !';
      f.bubble = 2.5;
    }
  } else if (s.type === 'squad') {
    for (const a of s.allies) {
      const t = active && nearestOnScreen(a.x, a.y);
      a.moving = !!t;
      if (t) chase(a, t, 420, a.r + 4);
    }
    if (!active) s.allies = [];
  } else if (s.type === 'barrage') {
    // Une salve continue de projectiles, chacun vers un ennemi à l'écran
    if (active && (s.tick -= dt) <= 0) {
      s.tick = 0.07;
      const t = pickTarget();
      if (t) spawnProjectile({
        x: p.x, y: p.y - 10, angle: Math.atan2(t.y - p.y, t.x - p.x), speed: 520, dmg: 0, pierce: 1, r: 12, life: 1.6,
        homing: 8, sprite: s.sprites[Math.random() * s.sprites.length | 0], noRotate: true, special: true, src: 'special',
      });
    }
  } else if (s.type === 'train') {
    // 3 passages d'un énorme train, sur des voies proches du joueur
    if (active && elapsed >= s.nextTrain) {
      s.nextTrain += 1.5;
      const dir = Math.random() < 0.5 ? 1 : -1;
      s.trains.push({ x: p.x - dir * (W / 2 + 200), y: p.y + (Math.random() - 0.5) * H * 0.6, dir, end: p.x + dir * (W / 2 + 200) });
      Sfx.whistle();
    }
    for (const tr of s.trains) {
      tr.x += tr.dir * W * 0.9 * dt;
      game.shake = Math.max(game.shake, 3);
      queryEnemies(tr.x, tr.y, 160, e => { if (Math.abs(e.y - tr.y) < 55 + e.r && Math.abs(e.x - tr.x) < 140) specialHit(e); });
      if ((tr.x - tr.end) * tr.dir > 0) tr.dead = true;
    }
    s.trains = s.trains.filter(tr => !tr.dead);
  } else if (s.type === 'laugh') {
    // Tout le monde rit (figé), puis meurt de rire petit à petit
    if (active) {
      for (const e of onScreenEnemies()) e.stun = Math.max(e.stun || 0, 0.3);
      if ((s.tick -= dt) <= 0) {
        s.tick = 0.1;
        for (let i = 0; i < 4; i++) {
          const t = pickTarget();
          if (!t) break;
          if (game.texts.length < 150) game.texts.push({ x: t.x, y: t.y - t.r - 6, text: 'HA HA', t: 0, life: 0.8, color: '#ff8ac0' });
          specialHit(t);
        }
      }
    }
  } else if (s.type === 'shout') {
    // Ondes de choc qui partent du joueur et balaient tout l'écran
    if (active && elapsed >= s.nextWave) {
      s.nextWave += 1.2;
      s.waves.push({ r: 0, hit: new Set() });
    }
    const maxR = Math.hypot(W, H) / 2 + 60;
    for (const wv of s.waves) {
      wv.r += 900 * dt;
      queryEnemies(p.x, p.y, wv.r + 40, e => {
        if (!wv.hit.has(e) && Math.hypot(e.x - p.x, e.y - p.y) < wv.r) { wv.hit.add(e); specialHit(e); }
      });
      if (wv.r > maxR) wv.dead = true;
    }
    s.waves = s.waves.filter(wv => !wv.dead);
  }

  dmgSource = prev;
  if (!active && !s.items.length && !s.trains.length && !s.waves.length) {
    if (game.follower) game.follower.giant = false;
    game.special = null;
  }
}

// Effets des super pouvoirs dessinés dans le monde (au-dessus des personnages)
function drawSpecialWorld() {
  const s = game.special, p = game.player;
  if (!s) return;
  if (s.type === 'rain') {
    const img = Textures[s.sprite];
    for (const it of s.items) {
      const k = it.t / it.dur;
      ctx.fillStyle = `rgba(0,0,0,${0.15 + k * 0.25})`; // ombre qui grossit à l'approche
      ctx.beginPath();
      ctx.ellipse(it.x, it.y, 6 + k * 14, 3 + k * 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.translate(it.x, it.y - (1 - k) * 320);
      ctx.rotate(it.rot + k * 3);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      ctx.restore();
    }
  } else if (s.type === 'squad') {
    for (const a of s.allies) {
      const img = a.dirX < 0 ? a.spr.left : a.spr.right;
      const bob = a.moving ? -Math.abs(Math.sin(game.time * 14 + a.x)) * 3 : 0;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(a.x, a.y + img.height / 2 - 2, 12, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.drawImage(img, Math.round(a.x - img.width / 2), Math.round(a.y - img.height / 2 + bob));
    }
  } else if (s.type === 'train') {
    const img = Textures.train, k = 5;
    for (const tr of s.trains) {
      ctx.save();
      ctx.translate(Math.round(tr.x), Math.round(tr.y));
      if (tr.dir < 0) ctx.scale(-1, 1);
      ctx.drawImage(img, -img.width * k / 2, -img.height * k / 2, img.width * k, img.height * k);
      ctx.restore();
    }
  } else if (s.type === 'shout') {
    for (const wv of s.waves) {
      ctx.globalAlpha = Math.max(0, 1 - wv.r / (Math.hypot(W, H) / 2 + 60));
      ctx.strokeStyle = '#ff5050';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(p.x, p.y, wv.r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else if (s.type === 'barrage' && s.laptop && s.t > 0) {
    // Le PC portable de Hakim, ouvert devant lui
    const x = p.x - 16, y = p.y + 6;
    ctx.fillStyle = '#2a2e36';
    ctx.fillRect(x, y - 16, 32, 18);
    ctx.fillStyle = '#0a1a10';
    ctx.fillRect(x + 2, y - 14, 28, 14);
    ctx.fillStyle = '#5aff7a';
    for (let i = 0; i < 3; i++) ctx.fillRect(x + 4, y - 12 + i * 4, 4 + ((game.time * 20 + i * 7) % 20), 2);
    ctx.fillStyle = '#c8ccd4';
    ctx.fillRect(x - 3, y + 2, 38, 4);
  }
}

// Bouton du super pouvoir (bas droite) : se remplit pendant la recharge, pulse quand il est prêt
function drawSpecialButton() {
  const sp = CHARACTERS[game.player.charId].special;
  if (!sp) return;
  const { x, y } = specialBtnPos(), R = SPECIAL_BTN_R, ready = game.specialCd <= 0 && !game.special;
  if (ready) {
    ctx.fillStyle = `rgba(150,205,50,${0.35 + Math.sin(game.time * 6) * 0.15})`;
    ctx.beginPath();
    ctx.arc(x, y, R + 8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(10,16,24,0.8)';
  ctx.beginPath();
  ctx.arc(x, y, R, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = '26px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.globalAlpha = ready || game.special ? 1 : 0.45;
  ctx.fillText(sp.icon, x, y + 1);
  ctx.globalAlpha = 1;
  // Anneau : durée restante (actif) ou recharge
  const frac = game.special ? Math.max(0, game.special.t) / SPECIAL_DURATION : 1 - Math.max(0, game.specialCd) / SPECIAL_COOLDOWN;
  ctx.strokeStyle = game.special ? '#ff9a30' : ready ? '#96cd32' : '#4aa3df';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x, y, R - 2, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
  ctx.stroke();
  ctx.textBaseline = 'alphabetic';
  ctx.font = 'bold 11px monospace';
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#000';
  const label = ready ? 'ESPACE' : Math.ceil(game.special ? Math.max(0, game.special.t) : game.specialCd) + ' s';
  ctx.strokeText(label, x, y + R + 14);
  ctx.fillStyle = ready ? '#96cd32' : '#fff';
  ctx.fillText(label, x, y + R + 14);
}

// Repousse un cercle hors des meubles et des murs (glisse le long des bords)
function pushOutOfProps(o) {
  forPropsNear(o.x, o.y, pr => {
    if (!pr.broken) pushOutOfRect(o, pr.x - pr.w / 2, pr.y - pr.h / 2, pr.x + pr.w / 2, pr.y + pr.h / 2);
  });
  if (game.walls) for (const wl of game.walls) pushOutOfRect(o, wl.x, wl.y, wl.x + wl.w, wl.y + wl.h);
}

function pushOutOfRect(o, left, top, right, bottom) {
  const nx = Math.max(left, Math.min(o.x, right)), ny = Math.max(top, Math.min(o.y, bottom));
  const dx = o.x - nx, dy = o.y - ny, d2 = dx * dx + dy * dy;
  if (d2 >= o.r * o.r) return;
  if (d2 > 0) {
    const d = Math.sqrt(d2);
    o.x = nx + dx / d * o.r;
    o.y = ny + dy / d * o.r;
  } else {
    const l = o.x - left, r = right - o.x, t = o.y - top, b = bottom - o.y, m = Math.min(l, r, t, b);
    if (m === l) o.x = left - o.r;
    else if (m === r) o.x = right + o.r;
    else if (m === t) o.y = top - o.r;
    else o.y = bottom + o.r;
  }
}

// ---- Ennemis ----
function pickEnemyType() {
  const pool = SPAWN_TABLE.filter(s => game.time >= s.from);
  let r = Math.random() * pool.reduce((sum, s) => sum + s.w, 0);
  for (const s of pool) if ((r -= s.w) <= 0) return s.type;
  return pool[0].type;
}

// rank : 'normal', 'elite' (version géante d'un ennemi) ou 'boss'
function spawnEnemy(type = pickEnemyType(), rank = 'normal') {
  if (rank === 'normal' && game.enemies.length >= MAX_ENEMIES) return;
  const def = ENEMIES[type], p = game.player;
  const elite = rank === 'elite', boss = rank === 'boss';
  const a = Math.random() * Math.PI * 2, dist = Math.hypot(W, H) / 2 + (boss ? 80 : 40);
  const scale = boss ? 2.5 : elite ? 2 : 1;
  const hp = boss ? 400 + game.time * 5 : def.hp * (1 + stageAt(game.time) * HP_PER_STAGE) * legendMult() * (elite ? 15 : 1);
  game.enemies.push({
    type, x: p.x + Math.cos(a) * dist, y: p.y + Math.sin(a) * dist,
    hp, maxHp: hp, speed: def.speed * (elite ? 0.8 : 1), dmg: def.dmg * (elite ? 2 : 1),
    r: boss ? def.r : def.r * scale, scale, xp: elite ? 25 : def.xp, elite, boss, name: def.name,
    color: def.color, flying: !!def.flying,
    flash: 0, kx: 0, ky: 0, hitT: {}, phase: Math.random() * 10, dead: false,
  });
}

function hitEnemy(e, dmg, kx = 0, ky = 0) {
  if (e.dead) return;
  dmg = Math.round(dmg * game.player.might * (0.9 + Math.random() * 0.2));
  if (dmgSource && !e.prop) statOf(dmgSource).dmg += Math.min(dmg, Math.max(0, e.hp)); // dégâts réellement utiles
  e.hp -= dmg;
  e.flash = 0.1;
  const kb = e.prop ? 0 : e.boss ? 0.05 : e.elite ? 0.2 : 1;
  e.kx += kx * kb;
  e.ky += ky * kb;
  if (game.texts.length < 150) game.texts.push({ x: e.x + (Math.random() - 0.5) * 10, y: e.y - e.r, text: dmg, t: 0, life: 0.6 });
  if (e.hp <= 0) killEnemy(e);
}

function killEnemy(e) {
  e.dead = true;
  if (e.prop) { breakProp(e); return; }
  game.kills++;
  if (dmgSource) statOf(dmgSource).kills++;
  Sfx.kill();
  game.gems.push({ x: e.x, y: e.y, value: e.xp, magnet: false, speed: 0 });
  if (e.elite || Math.random() < 0.004) game.pickups.push({ x: e.x + 16, y: e.y, kind: 'croissant' });
  if (e.boss) {
    game.bossKills++;
    Sfx.chest();
    game.pickups.push({ x: e.x, y: e.y, kind: 'chest' });
    game.banner = { text: `${e.name} vaincu ! Récupère son coffre`, t: 3 };
    game.shake = 12;
  }
  for (let i = 0; i < (e.boss ? 40 : 6); i++) {
    const a = Math.random() * Math.PI * 2, s = 40 + Math.random() * 80;
    game.particles.push({ x: e.x, y: e.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0, life: 0.4, color: e.color });
  }
}

// exclude : ennemis déjà touchés à ignorer, onEnd(pr) : appelé quand le projectile disparaît
function spawnProjectile(o) {
  const speed = o.speed * game.player.projSpeed;
  game.projectiles.push({ ...o, speed, vx: Math.cos(o.angle) * speed, vy: Math.sin(o.angle) * speed, hit: new Set(o.exclude), dead: false });
}

// Tête chercheuse : tourne vers l'ennemi le plus proche pas encore touché
function steerProjectile(pr, dt) {
  const t = nearestEnemy(pr.x, pr.y, 500, pr.hit);
  if (!t) return;
  const cur = Math.atan2(pr.vy, pr.vx), want = Math.atan2(t.y - pr.y, t.x - pr.x);
  const da = Math.atan2(Math.sin(want - cur), Math.cos(want - cur));
  const a = cur + Math.max(-pr.homing * dt, Math.min(pr.homing * dt, da));
  pr.vx = Math.cos(a) * pr.speed;
  pr.vy = Math.sin(a) * pr.speed;
}

// ---- Joueur ----
function damagePlayer(dmg) {
  const p = game.player;
  p.hp -= Math.max(1, dmg - p.armor);
  p.invuln = 0.5;
  Sfx.hurt();
  game.shake = 6;
  if (p.hp <= 0) { p.hp = 0; gameOver(); }
}

function gainXp(v) {
  const p = game.player;
  p.xp += v * p.xpMult * (eventActive('bonus') ? 2 : 1);
  while (p.xp >= p.xpNext) {
    p.xp -= p.xpNext;
    p.level++;
    Sfx.levelUp();
    p.xpNext = Math.round((5 + p.level * 6 + Math.pow(p.level, 1.5)) * XP_FACTOR);
    p.pendingLevels++;
  }
}

// ---- Mise à jour ----
function update(dt) {
  game.time += dt;
  const p = game.player;
  if (game.time >= GAME_DURATION) { endGame(!game.goal); return; } // niveau 2 : à 18h00 la PI est finie
  if (game.goal) {
    const g = game.goal;
    if ((g.talkT -= dt) <= 0) { // les orateurs parlent à tour de rôle
      g.talkT = 3.5;
      g.talker = 1 - g.talker;
      g.line = PI_TALK[Math.random() * PI_TALK.length | 0];
    }
    if (!game.hasBadge) {
      if (Math.hypot(p.x - g.badgeX, p.y - g.badgeY) < p.r + 22) {
        game.hasBadge = true;
        Sfx.chest();
        game.walls = game.walls.filter(wl => !wl.door); // la porte s'ouvre
        game.banner = { text: '🪪 Badge récupéré ! Direction la salle PI', t: 3.5 };
        for (let i = 0; i < 20; i++) {
          const pa = Math.random() * Math.PI * 2, s = 60 + Math.random() * 80;
          game.particles.push({ x: g.badgeX, y: g.badgeY, vx: Math.cos(pa) * s, vy: Math.sin(pa) * s, t: 0, life: 0.6, color: i % 2 ? '#96cd32' : '#ffd866' });
        }
      } else if ((g.lockedHintT -= dt) <= 0 && Math.hypot(p.x - g.doorX, p.y - g.doorY) < 90) {
        g.lockedHintT = 4;
        game.banner = { text: '🔒 Porte verrouillée : va chercher ton badge !', t: 2.5 };
      }
    }
  }
  if (game.banner && (game.banner.t -= dt) <= 0) game.banner = null;

  // Déplacement
  const dashing = game.special && game.special.type === 'dash' && game.special.t > 0 && onScreenEnemies().length > 0;
  const d = dashing ? { x: 0, y: 0 } : inputDir(); // pendant l'enchaînement de réu, le personnage fonce tout seul
  p.moving = !!(d.x || d.y);
  if (p.moving) {
    const l = Math.hypot(d.x, d.y);
    p.facing = { x: d.x / l, y: d.y / l };
    if (d.x) p.dirX = Math.sign(d.x);
  }
  p.x += d.x * p.speed * dt;
  p.y += d.y * p.speed * dt;
  pushOutOfProps(p);
  if (game.goal && insidePiRoom(p)) { endGame(true); return; }
  p.invuln -= dt;
  p.hp = Math.min(p.maxHp, p.hp + p.regen * dt);

  // Le suiveur de Sheryna : la colle à distance, dit coucou de temps en temps,
  // et fonce parfois sur un ennemi proche pour l'éliminer d'un coup
  // Double-clic dessus : il part en réunion (s'éloigne, disparaît FOLLOWER_MEETING s, puis revient)
  const f = game.follower;
  if (game.playerBubble && (game.playerBubble.t -= dt) <= 0) game.playerBubble = null;
  if (f && f.giant) {
    f.bubble -= dt; // géant : piloté par le super pouvoir de Sheryna
  } else if (f && f.mode === 'leaving') {
    f.x += f.leaveX * 170 * dt;
    f.y += f.leaveY * 170 * dt;
    f.moving = true;
    if (Math.abs(f.leaveX) > 0.1) f.dirX = Math.sign(f.leaveX);
    pushOutOfProps(f);
    f.bubble -= dt;
    if ((f.awayT -= dt) <= 0) { f.mode = 'away'; f.awayT = FOLLOWER_MEETING; }
  } else if (f && f.mode === 'away') {
    if ((f.awayT -= dt) <= 0) {
      const a = Math.random() * Math.PI * 2;
      f.x = p.x + Math.cos(a) * 220;
      f.y = p.y + Math.sin(a) * 220;
      f.mode = 'returning';
      f.target = null;
      f.text = 'Je suis de retour !';
      f.bubble = 2.5;
      f.bubbleTimer = Math.max(f.bubbleTimer, 6);
    }
  } else if (f) {
    if (f.mode === 'returning' && Math.hypot(p.x - f.x, p.y - f.y) < 70) {
      f.mode = 'follow';
      game.playerBubble = { text: 'Supeer !', t: 2.5 };
    }
    if (f.mode === 'follow' && !f.target && (f.dashTimer -= dt) <= 0) {
      f.dashTimer = FOLLOWER_DASH_EVERY[0] + Math.random() * (FOLLOWER_DASH_EVERY[1] - FOLLOWER_DASH_EVERY[0]);
      let best = null, bd = FOLLOWER_DASH_RANGE ** 2;
      for (const e of game.enemies) {
        if (e.dead || e.prop || e.boss || e.elite) continue;
        const d = (e.x - p.x) ** 2 + (e.y - p.y) ** 2;
        if (d < bd) { bd = d; best = e; }
      }
      if (best) { f.target = best; f.dashT = 3; }
    }
    const tg = f.target;
    if (tg && (tg.dead || (f.dashT -= dt) <= 0 || Math.hypot(p.x - f.x, p.y - f.y) > 450)) f.target = null; // cible perdue : il revient
    else if (tg) {
      const tx = tg.x - f.x, ty = tg.y - f.y, td = Math.hypot(tx, ty) || 1;
      f.moving = true;
      if (Math.abs(tx) > 2) f.dirX = Math.sign(tx);
      if (td <= f.r + tg.r + 4) {
        dmgSource = 'follower';
        statOf('follower').dmg += Math.max(0, tg.hp);
        killEnemy(tg);
        dmgSource = null;
        game.texts.push({ x: tg.x, y: tg.y - tg.r, text: '💥', t: 0, life: 0.8 });
        game.shake = Math.max(game.shake, 4);
        f.target = null;
        f.text = FOLLOWER_KILL_LINES[Math.random() * FOLLOWER_KILL_LINES.length | 0];
        f.bubble = 2.5;
        f.bubbleTimer = Math.max(f.bubbleTimer, 4);
      } else {
        const step = Math.min(td, FOLLOWER_DASH_SPEED * dt);
        f.x += tx / td * step;
        f.y += ty / td * step;
      }
    }
    const fx = p.x - f.x, fy = p.y - f.y, fd = Math.hypot(fx, fy);
    if (!f.target) f.moving = fd > 34;
    if (!f.target && f.moving) {
      const step = Math.min(fd - 34, p.speed * 1.05 * dt);
      f.x += fx / fd * step;
      f.y += fy / fd * step;
      if (Math.abs(fx) > 2) f.dirX = Math.sign(fx);
    }
    if (!f.target && fd > 400) { f.x = p.x - p.dirX * 30; f.y = p.y; } // perdu de vue : il réapparaît à côté d'elle
    pushOutOfProps(f);
    f.bubble -= dt;
    if ((f.bubbleTimer -= dt) <= 0) {
      f.bubble = 2.5;
      f.bubbleTimer = 6 + Math.random() * 8;
      let text;
      do text = FOLLOWER_LINES[Math.random() * FOLLOWER_LINES.length | 0]; while (text === f.text); // jamais 2 fois de suite la même
      f.text = text;
    }
  }
  // Super pouvoir : recharge, puis effet en cours
  if (game.specialCd > 0 && (game.specialCd -= dt) <= 0) {
    Sfx.specialReady();
    game.banner = { text: `⚡ ${CHARACTERS[p.charId].special.name} est prêt ! (Espace)`, t: 2.5 };
  }
  if (game.special) updateSpecial(dt);
  game.shake = Math.max(0, game.shake - 30 * dt);

  // Apparition des ennemis
  const stage = stageAt(game.time);
  if (stage > game.stage) {
    game.stage = stage;
    game.banner = { text: '📈 La charge de travail augmente !', t: 3 };
  }
  game.spawnTimer -= dt;
  const interval = SPAWN_BASE_INTERVAL / SPAWN_GROWTH ** stage / legendMult() / (eventActive('incident') ? INCIDENT_SPAWN_MULT : 1);
  while (game.spawnTimer <= 0) {
    game.spawnTimer += interval;
    spawnEnemy();
  }
  game.eliteTimer -= dt;
  if (game.eliteTimer <= 0) { game.eliteTimer = 60; spawnEnemy(pickEnemyType(), 'elite'); }
  if (game.bossIndex < BOSS_TIMES.length && game.time >= BOSS_TIMES[game.bossIndex]) {
    game.bossIndex++;
    spawnEnemy('director', 'boss');
    Sfx.boss();
    game.banner = { text: '⚠ Un directeur arrive !', t: 3 };
  }
  // Événements aléatoires et tickets au sol
  if (game.event && (game.event.t -= dt) <= 0) game.event = null;
  if ((game.eventT -= dt) <= 0) {
    game.eventT = EVENT_EVERY[0] + Math.random() * (EVENT_EVERY[1] - EVENT_EVERY[0]);
    triggerEvent();
  }
  if ((game.ticketT -= dt) <= 0) {
    game.ticketT = TICKET_EVERY[0] + Math.random() * (TICKET_EVERY[1] - TICKET_EVERY[0]);
    if (game.pickups.filter(pk => pk.kind === 'ticket').length < 3) spawnTicket();
  }
  // Une arme au niveau max attend sa version légendaire : un directeur débarque vite
  // (sauf s'il y en a déjà un en vie ou un coffre à ramasser)
  const waitingLegend = legendCount() < MAX_LEGENDARY && game.weapons.some(w => !w.legendary && w.level >= WEAPONS[w.id].maxLevel);
  if (waitingLegend && !game.enemies.some(e => e.boss) && !game.pickups.some(pk => pk.kind === 'chest')) {
    if ((game.legendBossT -= dt) <= 0) {
      game.legendBossT = LEGEND_BOSS_DELAY;
      spawnEnemy('director', 'boss');
      Sfx.boss();
      game.banner = { text: '⚠ Un directeur veut voir ton arme de plus près !', t: 3 };
    }
  } else game.legendBossT = LEGEND_BOSS_DELAY;

  // Matérialise les plantes autour du joueur
  forPropsNear(p.x, p.y, pr => {
    if (BREAKABLE[pr.type] && !pr.broken && !pr.entity) spawnBreakable(pr);
  }, 2);

  buildGrid();

  // Ennemis : poursuite + séparation + contact
  const despawn = Math.hypot(W, H) * 0.75 + 100;
  const decay = Math.exp(-10 * dt);
  for (const e of game.enemies) {
    const dx = p.x - e.x, dy = p.y - e.y, dist = Math.hypot(dx, dy) || 1;
    if (e.prop) {
      // Plante immobile ; trop loin, on la rend au décor (sans la casser)
      e.flash -= dt;
      if (dist > CHUNK * 4) { e.dead = true; e.prop.entity = null; }
      continue;
    }
    const spd = e.slow > 0 ? e.speed * 0.5 : e.speed; // éméché par l'apéro : moitié moins vite
    if (e.slow > 0) e.slow -= dt;
    let vx = dx / dist * spd, vy = dy / dist * spd;
    if (e.stun > 0) { e.stun -= dt; vx = vy = 0; } // NO GO : immobilisé
    let sx = 0, sy = 0;
    queryEnemies(e.x, e.y, e.r * 2, o => {
      if (o === e) return;
      const ox = e.x - o.x, oy = e.y - o.y, d2 = ox * ox + oy * oy, min = e.r + o.r;
      if (d2 < min * min && d2 > 0.01) {
        const dd = Math.sqrt(d2), push = (min - dd) / min;
        sx += ox / dd * push;
        sy += oy / dd * push;
      }
    });
    vx += sx * 120;
    vy += sy * 120;
    e.x += (vx + e.kx) * dt;
    e.y += (vy + e.ky) * dt;
    if (!e.flying) pushOutOfProps(e);
    e.kx *= decay;
    e.ky *= decay;
    e.flash -= dt;
    if (dist < e.r + p.r && p.invuln <= 0 && game.state === 'play') damagePlayer(e.dmg);
    // Les ennemis trop loin réapparaissent devant le joueur
    if (dist > (e.boss ? despawn * 1.5 : despawn) && !e.elite) {
      const a = Math.atan2(p.facing.y, p.facing.x) + (Math.random() - 0.5) * 1.5, r = Math.hypot(W, H) / 2 + 40;
      e.x = p.x + Math.cos(a) * r;
      e.y = p.y + Math.sin(a) * r;
    }
  }

  // Armes
  for (const w of game.weapons) {
    const def = WEAPONS[w.id], np = game.projectiles.length, ne = game.effects.length;
    dmgSource = w.id;
    def.update(w, dt, def.stats(w.level));
    // Ce que l'arme vient de créer prend son niveau (effet visuel) et son nom (statistiques)
    for (let i = np; i < game.projectiles.length; i++) Object.assign(game.projectiles[i], { lvl: visualLevel(w), src: w.id });
    for (let i = ne; i < game.effects.length; i++) game.effects[i].lvl = visualLevel(w);
  }
  dmgSource = null;

  // Projectiles
  for (const pr of game.projectiles) {
    dmgSource = pr.src || null;
    if (pr.homing) steerProjectile(pr, dt);
    pr.x += pr.vx * dt;
    pr.y += pr.vy * dt;
    pr.life -= dt;
    if (pr.life <= 0) pr.dead = true;
    else queryEnemies(pr.x, pr.y, pr.r + 40, e => {
      if (pr.dead || e.dead || pr.hit.has(e)) return;
      if ((e.x - pr.x) ** 2 + (e.y - pr.y) ** 2 < (e.r + pr.r) ** 2) {
        pr.hit.add(e);
        if (pr.special) { // projectile de super pouvoir
          specialHit(e);
          if (--pr.pierce <= 0) pr.dead = true;
          return;
        }
        if (pr.stun && !e.prop) e.stun = Math.max(e.stun || 0, e.boss ? pr.stun * 0.3 : pr.stun);
        if (pr.slow && !e.prop) e.slow = Math.max(e.slow || 0, e.boss ? pr.slow * 0.3 : pr.slow);
        hitEnemy(e, pr.dmg, pr.vx / pr.speed * 100, pr.vy / pr.speed * 100);
        if (pr.bounces > 0) { // shuriken : rebondit vers l'ennemi suivant
          const next = nearestEnemy(pr.x, pr.y, 350, pr.hit);
          if (next) {
            const a = Math.atan2(next.y - pr.y, next.x - pr.x);
            pr.vx = Math.cos(a) * pr.speed;
            pr.vy = Math.sin(a) * pr.speed;
            pr.bounces--;
            pr.life = Math.max(pr.life, 0.8);
            return;
          }
        }
        if (--pr.pierce <= 0) pr.dead = true;
      }
    });
    if (pr.dead && pr.onEnd) {
      const n = game.projectiles.length;
      pr.onEnd(pr);
      for (let i = n; i < game.projectiles.length; i++) Object.assign(game.projectiles[i], { lvl: pr.lvl, src: pr.src }); // éclats de la base de données
    }
    if (pr.lvl >= LEVEL_MAX_SPARKLE && !pr.dead && Math.random() < 0.25) // niveau max : traînée d'étincelles
      game.particles.push({ x: pr.x, y: pr.y, vx: (Math.random() - 0.5) * 30, vy: -20, t: 0, life: 0.35, color: LEVEL_COLORS[pr.lvl] });
  }
  dmgSource = null;

  // Gemmes d'XP
  for (const g of game.gems) {
    const dx = p.x - g.x, dy = p.y - g.y, dist = Math.hypot(dx, dy);
    if (dist < p.r + 8) { g.dead = true; gainXp(g.value); Sfx.gem(); continue; }
    if (!g.magnet && dist < p.magnet) g.magnet = true;
    if (g.magnet) {
      g.speed += 600 * dt;
      g.x += dx / dist * g.speed * dt;
      g.y += dy / dist * g.speed * dt;
    }
  }
  // Fusionne les vieilles gemmes s'il y en a trop
  while (game.gems.length > 300) {
    const g = game.gems.shift();
    game.gems[0].value += g.value;
  }

  // Bonus au sol
  for (const pk of game.pickups) {
    if (Math.hypot(p.x - pk.x, p.y - pk.y) < p.r + 18) {
      pk.dead = true;
      if (pk.kind === 'chest') {
        openChest();
      } else if (pk.kind === 'ticket') {
        // Ticket résolu : bonus d'XP proportionnel au niveau en cours
        Sfx.ticket();
        gainXp(Math.max(1, Math.round(p.xpNext * TICKET_XP)) / p.xpMult);
        game.texts.push({ x: p.x, y: p.y - 30, text: '🎫 Ticket résolu ! +XP', t: 0, life: 1.2, color: '#7fd8ff' });
      } else {
        Sfx.heal();
        const heal = pk.kind === 'bolt' ? BOLT_HEAL : 30;
        p.hp = Math.min(p.maxHp, p.hp + heal);
        game.texts.push({ x: p.x, y: p.y - 30, text: '+' + heal, t: 0, life: 1, color: pk.kind === 'bolt' ? '#ffe040' : '#6f6' });
      }
    }
  }

  // Effets visuels
  for (const ef of game.effects) { ef.t += dt; if (ef.t > ef.life) ef.dead = true; }
  for (const pa of game.particles) { pa.x += pa.vx * dt; pa.y += pa.vy * dt; pa.t += dt; if (pa.t > pa.life) pa.dead = true; }
  for (const tx of game.texts) { tx.y -= 30 * dt; tx.t += dt; if (tx.t > tx.life) tx.dead = true; }

  // Nettoyage
  const alive = o => !o.dead;
  game.enemies = game.enemies.filter(alive);
  game.projectiles = game.projectiles.filter(alive);
  game.gems = game.gems.filter(alive);
  game.pickups = game.pickups.filter(alive);
  game.effects = game.effects.filter(alive);
  game.particles = game.particles.filter(alive);
  game.texts = game.texts.filter(alive);

  if (p.pendingLevels > 0 && game.state === 'play') openLevelUp();
}

// ---- Montée de niveau ----
function buildChoices() {
  const pool = [];
  for (const [id, def] of Object.entries(WEAPONS)) {
    const w = game.weapons.find(w => w.id === id);
    if (w) { if (w.level < def.maxLevel) pool.push({ kind: 'weapon', id, level: w.level + 1 }); }
    else if (game.weapons.length < MAX_WEAPONS) pool.push({ kind: 'weapon', id, level: 1 });
  }
  const ownedPassives = Object.keys(game.passives).length;
  for (const [id, def] of Object.entries(PASSIVES)) {
    const lvl = game.passives[id] || 0;
    if (lvl > 0 ? lvl < def.maxLevel : ownedPassives < MAX_PASSIVES) pool.push({ kind: 'passive', id, level: lvl + 1 });
  }
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.random() * (i + 1) | 0;
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const choices = pool.slice(0, 3);
  if (!choices.length) choices.push({ kind: 'heal' });
  return choices;
}

function choiceInfo(c) {
  if (c.kind === 'weapon') {
    const d = WEAPONS[c.id];
    return { icon: d.icon, name: d.name, tag: c.level === 1 ? 'Nouveau !' : 'Niv. ' + c.level, desc: c.level === 1 ? d.desc : describeUpgrade(d, c.level) };
  }
  if (c.kind === 'passive') {
    const d = PASSIVES[c.id];
    return { icon: d.icon, name: d.name, tag: c.level === 1 ? 'Nouveau !' : 'Niv. ' + c.level, desc: d.desc };
  }
  return { icon: '🥐', name: 'Croissant', tag: '', desc: 'Restaure 30 PV' };
}

function openLevelUp() {
  game.state = 'levelup';
  game.choices = buildChoices();
  const box = document.getElementById('choices');
  box.innerHTML = '';
  game.choices.forEach((c, i) => {
    const info = choiceInfo(c);
    const b = document.createElement('button');
    b.className = 'card';
    b.innerHTML = `<span class="key">${i + 1}</span><span class="icon">${info.icon}</span>
      <div><b>${info.name}</b><em>${info.tag}</em><p>${info.desc}</p></div>`;
    b.onclick = () => pickChoice(i);
    box.appendChild(b);
  });
  show('levelup');
}

function pickChoice(i) {
  if (game.state !== 'levelup') return;
  const c = game.choices[i];
  if (!c) return;
  const p = game.player;
  if (c.kind === 'weapon') {
    const w = game.weapons.find(w => w.id === c.id);
    if (w) { w.level++; weaponLevelFx(w); } else addWeapon(c.id);
  } else if (c.kind === 'passive') {
    game.passives[c.id] = c.level;
    PASSIVES[c.id].apply(p);
  } else {
    p.hp = Math.min(p.maxHp, p.hp + 30);
  }
  p.pendingLevels--;
  hide('levelup');
  game.state = 'play';
  if (p.pendingLevels > 0) openLevelUp();
}

// Une arme qui monte de niveau : onde de choc + "Niv. X !" dans la couleur de son nouveau niveau
function weaponLevelFx(w) {
  const p = game.player, lv = visualLevel(w), color = LEVEL_COLORS[lv] || '#fff';
  if (w.legendary) Sfx.legendary(); else Sfx.weaponUp();
  game.effects.push({ type: 'levelup', color, t: 0, life: w.legendary ? 1.2 : 0.8 });
  game.texts.push({ x: p.x, y: p.y - 34, text: `${WEAPONS[w.id].icon} ${w.legendary ? 'LÉGENDAIRE' : 'Niv. ' + w.level} !`, t: 0, life: 1.6, color });
  for (let i = 0; i < 16 + lv * (w.legendary ? 6 : 2); i++) {
    const a = Math.random() * Math.PI * 2, s = 80 + Math.random() * 80;
    game.particles.push({ x: p.x, y: p.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0, life: 0.6, color });
  }
}

// ---- Coffre du directeur : rend légendaire une arme au max (prioritaire), sinon monte une arme ----
function openChest() {
  const p = game.player;
  const maxed = legendCount() >= MAX_LEGENDARY ? [] : game.weapons.filter(w => w.level >= WEAPONS[w.id].maxLevel && !w.legendary);
  const upgradable = game.weapons.filter(w => w.level < WEAPONS[w.id].maxLevel);
  let html, sub = 'Une de tes armes monte de niveau';
  if (maxed.length) {
    const w = maxed[Math.random() * maxed.length | 0];
    w.legendary = true;
    weaponLevelFx(w);
    const d = WEAPONS[w.id];
    sub = 'Une de tes armes devient légendaire !';
    game.banner = { text: '🔥 Arme légendaire : les collègues redoublent d\'efforts !', t: 3.5 }; // s'affiche à la reprise
    html = `<div class="reward legendary"><span class="icon">${d.icon}</span>
      <div><b>${d.name} ★</b><em>LÉGENDAIRE</em><p>${d.legend}</p></div></div>`;
  } else if (upgradable.length) {
    const w = upgradable[Math.random() * upgradable.length | 0];
    w.level++;
    weaponLevelFx(w);
    const d = WEAPONS[w.id];
    html = `<div class="reward"><span class="icon">${d.icon}</span>
      <div><b>${d.name}</b><em>Niv. ${w.level}</em><p>${describeUpgrade(d, w.level)}</p></div></div>`;
  } else {
    p.hp = p.maxHp;
    html = `<div class="reward"><span class="icon">💰</span>
      <div><b>Prime exceptionnelle</b><p>Plus aucune arme à améliorer : PV entièrement restaurés</p></div></div>`;
  }
  document.getElementById('chestSub').textContent = sub;
  document.getElementById('chestContent').innerHTML = html;
  game.state = 'chest';
  show('chest');
}

function closeChest() {
  if (game.state !== 'chest') return;
  hide('chest');
  game.state = 'play';
}

// ---- États ----
function show(id) { document.getElementById(id).classList.remove('hidden'); }
function hide(id) { document.getElementById(id).classList.add('hidden'); }

function togglePause() {
  if (game.state === 'play') { game.state = 'pause'; show('pause'); }
  else if (game.state === 'pause') { game.state = 'play'; hide('pause'); }
}

function endGame(won) {
  game.state = 'over';
  const name = CHARACTERS[game.player.charId].name, clock = officeClock(game.time);
  const late = game.time >= GAME_DURATION;
  let title, text;
  if (game.goal) {
    title = won ? 'Salle PI atteinte !' : late ? '18h00 : la PI est finie !' : 'Burn-out !';
    text = won ? `${name} rejoint la salle PI à <b>${clock}</b>.` : late ? (game.hasBadge ? `${name} n'a jamais trouvé la salle PI.` : `${name} n'a jamais retrouvé son badge.`) : `${name} a craqué à <b>${clock}</b>, avant la PI.`;
  } else {
    title = won ? '18h00 : journée terminée !' : 'Burn-out !';
    text = won ? `${name} rentre enfin chez soi.` : `${name} a craqué à <b>${clock}</b>`;
  }
  if (won) Sfx.win(); else Sfx.lose();
  document.getElementById('endTitle').textContent = title;
  document.getElementById('stats').innerHTML = text + '<br>' +
    `Niveau : <b>${game.player.level}</b><br>Collègues neutralisés : <b>${game.kills}</b><br>Directeurs vaincus : <b>${game.bossKills}</b>`;
  document.getElementById('dmgStats').innerHTML = damageTable();
  show('gameover');
}

// Tableau des dégâts par source, de la plus efficace à la moins efficace
const EXTRA_SOURCES = {
  follower: { icon: '🧑‍💼', name: 'Collègue de Sheryna' },
  printer:  { icon: '🖨️', name: 'Imprimantes explosives' },
};
function damageTable() {
  const rows = game.weapons.map(w => ({
    icon: WEAPONS[w.id].icon, name: WEAPONS[w.id].name,
    tag: w.legendary ? '★' : 'Niv. ' + w.level, legendary: w.legendary, ...statOf(w.id),
  }));
  for (const [id, s] of Object.entries(EXTRA_SOURCES)) if (game.stats[id]) rows.push({ ...s, tag: '', ...game.stats[id] });
  const sp = CHARACTERS[game.player.charId].special;
  if (sp && game.stats.special) rows.push({ icon: sp.icon, name: sp.name, tag: 'Super pouvoir', ...game.stats.special });
  rows.sort((a, b) => b.dmg - a.dmg);
  const total = rows.reduce((sum, r) => sum + r.dmg, 0) || 1, top = rows.length ? rows[0].dmg || 1 : 1;
  const fmt = n => Math.round(n).toLocaleString('fr-FR');
  return `<table class="dmg"><thead><tr><th colspan="2">Arme</th><th>Dégâts</th><th>Éliminés</th></tr></thead><tbody>` +
    rows.map(r => `<tr${r.legendary ? ' class="legendary"' : ''}>
      <td class="ico">${r.icon}</td>
      <td><b>${r.name}</b> <em>${r.tag}</em><div class="bar"><span style="width:${(r.dmg / top * 100).toFixed(1)}%"></span></div></td>
      <td class="num">${fmt(r.dmg)}<small>${Math.round(r.dmg / total * 100)} %</small></td>
      <td class="num">${fmt(r.kills)}</td></tr>`).join('') +
    `</tbody></table>`;
}

function gameOver() { endGame(false); }

function formatTime(t) {
  const s = Math.floor(t);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

// Heure de bureau : 0 → 9h00, GAME_DURATION → 18h00
function officeClock(t) {
  const m = 9 * 60 + Math.min(t, GAME_DURATION) / GAME_DURATION * 9 * 60;
  return `${Math.floor(m / 60)}h${String(Math.floor(m % 60)).padStart(2, '0')}`;
}

// ---- Rendu ----
function draw() {
  const p = game.player;
  const camX = Math.round(p.x - W / 2 + (Math.random() - 0.5) * game.shake);
  const camY = Math.round(p.y - H / 2 + (Math.random() - 0.5) * game.shake);
  const inView = (x, y, m = 60) => x > camX - m && x < camX + W + m && y > camY - m && y < camY + H + m;

  ctx.setTransform(1, 0, 0, 1, -camX, -camY);
  ctx.imageSmoothingEnabled = false;

  // Sol du niveau (moquette ou parquet)
  ctx.fillStyle = floorPatterns[LEVELS[game.level].floor];
  ctx.fillRect(camX, camY, W, H);

  // Salle PI
  const g = game.goal;
  if (g && g.x < camX + W && g.x + g.w > camX && g.y - 60 < camY + H && g.y + g.h + 20 > camY) drawPiRoom(g);
  // Badge à récupérer : posé au sol, brille et flotte
  if (g && !game.hasBadge && inView(g.badgeX, g.badgeY)) {
    const glow = 34 + Math.sin(game.time * 5) * 6;
    const gr = ctx.createRadialGradient(g.badgeX, g.badgeY, 0, g.badgeX, g.badgeY, glow);
    gr.addColorStop(0, 'rgba(150,205,50,0.6)');
    gr.addColorStop(1, 'rgba(150,205,50,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(g.badgeX - glow, g.badgeY - glow, glow * 2, glow * 2);
    const img = Textures.badge;
    ctx.drawImage(img, Math.round(g.badgeX - img.width / 2), Math.round(g.badgeY - img.height / 2 + Math.sin(game.time * 3) * 3));
  }

  // Aura de café
  for (const w of game.weapons) {
    if (w.id !== 'coffee' || !w.radius) continue;
    const r = w.radius * (1 + Math.sin(game.time * 4) * 0.03);
    const gr = ctx.createRadialGradient(p.x, p.y, r * 0.3, p.x, p.y, r);
    gr.addColorStop(0, 'rgba(160,100,50,0)');
    gr.addColorStop(1, 'rgba(160,100,50,0.35)');
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
    const lv = visualLevel(w), col = LEVEL_COLORS[lv];
    ctx.strokeStyle = col || 'rgba(220,170,110,0.5)';
    ctx.globalAlpha = col ? 0.35 + Math.sin(game.time * 4) * 0.1 : 1;
    ctx.lineWidth = 2 + lv * 0.4;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Flaques des couches (au sol, parfum de rose : flaque rose et fleurs qui s'envolent)
  for (const w of game.weapons) {
    if (w.id !== 'diaper' || !w.zones) continue;
    for (const z of w.zones) {
      const fade = Math.min(1, z.t / 0.5);
      ctx.globalAlpha = fade * 0.8;
      ctx.fillStyle = '#c8325e';
      ctx.beginPath();
      ctx.ellipse(z.x, z.y, z.r, z.r * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      const lv = visualLevel(w), col = LEVEL_COLORS[lv];
      if (col) { // contour à la couleur du niveau de l'arme
        ctx.strokeStyle = col;
        ctx.lineWidth = 1 + lv * 0.4;
        ctx.stroke();
      }
      ctx.fillStyle = '#f07aa0';
      ctx.beginPath();
      ctx.ellipse(z.x - z.r * 0.2, z.y - z.r * 0.1, z.r * 0.5, z.r * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      for (let i = -1; i <= 1; i++) {
        const ph = (game.time * 0.7 + i * 0.37 + z.x * 0.013) % 1; // 0 → 1 pendant la montée
        const fx = z.x + i * z.r * 0.45 + Math.sin(game.time * 3 + i * 2) * 4;
        const fy = z.y - 4 - ph * 36;
        ctx.globalAlpha = fade * (1 - ph);
        ctx.fillStyle = i === 0 ? '#e0304a' : '#ff8ab0';
        for (let k = 0; k < 5; k++) {
          const a = k * Math.PI * 2 / 5 + game.time;
          ctx.beginPath();
          ctx.arc(fx + Math.cos(a) * 3, fy + Math.sin(a) * 3, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#ffd866';
        ctx.beginPath();
        ctx.arc(fx, fy, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Flammes des cocktails Molotov (apéro légendaire)
  for (const w of game.weapons) {
    if (w.id !== 'beer' || !w.fires) continue;
    for (const z of w.fires) {
      if (!inView(z.x, z.y, z.r + 40)) continue;
      const fade = Math.min(1, z.t / 0.5);
      ctx.globalAlpha = fade * 0.5;
      ctx.fillStyle = '#c03a10';
      ctx.beginPath();
      ctx.ellipse(z.x, z.y, z.r, z.r * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 7; i++) {
        const fx = z.x + Math.cos(i * 2.4) * z.r * 0.65, fy = z.y + Math.sin(i * 2.4) * z.r * 0.35;
        const fh = 12 + Math.sin(game.time * 12 + i * 1.7) * 5;
        ctx.globalAlpha = fade * 0.9;
        ctx.fillStyle = i % 2 ? '#ff7020' : '#ffb030';
        ctx.beginPath();
        ctx.moveTo(fx - 6, fy);
        ctx.quadraticCurveTo(fx - 4, fy - fh * 0.6, fx, fy - fh);
        ctx.quadraticCurveTo(fx + 4, fy - fh * 0.6, fx + 6, fy);
        ctx.fill();
        ctx.fillStyle = '#ffe060';
        ctx.beginPath();
        ctx.moveTo(fx - 3, fy);
        ctx.quadraticCurveTo(fx, fy - fh * 0.5, fx + 3, fy);
        ctx.fill();
      }
    }
  }
  ctx.globalAlpha = 1;

  // Gemmes et bonus
  for (const g of game.gems) {
    if (!inView(g.x, g.y)) continue;
    const img = g.value >= 10 ? Textures.gems.red : g.value >= 3 ? Textures.gems.green : Textures.gems.blue;
    ctx.drawImage(img, Math.round(g.x - img.width / 2), Math.round(g.y - img.height / 2 + Math.sin(game.time * 4 + g.x) * 2));
  }
  for (const pk of game.pickups) {
    const img = Textures[pk.kind];
    if (pk.kind === 'chest' || pk.kind === 'bolt' || pk.kind === 'ticket') {
      const glow = (pk.kind === 'chest' ? 30 : 18) + Math.sin(game.time * 5) * 6;
      const gr = ctx.createRadialGradient(pk.x, pk.y, 0, pk.x, pk.y, glow);
      const rgb = pk.kind === 'ticket' ? '127,216,255' : '255,220,80';
      gr.addColorStop(0, `rgba(${rgb},0.6)`);
      gr.addColorStop(1, `rgba(${rgb},0)`);
      ctx.fillStyle = gr;
      ctx.fillRect(pk.x - glow, pk.y - glow, glow * 2, glow * 2);
    }
    ctx.drawImage(img, Math.round(pk.x - img.width / 2), Math.round(pk.y - img.height / 2));
  }

  // Entités + mobilier triés par la position des pieds pour la profondeur
  const list = [];
  for (const e of game.enemies) if (inView(e.x, e.y, 80)) list.push({ key: e.prop ? e.prop.y + e.prop.h / 2 : e.y + e.r, e });
  list.push({ key: p.y + p.r, e: p });
  if (game.follower && game.follower.mode !== 'away') list.push({ key: game.follower.y + game.follower.r, e: game.follower });
  const cx0 = Math.floor((camX - 100) / CHUNK), cx1 = Math.floor((camX + W + 100) / CHUNK);
  const cy0 = Math.floor((camY - 100) / CHUNK), cy1 = Math.floor((camY + H + 100) / CHUNK);
  for (let cx = cx0; cx <= cx1; cx++)
    for (let cy = cy0; cy <= cy1; cy++)
      for (const pr of chunkProps(cx, cy))
        if (!pr.broken && !pr.entity) list.push({ key: pr.y + pr.h / 2, prop: pr });
  list.sort((a, b) => a.key - b.key);

  for (const it of list) {
    if (it.prop) { ctx.drawImage(it.prop.img, it.prop.drawX, it.prop.drawY); continue; }
    const e = it.e;
    if (e === p) { drawPlayer(p); continue; }
    if (e === game.follower) { drawFollower(e); continue; }
    const set = Sprites[e.type];
    if (e.prop) {
      // Plante : tremble quand on la frappe
      const shake = e.flash > 0 ? Math.round((Math.random() - 0.5) * 4) : 0;
      ctx.drawImage(e.flash > 0 ? set.flash[0] : set.frames[0], e.prop.drawX + shake, e.prop.drawY);
      continue;
    }
    const frame = set.frames.length > 1 ? Math.floor(game.time * 8 + e.phase) % set.frames.length : 0;
    const img = e.flash > 0 ? set.flash[frame] : set.frames[frame];
    const w = img.width * e.scale, h = img.height * e.scale;
    const bob = e.flying ? Math.sin(game.time * 6 + e.phase) * 3 : -Math.abs(Math.sin(game.time * 8 + e.phase)) * 2;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(e.x, e.y + h * 0.45 + (e.flying ? 8 : 0), w * 0.3, w * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
    if (e.elite) {
      ctx.fillStyle = 'rgba(255,60,60,0.25)';
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r + 8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.drawImage(img, Math.round(e.x - w / 2), Math.round(e.y - h / 2 + bob), w, h);
    if (e.slow > 0) {
      // Éméché : bulles de bière au-dessus de la tête
      ctx.fillStyle = '#ffd860';
      for (let i = 0; i < 3; i++) {
        const t = (game.time * 1.5 + i / 3 + e.phase) % 1;
        ctx.globalAlpha = 1 - t;
        ctx.beginPath();
        ctx.arc(e.x + Math.sin(t * 6 + i * 2) * 6, e.y - h / 2 - 4 - t * 14, 2 + i * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    if (e.stun > 0) {
      const s = Textures.nogo;
      ctx.drawImage(s, Math.round(e.x - s.width / 4), Math.round(e.y - h / 2 - 14), s.width / 2, s.height / 2);
    }
  }

  // Projectiles (orientés dans le sens du tir, sans finir la tête en bas)
  for (const pr of game.projectiles) {
    const img = Textures[pr.sprite];
    ctx.save();
    ctx.translate(Math.round(pr.x), Math.round(pr.y));
    // Plus l'arme est haut niveau, plus le projectile est gros et entouré d'une aura colorée
    const lvl = pr.lvl || 1, k = (1 + (lvl - 1) * 0.05) * (pr.size || 1), col = LEVEL_COLORS[lvl];
    if (col) {
      ctx.globalAlpha = 0.2 + lvl * 0.03 + Math.sin(game.time * 10 + pr.x * 0.05) * 0.05;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(img.width, img.height) * 0.5 * k + 1 + lvl, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (pr.spin) ctx.rotate(game.time * 15); // shuriken
    if (!pr.noRotate) {
      ctx.rotate(Math.atan2(pr.vy, pr.vx));
      if (pr.vx < 0) ctx.scale(1, -1);
    }
    ctx.drawImage(img, -img.width * k / 2, -img.height * k / 2, img.width * k, img.height * k);
    ctx.restore();
  }

  // Post-it en orbite
  for (const w of game.weapons) {
    if (w.id !== 'postit' || !w.items) continue;
    const img = Textures.postit;
    const lv = visualLevel(w), k = 1 + (lv - 1) * 0.05, col = LEVEL_COLORS[lv];
    for (const b of w.items) {
      ctx.save();
      ctx.translate(b.x, b.y);
      if (col) {
        ctx.globalAlpha = 0.25 + lv * 0.03;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(0, 0, img.width * 0.5 * k + 2 + lv, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.rotate(Math.sin(b.a * 2) * 0.3);
      ctx.drawImage(img, -img.width * k / 2, -img.height * k / 2, img.width * k, img.height * k);
      ctx.restore();
    }
  }

  // Coups de câble et de clavier
  for (const ef of game.effects) {
    const k = ef.t / ef.life;
    ctx.save();
    const glow = LEVEL_COLORS[ef.lvl];
    if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = 4 + ef.lvl * 2; } // halo selon le niveau de l'arme
    if (ef.type === 'blast') {
      // Explosion d'imprimante : boule de feu + onde de choc
      ctx.globalAlpha = (1 - k) * 0.6;
      ctx.fillStyle = k < 0.3 ? '#ffe060' : '#ff7020';
      ctx.beginPath();
      ctx.arc(ef.x, ef.y, ef.r * (0.4 + k * 0.6), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = '#fff4c0';
      ctx.lineWidth = 4 * (1 - k) + 1;
      ctx.beginPath();
      ctx.arc(ef.x, ef.y, ef.r * (0.6 + k * 0.5), 0, Math.PI * 2);
      ctx.stroke();
    } else if (ef.type === 'levelup') {
      // Onde de choc autour du joueur quand une arme monte de niveau
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = ef.color;
      ctx.shadowColor = ef.color;
      ctx.shadowBlur = 12;
      for (let i = 0; i < 2; i++) {
        ctx.lineWidth = 6 * (1 - k) + 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 20 + (k + i * 0.25) * 70, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (ef.type === 'cable') {
      ctx.globalAlpha = 1 - k;
      ctx.beginPath();
      ctx.ellipse(ef.x, ef.y, ef.w / 2, ef.h / 2, 0, Math.PI, Math.PI * 2);
      ctx.strokeStyle = '#2f80d0';
      ctx.lineWidth = Math.max(2, ef.h * 0.3 * (1 - k));
      ctx.stroke();
      ctx.strokeStyle = '#9cd0ff';
      ctx.lineWidth = Math.max(1, ef.h * 0.1 * (1 - k));
      ctx.stroke();
    } else if (ef.type === 'keyboard') {
      // Le clavier balaie l'arc, suivi d'une traînée
      const start = ef.angle - ef.arc / 2;
      const cur = start + ef.arc * Math.min(1, k * 1.4);
      ctx.translate(p.x, p.y);
      ctx.globalAlpha = 0.35 * (1 - k);
      ctx.fillStyle = '#cfe6ff';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, ef.reach, start, cur);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1 - k * 0.5;
      ctx.rotate(cur);
      const img = Textures.keyboard;
      ctx.drawImage(img, 12, -img.height / 2, ef.reach - 12, img.height);
    } else if (ef.type === 'laugh') {
      // Cône rose + ondes sonores qui s'éloignent + "HA HA"
      const start = ef.angle - ef.arc / 2, end = ef.angle + ef.arc / 2;
      ctx.translate(ef.x, ef.y);
      ctx.globalAlpha = 0.15 * (1 - k);
      ctx.fillStyle = '#ff70b0';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, ef.reach, start, end);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = '#ff70b0';
      ctx.lineWidth = 4;
      for (let i = 0; i < 3; i++) {
        const r = ef.reach * Math.min(1, k * 1.3 - i * 0.2);
        if (r <= 0) continue;
        ctx.beginPath();
        ctx.arc(0, 0, r, start, end);
        ctx.stroke();
      }
      const tr = ef.reach * 0.6 * k + 20;
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#000';
      ctx.fillStyle = '#ffd0e8';
      ctx.strokeText('HA HA', Math.cos(ef.angle) * tr, Math.sin(ef.angle) * tr);
      ctx.fillText('HA HA', Math.cos(ef.angle) * tr, Math.sin(ef.angle) * tr);
    }
    ctx.restore();
  }

  drawSpecialWorld();

  // Particules
  for (const pa of game.particles) {
    ctx.globalAlpha = 1 - pa.t / pa.life;
    ctx.fillStyle = pa.color;
    ctx.fillRect(Math.round(pa.x) - 2, Math.round(pa.y) - 2, 4, 4);
  }
  ctx.globalAlpha = 1;

  // Bulle du suiveur, au-dessus de tout le reste
  const f = game.follower;
  if (f && f.mode !== 'away' && f.bubble > 0) drawBubble(f.text, f.x, f.y - Sprites.follower.right.height * followerScale(f) / 2 - 4);
  // Bulle de Sheryna
  if (game.playerBubble) drawBubble(game.playerBubble.text, p.x, p.y - Sprites[p.charId].right.height / 2 - 4);
  // Bulle de l'orateur qui parle sur la scène de la PI
  if (g && g.talkT > 0.5) {
    const sx = g.doorX + (g.talker ? 50 : -50), sy = g.y + 104;
    if (sx > camX - 100 && sx < camX + W + 100 && sy > camY - 40 && sy < camY + H + 80) drawBubble(g.line, sx, sy - Sprites.speakerA.right.height / 2);
  }

  // Chiffres de dégâts
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'center';
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#000';
  for (const tx of game.texts) {
    ctx.globalAlpha = 1 - tx.t / tx.life;
    ctx.strokeText(tx.text, tx.x, tx.y);
    ctx.fillStyle = tx.color || '#fff';
    ctx.fillText(tx.text, tx.x, tx.y);
  }
  ctx.globalAlpha = 1;

  drawHud();
}

function drawPlayer(p) {
  const set = Sprites[p.charId];
  const img = p.dirX < 0 ? set.left : set.right;
  // Népal attitude : le personnage lévite, entouré d'une aura
  const levitate = game.special && game.special.levitate && game.special.t > 0;
  const bob = levitate ? -14 + Math.sin(game.time * 3) * 4 : p.moving ? -Math.abs(Math.sin(game.time * 12)) * 3 : 0;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + img.height / 2 - 2, 12, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  if (levitate) {
    ctx.fillStyle = `rgba(255,220,120,${0.25 + Math.sin(game.time * 5) * 0.1})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y + bob, 26, 0, Math.PI * 2);
    ctx.fill();
  }
  if (p.invuln > 0 && Math.floor(p.invuln * 20) % 2) ctx.globalAlpha = 0.4;
  ctx.drawImage(img, Math.round(p.x - img.width / 2), Math.round(p.y - img.height / 2 + bob));
  ctx.globalAlpha = 1;
  // Barre de vie sous le joueur
  const bw = 36, by = p.y + img.height / 2 + 4;
  ctx.fillStyle = '#300';
  ctx.fillRect(Math.round(p.x - bw / 2), Math.round(by), bw, 4);
  ctx.fillStyle = '#e33';
  ctx.fillRect(Math.round(p.x - bw / 2), Math.round(by), Math.round(bw * p.hp / p.maxHp), 4);
}

// La salle PI : murs, écran, scène avec 2 orateurs et public assis (dessinée au sol, sous les personnages)
function drawPiRoom(g) {
  const { x, y, w, h } = g, T = PI_WALL, cx = g.doorX;
  // Sol : moquette bleue + tapis rouge de la porte à la scène
  ctx.fillStyle = '#2c3a58';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#a0303e';
  ctx.fillRect(cx - 36, y + 140, 72, h - 140);
  ctx.fillStyle = '#c8a040';
  ctx.fillRect(cx - 36, y + 140, 3, h - 140);
  ctx.fillRect(cx + 33, y + 140, 3, h - 140);
  // Mur du fond avec sa façade et l'écran de projection
  ctx.fillStyle = '#8a909c';
  ctx.fillRect(x, y, w, T);
  ctx.fillStyle = '#d8dce4';
  ctx.fillRect(x, y + T, w, 36);
  ctx.fillStyle = '#a8aeb8';
  ctx.fillRect(x, y + T + 32, w, 4);
  ctx.fillStyle = '#1a1e26';
  ctx.fillRect(cx - 104, y + 4, 208, 44);
  ctx.fillStyle = '#f4f6fa';
  ctx.fillRect(cx - 100, y + 8, 200, 36);
  ctx.fillStyle = '#1423dc';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PI PLANNING', cx, y + 26);
  ctx.fillStyle = '#96cd32';
  ctx.fillRect(cx - 60, y + 32, 120 * ((game.time / 20) % 1), 4); // les slides défilent
  // Scène
  ctx.fillStyle = '#6a4024';
  ctx.fillRect(cx - 200, y + 56, 400, 76);
  ctx.fillStyle = '#8a5a34';
  ctx.fillRect(cx - 200, y + 56, 400, 4);
  ctx.fillStyle = '#4a2a14';
  ctx.fillRect(cx - 200, y + 128, 400, 10);
  for (const [k, spr] of [[-1, Sprites.speakerA.right], [1, Sprites.speakerB.left]]) {
    const talking = g.talker === (k > 0 ? 1 : 0) && g.talkT > 0.5;
    const bob = talking ? Math.round(Math.sin(game.time * 10) * 1.5) : 0;
    ctx.drawImage(spr, Math.round(cx + k * 50 - spr.width / 2), Math.round(y + 104 - spr.height / 2 + bob));
  }
  // Public vu de dos : buste, tête, puis dossier de chaise devant
  for (const s of g.seats) {
    if (!s.empty) {
      const nod = Math.sin(game.time * 2 + s.phase) > 0.95 ? 2 : 0;
      ctx.fillStyle = s.shirt;
      ctx.fillRect(s.x - 10, s.y - 16, 20, 14);
      ctx.fillStyle = s.hair;
      ctx.beginPath();
      ctx.arc(s.x, s.y - 22 + nod, 8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#1e2228';
    ctx.fillRect(s.x - 13, s.y - 6, 26, 14);
    ctx.fillStyle = '#3a404c';
    ctx.fillRect(s.x - 13, s.y - 6, 26, 3);
  }
  // Murs latéraux et avant (porte au milieu, en bas)
  ctx.fillStyle = '#8a909c';
  ctx.fillRect(x, y, T, h);
  ctx.fillRect(x + w - T, y, T, h);
  const side = (w - PI_DOOR) / 2;
  ctx.fillRect(x, y + h - T, side, T);
  ctx.fillRect(x + w - side, y + h - T, side, T);
  ctx.fillStyle = '#6a707c';
  ctx.fillRect(x, y + h, side, 8);
  ctx.fillRect(x + w - side, y + h, side, 8);
  // Porte : fermée avec un cadenas sans badge, battants ouverts avec
  if (!game.hasBadge) {
    ctx.fillStyle = '#5a6a80';
    ctx.fillRect(x + side, y + h - T, PI_DOOR, T);
    ctx.fillStyle = '#44526a';
    ctx.fillRect(x + side, y + h, PI_DOOR, 8);
    ctx.fillRect(cx - 1, y + h - T, 2, T + 8);
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🔒', cx, y + h + 4);
  } else {
    ctx.fillStyle = '#5a6a80';
    ctx.fillRect(x + side, y + h - T - 40, 6, 40);
    ctx.fillRect(x + w - side - 6, y + h - T - 40, 6, 40);
  }
  // Panneau au-dessus de la porte
  ctx.fillStyle = '#96cd32';
  ctx.fillRect(cx - 44, y + h - 30, 88, 18);
  ctx.fillStyle = '#0a1018';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('SALLE PI', cx, y + h - 17);
  ctx.textAlign = 'left';
}

// Taille d'affichage du suiveur : normale, ou géant (×3) pendant le super pouvoir de Sheryna
const followerScale = f => FOLLOWER_SIZE * (f.giant ? 3 : 1);

function drawFollower(f) {
  const img = f.dirX < 0 ? Sprites.follower.left : Sprites.follower.right;
  const size = followerScale(f);
  const w = Math.round(img.width * size), h = Math.round(img.height * size);
  const bob = f.moving ? -Math.abs(Math.sin(game.time * 12 + 1)) * 3 : 0;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(f.x, f.y + h / 2 - 2, 10 * size / FOLLOWER_SIZE, 3.5 * size / FOLLOWER_SIZE, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = f.mode === 'leaving' ? Math.max(0, Math.min(1, f.awayT / 1.5)) : 1; // s'efface en partant
  ctx.drawImage(img, Math.round(f.x - w / 2), Math.round(f.y - h / 2 + bob), w, h);
  ctx.globalAlpha = 1;
}

// Bulle de BD dont la pointe est en (x, y)
function drawBubble(text, x, y) {
  ctx.font = 'bold 12px sans-serif';
  const w = ctx.measureText(text).width + 14, h = 22;
  const bx = Math.round(x - w / 2), by = Math.round(y - h - 6);
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(bx, by, w, h, 8);
  ctx.fill();
  ctx.stroke();
  // Pointe vers le perso, sans trait à la jonction avec la bulle
  ctx.beginPath();
  ctx.moveTo(x - 5, by + h - 1);
  ctx.lineTo(x, y);
  ctx.lineTo(x + 5, by + h - 1);
  ctx.fill();
  ctx.stroke();
  ctx.fillRect(x - 4, by + h - 2, 8, 3);
  ctx.fillStyle = '#222';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, by + h / 2 + 1);
  ctx.textBaseline = 'alphabetic';
}

function drawSlotRow(items, slots, y, color) {
  const sw = 40, sh = 26, step = 44;
  for (let i = 0; i < slots; i++) {
    const x = 10 + i * step, it = items[i];
    ctx.lineWidth = 2;
    if (!it) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(x, y, sw, sh);
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.strokeRect(x + 1, y + 1, sw - 2, sh - 2);
      ctx.setLineDash([]);
      continue;
    }
    // Niveau max : "M" doré ; légendaire : "★" rouge
    const maxed = it.lvl >= it.max;
    const badge = it.legendary ? '★' : maxed ? 'M' : it.lvl, accent = it.legendary ? LEVEL_COLORS[LEGENDARY_LEVEL] : '#ffd866';
    ctx.fillStyle = it.legendary ? 'rgba(90,10,30,0.7)' : 'rgba(0,0,0,0.55)';
    ctx.fillRect(x, y, sw, sh);
    ctx.strokeStyle = maxed ? accent : color;
    ctx.strokeRect(x + 1, y + 1, sw - 2, sh - 2);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = '15px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText(it.icon, x + 3, y + sh / 2 + 1);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'alphabetic';
    ctx.font = 'bold 11px monospace';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#000';
    ctx.strokeText(badge, x + sw - 3, y + sh - 4);
    ctx.fillStyle = maxed ? accent : '#fff';
    ctx.fillText(badge, x + sw - 3, y + sh - 4);
  }
}

function drawHud() {
  const p = game.player;
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  // Barre d'XP
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, W, 16);
  ctx.fillStyle = '#3a8aff';
  ctx.fillRect(0, 0, W * p.xp / p.xpNext, 16);
  ctx.strokeStyle = '#4aa3df';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, W - 2, 14);
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'right';
  ctx.fillStyle = '#fff';
  ctx.fillText('NIV ' + p.level, W - 8, 12);

  // Chrono et compteur
  ctx.font = 'bold 28px monospace';
  ctx.textAlign = 'center';
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#000';
  ctx.strokeText(formatTime(game.time), W / 2, 50);
  ctx.fillText(formatTime(game.time), W / 2, 50);
  ctx.font = 'bold 14px monospace';
  ctx.lineWidth = 3;
  ctx.strokeText('🕘 ' + officeClock(game.time) + ' / 18h00', W / 2, 70);
  ctx.fillText('🕘 ' + officeClock(game.time) + ' / 18h00', W / 2, 70);

  // Barre de vie du boss
  const boss = game.enemies.find(e => e.boss);
  if (boss) {
    const bw = Math.min(400, W - 40), bx = (W - bw) / 2, by = 82;
    ctx.fillStyle = '#200';
    ctx.fillRect(bx, by, bw, 12);
    ctx.fillStyle = '#d02030';
    ctx.fillRect(bx, by, bw * Math.max(0, boss.hp) / boss.maxHp, 12);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, bw, 12);
    ctx.font = 'bold 12px monospace';
    ctx.lineWidth = 3;
    ctx.strokeText('👔 ' + boss.name.toUpperCase(), W / 2, by + 26);
    ctx.fillStyle = '#fff';
    ctx.fillText('👔 ' + boss.name.toUpperCase(), W / 2, by + 26);
  }

  // Niveau 2 : flèche vers la porte de la salle PI, en haut au milieu
  if (game.goal && game.state !== 'title' && game.state !== 'start' && game.state !== 'levels') {
    const g = game.goal;
    const tx = game.hasBadge ? g.doorX : g.badgeX, ty = game.hasBadge ? g.doorY + 30 : g.badgeY;
    const dx = tx - p.x, dy = ty - p.y;
    const ay = boss ? 136 : 104, a = Math.atan2(dy, dx);
    ctx.save();
    ctx.translate(W / 2, ay);
    ctx.rotate(a);
    ctx.fillStyle = '#96cd32';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.lineTo(-4, -14);
    ctx.lineTo(-4, -6);
    ctx.lineTo(-18, -6);
    ctx.lineTo(-18, 6);
    ctx.lineTo(-4, 6);
    ctx.lineTo(-4, 14);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
    ctx.restore();
    const label = `${game.hasBadge ? 'Salle PI' : '🪪 Badge'} · ${Math.round(Math.hypot(dx, dy) / 40)} m`;
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#000';
    ctx.strokeText(label, W / 2, ay + 34);
    ctx.fillStyle = '#fff';
    ctx.fillText(label, W / 2, ay + 34);
  }

  // Événement en cours (en bas au milieu) et son coupé (en haut à droite)
  if (game.event) {
    const label = `${game.event.label} · ${Math.ceil(game.event.t)} s`;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#000';
    ctx.strokeText(label, W / 2, H - 24);
    ctx.fillStyle = game.event.id === 'incident' ? '#ff8a60' : '#ffd866';
    ctx.fillText(label, W / 2, H - 24);
  }
  if (Sfx.muted) {
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#fff';
    ctx.fillText('🔇', W - 12, 68);
  }

  // Bandeau d'annonce
  if (game.banner) {
    ctx.globalAlpha = Math.min(1, game.banner.t);
    ctx.font = 'bold 26px sans-serif';
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#000';
    ctx.strokeText(game.banner.text, W / 2, H * 0.3);
    ctx.fillStyle = '#ffd866';
    ctx.fillText(game.banner.text, W / 2, H * 0.3);
    ctx.globalAlpha = 1;
  }

  // Flèche vers les coffres hors de l'écran
  for (const pk of game.pickups) {
    if (pk.kind !== 'chest') continue;
    const dx = pk.x - p.x, dy = pk.y - p.y;
    if (Math.abs(dx) < W / 2 - 20 && Math.abs(dy) < H / 2 - 20) continue;
    const a = Math.atan2(dy, dx);
    const t = Math.min((W / 2 - 40) / Math.abs(Math.cos(a) || 1e-6), (H / 2 - 40) / Math.abs(Math.sin(a) || 1e-6));
    ctx.save();
    ctx.translate(W / 2 + Math.cos(a) * t, H / 2 + Math.sin(a) * t);
    ctx.rotate(a);
    ctx.fillStyle = '#f0c030';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(-8, -10);
    ctx.lineTo(-8, 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 4;
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'right';
  ctx.strokeText('👔 ' + game.kills, W - 12, 44);
  ctx.fillText('👔 ' + game.kills, W - 12, 44);

  // Inventaire : une case par emplacement, les cases vides restent visibles
  // Rien à afficher tant que le personnage n'est pas choisi
  const inGame = game.state !== 'title' && game.state !== 'start' && game.state !== 'levels';
  const weaponSlots = !inGame ? [] : game.weapons.map(w => ({ icon: WEAPONS[w.id].icon, lvl: w.level, max: WEAPONS[w.id].maxLevel, legendary: w.legendary }));
  const passiveSlots = !inGame ? [] : Object.entries(game.passives).map(([id, lvl]) => ({ icon: PASSIVES[id].icon, lvl, max: PASSIVES[id].maxLevel }));
  drawSlotRow(weaponSlots, MAX_WEAPONS, 24, '#4aa3df');
  drawSlotRow(passiveSlots, MAX_PASSIVES, 54, '#8fd16a');
  if (inGame) drawSpecialButton();

  // Joystick virtuel
  if (touch.active && game.state === 'play') {
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(touch.sx, touch.sy, 50, 0, Math.PI * 2);
    ctx.stroke();
    const dx = touch.x - touch.sx, dy = touch.y - touch.sy, d = Math.min(50, Math.hypot(dx, dy)) / (Math.hypot(dx, dy) || 1);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.arc(touch.sx + dx * d, touch.sy + dy * d, 20, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ---- Boucle ----
let last = performance.now();
function loop(now) {
  const dt = Math.min(1 / 30, (now - last) / 1000);
  last = now;
  if (game.state === 'play') update(dt);
  draw();
  requestAnimationFrame(loop);
}

document.getElementById('restartBtn').onclick = () => startGame(selectedChar);
document.getElementById('changeBtn').onclick = showCharSelect;
document.getElementById('chestBtn').onclick = closeChest;
document.getElementById('title').onclick = openCharSelect;
buildCharSelect();
buildLevelSelect();
newGame(selectedChar);
game.state = 'title';
requestAnimationFrame(loop);
