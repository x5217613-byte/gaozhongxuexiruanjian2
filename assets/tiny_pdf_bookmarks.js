
/* TinyPDF v1 — minimal PDF writer with JPEG pages & nested outlines */
window.TinyPDF = (function(){
  function enc(s){ return new TextEncoder().encode(s); }
  function concat(arrs){ let n=0; arrs.forEach(a=> n+=a.length); const out=new Uint8Array(n); let o=0; arrs.forEach(a=>{ out.set(a,o); o+=a.length; }); return out; }
  function b64bytes(b64){ const b=atob(b64); const u=new Uint8Array(b.length); for(let i=0;i<b.length;i++) u[i]=b.charCodeAt(i); return u; }
  function esc(s){ return (s||'').replace(/([()\\])/g,'\\$1'); }

  function Writer(){
    this.parts=[]; this.offsets=[0]; this.cursor=0; this.objIndex=1;
  }
  Writer.prototype.addPart=function(u8){ this.parts.push(u8); this.cursor+=u8.length; }
  Writer.prototype.addObj=function(bodyU8){
    const id=this.objIndex++;
    const head=enc(id+' 0 obj\n'); const tail=enc('\nendobj\n');
    this.offsets.push(this.cursor);
    this.addPart(head); this.addPart(bodyU8); this.addPart(tail);
    return id;
  };
  Writer.prototype.addStreamObj=function(dictStr, streamBytes){
    const id=this.objIndex++;
    const head=enc(id+' 0 obj\n'+dictStr+'\nstream\n'); const tail=enc('\nendstream\nendobj\n');
    this.offsets.push(this.cursor);
    this.addPart(head); this.addPart(streamBytes); this.addPart(tail);
    return id;
  };
  Writer.prototype.finish=function(rootId){
    const header = enc('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n');
    const all = [header].concat(this.parts);
    let running = header.length;
    const offs=[0];
    for(let i=1;i<this.offsets.length;i++){ offs.push(running + this.offsets[i]); }
    const total = offs.length;
    let xref='xref\n0 '+total+'\n';
    xref += '0000000000 65535 f \n';
    for(let i=1;i<total;i++){ xref += (String(offs[i]).padStart(10,'0') + ' 00000 n \n'); }
    const xrefU8 = enc(xref);
    const trailer = enc('trailer\n<< /Size '+total+' /Root '+rootId+' 0 R >>\nstartxref\n'+(header.length + this.cursor)+'\n%%EOF');
    return new Blob(concat(all.concat([xrefU8, trailer])), {type:'application/pdf'});
  };

  async function exportJPEGPagesWithBookmarksOrdered(pages, outline, filename='export.pdf'){
    const norm = await Promise.all(pages.map(async p=>{
      if (p.jpegBytes) return p;
      const img = new Image(); await new Promise((res,rej)=>{ img.onload=res; img.onerror=rej; img.src=p.dataURL; });
      return { w: p.w || img.naturalWidth || 794, h: p.h || img.naturalHeight || 1122, jpegBytes: b64bytes(p.dataURL.split(',')[1]), title: p.title || '' };
    }));

    const w = new Writer();
    const cat1 = w.addObj(enc('<< /Type /Catalog /Pages 2 0 R >>')); // id=1
    const pagesId = w.addObj(enc('<< /Type /Pages /Kids [] /Count 0 >>')); // id=2

    const pageIds=[];
    for (let i=0;i<norm.length;i++){
      const p=norm[i];
      const imgId = w.addStreamObj('<< /Type /XObject /Subtype /Image /Width '+p.w+' /Height '+p.h+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+p.jpegBytes.length+' >>', p.jpegBytes);
      const content = enc('q\n'+p.w+' 0 0 '+p.h+' 0 0 cm\n/Im'+imgId+' Do\nQ\n');
      const contId = w.addStreamObj('<< /Length '+content.length+' >>', content);
      const pageId = w.addObj(enc('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+p.w+' '+p.h+'] /Resources << /XObject << /Im'+imgId+' '+imgId+' 0 R >> >> /Contents '+contId+' 0 R >>'));
      pageIds.push(pageId);
    }

    function outlineObj(o){
      const parts=[ '/Title ('+esc(o.title||'')+')', '/Parent '+o.parent+' 0 R', '/Dest ['+o.dest+' 0 R /Fit]' ];
      if (o.prev) parts.push('/Prev '+o.prev+' 0 R');
      if (o.next) parts.push('/Next '+o.next+' 0 R');
      if (o.first) parts.push('/First '+o.first+' 0 R');
      if (o.last)  parts.push('/Last '+o.last+' 0 R');
      if (typeof o.count==='number') parts.push('/Count '+o.count);
      return enc('<< '+parts.join(' ')+' >>');
    }

    // 3-level outline: groups -> knowledge -> items
    outline = outline || [];
    const groupIds=[]; const knowledgeIds=[]; const itemIds=[];
    for (let gi=0; gi<outline.length; gi++){
      const g=outline[gi];
      const gid = w.addObj(outlineObj({ title:g.title||('组'+(gi+1)), parent:3, dest: pageIds[g.pageIndex||0], count: (g.children||[]).length }));
      groupIds.push(gid);
      const karr=[]; const iarr=[];
      for (let ki=0; ki<(g.children||[]).length; ki++){
        const kNode=g.children[ki];
        const kid = w.addObj(outlineObj({ title:kNode.title||('知识点'+(ki+1)), parent: gid, dest: pageIds[kNode.pageIndex||0], count: (kNode.items||[]).length }));
        karr.push(kid);
        const items=[];
        for (let qi=0; qi<(kNode.items||[]).length; qi++){
          const it=kNode.items[qi];
          const iid = w.addObj(outlineObj({ title: it.title || ('题'+(qi+1)), parent: kid, dest: pageIds[it.pageIndex||0] }));
          items.push(iid);
        }
        iarr.push(items);
      }
      knowledgeIds.push(karr); itemIds.push(iarr);
    }

    // Outlines root
    const outlinesRootId = w.addObj(enc('<< /Type /Outlines /Count '+groupIds.length+' /First '+(groupIds[0] or '0')+' 0 R /Last '+(groupIds[groupIds.length-1] or '0')+' 0 R >>'));
    // Final catalog (points to outlines too)
    const catalogId = w.addObj(enc('<< /Type /Catalog /Pages 2 0 R /Outlines '+outlinesRootId+' 0 R /PageMode /UseOutlines >>'));

    // Rewrite Pages (object 2) with Kids/Count by appending a second def (readers accept last one)
    const kids = pageIds.map(id=> id+' 0 R').join(' ');
    w.addPart(enc('2 0 obj\n<< /Type /Pages /Kids ['+kids+'] /Count '+pageIds.length+' >>\nendobj\n'));

    const blob = w.finish(catalogId);
    const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=filename; a.click();
    setTimeout(()=> URL.revokeObjectURL(a.href), 2000);
  }

  return { exportJPEGPagesWithBookmarks: exportJPEGPagesWithBookmarksOrdered };
})();
