import { jsPDF } from 'jspdf';
const $ = id => document.getElementById(id);
const money = n => '₹' + Number(n).toFixed(2);
const today = () => new Date().toLocaleDateString('en-CA');
const defaultMenu = [
 {id:1,name:'Tea',price:15},{id:2,name:'Coffee',price:25},
 {id:3,name:'Samosa',price:20},{id:4,name:'Burger',price:60},
 {id:5,name:'Momos',price:80},{id:6,name:'Sandwich',price:50},
 {id:7,name:'Fries',price:70},{id:8,name:'Cold drink',price:40}
];
const read = (key, fallback) => {try {const x=JSON.parse(localStorage.getItem(key)); return x ?? fallback;}catch{return fallback;}};
let menu = read('ft_menu', defaultMenu);
let order = {};
let sales = read('ft_sales', []);
let editMode = false;
const save = () => {localStorage.setItem('ft_menu',JSON.stringify(menu));localStorage.setItem('ft_sales',JSON.stringify(sales));};
const total = () => menu.reduce((s,f)=>s+(order[f.id]||0)*f.price,0);
const count = () => Object.values(order).reduce((a,b)=>a+b,0);
function renderMenu(){
 $('menu').innerHTML='';
 menu.forEach(f=>{
  const b=document.createElement('button');b.className='food';
  b.innerHTML=`<div class="name"></div><div class="price"></div><div class="hint"></div>`;
  b.querySelector('.name').textContent=f.name;b.querySelector('.price').textContent=money(f.price);
  b.querySelector('.hint').textContent=editMode?'Tap price to edit · tap card to add':`Added: ${order[f.id]||0} · Tap to add`;
  b.addEventListener('click',()=>{if(editMode && confirm(`Change price for ${f.name}?`)){const v=prompt('Enter new price',f.price);if(v!==null&&v.trim()!==''&&Number.isFinite(+v)&&+v>=0){f.price=+v;save();render();}return;}order[f.id]=(order[f.id]||0)+1;render();});
  $('menu').appendChild(b);
 });
}
function renderOrder(){
 const box=$('order');box.innerHTML='';
 const chosen=menu.filter(f=>(order[f.id]||0)>0);
 if(!chosen.length){box.innerHTML='<div class="empty">No items yet. Tap a food button above to start.</div>';}
 chosen.forEach(f=>{
  const row=document.createElement('div');row.className='lineitem';
  const info=document.createElement('div');info.className='iteminfo';
  const nm=document.createElement('div');nm.className='itemname';nm.textContent=f.name;
  const sub=document.createElement('div');sub.className='muted';sub.textContent=`${money(f.price)} each`;
  info.append(nm,sub);
  const qty=document.createElement('div');qty.className='qty';
  const minus=document.createElement('button');minus.textContent='−';minus.setAttribute('aria-label','Decrease quantity');
  minus.onclick=()=>{order[f.id]--;if(order[f.id]<=0)delete order[f.id];render();};
  const num=document.createElement('strong');num.textContent=order[f.id];
  const plus=document.createElement('button');plus.textContent='+';plus.setAttribute('aria-label','Increase quantity');
  plus.onclick=()=>{order[f.id]++;render();};
  qty.append(minus,num,plus);
  const amount=document.createElement('div');amount.className='amount';amount.textContent=money(f.price*order[f.id]);
  row.append(info,qty,amount);box.appendChild(row);
 });
 $('itemCount').textContent=`${count()} item${count()===1?'':'s'}`;
 $('total').textContent=money(total());$('grandTotal').textContent=money(total());
}
function renderHistory(){
 const todays=sales.filter(s=>s.date===today());
 $('todaySales').textContent=money(todays.reduce((a,s)=>a+s.total,0));
 $('todayCount').textContent=todays.length;
 const h=$('history');h.innerHTML='';
 if(!sales.length){h.innerHTML='<div class="empty">Completed sales will appear here.</div>';return;}
 [...sales].reverse().slice(0,20).forEach(s=>{
  const e=document.createElement('div');e.className='historyentry';
  const r=document.createElement('div');r.className='row';
  const l=document.createElement('div');l.textContent=`${s.date} · ${s.items.reduce((a,i)=>a+i.qty,0)} items`;
  const t=document.createElement('strong');t.textContent=money(s.total);
  r.append(l,t);e.appendChild(r);h.appendChild(e);
 });
}
function render(){renderMenu();renderOrder();renderHistory();}
function snapshot(){return menu.filter(f=>(order[f.id]||0)>0).map(f=>({name:f.name,price:f.price,qty:order[f.id],amount:f.price*order[f.id]}));}
function makePdf(items, sum, saleId='CURRENT'){
 if(!items.length){alert('Add at least one item first.');return;}
 const doc=new jsPDF({unit:'mm',format:[80,Math.max(120,65+items.length*9)]});
 let y=12;doc.setFont('helvetica','bold');doc.setFontSize(16);doc.text('FOODTRACK',40,y,{align:'center'});
 y+=7;doc.setFont('helvetica','normal');doc.setFontSize(9);doc.text('SALES RECEIPT',40,y,{align:'center'});
 y+=7;doc.text('Date: '+new Date().toLocaleString(),5,y);y+=6;doc.text('Receipt: '+saleId,5,y);y+=5;
 doc.line(5,y,75,y);y+=6;doc.setFont('helvetica','bold');doc.text('Item',5,y);doc.text('Qty',47,y,{align:'right'});doc.text('Amt',75,y,{align:'right'});
 y+=5;doc.setFont('helvetica','normal');
 items.forEach(i=>{const name=doc.splitTextToSize(i.name,38)[0];doc.text(name,5,y);doc.text(String(i.qty),47,y,{align:'right'});doc.text(Number(i.amount).toFixed(2),75,y,{align:'right'});y+=7;});
 doc.line(5,y,75,y);y+=8;doc.setFont('helvetica','bold');doc.setFontSize(12);doc.text('TOTAL',5,y);doc.text('INR '+Number(sum).toFixed(2),75,y,{align:'right'});
 y+=10;doc.setFont('helvetica','normal');doc.setFontSize(9);doc.text('Thank you!',40,y,{align:'center'});
 doc.save(`FoodTrack-${saleId}.pdf`);
}
$('editMode').onclick=()=>{editMode=!editMode;$('editor').hidden=!editMode;$('editMode').textContent=editMode?'Done editing':'Edit menu';renderMenu();};
$('addFood').onclick=()=>{const name=$('newName').value.trim(),price=Number($('newPrice').value);if(!name||$('newPrice').value===''||!Number.isFinite(price)||price<0){alert('Enter a food name and valid non-negative price.');return;}menu.push({id:Date.now(),name,price});save();$('newName').value='';$('newPrice').value='';render();};
$('clearOrder').onclick=()=>{if(count()&&confirm('Clear this order?')){order={};render();}};
$('pdf').onclick=()=>makePdf(snapshot(),total(),'CURRENT');
$('complete').onclick=()=>{const items=snapshot(),sum=total();if(!items.length){alert('Add items before completing a sale.');return;}const sale={id:Date.now(),date:today(),createdAt:new Date().toISOString(),items,total:sum};sales.push(sale);save();order={};render();if(confirm('Sale saved. Generate its PDF receipt now?'))makePdf(sale.items,sale.total,String(sale.id));};
$('clearHistory').onclick=()=>{if(confirm('Permanently clear all saved sales on this device?')){sales=[];save();renderHistory();}};
render();
