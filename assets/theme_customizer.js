
(function(){
  function ready(fn){ if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }
  function ensurePanel(){
    const box = document.getElementById('uiControls');
    if (!box || box.__custom) return;
    box.__custom = true;
    const row = document.createElement('div'); row.className='row';
    row.innerHTML = `<input type="color" id="brandColor" value="#3a7afe" title="自定义主题色">
    <button class="btn" id="brandApply">应用主题色</button>`;
    box.appendChild(row);
    const ip = row.querySelector('#brandColor');
    const btn = row.querySelector('#brandApply');
    const saved = localStorage.getItem('ui:brandColor'); if (saved) ip.value = saved;
    btn.onclick = ()=>{
      const c = ip.value;
      localStorage.setItem('ui:brandColor', c);
      const grad = `linear-gradient(135deg, ${c} 0%, ${shade(c,-20)} 100%)`;
      document.documentElement.style.setProperty('--brand', c);
      document.documentElement.style.setProperty('--accent-grad', grad);
    };
  }
  function shade(hex,percent){
    // simple shade: percent (-100..100)
    const n=parseInt(hex.slice(1),16);
    let r=(n>>16)&255, g=(n>>8)&255, b=n&255;
    r=Math.max(0,Math.min(255, Math.round(r*(100+percent)/100)));
    g=Math.max(0,Math.min(255, Math.round(g*(100+percent)/100)));
    b=Math.max(0,Math.min(255, Math.round(b*(100+percent)/100)));
    return '#'+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);
  }
  ready(ensurePanel);
})();

(function(){
  function ready(fn){ if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }
  function mount(){
    const box=document.getElementById('uiControls'); if (!box || box.__brandLogo) return; box.__brandLogo=true;
    const row=document.createElement('div'); row.className='row';
    row.innerHTML = '<input type="file" id="brandLogo" accept="image/*"><button class="btn" id="brandLogoApply">应用LOGO</button>';
    box.appendChild(row);
    row.querySelector('#brandLogoApply').onclick = async ()=>{
      const f = row.querySelector('#brandLogo').files[0]; if (!f) return alert('请选择图片');
      const b64 = await new Promise((res)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.readAsDataURL(f); });
      try{ localStorage.setItem('ui:brandLogo', b64); alert('已应用LOGO'); location.reload(); }catch(e){ alert('保存失败：'+e); }
    };
  }
  ready(mount);
})();
