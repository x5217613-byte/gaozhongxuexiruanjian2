
/* subject_practice.js
 * 专项回炉练(多学科)：支持 英语/数学/物理/化学
 * - 从 ReviewCapture(review_items) 读取 {subject, subtype, id, title, file}
 * - 选择 学科 + 题量 + 范围(今天|全部) + 类型(按学科动态)
 * - 显示题目元数据与回看提示；统计本次对/错；导出训练报告 JSON
 */
(function(){
  const SUBJECT_TYPES = {
    english: ['grammar','reading','cloze','vocab'],
    math:    ['algebra','geometry','function','probability','calculus'],
    physics: ['mechanics','electricity','optics','thermo','waves'],
    chemistry:['inorganic','organic','physical','equilibrium','bonding']
  };
  function loadAll(){ try{ return JSON.parse(localStorage.getItem('review_items')||'{}'); }catch(e){ return {}; } }
  function today(){ return new Date().toISOString().slice(0,10); }
  function pick(arr, n){ const a=arr.slice(); const out=[]; while(a.length && out.length<n){ out.push(a.splice(Math.floor(Math.random()*a.length),1)[0]); } return out; }
  function ensureStyles(){
    if (document.getElementById('spStyles')) return;
    const s=document.createElement('style'); s.id='spStyles';
    s.textContent = `
      #openSubjectPractice{ position:fixed; left:16px; bottom:164px; z-index:9999; padding:10px 14px; border-radius:999px; border:1px solid #ddd; background:#fff; box-shadow:0 6px 16px rgba(0,0,0,.12); }
      #spOverlay{ position:fixed; inset:0; background:rgba(0,0,0,.35); z-index:10000; display:none; }
      #spOverlay .inner{ position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); width:min(1040px, calc(100% - 40px)); max-height:86vh; overflow:auto; background:#fff; border-radius:12px; box-shadow:0 12px 28px rgba(0,0,0,.24); }
      .sp-head{ display:flex; justify-content:space-between; align-items:center; padding:12px 14px; border-bottom:1px solid #eee; font-weight:700; }
      .sp-actions{ display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
      .sp-body{ padding:14px; }
      .sp-q{ border:1px solid #eee; border-radius:10px; padding:10px 12px; margin:10px 0; background:#fafafa; }
      .pill{ padding:3px 8px; border:1px solid #ddd; border-radius:999px; background:#fff; margin-right:6px; font-size:12px; }
      .badge{ display:inline-block; padding:2px 6px; border:1px solid #ddd; border-radius:999px; font-size:12px; margin-left:6px; background:#fafafa; }
      .sp-ctrls{ display:flex; gap:8px; flex-wrap:wrap; margin-top:8px; }
    `;
    document.head.appendChild(s);
  }
  function overlay(){
    let ov = document.getElementById('spOverlay');
    if (!ov){
      ov = document.createElement('div'); ov.id='spOverlay';
      ov.innerHTML = `
        <div class="inner">
          <div class="sp-head">
            <div>🧠 多学科·专项回炉练</div>
            <div class="sp-actions">
              <label>学科
                <select id="spSubject">
                  <option value="english">英语</option>
                  <option value="math">数学</option>
                  <option value="physics">物理</option>
                  <option value="chemistry">化学</option>
                </select>
              </label>
              <label>类型
                <select id="spType"></select>
              </label>
              <label>题量 <input id="spNum" type="number" min="6" max="50" step="1" value="15"></label>
              <label>范围
                <select id="spScope">
                  <option value="today">今天</option>
                  <option value="all">全部</option>
                </select>
              </label>
              <button id="spStart">开始</button>
              <button id="spClose">关闭</button>
            </div>
          </div>
          <div class="sp-body">
            <div id="spMeta"></div>
            <div id="spStage"></div>
            <div class="sp-ctrls">
              <button id="spShow">显示参考</button>
              <button id="spCorrect">我对了</button>
              <button id="spWrong">我错了</button>
              <button id="spNext">下一题</button>
            </div>
            <div id="spSummary"></div>
          </div>
        </div>`;
      document.body.appendChild(ov);
      ov.querySelector('#spClose').onclick = ()=> ov.style.display='none';
      ov.addEventListener('click', (e)=>{ if(e.target===ov) ov.style.display='none'; });
      const subSel = ov.querySelector('#spSubject');
      const typeSel = ov.querySelector('#spType');
      const syncTypes = ()=>{
        const subj = subSel.value;
        const types = SUBJECT_TYPES[subj] || [];
        typeSel.innerHTML = `<option value="mix">综合</option>` + types.map(t=> `<option value="${t}">${t}</option>`).join('');
      };
      subSel.addEventListener('change', syncTypes); syncTypes();
    }
    return ov;
  }
  const Session = {
    init(items, num){
      this.deck = items.slice(0, num);
      this.i=0; this.correct=0; this.wrong=0; this.start=Date.now();
      this.render();
    },
    cur(){ return this.deck[this.i]; },
    render(){
      const it = this.cur(); const stage = document.getElementById('spStage');
      if (!it){ this.finish(); return; }
      stage.innerHTML = `<div class="sp-q"><div><span class="pill">${(it.subject||'')}</span><span class="pill">${(it.subtype||'')}</span><span class="pill">${it.file||''}</span><span class="pill">${it.id||''}</span></div><div style="margin-top:6px;">${it.title||'(回到原题查看)'}<br><small>${(it.snippet||'').replace(/</g,'&lt;')}</small></div><div id="spRef" style="display:none; margin-top:8px; font-size:13px; color:#555;">参考：请在原题处查看解析与讲评。</div></div>`;
      document.getElementById('spShow').onclick = ()=>{ const r=document.getElementById('spRef'); if (r) r.style.display='block'; };
      document.getElementById('spCorrect').onclick = ()=>{ this.correct++; this.next(); };
      document.getElementById('spWrong').onclick = ()=>{ this.wrong++; this.next(); };
      document.getElementById('spNext').onclick = ()=> this.next();
      document.getElementById('spMeta').innerHTML = `进度 <b>${this.i+1}</b>/<b>${this.deck.length}</b>`;
    },
    next(){ this.i++; this.render(); },
    finish(){
      const mins = Math.max(1, Math.round((Date.now()-this.start)/60000));
      const sum = document.getElementById('spSummary');
      sum.innerHTML = `✅ 完成 ${this.deck.length} 题 · 正确 ${this.correct} · 错误 ${this.wrong} · 用时 ${mins} 分钟
        <div style="margin-top:6px;"><button id="spExport">导出本次报告</button></div>`;
      document.getElementById('spExport').onclick = ()=>{
        const report = {date:new Date().toISOString(), size:this.deck.length, correct:this.correct, wrong:this.wrong};
        const blob = new Blob([JSON.stringify(report,null,2)], {type:'application/json'});
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'subject_review_report.json'; a.click();
      };
    }
  };
  function gather(subj, scope, tp){
    const all = loadAll();
    const days = scope==='all' ? Object.keys(all) : [today()];
    let arr = []; days.forEach(d=> arr = arr.concat(all[d]||[]));
    arr = arr.filter(x=> (x.subject||'english')===subj);
    if (tp!=='mix') arr = arr.filter(x=> x.subtype===tp);
    // shuffle
    for (let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]= [arr[j],arr[i]]; }
    return arr;
  }
  function boot(){
    ensureStyles();
    if (!document.getElementById('openSubjectPractice')){
      const b=document.createElement('button'); b.id='openSubjectPractice'; b.textContent='专项回炉练+';
      b.onclick = ()=> overlay().style.display='block';
      document.body.appendChild(b);
    }
    const ov = overlay();
    ov.querySelector('#spStart').onclick = ()=>{
      const subj = ov.querySelector('#spSubject').value;
      const tp = ov.querySelector('#spType').value;
      const num = Math.max(6, Math.min(50, parseInt(ov.querySelector('#spNum').value||'15')));
      const scope = ov.querySelector('#spScope').value;
      const items = gather(subj, scope, tp);
      if (!items.length){ alert('该学科暂无可回炉的错题，先在练习里标记一些吧～'); return; }
      Session.init(items, num);
    };
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
