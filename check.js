
(function(){
'use strict';

const KEY='taxtap_worldclass_v8';
const HMRC_URL='https://www.gov.uk/guidance/use-software-to-send-income-tax-updates';

const defaultTaxProfiles=()=>({
  '2025/26':{
    name:'UK Standard 2025/26',
    basicRate:0.26,
    higherRate:0.42,
    basicBand:37700,
    mileage:{primary:0.45,secondary:0.25,limit:10000},
    deadlines:{Q1:'2025-08-07',Q2:'2025-11-07',Q3:'2026-02-07',Q4:'2026-05-07',YEAR_END:'2027-01-31'}
  },
  '2026/27':{
    name:'UK Standard 2026/27',
    basicRate:0.26,
    higherRate:0.42,
    basicBand:37700,
    mileage:{primary:0.45,secondary:0.25,limit:10000},
    deadlines:{Q1:'2026-08-07',Q2:'2026-11-07',Q3:'2027-02-07',Q4:'2027-05-07',YEAR_END:'2028-01-31'}
  },
  '2027/28':{
    name:'UK Standard 2027/28',
    basicRate:0.26,
    higherRate:0.42,
    basicBand:37700,
    mileage:{primary:0.45,secondary:0.25,limit:10000},
    deadlines:{Q1:'2027-08-07',Q2:'2027-11-07',Q3:'2028-02-07',Q4:'2028-05-07',YEAR_END:'2029-01-31'}
  }
});

const defaultState={
  currentTab:'home',
  taxProfileName:`UK Standard ${currentTaxYearLabel()}`,
  selectedTaxYear:currentTaxYearLabel(),
  selectedQuarter:'all',
  activeSettingsYear:currentTaxYearLabel(),
  mileage:{primary:0.45,secondary:0.25,limit:10000},
  taxProfiles:defaultTaxProfiles(),
  auditLog:[],
  profile:{
    fullName:'',
    address1:'',
    address2:'',
    postcode:'',
    email:'',
    phone:'',
    businessName:'',
    utr:'',
    taxCode:'1257L',
    niNumber:'',
    hmrcReady:false
  },
  userName:'You',
  entries:[],
  documents:[],
  recurring:[],
  ui:{
    addType:'income',
    amount:'',
    category:'',
    note:'',
    miles:'',
    date:today(),
    playIncome:'500',
    playExpense:'200',
    playMiles:'40',
    playStaff:'120',
    repeatEnabled:false,
    repeatFrequency:'monthly',
    repeatDay:'1',
    repeatLabel:'',
    staffName:'',
    staffGross:'',
    staffNI:'',
    staffPension:'',
    playScenarioLabel:'',
    reportView:'quarter',
    editingEntryId:null
  }
};

let state=normalizeState(load());
seedDemoDataIfEmpty();
save();
let calcTarget=null;
let calcValue='0';
const screen=document.getElementById('screen');
const overlay=document.getElementById('calcOverlay');
const calcDisplay=document.getElementById('calcDisplay');

function clone(v){return JSON.parse(JSON.stringify(v));}
function load(){try{const raw=localStorage.getItem(KEY);return raw?JSON.parse(raw):clone(defaultState);}catch{return clone(defaultState);}}
function save(){localStorage.setItem(KEY,JSON.stringify(state));}
function downloadTextFile(filename, content, mimeType='application/json'){
  const blob=new Blob([content],{type:mimeType});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 0);
}
function exportAppData(){
  const payload={
    app:'TaxTap',
    version:'finished-build',
    exportedAt:new Date().toISOString(),
    key:KEY,
    state
  };
  downloadTextFile(`taxtap_backup_${today()}.json`, JSON.stringify(payload,null,2));
  logAction('Data exported', 'Local backup file downloaded');
  save();
  toast('Data saved. Keep that backup somewhere safe.');
}
function importAppData(file){
  if(!file) return;
  const reader=new FileReader();
  reader.onload=(event)=>{
    try{
      const parsed=JSON.parse(String(event.target?.result||'{}'));
      const incoming=parsed && typeof parsed==='object' ? (parsed.state || parsed.data || parsed) : null;
      if(!incoming || typeof incoming!=='object') throw new Error('Invalid backup');
      state=normalizeState(incoming);
      logAction('Data imported', 'Backup loaded into this device');
      save();
      render();
      toast('Data loaded back into TaxTap.');
    }catch(err){
      console.error(err);
      toast('That backup file could not be loaded');
    }
  };
  reader.readAsText(file);
}
function uid(){return Date.now()+Math.floor(Math.random()*1000);}
function today(){return new Date().toISOString().slice(0,10);}
function currentMonth(){return today().slice(0,7);}
function makeSampleFlowerShopEntries(){
  const monthly=[
    ['2025-04-15',2600],['2025-05-15',2800],['2025-06-15',3000],['2025-07-15',2900],
    ['2025-08-15',2950],['2025-09-15',3100],['2025-10-15',3350],['2025-11-15',3450],
    ['2025-12-15',5200],['2026-01-15',2300],['2026-02-15',3800],['2026-03-15',4550]
  ];
  const entries=[];
  monthly.forEach(([date,income],i)=>{
    entries.push({id:uid(),type:'income',amount:income,category:'Sales',note:'Flower shop sales',date});
    entries.push({id:uid(),type:'expense',amount:Math.round(income*0.32),category:'Supplies',note:'Flowers and stock',date});
    entries.push({id:uid(),type:'expense',amount:850,category:'Rent',note:'Shop rent',date});
    entries.push({id:uid(),type:'expense',amount:165,category:'Phone',note:'Utilities and phone',date});
    entries.push({id:uid(),type:'expense',amount:95,category:'Other expense',note:'Packaging and sundries',date});
    const miles=[24,18,22,20,16,21,19,20,28,15,23,26][i];
    entries.push({id:uid(),type:'mileage',amount:mileageAllowance(miles),miles,category:'Travel',note:'Supplier run',date});
  });
  return entries;
}
function seedDemoDataIfEmpty(){
  if((state.entries||[]).length) return;
  state.selectedTaxYear='2025/26';
  state.activeSettingsYear='2025/26';
  state.taxProfileName=profileForYear('2025/26').name;
  state.profile.businessName = state.profile.businessName || 'Bloom & Petals';
  state.profile.fullName = state.profile.fullName || 'Demo Flower Shop Owner';
  state.entries = makeSampleFlowerShopEntries();
  logAction('Demo data loaded', 'Flower shop sample year added for testing');
}


function currentTaxYearLabel(dateStr=today()){
  const d=new Date(dateStr+'T12:00:00');
  const y=d.getFullYear();
  const start = d >= new Date(`${y}-04-06T00:00:00`) ? y : y-1;
  return `${start}/${String((start+1)%100).padStart(2,'0')}`;
}
function makeDefaultProfile(startYear){
  return {
    name:`UK Standard ${startYear}/${String((startYear+1)%100).padStart(2,'0')}`,
    basicRate:0.26,
    higherRate:0.42,
    basicBand:37700,
    mileage:{primary:0.45,secondary:0.25,limit:10000},
    deadlines:{
      Q1:`${startYear}-08-07`,
      Q2:`${startYear}-11-07`,
      Q3:`${startYear+1}-02-07`,
      Q4:`${startYear+1}-05-07`,
      YEAR_END:`${startYear+2}-01-31`
    }
  };
}
function ensureFutureProfiles(profiles){
  const out={...(profiles||{})};
  const current=parseInt(currentTaxYearLabel().split('/')[0],10);
  for(let y=current-1;y<=current+3;y+=1){
    const label=`${y}/${String((y+1)%100).padStart(2,'0')}`;
    if(!out[label]) out[label]=makeDefaultProfile(y);
    out[label].mileage = out[label].mileage || {primary:0.45,secondary:0.25,limit:10000};
    out[label].deadlines = out[label].deadlines || makeDefaultProfile(y).deadlines;
    if(out[label].deadlines.YEAR_END===undefined) out[label].deadlines.YEAR_END=`${y+2}-01-31`;
  }
  return out;
}
function normalizeState(raw){
  const s = raw && typeof raw==='object' ? raw : clone(defaultState);
  s.taxProfiles = ensureFutureProfiles(s.taxProfiles || defaultTaxProfiles());
  s.selectedTaxYear = s.selectedTaxYear || currentTaxYearLabel();
  if(!s.taxProfiles[s.selectedTaxYear]) s.taxProfiles[s.selectedTaxYear]=makeDefaultProfile(parseInt(s.selectedTaxYear.split('/')[0],10));
  s.activeSettingsYear = s.activeSettingsYear || s.selectedTaxYear;
  s.selectedQuarter = s.selectedQuarter || 'all';
  s.profile = {...clone(defaultState.profile), ...(s.profile||{})};
  s.ui = {...clone(defaultState.ui), ...(s.ui||{})};
  s.ui.reportView = s.ui.reportView || 'quarter';
  if(s.ui.editingEntryId===undefined) s.ui.editingEntryId = null;
  s.ui.date = s.ui.date || today();
  s.auditLog = Array.isArray(s.auditLog) ? s.auditLog : [];
  s.entries = Array.isArray(s.entries) ? s.entries : [];
  s.documents = Array.isArray(s.documents) ? s.documents : [];
  s.recurring = Array.isArray(s.recurring) ? s.recurring : [];
  s.mileage = {...clone(defaultState.mileage), ...(s.mileage||{})};
  const activeProfile=s.taxProfiles[s.selectedTaxYear] || makeDefaultProfile(parseInt(s.selectedTaxYear.split('/')[0],10));
  s.taxProfileName = activeProfile.name;
  if(!s.mileage.primary && s.mileage.primary!==0) s.mileage.primary = activeProfile.mileage.primary;
  if(!s.mileage.secondary && s.mileage.secondary!==0) s.mileage.secondary = activeProfile.mileage.secondary;
  if(!s.mileage.limit && s.mileage.limit!==0) s.mileage.limit = activeProfile.mileage.limit;
  return s;
}
function profileForYear(yearLabel=state.selectedTaxYear){
  state.taxProfiles = ensureFutureProfiles(state.taxProfiles);
  if(!state.taxProfiles[yearLabel]) state.taxProfiles[yearLabel]=makeDefaultProfile(parseInt(yearLabel.split('/')[0],10));
  return state.taxProfiles[yearLabel];
}
function selectedProfile(){ return profileForYear(state.selectedTaxYear); }
function taxYearBounds(label=state.selectedTaxYear){
  const startYear=parseInt(String(label).split('/')[0],10);
  return {start:`${startYear}-04-06`, end:`${startYear+1}-04-05`};
}
function periodEntries(yearLabel=state.selectedTaxYear, quarter=state.selectedQuarter){
  const bounds=taxYearBounds(yearLabel);
  return (state.entries||[]).filter(e=>{
    const date=e.date||'';
    if(date < bounds.start || date > bounds.end) return false;
    if(quarter==='all') return true;
    const q=quarterForDate(date, yearLabel);
    return q===quarter;
  });
}
function taxYearOptions(){
  return Object.keys(ensureFutureProfiles(state.taxProfiles)).sort((a,b)=>b.localeCompare(a));
}
function quarterForDate(dateStr, yearLabel=currentTaxYearLabel(dateStr)){
  const startYear=parseInt(String(yearLabel).split('/')[0],10);
  if(dateStr>=`${startYear}-04-06` && dateStr<=`${startYear}-07-05`) return 'Q1';
  if(dateStr>=`${startYear}-07-06` && dateStr<=`${startYear}-10-05`) return 'Q2';
  if(dateStr>=`${startYear}-10-06` && dateStr<=`${startYear+1}-01-05`) return 'Q3';
  if(dateStr>=`${startYear+1}-01-06` && dateStr<=`${startYear+1}-04-05`) return 'Q4';
  return 'Q?';
}
function quarterOptions(){ return ['all','Q1','Q2','Q3','Q4']; }
function selectedPeriodLabel(){ return state.selectedQuarter==='all' ? `${state.selectedTaxYear} full year` : `${state.selectedTaxYear} ${state.selectedQuarter}`; }
function formatDateNice(v){
  if(!v) return 'Not set';
  const d=new Date(v+'T12:00:00');
  return d.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
}
function deadlineForSelection(){
  const p=selectedProfile();
  const key=state.selectedQuarter==='all' ? (state.ui.reportView==='year' ? 'YEAR_END' : quarterForDate(today(), state.selectedTaxYear)) : state.selectedQuarter;
  return p.deadlines[key] || p.deadlines.YEAR_END;
}
function daysLeft(){
  const deadline=deadlineForSelection();
  const diff=Math.ceil((new Date(deadline+'T23:59:59') - new Date(today()+'T00:00:00'))/86400000);
  return Math.max(diff,0);
}
function logAction(action, detail){
  state.auditLog = state.auditLog || [];
  state.auditLog.unshift({id:uid(),at:new Date().toISOString(),action,detail});
  state.auditLog = state.auditLog.slice(0,120);
}
function staffSummary(entries){
  const map={};
  (entries||[]).filter(e=>e.type==='staff').forEach(e=>{
    const name=((e.note||'Staff').split(' · ')[0] || 'Staff').trim();
    if(!map[name]) map[name]={name,total:0,count:0};
    map[name].total += Number(e.amount||0);
    map[name].count += 1;
  });
  return Object.values(map).sort((a,b)=>b.total-a.total);
}
function money(n){return '£'+Number(n||0).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});}
function moneyShort(n){return '£'+Number(n||0).toLocaleString('en-GB',{minimumFractionDigits:0,maximumFractionDigits:2});}
function entryValueForTax(e){
  if(e.type==='mileage') return 0;
  return Number(e.amount||0);
}
function deductibleValue(e){
  if(e.type==='mileage') return Number(e.amount||0);
  if(e.type==='income') return 0;
  return Number(e.amount||0);
}
function lastMileageEntry(){
  return (state.entries||[]).find(e => e.type==='mileage') || null;
}
function mileageAllowance(m, profile=selectedProfile()){
  const sourceMileage = profile?.mileage || state.mileage || {primary:0.45,secondary:0.25,limit:10000};
  const miles=Number(m||0), limit=Number(sourceMileage.limit||10000), p=Number(sourceMileage.primary||0.45), s=Number(sourceMileage.secondary||0.25);
  return Math.max(0, Math.min(miles,limit)*p + Math.max(0,miles-limit)*s);
}
function totals(entries=periodEntries(), yearLabel=state.selectedTaxYear){
  const profile=profileForYear(yearLabel);
  const income=(entries||[]).filter(e=>e.type==='income').reduce((a,b)=>a+Number(b.amount||0),0);
  const cashExpense=(entries||[]).filter(e=>e.type!=='income' && e.type!=='mileage').reduce((a,b)=>a+Number(b.amount||0),0);
  const mileageDeduction=(entries||[]).filter(e=>e.type==='mileage').reduce((a,b)=>a+Number(b.amount||0),0);
  const totalDeduction = cashExpense + mileageDeduction;
  const profit=Math.max(0,income-totalDeduction);
  const tax=Math.max(0, Math.min(profit,Number(profile.basicBand||37700))*Number(profile.basicRate||0.26) + Math.max(0,profit-Number(profile.basicBand||37700))*Number(profile.higherRate||0.42));
  const keep=income-tax;
  const disposable=keep-cashExpense;
  const staffCost=(entries||[]).filter(e=>e.type==='staff').reduce((a,b)=>a+Number(b.amount||0),0);
  return {income,cashExpense,mileageDeduction,totalDeduction,profit,tax,keep,disposable,mileageSaved:mileageDeduction,staffCost};
}
function playResults(){
  const t=totals();
  const profile=selectedProfile();
  const inc=Number(state.ui.playIncome||0);
  const exp=Number(state.ui.playExpense||0);
  const miles=Number(state.ui.playMiles||0);
  const staff=Number(state.ui.playStaff||0);
  const expenseTaxImpact = exp * Number(profile.basicRate||0.26);
  const mileageValue = mileageAllowance(miles);
  const mileageTaxImpact = mileageValue * Number(profile.basicRate||0.26);
  const incomeAfter = t.income + inc;
  const cashExpenseAfter = t.cashExpense + exp + staff;
  const deductionAfter = cashExpenseAfter + t.mileageDeduction + mileageValue;
  const profitAfter = Math.max(0, incomeAfter - deductionAfter);
  const taxAfter = Math.max(0, Math.min(profitAfter,Number(profile.basicBand||37700))*Number(profile.basicRate||0.26) + Math.max(0,profitAfter-Number(profile.basicBand||37700))*Number(profile.higherRate||0.42));
  const keepAfter = incomeAfter - taxAfter;
  const disposableAfter = keepAfter - cashExpenseAfter;
  return {inc,exp,miles,staff,expenseTaxImpact,mileageValue,mileageTaxImpact,incomeAfter,cashExpenseAfter,profitAfter,taxAfter,keepAfter,disposableAfter};
}
function toast(msg){
  const old=document.querySelector('.toast'); if(old) old.remove();
  const t=document.createElement('div'); t.className='toast'; t.textContent=msg; document.body.appendChild(t);
  setTimeout(()=>t.remove(),2400);
}
function setTab(tab){state.currentTab=tab; save(); render();}
function entryTitle(e){
  if(e.type==='income') return 'Income · '+(e.category||'Income');
  if(e.type==='expense') return 'Expense · '+(e.category||'Expense');
  if(e.type==='staff') return 'Staff · '+(e.note||'Staff cost');
  return 'Mileage · '+Number(e.miles||0)+' miles';
}
function addEntry(e){state.entries.unshift({...e,id:uid()}); logAction('Entry added', `${e.type} · ${money(e.amount||0)} · ${e.date||today()}`); save();}
function updateEntry(entryId, updates){
  const idx=(state.entries||[]).findIndex(x=>String(x.id)===String(entryId));
  if(idx===-1) return false;
  const original=state.entries[idx]||{};
  state.entries[idx]={...original,...updates,id:original.id};
  logAction('Entry updated', `${state.entries[idx].type} · ${money(state.entries[idx].amount||0)} · ${state.entries[idx].date||today()}`);
  save();
  return true;
}
function quarterLabel(){ return state.selectedQuarter==='all' ? `${state.selectedTaxYear} full year` : `${state.selectedTaxYear} ${state.selectedQuarter}`; }
function incomeToday(){return periodEntries().filter(e=>e.type==='income'&&e.date===today()).reduce((a,b)=>a+Number(b.amount||0),0);}
function expenseToday(){return periodEntries().filter(e=>e.type!=='income'&&e.date===today()).reduce((a,b)=>a+Number(b.amount||0),0);}
function milesToday(){return periodEntries().filter(e=>e.type==='mileage'&&e.date===today()).reduce((a,b)=>a+Number(b.miles||0),0);}
function recurringDueText(){const active=(state.recurring||[]).filter(r=>r.active).length; return active? active+' repeat items watching this month':'No repeat items yet';}
function usualItems(){
  const map={};
  (state.entries||[]).forEach(e=>{
    if(e.type==='income') return;
    const label=(e.category||e.note||'Item').trim();
    const key=e.type+'|'+label+'|'+Number(e.amount||0).toFixed(2)+'|'+(e.miles?Number(e.miles).toFixed(2):'0');
    if(!map[key]) map[key]={key,label,type:e.type,amount:Number(e.amount||0),miles:Number(e.miles||0),category:e.category||'',note:e.note||'',count:0,lastDate:e.date||'',grossPay:Number(e.grossPay||0),employerNI:Number(e.employerNI||0),pension:Number(e.pension||0)};
    map[key].count+=1;
    if((e.date||'') > map[key].lastDate) map[key].lastDate=e.date||'';
  });
  return Object.values(map).sort((a,b)=> b.count-a.count || b.lastDate.localeCompare(a.lastDate)).slice(0,5);
}

