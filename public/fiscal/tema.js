/* Tema Vyson Fiscal: menu horizontal, barra de acessibilidade, ajuda e Libras em todas as páginas. */
(()=>{const css=`html body:not(.vf-idx){--bg:#f4f6f8;--card:#ffffff;--ink:#0f1d24;--mut:#4f6068;--line:#dfe5ea;--brand:#0b4a5a;--acc2:#fff3e6;--okbg:#e6f6ef;--ok:#0d7a52;--warnbg:#fff4dc;--warn:#8a5a00;--errbg:#fde8e6;--err:#b3261e;--infobg:#fff3e6;--info:#9a4a00;color-scheme:light;background:#f4f6f8!important;color:#0f1d24}
html body:not(.vf-idx) input:not([type=checkbox]):not([type=radio]):not([type=file]),html body:not(.vf-idx) select,html body:not(.vf-idx) textarea{background:#fff!important;color:#0f1d24!important;border:1px solid #b9c7ce!important}
html body:not(.vf-idx) main h1,html body:not(.vf-idx) main h3,html body:not(.vf-idx) main b,html body:not(.vf-idx) main strong,html body:not(.vf-idx) main summary,html body:not(.vf-idx) .wrap>h2{color:inherit}
html body:not(.vf-idx) details>summary{color:#0b4a5a}
.vf-a11y button,.vf-ajuda{padding:0!important;font-family:system-ui,sans-serif!important}.vf-a11y button{background:#0b6b7d!important;color:#fff!important;border-radius:8px 0 0 8px!important}.vf-ajuda{background:#ffc21a!important;color:#111!important;border-radius:50%!important;font-size:26px!important}.vf-modal button{background:#fff!important;color:#0b4a5a!important}
.vf-a11y button svg{width:20px!important;height:20px!important;display:block}
html body:not(.vf-idx) header{background:#ffffff!important;color:#0f1d24!important;border-bottom:1px solid #dfe5ea!important;box-shadow:none!important}
html body:not(.vf-idx) header *{color:inherit}html body:not(.vf-idx) header b,html body:not(.vf-idx) header .brand,html body:not(.vf-idx) header h1 span{color:#ff8000}
html body header .tag{color:#fff!important}
html body.vf-idx{background:#f4f6f8!important}
html body.vf-idx header{background:#fff!important;border-bottom:1px solid #dfe5ea!important;box-shadow:none!important}
html body.vf-idx header,html body.vf-idx header h1,html body.vf-idx header p,html body.vf-idx header small{color:#0f1d24!important}html body.vf-idx header h1 span{color:#ff8000!important}
html body.vf-idx .tour h2,html body.vf-idx .menu h2,html body.vf-idx .tour summary{color:#0b4a5a!important}
html body.vf-idx .tour p,html body.vf-idx .menu p,html body.vf-idx .tour .tb,html body.vf-idx .tour li,html body.vf-idx .menu h3,html body.vf-idx .mg h3,html body.vf-idx footer,html body.vf-idx footer p,html body.vf-idx .wrap>p{color:#33444c!important}
html body.vf-idx .panel,html body.vf-idx .wiz,html body.vf-idx .tour .shot,html body.vf-idx .tile{background:#fff!important;border:1px solid #dfe5ea!important;box-shadow:0 2px 10px rgba(15,29,36,.06)!important;--ink:#0f1d24;--mut:#4f6068;--line:#dfe5ea;color:#0f1d24}
html body.vf-idx .panel :is(.ficha-head b,.pq h3,.chips button,.modo button,.sug button,.wopts button,.legend .modes button,td,th,label,p,li,small,span:not(.al):not(.tag)),html body.vf-idx .tile b,html body.vf-idx .tile small{color:#0f1d24}
html body.vf-idx .panel th{color:#9a4a00}html body.vf-idx .panel .mut,html body.vf-idx .panel small,html body.vf-idx .tile small{color:#4f6068!important}
html body.vf-idx .panel :is(.chips button,.modo button,.sug button,.wopts button,.legend .modes button){background:#f4f6f8!important;border-color:#c9d3d9!important}
html body.vf-idx .panel :is(.modo button.on,.wopts button.on){background:#0b4a5a!important;color:#fff!important}
html body.vf-idx .tile i{background:#0b4a5a!important;color:#fff!important}
html body.vf-idx input:not([type=checkbox]):not([type=radio]):not([type=file]),html body.vf-idx select,html body.vf-idx textarea{background:#fff!important;color:#0f1d24!important;border:1px solid #b9c7ce!important}
html body.vf-idx .tour .shot .k{color:#9a4a00!important}
html body.vf-idx .subnav a{color:#0b4a5a!important;background:#fff!important}
.vf-nav{display:flex;gap:4px;overflow-x:auto;background:#0b4a5a;padding:0 12px;position:sticky;top:0;z-index:50;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
.vf-nav a{color:#e6f1f5;text-decoration:none;font-size:14px;font-weight:600;padding:12px;white-space:nowrap;border-bottom:3px solid transparent}
.vf-nav a:hover,.vf-nav a:focus,.vf-nav a.on{border-bottom-color:#ff8000;color:#fff;outline:none}
.vf-a11y{position:fixed;right:0;top:110px;display:flex;flex-direction:column;gap:4px;z-index:60}
.vf-a11y button{width:42px;height:42px;border:0;border-radius:8px 0 0 8px;background:#0b6b7d;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center}
.vf-a11y button:hover,.vf-a11y button:focus{background:#0e8aa1;outline:2px solid #fff}.vf-a11y svg{width:20px;height:20px}
.vf-ajuda{position:fixed;right:22px;bottom:22px;width:56px;height:56px;border-radius:50%;border:0;background:#ffc21a;color:#111;font-size:26px;font-weight:800;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.35);z-index:60}
.vf-modal{position:fixed;inset:0;background:rgba(0,0,0,.5);display:none;align-items:center;justify-content:center;z-index:70;padding:16px}
.vf-modal.on{display:flex}.vf-modal>div{background:#fff;color:#0f1d24;border-radius:12px;max-width:520px;padding:22px;line-height:1.5;font-family:system-ui,sans-serif}
.vf-modal h2{margin:0 0 8px;color:#0b4a5a}.vf-modal button{margin-top:10px;border:1px solid #0b4a5a;background:#fff;color:#0b4a5a;border-radius:8px;padding:8px 14px;font-weight:600;cursor:pointer}
body.vf-contraste{filter:contrast(1.35)}body.vf-espaco{line-height:1.9!important;letter-spacing:.03em}
@media print{.vf-nav,.vf-a11y,.vf-ajuda,[vw]{display:none!important}}`;
if(document.getElementById("p-guia"))document.body.classList.add("vf-idx");
const st=document.createElement("style");st.textContent=css;document.head.appendChild(st);
const p=location.pathname.replace(/\.html$/,"").replace(/\/$/,"");
const L=[["/fiscal/painel","Início"],["/fiscal/perguntar","Pergunte à IA"],["/fiscal#guia","Ficha do serviço"],["/fiscal#simulador","Simulador"],["/fiscal#auditor","Auditor NFS-e"],["/fiscal/calculadora","Calculadora"],["/fiscal#leis","Legislação"],["/fiscal/novidades","Novidades"]];
const nav=document.createElement("nav");nav.className="vf-nav";nav.setAttribute("aria-label","Menu principal");
nav.innerHTML=L.map(([h,t])=>`<a href="${h}"${h===p?' class="on"':""}>${t}</a>`).join("");
document.body.prepend(nav);
const ic=d=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">${d}</svg>`;
const bar=document.createElement("div");bar.className="vf-a11y";bar.setAttribute("role","toolbar");bar.setAttribute("aria-label","Acessibilidade");
const B=[["mais","Aumentar texto",'<circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5M11 8v6M8 11h6"/>'],["menos","Diminuir texto",'<circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5M8 11h6"/>'],["contraste","Alto contraste",'<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 010 18z" fill="currentColor"/>'],["ler","Ler a página em voz alta",'<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 010 6M19 6a8 8 0 010 12"/>'],["espaco","Espaçamento do texto",'<path d="M4 6h16M4 12h16M4 18h10"/>']];
bar.innerHTML=B.map(([k,t,d])=>`<button type="button" data-a="${k}" title="${t}" aria-label="${t}">${ic(d)}</button>`).join("");
document.body.appendChild(bar);
const ler=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch(e){return d}};
const gravar=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
let z=ler("vf_fonte",100);const ap=()=>{document.body.style.zoom=z/100};if(z!==100)ap();
bar.onclick=e=>{const b=e.target.closest("button");if(!b)return;const a=b.dataset.a;
 if(a==="mais"){z=Math.min(150,z+10);gravar("vf_fonte",z);ap()}
 if(a==="menos"){z=Math.max(80,z-10);gravar("vf_fonte",z);ap()}
 if(a==="contraste")document.body.classList.toggle("vf-contraste");
 if(a==="espaco")document.body.classList.toggle("vf-espaco");
 if(a==="ler"){if(!("speechSynthesis" in window))return alert("Seu navegador não tem leitura em voz alta.");if(speechSynthesis.speaking){speechSynthesis.cancel();return}
  const u=new SpeechSynthesisUtterance((document.querySelector("main")||document.body).innerText.slice(0,4000));u.lang="pt-BR";speechSynthesis.speak(u)}};
const aj=document.createElement("button");aj.className="vf-ajuda";aj.type="button";aj.setAttribute("aria-label","Ajuda");aj.textContent="?";document.body.appendChild(aj);
const m=document.createElement("div");m.className="vf-modal";m.setAttribute("role","dialog");m.setAttribute("aria-modal","true");
m.innerHTML=`<div><h2>Como usar o Vyson Fiscal</h2><p><b>1.</b> Dúvida rápida: <b>Pergunte à IA</b>, com a lei citada.<br><b>2.</b> Serviço completo: <b>Ficha do serviço</b>, com códigos, alíquotas e lei, e salve em PDF.<br><b>3.</b> Valores: <b>Simulador</b> (três regimes) ou <b>Calculadora</b> (índices oficiais).<br><b>4.</b> Conferir nota: <b>Auditor NFS-e</b>.<br><b>5.</b> Leis novas: <b>Novidades</b>, atualizadas pelo agente a cada 6 horas.</p><p>À direita: texto maior e menor, contraste, leitura em voz alta, espaçamento e Libras (mão azul).</p><button type="button">Entendi</button></div>`;
document.body.appendChild(m);aj.onclick=()=>m.classList.add("on");m.onclick=e=>{if(e.target===m||e.target.tagName==="BUTTON")m.classList.remove("on")};
document.addEventListener("keydown",e=>{if(e.key==="Escape")m.classList.remove("on")});
if(!document.querySelector("[vw]")){const w=document.createElement("div");w.setAttribute("vw","");w.className="enabled";w.innerHTML='<div vw-access-button class="active"></div><div vw-plugin-wrapper><div class="vw-plugin-top-wrapper"></div></div>';document.body.appendChild(w);
 const s=document.createElement("script");s.src="https://vlibras.gov.br/app/vlibras-plugin.js";s.onload=()=>{try{new window.VLibras.Widget("https://vlibras.gov.br/app")}catch(e){}};document.body.appendChild(s)}
window.addEventListener("hashchange",()=>{const h=location.hash.slice(1);if(typeof window.open==="function"&&document.getElementById("p-"+h)){try{window.open(h)}catch(e){}}});
})();
