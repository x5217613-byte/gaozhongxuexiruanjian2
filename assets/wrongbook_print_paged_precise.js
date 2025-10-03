
/* wrongbook_print_paged_precise.js — v2 with multi-level TOC and per-page header (group) */
(function(){
  function load(name){ try{ return JSON.parse(localStorage.getItem(name)||'{}'); }catch(e){ return {}; } }
  function latestSnap(store, k){ const rec=store[k]; return (rec && rec.snaps && rec.snaps[0]) ? rec.snaps[0].png : null; }
  function key(subject,file,id,index){ return [subject||'english', file||'', id||'', (index!=null? index:'')].filter(s=> String(s).length>0).join('|'); }

  function ensureBtn(){
    const bar = document.getElementById('wbPrintToolbar') || (function(){ const d=document.createElement('div'); d.id='wbPrintToolbar'; d.style.position='fixed'; d.style.right='16px'; d.style.bottom='16px'; d.style.zIndex=9999; d.style.display='flex'; d.style.gap='8px'; document.body.appendChild(d); return d; })();
    if (document.getElementById('wbPagedPrecise')) return;
    const b=document.createElement('button'); b.id='wbPagedPrecise'; b.textContent='错题本·精准分页打印(目录页码)';
    b.style.padding='8px 12px'; b.style.border='1px solid #ddd'; b.style.borderRadius='999px'; b.style.background='#fff'; b.style.boxShadow='0 6px 16px rgba(0,0,0,.12)';
    bar.appendChild(b);
    b.onclick = openBuilder;
  }

  function openBuilder(){
    const panel = document.getElementById('wbBuilder') || (function(){
      const d=document.createElement('div'); d.id='wbBuilder'; d.style.position='fixed'; d.style.left='50%'; d.style.top='50%'; d.style.transform='translate(-50%,-50%)'; d.style.width='min(920px, calc(100% - 40px))'; d.style.maxHeight='90vh'; d.style.overflow='auto'; d.style.background='#fff'; d.style.border='1px solid #ddd'; d.style.borderRadius='12px'; d.style.boxShadow='0 18px 40px rgba(0,0,0,.25)'; d.style.padding='12px'; d.innerHTML = `
        <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:flex-end;">
          <label>A4 高度(px) <input id="pph" type="number" value="1122" style="width:120px"></label>
          <label>页边距(px) <input id="ppm" type="number" value="36" style="width:120px"></label>
          <label>分组依据 
            <select id="pgGroup">
              <option value="subjectFile">学科/文件</option>
              <option value="knowledge">知识点</option>
              <option value="qtype">题型</option>
            </select>
          </label>
          <label><input type="checkbox" id="tocItems" checked> 目录包含二级条目（题号）</label>
          <button class="hw-btn" id="pgBuild">生成</button>
          <button class="hw-btn" id="pgClose">关闭</button>
        </div>
        <div style="font-size:12px;color:#666;margin-top:6px;">注：目录页码为预分页后的真实页码；页眉会展示当前分组（如 学科/文件）。</div>
      `; document.body.appendChild(d); return d;
    })();
    panel.style.display='block';
    panel.querySelector('#pgClose').onclick = ()=> panel.style.display='none';
    panel.querySelector('#pgBuild').onclick = ()=> buildPaged(
      parseInt(panel.querySelector('#pph').value||'1122',10),
      parseInt(panel.querySelector('#ppm').value||'36',10),
      panel.querySelector('#pgGroup').value,
      panel.querySelector('#tocItems').checked
    );
  }

  function buildPaged(pageHeight, margin, groupBy, includeItems){
    const review = load('review_items'); // {date: [items]}
    const notes  = load('mistake_notebook'); // sig-> {reasons, note, knowledge?, qtype?}
    const ink    = load('hwpro_v1');
    const items=[]; Object.keys(review||{}).forEach(d=> (review[d]||[]).forEach(it=> items.push(it)));
    // enrich by inference if missing
    items.forEach(it=>{
      const sig = `${it.subject||'english'}|${it.subtype||''}|${it.id||''}|${it.file||''}`;
      const n = notes[sig]||{};
      if (!n.knowledge || !n.qtype){
        try{
          const m = (window.KW && window.KW.inferForItem) ? window.KW.inferForItem(it) : {};
          if (m && (m.knowledge || m.qtype)){
            notes[sig] = Object.assign({}, n, m);
            localStorage.setItem('mistake_notebook', JSON.stringify(notes));
          }
        }catch(e){}
      }
    });

    // grouping
    const groupKey = (it)=>{
      if (groupBy==='knowledge'){
        const sig = `${it.subject||'english'}|${it.subtype||''}|${it.id||''}|${it.file||''}`;
        const n = notes[sig]||{};
        return n.knowledge || '未标注知识点';
      }
      if (groupBy==='qtype'){
        const sig = `${it.subject||'english'}|${it.subtype||''}|${it.id||''}|${it.file||''}`;
        const n = notes[sig]||{};
        return n.qtype || '未标注题型';
      }
      return `${it.subject||'english'} / ${it.file||''}`;
    };
    const groups={};
    items.forEach(it=>{ const k=groupKey(it); (groups[k]=groups[k]||[]).push(it); });

    // host + styles
    const host = document.getElementById('wrongbookPrintViewPaged') || (function(){ const d=document.createElement('div'); d.id='wrongbookPrintViewPaged'; document.body.appendChild(d); return d; })();
    host.innerHTML = `<style>
      @media print { body * { visibility: hidden; } #wrongbookPrintViewPaged, #wrongbookPrintViewPaged * { visibility: visible; } #wrongbookPrintViewPaged { position:absolute; left:0; top:0; width:100%; } }
      .page { box-sizing:border-box; width: 794px; height:${pageHeight}px; margin: 10px auto; border:1px solid #eee; padding:${margin}px; position:relative; background:#fff; }
      .page .footer{ position:absolute; left:${margin}px; right:${margin}px; bottom:${Math.max(8, margin-8)}px; display:flex; justify-content:space-between; color:#666; font-size:12px; }
      .page .header{ position:absolute; left:${margin}px; right:${margin}px; top:${Math.max(8, margin-8)}px; color:#666; font-size:12px; display:flex; justify-content:space-between; }
      .content{ margin-top:28px; }
      .item{ margin:10px 0 16px; }
      .item img{ max-width:100%; border:1px solid #eee; border-radius:6px; }
      h1,h2,h3{ margin:0 0 8px; }
      .toc .row{ display:flex; justify-content:space-between; border-bottom:1px dashed #eee; padding:4px 0; }
      .toc .sub{ padding-left:16px; font-size:12px; color:#444; display:flex; justify-content:space-between; }
    </style>`;

    const pages=[];
    let curHeader='';
    function newPage(headerText){
      const p=document.createElement('div'); p.className='page';
      p.__h=0; p.dataset.index=String(pages.length+1);
      p.innerHTML = `<div class="header"><div class="hL">${headerText||''}</div><div class="hR">${new Date().toLocaleDateString()}</div></div><div class="content"></div><div class="footer"><div>错题本·分页打印</div><div class="pg">第 ${pages.length+1} 页</div></div>`;
      host.appendChild(p); pages.push(p); curHeader=headerText||''; return p;
    }
    function addBlock(html, heightGuess=120, headerText){
      let p = pages.at(-1);
      if (!p || (headerText!=null && headerText!==curHeader)) p = newPage(headerText||curHeader);
      // measure in content box
      const content = p.querySelector('.content');
      const probe = document.createElement('div'); probe.style.visibility='hidden'; probe.innerHTML=html; content.appendChild(probe);
      const h = Math.ceil(probe.getBoundingClientRect().height); content.removeChild(probe);
      const usable = (pageHeight - 2*margin - 28 - 22); // content area rough
      if (p.__h + h > usable){ p = newPage(headerText||curHeader); }
      const box = document.createElement('div'); box.innerHTML=html; content.appendChild(box); p.__h += h + 8;
      return p;
    }

    // cover
    addBlock(`<div class="cover" style="text-align:center;padding-top:120px;">
      <h1>错题本合集</h1><h3 style="color:#666;font-weight:400;">${new Date().toLocaleString()}</h3>
    </div>`, 260, '封面');
    // reserve TOC
    const tocStart = pages.length ? pages.length : 1;
    const tocBox = addBlock(`<div class="toc"><h2>目录</h2><div class="rows"></div></div>`, 420, '目录');

    const mapGroupPage={}; const mapItemPage={}; // name -> page; key -> page
    Object.keys(groups).sort().forEach(gname=>{
      // group header
      const pg = addBlock(`<h2>${gname}</h2>`, 48, gname);
      if (!mapGroupPage[gname]) mapGroupPage[gname]=parseInt(pg.dataset.index,10);
      // items
      groups[gname].forEach(it=>{
        const k = key(it.subject, it.file, it.id, it.index);
        const shot = latestSnap(ink, k);
        // notes + inference fallback
        const sig = `${it.subject||'english'}|${it.subtype||''}|${it.id||''}|${it.file||''}`;
        const n = notes[sig] || {};
        if ((!n.knowledge || !n.qtype) && window.KW){ const m = window.KW.inferForItem(it)||{}; notes[sig]=Object.assign({}, n, m); localStorage.setItem('mistake_notebook', JSON.stringify(notes)); }
        const info = notes[sig] || {};
        const html = `<div class="item">
          <div class="meta" style="font-size:12px;color:#555;">#${it.id||''} ${it.title||''} ${info.knowledge? ' | '+info.knowledge : ''} ${info.qtype? ' | '+info.qtype : ''}</div>
          ${shot? `<div class="shot"><img src="${shot}"></div>` : ''}
          <div class="note" style="font-size:12px;"><b>错因：</b>${(info.reasons||[]).join('，')||'—'}；<b>笔记：</b>${info.note||'—'}</div>
        </div>`;
        const where = addBlock(html, 180, gname);
        mapItemPage[`${gname}||${it.id||''}`] = parseInt(where.dataset.index,10);
      });
    });

    // build TOC (multi-level)
    const rows = Object.keys(mapGroupPage).sort().map((g,i)=>{
      const head = `<div class="row"><span>${i+1}. ${g}</span><span>${mapGroupPage[g]}</span></div>`;
      if (!includeItems) return head;
      // sub items under group
      const its = Object.keys(mapItemPage).filter(k=> k.startsWith(g+'||'));
      const subs = its.map(k=>{
        const id = k.split('||')[1];
        return `<div class="sub"><span>· 题号 ${id}</span><span>${mapItemPage[k]}</span></div>`;
      }).join('');
      return head + subs;
    }).join('');
    tocBox.querySelector('.rows').innerHTML = rows;
    host.scrollIntoView({behavior:'smooth'});
  }

  function boot(){ ensureBtn(); }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
