(function(root){
'use strict';
const profileAPI=typeof module!=='undefined'?require('./profile.js'):root.DataClinic;
const missing=v=>['','na','n/a','null','none','nan'].includes(v.trim().toLowerCase());
const numeric=v=>/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(v.trim())&&Number.isFinite(Number(v));
const TYPES=['auto','id','text','number','date'];const METHODS=['keep','drop','median','mode','custom'];
function defaults(headers){return {version:1,headers:headers.slice(),deduplicate:false,columns:headers.map(name=>({name,type:'auto',trim:false,normalize:false,missing:'keep',value:'',required:false,unique:false,min:'',max:''}))};}
function recipe(raw,headers){
 if(!raw||raw.version!==1||!Array.isArray(raw.headers)||JSON.stringify(raw.headers)!==JSON.stringify(headers)||!Array.isArray(raw.columns)||raw.columns.length!==headers.length)throw Error('Recipe must be version 1 and match the current column names and order.');
 if(typeof raw.deduplicate!=='boolean')throw Error('Invalid duplicate-removal option.');
 const result=defaults(headers);result.deduplicate=raw.deduplicate;
 result.columns=raw.columns.map((c,i)=>{
  if(!c||c.name!==headers[i]||!TYPES.includes(c.type)||!METHODS.includes(c.missing))throw Error(`Invalid rule for column ${headers[i]}.`);
  for(const k of ['trim','normalize','required','unique'])if(typeof c[k]!=='boolean')throw Error('Recipe flags must be booleans.');
  for(const k of ['value','min','max'])if(typeof c[k]!=='string'||c[k].length>10000)throw Error('Recipe values must be text of at most 10,000 characters.');
  for(const k of ['min','max'])if(c[k]!==''&&!numeric(c[k]))throw Error(`Invalid numeric bound for ${c.name}.`);
  if(c.min!==''&&c.max!==''&&Number(c.min)>Number(c.max))throw Error(`Minimum exceeds maximum for ${c.name}.`);
  if(c.type==='id'&&['median','mode'].includes(c.missing))throw Error(`Identifier ${c.name} cannot use inferred filling. Choose keep, drop, or custom.`);
  if(c.missing==='custom'&&missing(c.value))throw Error(`Custom replacement for ${c.name} must not be a missing token.`);
  return Object.fromEntries(['name','type','trim','normalize','missing','value','required','unique','min','max'].map(k=>[k,c[k]]));
 });return result;
}
function validDate(v){if(!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;let d=new Date(v+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===v;}
function validate(data,rules){
 let total=0,issues=[],badRows=new Set();
 function add(row,column,message){total++;badRows.add(row);if(issues.length<2000)issues.push({row:row+2,column:data.headers[column],message,value:data.rows[row][column]});}
 rules.columns.forEach((c,i)=>{
  const seen=new Set();data.rows.forEach((r,j)=>{let v=r[i];if(missing(v)){if(c.required)add(j,i,'Required value is missing');return;}
   if(c.type==='number'&&!numeric(v))add(j,i,'Expected a finite number');
   if(c.type==='date'&&!validDate(v))add(j,i,'Expected a valid YYYY-MM-DD date');
   if(c.min!==''||c.max!==''){if(!numeric(v))add(j,i,'Range requires a finite number');else if((c.min!==''&&Number(v)<Number(c.min))||(c.max!==''&&Number(v)>Number(c.max)))add(j,i,'Outside the configured numeric range');}
   if(c.unique){if(seen.has(v))add(j,i,'Duplicate value in a unique column');seen.add(v);}
  });
 });return {total,affectedRows:badRows.size,issues,truncated:total>issues.length};
}
function run(data,input){
 const rules=recipe(input,data.headers);let entries=data.rows.map((cells,i)=>({id:i+2,cells:cells.slice()})),steps=[],changedCells=new Set(),removed=[],changes=[];
 function change(entry,col,next,step){let prev=entry.cells[col];if(prev===next)return;entry.cells[col]=next;changedCells.add(`${entry.id}:${col}`);if(changes.length<2000)changes.push({row:entry.id,column:data.headers[col],before:prev,after:next,step});}
 rules.columns.forEach((c,i)=>{
  let count=0;
  for(const entry of entries){let v=entry.cells[i],next=c.trim?v.trim():v;if(c.normalize&&missing(next))next='';if(v!==next){change(entry,i,next,'Normalize '+c.name);count++;}}
  if(c.trim||c.normalize)steps.push({step:'Normalize '+c.name,cellsChanged:count,rowsRemoved:0,notes:''});
 });
 // Every drop predicate is evaluated before imputation so estimates use surviving rows.
 let dropColumns=rules.columns.map((c,i)=>c.missing==='drop'?i:-1).filter(i=>i>=0);
 if(dropColumns.length){entries=entries.filter(entry=>{let bad=dropColumns.filter(i=>missing(entry.cells[i]));if(!bad.length)return true;removed.push({row:entry.id,reason:'Missing: '+bad.map(i=>data.headers[i]).join(', ')});return false;});steps.push({step:'Drop incomplete rows in selected columns',cellsChanged:0,rowsRemoved:removed.length,notes:''});}
 rules.columns.forEach((c,i)=>{
  if(!['median','mode','custom'].includes(c.missing))return;
  let present=entries.map(e=>e.cells[i]).filter(v=>!missing(v)),replacement=c.value,count=0,note='';
  if(c.missing!=='custom'&&!present.length)note='Skipped: no observed values.';
  else if(c.missing==='median'){
   if(!present.every(numeric))note='Skipped: mixed or nonnumeric observed values.';
   else {const sorted=present.map(Number).sort((a,b)=>a-b),m=Math.floor(sorted.length/2);replacement=String(sorted.length%2?sorted[m]:sorted[m-1]/2+sorted[m]/2);}
  }else if(c.missing==='mode'){
   let counts=new Map(),best=0;present.forEach(v=>counts.set(v,(counts.get(v)||0)+1));for(const [v,n] of counts)if(n>best){best=n;replacement=v;}
  }
  if(!note)for(const entry of entries)if(missing(entry.cells[i])){change(entry,i,replacement,'Fill '+c.name);count++;}
  steps.push({step:'Fill '+c.name+' ('+c.missing+')',cellsChanged:count,rowsRemoved:0,notes:note||'Replacement: '+replacement});
 });
 if(rules.deduplicate){let seen=new Set(),count=0;entries=entries.filter(entry=>{let key=JSON.stringify(entry.cells);if(seen.has(key)){removed.push({row:entry.id,reason:'Duplicate after transformations'});count++;return false;}seen.add(key);return true;});steps.push({step:'Remove duplicate rows',cellsChanged:0,rowsRemoved:count,notes:'Keep first transformed match.'});}
 const output={headers:data.headers.slice(),rows:entries.map(e=>e.cells)};
 return {data:output,report:profileAPI.profile(output),options:rules,log:steps,changes,changesTruncated:changes.length<steps.reduce((n,s)=>n+s.cellsChanged,0),changedCells:changedCells.size,removed,sourceRows:entries.map(e=>e.id),validation:{before:validate(data,rules),after:validate(output,rules)}};
}
function histogram(values,bins=8){
 const numbers=values.filter(v=>!missing(v)&&numeric(v)).map(Number);if(!numbers.length)return [];
 const min=Math.min(...numbers),max=Math.max(...numbers);if(min===max)return [{low:min,high:max,count:numbers.length}];
 // Scale before subtraction to avoid overflow for opposite extremes.
 const scaledMin=min/2,span=max/2-scaledMin;const counts=Array(bins).fill(0);
 numbers.forEach(v=>counts[Math.min(bins-1,Math.floor(((v/2-scaledMin)/span)*bins))]++);
 return counts.map((count,i)=>({low:min*(1-i/bins)+max*(i/bins),high:min*(1-(i+1)/bins)+max*((i+1)/bins),count}));
}
const api={defaults,recipe,run,validate,histogram};if(typeof module!=='undefined')module.exports=api;else root.DataClinicAdvanced=api;
})(globalThis);
