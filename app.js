const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

// Tabs
$$('nav button').forEach(btn => {
  btn.addEventListener('click', () => {
    $$('.tab').forEach(t => t.classList.remove('active'));
    $$('nav button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    $('#' + btn.dataset.tab).classList.add('active');
  });
});

// PWA
const POLICY_URL = 'policy/policy_review_v1.json';
let __policy = null;
async function loadPolicy(){ try{ __policy = await fetchJSONWithWorker(POLICY_URL); }catch(e){ __policy=null; } }
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./service-worker.js')
    .then(()=>$('#swStatus').textContent='已启用离线')
    .catch(()=>$('#swStatus').textContent='SW失败');
}

// Worker for JSON parse
const worker = new Worker('parser.worker.js');

async function fetchJSONWithWorker(path){
  const res = await fetch(path);
  const text = await res.text();
  return new Promise((resolve) => {
    const onMsg = (e)=>{
      worker.removeEventListener('message', onMsg);
      if (e.data && e.data.ok) resolve(e.data.data);
      else resolve(JSON.parse(text)); // fallback
    };
    worker.addEventListener('message', onMsg);
    worker.postMessage({text});
  });
}

const manifestUrl = 'data_manifest.json';
let manifest = null;
let state = {
  practice: { data: [], filtered: [], page: 1, pageSize: 20, file: null },
  wrongbook: []
};

// Progress & wrongbook storage helpers
const LS_PROGRESS = 'hs_progress_v1';
const LS_WRONG = 'hs_wrong_v1';

function loadProgress(){
  try { return JSON.parse(localStorage.getItem(LS_PROGRESS) || '{}'); } catch{ return {}; }
}
function saveProgress(p){ localStorage.setItem(LS_PROGRESS, JSON.stringify(p)); }
function loadWrong(){ try { return JSON.parse(localStorage.getItem(LS_WRONG) || '[]'); } catch{ return []; } }
function saveWrong(arr){ localStorage.setItem(LS_WRONG, JSON.stringify(arr)); }

