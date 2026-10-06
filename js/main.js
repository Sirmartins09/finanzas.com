const CATS={"Préstamos":"#0f766e","Mercado Pago":"#2563eb","Seguro":"#7c3aed","Gas":"#ea580c","Luz":"#ca8a04","Internet":"#0891b2","Colegio":"#db2777","Club":"#65a30d","Otros":"#78716c"};
const KEY="gastos_v1";
const $=id=>document.getElementById(id);
const money=n=>"$ "+Math.round(n).toLocaleString("es-AR");
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

// ---------- Datos ----------
let data=[];
try{data=JSON.parse(localStorage.getItem(KEY)||"[]")}catch(e){data=[]}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(data))}catch(e){}};

let loans=null;
try{loans=JSON.parse(localStorage.getItem("prestamos_v1"))}catch(e){}
if(!Array.isArray(loans))loans=[
 {id:"l1",n:"Santander personal (…9320)",c:"Préstamos",a:45179.43,tot:72,ini:"2026-10",num:2,dia:14,pag:{}},
 {id:"l2",n:"Santander personal (…9581)",c:"Préstamos",a:22652.93,tot:15,ini:"2026-10",num:1,dia:14,pag:{}},
 {id:"l3",n:"Mercado Pago (pedido 31/08)",c:"Mercado Pago",a:71098.86,tot:3,ini:"2026-10",num:1,dia:1,pag:{}},
 {id:"l4",n:"Mercado Pago (pedido 03/08)",c:"Mercado Pago",a:28815.45,tot:9,ini:"2026-10",num:2,dia:1,pag:{}}];
const saveL=()=>{try{localStorage.setItem("prestamos_v1",JSON.stringify(loans))}catch(e){}};
saveL();

// ---------- Fechas ----------
const diff=(a,b)=>{const [y1,m1]=a.split("-").map(Number),[y2,m2]=b.split("-").map(Number);return (y1-y2)*12+m1-m2};
const now=new Date();
let mes=now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0");
const shift=(m,d)=>{const [y,mo]=m.split("-").map(Number);const dt=new Date(y,mo-1+d,1);return dt.getFullYear()+"-"+String(dt.getMonth()+1).padStart(2,"0")};
const nombre=m=>{const [y,mo]=m.split("-").map(Number);const s=new Date(y,mo-1,1).toLocaleDateString("es-AR",{month:"long",year:"numeric"});return s.charAt(0).toUpperCase()+s.slice(1)};

// Junta las cuotas de préstamos + los gastos sueltos de un mes
function monthItems(m){
  const l=[];
  loans.forEach(p=>{
    const k=p.num+diff(m,p.ini); // número de cuota que toca en ese mes
    if(k>=1&&k<=p.tot)l.push({id:p.id,k:"l",c:p.c,d:p.n+" · cuota "+k+" de "+p.tot,a:p.a,p:!!(p.pag&&p.pag[m]),dia:p.dia});
  });
  return l.concat(data.filter(g=>g.m===m).map(g=>({...g,k:"g"})));
}

$("cat").innerHTML=Object.keys(CATS).map(c=>`<option>${c}</option>`).join("");

// ---------- Pantalla ----------
function render(){
  $("mes").value=mes;$("mesTxt").textContent=nombre(mes);
  const items=monthItems(mes);
  const tot=items.reduce((s,g)=>s+g.a,0);
  const pag=items.filter(g=>g.p).reduce((s,g)=>s+g.a,0);
  $("total").textContent=money(tot);
  $("pagado").textContent="Pagado "+money(pag);
  $("pend").textContent="Pendiente "+money(tot-pag);

  const by={};items.forEach(g=>by[g.c]=(by[g.c]||0)+g.a);
  const ent=Object.entries(by).sort((a,b)=>b[1]-a[1]);
  $("bar").innerHTML=ent.map(([c,v])=>`<i style="width:${v/tot*100}%;background:${CATS[c]||"#888"}" title="${esc(c)}"></i>`).join("");
  $("legend").innerHTML=ent.map(([c,v])=>`<span><span class="dot" style="background:${CATS[c]||"#888"}"></span>${esc(c)} <b>${money(v)}</b></span>`).join("")||"";

  $("lista").innerHTML=items.length?items.map(g=>{
    const od=g.dia&&!g.p&&new Date(+mes.slice(0,4),+mes.slice(5,7)-1,g.dia,23,59)<new Date();
    const sub=[g.d,g.dia?"vence "+String(g.dia).padStart(2,"0")+"/"+mes.slice(5):"",od?"vencida":""].filter(Boolean).join(" · ");
    return `<li class="row ${g.p?"paid":""}">
    <input type="checkbox" data-p="${g.id}" data-k="${g.k}" ${g.p?"checked":""} aria-label="Pagado" style="width:auto">
    <div class="t">${esc(g.c)}${sub?`<small class="${od?"od":""}">${esc(sub)}</small>`:""}</div>
    <div class="a">${money(g.a)}</div>
    <button class="x" data-d="${g.id}" data-k="${g.k}" aria-label="Eliminar">✕</button></li>`}).join(""):`<li class="empty">Todavía no cargaste gastos este mes. Usá el formulario de arriba.</li>`;

  // Tabla mes a mes (meses con datos + próximos 12)
  const h0=now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0");
  const set=new Set(data.map(g=>g.m));set.add(mes);
  for(let i=0;i<12;i++)set.add(shift(h0,i));
  const ms={};
  [...set].forEach(m=>{const it=monthItems(m);ms[m]={t:it.reduce((s,g)=>s+g.a,0),p:it.filter(g=>!g.p).reduce((s,g)=>s+g.a,0)}});
  const keys=Object.keys(ms).sort();
  $("hist").innerHTML=keys.length?keys.map(k=>`<tr class="${k===mes?"cur":""}"><td>${nombre(k)}</td><td>${money(ms[k].t)}</td><td>${money(ms[k].p)}</td></tr>`).join(""):`<tr><td colspan="3" class="empty">Sin datos todavía.</td></tr>`;
}