function maybeAutoAddRecurring(){
  const todayDate = new Date();
  const todayDay = todayDate.getDate();
  const monthKey = currentMonth();
  let added=0;
  (state.recurring||[]).forEach(item=>{
    if(!item.active || item.frequency!=='monthly') return;
    if(Number(item.dayOfMonth||1)!==todayDay) return;
    if(item.lastAutoAddedMonth===monthKey) return;
    const already = state.entries.some(e =>
      e.type===item.type &&
      Number(e.amount||0)===Number(item.amount||0) &&
      (e.category||'')===(item.category||'') &&
      (e.note||'')===(item.note||'') &&
      (e.date||'').slice(0,7)===monthKey
    );
    if(already){ item.lastAutoAddedMonth = monthKey; return; }
    state.entries.unshift({id:uid(), type:item.type, amount:Number(item.amount||0), category:item.category||'', note:item.note||'', date:today(), autoAdded:true});
    logAction('Repeat auto-add', `${item.label} · ${money(item.amount||0)} · ${today()}`);
    item.lastAutoAddedMonth=monthKey;
    added += 1;
  });
  if(added){ save(); }
  return added;
}

function nudgeMessage(){
  const t=totals();
  const recent = state.entries.filter(e => (e.date||'') >= currentMonth()+'-01').length;
  const fuelLogged = state.entries.some(e => (e.category||'')==='Fuel' && (e.date||'').slice(0,7)===currentMonth());
  const travelLogged = state.entries.some(e => e.type==='mileage' && (e.date||'').slice(0,7)===currentMonth());
  const staffLogged = state.entries.some(e => e.type==='staff' && (e.date||'').slice(0,7)===currentMonth());
  const docs = (state.documents||[]).length;
  const ready = hmrcReadiness();
  if(recent >= 12 && ready.complete) return {kind:'good', text:'Excellent — you are updating well and your key filing details are already stored.'};
  if(t.disposable < 0) return {kind:'bad', text:'You are overspending right now. Use Play to test what income, mileage, costs or staff changes would improve this.'};
  if(t.tax > 1000 && !fuelLogged && !travelLogged) return {kind:'warn', text:'This looks like a high-tax month. Check fuel, travel, tools, wages and other costs are fully added.'};
  if(!staffLogged && t.staffCost === 0) return {kind:'warn', text:'If you paid helpers or staff this month, add those costs too so the picture is complete.'};
  if(recent <= 3) return {kind:'warn', text:'Every penny counts. Keep logging regularly so nothing gets missed later.'};
  if(docs < 3) return {kind:'warn', text:'Add or keep more supporting documents so everything is easier when you review or file.'};
  return {kind:'good', text:'Good — keep going. Your records are building nicely in the background.'};
}

