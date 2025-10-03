
(function(){
  const LS_KEY = 'hw_strokes_v1';
  function dpr(){ return window.devicePixelRatio||1; }
  function loadAll(){ try{ return JSON.parse(localStorage.getItem(LS_KEY)||'{}'); }catch(e){ return {}; } }
  function saveAll(o){ try{ localStorage.setItem(LS_KEY, JSON.stringify(o)); }catch(e){} }
  function pageKey(){ return location.pathname + (location.search||''); }
  function getCtxKey(){
    const subj = window.__currentSubject||'misc';
    const file = window.__currentPracticeFile||'';
    const id   = window.__currentQuestionId||'';
    const idx  = (window.__currentQuestionIndex!=null)? String(window.__currentQuestionIndex):'';
    const key = [subj,file,id,idx].filter(Boolean).join('|');
    return key || pageKey();
  }

  // Overlay
  function ensureOverlay(){
    if (document.getElementById('hwOverlay')) return;
    const link = document.createElement('link'); link.rel='stylesheet'; link.href='assets/handwrite.css'; document.head.appendChild(link);
    const openBtn = document.createElement('button'); openBtn.id='openHandwrite'; openBtn.textContent='手写答题'; document.body.appendChild(openBtn);
    const ov = document.createElement('div'); ov.id='hwOverlay'; ov.innerHTML = `
      <div class="inner">
        <div class="hw-head">
          <div>✍️ 手写答题</div>
          <div class="hw-tools">
            <div class="grp">
              <button class="hw-btn" id="hwPen">🖊️钢笔</button>
              <button class="hw-btn" id="hwEraser">🩹橡皮</button>
              <button class="hw-btn" id="hwUndo">↶撤销</button>
              <button class="hw-btn" id="hwRedo">↷重做</button>
              <button class="hw-btn" id="hwClear">清空</button>
            </div>
            <div class="grp">
              <span>颜色</span>
              <div class="color-dot" data-color="#000000" title="黑"></div>
              <div class="color-dot" data-color="#1f6feb" title="蓝"></div>
              <div class="color-dot" data-color="#d73a49" title="红"></div>
              <div class="color-dot" data-color="#2ea043" title="绿"></div>
              <div class="color-dot" data-color="#8a63d2" title="紫"></div>
              <label>粗细 <input id="hwSize" type="range" min="1" max="18" value="3"></label>
              <label class="hw-btn"><input id="hwStylus" type="checkbox" checked> 仅手写笔</label>
              <label>网格
                <select id="hwGrid">
                  <option value="none">无</option>
                  <option value="ruled">横线</option>
                  <option value="squared">方格</option>
                  <option value="dot">点阵</option>
                </select>
              </label>
            </div>
            <div class="grp">
              <button class="hw-btn" id="hwAnchor">选取题目区域</button>
              <button class="hw-btn" id="hwExport">导出PNG</button>
              <button class="hw-btn" id="hwPrint">打印/导出PDF</button>
              <button class="hw-btn" id="hwClose">关闭</button>
            </div>
          </div>
        </div>
        <div class="hw-canvas-wrap">
          <div class="hw-grid" id="hwGridOverlay"></div>
          <canvas class="hw-canvas" id="hwCanvas"></canvas>
        </div>
        <div class="hw-status"><span id="hwStatusL">未锚定：覆盖弹窗区域，可点击“选取题目区域”。</span><span id="hwStatusR">DPR: <span id="hwDpr"></span></span></div>
      </div>`;
    document.body.appendChild(ov);
    openBtn.onclick = ()=> openOverlay();
    // wire
    document.getElementById('hwPen').onclick = ()=> setMode('pen');
    document.getElementById('hwEraser').onclick = ()=> setMode('eraser');
    document.getElementById('hwUndo').onclick = undo;
    document.getElementById('hwRedo').onclick = redo;
    document.getElementById('hwClear').onclick = clearAll;
    Array.from(document.querySelectorAll('.color-dot')).forEach(n=> n.onclick = ()=> setColor(n.dataset.color));
    document.getElementById('hwSize').oninput = (e)=> setSize(parseFloat(e.target.value)||3);
    document.getElementById('hwStylus').onchange = (e)=> S.stylusOnly = e.target.checked;
    document.getElementById('hwGrid').onchange = (e)=> setGrid(e.target.value);
    document.getElementById('hwExport').onclick = exportPNG;
    document.getElementById('hwPrint').onclick = printSheet;
    document.getElementById('hwClose').onclick = closeOverlay;
    document.getElementById('hwAnchor').onclick = pickAnchor;
    setupCanvas();
  }

  // state
  let canvas, ctx, wrap, gridEl;
  let S = { mode:'pen', color:'#000', size:3, stylusOnly:true, grid:'none', strokes:[], redoStack:[], anchor:null };
  function setupCanvas(){
    canvas = document.getElementById('hwCanvas'); wrap = canvas.parentElement; gridEl = document.getElementById('hwGridOverlay');
    ctx = canvas.getContext('2d');
    fitCanvas(); window.addEventListener('resize', fitCanvas);
    document.getElementById('hwDpr').textContent = dpr().toFixed(2);
    let drawing=false, curr=null, last=null;
    canvas.addEventListener('pointerdown', (e)=>{
      if (S.stylusOnly && e.pointerType!=='pen') return;
      e.preventDefault(); canvas.setPointerCapture(e.pointerId);
      drawing=true; curr={mode:S.mode, color:S.color, size:S.size, points:[]};
      const p = pos(e); curr.points.push(p); last=p; render();
    });
    canvas.addEventListener('pointermove', (e)=>{
      if (!drawing) return;
      if (S.stylusOnly && e.pointerType!=='pen') return;
      const p = pos(e); const pts = curr.points; pts.push(p);
      // draw segment
      drawSeg(last, p, curr);
      last = p;
    });
    const finish = ()=>{
      if (!drawing) return;
      drawing=false; S.strokes.push(curr); S.redoStack.length=0; autosave();
    };
    canvas.addEventListener('pointerup', finish); canvas.addEventListener('pointercancel', finish);
  }
  function fitCanvas(){
    const w = Math.max(600, wrap.clientWidth), h = Math.max(420, wrap.clientHeight);
    const r = dpr(); canvas.width = Math.floor(w*r); canvas.height=Math.floor(h*r);
    canvas.style.width=w+'px'; canvas.style.height=h+'px'; render(); updateGrid();
  }
  function updateGrid(){ gridEl.className = 'hw-grid ' + (S.grid==='none'?'':S.grid); }
  function setGrid(g){ S.grid=g; updateGrid(); }
  function pos(e){
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) * dpr(), y = (e.clientY - r.top) * dpr();
    const p = e.pressure && e.pressure>0 ? e.pressure : 0.5;
    return {x,y,p,t:Date.now()};
  }
  function setMode(m){ S.mode=m; document.getElementById('hwPen').classList.toggle('on', m==='pen'); document.getElementById('hwEraser').classList.toggle('on', m==='eraser'); }
  function setColor(c){ S.color=c; }
  function setSize(sz){ S.size = Math.max(1, Math.min(24, sz)); }
  function clearAll(){ if (confirm('清空当前画布？')){ S.strokes=[]; S.redoStack=[]; render(); autosave(); } }
  function undo(){ if (!S.strokes.length) return; S.redoStack.push(S.strokes.pop()); render(); autosave(); }
  function redo(){ if (!S.redoStack.length) return; S.strokes.push(S.redoStack.pop()); render(); autosave(); }
  function drawSeg(a,b,st){
    ctx.save(); ctx.lineCap='round'; ctx.lineJoin='round';
    const w = st.size * (0.7 + 0.6*b.p);
    ctx.lineWidth = w;
    if (st.mode==='eraser'){ ctx.globalCompositeOperation='destination-out'; ctx.strokeStyle='rgba(0,0,0,1)'; }
    else { ctx.globalCompositeOperation='source-over'; ctx.strokeStyle=st.color; }
    ctx.beginPath(); ctx.moveTo(a.x, a.y);
    const mx=(a.x+b.x)/2, my=(a.y+b.y)/2; ctx.quadraticCurveTo(a.x, a.y, mx, my); ctx.stroke(); ctx.restore();
  }
  function render(){
    ctx.save(); ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,canvas.width,canvas.height); ctx.restore();
    for (const st of S.strokes){ const pts=st.points; for (let i=1;i<pts.length;i++){ drawSeg(pts[i-1], pts[i], st); } }
  }

  // Anchor
  function pickAnchor(){
    closeOverlay();
    const hint=document.createElement('div'); hint.className='hw-anchor-hint'; document.body.appendChild(hint);
    function at(e){
      const el=document.elementFromPoint(e.clientX,e.clientY);
      return el && el.closest && el.closest('.question, .q-item, .exercise-item, .paper-question, article, section, main');
    }
    function move(e){
      const q=at(e); if (!q){ hint.style.display='none'; return; }
      const r=q.getBoundingClientRect(); hint.style.display='block'; hint.style.left=r.left+'px'; hint.style.top=r.top+'px'; hint.style.width=r.width+'px'; hint.style.height=r.height+'px';
    }
    function click(e){
      const q=at(e); cleanup(); if (!q){ alert('未识别到题目块'); return; }
      const r=q.getBoundingClientRect(); S.anchor={x:r.left+window.scrollX, y:r.top+window.scrollY, w:r.width, h:r.height}; openOverlay(true);
    }
    function cleanup(){ document.removeEventListener('mousemove', move); document.removeEventListener('click', click, true); hint.remove(); }
    document.addEventListener('mousemove', move); document.addEventListener('click', click, true);
    alert('移动到题目区域并点击进行锚定。');
  }
  function layoutByAnchor(){
    const wrap = document.querySelector('#hwOverlay .hw-canvas-wrap');
    if (!S.anchor){ document.getElementById('hwStatusL').textContent='未锚定：覆盖弹窗区域。'; return; }
    document.getElementById('hwStatusL').textContent=`已锚定：${Math.round(S.anchor.w)}×${Math.round(S.anchor.h)}`;
    const inner = document.querySelector('#hwOverlay .inner'); const extra=140;
    const boxW = Math.min(window.innerWidth-40, Math.max(480, S.anchor.w+40));
    const boxH = Math.min(window.innerHeight-40, Math.max(320, S.anchor.h+extra));
    inner.style.width = boxW+'px'; inner.style.maxHeight = boxH+'px';
    const cwrap = document.querySelector('#hwOverlay .hw-canvas-wrap');
    cwrap.style.height=(boxH-extra)+'px';
  }

  // Save / load / export / print
  function autosave(){ const all=loadAll(); all[getCtxKey()]={strokes:S.strokes, anchor:S.anchor, meta:{color:S.color,size:S.size,grid:S.grid,ts:Date.now()}}; saveAll(all); }
  function loadFromStore(){ const all=loadAll(); const rec=all[getCtxKey()]; if(rec){ S.strokes=rec.strokes||[]; S.anchor=rec.anchor||null; const m=rec.meta||{}; S.color=m.color||S.color; S.size=m.size||S.size; S.grid=m.grid||S.grid; } }
  function exportPNG(){
    canvas.toBlob((blob)=>{ const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='handwrite.png'; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),800); });
  }
  function printSheet(){ const img=new Image(); img.src=canvas.toDataURL('image/png'); const box=document.createElement('div'); box.id='hwPrintView'; box.style.background='#fff'; box.style.padding='12px 16px'; box.innerHTML='<h3>手写答题打印视图</h3>'; box.appendChild(img); document.body.appendChild(box); window.print(); setTimeout(()=>box.remove(),600); }

  function openOverlay(fromAnchor=false){
    ensureOverlay(); loadFromStore(); document.getElementById('hwOverlay').style.display='block'; setMode(S.mode); setGrid(S.grid); fitCanvas(); layoutByAnchor(); render();
  }
  function closeOverlay(){ const ov=document.getElementById('hwOverlay'); if (ov) ov.style.display='none'; autosave(); }

  // public api
  window.Handwrite = { open: (ctx)=>{ if(ctx){ window.__currentSubject=ctx.subject||window.__currentSubject; window.__currentPracticeFile=ctx.file||window.__currentPracticeFile; window.__currentQuestionId=ctx.id||window.__currentQuestionId; window.__currentQuestionIndex=(ctx.index!=null)?ctx.index:window.__currentQuestionIndex; } openOverlay(); }, clear:()=>{ S.strokes=[]; render(); autosave(); }, save: autosave };

  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', ensureOverlay); else ensureOverlay();
})();
