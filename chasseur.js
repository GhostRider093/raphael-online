// ==========================================================================
//  CHASSEUR  -  avion de chasse pilotable (mode "chasseur")
// --------------------------------------------------------------------------
//  Fichier dedie au perso "chasseur".
//  Rendu : finition METAL MILITAIRE (gris anthracite metallique), pas de
//  texture (l'atlas Meshy etait du bruit colore).
//  La physique de vol (FLIGHT_*, updateFlight, HUD) reste dans rzphzel.js.
//
//  Dependances (scope global) : THREE, window.STLLoader, player,
//  fitStlToPlayer(), hasRenderableMesh(), removePlayerPlaceholder().
// ==========================================================================

const CHASSEUR_MODEL_PATH = "./perso/chasseur2.stl?v=stl-20260708";
let chasseurModel = null;

function chasseurMetalMaterial(geometry) {
  const hasVertexColors = !!(geometry && geometry.hasColors && geometry.getAttribute && geometry.getAttribute("color"));
  return new THREE.MeshStandardMaterial({
    color: hasVertexColors ? 0xffffff : 0x3a4147,
    vertexColors: hasVertexColors,
    transparent: hasVertexColors && geometry.alpha < 1,
    opacity: hasVertexColors ? (geometry.alpha || 1) : 1,
    roughness: 0.55,
    metalness: 0.35,
    side: THREE.DoubleSide
  });
}

function loadChasseurModel() {
  if (!window.STLLoader) {
    window.addEventListener("stlloaderready", loadChasseurModel, { once: true });
    return;
  }
  new window.STLLoader().load(
    CHASSEUR_MODEL_PATH,
    geometry => {
      geometry.computeVertexNormals();
      const mesh = new THREE.Mesh(geometry, chasseurMetalMaterial(geometry));
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;

      const wrapper = new THREE.Group();
      wrapper.add(mesh);
      mesh.rotation.set(-Math.PI / 2, 0, 0);  // Z STL = hauteur, nez vers l'avant (-Z)
      fitStlToPlayer(wrapper, 5.0);
      chasseurModel = wrapper;
      player.add(wrapper);
      if (hasRenderableMesh(wrapper)) removePlayerPlaceholder();
      addChasseurThrusters(player, wrapper);
      console.log("[chasseur] STL charge", geometry.hasColors ? "(couleurs STL)" : "(finition metal militaire)");
    },
    undefined,
    error => console.error("[chasseur] ECHEC chargement STL :", error)
  );
}

// ── REACTEURS / TUYERES ──────────────────────────────────────────────────
let chasseurThrusters = null;
let chasseurThrusterLoopOn = false;

function makeChasseurThruster(len, rad) {
  const g = new THREE.Group();
  const nozzle = new THREE.Mesh(
    new THREE.TorusGeometry(rad * 1.05, rad * 0.14, 10, 24),
    new THREE.MeshStandardMaterial({ color: 0x14181c, roughness: 0.42, metalness: 0.7 })
  );
  g.add(nozzle);
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
  const len = size.z * 0.20;
  const rad = Math.max(0.06, size.x * 0.04);
  const spread = size.x * 0.15;
  const y = center.y - size.y * 0.05;
  const group = new THREE.Group();
  [-spread, spread].forEach(dx => {
    const t = makeChasseurThruster(len, rad);
    t.position.copy(player.worldToLocal(new THREE.Vector3(center.x + dx, y, rearZ - size.z * 0.005)));
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
