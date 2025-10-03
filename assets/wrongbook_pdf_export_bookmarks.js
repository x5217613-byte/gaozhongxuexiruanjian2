
(function(){
  function ready(fn){ if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }
  function load(name){ try{ return JSON.parse(localStorage.getItem(name)||'{}'); }catch(e){ return {}; } }
  function key(subject,file,id,index){ return [subject||'english', file||'', id||'', (index!=null? index:'')].filter(s=> String(s).length>0).join('|'); }

  function ensureBtn(id, text, onclick){
    const bar = document.getElementById('wbPrintToolbar') || (function(){ const d=document.createElement('div'); d.id='wbPrintToolbar'; d.style.position='fixed'; d.style.right='16px'; d.style.bottom='16px'; d.style.zIndex=9999; d.style.display='flex'; d.style.gap='8px'; document.body.appendChild(d); return d; })();
    if (document.getElementById(id)) return;
    const b=document.createElement('button'); b.id=id; b.textContent=text; b.className='hw-btn';
    bar.appendChild(b); b.onclick = onclick;
  }

  function export3(){
    const review = load('review_items'); const ink = load('hwpro_v1'); const notes = load('mistake_notebook');
    const items=[]; Object.keys(review||{}).forEach(d=> (review[d]||[]).forEach(it=> items.push(it)));
    if (!items.length){ alert('暂无错题数据'); return; }
    const groups = {};
    items.forEach(it=>{
      const group = (it.subject||'english') + ' / ' + (it.file||'');
      const sig = (it.subject||'english')+'|'+(it.subtype||'')+'|'+(it.id||'')+'|'+(it.file||'');
      const n = (notes||{})[sig] || {};
      const knowledge = n.knowledge || '未标注知识点';
      (groups[group] = groups[group] || {});
      (groups[group][knowledge] = groups[group][knowledge] || []).push(it);
    });

    const pages=[]; const outline=[];
    Object.keys(groups).sort().forEach(gName=>{
      const knowChildren=[];
      const kmap=groups[gName];
      const startG = pages.length;
      Object.keys(kmap).sort().forEach(kName=>{
        const startK = pages.length;
        const qs = kmap[kName];
        const itemsArr=[];
        qs.forEach(it=>{
          const sig = key(it.subject, it.file, it.id, it.index);
          const rec = (ink||{})[sig]; const shot = rec?.snaps?.[0]?.png;
          if (shot){ itemsArr.push({title:'题号 '+(it.id||''), dataURL: shot}); pages.push({title:(gName+' / '+kName+' - #'+(it.id||'')), dataURL: shot}); }
        });
        if (itemsArr.length){
          knowChildren.push({ title: kName, pageIndex: startK, items: itemsArr.map((c, i)=> ({ title: c.title, pageIndex: startK + i })) });
        }
      });
      if (knowChildren.length){
        outline.push({ title: gName, pageIndex: startG, children: knowChildren });
      }
    });

    if (!pages.length){ alert('没有快照，请先在题目页使用“题干截图为背景”。'); return; }
    if (!window.TinyPDF){ alert('TinyPDF 未加载'); return; }
    window.TinyPDF.exportJPEGPagesWithBookmarks(pages, outline, 'wrongbook-bookmarks-3level.pdf');
  }

  ready(function(){
    ensureBtn('wbPDFBookmarks3', '导出PDF(书签·3级)', export3);
  });
})();
