
/* 专项回炉练：从 ReviewCapture(review_items) 拉取错题，支持 grammar/reading/cloze 练习 */
(function(){
  const KEY = 'review_items';
  function loadAll(){ try{ return JSON.parse(localStorage.getItem(KEY)||'{}'); }catch(e){ return {}; } }
  function today(){ return new Date().toISOString().slice(0,10); }
  function pick(arr, n){ const a=arr.slice(); const out=[]; while(a.length && out.length<n){ out.push(a.splice(Math.floor(Math.random()*a.length),1)[0]); } return out; }
  function ensureStyles(){
    if (document.getElementById('rpStyles')) return;
    const s = document.createElement('style'); s.id='rpStyles';
    s.textContent = `
      #openReviewPractice{ position:fixed; left:16px; bottom:70px; z-index:9999; padding:10px 14px; border-radius:999px; border:1px solid #ddd; background:#fff; box-shadow:0 6px 16px rgba(0,0,0,.12); }
      #rpOverlay{ position:fixed; inset:0; background:rgba(0,0,0,.35); z-index:10000; display:none; }
      #rpOverlay .inner{ position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); width:min(960px, calc(100% - 40px)); max-height:86vh; overflow:auto; background:#fff; border-radius:12px; box-shadow:0 12px 28px rgba(0,0,0,.24); }
      .rp-head{ display:flex; justify-content:space-between; align-items:center; padding:12px 14px; border-bottom:1px solid #eee; font-weight:700; }
      .rp-actions{ display:flex; gap:10px; align-items:center; }
      .rp-body{ padding:14px; }
      .rp-ctrls{ display:flex; gap:8px; margin-top:8px; flex-wrap:wrap; }
      .rp-q{ margin:10px 0; padding:10px 12px; border:1px solid #eee; border-radius:10px; background:#fafafa; }
      .rp-q .meta{ font-size:12px; color:#555; margin-bottom:6px; display:flex; gap:8px; flex-wrap:wrap; }
      .rp-q .title{ font-size:16px; }
      .badge{ display:inline-block; padding:2px 6px; border:1px solid #ddd; border-radius:999px; font-size:12px; margin-left:6px; background:#fafafa; }
      .pill{ padding:3px 10px; border:1px solid #ddd; border-radius:999px; background:#fff; }
    `;
    document.head.appendChild(s);
  }
  function overlay(){
    let ov = document.getElementById('rpOverlay');
    if (!ov){
      ov = document.createElement('div'); ov.id='rpOverlay';
      ov.innerHTML = `
        <div class="inner">
          <div class="rp-head">
            <div>🧩 专项回炉练</div>
            <div class="rp-actions">
              <label>题量 <input type="number" id="rpSize" min="6" max="40" step="1" value="12"></label>
              <label>范围
                <select id="rpScope">
                  <option value="today">今天</option>
                  <option value="all">全部</option>
                </select>
              </label>
              <label>类型
                <select id="rpType">
                  <option value="mix">综合</option>
                  <option value="grammar">语法</option>
                  <option value="reading">阅读</option>
                  <option value="cloze">完形</option>
                </select>
              </label>
              <button id="rpStart">开始</button>
              <button id="rpClose">关闭</button>
            </div>
          </div>
          <div class="rp-body">
            <div id="rpMeta"></div>
            <div id="rpStage"></div>
            <div class="rp-ctrls">
              <button id="rpShow">显示参考</button>
              <button id="rpCorrect">我对了</button>
              <button id="rpWrong">我错了</button>
              <button id="rpNext">下一题</button>
            </div>
            <div id="rpSummary" class="rp-summary"></div>
          </div>
        </div>`;
      document.body.appendChild(ov);
      ov.querySelector('#rpClose').addEventListener('click', ()=> ov.style.display='none');
      ov.addEventListener('click', (e)=>{ if(e.target===ov) ov.style.display='none'; });
    }
    return ov;
  }
  const Session = {
    init(items, size){
      this.deck = pick(items, size);
      this.i=0; this.correct=0; this.wrong=0; this.start=Date.now();
      this.render();
    },
    cur(){ return this.deck[this.i]; },
    render(){
      const s = document.getElementById('rpStage');
      const it = this.cur();
      if (!it){ this.finish(); return; }
      const meta = `<div class="meta"><span class="pill">${it.subtype.toUpperCase()}</span><span class="pill">${it.file||'unknown'}</span><span class="pill">${it.id||''}</span></div>`;
      s.innerHTML = `<div class="rp-q">${meta}<div class="title">${(it.title||'(无标题，回到原题查看)')}</div><div id="rpRef" style="display:none; margin-top:8px; font-size:13px; color:#555;">参考：请回到原题 <b>${it.file||''}</b> / <b>${it.id||''}</b> 复盘。</div></div>`;
      document.getElementById('rpShow').onclick = ()=>{ const r=document.getElementById('rpRef'); if(r) r.style.display='block'; };
      document.getElementById('rpCorrect').onclick = ()=>{ this.correct++; this.next(); };
      document.getElementById('rpWrong').onclick = ()=>{ this.wrong++; this.next(); };
      document.getElementById('rpNext').onclick = ()=> this.next();
      document.getElementById('rpMeta').innerHTML = `进度 <b>${this.i+1}</b>/<b>${this.deck.length}</b> <span class="badge">综合训练</span>`;
    },
    next(){ this.i++; this.render(); },
    finish(){
      const mins = Math.max(1, Math.round((Date.now()-this.start)/60000));
      const sum = document.getElementById('rpSummary');
      sum.innerHTML = `✅ 完成 ${this.deck.length} 题 · 正确 ${this.correct} · 错误 ${this.wrong} · 用时 ${mins} 分钟`;
    }
  };
  function gather(scope, tp){
    const all = loadAll();
    const days = (scope==='all') ? Object.keys(all) : [today()];
    let arr = [];
    days.forEach(d=> arr = arr.concat(all[d]||[]));
    if (tp!=='mix'){ arr = arr.filter(x=> x.subtype===tp); }
    return arr;
  }
  function boot(){
    ensureStyles();
    // floating button
    if (!document.getElementById('openReviewPractice')){
      const b = document.createElement('button'); b.id='openReviewPractice'; b.textContent='专项回炉练';
      b.onclick = ()=> { overlay().style.display='block'; };
      document.body.appendChild(b);
    }
    const ov = overlay();
    ov.querySelector('#rpStart').addEventListener('click', ()=>{
      const size = Math.max(6, Math.min(40, parseInt(document.getElementById('rpSize').value||12)));
      const scope = document.getElementById('rpScope').value;
      const tp = document.getElementById('rpType').value;
      const items = gather(scope, tp);
      if (!items.length){ alert('暂无可回炉的错题，请先在练习里标记一些错题。'); return; }
      Session.init(items, size);
    });
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
