
/* sync_adapters_plus.js — token WebDAV + Dropbox + OneDrive */
(function(){
  function ready(fn){ if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }
  function load(name){ try{ return JSON.parse(localStorage.getItem(name)||'{}'); }catch(e){ return {}; } }
  function pick(){ return { hwpro_v1: load('hwpro_v1'), hwpro_presets_v1: (function(){ try{ return JSON.parse(localStorage.getItem('hwpro_presets_v1')||'[]'); }catch(e){ return []; } })() }; }

  function extendPanel(){
    const p = document.getElementById('hwSyncPanel');
    if (!p || p.__syncPlus) return;
    p.__syncPlus = true;
    const sec = document.createElement('div'); sec.style.marginTop='8px'; sec.style.borderTop='1px dashed #eee'; sec.style.paddingTop='8px';
    sec.innerHTML = `
      <div style="font-weight:700;margin-bottom:6px;">云端适配器（PLUS）</div>
      <div style="display:flex; gap:6px; flex-wrap:wrap;">
        <label>WebDAV URL <input id="davUrl2" placeholder="https://dav.example.com/handwrite.json"></label>
        <label>Authorization <input id="davAuth2" placeholder="Basic xxx 或 Bearer xxx"></label>
        <button class="hw-btn" id="davUp2">PUT 上传</button>
        <button class="hw-btn" id="davDown2">GET 合并</button>
      </div>
      <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:6px;">
        <label>Dropbox Token <input id="dbxTok" placeholder="sl.B..."></label>
        <label>路径 <input id="dbxPath" placeholder="/Apps/YourApp/handwrite.json"></label>
        <button class="hw-btn" id="dbxUp">上传</button>
        <button class="hw-btn" id="dbxDown">下载合并</button>
      </div>
      <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:6px;">
        <label>OneDrive Token <input id="odTok" placeholder="eyJ..."></label>
        <label>路径 <input id="odPath" placeholder="/Documents/handwrite.json"></label>
        <button class="hw-btn" id="odUp">上传</button>
        <button class="hw-btn" id="odDown">下载合并</button>
      </div>
      <div style="font-size:12px;color:#666;margin-top:4px;">注意：需后端/API 允许 CORS。若受限，请使用同源部署或本地代理。</div>
    `;
    p.appendChild(sec);

    // WebDAV (token in Authorization)
    p.querySelector('#davUp2').onclick = async ()=>{
      const url = p.querySelector('#davUrl2').value.trim();
      const auth= p.querySelector('#davAuth2').value.trim();
      if (!url) return alert('请填写 WebDAV URL');
      try{
        const res = await fetch(url, { method:'PUT', headers:{ 'Authorization': auth, 'Content-Type':'application/json' }, body: JSON.stringify(pick()) });
        alert('WebDAV 上传状态：'+res.status);
      }catch(e){ alert('上传失败：'+e); }
    };
    p.querySelector('#davDown2').onclick = async ()=>{
      const url = p.querySelector('#davUrl2').value.trim();
      const auth= p.querySelector('#davAuth2').value.trim();
      if (!url) return alert('请填写 WebDAV URL');
      try{
        const res = await fetch(url, { headers:{ 'Authorization': auth } });
        const obj = await res.json();
        const cur = load('hwpro_v1'); Object.assign(cur, obj.hwpro_v1||{}); localStorage.setItem('hwpro_v1', JSON.stringify(cur));
        if (obj.hwpro_presets_v1) localStorage.setItem('hwpro_presets_v1', JSON.stringify(obj.hwpro_presets_v1));
        alert('已从 WebDAV 合并数据');
      }catch(e){ alert('下载失败：'+e); }
    };

    // Dropbox
    async function dbxUpload(tok, path){
      const url = 'https://content.dropboxapi.com/2/files/upload';
      const res = await fetch(url, {
        method:'POST',
        headers:{
          'Authorization':'Bearer '+tok,
          'Dropbox-API-Arg': JSON.stringify({path, mode:'overwrite', mute:true}),
          'Content-Type':'application/octet-stream'
        },
        body: new Blob([JSON.stringify(pick())], {type:'application/json'})
      });
      return res.status;
    }
    async function dbxDownload(tok, path){
      const url = 'https://content.dropboxapi.com/2/files/download';
      const res = await fetch(url, {
        method:'POST',
        headers:{ 'Authorization':'Bearer '+tok, 'Dropbox-API-Arg': JSON.stringify({path}) }
      });
      const txt = await res.text();
      try{ return JSON.parse(txt); }catch(e){ throw new Error('解析失败: '+txt.slice(0,80)); }
    }
    p.querySelector('#dbxUp').onclick = async ()=>{
      try{ const st = await dbxUpload(p.querySelector('#dbxTok').value.trim(), p.querySelector('#dbxPath').value.trim()); alert('Dropbox 上传状态：'+st); }catch(e){ alert('Dropbox 失败：'+e); }
    };
    p.querySelector('#dbxDown').onclick = async ()=>{
      try{
        const obj = await dbxDownload(p.querySelector('#dbxTok').value.trim(), p.querySelector('#dbxPath').value.trim());
        const cur = load('hwpro_v1'); Object.assign(cur, obj.hwpro_v1||{}); localStorage.setItem('hwpro_v1', JSON.stringify(cur));
        if (obj.hwpro_presets_v1) localStorage.setItem('hwpro_presets_v1', JSON.stringify(obj.hwpro_presets_v1));
        alert('已从 Dropbox 合并数据');
      }catch(e){ alert('Dropbox 失败：'+e); }
    };

    // OneDrive (Graph)
    async function odUpload(tok, path){
      const url = 'https://graph.microsoft.com/v1.0/me/drive/root:'+encodeURI(path)+':/content';
      const res = await fetch(url, { method:'PUT', headers:{ 'Authorization':'Bearer '+tok, 'Content-Type':'application/json' }, body: JSON.stringify(pick()) });
      return res.status;
    }
    async function odDownload(tok, path){
      const url = 'https://graph.microsoft.com/v1.0/me/drive/root:'+encodeURI(path)+':/content';
      const res = await fetch(url, { headers:{ 'Authorization':'Bearer '+tok } });
      return await res.json();
    }
    p.querySelector('#odUp').onclick = async ()=>{
      try{ const st = await odUpload(p.querySelector('#odTok').value.trim(), p.querySelector('#odPath').value.trim()); alert('OneDrive 上传状态：'+st); }catch(e){ alert('OneDrive 失败：'+e); }
    };
    p.querySelector('#odDown').onclick = async ()=>{
      try{
        const obj = await odDownload(p.querySelector('#odTok').value.trim(), p.querySelector('#odPath').value.trim());
        const cur = load('hwpro_v1'); Object.assign(cur, obj.hwpro_v1||{}); localStorage.setItem('hwpro_v1', JSON.stringify(cur));
        if (obj.hwpro_presets_v1) localStorage.setItem('hwpro_presets_v1', JSON.stringify(obj.hwpro_presets_v1));
        alert('已从 OneDrive 合并数据');
      }catch(e){ alert('OneDrive 失败：'+e); }
    };
  }

  function hook(){ const mo=new MutationObserver(()=> extendPanel()); mo.observe(document.body, {childList:true, subtree:true}); }
  ready(hook);
})();
