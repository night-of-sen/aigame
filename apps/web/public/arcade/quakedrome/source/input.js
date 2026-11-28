
// We use the ev.code for keyboard input. This contains a string like "KeyW"
// or "ArrowLeft", which is awkward to use, but it's keyboard layout neutral,
// so that WASD should work with any layout.

// We detect the 6th or 3rd char for each of those strings and map them to an
// in-game button.

// Movement, Action, Prev/Next, Jump
let keymap = {
		W: 1, p: 1, // Key[W] or ArrowU[p]
		A: 2, e: 2, // Key[A] or ArrowL[e]ft
		S: 3, o: 3, // Key[S] or ArrowD[o]wn
		D: 4, i: 4, // Key[D] or ArrowR[i]ght
		Q: 5,       // Key[Q]
		E: 6,       // Key[E]
		c: 9,       // KeySpa[c]e
	},
	keys = [
		// Unused zeroth key, so we can test the keymap result for truthiness
		0,

		// WASD/Arrow Keys and prev next have to be set to zero, because we use 
		// the value (0 or 1) to calculate the move direction or weapon switch
		0,0,0,0,
		0,0

		// Following Keys (action, jump) to not have to be set here
		// as they are just tested for truthiness
	],
	key_up = 1,
	key_down = 3,
	key_left = 2,
	key_right = 4,
	key_prev = 5,
	key_next = 6,
	key_action = 7, // ev.button = 0
	key_jump = 9, // ev.button = 2
	mouse_x = 0, 
	mouse_y = 0,
	last_wheel_event = 0;

document.onkeydown = (ev) => {
	let k = keymap[ev.code[6] || ev.code[3]];
	if (k) {
		ev.preventDefault();
		keys[k] = 1;
	}
};

document.onkeyup = (ev) => {
	let k = keymap[ev.code[6] || ev.code[3]];
	if (k) {
		ev.preventDefault();
		keys[k] = 0;
	}
};

document.onwheel = (ev) => {
	// Allow for one wheel event every 0.1s. This sucks, but prevents free
	// spinning or touch scrolling mouses (eg. Apple Magic Mouse) from doing
	// wild things.
	if (game_time - last_wheel_event > 0.1) {
		keys[key_prev + (ev.deltaY > 1 ? 1 : 0)] = 1;
		last_wheel_event = game_time;
	}
};

c.onmousemove = (ev) => {
	mouse_x += ev.movementX;
	mouse_y += ev.movementY;
};

c.onmousedown = (ev) => {
	ev.preventDefault();
	keys[key_action + ev.button] = 1;
};

c.onmouseup = (ev) => {
	ev.preventDefault();
	keys[key_action + ev.button] = 0;
};

