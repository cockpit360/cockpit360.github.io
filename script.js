/* Indicateur discret « Chargement en cours » : s'affiche des qu'une requete de donnees dure plus de 0,4 s */
(function(){
  var n=0, tm=null, el=null, of=window.fetch;
  if(!of) return;
  function box(){ if(el||!document.body) return el;
    el=document.createElement('div'); el.id='ldHint'; el.setAttribute('role','status'); el.setAttribute('aria-live','polite');
    el.style.cssText='position:fixed;left:12px;bottom:10px;z-index:9990;pointer-events:none;font:600 11.5px/1.2 Figtree,system-ui,sans-serif;color:#737372;background:rgba(255,255,255,.88);border:1px solid #e4e4e1;border-radius:999px;padding:4px 10px;display:none;opacity:.9';
    el.textContent='Chargement en cours…'; document.body.appendChild(el); return el; }
  function on(){ if(tm||(el&&el.style.display!=='none')) return; tm=setTimeout(function(){ tm=null; if(n>0){ var b=box(); if(b) b.style.display=''; } },400); }
  function off(){ if(n>0) return; if(tm){ clearTimeout(tm); tm=null; } if(el) el.style.display='none'; }
  window.fetch=function(){ n++; on(); var r; try{ r=of.apply(this,arguments); }catch(e){ n--; off(); throw e; }
    var done=function(){ n=Math.max(0,n-1); off(); };
    r.then(done,done); return r; };
})();;
document.getElementById('passEye').onclick=function(){var i=document.getElementById('passInput'),h=i.type==='password';i.type=h?'text':'password';this.textContent=h?'🙈':'👁';this.setAttribute('aria-label',h?'Masquer le mot de passe':'Afficher le mot de passe');i.focus();};;
document.addEventListener('DOMContentLoaded',function(){ try{ if(/Windows/.test(navigator.userAgent)){ var b=document.getElementById('navBoo'); if(!b) return; b.style.display=''; b.onclick=function(){ location.href='boosterpy://lancer'; }; } }catch(e){} });;
function demarrerApp(D){
const DATA=D.DATA, SEUIL=D.SEUIL, NAT_PROG=D.NAT_PROG, MAG_PROG=D.MAG_PROG, MAG_CA=D.MAG_CA, NAT_CA=D.NAT_CA, MAG_RANG=D.MAG_RANG||{};

// colonnes : clé, libellé, type
const SHORT_BADGE = {"b-r":"RUPT.","b-f":"FAIBLE","b-i":"AVANT","b-e":"PERF.","b-s":"SUIVI","b-n":"NOUV.","b-c":"CONF."};
const COLS = [
  {k:"priorite", t:"Priorité"},
  {k:"rang", t:"Rang nat."},
  {k:"rang_mag", t:"Rang mag."},
  {k:"code", t:"Code"},
  {k:"nom", t:"Produit"},
  {k:"gamme", t:"Gamme"},
  {k:"ca_nat", t:"CA nat. (€)"},
  {k:"ca_mag", t:"CA mag. (€)"},
  {k:"stock", t:"Stock"},
  {k:"situation", t:"Situation"},
  {k:"prog_mag", t:"Prog mag."},
  {k:"prog_nat", t:"Prog nat."},
];

// niveau de gravité : 4 rupture, 3.7 stock faible, 3.5 mise en avant,
// 2.5/2 mauvaise perf, 1 sous national, 0.7 nouveauté, 0.5 conforme
const SEUIL_RANG_RESEAU = 60; // top ~25% des magasins du réseau
function evaluate(d){
  const stock = d.stock;              // peut être 0 (rupture), un nombre, ou null (inconnu)
  let sev, badge, bcls, situation;
  const prog = d.prog_mag;         // progression magasin sur la réf
  const progNat = d.prog_nat;      // progression NATIONALE de la même réf
  const ca = d.ca_mag;
  const novente = (ca===0) || (ca===null && prog===null);
  // seuil de tendance = progression nationale DU produit (pas un seuil global)
  const seuilRef = (progNat===null) ? SEUIL : progNat;
  // stock connu = number ; inconnu = null. Rupture/stock faible seulement si stock connu.
  const stockConnu = (typeof stock === "number");
  if(stockConnu && stock===0){ sev=4; badge="Rupture"; bcls="b-r"; situation="Stock 0 — rupture"; }
  else if(stockConnu && stock<3){ sev=3.7; badge="Stock faible"; bcls="b-f"; situation="Stock < 3 — à réappro"; }
  else if(novente){ sev=3.5; badge="Mise en avant à contrôler"; bcls="b-i"; situation="Aucune vente / stock dispo"; }
  else if(prog!==null && prog<0){ sev = prog<=-50?2.5:2; badge="Mauvaise performance"; bcls="b-e"; situation="En recul vs N-1"; }
  else if(prog!==null && prog>=seuilRef){ sev=0.5; badge="Prog conforme"; bcls="b-c"; situation="≥ national du produit"; }
  else if(prog!==null){ sev=1; badge="À suivre"; bcls="b-s"; situation="Sous le national du produit"; }
  else if(ca!==null && ca>0 && prog===null){
    // vendu mais sans progression (N.N.) : on juge sur le rang réseau du magasin
    const rm = d.rang_mag;
    if(rm!==null && rm!==undefined && rm<=SEUIL_RANG_RESEAU){ sev=0.5; badge="Prog conforme"; bcls="b-c"; situation="Sans prog. — rang réseau "+rm+" (≤ "+SEUIL_RANG_RESEAU+")"; }
    else { sev=1; badge="À suivre"; bcls="b-s"; situation="Sans prog. — rang réseau "+(rm==null?"?":rm)+" (> "+SEUIL_RANG_RESEAU+")"; }
  }
  else { sev=0; badge=""; bcls=""; situation=""; }
  return {sev,badge,bcls,situation};
}

let curMag = Object.keys(DATA)[0];
let curFilter = "all";
let sortKey = "priorite", sortDir = -1; // -1 desc

const TOP_N_NATIONAL = 50; // on n'analyse que le Top 50 CA national (rang <= 50)

function rowsFor(mag){
  return DATA[mag].filter(d=>d.rang<=TOP_N_NATIONAL).map(d=>{
    const e = evaluate(d);
    return {...d, sev:e.sev, badge:e.badge, bcls:e.bcls, situation:e.situation};
  }).filter(r=>r.badge!==""); // toutes les réfs classées (pas de limite à 50)
}

// une référence est "en alerte" si rupture / stock faible / mise en avant / mauvaise perf
function estAlerte(sev){ return sev===4 || sev===3.7 || sev===3.5 || (sev>=2 && sev<3); }

// flops groupe : références en alerte dans les 3 magasins simultanément
function flopsGroupe(){
  const mags = Object.keys(DATA);
  // indexer chaque magasin par code -> ligne évaluée
  const idx = {};
  mags.forEach(m=>{
    idx[m] = {};
    rowsFor(m).forEach(r=>{ idx[m][r.code] = r; });
  });
  // codes présents et en alerte dans TOUS les magasins
  const base = mags[0];
  const out = [];
  Object.keys(idx[base]).forEach(code=>{
    const parMag = mags.map(m=> idx[m][code]);
    if(parMag.every(r=> r && estAlerte(r.sev))){
      // gravité groupe = somme des sev (plus c'est haut, plus c'est grave partout)
      const scoreGrp = parMag.reduce((s,r)=>s+r.sev,0);
      out.push({code, nom: idx[base][code].nom, rang: idx[base][code].rang,
                ca_nat: idx[base][code].ca_nat, prog_nat: idx[base][code].prog_nat,
                parMag, scoreGrp});
    }
  });
  out.sort((a,b)=> b.scoreGrp - a.scoreGrp || b.ca_nat - a.ca_nat);
  return out;
}

function fmtEuro(v){ return v==null?"":Math.round(v).toLocaleString("fr-FR")+" €"; }
function fmtProg(v){ return v==null?"—":(v>0?"+":"")+v.toFixed(1)+"%"; }
function fmtEvol(v){ return v==null?"":(v>0?"+":"")+v; }
window.rkH=function(r,e){ if(r==null) return ""; return '<span class="rk" title="Rang réseau (évolution)">'+r+((e!=null&&e!==0)?'<sup class="'+(e>0?"up":"dn")+'">'+(e>0?"+":"")+e+'</sup>':"")+'</span>'; };
function evolSpan(v){ return v==null?"":` <span class="${v<0?"down":(v>0?"up":"")}">(${fmtEvol(v)})</span>`; }
function fmtStock(v){ return v==null?"0":Math.round(v); }

function render(){
  const isGroupe = (curMag === "GROUPE");
  // bandeau progression magasin vs national
  if(isGroupe){
    const totGrp = Object.values(MAG_CA).reduce((s,v)=>s+v,0);
    document.getElementById("progline").innerHTML =
      `<span class="mag">Consolidation GROUPE — flops présents dans les 3 magasins</span>`+
      ` <span class="nat">CA total 3 magasins : ${fmtEuro(totGrp)}</span>`;
  } else {
    const mp = MAG_PROG[curMag];
    const cls = mp>=NAT_PROG ? "up" : "down";
    const signe = mp>=0?"+":"";
    document.getElementById("progline").innerHTML =
      `<span class="mag">${curMag} : ${fmtEuro(MAG_CA[curMag])} · <span class="${cls}">${signe}${mp.toFixed(1)} %</span>${MAG_RANG[curMag]?` · rang ${rkH(MAG_RANG[curMag].rang,MAG_RANG[curMag].evol)}`:""}</span>`+
      ` <span class="nat">vs National ${fmtEuro(NAT_CA)} · +${NAT_PROG.toFixed(1)} %</span>`;
  }
  // tabs (magasins + GROUPE)
  const tabs = document.getElementById("tabs");
  tabs.innerHTML = "";
  [...Object.keys(DATA), "GROUPE"].forEach(m=>{
    const b=document.createElement("button");
    b.textContent=m; if(m===curMag)b.className=(b.className?b.className+" ":"")+"active";
    if(m==="GROUPE") b.classList.add("grp");
    if(m==="Hesingue") b.classList.add("mag-hes");
    if(m==="Waldighoffen") b.classList.add("mag-wal");
    if(m==="Sierentz") b.classList.add("mag-sie");
    b.onclick=()=>{curMag=m;curFilter="all";render();};
    tabs.appendChild(b);
  });

  if(isGroupe){ renderGroupe(); return; }

  // head
  const head=document.getElementById("head"); head.innerHTML="";
  COLS.forEach(c=>{
    const th=document.createElement("th");
    th.innerHTML=c.t+(sortKey===c.k?' <span class="arr">'+(sortDir<0?"▼":"▲")+'</span>':' <span class="arr">↕</span>');
    th.onclick=()=>{ if(sortKey===c.k)sortDir=-sortDir; else {sortKey=c.k;sortDir=(c.k==="nom"||c.k==="code")?1:-1;} render(); };
    head.appendChild(th);
  });
  // rows
  let allRows = rowsFor(curMag);
  // counts (toujours calculés sur l'ensemble, pas sur le filtre)
  const cr=allRows.filter(r=>r.sev===4).length, cf=allRows.filter(r=>r.sev===3.7).length,
        ci=allRows.filter(r=>r.sev===3.5).length,
        ce=allRows.filter(r=>r.sev>=2&&r.sev<3).length, cs=allRows.filter(r=>r.sev===1).length,
        cn=allRows.filter(r=>r.sev===0.7).length,
        cc=allRows.filter(r=>r.sev===0.5).length;
  // définition des filtres : clé, libellé, classe, test
  const FILTERS = [
    {k:"all", lbl:`Tout (${allRows.length})`, cls:"all", test:()=>true},
    {k:"r", lbl:`${cr} rupture`, cls:"r", test:r=>r.sev===4},
    {k:"f", lbl:`${cf} stock faible`, cls:"f", test:r=>r.sev===3.7},
    {k:"i", lbl:`${ci} mise en avant`, cls:"i", test:r=>r.sev===3.5},
    {k:"e", lbl:`${ce} mauvaise perf.`, cls:"e", test:r=>r.sev>=2&&r.sev<3},
    {k:"s", lbl:`${cs} sous national`, cls:"s", test:r=>r.sev===1},
    {k:"c", lbl:`${cc} conforme`, cls:"c", test:r=>r.sev===0.5},
  ];
  const cont = document.getElementById("counts"); cont.innerHTML="";
  FILTERS.forEach(f=>{
    const sp=document.createElement("span");
    sp.className="pill "+f.cls+(curFilter===f.k?" on":"");
    sp.textContent=f.lbl;
    sp.onclick=()=>{ curFilter = (curFilter===f.k?"all":f.k); render(); };
    cont.appendChild(sp);
  });
  // appliquer le filtre
  const flt = FILTERS.find(f=>f.k===curFilter) || FILTERS[0];
  let rows = allRows.filter(flt.test);
  // sort
  rows.sort((a,b)=>{
    let x,y;
    if(sortKey==="priorite"){ x=a.sev; y=b.sev; if(x===y){x=a.ca_nat;y=b.ca_nat;} }
    else if(sortKey==="situation"){ x=a.sev; y=b.sev; }
    else { x=a[sortKey]; y=b[sortKey]; }
    if(x===null)x=-Infinity; if(y===null)y=-Infinity;
    if(typeof x==="string") return sortDir*x.localeCompare(y);
    return sortDir*(x-y);
  });
  // body
  const body=document.getElementById("body"); body.innerHTML="";
  rows.forEach(r=>{
    const tr=document.createElement("tr");
    const stockCls = r.sev===4?"stock r":(r.sev===3.7?"stock f":(r.sev===3.5?"stock i":"stock"));
    const progCls = (r.prog_mag!==null&&r.prog_mag<0)?"neg":"";
    const progNatCls = (r.prog_nat!==null&&r.prog_nat<0)?"neg":"";
    tr.innerHTML =
      `<td class="badge ${r.bcls}" data-label="Priorité" data-short="${SHORT_BADGE[r.bcls]||''}">${r.badge}</td>`+
      `<td data-label="Rang nat.">${r.rang}</td>`+
      `<td data-label="Rang mag.">${r.rang_mag==null?"—":rkH(r.rang_mag,r.rang_evol)}</td>`+
      `<td class="code" data-code="${r.code}" data-label="Code" title="Cliquer pour copier">${r.code}</td>`+
      `<td class="prod" data-label="Produit">${r.nom}</td>`+
      `<td data-label="Gamme">${r.gamme||""}</td>`+
      `<td data-label="CA nat.">${fmtEuro(r.ca_nat)}</td>`+
      `<td class="camagcol" data-label="CA mag.">${fmtEuro(r.ca_mag)}</td>`+
      `<td class="${stockCls}" data-label="Stock">${fmtStock(r.stock)}</td>`+
      `<td data-label="Situation">${r.situation}</td>`+
      `<td class="${progCls}" data-label="Prog mag.">${fmtProg(r.prog_mag)}</td>`+
      `<td class="pnat ${progNatCls}" data-label="Prog nat.">${fmtProg(r.prog_nat)}</td>`;
    body.appendChild(tr);
  });
}
render();

// ===== Vue consolidée GROUPE =====
let grpSortKey = "score", grpSortDir = -1;
function renderGroupe(){
  let flops = flopsGroupe();
  const mags = Object.keys(DATA);
  const cont = document.getElementById("counts");
  cont.innerHTML = `<span class="pill r on">${flops.length} flop(s) commun(s) aux 3 magasins</span>`;
  // colonnes triables : clé + libellé
  const cols = [
    {k:"rang", t:"Rang nat."},
    {k:"code", t:"Code"},
    {k:"nom", t:"Produit"},
    {k:"ca_nat", t:"CA nat."},
    ...mags.map((m,i)=>({k:"mag"+i, t:m}))
  ];
  const head=document.getElementById("head"); head.innerHTML="";
  cols.forEach(c=>{
    const th=document.createElement("th");
    th.innerHTML=c.t+(grpSortKey===c.k?' <span class="arr">'+(grpSortDir<0?"▼":"▲")+'</span>':' <span class="arr">↕</span>');
    th.onclick=()=>{ if(grpSortKey===c.k)grpSortDir=-grpSortDir; else {grpSortKey=c.k;grpSortDir=(c.k==="nom"||c.k==="code")?1:-1;} renderGroupe(); };
    head.appendChild(th);
  });
  // tri
  flops.sort((a,b)=>{
    let x,y;
    if(grpSortKey==="score"){ x=a.scoreGrp; y=b.scoreGrp; if(x===y){x=a.ca_nat;y=b.ca_nat;} }
    else if(grpSortKey.startsWith("mag")){ const i=+grpSortKey.slice(3); x=a.parMag[i].sev; y=b.parMag[i].sev; }
    else { x=a[grpSortKey]; y=b[grpSortKey]; }
    if(x===null)x=-Infinity; if(y===null)y=-Infinity;
    if(typeof x==="string") return grpSortDir*x.localeCompare(y);
    return grpSortDir*(x-y);
  });
  const body=document.getElementById("body"); body.innerHTML="";
  if(flops.length===0){
    body.innerHTML = `<tr><td colspan="${cols.length}" style="padding:24px;color:#737372">Aucune référence en alerte simultanément dans les 3 magasins.</td></tr>`;
    return;
  }
  flops.forEach(f=>{
    const tr=document.createElement("tr");
    let cells =
      `<td data-label="Rang nat.">${f.rang}</td>`+
      `<td class="code" data-code="${f.code}" data-label="Code" title="Cliquer pour copier">${f.code}</td>`+
      `<td class="prod" data-label="Produit">${f.nom}</td>`+
      `<td data-label="CA nat.">${fmtEuro(f.ca_nat)}</td>`;
    f.parMag.forEach((r,idx)=>{
      cells += `<td class="badge grpcell ${r.bcls}" data-label="${mags[idx]}" title="Stock ${fmtStock(r.stock)} · Prog ${fmtProg(r.prog_mag)}">${r.badge}<br><span class="camag">${fmtEuro(r.ca_mag)}</span></td>`;
    });
    tr.innerHTML = cells;
    body.appendChild(tr);
  });
}

// clic sur un code = copie dans le presse-papiers (pour coller dans Booster)
document.getElementById("body").addEventListener("click", function(e){
  const td = e.target.closest("td.code");
  if(!td) return;
  const code = td.getAttribute("data-code");
  const done = ()=>{
    const old = td.getAttribute("data-code");
    td.classList.add("copied"); td.textContent = "✓ copié";
    setTimeout(()=>{ td.classList.remove("copied"); td.textContent = old; }, 900);
  };
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(code).then(done).catch(()=>fallback(code,done));
  } else { fallback(code,done); }
});
function fallback(text, cb){
  const ta=document.createElement("textarea"); ta.value=text;
  ta.style.position="fixed"; ta.style.opacity="0"; document.body.appendChild(ta);
  ta.select(); try{document.execCommand("copy");}catch(_){} document.body.removeChild(ta); cb();
}
}
window.demarrerApp = demarrerApp;;
(function(){
  /* ---- navigation : magasin d'abord (barre commune), puis outil ---- */
  var vT=document.getElementById('viewTract'), vG=document.getElementById('viewGestion');
  var bT=document.getElementById('navTract'), bG=document.getElementById('navGestion');
  var TOOL='gestion', STORE='Waldighoffen';
  var STORES=[["Hesingue"],["Sierentz"],["Waldighoffen"],["Mulhouse"],["Creation","","Baeumlin Création"]];
  try{ var sv=localStorage.getItem('rapStore'); if(sv) STORE=sv; }catch(e){}
  function barre(){
    var b=document.getElementById('storebar'), h='';
    h+='<button type="button" data-st="GROUPE" class="grp '+(STORE==='GROUPE'?'on':'')+'">GROUPE</button>';
    STORES.forEach(function(x){ h+='<button type="button" data-st="'+x[0]+'" class="'+(STORE===x[0]?'on':'')+'">'+(x[2]||x[0])+(x[1]?'<small>'+x[1]+'</small>':'')+'</button>'; });
    h+='<button type="button" data-st="RESEAU" class="grp '+(STORE==='RESEAU'?'on':'')+'">Réseau</button>';
    if(TOOL==='gestion') h+='<button type="button" data-st="COMPARATIF" class="grp '+(STORE==='COMPARATIF'?'on':'')+'">Démarche leader</button>';
    if(TOOL==='gestion') h+='<button type="button" data-st="HISTO" class="grp '+(STORE==='HISTO'?'on':'')+'">Historique 5 ans &amp; objectifs</button>';
    b.innerHTML=h; document.getElementById('topwrap').dataset.st=STORE; (function(){ var hl=document.getElementById('ghistlnk'); if(hl) hl.style.display=(STORE==='GROUPE'||STORE==='RESEAU')?'':'none'; })();
    b.querySelectorAll('button').forEach(function(x){ x.onclick=function(){ STORE=x.dataset.st; if(STORE==='RESEAU'||STORE==='HISTO') TOOL='gestion'; try{localStorage.setItem('rapStore',STORE);}catch(e){} appliquer(); }; });
  }
  function clic(sel,nom){ var r=null; document.querySelectorAll(sel).forEach(function(b){ if((b.dataset.m||b.textContent.trim())===nom) r=b; }); if(r) r.click(); return !!r; }
  var vV=document.getElementById('viewVisite'), bV=document.getElementById('navVisite'), vC=document.getElementById('viewCompta'), bC=document.getElementById('navCompta'), vR=document.getElementById('viewRH'), bR=document.getElementById('navRH'), vA=document.getElementById('viewAchats'), bA=document.getElementById('navAchats'), vCh=document.getElementById('viewChiffres');
  function appliquer(){
    if(TOOL!=='gestion' && (STORE==='COMPARATIF'||STORE==='HISTO')) STORE='GROUPE';
    barre();
    var no=document.getElementById('tractNo'), vS=document.getElementById('viewReseau'); vS.style.display='none';
    ['tabs','gtabs'].forEach(function(id){ var e=document.getElementById(id); if(e&&e.parentNode) e.parentNode.style.display='none'; });
    vT.style.display='none'; vG.style.display='none'; vV.style.display='none'; vC.style.display='none'; no.style.display='none'; vR.style.display='none'; vA.style.display='none'; vCh.style.display='none';
    if(TOOL==='gestion'&&STORE==='HISTO'){ vCh.style.display=''; if(window.__chifRender) window.__chifRender(vCh); }
    else if(STORE==='RESEAU'){ if(TOOL==='gestion'){ if(!clic('#gtabs button','RESEAU')){ if(window.__reseauRender) window.__reseauRender(vS); vS.style.display=''; } else { vG.style.display=''; } } else { no.style.display=''; no.innerHTML='<b>Réseau : uniquement la Performance commerciale.</b><br>Les autres outils (finances, visite, RH, catalogue) concernent les magasins.'; } }
    else if(STORE==='Creation'&&TOOL!=='compta'&&TOOL!=='rh'){ no.style.display=''; no.innerHTML='<b>Baeumlin Création n\'a que le Compte de résultat (carburant) et les Ressources humaines.</b><br>Les autres outils (performance commerciale, catalogue, visite) concernent les magasins.'; }
    else if(TOOL==='gestion'){ vG.style.display=''; clic('#gtabs button',STORE); }
    else if(TOOL==='compta'){ vC.style.display=''; if(window.__comptaRender) window.__comptaRender(STORE); }
    else if(TOOL==='achats'){ vA.style.display=''; if(window.__achRender) window.__achRender(STORE); }
    else if(TOOL==='rh'){ vR.style.display=''; if(window.__rhRender) window.__rhRender(STORE); }
    else if(TOOL==='visite'){ vV.style.display=''; if(window.__visiteRender) window.__visiteRender(STORE); }
    else{
      var ok=clic('#tabs button',STORE);
      if(ok){ vT.style.display=''; }
      else{ no.style.display=''; no.innerHTML=STORE==='Mulhouse'?'<b>Performance catalogue : non concerné.</b><br>Mulhouse ne participe pas au tract : il n\'y aura pas d\'analyse tract pour ce magasin.':'<b>Performance catalogue : pas de données pour '+STORE+'.</b><br>Envoie l\'export Top ventes de ce magasin pour l\'ajouter.'; }
    }
    bT.className=TOOL==='tract'?'on':''; bG.className=TOOL==='gestion'?'on':''; bV.className=TOOL==='visite'?'on':''; bC.className=TOOL==='compta'?'on':''; bR.className=TOOL==='rh'?'on':''; bA.className=TOOL==='achats'?'on':'';
    try{ var ns={s:STORE,t:TOOL}, cs=history.state, nw=Date.now();
      if(window.__popping||(cs&&cs.s===ns.s&&cs.t===ns.t)||(cs&&!cs.home&&nw-(window.__lastPush||0)<700)) history.replaceState(ns,'','#'+TOOL);
      else { history.pushState(ns,'','#'+TOOL); window.__lastPush=nw; } }catch(e){}
  }
  window.__reappliquer=function(){ try{ appliquer(); }catch(e){ console.error(e); } };
  window.addEventListener('popstate',function(ev){ var s=ev.state; if(!s) return; window.__popping=true;
    try{ if(s.home){ if(window.__ckShow) window.__ckShow(true); } else if(s.s){ if(window.__ckHide) window.__ckHide(); STORE=s.s; TOOL=s.t; appliquer(); window.scrollTo(0,0); } }catch(e){} window.__popping=false; });
  function show(v){ TOOL=v; appliquer(); window.scrollTo(0,0); }
  bT.onclick=function(){show('tract')}; bG.onclick=function(){show('gestion')}; bV.onclick=function(){show('visite')}; bC.onclick=function(){show('compta')}; bR.onclick=function(){show('rh')}; bA.onclick=function(){show('achats')};

  // ===== RH : effectifs au 01/10/2026 (hors directeurs) + ratios avec le Performance commerciale =====
  (function(){
    function e(x){ return String(x).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
    function fr(v,d){ return v.toLocaleString('fr-FR',{minimumFractionDigits:d||0,maximumFractionDigits:d||0}); }
    var tip=null; function tipEl(){ if(!tip){ tip=document.createElement('div'); tip.style.cssText='position:fixed;z-index:9999;pointer-events:none;background:#1d1d1b;color:#fff;font-size:12px;line-height:1.35;padding:6px 9px;border-radius:6px;display:none;max-width:250px;box-shadow:0 2px 8px rgba(0,0,0,.25)'; document.body.appendChild(tip); } return tip; }
    function show(ev){ var n=ev.target.closest&&ev.target.closest('[data-tip]'), t=tipEl(); if(!n){ t.style.display='none'; return; } var p=ev.touches?ev.touches[0]:ev; t.innerHTML=String(n.getAttribute('data-tip')||'').replace(/<(?!\/?(?:b|i|em|strong|br|small|u)\s*\/?>)[^>]*>/gi,''); t.style.display='block'; var w=t.offsetWidth, x=Math.min(p.clientX+12,window.innerWidth-w-8); t.style.left=Math.max(4,x)+'px'; t.style.top=(p.clientY+14)+'px'; }
    document.addEventListener('mousemove',show); document.addEventListener('click',show); document.addEventListener('scroll',function(){ if(tip) tip.style.display='none'; },true);
    var LIGHT=['#eda100','#1baf7a','#e87ba4','#a3a3a1','#e0a900'], INK='#1d1d1b', MUT='#737372', GRID='#e5e5e4';
    function rbar(x,y,w,h,r,right){ if(w<2*r) r=Math.max(0,w/2); return right?('M'+x+' '+y+'h'+(w-r)+'a'+r+' '+r+' 0 0 1 '+r+' '+r+'v'+(h-2*r)+'a'+r+' '+r+' 0 0 1 -'+r+' '+r+'h-'+(w-r)+'z'):('M'+x+' '+y+'h'+w+'v'+h+'h-'+w+'z'); }
    // barres horizontales, une couleur par entité, repère de référence (ex. GROUPE)
    function hbar(items,o){ o=o||{}; var W=o.w||420, L=o.lw||96, R=64, bh=16, gap=12, top=o.ref?20:6, H=top+items.length*(bh+gap)+4, mx=Math.max.apply(null,items.map(function(i){return i.v;}).concat(o.ref?[o.ref.v]:[]))*1.0, pw=W-L-R, s='';
      s+='<svg viewBox="0 0 '+W+' '+H+'" width="100%" role="img" aria-label="'+e(o.alt||o.title||'graphique')+'" style="display:block;max-width:'+W+'px;margin:0 auto;font-family:inherit">';
      items.forEach(function(it,i){ var y=top+i*(bh+gap), w=Math.max(2,it.v/mx*pw);
        s+='<text x="'+(L-8)+'" y="'+(y+bh/2+4)+'" text-anchor="end" font-size="12" fill="'+INK+'">'+e(it.l)+'</text>';
        s+='<path d="'+rbar(L,y,w,bh,4,true)+'" fill="'+it.c+'" data-tip="'+e(it.t||(it.l+' : '+it.lab))+'"/>';
        s+='<text x="'+(L+w+6)+'" y="'+(y+bh/2+4)+'" font-size="12" font-weight="700" fill="'+INK+'">'+e(it.lab)+'</text>'; });
      if(o.ref){ var rx=L+o.ref.v/mx*pw; s+='<line x1="'+rx+'" x2="'+rx+'" y1="'+(top-4)+'" y2="'+(H-2)+'" stroke="'+INK+'" stroke-width="1.5" stroke-dasharray="4 3"/><text x="'+rx+'" y="10" text-anchor="middle" font-size="11" fill="'+MUT+'">'+e(o.ref.l)+'</text>'; }
      return s+'</svg>'; }
    // barres empilées à 100 %, légende au-dessus
    function stack(rows,o){ o=o||{}; var W=o.w||640, L=110, R=8, bh=20, gap=12, H=rows.length*(bh+gap)+4, pw=W-L-R, names=[], cols={}; rows.forEach(function(r){ r.segs.forEach(function(g){ if(names.indexOf(g.n)<0){ names.push(g.n); cols[g.n]=g.c; } }); });
      var s='<div style="display:flex;flex-wrap:wrap;gap:4px 14px;font-size:12px;margin:4px 0 6px">'+names.map(function(n){ return '<span style="display:inline-flex;align-items:center;gap:5px"><i style="width:10px;height:10px;border-radius:2px;background:'+cols[n]+';display:inline-block"></i>'+e(n)+'</span>'; }).join('')+'</div>';
      s+='<svg viewBox="0 0 '+W+' '+H+'" width="100%" role="img" aria-label="'+e(o.alt||'composition')+'" style="display:block;font-family:inherit">';
      rows.forEach(function(r,i){ var y=i*(bh+gap)+2, tot=r.segs.reduce(function(a,g){return a+g.v;},0), x=L, acc=0, nz=r.segs.filter(function(g){return g.v>0;}), seen=0; s+='<text x="'+(L-8)+'" y="'+(y+bh/2+4)+'" text-anchor="end" font-size="12" font-weight="'+(r.bold?800:400)+'" fill="'+INK+'">'+e(r.l)+'</text>';
        r.segs.forEach(function(g){ if(g.v<=0) return; var w=g.v/tot*pw, pc=Math.round(100*g.v/tot); seen++; if(seen===nz.length) pc=100-acc; acc+=pc; s+='<rect x="'+x+'" y="'+y+'" width="'+Math.max(1,w-2)+'" height="'+bh+'" rx="3" fill="'+g.c+'" data-tip="'+e(r.l+' · '+g.n+' : '+fr(g.v,(g.v*10)%1?2:(g.v%1?1:0))+' ('+pc+' %)')+'"/>'; if(w>26) s+='<text x="'+(x+(w-2)/2)+'" y="'+(y+bh/2+4)+'" text-anchor="middle" font-size="11" font-weight="700" fill="'+(LIGHT.indexOf(g.c)>=0?INK:'#fff')+'" pointer-events="none">'+pc+'</text>'; x+=w; }); });
      return s+'</svg><div style="font-size:11px;color:'+MUT+'">Part de l\'effectif en %, survolez ou touchez un segment pour le détail.</div>'; }
    // cascade : étapes positives / négatives menant à un total
    function waterfall(steps,o){ o=o||{}; var W=o.w||640, H=290, L=48, B=70, T=22, pw=W-L-8, ph=H-T-B, n=steps.length+1, cum=0, pts=[];
      steps.forEach(function(st){ pts.push({l:st.l,a:cum,b:cum+st.v,v:st.v}); cum+=st.v; }); pts.push({l:o.totlab||'Total',a:0,b:cum,v:cum,tot:true});
      var lo=Math.min.apply(null,pts.map(function(p){return Math.min(p.a,p.b,0);})), hi=Math.max.apply(null,pts.map(function(p){return Math.max(p.a,p.b,0);})), sp=(hi-lo)||1; var stp=Math.pow(10,Math.floor(Math.log10(sp/4))), q=sp/4/stp, stp=stp*(q<=1.5?1:(q<=3?2:(q<=7?5:10))); lo=Math.floor((lo-sp*0.14)/stp)*stp; hi=Math.ceil((hi+sp*0.08)/stp)*stp; sp=hi-lo;
      function Y(v){ return T+(hi-v)/sp*ph; } var bw=Math.min(54,pw/n*0.62), s='<svg viewBox="0 0 '+W+' '+H+'" width="100%" role="img" aria-label="'+e(o.alt||'cascade')+'" style="display:block;font-family:inherit">';
      for(var tv=lo;tv<=hi+1;tv+=stp){ var ty=Y(tv); s+='<line x1="'+L+'" x2="'+(W-4)+'" y1="'+ty+'" y2="'+ty+'" stroke="'+GRID+'"/><text x="'+(L-6)+'" y="'+(ty+4)+'" text-anchor="end" font-size="10" fill="'+MUT+'">'+fr(tv/1000,0)+' k</text>'; }
      s+='<line x1="'+L+'" x2="'+(W-4)+'" y1="'+Y(0)+'" y2="'+Y(0)+'" stroke="'+INK+'" stroke-width="1.2"/>';
      pts.forEach(function(p,i){ var cx=L+pw/n*(i+0.5), x=cx-bw/2, y1=Y(Math.max(p.a,p.b)), y2=Y(Math.min(p.a,p.b)), h=Math.max(2,y2-y1), col=p.tot?INK:(p.v>=0?'#1e7a34':'#b21f2d'), sg=(p.v>=0?'+':'−')+fr(Math.abs(Math.round(p.v)))+' €';
        s+='<rect x="'+x+'" y="'+y1+'" width="'+bw+'" height="'+h+'" rx="3" fill="'+col+'" data-tip="'+e(p.l+' : '+sg)+'"/>';
        if(i<pts.length-1) s+='<line x1="'+(x+bw)+'" x2="'+(cx+pw/n-bw/2)+'" y1="'+Y(p.b)+'" y2="'+Y(p.b)+'" stroke="'+MUT+'" stroke-dasharray="2 2"/>';
        var up=p.v>=0, ly=up?y1-5:y2+13; s+='<text x="'+cx+'" y="'+ly+'" text-anchor="middle" font-size="11" font-weight="700" fill="'+INK+'">'+(p.tot?'':(up?'▲ ':'▼ '))+sg+'</text>';
        var ln=[''], words=p.l.split(' '); words.forEach(function(w){ var c=ln[ln.length-1]; if((c+' '+w).trim().length<=15) ln[ln.length-1]=(c+' '+w).trim(); else ln.push(w); }); var l1=ln[0], l2=ln[1]||'', l3=ln[2]||'';
        s+='<text x="'+cx+'" y="'+(H-B+16)+'" text-anchor="middle" font-size="11" fill="'+INK+'">'+e(l1)+'</text><text x="'+cx+'" y="'+(H-B+29)+'" text-anchor="middle" font-size="11" fill="'+INK+'">'+e(l2)+'</text><text x="'+cx+'" y="'+(H-B+42)+'" text-anchor="middle" font-size="11" fill="'+INK+'">'+e(l3)+'</text>'; });
      return s+'</svg>'; }
    function donut(segs,o){ o=o||{}; var S=o.size||170, c=S/2, R=S/2-4, r=R*0.62, tot=segs.reduce(function(a,g){return a+g.v;},0); if(!tot) return '';
      var nz=segs.filter(function(g){return g.v>0;}), gap=nz.length>1?0.03:0, a=-Math.PI/2, p='';
      function pt(rad,ang){ return (c+rad*Math.cos(ang)).toFixed(2)+' '+(c+rad*Math.sin(ang)).toFixed(2); }
      var svg='<svg viewBox="0 0 '+S+' '+S+'" width="'+S+'" height="'+S+'" role="img" aria-label="'+e(o.alt||'répartition')+'" style="flex:0 0 auto;font-family:inherit">';
      nz.forEach(function(g){ var sw=g.v/tot*2*Math.PI, a0=a+gap/2, a1=a+sw-gap/2, tip=e((o.name?o.name+' · ':'')+g.n+' : '+fr(g.v,(g.v*10)%1?2:(g.v%1?1:0))+' ('+Math.round(100*g.v/tot)+' %)');
        if(nz.length===1) svg+='<circle cx="'+c+'" cy="'+c+'" r="'+((R+r)/2)+'" fill="none" stroke="'+g.c+'" stroke-width="'+(R-r)+'" data-tip="'+tip+'"/>';
        else svg+='<path d="M'+pt(R,a0)+'A'+R+' '+R+' 0 '+(sw>Math.PI?1:0)+' 1 '+pt(R,a1)+'L'+pt(r,a1)+'A'+r+' '+r+' 0 '+(sw>Math.PI?1:0)+' 0 '+pt(r,a0)+'Z" fill="'+g.c+'" data-tip="'+tip+'"/>';
        a+=sw; });
      svg+='<text x="'+c+'" y="'+(c+4)+'" text-anchor="middle" font-size="26" font-weight="800" fill="'+INK+'">'+fr(tot,(tot*10)%1?2:(tot%1?1:0))+'</text><text x="'+c+'" y="'+(c+22)+'" text-anchor="middle" font-size="11" fill="'+MUT+'">'+e(o.unit||'')+'</text></svg>';
      var leg='<div style="font-size:12px;line-height:1.7;flex:1 1 auto;min-width:0">'+nz.map(function(g){ return '<div style="display:flex;align-items:center;gap:6px;white-space:nowrap"><i style="width:10px;height:10px;border-radius:2px;background:'+g.c+';display:inline-block"></i><span>'+e(g.n)+'</span><b style="margin-left:auto;padding-left:10px">'+fr(g.v,(g.v*10)%1?2:(g.v%1?1:0))+'</b><span style="color:'+MUT+';min-width:34px;text-align:right">'+Math.round(100*g.v/tot)+' %</span></div>'; }).join('')+'</div>';
      return '<div style="display:flex;align-items:center;gap:7px;gap:12px;flex-wrap:nowrap;width:100%">'+svg+leg+'</div>'; }
    window.__ch={hbar:hbar,stack:stack,waterfall:waterfall,donut:donut};
  })();
  (function(){
    var EFF={Hésingue:{v:17,cs:2,c:6,a:6,l:4,ap:0},Sierentz:{v:14.5,cs:2,c:4.5,a:3,l:1,ap:0},Waldighoffen:{v:12,cs:2,c:3,a:1,l:1,ap:1},Mulhouse:{v:0,cs:0,c:0,a:0,l:0,ap:0}};
    var NOTE={Hésingue:'Administration : 6 personnes, dont 3 à temps partiel (dont une qui gère le groupe).',Sierentz:'1 salariée répartie à 50 % caisse / vente, d\'où 14,5 et 4,5. Administration : 3 personnes.',Waldighoffen:'Vente : 2 temps partiels et 1 apprenti. Caisse : 1 temps partiel.'};
    var COL={Waldighoffen:'#1d5fa8',Hésingue:'#1e7a34',Sierentz:'#e0a900',Mulhouse:'#7b3fa0',Creation:'#8a5a2b'};
    function fx(v,d){ return v==null||!isFinite(v)?'—':v.toLocaleString('fr-FR',{minimumFractionDigits:d||0,maximumFractionDigits:d||0}); }
    var rhMode='now'; function esc3(x){ return String(x).replace(/[&<>]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c];}); }
    var RHK=null, RHN=null, RHOPEN=false, RHST=null;
    function b64(u){ var s=''; for(var i=0;i<u.length;i++) s+=String.fromCharCode(u[i]); return btoa(s); }
    function unb(x){ return Uint8Array.from(atob(x),function(c){ return c.charCodeAt(0); }); }
    async function rhOpen(pw){ var B=(window.__DATA||{}).PRIVRH; if(!B) throw new Error('absent');
      var km=await crypto.subtle.importKey('raw',new TextEncoder().encode(pw),'PBKDF2',false,['deriveKey']);
      var k=await crypto.subtle.deriveKey({name:'PBKDF2',salt:unb(B.salt),iterations:B.iterations,hash:'SHA-256'},km,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
      var pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:unb(B.iv)},k,unb(B.data)); var o=JSON.parse(new TextDecoder().decode(pt)); var RHBASE=o; RHK=k;
      try{ var l=JSON.parse(localStorage.getItem('rh_nom_enc')||'null'); if(l){ var p2=await crypto.subtle.decrypt({name:'AES-GCM',iv:unb(l.iv)},k,unb(l.data)); o=JSON.parse(new TextDecoder().decode(p2)); } }catch(e){}
      var base0=JSON.parse(JSON.stringify(RHBASE)); RHN=o; ['Mulhouse','Creation'].forEach(function(mm){ if(!RHN[mm]||!RHN[mm].length) RHN[mm]=base0[mm]||[]; }); if(!RHN.Mulhouse) RHN.Mulhouse=[{p:'',n:'',e:'Directeur',o:'Direction',g:'F',t:''}]; Object.keys(RHN).forEach(function(m){ RHN[m].forEach(function(x){ x.o=POLES[rhClass(x)]; }); }); try{ if(window.__fgPNLoad) await window.__fgPNLoad(pw); }catch(e){} RHOPEN=true; rhAggSave(); if(window.__rhRender) window.__rhRender(STORE,true); setTimeout(rhSync,50); }
    async function rhSave(quiet){ if(!RHK||!RHN) return; rhAggSave(); var iv=crypto.getRandomValues(new Uint8Array(12)); var ct=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv:iv},RHK,new TextEncoder().encode(JSON.stringify(RHN)))); try{ localStorage.setItem('rh_nom_enc',JSON.stringify({iv:b64(iv),data:b64(ct)})); }catch(e){} if(!quiet){ rhTset('tl'); rhSyncSoon(); } }
    function rhT(){ try{ return JSON.parse(localStorage.getItem('rh_t')||'{}'); }catch(e){ return {}; } }
    function rhTset(k){ var t=rhT(); t[k]=Date.now(); try{ localStorage.setItem('rh_t',JSON.stringify(t)); }catch(e){} }
    function rhSt(msg,bad){ var el=document.getElementById('rhsync'); if(el){ el.textContent=msg; el.style.color=bad?'#b21f2d':'#737372'; } }
    var rhBusy=false, rhTimer=null;
    async function rhEnc(obj){ var iv=crypto.getRandomValues(new Uint8Array(12)); var ct=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv:iv},RHK,new TextEncoder().encode(JSON.stringify(obj)))); var all=new Uint8Array(12+ct.length); all.set(iv); all.set(ct,12); return b64(all); }
    async function rhDec(v){ var all=unb(v); var pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:all.slice(0,12)},RHK,all.slice(12)); return JSON.parse(new TextDecoder().decode(pt)); }
    function rhSyncSoon(){ if(!RHK) return; clearTimeout(rhTimer); rhTimer=setTimeout(rhSync,1500); }
    async function rhSync(){ var url=window.__SYNC_URL||''; if(!RHK||!RHN||rhBusy) return; if(!url){ rhSt('Synchronisation non configurée : données gardées sur cet appareil',1); return; }
      rhBusy=true; rhSt('Synchronisation…');
      try{ var r=await fetch(url+'?k=visite_RHnom&_='+Date.now()), j; try{ j=JSON.parse(await r.text()); }catch(e2){ throw new Error('acces'); }
        var t=rhT(), changed=false, push=false, rm=null; if(j.v){ try{ rm=await rhDec(j.v); }catch(e){ rm=null; push=true; } } else push=true;
        if(rm){ if((rm.tl||0)>(t.tl||0)){ RHN=rm.list; t.tl=rm.tl; changed=true; await rhSave(true); } else if((rm.tl||0)<(t.tl||0)) push=true;
          if((rm.tp||0)>(t.tp||0)){ try{ localStorage.setItem('rh_plan_v1',JSON.stringify(rm.plan||{})); }catch(e){} t.tp=rm.tp; changed=true; } else if((rm.tp||0)<(t.tp||0)) push=true; try{ localStorage.setItem('rh_t',JSON.stringify(t)); }catch(e){} }
        if(push){ var plan={}; try{ plan=JSON.parse(localStorage.getItem('rh_plan_v1')||'{}'); }catch(e){} var pr=await fetch(url,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({k:'visite_RHnom',v:await rhEnc({tl:t.tl||0,list:RHN,tp:t.tp||0,plan:plan}),w:window.__WRITE_TOKEN||''})}); var rj=null; try{ rj=JSON.parse(await pr.text()); }catch(e3){} if(rj&&rj.ok===false) throw new Error('refus'); }
        rhSt('Synchronisé à '+new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}));
        if(changed&&window.__rhRender&&vR.style.display!=='none'&&!(document.activeElement&&document.activeElement.tagName==='INPUT')) window.__rhRender(STORE);
      }catch(e){ rhSt((e&&e.message==='refus')?'Le script Google a refusé l\'écriture (jeton) : modifications gardées sur cet appareil':(e&&e.message==='acces')?'Google refuse l\'accès au script : modifications gardées sur cet appareil':'Hors connexion : modifications gardées, envoi au prochain essai',1); }
      rhBusy=false; }
    setInterval(function(){ if(RHK&&!document.hidden&&vR.style.display!=='none') rhSync(); },30000);
    document.addEventListener('visibilitychange',function(){ if(!document.hidden&&RHK) rhSync(); });
    function rhNorm(x){ return String(x||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,''); }
    var POLES=['Direction','Commerce','Caisse','Administratif','Logistique'];
    var POSTES=[['Vendeur','Commerce'],['Apprenti','Commerce'],['Chef de rayon','Commerce'],['Chef de secteur junior','Commerce'],['Chef de secteur','Commerce'],['Directeur','Direction'],['Directeur adjoint','Direction'],['Réceptionnaire','Logistique'],['Chauffeur','Logistique'],['Logisticien','Logistique'],['Hôte(sse) de caisse','Caisse'],['Responsable pôle caisse','Caisse'],['Comptable','Administratif'],['Secrétaire comptable','Administratif'],['Directrice financière','Administratif'],['Directeur général','Direction'],['Directrice ressources humaines','Administratif'],['Président','Direction'],['Responsable achat','Administratif'],['Agent d\'entretien','Logistique'],['Chef de secteur logistique','Logistique'],['Autre',null]];
    function rhClassOld(x){ var e=rhNorm(x.e), o=rhNorm(x.o); if(/directeur|directrice|adjoint/.test(e)) return 0; if(o.indexOf('caisse')>=0||/hotesse|hote /.test(e)) return 2; if(o.indexOf('logistique')>=0||o.indexOf('entretien')>=0) return 4; if(o.indexOf('administratif')>=0||o.indexOf('codir')>=0) return 3; return 1; }
    function rhClass(x){ var i=POLES.indexOf(x.o); return i>=0?i:rhClassOld(x); }
    function rhAggSave(){ if(!RHN) return; var a={}, hh={}; ['Hésingue','Sierentz','Waldighoffen','Mulhouse'].forEach(function(m){ var c=[0,0,0,0,0], ho=[0,0,0,0,0]; (RHN[m]||[]).forEach(function(x){ var w=(x.a?0:(x.t==='24h'?0.75:(x.t?0.5:1))), hw=x.a?0:(x.t?24:(m==='Sierentz'?39:38)), i2=POLES.indexOf(x.o2); if(i2>=0&&i2!==rhClass(x)){ c[rhClass(x)]+=w/2; c[i2]+=w/2; ho[rhClass(x)]+=hw/2; ho[i2]+=hw/2; } else { c[rhClass(x)]+=w; ho[rhClass(x)]+=hw; } }); a[m]=c; hh[m]=ho; }); var g={}; ['Hésingue','Sierentz','Waldighoffen','Mulhouse'].forEach(function(m){ var L=(RHN[m]||[]).filter(function(x){ return !x.a; }); g[m]=[L.filter(function(x){return x.g==='F';}).length,L.filter(function(x){return x.g==='H';}).length,L.filter(function(x){return x.g!=='F'&&x.g!=='H';}).length]; }); try{ localStorage.setItem('rh_agg_v1',JSON.stringify(a)); localStorage.setItem('rh_hrs_v1',JSON.stringify(hh)); localStorage.setItem('rh_gen_v1',JSON.stringify(g)); }catch(e){} }
    function rhAgg(){ var d=(window.__DATA||{}).RHAGG||{}, a=null; try{ a=JSON.parse(localStorage.getItem('rh_agg_v1')||'null'); }catch(e){} return a||d; }
    var NMS0=['Hésingue','Sierentz','Waldighoffen','Mulhouse'];
    function rhGen(){ var g=null; try{ g=JSON.parse(localStorage.getItem('rh_gen_v1')||'null'); }catch(e){} return g||(window.__DATA||{}).RHGEN||{}; }
    function rhHFRows(list,withG){ var tF=0,tH=0,tU=0, rows=list.map(function(m){ var F,H,U; if(RHN){ var L=(RHN[m]||[]).filter(function(x){ return !x.a; }); F=L.filter(function(x){return x.g==='F';}).length; H=L.filter(function(x){return x.g==='H';}).length; U=L.length-F-H; } else { var gg=rhGen()[m]||[0,0,0]; F=gg[0]; H=gg[1]; U=gg[2]; } tF+=F; tH+=H; tU+=U; return {l:m,segs:[{n:'Femmes',v:F,c:'#e87ba4'},{n:'Hommes',v:H,c:'#2a78d6'},{n:'À définir',v:U,c:'#a3a3a1'}],F:F,H:H,U:U}; });
      if(withG) rows.push({l:'GROUPE',bold:true,segs:[{n:'Femmes',v:tF,c:'#e87ba4'},{n:'Hommes',v:tH,c:'#2a78d6'},{n:'À définir',v:tU,c:'#a3a3a1'}],F:tF,H:tH,U:tU}); return rows; }
    function rhCards(rows,unit){ var card=function(r){ return '<div style="flex:0 1 340px;border:1px solid var(--line);border-radius:8px;padding:10px;background:#fff;display:flex;flex-direction:column;align-items:center"><div style="font-weight:800;margin-bottom:6px;color:'+(COL[r.l]||'#1d1d1b')+'">'+r.l+'</div>'+window.__ch.donut(r.segs,{name:r.l,unit:unit,size:128,alt:r.l})+'</div>'; };
      var G=rows.filter(function(r){ return r.l==='GROUPE'; }), M=rows.filter(function(r){ return r.l!=='GROUPE'; });
      if(!G.length||M.length<2) return '<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:12px">'+rows.map(card).join('')+'</div>';
      return '<div style="display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:12px"><div style="display:flex;flex-wrap:wrap;justify-content:center;gap:12px;flex:0 1 700px">'+M.map(card).join('')+'</div>'+G.map(card).join('')+'</div>'; }
    function nomStats(){ var rows=rhHFRows(RHST?[RHST]:NMS0,!RHST);
      return '<div style="overflow:auto"><table style="border-collapse:collapse;font-size:13px"><thead><tr style="background:#1d1d1b;color:#fff"><th style="padding:5px 9px;text-align:left">Magasin</th><th style="padding:5px 9px">Effectif</th><th style="padding:5px 9px">Femmes</th><th style="padding:5px 9px">Hommes</th><th style="padding:5px 9px">% femmes</th></tr></thead><tbody>'+rows.map(function(r){ var t=r.F+r.H+(r.U||0); return '<tr><td style="padding:5px 9px;font-weight:700">'+r.l+'</td><td style="padding:5px 9px;text-align:right">'+t+'</td><td style="padding:5px 9px;text-align:right">'+r.F+'</td><td style="padding:5px 9px;text-align:right">'+r.H+'</td><td style="padding:5px 9px;text-align:right;font-weight:800">'+(t?Math.round(100*r.F/t):0)+' %</td></tr>'; }).join('')+'</tbody></table></div>'; }
    function rhNomRender(){ var NMS=RHST?[RHST]:NMS0.concat(['Creation']), box=document.getElementById('rhnom'); if(!box) return; if(RHN&&!RHN.Mulhouse) RHN.Mulhouse=[]; if(RHN&&!RHN.Creation) RHN.Creation=[];
      var B=(window.__DATA||{}).PRIVRH; if(!B){ box.innerHTML=''; return; }
      if(!RHOPEN){ box.innerHTML='<div class="v-lock"><h3>Gestion d\'effectif</h3><div><input type="password" id="rhpw" placeholder="Clé personnelle" autocomplete="off" style="padding:8px;border:1px solid #d6d6d3;border-radius:6px;width:100%;box-sizing:border-box;margin-bottom:8px"> <button type="button" id="rhgo" style="width:100%;padding:10px 14px;border:0;border-radius:6px;background:#1d1d1b;color:#fff;font-weight:700">Ouvrir</button> <span id="rherr" class="lk-err" style="color:#b21f2d;font-size:13px"></span></div></div>';
        var go=function(){ var pw=document.getElementById('rhpw').value; if(!pw) return; document.getElementById('rherr').textContent='Vérification…'; rhOpen(pw).then(rhNomRender,function(){ document.getElementById('rherr').textContent='Clé incorrecte.'; }); };
        document.getElementById('rhgo').onclick=go; document.getElementById('rhpw').onkeydown=function(e){ if(e.key==='Enter') go(); }; return; }
      var inp='padding:5px 6px;border:1px solid #d6d6d3;border-radius:5px;font-size:13px;width:100%;box-sizing:border-box';
      var h='<h3 style="margin:18px 0 6px">Gestion d\'effectif</h3><div id="rhsync" class="sub" style="display:none"></div><div style="margin:8px 0;display:flex;gap:8px;flex-wrap:wrap"><button type="button" id="rhlock" class="rhb">🔒 Verrouiller</button></div><div id="rhstat" style="display:none">'+nomStats()+'</div>';
      NMS.forEach(function(m){ var L=RHN[m]||[]; h+='<h4 style="margin:14px 0 4px;color:'+COL[m]+'">'+(m==='Creation'?'Baeumlin Création':m)+' · '+L.length+' personnes</h4><div style="overflow:auto"><table style="border-collapse:collapse;font-size:13px;min-width:980px;width:100%"><thead><tr style="background:'+COL[m]+';color:#fff"><th style="padding:5px;text-align:left">Prénom</th><th style="padding:5px;text-align:left">Nom</th><th style="padding:5px;text-align:left">Poste</th><th style="padding:5px;text-align:left">Pôle</th><th style="padding:5px;text-align:left">+ 2e pôle (mi-temps)</th><th style="padding:5px">Genre</th><th style="padding:5px">Temps de travail</th><th style="padding:5px">Arrêt longue durée</th><th></th></tr></thead><tbody>'+L.map(function(x,i){ return '<tr data-m="'+m+'" data-i="'+i+'" style="border-bottom:1px solid #efefed;'+(x.a?'opacity:.55;background:#f3f4f6':'')+'"><td style="padding:2px"><input class="rhi" data-k="p" value="'+esc3(x.p).replace(/"/g,'&quot;')+'" style="'+inp+'"></td><td style="padding:2px"><input class="rhi" data-k="n" value="'+esc3(x.n).replace(/"/g,'&quot;')+'" style="'+inp+'"></td><td style="padding:2px"><select class="rhi" data-k="e" title="'+esc3(x.e0||'').replace(/"/g,'&quot;')+'" style="'+inp+'">'+POSTES.map(function(p){ return '<option value="'+p[0]+'"'+(x.e===p[0]?' selected':'')+'>'+p[0]+'</option>'; }).join('')+(POSTES.some(function(p){ return p[0]===x.e; })?'':'<option value="'+esc3(x.e||'').replace(/"/g,'&quot;')+'" selected>'+esc3(x.e||'—')+'</option>')+'</select></td><td style="padding:2px"><select class="rhi" data-k="o" style="'+inp+'">'+POLES.map(function(p){ return '<option value="'+p+'"'+(rhClass(x)===POLES.indexOf(p)?' selected':'')+'>'+p+'</option>'; }).join('')+'</select></td><td style="padding:2px"><select class="rhi" data-k="o2" style="'+inp+'"><option value="">—</option>'+POLES.map(function(p){ return '<option value="'+p+'"'+(x.o2===p?' selected':'')+'>'+p+'</option>'; }).join('')+'</select></td><td style="padding:2px;text-align:center"><select class="rhi" data-k="g" style="padding:5px;border:1px solid #d6d6d3;border-radius:5px"><option value="F"'+(x.g==='F'?' selected':'')+'>F</option><option value="H"'+(x.g==='H'?' selected':'')+'>H</option><option value=""'+(!x.g?' selected':'')+'>?</option></select></td><td style="padding:2px;text-align:center"><select class="rhi" data-k="t" style="'+inp+'"><option value=""'+(!x.t?' selected':'')+'>Temps plein</option><option value="24h"'+(x.t==='24h'?' selected':'')+'>24 h (0,75)</option><option value="Temps partiel"'+(x.t&&x.t!=='24h'?' selected':'')+'>Mi-temps (0,5)</option></select></td><td style="padding:2px;text-align:center"><input type="checkbox" class="rhi" data-k="a" '+(x.a?'checked':'')+'></td><td style="padding:2px"><button type="button" class="rhx" title="Supprimer" style="border:0;background:none;color:#b21f2d;font-size:16px">✕</button></td></tr>'; }).join('')+'</tbody></table></div><button type="button" class="rhadd rhb" data-m="'+m+'" style="margin-top:6px">+ Ajouter une personne à '+m+'</button>'; });
      box.innerHTML=h;
      box.querySelectorAll('.rhi').forEach(function(el){ el.onchange=function(){ var tr=el.closest('tr'), x=RHN[tr.dataset.m][+tr.dataset.i], k=el.dataset.k; x[k]=(k==='a')?el.checked:el.value; if(k==='e'){ var pp=POSTES.filter(function(p){ return p[0]===el.value; })[0]; if(pp&&pp[1]){ x.o=pp[1]; if(x.o2===x.o) x.o2=''; } rhSave(); rhNomRender(); window.__rhRender(STORE,true); return; } rhSave(); document.getElementById('rhstat').innerHTML=nomStats(); window.__rhRender(STORE,true); }; });
      box.querySelectorAll('.rhx').forEach(function(b){ b.onclick=function(){ var tr=b.closest('tr'), x=RHN[tr.dataset.m][+tr.dataset.i]; if(!confirm('Supprimer '+x.p+' '+x.n+' de la liste ?')) return; RHN[tr.dataset.m].splice(+tr.dataset.i,1); rhSave(); rhNomRender(); window.__rhRender(STORE,true); }; });
      box.querySelectorAll('.rhadd').forEach(function(b){ b.onclick=function(){ RHN[b.dataset.m].push({p:'',n:'',e:'',o:'',g:'H',t:''}); rhSave(); rhNomRender(); window.__rhRender(STORE,true); }; });
      document.getElementById('rhlock').onclick=function(){ RHOPEN=false; RHK=null; RHN=null; window.__fgPN=null; rhNomRender(); }; }
    window.__rhOpened=function(){ return !!RHOPEN; }; window.__rhUnlock=function(pw){ return rhOpen(pw); };
    window.__rhRender=function(ST0,onlyMain){ var D=window.__DATA||{}, G=(D.GESTION||{}), MG=G.mags||{}, J=G.jours||10, ms=['Hésingue','Sierentz','Waldighoffen','Mulhouse'];
      var ST=(ST0==='Hesingue')?'Hésingue':ST0, one=ms.indexOf(ST)>=0, vm=one?[ST]:ms; RHST=one?ST:null;
      function tot(m){ var k=Object.keys(MG).filter(function(x){ return x.toLowerCase().replace(/é/g,'e')===m.toLowerCase().replace(/é/g,'e'); })[0]; return k&&MG[k]&&MG[k].tot||null; }
      var h='<div class="v-head"><h2>👥 RH · '+(one?ST:'groupe')+'</h2><span class="sub">CA et passages de la période du Performance commerciale ('+J+' jours), rapportés à l\'effectif affiché ci-dessous (directeurs non comptés).</span></div>';
      function put(hh){ if(onlyMain&&document.getElementById('rhmain')){ document.getElementById('rhmain').innerHTML=hh; return; } vR.innerHTML='<div class="v-wrap"><div id="rhmain">'+hh+'</div><div id="rhnom"></div></div>'; rhNomRender(); }
      if(ST0==='Creation'){ RHST='Creation'; put('<div class="v-head"><h2>👥 RH · Baeumlin Création</h2><span class="sub">Effectif de Baeumlin Création (pas de chiffre d\'affaires ni de passages à comparer).</span></div>'); return; }
      if(!one&&!window.__GRPU){ put(window.__grpHtml); window.__grpBind(document.getElementById('rhmain')||vR,function(){ window.__rhRender(ST0,false); }); return; }
      if(one&&!((rhAgg()[ST]||[])[1]>0)){ h+='<div class="g-nodata" style="margin-top:12px"><b>Données en attente</b> : effectifs de '+ST+' (liste des salariés avec leur fonction).</div>'; put(h); return; }
      function thead(g){ return '<th style="text-align:left;padding:6px 8px"> </th>'+vm.map(function(m){ return '<th style="padding:6px 8px;background:'+COL[m]+'">'+m+'</th>'; }).join('')+(g?'<th style="padding:6px 8px;background:#1d1d1b;border-left:2px solid #fff">'+(one?'Moyenne groupe':'GROUPE')+'</th>':''); }
      var CAM='', NAMES=['Direction','Commerce','Caisse','Administratif','Logistique'], AG=rhAgg();
      var FON=NAMES.map(function(n,i){ var o={}; ['Hésingue','Sierentz','Waldighoffen','Mulhouse'].forEach(function(m){ o[m]=(AG[m]||[])[i]||0; }); return [n,o]; });
      var BASEF=[{Hésingue:2,Sierentz:2,Waldighoffen:0},{Hésingue:16,Sierentz:13,Waldighoffen:14},{Hésingue:6,Sierentz:7,Waldighoffen:3},{Hésingue:4,Sierentz:3,Waldighoffen:3},{Hésingue:5,Sierentz:1,Waldighoffen:1}];
      var EF={}; Object.keys(EFF).forEach(function(m){ var e=Object.assign({},EFF[m]); e.v=FON[1][1][m]||0; e.c=FON[2][1][m]||0; e.a=FON[3][1][m]||0; e.l=FON[4][1][m]||0; e.ap=0; e.cs=0; EF[m]=e; });
      var G0=['Hésingue','Sierentz','Waldighoffen','Mulhouse'], tt={}; G0.forEach(function(m){ tt[m]=FON.reduce(function(a,f){ return a+(f[1][m]||0); },0); });
      var HS={Hésingue:38,Sierentz:39,Waldighoffen:38,Mulhouse:38}, HRS=null; try{ HRS=JSON.parse(localStorage.getItem('rh_hrs_v1')||'null'); }catch(e){}
      var wh=function(m,k){ var e=EF[m], hr=HRS&&HRS[m]; if(hr&&hr.length===5){ return k==='v'?hr[1]:(k==='c'?hr[2]:hr[1]+hr[2]+hr[3]+hr[4]); } var q=k==='v'?e.v:(k==='c'?e.c:e.v+e.c+e.a+e.l+e.ap); return q*(HS[m]||38); }, hv=function(m){ return wh(m,'v')*J/7; }, hc=function(m){ return wh(m,'c')*J/7; }, he=function(m){ return wh(m,'e')*J/7; };
      var R=ms.map(function(m){ var e=EF[m], t=tot(m); if(!e||!t||!(e.v>0)||!(e.c>0)) return null; var eff=e.v+e.c+e.a+e.l+e.ap; return {m:m,ca:t.ca,pas:t.pass,caV:t.ca/e.v/J,caE:t.ca/eff/J,pV:t.pass/e.v/J,pC:t.pass/e.c/J,eff:eff,caVh:t.ca/hv(m),caEh:t.ca/he(m),pCh:t.pass/hc(m)}; });
      function grp(k){ var rs=R.filter(Boolean); if(!rs.length) return null; var ca=0,pas=0,V=0,C=0,E=0,VH=0,CH=0,EH=0; rs.forEach(function(r){ var e=EF[r.m]; ca+=r.ca; pas+=r.pas; V+=e.v; C+=e.c; E+=r.eff; VH+=hv(r.m); CH+=hc(r.m); EH+=he(r.m); }); return k==='caV'?ca/V/J:(k==='caE'?ca/E/J:(k==='pV'?pas/V/J:(k==='caVh'?ca/VH:(k==='caEh'?ca/EH:(k==='pCh'?pas/CH:pas/C/J))))); }
      (function(){ var SER=[['Direction',[0],'#2a78d6'],['Commerce',[1],'#eda100'],['Caisse',[2],'#e87ba4'],['Administratif',[3],'#6250d6'],['Logistique',[4],'#008300']];
        var rows=[]; vm.forEach(function(m){ if(!tt[m]) return; rows.push({l:m,segs:SER.map(function(sr){ return {n:sr[0],c:sr[2],v:sr[1].reduce(function(a,i){ return a+(FON[i][1][m]||0); },0)}; })}); });
        if(!one) rows.push({l:'GROUPE',bold:true,segs:SER.map(function(sr){ return {n:sr[0],c:sr[2],v:sr[1].reduce(function(a,i){ return a+G0.reduce(function(b,m){ return b+(FON[i][1][m]||0); },0); },0)}; })});
        var b1='<h3 style="margin:14px 0 6px;text-align:center">Composition de l\'équipe</h3>'+rhCards(rows,'ETP'), b2='<h3 style="margin:16px 0 6px;text-align:center">Femmes et hommes</h3>'+rhCards(rhHFRows(vm.filter(function(m){ return G0.indexOf(m)>=0; }),!one),'personnes'); if(one) CAM='<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:14px"><div style="flex:0 1 360px">'+b1+'</div><div style="flex:0 1 360px">'+b2.replace('margin:16px 0 6px','margin:14px 0 6px')+'</div></div>'; else CAM=b1+b2; })();
      var defs=[['CA par vendeur (pôle commerce) et par jour (TTC)','caV',0,' €'],['CA par salarié (tous confondus) et par jour (TTC)','caE',0,' €'],['Passages par hôtesse de caisse et par jour','pC',1,''],['CA par vendeur (pôle commerce) et par heure travaillée (TTC)','caVh',0,' €'],['CA par salarié (tous confondus) et par heure travaillée (TTC)','caEh',0,' €'],['Passages par hôtesse de caisse et par heure travaillée','pCh',2,'']];
      function best(key,hi){ var v=R.filter(Boolean).map(function(r){return r[key];}); return hi?Math.max.apply(null,v):Math.min.apply(null,v); }
      (function(){ var PR=[['CA par vendeur (pôle commerce)',3,0,' € / h'],['CA par salarié (tous confondus)',4,1,' € / h'],['Passages par hôtesse de caisse',5,2,' / h']];
        h+='<h3 style="margin:14px 0 8px">Productivité (par heure travaillée, sur la période)</h3><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:12px">'+PR.map(function(P){ var dH=defs[P[1]], dJ=defs[P[2]], vals=vm.map(function(m){ var r=R[ms.indexOf(m)]; return r?r[dH[1]]:null; }).filter(function(v){ return v!=null; }), best=Math.max.apply(null,vals), worst=Math.min.apply(null,vals), gH=grp(dH[1]), gJ=grp(dJ[1]);
          var rows=vm.map(function(m){ var r=R[ms.indexOf(m)]; if(!r) return '<div style="display:flex;align-items:center;gap:8px;padding:8px 2px;border-top:1px solid #efefed"><i style="width:10px;height:10px;border-radius:50%;background:'+COL[m]+'"></i><b style="flex:1">'+m+'</b><span style="color:#a3a3a1">en attente</span></div>'; var v=r[dH[1]], e=gH?Math.round((v/gH-1)*100):0, col=(vals.length>1&&v===best)?'#1e7a34':((vals.length>1&&v===worst)?'#b21f2d':'#1d1d1b'), pc=e>=0?'#1e7a34':'#b21f2d';
            return '<div style="display:flex;align-items:center;gap:8px;padding:8px 2px;border-top:1px solid #efefed"><i style="width:10px;height:10px;border-radius:50%;background:'+COL[m]+'"></i><b style="flex:1">'+m+'</b><div style="text-align:center;min-width:110px"><div style="font-size:26px;font-weight:800;line-height:1.05;color:'+col+'">'+fx(v,dH[2])+'<span style="font-size:12px;font-weight:700;color:#737372">'+dH[3].replace(' €','').replace(' ','')+'</span></div><div style="font-size:11.5px;color:#737372">'+fx(r[dJ[1]],dJ[2])+dJ[3]+' par jour</div></div><span style="min-width:26px;text-align:center;font-size:20px" title="Meilleur des magasins comparés">'+((vals.length>1&&v===best)?'🏆':'')+'</span></div>'; }).join('');
          return '<div style="border:1px solid var(--line);border-radius:10px;background:#fff;padding:10px 12px"><div style="font-weight:800;font-size:13.5px;margin-bottom:4px;text-align:center">'+P[0]+'</div>'+rows+'<div style="display:flex;align-items:center;gap:8px;padding:8px 2px;border-top:2px solid #1d1d1b"><i style="width:10px;height:10px;border-radius:50%;background:#1d1d1b"></i><b style="flex:1">'+(one?'Moyenne groupe':'GROUPE')+'</b><div style="text-align:center;min-width:110px"><div style="font-size:22px;font-weight:800;line-height:1.05">'+fx(gH,dH[2])+'<span style="font-size:12px;font-weight:700;color:#737372">'+dH[3].replace(' €','').replace(' ','')+'</span></div><div style="font-size:11.5px;color:#737372">'+fx(gJ,dJ[2])+dJ[3]+' par jour</div></div><span style="min-width:26px"></span></div></div>'; }).join('')+'</div><div class="sub" style="margin-top:6px">🏆 : le meilleur des magasins comparés. Vert : le meilleur. Rouge : le plus faible. Heures contractuelles : 38 h par semaine (39 h à Sierentz), 24 h pour les temps partiels, sur les '+J+' jours de la période.</div>'; })();
      h+=CAM;
      (function(){ var rs=R.filter(Boolean); if(rs.length<2) return;
        function pct(a,b){ return Math.round((a-b)/b*100); }
        var M=[{k:'caV',l:'CA par vendeur (pôle commerce) et par jour',u:' €',d:0,a:function(w,b){ return 'Revoir l\'affectation des vendeurs par zone et par créneau de forte affluence, et reprendre l\'organisation de '+b.m+'.'; }},
          {k:'caE',l:'CA par salarié (tous confondus) et par jour',u:' €',d:0,a:function(w,b){ var sw=EF[w.m], sb=EF[b.m]; var supW=Math.round((sw.a+sw.l)/(sw.v+sw.c+sw.a+sw.l+sw.ap)*100), supB=Math.round((sb.a+sb.l)/(sb.v+sb.c+sb.a+sb.l+sb.ap)*100); return 'Les fonctions support (administration, logistique) pèsent '+supW+' % de l\'effectif contre '+supB+' % à '+b.m+' : identifier les tâches à mutualiser au niveau du groupe ou à redéployer vers la vente.'; }},
          {k:'pC',l:'passages par hôtesse de caisse et par jour',u:'',d:0,a:function(w,b){ return 'Caisse moins chargée qu\'à '+b.m+' : ajuster le planning de caisse aux pics et faire tourner les hôtesses sur l\'accueil et la vente.'; }}];
        var items=[]; M.forEach(function(m){ var sorted=rs.slice().sort(function(a,b){ return b[m.k]-a[m.k]; }), b=sorted[0], w=sorted[sorted.length-1]; var g=pct(b[m.k],w[m.k]); if(g<=10) return; if(one&&w.m!==ST) return; items.push({g:g,m:w.m,t:w.m+' : '+m.l+' '+fx(w[m.k],m.d)+m.u+' contre '+fx(b[m.k],m.d)+m.u+' à '+b.m+' (−'+Math.round((b[m.k]-w[m.k])/b[m.k]*100)+' %).',a:m.a(w,b)}); });
        items.sort(function(a,b){ return b.g-a.g; });
        var gp=Object.keys(EF).map(function(m){ var e=EF[m]; return {m:m,sup:(e.a+e.l)/(e.v+e.c+e.a+e.l+e.ap)}; }).sort(function(a,b){ return b.sup-a.sup; });
        h+='<h3 style="margin:14px 0 6px">Constats et plan d\'action RH</h3>';
        if(!items.length) h+='<div class="sub">'+(one?'Aucun écart de plus de 10 % défavorable à '+ST+' sur la période.':'Pas d\'écart de plus de 10 % entre les magasins sur la période.')+'</div>';
        items.forEach(function(it){ var pr=it.g>=25?1:(it.g>=15?2:3), col=pr<=2?'#b21f2d':'#e0701a'; h+='<div style="border:1px solid var(--line);border-left:6px solid '+col+';border-radius:8px;padding:9px 10px;margin:8px 0;background:#fff"><div style="font-weight:800;color:'+col+'">Priorité '+pr+' · '+it.m+'</div><div style="margin:3px 0">'+esc3(it.t)+'</div><div style="color:#1d1d1b"><b>Action :</b> '+esc3(it.a)+'</div></div>'; });
        var top=gp[0]; h+='<div style="border:1px solid var(--line);border-left:6px solid #1e7a34;border-radius:8px;padding:9px 10px;margin:8px 0;background:#fff"><div style="font-weight:800;color:#1e7a34">À copier</div><div>'+(function(){ var b=rs.slice().sort(function(a,b){ return b.caE-a.caE; })[0]; return esc3(b.m+' obtient le meilleur CA par salarié ('+fx(b.caE,0)+' € par jour) avec '+Math.round((EF[b.m].a+EF[b.m].l)/(EF[b.m].v+EF[b.m].c+EF[b.m].a+EF[b.m].l+EF[b.m].ap)*100)+' % de fonctions support : à documenter et à transposer aux autres magasins.'); })()+'</div></div>';
        h+='<div class="sub">Constats calculés sur '+J+' jours d\'activité. À confirmer sur un mois complet, 24 h compté pour 0,75, mi-temps pour 0,5, deuxième pôle 0,5 / 0,5 ; à affiner avec les heures travaillées.</div>'; })();
      h+='<h3 style="margin:14px 0 6px">Particularités</h3><ul style="margin:0;padding-left:18px">'+vm.filter(function(m){ return NOTE[m]; }).map(function(m){ return '<li>'+(one?'':'<b>'+m+'</b> : ')+NOTE[m]+'</li>'; }).join('')+'</ul>';
      h+='<div class="g-nodata" style="margin-top:12px"><b>Données en attente</b> : '+((one||(rhAgg().Mulhouse||[])[1]>0)?'':'effectifs de Mulhouse, ')+'heures réellement travaillées et planning (le CA par heure est calculé sur les heures contractuelles (38 h, 39 h à Sierentz, 24 h en temps partiel), à affiner avec les heures réelles).</div>';
      put(h); };
  })();
  window.__navInit=function(){ var h=location.hash.replace('#',''); TOOL=(h==='tract'||h==='visite'||h==='compta'||h==='rh')?h:'gestion'; appliquer(); };
})();


var PRIV={}, UNL={}, UNLPW={}; window.__ouvrirPriv=function(a,b,c){ return ouvrirPriv(a,b,c); }; function GU(k){ if(UNL[k]) return UNL[k]; var a=((window.__DATA||{}).GRP||{})[k], b=(window.__GRPU||{})[k]; if(!a&&!b) return null; var r=Object.assign({},a||{},b||{}); if(window.__CPT&&window.__CPT[k]) r.COMPTA=window.__CPT[k]; return r; }
/* ===== SUIVI DES ACHATS : budget vs achats directs (DocuWare) + Weldom saisi à la main par semaine ===== */
(function(){
  var MN=['oct.','nov.','déc.','janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.'];
  var LBL={Hesingue:'Hésingue',Sierentz:'Sierentz',Waldighoffen:'Waldighoffen',Mulhouse:'Mulhouse',Creation:'Baeumlin Création'};
  var STS=['Hesingue','Sierentz','Waldighoffen','Mulhouse'];
  var COL={Hesingue:'#1e7a34',Sierentz:'#e0a900',Waldighoffen:'#1d5fa8',Mulhouse:'#7b3fa0'};
  var CSS='.ach{margin:8px 0}.ach h3{margin:14px 0 6px}.ach .kp{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px}.ach .k{background:#fff;border:1px solid #e4e4e1;border-radius:12px;padding:12px 14px}.ach .k span{font-size:11.5px;color:#737372;letter-spacing:.05em;text-transform:uppercase}.ach .k b{display:block;font-size:22px;margin-top:3px}.ach .k em{font-style:normal;font-size:12px;color:#737372}'+
   '.ach table{width:100%;border-collapse:collapse;font-size:13.5px;background:#fff;border:1px solid #e4e4e1}.ach th{background:#1d1d1b;color:#fff;text-align:right;padding:8px 9px;font-size:12px}.ach th:first-child,.ach td:first-child{text-align:left}.ach td{padding:7px 9px;border-bottom:1px solid #eee;text-align:right}'+
   '.ach tr.cur td{background:#f1f8f3;font-weight:700}.ach tr.fut td{color:#9a9a98}.ach tfoot td{background:#1d1d1b;color:#fff;font-weight:700}.ach .k.t-ko{background:#fdecee;border-color:#b21f2d}.ach .k.t-or{background:#fff3e6;border-color:#ec6707}.ach .k.t-ok{background:#eef8f0;border-color:#1e7a34}.ach .ok{color:#1e7a34;font-weight:700}.ach .ko{color:#b21f2d;font-weight:700}'+
   '.ach .pb{height:20px;background:#eee;border-radius:6px;position:relative;overflow:hidden;margin:6px 0}.ach .pb i{display:block;height:100%}.ach .pb u{position:absolute;top:0;bottom:0;width:2px;background:#1d1d1b;opacity:.65}'+
   '.ach input.w{width:110px;padding:5px 7px;border:1px solid #cfcfcb;border-radius:8px;font:inherit;text-align:right}.ach input.w.emp{border-color:#f2b8c4;background:#fde8ec}.ach input.w.sv{border-color:#1e7a34;background:#f1f8f3}.ach input.w.er{border-color:#b21f2d;background:#fff0f0}.ach input.w.dirty{border-color:#e0a900;background:#fff8ee}.ach input.w.c.sv{border-color:#1e7a34;background:#f1f8f3}.ach input.w.c{width:70px;margin:1px 2px 1px 0;padding:5px 5px}'+
   '.ach .pills{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}.ach .pills button{padding:5px 12px;border-radius:999px;border:2px solid #d6d6d3;background:#fff;font:inherit;font-weight:700;font-size:13px;cursor:pointer}.ach .pills button.on{background:#1d1d1b;color:#fff;border-color:#1d1d1b}'+
   '.ach .warn{background:#fff8ee;border:1px solid #e0a900;border-radius:10px;padding:8px 12px;margin:8px 0;font-size:13px}.ach .wk{max-height:420px;overflow:auto;border:1px solid #e4e4e1;border-radius:10px}.ach table.bcr tr.main.cap td{font-weight:800;background:#f4f4f2}.ach table.bcr tr.sub td{color:#555}.ach table.bcr tr.sub td:first-child{padding-left:26px}.ach table.bcr td.ko{color:#b21f2d}.ach table.bcr .tg{display:inline-block;width:0;height:0;border-left:6px solid #737372;border-top:4px solid transparent;border-bottom:4px solid transparent;margin-right:8px}.ach table.bcr tr.open .tg{transform:rotate(90deg)}';
  var st=document.createElement('style'); st.textContent=CSS; document.head.appendChild(st);
  function pad(n){ return n<10?'0'+n:''+n; }
  function iso(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
  function pd(s){ var p=s.split('-'); return new Date(+p[0],+p[1]-1,+p[2]); }
  function monOf(d){ var x=new Date(d.getFullYear(),d.getMonth(),d.getDate()); x.setDate(x.getDate()-((x.getDay()+6)%7)); return x; }
  function wkMonth(w){ var d=pd(w); d.setDate(d.getDate()+3); return d.getFullYear()+'-'+pad(d.getMonth()+1); }   /* une semaine appartient au mois de son jeudi */
  function eur(v){ return v==null||isNaN(v)?'—':Math.round(v).toLocaleString('fr-FR')+' €'; }
  function seur(v){ return v==null||isNaN(v)?'—':(v>0?'+ ':(v<0?'− ':''))+Math.abs(Math.round(v)).toLocaleString('fr-FR')+' €'; }
  function exo(){ var t=new Date(), y=t.getMonth()>=9?t.getFullYear():t.getFullYear()-1, months=[], i;
    for(i=0;i<12;i++){ var m=9+i, yy=y+Math.floor(m/12); months.push(yy+'-'+pad(m%12+1)); }
    var weeks=[], d=monOf(new Date(y,9,1)); d.setDate(d.getDate()-7);
    for(i=0;i<60;i++){ var w=iso(d); if(months.indexOf(wkMonth(w))>=0) weeks.push(w); d.setDate(d.getDate()+7); }
    return {y:y,months:months,weeks:weeks}; }
  var KC={};
  async function key(name,pw){ var id=name+'\u0001'+pw; if(KC[id]) return KC[id]; var enc=new TextEncoder(), km=await crypto.subtle.importKey('raw',enc.encode(pw),'PBKDF2',false,['deriveKey']);
    return (KC[id]=await crypto.subtle.deriveKey({name:'PBKDF2',salt:enc.encode('fg-sync-'+name),iterations:200000,hash:'SHA-256'},km,{name:'AES-GCM',length:256},false,['encrypt','decrypt'])); }
  function wtok(s){ var m=window.__WRITES||{}; return (s&&m[s])||window.__WRITE_TOKEN||''; }
  function wkKey(s,w){ return 'visite_achw'+s+'Z'+String(w).replace(/\D/g,'').replace(/\d/g,function(d){ return 'abcdefghij'.charAt(+d); }); }
  function ckKey(s,w){ return 'visite_achc'+s+'Z'+String(w).replace(/\D/g,'').replace(/\d/g,function(d){ return 'abcdefghij'.charAt(+d); }); }
  function edKey(s,w){ return 'visite_achd'+s+'Z'+String(w).replace(/\D/g,'').replace(/\d/g,function(d){ return 'abcdefghij'.charAt(+d); }); }
  var INI={Hesingue:'H',Sierentz:'S',Waldighoffen:'W',Mulhouse:'M'};
  function dests(s){ return STS.filter(function(x){ return x!==s; }); }
  async function pool(items,n,fn){ var i=0; await Promise.all(Array.from({length:n},async function(){ while(i<items.length){ var it=items[i++]; try{ await fn(it); }catch(e){} } })); }
  var ACT=0, QQ=[], RC={};
  function slot(){ return new Promise(function(res){ if(ACT<10){ ACT++; res(); } else QQ.push(res); }); }
  function freeSlot(){ var n=QQ.shift(); if(n) n(); else ACT--; }
  async function rawGet(k){ var c=RC[k]; if(c&&Date.now()-c.t<30000) return c.j; await slot(); var ac=new AbortController(), tm=setTimeout(function(){ ac.abort(); },25000); try{ var r=await fetch(window.__SYNC_URL+'?k='+encodeURIComponent(k)+'&_='+Date.now(),{signal:ac.signal}), j=JSON.parse(await r.text()); if(j&&j.v) RC[k]={t:Date.now(),j:j}; return j; } finally{ clearTimeout(tm); freeSlot(); } }
  async function get(k,salt,pw,z){ var url=window.__SYNC_URL; if(!url||!pw) return null;
    try{ var j=await rawGet(k); if(!j||!j.v) return null;
      var all=Uint8Array.from(atob(j.v),function(c){return c.charCodeAt(0);}), pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:all.slice(0,12)},await key(salt,pw),all.slice(12));
      var txt=z?await new Response(new Blob([pt]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text():new TextDecoder().decode(pt); return JSON.parse(txt); }catch(e){ return null; } }
  async function put(k,salt,pw,obj,store){ delete RC[k]; var iv=crypto.getRandomValues(new Uint8Array(12)), ct=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv:iv},await key(salt,pw),new TextEncoder().encode(JSON.stringify(obj)))), all=new Uint8Array(12+ct.length); all.set(iv,0); all.set(ct,12);
    var b=''; for(var i=0;i<all.length;i+=8192) b+=String.fromCharCode.apply(null,all.subarray(i,i+8192));
    var r=await fetch(window.__SYNC_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({k:k,v:btoa(b),w:wtok(store)})}), j=null; try{ j=JSON.parse(await r.text()); }catch(e){} return !(j&&j.ok===false); }
  function pwOf(s){ return (typeof UNLPW!=='undefined'&&UNLPW[s])||((((window.__DATA||{}).AUTO||{}).S||{})[s])||null; }
  var WKT={}, CACHE={};      /* {STORE:{A,B,maj}, W:{store:{w:{semaine:[montant,ts]}}}} */
  async function load(sel){ var S=sel==='GROUPE'?STS:[sel], out={ok:true,miss:[]};
    var mainP=(async function(){
      if(sel==='GROUPE'){ var gp=window.__GRPPW||((((window.__DATA||{}).AUTO||{}).G)||null), g=await get('visite_achGROUPE','achGROUPE',gp,true); CACHE.G=g; if(!g) out.ok=false; }
      else { var p=pwOf(sel), d=await get('visite_ach'+sel,'ach'+sel,p,true); CACHE[sel]=d; if(!d) out.ok=false; } })();
    var perP=S.map(async function(s){ var p2=pwOf(s); if(!p2){ out.miss.push(s); return; } if(WKT[s]&&Date.now()-WKT[s]<30000) return;
      var wk=exo().weeks.filter(function(x){ return pd(x)<=monOf(new Date()); });
      var res=await Promise.all([get('visite_achw'+s,'achw'+s,p2,false),Promise.all(wk.map(function(x){ return get(wkKey(s,x),'achw'+s,p2,false); })),Promise.all(wk.map(function(x){ return get(ckKey(s,x),'achw'+s,p2,false); })),Promise.all(wk.map(function(x){ return get(edKey(s,x),'achw'+s,p2,false); }))]);
      var W0=Object.assign({},(res[0]&&res[0].w)||{}); res[1].forEach(function(r,ix){ var x=wk[ix]; if(r&&typeof r==='object'&&'v' in r){ if(r.v===null) delete W0[x]; else W0[x]=[r.v,r.ts||0]; } });
      var M0={}; res[2].forEach(function(r,ix){ if(r&&typeof r==='object'&&r.v&&typeof r.v==='object') M0[wk[ix]]=r.v; });
      var E0={}; res[3].forEach(function(r,ix){ if(r&&typeof r==='object'&&r.v&&typeof r.v==='object') E0[wk[ix]]=r.v; }); CACHE['W'+s]={w:W0}; CACHE['M'+s]={w:M0}; CACHE['E'+s]={w:E0}; WKT[s]=Date.now(); });
    await Promise.all([mainP].concat(perP)); return out; }
  function dataOf(s){ var G=CACHE.G, A, B, C; var PS; if(G&&G.S&&G.S[s]){ A=G.S[s].A; B=G.S[s].B; C=G.S[s].C; PS=G.S[s].PS; } if(CACHE[s]){ A=CACHE[s].A; B=CACHE[s].B; C=CACHE[s].C; PS=CACHE[s].PS; } var W=(CACHE['W'+s]||{w:{}}).w||{}; return {A:A||{},B:B||{},C:C||{},PS:PS,W:W,M:(CACHE['M'+s]||{w:{}}).w||{},E:(CACHE['E'+s]||{w:{}}).w||{}}; }
  function manC(D,w){ var o=D.M[w]||{}, t=0; Object.keys(o).forEach(function(k){ t+=+o[k]||0; }); return t; }
  function effE(D,w){ var o=D.E[w]||{}, t=0; Object.keys(o).forEach(function(k){ t+=+o[k]||0; }); return t; }
  function effC(D,w){ var m=wkMonth(w), inv=Object.keys(D.C).some(function(x){ return D.C[x]>0&&wkMonth(x)===m; }); return inv?(D.C[w]||0):manC(D,w); }
  function invM(D,w){ var m=wkMonth(w); return Object.keys(D.C).some(function(x){ return D.C[x]>0&&wkMonth(x)===m; }); }
  function calc(sels){ var X=exo(), res={months:{},weeks:{},X:X}; X.months.forEach(function(m){ res.months[m]={b:0,d:0,w:0,c:0,e:0,x:0}; });
    sels.forEach(function(s){ var D=dataOf(s), hB=Object.keys(D.B).length>0; X.months.forEach(function(m){ res.months[m].b+=D.B[m]||0; });
      X.weeks.forEach(function(w){ var m=wkMonth(w), a=D.A[w]||[0,0,0], dd=a[0]+a[1]+a[2], ww=D.W[w]?D.W[w][0]:0, cc=effC(D,w), ee=effE(D,w), o=res.weeks[w]||(res.weeks[w]={d:0,w:0,c:0,e:0,s:0,n:0}); o.d+=dd; o.w+=ww||0; o.c+=cc; o.e+=ee; if(D.W[w]) o.s++; o.n++; res.months[m].d+=dd; res.months[m].w+=ww||0; res.months[m].c+=cc; res.months[m].e+=ee; if(hB) res.months[m].x+=dd+(ww||0)-cc+ee; }); }); return res; }
  var LL={}, AOK={};
  function okKey(i){ return i.dataset.c?'c|'+i.dataset.c+'|'+i.dataset.d:(i.dataset.e?'e|'+i.dataset.e+'|'+i.dataset.d:'w|'+i.dataset.w); }
  function kindOf(i){ return i.dataset.c?'c':(i.dataset.e?'e':'w'); }
  async function paint(box,sel,grp,noload){
    var L;
    if(noload&&LL[sel]) L=LL[sel]; else { box.innerHTML='<div class="ach"><div class="sub" style="color:#737372;margin:14px 0">Chargement des achats…</div></div>';
    L=await load(sel); LL[sel]=L; if(!document.body.contains(box)) return; }
    var sels=sel==='GROUPE'?STS:[sel], R=calc(sels), X=R.X, now=new Date(), cm=now.getFullYear()+'-'+pad(now.getMonth()+1), ci=X.months.indexOf(cm); if(ci<0) ci=0;
    var tb=0, td=0, tw=0, tc=0, te=0, bC=0, aC=0; X.months.forEach(function(m,i){ var o=R.months[m]; tb+=o.b; td+=o.d; tw+=o.w; tc+=o.c; te+=o.e; if(i<=ci){ bC+=(i===ci?o.b*now.getDate()/new Date(now.getFullYear(),now.getMonth()+1,0).getDate():o.b); aC+=o.x; } });
    var cur=R.months[X.months[ci]], curTot=cur.d+cur.w-cur.c+cur.e, pct=cur.b?100*curTot/cur.b:null;
    var dm=new Date(now.getFullYear(),now.getMonth()+1,0).getDate(), pt=100*now.getDate()/dm;
    var pastW=X.weeks.filter(function(w){ return pd(w)<=monOf(now); }), miss=0; if(sel!=='GROUPE'){ var D1=dataOf(sel); pastW.forEach(function(w){ if(!D1.W[w]) miss++; }); } else { sels.forEach(function(s){ var Dx=dataOf(s); pastW.forEach(function(w){ if(!Dx.W[w]) miss++; }); }); }
    var h='<div class="ach"><h3 style="margin-top:6px">🛒 Achats · exercice '+X.y+'-'+String(X.y+1).slice(2)+' · '+(sel==='GROUPE'?'Groupe':(LBL[sel]||sel))+'</h3>';
    h+=(function(){ var X0=CACHE.G||CACHE[sel]||{}, f=function(v){ return new Date(v).toLocaleString('fr-FR',{timeZone:'Europe/Paris',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}); }; var vieux=X0.scan&&(Date.now()-new Date(X0.scan).getTime())>2*864e5, c=!X0.scan?'#737372':(vieux?'#c0392b':'#1e7a34'); return '<div style="display:inline-block;margin:2px 0 10px;padding:7px 14px;border-radius:999px;border:1.5px solid '+c+';color:'+c+';font-size:14px;font-weight:700;background:#fff">📥 Dernier import DocuWare : '+(X0.scan?f(X0.scan)+(vieux?' · plus de 2 jours':''):'date non disponible (refaire un envoi)')+(X0.maj?' <span style="font-weight:500;color:#737372">· dernier envoi '+f(X0.maj)+'</span>':'')+'</div>'; })();
    h+='<div class="sub" style="color:#737372;font-size:13px;margin-bottom:8px">Achats de marchandises HT. Total = achats <b>directs</b> (DocuWare, automatique) + achats <b>Weldom</b> (saisis par semaine) − <b>cessions</b> (factures de cession achat, déduites). Une semaine compte pour le mois de son jeudi.</div>';
    if(grp){ h+='<div class="pills">'+['GROUPE'].concat(STS).map(function(s){ return '<button type="button" data-s="'+s+'" class="'+(s===sel?'on':'')+'">'+(s==='GROUPE'?'Groupe':LBL[s])+'</button>'; }).join('')+'</div>'; }
    if(!L.ok) h+='<div class="warn"><b>Achats directs non reçus.</b> Lance « Collecte automatique DocuWare » sur le PC pour les envoyer. Les budgets et les saisies Weldom restent affichés.</div>';
    if(L.miss.length) h+='<div class="warn">Saisie Weldom non lisible pour : '+L.miss.map(function(s){ return LBL[s]||s; }).join(', ')+' (mot de passe du magasin requis).</div>';
    h+='<div class="kp"><div class="k"><span>Budget de l\'exercice</span><b>'+eur(tb)+'</b><em>12 mois</em></div><div class="k"><span>Achats cumulés</span><b>'+eur(td+tw-tc+te)+'</b><em>directs '+eur(td)+' · Weldom '+eur(tw)+(tc?' · cessions sortie − '+eur(tc):'')+(te?' · cessions entrée + '+eur(te):'')+'</em></div>'+
      '<div class="k"><span>Budget cumulé à ce jour</span><b>'+eur(bC)+'</b><em>achats '+eur(aC)+'</em></div><div class="k"><span>Écart cumulé</span><b class="'+(aC-bC>0?'ko':'ok')+'">'+seur(aC-bC)+'</b><em>'+(bC?Math.round(100*aC/bC)+' % du budget cumulé':'')+(sel==='GROUPE'?' · magasins avec budget':'')+'</em></div></div>';
    if(cur.b){ h+='<div class="prg" style="margin-top:12px"><b>'+MN[ci]+' · '+Math.round(pct)+' % du budget du mois consommé</b> <span style="color:#737372;font-size:12.5px">(trait noir : '+Math.round(pt)+' % du mois écoulé)</span><div class="pb"><i style="width:'+Math.min(100,pct)+'%;background:'+(pct>pt+10?'#b21f2d':(pct>pt?'#e0a900':'#1e7a34'))+'"></i><u style="left:'+Math.min(100,pt)+'%"></u></div></div>'; }
    if(miss) h+='<div class="warn">⚠ '+miss+' semaine(s) passée(s) sans montant Weldom saisi : le total est sous-estimé tant qu\'elles ne sont pas remplies.</div>';
    h+='<details class="mm"><summary>Mois par mois (budget et achats cumulés sur l\'exercice)</summary><table><thead><tr><th>Mois</th><th>Budget</th><th>Directs</th><th>Weldom</th><th>Cessions sortie</th><th>Cessions entrée</th><th>Total</th><th>Écart</th><th>% budget</th></tr></thead><tbody>';
    X.months.forEach(function(m,i){ var o=R.months[m], t=o.d+o.w-o.c+o.e, e=t-o.b, fut=i>ci&&!t&&!o.c&&!o.e; var p=m.split('-'); h+='<tr class="'+(i===ci?'cur':(fut?'fut':''))+'"><td>'+MN[i]+' '+p[0].slice(2)+'</td><td>'+(o.b?eur(o.b):'—')+'</td><td>'+(fut?'–':eur(o.d))+'</td><td>'+(fut?'–':eur(o.w))+'</td><td>'+(fut?'–':(o.c?'− '+eur(o.c):'–'))+'</td><td>'+(fut?'–':(o.e?'+ '+eur(o.e):'–'))+'</td><td>'+(fut?'–':eur(t))+'</td><td class="'+(!fut&&o.b?(e>0?'ko':'ok'):'')+'">'+(fut||!o.b?'–':seur(e))+'</td><td>'+(fut||!o.b?'–':Math.round(100*t/o.b)+' %')+'</td></tr>'; });
    h+='</tbody><tfoot><tr><td>Cumul exercice</td><td>'+eur(tb)+'</td><td>'+eur(td)+'</td><td>'+eur(tw)+'</td><td>'+(tc?'− '+eur(tc):'–')+'</td><td>'+(te?'+ '+eur(te):'–')+'</td><td>'+eur(td+tw-tc+te)+'</td><td>–</td><td>'+(tb?Math.round(100*(td+tw-tc+te)/tb)+' %':'–')+'</td></tr></tfoot></table></details>';
    if(sel!=='GROUPE'||true){ var sw=sel==='GROUPE'?STS:[sel];
      h+='<div class="tab-s"><h3>Saisie des achats Weldom et des cessions par semaine (€ HT)</h3><div class="sub" style="color:#737372;font-size:13px;margin-bottom:6px">'+(sel==='GROUPE'?'Choisis un magasin ci-dessus pour saisir.':'Écris le total des achats Weldom de la semaine, puis appuie sur <b>Entrée</b> pour valider. <b>Cessions sortie</b> : montants cédés à chaque autre magasin (déduits de tes achats) ; dès que la facture de cession du mois arrive de DocuWare, elle remplace ta saisie du mois. <b>Cessions entrée</b> : montants reçus de chaque autre magasin (ajoutés à tes achats). Entrée pour valider.')+'</div>';
      if(sel!=='GROUPE'){ var D=dataOf(sel), canW=!!pwOf(sel);
        h+='<div class="wk"><table><thead><tr><th>Semaine du lundi</th><th>Mois</th><th>Directs (auto)</th><th>Weldom (à saisir)</th><th>Cessions sortie vers '+dests(sel).map(function(x){ return INI[x]; }).join('/')+' (à saisir)</th><th>Cessions entrée de '+dests(sel).map(function(x){ return INI[x]; }).join('/')+' (à saisir)</th><th>Total semaine</th></tr></thead><tbody>';
        var MT={}, FM=['octobre','novembre','décembre','janvier','février','mars','avril','mai','juin','juillet','août','septembre'], cmI=X.months.indexOf(wkMonth(iso(monOf(now))));
        X.weeks.forEach(function(w2){ var a2=D.A[w2]||[0,0,0], v2=D.W[w2]?D.W[w2][0]:'', i2=X.months.indexOf(wkMonth(w2)); MT[i2]=(MT[i2]||0)+a2[0]+a2[1]+a2[2]+(v2===''?0:v2)-effC(D,w2)+effE(D,w2); });
        X.weeks.forEach(function(w,wi){ var a=D.A[w]||[0,0,0], dd=a[0]+a[1]+a[2], cs=effC(D,w), es=effE(D,w), iv=invM(D,w), mo=D.M[w]||{}, me=D.E[w]||{}, v=D.W[w]?D.W[w][0]:'', fut=pd(w)>monOf(now), p=w.split('-'), im=X.months.indexOf(wkMonth(w));
          if(!wi||X.months.indexOf(wkMonth(X.weeks[wi-1]))!==im){ var pw=w.split('-'), th=new Date(+pw[0],+pw[1]-1,+pw[2]+3); h+='<tr class="mh'+(im===cmI?' cm':'')+'"><td colspan="7"><b>'+FM[im].charAt(0).toUpperCase()+FM[im].slice(1)+' '+th.getFullYear()+'</b> · total du mois <b>'+(MT[im]?eur(MT[im]):'–')+'</b></td></tr>'; }
          h+='<tr class="'+(iso(monOf(now))===w?'cur':(fut?'fut':''))+(im===cmI?' cm':'')+'"><td>'+p[2]+'/'+p[1]+'/'+p[0].slice(2)+'</td><td>'+MN[im]+'</td><td>'+(fut&&!dd?'–':eur(dd))+'</td><td>'+(canW?'<input class="w" type="text" inputmode="decimal" data-w="'+w+'" value="'+(v===''?'':String(v).replace('.',','))+'" placeholder="—">':eur(v===''?null:v))+'</td><td>'+(canW&&!fut?(iv?'<span style="color:#737372;font-size:12px">facture reçue'+(cs?' · − '+eur(cs):'')+'</span>':dests(sel).map(function(x){ var q=mo[x]; return '<input class="w c" type="text" inputmode="decimal" data-c="'+w+'" data-d="'+x+'" value="'+(q?String(q).replace('.',','):'')+'" placeholder="'+INI[x]+'" title="Cession vers '+(LBL[x]||x)+' (€ HT) · Entrée pour valider">'; }).join(' ')):(cs?'− '+eur(cs):'–'))+'</td><td>'+(canW&&!fut?dests(sel).map(function(x){ var q=me[x]; return '<input class="w c" type="text" inputmode="decimal" data-e="'+w+'" data-d="'+x+'" value="'+(q?String(q).replace('.',','):'')+'" placeholder="'+INI[x]+'" title="Cession reçue de '+(LBL[x]||x)+' (€ HT) · Entrée pour valider">'; }).join(' '):(es?'+ '+eur(es):'–'))+'</td><td>'+(fut&&!dd&&v===''&&!cs&&!es?'–':eur(dd+(v===''?0:v)-cs+es))+'</td></tr>'; });
        h+='</tbody></table></div>'; }
      else { h+='<table><thead><tr><th>Magasin</th><th>Budget cumulé</th><th>Achats cumulés</th><th>Écart</th><th>Semaines sans saisie</th></tr></thead><tbody>'; STS.forEach(function(s){ var Rs=calc([s]), b=0, a=0; X.months.forEach(function(m,i){ if(i<=ci){ b+=(i===ci?Rs.months[m].b*now.getDate()/new Date(now.getFullYear(),now.getMonth()+1,0).getDate():Rs.months[m].b); a+=Rs.months[m].d+Rs.months[m].w-Rs.months[m].c+Rs.months[m].e; } }); var Dx=dataOf(s), mm=0; pastW.forEach(function(w){ if(!Dx.W[w]) mm++; });
          h+='<tr><td><b style="color:'+COL[s]+'">'+LBL[s]+'</b></td><td>'+(b?eur(b):'—')+'</td><td>'+eur(a)+'</td><td class="'+(b?(a-b>0?'ko':'ok'):'')+'">'+(b?seur(a-b):'–')+'</td><td>'+mm+'</td></tr>'; }); h+='</tbody></table>'; } }
    h+='<div class="sub" style="color:#737372;font-size:12px;margin-top:10px">Directs : entrées marchandises et commandes des fournisseurs directs lues dans DocuWare (l\'entrée marchandise prime sur la commande ; les factures ne comptent pas). Weldom : saisie manuelle. Cessions : factures « Facture cession achat » lues dans DocuWare, rattachées au magasin vendeur. Budget : fichier budget_achats.json envoyé avec la collecte.'+'</div></div></div>';
    box.innerHTML=h;
    box.querySelectorAll('.pills button').forEach(function(b){ b.onclick=function(){ var t=b.dataset.s; if(t==='GROUPE'||pwOf(t)||!window.__ouvrirPriv) paint(box,t,grp); else window.__ouvrirPriv(t,box,function(){ if(!box.contains(document.activeElement)||document.activeElement.tagName!=='INPUT') paint(box,t,grp); }); }; });
    var sy=window.pageYOffset, wk0=box.querySelector('.wk'), wt=wk0?wk0.scrollTop:0; if(wk0) wk0.scrollTop=window.__achWT||0; if(window.__achSY!=null) window.scrollTo(0,window.__achSY);
    var parse=function(inp){ var txt=inp.value.replace(/\s/g,'').replace(',','.'), val=txt===''?null:parseFloat(txt); if(txt!==''&&(!isFinite(val)||val<0||val>1e8)) return undefined; return val; };
    var ins=Array.prototype.slice.call(box.querySelectorAll('input.w'));
    var cls=function(inp,x){ return 'w'+(kindOf(inp)!=='w'?' c':'')+(x?' '+x:''); };
    ins.forEach(function(inp,ix){ var ak=sel+'|'+okKey(inp); if(inp.value===''){ inp.className+=' emp'; inp.title='À renseigner'; } else if(AOK[ak]){ inp.className+=' sv'; inp.title='Validé'; }
      inp.oninput=function(){ delete AOK[ak]; inp.className=cls(inp,'dirty'); inp.title='Appuie sur Entrée pour valider'; };
      inp.onkeydown=async function(ev){ if(ev.key!=='Enter') return; ev.preventDefault(); var val=parse(inp); if(val===undefined){ inp.className=cls(inp,'er'); return; }
        var kind=kindOf(inp), w=inp.dataset[kind==='w'?'w':kind], pw=pwOf(sel), ts=Date.now(), same=ins.filter(function(q){ return kindOf(q)===kind; }), nx=same[same.indexOf(inp)+1], grpSel=kind==='w'?null:'input.w.c[data-'+kind+'="'+w+'"]';
        try{ var ok, row=null;
          if(kind!=='w'){ row={}; box.querySelectorAll(grpSel).forEach(function(q){ var vv=parse(q); if(vv) row[q.dataset.d]=vv; }); ok=await put((kind==='c'?ckKey:edKey)(sel,w),'achw'+sel,pw,{v:Object.keys(row).length?row:null,ts:ts},sel); }
          else ok=await put(wkKey(sel,w),'achw'+sel,pw,{v:val,ts:ts},sel);
          if(!ok) throw 0;
          if(kind!=='w'){ var ck=kind==='c'?'M':'E', c2=CACHE[ck+sel]||(CACHE[ck+sel]={w:{}}); c2.w=c2.w||{}; if(Object.keys(row).length) c2.w[w]=row; else delete c2.w[w]; }
          else { var cur2=CACHE['W'+sel]||(CACHE['W'+sel]={w:{}}); cur2.w=cur2.w||{}; if(val===null) delete cur2.w[w]; else cur2.w[w]=[val,ts]; }
          AOK[sel+'|'+okKey(inp)]=1; if(kind!=='w') box.querySelectorAll(grpSel).forEach(function(q){ AOK[sel+'|'+okKey(q)]=1; });
          var wk1=box.querySelector('.wk'); window.__achWT=wk1?wk1.scrollTop:0; window.__achSY=window.pageYOffset;
          var key2=nx?okKey(nx):null;
          await paint(box,sel,grp,true);
          if(key2){ var t=Array.prototype.slice.call(box.querySelectorAll('input.w')).filter(function(q){ return okKey(q)===key2; })[0]; if(t){ t.focus({preventScroll:true}); t.select(); } }
        }catch(e){ inp.className=cls(inp,'er'); inp.title='Enregistrement impossible : réessaie (Entrée).'; } }; });
    window.__achSY=null; window.__achWT=0;
  }

  /* ===== BUDGET du compte de résultat (exercice suivant), envoyé chiffré avec les achats ===== */
  var KEYL=['CA HT NET','Achats de marchandises','MARGE SUR VENTES','MARGE BRUTE GLOBALE','Total des charges externes','Charges de personnel','EXCEDENT BRUT D EXPLOITATION','RESULTAT COURANT AVANT IMPOT','RESULTAT NET'];
  function pc(v,d){ return v==null||isNaN(v)?'':v.toLocaleString('fr-FR',{minimumFractionDigits:d==null?2:d,maximumFractionDigits:d==null?2:d})+' %'; }
  function sg(v){ return v==null?'':(v>0?'+':(v<0?'−':''))+Math.abs(Math.round(v)).toLocaleString('fr-FR'); }
  function nb(v){ return v==null?'':Math.round(v).toLocaleString('fr-FR'); }
  function cap(l){ return l===l.toUpperCase()||/^(Total|Achats de march|Charges de personnel|Impôts|Autres produits$|Dotations)/.test(l); }
  var COSTRX=/^(Remise|Total remises|Achats|Coût|Coûts|Dotations|Imp[ôo]t|Charges|Autres [Cc]harges|Total des charges|[ÉE]nergies|Matières|Sous-trait|Loc\.|Location|Entretien|Maintenance|Assurances|Honoraires|Publicité|Transport|Déplacement|Téléphone|Services bancaires|Cotisations|Documentation|Gardiennage|Frais|Démarque)/;
  function fav(cost,e,ref){ if(e==null||Math.abs(e)<0.5) return ''; var good=cost?e<0:e>0; return good?'ok':'ko'; }
  function ptone(e,ref){ if(e==null||!ref) return ''; var p=100*e/Math.abs(ref); return p<0?'ko':(p<2?'or':'ok'); }
  async function crPaint(box,sel,grp){
    box.innerHTML='<div class="ach"><div class="sub" style="color:#737372;margin:14px 0">Chargement du budget…</div></div>';
    var D=null, G=null;
    if(grp){ var gp=window.__GRPPW||((((window.__DATA||{}).AUTO||{}).G)||null); G=await get('visite_achGROUPE','achGROUPE',gp,true); }
    else { D=await get('visite_ach'+sel,'ach'+sel,pwOf(sel),true); }
    if(!document.body.contains(box)) return;
    var h='<div class="ach"><h3 style="margin-top:6px">🎯 Budget · exercice 2026-27 · '+(grp?'Groupe':(LBL[sel]||sel))+'</h3>';
    if(!grp){
      var B=D&&D.BCR;
      if(!B||!B.rows){ box.innerHTML=h+'<div class="warn"><b>Budget non reçu pour ce magasin.</b> Il est envoyé avec « Collecte automatique DocuWare » (fichier budget_compte_resultat.json).</div></div>'; return; }
      var R=B.rows;
      h+='<div class="sub" style="color:#737372;font-size:13px;margin-bottom:8px">Budget de l\'exercice '+B.exercice+', comparé à l\'exercice précédent (N-1). Clique sur une ligne pour voir son détail.</div>';
      h+='<div class="kp">'+['CA HT NET','MARGE BRUTE GLOBALE','EXCEDENT BRUT D EXPLOITATION','RESULTAT NET'].map(function(k){ var r=R.filter(function(x){return x[0]===k;})[0]; if(!r) return ''; var nm={'CA HT NET':'CA HT net','MARGE BRUTE GLOBALE':'Marge brute globale','EXCEDENT BRUT D EXPLOITATION':'EBE','RESULTAT NET':'Résultat net'}[k]; return '<div class="k t-'+ptone(r[4],r[3])+'"><span>'+nm+'</span><b>'+eur(r[2])+'</b><em>'+(r[7]!=null?pc(r[7])+' du CA · ':'')+(r[4]!=null?sg(r[4])+' € vs N-1':'')+'</em></div>'; }).join('')+'</div>';
      h+='<h3>Compte d\'exploitation budgété</h3><div style="overflow:auto"><table class="bcr"><thead><tr><th>Poste</th><th>Budget</th><th>N-1</th><th>Écart €</th><th>Écart %</th><th>% CA bud.</th><th>% CA N-1</th></tr></thead><tbody>';
      var gi=0, parent=0, pcost=false;
      R.forEach(function(r){ if(r[2]==null&&r[3]==null) return; var lv=r[1]; if(lv===0){ parent=++gi; pcost=COSTRX.test(r[0]); } var bad=fav(pcost,r[4]);
        h+='<tr class="'+(lv?'sub s'+parent:'main'+(cap(r[0])?' cap':''))+'" '+(lv?'style="display:none"':'data-g="'+parent+'"')+'><td>'+(lv?'':'<i class="tg"></i>')+r[0]+'</td><td>'+nb(r[2])+'</td><td>'+nb(r[3])+'</td><td class="'+bad+'">'+sg(r[4])+'</td><td class="'+bad+'">'+(r[5]!=null?(r[5]>0?'+':'')+pc(r[5],1):'')+'</td><td>'+pc(r[7])+'</td><td>'+pc(r[8])+'</td></tr>'; });
      h+='</tbody></table></div><div class="sub" style="color:#737372;font-size:12px;margin-top:8px">Écart = budget moins N-1. Vert = favorable (plus de produits ou de marge, moins de charges), rouge = défavorable. Tuiles du haut : vert si la progression dépasse 2 %, orange si elle est faible (0 à 2 %), rouge si elle recule. Ratios assis sur le CA HT avant remises.</div></div>';
      box.innerHTML=h;
      box.querySelectorAll('tr.main').forEach(function(tr){ var g=tr.dataset.g; if(!box.querySelector('tr.s'+g)) { var i=tr.querySelector('.tg'); if(i) i.style.visibility='hidden'; return; } tr.style.cursor='pointer'; tr.onclick=function(){ var open=tr.classList.toggle('open'); box.querySelectorAll('tr.s'+g).forEach(function(x){ x.style.display=open?'':'none'; }); }; });
      return; }
    var S=G&&G.S?G.S:{}, have=STS.filter(function(s){ return S[s]&&S[s].CR&&S[s].CR.rows; });
    if(!have.length){ box.innerHTML=h+'<div class="warn"><b>Aucun budget reçu.</b> Lance « Collecte automatique DocuWare » avec le fichier budget_compte_resultat.json.</div></div>'; return; }
    h+='<div class="sub" style="color:#737372;font-size:13px;margin-bottom:8px">Budget de l\'exercice, lignes clés par magasin. Les magasins sans budget reçu s\'afficheront dès l\'envoi.</div><div style="overflow:auto"><table class="bcr"><thead><tr><th>Poste</th>'+STS.map(function(s){ return '<th style="border-top:5px solid '+COL[s]+'">'+LBL[s]+'</th>'; }).join('')+'<th style="border-top:5px solid #b21f2d">Total reçu</th></tr></thead><tbody>';
    KEYL.forEach(function(k){ var tot=0, any=false; h+='<tr class="main cap"><td>'+(k==='EXCEDENT BRUT D EXPLOITATION'?'EBE':k)+'</td>'+STS.map(function(s){ var c=S[s]&&S[s].CR&&S[s].CR.rows, r=c&&c.filter(function(x){return x[0]===k;})[0]; if(!r||r[2]==null) return '<td style="color:#9a9a98">–</td>'; tot+=r[2]; any=true; return '<td>'+nb(r[2])+'</td>'; }).join('')+'<td><b>'+(any?nb(tot):'–')+'</b></td></tr>'; });
    h+='</tbody></table></div></div>'; box.innerHTML=h; }
  window.__crBudget=function(box,sel,grp){ if(box) crPaint(box,grp?'GROUPE':sel,grp); };
  /* ===== ACHATS PAR RAYON : objectif (budget txt) vs réel (DocuWare classé par fournisseur->rayon), stock fin de mois, rotation ===== */
  var RAYCSS='.ray .tb{overflow:auto;border:1px solid #e4e4e1;border-radius:10px}.ray table{width:100%;border-collapse:collapse;font-size:13.5px;background:#fff}.ray th{background:#1d1d1b;color:#fff;text-align:right;padding:8px 9px;font-size:12px;position:sticky;top:0}.ray th:first-child,.ray td:first-child{text-align:left}.ray td{padding:7px 9px;border-bottom:1px solid #eee;text-align:right;white-space:nowrap}.ray tr.rw{cursor:pointer}.ray tr.rw:hover td{background:#f6f6f4}.ray tr.dt td{background:#fafaf8;color:#555;font-size:12.5px}.ray tr.dt td:first-child{padding-left:28px}.ray tfoot td{background:#1d1d1b;color:#fff;font-weight:700}.ray .ok{color:#1e7a34;font-weight:700}.ray .ko{color:#b21f2d;font-weight:700}.ray .or{color:#ec6707;font-weight:700}.ray .pills{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}.ray .pills button{padding:5px 12px;border-radius:999px;border:2px solid #d6d6d3;background:#fff;font:inherit;font-weight:700;font-size:13px;cursor:pointer}.ray .pills button.on{background:#1d1d1b;color:#fff;border-color:#1d1d1b}.ray .warn{background:#fff8ee;border:1px solid #e0a900;border-radius:10px;padding:8px 12px;margin:8px 0;font-size:13px}.ray h3{margin:18px 0 6px}.ray .tg{display:inline-block;width:0;height:0;border-left:6px solid #737372;border-top:4px solid transparent;border-bottom:4px solid transparent;margin-right:8px}.ray tr.open .tg{transform:rotate(90deg)}';
  var rst=document.createElement('style'); rst.textContent=RAYCSS; document.head.appendChild(rst);
  /* colonnes ajustées à la largeur de l'écran : texte qui revient à la ligne, tailles proportionnelles, cases de saisie souples */
  var rst2=document.createElement('style'); rst2.textContent='.ray .tb{overflow-x:auto}.ray table{table-layout:auto;font-size:clamp(10.5px,.92vw,13.5px)}.ray th{white-space:normal;line-height:1.15;vertical-align:bottom;padding:clamp(4px,.55vw,8px) clamp(3px,.5vw,9px);font-size:clamp(10px,.8vw,12px)}.ray td{padding:clamp(4px,.5vw,7px) clamp(3px,.5vw,9px);white-space:normal}.ray td:first-child{min-width:110px;max-width:240px}.ray td small{white-space:nowrap}.ray input.rw-in.emp{background:#fde8ec!important;border-color:#f2b8c4!important}.ray input.rw-in{width:100%!important;min-width:54px;max-width:100px;box-sizing:border-box;padding:4px 5px!important}@media (max-width:760px){.ray table{font-size:12px}.ray td{white-space:nowrap}.ray td:first-child{min-width:130px;white-space:normal}.ray th{white-space:nowrap}}'; document.head.appendChild(rst2);
  var RAYMI=null, RAYOPEN={}, RAYOK={};
  function rnrm(s){ return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,' ').trim(); }
  function resc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function rnum(v,d){ return v==null||isNaN(v)?'—':v.toLocaleString('fr-FR',{minimumFractionDigits:d||0,maximumFractionDigits:d||0}); }
  function reur(v){ return v==null||isNaN(v)?'—':Math.round(v).toLocaleString('fr-FR')+' €'; }
  function rse(v){ return v==null||isNaN(v)?'—':(v>0?'+ ':(v<0?'− ':''))+Math.abs(Math.round(v)).toLocaleString('fr-FR')+' €'; }
  function rtone(x,a){ if(x==null||a==null) return ''; var e=x-a; if(e<=0) return 'ok'; if(a>0&&e/a<=0.05) return 'or'; return 'ko'; }
  function rrot(j){ return (j==null||!isFinite(j)||j<=0)?'—':rnum(j,0)+' j <small style="color:#737372">('+rnum(365/j,2)+' tours/an)</small>'; }
  function rsum(arr,n){ var t=0,i; for(i=0;i<=n;i++) t+=(arr&&arr[i])||0; return t; }
  function rsKey(s,i){ return 'visite_achrs'+s+'Z'+'abcdefghijkl'.charAt(i); }
  async function saisLoad(s){ var p=pwOf(s), out=[],i; for(i=0;i<12;i++) out.push({}); if(!p) return out;
    await Promise.all([0,1,2,3,4,5,6,7,8,9,10,11].map(async function(i){ var r=await get(rsKey(s,i),'achs'+s,p,false); if(r&&r.v&&typeof r.v==='object') out[i]=r.v; })); return out; }
  /* stock réel repris de Booster : stock en valeur (PV TTC) par rayon à la fin du mois (période Booster qui se termine ce mois-là), converti en prix d'achat HT */
  function boStock(s,i){ var B=window.__GBASE; if(!B) return null; var y=i<3?2026:2027, mo=(i+9)%12, best=null;
    function pdt(str){ var d=(str||'').match(/\d\d\/\d\d\/\d\d/g)||[]; if(d.length<2) return null; var b=d[1].split('/'); return new Date(2000+ +b[2],+b[1]-1,+b[0]); }
    function cand(str,P){ var z=pdt(str); if(!z||z.getFullYear()!==y||z.getMonth()!==mo) return; var m=P&&P.mags&&P.mags[s]; if(!m||!m.rayons||!m.rayons.length) return; if(!best||z>best.z) best={z:z,r:m.rayons,tx:(m.tot&&m.tot.tx)}; }
    if(B.periodes) Object.keys(B.periodes).forEach(function(k){ cand(k,B.periodes[k]); });
    cand((B.mags&&B.mags[s]||{}).periode||'',B);
    if(!best) return null; var map={}, rmap={}, pmap={}; /* Booster = stock au prix de vente TTC : converti au prix d'achat HT (÷ 1,2 puis × (1 − taux de marge)) pour être comparable à l'objectif */ best.r.forEach(function(r){ if(!r||r.stock==null||!r.nom) return; if(r.ca_prog!=null) pmap[rnrm(r.nom)]=r.ca_prog; var tx=(r.tx!=null&&r.tx>0&&r.tx<100)?r.tx:((best.tx>0&&best.tx<100)?best.tx:null); if(tx==null) return; map[rnrm(r.nom)]=r.stock/1.2*(1-tx/100); if(r.rot!=null&&r.rot>0) rmap[rnrm(r.nom)]=r.rot; }); return {z:best.z,m:map,rt:rmap,pg:pmap}; }
  function boVal(s,i,nom){ var X=boStock(s,i); if(!X) return null; var k=rnrm(nom); if(X.m[k]!=null) return X.m[k]; var f=null; Object.keys(X.m).forEach(function(q){ if(f==null&&q&&k&&(q.indexOf(k)>=0||k.indexOf(q)>=0)) f=X.m[q]; }); return f; }
  function boRot(s,i,nom){ var X=boStock(s,i); if(!X||!X.rt) return null; var k=rnrm(nom); if(X.rt[k]!=null) return X.rt[k]; var f=null; Object.keys(X.rt).forEach(function(q){ if(f==null&&q&&k&&(q.indexOf(k)>=0||k.indexOf(q)>=0)) f=X.rt[q]; }); return f; }
  function boPg(s,i,nom){ var X=boStock(s,i); if(!X||!X.pg) return null; var k=rnrm(nom); if(X.pg[k]!=null) return X.pg[k]; var f=null; Object.keys(X.pg).forEach(function(q){ if(f==null&&q&&k&&(q.indexOf(k)>=0||k.indexOf(q)>=0)) f=X.pg[q]; }); return f; }
  function rowsOrd(D,mi){ D.ord=D.ord||{}; var o=D.ord[mi]; if(!o){ var sc=function(r){ var x=r.X&&r.X[mi], a=r.A[mi]; return (x!=null&&a>0)?(x-a)/a:-9; }; o=D.rows.map(function(r,i){ return {r:r,i:i,s:sc(r)}; }).sort(function(p,q){ return q.s-p.s||p.i-q.i; }).map(function(z){ return z.r; }); D.ord[mi]=o; } return o; }
  function nmOf(r){ return rnrm(r.n); }
  async function rayLoad(sel){
    var rows=[], maj='', nc=null, SS={};
    if(sel==='GROUPE'){
      var gp=window.__GRPPW||((((window.__DATA||{}).AUTO||{}).G)||null), g=await get('visite_achrGROUPE','achrGROUPE',gp,true); if(!g||!g.S) return null; maj=g.maj||'';
      var M={}, ord=[];
      STS.forEach(function(s){ var o=g.S[s]; if(!o) return;
        (o.R||[]).forEach(function(r){ var k=r[1]||rnrm(r[0]), m=M[k]; if(!m){ m=M[k]={n:r[0],c:r[1],S:[],A:[],T:[],Tn:[],X:null}; ord.push(k); }
          for(var i=0;i<12;i++){ if(r[2]&&r[2][i]!=null) m.S[i]=(m.S[i]||0)+r[2][i]; if(r[3]&&r[3][i]!=null) m.A[i]=(m.A[i]||0)+r[3][i]; if(r[4]&&r[4][i]!=null){ m.T[i]=(m.T[i]||0)+r[4][i]; m.Tn[i]=(m.Tn[i]||0)+1; } if(r[5]){ m.X=m.X||[]; m.X[i]=(m.X[i]||0)+(r[5][i]||0); } } });
        if(o.NC){ nc=nc||[]; for(var i=0;i<12;i++) nc[i]=(nc[i]||0)+(o.NC[i]||0); } });
      var stl=STS.filter(function(s){ return g.S[s]; }); await Promise.all(stl.map(async function(s){ SS[s]=await saisLoad(s); }));
      ord.forEach(function(k){ var m=M[k]; stl.forEach(function(s){ for(var i=0;i<12;i++){ var v=SS[s][i][rnrm(m.n)]; if(v!=null){ m.X=m.X||[]; m.X[i]=(m.X[i]||0)+v; m.sx=1; } var rt=boRot(s,i,m.n); if(rt!=null){ m.RT=m.RT||[]; m.RTn=m.RTn||[]; m.RT[i]=(m.RT[i]||0)+rt; m.RTn[i]=(m.RTn[i]||0)+1; } var w=SS[s][i]['s|'+rnrm(m.n)]; if(w!=null){ m.SX=m.SX||[]; m.SX[i]=(m.SX[i]||0)+w; } else { var bo=boVal(s,i,m.n); if(bo!=null){ m.SX=m.SX||[]; m.SX[i]=(m.SX[i]||0)+bo; m.sb=1; } } } }); });
      ord.forEach(function(k){ var m=M[k]; if(m.RT) m.RT=m.RT.map(function(v,i){ return v==null?null:v/(m.RTn[i]||1); }); m.T=m.T.map(function(v,i){ return v==null?null:v/(m.Tn[i]||1); }); rows.push(m); });
    } else {
      var o=await get('visite_achr'+sel,'achr'+sel,pwOf(sel),true); if(!o||!o.R) return null; maj=o.maj||''; nc=o.NC||null; SS[sel]=await saisLoad(sel);
      o.R.forEach(function(r){ var X=r[5]?r[5].slice():null, m={n:r[0],c:r[1],S:r[2]||[],A:r[3]||[],T:r[4]||[],X:X}; for(var i=0;i<12;i++){ var v=SS[sel][i][rnrm(r[0])]; if(v!=null){ m.X=m.X||[]; m.X[i]=v; } var w=SS[sel][i]['s|'+rnrm(r[0])]; var rt=boRot(sel,i,r[0]); if(rt!=null){ m.RT=m.RT||[]; m.RT[i]=rt; } var pg=boPg(sel,i,r[0]); if(pg!=null){ m.PG=m.PG||[]; m.PG[i]=pg; } if(w!=null){ m.SX=m.SX||[]; m.SX[i]=w; } else { var bo=boVal(sel,i,r[0]); if(bo!=null){ m.SX=m.SX||[]; m.SX[i]=bo; m.SB=m.SB||[]; m.SB[i]=1; } } } rows.push(m); });
    }
    return {rows:rows,maj:maj,nc:nc,sel:sel,sais:SS[sel]||null,hasX:true,edit:sel!=='GROUPE'};
  }
  function cessRows(D,mi){ var sels=D.sel==='GROUPE'?STS:[D.sel], R=calc(sels), X=R.X, m=X.months[mi], c=0,e=0,cc=0,ce=0; X.months.forEach(function(k,i){ var o=R.months[k]||{c:0,e:0}; if(i<=mi){ cc+=o.c||0; ce+=o.e||0; } if(i===mi){ c=o.c||0; e=o.e||0; } });
    var f=function(v){ return reur(Math.abs(v)); }, td=function(l,col,sg,v,cv){ return '<td colspan="2" style="font-weight:700;color:'+col+'">'+l+'</td><td style="font-weight:800;color:'+col+'">'+(v?sg+' '+f(v):'—')+'</td><td></td><td></td><td></td><td style="font-weight:800;color:'+col+'">'+(cv?sg+' '+f(cv):'—')+'</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>'; };
    return '<tr class="cs">'+td('Total cessions sortie (déduites)','#b21f2d','−',c,cc)+'</tr><tr class="cs">'+td('Total cessions entrée (ajoutées)','#1e7a34','+',e,ce)+'</tr>'; }
  function rayHtml(D,mi){
    var MNL=MN, h='<h3>🧱 Achats &amp; stock par rayon · objectif et réel</h3>';
    h+='<div class="pills">'+MNL.map(function(m,i){ return '<button data-rm="'+i+'" class="'+(i===mi?'on':'')+'">'+m+'</button>'; }).join('')+'</div>';
    if(D.edit) h+='<div class="sub" style="color:#737372;font-size:13px;margin:4px 0 8px">Saisis le <b>réel</b> du mois : achats HT du rayon (colonne « Achats réels (cessions incluses) »). Le <b>stock réel</b> est repris de tes imports Booster (fin de mois) : stock au prix de vente TTC converti en prix d\'achat HT (÷ 1,2 puis × (1 − taux de marge du rayon)), donc approximatif ; tu peux le corriger à la main. Tape le montant puis appuie sur <b>Entrée</b> : case rose = rien de renseigné, orange = pas encore validé, verte = enregistré.</div>';
    h+='<div class="tb"><table><thead><tr><th>Rayon</th><th>Objectif '+MNL[mi]+'</th><th>Achats réels<br>(cessions incluses)</th><th>Écart</th><th>% obj.</th><th>Objectif cumulé</th><th>Réel cumulé</th><th>Écart cumulé</th><th>Stock fin de mois (obj.)</th><th>Stock réel</th><th>Écart stock</th><th>Rotation (obj.)</th><th>Rotation réelle (Booster)</th><th>Prog. CA<br>vs N-1</th><th>Achats vs obj.<br>− prog. CA (pts)</th></tr></thead><tbody>';
    var tA=0,tX=0,cA=0,cX=0,tS=0,tSR=0;
    rowsOrd(D,mi).forEach(function(r){ var pgv=(r.PG&&r.PG[mi]!=null)?r.PG[mi]:null, am=null; var sr=(r.SX&&r.SX[mi]!=null)?r.SX[mi]:null, a=r.A[mi], xr=(r.X&&r.X[mi]!=null)?r.X[mi]:null, x=(D.edit||xr!=null)?(xr||0):null, ca=rsum(r.A,mi), cx=D.hasX?rsum(r.X,mi):null, k=(r.c||'')+'|'+rnrm(r.n), op=RAYOPEN[k];
      tA+=a||0; cA+=ca; if(D.hasX){ tX+=x; cX+=cx; } tS+=r.S[mi]||0; tSR+=sr||0;
      h+='<tr class="rw'+(op?' open':'')+'" data-rk="'+resc(k)+'"><td>'+resc((r.c?r.c+' · ':'')+r.n)+'</td><td>'+reur(a)+'</td><td>'+(D.edit?'<input class="rw-in" data-rn="'+resc(rnrm(r.n))+'" inputmode="decimal" value="'+(xr==null?'':Math.round(xr))+'" placeholder="€" style="width:100px;text-align:right;padding:4px 6px;border:1px solid #cfcfcb;border-radius:8px;font:inherit">':(x==null?'—':reur(x)))+'</td><td class="'+(x!=null?rtone(x,a):'')+'">'+(x!=null?rse(x-(a||0)):'—')+'</td><td>'+(x!=null&&a?Math.round(100*x/a)+' %':'—')+'</td><td>'+reur(ca)+'</td><td>'+(D.hasX?reur(cx):'—')+'</td><td class="'+(D.hasX?rtone(cx,ca):'')+'">'+(D.hasX?rse(cx-ca):'—')+'</td><td>'+reur(r.S[mi])+'</td><td>'+(D.edit?'<input class="rw-in" data-pf="s|" data-rn="'+resc(rnrm(r.n))+'" inputmode="decimal" value="'+((sr==null||(r.SB&&r.SB[mi]))?'':Math.round(sr))+'" placeholder="'+((r.SB&&r.SB[mi])?Math.round(sr)+' (Booster, ≈ achat HT)':'€')+'" style="width:100px;text-align:right;padding:4px 6px;border:1px solid #cfcfcb;border-radius:8px;font:inherit">':(sr==null?'—':reur(sr)+((r.sb)?' <small title="Repris de Booster : stock PV TTC converti en prix d\'achat HT (÷ 1,2 × (1 − taux de marge))">ᴮ</small>':'')))+'</td><td class="'+(sr!=null?rtone(sr,r.S[mi]):'')+'">'+(sr!=null?rse(sr-(r.S[mi]||0)):'—')+'</td><td>'+rnum(r.T[mi],2)+'</td><td>'+rrot(r.RT&&r.RT[mi])+'</td><td>'+(pgv==null?'—':(pgv>0?'+':'')+pgv.toFixed(1).replace('.',',')+' %')+'</td>'+(function(){ var xx=(r.X&&r.X[mi]!=null)?r.X[mi]:null, aa=r.A[mi]; if(pgv==null||xx==null||!(aa>0)) return '<td>—</td>'; var g=100*(xx/aa-1)-pgv; return '<td style="font-weight:800;color:'+(g<=0?'#1e7a34':(g<=5?'#b65807':'#b21f2d'))+'">'+(g>0?'+':'')+g.toFixed(1).replace('.',',')+' pts</td>'; })()+'</tr>';

    });
    var ncv=D.nc?D.nc[mi]||0:0, ncc=D.nc?rsum(D.nc,mi):0;
    if(D.hasX&&D.nc&&D.nc.some(function(v){ return v; })){ tX+=ncv; cX+=ncc; h+='<tr><td><i>Non classé (fournisseur sans rayon)</i></td><td>—</td><td>'+reur(ncv)+'</td><td>—</td><td>—</td><td>—</td><td>'+reur(ncc)+'</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td></tr>'; }
    h+='</tbody><tfoot><tr><td>Total</td><td>'+reur(tA)+'</td><td>'+(D.hasX?reur(tX):'—')+'</td><td>'+(D.hasX?rse(tX-tA):'—')+'</td><td>'+(D.hasX&&tA?Math.round(100*tX/tA)+' %':'—')+'</td><td>'+reur(cA)+'</td><td>'+(D.hasX?reur(cX):'—')+'</td><td>'+(D.hasX?rse(cX-cA):'—')+'</td><td>'+reur(tS)+'</td><td>'+reur(tSR)+'</td><td>'+rse(tSR-tS)+'</td><td></td><td></td><td></td><td></td></tr>'+cessRows(D,mi)+'</tfoot></table></div>';
    h+='<div class="sub" style="color:#737372;font-size:12px;margin-top:8px">Objectif = budget d\'achats HT par rayon. Réel = achats HT et stock fin de mois saisis dans l\'outil (chaque magasin renseigne les siens ; le Groupe additionne). Vert : sous l\'objectif · orange : jusqu\'à 5 % au-dessus · rouge : au-delà. Rayons classés du plus au moins en dépassement à l\'ouverture du mois (l\'ordre ne bouge pas pendant la saisie). Dernière colonne : écart entre la progression des achats (réel / objectif) et celle du CA vs N-1 (Booster) ; positif = les achats montent plus vite que les ventes. '+(D.maj?' · mis à jour le '+resc(String(D.maj).slice(0,10).split('-').reverse().join('/')):'')+'.</div>';
    return h;
  }
  var RAYC={};
  async function rayLoadC(sel){ var c=RAYC[sel]; if(c&&Date.now()-c.t<30000) return c.D; var D=await rayLoad(sel); if(D) RAYC[sel]={t:Date.now(),D:D}; return D; }
  window.__achWarm=function(){ try{ STS.forEach(function(s){ if(pwOf(s)) rayLoadC(s).catch(function(){}); }); }catch(e){} };
  async function rayPaint(div,sel){
    if(!div) return;
    div.innerHTML='<div class="ray"><div class="sub" style="color:#737372;margin:14px 0">Chargement des achats par rayon…</div></div>';
    var D=await rayLoadC(sel); if(!document.body.contains(div)) return;
    if(!D){ div.innerHTML='<div class="ray"><h3>🧱 Achats &amp; stock par rayon · objectif et réel</h3><div class="warn"><b>Pas encore reçu.</b> Lance <b>importer_achats_rayon.py</b> sur le PC (fichiers budget .txt dans le dossier budgets_rayon).</div></div>'; return; }
    var now=new Date(), mi=RAYMI!=null?RAYMI:((now.getMonth()+3)%12);
    function draw(){ div.innerHTML='<div class="ray">'+rayHtml(D,mi)+'</div>';
      div.querySelectorAll('[data-rm]').forEach(function(b){ b.onclick=function(){ mi=RAYMI=+b.dataset.rm; draw(); }; });
      div.querySelectorAll('input.rw-in').forEach(function(inp){ var okk=mi+'|'+(inp.dataset.pf||'')+inp.dataset.rn; if(inp.value===''){ inp.classList.add('emp'); inp.title='À renseigner'; } else if(RAYOK[okk]){ inp.style.borderColor='#1e7a34'; inp.style.background='#f1f8f3'; inp.title='Validé'; }
        inp.onclick=function(e){ e.stopPropagation(); };
        inp.oninput=function(){ delete RAYOK[okk]; inp.classList.remove('emp'); inp.style.borderColor='#e0a900'; inp.style.background='#fff8ee'; inp.title='Appuie sur Entrée pour valider'; };
        inp.onkeydown=async function(ev){ if(ev.key!=='Enter') return; ev.preventDefault(); var colL=Array.prototype.slice.call(div.querySelectorAll('input.rw-in')).filter(function(q){ return (q.dataset.pf||'')===(inp.dataset.pf||''); }), nx0=colL[colL.indexOf(inp)+1], nk=nx0?((nx0.dataset.pf||'')+nx0.dataset.rn):null, rn=(inp.dataset.pf||'')+inp.dataset.rn, fld=inp.dataset.pf?'SX':'X', txt=inp.value.replace(/[\s\u00a0€]/g,'').replace(',','.'), val=txt===''?null:parseFloat(txt);
          if(val!=null&&isNaN(val)){ inp.style.borderColor='#b21f2d'; inp.style.background='#fff0f0'; return; }
          var sel=D.sel, ok=false;
          try{ var p=pwOf(sel); delete RC[rsKey(sel,mi)]; var cur=await get(rsKey(sel,mi),'achs'+sel,p,false), v=(cur&&cur.v&&typeof cur.v==='object')?cur.v:{};
            if(val==null) delete v[rn]; else v[rn]=val;
            ok=await put(rsKey(sel,mi),'achs'+sel,p,{v:v,ts:Date.now()},sel); if(ok){ D.sais[mi]=v; } }catch(e){ ok=false; }
          if(!ok){ inp.style.borderColor='#b21f2d'; inp.style.background='#fff0f0'; inp.title='Enregistrement refusé ou impossible : réessaie (Entrée)'; return; }
          D.rows.forEach(function(r){ if((inp.dataset.pf||'')+rnrm(r.n)===rn){ r[fld]=r[fld]||[]; r[fld][mi]=val; } }); RAYOK[okk]=1; var y=window.scrollY; draw(); window.scrollTo(0,y); if(nk){ var tg=Array.prototype.slice.call(div.querySelectorAll('input.rw-in')).filter(function(q){ return (q.dataset.pf||'')+q.dataset.rn===nk&&(q.dataset.pf||'')===(inp.dataset.pf||''); })[0]; if(tg){ tg.focus({preventScroll:true}); tg.select(); } } }; });
      }
    draw();
    try{ load(sel).then(function(){ if(!document.body.contains(div)) return; var tf=div.querySelector('.ray tfoot'); if(tf){ tf.querySelectorAll('tr.cs').forEach(function(r){ r.remove(); }); tf.insertAdjacentHTML('beforeend',cessRows(D,mi)); } }); }catch(e){}
  }
  window.__achRayX=async function(sel){ var D=await rayLoadC(sel); return D?{rows:D.rows.map(function(r){ return {n:r.n,c:r.c,X:r.X}; }),nc:D.nc||null}:null; };
  function cmKey(s,i){ return 'visite_achm'+s+'Z'+'abcdefghijkl'.charAt(i); }
  window.__achCom={
    load:async function(s,i){ var p=pwOf(s); if(!p||i==null) return null; var r=await get(cmKey(s,i),'achm'+s,p,false); return (r&&r.v&&typeof r.v==='object')?r.v:{}; },
    save:async function(s,i,rn,txt){ var p=pwOf(s); if(!p) return false; delete RC[cmKey(s,i)]; var r=await get(cmKey(s,i),'achm'+s,p,false), v=(r&&r.v&&typeof r.v==='object')?r.v:{}; if(txt) v[rn]=txt; else delete v[rn]; return await put(cmKey(s,i),'achm'+s,p,{v:v,ts:Date.now()},s); } };
  window.__achRayon=function(div,sel){ rayPaint(div,sel); };
  window.__achPage=function(box,store,grp){ if(!box) return; paint(box,grp?'GROUPE':store,grp); };

  /* ===== Achats : onglets Pilotage / Saisie / Contrôles ===== */
  var ACHTAB='p', CTLR=null, PSN=0;
  function ctlTone(p){ return p<=0.01?'ok':(p<=0.03?'or':'ko'); }
  async function ctlCompute(sel){
    var D=await rayLoadC(sel); if(!D) return null; await load(sel);
    var sels=sel==='GROUPE'?STS:[sel], R=calc(sels), X=R.X, now=new Date(), mi=RAYMI!=null?RAYMI:((now.getMonth()+3)%12), mo=R.months[X.months[mi]]; if(!mo) return null;
    var tot=mo.d+mo.w-mo.c+mo.e, rows=D.rows, hasX=rows.some(function(r){ return r.X&&r.X[mi]!=null; }), sumX=0, sumA=0; rows.forEach(function(r){ sumX+=(r.X&&r.X[mi]!=null)?r.X[mi]:0; sumA+=r.A[mi]||0; });
    var ct=0; X.months.forEach(function(k,i){ if(i<=mi){ var o=R.months[k]; ct+=o.d+o.w-o.c+o.e; } }); var cx=0; rows.forEach(function(r){ cx+=r.X?rsum(r.X,mi):0; });
    var L=[], pc=function(a,b){ return Math.max(Math.abs(a),Math.abs(b))?Math.abs(a-b)/Math.max(Math.abs(a),Math.abs(b),1):0; };
    L.push(hasX?{k:1,st:ctlTone(pc(sumX,tot)),n:'1 · Total du mois',c:'Tableau mensuel ↔ somme des saisies par rayon',v:reur(tot)+' ↔ '+reur(sumX),e:rse(sumX-tot),go:'mm'}:{k:1,st:'na',n:'1 · Total du mois',c:'Aucune saisie par rayon ce mois',v:'—',e:'',go:'ray'});
    if(D.edit){ var sa=(D.sais&&D.sais[mi])||{}, mis=rows.filter(function(r){ return (r.A[mi]||0)>0&&sa[rnrm(r.n)]==null; }), nn=rows.filter(function(r){ return (r.A[mi]||0)>0; }).length;
      L.push({k:2,st:mis.length===0?'ok':(mis.length<=3?'or':'ko'),n:'2 · Saisies manquantes',c:'Rayons sans saisie réelle ce mois',v:(nn-mis.length)+' / '+nn+' rayons',e:mis.length?mis.length+' à saisir':'complet',cause:mis.slice(0,4).map(function(r){ return r.n; }).join(', ')+(mis.length>4?'…':''),go:'emp'}); }
    L.push(hasX?{k:3,st:ctlTone(pc(cx,ct)),n:'3 · Cumul exercice',c:'Octobre → mois choisi',v:reur(ct)+' ↔ '+reur(cx),e:rse(cx-ct),go:'mm'}:{k:3,st:'na',n:'3 · Cumul exercice',c:'Aucune saisie par rayon',v:'—',e:'',go:'ray'});
    var odd=rows.filter(function(r){ var x=r.X&&r.X[mi], a=r.A[mi]; return x!=null&&a>0&&(x<0.3*a||x>3*a); });
    L.push({k:4,st:odd.length?'or':'ok',n:'4 · Bon sens par rayon',c:'Saisie très éloignée de l\'objectif (moins de 30 % ou plus de 300 %)',v:odd.length?odd.length+' rayon(s)':'aucun',e:odd.length?'à vérifier':'cohérent',cause:odd.slice(0,4).map(function(r){ return r.n; }).join(', '),go:'row',rk:odd[0]?((odd[0].c||'')+'|'+rnrm(odd[0].n)):''});
    L.push({k:5,st:ctlTone(pc(mo.b,sumA)),n:'5 · Budget',c:'Budget mensuel ↔ somme des objectifs rayon',v:reur(mo.b)+' ↔ '+reur(sumA),e:rse(sumA-mo.b),go:'ray'});
    var ko=L.filter(function(l){ return l.st==='ko'; }).length, or=L.filter(function(l){ return l.st==='or'; }).length;
    return {L:L,ko:ko,or:or,mi:mi,nc:(D.nc&&D.nc[mi])||0};
  }
  function ctlCss(){ if(document.getElementById('achTabCss')) return; var st=document.createElement('style'); st.id='achTabCss';
    st.textContent='.atabs{display:flex;gap:8px;margin:6px 0 14px;border-bottom:2px solid #e4e4e1;flex-wrap:wrap}.atabs button{border:0;background:none;font:inherit;font-weight:800;font-size:14.5px;padding:10px 16px;cursor:pointer;color:#737372;border-bottom:3px solid transparent;margin-bottom:-2px;display:flex;align-items:center;gap:8px}.atabs button.on{color:#1d1d1b;border-bottom-color:#ec6707}.atabs .bd{display:inline-block;width:12px;height:12px;border-radius:50%}'+
    '#viewAchats[data-tab=p] .tab-s,#viewAchats[data-tab=p] #achctl,#viewAchats[data-tab=s] .kp,#viewAchats[data-tab=s] .prg,#viewAchats[data-tab=s] details.mm,#viewAchats[data-tab=s] #achray,#viewAchats[data-tab=s] #achctl,#viewAchats[data-tab=s] #achalert,#viewAchats[data-tab=c] .kp,#viewAchats[data-tab=c] .prg,#viewAchats[data-tab=c] details.mm,#viewAchats[data-tab=c] .tab-s,#viewAchats[data-tab=c] #achray,#viewAchats[data-tab=c] #achalert,#viewAchats[data-tab=c] #achbox .sub{display:none!important}'+
    '#achalert .al{display:flex;align-items:center;gap:10px;background:#fdecee;border:1px solid #b21f2d;border-radius:10px;padding:9px 14px;margin-bottom:12px;font-size:13.5px;cursor:pointer}#achalert .al.or{background:#fff3e6;border-color:#ec6707}#achalert .al.ok{background:#eef8f0;border-color:#1e7a34}'+
    '.ac-ctl{background:#fff;border:1px solid #e4e4e1;border-radius:14px;padding:12px 16px;margin-bottom:14px}.ac-ctl .hd{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:8px}.ac-ctl .gl{margin-left:auto;font-weight:800}.ac-row{display:grid;grid-template-columns:18px 1.6fr 1.3fr .8fr;gap:10px;align-items:center;padding:10px 4px;border-top:1px solid #eee;cursor:pointer}.ac-row:hover{background:#faf8f3}.ac-row .dt{width:14px;height:14px;border-radius:50%}.ac-row .c{color:#737372;font-size:12.5px;display:block}.ac-row .cs{color:#b65807;font-size:12.5px;display:block}.ac-row .e{text-align:right;font-weight:800}'+
    '.t-ok{color:#1e7a34}.t-or{color:#b65807}.t-ko{color:#b21f2d}.t-na{color:#737372}.d-ok{background:#1e7a34}.d-or{background:#ec6707}.d-ko{background:#b21f2d}.d-na{background:#a3a3a1}'+
    '#viewAchats details.mm{margin-top:12px;border:1px solid #e4e4e1;border-radius:10px;background:#fff}#viewAchats details.mm>summary{padding:11px 14px;font-weight:800;cursor:pointer}#viewAchats details.mm>table{margin:0}'+
    '#achps{display:none}#viewAchats[data-tab=z] #achps{display:block}#viewAchats[data-tab=z] #achbox,#viewAchats[data-tab=z] #achray,#viewAchats[data-tab=z] #achctl,#viewAchats[data-tab=z] #achalert{display:none!important}'+
    '.ps-w{background:#fff;border:1px solid #e4e4e1;border-radius:14px;padding:12px 16px;margin-bottom:14px;overflow-x:auto}.ps-w h3{margin:0 0 4px}.ps-w small{color:#737372}.ps{width:100%;border-collapse:collapse;margin-top:10px;font-size:14px}.ps thead th{background:#1d1d1b;color:#fff;text-align:left;padding:10px 12px;font-weight:800;white-space:nowrap}.ps td{padding:9px 12px;border-top:1px solid #eee;text-align:left}.ps td.n{text-align:right;font-weight:800;white-space:nowrap}.ps tfoot td{background:#f4f2ec;font-weight:800;white-space:nowrap}.ps tr.pm td{background:#f4f2ec;border-top:2px solid #d9d6cd;padding:8px 12px;font-size:13.5px}.ps tr.pm b{font-weight:800}.ps-e{background:#fff8ee;border:1.5px solid #ec6707;border-radius:12px;padding:12px 16px;font-size:13.5px}'+
    '#topwrap[data-st=Hesingue] .ps thead th{box-shadow:inset 0 4px 0 #1e7a34}#topwrap[data-st=Sierentz] .ps thead th{box-shadow:inset 0 4px 0 #e0a900}#topwrap[data-st=Waldighoffen] .ps thead th{box-shadow:inset 0 4px 0 #1d5fa8}#topwrap[data-st=Mulhouse] .ps thead th{box-shadow:inset 0 4px 0 #7b3fa0}#topwrap[data-st=GROUPE] .ps thead th{box-shadow:inset 0 4px 0 #b21f2d}'+
    '@media(max-width:700px){.ac-row{grid-template-columns:16px 1fr}.ac-row .e{text-align:left}}';
    document.head.appendChild(st); }
  function setTab(root,t){ ACHTAB=t; root.setAttribute('data-tab',t); root.querySelectorAll('#achtabs button').forEach(function(b){ b.classList.toggle('on',b.dataset.t===t); }); }
  async function waitItems(sel,mi){
    var it=[], sels=sel==='GROUPE'?STS:[sel], now=new Date(), L=null; try{ L=await load(sel); }catch(e){}
    var X0=CACHE.G||CACHE[sel]||{}, old=X0.scan&&(Date.now()-new Date(X0.scan).getTime())>2*864e5;
    if(L&&L.ok===false) it.push('Achats directs DocuWare non reçus : lancer « Collecte automatique DocuWare » sur le PC');
    else if(!X0.scan) it.push('Import DocuWare : date du dernier envoi inconnue (refaire un envoi)');
    else if(old) it.push('Import DocuWare : dernier envoi le '+new Date(X0.scan).toLocaleDateString('fr-FR')+', plus de 2 jours');
    var X=exo(), pastW=X.weeks.filter(function(w){ return pd(w)<=monOf(now); }), miss=[];
    sels.forEach(function(st){ var D=dataOf(st), n=0; pastW.forEach(function(w){ if(!D.W[w]) n++; }); if(n) miss.push((sel==='GROUPE'?(LBL[st]||st)+' : ':'')+n+' semaine'+(n>1?'s':'')); });
    if(miss.length) it.push('Saisie Weldom manquante : '+miss.join(' · '));
    if(sel!=='GROUPE'){ try{ if(boStock(sel,mi)==null) it.push('Booster : période de '+MN[mi]+' non importée (stock réel, rotation et progression du CA)'); }catch(e){} }
    return it; }
  function psPaint(root,sel){ var el=root.querySelector('#achps'); if(!el) return 0; var sels=sel==='GROUPE'?STS:[sel], rows=[], has=false;
    sels.forEach(function(s){ var D=dataOf(s); if(D.PS){ has=true; D.PS.forEach(function(r){ rows.push({s:s,f:r[0],v:+r[1]||0,d:r[2]||''}); }); } });
    if(!has){ el.innerHTML='<div class="ps-e"><b>Pré-saison : données pas encore reçues.</b> Relancer l\'envoi Achats sur le PC (achats_push.py).</div>'; return 0; }
    rows.sort(function(a,b){ return a.d<b.d?-1:a.d>b.d?1:(a.f<b.f?-1:1); });
    var tot=rows.reduce(function(t,r){ return t+r.v; },0), g=sel==='GROUPE', fd=function(d){ var x=d&&d.split('-'); return x&&x.length===3?x[2]+'/'+x[1]+'/'+x[0]:d; };
    el.innerHTML='<div class="ps-w"><h3>🌱 Commandes pré-saison</h3><small>Livraison prévue à plus de 2 mois : ces commandes ne sont pas comptées dans les semaines. '+(g?'Les 4 magasins.':LBL[sel]||sel)+'</small>'+
      (rows.length?'<table class="ps"><thead><tr>'+(g?'<th>Magasin</th>':'')+'<th>Fournisseur</th><th style="text-align:right">Total HT</th><th>Date de livraison</th></tr></thead><tbody>'+(function(){ var MF=['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'], by={}, ks=[]; rows.forEach(function(r){ var k=(r.d||'').slice(0,7); if(!by[k]){ by[k]=[]; ks.push(k); } by[k].push(r); }); return ks.map(function(k){ var R=by[k], t=R.reduce(function(a2,r){ return a2+r.v; },0), y=k.split('-'), nm=y.length===2?MF[+y[1]-1]+' '+y[0]:'Date inconnue'; nm=nm.charAt(0).toUpperCase()+nm.slice(1); return '<tr class="pm"><td colspan="'+(g?4:3)+'"><b>'+nm+'</b> · '+R.length+' ligne'+(R.length>1?'s':'')+' · <b>'+reur(t)+'</b>'+(function(){ var f={}; R.forEach(function(r){ f[r.f]=(f[r.f]||0)+r.v; }); var ks2=Object.keys(f); if(ks2.length<2) return ''; ks2.sort(function(a3,b3){ return f[b3]-f[a3]; }); return ' · <span style="color:#737372">plus gros : <b style="color:#1d1d1b">'+resc(ks2[0])+'</b> '+reur(f[ks2[0]])+' ('+Math.round(100*f[ks2[0]]/t)+' %)</span>'; })()+'</td></tr>'+R.map(function(r){ return '<tr>'+(g?'<td>'+resc(LBL[r.s]||r.s)+'</td>':'')+'<td>'+resc(r.f)+'</td><td class="n">'+reur(r.v)+'</td><td>'+fd(r.d)+'</td></tr>'; }).join(''); }).join(''); })()+'</tbody><tfoot><tr><td'+(g?' colspan="2"':'')+'>Total pré-saison · '+rows.length+' ligne'+(rows.length>1?'s':'')+'</td><td class="n">'+reur(tot)+'</td><td></td></tr></tfoot></table>':'<div style="margin-top:10px;color:#737372">Aucune commande pré-saison.</div>')+'</div>';
    return rows.length; }
  function ctlInit(root,sel){
    ctlCss(); setTab(root,ACHTAB); var tb=root.querySelector('#achtabs'), al=root.querySelector('#achalert'), cx=root.querySelector('#achctl');
    function bar(){ var bd=CTLR?'<span class="bd d-'+(CTLR.ko?'ko':(CTLR.or?'or':'ok'))+'"></span>':''; tb.innerHTML='<div class="atabs"><button type="button" data-t="p">Pilotage</button><button type="button" data-t="s">Saisie</button><button type="button" data-t="c">Contrôles'+bd+'</button><button type="button" data-t="z">Pré-saison'+(PSN?' <span style="background:#ec6707;color:#fff;border-radius:999px;padding:1px 8px;font-size:12px">'+PSN+'</span>':'')+'</button></div>'; tb.querySelectorAll('button').forEach(function(b){ b.onclick=function(){ setTab(root,b.dataset.t); window.scrollTo(0,0); }; }); setTab(root,ACHTAB); }
    bar();
    function pick(l){ var go=l.go;
      if(go==='mm'){ setTab(root,'p'); var d=root.querySelector('details.mm'); if(d){ d.open=true; d.scrollIntoView({block:'center'}); } }
      else if(go==='emp'){ setTab(root,'p'); var q=root.querySelector('input.rw-in.emp'); if(q){ q.scrollIntoView({block:'center'}); q.focus({preventScroll:true}); } }
      else if(go==='row'){ setTab(root,'p'); var rr=l.rk&&[].find.call(root.querySelectorAll('tr.rw'),function(t){ return t.dataset.rk===l.rk; }); if(rr){ rr.scrollIntoView({block:'center'}); rr.style.outline='3px solid #ec6707'; setTimeout(function(){ rr.style.outline=''; },2200); } }
      else { setTab(root,'p'); var rt=root.querySelector('#achray'); if(rt) rt.scrollIntoView({block:'start'}); } }
    async function refresh(){ if(!document.body.contains(root)) return; var r; try{ r=await ctlCompute(sel); }catch(e){ r=null; } if(!r||!document.body.contains(root)) return; CTLR=r; try{ PSN=psPaint(root,sel); }catch(e){ PSN=0; } bar();
      try{ var wi=await waitItems(sel,r.mi), wd=root.querySelector('#achwait'); if(wd) wd.innerHTML=wi.length?'<div style="display:flex;gap:12px;align-items:flex-start;background:#fff8ee;border:1.5px solid #ec6707;border-radius:12px;padding:10px 16px;margin:4px 0 12px;font-size:13.5px"><span style="background:#ec6707;color:#fff;border-radius:999px;padding:2px 10px;font-weight:800;white-space:nowrap">'+wi.length+' donnée'+(wi.length>1?'s':'')+' en attente</span><div><b style="color:#b65807">Sans elle'+(wi.length>1?'s':'')+', cette page n\'est pas complète :</b><ul style="margin:4px 0 0 18px;padding:0">'+wi.map(function(x){ return '<li style="margin:2px 0">'+resc(x)+'</li>'; }).join('')+'</ul></div></div>':''; }catch(e){}
      var gl=r.ko?'● '+r.ko+' écart'+(r.ko>1?'s':'')+' à corriger'+(r.or?' · '+r.or+' à surveiller':''):(r.or?'● '+r.or+' à surveiller':'● Tout est cohérent');
      var gc=r.ko?'ko':(r.or?'or':'ok');
      al.innerHTML='<div class="al '+gc+'"><span class="bd d-'+gc+'" style="display:inline-block;width:12px;height:12px;border-radius:50%"></span><div><b class="t-'+gc+'">Contrôles '+MN[r.mi]+' : '+gl.replace('● ','')+'</b> · <u>voir l\'onglet Contrôles</u></div></div>'; al.firstChild.onclick=function(){ setTab(root,'c'); window.scrollTo(0,0); };
      cx.innerHTML='<div class="ac-ctl"><div class="hd"><b>🔎 Points de contrôle · '+MN[r.mi]+'</b><small style="color:#737372">mois choisi dans la table par rayon</small><span class="gl t-'+gc+'">'+gl+'</span></div>'+r.L.map(function(l,i){ return '<div class="ac-row" data-i="'+i+'"><span class="dt d-'+l.st+'"></span><div><b>'+l.n+'</b><span class="c">'+l.c+'</span>'+(l.cause?'<span class="cs">'+resc(l.cause)+'</span>':'')+'</div><div>'+l.v+'</div><div class="e t-'+l.st+'">'+(l.e||'')+'</div></div>'; }).join('')+'<div class="sub" style="color:#737372;font-size:12px;margin-top:8px">Clique une ligne pour aller à l\'endroit à corriger.'+(r.nc?' « Non classé » ('+reur(r.nc)+') est affiché à part, hors comparaison.':'')+'</div></div>';
      cx.querySelectorAll('.ac-row').forEach(function(e){ e.onclick=function(){ pick(r.L[+e.dataset.i]); }; }); }
    var tm=null, sched=function(){ clearTimeout(tm); tm=setTimeout(refresh,700); };
    var mo=new MutationObserver(function(m){ if(m.every(function(x){ return cx.contains(x.target)||al.contains(x.target)||tb.contains(x.target); })) return; sched(); });
    ['#achray','#achbox'].forEach(function(q){ var e=root.querySelector(q); if(e) mo.observe(e,{childList:true,subtree:true}); });
    sched();
  }
  window.__achRender=function(sel){
    var root=document.getElementById('viewAchats'); if(!root) return;
    root.innerHTML='<div class="c-wrap"><div id="achwait"></div><div id="achtabs"></div><div id="achalert"></div><div id="achbox"></div><div id="achctl"></div><div id="achps"></div><div id="achray"></div></div>'; rayPaint(root.querySelector('#achray'),sel==='GROUPE'?'GROUPE':sel); ctlInit(root,sel);
    var box=root.querySelector('#achbox'), keep=function(){ return box.contains(document.activeElement)&&document.activeElement.tagName==='INPUT'; };
    if(sel==='GROUPE'){
      if(window.__GRPU||!window.__grpBind||!window.__grpHtml) paint(box,'GROUPE',true);
      else { box.innerHTML=window.__grpHtml; window.__grpBind(box,function(){ if(!keep()) paint(box,'GROUPE',true); }); }
    } else if(window.__ouvrirPriv) window.__ouvrirPriv(sel,box,function(){ if(!keep()) paint(box,sel,false); });
    else paint(box,sel,false);
  };
})();

window.__fgInfo={};
async function fgKey(name,pw){ var enc=new TextEncoder(); var km=await crypto.subtle.importKey('raw',enc.encode(pw),'PBKDF2',false,['deriveKey']); return crypto.subtle.deriveKey({name:'PBKDF2',salt:enc.encode('fg-sync-'+name),iterations:200000,hash:'SHA-256'},km,{name:'AES-GCM',length:256},false,['decrypt']); }
window.__fgPNLoad=async function(pw){ var url=window.__SYNC_URL||''; if(!url||!pw) return; var j; try{ j=JSON.parse(await (await fetch(url+'?k=visite_fgPN&_='+Date.now())).text()); }catch(e){ return; } if(!j||!j.v) return; var all=Uint8Array.from(atob(j.v),function(c){return c.charCodeAt(0);}); var km=await crypto.subtle.importKey('raw',new TextEncoder().encode(pw),'PBKDF2',false,['deriveKey']); var k=await crypto.subtle.deriveKey({name:'PBKDF2',salt:all.slice(0,16),iterations:600000,hash:'SHA-256'},km,{name:'AES-GCM',length:256},false,['decrypt']); var pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:all.slice(16,28)},k,all.slice(28)); window.__fgPN=JSON.parse(new TextDecoder().decode(pt)); };
async function fgFetch(name,pw){ window.__fgErr=''; var url=window.__SYNC_URL||''; if(!url){ window.__fgErr='adresse de synchronisation absente'; return null; } if(!pw){ window.__fgErr='mot de passe absent'; return null; } var txt; try{ var r=await fetch(url+'?k='+encodeURIComponent('visite_fg'+name)+'&_='+Date.now()); txt=await r.text(); }catch(e){ window.__fgErr='réseau / accès refusé au service ('+(e&&e.message||e)+')'; return null; } var j; try{ j=JSON.parse(txt); }catch(e){ window.__fgErr='réponse inattendue du service (pas de JSON) : '+txt.slice(0,60).replace(/\s+/g,' '); return null; } if(!j||!j.v){ window.__fgErr='clé visite_fg'+name+' absente dans la feuille (envoi non reçu ou autre nom)'+(j&&j.error?' – '+j.error:''); return null; } try{ var all=Uint8Array.from(atob(j.v),function(c){return c.charCodeAt(0);}); var pt; pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:all.slice(0,12)},await fgKey(name,pw),all.slice(12)); var st=new Response(new Blob([pt]).stream().pipeThrough(new DecompressionStream('deflate-raw'))); var oo=JSON.parse(await st.text()); return oo; }catch(e){ window.__fgErr='déchiffrement impossible (mot de passe différent de celui du fichier fg_push_config.json ?)'; return null; } }
window.__CPT=window.__CPT||{}; window.__CPTD=window.__CPTD||{};
/* compte de résultat envoyé automatiquement (PDF du reporting) : remplace celui du fichier s'il existe. Retourne true si une donnée a été reçue. */
async function cptWarm(name,pw){ if(!pw||!window.__SYNC_URL||name==='Creation') return false; if(window.__CPTD[name]) return window.__CPTD[name]===2; window.__CPTD[name]=1;
  try{ var r=await fetch(window.__SYNC_URL+'?k='+encodeURIComponent('visite_cpt'+name)+'&_='+Date.now()), j=JSON.parse(await r.text()); if(!j||!j.v){ window.__CPTD[name]=3; return false; }
    var all=Uint8Array.from(atob(j.v),function(c){return c.charCodeAt(0);}), pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:all.slice(0,12)},await fgKey('cpt'+name,pw),all.slice(12)), st=new Response(new Blob([pt]).stream().pipeThrough(new DecompressionStream('deflate-raw'))), oo=JSON.parse(await st.text());
    if(!oo||!oo.COMPTA||!oo.COMPTA.rows){ window.__CPTD[name]=3; return false; }
    window.__CPT[name]=oo.COMPTA; window.__CPTD[name]=2; if(UNL[name]) UNL[name].COMPTA=oo.COMPTA; if(window.__GRPU&&window.__GRPU[name]) window.__GRPU[name].COMPTA=oo.COMPTA; return true; }catch(e){ window.__CPTD[name]=3; return false; } }
window.__fgReloadAll=async function(){ var n=0,err='',old=JSON.stringify(window.__fgInfo||{}); var ks=Object.keys(UNL); for(var i=0;i<ks.length;i++){ var k=ks[i]; try{ var d=await fgFetch(k,UNLPW[k]); if(d&&d.FG){ UNL[k].FG=d.FG; window.__fgInfo[k]=d.maj; window.__fgInfo[k+'_d']=d.der; n++; } }catch(e){} } if(window.__GRPU&&window.__GRPPW){ try{ var g=await fgFetch('GROUPE',window.__GRPPW); if(g&&g.S){ Object.keys(g.S).forEach(function(q){ (window.__GRPU[q]=window.__GRPU[q]||{}).FG=g.S[q]; }); window.__fgInfo.GROUPE=g.maj; window.__fgInfo.GROUPE_d=g.der; n++; } }catch(e){} } if(!n) return {ok:false,msg:'Rien reçu : '+(window.__fgErr||'données absentes')+'. Lance « Collecte automatique DocuWare » sur le PC et réponds o à l\'envoi.'}; var g2=(window.__fgInfo||{}).GROUPE||(window.__fgInfo||{}).Hesingue, fd=g2?new Date(g2).toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):''; return {ok:true,msg:(old===JSON.stringify(window.__fgInfo||{}))?'✓ Déjà à jour : aucun nouvel envoi depuis le '+fd+'.':'✓ Nouvelles données reçues (envoi du '+fd+').'}; };
window.__grpHtml='<div class="sub gwait" style="text-align:center;margin:18vh 0">Ouverture…<div class="gerr" style="color:#b21f2d;margin-top:8px"></div></div>';
window.__grpBind=function(c,cb){ var ag=((window.__DATA||{}).AUTO||{}).G; var er=function(m){ var e=c.querySelector('.gerr'); if(e) e.textContent=m; }; if(!ag){ er('Session expirée : recharge la page et reconnecte-toi.'); return; } decPriv((window.__DATA||{}).GRPW,ag).then(function(o){ window.__GRPU=o; window.__GRPPW=ag; cb(); fgFetch('GROUPE',ag).then(function(d){ if(d&&d.S){ Object.keys(d.S).forEach(function(k){ (o[k]=o[k]||{}).FG=d.S[k]; }); window.__fgInfo.GROUPE=d.maj; window.__fgInfo.GROUPE_d=d.der; if(c.offsetParent!==null||document.getElementById('viewCompta').offsetParent!==null) cb(); } }); },function(){ er('Données groupe illisibles avec le mot de passe général. Contacte l\'administrateur.'); }); };

window.__fgx=function(){ return '<div class="g-nodata" style="margin-top:12px"><b>Données en attente</b> : export DocuWare des factures de frais généraux (mois, poste, fournisseur, montant HT, par magasin). Cette vue présentera ensuite chaque magasin et le groupe consolidé, sur le modèle du carburant.</div>'; };
async function decPriv(b,pw){
  var enc=new TextEncoder(), un=function(x){return Uint8Array.from(atob(x),function(c){return c.charCodeAt(0);});};
  var km=await crypto.subtle.importKey('raw',enc.encode(pw),'PBKDF2',false,['deriveKey']);
  var k=await crypto.subtle.deriveKey({name:'PBKDF2',salt:un(b.salt),iterations:b.iterations,hash:'SHA-256'},km,{name:'AES-GCM',length:256},false,['decrypt']);
  var pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:un(b.iv)},k,un(b.data));
  return JSON.parse(new TextDecoder().decode(pt));
}
function ouvrirPriv(store0,root,cb){
  var store=store0; if(UNL[store]) return cb(); var SN=(store==='Creation'?'Baeumlin Création':store);
  if(!PRIV[store]){ root.innerHTML='<div class="g-nodata"><b>Pas de données pour '+SN+'.</b><br>Envoie les documents de ce magasin pour les ajouter.</div>'; return; }
  var ok=function(o,pw){ UNL[store]=o; UNLPW[store]=pw; if(window.__CPT&&window.__CPT[store]) o.COMPTA=window.__CPT[store]; window.__CONTACTS=window.__CONTACTS||{}; window.__CONTACTS[store]=o.CONTACTS||[]; if(o.ME) window.__ME=o.ME; cb(); cptWarm(store,pw).then(function(ch){ if(ch&&root.offsetParent!==null) cb(); }); fgFetch(store,pw).then(function(d){ if(d&&d.FG){ o.FG=d.FG; window.__fgInfo[store]=d.maj; window.__fgInfo[store+'_d']=d.der; if(root.offsetParent!==null) cb(); } }); };
  var manual=function(){ root.innerHTML='<div class="g-nodata"><b>Données de '+SN+' illisibles.</b><br>Le mot de passe général ne les ouvre pas : contacte l\'administrateur.</div>'; };
  var ap=(((window.__DATA||{}).AUTO||{}).S||{})[store];
  if(ap){ root.innerHTML='<div class="sub" style="text-align:center;margin:18vh 0">Ouverture de '+SN+'…</div>'; decPriv(PRIV[store],ap).then(function(o){ ok(o,ap); },manual); }
  else manual();
}
window.__bgRefresh=async function(){ try{ var A=(window.__DATA||{}).AUTO; if(!A||!A.S) return; window.__fgInfo=window.__fgInfo||{};
  var ks=Object.keys(PRIV);
  var one=async function(k){ try{ var pw=A.S[k]; if(!pw) return; var o=UNL[k];
      if(!o){ o=await decPriv(PRIV[k],pw); if(!UNL[k]){ UNL[k]=o; UNLPW[k]=pw; if(window.__CPT&&window.__CPT[k]) o.COMPTA=window.__CPT[k]; window.__CONTACTS=window.__CONTACTS||{}; window.__CONTACTS[k]=o.CONTACTS||[]; if(o.ME&&!window.__ME) window.__ME=o.ME; } else o=UNL[k]; }
      var d=await fgFetch(k,pw); if(d&&d.FG){ o.FG=d.FG; window.__fgInfo[k]=d.maj; window.__fgInfo[k+'_d']=d.der; } try{ await cptWarm(k,pw); }catch(e2){} }catch(e){} };
  var grp=async function(){ if(A.G&&(window.__DATA||{}).GRPW&&!window.__GRPU){ try{ var g=await decPriv(window.__DATA.GRPW,A.G); window.__GRPU=g; window.__GRPPW=A.G; var d2=await fgFetch('GROUPE',A.G); if(d2&&d2.S){ Object.keys(d2.S).forEach(function(kk){ (g[kk]=g[kk]||{}).FG=d2.S[kk]; }); window.__fgInfo.GROUPE=d2.maj; window.__fgInfo.GROUPE_d=d2.der; } }catch(e){} } };
  await Promise.all(ks.map(one).concat([grp()]));
  try{ if(window.__achWarm) window.__achWarm(); }catch(e){}
  }catch(e){} };
function demarrerCompta(){
  var root=document.getElementById('viewCompta');
  var n0=function(v){return v==null?'—':Math.round(v).toLocaleString('fr-FR');};
  var E=function(v){return n0(v)+' €';}, SE=function(v){return v==null?'—':(v>0?'+':'')+n0(v)+' €';};
  var P=function(v,d){return v==null?'—':(v>0?'+':'')+v.toLocaleString('fr-FR',{minimumFractionDigits:d==null?1:d,maximumFractionDigits:d==null?1:d})+' %';};
  var cls=function(v,rev){ if(v==null||v===0) return 'g-nu'; return ((v>0)!==!!rev)?'g-up':'g-dn'; };
  var ctab='syn';
  function draw(m,C){
    var R={}; C.rows.forEach(function(r){R[r.k]=r;});
    var ca=R.ca, ma=R.marge, ex=R.ext, pe=R.perso, eb=R.ebe, ra=R.rai;
    var tb=ma.bud/ca.bud, tr=ma.real/ca.real, tn=ma.n1/ca.n1;
    var PRs=(function(){ var MN={janvier:[31,'01'],février:[28,'02'],mars:[31,'03'],avril:[30,'04'],mai:[31,'05'],juin:[30,'06'],juillet:[31,'07'],août:[31,'08'],septembre:[30,'09'],octobre:[31,'10'],novembre:[30,'11'],décembre:[31,'12']}, mm=/(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+(\d{4})/i.exec(C.periode||''), dd=String(C.exercice||'').split('→'); if(!mm) return String(C.exercice||''); var q=MN[mm[1].toLowerCase()], yy=+mm[2], d=q[0]; if(q[1]==='02'&&((yy%4===0&&yy%100!==0)||yy%400===0)) d=29; return (dd[0]||'01/10/2025').trim()+' → '+d+'/'+q[1]+'/'+yy; })();
    var h='<div class="c-wrap"><h2>Compte de résultat · '+(m==='Hesingue'?'Hésingue':m)+'</h2><div style="margin:2px 0 8px"><span style="display:inline-block;padding:8px 22px;border-radius:999px;background:#1d1d1b;color:#fff;font-weight:800;font-size:clamp(16px,4.5vw,22px);white-space:nowrap">'+PRs+'</span> <span style="color:#737372;font-size:13px">situation arrêtée '+C.periode+'</span></div><div class="sub" style="color:#737372;font-size:13px">Cumul '+C.periode+' ('+C.mois+' mois, exercice '+C.exercice+') · '+C.source+' · prochaine situation : '+C.prochaine+'</div>';
    var p0=h.length;
    h+='<div class="c-kpis cr">'+[['CA HT net',ca,0],['Marge sur ventes',ma,0],['EBE',eb,0],['Résultat avant impôt',ra,0]].map(function(x){var r=x[1]; var db=r.real-r.bud, dn=r.real-r.n1, pc=r.n1>0?Math.max(0,Math.min(100,100*r.real/r.n1)):0, col=dn>=-0.005*Math.abs(r.n1)?'#1e7a34':(pc>=90?'#e0701a':'#b21f2d'); return '<div class="c-kpi"><div class="l">'+x[0]+'</div><div class="v">'+E(r.real)+'</div>'+(r.n1>0?'<div class="kb"><i style="width:'+pc.toFixed(0)+'%;background:'+col+'"></i></div><div class="kt">'+Math.round(100*r.real/r.n1)+' % de N-1 ('+E(r.n1)+')</div>':'')+'<div class="kr"><span>vs N-1</span><span class="pl '+cls(dn)+'">'+SE(dn)+' · '+P(100*dn/r.n1)+'</span></div><div class="kr bd"><span>vs budget</span><span class="pl '+cls(db)+'">'+SE(db)+' · '+P(100*db/r.bud)+'</span></div><div class="kt bd2">budget '+E(r.bud)+'</div></div>';}).join('')+'</div>';
    (function(){ var pf=function(v){ return (100*v).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})+' %'; }, pp=function(v){ return (v>0?'+':v<0?'−':'')+Math.abs(100*v).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})+' pt'; };
      function row(lab,dv,imp,rev){ var c=cls(dv,rev), eff=(rev?-1:1)*dv*ca.real; return '<div class="kr"><span>'+lab+'</span><span class="pl '+c+'">'+pp(dv)+' · '+SE(Math.round(dv*ca.real))+'</span></div>'; }
      var rt=[['Taux de marge sur ventes',tr,tb,tn,0],['Charges de personnel / CA',pe.real/ca.real,pe.bud/ca.bud,pe.n1/ca.n1,1],['Charges externes / CA',ex.real/ca.real,ex.bud/ca.bud,ex.n1/ca.n1,1]];
      function sbar(cur,prev,rev){ if(!(prev>0)||!(cur>0)) return ''; var sc=Math.max(0,Math.min(100,100*(rev?prev/cur:cur/prev))), col=sc>=99.5?'#1e7a34':(sc>=90?'#e0701a':'#b21f2d'); return '<div class="kb"><i style="width:'+sc.toFixed(0)+'%;background:'+col+'"></i></div>'; }
      var t=rt.map(function(x){ return '<div class="c-kpi"><div class="l">'+x[0]+'</div><div class="v">'+pf(x[1])+'</div>'+sbar(x[1],x[3],x[4])+'<div class="kt" style="margin:4px 0 2px">N-1 '+pf(x[3])+'</div>'+row('vs N-1',x[1]-x[3],0,x[4])+row('vs budget',x[1]-x[2],0,x[4]).replace('class="kr"','class="kr bd"')+'<div class="kt bd2">budget '+pf(x[2])+'</div></div>'; }).join('');
      if(C.demarque){ var dm=C.demarque; t+='<div class="c-kpi"><div class="l">Démarque</div><div class="v">'+E(dm.cum)+'</div>'+(dm.prev?sbar(dm.cum,dm.prev,1):'')+'<div class="kt" style="margin:4px 0 2px">'+(dm.pct!=null?dm.pct.toLocaleString('fr-FR',{minimumFractionDigits:2})+' % du CA':'')+'</div>'+(dm.prev?'<div class="kr"><span>vs N-1</span><span class="pl '+cls(dm.cum-dm.prev,1)+'">'+SE(dm.cum-dm.prev)+'</span></div>':'<div class="kr"><span>vs N-1</span><span>en attente</span></div>')+'<div class="kr"><span>vs budget</span><span>pas de budget</span></div></div>'; }
      h+='<h3 style="margin:14px 0 2px">Les ratios qui comptent</h3><div class="sub" style="font-size:12px;color:#737372">Barre pleine = au moins aussi bon que N-1 (vert), orange = jusqu\'à 10 % moins bon, rouge = plus. Écart en points de CA, puis son effet en € sur l\'EBE.</div><div class="c-kpis cr">'+t+'</div>'; })();
    // lecture
    var gBud=100*(ca.bud/ca.n1-1), gReal=100*(ca.real/ca.n1-1);
    var L=['<b>Résultat avant impôt : '+E(ra.real)+'</b>, soit '+SE(ra.real-ra.bud)+' vs budget ('+P(100*(ra.real-ra.bud)/ra.bud,0)+') et '+SE(ra.real-ra.n1)+' vs N-1.',
      'Le budget demandait un CA <b>'+P(gBud)+'</b> vs N-1 ; le réalisé est à <b>'+P(gReal)+'</b>. '+(gReal>=0?'Le CA ne baisse pas : il progresse moins que le budget ne le prévoyait.':'Le CA recule en plus d\'un budget ambitieux.')+''];
    if(C.rai&&C.rai.fin_juillet!=null){ var dm=C.rai.fin_aout-C.rai.fin_juillet; L.push('Sur le dernier mois, le résultat cumulé a '+(dm<0?'reculé de '+E(-dm):'progressé de '+E(dm))+(C.rai.budget_mois?' alors que le budget attendait environ +'+E(C.rai.budget_mois):'')+'. Projection d\'exercice : <b>'+E(C.rai.projection)+'</b> (contre '+E(C.rai.projection_prec)+' le mois précédent).'); }
    if(C.lecture) L=L.concat(C.lecture);
    h+='<div class="g-lecture" style="margin:12px 0;background:#f9f9f8;border-left-color:#1d1d1b"><div style="font-weight:800;margin-bottom:4px">À retenir</div>'+L.map(function(x){return '<div style="margin:5px 0;padding-left:16px;position:relative"><span style="position:absolute;left:0;color:#1d1d1b">▸</span>'+x+'</div>';}).join('')+'</div>';
    // decomposition ebe vs budget
    var dE=eb.real-eb.n1, vol=(ca.real-ca.n1)*tn, tx=(tr-tn)*ca.real, dex=-(ex.real-ex.n1), dpe=-(pe.real-pe.n1), oth=dE-(vol+tx+dex+dpe);
    var B=[['CA vs N-1 (volume)',vol],['Taux de marge',tx],['Charges externes',dex],['Charges de personnel',dpe],['Autres postes (non détaillés)',oth]], mx=Math.max.apply(null,B.map(function(b){return Math.abs(b[1]);}));
    h+='<h3 style="text-align:center">D\'où vient l\'écart d\'EBE vs N-1 ('+SE(dE)+')</h3>'+(window.__ch?'<div style="border:1px solid var(--line);border-radius:8px;padding:10px 12px;background:#fff;margin:0 auto 8px;max-width:720px">'+window.__ch.waterfall(B.map(function(b){ return {l:b[0],v:b[1]}; }),{totlab:'Écart d\'EBE',alt:'Décomposition de l\'écart d\'EBE vs N-1'})+'</div>':'')+'<details><summary style="cursor:pointer;font-size:13px;margin-bottom:4px">Voir le tableau</summary><div class="c-bars">'+B.map(function(b){return '<div class="c-bar"><span>'+b[0]+'</span><span><div class="b '+(b[1]>=0?'ok':'')+'" style="width:'+Math.max(2,Math.round(100*Math.abs(b[1])/mx))+'%"></div></span><span class="t '+cls(b[1])+'">'+SE(b[1])+'</span></div>';}).join('')+'<div class="sub" style="font-size:12px;color:#737372;margin-top:6px">Calculé à partir du cumul. « Autres postes » = ce que le cumul ne détaille pas (impôts et taxes, autres produits…) : demander le détail au comptable.</div></div></details>';
    var p1=h.length;
    // tableau
    h+='<h3>Cumul détaillé</h3><div class="c-dt"><table><thead><tr><th class="lb">Rubrique</th><th>Réalisé</th><th>% du CA</th><th>Budget</th><th>Écart budget</th><th>N-1</th><th>Écart N-1</th></tr></thead><tbody>'+C.rows.map(function(r){ var rev=(r.k==='ext'||r.k==='perso'), db=r.real-r.bud, dn=r.real-r.n1, key=(r.k==='ebe'||r.k==='rai'||r.k==='rex'||r.k==='ca'); return '<tr'+(key?' class="kk"':'')+'><td class="lb">'+r.lib+'</td><td class="rv">'+E(r.real)+'</td><td>'+(100*r.real/ca.real).toLocaleString('fr-FR',{maximumFractionDigits:1})+' %</td><td>'+E(r.bud)+'</td><td><span class="pl '+cls(db,rev)+'">'+SE(db)+'</span> <small class="'+cls(db,rev)+'">'+(r.bud?P(100*db/Math.abs(r.bud)):'')+'</small></td><td>'+E(r.n1)+'</td><td><span class="pl '+cls(dn,rev)+'">'+SE(dn)+'</span> <small class="'+cls(dn,rev)+'">'+(r.n1?P(100*dn/Math.abs(r.n1)):'')+'</small></td></tr>'; }).join('')+'</tbody></table></div><div class="sub" style="font-size:12px;color:#737372;margin-top:6px">Vert : favorable au résultat. Rouge : défavorable (pour les charges, une hausse est défavorable). Faites défiler le tableau sur téléphone.</div>';
    var p2=h.length;
    // plan d'action
    var A=[], dm_=C.demarque, caR=ca.real;
    if(!C.actions){
    if(ca.real<ca.bud*0.98) A.push({t:'CA sous le budget',e:SE(ca.real-ca.bud)+' vs budget',red:1,
      ct:['Chaque semaine, relire passages et panier dans <b>Performance commerciale</b> et traiter les 3 rayons qui perdent le plus de CA.','Suivre le mois de septembre : la situation arrive vers le 15/10, prépare l\'explication de l\'écart.'],
      mt:['Le budget supposait '+P(gBud)+' vs N-1 pour '+P(gReal)+' réalisé : recaler les objectifs rayon par rayon (passages d\'un côté, panier de l\'autre).','Préparer la saison (chauffage, jardin) avec les rayons qui portent la croissance.']});
    if(dm_&&dm_.pct>=0.6){ var gain=(dm_.cum-caR*0.004); A.push({t:'Démarque en forte hausse',e:'+'+E(dm_.cum-dm_.prev)+' en un mois ('+dm_.pct.toLocaleString('fr-FR',{minimumFractionDigits:2})+' % du CA)',red:1,
      ct:['Ventiler la démarque : connue (casse, périmés, déclassements) et inconnue (vol, erreurs de réception, écarts d\'inventaire).','Demander au comptable si le saut vient d\'un inventaire ou d\'un ajustement ponctuel.','Contrôler les réceptions et retours fournisseurs non saisis.'],
      mt:['Revenir vers 0,4 % du CA (niveau de fin juillet : '+dm_.prev_pct.toLocaleString('fr-FR',{minimumFractionDigits:2})+' %) : environ '+E(Math.round(gain/100)*100)+' à récupérer sur l\'exercice.','Mettre en place un inventaire tournant par rayon et un suivi mensuel de la démarque.']}); }
    if(pe.real>pe.bud) A.push({t:'Charges de personnel au-dessus du budget',e:SE(pe.real-pe.bud)+' vs budget · '+SE(pe.real-pe.n1)+' vs N-1',red:0,
      ct:['Contrôler le planning des 4 prochaines semaines (heures supplémentaires, remplacements).','Isoler les éléments ponctuels (indemnité de retraite refacturée, présence d\'une salariée de février à juillet) pour savoir ce qui est récurrent.'],
      mt:['Ratio personnel / CA : '+(100*pe.real/ca.real).toLocaleString('fr-FR',{maximumFractionDigits:1})+' % contre '+(100*pe.n1/ca.n1).toLocaleString('fr-FR',{maximumFractionDigits:1})+' % l\'an dernier. Chaque 0,1 point vaut environ '+E(Math.round(ca.real*0.001/100)*100)+'. Fixer un ratio cible par mois selon la saison.']});
    if(tr<tb-0.003) A.push({t:'Taux de marge sous le budget',e:(100*(tr-tb)).toLocaleString('fr-FR',{maximumFractionDigits:2})+' pt vs budget ≈ '+SE((tr-tb)*ca.real),red:0,
      ct:['Dans <b>Performance commerciale</b>, ouvrir les rayons en « Marge en chute » et contrôler les prix des références concernées (onglet Références).'],
      mt:['Traiter les références en surstock ou vendues sous le coût pour remonter le taux.','Le taux reste à '+P(100*(tr-tn),2)+' pt vs N-1 : à consolider.']});
    A.push({t:'À capitaliser',e:'marge '+SE(ma.real-ma.n1)+' vs N-1',pos:1,ct:['CA au-dessus de N-1 ('+P(gReal,2)+') pour la première fois de l\'exercice, taux de marge '+P(100*(tr-tn),2)+' pt vs N-1 : identifier ce qui a marché ce mois pour le reproduire.'],mt:['Résultat avant impôt '+SE(ra.real-ra.n1)+' vs N-1 : consolider avant la clôture au 30/09.']});
    } else A=C.actions;
    var cd=function(a){ return '<details class="g-card '+(a.pos?'grn':(a.red?'red':''))+'" '+(a.red?'open':'')+'><summary><span class="nm">'+a.t+'</span><span class="enjeu '+(a.pos?'g-up':'g-dn')+'">'+a.e+'</span></summary><div class="g-cols"><div><h4>Court terme · cette semaine</h4><ul>'+a.ct.map(function(x){return '<li>'+x+'</li>';}).join('')+'</ul></div><div><h4>Moyen terme · 1 à 3 mois</h4><ul>'+a.mt.map(function(x){return '<li>'+x+'</li>';}).join('')+'</ul></div></div></details>'; };
    h+='<h3>Plan d\'action</h3>'+A.map(cd).join('');
    var p3=h.length;
    if(C.notes&&C.notes.length) h+='<h3>Analyse du réseau</h3><div class="g-lecture"><ul style="margin:0 0 0 18px;padding:0">'+C.notes.map(function(x){return '<li style="margin:4px 0">'+x.replace(/</g,'&lt;')+'</li>';}).join('')+'</ul></div>';
    var head=h.slice(0,p0), SYN=h.slice(p0,p1), DET=h.slice(p1,p2), PLA=h.slice(p2,p3), NOT=h.slice(p3);
    var nPlan=A.length, nRed=A.filter(function(a){return a.red;}).length;
    var TABS=[['syn','Synthèse',''],['det','Détail',''],['plan','Plan d\'action',nPlan],['not','Analyse Comptabilité',''],['fg','Frais généraux',''],['bud','Budget 2026-27','']];
    var BODY={syn:SYN,det:DET,plan:PLA,not:NOT,fg:'<div id="fgbox"></div>',bud:'<div id="budbox"></div>'};
    function paint(){ root.innerHTML=head+'<div class="v-tabs c-tabs">'+TABS.map(function(t){return '<button type="button" data-ct="'+t[0]+'" class="'+(ctab===t[0]?'on':'')+'">'+t[1]+(t[2]!==''?' <small>'+t[2]+'</small>':'')+'</button>';}).join('')+'</div>'+BODY[ctab]+'</div>';
      root.querySelectorAll('.c-tabs button').forEach(function(b){ b.onclick=function(){ if(b.dataset.ct==='fg') window.__fgSub=null; ctab=b.dataset.ct; paint(); window.scrollTo({top:0}); }; }); if(ctab==='fg') window.__fgPage(root.querySelector('#fgbox'),[{name:m,carb:UNL[m].CARB,C:C,fg:UNL[m].FG}],false); else if(ctab==='bud') window.__crBudget(root.querySelector('#budbox'),m,false); else window.__trophyC(root,m); }
    paint();
  }
  // ===== Carburant : vue interactive (magasin et groupe consolidé) =====
  var CBC={'PL':'#0f6e7a','VU':'#e0701a','VT':'#2f9e6b','Véhicules des conducteurs':'#6250d6','Abos':'#e87ba4','Régularisations (CB, NDF, douane)':'#a3a3a1','Refacturation entre magasins':'#4a4a48'};
  var CBS={Waldighoffen:'#1d5fa8',Hesingue:'#1e7a34',Sierentz:'#e0a900',Mulhouse:'#7b3fa0',Creation:'#8a5a2b'};
  var CBM=['oct.','nov.','déc.','janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.'];
  var CBL={Hesingue:'Hésingue',Creation:'Baeumlin Création'};
  var cbS={per:'12',hid:{},mode:'cat'};
  function cbNice(r){ var s=[100,200,250,500,1000,2000,2500,5000,10000,20000], t=r/5; for(var i=0;i<s.length;i++) if(s[i]>=t) return s[i]; return 50000; }
  function cbRange(){ return cbS.per==='S1'?[0,5]:(cbS.per==='S2'?[6,11]:[0,11]); }
  function cbTot(a){ var s=0; for(var i=0;i<=12;i++) s+=a[i]||0; return s; }
  function cbSel(a,r){ return cbS.per==='12'?cbTot(a):cbSum(a,r); }
  function cbSum(a,r){ var s=0; for(var i=r[0];i<=r[1];i++) s+=a[i]||0; return s; }
  function esq(t){ return String(t==null?'':t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
  function cbChart(ser,r,fgm){ var W=760,H=290,L=48,R=8,T=12,B=30, cols=[]; for(var i=r[0];i<=r[1];i++) cols.push(i);
    var vis=ser.filter(function(s){ return !cbS.hid[s.k]&&s.v.slice(0,fgm?13:12).some(function(x){ return Math.abs(x)>0.005; }); }), pos=[],neg=[];
    cols.forEach(function(i){ var p=0,n=0; vis.forEach(function(s){ var x=s.v[i]||0; if(x>=0) p+=x; else n+=x; }); pos.push(p); neg.push(n); });
    var mx=Math.max.apply(null,pos.concat([1])), mn=Math.min.apply(null,neg.concat([0])), st=cbNice(mx-mn), top=Math.ceil(mx/st)*st, bot=Math.floor(mn/st)*st, rg=(top-bot)||1, ph=H-T-B, pw=W-L-R, cw=pw/cols.length, bw=Math.min(46,cw*0.68);
    var y=function(v){ return T+(top-v)/rg*ph; }, g='';
    for(var t=bot;t<=top+0.1;t+=st){ g+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y(t).toFixed(1)+'" y2="'+y(t).toFixed(1)+'" stroke="'+(t===0?'#a3a3a1':'#efefed')+'"/><text x="'+(L-6)+'" y="'+(y(t)+4).toFixed(1)+'" text-anchor="end" font-size="11" fill="#737372">'+(Math.abs(t)>=1000?(t/1000).toLocaleString('fr-FR',{maximumFractionDigits:1})+' k':t)+'</text>'; }
    cols.forEach(function(i,k){ var x=L+k*cw+(cw-bw)/2, up=0, dn=0, tip='<b>'+(i===12?(fgm?'oct. 2026 (en cours)':'Régularisations'):CBM[i]+(i<3?' 2025':' 2026'))+'</b> · '+E(pos[k]+neg[k])+'<br>'; 
      vis.forEach(function(s){ var v=s.v[i]||0; if(Math.abs(v)<0.005) return; var h=Math.abs(v)/rg*ph; if(v>=0){ g+='<rect x="'+x.toFixed(1)+'" y="'+(y(up+v)+1).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+Math.max(0,h-2).toFixed(1)+'" rx="3" fill="'+s.color+'"/>'; up+=v; } else { g+='<rect x="'+x.toFixed(1)+'" y="'+(y(dn)+1).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+Math.max(0,h-2).toFixed(1)+'" rx="3" fill="'+s.color+'" opacity=".85"/>'; dn+=v; } tip+='<span style="color:'+s.color+'">●</span> '+esq(s.name)+' : '+E(v)+'<br>'; });
      g+='<text x="'+(x+bw/2).toFixed(1)+'" y="'+(H-10)+'" text-anchor="middle" font-size="11.5" fill="#4a4a48">'+(i===12?(fgm?'oct. 26':'Régul.'):CBM[i])+'</text><rect x="'+(L+k*cw).toFixed(1)+'" y="'+T+'" width="'+cw.toFixed(1)+'" height="'+ph+'" fill="#000" opacity="0" data-tip="'+tip.replace(/"/g,'&quot;')+'" style="cursor:pointer"/>'; });
    return '<svg viewBox="0 0 '+W+' '+H+'" style="width:100%;height:auto;display:block" role="img" aria-label="Carburant par mois">'+g+'</svg>'; }
    var FGDIR={'Énergie':1,'Entretien':1,'Entretien véhicules':1,'Télécoms':1,'Publicité':1,'Fournitures':1,'Notes de frais':1,'Réceptions':1,'Transport':1,'Informatique':1,'Personnel & formation':1};
  var FGEXC={'Weldom ristournes':1,'Intragroupe':1,'Investissements':1};
  var FGICO={'Loyers':'🏢','Enseigne Weldom':'🏷️','Personnel & formation':'🎓','Énergie':'⚡','Entretien':'🔧','Crédit-bail':'📄','Honoraires':'🧮','Publicité':'📣','Télécoms':'📞','Entretien véhicules':'🚚','Notes de frais':'🧾','Fournitures':'📎','Réceptions':'🥂','Transport':'📦','Informatique':'💻','Impôts & taxes':'🏛️','Cotisations':'🤝','Assurances':'🛡️','A classer':'❓','Weldom ristournes':'↩️','Intragroupe':'🔁','Investissements':'🏗️'};
  var FGPC=['#1d5fa8','#e0701a','#1e7a34','#6250d6','#e87ba4','#0f6e7a','#e0a900','#4a4a48'], FGGR='#a3a3a1';
  var FGACT={
'Carburant':['Comparer le coût carburant par véhicule et par mois : traiter d\'abord les écarts forts sur un même véhicule.','Vérifier que chaque carte correspond à un salarié ou à un véhicule du magasin.','Séparer péages, parkings et recharges électriques : ce sont des dépenses de déplacement, pas du carburant.','Contrôler les refacturations entre magasins (camions partagés) pour imputer au bon magasin.'],
   'Loyers':['Vérifier l\'indexation annuelle de chaque bail et la comparer aux indices de référence.','Comparer le loyer au m² entre les magasins et ouvrir la discussion avec la SCI la plus chère.'],
   'Enseigne Weldom':['Faire le détail ligne à ligne des redevances et services refacturés, et le rapprocher des contrats.','Contrôler que les ristournes et régularisations reçues compensent bien les services facturés.'],
   'Personnel & formation':['Séparer médecine du travail, formation et intérim, et comparer le coût par salarié entre magasins.','Planifier les formations obligatoires pour lisser la dépense sur l\'exercice.'],
   'Énergie':['Mettre en concurrence les contrats d\'énergie des magasins dont le coût au CA est le plus élevé.','Relever les consommations (électricité, gaz) et chercher les dérives mois par mois.'],
   'Entretien':['Lister les contrats de maintenance (ascenseur, chariots, froid) et renégocier les plus coûteux.','Suivre les interventions ponctuelles pour éviter les doublons de facturation.'],
   'Crédit-bail':['Contrôler les échéances restantes et les fins de contrat pour anticiper les renouvellements.'],
   'Honoraires':['Séparer comptabilité, conseil et études, et valider chaque mission avec son devis.'],
   'Publicité':['Rapprocher les dépenses publicitaires des périodes de tract et mesurer le retour par magasin.','Regrouper les achats d\'espace entre magasins pour négocier un tarif groupe.'],
   'Télécoms':['Comparer les forfaits mobiles et internet par magasin et supprimer les lignes inutilisées.'],
   'Entretien véhicules':['Suivre le coût d\'entretien par véhicule et décider des renouvellements.'],
   'Notes de frais':['Rappeler les règles de remboursement et contrôler les justificatifs des plus gros montants.'],
   'Fournitures':['Centraliser les achats de fournitures (Amazon, Lyreco, Cultura) avec un fournisseur référencé.'],
   'Réceptions':['Fixer un budget annuel de réceptions par magasin.'],
   'Transport':['Comparer les coûts d\'envoi (La Poste, transporteurs) et regrouper les expéditions.'],
   'Informatique':['Recenser les abonnements informatiques et supprimer les doublons entre magasins.'],
   'Impôts & taxes':['Vérifier les échéances et les bases de calcul des taxes locales.'],
   'Cotisations':['Contrôler la nécessité de chaque adhésion et son utilité réelle.'],
   'Assurances':['Retrouver les contrats d\'assurance : une seule ligne figure dans DocuWare, les autres sont probablement ailleurs.'],
   'A classer':['Classer les fournisseurs restants dans le collecteur (postes_fournisseurs.json ou l\'outil de classement), en commençant par les plus gros montants.']
  };
  function fgZ(){ var a=[]; for(var i=0;i<13;i++) a.push(0); return a; }
  function ensureCls(ents){ var C=(window.__DATA||{}).CLS||{}, S={}; try{ S=JSON.parse(localStorage.getItem('acl_sel')||'{}')||{}; }catch(e){} var M=window.__P2S||{}; ents.forEach(function(e){ var d=e.fg; if(!d) return; if(!d.__o||d.__o.length!==d.R.length){ d.__o=d.R.map(function(r){ return r[1]; }); d.__P0=d.P.length; } var pi={}; d.P.forEach(function(p,i){ pi[p]=i; }); d.R.forEach(function(r,k){ var n=d.F[r[2]], q=S[n]||C[n]; if(!q){ r[1]=d.__o[k]; return; } q=M[q]||q; if(pi[q]===undefined){ pi[q]=d.P.length; d.P.push(q); } r[1]=pi[q]; }); }); }
  function fgAgg(ents){ ensureCls(ents); var A={}; window.__fgL=11; ents.forEach(function(e){ if(e.fg) e.fg.R.forEach(function(r){ if(r[0]>window.__fgL) window.__fgL=r[0]; }); });
    ents.forEach(function(e){ var G=e.fg; if(!G) return; G.R.forEach(function(r){ var p=G.P[r[1]], f=G.F[r[2]], x=A[p]||(A[p]={tot:fgZ(),nm:fgZ(),four:{},mag:{},n:0}); x.tot[r[0]]+=r[3]; x.n+=r[4]; x.nm[r[0]]+=r[4]; (x.four[f]||(x.four[f]={v:fgZ(),nm:fgZ(),n:0,m:{}})); x.four[f].v[r[0]]+=r[3]; x.four[f].n+=r[4]; x.four[f].nm[r[0]]+=r[4]; x.four[f].m[e.name]=(x.four[f].m[e.name]||0)+(r[0]<12?r[3]:0); (x.four[f].ms=x.four[f].ms||{})[e.name]=(x.four[f].ms[e.name]||fgZ()); x.four[f].ms[e.name][r[0]]+=r[3]; (x.mag[e.name]||(x.mag[e.name]=fgZ())); x.mag[e.name][r[0]]+=r[3]; }); });
    return A; }
  function fgR(){ return window.__fgR||(window.__fgL>11?[12,window.__fgL]:[0,11]); }
  function fgT(a){ return cbSum(a,fgR()); }
  function fgN(a){ return cbSum(a,fgR()); }
  function fgML(i){ var m=i%12; return CBM[m]+' '+(i>=12?2026:(m<3?2025:2026)); }
  function fgPL(r){ return (r[0]===0&&r[1]===11)?'exercice N-1 (oct. 2025 à sept. 2026)':(r[0]===r[1]?fgML(r[0]):fgML(r[0])+' à '+fgML(r[1])); }
  function fgLast(ents){ var L=11; ents.forEach(function(e){ if(e.fg) e.fg.R.forEach(function(r){ if(r[0]>L) L=r[0]; }); }); return L; }
  function fgPerBar(ents){ var r=fgR(), L=fgLast(ents), key=r.join(',');
    var P=[]; P.push(['Exercice en cours',[12,Math.max(12,L)]],['Exercice N-1',[0,11]],['Mois en cours',[Math.max(12,L),Math.max(12,L)]],['Mois précédent',[Math.max(0,Math.max(12,L)-1),Math.max(0,Math.max(12,L)-1)]]);
    var opt=function(sel){ var o=''; for(var i=0;i<=L;i++) o+='<option value="'+i+'"'+(i===sel?' selected':'')+'>'+fgML(i)+(i>11?' (en cours)':'')+'</option>'; return o; };
    return '<div class="fgper" style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:8px 0 12px"><b style="font-size:13px">Période</b>'+P.map(function(p){ return '<button type="button" class="cbp fgpr'+(p[1].join(',')===key?' on':'')+'" data-r="'+p[1].join(',')+'">'+p[0]+'</button>'; }).join('')+'<span style="font-size:13px;margin-left:8px">du</span><select class="fgrf" style="font:inherit;padding:3px 6px">'+opt(r[0])+'</select><span style="font-size:13px">au</span><select class="fgrt" style="font:inherit;padding:3px 6px">'+opt(r[1])+'</select></div>'; }
  function fgPerBind(box,again){ box.querySelectorAll('.fgpr').forEach(function(b){ b.onclick=function(){ window.__fgR=b.dataset.r.split(',').map(Number); again(); }; });
    var f=box.querySelector('.fgrf'), t=box.querySelector('.fgrt'); if(!f) return; var ch=function(){ var a=+f.value, z=+t.value; if(a>z){ if(this===f) z=a; else a=z; } window.__fgR=[a,z]; again(); }; f.onchange=ch; t.onchange=ch; }
  function fgSerOf(obj,keyColor,top){ var arr=Object.keys(obj).map(function(k){ return {k:k,name:CBL[k]||k,v:obj[k].v||obj[k]}; }); arr.sort(function(x,y){ return Math.abs(fgT(y.v))-Math.abs(fgT(x.v)); });
    if(top&&arr.length>top){ var rest=arr.slice(top), o=fgZ(); rest.forEach(function(r){ for(var i=0;i<13;i++) o[i]+=r.v[i]; }); arr=arr.slice(0,top); arr.push({k:'__autres',name:'Autres ('+rest.length+')',v:o,gr:1}); }
    arr.forEach(function(r,i){ r.color=r.gr?FGGR:(keyColor?(keyColor[r.k]||FGPC[i%FGPC.length]):FGPC[i%FGPC.length]); }); return arr; }
  function fgCA(ents){ var ca=0,ok=false; ents.forEach(function(e){ var C=e.C; if(C){ var R={}; C.rows.forEach(function(x){R[x.k]=x;}); if(R.ca){ ca+=R.ca.real; ok=true; } } }); return ok?ca:null; }
  function fgBack(){ var f=window.__fgFrom; return '<button type="button" class="fgback" style="padding:6px 12px;border:1px solid #d6d6d3;border-radius:999px;background:#fff;font:inherit;font-weight:700;cursor:pointer;margin:8px 0">← '+(f==='__all'?'Vue d’ensemble':f==='all'?'Liste des fournisseurs':'Frais généraux')+'</button>'; }
  function fgUp(){ var f=window.__fgFrom||null; window.__fgFrom=null; return f; }
  var FGCARB={'FLEET PRO ENDERED':'Carburant (cartes)','STATIONS DE CHARGE':'Recharge électrique','TESLA FRANCE':'Recharge électrique','CHARGEMAP':'Recharge électrique','WEVAN - BLUE PARK':'Recharge électrique','VINCI AUTOROUTES TELEPEAGE':'Péages','INDIGO':'Parkings','EAST PARK':'Parkings'};
  function fgCarbSub(X){ var G={}; Object.keys(X.four).forEach(function(f){ var o=X.four[f], k=FGCARB[f]||'Autres', g=G[k]||(G[k]={v:fgZ(),nm:fgZ(),n:0,m:{}}); for(var i=0;i<13;i++){ g.v[i]+=o.v[i]; g.nm[i]+=o.nm[i]; } g.n+=o.n; Object.keys(o.m).forEach(function(m){ g.m[m]=(g.m[m]||0)+o.m[m]; }); Object.keys(o.ms||{}).forEach(function(m){ var q=(g.ms=g.ms||{})[m]=(g.ms[m]||fgZ()); for(var i=0;i<13;i++) q[i]+=o.ms[m][i]; }); }); return {tot:X.tot,four:G,mag:X.mag,n:X.n,nm:X.nm}; }
  var FGVSH={'PL':'PL','VU':'VU','VT':'VT','Véhicules des conducteurs':'véhicule','Abos':'abo'};
  function fgPlq(p){ return String(p||'').replace(/[^A-Za-z0-9]/g,'').toUpperCase(); }
  function fgPlf(p){ var m=/^([A-Z]{2})(\d{3})([A-Z]{2})$/.exec(p); return m?m[1]+' '+m[2]+' '+m[3]:p; }
  function fgTyp(e){ var T={}; ((e.carb&&e.carb.veh)||[]).forEach(function(v){ var m=v.l.match(/[A-Z]{2} \d{3} [A-Z]{2}/g)||[]; m.forEach(function(x){ T[fgPlq(x)]=v; }); (v.al||[]).forEach(function(x){ T[fgPlq(x)]=v; }); }); return T; }
  function fgVehHas(ents){ return ents.some(function(e){ return e.fg&&e.fg.FL&&e.fg.FL.V&&e.fg.FL.V.length; }); }
  function fgVeh(ents,grp,X){ var G={}; ents.forEach(function(e){ var L=e.fg&&e.fg.FL; if(!L) return; var T=fgTyp(e); L.V.forEach(function(v){ var t=T[fgPlq(v[0])], lab=v[0]==='FRAIS'?'Frais Fleet Pro (gestion, abonnement)':(t?((t.l.match(/[A-Z]{2} \d{3} [A-Z]{2}/g)||[]).length>1?fgPlf(v[0])+' ('+(FGVSH[t.c]||t.c)+')':t.l+(t.l.indexOf('(')>=0?'':' ('+(FGVSH[t.c]||t.c)+')')):fgPlf(v[0])+' (à classer)'), k=(grp?(CBL[e.name]||e.name)+' · ':'')+lab, g=G[k]=G[k]||{v:fgZ(),nm:fgZ(),n:0,m:{}}; for(var i=0;i<13;i++){ var x=v[1][i]+v[2][i]; g.v[i]+=x; g.nm[i]+=v[3][i]; g.n+=v[3][i]; if(i<12) g.m[e.name]=(g.m[e.name]||0)+x; } var q=(g.ms=g.ms||{})[e.name]=(g.ms[e.name]||fgZ()); for(var i2=0;i2<13;i2++) q[i2]+=v[1][i2]+v[2][i2]; }); }); return {tot:X.tot,four:G,mag:X.mag,n:X.n,nm:X.nm}; }
  function fgPoste(box,ents,grp,poste){
    var A=fgAgg(ents), all=(poste==='__all'), ids=Object.keys(A).filter(function(p){ return FGDIR[p]||/^Carburant/.test(p); });
    var tot=fgZ(), ttl=poste==='__all'?'Vue d\'ensemble des frais généraux':esq((window.__S2L||{})[poste]||poste), X;
    if(all){ ids.forEach(function(p){ for(var i=0;i<13;i++) tot[i]+=A[p].tot[i]; }); var n=0; ids.forEach(function(p){ n+=A[p].n; }); X={tot:tot,four:{},mag:{},n:n}; ids.forEach(function(p){ Object.keys(A[p].mag).forEach(function(k){ var o=X.mag[k]||(X.mag[k]=fgZ()); for(var i=0;i<13;i++) o[i]+=A[p].mag[k][i]; }); }); }
    else { X=A[poste]; if(!X){ box.innerHTML=fgBack()+'<div class="g-nodata"><b>Aucune facture</b> pour ce poste.</div>'; box.querySelector('.fgback').onclick=function(){ window.__fgSub=fgUp(); window.__fgPage(box,ents,grp); }; return; } tot=X.tot; }
    var isC=/^Carburant/.test(poste), mode=cbS.fgm||(isC?'sub':(grp?'mag':'four')); if(!grp&&mode==='mag') mode='four'; if(isC&&!all&&mode==='four') mode='four'; if(isC&&!all&&mode==='sub') X=fgCarbSub(X); if(isC&&!all&&mode==='veh') X=fgVeh(ents,grp,X); if(all&&mode==='four') mode=grp?'mag':'poste'; if(all&&!grp) mode='poste';
    if(isC&&!all&&mode==='veh'&&!window.__plateOK){
      var hh=fgBack()+'<h3 style="margin:6px 0">'+(FGICO[poste]||'')+' '+ttl+'</h3><div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 10px"><b style="font-size:13px">Regrouper</b>'+['sub|par type','veh|par plaque','mag|par magasin','four|par fournisseur'].filter(function(x){ return grp||x.indexOf('mag')!==0; }).map(function(x){ var q=x.split('|'); return '<button type="button" class="cbp fgp'+(q[0]==='veh'?' on':'')+'" data-mode="'+q[0]+'">'+q[1]+'</button>'; }).join('')+'</div>'
        +'<div class="v-lock" style="margin:24px auto"><h3>🔒 Détail par plaque</h3><p>Ces données sont protégées. Saisis le mot de passe réservé.</p><input type="password" id="plpw" placeholder="Mot de passe" autocomplete="off"><button type="button" id="plbtn">Ouvrir</button><div id="plerr"></div></div>';
      box.innerHTML=hh; box.querySelector('.fgback').onclick=function(){ window.__fgSub=fgUp(); window.__fgPage(box,ents,grp); };
      box.querySelectorAll('.fgp').forEach(function(b){ b.onclick=function(){ cbS.fgm=b.dataset.mode; fgPoste(box,ents,grp,poste); }; });
      var pgo=function(){ var pw=document.getElementById('plpw').value; if(!pw) return; document.getElementById('plerr').textContent='Vérification…'; decPriv((window.__DATA||{}).PRIVRH,pw).then(function(){ window.__plateOK=true; fgPoste(box,ents,grp,poste); },function(){ document.getElementById('plerr').textContent='Mot de passe incorrect.'; }); };
      document.getElementById('plbtn').onclick=pgo; document.getElementById('plpw').onkeydown=function(e){ if(e.key==='Enter') pgo(); }; return; }
    var ser, kc=null;
    if(all){ var po={}; ids.forEach(function(p){ po[p]={v:A[p].tot}; }); ser=(mode==='mag')?fgSerOf(X.mag,CBS,0):fgSerOf(po,null,8); }
    else ser=(mode==='mag')?fgSerOf(X.mag,CBS,0):fgSerOf(X.four,null,8);
    var r=fgR(), nmo=r[1]-r[0]+1, tt=fgT(tot), mo=tot.slice(r[0],r[1]+1), avg=tt/nmo, iMax=r[0]+mo.indexOf(Math.max.apply(null,mo)), last=tot[r[1]], avg11=nmo>1?cbSum(tot,[r[0],r[1]-1])/(nmo-1):0, dl=last-avg11;
    var ca=fgCA(ents), pca=(ca&&ca>0)?100*cbSum(tot,[0,10])/ca:null;
    var kp=function(l,v,sub,pill){ return '<div class="c-kpi"><div class="l">'+l+'</div><div class="v">'+v+'</div><div class="kt" style="margin:4px 0 2px">'+sub+'</div>'+(pill||'')+'</div>'; };
    var h=fgBack()+'<h3 style="margin:6px 0">'+(all?'📊':(FGICO[poste]||''))+' '+ttl+'</h3>';
    h+='<div class="c-kpis">'+kp('Total HT · '+fgPL(r),E(tt),fgN(all?ids.reduce(function(a,p){ return a.map(function(v,i){ return v+A[p].nm[i]; }); },fgZ()):X.nm)+' factures et avoirs')+kp('Moyenne par mois',E(avg),'mois le plus cher : '+fgML(iMax)+' ('+E(tot[iMax])+')')+(pca!=null?kp('Part du CA HT',pca.toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})+' %','oct. à août, comparé au CA cumulé'):kp('Part du CA HT','—','CA non disponible'))+kp('Dernier mois vs moyenne',E(last),fgML(r[1])+' · moyenne des mois précédents : '+E(avg11),'<span class="pl '+cls(dl,1)+'">'+SE(Math.round(dl))+' · '+P(avg11?100*dl/Math.abs(avg11):0)+'</span>')+'</div>';
    var modes=all?(grp?[['mag','par magasin'],['poste','par poste']]:[['poste','par poste']]):(isC?(grp?[['sub','par type']].concat(fgVehHas(ents)?[['veh','par plaque']]:[],[['mag','par magasin'],['four','par fournisseur']]):[['sub','par type']].concat(fgVehHas(ents)?[['veh','par plaque']]:[],[['four','par fournisseur']])):(grp?[['mag','par magasin'],['four','par fournisseur']]:[['four','par fournisseur']]));
    h+=fgPerBar(ents)+'<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 6px">'+(modes.length>1?'<b style="font-size:13px">Regrouper</b>'+modes.map(function(p){ return '<button type="button" class="cbp fgp'+(mode===p[0]?' on':'')+'" data-mode="'+p[0]+'">'+p[1]+'</button>'; }).join(''):'')+'</div>';
    h+='<div class="c-sc" style="padding:6px">'+cbChart(ser,r,true)+'</div><div style="display:flex;flex-wrap:wrap;gap:6px 14px;margin:6px 0 12px">'+ser.map(function(x){ var hid=cbS.hid[x.k]; return '<button type="button" class="fgl" data-k="'+String(x.k).replace(/"/g,'&quot;')+'" style="border:0;background:none;font:inherit;font-size:13px;cursor:pointer;opacity:'+(hid?.4:1)+'"><span style="color:'+x.color+'">●</span> '+esq(x.name)+' <b>'+E(cbSum(x.v,r))+'</b></button>'; }).join('')+'</div>';
    // tableau
    var rows;
    if(all){ rows=ids.map(function(p){ return {n:p,tot:fgT(A[p].tot),cnt:fgN(A[p].nm),m:A[p].mag,tp:cbSum(A[p].tot,[r[0]-12,r[1]-12]),tf:cbSum(A[p].tot,[0,11])}; }); }
    else rows=Object.keys(X.four).map(function(f){ var o=X.four[f]; return {n:f,tot:fgT(o.v),cnt:fgN(o.nm),m:o.m,ms:o.ms,fm:1,tp:cbSum(o.v,[r[0]-12,r[1]-12]),tf:cbSum(o.v,[0,11])}; });
    rows.sort(function(a,b){ return Math.abs(b.tot)-Math.abs(a.tot); });
    var nAvant=rows.length; var cmp=(r[0]>=12); rows=rows.filter(function(rw){ return Math.abs(rw.tot)>=0.005||rw.cnt||(cmp&&(Math.abs(rw.tp||0)>=0.005||Math.abs(rw.tf||0)>=0.005)); }); var nMasq=nAvant-rows.length; var fraisRows=(isC&&mode==='veh')?rows.filter(function(rw){ return /Frais Fleet Pro \(gestion, abonnement\)$/.test(rw.n); }):[]; var plateRows=fraisRows.length?rows.filter(function(rw){ return fraisRows.indexOf(rw)<0; }):rows;
    var stN=ents.filter(function(e){ return e.fg; }).map(function(e){ return e.name; });
    var th='<th style="text-align:left;padding:6px 8px">'+(all?'Poste':((isC&&mode==='sub')?'Type':((isC&&mode==='veh')?'Plaque':'Fournisseur')))+'</th><th style="padding:6px 8px">'+((isC&&mode==='veh')?'Passages':'Nb')+'</th><th style="padding:6px 8px">Total HT</th><th style="padding:6px 8px">Part</th>'+(cmp?'<th style="padding:6px 8px">Même période N-1</th><th style="padding:6px 8px">Écart</th><th style="padding:6px 8px">Exercice N-1 complet<br><span style=\'font-weight:400\'>oct. 25 à sept. 26</span></th><th style="padding:6px 8px">Moyenne / mois N-1</th>':'')+(grp?stN.map(function(k){ return '<th style="padding:6px 8px;background:'+(CBS[k]||'#1d1d1b')+';color:'+(k==='SIERENTZ'||CBS[k]==='#e0a900'?'#262624':'#fff')+'">'+(CBL[k]||k)+'</th>'; }).join(''):'');
    var cell=function(rw,k){ var v=all?cbSum(rw.m[k]||fgZ(),r):(rw.ms?cbSum(rw.ms[k]||fgZ(),r):(rw.m[k]||0)); return '<td>'+(v?E(v):'—')+'</td>'; };
    var cmpCells=function(a,b,f){ f=f||0; var d=a-b, col=Math.abs(d)<0.5?'#737372':(d>0?'#b21f2d':'#1e7a34'); return '<td>'+(b?E(b):'—')+'</td><td style="color:'+col+';font-weight:600">'+(Math.abs(d)<0.5?'=':(d>0?'+':'−')+E(Math.abs(d))+(b?' ('+(d>0?'+':'−')+Math.abs(Math.round(100*d/b))+' %)':''))+'</td><td>'+(f?E(f):'—')+'</td><td>'+(f?E(f/12):'—')+'</td>'; };
    var body=plateRows.slice(0,15).map(function(rw){ return '<tr><td style="text-align:left">'+(all?'<a href="#" class="fgpo" data-p="'+String(rw.n).replace(/"/g,'&quot;')+'" style="color:#1d1d1b;font-weight:700;text-decoration:underline;cursor:pointer">'+esq((window.__S2L||{})[rw.n]||rw.n)+' ›</a>':'<b>'+esq(rw.n)+'</b>')+'</td><td>'+(rw.cnt||'—')+'</td><td>'+E(rw.tot)+'</td><td>'+(tt?(100*rw.tot/tt).toFixed(1).replace('.',','):'0')+' %</td>'+(cmp?cmpCells(rw.tot,rw.tp||0,rw.tf||0):'')+(grp?stN.map(function(k){ return cell(rw,k); }).join(''):'')+'</tr>'; }).join('');
    if(plateRows.length>15){ var rest=plateRows.slice(15), rt=rest.reduce(function(a,x){ return a+x.tot; },0); body+='<tr><td style="text-align:left;color:#737372">Autres ('+rest.length+')</td><td>'+rest.reduce(function(a,x){ return a+x.cnt; },0)+'</td><td>'+E(rt)+'</td><td>'+(tt?(100*rt/tt).toFixed(1).replace('.',','):'0')+' %</td>'+(cmp?cmpCells(rt,rest.reduce(function(a,x){ return a+(x.tp||0); },0),rest.reduce(function(a,x){ return a+(x.tf||0); },0)):'')+(grp?stN.map(function(){ return '<td></td>'; }).join(''):'')+'</tr>'; }
    if(fraisRows.length){ var fT=0,fC=0,fP=0,fF=0; fraisRows.forEach(function(rw){ fT+=rw.tot; fC+=(rw.cnt||0); fP+=(rw.tp||0); fF+=(rw.tf||0); });
      body+='<tr style="background:#fff8ee"><td style="text-align:left"><b>Abonnement et frais de gestion Fleet Pro</b></td><td>—</td><td>'+E(fT)+'</td><td>'+(tt?(100*fT/tt).toFixed(1).replace('.',','):'0')+' %</td>'+(cmp?cmpCells(fT,fP,fF):'')+(grp?stN.map(function(k){ var v=fraisRows.reduce(function(a,rw){ return a+(rw.ms?cbSum(rw.ms[k]||fgZ(),r):(rw.m[k]||0)); },0); return '<td>'+(v?E(v):'—')+'</td>'; }).join(''):'')+'</tr>'; }
    var tT=0,tC=0,tM={},tP=0,tF=0; rows.forEach(function(rw){ tT+=rw.tot; tP+=(rw.tp||0); tF+=(rw.tf||0); if(fraisRows.indexOf(rw)<0) tC+=(rw.cnt||0); if(grp) stN.forEach(function(k){ var v=all?cbSum(rw.m[k]||fgZ(),r):(rw.ms?cbSum(rw.ms[k]||fgZ(),r):(rw.m[k]||0)); tM[k]=(tM[k]||0)+v; }); });
    body+='<tr style="font-weight:700;background:#efefed"><td style="text-align:left">Total</td><td>'+(tC||'—')+'</td><td>'+E(tT)+'</td><td>100 %</td>'+(cmp?cmpCells(tT,tP,tF):'')+(grp?stN.map(function(k){ return '<td>'+(tM[k]?E(tM[k]):'—')+'</td>'; }).join(''):'')+'</tr>';
    var ttl2=all?'Détail par poste':((isC&&mode==='sub')?'Détail par type de dépense':((isC&&mode==='veh')?'Détail par plaque':'Détail par fournisseur'));
    h+='<h3>'+ttl2+'</h3><div class="sub" style="color:#737372;margin:-2px 0 6px">Période : <b>'+fgPL(r)+'</b>. Le total et les colonnes des magasins portent sur cette même période. « '+((isC&&mode==='veh')?'Passages':'Nb')+' » = '+((isC&&mode==='veh')?'nombre de passages en station':'nombre de factures')+'.'+(cmp?' Comparaison avec l\'exercice précédent (oct. 2025 à sept. 2026) : mêmes mois, total de l\'exercice et moyenne mensuelle ; rouge = hausse, vert = baisse. Un mois en cours est incomplet (factures encore à recevoir) : l\'écart « même période » baisse mécaniquement, la moyenne mensuelle est plus parlante.':'')+(nMasq?' '+nMasq+' ligne'+(nMasq>1?'s':'')+' à 0 € sur la période masquée'+(nMasq>1?'s':'')+'.':'')+'</div><div class="c-sc"><table class="c-tbl"><thead><tr>'+th+'</tr></thead><tbody>'+body+'</tbody></table></div>';
    // constats
    var C=[];
    C.push('Total de '+E(tt)+' HT sur '+fgPL(r)+', soit '+E(avg)+' par mois'+(pca!=null?', '+pca.toLocaleString('fr-FR',{maximumFractionDigits:2})+' % du CA HT (oct. à août).':'.'));
    if(rows.length&&tt>0){ var t0=rows[0]; if(isC&&mode==='veh'){ var tv=0; Object.keys(X.four).forEach(function(k){ tv+=cbSum(X.four[k].v,r); }); C.push('Répartition par plaque d\'après les PDF Fleet Pro (consommations, frais de gestion et abonnement) : '+E(tv)+' sur la période, contre '+E(tt)+' pour tout le poste dans DocuWare. Les plaques ne figurent que dans les PDF : un écart signale une facture non lue ou d\'un autre fournisseur (péages, parkings).'); }
    C.push((all?'Poste':((isC&&mode==='sub')?'Type':((isC&&mode==='veh')?'Plaque':'Fournisseur')))+' le plus important : '+t0.n+', '+E(t0.tot)+' soit '+Math.round(100*t0.tot/tt)+' % du total.'); }
    var sorted=mo.map(function(v,i){ return [v,i]; }).sort(function(a,b){ return a[0]-b[0]; }), med=sorted[Math.floor(sorted.length/2)][0];
    if(nmo>=4&&med>0&&tot[iMax]>1.5*med) C.push('Mois atypique : '+fgML(iMax)+' ('+E(tot[iMax])+'), '+Math.round(100*tot[iMax]/med-100)+' % au-dessus de la médiane mensuelle ('+E(med)+').');
    var s1=cbSum(tot,[0,5]), s2=cbSum(tot,[6,11]); if(s1>0) C.push('Second semestre (avr. à sept.) '+E(s2)+' contre '+E(s1)+' au premier (oct. à mars) : '+P(100*(s2-s1)/s1)+'. Les dates sont celles des factures, pas de la consommation.');
    if(grp){ var ms=Object.keys(X.mag).map(function(k){ return [k,cbSum(X.mag[k],r)]; }).sort(function(a,b){ return b[1]-a[1]; }); if(ms.length>1) C.push('Par magasin : '+ms.map(function(x){ return (CBL[x[0]]||x[0])+' '+E(x[1]); }).join(', ')+'.'); var cm=ents.filter(function(e){ return e.fg&&e.C; }).map(function(e){ var R={}; e.C.rows.forEach(function(x){R[x.k]=x;}); var tv=all?ids.reduce(function(a,p){ return a+(A[p].mag[e.name]?cbSum(A[p].mag[e.name],[0,10]):0); },0):(X.mag[e.name]?cbSum(X.mag[e.name],[0,10]):0); return [CBL[e.name]||e.name,R.ca?100*tv/R.ca.real:null]; }).filter(function(x){ return x[1]!=null; }).sort(function(a,b){ return b[1]-a[1]; }); if(cm.length>1) C.push('Poids sur le CA HT (oct. à août) : '+cm.map(function(x){ return x[0]+' '+x[1].toLocaleString('fr-FR',{maximumFractionDigits:2})+' %'; }).join(', ')+'. Mulhouse et Baeumlin Création n\'ont pas de CA dans l\'outil.'); }
    var dup=0, seen={}; ents.forEach(function(e){ if(!e.fg) return; });
    h+='<h3>Constats chiffrés</h3><div class="g-lecture"><ul style="margin:0 0 0 18px;padding:0">'+C.map(function(x){ return '<li style="margin:4px 0">'+x+'</li>'; }).join('')+'</ul></div>';
    var AC=all?['Ouvrir chaque poste du plus coûteux au moins coûteux et traiter d\'abord les trois premiers.','Faire valider chaque mois le total des frais généraux par magasin contre le budget de la comptable.']:(FGACT[poste]||[]).slice();
    if(!all&&!(isC&&mode==='veh')&&rows.length&&tt>0&&rows[0].tot/tt>0.4) AC.unshift('Un seul fournisseur pèse '+Math.round(100*rows[0].tot/tt)+' % du poste ('+rows[0].n+') : négocier ou mettre en concurrence.');
    h+='<h3>Plan d\'action</h3><div class="g-lecture"><ul style="margin:0 0 0 18px;padding:0">'+AC.map(function(x){ return '<li style="margin:4px 0">'+x+'</li>'; }).join('')+'</ul></div>';
    var att=['collecteur DocuWare : montants HT tels qu\'indexés, dates de facture'];
    if(A['A classer']) att.push(Math.round(A['A classer'].n)+' factures encore « à classer » ('+E(fgT(A['A classer'].tot))+')');
    if(grp||ents.some(function(e){ return e.name==='Mulhouse'; })) att.push('compta de Mulhouse et de Baeumlin Création pour la part du CA');
    h+='<div class="g-nodata" style="margin-top:12px"><b>Données en attente</b> : '+att.join(' ; ')+'.</div>';
    box.innerHTML=h;
    box.querySelector('.fgback').onclick=function(){ window.__fgSub=fgUp(); window.__fgPage(box,ents,grp); };
    fgPerBind(box,function(){ fgPoste(box,ents,grp,poste); });
    box.querySelectorAll('.fgp').forEach(function(b){ b.onclick=function(){ if(b.dataset.mode){ cbS.fgm=b.dataset.mode; cbS.hid={}; } fgPoste(box,ents,grp,poste); }; });
    box.querySelectorAll('.fgl').forEach(function(b){ b.onclick=function(){ cbS.hid[b.dataset.k]=!cbS.hid[b.dataset.k]; fgPoste(box,ents,grp,poste); }; });
    box.querySelectorAll('.fgpo').forEach(function(a){ a.onclick=function(ev){ ev.preventDefault(); window.__fgFour=true; cbS.hid={}; window.__fgFrom='__all'; window.__fgSub=a.dataset.p; window.__fgPage(box,ents,grp); window.scrollTo({top:0}); }; });
  }
  function fgAclList(ents,mode){ ensureCls(ents); var acc={}; ents.forEach(function(e){ var d=e.fg; if(!d) return; d.R.forEach(function(r){ var p=d.P[r[1]], n=d.F[r[2]]; var ok=(mode==='all')?true:(mode==='excl')?(p!=='A classer'&&!FGDIR[p]):(p==='A classer'); if(!ok) return; var o=acc[n]=acc[n]||{n:n,p:p,ht:0,nb:0,mags:{}}; o.ht+=r[3]; o.nb+=r[4]; o.mags[e.name]=1; }); }); return Object.keys(acc).map(function(k){ return acc[k]; }).sort(function(a,b){ var rk=function(o){ return o.p==='A classer'?2:(!(FGDIR[o.p]||/^Carbur/.test(o.p))?1:0); }; var A=0, B=0; if(A!==B) return B-A; return Math.abs(b.ht)-Math.abs(a.ht); }); }
var FGPOSTES=["Assurances", "Carburant & déplacements", "Cotisations & dons", "Crédit-bail & financement", "Entretien & maintenance", "Entretien véhicules", "Fournitures & consommables", "Honoraires & conseil", "Impôts & taxes", "Informatique & logiciels", "Intragroupe", "Investissements & agencement", "Loyers", "Notes de frais", "Personnel & formation", "Publicité & communication", "Réceptions & événements", "Transport & livraison", "Télécoms & internet", "Énergie & fluides", "Enseigne Weldom - redevances & services", "Enseigne Weldom - ristournes & régularisations"];
  var P2S=window.__P2S={"Énergie & fluides": "Énergie", "Assurances": "Assurances", "Télécoms & internet": "Télécoms", "Informatique & logiciels": "Informatique", "Loyers": "Loyers", "Crédit-bail & financement": "Crédit-bail", "Entretien & maintenance": "Entretien", "Entretien véhicules": "Entretien véhicules", "Honoraires & conseil": "Honoraires", "Publicité & communication": "Publicité", "Transport & livraison": "Transport", "Personnel & formation": "Personnel & formation", "Fournitures & consommables": "Fournitures", "Réceptions & événements": "Réceptions", "Cotisations & dons": "Cotisations", "Impôts & taxes": "Impôts & taxes", "Carburant & déplacements": "Carburant", "Notes de frais": "Notes de frais", "Enseigne Weldom - redevances & services": "Enseigne Weldom", "Enseigne Weldom - ristournes & régularisations": "Weldom ristournes", "Intragroupe": "Intragroupe", "Investissements & agencement": "Investissements"}, S2L=window.__S2L={}; Object.keys(P2S).forEach(function(k){ S2L[P2S[k]]=k; });
function fgAcl(box,ents,back,mode){ if(!(window.__rhOpened&&window.__rhOpened())){ box.innerHTML=fgBack()+'<div class="v-lock"><h3>Fournisseurs à classer</h3><div class="sub" style="color:#737372;margin-bottom:8px">Noms de fournisseurs protégés : même clé personnelle que la gestion d\'effectif.</div><div><input type="password" id="aclpw" placeholder="Clé personnelle" autocomplete="off" style="padding:8px;border:1px solid #d6d6d3;border-radius:6px;width:100%;box-sizing:border-box;margin-bottom:8px"> <button type="button" id="aclgo" style="width:100%;padding:10px 14px;border:0;border-radius:6px;background:#1d1d1b;color:#fff;font-weight:700">Ouvrir</button> <span id="aclerr" style="color:#b21f2d;font-size:13px"></span></div></div>'; var bk=box.querySelector('.fgback'); if(bk) bk.onclick=back; var go=function(){ var pw=document.getElementById('aclpw').value; if(!pw) return; document.getElementById('aclerr').textContent='Vérification…'; window.__rhUnlock(pw).then(function(){ fgAcl(box,ents,back,mode); },function(){ document.getElementById('aclerr').textContent='Clé incorrecte.'; }); }; document.getElementById('aclgo').onclick=go; document.getElementById('aclpw').onkeydown=function(e){ if(e.key==='Enter') go(); }; return; }
  var L=fgAclList(ents,mode), sel={}; try{ sel=JSON.parse(localStorage.getItem('acl_sel')||'{}')||{}; }catch(e){}
  var esc=function(t){ return String(t==null?'':t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); };
  var perso=function(n){ return false; };
  var save=function(){ try{ localStorage.setItem('acl_sel',JSON.stringify(sel)); }catch(e){} };
  var opts=FGPOSTES.concat(['Exclu']);
  var OPG=function(cur){ var op=function(q){ return '<option value="'+esc(q)+'"'+(cur===q?' selected':'')+'>'+esc(q)+'</option>'; }; var sv=FGPOSTES.filter(function(q){ var c=P2S[q]||q; return FGDIR[c]||/^Carbur/.test(c); }), hp=FGPOSTES.filter(function(q){ return sv.indexOf(q)<0; }); return '<optgroup label="✅ Charges suivies (tuiles)">'+sv.map(op).join('')+'</optgroup><optgroup label="⚪ Hors périmètre">'+hp.map(op).join('')+'</optgroup><optgroup label="🚫">'+op('Exclu')+'</optgroup>'; };

  var h=fgBack()+'<h3 style="margin:6px 0">'+(mode==='all'?'📋 Fournisseurs : classer / exclure / modifier':mode==='excl'?'🚫 Fournisseurs exclus du périmètre du directeur':'🗂️ À classer')+'</h3>';
  h+='<div class="sub" style="color:#737372;margin-bottom:8px">'+(mode==='all'?'Tous les fournisseurs : du plus gros au plus petit montant. Change le poste ou choisis <b>Exclu</b> pour arbitrer.':mode==='excl'?'Fournisseurs rangés dans un poste hors périmètre (loyers, intragroupe, impôts, investissements…) ou marqués « Exclu ». Pour en réintégrer un, choisis un autre poste.':'Choisis un poste pour chaque fournisseur, ou <b>Exclu</b> pour le sortir du périmètre.')+' Puis télécharge le fichier : il sera appliqué à la prochaine collecte sur le PC. Les personnes physiques se classent directement dans <b>postes_fournisseurs.json</b>.</div>';
  h+='<div style="margin:8px 0;display:flex;gap:8px;flex-wrap:wrap;align-items:center"><button type="button" class="aclRel rhb" title="Relit les factures déjà envoyées depuis le PC (collecte DocuWare). Ne lance pas de collecte.">↻ Recharger les données</button><span class="aclRm sub"></span></div>';
  h+='<div style="margin:8px 0"><button type="button" class="aclDl" style="padding:8px 14px;border:0;border-radius:999px;background:#1d1d1b;color:#fff;font:inherit;font-weight:700;cursor:pointer">⬇ Télécharger classement_ajouts.json</button> <span class="aclN" style="margin-left:8px;font-weight:700"></span></div>';
  h+='<div class="c-sc"><table class="c-tbl"><thead><tr><th>Fournisseur</th><th>Magasins</th><th>Factures</th><th>Total HT</th><th>Statut</th><th>Poste</th></tr></thead><tbody>';
  var EF=function(x){ var v=sel[x.n]; return v?{p:(P2S[v]||v)}:x; }, KD=function(x){ return x.p==='A classer'?'acl':x.p==='Exclu'?'ex':(FGDIR[x.p]||/^Carbur/.test(x.p))?'in':'hp'; }, KB={acl:'<span style="color:#b26a00;font-weight:700">🗂️ À classer</span>',ex:'<span style="color:#b21f2d;font-weight:700">🚫 Exclu</span>',hp:'<span style="color:#6b4fa0;font-weight:700">⚪ Hors périmètre</span>','in':'<span style="color:#1f7a3d;font-weight:700">✅ Inclus</span>'}, KT={acl:'',ex:'#fdeeee',hp:'#f1eef8','in':''};
  L.forEach(function(x,i){ var p=perso(x.n), k=KD(EF(x)), cur=sel[x.n]||(x.p==='A classer'?'':(S2L[x.p]||x.p)); h+='<tr data-k="'+k+'"'+(KT[k]?' style="background:'+KT[k]+'"':'')+'><td>'+(window.__fgPN&&window.__fgPN[x.n]?esc(window.__fgPN[x.n])+'<div style="font-size:11px;color:#737372">'+esc(x.n)+'</div>':esc(x.n))+'</td><td style="text-align:left">'+Object.keys(x.mags).map(function(m){ return CBL[m]||m; }).join(', ')+'</td><td>'+x.nb+'</td><td>'+E(x.ht)+'</td><td style="text-align:left;white-space:nowrap">'+KB[k]+'</td><td style="text-align:left">'+(p?'<span style="color:#737372">personne physique : se règle sur le PC</span>':'<select class="aclS" data-i="'+i+'" style="font:inherit;padding:4px 6px;max-width:230px">'+(mode==='excl'?'':'<option value="">— à classer —</option>')+(x.p!=='A classer'&&opts.indexOf(S2L[x.p]||x.p)<0?'<option selected>'+esc(x.p)+'</option>':'')+OPG(cur)+'</select>')+'</td></tr>'; });
  if(!L.length) h+='<tr><td colspan="6" style="text-align:left;color:#737372">Aucun fournisseur.</td></tr>';
  var NK={acl:0,ex:0,hp:0,'in':0}; L.forEach(function(x){ NK[KD(EF(x))]++; });
  h=h.replace('<div class="c-sc"><table class="c-tbl"><thead><tr><th>Fournisseur','<div class="aclF" style="margin:8px 0;display:flex;gap:6px;flex-wrap:wrap">'+[['','Tous',L.length],['acl','🗂️ À classer',NK.acl],['in','✅ Inclus',NK['in']],['hp','⚪ Hors périmètre',NK.hp],['ex','🚫 Exclu',NK.ex]].map(function(c){ return '<button type="button" data-f="'+c[0]+'" style="font:inherit;font-size:13px;padding:4px 12px;border-radius:999px;border:1px solid #d9d9d6;background:'+(c[0]===''?'#1d1d1b':'#fff')+';color:'+(c[0]===''?'#fff':'#1d1d1b')+';cursor:pointer">'+c[1]+' ('+c[2]+')</button>'; }).join('')+'</div><div class="c-sc"><table class="c-tbl"><thead><tr><th>Fournisseur');
  h+='</tbody></table></div>'; box.innerHTML=h;
  box.querySelectorAll('.aclF button').forEach(function(b){ b.onclick=function(){ var f=b.dataset.f; box.querySelectorAll('.aclF button').forEach(function(o){ var on=o===b; o.style.background=on?'#1d1d1b':'#fff'; o.style.color=on?'#fff':'#1d1d1b'; }); box.querySelectorAll('tbody tr[data-k]').forEach(function(t){ t.style.display=(!f||t.dataset.k===f)?'':'none'; }); }; });
  var diff=function(){ var o={}; Object.keys(sel).forEach(function(k){ var x=null; fgAclList(ents,'all').some(function(y){ if(y.n===k){ x=y; return true; } }); if(x&&!perso(k)&&sel[k]) o[k]=sel[k]; }); return o; };
  var upd=function(){ box.querySelector('.aclN').textContent=Object.keys(diff()).length+' modification(s) en attente de téléchargement'; }; upd();
  box.querySelector('.fgback').onclick=back;
  
  box.querySelectorAll('.aclS').forEach(function(s){ s.onchange=function(){ var x=L[+s.dataset.i]; if(s.value) sel[x.n]=s.value; else delete sel[x.n]; var tr=s.closest('tr'), k=KD(EF(x)); tr.dataset.k=k; tr.style.background=KT[k]||''; tr.children[4].innerHTML=KB[k]; var N={acl:0,ex:0,hp:0,'in':0}; L.forEach(function(y){ N[KD(EF(y))]++; }); box.querySelectorAll('.aclF button').forEach(function(b){ var f=b.dataset.f; b.textContent=b.textContent.replace(/\(\d+\)$/,'('+(f?N[f]:L.length)+')'); }); var af=box.querySelector('.aclF button[data-f=""]'); save(); upd(); }; });
  box.querySelector('.aclRel').onclick=function(){ var mm=box.querySelector('.aclRm'); mm.style.color=''; mm.textContent='Rechargement…'; if(!window.__fgReloadAll){ mm.textContent='Indisponible.'; return; } window.__fgReloadAll().then(function(r){ mm.style.color=r.ok?'#1e7a34':'#b21f2d'; mm.textContent=r.msg; }); };
  box.querySelector('.aclDl').onclick=function(){ var o=diff(); if(!Object.keys(o).length){ alert('Aucune modification.'); return; } var a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([JSON.stringify(o,null,1)],{type:'application/json'})); a.download='classement_ajouts.json'; document.body.appendChild(a); a.click(); a.remove(); };
}
function fgCompta(ents){ var rows=[], per='';
    ents.forEach(function(e){ if(!e.C||!e.fg) return; var R={}; e.C.rows.forEach(function(x){ R[x.k]=x; }); if(!R.ext) return; per=per||e.C.periode||'';
      var m=fgZ(), XC={'Investissements & agencement':1,'Weldom ristournes':1}; e.fg.R.forEach(function(r){ if(!XC[e.fg.P[r[1]]]) m[r[0]]+=r[3]; }); rows.push({n:e.name,ext:R.ext,m:m}); });
    if(!rows.length) return '';
    var M=['oct.','nov.','déc.','janv.','févr.','mars','avr.','mai','juin','juil.','août'], pp=function(v){ return v==null?'—':(v>=0?'+':'')+(Math.round(v*10)/10).toLocaleString('fr-FR')+' %'; };
    var h='<h3 style="margin:18px 0 4px">Lien avec la comptabilité · charges externes</h3><div class="sub" style="color:#737372;margin-bottom:8px">Exercice du 01/10 au 30/09. Comptabilité (Sage) cumulée '+per+', comparée aux factures DocuWare sur la même période, par date de facture (hors investissements et ristournes Weldom, qui ne sont pas des charges externes).</div>';
    h+='<div class="c-sc"><table class="c-tbl"><thead><tr><th>Magasin</th><th>Charges externes compta</th><th>Budget</th><th>N-1</th><th>vs N-1</th><th>DocuWare (hors invest. et ristournes)</th><th>Part retrouvée dans DocuWare</th><th>Non retrouvé</th></tr></thead><tbody>';
    rows.forEach(function(r){ var dw=cbSum(r.m,[0,10]), c=r.ext.real; h+='<tr><td><b>'+(CBL[r.n]||r.n)+'</b></td><td>'+E(c)+'</td><td>'+E(r.ext.bud)+'</td><td>'+E(r.ext.n1)+'</td><td>'+pp(r.ext.n1?100*(c-r.ext.n1)/r.ext.n1:null)+'</td><td>'+E(dw)+'</td><td>'+(c?Math.round(1000*dw/c)/10:0).toLocaleString('fr-FR')+' %</td><td>'+E(c-dw)+'</td></tr>'; });
    h+='</tbody></table></div>';
    h+='<div style="font-weight:700;margin:12px 0 4px">Évolution mensuelle des factures DocuWare (cumul depuis octobre)</div><div class="c-sc"><table class="c-tbl"><thead><tr><th>Magasin</th>'+M.map(function(x){ return '<th>'+x+'</th>'; }).join('')+'<th>Compta fin août</th></tr></thead><tbody>';
    rows.forEach(function(r){ var c=0; h+='<tr><td><b>'+(CBL[r.n]||r.n)+'</b></td>'+M.map(function(x,i){ c+=r.m[i]; return '<td>'+E(c)+'</td>'; }).join('')+'<td><b>'+E(r.ext.real)+'</b></td></tr>'; });
    h+='</tbody></table></div><div class="g-lecture" style="margin-top:8px">Les factures DocuWare ne couvrent pas tout le poste « charges externes » de la compta (provisions, factures non parvenues, régularisations, loyers hors DocuWare). L\'écart « non retrouvé » doit rester stable d\'un mois à l\'autre : s\'il grandit, des factures sont en retard dans DocuWare ou la compta a passé des écritures de régularisation. La situation de septembre complétera la courbe.</div>';
    return h; }
  window.__fgPage=function(box,ents,grp,repaint){
    var sub=window.__fgSub;
    if((sub==='acl'||sub==='excl'||sub==='all')&&grp){ fgAcl(box,ents,function(){ window.__fgSub=null; window.__fgPage(box,ents,grp,repaint); },sub); return; }
    if(sub){ cbS.fgm=window.__fgFour?'four':null; window.__fgFour=false; fgPoste(box,ents,grp,sub); return; }
    var A=fgAgg(ents), has=Object.keys(A).length>0, CP=Object.keys(A).filter(function(p){ return /^Carburant/.test(p); })[0]; if(CP){ FGDIR[CP]=1; FGICO[CP]='⛽'; }
    var bub=function(ic,t,k,sub2,id,warn){ return '<button type="button" class="fgb" '+(id?'data-sub="'+id+'"':'disabled style="opacity:.65;cursor:default" ')+' style="text-align:left;font:inherit;cursor:pointer;border:1px solid '+(warn?'#e0a900':'#8a5a2b')+';border-radius:18px;padding:16px 18px;min-height:118px;background:'+(warn?'#fff8ee':'#fff')+';color:#1d1d1b;box-shadow:0 2px 8px rgba(18,38,58,.12)"><div style="font-size:26px;line-height:1">'+ic+'</div><div style="font-weight:800;font-size:16px;margin:8px 0 2px">'+t+'</div><div style="font-size:20px;font-weight:800">'+k+'</div><div style="font-size:12.5px;margin-top:2px;color:#737372">'+sub2+'</div></button>'; };
    var iKey=grp?'GROUPE':(ents[0]&&ents[0].name), mj=window.__fgInfo[iKey], mjt=mj?new Date(mj).toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):'version de départ (13/10/2026)'; var dd=window.__fgInfo[iKey+'_d']; if(dd) mjt+=' · dernière facture du '+new Date(dd).toLocaleDateString('fr-FR');
    var h='<h3 style="margin:14px 0 4px">Frais généraux</h3><div class="sub" style="margin-bottom:10px;color:#737372">Choisis un poste sur lequel le directeur peut agir. Factures DocuWare à jour : <b>'+mjt+'</b> <button type="button" class="fgref" style="margin-left:6px;padding:3px 10px;border:1px solid #d6d6d3;border-radius:999px;background:#fff;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer" title="Relit les factures déjà envoyées depuis le PC (collecte DocuWare). Ne lance pas de collecte.">↻ Recharger les données</button> <span class="fgrm" style="font-size:12.5px"></span><div class="sub" style="color:#737372;font-size:12px;margin-top:4px">Les factures sont envoyées depuis le PC par « Collecte automatique DocuWare » (réponse o à « Envoyer vers l\'outil ? »). Ce bouton relit simplement ce qui a été envoyé ; la page le fait aussi toute seule à l\'ouverture.</div></div>'+fgPerBar(ents)+'<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:12px">';
    var ids=Object.keys(A).filter(function(p){ return FGDIR[p]&&p!==CP; }).sort(function(a,b){ return Math.abs(fgT(A[b].tot))-Math.abs(fgT(A[a].tot)); }), gt=0; ids.forEach(function(p){ gt+=fgT(A[p].tot); }); if(CP) gt+=fgT(A[CP].tot);
    if(has) h+=bub('📊','Vue d\'ensemble',E(gt),'tous postes DocuWare · '+fgPL(fgR()),'__all');
    if(grp){ window.__fgAll=''; var AC=fgAclList(ents,'acl'); window.__fgAll='<div style="margin-top:10px;text-align:right"><button type="button" class="fgb" data-sub="all" style="font:inherit;font-size:12px;color:#737372;background:none;border:1px solid #d9d9d6;border-radius:14px;padding:4px 12px;cursor:pointer">📋 Fournisseurs : classer / exclure ('+AC.length+' à classer)</button></div>'; }
    if(CP){ gt+=0; h+=bub('⛽','Carburant & déplacements',E(fgT(A[CP].tot)),fgN(A[CP].nm)+' factures · '+fgPL(fgR())+' · calculé sur les factures',CP); }
    else h+=bub('⛽','Carburant & déplacements','—','données en attente : factures carburant pas encore reçues de DocuWare',null);
    ids.forEach(function(p){ h+=bub(FGICO[p]||'•',((window.__S2L||{})[p]||p),E(fgT(A[p].tot)),fgN(A[p].nm)+' factures · '+fgPL(fgR()),p); });
    h+='</div>'; if(grp&&window.__fgAll) h+=window.__fgAll;
    h+=fgCompta(ents);
    var ex=Object.keys(A).filter(function(p){ return !FGDIR[p]; }).sort(function(a,b){ return Math.abs(fgT(A[b].tot))-Math.abs(fgT(A[a].tot)); });
    if(ex.length) h+='<div class="g-lecture" style="margin-top:14px"><b>Hors périmètre du directeur, non affichés :</b> '+ex.map(function(p){ return (p==='A classer'?'à classer':((window.__S2L||{})[p]||p))+' '+E(fgT(A[p].tot)); }).join(' · ')+'.</div>';
    if(!has) h+='<div class="g-nodata" style="margin-top:14px"><b>Données en attente</b> : factures de frais généraux pour ce magasin.</div>';
    box.innerHTML=h; fgPerBind(box,function(){ window.__fgPage(box,ents,grp,repaint); }); box.querySelectorAll('.fgb').forEach(function(b){ b.onclick=function(){ window.__fgFrom=null; window.__fgSub=b.dataset.sub; window.__fgPage(box,ents,grp,repaint); window.scrollTo({top:0}); }; });
    var fm0=box.querySelector('.fgrm'); if(fm0&&window.__fgFlash){ fm0.textContent=window.__fgFlash; fm0.style.color='#1e7a34'; window.__fgFlash=''; }
    var rb=box.querySelector('.fgref'); if(rb){ rb.style.display='none'; var s1=rb.nextElementSibling; while(s1){ s1.style.display='none'; s1=s1.nextElementSibling; } } if(rb) rb.onclick=function(){ var msg=box.querySelector('.fgrm'); msg.style.color=''; msg.textContent='Rechargement…'; var wasQ=!!window.__fgQuiet, oldMaj=window.__fgInfo[iKey]; var pw=grp?window.__GRPPW:UNLPW[ents[0].name];
      fgFetch(iKey,pw).then(function(d){ if(!d||!(grp?d.S:d.FG)){ if(window.__fgQuiet){ window.__fgQuiet=false; msg.textContent=''; return; } msg.style.color='#b21f2d'; msg.textContent='Rien reçu : '+(window.__fgErr||'données incomplètes')+'. Lance « Collecte automatique DocuWare » sur le PC et réponds o à l\'envoi.'; return; }
        if(grp){ Object.keys(d.S).forEach(function(k){ (window.__GRPU[k]=window.__GRPU[k]||{}).FG=d.S[k]; }); ents.forEach(function(e){ var g=GU(e.name); if(g) e.fg=g.FG; }); } else { UNL[iKey].FG=d.FG; ents[0].fg=d.FG; }
        window.__fgInfo[iKey]=d.maj; window.__fgInfo[iKey+'_d']=d.der; window.__fgQuiet=false; if(!wasQ){ var fd=function(x){ return new Date(x).toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}); }; window.__fgFlash=(oldMaj&&oldMaj===d.maj)?'✓ Déjà à jour : aucun nouvel envoi depuis le '+fd(d.maj)+'.':'✓ Nouvelles données reçues (envoi du '+fd(d.maj)+(d.der?', dernière facture du '+new Date(d.der).toLocaleDateString('fr-FR'):'')+').'; } window.__fgPage(box,ents,grp,repaint); }); };
    if(rb&&Date.now()-(window.__fgAutoT||0)>300000){ window.__fgAutoT=Date.now(); window.__fgQuiet=true; setTimeout(function(){ if(document.body.contains(rb)) rb.click(); },300); }
  };
  
      function fgl(st,fm){
        var ents=st.map(function(x){ return {name:x.k,fg:GU(x.k)&&GU(x.k).FG}; }), L0=window.__fgL, A=fgAgg(ents); window.__fgL=L0;
        var mo=Math.min.apply(null,st.map(function(x){ return GU(x.k).COMPTA.mois||11; })), last=Math.max(0,mo-1);
        var ps=Object.keys(A).filter(function(p){ return FGDIR[p]||/^Carburant/.test(p); });
        var sm=function(a){ var t=0; for(var i=0;i<=last;i++) t+=a[i]||0; return t; };
        var tot=function(p,x){ return A[p].mag[x.k]?sm(A[p].mag[x.k]):null; };
        ps.sort(function(a,b){ var ta=0,tb=0; st.forEach(function(x){ ta+=tot(a,x)||0; tb+=tot(b,x)||0; }); return tb-ta; });
        var has=function(x){ return ents.filter(function(e){ return e.name===x.k&&e.fg&&e.fg.R&&e.fg.R.length; }).length>0; };
        var ok=st.filter(has);
        var h='<h3 style="margin:22px 0 4px;font-size:16px">Frais généraux · poids dans le CA</h3><div class="sub" style="margin-bottom:8px;color:#737372;font-size:13.5px">Factures DocuWare, cumul oct. 2025 à '+(mo<12?['oct.','nov.','déc.','janv.','févr.','mars','avril','mai','juin','juil.','août','sept.'][last]:'sept.')+' 2026, rapportées au CA HT de la même période. <span class="g-up">Vert</span> = poids le plus faible (meilleur), <span class="g-dn">rouge</span> = le plus élevé.</div>';
        if(ok.length<2||!ps.length) return h+'<div class="g-nodata"><b>Données en attente</b> : factures de frais généraux d\'au moins deux magasins.</div>';
        var rows=ps.map(function(p){ var v=st.map(function(x){ var t=has(x)?tot(p,x):null; return t==null?null:100*t/x.R.ca.real; }), o=v.filter(function(z){ return z!=null; }); if(!o.length) return '';
          var best=Math.min.apply(null,o), worst=Math.max.apply(null,o), li=v.indexOf(best);
          return '<tr style="border-top:1px solid var(--line)"><td style="padding:9px 12px;color:#334">'+(FGICO[p]||'')+' '+((window.__S2L||{})[p]||p)+'</td>'+v.map(function(z){ var bg=z==null?'':(z===best&&o.length>1?'background:#e4f3e7;color:#1e7a34;':(z===worst&&o.length>2?'background:#fbe6e8;color:#b21f2d;':'')); return '<td style="padding:9px 12px;text-align:right;font-weight:700;'+bg+'">'+fm(z)+'</td>'; }).join('')+'<td style="padding:9px 12px;font-weight:800;color:'+st[li].col+'">'+(o.length>1?'🏆 '+st[li].nm:'—')+'</td></tr>'; }).join('');
        var tt=st.map(function(x){ if(!has(x)) return null; var t=0; ps.forEach(function(p){ t+=tot(p,x)||0; }); return 100*t/x.R.ca.real; }), to=tt.filter(function(z){ return z!=null; }), tb=Math.min.apply(null,to);
        var trow='<tr style="border-top:2px solid #1d1d1b;background:#faf7f2"><td style="padding:10px 12px;font-weight:800">Total frais généraux suivis</td>'+tt.map(function(z){ return '<td style="padding:10px 12px;text-align:right;font-weight:800;'+(z!=null&&z===tb?'color:#1e7a34;':'')+'">'+fm(z)+'</td>'; }).join('')+'<td style="padding:10px 12px;font-weight:800;color:'+st[tt.indexOf(tb)].col+'">🏆 '+st[tt.indexOf(tb)].nm+'</td></tr>';
        var th='<th style="text-align:left;padding:10px 12px">Poste</th>'+st.map(function(x){ return '<th style="padding:10px 12px;text-align:right;border-top:5px solid '+x.col+'">'+x.nm+'</th>'; }).join('')+'<th style="text-align:left;padding:10px 12px">Leader</th>';
        var miss=st.filter(function(x){ return !has(x); });
        return h+'<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid var(--line);border-radius:12px;font-size:14.5px;white-space:nowrap"><thead><tr style="background:#f4f4f2">'+th+'</tr></thead><tbody>'+rows+trow+'</tbody></table></div>'+(miss.length?'<div class="sub" style="margin-top:8px;color:#737372;font-size:13px">Pas encore de factures pour : '+miss.map(function(x){ return x.nm; }).join(', ')+'.</div>':''); }
      window.__ldBuild=function(){
        var st=Object.keys(PRIV).filter(function(k){ return k!=='Creation' && GU(k) && GU(k).COMPTA; }).map(function(k){ var R={}; GU(k).COMPTA.rows.forEach(function(r){R[r.k]=r;}); return {k:k,R:R,nm:CBL[k]||k,col:CBS[k]||'#1d1d1b'}; });
        if(st.length<2) return '<div class="sub" style="margin:10px 0;color:#737372">Il faut au moins deux magasins avec une comptabilité pour comparer.</div>';
        var pc=function(R,c){ return R[c]&&R.ca&&R.ca.real?100*R[c].real/R.ca.real:null; };
        var M=[
          {l:'Évolution du CA vs N-1',up:1,u:'%',f:function(R){ return R.ca.n1?100*(R.ca.real-R.ca.n1)/R.ca.n1:null; },sg:1},
          {l:'Taux de marge',up:1,u:'%',f:function(R){ return pc(R,'marge'); }},
          {l:'Masse salariale (% du CA)',up:0,u:'%',f:function(R){ return pc(R,'perso'); }},
          {l:'Charges externes (% du CA)',up:0,u:'%',f:function(R){ return pc(R,'ext'); }},
          {l:'EBE (% du CA)',up:1,u:'%',f:function(R){ return pc(R,'ebe'); }},
          {l:'Résultat avant impôt (% du CA)',up:1,u:'%',f:function(R){ return pc(R,'rai'); }}];
        var fm=function(v,sg){ return v==null?'—':(sg&&v>0?'+':'')+v.toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})+' %'; };
        var th='<th style="text-align:left;padding:10px 12px">Indicateur</th>'+st.map(function(x){ return '<th style="padding:10px 12px;text-align:right;border-top:5px solid '+x.col+'">'+x.nm+'</th>'; }).join('')+'<th style="text-align:left;padding:10px 12px">Leader</th>';
        var info=[];
        var body=M.map(function(m){ var vals=st.map(function(x){ return m.f(x.R); }), ok=vals.filter(function(v){ return v!=null; });
          var best=m.up?Math.max.apply(null,ok):Math.min.apply(null,ok), worst=m.up?Math.min.apply(null,ok):Math.max.apply(null,ok), li=vals.indexOf(best);
          info.push({m:m,vals:vals,best:best,li:li});
          return '<tr style="border-top:1px solid var(--line)"><td style="padding:10px 12px;color:#334">'+m.l+'</td>'+vals.map(function(v){ var bg=v==null?'':(v===best?'background:#e4f3e7;color:#1e7a34;':(v===worst&&ok.length>2?'background:#fbe6e8;color:#b21f2d;':'')); return '<td style="padding:10px 12px;text-align:right;font-weight:700;'+bg+'">'+fm(v,m.sg)+'</td>'; }).join('')+'<td style="padding:10px 12px;font-weight:800;color:'+st[li].col+'">🏆 '+st[li].nm+'</td></tr>'; }).join('');
        var cp=st.map(function(x,i){ var L=[]; info.forEach(function(n){ if(n.m.sg||n.li===i||n.vals[i]==null) return; var gap=n.m.up?n.best-n.vals[i]:n.vals[i]-n.best; if(gap<0.3) return; L.push({g:gap*x.R.ca.real/100,t:n.m.l.replace(' (% du CA)','')+' : '+fm(n.vals[i])+' contre '+fm(n.best)+' chez '+st[n.li].nm+' (écart '+gap.toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})+' pt, soit environ '+E(Math.round(gap*x.R.ca.real/100))+' sur l\'exercice)'}); });
          L.sort(function(a,b){ return b.g-a.g; });
          return '<div style="border:1px solid var(--line);border-top:5px solid '+x.col+';border-radius:12px;padding:12px 14px;background:#fff"><div style="font-weight:800;font-size:16px;margin-bottom:6px">'+x.nm+'</div>'+(L.length?'<ul style="margin:0;padding-left:18px;font-size:14px;line-height:1.5">'+L.slice(0,4).map(function(l){ return '<li>'+l.t+'</li>'; }).join('')+'</ul>':'<div style="font-size:14px;color:#1e7a34">Leader ou proche du leader sur tous les indicateurs.</div>')+'</div>'; }).join('');
        return '<div data-ldp="cr"><div class="sub" style="margin:8px 0;color:#737372;font-size:13.5px">Comparaison inter-magasins sur le cumul de l\'exercice en cours. <span class="g-up">Vert</span> = meilleur magasin, <span class="g-dn">rouge</span> = moins bon. Pour chaque magasin : ce qu\'il peut copier du leader.</div>'
          +'<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid var(--line);border-radius:12px;font-size:14.5px;white-space:nowrap"><thead><tr style="background:#f4f4f2">'+th+'</tr></thead><tbody>'+body+'</tbody></table></div>'
          +'<h3 style="margin:18px 0 8px;font-size:16px">À copier du leader, par magasin</h3><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px">'+cp+'</div></div><div data-ldp="fg">'+fgl(st,fm)+'</div>'; };
  window.__trophyC=function(root,m){
    var run=function(){ try{
      var T=window.__GRPT||{}, get=function(k){ var u=UNL[k]||(window.__GRPU||{})[k]||T[k]; return u&&u.COMPTA; };
      var st=Object.keys(PRIV).filter(function(k){ return k!=='Creation'&&get(k); }); if(st.length<2||st.indexOf(m)<0) return;
      var pc=function(R,c){ return R[c]&&R.ca&&R.ca.real?100*R[c].real/R.ca.real:null; };
      var M={'CA HT net':[1,function(R){ return R.ca.n1?100*(R.ca.real-R.ca.n1)/R.ca.n1:null; },'évolution du CA vs N-1'],
        'Marge sur ventes':[1,function(R){ return pc(R,'marge'); },'taux de marge'],'Taux de marge sur ventes':[1,function(R){ return pc(R,'marge'); },'taux de marge'],
        'EBE':[1,function(R){ return pc(R,'ebe'); },'EBE en % du CA'],'Résultat avant impôt':[1,function(R){ return pc(R,'rai'); },'résultat en % du CA'],
        'Charges de personnel / CA':[0,function(R){ return pc(R,'perso'); },'masse salariale en % du CA'],'Charges externes / CA':[0,function(R){ return pc(R,'ext'); },'charges externes en % du CA']};
      var V={}; Object.keys(M).forEach(function(l){ V[l]=st.map(function(k){ var R={}; get(k).rows.forEach(function(r){R[r.k]=r;}); return M[l][1](R); }); });
      root.querySelectorAll('.c-kpi .l').forEach(function(el){ var l=el.textContent.trim(); if(!M[l]||el.querySelector('.trp')) return; var v=V[l], i=st.indexOf(m), me=v[i]; if(me==null) return;
        var ok=v.filter(function(z){ return z!=null; }), best=M[l][0]?Math.max.apply(null,ok):Math.min.apply(null,ok); if(me!==best||ok.filter(function(z){ return z===best; }).length>1) return;
        var sp=document.createElement('span'); sp.className='trp'; sp.textContent=' 🏆'; sp.title='Meilleur du groupe : '+M[l][2]; sp.style.cssText='cursor:help'; el.appendChild(sp); });
    }catch(e){} };
    if(window.__GRPT||window.__GRPU) return run();
    var ag=((window.__DATA||{}).AUTO||{}).G; if(!ag||!(window.__DATA||{}).GRPW) return;
    decPriv(window.__DATA.GRPW,ag).then(function(o){ window.__GRPT=o; run(); },function(){}); };
  window.__comptaRender=function(m){
    if(window.__cbLast!==m){ window.__fgSub=null; cbS.hid={}; cbS.per='12'; cbS.mode='cat'; window.__cbLast=m; }
    if(m==='GROUPE'||m==='COMPARATIF'){
      if(!window.__GRPU){ root.innerHTML=window.__grpHtml; window.__grpBind(root,function(){ window.__comptaRender(m); }); return; }
      var rows=Object.keys(PRIV).filter(function(k){ return k!=='Creation'; }).map(function(k){ var o=GU(k)&&GU(k).COMPTA; if(!o) return '<tr><td><b>'+k+'</b></td><td colspan="5" style="text-align:left;color:#737372">Pas encore de comptabilité pour ce magasin</td></tr>';
        var R={}; o.rows.forEach(function(r){R[r.k]=r;}); var f=function(r){return r.real-r.bud;};
        return '<tr><td><b>'+k+'</b></td><td>'+E(R.ca.real)+'</td><td class="'+cls(f(R.ca))+'">'+P(100*f(R.ca)/R.ca.bud)+'</td><td>'+(100*R.marge.real/R.ca.real).toLocaleString('fr-FR',{maximumFractionDigits:2})+' %</td><td class="'+cls(f(R.ebe))+'">'+SE(f(R.ebe))+'</td><td class="'+cls(f(R.rai))+'">'+SE(f(R.rai))+'</td></tr>'; }).join('');
      var gsyn=(function(){
        var arr=function(v){ return v==null||v===0?'':(v>0?'▲ ':'▼ '); };
        var pcx=function(R,c,k){ return (R[c]&&R.ca&&R.ca[k]&&R[c][k]!=null)?100*R[c][k]/R.ca[k]:null; }; var pc=function(R,k){ return pcx(R,'perso',k); };
        var pt=function(d){ return d==null?'—':(d>0?'▲ +':(d<0?'▼ ':''))+d.toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})+' pt'; };
        var n1v=function(r){ return (r&&r.n1!=null)?r.real-r.n1:null; };
        var n1=function(r,pct){ var d=n1v(r); if(d==null) return '—'; return arr(d)+(pct?P(100*d/r.n1):SE(d)); };
        var ln=function(lab,val,c){ return '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;padding:9px 0;border-top:1px solid var(--line)"><span style="font-size:14.5px;color:#737372">'+lab+'</span><b class="'+(c||'')+'" style="font-size:17px;white-space:nowrap">'+val+'</b></div>'; };
        var cards=Object.keys(PRIV).filter(function(k){ return k!=='Creation'; }).sort(function(a,b){ var cv=function(k){ var o=GU(k)&&GU(k).COMPTA, r=o&&o.rows.filter(function(r){return r.k==='ca';})[0]; return r?r.real:-1; }; return cv(b)-cv(a); }).map(function(k){ var o=GU(k)&&GU(k).COMPTA, col=CBS[k]||'#1d1d1b', nm=CBL[k]||k;
          if(!o) return '<div style="border:2px dashed #d6d6d3;border-top:6px solid '+col+';border-radius:14px;padding:16px 18px;background:#fff"><div style="font-size:19px;font-weight:800">'+nm+'</div><div style="margin-top:10px;color:#737372;font-size:14.5px">Pas encore de comptabilité pour ce magasin.</div></div>';
          var R={}; o.rows.forEach(function(r){R[r.k]=r;}); var f=function(r){return r.real-r.bud;}, fCa=f(R.ca), fE=f(R.ebe), fR=f(R.rai), dB=(pc(R,'real')!=null&&pc(R,'bud')!=null)?pc(R,'real')-pc(R,'bud'):null, dN=(pc(R,'real')!=null&&pc(R,'n1')!=null)?pc(R,'real')-pc(R,'n1'):null, dX=(pcx(R,'ext','real')!=null&&pcx(R,'ext','n1')!=null)?pcx(R,'ext','real')-pcx(R,'ext','n1'):null;
          return '<div class="gcc" data-gst="'+k+'" tabindex="0" role="button" title="Ouvrir '+nm+'" style="cursor:pointer;border:1px solid var(--line);border-top:6px solid '+col+';border-radius:14px;padding:16px 18px;background:#fff;box-shadow:0 2px 8px rgba(18,38,58,.08)">'
            +'<div style="font-size:19px;font-weight:800">'+nm+' <span style="font-size:13px;font-weight:700;color:#737372">›</span></div>'
            +'<div style="margin:6px 0 10px"><div style="font-size:13px;color:#737372">Chiffre d\'affaires HT</div><div style="font-size:30px;font-weight:800;line-height:1.15">'+E(R.ca.real)+'</div></div>'
            +ln('EBE',E(R.ebe.real),cls(R.ebe.real))
            +ln('Résultat avant impôt',E(R.rai.real),cls(R.rai.real))
            +ln('Taux de marge',(100*R.marge.real/R.ca.real).toLocaleString('fr-FR',{maximumFractionDigits:2})+' %','')
            +ln('Masse salariale (% du CA)',pc(R,'real')==null?'—':pc(R,'real').toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})+' %','')
            +ln('Charges externes (% du CA)',pcx(R,'ext','real')==null?'—':pcx(R,'ext','real').toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})+' %','')
            +'<div style="margin-top:10px;padding:7px 0 0;border-top:2px solid var(--line);font-size:12.5px;font-weight:800;letter-spacing:.03em;text-transform:uppercase;color:#737372">Écart par rapport à N-1</div>'
            +ln('Chiffre d\'affaires',n1(R.ca,true),cls(n1v(R.ca)))
            +ln('EBE',n1(R.ebe),cls(n1v(R.ebe)))
            +ln('Résultat avant impôt',n1(R.rai),cls(n1v(R.rai)))
            +ln('Masse salariale (% du CA)',pt(dN),cls(dN,true))
            +ln('Charges externes',(R.ext&&R.ext.n1!=null)?arr(R.ext.real-R.ext.n1)+SE(R.ext.real-R.ext.n1):'—',cls((R.ext&&R.ext.n1!=null)?R.ext.real-R.ext.n1:null,true))
            +ln('Charges externes (% du CA)',pt(dX),cls(dX,true))
            +'</div>'; }).join('');
        return '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:16px;margin-top:12px">'+cards+'</div><div class="sub" style="margin-top:12px;color:#737372;font-size:13.5px">Touche un magasin pour ouvrir son compte de résultat. Écarts par rapport à l\'exercice précédent (N-1) : <span class="g-up">▲ vert</span> = mieux que l\'an dernier (pour les charges et la masse salariale, une baisse est en vert), <span class="g-dn">▼ rouge</span> = moins bien que l\'an dernier.</div>'; })();
      var gt=window.__gt||'syn', FGX=window.__fgx();
      function pg(){ var lock=[]; var C0=null, PR=''; Object.keys(PRIV).forEach(function(k){ var g=GU(k); if(!C0&&g&&g.COMPTA&&g.COMPTA.periode) C0=g.COMPTA; }); if(C0){ var MN={janvier:[31,'01'],février:[28,'02'],mars:[31,'03'],avril:[30,'04'],mai:[31,'05'],juin:[30,'06'],juillet:[31,'07'],août:[31,'08'],septembre:[30,'09'],octobre:[31,'10'],novembre:[30,'11'],décembre:[31,'12']}, mm=/(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+(\d{4})/i.exec(C0.periode||''), dd=String(C0.exercice||'').split('→'); if(mm){ var q=MN[mm[1].toLowerCase()], yy=+mm[2], d=q[0]; if(q[1]==='02'&&((yy%4===0&&yy%100!==0)||yy%400===0)) d=29; PR=(dd[0]||'01/10/2025').trim()+' → '+d+'/'+q[1]+'/'+yy; } else PR=C0.exercice; } root.innerHTML='<div class="c-wrap"><div style="text-align:center;margin:6px 0 10px"><h2 style="margin:0 0 8px">Compte de résultat · Cumul exercice</h2>'+(C0?'<span style="display:inline-block;padding:10px 30px;border-radius:999px;background:#1d1d1b;color:#fff;font-weight:800;font-size:clamp(18px,5.5vw,28px);letter-spacing:.3px;white-space:nowrap">'+PR+'</span>':'')+'</div>'+(C0?'<div class="sub" style="color:#737372;font-size:13px;text-align:center;margin:0 0 8px">Groupe · situation arrêtée '+C0.periode+' ('+C0.mois+' mois) · exercice complet '+C0.exercice+'</div>':'<div class="sub" style="color:#737372;font-size:13px">Groupe</div>')+'<div class="v-tabs c-tabs"><button type="button" data-gt="syn" class="'+(gt==='syn'?'on':'')+'">Synthèse</button><button type="button" data-gt="fg" class="'+(gt==='fg'?'on':'')+'">Frais généraux</button><button type="button" data-gt="bud" class="'+(gt==='bud'?'on':'')+'">Budget 2026-27</button></div>'+(gt==='syn'?gsyn:gt==='fg'?'<div id="fgbox"></div>':gt==='bud'?'<div id="budbox"></div>':(lock.length?'<div class="sub" style="margin:6px 0;color:#737372">Magasins verrouillés, non comptés : '+lock.map(function(k){ return CBL[k]||k; }).join(', ')+'.</div>':'')+'<div id="cbbox"></div>')+'</div>';
        root.querySelectorAll('.gcc').forEach(function(c){ var go=function(){ var t=[].filter.call(document.querySelectorAll('#storebar button'),function(x){ return x.dataset.st===c.dataset.gst; })[0]; if(t) t.click(); }; c.onclick=go; c.onkeydown=function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); go(); } }; });
        root.querySelectorAll('.c-tabs button').forEach(function(b){ b.onclick=function(){ if(b.dataset.gt==='fg') window.__fgSub=null; gt=window.__gt=b.dataset.gt; pg(); }; });
        if(gt==='bud') window.__crBudget(root.querySelector('#budbox'),'GROUPE',true);
        if(gt==='fg') window.__fgPage(root.querySelector('#fgbox'),Object.keys(PRIV).map(function(k){ return {name:k,carb:GU(k)&&GU(k).CARB,C:GU(k)&&GU(k).COMPTA,fg:GU(k)&&GU(k).FG}; }),true); }
      pg(); (async function(){ var ch=false, pwx=window.__GRPPW||(((window.__DATA||{}).AUTO||{}).G), ks=Object.keys(PRIV).filter(function(k){ return k!=='Creation'; }); for(var i=0;i<ks.length;i++){ try{ if(await cptWarm(ks[i],pwx)) ch=true; }catch(e){} } if(ch&&root.offsetParent!==null) pg(); })(); return; }
    ouvrirPriv(m,root,function(){ var C=(window.__CPT&&window.__CPT[m])||UNL[m].COMPTA; if(!C){ root.innerHTML='<div class="c-wrap"><h2>Compte de résultat · '+(CBL[m]||m)+'</h2>'+(m==='Creation'?'':'<div class="g-nodata"><b>Pas de données comptables pour '+(CBL[m]||m)+'.</b></div>')+'<div id="fgbox"></div></div>'; window.__fgPage(root.querySelector('#fgbox'),[{name:m,carb:UNL[m].CARB,C:null,fg:UNL[m].FG}],false); return; } draw(m,C); });
  };
}

function demarrerVisite(V){
  var root=document.getElementById('viewVisite'), ST=['Non fait','En cours','Nouveau','Fait','Clos'], LB={'Fait':'✅ Fait · à valider'};
  var FIRST={}, cmEd=null, editId=null, editTp=null, unlockUntil=0, lockTimer=null, fS='all', fQ='', fZ='all', vtab='act', LS='visite_v2_', curM=null, busy=false, dirty={}, KEYS={};
  function key(s){return String(s).replace(/[^A-Za-z]/g,'');}
  function load(m){ var o={}; try{ o=JSON.parse(localStorage.getItem(LS+m)||'null'); }catch(e){ o=null; }
    if(!o){ try{ var v1=JSON.parse(localStorage.getItem('visite_v1_'+m)||'{}'); o={st:{},add:v1.add||[]}; Object.keys(v1.st||{}).forEach(function(i){ o.st[i]={s:v1.st[i],t:1}; }); }catch(e){ o={}; } }
    o.st=o.st||{}; o.add=o.add||[]; o.pr=o.pr||{}; o.tr=o.tr||{}; o.ed=o.ed||{}; o.tp=o.tp||{}; o.tz=o.tz||{}; o.cm=o.cm||{}; o.pf=o.pf||{}; o.vd=o.vd||{v:'2026-10-08',t:1}; return o; }
  function save(m,o){ try{ localStorage.setItem(LS+m,JSON.stringify(o)); }catch(e){} }
  function stOf(o,a){ var v=(o.st[a.id]&&o.st[a.id].s)||a.st; return v==='Différé'?'Non fait':v; }
  var LASTST=null; function setSt(t,bad){ LASTST=[t,bad]; var e=document.getElementById('vsync'); if(e){ e.textContent=t; e.style.color=bad?'#b21f2d':'#1e7a34'; } }
  function b64(u){ var s=''; u.forEach(function(c){s+=String.fromCharCode(c);}); return btoa(s); }
  function unb64(x){ return Uint8Array.from(atob(x),function(c){return c.charCodeAt(0);}); }
  async function vkey(m){ var ck='n'+m; if(KEYS[ck]) return KEYS[ck]; var pw=UNLPW[m]; if(!pw) throw new Error('cle'); var enc=new TextEncoder(); var km=await crypto.subtle.importKey('raw',enc.encode(pw),'PBKDF2',false,['deriveKey']);
    KEYS[ck]=await crypto.subtle.deriveKey({name:'PBKDF2',salt:enc.encode('visite-sync-'+m),iterations:200000,hash:'SHA-256'},km,{name:'AES-GCM',length:256},false,['encrypt','decrypt']); return KEYS[ck]; }
  async function encS(m,obj){ var iv=crypto.getRandomValues(new Uint8Array(12)); var ct=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv:iv},await vkey(m),new TextEncoder().encode(JSON.stringify(obj)))); var all=new Uint8Array(12+ct.length); all.set(iv); all.set(ct,12); return b64(all); }
  async function decS(m,v){ var all=unb64(v), pt; pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:all.slice(0,12)},await vkey(m),all.slice(12)); return JSON.parse(new TextDecoder().decode(pt)); }
  function merge(a,b){ var r={st:{},pr:{},tr:{},ed:{},tp:{},tz:{},cm:{},pf:{},add:[],vd:((a.vd&&b.vd)?(a.vd.t>=b.vd.t?a.vd:b.vd):(a.vd||b.vd||{v:'2026-10-08',t:1}))}; ['st','pr','tr','ed','tp','tz','cm','pf'].forEach(function(f){ [a[f]||{},b[f]||{}].forEach(function(S){ Object.keys(S).forEach(function(id){ if(!/^[A-Za-z0-9_-]{1,40}$/.test(id)) return; var x=S[id]; if(!x||typeof x!=='object') return; if(!r[f][id]||x.t>r[f][id].t) r[f][id]=x; }); }); });
    var seen={}; (a.add||[]).concat(b.add||[]).forEach(function(x){ if(!x||typeof x.id!=='string'||!/^[A-Za-z0-9_-]{1,40}$/.test(x.id)) return; if(!seen[x.id]){ seen[x.id]=1; r.add.push(x); } }); return r; }
  async function pushResume(m,o){ var D=UNL[m]&&UNL[m].VISITE; if(!D) return; var A=A0(D,o), c={'Non fait':0,'En cours':0,'Nouveau':0,'Fait':0,'Clos':0}; A.forEach(function(a){ c[a.st]=(c[a.st]||0)+1; });
    var op=A.filter(function(a){ return a.st!=='Clos'; }), tot=A.length;
    var r={m:m,v:(o.vd&&o.vd.v)||'',total:tot,ouvertes:op.length,p12:op.filter(function(a){return a.pr>=1&&a.pr<=2;}).length,nonfait:c['Non fait']||0,encours:c['En cours']||0,nouveau:c['Nouveau']||0,aval:c['Fait']||0,clos:c['Clos']||0,avanc:tot?Math.round(100*(c['Clos']||0)/tot):0,maj:new Date().toISOString()};
    await fetch(window.__SYNC_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({k:'resume_'+m,v:JSON.stringify(r),w:window.__wtok(m)})}); }
  async function syncNow(m){
    var url=window.__SYNC_URL||''; if(!url){ setSt('Synchronisation non configurée : données gardées sur cet appareil',1); return; }
    if(busy||!UNLPW[m]) return; if(!FIRST[m]){ FIRST[m]=1; dirty[m]=true; } busy=true; setSt('Synchronisation…');
    try{
      var r=await fetch(url+'?k='+encodeURIComponent('visite_'+m)+'&_='+Date.now()); var tx=await r.text(), j; try{ j=JSON.parse(tx); }catch(e2){ throw new Error('acces'); }
      var local=load(m), merged=local;
      if(j.v){ try{ var rem=await decS(m,j.v); merged=merge(local,rem); if(JSON.stringify(merge(rem,{}))!==JSON.stringify(merged)) dirty[m]=true; }catch(e){ merged=local; dirty[m]=true; } }
      var changed=JSON.stringify(merged)!==JSON.stringify(local); save(m,merged);
      if(dirty[m]||!j.v||changed&&false){ var pr=await fetch(url,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({k:'visite_'+m,v:await encS(m,merged),w:window.__wtok(m)})}); var rj=null; try{ rj=JSON.parse(await pr.text()); }catch(e3){} if(rj&&rj.ok===false) throw new Error('refus'); dirty[m]=false; try{ await pushResume(m,merged); }catch(e4){} }
      setSt('Synchronisé à '+new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}));
      var vt=document.getElementById('vtxt'); if(changed&&curM===m&&!(vt&&(vt.value||document.activeElement===vt))) drawV(m);
    }catch(e){ setSt((e&&e.message==='refus')?'Le script Google a refusé l\'écriture (jeton) : vérifier le script':(e&&e.message==='acces')?'Google refuse l\'accès : régler le déploiement sur « Tout le monde » (modifications gardées sur cet appareil)':'Hors connexion ou adresse bloquée : modifications gardées, envoi au prochain essai',1); }
    busy=false;
  }
  setInterval(function(){ if(curM&&UNLPW[curM]&&document.getElementById('viewVisite').style.display!=='none'&&!document.hidden) syncNow(curM); },20000);
  document.addEventListener('visibilitychange',function(){ if(!document.hidden&&curM&&UNLPW[curM]) syncNow(curM); });
  function esc(x){return String(x==null?'':x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
  var SNAP={};
  window.__visiteFait=function(st){ try{ var ks=(st==='GROUPE')?Object.keys(PRIV).filter(function(k){ return k!=='Creation'; }):[st], n=0, any=false; ks.forEach(function(k){ var g=GU(k), D=g&&g.VISITE; if(!D) return; any=true; var o=load(k); A0(D,o).forEach(function(a){ if(a.st==='Fait') n++; }); }); return any?n:null; }catch(e){ return null; } };
  window.__visiteRender=function(m){
    SNAP[m]=null;
    if(m==='GROUPE'||m==='COMPARATIF'){
      var SCOL={'Non fait':'#b21f2d','En cours':'#b08900','Nouveau':'#2a78d6','Différé':'#a3a3a1','Fait':'#0f9d8a','Clos':'#1e7a34'}, MCOL={Waldighoffen:'#1d5fa8',Hesingue:'#1e7a34',Sierentz:'#e0a900',Mulhouse:'#7b3fa0'};
      var S=Object.keys(PRIV).filter(function(k){ return k!=='Creation'; }).map(function(k){ var V=GU(k)&&GU(k).VISITE; if(!V) return {k:k,none:1};
        var o=load(k), c={}, urg=0, nop=0, cm=0, tot=0; V.actions.concat(o.add||[]).forEach(function(a){ var st=(o.st&&o.st[a.id]&&o.st[a.id].s)||a.st; if(st==='Différé') st='Non fait'; c[st]=(c[st]||0)+1; tot++; if(st!=='Clos'){ var pr=(o.pr&&o.pr[a.id]&&o.pr[a.id].p!=null)?o.pr[a.id].p:(a.pr0||0); if(pr&&pr<=2) urg++; if(!pr) nop++; if(o.cm&&o.cm[a.id]&&o.cm[a.id].txt) cm++; } });
        var open_=tot-(c['Clos']||0); return {k:k,c:c,tot:tot,open:open_,urg:urg,nop:nop,cm:cm,rate:tot?100*(c['Clos']||0)/tot:0,date:(o.vd&&o.vd.v)?o.vd.v.split('-').reverse().join('/'):'',prev:V.date}; });
      var ok=S.filter(function(x){ return !x.none; }), best=ok.length>1?ok.slice().sort(function(a,b){ return b.rate-a.rate; })[0]:null;
      var gT={open:0,urg:0,clos:0,tot:0}; ok.forEach(function(x){ gT.open+=x.open; gT.urg+=x.urg; gT.clos+=(x.c['Clos']||0); gT.tot+=x.tot; });
      var ln=function(l,v,col){ return '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;padding:8px 0;border-top:1px solid var(--line)"><span style="font-size:14px;color:#737372">'+l+'</span><b style="font-size:16px;white-space:nowrap;color:'+(col||'#1d1d1b')+'">'+v+'</b></div>'; };
      var rk={}; ok.slice().sort(function(a,b){ return b.rate-a.rate; }).forEach(function(x,i){ rk[x.k]=i+1; }); var MED=['','🥇','🥈','🥉','4e'];
      var ordS=ok.slice().sort(function(a,b){ return b.rate-a.rate; }).concat(S.filter(function(x){ return x.none; }));
      var cards=ordS.map(function(x){ var col=MCOL[x.k]||'#1d1d1b';
        if(x.none) return '<div class="pw pod3"><div class="plab">'+(ok.length+1)+'e</div><div style="border:2px dashed #d6d6d3;border-top:6px solid '+col+';border-radius:14px;padding:16px 18px;background:#fff"><div style="font-size:19px;font-weight:800">'+x.k+'</div><div style="margin-top:10px;color:#737372;font-size:14.5px">Pas encore de données de visite pour ce magasin.</div></div></div>';
        var bar=ST.map(function(s){ var n=x.c[s]||0; return n?'<i title="'+s+' : '+n+'" style="flex:'+n+';background:'+SCOL[s]+'"></i>':''; }).join('');
        var leg=ST.map(function(s){ return '<span style="display:inline-flex;align-items:center;gap:4px;font-size:12.5px;color:#334"><span style="width:9px;height:9px;border-radius:50%;background:'+SCOL[s]+'"></span>'+(LB[s]||s)+' <b>'+(x.c[s]||0)+'</b></span>'; }).join('');
        var lab=(ok.length>1&&rk[x.k])?(rk[x.k]===1?'🏆 meilleur avancement':(rk[x.k]===2?'🥈 2e':(rk[x.k]===3?'🥉 3e':rk[x.k]+'e'))):'';
        return '<div class="pw pod'+(ok.length>1?Math.min(rk[x.k],3):0)+'"><div class="plab'+(rk[x.k]===1?' p1':'')+'">'+(lab||'&nbsp;')+'</div><button type="button" class="vgc" data-st="'+x.k+'" style="text-align:left;font:inherit;cursor:pointer;border:1px solid var(--line);border-top:6px solid '+col+';border-radius:14px;padding:16px 18px;background:#fff;box-shadow:0 2px 8px rgba(18,38,58,.08);color:#1d1d1b;width:100%">'
          +'<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px"><div><div style="font-size:19px;font-weight:800">'+x.k+'</div>'+''+'</div><div style="text-align:right"><div style="font-size:28px;font-weight:800;line-height:1.1;color:'+(x.rate<30?'#b21f2d':(x.rate<60?'#e0701a':'#1e7a34'))+'">'+x.rate.toLocaleString('fr-FR',{maximumFractionDigits:0})+' %</div><div style="font-size:12px;color:#737372">avancement</div></div></div>'
          +'<div style="margin:6px 0 8px"><div style="font-size:13px;color:#737372">Actions ouvertes</div><div style="font-size:30px;font-weight:800;line-height:1.15">'+x.open+'<span style="font-size:15px;font-weight:600;color:#737372"> sur '+x.tot+'</span></div></div>'
          +'<div style="display:flex;height:12px;border-radius:6px;overflow:hidden;gap:2px;background:#efefed">'+bar+'</div><div style="display:flex;flex-wrap:wrap;gap:4px 12px;margin:8px 0 10px">'+leg+'</div>'
          +ln('Total des points',x.tot)
          +ln('Priorité urgente ou haute',x.urg,x.urg?'#b21f2d':'')
          +ln('Sans priorité',x.nop,x.nop?'#b08900':'')
          +ln('Commentaires pour le directeur',x.cm)
          +'<div style="margin-top:8px;font-size:12.5px;color:#737372">Visite du '+(x.date||'—')+(x.prev?' · précédente '+x.prev:'')+'</div></button></div>'; }).join('');
      var kp=function(l,v,col){ return '<div style="flex:1 1 150px;border:1px solid var(--line);border-radius:12px;padding:7px 12px;background:#fff"><div style="font-size:12.5px;color:#737372">'+l+'</div><div style="font-size:26px;font-weight:800;color:'+(col||'#1d1d1b')+'">'+v+'</div></div>'; };
      root.innerHTML='<div class="v-wrap"><div class="v-head"><h2>Visite magasin · Groupe</h2></div>'
        +(ok.length?'<div style="display:flex;flex-wrap:wrap;gap:8px;margin:4px 0 8px">'+kp('Total des points',gT.tot)+kp('Actions ouvertes',gT.open)+kp('Urgentes ou hautes',gT.urg,gT.urg?'#b21f2d':'')+kp('Clôturées',gT.clos+' / '+gT.tot,'#1e7a34')+kp('Avancement groupe',(gT.tot?Math.round(100*gT.clos/gT.tot):0)+' %')+'</div>':'')
        +'<style>.vpod{display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:16px;align-items:start}.plab{text-align:center;font-weight:800;font-size:22px;color:#1d1d1b;background:#efefed;border-radius:999px;padding:8px 20px;margin:0 auto 10px;width:max-content;max-width:100%}.plab.p1{background:#e4f3e7;color:#1e7a34;font-size:19px}@media(min-width:1240px){.vpod{grid-template-columns:repeat(4,minmax(0,1fr))}.vpod>:nth-child(1){order:2}.vpod>:nth-child(2){order:1}.vpod>:nth-child(3){order:3}.vpod>:nth-child(4){order:4}.vpod .pod2{margin-top:90px}.vpod .pod3{margin-top:180px}}</style><div class="vpod">'+cards+'</div><div class="sub" style="margin-top:12px;color:#737372">Classés par avancement (actions clôturées). Touche un magasin pour voir et modifier ses actions.</div></div>';
      root.querySelectorAll('.vgc').forEach(function(b){ b.onclick=function(){ var t=[].filter.call(document.querySelectorAll('#storebar button'),function(x){ return x.dataset.st===b.dataset.st; })[0]; if(t) t.click(); }; });
      return;
    }
    ouvrirPriv(m,root,function(){ drawV(m); }); };
  var TRAME=[
   {id:'ext',z:'Extérieur',m:['exterieur'],i:[]},
   {id:'sas',z:'Sas d\'entrée / caisse',m:['sas','caisse','entree'],i:[]},
   {id:'pei',z:'Peinture',m:['peinture','peint'],i:[]},
   {id:'dec',z:'Déco',m:['deco'],i:[]},
   {id:'lum',z:'Luminaire',m:['clairage','luminaire'],i:[]},
   {id:'san',z:'Sanitaire',m:['sanitaire','sanit'],i:[]},
   {id:'ran',z:'Rangement',m:['rangement'],i:[]},
   {id:'sol',z:'Sol',m:['sol','carrelage'],i:[]},
   {id:'res',z:'Réserve',m:['reserve','reception'],i:[]},
   {id:'boi',z:'Bois',m:['bois'],i:[]},
   {id:'ele',z:'Électricité',m:['electricite','connect'],i:[]},
   {id:'cha',z:'Chauffage',m:['chauffage'],i:[]},
   {id:'plo',z:'Plomberie',m:['plomberie'],i:[]},
   {id:'out',z:'Outillage',m:['outillage'],i:[]},
   {id:'qui',z:'Quincaillerie',m:['quincaillerie','quinc'],i:[]},
   {id:'dro',z:'Droguerie',m:['droguerie','drog'],i:[]},
   {id:'jar',z:'Jardin',m:['jardin','motoculture','piscine'],i:[]},
   {id:'amx',z:'AMEX',m:['amex','amenagement ext'],i:[]},
   {id:'bat',z:'Bâti',m:['bati'],i:[]},
   {id:'ser',z:'Services',m:['service'],i:[]},
   {id:'div',z:'Divers',m:['divers','animalerie'],i:[]},
   {id:'sec',z:'Sécurité / propreté (tout le magasin)',m:['transversal','securite'],i:[]}];
  function applyEd(o,b){ var e=o.ed&&o.ed[b.id]; if(e){ if(e.txt!=null) b.txt=e.txt; if(e.zone) b.zone=e.zone; b.del=!!e.del; } return b; }
  function ageD(a){ if(!a||a.st==='Clos'||!a.since) return -1; var v=String(a.since), m=v.match(/(\d{4})-(\d\d)-(\d\d)/), d0=m?new Date(+m[1],+m[2]-1,+m[3]):null; if(!d0){ m=v.match(/(\d\d)\/(\d\d)\/(\d{4})/); if(m) d0=new Date(+m[3],+m[2]-1,+m[1]); } if(!d0||isNaN(d0)) return -1; var d=Math.floor((Date.now()-d0.getTime())/864e5); return d<0?-1:d; }
function ageB(a){ var d=ageD(a); if(d<0) return ''; return '<span style="margin-left:8px;font-weight:800;font-size:12px;color:'+(d>60?'#b21f2d':(d>30?'#b65807':'#737372'))+'" title="Ouverte depuis ce nombre de jours">⏱ '+d+' j</span>'; }
function A0(D,o){ return D.actions.concat(o.add).map(function(a){ var b=Object.assign({},a); b.st=stOf(o,a); b.stt=(o.st[a.id]&&o.st[a.id].t)||0; b.pr=(o.pr[a.id]&&o.pr[a.id].p!=null)?o.pr[a.id].p:(a.pr0||0); return applyEd(o,b); }).filter(function(b){return !b.del;}); }
  function norm(x){ return String(x).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,''); }
  function secOf(a){ var z=norm(a.zone); for(var k=0;k<TRAME.length;k++){ if(TRAME[k].m.some(function(w){return z.indexOf(w)>=0;})) return TRAME[k].id; } return 'div'; }
  function tpOf(o,sid){ return Object.keys(o.tp).map(function(id){ return Object.assign({id:id},o.tp[id]); }).filter(function(p){ return p.s===sid&&!p.del; }).sort(function(a,b){ return (a.c0||0)-(b.c0||0); }); }
  var ORD={Sierentz:['sas','dec','lum','pei','san','sol','ran','cha','boi','ele','plo','jar','amx','out','qui','dro','res'],Mulhouse:['sas','out','qui','boi','dro','ran','pei','lum','ele','san','plo','jar','dec']};
  function trameList(m,o,A){ var ids=ORD[m], all=TRAME; if(ids){ var by={}; TRAME.forEach(function(t){ by[t.id]=t; });
      var first=ids.map(function(i){ return by[i]; }).filter(Boolean);
      var rest=TRAME.filter(function(t){ return ids.indexOf(t.id)<0 && (tpOf(o,t.id).length||A.some(function(a){ return a.st!=='Clos'&&secOf(a)===t.id; })); });
      all=first.concat(rest); }
    return all.filter(function(t){ return !(o.tz[t.id]&&o.tz[t.id].h); }); }
  function trameHTML(m,o,A){ var tot=0,ok=0; var h=trameList(m,o,A).map(function(sec){ var acts=[];
      var pts=tpOf(o,sec.id), done=0;
      var chk=pts.map(function(p){ var c=!!(o.tr[p.id]&&o.tr[p.id].c); tot++; if(c){ ok++; done++; }
        if(editTp===p.id) return '<div class="v-ed"><input class="tpt" value="'+esc(p.txt)+'" style="width:100%;box-sizing:border-box;font:inherit;padding:7px;border:1px solid var(--line);border-radius:6px"><div class="v-eb"><button type="button" class="tpsave" data-id="'+p.id+'">Enregistrer</button><button type="button" class="tpcan">Annuler</button><button type="button" class="tpdel" data-id="'+p.id+'">Supprimer</button></div></div>';
        return '<div class="v-chk" style="display:flex;align-items:flex-start;gap:8px"><label style="display:flex;gap:8px;flex:1;align-items:flex-start"><input type="checkbox" data-id="'+p.id+'" '+(c?'checked':'')+'><span>'+esc(p.txt)+'</span></label><button type="button" class="eedit tpedit" data-id="'+p.id+'" title="Modifier ce point">✎</button><button type="button" class="eedit tpact" data-id="'+p.id+'" data-s="'+sec.id+'" title="Transformer ce point en action à suivre" style="color:#1e7a34">➜ Action</button></div>'; }).join('');
      var add='<div class="v-add" style="margin-top:8px"><input class="tpn" data-s="'+sec.id+'" placeholder="Ajouter un point à contrôler…"><button type="button" class="tpadd" data-s="'+sec.id+'">Ajouter</button></div>';
      var ac=acts.map(function(a){ return '<div class="v-act s-Nouveau"><div class="t">'+esc(a.txt)+(a.pr?' <b style="color:#b21f2d">· P'+a.pr+'</b>':'')+'</div><div class="v-eb" style="margin-top:6px"><button type="button" class="tzpass" data-id="'+esc(a.id)+'" data-s="Non fait" style="background:#1e7a34;color:#fff;border-color:#1e7a34">➜ Passer dans les actions</button><button type="button" class="tzpass" data-id="'+esc(a.id)+'" data-s="Clos">Sans suite (clos)</button></div></div>'; }).join('');
      return '<details class="v-card" '+(pts.length||acts.length||editTp&&pts.some(function(p){return p.id===editTp;})?'open':'')+'><summary>'+sec.z+' <span style="font-weight:600;color:#737372">· '+done+'/'+pts.length+(acts.length?' · '+acts.length+' à valider':'')+'</span></summary><div class="in">'+chk+add+'<div style="margin-top:8px"><button type="button" class="tzhide eedit" data-s="'+sec.id+'" style="color:#b21f2d">🗑 Masquer cette zone (inutilisée)</button></div>'+(acts.length?'<div style="margin-top:8px;font-weight:700;font-size:12.5px;color:#737372;text-transform:uppercase">Points à valider (nouveaux)</div>'+ac:'')+'</div></details>'; }).join('');
    return '<div class="v-kpis" style="grid-template-columns:1fr"><div class="v-kpi"><div class="n">'+ok+' / '+tot+'</div><div class="l">'+(tot?'points vérifiés pendant cette visite':'Ajoute tes points zone par zone au fil de la visite')+' · ordre de visite '+(ORD[m]?m:'Waldighoffen')+'</div></div></div>'+h+(function(){ var hid=TRAME.filter(function(t){ return o.tz[t.id]&&o.tz[t.id].h; }); return hid.length?'<details class="v-card"><summary>Zones masquées ('+hid.length+')</summary><div class="in">'+hid.map(function(t){ return '<div style="margin:4px 0"><button type="button" class="tzshow" data-s="'+t.id+'" style="border:1px solid #1d5fa8;color:#1d5fa8;background:#fff;border-radius:6px;padding:5px 10px;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer">↩ Réafficher '+esc(t.z)+'</button></div>'; }).join('')+'</div></details>':''; })()+'<div class="v-tools"><button type="button" id="vreset">Nouvelle visite (tout décocher)</button></div>'; }
  function applyLock(){ var lk=false; root.classList.toggle('vlocked',lk); var b=document.getElementById('vlockb'); if(b){ b.className=lk?'lk':'ul'; b.textContent=lk?'🔒 Verrouillé : touche pour pouvoir modifier':'🔓 Modification active (se reverrouille seule)'; } }
  function touchLock(){ if(Date.now()<unlockUntil){ unlockUntil=Date.now()+60000; armLock(); } }
  function armLock(){ clearTimeout(lockTimer); lockTimer=setTimeout(applyLock,Math.max(0,unlockUntil-Date.now())+50); }
  function bindTabs(m,o,A){
    var lb=document.getElementById('vlockbar'); if(false&&lb){ lb.innerHTML='<button type="button" id="vlockb"></button>'; document.getElementById('vlockb').onclick=function(){ if(Date.now()<unlockUntil){ unlockUntil=0; } else { unlockUntil=Date.now()+60000; armLock(); } applyLock(); }; applyLock(); }
    root.querySelectorAll('[data-vt]').forEach(function(b){ b.onclick=function(){ vtab=b.dataset.vt; SNAP[m]=null; drawV(m); }; });
    var p=document.getElementById('vpdf'); if(p) p.onclick=function(){ pdfV(m,o,A); };
    var ml=document.getElementById('vmail'); if(ml) ml.onclick=function(){ var bx=document.getElementById('vmailbox'); if(bx){ bx.remove(); return; } bx=document.createElement('div'); bx.id='vmailbox'; bx.style.cssText='margin:8px 0;padding:10px;border:1px solid var(--line);border-radius:8px;background:#f9f9f8';
      var last=''; try{ last=localStorage.getItem('visite_mailto_'+m)||''; }catch(e){}
      var CT=(window.__CONTACTS||{})[m]||[]; var ME=window.__ME||{role:'Moi',p:'',n:'',m:'',to:0,cc:0};
      var LIST=CT.concat([ME]);
      bx.innerHTML='<div style="font-size:12.5px;font-weight:700;margin-bottom:6px">Envoyer la feuille de route en PDF (pièce jointe)</div>'+LIST.map(function(c,k){ return '<label class="v-chk"><input type="checkbox" class="vmc" data-k="'+k+'" '+((c.to||c.cc)?'checked':'')+'><span><b>'+esc(c.p+' '+c.n)+'</b> · '+esc(c.role)+(c.to?' (destinataire)':' (copie)')+'<br><small style="color:#737372">'+esc(c.m)+'</small></span></label>'; }).join('')+'<input id="vmto" placeholder="Autre adresse e-mail (facultatif)" style="width:100%;box-sizing:border-box;font:inherit;padding:7px;border:1px solid var(--line);border-radius:6px;margin-top:6px"><div class="v-eb" style="margin-top:8px"><button type="button" id="vmsend">Envoyer</button><button type="button" id="vmopen">Ouvrir dans ma messagerie (joindre le PDF à la main)</button></div><div id="vmst" style="font-size:12.5px;font-weight:700;margin-top:6px"></div>';
      ml.parentNode.insertAdjacentElement('afterend',bx);
      var dd=new Date().toLocaleDateString('fr-FR'), subj='Feuille de route '+m+' - visite du '+frD(o.vd.v);
      var prenom=((((window.__CONTACTS||{})[m]||[]).filter(function(c){return c.to;})[0])||{}).p||'';
      var txt='Bonjour'+(prenom?' '+prenom:'')+',\n\nCi-joint les points observés lors de ma visite du '+frD(o.vd.v)+'.\n\nJe reste bien entendu disponible si vous avez des questions.\n\nCordialement,\n'+(((window.__ME||{}).p||'')+' '+((window.__ME||{}).n||'')).trim();
      var st=function(t,bad){ var e=document.getElementById('vmst'); e.textContent=t; e.style.color=bad?'#b21f2d':'#1e7a34'; };
      var pick=function(){ var to=[],cc=[]; bx.querySelectorAll('.vmc').forEach(function(c){ if(!c.checked) return; var p=LIST[+c.dataset.k], mm=String(p.m||'').trim().toLowerCase(); if(!/^[a-z0-9._-]+@weldom\.fr$/.test(mm)) return; (p.to?to:cc).push(mm); }); var ex=(document.getElementById('vmto').value||'').split(/[;,\s]+/).filter(String); ex.forEach(function(x){ x=x.toLowerCase(); if(/^[a-z0-9._-]+@weldom\.fr$/.test(x)) cc.push(x); }); if(!to.length&&cc.length) to.push(cc.shift()); return {to:to,cc:cc}; };
      document.getElementById('vmopen').onclick=function(){ var r=pick(); location.href='mailto:'+r.to.map(encodeURIComponent).join(',')+'?'+(r.cc.length?'cc='+r.cc.map(encodeURIComponent).join(',')+'&':'')+'subject='+encodeURIComponent(subj)+'&body='+encodeURIComponent(txt); pdfV(m,o,A); };
      document.getElementById('vmsend').onclick=async function(){ var r0=pick(), url=window.__SYNC_URL||'', tk=window.__MAIL_TOKEN||'';
        if(!r0.to.length){ st('Coche au moins un destinataire.',1); return; } if(!url||!tk){ st('Envoi automatique non configuré.',1); return; }
        if(!confirm('Envoyer la feuille de route à : '+r0.to.join(', ')+(r0.cc.length?'\nEn copie : '+r0.cc.join(', '):'')+' ?')) return;
        st('Envoi en cours…');
        try{ var r=await fetch(url,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({act:'mail',token:tk,to:r0.to.join(','),cc:r0.cc.join(','),subject:subj,body:txt,filename:'Feuille de route '+m+' '+frD(o.vd.v).replace(/\//g,'-')+'.pdf',html:pdfV(m,o,A,true)})}); var j=JSON.parse(await r.text()); if(j.ok) st('Envoyé à '+r0.to.concat(r0.cc).join(', ')+' ✓'); else st('Refusé : '+(j.err||'erreur'),1); }catch(e){ st('Échec de l\'envoi (script non mis à jour ?).',1); } };
    };
  }
  function frD(v){ var p=String(v||'').split('-'); return p.length===3?p[2]+'/'+p[1]+'/'+p[0].slice(2):v; }
  function pdfV(m,o,A,ret){
    var D=UNL[m].VISITE, d=new Date().toLocaleDateString('fr-FR'), op=A.filter(function(a){return a.st!=='Clos';}).sort(function(a,b){ return ((a.pr||9)-(b.pr||9))||((b.n||0)-(a.n||0)); });
    var PL={1:'1 · Urgent',2:'2 · Haute',3:'3 · Moyenne',4:'4 · Basse',5:'5 · Faible',0:'Non priorisé'};
    var CT=(window.__CONTACTS||{})[m]||[]; var nm=function(c){return c.p+' '+c.n;};
    var dirs=CT.filter(function(c){return c.to;}), chefs=CT.filter(function(c){return c.role==='Chef de secteur';}), adj=CT.filter(function(c){return c.role==='Directeur adjoint';});
    var INFO={dir:dirs.map(nm).join(' · '),dirRole:(dirs[0]&&dirs[0].role)||'Directeur',chefs:chefs.map(nm).join(' · '),adj:adj.map(nm).join(' · ')};
    var PC={1:'#b21f2d',2:'#b21f2d',3:'#e0701a',4:'#1e7a34',5:'#1e7a34',0:'#737372'}, PN={1:'1 · Urgent',2:'2 · Haute',3:'3 · Moyenne',4:'4 · Basse',5:'5 · Faible',0:'Non priorisé'};
    var nU=op.filter(function(a){return a.pr===1;}).length, nH=op.filter(function(a){return a.pr===2;}).length, nN=op.filter(function(a){return !a.pr;}).length;
    var PHS=phLoad(m);
    var rows=op.map(function(a){ var im=(PHS[a.id]||[]).map(function(u){ return '<img src="'+u+'" style="max-width:200px;max-height:150px;margin:4px 4px 0 0;border:1px solid #ccc">'; }).join(''); return '<tr><td><span class="pb" style="color:'+PC[a.pr||0]+'">'+PN[a.pr||0]+'</span></td><td><b>'+esc(a.zone)+'</b></td><td>'+esc(a.txt)+((o.cm&&o.cm[a.id]&&o.cm[a.id].txt)?'<div style="margin-top:4px;padding:4px 8px;background:#fff8ee;border-left:3px solid #e0a900"><b>Commentaire :</b> '+esc(o.cm[a.id].txt)+'</div>':'')+(im?'<div>'+im+'</div>':'')+'</td><td>'+esc(a.st)+'</td><td>'+(a.st==='Nouveau'?(a.sdt||('Visite du '+(a.sd||frD(o.vd.v)))):esc(a.sig||''))+'</td></tr>'; }).join('');
    var css='@page{size:A4;margin:16mm 14mm 18mm} *{box-sizing:border-box} body{font-family:Arial,Helvetica,sans-serif;color:#000;margin:0;font-size:12px;line-height:1.4} .hd{width:100%;border-collapse:collapse;border-top:8px solid #1d5fa8;border-bottom:1px solid #d9d9d9} .hd td{background:none!important;border:0;padding:10px 0} .hd .t{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#1d5fa8;font-weight:700} h1{font-size:24px;margin:2px 0 0;color:#222} .hd .r{text-align:right;font-size:12px;color:#444} .meta{width:100%;border-collapse:collapse;margin:12px 0 4px;border:1px solid #d6d6d5} .meta td{width:50%;padding:8px 12px;border:1px solid #d6d6d5;background:#f9f9f8!important} .meta .l{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#1d5fa8;font-weight:700} .meta .v{font-size:13px;font-weight:700;margin-top:2px} .kp{width:100%;border-collapse:separate;border-spacing:8px 0;margin:12px -8px 4px} .kp td{width:25%;border:1px solid #e0e0e0;border-top:3px solid #ec6707;padding:8px 10px;background:#fff!important} .kp b{display:block;font-size:22px;line-height:1.1} .kp span{font-size:10.5px;color:#555;text-transform:uppercase;letter-spacing:.05em} h2{font-size:14px;margin:20px 0 8px;padding:0 0 4px 10px;border-left:5px solid #ec6707;border-bottom:1px solid #1d5fa8;page-break-after:avoid} table{width:100%;border-collapse:collapse} thead{display:table-header-group} th{background:#1d5fa8;color:#fff;text-align:left;padding:7px 8px;font-size:11px;text-transform:uppercase;letter-spacing:.04em} td{padding:7px 8px;vertical-align:top;border-bottom:1px solid #e7e7e6} tr{page-break-inside:avoid} tr:nth-child(even) td{background:#f9f9f8} .pb{display:inline-block;font-weight:800;font-size:11px;white-space:nowrap} ul,ol{margin:4px 0 0 18px;padding:0} li{margin-bottom:3px} .ft{position:fixed;bottom:0;left:0;right:0;border-top:1px solid #d9d9d9;padding-top:4px;font-size:10px;color:#777;display:flex;justify-content:space-between}';
    var html='<!doctype html><meta charset="utf-8"><title>Feuille de route '+esc(m)+'</title><style>'+css+'</style>'+
      (ret?'':'<div class="ft"><span>'+esc(m)+' · Feuille de route</span><span>Édité le '+d+'</span></div>')+
      '<table class="hd"><tr><td><div class="t">Suivi de visite magasin</div><h1>Feuille de route · '+esc(m)+'</h1></td><td class="r">Visite du <b>'+frD(o.vd.v)+'</b><br>Édité le '+d+'</td></tr></table>'+
      (INFO.dir?'<table class="meta"><tr><td><div class="l">'+esc(INFO.dirRole)+'</div><div class="v">'+esc(INFO.dir)+'</div>'+(INFO.adj?'<div class="l" style="margin-top:6px">Directeur adjoint</div><div class="v">'+esc(INFO.adj)+'</div>':'')+'</td><td><div class="l">Chefs de secteur</div><div class="v">'+esc(INFO.chefs||'—')+'</div></td></tr></table>':'')+
      '<table class="kp"><tr><td><b>'+op.length+'</b><span>Actions ouvertes</span></td><td><b style="color:#b21f2d">'+nU+'</b><span>Urgentes (P1)</span></td><td><b style="color:#b21f2d">'+nH+'</b><span>Hautes (P2)</span></td><td><b>'+nN+'</b><span>Non priorisées</span></td></tr></table>'+
      '<h2>1. Actions à traiter, par priorité</h2><table><thead><tr><th style="width:90px">Priorité</th><th style="width:110px">Zone</th><th>Action</th><th style="width:70px">Statut</th><th style="width:90px">Signalé</th></tr></thead><tbody>'+(rows||'<tr><td colspan="5">Aucune action ouverte.</td></tr>')+'</tbody></table>'+
      (D.decisions&&D.decisions.length?'<h2>2. Décisions du mois</h2><ol>'+D.decisions.map(function(x){return '<li>'+esc(x)+'</li>';}).join('')+'</ol>':'');
    if(ret) return html;
    var f=document.createElement('iframe'); f.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0'; document.body.appendChild(f);
    f.contentDocument.open(); f.contentDocument.write(html); f.contentDocument.close();
    setTimeout(function(){ try{ f.contentWindow.focus(); f.contentWindow.print(); }catch(e){ alert('Impression impossible'); } setTimeout(function(){ document.body.removeChild(f); },60000); },300);
  }
  function syncState(m){ if(!window.__SYNC_URL) setSt('Synchronisation non configurée : données gardées sur cet appareil',1); else if(!busy) syncNow(m); }

  var PHK='visite_ph_', PCOL={1:'#b21f2d',2:'#b21f2d',3:'#e0701a',4:'#1e7a34',5:'#1e7a34'}, pend={}, goOpen={}, goStep=0;
  function phLoad(m){ try{ return JSON.parse(localStorage.getItem(PHK+m)||'{}'); }catch(e){ return {}; } }
  function phSave(m,x){ try{ localStorage.setItem(PHK+m,JSON.stringify(x)); return true; }catch(e){ return false; } }
  function shrink(file,cb){ var fr=new FileReader(); fr.onload=function(){ var im=new Image(); im.onload=function(){ var W=1000, r=Math.min(1,W/Math.max(im.width,im.height)), c=document.createElement('canvas'); c.width=Math.round(im.width*r); c.height=Math.round(im.height*r); c.getContext('2d').drawImage(im,0,0,c.width,c.height); cb(c.toDataURL('image/jpeg',0.6)); }; im.src=fr.result; }; fr.readAsDataURL(file); }
  function toast(msg,undo){ var t=document.getElementById('utoast'); if(t) t.remove(); t=document.createElement('div'); t.id='utoast'; t.innerHTML='<span>'+esc(msg)+'</span><button type="button">Annuler</button>'; document.body.appendChild(t);
    var tm=setTimeout(function(){ t.remove(); },6000); t.querySelector('button').onclick=function(){ clearTimeout(tm); t.remove(); undo(); }; }
  function goHTML(m,o,A){ var ph=phLoad(m), h='<div class="sub" style="margin:6px 0">Date de la visite <input type="date" id="vdate" value="'+o.vd.v+'" style="font:inherit;padding:2px 6px;border:1px solid var(--line);border-radius:6px"> · précédente '+((o.vd.p)?o.vd.p.split('-').reverse().join('/'):UNL[m].VISITE.date)+' <button type="button" id="vstart" style="margin-left:10px;min-height:40px;padding:0 14px;border-radius:8px;border:0;background:#1d5fa8;color:#fff;font:inherit;font-weight:700;cursor:pointer">🧭 Démarrer la visite du jour</button></div>';
    var SECS=trameList(m,o,A), parts=SECS.map(function(sec){ var L=A.filter(function(a){ return a.st!=='Clos'&&secOf(a)===sec.id; }).sort(function(a,b){ return ((a.pr||9)-(b.pr||9)); }), nc=A.filter(function(a){ return a.st==='Clos'&&secOf(a)===sec.id; }).length;
      var open=(goOpen[sec.id]!==undefined)?goOpen[sec.id]:(L.length>0);
      var cards=L.map(function(a){ var pr=a.pr||0, ed=(editId===a.id), imgs=(ph[a.id]||[]);
        var body=ed?'<textarea class="get" rows="3" style="width:100%;box-sizing:border-box;font:inherit;padding:8px;border:1px solid var(--line);border-radius:8px">'+esc(a.txt)+'</textarea><div class="gm2" style="margin-top:6px"><button type="button" class="gsave" data-id="'+esc(a.id)+'" style="background:#1e7a34;color:#fff">Enregistrer</button><button type="button" class="gcan">Annuler</button><button type="button" class="gdel" data-id="'+esc(a.id)+'" style="color:#b21f2d">Supprimer</button></div>'
          :'<div class="gt gedit" data-id="'+esc(a.id)+'">'+esc(a.txt)+' <span style="color:#1d5fa8">✎</span></div>';
        return '<div class="ga pr'+pr+'" data-id="'+esc(a.id)+'"><div class="gm">'+(a.st!=='Non fait'?'<b>'+esc(a.st)+'</b> · ':'')+esc(a.sig||'')+'</div>'+body
          +'<div class="gb"><button type="button" class="ok gset" data-id="'+esc(a.id)+'" data-s="Clos">✔ Fait</button><button type="button" class="ko gset '+(a.st==='Non fait'?'on':'')+'" data-id="'+esc(a.id)+'" data-s="Non fait">✖ Pas fait</button></div>'
          +'<div class="gp">'+[1,2,3,4,5].map(function(n){ return '<button type="button" class="gpr '+(pr===n?'on':'')+'" data-id="'+esc(a.id)+'" data-p="'+n+'" style="'+(pr===n?'background:'+PCOL[n]:'color:'+PCOL[n])+'">'+n+'</button>'; }).join('')+'<span style="font-size:13px;font-weight:800;margin-left:4px;color:'+(pr?PCOL[pr]:'#737372')+'">Priorité'+(pr?' '+pr:'')+'</span></div>'
          +'<div class="gm2"><select class="gsel" data-id="'+esc(a.id)+'">'+ST.map(function(x){ return '<option'+(x===a.st?' selected':'')+'>'+x+'</option>'; }).join('')+'</select><label class="gphb" style="display:inline-flex;align-items:center;min-height:40px;border:1px solid #d6d6d3;border-radius:8px;padding:0 12px;background:#fff">📷 Photo<input type="file" accept="image/*" capture="environment" class="gfile" data-id="'+esc(a.id)+'" style="display:none"></label></div>'
          +(imgs.length?'<div class="gph">'+imgs.map(function(u,i){ return '<img src="'+u+'" class="gimg" data-id="'+esc(a.id)+'" data-i="'+i+'">'; }).join('')+'</div>':'')+'</div>'; }).join('');
      var add='<div class="gm2" style="margin-top:8px"><input class="gnew" data-s="'+sec.id+'" placeholder="Nouveau point dans cette zone…" style="flex:1;min-width:0;min-height:44px;font:inherit;padding:0 10px;border:1px solid var(--line);border-radius:8px"><label class="gphb" style="display:inline-flex;align-items:center;min-height:44px;border:1px solid #d6d6d3;border-radius:8px;padding:0 12px;background:'+(pend[sec.id]?'#d9f2df':'#fff')+'">📷<input type="file" accept="image/*" capture="environment" class="gfilen" data-s="'+sec.id+'" style="display:none"></label><button type="button" class="gadd" data-s="'+sec.id+'" style="min-height:44px;background:#1d5fa8;color:#fff;border:0;border-radius:8px;padding:0 16px;font:inherit;font-weight:800">+</button></div>';
      return {id:sec.id,z:sec.z,n:L.length,u:L.filter(function(a){ return a.pr&&a.pr<=2; }).length,nc:nc,html:'<div class="in">'+cards+add+'</div>'}; });
    if(goStep>=parts.length) goStep=parts.length-1; if(goStep<0) goStep=0;
    if(parts.length){ var cu=parts[goStep];
      h+='<div class="gstep-h"><b>Parcours · étape '+(goStep+1)+' sur '+parts.length+' : '+esc(cu.z)+'</b><span>Ordre de visite propre à ce magasin</span></div><div class="gdots">'+parts.map(function(q,i){ var cl=i===goStep?'c':(q.n===0?'d':(q.u?'r':'')); return '<button type="button" class="gdot '+cl+'" data-i="'+i+'" title="'+esc(q.z)+(q.n?' · '+q.n+' à traiter':' · rien à traiter')+'">'+(q.n===0&&i!==goStep?'✓':(i+1))+'</button>'; }).join('')+'</div>'
        +'<div class="gsec-t"><span>Actions ouvertes · rayon '+esc(cu.z)+'</span><b>'+cu.n+'</b></div>'+(cu.n?'':'<div class="gok">✓ Rien à traiter dans le rayon '+esc(cu.z)+'</div>')+cu.html
        +'<div class="gnavb"><button type="button" class="gnav" data-d="-1"'+(goStep===0?' disabled':'')+'>‹ '+(goStep>0?esc(parts[goStep-1].z):'Début')+'</button><button type="button" class="gnav nx" data-d="1"'+(goStep>=parts.length-1?' disabled':'')+'>'+(goStep<parts.length-1?'Suivant : '+esc(parts[goStep+1].z)+' ›':'Dernière étape')+'</button></div>'; }
    h+='<div class="v-tools"><button type="button" id="gclr">🗑 Vider les photos de cet appareil</button></div>'; return h; }
  function goBind(m,o,A){
    function chg(id,fn,msg){ var prev=JSON.stringify([o.st[id]||null,o.pr[id]||null]); fn(); dirty[m]=true; save(m,o); drawV(m); syncNow(m); if(msg) toast(msg,function(){ var p=JSON.parse(prev); if(p[0]) o.st[id]=p[0]; else delete o.st[id]; if(p[1]) o.pr[id]=p[1]; else delete o.pr[id]; dirty[m]=true; save(m,o); drawV(m); syncNow(m); }); }
    root.querySelectorAll('details.gz').forEach(function(d){ d.addEventListener('toggle',function(){ goOpen[d.dataset.s]=d.open; }); });
    root.querySelectorAll('.gdot').forEach(function(b){ b.onclick=function(){ goStep=+b.dataset.i; drawV(m); window.scrollTo(0,0); }; });
    root.querySelectorAll('.gnav').forEach(function(b){ b.onclick=function(){ goStep+=+b.dataset.d; drawV(m); window.scrollTo(0,0); }; });
    var vdi=document.getElementById('vdate'); if(vdi) vdi.onchange=function(){ if(!vdi.value) return; o.vd={v:vdi.value,t:Date.now()}; dirty[m]=true; save(m,o); syncNow(m); }; var vst=document.getElementById('vstart'); if(vst) vst.onclick=function(){ var n=new Date(), td=n.getFullYear()+'-'+('0'+(n.getMonth()+1)).slice(-2)+'-'+('0'+n.getDate()).slice(-2); goStep=0; if(o.vd.v===td){ drawV(m); window.scrollTo(0,0); return; } var prevVd=JSON.stringify(o.vd); o.vd={v:td,t:Date.now(),p:o.vd.v}; dirty[m]=true; save(m,o); syncNow(m); drawV(m); window.scrollTo(0,0); toast('Visite démarrée le '+td.split('-').reverse().join('/')+' · les actions ouvertes sont conservées',function(){ o.vd=JSON.parse(prevVd); dirty[m]=true; save(m,o); syncNow(m); drawV(m); }); };
    root.querySelectorAll('.gset').forEach(function(b){ b.onclick=function(){ var id=b.dataset.id, s=b.dataset.s; chg(id,function(){ o.st[id]={s:s,t:Date.now()}; },s==='Clos'?'Marqué fait':'Marqué pas fait'); }; });
    root.querySelectorAll('.gsel').forEach(function(b){ b.onchange=function(){ var id=b.dataset.id; chg(id,function(){ o.st[id]={s:b.value,t:Date.now()}; },'Statut : '+b.value); }; });
    root.querySelectorAll('.gpr').forEach(function(b){ b.onclick=function(){ var id=b.dataset.id, cur=o.pr[id], np=(cur&&cur.p===+b.dataset.p)?0:+b.dataset.p; chg(id,function(){ o.pr[id]={p:np,t:Date.now()}; },np?'Priorité '+np:'Priorité retirée'); }; });
    root.querySelectorAll('.gedit').forEach(function(b){ b.onclick=function(){ editId=b.dataset.id; goOpen[secOf(A.filter(function(a){return a.id===editId;})[0]||{zone:''})]=true; drawV(m); }; });
    root.querySelectorAll('.gcan').forEach(function(b){ b.onclick=function(){ editId=null; drawV(m); }; });
    root.querySelectorAll('.gsave').forEach(function(b){ b.onclick=function(){ var t=root.querySelector('.get').value.trim(); if(!t) return; var a0=A.filter(function(a){return a.id===b.dataset.id;})[0]; o.ed[b.dataset.id]={txt:t,zone:a0?a0.zone:'',del:false,t:Date.now()}; editId=null; dirty[m]=true; save(m,o); drawV(m); syncNow(m); }; });
    root.querySelectorAll('.gdel').forEach(function(b){ b.onclick=function(){ if(!confirm('Supprimer ce point ?')) return; var cur=o.ed[b.dataset.id]||{}; var a0=A.filter(function(a){return a.id===b.dataset.id;})[0]||{}; o.ed[b.dataset.id]={txt:cur.txt||a0.txt,zone:cur.zone||a0.zone,del:true,t:Date.now()}; editId=null; dirty[m]=true; save(m,o); drawV(m); syncNow(m); }; });
    function addPh(id,url){ var ph=phLoad(m); ph[id]=(ph[id]||[]).concat([url]); if(!phSave(m,ph)) alert('Mémoire photos pleine sur cet appareil : exporte le PDF puis utilise « Vider les photos ».'); }
    root.querySelectorAll('.gfile').forEach(function(f){ f.onchange=function(){ if(!f.files[0]) return; shrink(f.files[0],function(u){ addPh(f.dataset.id,u); drawV(m); }); }; });
    root.querySelectorAll('.gfilen').forEach(function(f){ f.onchange=function(){ if(!f.files[0]) return; shrink(f.files[0],function(u){ pend[f.dataset.s]=u; goOpen[f.dataset.s]=true; drawV(m); }); }; });
    root.querySelectorAll('.gimg').forEach(function(im){ im.onclick=function(){ if(confirm('Supprimer cette photo ?')){ var ph=phLoad(m); ph[im.dataset.id].splice(+im.dataset.i,1); phSave(m,ph); drawV(m); } }; });
    function addN(sid){ var inp=root.querySelector('.gnew[data-s="'+sid+'"]'); var t=(inp&&inp.value.trim())||''; var u=pend[sid]; if(!t&&!u) return; var sec=TRAME.filter(function(x){return x.id===sid;})[0]; var id='n'+Date.now();
      o.add.push({id:id,zone:sec.z,txt:t||'(voir photo)',st:'Nouveau',sig:'Nouveau '+new Date().toLocaleDateString('fr-FR'),t:Date.now()}); if(u){ addPh(id,u); delete pend[sid]; } goOpen[sid]=true; dirty[m]=true; save(m,o); drawV(m); syncNow(m); }
    root.querySelectorAll('.gadd').forEach(function(b){ b.onclick=function(){ addN(b.dataset.s); }; });
    root.querySelectorAll('.gnew').forEach(function(i2){ i2.onkeydown=function(ev){ if(ev.key==='Enter'){ ev.preventDefault(); addN(i2.dataset.s); } }; });

    var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(SR){ root.querySelectorAll('.gnew,.get').forEach(function(inp){ var bt=document.createElement('button'); bt.type='button'; bt.textContent='🎤'; bt.title='Dicter'; bt.className='gmic'; bt.style.cssText='min-width:48px;min-height:44px;font-size:20px;border:1px solid #d6d6d3;border-radius:8px;background:#fff'; inp.insertAdjacentElement('afterend',bt);
      var rec=null; bt.onclick=function(){ if(rec){ try{ rec.stop(); }catch(e){} return; } rec=new SR(); rec.lang='fr-FR'; rec.interimResults=false; rec.continuous=false; bt.style.background='#fde3e6';
        rec.onresult=function(ev){ var t=''; for(var i=ev.resultIndex;i<ev.results.length;i++){ if(ev.results[i].isFinal) t+=ev.results[i][0].transcript; } if(t){ inp.value=(inp.value?inp.value.replace(/\s+$/,'')+' ':'')+t.trim(); inp.dispatchEvent(new Event('input')); } };
        rec.onerror=function(ev){ bt.style.background='#fff'; rec=null; if(ev&&ev.error==='not-allowed') alert('Micro refusé : autorise-le dans les réglages du navigateur.'); };
        rec.onend=function(){ bt.style.background='#fff'; rec=null; };
        try{ rec.start(); }catch(e){ rec=null; bt.style.background='#fff'; } }; }); }
    var gc=document.getElementById('gclr'); if(gc) gc.onclick=function(){ if(confirm('Supprimer toutes les photos gardées sur cet appareil ?')){ phSave(m,{}); drawV(m); } };
  }
  /* ---- photo « preuve » d'une action faite (envoyée chiffrée, une clé par photo) ---- */
  var PHC={}, PFMAX=30000;
  function pfKey(m,id,k){ return pfKey0(m,id)+(k?'zz'+String.fromCharCode(96+k):''); }
  function pfKey0(m,id){ var t=String(id).replace(/[^A-Za-z0-9]/g,'').slice(-10),e=''; for(var i=0;i<t.length;i++){ var c=t.charCodeAt(i); e+=String.fromCharCode(97+(c>>4&15),97+(c&15)); } return 'visite_ph'+String(m).replace(/[^A-Za-z]/g,'').slice(0,4)+e; }
  function pfList(o,id){ var L=[]; if(o.pf&&o.pf[id]&&!o.pf[id].del) L.push({k:0,e:id,t:o.pf[id].t}); for(var k=1;k<=10;k++){ var e=o.pf&&o.pf[id+'_p'+k]; if(e&&!e.del) L.push({k:k,e:id+'_p'+k,t:e.t}); } return L; }
  function pfHtml(o,a){ var L=pfList(o,a.id), has=L.length>0, can=(a.st==='Fait'||a.st==='En cours');
    if(!has&&!can) return '';
    return '<div class="pfbox" data-id="'+esc(a.id)+'">'+L.map(function(x){ return '<span class="pfw" style="display:inline-flex;flex-direction:column;align-items:flex-start;gap:3px"><img class="pfimg" data-id="'+esc(a.id)+'" data-k="'+x.k+'" alt="Photo" title="Agrandir"><button type="button" class="pfdel" data-id="'+esc(a.id)+'" data-k="'+x.k+'" style="font-size:11.5px;padding:2px 6px">✕ Retirer</button></span>'; }).join('')+(can?'<label class="pfb">📷 '+(has?'Ajouter d’autres photos':'Ajouter une ou plusieurs photos '+(a.st==='Fait'?'de l’action faite':'du suivi'))+'<input type="file" accept="image/*" multiple class="pffile" data-id="'+esc(a.id)+'" style="display:none"></label><span class="pfh">ou glisse des images ici, ou Ctrl+V</span>':'')+(has?'<span class="pfd">'+L.length+' photo'+(L.length>1?'s':'')+' · '+new Date(Math.max.apply(null,L.map(function(x){ return x.t||0; }))||Date.now()).toLocaleDateString('fr-FR')+'</span>':'')+'</div>'; }
  function pfShrink(file,cb){ var fr=new FileReader(); fr.onload=function(){ var im=new Image(); im.onload=function(){ var W=[640,540,460,400,340,280,220], Q=[0.55,0.45,0.38], out=null;
      for(var i=0;i<W.length&&!out;i++){ var r=Math.min(1,W[i]/Math.max(im.width,im.height)), c=document.createElement('canvas'); c.width=Math.round(im.width*r); c.height=Math.round(im.height*r); c.getContext('2d').drawImage(im,0,0,c.width,c.height);
        for(var j=0;j<Q.length&&!out;j++){ var u=c.toDataURL('image/jpeg',Q[j]); if(Math.ceil((u.length-23)*0.75/3)*4+40<=PFMAX-16) out=u; } }
      cb(out); }; im.onerror=function(){ cb(null); }; im.src=fr.result; }; fr.readAsDataURL(file); }
  async function pfPut(m,id,u,k){ var raw=unb64(u.split(',')[1]), iv=crypto.getRandomValues(new Uint8Array(12)), ct=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv:iv},await vkey(m),raw)), all=new Uint8Array(12+ct.length); all.set(iv); all.set(ct,12); var v=b64(all); if(v.length>PFMAX) throw new Error('taille');
    var pr=await fetch(window.__SYNC_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({k:pfKey(m,id,k),v:v,w:window.__wtok(m)})}); var rj=null; try{ rj=JSON.parse(await pr.text()); }catch(e){} if(rj&&rj.ok===false){ var er=new Error('refus'); er.det=String(rj.err||rj.error||rj.message||'').slice(0,80); throw er; } if(!rj) throw new Error('reponse'); }
  async function pfGet(m,id,k){ var ck=m+'|'+id+(k?'|'+k:''); if(PHC[ck]) return PHC[ck]; var r=await fetch(window.__SYNC_URL+'?k='+encodeURIComponent(pfKey(m,id,k))+'&_='+Date.now()), j=JSON.parse(await r.text()); if(!j||!j.v) return null; var all=unb64(j.v), pt=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:all.slice(0,12)},await vkey(m),all.slice(12))); PHC[ck]='data:image/jpeg;base64,'+b64(pt); return PHC[ck]; }
  if(!window.__pfPasteOn){ window.__pfPasteOn=true; document.addEventListener('paste',function(e){ var v=document.getElementById('viewVisite'); if(!v||v.style.display==='none'||!window.__pfTarget) return; var t=e.target; if(t&&/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return; var it=[].filter.call((e.clipboardData&&e.clipboardData.items)||[],function(x){ return /^image\//.test(x.type); })[0]; if(!it) return; if(!document.querySelector('.pfbox[data-id="'+window.__pfTarget+'"] .pffile')) return; e.preventDefault(); if(window.__pfUp) window.__pfUp(window.__pfTarget,it.getAsFile()); }); }
  function pfZoom(u){ var d=document.createElement('div'); d.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:9999;display:flex;align-items:center;gap:7px;padding:12px'; d.innerHTML='<img src="'+u+'" style="max-width:100%;max-height:100%;border-radius:8px">'; d.onclick=function(){ d.remove(); }; document.body.appendChild(d); }
  function pfBind(m,o){
    root.querySelectorAll('.pfimg').forEach(function(im){ var id=im.dataset.id, kk=+im.dataset.k||0, ck=m+'|'+id+(kk?'|'+kk:''); im.onclick=function(){ if(im.src) pfZoom(im.src); };
      if(PHC[ck]){ im.src=PHC[ck]; return; } im.style.background='#efefed'; pfGet(m,id,kk).then(function(u){ if(u) im.src=u; else im.alt='Photo en attente de synchronisation'; }).catch(function(){ im.alt='Photo indisponible (hors connexion)'; }); });
    function pfFail(t){ Object.keys(PFBUSY).forEach(function(k){ pfBusy(k,false); }); setSt(t,1); try{ alert('Photo non envoyée.\n\n'+t); }catch(e){} }
    var PFBUSY={};
    function pfBusy(id,on){ if(on) PFBUSY[id]=1; else delete PFBUSY[id]; var bx=root.querySelector('.pfbox[data-id="'+id+'"]'); if(!bx) return; var n=bx.querySelector('.pfwait'); if(on){ if(!n){ n=document.createElement('div'); n.className='pfwait'; n.style.cssText='flex-basis:100%;margin-top:6px;padding:6px 10px;border-radius:8px;background:#fff8ee;border:1px solid #e0a900;color:#8a5a2b;font-size:13px;font-weight:700'; bx.appendChild(n); } n.textContent='⏳ Photo en cours de synchronisation… merci de patienter, inutile de cliquer à nouveau.'; } else if(n) n.remove(); bx.querySelectorAll('label.pfb,.pfdel').forEach(function(x){ x.style.pointerEvents=on?'none':''; x.style.opacity=on?'.45':''; }); }
    function pfOne(file){ return new Promise(function(res){ pfShrink(file,function(u){ res(u); }); }); }
    async function pfUpMany(id,files){ var fl=[].slice.call(files||[]).filter(function(f){ return f&&/^image\//.test(f.type||'image/'); }); if(!fl.length) return; if(PFBUSY[id]) return; pfBusy(id,true); setSt('Envoi de '+(fl.length>1?fl.length+' photos…':'la photo…'));
      try{ for(var i=0;i<fl.length;i++){ var used={}; pfList(o,id).forEach(function(x){ used[x.k]=1; }); var k=-1; for(var q=0;q<=10;q++){ if(!used[q]){ k=q; break; } } if(k<0){ pfFail('Maximum de 11 photos par action atteint.'); return; }
          var u=await pfOne(fl[i]); if(!u){ pfFail('Image illisible ou trop lourde (essaie une photo JPG ou PNG).'); return; }
          await pfPut(m,id,u,k||0); PHC[m+'|'+id+(k?'|'+k:'')]=u; o.pf[k?id+'_p'+k:id]={t:Date.now()}; }
        delete PFBUSY[id]; dirty[m]=true; save(m,o); drawV(m); syncNow(m);
      }catch(e){ pfFail((e&&e.message==='refus')?'Le script Google a refusé la photo'+(e.det?' : '+e.det:' (taille ou jeton)'):(e&&e.message==='reponse')?'Réponse inattendue du script Google : photo non confirmée.':(e&&e.message==='cle')?'Magasin non déverrouillé : actualise la page.':'Réseau indisponible ou accès refusé ('+((e&&e.message)||'erreur')+').'); drawV(m); } }
    function pfUp(id,file){ pfUpMany(id,file&&file.length!==undefined&&!file.type?file:[file]); }
    window.__pfUp=function(id,file){ pfUp(id,file); };
    root.querySelectorAll('.pffile').forEach(function(f){ f.onclick=function(){ f.value=''; }; f.onchange=function(){ pfUpMany(f.dataset.id,f.files); }; });
    root.querySelectorAll('.v-act').forEach(function(card){ var bx=card.querySelector('.pfbox'); if(!bx||!bx.querySelector('.pffile')) return; var id=bx.dataset.id;
      card.addEventListener('dragover',function(e){ e.preventDefault(); card.classList.add('pfdrop'); }); card.addEventListener('dragleave',function(){ card.classList.remove('pfdrop'); });
      card.addEventListener('drop',function(e){ e.preventDefault(); card.classList.remove('pfdrop'); var f=e.dataTransfer&&e.dataTransfer.files; if(f&&f.length) pfUpMany(id,f); });
      card.addEventListener('mouseenter',function(){ window.__pfTarget=id; }); card.addEventListener('focusin',function(){ window.__pfTarget=id; }); card.addEventListener('click',function(){ window.__pfTarget=id; }); });
    root.querySelectorAll('.pfdel').forEach(function(b){ b.onclick=function(){ if(!confirm('Retirer cette photo ?')) return; var kk=+b.dataset.k||0, ent=kk?b.dataset.id+'_p'+kk:b.dataset.id; o.pf[ent]={t:Date.now(),del:true}; delete PHC[m+'|'+b.dataset.id+(kk?'|'+kk:'')]; dirty[m]=true; save(m,o); drawV(m); syncNow(m); }; }); }
  function cmHtml(o,id){ var c=o.cm&&o.cm[id]&&o.cm[id].txt; if(cmEd===id) return '<div class="v-cm" style="margin-top:8px"><textarea class="cmt" rows="3" placeholder="Commentaire pour le directeur…" style="width:100%;box-sizing:border-box;font:inherit;padding:6px;border:1px solid #e0a900;border-radius:6px">'+esc(c||'')+'</textarea><div style="margin-top:4px;display:flex;gap:6px;flex-wrap:wrap"><button type="button" class="cmsave" data-id="'+esc(id)+'" style="border:0;background:#e0a900;color:#1d1d1b;border-radius:6px;padding:5px 12px;font:inherit;font-weight:700;cursor:pointer">Enregistrer</button><button type="button" class="cmcan" style="border:1px solid #d6d6d3;background:#fff;border-radius:6px;padding:5px 12px;font:inherit;cursor:pointer">Annuler</button>'+(c?'<button type="button" class="cmdel" data-id="'+esc(id)+'" style="border:1px solid #b21f2d;color:#b21f2d;background:#fff;border-radius:6px;padding:5px 12px;font:inherit;cursor:pointer">Supprimer</button>':'')+'</div></div>';
    if(c) return '<div class="v-cm" style="margin-top:8px;padding:8px 10px;background:#fff8ee;border-left:4px solid #e0a900;border-radius:4px"><div style="font-size:12px;font-weight:800;color:#8a5a2b">💬 Pour le directeur</div><div style="white-space:pre-wrap">'+esc(c)+'</div><button type="button" class="cmedit" data-id="'+esc(id)+'" style="margin-top:4px;border:0;background:transparent;color:#1d5fa8;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer;padding:0">✎ Modifier le commentaire</button></div>';
    return '<button type="button" class="cmedit" data-id="'+esc(id)+'" style="margin-top:8px;border:1px dashed #d6d6d3;background:#fff;color:#737372;border-radius:6px;padding:5px 10px;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer">💬 Commentaire pour le directeur</button>'; }
  function vTrophy(m){ try{ var h=root.querySelector('.v-avt'); if(!h||h.querySelector('.trp')) return;
      var S=Object.keys(PRIV).filter(function(k){ return k!=='Creation'&&GU(k)&&GU(k).VISITE; }).map(function(k){ var V=GU(k).VISITE, o=load(k), tot=0, cl=0; V.actions.concat(o.add||[]).forEach(function(a){ tot++; if(((o.st&&o.st[a.id]&&o.st[a.id].s)||a.st)==='Clos') cl++; }); return {k:k,r:tot?100*cl/tot:0}; });
      if(S.length<2) return; var b=S.slice().sort(function(x,y){ return y.r-x.r; }); if(b[0].k!==m||b[0].r===b[1].r||b[0].r===0) return;
      var sp=document.createElement('span'); sp.className='trp'; sp.textContent=' 🏆'; sp.title='Meilleur avancement du groupe ('+Math.round(b[0].r)+' % des points clos)'; sp.style.cssText='cursor:help;font-size:1.9em;vertical-align:-.12em;margin-left:4px'; h.appendChild(sp); }catch(e){} }
  var vOpen=false;
  function newActSheet(m,o,zl,defZ){
    var old=document.getElementById('vsheet'); if(old) old.remove();
    var sel=(defZ&&zl.indexOf(defZ)>=0)?defZ:zl[0], photo=null, rec=null, SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    var d=document.createElement('div'); d.id='vsheet';
    d.innerHTML='<div class="sh"><div class="shh"><b>Nouvelle action</b><button type="button" class="shx" aria-label="Fermer">✕</button></div><div class="shz">'+zl.map(function(z){ return '<button type="button" class="zc'+(z===sel?' on':'')+'" data-z="'+esc(z)+'">'+esc(z)+'</button>'; }).join('')+'</div><textarea id="shtxt" rows="3" placeholder="Décris ce que tu as constaté…"></textarea><div class="shb">'+(SR?'<button type="button" class="bigb" id="shmic">🎤 Dicter</button>':'')+'<label class="bigb" id="shph">📷 Photo<input type="file" accept="image/*" capture="environment" id="shfile" style="display:none"></label></div><div id="shinfo" class="shi"></div><button type="button" class="go" id="shgo">Ajouter l\'action</button></div>';
    document.body.appendChild(d);
    var close=function(){ if(rec){ try{ rec.stop(); }catch(e){} } d.remove(); };
    d.onclick=function(ev){ if(ev.target===d) close(); }; d.querySelector('.shx').onclick=close;
    d.querySelectorAll('.zc').forEach(function(b){ b.onclick=function(){ sel=b.dataset.z; d.querySelectorAll('.zc').forEach(function(x){ x.classList.toggle('on',x===b); }); }; });
    var tx=d.querySelector('#shtxt'), mic=d.querySelector('#shmic');
    if(mic) mic.onclick=function(){ if(rec){ try{ rec.stop(); }catch(e){} return; } rec=new SR(); rec.lang='fr-FR'; rec.interimResults=false; rec.continuous=false; mic.style.background='#fde3e6'; mic.textContent='🎤 J\'écoute…';
      rec.onresult=function(ev){ var t=''; for(var i=ev.resultIndex;i<ev.results.length;i++){ if(ev.results[i].isFinal) t+=ev.results[i][0].transcript; } if(t) tx.value=(tx.value?tx.value.replace(/\s+$/,'')+' ':'')+t.trim(); };
      rec.onerror=function(ev){ mic.style.background=''; mic.textContent='🎤 Dicter'; rec=null; if(ev&&ev.error==='not-allowed') alert('Micro refusé : autorise-le dans les réglages du navigateur.'); };
      rec.onend=function(){ mic.style.background=''; mic.textContent='🎤 Dicter'; rec=null; };
      try{ rec.start(); }catch(e){ rec=null; mic.style.background=''; mic.textContent='🎤 Dicter'; } };
    d.querySelector('#shfile').onchange=function(){ photo=this.files&&this.files[0]||null; d.querySelector('#shinfo').textContent=photo?'📷 1 photo prête à être envoyée avec l\'action':''; d.querySelector('#shph').style.background=photo?'#e3f3e6':''; };
    d.querySelector('#shgo').onclick=function(){ var t=tx.value.trim(); if(!t&&!photo) return; var id='n'+Date.now();
      o.add.push({id:id,zone:sel,txt:t||'(voir photo)',st:'Nouveau',sig:'Nouveau '+new Date().toLocaleDateString('fr-FR'),t:Date.now()});
      fS='all'; fQ=''; fZ='all'; vOpen=true; dirty[m]=true; save(m,o); close(); drawV(m); syncNow(m);
      if(photo&&window.__pfUp) window.__pfUp(id,photo);
      setTimeout(function(){ var c=root.querySelector('.v-act[data-aid="'+id+'"]'); if(c) c.scrollIntoView({behavior:'smooth',block:'center'}); },200); };
  }
  var OPENA={};
  function drawV(m){ drawV0(m); vTrophy(m); }
  function drawV0(m){
    touchLock();
    var D=UNL[m]&&UNL[m].VISITE;
    if(!D&&UNL[m]&&m!=='Creation'){ D=UNL[m].VISITE={date:'aucune',actions:[],bilan:[]}; }
    if(!D){ root.innerHTML='<div class="g-nodata"><b>Visite magasin : pas de données pour '+m+'.</b><br>Envoie le fichier de reprise du dernier rapport de visite de ce magasin pour l\'ajouter.</div>'; return; }
    curM=m; var o=load(m);
    var tb='<div id="vlockbar"></div><div class="v-tabs"><button type="button" data-vt="act" class="'+(vtab==='act'?'on':'')+'">Pilotage</button><button type="button" id="vpdf" class="pdf" style="margin-left:auto">Exporter en PDF</button><button type="button" id="vmail" class="pdf">✉ Envoyer par mail</button><button type="button" data-vt="go" class="vgo'+(vtab==='go'?' on':'')+'" style="margin-left:14px;border-style:dashed" title="Réservé à la visite">🧭 Parcours (Pour Stéphane)</button></div>';
    if(vtab==='go'){ var Ag=A0(D,o); root.innerHTML='<div class="v-wrap"><div class="v-head"><h2>Visite magasin · '+m+'</h2><span id="vsync" style="font-size:12.5px;font-weight:700"></span></div>'+tb+goHTML(m,o,Ag)+'</div>'; syncState(m); bindTabs(m,o,Ag); goBind(m,o,Ag); return; }
    if(vtab==='tr'){ root.innerHTML='<div class="v-wrap"><div class="v-head"><h2>Visite magasin · '+m+'</h2><span id="vsync" style="font-size:12.5px;font-weight:700"></span></div>'+tb+trameHTML(m,o,A0(D,o))+'</div>'; syncState(m); bindTabs(m,o,A0(D,o)); root.querySelectorAll('.v-btns').forEach(function(bx){ bx.querySelectorAll('button').forEach(function(b){ b.onclick=function(){ o.st[bx.dataset.id]={s:b.dataset.s,t:Date.now()}; dirty[m]=true; save(m,o); drawV(m); syncNow(m); }; }); }); root.querySelectorAll('.v-chk input').forEach(function(c){ c.onchange=function(){ o.tr[c.dataset.id]={c:c.checked,t:Date.now()}; dirty[m]=true; save(m,o); drawV(m); syncNow(m); }; }); root.querySelectorAll('.tzhide').forEach(function(b){ b.onclick=function(){ var sec=TRAME.filter(function(t){return t.id===b.dataset.s;})[0], n=A0(D,o).filter(function(a){ return a.st!=='Clos'&&secOf(a)===sec.id; }).length, np=tpOf(o,sec.id).length; if(!confirm('Masquer la zone « '+sec.z+' » de la trame ?'+((n||np)?'\n\n'+(np?np+' point(s) de trame y sont rattachés. ':'')+(n?n+' action(s) restent dans l\'onglet Actions.':''):'')+'\nTu pourras la réafficher en bas de la trame.')) return; o.tz[sec.id]={h:true,t:Date.now()}; dirty[m]=true; save(m,o); drawV(m); syncNow(m); }; });
      root.querySelectorAll('.tzshow').forEach(function(b){ b.onclick=function(){ o.tz[b.dataset.s]={h:false,t:Date.now()}; dirty[m]=true; save(m,o); drawV(m); syncNow(m); }; });
      root.querySelectorAll('.tzpass').forEach(function(b){ b.onclick=function(){ o.st[b.dataset.id]={s:b.dataset.s,t:Date.now()}; dirty[m]=true; save(m,o); drawV(m); syncNow(m); }; });
      root.querySelectorAll('.tpact').forEach(function(b){ b.onclick=function(){ var p=o.tp[b.dataset.id], sec=TRAME.filter(function(t){return t.id===b.dataset.s;})[0]; if(!p||!sec) return; o.add.push({id:'n'+Date.now(),zone:sec.z,txt:p.txt,st:'Non fait',sig:'Ajouté le '+new Date().toLocaleDateString('fr-FR').slice(0,5),t:Date.now()}); o.tp[b.dataset.id]=Object.assign({},p,{del:true,t:Date.now()}); dirty[m]=true; save(m,o); drawV(m); syncNow(m); }; });
      var addTp=function(sid){ var inp=root.querySelector('.tpn[data-s="'+sid+'"]'); var t=inp&&inp.value.trim(); if(!t) return; var id='p'+Date.now().toString(36)+Math.random().toString(36).slice(2,5); o.tp[id]={s:sid,txt:t,del:false,t:Date.now(),c0:Date.now()}; dirty[m]=true; save(m,o); drawV(m); syncNow(m); };
      root.querySelectorAll('.tpadd').forEach(function(b){ b.onclick=function(){ addTp(b.dataset.s); }; });
      root.querySelectorAll('.tpn').forEach(function(i2){ i2.onkeydown=function(ev){ if(ev.key==='Enter'){ ev.preventDefault(); addTp(i2.dataset.s); } }; });
      root.querySelectorAll('.tpedit').forEach(function(b){ b.onclick=function(){ editTp=b.dataset.id; drawV(m); }; });
      root.querySelectorAll('.tpcan').forEach(function(b){ b.onclick=function(){ editTp=null; drawV(m); }; });
      root.querySelectorAll('.tpsave').forEach(function(b){ b.onclick=function(){ var t=b.closest('.v-ed').querySelector('.tpt').value.trim(); if(!t) return; o.tp[b.dataset.id]=Object.assign({},o.tp[b.dataset.id],{txt:t,t:Date.now()}); editTp=null; dirty[m]=true; save(m,o); drawV(m); syncNow(m); }; });
      root.querySelectorAll('.tpdel').forEach(function(b){ b.onclick=function(){ if(!confirm('Supprimer ce point de la trame ?')) return; o.tp[b.dataset.id]=Object.assign({},o.tp[b.dataset.id],{del:true,t:Date.now()}); editTp=null; dirty[m]=true; save(m,o); drawV(m); syncNow(m); }; });
      var rs=document.getElementById('vreset'); if(rs) rs.onclick=function(){ if(!confirm('Démarrer une nouvelle visite : décocher toute la trame et mettre la date du jour ?')) return; Object.keys(o.tp).forEach(function(id){ o.tr[id]={c:false,t:Date.now()}; }); var _n=new Date(); o.vd={v:_n.getFullYear()+'-'+('0'+(_n.getMonth()+1)).slice(-2)+'-'+('0'+_n.getDate()).slice(-2),t:Date.now()}; dirty[m]=true; save(m,o); drawV(m); syncNow(m); }; return; }
    var A=A0(D,o), FOLD=!!(window.matchMedia&&matchMedia('(min-width:900px)').matches);
    var cnt={}; A.forEach(function(a){cnt[a.st]=(cnt[a.st]||0)+1;});
    var zones=[]; A.forEach(function(a){ if(zones.indexOf(a.zone)<0) zones.push(a.zone); }); TRAME.forEach(function(t){ if(zones.indexOf(t.z)<0) zones.push(t.z); }); zones.sort(function(x,y){return x.localeCompare(y,'fr');});
    var zHid=zones.filter(function(z){ var e=o.tz['z:'+norm(z)]; return e&&e.h; }); zones=zones.filter(function(z){ return zHid.indexOf(z)<0; }); if(fZ!=='all'&&zHid.indexOf(fZ)>=0) fZ='all';
    var L=A.filter(function(a){ return (fS==='all'?a.st!=='Clos':a.st===fS)&&(fZ==='all'||a.zone===fZ)&&(fS==='Clos'||fQ===''||(fQ==='urg'?(a.pr&&a.pr<=2):ageD(a)>30)); });
    var vo={}; trameList(m,o,A).map(function(t){return t.id;}).concat(TRAME.map(function(t){return t.id;})).forEach(function(id){ if(vo[id]==null) vo[id]=Object.keys(vo).length; });
    L.sort(function(a,b){ var rk=function(x){return x.st==='Clos'?3:(x.st==='Différé'?2:(x.st==='Nouveau'?1:0));}; if((a.st==='Clos')!==(b.st==='Clos')) return a.st==='Clos'?1:-1; var za=vo[secOf(a)], zb=vo[secOf(b)]; if(za!==zb) return za-zb; if(rk(a)!==rk(b)) return rk(a)-rk(b); var pa=a.pr||9, pb=b.pr||9; if(pa!==pb) return pa-pb; var na=a.n||0, nb=b.n||0; if(na!==nb) return nb-na; var sa=a.since||'9999', sb=b.since||'9999'; return sa<sb?-1:(sa>sb?1:0); });
    if(FOLD){ L.sort(function(a,b){ var oc=function(x){ return x.st==='Clos'?2:(x.st==='Fait'?0:1); }; if(oc(a)!==oc(b)) return oc(a)-oc(b); var za=vo[secOf(a)], zb=vo[secOf(b)]; if(za==null) za=999; if(zb==null) zb=999; if(za!==zb) return za-zb; var pa=a.pr||9, pb=b.pr||9; if(pa!==pb) return pa-pb; var da=ageD(a), db=ageD(b); if(da!==db) return db-da; return (b.n||0)-(a.n||0); }); }
    if(SNAP[m]){ var sn=SNAP[m], have={}; L.forEach(function(a){ have[a.id]=1; }); A.forEach(function(a){ if(sn.indexOf(a.id)>=0&&!have[a.id]&&(fZ==='all'||a.zone===fZ)) L.push(a); }); L.sort(function(a,b){ var ia=sn.indexOf(a.id), ib=sn.indexOf(b.id); if(ia<0) ia=1e6; if(ib<0) ib=1e6; return ia-ib; }); }
    else SNAP[m]=L.map(function(a){ return a.id; });
    var SUP=[]; if(fS==='Clos'){ SUP=D.actions.concat(o.add).filter(function(a){ return o.ed&&o.ed[a.id]&&o.ed[a.id].del&&(fZ==='all'||(o.ed[a.id].zone||a.zone)===fZ); }).map(function(a){ var b=Object.assign({},a); applyEd(o,b); b.sup=true; b.zone=b.zone||a.zone; b.supT=(o.ed[a.id]&&o.ed[a.id].t)||0; return b; }).sort(function(x,y){ return y.supT-x.supT; }); L=L.concat(SUP); }
    var h='<div class="v-wrap'+(FOLD?' vfold':' vmob'+(vOpen?' vopen':''))+'"><div class="v-head"><h2>Visite magasin · '+m+'</h2><span id="vsync" style="font-size:12.5px;font-weight:700"></span><span class="sub">Date de la visite <input type="date" id="vdate" value="'+o.vd.v+'" style="font:inherit;padding:2px 6px;border:1px solid var(--line);border-radius:6px"> · précédente '+D.date+'</span></div>';
    var KP='<div class="v-kp6"><div class="v-kpi '+(fS==='all'?'on':'')+'" data-fs="all"><div class="n">'+(A.length-(cnt['Clos']||0))+'</div><div class="l">📋 Toutes les actions</div></div>'+ST.map(function(s){return '<div class="v-kpi '+(fS===s?'on':'')+'" data-fs="'+s+'"><div class="n">'+(cnt[s]||0)+'</div><div class="l">'+(s==='Clos'?'📦 Archive (clos)':(LB[s]||s)).replace('✅','<span class="bigic">✅</span>')+'</div></div>';}).join('')+'</div>';
    var DN=(function(){ if(!window.__ch||!window.__ch.donut) return ''; var op=A.filter(function(a){ return a.st!=='Clos'; }); var pr=[0,0,0,0]; op.forEach(function(a){ var p=a.pr; pr[!p?3:(p<=2?0:(p===3?1:2))]++; });
      var SC={'Non fait':'#b21f2d','En cours':'#b08900','Nouveau':'#2a78d6','Différé':'#a3a3a1','Fait':'#0f9d8a','Clos':'#1e7a34'};
      var c1=[{n:'Priorité 1-2',v:pr[0],c:'#b21f2d'},{n:'Priorité 3',v:pr[1],c:'#e0701a'},{n:'Priorité 4-5',v:pr[2],c:'#1e7a34'},{n:'Sans priorité',v:pr[3],c:'#a3a3a1'}], c2=ST.map(function(s){ return {n:s,v:cnt[s]||0,c:SC[s]}; });
      function card(t,sg,u){ return '<div style="flex:1 1 300px;max-width:460px;border:1px solid var(--line);border-radius:8px;padding:10px;background:#fff;display:flex;flex-direction:column;align-items:center"><div style="font-weight:800;margin-bottom:6px;color:#1d1d1b">'+t+'</div>'+window.__ch.donut(sg,{name:m,unit:u,size:128,alt:t})+'</div>'; }
      if(!A.length) return ''; return '<div style="display:flex;flex-wrap:wrap;justify-content:flex-start;gap:12px;margin:0 0 12px">'+card('Actions ouvertes par priorité',c1,'ouvertes')+card('Actions par état',c2,'actions')+(function(){ var T=A.length, C=cnt['Clos']||0, F=cnt['Fait']||0, pc=Math.round(100*C/T), pf=Math.round(100*(C+F)/T), cav=(pc<30?'#b21f2d':(pc<60?'#e0701a':'#1e7a34')); return '<div style="flex:1 1 240px;max-width:360px;border:1px solid var(--line);border-radius:8px;padding:10px 16px;background:#fff;display:flex;flex-direction:column;justify-content:center"><div class="v-avt" style="font-weight:800;color:#1d1d1b;text-align:center;margin-bottom:6px">Avancement</div><div style="font-size:46px;font-weight:800;color:'+cav+';text-align:center;line-height:1.1">'+pc+' %</div><div style="text-align:center;font-size:12.5px;color:var(--muted,#737372);margin-bottom:10px">actions clôturées ('+C+' / '+T+')</div><div style="height:12px;border-radius:6px;background:#efefed;overflow:hidden;display:flex" role="img" aria-label="Avancement '+pc+' %"><div style="width:'+pc+'%;background:'+cav+'"></div><div style="width:'+(pf-pc)+'%;background:#0f9d8a;opacity:.55"></div></div><div style="display:flex;justify-content:space-between;font-size:12px;margin-top:6px;color:var(--muted,#737372)"><span>'+(F?F+' à valider':'')+'</span><span>'+(T-C)+' restantes</span></div></div>'; })()+'</div>'; })();
    (function(){ var op=A.filter(function(a){ return a.st!=='Clos'; }), ur=op.filter(function(a){ return a.pr&&a.pr<=2; }).length, o30=op.filter(function(a){ return ageD(a)>30; }).length, T=A.length, C=cnt['Clos']||0, pc=T?Math.round(100*C/T):0;
      var K=function(l,v,c,q){ var on=(q==='all'&&fS==='all'&&!fQ&&fZ==='all')||(q==='urg'&&fQ==='urg')||(q==='o30'&&fQ==='o30')||(q==='clos'&&fS==='Clos')||(q==='fait'&&fS==='Fait'); on=on&&(FOLD||vOpen); return '<div data-q="'+q+'" class="'+(on?'on':'')+'"><span>'+l+'</span><b style="color:'+c+'">'+v+'</b></div>'; };
      h+='<div class="syn4">'+K('Actions ouvertes',op.length,'#1d1d1b','all')+K('Urgentes P1-2',ur,'#b21f2d','urg')+K('Plus de 30 jours',o30,'#b65807','o30')+K('✅ À valider',op.filter(function(a){ return a.st==='Fait'; }).length,'#0f9d8a','fait')+K('Closes sur la visite',pc+' %','#1e7a34','clos')+'</div>';
    h+='<div class="v-add"><select id="vzone">'+zones.map(function(z){return '<option>'+esc(z)+'</option>';}).join('')+'</select><input id="vtxt" placeholder="Nouvelle action constatée en visite…"><button type="button" id="vaddb">Ajouter</button></div>';
      var zr=zones.map(function(z){ var Z=A.filter(function(a){ return a.zone===z; }), O=Z.filter(function(a){ return a.st!=='Clos'; }), q=function(x){ return Z.filter(function(a){ return a.st===x; }).length; }; return {z:z,t:Z.length,op:O.length,u:O.filter(function(a){ return a.pr&&a.pr<=2; }).length,o60:O.filter(function(a){ return ageD(a)>60; }).length,c:q('Clos'),f:q('Fait'),e:q('En cours'),nv:q('Nouveau'),nf:q('Non fait')+q('Différé')}; }).filter(function(r){ return r.op>0; }).sort(function(a,b){ return b.u-a.u||b.op-a.op; });
    })();
    h+='<div class="v-zsel"><label for="vzf">Zone</label><select id="vzf"><option value="all"'+(fZ==='all'?' selected':'')+'>Toutes les zones ('+(A.length-(cnt['Clos']||0))+')</option>'+zones.map(function(z){ var n=A.filter(function(a){ return a.zone===z&&a.st!=='Clos'; }).length; return '<option value="'+esc(z)+'"'+(fZ===z?' selected':'')+'>'+esc(z)+' ('+n+')</option>'; }).join('')+'</select>'+(fZ!=='all'?'<button type="button" class="zx" data-z="'+esc(fZ)+'" title="Retirer cette zone de la liste">✕ Retirer cette zone</button>':'')+(zHid.length?'<button type="button" id="zshow">↺ '+zHid.length+' zone(s) masquée(s)</button>':'')+'</div>';
    (function(){ var n30=L.filter(function(x){ return ageD(x)>30; }).length, n60=L.filter(function(x){ return ageD(x)>60; }).length; if(n30) h+='<div class="vban" style="margin:8px 0 10px;padding:8px 14px;border-radius:10px;background:'+(n60?'#fdecee':'#fff3e6')+';border:1px solid '+(n60?'#b21f2d':'#ec6707')+';font-weight:700;font-size:13.5px">⏱ '+n30+' action'+(n30>1?'s':'')+' ouverte'+(n30>1?'s':'')+' depuis plus de 30 jours'+(n60?' · dont '+n60+' depuis plus de 60 jours':'')+'</div>'; })();
    h+=(FOLD&&L.length>1?'<div class="vfa"><button type="button" id="vfoldall">'+(L.every(function(a){ return OPENA[a.id]; })?'Tout replier':'Tout déplier')+'</button></div>':'')+'<div class="v-agrid">'+L.map(function(a){ if(a.sup) return '<div class="v-act" style="border-left-color:#b21f2d;background:#fdecee"><div class="top"><span class="z">'+esc(a.zone)+'</span><span class="sg" style="color:#b21f2d;font-weight:800">🗑 Supprimée'+(a.supT?' le '+new Date(a.supT).toLocaleDateString('fr-FR'):'')+'</span></div><div class="t" style="color:#b21f2d;text-decoration:line-through">'+esc(a.txt)+'</div><button type="button" class="esup" data-id="'+esc(a.id)+'" style="margin-top:6px;border:1px solid #b21f2d;color:#b21f2d;background:#fff;border-radius:6px;padding:5px 10px;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer">↩ Rétablir cette action</button></div>'; return '<div class="v-act s-'+key(a.st)+(FOLD?' v-fold'+((OPENA[a.id]||editId===a.id)?' open':''):'')+'" data-aid="'+esc(a.id)+'"><div class="top">'+(FOLD?'<span class="chev">▸</span><span class="pb p'+(a.pr||0)+'">'+(a.pr?'P'+a.pr:'—')+'</span>'+(a.st==='Fait'?'<span class="fv" title="Fait par le directeur : à valider puis clôturer">✅ À valider</span>':'<span class="stb">'+esc(LB[a.st]||a.st)+'</span>'):'')+'<span class="z">'+esc(a.zone)+'</span><span class="sg">'+(a.st==='Clos'||a.st==='Nouveau'?'':esc(a.sig||''))+'</span>'+ageB(a)+'</div>'+(editId===a.id?'<div class="v-ed"><select class="ez">'+zones.map(function(z){return '<option'+(z===a.zone?' selected':'')+'>'+esc(z)+'</option>';}).join('')+'</select><textarea class="et" rows="3">'+esc(a.txt)+'</textarea><div class="v-eb"><button type="button" class="esave" data-id="'+esc(a.id)+'">Enregistrer</button><button type="button" class="ecan">Annuler</button><button type="button" class="edel" data-id="'+esc(a.id)+'">Supprimer</button></div></div>':'<div class="t">'+esc(a.txt)+' <button type="button" class="eedit" data-id="'+esc(a.id)+'" title="Modifier ce point">✎ Modifier</button></div>')+'<div class="v-det"><div class="v-btns" data-id="'+esc(a.id)+'">'+ST.map(function(s){return '<button type="button" data-s="'+s+'" class="'+(a.st===s?'on':'')+'">'+(LB[s]||s)+'</button>';}).join('')+(a.st==='Fait'?'<div style="flex-basis:100%;font-size:12.5px;color:#0f6e60;font-weight:700;margin-top:4px">⏳ Fait par le directeur : à contrôler puis clôturer (bouton Clos)</div>':'')+'</div><div class="v-pr" data-id="'+esc(a.id)+'"><span style="'+(a.pr?'color:'+({1:'#b21f2d',2:'#b21f2d',3:'#e0701a',4:'#1e7a34',5:'#1e7a34'})[a.pr]+';font-weight:800':'')+'">Priorité'+(a.pr?' '+a.pr:'')+'</span>'+[1,2,3,4,5].map(function(p){return '<button type="button" data-p="'+p+'" class="p'+p+(a.pr===p?' on':'')+'">'+p+'</button>';}).join('')+'</div>'+((a.st==='Clos'||a.st==='Fait')&&a.stt?'<div style="margin-top:6px;font-size:12.5px;font-weight:700;color:'+(a.st==='Clos'?'#1e7a34':'#0f6e60')+'">'+(a.st==='Clos'?'✔ Clôturée le ':'✅ Fait le ')+new Date(a.stt).toLocaleDateString('fr-FR')+'</div>':'')+(a.st==='Clos'?'<button type="button" class="erest" data-id="'+esc(a.id)+'" style="margin-top:6px;border:1px solid #1d5fa8;color:#1d5fa8;background:#fff;border-radius:6px;padding:5px 10px;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer">↩ Restaurer (remettre à faire)</button>':'')+pfHtml(o,a)+cmHtml(o,a.id)+'</div></div>'; }).join('')||'<div class="sub">Aucune action avec ce filtre.</div>'; h+='</div>';
    h+='';
    h+='<details class="v-card"><summary>Bilan de la visite du '+D.date+'</summary><div class="in"><ul>'+D.bilan.map(function(x){return '<li>'+esc(x)+'</li>';}).join('')+'</ul></div></details>';
    h+=(D.decisions&&D.decisions.length?'<details class="v-card"><summary>Décisions du mois proposées</summary><div class="in"><ol>'+D.decisions.map(function(x){return '<li>'+esc(x)+'</li>';}).join('')+'</ol></div></details>':'')+'</div>';
    var zoA={}; A.forEach(function(a){ var k=vo[secOf(a)]; if(k==null) k=999; if(zoA[a.zone]==null||k<zoA[a.zone]) zoA[a.zone]=k; });
    var zoF=function(z){ var k=zoA[z]; if(k==null){ var t=TRAME.filter(function(x){ return x.z===z; })[0]; k=(t&&vo[t.id]!=null)?vo[t.id]:999; } return k; };
    var zlAll=zones.slice().sort(function(x,y){ return zoF(x)-zoF(y)||x.localeCompare(y,'fr'); });
    if(!FOLD) h+='<button type="button" id="vfab" aria-label="Nouvelle action">+</button>';
    if(FOLD){ var zo={}; A.forEach(function(a){ var k=vo[secOf(a)]; if(k==null) k=999; if(zo[a.zone]==null||k<zo[a.zone]) zo[a.zone]=k; });
      var zl=zones.filter(function(z){ return A.some(function(a){ return a.zone===z&&a.st!=='Clos'; }); }).sort(function(x,y){ return (zo[x]==null?999:zo[x])-(zo[y]==null?999:zo[y])||x.localeCompare(y,'fr'); });
      var nop=A.filter(function(a){ return a.st!=='Clos'; }).length;
      var chips='<div class="v-zsel vz-chips"><button type="button" class="zc'+(fZ==='all'?' on':'')+'" data-zc="all">Toutes les zones <b>'+nop+'</b></button>'+zl.map(function(z){ var n=A.filter(function(a){ return a.zone===z&&a.st!=='Clos'; }).length; return '<button type="button" class="zc'+(fZ===z?' on':'')+'" data-zc="'+esc(z)+'">'+esc(z)+' <b>'+n+'</b></button>'; }).join('')+(fZ!=='all'?'<button type="button" class="zx" data-z="'+esc(fZ)+'" title="Retirer cette zone de la liste">✕ Retirer cette zone</button>':'')+(zHid.length?'<button type="button" id="zshow">↺ '+zHid.length+' zone(s) masquée(s)</button>':'')+'</div>';
      h=h.replace(/<div class="v-zsel">[\s\S]*?<\/div>/,function(){ return chips; }); }
    root.innerHTML=h.replace('<div class="syn4">',tb+'<div class="syn4">'); syncState(m); bindTabs(m,o,A); pfBind(m,o); if(LASTST) setSt(LASTST[0],LASTST[1]);
    root.querySelectorAll('[data-fs]').forEach(function(e){ e.onclick=function(){ fS=(fS===e.dataset.fs)?'all':e.dataset.fs; window.__visiteRender(m); }; });
    root.querySelectorAll('.zx').forEach(function(b){ b.onclick=function(ev){ ev.stopPropagation(); var z=b.dataset.z, op=A.filter(function(a){ return a.zone===z&&a.st!=='Clos'; });
      var msg=op.length?('⚠ La zone « '+z+' » contient '+op.length+' action(s) encore ouverte(s) :\n'+op.slice(0,4).map(function(a){return '- '+a.txt.slice(0,70);}).join('\n')+(op.length>4?'\n- …':'')+'\n\nElles resteront visibles dans « Toutes zones ». Retirer quand même cette zone de la liste ?'):('Retirer la zone « '+z+' » de la liste ?');
      if(!confirm(msg)) return; o.tz['z:'+norm(z)]={h:true,t:Date.now()}; dirty[m]=true; save(m,o); drawV(m); syncNow(m); }; });
    var zs=document.getElementById('zshow'); if(zs) zs.onclick=function(){ Object.keys(o.tz).forEach(function(k){ if(k.indexOf('z:')===0&&o.tz[k].h) o.tz[k]={h:false,t:Date.now()}; }); dirty[m]=true; save(m,o); drawV(m); syncNow(m); };
    var vzf=document.getElementById('vzf'); if(vzf) vzf.onchange=function(){ fZ=vzf.value; window.__visiteRender(m); }; root.querySelectorAll('.zrow').forEach(function(r){ r.onclick=function(){ fZ=(fZ===r.dataset.z)?'all':r.dataset.z; window.__visiteRender(m); }; });
    var fab=document.getElementById('vfab'); if(fab) fab.onclick=function(){ newActSheet(m,o,zlAll,fZ!=='all'?fZ:null); };
    root.querySelectorAll('[data-zc]').forEach(function(b){ b.onclick=function(){ fZ=(b.dataset.zc==='all'||fZ===b.dataset.zc)?'all':b.dataset.zc; window.__visiteRender(m); }; });
    root.querySelectorAll('.syn4 [data-q]').forEach(function(e){ e.onclick=function(){ var q=e.dataset.q, wasOn=e.classList.contains('on');
      if(!FOLD&&wasOn){ fS='all'; fQ=''; fZ='all'; vOpen=false; window.__visiteRender(m); return; }
      if(q==='all'){ fS='all'; fQ=''; fZ='all'; } else if(q==='clos'){ fS=(fS==='Clos')?'all':'Clos'; fQ=''; } else if(q==='fait'){ fS=(fS==='Fait')?'all':'Fait'; fQ=''; } else { fQ=(fQ===q)?'':q; if(fS==='Clos'||fS==='Fait') fS='all'; }
      if(!FOLD) vOpen=true; window.__visiteRender(m);
      if(!FOLD) setTimeout(function(){ var g=root.querySelector('.v-agrid'); if(g) g.scrollIntoView({behavior:'smooth',block:'start'}); },80); }; });
    if(FOLD){ root.querySelectorAll('.v-act.v-fold').forEach(function(c){ var id=c.dataset.aid; [c.querySelector('.top'),c.querySelector('.t')].forEach(function(e){ if(!e) return; e.onclick=function(ev){ if(ev.target.closest('button,select,textarea,input,a')) return; OPENA[id]=!OPENA[id]; c.classList.toggle('open',!!OPENA[id]); var fa2=document.getElementById('vfoldall'); if(fa2) fa2.textContent=L.every(function(a){ return OPENA[a.id]; })?'Tout replier':'Tout déplier'; }; }); }); var fa=document.getElementById('vfoldall'); if(fa) fa.onclick=function(){ var all=L.every(function(a){ return OPENA[a.id]; }); L.forEach(function(a){ OPENA[a.id]=!all; }); drawV(m); }; }
    var vdi=document.getElementById('vdate'); if(vdi) vdi.onchange=function(){ if(!vdi.value) return; o.vd={v:vdi.value,t:Date.now()}; dirty[m]=true; save(m,o); syncNow(m); };
    root.querySelectorAll('.esup').forEach(function(b){ b.onclick=function(){ var cur=o.ed[b.dataset.id]||{}; o.ed[b.dataset.id]={txt:cur.txt,zone:cur.zone,del:false,t:Date.now()}; dirty[m]=true; save(m,o); drawV(m); syncNow(m); }; });
    root.querySelectorAll('.erest').forEach(function(b){ b.onclick=function(){ o.st[b.dataset.id]={s:'Non fait',t:Date.now()}; dirty[m]=true; save(m,o); drawV(m); syncNow(m); }; });
    root.querySelectorAll('.eedit').forEach(function(b){ b.onclick=function(){ editId=b.dataset.id; drawV(m); }; });
    root.querySelectorAll('.ecan').forEach(function(b){ b.onclick=function(){ editId=null; drawV(m); }; });
    root.querySelectorAll('.esave').forEach(function(b){ b.onclick=function(){ var bx=b.closest('.v-ed'); var t=bx.querySelector('.et').value.trim(); if(!t) return; o.ed[b.dataset.id]={txt:t,zone:bx.querySelector('.ez').value,del:false,t:Date.now()}; editId=null; dirty[m]=true; save(m,o); drawV(m); syncNow(m); }; });
    root.querySelectorAll('.cmedit').forEach(function(b){ b.onclick=function(){ cmEd=b.dataset.id; drawV(m); var t=root.querySelector('.cmt'); if(t) t.focus(); }; });
    root.querySelectorAll('.cmcan').forEach(function(b){ b.onclick=function(){ cmEd=null; drawV(m); }; });
    root.querySelectorAll('.cmsave').forEach(function(b){ b.onclick=function(){ var t=b.closest('.v-cm').querySelector('.cmt').value.trim(); o.cm[b.dataset.id]={txt:t,t:Date.now()}; cmEd=null; dirty[m]=true; save(m,o); drawV(m); syncNow(m); }; });
    root.querySelectorAll('.cmdel').forEach(function(b){ b.onclick=function(){ o.cm[b.dataset.id]={txt:'',t:Date.now()}; cmEd=null; dirty[m]=true; save(m,o); drawV(m); syncNow(m); }; });
    root.querySelectorAll('.edel').forEach(function(b){ b.onclick=function(){ if(!confirm('Supprimer ce point de la liste ?')) return; var cur=o.ed[b.dataset.id]||{}; o.ed[b.dataset.id]={txt:cur.txt,zone:cur.zone,del:true,t:Date.now()}; editId=null; dirty[m]=true; save(m,o); drawV(m); syncNow(m); }; });
    root.querySelectorAll('.v-pr').forEach(function(bx){ bx.querySelectorAll('button').forEach(function(b){ b.onclick=function(){ var cur=o.pr[bx.dataset.id]; var np=(cur&&cur.p===+b.dataset.p)?0:+b.dataset.p; o.pr[bx.dataset.id]={p:np,t:Date.now()}; dirty[m]=true; save(m,o); drawV(m); syncNow(m); }; }); });
    root.querySelectorAll('.v-btns').forEach(function(bx){ bx.querySelectorAll('button').forEach(function(b){ b.onclick=function(){ o.st[bx.dataset.id]={s:b.dataset.s,t:Date.now()}; dirty[m]=true; save(m,o); drawV(m); syncNow(m); }; }); });
    document.getElementById('vaddb').onclick=function(){ var t=document.getElementById('vtxt').value.trim(); if(!t) return; o.add.push({id:'n'+Date.now(),zone:document.getElementById('vzone').value,txt:t,st:'Nouveau',sig:'Nouveau '+new Date().toLocaleDateString('fr-FR'),t:Date.now()}); dirty[m]=true; save(m,o); drawV(m); syncNow(m); };

  };
}

/* ================= RAPPORT 2 : CONTROLE DE GESTION ================= */
/* ---- périodes : la période en cours + les périodes archivées (exercice N-1, mois...) ---- */
function demarrerGestion(G){
  window.__GBASE=G; window.__gKeep=null; window.__gPerSel=null;
  if(window.__reseauRender&&!window.__reseauStub) window.__reseauStub=window.__reseauRender;
  __dg(G); __gPerBar();
}
window.__gSetPer=function(cle){
  var B=window.__GBASE; if(!B) return;
  var P=cle&&B.periodes&&B.periodes[cle]; var keep=window.__gCurGet?window.__gCurGet():null;
  window.__gKeep=keep; window.__gPerSel=P?cle:null;
  var Gx=P?{jours:P.jours||B.jours,mags:P.mags||{},refs:[],reseau:P.reseau||null,__arch:1}:B;
  if(!Object.keys(Gx.mags).length){ window.__gPerSel=null; Gx=B; }
  __dg(Gx); __gPerBar();
  try{ if(window.__reappliquer) window.__reappliquer(); }catch(e){}
};
function __gPerLabel(cle,P){
  var d=(cle||'').match(/(\d\d)\/(\d\d)\/(\d\d)/g)||[]; if(d.length<2) return cle;
  var a=d[0].split('/'), b=d[1].split('/'), A=new Date(2000+ +a[2],+a[1]-1,+a[0]), Z=new Date(2000+ +b[2],+b[1]-1,+b[0]);
  var j=Math.round((Z-A)/864e5)+1, M=['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  if(j>=360) return 'Exercice '+(2000+ +a[2])+'-'+String(2000+ +b[2]).slice(2);
  var last=new Date(Z.getFullYear(),Z.getMonth()+1,0).getDate();
  if(A.getDate()===1&&Z.getDate()===last&&A.getMonth()===Z.getMonth()&&A.getFullYear()===Z.getFullYear()) return M[A.getMonth()].charAt(0).toUpperCase()+M[A.getMonth()].slice(1)+' '+A.getFullYear();
  return d[0]+' → '+d[1];
}
function __gPerBar(){
  var B=window.__GBASE, ctl=document.getElementById('gperctl'), bx=document.getElementById('gper'); if(!ctl||!bx) return;
  var ks=B&&B.periodes?Object.keys(B.periodes).filter(function(k){return B.periodes[k]&&Object.keys(B.periodes[k].mags||{}).length;}):[];
  if(!ks.length){ ctl.style.display='none'; return; }
  function fin(k){ var m=(k.match(/\d\d\/\d\d\/\d\d/g)||[])[1]||''; m=m.split('/'); return m.length===3?+(m[2]+m[1]+m[0]):0; }
  ks.sort(function(a,b){ return fin(b)-fin(a); });
  var cur=(B.mags&&B.mags[Object.keys(B.mags)[0]]||{}).periode||''; cur=(cur.match(/\d\d\/\d\d\/\d\d/g)||[]).slice(0,2).join(' → ');
  ctl.style.display='';
  bx.innerHTML='<button type="button" data-p="" class="'+(window.__gPerSel?'':'active')+'" title="'+cur+'">En cours'+(cur?' · '+cur:'')+'</button>'+ks.map(function(k){ return '<button type="button" data-p="'+k+'" class="'+(window.__gPerSel===k?'active':'')+'" title="'+k+'">'+__gPerLabel(k)+'</button>'; }).join('');
  bx.querySelectorAll('button').forEach(function(b){ b.onclick=function(){ window.__gSetPer(b.dataset.p||null); }; });
  var note=document.getElementById('gpernote'); if(!note){ note=document.createElement('div'); note.id='gpernote'; note.style.cssText='font-size:12.5px;font-weight:700;color:#b21f2d;margin:2px 0 0'; ctl.appendChild(note); }
  note.textContent=window.__gPerSel?'Période passée : les évolutions sont celles données par Booster pour cette période. Pas de détail par référence.':'';
}
function __dg(G){
  if(!G||!G.mags){ document.getElementById('navGestion').style.display='none'; return; }
  const JOURS=G.jours||10;
  const ORDER=["Hesingue","Sierentz","Waldighoffen","Mulhouse"];
  const MAGS=Object.keys(G.mags).sort((a,b)=>{const x=ORDER.indexOf(a),y=ORDER.indexOf(b);return (x<0?99:x)-(y<0?99:y);});
  const TYPO={Waldighoffen:"Rural",Hesingue:"Périurbain",Sierentz:"Périurbain",Mulhouse:"Centre-ville"};
  const MAGCLS={Hesingue:"mag-hes",Waldighoffen:"mag-wal",Sierentz:"mag-sie",Mulhouse:"mag-mul"};
  let compMetric="ca_prog";
  const SEUIL_CHUTE_CA=-1000, SEUIL_BON_CA=1000, SEUIL_CHUTE_PTS=-3, SEUIL_PERTE_EUR=300, SEUIL_COUV_J=110, ROUGE_J=120, SEUIL_PANIER=-10;
  let cur=(window.__gKeep&&MAGS.indexOf(window.__gKeep)>=0)?window.__gKeep:MAGS[0], sortK="dCA", sortAsc=true, filtre=null;
  window.__gCurGet=function(){return cur;};

  const fmtN=(v,dec)=>v==null?"—":v.toLocaleString("fr-FR",{minimumFractionDigits:dec||0,maximumFractionDigits:dec||0});
  const fmtE=(v,dec)=>v==null?"—":fmtN(v,dec)+" €";
  const sgn=(v,dec,suf)=>v==null?"—":(v>0?"+":"")+fmtN(v,dec==null?1:dec)+(suf||"%");
  const cl=v=>v==null?"g-nu":(v>0?"g-up":(v<0?"g-dn":"g-nu"));
  const sp=(v,dec,suf)=>`<span class="${cl(v)}">${sgn(v,dec,suf)}</span>`;
  const sgnE=v=>v==null?"—":(v>0?"+":"")+fmtN(Math.round(v))+" €";

  // ---- ligne de base (valeurs N et N-1 reconstituées) ----
  function mk(r,mag){
    const o={mag,code:r.code,nom:r.nom,ca:r.ca,ca_prog:r.ca_prog,pass:r.pass,pass_prog:r.pass_prog,panier:r.panier,panier_prog:r.panier_prog,
      tx:r.tx,ec:r.ec,marge:r.marge,marge_prog:r.marge_prog,stock:r.stock,rot:r.rot,ca_rang:r.ca_rang,stock_rang:r.stock_rang,camv:r.camv,qte:r.qte,qte_prog:r.qte_prog,qpc:r.qpc,qpc_prog:r.qpc_prog,pass_rang:r.pass_rang,panier_rang:r.panier_rang,rupt:r.rupt,txrupt:r.txrupt,txrupt_rang:r.txrupt_rang};
    o.camvp=(r.camv!=null&&r.ca>0)?100*r.camv/r.ca:null;
    ["ca","panier","pass","tx","marge","rot","stock","qte","qpc"].forEach(k=>{o[k+"_rang"]=r[k+"_rang"]; o[k+"_re"]=r[k+"_re"];});
    o.sg=(r.stock_rang!=null&&r.ca_rang!=null)?r.stock_rang-r.ca_rang:null;
    o.ign=(r.code==="99")||(r.ca!=null&&r.ca<=0);
    o.ca0=(r.ca!=null&&r.ca_prog!=null)?r.ca/(1+r.ca_prog/100):r.ca;
    o.ht=(r.tx>0&&r.marge>0)?r.marge/(r.tx/100):null;
    o.ht0=(o.ht!=null&&r.ca_prog!=null)?o.ht/(1+r.ca_prog/100):o.ht;
    o.m0=(r.marge!=null&&r.marge_prog!=null&&r.marge_prog>-100)?r.marge/(1+r.marge_prog/100):r.marge;
    o.pass0=(r.pass!=null&&r.pass_prog!=null)?r.pass/(1+r.pass_prog/100):r.pass;
    return o;
  }
  function derive(o){
    o.d=(o.marge!=null&&o.m0!=null)?o.marge-o.m0:null;
    o.effT=(o.ht!=null&&o.ec!=null)?o.ht*o.ec/100:null;
    o.effV=(o.d!=null&&o.effT!=null)?o.d-o.effT:null;
    o.cout=(o.ht!=null&&o.marge!=null)?o.ht-o.marge:null;
    o.couv=(o.rot!=null&&o.rot>0)?o.rot:((o.cout>0&&o.stock!=null)?o.stock/(o.cout/JOURS):null); o.scv=o.couv;
    o.dCA=(o.ca!=null&&o.ca0!=null)?o.ca-o.ca0:null;
    const q0=(o.pass0>0&&o.ca0!=null)?o.ca0/o.pass0:null;
    o.effTr=(o.pass!=null&&o.pass0!=null&&q0!=null)?(o.pass-o.pass0)*q0:null;
    o.effPa=(o.dCA!=null&&o.effTr!=null)?o.dCA-o.effTr:null;
    return o;
  }
  function flags(o){
    const f=[]; if(o.ign) return [{t:"Donnée à ignorer",c:"amb",k:"ign"}];
    const caChute=o.dCA!=null&&o.dCA<=SEUIL_CHUTE_CA&&o.ca_prog!=null&&o.ca_prog<=-10;
    if(caChute) f.push({t:"CA en chute",c:"red",k:"chuteca"});
    if(o.pass_prog!=null&&o.pass_prog<=-5&&o.pass>=100) f.push({t:"Passages en baisse",c:"org",k:"trafic"});
    if(o.panier_prog!=null&&o.panier_prog<=SEUIL_PANIER) f.push({t:(o.pass_prog!=null&&o.pass_prog>=3)?"Trafic ↑ / panier ↓":"Panier en baisse",c:"amb",k:"panier"});
    const chute=o.ec!=null&&o.ec<=SEUIL_CHUTE_PTS, perte=o.d!=null&&o.d<=-SEUIL_PERTE_EUR;
    if(chute&&perte) f.push({t:"Marge en chute",c:"org",k:"chute"});
    else if(chute) f.push({t:"Taux de marge bas",c:"amb",k:"taux"});
    else if(perte) f.push({t:"Perte de marge (volume)",c:"amb",k:"perte"});
    if(o.couv!=null&&o.couv>ROUGE_J&&o.ca_prog!=null&&o.ca_prog<0&&o.stock>=50000) f.push({t:"Surstock",c:"amb",k:"stock"});
    if(o.ca_prog!=null&&o.ca_prog>=20&&o.ec!=null&&o.ec<=-5) f.push({t:"Volume à marge faible",c:"amb",k:"vol"});
    if(!f.length&&o.dCA!=null&&o.dCA>=SEUIL_BON_CA&&(o.pass_prog==null||o.pass_prog>=0)) f.push({t:"Bonne dynamique",c:"grn",k:"ok"});
    return f;
  }
  window.__needRefs=function(mag){ if(!G.mags[mag]) return null; return G.mags[mag].rayons.map(r=>derive(mk(r,mag))).filter(o=>!o.ign&&flags(o).some(f=>["chuteca","trafic","panier","chute","taux","perte","stock"].includes(f.k))).map(o=>({code:o.code,nom:o.nom})); };
  // ---- données d'un onglet (magasin ou groupe) ----
  function rowsFor(name){
    if(name!=="GROUPE") return G.mags[name].rayons.map(r=>derive(mk(r,name)));
    const by={};
    MAGS.forEach(m=>G.mags[m].rayons.forEach(r=>{
      const o=mk(r,m), a=by[o.code]||(by[o.code]={code:o.code,nom:o.nom,ign:o.ign,ca:0,ca0:0,ht:0,ht0:0,marge:0,m0:0,pass:0,pass0:0,stock:0,stkR:0,sd:0,ecw:0,n:0,camv:0,rw:0,rca:0,qte:0,qte0:0,qteN:0});
      a.ca+=o.ca||0; a.ca0+=o.ca0||0; a.ht+=o.ht||0; a.ht0+=(o.ht0!=null?o.ht0:(o.ht||0));
      a.marge+=o.marge||0; a.m0+=o.m0||0; a.pass+=o.pass||0; a.pass0+=o.pass0||0; a.stock+=o.stock||0; a.camv+=o.camv||0; if(o.txrupt!=null&&o.ca>0){a.rw+=o.txrupt*o.ca; a.rca+=o.ca;} if(o.qte!=null){a.qte+=o.qte; a.qte0+=(o.qte_prog!=null?o.qte/(1+o.qte_prog/100):o.qte); a.qteN++;} if(o.rot>0&&o.stock!=null){a.stkR+=o.stock; a.sd+=o.stock/o.rot;}
    }));
    return Object.values(by).map(a=>{
      a.rot=a.sd>0?a.stkR/a.sd:null;
      a.camvp=(a.camv>0&&a.ca>0)?100*a.camv/a.ca:null; a.txrupt=a.rca>0?a.rw/a.rca:null;
      a.qte=a.qteN?a.qte:null; a.qte_prog=(a.qteN&&a.qte0>0)?(a.qte/a.qte0-1)*100:null; a.qpc=(a.qteN&&a.pass>0)?a.qte/a.pass:null; { const q0=(a.qteN&&a.pass0>0)?a.qte0/a.pass0:null; a.qpc_prog=(a.qpc!=null&&q0>0)?(a.qpc/q0-1)*100:null; }
      a.ca_prog=a.ca0>0?(a.ca/a.ca0-1)*100:null; a.pass_prog=a.pass0>0?(a.pass/a.pass0-1)*100:null;
      a.panier=a.pass>0?a.ca/a.pass:null; const p0=a.pass0>0?a.ca0/a.pass0:null;
      a.panier_prog=(a.panier!=null&&p0)?(a.panier/p0-1)*100:null;
      a.tx=a.ht>0?a.marge/a.ht*100:null; const t0=a.ht0>0?a.m0/a.ht0*100:null;
      a.ec=(a.tx!=null&&t0!=null)?a.tx-t0:null; a.marge_prog=a.m0>0?(a.marge/a.m0-1)*100:null;
      return derive(a);
    });
  }
  function totalsFor(name,rows){
    if(name!=="GROUPE"){ const t=G.mags[name].tot; if(t) return t; }
    const TT=MAGS.map(m=>G.mags[m].tot);
    if(TT.every(Boolean)){
      const S=f=>TT.reduce((x,t)=>x+f(t),0);
      const ca=S(t=>t.ca), ca0=S(t=>t.ca/(1+(t.ca_prog||0)/100));
      const pass=S(t=>t.pass), pass0=S(t=>t.pass/(1+(t.pass_prog||0)/100));
      const marge=S(t=>t.marge), m0=S(t=>t.marge/(1+(t.marge_prog||0)/100));
      const ht=S(t=>t.tx>0?t.marge/(t.tx/100):0), ht0=S(t=>{const h=t.tx>0?t.marge/(t.tx/100):0;return h/(1+(t.ca_prog||0)/100);});
      const tx=ht>0?marge/ht*100:null, t0=ht0>0?m0/ht0*100:null;
      const stock=S(t=>t.stock||0), sd=S(t=>(t.rot>0&&t.stock)?t.stock/t.rot:0), sk=S(t=>(t.rot>0&&t.stock)?t.stock:0);
      return {ca,ca_prog:ca0>0?(ca/ca0-1)*100:null,pass,pass_prog:pass0>0?(pass/pass0-1)*100:null,
        panier:pass>0?ca/pass:null,panier_prog:(pass>0&&pass0>0)?((ca/pass)/(ca0/pass0)-1)*100:null,
        tx,ec:(tx!=null&&t0!=null)?tx-t0:null,marge,marge_prog:m0>0?(marge/m0-1)*100:null,stock,rot:sd>0?sk/sd:null,camv:S(t=>t.camv||0),txrupt:ca>0?S(t=>(t.txrupt||0)*(t.ca||0))/ca:null};
    }
    const R=rows.filter(r=>!r.ign), s=k=>R.reduce((x,r)=>x+(r[k]||0),0);
    const ca=s("ca"),ca0=s("ca0"),pass=s("pass"),pass0=s("pass0"),marge=s("marge"),m0=s("m0"),ht=s("ht"),ht0=s("ht0");
    const tx=ht>0?marge/ht*100:null,t0=ht0>0?m0/ht0*100:null;
    return {ca,ca_prog:ca0>0?(ca/ca0-1)*100:null,pass,pass_prog:pass0>0?(pass/pass0-1)*100:null,
      panier:pass>0?ca/pass:null,panier_prog:(pass>0&&pass0>0)?((ca/pass)/(ca0/pass0)-1)*100:null,
      tx,ec:(tx!=null&&t0!=null)?tx-t0:null,marge,marge_prog:m0>0?(marge/m0-1)*100:null,stock:s("stock"),camv:s("camv"),txrupt:ca>0?R.reduce((x,r)=>x+((r.txrupt||0)*(r.ca||0)),0)/ca:null,rot:(()=>{const sd=R.reduce((x,r)=>x+((r.rot>0&&r.stock!=null)?r.stock/r.rot:0),0),sk=R.reduce((x,r)=>x+((r.rot>0&&r.stock!=null)?r.stock:0),0);return sd>0?sk/sd:null;})()};
  }
  function rotTag(c){ if(c==null||!isFinite(c)) return ""; const k=c<SEUIL_COUV_J?"grn":(c<=ROUGE_J?"org":"red"); return '<span class="g-tag '+k+'" title="Cible : moins de '+SEUIL_COUV_J+' jours (vert). De '+SEUIL_COUV_J+' à '+ROUGE_J+' : orange. Au-dessus de '+ROUGE_J+' : rouge.">Rotation '+fmtN(c)+' j</span>'; }
  function rotCol(c){ return c==null?"inherit":(c<SEUIL_COUV_J?"#1e7a34":(c<=ROUGE_J?"#e0701a":"#b21f2d")); }
  const nz=x=>String(x||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim();
  const POLES=[["client","👥 Client","passages · panier · NAC"],["commerce","💶 Commerce","CA · Marge · MV"],["stock","📦 Gestion","stock · rotation · poids des achats"]];
  let pole="client";
  const COLS=[
    {k:"nom",t:"Rayon",p:"client commerce stock"},
    {k:"pass",t:"Passages",p:"client"},{k:"panier",t:"Panier",p:"client"},{k:"qpc",t:"<span title=\"Nombre d'Articles par Client\">NAC</span>",p:"client"},{k:"qte",t:"Quantité vendue",p:"client"},{k:"effTr",t:"CA lié aux passages",p:"client"},{k:"effPa",t:"CA lié au panier",p:"client"},{k:"alert",t:"Alertes ventes",p:"client"},
    {k:"ca",t:"CA (€)",p:"commerce"},{k:"dCA",t:"Δ CA vs N-1",p:"commerce"},{k:"camvp",t:"CA meilleures ventes",p:"commerce"},{k:"tx",t:"Taux marge",p:"commerce"},{k:"marge",t:"Marge (€)",p:"commerce"},{k:"d",t:"Δ marge",p:"commerce"},{k:"alertM",t:"Alertes marge",p:"commerce"},
    {k:"scv",t:"Rotation (j)",p:"stock"},{k:"pA",t:"<span title=\"Part du rayon dans les achats HT réels du mois (achats du rayon ÷ achats réels totaux). Rouge : le rayon pèse plus dans les achats que dans le CA. Vert : moins. Orange : à peu près égal.\">Poids des achats <small>(% achats totaux)</small></span>",p:"stock"},{k:"pC",t:"<span title=\"Part du rayon dans le CA (CA du rayon ÷ CA total)\">Poids du CA <small>(% CA total)</small></span>",p:"stock"},{k:"cm",t:"<span title=\"Explique ici pourquoi les achats dérapent (rayon en rouge). Entrée pour valider.\">Commentaire <small>(dérapage des achats)</small></span>",p:"stock"},{k:"stock",t:"Stock (€)",p:"stock"},{k:"txrupt",t:"Rupture (tx)",p:"stock"},{k:"alertS",t:"Alertes stock",p:"stock"}
  ];

  const HINT={
    "35":{ct:"En début de saison de chauffe : vérifier disponibilité, prix et mise en avant des produits d'appoint et accessoires (poêles, granulés, radiateurs)."},
    "75":{mt:"Fin de saison jardin : planifier un déstockage maîtrisé puis la bascule vers l'offre hivernage."},
    "80":{ct:"Vérifier que les ventes très fortes à taux bas viennent d'une opération voulue (liquidation, promo) et pas d'un prix ou d'une remise mal paramétrés."}
  };
  function actions(o){
    const ct=[],mt=[],diag=[],k=o.fl.map(f=>f.k);
    const stockLib=(o.couv>0&&o.stock!=null)?o.stock*(1-SEUIL_COUV_J/o.couv):0;
    const gainPanier=(o.pass&&o.panier&&o.panier_prog!=null)?o.pass*(o.panier/(1+o.panier_prog/100)-o.panier):0;
    if(k.includes("chuteca")||k.includes("trafic")){
      diag.push(`CA ${sgnE(o.dCA)} (${sgn(o.ca_prog)}) : passages ${sgn(o.pass_prog)} (${sgnE(o.effTr)}), panier ${sgn(o.panier_prog)} (${sgnE(o.effPa)})`);
      if(o.effTr!=null&&o.effTr<0){
        ct.push(`Vérifier la disponibilité sur les références phares du rayon (ruptures, stock bas) : un rayon vide fait fuir les clients.`);
        ct.push(`Contrôler visibilité et implantation : signalétique, tête de gondole, propreté, mise en avant des produits de saison.`);
        ct.push(`Comparer les prix des références les plus vendues avec la concurrence locale (relevé de la semaine).`);
        mt.push(`Planifier un temps fort ou une animation du rayon (tract, PLV, démonstration) sur les 4 à 8 prochaines semaines.`);
        mt.push(`Revoir l'assortiment et la profondeur de gamme face à la demande locale.`);
      }
      if(o.effPa!=null&&o.effPa<0){
        ct.push(`Brief équipe : proposer systématiquement le produit associé et la gamme supérieure en rayon.`);
        mt.push(`Construire des ensembles et des lots pour remonter le panier.`);
      }
    }
    if(k.includes("chute")||k.includes("taux")){
      diag.push(`taux ${sgn(o.ec,1," pts")} (${fmtN(o.tx,1)} %)`);
      ct.push(`Contrôler les prix de vente et les étiquettes des 10 premières références du rayon (écart prix magasin / prix conseillé / concurrence).`);
      ct.push(`Lister les ventes à prix réduit, remises accordées et opérations promo non prévues sur la période ; arrêter celles qui ne sont pas voulues.`);
      ct.push(`Vérifier démarque connue : casse, retours, ajustements d'inventaire du rayon.`);
      if(o.effT<0) ct.push(`Objectif : reprendre les ${fmtN(-o.ec,1)} pt perdus = environ ${fmtN(-o.effT)} € de marge sur une période équivalente.`);
      mt.push(`Revoir les conditions d'achat et les prix d'achat des références les plus vendues avec l'achat / la centrale.`);
      mt.push(`Rééquilibrer le mix : pousser les références à taux supérieur au taux du rayon, limiter la remise maximale autorisée.`);
      mt.push(`Fixer un taux cible par rayon avec le chef de rayon et le contrôler chaque semaine dans cette page.`);
    }
    if(k.includes("perte")){
      diag.push(`marge ${sgnE(o.d)} portée surtout par le volume (CA ${sgn(o.ca_prog)})`);
      ct.push(`Vérifier les ruptures et stocks bas sur les meilleures ventes du rayon (rayon vide = ventes perdues).`);
      ct.push(`Contrôler l'implantation et la mise en avant (tête de gondole, signalétique) des références moteurs.`);
      mt.push(`Planifier les animations et temps forts du rayon sur les 4 à 8 prochaines semaines.`);
    }
    if(k.includes("stock")){
      diag.push(`stock ${fmtE(o.stock)}, rotation ${fmtN(o.couv)} jours, CA ${sgn(o.ca_prog)}`);
      ct.push(`Sortir la liste des références en stock sans vente récente et suspendre leur réapprovisionnement.`);
      ct.push(`Regrouper et mettre en avant les références à rotation lente (promo ciblée, lot) en gardant un taux de marge acceptable.`);
      if(stockLib>0) mt.push(`Ramener la rotation du rayon à ${SEUIL_COUV_J} jours : environ ${fmtE(Math.round(stockLib/100)*100)} de trésorerie à libérer.`);
      mt.push(`Réduire les quantités de commande et revoir l'assortiment (références à sortir, retours fournisseur possibles).`);
    }
    if(k.includes("panier")){
      diag.push(`panier ${sgn(o.panier_prog)} alors que les passages sont ${sgn(o.pass_prog)}`);
      ct.push(`Brief équipe : ventes additionnelles et produits associés à proposer en rayon et en caisse.`);
      ct.push(`Mettre en avant les produits complémentaires, lots ou packs à proximité des références les plus achetées.`);
      if(gainPanier>0) mt.push(`Retrouver le panier N-1 vaudrait environ ${fmtE(Math.round(gainPanier/10)*10)} de CA sur la période.`);
      mt.push(`Construire une offre associée (ensembles, consommables, accessoires) et suivre le panier du rayon chaque semaine.`);
    }
    if(k.includes("vol")){
      diag.push(`CA ${sgn(o.ca_prog)} mais taux ${sgn(o.ec,1," pts")}`);
      ct.push(`Confirmer que le volume vient d'une opération voulue (liquidation, promo) et pas d'une erreur de prix.`);
      mt.push(`Transformer le volume en marge : monter en gamme, vendre les produits associés à meilleur taux.`);
    }
    if(k.includes("ok")){
      diag.push(`marge ${sgnE(o.d)}, taux ${sgn(o.ec,1," pts")}`);
      ct.push(`Maintenir disponibilité et implantation actuelles ; ne pas casser ce qui fonctionne.`);
      mt.push(`Identifier ce qui marche ici (références, animations, équipe) et le déployer dans les autres rayons et magasins.`);
    }
    const h=HINT[o.code]; if(h){ if(h.ct) ct.push(h.ct); if(h.mt) mt.push(h.mt); }
        const red2=k.includes("chuteca");
    const pri=(red2?1e6:0)+(o.dCA<0?-o.dCA:0)+(o.d<0?-o.d*0.3:0)+(stockLib>0?stockLib/200:0)+(gainPanier>0?gainPanier/10:0);
    const enjeu=[]; if(o.dCA!=null&&Math.abs(o.dCA)>=500) enjeu.push(`Δ CA ${sgnE(o.dCA)}`); if(o.d!=null&&Math.abs(o.d)>=300) enjeu.push(`Δ marge ${sgnE(o.d)}`); if(stockLib>0) enjeu.push(`stock à libérer ≈ ${fmtE(Math.round(stockLib/100)*100)}`);
    return {o,ct,mt,diag,pri,red:red2,enjeu:enjeu.join(" · "),pos:k.includes("ok")&&k.length===1};
  }
  function renderPlan(rows){
    const A=rows.filter(r=>!r.ign&&r.fl.some(f=>f.k!=="ign")).map(actions).filter(a=>a.ct.length||a.mt.length).sort((a,b)=>b.pri-a.pri);
    const neg=A.filter(a=>!a.pos), pos=A.filter(a=>a.pos);
    const card=(a,open)=>`<details class="g-card ${a.pos?"grn":(a.red?"red":"")}" data-r="${a.o.nom}" ${open?"open":""}><summary><span class="nm">${a.o.nom}</span>`+
      a.o.fl.map(f=>`<span class="g-tag ${f.c}">${f.t}</span>`).join("")+`<span class="enjeu ${a.pos?"g-up":"g-dn"}">${a.enjeu}</span></summary>`+
      (a.diag.length?`<div class="g-diag"><b>Constat :</b> ${a.diag.join(" ; ")}.</div>`:"")+
      `<div class="g-cols"><div><h4>Court terme · cette semaine</h4><ul>${a.ct.map(x=>`<li>${x}</li>`).join("")||"<li>—</li>"}</ul></div>`+
      `<div><h4>Moyen terme · 1 à 3 mois</h4><ul>${a.mt.map(x=>`<li>${x}</li>`).join("")||"<li>—</li>"}</ul></div></div>`+
      ((cur!=="GROUPE"&&a.o.code)?(G.refs||[]).filter(x=>x.mag===cur&&x.rayon===a.o.code).map((S,i)=>`<div style="padding:0 14px 10px"><h4 style="margin:6px 0">Références à traiter dans ce rayon</h4>${refBlock(S,i,cur)}</div>`).join(""):"")+`</details>`;
    const el=document.getElementById("gplan");
    el.innerHTML=`<h2>Plan d'action chef de secteur</h2><div class="sub">Actions proposées automatiquement à partir des alertes de chaque rayon, classées par enjeu. Les 3 premières sont dépliées.</div>`+
      `<div class="bar"><button type="button" id="gback">← Retour au tableau</button> <button type="button" id="gcopy">Copier le plan (texte)</button><span id="gcopyok" class="g-up" style="font-size:12.5px"></span></div>`+
      (neg.length?neg.map((a,i)=>card(a,i<3)).join(""):"<div class='sub'>Aucune alerte à traiter sur ce périmètre.</div>")+
      (pos.length?`<h3 style="margin:14px 0 6px;font-size:14px">À capitaliser</h3>`+pos.map(a=>card(a,false)).join(""):"");
    document.getElementById("gback").onclick=function(){sub="syn";renderSub();window.scrollTo({top:0});};
    document.getElementById("gcopy").onclick=function(){
      let T=`PLAN D'ACTION — ${cur} — ${(G.mags[MAGS[0]].periode||"").replace(/\s*comparé à.*/,"")}\n`;
      A.forEach(a=>{ T+=`\n${a.o.nom.toUpperCase()}${a.enjeu?" ("+a.enjeu+")":""}\n`;
        if(a.diag.length) T+=`Constat : ${a.diag.join(" ; ")}.\n`;
        T+=`Court terme (cette semaine) :\n`+a.ct.map(x=>" - "+x).join("\n")+`\nMoyen terme (1 à 3 mois) :\n`+a.mt.map(x=>" - "+x).join("\n")+"\n"; });
      const ok=()=>{document.getElementById("gcopyok").textContent="Copié";};
      try{ navigator.clipboard.writeText(T).then(ok,()=>{throw 0;}); }
      catch(_){ const ta=document.createElement("textarea"); ta.value=T; ta.style.position="fixed"; ta.style.opacity="0"; document.body.appendChild(ta); ta.select(); try{document.execCommand("copy");ok();}catch(e){} document.body.removeChild(ta); }
    };
  }

  // ================= RESEAU (onglet Booster « Total Pays ») =================
  (function(){
    const RS=G.reseau; if(!RS||!RS.rayons||!RS.rayons.length){ window.RESEAU=null; if(window.__reseauStub) window.__reseauRender=window.__reseauStub; return; }
    const RT=RS.tot||null, RR=RS.rayons.map(r=>derive(mk(r,"RESEAU")));
    const per=(RS.periode||"").replace(/\s*comparé à.*/,"");
    const V={};
    if(RT){ V["pass"]=RT.pass_prog; V["panier"]=RT.panier; V["qpc"]=RT.qpc; V["tx"]=RT.tx; V["rot"]=RT.rot; V["txrupt"]=RT.txrupt;
      V["Prog CA"]=RT.ca_prog; V["Prog panier"]=RT.panier_prog; V["Évol. taux de marge"]=RT.ec; V["Prog marge €"]=RT.marge_prog;
      V["CA des meilleures ventes (% du CA)"]=(RT.camv!=null&&RT.ca>0)?100*RT.camv/RT.ca:null; }
    RR.forEach(r=>{ if(r.ign) return; ["ca_prog","pass_prog","panier_prog","panier","tx","ec","marge_prog","couv"].forEach(k=>{ V[r.code+"|"+k]=r[k]; }); });
    Object.keys(V).forEach(k=>{ if(V[k]==null||!isFinite(V[k])) delete V[k]; });
    window.RESEAU={periode:per,vals:V,ok:1};
    const STC={Hesingue:"#1e7a34",Sierentz:"#e0a900",Waldighoffen:"#1d5fa8",Mulhouse:"#7b3fa0"};
    const ORDM=["Hesingue","Sierentz","Waldighoffen","Mulhouse"].filter(m=>G.mags[m]);
    const NM=m=>m==="Hesingue"?"Hésingue":m;
    const KP=[["Prog CA","ca_prog",v=>sgn(v),"pts"],["Prog passages","pass_prog",v=>sgn(v),"pts"],["Panier moyen","panier",v=>fmtE(v,2),"rel"],["Prog panier","panier_prog",v=>sgn(v),"pts"],
      ["NAC (articles par client)","qpc",v=>fmtN(v,2),"rel"],["Taux de marge","tx",v=>fmtN(v,1)+" %","pts"],["Évol. taux de marge","ec",v=>sgn(v,1," pts"),"pts"],["Prog marge €","marge_prog",v=>sgn(v),"pts"]];
    const RM=[["ca_prog","Prog CA",v=>sgn(v),"pts"],["pass_prog","Prog passages",v=>sgn(v),"pts"],["panier_prog","Prog panier",v=>sgn(v),"pts"],["panier","Panier (€)",v=>fmtN(v,2)+" €","rel"],["tx","Taux de marge",v=>fmtN(v,1)+" %","pts"],["ec","Évol. taux (pts)",v=>sgn(v,1," pts"),"pts"]];
    let rsMetric="ca_prog";
    const gap=(x,q,mode)=>{ if(x==null||q==null||!isFinite(x)||!isFinite(q)) return null; return mode==="rel"?(q?(x/q-1)*100:null):x-q; };
    const pill=(g,mode)=>{ if(g==null) return ""; const c=g>0.05?"rs-up":(g<-0.05?"rs-dn":""); return ` <small class="${c}" title="Écart avec le Réseau">${(g>0?"+":"")+fmtN(g,1)+(mode==="rel"?" %":" pts")}</small>`; };
    window.__reseauRender=function(v){
      const e=x=>String(x).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]);
      const TOT={}; ORDM.forEach(m=>{ TOT[m]=totalsFor(m,rowsFor(m)); }); const TG=totalsFor("GROUPE",rowsFor("GROUPE"));
      let h='<h2>Réseau<span class="rs-badge">France entière · Total Pays</span></h2><div style="color:#737372;font-size:14px">Les chiffres du réseau national, pour comparer chaque magasin et le Groupe à la France.'+(per?' Période : '+e(per)+'.':'')+' En vert, le magasin fait mieux que le réseau ; en rouge, moins bien (l\'écart est sous la valeur).</div>';
      h+='<h3 style="margin:16px 0 6px;font-size:16px">Vue d\'ensemble</h3><div style="overflow:auto"><table class="rs-tb"><thead><tr><th>Indicateur</th><th>Réseau</th>'+ORDM.map(m=>'<th style="border-top:5px solid '+STC[m]+'">'+NM(m)+'</th>').join("")+'<th style="border-top:5px solid #b21f2d">Groupe</th></tr></thead><tbody>';
      KP.forEach(k=>{ const q=RT?RT[k[1]]:null; h+='<tr><td>'+k[0]+'</td><td'+(q==null?' class="na"':' style="font-weight:700"')+'>'+(q==null?'—':k[2](q))+'</td>'+ORDM.concat(["G"]).map(m=>{ const x=(m==="G"?TG:TOT[m])[k[1]]; return '<td'+(x==null?' class="na"':'')+'>'+(x==null?'—':k[2](x)+pill(gap(x,q,k[3]),k[3]))+'</td>'; }).join("")+'</tr>'; });
      h+='</tbody></table></div>';
      h+='<h3 style="margin:18px 0 6px;font-size:16px">Rayon par rayon</h3><div class="g-seg" style="margin-bottom:8px">'+RM.map(m=>'<button type="button" data-rm="'+m[0]+'" class="'+(m[0]===rsMetric?"on":"")+'">'+m[1]+'</button>').join("")+'</div>';
      const M=RM.find(m=>m[0]===rsMetric)||RM[0];
      const SH={}; ORDM.forEach(m=>{ SH[m]=rowsFor(m); });
      h+='<div style="overflow:auto"><table class="rs-tb"><thead><tr><th>Rayon</th><th>Réseau</th>'+ORDM.map(m=>'<th style="border-top:5px solid '+STC[m]+'">'+NM(m)+'</th>').join("")+'</tr></thead><tbody>';
      RR.filter(r=>!r.ign).forEach(r=>{ const q=r[M[0]]; h+='<tr><td>'+e(r.nom)+'</td><td'+(q==null?' class="na"':' style="font-weight:700"')+'>'+(q==null?'—':M[2](q))+'</td>'+ORDM.map(m=>{ const o=SH[m].find(x=>x.code===r.code); const x=o?o[M[0]]:null; const small=o&&TOT[m]&&TOT[m].ca>0&&(o.ca||0)/TOT[m].ca<0.015; return '<td'+(x==null?' class="na"':(small?' style="opacity:.5;font-style:italic" title="Petit rayon (moins de 1,5 % du CA du magasin)"':''))+'>'+(x==null?'—':M[2](x)+(small?'':pill(gap(x,q,M[3]),M[3])))+'</td>'; }).join("")+'</tr>'; });
      h+='</tbody></table></div>';
      v.innerHTML=h;
      v.querySelectorAll("[data-rm]").forEach(b=>b.onclick=()=>{ rsMetric=b.dataset.rm; window.__reseauRender(v); });
    };
  })();

  // ================= COMPARATIF ENTRE MAGASINS =================
  const METRICS=[
    {k:"ca_prog",t:"Prog CA",f:v=>sgn(v),best:"max"},
    {k:"pass_prog",t:"Prog passages",f:v=>sgn(v),best:"max"},
    {k:"panier_prog",t:"Prog panier",f:v=>sgn(v),best:"max"},
    {k:"panier",t:"Panier (€)",f:v=>fmtN(v,2)+" €",best:"max"},
    {k:"dCA",t:"Δ CA €",f:v=>sgnE(v),best:"max"},
    {k:"tx",t:"Taux de marge",f:v=>fmtN(v,1)+" %",best:"max"},
    {k:"ec",t:"Évol. taux (pts)",f:v=>sgn(v,1," pts"),best:"max"},
    {k:"marge_prog",t:"Prog marge €",f:v=>sgn(v),best:"max"},
    {k:"couv",t:"Rotation stock (j)",f:v=>fmtN(v),best:"min"},
    {k:"stock",t:"Stock (€)",f:v=>fmtE(v),best:null},
    {k:"sg",t:"Rang stock vs CA",f:v=>(v>0?"+":(v<0?"−":""))+Math.abs(Math.round(v))+" rang"+(Math.abs(v)>1?"s":""),best:"abs"},
    {k:"txrupt",t:"Taux de rupture",f:v=>fmtN(v,1)+" %",best:"min"},
    {k:"d",t:"Δ marge €",f:v=>sgnE(v),best:"max"}
  ];
  const RKMAP={ca_prog:"ca",pass_prog:"pass",panier_prog:"panier",panier:"panier",dCA:"ca",tx:"tx",ec:"tx",marge_prog:"marge",couv:"rot",stock:"stock",txrupt:"txrupt",d:"marge"};
  function rgCell(r,mk){
    const st='<small style="display:block;font-weight:600;color:#737372;font-size:11px;line-height:1.3">';
    if(mk==="sg"){ return (r.stock_rang!=null&&r.ca_rang!=null)?st+"stock "+r.stock_rang+" · CA "+r.ca_rang+"</small>":""; }
    const k=RKMAP[mk]; if(!k||r[k+"_rang"]==null) return "";
    return st+"rang "+rkH(r[k+"_rang"],r[k+"_re"])+"</small>"; }
  function bestWorst(vals,dir){
    if(!dir) return {};
    if(dir==="abs"){ vals=vals.map(v=>v==null?v:Math.abs(v)); dir="min"; }
    const ok=vals.map((v,i)=>[v,i]).filter(x=>x[0]!=null&&isFinite(x[0]));
    if(ok.length<2) return {};
    const srt=ok.slice().sort((a,b)=>dir==="max"?b[0]-a[0]:a[0]-b[0]);
    if(srt[0][0]===srt[srt.length-1][0]) return {};
    return {best:srt[0][1],worst:srt[srt.length-1][1]};
  }
  const tLab=m=>`${m}<small>${TYPO[m]||""}</small>`;
  function renderComp(){
    const per=(G.mags[MAGS[0]].periode||"").replace(/\s*comparé à.*/,"");
    document.getElementById("gprogline").innerHTML=`<span class="mag">Démarche leader</span><span class="nat">${per}</span>`;
    const R={}, T={}; MAGS.forEach(m=>{R[m]=rowsFor(m); T[m]=totalsFor(m,R[m]); R[m].forEach(r=>{r.share=T[m].ca>0?(r.ca||0)/T[m].ca:0;});});
    const SHARE_MIN=0.015;
    // coût d'achat des ventes -> couverture globale
    const couvTot=m=>{const c=R[m].filter(r=>!r.ign).reduce((x,r)=>x+(r.cout||0),0); return c>0&&T[m].stock!=null?T[m].stock/(c/JOURS):null;};
    // ---------- 1. synthèse ----------
    const L=[
      {t:"Chiffre d'affaires",f:v=>fmtE(v),g:m=>T[m].ca,rk:"ca"},
      {t:"Prog CA",f:v=>sgn(v),g:m=>T[m].ca_prog,dir:"max",sg:1},
      {t:"Prog passages caisse",f:v=>sgn(v),g:m=>T[m].pass_prog,dir:"max",sg:1,rk:"pass"},
      {t:"Panier moyen",f:v=>fmtE(v,2),g:m=>T[m].panier,dir:"max",rk:"panier"},
      {t:"Prog panier",f:v=>sgn(v),g:m=>T[m].panier_prog,dir:"max",sg:1},
      {t:"NAC (articles par client)",f:v=>fmtN(v,2),g:m=>T[m].qpc,dir:"max",rk:"qpc"},
      {t:"Taux de marge",f:v=>fmtN(v,1)+" %",g:m=>T[m].tx,dir:"max",rk:"tx"},
      {t:"Évol. taux de marge",f:v=>sgn(v,1," pts"),g:m=>T[m].ec,dir:"max",sg:1},
      {t:"Marge (€)",f:v=>fmtE(v),g:m=>T[m].marge,rk:"marge"},
      {t:"Prog marge €",f:v=>sgn(v),g:m=>T[m].marge_prog,dir:"max",sg:1},
      {t:"Stock (€)",f:v=>fmtE(v),g:m=>T[m].stock,rk:"stock"},
      {t:"Rotation du stock (jours)",f:v=>fmtN(v),g:m=>T[m].rot!=null?T[m].rot:couvTot(m),dir:"min",rot:1,rk:"rot"},
      {t:"Taux de rupture",f:v=>v==null?"—":fmtN(v,1)+" %",g:m=>T[m].txrupt!=null?T[m].txrupt:null,dir:"min",rk:"txrupt"},
      {t:"CA des meilleures ventes (% du CA)",f:v=>v==null?"—":fmtN(v,1)+" %",g:m=>(T[m].camv!=null&&T[m].ca>0)?100*T[m].camv/T[m].ca:null,dir:"max"}
    ];
    let h=`<h2>1. Vue d'ensemble</h2><div class="sub">En vert le meilleur magasin, en rouge le moins bon, sur les lignes comparables (progressions, taux, rotation du stock). Les montants dépendent de la taille et du profil du magasin : ne compare que les % et les taux.</div><div class="scroll"><table><thead><tr><th>Indicateur</th><th class="rs" style="border-top:5px solid #ec6707">Réseau</th>${MAGS.map(m=>`<th style="border-top:5px solid ${({Waldighoffen:"#1d5fa8",Hesingue:"#1e7a34",Sierentz:"#e0a900",Mulhouse:"#7b3fa0"})[m]||"#1d1d1b"}">${tLab(m)}</th>`).join("")}</tr></thead><tbody>`;
    const rkTag=(m,k)=>{ const t=T[m]; const r=t[k+"_rang"]; if(r==null) return ""; let e=t[k+"_re"]; if(e==null) e=t[k+"_evol"]; return `<span class="rg">${rkH(r,e)}</span>`; };
    L.forEach(l=>{ const v=MAGS.map(m=>l.g(m)); const bw=l.dir?bestWorst(v,l.dir):{};
      h+=`<tr><td class="lab">${l.t}</td>${(()=>{const q=window.__rsv(l.rk||l.t); return `<td class="rs">${q==null?"—":l.f(q)}</td>`;})()}${v.map((x,i)=>{ const c=bw.best===i?"best":(bw.worst===i?"worst":""); const tc=x==null?"":(l.sg?(x>0?"g-up":(x<0?"g-dn":"")):""); const st=(l.rot&&x!=null)?` style="color:${rotCol(x)};font-weight:700"`:""; return `<td class="${c} ${tc}"${st}>${x==null?"—":l.f(x)}${l.rk?rkTag(MAGS[i],l.rk):""}</td>`; }).join("")}</tr>`; });
    h+=`</tbody></table></div>`;
    // ---------- 2. matrice rayon x magasin ----------
    const codes={}; MAGS.forEach(m=>R[m].forEach(r=>{ if(!r.ign) codes[r.code]=r.nom; }));
    const byCode=c=>MAGS.map(m=>R[m].find(r=>r.code===c)||null);
    const M=METRICS.find(x=>x.k===compMetric)||METRICS[0];
    const lines=Object.keys(codes).map(c=>{ const rr=byCode(c), v=rr.map(r=>(r&&r.share>=SHARE_MIN)?r[M.k]:null); const ok=v.filter(x=>x!=null&&isFinite(x)); return {c,nom:codes[c],v,rr,bw:bestWorst(v,M.best),spread:ok.length>1?Math.max.apply(null,ok)-Math.min.apply(null,ok):-1}; })
      .sort((a,b)=>b.spread-a.spread);
    h+=`<h2>2. Rayon par rayon</h2><div class="sub">Choisis l'indicateur. Les rayons sont classés par écart entre le meilleur et le moins bon magasin : en haut, ce qu'il y a le plus à apprendre. Les petits rayons (moins de 1,5 % du CA du magasin) sont grisés et exclus de la comparaison.</div>`+
      `<div class="g-seg">${METRICS.map(x=>`<button type="button" data-cm="${x.k}" class="${x.k===compMetric?"on":""}">${x.t}</button>`).join("")}</div>`+
      `<div class="scroll"><table><thead><tr><th>Rayon</th><th class="rs" style="border-top:5px solid #ec6707">Réseau</th>${MAGS.map(m=>`<th style="border-top:5px solid ${({Waldighoffen:"#1d5fa8",Hesingue:"#1e7a34",Sierentz:"#e0a900",Mulhouse:"#7b3fa0"})[m]||"#1d1d1b"}">${tLab(m)}</th>`).join("")}<th>Écart max</th></tr></thead><tbody>`+
      lines.map(l=>`<tr><td class="lab">${l.nom}</td><td class="rs">${(()=>{const q=window.__rsv(l.c+"|"+M.k); return q==null?"—":M.f(q);})()}</td>${l.rr.map((r,i)=>{const x=r?r[M.k]:null; if(x==null||!isFinite(x)) return `<td>—</td>`; const sig=r.share>=SHARE_MIN; return `<td class="${sig&&l.bw.best===i?"best":(sig&&l.bw.worst===i?"worst":"")}" ${sig?"":'style="opacity:.45;font-style:italic" title="Petit rayon (moins de 1,5 % du CA du magasin) : exclu de la comparaison"'}>${M.f(x)}${rgCell(r,M.k)}</td>`;}).join("")}<td>${l.spread<0?"—":(M.k==="tx"||M.k==="ec"||M.k.indexOf("prog")>=0?fmtN(l.spread,1)+" pts":(M.k==="panier"?fmtN(l.spread,2)+" €":(M.k==="dCA"||M.k==="d"?fmtE(l.spread):fmtN(l.spread))))}</td></tr>`).join("")+`</tbody></table></div>`;
    // ---------- 3. à dupliquer ----------
    const rec={passages:[],panier:[],marge:[],stock:[]};
    Object.keys(codes).forEach(c=>{
      const rr=byCode(c).map((r,i)=>r?{m:MAGS[i],r}:null).filter(x=>x&&x.r.share>=SHARE_MIN); if(rr.length<2) return;
      const nom=codes[c];
      // marge : meilleur taux
      const A=rr.filter(x=>x.r.tx!=null).sort((a,b)=>b.r.tx-a.r.tx); const lead=A[0];
      A.slice(1).forEach(x=>{ if(lead&&lead.r.tx-x.r.tx>=3&&x.r.ht>0&&lead.r.ca>=1500){ const g=(lead.r.tx-x.r.tx)/100*x.r.ht;
        if(g>=150) rec.marge.push({nom,lead:lead.m,lag:x.m,det:`${fmtN(lead.r.tx,1)} % contre ${fmtN(x.r.tx,1)} %`,gain:g}); }});
      // passages : meilleure progression du nombre de passages
      const B=rr.filter(x=>x.r.pass_prog!=null&&x.r.pass0>0&&x.r.pass>=100).sort((a,b)=>b.r.pass_prog-a.r.pass_prog); const l2=B[0];
      B.slice(1).forEach(x=>{ if(l2&&l2.r.pass_prog-x.r.pass_prog>=10&&x.r.pass>0){ const g=x.r.pass0*((l2.r.pass_prog-x.r.pass_prog)/100)*(x.r.ca/x.r.pass);
        if(g>=500) rec.passages.push({nom,lead:l2.m,lag:x.m,det:`passages ${sgn(l2.r.pass_prog)} contre ${sgn(x.r.pass_prog)}`,gain:g}); }});
      // panier : meilleure progression du panier
      const P=rr.filter(x=>x.r.panier_prog!=null&&x.r.pass>=100&&x.r.ca0>0).sort((a,b)=>b.r.panier_prog-a.r.panier_prog); const l4=P[0];
      P.slice(1).forEach(x=>{ if(l4&&l4.r.panier_prog-x.r.panier_prog>=10){ const g=x.r.pass*(x.r.ca0/x.r.pass0)*((l4.r.panier_prog-x.r.panier_prog)/100);
        if(g>=500) rec.panier.push({nom,lead:l4.m,lag:x.m,det:`panier ${sgn(l4.r.panier_prog)} contre ${sgn(x.r.panier_prog)}`,gain:g}); }});
      // stock : plus faible couverture
      const C=rr.filter(x=>x.r.couv!=null).sort((a,b)=>a.r.couv-b.r.couv); const l3=C[0];
      C.slice(1).forEach(x=>{ if(l3&&x.r.couv>=Math.max(ROUGE_J,1.5*l3.r.couv)&&x.r.stock>=50000){ const g=x.r.stock*(1-l3.r.couv/x.r.couv);
        if(g>=10000) rec.stock.push({nom,lead:l3.m,lag:x.m,det:`${fmtN(l3.r.couv)} j contre ${fmtN(x.r.couv)} j`,gain:g}); }});
    });
    const rep=(a,b)=>TYPO[a]&&TYPO[a]===TYPO[b]?`<span class="g-rep same">Même profil (${TYPO[a]}) : à reproduire</span>`:`<span class="g-rep diff">${TYPO[a]||"?"} → ${TYPO[b]||"?"} : à adapter</span>`;
    const blocs=[["passages","À dupliquer : faire venir les clients (passages)","Écart d'au moins 10 pts sur la progression des passages. Gain = CA supplémentaire si le magasin en retard progressait comme la référence.","Comparer visibilité du rayon, animation, communication locale et disponibilité avec le magasin de référence.",x=>"≈ "+fmtE(Math.round(x/100)*100)+" de CA"],
                 ["panier","À dupliquer : vendre plus par client (panier)","Écart d'au moins 10 pts sur la progression du panier. Gain = CA supplémentaire si le panier progressait comme chez la référence.","Comparer vente additionnelle, produits associés, lots et ensembles avec le magasin de référence.",x=>"≈ "+fmtE(Math.round(x/100)*100)+" de CA"],
                 ["marge","À dupliquer : le taux de marge (secondaire)","Même rayon, taux nettement meilleur ailleurs. Gain = écart de taux × CA HT du magasin en retard, sur la période.","Aller voir chez le magasin de référence : prix de vente, mix de références, remises, conditions d'achat.",x=>"≈ "+fmtE(Math.round(x/10)*10)+" de marge"],
                 ["stock","À dupliquer : la gestion du stock","Rotation du stock nettement plus rapide ailleurs. Gain = trésorerie libérée si le magasin en retard avait la rotation de la référence.","Comparer la politique de commande, les quantités mini et l'assortiment avec le magasin de référence.",x=>"≈ "+fmtE(Math.round(x/1000)*1000)+" de stock"]];
    let n3=0; h+=`<h2>3. Ce qu'un magasin fait mieux : à dupliquer</h2>`;
    let txt=`DÉMARCHE LEADER — ${per}\n`;
    blocs.forEach(b=>{ const arr=rec[b[0]].sort((x,y)=>y.gain-x.gain).slice(0,8); if(!arr.length) return; n3+=arr.length;
      h+=`<h3 style="margin:14px 0 2px;font-size:15px">${b[1]}</h3><div class="sub">${b[2]} ${b[3]}</div><div class="scroll"><table><thead><tr><th>Rayon</th><th>Magasin de référence</th><th>Magasin à aligner</th><th>Constat</th><th>Gain estimé</th><th>Reproductibilité</th></tr></thead><tbody>`+
        arr.map(a=>`<tr><td class="lab">${a.nom}</td><td class="best">${a.lead}</td><td class="worst">${a.lag}</td><td>${a.det}</td><td><b>${b[4](a.gain)}</b></td><td>${rep(a.lead,a.lag)}</td></tr>`).join("")+`</tbody></table></div>`;
      txt+=`\n${b[1].toUpperCase()}\n`+arr.map(a=>` - ${a.nom} : ${a.lead} (${a.det.split(" contre ")[0]}) → aligner ${a.lag} (${a.det.split(" contre ")[1]}) ${b[4](a.gain)}`).join("\n")+"\n"; });
    if(!n3) h+=`<div class="sub">Aucun écart significatif détecté entre les magasins chargés${MAGS.length<2?" (un seul magasin pour l'instant)":""}.</div>`;
    else h+=`<div class="bar" style="margin-top:10px"><button type="button" id="gcopyc" style="border:1px solid var(--ink);background:#fff;border-radius:6px;padding:6px 12px;font-weight:700;cursor:pointer;font-family:inherit">Copier la synthèse (texte)</button> <span id="gcopycok" class="g-up" style="font-size:12.5px"></span></div>`;
    const SEG=[["perf","📊","Performance commerciale","CA · passages · panier"],["cr","🧾","Compte de résultat","EBE · résultat"],["fg","⛽","Frais généraux","postes de charges"]];
    if(!SEG.some(x=>x[0]===window.__compTab)) window.__compTab="perf";
    h=`<div class="gseg" id="gseg" style="--i:${SEG.findIndex(x=>x[0]===window.__compTab)}"><i></i>`+SEG.map(x=>`<button type="button" data-seg="${x[0]}" class="${window.__compTab===x[0]?"on":""}"><span class="ic">${x[1]}</span><span class="tx"><b>${x[2]}</b><small>${x[3]}</small></span></button>`).join("")+`</div><div class="segp" data-p="perf">${h}</div><div class="segp" data-p="ld"><div id="gldx"></div></div>`;
    document.getElementById("gcomp").innerHTML=h;
    const applySeg=()=>{ const t=window.__compTab; const sg=document.getElementById("gseg"); if(sg){ sg.style.setProperty("--i",SEG.findIndex(x=>x[0]===t)); sg.querySelectorAll("button").forEach(b=>b.classList.toggle("on",b.dataset.seg===t)); }
      document.querySelectorAll("#gcomp .segp").forEach(p=>{ p.style.display=(p.dataset.p==="perf"?t==="perf":t!=="perf")?"":"none"; });
      document.querySelectorAll("#gcomp [data-ldp]").forEach(p=>{ p.style.display=p.dataset.ldp===t?"":"none"; }); };
    document.querySelectorAll("#gseg button").forEach(b=>b.onclick=()=>{ window.__compTab=b.dataset.seg; applySeg(); });
    (function fillLd(){ const bx=document.getElementById("gldx"); if(!bx) return; setTimeout(applySeg,0);
      if(window.__GRPU&&window.__ldBuild){ try{ bx.innerHTML=window.__ldBuild(); }catch(e){ bx.innerHTML='<div class="sub">Comparaison indisponible : '+e.message+'</div>'; } }
      else if(window.__grpHtml&&window.__grpBind){ bx.innerHTML='<div class="sub" style="margin-bottom:6px"></div>'+window.__grpHtml; window.__grpBind(bx,fillLd); }
      else bx.innerHTML='<div class="sub">Disponible après le déverrouillage du groupe.</div>'; })();
    document.querySelectorAll("#gcomp [data-cm]").forEach(b=>b.onclick=()=>{compMetric=b.dataset.cm;render();});
    const cb=document.getElementById("gcopyc"); if(cb) cb.onclick=function(){
      const ok=()=>{document.getElementById("gcopycok").textContent="Copié";};
      try{ navigator.clipboard.writeText(txt).then(ok,()=>{throw 0;}); }
      catch(_){ const ta=document.createElement("textarea"); ta.value=txt; ta.style.position="fixed"; ta.style.opacity="0"; document.body.appendChild(ta); ta.select(); try{document.execCommand("copy");ok();}catch(e){} document.body.removeChild(ta); } };
    const miss=ORDER.filter(m=>MAGS.indexOf(m)<0);
    document.getElementById("gfoot").innerHTML=`Typologie : ${ORDER.map(m=>m+" = "+TYPO[m]).join(" · ")}. Les écarts entre profils différents (rural, périurbain, centre-ville) sont à interpréter avec prudence : les données montrent où se trouve l'écart, pas comment le magasin de référence l'obtient.`+(miss.length?` Magasins pas encore chargés : ${miss.join(", ")}.`:"");
  }

  const REF_CHUTE=-100, REF_STOCK_ROT=250, REF_STOCK_MIN=1000;
  function renderRefs(mag){
    const el=document.getElementById("grefs"); const sets=((G.refs||[]).filter(x=>x.mag===mag));
    if(!sets.length||mag==="GROUPE"){ el.innerHTML=""; return; }
    el.innerHTML=`<h3 style="margin:14px 0 6px;font-size:15px">Détail par référence</h3>`+sets.map((S,si)=>refBlock(S,si,mag)).join("");
  }
  function refBlock(S,si,mag){
      const nn=r=>r.ca_prog==null;
      const R=S.rows.map(r=>{ const ca0=(!nn(r)&&r.ca_prog>-100)?r.ca/(1+r.ca_prog/100):null; return Object.assign({},r,{d:ca0!=null?r.ca-ca0:null}); });
      const chute=R.filter(r=>r.d!=null&&r.d<=REF_CHUTE&&r.ca_prog<=-30).sort((a,b)=>a.d-b.d);
      const sumCh=chute.reduce((x,r)=>x+r.d,0);
      const stk=R.filter(r=>r.rot!=null&&r.rot>=REF_STOCK_ROT&&r.stock>=REF_STOCK_MIN).sort((a,b)=>b.stock-a.stock);
      const sumStk=stk.reduce((x,r)=>x+r.stock,0), stkTot=R.reduce((x,r)=>x+(r.stock||0),0);
      const bas=R.filter(r=>r.tx!=null&&r.tx<0&&r.ca>=50).sort((a,b)=>a.marge-b.marge);
      const gros=R.filter(r=>nn(r)&&r.ca>=300).sort((a,b)=>b.ca-a.ca);
      const chTx=R.filter(r=>r.ec!=null&&r.ec<=-10&&r.ca>=200).sort((a,b)=>a.ec-b.ec);
      const t=S.tot||{};
      const L=[];
      if(chute.length) L.push(`<b>${chute.length} références en chute</b> pèsent ${sgnE(sumCh)} : ${chute.slice(0,3).map(r=>r.nom+" "+sgnE(r.d)).join(", ")}.`);
      if(stk.length) L.push(`<b>Surstock</b> : ${stk.length} références ≥ ${REF_STOCK_ROT} j de rotation = ${fmtE(sumStk)} de stock${stkTot>0?` (${fmtN(100*sumStk/stkTot)} % du stock de la famille)`:""}, dont ${stk.slice(0,3).map(r=>r.nom+" "+fmtE(r.stock)+" / "+fmtN(r.rot)+" j").join(", ")}.`);
      if(bas.length) L.push(`<b>${bas.length} références vendues sous le coût</b> (taux négatif) : ${bas.slice(0,3).map(r=>r.nom+" "+fmtN(r.tx,1)+" %").join(", ")}. À vérifier : prix de vente ou prix d'achat.`);
      if(chTx.length) L.push(`Taux de marge en forte baisse : ${chTx.slice(0,3).map(r=>r.nom+" "+sgn(r.ec,1," pts")).join(", ")}.`);
      if(gros.length) L.push(`Gros achats ponctuels (sans N-1) : ${gros.slice(0,3).map(r=>r.nom+" "+fmtE(r.ca)).join(", ")}. Ils gonflent la progression sans signifier une tendance.`);
      const CT=[],MT=[];
      if(chute.length) CT.push(`Contrôler disponibilité, prix et facing des ${Math.min(3,chute.length)} premières références en chute.`);
      if(bas.length) CT.push(`Corriger les prix ou vérifier les achats des références sous le coût.`);
      if(stk.length){ CT.push(`Arrêter tout réassort des références en surstock.`); MT.push(`Solder, regrouper ou retourner fournisseur le surstock : ${fmtE(Math.round(sumStk/100)*100)} de trésorerie à libérer.`); }
      if(chTx.length) MT.push(`Renégocier les achats ou revoir les remises sur les références à taux dégradé.`);
      const lst=a=>a.length?a.map(x=>`<li>${x}</li>`).join(""):"<li>—</li>";
      const rows=R.slice().sort((a,b)=>(a.d==null?1e9:a.d)-(b.d==null?1e9:b.d));
      const body=rows.map(r=>{const al=[]; if(r.d!=null&&r.d<=REF_CHUTE&&r.ca_prog<=-30) al.push("Chute"); if(r.tx!=null&&r.tx<0&&r.ca>=50) al.push("Sous le coût"); if(r.rot!=null&&r.rot>=REF_STOCK_ROT&&r.stock>=REF_STOCK_MIN) al.push("Surstock"); if(nn(r)&&r.ca>=300) al.push("Ponctuel");
        return `<tr><td class="nm" style="text-align:left"><b>${r.nom}</b><br><span style="color:#737372;font-size:11px">${r.code}${r.gamme?" · "+r.gamme:""}</span></td><td>${fmtE(r.ca)}<br>${nn(r)?'<span style="color:#737372">N.N.</span>':sp(r.ca_prog)}</td><td class="${cl(r.d)}">${r.d==null?"—":sgnE(r.d)}</td><td>${fmtN(r.qte)}</td><td>${fmtN(r.pass)}</td><td>${fmtE(r.panier,2)}</td><td>${fmtN(r.tx,1)} %<br>${sp(r.ec,1," pts")}</td><td>${fmtE(r.marge)}<br>${sp(r.marge_prog)}</td><td>${r.rot==null?"—":fmtN(r.rot)}</td><td>${fmtE(r.stock)}</td><td>${al.join(", ")}</td></tr>`;}).join("");
      return `<details class="g-card ${chute.length||stk.length||bas.length?"red":"grn"}" ${si===0?"open":""}><summary><span class="nm">${(((G.mags[mag].rayons||[]).find(x=>x.code===S.rayon))||{}).nom||S.rayon} · ${S.sous} ${(S.lib||"").replace(/…$/,"")}</span><span class="enjeu">${fmtE(t.ca)} ${t.ca_prog==null?"":sp(t.ca_prog)} · ${R.length} réf.</span></summary>`+
        `<div style="padding:4px 14px 10px"><ul>${L.map(x=>`<li>${x}</li>`).join("")||"<li>Rien d'anormal.</li>"}</ul>`+
        `<div class="g-cols"><div><h4>Court terme · cette semaine</h4><ul>${lst(CT)}</ul></div><div><h4>Moyen terme · 1 à 3 mois</h4><ul>${lst(MT)}</ul></div></div>`+
        `<div class="wrap" style="max-height:calc(100vh - 330px);overflow:auto;margin-top:8px"><table class="g-reft"><thead><tr><th>Référence</th><th>CA</th><th>Δ CA</th><th>Qté</th><th>Passages</th><th>Panier</th><th>Taux</th><th>Marge €</th><th>Rotation (j)</th><th>Stock €</th><th>Alertes</th></tr></thead><tbody>${body}</tbody></table></div></div></details>`;
  }

  let sub="syn";
  function renderSub(){
    const np=document.querySelectorAll("#gplan details.g-card").length, nr=document.querySelectorAll("#grefs details.g-card").length;
    if(sub==="refs"&&!nr) sub="syn";
    const T=[["syn","Synthèse",""],["plan","Plan d'action",np],["refs","Références",nr||""]].filter(t=>t[0]!=="refs"||nr); if(cur!=="GROUPE"&&cur!=="COMPARATIF") T.push(["hist","Historique 5 ans",""]); else if(sub==="hist") sub="syn";
    document.getElementById("gsub").innerHTML=T.map(t=>`<button type="button" data-s="${t[0]}" class="${sub===t[0]?"on":""}">${t[1]}${t[2]!==""?`<small>${t[2]}</small>`:""}</button>`).join("");
    document.getElementById("gsingle").dataset.sub=sub; (function(){ var hh=document.getElementById("ghist"); if(!hh) return; if(sub==="hist"){ hh.style.display=""; if(window.__chifRender) window.__chifRender(hh,cur); } else hh.style.display="none"; })();
    ["gtogctl","gcountsctl"].forEach(id=>{const e=document.getElementById(id); if(e) e.style.display=(sub==="syn")?"":"none";});
    document.querySelectorAll("#gsub button").forEach(b=>b.onclick=()=>{sub=b.dataset.s;renderSub();window.scrollTo({top:0});});
  }
  if(window.__gClk) document.removeEventListener("click",window.__gClk);
  window.__gClk=e=>{
    const tr=e.target.closest&&e.target.closest("#gbody tr"); if(!tr) return; if(e.target.closest("textarea,input,.g-cm")||(e.target.closest("td")&&e.target.closest("td").querySelector(".g-cm"))) return;
    const n=tr.dataset.n, c=[...document.querySelectorAll("#gplan details.g-card")].find(d=>d.dataset.r===n);
    if(!c) return; sub="plan"; renderSub(); document.querySelectorAll("#gplan details.g-card").forEach(d=>d.open=(d===c)); c.scrollIntoView({block:"start"});
  }; document.addEventListener("click",window.__gClk);
  function render(){
    document.querySelectorAll("#gtabs button").forEach(b=>b.classList.toggle("active",b.dataset.m===cur));
    const isComp=(cur==="COMPARATIF");
    document.getElementById("gsingle").style.display=isComp?"none":"";
    document.getElementById("gcomp").style.display=isComp?"":"none";
    document.getElementById("gcountsctl").style.display=isComp?"none":"";
    if(isComp){ renderComp(); return; }
    const rows=rowsFor(cur), tot=totalsFor(cur,rows), R=rows.filter(r=>!r.ign);
    rows.forEach(r=>{r.fl=flags(r); const SV=["chuteca","trafic","panier","ok","ign"]; r.alertSev=r.fl.filter(f=>SV.indexOf(f.k)>=0).reduce((x,f)=>x+({red:4,org:3,amb:1,grn:0}[f.c]||0),0); r.alertSevM=r.fl.filter(f=>SV.indexOf(f.k)<0).reduce((x,f)=>x+({red:4,org:3,amb:2,grn:0}[f.c]||0),0);});
    (function(){ const pe=(G.mags[MAGS[0]].periode||"").match(/\d\d\/\d\d\/\d\d/g)||[], ed=pe[1]||pe[0]; window.__AXR=window.__AXR||{};
      let mi=null, dim=30; if(ed){ const q=ed.split("/"), y=2000+ +q[2], mo=+q[1]-1; mi=(mo+3)%12; dim=new Date(y,mo+1,0).getDate(); }
      window.__GMI=mi; window.__CMT=window.__CMT||{}; window.__CMD=window.__CMD||{};
      if(pole==="stock"&&window.__achRayX&&window.__AXR[cur]===undefined){ const c0=cur; window.__AXR[c0]=null; window.__achRayX(c0).then(d=>{ window.__AXR[c0]=d||false; if(cur===c0&&pole==="stock"&&!document.activeElement.classList.contains("g-cm")) render(); }).catch(()=>{ window.__AXR[c0]=false; }); }
      const ck0=cur+"|"+mi; if(pole==="stock"&&window.__achCom&&cur!=="GROUPE"&&mi!=null&&window.__CMT[ck0]===undefined){ window.__CMT[ck0]=null; window.__achCom.load(cur,mi).then(r=>{ window.__CMT[ck0]=r||{}; if(cur+"|"+window.__GMI===ck0&&pole==="stock"&&!document.activeElement.classList.contains("g-cm")) render(); }).catch(()=>{ window.__CMT[ck0]={}; }); }
      const AXD=window.__AXR[cur], AX=(AXD&&AXD.rows)||AXD, nz=x=>String(x||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim();
      const tA=AX?AX.reduce((x,a)=>x+((a.X&&a.X[mi])||0),0)+((AXD.nc&&mi!=null&&AXD.nc[mi])||0):0, tC=rows.reduce((x,r)=>x+((!r.ign&&r.ca>0)?r.ca:0),0);
      const find=r=>{ const code=String(r.code==null?"":r.code).trim(); let m=code?AX.find(x=>x.c!=null&&String(x.c).trim()===code):null; if(m) return m; const k=nz(r.nom); m=AX.find(x=>nz(x.n)===k); if(m) return m; const c=AX.filter(x=>{ const q=nz(x.n); return q&&k&&(q.includes(k)||k.includes(q)); }); if(c.length===1) return c[0]; const kw=k.split(" ").filter(w=>w.length>2); let best=null, bs=0, tie=false; AX.forEach(x=>{ const sc=nz(x.n).split(" ").filter(w=>w.length>2&&kw.indexOf(w)>=0).length; if(sc>bs){ bs=sc; best=x; tie=false; } else if(sc===bs&&sc>0) tie=true; }); return (best&&!tie)?best:null; };
      const sansRay=[], sansAch=[];
      rows.forEach(r=>{ r.pA=null; r.pC=null; r.axr=null; r.pcol=null; r.pwhy=""; if(!r.ign&&tC>0&&r.ca>0) r.pC=100*r.ca/tC; if(!AX||mi==null||!(tA>0)) return; const m=find(r); if(!m){ r.pwhy="Aucun rayon correspondant dans les achats par rayon"; if(!r.ign) sansRay.push(r.nom); return; } const v=m.X?m.X[mi]:null; if(v==null){ r.pwhy="Pas d'achats réels renseignés pour ce rayon ("+m.n+")"; if(!r.ign) sansAch.push(r.nom); return; } r.axr=v; r.pA=100*v/tA; if(r.pC!=null){ const d=r.pA-r.pC, tol=Math.max(0.3,0.1*r.pC); r.pcol=d>tol?"red":(d<-tol?"grn":"org"); } });
      let nt=document.getElementById("gpoidsnote"); if(!nt){ nt=document.createElement("div"); nt.id="gpoidsnote"; nt.style.cssText="margin:0 20px 8px;font-size:13px;font-weight:700;color:#b21f2d"; const gp=document.getElementById("gpoles"); gp.parentNode.insertBefore(nt,gp.nextSibling); }
      const MNN=["octobre","novembre","décembre","janvier","février","mars","avril","mai","juin","juillet","août","septembre"]; let msg="";
      if(pole==="stock"){ if(AX===undefined||AX===null) msg="Poids des achats : chargement des achats par rayon…"; else if(AX===false) msg="Poids des achats : achats par rayon non reçus ou non lisibles pour "+cur+" (importer_achats_rayon.py à lancer, ou mot de passe du magasin manquant)."; else if(mi==null) msg="Poids des achats : période Booster non reconnue."; else if(!rows.some(r=>r.pA!=null)){ const any=AX.some(x=>x.X&&x.X.some(v=>v!=null&&v!==0)); msg=any?"Poids des achats : aucun achat réel pour "+MNN[mi]+" (mois de la période Booster) dans les achats par rayon.":"Poids des achats : les achats par rayon n'ont ni réel DocuWare ni saisie ("+AX.length+" rayons lus). Relance la collecte DocuWare puis l'import des achats par rayon."; } }
      if(!msg&&pole==="stock"&&AX&&mi!=null){ if(sansRay.length) msg="Poids des achats : pas de rayon correspondant dans les achats par rayon pour : "+sansRay.join(", ")+" (même nom ou même code à utiliser dans l'import des budgets)."; else if(sansAch.length>0&&sansAch.length<=4) msg="Poids des achats : aucun achat réel renseigné pour : "+sansAch.join(", ")+"."; }
      nt.textContent=msg; nt.style.display=msg?"":"none";
    })();
    renderPlan(rows); renderRefs(cur); renderSub();
    // bandeau
    const per=(G.mags[MAGS[0]].periode||"").replace(/\s*comparé à.*/,"");
    document.getElementById("gprogline").innerHTML=
      `<span class="mag">${cur} : ${fmtE(tot.ca)}</span> ${sp(tot.ca_prog)} · ${fmtN(tot.pass)} passages ${sp(tot.pass_prog)} · panier ${fmtE(tot.panier,2)} ${sp(tot.panier_prog)}`+
      `<span class="nat">${per}</span>`;
    // KPI
    const rg=(rang,ev)=>rang==null?"":`<span style="color:#737372">Rang réseau</span> ${rkH(rang,ev)}`;
    const t=cur==="GROUPE"?{}:G.mags[cur].tot||{};
    const K=[
      ["Chiffre d'affaires",fmtE(tot.ca),sp(tot.ca_prog),rg(t.ca_rang,t.ca_evol)],
      ["Passages caisse",fmtN(tot.pass),sp(tot.pass_prog),rg(t.pass_rang,t.pass_re)],
      ["Panier moyen",fmtE(tot.panier,2),sp(tot.panier_prog),rg(t.panier_rang,t.panier_re)],
      ["Taux de marge",tot.tx==null?"—":fmtN(tot.tx,1)+" %",sp(tot.ec,1," pts"),rg(t.tx_rang,t.tx_evol)],
      ["Marge (€)",fmtE(tot.marge),sp(tot.marge_prog),rg(t.marge_rang,t.marge_re)],
      ["Stock (€)",fmtE(tot.stock),"",(t.stock_rang!=null?rg(t.stock_rang):"")+(tot.rot!=null?`<br><span style="color:${rotCol(tot.rot)};font-weight:700">Rotation ${fmtN(tot.rot)} j</span>`:"")]
    ];
    document.getElementById("gkpis").innerHTML=K.map(k=>`<div class="g-kpi"><div class="l">${k[0]}</div><div class="v">${k[1]}</div><div class="p">${k[2]}</div><div class="r">${k[3]}&nbsp;</div></div>`).join("");
    // lecture automatique : CA = passages x panier ; marge en second
    const ca0=(tot.ca_prog!=null)?tot.ca/(1+tot.ca_prog/100):null, ps0=(tot.pass_prog!=null)?tot.pass/(1+tot.pass_prog/100):null;
    const dCAt=ca0!=null?tot.ca-ca0:null, q0=(ps0>0&&ca0!=null)?ca0/ps0:null;
    const eTr=(q0!=null)?(tot.pass-ps0)*q0:null, ePa=(dCAt!=null&&eTr!=null)?dCAt-eTr:null;
    const pir=R.filter(r=>r.dCA!=null).sort((a,b)=>a.dCA-b.dCA).slice(0,3), mei=R.filter(r=>r.dCA!=null).sort((a,b)=>b.dCA-a.dCA).slice(0,2);
    let L=`<b>CA ${sgnE(dCAt)} vs N-1</b>`;
    if(eTr!=null) L+=` : ${sgnE(eTr)} liés aux passages (${sgn(tot.pass_prog)}), ${sgnE(ePa)} liés au panier (${sgn(tot.panier_prog)}). `; else L+=". ";
    const pirN=pir.filter(r=>r.dCA<0), meiP=mei.filter(r=>r.dCA>0);
    if(pirN.length) L+=`Rayons qui perdent le plus de CA vs N-1 : <b>${pirN.map(r=>r.nom+" "+sgnE(r.dCA)).join(", ")}</b>`+(meiP.length?`. À l'inverse, ${meiP.map(r=>r.nom+" "+sgnE(r.dCA)).join(" et ")} progressent.`:".");
    else if(meiP.length) L+=`Aucun rayon en baisse de CA. Meilleure progression : <b>${meiP.map(r=>r.nom+" "+sgnE(r.dCA)).join(", ")}</b>.`;
    const sD=(tot.marge!=null&&tot.marge_prog!=null)?tot.marge-tot.marge/(1+tot.marge_prog/100):null;
    if(sD!=null) L+=` <span style="color:#737372">Marge : ${sgnE(sD)} vs N-1 (taux ${sgn(tot.ec,1," pts")}).</span>`;
    document.getElementById("glecture").innerHTML=L;
    // alertes (pastilles filtre)
    const cnt={}; rows.forEach(r=>r.fl.forEach(f=>{(cnt[f.k]=cnt[f.k]||{t:f.t,c:f.c,n:0}).n++;}));
    const order=["chuteca","trafic","panier","chute","taux","perte","stock","vol","ok","ign"];
    document.getElementById("gcounts").innerHTML=
      `<span class="pill all ${filtre?"":"on"}" data-f="">Tous (${rows.length})</span>`+
      order.filter(k=>cnt[k]).map(k=>`<span class="pill ${({red:"r",org:"f",amb:"n",grn:"c"})[cnt[k].c]} ${filtre===k?"on":""}" data-f="${k}">${cnt[k].t} (${cnt[k].n})</span>`).join("");
    document.querySelectorAll("#gcounts .pill").forEach(p=>p.onclick=()=>{filtre=p.dataset.f||null;render();});
    // tableau
    let list=filtre?rows.filter(r=>r.fl.some(f=>f.k===filtre)):rows.slice();
    const key=sortK==="alert"?"alertSev":(sortK==="alertM"||sortK==="alertS"?"alertSevM":sortK);
    list.sort((a,b)=>{ const x=a[key],y=b[key]; if(x==null&&y==null) return 0; if(x==null) return 1; if(y==null) return -1;
      if(typeof x==="string") return sortAsc?x.localeCompare(y):y.localeCompare(x); return sortAsc?x-y:y-x; });
    const CP=COLS.filter(c=>c.p.split(" ").indexOf(pole)>=0);
    if(CP.map(c=>c.k).indexOf(sortK)<0){ sortK=pole==="stock"?"scv":(pole==="commerce"?"dCA":"effTr"); sortAsc=pole!=="stock"; }
    document.getElementById("gpoles").innerHTML=POLES.map(p=>`<button type="button" data-p="${p[0]}" class="${p[0]===pole?"on":""}"><b>${p[1]}</b><span>${p[2]}</span></button>`).join("");
    document.querySelectorAll("#gpoles button").forEach(b=>b.onclick=()=>{pole=b.dataset.p; if(window.__AXR) delete window.__AXR[cur]; render();});
    const AL=(r,ks,inc)=>`<td><div class="g-tags">${r.fl.filter(f=>(ks.indexOf(f.k)>=0)===inc).map(f=>`<span class="g-tag ${f.c}">${f.t}</span>`).join("")}</div></td>`;
    const RG=(r,k)=>r[k+"_rang"]==null?"":`<span class="rg">${rkH(r[k+"_rang"],r[k+"_re"])}</span>`;
    const CELL={
      nom:r=>`<td class="nom">${r.nom}</td>`,
      pass:r=>`<td class="num"><b>${fmtN(r.pass)}</b><small>${sp(r.pass_prog)}</small>${RG(r,"pass")}</td>`,
      panier:r=>`<td class="num"><b>${fmtN(r.panier,2)} €</b><small>${sp(r.panier_prog)}</small>${RG(r,"panier")}</td>`,
      qpc:r=>`<td class="num">${r.qpc==null?"—":`<b>${fmtN(r.qpc,1)}</b><small>${sp(r.qpc_prog)}</small>${RG(r,"qpc")}`}</td>`,
      qte:r=>`<td class="num">${r.qte==null?"—":`<b>${fmtN(r.qte)}</b><small>${sp(r.qte_prog)}</small>${RG(r,"qte")}`}</td>`,
      effTr:r=>`<td class="num"><span class="${cl(r.effTr)}">${sgnE(r.effTr)}</span></td>`,
      effPa:r=>`<td class="num"><span class="${cl(r.effPa)}">${sgnE(r.effPa)}</span></td>`,
      alert:r=>AL(r,["chuteca","trafic","panier","ok","ign"],true),
      ca:r=>`<td class="num"><b>${fmtN(r.ca)}</b><small>${sp(r.ca_prog)}</small>${RG(r,"ca")}</td>`,
      dCA:r=>`<td class="num"><span class="${cl(r.dCA)}"><b>${sgnE(r.dCA)}</b></span></td>`,
      camvp:r=>`<td class="num">${r.camvp==null?"—":`<b>${fmtN(r.camvp,0)} %</b>`}<small>${fmtN(r.camv)} €</small></td>`,
      tx:r=>`<td class="num">${r.tx==null?"—":fmtN(r.tx,1)+" %"}<small>${sp(r.ec,1," pts")}</small>${RG(r,"tx")}</td>`,
      marge:r=>`<td class="num">${fmtN(r.marge)}<small>${sp(r.marge_prog)}</small>${RG(r,"marge")}</td>`,
      d:r=>`<td class="num"><span class="${cl(r.d)}">${sgnE(r.d)}</span></td>`,
      alertM:r=>AL(r,["taux","perte","chute","vol"],true),
      scv:r=>`<td class="num"${r.couv==null?"":` data-go="rot" data-rn="${String(r.nom).replace(/"/g,"&quot;")}" title="Voir le stock de ce rayon dans Achats"`}>${r.couv==null?"—":`<b style="color:${rotCol(r.couv)}">${fmtN(r.couv)} j</b>`}${RG(r,"rot")}</td>`,
      stock:r=>`<td class="num"><b>${fmtN(r.stock)}</b>${RG(r,"stock")}${r.ca_rang==null?"":`<small style="white-space:nowrap;color:#737372;font-weight:400;margin-left:8px" title="Rang CA du rayon : le rang stock doit en être proche">CA ${rkH(r.ca_rang)}</small>`}</td>`,
      txrupt:r=>`<td class="num">${r.txrupt==null?"—":`<b>${fmtN(r.txrupt,1)} %</b>`}${r.txrupt_rang==null?"":`<span class="rg">${rkH(r.txrupt_rang)}</span>`}</td>`,
      pA:r=>{ const bg={red:"background:#fde0e0;color:#b21f2d",grn:"background:#e3f3e6;color:#1e7a34",org:"background:#fff0d9;color:#b4620a"}[r.pcol]||""; return r.pA==null?`<td class="num"><span title="${window.__AXR&&window.__AXR[cur]===false?"Achats du rayon non lus : mot de passe du magasin ou import des achats par rayon manquant":(r.pwhy||"Pas d'achats réels renseignés pour ce rayon")}">—</span></td>`:`<td class="num" data-go="ach" data-rn="${String(r.nom).replace(/"/g,"&quot;")}" title="Voir le tableau des achats de ce rayon" style="${bg}"><b>${fmtN(r.pA,1)} %</b><small style="white-space:nowrap">${fmtN(r.axr)} € achats</small></td>`; },
      cm:r=>{ const mi=window.__GMI, ck=cur+"|"+mi, T=(window.__CMT||{})[ck]||{}, rn=nz(r.nom); if(cur==="GROUPE"||!window.__achCom||mi==null) return `<td class="num">—</td>`; const D=(window.__CMD||{})[ck+"|"+rn], v=D!==undefined?D:(T[rn]||""), esc=String(v).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;"), need=r.pcol==="red"&&!v; return `<td><textarea class="g-cm${need?" emp":""}" rows="2" data-rn="${rn}" maxlength="600" placeholder="${r.pcol==="red"?"Explique le dérapage des achats…":"Commentaire…"}" title="Écris ton commentaire puis Entrée pour valider (Maj+Entrée = ligne suivante)">${esc}</textarea></td>`; },
      pC:r=>`<td class="num"${r.pC==null?"":` data-go="ca" data-rn="${String(r.nom).replace(/"/g,"&quot;")}" title="Voir le CA de ce rayon"`}>${r.pC==null?"—":`<b>${fmtN(r.pC,1)} %</b><small style="white-space:nowrap">${fmtN(r.ca)} € CA</small>`}</td>`,
      alertS:r=>AL(r,["stock"],true)
    };
    document.getElementById("ghead").innerHTML=CP.map(c=>`<th data-k="${c.k}">${c.t}<span class="arr">${sortK===c.k?(sortAsc?"▲":"▼"):""}</span></th>`).join("");
    document.querySelectorAll("#ghead th").forEach(th=>th.onclick=()=>{const k=th.dataset.k; if(sortK===k) sortAsc=!sortAsc; else {sortK=k; sortAsc=["nom","dCA","effTr","effPa","d"].indexOf(k)>=0;} render();});
    (function(){ const gb=document.getElementById("gbody"); if(!gb||gb.dataset.golink) return; gb.dataset.golink="1";
      const nk=x=>String(x||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
      const found=(rows,rn)=>{ const k=nk(rn), code=(String(rn).match(/^\s*(\d+)/)||[])[1]; return [...rows].find(tr=>{ if(!tr.cells||!tr.cells[0]) return false; const t=nk(tr.cells[0].textContent); return t&&k&&(t===k||t.includes(k)||k.includes(t)||(code&&t.indexOf(code+" ")===0)); }); };
      const flash=tr=>{ if(!tr) return; tr.scrollIntoView({block:"center",behavior:"smooth"}); const o=tr.style.outline; tr.style.outline="3px solid #ec6707"; setTimeout(()=>{ tr.style.outline=o; },2400); };
      gb.addEventListener("click",ev=>{ const td=ev.target.closest&&ev.target.closest("td[data-go]"); if(!td) return; const rn=td.dataset.rn, go=td.dataset.go;
        if(go==="ca"){ pole="commerce"; sortK="ca"; sortAsc=false; render(); setTimeout(()=>flash(found(document.querySelectorAll("#gbody tr"),rn)),120); return; }
        window.__GBACK={rn:rn,pole:pole,sortK:sortK,sortAsc:sortAsc};
        let bk=document.getElementById("gback"); if(!bk){ bk=document.createElement("button"); bk.id="gback"; bk.type="button"; bk.textContent="↩ Retour à la performance"; document.body.appendChild(bk); }
        bk.style.display="block"; bk.onclick=()=>{ const S=window.__GBACK||{}; bk.style.display="none"; const nb=document.getElementById("navGestion"); if(nb) nb.click(); setTimeout(()=>{ if(S.pole) pole=S.pole; if(S.sortK){ sortK=S.sortK; sortAsc=S.sortAsc; } render(); setTimeout(()=>flash(found(document.querySelectorAll("#gbody tr"),S.rn)),150); },250); };
        const b=document.getElementById("navAchats"); if(b&&!b.classList.contains("on")) b.click(); let n=0;
        const iv=setInterval(()=>{ n++; const root=document.getElementById("viewAchats"), tb=root&&root.querySelector("#achtabs button[data-t=p]"), rr=root&&root.querySelectorAll("#achray tr.rw");
          if(tb&&rr&&rr.length){ clearInterval(iv); tb.click(); setTimeout(()=>flash(found(root.querySelectorAll("#achray tr.rw"),rn)),150); } else if(n>40) clearInterval(iv); },150); });
    })();
    document.getElementById("gbody").innerHTML=list.map(r=>`<tr class="${r.ign?"ign":""}" data-n="${r.nom}" title="Voir le plan d'action de ce rayon">`+CP.map(c=>CELL[c.k](r)).join("")+`</tr>`).join("");
    document.querySelectorAll("#gbody .g-cm").forEach(inp=>{ const mi=window.__GMI, ck=cur+"|"+mi, rn=inp.dataset.rn; window.__CMOK=window.__CMOK||{}; if(window.__CMOK[ck+"|"+rn]&&inp.value){ inp.style.borderColor="#1e7a34"; inp.style.background="#f1f8f3"; inp.title="Validé"; }
      inp.oninput=()=>{ delete window.__CMOK[ck+"|"+rn]; window.__CMD[ck+"|"+rn]=inp.value; inp.classList.remove("emp"); inp.style.borderColor="#e0a900"; inp.style.background="#fff8ee"; inp.title="Appuie sur Entrée pour valider"; };
      inp.onkeydown=async ev=>{ if(ev.key!=="Enter"||ev.shiftKey) return; ev.preventDefault(); const txt=inp.value.trim(); let ok=false; try{ ok=await window.__achCom.save(cur,mi,rn,txt); }catch(e){ ok=false; }
        if(!ok){ inp.style.borderColor="#b21f2d"; inp.style.background="#fff0f0"; inp.title="Enregistrement impossible : réessaie (Entrée)"; return; }
        const T=window.__CMT[ck]||(window.__CMT[ck]={}); if(txt) T[rn]=txt; else delete T[rn]; delete window.__CMD[ck+"|"+rn];
        if(txt){ window.__CMOK[ck+"|"+rn]=1; inp.style.borderColor="#1e7a34"; inp.style.background="#f1f8f3"; inp.title="Validé"; } else { inp.style.borderColor=""; inp.style.background=""; inp.title=""; }
        const all=[...document.querySelectorAll("#gbody .g-cm")], nx=all[all.indexOf(inp)+1]; if(nx){ nx.focus({preventScroll:true}); nx.select(); } }; });
    document.getElementById("gfoot").innerHTML=
      `Période : ${per} (${JOURS} jours), comparée à N-1. CA TTC ; CA = passages × panier : « dont passages » = variation du nombre de passages × panier N-1, « dont panier » = le reste. `+
      `« Stock : rang et rotation » : rang réseau du stock et du CA du magasin (1 = plus gros) ; un CA au rang 30 attend un stock vers le rang 30. Rotation cible : moins de ${SEUIL_COUV_J} jours (vert), ${SEUIL_COUV_J} à ${ROUGE_J} (orange), au-dessus de ${ROUGE_J} (rouge). `+
      `Trois pôles : Client (passages, panier, NAC (articles par client), quantité vendue), Commerce (CA, marge, MV = meilleures ventes), Gestion (rotation, stock, rupture, poids des achats sur vente). Poids des achats = achats HT réels du rayon ÷ achats réels totaux du mois de la période (onglet Achats). Poids du CA = CA du rayon ÷ CA total. Colonne commentaire : à remplir (Entrée pour valider) quand les achats dérapent. Case du poids des achats : rouge si le rayon pèse plus dans les achats que dans le CA, vert si moins, orange si à peu près égal (écart de moins de 10 % ou 0,3 point). Marge : taux et marge calculés sur le CA HT, « Δ marge » = marge € actuelle − marge € N-1 reconstituée depuis la progression, « Rotation (j) » = rotation du stock en jours donnée par Booster (plus c'est bas, mieux c'est). `+
      `Seuils d'alerte : CA en chute ≤ ${SEUIL_CHUTE_CA} € et ≤ -10 %, passages ≤ -5 %, panier ≤ ${SEUIL_PANIER} %, taux ≤ ${SEUIL_CHUTE_PTS} pts, perte de marge ≥ ${SEUIL_PERTE_EUR} €, surstock = rotation ≥ ${SEUIL_COUV_J} j avec CA en baisse et stock ≥ 50 000 €. Les lignes à CA négatif (ex. Produits Génériques) sont signalées « à ignorer ». Données lues depuis l'export Booster (vue Nomenclature).`;
  }
  const names=MAGS.length>1?MAGS.concat(["GROUPE","COMPARATIF"]):MAGS;
  document.getElementById("gtabs").innerHTML=names.map(n=>`<button data-m="${n}" class="${(n==="GROUPE"||n==="COMPARATIF")?"grp":(MAGCLS[n]||"")}" title="${TYPO[n]||""}">${n==="COMPARATIF"?"Démarche leader":(n==="GROUPE"?"Groupe":n)}</button>`).join("");
  document.querySelectorAll("#gtabs button").forEach(b=>b.onclick=()=>{cur=b.dataset.m;filtre=null;render();});
  (function(){
    const tb=document.getElementById("gtbl"), btn=document.getElementById("gtogsec");
    let narrow=false; try{ narrow=window.matchMedia("(max-width:720px)").matches; }catch(e){}
    if(narrow) tb.classList.add("hidesec");
    btn.onclick=function(){ const h=tb.classList.toggle("hidesec"); btn.textContent=h?"Afficher marge et stock":"Masquer marge et stock"; };
  })();
  render();
}
(function(){
  const _t=window.demarrerApp;
  function pendingBubble(D){
    var G=D.GESTION||{}, MG=G.mags||{}, REFS=G.refs||[], P=D.PRIV||{};
    var ST4=[['Waldighoffen','#1d5fa8'],['Hesingue','#1e7a34'],['Sierentz','#e0a900'],['Mulhouse','#7b3fa0']];
    var esc=function(x){return String(x==null?'':x).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});};
    var items=[];
    ST4.forEach(function(sc){ var m=sc[0];
      if(!MG[m]){ items.push({id:'g_'+m,st:m,t:'Export Performance commerciale (nomenclature par rayon)',w:'sans lui, aucun diagnostic rayon'}); }
      else{ var need=(window.__needRefs&&window.__needRefs(m))||[]; var no=need.filter(function(r){ return !REFS.some(function(x){return x.mag===m&&x.rayon===r.code;}); }).map(function(r){return r.nom;});
        if(no.length) items.push({id:'r_'+m+'_'+no.join(','),st:m,t:'Références FLOP CA (triées CA en baisse, 30 premières) pour : '+no.join(', '),w:'ces rayons sont en alerte dans le Plan d\'action ; sans le détail référence, le plan reste général'}); }
      if(P[m]&&(((D.CONFIG||{}).nocompta||[]).indexOf(m)>=0)) items.push({id:'c_'+m,st:m,t:'Cumul comptable + situation du mois (vers le 15)',w:'la Compta reste vide'});
      if(!P[m]) items.push({id:'c_'+m,st:m,t:'Cumul comptable + situation du mois (vers le 15) et fichier de reprise de visite',w:'Compta et Visite restent vides'});
    });
    items.push({id:'s_wal_autres',st:'Waldighoffen',t:'Détail des « autres postes » du comptable (≈ −44 580 € d\'écart d\'EBE)',w:'un tiers de l\'écart reste inexpliqué'});
    items.push({id:'s_hes_n1',st:'Hesingue',t:'Vérifier la base N-1 du CA Hésingue (−1,8 % contre +28 % ailleurs)',w:'comparaison peut-être faussée'});
    var done={}; try{ done=JSON.parse(localStorage.getItem('pending_done')||'{}'); }catch(e){}
    function left(){ return items.filter(function(i){return !done[i.id];}); }
    var btn=document.createElement('button'); btn.type='button'; btn.id='pdBtn';
    var pan=document.createElement('div'); pan.id='pdPan'; pan.style.display='none';
    var css=document.createElement('style'); css.textContent='#pdBtn{position:fixed;right:14px;bottom:14px;z-index:9998;border:0;border-radius:24px;background:#b21f2d;color:#fff;font:inherit;font-weight:800;font-size:13.5px;padding:10px 16px;box-shadow:0 4px 14px rgba(0,0,0,.3);cursor:pointer} #pdBtn.ok{background:#1e7a34} #pdBtn.top{position:static;display:block;width:100%;border-radius:0;box-shadow:none;padding:9px 12px;font-size:14px;text-align:center} #pdPan.top{position:static;width:auto;max-height:60vh;border-radius:0;border-width:0 0 3px;box-shadow:none} #pdPan{position:fixed;right:14px;bottom:62px;z-index:9998;width:min(420px,calc(100vw - 28px));max-height:70vh;overflow:auto;background:#fff;border:2px solid #b21f2d;border-radius:12px;box-shadow:0 8px 28px rgba(0,0,0,.35);padding:12px 14px} #pdPan h3{margin:0 0 4px;font-size:15px} #pdPan .sub{font-size:12px;color:#737372;margin-bottom:8px} .pdi{border-left:5px solid #888;padding:6px 8px;margin:7px 0;background:#f9f9f8;border-radius:0 8px 8px 0;font-size:13px} .pdi b{display:block} .pdi small{display:block;color:#737372;margin:2px 0 4px} .pdi button{border:1px solid #1e7a34;color:#1e7a34;background:#fff;border-radius:6px;font:inherit;font-size:12px;font-weight:700;padding:3px 8px;cursor:pointer}';
    document.head.appendChild(css); var tw=document.getElementById('topwrap'); if(tw){ btn.className='top'; pan.className='top'; tw.insertAdjacentElement('afterend',pan); tw.insertAdjacentElement('afterend',btn); } else { document.body.appendChild(pan); document.body.appendChild(btn); }
    function vis(){ var c=tw?tw.dataset.st:''; return ST4.filter(function(x){ return !(ST4.some(function(y){return y[0]===c;}))||x[0]===c; }); }
    function draw(){ var ab0=document.getElementById('appbar'); if(ab0&&btn.parentNode!==ab0) ab0.appendChild(btn); var V=vis().map(function(x){return x[0];}); var L=left().filter(function(i){return V.indexOf(i.st)>=0;}); btn.className=(tw?'top ':'')+(L.length?'':'ok')+(btn.closest('#appbar')?' inbar':''); btn.innerHTML=L.length?('📥 <span class="pdt">Données en attente </span>('+L.length+')'):'✅ <span class="pdt">Aucune donnée en attente</span>';
      pan.innerHTML='<h3>📥 Données à m\'envoyer pour le plan d\'action</h3><div class="sub">Sans ces données, l\'outil reste un diagnostic sans plan d\'action.</div>'+vis().map(function(sc){ var its=L.filter(function(i){return i.st===sc[0];}); return '<div style="margin:10px 0 4px;padding:4px 8px;background:'+sc[1]+';color:#fff;border-radius:6px;font-weight:800;font-size:13px">'+sc[0]+' <span style="font-weight:600">· '+(its.length?its.length+' en attente':'✓ rien en attente')+'</span></div>'+its.map(function(i){ return '<div class="pdi" style="border-color:'+sc[1]+'"><b>'+esc(i.t)+'</b><small>'+esc(i.w)+'</small><button type="button" data-id="'+esc(i.id)+'">Envoyé / réglé</button></div>'; }).join(''); }).join('');
      pan.querySelectorAll('button').forEach(function(b){ b.onclick=function(){ done[b.dataset.id]=1; try{ localStorage.setItem('pending_done',JSON.stringify(done)); }catch(e){} draw(); }; }); }
    if(tw) new MutationObserver(function(){ draw(); }).observe(tw,{attributes:true,attributeFilter:['data-st']});
    btn.onclick=function(){ pan.style.display=pan.style.display==='none'?'block':'none'; }; draw(); }
  function autoLock(){ var T=null, MIN=10;
    function lock(){ try{ ['tractCacheKey','tractCacheJSON','tractCacheDate'].forEach(function(k){ sessionStorage.removeItem(k); }); }catch(e){} location.reload(); }
    function arm(){ clearTimeout(T); T=setTimeout(lock,MIN*60*1000); }
    ['click','keydown','touchstart','scroll','mousemove'].forEach(function(ev){ document.addEventListener(ev,arm,{passive:true}); });
    document.addEventListener('visibilitychange',function(){ if(document.hidden){ clearTimeout(T); T=setTimeout(lock,3*60*1000); } else arm(); });
    arm(); }
  window.demarrerApp=function(D){ window.__DATA=D; setTimeout(function(){ try{ if(window.__bgRefresh) window.__bgRefresh(); }catch(e){} },2500); PRIV=D.PRIV||{}; window.__MAIL_TOKEN=((D.CONFIG&&D.CONFIG.mail)||''); window.__WRITE_TOKEN=((D.CONFIG&&D.CONFIG.write)||''); window.__WRITES=((D.CONFIG&&D.CONFIG.writes)||{}); window.__wtok=function(s){ var m=window.__WRITES||{}; return (s&&m[s])||window.__WRITE_TOKEN||''; }; window.__CONTACTS={}; window.__SYNC_URL=(D.CONFIG||{}).sync||''; _t(D); try{ demarrerGestion(D.GESTION); }catch(e){ console.error(e); } try{ pendingBubble(D); }catch(e){} try{ autoLock(); }catch(e){} try{ demarrerVisite({}); demarrerCompta(); }catch(e){ console.error(e); } if(window.__navInit) window.__navInit(); };
})();;
(function(){var t=document.getElementById('verTag'),B=document.querySelector('meta[name=build]');var go=function(){try{sessionStorage.setItem('keepTab',location.hash);}catch(e){} location.replace(location.pathname+'?r='+Date.now()+location.hash);};
t.onclick=go; window.addEventListener('pageshow',function(e){ if(e.persisted) location.reload(); });
var V0=t.textContent; var chk=function(){ if(location.protocol==='file:') return; fetch(location.pathname+'?c='+Date.now(),{cache:'no-store'}).then(function(r){return r.text();}).then(function(x){ var m=x.match(/<meta name="build" content="(\d+)"/), sv=x.match(/id="verTag"[^>]*>(v [^<]*)</); if((m&&B&&m[1]!==B.content)||(sv&&sv[1]!==V0)){ t.textContent='⚠ Nouvelle version : touche ici'; t.style.cssText+=';color:#fff;background:#b21f2d;border-color:#b21f2d'; } }).catch(function(){}); };
chk(); document.addEventListener('visibilitychange',function(){ if(!document.hidden) chk(); });})();;
(function(){
  var tw=document.getElementById('topwrap'); if(!tw||document.getElementById('appbar')) return;
  var COL={Waldighoffen:'#1d5fa8',Hesingue:'#1e7a34',Sierentz:'#e0a900',Mulhouse:'#7b3fa0',Creation:'#8a5a2b',GROUPE:'#b21f2d',COMPARATIF:'#1d1d1b',RESEAU:'#ec6707'};
  var ab=document.createElement('div'); ab.id='appbar'; ab.innerHTML='<button type="button" class="mbtn" aria-haspopup="dialog" aria-label="Menu">☰<span class="mtx"> Menu</span></button><button type="button" class="mbtn hbtn" id="homeBtn" title="Retour au menu principal" aria-label="Menu principal">🏠<span> Accueil</span></button><div class="mlbl"><b></b><span></span></div>';
  tw.insertBefore(ab,tw.firstChild);
  var vt=document.getElementById('verTag'); if(vt) ab.appendChild(vt); var pb0=document.getElementById('pdBtn'); if(pb0){ ab.appendChild(pb0); pb0.classList.add('inbar'); }
  var drw=document.getElementById('drw'), body=document.getElementById('drwb');
  function txt(b){ var c=b.cloneNode(true); c.querySelectorAll('small').forEach(function(x){ x.remove(); }); var t=c.textContent.replace(/\s+/g,' ').trim(); return t==='GROUPE'?'Groupe':t; }
  var ICO={'Performance commerciale':'📊','Compte de résultat':'🧾','Achats & stock':'🛒','Frais généraux':'⛽','Visite magasin':'🏬','Performance catalogue':'📦','Démarche leader':'🏆','Synthèse':'📈','Détail':'🔎','Budget 2026-27':'🎯','Analyse Comptabilité':'📒',"Plan d'action":'✅'};
  function ic(t){ return ICO[t]?ICO[t]+' '+t:t; }
  function vis(b){ return b.style.display!=='none'; }
  function cur(){ var s=document.querySelector('#storebar button.on'), n=document.querySelector('#topnav button.on'); return [s?txt(s):'', n?txt(n):'']; }
  function lbl(){ var c=cur(); ab.querySelector('b').textContent=c[0]||'Menu'; ab.querySelector('.mlbl span').textContent=(onFG&&onFG())?'Frais généraux':c[1]; }
  function view(){ var r=null; ['viewGestion','viewCompta','viewAchats','viewChiffres','viewRH','viewVisite','viewTract'].forEach(function(id){ var e=document.getElementById(id); if(e&&e.style.display!=='none'&&e.offsetParent!==null) r=e; }); return r; }
  var ORD=['GROUPE','Hesingue','Sierentz','Waldighoffen','Mulhouse','Creation','RESEAU','COMPARATIF'];
  function isFG(x){ return x.dataset&&(x.dataset.ct==='fg'||x.dataset.gt==='fg'); }
  function fgBtn(){ var v=document.getElementById('viewCompta'); return v?v.querySelector('.v-tabs [data-ct=fg],.v-tabs [data-gt=fg]'):null; }
  function onFG(){ var b=fgBtn(), v=document.getElementById('viewCompta'); return !!(b&&b.classList.contains('on')&&v&&v.offsetParent!==null); }
  function subs(){ var v=view(), t=v&&v.querySelector('.v-tabs,.subtabs'); return t?[].filter.call(t.querySelectorAll('button'),function(x){ return !isFG(x); }):[]; }
  var wantT=null;
  function wantFG(){ var n=0; clearInterval(wantT); wantT=setInterval(function(){ var b=fgBtn(); n++; if(b){ clearInterval(wantT); if(!b.classList.contains('on')) b.click(); setTimeout(lbl,200); } else if(n>40) clearInterval(wantT); },300); }
  var CL={}, OPEN={}, CSUB=[['syn','📈 Synthèse'],['det','🔎 Détail'],['plan','✅ Plan d\'action'],['not','📒 Analyse Comptabilité'],['bud','🎯 Budget 2026-27']];
  function build(){
    var h='', N=document.querySelectorAll('#topnav button'), SB=[].slice.call(document.querySelectorAll('#storebar button')); 
    var CP=SB.filter(function(b){return b.dataset.st==='COMPARATIF';})[0]; SB=SB.filter(function(b){return b.dataset.st!=='COMPARATIF'&&b.dataset.st!=='HISTO';}); var onC=!!(CP&&CP.classList.contains('on')); var HP=[].filter.call(document.querySelectorAll('#storebar button'),function(b){return b.dataset.st==='HISTO';})[0], onH=!!(HP&&HP.classList.contains('on'));
    SB.sort(function(a,b){ var i=ORD.indexOf(a.dataset.st), j=ORD.indexOf(b.dataset.st); return (i<0?99:i)-(j<0?99:j); });
    SB.forEach(function(b){ var on=b.classList.contains('on')&&!onC&&!onH, open_=(on&&OPEN[b.dataset.st]!==false)||((onC||onH)&&b.dataset.st==='GROUPE'), si=[].indexOf.call(document.querySelectorAll('#storebar button'),b);
      h+='<button type="button" class="it'+(on?' on':'')+'" data-k="s'+si+'"><i style="background:'+(COL[b.dataset.st]||'#a3a3a1')+'"></i>'+txt(b)+((on&&b.dataset.st!=='RESEAU')?'<span style="margin-left:auto">'+(open_?'▾':'▸')+'</span>':'')+'</button>';
      if(open_&&b.dataset.st!=='RESEAU'){ h+='<div class="sb">'; N.forEach(function(n,j){ if(!vis(n)) return; var no=n.classList.contains('on')&&!onC&&!onH, isC=(n.id==='navCompta'), fgOn=isC&&no&&onFG();
          var bf=(n.id==='navVisite'&&window.__visiteFait)?window.__visiteFait(b.dataset.st):null;
          var isG=(n.id==='navGestion'&&b.dataset.st!=='RESEAU'), colp=!!CL[n.id], hasSub=(isC||isG||(no&&subs().length>0)); h+='<button type="button" class="it'+((no&&!fgOn)?' on':'')+'" data-k="n'+j+'">'+ic(txt(n))+(bf?'<span class="bul" title="Actions faites, à clore">'+bf+'</span>':'')+(hasSub?'<span style="margin-left:auto">'+(colp?'▸':'▾')+'</span>':'')+'</button>';
          if(!colp&&(isC||isG||(no&&!fgOn))){ var S=(no)?subs():[]; if(S.length||isC||isG){ h+='<div class="sb">'; if(isC&&!S.length){ CSUB.slice(0,4).forEach(function(c,q){ h+='<button type="button" class="it" data-k="c'+q+'">'+c[1]+'</button>'; }); } S.forEach(function(x,q){ if(x.dataset.ct==='bud'||x.dataset.gt==='bud'||x.dataset.s==='hist') return; h+='<button type="button" class="it'+((x.classList.contains('on')&&!fgOn)?' on':'')+'" data-k="t'+q+'">'+ic(txt(x))+'</button>'; }); if(isG){ if(b.dataset.st==='GROUPE') h+='<button type="button" class="it'+(onH?' on':'')+'" data-k="y0">📈 Historique 5 ans &amp; objectifs</button>'; else { var hs_=document.querySelector('#gsub button[data-s="hist"]'), hz_=!!(no&&hs_&&hs_.classList.contains('on')); h+='<button type="button" class="it'+(hz_?' on':'')+'" data-k="z'+si+'">📈 Historique 5 ans &amp; objectifs</button>'; } } if(isC){ var bx=S.filter(function(x){ return x.dataset.ct==='bud'||x.dataset.gt==='bud'; })[0]; h+='<button type="button" class="it'+(fgOn?' on':'')+'" data-k="f0">⛽ Frais généraux</button><button type="button" class="it'+((bx&&bx.classList.contains('on')&&!fgOn)?' on':'')+'" data-k="c4">'+CSUB[4][1]+'</button>'; } h+='</div>'; } }
        });
        if(b.dataset.st==='GROUPE') h+='<button type="button" class="it'+(onC?' on':'')+'" data-k="d0">🏆 Démarche leader</button><button type="button" class="it" data-k="l0">📣 Chef de file commerce <span style="margin-left:auto">↗</span></button>';
        h+='</div>'; } });
    h='<button type="button" class="it" data-k="h0">🏠 Cockpit 360</button>'+h+'<div style="display:flex;align-items:center;margin-top:14px;border-top:1px solid rgba(128,128,128,.25)"><button type="button" class="it" data-k="x0" style="flex:1 1 auto;width:auto">⎋ Déconnexion</button>'+(function(){ var vt=document.getElementById('verTag'), v=vt?String(vt.textContent||'').replace(/\s*·.*$/,'').trim():''; return v?'<button type="button" class="it" data-k="v0" style="flex:0 0 auto;width:auto;font-size:12px;color:#737372;font-weight:600;padding-left:6px;padding-right:14px;border-left-color:transparent" title="Recharger la dernière version">'+v.replace(/</g,'')+' · ↻</button>':''; })()+'</div>';
    body.innerHTML=h;
    body.querySelectorAll('.it').forEach(function(it){ it.onclick=function(){ var k=it.dataset.k, i=+k.slice(1), el; clearInterval(wantT);
      if(k==='x0'){ window.__logout(); return; }
      if(k==='v0'){ var vt2=document.getElementById('verTag'); if(vt2) vt2.click(); return; }
      if(k==='h0'){ close(); if(window.__ckShow) window.__ckShow(); return; }
      if(k==='l0'){ window.open('https://aries2891.github.io/mes-outils/','_blank','noopener'); return; }
      var HU=!!(document.getElementById('ck')&&document.getElementById('ck').classList.contains('show')); if(HU&&window.__ckHide) window.__ckHide();
      if(!HU&&k[0]==='s'&&it.classList.contains('on')){ var sx=document.querySelectorAll('#storebar button')[i].dataset.st; if(sx!=='RESEAU'){ OPEN[sx]=(OPEN[sx]===false); build(); return; } }
      if(k[0]==='n'){ var tn=document.querySelectorAll('#topnav button')[i], cpb=[].filter.call(document.querySelectorAll('#storebar button'),function(x){return x.dataset.st==='COMPARATIF';})[0]; if(!HU&&tn&&tn.classList.contains('on')&&!(cpb&&cpb.classList.contains('on'))&&(tn.id==='navCompta'||subs().length)){ CL[tn.id]=!CL[tn.id]; build(); return; } if(tn) CL[tn.id]=false; }
      if(it.classList.contains('on')){ close(); window.scrollTo({top:0}); return; }
      if(k[0]==='s'){ OPEN={}; el=document.querySelectorAll('#storebar button')[i]; if(el) el.click(); setTimeout(function(){ lbl(); build(); },350); }
      else if(k[0]==='n'){ el=document.querySelectorAll('#topnav button')[i]; if(el) el.click(); setTimeout(function(){ lbl(); if(subs().length) build(); else close(); window.scrollTo({top:0}); },350); }
      else if(k[0]==='d'){ var g=[].filter.call(document.querySelectorAll('#storebar button'),function(x){return x.dataset.st==='GROUPE';})[0], ng=document.getElementById('navGestion'); if(g&&!g.classList.contains('on')) g.click(); if(ng&&!ng.classList.contains('on')) ng.click(); var tries=0, tm=setInterval(function(){ var c=[].filter.call(document.querySelectorAll('#storebar button'),function(x){return x.dataset.st==='COMPARATIF';})[0]; tries++; if(c){ clearInterval(tm); c.click(); setTimeout(function(){ lbl(); close(); window.scrollTo({top:0}); },300); } else if(tries>20) clearInterval(tm); },150); }
      else if(k[0]==='y'){ var g=[].filter.call(document.querySelectorAll('#storebar button'),function(x){return x.dataset.st==='GROUPE';})[0], ng=document.getElementById('navGestion'); if(g&&!g.classList.contains('on')) g.click(); if(ng&&!ng.classList.contains('on')) ng.click(); var tries=0, tm=setInterval(function(){ var c=[].filter.call(document.querySelectorAll('#storebar button'),function(x){return x.dataset.st==='HISTO';})[0]; tries++; if(c){ clearInterval(tm); c.click(); setTimeout(function(){ lbl(); close(); window.scrollTo({top:0}); },300); } else if(tries>20) clearInterval(tm); },150); }
      else if(k[0]==='z'){ var sb_=document.querySelectorAll('#storebar button')[i], ng2=document.getElementById('navGestion'); if(sb_&&!sb_.classList.contains('on')) sb_.click(); if(ng2&&!ng2.classList.contains('on')) ng2.click(); var tr=0, tz=setInterval(function(){ var hb=document.querySelector('#gsub button[data-s="hist"]'); tr++; if(hb&&sb_&&sb_.classList.contains('on')&&ng2&&ng2.classList.contains('on')){ clearInterval(tz); hb.click(); setTimeout(function(){ lbl(); close(); window.scrollTo({top:0}); },300); } else if(tr>30) clearInterval(tz); },150); }
      else if(k[0]==='c'){ var cc=document.getElementById('navCompta'); if(cc&&!cc.classList.contains('on')) cc.click(); var cid=CSUB[i][0], ct=0, ti=setInterval(function(){ var tb=document.querySelector('#viewCompta [data-ct="'+cid+'"],#viewCompta [data-gt="'+cid+'"]'); ct++; if(tb){ clearInterval(ti); tb.click(); setTimeout(function(){ lbl(); close(); window.scrollTo({top:0}); },250); } else if(ct>30) clearInterval(ti); },150); }
      else if(k[0]==='f'){ var c=document.getElementById('navCompta'); if(c&&!c.classList.contains('on')) c.click(); setTimeout(function(){ wantFG(); close(); window.scrollTo({top:0}); },350); }
      else { el=subs()[i]; if(el) el.click(); close(); window.scrollTo({top:0}); }
    }; });
  }
  var csOpen=false;
  window.__drwClick=function(k){ build(); var e=body.querySelector('[data-k="'+k+'"]'); if(e) e.click(); };
  function open(){ build(); drw.classList.add('open'); drw.setAttribute('aria-hidden','false'); }
  function close(){ drw.classList.remove('open'); drw.setAttribute('aria-hidden','true'); lbl(); }
  ab.querySelector('#homeBtn').onclick=function(){ close(); if(window.__ckShow) window.__ckShow(); };
  ab.querySelector('.mbtn').onclick=open; drw.querySelector('.bk').onclick=close; drw.querySelector('.x').onclick=close;
  document.addEventListener('keydown',function(e){ if(e.key==='Escape') close(); });
  /* souris : bord gauche de l'écran = ouvre le menu, il se referme quand la souris le quitte (PC uniquement) */
  try{ if(window.matchMedia&&matchMedia('(hover:hover) and (pointer:fine)').matches){
    var edge=document.createElement('div'); edge.id='edgeMenu'; edge.setAttribute('aria-hidden','true'); document.body.appendChild(edge);
    var hov=false, tOpen=null, tClose=null, pn=drw.querySelector('.pn');
    edge.addEventListener('mouseenter',function(){ if(drw.classList.contains('open')) return; clearTimeout(tOpen); tOpen=setTimeout(function(){ hov=true; open(); },120); });
    edge.addEventListener('mouseleave',function(){ clearTimeout(tOpen); });
    pn.addEventListener('mouseenter',function(){ clearTimeout(tClose); });
    pn.addEventListener('mouseleave',function(){ if(!hov) return; clearTimeout(tClose); tClose=setTimeout(function(){ if(hov){ hov=false; close(); } },400); });
    ab.querySelector('.mbtn').addEventListener('click',function(){ hov=false; });
    drw.querySelector('.bk').addEventListener('mouseenter',function(){ if(hov){ clearTimeout(tClose); tClose=setTimeout(function(){ hov=false; close(); },400); } });
  } }catch(e){}
  var mo=new MutationObserver(lbl); ['storebar','topnav'].forEach(function(id){ var e=document.getElementById(id); if(e) mo.observe(e,{subtree:true,childList:true,attributes:true,attributeFilter:['class']}); });
  lbl(); setTimeout(lbl,600);
})();
/* ===== Notes explicatives : repliées dans une bulle ⓘ (clic) pour alléger les pages ===== */
(function(){
  var SKIP=/^(Aucun|Pas d.écart|Le compte de résultat et les frais généraux sont protégés)/;
  var pop=null, popBtn=null, tOpen=0;
  function closePop(){ if(pop){ pop.remove(); pop=null; popBtn=null; } }
  function openPop(btn,html){
    if(popBtn===btn){ closePop(); return; } closePop();
    tOpen=Date.now(); pop=document.createElement('div'); pop.className='ibub'; pop.setAttribute('role','dialog'); pop.innerHTML=html; document.body.appendChild(pop); popBtn=btn;
    var r=btn.getBoundingClientRect(), w=Math.min(380,window.innerWidth-24), left=Math.max(12,Math.min(r.left,window.innerWidth-w-12));
    pop.style.width=w+'px'; pop.style.left=left+'px';
    var h=pop.offsetHeight, top=r.bottom+8; if(top+h>window.innerHeight-12) top=Math.max(12,r.top-h-8); pop.style.top=top+'px';
  }
  function conv(el){
    if(el.dataset.nb) return; var t=(el.textContent||'').trim();
    if(t.length<70||SKIP.test(t)) return;
    if(el.querySelector('input,select,button,textarea')) return;
    if(el.closest('#drw,#appbar,.mlbl,.v-head,.v-zsel,.v-tools')) return;
    el.dataset.nb='1';
    var b=document.createElement('button'); b.type='button'; b.className='ibtn'; b.textContent='ⓘ'; b.title='Informations sur le calcul'; b.setAttribute('aria-label','Informations');
    var html=el.innerHTML; b.onclick=function(ev){ ev.stopPropagation(); openPop(b,html); };
    el.style.display='none'; el.parentNode.insertBefore(b,el);
  }
  var tm=null;
  function scan(){ var f=document.getElementById('gfoot'); if(f&&f.innerHTML.trim()&&!(f.firstElementChild&&f.firstElementChild.classList.contains('sub'))) f.innerHTML='<div class="sub">'+f.innerHTML+'</div>'; document.querySelectorAll('.sub:not([data-nb])').forEach(conv); }
  new MutationObserver(function(){ clearTimeout(tm); tm=setTimeout(scan,60); }).observe(document.body,{childList:true,subtree:true});
  document.addEventListener('click',function(e){ if(pop&&!pop.contains(e.target)) closePop(); });
  document.addEventListener('keydown',function(e){ if(e.key==='Escape') closePop(); });
  window.addEventListener('scroll',function(){ if(Date.now()-tOpen>500) closePop(); },{passive:true}); window.addEventListener('resize',closePop);
})();;
/* Réseau : France entière, pour se benchmarker. Données à brancher dans window.RESEAU = {periode:'', kpis:[{l:'CA',u:'€',reseau:n,groupe:n,hausse:true}]} */
window.__rsv=function(k){ var D=window.RESEAU; return (D&&D.vals&&D.vals[k]!=null)?D.vals[k]:null; };
window.__reseauRender=function(v){
  function e(x){ return String(x).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function fr(n,u){ return (n==null||isNaN(n))?'—':n.toLocaleString('fr-FR',{maximumFractionDigits:u==='%'?1:0})+(u?(u==='%'?' %':' '+u):''); }
  var D=window.RESEAU, K=(D&&D.kpis)||[
    {l:'Chiffre d\'affaires',u:'€'},{l:'Passages (trafic)',u:''},{l:'Panier moyen (vente par client)',u:'€'},{l:'Marge',u:'%',sec:1}];
  var ok=!!(D&&D.kpis&&D.kpis.length), h='<h2>Réseau<span class="rs-badge">France entière</span></h2>';
  h+='<div style="color:#737372;font-size:14px">Les chiffres du réseau national, pour comparer chaque magasin à la France.'+(ok&&D.periode?' Période : '+e(D.periode)+'.':'')+'</div>';
  if(!ok) h+='<div class="rs-wait"><b>Données en attente</b> : sans elles, cette page ne sert à rien.<ul><li>CA, passages et panier moyen du réseau France (prioritaires)</li><li>Détail par rayon, avec le rang de chaque magasin</li><li>Marge du réseau (secondaire)</li></ul>Ces chiffres sont à ajouter à la collecte Booster (lecture seule).</div>';
  h+='<table class="rs-tb"><thead><tr><th>Indicateur</th><th>Réseau France</th></tr></thead><tbody>';
  K.forEach(function(k){ h+='<tr><td>'+e(k.l)+'</td><td'+(k.reseau==null?' class="na"':'')+'>'+fr(k.reseau,k.u)+'</td></tr>'; });
  v.innerHTML=h+'</tbody></table>';
};;
window.__logout=function(){try{['tractCacheKey','tractCacheJSON','tractCacheDate','keepTab'].forEach(function(k){sessionStorage.removeItem(k);});}catch(e){}try{history.replaceState(null,'',location.pathname+location.search);}catch(e){}location.reload();};;
(function(){
  var ST=[['GROUPE','Groupe','#b21f2d'],['Hesingue','Hésingue','#1e7a34'],['Sierentz','Sierentz','#e0a900'],['Waldighoffen','Waldighoffen','#1d5fa8'],['Mulhouse','Mulhouse','#7b3fa0'],['RESEAU','Réseau','#ec6707']];
  var TL=[
   ['perf','📊','Performance commerciale','Chiffre d\'affaires, passages, panier, NAC, marge : par rayon, avec les rangs réseau.','ok'],
   ['fin','🧾','Pilotage financier & comptable','Compte de résultat, frais généraux, analyse comptabilité, rentabilité.','ok'],
   ['ach','🛒','Contrôle de gestion :<br>achats &amp; stock','Achats & stock rayon par rayon, mois par mois, face à l\'objectif.','ok'],
   ['vis','🏬','Suivi des visites terrain','Préparer, réaliser et analyser les visites ; actions faites à clore.','ok'],
   ['plan','✅','Tâches & plans d\'action','Priorités par rayon, suivi des actions et mesure de leur réalisation.','ok'],
   ['bench','🏆','Benchmark des magasins','Démarche leader : comparer les magasins, copier ce qui marche ailleurs.','ok'],
   ['prod','⏱️','Analyse de la productivité','Équipes, temps et ressources. Les effectifs existent déjà, l\'analyse reste à construire.','wip'],
   ['sirh','👥','Internalz','Planning, absences, dossiers et documents : les outils des quatre magasins, réunis dans un environnement unique et sécurisé.','ok'],
   ['gg','🗂️','Outils Google','Mail, agenda, fichiers et tableaux : tes outils Google en un clic.','ok'],
   ['cs','🧭','Pilotage des chefs de secteur','Activité, priorités et résultats. Le suivi « Chef de file commerce » est déjà relié.','wip'],
   ['c9','🏗️','Remodeling C9','Suivi financier du chantier de ton magasin : estimé, commandé, facturé, reste à payer, contrôles.','ok'],];
  var LAB={ok:'Disponible',wip:'En cours',soon:'À venir'}, store='', ck=document.getElementById('ck');
  function draw(){
    ck.addEventListener('click',function(e){ if(e.target.closest&&e.target.closest('.lo')) window.__logout(); if(e.target.closest&&e.target.closest('.mn')){ var mb=document.querySelector('#appbar .mbtn'); if(mb) mb.click(); } });
    ck.innerHTML='<header><button type="button" class="mn" aria-label="Ouvrir le menu" title="Menu">☰</button><div class="brand">COCKPIT <b>360</b></div><div class="lead">Le cockpit de pilotage de la performance magasin : les outils et les données pour piloter les magasins et les équipes terrain, au même endroit.</div><div class="pills">'+
     ST.map(function(x){ return '<button type="button" data-st="'+x[0]+'" class="'+(x[0]===store?'on':'')+'"><i style="background:'+x[2]+'"></i>'+x[1]+'</button>'; }).join('')+'</div>'+(store?'':'<div class="chs" style="margin:14px auto 0;max-width:640px;text-align:center;font-weight:800;color:#ec6707;font-size:16px">👆 Choisis d\'abord ton magasin pour ouvrir les modules</div>')+'</header><main><h2>Les modules</h2><div class="grid">'+
     TL.map(function(t){ if(t[0]==='gg') return '<div class="tile act"><div class="top"><div class="ico"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAJdklEQVR42mWWS4xc2VnHf+dxz723qrq6q9vtdrvtyYTJyJmZYM9EI2JgCGhYQBQYCJooUoIiFkhBCDZIgVUWAZQFkVggZoEEEmIDDAJWaBIwGSkRCnmQ4ARnPB7bmdietru7urveVfeex8filtsJHOlclUr3nu/1+3/fUTGI6AQEIAFhCqsWyDme3aI3HIArYFrDN67CtZvwzj7hnQNIiaFEVnqncJs7sLEFly7BM0/CmR74KXTbJCLRWAwOAEVEIYCgqhTFJo32NEsJxAG4KcQZDMb0X/0nbnzzW2xnbfJJRXuRKGtBAZVoohhUVFTaUZU5fat47PLzrP/SL8LWOvRWSWmO1m0SgkaBJEgaNZW5WMB5IFrAwnQPuMvxq3/N/Ftv0J5FwrxCBXBYnHI4ZUE0fpowGJQyJCy1Muh2i+gcw8yw/cJl+NUPQUdBZwVSBpKBLONdyFAMYCMQAZ2DP+DaH/023YM7dA/mrOoCTA7BgLjGSbGQbHOYF/CRkCLGZKiyDTYjKmG3cIzfvcPTn/4UrK5AakMyPFw6R2NTANOBLMCtf+XWn/4u7N/g7FoL1BRWFLjEdDQAk0FyxIWmmiTCIgEZKbNEpVGFBRUgzvGpoq4X9Pt99m6+1aT9/yzr9wdkp0/B6G2Y3OHma3/JKdOndX6dw9v3OH3mNHiDVIm6yJnNKpRtEYuSUFhsu2A+nVBiWF1bo67mGJ1AJWbGMltp8zMf/Qjq4sUmSBHQS+ABJUcihH1wbzP84l+RDm8QB3u4ytCNbRhYGEeClCzKHiPVo9h+gvUfewrObkOR4LjP8Xevs3ftDTbQ6DBHVOK4XfKeT3wc9YGfgLJRlidi0GiApLGUwCJQf+0faem3sb2KGUKqBT8L+PsjqrqF2j5P58n30/nQy9DqQdmFIgM81BW9yz9LLyn40r9z9coVkvI89+FfgJ+6TEoRTUHAI0iDGs1DSf+OkD/g8D8/Tza9ThhNMAJRadIkQ+23KDpP0X75U3DmAphVsDknGEfVwBuBJFBVcHBINR6QP30BTAJDs5evJjRgEcBivo/0v4Mt9tByjE0BSYZgNHM0WvXY+NgnoXKQObzOqZbtJAeyh0Cb5j+yAtZ3yNPOSZ0hNf4qUEvX03JbyrfZf/Or9MoBkoaYTJOkIEYHtsv5X/518Ao6HdCGrDkH+8MoG/mR3/PpFOccWmcorQFNUj9qOC2fFrlBXb2BK4ekbIESCElQ2QprW0/C2nuAbaDzMMzGeGo88Qo86sS+QjG1K+gMFgJWneQAHhVuSYHGcvh1TndnwASdBXwtzJNCOmusvvcngXVqNnHoZewRpHHEKziGZUkeGYgOZoCo/yd7UgKnTyqCZX4Hp4cQazAOdEXSGcZtQXaOmtNUdFHUZA8nljJ4BWPgd/7wK8z12iMDIsQQMdYgEpumJBqdWigB8WPWuoI2fT7z6Q9jmRyhlIaQAYYsz3B6E509BjwOnFomzC5HZhPxmCb6UWuHmTr9KAMihBCw1iIiJEAnh4lFI4is5qDqY/OM6wOwqKU2JG9OcBqnemBPAeuoEwXpE6Llh0geecNYZSdVlSSEqLHJQFLoZJuSLT8qnSMrtpA0ZujBIkVTLFkaEIOoEqVKICM7ASecgGSA9jIThTEsrEJLM8lVahwzRmHF4McVa70WUwMPBgm7ohFlEB9ZKLCCQxEbIlSAFKjjDOKYnCGwicKd0CskFOCAAsjqEVkqUA/HaxIkRrQY8JYVt4J4SBpcoZl7aDnIM02rAOu1RhOxegKqZh4WTKNHy0263AHOAW7ZvXTjLBWQY4GOHCMpe6QAJXgV0cagVRt0wdgnZkZRdDLGQ6Gla9ol9Fpga7poNQU5RpkZNZ5ZHKD1O8BdYAB0SdRLCjQRT4qeFDt8/vd/mmkCH5fXAtXonwzqBN/4NnztOzA8GqDNKinOidWCvBVY0WA7F1/i7n+8SicXtPJ4A1WoOBq+xfje61w89xwRh6ZEsAgagyE3itLA+hIMUVCrRv8emAL7Ab57/ZiJXoUiUqcxea7QcQrTEUUCDTu0uxeY1Y7BHOaSUQmMw4AHgzcZ8D0qfoAj4LA0N8ECkWx5iW22ipDTzB7XJIBa4Gi+x6geIlkgyILMJpwOvO/C4+QJNOEc6+vvZ1q3OBrBYGJYxJLhwrN7eIt/vvIKKxwj7DPw9xseRBGXbfmETg1zYF/gwVKSr/zDFe6NjxgsjqikQmUBJRWtXPHBD5wlV6BR27DxFMdpjYNKszsKjMQwERiEisN6nz/++89wwH0O1D5TZiwUVAq8bu6YwcFQN41JGbgN/N5rr3Ft1GevHjCnwqcFVidETSiyORfPQqnATsxZrPFsXnqR3at9bOE5mB8ziJZFtkJc6bAfAp/9lz/h8Xc9z6+8r8cap1ljlQBUGmpgsaz7FyZ9/u71K/zX92+zuf0UznQJs0CWHIOjAx5bc/zaS8+gga4Ge5xmnNPbbGw8T2vtBtduf5nj6Kk7OapsMU+aobPsTh9wZ/e/+bcb13nvzrM8e/5ZHtt6gtEscH844a29Pj8Yj7l6d5eRzfC9knvDB1AZVl2Ow7Geley4mhceh9ZyviqR+1JxQFqMyYoBf/PFz/Hm+BqDlka660ymbSZ06GvHxJQE0yP5ktnBgtx2SK6NF8vcJ6qomcyEU2feRdKOw/sLtk4/h53m+HeGPN89xZ//xiXKAfTWwagKC1NyNqA4D8x48YO/xeDrf8ve5AbjmeF4pvCtFpOiZKhzhj7hmeN6jlS2qI1hERK+huTBrbSo1AxSoL1aMBvfZdW3OZMnfvOln2dDQaHBRcDmKJFDAQUSIXmiKbjB93jlyufYsxP6aY1Z2WOUGUaiWARFqhVqXDesFwVkGYqMqlbUlQZKfK2x3tENXc4uHJ/9yCe5vO7oAu3YyJYUUSJ+6YBHvCCuZI8+GRP+7M2/4Js3H3CoLPtSMZBIyCxF5mgrS117puKpBRwOHTJsKil1FxML7Bx+fOsJ/uDFl2mFmm1rKVAUJGwNBI0aikgGOAGdmlG3oGbMiDmeCXNe/eoX+NLtq/j1FnfrEbVJWBWJCkaqwmDZdCtsqlVUP+CGimd2nubnLl7mhXNPkwMzjumgKVHkKGwoIGSoPREpgEKAGnQGRsMDhkzSjLY2OFbYJfAV/ofXb32b24d32d2/R9CJygndzirvbm9y3qzz3MYFLm9d4knOUgIlCaipiIwZ0AZWaGFCB1LG/wLZnY2qFdCKGAAAAABJRU5ErkJggg==" alt="" style="height:26px;width:auto;display:block"></div><h3>'+t[2]+'</h3></div><p>'+t[3]+'</p><span class="st ok">'+LAB.ok+'</span><div class="ggl"><a href="https://mail.google.com/" target="_blank" rel="noopener" title="Gmail" aria-label="Gmail"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACkAAAAnCAYAAACSamGGAAAFMUlEQVR42u1YW2wUVRj+/jPb3e1eaAUhyrUxUmNgaSWiQMoLiaiECkGIBk3sg4F4QaMLhkvAILXKzRdRLt5Dgg9YbbIPBBOCBgG5CMKgoYiUS4MQ2y60pdvZnXN+H0rZ2Z2ZpdCFoHKSP5mZM+fM93//dQ51JuVI3OZD4F8w7oD8X4H02J4wA5LDAAOC2iBugR4sATbDIEoCBQaIcoC8bIz3xH7dQPpZoOMi+J4A1JSxUCPui9w0U57fqYuGVSA+DA75gAGVMPsviUIr/r77HbqagjpTpQUbfqgVx86DVQow28FmOyAMyJkToZ6YEMkrqyyhHflKF0eXA+E4KGyAwylQwAvu+zhSAzbNggjpGT6p7WuoFcfO2zczUtA2fQvt8691GEZJXgAmEwPFtmpd/FgNmB1X6EpPU2IHtMu1m22BI34/l7UTAXxlsVQQW7dDW7EmRvGLVb3BR5eaqrQv39gm9m4GK2lhNuvFzh326OZkZ7Y9MrRjZtCBQxCLF0Wp4eTuGwJ49sRusfrVKP22qytAszixjg6VckhBCQcmHTSkhpMQC+eFxYH9uu1Drv7HEAf36qL69TDO/uFMXdbtITnIDlK1n4DqaLSvIgdGWpohqpdCxOp0KJUboFIQsTpdvL8EFG+27E2uS/aZg7EzOdQOkpQJdWE7VGt9z9hJJEDr10Js/Ng9oAyjRGz4SKd1HwIdHe62vRoChK3mcLzbXoF2Sc4Vh9iEatoFjh8EWHUp7GDR7kckJei7LRA1y2KIt2QEFMVbqsR778REXS1ISmQnaFvAQ8NGHoNVqXGIS0JSsXtZJDDUxaNQzfsBTjlqnHlLoJ93Q1s4P4ozp2MAgDOnY2LB/Cjt2eUevZbRSj687a3AZzwKbRJIKEbS4u8exygkgBONgNkGCt2f08Gv4m74E9qCaAk/PVOnb7aAWpqQeyGDADQWBPFW0WgcEX1BFv82LNce13RBBJiXoFqPQhQOzkVm+nlzE7BxnfO8zdyEX4LFeHPQSDR6AoC0pDwGjGsxmWFMlQRfPgV+eCJIP5wrKHMqkE3kudIJeG6giVbNA0h7hsjpky55BGr28+f4memAxwPuTcXxFIAnzUHbU8twgTxISCChuqRTpa8NdSP9pEf7S856NqLmvgYKBm8AHYBAEPKFxZCTX45A80LKPhYJw7RcKxXoqbntfqUemxRR/fvr2soaUPPfPV6q+g0Az1sMHjk60lWENEhZlKMGBHvZmZc/FFErVter4aXXND0D4AcehFr+QX03wO5PK1nkKtxrkAB4yLAZXLNqEY8dnwMggcdVQNasjGLIsBmZkwJKFruLBaSnFzEA7lMU44VL6/HFJ7UiVgdIS+ulaeCp06GqXqyEz3fKroAGaRa7m1vmCSQAwO8/rua8EsHgIbr4dD2Q6AT7/VCzXwJPrnTv5lkAsk86qLL9RuUTJAAIAVU5LcJDS3Ta8xN4XAW4rDySO9gF/GbIdd4r/XkG2U1OWXmEy8p7phcTAmbIQiKDLKXAJwtvDsjrymYsEDDd863vZjF5facSoi1oBsMZvmip3X7pvS2YNAKpUNi5S2f4pHYbMMnU7jML7yZy/qMokE4nGIJuKUgGvCyFa8USnP4tSP+IRcrdSxwBIDLyam4gqVRXl2YTCYy616EL4spps9STU4BgCPD701JYCB7zKPiufmvzCbJvEGseGcbwaYBXpCVYAEwZwZhaxnPtZ0HdJ2qp1EDbjprWDE0z8m1yqdDPVLB9z+vBcQIMZ5B3DlH/4yD/ASqTUmOQ9QLCAAAAAElFTkSuQmCC" alt="" style="height:20px;width:auto;display:block">Gmail ↗</a><a href="https://calendar.google.com/" target="_blank" rel="noopener" title="Agenda" aria-label="Agenda"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACUAAAAnCAYAAACIVoEIAAAGTklEQVR42u2YXWxcRxXHf3Pvfq99N8Tr2HHTuHFw0lZ2BLSiypKmH5TkpVDa9CWVWlIeQgUqEgo8NELCCKmVeOAbpCAe6EvLS4E2SFWDqsZKSBVoU6QUVWoT1wlpYrt2svau99M7h4e5d+/dD28NbEQfGGl0d2fOPec/55z/mbmjSpXaGB+zZvExbKGPEqjU2DZfVhNLZcZX/ktDTpSz6ahMRGze7SSrOoVvpqCOTOdVpqJBdcEDAoQt2NIjpwYT8rV/G9T5BXX2/FWFJd0BFAQmCrauF0b6ZHxNoHJF9h37u5q4fEmR1BBTYKnueUoLlASWbbhhk7DnU3K4J8bRVUHlSuz78TFrYvkaDIYhZUNYdT+RqwKLNZipQu96+NYefSgZ5VhbUD95TZ1945xiMAwbwtBrr4EJ/0FbAXI1mKvCTAUyNwtf3+2Hsl4SZnIcef19hRZYEahoKGkoXode0kb/ioAGTk4p5peZaCkJVxZVJlcCxzbuLQtYGmzlJkO3moKaq78qJsdyRZhbYl86aYDVQYkY2zV8UMoDRXfpV3OTvSrGnhaoan/1dVDJqKAsE76qGBfjMq/bntJBTwG2BfGItFb0VJxTySiZStn1lAaxwAoAshRsTsMN6yEahoUcnJuB5XKHSm7D1gHIFmA2axaoMTlVdfM3HoFUnOMtoJwozyfDZMolP3xa+0xw4nBgN+zYzFDI5oob8shSkf1/+Bu/Pf5OU5QENjjw6J0wdiO9r79H7sirZmHaTZGqGLlkxNhvYV8iwvHemKGr5ymPLVUFX70HPrMFlS1y8NV3kD+eQS4scCqV4NlHPsf24YEAuwQ+vRWeeoBDOzajLEVeVCMDy56n3AXHw5xquyEPOMJ7c4qqGDd7lXx7P4xtYihb4OD3XmLiwoIZT77BbT/4Mh+ObqB/5yi89QEkInAgA/fdypCCSqHCXYkIkzUXjKX8yl51nwO9svopYaNjXLviMlG5+97bs/DdF7kcsuHcvC9fLsFfp0mPboBUwoS8Pw53jrK3WGHnb/7CC2ND8IVbUDWMdzxQHtM1MJTqcHQZShnkuML1alCD0xfbJ3IqYZ4fLJrknboKzxzjldkcvDsH2wddfQIV8fNFXBsixhmrgkonwbJMgnv0bcNoQjbEQ5AZgc9vI7NUYv+f/mHyA2Byyl+YBEDUAosVd8KyoL+nA6gBR+YtS6VrOqCpqd01Cl/5LPNOjOf7ezj8YZ6nv/8yTwbD2lyQg/+b1VoKBhyZXvU4nIrybCIK0QhEwhBu7iFwYrDR4fFkxOzqn4jziwfGYV2yjXzYLb6AshrHI2FjJxEFJ8pzq3rqSo5DoZA5Q0nTyrxInpiGM5c5alswNgiP3c4Le29BRULIDyeNsAQ8Y9vmt20ZEHWQyk+Fy0scdmJt6hTAbF5RD50LxHJd7JWHmoZcGbJFODEFPz/JPhEidwxz98ZeI2c3vVPX5f73urj65pbV6l8zhYoR0uLng8ZsyiN9EAv7NUa785cWYbnCnmiIt/uS7pzrJd2cU4Hu2ajp1m2qAdT5ecM8LY3PR2+DH32Jmx7e4Rvz5vviZjeoafoKZR+wJxNkX4tuF9j7VzuA+mdWGQ9p17j7nFqAkMWVh8a5/d5PmnJgWzDUCwd3gqXIz+b52cVr7rva1+GhquvTjb+1hovX1OolYbkSqFGBFU6eg10jlHdtQX3nHqIzOY4sljiweR13JyJMLpfZ86uT7C1WGt/V0sh/rRtrnzeVXy182QIHs4VW92uB8go882f43RlkqcT+/iSHR9OklaJy+gLy7Rd55fR0m9AJLJYgX+b+bCEQ+ib92QIsFjnQ8uEwtcDZb/7eolrrfEZzYnDjOgjbMJODuZy/NbW9F3BZ6AFp1yIh+OmDmpE+xhvCV6pCufrRB8dswfS1Nr0GmVLF2G/JqfKK6rji690Wi23O6LYStFb/M1DxMG3P6LlYiN5Ctc1mrLo0FvwIUf5YTxTSPf6mXGff8HoydwyLYYRuLHBdGZM24+5z57CwaR1fbFs8n9wtz430+S9IwIgElEiT8TXJNXVvbjQN39gtv+5467KQ56lfnlCPnDyvyJeuXw45cbh3m/DELnnaifsnhI73U5eyHL1W4Ca5DoxUCtI9vLnR8Qvmmm/y/n8RG2j/AgxFp2EYDjAyAAAAAElFTkSuQmCC" alt="" style="height:20px;width:auto;display:block">Agenda ↗</a><a href="https://drive.google.com/" target="_blank" rel="noopener" title="Drive" aria-label="Drive"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACcAAAAnCAYAAACMo1E1AAAFk0lEQVR42u2YW2wUVRjH/9+Z2blsuw3aSpGorKlRSKwxIfGCJlZtIBpjTEyM8QUiCSTG+oLEEGJEIRoihBDihQS5SACNYJDGCAJSLoUobUWL2NBKC6ztttvddi+d3e3OzPFhZru73d3uBRp54CRfJnN2Z85v/t/tzFBs3HgYt+hguIXHbbhyh3gjF3PO5d7YUNvp0b9xJepFIBFBjeRCnTILT82Yi/vV2vr/BS6oa0s+7j2wYv/QOYSNWNbvVYKK12c93fnenFfWuET1QDlrUDnZ6on7m9/86zP3hUgvAMp/cyLMd9Vhx7y3WmrlGU3THnMxMzF/Zc/X7guRvinBbLejLdSDd7t3NcTNRP20wx3ynd/5i/9iSdccDfyJQ8Nte6cVblTXlm26ehgmN0taxATH+r6DGNHHmqYNbnf/+abBuAYqowJdi/nwpefIsmmBuxYNnjjo7YIEFSJJ4JyXDLi9/zi6tYHOmwpncu76xtNdE9cFyOSEDLUs9YJ6FBuu/gCDm9U3De5SKHL2/EgQMjkhkRMSc0IkB1CyeBxG+CRY5FTLTYFLmNx9qH8EAlcgkdNWzgmJ1JKVqyKGVdJvkLyrAR6dfcNwHX69eUBjkFgSyjY4IZADvGj5CIuVAcyDBxRtBwvsOXJDcGM6Fp72OiDBApNtQJmckEmFRAqIU1Fo94oc70jtVt0mguBbD0oMNZUNd2aQNkZ0goSUWtZRnThnJBahHmGl0oW7+IgNB8Doh+DfuKwsOK+GrR3D1p1Ekmy1nJCZailon0tQCraxx6QYXhMuAsQsA4EIYMFdoHhnZ0m7EsNE9ZErtCAylvqbwCsh8wScJgEkoW5GJeJ0BzQ+E1EzBBNmHs0MrOb7oCBmw1HKuAZheB302XsAEouDO9tLLduPETLrrGrb3QCApS9wND7EG5IlIt8QRva1SNe708CQAci0Y2Da8U6zYlF9QbdGE1jwxSnCuA4kjFxGSBiEr1oZtDg1CER+gVhuM0YbRO9HFnwSCpSpHkwIgbWAqbkLwu3voK29/sLZdz0AfNtBa6bcyfo2rWHjfXmgUipSogssvKN5SrjBMLbsbadiyxa++53gGUVz7l1sVycb3mqtMMmVmYAWpBD6HGT8uyEnHAfkneeoYVQroVdGgW2t5DY5XJldyoDgXQuYwRQAS483G5ilQMn0gQU3L0qP3wm46yM4/NMlKqkdEYDjlwl/eHA244kjJzspeDANhmW6FelzmPhNiO4HGX3NWXCne6gmrpf+EqIbwLZWhnEdD1pbGM0tDLwPQE+LK2TFWabZczwGFj3qzoLrHizvLUwgoHcQOHOZDgCAENjdjGgbaMKVbBJUrpKSNqdfynZrrAzVwAGZLPuxnRAJe1exoU9tT1EOV1IeFVOgjI9lw1U5S32hBhwMUAXLxjTg1K8db1DCkxHoEwszlj2XHov2A3GhOhtu3sxCHXJSDSJAZoDCANU+dgw0Ykh/MpUtWYohT/baGUsMpuPRbLgFdbzFpRTvTols1Rig2EeYClp9H8IkZRJEviKcnq0MplANLj+7Mwuu1oWmlx/hxXBBmASmsJSKntFn4Im9mrMT5MzQtAcw1cXgrHZjzg6x5Am+Yv59vGBtS3dn0qWyYM1LIFz0fQCd7iwMmJY4XH0eRsXyRXnbV4WEn9e9xLc87uZgeQLQQakkUGyTmZ21toJhbQ6uhN4GiGeWC0xyKWMAieDKi0hUbV4OUvsLfshJGHCf6Kbm7y8Q+gJASLPcSQBcAlAlpswlApUCUJE8ClYWy44RND7QCKejJy1T2UTt446Z4I65MCqXgsvP1efavU35lYkD8lAYG4ZCaEjCiWTFnG1xgeCfMMDPCGG71EhVyj8LZdFXk2pTycBg4I579nJW+8mUX6luf7Auc/wHyssFC9BEzfAAAAAASUVORK5CYII=" alt="" style="height:20px;width:auto;display:block">Drive ↗</a><a href="https://docs.google.com/spreadsheets/" target="_blank" rel="noopener" title="Sheets" aria-label="Sheets"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACkAAAApCAYAAACoYAD2AAAEzklEQVR42u2YX4jUVRTHP+fe+/szOzOr24rbmhuthmK0pkT5UIIRhhVC6UstBL2URERQPm3QQ1DRk5L4YEGB0SYhUShRgigZahSm7SZGRJuabvhnJZXcmfn9Tg+/3/xZZ2Y3JVeFvZffnPtv5n7n3HO+95yfXCpEd3ODF8NNUKZAToGcAnkVxdV2FA32nfvlh4+H93CiMIKioIo2+KIgE4xK8zlJPpwYFue6eWbW0qHZQfvKZiClzJOxan79se171x3dzmhcLINGlQZwkg0Fk84ZpFxF0vmaMaTJmqR2+m28u6CXxa2394wL8puRwwNPD66jqFECMNWgpHDjdJvyjxsMIhaLQXAYLEYsBoPBYbGIWAy2vo3FSiINFoCucBob73qsvz3Mvd30uL849T0FLdUdmKIsb1/Ia3NXsfHo12wd/g4RSTdyODys+InEw4mPrbQ9HGk/bTtxWPy0n6wTBC1GPL5zQ++Kzu7etT1P9OW8cFsdyJOFsxWASlWLsSrP3raMe1vnyAtdj+inw/uwOIwYLA6Lh4ePkxCPACcBHgGe+Gk7xBMfjxBHgCdBVYqf/gmLCvxc2Mc7P33OobNDb/Uve+VMxvl7x3h3XOsemsJVKhYH4MTWOER66GIxuKRKArgMyidDQAafLIG0EEqWUHJkJE+LtNIi08jKdLKmjbxpJzBZVJWvjv3IZ0P7N01AQUrWhuRd8jiT2I0VodWG5G1Iq80k8+m6nA3J2YCcC8ZIKxYjBiMOIw475vESiUtMAY+ybnadHGhMQWWHWdO1nOdmP3zeijkDcGswfQ3A/Oysnj1L3tgmMJo6UEGQQuq5oyJSEKQyB8KBkbMrP/x9iDE8Joztm3pCGxm90BxkjLKq437mZTtbL58LjDc4t6Wj+0qIOOf85/v/OLqpFI+zSOtpNdK4OUgrhlePbOapzgfUk8SgH52xaKA7M3PhqcLfb279a3+fwaYklFCKkYSCbCorFITlwMg5/okiPPGu6JapvUJcowWDF4/T9+sW0JgIpeue9p7uzEyOXzrTt/bIR3gmsR9HiCcBniRO4kmIL2HiNBLiSUhABifhld+FyvggqSFulbEnUblLRCrthMDBpGurj1z/AEP+rwhCrkcUJFd/tJMHUm+GeFJuIJB6I2kyJq4QrEyW48h/oKBkoWCAzSf2MCfToe8f34kRc21sWJrH+G6iwxSEHacPsuP0IZAkGp+U5KtGGY1BqjbRvYBo/ZTQfEwa9OvW1OdRt/i5iTQp41q/Vp60aoyKVvvExBoTS0SsETERMSViSkSUMKkUiuldBbHERBQruz80q6cepK09RrksAatgrjWeWjAlSpQQLYIYyndpFXKEakRSS5QoUqKQxpBpZK5wKb4IwNLOBTx5x5KX6kB2Bm0VDHK5JrUqFVBJwEVSzYlUNdVUkRKjFLRRjpOM1eU4IqhG5P2IFxesoG/R6v4WF+yuA7lyxn18MvxtJVts4nQ1mWRElBJUpBElCkkqoVeXLc4O8ny5/OX32vyWDc3zbjT/+m9b9n7w506KREkGN0l593Qvy/r5vTzYduf4eXdK1u27RgZ3H75wjIPnhxiJLiZOcQ3eYFgxtNkc3ZmZrO5YwryWzp4J32BMvbCaAjkFcgrk5Jd/AeM9obNbODr7AAAAAElFTkSuQmCC" alt="" style="height:20px;width:auto;display:block">Sheets ↗</a></div></div>'; var on=t[4]!=='soon'; return (on?'<button type="button" class="tile'+''+'" data-t="'+t[0]+'">':'<div class="tile">')+'<div class="top">'+(t[0]==='sirh'?'<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAANIAAAAjCAYAAADhV1T+AAAK8UlEQVR4nO2df2wT5xnHv0eSmanlJqojS4Uj1Dhlrb2silspdsvACxqe0DhRjVjtZsgmO1WXCIlYQcSsylzEYqIyU6mNi4hTWnDV1EEaOBKVM5Fdf9rbkFMp2NNSO6iKK6LWotohNDySvvsDQn7gO/+6S5zUn7+C797ze8/d932f+z7vGWr07XbivQIB6mE+avKogRahPUqUECL5QS9x/TUhsHV13VtUYP9GYj0vtJmFJ3YCBoBaui6VWC0k+ozE0BMT2Lq67q3y5e5ARqYibwVGE83pN9Ko3ao/qHoAx5e2UyVKLKT4hRT1NLft9wtsrIX9UuCVkpBKLDdrlrsDJUqsBkpCKlFCAkpCKlFCAkpCKlFCAkpCKlFCAuR17aZTiF/mSDDEIZoEgA1QP6OFtl7vUVcpiqMQl+KRGA+TSGISkU+iSAK418+faD2qjXSLYpm7KIgc8Z1OgZ8IXw/GY+vn4gEwjxugUanwpLq6hqEVV6U6hdVCzkISK7KpOgIIvFhLYZpH+HQnaf1zAMnpRTsNAACsYOqtliMnYd/BLCzIfeEhxu1OxLPqTQzO7So4AbLg4939iB03iBT6UkiOXSCuLid8Y3z6XWb7Wc5YdXuP4OUDRvF6VYZ+s6ficDXOFR9TychbF7yuZu9AENFkCthsB3fRyqLP6Jc1vkLcjNkDrzq6/3g2eP8xAQC+2T8mUKWH5Q8O2H5eSykkGIrFC7d5kPH6S4+kqV08lgCmY/b+5+uJqSfNRZ5PchT9rQ0wHAkSgVtZHqYC5PAONdE9axcW0XymkwidboXxiYZX2oaSJHODDKQmfxV4yUg0Orb58OvcHRFliVzxTQ61Et0Txu6200IiWsRUEP37jdBsaSW+L1KFx2QVIO0zEh+Gq8nY7RzNvknijBnmvtiSXAw+5CCGLa3wTeTTOolAe4HCn/KTNr3hXNtAnqOv5PHlET7OEl174F4KlxPJAA5vb4JrlP/Oi0laIY30wj2We7NojwO+Kch6MfgRO9lhPguhJZTZkrfwr3Ow7WxHoJDpV+L4xvvMxHQyUkCHACACd1Or7Nev2CkS1y4Id76jdDbwfmJ7wZffqJuGaI8VrrHcbhx/pwX+Jc1h55MmvhO9pLWnUBHNHf9wlx/LdnpFQJEICUgMc0gAu6Q/Mg9/Rzs4sV2YeliO+cGFRtlweJQKXfR+43iuVqTBJNyHPDL1Vx4WxpeH/0+ujIaOgtHA8JwJrK4WdCZTYcQFz3hxzEpqjWrJv1M2+1vVaIVppxZKTCJ8cRD9IxlmnPEgwjetfuXGvdRgaPcj/5v9/OOuCV1HQKBRLVoH38G+atQs+Ph76+Yd10NcIyLfW2dHYNB6UFU+z5Gj9Q+ZjwbA/tJBWKF0cNwFT8jqd+iW5zWAvOP7ACiABtsfpZ4e48iF986i79wik4Exovu9EzBtUsyd2zSPQOc20nZeaN6ZhM8fga1Dk/O5KFsCVCwbs57niM0gPrPTu/vh/V31kl8TGYSkge3iIFo3z10E424rbOO9pGmnC1HBdlcQmwBQpwDNzKtT0OJVnB88xIBhIFjXCA94RJ6L6uF4w4oFIpoHrXNQ7hc5wp6cTLM1Be8ZP+w6FrnXmRRQ6owwbvsZtJtV0Gh+yK5ds+4KA1zN/AxXaHzn+sDUGSlLnRGWoynw40EyeMaDs8FqOP7ihIFeNECU0zAee/Mj88ien3oFbuTkJ0EkOjS7lMBQxtPIlemYvb85Q3pcb8fgMcNBWvIvz4zkqZ22680FF3kWxeY26vBvxG65JBJfS92byFvcRRF7WWfCL6oWzWaLUBtZMEIbh/+G4HQu6QwDwyEvQpFoDec9QdlbWMq4TUMpGWaIeSi7Iqc88VWA3mygLEe9FHfJSd0nolnK67eafi0YDWAsghgg9M5LAfDgOpu6nWJGS50dgXcXZRZLiMQzkh57dgoHWrfLBMU7Z5F95aRAkpHmsJjDELJDV2vPywy/w6cI/wsw1GXeE9DAPuyHpaaQVFD++KauJx+58a3w9sraJwEIpdpxxL8EDBsL6EC6o/aZiVUwpQRAs/C8LZxZLAUSC2kDKkUGLGxQQglkuWpBAq4lIKMXCCCJcCQJ1Imd9B20XW8WKCJAnvjeWeXR1+OGNzRZ4CCXArIp6OZAfMBMmkTdRQ3s507cn4oWCPkmsSv1YZ//2+gwZr76HJi5DZRVoKzyUaxR74BiawtLrVfeS2GL/w3ZQvh6UjLLW/Arbvw3q/2UysxiW3L44HXnHvP6/gLmZDnhR9pJ00tBEVudBnvKK8EAtZDbwTPkls92RzzzmbmNmWtRzFyL4jbX619rcqFCv48CVruQloD4v+MAqpe7G7mThQO2rEx4iPkF8dqU+tAgXI209CJ6d3/mHWdu4+5+pEK/jyqaOpIsbKgWNgq+06TAHWktXhHxHLHtcYo4kHdt7pZaydO5Wz5bTm1u+Wwg3yR2re4Z6WElagHB9I550Y9Qh2ZV/BxUTtwMEO/5TE9DCjB1ejRqKhd+/J8ILrwfkc8wysbmrpPH5k592Oe/L53LxMxtpD7s869uITGat7UMmkMCSkoOBRA9oOlTl4v/SCE/lWxQVDF/L9r3knLlclB8pUedDYGBtoMqRRoX7LKDXHhfqqVFi8nC5pbRofs2Opx3uxWe2sUQ/KfY0KX5rWGnyO3/ZS86T8esol8x4SHmLQ0hzWP1hO3wkMBYkiyZfS8TiQkxITBoPdKGtCJCCtyAT7bZKLPNrUe3DA7dLDNffZ53uxUuJIDrZNHW5yeB988Sp7mB6Dq4BTe69jkrlCLtoz1GmF4dJXwa25a/7CHm2Vx9mkf0vBNtzzZA81gDMb/kIdw4vzJFNZ1fr/nhTmLLmBLmBz/SnoXN7YVJYodOKoo/tbtrGAjb2JMI9LTPKxG+jsEOAzFX3Q34Zitla+wlNpH1duHX90B7kibqrb/AjysB4CtcucghKjQ4TicRGnAidL0SETeb8yktN8pNakCwwpaEu8UC9NjJvrrqmnWK1NUbX4bJhVNOOM/LVJXLwqEDInDuSPM2dDryfEO2rPJRzFwTsziE2xW/kB7X4mnksu5kFM43gjC/rL/7bxrs8RPwazOsAJ/mER3xiTpFC9HAfiifdXZFwI80UMEvXLhNcnBbOLiBHCtMG7Dugdy7k7g0mEPc5WONekdeQlqj3rECUrtyA2USXUN2P6l3ehe+aEazlOsUCyldHvUhFyybijPNyMim3TV76+U4cIaVF0WOYmsLi7KK3BqVVUCxtYUtfiEB0P3eAV1OLYJwexfm23TjCYrz7hV9XsoW7aEABiWuYSwtzFVzV1t+saBpSQekYoJarxxaa3Ll1GatyQVqvXJoRQgJVSbKfcqUU3H11lTivpyb1jko7mM3TKLrvUVgDLAPjMLXUkutyJRuPnU2yp9jTFFeD/u5YzDI1KVioEK/j1r7/GvIODOVVWDt86/dWyK0MoQEgG50Uh9ccsPyVIZLX8PCMTCK0HEjlXbkrDJS3cNRKuR1gK3LbmxVbNLDcsyP8Mf9lOUpaZekLCd0o5MK/ePcR47dmozPesw2O3yfngtZalb8EJKRCv0+6sGuz9iK7QdQ9rB6TlRlFSh7WI2K7QfwYNdn7KyIAIBKpW4tV3/z5yaP+FiQRMbCCH3BA6ChekoP/Ra9R83k+MOIsz8QGY8hfDmOG8Dd42mhUqmhramm6DweoFcc6eLwfRV0Wg00z2gPqmhF6b/OEeH/5CmToB7p/twAAAAASUVORK5CYII=" alt="Internalz" style="height:30px;width:auto;display:block">':'<div class="ico">'+t[1]+'</div><h3>'+t[2]+'</h3>')+'</div><p>'+t[3]+'</p><span class="st '+t[4]+'">'+LAB[t[4]]+'</span>'+(on?'<span class="go">'+((t[0]==='sirh'||t[0]==='cs')?'↗':'→')+'</span></button>':'</div>'); }).join('')+
     '</div></main><footer>COCKPIT 360 · <button type="button" class="ckv" style="border:0;background:none;color:inherit;font:inherit;cursor:pointer;text-decoration:underline" title="Recharger la dernière version"></button></footer>';
    (function(){ var vt=document.getElementById('verTag'), b=ck.querySelector('.ckv'); if(b){ b.textContent=vt?vt.textContent:'↻'; b.onclick=function(){ if(vt) vt.click(); else location.reload(); }; } })();
    ck.querySelectorAll('.pills button').forEach(function(b){ b.onclick=function(){ store=b.dataset.st; draw(); }; });
    ck.querySelectorAll('button.tile').forEach(function(b){ b.onclick=function(){ go(b.dataset.t); }; });
    (function(){ var b=ck.querySelector('button.tile[data-t=c9]'); if(!b) return; var best=0; try{ (store?[store]:['Hesingue','Sierentz']).forEach(function(k){ var v=Date.parse(localStorage.getItem('c9maj_'+k)||''); if(v>best) best=v; }); }catch(e){} if(!best) return; var mn=Math.max(0,Math.round((Date.now()-best)/6e4)), tx=mn<2?'à l\'instant':mn<60?'il y a '+mn+' min':mn<1440?'il y a '+Math.round(mn/60)+' h':'il y a '+Math.round(mn/1440)+' j'; var sp=document.createElement('small'); sp.style.cssText='display:inline-block;margin-top:6px;font-size:11px;color:#737372;background:#f4f2ec;border-radius:10px;padding:2px 8px'; sp.textContent='Modifié '+tx; b.appendChild(sp); })();
  }
  function clickStore(st){ var b=[].find.call(document.querySelectorAll('#storebar button'),function(x){ return x.dataset.st===st; }); if(b&&!b.classList.contains('on')) b.click(); }
  function nav(id){ var b=document.getElementById(id); if(b&&!b.classList.contains('on')) b.click(); }
  function sub(rx){ var n=0,t=setInterval(function(){ var b=[].find.call(document.querySelectorAll('button'),function(x){ return rx.test(x.textContent.trim())&&x.offsetParent!==null&&!x.closest('#drw')&&!x.closest('#ck'); }); n++; if(b){ clearInterval(t); b.click(); } else if(n>20) clearInterval(t); },200); }
  function hide(){ ck.classList.remove('show'); window.scrollTo({top:0}); }
  function go(t){
    if(t==='sirh'){ window.open('https://internalz.fr/','_blank','noopener'); return; }
    if(t==='cs'){ window.open('https://aries2891.github.io/mes-outils/','_blank','noopener'); return; }
    if(!store){ var pl=ck.querySelector('.pills'); if(pl){ pl.scrollIntoView({block:'center'}); pl.style.outline='3px solid #ec6707'; pl.style.outlineOffset='6px'; pl.style.borderRadius='12px'; setTimeout(function(){ pl.style.outline=''; },1600); } return; }
    var st=store; if(st==='RESEAU'&&t!=='perf') st='GROUPE';
    if(t==='c9'){ hide(); clickStore(store==='RESEAU'?'GROUPE':store); setTimeout(function(){ window.__c9Open&&window.__c9Open(store); },400); return; }
    if(t==='bench'){ hide(); clickStore('GROUPE'); setTimeout(function(){ window.__drwClick&&window.__drwClick('d0'); },400); return; }
    if(t==='plan'&&st==='GROUPE') st='Hesingue';
    hide(); clickStore(st);
    setTimeout(function(){
      if(t==='perf') nav('navGestion');
      else if(t==='fin') { nav('navCompta'); }
      else if(t==='ach') nav('navAchats');
      else if(t==='vis') nav('navVisite');
      else if(t==='prod') nav('navRH');
      else if(t==='plan'){ nav('navGestion'); sub(/^Plan d.action/); }
    },350);
  }
  window.__ckHide=function(){ ck.classList.remove('show'); };
  window.__ckShow=function(nosave){ draw(); ck.classList.add('show'); ck.scrollTop=0; try{ if(nosave!==true&&!(history.state&&history.state.home)) history.pushState({home:1},'',location.pathname+location.search); }catch(e){} };
  var n=0, w=setInterval(function(){ n++; if(document.getElementById('appbar')&&document.getElementById('drwb')){ clearInterval(w); window.__ckShow(); } else if(n>200) clearInterval(w); },150);
})();;
/* ===== Historique 5 ans & objectifs ===== */
(function(){
  var STS=['Hesingue','Sierentz','Waldighoffen','Mulhouse'];
  var LBL={Hesingue:'Hésingue',Sierentz:'Sierentz',Waldighoffen:'Waldighoffen',Mulhouse:'Mulhouse'};
  var COL={Hesingue:'#1e7a34',Sierentz:'#e0a900',Waldighoffen:'#1d5fa8',Mulhouse:'#7b3fa0'};
  var ANN=[2023,2024,2025,2026,2027], DEF={2026:'réalisé avant bilan',2027:'objectif'};
  var TPL=[['S','PERFORMANCE'],['R','C.A H.T (avec production)'],['R','ACHATS MARCHANDISES'],['R','VARIATION DE STOCKS'],['R','BFA OBTENUS'],['R','Marge commerciale'],['R','Taux de Marge Brut METI'],['R','Taux de Marge brute Comm + Prod (Bilan)'],['R','Total des Charges Externes'],['R','Charges Externes %'],['R','Masse salariale rcf'],['R','M.S %'],['R','interim'],['R','Refacturation autre magasin'],['R','Subvention apprenti'],['R','MS % consolidé'],['R','EBE RCF'],['R','EBE RCF %'],['R','R.E Valeur SIG (hors Financier)'],['R','R.E %'],['R','Disponibilité'],['R','Panier'],['R','Passage Clients'],['R','Poids de la cartes FID'],['R','NAC'],['R','MDH %'],['R','Poids du C.A GAMME A'],['R','Stock en Valeur au 30/09/N'],['R','Stock Toxique Statut 6-7-8-9'],['R','Stock Toxique Statut 5 Gamme K'],['R','Jours de stock'],['S','LES HOMMES'],['T','(EXERCICE)'],['R','Effectif (équivalent temps plein)'],['R','Effectif moyen au 31/12 N (nombre de bulletins annuel / 12)'],['R','Turnover %'],['R','Turnover (moyenne homme)'],['R',"Taux d'Absentéisme %"],['R','Accidents du Travail'],['R','Formations Nbre Heures'],['R','Formations Nbre Salariés'],['R','EDP / EP'],['S','CONQUETE CLIENT'],['R','Note GOOGLE'],['R','NPS'],['R','Enquête Satisfaction'],['R','Carte Fidélité'],['R','Publication FACEBOOK'],['R','Animations en magasin'],['R','Ateliers']];
  /* lignes du tableau reprises du compte de résultat / budget : [libellé du tableau, ligne Sage, e=euros p=% du CA] */
  var LINK=[[/^C\.A H\.T/i,/^CA HT NET$/,'e',/^(ventes? de )?prestations? (de )?services?|prestations? de services? vendues?/i],[/^ACHATS MARCH/i,/^Achats de marchandises/i,'e'],[/^VARIATION DE STOCK/i,/^Variation de stock/i,'e'],[/^Marge commerciale/i,/^MARGE SUR VENTES$/,'e'],[/^Taux de Marge brute Comm/i,/^MARGE BRUTE GLOBALE$/,'p'],[/^Total des Charges Externes/i,/^Total des charges externes$/i,'e'],[/^Charges Externes %/i,/^Total des charges externes$/i,'p'],[/^Masse salariale/i,/^Charges de personnel$/,'e'],[/^M\.S %/i,/^Charges de personnel$/,'p'],[/^EBE RCF\s*$/i,/^EXCEDENT BRUT D EXPLOITATION$/,'e'],[/^EBE RCF\s*%/i,/^EXCEDENT BRUT D EXPLOITATION$/,'p'],[/^R\.E Valeur/i,/^RESULTAT D.?EXPLOITATION$/i,'e'],[/^R\.E %/i,/^RESULTAT D.?EXPLOITATION$/i,'p'],[/^interim/i,/int[ée]rim/i,'e'],[/^Subvention apprenti/i,/(subvention|aide).*(apprenti)/i,'e'],[/^Refacturation autre/i,/refacturation/i,'e']];
  var SEL='Hesingue', CACHE=null;
  function esc(t){ return String(t==null?'':t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function eur(v){ return Math.round(v).toLocaleString('fr-FR')+' €'; }
  function pc(v){ return v.toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})+' %'; }
  async function key(name,pw){ var enc=new TextEncoder(), km=await crypto.subtle.importKey('raw',enc.encode(pw),'PBKDF2',false,['deriveKey']);
    return crypto.subtle.deriveKey({name:'PBKDF2',salt:enc.encode('fg-sync-'+name),iterations:200000,hash:'SHA-256'},km,{name:'AES-GCM',length:256},false,['decrypt']); }
  async function get(k,salt,pw){ var url=window.__SYNC_URL; if(!url||!pw) return null;
    try{ var r=await fetch(url+'?k='+encodeURIComponent(k)+'&_='+Date.now()), j=JSON.parse(await r.text()); if(!j||!j.v) return null;
      var all=Uint8Array.from(atob(j.v),function(c){return c.charCodeAt(0);}), pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:all.slice(0,12)},await key(salt,pw),all.slice(12));
      var txt=await new Response(new Blob([pt]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text(); return JSON.parse(txt); }catch(e){ return null; } }
  async function charger(){ var gp=window.__GRPPW||((((window.__DATA||{}).AUTO||{}).G)||null), o={pw:!!gp,chif:null,ach:null};
    if(gp){ o.chif=await get('visite_chifGROUPE','chifGROUPE',gp); o.ach=await get('visite_achGROUPE','achGROUPE',gp); } return o; }
  function lien(CRo,label,yi){ if(!CRo||!CRo.rows||yi<3) return null; var l=label.replace(/\s+/g,' ').trim();
    for(var k=0;k<LINK.length;k++){ if(!LINK[k][0].test(l)) continue; var r=null;
      for(var j=0;j<CRo.rows.length;j++){ if(LINK[k][1].test(CRo.rows[j][0])){ r=CRo.rows[j]; break; } }
      if(!r) return null; var p=LINK[k][2]==='p', v=p?(yi===4?r[7]:r[8]):(yi===4?r[2]:r[3]); if(v==null||isNaN(v)) return null; var plus='';
      if(LINK[k][3]){ for(var j2=0;j2<CRo.rows.length;j2++){ if(LINK[k][3].test(CRo.rows[j2][0])&&CRo.rows[j2][0]!==r[0]){ var v2=yi===4?CRo.rows[j2][2]:CRo.rows[j2][3]; if(v2!=null&&!isNaN(v2)){ v+=v2; plus=' + « '+CRo.rows[j2][0]+' »'; } break; } } }
      return {t:p?pc(v):eur(v),tip:'Repris de « '+r[0]+' »'+plus+' : '+(yi===4?'budget '+(CRo.exercice||'2026-27'):'exercice précédent (N-1 du budget)')+(p?', en % du CA HT':'')}; }
    return null; }

  /* lignes reprises de Booster (période exercice complet 01/10 au 30/09 archivée) : [libellé, champ tot, format] */
  var BOO=[[/^Panier/i,'panier','e2'],[/^Passage Clients/i,'pass','n'],[/^NAC/i,'qpc','n2'],[/^Stock en Valeur/i,'stock','e'],[/^Jours de stock/i,'rot','n']];
  function pd(s){ var d=(s||'').match(/\d\d\/\d\d\/\d\d/g)||[]; return d.map(function(x){ var a=x.split('/'); return new Date(2000+ +a[2],+a[1]-1,+a[0]); }); }
  function perExo(Y){ var B=window.__GBASE; if(!B||!B.periodes) return null;
    for(var k in B.periodes){ var d=pd(k); if(d.length<2) continue; var j=Math.round((d[1]-d[0])/864e5)+1; if(j>=360&&d[1].getFullYear()===Y&&d[1].getMonth()===8&&d[1].getDate()===30){ var P=B.periodes[k]; if(P&&P.mags) return {k:k,P:P}; } }
    return null; }
  function frn(v,d){ return v.toLocaleString('fr-FR',{minimumFractionDigits:d,maximumFractionDigits:d}); }
  function lienB(label,yi){ var l=label.replace(/\s+/g,' ').trim(), X=perExo(ANN[yi]); if(!X) return null;
    for(var k=0;k<BOO.length;k++){ if(!BOO[k][0].test(l)) continue; var m=X.P.mags[SEL], t=m&&m.tot, v=t&&t[BOO[k][1]]; if(v==null||isNaN(v)) return null; var f=BOO[k][2];
      return {t:f==='e2'?frn(v,2)+' €':(f==='e'?eur(v):(f==='n2'?frn(v,2):frn(v,0))),n:v,tip:'Repris de Booster, période '+X.k+' (exercice complet)'}; }
    return null; }
  /* sens favorable : d = plus bas c'est mieux, u = plus haut c'est mieux, sinon neutre */
  var POLD=/^(Total des Charges|Charges Externes|Masse salariale|M\.S|MS %|interim|Stock en Valeur|Stock Toxique|Jours de stock|Turnover|Taux d.Absent|Accidents)/i,
      POLU=/^(C\.A|Marge|Taux de Marge|EBE|R\.E|Disponib|Panier|Passage|Poids|NAC|MDH|Note|NPS|Enqu|Carte Fid|Publication|Animations|Ateliers|Formations|BFA|Subvention)/i;
  function pol(l){ l=l.replace(/\s+/g,' ').trim(); return POLD.test(l)?'d':(POLU.test(l)?'u':'n'); }
  function num(v){ if(v==null) return null; if(typeof v==='number') return isFinite(v)?v:null; var s=String(v).replace(/[  \s]/g,'').replace('−','-').replace(',','.'), m=s.match(/^[-+]?\d+(\.\d+)?/); return m?parseFloat(m[0]):null; }
  var GOOD={c:'#1e7a34',b:'#eaf6ec'}, MID={c:'#e0701a',b:'#fdf1e6'}, BAD={c:'#b21f2d',b:'#fbeaea'}, NEU={c:'#555',b:''};
  function ecart(label,a,b,isPct,unit){ if(a==null||b==null) return null;
    var d=a-b, p=pol(label), rel=Math.abs(b)>1e-9?100*d/Math.abs(b):null, col=NEU;
    if(p!=='n'){ var s=p==='d'?-d:d; if(isPct){ col=s>=0.3?GOOD:(s>-0.3?MID:BAD); } else if(rel!=null){ var sr=p==='d'?-rel:rel; col=sr>=2?GOOD:(sr>=0?MID:BAD); } }
    var arrow=Math.abs(d)<1e-9?'=':(d>0?'▲':'▼'), sg=d>0?'+':(d<0?'−':''), ab=Math.abs(d), top;
    if(isPct) top=sg+frn(ab,1)+' pt'; else top=sg+(Math.abs(ab)>=100?frn(ab,0):frn(ab,2).replace(/,00$/,''))+unit;
    var sub=(!isPct&&rel!=null)?(sg+frn(Math.abs(rel),1)+' %'):'';
    return {top:top,sub:sub,arrow:arrow,col:col,tip:'Écart : '+top+(sub?' ('+sub+')':'')}; }
  function paint(root){ var FIX=root.__fix||null; if(FIX) SEL=FIX;
    var D=CACHE||{}, S=D.chif&&D.chif.S&&D.chif.S[SEL]||null, has=!!(S&&S.rows&&S.rows.length);
    var rows=has?S.rows:TPL.map(function(t){ return [t[0],t[1],[]]; }), notes=(S&&S.notes)||{};
    var CRo=D.ach&&D.ach.S&&D.ach.S[SEL]&&D.ach.S[SEL].CR||null, nl=0;
    var h='<div class="ach" style="padding:6px 0"><h3 style="margin:6px 0">📈 Historique 5 ans &amp; objectifs <span data-tip="Années 2023 à 2025 : bilans, importés depuis ton fichier « Grands chiffres sur 5 ans ». 2026 = réalisé avant bilan, 2027 = objectif. Les cellules 🔗 sont reprises automatiquement : compte de résultat (N-1 du budget) pour 2026, budget 2026-27 pour 2027, et Booster (exercice complet archivé) pour panier, passages, NAC, stock et jours de stock, uniquement sur la même période. Écarts : vert = favorable (progression de plus de 2 %, ou plus de 0,3 point pour un taux), orange = stable, rouge = défavorable ; pour les charges, le stock, le turnover, l\'absentéisme et les accidents, une baisse est favorable. Gris = ligne sans sens favorable (achats, variation de stock, effectif)." style="cursor:help;color:#737372;font-size:14px">ⓘ</span></h3>';
    if(!D.pw) h+='<div class="g-nodata"><b>Session expirée</b> : recharge la page et reconnecte-toi.</div>';
    else if(!has) h+='<div class="g-nodata"><b>Données en attente</b> : tableau « Grands chiffres sur 5 ans » à importer avec importer_chiffres.py. Les colonnes 2026 et 2027 des lignes comptables se remplissent déjà depuis le compte de résultat et le budget reçus.</div>';
    h+=FIX?'':'<div style="display:flex;gap:6px;flex-wrap:wrap;margin:10px 0">'+STS.map(function(s){ var on=s===SEL; return '<button type="button" data-s="'+s+'" style="font:inherit;font-size:13px;font-weight:700;padding:6px 14px;border-radius:999px;cursor:pointer;border:2px solid '+COL[s]+';background:'+(on?COL[s]:'#fff')+';color:'+(on?'#fff':COL[s])+'">'+LBL[s]+'</button>'; }).join('')+'</div>';
    var EC=[[0,1,'2024 vs 2023'],[1,2,'2025 vs 2024'],[2,3,'2026 vs 2025'],[3,4,'Objectif 2027 vs 2026']], TH='padding:6px 6px;text-align:right;white-space:nowrap;font-size:12.5px';
    h+='<div style="overflow:auto;max-width:100%"><table class="hxt" style="border-collapse:collapse;font-size:13px;table-layout:fixed;width:100%;min-width:1180px"><colgroup><col style="width:250px">'+ANN.map(function(){ return '<col style="width:104px">'; }).join('')+EC.map(function(){ return '<col style="width:108px">'; }).join('')+'</colgroup><thead><tr style="color:#fff"><th style="background:'+COL[SEL]+';padding:5px 8px;text-align:left;position:sticky;left:0;z-index:2" rowspan="2">Exercice du 01/10 au 30/09</th><th colspan="5" style="background:'+COL[SEL]+';padding:5px 6px;text-align:center">Chiffres</th><th colspan="4" style="background:#1d1d1b;padding:5px 6px;text-align:center;border-left:3px solid #fff">Écarts</th></tr><tr style="color:#fff">'+ANN.map(function(a){ var n=notes[a]||DEF[a]||''; return '<th style="background:'+COL[SEL]+';'+TH+'">'+a+(n?'<div style="font-size:11px;font-weight:400;opacity:.9;white-space:normal">'+esc(n)+'</div>':'')+'</th>'; }).join('')+EC.map(function(e,i){ return '<th style="background:#1d1d1b;'+TH+(i===0?';border-left:3px solid #fff':'')+'"><div style="font-size:11.5px;font-weight:600;white-space:normal">'+e[2]+'</div></th>'; }).join('')+'</tr></thead><tbody>';
    rows.forEach(function(r){ var kind=r[0], lab=r[1], v=r[2]||[];
      if(kind==='S'){ h+='<tr><td colspan="10" style="padding:7px 8px;background:#1d1d1b;color:#fff;font-weight:700;letter-spacing:.4px;position:sticky;left:0">'+esc(lab)+'</td></tr>'; return; }
      if(kind==='T'){ h+='<tr><td colspan="10" style="padding:3px 8px;color:#737372;font-size:12px;position:sticky;left:0">'+esc(lab)+'</td></tr>'; return; }
      var C=ANN.map(function(a,i){ var L=lien(CRo,lab,i)||lienB(lab,i); if(L){ nl++; return {t:L.t,n:L.n!=null?L.n:num(L.t),l:1,tip:L.tip}; } var x=v[i]; return {t:x==null||x===''?null:esc(x),n:num(x),l:0}; });
      var isPct=/%|^taux|poids|dispon/i.test(lab.replace(/\s+/g,' ').trim()), unit=C.some(function(c){ return c.t&&/€/.test(c.t); })?' €':'';
      h+='<tr style="border-bottom:1px solid #efefed"><td style="padding:6px 8px;text-align:left;position:sticky;left:0;background:#fff;overflow:hidden;text-overflow:ellipsis" title="'+esc(lab)+'">'+esc(lab)+'</td>'+C.map(function(c,i){
        var bg=i===4?'background:#fff4ea;':(i===3?'background:#f6f6f4;':'');
        return '<td'+(c.tip?' data-tip="'+esc(c.tip)+'"':'')+' style="padding:6px 8px;text-align:right;white-space:nowrap;'+bg+(c.l?'font-weight:700;':'')+'">'+(c.t==null?'<span style="color:#b8b8b5">—</span>':c.t)+(c.l?' <span style="font-size:10px">🔗</span>':'')+'</td>'; }).join('')
        +EC.map(function(e,k){ var x=ecart(lab,C[e[1]].n,C[e[0]].n,isPct,unit), bl=k===0?'border-left:3px solid #fff;':'';
          if(!x) return '<td style="padding:6px 6px;text-align:right;'+bl+'"><span style="color:#b8b8b5">—</span></td>';
          return '<td data-tip="'+esc(x.tip)+'" style="padding:4px 6px;text-align:right;white-space:nowrap;line-height:1.25;'+bl+(x.col.b?'background:'+x.col.b+';':'')+'color:'+x.col.c+';font-weight:700"><span style="font-size:10px">'+x.arrow+'</span> '+esc(x.top)+(x.sub?'<div style="font-size:11px;font-weight:600">'+esc(x.sub)+'</div>':'')+'</td>'; }).join('')+'</tr>'; });
    h+='</tbody></table></div></div>'; root.innerHTML=h;
    root.querySelectorAll('button[data-s]').forEach(function(b){ b.onclick=function(){ SEL=b.dataset.s; paint(root); }; });
  }
  window.__chifRender=function(root,store){ if(!root) return; root.__fix=store||null; root.innerHTML='<div class="sub" style="padding:14px;color:#737372">Chargement…</div>';
    charger().then(function(d){ CACHE=d; paint(root); },function(){ CACHE={pw:true}; paint(root); }); };
})();

if(typeof document!=='undefined') document.addEventListener('click',function(e){ var t=e.target&&e.target.closest&&e.target.closest('#ghistlnk'); if(!t) return; var cur=document.querySelector('#storebar button.on'); if(cur&&['GROUPE','RESEAU'].indexOf(cur.dataset.st)<0){ var hs=document.querySelector('#gsub button[data-s="hist"]'); if(hs) hs.click(); return; } var bt=document.querySelector('#storebar button[data-st="HISTO"]'); if(bt) bt.click(); });;
/* ===== CONFORT MOBILE : tableaux défilants, 1re colonne figée, police compacte ; barre du haut sous la zone de l'heure ===== */
(function(){
  var st=document.createElement('style'); st.textContent=
   '@media (max-width:760px){'+
   '#appbar{padding-top:calc(6px + env(safe-area-inset-top,0px))!important}'+
   '#ck header{padding-top:calc(30px + env(safe-area-inset-top,0px))!important}#ck .mn{top:calc(10px + env(safe-area-inset-top,0px))!important}'+
   '.tscroll{overflow-x:auto;-webkit-overflow-scrolling:touch;max-width:100%;overscroll-behavior-x:contain}'+
   '.tscroll>table{margin:0!important;table-layout:auto!important;min-width:0!important}.tscroll col{width:auto!important}.hxt{min-width:0!important}.hxt col:first-child{width:104px!important}.hxt col{width:60px!important}.hxt th,.hxt td{font-size:11.5px!important;padding:5px 4px!important;white-space:normal}.hxt td:not(:first-child),.hxt th:not(:first-child){white-space:nowrap}.hxt th div{font-size:9.5px!important}'+
   '.tscroll table th,.tscroll table td,table.tcmp th,table.tcmp td{font-size:12px!important;padding:5px 5px!important;line-height:1.25}'+
   '.tscroll table td.tfc,.tscroll table th.tfc{position:sticky;left:0;z-index:2;max-width:32vw;min-width:98px;white-space:normal!important;word-break:break-word;font-size:11.5px!important;line-height:1.2!important;box-shadow:2px 0 4px rgba(0,0,0,.14)}'+
   '.tscroll table td.tnw,.tscroll table th.tnw{white-space:nowrap}'+
   '.tshint{font-size:11px;color:#737372;margin:2px 2px 4px;text-align:right}'+
   '}';
  document.head.appendChild(st);
  var mq=window.matchMedia('(max-width:760px)'), pend=false, busy=false;
  function scrolls(el){ for(var i=0;el&&i<4&&el!==document.body;i++,el=el.parentElement){ var o=getComputedStyle(el).overflowX; if(o==='auto'||o==='scroll') return el; } return null; }
  function bgOf(c){ var b=getComputedStyle(c).backgroundColor; if(b&&b!=='rgba(0, 0, 0, 0)'&&b!=='transparent') return b; var r=c.parentElement&&getComputedStyle(c.parentElement).backgroundColor; return (r&&r!=='rgba(0, 0, 0, 0)'&&r!=='transparent')?r:'#fff'; }
  function prep(t){
    if(t.dataset.mt) return; if(t.closest('#drw,#verTag,.noscroll')) return; t.dataset.mt='1';
    var sc=scrolls(t.parentElement);
    if(!sc){ var w=document.createElement('div'); w.className='tscroll'; t.parentNode.insertBefore(w,t); w.appendChild(t); sc=w; }
    else sc.classList.add('tscroll');
    var rows=t.rows; if(rows.length>400) return;
    for(var i=0;i<rows.length;i++){ var cs=rows[i].cells; if(!cs.length) continue;
      for(var j=0;j<cs.length;j++){ var c=cs[j]; if(j>0&&!c.colSpan||j>0&&c.colSpan<2){ if((c.textContent||'').length<=18) c.classList.add('tnw'); } }
      var f=cs[0]; if(cs.length>1&&f.colSpan<2&&getComputedStyle(f).position!=='sticky'){ f.classList.add('tfc'); f.style.backgroundColor=bgOf(f); } }
    requestAnimationFrame(function(){ if(sc.scrollWidth>sc.clientWidth+8&&!sc.previousElementSibling?.classList?.contains('tshint')){ var h=document.createElement('div'); h.className='tshint'; h.textContent='↔ Glisse pour voir toutes les colonnes'; sc.parentNode.insertBefore(h,sc); } });
  }
  function run(){ pend=false; if(!mq.matches) return; busy=true; try{ document.querySelectorAll('table:not([data-mt])').forEach(prep); }catch(e){} busy=false; }
  function sched(){ if(pend||busy) return; pend=true; (window.requestIdleCallback||function(f){ setTimeout(f,120); })(run,{timeout:400}); }
  new MutationObserver(function(){ sched(); }).observe(document.body,{childList:true,subtree:true});
  sched();
})();;
(function(){
  var root=document.getElementById('viewC9'); if(!root) return;
  var OPENG={}, SEL='Sierentz', LOADING=false;
  var LBL={Sierentz:'Sierentz',Hesingue:'Hésingue'};
  function esc(t){ return String(t==null?'':t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function eur(v){ return (v==null||isNaN(v))?'—':Math.round(v).toLocaleString('fr-FR')+' €'; }
  function pc(v){ return (v==null||!isFinite(v))?'—':v.toLocaleString('fr-FR',{maximumFractionDigits:0})+' %'; }
  function S(a,f){ var s=0; a.forEach(function(x){ s+=(f(x)||0); }); return s; }
  async function key(name,pw){ var enc=new TextEncoder(), km=await crypto.subtle.importKey('raw',enc.encode(pw),'PBKDF2',false,['deriveKey']);
    return crypto.subtle.deriveKey({name:'PBKDF2',salt:enc.encode('fg-sync-'+name),iterations:200000,hash:'SHA-256'},km,{name:'AES-GCM',length:256},false,['decrypt','encrypt']); }
  var DATA={}, ERR={};
  function pwOf(st){ return (typeof UNLPW!=='undefined'&&UNLPW[st])||((((window.__DATA||{}).AUTO||{}).S||{})[st])||null; }
  var FOCUS=null;
  function allowed(){ if(FOCUS==='none') return []; return ['Sierentz','Hesingue'].filter(function(st){ return !!pwOf(st)&&(!FOCUS||FOCUS===st); }); }
  function wtok(st){ var w=window.__WRITES||{}; return (st&&w[st])||window.__WRITE_TOKEN||''; }
  async function dec(st,v){
    var pw=pwOf(st), all=Uint8Array.from(atob(v),function(c){return c.charCodeAt(0);}), pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:all.slice(0,12)},await key('c9'+st,pw),all.slice(12));
    return JSON.parse(await new Response(new Blob([pt]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text());
  }
  /* copie locale du bloc CHIFFRE (illisible sans le mot de passe) : affichage instantané, puis rafraîchissement en arrière-plan */
  async function lireCache(st){ try{ var v=localStorage.getItem('c9v_'+st); return v&&pwOf(st)?await dec(st,v):null; }catch(e){ return null; } }
  async function lire(st){
    var url=window.__SYNC_URL, pw=pwOf(st); delete ERR[st];
    if(!url||!pw){ ERR[st]='Données non accessibles : connecte-toi avec le mot de passe de ton magasin.'; return null; }
    try{ var r=await fetch(url+'?k=visite_chantier'+st+'&_='+Date.now()), j=JSON.parse(await r.text());
      if(!j||!j.v){ ERR[st]='NEW'; return null; }
      var d=await dec(st,j.v); try{ localStorage.setItem('c9v_'+st,j.v); }catch(e){} return d;
    }catch(e){ ERR[st]='Lecture impossible (mot de passe ou données).'; return null; }
  }
  function ids(d){ (d.L||[]).forEach(function(x,i){ if(!x.i) x.i='l'+Math.random().toString(36).slice(2,8)+i; }); }
  function num(v){ v=String(v==null?'':v).replace(/[\s\u202f\u00a0€]/g,'').replace(',','.'); if(v==='') return null; var n=parseFloat(v); return isNaN(n)?null:n; }
  function ilya(t){ var m=Date.parse(t); if(!isFinite(m)) return ''; try{ if(DATA&&0){} }catch(e){} var mn=Math.max(0,Math.round((Date.now()-m)/6e4)); if(mn<2) return 'à l\'instant'; if(mn<60) return 'il y a '+mn+' min'; var h=Math.round(mn/60); if(h<24) return 'il y a '+h+' h'; var j=Math.round(h/24); return 'il y a '+j+' j'; }
  function memoMaj(st,t){ try{ if(t) localStorage.setItem('c9maj_'+st,t); }catch(e){} }
  async function ecrire(st,d){
    var url=window.__SYNC_URL, pw=pwOf(st); if(!url||!pw) throw new Error('Connexion requise');
    var cs=new Blob([JSON.stringify(d)]).stream().pipeThrough(new CompressionStream('deflate-raw')), z=new Uint8Array(await new Response(cs).arrayBuffer());
    var iv=crypto.getRandomValues(new Uint8Array(12)), ct=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv:iv},await key('c9'+st,pw),z)), all=new Uint8Array(12+ct.length); all.set(iv,0); all.set(ct,12);
    var b=''; for(var i=0;i<all.length;i+=8192) b+=String.fromCharCode.apply(null,all.subarray(i,i+8192));
    var r=await fetch(url,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({k:'visite_chantier'+st,v:btoa(b),w:wtok(st)})}), j=null; try{ j=JSON.parse(await r.text()); }catch(e){}
    if(j&&j.ok===false) throw new Error('Écriture refusée');
    try{ localStorage.setItem('c9v_'+st,btoa(b)); }catch(e){}
  }
  /* relit la dernière version, applique la modification, réécrit : évite d'écraser le travail d'un autre */
  async function modifier(st,fn,hist){
    var d=await lire(st); if(!d){ if(ERR[st]&&ERR[st]!=='NEW') throw new Error(ERR[st]); d=DATA[st]||{L:[]}; }
    d.L=d.L||[]; ids(d); fn(d); delete d.SP; delete d.TF; d.H=d.H||[]; d.H.unshift({t:new Date().toISOString().slice(0,16),a:hist}); d.H=d.H.slice(0,40);
    d.maj=new Date().toISOString(); await ecrire(st,d); DATA[st]=d; delete ERR[st];
  }
  function sheet(html){
    var o=document.getElementById('c9sh'); if(o) o.remove(); var d=document.createElement('div'); d.id='c9sh'; d.innerHTML='<div class="sh">'+html+'</div>'; document.body.appendChild(d);
    var cl=function(){ d.remove(); }; d.onclick=function(e){ if(e.target===d) cl(); }; d.querySelector('.x').onclick=cl; return {el:d,close:cl};
  }
  function dl(id,arr){ return '<datalist id="'+id+'">'+arr.map(function(v){ return '<option value="'+esc(v)+'">'; }).join('')+'</datalist>'; }
  function editLine(st,id,grp){
    var d=DATA[st]||{L:[]}; ids(d); var x=id?(d.L||[]).filter(function(y){return y.i===id;})[0]:null;
    var groups=[],sup=[]; (d.L||[]).forEach(function(y){ if(groups.indexOf(y.g)<0) groups.push(y.g); if(y.f&&sup.indexOf(y.f)<0) sup.push(y.f); });
    var v=function(k){ return x&&x[k]!=null?x[k]:''; };
    var S0=sheet('<div class="shh"><b>'+(x?'Modifier la ligne':'Nouvelle ligne')+' · '+esc(LBL[st])+'</b><button type="button" class="x" aria-label="Fermer">✕</button></div>'+
     '<label>Poste</label><input id="e_g" list="e_gl" value="'+esc(x?x.g:(grp||''))+'" placeholder="ex. Travaux gros œuvre">'+dl('e_gl',groups)+
     '<label>Libellé</label><input id="e_l" value="'+esc(v('l'))+'" placeholder="ex. Charpente">'+
     '<label>Fournisseur</label><input id="e_f" list="e_fl" value="'+esc(v('f'))+'">'+dl('e_fl',sup)+
     '<div class="g3"><div><label>'+(st==='Hesingue'?'Hypofi':'Estimé')+' €</label><input id="e_e" inputmode="decimal" value="'+esc(v('e'))+'"></div><div><label>Commandé €</label><input id="e_c" inputmode="decimal" value="'+esc(v('c'))+'"></div><div><label>Facturé €</label><input id="e_r" inputmode="decimal" value="'+esc(v('r'))+'"></div></div>'+
     '<div class="er" id="e_er"></div><button type="button" class="go" id="e_go">Enregistrer</button>'+(x?'<button type="button" class="del" id="e_del">Supprimer cette ligne</button>':''));
    var el=S0.el, er=el.querySelector('#e_er'), busy=false;
    var run=async function(fn,hist){ if(busy) return; busy=true; er.textContent='Enregistrement…'; try{ await modifier(st,fn,hist); S0.close(); draw(); }catch(e){ er.textContent='Échec : '+e.message+' — réessaie.'; busy=false; } };
    el.querySelector('#e_go').onclick=function(){ var g=el.querySelector('#e_g').value.trim(), l=el.querySelector('#e_l').value.trim();
      if(!g||!l){ er.textContent='Poste et libellé obligatoires.'; return; }
      var o={g:g,l:l,f:el.querySelector('#e_f').value.trim(),e:num(el.querySelector('#e_e').value),c:num(el.querySelector('#e_c').value),r:num(el.querySelector('#e_r').value)};
      run(function(dd){ if(x){ var t=dd.L.filter(function(y){return y.i===x.i;})[0]; if(t) Object.assign(t,o); else dd.L.push(Object.assign({i:x.i,d:[]},o)); } else dd.L.push(Object.assign({i:'l'+Date.now().toString(36),d:[]},o)); },(x?'Modifié : ':'Ajouté : ')+l); };
    var dbtn=el.querySelector('#e_del'); if(dbtn) dbtn.onclick=function(){ if(!dbtn.dataset.ok){ dbtn.dataset.ok=1; dbtn.textContent='Confirmer la suppression'; return; } run(function(dd){ dd.L=dd.L.filter(function(y){return y.i!==x.i;}); },'Supprimé : '+x.l); };
  }
  function editFin(st){
    var d=DATA[st]||{};
    var S0=sheet('<div class="shh"><b>Financement · '+esc(LBL[st])+'</b><button type="button" class="x">✕</button></div><label>Emprunt €</label><input id="f_e" inputmode="decimal" value="'+esc(d.EMP||'')+'"><label>Aide €</label><input id="f_a" inputmode="decimal" value="'+esc(d.AIDE||'')+'"><div class="er" id="f_er"></div><button type="button" class="go" id="f_go">Enregistrer</button>');
    S0.el.querySelector('#f_go').onclick=async function(){ var er=S0.el.querySelector('#f_er'); er.textContent='Enregistrement…'; try{ var a=num(S0.el.querySelector('#f_e').value), b=num(S0.el.querySelector('#f_a').value); await modifier(st,function(dd){ dd.EMP=a; dd.AIDE=b; },'Financement modifié'); S0.close(); draw(); }catch(e){ er.textContent='Échec : '+e.message; } };
  }
  function calc(st){
    var d=DATA[st]; if(!d) return null; ids(d);
    var L=d.L||[], R={d:d,L:L};
    R.est=S(L,function(x){return x.e;}); R.cmdE=S(L,function(x){return x.e?x.c:0;}); R.cmd=S(L,function(x){return x.c;}); R.fac=S(L,function(x){return x.r;});
    R.reste=S(L,function(x){ return x.c?Math.max(x.c-(x.r||0),0):0; });
    R.emp=(d.EMP||0), R.aide=(d.AIDE||0), R.fin=R.emp+R.aide; R.margeFin=R.fin?R.fin-R.cmd:null;
    var G={}, GO=[]; L.forEach(function(x){ if(!G[x.g]){ G[x.g]={g:x.g,e:0,c:0,r:0,n:0}; GO.push(x.g); } var o=G[x.g]; o.e+=x.e||0; o.c+=x.c||0; o.r+=x.r||0; o.n++; });
    R.G=GO.map(function(k){return G[k];});
    var F={}; L.forEach(function(x){ var k=(x.f||'').trim(); if(!k) k='(sans fournisseur)'; var o=F[k]||(F[k]={f:k,c:0,r:0,n:0}); o.c+=x.c||0; o.r+=x.r||0; o.n++; });
    R.F=Object.keys(F).map(function(k){return F[k];}).sort(function(a,b){ return (b.c||b.r)-(a.c||a.r); });
    R.ctl=[];
    var dep=L.filter(function(x){ return x.c&&x.r&&x.r>x.c*1.02; }), sc=L.filter(function(x){ return x.r&&!x.c; }), sf=L.filter(function(x){ return !(x.f||'').trim()&&(x.c||x.r); }), ne=L.filter(function(x){ return x.c&&x.e&&x.c>x.e*1.02; });
    R.dep=dep; R.sc=sc; R.ne=ne;
    function add(ok,ttl,txt){ R.ctl.push({ok:ok,t:ttl,x:txt}); }
    add(dep.length===0,'Factures au-dessus de la commande',dep.length?dep.length+' ligne(s) facturée(s) plus que commandé : '+dep.map(function(x){return x.l;}).slice(0,6).join(' · ')+(dep.length>6?'…':''):'Aucune ligne facturée au-dessus de sa commande.');
    add(sc.length===0,'Facture sans commande',sc.length?sc.length+' ligne(s) avec facture mais sans commande validée : '+sc.map(function(x){return x.l;}).slice(0,6).join(' · '):'Toutes les factures ont une commande.');
    var HY=(st==='Hesingue'?'l\'Hypofi':'l\'estimation'); add(ne.length===0,'Commande au-dessus de '+HY,ne.length?ne.length+' ligne(s) commandée(s) au-dessus de '+HY+' : '+ne.map(function(x){return x.l;}).slice(0,6).join(' · ')+(ne.length>6?'…':''):'Aucune commande au-dessus de '+HY+'.');
    add(sf.length===0,'Ligne sans fournisseur',sf.length?sf.length+' ligne(s) sans fournisseur : '+sf.map(function(x){return x.l;}).slice(0,6).join(' · '):'Tous les montants ont un fournisseur.');
    var bad=[]; (d.SP||[]).forEach(function(p,i){ var seg=L.slice(p.a,p.b), c=S(seg,function(x){return x.c;}), f=S(seg,function(x){return x.r;});
      if(p.c!=null&&Math.abs(c-p.c)>1) bad.push('sous-total '+(i+1)+' commande : fichier '+eur(p.c)+' / lignes '+eur(c));
      if(p.f!=null&&p.f&&Math.abs(f-p.f)>1) bad.push('sous-total '+(i+1)+' facture : fichier '+eur(p.f)+' / lignes '+eur(f)); });
    add(bad.length===0,'Sous-totaux du fichier',bad.length?'Écart entre sous-total du fichier et somme des lignes : '+bad.join(' ; '):'Les sous-totaux du fichier correspondent aux lignes.');
    if(d.TF){ var sp=S(d.SP||[],function(p){return p.c;}), att=sp-(d.AIDE||0), dd=(d.TF.c||0)-att;
      add(Math.abs(dd)<=1,'Total du fichier','Total commandé du fichier '+eur(d.TF.c)+' ; sous-totaux moins aide '+eur(att)+(Math.abs(dd)<=1?' : cohérent.':' : écart de '+eur(dd)+'.')); }
    return R;
  }
  function tiles(R){
    var av=R.cmd?R.fac/R.cmd*100:null;
    return '<div class="c9k">'+
     '<div><small>'+(SEL==='Hesingue'?'Hypofi':'Estimé')+'</small><b>'+eur(R.est)+'</b><i>'+(SEL==='Hesingue'?'valeur saisie':'lignes estimées')+'</i></div>'+
     '<div><small>Commandé</small><b>'+eur(R.cmd)+'</b><i>'+(R.est?pc(R.cmdE/R.est*100)+' de '+(SEL==='Hesingue'?'l\'Hypofi':'l\'estimé (lignes estimées)'):'commandes validées')+'</i></div>'+
     '<div><small>Facturé</small><b>'+eur(R.fac)+'</b><i>'+(av==null?'':pc(av)+' du commandé')+'</i></div>'+
     '<div><small>Reste à facturer</small><b style="color:#b4620a">'+eur(R.reste)+'</b><i>commandé − facturé</i></div>'+
     '<div class="finedit" style="cursor:pointer"><small>Financement ✏️</small><b>'+eur(R.fin||null)+'</b><i>emprunt + aide (toucher pour modifier)</i></div>'+(R.fin?'<div style="display:none"><small>Financement</small><b>'+eur(R.fin)+'</b><i>emprunt + aide</i></div><div><small>Marge de financement</small><b class="'+(R.margeFin<0?'ko':'ok')+'">'+eur(R.margeFin)+'</b><i>financement − commandé</i></div>':'')+
     '</div>';
  }
  function barTbl(R){
    var mx=Math.max.apply(null,R.G.map(function(g){return Math.max(g.c,g.e,g.r);}).concat([1]));
    return '<div class="card"><table><tr><th>Poste</th><th class="n">'+(SEL==='Hesingue'?'Hypofi':'Estimé')+'</th><th class="n">Commandé</th><th class="n">Facturé</th><th class="n">Reste</th><th style="width:30%">Commandé / facturé</th></tr>'+
     R.G.map(function(g){ return '<tr><td><b>'+esc(g.g)+'</b> <small style="color:#737372">'+g.n+' l.</small></td><td class="n">'+eur(g.e||null)+'</td><td class="n">'+eur(g.c||null)+'</td><td class="n">'+eur(g.r||null)+'</td><td class="n">'+eur(g.c?Math.max(g.c-g.r,0):null)+'</td><td><div class="bar"><i style="width:'+(g.c/mx*100)+'%"></i><u style="width:'+(g.r/mx*100)+'%"></u></div></td></tr>'; }).join('')+'</table></div>';
  }
  function fourTbl(R){
    var tot=R.cmd||1;
    return '<div class="card"><table><tr><th>Fournisseur</th><th class="n">Commandé</th><th class="n">Facturé</th><th class="n">Reste</th><th class="n">Part</th></tr>'+
     R.F.slice(0,15).map(function(f){ return '<tr><td>'+esc(f.f)+' <small style="color:#737372">'+f.n+' l.</small></td><td class="n">'+eur(f.c||null)+'</td><td class="n">'+eur(f.r||null)+'</td><td class="n">'+eur(f.c?Math.max(f.c-f.r,0):null)+'</td><td class="n">'+pc(f.c/tot*100)+'</td></tr>'; }).join('')+
     (R.F.length>15?'<tr><td colspan="5" style="color:#737372">… et '+(R.F.length-15)+' autres fournisseurs</td></tr>':'')+'</table></div>';
  }
  function ctlHtml(R){
    return '<div class="card">'+R.ctl.map(function(c){ return '<div class="ct"><span class="p">'+(c.ok?'✅':'⚠️')+'</span><div><b class="'+(c.ok?'ok':'or')+'">'+esc(c.t)+'</b><br><span>'+esc(c.x)+'</span></div></div>'; }).join('')+'</div>';
  }
  function detail(R){
    return R.G.map(function(g){ var seg=R.L.filter(function(x){return x.g===g.g;});
      return '<details data-g="'+esc(g.g)+'"'+(OPENG[g.g]?' open':'')+'><summary><span>'+esc(g.g)+'</span><span style="font-weight:600">'+eur(g.c||null)+' commandé · '+eur(g.r||null)+' facturé</span></summary><div><table><tr><th>Ligne</th><th>Fournisseur</th><th class="n">'+(SEL==='Hesingue'?'Hypofi':'Estimé')+'</th><th class="n">Commandé</th><th class="n">Facturé</th><th class="n">Reste</th><th></th></tr>'+
       seg.map(function(x){ var flag=(x.c&&x.r&&x.r>x.c*1.02)?' ko':(x.c&&x.e&&x.c>x.e*1.02)?' or':''; return '<tr><td class="'+flag.trim()+'">'+esc(x.l)+'</td><td>'+esc(x.f)+'</td><td class="n">'+eur(x.e)+'</td><td class="n">'+eur(x.c)+'</td><td class="n">'+eur(x.r)+'</td><td class="n">'+eur(x.c?Math.max(x.c-(x.r||0),0):null)+'</td><td><button type="button" class="ed" data-ed="'+esc(x.i||'')+'" data-li="'+R.L.indexOf(x)+'" aria-label="Modifier">✏️</button></td></tr>'; }).join('')+'</table><button type="button" class="add sm" data-addg="'+esc(g.g)+'">+ Ajouter dans « '+esc(g.g)+' »</button></div></details>'; }).join('');
  }
  function draw(){
    var A=allowed(); if(A.length&&A.indexOf(SEL)<0) SEL=A[0];
    var R=calc(SEL), h='<div class="c9w"><h2>🏗️ Remodeling C9'+(A.length===1?' · '+esc(LBL[A[0]]):'')+(DATA[SEL]&&DATA[SEL].maj?' <small class="c9ago" style="font-weight:400;font-size:12px;color:#737372;background:#f4f2ec;border-radius:10px;padding:2px 8px;vertical-align:middle">modifié '+ilya(DATA[SEL].maj)+'</small>':'')+'</h2>'+(A.length>1?'<div class="storebar">'+A.map(function(s){ return '<button type="button" data-st="'+s+'" class="'+(s===SEL?'on':'')+'">'+LBL[s]+'</button>'; }).join('')+'</div>':'');
    var e=ERR[SEL];
    if(!A.length) h+='<div class="nod">Le suivi C9 ne concerne pas ton magasin.</div>';
    else if(LOADING) h+='<div class="nod">Chargement…</div>';
    else if(!DATA[SEL]) h+='<div class="nod">'+(e==='NEW'||!e?'Aucun tableau C9 pour '+esc(LBL[SEL])+' pour le moment.<br><br><button type="button" class="add" id="c9add">+ Ajouter la première ligne</button>':esc(e))+'</div>';
    else h+='<button type="button" class="add" id="c9add">+ Ajouter une ligne</button>'+tiles(R)+'<h3>Par poste</h3>'+barTbl(R)+'<h3>Contrôles de cohérence</h3>'+ctlHtml(R)+'<h3>Fournisseurs</h3>'+fourTbl(R)+'<h3>Détail des lignes</h3>'+detail(R)+(R.d.H&&R.d.H.length?'<details><summary>Dernières modifications</summary><div>'+R.d.H.map(function(x){ return '<div style="padding:4px 0;border-bottom:1px solid #efefed"><small style="color:#737372">'+esc(String(x.t).replace('T',' '))+'</small> · '+esc(x.a)+'</div>'; }).join('')+'</div></details>':'')+'<div class="maj">Dernière modification : '+esc((R.d.maj||'').replace('T',' ').slice(0,16))+'.</div>';
    if(DATA[SEL]) memoMaj(SEL,DATA[SEL].maj);
    root.innerHTML=h+'</div>';
    root.querySelectorAll('.storebar button').forEach(function(b){ b.onclick=function(){ SEL=b.dataset.st; draw(); root.scrollTop=0; }; });
    var ad=root.querySelector('#c9add'); if(ad) ad.onclick=function(){ editLine(SEL,null,null); };
    root.querySelectorAll('[data-ed]').forEach(function(b){ b.onclick=function(){ editLine(SEL,b.dataset.ed); }; });
    root.querySelectorAll('[data-addg]').forEach(function(b){ b.onclick=function(){ editLine(SEL,null,b.dataset.addg); }; });
    root.querySelectorAll('details[data-g]').forEach(function(dt){ dt.addEventListener('toggle',function(){ OPENG[dt.dataset.g]=dt.open; }); });
    var fe=root.querySelector('.finedit'); if(fe) fe.onclick=function(){ editFin(SEL); };
  }
  async function open(st){
    FOCUS=(st==='Sierentz'||st==='Hesingue')?st:(st==='Waldighoffen'||st==='Mulhouse'||st==='Creation')?'none':null;
    var A=allowed(); if(st&&A.indexOf(st)>=0) SEL=st; else if(A.length) SEL=A[0];
    root.classList.add('show'); root.scrollTop=0; if(window.__ckHide) window.__ckHide();
    LOADING=!A.some(function(s_){ return DATA[s_]; }); draw();
    for(var k=0;k<A.length;k++){ if(!DATA[A[k]]){ var c=await lireCache(A[k]); if(c) DATA[A[k]]=c; } }
    if(LOADING&&A.some(function(s_){ return DATA[s_]; })){ LOADING=false; draw(); }
    await Promise.all(A.map(async function(s_){ var d=await lire(s_); if(d&&JSON.stringify(d)!==JSON.stringify(DATA[s_])){ DATA[s_]=d; if(s_===SEL&&!document.getElementById('c9sh')) { LOADING=false; draw(); } } }));
    LOADING=false; if(!document.getElementById('c9sh')) draw();
  }
  /* préchargement discret dès que les mots de passe sont connus : l'ouverture devient instantanée */
  (function(){ var n=0, t=setInterval(function(){ n++; var A=['Sierentz','Hesingue'].filter(function(x){ return !!pwOf(x); });
    if(A.length){ clearInterval(t); A.forEach(function(x){ setTimeout(async function(){ try{ var c=await lireCache(x); if(c&&!DATA[x]) DATA[x]=c; var d=await lire(x); if(d) DATA[x]=d; }catch(e){} },2500); }); } else if(n>120) clearInterval(t); },1500); })();
  window.__c9Open=open; window.__c9Render=function(d,st,foc){ FOCUS=foc||null; DATA[st]=d; delete ERR[st]; LOADING=false; SEL=st; root.classList.add('show'); if(window.__ckHide) window.__ckHide(); draw(); };
  document.addEventListener('click',function(e){ var t=e.target; if(root.classList.contains('show')&&t.closest&&t.closest('#homeBtn,#topnav,#storebar,#drw')) root.classList.remove('show'); var gb=document.getElementById('gback'); if(gb&&t.closest&&t.closest('#homeBtn,#storebar,#drw,#topnav button:not(#navAchats)')) gb.style.display='none'; },true);
})();