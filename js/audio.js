// ==== Sons générés à la volée (Web Audio, aucun fichier à charger) ====
// Le navigateur n'autorise le son qu'après une action du joueur : on démarre au premier clic / touche.
const Sfx = (() => {
  const VOLUME = 0.25;
  let ac = null, master = null, muted = false;
  try { muted = localStorage.getItem('ds-muted') === '1'; } catch (e) { /* stockage indisponible */ }
  const last = {};

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    master = ac.createGain();
    master.gain.value = muted ? 0 : VOLUME;
    master.connect(ac.destination);
  }
  addEventListener('pointerdown', init);
  addEventListener('keydown', init);

  // Une note : fréquence, durée, forme d'onde, volume, glissando vers f2, décalage
  function tone(f, dur, type = 'square', vol = 0.5, f2 = null, delay = 0) {
    if (!ac || muted) return;
    const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  // Bruit blanc qui s'éteint (explosions)
  function noise(dur, vol = 0.5) {
    if (!ac || muted) return;
    const len = ac.sampleRate * dur | 0, buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = ac.createBufferSource(), g = ac.createGain();
    s.buffer = buf;
    g.gain.value = vol;
    s.connect(g);
    g.connect(master);
    s.start();
  }

  const notes = (list, type, step, vol) => list.forEach((f, i) => tone(f, step * 1.6, type, vol, null, i * step));
  // Évite la cacophonie : un même son au plus toutes les `ms` millisecondes
  const ready = (key, ms) => {
    const now = performance.now();
    if (now - (last[key] || 0) < ms) return false;
    last[key] = now;
    return true;
  };

  return {
    get muted() { return muted; },
    toggle() {
      muted = !muted;
      try { localStorage.setItem('ds-muted', muted ? '1' : '0'); } catch (e) { /* stockage indisponible */ }
      if (master) master.gain.value = muted ? 0 : VOLUME;
    },
    kill() { if (ready('kill', 60)) tone(500 + Math.random() * 200, 0.08, 'square', 0.12, 180); },
    gem() { if (ready('gem', 50)) tone(1200 + Math.random() * 300, 0.05, 'sine', 0.1); },
    hurt() { if (ready('hurt', 200)) tone(160, 0.2, 'sawtooth', 0.3, 60); },
    levelUp() { notes([523, 659, 784, 1047], 'square', 0.07, 0.18); },
    weaponUp() { notes([659, 880, 1175], 'triangle', 0.06, 0.3); },
    legendary() { notes([523, 659, 784, 1047, 1319, 1568], 'sawtooth', 0.08, 0.15); },
    boss() { for (let i = 0; i < 3; i++) { tone(440, 0.18, 'sawtooth', 0.2, null, i * 0.4); tone(330, 0.18, 'sawtooth', 0.2, null, i * 0.4 + 0.2); } },
    chest() { notes([784, 988, 1175, 1568], 'triangle', 0.09, 0.3); },
    heal() { notes([880, 1320], 'sine', 0.08, 0.25); },
    ticket() { notes([1047, 1568], 'square', 0.05, 0.12); },
    event() { notes([988, 784, 988], 'sine', 0.12, 0.3); },
    explosion() { if (ready('boom', 80)) { noise(0.4, 0.5); tone(120, 0.4, 'sine', 0.45, 40); } },
    special() { tone(220, 0.5, 'sawtooth', 0.25, 880); notes([523, 784, 1047], 'square', 0.08, 0.15); },
    specialReady() { notes([784, 1175], 'triangle', 0.1, 0.3); },
    whistle() { tone(2200, 0.25, 'sine', 0.3, 2400); tone(2400, 0.5, 'sine', 0.3, 2100, 0.3); },
    impact() { if (ready('impact', 70)) { noise(0.12, 0.25); tone(200, 0.12, 'sine', 0.3, 60); } },
    shout() { tone(300, 1.2, 'sawtooth', 0.3, 120); },
    win() { notes([523, 659, 784, 1047, 784, 1047], 'square', 0.12, 0.18); },
    lose() { notes([392, 330, 262, 196], 'triangle', 0.18, 0.3); },
  };
})();
