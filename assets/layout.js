
(function(){
  function ready(fn){ if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }
  function setAttr(k,v){ document.documentElement.setAttribute(k,v); localStorage.setItem('attr:'+k,v); }
  function getAttr(k, def){ return localStorage.getItem('attr:'+k) || def; }
  function applySaved(){
    document.documentElement.setAttribute('data-accent', getAttr('data-accent','blue'));
    document.documentElement.setAttribute('data-contrast', getAttr('data-contrast','normal'));
    document.documentElement.setAttribute('data-mode', getAttr('data-mode','normal'));
  }
  function topbar(){
    if (document.getElementById('topbar')) return;
    const bar = document.createElement('div'); bar.id='topbar';
    const logo = localStorage.getItem('ui:brandLogo');
    bar.innerHTML = `<div class="brand">` + (logo? `<img src="${logo}" alt="logo" style="width:24px;height:24px;border-radius:6px;vertical-align:-5px;margin-right:6px;">`:'') + `HS Study Suite</div>
    <div class="crumb" id="breadcrumb">首页</div>
    <div class="spacer"></div>
    <a class="btn ghost" href="dashboard.html">仪表盘</a>`;
    document.body.insertBefore(bar, document.body.firstChild);
  }
  function sidebar(){
    if (document.getElementById('sidebar')){
      document.querySelector('main')?.classList.add('main-with-sidebar');
      return;
    }
    const sb = document.createElement('div'); sb.id='sidebar';
    sb.innerHTML = `
      <div class="nav-group">
        <div class="nav-title">学科</div>
        <a href="#math"><img class="ico" src="assets/subjects/math.svg" width="16" height="16"> 数学</a>
        <a href="#physics"><img class="ico" src="assets/subjects/physics.svg" width="16" height="16"> 物理</a>
        <a href="#chemistry"><img class="ico" src="assets/subjects/chemistry.svg" width="16" height="16"> 化学</a>
        <a href="#english"><img class="ico" src="assets/subjects/english.svg" width="16" height="16"> 英语</a>
        <a href="#chinese"><img class="ico" src="assets/subjects/chinese.svg" width="16" height="16"> 语文</a>
        <a href="#history"><img class="ico" src="assets/subjects/history.svg" width="16" height="16"> 历史</a>
        <a href="#politics"><img class="ico" src="assets/subjects/politics.svg" width="16" height="16"> 政治</a>
        <a href="#biology"><img class="ico" src="assets/subjects/biology.svg" width="16" height="16"> 生物</a>
        <a href="#geography"><img class="ico" src="assets/subjects/geography.svg" width="16" height="16"> 地理</a>
      </div>
      <div class="nav-group">
        <div class="nav-title">工具</div>
        <a href="#handwrite">✍️ 手写</a>
        <a href="#wrongbook">📚 错题本</a>
        <a href="#sync">☁️ 同步</a>
      <a href="selfcheck.html">🩺 自检面板</a>
      </div>`;
    document.body.appendChild(sb);
    // ensure main spacing
    const main = document.querySelector('main') || (function(){ const m=document.createElement('main'); while(document.body.children.length>1) m.appendChild(document.body.children[1]); document.body.appendChild(m); return m; })();
    main.classList.add('main-with-sidebar');
    // active highlight by hash
    function active(){
      const h = location.hash || '#home';
      sb.querySelectorAll('a').forEach(a=> a.classList.toggle('active', a.getAttribute('href')===h));
      const bc = document.getElementById('breadcrumb'); if (bc){ const act = sb.querySelector('a.active'); bc.textContent = act ? act.textContent : '首页'; }
    }
    window.addEventListener('hashchange', active); active();
  }
  function controls(){
    if (document.getElementById('uiControls')) return;
    const box = document.createElement('div'); box.id='uiControls';
    box.innerHTML = `
      <div class="row"><b>主题/无障碍</b></div>
      <div class="row">
        <button class="btn" data-accent="blue">蓝</button>
        <button class="btn" data-accent="green">绿</button>
        <button class="btn" data-accent="purple">紫</button>
        <button class="btn" data-accent="orange">橙</button>
      </div>
      <div class="row">
        <label class="switch"><input id="swContrast" type="checkbox"><span class="knob"></span></label><span>高对比</span>
        <label class="switch"><input id="swExam" type="checkbox"><span class="knob"></span></label><span>考试专注</span>
      <a href="selfcheck.html">🩺 自检面板</a>
      </div>`;
    document.body.appendChild(box);
    // bind
    box.querySelectorAll('button[data-accent]').forEach(b=> b.onclick = ()=>{ const v=b.getAttribute('data-accent'); setAttr('data-accent', v); document.documentElement.setAttribute('data-accent', v); toast('已切换主题色：' + v); });
    const swC = box.querySelector('#swContrast'), swE=box.querySelector('#swExam');
    swC.checked = getAttr('data-contrast','normal')==='high'; swE.checked = getAttr('data-mode','normal')==='exam';
    function syncSwitchView(){
      box.querySelectorAll('.switch').forEach(sw=> sw.classList.toggle('on', sw.querySelector('input')?.checked));
    }
    swC.onchange = ()=>{ setAttr('data-contrast', swC.checked?'high':'normal'); document.documentElement.setAttribute('data-contrast', swC.checked?'high':'normal'); syncSwitchView(); toast('高对比：' + (swC.checked?'开启':'关闭')); };
    swE.onchange = ()=>{ setAttr('data-mode', swE.checked?'exam':'normal'); document.documentElement.setAttribute('data-mode', swE.checked?'exam':'normal'); syncSwitchView(); toast('考试专注：' + (swE.checked?'开启':'关闭')); };
    syncSwitchView();
  }
  function toast(msg){
    let t = document.getElementById('uiToast'); if (!t){ t=document.createElement('div'); t.id='uiToast'; t.className='toast'; document.body.appendChild(t); }
    t.textContent = msg; t.style.display='block'; clearTimeout(t.__timer);
    t.__timer = setTimeout(()=> t.style.display='none', 1600);
  }

  function boot(){ applySaved(); topbar(); sidebar(); controls(); }
  ready(boot);
})();
