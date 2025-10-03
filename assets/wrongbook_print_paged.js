
/* wrongbook_print_paged.js — build a paginated wrongbook view grouped by subject/file/id */
(function(){
  function load(name){ try{ return JSON.parse(localStorage.getItem(name)||'{}'); }catch(e){ return {}; } }
  function key(subject,file,id){ return `${subject||'english'}|${file||''}|${id||''}`; }
  function latestSnap(store, k){
    const rec = store[k]; if (rec && rec.snaps && rec.snaps.length) return rec.snaps[0].png;
    return null;
  }
  function ensureToolbar(){
    const id='wbPagedBtn'; if (document.getElementById(id)) return;
    const bar = document.getElementById('wbPrintToolbar') || (function(){ const d=document.createElement('div'); d.id='wbPrintToolbar'; d.style.position='fixed'; d.style.right='16px'; d.style.bottom='16px'; d.style.zIndex=9999; d.style.display='flex'; d.style.gap='8px'; document.body.appendChild(d); return d; })();
    const btn=document.createElement('button'); btn.id=id; btn.textContent='错题本·分页打印'; btn.style.padding='8px 12px'; btn.style.border='1px solid #ddd'; btn.style.borderRadius='999px'; btn.style.background='#fff'; btn.style.boxShadow='0 6px 16px rgba(0,0,0,.12)';
    bar.appendChild(btn);
    btn.onclick = buildPaged;
  }
  function buildPaged(){
    const review = load('review_items'); // {date: [items]}
    const notes  = load('mistake_notebook'); // sig-> {reasons, note}
    const ink    = load('hwpro_v1'); // key-> {snaps}
    const all=[];
    Object.keys(review||{}).forEach(d=> (review[d]||[]).forEach(it=> all.push(it)));
    // group by subject/file
    const groups={};
    all.forEach(it=>{
      const gk=`${it.subject||'english'}|${it.file||''}`;
      groups[gk]=groups[gk]||[]; groups[gk].push(it);
    });
    const wrap = document.getElementById('wrongbookPrintViewPaged') || (function(){ const d=document.createElement('div'); d.id='wrongbookPrintViewPaged'; document.body.appendChild(d); return d; })();
    wrap.innerHTML = `<style>
      @media print {
        body * { visibility: hidden; }
        #wrongbookPrintViewPaged, #wrongbookPrintViewPaged * { visibility: visible; }
        #wrongbookPrintViewPaged { position:absolute; left:0; top:0; width:100%; padding:10px 16px; }
        .page { page-break-after: always; }
      }
      .cover{ text-align:center; padding:120px 20px; }
      .cover h1{ font-size:28px; margin:0; }
      .cover h3{ font-size:16px; color:#555; font-weight:400; }
      .group{ page-break-after: always; }
      .group h2{ margin:20px 0 6px; border-bottom:2px solid #000; padding-bottom:6px; }
      .item{ margin:10px 0 18px; }
      .meta{ font-size:12px; color:#555; }
      .shot img{ max-width:100%; border:1px solid #eee; border-radius:6px; }
      .note{ font-size:12px; white-space:pre-wrap; border-left:3px solid #eee; padding-left:8px; }
    </style>`;

    let html = `<div class="cover page"><h1>错题本（分页打印）</h1><h3>${new Date().toLocaleString()}</h3></div>`;
    Object.keys(groups).sort().forEach(gk=>{
      const [subject,file] = gk.split('|');
      html += `<div class="group"><h2>${subject} / ${file}</h2>`;
      groups[gk].forEach((it,idx)=>{
        const k = key(it.subject, it.file, it.id);
        const shot = latestSnap(ink, k);
        const sig = `${it.subject||'english'}|${it.subtype||''}|${it.id||''}|${it.file||''}`;
        const note = (notes[sig]||{});
        html += `<div class="item">
          <div class="meta">#${it.id||''} ${it.title||''}</div>
          ${shot? `<div class="shot"><img src="${shot}"></div>`:''}
          <div class="note"><b>错因：</b>${(note.reasons||[]).join('，')||'—'}\n<b>笔记：</b>${note.note||'—'}</div>
        </div>`;
      });
      html += `</div>`;
    });
    wrap.innerHTML += html;
    wrap.scrollIntoView({behavior:'smooth'});
  }
  function boot(){ ensureToolbar(); }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
