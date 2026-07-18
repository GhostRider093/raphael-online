import * as THREE from 'three';

const LOCK_ACQUIRE_TIME = 2.1;
const LOCK_CAPTURE_RADIUS = 60;
const LOCK_RELEASE_RADIUS = 92;
const BULLET_SPEED = 560;
const AIM_DISTANCE = 1800;

function aimVerticalRatio() {
  return innerWidth <= 720 ? .48 : .44;
}

function segmentDistance(point, start, end) {
  const line = end.clone().sub(start);
  const lengthSq = line.lengthSq();
  if (lengthSq < .0001) return point.distanceTo(start);
  const t = THREE.MathUtils.clamp(point.clone().sub(start).dot(line) / lengthSq, 0, 1);
  return point.distanceTo(start.clone().addScaledVector(line, t));
}

function buildEnemyJet() {
  const group = new THREE.Group();
  const red = new THREE.MeshStandardMaterial({ color: 0x8f1818, emissive: 0x350303, emissiveIntensity: .5, roughness: .48, metalness: .38 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x171b21, roughness: .54, metalness: .46 });
  const glass = new THREE.MeshStandardMaterial({ color: 0xff765b, emissive: 0x691405, emissiveIntensity: 1.1, transparent: true, opacity: .72 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(.85, .58, 7.8, 16), red);
  body.rotation.x = Math.PI / 2;
  group.add(body);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(.86, 2.5, 16), red);
  nose.rotation.x = -Math.PI / 2;
  nose.position.z = -5.12;
  group.add(nose);
  const wings = new THREE.Mesh(new THREE.BoxGeometry(8.6, .22, 2.2), red);
  wings.position.z = -.3;
  group.add(wings);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(3.3, .18, 1.5), dark);
  tail.position.z = 3.25;
  group.add(tail);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(.25, 1.9, 1.05), red);
  fin.position.set(0, .92, 3.4);
  group.add(fin);
  const cockpit = new THREE.Mesh(new THREE.SphereGeometry(.78, 14, 9), glass);
  cockpit.scale.set(.8, .42, 1.25);
  cockpit.position.set(0, .62, -2.1);
  group.add(cockpit);
  [-.46, .46].forEach(x => {
    const engine = new THREE.Mesh(new THREE.CylinderGeometry(.38, .48, 1.45, 12), dark);
    engine.rotation.x = Math.PI / 2;
    engine.position.set(x, -.12, 3.75);
    group.add(engine);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(.28, 2.2, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0xff3c16, transparent: true, opacity: .8, blending: THREE.AdditiveBlending, depthWrite: false }));
    flame.rotation.x = Math.PI / 2;
    flame.position.set(x, -.12, 5.55);
    group.add(flame);
    group.userData.flames ||= [];
    group.userData.flames.push(flame);
  });
  group.scale.setScalar(1.25);
  group.traverse(node => { if (node.isMesh) node.castShadow = true; });
  return group;
}

