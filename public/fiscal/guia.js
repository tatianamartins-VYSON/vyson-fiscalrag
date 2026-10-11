/* Vyson Fiscal · Guia Tributário por Serviço
   Depende das globais de index.html: D, $, fmt, pct, esc, sub, fmtC, ct, cclOpts, red, redNum,
   presuncao, issBase, issAliq, locISS, LOCI, RESP, ATEN, nbsList, nbsF, dd.
   Fontes: LC 116/2003; LC 123/2006 (art. 18 e Anexos III, IV e V); Lei 9.249/1995; Leis 9.718/1998,
   10.637/2002, 10.833/2003 e 10.865/2004; LC 214/2025; leiaute NFS-e Nacional (Anexo VIII). */
"use strict";

/* ---------- Simples Nacional: tabelas (LC 123, art. 18, Anexos III, IV e V) ---------- */
// faixas: [teto RBT12, alíquota nominal, parcela a deduzir]
const SN = {
 III:{nome:"Anexo III",fx:[[180000,.06,0],[360000,.112,9360],[720000,.135,17640],[1800000,.16,35640],[3600000,.21,125640],[4800000,.33,648000]],
  // repartição % por faixa: IRPJ, CSLL, COFINS, PIS, CPP, ISS
  rep:[[4,3.5,12.82,2.78,43.4,33.5],[4,3.5,14.05,3.05,43.4,32],[4,3.5,13.64,2.96,43.4,32.5],[4,3.5,13.64,2.96,43.4,32.5],[4,3.5,12.82,2.78,43.4,33.5],[35,15,16.03,3.47,30.5,0]]},
 IV:{nome:"Anexo IV",fx:[[180000,.045,0],[360000,.09,8100],[720000,.102,12420],[1800000,.14,39780],[3600000,.22,183780],[4800000,.33,828000]],
  rep:[[18.8,15.2,17.67,3.83,0,44.5],[19.8,15.2,20.55,4.45,0,40],[20.8,15.2,19.73,4.27,0,40],[17.8,19.2,18.9,4.1,0,40],[18.8,19.2,18.08,3.92,0,40],[53.5,21.5,20.55,4.45,0,0]]},
 V:{nome:"Anexo V",fx:[[180000,.155,0],[360000,.18,4500],[720000,.195,9900],[1800000,.205,17100],[3600000,.23,62100],[4800000,.305,540000]],
  rep:[[25,15,14.1,3.05,28.85,14],[23,15,14.1,3.05,27.85,17],[24,15,14.92,3.23,23.85,19],[21,15,15.74,3.41,23.85,21],[23,12.5,14.1,3.05,23.85,23.5],[35,15.5,16.44,3.56,29.5,0]]}
};
const TRIB_SN=["IRPJ","CSLL","COFINS","PIS","CPP","ISS"];
// Anexos I (comércio) e II (indústria) — só para a aba "Simples Nacional" (serviços usam III, IV e V)
const SN_CI={
 I:{nome:"Anexo I — Comércio",trib:["IRPJ","CSLL","COFINS","PIS","CPP","ICMS"],fx:[[180000,.04,0],[360000,.073,5940],[720000,.095,13860],[1800000,.107,22500],[3600000,.143,87300],[4800000,.19,378000]],
  rep:[[5.5,3.5,12.74,2.76,41.5,34],[5.5,3.5,12.74,2.76,41.5,34],[5.5,3.5,12.74,2.76,42,33.5],[5.5,3.5,12.74,2.76,42,33.5],[5.5,3.5,12.74,2.76,42,33.5],[13.5,10,28.27,6.13,42,0]]},
 II:{nome:"Anexo II — Indústria",trib:["IRPJ","CSLL","COFINS","PIS","CPP","IPI","ICMS"],fx:[[180000,.045,0],[360000,.078,5940],[720000,.10,13860],[1800000,.112,22500],[3600000,.147,85500],[4800000,.30,720000]],
  rep:[[5.5,3.5,11.51,2.49,37.5,7.5,32],[5.5,3.5,11.51,2.49,37.5,7.5,32],[5.5,3.5,11.51,2.49,37.5,7.5,32],[5.5,3.5,11.51,2.49,37.5,7.5,32],[5.5,3.5,11.51,2.49,37.5,7.5,32],[8.5,7.5,20.96,4.54,23.5,35,0]]}};

// Enquadramento por subitem/item da LC 116 (LC 123, art. 18, §§ 5º-B a 5º-M).
// IV = Anexo IV fixo (sem CPP no DAS); R = sujeito ao Fator R (≥28% → III, <28% → V); III = Anexo III; X = vedado ao Simples
const ANEXO_SUB={"07.02":"IV","07.04":"IV","07.05":"IV","07.10":"IV","07.11":"IV","11.02":"IV","17.14":"IV",
 "06.04":"R","07.01":"R","07.03":"R","07.19":"R","07.20":"R","17.19":"III","17.05":"X","04.22":"X","04.23":"X","15.01":"X"};
const ANEXO_ITEM={"01":"R","02":"R","04":"R","05":"R","10":"R","17":"R","18":"R","23":"R","28":"R","29":"R","30":"R","32":"R","33":"R","35":"R","36":"R","38":"R","15":"X","21":"X"};
const BASE_SN={IV:"LC 123, art. 18, §5º-C (construção de imóveis e obras de engenharia, paisagismo e decoração; vigilância, limpeza e conservação; advocacia). CPP recolhida por fora, como as demais empresas (art. 13, VI).",
 R:"LC 123, art. 18, §§5º-I, 5º-J e 5º-M: serviços de natureza intelectual, técnica e profissional. Fator R (folha ÷ receita, 12 meses) ≥ 28% → Anexo III; abaixo → Anexo V.",
 III:"LC 123, art. 18, §§5º-B, 5º-D a 5º-F: Anexo III (CPP incluída no DAS).",
 X:"Atividade vedada ao Simples Nacional (LC 123, art. 17: cessão/locação de mão de obra, atividade financeira, cartórios etc.). Validar o CNAE antes de optar."};
function anexoDe(s){return ANEXO_SUB[s]||ANEXO_ITEM[s.slice(0,2)]||"III"}
function faixa(t,rbt){const f=t.fx;let i=f.findIndex(x=>rbt<=x[0]);if(i<0)i=5;return i}
function simples(an,rbt,V,exp,fatorR){
 const t=SN[an],i=faixa(t,Math.max(rbt,1)),[,nom,pd]=t.fx[i];
 const R=rbt>0?rbt:180000; // sem histórico: 1ª faixa (art. 18, §2º — proporcionalizar nos primeiros meses)
 let ef=(R*nom-pd)/R;if(ef<0)ef=0;
 let rep=t.rep[i].map(x=>x/100);
 // ISS limitado a 5% (LC 123, art. 18, §1º-A): excesso redistribuído proporcionalmente
 let issEf=ef*rep[5],ajuste="";
 if(issEf>.05&&rep[5]>0){const exc=issEf-.05,outros=1-rep[5];rep=rep.map((x,k)=>k===5?.05/ef:x+exc/ef*(x/outros));ajuste=" (ISS limitado a 5%, excesso redistribuído — art. 18, §1º-A)"}
 const linhas=TRIB_SN.map((n,k)=>{let v=V*ef*rep[k];if(exp&&(n==="COFINS"||n==="PIS"||n==="ISS"))v=0;return[n,ef*rep[k],v]});
 const tot=linhas.reduce((a,l)=>a+l[2],0);
 // Anexo IV: CPP 20% + RAT (~2%) por fora, sobre a folha proporcional
 const cppFora=an==="IV"?V*fatorR*.22:0;
 return{an,i,nom,pd,ef,rep,linhas,tot,cppFora,ajuste,acima:rbt>4800000,sublimite:rbt>3600000}
}

/* ---------- Lucro Presumido e Lucro Real ---------- */
const ENC_FOLHA=.278; // CPP 20% + RAT 2% + terceiros 5,8% (editável)
function presumido(s,V,M,iss,exp,fatorR,obra,enc){
 const pr=obra?{i:.08,c:.12}:presuncao(s);
 const ded=(s==="07.02"||s==="07.05")?M:0,bIss=V-ded;
 const vIss=exp?0:bIss*iss,pis=exp?0:V*.0065,cof=exp?0:V*.03;
 const bI=V*pr.i,irpj=bI*.15,adic=Math.max(0,bI-20000)*.10,csll=V*pr.c*.09,folha=V*fatorR*enc;
 const L=[["ISS"+(ded?" (base sem materiais)":""),bIss,iss,vIss],["PIS cumulativo",V,.0065,pis],["COFINS cumulativa",V,.03,cof],[`IRPJ 15% × presunção ${pct(pr.i)}`,bI,pr.i*.15,irpj],["Adicional IRPJ 10% (base > R$ 20 mil/mês)",Math.max(0,bI-20000),.10,adic],[`CSLL 9% × presunção ${pct(pr.c)}`,V*pr.c,pr.c*.09,csll]];
 if(folha)L.push([`Encargos sobre a folha (${pct(enc)})`,V*fatorR,enc,folha]);
 return{L,tot:L.reduce((a,l)=>a+l[3],0),pr}
}
function real(s,V,M,iss,exp,fatorR,margem,enc){
 const ded=(s==="07.02"||s==="07.05")?M:0,bIss=V-ded;
 const vIss=exp?0:bIss*iss,pisD=exp?0:V*.0165,cofD=exp?0:V*.076,cred=M*.0925;
 const lucro=Math.max(0,V*margem),irpj=lucro*.15,adic=Math.max(0,lucro-20000)*.10,csll=lucro*.09,folha=V*fatorR*enc;
 const L=[["ISS"+(ded?" (base sem materiais)":""),bIss,iss,vIss],["PIS não cumulativo",V,.0165,pisD],["COFINS não cumulativa",V,.076,cofD],["(−) Crédito PIS/COFINS sobre insumos/materiais (9,25%)",M,.0925,-Math.min(cred,pisD+cofD)],[`IRPJ 15% sobre lucro (margem ${pct(margem)})`,lucro,.15,irpj],["Adicional IRPJ 10% (lucro > R$ 20 mil/mês)",Math.max(0,lucro-20000),.10,adic],["CSLL 9% sobre lucro",lucro,.09,csll]];
 if(folha)L.push([`Encargos sobre a folha (${pct(enc)})`,V*fatorR,enc,folha]);
 return{L,tot:L.reduce((a,l)=>a+l[3],0)}
}

/* ---------- textos: operação, benefícios, base legal ---------- */
function opTexto(op,s,r){
 if(op==="exp")return[["ISS","Não incide sobre a exportação de serviços (LC 116, art. 2º, I). Exceção: serviço desenvolvido no Brasil cujo resultado aqui se verifique (parágrafo único) — tema de litígio; documentar o resultado no exterior."],
  ["PIS/COFINS","Não incidem sobre receita de exportação de serviços com ingresso de divisas (MP 2.158-35, art. 14, III e §1º; Lei 10.637, art. 5º, II; Lei 10.833, art. 6º, II). No Lucro Real o crédito dos insumos é mantido e pode ser compensado/ressarcido (art. 6º, §1º)."],
  ["Simples Nacional","Receita de exportação segregada no PGDAS-D: paga só IRPJ, CSLL e CPP; fica livre de PIS, COFINS e ISS (LC 123, art. 18, §14)."],
  ["IBS/CBS","Exportação imune (LC 214, art. 8º), com manutenção e ressarcimento dos créditos. Comprovar o adquirente no exterior e o pagamento em moeda estrangeira ou conta de não residente."],
  ["IRPJ/CSLL","Incidem normalmente (presunção ou lucro). Verificar tratado contra bitributação e eventual IR retido no exterior compensável (Lei 9.249, art. 26)."],
  ["NFS-e Nacional","Emitir com cLocPrestacao do exterior, indicador de exportação e tomador estrangeiro (NIF). Informar cIndOp conforme Anexo VIII."]];
 if(op==="imp")return[["ISS","Serviço proveniente do exterior ou iniciado no exterior: ISS devido no município do tomador, que é o responsável (LC 116, art. 1º, §1º; art. 3º, I; art. 6º, §2º, I). Alíquota do município do tomador."],
  ["PIS/COFINS-Importação","1,65% e 7,6% sobre o valor pago, antes do IRRF, acrescido do ISS e das próprias contribuições (Lei 10.865, arts. 1º, 7º, II e 8º, II). Gera crédito no Lucro Real (art. 15)."],
  ["IRRF","15% sobre a remessa (25% se beneficiário em país de tributação favorecida) — Lei 9.779, art. 7º; RIR/2018. Serviços técnicos: verificar tratado e a Instrução Normativa 1.455/2014."],
  ["CIDE-Remessas","10% quando há transferência de tecnologia, assistência técnica, serviços técnicos ou royalties (Lei 10.168, art. 2º, §2º)."],
  ["IOF-Câmbio","0,38% sobre a remessa (Decreto 6.306, art. 15-B)."],
  ["IBS/CBS","Incidem na importação de serviços; contribuinte é o adquirente no Brasil quando o fornecedor não está inscrito (LC 214, regras de importação). O valor pago gera crédito ao contribuinte do regime regular."],
  ["Simples Nacional","Optante também paga ISS, PIS/COFINS-Importação e IRRF na importação (LC 123, art. 13, §1º, XI a XIII), fora do DAS."]];
 return[["ISS",`Local de incidência: ${locISS(r[2])} (LC 116, art. 3º). Alíquota: ${issAliq(s)} Base: ${issBase(s)}`],
  ["Responsabilidade",RESP.has(s)?"Tomador PJ responsável pela retenção do ISS (LC 116, art. 6º, §2º, II). Emitir a NFS-e com tpRetISSQN = retido.":"Sem responsabilidade pela LC 116; a lei municipal do tomador pode prever retenção (art. 6º, caput)."],
  ["IRRF/CSRF (tomador PJ)","Serviços profissionais (Decreto 9.580/2018, art. 714) ou limpeza/conservação/segurança/locação de mão de obra (art. 716): IRRF 1,5% ou 1%; CSRF 4,65% (Lei 10.833, art. 30) acima de R$ 215,05. Optante do Simples: dispensa de CSRF (IN 459, art. 3º, II) e de IRRF."],
  ["IBS/CBS",`Local de incidência: ${LOCI[r[5]]||"—"} (LC 214, art. 11). Em 2026, CBS 0,9% e IBS 0,1% de teste, compensáveis com PIS/COFINS (arts. 343, 346 e 348).`]];
}
function beneficios(s,r,o,an,fatorR,M){
 const B=[];
 o.forEach(c=>{const rd=redNum(c);if(rd>0)B.push(["Redução de alíquota IBS/CBS",`cClassTrib ${c}: ${red(c)} — ${(D.cls[c]||[""])[0]}. ${ATEN[c]||""}`])});
 if(s==="07.02"||s==="07.05")B.push(["Dedução de materiais na base do ISS",`Materiais fornecidos pelo prestador e incorporados à obra saem da base do ISS (LC 116, art. 7º, §2º, I). ${M?`Hoje: ${fmt(M)} fora da base.`:"Informe o valor dos materiais para ver o efeito."} Exige nota fiscal dos materiais vinculada à obra.`]);
 if(s==="07.02")B.push(["Presunção reduzida no Lucro Presumido","Empreitada com fornecimento de TODOS os materiais: IRPJ 8% e CSLL 12% em vez de 32% (Lei 9.249, art. 15, §1º, III, 'b' e art. 20; IN 1.700, art. 33). Sem materiais ou só parte: 32%."]);
 if(s.startsWith("04."))B.push(["Presunção reduzida (serviços hospitalares)","Serviços hospitalares e de auxílio diagnóstico/terapia prestados por sociedade empresária com normas da ANVISA: IRPJ 8% e CSLL 12% (Lei 9.249, art. 15, §1º, III, 'a'; STJ, Tema 217)."]);
 if(an==="R")B.push(["Fator R",`Com folha ≥ 28% da receita o serviço vai ao Anexo III (até ~6%) em vez do Anexo V (a partir de 15,5%). Hoje: ${pct(fatorR)}. Pró-labore, 13º, FGTS e CPP entram no cálculo (LC 123, art. 18, §24).`]);
 if(an==="IV")B.push(["Anexo IV sem CPP no DAS","A alíquota do Anexo IV é menor porque a CPP (20% + RAT) é paga por fora; sem folha, o Anexo IV costuma ser o mais barato dos três."]);
 B.push(["Crédito de IBS/CBS para o tomador","No regime regular o tomador contribuinte credita o IBS/CBS destacado (LC 214, art. 28). Optante do Simples pode optar por apurar IBS/CBS pelo regime regular para transferir crédito integral ao cliente B2B (art. 41) — decisivo em contratos com empresas e governo."]);
 if(["07.02","07.04","07.05"].includes(s))B.push(["Trava de crédito (obras)","Serviço de construção para não contribuinte: crédito do material limitado ao débito da operação (LC 214, art. 255, §5º); não se aplica a obras para a administração pública (§6º). Apuração por obra com CIB (arts. 269 e 270)."]);
 B.push(["Compensação PIS/COFINS → CBS 2026","Valores de CBS e IBS de teste pagos em 2026 compensam PIS/COFINS do período; cumpridas as obrigações acessórias, o recolhimento é dispensado (LC 214, art. 348, §1º)."]);
 return B}
