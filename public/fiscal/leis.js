/* Vyson Fiscal — Biblioteca de legislação (leis.json): linha do tempo, filtros, busca e links oficiais.
   Também liga as células "Base legal" da ficha/deduções às fichas das normas (window.leg). */
let LEIS=null,LIDX={};
const TRIB_ORD=["IBS","CBS","ISS","PIS","COFINS","IRPJ","CSLL","INSS","CPP","IRRF","ICMS","IPI","II","IE","IOF","IS","CIDE","todos"];
const APLICA={servico:"Serviço",mercadoria:"Mercadoria",importacao:"Importação",exportacao:"Exportação"};
const lnorm=t=>String(t||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");
const dBR=d=>d?d.split("-").reverse().join("/"):"";

/* resolve "LC 116/2003", "Lei 9.249/1995", "IN RFB 2.110/2022", "Decreto 9.580/2018", "EC 132", "MP 2.158-35", "Tema 1.240", "ADI 4735", "RE 603191", "Resolução CGSN 140" → id em leis.json */
function leiId(tipo,num){
 const n=String(num).replace(/\./g,"").replace(/-.*$/,"");
 const t=lnorm(tipo).replace(/\s+/g," ").trim();
 let id=null;
 if(/^lc$|lei complementar/.test(t))id="lc"+n;
 else if(/^leis?$/.test(t))id="l"+n;
 else if(/^in( rfb| srf)?$/.test(t))id="in"+n;
 else if(/^decreto-?lei$/.test(t))id="dl"+n;
 else if(/^decreto$/.test(t))id="d"+n;
 else if(/^ec$|emenda/.test(t))id="ec"+n;
 else if(/^mp$|medida/.test(t))id="mp"+n;
 else if(/cgsn/.test(t))id="cgsn"+n;
 else if(/tema/.test(t))id="stj"+n;
 else if(/^adi$/.test(t))id="stfadi"+n;
 else if(/^re$/.test(t))id="stf"+n;
 return LIDX[id]?id:null}
const RX_LEI=/\b(Lei Complementar|LC|Leis?|IN RFB|IN SRF|IN|Decreto-Lei|Decreto|EC|MP|Resolução CGSN|Tema|ADI|RE)\s+n?º?\s*([\d.]+(?:-\d+)?)(?:\/(\d{4}))?/g;
/* window.leg(html): envolve citações legais em links para a aba Legislação (não altera o que já é link) */
window.leg=function(h){
 if(!LEIS||!h)return h||"";
 return String(h).split(/(<[^>]+>)/).map(seg=>seg.startsWith("<")?seg:seg.replace(RX_LEI,(m,tipo,num,ano)=>{const id=leiId(tipo,num);return id?`<a href="#leis" class="lref ${LIDX[id].status==="vigente"?"vig":"rev"}" data-lei="${id}" title="${esc(LIDX[id].numero)} · ${esc(LIDX[id].vigencia)} — clique para abrir a norma">${m}</a>`:m})).join("")};
document.addEventListener("click",e=>{const a=e.target.closest("a.lref");if(!a)return;e.preventDefault();openLei(a.dataset.lei)});
function openLei(id){
 if(typeof open==="function")open("leis");
 if($("#wiz")&&!$("#wiz").classList.contains("hide")){$("#wiz").classList.add("hide");$("#wbar").style.display=""}
 const q=$("#lq");if(q)q.value="";LF.trib="";LF.tipo="";LF.apl="";LF.esf="";LF.q="";LF.only=id;renderLeis();
 const card=$("#lei-"+id);if(card){card.scrollIntoView({behavior:"smooth",block:"start"});card.classList.add("hl");setTimeout(()=>card.classList.remove("hl"),2500)}}
window.openLei=openLei;

const LF={q:"",trib:"",tipo:"",apl:"",esf:"",only:""};
const ESF={federal:"Federal",estadual:"Estadual",municipal:"Municipal"};
function filtrar(){
 let L=LEIS.normas.slice();
 if(LF.only)L=L.filter(n=>n.id===LF.only);
 if(LF.trib)L=L.filter(n=>n.tributos.includes(LF.trib)||(LF.trib!=="todos"&&n.tributos.includes("todos")));
 if(LF.tipo)L=L.filter(n=>n.tipo===LF.tipo);
 if(LF.esf)L=L.filter(n=>(n.esfera||"federal")===LF.esf);
 if(LF.apl)L=L.filter(n=>n.aplica.includes(LF.apl));
 if(LF.q){const q=lnorm(LF.q);L=L.filter(n=>lnorm([n.numero,n.ementa,n.temas.join(" "),n.casos.join(" "),n.tributos.join(" "),n.orgao].join(" ")).includes(q))}
 return L.sort((a,b)=>a.data.localeCompare(b.data))}
function cardLei(n){
 const st=n.status==="vigente"?'<span class="pill ok">vigente</span>':`<span class="pill err">${esc(n.status)}</span>`;
 const cf=n.conferir?'<span class="pill warn" title="Link não pôde ser verificado automaticamente; confira na fonte oficial">conferir link</span>':"";
 return`<article class="lei box" id="lei-${n.id}"><div class="lei-top"><div><small><span class="pill ${n.esfera==="municipal"?"warn":n.esfera==="estadual"?"info":"ok"}">${ESF[n.esfera||"federal"]}</span> ${esc(n.tipo)} · ${dBR(n.data)}</small><h3>${esc(n.numero)}</h3></div><div>${st}${cf}</div></div>
 <p class="lei-em">${esc(n.ementa)}</p>
 <div class="kv"><div>Órgão</div><div>${esc(n.orgao)}</div><div>Tributos</div><div>${n.tributos.map(t=>`<button type="button" class="pill info lt" data-t="${esc(t)}">${esc(t)}</button>`).join(" ")}</div><div>Aplica-se a</div><div>${n.aplica.map(a=>APLICA[a]||a).join(" · ")}</div><div>Vigência</div><div>${esc(n.vigencia)}</div>${n.transicao?`<div>Transição</div><div>${esc(n.transicao)}</div>`:""}${n.casos&&n.casos.length?`<div>Casos de uso</div><div><ul class="lei-casos">${n.casos.map(c=>`<li>${esc(c)}</li>`).join("")}</ul></div>`:""}<div>Temas</div><div><small>${n.temas.map(esc).join(" · ")}</small></div></div>
 <p class="lei-link"><a href="${esc(n.link)}" target="_blank" rel="noopener noreferrer">🔗 Texto oficial (${esc(new URL(n.link).hostname.replace(/^www\./,""))})</a></p></article>`}
function renderLeis(){
 const L=filtrar(),out=$("#lout");if(!out)return;
 $("#lcount").textContent=`${L.length} de ${LEIS.normas.length} normas`+(LF.only?` · <a href="#" id="lall">ver todas</a>`:"");
 if(LF.only)$("#lcount").innerHTML=`${L.length} de ${LEIS.normas.length} normas · <a href="#" id="lall">ver todas</a>`;
 if(!L.length){out.innerHTML='<div class="note">Nenhuma norma com esses filtros. Limpe a busca ou troque o tributo.</div>';return}
 // linha do tempo por década/ano
 let H="",ano=null;
 L.forEach(n=>{if(n.ano!==ano){ano=n.ano;H+=`<div class="lei-ano"><span>${ano}</span></div>`}H+=cardLei(n)});
 out.innerHTML=`<div class="timeline">${H}</div>`;
 document.querySelectorAll("#lout .lt").forEach(b=>b.onclick=()=>{LF.only="";LF.trib=b.dataset.t;syncChips();renderLeis()});
 const all=$("#lall");if(all)all.onclick=e=>{e.preventDefault();LF.only="";renderLeis()}}
window.leisFiltro=function(o){if(!LEIS)return;LF.q=o.q||"";LF.trib=o.trib||"";LF.tipo=o.tipo||"";LF.apl=o.apl||"";LF.esf=o.esf||"";LF.only="";const q=$("#lq");if(q)q.value=LF.q;syncChips();renderLeis()};
function syncChips(){document.querySelectorAll("#lfil button").forEach(b=>{const k=b.dataset.f,v=b.dataset.v;b.classList.toggle("on",LF[k]===v)})}
function buildLeis(){
 const p=$("#p-leis");if(!p)return;
 fetch("leis.json").then(r=>r.json()).then(d=>{LEIS=d;d.normas.forEach(n=>LIDX[n.id]=n);
  const tribs=TRIB_ORD.filter(t=>d.normas.some(n=>n.tributos.includes(t)));
  const tipos=[...new Set(d.normas.map(n=>n.tipo))];
  p.innerHTML=`<h2>Legislação tributária federal — linha do tempo</h2>
  <p class="note" style="margin-top:0">${esc(d.aviso)} Atualizado em ${dBR(d.v)}.</p>
  <div class="row"><label style="flex:1;min-width:240px">Buscar na legislação<input id="lq" placeholder="Ex.: retenção INSS, Fator R, exportação, materiais, IBS…" autocomplete="off"></label></div>
  <div id="lfil"><div class="chips"><small>Esfera:</small>${Object.keys(ESF).map(e=>`<button type="button" data-f="esf" data-v="${e}">${ESF[e]}</button>`).join("")}</div><div class="chips"><small>Tributo:</small>${tribs.map(t=>`<button type="button" data-f="trib" data-v="${t}">${t}</button>`).join("")}</div>
  <div class="chips"><small>Aplica-se a:</small>${Object.keys(APLICA).map(a=>`<button type="button" data-f="apl" data-v="${a}">${APLICA[a]}</button>`).join("")}</div>
  <div class="chips"><small>Tipo:</small>${tipos.map(t=>`<button type="button" data-f="tipo" data-v="${esc(t)}">${esc(t)}</button>`).join("")}<button type="button" id="lclear">✕ limpar</button></div></div>
  <p class="note" id="lcount"></p><div id="lout"></div>
  <p class="note">Como usar: clique em qualquer citação legal da ficha (ex.: <b>LC 116/2003</b>) para abrir a norma aqui. Os links levam ao texto oficial (Planalto, Receita Federal, STF/STJ). Normas estaduais e municipais entram na Fase 2.</p>`;
  document.querySelectorAll("#lfil button[data-f]").forEach(b=>b.onclick=()=>{LF.only="";LF[b.dataset.f]=LF[b.dataset.f]===b.dataset.v?"":b.dataset.v;syncChips();renderLeis()});
  $("#lclear").onclick=()=>{LF.q="";LF.trib="";LF.tipo="";LF.apl="";LF.esf="";LF.only="";$("#lq").value="";syncChips();renderLeis()};
  let t=null;$("#lq").addEventListener("input",()=>{clearTimeout(t);t=setTimeout(()=>{LF.only="";LF.q=$("#lq").value.trim();renderLeis()},200)});
  renderLeis();
  const sp=new URLSearchParams(location.search);if(sp.get("lei")&&LIDX[sp.get("lei")])openLei(sp.get("lei"));
  // relinka a ficha já renderizada (se o guia carregou antes)
  if($("#gout")&&$("#gout").innerHTML&&typeof guia==="function")guia();
  if(window.buildSimples)buildSimples();
 }).catch(()=>{p.innerHTML='<div class="note">Não foi possível carregar a legislação (leis.json).</div>'})}
window.buildLeis=buildLeis;
