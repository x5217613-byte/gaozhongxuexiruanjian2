
(function(){
  async function run(){
    const out = document.getElementById('out'); out.innerHTML='';
    function line(txt, cls){ const d=document.createElement('div'); d.textContent=txt; if (cls) d.className=cls; out.appendChild(d); }

    function ok(b){ return b? '✅' : '❌'; }
    async function exists(path){
      try{ const r=await fetch(path, {cache:'no-store'}); return r.ok; }catch(e){ return false; }
    }
    function has(html, keyword){ return html.includes(keyword); }

    line('— 资产文件检查 —');
    const assets = [
      'assets/theme.css','assets/components.css','assets/layout.css','assets/theme.js','assets/layout.js','assets/layout_plus.js','assets/sidebar_plus.css',
      'assets/theme_customizer.js','assets/charts.js','assets/shortcuts.js',
      'assets/handwrite_pro.js','assets/handwrite_pro.css',
      'assets/english_read_aloud.js','assets/english_read_aloud_plus.js',
      'assets/wrongbook_print_paged_precise.js','assets/wrongbook_print_enhance.js','assets/pdf_export_buttons.js',
      'assets/tiny_pdf_bookmarks.js','assets/wrongbook_pdf_export_bookmarks.js',
      'assets/sync_adapters.js','assets/sync_adapters_plus.js','assets/knowledge_infer.js',
      'icons/icon-192.png','icons/icon-512.png'
    ];
    let pass = 0;
    for (const p of assets){
      const okx = await exists(p); if (okx) pass++; line(`${okx?'✔':'✖'} ${p}`, okx?'ok':'bad');
    }
    line(`资产通过：${pass}/${assets.length}`);

    line('— 页面挂载检查 —');
    async function loadText(p){ try{ const r=await fetch(p,{cache:'no-store'}); return r.ok? await r.text(): ''; }catch(e){ return ''; } }
    const indexHtml = await loadText('index.html');
    const homeHtml = await loadText('home.html');
    const dashHtml = await loadText('dashboard.html');
    const hooks = assets.filter(a=> a.endsWith('.js') || a.endsWith('.css'));
    function checkHooks(pageName, html){
      let cnt=0; hooks.forEach(h=>{ if (html.includes(h)) cnt++; });
      line(`${pageName} 挂载脚本命中：${cnt} 条`);
    }
    checkHooks('index.html', indexHtml);
    checkHooks('home.html', homeHtml);
    checkHooks('dashboard.html', dashHtml);

    line('— 数据可读性检查 —');
    const dataFiles = [
      'data/plans/weekly_plan_english.json',
      'data/plans/weekly_plan_math.json',
      'data/plans/weekly_plan_chinese.json',
      'data/chinese/materials_essay_prompts.json',
      'data/history/materials_essay_prompts.json',
      'data/politics/materials_essay_prompts.json',
      'data/english/writing_essay_prompts.json'
    ];
    let dpass=0;
    for (const p of dataFiles){
      const okx = await exists(p); if (okx) dpass++; line(`${okx?'✔':'✖'} ${p}`, okx?'ok':'bad');
    }
    line(`数据文件通过：${dpass}/${dataFiles.length}`);

    line('— 导出功能试探 —');
    line('请前往题目页 → 右下工具条点击 “导出PDF(书签·3级)” 进行实际验证。', 'warn');
  }

  document.getElementById('run').onclick = run;
  document.getElementById('copy').onclick = ()=>{
    const txt = Array.from(document.querySelectorAll('#out div')).map(d=> d.textContent).join('\n');
    navigator.clipboard.writeText(txt).then(()=> alert('已复制自检结果'));
  };
})();
