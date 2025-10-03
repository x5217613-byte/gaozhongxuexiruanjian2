
/* 错题本：浏览/标注错因/写笔记/导入导出 */
(function(){
  const KEY_ITEMS='review_items';
  const KEY_NOTE ='mistake_notebook';
  function loadItems(){ try{ return JSON.parse(localStorage.getItem(KEY_ITEMS)||'{}'); }catch(e){ return {}; } }
  function loadNotes(){ try{ return JSON.parse(localStorage.getItem(KEY_NOTE)||'{}'); }catch(e){ return {}; } }
  function saveNotes(n){ try{ localStorage.setItem(KEY_NOTE, JSON.stringify(n)); }catch(e){} }
  function today(){ return new Date().toISOString().slice(0,10); }
  const REASONS = ['语法概念不清','词汇不熟','粗心/读题不细','长难句解析','逻辑推断','背景知识','时间不够'];

  function ensureStyles(){
    if (document.getElementById('mnStyles')) return;
    const s = document.createElement('style'); s.id='mnStyles';
    s.textContent = `
      #openMistakeBook{ position:fixed; left:16px; bottom:120px; z-index:9999; padding:10px 14px; border-radius:999px; border:1px solid #ddd; background:#fff; box-shadow:0 6px 16px rgba(0,0,0,.12); }
      #mnOverlay{ position:fixed; inset:0; background:rgba(0,0,0,.35); z-index:10000; display:none; }
      #mnOverlay .inner{ position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); width:min(1080px, calc(100% - 40px)); max-height:86vh; overflow:auto; background:#fff; border-radius:12px; box-shadow:0 12px 28px rgba(0,0,0,.24); }
      .mn-head{ display:flex; justify-content:space-between; align-items:center; padding:12px 14px; border-bottom:1px solid #eee; font-weight:700; }
      .mn-body{ padding:14px; }
      .mn-actions{ display:flex; gap:8px; align-items:center; }
      .mn-table{ display:grid; grid-template-columns: 120px 110px 1fr 160px 1fr; gap:10px; align-items:center; }
      .mn-table .th{ font-weight:700; border-bottom:1px solid #eee; padding-bottom:6px; }
      .mn-row{ padding:6px 0; border-bottom:1px dashed #eee; }
      .tag{ padding:2px 8px; border:1px solid #ddd; border-radius:999px; margin-right:6px; font-size:12px; background:#fafafa; cursor:pointer; }
      .tag.on{ background:#e8f3ff; border-color:#b6d4fe; }
      textarea{ width:100%; min-height: 60px; resize:vertical; padding:6px 8px; }
    `;
    document.head.appendChild(s);
  }

  function overlay(){
    let ov = document.getElementById('mnOverlay');
    if (!ov){
      ov = document.createElement('div'); ov.id='mnOverlay';
      ov.innerHTML = `
        <div class="inner">
          <div class="mn-head">
            <div>📒 错题本</div>
            <div class="mn-actions">
              <button id="mnExport">导出JSON</button>
              <label class="tag">导入JSON <input type="file" id="mnImport" accept="application/json" style="display:none;"></label>
              <button id="mnClose">关闭</button>
            </div>
          </div>
          <div class="mn-body">
            <div class="mn-table">
              <div class="th">日期</div><div class="th">类型</div><div class="th">题目</div><div class="th">错因</div><div class="th">笔记</div>
              <div id="mnRows"></div>
            </div>
          </div>
        </div>`;
      document.body.appendChild(ov);
      ov.querySelector('#mnClose').addEventListener('click', ()=> ov.style.display='none');
      ov.addEventListener('click', (e)=>{ if(e.target===ov) ov.style.display='none'; });
      ov.querySelector('#mnExport').addEventListener('click', ()=>{
        const blob = new Blob([JSON.stringify(loadNotes(), null, 2)], {type:'application/json'});
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download='mistake_notebook.json'; a.click();
      });
      ov.querySelector('#mnImport').addEventListener('change', (ev)=>{
        const f = ev.target.files && ev.target.files[0]; if (!f) return;
        const r = new FileReader(); r.onload = ()=>{ try{ const data=JSON.parse(r.result); localStorage.setItem(KEY_NOTE, JSON.stringify(data)); renderRows(); alert('导入成功'); }catch(e){ alert('导入失败'); } };
        r.readAsText(f);
      });
    }
    return ov;
  }

  function renderRows(){
    const itemsByDay = loadItems();
    const notes = loadNotes();
    const rowsBox = document.getElementById('mnRows');
    const days = Object.keys(itemsByDay).sort(); // asc
    let html = '';
    days.forEach(d=>{
      (itemsByDay[d]||[]).forEach(item=>{
        const sig = (item.subtype||'')+'|'+(item.id||'')+'|'+(item.file||'');
        const rec = notes[sig] || { reasons:[], note:'' };
        const tags = REASONS.map(r=> `<span class="tag ${rec.reasons.includes(r)?'on':''}" data-sig="${sig}" data-r="${r}">${r}</span>`).join('');
        const note = rec.note || '';
        html += `<div class="mn-row" data-sig="${sig}" style="display:contents;">
          <div>${d}</div>
          <div>${item.subtype||''}</div>
          <div>${(item.title||'（无标题）')} <span class="tag">${item.file||''}</span> <span class="tag">${item.id||''}</span></div>
          <div>${tags}</div>
          <div><textarea data-sig="${sig}" placeholder="记录易错点、改错过程、技巧...">${note}</textarea></div>
        </div>`;
      });
    });
    rowsBox.innerHTML = html or '<div>暂无错题记录。</div>';
    // wire tag toggles & textarea save
    rowsBox.querySelectorAll('.tag[data-sig]').forEach(t=>{
      t.addEventListener('click', ()=>{
        const sig = t.getAttribute('data-sig'); const r = t.getAttribute('data-r');
        const notes = loadNotes(); const rec = notes[sig] || {reasons:[], note:''};
        const idx = rec.reasons.indexOf(r);
        if (idx>=0) rec.reasons.splice(idx,1); else rec.reasons.push(r);
        notes[sig] = rec; saveNotes(notes);
        t.classList.toggle('on');
      });
    });
    rowsBox.querySelectorAll('textarea[data-sig]').forEach(ta=>{
      ta.addEventListener('change', ()=>{
        const sig = ta.getAttribute('data-sig'); const notes = loadNotes(); const rec = notes[sig] || {reasons:[], note:''};
        rec.note = ta.value; notes[sig] = rec; saveNotes(notes);
      });
    });
  }

  function boot(){
    ensureStyles();
    if (!document.getElementById('openMistakeBook')){
      const b = document.createElement('button'); b.id='openMistakeBook'; b.textContent='错题本';
      b.onclick = ()=>{ overlay().style.display='block'; renderRows(); };
      document.body.appendChild(b);
    }
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