function baseLegal(s,r,an,o){
 const L=[["LC 116/2003",`Item ${s} da lista anexa (${esc(dd(r[1]).slice(0,80))}). Art. 3º (local), art. 6º (responsabilidade), art. 7º (base), arts. 8º e 8º-A (alíquotas 2% a 5%).`],
  ["LC 123/2006 (Simples Nacional)",BASE_SN[an]],
  ["Lei 9.249/1995",`Art. 15 (presunção IRPJ ${pct(presuncao(s).i)}) e art. 20 (CSLL ${pct(presuncao(s).c)}) para o Lucro Presumido; Lei 9.430/1996, art. 25.`],
  ["PIS/COFINS","Lei 9.718/1998 (cumulativo 0,65% e 3%); Leis 10.637/2002 e 10.833/2003 (não cumulativo 1,65% e 7,6%, art. 3º créditos); Lei 10.865/2004 (importação)."],
  ["LC 214/2025 (IBS e CBS)",`Arts. 1º a 11 (incidência e local), art. 28 (crédito), art. 41 (Simples), arts. 343 a 348 (transição 2026). cClassTrib: ${o.join(", ")||"não listado"}.`],
  ["NFS-e Nacional","Leiaute DPS/NFS-e e Anexo VIII (cTribNac, cNBS, cIndOp, CST e cClassTrib); Anexo VI (NBS); Anexo B."],
  ["Retenções federais","Decreto 9.580/2018 (RIR), arts. 714 a 716; Lei 10.833/2003, art. 30 (CSRF); IN RFB 459/2004."]];
 return L}

const LG=h=>window.leg?window.leg(h):h;
/* ---------- ISS de Maceió (lista oficial GISS Online) ---------- */
window.MAC=null;window.MUN={};
const UFS={AC:"Acre",AL:"Alagoas",AP:"Amapá",AM:"Amazonas",BA:"Bahia",CE:"Ceará",DF:"Distrito Federal",ES:"Espírito Santo",GO:"Goiás",MA:"Maranhão",MT:"Mato Grosso",MS:"Mato Grosso do Sul",MG:"Minas Gerais",PA:"Pará",PB:"Paraíba",PR:"Paraná",PE:"Pernambuco",PI:"Piauí",RJ:"Rio de Janeiro",RN:"Rio Grande do Norte",RS:"Rio Grande do Sul",RO:"Rondônia",RR:"Roraima",SC:"Santa Catarina",SP:"São Paulo",SE:"Sergipe",TO:"Tocantins"};
/* municípios com lista oficial de ISS carregada (um arquivo por município; os demais usam alíquota informada) */
const MUNIS=[{uf:"AL",id:"mcz",nome:"Maceió",arq:"maceio.json"},{uf:"SP",id:"sp",nome:"São Paulo",arq:"saopaulo.json"}];
const munAtual=()=>{const g=$("#gmu");return g&&g.value&&g.value!=="out"?window.MUN[g.value]||null:null};
function munLoad(id,cb){const m=MUNIS.find(x=>x.id===id);if(!m)return;if(window.MUN[id]){cb&&cb();return}fetch(m.arq).then(r=>r.json()).then(d=>{window.MUN[id]=d;if(id==="mcz")window.MAC=d;cb&&cb()}).catch(()=>{})}
function munisDe(uf){return MUNIS.filter(m=>m.uf===uf)}
const macOpts=s=>{const M=munAtual();if(!M)return[];const k=String(s).replace(/^0/,"");
 if(M.itens){const L=M.itens.filter(x=>x.i===k&&!x.fim);if(L.length||!M.regras)return L}
 if(M.regras){const it=k.split(".")[0];const r=M.regras.find(g=>g.sub.some(x=>x===k||x===it+".*"));const nota=M.notas&&M.notas[k];return[{c:"—",i:k,d:(r?r.d:"Art. 18, III: demais serviços da lista")+(nota?" · "+nota:""),a:r?r.a:M.padrao,ini:M.ini,nota:!!nota}]}
 return[]};
function macBloco(s,mrow){
 const M=munAtual();if(!M)return"";const L=macOpts(s),nomeM=M.municipio||"Maceió/AL";
 if(!L.length)return`<div class="box ficha"><h3>ISS em ${esc(nomeM)} · item ${s}</h3><p class="note">A lista municipal de ${esc(nomeM)} não traz código específico para o subitem ${s}. Use o código do item mais próximo no emissor da prefeitura ou confirme com a secretaria de finanças. Fonte: ${esc(M.fonte)}.</p></div>`;
 return`<div class="box ficha"><h3>ISS em ${esc(nomeM)} · ${M.itens?"códigos municipais do item":"alíquota do item"} ${s}</h3><p class="sub" style="margin:0 0 8px">${M.itens?"Alíquota vigente por código de atividade da prefeitura. O código municipal entra na NFS-e junto com o cTribNac.":"Alíquota por subitem conforme o regulamento municipal (art. 18 do RISS); este subitem não tem código próprio na tabela da IN SF/SUREM 08/2011."}</p>
 <div class="scroll"><table class="cmp ft"><thead><tr><th>Código municipal</th><th>Descrição na lista de ${esc(nomeM)}</th>${L.some(x=>x.nat)?"<th>Prestador</th>":""}<th class="n">Alíquota ISS</th><th>Vigência</th></tr></thead><tbody>${L.map(x=>`<tr${mrow&&x.c===mrow.c?' class="tot"':''}><td><b>${esc(x.c)}</b>${x.isp&&x.isp!==x.i?`<br><small>item SP ${esc(x.isp)}</small>`:""}</td><td>${esc(x.d)}${x.nota?`<br><small>${esc(x.nota)}</small>`:""}</td>${L.some(y=>y.nat)?`<td>${x.nat==="PF"?"Autônomo (PF)":x.nat==="PJ"?"Empresa (PJ)":"—"}</td>`:""}<td class="n"><span class="al">${String(x.a.toFixed(2)).replace(".",",")}%</span></td><td><small>desde ${esc(x.ini)}</small></td></tr>`).join("")}</tbody></table></div>
 <p class="note">Fonte: ${esc(M.fonte)}. Base legal: LC 116/2003, arts. 8º e 8º-A (piso 2%, teto 5%)${/São Paulo/.test(nomeM)?"; Decreto 53.151/2012, arts. 18 e 19; IN SF/SUREM 08/2011 (tabela de códigos)":M.itens?"; Código Tributário de Maceió e lei municipal do ISS (conferir no portal da prefeitura)":"; lei municipal do ISS"}.</p></div>`}
const macScore=x=>(x.nat==="PF"?0:4)+(/Exclusivo|Copa do Mundo|autônomo|Habite-se/i.test(x.d)?0:2)+(x.nota?0:1)+Math.min(1,x.d.length/400);
const macDef=L=>L.reduce((a,x)=>!a||macScore(x)>macScore(a)?x:a,null);
function macFill(s){const sel=$("#gmc");if(!sel)return;const L=macOpts(s),df=macDef(L);sel.innerHTML=L.length?L.map(x=>`<option value="${x.c}"${df&&x.c===df.c?" selected":""}>${x.c} · ${String(x.a.toFixed(2)).replace(".",",")}%${x.nat?" · "+x.nat:""} · ${esc(x.d.slice(0,60))}</option>`).join(""):'<option value="">sem código específico em Maceió</option>';sel.disabled=!L.length}
/* ---------- busca inteligente por atividade ---------- */
const SINONIMOS={"construcao civil":"0702","construcao":"0702","obra":"0702","empreitada":"0702","reforma":"0705","demolicao":"0704","engenharia":"0703","projeto":"0703","arquitetura":"0703","topografia":"0720","fiscalizacao de obra":"0719","limpeza":"0710","conservacao":"0710","dedetizacao":"0713","jardinagem":"0711","paisagismo":"0711","decoracao":"0711","vigilancia":"1102","seguranca":"1102","portaria":"1102","estacionamento":"1101","guarda":"1104","armazenamento":"1104","software":"0105","programa de computador":"0105","desenvolvimento de sistemas":"0101","sistemas":"0101","ti":"0107","suporte tecnico":"0107","informatica":"0107","hospedagem de site":"0103","site":"0108","paginas eletronicas":"0108","saas":"0105","licenciamento":"0105","consultoria":"1701","assessoria":"1701","gestao":"1701","contabilidade":"1719","contador":"1719","auditoria":"1719","advocacia":"1714","advogado":"1714","juridico":"1714","pericia":"1709","perito":"1709","traducao":"1702","rh":"1704","recrutamento":"1704","selecao de pessoal":"1704","mao de obra":"1705","terceirizacao":"1705","publicidade":"1706","propaganda":"1706","marketing":"1706","franquia":"1708","eventos":"1710","festas":"1710","organizacao de eventos":"1710","administracao de imoveis":"1712","condominio":"1712","leilao":"1713","cobranca":"1722","medicina":"0401","medico":"0401","clinica":"0401","consulta medica":"0401","hospital":"0403","laboratorio":"0402","exames":"0402","enfermagem":"0406","fisioterapia":"0408","terapia":"0408","dentista":"0412","odontologia":"0412","psicologia":"0416","psicologo":"0416","nutricao":"0401","veterinario":"0501","veterinaria":"0501","pet":"0502","estetica":"0601","salao":"0601","cabeleireiro":"0601","barbearia":"0601","manicure":"0601","academia":"0604","personal":"0604","ginastica":"0604","massagem":"0602","spa":"0602","educacao":"0801","escola":"0801","ensino":"0801","faculdade":"0801","curso":"0802","treinamento":"0802","idiomas":"0802","hotel":"0901","hospedagem":"0901","pousada":"0901","turismo":"0902","agencia de viagem":"0902","guia de turismo":"0903","corretagem":"1005","corretor de imoveis":"1005","imobiliaria":"1005","representacao comercial":"1009","agenciamento":"1009","seguros":"1001","show":"1207","musica":"1207","teatro":"1201","cinema":"1202","buffet":"1708","fotografia":"1304","foto":"1304","video":"1303","filmagem":"1303","manutencao":"1401","reparo":"1401","conserto":"1401","ar condicionado":"1401","assistencia tecnica":"1401","instalacao":"1406","montagem":"1406","mecanica":"1401","oficina":"1401","lavagem de carro":"1403","funilaria":"1405","transporte":"1601","taxi":"1601","aplicativo de transporte":"1601","frete municipal":"1602","motoboy":"2601","entrega":"2601","courier":"2601","despachante":"3301","desembaraco":"3301","jornalismo":"3501","assessoria de imprensa":"3501","design":"2301","programacao visual":"2301","chaveiro":"2401","funeraria":"2501","cemiterio":"2501","consultoria ambiental":"0712","licenciamento ambiental":"0712","saneamento":"0712","meteorologia":"3601","investigacao":"3401","detetive":"3401","biologia":"3001","biblioteca":"2901","museu":"3801","avaliacao de bens":"2801","desenho tecnico":"3201","artista":"3701","ourives":"3901","obra de arte":"4001","bancos":"1501","cartorio":"2101","pedagio":"2201","porto":"2001","loterica":"1901","agencia loterica":"1901","beneficiamento":"1405","grafica":"1313","impressao":"1313","serigrafia":"1313","leasing":"1509","locacao":"0301","aluguel":"0301"};
const norm=t=>String(t||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9 ]/g," ").replace(/\s+/g," ").trim();
function buscar(q){
 const n=norm(q);if(!n)return[];const dig=n.replace(/\s/g,"");
 if(/^\d{6}$/.test(dig)&&ct(dig))return[ct(dig)];
 const hits=new Map();
 // 1. sinônimos (frase inteira e cada palavra)
 const subs=new Set();Object.keys(SINONIMOS).forEach(k=>{if(n.includes(k))subs.add(SINONIMOS[k])});
 n.split(" ").forEach(w=>{if(w.length>3&&SINONIMOS[w])subs.add(SINONIMOS[w])});
 subs.forEach(sub=>D.ct.filter(x=>x[0].startsWith(sub)).forEach(x=>hits.set(x[0],3)));
 // 2. descrição do serviço e nome do item
 D.ct.forEach(x=>{const d=norm(dd(x[1]))+" "+norm(D.items[x[0].slice(0,2)]);const words=n.split(" ").filter(w=>w.length>2);const sc=words.filter(w=>d.includes(w)).length;if(sc&&sc>=Math.min(words.length,2))hits.set(x[0],(hits.get(x[0])||0)+sc)});
 return[...hits].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,12).map(h=>ct(h[0]))}

