// env_kaupunki.js - Kaupunkiympäristön 3D-määritelmä
(function() {
  window.ENV_BUILDERS = window.ENV_BUILDERS || {};

  // Värikäs proseduraalinen ikkunafallback-tekstuuri kaupungin taloille
  function createBuildingFallbackTex(baseColorHex) {
    var c = document.createElement('canvas'); c.width = 128; c.height = 256;
    var ctxCanvas = c.getContext('2d');
    ctxCanvas.fillStyle = baseColorHex || '#1e293b';
    ctxCanvas.fillRect(0, 0, 128, 256);

    var windowColors = [
      'rgba(255, 220, 100, 0.9)',  // Lämmin keltainen
      'rgba(0, 240, 255, 0.9)',    // Kirkas syaani
      'rgba(255, 100, 200, 0.9)',  // Vaaleanpunainen/Magenta
      'rgba(100, 255, 150, 0.9)',  // Neonvihreä
      'rgba(255, 160, 50, 0.9)',   // Oranssi
      'rgba(180, 200, 255, 0.95)'  // Sähkönsininen
    ];

    for (var y = 16; y < 240; y += 20) {
      for (var x = 12; x < 116; x += 18) {
        if (Math.random() < 0.70) {
          var col = windowColors[Math.floor(Math.random() * windowColors.length)];
          ctxCanvas.fillStyle = col;
          ctxCanvas.fillRect(x, y, 10, 12);
        }
      }
    }
    var tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  window.ENV_BUILDERS['kaupunki'] = function(track, bounds, ctx) {
    var cityGroup = new THREE.Group();

    var bldgColors = ['#2c3e50', '#1f2937', '#334155', '#111827', '#1e293b', '#0f172a'];
    var neonColors = [0xff0055, 0x00f0ff, 0xffaa00, 0x00ff66, 0xaa00ff];

    var numBuildings = 140;
    var halfSize = bounds.size / 2 * 0.95;
    var exclR = ctx.ROAD_HALF_WIDTH + ctx.CURB_WIDTH + 2.5;

    var texPaths = ctx.CITY_TEXTURE_PATHS || [];

    var placedCount = 0;
    var maxAttempts = numBuildings * 5;
    var attempts = 0;

    while (placedCount < numBuildings && attempts < maxAttempts) {
      attempts++;
      var x = bounds.cx + (Math.random() * 2 - 1) * halfSize;
      var z = bounds.cz + (Math.random() * 2 - 1) * halfSize;

      var bw = 8 + Math.random() * 12;
      var bd = 8 + Math.random() * 12;
      var bh = 18 + Math.floor(Math.pow(Math.random(), 1.5) * 65);

      var bRadius = Math.sqrt(bw * bw + bd * bd) / 2.0;
      var info = ctx.closestSampleInfo(track, x, z);
      if (info.dist < exclR + bRadius) continue;

      placedCount++;

      var bldgGeo = new THREE.BoxGeometry(bw, bh, bd);
      var baseColor = bldgColors[Math.floor(Math.random() * bldgColors.length)];

      var cityTex = null;
      if (ctx.texturesEnabled && texPaths.length > 0 && typeof ctx.loadTextureWithFallback === 'function') {
        var texPath = texPaths[Math.floor(Math.random() * texPaths.length)];
        cityTex = ctx.loadTextureWithFallback(texPath, 1, Math.max(1, Math.floor(bh / 8)), baseColor, 'TALO');
      } else {
        cityTex = createBuildingFallbackTex(baseColor);
        cityTex.repeat.set(1, Math.max(1, Math.floor(bh / 8)));
      }

      var bMat = new THREE.MeshStandardMaterial({
        color: baseColor,
        map: cityTex,
        roughness: 0.25,
        metalness: 0.65
      });

      var bMesh = new THREE.Mesh(bldgGeo, bMat);
      var groundY = ctx.terrainSample(track, x, z).y;
      bMesh.position.set(x, groundY + bh / 2, z);
      bMesh.castShadow = true;
      bMesh.receiveShadow = true;
      cityGroup.add(bMesh);

      // Kattoantennit ja majakat
      if (bh > 40 && Math.random() < 0.6) {
        var ant = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.25, 6, 6),
          new THREE.MeshBasicMaterial({ color: 0x888888 })
        );
        ant.position.set(x, groundY + bh + 3, z);
        cityGroup.add(ant);

        var beacon = new THREE.Mesh(
          new THREE.SphereGeometry(0.3, 6, 6),
          new THREE.MeshBasicMaterial({ color: 0xff0000 })
        );
        beacon.position.set(x, groundY + bh + 6, z);
        cityGroup.add(beacon);
      }

      // Hohtavat neonkyltit
      if (Math.random() < 0.35) {
        var neonCol = neonColors[Math.floor(Math.random() * neonColors.length)];
        var sign = new THREE.Mesh(
          new THREE.BoxGeometry(bw * 0.8, 2.2, 0.3),
          new THREE.MeshBasicMaterial({ color: neonCol })
        );
        sign.position.set(x, groundY + bh * (0.4 + Math.random() * 0.4), z + bd / 2 + 0.2);
        cityGroup.add(sign);
      }
    }

    // --- KATUVALOT RADAN VARRELLE (Turvallinen etäisyys radasta) ---
    var lampStep = 6;
    var lampGeo = new THREE.CylinderGeometry(0.08, 0.12, 4.2, 6);
    lampGeo.translate(0, 2.1, 0);
    var lampHeadGeo = new THREE.BoxGeometry(0.6, 0.15, 0.4);
    lampHeadGeo.translate(0, 4.2, 0.2);

    var lampMat = new THREE.MeshStandardMaterial({ color: 0x222225, metalness: 0.8, roughness: 0.3 });
    var lampLightMat = new THREE.MeshBasicMaterial({ color: 0xfff2a3 });

    // Varmistettu katuvalojen sijainti täysin ajoradan ja reunakivien ulkopuolella
    var lampOffsetR = ctx.ROAD_HALF_WIDTH + ctx.CURB_WIDTH + 1.8;

    for (var i = 0; i < track.n; i += lampStep) {
      var s = track.samples[i];
      var perp = new THREE.Vector3(-s.tz, 0, s.tx).normalize();
      var side = (Math.floor(i / lampStep) % 2 === 0) ? 1 : -1;

      var lx = s.x + perp.x * lampOffsetR * side;
      var lz = s.z + perp.z * lampOffsetR * side;
      var ly = ctx.getRoadSurfaceHeight(track, lx, lz);

      var post = new THREE.Mesh(lampGeo, lampMat);
      post.position.set(lx, ly, lz);
      
      var head = new THREE.Mesh(lampHeadGeo, lampLightMat);
      head.position.set(lx, ly, lz);
      head.rotation.y = Math.atan2(s.tx, s.tz);

      cityGroup.add(post);
      cityGroup.add(head);
    }

    return cityGroup;
  };
})();