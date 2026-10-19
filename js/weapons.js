// ==== Armes & bonus passifs ====
// Chaque arme : stats(niveau) renvoie ses paramètres, update() la fait agir à chaque frame.

function nearestEnemy(x, y, maxDist, skip) {
  let best = null, bd = maxDist * maxDist;
  for (const e of game.enemies) {
    if (e.dead || e.prop || (skip && skip.has(e))) continue; // on ne vise pas les plantes
    const d = (e.x - x) ** 2 + (e.y - y) ** 2;
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

// Tire `count` projectiles en éventail vers l'ennemi le plus proche
function fireAtNearest(w, dt, st, proj, spread) {
  const p = game.player;
  w.timer -= dt;
  if (w.timer > 0) return;
  const target = nearestEnemy(p.x, p.y, 700);
  if (!target) return;
  w.timer = st.cd * p.cdMult;
  const base = Math.atan2(target.y - p.y, target.x - p.x);
  for (let i = 0; i < st.count; i++) {
    const a = base + (i - (st.count - 1) / 2) * spread;
    spawnProjectile({ x: p.x, y: p.y, angle: a, speed: st.speed, dmg: st.dmg, pierce: st.pierce, ...proj });
  }
}

// ---- Versions légendaires (débloquées par un coffre de directeur quand l'arme est au niveau max) ----
// Recharge prête ? (et la relance)
function cooldownReady(w, dt, cd) {
  w.timer -= dt;
  if (w.timer > 0) return false;
  w.timer = cd * game.player.cdMult;
  return true;
}

// Tire `n` projectiles répartis tout autour du joueur ; proj(i) donne les paramètres du i-ème
function fireRing(n, proj) {
  const p = game.player, a0 = Math.random() * Math.PI * 2;
  for (let i = 0; i < n; i++) spawnProjectile({ x: p.x, y: p.y, angle: a0 + i * Math.PI * 2 / n, ...proj(i) });
}

// Lance un projectile qui atterrit sur une cible au hasard à portée (couches, Molotov)
function lobAtRandom(range, proj) {
  const p = game.player;
  const targets = game.enemies.filter(e => !e.dead && !e.prop && (e.x - p.x) ** 2 + (e.y - p.y) ** 2 < range * range);
  if (!targets.length) return false;
  const t = targets[Math.random() * targets.length | 0];
  spawnProjectile({
    x: p.x, y: p.y, angle: Math.atan2(t.y - p.y, t.x - p.x), pierce: 1, noRotate: true, ...proj,
    life: Math.hypot(t.x - p.x, t.y - p.y) / (proj.speed * p.projSpeed) + 0.05,
  });
  return true;
}

// Les légendaires à projectiles tirent un peu moins souvent (recharge multipliée)
const LEGEND_PROJ_CD = 1.3;
const legendCd = w => w.legendary ? LEGEND_PROJ_CD : 1;

const DB_MAX_DEPTH = 1; // base de données légendaire : générations de bases qui éclatent en bases (1 = une seule explosion chacune)

const WEAPONS = {
  train: {
    name: 'Petit train', icon: '🚂', maxLevel: 6,
    desc: 'Envoie un petit train qui roule sur les ennemis de sa voie.',
    legend: 'Envoie des trains dans toutes les directions.',
    stats: l => ({
      dmg: 12 + l * 5,
      cd: +Math.max(1.2, 2.6 - l * 0.12).toFixed(2),
      count: 1 + Math.floor(l / 3),
      pierce: 3 + Math.floor(l / 2),
      speed: 320,
    }),
    update(w, dt, st) {
      if (w.legendary) {
        if (cooldownReady(w, dt, st.cd * LEGEND_PROJ_CD)) fireRing(8, () => ({ speed: st.speed, dmg: st.dmg, pierce: st.pierce, r: 12, life: 2.2, sprite: 'train' }));
        return;
      }
      fireAtNearest(w, dt, st, { r: 12, life: 2.2, sprite: 'train' }, 0.25);
    },
  },

  gonogo: {
    name: 'Go / No Go', icon: '🚦', maxLevel: 6,
    desc: 'Lance des GO ✅ (gros dégâts) ou des NO GO ⛔ (immobilisent).',
    legend: 'Envoie des GO et des NO GO dans toutes les directions.',
    stats: l => ({
      dmg: 9 + l * 3,
      cd: +Math.max(0.5, 1.2 - l * 0.07).toFixed(2),
      count: 1 + Math.floor(l / 2),
      stun: +(0.8 + l * 0.1).toFixed(1),
      speed: 380,
    }),
    update(w, dt, st) {
      const p = game.player;
      if (w.legendary) {
        if (cooldownReady(w, dt, st.cd * 2)) fireRing(12, i => i % 2 // recharge doublée : 12 projectiles d'un coup
          ? { speed: st.speed, dmg: st.dmg * 0.5, stun: st.stun, pierce: 1, r: 10, life: 1.6, sprite: 'nogo', noRotate: true }
          : { speed: st.speed, dmg: st.dmg * 1.5, pierce: 1, r: 10, life: 1.6, sprite: 'go', noRotate: true });
        return;
      }
      w.timer -= dt;
      if (w.timer > 0) return;
      const targets = game.enemies.filter(e => !e.dead && !e.prop && (e.x - p.x) ** 2 + (e.y - p.y) ** 2 < 500 * 500);
      if (!targets.length) return;
      w.timer = st.cd * p.cdMult;
      for (let i = 0; i < st.count; i++) {
        const t = targets[Math.random() * targets.length | 0];
        const go = Math.random() < 0.5;
        spawnProjectile({
          x: p.x, y: p.y, angle: Math.atan2(t.y - p.y, t.x - p.x), speed: st.speed,
          dmg: go ? st.dmg * 1.5 : st.dmg * 0.5, stun: go ? 0 : st.stun,
          pierce: 1, r: 10, life: 1.6, sprite: go ? 'go' : 'nogo', noRotate: true,
        });
      }
    },
  },

  plane: {
    name: 'Avions en papier', icon: '✈️', maxLevel: 6,
    desc: 'Vise le collègue le plus proche.',
    legend: 'Envoie 2 avions géants qui traversent tous les ennemis.',
    stats: l => ({
      dmg: 8 + l * 4,
      cd: +Math.max(0.45, 1.3 - l * 0.09).toFixed(2),
      count: 1 + Math.floor((l - 1) / 2),
      pierce: 1 + Math.floor(l / 4),
      speed: 450,
    }),
    update(w, dt, st) {
      if (w.legendary) {
        // 2 avions géants, plus lents mais qui traversent tout
        const p = game.player;
        w.timer -= dt;
        if (w.timer > 0) return;
        const t = nearestEnemy(p.x, p.y, 700);
        if (!t) return;
        w.timer = st.cd * 1.5 * LEGEND_PROJ_CD * p.cdMult;
        const base = Math.atan2(t.y - p.y, t.x - p.x);
        for (const off of [-0.25, 0.25])
          spawnProjectile({ x: p.x, y: p.y, angle: base + off, speed: st.speed * 0.75, dmg: st.dmg * 3, pierce: 999, r: 28, size: 3.5, life: 2.5, sprite: 'plane' });
        return;
      }
      fireAtNearest(w, dt, st, { r: 9, life: 1.6, sprite: 'plane' }, 0.15);
    },
  },

  stapler: {
    name: 'Agrafeuse', icon: '📎', maxLevel: 6,
    desc: "Mitraille des agrafes sur l'ennemi le plus proche.",
    legend: "Mitraille des rafales d'agrafes dans 8 directions.",
    stats: l => ({
      dmg: 6 + l * 3,
      cd: +Math.max(0.6, 1.4 - l * 0.08).toFixed(2),
      count: 1 + Math.floor(l / 2),
      pierce: 1 + Math.floor(l / 3),
      speed: 650,
    }),
    update(w, dt, st) {
      const p = game.player;
      w.timer -= dt;
      if (w.timer > 0) return;
      w.timer = st.cd * p.cdMult * legendCd(w);
      // Vise l'ennemi le plus proche à portée, sinon tire droit devant
      const target = nearestEnemy(p.x, p.y, st.speed * p.projSpeed);
      const base = target ? Math.atan2(target.y - p.y, target.x - p.x) : Math.atan2(p.facing.y, p.facing.x);
      const dirs = w.legendary ? 8 : 1; // légendaire : une rafale dans 8 directions
      for (let d = 0; d < dirs; d++) {
        const a = base + d * Math.PI * 2 / dirs, fx = Math.cos(a), fy = Math.sin(a);
        for (let i = 0; i < st.count; i++) {
          const off = (i - (st.count - 1) / 2) * 12;
          spawnProjectile({ x: p.x - fy * off, y: p.y + fx * off, angle: a, speed: st.speed, dmg: st.dmg, pierce: st.pierce, r: 7, life: 1, sprite: 'staple' });
        }
      }
    },
  },

  cable: {
    name: 'Câble Ethernet', icon: '🔌', maxLevel: 6,
    desc: "Fouette vers l'ennemi le plus proche et traverse les ennemis.",
    legend: 'Fouette 3 fois plus loin et presque 3 fois plus vite.',
    stats: l => ({
      dmg: 12 + l * 5,
      cd: Math.max(0.6, 1.4 - l * 0.08),
      area: +(1 + l * 0.1).toFixed(1),
      sides: l >= 2 ? 2 : 1,
    }),
    update(w, dt, st) {
      const p = game.player;
      w.timer -= dt;
      if (w.timer > 0) return;
      w.timer = st.cd * p.cdMult * (w.legendary ? 0.35 : 1);
      const reachMul = w.legendary ? 3 : 1; // légendaire : très loin, très vite
      const ww = 140 * st.area * p.area * reachMul, hh = 36 * st.area * p.area;
      // Fouette vers l'ennemi le plus proche à portée, sinon horizontalement (2e coup : à l'opposé)
      const target = nearestEnemy(p.x, p.y, ww + 30);
      const base = target ? Math.atan2(target.y - p.y, target.x - p.x) : (p.dirX < 0 ? Math.PI : 0);
      for (let s = 0; s < st.sides; s++) {
        const a = base + s * Math.PI, ca = Math.cos(a), sa = Math.sin(a);
        const cx = p.x + ca * (ww / 2 + 10), cy = p.y + sa * (ww / 2 + 10);
        queryEnemies(cx, cy, ww / 2 + 40, e => {
          if (e.dead) return;
          const dx = e.x - cx, dy = e.y - cy; // position dans le repère du coup de fouet
          if (Math.abs(dx * ca + dy * sa) < ww / 2 + e.r && Math.abs(-dx * sa + dy * ca) < hh / 2 + e.r)
            hitEnemy(e, st.dmg, ca * 150, sa * 150);
        });
        game.effects.push({ type: 'cable', x: cx, y: cy, w: ww, h: hh, angle: a, t: 0, life: 0.22 });
      }
    },
  },

  keyboard: {
    name: 'Clavier', icon: '⌨️', maxLevel: 6,
    desc: "Frappe en arc de cercle vers l'ennemi le plus proche, comme une épée.",
    legend: 'Frappe à 360° tout autour de toi.',
    stats: l => ({
      dmg: 14 + l * 5,
      cd: +Math.max(0.5, 1.2 - l * 0.07).toFixed(2),
      area: 60 + l * 6,
      arc: +(1.6 + l * 0.1).toFixed(1),
      sides: l >= 5 ? 2 : 1,
    }),
    update(w, dt, st) {
      const p = game.player;
      w.timer -= dt;
      if (w.timer > 0) return;
      w.timer = st.cd * p.cdMult;
      const reach = st.area * p.area;
      // Frappe vers l'ennemi le plus proche à portée, sinon droit devant (2e coup : à l'opposé)
      const target = nearestEnemy(p.x, p.y, reach + 30);
      const base = target ? Math.atan2(target.y - p.y, target.x - p.x) : Math.atan2(p.facing.y, p.facing.x);
      const arc = w.legendary ? Math.PI * 2 : st.arc, sides = w.legendary ? 1 : st.sides; // légendaire : 360°
      for (let s = 0; s < sides; s++) {
        const a = base + s * Math.PI;
        queryEnemies(p.x, p.y, reach + 40, e => {
          if (e.dead) return;
          const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy) || 1;
          if (d > reach + e.r) return;
          let da = Math.atan2(dy, dx) - a;
          da = Math.atan2(Math.sin(da), Math.cos(da));
          if (Math.abs(da) <= arc / 2 || d < e.r + 10) hitEnemy(e, st.dmg, dx / d * 140, dy / d * 140);
        });
        game.effects.push({ type: 'keyboard', angle: a, arc, reach, t: 0, life: w.legendary ? 0.3 : 0.2 });
      }
    },
  },

  laugh: {
    name: 'Rire de Sheryna', icon: '😂', maxLevel: 6,
    desc: 'Un éclat de rire qui balaie un cône vers l\'ennemi le plus proche.',
    legend: 'Des éclats de rire dans toutes les directions.',
    stats: l => ({
      dmg: 10 + l * 4,
      cd: +Math.max(0.6, 1.5 - l * 0.1).toFixed(2),
      area: 130 + l * 15,
      arc: +(0.7 + l * 0.08).toFixed(2),
    }),
    update(w, dt, st) {
      const p = game.player;
      w.timer -= dt;
      if (w.timer > 0) return;
      w.timer = st.cd * p.cdMult;
      const reach = st.area * p.area;
      // Vise l'ennemi le plus proche à portée, sinon rit droit devant
      const target = nearestEnemy(p.x, p.y, reach + 30);
      const a = target ? Math.atan2(target.y - p.y, target.x - p.x) : Math.atan2(p.facing.y, p.facing.x);
      queryEnemies(p.x, p.y, reach + 40, e => {
        if (e.dead) return;
        const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy) || 1;
        if (d > reach + e.r) return;
        let da = Math.atan2(dy, dx) - a;
        da = Math.atan2(Math.sin(da), Math.cos(da));
        if (w.legendary || Math.abs(da) <= st.arc / 2) hitEnemy(e, st.dmg, dx / d * 200, dy / d * 200);
      });
      if (w.legendary) { // légendaire : 6 éclats de rire tout autour
        for (let i = 0; i < 6; i++)
          game.effects.push({ type: 'laugh', x: p.x, y: p.y, angle: a + i * Math.PI / 3, arc: Math.PI / 3, reach, t: 0, life: 0.45 });
      } else game.effects.push({ type: 'laugh', x: p.x, y: p.y, angle: a, arc: st.arc, reach, t: 0, life: 0.45 });
    },
  },

  coffee: {
    name: 'Aura caféinée', icon: '☕', maxLevel: 6,
    desc: 'Aura caféinée qui blesse les collègues proches.',
    legend: "Garde l'aura et lance en plus plein de tasses de café sur les ennemis.",
    stats: l => ({
      dmg: 3 + l * 2,
      area: 55 + l * 10,
      tick: +Math.max(0.4, 0.75 - l * 0.03).toFixed(2),
    }),
    update(w, dt, st) {
      const p = game.player;
      w.radius = st.area * p.area;
      if (w.legendary && ((w.cupT = (w.cupT || 0) - dt) <= 0)) {
        // Légendaire : 3 tasses de café vers des ennemis proches
        w.cupT = 0.6 * p.cdMult * LEGEND_PROJ_CD;
        const targets = game.enemies.filter(e => !e.dead && !e.prop && (e.x - p.x) ** 2 + (e.y - p.y) ** 2 < 400 * 400);
        for (let i = 0; i < 3 && targets.length; i++) {
          const t = targets[Math.random() * targets.length | 0];
          spawnProjectile({ x: p.x, y: p.y, angle: Math.atan2(t.y - p.y, t.x - p.x), speed: 360, dmg: st.dmg * 4, pierce: 1, r: 9, life: 1.4, sprite: 'cup', noRotate: true });
        }
      }
      w.timer -= dt;
      if (w.timer > 0) return;
      w.timer = st.tick;
      queryEnemies(p.x, p.y, w.radius + 40, e => {
        if (e.dead) return;
        const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy) || 1;
        if (d < w.radius + e.r) hitEnemy(e, st.dmg, dx / d * 80, dy / d * 80);
      });
    },
  },

  diaper: {
    name: 'Couche sale', icon: '💩', maxLevel: 6,
    desc: 'Lance des couches pleines qui éclatent en flaque parfumée à la rose sous les ennemis.',
    legend: 'Lance 3 fois plus de couches, plus grosses, aux flaques plus larges.',
    stats: l => ({
      dmg: 10 + l * 4,
      cd: +Math.max(0.8, 1.8 - l * 0.12).toFixed(2),
      count: 1 + Math.floor(l / 3),
      area: 40 + l * 5,
      puddle: 4 + l * 2,
      duration: +(2 + l * 0.25).toFixed(2),
      speed: 300,
    }),
    update(w, dt, st) {
      const p = game.player;
      // Les flaques blessent tout ce qui marche dedans (ellipse au sol)
      w.zones = (w.zones || []).filter(z => (z.t -= dt) > 0);
      for (const z of w.zones) {
        if ((z.tick -= dt) > 0) continue;
        z.tick = 0.4;
        queryEnemies(z.x, z.y, z.r + 40, e => {
          if (!e.dead && ((e.x - z.x) / (z.r + e.r)) ** 2 + ((e.y - z.y) / (z.r * 0.6 + e.r)) ** 2 < 1) hitEnemy(e, z.dmg);
        });
      }
      w.timer -= dt;
      if (w.timer > 0) return;
      // Légendaire : 3 fois plus de couches, plus grosses, aux flaques plus larges
      const count = w.legendary ? st.count * 3 : st.count, big = w.legendary ? 1.6 : 1;
      let thrown = false;
      for (let i = 0; i < count; i++) {
        thrown = lobAtRandom(450, {
          speed: st.speed, dmg: st.dmg, r: 10 * big, size: big, sprite: 'diaper', // atterrit sur la cible
          onEnd: pr => { w.zones.push({ x: pr.x, y: pr.y, r: st.area * p.area * big, dmg: st.puddle, t: st.duration, tick: 0 }); Sfx.weapon('diaper'); },
        }) || thrown;
      }
      if (thrown) w.timer = st.cd * p.cdMult * legendCd(w);
    },
  },

  database: {
    name: 'Base de données', icon: '🗄️', maxLevel: 6,
    desc: "Lance une base de données qui éclate en données à l'impact.",
    legend: "Les éclats sont eux-mêmes des bases de données, qui éclatent à leur tour en données.",
    stats: l => ({
      dmg: 14 + l * 5,
      cd: +Math.max(0.7, 1.6 - l * 0.1).toFixed(2),
      count: 1 + Math.floor(l / 4),
      pierce: 1,
      shards: 3 + Math.floor(l / 2),
      speed: 340,
    }),
    update(w, dt, st) {
      // n'éclate qu'au contact d'un ennemi ; légendaire : les éclats sont des bases qui éclatent à leur tour
      const burst = (pr, depth) => {
        if (!pr.hit.size) return;
        const a0 = Math.random() * Math.PI * 2;
        const chain = w.legendary && depth < DB_MAX_DEPTH && game.projectiles.length < 700;
        for (let i = 0; i < st.shards; i++) {
          const angle = a0 + i * Math.PI * 2 / st.shards;
          if (chain) spawnProjectile({ x: pr.x, y: pr.y, angle, speed: 340, dmg: st.dmg * 0.6, pierce: 1, r: 10, life: 0.6, sprite: 'database', noRotate: true, exclude: pr.hit, onEnd: q => burst(q, depth + 1) });
          else spawnProjectile({ x: pr.x, y: pr.y, angle, speed: 380, dmg: st.dmg * 0.4, pierce: 1, r: 6, life: 0.45, sprite: 'data', noRotate: true, exclude: pr.hit });
        }
      };
      fireAtNearest(w, dt, { ...st, cd: st.cd * legendCd(w) }, { r: 10, life: 1.8, sprite: 'database', noRotate: true, onEnd: pr => burst(pr, 0) }, 0.3);
    },
  },

  ai: {
    name: "Logos d'IA", icon: '🤖', maxLevel: 6,
    desc: "Lance des logos d'IA à tête chercheuse.",
    legend: "Chaque tir envoie toutes les IA, dans toutes les directions.",
    stats: l => ({
      dmg: 9 + l * 4,
      cd: +Math.max(1.1, 2.4 - l * 0.14).toFixed(2),
      count: 1 + Math.floor(l / 2),
      pierce: 1 + Math.floor(l / 4),
      speed: 300,
    }),
    update(w, dt, st) {
      const p = game.player;
      w.timer -= dt;
      if (w.timer > 0) return;
      if (!nearestEnemy(p.x, p.y, 600)) return;
      w.timer = st.cd * p.cdMult * legendCd(w);
      if (w.legendary) { // chaque IA, 3 fois, réparties tout autour
        fireRing(AI_LOGOS.length * 3, i => ({ speed: st.speed, dmg: st.dmg, pierce: st.pierce, r: 10, life: 2.5, homing: 5, sprite: AI_LOGOS[i % AI_LOGOS.length], noRotate: true }));
        return;
      }
      for (let i = 0; i < st.count; i++) {
        spawnProjectile({
          x: p.x, y: p.y, angle: Math.random() * Math.PI * 2, speed: st.speed, dmg: st.dmg, pierce: st.pierce,
          r: 10, life: 2.5, homing: 5, sprite: AI_LOGOS[Math.random() * AI_LOGOS.length | 0], noRotate: true,
        });
      }
    },
  },

  beer: {
    name: "Heure de l'apéro", icon: '🍺', maxLevel: 6,
    desc: 'Tournée générale : des chopes partent dans toutes les directions et ralentissent les ennemis éméchés.',
    legend: 'Les chopes continuent, et des cocktails Molotov enflamment le sol sous les ennemis.',
    stats: l => ({
      dmg: 10 + l * 4,
      cd: +Math.max(0.8, 2.0 - l * 0.12).toFixed(2),
      count: 4 + Math.floor(l / 2),
      pierce: 2 + Math.floor(l / 3),
      slow: +(1 + l * 0.2).toFixed(1),
      speed: 260,
    }),
    update(w, dt, st) {
      const p = game.player;
      // Légendaire : les flammes des Molotov brûlent ce qui marche dedans
      w.fires = (w.fires || []).filter(z => (z.t -= dt) > 0);
      for (const z of w.fires) {
        if ((z.tick -= dt) > 0) continue;
        z.tick = 0.3;
        queryEnemies(z.x, z.y, z.r + 40, e => {
          if (!e.dead && ((e.x - z.x) / (z.r + e.r)) ** 2 + ((e.y - z.y) / (z.r * 0.6 + e.r)) ** 2 < 1) hitEnemy(e, z.dmg);
        });
      }
      w.timer -= dt;
      if (w.timer > 0) return;
      w.timer = st.cd * p.cdMult * legendCd(w);
      if (w.legendary)
        for (let i = 0; i < 2; i++)
          lobAtRandom(450, {
            speed: 320, dmg: st.dmg, r: 10, sprite: 'molotov',
            onEnd: pr => w.fires.push({ x: pr.x, y: pr.y, r: 55 * p.area, dmg: st.dmg * 0.6, t: 3, tick: 0 }),
          });
      const a0 = Math.random() * Math.PI * 2;
      for (let i = 0; i < st.count; i++) {
        spawnProjectile({
          x: p.x, y: p.y, angle: a0 + i * Math.PI * 2 / st.count, speed: st.speed, dmg: st.dmg, pierce: st.pierce,
          slow: st.slow, r: 10, life: 1.2, sprite: 'beer', noRotate: true,
        });
      }
    },
  },

  postit: {
    name: 'Post-it', icon: '🗒️', maxLevel: 6,
    desc: 'Des post-it tournent autour de toi.',
    legend: "Un post-it qui touche un ennemi part en shuriken vers un autre ennemi, et rebondit jusqu'à 4 fois.",
    stats: l => ({
      dmg: 8 + l * 3,
      count: 1 + Math.floor(l / 2),
      area: 75 + l * 6,
      speed: +(3 + l * 0.2).toFixed(1),
    }),
    update(w, dt, st) {
      const p = game.player;
      w.angle = (w.angle || 0) + st.speed * dt;
      w.items = [];
      w.away = w.away || [];
      const R = st.area * p.area;
      for (let i = 0; i < st.count; i++) {
        if (w.away[i] > 0) { w.away[i] -= dt; continue; } // parti en shuriken, revient après
        const a = w.angle + i * Math.PI * 2 / st.count;
        const bx = p.x + Math.cos(a) * R, by = p.y + Math.sin(a) * R;
        w.items.push({ x: bx, y: by, a });
        queryEnemies(bx, by, 60, e => {
          if (e.dead || w.away[i] > 0 || game.time - (e.hitT.postit || -9) < 0.5) return;
          if ((e.x - bx) ** 2 + (e.y - by) ** 2 < (14 + e.r) ** 2) {
            e.hitT.postit = game.time;
            hitEnemy(e, st.dmg, Math.cos(a) * 120, Math.sin(a) * 120);
            if (!w.legendary || e.prop) return;
            // Légendaire : le post-it part en shuriken vers un autre ennemi et rebondit 4 fois
            const next = nearestEnemy(bx, by, 400, new Set([e]));
            if (!next) return;
            w.away[i] = 2 * LEGEND_PROJ_CD; // le post-it revient un peu plus tard
            spawnProjectile({
              x: bx, y: by, angle: Math.atan2(next.y - by, next.x - bx), speed: 520, dmg: st.dmg * 2,
              pierce: 1, r: 10, life: 1, sprite: 'postit', noRotate: true, spin: true, bounces: 4, exclude: [e],
            });
          }
        });
      }
    },
  },
};

