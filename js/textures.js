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

function charSet(rows, pal) {
  const img = pixelSprite(rows, pal);
  return { right: img, left: flipped(img) };
}

function enemySet(frames) {
  return { frames, flash: frames.map(flashSprite) };
}

const Sprites = {
  ...Object.fromEntries(Object.entries(CHAR_SKINS).map(([id, [rows, pal]]) => [id, charSet(rows, pal)])),
  intern: enemySet([pixelSprite(INTERN_ROWS, INTERN_PAL)]),
  commercial: enemySet([pixelSprite(COMMERCIAL_ROWS, COMMERCIAL_PAL)]),
  rh: enemySet([pixelSprite(RH_ROWS, RH_PAL)]),
  director: enemySet([pixelSprite(DIRECTOR_ROWS, DIRECTOR_PAL)]),
  coworker: enemySet([pixelSprite(COWORKER_ROWS, COWORKER_PAL)]),
  manager: enemySet([pixelSprite(MANAGER_ROWS, MANAGER_PAL)]),
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
// Les plantes sont cassables : elles ont aussi un flash quand on les frappe
Sprites.plant = enemySet([PROP_IMAGES.plant]);

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
};
const AI_LOGOS = ['aiClaude', 'aiGpt', 'aiGemini', 'aiMistral'];
