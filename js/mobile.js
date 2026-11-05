// Mobile : plein écran + paysage au premier toucher, et message si le téléphone est en portrait
(function () {
  const isTouch = matchMedia('(pointer: coarse)').matches;
  if (!isTouch) return;
  const de = document.documentElement;
  function lock() {
    try {
      const p = !document.fullscreenElement && (de.requestFullscreen || de.webkitRequestFullscreen)
        ? (de.requestFullscreen || de.webkitRequestFullscreen).call(de) : null;
      const rot = () => { try { screen.orientation.lock('landscape').catch(() => {}); } catch (e) {} };
      if (p && p.then) p.then(rot, rot); else rot();
    } catch (e) {}
  }
  addEventListener('pointerdown', lock);
  addEventListener('touchend', lock);
  // Message de rotation (iOS ne permet pas de forcer le paysage)
  const o = document.createElement('div');
  o.id = 'rotateMsg';
  o.innerHTML = '<div><div style="font-size:64px">📱↻</div><p>Tourne ton téléphone<br>en mode paysage pour jouer</p></div>';
  document.body.appendChild(o);
})();
