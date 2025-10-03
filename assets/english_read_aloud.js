
/* english_read_aloud.js — point-read (TTS) + read-aloud (STT heuristic) + fluency chart */
(function(){
  function ready(fn){ if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }

  function wrapWords(el){
    if (el.__wrapped) return; el.__wrapped=true;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    const texts = [];
    while (walker.nextNode()) texts.push(walker.currentNode);
    texts.forEach(node=>{
      const parent = node.parentNode;
      const parts = (node.textContent||'').split(/(\s+|[.,!?;:"'()])/g).filter(s=> s!=='');
      const frag = document.createDocumentFragment();
      parts.forEach(p=>{
        if (/\s+/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
        const span = document.createElement('span'); span.className='word'; span.textContent=p;
        span.style.cursor='pointer'; span.style.padding='0 1px'; span.style.borderRadius='4px';
        span.addEventListener('click', ()=> speak(p));
        frag.appendChild(span);
      });
      parent.replaceChild(frag, node);
    });
  }

  function voice(){
    const prefer = (speechSynthesis.getVoices()||[]).find(v=> /en(-|_)US/i.test(v.lang)) || (speechSynthesis.getVoices()||[])[0];
    return prefer;
  }
  function speak(text){
    try{
      const u = new SpeechSynthesisUtterance(text);
      u.lang='en-US'; u.rate=1.0; u.pitch=1.0; u.volume=1.0; u.voice=voice();
      speechSynthesis.cancel(); speechSynthesis.speak(u);
    }catch(e){ console.warn(e); }
  }
  function speakAll(text){
    try{
      const u = new SpeechSynthesisUtterance(text);
      u.lang='en-US'; u.rate=0.95; u.pitch=1.0; u.volume=1.0; u.voice=voice();
      speechSynthesis.cancel(); speechSynthesis.speak(u);
    }catch(e){ console.warn(e); }
  }

  // Simple read-aloud scoring using Web Speech API (if available)
  function startReadAloud(panel, refText){
    const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Rec){ alert('当前浏览器不支持语音识别，建议使用 Chrome-based 浏览器。'); return; }
    const rec = new Rec();
    rec.lang='en-US'; rec.interimResults=true; rec.continuous=true;
    const t0 = Date.now(); const marks=[];
    let final='';
    panel.querySelector('.ra-status').textContent='录音中…';
    rec.onresult = (e)=>{
      let cur='';
      for (let i=e.resultIndex;i<e.results.length;i++){
        const r=e.results[i];
        if (r.isFinal) final += r[0].transcript + ' ';
        else cur += r[0].transcript;
      }
      const t = (Date.now()-t0)/1000;
      // Heuristic fluency: length delta / time, clamp 0~1
      const totalLen = (final + ' ' + cur).trim().split(/\s+/).length;
      const pace = Math.min(1, totalLen / (t/1.2 + 1)); // words per second normalized
      marks.push({t, pace});
      drawCurve(panel.querySelector('canvas'), marks);
      panel.querySelector('.ra-live').textContent = (final + ' ' + cur).trim();
    };
    rec.onend = ()=>{
      panel.querySelector('.ra-status').textContent='已结束';
      const score = computeWER(refText, final);
      panel.querySelector('.ra-score').textContent = `准确度 ${Math.max(0, Math.round((1-score.wer)*100))}，流畅度 ${Math.round(avg(marks.map(m=>m.pace))*100)}`;
    };
    rec.start();
    panel.__rec = rec;
  }
  function stopReadAloud(panel){
    const rec = panel.__rec; if (!rec) return;
    try{ rec.stop(); }catch(e){}
    panel.__rec = null;
  }

  function avg(a){ if (!a.length) return 0; return a.reduce((x,y)=>x+y,0)/a.length; }

  function computeWER(ref, hyp){
    const r = (ref||'').toLowerCase().replace(/[^a-z\s]/g,'').trim().split(/\s+/);
    const h = (hyp||'').toLowerCase().replace(/[^a-z\s]/g,'').trim().split(/\s+/);
    const R=r.length, H=h.length;
    const dp=Array.from({length:R+1}, ()=> Array(H+1).fill(0));
    for (let i=0;i<=R;i++) dp[i][0]=i;
    for (let j=0;j<=H;j++) dp[0][j]=j;
    for (let i=1;i<=R;i++){
      for (let j=1;j<=H;j++){
        const cost = r[i-1]===h[j-1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i-1][j] + 1,    // deletion
          dp[i][j-1] + 1,    // insertion
          dp[i-1][j-1] + cost // substitution
        );
      }
    }
    const dist = dp[R][H];
    return {wer: R? dist/R : 1, dist};
  }

  function drawCurve(canvas, marks){
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w=canvas.width=canvas.clientWidth||320, h=canvas.height=120;
    ctx.clearRect(0,0,w,h);
    // axes
    ctx.strokeStyle='#ddd'; ctx.beginPath(); ctx.moveTo(32,10); ctx.lineTo(32,h-20); ctx.lineTo(w-10,h-20); ctx.stroke();
    // normalize
    if (!marks.length) return;
    const tmax = Math.max(10, marks.at(-1).t);
    ctx.strokeStyle='#222'; ctx.beginPath();
    marks.forEach((m,i)=>{
      const x = 32 + (w-42)*m.t/tmax;
      const y = (h-20) - (h-40)*Math.max(0, Math.min(1,m.pace));
      if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    });
    ctx.stroke();
  }

  function attach(){
    document.querySelectorAll('.en-reading, .en-passages').forEach(block=>{
      if (block.__ra) return;
      block.__ra = true;
      wrapWords(block);
      const text = block.innerText.trim();
      const panel = document.createElement('div'); panel.className='ra-panel';
      panel.innerHTML = `
        <div style="display:flex; gap:8px; flex-wrap:wrap; margin:6px 0;">
          <button class="hw-btn ra-tts">整段点读</button>
          <button class="hw-btn ra-start">开始跟读</button>
          <button class="hw-btn ra-stop">停止</button>
          <span class="ra-status" style="color:#666;">未开始</span>
        </div>
        <div style="font-size:12px;color:#666;">点击单词可点读；整段点读会使用系统 TTS；跟读自动生成“流畅度曲线”。</div>
        <canvas style="width:100%; height:120px; display:block; margin-top:6px;"></canvas>
        <div style="margin-top:6px;"><b>实时识别：</b><span class="ra-live" style="color:#333"></span></div>
        <div style="margin-top:6px;"><b>评分：</b><span class="ra-score">—</span></div>
      `;
      block.parentElement.insertBefore(panel, block.nextSibling);
      panel.querySelector('.ra-tts').onclick = ()=> speakAll(text);
      panel.querySelector('.ra-start').onclick = ()=> startReadAloud(panel, text);
      panel.querySelector('.ra-stop').onclick  = ()=> stopReadAloud(panel);
    });
  }

  ready(()=>{
    attach();
    const mo = new MutationObserver(()=> attach());
    mo.observe(document.body, {childList:true, subtree:true});
  });
})();
