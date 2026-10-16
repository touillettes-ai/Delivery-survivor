// ==== Boucle principale du jeu ====
const MAX_ENEMIES = 500;
const MAX_WEAPONS = 6, MAX_PASSIVES = 6;

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
const floorPattern = ctx.createPattern(Textures.floor, 'repeat');

let game;
let selectedChar = 'coline';

// ---- Entrées ----
const keys = {};
addEventListener('keydown', e => {
  keys[e.code] = true;
  if (game.state === 'title') {
    if (e.code === 'Enter' || e.code === 'Space') openCharSelect();
    return;
  }
  if (game.state === 'start') {
    const mv = { ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0], ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1] }[e.code];
    if (mv) { e.preventDefault(); moveCharCursor(...mv); }
    if ((e.code === 'Enter' || e.code === 'Space') && !e.repeat) { e.preventDefault(); startGame(cursorChar); }
    return;
  }
  if (e.code === 'Escape' || e.code === 'KeyP') togglePause();
  const digit = /^(Digit|Numpad)[1-9]$/.test(e.code) ? +e.code.slice(-1) - 1 : -1;
  if (digit >= 0 && game.state === 'levelup') pickChoice(digit);
  if ((e.code === 'Enter' || e.code === 'Space') && game.state === 'chest') closeChest();
  else if (e.code === 'Enter' && game.state === 'over') startGame(selectedChar);
});
addEventListener('keyup', e => keys[e.code] = false);
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

// Joystick tactile / souris : on glisse depuis le point de départ
const touch = { active: false, sx: 0, sy: 0, x: 0, y: 0 };
canvas.addEventListener('pointerdown', e => {
  touch.active = true;
  touch.sx = touch.x = e.clientX;
  touch.sy = touch.y = e.clientY;
});
addEventListener('pointermove', e => { if (touch.active) { touch.x = e.clientX; touch.y = e.clientY; } });
addEventListener('pointerup', () => touch.active = false);

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
function newGame(charId) {
  game = {
    state: 'start', time: 0, kills: 0, shake: 0,
    player: {
      charId, x: 0, y: 0, r: 14, hp: 100, maxHp: 100, speed: 150,
      level: 1, xp: 0, xpNext: 5, pendingLevels: 0,
      magnet: 70, might: 1, cdMult: 1, area: 1, regen: 0, armor: 0, xpMult: 1, projSpeed: 1,
      invuln: 0, facing: { x: 1, y: 0 }, dirX: 1, moving: false,
    },
    enemies: [], projectiles: [], gems: [], pickups: [], effects: [], particles: [], texts: [],
    weapons: [], passives: {}, choices: [],
    spawnTimer: 0, eliteTimer: 60, bossIndex: 0, banner: null,
  };
  chunkCache.clear(); // les plantes cassées repoussent à chaque partie
  const ch = CHARACTERS[charId];
  if (ch.follower) game.follower = { x: -30, y: 0, r: 12, dirX: 1, moving: false, bubble: 0, bubbleTimer: 3, text: '' };
  if (ch.apply) ch.apply(game.player);
  for (const [id, lvl] of Object.entries(ch.passives || {})) {
    game.passives[id] = lvl;
    for (let i = 0; i < lvl; i++) PASSIVES[id].apply(game.player);
  }
  addWeapon(ch.weapon);
}

