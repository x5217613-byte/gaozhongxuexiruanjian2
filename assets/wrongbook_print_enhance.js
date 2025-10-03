
/* wrongbook_print_enhance.js — cover/TOC + headers/footers with page counter */
(function(){
  function ensureBtns(){
    const bar = document.getElementById('wbPrintToolbar') || (function(){
      const d=document.createElement('div'); d.id='wbPrintToolbar'; d.style.position='fixed'; d.style.right='16px'; d.style.bottom='16px'; d.style.zIndex=9999; d.style.display='flex'; d.style.gap='8px';
      document.body.appendChild(d); return d;
    })();
    if (!document.getElementById('wbEnhPaged')){
      const b=document.createElement('button'); b.id='wbEnhPaged'; b.textContent='分页打印·封面/目录';
      b.style.padding='8px 12px'; b.style.border='1px solid #ddd'; b.style.borderRadius='999px'; b.style.background='#fff'; b.style.boxShadow='0 6px 16px rgba(0,0,0,.12)';
      bar.appendChild(b);
      b.onclick = enhancePaged;
    }
  }

  function enhancePaged(){
    const host = document.getElementById('wrongbookPrintViewPaged');
    if (!host){ alert('请先点击“错题本·分页打印”生成视图'); return; }
    if (host.__enhanced) { host.scrollIntoView({behavior:'smooth'}); return; }
    host.__enhanced = true;
    const groups = Array.from(host.querySelectorAll('.group'));
    // Insert cover
    const cover = document.createElement('div'); cover.className='page cover';
    cover.innerHTML = `<div style="text-align:center;padding:120px 24px;">
      <h1 style="margin:0;">错题本合集</h1>
      <div style="margin-top:8px;color:#666;">自动分页打印视图</div>
      <div style="margin-top:30px;">${new Date().toLocaleString()}</div>
    </div>`;
    host.insertBefore(cover, host.firstChild);
    // Insert TOC
    const toc = document.createElement('div'); toc.className='page toc';
    let items = groups.map((g, i)=>{
      const h2 = g.querySelector('h2'); const title = h2 ? h2.textContent : '未命名分组';
      g.setAttribute('data-anchor', 'group-'+(i+1));
      return `<div class="toc-row" data-anchor="group-${i+1}">${i+1}. ${title}</div>`;
    }).join('');
    toc.innerHTML = `<h2 style="margin:12px 0;">目录</h2>${items}`;
    host.insertBefore(toc, host.children[1]);

    // Click TOC to jump
    toc.querySelectorAll('.toc-row').forEach(row=>{
      row.style.cursor='pointer';
      row.onclick = ()=>{
        const a = row.getAttribute('data-anchor');
        const g = host.querySelector('[data-anchor="'+a+'"]');
        if (g) g.scrollIntoView({behavior:'smooth'});
      };
    });

    // Add header/footer CSS
    const style = document.createElement('style');
    style.textContent = `
      @media print {
        body { counter-reset: page; }
        .page { position: relative; }
        .page::after{
          content: "第 " counter(page) " 页";
          counter-increment: page;
          position: absolute; right: 16px; bottom: 8px; color:#666; font-size:12px;
        }
        .page::before{
          content: "错题本·分页打印";
          position: absolute; left: 16px; top: 8px; color:#666; font-size:12px;
        }
      }
    `;
    host.appendChild(style);
    host.scrollIntoView({behavior:'smooth'});
  }

  function boot(){ ensureBtns(); }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
