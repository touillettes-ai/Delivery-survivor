// ==== Textures procédurales (pixel art généré au chargement) ====
const SCALE = 3;

function makeCanvas(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  draw(g, w, h);
  return c;
}

// Transforme une grille de caractères en sprite ('.' = transparent)
function pixelSprite(rows, palette, scale = SCALE) {
  const h = rows.length, w = rows[0].length;
  return makeCanvas(w * scale, h * scale, g => {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const ch = rows[y][x];
        if (ch === '.') continue;
        g.fillStyle = palette[ch];
        g.fillRect(x * scale, y * scale, scale, scale);
      }
    }
  });
}

// Silhouette blanche pour le flash quand on touche un ennemi
function flashSprite(src) {
  return makeCanvas(src.width, src.height, g => {
    g.drawImage(src, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = '#fff';
    g.fillRect(0, 0, src.width, src.height);
  });
}

function flipped(src) {
  return makeCanvas(src.width, src.height, g => {
    g.translate(src.width, 0);
    g.scale(-1, 1);
    g.drawImage(src, 0, 0);
  });
}

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Moquette en dalles qui se répète sans couture (128 "pixels" de 2px, dalles de 32)
function makeFloor() {
  const N = 128, S = 2, T = 32;
  const rnd = mulberry32(1337);
  return makeCanvas(N * S, N * S, g => {
    const px = (x, y, c) => {
      g.fillStyle = c;
      g.fillRect(((x % N + N) % N) * S, ((y % N + N) % N) * S, S, S);
    };
    const bases = ['#56606e', '#5a6472', '#535d6a'];
    for (let ty = 0; ty < N / T; ty++) {
      for (let tx = 0; tx < N / T; tx++) {
        const base = bases[rnd() * 3 | 0];
        const horizontal = (tx + ty) % 2 === 0;
        for (let y = 0; y < T; y++) {
          for (let x = 0; x < T; x++) {
            let c = base;
            if ((horizontal ? y : x) % 3 === 0) c = '#4f5966';
            if (x === 0 || y === 0) c = '#3e4652';
            px(tx * T + x, ty * T + y, c);
          }
        }
      }
    }
    // Bruit de fibres
    const noise = ['#626c7a', '#4a5460', '#5e6876'];
    for (let i = 0; i < 1500; i++) px(rnd() * N | 0, rnd() * N | 0, noise[rnd() * 3 | 0]);
    // Taches de café
    for (let i = 0; i < 2; i++) {
      const cx = rnd() * N | 0, cy = rnd() * N | 0, r = 3 + rnd() * 2 | 0;
      for (let y = -r; y <= r; y++)
        for (let x = -r; x <= r; x++) {
          const d = Math.sqrt(x * x + y * y);
          if (d <= r) px(cx + x, cy + y, d > r - 1 ? '#4a4038' : '#524a44');
        }
    }
  });
}

// Parquet à lames décalées (niveau 2), se répète sans couture
function makeParquet() {
  const N = 128, S = 2, PH = 8, PL = 32; // lames de 8 "pixels" de large, 32 de long
  const rnd = mulberry32(4242);
  return makeCanvas(N * S, N * S, g => {
    const px = (x, y, c) => {
      g.fillStyle = c;
      g.fillRect(((x % N + N) % N) * S, ((y % N + N) % N) * S, S, S);
    };
    const bases = ['#b07a46', '#a8703e', '#ba844e', '#a2683a'];
    for (let row = 0; row < N / PH; row++) {
      const offset = (row * 13) % PL;
      for (let p = -1; p < N / PL; p++) {
        const base = bases[rnd() * bases.length | 0], x0 = p * PL + offset;
        for (let y = 0; y < PH; y++) {
          for (let x = 0; x < PL; x++) {
            let c = base;
            if ((x * 3 + y * 7 + row) % 11 === 0) c = '#9a6236'; // veinage
            if (y === 0) c = '#7a4a26';
            else if (x === 0) c = '#84522c';
            else if (y === 1) c = '#c8925a';
            px(x0 + x, row * PH + y, c);
          }
        }
      }
    }
    for (let i = 0; i < 600; i++) px(rnd() * N | 0, rnd() * N | 0, rnd() < 0.5 ? '#9c6438' : '#c08a52');
  });
}

// ---- Personnages jouables : skins d'après le trombinoscope de la Delivery Team ----
// [grille, palette] par personnage. Lettres communes : s peau, e yeux, m bouche, p pantalon, k chaussures
const CHAR_SKINS = {
  // Longs cheveux bruns ondulés aux reflets auburn
  coline: [[
    '...hhhhhh...',
    '..hHhhhhHh..',
    '.hHhssssHhh.',
    '.hhsessesHh.',
    '.hHssmmssHh.',
    '.hhbbbbbbhh.',
    '.hHbbbbbbHh.',
    '.sbbbbbbbbs.',
    '..bbbbbbbb..',
    '..pppppppp..',
    '..pp....pp..',
    '..pp....pp..',
    '.kkk....kkk.',
  ], { h: '#5a2a18', H: '#8a4428', s: '#f4cca8', e: '#3a2010', m: '#c04848', b: '#7a2a3a', p: '#2a2a3a', k: '#1a1a1a' }],

  // Longs cheveux roux, taches de rousseur, yeux bleu-vert
  amelie: [[
    '...hhhhhh...',
    '..hHHhhHHh..',
    '.hHhsssssHh.',
    '.hhsessesHh.',
    '.hHfsmmsfHh.',
    '.hHhbbbbhHh.',
    '.hhbbbbbbhh.',
    '.sbbbbbbbbs.',
    '..bbbbbbbb..',
    '..jjjjjjjj..',
    '...ss..ss...',
    '...ss..ss...',
    '..kkk..kkk..',
  ], { h: '#e0601c', H: '#ffa040', s: '#f8d4b8', f: '#e0a080', e: '#208a90', m: '#d04848', b: '#5ab0e0', j: '#2a2a3a', k: '#2a2a3a' }],

  // Plus petite que les autres (10x11 au lieu de 12x13), longs cheveux lisses, haut vert
  sheryna: [[
    '..hhhhhh..',
    '.hhhHhhhh.',
    '.hhsssshh.',
    '.hsessesh.',
    '.hssmmssh.',
    '.hhbbbbhh.',
    '.hbbbbbbh.',
    '.sbbbbbbs.',
    '..pppppp..',
    '..pp..pp..',
    '.kk....kk.',
  ], { h: '#2a1810', H: '#4a3020', s: '#e8b890', e: '#111', m: '#c05060', b: '#1a9a6a', p: '#2a2a3a', k: '#3a2a2a' }],

  // Cheveux noirs bouclés, barbe noire, pull violet
  youssef: [[
    '...hHhhHh...',
    '..hhHhhHhh..',
    '..hssssssh..',
    '..sesssses..',
    '..BssssssB..',
    '..BBBmmBBB..',
    '...BBBBBB...',
    '.vvvvvvvvvv.',
    '.svvvvvvvvs.',
    '..vvvvvvvv..',
    '..pppppppp..',
    '..pp....pp..',
    '.kkk....kkk.',
  ], { h: '#1a1410', H: '#3a2c22', B: '#1a1410', s: '#d8a880', e: '#111', m: '#a04040', v: '#6a3aa0', p: '#2a2a3a', k: '#1a1a1a' }],

  // Carré ondulé auburn, haut rouge
  imen: [[
    '...hHhhHh...',
    '..hhHhhhHh..',
    '.hHhsssshHh.',
    '.hhsessesHh.',
    '.HhssmmsshH.',
    '.hh.ssss.hh.',
    '..rrrrrrrr..',
    '.srrrrrrrrs.',
    '..rrrrrrrr..',
    '..pppppppp..',
    '..pp....pp..',
    '..pp....pp..',
    '.kkk....kkk.',
  ], { h: '#6a2a1a', H: '#9a4a2a', s: '#f0c8a0', e: '#111', m: '#c03040', r: '#d02a2a', p: '#2a2a3a', k: '#1a1a1a' }],

  // Cheveux blonds ondulés mi-longs, haut noir
  cecile: [[
    '...hHhhHh...',
    '..hHhhHhhH..',
    '.hhHssssHhh.',
    '.Hhsesseshh.',
    '.hHssmmssHh.',
    '.Hh.ssss.hH.',
    '..bbbbbbbb..',
    '.sbbbbbbbbs.',
    '..bbbbbbbb..',
    '..pppppppp..',
    '..pp....pp..',
    '..pp....pp..',
    '.kkk....kkk.',
  ], { h: '#c8a060', H: '#e8cc90', s: '#f4d0b0', e: '#2a6a9a', m: '#c05050', b: '#1e1e24', p: '#3a4a7a', k: '#2a2a2a' }],

  // Cheveux gris courts, lunettes, grand sourire, polo turquoise
  franck: [[
    '...wwwwww...',
    '..wWwwwwWw..',
    '..wssssssw..',
    '.wGeGssGeGw.',
    '..ssssssss..',
    '...smmmms...',
    '..cccccccc..',
    '.sccccccccs.',
    '..cccccccc..',
    '..pppppppp..',
    '..pp....pp..',
    '..pp....pp..',
    '.kkk....kkk.',
  ], { w: '#a8a8a8', W: '#d0d0d0', s: '#f0c8a0', G: '#222', e: '#3a6a9a', m: '#a04040', c: '#20a8b8', p: '#4a4a58', k: '#1a1a1a' }],

  // Longs cheveux bruns foncés, haut orangé
  danila: [[
    '...hhhhhh...',
    '..hhHhhHhh..',
    '.hhHssssHhh.',
    '.hhsessesHh.',
    '.hHssmmssHh.',
    '.hhh.ss.hhh.',
    '.hhoooooohh.',
    '.soooooooos.',
    '..oooooooo..',
    '..pppppppp..',
    '..pp....pp..',
    '..pp....pp..',
    '.kkk....kkk.',
  ], { h: '#2a1a12', H: '#4a2a1a', s: '#8a5236', e: '#111', m: '#a03838', o: '#c8622a', p: '#2a2a3a', k: '#1a1a1a' }],

  // Cheveux noirs courts, barbe de quelques jours, pull marine
  hakim: [[
    '...hhhhhh...',
    '..hhhhhhhh..',
    '..hssssssh..',
    '..sesssses..',
    '..ssssssss..',
    '..dssmmssd..',
    '...dddddd...',
    '.nnnnnnnnnn.',
    '.snnnnnnnns.',
    '..nnnnnnnn..',
    '..pppppppp..',
    '..pp....pp..',
    '.kkk....kkk.',
  ], { h: '#14100c', s: '#d8a880', e: '#111', m: '#904040', d: '#5a4030', n: '#1e2a44', p: '#2a2a34', k: '#111' }],

  // Cheveux noirs, moustache et bouc, chemise en jean
  matthieu: [[
    '...hhhhhh...',
    '..hhhhhhhh..',
    '..hssssssh..',
    '..sesssses..',
    '..ssssssss..',
    '..ssBBBBss..',
    '...ssBBss...',
    '.jjjjjjjjjj.',
    '.sjjjjjjjjs.',
    '..jjjjjjjj..',
    '..pppppppp..',
    '..pp....pp..',
    '.kkk....kkk.',
  ], { h: '#111', s: '#e0b088', e: '#111', B: '#1a1410', j: '#4a78b0', p: '#2a3a5a', k: '#1a1a1a' }],

  // Poivre et sel, lunettes, barbe grise, chemise taupe
  arno: [[
    '...gggggg...',
    '..gGggggGg..',
    '..gssssssg..',
    '.gFeFssFeFg.',
    '..ssssssss..',
    '..BssmmssB..',
    '...BBBBBB...',
    '.cccccccccc.',
    '.sccccccccs.',
    '..cccccccc..',
    '..pppppppp..',
    '..pp....pp..',
    '.kkk....kkk.',
  ], { g: '#7a7a7a', G: '#b0b0b0', s: '#f0c8a0', F: '#222', e: '#3a3a3a', m: '#904040', B: '#9a9a9a', c: '#6a6058', p: '#3a3a48', k: '#1a1a1a' }],

  // Cheveux bruns frisés et volumineux, haut moutarde
  justine: [[
    '..hHhHhhHh..',
    '.hHhhHhhHhh.',
    'hHhssssssHhh',
    'hhHsesseshHh',
    '.hHssmmssHh.',
    '.Hh.ssss.hH.',
    '..bbbbbbbb..',
    '.sbbbbbbbbs.',
    '..bbbbbbbb..',
    '..pppppppp..',
    '..pp....pp..',
    '..pp....pp..',
    '.kkk....kkk.',
  ], { h: '#3a2214', H: '#6a4026', s: '#f0c8a0', e: '#111', m: '#c05050', b: '#d09030', p: '#3a4a7a', k: '#2a2a2a' }],

  // Longs cheveux châtains lisses, haut noir
  sandie: [[
    '...hhhhhh...',
    '..hhhHHhhh..',
    '.hhhssssHhh.',
    '.hhsessesHh.',
    '.hhssmmsshh.',
    '.hhh.ss.hhh.',
    '.hhbbbbbbhh.',
    '.sbbbbbbbbs.',
    '..bbbbbbbb..',
    '..pppppppp..',
    '..pp....pp..',
    '..pp....pp..',
    '.kkk....kkk.',
  ], { h: '#5a3420', H: '#7a4a2c', s: '#f0c8a0', e: '#3a2a1a', m: '#c05060', b: '#1a1a1e', p: '#2a3a5a', k: '#1a1a1a' }],

  // Cheveux blancs en bataille, yeux bleus, polo jaune
  stephan: [[
    '..w.wwww.w..',
    '..wwWwwWww..',
    '.wwssssssww.',
    '..sesssses..',
    '..ssssssss..',
    '...ssmmss...',
    '..yyyccyyy..',
    '.syyyyyyyys.',
    '..yyyyyyyy..',
    '..pppppppp..',
    '..pp....pp..',
    '..pp....pp..',
    '.kkk....kkk.',
  ], { w: '#f4f4f4', W: '#c8c8c8', s: '#f0c8a0', e: '#3a7ac0', m: '#a04040', y: '#e0c040', c: '#f0e080', p: '#4a4a50', k: '#1a1a1a' }],

  // Crâne chauve, barbe courte, t-shirt marine
  bastien: [[
    '....ssss....',
    '...sswsss...',
    '..ssssssss..',
    '..sesssses..',
    '..ssssssss..',
    '..BssmmssB..',
    '...BBBBBB...',
    '.nnnnnnnnnn.',
    '.snnnnnnnns.',
    '..nnnnnnnn..',
    '..pppppppp..',
    '..pp....pp..',
    '.kkk....kkk.',
  ], { s: '#e8b890', w: '#fff0dc', e: '#111', m: '#904040', B: '#3a2a20', n: '#1e2a48', p: '#2a2a3a', k: '#1a1a1a' }],

  // Chignon et grande barbe rousse, veste bleue
  olivier: [[
    '.....hh.....',
    '....hhhh....',
    '..hhhhhhhh..',
    '..hssssssh..',
    '..sesssses..',
    '..BBssssBB..',
    '..BBBmmBBB..',
    '..BBBBBBBB..',
    '.jjBBBBBBjj.',
    '.sjjBBBBjjs.',
    '..jjjBBjjj..',
    '..pppppppp..',
    '..pp....pp..',
    '.kkk....kkk.',
  ], { h: '#c8642a', B: '#b85a24', s: '#f0c8a0', e: '#2a6a9a', m: '#6a2a10', j: '#3a5aa0', p: '#3a4a6a', k: '#2a1a10' }],
};

// Le collègue qui suit Sheryna partout : chauve, chemise grise, lunettes, ne sert à rien
const FOLLOWER_SKIN = [[
  '...ssssss...',
  '..sslsssss..',
  '..ssssssss..',
  '..gggssggg..',
  '..sesssess..',
  '...ssmmss...',
  '..cccccccc..',
  '.sccccccccs.',
  '..cccccccc..',
  '..pppppppp..',
  '..pp....pp..',
  '..pp....pp..',
  '.kkk....kkk.',
], { l: '#fff0dc', s: '#f0c8a0', g: '#222', e: '#2a2a2a', m: '#a05050', c: '#9aa0a8', p: '#3a3a4a', k: '#1a1a1a' }];

// Les deux orateurs sur la scène de la salle PI (micro-casque : M)
const SPEAKER_ROWS = [
  '...hhhhhh...',
  '..hhhhhhhh..',
  '..hssssssh..',
  '..sesssesM..',
  '..ssssssMs..',
  '...ssmmss...',
  '..cccccccc..',
  '.sccccccccs.',
  '..cccccccc..',
  '..pppppppp..',
  '..pp....pp..',
  '..pp....pp..',
  '.kkk....kkk.',
];
const SPEAKER_A = { h: '#2a1a10', s: '#e8b890', e: '#2a2a2a', m: '#a05050', M: '#333', c: '#1d4f91', p: '#2a2a3a', k: '#1a1a1a' };
const SPEAKER_B = { h: '#d8a040', s: '#f4d0b0', e: '#2a2a2a', m: '#b04060', M: '#333', c: '#c03a5a', p: '#2a2a3a', k: '#1a1a1a' };

// ---- Ennemis : les collègues (sourcils froncés = pas contents) ----
const INTERN_ROWS = [
  '...cccccc...',
  '..ccccccccc.',
  '..hssssssh..',
  '..sbbssbbs..',
  '..sesssses..',
  '...ssmmss...',
  '..gggggggg..',
  '.sggggggggs.',
  '..gggwwggg..',
  '..pppppppp..',
  '..pp....pp..',
  '.www....www.',
];
const INTERN_PAL = { c: '#e04040', h: '#6a4020', s: '#f0c8a0', b: '#3a2a1a', e: '#111', m: '#a04040', g: '#40a060', w: '#f4f4f4', p: '#3a4a7a' };

const COWORKER_ROWS = [
  '...hhhhhh...',
  '..hhhhhhhh..',
  '..sbbssbbs..',
  '..sesssses..',
  '..ssssssss..',
  '...ssmmss...',
  '..cccttccc..',
  'sscccttcccss',
  's.cccttccc.s',
  '..cccttccc..',
  '..pp....pp..',
  '..pp....pp..',
  '..pp....pp..',
  '.kkk....kkk.',
];
const COWORKER_PAL = { h: '#4a3a2a', s: '#f0c8a0', b: '#2a1a10', e: '#111', m: '#a04040', c: '#d8dce4', t: '#3050a0', p: '#3a3a48', k: '#1a1a1a' };

const MANAGER_ROWS = [
  '...hhhhhh...',
  '..hhhhhhhh..',
  '..hbbssbbh..',
  '..sesssses..',
  '..ssssssss..',
  '...ssmmss...',
  '..JJWttWJJ..',
  '.JJJWttWJJJ.',
  '.sJJJttJJJs.',
  '..JJJJJJJJ..',
  '..JJ....JJ..',
  '..JJ....JJ..',
  '.kkk....kkk.',
];
const MANAGER_PAL = { h: '#222', s: '#e8b890', b: '#111', e: '#111', m: '#802020', J: '#2a2a3a', W: '#fff', t: '#d02020', k: '#000' };

// Commercial pendu au téléphone
const COMMERCIAL_ROWS = [
  '...hhhhhh...',
  '..hhhhhhhh..',
  '..hbbssbbh..',
  '..sesssses..',
  '..ssssssssP.',
  '...ssmmss.s.',
  '..BBWttWBBB.',
  '.sBBWttWBB..',
  '..BBBttBBB..',
  '..BBBBBBBB..',
  '..pp....pp..',
  '..pp....pp..',
  '.kkk....kkk.',
];
const COMMERCIAL_PAL = { h: '#8a5a2a', b: '#3a2a1a', s: '#f0c8a0', e: '#111', m: '#a04040', P: '#222', B: '#4a6a9a', W: '#fff', t: '#e0a020', p: '#2a3a5a', k: '#3a2010' };

// RH avec son classeur
const RH_ROWS = [
  '....yyyy....',
  '...yyyyyy...',
  '..yyyyyyyy..',
  '..ybbssbby..',
  '..yessssey..',
  '...ssmmss...',
  '..rrrrrrrr..',
  '.srrrrrrFF..',
  '..rrrrrrFF..',
  '..kkkkkkkk..',
  '...ss..ss...',
  '...kk..kk...',
];
const RH_PAL = { y: '#e8c860', b: '#5a4020', s: '#f0c8a0', e: '#111', m: '#c04060', r: '#e07090', F: '#3060c0', k: '#2a2a3a' };

// Boss : le directeur (dessiné en plus grand)
const DIRECTOR_ROWS = [
  '...gggggg...',
  '..gggggggg..',
  '..gbbssbbg..',
  '..GeGssGeG..',
  '..ssssssss..',
  '...ssmmss...',
  '.JJJWttWJJJ.',
  'JJJJWttWJJJJ',
  'sJJJJttJJJJs',
  '.JJJJttJJJJ.',
  '.JJJJJJJJJJ.',
  '..JJJ..JJJ..',
  '..JJJ..JJJ..',
  '.kkkk..kkkk.',
];
const DIRECTOR_PAL = { g: '#a8a8a8', b: '#444', G: '#555', e: '#111', s: '#e8b890', m: '#802020', J: '#1a1a2a', W: '#fff', t: '#b01020', k: '#000' };

// ---- Objets ----
const GEM_ROWS = [
  '..bb..',
  '.bwbb.',
  'bwbbbb',
  'bbbbbd',
  '.bbbd.',
  '..bd..',
];

const PLANE_ROWS = [
  'PP........',
  '.PPPP.....',
  '..PPPPPPPP',
  '..ppppppp.',
  '.pppp.....',
  'pp........',
];

const STAPLE_ROWS = [
  'g......g',
  'gggggggg',
];

const POSTIT_ROWS = [
  'YYYYYYYY',
  'yyyyyyyy',
  'yllllyyy',
  'yyyyyyyy',
  'ylllllly',
  'yyyyyyyy',
  'ylllyyF.',
  'yyyyyF..',
];

const CHEST_ROWS = [
  '..bbbbbbbb..',
  '.bBBBBBBBBb.',
  'bBBBBBBBBBBb',
  'yyyyyyyyyyyy',
  'bBBBByyBBBBb',
  'bBBBByyBBBBb',
  'bBBBBBBBBBBb',
  'bbbbbbbbbbbb',
];

const KEYBOARD_ROWS = [
  'kkkkkkkkkkkkkkkk',
  'kwkwkwkwkwkwkwkk',
  'kkwkwkwkwkwkwkwk',
  'kwkwwwwwwwwwwkwk',
  'kkkkkkkkkkkkkkkk',
];

// Locomotive tournée vers la droite (sens du tir)
const TRAIN_ROWS = [
  'RRRR.....kk...',
  'RwwR.....kk...',
  'RwwRBBBBBBBBB.',
  'RRRRBBBBBBBBBy',
  'RRRRBBBBBBBBBy',
  'kkkkkkkkkkkkkk',
  '.KK..KK...KK..',
];

const BOLT_ROWS = [
  '....yy.',
  '...yy..',
  '..yy...',
  '.yyyyy.',
  '...yy..',
  '..yy...',
  '.yy....',
  'yy.....',
];

const CROISSANT_ROWS = [
  '....cccc....',
  '..ccCCCCcc..',
  '.cCCcCCcCCc.',
  'cCCcCCCCcCCc',
  'cCc.cCCc.cCc',
  'cc...cc...cc',
];

// Couche pleine (le tas marron dépasse)
const DIAPER_ROWS = [
  '....bb....',
  '...bBBb...',
  '..bBBBBb..',
  'wwwwwwwwww',
  'wTwwwwwwTw',
  '.wwwwwwww.',
  '..wwwwww..',
  '...wwww...',
];

// Base de données : cylindre à bandes
const DATABASE_ROWS = [
  '.dddddd.',
  'dLLLLLLd',
  'dddddddd',
  'bbbbbbbb',
  'dddddddd',
  'bbbbbbbb',
  'dddddddd',
  '.dddddd.',
];

// Chope de bière avec sa mousse
const BEER_ROWS = [
  '.wWwWw...',
  'wwwwwww..',
  'gyyyyyggg',
  'gyYyyyg.g',
  'gyYyyyg.g',
  'gyyyyyggg',
  'gyyyyyg..',
  'ggggggg..',
];

// Pastille blanche commune aux logos (comme Go / No Go)
function badge(g) {
  g.fillStyle = '#fff';
  g.beginPath(); g.arc(10, 10, 10, 0, Math.PI * 2); g.fill();
}

// ---- Sprites « finis » : contour sombre + éclairage (reflet en haut des formes, ombre en bas) ----
function shadeHex(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = v => Math.max(0, Math.min(255, Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k))));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}
function polishedSprite(rows, palette, scale = SCALE) {
  const pad = ['.'.repeat(rows[0].length + 2), ...rows.map(r => '.' + r + '.'), '.'.repeat(rows[0].length + 2)];
  const h = pad.length, w = pad[0].length, at = (x, y) => (y < 0 || y >= h || x < 0 || x >= w ? '.' : pad[y][x]);
  return makeCanvas(w * scale, h * scale, g => {
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const ch = pad[y][x];
        let c;
        if (ch === '.') {
          // Contour : case vide qui touche le personnage
          if (at(x - 1, y) === '.' && at(x + 1, y) === '.' && at(x, y - 1) === '.' && at(x, y + 1) === '.') continue;
          c = 'rgba(12,14,22,0.85)';
        } else {
          const base = palette[ch];
          if (!base.startsWith('#') || base.length !== 7) c = base;
          else if (at(x, y - 1) !== ch) c = shadeHex(base, 0.22);       // bord haut d'une zone : reflet
          else if (at(x, y + 1) !== ch) c = shadeHex(base, -0.22);      // bord bas : ombre
          else if (at(x + 1, y) !== ch) c = shadeHex(base, -0.1);       // bord droit : légère ombre
          else c = base;
        }
        g.fillStyle = c;
        g.fillRect(x * scale, y * scale, scale, scale);
      }
  });
}

