// ==== Sons générés à la volée (Web Audio, aucun fichier à charger) ====
// Le navigateur n'autorise le son qu'après une action du joueur : on démarre au premier clic / touche.
const Sfx = (() => {
  const VOLUME = 0.25;
  let ac = null, master = null, muted = false;
  try { muted = localStorage.getItem('ds-muted') === '1'; } catch (e) { /* stockage indisponible */ }
  const last = {};

  // Le contexte audio peut être créé avant toute action (il reste en pause), ce qui permet
  // de décoder les voix enregistrées dès le chargement ; on le relance au premier clic / touche
  function getCtx() {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ac = new AC();
      master = ac.createGain();
      master.gain.value = muted ? 0 : VOLUME;
      master.connect(ac.destination);
    }
    return ac;
  }
  function init() {
    if (getCtx() && ac.state === 'suspended') ac.resume();
  }
  addEventListener('pointerdown', init);
  addEventListener('keydown', init);

  // Une note : fréquence, durée, forme d'onde, volume, glissando vers f2, décalage
  function tone(f, dur, type = 'square', vol = 0.5, f2 = null, delay = 0) {
    if (!ac || ac.state !== 'running' || muted) return;
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
    if (!ac || ac.state !== 'running' || muted) return;
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

  // Voix de synthèse du navigateur (française si disponible) ; la liste des voix arrive parfois en différé
  const speech = window.speechSynthesis;
  let frVoice = null;
  // On préfère les voix les plus naturelles : "Natural" / "Online" (Edge), puis "Google" (Chrome),
  // puis n'importe quelle voix française (Hortense, Paul… plus robotiques)
  const voiceScore = v => (/natural/i.test(v.name) ? 4 : 0) + (/online/i.test(v.name) ? 2 : 0) + (/google/i.test(v.name) ? 3 : 0) + (v.lang === 'fr-FR' ? 1 : 0);
  const pickVoice = () => {
    const fr = (speech ? speech.getVoices() : []).filter(v => v.lang && v.lang.toLowerCase().startsWith('fr'));
    frVoice = fr.sort((a, b) => voiceScore(b) - voiceScore(a))[0] || null;
  };
  if (speech) { pickVoice(); speech.addEventListener('voiceschanged', pickVoice); }

  // Voix enregistrées (studio : recorder.html) : voices/<id>.webm, .ogg ou .m4a ; sinon voix de synthèse.
  // Préchargées au démarrage pour être jouées instantanément au survol.
  const VOICE_EXTS = ['webm', 'ogg', 'm4a'];
  const VOICE_VOLUME = 0.5; // volume des prénoms annoncés (0 à 1)
  // Effet "FATALITY" : voix ralentie et plus grave, basses renforcées, écho et réverbération de grande salle
  const VOICE_FX = { rate: 0.8, bass: 9, reverb: 0.5, echo: 0.3 };
  const voiceBuffers = {}; // id -> son décodé (lu avec l'effet)
  const voiceClips = {};   // id -> Audio de secours (sans effet) si le décodage est impossible
  let voiceClip = null, voiceSource = null, voiceIn = null;

  // Réverbération : réponse impulsionnelle fabriquée (bruit qui décroît sur ~2,5 s)
  function makeImpulse(ctx, seconds) {
    const len = ctx.sampleRate * seconds | 0, buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    return buf;
  }

  // Chaîne d'effets (construite une seule fois) : entrée → basses → compresseur → sec + réverb + écho → sortie
  function voiceChain(ctx) {
    if (voiceIn) return voiceIn;
    voiceIn = ctx.createGain();
    const bass = ctx.createBiquadFilter();
    bass.type = 'lowshelf';
    bass.frequency.value = 200;
    bass.gain.value = VOICE_FX.bass;
    const comp = ctx.createDynamicsCompressor();
    const out = ctx.createGain();
    out.gain.value = VOICE_VOLUME;
    const reverb = ctx.createConvolver();
    reverb.buffer = makeImpulse(ctx, 2.5);
    const wet = ctx.createGain();
    wet.gain.value = VOICE_FX.reverb;
    const delay = ctx.createDelay(1);
    delay.delayTime.value = 0.22;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.3;
    const echo = ctx.createGain();
    echo.gain.value = VOICE_FX.echo;
    voiceIn.connect(bass);
    bass.connect(comp);
    comp.connect(out);
    comp.connect(reverb); reverb.connect(wet); wet.connect(out);
    comp.connect(delay); delay.connect(feedback); feedback.connect(delay); delay.connect(echo); echo.connect(out);
    out.connect(ctx.destination);
    return voiceIn;
  }

  // Charge voices/<id>.<ext> et le décode ; si fetch est impossible (page ouverte en fichier local),
  // on se rabat sur un simple lecteur audio, sans effet
  async function preloadVoice(id, i = 0) {
    if (i >= VOICE_EXTS.length) { voiceClips[id] = null; return; }
    const url = `voices/${id}.${VOICE_EXTS[i]}`;
    try {
      const res = await fetch(url);
      if (!res.ok) { preloadVoice(id, i + 1); return; }
      voiceBuffers[id] = await getCtx().decodeAudioData(await res.arrayBuffer());
    } catch (e) {
      if (location.protocol !== 'file:') { preloadVoice(id, i + 1); return; } // fichier illisible : on essaie le format suivant
      const clip = new Audio();
      clip.preload = 'auto';
      clip.volume = VOICE_VOLUME;
      clip.oncanplaythrough = () => { voiceClips[id] = clip; clip.oncanplaythrough = null; };
      clip.onerror = () => preloadVoice(id, i + 1);
      clip.src = url;
    }
  }

  function stopVoice() {
    if (voiceClip) voiceClip.pause();
    if (voiceSource) { try { voiceSource.stop(); } catch (e) { /* déjà arrêté */ } voiceSource = null; }
    if (speech) speech.cancel();
  }

  return {
    get muted() { return muted; },
    // Annonce le prénom d'un personnage : sa voix enregistrée si elle existe, sinon la synthèse vocale
    sayName(id, name) {
      if (muted) return;
      stopVoice();
      const buf = voiceBuffers[id];
      if (buf && ac && ac.state === 'running') {
        // Voix enregistrée avec l'effet FATALITY
        voiceSource = ac.createBufferSource();
        voiceSource.buffer = buf;
        voiceSource.playbackRate.value = VOICE_FX.rate;
        voiceSource.connect(voiceChain(ac));
        voiceSource.start();
        return;
      }
      const clip = voiceClips[id];
      if (!clip) { this.say(name); return; } // pas (encore) d'enregistrement : voix de synthèse
      voiceClip = clip;
      clip.currentTime = 0;
      clip.play().catch(() => this.say(name));
    },
    preloadVoices(ids) { for (const id of ids) preloadVoice(id); },
    // Annonce un texte à voix haute (coupe l'annonce précédente)
    say(text) {
      if (!speech || muted) return;
      speech.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'fr-FR';
      if (frVoice) u.voice = frVoice;
      u.rate = 0.85; // voix de synthèse : plus lente et plus grave, façon FATALITY
      u.pitch = 0.4;
      u.volume = VOICE_VOLUME;
      speech.speak(u);
    },
    toggle() {
      muted = !muted;
      try { localStorage.setItem('ds-muted', muted ? '1' : '0'); } catch (e) { /* stockage indisponible */ }
      if (master) master.gain.value = muted ? 0 : VOLUME;
      if (muted) stopVoice();
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
