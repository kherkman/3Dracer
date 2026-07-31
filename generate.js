// generate.js - Radan ja maaston generointimoottori (Sisältää piirretyn radan 3D-muunnoksen, risteyssillat, matalat seinät, aavikkodyynit & Synthwave-ruudukot)
(function() {
  'use strict';

  var ROAD_HALF_WIDTH = 4.0;
  var CURB_WIDTH = 0.55;
  var ROAD_ELEVATION = 0.22;
  var SHOULDER_END = ROAD_HALF_WIDTH + CURB_WIDTH + 0.3;
  var BLEND_END = SHOULDER_END + 11;

  var noiseSeed = 0;
  var currentHillAmp = 8;
  var puddlesList = [];

  function hash2(x, y) {
    var s = Math.sin(x * 127.1 + y * 311.7 + noiseSeed * 0.013) * 43758.5453123;
    return s - Math.floor(s);
  }

  function smoothNoise(x, y) {
    var xi = Math.floor(x), yi = Math.floor(y);
    var xf = x - xi, yf = y - yi;
    var v00 = hash2(xi, yi), v10 = hash2(xi + 1, yi), v01 = hash2(xi, yi + 1), v11 = hash2(xi + 1, yi + 1);
    var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    return v00 + (v10 - v00) * u + (v01 - v00) * v + (v00 - v10 - v01 + v11) * u * v;
  }

  function fbm(x, y, octaves) {
    var total = 0, amp = 0.5, freq = 1, maxAmp = 0;
    for (var i = 0; i < octaves; i++) {
      total += smoothNoise(x * freq, y * freq) * amp;
      maxAmp += amp; amp *= 0.5; freq *= 2.05;
    }
    return total / maxAmp;
  }

  function rawHeightAt(x, z) {
    // Ultramatala taajuus (0.0010 ja 0.0008) luo jättimäisiä, kumpuilevia ja valtavan laajoja aavikkodyynejä
    var dune1 = Math.sin(x * 0.0010 + z * 0.0008) * 3.8;
    var dune2 = Math.cos(x * 0.0007 - z * 0.0012) * 2.6;

    return dune1 + dune2;
  }

  function lineIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
    var denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
    if (denom === 0) return null;
    var ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
    var ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;
    if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
      return { x: x1 + ua * (x2 - x1), y: y1 + ua * (y2 - y1) };
    }
    return null;
  }

  // SYNTHWAVE PROSEDURAALISET RUUDUKKOTEKSTUURIT (KOODILLA PIIRRETYT)
  function makeSynthwaveGroundGridTex() {
    var size = 256;
    var c = document.createElement('canvas'); c.width = size; c.height = size;
    var ctx = c.getContext('2d');
    
    // Sysimusta / Tummapurppura pohja
    ctx.fillStyle = '#0f001e';
    ctx.fillRect(0, 0, size, size);

    // Neon Magenta ruudukkolinjat
    ctx.strokeStyle = '#ff00aa';
    ctx.lineWidth = 3;

    var step = 32;
    for (var x = 0; x <= size; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size);
      ctx.stroke();
    }
    for (var y = 0; y <= size; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }

    var tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  function makeSynthwaveRoadGridTex() {
    var size = 256;
    var c = document.createElement('canvas'); c.width = size; c.height = size;
    var ctx = c.getContext('2d');

    // Tummasävyinen ratapohja
    ctx.fillStyle = '#050b14';
    ctx.fillRect(0, 0, size, size);

    // Neon Cyan ruudukkolinjat ja kaistaraidat
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 4;

    ctx.strokeRect(2, 2, size - 4, size - 4);
    
    ctx.beginPath();
    ctx.moveTo(size / 2, 0);
    ctx.lineTo(size / 2, size);
    ctx.stroke();

    var step = 32;
    for (var y = 0; y <= size; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }

    var tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  function buildTrackPath() {
    var isBridgeTrack = Math.random() < 0.85;
    var n = 320;
    var ctrl = [];
    var baseRadius = 50 + Math.random() * 20;

    if (isBridgeTrack) {
      for (var i = 0; i < 16; i++) {
        var t = (i / 16) * Math.PI * 2;
        var rx = baseRadius * 1.15 * Math.sin(t);
        var rz = baseRadius * 0.8 * Math.sin(2 * t);
        ctrl.push(new THREE.Vector3(rx + (Math.random() - 0.5) * 6, 0, rz + (Math.random() - 0.5) * 6));
      }
    } else {
      var numCtrl = 12 + Math.floor(Math.random() * 6);
      var angleStep = (Math.PI * 2) / numCtrl;
      for (var i = 0; i < numCtrl; i++) {
        var angle = i * angleStep + (Math.random() - 0.5) * angleStep * 0.35;
        var r = baseRadius * (0.72 + Math.random() * 0.55);
        ctrl.push(new THREE.Vector3(Math.cos(angle) * r, 0, Math.sin(angle) * r));
      }
    }

    var curveBase = new THREE.CatmullRomCurve3(ctrl, true, 'catmullrom', 0.5);

    var rawPoints = [];
    var freq1 = 3 + Math.floor(Math.random() * 3), freq2 = 7 + Math.floor(Math.random() * 4);
    var phase1 = Math.random() * Math.PI * 2, phase2 = Math.random() * Math.PI * 2;
    var amp1 = baseRadius * 0.025, amp2 = baseRadius * 0.01;

    for (var i = 0; i < n; i++) {
      var u = i / n;
      var p = curveBase.getPointAt(u);
      var t = curveBase.getTangentAt(u);
      var normal = new THREE.Vector3(-t.z, 0, t.x).normalize();
      var lateral = Math.sin(u * Math.PI * 2 * freq1 + phase1) * amp1 + Math.sin(u * Math.PI * 2 * freq2 + phase2) * amp2;
      p.addScaledVector(normal, lateral);
      rawPoints.push(p);
    }

    var curveWiggly = new THREE.CatmullRomCurve3(rawPoints, true, 'catmullrom', 0.5);

    var rawSamples = [];
    for (var i = 0; i < n; i++) {
      var u = i / n;
      var p = curveWiggly.getPointAt(u);
      var t = curveWiggly.getTangentAt(u).normalize();
      rawSamples.push({ x: p.x, z: p.z, tx: t.x, tz: t.z, y: 0, bank: 0, dist: 0, surface: 0, bridgeHeight: 0 });
    }

    var overpassCenter = -1;
    var underpassCenter = -1;

    if (isBridgeTrack) {
      var bestDist = Infinity, crossI = -1, crossJ = -1;
      for (var i = 0; i < n; i++) {
        for (var step = 40; step < n - 40; step++) {
          var j = (i + step) % n;
          var dx = rawSamples[i].x - rawSamples[j].x;
          var dz = rawSamples[i].z - rawSamples[j].z;
          var d2 = dx * dx + dz * dz;
          if (d2 < bestDist) {
            bestDist = d2;
            crossI = i;
            crossJ = j;
          }
        }
      }

      if (bestDist < 30.0) {
        overpassCenter = crossJ;
        underpassCenter = crossI;
        var bridgeSpan = 32;

        for (var k = -bridgeSpan; k <= bridgeSpan; k++) {
          var sIdx = (crossJ + k + n) % n;
          var tRatio = Math.abs(k) / bridgeSpan;
          var heightRamp = 0.5 * (1.0 + Math.cos(tRatio * Math.PI)) * 9.0;
          rawSamples[sIdx].bridgeHeight = heightRamp;
        }
      }
    }

    var samples = [];
    var shiftOffset = 0;
    if (overpassCenter !== -1) {
      shiftOffset = (overpassCenter + Math.floor(n * 0.25)) % n;
    }

    for (var i = 0; i < n; i++) {
      var origIdx = (i + shiftOffset) % n;
      samples.push(rawSamples[origIdx]);
    }

    if (overpassCenter !== -1) {
      overpassCenter = (overpassCenter - shiftOffset + n) % n;
      underpassCenter = (underpassCenter - shiftOffset + n) % n;
    }

    var cum = 0;
    for (var i = 0; i < n; i++) {
      var j = (i + 1) % n;
      var dx = samples[j].x - samples[i].x, dz = samples[j].z - samples[i].z;
      samples[i].segLen = Math.sqrt(dx * dx + dz * dz);
      samples[i].dist = cum;
      cum += samples[i].segLen;
    }
    var totalLength = cum;

    for (var i = 0; i < n; i++) samples[i].rawY = rawHeightAt(samples[i].x, samples[i].z);

    var win = 5;
    for (var i = 0; i < n; i++) {
      var sum = 0;
      for (var k = -win; k <= win; k++) {
        sum += samples[(i + k + n) % n].rawY;
      }
      var baseSurfaceY = sum / (win * 2 + 1);
      samples[i].y = baseSurfaceY + (samples[i].bridgeHeight || 0);
    }

    var bankRaw = new Array(n);
    for (var i = 0; i < n; i++) {
      var prev = samples[(i - 1 + n) % n];
      var a1 = Math.atan2(samples[i].tz, samples[i].tx);
      var a0 = Math.atan2(prev.tz, prev.tx);
      var da = a1 - a0;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      bankRaw[i] = THREE.MathUtils.clamp(da * 2.5, -0.28, 0.28);
    }
    for (var i = 0; i < n; i++) {
      var sum = 0;
      for (var k = -4; k <= 4; k++) sum += bankRaw[(i + k + n) % n];
      samples[i].bank = sum / 9;
    }

    var idx = 0, type = Math.random() < 0.5 ? 0 : 1;
    while (idx < n) {
      var runLen = 14 + Math.floor(Math.random() * 22);
      for (var k = 0; k < runLen && idx < n; k++, idx++) samples[idx].surface = type;
      type = 1 - type;
    }

    var trackPoints3D = [];
    for (var i = 0; i < n; i++) {
      trackPoints3D.push(new THREE.Vector3(samples[i].x, samples[i].y + ROAD_ELEVATION, samples[i].z));
    }
    var trackCurve3D = new THREE.CatmullRomCurve3(trackPoints3D, true, 'catmullrom', 0.5);

    return { samples: samples, n: n, totalLength: totalLength, curve3D: trackCurve3D, overpassCenter: overpassCenter, underpassCenter: underpassCenter };
  }

  // GENEROIDAAN 3D-RATA PELAAJAN PIIRTÄMISTÄ PISTEISTÄ
  function buildTrackFromCustomPoints(points2d, canvasW, canvasH) {
    var n = 320;
    var ctrl = [];
    var cx = canvasW / 2;
    var cy = canvasH / 2;
    var scale = 0.45;

    for (var i = 0; i < points2d.length; i++) {
      var pt = points2d[i];
      var wx = (pt.x - cx) * scale;
      var wz = (pt.y - cy) * scale;
      ctrl.push(new THREE.Vector3(wx, 0, wz));
    }

    var curveBase = new THREE.CatmullRomCurve3(ctrl, true, 'catmullrom', 0.5);

    var rawSamples = [];
    for (var i = 0; i < n; i++) {
      var u = i / n;
      var p = curveBase.getPointAt(u);
      var t = curveBase.getTangentAt(u).normalize();
      rawSamples.push({ x: p.x, z: p.z, tx: t.x, tz: t.z, y: 0, bank: 0, dist: 0, surface: 0, bridgeHeight: 0 });
    }

    var overpassCenter = -1;
    var underpassCenter = -1;

    var minGap = 35;
    for (var i = 0; i < n; i++) {
      var iNext = (i + 1) % n;
      for (var j = i + minGap; j < n - 20; j++) {
        var jNext = (j + 1) % n;
        var hit = lineIntersect(
          rawSamples[i].x, rawSamples[i].z, rawSamples[iNext].x, rawSamples[iNext].z,
          rawSamples[j].x, rawSamples[j].z, rawSamples[jNext].x, rawSamples[jNext].z
        );
        if (hit) {
          overpassCenter = j;
          underpassCenter = i;
          var bridgeSpan = 28;

          for (var k = -bridgeSpan; k <= bridgeSpan; k++) {
            var sIdx = (j + k + n) % n;
            var tRatio = Math.abs(k) / bridgeSpan;
            var heightRamp = 0.5 * (1.0 + Math.cos(tRatio * Math.PI)) * 9.0;
            rawSamples[sIdx].bridgeHeight = heightRamp;
          }
          break;
        }
      }
      if (overpassCenter !== -1) break;
    }

    var samples = rawSamples;

    var cum = 0;
    for (var i = 0; i < n; i++) {
      var j = (i + 1) % n;
      var dx = samples[j].x - samples[i].x, dz = samples[j].z - samples[i].z;
      samples[i].segLen = Math.sqrt(dx * dx + dz * dz);
      samples[i].dist = cum;
      cum += samples[i].segLen;
    }
    var totalLength = cum;

    for (var i = 0; i < n; i++) samples[i].rawY = rawHeightAt(samples[i].x, samples[i].z);

    var win = 5;
    for (var i = 0; i < n; i++) {
      var sum = 0;
      for (var k = -win; k <= win; k++) {
        sum += samples[(i + k + n) % n].rawY;
      }
      var baseSurfaceY = sum / (win * 2 + 1);
      samples[i].y = baseSurfaceY + (samples[i].bridgeHeight || 0);
    }

    var bankRaw = new Array(n);
    for (var i = 0; i < n; i++) {
      var prev = samples[(i - 1 + n) % n];
      var a1 = Math.atan2(samples[i].tz, samples[i].tx);
      var a0 = Math.atan2(prev.tz, prev.tx);
      var da = a1 - a0;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      bankRaw[i] = THREE.MathUtils.clamp(da * 2.5, -0.28, 0.28);
    }
    for (var i = 0; i < n; i++) {
      var sum = 0;
      for (var k = -4; k <= 4; k++) sum += bankRaw[(i + k + n) % n];
      samples[i].bank = sum / 9;
    }

    var idx = 0, type = Math.random() < 0.5 ? 0 : 1;
    while (idx < n) {
      var runLen = 14 + Math.floor(Math.random() * 22);
      for (var k = 0; k < runLen && idx < n; k++, idx++) samples[idx].surface = type;
      type = 1 - type;
    }

    var trackPoints3D = [];
    for (var i = 0; i < n; i++) {
      trackPoints3D.push(new THREE.Vector3(samples[i].x, samples[i].y + ROAD_ELEVATION, samples[i].z));
    }
    var trackCurve3D = new THREE.CatmullRomCurve3(trackPoints3D, true, 'catmullrom', 0.5);

    return { samples: samples, n: n, totalLength: totalLength, curve3D: trackCurve3D, overpassCenter: overpassCenter, underpassCenter: underpassCenter };
  }

  function closestSampleInfo(track, x, z, carY) {
    var samples = track.samples, n = track.n;
    var best = Infinity, bi = 0;
    var check3D = (typeof carY === 'number');

    for (var i = 0; i < n; i++) {
      var dx = x - samples[i].x, dz = z - samples[i].z;
      var d2 = dx * dx + dz * dz;
      if (check3D) {
        var dy = carY - (samples[i].y + ROAD_ELEVATION);
        d2 += dy * dy * 3.0;
      }
      if (d2 < best) { best = d2; bi = i; }
    }

    var s = samples[bi];
    var perpX = -s.tz, perpZ = s.tx;
    var dx = x - s.x, dz = z - s.z;
    var latDist = dx * perpX + dz * perpZ;

    return { dist: Math.sqrt(best), sample: s, sampleIndex: bi, latDist: latDist };
  }

  function terrainSample(track, x, z, currentSeason, currentEnvironment) {
    var info = closestSampleInfo(track, x, z);
    var raw = rawHeightAt(x, z);
    var d = info.dist;
    var y, zoneT;

    if (d < SHOULDER_END) {
      y = info.sample.y - (info.sample.bridgeHeight || 0) - 0.25;
      zoneT = 0;
    } else {
      var t = THREE.MathUtils.smoothstep(d, SHOULDER_END, BLEND_END);
      y = THREE.MathUtils.lerp(info.sample.y - (info.sample.bridgeHeight || 0) - 0.25, raw, t);
      zoneT = t;
    }

    var shoulder, grassA, grassB, rock;

    // Aavikolla käytetään lämpimiä vaaleankeltaisia hiekan sävyjä ilman vihreää
    if (currentEnvironment === 'pyramidit') {
      shoulder = [0.78, 0.65, 0.45];
      grassA = [0.92, 0.82, 0.58]; // Vaalea oljenkeltainen hiekka
      grassB = [0.88, 0.75, 0.50]; // Lämmin kultainen hiekka
      rock = [0.82, 0.70, 0.48];
    } else {
      shoulder = [0.34, 0.28, 0.19];
      if (currentSeason === 'kesa') {
        grassA = [0.20, 0.38, 0.13]; grassB = [0.30, 0.47, 0.19];
      } else if (currentSeason === 'syksy') {
        grassA = [0.42, 0.35, 0.15]; grassB = [0.55, 0.42, 0.18];
      } else if (currentSeason === 'talvi') {
        grassA = [0.85, 0.90, 0.92]; grassB = [0.92, 0.95, 0.97];
      } else {
        grassA = [0.32, 0.52, 0.18]; grassB = [0.45, 0.62, 0.22];
      }
      rock = (currentSeason === 'talvi') ? [0.8, 0.85, 0.9] : [0.52, 0.50, 0.46];
    }

    var patch = smoothNoise(x * 0.05 + 50, z * 0.05 + 50);

    function lerp3(a, b, t) {
      return [THREE.MathUtils.lerp(a[0], b[0], t), THREE.MathUtils.lerp(a[1], b[1], t), THREE.MathUtils.lerp(a[2], b[2], t)];
    }

    var grass = lerp3(grassA, grassB, patch);
    var heightT = THREE.MathUtils.clamp(raw / (currentHillAmp || 10), 0, 1);
    var grassOrRock = lerp3(grass, rock, THREE.MathUtils.smoothstep(heightT, 0.6, 0.95));
    var col = lerp3(shoulder, grassOrRock, zoneT);
    return { y: y, color: col };
  }

  function getRoadSurfaceHeight(track, x, z, carY) {
    var info = closestSampleInfo(track, x, z, carY);
    var s = info.sample;
    var bankOffset = Math.sin(s.bank) * info.latDist;
    return s.y + ROAD_ELEVATION + bankOffset;
  }

  function buildBridgeStructures(track) {
    var bGroup = new THREE.Group();
    if (!track || track.overpassCenter === -1) return bGroup;

    var pillarMat = new THREE.MeshStandardMaterial({ color: 0x4a4a50, roughness: 0.5, metalness: 0.5 });
    var deckMat = new THREE.MeshStandardMaterial({ color: 0x2d2d32, roughness: 0.6 });
    var railMat = new THREE.MeshStandardMaterial({ color: 0x888890, roughness: 0.3, metalness: 0.8 });

    var underpassSample = (track.underpassCenter !== -1) ? track.samples[track.underpassCenter] : null;

    for (var k = -28; k <= 28; k += 2) {
      var idx = (track.overpassCenter + k + track.n) % track.n;
      var s = track.samples[idx];
      if (s.bridgeHeight && s.bridgeHeight > 1.2) {
        var perp = new THREE.Vector3(-s.tz, 0, s.tx).normalize();
        var roadY = s.y + ROAD_ELEVATION;

        var deckMesh = new THREE.Mesh(new THREE.BoxGeometry(ROAD_HALF_WIDTH * 2.2, 0.6, 2.2), deckMat);
        deckMesh.position.set(s.x, roadY - 0.35, s.z);
        deckMesh.rotation.y = Math.atan2(s.tx, s.tz);
        deckMesh.castShadow = true;
        bGroup.add(deckMesh);

        var r1 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 2.2), railMat);
        r1.position.set(s.x + perp.x * (ROAD_HALF_WIDTH + 0.2), roadY + 0.35, s.z + perp.z * (ROAD_HALF_WIDTH + 0.2));
        r1.rotation.y = Math.atan2(s.tx, s.tz);

        var r2 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 2.2), railMat);
        r2.position.set(s.x - perp.x * (ROAD_HALF_WIDTH + 0.2), roadY + 0.35, s.z - perp.z * (ROAD_HALF_WIDTH + 0.2));
        r2.rotation.y = Math.atan2(s.tx, s.tz);

        bGroup.add(r1); bGroup.add(r2);

        if (k % 6 === 0 && s.bridgeHeight > 2.5) {
          var skipPillar = false;
          if (underpassSample) {
            var distToUnderpass = Math.sqrt(Math.pow(s.x - underpassSample.x, 2) + Math.pow(s.z - underpassSample.z, 2));
            if (distToUnderpass < ROAD_HALF_WIDTH + 4.0) {
              skipPillar = true;
            }
          }

          if (!skipPillar) {
            var pHeight = s.bridgeHeight;
            var p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, pHeight, 8), pillarMat);
            p1.position.set(s.x + perp.x * (ROAD_HALF_WIDTH + 0.6), roadY - pHeight / 2, s.z + perp.z * (ROAD_HALF_WIDTH + 0.6));
            p1.castShadow = true;

            var p2 = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, pHeight, 8), pillarMat);
            p2.position.set(s.x - perp.x * (ROAD_HALF_WIDTH + 0.6), roadY - pHeight / 2, s.z - perp.z * (ROAD_HALF_WIDTH + 0.6));
            p2.castShadow = true;

            bGroup.add(p1); bGroup.add(p2);
          }
        }
      }
    }
    return bGroup;
  }

  function makeCheckeredTexture() {
    var c = document.createElement('canvas'); c.width = 128; c.height = 32;
    var ctx = c.getContext('2d');
    var cols = 8, rows = 2;
    var w = c.width / cols, h = c.height / rows;
    for (var r = 0; r < rows; r++) {
      for (var col = 0; col < cols; col++) {
        ctx.fillStyle = (r + col) % 2 === 0 ? '#ffffff' : '#111111';
        ctx.fillRect(col * w, r * h, w, h);
      }
    }
    var tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  function makeBannerTexture() {
    var c = document.createElement('canvas'); c.width = 512; c.height = 128;
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#e62419'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 10; ctx.strokeRect(6, 6, c.width - 12, c.height - 12);
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 50px "Segoe UI", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('START / FINISH', c.width / 2, c.height / 2);
    var tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  function buildFinishLine(track) {
    var group = new THREE.Group();
    var s0 = track.samples[0];
    var tangent = new THREE.Vector3(s0.tx, 0, s0.tz).normalize();
    var perp = new THREE.Vector3(-s0.tz, 0, s0.tx).normalize();

    var L = 2.4;
    var W = ROAD_HALF_WIDTH;

    var backCenter = new THREE.Vector3(s0.x, 0, s0.z).addScaledVector(tangent, -L / 2);
    var frontCenter = new THREE.Vector3(s0.x, 0, s0.z).addScaledVector(tangent, L / 2);

    var blX = backCenter.x + perp.x * W, blZ = backCenter.z + perp.z * W;
    var blY = getRoadSurfaceHeight(track, blX, blZ) + 0.04;

    var brX = backCenter.x - perp.x * W, brZ = backCenter.z - perp.z * W;
    var brY = getRoadSurfaceHeight(track, brX, brZ) + 0.04;

    var flX = frontCenter.x + perp.x * W, flZ = frontCenter.z + perp.z * W;
    var flY = getRoadSurfaceHeight(track, flX, flZ) + 0.04;

    var frX = frontCenter.x - perp.x * W, frZ = frontCenter.z - perp.z * W;
    var frY = getRoadSurfaceHeight(track, frX, frZ) + 0.04;

    var positions = new Float32Array([
      blX, blY, blZ,
      brX, brY, brZ,
      flX, flY, flZ,
      frX, frY, frZ
    ]);

    var uvs = new Float32Array([
      0, 0,
      1, 0,
      0, 1,
      1, 1
    ]);

    var indices = [
      0, 2, 1,
      1, 2, 3
    ];

    var stripeGeo = new THREE.BufferGeometry();
    stripeGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    stripeGeo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    stripeGeo.setIndex(indices);
    stripeGeo.computeVertexNormals();

    var stripeMat = new THREE.MeshStandardMaterial({
      map: makeCheckeredTexture(),
      roughness: 0.5,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4
    });

    var stripe = new THREE.Mesh(stripeGeo, stripeMat);
    stripe.receiveShadow = true;
    group.add(stripe);

    var postMat = new THREE.MeshStandardMaterial({ color: 0x333336, roughness: 0.4, metalness: 0.6 });
    var postGeo = new THREE.CylinderGeometry(0.18, 0.22, 5.5, 12);
    postGeo.translate(0, 2.75, 0);

    var leftX = s0.x + perp.x * (ROAD_HALF_WIDTH + 0.8);
    var leftZ = s0.z + perp.z * (ROAD_HALF_WIDTH + 0.8);
    var leftY = getRoadSurfaceHeight(track, leftX, leftZ);

    var rightX = s0.x - perp.x * (ROAD_HALF_WIDTH + 0.8);
    var rightZ = s0.z - perp.z * (ROAD_HALF_WIDTH + 0.8);
    var rightY = getRoadSurfaceHeight(track, rightX, rightZ);

    var leftPost = new THREE.Mesh(postGeo, postMat);
    leftPost.position.set(leftX, leftY, leftZ);
    leftPost.castShadow = true;
    group.add(leftPost);

    var rightPost = new THREE.Mesh(postGeo, postMat);
    rightPost.position.set(rightX, rightY, rightZ);
    rightPost.castShadow = true;
    group.add(rightPost);

    var bannerGeo = new THREE.BoxGeometry(ROAD_HALF_WIDTH * 2 + 1.6, 1.2, 0.3);
    var bannerTex = makeBannerTexture();
    var bannerMat = [
      postMat, postMat, postMat, postMat,
      new THREE.MeshStandardMaterial({ map: bannerTex, roughness: 0.4 }),
      new THREE.MeshStandardMaterial({ map: bannerTex, roughness: 0.4 })
    ];
    var banner = new THREE.Mesh(bannerGeo, bannerMat);
    var angle = Math.atan2(s0.tx, s0.tz);
    var topCenterY = (leftY + rightY) / 2 + 4.8;
    banner.position.set(s0.x, topCenterY, s0.z);
    banner.rotation.y = angle;
    banner.castShadow = true;
    group.add(banner);

    return group;
  }

  function buildPuddles(track, waterGroup, waterEnabled, reflectionTexture) {
    puddlesList = [];
    while (waterGroup.children.length > 0) {
      var obj = waterGroup.children[0];
      if (obj.geometry) obj.geometry.dispose();
      waterGroup.remove(obj);
    }

    if (!waterEnabled) return puddlesList;

    var minY = Infinity, maxY = -Infinity;
    for (var i = 0; i < track.n; i++) {
      var y = track.samples[i].y;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }

    var waterLevel = minY + (maxY - minY) * 0.28;
    var pMat = new THREE.MeshStandardMaterial({
      color: 0x3a6073,
      roughness: 0.02,
      metalness: 0.95,
      envMap: reflectionTexture || null,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide
    });

    for (var i = 10; i < track.n - 10; i += 18) {
      var s = track.samples[i];
      if (s.y < waterLevel && (!s.bridgeHeight || s.bridgeHeight < 1.0)) {
        var rx = ROAD_HALF_WIDTH * 0.75;
        var rz = 3.0 + Math.random() * 2.5;
        var circleGeo = new THREE.CircleGeometry(rx, 16);
        circleGeo.rotateX(-Math.PI / 2);
        circleGeo.scale(1, 1, rz / rx);

        var pMesh = new THREE.Mesh(circleGeo, pMat);
        var py = getRoadSurfaceHeight(track, s.x, s.z) + 0.03;
        pMesh.position.set(s.x, py, s.z);
        var angle = Math.atan2(s.tx, s.tz);
        pMesh.rotation.y = angle;

        waterGroup.add(pMesh);
        puddlesList.push({ x: s.x, z: s.z, radius: rx * 1.2 });
      }
    }
    return puddlesList;
  }

  function makeBoosterProceduralTex() {
    var c = document.createElement('canvas'); c.width = 128; c.height = 128;
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#ff2200'; ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = '#ffee00';
    ctx.beginPath();
    ctx.moveTo(64, 10); ctx.lineTo(110, 60); ctx.lineTo(80, 60);
    ctx.lineTo(80, 110); ctx.lineTo(48, 110); ctx.lineTo(48, 60); ctx.lineTo(18, 60);
    ctx.closePath(); ctx.fill();
    var tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  function buildBoosters(track, boostersEnabled, texturesEnabled, loadTextureWithFallback, ENV_TEXTURE_PATHS) {
    var bGroup = new THREE.Group();
    var boosters = [];
    if (!track || !boostersEnabled) return { group: bGroup, boosters: boosters };

    var boosterTex = (texturesEnabled && typeof loadTextureWithFallback === 'function')
      ? loadTextureWithFallback(ENV_TEXTURE_PATHS.booster, 1, 1, '#ffdd00', 'BOOST')
      : makeBoosterProceduralTex();

    var bMat = new THREE.MeshStandardMaterial({
      map: boosterTex,
      roughness: 0.3,
      metalness: 0.2,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3
    });

    var boosterIndices = [
      Math.floor(track.n * 0.15),
      Math.floor(track.n * 0.35),
      Math.floor(track.n * 0.55),
      Math.floor(track.n * 0.72),
      Math.floor(track.n * 0.88)
    ];

    for (var k = 0; k < boosterIndices.length; k++) {
      var idx = boosterIndices[k];
      var s = track.samples[idx];
      if (!s || (s.bridgeHeight && s.bridgeHeight > 1.0)) continue;

      var w = ROAD_HALF_WIDTH * 1.8;
      var h = 3.6;
      var geo = new THREE.PlaneGeometry(w, h);
      geo.rotateX(-Math.PI / 2);

      var mesh = new THREE.Mesh(geo, bMat);
      var y = getRoadSurfaceHeight(track, s.x, s.z) + 0.04;
      mesh.position.set(s.x, y, s.z);
      mesh.rotation.y = Math.atan2(s.tx, s.tz);

      bGroup.add(mesh);
      boosters.push({ x: s.x, z: s.z, radius: 2.8 });
    }

    return { group: bGroup, boosters: boosters };
  }

  function buildPitStop(track, pitStopEnabled, texturesEnabled, loadTextureWithFallback, ENV_TEXTURE_PATHS) {
    var pGroup = new THREE.Group();
    var pitStopArea = null;
    if (!track || !pitStopEnabled) return { group: pGroup, pitStopArea: pitStopArea };

    var pitIdx = Math.max(0, track.n - 18);
    var s = track.samples[pitIdx];
    if (!s) return { group: pGroup, pitStopArea: pitStopArea };

    var perp = new THREE.Vector3(-s.tz, 0, s.tx).normalize();
    var sideDist = ROAD_HALF_WIDTH + 1.2;

    var px = s.x + perp.x * sideDist;
    var pz = s.z + perp.z * sideDist;
    var py = getRoadSurfaceHeight(track, px, pz) + 0.03;

    var pitBoxGeo = new THREE.PlaneGeometry(3.5, 7.0);
    pitBoxGeo.rotateX(-Math.PI / 2);

    var varikkoTexUrl = ENV_TEXTURE_PATHS ? ENV_TEXTURE_PATHS.varikko : 'varikko.jpg';
    var pitTex = (texturesEnabled && typeof loadTextureWithFallback === 'function')
      ? loadTextureWithFallback(varikkoTexUrl, 1, 1, '#1e293b', 'VARIKKO')
      : null;

    if (!pitTex) {
      var c = document.createElement('canvas'); c.width = 128; c.height = 256;
      var ctxCanvas = c.getContext('2d');
      ctxCanvas.fillStyle = '#1e293b'; ctxCanvas.fillRect(0, 0, 128, 256);
      ctxCanvas.strokeStyle = '#ffee00'; ctxCanvas.lineWidth = 8;
      ctxCanvas.strokeRect(6, 6, 116, 244);
      ctxCanvas.fillStyle = '#ffffff'; ctxCanvas.font = 'bold 28px sans-serif';
      ctxCanvas.textAlign = 'center'; ctxCanvas.textBaseline = 'middle';
      ctxCanvas.fillText('PIT', 64, 128);

      pitTex = new THREE.CanvasTexture(c);
      pitTex.encoding = THREE.sRGBEncoding;
    }

    var pitMat = new THREE.MeshStandardMaterial({
      map: pitTex,
      roughness: 0.5,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3
    });

    var mesh = new THREE.Mesh(pitBoxGeo, pitMat);
    mesh.position.set(px, py, pz);
    mesh.rotation.y = Math.atan2(s.tx, s.tz);
    pGroup.add(mesh);

    var postGeo = new THREE.CylinderGeometry(0.12, 0.12, 4.0, 8);
    postGeo.translate(0, 2.0, 0);
    var postMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 });
    var postMesh = new THREE.Mesh(postGeo, postMat);
    postMesh.position.set(px + perp.x * 2.0, py, pz + perp.z * 2.0);
    pGroup.add(postMesh);

    var signCanvas = document.createElement('canvas'); signCanvas.width = 256; signCanvas.height = 96;
    var sCtx = signCanvas.getContext('2d');
    sCtx.fillStyle = '#0284c7'; sCtx.fillRect(0, 0, 256, 96);
    sCtx.fillStyle = '#ffffff'; sCtx.font = 'bold 36px sans-serif';
    sCtx.textAlign = 'center'; sCtx.textBaseline = 'middle';
    sCtx.fillText('🛞 VARIKKO', 128, 48);

    var signTex = new THREE.CanvasTexture(signCanvas);
    signTex.encoding = THREE.sRGBEncoding;

    var signGeo = new THREE.BoxGeometry(2.4, 0.9, 0.2);
    var signMat = new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.3 });
    var signMesh = new THREE.Mesh(signGeo, signMat);
    signMesh.position.set(px + perp.x * 2.0, py + 3.6, pz + perp.z * 2.0);
    signMesh.rotation.y = Math.atan2(s.tx, s.tz);
    pGroup.add(signMesh);

    pitStopArea = { x: px, z: pz, radius: 4.5 };

    return { group: pGroup, pitStopArea: pitStopArea };
  }

  function makeAsphaltProceduralTex() {
    var size = 256, c = document.createElement('canvas'); c.width = c.height = size;
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#3a3a3d'; ctx.fillRect(0, 0, size, size);
    for (var i = 0; i < 2600; i++) {
      var x = Math.random() * size, y = Math.random() * size;
      var g = Math.floor(Math.random() * 40 - 20);
      var v = 58 + g;
      ctx.fillStyle = 'rgba(' + v + ',' + v + ',' + (v + 3) + ',0.5)';
      ctx.fillRect(x, y, 1.4, 1.4);
    }
    var tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  function makeGravelProceduralTex() {
    var size = 256, c = document.createElement('canvas'); c.width = c.height = size;
    var ctx = c.getContext('2d');
    var grad = ctx.createLinearGradient(0, 0, 0, size);
    grad.addColorStop(0, '#ab8f66'); grad.addColorStop(1, '#8f7350');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, size, size);
    for (var i = 0; i < 3200; i++) {
      var x = Math.random() * size, y = Math.random() * size;
      var r = 0.6 + Math.random() * 1.8;
      var g = Math.floor(Math.random() * 50 - 25);
      ctx.fillStyle = 'rgba(' + (150 + g) + ',' + (125 + g) + ',' + (90 + g) + ',0.6)';
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    var tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  function buildTerrain(track, currentEnvironment, currentSeason, texturesEnabled, loadTextureWithFallback, ENV_TEXTURE_PATHS) {
    var minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (var i = 0; i < track.n; i++) {
      var s = track.samples[i];
      if (s.x < minX) minX = s.x; if (s.x > maxX) maxX = s.x;
      if (s.z < minZ) minZ = s.z; if (s.z > maxZ) maxZ = s.z;
    }
    var cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
    var size = Math.max(maxX - minX, maxZ - minZ) + 140;
    var segs = 112;
    var geo = new THREE.PlaneGeometry(size, size, segs, segs);
    geo.rotateX(-Math.PI / 2);
    geo.translate(cx, 0, cz);
    var posAttr = geo.attributes.position;
    var colors = new Float32Array(posAttr.count * 3);
    for (var i = 0; i < posAttr.count; i++) {
      var x = posAttr.getX(i), z = posAttr.getZ(i);
      var ts = terrainSample(track, x, z, currentSeason, currentEnvironment);
      posAttr.setY(i, ts.y);
      colors[i * 3] = ts.color[0]; colors[i * 3 + 1] = ts.color[1]; colors[i * 3 + 2] = ts.color[2];
    }
    posAttr.needsUpdate = true;
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    var terrainTex;
    if (currentEnvironment === 'synthwave') {
      terrainTex = makeSynthwaveGroundGridTex();
      terrainTex.repeat.set(size / 8, size / 8);
    } else {
      var groundTexUrl;
      if (currentEnvironment === 'kaupunki') {
        groundTexUrl = ENV_TEXTURE_PATHS.cityfloor;
      } else if (currentEnvironment === 'hitech') {
        groundTexUrl = ENV_TEXTURE_PATHS.hitechfloor;
      } else if (currentEnvironment === 'jattisieni') {
        groundTexUrl = ENV_TEXTURE_PATHS.shroomfloor;
      } else if (currentEnvironment === 'jattikukkaniitty') {
        groundTexUrl = ENV_TEXTURE_PATHS.kukkamaa || 'kukkamaa.jpg';
      } else if (currentEnvironment === 'suo') {
        groundTexUrl = ENV_TEXTURE_PATHS.suo || 'suo.jpg';
      } else if (currentEnvironment === 'pyramidit') {
        groundTexUrl = ENV_TEXTURE_PATHS.gravel || 'hiekka.jpg';
      } else if (currentSeason === 'talvi' && (currentEnvironment === 'simple' || currentEnvironment === 'simplekuusi' || currentEnvironment === 'simplekoivu' || currentEnvironment === 'kuusi' || currentEnvironment === 'koivu')) {
        groundTexUrl = ENV_TEXTURE_PATHS.lumi || 'lumi.jpg';
      } else {
        groundTexUrl = ENV_TEXTURE_PATHS.grass;
      }
      terrainTex = texturesEnabled ? loadTextureWithFallback(groundTexUrl, size / 6, size / 6, '#d4a373', 'HIEKKA') : null;
    }

    var mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      map: terrainTex,
      roughness: 1, metalness: 0
    });
    var mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    return { mesh: mesh, bounds: { minX: minX, maxX: maxX, minZ: minZ, maxZ: maxZ, cx: cx, cz: cz, size: size } };
  }

  function buildRoad(track, texturesEnabled, loadTextureWithFallback, ENV_TEXTURE_PATHS, currentEnvironment, gravelEnabled) {
    var n = track.n, samples = track.samples;
    var positions = [], uvs = [];
    for (var i = 0; i < n; i++) {
      var s = samples[i];
      var perp = new THREE.Vector3(-s.tz, 0, s.tx).normalize();
      var bankOffset = Math.sin(s.bank) * ROAD_HALF_WIDTH;
      var baseSurfaceY = s.y + ROAD_ELEVATION;
      var leftY = baseSurfaceY + bankOffset;
      var rightY = baseSurfaceY - bankOffset;
      var lx = s.x + perp.x * ROAD_HALF_WIDTH, lz = s.z + perp.z * ROAD_HALF_WIDTH;
      var rx = s.x - perp.x * ROAD_HALF_WIDTH, rz = s.z - perp.z * ROAD_HALF_WIDTH;
      positions.push(lx, leftY, lz, rx, rightY, rz);
      
      var v = s.dist / 12.0;
      uvs.push(0, v, 1, v);
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2));

    var asphaltIdx = [], gravelIdx = [];
    for (var i = 0; i < n; i++) {
      var j = (i + 1) % n;
      var a = 2 * i, b = 2 * i + 1, c = 2 * j, d = 2 * j + 1;
      
      var isGravel = (gravelEnabled !== false) && (samples[i].surface === 1);
      var target = isGravel ? gravelIdx : asphaltIdx;
      target.push(a, b, d, a, d, c);
    }
    var indices = asphaltIdx.concat(gravelIdx);
    geo.setIndex(indices);
    geo.addGroup(0, asphaltIdx.length, 0);
    geo.addGroup(asphaltIdx.length, gravelIdx.length, 1);
    geo.computeVertexNormals();

    var asphaltTex;
    if (currentEnvironment === 'synthwave') {
      asphaltTex = makeSynthwaveRoadGridTex();
      asphaltTex.repeat.set(1, 1);
    } else {
      var asphaltTexUrl = (currentEnvironment === 'hitech') ? ENV_TEXTURE_PATHS.hitechroad : 
                          (currentEnvironment === 'jattisieni') ? (ENV_TEXTURE_PATHS.sienitie || 'sienitie.jpg') : 
                          ENV_TEXTURE_PATHS.asphalt;
      asphaltTex = texturesEnabled ? loadTextureWithFallback(asphaltTexUrl, 1, 1, '#333333', 'RATA') : makeAsphaltProceduralTex();
    }

    var gravelTex = texturesEnabled ? loadTextureWithFallback(ENV_TEXTURE_PATHS.gravel, 1, 1, '#8f7350', 'HIEKKA') : makeGravelProceduralTex();

    var asphaltMat = new THREE.MeshStandardMaterial({ map: asphaltTex, roughness: 0.92, metalness: 0.05, side: THREE.DoubleSide });
    var gravelMat = new THREE.MeshStandardMaterial({ map: gravelTex, roughness: 1.0, side: THREE.DoubleSide });
    var mesh = new THREE.Mesh(geo, [asphaltMat, gravelMat]);
    mesh.receiveShadow = true;
    return mesh;
  }

  function buildCurbs(track) {
    var n = track.n, samples = track.samples;
    var positions = [], colors = [], indices = [];
    var blockLen = 4.0;
    function addSide(sideSign) {
      var vertsStart = positions.length / 3;
      for (var i = 0; i < n; i++) {
        var s = samples[i];
        var perp = new THREE.Vector3(-s.tz, 0, s.tx).normalize();
        var bankOffset = Math.sin(s.bank) * ROAD_HALF_WIDTH;
        var edgeY = s.y + ROAD_ELEVATION + sideSign * bankOffset;
        var innerR = ROAD_HALF_WIDTH;
        var midR = ROAD_HALF_WIDTH + CURB_WIDTH * 0.55;
        var outerR = ROAD_HALF_WIDTH + CURB_WIDTH;
        var ix = s.x + perp.x * innerR * sideSign, iz = s.z + perp.z * innerR * sideSign;
        var mx = s.x + perp.x * midR * sideSign, mz = s.z + perp.z * midR * sideSign;
        var ox = s.x + perp.x * outerR * sideSign, oz = s.z + perp.z * outerR * sideSign;
        var innerY = edgeY + 0.02, midY = edgeY + 0.22, outerY = edgeY + 0.05;
        positions.push(ix, innerY, iz, mx, midY, mz, ox, outerY, oz);
        var block = Math.floor(s.dist / blockLen) % 2;
        var col = block === 0 ? [0.78, 0.09, 0.07] : [0.90, 0.88, 0.82];
        colors.push(col[0], col[1], col[2], col[0], col[1], col[2], col[0], col[1], col[2]);
      }
      for (var i = 0; i < n; i++) {
        var j = (i + 1) % n;
        var base = vertsStart + i * 3, base2 = vertsStart + j * 3;
        indices.push(base + 0, base + 1, base2 + 1, base + 0, base2 + 1, base2 + 0);
        indices.push(base + 1, base + 2, base2 + 2, base + 1, base2 + 2, base2 + 1);
      }
    }
    addSide(1); addSide(-1);
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    var mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, side: THREE.DoubleSide });
    var mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true; mesh.receiveShadow = true;
    return mesh;
  }

  function concatFloat32(arrays) {
    var total = 0;
    for (var i = 0; i < arrays.length; i++) total += arrays[i].length;
    var result = new Float32Array(total);
    var offset = 0;
    for (var i = 0; i < arrays.length; i++) { result.set(arrays[i], offset); offset += arrays[i].length; }
    return result;
  }

  function mergeGeometries(geometries) {
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

  // REUNAN TYYLIT (PYLVÄÄT TAI YHTENÄISET MATALAT HARMAAT SEINÄT)
  function buildDelineators(track, curbStyle) {
    var n = track.n, samples = track.samples;

    if (curbStyle === 'seinat') {
      var positions = [], indices = [];
      var wallH = 0.65;
      var wallW = 0.25;

      function addWallSide(sideSign) {
        var vertsStart = positions.length / 3;
        for (var i = 0; i < n; i++) {
          var s = samples[i];
          var perp = new THREE.Vector3(-s.tz, 0, s.tx).normalize();
          var bankOffset = Math.sin(s.bank) * ROAD_HALF_WIDTH;
          var baseEdgeY = s.y + ROAD_ELEVATION + sideSign * bankOffset;

          var innerR = ROAD_HALF_WIDTH + CURB_WIDTH + 0.05;
          var outerR = innerR + wallW;

          var ix = s.x + perp.x * innerR * sideSign, iz = s.z + perp.z * innerR * sideSign;
          var ox = s.x + perp.x * outerR * sideSign, oz = s.z + perp.z * outerR * sideSign;

          var bY = baseEdgeY;
          var tY = baseEdgeY + wallH;

          // 4 pistettä poikkileikkaukselle at i:
          // 0: sisäpohja, 1: sisäylä, 2: ulkoylä, 3: ulkopohja
          positions.push(ix, bY, iz, ix, tY, iz, ox, tY, oz, ox, bY, oz);
        }

        for (var i = 0; i < n; i++) {
          var j = (i + 1) % n;
          var b1 = vertsStart + i * 4;
          var b2 = vertsStart + j * 4;

          // Sisäseinä
          indices.push(b1 + 0, b1 + 1, b2 + 1, b1 + 0, b2 + 1, b2 + 0);
          // Päällinen (kansi)
          indices.push(b1 + 1, b1 + 2, b2 + 2, b1 + 1, b2 + 2, b2 + 1);
          // Ulkoseinä
          indices.push(b1 + 2, b1 + 3, b2 + 3, b1 + 2, b2 + 3, b2 + 2);
        }
      }

      addWallSide(1);  // Vasen puoli
      addWallSide(-1); // Oikea puoli

      var geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
      geo.setIndex(indices);
      geo.computeVertexNormals();

      var wallMat = new THREE.MeshStandardMaterial({
        color: 0x7a8288,
        roughness: 0.65,
        metalness: 0.25,
        side: THREE.DoubleSide
      });

      var wallMesh = new THREE.Mesh(geo, wallMat);
      wallMesh.castShadow = true;
      wallMesh.receiveShadow = true;
      return wallMesh;
    }

    // Oletus: Pylväät
    var postGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.8, 6); postGeo.translate(0, 0.4, 0);
    var capGeo = new THREE.ConeGeometry(0.1, 0.2, 6); capGeo.translate(0, 0.9, 0);
    var merged = mergeGeometries([postGeo, capGeo]);
    var step = 3;
    var list = [];
    for (var i = 0; i < n; i += step) {
      var s = samples[i];
      var perp = new THREE.Vector3(-s.tz, 0, s.tx).normalize();
      var side = (Math.floor(i / step) % 2 === 0) ? 1 : -1;
      var r = ROAD_HALF_WIDTH + CURB_WIDTH + 0.35;
      var x = s.x + perp.x * r * side, z = s.z + perp.z * r * side;
      var bankOffset = Math.sin(s.bank) * ROAD_HALF_WIDTH;
      var y = s.y + ROAD_ELEVATION + side * bankOffset;
      list.push({ x: x, y: y, z: z, block: Math.floor(s.dist / 4.0) % 2 });
    }
    var inst = new THREE.InstancedMesh(merged, new THREE.MeshStandardMaterial({ roughness: 0.6 }), list.length);
    var m4 = new THREE.Matrix4(), col = new THREE.Color(), q = new THREE.Quaternion();
    for (var i = 0; i < list.length; i++) {
      var p = list[i];
      m4.compose(new THREE.Vector3(p.x, p.y, p.z), q, new THREE.Vector3(1, 1, 1));
      inst.setMatrixAt(i, m4);
      if (p.block === 0) col.setRGB(0.85, 0.28, 0.05); else col.setRGB(0.92, 0.92, 0.9);
      inst.setColorAt(i, col);
    }
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    inst.castShadow = true;
    return inst;
  }

  function buildForest(track, bounds, currentEnvironment, currentSeason, currentTimeOfDay, texturesEnabled, loadTextureWithFallback, CITY_TEXTURE_PATHS, HITECH_TEXTURE_PATHS, CAR_TEXTURE_PATHS) {
    if (window.ENV_BUILDERS && typeof window.ENV_BUILDERS[currentEnvironment] === 'function') {
      return window.ENV_BUILDERS[currentEnvironment](track, bounds, {
        currentSeason: currentSeason,
        currentTimeOfDay: currentTimeOfDay,
        texturesEnabled: texturesEnabled,
        loadTextureWithFallback: loadTextureWithFallback,
        closestSampleInfo: closestSampleInfo,
        terrainSample: terrainSample,
        getRoadSurfaceHeight: getRoadSurfaceHeight,
        ROAD_HALF_WIDTH: ROAD_HALF_WIDTH,
        CURB_WIDTH: CURB_WIDTH,
        CITY_TEXTURE_PATHS: CITY_TEXTURE_PATHS,
        HITECH_TEXTURE_PATHS: HITECH_TEXTURE_PATHS,
        CAR_TEXTURE_PATHS: CAR_TEXTURE_PATHS
      });
    }
    return new THREE.Group();
  }

  function resetNoiseSeed() {
    noiseSeed = Math.random() * 10000;
    currentHillAmp = 5.5 + Math.random() * 6.5;
  }

  window.TrackGenerator = {
    ROAD_HALF_WIDTH: ROAD_HALF_WIDTH,
    CURB_WIDTH: CURB_WIDTH,
    ROAD_ELEVATION: ROAD_ELEVATION,
    resetNoiseSeed: resetNoiseSeed,
    buildTrackPath: buildTrackPath,
    buildTrackFromCustomPoints: buildTrackFromCustomPoints,
    closestSampleInfo: closestSampleInfo,
    terrainSample: terrainSample,
    getRoadSurfaceHeight: getRoadSurfaceHeight,
    buildBridgeStructures: buildBridgeStructures,
    buildFinishLine: buildFinishLine,
    buildPuddles: buildPuddles,
    buildBoosters: buildBoosters,
    buildPitStop: buildPitStop,
    buildTerrain: buildTerrain,
    buildRoad: buildRoad,
    buildCurbs: buildCurbs,
    buildDelineators: buildDelineators,
    buildForest: buildForest
  };
})();