// Animation de marche : on lève un pied puis l'autre (les 3 dernières lignes = jambes et pieds)
function walkRows(rows, side) {
  const n = rows.length, w = rows[0].length, mid = w / 2;
  return rows.map((row, r) => {
    if (r < n - 3) return row;
    let out = '';
    for (let c = 0; c < w; c++) {
      const lifted = side === 'left' ? c < mid : c >= mid;
      out += lifted ? (r + 1 < n ? rows[r + 1][c] : '.') : row[c];
    }
    return out;
  });
}

// 4 images de marche : pied droit levé, repos, pied gauche levé, repos
function walkFrames(rows, pal, scale) {
  const base = polishedSprite(rows, pal, scale);
  return [polishedSprite(walkRows(rows, 'right'), pal, scale), base, polishedSprite(walkRows(rows, 'left'), pal, scale), base];
}

function charSet(rows, pal) {
  const img = polishedSprite(rows, pal), walk = walkFrames(rows, pal);
  return { right: img, left: flipped(img), walkRight: walk, walkLeft: walk.map(flipped) };
}

function enemySet(frames) {
  return { frames, flash: frames.map(flashSprite) };
}

const Sprites = {
  ...Object.fromEntries(Object.entries(CHAR_SKINS).map(([id, [rows, pal]]) => [id, charSet(rows, pal)])),
  intern: enemySet(walkFrames(INTERN_ROWS, INTERN_PAL)),
  commercial: enemySet(walkFrames(COMMERCIAL_ROWS, COMMERCIAL_PAL)),
  rh: enemySet(walkFrames(RH_ROWS, RH_PAL)),
  director: enemySet(walkFrames(DIRECTOR_ROWS, DIRECTOR_PAL)),
  coworker: enemySet(walkFrames(COWORKER_ROWS, COWORKER_PAL)),
  manager: enemySet(walkFrames(MANAGER_ROWS, MANAGER_PAL)),
  follower: charSet(...FOLLOWER_SKIN),
  speakerA: charSet(SPEAKER_ROWS, SPEAKER_A),
  speakerB: charSet(SPEAKER_ROWS, SPEAKER_B),
};

