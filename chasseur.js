// ==========================================================================
//  CHASSEUR  -  avion de chasse pilotable (mode "chasseur")
// --------------------------------------------------------------------------
//  Fichier dedie au perso "chasseur".
//  Rendu : finition METAL MILITAIRE (gris anthracite metallique), pas de
//  texture (l'atlas Meshy etait du bruit colore).
//  La physique de vol (FLIGHT_*, updateFlight, HUD) reste dans rzphzel.js.
//
//  Dependances (scope global) : THREE, window.OBJLoader, player,
//  fitStlToPlayer(), hasRenderableMesh(), removePlayerPlaceholder().
// ==========================================================================

const CHASSEUR_MODEL_PATH = "./perso/chasseur.obj?v=obj-20260609fix";
let chasseurModel = null;

function chasseurMetalMaterial() {
  return new THREE.MeshStandardMaterial({
    color: 0x3a4147,     // gunmetal SOMBRE : ne peut pas cramer en blanc sous la lumiere
    roughness: 0.55,
    metalness: 0.35
  });
}

function loadChasseurModel() {
  if (!window.OBJLoader) {
    window.addEventListener("objloaderready", loadChasseurModel, { once: true });
    return;
  }
  new window.OBJLoader().load(
    CHASSEUR_MODEL_PATH,
    obj => {
      obj.traverse(node => {
        if (!node.isMesh) return;
        node.castShadow = true;
        node.receiveShadow = true;
        node.frustumCulled = false;
        node.material = chasseurMetalMaterial();
      });
      const wrapper = new THREE.Group();
      wrapper.add(obj);
      obj.rotation.set(0, -Math.PI / 2, 0);   // a plat, nez vers l'avant (-Z), ailes horizontales
      fitStlToPlayer(wrapper, 5.0);
      chasseurModel = wrapper;
      player.add(wrapper);
      if (hasRenderableMesh(wrapper)) removePlayerPlaceholder();
      addChasseurThrusters(player, wrapper);
      console.log("[chasseur] OBJ charge (finition metal militaire)");
    },
    undefined,
    error => console.error("[chasseur] ECHEC chargement OBJ :", error)
  );
}

// ── REACTEURS / TUYERES ──────────────────────────────────────────────────
let chasseurThrusters = null;
let chasseurThrusterLoopOn = false;

function makeChasseurThruster(len, rad) {
  const g = new THREE.Group();
  const cone = (r, h, color, op) => {
    const m = new THREE.Mesh(
      new THREE.ConeGeometry(r, h, 18, 1, true),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
    );
    m.rotation.x = -Math.PI / 2;   // apex vers +Z = vers l'arriere
    m.position.z = h / 2;          // base a la tuyere (origine), s'etend vers l'arriere
    return m;
  };
  g.add(cone(rad,       len,      0xff6a10, 0.5));   // halo orange
  g.add(cone(rad * 0.6, len * 0.78, 0xffae2e, 0.7)); // coeur orange
  g.add(cone(rad * 0.3, len * 0.5, 0xfff3b0, 0.95)); // coeur jaune-blanc
  return g;
}

function addChasseurThrusters(player, wrapper) {
  player.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(wrapper);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const rearZ = box.max.z;                 // nez en -Z -> arriere en +Z
  const len = size.z * 0.40, rad = size.y * 0.5;
  const spread = size.x * 0.13;
  const y = center.y - size.y * 0.05;
  const group = new THREE.Group();
  [-spread, spread].forEach(dx => {
    const t = makeChasseurThruster(len, rad);
    t.position.copy(player.worldToLocal(new THREE.Vector3(center.x + dx, y, rearZ - size.z * 0.02)));
    group.add(t);
  });
  player.add(group);
  chasseurThrusters = group;
  if (!chasseurThrusterLoopOn) { chasseurThrusterLoopOn = true; animateChasseurThrusters(); }
}

function animateChasseurThrusters() {
  requestAnimationFrame(animateChasseurThrusters);
  const g = chasseurThrusters;
  if (!g || !g.parent) return;
  const t = performance.now() * 0.001;
  let throttle = 0.45;
  if (typeof flightSpeed === "number") throttle = Math.max(0.25, Math.min(1, Math.abs(flightSpeed) / 72));
  const flick = 0.9 + Math.sin(t * 45) * 0.07 + Math.sin(t * 27) * 0.05;
  g.children.forEach(thr => {
    thr.scale.z = (0.6 + throttle * 0.8) * flick;
    thr.scale.x = thr.scale.y = 0.9 + (flick - 0.9);
  });
}
