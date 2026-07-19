(function () {
  'use strict';

  const launchTemplate = new Audio('./assets/audio/fighter-missile-launch.ogg');
  const destructionTemplate = new Audio('./assets/audio/fighter-destruction.ogg');
  launchTemplate.preload = destructionTemplate.preload = 'auto';
  launchTemplate.volume = .72;
  destructionTemplate.volume = .78;
  const activeLaunches = new Set();

  function play(template, volume) {
    const sound = template.cloneNode(true);
    sound.volume = volume;
    const promise = sound.play();
    if (promise?.catch) promise.catch(() => {});
    return sound;
  }

  function playLaunch() {
    const sound = play(launchTemplate, .72);
    activeLaunches.add(sound);
    const forget = () => activeLaunches.delete(sound);
    sound.addEventListener('ended', forget, { once: true });
    sound.addEventListener('error', forget, { once: true });
    return sound;
  }

  function stopLaunches() {
    activeLaunches.forEach(sound => {
      sound.pause();
      sound.currentTime = 0;
    });
    activeLaunches.clear();
  }

  function playDestruction() {
    stopLaunches();
    return play(destructionTemplate, .82);
  }

  window.RaphaelMissileAudio = {
    playLaunch,
    stopLaunches,
    playDestruction
  };
})();