function hmrcReadiness(){
  const p=state.profile||{};
  const needed = [p.fullName,p.address1,p.postcode,p.businessName,p.utr,p.taxCode,p.niNumber];
  const filled = needed.filter(Boolean).length;
  return {filled,total:needed.length,complete:filled===needed.length};
}

function hmrcPrepData(view=state.ui.reportView || 'quarter'){
  const entries = periodEntries(state.selectedTaxYear, view==='year' ? 'all' : state.selectedQuarter==='all' ? quarterForDate(today(), state.selectedTaxYear) : state.selectedQuarter);
  const t=totals(entries, state.selectedTaxYear);
  return {
    view,
    periodLabel: view==='year' ? `${state.selectedTaxYear} year-end return` : `${state.selectedTaxYear} ${(state.selectedQuarter==='all' ? quarterForDate(today(), state.selectedTaxYear) : state.selectedQuarter)} quarterly update`,
    turnover: t.income,
    expensesExMileage: t.cashExpense,
    mileage: t.mileageDeduction,
    staffCosts: t.staffCost,
    totalDeductions: t.totalDeduction,
    profit: t.profit,
    estimatedTax: t.tax,
    entriesCount: entries.length,
    deadline: view==='year' ? selectedProfile().deadlines.YEAR_END : selectedProfile().deadlines[(state.selectedQuarter==='all' ? quarterForDate(today(), state.selectedTaxYear) : state.selectedQuarter)]
  };
}
function hmrcPrepText(view=state.ui.reportView || 'quarter'){
  const d=hmrcPrepData(view);
  return [
    `Period: ${d.periodLabel}`,
    `Deadline: ${formatDateNice(d.deadline)}`,
    `Entries counted: ${d.entriesCount}`,
    `Turnover: ${money(d.turnover)}`,
    `Expenses (excl mileage): ${money(d.expensesExMileage)}`,
    `Mileage deduction: ${money(d.mileage)}`,
    `Staff costs: ${money(d.staffCosts)}`,
    `Total deductions: ${money(d.totalDeductions)}`,
    `Profit: ${money(d.profit)}`,
    `Estimated tax: ${money(d.estimatedTax)}`
  ].join('\n');
}
function openPrepScreen(){
  const d=hmrcPrepData(state.ui.reportView || 'quarter');
  screen.innerHTML = `
    <section class="card">
      <div class="between"><div><div class="sectionTitle">Prepare figures</div><div class="muted">Quarterly update and year-end return views now use your selected tax year and period.</div></div><span class="lightpill">${d.view==='year'?'Year-end':'Quarter'}</span></div>
      <div class="playActionRow">
        <button class="chip ${d.view==='quarter'?'green':''}" id="prepQuarterBtn">Quarterly update</button>
        <button class="chip ${d.view==='year'?'green':''}" id="prepYearBtn">Year-end return</button>
        <button class="chip" id="backHomeBtn">Back home</button>
      </div>
      <div class="callout" style="margin-top:14px"><strong>${d.periodLabel}</strong><div class="tiny" style="margin-top:6px">Deadline ${formatDateNice(d.deadline)} · ${d.entriesCount} entries included</div></div>
      <div class="softList" style="margin-top:14px">
        <div class="callout"><strong>Turnover</strong><div class="kpi">${money(d.turnover)}</div></div>
        <div class="callout"><strong>Expenses (excluding mileage)</strong><div class="kpi">${money(d.expensesExMileage)}</div></div>
        <div class="callout"><strong>Mileage deduction</strong><div class="kpi">${money(d.mileage)}</div><div class="tiny">Tax deduction, not cash spent.</div></div>
        <div class="callout"><strong>Staff costs</strong><div class="kpi">${money(d.staffCosts)}</div></div>
        <div class="callout"><strong>Profit</strong><div class="kpi">${money(d.profit)}</div></div>
        <div class="callout"><strong>Estimated tax</strong><div class="kpi">${money(d.estimatedTax)}</div></div>
      </div>
      <div class="chips" style="margin-top:14px">
        <button class="chip green" id="copyPrepAll">Copy figures</button>
        <button class="chip green" id="copyPrepBreakdown">Copy breakdown</button>
      </div>
      <div class="tiny" style="margin-top:12px">These figures are period-aware and based on your selected rules for ${state.selectedTaxYear}. Review them before any submission.</div>
    </section>`;
  bindCommon();
  document.getElementById('prepQuarterBtn').onclick=()=>{state.ui.reportView='quarter'; save(); openPrepScreen();};
  document.getElementById('prepYearBtn').onclick=()=>{state.ui.reportView='year'; save(); openPrepScreen();};
  document.getElementById('copyPrepAll').onclick=async()=>{ try{ await navigator.clipboard.writeText(hmrcPrepText(state.ui.reportView||'quarter')); toast('Figures copied'); }catch{ toast('Copy not available here'); } };
  document.getElementById('copyPrepBreakdown').onclick=async()=>{ try{ await navigator.clipboard.writeText(hmrcPrepText(state.ui.reportView||'quarter')); toast('Breakdown copied'); }catch{ toast('Copy not available here'); } };
  document.getElementById('backHomeBtn').onclick=()=>setTab('home');
}
function renderHome(){
  const t=totals(); const keepPct=t.income?Math.max(8,Math.min(100,(t.keep/t.income)*100)):100;
  const usual = usualItems(); const nudge=nudgeMessage(); const ready=hmrcReadiness();
  const nudgeClass = nudge.kind==='bad' ? 'bad' : (nudge.kind==='warn' ? 'warn' : 'good');
  const deadline=deadlineForSelection();
  const profile=selectedProfile();
  const firstUse = (state.entries||[]).length===0;
  return `
    <section class="card hero">
      <div class="between">
        <div class="row"><span class="pill">Ready</span><span class="pill">${daysLeft()} days left</span></div>
        <span class="pill">${ready.complete ? 'Details saved' : ready.filled+'/'+ready.total+' saved'}</span>
      </div>
      <div style="margin-top:16px">
        <span class="pill">✅ Ready check</span>
        <h2 style="font-size:2rem;margin:14px 0 4px">${quarterLabel()}</h2>
        <p style="margin:0 0 16px;opacity:.96">Hi ${state.userName} · next deadline ${formatDateNice(deadline)}</p>
      </div>
      <div class="grid2">
        <div class="field"><label style="color:#fff">Tax year</label><select id="homeTaxYearSelect">${taxYearOptions().map(y=>`<option value="${y}" ${state.selectedTaxYear===y?'selected':''}>${y}</option>`).join('')}</select></div>
        <div class="field"><label style="color:#fff">Period</label><select id="homeQuarterSelect">${quarterOptions().map(q=>`<option value="${q}" ${state.selectedQuarter===q?'selected':''}>${q==='all'?'Full year':q}</option>`).join('')}</select></div>
        <button class="btn primary" id="readyBtn">Ready check</button>
        <button class="btn secondary" id="prepBtn">Prepare figures</button>
      </div>
    </section>

    <section class="card">
      <div class="between">
        <div><div class="sectionTitle">Your money</div><div class="muted">Using ${profile.name}</div></div>
        <span class="lightpill">${selectedPeriodLabel()}</span>
      </div>
      <div class="card" style="background:linear-gradient(135deg,#234d7d,#2c3f93);color:#fff;border:none;margin-top:14px;margin-bottom:12px">
        <div style="opacity:.9">You keep</div><div class="moneyBig">${money(t.keep)}</div><div>This is what most people care about most.</div>
      </div>
      <div class="grid2">
        <div class="mini"><div class="muted">You made</div><div class="kpi">${money(t.income)}</div></div>
        <div class="mini"><div class="muted">Tax so far</div><div class="kpi">${money(t.tax)}</div></div>
        <div class="mini"><div class="muted">Business costs</div><div class="kpi">${money(t.cashExpense)}</div></div>
        <div class="mini"><div class="muted">Disposable</div><div class="kpi ${t.disposable<0?'bad':'good'}">${money(t.disposable)}</div></div>
      </div>
      <div style="margin-top:14px" class="bar"><span style="width:${keepPct}%"></span></div>
      <div class="callout" style="margin-top:14px">
        <div class="between"><strong>How you’re doing</strong><span class="lightpill ${t.disposable<0?'bad':'good'}">${t.disposable<0?'Needs attention':'Good shape'}</span></div>
        <div class="tiny" style="margin-top:8px">${t.disposable<0?'Right now your disposable income is negative. Focus on missing costs, wage tracking, or extra income.':'You still have money left after tax and tracked costs. Keep feeding the system so this stays accurate.'}</div>
      </div>
    </section>

    <section class="card rewardCard">
      <div class="between"><div class="sectionTitle">Filing confidence</div><span class="lightpill">${ready.filled}/${ready.total}</span></div>
      <div class="rewardBig">${ready.complete?'Most key details are stored':'Almost there'}</div>
      <div class="tiny" style="margin-top:6px">${ready.complete?'You have the main basics stored here for later review.':'Keep filling small missing details in Settings so filing is stress-free.'}</div>
    </section>

    ${firstUse ? `
    <section class="card">
      <div class="emptyState">
        <div class="emptyTitle">Start simple</div>
        <div class="muted">Add one real thing and TaxTap starts building your picture quietly in the background.</div>
        <div class="starterGrid">
          <button class="starterBtn" id="startIncomeBtn">Add income<small>Good for your first sale or payment</small></button>
          <button class="starterBtn" id="startExpenseBtn">Add expense<small>Fuel, stock, rent, tools and more</small></button>
          <button class="starterBtn" id="startMileageBtn">Add mileage<small>Capture business miles in seconds</small></button>
          <button class="starterBtn" id="startPlayBtn">Play with money<small>Test what changes before you do them</small></button>
        </div>
        <div class="helperRow">
          <span class="helperBadge">Fast input</span>
          <span class="helperBadge">Tax year handled</span>
          <span class="helperBadge">What you keep first</span>
        </div>
      </div>
    </section>` : `
    <section class="card">
      <div class="between"><div class="sectionTitle">Your usual top 5</div><span class="lightpill">${usual.length} shortcuts</span></div>
      ${usual.length ? `<div class="chips" style="margin-top:12px">
        ${usual.map(item=>`<button class="chip useUsual" data-key="${item.key}">${item.label} ${item.type==='mileage' ? (Number(item.miles)+' miles') : moneyShort(item.amount)}</button>`).join('')}
      </div>
      <div class="tiny" style="margin-top:12px">TaxTap watches what you add most often and puts it here.</div>` : `<div class="gentleNote" style="margin-top:12px">Your shortcuts appear here after you repeat a few real entries.</div>`}
    </section>`}

    <section class="card">
      <div class="between"><div class="sectionTitle">Repeat payments</div><span class="lightpill warn">${recurringDueText()}</span></div>
      ${(state.recurring||[]).length ? (state.recurring||[]).slice(0,3).map(item=>`<div class="repeatRow"><div><strong>${item.label}</strong><div class="muted">${money(item.amount)} · monthly · day ${item.dayOfMonth}</div></div><div class="muted">${item.active ? 'On' : 'Off'}</div></div>`).join('') : `<div class="gentleNote" style="margin-top:12px">Turn on repeat when something happens every month and TaxTap will quietly watch for it.</div>`}
      <button class="btn secondary" id="manageRepeatsBtn" style="margin-top:12px">Open repeat payments</button>
    </section>

    <section class="card">
      <div class="between"><div class="sectionTitle">Mileage</div><span class="lightpill good">${money(t.mileageSaved)} saved</span></div>
      <div class="chips" style="margin-top:12px">
        <button class="chip green quickMiles" data-miles="10">+10 miles</button>
        <button class="chip green quickMiles" data-miles="20">+20 miles</button>
        ${lastMileageEntry() ? `<button class="chip green" id="sameAsYesterdayBtn">Same as yesterday</button>` : ``}
        <button class="chip" id="openMileage">Mileage calculator</button>
      </div>
    </section>

    <section class="card">
      <div class="between"><div class="sectionTitle">Little nudge</div><span class="lightpill ${nudgeClass}">${nudge.kind==='good'?'Good':(nudge.kind==='bad'?'Watch':'Tip')}</span></div>
      <div class="row" style="gap:14px;margin-top:10px">
        <div class="successRing">${nudge.kind==='good'?'✓':(nudge.kind==='bad'?'!':'i')}</div>
        <div style="flex:1"><strong>${nudge.text}</strong></div>
      </div>
    </section>

    <section class="footerHelper">
      <div class="between"><div><div class="footerHelperTitle">Stay on track</div><div class="muted">Small habits keep the app useful and make filing feel easy.</div></div><span class="lightpill">Helpful</span></div>
      <div class="gentleNote bottomSpacerNote">${(state.entries||[]).length===0?'Add your first item and TaxTap starts building your year quietly in the background.':`You have ${(state.entries||[]).length} saved item${(state.entries||[]).length===1?'':'s'} and ${(state.documents||[]).length} document${(state.documents||[]).length===1?'':'s'} stored.`}</div>
      <div class="footerHelperActions">
        <button class="chip" id="footerAddBtn">Add something</button>
        <button class="chip" id="footerSaveDataBtn">Save my data</button>
        <button class="chip" id="footerPlayBtn">Try Play</button>
      </div>
    </section>`;
}
function addFeedbackText(kind, amount){
  if(kind==='income') return `+${money(amount)} added. That pushes your top line up immediately.`;
  if(kind==='expense') return `+${money(amount)} added. Rough tax impact about ${money(amount*0.26)}.`;
  if(kind==='staff') return `+${money(amount)} staff cost added. That helps reflect what the work really cost.`;
  return `Mileage saved. Allowance value ${money(amount)}.`;
}

