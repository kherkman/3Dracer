// pontiacer.js - Pontiacer-automallin 3D-määritelmä
(function() {
  window.CAR_MODELS = window.CAR_MODELS || {};

  window.CAR_MODELS['pontiacer'] = function(bodyColorHex, accentColorHex, carTexUrl) {
    var carGroup = new THREE.Group();

    // Korimateriaali
    var bodyMat = new THREE.MeshStandardMaterial({
      color: bodyColorHex,
      roughness: 0.35,
      metalness: 0.25
    });

    if (typeof texturesEnabled !== 'undefined' && texturesEnabled && carTexUrl && typeof loadTextureWithFallback === 'function') {
      var carTex = loadTextureWithFallback(carTexUrl, 1, 1, bodyColorHex, 'AUTOTEX');
      if (carTex) bodyMat.map = carTex;
    }

    var accentMat = new THREE.MeshStandardMaterial({ color: accentColorHex || 0x111111, roughness: 0.5 });

    // --- Korin muotoilu (Muscle car: pitkä nokka, kulmikas taka-osa) ---
    // Pääkori
    var bodyGeo = new THREE.BoxGeometry(1.85, 0.48, 3.8);
    bodyGeo.translate(0, 0.42, 0);
    var bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.castShadow = true;
    carGroup.add(bodyMesh);

    // Konepellin skuuppi (Hood scoop)
    var scoopGeo = new THREE.BoxGeometry(0.45, 0.1, 0.7);
    scoopGeo.translate(0, 0.68, 0.8);
    var scoopMesh = new THREE.Mesh(scoopGeo, accentMat);
    carGroup.add(scoopMesh);

    // Kulmikas ohjaamo
    var cabinGeo = new THREE.BoxGeometry(1.4, 0.48, 1.7);
    cabinGeo.translate(0, 0.88, -0.3);
    var cabinMat = new THREE.MeshStandardMaterial({ color: 0x111216, roughness: 0.1, metalness: 0.7 });
    var cabinMesh = new THREE.Mesh(cabinGeo, cabinMat);
    cabinMesh.castShadow = true;
    carGroup.add(cabinMesh);

    // Takasiipi (Ducktail/Spoileri)
    var spoilerGeo = new THREE.BoxGeometry(1.8, 0.12, 0.35);
    spoilerGeo.translate(0, 0.72, -1.82);
    var spoilerMesh = new THREE.Mesh(spoilerGeo, accentMat);
    spoilerMesh.castShadow = true;
    carGroup.add(spoilerMesh);

    // Leveät renkaat
    var wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.28, 16);
    wheelGeo.rotateZ(Math.PI / 2);
    var wheelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1c, roughness: 0.8 });
    var wheelPos = [
      [-0.92, 0.34, 1.15], [0.92, 0.34, 1.15],
      [-0.92, 0.34, -1.15], [0.92, 0.34, -1.15]
    ];
    for (var i = 0; i < 4; i++) {
      var wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.position.set(wheelPos[i][0], wheelPos[i][1], wheelPos[i][2]);
      wheel.castShadow = true;
      carGroup.add(wheel);
    }

    // Keulamaski ja tupla-ajovalot
    var grilleGeo = new THREE.BoxGeometry(1.6, 0.18, 0.08);
    grilleGeo.translate(0, 0.46, 1.88);
    var grilleMesh = new THREE.Mesh(grilleGeo, accentMat);
    carGroup.add(grilleMesh);

    var headLightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    var hl1 = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 0.05), headLightMat);
    hl1.position.set(-0.55, 0.46, 1.91);
    var hl2 = hl1.clone(); hl2.position.x = 0.55;
    carGroup.add(hl1); carGroup.add(hl2);

    // Yövalot
    var spot1 = new THREE.SpotLight(0xfff5cc, 2.5, 45, Math.PI / 6, 0.4);
    spot1.position.set(-0.55, 0.46, 1.93);
    spot1.target.position.set(-0.55, 0.1, 15);
    spot1.visible = (typeof currentTimeOfDay !== 'undefined' && currentTimeOfDay === 'yo');
    carGroup.add(spot1); carGroup.add(spot1.target);

    var spot2 = new THREE.SpotLight(0xfff5cc, 2.5, 45, Math.PI / 6, 0.4);
    spot2.position.set(0.55, 0.46, 1.93);
    spot2.target.position.set(0.55, 0.1, 15);
    spot2.visible = (typeof currentTimeOfDay !== 'undefined' && currentTimeOfDay === 'yo');
    carGroup.add(spot2); carGroup.add(spot2.target);

    carGroup.userData.headlight1 = spot1;
    carGroup.userData.headlight2 = spot2;

    // Yhtenäinen takavalo-palkki
    var tailLightMat = new THREE.MeshBasicMaterial({ color: 0xcc0000 });
    var tailBar = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.09, 0.06), tailLightMat);
    tailBar.position.set(0, 0.52, -1.91);
    carGroup.add(tailBar);

    return carGroup;
  };
})();