/* ---------- ficha tributária unificada ---------- */
function ficha(cod,r,s,ctx){
 const{V,M,iss,exp,imp,an,anCat,fatorR,snR,lpR,lrR,ccl,rd,o,ind,nb,pr,enc,temFolha}=ctx;
 const pf=v=>pct(v),money=v=>fmt(v);const FICHA=window.MODO!=="sim";
 const celF=(aliq,obs)=>`<span class="al">${aliq}</span>${obs?`<span class="ex">${obs}</span>`:""}`;
 const snF=(n)=>{if(anCat==="X")return'<span class="pill err">vedado</span>';const nomes=anCat==="R"?["III","V"]:[an];return nomes.map(a=>{const t=SN[a],i=TRIB_SN.indexOf(n);const sh=t.rep[0][i];return celF(`${t.nome}: ${pf(t.fx[0][1])} a ${pf(t.fx[4][1])}`,sh?`parcela do ${n} no DAS: ${sh}% (1ª faixa)`:"fora do DAS")}).join("")};
 const cel=(aliq,val,extra)=>`<span class="al">${aliq}</span><span class="vl">${val}</span>${extra?`<span class="ex">${extra}</span>`:""}`;
 const NA=`<span class="na">não incide</span>`;
 const snCel=(n)=>{if(anCat==="X")return'<span class="pill err">vedado</span>';if(!snR)return"—";const l=snR.linhas.find(x=>x[0]===n);if(!l)return"—";if(exp&&l[2]===0)return NA;return cel(pf(l[1]),money(l[2]))};
 const ded72=(s==="07.02"||s==="07.05");
 const cst=o[0]?o[0].slice(0,3):"000";
 const rows=[
  ["ISS",`tribISSQN ${exp?"3 (exportação)":"1 (tributável)"} · tpRetISSQN ${RESP.has(s)?"2 (retido)":"1 (não retido)"}`,snCel("ISS"),exp?NA:cel(pf(iss),money(lpR.L[0][3])),exp?NA:cel(pf(iss),money(lrR.L[0][3])),ded72?`<b>Dedução de materiais</b> incorporados à obra (LC 116, art. 7º, §2º, I)${M?` — ${money(M)} fora da base`:""}`:"Base = preço do serviço, sem dedução",`LC 116/2003, item ${s}; arts. 3º, 6º, 7º, 8º-A`],
  ["PIS",`CST ${exp?"08 (sem incidência)":"01"} · Simples: CST 49`,snCel("PIS"),exp?NA:cel("0,65%",money(lpR.L[1][3])),exp?NA:cel("1,65%",money(lrR.L[1][3]),"com crédito"),"LR: crédito 1,65% sobre insumos, energia, aluguel, depreciação (Lei 10.637, art. 3º). LP: sem crédito.","Lei 9.718/1998; Lei 10.637/2002; MP 2.158-35 (exportação)"],
  ["COFINS",`CST ${exp?"08 (sem incidência)":"01"} · Simples: CST 49`,snCel("COFINS"),exp?NA:cel("3,00%",money(lpR.L[2][3])),exp?NA:cel("7,60%",money(lrR.L[2][3]),"com crédito"),"LR: crédito 7,6% sobre insumos (Lei 10.833, art. 3º). Exportação com ingresso de divisas: não incide.","Lei 9.718/1998; Lei 10.833/2003, arts. 3º e 6º"],
  ["IRPJ",`Presunção ${pf(pr.i)}${pr.i<.32?" (reduzida)":""}`,snCel("IRPJ"),cel(pf(pr.i*.15),money(lpR.L[3][3]),`15% × ${pf(pr.i)}`),cel("15% + 10%",money(lrR.L[4][3]+lrR.L[5][3]),"sobre o lucro"),s==="07.02"?"Obra com fornecimento de TODOS os materiais: presunção 8% (Lei 9.249, art. 15, §1º, III, b)":s.startsWith("04.")?"Serviço hospitalar/diagnóstico com normas ANVISA: presunção 8% (STJ Tema 217)":"Adicional de 10% sobre a parcela do lucro/base acima de R$ 20 mil/mês","Lei 9.249/1995, art. 15; Lei 9.430/1996, art. 25"],
  ["CSLL",`Presunção ${pf(pr.c)}`,snCel("CSLL"),cel(pf(pr.c*.09),money(lpR.L[5][3]),`9% × ${pf(pr.c)}`),cel("9%",money(lrR.L[6][3]),"sobre o lucro"),s==="07.02"?"Obra com todos os materiais: presunção 12% (Lei 9.249, art. 20)":"—","Lei 9.249/1995, art. 20; Lei 7.689/1988"],
  ["INSS patronal (CPP)",temFolha?`Folha ${pf(fatorR)} da receita`:"Sem folha",anCat==="X"?'<span class="pill err">vedado</span>':an==="IV"?cel("20% + RAT",money(snR?snR.cppFora:0),"fora do DAS"):snCel("CPP")+'<span class="ex">dentro do DAS</span>',temFolha?cel(pf(enc),money(V*fatorR*enc),"sobre a folha"):"—",temFolha?cel(pf(enc),money(V*fatorR*enc),"sobre a folha"):"—",anCat==="R"?`<b>Fator R</b>: folha ≥ 28% leva ao Anexo III (hoje ${pf(fatorR)})`:an==="IV"?"Anexo IV: CPP por fora, sem terceiros (art. 13, §3º)":"Simples: CPP embutida no DAS (art. 13, VI)","LC 123/2006, arts. 13 e 18; Lei 8.212/1991, art. 22"],
  ["CBS",`CST ${cst} · cClassTrib ${ccl}`,cel(pf(.009*(1-rd)),money(V*.009*(1-rd)),"2026, teste"),cel(pf(.009*(1-rd)),money(V*.009*(1-rd)),"2026, teste"),cel(pf(.009*(1-rd)),money(V*.009*(1-rd)),"2026, teste"),rd>0?`<b>Redução de ${pf(rd)}</b> — ${(D.cls[ccl]||[""])[0]}`:"Sem redução (alíquota integral)",`LC 214/2025, arts. 343 a 348 (2026); ${ATEN[ccl]?"art. 127 / 252":"art. 28 (crédito)"}`],
  ["IBS",`CST ${cst} · cClassTrib ${ccl}`,cel(pf(.001*(1-rd)),money(V*.001*(1-rd)),"2026, teste"),cel(pf(.001*(1-rd)),money(V*.001*(1-rd)),"2026, teste"),cel(pf(.001*(1-rd)),money(V*.001*(1-rd)),"2026, teste"),exp?"Exportação imune, crédito mantido (art. 8º)":"Tomador do regime regular credita o valor destacado (art. 28)","LC 214/2025, arts. 1º a 11 e 343"]];
 if(FICHA){
  const issF=exp?NA:ctx.mrow?celF(pf(ctx.mrow.a/100),`${(munAtual()||{}).municipio||"Maceió/AL"}${ctx.mrow.c&&ctx.mrow.c!=="—"?", cód. "+ctx.mrow.c:""}`+(ded72?"; base sem materiais":"")):celF(["07.02","07.05","16.01"].includes(s)?"até 5%":"2% a 5%","alíquota fixada pela lei do município"+(ded72?"; base sem materiais":""));
  const F={ISS:[snF("ISS"),issF,issF],PIS:[snF("PIS"),exp?NA:celF("0,65%","cumulativo, sem crédito"),exp?NA:celF("1,65%","não cumulativo, com crédito")],COFINS:[snF("COFINS"),exp?NA:celF("3,00%","cumulativo, sem crédito"),exp?NA:celF("7,60%","não cumulativo, com crédito")],
   IRPJ:[snF("IRPJ"),celF(pf(pr.i*.15),`15% × presunção ${pf(pr.i)} (+10% adicional)`),celF("15% + 10%","sobre o lucro real")],CSLL:[snF("CSLL"),celF(pf(pr.c*.09),`9% × presunção ${pf(pr.c)}`),celF("9%","sobre o lucro real")],
   CPP:[anCat==="X"?'<span class="pill err">vedado</span>':an==="IV"?celF("20% + RAT","sobre a folha, fora do DAS"):snF("CPP"),celF("20% + RAT + 5,8%","sobre a folha (terceiros)"),celF("20% + RAT + 5,8%","sobre a folha (terceiros)")],
   CBS:[celF(pf(.009*(1-rd)),"2026, teste; compensa PIS/COFINS")],IBS:[celF(pf(.001*(1-rd)),"2026, teste")]};
  rows.forEach(x=>{const k=x[0].startsWith("INSS")?"CPP":x[0];const f=F[k];if(!f)return;x[2]=f[0];x[3]=f[1]||f[0];x[4]=f[2]||f[0]})}
 const tot=[snR?snR.tot+snR.cppFora:null,lpR.tot,lrR.tot];
 const head=`<div class="ficha-head"><div><small>cTribNac</small><b>${fmtC(cod)}</b></div><div><small>Item LC 116</small><b>${s}</b></div><div><small>NBS</small><b>${nb.length?nbsF(nb[0][0]):"—"}</b><small>${nb.length>1?`+${nb.length-1} opções`:""}</small></div><div><small>cIndOp</small><b>${ind[0]||"—"}</b></div><div><small>CST IBS/CBS</small><b>${cst}</b></div><div><small>cClassTrib</small><b>${ccl}</b><small>${red(ccl)}</small></div><div><small>Simples Nacional</small><b>${anCat==="X"?"Vedado":FICHA&&anCat==="R"?"Anexo III ou V":SN[an].nome}</b><small><a href="#simples" class="go-simples">ver faixas e alíquotas</a></small><small>${anCat==="R"?(FICHA?"Fator R ≥ 28% → III":"Fator R "+pf(fatorR)):""}</small></div><div><small>ISS: incidência</small><b>${esc(locISS(r[2]))}</b></div></div>`;
 return`<div class="box ficha"><h3>Ficha tributária unificada · ${esc(dd(r[1]).slice(0,90))}</h3>${head}
 ${FICHA?'<div class="legend"><span><i class="al">%</i> alíquota · modo ficha cadastral (sem valores)</span></div>':'<div class="legend noprint"><span><i class="al">%</i> alíquota</span><span><i class="vl">R$</i> valor na nota</span><span class="modes">Mostrar: <button type="button" data-m="ambos" class="on">ambos</button><button type="button" data-m="al">só alíquotas</button><button type="button" data-m="vl">só valores</button></span></div>'}
 <div class="scroll"><table class="cmp ft" id="ftab"><thead><tr><th>Tributo</th><th>Código / CST</th><th class="n">Simples Nacional</th><th class="n">Lucro Presumido</th><th class="n">Lucro Real</th><th>Deduções · benefícios · quando cabe</th><th>Base legal</th></tr></thead><tbody>
 ${rows.map(x=>`<tr><td><b>${x[0]}</b></td><td>${x[1]}</td><td class="n">${x[2]}</td><td class="n">${x[3]}</td><td class="n">${x[4]}</td><td>${x[5]}</td><td><small>${LG(x[6])}</small></td></tr>`).join("")}
 ${FICHA?"":`<tr class="tot"><th>Carga total na nota de ${money(V)}</th><th></th>${tot.map(t=>`<th class="n">${t==null?"—":cel(pf(V?t/V:0),money(t))}</th>`).join("")}<th colspan="2"><small>Sem IBS/CBS de 2026 (compensados). Menor carga: <b>${(()=>{const c=[["Simples",tot[0]],["Presumido",tot[1]],["Real",tot[2]]].filter(x=>x[1]!=null).sort((a,b)=>a[1]-b[1])[0];return c?c[0]:"—"})()}</b></small></th></tr>`}</tbody></table></div>
 <p class="note">${FICHA?"Ficha cadastral: alíquotas e regras do serviço. No Simples, a alíquota efetiva depende da receita dos últimos 12 meses (faixas) e, nas atividades sujeitas ao Fator R, da folha. Clique em <b>Simulação com valores</b> para ver o imposto em reais. ":"Valores para a nota informada; folha proporcional (folha ÷ RBT12). "}${imp?"Operação de importação: ver bloco específico abaixo.":exp?"Exportação: ISS, PIS, COFINS e IBS/CBS não incidem; IRPJ/CSLL normais.":""}</p></div>`}

