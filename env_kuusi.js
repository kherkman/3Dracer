// env_kuusi.js - Kuusi-ympäristön 3D-määritelmä
(function() {
  window.ENV_BUILDERS = window.ENV_BUILDERS || {};

  function concatFloat32(arrays) {
    var total = 0;
    for (var i=0;i<arrays.length;i++) total += arrays[i].length;
    var result = new Float32Array(total);
    var offset = 0;
    for (var i=0;i<arrays.length;i++) { result.set(arrays[i], offset); offset += arrays[i].length; }
    return result;
  }
  function mergeGeometriesWithColors(parts) {
    var positions = [], normals = [], colors = [];
    for (var i=0;i<parts.length;i++) {
      var g = parts[i].geo;
      var ng = g.index ? g.toNonIndexed() : g;
      positions.push(ng.attributes.position.array);
      normals.push(ng.attributes.normal.array);
      var count = ng.attributes.position.count;
      var carr = new Float32Array(count*3);
      for (var k=0;k<count;k++) { carr[k*3]=parts[i].color[0]; carr[k*3+1]=parts[i].color[1]; carr[k*3+2]=parts[i].color[2]; }
      colors.push(carr);
    }
    var merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.BufferAttribute(concatFloat32(positions), 3));
    merged.setAttribute('normal', new THREE.BufferAttribute(concatFloat32(normals), 3));
    merged.setAttribute('color', new THREE.BufferAttribute(concatFloat32(colors), 3));
    return merged;
  }
  function lerp(a, b, t) { return a + (b - a) * t; }

  function makeSpruceTreeGeometry(currentSeason) {
    var parts = [];
    var trunk = new THREE.CylinderGeometry(0.06, 0.16, 2.6, 6);
    trunk.translate(0, 1.3, 0);
    parts.push({ geo: trunk, color: [0.25, 0.18, 0.12] });

    var whorls = 7;
    for (var w = 0; w < whorls; w++) {
      var t = w / (whorls - 1);
      var y = lerp(0.5, 2.8, t);
      var radius = lerp(0.85, 0.15, t);
      var cone = new THREE.ConeGeometry(radius, 0.5, 8);
      cone.translate(0, y, 0);

      var cColor;
      if (currentSeason === 'kesa') {
        cColor = [0.11 + t*0.05, 0.30 + t*0.08, 0.15];
      } else if (currentSeason === 'syksy') {
        cColor = [0.38 + t*0.1, 0.32, 0.12];
      } else if (currentSeason === 'talvi') {
        cColor = [0.82, 0.88, 0.90];
      } else {
        cColor = [0.22, 0.48 + t*0.08, 0.18];
      }

      parts.push({ geo: cone, color: cColor });
    }

    return mergeGeometriesWithColors(parts);
  }

  window.ENV_BUILDERS['kuusi'] = function(track, bounds, ctx) {
    var treeGeo = makeSpruceTreeGeometry(ctx.currentSeason);

    var desired = 550 + Math.floor(Math.random() * 300);
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

    var treeMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 });
    var inst = new THREE.InstancedMesh(treeGeo, treeMat, accepted.length);
    var m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color(), euler = new THREE.Euler();

    for (var i = 0; i < accepted.length; i++) {
      var p = accepted[i];
      var y = ctx.terrainSample(track, p.x, p.z).y;
      euler.set(0, Math.random() * Math.PI * 2, 0);
      q.setFromEuler(euler);
      var s = 0.75 + Math.random() * 0.9;
      m4.compose(new THREE.Vector3(p.x, y, p.z), q, new THREE.Vector3(s, s * (0.9 + Math.random() * 0.3), s));
      inst.setMatrixAt(i, m4);
      var tint = 0.88 + Math.random() * 0.24;
      col.setRGB(tint, tint, tint);
      inst.setColorAt(i, col);
    }

    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    inst.castShadow = true; inst.receiveShadow = true;
    return inst;
  };
})();