
/* wrongbook_print.js
 * 为错题本提供：打印样式、导出PDF(调用 window.print)、周/标签汇总视图
 */
(function(){
  function ensurePrintCSS(){
    if (document.getElementById('wbPrintStyles')) return;
    const css = document.createElement('style'); css.id='wbPrintStyles';
    css.textContent = `
      @media print {
        body * { visibility: hidden; }
        #wrongbookPrintView, #wrongbookPrintView * { visibility: visible; }
        #wrongbookPrintView { position: absolute; left: 0; top: 0; width: 100%; }
        .pv-title{ font-size:18px; font-weight:700; margin:10px 0; }
        .pv-day{ margin: 8px 0; }
        .pv-item{ border-bottom: 1px dashed #ccc; padding: 6px 0; }
        .pv-meta{ font-size:12px; color:#555; }
        .pv-note{ font-size:12px; color:#222; margin-top:4px; white-space: pre-wrap; }
      }
      #wbPrintToolbar{ position:fixed; right:16px; bottom:16px; z-index:9999; display:flex; gap:8px; }
      #wbPrintToolbar button{ padding:8px 12px; border:1px solid #ddd; background:#fff; border-radius:999px; box-shadow:0 6px 16px rgba(0,0,0,.12); }
      #wrongbookPrintView{ display:none; background:#fff; padding:12px 16px; }
    `;
    document.head.appendChild(css);
  }
  function loadWrongItems(){ try{ return JSON.parse(localStorage.getItem('review_items')||'{}'); }catch(e){ return {}; } }
  function loadNotes(){ try{ return JSON.parse(localStorage.getItem('mistake_notebook')||'{}'); }catch(e){ return {}; } }
  function buildView(mode){
    const itemsByDay = loadWrongItems();
    const notes = loadNotes();
    const view = document.getElementById('wrongbookPrintView') || (function(){ const d=document.createElement('div'); d.id='wrongbookPrintView'; document.body.appendChild(d); return d; })();
    let html = `<div class="pv-title">错题本打印视图（${new Date().toLocaleDateString()}）</div>`;
    const days = Object.keys(itemsByDay).sort();
    days.forEach(d=>{
      html += `<div class="pv-day"><b>${d}</b>`;
      (itemsByDay[d]||[]).forEach(it=>{
        const sig = (it.subject||'english')+'|'+(it.subtype||'')+'|'+(it.id||'')+'|'+(it.file||'');
        const rec = notes[sig] || {reasons:[], note:''};
        html += `<div class="pv-item">
          <div class="pv-meta">[${it.subject||''}/${it.subtype||''}] ${it.file||''} #${it.id||''}</div>
          <div>${it.title||'(无标题)'} <small>${(it.snippet||'').replace(/</g,'&lt;')}</small></div>
          <div class="pv-note"><b>错因：</b>${(rec.reasons||[]).join('，') || '—'}<br><b>笔记：</b>${rec.note||'—'}</div>
        </div>`;
      });
      html += `</div>`;
    });
    view.innerHTML = html;
    view.style.display = 'block';
  }
  function ensureToolbar(){
    if (document.getElementById('wbPrintToolbar')) return;
    const bar = document.createElement('div'); bar.id='wbPrintToolbar';
    bar.innerHTML = `<button id="btnWBPreview">打印预览</button><button id="btnWBPDF">导出PDF</button>`;
    document.body.appendChild(bar);
    document.getElementById('btnWBPreview').onclick = ()=>{ ensurePrintCSS(); buildView('preview'); window.scrollTo(0,0); };
    document.getElementById('btnWBPDF').onclick = ()=>{ ensurePrintCSS(); buildView('pdf'); setTimeout(()=> window.print(), 100); };
  }
  function boot(){ ensurePrintCSS(); ensureToolbar(); }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
