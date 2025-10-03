
(function(){
  function btn(id, text, on){
    if (document.getElementById(id)) return;
    const bar = document.getElementById('wbPrintToolbar') || (function(){ const d=document.createElement('div'); d.id='wbPrintToolbar'; d.style.position='fixed'; d.style.right='16px'; d.style.bottom='16px'; d.style.zIndex=9999; d.style.display='flex'; d.style.gap='8px'; document.body.appendChild(d); return d; })();
    const b=document.createElement('button'); b.id=id; b.textContent=text; b.style.padding='8px 12px'; b.style.border='1px solid #ddd'; b.style.borderRadius='999px'; b.style.background='#fff'; b.style.boxShadow='0 6px 16px rgba(0,0,0,.12)'; b.onclick=on; bar.appendChild(b);
  }
  btn('wbPdfExport', '打印/导出PDF', ()=> window.print());
})();
