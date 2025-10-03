
/* english_read_aloud_plus.js — voice picker + rate/pitch controls */
(function(){
  function ready(fn){ if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }
  function load(name, def){ try{ return JSON.parse(localStorage.getItem(name)); }catch(e){ return def; } }
  function save(name,val){ try{ localStorage.setItem(name, JSON.stringify(val)); }catch(e){} }

  function initControls(){
    document.querySelectorAll('.ra-panel').forEach(p=>{
      if (p.__ttsPlus) return;
      p.__ttsPlus = true;
      const bar = document.createElement('div');
      bar.style.display='flex'; bar.style.gap='8px'; bar.style.flexWrap='wrap'; bar.style.margin='6px 0';
      bar.innerHTML = `
        <label>Voice <select class="ra-voice"></select></label>
        <label>Rate <input class="ra-rate" type="range" min="0.6" max="1.4" step="0.05" value="${load('raRate',1.0)||1.0}"></label>
        <label>Pitch <input class="ra-pitch" type="range" min="0.6" max="1.4" step="0.05" value="${load('raPitch',1.0)||1.0}"></label>
      `;
      p.insertBefore(bar, p.firstChild);
      const voiceSel = bar.querySelector('.ra-voice');
      function fillVoices(){
        const vs = speechSynthesis.getVoices()||[];
        voiceSel.innerHTML = vs.map((v,i)=> `<option value="${i}">${v.name} (${v.lang})</option>`).join('');
        const pref = load('raVoiceIndex', null);
        if (pref!=null && vs[pref]) voiceSel.value = String(pref);
        else{
          const idx = vs.findIndex(v=> /en(-|_)US/i.test(v.lang)) >=0 ? vs.findIndex(v=> /en(-|_)US/i.test(v.lang)) : 0;
          voiceSel.value = String(Math.max(0, idx));
        }
      }
      speechSynthesis.addEventListener('voiceschanged', fillVoices);
      fillVoices();

      voiceSel.addEventListener('change', ()=> save('raVoiceIndex', parseInt(voiceSel.value,10)));
      bar.querySelector('.ra-rate').addEventListener('input', (e)=> save('raRate', parseFloat(e.target.value)));
      bar.querySelector('.ra-pitch').addEventListener('input', (e)=> save('raPitch', parseFloat(e.target.value)));

      // patch buttons
      const text = p.previousElementSibling && (p.previousElementSibling.innerText||'') || '';
      const btnTTS = p.querySelector('.ra-tts');
      const speakAll = ()=>{
        const u = new SpeechSynthesisUtterance(text);
        const vs = speechSynthesis.getVoices()||[];
        const idx = parseInt(voiceSel.value||'0',10);
        u.voice = vs[idx] || vs[0];
        u.lang = (u.voice && u.voice.lang) || 'en-US';
        u.rate = load('raRate',1.0) || 1.0;
        u.pitch = load('raPitch',1.0) || 1.0;
        try{ speechSynthesis.cancel(); speechSynthesis.speak(u); }catch(e){ console.warn(e); }
      };
      if (btnTTS){ btnTTS.onclick = speakAll; }
    });
  }

  ready(initControls);
  const mo = new MutationObserver(()=> initControls());
  mo.observe(document.body, {childList:true, subtree:true});
})();
