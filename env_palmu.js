// env_palmu.js - Palmu-ympäristön 3D-määritelmä (Perustuu palmugeneraattori.html -malliin)
(function() {
  window.ENV_BUILDERS = window.ENV_BUILDERS || {};

  function randRange(a, b) { return a + Math.random() * (b - a); }

  function makeBarkTexture(kind) {
    var cvs = document.createElement('canvas'); cvs.width = 256; cvs.height = 512;
    var ctx = cvs.getContext('2d');

    if (kind === 'taateli') {
      var g = ctx.createLinearGradient(0, 0, 256, 0);
      g.addColorStop(0, '#6b4a28'); g.addColorStop(0.5, '#8a6238'); g.addColorStop(1, '#5a3d20');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 512);
      ctx.strokeStyle = 'rgba(30,16,8,0.5)';
      for (var y = -20; y < 540; y += 22) {
        for (var x = -20; x < 276; x += 36) {
          ctx.beginPath();
          ctx.moveTo(x, y); ctx.lineTo(x + 18, y + 11); ctx.lineTo(x + 36, y); ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(x, y + 22); ctx.lineTo(x + 18, y + 11); ctx.lineTo(x + 36, y + 22); ctx.stroke();
        }
      }
    } else if (kind === 'viuhka') {
      var g2 = ctx.createLinearGradient(0, 0, 256, 0);
      g2.addColorStop(0, '#795a3c'); g2.addColorStop(0.5, '#957048'); g2.addColorStop(1, '#69492e');
      ctx.fillStyle = g2; ctx.fillRect(0, 0, 256, 512);
      ctx.strokeStyle = 'rgba(40,24,10,0.45)';
      for (var yy = 0; yy < 512; yy += 6) {
        ctx.beginPath();
        for (var xx = 0; xx <= 256; xx += 8) {
          ctx.lineTo(xx, yy + Math.sin(xx * 0.3 + yy) * 3 + (Math.random() - 0.5) * 3);
        }
        ctx.lineWidth = 1; ctx.stroke();
      }
    } else { // kookos
      var g3 = ctx.createLinearGradient(0, 0, 256, 0);
      g3.addColorStop(0, '#5b3a22'); g3.addColorStop(0.5, '#7a5230'); g3.addColorStop(1, '#4a2e1a');
      ctx.fillStyle = g3; ctx.fillRect(0, 0, 256, 512);
      ctx.strokeStyle = 'rgba(30,16,8,0.55)';
      for (var y2 = -20; y2 < 540; y2 += 26) {
        ctx.beginPath(); ctx.moveTo(0, y2);
        for (var x2 = 0; x2 <= 256; x2 += 16) {
          ctx.lineTo(x2, y2 + Math.sin(x2 * 0.08 + y2) * 5);
        }
        ctx.lineWidth = 1.5 + Math.random(); ctx.stroke();
      }
    }

    var tex = new THREE.CanvasTexture(cvs);
    tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  function TrunkGeometry(curve, baseR, topR, segs, radial) {
    segs = segs || 45; radial = radial || 10;
    var geo = new THREE.BufferGeometry();
    var positions = [], normals = [], uvs = [], indices = [];

    for (var i = 0; i <= segs; i++) {
      var t = i / segs;
      var center = curve.getPointAt(t);
      var tangent = curve.getTangentAt(t).normalize();
      var up = new THREE.Vector3(0, 1, 0);
      var normalDir = new THREE.Vector3().crossVectors(up, tangent).normalize();
      if (normalDir.lengthSq() < 0.001) normalDir.set(1, 0, 0);
      var binormal = new THREE.Vector3().crossVectors(tangent, normalDir).normalize();
      var ring = 1 + Math.sin(t * 40) * 0.02;
      var r = THREE.MathUtils.lerp(baseR, topR, Math.pow(t, 0.78)) * ring * (1 + (t < 0.06 ? (0.06 - t) * 4.2 : 0));

      for (var j = 0; j <= radial; j++) {
        var a = (j / radial) * Math.PI * 2;
        var dir = new THREE.Vector3()
          .addScaledVector(normalDir, Math.cos(a))
          .addScaledVector(binormal, Math.sin(a));
        var p = center.clone().addScaledVector(dir, r);
        positions.push(p.x, p.y, p.z);
        normals.push(dir.x, dir.y, dir.z);
        uvs.push(j / radial, t * 4);
      }
    }

    for (var i2 = 0; i2 < segs; i2++) {
      for (var j2 = 0; j2 < radial; j2++) {
        var a2 = i2 * (radial + 1) + j2;
        var b2 = (i2 + 1) * (radial + 1) + j2;
        var c2 = (i2 + 1) * (radial + 1) + j2 + 1;
        var d2 = i2 * (radial + 1) + j2 + 1;
        indices.push(a2, b2, d2, b2, c2, d2);
      }
    }

    geo.setIndex(indices);
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    return geo;
  }

  function buildFeatherFrond(length, droop, hue, pal) {
    var rise = length * 0.22;
    var ctrl = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(length * 0.22, rise * 1.0, 0),
      new THREE.Vector3(length * 0.5, rise * 0.55, 0),
      new THREE.Vector3(length * 0.78, -rise * (0.55 + droop * 0.6), 0),
      new THREE.Vector3(length * 0.98, -rise * (1.35 + droop * 1.5), 0)
    ];
    var curve = new THREE.CatmullRomCurve3(ctrl);
    var N = 20;
    var pts = curve.getSpacedPoints(N);

    var positions = [], colors = [];
    var baseColor = new THREE.Color().setHSL(hue + pal.hueShift, 0.55 * pal.sat, 0.22 * pal.light);
    var tipColor = new THREE.Color().setHSL(hue + 0.03 + pal.hueShift, 0.62 * pal.sat, 0.42 * pal.light);

    for (var i = 0; i < N; i++) {
      var t0 = i / N, t1 = (i + 1) / N;
      var p0 = pts[i], p1 = pts[i + 1];
      var w0 = THREE.MathUtils.lerp(0.08, 0.008, t0);
      var w1 = THREE.MathUtils.lerp(0.08, 0.008, t1);
      var up0 = new THREE.Vector3(0, 1, 0).multiplyScalar(w0 * 0.5);
      var up1 = new THREE.Vector3(0, 1, 0).multiplyScalar(w1 * 0.5);
      var a1 = p0.clone().add(up0), a2 = p0.clone().sub(up0);
      var b1 = p1.clone().add(up1), b2 = p1.clone().sub(up1);
      positions.push(a1.x, a1.y, a1.z, b1.x, b1.y, b1.z, a2.x, a2.y, a2.z);
      positions.push(b1.x, b1.y, b1.z, b2.x, b2.y, b2.z, a2.x, a2.y, a2.z);
      var c = baseColor.clone().lerp(tipColor, t0);
      for (var k = 0; k < 6; k++) colors.push(c.r, c.g, c.b);
    }

    var leafletPairs = 18;
    for (var li = 2; li < leafletPairs; li++) {
      var t = li / leafletPairs;
      if (t > 0.97) continue;
      var idx = Math.min(N - 1, Math.floor(t * N));
      var p = pts[idx];
      var pNext = pts[Math.min(N, idx + 1)];
      var tangent = pNext.clone().sub(p).normalize();
      var side = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 0, 1)).normalize();
      if (side.lengthSq() < 0.001) side.set(0, 1, 0);
      var up = new THREE.Vector3().crossVectors(side, tangent).normalize();

      var shapeCurve = Math.sin(t * Math.PI);
      var leafLen = (0.55 + shapeCurve * 1.15) * (length / 6.4);
      var sweep = THREE.MathUtils.lerp(0.35, 1.15, t);
      var droopAng = THREE.MathUtils.lerp(0.15, 0.95 + droop * 0.6, t * t);

      [1, -1].forEach(function(sgn) {
        var dir = tangent.clone().multiplyScalar(Math.cos(sweep))
          .addScaledVector(side, sgn * Math.sin(sweep))
          .addScaledVector(up, -Math.sin(droopAng) * 0.9)
          .normalize();
        var root = p.clone();
        var width = 0.05 + shapeCurve * 0.045;
        var rootA = root.clone().addScaledVector(up, width * 0.5);
        var rootB = root.clone().addScaledVector(up, -width * 0.5);
        var mid = root.clone().addScaledVector(dir, leafLen * 0.55).addScaledVector(up, -leafLen * 0.12);
        var tip = root.clone().addScaledVector(dir, leafLen).addScaledVector(up, -leafLen * 0.34);

        positions.push(rootA.x, rootA.y, rootA.z, mid.x, mid.y, mid.z, rootB.x, rootB.y, rootB.z);
        positions.push(mid.x, mid.y, mid.z, tip.x, tip.y, tip.z, rootB.x, rootB.y, rootB.z);

        var cBase = baseColor.clone().lerp(tipColor, t * 0.8);
        var cTip = tipColor.clone().lerp(new THREE.Color().setHSL(hue + 0.08 + pal.hueShift, 0.5 * pal.sat, 0.55 * pal.light), t);
        for (var k1 = 0; k1 < 3; k1++) colors.push(cBase.r, cBase.g, cBase.b);
        for (var k2 = 0; k2 < 3; k2++) colors.push(cTip.r, cTip.g, cTip.b);
      });
    }

    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    var mat = new THREE.MeshStandardMaterial({
      vertexColors: true, side: THREE.DoubleSide, roughness: 0.55, metalness: 0.02
    });
    var mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true; mesh.receiveShadow = true;
    return mesh;
  }

  function buildSinglePalmTree(speciesKey, season) {
    var species = {
      kookos: { trunkHeight: [6, 9], trunkLean: [0.25, 0.45], baseR: 0.42, topR: 0.16, frondCount: [12, 15], frondLen: [3.5, 4.8], hue: 0.32 },
      taateli: { trunkHeight: [5, 7.5], trunkLean: [0.10, 0.22], baseR: 0.48, topR: 0.20, frondCount: [16, 22], frondLen: [2.5, 3.8], hue: 0.27 }
    }[speciesKey] || { trunkHeight: [6, 8.5], trunkLean: [0.2, 0.4], baseR: 0.4, topR: 0.16, frondCount: [12, 16], frondLen: [3.2, 4.5], hue: 0.30 };

    var pal = { hueShift: 0, sat: 1.0, light: 1.0, dryBoost: 0 };
    if (season === 'syksy') { pal = { hueShift: -0.12, sat: 0.7, light: 0.9, dryBoost: 0.3 }; }
    else if (season === 'talvi') { pal = { hueShift: 0.05, sat: 0.3, light: 1.2, dryBoost: 0.1 }; }

    var group = new THREE.Group();

    var trunkHeight = randRange(species.trunkHeight[0], species.trunkHeight[1]);
    var lean = randRange(species.trunkLean[0], species.trunkLean[1]);
    var leanAngle = randRange(0, Math.PI * 2);

    var trunkCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(Math.cos(leanAngle) * lean * 0.3, trunkHeight * 0.25, Math.sin(leanAngle) * lean * 0.3),
      new THREE.Vector3(Math.cos(leanAngle) * lean * 0.6, trunkHeight * 0.60, Math.sin(leanAngle) * lean * 0.6),
      new THREE.Vector3(Math.cos(leanAngle) * lean * 0.5, trunkHeight, Math.sin(leanAngle) * lean * 0.5)
    ]);

    var barkTex = makeBarkTexture(speciesKey);
    var trunkMat = new THREE.MeshStandardMaterial({
      map: barkTex, roughness: 0.92, metalness: 0.02, color: 0xcfa87a, side: THREE.DoubleSide
    });
    var trunkMesh = new THREE.Mesh(new TrunkGeometry(trunkCurve, species.baseR, species.topR), trunkMat);
    trunkMesh.castShadow = true; trunkMesh.receiveShadow = true;
    group.add(trunkMesh);

    var crownTop = trunkCurve.getPointAt(1.0);
    var crownGroup = new THREE.Group();
    crownGroup.position.copy(crownTop);
    group.add(crownGroup);

    var frondCount = Math.round(randRange(species.frondCount[0], species.frondCount[1]));
    for (var i = 0; i < frondCount; i++) {
      var isOld = Math.random() < 0.25;
      var angle = (i / frondCount) * Math.PI * 2 + Math.random() * 0.3;
      var length = randRange(species.frondLen[0], species.frondLen[1]) * (isOld ? 0.85 : 1);
      var hue = species.hue - pal.dryBoost * 0.12;

      var pivot = new THREE.Group();
      pivot.rotation.y = angle;

      var tilt = isOld ? THREE.MathUtils.degToRad(50 + Math.random() * 15) : THREE.MathUtils.degToRad(16 + Math.random() * 22);
      pivot.rotation.x = -tilt;

      var droop = isOld ? 1.2 : 0.25 + Math.random() * 0.3;
      var frondMesh = buildFeatherFrond(length, droop, hue, pal);

      pivot.add(frondMesh);
      crownGroup.add(pivot);
    }

    var nutMat = new THREE.MeshStandardMaterial({ color: 0x4a3220, roughness: 0.85 });
    for (var k = 0; k < 4; k++) {
      var nut = new THREE.Mesh(new THREE.IcosahedronGeometry(0.15, 1), nutMat);
      var a = k * 1.5 + 0.3;
      nut.position.set(Math.cos(a) * 0.2, -0.22 - Math.random() * 0.1, Math.sin(a) * 0.2);
      nut.castShadow = true;
      crownGroup.add(nut);
    }

    return group;
  }

  window.ENV_BUILDERS['palmu'] = function(track, bounds, ctx) {
    var forestGroup = new THREE.Group();

    var desired = 220 + Math.floor(Math.random() * 100);
    var maxAttempts = desired * 6;
    var accepted = [];
    var halfSize = bounds.size / 2 * 0.92;
    var exclR = ctx.ROAD_HALF_WIDTH + ctx.CURB_WIDTH + 2.5;
    var attempts = 0;

    while (accepted.length < desired && attempts < maxAttempts) {
      attempts++;
      var x = bounds.cx + (Math.random() * 2 - 1) * halfSize;
      var z = bounds.cz + (Math.random() * 2 - 1) * halfSize;
      var info = ctx.closestSampleInfo(track, x, z);
      if (info.dist < exclR) continue;
      accepted.push({ x: x, z: z });
    }

    var numTemplates = 8;
    var templates = [];
    var season = ctx.currentSeason || 'kesa';

    for (var t = 0; t < numTemplates; t++) {
      var speciesKey = (t % 2 === 0) ? 'kookos' : 'taateli';
      var palmMesh = buildSinglePalmTree(speciesKey, season);
      templates.push(palmMesh);
    }

    for (var i = 0; i < accepted.length; i++) {
      var p = accepted[i];
      var y = ctx.terrainSample(track, p.x, p.z).y;

      var template = templates[i % templates.length];
      var palmInstance = template.clone(true);

      var scale = 0.75 + Math.random() * 0.5;
      palmInstance.scale.set(scale, scale * (0.9 + Math.random() * 0.2), scale);
      palmInstance.position.set(p.x, y, p.z);
      palmInstance.rotation.y = Math.random() * Math.PI * 2;

      forestGroup.add(palmInstance);
    }

    return forestGroup;
  };
})();