
/* handwrite_bind_auto.js — auto wire HandwritePro.open context from question DOM */
(function(){
  function ready(fn){ if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }

  function getQuestions(){
    // Heuristic selectors — extend as needed
    const sels = ['.question', '.q-item', '.exercise-item', '.paper-question', '.exam-question', 'article.question', 'section.question'];
    let list = [];
    sels.forEach(s=> document.querySelectorAll(s).forEach(el=> list.push(el)));
    // fallback: cards with data-* attributes
    if (list.length===0){
      document.querySelectorAll('[data-subject],[data-file],[data-id],[data-qid]').forEach(el=> list.push(el));
    }
    // ensure unique
    return Array.from(new Set(list)).filter(el=> el.offsetWidth>0 && el.offsetHeight>0);
  }

  function ctxFrom(el){
    if (!el) return null;
    const d = el.dataset || {};
    const subject = d.subject || guessSubject(el);
    const file = d.file || d.set || guessFile(el);
    const id = d.id || d.qid || guessId(el);
    const index = d.index ? parseInt(d.index, 10) : guessIndex(el);
    return {subject, file, id, index};
  }

  function guessSubject(el){
    // climb to find subject hint
    let n=el;
    while (n && n!==document.body){
      if (n.dataset && n.dataset.subject) return n.dataset.subject;
      n = n.parentElement;
    }
    // scan text for subjects
    const t = (el.textContent||'').toLowerCase();
    if (t.includes('英语')||t.includes('english')) return 'english';
    if (t.includes('数学')||t.includes('math')) return 'math';
    if (t.includes('物理')||t.includes('physics')) return 'physics';
    if (t.includes('化学')||t.includes('chem')) return 'chemistry';
    if (t.includes('历史')||t.includes('history')) return 'history';
    if (t.includes('政治')||t.includes('思想政治')||t.includes('civics')) return 'politics';
    if (t.includes('语文')||t.includes('chinese')) return 'chinese';
    return 'english';
  }
  function guessFile(el){
    const attr = el.getAttribute('data-file') || el.getAttribute('data-set');
    if (attr) return attr;
    const id = el.id||'';
    if (id) return id.replace(/^\s+|\s+$/g,'').slice(0,64);
    // fallback to page path
    return location.pathname.split('/').pop() || 'practice.json';
  }
  function guessId(el){
    const id = el.getAttribute('data-id') || el.getAttribute('data-qid') || el.id;
    if (id) return id;
    // search inner text patterns like "#12" or "ID: M-A-03-17"
    const txt = el.textContent||'';
    const m = txt.match(/#\s*([A-Za-z0-9\-_.]+)/) || txt.match(/ID[:：]\s*([A-Za-z0-9\-_.]+)/);
    if (m) return m[1];
    // fallback to nth
    const idx = Array.from(el.parentElement ? el.parentElement.children : [el]).indexOf(el);
    return 'Q'+(idx>=0? idx+1 : 1);
  }
  function guessIndex(el){
    const idx = parseInt(el.getAttribute('data-index')||'', 10);
    if (!isNaN(idx)) return idx;
    // count previous siblings of same class
    let n=el, i=0;
    while (n && n.previousElementSibling){
      n = n.previousElementSibling; i++;
    }
    return i;
  }

  function visibleArea(el){
    const r = el.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight;
    const x0 = Math.max(0, r.left), y0 = Math.max(0, r.top);
    const x1 = Math.min(vw, r.right), y1 = Math.min(vh, r.bottom);
    const w = Math.max(0, x1 - x0), h = Math.max(0, y1 - y0);
    return w*h;
  }

  function pickMostVisible(){
    const qs = getQuestions();
    if (!qs.length) return null;
    let best = qs[0], ba=visibleArea(best);
    for (let i=1;i<qs.length;i++){
      const a = visibleArea(qs[i]);
      if (a > ba){ best = qs[i]; ba = a; }
    }
    return best;
  }

  function ensurePerQuestionButtons(){
    const qs = getQuestions();
    qs.forEach((q,idx)=>{
      if (!q.classList.contains('hw-q-wrap')) q.classList.add('hw-q-wrap');
      if (q.querySelector('.hw-q-btn')) return;
      const b = document.createElement('button');
      b.className = 'hw-q-btn'; b.textContent = '✍️本题手写';
      b.addEventListener('click', (e)=>{
        e.preventDefault(); e.stopPropagation();
        ensurePro(()=>{
          const ctx = ctxFrom(q) || {subject:'english',file:location.pathname,id:'Q'+(idx+1),index:idx};
          window.HandwritePro.open(ctx);
        });
      });
      q.appendChild(b);
    });
  }

  function ensurePro(cb){
    if (window.HandwritePro && typeof window.HandwritePro.open==='function') return cb();
    const timer = setInterval(()=>{
      if (window.HandwritePro && typeof window.HandwritePro.open==='function'){ clearInterval(timer); cb(); }
    }, 120);
    setTimeout(()=> clearInterval(timer), 8000);
  }

  function bindGlobalButton(){
    const btn = document.getElementById('openHWPro');
    if (!btn) return;
    const old = btn.onclick;
    btn.onclick = function(){
      const q = pickMostVisible();
      if (q){
        const ctx = ctxFrom(q) || {subject:'english', file:location.pathname, id:'Q', index:0};
        ensurePro(()=> window.HandwritePro.open(ctx));
      }else{
        ensurePro(()=> window.HandwritePro.open({subject:'english'}));
      }
      if (typeof old === 'function'){ try{ old.apply(this, arguments); }catch(e){} }
    };
  }

  function boot(){
    // inject CSS
    if (!document.querySelector('link[href$="handwrite_bind_auto.css"]')){
      const link=document.createElement('link'); link.rel='stylesheet'; link.href='assets/handwrite_bind_auto.css'; document.head.appendChild(link);
    }
    ensurePerQuestionButtons();
    bindGlobalButton();
    // observe DOM changes to attach buttons for dynamically loaded questions
    const mo = new MutationObserver(()=> ensurePerQuestionButtons());
    mo.observe(document.body, {childList:true, subtree:true});
  }

  ready(boot);
})();
