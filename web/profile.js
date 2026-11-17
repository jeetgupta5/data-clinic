(function(root){
'use strict';
const missing = new Set(['','na','n/a','null','none','nan']);
function parseCSV(text){
 text=text.replace(/^\uFEFF/,''); if(text.includes('\0'))throw Error('The file contains null bytes.');
 let rows=[],row=[],cell='',quoted=false,closed=false;
 for(let i=0;i<text.length;i++){
  let c=text[i];
  if(quoted){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else {quoted=false;closed=true;}}else cell+=c; continue;}
  if(c==='"'){if(cell||closed)throw Error('Unexpected quote in CSV.');quoted=true;}
  else if(c===','){row.push(cell);cell='';closed=false;}
  else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);rows.push(row);row=[];cell='';closed=false;if(rows.length>50001)throw Error('Maximum 50,000 data rows.');}
  else {if(closed)throw Error('Unexpected text after a closing quote.');cell+=c;}
 }
 if(quoted)throw Error('An opening quote is missing its closing quote.');
 if(cell||row.length||closed){row.push(cell);rows.push(row);}
 const headers=rows.shift();
 if(!headers||headers.some(h=>!h.trim()))throw Error('Use non-empty column names.');
 if(new Set(headers.map(h=>h.trim())).size!==headers.length)throw Error('Column names must be unique after trimming.');
 if(headers.length>200)throw Error('Maximum 200 columns.');
 if(!rows.length)throw Error('The CSV needs at least one data row.');
 rows.forEach((r,i)=>{if(r.length!==headers.length)throw Error(`Record ${i+2} has ${r.length} fields; expected ${headers.length}.`);});
 return {headers,rows};
}
function numeric(v){const t=v.trim(); if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(t))return null; const n=Number(t);return Number.isFinite(n)?n:null;}
function q(a,f){let p=(a.length-1)*f,l=Math.floor(p);return a[l]*(1-(p-l))+a[Math.min(l+1,a.length-1)]*(p-l);}
function profile({headers,rows}){
 let seen=new Set(),duplicates=0;rows.forEach(r=>{let k=JSON.stringify(r);if(seen.has(k))duplicates++;seen.add(k);});
 const columns=headers.map((name,i)=>{
  const raw=rows.map(r=>r[i]),present=raw.filter(v=>!missing.has(v.trim().toLowerCase())),nums=present.map(numeric),all=present.length>0&&nums.every(n=>n!==null);
  let c={name,type:all?'numeric':present.length?'text':'empty',missing:rows.length-present.length,unique:new Set(present).size,whitespace:present.filter(v=>v!==v.trim()).length,numericLike:nums.filter(n=>n!==null).length};
  c.missingPercent=c.missing/rows.length*100;
  if(all){let a=nums.sort((a,b)=>a-b),q1=q(a,.25),q3=q(a,.75),iqr=q3-q1; c.stats={min:a[0],max:a.at(-1),median:q(a,.5),iqr,outliers:iqr? a.filter(n=>n<q1-1.5*iqr||n>q3+1.5*iqr).length:0};}
  return c;
 });
 return {rows:rows.length,columns:headers.length,duplicates,missing:columns.reduce((s,c)=>s+c.missing,0),outliers:columns.reduce((s,c)=>s+(c.stats?.outliers||0),0),columnProfiles:columns,methodology:{missingTokens:[...missing],duplicates:'Exact cell strings',outliers:'1.5 IQR; skipped when IQR is zero',limitations:'Review hints only. No automatic cleaning or leakage detection.'}};
}
const api={parseCSV,profile}; if(typeof module!=='undefined')module.exports=api;else root.DataClinic=api;
})(globalThis);
