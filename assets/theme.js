
(function(){
  const KEY='ui_theme_pref'; const KEY_COLOR='ui_color_pref';
  function apply(theme){ document.documentElement.setAttribute('data-theme', theme); localStorage.setItem(KEY, theme); }
  function init(){
    let pref = localStorage.getItem(KEY);
    if (!pref){
      const mq = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      pref = mq ? 'dark' : 'light';
    }
    apply(pref);
    mountToggle(pref);
  }
  function mountToggle(theme){
    if (document.getElementById('themeToggle')) return;
    const btn = document.createElement('button');
    btn.id='themeToggle'; btn.className='btn ghost'; btn.style.position='fixed';
    btn.style.right='16px'; btn.style.top='16px'; btn.style.zIndex='10000';
    btn.textContent = theme==='dark' ? '🌙 暗色' : '☀️ 亮色';
    btn.title='切换主题 (Light/Dark)';
    btn.onclick = ()=>{
      const cur = document.documentElement.getAttribute('data-theme') || 'light';
      const next = cur==='light' ? 'dark' : 'light';
      apply(next); btn.textContent = next==='dark' ? '🌙 暗色' : '☀️ 亮色';
    };
    document.body.appendChild(btn);
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

// SW register for GitHub Pages
if ('serviceWorker' in navigator){ window.addEventListener('load', ()=> navigator.serviceWorker.register('sw.js').catch(()=>{})); }
