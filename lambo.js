// lambo.js - Lambo-automallin 3D-määritelmä (korjattu versio)
(function() {
  window.CAR_MODELS = window.CAR_MODELS || {};

  window.CAR_MODELS['lambo'] = function(bodyColorHex, accentColorHex, carTexUrl) {
    var carGroup = new THREE.Group();

    // Korimateriaali (kiiltävä superauto)
    var bodyMat = new THREE.MeshStandardMaterial({
      color: bodyColorHex,
      roughness: 0.15,
      metalness: 0.5
    });

    if (typeof texturesEnabled !== 'undefined' && texturesEnabled && carTexUrl && typeof loadTextureWithFallback === 'function') {
      var carTex = loadTextureWithFallback(carTexUrl, 1, 1, bodyColorHex, 'AUTOTEX');
      if (carTex) bodyMat.map = carTex;
    }

    var accentMat = new THREE.MeshStandardMaterial({ color: accentColorHex || 0x111111, roughness: 0.2, metalness: 0.8 });

    // --- Korin muotoilu (Kiilamainen profiili) ---
    // Alarunko (Mitoitettu renkaiden väliin sopivaksi)
    var bodyGeo = new THREE.BoxGeometry(1.58, 0.35, 3.6);
    bodyGeo.translate(0, 0.32, 0);
    var bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.castShadow = true;
    carGroup.add(bodyMesh);

    // Terävä kiilakeula (muotoiltu ilman renkaisiin osumista)
    var noseGeo = new THREE.BoxGeometry(1.48, 0.22, 1.1);
    var pos = noseGeo.attributes.position;
    for (var i = 0; i < pos.count; i++) {
      if (pos.getZ(i) > 0) { // etuosa
        pos.setY(i, pos.getY(i) - 0.08); // matalampi kärki
        pos.setX(i, pos.getX(i) * 0.68);  // kapeneva kärki
      }
    }
    noseGeo.computeVertexNormals();
    noseGeo.translate(0, 0.33, 1.6);
    var noseMesh = new THREE.Mesh(noseGeo, bodyMat);
    noseMesh.castShadow = true;
    carGroup.add(noseMesh);

    // Terävä, matala ohjaamo
    var cabinGeo = new THREE.CylinderGeometry(0.48, 0.82, 0.45, 4);
    cabinGeo.rotateY(Math.PI / 4);
    cabinGeo.scale(1.25, 1.0, 1.75);
    cabinGeo.translate(0, 0.65, -0.2);
    var cabinMat = new THREE.MeshStandardMaterial({ color: 0x050608, roughness: 0.05, metalness: 0.9 });
    var cabinMesh = new THREE.Mesh(cabinGeo, cabinMat);
    cabinMesh.castShadow = true;
    carGroup.add(cabinMesh);

    // Kookas GT-takasiipi
    var wingGeo = new THREE.BoxGeometry(1.75, 0.06, 0.4);
    wingGeo.translate(0, 0.92, -1.68);
    var wingMesh = new THREE.Mesh(wingGeo, accentMat);
    wingMesh.castShadow = true;

    var post1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.3, 0.15), accentMat);
    post1.position.set(-0.6, 0.76, -1.68);
    var post2 = post1.clone(); post2.position.x = 0.6;
    carGroup.add(wingMesh); carGroup.add(post1); carGroup.add(post2);

    // Renkaat
    var wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.26, 16);
    wheelGeo.rotateZ(Math.PI / 2);
    var wheelMat = new THREE.MeshStandardMaterial({ color: 0x111113, roughness: 0.6 });
    var wheelPos = [
      [-0.92, 0.32, 1.1], [0.92, 0.32, 1.1],
      [-0.92, 0.32, -1.1], [0.92, 0.32, -1.1]
    ];
    for (var i = 0; i < 4; i++) {
      var wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.position.set(wheelPos[i][0], wheelPos[i][1], wheelPos[i][2]);
      wheel.castShadow = true;
      carGroup.add(wheel);
    }

    // Terävät LED-ajovalot
    var headLightMat = new THREE.MeshBasicMaterial({ color: 0xefffcc });
    var hl1 = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.05, 0.12), headLightMat);
    hl1.rotation.y = -0.2;
    hl1.position.set(-0.52, 0.38, 1.72);
    var hl2 = hl1.clone();
    hl2.rotation.y = 0.2;
    hl2.position.x = 0.52;
    carGroup.add(hl1); carGroup.add(hl2);

    // Yövalot
    var spot1 = new THREE.SpotLight(0xfff5cc, 2.8, 50, Math.PI / 6, 0.4);
    spot1.position.set(-0.52, 0.38, 1.75);
    spot1.target.position.set(-0.52, 0.1, 15);
    spot1.visible = (typeof currentTimeOfDay !== 'undefined' && currentTimeOfDay === 'yo');
    carGroup.add(spot1); carGroup.add(spot1.target);

    var spot2 = new THREE.SpotLight(0xfff5cc, 2.8, 50, Math.PI / 6, 0.4);
    spot2.position.set(0.52, 0.38, 1.75);
    spot2.target.position.set(0.52, 0.1, 15);
    spot2.visible = (typeof currentTimeOfDay !== 'undefined' && currentTimeOfDay === 'yo');
    carGroup.add(spot2); carGroup.add(spot2.target);

    carGroup.userData.headlight1 = spot1;
    carGroup.userData.headlight2 = spot2;

    // Takanpään LED-valot
    var tailLightMat = new THREE.MeshBasicMaterial({ color: 0xff0033 });
    var tl1 = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.06, 0.05), tailLightMat);
    tl1.position.set(-0.5, 0.48, -1.81);
    var tl2 = tl1.clone(); tl2.position.x = 0.5;
    carGroup.add(tl1); carGroup.add(tl2);

    return carGroup;
  };
})();