function addForm(){
  const type=state.ui.addType;
  const isMileage=type==='mileage';
  const isExpense=type==='expense';
  const isStaff=type==='staff';
  return `
    <section class="card">
      <div class="between"><div class="sectionTitle">${isMileage?'Mileage calculator':(isExpense?'Add expense':(isStaff?'Add staff cost':'Add income'))}</div><span class="lightpill">${isMileage?'HMRC mileage':(isStaff?'Wages':'Fast add')}</span></div>
      <div class="stack" style="margin-top:12px">
        ${isStaff ? `
          <div class="field"><label>Staff member</label><input id="staffNameInput" value="${(state.ui.staffName||'').replaceAll('"','&quot;')}" placeholder="Ali"></div>
          <div class="field">
            <label>Gross pay</label>
            <div class="smartInput">
              <div class="displayBox ${state.ui.staffGross===''?'empty':''}">${state.ui.staffGross===''?'<span class="muted">No number yet</span>':money(state.ui.staffGross)}</div>
              <button class="calcBtn openCalc" data-target="staffGross">Enter amount</button>
            </div>
          </div>
          <div class="field">
            <label>Employer NI</label>
            <div class="smartInput">
              <div class="displayBox ${state.ui.staffNI===''?'empty':''}">${state.ui.staffNI===''?'<span class="muted">Optional</span>':money(state.ui.staffNI)}</div>
              <button class="calcBtn openCalc" data-target="staffNI">Enter amount</button>
            </div>
          </div>
          <div class="field">
            <label>Pension</label>
            <div class="smartInput">
              <div class="displayBox ${state.ui.staffPension===''?'empty':''}">${state.ui.staffPension===''?'<span class="muted">Optional</span>':money(state.ui.staffPension)}</div>
              <button class="calcBtn openCalc" data-target="staffPension">Enter amount</button>
            </div>
          </div>
          <div class="mini"><div class="muted">Total staff cost</div><div class="kpi">${money(Number(state.ui.staffGross||0)+Number(state.ui.staffNI||0)+Number(state.ui.staffPension||0))}</div><div class="tiny">Track what a staff member actually cost you without turning this into payroll software.</div></div>
        ` : `
          <div class="field">
            <label>${isMileage?'Miles':'Amount'}</label>
            <div class="smartInput">
              <div class="displayBox ${((isMileage?state.ui.miles:state.ui.amount)===''?'empty':'')}">${(isMileage?(state.ui.miles===''?'<span class="muted">No number yet</span>':state.ui.miles+' miles'):(state.ui.amount===''?'<span class="muted">No number yet</span>':money(state.ui.amount)))}</div>
              <button class="calcBtn openCalc" data-target="${isMileage?'miles':'amount'}">Enter amount</button>
            </div>
          </div>
        `}
        ${isMileage?`
          <div class="chips">
            <button class="chip green setMiles" data-miles="10">10</button>
            <button class="chip green setMiles" data-miles="20">20</button>
            <button class="chip green setMiles" data-miles="30">30</button>
            <button class="chip green setMiles" data-miles="40">40</button>
          </div>
          <div class="mini"><div class="muted">Allowance value</div><div class="kpi">${money(mileageAllowance(state.ui.miles||0))}</div><div class="tiny">Uses your saved mileage rates.</div></div>
        ` : (!isStaff ? `
          <div class="field"><label>Category</label>
            <select id="categoryInput">${(isExpense?['Fuel','Phone','Tools','Supplies','Travel','Rent','Coffee','Other expense']:['Invoice','Sales','Cash job','Other income']).map(x=>`<option ${state.ui.category===x?'selected':''}>${x}</option>`).join('')}</select>
          </div>
        ` : '')}
        <div class="field"><label>${isStaff?'Note':'Note'}</label><input id="noteInput" value="${(state.ui.note||'').replaceAll('"','&quot;')}" placeholder="${isMileage?'Customer visit / supplier run':(isExpense?'What was it for?':(isStaff?'Shift / helper / role':'Who paid you?'))}"></div>
        <div class="field"><label>Date</label><input type="date" id="dateInput" value="${state.ui.date}"></div>
        ${(!isMileage && type!=='income') ? `
        <div class="mini">
          <div class="between"><strong>Repeat payment</strong><label class="switch"><input type="checkbox" id="repeatEnabled" ${state.ui.repeatEnabled ? 'checked' : ''}> On</label></div>
          <div class="stack" id="repeatFields" style="${state.ui.repeatEnabled ? '' : 'display:none'};margin-top:12px">
            <div class="field"><label>Label</label><input id="repeatLabelInput" value="${(state.ui.repeatLabel||'').replaceAll('"','&quot;')}" placeholder="${isStaff?'Weekly helper':'Workshop rent'}"></div>
            <div class="field"><label>Frequency</label><select id="repeatFrequency"><option ${state.ui.repeatFrequency==='monthly'?'selected':''}>monthly</option></select></div>
            <div class="field"><label>Day of month</label><select id="repeatDay">${Array.from({length:28},(_,i)=>i+1).map(d=>`<option value="${d}" ${String(state.ui.repeatDay)===String(d)?'selected':''}>${d}</option>`).join('')}</select></div>
          </div>
        </div>` : ''}
        <div class="stack" style="gap:10px">
          <button class="btn primary" id="${isMileage?'saveMileageBtn':'saveEntryBtn'}">${state.ui.editingEntryId ? (isMileage?'Update mileage':(isStaff?'Update staff cost':(isExpense?'Update expense':'Update income'))) : (isMileage?'Save mileage':(isStaff?'Save staff cost':(isExpense?'Save expense':'Save income')))}</button>
          ${state.ui.editingEntryId ? '<button class="btn secondary" id="cancelEditBtn">Cancel editing</button>' : ''}
        </div>
      </div>
    </section>`;
}