// ---- Mobilier (vue 3/4) ----
function drawRects(g, rects) {
  for (const [x, y, w, h, c] of rects) { g.fillStyle = c; g.fillRect(x, y, w, h); }
}

const PROP_IMAGES = {
  // Îlot de 4 bureaux dos à dos
  island: makeCanvas(128, 96, g => {
    for (const x of [24, 88]) drawRects(g, [[x - 10, 2, 20, 14, '#2a3340'], [x - 8, 4, 16, 10, '#3a4656']]);
    drawRects(g, [
      [0, 14, 128, 60, '#d8d2c4'], [0, 14, 128, 2, '#eee8dc'],
      [63, 14, 2, 60, '#c4beb0'],
      [0, 40, 128, 6, '#6a8aa0'], [0, 40, 128, 1, '#8aaac0'],
      [44, 24, 12, 9, '#fafafa'], [46, 26, 8, 1, '#aaa'], [46, 28, 6, 1, '#aaa'],
      [100, 20, 7, 8, '#e05040'],
    ]);
    for (const x of [24, 88]) {
      drawRects(g, [
        [x - 14, 24, 28, 14, '#2a2e36'], [x - 3, 36, 6, 4, '#2a2e36'],
        [x - 15, 48, 30, 18, '#1e2228'], [x - 13, 50, 26, 14, '#4a90d0'], [x - 13, 50, 26, 4, '#7ab8f0'],
        [x - 3, 66, 6, 2, '#1e2228'], [x - 10, 68, 20, 4, '#c8ccd4'],
      ]);
    }
    drawRects(g, [
      [33, 49, 5, 5, '#fff070'], [54, 60, 6, 7, '#f4f4f4'], [55, 61, 4, 2, '#5a3a20'],
      [0, 74, 128, 6, '#a8a090'], [2, 80, 4, 10, '#4a4a50'], [122, 80, 4, 10, '#4a4a50'], [62, 80, 4, 10, '#4a4a50'],
    ]);
    for (const x of [24, 88]) drawRects(g, [[x - 11, 82, 22, 12, '#2a3340'], [x - 9, 84, 18, 8, '#3a4656']]);
  }),
  plant: makeCanvas(28, 44, g => {
    const leaf = (x, y, r, c) => { g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); };
    leaf(14, 14, 10, '#2e7a3a'); leaf(7, 20, 7, '#2e7a3a'); leaf(21, 20, 7, '#2e7a3a');
    leaf(11, 10, 5, '#3fa04a'); leaf(18, 15, 4, '#3fa04a'); leaf(6, 19, 3, '#3fa04a');
    drawRects(g, [[6, 28, 16, 4, '#c87048'], [7, 32, 14, 10, '#b0603a'], [7, 32, 14, 2, '#8a4a2a']]);
  }),
  printer: makeCanvas(48, 40, g => {
    drawRects(g, [
      [6, 4, 36, 8, '#b8bcc4'], [10, 2, 28, 3, '#fff'],
      [2, 10, 44, 26, '#d0d4da'], [2, 10, 44, 3, '#e8ecf0'],
      [8, 22, 32, 6, '#2a2e36'], [10, 24, 28, 3, '#fff'],
      [36, 14, 6, 3, '#40c060'], [2, 36, 44, 3, '#8a8e96'],
    ]);
  }),
  cooler: makeCanvas(24, 48, g => {
    drawRects(g, [
      [6, 0, 12, 4, '#7ab8e8'], [4, 4, 16, 14, '#5aa0e0'], [6, 6, 4, 10, '#a0d0f8'],
      [3, 18, 18, 28, '#eef0f2'], [3, 18, 18, 2, '#fff'],
      [7, 26, 3, 3, '#3060c0'], [14, 26, 3, 3, '#d03030'], [5, 44, 14, 4, '#8a8e96'],
    ]);
  }),
  // Patio vitré avec un arbre (niveau 2) : un bout d'extérieur au milieu des bureaux
  patio: makeCanvas(112, 136, g => {
    drawRects(g, [[2, 56, 108, 78, '#9ac8e0'], [6, 62, 100, 66, '#4a9a3a']]);
    const rnd = mulberry32(77);
    for (let i = 0; i < 60; i++) drawRects(g, [[6 + rnd() * 98 | 0, 62 + rnd() * 64 | 0, 2, 2, rnd() < 0.5 ? '#3a8a2e' : '#5aae48']]);
    for (const [x, y, c] of [[20, 112, '#f05080'], [88, 76, '#ffd040'], [26, 74, '#ffffff'], [84, 116, '#f05080']])
      drawRects(g, [[x - 2, y, 2, 2, c], [x + 2, y, 2, 2, c], [x, y - 2, 2, 2, c], [x, y + 2, 2, 2, c], [x, y, 2, 2, '#ffe080']]);
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.beginPath(); g.ellipse(56, 104, 26, 8, 0, 0, Math.PI * 2); g.fill();
    drawRects(g, [[51, 64, 10, 42, '#6a4020'], [51, 64, 3, 42, '#8a5a30']]);
    const leaf = (x, y, r, c) => { g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); };
    leaf(56, 40, 30, '#2a6a30'); leaf(34, 56, 20, '#2a6a30'); leaf(78, 56, 20, '#2a6a30');
    leaf(48, 30, 16, '#3a8a3e'); leaf(70, 42, 12, '#3a8a3e'); leaf(36, 52, 10, '#3a8a3e');
    leaf(44, 24, 6, '#5aae4a'); leaf(66, 34, 5, '#5aae4a');
    // Vitres : cadre + reflets
    drawRects(g, [[2, 56, 108, 4, '#cfe8f4'], [2, 56, 3, 78, '#cfe8f4'], [107, 56, 3, 78, '#cfe8f4'], [2, 128, 108, 6, '#7aaac4'], [2, 127, 108, 2, '#e8f6ff']]);
    g.fillStyle = 'rgba(255,255,255,0.25)';
    for (const x of [16, 70]) { g.beginPath(); g.moveTo(x, 126); g.lineTo(x + 10, 126); g.lineTo(x + 24, 64); g.lineTo(x + 14, 64); g.fill(); }
  }),
  sofa: makeCanvas(72, 40, g => {
    drawRects(g, [
      [4, 2, 64, 18, '#2e5a88'], [4, 2, 64, 3, '#4a7ab0'],
      [0, 16, 72, 16, '#3a6a9a'], [0, 16, 72, 2, '#5a8ac0'],
      [0, 8, 8, 24, '#24507c'], [64, 8, 8, 24, '#24507c'],
      [35, 18, 2, 14, '#2e5a88'], [2, 32, 4, 6, '#2a2a2a'], [66, 32, 4, 6, '#2a2a2a'],
      [12, 8, 12, 9, '#f0c030'],
    ]);
  }),
};

// Zone de collision au sol : w/h en pixels, top = position du haut de la zone dans le sprite
// Les plantes et les imprimantes sont cassables : elles ont aussi un flash quand on les frappe
Sprites.plant = enemySet([PROP_IMAGES.plant]);
Sprites.printer = enemySet([PROP_IMAGES.printer]);

const PROPS = {
  island:  { img: PROP_IMAGES.island,  w: 128, h: 72, top: 16 },
  plant:   { img: PROP_IMAGES.plant,   w: 16,  h: 10, top: 31 },
  printer: { img: PROP_IMAGES.printer, w: 44,  h: 20, top: 16 },
  cooler:  { img: PROP_IMAGES.cooler,  w: 20,  h: 12, top: 34 },
  patio:   { img: PROP_IMAGES.patio,   w: 108, h: 76, top: 58 },
  sofa:    { img: PROP_IMAGES.sofa,    w: 72,  h: 20, top: 14 },
};

