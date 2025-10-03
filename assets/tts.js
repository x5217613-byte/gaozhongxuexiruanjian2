
/* TTS Pro: tap-to-read + sentence/paragraph/article + word card + word stats export */
(function(){
  if (!('speechSynthesis' in window)) { console.warn('TTS not supported'); return; }
  const S = window.speechSynthesis;
  let VOICES = []; let currentUtter = null; let unlocked=false;
  const __ttsState = window.__ttsState || {
    currentElement:null, sentenceMode:false, autoplay:false, sentIdx:0, sentTotal:0,
    mode:'sentence' // sentence | paragraph | article
  };
  window.__ttsState = __ttsState;

  // ===== Utilities =====
  function loadVoices(){ VOICES = S.getVoices()||[]; }
  loadVoices(); window.addEventListener('voiceschanged', loadVoices);
  function preferEnglishVoices(){
    const v = VOICES.filter(v=>/en[-_](US|GB|AU|IN)|English/i.test(v.lang||v.name));
    v.sort((a,b)=> (/\bEnhanced\b/i.test(b.name||'') - /\bEnhanced\b/i.test(a.name||'')));
    return v.length ? v : VOICES;
  }
  function get(id, d=null){ return document.getElementById(id)||d; }
  function unlock(){ if (unlocked) return; try{ S.cancel(); }catch(e){} unlocked=true; }
  function updateButtons(isPlaying){
    const P=get('ttsPlay'), Pa=get('ttsPause'), St=get('ttsStop');
    if (P) P.disabled=isPlaying; if (Pa) Pa.disabled=!isPlaying; if (St) St.disabled=!isPlaying;
  }
  function wordsFrom(text){
    const out=[]; (text||'').toLowerCase().replace(/[^a-z'\- ]/g,' ').split(/\s+/).forEach(w=>{
      if (/^[a-z][a-z'\-]{0,31}$/.test(w)) out.push(w);
    }); return out;
  }

  // ===== Word stats (localStorage) =====
  const LS_KEY = 'engWordStats';
  const WordStats = {
    data: (function(){ try{ return JSON.parse(localStorage.getItem(LS_KEY)||'{}'); }catch(e){ return {}; }})(),
    bump(word, source){
      if (!word) return;
      const w = word.toLowerCase();
      const r = this.data[w] || {count:0, sources:{}};
      r.count += 1;
      if (source){ r.sources[source] = (r.sources[source]||0) + 1; }
      this.data[w] = r;
      this.save();
    },
    bumpBulk(text, source){
      wordsFrom(text).forEach(w=> this.bump(w, source));
    },
    save(){ try{ localStorage.setItem(LS_KEY, JSON.stringify(this.data)); }catch(e){} },
    clear(){ this.data = {}; this.save(); },
    toRows(gloss){
      const rows = [];
      Object.entries(this.data).sort((a,b)=> b[1].count - a[1].count).forEach(([w,rec])=>{
        const g = (gloss && gloss[w]) || {};
        const phon = g.phonetic||'';
        const def0 = (g.defs && g.defs[0]) || '';
        const ex0 = (g.examples && g.examples[0]) || '';
        rows.push({word:w, count:rec.count, phonetic:phon, definition:def0, example:ex0});
      });
      return rows;
    },
    downloadCSV(gloss){
      const rows = this.toRows(gloss);
      const head = 'word,count,phonetic,definition,example';
      const body = rows.map(r=> [r.word, r.count, `"${r.phonetic}"`, `"${r.definition.replace(/"/g,'""')}"`, `"${r.example.replace(/"/g,'""')}"`].join(',')).join('\n');
      const blob = new Blob([head+'\n'+body], {type:'text/csv'});
      const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download='word_stats.csv'; a.click(); URL.revokeObjectURL(url);
    },
    downloadTSVForAnki(gloss){
      const rows = this.toRows(gloss);
      // Front: word [phonetic]; Back: definition <br> example
      const body = rows.map(r=>{
        const front = `${r.word} ${r.phonetic?(' '+r.phonetic):''}`.trim();
        const back = [r.definition, r.example].filter(Boolean).join('<br>');
        return front + '\t' + back;
      }).join('\n');
      const blob = new Blob([body], {type:'text/tab-separated-values'});
      const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download='word_stats_anki.tsv'; a.click(); URL.revokeObjectURL(url);
    }
  };

  // ===== Glossary / Word card =====
  let GLOSSARY=null;
  async function loadGlossary(){
    if (GLOSSARY) return GLOSSARY;
    try{
      const res = await fetch('data/english_glossary.json'); GLOSSARY = await res.json();
    }catch(e){ GLOSSARY = {}; }
    return GLOSSARY;
  }
  function createWordCard(){
    if (get('wordCard')) return;
    const d = document.createElement('div'); d.id='wordCard'; d.style.display='none';
    d.innerHTML = `<div class="wc-head"><span id="wcWord">word</span><span id="wcPhonetic"></span>
      <button id="wcSpeak" title="发音">🔈</button></div>
    <div id="wcDefs"></div>
    <div id="wcExtra"></div>
    <div class="wc-actions"><button id="wcAdd">加入生词统计</button></div>`;
    document.body.appendChild(d);
    document.addEventListener('click', (e)=>{ if (!d.contains(e.target)) d.style.display='none'; });
    get('wcSpeak').addEventListener('click', ()=>{
      const w = get('wcWord').textContent || '';
      if (w) speakNow(w);
    });
    get('wcAdd').addEventListener('click', ()=>{
      const w = get('wcWord').textContent||''; if (w) { WordStats.bump(w, 'card'); alert('已加入词频统计：'+w); }
    });
  }
  function renderWordCard(word, entry){
    createWordCard();
    const W=get('wordCard'), w=get('wcWord'), ph=get('wcPhonetic'), df=get('wcDefs'), ex=get('wcExtra');
    w.textContent = word; ph.textContent = entry?.phonetic||'';
    df.innerHTML=''; (entry?.defs||['(未收录，稍后可补充词库)']).slice(0,4).forEach(s=>{ const p=document.createElement('p'); p.textContent='• '+s; df.appendChild(p); });
    const lines=[];
    if (entry?.examples?.length){ lines.push('例句：'+entry.examples[0]); }
    if (entry?.synonyms?.length){ lines.push('同义：'+entry.synonyms.slice(0,6).join(', ')); }
    if (entry?.antonyms?.length){ lines.push('反义：'+entry.antonyms.slice(0,6).join(', ')); }
    ex.innerHTML = lines.map(s=>`<p>${s}</p>`).join('');
  }
  async function showWordCard(x,y,word){
    const G = await loadGlossary();
    const entry = G[word] || G[word.replace(/'s$/,'')] || null;
    renderWordCard(word, entry);
    const d = get('wordCard'); d.style.left=(x+12)+'px'; d.style.top=(y+12)+'px'; d.style.display='block';
  }
  function getSelectionWord(){
    const sel=window.getSelection(); const t=(sel && sel.toString()||'').trim();
    if (!t) return null;
    if (!/^[A-Za-z][A-Za-z\-']{0,31}$/.test(t)) return null;
    return t.toLowerCase();
  }
  async function handleDblClick(ev){
    const w = getSelectionWord(); if (!w) return;
    WordStats.bump(w, 'dblclick');
    showWordCard(ev.clientX||0, ev.clientY||0, w);
  }
  document.addEventListener('dblclick', handleDblClick);

  // ===== TTS core =====
  function makeUtter(text){
    const u=new SpeechSynthesisUtterance(text);
    const voices=preferEnglishVoices();
    const voiceId=get('ttsVoice')?.value||'';
    const v = voices.find(x=>x.name===voiceId)||voices[0];
    if (v) { u.voice=v; u.lang=v.lang; } else { u.lang='en-US'; }
    u.rate = Math.max(0.5, Math.min(2.0, parseFloat(get('ttsRate')?.value||'1.0')));
    u.pitch= Math.max(0, Math.min(2.0, parseFloat(get('ttsPitch')?.value||'1.0')));
    u.volume=Math.max(0, Math.min(1.0, parseFloat(get('ttsVolume')?.value||'1.0')));

    u.onboundary=(e)=>{
      // boundary highlighting handled in sentence mode by ranges; for general, skip
    };
    u.onend=()=>{
      currentUtter=null; clearHighlight();
      if (__ttsState.mode==='sentence' && __ttsState.autoplay){ nextSentence(true); return; }
      if (__ttsState.mode==='article' && __ttsState.autoplay){ nextParagraph(true); return; }
      updateButtons(false);
    };
    u.onerror=()=>{ currentUtter=null; clearHighlight(); updateButtons(false); };
    return u;
  }
  function speakNow(text, el){
    if (!text) return;
    unlock();
    if (currentUtter){ try{S.cancel();}catch(e){} currentUtter=null; }
    __ttsState.currentElement = el||__ttsState.currentElement||null;
    WordStats.bumpBulk(text, 'speak');
    const u=makeUtter(text); currentUtter=u; updateButtons(true); S.speak(u);
  }
  function clearHighlight(){
    const el = __ttsState.currentElement;
    if (!el) return;
    const bak = el.getAttribute('data-tts-html-backup');
    if (bak!=null){ el.innerHTML = bak; el.removeAttribute('data-tts-html-backup'); }
  }
  function highlightSentence(el, idx){
    const text = (el.innerText||'');
    const ranges = sentenceRanges(el)||[]; const r = ranges[idx]; if (!r) return;
    const [s,e] = r; const pre=text.slice(0,s), mid=text.slice(s,e), post=text.slice(e);
    el.setAttribute('data-tts-html-backup', el.innerHTML);
    el.innerHTML=''; const preN=document.createTextNode(pre); const mark=document.createElement('mark');
    mark.setAttribute('data-tts-mark','1'); mark.textContent=mid; const postN=document.createTextNode(post);
    el.appendChild(preN); el.appendChild(mark); el.appendChild(postN);
  }

  // Sentence splitting
  const SENT_CACHE = new WeakMap();
  function splitSentences(str){
    const re = /[^.!?]+[.!?]["')\]]*\s*/g; const out=[]; let m;
    while((m=re.exec(str))){ out.push(m[0]); }
    if (!out.length) out.push(str);
    return out;
  }
  function sentenceRanges(el){
    if (!el) return null; if (SENT_CACHE.has(el)) return SENT_CACHE.get(el);
    const text = (el.innerText||'').trim(); const ss = splitSentences(text);
    const ranges=[]; let pos=0; ss.forEach(s=>{ const start=pos; const end=pos+s.length; ranges.push([start,end]); pos=end; });
    SENT_CACHE.set(el, ranges); return ranges;
  }
  function currentSentenceText(el){
    const rs = sentenceRanges(el)||[]; const r = rs[__ttsState.sentIdx]; if(!r) return '';
    return (el.innerText||'').slice(r[0], r[1]);
  }
  function updateSentIdx(el){
    const rs = sentenceRanges(el)||[];
    __ttsState.sentTotal=rs.length;
    get('sentIdx') && (get('sentIdx').textContent = `${Math.min(__ttsState.sentIdx+1, rs.length)} / ${rs.length}`);
  }
  function playCurrentSentence(){
    if (!__ttsState.currentElement){ alert('请先点段落前的小喇叭'); return; }
    updateSentIdx(__ttsState.currentElement);
    highlightSentence(__ttsState.currentElement, __ttsState.sentIdx);
    speakNow(currentSentenceText(__ttsState.currentElement), __ttsState.currentElement);
  }
  function nextSentence(autoTriggered){
    if (!__ttsState.currentElement) return;
    const rs = sentenceRanges(__ttsState.currentElement)||[];
    if (__ttsState.sentIdx < rs.length-1){
      __ttsState.sentIdx += 1; playCurrentSentence();
    }else{
      nextParagraph(autoTriggered);
    }
  }

  // Paragraph/article flow
  function annotatedList(){
    return Array.from(document.querySelectorAll('.tts-annotated'));
  }
  function nextParagraph(autoTriggered){
    const list = annotatedList(); const curr = __ttsState.currentElement;
    const idx = list.indexOf(curr);
    if (idx>=0 && idx<list.length-1){
      __ttsState.currentElement = list[idx+1]; __ttsState.sentIdx = 0;
      if (__ttsState.mode==='article' && (__ttsState.autoplay || autoTriggered)){
        if (get('sentMode')?.checked){
          __ttsState.mode='sentence'; __ttsState.autoplay=true; playCurrentSentence();
        }else{
          speakNow((__ttsState.currentElement.innerText||'').trim(), __ttsState.currentElement);
        }
      }
    } else {
      updateButtons(false);
    }
  }

  // ===== UI: Panel, Sentence bar, Mode selector, Stats modal =====
  function buildPanel(){
    if (get('ttsPanel')) return;
    const panel=document.createElement('div'); panel.id='ttsPanel';
    panel.innerHTML = `
      <div class="tts-header">🔊 英语点读</div>
      <div class="tts-row"><label>Voice</label><select id="ttsVoice"></select></div>
      <div class="tts-row"><label>Rate</label><input type="range" id="ttsRate" min="0.6" max="1.4" step="0.05" value="1.0"></div>
      <div class="tts-row"><label>Pitch</label><input type="range" id="ttsPitch" min="0.8" max="1.4" step="0.05" value="1.0"></div>
      <div class="tts-row"><label>Volume</label><input type="range" id="ttsVolume" min="0" max="1" step="0.05" value="1.0"></div>
      <div class="tts-row"><label>Mode</label>
        <select id="ttsMode">
          <option value="sentence">逐句</option>
          <option value="paragraph">逐段</option>
          <option value="article">全文</option>
        </select>
      </div>
      <div class="tts-actions">
        <button id="ttsPlay" title="读选中">播放选中</button>
        <button id="ttsPause" disabled>暂停</button>
        <button id="ttsResume">继续</button>
        <button id="ttsStop" disabled>停止</button>
      </div>
      <div class="tts-actions">
        <button id="ttsStats">📊 词频/导出</button>
      </div>
      <div class="tts-note">双击英文单词可查看词卡；“Mode”可切换 逐句/逐段/全文；支持自动连读（右上角）。</div>
    `;
    document.body.appendChild(panel);
    // voices
    function refreshVoices(){
      const sel=get('ttsVoice'); if(!sel) return;
      const voices=preferEnglishVoices(); sel.innerHTML='';
      voices.forEach(v=>{ const opt=document.createElement('option'); opt.value=v.name; opt.textContent=`${v.name} (${v.lang})`; sel.appendChild(opt); });
    }
    refreshVoices(); window.addEventListener('voiceschanged', refreshVoices);

    get('ttsPlay')?.addEventListener('click', ()=>{
      const sel=window.getSelection(); const t=sel && sel.toString();
      if (t && t.trim()){
        __ttsState.mode = get('ttsMode')?.value || 'sentence';
        __ttsState.sentenceMode = (__ttsState.mode==='sentence');
        speakNow(t, sel.anchorNode && sel.anchorNode.parentElement);
      }else{
        alert('请先选中要朗读的英文文本。');
      }
    });
    get('ttsPause')?.addEventListener('click', ()=>{ try{S.pause();}catch(e){} });
    get('ttsResume')?.addEventListener('click', ()=>{ try{S.resume();}catch(e){} });
    get('ttsStop')?.addEventListener('click', ()=>{ try{S.cancel();}catch(e){} clearHighlight(); updateButtons(false); currentUtter=null; });

    // Stats
    get('ttsStats')?.addEventListener('click', async ()=>{
      const G = await loadGlossary();
      showStatsModal(G);
    });

    // draggable
    (function makeDraggable(box, handle){
      let sx=0,sy=0,ox=0,oy=0,drag=false;
      const down=(e)=>{ drag=true; sx=e.clientX||e.touches?.[0]?.clientX; sy=e.clientY||e.touches?.[0]?.clientY; ox=box.offsetLeft; oy=box.offsetTop; e.preventDefault(); };
      const move=(e)=>{ if(!drag)return; const cx=e.clientX||e.touches?.[0]?.clientX; const cy=e.clientY||e.touches?.[0]?.clientY; box.style.left=(ox+(cx-sx))+'px'; box.style.top=(oy+(cy-sy))+'px'; };
      const up=()=>{ drag=false; };
      handle.addEventListener('mousedown', down); handle.addEventListener('touchstart', down);
      window.addEventListener('mousemove', move); window.addEventListener('touchmove', move);
      window.addEventListener('mouseup', up); window.addEventListener('touchend', up);
    })(panel, panel.querySelector('.tts-header'));
  }

  function showSentBar(){
    if (get('ttsSentenceBar')) return;
    const b = document.createElement('div'); b.id='ttsSentenceBar';
    b.innerHTML = `
      <label><input type="checkbox" id="sentMode"> 逐句</label>
      <label><input type="checkbox" id="sentAuto"> 自动连读</label>
      <span id="sentIdx">0 / 0</span>
      <button id="sentPrev">上一句</button>
      <button id="sentPlay">▶</button>
      <button id="sentNext">下一句</button>
    `;
    document.body.appendChild(b);
    get('sentPrev').addEventListener('click', ()=>{ __ttsState.mode='sentence'; prevSentence(); });
    get('sentNext').addEventListener('click', ()=>{ __ttsState.mode='sentence'; nextSentence(false); });
    get('sentPlay').addEventListener('click', ()=>{ __ttsState.mode='sentence'; playCurrentSentence(); });
    get('sentMode').addEventListener('change', (e)=>{ __ttsState.sentenceMode=e.target.checked; __ttsState.mode = e.target.checked ? 'sentence':'paragraph'; });
    get('sentAuto').addEventListener('change', (e)=>{ __ttsState.autoplay=e.target.checked; });
  }

  // Annotate paragraphs with 🔈 and wire up mode-aware click
  function annotate(container){
    if (!container) return;
    const nodes = container.querySelectorAll('p, li, .stem, .option, .content, .passage, .question, .card pre, .card p');
    nodes.forEach(node=>{
      const text=(node.innerText||'').trim();
      if (!text || !/[A-Za-z]/.test(text)) return;
      if (node.classList.contains('tts-annotated')) return;
      node.classList.add('tts-annotated');
      const btn=document.createElement('button');
      btn.className='tts-icon'; btn.type='button'; btn.title='朗读此段'; btn.textContent='🔈';
      btn.addEventListener('click', ()=>{
        __ttsState.currentElement=node; __ttsState.sentIdx=0;
        const mode = (get('ttsMode')?.value) || (__ttsState.sentenceMode ? 'sentence' : 'paragraph');
        __ttsState.mode = mode;
        if (mode==='sentence'){ updateSentIdx(node); playCurrentSentence(); }
        else if (mode==='paragraph'){ speakNow(text, node); }
        else { // article
          __ttsState.autoplay = true;
          // start from this node, read all subsequent annotated nodes
          speakNow(text, node);
          __ttsState.mode='article';
        }
      });
      node.insertBefore(btn, node.firstChild);
    });
  }

  function observe(){
    const ids=['practiceContainer','materialsContainer','essaysContainer','plansContainer'];
    ids.forEach(id=> annotate(document.getElementById(id)));
    const mo=new MutationObserver(muts=>{
      muts.forEach(m=>{ m.addedNodes && m.addedNodes.forEach(n=>{ if(n.nodeType===1) annotate(n); }); });
    });
    mo.observe(document.body,{childList:true,subtree:true});
  }

  // ===== Stats modal =====
  function showStatsModal(gloss){
    let m = get('statsModal');
    if (!m){
      m = document.createElement('div'); m.id='statsModal';
      m.innerHTML = `
        <div class="stats-inner">
          <div class="stats-head">📊 生词统计
            <button id="statsClose">✖</button>
          </div>
          <div class="stats-actions">
            <button id="statsExportCSV">导出 CSV</button>
            <button id="statsExportTSV">导出 TSV (Anki)</button>
            <button id="statsClear">清空统计</button>
          </div>
          <div id="statsTable" class="stats-table"></div>
        </div>`;
      document.body.appendChild(m);
      get('statsClose').addEventListener('click', ()=> m.style.display='none');
      get('statsExportCSV').addEventListener('click', ()=> WordStats.downloadCSV(gloss));
      get('statsExportTSV').addEventListener('click', ()=> WordStats.downloadTSVForAnki(gloss));
      get('statsClear').addEventListener('click', ()=>{ if(confirm('确定清空？')){ WordStats.clear(); renderStatsTable(gloss); } });
    }
    renderStatsTable(gloss);
    m.style.display='block';
  }
  function renderStatsTable(gloss){
    const rows = WordStats.toRows(gloss);
    const box = get('statsTable'); if (!box) return;
    if (!rows.length){ box.innerHTML = '<p>暂无数据。你可以双击取词、朗读选中或逐句播放来积累词频。</p>'; return; }
    const head = '<div class="tr th"><span>词</span><span>次数</span><span>音标</span><span>释义</span></div>';
    const body = rows.slice(0,300).map(r=> `<div class="tr"><span>${r.word}</span><span>${r.count}</span><span>${r.phonetic||''}</span><span>${(r.definition||'').replace(/</g,'&lt;')}</span></div>`).join('');
    box.innerHTML = head + body + (rows.length>300? `<div class="tr"><em>... 仅显示前 300 条，导出可查看全部</em></div>`:'');
  }

  // ===== Boot =====
  window.addEventListener('DOMContentLoaded', ()=>{
    buildPanel();
    showSentBar();
    observe();
  });
})();


// Expose speakNow for other modules
window.ttsSpeakNow = (window.ttsSpeakNow || (function(txt, el){ try { return (typeof speakNow==='function') ? speakNow(txt, el) : null; } catch(e){} }));