function renderAdd(){
  const last=state.entries[0];
  const usual = usualItems();
  return `
    <section class="card actionHero">
      <div class="between">
        <div><div class="sectionTitle" style="color:#fff">Add something</div><div style="opacity:.86">Fast, friendly, low-thinking input.</div></div>
        <span class="pill">Quick win</span>
      </div>
      <div class="actionGrid">
        <button class="actionBtn income mainAction" data-type="income"><span>＋ Add income</span><span>›</span></button>
        <button class="actionBtn expense mainAction" data-type="expense"><span>－ Add expense</span><span>›</span></button>
        <button class="actionBtn travel mainAction" data-type="mileage"><span>🚗 Mileage</span><span>›</span></button>
        <button class="actionBtn staff mainAction" data-type="staff"><span>👥 Staff cost</span><span>›</span></button>
        <button class="actionBtn play" id="gotoPlay"><span>🎮 Play with money</span><span>›</span></button>
      </div>
    </section>

    <section class="card">
      <div class="between"><div class="sectionTitle">Your top 5</div><span class="lightpill">${usual.length} ready</span></div>
      <div class="chips" style="margin-top:12px">
        ${usual.map(item=>`<button class="chip useUsual" data-key="${item.key}">${item.label} ${item.type==='mileage' ? (Number(item.miles)+' miles') : moneyShort(item.amount)}</button>`).join('')}
      </div>
    </section>

    ${addForm()}

    <section class="card rewardCard">
      <div class="between"><div class="sectionTitle">Quick wins</div><span class="lightpill">Fast wins</span></div>
      <div class="tiny">Tap one and it saves right away. Small wins should feel instant.</div>
      <div class="chips" style="margin-top:12px">
        <button class="chip alt quickExpense" data-amount="15" data-cat="Fuel">Fuel £15</button>
        <button class="chip alt quickExpense" data-amount="30" data-cat="Phone">Phone £30</button>
        <button class="chip alt quickExpense" data-amount="45" data-cat="Tools">Tools £45</button>
        <button class="chip alt quickExpense" data-amount="60" data-cat="Supplies">Supplies £60</button>
      </div>
    </section>

    <section class="card">
      <div class="between"><div class="sectionTitle">One-tap repeat</div><span class="lightpill">1 tap</span></div>
      <div class="entry">
        <div><strong>${last?entryTitle(last):'No previous entry yet'}</strong><div class="muted">${last?money(last.amount)+' · '+(last.note||last.category||''):'Add one entry first'}</div></div>
        <button class="btn secondary" id="sameAsLastBtn" ${last?'':'disabled style="opacity:.5;cursor:not-allowed"'}>${last?'Use again':'Add first entry'}</button>
      </div>
    </section>`;
}

function renderPlay(){
  const t=totals();
  const p=playResults();
  const disposableClass = p.disposableAfter < 0 ? 'bad' : 'good';
  const keepDelta = p.keepAfter - t.keep;
  const dispDelta = p.disposableAfter - t.disposable;
  return `
    <section class="card playHero">
      <div class="between"><div><div class="sectionTitle">Money gameboard</div><div class="muted">Try a move and watch what you keep change instantly.</div></div><span class="lightpill">Game mode</span></div>
      <div class="helperRow" style="margin-top:12px"><span class="pill">Try a move</span><span class="pill">See the score change</span></div>

      <div class="playBoardGrid">
        <div class="playTile">
          <label for="playIncomeInput">Add income</label>
          <div class="playInputStack">
            <input id="playIncomeInput" class="playNumberInput" type="text" inputmode="decimal" placeholder="Type extra income" value="${state.ui.playIncome||''}">
            <div class="playHint">Type a number and your score updates straight away.</div>
          </div>
        </div>
        <div class="playTile">
          <label for="playExpenseInput">Add cost</label>
          <div class="playInputStack">
            <input id="playExpenseInput" class="playNumberInput" type="text" inputmode="decimal" placeholder="Type extra cost" value="${state.ui.playExpense||''}">
            <div class="playHint">Try bills, tools or one-off spending.</div>
          </div>
        </div>
        <div class="playTile">
          <label for="playMilesInput">Add mileage</label>
          <div class="playInputStack">
            <input id="playMilesInput" class="playNumberInput miles" type="text" inputmode="numeric" placeholder="Type extra miles" value="${state.ui.playMiles||''}">
            <div class="playHint">We turn miles into tax relief automatically.</div>
          </div>
        </div>
        <div class="playTile">
          <label for="playStaffInput">Add staff cost</label>
          <div class="playInputStack">
            <input id="playStaffInput" class="playNumberInput" type="text" inputmode="decimal" placeholder="Type staff cost" value="${state.ui.playStaff||''}">
            <div class="playHint">Test wages before making them real.</div>
          </div>
        </div>
      </div>
    </section>

    <section class="card">
      <div class="between"><div class="sectionTitle">Your scoreboard</div><span class="lightpill">Live score</span></div>
      <div class="grid2" style="margin-top:14px">
        <div class="playScore"><div class="muted">You keep now</div><div class="kpi">${money(t.keep)}</div></div>
        <div class="playScore"><div class="muted">You would keep</div><div class="kpi">${money(p.keepAfter)}</div><div class="${keepDelta>=0?'deltaUp':'deltaDown'}">${keepDelta>=0?'+':''}${money(keepDelta)}</div></div>
        <div class="playScore"><div class="muted">Current disposable</div><div class="kpi">${money(t.disposable)}</div></div>
        <div class="playScore"><div class="muted">Disposable after your move</div><div class="kpi ${disposableClass}">${money(p.disposableAfter)}</div><div class="${dispDelta>=0?'deltaUp':'deltaDown'}">${dispDelta>=0?'+':''}${money(dispDelta)}</div></div>
        <div class="playScore"><div class="muted">Mileage deduction</div><div class="kpi">${money(p.mileageValue)}</div><div class="tiny">Reduces tax, not cash spent.</div></div>
        <div class="playScore"><div class="muted">Rough tax after your move</div><div class="kpi">${money(p.taxAfter)}</div></div>
      </div>
      <div class="callout" style="margin-top:14px">
        <strong>${p.disposableAfter<0?'This move still leaves you short.':'This move looks stronger.'}</strong>
        <div class="tiny" style="margin-top:8px">${p.disposableAfter<0?'Try increasing income, trimming costs, or capturing more mileage and business costs.':'You can now turn any of these test values into real entries below.'}</div>
      </div>
      <div class="chips" style="margin-top:14px">
        <button class="chip green" id="usePlayExpense">Make expense real</button>
        <button class="chip green" id="usePlayMiles">Make mileage real</button>
        <button class="chip green" id="usePlayIncome">Make income real</button>
        <button class="chip green" id="usePlayStaff">Make staff real</button>
      </div>
    </section>`;
}