// ===== SYNTHPLAY MULTI-TOUCH MOBILE FPS CONTROLLER =====
(() => {
	const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || window.matchMedia('(pointer: coarse)').matches;
	if (isTouch) document.body.classList.add('touch-on');

	const tbtn = document.getElementById('tbtn');
	if (tbtn) {
		tbtn.addEventListener('click', (e) => {
			e.stopPropagation();
			document.body.classList.toggle('touch-on');
		});
	}

	const joyZone = document.getElementById('joy-zone');
	const joyNub = document.getElementById('joy-nub');
	const lookZone = document.getElementById('look-zone');
	const btnFire = document.getElementById('btn-fire');
	const btnJump = document.getElementById('btn-jump');
	const btnWpn = document.getElementById('btn-wpn');

	let joyTouchId = null;
	let lookTouchId = null;
	let lookLastX = 0;
	let lookLastY = 0;
	let fireTouchId = null;
	let fireLastX = 0;
	let fireLastY = 0;

	const updateJoy = (touch) => {
		if (!joyZone || !joyNub) return;
		const r = joyZone.getBoundingClientRect();
		const cx = r.left + r.width / 2;
		const cy = r.top + r.height / 2;
		const maxR = r.width * 0.38;
		let dx = touch.clientX - cx;
		let dy = touch.clientY - cy;
		const dist = Math.hypot(dx, dy);
		if (dist > maxR) {
			dx = (dx / dist) * maxR;
			dy = (dy / dist) * maxR;
		}
		joyNub.style.transform = `translate(${dx}px, ${dy}px)`;
		const dead = maxR * 0.24;
		keys[key_up] = dy < -dead ? 1 : 0;
		keys[key_down] = dy > dead ? 1 : 0;
		keys[key_left] = dx < -dead ? 1 : 0;
		keys[key_right] = dx > dead ? 1 : 0;
	};

	const resetJoy = () => {
		joyTouchId = null;
		if (joyNub) joyNub.style.transform = 'translate(0px, 0px)';
		keys[key_up] = keys[key_down] = keys[key_left] = keys[key_right] = 0;
	};

	if (joyZone) {
		joyZone.addEventListener('touchstart', (ev) => {
			ev.preventDefault();
			ev.stopPropagation();
			if (joyTouchId === null && ev.changedTouches[0]) {
				joyTouchId = ev.changedTouches[0].identifier;
				updateJoy(ev.changedTouches[0]);
			}
		}, { passive: false });
		joyZone.addEventListener('touchmove', (ev) => {
			ev.preventDefault();
			for (const t of ev.changedTouches) {
				if (t.identifier === joyTouchId) updateJoy(t);
			}
		}, { passive: false });
		joyZone.addEventListener('touchend', (ev) => {
			for (const t of ev.changedTouches) {
				if (t.identifier === joyTouchId) resetJoy();
			}
		}, { passive: false });
		joyZone.addEventListener('touchcancel', resetJoy, { passive: false });
	}

	if (lookZone) {
		lookZone.addEventListener('touchstart', (ev) => {
			ev.preventDefault();
			if (lookTouchId === null && ev.changedTouches[0]) {
				const t = ev.changedTouches[0];
				lookTouchId = t.identifier;
				lookLastX = t.clientX;
				lookLastY = t.clientY;
			}
		}, { passive: false });
		lookZone.addEventListener('touchmove', (ev) => {
			ev.preventDefault();
			for (const t of ev.changedTouches) {
				if (t.identifier === lookTouchId) {
					mouse_x += (t.clientX - lookLastX) * 2.4;
					mouse_y += (t.clientY - lookLastY) * 1.7;
					lookLastX = t.clientX;
					lookLastY = t.clientY;
				}
			}
		}, { passive: false });
		const endLook = (ev) => {
			for (const t of ev.changedTouches) {
				if (t.identifier === lookTouchId) lookTouchId = null;
			}
		};
		lookZone.addEventListener('touchend', endLook, { passive: false });
		lookZone.addEventListener('touchcancel', () => { lookTouchId = null; }, { passive: false });
	}

	// FIRE button also supports simultaneous thumb-drag aiming!
	if (btnFire) {
		btnFire.addEventListener('touchstart', (ev) => {
			ev.preventDefault();
			ev.stopPropagation();
			const t = ev.changedTouches[0];
			if (t) {
				fireTouchId = t.identifier;
				fireLastX = t.clientX;
				fireLastY = t.clientY;
			}
			keys[key_action] = 1;
			btnFire.classList.add('active');
		}, { passive: false });
		btnFire.addEventListener('touchmove', (ev) => {
			ev.preventDefault();
			for (const t of ev.changedTouches) {
				if (t.identifier === fireTouchId) {
					mouse_x += (t.clientX - fireLastX) * 2.0;
					mouse_y += (t.clientY - fireLastY) * 1.4;
					fireLastX = t.clientX;
					fireLastY = t.clientY;
				}
			}
		}, { passive: false });
		const stopFire = () => {
			fireTouchId = null;
			keys[key_action] = 0;
			btnFire.classList.remove('active');
		};
		btnFire.addEventListener('touchend', stopFire, { passive: false });
		btnFire.addEventListener('touchcancel', stopFire, { passive: false });
	}

	if (btnJump) {
		btnJump.addEventListener('touchstart', (ev) => {
			ev.preventDefault();
			ev.stopPropagation();
			keys[key_jump] = 1;
		}, { passive: false });
		const stopJump = () => { keys[key_jump] = 0; };
		btnJump.addEventListener('touchend', stopJump, { passive: false });
		btnJump.addEventListener('touchcancel', stopJump, { passive: false });
	}

	if (btnWpn) {
		btnWpn.addEventListener('touchstart', (ev) => {
			ev.preventDefault();
			ev.stopPropagation();
			keys[key_next] = 1;
			setTimeout(() => { keys[key_next] = 0; }, 120);
		}, { passive: false });
	}
})();


