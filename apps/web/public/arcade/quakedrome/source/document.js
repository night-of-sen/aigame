document.body.innerHTML +=
	'<style>'+
		'*{box-sizing:border-box;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;}'+
		'html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;color:#fff;background:#07080b;text-align:center;}'+
		'#g{position:relative;width:100vw;height:100vh;display:flex;align-items:center;justify-content:center;background:#050608;font-weight:bold;cursor:crosshair;}'+
		'#c{display:block;width:100%;height:100%;image-rendering:optimizeSpeed;image-rendering:pixelated;object-fit:contain;}'+
		'#ts{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(circle,rgba(7,8,11,0.28),rgba(7,8,11,0.82));pointer-events:none;padding:16px;}'+
		'#ts h1{font-size:clamp(34px,7vw,76px);margin:0;letter-spacing:0.12em;color:#F3FF00;text-shadow:0 0 24px rgba(243,255,0,0.45);}'+
		'#ts .sub{margin-top:10px;font-size:clamp(12px,1.5vw,16px);color:#00F0D4;letter-spacing:0.1em;}'+
		'#ts .hint{margin-top:14px;font-size:11px;color:#b8c0d0;letter-spacing:0.06em;max-width:560px;line-height:1.6;}'+
		'#ts .cred{margin-top:16px;font-size:10px;color:#727a8c;letter-spacing:0.08em;}'+
		'#msg{position:absolute;top:14px;left:0;right:0;font-size:clamp(12px,1.6vw,18px);color:#F3FF00;text-shadow:0 2px 10px #000;display:none;pointer-events:none;}'+
		'#h,#a{position:absolute;bottom:14px;font-size:clamp(20px,3vw,34px);text-shadow:0 2px 10px #000;pointer-events:none;}'+
		'#h{left:24px;color:#FF2A3C;}'+
		'#a{right:24px;color:#F3FF00;}'+
		'#bar{position:fixed;top:8px;right:10px;z-index:30;display:flex;align-items:center;gap:8px;font-size:10px;color:#b8c0d0;background:rgba(7,8,11,0.76);border:1px solid rgba(255,255,255,0.14);padding:4px 8px;}'+
		'#bar input[type=range]{width:64px;accent-color:#F3FF00;}'+
		'#f{background:#F3FF00;color:#07080b;border:none;padding:3px 7px;font-weight:700;font-size:10px;cursor:pointer;}'+
	'</style>'+
	'<div id="g">'+
		'<canvas id=c width=320 height=180></canvas>'+
		'<div id="ts">'+
			'<h1>QUAKEDROME 3D</h1>'+
			'<div class="sub">▶ CLICK ARENA TO LOCK MOUSE &amp; DEPLOY</div>'+
			'<div class="hint">WASD: MOVE · MOUSE: AIM · LMB: FIRE · 1/2/3: SHOTGUN / NAILGUN / GRENADES · SPACE: JUMP · ESC: RELEASE MOUSE</div>'+
			'<div class="cred">SYNTHPLAY 3D FPS · POWERED BY Q1K3 (MIT) BY DOMINIC SZABLEWSKI · MUSIC BY ANDREAS LÖSCH</div>'+
		'</div>'+
		'<div id="h"></div><div id="a"></div>'+
		'<div id="msg"></div>'+
	'</div>'+
	'<div id="bar">'+
		'<span>SENS</span><input id="m" type="range" value=10 min=1 max=50>'+
		'<label style="display:inline-flex;align-items:center;gap:3px;cursor:pointer"><input type="checkbox" id="mi">INV</label>'+
		'<input id="f" type="button" value="FULLSCREEN">'+
	'</div>';