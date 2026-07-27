// env_palmu.js - Palmu-ympäristön 3D-määritelmä
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
  function mergeGeometries(geometries) {
    var positions = [], normals = [], uvs = [];
    for (var i=0;i<geometries.length;i++) {
      var g = geometries[i];
      var ng = g.index ? g.toNonIndexed() : g;
      positions.push(ng.attributes.position.array);
      normals.push(ng.attributes.normal.array);
      if (ng.attributes.uv) uvs.push(ng.attributes.uv.array);
    }
    var merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.BufferAttribute(concatFloat32(positions), 3));
    merged.setAttribute('normal', new THREE.BufferAttribute(concatFloat32(normals), 3));
    if (uvs.length === geometries.length) {
      merged.setAttribute('uv', new THREE.BufferAttribute(concatFloat32(uvs), 2));
    }
    return merged;
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

  function makePalmTreeGeometry(currentSeason) {
    var parts = [];
    var trunkSegs = 8;
    for (var i = 0; i < trunkSegs; i++) {
      var t = i / trunkSegs;
      var r = lerp(0.18, 0.09, t);
      var h = 0.5;
      var cGeo = new THREE.CylinderGeometry(r*0.9, r, h, 6);
      cGeo.translate(Math.sin(t*Math.PI*0.5)*0.3, i*0.48 + 0.25, 0);
      cGeo.rotateY(t*0.3);
      parts.push({ geo: cGeo, color: [0.38, 0.25, 0.14] });
    }

    var topY = trunkSegs * 0.48;
    var frondCount = 10;
    var leafCol = [0.15, 0.42, 0.12];
    if (currentSeason === 'syksy') leafCol = [0.55, 0.42, 0.12];
    else if (currentSeason === 'talvi') leafCol = [0.75, 0.80, 0.82];
    else if (currentSeason === 'kevat') leafCol = [0.25, 0.55, 0.15];

    for (var f = 0; f < frondCount; f++) {
      var angle = (f / frondCount) * Math.PI * 2;
      var frondGroupGeo = [];

      var leafStem = new THREE.BoxGeometry(0.04, 0.03, 1.8);
      leafStem.translate(0, 0, 0.9);
      leafStem.rotateX(-0.35 - (f % 2)*0.1);
      leafStem.rotateY(angle);
      leafStem.translate(Math.sin(0.5*Math.PI)*0.3, topY, 0);
      frondGroupGeo.push(leafStem);

      for (var l = 0; l < 6; l++) {
        var lt = l / 6;
        var leaflet = new THREE.BoxGeometry(0.45 * (1 - lt*0.5), 0.01, 0.12);
        leaflet.rotateZ((l % 2 === 0 ? 1 : -1) * 0.2);
        leaflet.translate(0, -lt*0.3, 0.3 + lt * 1.3);
        leaflet.rotateX(-0.35 - (f % 2)*0.1);
        leaflet.rotateY(angle);
        leaflet.translate(Math.sin(0.5*Math.PI)*0.3, topY, 0);
        frondGroupGeo.push(leaflet);
      }

      var mergedFrond = mergeGeometries(frondGroupGeo);
      parts.push({ geo: mergedFrond, color: leafCol });
    }

    for (var c = 0; c < 3; c++) {
      var nut = new THREE.DodecahedronGeometry(0.12, 0);
      var ca = c * 2.1;
      nut.translate(Math.cos(ca)*0.16 + 0.3, topY - 0.1, Math.sin(ca)*0.16);
      parts.push({ geo: nut, color: [0.28, 0.18, 0.08] });
    }

    return mergeGeometriesWithColors(parts);
  }

  window.ENV_BUILDERS['palmu'] = function(track, bounds, ctx) {
    var treeGeo = makePalmTreeGeometry(ctx.currentSeason);

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