/* ---------- enquadramento: Simples × MEI × quem não pode (LC 123/2006, texto consolidado Planalto) ---------- */
const PROF_REG=new Set(["04","17.14","17.19","07.01","07.03","07.19","07.20","05","17.09","17.02","17.20","23","28","29","30","32","33","35","36","38"]); // atividades intelectuais / profissões regulamentadas: fora do MEI (CGSN, Res. 140, Anexo XI)
const MEI_OK={"07.02":"pedreiro, pintor, eletricista, encanador, gesseiro, azulejista, carpinteiro, serralheiro (Anexo XI da Res. CGSN 140)","07.05":"pedreiro, pintor, reformas em geral (Anexo XI da Res. CGSN 140)","07.10":"diarista, faxineiro, limpador de vidros (Anexo XI)","07.11":"jardineiro, paisagista (Anexo XI)","07.13":"dedetizador (Anexo XI)","14.01":"mecânico, técnico em manutenção, reparador de eletrodomésticos (Anexo XI)","14.06":"instalador/montador (Anexo XI)","06.01":"cabeleireiro, barbeiro, manicure, esteticista (Anexo XI)","13.04":"fotógrafo (Anexo XI)","13.03":"editor de vídeo (Anexo XI)","16.02":"transportador municipal de cargas/passageiros, mototaxista (Anexo XI)","26.01":"motoboy, entregador (Anexo XI)","12.07":"músico, DJ, animador de festas (Anexo XI)","17.10":"organizador de eventos, promotor de festas (Anexo XI)","08.02":"professor particular, instrutor de idiomas/informática/artes (Anexo XI)","24.01":"chaveiro (Anexo XI)","14.05":"serralheiro, marceneiro, tapeceiro (Anexo XI)","13.13":"gráfico rápido, serígrafo (Anexo XI)"};
function enquadramento(s,anCat,an,ctx){
 const c=s.slice(0,2),prof=PROF_REG.has(s)||PROF_REG.has(c),mei=MEI_OK[s];
 const ok=t=>`<span class="pill ok">${t}</span>`,no=t=>`<span class="pill err">${t}</span>`,dep=t=>`<span class="pill warn">${t}</span>`;
 // Simples
 let sn,snW,snB;
 if(anCat==="X"){sn=no("NÃO PODE");snW=s==="17.05"?"Cessão ou locação de mão de obra é vedada no Simples (art. 17, XII). Exceção: serviços de vigilância, limpeza e conservação e construção civil tributados pelo Anexo IV (art. 18, §5º-H).":c==="15"?"Serviços financeiros, de crédito e factoring são vedados (art. 17, I).":"Serviços de registros públicos e cartorários são exercidos por pessoa física delegatária, fora do Simples.";snB="LC 123/2006, art. 17"}
 else{sn=ok("PODE");snW=`Tributação pelo ${anCat==="R"?"Anexo III (folha ≥ 28% da receita) ou Anexo V (folha menor) — Fator R, art. 18, §§5º-J e 5º-K":an==="IV"?"Anexo IV (art. 18, §5º-C): CPP paga por fora, como as demais empresas (art. 13, §3º)":"Anexo III (art. 18, §5º-B)"}. Limite de receita: R$ 4,8 milhões/ano (art. 3º, II); acima de R$ 3,6 milhões o ISS e o ICMS saem do DAS (art. 13-A e art. 19).`;snB="LC 123/2006, arts. 3º, 13, 13-A, 17 e 18"}
 // MEI
 let me,meW;
 if(anCat==="X"){me=no("NÃO");meW="Atividade vedada no Simples, logo vedada no MEI (art. 18-A, §1º exige optante pelo Simples)."}
 else if(prof){me=no("NÃO");meW="Atividade intelectual ou profissão regulamentada (advogado, contador, médico, engenheiro, consultor, psicólogo, veterinário etc.) não consta das ocupações autorizadas pelo CGSN (art. 18-A, §4º-B; Res. CGSN 140, Anexo XI)."}
 else if(anCat==="R"){me=dep("DEPENDE");meW="Atividades do Fator R caem no Anexo V sem folha, e o Anexo V é vedado ao MEI (art. 18-A, §4º, I). Só cabe MEI se a ocupação específica constar do Anexo XI da Res. CGSN 140."}
 else if(mei){me=ok("PODE");meW=`Ocupações autorizadas: ${mei}.`}
 else{me=dep("DEPENDE");meW="Verifique se a ocupação consta do Anexo XI da Res. CGSN 140 (lista de ocupações do MEI). Se não constar, não cabe MEI."}
 const meR=`Requisitos: receita até R$ 81.000/ano (R$ 6.750 por mês no ano de início), um único estabelecimento, não ser sócio de outra empresa, não ser startup, no máximo 1 empregado (art. 18-A, §§1º, 2º e 4º; art. 18-C). DAS fixo mensal: 5% do salário mínimo (INSS) + R$ 5,00 de ISS (+ R$ 1,00 de ICMS se houver) (art. 18-A, §3º, V). Sem dedução de materiais nem Fator R (art. 18-A, §3º, II). ${["07.02","07.05","14.01","14.06","07.10"].includes(s)?"<b>Atenção:</b> a empresa que contrata MEI em hidráulica, eletricidade, pintura, alvenaria, carpintaria ou manutenção paga CPP de 20% sobre o serviço (art. 18-B).":""}`;
 const ved=["I — assessoria creditícia, factoring, empréstimos (empresa simples de crédito)","II — titular ou sócio domiciliado no exterior (red. LC 214/2025)","III — capital com participação de ente público","V — débito com INSS ou Fazendas sem exigibilidade suspensa","VI — transporte intermunicipal/interestadual de passageiros (exceto fluvial, urbano/metropolitano ou fretamento contínuo)","VII — geração, transmissão, distribuição ou comercialização de energia elétrica","VIII — importação ou fabricação de automóveis e motocicletas","IX — importação de combustíveis","X — produção ou atacado de cigarros, armas, munições, explosivos e bebidas alcoólicas (exceto micro cervejarias, vinícolas, licores e destilarias)","XII — cessão ou locação de mão de obra (salvo Anexo IV, §5º-H)","XIV — loteamento e incorporação de imóveis","XV — locação de imóveis próprios (red. LC 214/2025)"];
 return`<div class="box ficha"><h3>Enquadramento · pode ser Simples? pode ser MEI? quem não pode</h3>
 <div class="scroll"><table class="cmp ft"><thead><tr><th>Regime</th><th>Este serviço (${s})</th><th>Como funciona · condições</th><th>Base legal</th></tr></thead><tbody>
 <tr><td><b>Simples Nacional</b></td><td>${sn}</td><td>${snW}</td><td><small>${LG(snB)}</small></td></tr>
 <tr><td><b>MEI</b></td><td>${me}</td><td>${meW} ${meR}</td><td><small>${LG("LC 123/2006, arts. 18-A, 18-B e 18-C; Resolução CGSN 140/2018")}</small></td></tr>
 <tr><td><b>Lucro Presumido / Real</b></td><td>${ok("SEMPRE PODE")}</td><td>Qualquer empresa pode optar pelo Presumido até R$ 78 milhões de receita (Lei 9.718/1998, art. 13); acima disso, ou em bancos, factoring e empresas com lucros no exterior, o Lucro Real é obrigatório (art. 14).</td><td><small>${LG("Lei 9.718/1998, arts. 13 e 14")}</small></td></tr>
 </tbody></table></div>
 <details class="det"><summary>Quem não pode ser do Simples em nenhuma hipótese (LC 123, art. 17)</summary><ul class="lei-casos">${ved.map(v=>`<li>${v}</li>`).join("")}</ul><p class="note">Texto consolidado da LC 123/2006 (Planalto), com as alterações das LC 147/2014, 155/2016, 167/2019, 188/2021 e 214/2025. ${LG("LC 123/2006, art. 17")}.</p></details></div>`}

/* ---------- deduções, bases de cálculo e retenções (fonte: Manual Tributário para Construtoras; IN RFB 2.110/2022) ---------- */
const PROF_IRRF=new Set(["01","02","04","05","10","17","18","23","28","29","30","32","33","35","36","38"]); // serviços profissionais (RIR/2018, art. 714) — aproximação por item
const CSRF_30=new Set(["07.10","07.13","11.02","14.01","17.05","17.19","17.20","17.01","17.02","17.03","17.04","17.08","17.09","17.14","17.21","04.01","04.02","04.03","04.22","04.23","07.01","07.03","07.19","07.20","01.01","01.02","01.03","01.04","01.05","01.06","01.07","01.08","02.01"]); // art. 30 Lei 10.833 (limpeza, conservação, manutenção, segurança, vigilância, locação de MO, serviços profissionais)
const CESSAO=new Set(["07.10","07.13","11.02","17.05","14.01","14.06"]); // cessão de mão de obra típica (IN 2.110, arts. 111 e 112)
/* Serviços sujeitos à retenção de 11% (IN RFB 2.110/2022, arts. 111 e 112 — lista exaustiva, art. 113), por subitem/item da LC 116 */
const RET_INSS={
 "07.02":{a:111,i:"III",d:"construção civil: construção, demolição, reforma, acréscimo e obras complementares"},"07.04":{a:111,i:"III",d:"demolição"},"07.05":{a:111,i:"III",d:"reparação, conservação e reforma de edifícios, estradas, pontes e portos"},
 "07.06":{a:111,i:"III",d:"obras complementares: colocação de pisos, revestimentos, forros, vidros, esquadrias (integradas à obra)"},"07.17":{a:111,i:"III",d:"escoramento e contenção de encostas (obra de construção civil)"},"07.21":{a:111,i:"III",d:"perfuração de poços e serviços de construção vinculados a pesquisa/lavra"},
 "07.11":{a:111,i:"III/I",d:"reparação de jardins e passeios (obras complementares) e conservação de jardins"},"07.09":{a:111,i:"I",d:"varrição, coleta e limpeza de vias"},"07.10":{a:111,i:"I",d:"limpeza, conservação e zeladoria de imóveis"},"07.12":{a:111,i:"IV",d:"controle de pragas (natureza rural)"},"07.16":{a:111,i:"IV",d:"florestamento e serviços de natureza rural"},
 "11.02":{a:111,i:"II",d:"vigilância e segurança (monitoramento eletrônico não)"},"17.02":{a:111,i:"V",d:"digitação e preparação de dados"},"01.03":{a:111,i:"VI",d:"preparação de dados para processamento (escaneamento, leitura ótica)"},
 "17.05":{a:112,i:"caput",d:"cessão de mão de obra: qualquer serviço com trabalhadores à disposição do contratante"},"14.01":{a:112,i:"XIV",d:"manutenção de instalações, máquinas e equipamentos com equipe à disposição"},"14.06":{a:112,i:"XV",d:"montagem"},"14.05":{a:112,i:"I",d:"acabamento de produtos"},
 "08.02":{a:112,i:"X",d:"treinamento e ensino"},"04":{a:112,i:"XXIII",d:"saúde, direcionados ao atendimento de pacientes"},"09.01":{a:112,i:"VII",d:"hotelaria"},"16.01":{a:112,i:"XVIII",d:"operação de transporte de passageiros"},"17.22":{a:112,i:"IV",d:"cobrança"},"26.01":{a:112,i:"IX/XI",d:"distribuição e entrega de contas e documentos"},
 "17.10":{a:112,i:"XXI",d:"promoção de eventos"},"17.06":{a:112,i:"XXI",d:"promoção de vendas"},"11.04":{a:112,i:"XX",d:"recepção, triagem e movimentação de materiais"},"20":{a:112,i:"XVII",d:"operação de terminal de transporte"},"22.01":{a:112,i:"XVII",d:"operação de pedágio"},"11.01":{a:112,i:"XVI",d:"manobra de veículos (operação de equipamentos)"},"07.19":{a:0,i:"",d:"acompanhamento e fiscalização de obra"},"07.01":{a:0,i:"",d:"engenharia consultiva, projetos"},"07.03":{a:0,i:"",d:"elaboração de planos e projetos"},"07.20":{a:0,i:"",d:"aerofotogrametria, topografia, geologia"}};
