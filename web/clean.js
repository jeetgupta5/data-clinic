(function(root){
'use strict';
const api=typeof module!=='undefined'?require('./profile.js'):root.DataClinic;
const isMissing=v=>['','na','n/a','null','none','nan'].includes(v.trim().toLowerCase());
function clean(data,options={}){
 const policy=options.missing||'keep';
 if(!['keep','drop','fill'].includes(policy))throw Error('Unknown missing-value policy.');
 let rows=data.rows.map(r=>r.slice()),log=[];
 const record=(step,cells,removed=0,notes='')=>log.push({step,cellsChanged:cells,rowsRemoved:removed,notes});
 if(options.trim){let changed=0;rows=rows.map(r=>r.map(v=>{let next=v.trim();if(next!==v)changed++;return next;}));record('Trim surrounding whitespace',changed);}
 if(options.normalize){let changed=0;rows=rows.map(r=>r.map(v=>{if(isMissing(v)&&v!==''){changed++;return '';}return v;}));record('Normalize missing tokens to empty cells',changed);}
 if(policy==='drop'){let before=rows.length;rows=rows.filter(r=>!r.some(isMissing));record('Drop rows containing missing values',0,before-rows.length);}
 if(policy==='fill'){
  data.headers.forEach((name,i)=>{
   let present=rows.map(r=>r[i]).filter(v=>!isMissing(v));
   if(!rows.some(r=>isMissing(r[i])))return;
   if(!present.length){record(`Fill ${name}`,0,0,'Skipped: no observed values to infer a replacement.');return;}
   const parsed=api.profile({headers:[name],rows:present.map(v=>[v])}).columnProfiles[0];
   let value,method;
   if(parsed.type==='numeric'){
    const numbers=present.map(v=>Number(v.trim())).sort((a,b)=>a-b),mid=Math.floor(numbers.length/2);
    value=String(numbers.length%2?numbers[mid]:numbers[mid-1]/2+numbers[mid]/2);method='median';
   } else {
    const counts=new Map();present.forEach(v=>counts.set(v,(counts.get(v)||0)+1));
    let best=-1;for(const [v,count] of counts){if(count>best){best=count;value=v;}}method='mode (first encountered on ties)';
   }
   let changed=0;rows.forEach(r=>{if(isMissing(r[i])){r[i]=value;changed++;}});
   record(`Fill ${name}`,changed,0,`${method}: ${value}`);
  });
 }
 if(options.deduplicate){let seen=new Set(),before=rows.length;rows=rows.filter(r=>{let key=JSON.stringify(r);if(seen.has(key))return false;seen.add(key);return true;});record('Remove duplicate rows after other transformations',0,before-rows.length);}
 const result={headers:data.headers.slice(),rows};
 return {data:result,report:api.profile(result),log,options:{trim:!!options.trim,normalize:!!options.normalize,missing:policy,deduplicate:!!options.deduplicate}};
}
function exportCSV(data){
 let protectedCells=0;
 function encode(value){let text=String(value);if(/^[\s\uFEFF]*[=+\-@]/u.test(text)||/^[\t\r\n]/.test(text)){text="'"+text;protectedCells++;}return '"'+text.replace(/"/g,'""')+'"';}
 const text='\uFEFF'+[data.headers,...data.rows].map(row=>row.map(encode).join(',')).join('\r\n')+'\r\n';
 return {text,protectedCells};
}
const exported={clean,exportCSV};if(typeof module!=='undefined')module.exports=exported;else root.DataClinicCleaning=exported;
})(globalThis);
