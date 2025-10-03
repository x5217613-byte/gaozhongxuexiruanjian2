
(function(){
  function today(){ return new Date().toISOString().slice(0,10); }
  function buildReviewPatch(wrongWords){
    function addDaysISO(iso, n){ const d=new Date(iso); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); }
    const created = new Date().toISOString();
    const base = 'weekly_plan_english_mixed_v1.json';
    const t = today();
    const buckets = [[],[],[]];
    (wrongWords||[]).forEach((w,i)=> buckets[i%3].push(w));
    const days = [
      {date:t, tasks:[{type:'vocab_review', title:'错词回炉（英语）', words:buckets[0], duration_min:20}]},
      {date:addDaysISO(t,1), tasks:[{type:'vocab_review', title:'错词回炉巩固（英语）', words:buckets[1], duration_min:20}]},
      {date:addDaysISO(t,3), tasks:[{type:'vocab_review', title:'错词查漏补缺（英语）', words:buckets[2], duration_min:20}]}
    ];
    return { patch_for: base, created, generator:'vocab-daily', days };
  }
  function buildCompositePatch(wrongWords, wrongItems){
    const patch = buildReviewPatch(wrongWords||[]);
    const t = today();
    const g = (wrongItems||[]).filter(x=>x.subtype==='grammar');
    const r = (wrongItems||[]).filter(x=>x.subtype==='reading');
    const c = (wrongItems||[]).filter(x=>x.subtype==='cloze');
    function taskFrom(subtype, items, title){
      if (!items.length) return null;
      return { type: subtype+'_review', title, items, duration_min: Math.min(30, 10 + items.length*2) };
    }
    const tasks = [ taskFrom('grammar',g,'语法错题回炉（英语）'), taskFrom('reading',r,'阅读错题回炉（英语）'), taskFrom('cloze',c,'完形错题回炉（英语）') ].filter(Boolean);
    if (tasks.length){ patch.days.push({date:t, tasks}); }
    patch.generator = 'vocab+review-capture';
    return patch;
  }
  function loadPatches(){ try{ return JSON.parse(localStorage.getItem('plan_patches')||'[]'); }catch(e){ return []; } }
  function savePatches(a){ try{ localStorage.setItem('plan_patches', JSON.stringify(a)); }catch(e){} }

  function installButtons(container){
    if (!container || container.dataset.vocabApplied==='1') return;
    container.dataset.vocabApplied='1';
    const apply = document.createElement('button'); apply.id='vocApplyLocal'; apply.textContent='立即应用到周计划(本地)'; apply.style.marginLeft='8px';
    const clear = document.createElement('button'); clear.id='vocClearPatches'; clear.textContent='清空本地补丁'; clear.style.marginLeft='8px';
    container.appendChild(apply); container.appendChild(clear);
    apply.onclick = ()=>{
      const wrongWords = (window.Session && Session.wrongList) ? Session.wrongList : [];
      const dayISO = today();
      const wrongItems = (window.ReviewCapture && ReviewCapture.getWrongByDate) ? (ReviewCapture.getWrongByDate(dayISO)||[]) : [];
      const patch = buildCompositePatch(wrongWords, wrongItems);
      const arr = loadPatches(); arr.push(patch); savePatches(arr);
      alert('✅ 已写入本地补丁。回到“周计划”并刷新即可看到回炉任务。');
    };
    clear.onclick = ()=>{ localStorage.removeItem('plan_patches'); alert('已清空本地补丁。'); };
  }

  const mo = new MutationObserver(muts=>{
    muts.forEach(m=>{
      m.addedNodes && Array.from(m.addedNodes).forEach(n=>{
        if (n.nodeType===1){
          const box = n.id==='vocSummary' ? n : n.querySelector && n.querySelector('#vocSummary');
          if (box) installButtons(box);
        }
      });
    });
  });
  mo.observe(document.documentElement, {childList:true, subtree:true});
  // 兜底：首屏已存在
  const initBox = document.getElementById('vocSummary'); if (initBox) installButtons(initBox);
})();
