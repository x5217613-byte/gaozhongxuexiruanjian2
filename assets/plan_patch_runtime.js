
(function(){
  const ORI = window.fetch;
  const KEY = 'plan_patches';
  function loadPatches(){ try{ return JSON.parse(localStorage.getItem(KEY)||'[]'); }catch(e){ return []; } }
  function ensureDate(s){ try{ return s && s.slice(0,10); }catch(e){ return s; } }
  function merge(plan, patch){
    if (!plan||!patch||!Array.isArray(patch.days)) return plan;
    const idx = {};
    plan.weekly_plan = plan.weekly_plan || [];
    plan.weekly_plan.forEach(d=>{ const k=ensureDate(d.date||''); if(k) idx[k]=d; });
    patch.days.forEach(d=>{
      const dt=ensureDate(d.date||''); if(!dt) return;
      let day = idx[dt];
      if (!day){ day = {date:dt}; plan.weekly_plan.push(day); idx[dt]=day; }
      const extra = day.extra_tasks || (day.extra_tasks=[]);
      (d.tasks||[]).forEach(t=> extra.push(t));
    });
    plan.weekly_plan.sort((a,b)=> (ensureDate(a.date)||'9999-12-31') < (ensureDate(b.date)||'9999-12-31') ? -1 : 1);
    return plan;
  }
  window.fetch = async function(input, init){
    try{
      const url = (typeof input==='string') ? input : (input && input.url) || '';
      if (/weekly_plans\/weekly_plan_.*\.json(\?.*)?$/i.test(url)){
        const resp = await ORI(input, init);
        const cloned = resp.clone();
        const data = await cloned.json();
        const patches = loadPatches();
        const file = url.split('/').pop().split('?')[0];
        const related = patches.filter(p=> !p.patch_for || p.patch_for===file);
        let merged = data;
        related.forEach(p=> merged = merge(merged, p));
        const blob = new Blob([JSON.stringify(merged)], {type:'application/json'});
        return new Response(blob, {status:200, headers:{'Content-Type':'application/json'}});
      }
    }catch(e){}
    return ORI(input, init);
  };
  // 自动清理超过14天的补丁
  try{
    const now = Date.now();
    const patches = loadPatches();
    const fresh = patches.filter(p=>{
      try{
        const d = new Date((p.created||'').slice(0,10)); return (now - d.getTime()) <= 14*86400000;
      }catch(e){ return true; }
    });
    if (fresh.length !== patches.length){
      localStorage.setItem(KEY, JSON.stringify(fresh));
    }
  }catch(e){}
})();
