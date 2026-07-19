(function () {
  'use strict';

  let context = null;
  let shotBuffer = null;
  let loading = null;
  let lastShotAt = -Infinity;

  function ensure() {
    if (!context) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
      context = new AudioContextClass();
      loading = fetch('./assets/audio/fighter-cannon-single.ogg?v=single-shot-20260719')
        .then(response => response.ok ? response.arrayBuffer() : Promise.reject(new Error(`Canon ${response.status}`)))
        .then(data => context.decodeAudioData(data))
        .then(buffer => { shotBuffer = buffer; })
        .catch(error => console.warn('[fighter-cannon-audio]', error));
    }
    if (context.state === 'suspended') context.resume().catch(() => {});
    return context;
  }

  function fireShot() {
    const audioContext = ensure();
    if (!audioContext || !shotBuffer) return;
    if (audioContext.currentTime - lastShotAt < .052) return;
    lastShotAt = audioContext.currentTime;
    const source = audioContext.createBufferSource();
    const gain = audioContext.createGain();
    source.buffer = shotBuffer;
    source.playbackRate.value = .96 + Math.random() * .09;
    gain.gain.value = .46 + Math.random() * .08;
    source.connect(gain).connect(audioContext.destination);
    source.start();
  }

  ['pointerdown', 'keydown', 'touchstart'].forEach(type => {
    window.addEventListener(type, ensure, { passive: true });
  });

  window.RaphaelFighterCannon = {
    fireShot,
    setFiring: () => {},
    stop: () => {},
    isFiring: () => false,
    ready: () => Boolean(shotBuffer),
    loading: () => loading
  };
})();
