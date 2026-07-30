// env_jattikukkaniitty.js - Jättikukkaniitty-ympäristön 3D-määritelmä (Sateenkaari sateella, Tuulessa heiluvat kukat, Erittäin tiheä & Pitkä Ruohomeri sekä Jättisaniaiset)
(function() {
  window.ENV_BUILDERS = window.ENV_BUILDERS || {};

  function concatFloat32(arrays) {
    var total = 0;
    for (var i = 0; i < arrays.length; i++) total += arrays[i].length;
    var result = new Float32Array(total);
    var offset = 0;
    for (var i = 0; i < arrays.length; i++) { result.set(arrays[i], offset); offset += arrays[i].length; }
    return result;
  }

  function mergeGeometries(geometries) {
    if (!geometries || geometries.length === 0) return new THREE.BufferGeometry();
    var positions = [], normals = [], uvs = [];
    for (var i = 0; i < geometries.length; i++) {
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

  // --- SATEENKAAREN TEKSTUURI ---
  function createRainbowTexture() {
    var c = document.createElement('canvas'); c.width = 1; c.height = 256;
    var ctx = c.getContext('2d');
    var g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0.00, 'rgba(255, 0, 0, 0.0)');
    g.addColorStop(0.08, 'rgba(255, 0, 0, 0.75)');
    g.addColorStop(0.22, 'rgba(255, 127, 0, 0.75)');
    g.addColorStop(0.36, 'rgba(255, 255, 0, 0.75)');
    g.addColorStop(0.50, 'rgba(0, 255, 0, 0.75)');
    g.addColorStop(0.64, 'rgba(0, 180, 255, 0.75)');
    g.addColorStop(0.78, 'rgba(75, 0, 130, 0.75)');
    g.addColorStop(0.92, 'rgba(148, 0, 211, 0.75)');
    g.addColorStop(1.00, 'rgba(148, 0, 211, 0.0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 1, 256);
    var tex = new THREE.CanvasTexture(c);
    return tex;
  }

  // --- KUKKATEKSTUURIT ---
  function createFlowerTextures() {
    var c1 = document.createElement('canvas'); c1.width = c1.height = 128;
    var ctx1 = c1.getContext('2d'); ctx1.fillStyle = '#ffffff';
    for (var i = 0; i < 18; i++) {
      ctx1.save(); ctx1.translate(64, 64); ctx1.rotate((Math.PI * 2 / 18) * i);
      ctx1.beginPath(); ctx1.ellipse(0, -32, 5, 24, 0, 0, Math.PI * 2); ctx1.fill(); ctx1.restore();
    }

    var c2 = document.createElement('canvas'); c2.width = c2.height = 128;
    var ctx2 = c2.getContext('2d'); ctx2.fillStyle = '#ffd23f';
    for (var i = 0; i < 26; i++) {
      ctx2.save(); ctx2.translate(64, 64); ctx2.rotate((Math.PI * 2 / 26) * i);
      ctx2.beginPath(); ctx2.ellipse(0, -32, 4, 26, 0, 0, Math.PI * 2); ctx2.fill(); ctx2.restore();
    }

    return {
      daisy: new THREE.CanvasTexture(c1),
      dandelion: new THREE.CanvasTexture(c2)
    };
  }

  // RUOHOTEKSTUURI: Vihreä pohja estää mustan alfareunuksen vuodon
  function makeGrassTexture() {
    var size = 64, h = 128;
    var c = document.createElement('canvas'); c.width = size; c.height = h;
    var ctx = c.getContext('2d');

    // Taustapohja täytetään vihreällä
    ctx.fillStyle = '#3e8c23';
    ctx.fillRect(0, 0, size, h);

    var c2 = document.createElement('canvas'); c2.width = size; c2.height = h;
    var ctx2 = c2.getContext('2d');
    var grad = ctx2.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#a4f04d');   // Kirkas vihreä kärki
    grad.addColorStop(0.5, '#5ec42d'); // Raikas keskivihreä
    grad.addColorStop(1, '#3a8720');   // Syvä vihreä tyvi

    ctx2.fillStyle = grad; ctx2.beginPath();
    ctx2.moveTo(size * 0.40, 0); ctx2.lineTo(size * 0.60, 0);
    ctx2.lineTo(size * 0.82, h); ctx2.lineTo(size * 0.18, h);
    ctx2.closePath(); ctx2.fill();

    var imgData = ctx.getImageData(0, 0, size, h);
    var shapeData = ctx2.getImageData(0, 0, size, h);
    for (var i = 0; i < imgData.data.length; i += 4) {
      var alpha = shapeData.data[i + 3];
      if (alpha > 0) {
        imgData.data[i] = shapeData.data[i];     // R
        imgData.data[i + 1] = shapeData.data[i + 1]; // G
        imgData.data[i + 2] = shapeData.data[i + 2]; // B
      }
      imgData.data[i + 3] = alpha;
    }
    ctx.putImageData(imgData, 0, 0);

    var tex = new THREE.CanvasTexture(c);
    if (THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  // SANIAISTEKSTUURI: Vihreä taustapohja poistaa mustat alfareunat
  function makeFernTexture() {
    var w = 128, h = 256;
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var ctx = c.getContext('2d');

    ctx.fillStyle = '#3a7522';
    ctx.fillRect(0, 0, w, h);

    var c2 = document.createElement('canvas'); c2.width = w; c2.height = h;
    var ctx2 = c2.getContext('2d');
    var cx = w / 2;

    var grad = ctx2.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#8ed638');   // Kirkkaanvihreä kärki
    grad.addColorStop(0.5, '#4f9b28'); // Raikas lehtivihreä
    grad.addColorStop(1, '#326b1c');   // Vahva vihreä tyvi
    ctx2.strokeStyle = grad; ctx2.lineWidth = 4;
    ctx2.beginPath(); ctx2.moveTo(cx, h); ctx2.lineTo(cx, 10); ctx2.stroke();

    var pinnae = 18;
    for (var i = 1; i <= pinnae; i++) {
      var t = i / pinnae;
      var y = h - (t * (h - 20));
      var maxLen = (w * 0.42) * Math.sin(Math.pow(1 - t, 0.7) * Math.PI);

      [-1, 1].forEach(function(side) {
        ctx2.save();
        ctx2.translate(cx, y); ctx2.scale(side, 1); ctx2.rotate(-0.38 - t * 0.2);
        ctx2.fillStyle = (i % 2 === 0) ? '#4a942a' : '#5fb334';
        ctx2.beginPath(); ctx2.moveTo(0, 0);
        ctx2.quadraticCurveTo(maxLen * 0.5, -6 - t * 4, maxLen, -2);
        ctx2.quadraticCurveTo(maxLen * 0.6, 4 + t * 2, 0, 3);
        ctx2.closePath(); ctx2.fill();

        var subTeeth = 6;
        for (var k = 1; k < subTeeth; k++) {
          var tx = maxLen * (k / subTeeth);
          ctx2.fillStyle = '#7cd13f';
          ctx2.beginPath(); ctx2.arc(tx, -3, 1.4 + (1 - t) * 0.8, 0, Math.PI * 2); ctx2.fill();
        }
        ctx2.restore();
      });
    }

    var imgData = ctx.getImageData(0, 0, w, h);
    var shapeData = ctx2.getImageData(0, 0, w, h);
    for (var i = 0; i < imgData.data.length; i += 4) {
      var alpha = shapeData.data[i + 3];
      if (alpha > 0) {
        imgData.data[i] = shapeData.data[i];     // R
        imgData.data[i + 1] = shapeData.data[i + 1]; // G
        imgData.data[i + 2] = shapeData.data[i + 2]; // B
      }
      imgData.data[i + 3] = alpha;
    }
    ctx.putImageData(imgData, 0, 0);

    var tex = new THREE.CanvasTexture(c);
    if (THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  // --- GEOMETRIAT ---

  // PITKÄ JA KAARTUVA RUOHOGEOMETRIA
  function makeCurvedGrassGeo(w, h) {
    var segs = 10;
    var p1 = new THREE.PlaneGeometry(w, h, 1, segs);
    p1.translate(0, h / 2 - 0.5, 0); // Kanta syvälle maahan

    var pos = p1.attributes.position;
    for (var i = 0; i < pos.count; i++) {
      var y = pos.getY(i);
      var t = Math.max(0, y / h);
      var curve = Math.pow(t, 1.5) * (h * 0.65); // Kaartuu voimakkaasti ulospäin
      pos.setZ(i, pos.getZ(i) - curve);
      var widthScale = 1.0 - t * 0.70; // Suippeneva kärki
      pos.setX(i, pos.getX(i) * widthScale);
    }
    p1.computeVertexNormals();

    // Monisuuntainen tuhea ruohotupsu
    var p2 = p1.clone(); p2.rotateY(Math.PI / 2);
    var p3 = p1.clone(); p3.rotateY(Math.PI / 4);
    var p4 = p1.clone(); p4.rotateY(-Math.PI / 4);

    return mergeGeometries([p1, p2, p3, p4]);
  }

  // JÄTTISANIAISEN LEHTI
  function makeFernFrondGeometry() {
    var w = 0.60, h = 2.5, segs = 10;
    var geo = new THREE.PlaneGeometry(w, h, 1, segs);
    geo.translate(0, h / 2 - 0.2, 0);
    var pos = geo.attributes.position;
    for (var i = 0; i < pos.count; i++) {
      var y = pos.getY(i);
      var t = y / h;
      var curve = Math.pow(t, 1.7) * 0.75;
      pos.setZ(i, pos.getZ(i) - curve);
      var widthScale = Math.sin(t * Math.PI * 0.88);
      pos.setX(i, pos.getX(i) * (0.3 + 0.7 * widthScale));
    }
    geo.computeVertexNormals();
    return geo;
  }

  function makeFluffySphereGeo(radius, spikeCount) {
    var spikeGeometries = [], up = new THREE.Vector3(0, 1, 0), goldenAngle = Math.PI * (3 - Math.sqrt(5));
    for (var i = 0; i < spikeCount; i++) {
      var t = (i + 0.5) / spikeCount, phi = Math.acos(1 - 2 * t), theta = goldenAngle * i;
      var dir = new THREE.Vector3(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta)).normalize();
      var len = radius * (0.8 + Math.random() * 0.4);
      var spike = new THREE.CylinderGeometry(radius * 0.015, radius * 0.03, len, 3, 1, true);
      spike.translate(0, len / 2, 0);
      var quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
      spike.applyMatrix4(new THREE.Matrix4().compose(dir.clone().multiplyScalar(radius * 0.12), quat, new THREE.Vector3(1, 1, 1)));
      spikeGeometries.push(spike);
    }
    var merged = mergeGeometries(spikeGeometries);
    merged.computeVertexNormals();
    return merged;
  }

  var flowerTexCache = null;
  var grassTexCache = null;
  var fernTexCache = null;
  var fernFrondGeoCache = null;
  var curvedGrassGeoCache = null;

  // SATAAKO VETTÄ -TARKISTUS
  function checkIsRaining(ctx) {
    if (!ctx) return false;
    return !!(
      ctx.isRaining ||
      ctx.weather === 'rain' ||
      ctx.weather === 'raining' ||
      ctx.raining ||
      (ctx.weather && ctx.weather.raining) ||
      ctx.isRain
    );
  }

  window.ENV_BUILDERS['jattikukkaniitty'] = function(track, bounds, ctx) {
    var meadowGroup = new THREE.Group();

    if (!flowerTexCache) flowerTexCache = createFlowerTextures();
    if (!grassTexCache) grassTexCache = makeGrassTexture();
    if (!fernTexCache) fernTexCache = makeFernTexture();
    if (!fernFrondGeoCache) fernFrondGeoCache = makeFernFrondGeometry();
    if (!curvedGrassGeoCache) curvedGrassGeoCache = makeCurvedGrassGeo(0.40, 3.6);

    // --- 1. SATEENKAARI TAIVAALLE (ALEMMAS & VAIN SATEELLA) ---
    var rainbowGeo = new THREE.TorusGeometry(130, 14, 16, 64, Math.PI);
    var rainbowMat = new THREE.MeshBasicMaterial({
      map: createRainbowTexture(),
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    var rainbowMesh = new THREE.Mesh(rainbowGeo, rainbowMat);
    rainbowMesh.position.set(bounds.cx, -12, bounds.cz + 160);
    
    // Näytetään sateenkaari vain jos sataa vettä
    rainbowMesh.visible = checkIsRaining(ctx);
    meadowGroup.add(rainbowMesh);

    // --- 2. KUKAT, TIHEÄ RUOHOMERI JA JÄTTISANIAISET ---
    var stemMat = new THREE.MeshStandardMaterial({ color: 0x4a7c2f, roughness: 0.8 });
    var daisyPetalMat = new THREE.MeshStandardMaterial({ map: flowerTexCache.daisy, alphaTest: 0.25, side: THREE.DoubleSide, roughness: 0.6 });
    var daisyCenterMat = new THREE.MeshStandardMaterial({ color: 0xf5ba20, roughness: 0.5 });

    var dandelionPetalMat = new THREE.MeshStandardMaterial({ map: flowerTexCache.dandelion, alphaTest: 0.25, side: THREE.DoubleSide, roughness: 0.6 });
    var dandelionCenterMat = new THREE.MeshStandardMaterial({ color: 0xe59b12, roughness: 0.5 });
    var puffballMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7, transparent: true, opacity: 0.9 });

    // Puhtaat vihreät materiaalit ilman mustia alfareunoja
    var grassMat = new THREE.MeshStandardMaterial({ map: grassTexCache, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.75 });
    var fernMat = new THREE.MeshStandardMaterial({ map: fernTexCache, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.75 });

    var bloomPlaneGeo = new THREE.PlaneGeometry(2.4, 2.4); bloomPlaneGeo.rotateX(-Math.PI / 2);
    var centerSphereGeo = new THREE.SphereGeometry(0.5, 12, 8); centerSphereGeo.scale(1, 0.4, 1);
    var puffballGeo = makeFluffySphereGeo(1.2, 50);

    // Kasvatettu ryhmien määrää valtavasti (2400 ryhmää tiheän maton aikaansaamiseksi)
    var numFlowerGroups = 2400;
    var halfSize = bounds.size / 2 * 0.92;
    var exclR = ctx.ROAD_HALF_WIDTH + ctx.CURB_WIDTH + 3.0;

    var swayingItems = [];

    for (var i = 0; i < numFlowerGroups; i++) {
      var x = bounds.cx + (Math.random() * 2 - 1) * halfSize;
      var z = bounds.cz + (Math.random() * 2 - 1) * halfSize;
      var info = ctx.closestSampleInfo(track, x, z);
      if (info.dist < exclR) continue;

      var groundY = ctx.terrainSample(track, x, z).y;
      var flowerType = Math.random();
      var scale = 1.2 + Math.random() * 1.8;

      var singleItem = new THREE.Group();

      if (flowerType < 0.72) {
        // SUURIN OSA KASVEISTA ON RUOHOA (~72 %): Luodaan monitupsuisia sankkoja ruohoryppäitä
        var tuftCount = 2 + Math.floor(Math.random() * 2); // 2–3 tupsua per ryhmä
        for (var t = 0; t < tuftCount; t++) {
          var grassMesh = new THREE.Mesh(curvedGrassGeoCache, grassMat);
          var grassScaleY = scale * (2.2 + Math.random() * 1.2);
          var grassScaleXZ = scale * (1.3 + Math.random() * 0.6);
          grassMesh.scale.set(grassScaleXZ, grassScaleY, grassScaleXZ);

          if (t > 0) {
            // Lisätupsujen pieni offset ja kääntö tuomaan sankkuutta
            grassMesh.position.set((Math.random() - 0.5) * 0.7 * scale, 0, (Math.random() - 0.5) * 0.7 * scale);
            grassMesh.rotation.y = Math.random() * Math.PI * 2;
          }
          singleItem.add(grassMesh);
        }

        // Upotetaan kanta (-0.25) tiukasti maahan
        singleItem.position.set(x, groundY - 0.25, z);

      } else if (flowerType < 0.83) {
        // Päivänkakkara
        var stemH = (2.4 + Math.random() * 2.0) * scale;
        var stemGeo = new THREE.CylinderGeometry(0.07 * scale, 0.12 * scale, stemH, 7);
        stemGeo.translate(0, stemH / 2, 0);
        var stemMesh = new THREE.Mesh(stemGeo, stemMat);
        stemMesh.castShadow = true;
        singleItem.add(stemMesh);

        var petalMesh = new THREE.Mesh(bloomPlaneGeo, daisyPetalMat);
        petalMesh.position.set(0, stemH, 0);
        petalMesh.scale.set(scale, scale, scale);

        var centerMesh = new THREE.Mesh(centerSphereGeo, daisyCenterMat);
        centerMesh.position.set(0, stemH + 0.05 * scale, 0);
        centerMesh.scale.set(scale, scale, scale);

        singleItem.add(petalMesh);
        singleItem.add(centerMesh);
        singleItem.position.set(x, groundY, z);

      } else if (flowerType < 0.92) {
        // Voikukka tai Haituvapallo
        var stemH = (2.4 + Math.random() * 2.0) * scale;
        var stemGeo = new THREE.CylinderGeometry(0.07 * scale, 0.12 * scale, stemH, 7);
        stemGeo.translate(0, stemH / 2, 0);
        var stemMesh = new THREE.Mesh(stemGeo, stemMat);
        stemMesh.castShadow = true;
        singleItem.add(stemMesh);

        if (Math.random() < 0.35) {
          // Haituvapallo
          var puffMesh = new THREE.Mesh(puffballGeo, puffballMat);
          puffMesh.position.set(0, stemH, 0);
          puffMesh.scale.set(scale, scale, scale);
          singleItem.add(puffMesh);
        } else {
          // Keltainen voikukka
          var petalMesh = new THREE.Mesh(bloomPlaneGeo, dandelionPetalMat);
          petalMesh.position.set(0, stemH, 0);
          petalMesh.scale.set(scale, scale, scale);

          var centerMesh = new THREE.Mesh(centerSphereGeo, dandelionCenterMat);
          centerMesh.position.set(0, stemH + 0.04 * scale, 0);
          centerMesh.scale.set(scale, scale, scale);

          singleItem.add(petalMesh);
          singleItem.add(centerMesh);
        }
        singleItem.position.set(x, groundY, z);

      } else {
        // JÄTTISANIAISET
        var fernGroup = new THREE.Group();
        var frondCount = 8 + Math.floor(Math.random() * 5);
        var fScale = scale * (2.0 + Math.random() * 1.0);

        for (var f = 0; f < frondCount; f++) {
          var fAngle = (f / frondCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
          var tilt = 0.50 + (f % 2 === 0 ? 0.25 : 0.0) + Math.random() * 0.2;
          var frondMesh = new THREE.Mesh(fernFrondGeoCache, fernMat);
          frondMesh.position.set(0, 0.02, 0);
          frondMesh.rotation.y = fAngle;
          frondMesh.rotateX(tilt);
          frondMesh.scale.set(fScale, fScale, fScale);
          frondMesh.castShadow = true;
          fernGroup.add(frondMesh);
        }
        singleItem.add(fernGroup);
        singleItem.position.set(x, groundY - 0.15, z);
      }

      singleItem.rotation.y = Math.random() * Math.PI * 2;
      meadowGroup.add(singleItem);

      // Rekisteröidään elementti tuulessa heilumista varten
      swayingItems.push({
        group: singleItem,
        phase: Math.random() * Math.PI * 2,
        speed: 1.0 + Math.random() * 1.0,
        maxSway: 0.05 + Math.random() * 0.07
      });
    }

    // --- 3. ANIMOITU TUULIKORTTI JA SADETARKISTUS ---
    meadowGroup.onBeforeRender = function() {
      var time = performance.now() * 0.0018;
      
      // Päivitetään sateenkaaren näkyvyys dynaamisesti sään mukaan
      rainbowMesh.visible = checkIsRaining(ctx);

      for (var s = 0; s < swayingItems.length; s++) {
        var item = swayingItems[s];
        var swayAngle = Math.sin(time * item.speed + item.phase) * item.maxSway;
        item.group.rotation.z = swayAngle;
        item.group.rotation.x = swayAngle * 0.4;
      }
    };

    return meadowGroup;
  };
})();