(function () {
  'use strict';

  const ambience = new Audio('./assets/audio/background-ambience.ogg?v=background-20260719');
  ambience.loop = true;
  ambience.preload = 'metadata';
  ambience.volume = .055;
  let activated = false;

  function start() {
    activated = true;
    if (document.hidden) return;
    const promise = ambience.play();
    if (promise?.catch) promise.catch(() => {});
  }

  ['pointerdown', 'keydown', 'touchstart'].forEach(type => {
    window.addEventListener(type, start, { once: true, passive: true });
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) ambience.pause();
    else if (activated) start();
  });

  window.RaphaelBackgroundAmbience = {
    start,
    setVolume: value => { ambience.volume = Math.max(0, Math.min(.16, Number(value) || 0)); },
    state: () => ({ activated, paused: ambience.paused, volume: ambience.volume })
  };
})();