function renderTimeline(){
  const entries=periodEntries();
  const t=totals(entries, state.selectedTaxYear);
  const staff=staffSummary(entries);
  return `
    <section class="card">
      <div class="between"><div><div class="sectionTitle">Timeline</div><div class="muted">Everything you have added, in one clean place.</div></div><span class="lightpill">${entries.length} shown / ${(state.entries||[]).length} total</span></div>
      <div class="grid2" style="margin-top:12px">
        <div class="field"><label>Tax year</label><select id="timelineTaxYearSelect">${taxYearOptions().map(y=>`<option value="${y}" ${state.selectedTaxYear===y?'selected':''}>${y}</option>`).join('')}</select></div>
        <div class="field"><label>Period</label><select id="timelineQuarterSelect">${quarterOptions().map(q=>`<option value="${q}" ${state.selectedQuarter===q?'selected':''}>${q==='all'?'Full year':q}</option>`).join('')}</select></div>
      </div>
      ${entries.length ? entries.map((e)=>`<div class="entry">
        <div style="flex:1"><strong>${entryTitle(e)}</strong>
          <div class="muted">${e.date} · ${e.note||e.category||''}</div>
          ${e.autoAdded ? `<div class="tag auto" style="margin-top:8px">Auto</div>` : ``}
        </div>
        <div style="text-align:right">
          <strong>${money(e.amount)}</strong>
          <div class="inlineActions" style="margin-top:8px;justify-content:flex-end">
            <button class="linkBtn editEntryBtn" data-id="${e.id}">Edit</button>
            <button class="linkBtn deleteEntryBtn" data-id="${e.id}">Delete</button>
          </div>
        </div>
      </div>`).join('') : `<div class="callout" style="margin-top:14px"><strong>No entries in this period yet.</strong><div class="tiny" style="margin-top:6px">Change the filter or add something new.</div></div>`}
    </section>
    <section class="card">
      <div class="grid2">
        <div class="mini"><div class="muted">Mileage deduction</div><div class="kpi">${money(t.mileageDeduction)}</div></div>
        <div class="mini"><div class="muted">Staff cost total</div><div class="kpi">${money(t.staffCost)}</div></div>
      </div>
    </section>
    <section class="card">
      <div class="between"><div class="sectionTitle">Staff summary</div><span class="lightpill">${staff.length} people</span></div>
      ${staff.length ? staff.map(s=>`<div class="repeatRow"><div><strong>${s.name}</strong><div class="muted">${s.count} item${s.count===1?'':'s'}</div></div><div><strong>${money(s.total)}</strong></div></div>`).join('') : `<div class="tiny" style="margin-top:10px">No staff costs in this period yet.</div>`}
    </section>
    <section class="card">
      <div class="sectionTitle">Documents</div>
      ${state.documents.length ? state.documents.map(d=>`<div class="entry"><div><strong>${d.name}</strong><div class="muted">Stored reference · ${d.kind}</div></div><div class="muted">Saved</div></div>`).join('') : `<div class="gentleNote" style="margin-top:12px">You can keep references here later if you want, but TaxTap is built to stay simple.</div>`}
    </section>
    <section class="footerHelper">
      <div class="between"><div><div class="footerHelperTitle">Stay on track</div><div class="muted">Small habits make the app more useful and tax time feel easier.</div></div><span class="lightpill">Helpful</span></div>
      <div class="gentleNote bottomSpacerNote">${entries.length===0?'This period is empty right now. Add one thing and your timeline starts building itself.':`This period has ${entries.length} item${entries.length===1?'':'s'} and ${state.documents.length} saved document${state.documents.length===1?'':'s'}.`}</div>
      <div class="footerHelperActions">
        <button class="chip" id="footerAddBtn">Add something</button>
        <button class="chip" id="footerSaveDataBtn">Save my data</button>
        <button class="chip" id="footerPlayBtn">Try Play</button>
      </div>
    </section>`;
}
function renderSettings(){
  const ready=hmrcReadiness();
  const year=state.activeSettingsYear || state.selectedTaxYear;
  const profile=profileForYear(year);
  const audit=(state.auditLog||[]).slice(0,12);
  return `
    <section class="card">
      <div class="between"><div><div class="sectionTitle">HMRC-ready details</div><div class="muted">Store what you’ll want later so filing is less stressful.</div></div><span class="lightpill">${ready.filled}/${ready.total}</span></div>
      <div class="stack" style="margin-top:12px">
        <div class="field"><label>Full name</label><input id="fullNameInput" value="${(state.profile.fullName||'').replaceAll('"','&quot;')}"></div>
        <div class="field"><label>Address line 1</label><input id="address1Input" value="${(state.profile.address1||'').replaceAll('"','&quot;')}"></div>
        <div class="field"><label>Town / city</label><input id="address2Input" value="${(state.profile.address2||'').replaceAll('"','&quot;')}"></div>
        <div class="field"><label>Postcode</label><input id="postcodeInput" value="${(state.profile.postcode||'').replaceAll('"','&quot;')}"></div>
        <div class="field"><label>Business name</label><input id="businessNameInput" value="${(state.profile.businessName||'').replaceAll('"','&quot;')}"></div>
        <div class="field"><label>Email</label><input id="emailInput" value="${(state.profile.email||'').replaceAll('"','&quot;')}"></div>
        <div class="field"><label>Phone</label><input id="phoneInput" value="${(state.profile.phone||'').replaceAll('"','&quot;')}"></div>
        <div class="field"><label>UTR</label><input id="utrInput" value="${(state.profile.utr||'').replaceAll('"','&quot;')}"></div>
        <div class="field"><label>Tax code</label><input id="taxCodeInput" value="${(state.profile.taxCode||'').replaceAll('"','&quot;')}"></div>
        <div class="field"><label>NI number</label><input id="niInput" value="${(state.profile.niNumber||'').replaceAll('"','&quot;')}"></div>
      </div>
    </section>

    <section class="card">
      <div class="between"><div><div class="sectionTitle">Tax-year rule engine</div><div class="muted">Period-aware rules, deadlines and mileage now live here.</div></div><span class="lightpill">${year}</span></div>
      <div class="stack" style="margin-top:12px">
        <div class="field"><label>Edit tax year</label>
          <select id="settingsYearSelect">${taxYearOptions().map(y=>`<option value="${y}" ${year===y?'selected':''}>${y}</option>`).join('')}</select>
        </div>
        <div class="field"><label>Profile name</label><input id="profileNameInput" value="${(profile.name||'').replaceAll('"','&quot;')}"></div>
        <div class="grid2">
          <div class="field"><label>Basic rate</label><input id="basicRateInput" type="number" step="0.01" min="0" max="1" value="${Number(profile.basicRate||0).toFixed(2)}"></div>
          <div class="field"><label>Higher rate</label><input id="higherRateInput" type="number" step="0.01" min="0" max="1" value="${Number(profile.higherRate||0).toFixed(2)}"></div>
          <div class="field"><label>Basic band</label><input id="basicBandInput" type="number" step="1" min="0" value="${Number(profile.basicBand||0)}"></div>
          <div class="field"><label>Main mileage rate</label><input id="mileagePrimaryInput" type="number" step="0.01" min="0" value="${Number(profile.mileage.primary||0).toFixed(2)}"></div>
          <div class="field"><label>Second mileage rate</label><input id="mileageSecondaryInput" type="number" step="0.01" min="0" value="${Number(profile.mileage.secondary||0).toFixed(2)}"></div>
          <div class="field"><label>First band limit</label><input id="mileageLimitInput" type="number" step="1" min="0" value="${Number(profile.mileage.limit||0)}"></div>
        </div>
        <div class="grid2">
          <div class="field"><label>Q1 deadline</label><input id="deadlineQ1Input" type="date" value="${profile.deadlines.Q1||''}"></div>
          <div class="field"><label>Q2 deadline</label><input id="deadlineQ2Input" type="date" value="${profile.deadlines.Q2||''}"></div>
          <div class="field"><label>Q3 deadline</label><input id="deadlineQ3Input" type="date" value="${profile.deadlines.Q3||''}"></div>
          <div class="field"><label>Q4 deadline</label><input id="deadlineQ4Input" type="date" value="${profile.deadlines.Q4||''}"></div>
          <div class="field"><label>Year-end deadline</label><input id="deadlineYearEndInput" type="date" value="${profile.deadlines.YEAR_END||''}"></div>
        </div>
        <div class="callout"><strong>Live period rule</strong><div class="tiny" style="margin-top:6px">Selected period: ${selectedPeriodLabel()} · next deadline ${formatDateNice(deadlineForSelection())}</div></div>
        <div class="chips">
          <button class="chip green" id="saveRuleProfileBtn">Save rules for this year</button>
          <button class="chip" id="useThisYearBtn">Use this tax year everywhere</button>
          <button class="chip" id="hmrcGuideBtn">HMRC guide</button>
          <button class="chip" id="exportDataBtn">Save my data</button>
          <button class="chip" id="importDataBtn">Load my data</button>
          <button class="chip" id="resetAppBtn">Reset this device</button>
        </div>
        <input id="importDataFile" type="file" accept="application/json" style="display:none">
      </div>
    </section>

    <section class="card">
      <div class="sectionTitle">Repeat payments</div>
      ${(state.recurring||[]).map(item=>`<div class="repeatRow"><div><strong>${item.label}</strong><div class="muted">${money(item.amount)} · monthly · day ${item.dayOfMonth}</div></div><label class="switch"><input type="checkbox" class="repeatToggle" data-id="${item.id}" ${item.active ? 'checked' : ''}> ${item.active ? 'On' : 'Off'}</label></div>`).join('')}
    </section>

    <section class="card">
      <div class="between"><div class="sectionTitle">Audit trail</div><span class="lightpill">${audit.length} recent</span></div>
      ${audit.map(item=>`<div class="entry"><div><strong>${item.action}</strong><div class="muted">${new Date(item.at).toLocaleString('en-GB')} · ${item.detail||''}</div></div><div class="muted">Logged</div></div>`).join('')}
      <div class="tiny" style="margin-top:8px">This is a light local audit trail for changes, repeats and key actions.</div>
    </section>`;
}
function clearEditingState(){
  state.ui.editingEntryId=null;
}
function resetAddFormForType(type=state.ui.addType){
  state.ui.addType=type;
  state.ui.amount='';
  state.ui.category='';
  state.ui.note='';
  state.ui.miles='';
  state.ui.repeatEnabled=false;
  state.ui.repeatLabel='';
  state.ui.repeatFrequency='monthly';
  state.ui.repeatDay='1';
  state.ui.staffName='';
  state.ui.staffGross='';
  state.ui.staffNI='';
  state.ui.staffPension='';
  state.ui.date=today();
  clearEditingState();
}
function editEntry(entryId){
  const e=(state.entries||[]).find(x=>String(x.id)===String(entryId));
  if(!e) return;
  clearEditingState();
  state.ui.editingEntryId = e.id;
  state.ui.repeatEnabled=false;
  state.ui.repeatLabel='';
  if(e.type==='mileage'){
    state.ui.addType='mileage';
    state.ui.amount='';
    state.ui.category='Travel';
    state.ui.miles=String(e.miles||'');
    state.ui.note=e.note||'';
  } else if(e.type==='staff'){
    state.ui.addType='staff';
    state.ui.amount='';
    state.ui.category='Staff cost';
    state.ui.staffName=(e.note||'').split(' · ')[0] || '';
    state.ui.staffGross=String(e.grossPay||e.amount||'');
    state.ui.staffNI=String(e.employerNI||'');
    state.ui.staffPension=String(e.pension||'');
    state.ui.note=e.note||'';
  } else {
    state.ui.addType=e.type||'expense';
    state.ui.amount=String(e.amount||'');
    state.ui.category=e.category||'';
    state.ui.note=e.note||'';
    state.ui.miles='';
  }
  state.ui.date=e.date||today();
  logAction('Entry edit opened', `${e.type} loaded into Add on ${e.date||today()}`);
  save();
  setTab('add');
  toast('Entry ready to edit');
}

function deleteEntry(entryId){
  const before=(state.entries||[]).length;
  state.entries = (state.entries||[]).filter(x=>String(x.id)!==String(entryId));
  if(state.entries.length !== before){ logAction('Entry deleted', `Removed item ${entryId}`); save(); render(); toast('Entry deleted'); }
}
function bindCommon(){
  document.querySelectorAll('.nav').forEach(btn=>{
    btn.classList.toggle('active', btn.dataset.tab===state.currentTab);
    btn.onclick=()=>setTab(btn.dataset.tab);
  });
  const installBtn=document.getElementById('installBtn'); if(installBtn) installBtn.onclick=()=>toast('Saved on this device. Use Save my data anytime.');
  document.querySelectorAll('.openCalc').forEach(btn=>btn.onclick=()=>openCalc(btn.dataset.target));
  document.querySelectorAll('.useUsual').forEach(btn=>btn.onclick=()=>applyUsual(btn.dataset.key));
}

