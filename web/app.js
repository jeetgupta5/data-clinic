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

let cleaned=null;
const cleaningIds=['clean-trim','clean-normalize','clean-dedupe','clean-missing'];
function resetCleaning(){cleaned=null;['clean-trim','clean-normalize','clean-dedupe'].forEach(id=>$(id).checked=false);$('clean-missing').value='keep';invalidateCleaning();}
function invalidateCleaning(){cleaned=null;$('clean-result').hidden=true;$('clean-state').textContent='Preview needed. Original dashboard metrics remain unchanged.';}
cleaningIds.forEach(id=>$(id).onchange=invalidateCleaning);
$('clean-reset').onclick=resetCleaning;
function downloadFile(text,type,name){const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('clean-preview').onclick=()=>{
 if(!current)return;
 try{
 cleaned=DataClinicCleaning.clean(current.data,{trim:$('clean-trim').checked,normalize:$('clean-normalize').checked,deduplicate:$('clean-dedupe').checked,missing:$('clean-missing').value});
 const before=current.report,after=cleaned.report;
 $('clean-comparison').replaceChildren();[['Rows',before.rows,after.rows],['Missing cells',before.missing,after.missing],['Duplicate rows',before.duplicates,after.duplicates],['Potential outliers',before.outliers,after.outliers]].forEach(([label,b,a])=>{const tr=element('tr');tr.append(element('td',label),element('td',fmt(b)),element('td',fmt(a)));$('clean-comparison').append(tr);});
 $('clean-log').replaceChildren();if(!cleaned.log.length)$('clean-log').append(element('p','No transformations selected. Preview matches the original.','muted small'));
 cleaned.log.forEach(entry=>{const block=element('div',undefined,'log-entry');block.append(element('strong',entry.step),element('p',`${fmt(entry.cellsChanged)} cells changed · ${fmt(entry.rowsRemoved)} rows removed`));if(entry.notes)block.append(element('p',entry.notes));$('clean-log').append(block);});
 const table=$('clean-table');table.replaceChildren();let head=element('thead'),hr=element('tr');cleaned.data.headers.forEach(h=>hr.append(element('th',h)));head.append(hr);let body=element('tbody');cleaned.data.rows.slice(0,5).forEach(row=>{const tr=element('tr');row.forEach(v=>tr.append(element('td',v)));body.append(tr);});table.append(head,body);
 $('clean-empty').hidden=after.rows>0;const exported=DataClinicCleaning.exportCSV(cleaned.data);$('clean-protection').textContent=`${fmt(exported.protectedCells)} exported cells or headers will receive spreadsheet formula protection.`;
 $('clean-result').hidden=false;$('clean-state').textContent=`Preview ready: ${fmt(after.rows)} rows remain. Original dataset unchanged.`;
 }catch(e){cleaned=null;$('clean-result').hidden=true;$('clean-state').textContent=e.message;}
};
$('clean-download').onclick=()=>{if(!cleaned)return;downloadFile(DataClinicCleaning.exportCSV(cleaned.data).text,'text/csv;charset=utf-8',current.name.replace(/\.csv$/i,'')+'-cleaned.csv');};
$('clean-audit').onclick=()=>{if(!cleaned)return;downloadFile(JSON.stringify({dataset:current.name,options:cleaned.options,before:current.report,after:cleaned.report,transformations:cleaned.log,exportProtection:{policy:'Prefix dangerous spreadsheet formula cells and headers with apostrophe',cells:DataClinicCleaning.exportCSV(cleaned.data).protectedCells}},null,2),'application/json','dataclinic-cleaning-log.json');};
