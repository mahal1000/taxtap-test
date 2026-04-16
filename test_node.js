const fs = require('fs');
const html = fs.readFileSync('/tmp/taxtap/TaxTap.html','utf8');
let script = html.split('<script>')[1].split('</script>')[0];
script = script.replace(/\}\)\(\);\s*$/, "globalThis.__app={get state(){return state;}, setState:(v)=>{state=normalizeState(v); save();}, normalizeState, save, render, totals, periodEntries, taxBreakdownForProfit, profileForYear, hmrcPrepData, HMRC_URL};})();");

function el(){
  return {
    innerHTML:'', textContent:'', value:'', checked:false, files:[], style:{}, dataset:{},
    onclick:null, onchange:null,
    addEventListener(){}, remove(){}, appendChild(){}, click(){}, scrollIntoView(){}, focus(){},
  };
}
const screenEl = el();
const els = {screen: screenEl, calcOverlay: el(), calcDisplay: el(), closeCalc: el(), saveCalc: el()};
const document = {
  body: el(),
  createElement(){ return el(); },
  getElementById(id){ if(!els[id]) els[id]=el(); return els[id]; },
  querySelector(){ return null; },
  querySelectorAll(){ return []; },
};
const localStorageData = new Map();
const context = {
  console,
  document,
  window: {open(){}, addEventListener(){}, URL:{createObjectURL(){return 'blob:x';}, revokeObjectURL(){} }},
  URL:{createObjectURL(){return 'blob:x';}, revokeObjectURL(){} },
  Blob: function(){},
  navigator:{clipboard:{writeText: async()=>{}}},
  localStorage:{getItem:(k)=>localStorageData.get(k)||null,setItem:(k,v)=>localStorageData.set(k,v),removeItem:(k)=>localStorageData.delete(k),clear:()=>localStorageData.clear()},
  sessionStorage:{clear(){}},
  confirm(){return true;},
  alert(){},
  requestAnimationFrame(fn){ return fn(); },
  setTimeout(fn){ return 0; },
  clearTimeout(){},
  FileReader: function(){ this.readAsText=(file)=>{ if(this.onload) this.onload({target:{result:''}}); }; },
};
const vm = require('vm');
vm.createContext(context);
vm.runInContext(script, context);
const app = context.__app;

const monthlyIncome = [28000,30000,32000,29000,31000,33000,34000,35000,42000,36000,34000,36000];
const monthlyStock = [9000,9500,9800,9200,9600,10200,10400,10800,12500,11000,10600,11000];
const monthlyRent = Array(12).fill(1800);
const monthlyUtil = [420,430,450,440,445,460,470,480,520,500,490,495];
const monthlyPack = [380,390,395,385,400,410,420,430,470,440,430,440];
const monthlyStaff = [4200,4300,4400,4250,4350,4450,4550,4650,5100,4800,4700,4800];
const monthlyMiles = [120,110,130,125,140,145,150,155,170,160,150,145];
const months = ['2026-04-15','2026-05-15','2026-06-15','2026-07-15','2026-08-15','2026-09-15','2026-10-15','2026-11-15','2026-12-15','2027-01-15','2027-02-15','2027-03-15'];
let uid=1; const entries=[];
for(let i=0;i<12;i++){
 entries.push({id:uid++,type:'income',amount:monthlyIncome[i],category:'Sales',note:'Flower shop sales',date:months[i]});
 entries.push({id:uid++,type:'expense',amount:monthlyStock[i],category:'Stock',note:'Flowers and stock',date:months[i]});
 entries.push({id:uid++,type:'expense',amount:monthlyRent[i],category:'Rent',note:'Shop rent',date:months[i]});
 entries.push({id:uid++,type:'expense',amount:monthlyUtil[i],category:'Utilities',note:'Utilities',date:months[i]});
 entries.push({id:uid++,type:'expense',amount:monthlyPack[i],category:'Packaging',note:'Packaging',date:months[i]});
 entries.push({id:uid++,type:'staff',amount:monthlyStaff[i],category:'Staff cost',note:'Team member · wages',date:months[i],grossPay:monthlyStaff[i]-300,employerNI:220,pension:80});
 entries.push({id:uid++,type:'mileage',amount:Math.round(monthlyMiles[i]*45)/100,miles:monthlyMiles[i],category:'Travel',note:'Supplier run',date:months[i]});
}
const state = {
  currentTab:'home', selectedTaxYear:'2026/27', selectedQuarter:'all', activeSettingsYear:'2026/27',
  profile:{fullName:'Asha Florals',address1:'12 Market Row',postcode:'B1 1AA',businessName:'Asha Flower Shop',utr:'1234567890',taxCode:'1257L',niNumber:'QQ123456C'},
  entries, documents:[{id:1}], recurring:[], auditLog:[], mileage:{primary:0.45,secondary:0.25,limit:10000}, ui:{reportView:'quarter',date:'2026-04-15'}
};
app.setState(state);
const out = { HMRC_URL: app.HMRC_URL, annual: app.totals(app.periodEntries('2026/27','all'),'2026/27') };
['Q1','Q2','Q3','Q4'].forEach(q=> { out[q]=app.totals(app.periodEntries('2026/27',q),'2026/27'); });
out.tax100k = app.taxBreakdownForProfit(100000, app.profileForYear('2026/27'));
out.tax110k = app.taxBreakdownForProfit(110000, app.profileForYear('2026/27'));
out.tax130k = app.taxBreakdownForProfit(130000, app.profileForYear('2026/27'));
out.prepQuarter = app.hmrcPrepData('quarter');
out.prepYear = app.hmrcPrepData('year');
fs.writeFileSync('/tmp/taxtap/test_results.json', JSON.stringify(out,null,2));
console.log(JSON.stringify(out,null,2));