function bindHome(){
  document.getElementById('readyBtn').onclick=()=>{
    const ready=hmrcReadiness();
    toast(ready.complete ? 'Most key details are saved.' : `You have ${ready.filled}/${ready.total} key details saved so far.`);
  };
  document.getElementById('prepBtn').onclick=()=>openPrepScreen();
  document.getElementById('openMileage').onclick=()=>{state.ui.addType='mileage';save();setTab('add');};
  document.getElementById('manageRepeatsBtn').onclick=()=>setTab('settings');
  const homeTaxYear=document.getElementById('homeTaxYearSelect');
  if(homeTaxYear) homeTaxYear.onchange=()=>{state.selectedTaxYear=homeTaxYear.value; state.taxProfileName=profileForYear(homeTaxYear.value).name; save(); render();};
  const homeQuarter=document.getElementById('homeQuarterSelect');
  if(homeQuarter) homeQuarter.onchange=()=>{state.selectedQuarter=homeQuarter.value; save(); render();};
  document.querySelectorAll('.quickMiles').forEach(btn=>btn.onclick=()=>{
    const miles=Number(btn.dataset.miles||0), amount=mileageAllowance(miles);
    addEntry({type:'mileage',amount,miles,category:'Travel',note:'Quick mileage',date:today()});
    toast(addFeedbackText('mileage', amount));
    render();
  });
  const startIncomeBtn=document.getElementById('startIncomeBtn'); if(startIncomeBtn) startIncomeBtn.onclick=()=>{ resetAddFormForType('income'); setTab('add'); toast('Start with your first income'); };
  const startExpenseBtn=document.getElementById('startExpenseBtn'); if(startExpenseBtn) startExpenseBtn.onclick=()=>{ resetAddFormForType('expense'); setTab('add'); toast('Start with your first expense'); };
  const startMileageBtn=document.getElementById('startMileageBtn'); if(startMileageBtn) startMileageBtn.onclick=()=>{ resetAddFormForType('mileage'); setTab('add'); toast('Start with your first mileage entry'); };
  const startPlayBtn=document.getElementById('startPlayBtn'); if(startPlayBtn) startPlayBtn.onclick=()=>setTab('play');
  const sameBtn=document.getElementById('sameAsYesterdayBtn');
  if(sameBtn) sameBtn.onclick=()=>{
    const last=lastMileageEntry();
    if(!last) return;
    addEntry({type:'mileage',amount:mileageAllowance(last.miles||0),miles:Number(last.miles||0),category:'Travel',note:last.note||'Mileage',date:today()});
    toast('Yesterday’s mileage added again');
    render();
  };
}
function bindAdd(){
  document.querySelectorAll('.mainAction').forEach(btn=>btn.onclick=()=>{
    resetAddFormForType(btn.dataset.type);
    save(); render();
  });
  document.getElementById('gotoPlay').onclick=()=>setTab('play');
  document.querySelectorAll('.quickExpense').forEach(btn=>btn.onclick=()=>{
    const amount=Number(btn.dataset.amount||0), cat=btn.dataset.cat||'Expense';
    addEntry({type:'expense',amount,category:cat,note:'Quick add',date:today()});
    toast(cat+' saved in one tap');
    render();
  });
  document.getElementById('sameAsLastBtn').onclick=()=>{
    const e=state.entries[0]; if(!e) return toast('Nothing to repeat yet');
    const {id,...copy}=e; addEntry({...copy,date:today()}); toast('Repeated last entry'); render();
  };
  const note=document.getElementById('noteInput'); if(note) note.oninput=()=>{state.ui.note=note.value; save();};
  const date=document.getElementById('dateInput'); if(date) date.onchange=()=>{state.ui.date=date.value; save();};
  const cat=document.getElementById('categoryInput'); if(cat) cat.onchange=()=>{state.ui.category=cat.value; save();};
  document.querySelectorAll('.setMiles').forEach(btn=>btn.onclick=()=>{state.ui.miles=btn.dataset.miles; save(); render();});

  const staffName=document.getElementById('staffNameInput'); if(staffName) staffName.oninput=()=>{state.ui.staffName=staffName.value; save();};

  const repeatEnabled=document.getElementById('repeatEnabled');
  if(repeatEnabled){ repeatEnabled.onchange=()=>{state.ui.repeatEnabled = repeatEnabled.checked; save(); render();}; }
  const repeatLabelInput=document.getElementById('repeatLabelInput');
  if(repeatLabelInput) repeatLabelInput.oninput=()=>{state.ui.repeatLabel = repeatLabelInput.value; save();};
  const repeatFrequency=document.getElementById('repeatFrequency');
  if(repeatFrequency) repeatFrequency.onchange=()=>{state.ui.repeatFrequency = repeatFrequency.value; save();};
  const repeatDay=document.getElementById('repeatDay');
  if(repeatDay) repeatDay.onchange=()=>{state.ui.repeatDay = repeatDay.value; save();};

  const saveEntryBtn=document.getElementById('saveEntryBtn');
  if(saveEntryBtn) saveEntryBtn.onclick=()=>{
    const type=state.ui.addType;
    const editingId=state.ui.editingEntryId;
    if(type==='staff'){
      const gross=Number(state.ui.staffGross||0), ni=Number(state.ui.staffNI||0), pension=Number(state.ui.staffPension||0), total=gross+ni+pension;
      if(total<=0) return toast('Enter amount and enter staff cost first');
      const noteText = [state.ui.staffName||'Staff', state.ui.note||''].filter(Boolean).join(' · ');
      const entry = {type:'staff',amount:total,category:'Staff cost',note:noteText,date:state.ui.date||today(),grossPay:gross,employerNI:ni,pension:pension};
      if(editingId){
        updateEntry(editingId, entry);
      } else {
        addEntry(entry);
        if(state.ui.repeatEnabled){
          const label = state.ui.repeatLabel || state.ui.staffName || 'Repeat staff cost';
          state.recurring.unshift({id:uid(), label, type:'staff', amount:total, category:'Staff cost', note:noteText, frequency:'monthly', dayOfMonth:Number(state.ui.repeatDay||1), active:true, lastAutoAddedMonth:currentMonth()});
        }
      }
      toast(editingId ? 'Staff cost updated' : addFeedbackText('staff', total));
      resetAddFormForType('staff'); save(); render();
      return;
    }

    const amount=Number(state.ui.amount||0); if(amount<=0) return toast('Enter amount and enter an amount first');
    const entry = {type:state.ui.addType,amount,category:state.ui.category||(state.ui.addType==='income'?'Invoice':'Expense'),note:state.ui.note||'',date:state.ui.date||today()};
    if(editingId){
      updateEntry(editingId, entry);
    } else {
      addEntry(entry);
      if(state.ui.repeatEnabled && state.ui.addType!=='income'){
        const label = state.ui.repeatLabel || state.ui.note || state.ui.category || 'Repeat payment';
        state.recurring.unshift({id:uid(), label, type:state.ui.addType, amount, category:entry.category, note:entry.note, frequency:'monthly', dayOfMonth:Number(state.ui.repeatDay || 1), active:true, lastAutoAddedMonth:currentMonth()});
      }
    }
    toast(editingId ? 'Entry updated' : addFeedbackText(state.ui.addType, amount));
    resetAddFormForType(state.ui.addType); save(); render();
  };

  const saveMileageBtn=document.getElementById('saveMileageBtn');
  if(saveMileageBtn) saveMileageBtn.onclick=()=>{
    const miles=Number(state.ui.miles||0); if(miles<=0) return toast('Enter amount and enter miles first');
    const amount = mileageAllowance(miles);
    const editingId=state.ui.editingEntryId;
    const entry={type:'mileage',amount,miles,category:'Travel',note:state.ui.note||'Mileage',date:state.ui.date||today()};
    if(editingId){
      updateEntry(editingId, entry);
    } else {
      addEntry(entry);
    }
    toast(editingId ? 'Mileage updated' : addFeedbackText('mileage', amount));
    resetAddFormForType('mileage'); save(); render();
  };

  const cancelEditBtn=document.getElementById('cancelEditBtn');
  if(cancelEditBtn) cancelEditBtn.onclick=()=>{ resetAddFormForType(state.ui.addType||'income'); save(); render(); toast('Edit cancelled'); };

}

function bindPlay(){
  const cleanPlayNumber=(value, wholeOnly=false)=>{
    let next=String(value||'').replace(/[^0-9.]/g,'');
    if(wholeOnly) next=next.replace(/\./g,'');
    else {
      const parts=next.split('.');
      if(parts.length>2) next=parts[0]+'.'+parts.slice(1).join('');
    }
    return next;
  };
  const bindPlayField=(id,key,wholeOnly=false)=>{
    const el=document.getElementById(id);
    if(!el) return;
    const sync=()=>{
      const cleaned=cleanPlayNumber(el.value, wholeOnly);
      if(el.value!==cleaned) el.value=cleaned;
      state.ui[key]=cleaned;
      save();
      render();
    };
    el.addEventListener('input', sync);
    el.addEventListener('focus', ()=>{ if(el.value==='0') el.value=''; });
  };
  bindPlayField('playIncomeInput','playIncome');
  bindPlayField('playExpenseInput','playExpense');
  bindPlayField('playMilesInput','playMiles', true);
  bindPlayField('playStaffInput','playStaff');
  document.getElementById('usePlayExpense').onclick=()=>{
    const amount=Number(state.ui.playExpense||0); if(amount<=0) return toast('Enter a test expense first');
    addEntry({type:'expense',amount,category:'Play expense',note:'From playground',date:today()}); toast(addFeedbackText('expense', amount)); setTab('timeline');
  };
  document.getElementById('usePlayMiles').onclick=()=>{
    const miles=Number(state.ui.playMiles||0); if(miles<=0) return toast('Enter test miles first');
    const amount = mileageAllowance(miles);
    addEntry({type:'mileage',amount,miles,category:'Travel',note:'From playground',date:today()}); toast(addFeedbackText('mileage', amount)); setTab('timeline');
  };
  document.getElementById('usePlayIncome').onclick=()=>{
    const amount=Number(state.ui.playIncome||0); if(amount<=0) return toast('Enter test income first');
    addEntry({type:'income',amount,category:'Play income',note:'From playground',date:today()}); toast(addFeedbackText('income', amount)); setTab('timeline');
  };
  document.getElementById('usePlayStaff').onclick=()=>{
    const amount=Number(state.ui.playStaff||0); if(amount<=0) return toast('Enter test staff cost first');
    addEntry({type:'staff',amount,category:'Staff cost',note:'From playground',date:today(),grossPay:amount,employerNI:0,pension:0}); toast(addFeedbackText('staff', amount)); setTab('timeline');
  };
}