async function loadManifest(){
  manifest = await fetchJSONWithWorker(manifestUrl);
  // Fill selects
  const fill = (id, arr) => {
    const sel = $(id);
    sel.innerHTML = '';
    (arr||[]).forEach(p => {
      const opt = document.createElement('option');
      opt.value = p;
      opt.textContent = p.replace(/^data\//,'');
      sel.appendChild(opt);
    });
  };
  fill('#practiceSelect', manifest.practice || []);
  fill('#materialsSelect', manifest.materials || []);
  fill('#essaysSelect', manifest.essays || []);
  fill('#plansSelect', manifest.weekly_plans || []);
  // init wrongbook
  state.wrongbook = loadWrong();
  renderWrong();
}

function unifyQuestion(q){
  return {
    id: q.id || q.qid || null,
    type: q.type || 'single',
    stem: q.stem || '',
    options: q.options || [],
    answer: (q.answer!==undefined ? q.answer : null),
    explanation: q.explanation || q.marking_guide || q.solution || '',
    tags: q.tags || [],
    difficulty: q.difficulty || null,
    points: q.points || null,
    time_suggest: q.time_suggest || null,
    source: q.source || q.file || ''
  };
}

function applyFilters(){
  const kw = $('#practiceSearch').value.trim();
  const typ = $('#practiceType').value;
  let arr = state.practice.data.map(unifyQuestion);
  if (typ) arr = arr.filter(x => (x.type===typ));
  if (kw) arr = arr.filter(x => (x.stem && x.stem.includes(kw)));
  state.practice.filtered = arr;
  state.practice.page = 1;
  renderPracticePage();
}

function renderPracticePage(){
  const listEl = $('#practiceList');
  listEl.innerHTML = '';
  const {filtered, page, pageSize} = state.practice;
  const total = filtered.length;
  const start = (page-1)*pageSize;
  const end = Math.min(start+pageSize, total);
  $('#pageInfo').textContent = `${page}/${Math.max(1, Math.ceil(total/pageSize))} · 共${total}题`;

  const progress = loadProgress()[state.practice.file || ''] || {};
  for (let i=start;i<end;i++){
    const q = unifyQuestion(filtered[i]);
    const card = document.createElement('div');
    card.className = 'card';
    const opts = (q.options||[]).map((op,idx)=>{
      const key = `${q.id||i}_${idx}`;
      return `<label class="option"><input type="radio" name="q_${i}" value="${idx}"> ${String.fromCharCode(65+idx)}. ${typeof op==='string'?op:JSON.stringify(op)}</label>`;
    }).join('');
    const done = progress[q.id||i]?.done;
    const verdict = progress[q.id||i]?.correct;
    card.innerHTML = `
      <h3>#${i+1} ${q.stem}</h3>
      ${opts}
      <div class="q">
        <button data-i="${i}" class="submitBtn">提交本题</button>
        ${done ? `<span class="badge">${verdict?'√ 已正确':'× 已错误'}</span>`:''}
        ${q.explanation ? `<details style="margin-top:6px"><summary>展开解析</summary><p>${q.explanation}</p></details>`:''}
      </div>
    `;
    listEl.appendChild(card);
  }

  // bind submit buttons
  $$('#practiceList .submitBtn').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = parseInt(btn.dataset.i, 10);
      const q = unifyQuestion(state.practice.filtered[i]);
      const chosen = $$(`input[name="q_${i}"]:checked`)[0];
      if (!chosen) { alert('先选择一个选项'); return; }
      const ans = parseInt(chosen.value, 10);
      const correct = (q.answer === ans) || (Array.isArray(q.answer) && q.answer.includes(ans));
      // Visual feedback
      const options = btn.closest('.card').querySelectorAll('.option');
      options.forEach((el, idx)=>{
        el.classList.remove('correct','wrong');
        if (q.answer===idx || (Array.isArray(q.answer) && q.answer.includes(idx))) el.classList.add('correct');
        if (idx===ans && !correct) el.classList.add('wrong');
      });
      // Save progress
      const prog = loadProgress();
      const key = state.practice.file || '';
      prog[key] = prog[key] || {};
      prog[key][q.id||i] = { done: true, correct: !!correct, ts: Date.now() };
      saveProgress(prog);
      // Wrongbook
      if (!correct){
        const wb = loadWrong();
        wb.push({ file: key, id: q.id||i, stem: q.stem, chosen: ans, answer: q.answer });
        saveWrong(wb);
        state.wrongbook = wb;
        renderWrong();
      }
      // Badge
      btn.insertAdjacentHTML('afterend', `<span class="badge">${correct?'√ 正确':'× 错误'}</span>`);
    });
  });
}

$('#prevPage').addEventListener('click', ()=>{
  if (state.practice.page>1){ state.practice.page--; renderPracticePage(); }
});
$('#nextPage').addEventListener('click', ()=>{
  const total = state.practice.filtered.length;
  const maxPage = Math.max(1, Math.ceil(total/state.practice.pageSize));
  if (state.practice.page<maxPage){ state.practice.page++; renderPracticePage(); }
});
$('#practiceSearch').addEventListener('input', ()=>applyFilters());
$('#practiceType').addEventListener('change', ()=>applyFilters());

// Timer
let timerId = null, left = 0;
function startTimer(min, el){
  if (timerId) clearInterval(timerId);
  left = min*60;
  el.textContent = `剩余 ${min}:00`;
  timerId = setInterval(()=>{
    left--;
    const m = String(Math.floor(left/60)).padStart(2,'0');
    const s = String(left%60).padStart(2,'0');
    el.textContent = `剩余 ${m}:${s}`;
    if (left<=0){ clearInterval(timerId); timerId=null; alert('时间到！'); }
  },1000);
}
$('#startTimer').addEventListener('click', ()=>startTimer(45, $('#timer')));
$('#startTimerMat').addEventListener('click', ()=>startTimer(25, $('#timerMat')));

// Loaders
$('#loadPractice').addEventListener('click', async () => {
  const p = $('#practiceSelect').value;
  state.practice.file = p;
  const raw = await fetchJSONWithWorker(p);
  state.practice.data = Array.isArray(raw) ? raw : (raw.items||[]);
  applyFilters();
});

