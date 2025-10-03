
/* Daily Vocab Practice (生词打卡)
 * - Floating "生词打卡" button opens an overlay
 * - Builds a daily deck from WordStats + Glossary
 * - Question types: listen-typing, definition->word MCQ, word->definition MCQ
 * - Mastery scheduling (simplified SM-2): EF/interval/reps/next_due
 * - Exports session summary JSON
*/
(function(){
  const STATS_KEY = 'engWordStats';
  const MASTERY_KEY = 'vocabMastery';
  const DAY_SIZE_DEFAULT = 18;

  function loadStats(){
    try{ return JSON.parse(localStorage.getItem(STATS_KEY)||'{}'); }catch(e){ return {}; }
  }
  function loadMastery(){
    try{ return JSON.parse(localStorage.getItem(MASTERY_KEY)||'{}'); }catch(e){ return {}; }
  }
  function saveMastery(m){ try{ localStorage.setItem(MASTERY_KEY, JSON.stringify(m)); }catch(e){} }
  async function loadGlossary(){
    try{ const res = await fetch('data/english_glossary.json'); return await res.json(); } catch(e){ return {}; }
  }
  function todayISO(){ const d=new Date(); d.setHours(0,0,0,0); return d.toISOString().slice(0,10); }
  function addDays(date, days){ const d=new Date(date); d.setDate(d.getDate()+days); d.setHours(0,0,0,0); return d; }

  function pickN(arr, n){
    const a = arr.slice(); const out=[];
    while(a.length && out.length<n){
      const i = Math.floor(Math.random()*a.length);
      out.push(a[i]); a.splice(i,1);
    }
    return out;
  }

  // Build daily deck: due items first, then highest-frequency new words
  function buildDailyDeck(stats, mastery, gloss, size){
    const today = new Date(); today.setHours(0,0,0,0);
    const entries = Object.entries(stats).map(([w,rec])=>({word:w, count:rec.count}));
    entries.sort((a,b)=> b.count - a.count);
    // split by mastery
    const due = []; const fresh = [];
    for (const {word,count} of entries){
      const m = mastery[word];
      if (m && m.due){
        const dueDate = new Date(m.due);
        if (dueDate <= today) due.push({word,count});
      } else {
        fresh.push({word,count});
      }
    }
    const deck = [];
    deck.push(...due.slice(0, size));
    if (deck.length<size){
      const left = size - deck.length;
      deck.push(...fresh.slice(0, left));
    }
    // Map to cards with glossary data
    return deck.map(({word})=> ({
      word,
      entry: gloss[word] || null
    }));
  }

  // Mastery scheduling (SM-2 simplification)
  function updateMastery(mastery, word, isCorrect){
    const m = mastery[word] || { ef:2.5, reps:0, interval:0, due:new Date() };
    if (isCorrect){
      const q = 5; // perfect
      m.ef = Math.max(1.3, m.ef + (0.1 - (5-q)*(0.08 + (5-q)*0.02))); // with q=5 this is +0.1
      if (m.reps===0){ m.interval = 1; }
      else if (m.reps===1){ m.interval = 3; }
      else { m.interval = Math.round(m.interval * m.ef); }
      m.reps += 1;
    }else{
      const q = 2; // fail
      m.ef = Math.max(1.3, m.ef + (0.1 - (5-q)*(0.08 + (5-q)*0.02)));
      m.reps = 0;
      m.interval = 1;
    }
    const next = new Date(); next.setHours(0,0,0,0); next.setDate(next.getDate() + Math.max(1, m.interval));
    m.due = next.toISOString().slice(0,10);
    mastery[word] = m;
    saveMastery(mastery);
    return m;
  }

  // UI scaffolding
  function injectOverlay(){
    if (document.getElementById('vocabOverlay')) return;
    const btn = document.createElement('button'); btn.id='openVocab'; btn.textContent='生词打卡';
    document.body.appendChild(btn);
    const overlay = document.createElement('div'); overlay.id='vocabOverlay'; overlay.style.display='none';
    overlay.innerHTML = `
      <div class="voc-inner">
        <div class="voc-head">
          <div>📘 生词打卡</div>
          <div class="voc-actions">
            <label>每日题量 <input type="number" id="vocSize" min="8" max="40" step="1" value="${DAY_SIZE_DEFAULT}"></label>
            <label>模式
              <select id="vocMode">
                <option value="mix">综合</option>
                <option value="listen">听写</option>
                <option value="def2word">释义→选词</option>
                <option value="word2def">单词→释义</option>
              </select>
            </label>
            <button id="vocStart">开始</button>
            <button id="vocClose">关闭</button>
          </div>
        </div>
        <div class="voc-body">
          <div id="vocMeta"></div>
          <div id="vocStage" class="card"></div>
          <div id="vocControls" class="voc-ctrls">
            <button id="vocShow">显示答案</button>
            <button id="vocCorrect">我对了</button>
            <button id="vocWrong">我错了</button>
            <button id="vocSpeak">🔈 发音</button>
            <button id="vocNext">下一题</button>
          </div>
          <div id="vocSummary" class="voc-summary"></div>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    btn.addEventListener('click', ()=> overlay.style.display='block');
    overlay.querySelector('#vocClose').addEventListener('click', ()=> overlay.style.display='none');
  }

  function ensureStyles(){
    if (document.getElementById('vocStyles')) return;
    const css = document.createElement('style'); css.id='vocStyles';
    css.textContent = `
      #openVocab{ position:fixed; left:16px; bottom:16px; z-index:9999; padding:10px 14px; border-radius:999px; border:1px solid #ddd; background:#fff; box-shadow:0 6px 16px rgba(0,0,0,.12); }
      #vocabOverlay{ position:fixed; inset:0; background:rgba(0,0,0,.35); z-index:10000; display:none; }
      #vocabOverlay .voc-inner{ position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); width: min(920px, calc(100% - 40px)); max-height: 86vh; overflow:auto; background:#fff; border-radius:12px; box-shadow:0 12px 28px rgba(0,0,0,.24); }
      .voc-head{ display:flex; justify-content:space-between; align-items:center; padding:12px 14px; border-bottom:1px solid #eee; font-weight:700; }
      .voc-head .voc-actions{ display:flex; gap:10px; align-items:center; font-weight:400; }
      .voc-body{ padding:14px; }
      .voc-ctrls{ display:flex; gap:8px; margin-top:8px; }
      .voc-summary{ margin-top:12px; border-top:1px dashed #eee; padding-top:10px; font-size:14px; }
      .voc-q{ font-size:18px; margin:8px 0 12px; }
      .voc-mcq{ display:grid; grid-template-columns:1fr; gap:8px; }
      .voc-mcq button{ text-align:left; padding:8px 10px; border:1px solid #ddd; border-radius:8px; background:#fff; }
      .voc-mcq button.correct{ background:#e8f9e8; border-color:#b7e4b7; }
      .voc-mcq button.wrong{ background:#feecec; border-color:#f5bcbc; }
      .voc-input{ display:flex; gap:8px; align-items:center; }
      .voc-input input{ flex:1; padding:8px; border:1px solid #ddd; border-radius:8px; }
      .badge{ display:inline-block; padding:2px 6px; border:1px solid #ddd; border-radius:999px; font-size:12px; margin-left:6px; background:#fafafa; }
    `;
    document.head.appendChild(css);
  }

  // Build question objects
  function mcqDefToWord(card, pool){
    const entry = card.entry || {};
    const correct = card.word;
    const def = (entry.defs && entry.defs[0]) || '(暂无释义，凭直觉选择)';
    const distractors = pool.filter(w=>w!==correct).slice(0,20);
    const options = shuffle([correct, ...pickN(distractors, 3)]);
    return { type:'def2word', prompt: def, options, answer: correct };
  }
  function mcqWordToDef(card, pool, gloss){
    const word = card.word;
    const correct = ((gloss[word]||{}).defs||['(暂无)'])[0];
    // pick other definitions from other words
    const others = pool.filter(w=>w!==word).slice(0,200).map(w=> ((gloss[w]||{}).defs||[''])[0] ).filter(Boolean);
    const options = shuffle([correct, ...pickN(others, 3)]);
    return { type:'word2def', prompt: word, options, answer: correct };
  }
  function listenTyping(card){
    const word = card.word;
    return { type:'listen', prompt: '请根据发音输入单词：', answer: word };
  }
  function shuffle(arr){ const a=arr.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }

  function buildQuestions(deck, mode, gloss){
    const poolWords = deck.map(c=>c.word);
    const qs = [];
    deck.forEach(card=>{
      if (mode==='listen') qs.push(listenTyping(card));
      else if (mode==='def2word') qs.push(mcqDefToWord(card, poolWords));
      else if (mode==='word2def') qs.push(mcqWordToDef(card, poolWords, gloss));
      else {
        // mix: 2/5 mcq-word2def, 2/5 def2word, 1/5 listen
        const r = Math.random();
        if (r<0.2) qs.push(listenTyping(card));
        else if (r<0.6) qs.push(mcqDefToWord(card, poolWords));
        else qs.push(mcqWordToDef(card, poolWords, gloss));
      }
    });
    return qs;
  }

  // Session controller
  const Session = {
    init(size, mode, stats, mastery, gloss){
      this.size=size; this.mode=mode; this.stats=stats; this.mastery=mastery; this.gloss=gloss;
      this.deck = buildDailyDeck(stats, mastery, gloss, size);
      this.questions = buildQuestions(this.deck, mode, gloss);
      this.i=0; this.correct=0; this.wrong=0; this.startedAt = Date.now(); this.wrongList=[]; this.correctList=[];
      this.renderMeta();
      this.renderCurrent();
    },
    current(){ return this.questions[this.i]; },
    renderMeta(){
      const dueCnt = Object.values(this.mastery).filter(m=> new Date(m.due) <= new Date()).length;
      const meta = document.getElementById('vocMeta');
      meta.innerHTML = `今日 ${todayISO()} · 计划 <b>${this.size}</b> 题 <span class="badge">到期：${dueCnt}</span> <span class="badge">词库：${Object.keys(this.stats).length}</span>`;
    },
    renderCurrent(){
      const q = this.current(); const box = document.getElementById('vocStage');
      if (!q){ this.finish(); return; }
      let html = '';
      if (q.type==='listen'){
        html += `<div class="voc-q">${q.prompt} <button id="playListen">🔈 播放</button></div>`;
        html += `<div class="voc-input"><input id="listenInput" placeholder="在此输入..."><button id="listenCheck">检查</button></div>`;
        html += `<div id="listenAnswer" style="display:none;">答案：<b>${q.answer}</b></div>`;
      } else if (q.type==='def2word'){
        html += `<div class="voc-q">根据释义选择单词：</div><div class="card"><p>${q.prompt}</p></div>`;
        html += `<div class="voc-mcq">` + q.options.map((opt,i)=>`<button class="opt" data-i="${i}">${opt}</button>`).join('') + `</div>`;
      } else if (q.type==='word2def'){
        html += `<div class="voc-q">为单词选择正确释义：<b>${q.prompt}</b></div>`;
        html += `<div class="voc-mcq">` + q.options.map((opt,i)=>`<button class="opt" data-i="${i}">${opt}</button>`).join('') + `</div>`;
      }
      box.innerHTML = html;
      // wire events
      if (q.type==='listen'){
        document.getElementById('playListen').addEventListener('click', ()=> window.ttsSpeakNow && window.ttsSpeakNow(q.answer));
        document.getElementById('listenCheck').addEventListener('click', ()=>{
          const val = (document.getElementById('listenInput').value||'').trim().toLowerCase();
          const ok = val === q.answer.toLowerCase();
          document.getElementById('listenAnswer').style.display = 'block';
          this.updateMasteryAndScore(q, ok);
        });
      } else {
        document.querySelectorAll('.opt').forEach(btn=>{
          btn.addEventListener('click', ()=>{
            const sel = btn.textContent;
            const ok = sel === q.answer;
            document.querySelectorAll('.opt').forEach(b=>{
              if (b.textContent===q.answer) b.classList.add('correct');
              else if (b===btn) b.classList.add('wrong');
            });
            this.updateMasteryAndScore(q, ok);
          });
        });
      }

      // global controls
      document.getElementById('vocShow').onclick = ()=>{
        if (q.type==='listen'){
          document.getElementById('listenAnswer').style.display='block';
        } else {
          document.querySelectorAll('.opt').forEach(b=>{ if (b.textContent===q.answer) b.classList.add('correct'); });
        }
      };
      document.getElementById('vocCorrect').onclick = ()=>{ this.updateMasteryAndScore(q, true); };
      document.getElementById('vocWrong').onclick = ()=>{ this.updateMasteryAndScore(q, false); };
      document.getElementById('vocNext').onclick = ()=>{ this.next(); };
      document.getElementById('vocSpeak').onclick = ()=>{
        const speakText = (q.type==='word2def') ? q.prompt : (q.type==='def2word' ? q.answer : q.answer);
        window.ttsSpeakNow && window.ttsSpeakNow(speakText);
      };
    },
    updateMasteryAndScore(q, ok){
      const word = (q.type==='word2def') ? q.prompt : q.answer;
      updateMastery(this.mastery, word, ok);
      if (ok){ this.correct++; this.correctList.push(word); } else { this.wrong++; if (!this.wrongList.includes(word)) this.wrongList.push(word); }
    },
    next(){
      this.i++;
      if (this.i >= this.questions.length){ this.finish(); }
      else { this.renderCurrent(); }
    },
    finish(){
      const mins = Math.max(1, Math.round((Date.now()-this.startedAt)/60000));
      const sum = document.getElementById('vocSummary');
      sum.innerHTML = `✅ 完成：${this.size} 题 · 正确 ${this.correct} · 错误 ${this.wrong} · 用时 ${mins} 分钟
      <div style="margin-top:6px;">
        <button id="vocExport">导出本次报告</button>
      </div>`;
      document.getElementById('vocExport').onclick = ()=>{
        const report = {
          date: new Date().toISOString(),
          size: this.size, correct: this.correct, wrong: this.wrong,
          mode: this.mode
        };
      // 生成并下载回炉补丁（把错词分配到 3 天）
      (function(){
        const btn = document.createElement('button');
        btn.id='vocExportPatch'; btn.textContent='下载回炉补丁（英语）'; btn.style.marginLeft='8px';
        const sum = document.getElementById('vocSummary');
        if (sum) sum.appendChild(btn);
        btn.onclick = ()=>{
          const wrongs = (Session && Session.wrongList) ? Session.wrongList : (this.wrongList||[]);
          if (!wrongs || !wrongs.length){ alert('本次没有错词，无需生成补丁。'); return; }
          const patch = buildReviewPatch(wrongs);
          downloadText(`weekly_plan_patch_english_review_${(new Date()).toISOString().slice(0,10)}.json`, JSON.stringify(patch, null, 2));
        };
      })();

        const blob = new Blob([JSON.stringify(report,null,2)], {type:'application/json'});
        const url = URL.createObjectURL(blob); const a=document.createElement('a');
        a.href=url; a.download=`vocab_session_${todayISO()}.json`; a.click(); URL.revokeObjectURL(url);
      };
    }
  };

  function boot(){
    ensureStyles();
    injectOverlay();
    document.getElementById('vocStart').addEventListener('click', async ()=>{
      const size = Math.max(8, Math.min(40, parseInt(document.getElementById('vocSize').value||DAY_SIZE_DEFAULT)));
      const mode = document.getElementById('vocMode').value;
      const stats = loadStats(); const mastery = loadMastery(); const gloss = await loadGlossary();
      if (!Object.keys(stats).length){ alert('当前还没有词频统计数据：先在英语页面朗读/双击取词积累一些词哦～'); return; }
      Session.init(size, mode, stats, mastery, gloss);
    });
  }

  
// === 回炉补丁工具 ===
function buildReviewPatch(wrongWords){
  function todayISO(){ const d=new Date(); d.setHours(0,0,0,0); return d.toISOString().slice(0,10); }
  function addDaysISO(iso, n){ const d=new Date(iso); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); }
  const created = new Date().toISOString();
  const base = 'weekly_plan_english_mixed_v1.json';
  const today = todayISO();
  const buckets = [[],[],[]];
  wrongWords.forEach((w,i)=>{ buckets[i % 3].push(w); });
  const days = [
    {date: today, tasks: [{type:'vocab_review', title:'错词回炉（英语）', words: buckets[0], duration_min: 20}]},
    {date: addDaysISO(today, 1), tasks: [{type:'vocab_review', title:'错词回炉巩固（英语）', words: buckets[1], duration_min: 20}]},
    {date: addDaysISO(today, 3), tasks: [{type:'vocab_review', title:'错词查漏补缺（英语）', words: buckets[2], duration_min: 20}]}
  ];
  return { patch_for: base, created, generator: 'vocab-daily', days };
}
function downloadText(filename, text){
  const blob = new Blob([text], {type:'application/json'});
  const url = URL.createObjectURL(blob); const a=document.createElement('a');
  a.href=url; a.download=filename; a.click(); URL.revokeObjectURL(url);
}

window.addEventListener('DOMContentLoaded', boot);
})();
