
/* handwrite_pro.js — Ultimate: layers + fills + search/export + pdf + improved shot */
(function(){
  const STORE='hwpro_v1', PRESETS='hwpro_presets_v1';
  function dpr(){ return window.devicePixelRatio||1; }
  function load(name){ try{ return JSON.parse(localStorage.getItem(name)||'{}'); }catch(e){ return {}; } }
  function save(name, obj){ try{ localStorage.setItem(name, JSON.stringify(obj)); }catch(e){} }
  function ctxKey(){
    const subj = window.__currentSubject||'misc';
    const file = window.__currentPracticeFile||'';
    const id   = window.__currentQuestionId||'';
    const idx  = (window.__currentQuestionIndex!=null)? String(window.__currentQuestionIndex):'';
    const base = [subj,file,id,idx].filter(Boolean).join('|');
    return base || (location.pathname + (location.search||''));
  }

  // UI
  function ensureUI(){
    if (document.getElementById('openHWPro')) return;
    const link = document.createElement('link'); link.rel='stylesheet'; link.href='assets/handwrite_pro.css'; document.head.appendChild(link);
    const btn = document.createElement('button'); btn.id='openHWPro'; btn.textContent='手写 Pro'; document.body.appendChild(btn);
    const ov = document.createElement('div'); ov.id='hwPro';
    ov.innerHTML = `
      <div class="inner">
        <div class="hw-head">
          <div>✍️ 手写做题 Pro Ultimate <span class="shortcut">Space=手掌 / Z/Y 撤销重做</span></div>
          <div class="hw-tools">
            <div class="grp">
              <button class="hw-btn" id="t-pen">钢笔</button>
              <button class="hw-btn" id="t-high">荧光</button>
              <button class="hw-btn" id="t-eraser">橡皮(像素)</button>
              <button class="hw-btn" id="t-eraseS">橡皮(整笔)</button>
              <span class="split"></span>
              <button class="hw-btn" id="t-line">直线</button>
              <button class="hw-btn" id="t-rect">矩形</button>
              <button class="hw-btn" id="t-oval">椭圆</button>
              <label class="hw-btn"><input id="fillOn" type="checkbox"> 填充</label>
              <label>填充透明 <input id="fillAlpha" type="range" min="0.1" max="0.9" step="0.05" value="0.25"></label>
              <button class="hw-btn" id="t-lasso">框选</button>
              <button class="hw-btn" id="t-hand">手掌</button>
              <label>缩放 <input id="zoom" type="range" min="0.5" max="3" step="0.1" value="1"></label>
            </div>
            <div class="grp">
              <span>颜色</span>
              <span class="color" data-c="#111" style="background:#111"></span>
              <span class="color" data-c="#1f6feb" style="background:#1f6feb"></span>
              <span class="color" data-c="#d73a49" style="background:#d73a49"></span>
              <span class="color" data-c="#2ea043" style="background:#2ea043"></span>
              <span class="color" data-c="#8a63d2" style="background:#8a63d2"></span>
              <label>粗细 <input id="size" type="range" min="1" max="24" step="1" value="4"></label>
              <label>压力 <select id="press"><option value="soft">soft</option><option value="normal" selected>normal</option><option value="hard">hard</option></select></label>
              <label>平滑 <input id="smooth" type="range" min="0" max="0.9" step="0.05" value="0.35"></label>
              <label>仅手写笔 <input id="stylus" type="checkbox" checked></label>
            </div>
            <div class="grp">
              <label>网格 <select id="grid"><option value="none">无</option><option value="ruled">横线</option><option value="squared">方格</option><option value="dot">点阵</option></select></label>
              <span class="split"></span>
              <div id="presets">
                <div class="preset" id="pre1" data-empty="1" title="长按保存/点击应用"></div>
                <div class="preset" id="pre2" data-empty="1" title="长按保存/点击应用"></div>
                <div class="preset" id="pre3" data-empty="1" title="长按保存/点击应用"></div>
              </div>
            </div>
            <div class="grp">
              <button class="hw-btn" id="undo">撤销</button>
              <button class="hw-btn" id="redo">重做</button>
              <button class="hw-btn" id="clear">清空</button>
              <button class="hw-btn" id="shot">题干截图为背景</button>
              <button class="hw-btn" id="snapshot">保存快照</button>
              <button class="hw-btn" id="export">导出PNG</button>
              <button class="hw-btn" id="search">搜索/导出</button>
              <button class="hw-btn" id="pdf">生成PDF视图</button>
              <button class="hw-btn" id="close">关闭</button>
            </div>
          </div>
        </div>
        <div class="hw-work">
          <div class="hw-canvas-wrap">
            <div class="hw-grid" id="gridOverlay"></div>
            <canvas id="hwCanvas"></canvas>
          </div>
          <div class="hw-side">
            <div class="sec">
              <h4>图层</h4>
              <div id="layers"></div>
              <div style="display:flex; gap:6px; margin-top:6px;">
                <button class="hw-btn" id="layerAdd">新增图层</button>
                <button class="hw-btn" id="layerUp">上移</button>
                <button class="hw-btn" id="layerDown">下移</button>
                <button class="hw-btn" id="layerDel">删除</button>
              </div>
            </div>
            <div class="sec">
              <h4>快照（点击设为背景参考）</h4>
              <div id="shots"></div>
            </div>
          </div>
        </div>
        <div class="hw-status">
          <span id="statL">就绪</span>
          <span id="statR">DPR <b id="dpr"></b></span>
        </div>
      </div>`;
    document.body.appendChild(ov);
    btn.onclick = ()=> open();
    document.getElementById('close').onclick = ()=> close();
    boot();
  }

  // State with layers
  let S={ tool:'pen', color:'#111', size:4, press:'normal', smooth:0.35, stylus:true, grid:'none', zoom:1, panX:0, panY:0, eraserMode:'pixel', layers:[{name:'图层1',visible:true,locked:false,strokes:[]}], active:0, w:1200, h:800 };
  let canvas, ctx, wrap, gridEl, drawing=false, curr=null, last=null, saveTimer=null;
  let handDragging=false, handStart=null, handPan0=null;
  let spaceHold=false;

  function activeLayer(){ return S.layers[S.active] || S.layers[0]; }
  function flattenStrokes(){ return S.layers.filter(l=>l.visible).flatMap(l=> l.strokes.map(st=> ({...st, __layer:l})) ); }

  function open(){
    loadFromStore();
    document.getElementById('hwPro').style.display='block';
    fit(); render(); updateUI(); renderShots(); renderLayers();
  }
  function close(){ document.getElementById('hwPro').style.display='none'; autosave(); }

  function boot(){
    canvas = document.getElementById('hwCanvas'); wrap = canvas.parentElement; gridEl = document.getElementById('gridOverlay');
    ctx = canvas.getContext('2d');
    document.getElementById('dpr').textContent = (window.devicePixelRatio||1).toFixed(2);
    bindToolbar(); bindPointer(); bindShortcuts();
    window.addEventListener('resize', fit);
    fit();
  }

  function fit(){
    const w = Math.max(700, wrap.clientWidth);
    const h = Math.max(420, wrap.clientHeight);
    const r = dpr();
    S.w=w; S.h=h;
    canvas.width = Math.floor(w*r);
    canvas.height= Math.floor(h*r);
    canvas.style.width = w+'px'; canvas.style.height = h+'px';
    render();
  }

  function bindToolbar(){
    const q=(s)=>document.getElementById(s);
    const tools = { 't-pen':'pen','t-high':'high','t-eraser':'eraser','t-eraseS':'eraserS','t-line':'line','t-rect':'rect','t-oval':'oval','t-lasso':'lasso','t-hand':'hand' };
    Object.keys(tools).forEach(id=> q(id).onclick = ()=> setTool(tools[id]));
    q('undo').onclick=undo; q('redo').onclick=redo; q('clear').onclick=clearAll;
    q('export').onclick=exportPNG; q('snapshot').onclick=snapshot; q('search').onclick=openSearch; q('pdf').onclick=openPDFView;
    q('shot').onclick=shotBg;
    q('size').oninput=(e)=> S.size=parseInt(e.target.value||'4',10);
    q('press').onchange=(e)=> S.press=e.target.value;
    q('smooth').oninput=(e)=> S.smooth=parseFloat(e.target.value||'0.35');
    q('stylus').onchange=(e)=> S.stylus=e.target.checked;
    q('grid').onchange=(e)=> setGrid(e.target.value);
    q('zoom').oninput=(e)=> { S.zoom=parseFloat(e.target.value||'1'); render(); };
    q('fillOn').onchange=(e)=> S.fillOn = e.target.checked;
    q('fillAlpha').oninput=(e)=> S.fillAlpha = parseFloat(e.target.value||'0.25');

    document.querySelectorAll('.color').forEach(n=> n.onclick=()=> setColor(n.dataset.c));

    // presets
    ['pre1','pre2','pre3'].forEach((id,idx)=>{
      const el=q(id); let hold=null, down=0;
      const P=loadPresets(); const p=P[idx];
      if (p){ el.dataset.empty='0'; el.style.background=p.color; el.title='粗细'+p.size; }
      el.addEventListener('pointerdown', ()=>{ down=Date.now(); hold=setTimeout(()=>{ const P=loadPresets(); P[idx]={size:S.size, color:S.color, press:S.press}; savePresets(P); el.dataset.empty='0'; el.style.background=S.color; el.title='粗细'+S.size; }, 550); });
      el.addEventListener('pointerup', ()=>{ clearTimeout(hold); if (Date.now()-down<550){ const P=loadPresets(); const p=P[idx]; if (p){ S.size=p.size; S.color=p.color; S.press=p.press||S.press; updateUI(); } } });
      el.addEventListener('pointerleave', ()=> clearTimeout(hold));
    });

    // Layers controls
    q('layerAdd').onclick = ()=>{ S.layers.push({name:'图层'+(S.layers.length+1), visible:true, locked:false, strokes:[]}); S.active=S.layers.length-1; renderLayers(); autosave(); };
    q('layerDel').onclick = ()=>{ if (S.layers.length<=1) return alert('至少保留一个图层'); S.layers.splice(S.active,1); S.active=Math.max(0,S.active-1); renderLayers(); render(); autosave(); };
    q('layerUp').onclick  = ()=>{ if (S.active<=0) return; const t=S.layers[S.active-1]; S.layers[S.active-1]=S.layers[S.active]; S.layers[S.active]=t; S.active--; renderLayers(); render(); autosave(); };
    q('layerDown').onclick= ()=>{ if (S.active>=S.layers.length-1) return; const t=S.layers[S.active+1]; S.layers[S.active+1]=S.layers[S.active]; S.layers[S.active]=t; S.active++; renderLayers(); render(); autosave(); };
  }
  function setTool(t){ if (t==='eraserS'){ S.eraserMode='stroke'; t='eraser'; } S.tool=t; updateUI(); }
  function setColor(c){ S.color=c; }
  function setGrid(g){ S.grid=g; gridEl.className = 'hw-grid ' + (g==='none'?'':g); }
  function updateUI(){
    const ids=['t-pen','t-high','t-eraser','t-eraseS','t-line','t-rect','t-oval','t-lasso','t-hand'];
    ids.forEach(id=> document.getElementById(id).classList.remove('on'));
    const id = S.tool==='eraser' && S.eraserMode==='stroke' ? 't-eraseS' : 't-'+S.tool;
    if (document.getElementById(id)) document.getElementById(id).classList.add('on');
    document.getElementById('grid').value=S.grid;
    document.getElementById('fillOn').checked = !!S.fillOn;
    document.getElementById('fillAlpha').value = String(S.fillAlpha||0.25);
  }

  function bindShortcuts(){
    document.addEventListener('keydown', (e)=>{
      if (!document.getElementById('hwPro') || document.getElementById('hwPro').style.display==='none') return;
      if (e.code==='Space' && !spaceHold){ spaceHold=true; S._prevTool=S.tool; setTool('hand'); }
      if (e.key.toLowerCase()==='z'){ if (e.shiftKey) redo(); else undo(); }
      if (e.key.toLowerCase()==='y'){ redo(); }
      if (e.key==='1') setTool('pen');
      if (e.key==='2') setTool('high');
      if (e.key==='3') { S.eraserMode='pixel'; setTool('eraser'); }
      if (e.key==='4') setTool('line');
      if (e.key==='5') setTool('rect');
      if (e.key==='6') setTool('oval');
      if (e.key.toLowerCase()==='l') setTool('lasso');
      if (e.key.toLowerCase()==='h') setTool('hand');
      if (e.key==='=' || e.key==='+'){ S.zoom=Math.min(3, S.zoom+0.1); document.getElementById('zoom').value=S.zoom; render(); }
      if (e.key==='-' || e.key==='_'){ S.zoom=Math.max(0.5, S.zoom-0.1); document.getElementById('zoom').value=S.zoom; render(); }
    });
    document.addEventListener('keyup', (e)=>{ if (e.code==='Space' && spaceHold){ spaceHold=false; setTool(S._prevTool||'pen'); } });
  }

  // pointer / drawing
  function bindPointer(){
    // wheel zoom
    wrap.addEventListener('wheel',(e)=>{
      if (!e.ctrlKey) return;
      e.preventDefault();
      const old=S.zoom;
      S.zoom = Math.min(3, Math.max(0.5, S.zoom*(e.deltaY<0?1.05:0.95)));
      document.getElementById('zoom').value = S.zoom.toFixed(2);
      const r = canvas.getBoundingClientRect(); const cx=(e.clientX - r.left), cy=(e.clientY - r.top);
      S.panX = (S.panX - cx)*(S.zoom/old) + cx;
      S.panY = (S.panY - cy)*(S.zoom/old) + cy;
      render();
    }, {passive:false});

    canvas.addEventListener('pointerdown', (e)=>{
      if (S.stylus && e.pointerType!=='pen') return;
      if (S.tool==='hand'){ handDragging=true; handStart={x:e.clientX,y:e.clientY}; handPan0={x:S.panX,y:S.panY}; return; }
      if (activeLayer().locked) { alert('当前图层已锁定'); return; }
      drawing=true; curr=createStroke(S.tool);
      const p = viewToCanvas(e); curr.pts=[p]; last=p;
      activeLayer().strokes.push(curr); S.redo.length=0; render();
    });
    canvas.addEventListener('pointermove', (e)=>{
      if (handDragging){ S.panX = handPan0.x + (e.clientX - handStart.x); S.panY = handPan0.y + (e.clientY - handStart.y); render(); return; }
      if (!drawing) return;
      const p = viewToCanvas(e);
      if (curr.tool==='line' || curr.tool==='rect' || curr.tool==='oval'){ curr.pts[1]=p; render(); return; }
      const sm = smooth(last, p, S.smooth); curr.pts.push(sm); drawSeg(curr, curr.pts.at(-2), sm);
    });
    window.addEventListener('pointerup', ()=>{ if (handDragging){ handDragging=false; return; } if (drawing){ drawing=false; autosave(); } });
  }

  function createStroke(tool){ return {tool: tool, color:S.color, size:S.size, press:S.press, smooth:S.smooth, fill:!!S.fillOn, fillAlpha:S.fillAlpha||0.25, pts:[]}; }

  // transforms
  function viewToCanvas(e){
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left - S.panX) / S.zoom * dpr();
    const y = (e.clientY - r.top  - S.panY) / S.zoom * dpr();
    const pr= e.pressure && e.pressure>0 ? e.pressure : 0.5;
    return {x,y,p:pr,t:Date.now()};
  }
  function prMul(pr, curve){ if (curve==='soft') return 0.6 + pr*0.6; if (curve==='hard') return 0.4 + pr*1.15; return 0.5 + pr*0.85; }
  function smooth(a,b,k){ if (!a) return b; k = Math.max(0, Math.min(0.9,k||0.35)); return {x: a.x + (b.x-a.x)*k, y: a.y + (b.y-a.y)*k, p:b.p, t:b.t}; }

  // draw
  function drawSeg(st, a, b){
    if (!a || !b) return;
    const r = dpr();
    ctx.save();
    ctx.setTransform(1,0,0,1,0,0);
    ctx.translate(S.panX, S.panY);
    ctx.scale(S.zoom/r, S.zoom/r);
    ctx.lineCap='round'; ctx.lineJoin='round';
    if (st.tool==='eraser'){
      if (S.eraserMode==='stroke'){
        // remove whole stroke near b
        const idx = findHitStroke(b, 12);
        if (idx>=0){ const L = activeLayer(); L.strokes.splice(idx,1); render(); }
      }else{
        ctx.globalCompositeOperation='destination-out';
        ctx.strokeStyle='rgba(0,0,0,1)';
        ctx.lineWidth = Math.max(6, st.size*2);
        ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
      }
    }else{
      ctx.globalCompositeOperation='source-over';
      if (st.tool==='high'){ ctx.strokeStyle='rgba(255,235,59,0.35)'; }
      else ctx.strokeStyle= st.color;
      const w = (st.size||4) * prMul(b.p, st.press||'normal');
      ctx.lineWidth = Math.max(1, w);
      ctx.beginPath();
      const mx=(a.x+b.x)/2, my=(a.y+b.y)/2;
      ctx.moveTo(a.x,a.y); ctx.quadraticCurveTo(a.x,a.y,mx,my); ctx.stroke();
    }
    ctx.restore();
  }
  function drawShape(st){
    const r = dpr();
    const p0 = st.pts[0], p1 = st.pts[1] || p0;
    ctx.save();
    ctx.setTransform(1,0,0,1,0,0);
    ctx.translate(S.panX, S.panY);
    ctx.scale(S.zoom/r, S.zoom/r);
    const x=Math.min(p0.x,p1.x), y=Math.min(p0.y,p1.y), w=Math.abs(p1.x-p0.x), h=Math.abs(p1.y-p0.y);
    const fill = st.fill, alpha = st.fillAlpha||0.25;
    if (st.tool==='line'){
      ctx.strokeStyle = st.color; ctx.lineWidth=st.size;
      ctx.beginPath(); ctx.moveTo(p0.x,p0.y); ctx.lineTo(p1.x,p1.y); ctx.stroke();
    }else if (st.tool==='rect'){
      if (fill){ ctx.fillStyle = hex2rgba(st.color, alpha); ctx.fillRect(x,y,w,h); }
      ctx.strokeStyle = st.color; ctx.lineWidth=st.size; ctx.strokeRect(x,y,w,h);
    }else if (st.tool==='oval'){
      ctx.beginPath();
      const cx=x+w/2, cy=y+h/2; ctx.ellipse(cx,cy,w/2,h/2,0,0,Math.PI*2);
      if (fill){ ctx.fillStyle = hex2rgba(st.color, alpha); ctx.fill(); }
      ctx.strokeStyle = st.color; ctx.lineWidth=st.size; ctx.stroke();
    }
    ctx.restore();
  }
  function hex2rgba(hex, a){
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex||'#000000');
    if (!m) return `rgba(0,0,0,${a||0.2})`;
    return `rgba(${parseInt(m[1],16)},${parseInt(m[2],16)},${parseInt(m[3],16)},${a||0.2})`;
  }

  function render(){
    const r = dpr();
    ctx.save(); ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,canvas.width,canvas.height); ctx.restore();
    document.getElementById('gridOverlay').className = 'hw-grid ' + (S.grid==='none'?'':S.grid);
    const list = flattenStrokes();
    for (const st of list){
      if (st.tool==='line' || st.tool==='rect' || st.tool==='oval') drawShape(st);
      else { for (let i=1;i<(st.pts||[]).length;i++) drawSeg(st, st.pts[i-1], st.pts[i]); }
    }
  }
  function findHitStroke(pt, tol){
    const L = activeLayer();
    for (let si=L.strokes.length-1; si>=0; si--){
      const st=L.strokes[si], ps=st.pts||[];
      for (let i=1;i<ps.length;i++){ if (distToSeg(pt, ps[i-1], ps[i]) < tol) return si; }
    }
    return -1;
  }
  function distToSeg(p,a,b){
    const vx=b.x-a.x, vy=b.y-a.y; const wx=p.x-a.x, wy=p.y-a.y;
    const c1=vx*wx+vy*wy; if (c1<=0) return Math.hypot(p.x-a.x,p.y-a.y);
    const c2=vx*vx+vy*vy; if (c2<=c1) return Math.hypot(p.x-b.x,p.y-b.y);
    const t=c1/c2; const px=a.x+t*vx, py=a.y+t*vy; return Math.hypot(p.x-px,p.y-py);
  }

  // undo/redo/clear
  function undo(){ const L=activeLayer(); if (!L.strokes.length) return; S.redo = S.redo||[]; S.redo.push(L.strokes.pop()); render(); autosave(); }
  function redo(){ const L=activeLayer(); if (!S.redo || !S.redo.length) return; L.strokes.push(S.redo.pop()); render(); autosave(); }
  function clearAll(){ if (!confirm('清空当前图层？')) return; activeLayer().strokes.length=0; render(); autosave(); }

  // Save/load/snapshots/export
  function scheduleSave(){ clearTimeout(saveTimer); saveTimer=setTimeout(autosave, 800); }
  function autosave(){
    const all=load(STORE); const k=ctxKey();
    const stObj = {layers:S.layers, meta:{color:S.color,size:S.size,press:S.press,smooth:S.smooth,grid:S.grid,zoom:S.zoom,panX:S.panX,panY:S.panY,ts:Date.now()}, snaps:(all[k]&&all[k].snaps)||[]};
    all[k]=stObj; save(STORE, all);
    document.getElementById('statL').textContent='已自动保存';
  }
  function loadFromStore(){
    const all=load(STORE); const k=ctxKey(); const rec=all[k];
    if (!rec){ // backward compatible (if old strokes)
      S.layers=[{name:'图层1',visible:true,locked:false,strokes:[]}]; return;
    }
    if (rec.layers){ S.layers = rec.layers; }
    else if (rec.strokes){ S.layers=[{name:'图层1',visible:true,locked:false,strokes:rec.strokes}]; }
    const m=rec.meta||{};
    S.color=m.color||S.color; S.size=m.size||S.size; S.press=m.press||S.press; S.smooth=m.smooth||S.smooth;
    S.grid=m.grid||S.grid; S.zoom=m.zoom||1; S.panX=m.panX||0; S.panY=m.panY||0;
  }
  function snapshot(){
    canvas.toBlob((blob)=>{
      const reader = new FileReader();
      reader.onload = ()=>{
        const all=load(STORE); const k=ctxKey();
        all[k]=all[k]||{layers:S.layers, meta:{}, snaps:[]};
        all[k].snaps = all[k].snaps || []; all[k].snaps.unshift({ts:Date.now(), png: reader.result});
        all[k].snaps = all[k].snaps.slice(0,12);
        save(STORE, all); renderShots();
      };
      reader.readAsDataURL(blob);
    });
  }
  function renderShots(){
    const box=document.getElementById('shots'); if (!box) return;
    const all=load(STORE); const k=ctxKey(); const rec=all[k]||{snaps:[]};
    box.innerHTML = (rec.snaps||[]).map(s=> `<div class="hw-thumb"><img src="${s.png}"><div><div>${new Date(s.ts).toLocaleString()}</div><button class="hw-btn" data-ts="${s.ts}">设为背景参考</button></div></div>`).join('');
    box.querySelectorAll('button[data-ts]').forEach(b=> b.onclick=()=>{
      const ts=parseInt(b.dataset.ts,10);
      const shot=(rec.snaps||[]).find(x=>x.ts===ts);
      if (!shot) return;
      const img=new Image(); img.onload=()=>{ 
        ctx.save(); ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,canvas.width,canvas.height); ctx.restore();
        ctx.drawImage(img, 0,0, canvas.width, canvas.height); 
        render();
      };
      img.src = shot.png;
    });
  }
  function exportPNG(){
    canvas.toBlob((blob)=>{ const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='handwrite_pro.png'; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000); });
  }

  // Layers UI
  function renderLayers(){
    const box=document.getElementById('layers'); if (!box) return;
    box.innerHTML='';
    S.layers.forEach((L,i)=>{
      const row = document.createElement('div'); row.className='layer-item';
      const eye = document.createElement('button'); eye.className='eye hw-btn'+(L.visible?' on':''); eye.textContent='👁'; eye.onclick=()=>{ L.visible=!L.visible; renderLayers(); render(); autosave(); };
      const lock= document.createElement('button'); lock.className='lock hw-btn'+(L.locked?' on':''); lock.textContent='🔒'; lock.onclick=()=>{ L.locked=!L.locked; renderLayers(); autosave(); };
      const name= document.createElement('div'); name.className='name'; name.textContent=L.name || ('图层'+(i+1));
      const pick= document.createElement('button'); pick.className='hw-btn'; pick.textContent=(S.active===i?'✓ 当前':'设为当前'); pick.onclick=()=>{ S.active=i; renderLayers(); };
      row.appendChild(eye); row.appendChild(lock); row.appendChild(name); row.appendChild(pick);
      box.appendChild(row);
    });
  }

  // Search / Export panel
  function openSearch(){
    let p = document.getElementById('searchPanel');
    if (!p){
      p = document.createElement('div'); p.id='searchPanel';
      p.innerHTML = `
        <div class="inner">
          <div style="display:flex; gap:8px; align-items:flex-end; flex-wrap:wrap;">
            <label>关键词 <input id="sKw" placeholder="subject/file/id/index 任意包含"></label>
            <label>开始日期 <input id="sFrom" type="date"></label>
            <label>结束日期 <input id="sTo" type="date"></label>
            <button class="hw-btn" id="sRun">搜索</button>
            <button class="hw-btn" id="sExport">导出结果(JSON)</button>
            <button class="hw-btn" id="sClose">关闭</button>
          </div>
          <div id="sList" style="margin-top:10px;"></div>
        </div>`;
      document.body.appendChild(p);
      p.querySelector('#sClose').onclick = ()=> p.style.display='none';
      p.querySelector('#sRun').onclick = runSearch;
      p.querySelector('#sExport').onclick = exportSearch;
    }
    p.style.display='block';
    runSearch();
  }
  function iterStore(){
    const all = load(STORE);
    return Object.keys(all).map(k=>({key:k, rec:all[k]}));
  }
  function runSearch(){
    const kw = (document.getElementById('sKw').value||'').trim().toLowerCase();
    const from = document.getElementById('sFrom').value ? new Date(document.getElementById('sFrom').value).getTime() : 0;
    const to   = document.getElementById('sTo').value ? new Date(document.getElementById('sTo').value).getTime() + 86399000 : Infinity;
    const list = iterStore().filter(it=>{
      const m = it.rec.meta||{}; const ts=m.ts||0;
      if (ts<from || ts>to) return false;
      if (!kw) return true;
      return (it.key.toLowerCase().includes(kw));
    }).sort((a,b)=> (b.rec.meta?.ts||0) - (a.rec.meta?.ts||0));
    const box = document.getElementById('sList');
    box.innerHTML = list.map(it=>{
      const m = it.rec.meta||{}; const time = m.ts? new Date(m.ts).toLocaleString() : '';
      const snap = (it.rec.snaps && it.rec.snaps[0] && it.rec.snaps[0].png) ? `<img src="${it.rec.snaps[0].png}" style="max-width:140px;border:1px solid #eee;border-radius:6px;">` : '';
      return `<div class="hw-thumb"><div style="flex:1;"><div><b>${it.key}</b></div><div style="font-size:12px;color:#666">${time}</div></div>${snap}</div>`;
    }).join('') || '<div style="color:#666">无匹配</div>';
    box.dataset.result = JSON.stringify(list.map(x=>x.key));
  }
  function exportSearch(){
    const keys = JSON.parse(document.getElementById('sList').dataset.result||'[]');
    const all = load(STORE);
    const pick = {}; keys.forEach(k=> pick[k]=all[k]);
    const blob = new Blob([JSON.stringify(pick, null, 2)], {type:'application/json'});
    const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='handwrite_search_export.json'; a.click();
    setTimeout(()=> URL.revokeObjectURL(a.href), 800);
  }

  // PDF print view (from search results or current)
  function openPDFView(){
    const keys = JSON.parse((document.getElementById('sList') && document.getElementById('sList').dataset.result) || '[]');
    const all = load(STORE);
    const items = (keys.length? keys : [ctxKey()]).map(k=> ({key:k, rec:all[k]}));
    const v = document.getElementById('pdfView') || (function(){ const d=document.createElement('div'); d.id='pdfView'; document.body.appendChild(d); return d; })();
    const toolbar = document.getElementById('pdfToolbar') || (function(){ const d=document.createElement('div'); d.id='pdfToolbar'; d.innerHTML='<button id="pdfPrint">打印/导出PDF</button><button id="pdfClose">关闭</button>'; document.body.appendChild(d); return d; })();
    toolbar.querySelector('#pdfPrint').onclick = ()=> window.print();
    toolbar.querySelector('#pdfClose').onclick = ()=> { v.remove(); toolbar.remove(); };
    v.innerHTML = `<style>@media print { body * { visibility: hidden; } #pdfView, #pdfView * { visibility: visible; } #pdfView { position:absolute; left:0; top:0; width:100%; } }</style>`;
    v.innerHTML += items.map(it=>{
      const snap = (it.rec.snaps && it.rec.snaps[0]) ? `<img src="${it.rec.snaps[0].png}">` : '';
      return `<div class="page"><div style="font-weight:700;margin-bottom:8px;">${it.key}</div>${snap}</div>`;
    }).join('');
    v.scrollIntoView({behavior:'smooth'});
  }

  // Improved shot: crop padding
  async function shotBg(){
    const q = pickMostVisible();
    if (!q){ alert('未识别到题目区域'); return; }
    document.getElementById('statL').textContent='正在截取题干...';
    try{
      const data = await elementToPNG(q, 1, 8); // 8px padding crop
      const img = new Image();
      img.onload = ()=>{
        ctx.save(); ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,canvas.width,canvas.height); ctx.restore();
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        document.getElementById('statL').textContent='题干已作为背景绘制，可继续书写。';
      };
      img.src = data;
    }catch(e){ alert('截图失败：' + e); }
  }
  function pickMostVisible(){
    const sels=['.question','.q-item','.exercise-item','.paper-question','.exam-question','article.question','section.question'];
    const list=[]; sels.forEach(s=> document.querySelectorAll(s).forEach(el=> list.push(el)));
    if (!list.length){ document.querySelectorAll('[data-subject],[data-file],[data-id],[data-qid]').forEach(el=> list.push(el)); }
    if (!list.length) return null;
    const vw=innerWidth,vh=innerHeight; let best=list[0],ba=0;
    list.forEach(el=>{ const r=el.getBoundingClientRect(); const a=Math.max(0,Math.min(vw,r.right)-Math.max(0,r.left))*Math.max(0,Math.min(vh,r.bottom)-Math.max(0,r.top)); if (a>ba){ba=a; best=el;} });
    return best;
  }
  function elementToPNG(el, scale=1, cropPad=0){
    return new Promise((resolve, reject)=>{
      try{
        const r = el.getBoundingClientRect();
        const w = Math.max(10, Math.ceil(r.width - cropPad*2));
        const h = Math.max(10, Math.ceil(r.height - cropPad*2));
        const clone = el.cloneNode(true);
        const xml = new XMLSerializer().serializeToString(clone);
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><foreignObject x="0" y="0" width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" style="width:${w}px;height:${h}px;background:#fff;overflow:hidden;">${xml}</div></foreignObject></svg>`;
        const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
        const img = new Image();
        img.onload = ()=>{ const r = Math.max(1,(window.devicePixelRatio||1)*scale); const can=document.createElement('canvas'); can.width=w*r; can.height=h*r; const c=can.getContext('2d'); c.scale(r,r); c.drawImage(img,0,0); resolve(can.toDataURL('image/png')); };
        img.onerror = (e)=> reject(e);
        img.src = url;
      }catch(err){ reject(err); }
    });
  }

  // helpers
  function loadPresets(){ try{ return JSON.parse(localStorage.getItem(PRESETS)||'[]'); }catch(e){ return []; } }
  function savePresets(a){ try{ localStorage.setItem(PRESETS, JSON.stringify(a)); }catch(e){} }

  window.HandwritePro = {
    open: (ctx)=>{
      if (ctx){ window.__currentSubject=ctx.subject||window.__currentSubject; window.__currentPracticeFile=ctx.file||window.__currentPracticeFile; window.__currentQuestionId=ctx.id||window.__currentQuestionId; window.__currentQuestionIndex=(ctx.index!=null)? ctx.index : window.__currentQuestionIndex; }
      ensureUI(); open();
    }
  };

  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', ensureUI); else ensureUI();
})();