const Textures = {
  floor: makeFloor(),
  parquet: makeParquet(),
  // Ticket à ramasser (bonus d'XP) : en-tête bleu, lignes de texte, pastille de priorité
  ticket: pixelSprite([
    'wwwwwwwwww',
    'wBBBBBBBBw',
    'wwwwwwwwww',
    'wggggggwww',
    'wwwwwwwwww',
    'wggggwwwww',
    'wwwwwwwrrw',
    'wwwwwwwrrw',
    'wwwwwwwwww',
  ], { w: '#f4f6fa', B: '#2f6fd0', g: '#9aa0a8', r: '#e04040' }, 2),
  // Badge d'accès du niveau 2 : cordon, pince, carte avec photo
  badge: pixelSprite([
    '..rr....rr..',
    '...rr..rr...',
    '....rrrr....',
    '.....kk.....',
    '.wwwwwwwwww.',
    '.wbbbbwgggw.',
    '.wbssbwwwww.',
    '.wbssbwgggw.',
    '.wbbbbwwwww.',
    '.wwwwwwgggw.',
    '.wGGGGGGGGw.',
    '.wwwwwwwwww.',
  ], { r: '#d03030', k: '#888', w: '#f4f6fa', b: '#1423dc', s: '#f0c8a0', g: '#9aa0a8', G: '#96cd32' }, 3),
  gems: {
    blue: pixelSprite(GEM_ROWS, { b: '#3a8aff', w: '#cfe6ff', d: '#1a4aa0' }, 2),
    green: pixelSprite(GEM_ROWS, { b: '#3ad06a', w: '#d0ffd8', d: '#1a7a3a' }, 2),
    red: pixelSprite(GEM_ROWS, { b: '#ff4a5a', w: '#ffd0d0', d: '#a01a2a' }, 2),
  },
  plane: pixelSprite(PLANE_ROWS, { P: '#ffffff', p: '#b8c0d0' }, 2),
  staple: pixelSprite(STAPLE_ROWS, { g: '#c8ccd4' }, 2),
  postit: pixelSprite(POSTIT_ROWS, { Y: '#e8c820', y: '#fff070', l: '#a09040', F: '#d8c040' }, 3),
  croissant: pixelSprite(CROISSANT_ROWS, { c: '#b06a20', C: '#e8a850' }, 3),
  chest: pixelSprite(CHEST_ROWS, { b: '#5a3010', B: '#9a5a20', y: '#f0c030' }, 3),
  bolt: pixelSprite(BOLT_ROWS, { y: '#ffe040' }, 3),
  train: pixelSprite(TRAIN_ROWS, { R: '#d03030', w: '#a0d0ff', k: '#2a2a2a', B: '#2a6ad0', y: '#ffe040', K: '#555' }, 2),
  // Pastilles Go (coche verte) / No Go (sens interdit)
  go: makeCanvas(20, 20, g => {
    g.fillStyle = '#fff';
    g.beginPath(); g.arc(10, 10, 10, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#30b050';
    g.beginPath(); g.arc(10, 10, 8.5, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 3; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(5.5, 10.5); g.lineTo(8.5, 13.5); g.lineTo(14.5, 6.5); g.stroke();
  }),
  nogo: makeCanvas(20, 20, g => {
    g.fillStyle = '#fff';
    g.beginPath(); g.arc(10, 10, 10, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#d02020';
    g.beginPath(); g.arc(10, 10, 8.5, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff';
    g.fillRect(4.5, 8.5, 11, 3);
  }),
  keyboard: pixelSprite(KEYBOARD_ROWS, { k: '#2a2e36', w: '#d8dce4' }, 2),
  diaper: pixelSprite(DIAPER_ROWS, { b: '#5a3010', B: '#8a5020', w: '#f4f4f4', T: '#8ac0e8' }, 2),
  database: pixelSprite(DATABASE_ROWS, { d: '#3a6ab0', L: '#9ac4f0', b: '#2a4a80' }, 2),
  data: pixelSprite(['cc', 'cc'], { c: '#7fe0ff' }, 3),
  beer: pixelSprite(BEER_ROWS, { w: '#fafafa', W: '#e0e0e0', y: '#f0b020', Y: '#ffd860', g: '#c8dce8' }, 2),
  // Logos d'IA stylisés
  aiClaude: makeCanvas(20, 20, g => {
    badge(g);
    g.strokeStyle = '#d97757'; g.lineWidth = 2.2; g.lineCap = 'round';
    for (let i = 0; i < 10; i++) {
      const a = i * Math.PI / 5, r = i % 2 ? 5 : 7.5;
      g.beginPath(); g.moveTo(10, 10); g.lineTo(10 + Math.cos(a) * r, 10 + Math.sin(a) * r); g.stroke();
    }
  }),
  aiGpt: makeCanvas(20, 20, g => {
    badge(g);
    g.strokeStyle = '#111'; g.lineWidth = 1.6;
    for (let i = 0; i < 6; i++) {
      g.save(); g.translate(10, 10); g.rotate(i * Math.PI / 3);
      g.beginPath(); g.ellipse(0, -3.2, 2.6, 4.2, 0, 0, Math.PI * 2); g.stroke();
      g.restore();
    }
  }),
  aiGemini: makeCanvas(20, 20, g => {
    badge(g);
    const grad = g.createLinearGradient(3, 3, 17, 17);
    grad.addColorStop(0, '#4a8af0'); grad.addColorStop(1, '#a060e0');
    g.fillStyle = grad;
    g.beginPath(); g.moveTo(10, 2);
    g.quadraticCurveTo(10, 10, 18, 10); g.quadraticCurveTo(10, 10, 10, 18);
    g.quadraticCurveTo(10, 10, 2, 10); g.quadraticCurveTo(10, 10, 10, 2);
    g.fill();
  }),
  aiMistral: makeCanvas(20, 20, g => {
    badge(g);
    const cols = ['#ffd700', '#ffaf00', '#ff8205', '#fa500f', '#e10500'];
    ['X...X', 'XX.XX', 'X.X.X', 'X...X', 'X...X'].forEach((row, y) => {
      g.fillStyle = cols[y];
      for (let x = 0; x < 5; x++) if (row[x] === 'X') g.fillRect(4 + x * 2.4, 4 + y * 2.4, 2.4, 2.4);
    });
  }),
  // Légendaires : tasse de café fumante et cocktail Molotov (bouteille + chiffon enflammé)
  cup: pixelSprite([
    '..s.s...',
    '...s.s..',
    'wwwwww..',
    'wccccwww',
    'wccccw.w',
    'wwwwwwww',
    'wwwwww..',
    '.wwww...',
  ], { s: '#e8e8e8', w: '#fafafa', c: '#5a3010' }, 2),
  molotov: pixelSprite([
    '..fy..',
    '.fyf..',
    '..rr..',
    '..gg..',
    '.gGGg.',
    'gGGGgg',
    'gGGGgg',
    'gggggg',
  ], { f: '#ff7020', y: '#ffe040', r: '#d8d0c0', g: '#2a7a3a', G: '#5ab06a' }, 2),
};
const AI_LOGOS = ['aiClaude', 'aiGpt', 'aiGemini', 'aiMistral'];

// ---- Super pouvoirs ----
// Sprite tiré d'un emoji (alarmes, dollars, rochers, graphiques…)
function emojiSprite(ch, size) {
  const S = size + 8;
  return makeCanvas(S, S, g => {
    g.font = `${size}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(ch, S / 2, S / 2 + 1);
  });
}

// Ligne de code verte sur fond de terminal (prompt magique de Hakim)
function codeSprite(text) {
  return makeCanvas(text.length * 9 + 8, 18, (g, w, h) => {
    g.fillStyle = 'rgba(10,20,10,0.85)';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#5aff7a';
    g.font = 'bold 13px monospace';
    g.textBaseline = 'middle';
    g.fillText(text, 4, h / 2 + 1);
  });
}

Object.assign(Textures, {
  alarm: emojiSprite('🚨', 26),
  dollar: emojiSprite('💵', 26),
  request: emojiSprite('📋', 26),
  rock: emojiSprite('🪨', 34),
  chart1: emojiSprite('📊', 24),
  chart2: emojiSprite('📈', 24),
  code1: codeSprite('rm -rf collegues/'),
  code2: codeSprite('{ IA: true }'),
  code3: codeSprite('>_ kill --all'),
});

// Renforts de la visite en ACR : collier (cordon) rouge ou bleu avec un badge blanc
const ALLY_ROWS = [
  '...hhhhhh...',
  '..hhhhhhhh..',
  '..hssssssh..',
  '..sesssess..',
  '..ssssssss..',
  '...ssmmss...',
  '..cLccccLc..',
  '.sccLccLccs.',
  '..cccBBccc..',
  '..pppppppp..',
  '..pp....pp..',
  '..pp....pp..',
  '.kkk....kkk.',
];
const allyPal = (hair, shirt, collar) => ({ h: hair, s: '#e8b890', e: '#2a2a2a', m: '#a05050', c: shirt, L: collar, B: '#fafafa', p: '#2a2a3a', k: '#1a1a1a' });
Sprites.allies = [
  charSet(ALLY_ROWS, allyPal('#2a1a10', '#d8dce4', '#d03030')),
  charSet(ALLY_ROWS, allyPal('#d8a040', '#3a6ab0', '#d03030')),
  charSet(ALLY_ROWS, allyPal('#6a4020', '#3fa04a', '#d03030')),
  charSet(ALLY_ROWS, allyPal('#1a1a1a', '#e0a020', '#d03030')),
  charSet(ALLY_ROWS, allyPal('#888888', '#2a2a3a', '#2f6fd0')), // le collier bleu
];

// ---- Niveau 3 « MEP du vendredi » : salle serveur ----
// Faux plancher technique : dalles grises, certaines perforées (ventilation)
function makeDatacenterFloor() {
  const N = 128, S = 2, T = 32;
  const rnd = mulberry32(2024);
  return makeCanvas(N * S, N * S, g => {
    const px = (x, y, c) => { g.fillStyle = c; g.fillRect(x * S, y * S, S, S); };
    for (let ty = 0; ty < N / T; ty++)
      for (let tx = 0; tx < N / T; tx++) {
        const vented = rnd() < 0.3;
        for (let y = 0; y < T; y++)
          for (let x = 0; x < T; x++) {
            let c = (x + y) % 7 === 0 ? '#5c6672' : '#626c78';
            if (vented && x > 3 && x < T - 4 && y > 3 && y < T - 4 && x % 3 === 0 && y % 3 === 0) c = '#2a3038';
            if (x === 0 || y === 0) c = '#3a424c';
            if (x === 1 || y === 1) c = '#76808c';
            px(tx * T + x, ty * T + y, c);
          }
      }
  });
}

// Baie de serveurs (LED dessinées en direct dans le jeu) et climatiseur de salle
Object.assign(PROP_IMAGES, {
  rack: makeCanvas(44, 76, g => {
    drawRects(g, [[2, 2, 40, 72, '#16191e'], [2, 2, 40, 3, '#3a404a'], [4, 6, 36, 64, '#22262e']]);
    for (let i = 0; i < 9; i++) drawRects(g, [[6, 8 + i * 7, 32, 5, '#2e333c'], [6, 8 + i * 7, 32, 1, '#3e444e'], [30, 10 + i * 7, 2, 2, i % 3 ? '#40e070' : '#40a0ff']]);
    drawRects(g, [[2, 70, 40, 4, '#0c0e12']]);
  }),
  crac: makeCanvas(56, 50, g => {
    drawRects(g, [[2, 4, 52, 44, '#d8dce2'], [2, 4, 52, 3, '#f0f2f4'], [6, 12, 20, 20, '#9aa0aa'], [30, 12, 20, 20, '#9aa0aa'], [2, 44, 52, 4, '#8a8e96']]);
    for (const cx of [16, 40]) { g.strokeStyle = '#5a606a'; g.lineWidth = 2; g.beginPath(); g.arc(cx, 22, 7, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.moveTo(cx - 7, 22); g.lineTo(cx + 7, 22); g.moveTo(cx, 15); g.lineTo(cx, 29); g.stroke(); }
    drawRects(g, [[8, 36, 10, 4, '#40c060']]);
  }),
});
Object.assign(PROPS, {
  rack: { img: PROP_IMAGES.rack, w: 40, h: 22, top: 50 },
  crac: { img: PROP_IMAGES.crac, w: 52, h: 18, top: 28 },
});
Textures.datacenter = makeDatacenterFloor();

// ---- Nouveaux ennemis et directeurs ----
// Consultant : costume beige, cravate verte, reste à distance et lance des PowerPoint
Sprites.consultant = enemySet(walkFrames(MANAGER_ROWS, { h: '#d8b060', s: '#f0c8a0', b: '#5a4020', e: '#111', m: '#a04040', J: '#a89878', W: '#fff', t: '#2a9a50', k: '#3a2a1a' }));
// Directeurs : même silhouette, costume et cravate selon le poste
const dirPal = (hair, suit, tie) => ({ ...DIRECTOR_PAL, g: hair, J: suit, t: tie });
Object.assign(Sprites, {
  dir_dsi: enemySet(walkFrames(DIRECTOR_ROWS, dirPal('#2a2a2a', '#1a2a5a', '#30c0e0'))),
  dir_drh: enemySet(walkFrames(DIRECTOR_ROWS, dirPal('#6a4020', '#5a1a2a', '#f070a0'))),
  dir_daf: enemySet(walkFrames(DIRECTOR_ROWS, dirPal('#a8a8a8', '#3a3a3a', '#e0b020'))),
  dir_pdg: enemySet(walkFrames(DIRECTOR_ROWS, dirPal('#f0f0f0', '#0a0a0a', '#ffd040'))),
});
// Diapo PowerPoint lancée par les consultants
Textures.ppt = makeCanvas(18, 14, g => {
  drawRects(g, [[0, 0, 18, 14, '#c8501e'], [1, 4, 16, 9, '#fafafa'], [3, 6, 8, 1, '#888'], [3, 8, 11, 1, '#888'], [3, 10, 6, 1, '#888'], [12, 6, 4, 4, '#e0a020']]);
});

// ---- Variété de décors ----
const circle = (g, x, y, r, c) => { g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); };
Object.assign(PROP_IMAGES, {
  // Niveau 1 : open space
  meeting: makeCanvas(132, 96, g => { // table de réunion et ses chaises
    for (const x of [22, 52, 82, 112]) drawRects(g, [[x - 9, 2, 18, 12, '#2a3340'], [x - 7, 4, 14, 8, '#3a4656']]);
    drawRects(g, [[4, 14, 124, 54, '#8a5a34'], [4, 14, 124, 3, '#a87448'], [4, 64, 124, 6, '#5a3a20'], [40, 30, 22, 14, '#fafafa'], [42, 32, 18, 2, '#aaa'], [42, 36, 12, 2, '#aaa'], [86, 34, 8, 8, '#f4f4f4'], [87, 35, 6, 3, '#5a3a20']]);
    for (const x of [22, 52, 82, 112]) drawRects(g, [[x - 9, 74, 18, 14, '#2a3340'], [x - 7, 76, 14, 10, '#3a4656']]);
  }),
  coffee: makeCanvas(64, 64, g => { // coin café : comptoir + machine
    drawRects(g, [[2, 26, 60, 36, '#c8ccd4'], [2, 26, 60, 4, '#e8ecf0'], [2, 58, 60, 4, '#8a8e96'], [8, 4, 22, 26, '#2a2e36'], [10, 8, 18, 8, '#4a90d0'], [15, 18, 8, 6, '#111'], [16, 24, 6, 4, '#f4f4f4'], [38, 14, 8, 12, '#fafafa'], [40, 16, 4, 3, '#5a3010'], [50, 18, 8, 8, '#f0c030']]);
  }),
  whiteboard: makeCanvas(68, 64, g => { // tableau Kanban couvert de post-it
    drawRects(g, [[2, 2, 64, 40, '#8a8e96'], [4, 4, 60, 36, '#fafafa'], [24, 4, 1, 36, '#c8ccd4'], [44, 4, 1, 36, '#c8ccd4'], [10, 46, 3, 16, '#5a5e66'], [55, 46, 3, 16, '#5a5e66'], [6, 58, 56, 4, '#5a5e66']]);
    const cols = ['#fff070', '#ff9ac0', '#9ad8ff', '#a8f0a0'];
    for (let i = 0; i < 9; i++) drawRects(g, [[7 + (i % 3) * 20 + (i * 3) % 5, 8 + Math.floor(i / 3) * 10, 9, 7, cols[i % 4]]]);
  }),
  cabinet: makeCanvas(32, 56, g => { // armoire à dossiers
    drawRects(g, [[2, 2, 28, 52, '#7a8494'], [2, 2, 28, 3, '#9aa4b4']]);
    for (let i = 0; i < 4; i++) drawRects(g, [[4, 8 + i * 12, 24, 10, '#8a94a4'], [12, 12 + i * 12, 8, 2, '#3a404a']]);
  }),
  bookshelf: makeCanvas(56, 64, g => { // étagère de classeurs
    drawRects(g, [[2, 2, 52, 60, '#6a4a2a'], [2, 2, 52, 3, '#8a6440']]);
    const cols = ['#c03a3a', '#3a6ab0', '#e0a020', '#3fa04a', '#7a4ab0', '#f4f4f4'];
    for (let r = 0; r < 4; r++) {
      drawRects(g, [[4, 18 + r * 14, 48, 2, '#4a3018']]);
      for (let i = 0; i < 7; i++) drawRects(g, [[6 + i * 6.6, 7 + r * 14, 5, 11, cols[(i + r * 2) % cols.length]]]);
    }
  }),
  // Niveau 2 : espaces détente
  pingpong: makeCanvas(104, 64, g => {
    drawRects(g, [[2, 6, 100, 44, '#1d6a4a'], [2, 6, 100, 2, '#2a8a60'], [51, 6, 2, 44, '#fafafa'], [2, 27, 100, 1, '#e8f0e8'], [48, 2, 8, 52, '#d8dce4'], [8, 50, 4, 12, '#2a2a2a'], [92, 50, 4, 12, '#2a2a2a']]);
    circle(g, 30, 18, 3, '#ff8a30');
  }),
  babyfoot: makeCanvas(84, 56, g => {
    drawRects(g, [[6, 6, 72, 40, '#6a4020'], [10, 10, 64, 32, '#2a8a40'], [41, 10, 2, 32, '#fafafa'], [8, 46, 4, 8, '#3a2a1a'], [72, 46, 4, 8, '#3a2a1a']]);
    for (const x of [18, 30, 54, 66]) {
      drawRects(g, [[x, 2, 2, 48, '#c8ccd4']]);
      for (let k = 0; k < 3; k++) circle(g, x + 1, 16 + k * 9, 3, x < 42 ? '#e04040' : '#3060c0');
    }
  }),
  beanbags: makeCanvas(76, 44, g => {
    circle(g, 20, 26, 16, '#e05a8a'); circle(g, 18, 22, 10, '#f07aa8');
    circle(g, 54, 24, 17, '#3aa0d0'); circle(g, 52, 20, 10, '#5ac0f0');
  }),
  // Niveau 3 : salle serveur
  ups: makeCanvas(40, 60, g => { // onduleur
    drawRects(g, [[2, 2, 36, 56, '#d8dce2'], [2, 2, 36, 3, '#f0f2f4'], [6, 8, 28, 10, '#1a1e26'], [8, 10, 18, 6, '#40e070'], [6, 22, 28, 2, '#e0b020'], [6, 26, 28, 2, '#e0b020'], [6, 50, 28, 6, '#8a8e96']]);
  }),
  tapelib: makeCanvas(60, 72, g => { // bibliothèque de bandes
    drawRects(g, [[2, 2, 56, 68, '#22262e'], [2, 2, 56, 3, '#3a404a'], [6, 8, 48, 30, '#88a8c8'], [8, 10, 44, 26, '#2a3a4c']]);
    for (let i = 0; i < 4; i++) for (let k = 0; k < 6; k++) drawRects(g, [[10 + k * 7, 12 + i * 6, 5, 4, k % 2 ? '#3a6ab0' : '#c8ccd4']]);
    drawRects(g, [[6, 44, 48, 20, '#2e333c'], [10, 48, 6, 2, '#40e070'], [10, 52, 6, 2, '#ffb030']]);
  }),
  cart: makeCanvas(44, 40, g => { // chariot avec un serveur démonté
    drawRects(g, [[4, 6, 36, 20, '#3a404a'], [6, 8, 32, 6, '#5a606a'], [8, 16, 28, 4, '#2a2e36'], [4, 26, 36, 4, '#8a8e96'], [6, 30, 2, 6, '#555'], [36, 30, 2, 6, '#555']]);
    circle(g, 8, 36, 3, '#111'); circle(g, 36, 36, 3, '#111');
  }),
  extinguisher: makeCanvas(18, 36, g => {
    drawRects(g, [[5, 8, 8, 26, '#d02020'], [5, 8, 8, 2, '#f04040'], [6, 4, 6, 4, '#2a2a2a'], [11, 2, 5, 3, '#2a2a2a'], [6, 18, 6, 5, '#fafafa']]);
  }),
});
Object.assign(PROPS, {
  meeting:      { img: PROP_IMAGES.meeting,      w: 124, h: 60, top: 12 },
  coffee:       { img: PROP_IMAGES.coffee,       w: 60,  h: 24, top: 36 },
  whiteboard:   { img: PROP_IMAGES.whiteboard,   w: 60,  h: 8,  top: 54 },
  cabinet:      { img: PROP_IMAGES.cabinet,      w: 28,  h: 14, top: 40 },
  bookshelf:    { img: PROP_IMAGES.bookshelf,    w: 52,  h: 14, top: 48 },
  pingpong:     { img: PROP_IMAGES.pingpong,     w: 100, h: 34, top: 14 },
  babyfoot:     { img: PROP_IMAGES.babyfoot,     w: 72,  h: 30, top: 14 },
  beanbags:     { img: PROP_IMAGES.beanbags,     w: 68,  h: 20, top: 16 },
  ups:          { img: PROP_IMAGES.ups,          w: 36,  h: 16, top: 42 },
  tapelib:      { img: PROP_IMAGES.tapelib,      w: 56,  h: 18, top: 52 },
  cart:         { img: PROP_IMAGES.cart,         w: 36,  h: 12, top: 24 },
  extinguisher: { img: PROP_IMAGES.extinguisher, w: 10,  h: 8,  top: 26 },
});

// Décalcomanies au sol (sans collision) pour casser la répétition du sol
const DECALS = {
  stain: makeCanvas(40, 24, g => { g.fillStyle = 'rgba(70,45,25,0.35)'; g.beginPath(); g.ellipse(20, 12, 16, 9, 0.3, 0, Math.PI * 2); g.fill(); circle(g, 34, 6, 3, 'rgba(70,45,25,0.3)'); }),
  papers: makeCanvas(48, 32, g => {
    g.save(); g.translate(18, 14); g.rotate(-0.3); drawRects(g, [[-10, -7, 20, 14, '#f4f4f4'], [-7, -4, 12, 1, '#999'], [-7, -1, 10, 1, '#999']]); g.restore();
    g.save(); g.translate(32, 20); g.rotate(0.4); drawRects(g, [[-9, -6, 18, 12, '#ececec'], [-6, -3, 10, 1, '#999']]); g.restore();
  }),
  rugGray: makeCanvas(140, 90, g => { drawRects(g, [[0, 0, 140, 90, 'rgba(40,46,56,0.55)'], [6, 6, 128, 78, 'rgba(70,80,96,0.5)'], [12, 12, 116, 66, 'rgba(40,46,56,0.4)']]); }),
  cable: makeCanvas(120, 30, g => { g.strokeStyle = 'rgba(20,20,24,0.8)'; g.lineWidth = 3; g.beginPath(); g.moveTo(2, 20); g.bezierCurveTo(40, 2, 70, 30, 118, 10); g.stroke(); }),
  rugRed: makeCanvas(150, 96, g => { drawRects(g, [[0, 0, 150, 96, 'rgba(150,40,50,0.6)'], [6, 6, 138, 84, 'rgba(200,160,80,0.45)'], [12, 12, 126, 72, 'rgba(150,40,50,0.5)']]); circle(g, 75, 48, 18, 'rgba(200,160,80,0.45)'); }),
  rugBlue: makeCanvas(120, 120, g => { circle(g, 60, 60, 58, 'rgba(50,90,150,0.55)'); circle(g, 60, 60, 44, 'rgba(240,240,240,0.25)'); circle(g, 60, 60, 30, 'rgba(50,90,150,0.5)'); }),
  leaves: makeCanvas(60, 40, g => {
    for (const [x, y, c] of [[10, 10, '#3a8a3e'], [24, 22, '#5aae4a'], [40, 12, '#c89030'], [50, 30, '#3a8a3e'], [16, 32, '#c89030']]) { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, 4, 2, x, 0, Math.PI * 2); g.fill(); }
  }),
  hazard: makeCanvas(96, 16, g => {
    for (let i = -2; i < 14; i++) { g.fillStyle = i % 2 ? '#e0b020' : '#1a1a1a'; g.beginPath(); g.moveTo(i * 8, 16); g.lineTo(i * 8 + 8, 16); g.lineTo(i * 8 + 16, 0); g.lineTo(i * 8 + 8, 0); g.fill(); }
  }),
  cableRun: makeCanvas(160, 24, g => {
    for (const [c, o] of [['#2f6fd0', 0], ['#e0b020', 5], ['#d03030', 10]]) { g.strokeStyle = c; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 6 + o); g.bezierCurveTo(50, o, 100, 14 + o / 2, 160, 6 + o); g.stroke(); }
  }),
};

// ---- Niveau 4 « Les gourmands du Delivery » : monde féerique ----
// Sol : herbe pastel avec des petites fleurs et des paillettes
function makeFairyFloor() {
  const N = 128, S = 2;
  const rnd = mulberry32(777);
  return makeCanvas(N * S, N * S, g => {
    const px = (x, y, c) => { g.fillStyle = c; g.fillRect(((x % N + N) % N) * S, ((y % N + N) % N) * S, S, S); };
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) px(x, y, (x * 7 + y * 13) % 5 ? '#86c27e' : '#7cb874');
    for (let i = 0; i < 900; i++) px(rnd() * N | 0, rnd() * N | 0, rnd() < 0.5 ? '#6ea866' : '#98d090');
    const petals = ['#ffb0d8', '#fff0a0', '#c8b0ff', '#ffffff'];
    for (let i = 0; i < 40; i++) {
      const x = rnd() * N | 0, y = rnd() * N | 0, c = petals[rnd() * petals.length | 0];
      px(x - 1, y, c); px(x + 1, y, c); px(x, y - 1, c); px(x, y + 1, c); px(x, y, '#ffd040');
    }
    for (let i = 0; i < 25; i++) px(rnd() * N | 0, rnd() * N | 0, '#ffffff');
  });
}
Textures.fairy = makeFairyFloor();

Object.assign(PROP_IMAGES, {
  // Arbre à bonbons : tronc en sucre d'orge, feuillage de barbe à papa, bonbons accrochés
  candytree: makeCanvas(84, 112, g => {
    for (let y = 60; y < 108; y += 6) drawRects(g, [[37, y, 10, 3, '#ffffff'], [37, y + 3, 10, 3, '#e03050']]);
    circle(g, 42, 40, 30, '#ff9ad0'); circle(g, 24, 50, 18, '#ffb8e0'); circle(g, 60, 50, 18, '#ffb8e0'); circle(g, 42, 28, 18, '#ffc8e8');
    for (const [x, y, c] of [[28, 36, '#ff4060'], [52, 30, '#40c0ff'], [44, 52, '#ffd040'], [62, 46, '#8040ff'], [22, 52, '#40e080']]) {
      circle(g, x, y, 5, c); drawRects(g, [[x - 1, y - 1, 2, 2, '#ffffff']]);
    }
  }),
  // Buisson garni de canettes de soda
  canbush: makeCanvas(80, 56, g => {
    circle(g, 22, 34, 18, '#3a9a4a'); circle(g, 56, 34, 18, '#3a9a4a'); circle(g, 40, 26, 20, '#4aae58'); circle(g, 30, 22, 8, '#6ac878');
    const cans = [[18, 30, '#e02030'], [40, 18, '#2f6fd0'], [58, 32, '#30b050'], [32, 38, '#f0a020']];
    for (const [x, y, c] of cans) drawRects(g, [[x - 4, y - 6, 8, 12, c], [x - 4, y - 6, 8, 2, '#c8ccd4'], [x - 2, y - 2, 4, 3, '#ffffff']]);
    drawRects(g, [[6, 48, 68, 4, 'rgba(0,0,0,0.15)']]);
  }),
  // Fleur rigolote avec un visage
  funflower: makeCanvas(40, 64, g => {
    drawRects(g, [[19, 26, 3, 36, '#3a9a4a']]);
    circle(g, 12, 44, 6, '#4aae58'); circle(g, 28, 50, 6, '#4aae58');
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; circle(g, 20 + Math.cos(a) * 11, 18 + Math.sin(a) * 11, 7, i % 2 ? '#ff7ac0' : '#ffa0d8'); }
    circle(g, 20, 18, 9, '#ffd040');
    drawRects(g, [[16, 15, 2, 3, '#2a1a10'], [22, 15, 2, 3, '#2a1a10']]);
    g.strokeStyle = '#2a1a10'; g.lineWidth = 1.5; g.beginPath(); g.arc(20, 19, 4, 0.2, Math.PI - 0.2); g.stroke();
    circle(g, 14, 21, 2, '#ff8a8a'); circle(g, 26, 21, 2, '#ff8a8a');
  }),
  // Licorne avec crinière arc-en-ciel et corne dorée
  unicorn: makeCanvas(72, 64, g => {
    drawRects(g, [[16, 26, 36, 20, '#fafafa'], [16, 26, 36, 3, '#ffffff'], [18, 46, 6, 14, '#f0f0f0'], [28, 46, 6, 14, '#f0f0f0'], [38, 46, 6, 14, '#f0f0f0'], [46, 46, 6, 14, '#f0f0f0']]);
    for (const x of [18, 28, 38, 46]) drawRects(g, [[x, 58, 6, 3, '#c8a0e0']]);
    drawRects(g, [[44, 10, 16, 22, '#fafafa'], [52, 16, 14, 10, '#fafafa'], [62, 20, 4, 4, '#ffc0d0'], [52, 14, 3, 3, '#2a2a3a']]);
    g.fillStyle = '#ffd040'; g.beginPath(); g.moveTo(52, 10); g.lineTo(58, -2); g.lineTo(56, 11); g.fill();
    const rainbow = ['#ff4060', '#ffa030', '#ffe040', '#40d070', '#40a0ff', '#a060ff'];
    rainbow.forEach((c, i) => { drawRects(g, [[40 - i * 2, 8 + i * 4, 6, 6, c], [10 - i, 24 + i * 3, 8, 3, c]]); });
  }),
});
Object.assign(PROPS, {
  candytree: { img: PROP_IMAGES.candytree, w: 22, h: 12, top: 96 },
  canbush:   { img: PROP_IMAGES.canbush,   w: 64, h: 18, top: 32 },
  funflower: { img: PROP_IMAGES.funflower, w: 12, h: 8,  top: 54 },
  unicorn:   { img: PROP_IMAGES.unicorn,   w: 40, h: 14, top: 46 },
});

Object.assign(DECALS, {
  sparkles: makeCanvas(60, 40, g => { for (const [x, y] of [[8, 10], [30, 6], [50, 20], [20, 30], [44, 34]]) { g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillRect(x - 3, y, 7, 1); g.fillRect(x, y - 3, 1, 7); } }),
  wrappers: makeCanvas(56, 32, g => {
    for (const [x, y, c, r] of [[14, 12, '#ff4080', 0.4], [38, 20, '#40b0ff', -0.3]]) {
      g.save(); g.translate(x, y); g.rotate(r);
      drawRects(g, [[-6, -3, 12, 6, c], [-10, -4, 4, 8, c], [6, -4, 4, 8, c], [-4, -2, 8, 1, '#ffffff']]); g.restore();
    }
  }),
  rainbow: makeCanvas(120, 50, g => {
    ['#ff4060', '#ffa030', '#ffe040', '#40d070', '#40a0ff', '#a060ff'].forEach((c, i) => {
      g.strokeStyle = c; g.globalAlpha = 0.55; g.lineWidth = 4; g.beginPath(); g.arc(60, 50, 50 - i * 5, Math.PI, Math.PI * 2); g.stroke();
    });
    g.globalAlpha = 1;
  }),
});

// Chocolat à ramasser (carré de chocolat dans son papier doré)
Textures.chocolate = pixelSprite([
  '..gggggg..',
  '.gbBBbBBg.',
  'gbBBbBBbBg',
  'gbbbbbbbbg',
  'gbBBbBBbBg',
  'gbBBbBBbBg',
  '.gbbbbbbg.',
  '..gggggg..',
], { g: '#e8b830', b: '#4a2810', B: '#7a4a24' }, 3);

// ---- Niveau 4 : créatures féeriques (mêmes comportements que les collègues, autre apparence) ----
const FAIRY_ROWS = [
  '....hhhh....',
  '...hhhhhh...',
  'ww.hseseh.ww',
  'www.ssmss.ww',
  'wwwwddddwwww',
  '.wwddddddww.',
  '..dddddddd..',
  '..dddddddd..',
  '...dddddd...',
  '....s..s....',
  '....s..s....',
  '...kk..kk...',
];
const SLIME_ROWS = [
  '....gggg....',
  '..gggggggg..',
  '.gGGgggggggg',
  '.gWWgggWWgg.',
  'ggWbgggWbggg',
  'gggggggggggg',
  'gggggmmggggg',
  'gggggggggggg',
  '.gggggggggg.',
  '..dddddddd..',
];
const MUSHROOM_ROWS = [
  '...rrrrrr...',
  '.rrWrrrrWrr.',
  'rrrrrrrrrrrr',
  'rWrrrrrrrrWr',
  'rrrrrrrrrrrr',
  '..cccccccc..',
  '..cecccecc..',
  '..cccmmccc..',
  '..cccccccc..',
  '...cccccc...',
  '...cc..cc...',
  '..kkk..kkk..',
];
// Monstres (boss)
const DRAGON_ROWS = [
  '.........rr...',
  '........rrrr..',
  '..w.....rerrr.',
  '.ww....rrrrrrr',
  'www...rrrrrryy',
  'wwwrrrrrrrr...',
  '.wrrrrrrrrr...',
  '..rrrRRRRrr...',
  '..rrRRRRRRr...',
  '.rrrrRRRRrr...',
  'rr.rrrrrrrr...',
  'r..rr....rr...',
  '...rr....rr...',
  '..kkk...kkk...',
];
const WITCH_ROWS = [
  '.....kk.....',
  '....kkkk....',
  '...kkkkkk...',
  '.kkkkkkkkkk.',
  '...hssssh...',
  '..hsesseshh.',
  '...ssnnss...',
  '...ssmmss...',
  '..pppppppp..',
  'pppppppppppp',
  '.pppppppppp.',
  '..pppppppp..',
  '..pppppppp..',
  '...pp..pp...',
  '..kkk..kkk..',
];
const WOLF_ROWS = [
  '.gg......gg.',
  '.ggg....ggg.',
  '.gggggggggg.',
  '.ggeggggegg.',
  '..gggggggg..',
  '..ggwnnwgg..',
  '...gwwwwg...',
  '.gggggggggg.',
  'gggGGGGGGggg',
  'gg.GGGGGG.gg',
  'g..GGGGGG..g',
  '...gg..gg...',
  '...gg..gg...',
  '..ggg..ggg..',
];
const TROLL_ROWS = [
  '..y.y..y.y..',
  '..yyyyyyyy..',
  '..yryyyyry..',
  '.gggggggggg.',
  '.ggeggggegg.',
  'gggggnnggggg',
  '.gggwmmwggg.',
  '.bbbbbbbbbb.',
  'bbbbbbbbbbbb',
  'gbbbbbbbbbbg',
  'g.bbbbbbbb.g',
  '..bbb..bbb..',
  '..ggg..ggg..',
  '.kkkk..kkkk.',
];
Object.assign(Sprites, {
  fairy: enemySet(walkFrames(FAIRY_ROWS, { h: '#ffe070', s: '#f8d8c0', e: '#2a2a5a', m: '#e06080', w: '#bfe6ff', d: '#5a9aff', k: '#ffffff' })),
  pixie: enemySet(walkFrames(FAIRY_ROWS, { h: '#c8a0ff', s: '#f8d8c0', e: '#2a2a5a', m: '#e06080', w: '#ffd0f0', d: '#ff7ac0', k: '#ffffff' })),
  slime: enemySet(walkFrames(SLIME_ROWS, { g: '#ff8ad0', G: '#ffd0ee', W: '#ffffff', b: '#2a1a3a', m: '#a03070', d: '#d060a8' })),
  goblin: enemySet(walkFrames(COMMERCIAL_ROWS, { ...COMMERCIAL_PAL, h: '#d03030', b: '#2a5a1a', s: '#7ac850', P: '#5a3a1a', B: '#7a5a2a', t: '#e0a020', p: '#4a3a1a' })),
  wizard: enemySet(walkFrames(MANAGER_ROWS, { ...MANAGER_PAL, h: '#d8d8e8', s: '#f0c8a0', J: '#5a3a9a', W: '#ffd040', t: '#ffd040', k: '#2a1a4a' })),
  mushroom: enemySet(walkFrames(MUSHROOM_ROWS, { r: '#e03040', W: '#ffffff', c: '#f8ecd8', e: '#2a1a10', m: '#c06060', k: '#a07850' })),
  dragon: enemySet(walkFrames(DRAGON_ROWS, { r: '#c02828', R: '#f0a040', w: '#8a2020', e: '#ffe040', y: '#ffb020', k: '#3a1010' })),
  witch: enemySet(walkFrames(WITCH_ROWS, { k: '#1a1a2a', h: '#e06020', s: '#8ad070', e: '#ffe040', n: '#6aa050', m: '#3a1a2a', p: '#4a2a6a' })),
  werewolf: enemySet(walkFrames(WOLF_ROWS, { g: '#6a6a7a', G: '#a0a0b0', e: '#ffd020', w: '#ffffff', n: '#1a1a1a' })),
  trollking: enemySet(walkFrames(TROLL_ROWS, { y: '#ffd040', r: '#e03040', g: '#6a9a5a', e: '#ff4020', n: '#4a6a3a', w: '#ffffff', m: '#3a1a1a', b: '#6a4a2a', k: '#3a2a1a' })),
});

// Projectiles féeriques : orbe magique (magicien) et boule de feu (dragon)
const glowBall = (inner, outer) => makeCanvas(18, 18, g => {
  const gr = g.createRadialGradient(9, 9, 1, 9, 9, 9);
  gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.35, inner); gr.addColorStop(1, outer);
  g.fillStyle = gr; g.beginPath(); g.arc(9, 9, 8, 0, Math.PI * 2); g.fill();
});
Textures.orb = glowBall('#d080ff', 'rgba(120,40,200,0)');
Textures.fireball = glowBall('#ffb020', 'rgba(220,40,0,0)');

// ---- Easter eggs : costumes secrets (clic molette sur son personnage en jeu) ----
const COSTUMES = {
  // Sheryna en tenue de running : bandeau, brassière, short et baskets fluo
  sheryna: [[
    '..hhhhhh..',
    '.rrrrrrrr.',
    '.hhsssshh.',
    '.hsessesh.',
    '.hssmmssh.',
    '.hhtttthh.',
    '.stttttts.',
    '..oooooo..',
    '..ss..ss..',
    '..ss..ss..',
    '.nn....nn.',
  ], { h: '#2a1810', s: '#e8b890', e: '#111', m: '#c05060', r: '#ff3a8a', t: '#30d0c0', o: '#2a2a3a', n: '#e8ff40' }],
  // Bastien en maillot et short du PSG
  bastien: [[
    '....ssss....',
    '...sswsss...',
    '..ssssssss..',
    '..sesssses..',
    '..ssssssss..',
    '..BssmmssB..',
    '...BBBBBB...',
    '.nnnwrrwnnn.',
    '.snnwrrwnns.',
    '..nnwrrwnn..',
    '..nnnnnnnn..',
    '..ss....ss..',
    '.kkk....kkk.',
  ], { s: '#e8b890', w: '#ffffff', e: '#111', m: '#904040', B: '#3a2a20', n: '#0a1a48', r: '#d01a2a', k: '#1a1a1a' }],
  // Matthieu déguisé en lapin mascotte
  matthieu: [[
    '..ww....ww..',
    '..wp....pw..',
    '..wp....pw..',
    '..wwwwwwww..',
    '.wwwwwwwwww.',
    '.wwewwwweww.',
    '.wwwwnnwwww.',
    '.wwwwmmwwww.',
    '..wwwwwwww..',
    '.wwwwppwwww.',
    'wwwwppppwwww',
    '.wwwwppwwww.',
    '..wwwwwwww..',
    '..ww....ww..',
    '.www....www.',
  ], { w: '#f4f4f4', p: '#ffb0c8', e: '#111', n: '#ff7090', m: '#c05060' }],
  // Franck en Père Noël : bonnet à pompon, barbe blanche, costume rouge, ceinture dorée
  franck: [[
    '....rrrr....',
    '...rrrrrrww.',
    '..wwwwwwww..',
    '..ssssssss..',
    '.WGeGssGeGW.',
    '..WWWmmWWW..',
    '..WWWWWWWW..',
    '.rrrWWWWrrr.',
    'srrrrrrrrrrs',
    '.rrrrrrrrrr.',
    '.kkkkyykkkk.',
    '..rr....rr..',
    '.kkk....kkk.',
  ], { r: '#d02020', w: '#ffffff', W: '#f4f4f4', s: '#f0c8a0', G: '#222', e: '#3a6a9a', m: '#a04040', k: '#1a1a1a', y: '#ffd040' }],
  // Coline, la cheffe : couronne, tailleur noir à boutons dorés, chemise blanche
  coline: [[
    '...y.yy.y...',
    '...yryyry...',
    '...hhhhhh...',
    '..hHhhhhHh..',
    '.hHhssssHhh.',
    '.hhsessesHh.',
    '.hHssmmssHh.',
    '.hhJwwwwJhh.',
    '.hHJJwwJJHh.',
    '.sJJJyJJJJs.',
    '..JJJyJJJJ..',
    '..pppppppp..',
    '..pp....pp..',
    '.kkk....kkk.',
  ], { y: '#ffd040', r: '#e03040', h: '#5a2a18', H: '#8a4428', s: '#f4cca8', e: '#3a2010', m: '#c04848', J: '#1a1a2a', w: '#ffffff', p: '#2a2a3a', k: '#111111' }],
  // Amélie, future maman : robe de grossesse bleu ciel, ventre bien rond
  amelie: [[
    '....hhhhhh....',
    '...hHHhhHHh...',
    '..hHhsssssHh..',
    '..hhsessesHh..',
    '..hHfsmmsfHh..',
    '..hHhbbbbhHh..',
    '..hhbbbbbbhh..',
    '..sbbbbbbbbs..',
    '..bbbBBBBbbb..',
    '.bbbBBBBBBbbb.',
    '.bbbbBBBBbbbb.',
    '..bbbbbbbbbb..',
    '....ss..ss....',
    '....ss..ss....',
    '...kkk..kkk...',
  ], { h: '#e0601c', H: '#ffa040', s: '#f8d4b8', f: '#e0a080', e: '#208a90', m: '#d04848', b: '#7ac0f0', B: '#a8dcff', k: '#2a2a3a' }],
  // Imen, future maman : robe de grossesse rouge, ventre bien rond
  imen: [[
    '....hHhhHh....',
    '...hhHhhhHh...',
    '..hHhsssshHh..',
    '..hhsessesHh..',
    '..HhssmmsshH..',
    '..hh.ssss.hh..',
    '...rrrrrrrr...',
    '..srrrrrrrrs..',
    '..rrrRRRRrrr..',
    '.rrrRRRRRRrrr.',
    '.rrrrRRRRrrrr.',
    '..rrrrrrrrrr..',
    '....ss..ss....',
    '....ss..ss....',
    '...kkk..kkk...',
  ], { h: '#6a2a1a', H: '#9a4a2a', s: '#f0c8a0', e: '#111', m: '#c03040', r: '#d02a2a', R: '#f06060', k: '#1a1a1a' }],
};

// Trousse de soin lâchée par les ennemis (+30 PV)
Textures.medkit = pixelSprite([
  '...hhhh...',
  '...h..h...',
  'wwwwwwwwww',
  'wwwwrrwwww',
  'wwwwrrwwww',
  'wwrrrrrrww',
  'wwrrrrrrww',
  'wwwwrrwwww',
  'wwwwrrwwww',
  'gggggggggg',
], { h: '#8a8e96', w: '#f4f4f4', r: '#e02a2a', g: '#b8bcc4' }, 3);

// ---- Costumes supplémentaires (2e, 3e tenue…) : [grille, palette] dans l'ordre du choix ----
const MORE_COSTUMES = {
  // Justine : maman en balade (tenue d'une autre couleur + poussette avec bébé), puis soleil souriant
  justine: [[[
    '..hHhHhhHh...........',
    '.hHhhHhhHhh..........',
    'hHhssssssHhh.........',
    'hhHsesseshHh.........',
    '.hHssmmssHh..........',
    '.Hh.ssss.hH....ooooo.',
    '..bbbbbbbb....ooooooo',
    '.sbbbbbbbbs.ccooBBBoo',
    '..bbbbbbbb....ooFFFoo',
    '..pppppppp....qqqqqqq',
    '..pp....pp....ddddddd',
    '..pp....pp....w.....w',
    '.kkk....kkk..www...ww',
  ], { h: '#3a2214', H: '#6a4026', s: '#f0c8a0', e: '#111', m: '#c05050', b: '#3aa0a0', p: '#3a4a7a', k: '#2a2a2a', o: '#5a6ab0', c: '#8a8e96', B: '#ffb0c8', F: '#f8d8c0', q: '#ffffff', d: '#2a2a3a', w: '#1a1a1a' }],
  [[
    '.y...yy...y.',
    '..y.oooo.y..',
    '...oOOOOo...',
    '..oOOOOOOo..',
    'yyoOeOOeOoyy',
    '..oOOOOOOo..',
    '..oOmOOmOo..',
    '..oOOmmOOo..',
    '...oOOOOo...',
    '..y.oooo.y..',
    '.y...yy...y.',
    '............',
  ], { y: '#ffc020', o: '#ff9a20', O: '#ffe040', e: '#3a2a10', m: '#c04020' }]],

  // Amélie : 3e tenue « lanceuse d'alerte » (même tenue, autre couleur, gyrophare sur la tête)
  amelie: [[[
    '.....rr.....',
    '....rRRr....',
    '....gggg....',
    '...hhhhhh...',
    '..hHHhhHHh..',
    '.hHhsssssHh.',
    '.hhsessesHh.',
    '.hHfsmmsfHh.',
    '.hHhbbbbhHh.',
    '.hhbbbbbbhh.',
    '.sbbbbbbbbs.',
    '..bbbbbbbb..',
    '..jjjjjjjj..',
    '...ss..ss...',
    '...ss..ss...',
    '..kkk..kkk..',
  ], { r: '#ff2020', R: '#ffa0a0', g: '#5a5a5a', h: '#e0601c', H: '#ffa040', s: '#f8d4b8', f: '#e0a080', e: '#208a90', m: '#d04848', b: '#f0a020', j: '#2a2a3a', k: '#2a2a3a' }]],
  // Stéphane à la retraite : sa tenue habituelle… avec une canne
  stephan: [[[
    '..w.wwww.w...',
    '..wwWwwWww...',
    '.wwssssssww..',
    '..sesssses...',
    '..ssssssss...',
    '...ssmmss..CC',
    '..yyyccyyy..C',
    '.syyyyyyyys.C',
    '..yyyyyyyy..C',
    '..pppppppp..C',
    '..pp....pp..C',
    '..pp....pp..C',
    '.kkk....kkk.C',
  ], { w: '#f4f4f4', W: '#c8c8c8', s: '#f0c8a0', e: '#3a7ac0', m: '#a04040', y: '#e0c040', c: '#f0e080', p: '#4a4a50', k: '#1a1a1a', C: '#7a4a24' }],
  // Disco boy, façon ABBA : combinaison à paillettes, grand col, pattes d'éléphant, plateformes
  [[
    '..w.wwww.w..',
    '..wwWwwWww..',
    '.wwssssssww.',
    '..sesssses..',
    '..ssssssss..',
    '...ssmmss...',
    '.cccddddccc.',
    'sdDddDddDdds',
    '.ddDddddDdd.',
    '..dddDDddd..',
    '..dddddddd..',
    '.ddd....ddd.',
    '.kkk....kkk.',
  ], { w: '#f4f4f4', W: '#c8c8c8', s: '#f0c8a0', e: '#3a7ac0', m: '#a04040', c: '#d040a0', d: '#e8e8f8', D: '#ffd040', k: '#c8a020' }]],

  // Danila, agent secret : costume noir, chemise blanche, cravate et lunettes noires
  danila: [[[
    '...hhhhhh...',
    '..hhHhhHhh..',
    '.hhHssssHhh.',
    '.hhGGssGGHh.',
    '.hHssmmssHh.',
    '.hhh.ss.hhh.',
    '.hhJwttwJhh.',
    '.sJJwttwJJs.',
    '..JJJttJJJ..',
    '..JJJJJJJJ..',
    '..JJ....JJ..',
    '..JJ....JJ..',
    '.kkk....kkk.',
  ], { h: '#2a1a12', H: '#4a2a1a', s: '#8a5236', G: '#0a0a0a', m: '#a03838', J: '#111118', w: '#ffffff', t: '#111111', k: '#1a1a1a' }]],

  // Sandie en bain de soleil : chapeau de paille, lunettes, maillot, paréo, tongs
  sandie: [[[
    '..yyyyyyyy..',
    '.yyyyyyyyyy.',
    '.hhhssssHhh.',
    '.hhGGssGGHh.',
    '.hhssmmsshh.',
    '.hhh.ss.hhh.',
    '.hhsrrrrshh.',
    '.ssrrrrrrss.',
    '..ssrrrrss..',
    '..PPPPPPPP..',
    '..ss....ss..',
    '..ss....ss..',
    '.ggg....ggg.',
  ], { y: '#f0d080', h: '#5a3420', H: '#7a4a2c', s: '#f0c8a0', G: '#111111', m: '#c05060', r: '#30b0d0', P: '#ff7a50', g: '#ffd040' }]],

  // Hakim version IA : androïde à visière lumineuse et circuits
  hakim: [[[
    '...mmmmmm...',
    '..mMmmmmMm..',
    '..mccccccm..',
    '..mcCccCcm..',
    '..mmmmmmmm..',
    '...mbbbbm...',
    '..aaaaaaaa..',
    '.maalaalaam.',
    '..aalaalaa..',
    '..aaaaaaaa..',
    '..mm....mm..',
    '..mm....mm..',
    '.kkk....kkk.',
  ], { m: '#a0a8b8', M: '#e0e8f0', c: '#20d0ff', C: '#ffffff', b: '#3a404a', a: '#2a3a5a', l: '#40f0ff', k: '#5a606a' }]],

  // Cécile : « La classe à Dallas » (robe de soirée) puis « Tempête Cécile » (nuage d'orage)
  cecile: [[[
    '...hHhhHh...',
    '..hHhhHhhH..',
    '.hhHssssHhh.',
    '.Hhsesseshh.',
    '.hHssmmssHh.',
    '.Hh.syys.hH.',
    '..sggggggs..',
    '..gGggggGg..',
    '..gggGgggg..',
    '.gggggggggg.',
    '.ggGggggGgg.',
    'gggggggggggg',
    'gGggggggGggg',
    '.kk......kk.',
  ], { h: '#c8a060', H: '#e8cc90', s: '#f4d0b0', e: '#2a6a9a', m: '#c05050', y: '#ffd040', g: '#a01830', G: '#ff6080', k: '#ffd040' }],
  [[
    '....cccc....',
    '..ccCCcccc..',
    '.cCCccccccc.',
    'cccccccccccc',
    'cccecccceccc',
    'cccccmmccccc',
    '.cccccccccc.',
    '..dddddddd..',
    '...r..r..r..',
    '..r..r..r...',
    '....r..r..r.',
  ], { c: '#8a909c', C: '#c8ccd4', e: '#1a1a2a', m: '#3a3a4a', d: '#5a606c', r: '#7ab8ff' }]],

  // Coline, cheffe de cuisine : toque, veste blanche à boutons, pantalon pied-de-poule
  coline: [[[
    '...wwwwww...',
    '..wwwwwwww..',
    '..wWWWWWWw..',
    '...hhhhhh...',
    '..hHssssHh..',
    '.hhsessesHh.',
    '.hHssmmssHh.',
    '.hhwwwwwwhh.',
    '.swwbwwbwws.',
    '..wwbwwbww..',
    '..qQqQqQqQ..',
    '..qQ....Qq..',
    '.kkk....kkk.',
  ], { w: '#ffffff', W: '#d8dce4', h: '#5a2a18', H: '#8a4428', s: '#f4cca8', e: '#3a2010', m: '#c04848', b: '#2a2a3a', q: '#3a3a4a', Q: '#e8e8e8', k: '#1a1a1a' }]],

  // Franck, traqueur d'ours : chapeau d'explorateur, chemise kaki, appareil photo autour du cou
  franck: [[[
    '..tttttttt..',
    '.tTTTTTTTTt.',
    '..wssssssw..',
    '.wGeGssGeGw.',
    '..ssssssss..',
    '...smmmms...',
    '..KLKKKKLK..',
    '.sKKLCCLKKs.',
    '..KKKCcKKK..',
    '..PPPPPPPP..',
    '..ss....ss..',
    '..ss....ss..',
    '.BBB....BBB.',
  ], { t: '#a08850', T: '#5a4020', w: '#a8a8a8', s: '#f0c8a0', G: '#222', e: '#3a6a9a', m: '#a04040', K: '#b8a070', L: '#3a2a1a', C: '#2a2a2a', c: '#5a8ab0', P: '#8a7a50', B: '#4a3018' }]],

  // Youssef « BG » : costard, chemise blanche, lunettes aviateur
  youssef: [[[
    '...hHhhHh...',
    '..hhHhhHhh..',
    '..hssssssh..',
    '..AAAssAAA..',
    '..BssssssB..',
    '..BBBmmBBB..',
    '...BBBBBB...',
    '.JJJwwwwJJJ.',
    '.sJJJwwJJJs.',
    '..JJJwwJJJ..',
    '..JJJJJJJJ..',
    '..JJ....JJ..',
    '.kkk....kkk.',
  ], { h: '#1a1410', H: '#3a2c22', B: '#1a1410', s: '#d8a880', A: '#2a2a1a', m: '#a04040', J: '#1a1a24', w: '#ffffff', k: '#1a1a1a' }]],

  // Arno : moine shaolin, puis alpiniste chevronné
  arno: [[[
    '...gggggg...',
    '..gGggggGg..',
    '..gssssssg..',
    '.gFeFssFeFg.',
    '..ssssssss..',
    '..BssmmssB..',
    '...BBBBBB...',
    '.oooyoooooo.',
    '.sooOyooOos.',
    '..oooOyooo..',
    '..oooooooo..',
    '..OOOOOOOO..',
    '..ss....ss..',
    '.kkk....kkk.',
  ], { g: '#7a7a7a', G: '#b0b0b0', s: '#f0c8a0', F: '#222', e: '#3a3a3a', m: '#904040', B: '#9a9a9a', o: '#f08020', O: '#c05010', y: '#ffd040', k: '#5a3a1a' }],
  [[
    '...rrrrrr...',
    '..rRrrrrRr..',
    '..gssssssg..',
    '.gFeFssFeFg.',
    '..ssssssss..',
    '..BssmmssB..',
    '...BBBBBB...',
    '.jjjjyjjjjj.',
    '.sjjjjyjjjs.',
    '..jjjjjyjj..',
    '..jjjjjjjj..',
    '..pppppppp..',
    '..pp....pp..',
    '.KKK....KKK.',
  ], { r: '#3060c0', R: '#ffffff', g: '#7a7a7a', s: '#f0c8a0', F: '#222', e: '#3a3a3a', m: '#904040', B: '#9a9a9a', j: '#e02020', y: '#ffd040', p: '#2a2a3a', K: '#5a3a1a' }]],

  // Olivier : Gremlins (façon Gizmo), puis chasseur de fantômes
  olivier: [[[
    'bb........bb',
    'bBb......bBb',
    'bBBbwwwwbBBb',
    '.bbwwwwwwbb.',
    '..wEEwwEEw..',
    '..wEewwEew..',
    '..wwwnnwww..',
    '...bwmmwb...',
    '..bbbbbbbb..',
    '.wbbwwwwbbw.',
    '..bbwwwwbb..',
    '..bbbbbbbb..',
    '..bb....bb..',
    '.www....www.',
  ], { b: '#8a5a2a', B: '#f0b8a0', w: '#f4ece0', E: '#1a1a1a', e: '#ffffff', n: '#3a2a20', m: '#a04040' }],
  [[
    '.....hh.....',
    '....hhhh....',
    '..hhhhhhhh..',
    '..hssssssh..',
    '..sesssses..',
    '..BBssssBB..',
    '..BBBmmBBB..',
    '..BBBBBBBB..',
    '.uKuuuuuuKu.',
    '.suKuLLuKus.',
    '..uuuuuuuu..',
    '..uu....uu..',
    '..uu....uu..',
    '.kkk....kkk.',
  ], { h: '#c8642a', B: '#b85a24', s: '#f0c8a0', e: '#2a6a9a', m: '#6a2a10', u: '#c8b890', K: '#3a3a3a', L: '#e02020', k: '#1a1a1a' }]],

  // Bastien : « Oups, j'ai oublié mon costume » (flouté là où il faut)
  bastien: [[[
    '....ssss....',
    '...sswsss...',
    '..ssssssss..',
    '..sesssses..',
    '..ssssssss..',
    '..BssmmssB..',
    '...BBBBBB...',
    '.ssssssssss.',
    '.ssssssssss.',
    '..ssssssss..',
    '..ssXYXYss..',
    '..ssYXYXss..',
    '..ss....ss..',
    '..ss....ss..',
    '.sss....sss.',
  ], { s: '#e8b890', w: '#fff0dc', e: '#111', m: '#904040', B: '#3a2a20', X: '#b09080', Y: '#d8c0a8' }]],
};

// Liste des costumes de chaque personnage : 1er costume (COSTUMES) puis les suivants (MORE_COSTUMES)
const COSTUME_LIST = {};
for (const id of new Set([...Object.keys(COSTUMES), ...Object.keys(MORE_COSTUMES)]))
  COSTUME_LIST[id] = [...(COSTUMES[id] ? [COSTUMES[id]] : []), ...(MORE_COSTUMES[id] || [])];
for (const [id, list] of Object.entries(COSTUME_LIST))
  list.forEach(([rows, pal], i) => { Sprites[`costume_${id}_${i + 1}`] = charSet(rows, pal); });

// Souris filaire (arme de Bastien)
Textures.mouse = pixelSprite([
  '..wwww..',
  '.wwgwww.',
  'wwwgwwww',
  'wwwgwwww',
  'wwwwwwww',
  'wwwwwwww',
  '.wwwwww.',
  '..wwww..',
], { w: '#e8ecf0', g: '#5a606a' }, 2);