const retDe=s=>RET_INSS[s]||RET_INSS[s.slice(0,2)]||null;
function deducoes(s,ctx){
 const{exp,an,anCat,rd,ccl,M,V,FICHA,tom}=ctx,c=s.slice(0,2);
 const ret=retDe(s),obra=!!ret&&ret.a===111&&/III/.test(ret.i),constr=["07.02","07.04","07.05"].includes(s)||obra,eng=["07.01","07.03","07.19","07.20"].includes(s),cess=!!ret&&ret.a>0&&!obra;
 const P=t=>`<span class="al">${t}</span>`,ok=t=>`<span class="pill ok">${t}</span>`,no=t=>`<span class="pill err">${t}</span>`;
 const R=[];
 // ISS
 const ded72=["07.02","07.05"].includes(s);
 R.push(["ISS",ded72?"Dedução de materiais":"Sem dedução",ded72?P("até 100% do material"):P("0%"),
  ded72?`<b>Entra:</b> material fornecido pelo prestador e incorporado à obra (cimento, aço, concreto, tubos, fios, tintas, esquadrias…).<br><b>Não entra:</b> locação de equipamentos, subempreitada, mão de obra, BDI, frete, taxa de administração.`:`Base = preço do serviço. A LC 116 só admite excluir materiais nos subitens 7.02 e 7.05.`,
  ded72?`Só 7.02 e 7.05. Exige NF de compra dos materiais vinculada à obra, discriminação na NFS-e e endereço da obra. Alguns municípios fixam presunção (ex.: 40% serviço / 60% material) em vez de dedução real. No Simples a mesma dedução vale no DAS (LC 123, art. 18, §23).`:`Descontos incondicionais destacados na nota reduzem a base. Verifique a lei do município ${s.startsWith("07.")?"da obra":"competente"}.`,
  "LC 116/2003, art. 7º, §2º, I; LC 123/2006, art. 18, §23"]);
 // INSS retido
 if(constr||cess){
  R.push([`INSS retido (11%)<br><small>${ret?`IN 2.110, art. ${ret.a}, ${ret.i}: ${esc(ret.d)}${ret.a===112?" — só com cessão de mão de obra":" — cessão de mão de obra ou empreitada"}`:"construção civil (art. 111, III)"}</small>`,constr?"Dedução de materiais e equipamentos não manuais":"Dedução de materiais/equipamentos e verbas do art. 120",
   `${P("100%")} <small>contrato com valores + NF (art. 116)</small><br>${P("base mín. 50%")} <small>contrato sem valores, NF discrimina (art. 117, IV)</small><br>${P("10% / 15% / 45% / 50% / 35%")} <small>equipamento inerente, sem valor no contrato (art. 118, II, b)</small><br>${P("100% da nota")} <small>sem previsão contratual ou sem discriminação na NF (art. 119)</small>`,
   `<b>Entra:</b> material aplicado; equipamentos <u>não manuais</u> próprios ou locados (betoneira, vibrador, compressor, gerador, grua, escavadeira, retro, munck, plataforma, andaime motorizado, caminhão-betoneira), limitados ao valor de aquisição/locação (art. 116, §1º); alimentação in natura/auxílio-alimentação não pago em dinheiro e vale-transporte (art. 120).<br><b>Não entra:</b> equipamentos manuais, taxa de administração/agenciamento (art. 120, §1º), BDI, lucro, mão de obra.`,
   `<b>Hipótese 1 (art. 116):</b> material/equipamento previstos no contrato com valores e discriminados na NF → dedução integral do comprovado.<br><b>Hipótese 2 (art. 117):</b> previstos no contrato sem valores, NF discrimina → base mínima 50% (transporte de passageiros 30%, limpeza hospitalar 65%, limpeza 80%).<br><b>Hipótese 3 (art. 118):</b> equipamento inerente ao serviço, sem valor no contrato → base mínima: pavimentação asfáltica 10%, terraplenagem/aterro/dragagem 15%, pontes e viadutos 45%, drenagem 50%, demais serviços com equipamento 35%; serviços em geral 50%.<br><b>Hipótese 4 (art. 119):</b> sem previsão contratual e uso não inerente, ou sem discriminação na NF → base = 100% da nota.<br>Destaque obrigatório "RETENÇÃO PARA A PREVIDÊNCIA SOCIAL" (art. 121). Dispensa: empreitada total, contribuinte individual, transporte de cargas, serviço nas dependências da contratada (art. 114) e valor retido ≤ R$ 10,00 ou prestador sem empregados (art. 115).`,
   "Lei 8.212/1991, art. 31; Decreto 3.048/1999, art. 219, §§7º e 8º; IN RFB 2.110/2022, arts. 108 a 122; IN RFB 2.289/2025; IN RFB 2.021/2021 (empreitada total/parcial)"]);
 if(tom==="pf")R.push(["Retenções pelo tomador","Tomador pessoa física",P("0%"),"Pessoa física não retém INSS (art. 31 da Lei 8.212 fala em empresa contratante), nem IRRF/CSRF de pessoa jurídica prestadora.","O ISS pode continuar retido quando a lei municipal eleger o tomador PF como responsável (raro). Confirme na lei do município.","Lei 8.212/1991, art. 31; IN RFB 2.110/2022, art. 110; Lei 10.833/2003, art. 30"]);
 }else if(eng)R.push(["INSS retido","Em regra não há retenção",P("0% · 11% se virar obra ou cessão"),
   `Projetos, engenharia consultiva, fiscalização e topografia (${esc(ret?ret.d:"serviço de engenharia")}) <b>não constam</b> dos arts. 111 e 112 da IN 2.110, e a lista é exaustiva (art. 113). <b>Vira retenção</b> quando: (1) o mesmo contrato inclui a execução da obra (empreitada de construção civil, art. 111, III) — aí a nota da obra sofre 11% e cabem as mesmas deduções de materiais e equipamentos dos arts. 116 a 119; (2) o engenheiro/equipe fica à disposição do contratante de forma contínua (cessão de mão de obra, art. 108) — aí 11% sobre o valor bruto, com dedução só de alimentação/vale-transporte (art. 120).`,
   `Emita notas separadas para projeto/fiscalização e para a obra; descreva o objeto como serviço técnico, não como "mão de obra". Órgão público e Anexo IV não mudam essa regra. Se houver retenção indevida, compensar/restituir pela IN RFB 2.055/2021.`,
   "IN RFB 2.110/2022, arts. 108, 109, 111 a 113 e 116 a 120; Lei 8.212/1991, art. 31"]);
 else R.push(["INSS retido","Não há retenção",P("0%"),"Serviço não consta das listas dos arts. 111 e 112 da IN 2.110 (exaustivas, art. 113) e não caracteriza cessão de mão de obra nem empreitada de construção.","Retenção de 11% só em cessão de mão de obra, empreitada de construção civil e trabalho temporário (IN 2.110, arts. 110 a 112). Se o contrato colocar trabalhadores à disposição do tomador (art. 108), passa a haver retenção.","Lei 8.212/1991, art. 31; IN RFB 2.110/2022, arts. 108 a 113"]);
 // IRPJ/CSLL presunção
 if(s==="07.02")R.push(["IRPJ / CSLL (Presumido)","Presunção reduzida",`${P("8% / 12%")} <small>com TODOS os materiais</small><br>${P("32% / 32%")} <small>sem material ou só parte</small>`,"Vale para a <b>receita daquela obra/contrato</b>, não para a empresa inteira: a mesma empresa pode ter 8% numa obra com material e 32% num serviço sem material no mesmo trimestre.","Empreitada com fornecimento de todos os materiais indispensáveis, comprovado por contrato e NF. Sem material: 32%. Não é dedução de base, é percentual de presunção.","Lei 9.249/1995, art. 15, §1º, III, 'b' e art. 20; IN RFB 1.700/2017, art. 33"]);
 else if(s.startsWith("04."))R.push(["IRPJ / CSLL (Presumido)","Presunção reduzida",P("8% / 12%"),"Serviços hospitalares e de auxílio diagnóstico/terapia (não a consulta médica simples).","Sociedade empresária que atenda às normas da ANVISA (STJ, Tema 217).","Lei 9.249/1995, art. 15, §1º, III, 'a'"]);
 else R.push(["IRPJ / CSLL (Presumido)","Presunção padrão",P("32% / 32%"),"Base presumida sobre a receita bruta, sem dedução de custos.","Só descontos incondicionais e cancelamentos reduzem a receita.","Lei 9.249/1995, arts. 15 e 20"]);
 // PIS/COFINS
 R.push(["PIS / COFINS","Crédito (só no Lucro Real)",`${P("9,25%")} <small>sobre insumos no LR</small> · ${P("0%")} <small>no Presumido</small>`,"<b>LR, gera crédito:</b> materiais aplicados, locação de máquinas e equipamentos, subempreitada (insumo), energia, combustível de máquinas, frete, EPI.<br><b>Presumido:</b> base bruta, sem crédito.","Crédito limitado ao que é essencial/relevante à atividade (STJ, Tema 779). No Simples está dentro do DAS. Exportação com ingresso de divisas: não incide.","Leis 10.637/2002 e 10.833/2003, art. 3º"]);
 // Retenções federais
 const priv=constr?"Nenhuma (7.02/7.04/7.05 fora do rol)":CSRF_30.has(s)?"CSRF 4,65% + IRRF 1,5%":PROF_IRRF.has(c)?"IRRF 1,5%":"Nenhuma";
 R.push(["Retenções federais (tomador PJ)",priv,constr?P("0%"):CSRF_30.has(s)?P("4,65% + 1,5%"):PROF_IRRF.has(c)?P("1,5%"):P("0%"),
  constr?"Execução de obra não está no art. 30 da Lei 10.833 nem no art. 714 do RIR: entre privados só ISS e INSS.":"CSRF (PIS 0,65% + COFINS 3% + CSLL 1%) e IRRF 1,5% sobre o valor bruto, sem dedução de material.",
  `<b>Órgão público (IN 1.234/2012):</b> ${constr?"cód. 6147 = 5,85% com material · cód. 6188 = 9,45% sem material":eng?"cód. 6190 = 9,45% (engenharia consultiva)":"cód. 8767 = 9,45% (regra geral)"}. <b>Optante do Simples:</b> não sofre CSRF nem IN 1.234 (LC 123, art. 13, §1º, XI).`,
  "Lei 10.833/2003, art. 30; Decreto 9.580/2018, arts. 714 e 716; Lei 9.430/1996, art. 64; IN RFB 1.234/2012"]);
 // IBS/CBS
 R.push(["IBS / CBS",rd>0?"Redução de alíquota":"Sem redução",`${P(pct(rd))} <small>cClassTrib ${ccl}</small><br>${P("crédito amplo")}`,
  `${rd>0?`A redução de <b>${pct(rd)}</b> é <b>da operação</b> (cada nota de serviço com esse cClassTrib), não da empresa inteira. `:""}<b>Crédito</b> sobre tudo que entra na atividade: materiais, locação de equipamentos, subempreitada, energia, combustível, frete, EPI, aluguel de depósito.`,
  `${constr?"Regime de bens imóveis (arts. 251 a 270): serviços de construção com redução de 50%; locação/cessão de imóvel com redução de 70%. Crédito de material limitado ao débito quando o tomador é não contribuinte (art. 255, §5º), exceto administração pública (§6º). Apuração por obra com CIB (arts. 269 e 270).":"Redução conforme o cClassTrib informado na nota; conferir o Anexo VIII."} Compras em nome de pessoa física do sócio não geram crédito. Em 2026 (0,9% + 0,1%) o valor compensa PIS/COFINS.`,
  "LC 214/2025, arts. 28 e 47 (crédito), 251 a 270, 343 a 348"]);
 // Simples
 if(anCat!=="X")R.push(["Simples Nacional",constr?"ISS com dedução de material + Anexo IV":"Alíquota única no DAS",constr?`${P("até 100% material no ISS")}<br>${P("Anexo IV")}`:P(anCat==="R"?"Anexo III ou V":SN[an].nome),
  constr?"O DAS do Anexo IV não inclui a CPP: INSS patronal (20% + RAT) é pago por fora. ISS dentro do DAS com a mesma dedução de materiais.":"Todos os tributos no DAS; INSS patronal "+(an==="IV"?"por fora":"incluído")+".",
  "Não sofre CSRF nem retenção da IN 1.234; <u>sofre</u> retenção de INSS 11% quando houver cessão de mão de obra/empreitada parcial. Receita de exportação sai de PIS/COFINS/ISS (art. 18, §14).","LC 123/2006, arts. 13 e 18 (§§5º-C, 14, 23)"]);
 const head=`<div class="dedhead"><b>Quem reduz o quê:</b> cada tributo tem a sua própria base. Dedução de material vale para ISS e INSS; a presunção de 8%/12% é do IRPJ/CSLL da receita daquela obra; a redução de ${rd>0?pct(rd):"IBS/CBS"} é por operação (nota), não pela empresa. Descontos incondicionais na nota reduzem a base de todos.</div>`;
 return`<div class="box ficha ded"><h3>Deduções, bases de cálculo e retenções · ${esc(dd(ct(ctx.cod)[1]).slice(0,70))}</h3>${head}<div class="scroll"><table class="cmp ft"><thead><tr><th>Tributo</th><th>Dedução / redução</th><th>Quanto</th><th>O que entra · o que não entra</th><th>Condições e hipóteses</th><th>Base legal</th></tr></thead><tbody>${R.map(x=>`<tr><td><b>${x[0]}</b></td><td>${x[1]}</td><td>${x[2]}</td><td>${x[3]}</td><td>${x[4]}</td><td><small>${LG(x[5])}</small></td></tr>`).join("")}</tbody></table></div>
 ${constr?`<details class="det"><summary>Equipamentos: o que pode e o que não pode entrar na dedução do INSS</summary><div class="scroll"><table class="ft"><thead><tr><th>Tipo de obra ou serviço</th><th>Equipamentos típicos (não manuais)</th><th>Base mínima do INSS</th></tr></thead><tbody>
 <tr><td>Pavimentação asfáltica</td><td>Vibroacabadora, rolo compactador, caminhão espargidor, fresadora, usina de asfalto</td><td>${P("10%")}</td></tr>
 <tr><td>Terraplenagem, aterro sanitário, dragagem</td><td>Trator de esteira, motoniveladora, escavadeira, pá-carregadeira, basculante, draga</td><td>${P("15%")}</td></tr>
 <tr><td>Obras de arte (pontes, viadutos)</td><td>Guindaste, treliça lançadeira, fôrma deslizante, autobomba</td><td>${P("45%")}</td></tr>
 <tr><td>Concretagem bombeada · estrutura e alvenaria · instalações · demolição · sondagem · limpeza/desobstrução</td><td>Caminhão-betoneira, autobomba, vibrador, grua, elevador de obra, andaime motorizado, compressor, máquina de solda, escavadeira com martelete, perfuratriz, hidrojato</td><td>${P("35%")}</td></tr>
 <tr><td>Serviços em geral (regra geral)</td><td>Material discriminado na NF sem valor no contrato</td><td>${P("50%")}</td></tr>
 <tr><td colspan="3"><b>Nunca deduzem (manuais):</b> martelo, marreta, picareta, pá, enxada, talhadeira, colher de pedreiro, serrote, alicate, chave de fenda, trena, prumo, nível, carrinho de mão, pincel, rolo, espátula. <b>Requisitos:</b> previsão contratual (ou anexo), destaque na NF separado do serviço, contrato de locação ou NF do equipamento guardados por 5 anos, valor até o custo real, uso efetivo na obra.</td></tr></tbody></table></div></details>`:""}
 </div>`}