$('#loadMaterials').addEventListener('click', async () => {
  const p = $('#materialsSelect').value;
  const data = await fetchJSONWithWorker(p);
  const c = $('#materialsContainer');
  c.innerHTML = '';
  (Array.isArray(data) ? data : [data]).slice(0,20).forEach((unit, idx)=>{
    const src = unit.source || unit.sources || '';
    const qs = (unit.questions||[]).map((q,i)=>`<div class="q"><strong>Q${i+1}.</strong> ${(q.stem||'')}</div>`).join('');
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `<h3>材料集 #${idx+1} · ${unit.id||''}</h3><p>${src}</p>${qs}`;
    c.appendChild(card);
  });
});

$('#loadEssays').addEventListener('click', async () => {
  const p = $('#essaysSelect').value;
  const data = await fetchJSONWithWorker(p);
  const c = $('#essaysContainer');
  c.innerHTML = '';
  (Array.isArray(data) ? data : [data]).slice(0, 30).forEach((e, idx)=>{
    const rubric = e.scoring_rubric ? Object.entries(e.scoring_rubric).map(([k,v])=>`<span class="badge">${k} {${v}}</span>`).join(' ') : '';
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `<h3>#${idx+1} · ${(e.title||e.id||'')}</h3>
      <p><strong>任务：</strong>${e.prompt||''}</p>
      ${e.outline ? `<p><strong>大纲：</strong>${(e.outline||[]).join(' · ')}</p>`:''}
      ${rubric ? `<p><strong>评分：</strong>${rubric}</p>`:''}
      ${e.tips ? `<p><strong>提示：</strong>${(e.tips||[]).join('；')}</p>`:''}`;
    c.appendChild(card);
  });
});

$('#loadPlans').addEventListener('click', async () => {
  const p = $('#plansSelect').value;
  const data = await fetchJSONWithWorker(p);
  const c = $('#plansContainer');
  c.innerHTML = '';
  (data.weekly_plan||[]).forEach((d, idx)=>{
    // 统一映射显示
    const primary = d.material_set || d.practice_a || d.primary_task || null;
    const secondary = d.mini_essay || d.practice_b || d.secondary_task || null;
    const full = d.full_essay || d.full_set || d.full_task || null;
    const pretty = JSON.stringify({day:d.day, primary, secondary, full}, null, 2);
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `<h3>${d.day || 'Day '+(idx+1)}</h3><pre>${pretty}</pre>`;
    c.appendChild(card);
  });
});

