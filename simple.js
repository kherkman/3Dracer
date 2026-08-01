// simple.js - Simple (Perus) 3D-automalli
(function() {
  'use strict';

  window.CAR_MODELS = window.CAR_MODELS || {};

  window.CAR_MODELS['simple'] = function(bodyColorHex, accentColorHex, carTexUrl) {
    var carGroup = new THREE.Group();

    // 1. Luetaan auton väri turvallisesti (toimii myös mustalla #000000)
    var bodyHex = (bodyColorHex !== undefined && bodyColorHex !== null && bodyColorHex !== '') ? bodyColorHex : 0xd42419;
    var baseCol = new THREE.Color(bodyHex);

    // 2. Alkuperäinen tekstuuri + väri -sekoitus (lerp 0.35)
    if (typeof window.texturesEnabled !== 'undefined' && window.texturesEnabled && carTexUrl) {
      baseCol.lerp(new THREE.Color(0xffffff), 0.35);
    }

    var bodyGeo = new THREE.BoxGeometry(1.7, 0.5, 3.4);
    bodyGeo.translate(0, 0.45, 0);

    var bodyMat = new THREE.MeshStandardMaterial({
      color: baseCol,
      roughness: 0.35,
      metalness: 0.15
    });

    if (typeof window.texturesEnabled !== 'undefined' && window.texturesEnabled && carTexUrl && typeof window.loadTextureWithFallback === 'function') {
      var carTex = window.loadTextureWithFallback(carTexUrl, 2, 2, bodyHex, 'AUTOTEX');
      if (carTex) bodyMat.map = carTex;
    }

    var bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.castShadow = true;
    carGroup.add(bodyMesh);

    var cabinGeo = new THREE.BoxGeometry(1.35, 0.5, 1.6);
    cabinGeo.translate(0, 0.88, -0.1);
    var cabinMat = new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.1, metalness: 0.8 });
    var cabinMesh = new THREE.Mesh(cabinGeo, cabinMat);
    cabinMesh.castShadow = true;
    carGroup.add(cabinMesh);

    var spoilerGeo = new THREE.BoxGeometry(1.6, 0.08, 0.45);
    spoilerGeo.translate(0, 1.22, -1.5);
    var accentMat = new THREE.MeshStandardMaterial({ color: accentColorHex || 0x111111, roughness: 0.4 });
    var spoilerMesh = new THREE.Mesh(spoilerGeo, accentMat);
    spoilerMesh.castShadow = true;
    carGroup.add(spoilerMesh);

    var post1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.1), accentMat);
    post1.position.set(-0.55, 1.05, -1.5);
    var post2 = post1.clone();
    post2.position.x = 0.55;
    carGroup.add(post1);
    carGroup.add(post2);

    var wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.25, 16);
    wheelGeo.rotateZ(Math.PI / 2);
    var wheelMat = new THREE.MeshStandardMaterial({ color: 0x222225, roughness: 0.8 });
    var wheelPos = [
      [-0.85, 0.32, 1.0], [0.85, 0.32, 1.0],
      [-0.85, 0.32, -1.0], [0.85, 0.32, -1.0]
    ];
    for (var i = 0; i < 4; i++) {
      var wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.position.set(wheelPos[i][0], wheelPos[i][1], wheelPos[i][2]);
      wheel.castShadow = true;
      carGroup.add(wheel);
    }

    var headLightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    var hl1 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.1), headLightMat);
    hl1.position.set(-0.5, 0.52, 1.71);
    var hl2 = hl1.clone();
    hl2.position.x = 0.5;
    carGroup.add(hl1);
    carGroup.add(hl2);

    var spot1 = new THREE.SpotLight(0xfff5cc, 2.5, 45, Math.PI / 6, 0.4);
    spot1.position.set(-0.5, 0.52, 1.75);
    spot1.target.position.set(-0.5, 0.1, 15);
    spot1.visible = (typeof currentTimeOfDay !== 'undefined' && currentTimeOfDay === 'yo');
    carGroup.add(spot1);
    carGroup.add(spot1.target);

    var spot2 = new THREE.SpotLight(0xfff5cc, 2.5, 45, Math.PI / 6, 0.4);
    spot2.position.set(0.5, 0.52, 1.75);
    spot2.target.position.set(0.5, 0.1, 15);
    spot2.visible = (typeof currentTimeOfDay !== 'undefined' && currentTimeOfDay === 'yo');
    carGroup.add(spot2);
    carGroup.add(spot2.target);

    carGroup.userData.headlight1 = spot1;
    carGroup.userData.headlight2 = spot2;

    var tailLightMat = new THREE.MeshBasicMaterial({ color: 0xff1100 });
    var tl1 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.1), tailLightMat);
    tl1.position.set(-0.5, 0.55, -1.71);
    var tl2 = tl1.clone();
    tl2.position.x = 0.5;
    carGroup.add(tl1);
    carGroup.add(tl2);

    // Kiihdytyshohto
    var glowGeo = new THREE.BoxGeometry(1.95, 0.85, 3.8);
    var glowMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff, transparent: true, opacity: 0.0, side: THREE.BackSide
    });
    var glowMesh = new THREE.Mesh(glowGeo, glowMat);
    glowMesh.position.set(0, 0.5, 0);
    carGroup.add(glowMesh);
    carGroup.userData.glowMesh = glowMesh;

    return carGroup;
  };
})();