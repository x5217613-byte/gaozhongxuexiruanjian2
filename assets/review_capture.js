
(function(){
  const KEY='review_items';
  const RC = {
    _load(){ try{ return JSON.parse(localStorage.getItem(KEY)||'{}'); }catch(e){ return {}; } },
    _save(o){ try{ localStorage.setItem(KEY, JSON.stringify(o)); }catch(e){} },
    addWrong(item){
      const o=this._load();
      const day = (item && item.date) || (new Date().toISOString().slice(0,10));
      o[day] = o[day] || [];
      const subj = (item.subject||'english');
      const sig = subj+'|'+(item.subtype||'')+'|'+(item.id||'')+'|'+(item.file||'');
      if (!o[day].some(x=> ((x.subtype||'')+'|'+(x.id||'')+'|'+(x.file||''))===sig )){
        o[day].push({subject:subj, subtype:item.subtype, id:item.id, title:item.title, file:item.file, snippet:item.snippet||''});
        this._save(o);
      }
    },
    getWrongByDate(dayISO){
      const o=this._load();
      return (o[dayISO]||[]).slice();
    },
    getAll(){ return this._load(); },
    clear(dayISO=null){
      if (!dayISO){ localStorage.removeItem(KEY); return; }
      const o=this._load();
      delete o[dayISO]; this._save(o);
    }
  };
  window.ReviewCapture = RC;
})();