// Wrongbook
function renderWrong(){
  const c = $('#wrongContainer');
  c.innerHTML = '';
  (state.wrongbook||[]).slice(-100).reverse().forEach((w, idx)=>{
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `<h3>#${idx+1} ${w.stem || ''}</h3>
      <p><span class="badge">文件：${w.file||''}</span>
      <span class="badge">你的答案：${w.chosen}</span>
      <span class="badge">正确答案：${Array.isArray(w.answer)?w.answer.join(','):w.answer}</span></p>`;
    c.appendChild(card);
  });
}
$('#exportWrong').addEventListener('click', ()=>{
  const blob = new Blob([JSON.stringify(loadWrong(), null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'wrongbook.json'; a.click();
  URL.revokeObjectURL(url);
});
$('#importWrongBtn').addEventListener('click', ()=>$('#importWrong').click());
$('#importWrong').addEventListener('change', e=>{
  const file = e.target.files[0]; if (!file) return;
  const fr = new FileReader();
  fr.onload = ()=>{ try{ const arr = JSON.parse(fr.result); saveWrong(arr); state.wrongbook = arr; renderWrong(); }catch{} };
  fr.readAsText(file);
});
$('#clearWrong').addEventListener('click', ()=>{ saveWrong([]); state.wrongbook=[]; renderWrong(); });

// Progress import/export
$('#exportProgress').addEventListener('click', ()=>{
  const blob = new Blob([JSON.stringify(loadProgress(), null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'progress.json'; a.click();
  URL.revokeObjectURL(url);
});
$('#importProgressBtn').addEventListener('click', ()=>$('#importProgress').click());
$('#importProgress').addEventListener('change', e=>{
  const file = e.target.files[0]; if (!file) return;
  const fr = new FileReader();
  fr.onload = ()=>{ try{ const obj = JSON.parse(fr.result); saveProgress(obj); alert('导入成功'); }catch{ alert('导入失败'); } };
  fr.readAsText(file);
});


// ------- Review Plan Generator (from wrongbook) -------
function detectSubjectFromFile(name){
  if (!name) return 'mixed';
  const s = name.toLowerCase();
  if (s.includes('math')) return 'math';
  if (s.includes('english')) return 'english';
  if (s.includes('chinese')) return 'chinese';
  if (s.includes('history')) return 'history';
  if (s.includes('geography')) return 'geography';
  if (s.includes('politics')) return 'politics';
  if (s.includes('physics')) return 'physics';
  if (s.includes('chemistry')) return 'chemistry';
  if (s.includes('biology')) return 'biology';
  return 'mixed';
}

function chunk(arr, n){
  const out = [];
  const size = Math.ceil(arr.length / n);
  for (let i=0;i<n;i++){
    out.push(arr.slice(i*size, (i+1)*size));
  }
  return out;
}

function generateReviewPlan(){
  const DAYS = ["周一","周二","周三","周四","周五","周六","周日"];
  // load wrongbook and ensure schema
  let wb = loadWrong();
  if ((!wb || wb.length===0) && window.wrongbookImported) wb = window.wrongbookImported;
  if (!wb || wb.length===0){ alert('错题本为空，请先练习或导入 wrongbook.json'); return null; }
  wb = wb.map(x=>x||{}); // defensively
  // weights & cap
  const conf = getUIWeightsOrPolicy();
  const stats = buildStats(wb);
  // score items
  const scored = wb.map(w => ({...w, __score: scoreWrong(w, conf.w, stats)}));
  scored.sort((a,b)=> b.__score - a.__score);

  const modeSel = $('#policyModeSelect');
  const mode = (modeSel && modeSel.value) || 'standard';
  const policy = (__policy && __policy.modes && __policy.modes[mode]) ? __policy.modes[mode] : { daily_target:{review_count:30, practice_count:15}, time:{min:60, max:90} };
  const perDay = policy.daily_target.review_count;

  // distribute with cap per day by round-robin windows
  const plan = { subject: "review_mixed", weekly_plan: [] };
  let cursor = 0;
  for (let i=0; i<7; i++){
    const windowItems = scored.slice(cursor, cursor + perDay*3); // take a window to allow cap filtering
    const chosen = selectWithCap(windowItems, perDay, conf.capPercent);
    cursor += chosen.length;
    const primary = { type:"review_set", items: chosen.map(({file,id,stem})=>({file,id,stem})) };
    const secondary = { type:"recap", requirement:"回顾错因，补记错因卡片，二次练习易混题各2题" };
    plan.weekly_plan.push({
      day: DAYS[i],
      primary_task: primary,
      secondary_task: secondary,
      time_suggestion: { practice_min: policy.time.min, practice_max: policy.time.max }
    });
  }
  const top = scored.slice(0, Math.min(30, scored.length));
  plan.weekly_plan[6].full_task = { type:"mock_from_wrongbook", items: top.map(({file,id,stem})=>({file,id,stem})), requirement:"综合回炉（30题）+ 错因短评（300字）" };
  window.__reviewPlan = plan;
  return plan;
}

function exportReviewPlan(){
  const plan = window.__reviewPlan || generateReviewPlan();
  if (!plan) return;
  const blob = new Blob([JSON.stringify(plan, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'weekly_plan_review_v1.json'; a.click();
  URL.revokeObjectURL(url);
}

// Bind review buttons
$('#genReviewPlan')?.addEventListener('click', ()=>{
  const p = generateReviewPlan();
  if (!p) return;
  // Render in plans container
  const c = $('#plansContainer');
  c.innerHTML = '';
  p.weekly_plan.forEach((d, idx)=>{
    const card = document.createElement('div');
    card.className = 'card';
    const pretty = JSON.stringify(d, null, 2);
    card.innerHTML = `<h3>${d.day}</h3><pre>${pretty}</pre>`;
    c.appendChild(card);
  });
});
$('#exportReviewPlan')?.addEventListener('click', ()=>exportReviewPlan());
$('#genReviewPlan2')?.addEventListener('click', ()=>{
  const plan = generateReviewPlan();
  if (plan) alert('已生成，可在“一周计划”标签预览，并点“导出回炉计划”保存。');
});
$('#exportReviewPlan2')?.addEventListener('click', ()=>exportReviewPlan());

// Hook importWrong to cache imported content for generator
const _origImport = $('#importWrong')?.onchange;
$('#importWrong')?.addEventListener('change', e=>{
  // After our existing handler runs, try to stash parsed file
  setTimeout(()=>{
    try{ window.wrongbookImported = loadWrong(); }catch{}
  }, 300);
});

// init
loadManifest();
loadPolicy();

// ======== App extensions: wrongbook schema & policy-based weekly plan ========

// Wrongbook schema upgrade (non-destructive)
const WRONG_DEFAULT = {
  tags: [], difficulty: null, time_spent: null,
  first_seen: null, last_seen: null, attempts: 0, correct_streak: 0
};

function migrateWrongSchema(arr){
  if (!Array.isArray(arr)) return [];
  // dedup by file+id and accumulate attempts
  const map = new Map();
  for (const w of arr){
    const key = (w.file||'') + '|' + String(w.id??'');
    const base = map.get(key) || {
      file: w.file || '', id: w.id ?? null, stem: w.stem || '',
      chosen: w.chosen, answer: w.answer,
      tags: Array.isArray(w.tags) ? w.tags : WRONG_DEFAULT.tags.slice(),
      difficulty: (typeof w.difficulty==='number') ? w.difficulty : WRONG_DEFAULT.difficulty,
      time_spent: (typeof w.time_spent==='number') ? w.time_spent : WRONG_DEFAULT.time_spent,
      first_seen: w.first_seen || Date.now(),
      last_seen: w.last_seen || Date.now(),
      attempts: (typeof w.attempts==='number') ? w.attempts : 0,
      correct_streak: (typeof w.correct_streak==='number') ? w.correct_streak : 0
    };
    base.attempts += 1;
    base.last_seen = Date.now();
    map.set(key, base);
  }
  return Array.from(map.values());
}

function ensureWrongSchema(){
  const wb0 = loadWrong() || [];
  const wb = migrateWrongSchema(wb0);
  saveWrong(wb);
  state.wrongbook = wb;
  return wb;
}

// After any submit buttons clicked, auto-upgrade wrongbook shortly after
document.addEventListener('click', (e)=>{
  if (e.target && e.target.classList && e.target.classList.contains('submitBtn')){
    setTimeout(()=>{ try{ ensureWrongSchema(); }catch(e){} }, 250);
  }
});

// ------- Policy-based full weekly plan generator -------
function pickCount(range, mode){
  if (!range || range.length<2) return 20;
  const [lo, hi] = range;
  if (mode==='light') return lo;
  if (mode==='sprint') return hi;
  return Math.round((lo+hi)/2);
}
function findByPrefix(arr, prefix){
  prefix = prefix.toLowerCase();
  return (arr||[]).filter(p => p.toLowerCase().includes(prefix)).map(x => x.replace(/^data\//,'').replace(/^weekly_plans\//,''));
}
function pick(arr, i){ return (arr && arr.length) ? arr[i % arr.length] : null; }

async function ensurePolicyLoaded(){
  if (typeof __policy === 'undefined' || !__policy){
    try{
      __policy = await fetchJSONWithWorker('policy/policy_review_v1.json');
    }catch(e){ __policy = null; }
  }
  return __policy;
}

async function generatePolicyWeeklyPlan(){
  const pol = await ensurePolicyLoaded();
  const modeSel = $('#policyModeSelect');
  const mode = (modeSel && modeSel.value) || 'standard';
  const policy = pol && pol.modes && pol.modes[mode] ? pol.modes[mode] : { daily_target:{review_count:30, practice_count:15}, time:{min:60, max:90} };
  if (!manifest){ alert('manifest 尚未加载'); return null; }

  const days = ["周一","周二","周三","周四","周五","周六","周日"];
  const plan = { subject: `auto_${mode}`, weekly_plan: [] };

  const m = manifest;
  const pPractice = (subj) => findByPrefix(m.practice, `practice_${subj}`);
  const pMaterials = (kw) => findByPrefix(m.materials, kw);
  const pEssays = (subj) => (m.essays||[]).filter(x => x.toLowerCase().includes(subj)).map(x=>x.replace(/^data\//,''));

  const coreSci = ['physics','chemistry','biology'];
  const daySubjects = ['math','english','physics','chemistry','biology','chinese','history']; // Sat: chinese/history
  for (let i=0;i<7;i++){
    const subj = daySubjects[i] || 'geography';
    const d = { day: days[i] };
    if (subj==='math'){
      const files = pPractice('math');
      d.primary_task = { file: pick(files,i), question_count: pickCount(__policy.subject_daily.math?.practice_range, mode) };
      d.secondary_task = { type:'thinking', requirement:'1道压轴思路复盘（写出关键步骤）' };
    } else if (subj==='english'){
      const files = pPractice('english');
      d.primary_task = { file: pick(files,i), topic:'reading', passages: 1 };
      d.secondary_task = { file: pick(files,i+1), topic:'cloze_or_matching', question_count: 1, grammar: 10 };
    } else if (coreSci.includes(subj)){
      const files = pPractice(subj);
      const mats = pMaterials(`${subj}_experiments`) || pMaterials(`${subj}`);
      d.primary_task = mats.length ? { file: pick(mats,i), index: (i%7)+1 } : { file: pick(files,i), question_count: pickCount(__policy.subject_daily[subj]?.practice_range, mode) };
      d.secondary_task = { file: pick(files,i+1), question_count: policy.daily_target.practice_count };
    } else if (subj==='chinese'){
      const mats = pMaterials('materials') || [];
      const essays = pEssays('chinese');
      d.primary_task = { file: pick(mats,i), type:'materials', index:(i%7)+1 };
      d.secondary_task = essays.length ? { file: pick(essays,i), type:'mini_essay' } : { type:'outline', requirement:'写1个作文提纲（总-分-总）' };
    } else if (subj==='history'){
      const mats = pMaterials('history') || pMaterials('materials');
      d.primary_task = { file: pick(mats,i), type:'materials', index:(i%7)+1 };
      d.secondary_task = { file: pick(pPractice('history'),i), question_count: pickCount(__policy.subject_daily.history?.practice_range, mode) };
    } else if (subj==='geography' || subj==='politics'){
      const mats = pMaterials(subj) || pMaterials('materials');
      d.primary_task = { file: pick(mats,i), type:'materials', index:(i%7)+1 };
      d.secondary_task = { file: pick(pPractice(subj),i), question_count: pickCount(__policy.subject_daily[subj]?.practice_range || [10,15], mode) };
    } else {
      d.primary_task = { type:'self_study', requirement:'自学并做同步练习 30 题' };
      d.secondary_task = { type:'recap', requirement:'总结错因卡片' };
    }
    d.time_suggestion = { practice_min: policy.time.min, practice_max: policy.time.max };
    plan.weekly_plan.push(d);
  }
  // Sunday full task
  plan.weekly_plan[6].full_task = { type:'composite', requirement:'综合套题或大作文/实验报告，按策略时间完成' };
  window.__policyPlan = plan;
  return plan;
}

$('#genPolicyPlan')?.addEventListener('click', async ()=>{
  const p = await generatePolicyWeeklyPlan();
  if (!p) return;
  const c = $('#plansContainer'); c.innerHTML='';
  p.weekly_plan.forEach((d)=>{
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `<h3>${d.day}</h3><pre>${JSON.stringify(d,null,2)}</pre>`;
    c.appendChild(card);
  });
});
$('#exportPolicyPlan')?.addEventListener('click', async ()=>{
  const p = window.__policyPlan || await generatePolicyWeeklyPlan(); if (!p) return;
  const blob = new Blob([JSON.stringify(p, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='weekly_plan_auto_v1.json'; a.click(); URL.revokeObjectURL(url);
});


// ===== Weighted scoring & capped selection for Review Plan =====
function getUIWeightsOrPolicy(){
  const g = (id, fallback)=>{ const el=document.getElementById(id); return el?parseFloat(el.value):fallback; };
  const pol = (window.__policy && __policy.scoring_weights) || {recency:0.35,error_rate:0.30,difficulty:0.15,time_cost:0.10,tag_weakness:0.10,stability:-0.20};
  const cap = (document.getElementById('cap_percent')?parseFloat(document.getElementById('cap_percent').value): (window.__policy?.constraints?.max_share_per_tag*100||40));
  return {
    w:{ recency:g('w_recency',pol.recency), error:g('w_error',pol.error_rate), diff:g('w_diff',pol.difficulty),
        time:g('w_time',pol.time_cost), tag:g('w_tag',pol.tag_weakness), stab:g('w_stab',pol.stability) },
    capPercent: Math.max(10, Math.min(60, cap||40))
  };
}
function normalize(val, min, max){ if (val==null||isNaN(val)) return 0; if (max<=min) return 0; return (val - min)/(max - min); }
function daysSince(ts){ if (!ts) return 999; return (Date.now()-ts)/(1000*3600*24); }
function detectSubjectFromFile(name){
  if (!name) return 'mixed';
  const s = name.toLowerCase();
  for (const k of ['math','english','chinese','history','geography','politics','physics','chemistry','biology']){
    if (s.includes(k)) return k;
  }
  return 'mixed';
}
function pickTag(w){
  if (Array.isArray(w.tags) && w.tags.length) return String(w.tags[0]);
  return detectSubjectFromFile(w.file||'unknown');
}
function buildStats(wb){
  // compute ranges
  let minA=1e9,maxA=-1e9,minT=1e9,maxT=-1e9;
  const tagCount = {};
  for (const w of wb){
    minA = Math.min(minA, w.attempts||1); maxA = Math.max(maxA, w.attempts||1);
    if (typeof w.time_spent==='number'){ minT=Math.min(minT,w.time_spent); maxT=Math.max(maxT,w.time_spent); }
    const t = pickTag(w); tagCount[t]=(tagCount[t]||0)+1;
  }
  if (!isFinite(minA)) minA=0; if (!isFinite(maxA)) maxA=1;
  if (!isFinite(minT)) minT=0; if (!isFinite(maxT)) maxT=1;
  // normalize tag weakness by max count
  let maxTag = 1;
  Object.values(tagCount).forEach(v=>{ if (v>maxTag) maxTag=v; });
  return {minA,maxA,minT,maxT,tagCount,maxTag};
}
function scoreWrong(w, weights, stats){
  const recency = (()=>{ const d=daysSince(w.last_seen||w.first_seen); if (d<=7) return 1; if (d<=21) return 0.7; return 0.4; })();
  const errorRate = normalize(w.attempts||1, stats.minA, stats.maxA); // proxy by attempts count
  const difficulty = (typeof w.difficulty==='number') ? Math.min(1, Math.max(0, (w.difficulty/5))) : 0.6;
  const timeCost = normalize(w.time_spent||0, stats.minT, stats.maxT);
  const tagWeakness = (stats.tagCount[pickTag(w)]||0) / (stats.maxTag||1);
  const stability = (w.correct_streak||0) >= 2 ? 1 : 0;
  const s = weights.recency*recency + weights.error*errorRate + weights.diff*difficulty + weights.time*timeCost + weights.tag*tagWeakness + weights.stab*stability;
  return s;
}
function selectWithCap(sortedItems, perDay, capPercent){
  const result = [];
  const cap = Math.max(1, Math.floor(perDay * (capPercent/100)));
  const used = {};
  for (const it of sortedItems){
    const t = pickTag(it);
    const cnt = used[t]||0;
    if (cnt >= cap) continue;
    result.push(it); used[t]=(cnt+1);
    if (result.length>=perDay) break;
  }
  if (result.length<perDay){
    // backfill ignoring cap
    for (const it of sortedItems){
      if (!result.includes(it)){ result.push(it); if (result.length>=perDay) break; }
    }
  }
  return result.slice(0, perDay);
}
