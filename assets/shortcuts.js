
(function(){
  // Key map: Z=undo (Ctrl/Cmd+Z), Y=redo (Ctrl/Cmd+Y), +/- brush, [ ] layer cycle, 0/9 zoom +/-
  function ready(fn){ if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }
  function hook(){
    window.addEventListener('keydown', (e)=>{
      const cmd = e.ctrlKey || e.metaKey;
      if (cmd && e.key.toLowerCase()==='z'){ e.preventDefault(); document.dispatchEvent(new CustomEvent('hw:undo')); return; }
      if ((cmd && e.key.toLowerCase()==='y') || (cmd && e.shiftKey && e.key.toLowerCase()==='z')){ e.preventDefault(); document.dispatchEvent(new CustomEvent('hw:redo')); return; }
      if (e.key==='+'){ document.dispatchEvent(new CustomEvent('hw:brushDelta', {detail: +1})); }
      if (e.key==='-'){ document.dispatchEvent(new CustomEvent('hw:brushDelta', {detail: -1})); }
      if (e.key==='['){ document.dispatchEvent(new CustomEvent('hw:layerPrev')); }
      if (e.key===']'){ document.dispatchEvent(new CustomEvent('hw:layerNext')); }
      if (e.key==='9'){ document.dispatchEvent(new CustomEvent('hw:zoomDelta', {detail: -0.1})); }
      if (e.key==='0'){ document.dispatchEvent(new CustomEvent('hw:zoomDelta', {detail: +0.1})); }
    });
  }
  ready(hook);
})();
