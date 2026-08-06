// player-controls.js - Pelaajien ohjaus- ja syötelogiikka (Dynaaminen Näppäimistöohjaus, Touch-Joystickit, Ratti & Polkimet, Gyro, MediaPipe FaceMesh & MediaPipe Pose Vartalo-ohjaus)
(function() {
  'use strict';

  var keysInput = {
    p1: { gas:false, brake:false, left:false, right:false, leftRamp:0.0, rightRamp:0.0 },
    p2: { gas:false, brake:false, left:false, right:false, leftRamp:0.0, rightRamp:0.0 },
    p3: { gas:false, brake:false, left:false, right:false, leftRamp:0.0, rightRamp:0.0 },
    p4: { gas:false, brake:false, left:false, right:false, leftRamp:0.0, rightRamp:0.0 }
  };

  var touchInputState = [
    { gas:false, brake:false, left:false, right:false },
    { gas:false, brake:false, left:false, right:false },
    { gas:false, brake:false, left:false, right:false },
    { gas:false, brake:false, left:false, right:false }
  ];

  var gyroInputState = { gas:false, brake:false, left:false, right:false };
  var faceInputState = { gas:false, brake:false, left:false, right:false };
  var poseInputState = { gas:false, brake:false, left:false, right:false };
  var mouseState = { leftDown: false, rightDown: false, xNorm: 0 };

  var lastFrameTime = performance.now();

  // MEDIAPIPE FACEMESH & POSE KAMERALAITTEISTO
  var faceStream = null;
  var faceVideoEl = null;
  var faceCanvasEl = null;
  var faceCtx = null;

  var isFaceTrackingActive = false;
  var isFaceControlInitializing = false;
  var faceMeshInstance = null;

  var isPoseTrackingActive = false;
  var isPoseControlInitializing = false;
  var poseInstance = null;

  var mpCameraInstance = null;

  // DYNAAMINEN NÄPPÄIMISTÖN OHJAUKSEN PÄIVITYSSILMUKKA
  function updateKeyboardRamps() {
    var now = performance.now();
    var delta = (now - lastFrameTime) / 1000.0;
    lastFrameTime = now;
    if (delta > 0.1) delta = 0.1;

    var players = ['p1', 'p2', 'p3', 'p4'];
    players.forEach(function(pKey) {
      var p = keysInput[pKey];

      if (p.left) {
        p.leftRamp = Math.min(1.0, p.leftRamp + delta * 4.5);
      } else {
        p.leftRamp = Math.max(0.0, p.leftRamp - delta * 6.0);
      }

      if (p.right) {
        p.rightRamp = Math.min(1.0, p.rightRamp + delta * 4.5);
      } else {
        p.rightRamp = Math.max(0.0, p.rightRamp - delta * 6.0);
      }
    });

    requestAnimationFrame(updateKeyboardRamps);
  }

  // ALUSTETAAN GYRO / LAITTEEN ASENTOANTURI
  function initGyro() {
    if (typeof window === 'undefined' || !window.DeviceOrientationEvent) return;

    function handleOrientation(e) {
      if (!e) return;
      var screenAngle = (window.orientation || (screen.orientation && screen.orientation.angle) || 0);
      var steerDeg = 0;
      var tiltDeg = 0;

      var beta = e.beta || 0;   // [-180, 180]
      var gamma = e.gamma || 0; // [-90, 90]

      if (Math.abs(screenAngle) === 90) {
        var isSign = (screenAngle === 90) ? 1 : -1;
        steerDeg = beta * isSign;
        tiltDeg = -gamma * isSign;
      } else {
        steerDeg = gamma;
        tiltDeg = beta - 35;
      }

      var deadzoneSteer = 4;
      var maxSteer = 30;
      var absSteer = Math.abs(steerDeg);

      if (absSteer > deadzoneSteer) {
        var factor = Math.min(1.0, (absSteer - deadzoneSteer) / (maxSteer - deadzoneSteer));
        if (steerDeg < 0) {
          gyroInputState.left = factor;
          gyroInputState.right = false;
        } else {
          gyroInputState.right = factor;
          gyroInputState.left = false;
        }
      } else {
        gyroInputState.left = false;
        gyroInputState.right = false;
      }

      var deadzoneTilt = 8;
      if (tiltDeg < -deadzoneTilt) {
        gyroInputState.gas = true;
        gyroInputState.brake = false;
      } else if (tiltDeg > deadzoneTilt) {
        gyroInputState.brake = true;
        gyroInputState.gas = false;
      } else {
        gyroInputState.gas = false;
        gyroInputState.brake = false;
      }
    }

    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      window.addEventListener('touchstart', function requestGyroPermission() {
        DeviceOrientationEvent.requestPermission().then(function(state) {
          if (state === 'granted') {
            window.addEventListener('deviceorientation', handleOrientation);
          }
        }).catch(function(){});
        window.removeEventListener('touchstart', requestGyroPermission);
      }, { once: true });
    } else {
      window.addEventListener('deviceorientation', handleOrientation);
    }
  }

  // YHTEINEN KAMERAN ALUSTUSAPURI
  function ensureCameraVideoElement() {
    faceVideoEl = document.getElementById('faceControlVideo');
    if (!faceVideoEl) {
      faceVideoEl = document.createElement('video');
      faceVideoEl.id = 'faceControlVideo';
      faceVideoEl.setAttribute('playsinline', '');
      faceVideoEl.setAttribute('autoplay', '');
      faceVideoEl.setAttribute('muted', '');
      faceVideoEl.style.display = 'none';
      document.body.appendChild(faceVideoEl);
    }
    faceCanvasEl = document.getElementById('faceControlCanvas');
  }

  // ALUSTETAAN KAMERA JA NAAMAOHJAUS (FACEMESH TEKOÄLY)
  function initFaceControl() {
    if (isFaceTrackingActive || isFaceControlInitializing) return;
    if (isPoseTrackingActive) stopPoseControl();

    isFaceControlInitializing = true;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("⚠️ Laitteesi tai selaimesi ei tue videokamerayhteyttä (getUserMedia).");
      isFaceControlInitializing = false;
      return;
    }

    ensureCameraVideoElement();

    var overlayEl = document.getElementById('faceControlOverlay');
    var statusText = document.getElementById('faceStatusText');
    if (overlayEl) overlayEl.style.display = 'flex';
    if (statusText) statusText.textContent = "👤 Naamaohjaus aktiivinen";

    if (window.FaceMesh && !faceMeshInstance) {
      try {
        faceMeshInstance = new window.FaceMesh({
          locateFile: function(file) {
            return 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/' + file;
          }
        });
        faceMeshInstance.setOptions({
          maxNumFaces: 1,
          refineLandmarks: false,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });
        faceMeshInstance.onResults(onFaceMeshResults);
      } catch(e) {
        console.warn("FaceMesh alustusvirhe:", e);
      }
    }

    navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: "user" } })
      .then(function(stream) {
        faceStream = stream;
        faceVideoEl.srcObject = stream;
        faceVideoEl.play().catch(function(){});
        isFaceTrackingActive = true;
        isFaceControlInitializing = false;

        if (window.Camera && faceMeshInstance) {
          mpCameraInstance = new window.Camera(faceVideoEl, {
            onFrame: async function() {
              if (isFaceTrackingActive && faceMeshInstance) {
                await faceMeshInstance.send({ image: faceVideoEl });
              }
            },
            width: 320,
            height: 240
          });
          mpCameraInstance.start();
        } else {
          requestAnimationFrame(processFaceTrackingFrameFallback);
        }
      })
      .catch(function(err) {
        isFaceTrackingActive = false;
        isFaceControlInitializing = false;
        alert("⚠️ Kameran käyttöoikeus evättiin tai kameraa ei löydetty: " + err.message);
        if (overlayEl) overlayEl.style.display = 'none';
      });
  }

  function stopFaceControl() {
    if (mpCameraInstance) {
      try { mpCameraInstance.stop(); } catch(e){}
      mpCameraInstance = null;
    }
    if (faceStream) {
      faceStream.getTracks().forEach(function(track) { track.stop(); });
      faceStream = null;
    }
    isFaceTrackingActive = false;
    isFaceControlInitializing = false;
    var overlayEl = document.getElementById('faceControlOverlay');
    if (overlayEl) overlayEl.style.display = 'none';
    faceInputState = { gas: false, brake: false, left: false, right: false };
  }

  // FACEMESH TULOSTEN KÄSITTELY
  function onFaceMeshResults(results) {
    if (!isFaceTrackingActive) return;

    var vw = faceVideoEl ? (faceVideoEl.videoWidth || 320) : 320;
    var vh = faceVideoEl ? (faceVideoEl.videoHeight || 240) : 240;

    if (!faceCanvasEl) faceCanvasEl = document.getElementById('faceControlCanvas');

    if (faceCanvasEl) {
      if (faceCanvasEl.width !== vw || faceCanvasEl.height !== vh) {
        faceCanvasEl.width = vw;
        faceCanvasEl.height = vh;
      }
      faceCtx = faceCanvasEl.getContext('2d');
      faceCtx.save();
      faceCtx.clearRect(0, 0, vw, vh);
      faceCtx.scale(-1, 1);
      faceCtx.drawImage(results.image, -vw, 0, vw, vh);
      faceCtx.restore();
    }

    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      var landmarks = results.multiFaceLandmarks[0];

      var nose = landmarks[1];
      var leftEye = landmarks[33];
      var rightEye = landmarks[263];

      var normOffsetX = (1.0 - nose.x) - 0.5;
      var normOffsetY = nose.y - 0.5;

      var eyeDx = (rightEye.x - leftEye.x);
      var eyeDy = (rightEye.y - leftEye.y);
      var tiltAngleRad = Math.atan2(eyeDy, eyeDx);

      var totalSteer = (normOffsetX * 2.2) - (tiltAngleRad * 1.4);

      updateFaceSteering(totalSteer, normOffsetY);
      drawFaceMeshOverlay(landmarks, vw, vh);
    } else {
      faceInputState = { gas: false, brake: false, left: false, right: false };
    }
  }

  function updateFaceSteering(steerVal, normOffsetY) {
    var deadzoneSteer = 0.08;
    var absSteer = Math.abs(steerVal);

    if (absSteer > deadzoneSteer) {
      var factor = Math.min(1.0, (absSteer - deadzoneSteer) / (0.45 - deadzoneSteer));
      if (steerVal < 0) {
        faceInputState.left = factor;
        faceInputState.right = false;
      } else {
        faceInputState.right = factor;
        faceInputState.left = false;
      }
    } else {
      faceInputState.left = false;
      faceInputState.right = false;
    }

    var deadzoneY = 0.10;
    if (normOffsetY < -deadzoneY) {
      faceInputState.gas = true;
      faceInputState.brake = false;
    } else if (normOffsetY > deadzoneY) {
      faceInputState.brake = true;
      faceInputState.gas = false;
    } else {
      faceInputState.gas = false;
      faceInputState.brake = false;
    }
  }

  function drawFaceMeshOverlay(landmarks, vw, vh) {
    if (!faceCtx) return;

    faceCtx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    faceCtx.lineWidth = 1;
    faceCtx.beginPath();
    faceCtx.moveTo(vw / 2, 0); faceCtx.lineTo(vw / 2, vh);
    faceCtx.moveTo(0, vh / 2); faceCtx.lineTo(vw, vh / 2);
    faceCtx.stroke();

    var nose = landmarks[1];
    var cx = (1.0 - nose.x) * vw;
    var cy = nose.y * vh;

    faceCtx.fillStyle = '#00f0ff';
    faceCtx.beginPath();
    faceCtx.arc(cx, cy, 6, 0, Math.PI * 2);
    faceCtx.fill();

    var lEye = landmarks[33];
    var rEye = landmarks[263];
    faceCtx.strokeStyle = '#ff00aa';
    faceCtx.lineWidth = 2;
    faceCtx.beginPath();
    faceCtx.moveTo((1.0 - lEye.x) * vw, lEye.y * vh);
    faceCtx.lineTo((1.0 - rEye.x) * vw, rEye.y * vh);
    faceCtx.stroke();
  }

  function processFaceTrackingFrameFallback() {
    if (!isFaceTrackingActive || !faceVideoEl || window.FaceMesh) return;

    if (faceVideoEl.readyState === faceVideoEl.HAVE_ENOUGH_DATA) {
      var vw = faceVideoEl.videoWidth || 320;
      var vh = faceVideoEl.videoHeight || 240;

      if (!faceCanvasEl) faceCanvasEl = document.getElementById('faceControlCanvas');

      if (faceCanvasEl) {
        if (faceCanvasEl.width !== vw || faceCanvasEl.height !== vh) {
          faceCanvasEl.width = vw;
          faceCanvasEl.height = vh;
        }
        faceCtx = faceCanvasEl.getContext('2d', { willReadFrequently: true });

        faceCtx.save();
        faceCtx.scale(-1, 1);
        faceCtx.drawImage(faceVideoEl, -vw, 0, vw, vh);
        faceCtx.restore();

        var imgData = faceCtx.getImageData(0, 0, vw, vh);
        var data = imgData.data;

        var sumX = 0, sumY = 0, count = 0;
        var step = 4;

        for (var y = 0; y < vh; y += step) {
          for (var x = 0; x < vw; x += step) {
            var idx = (y * vw + x) * 4;
            var r = data[idx], g = data[idx + 1], b = data[idx + 2];

            if (r > 60 && g > 40 && b > 20 && r > g && r > b && (Math.max(r, g, b) - Math.min(r, g, b) > 15) && Math.abs(r - g) > 15) {
              sumX += x;
              sumY += y;
              count++;
            }
          }
        }

        if (count > 40) {
          var centroidX = sumX / count;
          var centroidY = sumY / count;
          var normX = (centroidX - (vw / 2)) / (vw / 2);
          var normY = (centroidY - (vh / 2)) / (vh / 2);

          updateFaceSteering(-normX, normY);
        } else {
          faceInputState = { gas: false, brake: false, left: false, right: false };
        }
      }
    }

    if (isFaceTrackingActive && !window.FaceMesh) {
      requestAnimationFrame(processFaceTrackingFrameFallback);
    }
  }

  // ALUSTETAAN KAMERA JA VARTALO-OHJAUS (MEDIAPIPE POSE TEKOÄLY)
  function initPoseControl() {
    if (isPoseTrackingActive || isPoseControlInitializing) return;
    if (isFaceTrackingActive) stopFaceControl();

    isPoseControlInitializing = true;

    // Näytetään ohjemodaali heti valittaessa
    showPoseInstructionModal();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("⚠️ Laitteesi tai selaimesi ei tue videokamerayhteyttä (getUserMedia).");
      isPoseControlInitializing = false;
      return;
    }

    ensureCameraVideoElement();

    var overlayEl = document.getElementById('faceControlOverlay');
    var statusText = document.getElementById('faceStatusText');
    if (overlayEl) overlayEl.style.display = 'flex';
    if (statusText) statusText.textContent = "🚶 Vartalo-ohjaus aktiivinen";

    if (window.Pose && !poseInstance) {
      try {
        poseInstance = new window.Pose({
          locateFile: function(file) {
            return 'https://cdn.jsdelivr.net/npm/@mediapipe/pose/' + file;
          }
        });
        poseInstance.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          enableSegmentation: false,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });
        poseInstance.onResults(onPoseResults);
      } catch(e) {
        console.warn("Pose alustusvirhe:", e);
      }
    }

    navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: "user" } })
      .then(function(stream) {
        faceStream = stream;
        faceVideoEl.srcObject = stream;
        faceVideoEl.play().catch(function(){});
        isPoseTrackingActive = true;
        isPoseControlInitializing = false;

        if (window.Camera && poseInstance) {
          mpCameraInstance = new window.Camera(faceVideoEl, {
            onFrame: async function() {
              if (isPoseTrackingActive && poseInstance) {
                await poseInstance.send({ image: faceVideoEl });
              }
            },
            width: 320,
            height: 240
          });
          mpCameraInstance.start();
        }
      })
      .catch(function(err) {
        isPoseTrackingActive = false;
        isPoseControlInitializing = false;
        alert("⚠️ Kameran käyttöoikeus evättiin tai kameraa ei löydetty: " + err.message);
        if (overlayEl) overlayEl.style.display = 'none';
      });
  }

  function stopPoseControl() {
    if (mpCameraInstance) {
      try { mpCameraInstance.stop(); } catch(e){}
      mpCameraInstance = null;
    }
    if (faceStream) {
      faceStream.getTracks().forEach(function(track) { track.stop(); });
      faceStream = null;
    }
    isPoseTrackingActive = false;
    isPoseControlInitializing = false;
    var overlayEl = document.getElementById('faceControlOverlay');
    if (overlayEl) overlayEl.style.display = 'none';
    poseInputState = { gas: false, brake: false, left: false, right: false };
  }

  function showPoseInstructionModal() {
    var modal = document.getElementById('poseInstructionModal');
    if (modal) modal.style.display = 'flex';
  }

  function initPoseModalEvents() {
    var closeBtn = document.getElementById('closePoseInstructionBtn');
    var acceptBtn = document.getElementById('acceptPoseInstructionBtn');
    var modal = document.getElementById('poseInstructionModal');

    if (closeBtn) {
      closeBtn.addEventListener('click', function() {
        if (modal) modal.style.display = 'none';
      });
    }
    if (acceptBtn) {
      acceptBtn.addEventListener('click', function() {
        if (modal) modal.style.display = 'none';
      });
    }
  }

  // MEDIAPIPE POSE TULOSTEN KÄSITTELY
  function onPoseResults(results) {
    if (!isPoseTrackingActive) return;

    var vw = faceVideoEl ? (faceVideoEl.videoWidth || 320) : 320;
    var vh = faceVideoEl ? (faceVideoEl.videoHeight || 240) : 240;

    if (!faceCanvasEl) faceCanvasEl = document.getElementById('faceControlCanvas');

    if (faceCanvasEl) {
      if (faceCanvasEl.width !== vw || faceCanvasEl.height !== vh) {
        faceCanvasEl.width = vw;
        faceCanvasEl.height = vh;
      }
      faceCtx = faceCanvasEl.getContext('2d');
      faceCtx.save();
      faceCtx.clearRect(0, 0, vw, vh);
      faceCtx.scale(-1, 1);
      faceCtx.drawImage(results.image, -vw, 0, vw, vh);
      faceCtx.restore();
    }

    if (results.poseLandmarks && results.poseLandmarks.length > 0) {
      var landmarks = results.poseLandmarks;

      var lShoulder = landmarks[11];
      var rShoulder = landmarks[12];
      var lWrist = landmarks[15];
      var rWrist = landmarks[16];
      var lHip = landmarks[23];
      var rHip = landmarks[24];
      var lKnee = landmarks[25];
      var rKnee = landmarks[26];
      var lAnkle = landmarks[27];
      var rAnkle = landmarks[28];

      // Peilattu kuva: Pelaajan vasen käsi ruudun oikealla, peilattu X -> käyttäjän vasen käsi
      var leftArmRaised = (lWrist.y < lShoulder.y - 0.08);
      var rightArmRaised = (rWrist.y < rShoulder.y - 0.08);

      if (leftArmRaised && !rightArmRaised) {
        poseInputState.left = 1.0;
        poseInputState.right = false;
      } else if (rightArmRaised && !leftArmRaised) {
        poseInputState.right = 1.0;
        poseInputState.left = false;
      } else {
        poseInputState.left = false;
        poseInputState.right = false;
      }

      // Kaasutus: Haarat levällään (nilkkojen väli leveämpi kuin lantio * 1.6)
      var hipWidth = Math.abs(rHip.x - lHip.x);
      var ankleWidth = Math.abs(rAnkle.x - lAnkle.x);
      var isLegsSpread = (ankleWidth > Math.max(0.12, hipWidth * 1.55));

      // Jarrutus: Kyykkääminen (lantio laskeutuu lähelle polvia)
      var avgHipY = (lHip.y + rHip.y) / 2;
      var avgKneeY = (lKnee.y + rKnee.y) / 2;
      var kneeHipDistance = avgKneeY - avgHipY;
      var isSquatting = (kneeHipDistance < 0.16);

      if (isSquatting) {
        poseInputState.brake = true;
        poseInputState.gas = false;
      } else if (isLegsSpread) {
        poseInputState.gas = true;
        poseInputState.brake = false;
      } else {
        poseInputState.gas = false;
        poseInputState.brake = false;
      }

      drawPoseOverlay(landmarks, vw, vh);
    } else {
      poseInputState = { gas: false, brake: false, left: false, right: false };
    }
  }

  function drawPoseOverlay(landmarks, vw, vh) {
    if (!faceCtx) return;

    var connections = [
      [11, 12], [11, 23], [12, 24], [23, 24],
      [11, 13], [13, 15], [12, 14], [14, 16],
      [23, 25], [25, 27], [24, 26], [26, 28]
    ];

    faceCtx.strokeStyle = 'rgba(0, 240, 255, 0.7)';
    faceCtx.lineWidth = 2;

    connections.forEach(function(pair) {
      var p1 = landmarks[pair[0]];
      var p2 = landmarks[pair[1]];
      if (p1 && p2 && p1.visibility > 0.4 && p2.visibility > 0.4) {
        faceCtx.beginPath();
        faceCtx.moveTo((1.0 - p1.x) * vw, p1.y * vh);
        faceCtx.lineTo((1.0 - p2.x) * vw, p2.y * vh);
        faceCtx.stroke();
      }
    });

    [15, 16, 27, 28].forEach(function(idx) {
      var pt = landmarks[idx];
      if (pt && pt.visibility > 0.4) {
        faceCtx.fillStyle = '#ffee00';
        faceCtx.beginPath();
        faceCtx.arc((1.0 - pt.x) * vw, pt.y * vh, 4, 0, Math.PI * 2);
        faceCtx.fill();
      }
    });
  }

  function initListeners(getIsRacing) {
    initGyro();
    initPoseModalEvents();
    requestAnimationFrame(updateKeyboardRamps);

    window.addEventListener('keydown', function(e){
      var k = e.key.toLowerCase();
      var isRacing = getIsRacing ? getIsRacing() : false;

      if(k==='w') keysInput.p1.gas = true;
      if(k==='s') keysInput.p1.brake = true;
      if(k==='a') keysInput.p1.left = true;
      if(k==='d') keysInput.p1.right = true;

      if(k==='arrowup') { keysInput.p2.gas = true; if(isRacing) e.preventDefault(); }
      if(k==='arrowdown') { keysInput.p2.brake = true; if(isRacing) e.preventDefault(); }
      if(k==='arrowleft') { keysInput.p2.left = true; if(isRacing) e.preventDefault(); }
      if(k==='arrowright') { keysInput.p2.right = true; if(isRacing) e.preventDefault(); }

      if(k==='t') keysInput.p3.gas = true;
      if(k==='g') keysInput.p3.brake = true;
      if(k==='f') keysInput.p3.left = true;
      if(k==='h') keysInput.p3.right = true;

      if(k==='i') keysInput.p4.gas = true;
      if(k==='k') keysInput.p4.brake = true;
      if(k==='j') keysInput.p4.left = true;
      if(k==='l') keysInput.p4.right = true;
    });

    window.addEventListener('keyup', function(e){
      var k = e.key.toLowerCase();

      if(k==='w') keysInput.p1.gas = false;
      if(k==='s') keysInput.p1.brake = false;
      if(k==='a') keysInput.p1.left = false;
      if(k==='d') keysInput.p1.right = false;

      if(k==='arrowup') keysInput.p2.gas = false;
      if(k==='arrowdown') keysInput.p2.brake = false;
      if(k==='arrowleft') keysInput.p2.left = false;
      if(k==='arrowright') keysInput.p2.right = false;

      if(k==='t') keysInput.p3.gas = false;
      if(k==='g') keysInput.p3.brake = false;
      if(k==='f') keysInput.p3.left = false;
      if(k==='h') keysInput.p3.right = false;

      if(k==='i') keysInput.p4.gas = false;
      if(k==='k') keysInput.p4.brake = false;
      if(k==='j') keysInput.p4.left = false;
      if(k==='l') keysInput.p4.right = false;
    });

    window.addEventListener('mousedown', function(e){
      var isRacing = getIsRacing ? getIsRacing() : false;
      if(!isRacing) return;
      if(e.button === 0) mouseState.leftDown = true;
      if(e.button === 2) mouseState.rightDown = true;
    });
    window.addEventListener('mouseup', function(e){
      if(e.button === 0) mouseState.leftDown = false;
      if(e.button === 2) mouseState.rightDown = false;
    });
    window.addEventListener('mousemove', function(e){
      var cx = window.innerWidth / 2;
      mouseState.xNorm = (e.clientX - cx) / cx;
    });
    window.addEventListener('contextmenu', function(e){
      var isRacing = getIsRacing ? getIsRacing() : false;
      if(isRacing) e.preventDefault();
    });
  }

  function bindJoystickForPlayer(playerIdx) {
    var container = document.getElementById('touchP' + (playerIdx + 1));
    if (!container) return;

    var base = container.querySelector('.joystick-base');
    var stick = container.querySelector('.joystick-stick');
    if (!base || !stick) return;

    var activePointerId = null;
    var startX = 0, startY = 0;
    var maxRadius = 65;

    function handlePointerDown(e) {
      if (activePointerId !== null) return;
      e.preventDefault();
      activePointerId = e.pointerId;

      var rect = container.getBoundingClientRect();
      startX = e.clientX - rect.left;
      startY = e.clientY - rect.top;

      base.style.left = startX + 'px';
      base.style.top = startY + 'px';
      base.style.display = 'block';

      stick.style.transform = 'translate(-50%, -50%)';

      try { container.setPointerCapture(e.pointerId); } catch(err){}
    }

    function handlePointerMove(e) {
      if (e.pointerId !== activePointerId) return;
      e.preventDefault();

      var rect = container.getBoundingClientRect();
      var curX = e.clientX - rect.left;
      var curY = e.clientY - rect.top;

      var dx = curX - startX;
      var dy = curY - startY;
      var dist = Math.sqrt(dx * dx + dy * dy);

      var clampDx = dx;
      var clampDy = dy;

      if (dist > maxRadius) {
        clampDx = (dx / dist) * maxRadius;
        clampDy = (dy / dist) * maxRadius;
      }

      stick.style.transform = 'translate(calc(-50% + ' + clampDx + 'px), calc(-50% + ' + clampDy + 'px))';

      var distNorm = Math.min(1.0, dist / maxRadius);
      var angleFromVertical = Math.atan2(Math.abs(clampDx), Math.abs(clampDy)) * (180 / Math.PI);

      var steerThreshold = 10;
      var maxAngle = 90;

      if (distNorm > 0.15 && angleFromVertical > steerThreshold) {
        var steerFactor = Math.min(1.0, (angleFromVertical - steerThreshold) / (maxAngle - steerThreshold));
        steerFactor *= distNorm;

        if (clampDx < 0) {
          touchInputState[playerIdx].left = steerFactor;
          touchInputState[playerIdx].right = false;
        } else {
          touchInputState[playerIdx].right = steerFactor;
          touchInputState[playerIdx].left = false;
        }
      } else {
        touchInputState[playerIdx].left = false;
        touchInputState[playerIdx].right = false;
      }

      touchInputState[playerIdx].gas = (distNorm > 0.15) && (clampDy < -8);
      touchInputState[playerIdx].brake = (distNorm > 0.15) && (clampDy > 8);
    }

    function handlePointerUp(e) {
      if (e.pointerId !== activePointerId) return;
      e.preventDefault();
      activePointerId = null;

      base.style.display = 'none';
      touchInputState[playerIdx] = { gas: false, brake: false, left: false, right: false };

      try { container.releasePointerCapture(e.pointerId); } catch(err){}
    }

    container.addEventListener('pointerdown', handlePointerDown);
    container.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('pointerup', handlePointerUp);
    container.addEventListener('pointercancel', handlePointerUp);
  }

  function bindWheelAndPedalsForPlayer(playerIdx) {
    var container = document.getElementById('touchWheelP' + (playerIdx + 1));
    if (!container) return;

    var wheelBase = container.querySelector('.steering-wheel-ui');
    var handle = container.querySelector('.wheel-handle');
    var gasBtn = container.querySelector('.gas-pedal');
    var brakeBtn = container.querySelector('.brake-pedal');

    if (!wheelBase || !gasBtn || !brakeBtn) return;

    var activeWheelPointerId = null;
    var startX = 0;
    var maxRange = 55;
    var deadzone = 10;

    function handleWheelDown(e) {
      if (activeWheelPointerId !== null) return;
      e.preventDefault(); e.stopPropagation();
      activeWheelPointerId = e.pointerId;

      startX = e.clientX;

      try { wheelBase.setPointerCapture(e.pointerId); } catch(err){}
    }

    function handleWheelMove(e) {
      if (e.pointerId !== activeWheelPointerId) return;
      e.preventDefault(); e.stopPropagation();

      var dx = e.clientX - startX;
      var clampDx = Math.max(-maxRange, Math.min(maxRange, dx));

      var rotDeg = (clampDx / maxRange) * 85;

      if (handle) {
        handle.style.transform = 'translate(calc(-50% + ' + clampDx + 'px), -50%) rotate(' + rotDeg + 'deg)';
      }

      var absDx = Math.abs(clampDx);
      if (absDx > deadzone) {
        var steerFactor = Math.min(1.0, (absDx - deadzone) / (maxRange - deadzone));
        if (clampDx < 0) {
          touchInputState[playerIdx].left = steerFactor;
          touchInputState[playerIdx].right = false;
        } else {
          touchInputState[playerIdx].right = steerFactor;
          touchInputState[playerIdx].left = false;
        }
      } else {
        touchInputState[playerIdx].left = false;
        touchInputState[playerIdx].right = false;
      }
    }

    function handleWheelUp(e) {
      if (e.pointerId !== activeWheelPointerId) return;
      e.preventDefault(); e.stopPropagation();
      activeWheelPointerId = null;

      if (handle) {
        handle.style.transform = 'translate(-50%, -50%) rotate(0deg)';
      }

      touchInputState[playerIdx].left = false;
      touchInputState[playerIdx].right = false;

      try { wheelBase.releasePointerCapture(e.pointerId); } catch(err){}
    }

    wheelBase.addEventListener('pointerdown', handleWheelDown);
    wheelBase.addEventListener('pointermove', handleWheelMove);
    wheelBase.addEventListener('pointerup', handleWheelUp);
    wheelBase.addEventListener('pointercancel', handleWheelUp);

    function handleGasDown(e) {
      e.preventDefault(); e.stopPropagation();
      gasBtn.classList.add('active');
      touchInputState[playerIdx].gas = true;
    }
    function handleGasUp(e) {
      e.preventDefault(); e.stopPropagation();
      gasBtn.classList.remove('active');
      touchInputState[playerIdx].gas = false;
    }
    gasBtn.addEventListener('pointerdown', handleGasDown);
    gasBtn.addEventListener('pointerup', handleGasUp);
    gasBtn.addEventListener('pointercancel', handleGasUp);
    gasBtn.addEventListener('pointerleave', handleGasUp);

    function handleBrakeDown(e) {
      e.preventDefault(); e.stopPropagation();
      brakeBtn.classList.add('active');
      touchInputState[playerIdx].brake = true;
    }
    function handleBrakeUp(e) {
      e.preventDefault(); e.stopPropagation();
      brakeBtn.classList.remove('active');
      touchInputState[playerIdx].brake = false;
    }
    brakeBtn.addEventListener('pointerdown', handleBrakeDown);
    brakeBtn.addEventListener('pointerup', handleBrakeUp);
    brakeBtn.addEventListener('pointercancel', handleBrakeUp);
    brakeBtn.addEventListener('pointerleave', handleBrakeUp);
  }

  function bindAllTouchControls() {
    for(var i = 0; i < 4; i++) {
      bindJoystickForPlayer(i);
      bindWheelAndPedalsForPlayer(i);
    }
  }

  function resetTouchState() {
    stopFaceControl();
    stopPoseControl();
    for(var i=0; i<4; i++) {
      touchInputState[i] = { gas:false, brake:false, left:false, right:false };
      
      var containerJ = document.getElementById('touchP' + (i + 1));
      if (containerJ) {
        var base = containerJ.querySelector('.joystick-base');
        if (base) base.style.display = 'none';
      }

      var containerW = document.getElementById('touchWheelP' + (i + 1));
      if (containerW) {
        var handle = containerW.querySelector('.wheel-handle');
        if (handle) handle.style.transform = 'translate(-50%, -50%) rotate(0deg)';
        var gasBtn = containerW.querySelector('.gas-pedal');
        var brakeBtn = containerW.querySelector('.brake-pedal');
        if (gasBtn) gasBtn.classList.remove('active');
        if (brakeBtn) brakeBtn.classList.remove('active');
      }
    }
  }

  function getGamepadInputs(gpIndex) {
    var gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    var gp = gamepads[gpIndex];
    if(!gp) return { gas:false, brake:false, left:false, right:false };

    var steerAxis = gp.axes[0] || 0;
    var gasButton = (gp.buttons[7] && gp.buttons[7].value > 0.1) || (gp.buttons[0] && gp.buttons[0].pressed);
    var brakeButton = (gp.buttons[6] && gp.buttons[6].value > 0.1) || (gp.buttons[1] && gp.buttons[1].pressed);

    var dLeft = gp.buttons[14] && gp.buttons[14].pressed;
    var dRight = gp.buttons[15] && gp.buttons[15].pressed;

    return {
      gas: !!gasButton,
      brake: !!brakeButton,
      left: steerAxis < -0.2 ? Math.abs(steerAxis) : (dLeft ? 1 : false),
      right: steerAxis > 0.2 ? steerAxis : (dRight ? 1 : false)
    };
  }

  function getPlayerControls(playerIndex, playerConfigs, numPlayers) {
    var ctrlType = playerConfigs && playerConfigs[playerIndex] ? playerConfigs[playerIndex].ctrl : 'keyboard';

    if(ctrlType === 'gyro') {
      return gyroInputState;
    } else if(ctrlType === 'face') {
      if (!isFaceTrackingActive && !isFaceControlInitializing) {
        initFaceControl();
      }
      return faceInputState;
    } else if(ctrlType === 'pose') {
      if (!isPoseTrackingActive && !isPoseControlInitializing) {
        initPoseControl();
      }
      return poseInputState;
    } else if(ctrlType === 'touch' || ctrlType === 'touch_wheel') {
      return touchInputState[playerIndex];
    } else if(ctrlType === 'keyboard') {
      var pKey = 'p' + (playerIndex + 1);
      var kb = keysInput[pKey] || keysInput.p1;

      if(playerIndex === 0 && numPlayers === 1) {
        var p1Left = keysInput.p1.leftRamp > 0 ? keysInput.p1.leftRamp : keysInput.p2.leftRamp;
        var p1Right = keysInput.p1.rightRamp > 0 ? keysInput.p1.rightRamp : keysInput.p2.rightRamp;

        return {
          gas: keysInput.p1.gas || keysInput.p2.gas,
          brake: keysInput.p1.brake || keysInput.p2.brake,
          left: p1Left > 0.02 ? p1Left : false,
          right: p1Right > 0.02 ? p1Right : false
        };
      }

      return {
        gas: kb.gas,
        brake: kb.brake,
        left: kb.leftRamp > 0.02 ? kb.leftRamp : false,
        right: kb.rightRamp > 0.02 ? kb.rightRamp : false
      };
    } else if(ctrlType.indexOf('gamepad') === 0) {
      var gpIdx = parseInt(ctrlType.replace('gamepad', '')) || 0;
      return getGamepadInputs(gpIdx);
    } else if(ctrlType === 'mouse') {
      return {
        gas: mouseState.leftDown,
        brake: mouseState.rightDown,
        left: mouseState.xNorm < -0.12 ? Math.abs(mouseState.xNorm) : false,
        right: mouseState.xNorm > 0.12 ? mouseState.xNorm : false
      };
    } else if(ctrlType === 'bluetooth') {
      return getGamepadInputs(playerIndex);
    }

    return { gas:false, brake:false, left:false, right:false };
  }

  function pairBluetoothDevice() {
    if(navigator.bluetooth && navigator.bluetooth.requestDevice) {
      navigator.bluetooth.requestDevice({ acceptAllDevices: true })
        .then(function(device) {
          alert("📶 Bluetooth-laite valittu: " + (device.name || "Tuntematon laite"));
        })
        .catch(function(err) {
          alert("Bluetooth-yhdistäminen peruutettiin tai ei tuettu: " + err);
        });
    } else {
      alert("⚠️ Liitä Bluetooth-näppäimistö, gamepad tai hiiri laitteesi asetuksista!");
    }
  }

  window.PlayerControls = {
    initListeners: initListeners,
    bindAllTouchControls: bindAllTouchControls,
    resetTouchState: resetTouchState,
    initFaceControl: initFaceControl,
    stopFaceControl: stopFaceControl,
    initPoseControl: initPoseControl,
    stopPoseControl: stopPoseControl,
    showPoseInstructionModal: showPoseInstructionModal,
    getPlayerControls: getPlayerControls,
    pairBluetoothDevice: pairBluetoothDevice
  };
})();