// ---------- Eventos ----------
$("f").addEventListener("submit",e=>{
  e.preventDefault();
  const a=parseFloat($("monto").value);if(!(a>=0))return;
  if($("esc").checked){
    const num=parseInt($("num").value)||1,tot=parseInt($("tot").value)||1;
    loans.push({id:"l"+Date.now(),n:$("desc").value.trim()||$("cat").value,c:$("cat").value,a,tot:Math.max(tot,num),ini:mes,num,dia:parseInt($("dia").value)||10,pag:$("pg").checked?{[mes]:true}:{}});
    saveL();
  }else{
    data.push({id:Date.now()+Math.random(),m:mes,c:$("cat").value,d:$("desc").value.trim(),a,p:$("pg").checked});
    save();
  }
  $("monto").value="";$("desc").value="";$("pg").checked=false;render();$("monto").focus();
});

$("esc").onchange=e=>{$("cuo").style.display=e.target.checked?"grid":"none"};

$("lista").addEventListener("click",e=>{
  const d=e.target.dataset.d;if(!d)return;
  if(e.target.dataset.k==="l"){
    if(!confirm("Esto quita el préstamo de todos los meses. ¿Continuar?"))return;
    loans=loans.filter(p=>p.id!==d);saveL();
  }else{data=data.filter(g=>String(g.id)!==d);save()}
  render();
});

$("lista").addEventListener("change",e=>{
  const p=e.target.dataset.p;if(!p)return;
  if(e.target.dataset.k==="l"){
    const l=loans.find(x=>x.id===p);if(l){l.pag=l.pag||{};l.pag[mes]=e.target.checked;saveL()}
  }else{
    const g=data.find(g=>String(g.id)===p);if(g){g.p=e.target.checked;save()}
  }
  render();
});

$("prev").onclick=()=>{mes=shift(mes,-1);render()};
$("next").onclick=()=>{mes=shift(mes,1);render()};
$("mes").onchange=e=>{if(e.target.value){mes=e.target.value;render()}};

$("copiar").onclick=()=>{
  const prev=data.filter(g=>g.m===shift(mes,-1));
  if(!prev.length){alert("El mes anterior no tiene gastos para copiar.");return}
  if(!confirm(`Se copiarán ${prev.length} gastos de ${nombre(shift(mes,-1))} como pendientes.`))return;
  prev.forEach(g=>data.push({...g,id:Date.now()+Math.random(),m:mes,p:false}));
  save();render();
};

// ---------- Copia de seguridad ----------
$("exp").onclick=()=>{
  const a=document.createElement("a");
  a.href="data:application/json;charset=utf-8,"+encodeURIComponent(JSON.stringify({gastos:data,prestamos:loans}));
  a.download="gastos.json";a.click();
};
$("imp").onclick=()=>$("file").click();
$("file").onchange=e=>{
  const f=e.target.files[0];if(!f)return;
  const r=new FileReader();
  r.onload=()=>{
    try{
      const d=JSON.parse(r.result);
      if(Array.isArray(d)){data=d;save();render()}
      else if(d&&Array.isArray(d.gastos)){data=d.gastos;loans=Array.isArray(d.prestamos)?d.prestamos:loans;save();saveL();render()}
      else alert("El archivo no es válido.");
    }catch(x){alert("El archivo no es válido.")}
  };
  r.readAsText(f);
};

render();