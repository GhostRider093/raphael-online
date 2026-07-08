// ==========================================================================
//  WARGUN  -  perso pilotable (mode "wargun")
// --------------------------------------------------------------------------
//  Fichier dedie au perso "wargun" (meme modele d'avion que le chasseur).
//  Rendu : finition METAL MILITAIRE (gris anthracite metallique), pas de
//  texture.
//
//  Dependances (scope global) : THREE, loadTexturedChasseurObject, player,
//  fitStlToPlayer(), hasRenderableMesh(), removePlayerPlaceholder().
// ==========================================================================

let wargunModel = null;

function loadWargunModel() {
  if (typeof loadTexturedChasseurObject !== "function") {
    window.addEventListener("objloaderready", loadWargunModel, { once: true });
    return;
  }
  loadTexturedChasseurObject(
    obj => {
      const wrapper = new THREE.Group();
      wrapper.add(obj);
      obj.rotation.set(0, -Math.PI / 2, 0);   // orientation OBJ Meshy deja validee
      fitStlToPlayer(wrapper, 5.0);
      wargunModel = wrapper;
      player.add(wrapper);
      if (hasRenderableMesh(wrapper)) removePlayerPlaceholder();
      if (typeof addChasseurThrusters === "function") addChasseurThrusters(player, wrapper);
    },
    "wargun"
  );
}
