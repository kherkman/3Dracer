// player-controls.js - Pelaajien ohjaus- ja syötelogiikka (Dynamiset Kosketusnäyttö-Joystickit, Ratti & Polkimet, Gyro)
(function() {
  'use strict';

  var keysInput = {
    p1: { gas:false, brake:false, left:false, right:false },
    p2: { gas:false, brake:false, left:false, right:false },
    p3: { gas:false, brake:false, left:false, right:false },
    p4: { gas:false, brake:false, left:false, right:false }
  };

  var touchInputState = [
    { gas:false, brake:false, left:false, right:false },
    { gas:false, brake:false, left:false, right:false },
    { gas:false, brake:false, left:false, right:false },
    { gas:false, brake:false, left:false, right:false }
  ];

  var gyroInputState = { gas:false, brake:false, left:false, right:false };
  var mouseState = { leftDown: false, rightDown: false, xNorm: 0 };

  // ALUSTETAAN DYNAAMINEN GYRO / LAITTEEN ASENTOANTURI
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
        // Vaakanäkymä (Landscape)
        var isSign = (screenAngle === 90) ? 1 : -1;
        steerDeg = beta * isSign;
        tiltDeg = -gamma * isSign;
      } else {
        // Pystynäkymä (Portrait)
        steerDeg = gamma;
        tiltDeg = beta - 35; // 35 asteen lepoasento
      }

      // DYNAAMINEN KÄÄNTÄMINEN RATIN TAPAAN (0.0 - 1.0)
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

      // Kallistaminen eteen/ylös = kaasu, taakse/alas = jarru
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

  // 1. DYNAAMINEN JOYSTICK-OHJAUS (steerThreshold = 10 ASTETTA, DYNAAMINEN KÄÄNTÖVOIMA)
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

      // Kääntyminen alkaa 10 asteessa (steerThreshold = 10) ja saavuttaa maksimin 90 asteessa
      var steerThreshold = 10;
      var maxAngle = 90;

      if (distNorm > 0.15 && angleFromVertical > steerThreshold) {
        var steerFactor = Math.min(1.0, (angleFromVertical - steerThreshold) / (maxAngle - steerThreshold));
        steerFactor *= distNorm; // Painotetaan etäisyydellä

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

  // 2. RATTI-JOYSTICK VASEMMASSA ALAKULMASSA (steerThreshold/deadzone = 10, DYNAAMINEN KÄÄNTÖ)
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
    var maxRange = 55;  // Vaakaliikkeen maksimietäisyys (px)
    var deadzone = 10;   // Kuolionalue/Kynnysarvo (steerThreshold = 10)

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

      // ANIMATIO: Ratti kääntyy visuaalisesti ja siirtyy vaakasuunnassa
      var rotDeg = (clampDx / maxRange) * 85;

      if (handle) {
        handle.style.transform = 'translate(calc(-50% + ' + clampDx + 'px), -50%) rotate(' + rotDeg + 'deg)';
      }

      // DYNAAMINEN KÄÄNTÖVOIMA (0.0 - 1.0) KYNNYSARVOLLA 10
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
      if(playerIndex === 0) {
        if(numPlayers === 1) {
          return {
            gas: keysInput.p1.gas || keysInput.p2.gas,
            brake: keysInput.p1.brake || keysInput.p2.brake,
            left: keysInput.p1.left || keysInput.p2.left,
            right: keysInput.p1.right || keysInput.p2.right
          };
        }
        return keysInput.p1;
      }
      if(playerIndex === 1) return keysInput.p2;
      if(playerIndex === 2) return keysInput.p3;
      if(playerIndex === 3) return keysInput.p4;
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
