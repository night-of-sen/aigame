terminal_write_line('INITIATING...');

(function initUnderrunTouch() {
	var isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || window.matchMedia('(pointer: coarse)').matches;
	if (isTouch) document.body.classList.add('touch-on');

	var tbtn = document.getElementById('u-tbtn');
	if (tbtn) {
		tbtn.addEventListener('click', function(e) {
			e.stopPropagation();
			document.body.classList.toggle('touch-on');
		});
	}

	var movePad = document.getElementById('u-move');
	var moveNub = document.getElementById('u-move-nub');
	var aimPad = document.getElementById('u-aim');
	var aimNub = document.getElementById('u-aim-nub');

	var moveId = null, aimId = null;

	function handleMove(touch) {
		var r = movePad.getBoundingClientRect();
		var cx = r.left + r.width / 2, cy = r.top + r.height / 2, maxR = r.width * 0.38;
		var dx = touch.clientX - cx, dy = touch.clientY - cy;
		var dist = Math.hypot(dx, dy);
		if (dist > maxR) { dx = (dx / dist) * maxR; dy = (dy / dist) * maxR; }
		moveNub.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
		var dead = maxR * 0.24;
		keys[key_left] = dx < -dead ? 1 : 0;
		keys[key_right] = dx > dead ? 1 : 0;
		keys[key_up] = dy < -dead ? 1 : 0;
		keys[key_down] = dy > dead ? 1 : 0;
	}

	function resetMove() {
		moveId = null;
		if (moveNub) moveNub.style.transform = 'translate(0px,0px)';
		keys[key_left] = keys[key_right] = keys[key_up] = keys[key_down] = 0;
	}

	function handleAim(touch) {
		var r = aimPad.getBoundingClientRect();
		var cx = r.left + r.width / 2, cy = r.top + r.height / 2, maxR = r.width * 0.38;
		var dx = touch.clientX - cx, dy = touch.clientY - cy;
		var dist = Math.hypot(dx, dy);
		if (dist > maxR) { dx = (dx / dist) * maxR; dy = (dy / dist) * maxR; }
		aimNub.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
		// Map right-stick vector around player screen center (c.width*0.5, c.height*0.8 - 34)
		var px = (typeof entity_player !== 'undefined' && entity_player) ? (entity_player.x + 6 + camera_x + c.width * 0.5) : (c.width * 0.5);
		var py = -34 + c.height * 0.8;
		mouse_x = px + dx * 2.5;
		mouse_y = py + dy * 2.5;
		keys[key_shoot] = dist > maxR * 0.18 ? 1 : 0;
	}

	function resetAim() {
		aimId = null;
		if (aimNub) aimNub.style.transform = 'translate(0px,0px)';
		keys[key_shoot] = 0;
	}

	if (movePad) {
		movePad.addEventListener('touchstart', function(ev) {
			ev.preventDefault(); ev.stopPropagation();
			if (moveId === null && ev.changedTouches[0]) { moveId = ev.changedTouches[0].identifier; handleMove(ev.changedTouches[0]); }
		}, { passive: false });
		movePad.addEventListener('touchmove', function(ev) {
			ev.preventDefault();
			for (var i = 0; i < ev.changedTouches.length; i++) {
				if (ev.changedTouches[i].identifier === moveId) handleMove(ev.changedTouches[i]);
			}
		}, { passive: false });
		movePad.addEventListener('touchend', function(ev) {
			for (var i = 0; i < ev.changedTouches.length; i++) {
				if (ev.changedTouches[i].identifier === moveId) resetMove();
			}
		}, { passive: false });
		movePad.addEventListener('touchcancel', resetMove, { passive: false });
	}

	if (aimPad) {
		aimPad.addEventListener('touchstart', function(ev) {
			ev.preventDefault(); ev.stopPropagation();
			if (aimId === null && ev.changedTouches[0]) { aimId = ev.changedTouches[0].identifier; handleAim(ev.changedTouches[0]); }
		}, { passive: false });
		aimPad.addEventListener('touchmove', function(ev) {
			ev.preventDefault();
			for (var i = 0; i < ev.changedTouches.length; i++) {
				if (ev.changedTouches[i].identifier === aimId) handleAim(ev.changedTouches[i]);
			}
		}, { passive: false });
		aimPad.addEventListener('touchend', function(ev) {
			for (var i = 0; i < ev.changedTouches.length; i++) {
				if (ev.changedTouches[i].identifier === aimId) resetAim();
			}
		}, { passive: false });
		aimPad.addEventListener('touchcancel', resetAim, { passive: false });
	}
})();

audio_init(function(){
	var launched = false;
	var launch = function() {
		if (launched) return;
		launched = true;
		_document.onclick = null;
		_document.ontouchend = null;
		try { if (typeof audio_ctx !== 'undefined' && audio_ctx.state === 'suspended') audio_ctx.resume(); } catch (e) {}
		terminal_cancel();
		terminal_write_line('INITIATING...', function(){
			renderer_init();
			load_image('q2', function() {
				terminal_hide();
				document.body.classList.add('playing');
				renderer_bind_image(this);
				next_level(game_tick);
			});
		});
	};
	_document.onclick = launch;
	_document.ontouchend = launch;

	terminal_run_intro();
});
