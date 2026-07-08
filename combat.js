// ==========================================================================
//  COMBAT  -  mode tir : cibles au sol + missiles + viseur
// --------------------------------------------------------------------------
//  Actif uniquement en vol (chasseur / fly). Auto-branche sur le moteur :
//  lit les globaux scene, player, keys, gameStarted, isFlyingMode(), camera,
//  ISLAND_RADIUS. Boucle d'animation propre (requestAnimationFrame).
//
//  Tir : BARRE ESPACE (ou clic gauche). Vise une cible avec le viseur central,
//  pique dessus, tire. Touche = explosion + score.
// ==========================================================================
(function () {
  const TARGET_COUNT   = 8;
  const MISSILE_SPEED  = 160;   // unites / s
  const MISSILE_LIFE   = 3.0;   // s
  const HIT_RADIUS     = 7;     // generosite de visee
  const FIRE_COOLDOWN  = 0.35;  // s entre deux tirs

  let targets = [];
  let missiles = [];
  let explosions = [];
  let active = false;
  let prevFire = false;
  let fireTimer = 0;
  let lastT = performance.now();
  let score = 0;
  let crosshair = null, hudEl = null;
  let mouseFire = false;

  document.addEventListener("mousedown", e => { if (e.button === 0) mouseFire = true; });
  document.addEventListener("mouseup",   e => { if (e.button === 0) mouseFire = false; });

  function ready() {
    return typeof scene !== "undefined" && scene &&
           typeof player !== "undefined" && player &&
           typeof isFlyingMode === "function" &&
           typeof gameStarted !== "undefined";
  }

  // ── VISEUR (overlay HTML) ───────────────────────────────────────────────
  function showCrosshair() {
    if (!crosshair) {
      crosshair = document.createElement("div");
      crosshair.innerHTML =
        '<svg width="80" height="80" viewBox="0 0 80 80">' +
        '<circle cx="40" cy="40" r="26" fill="none" stroke="#39ff88" stroke-width="2" opacity="0.85"/>' +
        '<line x1="40" y1="6"  x2="40" y2="22" stroke="#39ff88" stroke-width="2"/>' +
        '<line x1="40" y1="58" x2="40" y2="74" stroke="#39ff88" stroke-width="2"/>' +
        '<line x1="6"  y1="40" x2="22" y2="40" stroke="#39ff88" stroke-width="2"/>' +
        '<line x1="58" y1="40" x2="74" y2="40" stroke="#39ff88" stroke-width="2"/>' +
        '<circle cx="40" cy="40" r="2.5" fill="#39ff88"/>' +
        '</svg>';
      Object.assign(crosshair.style, {
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%,-50%)", pointerEvents: "none", zIndex: "40"
      });
      document.body.appendChild(crosshair);

      hudEl = document.createElement("div");
      Object.assign(hudEl.style, {
        position: "absolute", top: "12px", right: "16px",
        color: "#39ff88", font: "bold 16px monospace", textShadow: "0 0 4px #000",
        zIndex: "40", pointerEvents: "none"
      });
      document.body.appendChild(hudEl);
    }
    crosshair.style.display = "block";
    hudEl.style.display = "block";
    updateHud();
  }
  function hideCrosshair() {
    if (crosshair) crosshair.style.display = "none";
    if (hudEl) hudEl.style.display = "none";
  }
  function updateHud() {
    if (hudEl) hudEl.textContent = "CIBLES  " + score + " / " + TARGET_COUNT + "   [ESPACE/manette = tir]";
  }

  // ── CIBLES ──────────────────────────────────────────────────────────────
  function spawnTargets() {
    const R = (typeof ISLAND_RADIUS === "number" ? ISLAND_RADIUS : 150) * 0.82;
    for (let i = 0; i < TARGET_COUNT; i++) {
      const ang = (i / TARGET_COUNT) * Math.PI * 2 + i * 0.7;
      const dist = R * (0.25 + 0.7 * ((i * 37 % 100) / 100));
      const x = Math.cos(ang) * dist;
      const z = Math.sin(ang) * dist;
      targets.push(makeTarget(x, z));
    }
  }
  function makeTarget(x, z) {
    const g = new THREE.Group();
    // mat / poteau
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.7, 8, 10),
      new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.6 })
    );
    pole.position.y = 4;
    g.add(pole);
    // sphere cible rouge lumineuse
    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(2.4, 20, 16),
      new THREE.MeshStandardMaterial({ color: 0xff3030, emissive: 0xaa0000, emissiveIntensity: 0.8, roughness: 0.4 })
    );
    orb.position.y = 10;
    g.add(orb);
    // anneau pour la visibilite du ciel
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(3.4, 0.35, 8, 24),
      new THREE.MeshBasicMaterial({ color: 0xffd23a })
    );
    ring.position.y = 10;
    ring.rotation.x = Math.PI / 2;
    g.add(ring);
    g.position.set(x, 0, z);
    scene.add(g);
    return { mesh: g, orb, ring, pos: new THREE.Vector3(x, 10, z), alive: true, spin: 0 };
  }

  // ── MISSILES ──────────────────────────────────────────────────────────────
  function fireMissile() {
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(player.quaternion).normalize();
    const start = player.position.clone().addScaledVector(fwd, 4);
    const body = new THREE.Group();
    const tube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 2, 10),
      new THREE.MeshStandardMaterial({ color: 0x202428, metalness: 0.6, roughness: 0.4 })
    );
    tube.rotation.x = Math.PI / 2;           // longueur le long de Z
    body.add(tube);
    const nose = new THREE.Mesh(
      new THREE.ConeGeometry(0.22, 0.7, 10),
      new THREE.MeshStandardMaterial({ color: 0xd23a2a, metalness: 0.4, roughness: 0.5 })
    );
    nose.rotation.x = -Math.PI / 2;
    nose.position.z = -1.3;                   // pointe vers l'avant (-Z)
    body.add(nose);
    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.2, 1.1, 10, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffae2e, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    flame.rotation.x = Math.PI / 2;
    flame.position.z = 1.3;                   // arriere (+Z)
    body.add(flame);
    body.position.copy(start);
    body.quaternion.copy(player.quaternion);
    scene.add(body);
    missiles.push({ mesh: body, vel: fwd.multiplyScalar(MISSILE_SPEED), life: MISSILE_LIFE });
  }

  function updateMissiles(dt) {
    for (let i = missiles.length - 1; i >= 0; i--) {
      const m = missiles[i];
      m.mesh.position.addScaledVector(m.vel, dt);
      m.life -= dt;
      let dead = m.life <= 0;
      // sol
      if (m.mesh.position.y <= 0.3) { spawnExplosion(m.mesh.position, 0xffae2e, 4); dead = true; }
      // cibles
      if (!dead) {
        for (const t of targets) {
          if (t.alive && m.mesh.position.distanceTo(t.pos) < HIT_RADIUS) {
            destroyTarget(t);
            spawnExplosion(t.pos, 0xff5a1e, 9);
            dead = true;
            break;
          }
        }
      }
      if (dead) { scene.remove(m.mesh); missiles.splice(i, 1); }
    }
  }

  function destroyTarget(t) {
    t.alive = false;
    scene.remove(t.mesh);
    score++;
    updateHud();
    // respawn la cible ailleurs apres un delai pour garder du jeu
    setTimeout(() => {
      if (!active) return;
      const R = (typeof ISLAND_RADIUS === "number" ? ISLAND_RADIUS : 150) * 0.82;
      const ang = Math.random() * Math.PI * 2, dist = R * (0.25 + 0.7 * Math.random());
      const nt = makeTarget(Math.cos(ang) * dist, Math.sin(ang) * dist);
      targets.push(nt);
    }, 2500);
  }

  // ── EXPLOSIONS ──────────────────────────────────────────────────────────
  function spawnExplosion(pos, color, size) {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(1, 16, 12),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    m.position.copy(pos);
    scene.add(m);
    explosions.push({ mesh: m, age: 0, max: size });
  }
  function updateExplosions(dt) {
    for (let i = explosions.length - 1; i >= 0; i--) {
      const e = explosions[i];
      e.age += dt;
      const k = e.age / 0.5;
      e.mesh.scale.setScalar(1 + k * e.max);
      e.mesh.material.opacity = Math.max(0, 0.9 * (1 - k));
      if (k >= 1) { scene.remove(e.mesh); explosions.splice(i, 1); }
    }
  }

  // ── CYCLE ─────────────────────────────────────────────────────────────────
  function start() {
    active = true; score = 0;
    spawnTargets();
    showCrosshair();
  }
  function stop() {
    active = false;
    targets.forEach(t => scene.remove(t.mesh)); targets = [];
    missiles.forEach(m => scene.remove(m.mesh)); missiles = [];
    explosions.forEach(e => scene.remove(e.mesh)); explosions = [];
    hideCrosshair();
  }

  function loop() {
    requestAnimationFrame(loop);
    if (!ready()) return;
    const flying = gameStarted && isFlyingMode();
    if (flying && !active) start();
    else if (!flying && active) stop();
    if (!active) return;

    const now = performance.now();
    const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
    fireTimer -= dt;

    const gamepadFire = typeof isFlightGamepadFirePressed === "function" && isFlightGamepadFirePressed();
    const fireKey = (typeof keys !== "undefined" && keys && keys["Space"]) || mouseFire || gamepadFire;
    if (fireKey && fireTimer <= 0) { fireMissile(); fireTimer = FIRE_COOLDOWN; }
    prevFire = fireKey;

    // anime les cibles (rotation anneau + pulse)
    const t = now * 0.001;
    targets.forEach(tg => { if (tg.ring) tg.ring.rotation.z += dt * 1.5; if (tg.orb) tg.orb.material.emissiveIntensity = 0.6 + Math.sin(t * 4) * 0.3; });

    updateMissiles(dt);
    updateExplosions(dt);
  }
  loop();
})();
