document.body.innerHTML +=
	'<style>'+
		'*{box-sizing:border-box;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;-webkit-tap-highlight-color:transparent;}'+
		'html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;color:#fff;background:#07080b;text-align:center;touch-action:none;user-select:none;-webkit-user-select:none;}'+
		'#g{position:relative;width:100vw;height:100vh;display:flex;align-items:center;justify-content:center;background:#050608;font-weight:bold;cursor:crosshair;touch-action:none;}'+
		'#c{display:block;width:100%;height:100%;image-rendering:optimizeSpeed;image-rendering:pixelated;object-fit:contain;touch-action:none;}'+
		'#ts{position:absolute;inset:0;z-index:25;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(circle,rgba(7,8,11,0.32),rgba(7,8,11,0.85));pointer-events:none;padding:16px;}'+
		'#ts h1{font-size:clamp(30px,7vw,76px);margin:0;letter-spacing:0.12em;color:#F3FF00;text-shadow:0 0 24px rgba(243,255,0,0.45);}'+
		'#ts .sub{margin-top:10px;font-size:clamp(12px,1.8vw,16px);color:#00F0D4;letter-spacing:0.1em;}'+
		'#ts .hint{margin-top:14px;font-size:11px;color:#b8c0d0;letter-spacing:0.06em;max-width:560px;line-height:1.6;}'+
		'#ts .cred{margin-top:14px;font-size:10px;color:#727a8c;letter-spacing:0.08em;}'+
		'#msg{position:absolute;top:42px;left:0;right:0;z-index:20;font-size:clamp(12px,1.6vw,18px);color:#F3FF00;text-shadow:0 2px 10px #000;display:none;pointer-events:none;}'+
		'#h,#a{position:absolute;top:8px;z-index:20;font-size:clamp(16px,2.4vw,26px);text-shadow:0 2px 10px #000;pointer-events:none;}'+
		'#h{left:14px;color:#FF2A3C;}'+
		'#a{left:92px;color:#F3FF00;}'+
		'#bar{position:fixed;top:8px;right:10px;z-index:35;display:flex;align-items:center;gap:6px;font-size:10px;color:#b8c0d0;background:rgba(7,8,11,0.78);border:1px solid rgba(255,255,255,0.16);padding:4px 8px;}'+
		'#bar input[type=range]{width:54px;accent-color:#F3FF00;}'+
		'#f,#tbtn{background:#F3FF00;color:#07080b;border:none;padding:4px 7px;font-weight:700;font-size:10px;cursor:pointer;}'+
		'#tbtn{background:#121722;color:#00F0D4;border:1px solid rgba(0,240,212,0.5);}'+
		'#touch-fps{position:fixed;inset:0;z-index:30;pointer-events:none;display:none;}'+
		'body.touch-on.playing #touch-fps{display:block;}'+
		'#look-zone{position:absolute;top:44px;right:0;bottom:0;width:58%;pointer-events:auto;touch-action:none;}'+
		'#joy-zone{position:absolute;left:16px;bottom:18px;width:128px;height:128px;border-radius:50%;border:2px solid rgba(0,240,212,0.45);background:rgba(7,8,11,0.42);pointer-events:auto;touch-action:none;display:flex;align-items:center;justify-content:center;}'+
		'#joy-nub{width:48px;height:48px;border-radius:50%;background:rgba(0,240,212,0.72);border:2px solid #F3FF00;box-shadow:0 0 14px rgba(0,240,212,0.5);pointer-events:none;transform:translate(0px,0px);}'+
		'#fps-btns{position:absolute;right:16px;bottom:18px;display:flex;flex-direction:column;align-items:flex-end;gap:10px;pointer-events:none;}'+
		'#fps-btns-row{display:flex;gap:10px;pointer-events:none;}'+
		'#fps-btns button{pointer-events:auto;touch-action:none;border-radius:999px;font-weight:800;letter-spacing:0.06em;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,0.55);}'+
		'#btn-fire{width:76px;height:76px;background:rgba(255,42,60,0.82);border:2px solid #F3FF00;color:#fff;font-size:12px;}'+
		'#btn-fire.active{background:#FF2A3C;transform:scale(0.95);}'+
		'#btn-jump{width:54px;height:54px;background:rgba(7,8,11,0.72);border:2px solid #F3FF00;color:#F3FF00;font-size:11px;}'+
		'#btn-wpn{height:38px;padding:0 12px;background:rgba(7,8,11,0.72);border:1px solid #00F0D4;color:#00F0D4;font-size:11px;}'+
		'#crosshair{position:fixed;left:50%;top:50%;width:14px;height:14px;margin:-7px 0 0 -7px;pointer-events:none;z-index:22;display:none;}'+
		'body.playing #crosshair{display:block;}'+
		'#crosshair:before,#crosshair:after{content:"";position:absolute;background:rgba(243,255,0,0.85);}'+
		'#crosshair:before{left:6px;top:0;width:2px;height:14px;}'+
		'#crosshair:after{top:6px;left:0;height:2px;width:14px;}'+
	'</style>'+
	'<div id="g">'+
		'<canvas id=c width=320 height=180></canvas>'+
		'<div id="crosshair"></div>'+
		'<div id="ts">'+
			'<h1>QUAKEDROME 3D</h1>'+
			'<div class="sub">▶ TAP OR CLICK ARENA TO DEPLOY</div>'+
			'<div class="hint">DESKTOP: WASD + MOUSE AIM + CLICK FIRE + SPACE JUMP<br/>MOBILE: LEFT STICK MOVE · DRAG RIGHT SCREEN AIM · FIRE / JUMP / GUN BUTTONS</div>'+
			'<div class="cred">SYNTHPLAY 3D FPS · POWERED BY Q1K3 (MIT) BY DOMINIC SZABLEWSKI · MUSIC BY ANDREAS LÖSCH</div>'+
		'</div>'+
		'<div id="h"></div><div id="a"></div>'+
		'<div id="msg"></div>'+
	'</div>'+
	'<div id="touch-fps">'+
		'<div id="look-zone"></div>'+
		'<div id="joy-zone"><div id="joy-nub"></div></div>'+
		'<div id="fps-btns">'+
			'<button id="btn-wpn" type="button">⇄ GUN</button>'+
			'<div id="fps-btns-row">'+
				'<button id="btn-jump" type="button">JUMP</button>'+
				'<button id="btn-fire" type="button">🔥 FIRE</button>'+
			'</div>'+
		'</div>'+
	'</div>'+
	'<div id="bar">'+
		'<span>SENS</span><input id="m" type="range" value=14 min=1 max=50>'+
		'<label style="display:inline-flex;align-items:center;gap:2px;cursor:pointer"><input type="checkbox" id="mi">INV</label>'+
		'<button id="tbtn" type="button">🎮 TOUCH</button>'+
		'<input id="f" type="button" value="FULL">'+
	'</div>';