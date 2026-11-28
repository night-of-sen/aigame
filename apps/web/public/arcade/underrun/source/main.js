

terminal_write_line('INITIATING...');

audio_init(function(){
	_document.onclick = function() {
		_document.onclick = null;
		try { if (typeof audio_ctx !== 'undefined' && audio_ctx.state === 'suspended') audio_ctx.resume(); } catch (e) {}
		terminal_cancel();
		terminal_write_line('INITIATING...', function(){
			renderer_init();
				
			load_image('q2', function() {
				terminal_hide();
				renderer_bind_image(this);
				next_level(game_tick);
			});
			
		});
	};

	terminal_run_intro();
});


