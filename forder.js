// forder.js - Forder 3D-automalli 
(function() {
  'use strict';

  window.CAR_MODELS = window.CAR_MODELS || {};

  window.CAR_MODELS['forder'] = function(bodyColorHex, accentColorHex, carTexUrl) {
    var carGroup = new THREE.Group();

    // 1. Luetaan auton väri turvallisesti (toimii myös mustalla #000000)
    var bodyHex = (bodyColorHex !== undefined && bodyColorHex !== null && bodyColorHex !== '') ? bodyColorHex : 0x0044cc; 
    var accentHex = accentColorHex || 0x111216;

    var baseCol = new THREE.Color(bodyHex);

    // 2. Alkuperäinen tekstuuri + väri -sekoitus (lerp 0.35)
    if (typeof window.texturesEnabled !== 'undefined' && window.texturesEnabled && carTexUrl) {
      baseCol.lerp(new THREE.Color(0xffffff), 0.35);
    }

    // --- MATERIAALIT ---
    var bodyMat = new THREE.MeshPhysicalMaterial({
      color: baseCol,
      roughness: 0.15,
      metalness: 0.35,
      clearcoat: 1.0,
      clearcoatRoughness: 0.03,
      reflectivity: 0.92
    });

    if (typeof window.texturesEnabled !== 'undefined' && window.texturesEnabled && carTexUrl && typeof window.loadTextureWithFallback === 'function') {
      var carTex = window.loadTextureWithFallback(carTexUrl, 1, 1, bodyHex, 'AUTOTEX');
      if (carTex) bodyMat.map = carTex;
    }

    var carbonMat = new THREE.MeshStandardMaterial({ color: 0x141518, roughness: 0.25, metalness: 0.85 });
    var glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x080e18,
      roughness: 0.05,
      metalness: 0.9,
      transmission: 0.85,
      transparent: true,
      opacity: 0.88,
      side: THREE.DoubleSide
    });
    var chromeMat = new THREE.MeshStandardMaterial({ color: 0xd0d0d0, roughness: 0.15, metalness: 0.92 });
    var rallyRimMat = new THREE.MeshStandardMaterial({ color: 0xf0f2f5, metalness: 0.85, roughness: 0.2 });
    var tireMat = new THREE.MeshStandardMaterial({ color: 0x020202, roughness: 0.9 });
    var redCaliperMat = new THREE.MeshStandardMaterial({ color: 0xcc1111, roughness: 0.3, metalness: 0.4 });

    var headLightMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 4.5 });
    var tailLightMat = new THREE.MeshStandardMaterial({ color: 0xff0022, emissive: 0xff0022, emissiveIntensity: 4.5 });

    var bodyBase = new THREE.Group();

    // ---------------------------------------------------------
    // A. HATCHBACK-RUNKO & PYÖRISTETTY TAKALOKASUOJA
    // ---------------------------------------------------------
    var tubGeo = new THREE.BoxGeometry(1.38, 0.42, 2.1);
    tubGeo.translate(0, 0.38, -0.05);
    var tubMesh = new THREE.Mesh(tubGeo, bodyMat);
    tubMesh.castShadow = true;
    bodyBase.add(tubMesh);

    // Pyöristetty takalokasuoja
    for (let side of [-1, 1]) {
      var rFenderGeo = new THREE.SphereGeometry(0.38, 20, 16);
      rFenderGeo.scale(0.32, 0.80, 1.15);
      var rFender = new THREE.Mesh(rFenderGeo, bodyMat);
      rFender.position.set(side * 0.60, 0.38, -0.85);
      rFender.castShadow = true;
      bodyBase.add(rFender);

      var skirtGeo = new THREE.BoxGeometry(0.08, 0.08, 1.65);
      var skirt = new THREE.Mesh(skirtGeo, carbonMat);
      skirt.position.set(side * 0.68, 0.20, -0.05);
      bodyBase.add(skirt);
    }

    // ---------------------------------------------------------
    // B. ETUOSA & KONEPELTI
    // ---------------------------------------------------------
    var frontNoseGroup = new THREE.Group();

    var hoodShape = new THREE.Shape();
    hoodShape.moveTo(-0.64, 0);
    hoodShape.lineTo(0.64, 0);
    hoodShape.quadraticCurveTo(0.66, 0.6, 0.45, 1.10);
    hoodShape.quadraticCurveTo(0, 1.40, -0.45, 1.10);
    hoodShape.quadraticCurveTo(-0.66, 0.6, -0.64, 0);
    hoodShape.closePath();

    var hoodGeo = new THREE.ExtrudeGeometry(hoodShape, { 
      depth: 0.10, 
      bevelEnabled: true, 
      bevelThickness: 0.05, 
      bevelSize: 0.04,
      bevelSegments: 8 
    });
    hoodGeo.rotateX(Math.PI / 2);
    var hoodMesh = new THREE.Mesh(hoodGeo, bodyMat);
    hoodMesh.position.set(0, 0.64, 0.02);
    hoodMesh.rotation.x = 0.08;
    hoodMesh.castShadow = true;
    frontNoseGroup.add(hoodMesh);

    var bumperGeo = new THREE.ExtrudeGeometry(hoodShape, { 
      depth: 0.16, 
      bevelEnabled: true, 
      bevelThickness: 0.04, 
      bevelSize: 0.03,
      bevelSegments: 8 
    });
    bumperGeo.rotateX(Math.PI / 2);
    var bumperMesh = new THREE.Mesh(bumperGeo, carbonMat);
    bumperMesh.position.set(0, 0.42, 0.02);
    bumperMesh.castShadow = true;
    frontNoseGroup.add(bumperMesh);

    var bottomPlateGeo = new THREE.ExtrudeGeometry(hoodShape, { 
      depth: 0.04, 
      bevelEnabled: true, 
      bevelThickness: 0.02, 
      bevelSize: 0.02,
      bevelSegments: 8 
    });
    bottomPlateGeo.rotateX(Math.PI / 2);
    var bottomPlate = new THREE.Mesh(bottomPlateGeo, carbonMat);
    bottomPlate.position.set(0, 0.22, 0.02);
    bottomPlate.castShadow = true;
    frontNoseGroup.add(bottomPlate);

    for (let side of [-0.26, 0.26]) {
      var ventGeo = new THREE.BoxGeometry(0.18, 0.03, 0.32);
      var vent = new THREE.Mesh(ventGeo, carbonMat);
      vent.position.set(side, 0.645, 0.68);
      vent.rotation.x = 0.08;
      frontNoseGroup.add(vent);
    }

    bodyBase.add(frontNoseGroup);

    // ---------------------------------------------------------
    // C. AJOVALOT (Y = 0.58)
    // ---------------------------------------------------------
    for (let side of [-1, 1]) {
      var headGroup = new THREE.Group();
      headGroup.position.set(side * 0.37, 0.58, 1.05);
      headGroup.rotation.x = 0.18;
      headGroup.rotation.y = side * -0.22;

      var housingGeo = new THREE.SphereGeometry(0.15, 20, 16);
      housingGeo.scale(0.8, 0.45, 1.4);
      var housing = new THREE.Mesh(housingGeo, carbonMat);
      headGroup.add(housing);

      var ledStripGeo = new THREE.SphereGeometry(0.13, 16, 12);
      ledStripGeo.scale(0.7, 0.35, 1.3);
      var ledStrip = new THREE.Mesh(ledStripGeo, headLightMat);
      headGroup.add(ledStrip);

      var headLensGeo = new THREE.SphereGeometry(0.155, 20, 16);
      headLensGeo.scale(0.82, 0.47, 1.42);
      var headLens = new THREE.Mesh(headLensGeo, glassMat);
      headGroup.add(headLens);

      bodyBase.add(headGroup);
    }

    // ---------------------------------------------------------
    // D. TUULILASI & KATTO & A-PILARIT & SIVUIKKUNAT
    // ---------------------------------------------------------
    const cabinGroup = new THREE.Group();

    var wsShape = new THREE.Shape();
    wsShape.moveTo(-0.61, 0);
    wsShape.quadraticCurveTo(0, 0.12, 0.61, 0);
    wsShape.lineTo(0.56, 0.95);
    wsShape.quadraticCurveTo(0, 1.05, -0.56, 0.95);
    wsShape.closePath();

    var wsGeo = new THREE.ExtrudeGeometry(wsShape, { depth: 0.03, bevelEnabled: false });
    wsGeo.rotateX(Math.PI / 2);
    var windshield = new THREE.Mesh(wsGeo, glassMat);
    windshield.position.set(0, 0.93, -0.05);
    windshield.rotation.x = 0.48;
    cabinGroup.add(windshield);

    // A-pilarit
    for (let side of [-1, 1]) {
      var startPt = new THREE.Vector3(side * 0.60, 0.56, 0.52);
      var endPt = new THREE.Vector3(side * 0.53, 0.94, -0.28);
      
      var dir = new THREE.Vector3().subVectors(endPt, startPt);
      var len = dir.length();
      dir.normalize();

      var midPt = new THREE.Vector3().addVectors(startPt, endPt).multiplyScalar(0.5);

      var aPillarGeo = new THREE.BoxGeometry(0.045, len, 0.045);
      var aPillar = new THREE.Mesh(aPillarGeo, bodyMat);
      aPillar.position.copy(midPt);
      
      var upVec = new THREE.Vector3(0, 1, 0);
      aPillar.quaternion.setFromUnitVectors(upVec, dir);
      aPillar.castShadow = true;
      cabinGroup.add(aPillar);
    }

    var roofShape = new THREE.Shape();
    var rw = 0.52, rl = 0.42, rCorner = 0.08;
    roofShape.moveTo(-rw + rCorner, -rl);
    roofShape.lineTo(rw - rCorner, -rl);
    roofShape.quadraticCurveTo(rw, -rl, rw, -rl + rCorner);
    roofShape.lineTo(rw, rl - rCorner);
    roofShape.quadraticCurveTo(rw, rl, rw - rCorner, rl);
    roofShape.lineTo(-rw + rCorner, rl);
    roofShape.quadraticCurveTo(-rw, rl, -rw, rl - rCorner);
    roofShape.lineTo(-rw, -rl + rCorner);
    roofShape.quadraticCurveTo(-rw, -rl, -rw + rCorner, -rl);
    roofShape.closePath();

    var roofGeo = new THREE.ExtrudeGeometry(roofShape, { 
      depth: 0.02, 
      bevelEnabled: true, 
      bevelThickness: 0.08, 
      bevelSize: 0.08, 
      bevelSegments: 8 
    });
    roofGeo.rotateX(Math.PI / 2);

    roofGeo.computeVertexNormals();
    var rIndex = roofGeo.index;
    var rNorm = roofGeo.attributes.normal;
    if (rIndex && rNorm) {
      var newRoofIndices = [];
      for (var i = 0; i < rIndex.count; i += 3) {
        var a = rIndex.getX(i);
        var b = rIndex.getX(i + 1);
        var c = rIndex.getX(i + 2);
        if (rNorm.getY(a) < -0.85 && rNorm.getY(b) < -0.85 && rNorm.getY(c) < -0.85) {
          continue;
        }
        newRoofIndices.push(a, b, c);
      }
      roofGeo.setIndex(newRoofIndices);
    }

    var roof = new THREE.Mesh(roofGeo, bodyMat);
    roof.position.set(0, 0.94, -0.46);
    roof.castShadow = true;
    cabinGroup.add(roof);

    var roofScoopGeo = new THREE.BoxGeometry(0.28, 0.08, 0.32);
    var roofScoop = new THREE.Mesh(roofScoopGeo, carbonMat);
    roofScoop.position.set(0, 1.02, -0.26);
    roofScoop.rotation.x = -0.06;
    roofScoop.castShadow = true;
    cabinGroup.add(roofScoop);

    for (let side of [-1, 1]) {
      // Etu-sivuikkunat
      var sideWinShape = new THREE.Shape();
      sideWinShape.moveTo(-0.48, 0.52);
      sideWinShape.lineTo(0.25, 0.86);
      sideWinShape.lineTo(0.65, 0.86);
      sideWinShape.lineTo(0.72, 0.52);
      sideWinShape.closePath();

      var sideWinGeo = new THREE.ExtrudeGeometry(sideWinShape, { depth: 0.02, bevelEnabled: false });
      sideWinGeo.rotateY(Math.PI / 2);

      var sideWin = new THREE.Mesh(sideWinGeo, glassMat);
      sideWin.position.set(side > 0 ? 0.66 : -0.68, 0, 0.15);
      sideWin.rotation.z = side * 0.04;
      cabinGroup.add(sideWin);

      // Taka-sivuikkunat
      var rearSideWinShape = new THREE.Shape();
      rearSideWinShape.moveTo(-0.28, 0.54);
      rearSideWinShape.lineTo(-0.28, 0.86);
      rearSideWinShape.lineTo(0.25, 0.86);
      rearSideWinShape.lineTo(0.38, 0.68);
      rearSideWinShape.lineTo(0.22, 0.54);
      rearSideWinShape.closePath();

      var rearSideWinGeo = new THREE.ExtrudeGeometry(rearSideWinShape, { depth: 0.02, bevelEnabled: false });
      rearSideWinGeo.rotateY(Math.PI / 2);

      var rearSideWin = new THREE.Mesh(rearSideWinGeo, glassMat);
      rearSideWin.position.set(side > 0 ? 0.65 : -0.67, 0, -0.70);
      rearSideWin.rotation.z = side * 0.04;
      cabinGroup.add(rearSideWin);

      var mirrorGroup = new THREE.Group();
      mirrorGroup.position.set(side * 0.66, 0.70, 0.22);

      var stemGeo = new THREE.CylinderGeometry(0.015, 0.02, 0.10, 12);
      stemGeo.rotateZ(side * -Math.PI / 4);
      var stem = new THREE.Mesh(stemGeo, carbonMat);
      mirrorGroup.add(stem);

      var mirrorBodyGeo = new THREE.SphereGeometry(0.08, 16, 12);
      mirrorBodyGeo.scale(1.1, 0.65, 1.4);
      var mirrorCap = new THREE.Mesh(mirrorBodyGeo, carbonMat);
      mirrorCap.position.set(side * 0.06, 0.04, -0.02);
      mirrorGroup.add(mirrorCap);

      var mirrorGlassGeo = new THREE.PlaneGeometry(0.10, 0.07);
      var mirrorGlass = new THREE.Mesh(mirrorGlassGeo, glassMat);
      mirrorGlass.rotation.y = side * Math.PI / 2 + (side * -0.2);
      mirrorGlass.position.set(side * 0.04, 0.04, -0.08);
      mirrorGroup.add(mirrorGlass);

      cabinGroup.add(mirrorGroup);
    }

    bodyBase.add(cabinGroup);

    // ---------------------------------------------------------
    // E. TAKALUUKKU & TAKAPUSKURI & SPOILERI & TAKAIKKUNAT
    // ---------------------------------------------------------
    var rearGroup = new THREE.Group();

    var hatchBoxGeo = new THREE.BoxGeometry(1.18, 0.03, 0.48);
    var hatchDoor = new THREE.Mesh(hatchBoxGeo, bodyMat);
    hatchDoor.position.set(0, 0.71, -1.07);
    hatchDoor.rotation.x = -0.58;
    hatchDoor.castShadow = true;
    rearGroup.add(hatchDoor);

    var rearGlassGeo = new THREE.CylinderGeometry(0.50, 0.54, 0.52, 20, 1, true, -Math.PI * 0.35, Math.PI * 0.70);
    rearGlassGeo.rotateX(Math.PI / 2.2);
    var rearGlass = new THREE.Mesh(rearGlassGeo, glassMat);
    rearGlass.position.set(0, 0.75, -1.02);
    rearGroup.add(rearGlass);

    var slopedRearGlassGeo = new THREE.BoxGeometry(0.90, 0.46, 0.02);
    var slopedRearGlass = new THREE.Mesh(slopedRearGlassGeo, glassMat);
    slopedRearGlass.position.set(0, 0.77, -1.05);
    slopedRearGlass.rotation.x = 0.58;
    rearGroup.add(slopedRearGlass);

    var lowRearWinGeo = new THREE.BoxGeometry(0.88, 0.08, 0.02);
    var lowRearWin = new THREE.Mesh(lowRearWinGeo, glassMat);
    lowRearWin.position.set(0, 0.90, -0.92);
    lowRearWin.rotation.x = -0.15;
    rearGroup.add(lowRearWin);

    var rearBumperShape = new THREE.Shape();
    rearBumperShape.moveTo(0.68, 0);
    rearBumperShape.quadraticCurveTo(0.70, -0.22, 0.54, -0.36);
    rearBumperShape.quadraticCurveTo(0, -0.46, -0.54, -0.36);
    rearBumperShape.quadraticCurveTo(-0.70, -0.22, -0.68, 0);
    rearBumperShape.closePath();

    var rearBumperGeo = new THREE.ExtrudeGeometry(rearBumperShape, { 
      depth: 0.28, 
      bevelEnabled: true, 
      bevelThickness: 0.06, 
      bevelSize: 0.04, 
      bevelSegments: 8 
    });
    rearBumperGeo.rotateX(Math.PI / 2);
    var rearBumper = new THREE.Mesh(rearBumperGeo, bodyMat);
    rearBumper.position.set(0, 0.48, -0.92);
    rearBumper.castShadow = true;
    rearGroup.add(rearBumper);

    var rearWallShape = new THREE.Shape();
    rearWallShape.moveTo(-0.68, 0);
    rearWallShape.quadraticCurveTo(0, 0.04, 0.68, 0);
    rearWallShape.lineTo(0.66, 0.18);
    rearWallShape.quadraticCurveTo(0, 0.22, -0.66, 0.18);
    rearWallShape.closePath();

    var rearWallGeo = new THREE.ExtrudeGeometry(rearWallShape, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03 });
    rearWallGeo.rotateX(Math.PI / 2);
    var rearWall = new THREE.Mesh(rearWallGeo, bodyMat);
    rearWall.position.set(0, 0.48, -1.22);
    rearGroup.add(rearWall);

    for (let side of [-1, 1]) {
      var tailLightGeo = new THREE.BoxGeometry(0.12, 0.18, 0.06);
      var tailLight = new THREE.Mesh(tailLightGeo, tailLightMat);
      tailLight.position.set(side * 0.58, 0.56, -1.24);
      rearGroup.add(tailLight);
    }

    var wingBaseGeo = new THREE.BoxGeometry(0.95, 0.025, 0.18);
    var wing = new THREE.Mesh(wingBaseGeo, bodyMat);
    wing.position.set(0, 0.95, -0.90);
    wing.rotation.x = 0.04;
    wing.castShadow = true;
    rearGroup.add(wing);

    for (let side of [-0.32, 0.32]) {
      var wingPostGeo = new THREE.BoxGeometry(0.035, 0.05, 0.08);
      var wingPost = new THREE.Mesh(wingPostGeo, carbonMat);
      wingPost.position.set(side, 0.91, -0.86);
      rearGroup.add(wingPost);
    }

    for (let side of [-0.48, 0.48]) {
      var endplateGeo = new THREE.BoxGeometry(0.025, 0.10, 0.22);
      var endplate = new THREE.Mesh(endplateGeo, bodyMat);
      endplate.position.set(side, 0.95, -0.88);
      rearGroup.add(endplate);
    }

    var diffGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.34, 24);
    diffGeo.rotateZ(Math.PI / 2);
    diffGeo.scale(1.0, 0.7, 1.0);
    var diff = new THREE.Mesh(diffGeo, carbonMat);
    diff.position.set(0, 0.22, -1.22);
    rearGroup.add(diff);

    var exPipeGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.18, 16);
    exPipeGeo.rotateX(Math.PI / 2);
    var exPipe = new THREE.Mesh(exPipeGeo, chromeMat);
    exPipe.position.set(0, 0.24, -1.26);
    rearGroup.add(exPipe);

    bodyBase.add(rearGroup);
    carGroup.add(bodyBase);

    // ---------------------------------------------------------
    // F. YÖVALOT
    // ---------------------------------------------------------
    var spot1 = new THREE.SpotLight(0xfff5cc, 2.8, 48, Math.PI / 6, 0.4);
    spot1.position.set(-0.37, 0.58, 1.05);
    spot1.target.position.set(-0.37, 0.1, 15);
    spot1.visible = (typeof currentTimeOfDay !== 'undefined' && currentTimeOfDay === 'yo');
    carGroup.add(spot1); carGroup.add(spot1.target);

    var spot2 = new THREE.SpotLight(0xfff5cc, 2.8, 48, Math.PI / 6, 0.4);
    spot2.position.set(0.37, 0.58, 1.05);
    spot2.target.position.set(0.37, 0.1, 15);
    spot2.visible = (typeof currentTimeOfDay !== 'undefined' && currentTimeOfDay === 'yo');
    carGroup.add(spot2); carGroup.add(spot2.target);

    carGroup.userData.headlight1 = spot1;
    carGroup.userData.headlight2 = spot2;

    // ---------------------------------------------------------
    // G. RENKAAT KORIN ALLA
    // ---------------------------------------------------------
    function createRallyWheel(isRear) {
      var wheelGroup = new THREE.Group();
      var radius = 0.28;
      var width = 0.24;

      var tireGeo = new THREE.CylinderGeometry(radius, radius, width, 32);
      tireGeo.rotateZ(Math.PI / 2);
      var tire = new THREE.Mesh(tireGeo, tireMat);
      tire.castShadow = true;
      wheelGroup.add(tire);

      var rimFaceGeo = new THREE.CylinderGeometry(radius * 0.75, radius * 0.75, 0.02, 24);
      rimFaceGeo.rotateZ(Math.PI / 2);
      var rimFace = new THREE.Mesh(rimFaceGeo, rallyRimMat);
      rimFace.position.x = width * 0.42;
      wheelGroup.add(rimFace);

      for (var s = 0; s < 12; s++) {
        var spokeGeo = new THREE.BoxGeometry(0.018, radius * 0.68, 0.02);
        var spoke = new THREE.Mesh(spokeGeo, rallyRimMat);
        spoke.position.x = width * 0.40;
        spoke.rotation.x = (Math.PI * 2 / 12) * s;
        wheelGroup.add(spoke);
      }

      var capGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.02, 16);
      capGeo.rotateZ(Math.PI / 2);
      var cap = new THREE.Mesh(capGeo, carbonMat);
      cap.position.x = width * 0.43;
      wheelGroup.add(cap);

      var discGeo = new THREE.CylinderGeometry(radius * 0.62, radius * 0.62, 0.018, 24);
      discGeo.rotateZ(Math.PI / 2);
      var disc = new THREE.Mesh(discGeo, chromeMat);
      disc.position.x = width * 0.12;
      wheelGroup.add(disc);

      var caliperGeo = new THREE.BoxGeometry(0.05, radius * 0.42, 0.10);
      var caliper = new THREE.Mesh(caliperGeo, redCaliperMat);
      caliper.position.set(width * 0.12, radius * 0.35, 0);
      wheelGroup.add(caliper);

      return wheelGroup;
    }

    var wheelPos = [
      [-0.62, 0.28, 0.82, false], [0.62, 0.28, 0.82, false],
      [-0.62, 0.28, -0.85, true], [0.62, 0.28, -0.85, true]
    ];

    for (var i = 0; i < 4; i++) {
      var wh = createRallyWheel(wheelPos[i][3]);
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

  window.CAR_MODELS['fiesta_rally4'] = window.CAR_MODELS['forder'];
  window.CAR_MODELS['fiesta'] = window.CAR_MODELS['forder'];
})();