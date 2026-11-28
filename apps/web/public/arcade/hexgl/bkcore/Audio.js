var bkcore = bkcore || {};

bkcore.Audio = {};
bkcore.Audio.sounds = {};

bkcore.Audio.init = function(){
	if(window.AudioContext||window.webkitAudioContext){
		bkcore.Audio._ctx = new (window.AudioContext||window.webkitAudioContext)();
		bkcore.Audio._panner = bkcore.Audio._ctx.createPanner();
		bkcore.Audio._panner.connect(bkcore.Audio._ctx.destination);
		var resumeAudio = function() {
			if (bkcore.Audio._ctx && bkcore.Audio._ctx.state === 'suspended') {
				bkcore.Audio._ctx.resume().catch(function(){});
			}
		};
		window.addEventListener('pointerdown', resumeAudio, { passive: true });
		window.addEventListener('keydown', resumeAudio, { passive: true });
	}
	else {
		bkcore.Audio._ctx = null;
	}

	bkcore.Audio.posMultipler = 1.5;
};

bkcore.Audio.init();

bkcore.Audio.addSound = function(src, id, loop, callback, usePanner){
	var ctx = bkcore.Audio._ctx;
	var done = false;
	var safeCallback = function() {
		if (!done) {
			done = true;
			if (typeof callback === 'function') callback();
		}
	};

	if(ctx){
		var audio = { src: null, gainNode: null, bufferNode: null, loop: loop };
		var xhr = new XMLHttpRequest();
		xhr.responseType = 'arraybuffer';

		xhr.onload = function(){
			if (!xhr.response || xhr.status >= 400) {
				safeCallback();
				return;
			}
			try {
				ctx.decodeAudioData(xhr.response, function(b){
					var gainNode = ctx.createGain();
					if(usePanner === true){
						gainNode.connect(bkcore.Audio._panner);
					}
					else {
						gainNode.connect(ctx.destination);
					}
					audio.src = b;
					audio.gainNode = gainNode;
					safeCallback();
				}, function(){
					// Gracefully continue if browser cannot decode OGG (e.g. Safari/iOS)
					safeCallback();
				});
			} catch (e) {
				safeCallback();
			}
		};

		xhr.onerror = safeCallback;
		xhr.open('GET', src, true);
		xhr.send(null);
		bkcore.Audio.sounds[id] = audio;
	}
	else {
		bkcore.Audio.sounds[id] = { src: null, gainNode: null, bufferNode: null, loop: loop };
		safeCallback();
	}
};

bkcore.Audio.play = function(id){
	var ctx = bkcore.Audio._ctx;
	var s = bkcore.Audio.sounds[id];
	if(!ctx || !s || !s.src || !s.gainNode) return;
	if(ctx.state === 'suspended') {
		ctx.resume().catch(function(){});
	}
	var sound = ctx.createBufferSource();
	sound.connect(s.gainNode);
	sound.buffer = s.src;
	sound.loop = s.loop;
	s.gainNode.gain.value = 1;
	s.bufferNode = sound;
	sound.start ? sound.start(0) : sound.noteOn(0);
};

bkcore.Audio.stop = function(id){
	var ctx = bkcore.Audio._ctx;
	var s = bkcore.Audio.sounds[id];
	if(!ctx || !s || !s.bufferNode) return;
	try {
		s.bufferNode.stop ? s.bufferNode.stop(ctx.currentTime) : s.bufferNode.noteOff(ctx.currentTime);
	} catch (e) {}
};

bkcore.Audio.volume = function(id, volume){
	var ctx = bkcore.Audio._ctx;
	var s = bkcore.Audio.sounds[id];
	if(!ctx || !s || !s.gainNode) return;
	s.gainNode.gain.value = volume;
};

bkcore.Audio.setListenerPos = function(vec){
	if(bkcore.Audio._ctx && bkcore.Audio._panner){
		var panner = bkcore.Audio._panner;
		var vec2 = vec.normalize();
		if (panner.setPosition) {
			panner.setPosition(
				vec2.x * bkcore.Audio.posMultipler,
				vec2.y * bkcore.Audio.posMultipler,
				vec2.z * bkcore.Audio.posMultipler
			);
		}
	}
};

bkcore.Audio.setListenerVelocity = function(){};