// player-controls.js - Pelaajien ohjaus- ja syötelogiikka (Dynamiset Kosketusnäyttö-Joystickit, Ratti & Polkimet)
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

  var mouseState = { leftDown: false, rightDown: false, xNorm: 0 };

  function initListeners(getIsRacing) {
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

  // 1. DYNAAMINEN JOYSTICK-OHJAUS
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

      var steerThreshold = 45;
      touchInputState[playerIdx].left = (distNorm > 0.20) && (angleFromVertical > steerThreshold) && (clampDx < 0);
      touchInputState[playerIdx].right = (distNorm > 0.20) && (angleFromVertical > steerThreshold) && (clampDx > 0);

      touchInputState[playerIdx].gas = (distNorm > 0.20) && (clampDy < -10);
      touchInputState[playerIdx].brake = (distNorm > 0.20) && (clampDy > 10);
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

  // 2. KOSKETUSNÄYTTÖ RATTI & POLKIMET OHJAUS
  function bindWheelAndPedalsForPlayer(playerIdx) {
    var container = document.getElementById('touchWheelP' + (playerIdx + 1));
    if (!container) return;

    var wheel = container.querySelector('.steering-wheel-ui');
    var gasBtn = container.querySelector('.gas-pedal');
    var brakeBtn = container.querySelector('.brake-pedal');

    if (!wheel || !gasBtn || !brakeBtn) return;

    var activeWheelPointerId = null;
    var startAngle = 0;
    var currentWheelDeg = 0;

    function handleWheelDown(e) {
      if (activeWheelPointerId !== null) return;
      e.preventDefault();
      e.stopPropagation();
      activeWheelPointerId = e.pointerId;

      var rect = wheel.getBoundingClientRect();
      var centerX = rect.left + rect.width / 2;
      var centerY = rect.top + rect.height / 2;

      startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI) - currentWheelDeg;

      try { wheel.setPointerCapture(e.pointerId); } catch(err){}
    }

    function handleWheelMove(e) {
      if (e.pointerId !== activeWheelPointerId) return;
      e.preventDefault();
      e.stopPropagation();

      var rect = wheel.getBoundingClientRect();
      var centerX = rect.left + rect.width / 2;
      var centerY = rect.top + rect.height / 2;

      var touchAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
      var deg = touchAngle - startAngle;

      while (deg > 180) deg -= 360;
      while (deg < -180) deg += 360;

      deg = Math.max(-120, Math.min(120, deg));
      currentWheelDeg = deg;

      wheel.style.transform = 'rotate(' + deg + 'deg)';

      var deadzone = 45;
      touchInputState[playerIdx].left = deg < -deadzone;
      touchInputState[playerIdx].right = deg > deadzone;
    }

    function handleWheelUp(e) {
      if (e.pointerId !== activeWheelPointerId) return;
      e.preventDefault();
      e.stopPropagation();
      activeWheelPointerId = null;

      currentWheelDeg = 0;
      wheel.style.transform = 'rotate(0deg)';

      touchInputState[playerIdx].left = false;
      touchInputState[playerIdx].right = false;

      try { wheel.releasePointerCapture(e.pointerId); } catch(err){}
    }

    wheel.addEventListener('pointerdown', handleWheelDown);
    wheel.addEventListener('pointermove', handleWheelMove);
    wheel.addEventListener('pointerup', handleWheelUp);
    wheel.addEventListener('pointercancel', handleWheelUp);

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
        var wheel = containerW.querySelector('.steering-wheel-ui');
        if (wheel) wheel.style.transform = 'rotate(0deg)';
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
      left: steerAxis < -0.2 || dLeft,
      right: steerAxis > 0.2 || dRight
    };
  }

  function getPlayerControls(playerIndex, playerConfigs, numPlayers) {
    var ctrlType = playerConfigs && playerConfigs[playerIndex] ? playerConfigs[playerIndex].ctrl : 'keyboard';

    if(ctrlType === 'touch' || ctrlType === 'touch_wheel') {
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
        left: mouseState.xNorm < -0.12,
        right: mouseState.xNorm > 0.12
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