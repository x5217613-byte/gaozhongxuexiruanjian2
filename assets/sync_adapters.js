
/* sync_adapters.js — integrate simple WebDAV and generic HTTP POST into existing Sync panel */
(function(){
  function ready(fn){ if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }
  function load(name){ try{ return JSON.parse(localStorage.getItem(name)||'{}'); }catch(e){ return {}; } }
  function save(name, obj){ try{ localStorage.setItem(name, JSON.stringify(obj)); }catch(e){} }

  function ensurePanel(){
    const id='hwSyncPanel';
    const hook = ()=>{
      const panel = document.getElementById(id);
      if (!panel || panel.__syncExt) return;
      panel.__syncExt = true;
      const sec = document.createElement('div'); sec.style.marginTop='8px'; sec.style.borderTop='1px dashed #eee'; sec.style.paddingTop='8px';
      sec.innerHTML = `
        <div style="font-weight:700;margin-bottom:6px;">云端适配器</div>
        <div style="display:flex; gap:6px; flex-wrap:wrap;">
          <label>WebDAV URL <input id="davUrl" placeholder="https://example.com/remote.php/dav/files/xxx/handwrite.json"></label>
          <label>用户名 <input id="davUser" placeholder="user"></label>
          <label>密码 <input id="davPass" type="password" placeholder="password"></label>
          <button class="hw-btn" id="davUp">上传 JSON</button>
          <button class="hw-btn" id="davDown">下载并合并</button>
        </div>
        <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:6px;">
          <label>HTTP POST 端点 <input id="postUrl" placeholder="https://api.example.com/upload"></label>
          <button class="hw-btn" id="postSend">POST 上传</button>
        </div>
        <div style="font-size:12px;color:#666;margin-top:4px;">说明：需后端允许 CORS。若浏览器拦截，请使用同源部署或通过本地服务器代理。</div>
      `;
      panel.appendChild(sec);

      const pick = ()=> ({
        hwpro_v1: load('hwpro_v1'),
        hwpro_presets_v1: (function(){ try{ return JSON.parse(localStorage.getItem('hwpro_presets_v1')||'[]'); }catch(e){ return []; } })()
      });

      panel.querySelector('#davUp').onclick = async ()=>{
        const url = panel.querySelector('#davUrl').value.trim();
        const u = panel.querySelector('#davUser').value.trim();
        const p = panel.querySelector('#davPass').value;
        if (!url) return alert('请填写 WebDAV URL');
        try{
          const res = await fetch(url, {
            method:'PUT',
            headers:{ 'Authorization': 'Basic ' + btoa(u+':'+p), 'Content-Type':'application/json' },
            body: JSON.stringify(pick())
          });
          alert('WebDAV 上传状态：' + res.status);
        }catch(e){ alert('上传失败：' + e); }
      };
      panel.querySelector('#davDown').onclick = async ()=>{
        const url = panel.querySelector('#davUrl').value.trim();
        const u = panel.querySelector('#davUser').value.trim();
        const p = panel.querySelector('#davPass').value;
        if (!url) return alert('请填写 WebDAV URL');
        try{
          const res = await fetch(url, { headers:{ 'Authorization': 'Basic ' + btoa(u+':'+p) } });
          const obj = await res.json();
          const cur = load('hwpro_v1'); Object.assign(cur, obj.hwpro_v1||{}); localStorage.setItem('hwpro_v1', JSON.stringify(cur));
          if (obj.hwpro_presets_v1) localStorage.setItem('hwpro_presets_v1', JSON.stringify(obj.hwpro_presets_v1));
          alert('已从 WebDAV 合并数据');
        }catch(e){ alert('下载/合并失败：' + e); }
      };
      panel.querySelector('#postSend').onclick = async ()=>{
        const url = panel.querySelector('#postUrl').value.trim();
        if (!url) return alert('请填写 POST 端点');
        try{
          const res = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(pick()) });
          alert('POST 上传状态：' + res.status);
        }catch(e){ alert('POST 上传失败：' + e); }
      };
    };
    const mo = new MutationObserver(hook);
    mo.observe(document.body, {childList:true, subtree:true});
  }

  ready(ensurePanel);
})();
