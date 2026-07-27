// env_hitech.js - Hi-Tech futuristisen kaupunkiympäristön 3D-määritelmä
(function() {
  window.ENV_BUILDERS = window.ENV_BUILDERS || {};

  // Erittäin värikäs proseduraalinen cyberpunk/hi-tech ikkunafallback-tekstuuri
  function createHitechFallbackTex(baseColorHex) {
    var c = document.createElement('canvas'); c.width = 128; c.height = 256;
    var ctxCanvas = c.getContext('2d');
    ctxCanvas.fillStyle = baseColorHex || '#0f172a';
    ctxCanvas.fillRect(0, 0, 128, 256);

    // Neonraitoja ja piirilevykuviointia
    ctxCanvas.strokeStyle = 'rgba(0, 240, 255, 0.8)';
    ctxCanvas.lineWidth = 2;
    for (var y = 10; y < 250; y += 25) {
      ctxCanvas.beginPath();
      ctxCanvas.moveTo(0, y);
      ctxCanvas.lineTo(128, y);
      ctxCanvas.stroke();
    }

    var hitechColors = [
      'rgba(255, 0, 170, 0.95)', // Neon Magenta
      'rgba(0, 240, 255, 0.95)',  // Neon Cyan
      'rgba(255, 220, 0, 0.95)',  // Neon Keltainen
      'rgba(0, 255, 136, 0.95)',  // Neon Vihreä
      'rgba(168, 85, 247, 0.95)'  // Sähköpurppura
    ];

    for (var y = 20; y < 240; y += 35) {
      for (var x = 8; x < 120; x += 22) {
        if (Math.random() < 0.75) {
          ctxCanvas.fillStyle = hitechColors[Math.floor(Math.random() * hitechColors.length)];
          ctxCanvas.fillRect(x, y, 14, 8);
        }
      }
    }
    var tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  window.ENV_BUILDERS['hitech'] = function(track, bounds, ctx) {
    var hitechGroup = new THREE.Group();

    var bldgColors = ['#090d16', '#0f172a', '#111827', '#1e1b4b', '#022c22', '#172554'];
    var neonColors = [0x00f0ff, 0xff00aa, 0x00ff88, 0xa855f7, 0xff6600, 0x38bdf8];

    var numBuildings = 140;
    var halfSize = bounds.size / 2 * 0.95;
    var exclR = ctx.ROAD_HALF_WIDTH + ctx.CURB_WIDTH + 3.0;

    var texPaths = ctx.HITECH_TEXTURE_PATHS || [];
    var carTexPaths = ctx.CAR_TEXTURE_PATHS || [];

    var placedCount = 0;
    var maxAttempts = numBuildings * 6;
    var attempts = 0;

    // --- FUTURISTISET PILVENPIIRTÄJÄT ---
    while (placedCount < numBuildings && attempts < maxAttempts) {
      attempts++;
      var x = bounds.cx + (Math.random() * 2 - 1) * halfSize;
      var z = bounds.cz + (Math.random() * 2 - 1) * halfSize;

      var bw = 8 + Math.random() * 14;
      var bd = 8 + Math.random() * 14;
      var bh = 25 + Math.floor(Math.pow(Math.random(), 1.6) * 85);

      var bRadius = Math.sqrt(bw * bw + bd * bd) / 2.0;
      var info = ctx.closestSampleInfo(track, x, z);
      if (info.dist < exclR + bRadius) continue;

      placedCount++;

      var baseColor = bldgColors[Math.floor(Math.random() * bldgColors.length)];

      var hitechTex = null;
      if (ctx.texturesEnabled && texPaths.length > 0 && typeof ctx.loadTextureWithFallback === 'function') {
        var texPath = texPaths[Math.floor(Math.random() * texPaths.length)];
        hitechTex = ctx.loadTextureWithFallback(texPath, 1, Math.max(1, Math.floor(bh / 8)), baseColor, 'HITECH');
      } else {
        hitechTex = createHitechFallbackTex(baseColor);
        hitechTex.repeat.set(1, Math.max(1, Math.floor(bh / 8)));
      }

      var bMat = new THREE.MeshStandardMaterial({
        color: baseColor,
        map: hitechTex,
        roughness: 0.15,
        metalness: 0.85
      });

      // Torni (monikulmio tai laatikko)
      var bldgGeo;
      var shapeType = Math.random();
      if (shapeType < 0.35) {
        bldgGeo = new THREE.CylinderGeometry(bw * 0.45, bw * 0.55, bh, 8);
      } else if (shapeType < 0.65) {
        bldgGeo = new THREE.CylinderGeometry(bw * 0.3, bw * 0.6, bh, 6);
      } else {
        bldgGeo = new THREE.BoxGeometry(bw, bh, bd);
      }

      var bMesh = new THREE.Mesh(bldgGeo, bMat);
      var groundY = ctx.terrainSample(track, x, z).y;
      bMesh.position.set(x, groundY + bh / 2, z);
      bMesh.castShadow = true;
      bMesh.receiveShadow = true;
      hitechGroup.add(bMesh);

      // Valoreunukset & Hohtavat neontangot
      if (Math.random() < 0.6) {
        var neonCol = neonColors[Math.floor(Math.random() * neonColors.length)];
        var stripeGeo = new THREE.CylinderGeometry(0.18, 0.18, bh * 1.02, 6);
        var stripeMat = new THREE.MeshBasicMaterial({ color: neonCol });
        var stripeMesh = new THREE.Mesh(stripeGeo, stripeMat);
        stripeMesh.position.set(x + (Math.random() - 0.5) * bw * 0.8, groundY + bh / 2, z + (Math.random() - 0.5) * bd * 0.8);
        hitechGroup.add(stripeMesh);
      }

      // Huippuantennit ja hohtavat energiapallot
      if (bh > 45 && Math.random() < 0.75) {
        var ant = new THREE.Mesh(
          new THREE.CylinderGeometry(0.1, 0.3, 10, 6),
          new THREE.MeshStandardMaterial({ color: 0x8899aa, metalness: 0.9, roughness: 0.2 })
        );
        ant.position.set(x, groundY + bh + 5, z);
        hitechGroup.add(ant);

        var orbCol = neonColors[Math.floor(Math.random() * neonColors.length)];
        var orb = new THREE.Mesh(
          new THREE.SphereGeometry(1.2, 12, 12),
          new THREE.MeshBasicMaterial({ color: orbCol })
        );
        orb.position.set(x, groundY + bh + 10, z);
        hitechGroup.add(orb);
      }

      // Leijuvat neonrenkaat tornien ympärillä
      if (Math.random() < 0.3) {
        var ringCol = neonColors[Math.floor(Math.random() * neonColors.length)];
        var ringGeo = new THREE.TorusGeometry(bw * 0.75, 0.2, 8, 24);
        var ringMat = new THREE.MeshBasicMaterial({ color: ringCol });
        var ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = Math.PI / 2;
        ringMesh.position.set(x, groundY + bh * (0.3 + Math.random() * 0.6), z);
        hitechGroup.add(ringMesh);
      }
    }

    // --- KATUVALOT RADAN VARRELLE (Turvallinen etäisyys radasta) ---
    var lampStep = 5;
    var lampGeo = new THREE.CylinderGeometry(0.1, 0.15, 5.0, 6);
    lampGeo.translate(0, 2.5, 0);
    var lampHeadGeo = new THREE.BoxGeometry(1.2, 0.2, 0.5);
    lampHeadGeo.translate(0, 5.0, 0.4);

    var lampMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.2 });
    var lampOffsetR = ctx.ROAD_HALF_WIDTH + ctx.CURB_WIDTH + 1.8;

    for (var i = 0; i < track.n; i += lampStep) {
      var s = track.samples[i];
      var perp = new THREE.Vector3(-s.tz, 0, s.tx).normalize();
      var side = (Math.floor(i / lampStep) % 2 === 0) ? 1 : -1;

      var lx = s.x + perp.x * lampOffsetR * side;
      var lz = s.z + perp.z * lampOffsetR * side;
      var ly = ctx.getRoadSurfaceHeight(track, lx, lz);

      var neonCol = neonColors[Math.floor(Math.random() * neonColors.length)];
      var lampLightMat = new THREE.MeshBasicMaterial({ color: neonCol });

      var post = new THREE.Mesh(lampGeo, lampMat);
      post.position.set(lx, ly, lz);
      
      var head = new THREE.Mesh(lampHeadGeo, lampLightMat);
      head.position.set(lx, ly, lz);
      head.rotation.y = Math.atan2(s.tx, s.tz);

      hitechGroup.add(post);
      hitechGroup.add(head);
    }

    // --- TAIVAALLA LENTÄVÄT LENTO-ALUKSET ---
    var flyingShips = [];
    var numShips = 35;

    for (var f = 0; f < numShips; f++) {
      var shipGroup = new THREE.Group();

      var shipColor = neonColors[Math.floor(Math.random() * neonColors.length)];

      var shipMat = new THREE.MeshStandardMaterial({
        color: shipColor,
        roughness: 0.2,
        metalness: 0.8
      });

      if (ctx.texturesEnabled && carTexPaths.length > 1 && typeof ctx.loadTextureWithFallback === 'function') {
        var randomTexObj = carTexPaths[1 + Math.floor(Math.random() * (carTexPaths.length - 1))];
        if (randomTexObj && randomTexObj.url) {
          var cTex = ctx.loadTextureWithFallback(randomTexObj.url, 1, 1, shipColor, 'SHIP');
          if (cTex) shipMat.map = cTex;
        }
      }

      // Aluksen aerodynaaminen kiilamainen runko
      var bodyGeo = new THREE.ConeGeometry(1.2, 4.2, 5);
      bodyGeo.rotateX(Math.PI / 2);
      var bodyMesh = new THREE.Mesh(bodyGeo, shipMat);
      shipGroup.add(bodyMesh);

      // Siivet
      var wingGeo = new THREE.BoxGeometry(4.5, 0.1, 1.4);
      wingGeo.translate(0, 0, -0.5);
      var wingMesh = new THREE.Mesh(wingGeo, shipMat);
      shipGroup.add(wingMesh);

      // Hohtavat moottorisuihkut
      var glowGeo = new THREE.CylinderGeometry(0.4, 0.1, 1.2, 8);
      glowGeo.rotateX(Math.PI / 2);
      glowGeo.translate(0, 0, -2.4);
      var glowMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
      var glowMesh = new THREE.Mesh(glowGeo, glowMat);
      shipGroup.add(glowMesh);

      var fx = bounds.cx + (Math.random() * 2 - 1) * halfSize;
      var fz = bounds.cz + (Math.random() * 2 - 1) * halfSize;
      var fy = 30 + Math.random() * 45;

      shipGroup.position.set(fx, fy, fz);

      var speed = 12 + Math.random() * 24;
      var angle = Math.random() * Math.PI * 2;
      shipGroup.rotation.y = angle;

      flyingShips.push({
        group: shipGroup,
        vx: Math.sin(angle) * speed,
        vz: Math.cos(angle) * speed
      });

      hitechGroup.add(shipGroup);
    }

    // Animaatiopäivitys lento-aluksille (Three.js onBeforeRender)
    var lastAnimTime = performance.now();
    hitechGroup.onBeforeRender = function() {
      var now = performance.now();
      var delta = (now - lastAnimTime) / 1000.0;
      lastAnimTime = now;
      if (delta > 0.1) delta = 0.1;

      for (var s = 0; s < flyingShips.length; s++) {
        var ship = flyingShips[s];
        ship.group.position.x += ship.vx * delta;
        ship.group.position.z += ship.vz * delta;

        // Palautetaan alus toiselle puolelle aluetta jos se lentää rajojen yli
        var dx = ship.group.position.x - bounds.cx;
        var dz = ship.group.position.z - bounds.cz;

        if (dx > halfSize) ship.group.position.x -= halfSize * 2;
        if (dx < -halfSize) ship.group.position.x += halfSize * 2;
        if (dz > halfSize) ship.group.position.z -= halfSize * 2;
        if (dz < -halfSize) ship.group.position.z += halfSize * 2;
      }
    };

    return hitechGroup;
  };
})();