function startGame(charId) {
  if (!CHARACTERS[charId]) return;
  selectedChar = charId;
  newGame(charId);
  game.state = 'play';
  for (const id of ['start', 'gameover', 'levelup', 'pause', 'chest']) hide(id);
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
      b.onclick = () => startGame(id);
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
    `<b>${c.name}</b> · ${c.role}<p>${c.desc}</p><small>Arme : ${w.icon} <b>${w.name}</b> — ${w.desc}<br>Bonus : ${b.icon} <b>${b.name}</b> — ${b.desc}</small>`;
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
  // Zone de départ dégagée autour de (0,0)
  if (!((cx === 0 || cx === -1) && (cy === 0 || cy === -1))) {
    const rnd = mulberry32((cx * 73856093) ^ (cy * 19349663));
    const r = rnd();
    const type = r < 0.5 ? 'island' : r < 0.65 ? 'plant' : r < 0.75 ? 'printer' : r < 0.83 ? 'cooler' : null;
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

// Une plante proche du joueur devient une cible fixe que les armes peuvent casser
function spawnPlant(pr) {
  const e = {
    type: 'plant', prop: pr, x: pr.x, y: pr.drawY + pr.img.height / 2,
    hp: PLANT_HP, maxHp: PLANT_HP, speed: 0, dmg: 0, r: 12, scale: 1, xp: 0, color: '#3fa04a',
    flash: 0, kx: 0, ky: 0, hitT: {}, phase: 0, dead: false,
  };
  pr.entity = e;
  game.enemies.push(e);
}

function breakPlant(e) {
  const pr = e.prop;
  pr.broken = true;
  pr.entity = null;
  for (let i = 0; i < 12; i++) {
    const a = Math.random() * Math.PI * 2, s = 40 + Math.random() * 90;
    game.particles.push({ x: e.x, y: e.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0, life: 0.5, color: i % 3 ? '#3fa04a' : '#b0603a' });
  }
  if (Math.random() < PLANT_BOLT_CHANCE) game.pickups.push({ x: pr.x, y: pr.y, kind: 'bolt' });
}

// Repousse un cercle hors des meubles (glisse le long des bords)
function pushOutOfProps(o) {
  forPropsNear(o.x, o.y, pr => {
    if (pr.broken) return;
    const left = pr.x - pr.w / 2, right = pr.x + pr.w / 2, top = pr.y - pr.h / 2, bottom = pr.y + pr.h / 2;
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
  });
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
  const hp = boss ? 400 + game.time * 5 : def.hp * (1 + game.time / 120) * (elite ? 15 : 1);
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
  if (e.prop) { breakPlant(e); return; }
  game.kills++;
  game.gems.push({ x: e.x, y: e.y, value: e.xp, magnet: false, speed: 0 });
  if (e.elite || Math.random() < 0.004) game.pickups.push({ x: e.x + 16, y: e.y, kind: 'croissant' });
  if (e.boss) {
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
  game.shake = 6;
  if (p.hp <= 0) { p.hp = 0; gameOver(); }
}

function gainXp(v) {
  const p = game.player;
  p.xp += v * p.xpMult;
  while (p.xp >= p.xpNext) {
    p.xp -= p.xpNext;
    p.level++;
    p.xpNext = Math.floor(5 + p.level * 6 + Math.pow(p.level, 1.5));
    p.pendingLevels++;
  }
}

// ---- Mise à jour ----
function update(dt) {
  game.time += dt;
  const p = game.player;
  if (game.time >= GAME_DURATION) { endGame(true); return; }
  if (game.banner && (game.banner.t -= dt) <= 0) game.banner = null;

  // Déplacement
  const d = inputDir();
  p.moving = !!(d.x || d.y);
  if (p.moving) {
    const l = Math.hypot(d.x, d.y);
    p.facing = { x: d.x / l, y: d.y / l };
    if (d.x) p.dirX = Math.sign(d.x);
  }
  p.x += d.x * p.speed * dt;
  p.y += d.y * p.speed * dt;
  pushOutOfProps(p);
  p.invuln -= dt;
  p.hp = Math.min(p.maxHp, p.hp + p.regen * dt);

  // Le suiveur de Sheryna : la colle à distance, et dit coucou de temps en temps
  const f = game.follower;
  if (f) {
    const fx = p.x - f.x, fy = p.y - f.y, fd = Math.hypot(fx, fy);
    f.moving = fd > 34;
    if (f.moving) {
      const step = Math.min(fd - 34, p.speed * 1.05 * dt);
      f.x += fx / fd * step;
      f.y += fy / fd * step;
      if (Math.abs(fx) > 2) f.dirX = Math.sign(fx);
    }
    if (fd > 400) { f.x = p.x - p.dirX * 30; f.y = p.y; } // perdu de vue : il réapparaît à côté d'elle
    pushOutOfProps(f);
    f.bubble -= dt;
    if ((f.bubbleTimer -= dt) <= 0) {
      f.bubble = 2.5;
      f.bubbleTimer = 6 + Math.random() * 8;
      f.text = Math.random() < 0.5 ? 'Coucou Shery !' : 'Coucou Sheryna !';
    }
  }
  game.shake = Math.max(0, game.shake - 30 * dt);

  // Apparition des ennemis
  game.spawnTimer -= dt;
  const interval = Math.max(0.1, 0.8 - game.time / 120);
  while (game.spawnTimer <= 0) {
    game.spawnTimer += interval;
    const n = 1 + Math.floor(game.time / 45);
    for (let i = 0; i < n; i++) spawnEnemy();
  }
  game.eliteTimer -= dt;
  if (game.eliteTimer <= 0) { game.eliteTimer = 60; spawnEnemy(pickEnemyType(), 'elite'); }
  if (game.bossIndex < BOSS_TIMES.length && game.time >= BOSS_TIMES[game.bossIndex]) {
    game.bossIndex++;
    spawnEnemy('director', 'boss');
    game.banner = { text: '⚠ Un directeur arrive !', t: 3 };
  }

  // Matérialise les plantes autour du joueur
  forPropsNear(p.x, p.y, pr => {
    if (pr.type === 'plant' && !pr.broken && !pr.entity) spawnPlant(pr);
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
    const def = WEAPONS[w.id];
    def.update(w, dt, def.stats(w.level));
  }

  // Projectiles
  for (const pr of game.projectiles) {
    if (pr.homing) steerProjectile(pr, dt);
    pr.x += pr.vx * dt;
    pr.y += pr.vy * dt;
    pr.life -= dt;
    if (pr.life <= 0) pr.dead = true;
    else queryEnemies(pr.x, pr.y, pr.r + 40, e => {
      if (pr.dead || e.dead || pr.hit.has(e)) return;
      if ((e.x - pr.x) ** 2 + (e.y - pr.y) ** 2 < (e.r + pr.r) ** 2) {
        pr.hit.add(e);
        if (pr.stun && !e.prop) e.stun = Math.max(e.stun || 0, e.boss ? pr.stun * 0.3 : pr.stun);
        if (pr.slow && !e.prop) e.slow = Math.max(e.slow || 0, e.boss ? pr.slow * 0.3 : pr.slow);
        hitEnemy(e, pr.dmg, pr.vx / pr.speed * 100, pr.vy / pr.speed * 100);
        if (--pr.pierce <= 0) pr.dead = true;
      }
    });
    if (pr.dead && pr.onEnd) pr.onEnd(pr);
  }

  // Gemmes d'XP
  for (const g of game.gems) {
    const dx = p.x - g.x, dy = p.y - g.y, dist = Math.hypot(dx, dy);
    if (dist < p.r + 8) { g.dead = true; gainXp(g.value); continue; }
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
      } else {
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
    if (w) w.level++; else addWeapon(c.id);
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

// ---- Coffre du directeur : monte une arme déjà possédée ----
function openChest() {
  const p = game.player;
  const upgradable = game.weapons.filter(w => w.level < WEAPONS[w.id].maxLevel);
  let html;
  if (upgradable.length) {
    const w = upgradable[Math.random() * upgradable.length | 0];
    w.level++;
    const d = WEAPONS[w.id];
    html = `<div class="reward"><span class="icon">${d.icon}</span>
      <div><b>${d.name}</b><em>Niv. ${w.level}</em><p>${describeUpgrade(d, w.level)}</p></div></div>`;
  } else {
    p.hp = p.maxHp;
    html = `<div class="reward"><span class="icon">💰</span>
      <div><b>Prime exceptionnelle</b><p>Toutes tes armes sont au max : PV entièrement restaurés</p></div></div>`;
  }
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
  const name = CHARACTERS[game.player.charId].name;
  document.getElementById('endTitle').textContent = won ? '18h00 : journée terminée !' : 'Burn-out !';
  document.getElementById('stats').innerHTML =
    (won ? `${name} rentre enfin chez soi.<br>` : `${name} a craqué à <b>${officeClock(game.time)}</b><br>`) +
    `Niveau : <b>${game.player.level}</b><br>Collègues neutralisés : <b>${game.kills}</b><br>Directeurs vaincus : <b>${game.bossIndex - game.enemies.filter(e => e.boss).length}</b>`;
  show('gameover');
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

  // Moquette
  ctx.fillStyle = floorPattern;
  ctx.fillRect(camX, camY, W, H);

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
    ctx.strokeStyle = 'rgba(220,170,110,0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Flaques des couches sales (au sol, avec des vapeurs vertes)
  for (const w of game.weapons) {
    if (w.id !== 'diaper' || !w.zones) continue;
    for (const z of w.zones) {
      ctx.globalAlpha = Math.min(1, z.t / 0.5) * 0.8;
      ctx.fillStyle = '#5a3a14';
      ctx.beginPath();
      ctx.ellipse(z.x, z.y, z.r, z.r * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7a5020';
      ctx.beginPath();
      ctx.ellipse(z.x - z.r * 0.2, z.y - z.r * 0.1, z.r * 0.5, z.r * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#8ac040';
      ctx.lineWidth = 2;
      for (let i = -1; i <= 1; i++) {
        const sx = z.x + i * z.r * 0.4, sy = z.y - 10 - (game.time * 20 + i * 7 + 20) % 20;
        ctx.beginPath();
        ctx.moveTo(sx, sy + 8);
        ctx.quadraticCurveTo(sx + 4, sy + 4, sx, sy);
        ctx.quadraticCurveTo(sx - 4, sy - 4, sx, sy - 8);
        ctx.stroke();
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
    if (pk.kind === 'chest' || pk.kind === 'bolt') {
      const glow = (pk.kind === 'chest' ? 30 : 18) + Math.sin(game.time * 5) * 6;
      const gr = ctx.createRadialGradient(pk.x, pk.y, 0, pk.x, pk.y, glow);
      gr.addColorStop(0, 'rgba(255,220,80,0.6)');
      gr.addColorStop(1, 'rgba(255,220,80,0)');
      ctx.fillStyle = gr;
      ctx.fillRect(pk.x - glow, pk.y - glow, glow * 2, glow * 2);
    }
    ctx.drawImage(img, Math.round(pk.x - img.width / 2), Math.round(pk.y - img.height / 2));
  }

  // Entités + mobilier triés par la position des pieds pour la profondeur
  const list = [];
  for (const e of game.enemies) if (inView(e.x, e.y, 80)) list.push({ key: e.prop ? e.prop.y + e.prop.h / 2 : e.y + e.r, e });
  list.push({ key: p.y + p.r, e: p });
  if (game.follower) list.push({ key: game.follower.y + game.follower.r, e: game.follower });
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
    if (!pr.noRotate) {
      ctx.rotate(Math.atan2(pr.vy, pr.vx));
      if (pr.vx < 0) ctx.scale(1, -1);
    }
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    ctx.restore();
  }

  // Post-it en orbite
  for (const w of game.weapons) {
    if (w.id !== 'postit' || !w.items) continue;
    const img = Textures.postit;
    for (const b of w.items) {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(Math.sin(b.a * 2) * 0.3);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      ctx.restore();
    }
  }

  // Coups de câble et de clavier
  for (const ef of game.effects) {
    const k = ef.t / ef.life;
    ctx.save();
    if (ef.type === 'cable') {
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

  // Particules
  for (const pa of game.particles) {
    ctx.globalAlpha = 1 - pa.t / pa.life;
    ctx.fillStyle = pa.color;
    ctx.fillRect(Math.round(pa.x) - 2, Math.round(pa.y) - 2, 4, 4);
  }
  ctx.globalAlpha = 1;

  // Bulle du suiveur, au-dessus de tout le reste
  const f = game.follower;
  if (f && f.bubble > 0) drawBubble(f.text, f.x, f.y - Sprites.follower.right.height / 2 - 4);

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
  const bob = p.moving ? -Math.abs(Math.sin(game.time * 12)) * 3 : 0;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + img.height / 2 - 2, 12, 4, 0, 0, Math.PI * 2);
  ctx.fill();
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

function drawFollower(f) {
  const img = f.dirX < 0 ? Sprites.follower.left : Sprites.follower.right;
  const bob = f.moving ? -Math.abs(Math.sin(game.time * 12 + 1)) * 3 : 0;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(f.x, f.y + img.height / 2 - 2, 12, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.drawImage(img, Math.round(f.x - img.width / 2), Math.round(f.y - img.height / 2 + bob));
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

  // Inventaire
  ctx.textAlign = 'left';
  ctx.font = '16px sans-serif';
  let x = 10;
  for (const w of game.weapons) {
    const t = `${WEAPONS[w.id].icon}${w.level}`;
    ctx.strokeText(t, x, 44);
    ctx.fillText(t, x, 44);
    x += 44;
  }
  x = 10;
  for (const [id, lvl] of Object.entries(game.passives)) {
    const t = `${PASSIVES[id].icon}${lvl}`;
    ctx.strokeText(t, x, 70);
    ctx.fillText(t, x, 70);
    x += 44;
  }

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
newGame(selectedChar);
game.state = 'title';
requestAnimationFrame(loop);