/* ---------- interface ---------- */
function buildGuia(){
 const p=$("#p-guia");
 p.innerHTML=`<h2>Guia Tributário por Serviço</h2><p class="sub">Primeiro diga o que você quer. Depois escolha o serviço.</p>
 <div class="modo"><button type="button" data-modo="ficha" class="on"><b>Ficha cadastral do tributo</b><span>Só os códigos, CST, alíquotas, deduções e base legal. Sem preencher valores.</span></button><button type="button" data-modo="sim"><b>Simulação com valores</b><span>Informe a nota, materiais, folha e receita e veja o imposto em reais nos três regimes.</span></button></div>
 <div id="gperg" class="hide"></div>
 <div class="row"><div><label for="gramo">1. Ramo / tipo de serviço (lista LC 116)</label><select id="gramo"><option value="">Escolha o ramo…</option>${Object.keys(D.items).map(k=>`<option value="${k}">${k} · ${esc(D.items[k]).slice(0,70)}</option>`).join("")}</select></div>
 <div><label for="gsrv">2. Serviço do ramo</label><select id="gsrv"><option value="">Escolha o ramo primeiro</option></select></div>
 <div><label for="gq">Ou digite a atividade (ex.: construção civil, consultoria, clínica)</label><input id="gq" placeholder="construção civil, software, advocacia, 070202…" autocomplete="off"><div id="gsug" class="sug"></div><input id="gc" type="hidden"></div></div>
 <div class="row ess"><div><label for="gv">Valor da nota (R$)</label><input id="gv" type="number" step="0.01" value="30000"></div>
 <div><label for="gm">Materiais fornecidos (R$)</label><input id="gm" type="number" step="0.01" value="0"></div>
 <div><label>Tem funcionários (folha)?</label><div class="tog"><label><input type="radio" name="gf" value="1" checked> Sim</label><label><input type="radio" name="gf" value="0"> Não</label></div></div>
 <div><label for="gfo">Folha dos últimos 12 meses (R$)</label><input id="gfo" type="number" step="0.01" value="200000"></div>
 <div><label for="grb">Receita dos últimos 12 meses (R$)</label><input id="grb" type="number" step="0.01" value="1000000"></div></div>
 <details class="opt"><summary>Mais opções (regime, operação, ISS do município, margem, encargos, cClassTrib, presunção, IBS/CBS)</summary>
 <div class="row"><div><label for="gr">Regime</label><select id="gr"><option value="all">Comparar os três</option><option value="sn">Simples Nacional</option><option value="lp">Lucro Presumido</option><option value="lr">Lucro Real</option></select></div>
 <div><label for="go">Operação</label><select id="go"><option value="nac">Nacional</option><option value="exp">Exportação de serviço</option><option value="imp">Importação de serviço (tomador no Brasil)</option></select></div>
 <div><label for="gk">cClassTrib aplicado</label><select id="gk"></select></div>
 <div><label for="guf">Estado (UF)</label><select id="guf">${Object.keys(UFS).map(u=>`<option value="${u}"${u==="AL"?" selected":""}>${u} · ${UFS[u]}</option>`).join("")}</select></div>
 <div><label for="gmu">Município do ISS</label><select id="gmu"></select></div>
 <div><label for="gmc">Código de serviço do município</label><select id="gmc"></select></div>
 <div><label for="gi">Alíquota ISS do município (%)</label><input id="gi" type="number" step="0.01" value="5"></div>
 <div><label for="gto">Quem contrata (tomador)</label><select id="gto"><option value="pj">Empresa (PJ)</option><option value="pf">Pessoa física</option><option value="gov">Órgão público</option></select></div></div>
 <div class="row"><div><label for="gmg">Margem de lucro p/ Lucro Real (%)</label><input id="gmg" type="number" step="0.1" value="30"></div>
 <div><label for="ge">Encargos s/ folha fora do Simples (%)</label><input id="ge" type="number" step="0.1" value="27.8"></div>
 <div><label for="gob">Presunção (Lucro Presumido)</label><select id="gob"><option value="a">Padrão do subitem</option><option value="o">Obra com todos os materiais (8% / 12%)</option></select></div>
 <div><label for="gib">IBS+CBS cheios estimados p/ 2033 (%)</label><input id="gib" type="number" step="0.1" value="26.5"></div></div></details>
 <p class="noprint"><button class="go" id="gp" type="button">Imprimir / salvar PDF</button> <button class="go simonly" id="gpq" type="button">Responder as perguntas da simulação</button></p>
 <div id="gout"><div class="note">Escolha um serviço da lista para montar o guia.</div></div>`;
 ["gc","gr","go","gv","gm","gi","gmg","grb","gfo","ge","gk","gob","gib","gmu","gmc","gto"].forEach(i=>$("#"+i).addEventListener("input",guia));
 const fillMun=uf=>{const L=munisDe(uf);$("#gmu").innerHTML=L.map(m=>`<option value="${m.id}">${esc(m.nome)}/${m.uf} (lista oficial)</option>`).join("")+`<option value="out">Outro município de ${esc(UFS[uf]||uf)} (informar alíquota)</option>`;$("#gmu").dispatchEvent(new Event("change"))};
 $("#guf").addEventListener("change",()=>fillMun($("#guf").value));
 $("#gmu").addEventListener("change",()=>{const v=$("#gmu").value,lst=v!=="out";$("#gmc").parentElement.style.display=lst?"":"none";$("#gi").parentElement.style.display=lst?"none":"";if(lst)munLoad(v,()=>{const c=$("#gc").value.trim();if(ct(c))macFill(sub(c));guia()});guia()});$("#gi").parentElement.style.display="none";fillMun("AL");
 munLoad("mcz",()=>{const c=$("#gc").value.trim();if(ct(c)){macFill(sub(c));guia()}});
 ["gmg","ge","gob","gib","gto"].forEach(i=>$("#"+i).parentElement.classList.add("simonly"));
 $("#gramo").closest(".row").classList.add("srvrow");
 window.MODO="ficha";p.classList.add("modo-ficha");
 document.querySelectorAll(".modo button").forEach(b=>b.onclick=()=>{window.MODO=b.dataset.modo;document.querySelectorAll(".modo button").forEach(x=>x.classList.toggle("on",x===b));p.classList.toggle("modo-ficha",window.MODO==="ficha");guia()});
 const mq=new URLSearchParams(location.search).get("modo");if(mq==="sim")$(".modo button[data-modo=sim]").click();
 wizard();
 document.querySelectorAll("input[name=gf]").forEach(x=>x.addEventListener("change",()=>{const t=$("input[name=gf]:checked").value==="1";$("#gfo").disabled=!t;$("#ge").disabled=!t;guia()}));
 $("#gc").addEventListener("change",()=>{const r=ct($("#gc").value.trim());if(r){macFill(sub($("#gc").value.trim()));const o=cclOpts(r);$("#gk").innerHTML=o.map(c=>`<option value="${c}">${c} · ${esc(red(c))}</option>`).join("")||'<option value="000001">000001 · integral</option>'}guia()});
 $("#gp").onclick=()=>window.print();$("#gpq").onclick=()=>{const c=$("#gc").value.trim();if(ct(c))perguntas(c);else alert("Escolha o serviço primeiro.")};
 const fillSrv=(ramo,sel)=>{const l=D.ct.filter(x=>x[0].startsWith(ramo));$("#gsrv").innerHTML=l.map(x=>`<option value="${x[0]}"${x[0]===sel?" selected":""}>${fmtC(x[0])} · ${esc(dd(x[1]).slice(0,80))}</option>`).join("")};
 $("#gramo").addEventListener("change",()=>{const r=$("#gramo").value;if(!r){$("#gsrv").innerHTML='<option value="">Escolha o ramo primeiro</option>';return}fillSrv(r);$("#gc").value=$("#gsrv").value;$("#gc").dispatchEvent(new Event("change"))});
 $("#gsrv").addEventListener("change",()=>{$("#gc").value=$("#gsrv").value;$("#gc").dispatchEvent(new Event("change"))});
 $("#gc").addEventListener("change",()=>{const v=$("#gc").value.trim();if(ct(v)){$("#gramo").value=v.slice(0,2);fillSrv(v.slice(0,2),v)}});
 const pick=c=>{$("#gc").value=c;$("#gsug").innerHTML="";$("#gq").value=fmtC(c)+" · "+dd(ct(c)[1]).slice(0,60);$("#gc").dispatchEvent(new Event("change"))};
 let tmr=null;$("#gq").addEventListener("input",()=>{clearTimeout(tmr);tmr=setTimeout(()=>{const q=$("#gq").value.trim();if(q.length<3){$("#gsug").innerHTML="";return}const res=buscar(q);
  $("#gsug").innerHTML=res.length?res.map(x=>`<button type="button" data-c="${x[0]}"><b>${fmtC(x[0])}</b> ${esc(dd(x[1]).slice(0,80))}</button>`).join(""):'<div class="note">Nada encontrado. Tente outra palavra ou escolha o ramo acima.</div>';
  document.querySelectorAll("#gsug button").forEach(b=>b.onclick=()=>pick(b.dataset.c));
  if(res.length===1||(res.length&&/^\d{6}$/.test(q.replace(/\D/g,""))))pick(res[0][0])},250)});
 $("#gq").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();const b=$("#gsug button");if(b)b.click()}});
 const h=new URLSearchParams(location.search).get("s");if(h&&ct(h))pick(h);const qq=new URLSearchParams(location.search).get("q");if(qq){$("#gq").value=qq;$("#gq").dispatchEvent(new Event("input"))}
}
window.buildGuia=buildGuia;

/* ---------- aba Simples Nacional: anexos, faixas, alíquotas e partilha (LC 123, art. 18 e Anexos I a V) ---------- */
function buildSimples(){
 const p=$("#p-simples");if(!p)return;
 const AN={I:SN_CI.I,II:SN_CI.II,III:Object.assign({trib:TRIB_SN},SN.III,{nome:"Anexo III — Serviços (§5º-B) e locação de bens móveis"}),IV:Object.assign({trib:TRIB_SN},SN.IV,{nome:"Anexo IV — Construção civil, vigilância, limpeza, advocacia (§5º-C)"}),V:Object.assign({trib:TRIB_SN},SN.V,{nome:"Anexo V — Serviços intelectuais com Fator R < 28% (§5º-I)"})};
 const money=v=>fmt(v),P=v=>pct(v);
 const tab=k=>{const a=AN[k];let piso=0;return`<div class="box ficha"><h3>${esc(a.nome)}</h3><div class="scroll"><table class="cmp ft"><thead><tr><th>Faixa</th><th>Receita bruta em 12 meses (RBT12)</th><th class="n">Alíquota nominal</th><th class="n">Parcela a deduzir</th><th class="n">Alíquota efetiva no teto da faixa</th>${a.trib.map(t=>`<th class="n">${t}</th>`).join("")}</tr></thead><tbody>${a.fx.map((f,i)=>{const ef=(f[0]*f[1]-f[2])/f[0];const row=`<tr><td><b>${i+1}ª</b></td><td>${i?"de "+money(piso+.01)+" a ":"até "}${money(f[0])}</td><td class="n"><span class="al">${P(f[1])}</span></td><td class="n"><span class="vl">${money(f[2])}</span></td><td class="n"><span class="al">${P(ef)}</span></td>${a.rep[i].map(r=>`<td class="n"><small>${String(r).replace(".",",")}%</small></td>`).join("")}</tr>`;piso=f[0];return row}).join("")}</tbody></table></div><p class="note">Partilha: percentual de cada tributo dentro do DAS naquela faixa. ${k==="IV"?"No Anexo IV a CPP (INSS patronal) não está no DAS: a empresa paga 20% + RAT sobre a folha por fora (art. 13, §3º).":""}${k==="III"||k==="IV"?" O ISS dentro do DAS é limitado a 5% da receita: o excedente da partilha vai para os demais tributos.":""}${k==="V"?" Atividades do Fator R com folha ≥ 28% da receita saem deste anexo e vão para o III (art. 18, §5º-J).":""}</p></div>`};
 p.innerHTML=`<h2>Simples Nacional — anexos, faixas e alíquotas</h2><p class="sub">Tabelas da LC 123/2006 (art. 18 e Anexos I a V, vigentes desde 01/01/2018). Alíquota efetiva = (RBT12 × alíquota nominal − parcela a deduzir) ÷ RBT12.</p>
 <div class="box"><h3>Calcule a alíquota efetiva</h3><div class="row"><div><label for="snrb">Receita bruta dos últimos 12 meses (R$)</label><input id="snrb" type="number" step="0.01" value="1000000"></div><div><label for="snfo">Folha dos últimos 12 meses (R$) — só para o Fator R</label><input id="snfo" type="number" step="0.01" value="200000"></div></div><div id="snout"></div></div>
 <div class="box"><h3>Qual anexo é o meu?</h3><div class="kv"><div>Anexo I</div><div>Comércio (revenda de mercadorias).</div><div>Anexo II</div><div>Indústria (fabricação).</div><div>Anexo III</div><div>Serviços em geral do §5º-B (manutenção, instalação, academias, agências de viagem, escritórios contábeis, transporte municipal, medicina, odontologia, psicologia, fisioterapia e demais do Fator R quando a folha ≥ 28%), locação de bens móveis.</div><div>Anexo IV</div><div>Construção de imóveis e obras de engenharia (7.02, 7.04, 7.05), paisagismo e decoração, vigilância, limpeza e conservação, advocacia (§5º-C). CPP paga por fora.</div><div>Anexo V</div><div>Serviços intelectuais do §5º-I (consultoria, engenharia, arquitetura, auditoria, jornalismo, publicidade, TI, perícia, tradução…) quando a folha é menor que 28% da receita (Fator R, §§5º-J e 5º-M).</div><div>Limites</div><div>Receita até R$ 4,8 milhões/ano (art. 3º, II); ISS e ICMS saem do DAS acima de R$ 3,6 milhões (art. 13-A). MEI: até R$ 81 mil/ano (art. 18-A).</div></div><p class="note">${LG("LC 123/2006, arts. 3º, 13, 13-A, 17 e 18; Resolução CGSN 140/2018")}</p></div>
 ${["I","II","III","IV","V"].map(tab).join("")}`;
 const calc=()=>{const rb=+$("#snrb").value||0,fo=+$("#snfo").value||0,fr=rb?fo/rb:0;if(rb<=0){$("#snout").innerHTML='<p class="note">Informe a receita.</p>';return}
  if(rb>4800000){$("#snout").innerHTML='<p class="note"><span class="pill err">Acima de R$ 4,8 milhões</span> a empresa não pode ficar no Simples (art. 3º, II).</p>';return}
  const L=["I","II","III","IV","V"].map(k=>{const a=AN[k],i=a.fx.findIndex(f=>rb<=f[0]),f=a.fx[i],ef=(rb*f[1]-f[2])/rb;return`<tr><td><b>${esc(a.nome.split(" — ")[0])}</b></td><td>${i+1}ª faixa</td><td class="n"><span class="al">${P(f[1])}</span></td><td class="n"><span class="vl">${money(f[2])}</span></td><td class="n"><b><span class="al">${P(ef)}</span></b></td><td class="n"><span class="vl">${money(rb*ef/12)}</span></td></tr>`}).join("");
  $("#snout").innerHTML=`<div class="scroll"><table class="cmp ft"><thead><tr><th>Anexo</th><th>Faixa</th><th class="n">Nominal</th><th class="n">Parcela a deduzir</th><th class="n">Alíquota efetiva</th><th class="n">DAS mensal estimado (receita ÷ 12)</th></tr></thead><tbody>${L}</tbody></table></div><p class="note">Fator R = folha ÷ receita = <b>${P(fr)}</b> → atividades do §5º-I ficam no <b>${fr>=.28?"Anexo III":"Anexo V"}</b>${fr<.28?` (faltam ${money(Math.max(0,.28*rb-fo))} de folha anual para o Anexo III)`:""}.${rb>3600000?' <span class="pill warn">Acima de R$ 3,6 milhões</span> o ISS/ICMS é recolhido fora do DAS (art. 13-A).':""}</p>`};
 ["snrb","snfo"].forEach(i=>$("#"+i).addEventListener("input",calc));calc()}
window.buildSimples=buildSimples;
document.addEventListener("click",e=>{const a=e.target.closest("a.go-simples");if(!a)return;e.preventDefault();open("simples")});

