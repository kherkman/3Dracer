// env_valtameri.js - Valtameri-ympäristön 3D-määritelmä (Taivaan, auringon ja kuun heijastava THREE.Water -varjostin & Päivä/Yö kaikille vuodenajoille)
(function() {
  'use strict';

  window.ENV_BUILDERS = window.ENV_BUILDERS || {};

  /* =================================----------------==============
     SISÄÄNRAKENNETTU THREE.WATER -PEILIHEIJASTUSVARJOSTIN (ES6 CLASS)
  ================================----------------================== */
  if (typeof THREE.Water === 'undefined') {
    class Water extends THREE.Mesh {
      constructor(geometry, options) {
        options = options || {};

        var textureWidth = options.textureWidth !== undefined ? options.textureWidth : 512;
        var textureHeight = options.textureHeight !== undefined ? options.textureHeight : 512;
        var clipBias = options.clipBias !== undefined ? options.clipBias : 0.0;
        var alpha = options.alpha !== undefined ? options.alpha : 1.0;
        var time = options.time !== undefined ? options.time : 0.0;
        var normalSampler = options.waterNormals !== undefined ? options.waterNormals : null;
        var sunDirection = options.sunDirection !== undefined ? options.sunDirection : new THREE.Vector3(0.70707, 0.70707, 0.0);
        var sunColor = new THREE.Color(options.sunColor !== undefined ? options.sunColor : 0xffffff);
        var waterColor = new THREE.Color(options.waterColor !== undefined ? options.waterColor : 0x7F7F7F);
        var eye = options.eye !== undefined ? options.eye : new THREE.Vector3(0, 0, 0);
        var distortionScale = options.distortionScale !== undefined ? options.distortionScale : 20.0;
        var side = options.side !== undefined ? options.side : THREE.FrontSide;
        var fog = options.fog !== undefined ? options.fog : false;

        var mirrorPlane = new THREE.Plane();
        var normal = new THREE.Vector3();
        var mirrorWorldPosition = new THREE.Vector3();
        var cameraWorldPosition = new THREE.Vector3();
        var rotationMatrix = new THREE.Matrix4();
        var target = new THREE.Vector3();

        var view = new THREE.Vector3();
        var reflectionCamera = new THREE.PerspectiveCamera();
        var renderTarget = new THREE.WebGLRenderTarget(textureWidth, textureHeight);

        if (!THREE.MathUtils.isPowerOfTwo(textureWidth) || !THREE.MathUtils.isPowerOfTwo(textureHeight)) {
          renderTarget.texture.generateMipmaps = false;
          renderTarget.texture.minFilter = THREE.LinearFilter;
        }

        var mirrorShader = {
          uniforms: THREE.UniformsUtils.merge([
            THREE.UniformsLib['fog'],
            {
              'normalSampler': { value: null },
              'mirrorSampler': { value: null },
              'alpha': { value: 1.0 },
              'time': { value: 0.0 },
              'size': { value: 1.0 },
              'distortionScale': { value: 20.0 },
              'textureMatrix': { value: new THREE.Matrix4() },
              'sunColor': { value: new THREE.Color(0x7F7F7F) },
              'sunDirection': { value: new THREE.Vector3(0.70707, 0.70707, 0) },
              'eye': { value: new THREE.Vector3() },
              'waterColor': { value: new THREE.Color(0x555555) }
            }
          ]),
          vertexShader: [
            'uniform mat4 textureMatrix;',
            'uniform float time;',
            'varying vec4 mirrorCoord;',
            'varying vec4 worldPosition;',
            '#include <fog_pars_vertex>',
            'void main() {',
            '	mirrorCoord = modelMatrix * vec4( position, 1.0 );',
            '	worldPosition = mirrorCoord;',
            '	mirrorCoord = textureMatrix * mirrorCoord;',
            '	vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );',
            '	gl_Position = projectionMatrix * mvPosition;',
            '	#include <fog_vertex>',
            '}'
          ].join('\n'),
          fragmentShader: [
            'uniform sampler2D normalSampler;',
            'uniform sampler2D mirrorSampler;',
            'uniform float alpha;',
            'uniform float time;',
            'uniform float size;',
            'uniform float distortionScale;',
            'uniform vec3 sunColor;',
            'uniform vec3 sunDirection;',
            'uniform vec3 eye;',
            'uniform vec3 waterColor;',
            'varying vec4 mirrorCoord;',
            'varying vec4 worldPosition;',
            '#include <fog_pars_fragment>',
            'vec4 getNoise( vec2 uv ) {',
            '	vec2 uv0 = ( uv / 103.0 ) + vec2(time * 0.00002, time * 0.00001);',
            '	vec2 uv1 = ( uv / 100.0 ) + vec2(time * -0.00002, time * 0.00001);',
            '	vec4 noise = texture2D( normalSampler, uv0 ) + texture2D( normalSampler, uv1 );',
            '	return noise * 0.5 - 1.0;',
            '}',
            'void sunLight( const vec3 surfaceNormal, const vec3 eyeDirection, float shiny, float spec, float diffuse, inout vec3 diffuseColor, inout vec3 specularColor ) {',
            '	vec3 reflection = normalize( reflect( -sunDirection, surfaceNormal ) );',
            '	float direction = max( 0.0, dot( eyeDirection, surfaceNormal ) );',
            '	specularColor += pow( direction, shiny ) * sunColor * spec;',
            '	diffuseColor += max( 0.0, dot( sunDirection, surfaceNormal ) ) * sunColor * diffuse;',
            '}',
            'void main() {',
            '	vec4 noise = getNoise( worldPosition.xz * size );',
            '	vec3 surfaceNormal = normalize( noise.xzy * vec3( 1.5, 1.0, 1.5 ) );',
            '	vec3 diffLight = vec3( 0.0 );',
            '	vec3 specLight = vec3( 0.0 );',
            '	vec3 worldToEye = eye - worldPosition.xyz;',
            '	vec3 eyeDirection = normalize( worldToEye );',
            '	sunLight( surfaceNormal, eyeDirection, 100.0, 2.0, 0.5, diffLight, specLight );',
            '	vec2 distortion = surfaceNormal.xz * ( 0.001 + 1.0 / length( worldToEye ) ) * distortionScale;',
            '	vec3 reflectionSample = vec3( texture2DProj( mirrorSampler, mirrorCoord + vec4( distortion, 0.0, 0.0 ) ) );',
            '	float theta = max( 0.0, dot( eyeDirection, surfaceNormal ) );',
            '	float reflectance = 0.3 + ( 1.0 - 0.3 ) * pow( ( 1.0 - theta ), 3.0 );',
            '	vec3 scatter = max( 0.0, dot( surfaceNormal, eyeDirection ) ) * waterColor;',
            '	vec3 albedo = mix( sunColor * diffLight * 0.3 + scatter, ( vec3( 0.1 ) + reflectionSample * 0.9 + reflectionSample * specLight ), reflectance );',
            '	vec3 outgoingLight = albedo;',
            '	gl_FragColor = vec4( outgoingLight, alpha );',
            '	#include <fog_fragment>',
            '}'
          ].join('\n')
        };

        var material = new THREE.ShaderMaterial({
          fragmentShader: mirrorShader.fragmentShader,
          vertexShader: mirrorShader.vertexShader,
          uniforms: THREE.UniformsUtils.clone(mirrorShader.uniforms),
          lights: false,
          side: side,
          fog: fog
        });

        material.uniforms['normalSampler'].value = normalSampler;
        material.uniforms['mirrorSampler'].value = renderTarget.texture;
        material.uniforms['alpha'].value = alpha;
        material.uniforms['time'].value = time;
        material.uniforms['distortionScale'].value = distortionScale;
        material.uniforms['sunColor'].value = sunColor;
        material.uniforms['waterColor'].value = waterColor;

        super(geometry, material);

        this.isWater = true;
        var self = this;

        var renderReflectionPass = function(renderer, scene, camera) {
          mirrorWorldPosition.setFromMatrixPosition(self.matrixWorld);
          cameraWorldPosition.setFromMatrixPosition(camera.matrixWorld);

          rotationMatrix.extractRotation(self.matrixWorld);

          normal.set(0, 0, 1);
          normal.applyMatrix4(rotationMatrix);

          view.subVectors(mirrorWorldPosition, cameraWorldPosition);

          if (view.dot(normal) > 0) return;

          view.reflect(normal).negate();
          view.add(mirrorWorldPosition);

          reflectionCamera.position.copy(view);

          target.set(0, 0, -1);
          target.applyMatrix4(rotationMatrix);
          target.add(mirrorWorldPosition);

          view.subVectors(mirrorWorldPosition, target);
          view.reflect(normal).negate();
          view.add(mirrorWorldPosition);

          reflectionCamera.up.set(0, 1, 0);
          reflectionCamera.up.applyMatrix4(rotationMatrix);
          reflectionCamera.up.reflect(normal);
          reflectionCamera.lookAt(target);

          reflectionCamera.far = camera.far;
          reflectionCamera.updateMatrixWorld();
          reflectionCamera.projectionMatrix.copy(camera.projectionMatrix);

          self.material.uniforms['textureMatrix'].value.set(
            0.5, 0.0, 0.0, 0.5,
            0.0, 0.5, 0.0, 0.5,
            0.0, 0.0, 0.5, 0.5,
            0.0, 0.0, 0.0, 1.0
          );
          self.material.uniforms['textureMatrix'].value.multiply(reflectionCamera.projectionMatrix);
          self.material.uniforms['textureMatrix'].value.multiply(reflectionCamera.matrixWorldInverse);

          // RAJATAAN RATA, REUNAPYL VÄÄT JA AUTOT POIS HEIJASTUKSESTA
          var hiddenObjects = [];

          // 1. Piilotetaan autot
          var gameCars = (window.GameCore && typeof window.GameCore.getCars === 'function') ? window.GameCore.getCars() : [];
          gameCars.forEach(function(c) {
            if (c.mesh && c.mesh.visible) {
              c.mesh.visible = false;
              hiddenObjects.push(c.mesh);
            }
          });

          // 2. Piilotetaan rata, sillat, varikot, reunapylväät ja muut ratarakenteet
          for (var cIdx = 0; cIdx < scene.children.length; cIdx++) {
            var child = scene.children[cIdx];
            if (child.visible && child !== self) {
              var isSky = (child.material && child.material.uniforms && child.material.uniforms.topColor);
              var isSunOrMoon = (child.geometry && child.geometry.type === 'SphereGeometry' && child.geometry.parameters && (child.geometry.parameters.radius === 7 || child.geometry.parameters.radius === 6));
              
              var isStars = (child.isInstancedMesh && child.geometry && child.geometry.type === 'SphereGeometry');
              var isClouds = (child.isGroup && child.children && child.children.length > 0 && child.children[0].children && child.children[0].children.length > 0 && child.children[0].children[0].geometry && child.children[0].children[0].geometry.type === 'DodecahedronGeometry');

              if (!isSky && !isSunOrMoon && !isStars && !isClouds && !child.isLight) {
                child.visible = false;
                hiddenObjects.push(child);
              }
            }
          }

          self.visible = false;

          var currentRenderTarget = renderer.getRenderTarget();
          var currentXrEnabled = renderer.xr.enabled;
          var currentShadowAutoUpdate = renderer.shadowMap.enabled;

          renderer.xr.enabled = false;
          renderer.shadowMap.enabled = false;

          renderer.setRenderTarget(renderTarget);
          renderer.state.buffers.depth.setMask(true);

          if (renderer.autoClear === false) renderer.clear();
          renderer.render(scene, reflectionCamera);

          renderer.xr.enabled = currentXrEnabled;
          renderer.shadowMap.enabled = currentShadowAutoUpdate;

          renderer.setRenderTarget(currentRenderTarget);

          var viewport = camera.viewport;
          if (viewport !== undefined) {
            renderer.state.viewport(viewport);
          }

          self.visible = true;

          // Palautetaan radan, pylväiden ja autojen näkyvyys
          for (var h = 0; h < hiddenObjects.length; h++) {
            hiddenObjects[h].visible = true;
          }
        };

        this.updateReflection = function(renderer, scene, camera) {
          renderReflectionPass(renderer, scene, camera);
        };
      }
    }

    THREE.Water = Water;
  }

  // --- AALTOTURBULENSSI JA AALTOKOMPONENTIT ---
  var waveComponents = [
    { dir: [0.92, 0.38],   freq: 0.0028, amp: 0.58, speed: 0.75 },
    { dir: [0.38, -0.92],  freq: 0.0055, amp: 0.28, speed: 1.0 },
    { dir: [-0.71, 0.71],  freq: 0.0120, amp: 0.14, speed: 1.5 }
  ];

  function getWaveHeight(x, z, time, waveHeightMult, waveSpeedMult) {
    if (waveHeightMult < 0.1) return 0;
    var h = 0;
    for (var i = 0; i < waveComponents.length; i++) {
      var w = waveComponents[i];
      var proj = x * w.dir[0] + z * w.dir[1];
      var s = Math.sin(proj * w.freq + time * waveSpeedMult * w.speed);
      h += (Math.pow((s + 1) * 0.5, 2.4) * 2 - 1) * w.amp;
    }
    return h * waveHeightMult;
  }

  // --- PROSEDURAALINEN VEDEN MIKROVÄREILYN NORMAALIKARTTA (FBM PERLIN NOISE) ---
  function createWaterNormals() {
    var width = 512, height = 512;
    var canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    var ctx = canvas.getContext('2d');
    var imgData = ctx.createImageData(width, height);

    var p = new Uint8Array(512);
    var perm = [151,160,137,91,90,15,199,139,29,145,14,249,209,245,211,214,127,204,150,40,186,148,198,170,41,22,144,217,161,14,129,253,209,148,22,118,174,138,20,133,136,63,94,76,242,124,142,217,11,114,83,72,112,88,14,97,125,231,180,18,65,110,63,16,211,73,61,65,83,212,23,239,9,130,18,171,212,18,8,206,177,15,41,200,94,8,83,184,33,124,254,179,166,19,95,119,134,175,190,22,122,238,137,174,180,244,147,18,162,117,126,86,134,233,49,159,19,43,129,91,95,153,205,151,104,27,15,225,58,243,197,71,241,11,2,63,135,124,6,128,157,75,4,228,8,67,112,168,163,127,14,142,126,117,114,204,180,247,15,22,111,139,114,15,64,198,18,65,15,108,127,99,11,22,14,237,180,228,245,101,230,189,211,15,150,15,11,108,103,134,127,14,211,15,117,126,197,14,15,15,11,180];
    for (var i = 0; i < 512; i++) p[i] = perm[i & 255];

    function grad(hash, x, y, z) {
      var h = hash & 15;
      var u = h < 8 ? x : y;
      var v = h < 4 ? y : (h === 12 || h === 14 ? x : z);
      return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }

    function noise3D(x, y, z) {
      var X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
      x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
      var u = x*x*x*(x*(x*6-15)+10), v = y*y*y*(y*(y*6-15)+10), w = z*z*z*(z*(z*6-15)+10);
      var A = p[X]+Y, AA = p[A]+Z, AB = p[A+1]+Z, B = p[X+1]+Y, BA = p[B]+Z, BB = p[B+1]+Z;
      return (1-w)*((1-v)*((1-u)*grad(p[AA],x,y,z)+u*grad(p[BA],x-1,y,z)) + v*((1-u)*grad(p[AB],x,y-1,z)+u*grad(p[BB],x-1,y-1,z))) +
              w*((1-v)*((1-u)*grad(p[AA+1],x,y,z-1)+u*grad(p[BA+1],x-1,y,z-1)) + v*((1-u)*grad(p[AB+1],x,y-1,z-1)+u*grad(p[BB+1],x-1,y-1,z-1)));
    }

    function fbm(u, v) {
      var angleU = u * Math.PI * 2;
      var angleV = v * Math.PI * 2;
      var nx = Math.cos(angleU) * 1.5;
      var ny = Math.sin(angleU) * 1.5;
      var nz = Math.cos(angleV) * 1.5;
      var nw = Math.sin(angleV) * 1.5;

      var val = 0, amp = 0.5, scale = 1.2;
      for (var i = 0; i < 3; i++) {
        val += noise3D(nx * scale, ny * scale + nw * scale, nz * scale) * amp;
        scale *= 2.1;
        amp *= 0.5;
      }
      return val;
    }

    var eps = 0.005;

    for (var y = 0; y < height; y++) {
      for (var x = 0; x < width; x++) {
        var u = x / width;
        var v = y / height;

        var hL = fbm(u - eps, v);
        var hR = fbm(u + eps, v);
        var hD = fbm(u, v - eps);
        var hU = fbm(u, v + eps);

        var dx = (hR - hL) * 3.5;
        var dy = (hU - hD) * 3.5;
        var dz = 1.0;

        var len = Math.sqrt(dx*dx + dy*dy + dz*dz);
        dx /= len; dy /= len; dz /= len;

        var idx = (y * width + x) * 4;
        imgData.data[idx]     = Math.floor((dx * 0.5 + 0.5) * 255);
        imgData.data[idx + 1] = Math.floor((dy * 0.5 + 0.5) * 255);
        imgData.data[idx + 2] = Math.floor((dz * 0.5 + 0.5) * 255);
        imgData.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
    var texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  // --- TEKSTUURIT ---
  function createRoundParticleTexture(colorInner, colorOuter) {
    var c = document.createElement('canvas'); c.width = 64; c.height = 64;
    var ctx = c.getContext('2d');
    var g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, colorInner || 'rgba(255, 255, 255, 1.0)');
    g.addColorStop(0.5, colorOuter || 'rgba(230, 245, 255, 0.8)');
    g.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(32, 32, 32, 0, Math.PI * 2); ctx.fill();
    return new THREE.CanvasTexture(c);
  }

  function createFlatAlgaeTexture() {
    var c = document.createElement('canvas'); c.width = 128; c.height = 128;
    var ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(46, 125, 50, 0.75)';
    for (var i = 0; i < 14; i++) {
      var cx = 64 + (Math.random() - 0.5) * 45;
      var cy = 64 + (Math.random() - 0.5) * 45;
      var r = 12 + Math.random() * 22;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    return new THREE.CanvasTexture(c);
  }

  // --- JÄÄVUORET (TALVELLE) ---
  function createMonolithicIceberg(scale, iceMaterial) {
    var group = new THREE.Group();

    var mainGeo = new THREE.ConeGeometry(scale * 1.3, scale * 2.2, 7, 3);
    var pos = mainGeo.attributes.position;
    for (var i = 0; i < pos.count; i++) {
      var y = pos.getY(i);
      pos.setX(i, pos.getX(i) + (Math.sin(y * 0.15) + (Math.random() - 0.5)) * scale * 0.22);
      pos.setZ(i, pos.getZ(i) + (Math.cos(y * 0.15) + (Math.random() - 0.5)) * scale * 0.22);
    }
    mainGeo.computeVertexNormals();

    var mainMesh = new THREE.Mesh(mainGeo, iceMaterial);
    mainMesh.position.y = scale * 0.6;
    group.add(mainMesh);

    for (var k = 0; k < 3; k++) {
      var subScale = scale * (0.45 + Math.random() * 0.35);
      var subGeo = new THREE.ConeGeometry(subScale * 1.4, subScale * 1.8, 6, 2);
      var subPos = subGeo.attributes.position;
      for (var j = 0; j < subPos.count; j++) {
        subPos.setX(j, subPos.getX(j) + (Math.random() - 0.5) * subScale * 0.2);
        subPos.setZ(j, subPos.getZ(j) + (Math.random() - 0.5) * subScale * 0.2);
      }
      subGeo.computeVertexNormals();

      var subMesh = new THREE.Mesh(subGeo, iceMaterial);
      var angle = (k / 3) * Math.PI * 2 + Math.random() * 0.4;
      var offset = scale * 0.65;
      subMesh.position.set(Math.cos(angle) * offset, subScale * 0.5, Math.sin(angle) * offset);
      group.add(subMesh);
    }

    var shelfGeo = new THREE.CylinderGeometry(scale * 1.9, scale * 2.1, scale * 0.35, 8);
    var shelfMesh = new THREE.Mesh(shelfGeo, iceMaterial);
    shelfMesh.position.y = -scale * 0.05;
    group.add(shelfMesh);

    return group;
  }

  // --- VALTAMEREN PÄÄBUILDERI ---
  window.ENV_BUILDERS['valtameri'] = function(track, bounds, ctx) {
    var oceanGroup = new THREE.Group();
    var season = ctx.currentSeason || 'kesa';
    var timeOfDay = ctx.currentTimeOfDay || 'paiva';
    var configKey = season + '_' + timeOfDay;

    // Vuodenaika- ja vuorokaudenaikakohtaiset parametrit (Täydelliset Päivä & Yö asetukset)
    var seasons = {
      // --- KESÄ ---
      kesa_paiva: {
        waterColor: 0x006655,
        sunColor: 0xffffff,
        distortionScale: 3.5,
        waveHeight: 2.2,
        waveSpeed: 0.8,
        foamOpacity: 0.0,
        algaeOpacity: 0.85,
        showIce: false,
        particleOpacity: 0.15,
        particleColor: 0xfff0aa,
        particleSpeedY: -0.05
      },
      kesa_yo: { // Suomalainen valoisa yötön yö
        waterColor: 0x003344,
        sunColor: 0xffa066,
        distortionScale: 2.5,
        waveHeight: 1.8,
        waveSpeed: 0.6,
        foamOpacity: 0.0,
        algaeOpacity: 0.6,
        showIce: false,
        particleOpacity: 0.35,
        particleColor: 0xffd4b8,
        particleSpeedY: -0.05
      },
      // --- SYKSY ---
      syksy_paiva: {
        waterColor: 0x031018,
        sunColor: 0xff5500,
        distortionScale: 5.5,
        waveHeight: 6.0,
        waveSpeed: 0.55,
        foamOpacity: 0.95,
        algaeOpacity: 0.0,
        showIce: false,
        particleOpacity: 0.8,
        particleColor: 0x88aacc,
        particleSpeedY: -3.5
      },
      syksy_yo: {
        waterColor: 0x01080e,
        sunColor: 0x335588,
        distortionScale: 6.0,
        waveHeight: 7.2,
        waveSpeed: 0.65,
        foamOpacity: 0.85,
        algaeOpacity: 0.0,
        showIce: false,
        particleOpacity: 0.9,
        particleColor: 0x557799,
        particleSpeedY: -4.0
      },
      // --- TALVI ---
      talvi_paiva: {
        waterColor: 0x010d18,
        sunColor: 0xbbe0ff,
        distortionScale: 1.5,
        waveHeight: 1.2,
        waveSpeed: 0.4,
        foamOpacity: 0.0,
        algaeOpacity: 0.0,
        showIce: true,
        particleOpacity: 0.9,
        particleColor: 0xffffff,
        particleSpeedY: -0.5
      },
      talvi_yo: {
        waterColor: 0x00060d,
        sunColor: 0x6699cc,
        distortionScale: 1.2,
        waveHeight: 0.9,
        waveSpeed: 0.3,
        foamOpacity: 0.0,
        algaeOpacity: 0.0,
        showIce: true,
        particleOpacity: 0.95,
        particleColor: 0xddeeff,
        particleSpeedY: -0.4
      },
      // --- KEVÄT (LISÄTTY ELOISAT AALLOT) ---
      kevat_paiva: {
        waterColor: 0x007777,
        sunColor: 0xffe2b4,
        distortionScale: 2.2,
        waveHeight: 1.6,
        waveSpeed: 0.6,
        foamOpacity: 0.15,
        algaeOpacity: 0.0,
        showIce: false,
        particleOpacity: 0.3,
        particleColor: 0xe0ffee,
        particleSpeedY: -0.08
      },
      kevat_yo: {
        waterColor: 0x002d38,
        sunColor: 0x88bbdd,
        distortionScale: 2.5,
        waveHeight: 1.8,
        waveSpeed: 0.65,
        foamOpacity: 0.15,
        algaeOpacity: 0.0,
        showIce: false,
        particleOpacity: 0.4,
        particleColor: 0xaaeeff,
        particleSpeedY: -0.1
      }
    };

    var waveConfig = seasons[configKey] || seasons[season + '_paiva'] || seasons.kesa_paiva;

    // --- 1. VALTAMEREN PINNAN GEOMETRIA JA TÄYDELLINEN THREE.WATER -PEILIHEIJASTUSOBJEKTI ---
    var size = Math.max(bounds.size * 2.5, 1200);
    var segs = 130;
    var oceanGeo = new THREE.PlaneGeometry(size, size, segs, segs);
    oceanGeo.rotateX(-Math.PI / 2);
    oceanGeo.translate(bounds.cx, 0, bounds.cz);

    var initialPositions = oceanGeo.attributes.position.array.slice();

    var waterNormals = createWaterNormals();

    var water = new THREE.Water(oceanGeo, {
      textureWidth: 512,
      textureHeight: 512,
      waterNormals: waterNormals,
      sunDirection: new THREE.Vector3(0, 1, 0),
      sunColor: waveConfig.sunColor,
      waterColor: waveConfig.waterColor,
      distortionScale: waveConfig.distortionScale,
      fog: true
    });

    oceanGroup.add(water);

    // --- 2. VAAHTOPÄÄ-HIUKKASYMPÄRISTÖ ---
    var maxFoamCount = 12000;
    var foamGeo = new THREE.BufferGeometry();
    var foamPositions = new Float32Array(maxFoamCount * 3);
    foamGeo.setAttribute('position', new THREE.BufferAttribute(foamPositions, 3));

    var foamMat = new THREE.PointsMaterial({
      color: 0xffffff,
      map: createRoundParticleTexture('rgba(255,255,255,1.0)', 'rgba(230,245,255,0.8)'),
      size: 18.0,
      transparent: true,
      opacity: waveConfig.foamOpacity,
      blending: THREE.NormalBlending,
      depthWrite: false
    });

    var foamSystem = new THREE.Points(foamGeo, foamMat);
    oceanGroup.add(foamSystem);

    // --- 3. KESÄISET LITTEÄT LEVÄLAUTAT ---
    var algaePatches = [];
    if (waveConfig.algaeOpacity > 0.05) {
      var algaeTex = createFlatAlgaeTexture();
      var algaeMat = new THREE.MeshBasicMaterial({
        map: algaeTex,
        transparent: true,
        opacity: waveConfig.algaeOpacity,
        depthWrite: false,
        side: THREE.DoubleSide
      });
      var algaeGeo = new THREE.PlaneGeometry(1, 1);

      var algaeCount = 140;
      for (var a = 0; a < algaeCount; a++) {
        var aX = bounds.cx + (Math.random() - 0.5) * size * 0.7;
        var aZ = bounds.cz + (Math.random() - 0.5) * size * 0.7;

        var info = ctx.closestSampleInfo(track, aX, aZ);
        if (info.dist < ctx.ROAD_HALF_WIDTH + ctx.CURB_WIDTH + 4.0) continue;

        var aMesh = new THREE.Mesh(algaeGeo, algaeMat);
        aMesh.rotation.x = -Math.PI / 2;
        aMesh.rotation.z = Math.random() * Math.PI * 2;

        var scaleX = 10 + Math.random() * 24;
        var scaleZ = 10 + Math.random() * 24;
        aMesh.scale.set(scaleX, scaleZ, 1);

        aMesh.position.set(aX, 0.35, aZ);
        oceanGroup.add(aMesh);

        algaePatches.push({ mesh: aMesh, baseX: aX, baseZ: aZ, offset: Math.random() * 10 });
      }
    }

    // --- 4. TALVEN JÄÄVUORET ---
    var icebergsData = [];
    if (waveConfig.showIce) {
      var iceMat = new THREE.MeshStandardMaterial({
        color: (timeOfDay === 'yo') ? 0x99cce6 : 0xdff4f8,
        roughness: 0.2,
        metalness: 0.1,
        flatShading: true
      });

      var icePositions = [
        { x: bounds.cx - 140, z: bounds.cz - 100, scale: 28 },
        { x: bounds.cx + 130, z: bounds.cz - 120, scale: 32 },
        { x: bounds.cx - 180, z: bounds.cz + 80,  scale: 24 },
        { x: bounds.cx + 160, z: bounds.cz + 110, scale: 26 }
      ];

      icePositions.forEach(function(p) {
        var info = ctx.closestSampleInfo(track, p.x, p.z);
        if (info.dist >= ctx.ROAD_HALF_WIDTH + ctx.CURB_WIDTH + 10.0) {
          var iceberg = createMonolithicIceberg(p.scale, iceMat);
          iceberg.position.set(p.x, 0, p.z);
          oceanGroup.add(iceberg);
          icebergsData.push({ mesh: iceberg, baseX: p.x, baseZ: p.z, offset: Math.random() * 10 });
        }
      });
    }

    // --- 5. HIUKKASYMPÄRISTÖ (SADE / LUMI / ROISKEET) ---
    var particleCount = 3000;
    var particleGeo = new THREE.BufferGeometry();
    var particlePositions = new Float32Array(particleCount * 3);

    for (var pIdx = 0; pIdx < particleCount; pIdx++) {
      particlePositions[pIdx * 3]     = bounds.cx + (Math.random() - 0.5) * 500;
      particlePositions[pIdx * 3 + 1] = Math.random() * 120;
      particlePositions[pIdx * 3 + 2] = bounds.cz + (Math.random() - 0.5) * 500;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

    var particleMat = new THREE.PointsMaterial({
      color: waveConfig.particleColor,
      map: createRoundParticleTexture('rgba(255,255,255,1.0)', 'rgba(255,255,255,0.4)'),
      size: 1.8,
      transparent: true,
      opacity: waveConfig.particleOpacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    var particleSystem = new THREE.Points(particleGeo, particleMat);
    oceanGroup.add(particleSystem);

    // --- 6. ANIMAATIO JA LIIKE RENDERÖINTISILMUKASSA ---
    var startTime = performance.now();

    water.onBeforeRender = function(renderer, scene, camera) {
      var time = (performance.now() - startTime) * 0.001;

      // Päivitetään WaterShader-uniforms
      water.material.uniforms['time'].value += 0.016 * waveConfig.waveSpeed;
      water.material.uniforms['distortionScale'].value = waveConfig.distortionScale;
      if (water.material.uniforms['sunColor'].value.isColor) {
        water.material.uniforms['sunColor'].value.set(waveConfig.sunColor);
      } else {
        water.material.uniforms['sunColor'].value = new THREE.Color(waveConfig.sunColor);
      }
      if (water.material.uniforms['waterColor'].value.isColor) {
        water.material.uniforms['waterColor'].value.set(waveConfig.waterColor);
      } else {
        water.material.uniforms['waterColor'].value = new THREE.Color(waveConfig.waterColor);
      }

      if (camera) {
        water.material.uniforms['eye'].value.setFromMatrixPosition(camera.matrixWorld);
      }

      // Suoritetaan peilikameran dynaaminen heijastus-renderöinti
      if (typeof water.updateReflection === 'function') {
        water.updateReflection(renderer, scene, camera);
      }

      var pos = oceanGeo.attributes.position;
      var foamIndex = 0;
      var foamThreshold = waveConfig.waveHeight * 0.35;

      for (var i = 0; i < pos.count; i++) {
        var u = initialPositions[i * 3];
        var v = initialPositions[i * 3 + 2];

        var wY = getWaveHeight(u, v, time, waveConfig.waveHeight, waveConfig.waveSpeed);
        pos.setY(i, wY);

        if (wY > foamThreshold && waveConfig.foamOpacity > 0.05) {
          var crestIntensity = (wY - foamThreshold) / (waveConfig.waveHeight - foamThreshold);
          var countPerPeak = Math.floor(1 + crestIntensity * 4);

          for (var k = 0; k < countPerPeak && foamIndex < maxFoamCount; k++) {
            foamPositions[foamIndex * 3]     = u + (Math.random() - 0.5) * 12.0;
            foamPositions[foamIndex * 3 + 1] = wY + 1.5 + Math.random() * 2.5;
            foamPositions[foamIndex * 3 + 2] = v + (Math.random() - 0.5) * 12.0;
            foamIndex++;
          }
        }
      }

      oceanGeo.computeVertexNormals();
      pos.needsUpdate = true;

      // Piilotetaan käyttämättömät vaahtohiukkaset
      for (var f = foamIndex; f < maxFoamCount; f++) {
        foamPositions[f * 3 + 1] = -9999;
      }
      foamGeo.attributes.position.needsUpdate = true;
      foamMat.opacity = waveConfig.foamOpacity;

      // Kesäisen litteän levän kellunta
      if (algaePatches.length > 0) {
        algaePatches.forEach(function(item) {
          var waveY = getWaveHeight(item.baseX, item.baseZ, time, waveConfig.waveHeight, waveConfig.waveSpeed);
          item.mesh.position.y = waveY + 0.35;
          item.mesh.rotation.z = Math.sin(time * 0.4 + item.offset) * 0.1;
        });
      }

      // Talvisten jäävuorten kellunta
      if (icebergsData.length > 0) {
        icebergsData.forEach(function(item) {
          var waveY = getWaveHeight(item.baseX, item.baseZ, time, waveConfig.waveHeight, waveConfig.waveSpeed);
          item.mesh.position.y = waveY * 0.5;
          item.mesh.rotation.z = Math.sin(time * 0.7 + item.offset) * 0.02;
          item.mesh.rotation.x = Math.cos(time * 0.5 + item.offset) * 0.02;
        });
      }

      // Sadepisaroiden / lumen liike
      var pArray = particleGeo.attributes.position.array;
      for (var pIdx = 0; pIdx < particleCount; pIdx++) {
        pArray[pIdx * 3 + 1] += waveConfig.particleSpeedY;

        if (season === 'talvi') {
          pArray[pIdx * 3] += Math.sin(time + pIdx) * 0.06;
        } else if (season === 'syksy') {
          pArray[pIdx * 3] += 0.4;
        }

        if (pArray[pIdx * 3 + 1] < 0) {
          pArray[pIdx * 3 + 1] = 120;
          pArray[pIdx * 3]     = bounds.cx + (Math.random() - 0.5) * 500;
          pArray[pIdx * 3 + 2] = bounds.cz + (Math.random() - 0.5) * 500;
        }
      }
      particleGeo.attributes.position.needsUpdate = true;
    };

    return oceanGroup;
  };
})();
