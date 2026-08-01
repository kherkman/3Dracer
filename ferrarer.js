// ferrarer.js - Ferrarer 3D-automalli
(function() {
  'use strict';

  window.CAR_MODELS = window.CAR_MODELS || {};

  window.CAR_MODELS['ferrarer'] = function(bodyColorHex, accentColorHex, carTexUrl) {
    var carGroup = new THREE.Group();

    var bodyHex = bodyColorHex || 0xd40000; // Ferrari Rosso Corsa
    var accentHex = accentColorHex || 0x111115; // Hiilikuitu / Katto-musta

    var baseCol = new THREE.Color(bodyHex);
    if (typeof window.texturesEnabled !== 'undefined' && window.texturesEnabled && carTexUrl) {
      baseCol.lerp(new THREE.Color(0xffffff), 0.35);
    }

    // ---------------------------------------------------------
    // MATERIAALIT
    // ---------------------------------------------------------
    var bodyMat = new THREE.MeshPhysicalMaterial({
      color: baseCol,
      roughness: 0.12,
      metalness: 0.35,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02,
      reflectivity: 0.95
    });

    if (typeof window.texturesEnabled !== 'undefined' && window.texturesEnabled && carTexUrl && typeof window.loadTextureWithFallback === 'function') {
      var carTex = window.loadTextureWithFallback(carTexUrl, 1, 1, bodyHex, 'AUTOTEX');
      if (carTex) bodyMat.map = carTex;
    }

    var roofCarbonMat = new THREE.MeshStandardMaterial({ color: 0x111115, roughness: 0.25, metalness: 0.8 });
    var carbonMat = new THREE.MeshStandardMaterial({ color: accentHex, roughness: 0.3, metalness: 0.85 });
    var glassMat = new THREE.MeshPhysicalMaterial({ color: 0x060a12, roughness: 0.05, metalness: 0.9, transmission: 0.85, transparent: true, opacity: 0.88 });
    
    var engineRedMat = new THREE.MeshStandardMaterial({ color: 0xcc1111, roughness: 0.35, metalness: 0.4 });
    var engineMetalMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.2, metalness: 0.9 });
    var yellowCaliperMat = new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.25, metalness: 0.5 }); // Giallo Yellow
    
    // Syvänmustat renkaat ja vanteet
    var tireMat = new THREE.MeshStandardMaterial({ color: 0x020202, roughness: 0.9 });
    var blackRimMat = new THREE.MeshStandardMaterial({ color: 0x050505, metalness: 0.95, roughness: 0.1 });

    var headLightMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 4.5 });
    var tailLightMat = new THREE.MeshStandardMaterial({ color: 0xff0022, emissive: 0xff0022, emissiveIntensity: 4.5 });

    var sides = [-1, 1];

    // ---------------------------------------------------------
    // A. RUNKO
    // ---------------------------------------------------------
    var bodyBase = new THREE.Group();

    var tubGeo = new THREE.BoxGeometry(1.36, 0.32, 2.7);
    tubGeo.translate(0, 0.30, -0.3);
    var tubMesh = new THREE.Mesh(tubGeo, bodyMat);
    tubMesh.castShadow = true;
    bodyBase.add(tubMesh);

    for (var sIdx = 0; sIdx < sides.length; sIdx++) {
      var side = sides[sIdx];
      var haunchGeo = new THREE.BoxGeometry(0.28, 0.38, 1.8);
      var haunch = new THREE.Mesh(haunchGeo, bodyMat);
      haunch.position.set(side * 0.76, 0.38, -0.6);
      haunch.castShadow = true;
      bodyBase.add(haunch);
    }

    // ---------------------------------------------------------
    // B. VIRTAVIIVAINEN V-MALLINEN NOKKA
    // ---------------------------------------------------------
    var frontNoseGroup = new THREE.Group();

    var vNoseShape = new THREE.Shape();
    vNoseShape.moveTo(-0.64, 0);                    
    vNoseShape.lineTo(0.64, 0);                     
    vNoseShape.quadraticCurveTo(0.55, 0.9, 0.35, 1.5); 
    vNoseShape.lineTo(0, 2.05);                     
    vNoseShape.lineTo(-0.35, 1.5);                  
    vNoseShape.quadraticCurveTo(-0.55, 0.9, -0.64, 0);
    vNoseShape.closePath();

    var vNoseGeo = new THREE.ExtrudeGeometry(vNoseShape, { depth: 0.10, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.05, bevelSegments: 8 });
    vNoseGeo.rotateX(Math.PI / 2);
    var vNoseMesh = new THREE.Mesh(vNoseGeo, bodyMat);
    vNoseMesh.position.set(0, 0.52, 0.38);
    vNoseMesh.rotation.x = 0.08;
    vNoseMesh.castShadow = true;
    frontNoseGroup.add(vNoseMesh);

    var vSpineShape = new THREE.Shape();
    vSpineShape.moveTo(-0.03, 0);
    vSpineShape.lineTo(0.03, 0);
    vSpineShape.lineTo(0, 1.95);
    vSpineShape.closePath();

    var vSpineGeo = new THREE.ExtrudeGeometry(vSpineShape, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02 });
    vSpineGeo.rotateX(Math.PI / 2);
    var vSpine = new THREE.Mesh(vSpineGeo, bodyMat);
    vSpine.position.set(0, 0.55, 0.38);
    vSpine.rotation.x = 0.08;
    frontNoseGroup.add(vSpine);

    var vSplitterShape = new THREE.Shape();
    vSplitterShape.moveTo(-0.88, 0);
    vSplitterShape.lineTo(0.88, 0);
    vSplitterShape.quadraticCurveTo(0.50, 0.45, 0, 0.65); 
    vSplitterShape.quadraticCurveTo(-0.50, 0.45, -0.88, 0);
    vSplitterShape.closePath();

    var vSplitterGeo = new THREE.ExtrudeGeometry(vSplitterShape, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015 });
    vSplitterGeo.rotateX(Math.PI / 2);
    var vSplitter = new THREE.Mesh(vSplitterGeo, carbonMat);
    vSplitter.position.set(0, 0.16, 1.72);
    vSplitter.castShadow = true;
    frontNoseGroup.add(vSplitter);

    bodyBase.add(frontNoseGroup);

    // ---------------------------------------------------------
    // C. AJOVALOT
    // ---------------------------------------------------------
    for (var sIdx = 0; sIdx < sides.length; sIdx++) {
      var side = sides[sIdx];
      var headGroup = new THREE.Group();
      headGroup.position.set(side * 0.48, 0.53, 1.48);
      headGroup.rotation.x = 0.20;
      headGroup.rotation.y = side * -0.22;

      var housingGeo = new THREE.BoxGeometry(0.08, 0.05, 0.42);
      var housing = new THREE.Mesh(housingGeo, carbonMat);
      headGroup.add(housing);

      var ledStripGeo = new THREE.BoxGeometry(0.03, 0.04, 0.38);
      var ledStrip = new THREE.Mesh(ledStripGeo, headLightMat);
      ledStrip.position.set(0, 0.02, 0);
      headGroup.add(ledStrip);

      var headLensGeo = new THREE.BoxGeometry(0.09, 0.04, 0.44);
      var headLens = new THREE.Mesh(headLensGeo, glassMat);
      headLens.position.set(0, 0.02, 0);
      headGroup.add(headLens);

      bodyBase.add(headGroup);
    }

    // ---------------------------------------------------------
    // D. OHJAAMO, TUULILASI, KATTO & C-PILARIT
    // ---------------------------------------------------------
    var cabinGroup = new THREE.Group();

    // Tuulilasi
    var winshieldGeo = new THREE.BoxGeometry(1.22, 0.03, 1.10);
    var windshield = new THREE.Mesh(winshieldGeo, glassMat);
    windshield.position.set(0, 0.70, 0.10);
    windshield.rotation.y = Math.PI;
    windshield.rotation.x = 0.55;
    cabinGroup.add(windshield);

    // KATTO (Z = -0.70)
    var roofCapGeo = new THREE.BoxGeometry(1.02, 0.04, 0.85);
    var roofCap = new THREE.Mesh(roofCapGeo, roofCarbonMat);
    roofCap.position.set(0, 0.98, -0.70);
    roofCap.rotation.x = -0.05;
    roofCap.castShadow = true;
    cabinGroup.add(roofCap);

    // SIVULASIT
    for (var sIdx = 0; sIdx < sides.length; sIdx++) {
      var side = sides[sIdx];
      var sideWindowShape = new THREE.Shape();
      sideWindowShape.moveTo(-0.55, 0.45);
      sideWindowShape.lineTo(0.35, 0.98);
      sideWindowShape.lineTo(0.70, 0.98);
      sideWindowShape.lineTo(0.80, 0.52);
      sideWindowShape.closePath();

      var sideWinGeo = new THREE.ExtrudeGeometry(sideWindowShape, { depth: 0.02, bevelEnabled: false });
      sideWinGeo.rotateY(Math.PI / 2);

      var sideWin = new THREE.Mesh(sideWinGeo, glassMat);
      sideWin.position.set(side > 0 ? 0.58 : -0.60, 0, 0);
      sideWin.rotation.z = side * 0.12;
      cabinGroup.add(sideWin);
    }

    // C-Pilarit (Pidennetty yltämään aina auton takaosaan asti)
    for (var sIdx = 0; sIdx < sides.length; sIdx++) {
      var side = sides[sIdx];
      var buttressGeo = new THREE.BoxGeometry(0.06, 0.20, 1.25);
      var buttress = new THREE.Mesh(buttressGeo, bodyMat);
      buttress.position.set(side * 0.48, 0.65, -1.32);
      buttress.rotation.x = -0.36;
      buttress.rotation.y = side * -0.08;
      buttress.castShadow = true;
      cabinGroup.add(buttress);
    }

    bodyBase.add(cabinGroup);

    // ---------------------------------------------------------
    // E. LASINEN TAKAMOOTTORINKANSI & V12 MOOTTORI
    // ---------------------------------------------------------
    var engineGlassGeo = new THREE.BoxGeometry(0.72, 0.03, 0.95);
    var engineGlass = new THREE.Mesh(engineGlassGeo, glassMat);
    engineGlass.position.set(0, 0.76, -1.30);
    engineGlass.rotation.x = -0.32;
    bodyBase.add(engineGlass);

    // V12 Punaiset imusarjat
    var manifoldSides = [-0.15, 0.15];
    for (var mIdx = 0; mIdx < manifoldSides.length; mIdx++) {
      var side = manifoldSides[mIdx];
      var manifoldGeo = new THREE.BoxGeometry(0.16, 0.12, 0.65);
      var manifold = new THREE.Mesh(manifoldGeo, engineRedMat);
      manifold.position.set(side, 0.48, -1.20);
      bodyBase.add(manifold);

      var trimGeo = new THREE.BoxGeometry(0.04, 0.13, 0.60);
      var trim = new THREE.Mesh(trimGeo, engineMetalMat);
      trim.position.set(side, 0.49, -1.20);
      bodyBase.add(trim);
    }

    // ---------------------------------------------------------
    // F. SIVUHELMAT & TAKAOSA
    // ---------------------------------------------------------
    for (var sIdx = 0; sIdx < sides.length; sIdx++) {
      var side = sides[sIdx];
      var scoopGeo = new THREE.BoxGeometry(0.14, 0.22, 0.60);
      var scoop = new THREE.Mesh(scoopGeo, carbonMat);
      scoop.position.set(side * 0.72, 0.36, -0.35);
      scoop.rotation.y = side * -0.15;
      bodyBase.add(scoop);

      var skirtGeo = new THREE.BoxGeometry(0.12, 0.06, 2.3);
      var skirt = new THREE.Mesh(skirtGeo, carbonMat);
      skirt.position.set(side * 0.78, 0.15, 0);
      bodyBase.add(skirt);
    }

    var rearGroup = new THREE.Group();

    var rearWallGeo = new THREE.BoxGeometry(1.58, 0.36, 0.12);
    var rearWall = new THREE.Mesh(rearWallGeo, bodyMat);
    rearWall.position.set(0, 0.42, -1.90);
    rearGroup.add(rearWall);

    // Pyöreät Takavalot
    var tailPositions = [-0.55, 0.55];
    for (var i = 0; i < tailPositions.length; i++) {
      var tHousingGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.06, 20);
      tHousingGeo.rotateX(Math.PI / 2);
      var tHousing = new THREE.Mesh(tHousingGeo, carbonMat);
      tHousing.position.set(tailPositions[i], 0.48, -1.94);
      rearGroup.add(tHousing);

      var tRingGeo = new THREE.TorusGeometry(0.08, 0.02, 12, 24);
      var tRing = new THREE.Mesh(tRingGeo, tailLightMat);
      tRing.position.set(tailPositions[i], 0.48, -1.97);
      rearGroup.add(tRing);
    }

    // Nelois-pakoputket
    var pipeXPositions = [-0.22, -0.10, 0.10, 0.22];
    for (var pIdx = 0; pIdx < pipeXPositions.length; pIdx++) {
      var exX = pipeXPositions[pIdx];
      var pipeGeo = new THREE.CylinderGeometry(0.038, 0.038, 0.14, 16);
      pipeGeo.rotateX(Math.PI / 2);
      var pipe = new THREE.Mesh(pipeGeo, engineMetalMat);
      pipe.position.set(exX, 0.34, -1.96);
      rearGroup.add(pipe);
    }

    // Takadiffuusori & Sadevalo
    var diffGeo = new THREE.BoxGeometry(1.62, 0.16, 0.42);
    var diff = new THREE.Mesh(diffGeo, carbonMat);
    diff.position.set(0, 0.20, -1.90);
    diff.rotation.x = -0.10;
    rearGroup.add(diff);

    var rainLightGeo = new THREE.BoxGeometry(0.10, 0.08, 0.04);
    var rainLight = new THREE.Mesh(rainLightGeo, tailLightMat);
    rainLight.position.set(0, 0.18, -1.97);
    rearGroup.add(rainLight);

    // TAKASPOILERI
    var spoilerGeo = new THREE.BoxGeometry(1.65, 0.04, 0.32);
    var spoilerMesh = new THREE.Mesh(spoilerGeo, carbonMat);
    spoilerMesh.position.set(0, 0.88, -1.88);
    spoilerMesh.rotation.x = -0.04;
    spoilerMesh.castShadow = true;

    var postSides = [-0.42, 0.42];
    for (var psIdx = 0; psIdx < postSides.length; psIdx++) {
      var side = postSides[psIdx];
      var postGeo = new THREE.BoxGeometry(0.04, 0.32, 0.15);
      var post = new THREE.Mesh(postGeo, carbonMat);
      post.position.set(side, 0.72, -1.85);
      post.rotation.x = -0.15;
      rearGroup.add(post);
    }

    var endplateSides = [-0.83, 0.83];
    for (var epIdx = 0; epIdx < endplateSides.length; epIdx++) {
      var side = endplateSides[epIdx];
      var endplateGeo = new THREE.BoxGeometry(0.03, 0.18, 0.36);
      var endplate = new THREE.Mesh(endplateGeo, carbonMat);
      endplate.position.set(side, 0.88, -1.88);
      rearGroup.add(endplate);
    }

    rearGroup.add(spoilerMesh);

    bodyBase.add(rearGroup);
    carGroup.add(bodyBase);

    // ---------------------------------------------------------
    // G. YÖVALOT (Spotlights)
    // ---------------------------------------------------------
    var spot1 = new THREE.SpotLight(0xffffff, 2.8, 48, Math.PI / 6, 0.4);
    spot1.position.set(-0.48, 0.53, 1.50);
    spot1.target.position.set(-0.48, 0.1, 15);
    spot1.visible = (typeof currentTimeOfDay !== 'undefined' && currentTimeOfDay === 'yo');
    carGroup.add(spot1); carGroup.add(spot1.target);

    var spot2 = new THREE.SpotLight(0xffffff, 2.8, 48, Math.PI / 6, 0.4);
    spot2.position.set(0.48, 0.53, 1.50);
    spot2.target.position.set(0.48, 0.1, 15);
    spot2.visible = (typeof currentTimeOfDay !== 'undefined' && currentTimeOfDay === 'yo');
    carGroup.add(spot2); carGroup.add(spot2.target);

    carGroup.userData.headlight1 = spot1;
    carGroup.userData.headlight2 = spot2;

    // ---------------------------------------------------------
    // H. MUSTAT RENKAAT JA VANTEET
    // ---------------------------------------------------------
    function createFerrariWheel(isRear) {
      var wheelGroup = new THREE.Group();
      var radius = isRear ? 0.38 : 0.35;
      var width = isRear ? 0.32 : 0.28;

      var tireGeo = new THREE.CylinderGeometry(radius, radius, width, 32);
      tireGeo.rotateZ(Math.PI / 2);
      var tire = new THREE.Mesh(tireGeo, tireMat);
      tire.castShadow = true;
      wheelGroup.add(tire);

      var rimLipGeo = new THREE.TorusGeometry(radius * 0.72, 0.02, 12, 32);
      rimLipGeo.rotateY(Math.PI / 2);
      var rimLip = new THREE.Mesh(rimLipGeo, blackRimMat);
      rimLip.position.x = width * 0.42;
      wheelGroup.add(rimLip);

      for (var s = 0; s < 10; s++) {
        var spokeGeo = new THREE.BoxGeometry(0.022, radius * 0.70, 0.025);
        var spoke = new THREE.Mesh(spokeGeo, blackRimMat);
        spoke.position.x = width * 0.40;
        spoke.rotation.x = (Math.PI * 2 / 10) * s;
        wheelGroup.add(spoke);
      }

      var centerCapGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.02, 16);
      centerCapGeo.rotateZ(Math.PI / 2);
      var centerCap = new THREE.Mesh(centerCapGeo, blackRimMat);
      centerCap.position.x = width * 0.43;
      wheelGroup.add(centerCap);

      var caliperGeo = new THREE.BoxGeometry(0.06, radius * 0.45, 0.11);
      var caliper = new THREE.Mesh(caliperGeo, yellowCaliperMat);
      caliper.position.set(width * 0.15, radius * 0.38, 0);
      wheelGroup.add(caliper);

      return wheelGroup;
    }

    var wheelPos = [
      [-0.78, 0.35, 1.25, false], [0.78, 0.35, 1.25, false],
      [-0.80, 0.38, -1.25, true], [0.80, 0.38, -1.25, true]
    ];

    for (var i = 0; i < 4; i++) {
      var wh = createFerrariWheel(wheelPos[i][3]);
      wh.position.set(wheelPos[i][0], wheelPos[i][1], wheelPos[i][2]);
      if (wheelPos[i][0] > 0) wh.rotation.y = Math.PI;
      carGroup.add(wh);
    }

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
