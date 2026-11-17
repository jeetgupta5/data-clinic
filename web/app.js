'use strict';
const $=id=>document.getElementById(id);
const SAMPLE='name,age,score,city\nAnaya,21,78,Bhopal\nKabir,22,85,Indore\nAnaya,21,78,Bhopal\nRiya,NA,91,Shahdol\nDev,23,82," Delhi "\nMeera,21,80,Jaipur\nArjun,22,900,Pune\n';
let current=null,request=0;
const fmt=n=>n.toLocaleString(undefined,{maximumFractionDigits:2});
function element(tag,text,className){let e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(className)e.className=className;return e;}
function error(message){$('error').textContent=message;$('error').hidden=false;}
function load(text,name){
 try{if(new TextEncoder().encode(text).length>5*1024*1024)throw Error('Choose a file no larger than 5 MiB.');const data=DataClinic.parseCSV(text),report=DataClinic.profile(data);current={data,report,name};$('error').hidden=true;render();$('status').textContent=`Analyzed ${name}: ${report.rows} rows and ${report.columns} columns.`;}catch(e){error(e.message);}
}
async function readFile(file){if(!file)return;const id=++request;if(file.size>5*1024*1024){error('Choose a file no larger than 5 MiB.');return;}try{const bytes=await file.arrayBuffer();const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);if(id===request)load(text,file.name);}catch(e){if(id===request)error('Unable to read this file. Please use a UTF-8 CSV.');}}
$('browse').onclick=()=>$('file').click();$('file').onchange=e=>{readFile(e.target.files[0]);e.target.value='';};$('sample').onclick=()=>{request++;load(SAMPLE,'students_sample.csv');};
const zone=$('dropzone');['dragenter','dragover'].forEach(event=>zone.addEventListener(event,e=>{e.preventDefault();zone.classList.add('drag');}));['dragleave','drop'].forEach(event=>zone.addEventListener(event,e=>{e.preventDefault();zone.classList.remove('drag');}));zone.addEventListener('drop',e=>readFile(e.dataTransfer.files[0]));
function render(){
 resetCleaning();
 renderCharts();
 const {report:r,name,data}=current;$('results').hidden=false;$('empty').hidden=true;$('detail').hidden=true;$('search').value='';$('filename').textContent=name;$('analysed').textContent=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
 ['rows','missing','duplicates','outliers'].forEach(id=>$(id).textContent=fmt(r[id]));$('missing-sub').textContent=`${fmt(r.missing/(r.rows*r.columns)*100)}% of all cells`;
 const present=(1-r.missing/(r.rows*r.columns))*100;$('complete').textContent=fmt(present)+'%';$('donut').style.background=`conic-gradient(#6c9876 0 ${present}%,#edf0e8 ${present}% 100%)`;$('shape').textContent=`${fmt(r.columns)} columns across ${fmt(r.rows)} records`;
 const signals=[['◌','Missing values', 'Cells with empty values or recognized missing tokens.',r.missing],['▱','Repeated records','Exact duplicate rows, counting repeats after the first.',r.duplicates],['⌁','Unusual numeric values','Potential outliers flagged by the 1.5 IQR rule.',r.outliers]];
 $('findings').replaceChildren();signals.forEach(([icon,title,description,count])=>{const row=element('div',undefined,'finding'),copy=element('div');copy.append(element('strong',title),element('p',description));row.append(element('span',icon,'signal-icon'),copy,element('span',fmt(count),'count'));$('findings').append(row);});
 renderColumns();const table=$('preview');table.replaceChildren();let head=element('thead'),hr=element('tr');data.headers.forEach(h=>hr.append(element('th',h)));head.append(hr);let body=element('tbody');data.rows.slice(0,5).forEach(row=>{const tr=element('tr');row.forEach(v=>tr.append(element('td',v)));body.append(tr);});table.append(head,body);
}
function renderColumns(){if(!current)return;const query=$('search').value.toLowerCase();$('column-body').replaceChildren();let count=0;current.report.columnProfiles.forEach((c,i)=>{if(!c.name.toLowerCase().includes(query))return;count++;let tr=element('tr');tr.append(element('td',c.name));let type=element('td');type.append(element('span',c.type,'type '+c.type));tr.append(type,element('td',`${fmt(c.missing)} (${fmt(c.missingPercent)}%)`),element('td',fmt(c.unique)));let notes=[];if(c.whitespace)notes.push(`${c.whitespace} whitespace`);if(c.stats?.outliers)notes.push(`${c.stats.outliers} outliers`);if(c.type==='text'&&c.numericLike)notes.push('Mixed values');tr.append(element('td',notes.join(' · ')||'—','signal'));let action=element('td'),button=element('button','Details ↗');button.setAttribute('aria-label',`View details for ${c.name}`);button.onclick=()=>detail(i);action.append(button);tr.append(action);$('column-body').append(tr);});$('no-columns').hidden=count>0;}
$('search').oninput=renderColumns;
function detail(i){let c=current.report.columnProfiles[i],box=$('detail');box.replaceChildren();let close=element('button','×');close.setAttribute('aria-label','Close column details');close.onclick=()=>box.hidden=true;box.append(close,element('strong',c.name));let text=c.stats?`Minimum: ${fmt(c.stats.min)} · Median: ${fmt(c.stats.median)} · Maximum: ${fmt(c.stats.max)} · IQR: ${fmt(c.stats.iqr)}`:`${fmt(c.numericLike)} finite numeric-like cells among nonmissing values.`;box.append(element('p',text),element('p',`${fmt(c.whitespace)} nonmissing cells have surrounding whitespace. Values are preserved. Outlier flags require review; identifiers may be inferred as numeric.`));box.hidden=false;box.scrollIntoView({behavior:'smooth',block:'nearest'});}
$('export').onclick=()=>{if(!current)return;const blob=new Blob([JSON.stringify({dataset:current.name,...current.report},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='dataclinic-report.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};

let cleaned=null,rules=null,ruleHistory=[],reviewPage=0,recipeRequest=0;
const A=DataClinicAdvanced;
function downloadFile(text,type,name){const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function invalidateCleaning(){cleaned=null;$('clean-result').hidden=true;$('clean-state').textContent='Rules changed. Preview again to review this configuration.';}
function resetCleaning(){recipeRequest++;rules=A.defaults(current.data.headers);ruleHistory=[];renderRules();invalidateCleaning();}
function editRule(change){ruleHistory.push(JSON.stringify(rules));if(ruleHistory.length>30)ruleHistory.shift();change();renderRules();invalidateCleaning();}
function renderRules(){
 $('rules-body').replaceChildren();rules.columns.forEach((c,i)=>{
  const tr=element('tr');tr.append(element('td',c.name));
  function control(key,kind,choices){const td=element('td'),input=document.createElement(kind==='select'?'select':'input');input.setAttribute('aria-label',`${c.name}: ${key}`);
   if(kind==='select'){choices.forEach(([value,label])=>{const opt=element('option',label);opt.value=value;input.append(opt);});input.value=c[key];}
   else if(kind==='checkbox'){input.type='checkbox';input.checked=c[key];}
   else{input.type='text';input.value=c[key];if(['min','max'].includes(key)){input.className='bound';input.inputMode='decimal';}}
   if(key==='value'){input.disabled=c.missing!=='custom';input.placeholder='Replacement';}
   if(['min','max'].includes(key))input.placeholder='None';
   if(kind==='text'){
    let recorded=false;input.onfocus=()=>{recorded=false;};input.oninput=()=>{if(!recorded){ruleHistory.push(JSON.stringify(rules));if(ruleHistory.length>30)ruleHistory.shift();recorded=true;}rules.columns[i][key]=input.value;$('rules-undo').disabled=false;invalidateCleaning();};
   }else input.onchange=()=>{const value=kind==='checkbox'?input.checked:input.value;editRule(()=>{rules.columns[i][key]=value;if(key==='type'&&value==='id'&&['median','mode'].includes(rules.columns[i].missing))rules.columns[i].missing='keep';});};td.append(input);tr.append(td);
  }
  control('type','select',[['auto','Auto'],['id','Identifier'],['text','Text'],['number','Number'],['date','ISO date']]);control('trim','checkbox');control('normalize','checkbox');
  control('missing','select',[['keep','Keep missing'],['drop','Drop row'],['median','Fill median'],['mode','Fill mode'],['custom','Custom value']].filter(([v])=>c.type!=='id'||!['median','mode'].includes(v)));
  control('value','text');control('required','checkbox');control('unique','checkbox');control('min','text');control('max','text');$('rules-body').append(tr);
 });$('clean-dedupe').checked=rules.deduplicate;$('rules-undo').disabled=!ruleHistory.length;
}
$('clean-dedupe').onchange=()=>{const checked=$('clean-dedupe').checked;editRule(()=>rules.deduplicate=checked);};
$('clean-reset').onclick=()=>{if(!current)return;editRule(()=>rules=A.defaults(current.data.headers));};
$('rules-undo').onclick=()=>{if(!ruleHistory.length)return;rules=JSON.parse(ruleHistory.pop());renderRules();invalidateCleaning();};
$('recipe-save').onclick=()=>{if(!current)return;try{const saved=A.recipe(rules,current.data.headers);downloadFile(JSON.stringify(saved,null,2),'application/json','dataclinic-recipe.json');$('clean-state').textContent='Recipe exported. It contains rules and any custom replacement values, not dataset rows.';}catch(e){$('clean-state').textContent=e.message;}};
$('recipe-load').onclick=()=>$('recipe-file').click();
$('recipe-file').onchange=async e=>{const file=e.target.files[0];e.target.value='';if(!file||!current)return;const id=++recipeRequest;try{if(file.size>256*1024)throw Error('Recipe must be at most 256 KiB.');const text=await file.text();if(id!==recipeRequest)return;const parsed=A.recipe(JSON.parse(text),current.data.headers);editRule(()=>rules=parsed);$('clean-state').textContent='Recipe imported. Review the rules, then preview cleaning.';}catch(err){if(id===recipeRequest)$('clean-state').textContent='Recipe not imported: '+err.message;}};
function tableData(table,headers,rows){table.replaceChildren();const head=element('thead'),hr=element('tr');headers.forEach(h=>hr.append(element('th',h)));head.append(hr);const body=element('tbody');rows.forEach(values=>{const tr=element('tr');values.forEach(v=>tr.append(element('td',String(v))));body.append(tr);});table.append(head,body);}
$('clean-preview').onclick=()=>{
 if(!current)return;
 try{
 cleaned=A.run(current.data,rules);const b=current.report,a=cleaned.report;
 tableData($('clean-comparison'),['Measure','Original','Cleaned preview'],[['Rows',b.rows,a.rows],['Missing cells',b.missing,a.missing],['Duplicate rows',b.duplicates,a.duplicates],['Potential outliers',b.outliers,a.outliers],['Validation violations',cleaned.validation.before.total,cleaned.validation.after.total]]);
 $('clean-log').replaceChildren();if(!cleaned.log.length)$('clean-log').append(element('p','No transformations selected. Preview matches the original.','muted small'));
 cleaned.log.forEach(entry=>{const block=element('div',undefined,'log-entry');block.append(element('strong',entry.step),element('p',`${fmt(entry.cellsChanged)} cell edits · ${fmt(entry.rowsRemoved)} rows removed`));if(entry.notes)block.append(element('p',entry.notes));$('clean-log').append(block);});
 tableData($('clean-table'),['Source record',...cleaned.data.headers],cleaned.data.rows.slice(0,5).map((r,i)=>[cleaned.sourceRows[i],...r]));
 $('clean-empty').hidden=a.rows>0;const out=DataClinicCleaning.exportCSV(cleaned.data);$('clean-protection').textContent=`${fmt(out.protectedCells)} exported cells or headers will receive spreadsheet formula protection.`;
 $('clean-result').hidden=false;$('clean-state').textContent=`Preview ready: ${fmt(a.rows)} rows remain; ${fmt(cleaned.changedCells)} distinct cells edited; ${fmt(cleaned.removed.length)} rows removed. Original unchanged.`;reviewPage=0;renderReview();
 }catch(e){invalidateCleaning();$('clean-state').textContent=e.message;}
};
function renderReview(){if(!cleaned)return;const type=$('review-filter').value,items=type==='changes'?cleaned.changes:type==='removed'?cleaned.removed:cleaned.validation.after.issues,limit=20,pages=Math.max(1,Math.ceil(items.length/limit));reviewPage=Math.min(reviewPage,pages-1);const part=items.slice(reviewPage*limit,(reviewPage+1)*limit);
 if(type==='changes'){tableData($('review-table'),['Source record','Column','Before','After','Step'],part.map(c=>[c.row,c.column,c.before,c.after,c.step]));const rows=$('review-table').querySelectorAll('tbody tr');rows.forEach(row=>{row.children[2].className='change-before';row.children[3].className='change-after';});}
 if(type==='removed')tableData($('review-table'),['Source record','Reason'],part.map(c=>[c.row,c.reason]));
 if(type==='validation')tableData($('review-table'),['Source record','Column','Value','Violation'],part.map(c=>[cleaned.sourceRows[c.row-2],c.column,c.value,c.message]));
 $('review-page').textContent=`${reviewPage+1} / ${pages}`;$('review-prev').disabled=reviewPage===0;$('review-next').disabled=reviewPage>=pages-1;
 const truncated=type==='changes'?cleaned.changesTruncated:type==='validation'?cleaned.validation.after.truncated:false;
 $('review-note').textContent=(items.length?`${fmt(items.length)} ${type==='changes'?'cell edits':type==='removed'?'removed rows':'violations'} available. `:'No items in this view. ')+(truncated?'Details limited to the first 2,000; aggregate counts cover all records. ':'')+'Source record numbers count CSV records including the header; multiline fields may span multiple file lines.';
}
$('review-filter').onchange=()=>{reviewPage=0;renderReview();};$('review-prev').onclick=()=>{reviewPage--;renderReview();};$('review-next').onclick=()=>{reviewPage++;renderReview();};
$('clean-download').onclick=()=>{if(cleaned)downloadFile(DataClinicCleaning.exportCSV(cleaned.data).text,'text/csv;charset=utf-8',current.name.replace(/\.csv$/i,'')+'-cleaned.csv');};
$('clean-audit').onclick=()=>{if(!cleaned)return;const {data,...audit}=cleaned;downloadFile(JSON.stringify({dataset:current.name,before:current.report,...audit,exportProtection:{policy:'Apostrophe prefix for spreadsheet formulas',cells:DataClinicCleaning.exportCSV(data).protectedCells}},null,2),'application/json','dataclinic-cleaning-log.json');};
function renderCharts(){
 const cols=current.report.columnProfiles;$('missing-chart').replaceChildren();[...cols].sort((a,b)=>b.missing-a.missing).slice(0,12).forEach(c=>{const row=element('div',undefined,'missing-row'),track=element('div',undefined,'bar-track'),fill=element('div',undefined,'bar-fill');fill.style.width=c.missingPercent+'%';track.append(fill);const name=element('span',c.name);name.title=c.name;row.append(name,track,element('span',fmt(c.missingPercent)+'%'));$('missing-chart').append(row);});
 const select=$('distribution-column');select.replaceChildren();cols.forEach((c,i)=>{if(c.type==='numeric'){const opt=element('option',c.name);opt.value=String(i);select.append(opt);}});if(!select.options.length){const opt=element('option','No numeric columns');opt.value='';select.append(opt);}renderDistribution();
}
function renderDistribution(){const value=$('distribution-column').value;$('histogram').replaceChildren();if(value===''){tableData($('histogram-table'),['Information'],[['No fully numeric columns in this dataset.']]);return;}const index=Number(value),bins=A.histogram(current.data.rows.map(r=>r[index])),max=Math.max(1,...bins.map(b=>b.count));$('distribution-title').textContent=current.data.headers[index]+' · distribution';$('histogram').setAttribute('aria-label',`Histogram of ${current.data.headers[index]}; exact bin counts in the table below.`);bins.forEach(b=>{const bar=element('div',undefined,'hist-bin');bar.style.height=(b.count/max*85)+'%';bar.title=`${fmt(b.low)} to ${fmt(b.high)}: ${b.count} records`;bar.append(element('span',String(b.count)));$('histogram').append(bar);});tableData($('histogram-table'),['Bin range (last includes upper bound)','Records'],bins.map(b=>[`${fmt(b.low)} – ${fmt(b.high)}`,b.count]));}
$('distribution-column').onchange=renderDistribution;
