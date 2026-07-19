(function () {
  'use strict';

  const state = {
    context: null,
    engine: null,
    ambience: null,
    engineGain: null,
    ambienceGain: null,
    filter: null,
    started: false,
    loading: null,
    throttle: 0
  };

  function loadBuffer(context, url) {
    return fetch(url)
      .then(response => {
        if (!response.ok) throw new Error(`Audio ${response.status}: ${url}`);
        return response.arrayBuffer();
      })
      .then(data => context.decodeAudioData(data));
  }

  function ensureStarted() {
    if (state.started) {
      if (state.context?.state === 'suspended') state.context.resume().catch(() => {});
      return state.loading || Promise.resolve();
    }
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return Promise.resolve();
    state.started = true;
    state.context = new AudioContextClass();
    state.engineGain = state.context.createGain();
    state.ambienceGain = state.context.createGain();
    state.filter = state.context.createBiquadFilter();
    state.filter.type = 'lowpass';
    state.filter.frequency.value = 5200;
    state.engineGain.gain.value = 0;
    state.ambienceGain.gain.value = 0;
    state.engineGain.connect(state.filter).connect(state.context.destination);
    state.ambienceGain.connect(state.context.destination);
    state.loading = Promise.all([
      loadBuffer(state.context, './assets/audio/fighter-jet-engine.ogg'),
      loadBuffer(state.context, './assets/audio/fighter-jet-ambience.ogg')
    ]).then(([engineBuffer, ambienceBuffer]) => {
      state.engine = state.context.createBufferSource();
      state.engine.buffer = engineBuffer;
      state.engine.loop = true;
      state.engine.loopStart = Math.min(2.2, engineBuffer.duration * .08);
      state.engine.loopEnd = Math.max(state.engine.loopStart + 1, engineBuffer.duration - 1.6);
      state.engine.connect(state.engineGain);
      state.engine.start();
      state.ambience = state.context.createBufferSource();
      state.ambience.buffer = ambienceBuffer;
      state.ambience.loop = true;
      state.ambience.connect(state.ambienceGain);
      state.ambience.start();
    }).catch(error => console.warn('[fighter-engine-audio]', error));
    state.context.resume().catch(() => {});
    return state.loading;
  }

  function update(throttle, boosting) {
    state.throttle = Math.max(0, Math.min(1, Number(throttle) || 0));
    ensureStarted().then(() => {
      if (!state.engine || !state.context) return;
      const now = state.context.currentTime;
      const power = Math.max(.12, state.throttle);
      state.engine.playbackRate.setTargetAtTime(.72 + power * .68 + (boosting ? .12 : 0), now, .16);
      state.engineGain.gain.setTargetAtTime(.085 + power * .24 + (boosting ? .055 : 0), now, .12);
      state.ambienceGain.gain.setTargetAtTime(.018 + power * .045, now, .45);
      state.filter.frequency.setTargetAtTime(2300 + power * 7200, now, .18);
    });
  }

  function silence() {
    if (!state.context) return;
    const now = state.context.currentTime;
    state.engineGain?.gain.setTargetAtTime(0, now, .15);
    state.ambienceGain?.gain.setTargetAtTime(0, now, .3);
  }

  ['pointerdown', 'keydown', 'touchstart'].forEach(type => {
    window.addEventListener(type, ensureStarted, { once: true, passive: true });
  });
  window.addEventListener('blur', silence);
  window.RaphaelFighterEngine = { start: ensureStarted, update, silence, state: () => ({ started: state.started, throttle: state.throttle }) };
})();
