// env_synthwave.js - Synthwave/Outrun-ympäristön 3D-määritelmä (Hohtava Neon-aurinko, Sysimustat Palmut & Grid-tornit)
(function() {
  window.ENV_BUILDERS = window.ENV_BUILDERS || {};

  // Luodaan hehkuva raidallinen Synthwave-aurinkotekstuuri
  function createSynthwaveSunTexture() {
    var c = document.createElement('canvas'); c.width = 256; c.height = 256;
    var ctx = c.getContext('2d');

    var grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#ffee00');   // Neon Keltainen ylhäällä
    grad.addColorStop(0.5, '#ff00aa'); // Neon Magenta keskellä
    grad.addColorStop(1, '#9900ff');   // Purppura alhaalla

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    // Vaakaraidat auringon alaosassa
    ctx.fillStyle = '#1e0033';
    for (var y = 130; y < 256; y += 14) {
      var h = 3 + (y - 130) * 0.04;
      ctx.fillRect(0, y, 256, h);
    }

    var tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  // Sysimustan palmun geometria
  function buildSynthwavePalm() {
    var palmGroup = new THREE.Group();
    var blackMat = new THREE.MeshBasicMaterial({ color: 0x000000 });

    // Kaareva rungon alaosa
    var trunkGeo = new THREE.CylinderGeometry(0.18, 0.35, 7.5, 7);
    trunkGeo.translate(0, 3.75, 0);
    var trunkMesh = new THREE.Mesh(trunkGeo, blackMat);
    trunkMesh.rotation.z = -0.12;
    palmGroup.add(trunkMesh);

    // Lehdet
    var frondCount = 10;
    var topY = 7.2;
    for (var f = 0; f < frondCount; f++) {
      var angle = (f / frondCount) * Math.PI * 2;
      var frondGeo = new THREE.BoxGeometry(0.35, 0.04, 3.2);
      frondGeo.translate(0, 0, 1.6);
      frondGeo.rotateX(-0.4);
      frondGeo.rotateY(angle);
      frondGeo.translate(0, topY, 0);

      var frondMesh = new THREE.Mesh(frondGeo, blackMat);
      palmGroup.add(frondMesh);
    }

    return palmGroup;
  }

  var cachedSunTex = null;
  var cachedPalmTemplate = null;

  window.ENV_BUILDERS['synthwave'] = function(track, bounds, ctx) {
    var synthGroup = new THREE.Group();

    if (!cachedSunTex) cachedSunTex = createSynthwaveSunTexture();
    if (!cachedPalmTemplate) cachedPalmTemplate = buildSynthwavePalm();

    // --- 1. VALTAVA SYNTHWAVE-AURINKO HORISONTISSA ---
    var sunMat = new THREE.MeshBasicMaterial({ map: cachedSunTex });
    var sunGeo = new THREE.CircleGeometry(42, 32);
    var sunMesh = new THREE.Mesh(sunGeo, sunMat);
    sunMesh.position.set(bounds.cx, 65, bounds.cz + 220);
    sunMesh.rotation.y = Math.PI;
    synthGroup.add(sunMesh);

    // --- 2. SYSIMUSTAT PALMUT RADAN VARRELLA ---
    var numPalms = 180;
    var halfSize = bounds.size / 2 * 0.95;
    var exclR = ctx.ROAD_HALF_WIDTH + ctx.CURB_WIDTH + 3.0;

    for (var i = 0; i < numPalms; i++) {
      var x = bounds.cx + (Math.random() * 2 - 1) * halfSize;
      var z = bounds.cz + (Math.random() * 2 - 1) * halfSize;
      var info = ctx.closestSampleInfo(track, x, z);
      if (info.dist < exclR) continue;

      var groundY = ctx.terrainSample(track, x, z).y;
      var palm = cachedPalmTemplate.clone(true);
      var scale = 0.8 + Math.random() * 0.7;

      palm.scale.set(scale, scale, scale);
      palm.position.set(x, groundY, z);
      palm.rotation.y = Math.random() * Math.PI * 2;

      synthGroup.add(palm);
    }

    // --- 3. HOHTAVAT GRID-PYRAMIDIT JA WIREFRAME-TORNIEN RUNGOT ---
    var neonColors = [0x00f0ff, 0xff00aa, 0xa855f7, 0xffee00];
    var numPyramids = 65;

    for (var p = 0; p < numPyramids; p++) {
      var px = bounds.cx + (Math.random() * 2 - 1) * halfSize;
      var pz = bounds.cz + (Math.random() * 2 - 1) * halfSize;
      var pInfo = ctx.closestSampleInfo(track, px, pz);
      if (pInfo.dist < exclR + 6.0) continue;

      var py = ctx.terrainSample(track, px, pz).y;
      var pyrH = 15 + Math.random() * 45;
      var pyrR = 6 + Math.random() * 12;

      var pyrGeo = new THREE.ConeGeometry(pyrR, pyrH, 4);
      pyrGeo.translate(0, pyrH / 2, 0);

      var wireGeo = new THREE.WireframeGeometry(pyrGeo);
      var neonCol = neonColors[Math.floor(Math.random() * neonColors.length)];
      var wireMat = new THREE.LineBasicMaterial({ color: neonCol, linewidth: 2 });

      var wireMesh = new THREE.LineSegments(wireGeo, wireMat);
      wireMesh.position.set(px, py, pz);
      wireMesh.rotation.y = Math.PI / 4;

      synthGroup.add(wireMesh);
    }

    // --- 4. LEIJUVIAT NEON-RENKAAT (TORUS) TAIVAALLA ---
    var numRings = 25;
    for (var r = 0; r < numRings; r++) {
      var rx = bounds.cx + (Math.random() * 2 - 1) * halfSize;
      var rz = bounds.cz + (Math.random() * 2 - 1) * halfSize;
      var ry = 20 + Math.random() * 35;

      var ringCol = neonColors[Math.floor(Math.random() * neonColors.length)];
      var ringGeo = new THREE.TorusGeometry(8 + Math.random() * 10, 0.3, 8, 24);
      var ringMat = new THREE.MeshBasicMaterial({ color: ringCol });
      var ringMesh = new THREE.Mesh(ringGeo, ringMat);

      ringMesh.position.set(rx, ry, rz);
      ringMesh.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.5;
      synthGroup.add(ringMesh);
    }

    return synthGroup;
  };
})();