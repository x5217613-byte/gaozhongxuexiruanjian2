
/* wrongbook_print_plus.js — augment wrongbook print to embed latest handwriting snapshot (hwpro_v1) */
(function(){
  function loadWrong(){ try{ return JSON.parse(localStorage.getItem('review_items')||'{}'); }catch(e){ return {}; } }
  function loadInkPro(){ try{ return JSON.parse(localStorage.getItem('hwpro_v1')||'{}'); }catch(e){ return {}; } }
  function keyFor(it){
    const subj = (it.subject||'english'); const file=it.file||''; const id=it.id||'';
    // prefer 4-field key if index exists in id pattern like "...-Q12" or if future stored index is known elsewhere
    return [
      `${subj}|${file}|${id}`,
      `${subj}|${file}|`
    ];
  }
  function latestSnapFor(klist, store){
    for (const k of klist){
      if (store[k] && store[k].snaps && store[k].snaps.length){ return store[k].snaps[0].png; }
    }
    // try fuzzy match by prefix
    const prefix = klist[0];
    const keys = Object.keys(store).filter(x=> x.startsWith(prefix));
    keys.sort((a,b)=> ((store[b].meta?.ts||0) - (store[a].meta?.ts||0)));
    for (const k of keys){
      const s = store[k].snaps; if (s && s.length) return s[0].png;
    }
    return null;
  }
  function inject(){
    const store = loadInkPro(); if (!store) return;
    const wrong = loadWrong();
    const panel = document.getElementById('wrongbookPrintView'); if (!panel) return;
    // Append snapshots under each pv-item that matches
    panel.querySelectorAll('.pv-item').forEach(box=>{
      const meta = box.querySelector('.pv-meta'); if (!meta) return;
      const text = meta.textContent || '';
      // parse [subject/subtype] file #id
      const m = text.match(/\[([^\]]+)\]\s+([^\s#]+)\s+#([^\s]+)/);
      if (!m) return;
      const subject = m[1].split('/')[0] || 'english';
      const file = m[2] || '';
      const id   = m[3] || '';
      const snap = latestSnapFor([`${subject}|${file}|${id}`], store);
      if (snap){
        const img = document.createElement('img'); img.src = snap; img.style.maxWidth='100%'; img.style.border='1px solid #eee'; img.style.borderRadius='6px'; img.style.margin='6px 0';
        box.insertBefore(img, box.querySelector('.pv-note'));
      }
    });
  }
  // if print view exists already
  const mo = new MutationObserver(()=> inject());
  mo.observe(document.documentElement, {childList:true, subtree:true});
})(); 