// Passifs = processus ITIL
const PASSIVES = {
  might:  { name: 'Gestion des incidents',          icon: '🚨', maxLevel: 5, desc: 'Résolution plus efficace : +15% de dégâts',          apply: p => p.might += 0.15 },
  haste:  { name: 'Gestion des changements',        icon: '🔄', maxLevel: 5, desc: 'CAB plus rapide : -8% de temps de recharge',         apply: p => p.cdMult *= 0.92 },
  speed:  { name: 'Gestion des niveaux de service', icon: '⏱️', maxLevel: 5, desc: 'SLA respectés : +10% de vitesse',                    apply: p => p.speed *= 1.10 },
  heart:  { name: 'Gestion de la capacité',         icon: '📈', maxLevel: 5, desc: 'Plus de ressources : +20 PV max',                    apply: p => { p.maxHp += 20; p.hp += 20; } },
  magnet: { name: 'Gestion des connaissances',      icon: '📚', maxLevel: 5, desc: 'Base de connaissances : +40% de rayon de ramassage', apply: p => p.magnet *= 1.4 },
  area:   { name: 'Gestion des problèmes',          icon: '🔍', maxLevel: 5, desc: "Traite la cause racine : +10% de zone d'effet",     apply: p => p.area += 0.1 },
  cac:    { name: 'CAC',                            icon: '🛡️', maxLevel: 5, desc: 'Comité consultatif des changements : filtre les risques, -2 dégâts subis par coup', apply: p => p.armor += 2 },
  regen:  { name: 'Continuité de service',          icon: '🛟', maxLevel: 5, desc: 'PCA en place : +0.5 PV / seconde',                   apply: p => p.regen += 0.5 },
};

const STAT_LABELS = { dmg: 'Dégâts', cd: 'Recharge', count: 'Quantité', pierce: 'Perforation', area: 'Zone', speed: 'Vitesse', tick: 'Intervalle', sides: 'Directions', arc: 'Angle', stun: 'Immobilisation (s)', puddle: 'Dégâts flaque', duration: 'Durée flaque (s)', shards: 'Éclats', slow: 'Ralentissement (s)' };

function describeUpgrade(def, lvl) {
  const a = def.stats(lvl - 1), b = def.stats(lvl);
  const fmt = v => Number.isInteger(v) ? v : v.toFixed(2);
  const parts = [];
  for (const k in b) if (a[k] !== b[k] && STAT_LABELS[k]) parts.push(`${STAT_LABELS[k]} ${fmt(a[k])} → ${fmt(b[k])}`);
  return parts.join(' · ') || 'Amélioration';
}