function createAudioSystem(audioStateElement) {
  let context = null;
  let engineGain = null;
  let engineLow = null;
  let engineHigh = null;
  let nextAcquireBeep = 0;

  function ensure() {
    if (!context) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
      context = new AudioContextClass();
      engineGain = context.createGain();
      engineGain.gain.value = .0001;
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 520;
      engineLow = context.createOscillator();
      engineHigh = context.createOscillator();
      engineLow.type = 'sawtooth';
      engineHigh.type = 'triangle';
      engineLow.frequency.value = 64;
      engineHigh.frequency.value = 118;
      engineLow.connect(filter);
      engineHigh.connect(filter);
      filter.connect(engineGain);
      engineGain.connect(context.destination);
      engineLow.start();
      engineHigh.start();
    }
    const renderState = () => {
      if (audioStateElement) audioStateElement.textContent = context.state === 'running'
        ? 'Son : réacteur et combat actifs'
        : 'Son : prêt · touchez une commande';
    };
    if (context.state === 'suspended') context.resume().then(renderState).catch(renderState);
    renderState();
    return context;
  }

  function updateEngine(speed) {
    if (!context || !engineGain) return;
    const amount = THREE.MathUtils.clamp(Math.abs(speed) / 92, 0, 1);
    engineGain.gain.setTargetAtTime(.025 + amount * .045, context.currentTime, .08);
    engineLow.frequency.setTargetAtTime(58 + amount * 72, context.currentTime, .06);
    engineHigh.frequency.setTargetAtTime(112 + amount * 138, context.currentTime, .06);
  }

  function noise(duration, volume, cutoff, tone = 0) {
    const c = ensure();
    if (!c) return;
    const buffer = c.createBuffer(1, Math.ceil(c.sampleRate * duration), c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const t = i / c.sampleRate;
      data[i] = (Math.random() * 2 - 1) * Math.exp(-t * (5 / Math.max(.1, duration))) + (tone ? Math.sin(t * Math.PI * 2 * tone) * Math.exp(-t * 5) : 0);
    }
    const source = c.createBufferSource();
    const filter = c.createBiquadFilter();
    const gain = c.createGain();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    gain.gain.value = volume;
    source.buffer = buffer;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(c.destination);
    source.start();
  }

  function gun() { noise(.085, .48, 1500, 78); }
  function missile() { noise(1.05, .55, 1900, 115); }
  function explosion() { noise(.9, .78, 850, 48); }
  function lock() {
    const c = ensure();
    if (!c) return;
    const now = c.currentTime;
    [0, .09].forEach((offset, index) => {
      const oscillator = c.createOscillator();
      const gain = c.createGain();
      oscillator.type = 'square';
      oscillator.frequency.value = index ? 980 : 740;
      gain.gain.setValueAtTime(.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(.16, now + offset + .012);
      gain.gain.exponentialRampToValueAtTime(.0001, now + offset + .075);
      oscillator.connect(gain);
      gain.connect(c.destination);
      oscillator.start(now + offset);
      oscillator.stop(now + offset + .085);
    });
  }

  function acquire(progress) {
    const c = ensure();
    if (!c || c.currentTime < nextAcquireBeep) return;
    const normalized = THREE.MathUtils.clamp(progress, 0, 1);
    nextAcquireBeep = c.currentTime + THREE.MathUtils.lerp(.42, .13, normalized);
    const oscillator = c.createOscillator();
    const gain = c.createGain();
    oscillator.type = 'square';
    oscillator.frequency.value = 620 + normalized * 260;
    gain.gain.setValueAtTime(.0001, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(.2, c.currentTime + .012);
    gain.gain.exponentialRampToValueAtTime(.0001, c.currentTime + .105);
    oscillator.connect(gain);
    gain.connect(c.destination);
    oscillator.start();
    oscillator.stop(c.currentTime + .115);
  }

  document.addEventListener('keydown', ensure, { passive: true });
  document.addEventListener('pointerdown', ensure, { passive: true });
  return { ensure, updateEngine, gun, missile, explosion, lock, acquire, isActive: () => !!context };
}

export function createWorldCombat({ scene, camera, player, world, mode, getHeight, getForward, getSpeed }) {
  const ui = document.getElementById('combat-ui');
  const combatButtons = Array.from(document.querySelectorAll('[data-world-touch="fire"],[data-world-touch="missile"]'));
  if (mode.type !== 'flight') {
    ui.hidden = true;
    combatButtons.forEach(button => { button.hidden = true; });
    return { active: false, update() {}, diagnostics: { active: false } };
  }

  ui.hidden = false;
  combatButtons.forEach(button => { button.hidden = false; });
  const reticle = document.getElementById('flight-reticle');
  const reticleRange = document.getElementById('reticle-range');
  const aimLead = document.getElementById('aim-lead');
  const diamond = document.getElementById('target-diamond');
  const radarTarget = document.getElementById('radar-target');
  const lockState = document.getElementById('combat-lock-state');
  const distanceState = document.getElementById('combat-distance');
  const ammoState = document.getElementById('combat-ammo');
  const missileRackState = document.getElementById('missile-rack-status');
  const missileButton = document.querySelector('[data-world-touch="missile"]');
  const healthFill = document.getElementById('target-health-fill');
  const scoreState = document.getElementById('combat-score');
  const audio = createAudioSystem(document.getElementById('combat-audio-state'));

  const enemy = {
    mesh: buildEnemyJet(), hp: 100, maxHp: 100, alive: true,
    radius: 11.5, phase: 0, holdUntil: 0, velocity: new THREE.Vector3()
  };
  const initialZ = world.spawn.air[2] - 430;
  enemy.mesh.position.set(world.spawn.air[0], world.spawn.air[1] + 24, initialZ);
  scene.add(enemy.mesh);

  const bullets = [];
  const missiles = [];
  const missileSmoke = [];
  const explosions = [];
  let locked = false;
  let lockProgress = 0;
  let lockAnnounced = false;
  let forcedLockUntil = 0;
  let deniedUntil = 0;
  let gunCooldown = 0;
  let previousMissile = false;
  let missilesLeft = 4;
  let score = 0;

  const bulletGeometry = new THREE.CylinderGeometry(.11, .11, 4.2, 6);
  bulletGeometry.rotateX(Math.PI / 2);
  const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xffee55 });

  function targetPoint() { return enemy.mesh.position.clone(); }

  function getAimDirection() {
    const ndcY = 1 - aimVerticalRatio() * 2;
    const throughScope = new THREE.Vector3(0, ndcY, .42).unproject(camera);
    const cameraRay = throughScope.sub(camera.position).normalize();
    const aimPoint = camera.position.clone().addScaledVector(cameraRay, AIM_DISTANCE);
    return aimPoint.sub(player.position).normalize();
  }

  function spawnExplosion(position, scale = 1) {
    audio.explosion();
    const parts = [];
    [0xff3b16, 0xff9f24, 0xffe36a].forEach((color, index) => {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry((2.8 - index * .5) * scale, 12, 8), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false }));
      mesh.position.copy(position).add(new THREE.Vector3((index - 1) * 2, index * 1.2, (1 - index) * 1.7));
      scene.add(mesh);
      parts.push(mesh);
    });
    explosions.push({ parts, life: .85, maxLife: .85 });
  }

  function destroyEnemy() {
    if (!enemy.alive) return;
    enemy.alive = false;
    enemy.hp = 0;
    spawnExplosion(targetPoint(), 1.6);
    scene.remove(enemy.mesh);
    locked = false;
    lockProgress = 0;
    score += 100;
    radarTarget.style.display = 'none';
    diamond.className = '';
    aimLead.className = '';
    reticle.classList.remove('locked', 'acquiring', 'denied');
    lockState.className = 'ok';
    lockState.textContent = 'CIBLE DÉTRUITE';
    distanceState.textContent = 'Mission aérienne accomplie';
    scoreState.textContent = `Score ${score} · avion ennemi détruit`;
  }

  function damageEnemy(amount) {
    if (!enemy.alive) return;
    enemy.hp = Math.max(0, enemy.hp - amount);
    if (enemy.hp <= 0) destroyEnemy();
  }

  function fireGun() {
    if (!enemy.alive) return;
    audio.gun();
    const direction = getAimDirection();
    const muzzleForward = getForward().normalize();
    const mesh = new THREE.Mesh(bulletGeometry, bulletMaterial);
    mesh.position.copy(player.position).addScaledVector(muzzleForward, 11);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);
    scene.add(mesh);
    bullets.push({ mesh, velocity: direction.multiplyScalar(BULLET_SPEED), life: 2.3 });
  }

  function denyMissile() {
    deniedUntil = performance.now() + 750;
    reticle.classList.remove('denied');
    void reticle.offsetWidth;
    reticle.classList.add('denied');
    lockState.className = 'locked';
    lockState.textContent = 'MISSILE NON GUIDÉ · CIBLE NON VERROUILLÉE';
  }

  function spawnMissileSmoke(position) {
    const puff = new THREE.Mesh(
      new THREE.SphereGeometry(.45, 7, 5),
      new THREE.MeshBasicMaterial({ color: 0xd8e2e5, transparent: true, opacity: .42, depthWrite: false })
    );
    puff.position.copy(position);
    scene.add(puff);
    missileSmoke.push({ mesh: puff, life: .72, maxLife: .72 });
  }

  function fireMissile(forceGuided) {
    if (!enemy.alive) return false;
    if (missilesLeft <= 0) {
      lockState.className = 'locked';
      lockState.textContent = 'PLUS DE MISSILES';
      return false;
    }
    const guided = forceGuided ?? locked;
    if (!guided) denyMissile();
    audio.missile();
    const mountedMissile = (player.userData.missileRacks || []).find(item => item.visible);
    const launchPosition = player.position.clone();
    if (mountedMissile) {
      player.updateWorldMatrix(true, true);
      mountedMissile.getWorldPosition(launchPosition);
      mountedMissile.visible = false;
    }
    missilesLeft--;
    const direction = getForward().normalize();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(.2, .13, 3.8, 10), new THREE.MeshStandardMaterial({ color: 0xaeb8c4, roughness: .3, metalness: .7 }));
    body.geometry.rotateX(Math.PI / 2);
    body.position.copy(launchPosition).addScaledVector(direction, 1.5);
    body.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(.3, 2.5, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0xff7300, transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false }));
    flame.rotation.x = Math.PI / 2;
    flame.position.z = 2.3;
    body.add(flame);
    scene.add(body);
    missiles.push({ mesh: body, velocity: direction.multiplyScalar(125), life: 9, trailClock: 0, guided });
    return true;
  }

  function projectPoint(position) {
    const ndc = position.clone().project(camera);
    if (ndc.z < -1 || ndc.z > 1) return null;
    const sx = (ndc.x * .5 + .5) * innerWidth;
    const sy = (-ndc.y * .5 + .5) * innerHeight;
    return {
      sx, sy,
      screen: Math.hypot(sx - innerWidth / 2, sy - innerHeight * aimVerticalRatio()),
      distance: position.distanceTo(player.position),
      visible: Math.abs(ndc.x) < 1.25 && Math.abs(ndc.y) < 1.25
    };
  }

  function projectTarget() {
    if (!enemy.alive) return null;
    return projectPoint(targetPoint());
  }

  function updateEnemy(dt, elapsed) {
    if (!enemy.alive) return;
    enemy.phase += dt;
    if (performance.now() >= enemy.holdUntil) {
      const forward = getForward().clone().setY(0).normalize();
      const right = new THREE.Vector3(-forward.z, 0, forward.x);
      const forwardDistance = 470 + Math.sin(elapsed * .18) * 55;
      const lateralDistance = Math.sin(elapsed * .27) * Math.min(42, world.size * .035);
      const x = player.position.x + forward.x * forwardDistance + right.x * lateralDistance;
      const z = player.position.z + forward.z * forwardDistance + right.z * lateralDistance;
      const insideWorld = Math.abs(x) < world.size * .48 && Math.abs(z) < world.size * .48;
      const ground = insideWorld ? getHeight(x, z) : -999;
      const y = Math.max(ground + 55, player.position.y - 30 + Math.sin(elapsed * .34) * 12);
      const previous = enemy.mesh.position.clone();
      enemy.mesh.position.lerp(new THREE.Vector3(x, y, z), Math.min(1, dt * .9));
      const direction = enemy.mesh.position.clone().sub(previous);
      enemy.velocity.copy(direction).multiplyScalar(1 / Math.max(dt, .001));
      if (direction.lengthSq() > .0001) {
        const yaw = Math.atan2(-direction.x, -direction.z);
        enemy.mesh.rotation.set(Math.sin(elapsed * .7) * .07, yaw, Math.sin(elapsed * .45) * .22);
      }
    }
    if (performance.now() < enemy.holdUntil) enemy.velocity.multiplyScalar(Math.max(0, 1 - dt * 5));
    (enemy.mesh.userData.flames || []).forEach((flame, index) => flame.scale.setScalar(.85 + Math.sin(elapsed * 35 + index) * .08));
  }

  function updateRadar() {
    if (!enemy.alive) return;
    radarTarget.style.display = 'block';
    const offset = targetPoint().sub(player.position);
    const distance = Math.hypot(offset.x, offset.z);
    const forward = getForward().setY(0).normalize();
    const right = new THREE.Vector3(-forward.z, 0, forward.x);
    const maxRange = 1200;
    const scale = Math.min(1, maxRange / Math.max(1, distance));
    const rightAmount = offset.dot(right) * scale / maxRange;
    const forwardAmount = offset.dot(forward) * scale / maxRange;
    const acquiring = lockProgress > 0 && !locked;
    const wobbleX = acquiring ? Math.sin(performance.now() * .027) * 2.8 : 0;
    const wobbleY = acquiring ? Math.cos(performance.now() * .021) * 2.2 : 0;
    radarTarget.style.left = `${50 + THREE.MathUtils.clamp(rightAmount, -.44, .44) * 100 + wobbleX}%`;
    radarTarget.style.top = `${50 - THREE.MathUtils.clamp(forwardAmount, -.44, .44) * 100 + wobbleY}%`;
  }

  function updateLock(dt) {
    if (!enemy.alive) return;
    const aim = projectTarget();
    const forced = performance.now() < forcedLockUntil;
    const insideCapture = !!(aim?.visible && aim.screen <= LOCK_CAPTURE_RADIUS);
    const retain = !!(locked && aim?.visible && aim.screen <= LOCK_RELEASE_RADIUS);
    if (forced && enemy.alive) {
      locked = true;
      lockProgress = LOCK_ACQUIRE_TIME;
    } else if (retain) {
      lockProgress = LOCK_ACQUIRE_TIME;
    } else if (insideCapture) {
      locked = false;
      lockProgress = Math.min(LOCK_ACQUIRE_TIME, lockProgress + dt);
      if (lockProgress >= LOCK_ACQUIRE_TIME) locked = true;
    } else {
      locked = false;
      lockProgress = 0;
    }

    if (locked && !lockAnnounced) audio.lock();
    if (insideCapture && !locked) audio.acquire(lockProgress / LOCK_ACQUIRE_TIME);
    lockAnnounced = locked;
    reticle.classList.toggle('locked', locked);
    reticle.classList.toggle('acquiring', insideCapture && !locked);
    if (performance.now() > deniedUntil) reticle.classList.remove('denied');

    diamond.className = '';
    aimLead.className = '';
    const overlapsMobileHud = innerWidth <= 720 && aim && aim.sx > innerWidth - 155 && aim.sy < 292;
    if (aim?.visible && aim.screen < 300 && !overlapsMobileHud) {
      diamond.style.left = `${THREE.MathUtils.clamp(aim.sx, 27, innerWidth - 27)}px`;
      diamond.style.top = `${THREE.MathUtils.clamp(aim.sy, 27, innerHeight - 27)}px`;
      diamond.classList.add('visible', locked ? 'locked' : insideCapture ? 'acquiring' : 'tracking');
    }

    if (aim?.visible && !overlapsMobileHud) {
      const travelTime = Math.min(1.35, aim.distance / BULLET_SPEED);
      const predicted = targetPoint().addScaledVector(enemy.velocity, travelTime);
      const lead = projectPoint(predicted);
      const leadOverlapsHud = innerWidth <= 720 && lead && lead.sx > innerWidth - 155 && lead.sy < 292;
      if (lead?.visible && lead.screen < 360 && !leadOverlapsHud) {
        aimLead.style.left = `${THREE.MathUtils.clamp(lead.sx, 18, innerWidth - 18)}px`;
        aimLead.style.top = `${THREE.MathUtils.clamp(lead.sy, 18, innerHeight - 18)}px`;
        aimLead.classList.add('visible');
      }
    }

    if (performance.now() < deniedUntil) {
      lockState.className = 'locked';
      lockState.textContent = 'MISSILE BLOQUÉ · ALIGNEZ LE LOSANGE';
    } else if (locked) {
      lockState.className = 'locked';
      lockState.textContent = 'TIR AUTORISÉ · AVION ENNEMI';
    } else if (insideCapture) {
      lockState.className = '';
      lockState.textContent = `ACQUISITION ${Math.round(lockProgress / LOCK_ACQUIRE_TIME * 100)}%`;
    } else {
      lockState.className = '';
      lockState.textContent = 'ALIGNEZ LE LOSANGE';
    }
    distanceState.textContent = `Distance ${Math.round(aim?.distance || targetPoint().distanceTo(player.position))} m`;
    reticleRange.textContent = `CANON · CIBLE ${Math.round(aim?.distance || targetPoint().distanceTo(player.position))} M`;
    ammoState.textContent = `Missiles ${missilesLeft} · Canon ${gunCooldown <= 0 ? 'prêt' : 'recharge'}`;
    if (missileRackState) missileRackState.textContent = `SOUS AILES  ${'◆ '.repeat(missilesLeft)}${'◇ '.repeat(4 - missilesLeft)}`.trim();
    if (missileButton) missileButton.textContent = `MISSILE ×${missilesLeft}`;
    healthFill.style.transform = `scaleX(${enemy.hp / enemy.maxHp})`;
    scoreState.textContent = `Cible aérienne · PV ${enemy.hp} / ${enemy.maxHp} · Score ${score}`;
  }

  function updateProjectiles(dt) {
    for (let index = bullets.length - 1; index >= 0; index--) {
      const bullet = bullets[index];
      const previous = bullet.mesh.position.clone();
      bullet.life -= dt;
      bullet.mesh.position.addScaledVector(bullet.velocity, dt);
      const hit = enemy.alive && segmentDistance(targetPoint(), previous, bullet.mesh.position) <= enemy.radius;
      if (hit) damageEnemy(10);
      if (hit || bullet.life <= 0) {
        scene.remove(bullet.mesh);
        bullets.splice(index, 1);
      }
    }
    for (let index = missiles.length - 1; index >= 0; index--) {
      const missile = missiles[index];
      missile.life -= dt;
      missile.trailClock -= dt;
      if (missile.trailClock <= 0) {
        spawnMissileSmoke(missile.mesh.position);
        missile.trailClock = .035;
      }
      if (missile.guided && enemy.alive) {
        const desired = targetPoint().sub(missile.mesh.position).normalize();
        missile.velocity.lerp(desired.multiplyScalar(280), Math.min(1, dt * 3.5));
      }
      missile.mesh.position.addScaledVector(missile.velocity, dt);
      if (missile.velocity.lengthSq() > 1) missile.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), missile.velocity.clone().normalize());
      const hit = missile.guided && enemy.alive && missile.mesh.position.distanceTo(targetPoint()) < enemy.radius + 2;
      if (hit) damageEnemy(100);
      if (hit || missile.life <= 0) {
      scene.remove(missile.mesh);
        missiles.splice(index, 1);
      }
    }
    for (let index = missileSmoke.length - 1; index >= 0; index--) {
      const smoke = missileSmoke[index];
      smoke.life -= dt;
      const progress = 1 - smoke.life / smoke.maxLife;
      smoke.mesh.scale.setScalar(1 + progress * 3.2);
      smoke.mesh.material.opacity = Math.max(0, .42 * (1 - progress));
      smoke.mesh.position.y += dt * 1.8;
      if (smoke.life <= 0) {
        scene.remove(smoke.mesh);
        missileSmoke.splice(index, 1);
      }
    }
    for (let index = explosions.length - 1; index >= 0; index--) {
      const explosion = explosions[index];
      explosion.life -= dt;
      const progress = 1 - explosion.life / explosion.maxLife;
      explosion.parts.forEach((part, partIndex) => {
        part.scale.setScalar(1 + progress * (4.5 + partIndex));
        part.material.opacity = Math.max(0, .9 * (1 - progress));
      });
      if (explosion.life <= 0) {
        explosion.parts.forEach(part => scene.remove(part));
        explosions.splice(index, 1);
      }
    }
  }

  function update(dt, elapsed, pad, keys, touch) {
    gunCooldown -= dt;
    updateEnemy(dt, elapsed);
    updateRadar();
    updateLock(dt);
    updateProjectiles(dt);
    audio.updateEngine(getSpeed());
    if (pad.fire || pad.missile || pad.boost || pad.throttle > .08) audio.ensure();

    const fireHeld = !!(keys.Space || keys.KeyF || touch.fire || pad.fire);
    if (fireHeld && gunCooldown <= 0) {
      fireGun();
      gunCooldown = .085;
    }
    const missileHeld = !!(keys.KeyG || keys.KeyM || touch.missile || pad.missile);
    if (missileHeld && !previousMissile) {
      fireMissile(locked);
    }
    previousMissile = missileHeld;
  }

  function placeTargetAhead(distance = 340) {
    if (!enemy.alive) {
      enemy.alive = true;
      enemy.hp = enemy.maxHp;
      scene.add(enemy.mesh);
    }
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    enemy.mesh.position.copy(camera.position).addScaledVector(forward.normalize(), distance);
    enemy.mesh.rotation.y = player.rotation.y;
    enemy.holdUntil = performance.now() + 12000;
    return enemy.mesh.position.toArray();
  }

  return {
    active: true,
    update,
    diagnostics: {
      active: true,
      state: () => ({ hp: enemy.hp, alive: enemy.alive, locked, lockProgress, missileQueued: false, missilesLeft, mountedMissiles: (player.userData.missileRacks || []).filter(item => item.visible).length, activeMissiles: missiles.length, guidedMissiles: missiles.filter(item => item.guided).length, score, targetPosition: enemy.mesh.position.toArray(), targetDistance: enemy.mesh.position.distanceTo(player.position), bulletSpeed: BULLET_SPEED, aimVerticalRatio: aimVerticalRatio() }),
      placeTargetAhead,
      forceLock: () => { forcedLockUntil = performance.now() + 2500; locked = true; lockProgress = LOCK_ACQUIRE_TIME; return true; },
      fireMissile,
      destroyTarget: () => destroyEnemy()
    }
  };
}
