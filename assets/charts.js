
(function(){
  function drawBar(el, data){
    const c = document.createElement('canvas'); c.width=300; c.height=120; el.appendChild(c);
    const ctx = c.getContext('2d'); const w=c.width, h=c.height;
    ctx.clearRect(0,0,w,h);
    const max = Math.max(1, ...data.map(d=>d.v));
    const bw = Math.floor((w-40)/data.length);
    ctx.strokeStyle='#e5e7eb'; ctx.beginPath(); ctx.moveTo(30,10); ctx.lineTo(30,h-20); ctx.lineTo(w-10,h-20); ctx.stroke();
    data.forEach((d,i)=>{
      const x = 35 + i*bw; const y = (h-22) - Math.round((h-40)*d.v/max);
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--brand') || '#3a7afe';
      ctx.fillRect(x, y, Math.max(12, bw-10), (h-22)-y);
    });
  }
  function drawLine(el, data){
    const c = document.createElement('canvas'); c.width=300; c.height=120; el.appendChild(c);
    const ctx = c.getContext('2d'); const w=c.width, h=c.height;
    ctx.clearRect(0,0,w,h);
    const max = Math.max(1, ...data.map(d=>d.v));
    ctx.strokeStyle='#e5e7eb'; ctx.beginPath(); ctx.moveTo(30,10); ctx.lineTo(30,h-20); ctx.lineTo(w-10,h-20); ctx.stroke();
    ctx.beginPath();
    data.forEach((d,i)=>{
      const x = 35 + i*((w-50)/Math.max(1,data.length-1)); const y = (h-22) - Math.round((h-40)*d.v/max);
      i? ctx.lineTo(x,y) : ctx.moveTo(x,y);
    });
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--brand') || '#3a7afe';
    ctx.lineWidth=2; ctx.stroke();
  }
  window.DashCharts = { drawBar, drawLine };
})();