function bindTimeline(){
  document.querySelectorAll('.editEntryBtn').forEach(btn=>btn.onclick=()=>editEntry(btn.dataset.id));
  document.querySelectorAll('.deleteEntryBtn').forEach(btn=>btn.onclick=()=>{
    if(confirm('Delete this entry?')) deleteEntry(btn.dataset.id);
  });
  const y=document.getElementById('timelineTaxYearSelect');
  if(y) y.onchange=()=>{state.selectedTaxYear=y.value; state.taxProfileName=profileForYear(y.value).name; save(); render();};
  const q=document.getElementById('timelineQuarterSelect');
  if(q) q.onchange=()=>{state.selectedQuarter=q.value; save(); render();};
  const footerAddBtn=document.getElementById('footerAddBtn');
  if(footerAddBtn) footerAddBtn.onclick=()=>setTab('add');
  const footerSaveDataBtn=document.getElementById('footerSaveDataBtn');
  if(footerSaveDataBtn) footerSaveDataBtn.onclick=()=>exportAppData();
  const footerPlayBtn=document.getElementById('footerPlayBtn');
  if(footerPlayBtn) footerPlayBtn.onclick=()=>setTab('play');
}
function bindSettings(){
  document.getElementById('hmrcGuideBtn').onclick=()=>window.open(HMRC_URL,'_blank');
  document.getElementById('exportDataBtn').onclick=()=>exportAppData();
  document.getElementById('importDataBtn').onclick=()=>document.getElementById('importDataFile').click();
  document.getElementById('importDataFile').onchange=(event)=>{
    const file=event.target.files && event.target.files[0];
    importAppData(file);
    event.target.value='';
  };
  document.getElementById('resetAppBtn').onclick=()=>{ if(!confirm('This will remove your local TaxTap data on this device. Continue?')) return; localStorage.removeItem(KEY); state=normalizeState(clone(defaultState)); logAction('Local data reset', 'Started fresh on this device'); save(); toast('Local data reset'); render();};
  document.querySelectorAll('.repeatToggle').forEach(box=>box.onchange=()=>{
    const id=Number(box.dataset.id);
    const item=(state.recurring||[]).find(r=>Number(r.id)===id);
    if(item){ item.active=box.checked; logAction('Repeat toggled', `${item.label} ${item.active?'on':'off'}`); save(); toast(item.label+' '+(item.active?'on':'off')); render(); }
  });

  [['fullNameInput','fullName'],['address1Input','address1'],['address2Input','address2'],['postcodeInput','postcode'],['emailInput','email'],['phoneInput','phone'],['businessNameInput','businessName'],['utrInput','utr'],['taxCodeInput','taxCode'],['niInput','niNumber']].forEach(([id,key])=>{
    const el=document.getElementById(id); if(el){ el.oninput=()=>{ state.profile[key]=el.value; if(key==='fullName'){ state.userName=(el.value||'').split(' ')[0] || 'You'; } save(); }; }
  });

  const yearSelect=document.getElementById('settingsYearSelect');
  if(yearSelect) yearSelect.onchange=()=>{state.activeSettingsYear=yearSelect.value; save(); render();};

  const getProfileDraft=()=>{
    const year=state.activeSettingsYear || state.selectedTaxYear;
    const p=profileForYear(year);
    p.name=document.getElementById('profileNameInput').value;
    p.basicRate=Number(document.getElementById('basicRateInput').value||0);
    p.higherRate=Number(document.getElementById('higherRateInput').value||0);
    p.basicBand=Number(document.getElementById('basicBandInput').value||0);
    p.mileage.primary=Number(document.getElementById('mileagePrimaryInput').value||0);
    p.mileage.secondary=Number(document.getElementById('mileageSecondaryInput').value||0);
    p.mileage.limit=Number(document.getElementById('mileageLimitInput').value||0);
    p.deadlines.Q1=document.getElementById('deadlineQ1Input').value;
    p.deadlines.Q2=document.getElementById('deadlineQ2Input').value;
    p.deadlines.Q3=document.getElementById('deadlineQ3Input').value;
    p.deadlines.Q4=document.getElementById('deadlineQ4Input').value;
    p.deadlines.YEAR_END=document.getElementById('deadlineYearEndInput').value;
    state.taxProfiles[year]=p;
    return {year,p};
  };

  document.getElementById('saveRuleProfileBtn').onclick=()=>{
    const {year,p}=getProfileDraft();
    const dates=[p.deadlines.Q1,p.deadlines.Q2,p.deadlines.Q3,p.deadlines.Q4,p.deadlines.YEAR_END];
    const ordered = dates.every(Boolean) && dates.join('|') === [...dates].sort().join('|');
    if(!(p.basicRate>=0 && p.basicRate<=1 && p.higherRate>=0 && p.higherRate<=1)) return toast('Rates must be between 0 and 1');
    if(p.basicBand<=0) return toast('Basic band must be above 0');
    if(p.mileage.primary<0 || p.mileage.secondary<0 || p.mileage.limit<0) return toast('Mileage values cannot be negative');
    if(!ordered) return toast('Deadlines must be valid and in date order');
    if(year===state.selectedTaxYear){
      state.taxProfileName=p.name;
      state.mileage = {...p.mileage};
    }
    logAction('Rule profile saved', `${year} · ${p.name}`);
    save();
    toast('Tax-year rules saved');
    render();
  };
  document.getElementById('useThisYearBtn').onclick=()=>{
    const year=state.activeSettingsYear || state.selectedTaxYear;
    const p=profileForYear(year);
    state.selectedTaxYear=year;
    state.taxProfileName=p.name;
    state.mileage={...p.mileage};
    logAction('Active tax year changed', `${year} now drives reporting`);
    save();
    toast('Tax year switched');
    render();
  };
}
function applyUsual(key){
  const item = usualItems().find(x=>x.key===key);
  if(!item) return;
  if(item.type==='mileage'){
    addEntry({type:'mileage',amount:item.amount,miles:item.miles,category:item.category||'Travel',note:item.note||item.label,date:today()});
  } else if(item.type==='staff'){
    addEntry({type:'staff',amount:item.amount,category:'Staff cost',note:item.note||item.label,date:today(),grossPay:item.grossPay||item.amount,employerNI:item.employerNI||0,pension:item.pension||0});
  } else {
    addEntry({type:item.type||'expense',amount:item.amount,category:item.category||item.label,note:item.note||item.label,date:today()});
  }
  toast(item.label+' added in one tap');
  render();
}

function openCalc(target){
  calcTarget=target;
  const ui=state.ui;
  const map={
    amount: ui.amount||'0',
    miles: ui.miles||'0',
    playIncome: ui.playIncome||'0',
    playExpense: ui.playExpense||'0',
    playMiles: ui.playMiles||'0',
    playStaff: ui.playStaff||'0',
    mileagePrimary: state.mileage.primary||'0',
    mileageSecondary: state.mileage.secondary||'0',
    mileageLimit: state.mileage.limit||'0',
    staffGross: ui.staffGross||'0',
    staffNI: ui.staffNI||'0',
    staffPension: ui.staffPension||'0'
  };
  calcValue=String(map[target] ?? '0');
  updateCalc();
  overlay.classList.add('show');
}
function closeCalc(){overlay.classList.remove('show'); calcTarget=null;}
function updateCalc(){calcDisplay.textContent=calcValue===''?'0':calcValue;}
function applyCalc(){
  const v=calcValue===''?'0':calcValue;
  if(calcTarget==='amount') state.ui.amount=v;
  else if(calcTarget==='miles') state.ui.miles=v;
  else if(calcTarget==='playIncome') state.ui.playIncome=v;
  else if(calcTarget==='playExpense') state.ui.playExpense=v;
  else if(calcTarget==='playMiles') state.ui.playMiles=v;
  else if(calcTarget==='playStaff') state.ui.playStaff=v;
  else if(calcTarget==='mileagePrimary') state.mileage.primary=Number(v||0);
  else if(calcTarget==='mileageSecondary') state.mileage.secondary=Number(v||0);
  else if(calcTarget==='mileageLimit') state.mileage.limit=Number(v||0);
  else if(calcTarget==='staffGross') state.ui.staffGross=v;
  else if(calcTarget==='staffNI') state.ui.staffNI=v;
  else if(calcTarget==='staffPension') state.ui.staffPension=v;
  save(); closeCalc(); render();
}

const closeCalcBtn=document.getElementById('closeCalc'); if(closeCalcBtn) closeCalcBtn.onclick=closeCalc;
const saveCalcBtn=document.getElementById('saveCalc'); if(saveCalcBtn) saveCalcBtn.onclick=applyCalc;
document.querySelectorAll('.key[data-key]').forEach(btn=>btn.onclick=()=>{
  const k=btn.dataset.key;
  if(k==='clear'){calcValue='0';}
  else if(k==='back'){calcValue=calcValue.length>1?calcValue.slice(0,-1):'0';}
  else if(k==='plusminus'){if(calcValue.startsWith('-')) calcValue=calcValue.slice(1); else if(calcValue!=='0') calcValue='-'+calcValue;}
  else if(k==='.'){if(!calcValue.includes('.')) calcValue+= '.';}
  else { if(calcValue==='0' && k!=='00') calcValue=k; else calcValue+=k; }
  updateCalc();
});

function render(){
  const autoAdded = maybeAutoAddRecurring();
  if(state.currentTab==='home') screen.innerHTML=renderHome();
  else if(state.currentTab==='add') screen.innerHTML=renderAdd();
  else if(state.currentTab==='play') screen.innerHTML=renderPlay();
  else if(state.currentTab==='timeline') screen.innerHTML=renderTimeline();
  else screen.innerHTML=renderSettings();
  bindCommon();
  if(state.currentTab==='home') bindHome();
  if(state.currentTab==='add') bindAdd();
  if(state.currentTab==='play') bindPlay();
  if(state.currentTab==='timeline') bindTimeline();
  if(state.currentTab==='settings') bindSettings();
  if(autoAdded) toast(autoAdded+' repeat payment'+(autoAdded>1?'s':'')+' added for this month');
}
try {
  render();
} catch (err) {
  console.error(err);
  if(screen){ screen.innerHTML = '<section class="card"><h2>TaxTap hit a loading problem</h2><p>Please refresh the page. Your saved data on this device has not been removed.</p><pre style="white-space:pre-wrap;font-size:.85rem">'+String(err && err.message ? err.message : err)+'</pre></section>'; }
}
})();
