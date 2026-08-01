// lambo.js - Lambo 3D-automalli 
(function() {
  'use strict';

  window.CAR_MODELS = window.CAR_MODELS || {};

  window.CAR_MODELS['lambo'] = function(bodyColorHex, accentColorHex, carTexUrl) {
    var carGroup = new THREE.Group();

    // ---------------------------------------------------------
    // TEKSTUURIEN LATAUSAPURI
    // ---------------------------------------------------------
    function loadJpgTexture(url, repeatX, repeatY) {
      if (!url) return null;
      if (typeof window.texturesEnabled !== 'undefined' && window.texturesEnabled && typeof window.loadTextureWithFallback === 'function') {
        return window.loadTextureWithFallback(url, repeatX || 1, repeatY || 1, '#111111', 'TEX');
      }
      return null;
    }

    // ---------------------------------------------------------
    // MATERIAALIT
    // ---------------------------------------------------------
    var baseCol = new THREE.Color(bodyColorHex || 0x11131a);
    if (typeof window.texturesEnabled !== 'undefined' && window.texturesEnabled && carTexUrl) {
      baseCol.lerp(new THREE.Color(0xffffff), 0.35);
    }

    var bodyMat = new THREE.MeshPhysicalMaterial({
      color: baseCol,
      metalness: 0.75,
      roughness: 0.15,
      clearcoat: 1.0,
      clearcoatRoughness: 0.03,
      reflectivity: 0.9
    });

    if (typeof window.texturesEnabled !== 'undefined' && window.texturesEnabled && carTexUrl && typeof window.loadTextureWithFallback === 'function') {
      var carTex = window.loadTextureWithFallback(carTexUrl, 2, 2, bodyColorHex, 'AUTOTEX');
      if (carTex) bodyMat.map = carTex;
    }

    var carbonMat = new THREE.MeshStandardMaterial({
      color: 0x15161a,
      roughness: 0.35,
      metalness: 0.85
    });

    var glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x05070c,
      metalness: 0.9,
      roughness: 0.05,
      transmission: 0.88,
      transparent: true,
      opacity: 0.9
    });

    var accentMat = new THREE.MeshStandardMaterial({
      color: accentColorHex || 0xc4ff00, // Acid Yellow / Tehosteväri
      metalness: 0.5,
      roughness: 0.2
    });

    // Syvänmustat renkaat ja vanteet
    var tireMat = new THREE.MeshStandardMaterial({ 
      color: 0x020202, 
      roughness: 0.9 
    });

    var blackRimMat = new THREE.MeshStandardMaterial({ 
      color: 0x050505, 
      metalness: 0.95, 
      roughness: 0.1 
    });

    // Valomateriaalit (Emissive)
    var headLedMat = new THREE.MeshStandardMaterial({ 
      color: 0xffffff, 
      emissive: 0xffffff, 
      emissiveIntensity: 4.0, 
      roughness: 0.1 
    });

    var tailLedMat = new THREE.MeshStandardMaterial({ 
      color: 0xff0033, 
      emissive: 0xff0033, 
      emissiveIntensity: 4.0, 
      roughness: 0.1 
    });

    var exhaustGlowMat = new THREE.MeshStandardMaterial({ 
      color: 0xff5500, 
      emissive: 0xff3300, 
      emissiveIntensity: 2.0 
    });

    var engineMetalMat = new THREE.MeshStandardMaterial({ 
      color: 0x8899a6, 
      metalness: 0.9, 
      roughness: 0.2 
    });

    // ---------------------------------------------------------
    // A. PÄÄRUNKO
    // ---------------------------------------------------------
    var bodyBase = new THREE.Group();

    var tubGeo = new THREE.BoxGeometry(1.50, 0.34, 2.8);
    var tubMesh = new THREE.Mesh(tubGeo, bodyMat);
    tubMesh.position.set(0, 0.30, -0.2);
    tubMesh.castShadow = true;
    bodyBase.add(tubMesh);

    var sidePodGeo = new THREE.BoxGeometry(1.74, 0.30, 2.2);
    var sidePodMesh = new THREE.Mesh(sidePodGeo, bodyMat);
    sidePodMesh.position.set(0, 0.32, -0.1);
    sidePodMesh.castShadow = true;
    bodyBase.add(sidePodMesh);

    // ---------------------------------------------------------
    // B. KONEPELTI & NOKKA
    // ---------------------------------------------------------
    var frontNoseGroup = new THREE.Group();

    var noseShape = new THREE.Shape();
    noseShape.moveTo(-0.62, 0);                    
    noseShape.lineTo(0.62, 0);                     
    noseShape.quadraticCurveTo(0.55, 0.9, 0.44, 1.55);  
    noseShape.quadraticCurveTo(0, 2.05, -0.44, 1.55);    
    noseShape.quadraticCurveTo(-0.55, 0.9, -0.62, 0);    
    noseShape.closePath();

    var noseExtrudeSettings = {
      depth: 0.12,
      bevelEnabled: true,
      bevelThickness: 0.08,
      bevelSize: 0.06,
      bevelSegments: 8
    };

    var noseGeo = new THREE.ExtrudeGeometry(noseShape, noseExtrudeSettings);
    noseGeo.rotateX(Math.PI / 2);
    
    var noseMesh = new THREE.Mesh(noseGeo, bodyMat);
    noseMesh.position.set(0, 0.44, 0.38);
    noseMesh.rotation.x = 0.12; 
    noseMesh.castShadow = true;
    frontNoseGroup.add(noseMesh);

    // Keskiharja
    var spineShape = new THREE.Shape();
    spineShape.moveTo(-0.04, 0);
    spineShape.lineTo(0.04, 0);
    spineShape.lineTo(0.02, 1.75);
    spineShape.lineTo(-0.02, 1.75);
    var spineGeo = new THREE.ExtrudeGeometry(spineShape, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02 });
    spineGeo.rotateX(Math.PI / 2);
    var spineMesh = new THREE.Mesh(spineGeo, bodyMat);
    spineMesh.position.set(0, 0.47, 0.38);
    spineMesh.rotation.x = 0.12;
    frontNoseGroup.add(spineMesh);

    // ---------------------------------------------------------
    // C. AJOVALOT (Nokan etuosassa matalalla)
    // ---------------------------------------------------------
    var spot1 = null;
    var spot2 = null;

    var sides = [-1, 1];
    for (var sIdx = 0; sIdx < sides.length; sIdx++) {
      var side = sides[sIdx];
      var headGroup = new THREE.Group();
      headGroup.position.set(side * 0.42, 0.41, 1.76);
      headGroup.rotation.x = 0.14; 
      headGroup.rotation.y = side * -0.22; 

      // Pyöristetty pohjakehys
      var bezelGeo = new THREE.SphereGeometry(0.14, 24, 16);
      bezelGeo.scale(0.85, 0.20, 1.8);
      var bezel = new THREE.Mesh(bezelGeo, carbonMat);
      headGroup.add(bezel);

      // Pyöristetty sulava linssi
      var lensGeo = new THREE.SphereGeometry(0.13, 24, 16);
      lensGeo.scale(0.82, 0.22, 1.7);
      var lens = new THREE.Mesh(lensGeo, glassMat);
      lens.position.set(0, 0.015, 0);
      headGroup.add(lens);

      // Kaksois-LED Projektorilinssit
      var projPositions = [-0.08, 0.06];
      for (var pIdx = 0; pIdx < projPositions.length; pIdx++) {
        var p = projPositions[pIdx];
        var projGeo = new THREE.SphereGeometry(0.035, 16, 12);
        var proj = new THREE.Mesh(projGeo, headLedMat);
        proj.position.set(side * 0.01, 0.02, p);
        headGroup.add(proj);
      }

      // Kaareutuva DRL-valonauha
      var stripGeo = new THREE.TorusGeometry(0.10, 0.010, 8, 16, Math.PI * 0.85);
      stripGeo.rotateX(Math.PI / 2);
      var strip = new THREE.Mesh(stripGeo, headLedMat);
      strip.position.set(0, 0.03, 0.01);
      headGroup.add(strip);

      // Valokeila eteenpäin
      var spotLight = new THREE.SpotLight(0xffffff, 2.8, 14, Math.PI / 6, 0.4);
      spotLight.position.set(0, 0.04, 0.15);
      spotLight.target.position.set(side * 0.42, -0.3, 8);
      spotLight.visible = (typeof currentTimeOfDay !== 'undefined' && currentTimeOfDay === 'yo');
      headGroup.add(spotLight);
      headGroup.add(spotLight.target);

      if (sIdx === 0) spot1 = spotLight;
      else spot2 = spotLight;

      frontNoseGroup.add(headGroup);
    }

    carGroup.userData.headlight1 = spot1;
    carGroup.userData.headlight2 = spot2;

    bodyBase.add(frontNoseGroup);

    // ---------------------------------------------------------
    // D. OHJAAMO
    // ---------------------------------------------------------
    var canopyGeo = new THREE.SphereGeometry(0.72, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.48);
    canopyGeo.scale(0.96, 0.58, 2.1);
    var canopy = new THREE.Mesh(canopyGeo, glassMat);
    canopy.position.set(0, 0.41, -0.05);
    bodyBase.add(canopy);

    // ---------------------------------------------------------
    // E. LOKASUOJAT
    // ---------------------------------------------------------
    function createFender(isRear) {
      var radius = isRear ? 0.41 : 0.38; 
      var width = isRear ? 0.30 : 0.26;
      
      var fenderGeo = new THREE.CylinderGeometry(radius, radius + 0.02, width, 24, 1, true, 0, Math.PI);
      fenderGeo.rotateZ(Math.PI / 2);

      var fender = new THREE.Mesh(fenderGeo, bodyMat);
      fender.castShadow = true;
      return fender;
    }

    var fFL = createFender(false); fFL.position.set(-0.80, 0.35, 1.35);
    var fFR = createFender(false); fFR.position.set( 0.80, 0.35, 1.35);

    var fRL = createFender(true);  fRL.position.set(-0.82, 0.38, -1.35);
    var fRR = createFender(true);  fRR.position.set( 0.82, 0.38, -1.35);

    bodyBase.add(fFL); bodyBase.add(fFR); bodyBase.add(fRL); bodyBase.add(fRR);

    // ---------------------------------------------------------
    // F. KAAREVA ETUSPLITTERI & SIVUHELMAT
    // ---------------------------------------------------------
    var splitterShape = new THREE.Shape();
    splitterShape.moveTo(-0.90, 0);
    splitterShape.lineTo(0.90, 0);
    splitterShape.quadraticCurveTo(0.85, 0.45, 0, 0.55);
    splitterShape.quadraticCurveTo(-0.85, 0.45, -0.90, 0);

    var splitterGeo = new THREE.ExtrudeGeometry(splitterShape, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015 });
    splitterGeo.rotateX(Math.PI / 2);
    var splitter = new THREE.Mesh(splitterGeo, carbonMat);
    splitter.position.set(0, 0.14, 1.70);
    splitter.castShadow = true;
    bodyBase.add(splitter);

    for (var sideIdx = 0; sideIdx < sides.length; sideIdx++) {
      var side = sides[sideIdx];
      var skirtGeo = new THREE.BoxGeometry(0.14, 0.06, 2.4);
      var skirt = new THREE.Mesh(skirtGeo, carbonMat);
      skirt.position.set(side * 0.82, 0.15, 0);
      bodyBase.add(skirt);
    }

    // ---------------------------------------------------------
    // G. TAKAOSA & TAKAVALOT
    // ---------------------------------------------------------
    var rearGroup = new THREE.Group();

    var rearWallGeo = new THREE.BoxGeometry(1.62, 0.38, 0.15);
    var rearWall = new THREE.Mesh(rearWallGeo, bodyMat);
    rearWall.position.set(0, 0.42, -2.0);
    rearGroup.add(rearWall);

    // TAKAVALOT (Y-Lightbar)
    var tailLightGroup = new THREE.Group();
    tailLightGroup.position.set(0, 0.50, -2.08);

    var mainBarGeo = new THREE.BoxGeometry(1.55, 0.04, 0.04);
    var mainBar = new THREE.Mesh(mainBarGeo, tailLedMat);
    tailLightGroup.add(mainBar);

    for (var sIdx = 0; sIdx < sides.length; sIdx++) {
      var side = sides[sIdx];
      var chev1 = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.035, 0.04), tailLedMat);
      chev1.position.set(side * 0.55, 0, 0);
      chev1.rotation.z = side * -0.3;

      var chev2 = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.035, 0.04), tailLedMat);
      chev2.position.set(side * 0.55, 0, 0);
      chev2.rotation.z = side * 0.3;

      tailLightGroup.add(chev1);
      tailLightGroup.add(chev2);
    }
    rearGroup.add(tailLightGroup);

    // Punainen taustavalo
    var redPointLight = new THREE.PointLight(0xff0033, 3.0, 5);
    redPointLight.position.set(0, 0.50, -2.2);
    rearGroup.add(redPointLight);

    // MOOTTORITILAN RITILÄT (Louvers)
    for (var i = 0; i < 4; i++) {
      var louverGeo = new THREE.BoxGeometry(1.02 - (i * 0.08), 0.03, 0.22);
      var louver = new THREE.Mesh(louverGeo, carbonMat);
      louver.position.set(0, 0.84 - (i * 0.045), -0.78 - (i * 0.24));
      louver.rotation.x = -0.14;
      louver.castShadow = true;
      rearGroup.add(louver);
    }

    // Keskipakoputkisto (4x Titanium Quad Exhausts)
    var exhaustGroup = new THREE.Group();
    exhaustGroup.position.set(0, 0.38, -2.06);

    var exhaustHousing = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.14, 0.12), carbonMat);
    exhaustGroup.add(exhaustHousing);

    var pipePositions = [-0.16, -0.05, 0.05, 0.16];
    for (var pIdx = 0; pIdx < pipePositions.length; pIdx++) {
      var x = pipePositions[pIdx];
      var pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.15, 16), engineMetalMat);
      pipe.rotateX(Math.PI / 2);
      pipe.position.set(x, 0, 0.02);

      var innerGlow = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.16, 16), exhaustGlowMat);
      innerGlow.rotateX(Math.PI / 2);
      innerGlow.position.set(x, 0, 0.02);

      exhaustGroup.add(pipe);
      exhaustGroup.add(innerGlow);
    }
    rearGroup.add(exhaustGroup);

    // Takadiffuusori
    var diffBase = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.16, 0.45), carbonMat);
    diffBase.position.set(0, 0.20, -1.95);
    diffBase.rotation.x = -0.10;
    rearGroup.add(diffBase);

    var diffFins = [-0.6, -0.2, 0.2, 0.6];
    for (var fIdx = 0; fIdx < diffFins.length; fIdx++) {
      var side = diffFins[fIdx];
      var fin = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.22, 0.50), carbonMat);
      fin.position.set(side, 0.16, -1.98);
      rearGroup.add(fin);
    }

    // Takasiipi (GT Wing)
    var wingBlade = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.04, 0.35), carbonMat);
    wingBlade.position.set(0, 0.94, -1.85);

    var endplateSides = [-0.93, 0.93];
    for (var epIdx = 0; epIdx < endplateSides.length; epIdx++) {
      var side = endplateSides[epIdx];
      var endplate = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.20, 0.40), carbonMat);
      endplate.position.set(side, 0.94, -1.85);
      rearGroup.add(endplate);
    }

    var postSides = [-0.40, 0.40];
    for (var psIdx = 0; psIdx < postSides.length; psIdx++) {
      var side = postSides[psIdx];
      var post = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.30, 0.15), carbonMat);
      post.position.set(side, 0.80, -1.80);
      post.rotation.x = -0.2;
      rearGroup.add(post);
    }
    rearGroup.add(wingBlade);

    bodyBase.add(rearGroup);
    carGroup.add(bodyBase);

    // ---------------------------------------------------------
    // H. MUSTAT RENKAAT JA MUSTAT VANTEET
    // ---------------------------------------------------------
    function createProWheel(isRear) {
      var wheelGroup = new THREE.Group();
      var radius = isRear ? 0.38 : 0.35;
      var width = isRear ? 0.32 : 0.28;

      var tire = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 32), tireMat);
      tire.rotateZ(Math.PI / 2);
      tire.castShadow = true;
      wheelGroup.add(tire);

      var rimLip = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.72, 0.02, 12, 32), blackRimMat);
      rimLip.rotateY(Math.PI / 2);
      rimLip.position.x = width * 0.42;
      wheelGroup.add(rimLip);

      for (var s = 0; s < 5; s++) {
        var spoke = new THREE.Mesh(new THREE.BoxGeometry(0.03, radius * 0.68, 0.03), blackRimMat);
        spoke.position.x = width * 0.40;
        spoke.rotation.x = (Math.PI * 2 / 5) * s;
        wheelGroup.add(spoke);
      }

      var discMat = new THREE.MeshStandardMaterial({ 
        color: 0x777777, 
        metalness: 0.9, 
        roughness: 0.2
      });
      var disc = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.68, radius * 0.68, 0.03, 24), discMat);
      disc.rotateZ(Math.PI / 2);
      wheelGroup.add(disc);

      var caliper = new THREE.Mesh(new THREE.BoxGeometry(0.06, radius * 0.42, 0.11), accentMat);
      caliper.position.set(width * 0.15, radius * 0.38, 0);
      wheelGroup.add(caliper);

      return wheelGroup;
    }

    var wheelPositions = [
      { pos: [-0.82, 0.35, 1.35], isRear: false },
      { pos: [ 0.82, 0.35, 1.35], isRear: false },
      { pos: [-0.84, 0.38, -1.35], isRear: true },
      { pos: [ 0.84, 0.38, -1.35], isRear: true }
    ];

    for (var wIdx = 0; wIdx < wheelPositions.length; wIdx++) {
      var w = wheelPositions[wIdx];
      var wh = createProWheel(w.isRear);
      wh.position.set(w.pos[0], w.pos[1], w.pos[2]);
      if (w.pos[0] > 0) wh.rotation.y = Math.PI;
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
