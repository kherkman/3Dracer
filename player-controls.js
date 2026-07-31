// player-controls.js - Pelaajien ohjaus- ja syötelogiikka (Dynaaminen Näppäimistöohjaus, Touch-Joystickit, Ratti & Polkimet, Gyro)
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
  var mouseState = { leftDown: false, rightDown: false, xNorm: 0 };

  var lastFrameTime = performance.now();

  // DYNAAMINEN NÄPPÄIMISTÖN OHJAUKSEN PÄIVITYSSILMUKKA (Nopeutettu reaktioaika)
  function updateKeyboardRamps() {
    var now = performance.now();
    var delta = (now - lastFrameTime) / 1000.0;
    lastFrameTime = now;
    if (delta > 0.1) delta = 0.1;

    var players = ['p1', 'p2', 'p3', 'p4'];
    players.forEach(function(pKey) {
      var p = keysInput[pKey];

      // Vasemmalle kääntö: nopeutettu nousuaikaa (4.5x/s = täysi käännös ~0,2 sekunnissa)
      if (p.left) {
        p.leftRamp = Math.min(1.0, p.leftRamp + delta * 4.5);
      } else {
        p.leftRamp = Math.max(0.0, p.leftRamp - delta * 6.0);
      }

      // Oikealle kääntö
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

  function initListeners(getIsRacing) {
    initGyro();
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

  // DYNAAMINEN JOYSTICK-OHJAUS
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

  // RATTI-JOYSTICK VASEMMASSA ALAKULMASSA
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
    } else if(ctrlType === 'touch' || ctrlType === 'touch_wheel') {
      return touchInputState[playerIndex];
    } else if(ctrlType === 'keyboard') {
      var pKey = 'p' + (playerIndex + 1);
      var kb = keysInput[pKey] || keysInput.p1;

      if(playerIndex === 0 && numPlayers === 1) {
        // Yksinpelissä sallitaan myös nuolinäppäimet p2-ohjaimesta p1:lle
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
    getPlayerControls: getPlayerControls,
    pairBluetoothDevice: pairBluetoothDevice
  };
})();
