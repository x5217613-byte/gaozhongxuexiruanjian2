
(function(){
  function ready(fn){ if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }
  function get(k, d){ try{ return localStorage.getItem('ux:'+k) ?? d; }catch(e){ return d; } }
  function set(k, v){ try{ localStorage.setItem('ux:'+k, v); }catch(e){} }

  function boot(){
    // add collapse button
    const sb = document.getElementById('sidebar');
    if (!sb || sb.__plus) return;
    sb.__plus = true;
    const btn = document.createElement('div'); btn.className='collapse-btn'; btn.title='折叠/展开侧边栏'; btn.textContent='‹';
    sb.appendChild(btn);
    if (get('sidebar','expanded')==='collapsed') document.documentElement.setAttribute('data-sidebar','collapsed');
    btn.onclick = ()=>{
      const cur = document.documentElement.getAttribute('data-sidebar')==='collapsed' ? 'expanded' : 'collapsed';
      document.documentElement.setAttribute('data-sidebar', cur==='collapsed'?'collapsed':'');
      set('sidebar', cur);
    };

    // drawer for mobile
    if (!document.getElementById('drawerMask')){
      const m = document.createElement('div'); m.id='drawerMask'; document.body.appendChild(m);
      m.onclick = ()=> document.documentElement.removeAttribute('data-drawer');
    }
    const tb = document.getElementById('topbar');
    if (tb && !tb.querySelector('.menu')){
      const m=document.createElement('button'); m.className='menu'; m.textContent='☰ 菜单';
      m.onclick=()=>{
        const open = document.documentElement.getAttribute('data-drawer')==='open';
        document.documentElement.setAttribute('data-drawer', open? '' : 'open');
      };
      tb.insertBefore(m, tb.firstChild);
    }

    // breadcrumb auto from hash
    function updateCrumb(){
      const act = sb.querySelector('a.active');
      const bc = document.getElementById('breadcrumb');
      if (bc) bc.textContent = act ? act.textContent : '首页';
    }
    window.addEventListener('hashchange', updateCrumb);
    updateCrumb();
  }
  ready(boot);
})();