/* ---------- perguntas guiadas do modo Simular (uma por vez, em linguagem simples) ---------- */
function perguntas(cod){
 const box=$("#gperg");if(!box)return;const s=sub(cod),constr=["07.02","07.04","07.05"].includes(s);
 const Q=[
  {t:"Qual é o valor da nota (ou do serviço)?",h:"Pode ser aproximado. Serve só para mostrar o imposto em reais.",f:()=>`<input type="number" step="0.01" id="pq_v" value="${$("#gv").value}"> <small>R$</small>`,ok:()=>{$("#gv").value=$("#pq_v").value||0}},
  constr?{t:"Você vai fornecer material que fica na obra (cimento, aço, tinta…)?",h:"Material incorporado à obra sai da base do ISS e do INSS retido.",f:()=>`<div class="wopts"><button type="button" data-v="0">Não</button><button type="button" data-v="1">Sim</button></div><div id="pq_mv" class="hide"><label>Quanto, em R$?</label><input type="number" step="0.01" id="pq_m" value="${$("#gm").value}"></div>`,pick:v=>{$("#pq_mv").classList.toggle("hide",v!=="1");if(v==="0"){$("#gm").value=0;return true}},ok:()=>{$("#gm").value=$("#pq_m").value||0}}:null,
  {t:"A empresa é de qual regime?",h:"Se não souber, escolha “Não sei” e comparamos os três.",f:()=>`<div class="wopts"><button type="button" data-v="all">Não sei / comparar</button><button type="button" data-v="sn">Simples Nacional</button><button type="button" data-v="lp">Lucro Presumido</button><button type="button" data-v="lr">Lucro Real</button></div>`,pick:v=>{$("#gr").value=v;return true}},
  {t:"A empresa tem funcionários (folha de pagamento)?",h:"A folha muda o anexo do Simples (Fator R) e o INSS patronal.",f:()=>`<div class="wopts"><button type="button" data-v="0">Não</button><button type="button" data-v="1">Sim</button></div><div id="pq_fv" class="hide"><label>Folha dos últimos 12 meses (R$)</label><input type="number" step="0.01" id="pq_f" value="${$("#gfo").value}"><label>Receita dos últimos 12 meses (R$)</label><input type="number" step="0.01" id="pq_r" value="${$("#grb").value}"></div>`,pick:v=>{$("#pq_fv").classList.toggle("hide",v!=="1");document.querySelector(`input[name=gf][value="${v}"]`).click();if(v==="0")return true},ok:()=>{$("#gfo").value=$("#pq_f").value||0;$("#grb").value=$("#pq_r").value||0}},
  {t:"Quem contrata o serviço?",h:"Empresa e órgão público retêm impostos na fonte; pessoa física não.",f:()=>`<div class="wopts"><button type="button" data-v="pj">Empresa (PJ)</button><button type="button" data-v="pf">Pessoa física</button><button type="button" data-v="gov">Órgão público</button></div>`,pick:v=>{$("#gto").value=v;return true}},
  {t:"Em que Estado e município o serviço é prestado?",h:"O ISS é municipal e o IBS tem parcela estadual e municipal. Nos municípios com lista oficial carregada (hoje: Maceió/AL) a alíquota entra sozinha; nos demais, informe a alíquota.",f:()=>`<label>Estado</label><select id="pq_uf">${Object.keys(UFS).map(u=>`<option value="${u}"${u===$("#guf").value?" selected":""}>${u} · ${UFS[u]}</option>`).join("")}</select><label>Município</label><select id="pq_mu"></select><small>Com lista oficial: Maceió/AL e São Paulo/SP. Outros municípios entram conforme a lista for enviada.</small><div id="pq_iv" class="hide"><label>Alíquota de ISS do município (%)</label><input type="number" step="0.01" id="pq_i" value="${$("#gi").value}"></div><div class="wopts"><button type="button" data-v="exp">É exportação (cliente fora do Brasil)</button></div>`,init:()=>{const fm=()=>{const uf=$("#pq_uf").value,L=munisDe(uf);$("#pq_mu").innerHTML=L.map(m=>`<option value="${m.id}">${esc(m.nome)}/${m.uf} (lista oficial)</option>`).join("")+`<option value="out">Outro município de ${esc(UFS[uf])}</option>`;$("#pq_iv").classList.toggle("hide",$("#pq_mu").value!=="out")};fm();$("#pq_uf").onchange=fm;$("#pq_mu").onchange=()=>$("#pq_iv").classList.toggle("hide",$("#pq_mu").value!=="out")},pick:v=>{if(v==="exp"){$("#go").value="exp";return true}},ok:()=>{$("#go").value="nac";$("#guf").value=$("#pq_uf").value;$("#guf").dispatchEvent(new Event("change"));$("#gmu").value=$("#pq_mu").value;$("#gmu").dispatchEvent(new Event("change"));if($("#pq_mu").value==="out")$("#gi").value=$("#pq_i").value||5}}
 ].filter(Boolean);
 let i=0;const total=Q.length;
 const show=()=>{if(i>=total){box.classList.add("hide");box.innerHTML="";guia();$("#gout").scrollIntoView({behavior:"smooth",block:"start"});return}
  const q=Q[i];box.classList.remove("hide");
  box.innerHTML=`<div class="pq"><small>Pergunta ${i+1} de ${total}</small><h3>${q.t}</h3><p class="sub">${q.h}</p><div class="pq-body">${q.f()}</div><p class="pq-nav"><button type="button" class="go" id="pq_ok">Continuar →</button> <a href="#" id="pq_skip">pular</a> · <a href="#" id="pq_end">responder depois</a></p></div>`;
  if(q.init)q.init();
  box.querySelectorAll(".wopts button").forEach(b=>b.onclick=()=>{box.querySelectorAll(".wopts button").forEach(x=>x.classList.toggle("on",x===b));if(q.pick&&q.pick(b.dataset.v)){i++;guia();show()}});
  $("#pq_ok").onclick=()=>{if(q.ok)q.ok();i++;guia();show()};
  $("#pq_skip").onclick=e=>{e.preventDefault();i++;show()};
  $("#pq_end").onclick=e=>{e.preventDefault();i=total;show()};
  const inp=box.querySelector("input");if(inp){inp.focus();inp.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();$("#pq_ok").click()}})}};
 show()}
window.perguntas=perguntas;

/* ---------- assistente de 3 cliques ---------- */
const CHIPS=[["Construção civil / obra","0702"],["Reforma de imóvel","0705"],["Engenharia / projeto","0703"],["Consultoria / assessoria","1701"],["Contabilidade","1719"],["Advocacia","1714"],["Clínica médica","0401"],["Odontologia","0412"],["Psicologia","0416"],["Fisioterapia","0408"],["Software / TI","0105"],["Suporte técnico","0107"],["Limpeza / conservação","0710"],["Vigilância","1102"],["Marketing / publicidade","1706"],["Escola / curso","0801"],["Academia","0604"],["Salão / estética","0601"],["Manutenção / reparo","1401"],["Transporte municipal","1601"],["Fotografia / vídeo","1304"],["Eventos","1710"],["Corretagem de imóveis","1005"],["Hotel / pousada","0901"]];
function wizard(){
 const w=$("#wiz");if(!w)return;
 const go=n=>{document.querySelectorAll("#wiz .wstep").forEach(x=>x.classList.toggle("hide",x.dataset.step!==String(n)))};
 const show=(sel,on)=>{const e=$(sel);if(e)e.classList.toggle("hide",!on)};
 const finish=cod=>{w.classList.add("hide");$("#wbar").style.display="";show("#p-guia",true);document.querySelector(".tool[data-t=guia]")?.setAttribute("aria-pressed","true");
  const first=D.ct.find(x=>x[0].startsWith(cod))||ct(cod);if(first){$("#gc").value=first[0];$("#gc").dispatchEvent(new Event("change"));$("#gq").value=fmtC(first[0])+" · "+dd(first[1]).slice(0,60);if(window.MODO==="sim")perguntas(first[0])}
  const sec=window.__afterPick;window.__afterPick=null;if(sec){setTimeout(()=>{const t=document.getElementById(sec);if(t)t.scrollIntoView({behavior:"smooth",block:"start"})},250)}else $("#p-guia").scrollIntoView({behavior:"smooth",block:"start"})};
 document.querySelectorAll("#wiz [data-k]").forEach(b=>b.onclick=()=>go(b.dataset.k==="produto"?"produto":2));
 document.querySelectorAll("#wiz [data-m]").forEach(b=>b.onclick=()=>{$(`.modo button[data-modo=${b.dataset.m}]`).click();go(3)});
 document.querySelectorAll("#wiz [data-back]").forEach(a=>a.onclick=e=>{e.preventDefault();go(a.dataset.back)});
 $("#wchips").innerHTML=CHIPS.map(c=>`<button type="button" data-c="${c[1]}">${c[0]}</button>`).join("");
 document.querySelectorAll("#wchips button").forEach(b=>b.onclick=()=>finish(b.dataset.c));
 let t=null;$("#wq").addEventListener("input",()=>{clearTimeout(t);t=setTimeout(()=>{const q=$("#wq").value.trim();if(q.length<3){$("#wsug").innerHTML="";return}const res=buscar(q);$("#wsug").innerHTML=res.length?res.map(x=>`<button type="button" data-c="${x[0]}"><b>${fmtC(x[0])}</b> ${esc(dd(x[1]).slice(0,80))}</button>`).join(""):'<div class="note">Nada encontrado. Tente outra palavra.</div>';document.querySelectorAll("#wsug button").forEach(b=>b.onclick=()=>finish(b.dataset.c))},250)});
 $("#wq").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();const b=$("#wsug button");if(b)b.click()}});
 $("#wrestart").onclick=e=>{e.preventDefault();$("#gperg").classList.add("hide");$("#gperg").innerHTML="";w.classList.remove("hide");go(1);$("#wbar").style.display="none";show("#grid",false);["guia","consulta","simulador","auditor","leis","simples"].forEach(x=>show("#p-"+x,false));window.scrollTo({top:0,behavior:"smooth"})};
 $("#wtools").onclick=e=>{e.preventDefault();show("#grid",true);$("#grid").scrollIntoView({behavior:"smooth"})};
 // se chegou por link direto (?s= ou ?q=), pula o assistente
 const sp=new URLSearchParams(location.search);if(sp.get("s")||sp.get("q")||location.hash){w.classList.add("hide");$("#wbar").style.display="";if(location.hash&&location.hash!=="#guia")show("#grid",true)}
}

