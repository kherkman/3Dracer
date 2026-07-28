// env_kaupunki.js - Kaupunkiympäristön 3D-määritelmä (Kirkastetut värit & Heijastavat ikkunat)
(function() {
  window.ENV_BUILDERS = window.ENV_BUILDERS || {};

  // Proseduraalinen ikkunafallback-tekstuuri taloille silloin kun kuva-tekstuurit eivät ole käytössä
  function createBuildingFallbackTex(baseColorHex) {
    var c = document.createElement('canvas'); c.width = 128; c.height = 256;
    var ctxCanvas = c.getContext('2d');
    ctxCanvas.fillStyle = baseColorHex || '#334155';
    ctxCanvas.fillRect(0, 0, 128, 256);

    var windowColors = [
      'rgba(0, 180, 255, 0.95)',  // Kirkas syaani/sininen
      'rgba(30, 144, 255, 0.95)',  // Dodger blue
      'rgba(0, 212, 255, 0.95)',  // Neon sininen
      'rgba(180, 220, 255, 0.95)'  // Sähkönsininen
    ];

    for (var y = 16; y < 240; y += 20) {
      for (var x = 12; x < 116; x += 18) {
        if (Math.random() < 0.75) {
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

  // Heijastava sininen alfa-ikkunatekstuuri, joka asettuu JPG-kuvien päälle
  function createReflectiveBlueWindowTex() {
    var c = document.createElement('canvas'); c.width = 128; c.height = 256;
    var ctxCanvas = c.getContext('2d');
    ctxCanvas.clearRect(0, 0, 128, 256);

    var blueWindowColors = [
      'rgba(0, 160, 255, 0.85)',  // Syvä heijastava sininen
      'rgba(0, 200, 255, 0.90)',  // Kirkas syaani
      'rgba(56, 189, 248, 0.85)', // Taivaansininen
      'rgba(14, 165, 233, 0.90)'  // Metallisininen
    ];

    for (var y = 12; y < 244; y += 22) {
      for (var x = 8; x < 120; x += 18) {
        if (Math.random() < 0.82) {
          var col = blueWindowColors[Math.floor(Math.random() * blueWindowColors.length)];
          ctxCanvas.fillStyle = col;
          ctxCanvas.fillRect(x, y, 12, 14);

          // Vaalea heijastusviiva ikkunalasin yläreunassa
          ctxCanvas.fillStyle = 'rgba(255, 255, 255, 0.65)';
          ctxCanvas.fillRect(x + 1, y + 1, 10, 3);
        }
      }
    }
    var tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  var cachedReflectiveBlueTex = null;

  window.ENV_BUILDERS['kaupunki'] = function(track, bounds, ctx) {
    var cityGroup = new THREE.Group();

    // Kirkkaammat pohjavärit, jotta tekstuuri erottuu selvästi eikä muutu liian tummaksi
    var bldgColors = ['#475569', '#334155', '#64748b', '#3b82f6', '#4f46e5', '#1e293b'];
    var neonColors = [0xff0055, 0x00f0ff, 0xffaa00, 0x00ff66, 0xaa00ff];

    var numBuildings = 140;
    var halfSize = bounds.size / 2 * 0.95;
    var exclR = ctx.ROAD_HALF_WIDTH + ctx.CURB_WIDTH + 2.5;

    var texPaths = ctx.CITY_TEXTURE_PATHS || [];

    if (!cachedReflectiveBlueTex) {
      cachedReflectiveBlueTex = createReflectiveBlueWindowTex();
    }

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

      // Päärunko JPG-tekstuurilla ja säädetyllä valaistuksella
      var bMat = new THREE.MeshStandardMaterial({
        color: baseColor,
        map: cityTex,
        roughness: 0.35,
        metalness: 0.20
      });

      var bMesh = new THREE.Mesh(bldgGeo, bMat);
      var groundY = ctx.terrainSample(track, x, z).y;
      bMesh.position.set(x, groundY + bh / 2, z);
      bMesh.castShadow = true;
      bMesh.receiveShadow = true;
      cityGroup.add(bMesh);

      // HEIJASTAVAT SINISET IKKUNAT JPG-TEKSTUURIN PÄÄLLE
      var windowTexInst = cachedReflectiveBlueTex.clone();
      windowTexInst.repeat.set(1, Math.max(1, Math.floor(bh / 7)));
      windowTexInst.needsUpdate = true;

      var glassMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        map: windowTexInst,
        roughness: 0.05,
        metalness: 0.85,
        transparent: true,
        opacity: 0.92,
        emissive: 0x0284c7,
        emissiveIntensity: 0.25,
        side: THREE.DoubleSide
      });

      var glassGeo = new THREE.BoxGeometry(bw + 0.08, bh * 0.88, bd + 0.08);
      var glassMesh = new THREE.Mesh(glassGeo, glassMat);
      glassMesh.position.set(x, groundY + bh * 0.48, z);
      cityGroup.add(glassMesh);

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

    // --- KATUVALOT RADAN VARRELLE ---
    var lampStep = 6;
    var lampGeo = new THREE.CylinderGeometry(0.08, 0.12, 4.2, 6);
    lampGeo.translate(0, 2.1, 0);
    var lampHeadGeo = new THREE.BoxGeometry(0.6, 0.15, 0.4);
    lampHeadGeo.translate(0, 4.2, 0.2);

    var lampMat = new THREE.MeshStandardMaterial({ color: 0x222225, metalness: 0.8, roughness: 0.3 });
    var lampLightMat = new THREE.MeshBasicMaterial({ color: 0xfff2a3 });

    var lampOffsetR = ctx.ROAD_HALF_WIDTH + ctx.CURB_WIDTH + 2.5;

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