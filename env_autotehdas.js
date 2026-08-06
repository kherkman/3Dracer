// env_autotehdas.js - Autotehdas & Steriili 3D-Laboratorioympäristö
(function() {
  'use strict';

  window.ENV_BUILDERS = window.ENV_BUILDERS || {};

  /* ---------------------------------------------------------------
     1. TEKSTUURI-, KATU- JA FALLBACK-GENERAATTORIT
  --------------------------------------------------------------- */
  function createCopperWindingTex() {
    var c = document.createElement('canvas'); c.width = 128; c.height = 512;
    var ctx = c.getContext('2d');
    var grad = ctx.createLinearGradient(0, 0, 128, 0);
    grad.addColorStop(0, '#7a3d1a');
    grad.addColorStop(0.3, '#c9793d');
    grad.addColorStop(0.5, '#e8a561');
    grad.addColorStop(0.7, '#b5652b');
    grad.addColorStop(1, '#6e3416');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 512);

    ctx.lineWidth = 2;
    for (var y = 0; y < 512; y += 6) {
      ctx.strokeStyle = 'rgba(20, 8, 2, 0.6)';
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(128, y); ctx.stroke();
      ctx.strokeStyle = 'rgba(255, 220, 180, 0.4)';
      ctx.beginPath(); ctx.moveTo(0, y + 2); ctx.lineTo(128, y + 2); ctx.stroke();
    }

    var tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  var copperWindingTex = createCopperWindingTex();

  function createGlowTexture() {
    var c = document.createElement('canvas'); c.width = c.height = 128;
    var ctx = c.getContext('2d');
    var g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    g.addColorStop(0.25, 'rgba(167, 139, 250, 0.8)');
    g.addColorStop(1, 'rgba(167, 139, 250, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }

  var glowTex = createGlowTexture();

  function createHologramTex(title, subtitle, mainColor) {
    var c = document.createElement('canvas'); c.width = 512; c.height = 256;
    var ctx = c.getContext('2d');

    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(0, 0, 512, 256);

    ctx.strokeStyle = mainColor || '#00f0ff';
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, 496, 240);

    ctx.fillStyle = mainColor || '#00f0ff';
    ctx.font = 'bold 36px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, 256, 75);

    ctx.font = 'bold 22px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(subtitle, 256, 130);

    ctx.fillStyle = mainColor || '#00f0ff';
    for (var y = 160; y < 220; y += 8) {
      ctx.fillRect(50, y, Math.random() * 410 + 10, 3);
    }

    var tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  function createLabelSprite(text, colorHex) {
    var cv = document.createElement('canvas'); cv.width = 512; cv.height = 128;
    var ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, 512, 128);
    ctx.font = '700 44px "Segoe UI", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = colorHex; ctx.shadowBlur = 20;
    ctx.fillStyle = colorHex;
    ctx.fillText(text, 256, 64);
    var tex = new THREE.CanvasTexture(cv);
    var mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
    var spr = new THREE.Sprite(mat);
    spr.scale.set(10, 2.5, 1);
    return spr;
  }

  function createFactoryFloorFallbackTex(facWidth, facLength) {
    var cv = document.createElement('canvas'); cv.width = 1024; cv.height = 1024;
    var ctx = cv.getContext('2d');
    ctx.fillStyle = '#181c22'; ctx.fillRect(0, 0, 1024, 1024);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)'; ctx.lineWidth = 2;
    for (var i = 0; i <= 1024; i += 64) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 1024); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(1024, i); ctx.stroke();
    }
    for (var i = 0; i < 220; i++) {
      ctx.fillStyle = 'rgba(0,0,0,' + (Math.random() * 0.08) + ')';
      ctx.beginPath();
      ctx.arc(Math.random() * 1024, Math.random() * 1024, Math.random() * 20 + 3, 0, Math.PI * 2);
      ctx.fill();
    }
    var tex = new THREE.CanvasTexture(cv);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(facWidth / 12, facLength / 12);
    return tex;
  }

  /* ---------------------------------------------------------------
     2. HIUKKASJÄRJESTELMÄT (KIPINÄT JA MAALISUMU)
  --------------------------------------------------------------- */
  function Particles(count, size, opacity) {
    this.count = count;
    this.positions = new Float32Array(count * 3);
    this.colors = new Float32Array(count * 3);
    this.velocities = [];
    for (var i = 0; i < count; i++) this.velocities.push(new THREE.Vector3());
    this.lives = new Float32Array(count);
    this.maxLives = new Float32Array(count);

    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    var mat = new THREE.PointsMaterial({
      size: size, vertexColors: true, transparent: true, opacity: opacity,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
    });
    this.points = new THREE.Points(geo, mat);
    this.cursor = 0;
  }

  Particles.prototype.spawn = function(pos, vel, color, life) {
    var i = this.cursor;
    this.cursor = (this.cursor + 1) % this.count;
    this.positions[i * 3] = pos.x;
    this.positions[i * 3 + 1] = pos.y;
    this.positions[i * 3 + 2] = pos.z;
    this.velocities[i].copy(vel);
    this.colors[i * 3] = color.r;
    this.colors[i * 3 + 1] = color.g;
    this.colors[i * 3 + 2] = color.b;
    this.lives[i] = life;
    this.maxLives[i] = life;
  };

  Particles.prototype.update = function(dt) {
    for (var i = 0; i < this.count; i++) {
      if (this.lives[i] <= 0) continue;
      this.lives[i] -= dt;
      var idx = i * 3;
      this.positions[idx]     += this.velocities[i].x * dt;
      this.positions[idx + 1] += this.velocities[i].y * dt;
      this.positions[idx + 2] += this.velocities[i].z * dt;
      this.velocities[i].y    -= dt * 1.8;
      if (this.lives[i] <= 0) { this.positions[idx + 1] = -1000; }
    }
    this.points.geometry.attributes.position.needsUpdate = true;
  };

  /* ---------------------------------------------------------------
     3. JÄTTITESLA-KELA JA SALAMOINTI (TESLAKELA.HTML)
  --------------------------------------------------------------- */
  function buildTeslaCoil(x, y, z, scale) {
    scale = scale || 0.85;
    var group = new THREE.Group();

    var copperMat = new THREE.MeshStandardMaterial({ color: 0xd07a3a, roughness: 0.25, metalness: 0.85 });
    var insulatorMat = new THREE.MeshStandardMaterial({ color: 0xe8dfce, roughness: 0.4, metalness: 0.05 });
    var toroidMat = new THREE.MeshPhysicalMaterial({
      color: 0xd8d8de, metalness: 1.0, roughness: 0.12, clearcoat: 0.6
    });
    var baseMat = new THREE.MeshStandardMaterial({ color: 0x2b2016, roughness: 0.6, metalness: 0.4 });
    var capMat = new THREE.MeshStandardMaterial({ color: 0x8a5a2b, roughness: 0.3, metalness: 0.8 });

    // Jalusta
    var base = new THREE.Mesh(new THREE.CylinderGeometry(4.2 * scale, 4.6 * scale, 1.0 * scale, 32), baseMat);
    base.position.y = 0.5 * scale;
    group.add(base);

    var rim = new THREE.Mesh(
      new THREE.TorusGeometry(4.2 * scale, 0.12 * scale, 12, 32),
      new THREE.MeshStandardMaterial({ color: 0xb87333, roughness: 0.3, metalness: 0.9 })
    );
    rim.position.y = 1.02 * scale;
    rim.rotation.x = Math.PI / 2;
    group.add(rim);

    // Ensiökäämi
    var primPts = [];
    var primTurns = 8;
    var primSteps = 160;
    for (var i = 0; i <= primSteps; i++) {
      var t = i / primSteps;
      var ang = t * Math.PI * 2 * primTurns;
      var r = (1.3 + t * 2.6) * scale;
      primPts.push(new THREE.Vector3(Math.cos(ang) * r, (1.25 + t * 0.02) * scale, Math.sin(ang) * r));
    }
    var primCurve = new THREE.CatmullRomCurve3(primPts);
    var primGeo = new THREE.TubeGeometry(primCurve, 140, 0.07 * scale, 6, false);
    var primaryMesh = new THREE.Mesh(primGeo, copperMat);
    group.add(primaryMesh);

    // Eristinpylväät
    for (var a = 0; a < 4; a++) {
      var ang = (a / 4) * Math.PI * 2 + 0.4;
      var post = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * scale, 0.14 * scale, 1.4 * scale, 10), insulatorMat);
      post.position.set(Math.cos(ang) * 1.15 * scale, 1.9 * scale, Math.sin(ang) * 1.15 * scale);
      group.add(post);
    }

    // Toisiokäämi
    var secH = 11.5 * scale;
    var secR = 1.05 * scale;
    var secMat = new THREE.MeshStandardMaterial({ map: copperWindingTex, roughness: 0.45, metalness: 0.55 });
    var secondary = new THREE.Mesh(new THREE.CylinderGeometry(secR, secR, secH, 32, 1, true), secMat);
    secondary.position.y = (2.6 + secH / 2) * scale;
    group.add(secondary);

    // Yläsuojus & Riser
    var capTop = new THREE.Mesh(new THREE.CylinderGeometry((secR + 0.06), (secR + 0.06), 0.2 * scale, 32), capMat);
    capTop.position.y = (2.6 + secH) * scale;
    group.add(capTop);

    var riser = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * scale, 0.05 * scale, 1.4 * scale, 8), copperMat);
    riser.position.y = (2.6 + secH + 0.8) * scale;
    group.add(riser);

    // Toroidi
    var toroidY = (2.6 + secH + 1.5) * scale;
    var toroidMesh = new THREE.Mesh(new THREE.TorusGeometry(2.3 * scale, 0.62 * scale, 16, 48), toroidMat);
    toroidMesh.rotation.x = Math.PI / 2;
    toroidMesh.position.y = toroidY;
    group.add(toroidMesh);

    // Koronasprite
    var sm = new THREE.SpriteMaterial({
      map: glowTex, color: 0xa78bfa, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.65
    });
    var coronaSprite = new THREE.Sprite(sm);
    coronaSprite.scale.set(4.5 * scale, 4.5 * scale, 1);
    coronaSprite.position.y = toroidY;
    group.add(coronaSprite);

    // Välähdysvalo
    var arcLight = new THREE.PointLight(0xa78bfa, 0, 40, 2);
    arcLight.position.y = toroidY;
    group.add(arcLight);

    group.position.set(x, y, z);

    return {
      group: group,
      toroidPos: new THREE.Vector3(x, y + toroidY, z),
      coronaSprite: coronaSprite,
      arcLight: arcLight,
      scale: scale,
      strikeTimer: 0.2 + Math.random() * 0.8
    };
  }

  function midpointDisplace(p0, p1, depth, spread, out) {
    if (depth <= 0) { out.push(p1); return; }
    var mid = new THREE.Vector3().addVectors(p0, p1).multiplyScalar(0.5);
    var perp = new THREE.Vector3(
      (Math.random() - 0.5), (Math.random() - 0.5) * 0.6, (Math.random() - 0.5)
    ).normalize().multiplyScalar(spread * (Math.random() * 0.8 + 0.4));
    mid.add(perp);
    midpointDisplace(p0, mid, depth - 1, spread * 0.55, out);
    midpointDisplace(mid, p1, depth - 1, spread * 0.55, out);
  }

  function buildBoltPath(start, end, iterations, spread) {
    var pts = [start.clone()];
    midpointDisplace(start, end, iterations, spread, pts);
    return pts;
  }

  function Bolt(parentGroup, start, end, colorHex) {
    this.parentGroup = parentGroup;
    this.life = 1.0;
    this.decay = 3.2 + Math.random() * 2.0;

    var paths = [];
    var main = buildBoltPath(start, end, 4, 1.1);
    paths.push(main);

    if (Math.random() < 0.6) {
      var idx = 2 + Math.floor(Math.random() * Math.max(1, main.length - 3));
      if (main[idx]) {
        var bs = main[idx];
        var dir = new THREE.Vector3(
          (Math.random() - 0.5), -Math.random() * 0.6 - 0.1, (Math.random() - 0.5)
        ).normalize().multiplyScalar(1.5 + Math.random() * 2.0);
        var be = bs.clone().add(dir);
        paths.push(buildBoltPath(bs, be, 3, 0.6));
      }
    }

    var positions = [];
    paths.forEach(function(path) {
      for (var i = 0; i < path.length - 1; i++) {
        positions.push(path[i].x, path[i].y, path[i].z);
        positions.push(path[i + 1].x, path[i + 1].y, path[i + 1].z);
      }
    });

    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    var mat = new THREE.LineBasicMaterial({
      color: colorHex || 0xa78bfa,
      transparent: true, opacity: 1, blending: THREE.AdditiveBlending
    });
    this.line = new THREE.LineSegments(geo, mat);
    this.parentGroup.add(this.line);

    this.sprites = [];
    for (var i = 0; i < main.length; i += 3) {
      var sm = new THREE.SpriteMaterial({
        map: glowTex, color: colorHex || 0xa78bfa, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.8
      });
      var s = new THREE.Sprite(sm);
      var sc = 0.4 + Math.random() * 0.4;
      s.scale.set(sc, sc, 1);
      s.position.copy(main[i]);
      this.parentGroup.add(s);
      this.sprites.push(s);
    }
  }

  Bolt.prototype.update = function(dt) {
    this.life -= this.decay * dt;
    var a = Math.max(0, this.life) * (0.6 + Math.random() * 0.4);
    this.line.material.opacity = a;
    this.sprites.forEach(function(s) { s.material.opacity = a * 0.7; });
    return this.life > 0;
  };

  Bolt.prototype.dispose = function() {
    this.parentGroup.remove(this.line);
    this.line.geometry.dispose();
    this.line.material.dispose();
    var pg = this.parentGroup;
    this.sprites.forEach(function(s) { pg.remove(s); s.material.dispose(); });
  };

  /* ---------------------------------------------------------------
     4. TEOLLISUUSROBOTTI IR-6600 (TEOLLISUUSROBOTTI.HTML)
  --------------------------------------------------------------- */
  function buildIndustrialRobot(x, y, z, angle) {
    var robotGroup = new THREE.Group();

    var matOrange = new THREE.MeshStandardMaterial({ color: 0xff6a00, roughness: 0.35, metalness: 0.25 });
    var matBody   = new THREE.MeshStandardMaterial({ color: 0xf2f2f0, roughness: 0.4, metalness: 0.15 });
    var matDark   = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.5, metalness: 0.4 });
    var matChrome = new THREE.MeshStandardMaterial({ color: 0xcfd2d6, roughness: 0.15, metalness: 0.95 });
    var matAccent = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6, metalness: 0.2 });

    // Jalusta
    var baseMount = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.68, 0.14, 24), matAccent);
    baseMount.position.y = 0.07;
    robotGroup.add(baseMount);

    var base = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.56, 0.4, 24), matBody);
    base.position.y = 0.34;
    robotGroup.add(base);

    // Akseli 1
    var turret = new THREE.Group();
    turret.position.y = 0.54;
    robotGroup.add(turret);

    var turretBody = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 0.36, 20), matOrange);
    turretBody.position.y = 0.18;
    turret.add(turretBody);

    var turretCap = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.04, 20), matDark);
    turretCap.position.y = 0.37;
    turret.add(turretCap);

    // Akseli 2
    var shoulderPivot = new THREE.Group();
    shoulderPivot.position.set(0.1, 0.4, 0);
    turret.add(shoulderPivot);

    var shoulderHousing = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 14), matDark);
    shoulderPivot.add(shoulderHousing);

    var L1 = 1.0;
    var lowerArm = new THREE.Group();
    shoulderPivot.add(lowerArm);

    var lowerArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.34, L1, 0.3), matOrange);
    lowerArmMesh.position.y = L1 / 2;
    lowerArm.add(lowerArmMesh);

    var counterweight = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.3, 16), matDark);
    counterweight.rotation.z = Math.PI / 2;
    counterweight.position.set(0, 0.22, -0.18);
    lowerArm.add(counterweight);

    // Akseli 3
    var elbowPivot = new THREE.Group();
    elbowPivot.position.set(0, L1, 0);
    lowerArm.add(elbowPivot);

    var elbowHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.42, 16), matDark);
    elbowHousing.rotation.z = Math.PI / 2;
    elbowPivot.add(elbowHousing);

    var L2 = 0.88;
    var foreArm = new THREE.Group();
    elbowPivot.add(foreArm);

    var foreArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.26, L2, 0.24), matBody);
    foreArmMesh.position.y = L2 / 2;
    foreArm.add(foreArmMesh);

    // Akselit 4 & 5
    var wrist1 = new THREE.Group();
    wrist1.position.set(0, L2, 0);
    foreArm.add(wrist1);
    var wrist1Housing = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.2, 16), matChrome);
    wrist1.add(wrist1Housing);

    var wrist2 = new THREE.Group();
    wrist2.position.set(0, 0.16, 0);
    wrist1.add(wrist2);
    var wrist2Housing = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.28, 16), matDark);
    wrist2Housing.rotation.z = Math.PI / 2;
    wrist2.add(wrist2Housing);

    // Akseli 6 & Tarttuja
    var flange = new THREE.Group();
    flange.position.set(0, 0.14, 0);
    wrist2.add(flange);

    var flangeMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.1, 16), matChrome);
    flange.add(flangeMesh);

    var gripperBase = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.14, 0.16), matAccent);
    gripperBase.position.y = 0.12;
    flange.add(gripperBase);

    var fingerL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.09), matChrome);
    fingerL.position.set(-0.06, 0.25, 0);
    var fingerR = fingerL.clone();
    fingerR.position.x = 0.06;
    flange.add(fingerL); flange.add(fingerR);

    // Hitsauskärki
    var tipMat = new THREE.MeshStandardMaterial({ color: 0x111214, emissive: 0xff6a00, emissiveIntensity: 0 });
    var tip = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.35, 8), tipMat);
    tip.position.y = 0.35;
    flange.add(tip);

    robotGroup.position.set(x, y, z);
    robotGroup.rotation.y = angle || 0;

    var keyPoses = {
      home:     [0, -18, 35, 0, 20, 0, 1],
      overPick: [42, -6, 58, 0, 30, 0, 1],
      down:     [42, 22, 78, 0, 30, 0, 1],
      grip:     [42, 22, 78, 0, 30, 0, 0],
      lift:     [42, -10, 50, 0, 25, 0, 0],
      overPlace:[-45, -10, 50, 0, 25, 0, 0],
      downPlace:[-45, 20, 76, 0, 30, 0, 0],
      release:  [-45, 20, 76, 0, 30, 0, 1],
      retreat:  [-45, -14, 46, 0, 22, 0, 1]
    };

    var keySeq = ['home', 'overPick', 'down', 'grip', 'lift', 'overPlace', 'downPlace', 'release', 'retreat', 'home'];
    var segDur = [1.2, 1.4, 0.9, 0.6, 1.2, 1.4, 0.9, 0.6, 1.2];
    var totalDur = segDur.reduce(function(a, b) { return a + b; }, 0);

    return {
      group: robotGroup,
      turret: turret,
      shoulderPivot: shoulderPivot,
      elbowPivot: elbowPivot,
      wrist1: wrist1,
      wrist2: wrist2,
      flange: flange,
      fingerL: fingerL,
      fingerR: fingerR,
      tipMesh: tip,
      tipMat: tipMat,
      keyPoses: keyPoses,
      keySeq: keySeq,
      segDur: segDur,
      totalDur: totalDur,
      animTime: Math.random() * totalDur
    };
  }

  function lerpPose(a, b, f) {
    var r = [];
    for (var i = 0; i < a.length; i++) r.push(a[i] + (b[i] - a[i]) * f);
    return r;
  }

  function easeInOut(x) { return x * x * (3 - 2 * x); }

  /* ---------------------------------------------------------------
     5. AUTOTEHTAAN LIUKUHIHNA JA SARJATUOTANTOAUTOT (LIUKUHIHNA.HTML)
  --------------------------------------------------------------- */
  function buildFactoryCar(paintColor) {
    var car = new THREE.Group();

    var chassisGeo = new THREE.BoxGeometry(2.1, 1.0, 4.4);
    var wireMat = new THREE.LineBasicMaterial({ color: 0x9fb6c9, transparent: true, opacity: 1.0 });
    var wire = new THREE.LineSegments(new THREE.EdgesGeometry(chassisGeo), wireMat);
    wire.position.y = 0.9;
    car.add(wire);

    var primerColor = new THREE.Color(0x9aa0a6);
    var targetColor = new THREE.Color(paintColor || 0xd6202f);
    var bodyMat = new THREE.MeshStandardMaterial({ color: primerColor.clone(), metalness: 0.55, roughness: 0.5 });

    var bodyLow = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.85, 4.3), bodyMat);
    bodyLow.position.y = 0.85;
    var cabin = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.65, 2.1), bodyMat);
    cabin.position.set(0, 1.55, -0.15);

    var body = new THREE.Group(); body.add(bodyLow, cabin);
    body.scale.set(0.001, 0.001, 0.001);
    car.add(body);

    var glassMat = new THREE.MeshPhysicalMaterial({ color: 0x1b2733, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.85 });
    var windows = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.4, 2.0), glassMat);
    windows.position.set(0, 1.72, -0.15);
    windows.scale.set(0.001, 0.001, 0.001);
    car.add(windows);

    var tireMat = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.85 });
    var rimMat = new THREE.MeshStandardMaterial({ color: 0xbfc4c9, metalness: 0.9, roughness: 0.25 });
    var wheels = new THREE.Group();
    [[-1.05, -1.4], [1.05, -1.4], [-1.05, 1.5], [1.05, 1.5]].forEach(function(pos) {
      var w = new THREE.Group();
      var tire = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.32, 12), tireMat);
      tire.rotation.z = Math.PI / 2;
      var rim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.34, 8), rimMat);
      rim.rotation.z = Math.PI / 2;
      w.add(tire); w.add(rim);
      w.position.set(pos[0], 0.42, pos[1]);
      wheels.add(w);
    });
    wheels.scale.set(0.001, 0.001, 0.001);
    car.add(wheels);

    var lightMat = new THREE.MeshStandardMaterial({ color: 0xfff7e0, emissive: 0xfff2c0, emissiveIntensity: 0 });
    var headlights = new THREE.Group();
    [[-0.75, 2.15], [0.75, 2.15]].forEach(function(pos) {
      var hl = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), lightMat);
      hl.position.set(pos[0], 0.95, pos[1]);
      headlights.add(hl);
    });
    car.add(headlights);

    return {
      group: car,
      wireMat: wireMat,
      body: body,
      bodyMat: bodyMat,
      windows: windows,
      wheels: wheels,
      lightMat: lightMat,
      primerColor: primerColor,
      targetColor: targetColor
    };
  }

  function floorStripe(lineGroup, x1, z1, x2, z2, colorHex, width) {
    width = width || 0.35;
    var len = Math.hypot(x2 - x1, z2 - z1);
    var geo = new THREE.PlaneGeometry(width, len);
    var mat = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.85 });
    var m = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set((x1 + x2) / 2, 0.02, (z1 + z2) / 2);
    m.rotation.z = Math.atan2(x2 - x1, z2 - z1);
    lineGroup.add(m);
  }

  function buildAssemblyLine(x, y, z, length, angle) {
    var lineGroup = new THREE.Group();

    var conveyorMat = new THREE.MeshStandardMaterial({ color: 0x30353d, metalness: 0.6, roughness: 0.45 });
    var rollerMat   = new THREE.MeshStandardMaterial({ color: 0x555c66, metalness: 0.85, roughness: 0.3 });
    var trussMat    = new THREE.MeshStandardMaterial({ color: 0x2b3038, metalness: 0.8, roughness: 0.4 });

    // Lattiaraidat
    floorStripe(lineGroup, -2.8, -length / 2, -2.8, length / 2, 0xffe15e, 0.12);
    floorStripe(lineGroup,  2.8, -length / 2,  2.8, length / 2, 0xffe15e, 0.12);

    // 5 Asemahaitaria/Zonea
    var ZONES = [
      { name: 'RUNKOASEMA',     from: -length / 2,                    to: -length / 2 + length * 0.2, color: 0x8fa0ad },
      { name: 'HITSAUS',         from: -length / 2 + length * 0.2,     to: -length / 2 + length * 0.4, color: 0xff8a3d },
      { name: 'MAALAAMO',        from: -length / 2 + length * 0.4,     to: -length / 2 + length * 0.6, color: 0x00f0ff },
      { name: 'KOKOONPANO',      from: -length / 2 + length * 0.6,     to: -length / 2 + length * 0.8, color: 0x7dff9e },
      { name: 'LAADUNVALVONTA',  from: -length / 2 + length * 0.8,     to:  length / 2,                color: 0xffe15e }
    ];

    ZONES.forEach(function(zZone) {
      var w = zZone.to - zZone.from;
      var geo = new THREE.PlaneGeometry(8.0, w);
      var mat = new THREE.MeshBasicMaterial({ color: zZone.color, transparent: true, opacity: 0.08 });
      var m = new THREE.Mesh(geo, mat);
      m.rotation.x = -Math.PI / 2;
      m.position.set(0, 0.015, zZone.from + w / 2);
      lineGroup.add(m);

      var colorStr = '#' + zZone.color.toString(16).padStart(6, '0');
      var spr = createLabelSprite(zZone.name, colorStr);
      spr.position.set(0, 8.5, zZone.from + w / 2);
      lineGroup.add(spr);
    });

    // Kuljetinpeti
    var bed = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.6, length), conveyorMat);
    bed.position.y = 0.3;
    lineGroup.add(bed);

    // Rullat
    var rollers = [];
    var rollerGeo = new THREE.CylinderGeometry(0.28, 0.28, 4.0, 8);
    for (var rZ = -length / 2 + 1; rZ <= length / 2 - 1; rZ += 1.6) {
      var roller = new THREE.Mesh(rollerGeo, rollerMat);
      roller.rotation.z = Math.PI / 2;
      roller.position.set(0, 0.62, rZ);
      lineGroup.add(roller);
      rollers.push(roller);
    }

    // Yläpuoliset ristikkorakenteet & Valaisimet
    for (var tZ = -length / 2 + 2; tZ <= length / 2 - 2; tZ += 8.0) {
      var beam = new THREE.Mesh(new THREE.BoxGeometry(10.0, 0.5, 0.5), trussMat);
      beam.position.set(0, 8.0, tZ);
      lineGroup.add(beam);

      var legL = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 8.0, 6), trussMat);
      legL.position.set(-5.0, 4.0, tZ);
      var legR = legL.clone(); legR.position.x = 5.0;
      lineGroup.add(legL); lineGroup.add(legR);
    }

    // MAALAAMOKOPPI (Paint Booth)
    var paintBoothZ = -length / 2 + length * 0.5;
    var boothMat = new THREE.MeshPhysicalMaterial({ color: 0x88c8ff, transparent: true, opacity: 0.16, roughness: 0.1, metalness: 0, side: THREE.DoubleSide });
    var boothFrameMat = new THREE.MeshStandardMaterial({ color: 0x21252c, metalness: 0.7, roughness: 0.4 });
    var boothGroup = new THREE.Group();

    var boothWallGeo = new THREE.PlaneGeometry(6.0, 6.0);
    [[-3.2, 0], [3.2, 0]].forEach(function(posArr) {
      var wall = new THREE.Mesh(boothWallGeo, boothMat);
      wall.rotation.y = Math.PI / 2;
      wall.position.set(posArr[0], 3.0, posArr[1]);
      boothGroup.add(wall);
    });
    [0, 6.0].forEach(function(h) {
      var frame = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.2, 6.0), boothFrameMat);
      frame.position.set(0, h, 0);
      boothGroup.add(frame);
    });
    boothGroup.position.set(0, 0, paintBoothZ);
    lineGroup.add(boothGroup);

    // Maalisuuttimet (Paint Nozzles)
    var nozzleMat = new THREE.MeshStandardMaterial({ color: 0x444a52, metalness: 0.8, roughness: 0.3 });
    var nozzles = [];
    for (var nz = paintBoothZ - 2.5; nz <= paintBoothZ + 2.5; nz += 1.8) {
      var nMesh = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.4, 8), nozzleMat);
      nMesh.position.set(0, 5.6, nz);
      nMesh.rotation.x = Math.PI;
      lineGroup.add(nMesh);
      nozzles.push(nMesh);
    }

    // LAADUNVALVONTA-SKANNERI
    var qcZ = -length / 2 + length * 0.9;
    var scanMat = new THREE.MeshBasicMaterial({ color: 0xffe15e, transparent: true, opacity: 0.7 });
    var scanBar = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.08, 0.08), scanMat);
    scanBar.position.set(0, 2.5, qcZ);
    lineGroup.add(scanBar);

    var scanLight = new THREE.PointLight(0xffe15e, 0, 10, 2);
    scanLight.position.copy(scanBar.position);
    lineGroup.add(scanLight);

    // Liikkuvat autojen korit
    var factoryCars = [];
    var paintColors = [0xd6202f, 0x1a63d1, 0x00f0ff, 0xf2b90c, 0x1f8a4c, 0x8a1fbf];

    for (var cIdx = 0; cIdx < 4; cIdx++) {
      var pCol = paintColors[Math.floor(Math.random() * paintColors.length)];
      var fCar = buildFactoryCar(pCol);
      var startZ = -length / 2 + (cIdx + 0.5) * (length / 4);
      fCar.group.position.set(0, 0.6, startZ);
      lineGroup.add(fCar.group);
      factoryCars.push({ car: fCar, posZ: startZ });
    }

    lineGroup.position.set(x, y, z);
    lineGroup.rotation.y = angle || 0;

    return {
      group: lineGroup,
      rollers: rollers,
      factoryCars: factoryCars,
      nozzles: nozzles,
      scanBar: scanBar,
      scanLight: scanLight,
      paintBoothZ: paintBoothZ,
      qcZ: qcZ,
      length: length,
      x: x, y: y, z: z, angle: angle || 0,
      paintColors: paintColors
    };
  }

  /* ---------------------------------------------------------------
     6. LÄPINÄKYVÄ LASIPUTKITUNNELI
  --------------------------------------------------------------- */
  function buildGlassTubeTunnel(track) {
    var tunnelGroup = new THREE.Group();
    if (!track) return tunnelGroup;

    var tunnelSamples = [];
    for (var i = 0; i < track.n; i++) {
      if (track.samples[i] && track.samples[i].isTunnel) tunnelSamples.push(i);
    }
    if (tunnelSamples.length < 2) return tunnelGroup;

    var glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xe0f2fe, transmission: 0.92, opacity: 0.38, transparent: true, roughness: 0.05, ior: 1.45, side: THREE.DoubleSide
    });

    var ringMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7, emissive: 0x00f0ff, emissiveIntensity: 0.6, metalness: 0.8, roughness: 0.2
    });

    var radius = track.ROAD_HALF_WIDTH ? (track.ROAD_HALF_WIDTH + 1.2) : 5.2;

    for (var idx = 0; idx < tunnelSamples.length - 1; idx++) {
      var s1 = track.samples[tunnelSamples[idx]];
      var s2 = track.samples[tunnelSamples[idx + 1]];

      var y1 = s1.y + (track.ROAD_ELEVATION || 0.22);
      var y2 = s2.y + (track.ROAD_ELEVATION || 0.22);

      var p1 = new THREE.Vector3(s1.x, y1 + 1.2, s1.z);
      var p2 = new THREE.Vector3(s2.x, y2 + 1.2, s2.z);

      var segLen = p1.distanceTo(p2);
      var mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);

      var tubeGeo = new THREE.CylinderGeometry(radius, radius, segLen, 16, 1, true);
      var tubeMesh = new THREE.Mesh(tubeGeo, glassMat);

      tubeMesh.position.copy(mid);
      tubeMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3().subVectors(p2, p1).normalize());
      tunnelGroup.add(tubeMesh);

      if (idx % 3 === 0) {
        var ringGeo = new THREE.TorusGeometry(radius + 0.15, 0.22, 12, 20);
        var ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.position.copy(mid);
        ringMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3().subVectors(p2, p1).normalize());
        tunnelGroup.add(ringMesh);
      }
    }

    return tunnelGroup;
  }

  /* ---------------------------------------------------------------
     7. KEMIKAALISÄILIÖT JA HOLOGRAMMINÄYTÖT
  --------------------------------------------------------------- */
  function buildChemicalTank(x, y, z, height, radius, colorHex) {
    var tankGroup = new THREE.Group();

    var glassMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 0.9, opacity: 1.0, transparent: true, roughness: 0.05 });
    var liquidMat = new THREE.MeshStandardMaterial({ color: colorHex, emissive: colorHex, emissiveIntensity: 0.6, roughness: 0.1 });
    var metalMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });

    var glass = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 16), glassMat);
    glass.position.y = height / 2;
    tankGroup.add(glass);

    var liquid = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.92, radius * 0.92, height * 0.8, 16), liquidMat);
    liquid.position.y = (height * 0.8) / 2;
    tankGroup.add(liquid);

    var capBottom = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.1, radius * 1.1, 0.3, 16), metalMat);
    capBottom.position.y = 0.15;
    var capTop = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.1, radius * 1.1, 0.3, 16), metalMat);
    capTop.position.y = height + 0.15;
    tankGroup.add(capBottom); tankGroup.add(capTop);

    tankGroup.position.set(x, y, z);

    return { group: tankGroup, height: height };
  }

  /* ---------------------------------------------------------------
     PÄÄBUILDERI: WINDOW.ENV_BUILDERS['autotehdas']
  --------------------------------------------------------------- */
  window.ENV_BUILDERS['autotehdas'] = function(track, bounds, ctx) {
    var factoryGroup = new THREE.Group();

    var isNight = (ctx.currentTimeOfDay === 'yo');
    var isWinter = (ctx.currentSeason === 'talvi');
    
    // Tehdasrakennuksen mitat
    var facWidth = bounds.size * 1.55;
    var facLength = bounds.size * 1.55;
    var roofY = 26.0;
    var innerBoundX = facWidth / 2 - 12.0;
    var innerBoundZ = facLength / 2 - 12.0;

    // --- A. EPOKSILATTIA TEHDASLATTIA.JPG TEKSTUURILLA + FALLBACK (NOSTETTU y = 0.05) ---
    var floorGeo = new THREE.PlaneGeometry(facWidth, facLength);
    var floorTex = null;

    if (ctx.texturesEnabled && typeof ctx.loadTextureWithFallback === 'function') {
      floorTex = ctx.loadTextureWithFallback('tehdaslattia.jpg', facWidth / 12, facLength / 12, '#181c22', 'TEHDAS');
    }

    if (!floorTex || !floorTex.image) {
      floorTex = createFactoryFloorFallbackTex(facWidth, facLength);
    }

    var floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      color: isWinter ? 0xdbeafe : 0xffffff,
      roughness: 0.25,
      metalness: 0.2
    });

    var floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.set(bounds.cx, 0.05, bounds.cz); // Nosto korkeudelle y = 0.05, jottei jää maaston alle!
    floorMesh.receiveShadow = true;
    factoryGroup.add(floorMesh);

    // --- B. TEHTAAN ULKOSEINÄT ---
    var wallMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.6,
      metalness: 0.4,
      side: THREE.DoubleSide
    });

    var wallStripeMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      emissive: 0x00f0ff,
      emissiveIntensity: 0.4
    });

    function createWall(w, d, x, z, ry) {
      var wGroup = new THREE.Group();
      var mesh = new THREE.Mesh(new THREE.BoxGeometry(w, roofY, d), wallMat);
      mesh.position.y = roofY / 2;
      mesh.castShadow = true; mesh.receiveShadow = true;
      wGroup.add(mesh);

      var stripe = new THREE.Mesh(new THREE.BoxGeometry(w + 0.1, 0.4, d + 0.1), wallStripeMat);
      stripe.position.y = roofY * 0.7;
      wGroup.add(stripe);

      wGroup.position.set(x, 0, z);
      wGroup.rotation.y = ry || 0;
      return wGroup;
    }

    // Seinät
    factoryGroup.add(createWall(facWidth, 1.2, bounds.cx, bounds.cz - facLength / 2, 0));
    factoryGroup.add(createWall(facWidth, 1.2, bounds.cx, bounds.cz + facLength / 2, 0));
    factoryGroup.add(createWall(1.2, facLength, bounds.cx - facWidth / 2, bounds.cz, 0));
    factoryGroup.add(createWall(1.2, facLength, bounds.cx + facWidth / 2, bounds.cz, 0));

    // --- C. TEHTAAN KATTO ---
    var roofMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.7,
      metalness: 0.3,
      side: THREE.DoubleSide
    });

    var roofMesh = new THREE.Mesh(new THREE.BoxGeometry(facWidth + 2.0, 1.0, facLength + 2.0), roofMat);
    roofMesh.position.set(bounds.cx, roofY + 0.5, bounds.cz);
    roofMesh.castShadow = true;
    factoryGroup.add(roofMesh);

    // Katon tuki-ristikot
    var trussMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });
    for (var tz = bounds.cz - facLength / 2 + 18; tz < bounds.cz + facLength / 2; tz += 28.0) {
      var trussBeam = new THREE.Mesh(new THREE.BoxGeometry(facWidth, 1.2, 0.8), trussMat);
      trussBeam.position.set(bounds.cx, roofY - 0.6, tz);
      factoryGroup.add(trussBeam);
    }

    // --- D. ILMASTOINTIPUTKET ---
    var pipeMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.25 });
    var pipeJointMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.9, roughness: 0.2 });

    for (var px = bounds.cx - facWidth / 3; px <= bounds.cx + facWidth / 3; px += facWidth / 3) {
      var pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, facLength, 20), pipeMat);
      pipe.rotation.x = Math.PI / 2;
      pipe.position.set(px, roofY - 2.2, bounds.cz);
      factoryGroup.add(pipe);

      for (var pz = bounds.cz - facLength / 2 + 10; pz < bounds.cz + facLength / 2; pz += 20.0) {
        var ring = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.12, 12, 20), pipeJointMat);
        ring.position.set(px, roofY - 2.2, pz);
        factoryGroup.add(ring);
      }
    }

    // --- E. KATTO-VALAISIMET (OPTIMOITU KORJAUS: EI WEBGL-YLIKUORMITUSTA) ---
    var lampMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9 });
    var lampBulbMat = new THREE.MeshStandardMaterial({ color: 0xfff0cc, emissive: 0xfff0cc, emissiveIntensity: 2.0 });

    for (var lx = bounds.cx - innerBoundX + 20; lx <= bounds.cx + innerBoundX - 20; lx += 32.0) {
      for (var lz = bounds.cz - innerBoundZ + 20; lz <= bounds.cz + innerBoundZ - 20; lz += 32.0) {
        var fixture = new THREE.Group();
        var cap = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.4, 0.8, 12), lampMat);
        var bulb = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.1, 12), lampBulbMat);
        bulb.position.y = -0.4;
        fixture.add(cap); fixture.add(bulb);
        fixture.position.set(lx, roofY - 1.2, lz);
        factoryGroup.add(fixture);
      }
    }

    // 4 hallin päävaloa katossa
    var hallLightColor = 0xfff0cc;
    var hallLightIntensity = isNight ? 1.8 : 1.2;
    var quadX = innerBoundX * 0.4;
    var quadZ = innerBoundZ * 0.4;

    [[-quadX, -quadZ], [quadX, -quadZ], [-quadX, quadZ], [quadX, quadZ]].forEach(function(pos) {
      var hLight = new THREE.PointLight(hallLightColor, hallLightIntensity, facWidth * 0.8, 1.5);
      hLight.position.set(bounds.cx + pos[0], roofY - 4.0, bounds.cz + pos[1]);
      factoryGroup.add(hLight);
    });

    // --- F. JÄTTITESLA-KELAT (3 KPL Varmistetulla sijoituksella) ---
    var teslaCoils = [];
    var numTesla = 3;

    for (var t = 0; t < numTesla; t++) {
      var tx = bounds.cx, tz = bounds.cz;
      var placed = false;

      for (var attempt = 0; attempt < 80; attempt++) {
        var candX = bounds.cx + (Math.random() * 2 - 1) * innerBoundX * 0.75;
        var candZ = bounds.cz + (Math.random() * 2 - 1) * innerBoundZ * 0.75;
        var infoCand = ctx.closestSampleInfo(track, candX, candZ);
        if (infoCand.dist >= ctx.ROAD_HALF_WIDTH + ctx.CURB_WIDTH + 6.0) {
          tx = candX; tz = candZ;
          placed = true;
          break;
        }
      }

      if (!placed) {
        tx = bounds.cx + (t - 1) * 35.0;
        tz = bounds.cz + (t % 2 === 0 ? 35.0 : -35.0);
      }

      var groundY = ctx.terrainSample(track, tx, tz).y;
      var tc = buildTeslaCoil(tx, groundY, tz, 0.85 + Math.random() * 0.2);
      factoryGroup.add(tc.group);
      teslaCoils.push(tc);
    }

    // --- G. SARJATUOTANTO-LIUKUHIHNAT (3 KPL Varmistetulla sijoituksella) ---
    var assemblyLines = [];
    var numLines = 3;

    for (var al = 0; al < numLines; al++) {
      var alx = bounds.cx, alz = bounds.cz;
      var placedAL = false;

      for (var attempt = 0; attempt < 80; attempt++) {
        var candX = bounds.cx + (Math.random() * 2 - 1) * innerBoundX * 0.7;
        var candZ = bounds.cz + (Math.random() * 2 - 1) * innerBoundZ * 0.7;
        var infoCand = ctx.closestSampleInfo(track, candX, candZ);
        if (infoCand.dist >= ctx.ROAD_HALF_WIDTH + ctx.CURB_WIDTH + 8.0) {
          alx = candX; alz = candZ;
          placedAL = true;
          break;
        }
      }

      if (!placedAL) {
        alx = bounds.cx + (al - 1) * 45.0;
        alz = bounds.cz + (al % 2 === 0 ? -40.0 : 40.0);
      }

      var ly = ctx.terrainSample(track, alx, alz).y;
      var line = buildAssemblyLine(alx, ly, alz, 32.0, Math.random() * Math.PI * 2);
      factoryGroup.add(line.group);
      assemblyLines.push(line);
    }

    // --- H. TEOLLISUUSROBOTIT IR-6600 PRO ---
    var robots = [];

    // 1. Robotit Maaliviivalla (Sample 0)
    var s0 = track.samples[0];
    if (s0) {
      var perp0 = new THREE.Vector3(-s0.tz, 0, s0.tx).normalize();
      var sideDist0 = ctx.ROAD_HALF_WIDTH + ctx.CURB_WIDTH + 1.8;
      var rot0 = Math.atan2(s0.tx, s0.tz);

      var ry0 = ctx.getRoadSurfaceHeight ? ctx.getRoadSurfaceHeight(track, s0.x, s0.z) : s0.y;

      var botGoalLeft = buildIndustrialRobot(s0.x + perp0.x * sideDist0, ry0, s0.z + perp0.z * sideDist0, rot0 - Math.PI / 2);
      var botGoalRight = buildIndustrialRobot(s0.x - perp0.x * sideDist0, ry0, s0.z - perp0.z * sideDist0, rot0 + Math.PI / 2);

      factoryGroup.add(botGoalLeft.group);
      factoryGroup.add(botGoalRight.group);
      robots.push(botGoalLeft);
      robots.push(botGoalRight);
    }

    // 2. Robotit Liukuhihnojen vieressä (2 robottia per liukuhihna)
    assemblyLines.forEach(function(line) {
      var linePerpX = -Math.cos(line.angle);
      var linePerpZ = Math.sin(line.angle);

      var botLineLeft = buildIndustrialRobot(line.x + linePerpX * 2.8, line.y, line.z + linePerpZ * 2.8, line.angle + Math.PI / 2);
      var botLineRight = buildIndustrialRobot(line.x - linePerpX * 2.8, line.y, line.z - linePerpZ * 2.8, line.angle - Math.PI / 2);

      factoryGroup.add(botLineLeft.group);
      factoryGroup.add(botLineRight.group);
      robots.push(botLineLeft);
      robots.push(botLineRight);
    });

    // --- I. LÄPINÄKYVÄ LASIPUTKITUNNELI ---
    var glassTunnelGroup = buildGlassTubeTunnel(track);
    factoryGroup.add(glassTunnelGroup);

    // --- J. KEMIKAALISÄILIÖT & HOLOGRAMMIT ---
    var tankColors = [0x00f0ff, 0xff00aa, 0x10b981, 0xa855f7];
    for (var tk = 0; tk < 8; tk++) {
      var kx = bounds.cx + (Math.random() * 2 - 1) * innerBoundX * 0.8;
      var kz = bounds.cz + (Math.random() * 2 - 1) * innerBoundZ * 0.8;

      var infoTk = ctx.closestSampleInfo(track, kx, kz);
      if (infoTk.dist < ctx.ROAD_HALF_WIDTH + ctx.CURB_WIDTH + 4.5) continue;

      var ky = ctx.terrainSample(track, kx, kz).y;
      var tank = buildChemicalTank(kx, ky, kz, 6.0 + Math.random() * 4.0, 1.4, tankColors[tk % tankColors.length]);
      factoryGroup.add(tank.group);
    }

    var holoTitles = ["FACTORY TEST IN PROGRESS", "HAZARD LEVEL 4", "SYSTEM OPTIMAL"];
    for (var h = 0; h < 3; h++) {
      var hx = bounds.cx + (Math.random() * 2 - 1) * innerBoundX * 0.7;
      var hz = bounds.cz + (Math.random() * 2 - 1) * innerBoundZ * 0.7;

      var infoH = ctx.closestSampleInfo(track, hx, hz);
      if (infoH.dist < ctx.ROAD_HALF_WIDTH + ctx.CURB_WIDTH + 5.0) continue;

      var hy = ctx.terrainSample(track, hx, hz).y;
      var holoTex = createHologramTex(holoTitles[h % holoTitles.length], "AUTO-FACTORY v4.2", "#00f0ff");
      var holoMesh = new THREE.Mesh(new THREE.PlaneGeometry(8.0, 4.0), new THREE.MeshBasicMaterial({ map: holoTex, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
      holoMesh.position.set(hx, hy + 6.5, hz);
      holoMesh.rotation.y = Math.random() * Math.PI * 2;
      factoryGroup.add(holoMesh);
    }

    // --- K. HIUKKASJÄRJESTELMÄT JA AKTIIVISET SALAMAT ---
    var sparksSystem = new Particles(300, 0.16, 0.95);
    var spraySystem = new Particles(350, 0.24, 0.55);
    factoryGroup.add(sparksSystem.points);
    factoryGroup.add(spraySystem.points);

    var sparkColor1 = new THREE.Color(0xffb15e);
    var sparkColor2 = new THREE.Color(0xffe98a);

    var activeArcGroup = new THREE.Group();
    factoryGroup.add(activeArcGroup);
    var activeBolts = [];

    // --- L. ANIMAATIOSILMUKKA ---
    var updateAutotehdasAnimation = function(delta, time) {
      if (!delta || delta > 0.1) delta = 0.016;
      var nowSec = time || (performance.now() * 0.001);

      // Hiukkasten päivitys
      sparksSystem.update(delta);
      spraySystem.update(delta);

      // 1. Robotit - Animaatio, hitsausvalot ja kipinät
      robots.forEach(function(bot) {
        bot.animTime = (bot.animTime + delta * 0.45) % bot.totalDur;

        var acc = 0, segIdx = 0, localF = 0;
        for (var i = 0; i < bot.segDur.length; i++) {
          if (bot.animTime < acc + bot.segDur[i]) {
            segIdx = i;
            localF = (bot.animTime - acc) / bot.segDur[i];
            break;
          }
          acc += bot.segDur[i];
        }

        var fromP = bot.keyPoses[bot.keySeq[segIdx]];
        var toP   = bot.keyPoses[bot.keySeq[segIdx + 1]];
        var pose  = lerpPose(fromP, toP, easeInOut(Math.max(0, Math.min(1, localF))));

        bot.turret.rotation.y = THREE.MathUtils.degToRad(pose[0]);
        bot.shoulderPivot.rotation.z = THREE.MathUtils.degToRad(pose[1]);
        bot.elbowPivot.rotation.z = THREE.MathUtils.degToRad(-pose[2] * 0.55);
        bot.wrist1.rotation.y = THREE.MathUtils.degToRad(pose[3]);
        bot.wrist2.rotation.z = THREE.MathUtils.degToRad(-pose[4]);
        bot.flange.rotation.y = THREE.MathUtils.degToRad(pose[5]);

        var openAmt = pose[6];
        bot.fingerL.position.x = -0.06 - openAmt * 0.05;
        bot.fingerR.position.x = 0.06 + openAmt * 0.05;

        var isWelding = (bot.keySeq[segIdx] === 'grip' || bot.keySeq[segIdx] === 'down');
        bot.tipMat.emissiveIntensity = isWelding ? (1.5 + Math.random() * 2.0) : 0;

        if (isWelding && Math.random() < 0.65) {
          var tipWorldPos = new THREE.Vector3();
          bot.tipMesh.getWorldPosition(tipWorldPos);
          for (var sp = 0; sp < 2; sp++) {
            var vel = new THREE.Vector3(
              (Math.random() - 0.5) * 3.5,
              Math.random() * 3.0 + 0.5,
              (Math.random() - 0.5) * 3.5
            );
            var col = Math.random() > 0.5 ? sparkColor1 : sparkColor2;
            sparksSystem.spawn(tipWorldPos, vel, col, 0.35 + Math.random() * 0.3);
          }
        }
      });

      // 2. Liukuhihnat, Autot, Maalisumu ja QC-Laseri
      assemblyLines.forEach(function(line) {
        line.rollers.forEach(function(r) { r.rotation.x += delta * 3.5; });

        // Maalisuuttimien heilahtelu
        line.nozzles.forEach(function(n, idx) {
          n.position.x = Math.sin(nowSec * 2.5 + idx) * 1.5;
        });

        line.factoryCars.forEach(function(fc) {
          fc.posZ += delta * 1.2;
          if (fc.posZ > line.length / 2) {
            fc.posZ = -line.length / 2;
            fc.car.targetColor = new THREE.Color(line.paintColors[Math.floor(Math.random() * line.paintColors.length)]);
          }
          fc.car.group.position.z = fc.posZ;

          var stage = (fc.posZ + line.length / 2) / line.length;

          // Runkovaihe
          var bodyT = THREE.MathUtils.smoothstep(stage, 0.16, 0.34);
          fc.car.body.scale.setScalar(0.001 + bodyT * 0.999);
          fc.car.wireMat.opacity = 1.0 - bodyT;

          // Maalausvaihe & Maalisumu
          var paintT = THREE.MathUtils.smoothstep(stage, 0.36, 0.55);
          fc.car.bodyMat.color.copy(fc.car.primerColor).lerp(fc.car.targetColor, paintT);

          if (stage > 0.36 && stage < 0.58 && Math.random() < 0.6) {
            var worldCarPos = new THREE.Vector3();
            fc.car.group.getWorldPosition(worldCarPos);
            var sprayPos = new THREE.Vector3(
              worldCarPos.x + (Math.random() - 0.5) * 1.8,
              worldCarPos.y + 2.8,
              worldCarPos.z + (Math.random() - 0.5) * 1.8
            );
            var sprayVel = new THREE.Vector3(
              (Math.random() - 0.5) * 0.5,
              -2.5 - Math.random(),
              (Math.random() - 0.5) * 0.5
            );
            spraySystem.spawn(sprayPos, sprayVel, fc.car.targetColor, 0.6 + Math.random() * 0.4);
          }

          // Kokoonpano
          var asmT = THREE.MathUtils.smoothstep(stage, 0.56, 0.72);
          fc.car.wheels.scale.setScalar(0.001 + asmT * 0.999);
          fc.car.windows.scale.setScalar(0.001 + asmT * 0.999);
          fc.car.lightMat.emissiveIntensity = asmT * 1.6;
        });

        // QC-skanneri
        var scanY = 1.6 + (Math.sin(nowSec * 3.0) * 0.5 + 0.5) * 2.2;
        line.scanBar.position.y = scanY;
        line.scanLight.position.y = scanY;

        var carInScan = line.factoryCars.some(function(fc) { return Math.abs(fc.posZ - (line.qcZ || (line.length * 0.4))) < 2.5; });
        line.scanLight.intensity = carInScan ? 2.5 : 0;
        line.scanBar.material.opacity = carInScan ? 0.95 : 0.3;
      });

      // 3. Tesla-käämit & Salamointi
      for (var i = activeBolts.length - 1; i >= 0; i--) {
        if (!activeBolts[i].update(delta)) {
          activeBolts[i].dispose();
          activeBolts.splice(i, 1);
        }
      }

      teslaCoils.forEach(function(tc) {
        tc.strikeTimer -= delta;
        if (tc.arcLight) {
          tc.arcLight.intensity = Math.max(0, tc.arcLight.intensity - delta * 8.0);
        }

        if (tc.strikeTimer <= 0) {
          tc.strikeTimer = 0.5 + Math.random() * 1.2;
          tc.arcLight.intensity = 4.5;

          var targetEnd;
          if (Math.random() < 0.5 && teslaCoils.length > 1) {
            var other = teslaCoils[Math.floor(Math.random() * teslaCoils.length)];
            targetEnd = other.toroidPos.clone();
          } else {
            targetEnd = tc.toroidPos.clone().add(new THREE.Vector3(
              (Math.random() - 0.5) * 12.0,
              -tc.toroidPos.y + 0.2,
              (Math.random() - 0.5) * 12.0
            ));
          }

          var bolt = new Bolt(activeArcGroup, tc.toroidPos, targetEnd, 0xa78bfa);
          activeBolts.push(bolt);

          // Salamakipinät osumapisteessä
          for (var bsp = 0; bsp < 4; bsp++) {
            var bVel = new THREE.Vector3((Math.random() - 0.5) * 4, Math.random() * 3 + 1, (Math.random() - 0.5) * 4);
            sparksSystem.spawn(targetEnd, bVel, sparkColor2, 0.4 + Math.random() * 0.3);
          }
        }
      });
    };

    factoryGroup.userData.update = updateAutotehdasAnimation;

    return factoryGroup;
  };
})();