function tabela(L,cols){return `<div class="scroll"><table><thead><tr>${cols.map((c,i)=>`<th${i?' class="n"':""}>${c}</th>`).join("")}</tr></thead><tbody>${L}</tbody></table></div>`}
function guia(){
 const cod=$("#gc").value.trim(),r=ct(cod),out=$("#gout");
 if(!r){out.innerHTML='<div class="note">Digite a atividade (ex.: construção civil) ou escolha o ramo para montar a ficha.</div>';return}
 const s=sub(cod),reg=$("#gr").value,op=$("#go").value,exp=op==="exp",imp=op==="imp";
 const mcz=!!munAtual(),mc=mcz?macOpts(s):[],mrow=mcz?(mc.find(x=>x.c===$("#gmc").value)||macDef(mc)):null;
 const V=+$("#gv").value||0,M=Math.min(+$("#gm").value||0,V),iss=mrow?mrow.a/100:(+$("#gi").value||0)/100,margem=(+$("#gmg").value||0)/100,tom=$("#gto").value;
 const temFolha=$("input[name=gf]:checked").value==="1",rbt=+$("#grb").value||0,folha=temFolha?(+$("#gfo").value||0):0,enc=temFolha?(+$("#ge").value||0)/100:0;
 const fatorR=rbt>0?folha/rbt:0,anCat=anexoDe(s),an=anCat==="R"?(fatorR>=.28?"III":"V"):anCat;
 const o=cclOpts(r),ccl=$("#gk").value||o[0]||"000001",rd=redNum(ccl),ibsFull=(+$("#gib").value||0)/100;
 const ind=D.I[r[4]]||[],nb=nbsList(cod),pr=presuncao(s);
 // cálculos sempre disponíveis para a ficha
 const snRf=anCat==="X"?null:simples(an,rbt,V,exp,fatorR),lpRf=presumido(s,V,M,iss,exp,fatorR,$("#gob").value==="o",enc),lrRf=real(s,V,M,iss,exp,fatorR,margem,enc);
 let H=ficha(cod,r,s,{V,M,iss,exp,imp,an,anCat,fatorR,snR:snRf,lpR:lpRf,lrR:lrRf,ccl,rd,o,ind,nb,pr:$("#gob").value==="o"?{i:.08,c:.12,t:pr.t}:pr,enc,temFolha,mrow,tom});
  H=`<div id="sec-ficha">${H}</div>`;
 H+=`<div id="sec-enq">${enquadramento(s,anCat,an,{})}</div>`;
 H+=`<div id="sec-ded">`+deducoes(s,{cod,exp,an,anCat,rd,ccl,M,V,FICHA:window.MODO!=="sim",tom});
 H+=`</div><div id="sec-mun">`;
 if(!imp){if(mcz)H+=macBloco(s,mrow);else H+=`<div class="box ficha"><h3>ISS em ${esc(UFS[$("#guf").value]||$("#guf").value)} · município sem lista oficial carregada</h3><p class="note">Alíquota informada: <span class="al">${pct(iss)}</span>. O código municipal de serviço, a retenção pelo tomador e eventuais presunções de material dependem da lei do município (LC 116, arts. 8º e 8º-A: entre 2% e 5%). A lista oficial desse município pode ser incluída como a de Maceió.</p></div>`}
 H+=`</div><div id="sec-det">`;
 /* 1. resumo */
 H+=`<details class="det"${window.MODO==="sim"?" open":""}><summary>Detalhamento completo (resumo, códigos, cada regime, operação, benefícios e base legal)</summary>`;
 H+=`<div class="box"><h3>${fmtC(cod)} · ${esc(D.items[cod.slice(0,2)]||"")}</h3><p style="margin:0 0 8px">${esc(dd(r[1]))}</p>
 <div class="kv"><div>Incidência do ISS</div><div>${esc(locISS(r[2]))}</div><div>Responsável pelo ISS (tomador PJ)</div><div>${RESP.has(s)?'<span class="pill warn">SIM</span> LC 116, art. 6º, §2º, II':"Não pela LC 116 (lei municipal pode prever)"}</div><div>Base do ISS</div><div>${esc(issBase(s))}</div><div>Alíquota do ISS</div><div>${esc(issAliq(s))}</div><div>Local de incidência IBS/CBS</div><div>${esc(LOCI[r[5]]||r[5]||"—")}</div><div>Simples Nacional</div><div>${anCat==="X"?'<span class="pill err">VEDADO</span>':`<b>${SN[an].nome}</b>`}${anCat==="R"?` · Fator R ${pct(fatorR)} ${fatorR>=.28?'<span class="pill ok">≥ 28%</span>':'<span class="pill warn">&lt; 28%</span>'}`:""}</div><div>Presunção (Lucro Presumido)</div><div>${esc(pr.t)}</div></div></div>`;
 /* 2. códigos obrigatórios */
 const camp=[["cTribNac",cod],["cNBS",nb.length?`${nb.length} NBS possíveis no subitem (ex.: ${nbsF(nb[0][0])})`:"consultar Anexo VI"],["cIndOp",ind.join(" ou ")||"conforme Anexo VIII"],["CST IBS/CBS",ccl.slice(0,3)],["cClassTrib",`${ccl} · ${red(ccl)}`],["tribISSQN / tpRetISSQN",exp?"Não incidência (exportação)":RESP.has(s)?"Operação tributável / ISS retido pelo tomador":"Operação tributável / não retido (salvo lei municipal)"],["CST PIS/COFINS",exp?"Isenta / não incidência (exportação)":reg==="lr"?"Não cumulativo":"Cumulativo (01) ou Simples (49/99)"],["xDescServ","Descrição detalhada; em obra, citar CNO/CEI e endereço"],["cLocPrestacao",exp?"Município/país do exterior":"Município da prestação"]];
 if(r[3]==="O")camp.push(["Grupo OBRA","cObra (CNO/CEI), cCIB e endereço da obra — obrigatório"]);
 if(r[3]==="E")camp.push(["Grupo atvEvento","Atividade/evento — obrigatório"]);
 H+=`<div class="box"><h3>Códigos e campos obrigatórios na DPS / NFS-e Nacional</h3><div class="kv">${camp.map(c=>`<div>${esc(c[0])}</div><div><b>${esc(c[1])}</b></div>`).join("")}</div>
 <h3 style="margin-top:12px">cClassTrib possíveis (1º = padrão)</h3>${tabela(o.map(c=>`<tr><td><b>${c}</b></td><td class="n">${c.slice(0,3)}</td><td class="n">${esc((D.cls[c]||[""])[0])}</td><td class="n">${esc(red(c))}</td></tr>`).join("")||"<tr><td colspan=4>Sem cClassTrib no Anexo VIII para este serviço.</td></tr>",["Código","CST","Nome","Redução"])}
 <details style="margin-top:8px"><summary style="cursor:pointer;font-size:13px">NBS deste subitem (${nb.length})</summary>${tabela(nb.slice(0,120).map(x=>`<tr><td><b>${nbsF(x[0])}</b></td><td class="n" style="text-align:left">${esc(dd(x[1]))}</td><td class="n">${esc((D.I[x[2]]||[])[0]||"")}</td><td class="n">${esc((D.L[x[3]]||[]).join(", "))}</td></tr>`).join(""),["NBS","Descrição","cIndOp","cClassTrib"])}</details></div>`;
 /* 3-5. regimes */
 const show=x=>reg==="all"||reg===x;
 let snR=null,lpR=null,lrR=null;
 if(show("sn")){
  if(anCat==="X")H+=`<div class="box"><h3>Simples Nacional</h3><span class="pill err">VEDADO</span> ${esc(BASE_SN.X)}</div>`;
  else{snR=simples(an,rbt,V,exp,fatorR);
   H+=`<div class="box"><h3>Simples Nacional · ${SN[an].nome} · ${snR.i+1}ª faixa</h3><div class="kv"><div>Enquadramento</div><div>${esc(BASE_SN[anCat])}</div>${anCat==="R"?`<div>Fator R</div><div>${fmt(folha)} ÷ ${fmt(rbt)} = <b>${pct(fatorR)}</b> → ${SN[an].nome}${fatorR<.28?`. Faltam <b>${fmt(Math.max(0,.28*rbt-folha))}</b> de folha anual para o Anexo III.`:""}</div>`:""}<div>Alíquota nominal / parcela a deduzir</div><div>${pct(snR.nom)} / ${fmt(snR.pd)}</div><div>Alíquota efetiva</div><div><b>${pct(snR.ef)}</b> = (RBT12 × ${pct(snR.nom)} − ${fmt(snR.pd)}) ÷ RBT12${snR.ajuste}</div>${snR.acima?'<div>Limite</div><div><span class="pill err">RBT12 acima de R$ 4,8 milhões: exclusão do Simples (art. 3º, II).</span></div>':snR.sublimite?'<div>Sublimite</div><div><span class="pill warn">RBT12 acima de R$ 3,6 milhões: ISS e ICMS recolhidos fora do DAS (art. 19 e 20).</span></div>':""}</div>
   ${tabela(snR.linhas.map(l=>`<tr><td>${l[0]}${exp&&l[2]===0&&["COFINS","PIS","ISS"].includes(l[0])?" (exportação: não incide)":""}</td><td class="n">${pct(l[1])}</td><td class="n">${fmt(l[2])}</td></tr>`).join("")+(snR.cppFora?`<tr><td>CPP fora do DAS (20% + RAT 2% s/ folha proporcional)</td><td class="n">22% da folha</td><td class="n">${fmt(snR.cppFora)}</td></tr>`:"")+`<tr><th>Total</th><th class="n">${pct(V?(snR.tot+snR.cppFora)/V:0)}</th><th class="n">${fmt(snR.tot+snR.cppFora)}</th></tr>`,["Tributo no DAS","Alíquota efetiva","Valor"])}
   <p class="note">Repartição da LC 123, Anexo ${an}. ${an==="IV"?"No Anexo IV a CPP não está no DAS; a empresa recolhe 20% + RAT sobre a folha, dispensada das contribuições a terceiros (art. 13, §3º).":"A CPP (INSS patronal) está dentro do DAS; a empresa não paga 20% sobre a folha nem terceiros (art. 13, VI e §3º)."} Em 2027 a CBS substitui PIS/COFINS no DAS e, a partir de 2029, o IBS substitui gradualmente o ISS.</p></div>`}}
 if(show("lp")){lpR=presumido(s,V,M,iss,exp,fatorR,$("#gob").value==="o",enc);
  H+=`<div class="box"><h3>Lucro Presumido</h3>${tabela(lpR.L.map(l=>`<tr><td>${l[0]}</td><td class="n">${fmt(l[1])}</td><td class="n">${pct(l[2])}</td><td class="n">${fmt(l[3])}</td></tr>`).join("")+`<tr><th>Total</th><th></th><th class="n">${pct(V?lpR.tot/V:0)}</th><th class="n">${fmt(lpR.tot)}</th></tr>`,["Tributo","Base","Alíquota","Valor"])}
  <p class="note">${esc(pr.t)} Apuração trimestral (Lei 9.430, art. 25); o adicional de 10% foi estimado tratando a nota como receita mensal (limite R$ 60 mil por trimestre). Receita bruta anual máxima: R$ 78 milhões (Lei 9.718, art. 13).${exp?" Exportação: ISS, PIS e COFINS zerados.":""}</p></div>`}
 if(show("lr")){lrR=real(s,V,M,iss,exp,fatorR,margem,enc);
  H+=`<div class="box"><h3>Lucro Real</h3>${tabela(lrR.L.map(l=>`<tr><td>${l[0]}</td><td class="n">${fmt(l[1])}</td><td class="n">${pct(l[2])}</td><td class="n">${fmt(l[3])}</td></tr>`).join("")+`<tr><th>Total</th><th></th><th class="n">${pct(V?lrR.tot/V:0)}</th><th class="n">${fmt(lrR.tot)}</th></tr>`,["Tributo","Base","Alíquota","Valor"])}
  <p class="note">IRPJ e CSLL sobre o lucro contábil ajustado (LALUR); aqui estimado pela margem informada. PIS/COFINS não cumulativos permitem crédito sobre insumos, energia, aluguel e depreciação (Leis 10.637 e 10.833, art. 3º) — a folha de salários não gera crédito. Prejuízo fiscal compensável até 30% do lucro (Lei 9.065, art. 15).</p></div>`}
 /* 6. IBS/CBS */
 const cb=V*.009*(1-rd),ib=V*.001*(1-rd),full=V*ibsFull*(1-rd);
 H+=`<div class="box"><h3>IBS e CBS · cClassTrib ${ccl} (${esc(red(ccl))})</h3><div class="kv"><div>2026 (teste)</div><div>CBS 0,9% = ${fmt(cb)} · IBS 0,1% = ${fmt(ib)} — compensáveis com PIS/COFINS; dispensado o recolhimento se as obrigações acessórias forem cumpridas (LC 214, art. 348, §1º).</div><div>Estimativa cheia (2033)</div><div>${pct(ibsFull*(1-rd))} sobre a nota = <b>${fmt(full)}</b>, antes dos créditos de insumos. Alíquota de referência ainda não fixada pelo Senado; ajuste o campo.</div><div>Crédito do tomador</div><div>${exp?"Exportação imune: sem débito, crédito mantido.":"Tomador no regime regular credita o valor destacado. Optante do Simples só transfere crédito se apurar IBS/CBS pelo regime regular (art. 41)."}</div></div>
 <div class="steps"><div class="step"><b>2026</b>CBS 0,9% + IBS 0,1% (teste)</div><div class="step"><b>2027</b>CBS cheia; PIS/COFINS extintos; IBS 0,1%</div><div class="step"><b>2029–2032</b>IBS sobe 10%/ano; ISS e ICMS caem na mesma proporção</div><div class="step"><b>2033</b>Só IBS e CBS; fim do ISS</div></div></div>`;
 /* 7. operação */
 const OT=opTexto(op,s,r);
 H+=`<div class="box"><h3>${op==="exp"?"Exportação de serviço":op==="imp"?"Importação de serviço (tomador no Brasil)":"Operação nacional"}</h3>${OT.map(t=>`<div class="f"><span class="pill info" style="min-width:120px;text-align:center">${esc(t[0])}</span><div>${esc(t[1])}</div></div>`).join("")}`;
 if(imp){const impL=[["ISS (tomador responsável)",V*iss],["PIS-Importação 1,65%",V*.0165],["COFINS-Importação 7,6%",V*.076],["IRRF 15% (25% se paraíso fiscal)",V*.15],["IOF-Câmbio 0,38%",V*.0038],["CIDE 10% (só com tecnologia/assistência técnica)",0]];
  H+=tabela(impL.map(l=>`<tr><td>${l[0]}</td><td class="n">${fmt(l[1])}</td></tr>`).join("")+`<tr><th>Custo tributário estimado da importação</th><th class="n">${fmt(impL.reduce((a,l)=>a+l[1],0))}</th></tr>`,["Tributo sobre a remessa","Valor"])+`<p class="note">Bases simplificadas (sem o gross-up do IRRF nem o ISS na base das contribuições). O IRRF pode ser reduzido por tratado; a CIDE depende da natureza do contrato.</p>`}
 H+=`</div>`;
 /* 8. benefícios */
 H+=`<div class="box"><h3>Benefícios, reduções, deduções e créditos</h3>${beneficios(s,r,o,anCat,fatorR,M).map(b=>`<div class="f"><span class="pill ok">✓</span><div><b>${esc(b[0])}.</b> ${esc(b[1])}</div></div>`).join("")}</div>`;
 /* 9. base legal */
 H+=`<div class="box"><h3>Base legal deste serviço</h3><div class="kv">${baseLegal(s,r,anCat,o).map(l=>`<div>${LG(esc(l[0]))}</div><div>${LG(l[1])}</div>`).join("")}</div></div>`;
 H+=`</details>`;
 H+=`</div><div id="sec-plan">`;
 /* 10. planejamento */
 if(reg==="all"&&window.MODO==="sim"){
  const rows=[];if(snR)rows.push(["Simples Nacional · "+SN[an].nome,snR.tot+snR.cppFora]);if(lpR)rows.push(["Lucro Presumido",lpR.tot]);if(lrR)rows.push(["Lucro Real",lrR.tot]);
  const best=rows.reduce((a,b)=>b[1]<a[1]?b:a,rows[0]);
  const rec=[];
  if(anCat==="R"&&fatorR<.28)rec.push(`Fator R: faltam ${fmt(Math.max(0,.28*rbt-folha))} de folha anual (pró-labore conta) para sair do Anexo V (${pct(SN.V.fx[faixa(SN.V,rbt)][1])} nominal) e ir ao Anexo III (${pct(SN.III.fx[faixa(SN.III,rbt)][1])} nominal). Compare o custo do pró-labore (INSS 11% + IRPF) com a economia no DAS.`);
  if(anCat==="R"&&fatorR>=.28)rec.push(`Mantenha o Fator R acima de 28% em todos os meses (cálculo com 12 meses móveis): uma queda pontual de folha joga a receita do mês no Anexo V.`);
  if(lpR&&lrR)rec.push(margem<.32?`Com margem de ${pct(margem)} (abaixo da presunção de ${pct(pr.i)}) o Lucro Real tributa menos IRPJ/CSLL, mas PIS/COFINS sobem para 9,25%; o ponto de equilíbrio depende dos créditos de insumos (${fmt(M)} informados).`:`Com margem de ${pct(margem)} (acima da presunção de ${pct(pr.i)}) o Lucro Presumido costuma vencer: paga IRPJ/CSLL sobre ${pct(pr.i)} da receita e PIS/COFINS de 3,65%.`);
  if((s==="07.02"||s==="07.05")&&!M)rec.push("Obras: destaque os materiais fornecidos na nota — saem da base do ISS (art. 7º, §2º, I) e, se forem todos os materiais, baixam a presunção para 8%/12%.");
  if(!exp)rec.push("Clientes no exterior? A exportação do serviço zera ISS, PIS e COFINS e é imune ao IBS/CBS; só IRPJ/CSLL permanecem. Exija contrato, invoice e contrato de câmbio.");
  if(snR&&!exp)rec.push("Vende para empresas no regime regular? A partir de 2027 o cliente vai preferir fornecedor que transfira crédito cheio de IBS/CBS: avalie apurar IBS/CBS pelo regime regular dentro do Simples (LC 214, art. 41) ou migrar para o Presumido.");
  if(snR&&rbt>3600000)rec.push("RBT12 acima do sublimite de R$ 3,6 milhões: ISS fora do DAS; acima de R$ 4,8 milhões há exclusão. Simule o Presumido antes de estourar o limite.");
  if(temFolha&&an!=="IV"&&snR)rec.push(`A CPP de ${fmt(V*fatorR*.2)} (20% da folha proporcional) já está dentro do DAS; fora do Simples ela custaria mais ${fmt(V*fatorR*enc)} em encargos.`);
  rec.push("Revise o cClassTrib: uma redução indevida gera auto de infração; uma redução não aplicada é imposto pago a mais sem ressarcimento automático.");
  H+=`<div class="box"><h3>Planejamento tributário · comparativo para esta nota</h3>${tabela(rows.map(x=>`<tr${x===best?' class="best"':""}><td${x===best?' class="best"':""}>${x[0]}${x===best?' <span class="pill ok">menor carga</span>':""}</td><td class="n${x===best?" best":""}">${pct(V?x[1]/V:0)}</td><td class="n${x===best?" best":""}">${fmt(x[1])}</td><td class="n${x===best?" best":""}">${x===best?"—":"+"+fmt(x[1]-best[1])}</td></tr>`).join(""),["Regime","Carga efetiva","Tributos","Diferença"])}
  <h3 style="margin-top:12px">Recomendações</h3>${rec.map((t,i)=>`<div class="f"><span class="pill info">${i+1}</span><div>${esc(t)}</div></div>`).join("")}
  <p class="note">Comparativo da carga sobre a nota informada, com encargos de folha proporcionais à receita (folha ÷ RBT12). Não inclui IRRF/CSRF retidos (antecipações), taxas, nem o IBS/CBS de 2026 (compensado). Confirme o enquadramento do CNAE, a lei municipal e o histórico de 12 meses antes de decidir.</p></div>`}
 H+=`<p class="note">Ferramenta de apoio. Confirme as regras na legislação vigente e no emissor da prefeitura antes de emitir ou declarar. Dados: ${esc(D.fontes)}.</p>`;
 H+=`</div>`;
 const SUB=[["sec-ficha","Ficha"],["sec-enq","Simples · MEI"],["sec-ded","Deduções e retenções"],["sec-mun","ISS do município"],["sec-det","Detalhamento"],["sec-plan","Planejamento"]].filter(x=>x[0]!=="sec-plan"||(reg==="all"&&window.MODO==="sim"));
 H=`<nav class="subnav noprint">${SUB.map(x=>`<a href="#${x[0]}" data-sec="${x[0]}">${x[1]}</a>`).join("")}</nav>`+H;
 out.innerHTML=H;
 out.querySelectorAll(".subnav a").forEach(a=>a.onclick=e=>{e.preventDefault();const t=document.getElementById(a.dataset.sec);if(!t)return;const d=t.querySelector("details.det");if(d)d.open=true;t.scrollIntoView({behavior:"smooth",block:"start"});out.querySelectorAll(".subnav a").forEach(x=>x.classList.toggle("on",x===a))});
 document.querySelectorAll(".legend .modes button").forEach(b=>b.onclick=()=>{const t=$("#ftab");t.classList.remove("m-al","m-vl");if(b.dataset.m!=="ambos")t.classList.add("m-"+b.dataset.m);document.querySelectorAll(".legend .modes button").forEach(x=>x.classList.toggle("on",x===b))});
}
