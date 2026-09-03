const $ = (id) => document.getElementById(id);

const els = {
  canvas:$('skyCanvas'), title:$('titleInput'), message:$('messageInput'), location:$('locationInput'),
  lat:$('latInput'), lon:$('lonInput'), date:$('dateInput'), time:$('timeInput'), tz:$('tzInput'),
  font:$('fontInput'), size:$('sizeInput'), constellation:$('constellationToggle'), grid:$('gridToggle'),
  sunStyle:$('sunStyle'), moonStyle:$('moonStyle'), planetsStyle:$('planetsStyle'),
  poster:$('poster'), status:$('statusText'), format:$('formatText'), results:$('locationResults'),
  locationBtn:$('locationBtn'), previewDownload:$('previewDownloadBtn'), buy:$('buyBtn'), toast:$('toast'), email:$('emailInput')
};

const palette = {
  midnight:{bg:'#10182e',fg:'#f5ead5'}, black:{bg:'#101010',fg:'#f3efe8'}, ivory:{bg:'#eee8dc',fg:'#22231f'},
  terracotta:{bg:'#9b4f3f',fg:'#f7e8d7'}, forest:{bg:'#173a31',fg:'#eee4cf'}
};
let currentTheme='midnight', stars=[], constellationLines=[], renderedStars=[], renderedLines=[];
let secureDownloadUrl=localStorage.getItem('mcc-download-url') || '';

function toast(message){els.toast.textContent=message;els.toast.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>els.toast.classList.remove('show'),4200);}
function rad(d){return d*Math.PI/180;} function deg(r){return r*180/Math.PI;} function norm360(d){return((d%360)+360)%360;}
function dateUTC(){const[y,m,d]=els.date.value.split('-').map(Number),[hh,mm]=els.time.value.split(':').map(Number),offset=Number(els.tz.value);return new Date(Date.UTC(y,m-1,d,hh-offset,mm,0));}
function julianDate(date){return date.getTime()/86400000+2440587.5;}
function gmst(date){const jd=julianDate(date),T=(jd-2451545)/36525;return norm360(280.46061837+360.98564736629*(jd-2451545)+.000387933*T*T-T*T*T/38710000);}
function horizontal(ra,dec,date,lat,lon){const H=rad(norm360(gmst(date)+lon-ra)),dr=rad(dec),lr=rad(lat),sinAlt=Math.sin(dr)*Math.sin(lr)+Math.cos(dr)*Math.cos(lr)*Math.cos(H),alt=Math.asin(Math.max(-1,Math.min(1,sinAlt))),y=-Math.sin(H)*Math.cos(dr),x=Math.sin(dr)*Math.cos(lr)-Math.cos(dr)*Math.sin(lr)*Math.cos(H);return{alt:deg(alt),az:norm360(deg(Math.atan2(y,x)))}};
function project(ra,dec,w,h){const p=horizontal(ra,dec,dateUTC(),Number(els.lat.value),Number(els.lon.value));if(p.alt<0)return null;const R=Math.min(w,h)*.48,r=(90-p.alt)/90*R,a=rad(p.az);return{x:w/2+r*Math.sin(a),y:h/2-r*Math.cos(a),alt:p.alt,az:p.az};}

function drawSky(){
  const c=els.canvas,ctx=c.getContext('2d'),w=c.width,h=c.height,p=palette[currentTheme];ctx.clearRect(0,0,w,h);ctx.fillStyle=p.bg;ctx.fillRect(0,0,w,h);renderedStars=[];renderedLines=[];
  if(els.grid.checked){ctx.strokeStyle=p.fg+'22';ctx.lineWidth=1;[.25,.5,.75].forEach(k=>{ctx.beginPath();ctx.arc(w/2,h/2,w*.48*k,0,Math.PI*2);ctx.stroke();});for(let a=0;a<360;a+=45){const ar=rad(a),R=w*.48;ctx.beginPath();ctx.moveTo(w/2,h/2);ctx.lineTo(w/2+R*Math.sin(ar),h/2-R*Math.cos(ar));ctx.stroke();}}
  if(els.constellation.checked&&constellationLines.length){ctx.strokeStyle=p.fg+'38';ctx.lineWidth=1.25;const drawSegment=seg=>{if(seg.length<2)return;ctx.beginPath();ctx.moveTo(seg[0].x,seg[0].y);for(let i=1;i<seg.length;i++)ctx.lineTo(seg[i].x,seg[i].y);ctx.stroke();renderedLines.push(seg);};for(const line of constellationLines){let segment=[];for(const[ra,dec]of line){const q=project(ra,dec,w,h);if(q)segment.push(q);else{drawSegment(segment);segment=[];}}drawSegment(segment);}}
  ctx.fillStyle=p.fg;for(const star of stars){const q=project(star.ra,star.dec,w,h);if(!q)continue;const size=Math.max(.65,4.9-star.mag*.7);ctx.globalAlpha=Math.min(1,.35+(6-star.mag)*.11);ctx.beginPath();ctx.arc(q.x,q.y,size,0,Math.PI*2);ctx.fill();if(star.mag<1.2){ctx.globalAlpha=.22;ctx.beginPath();ctx.arc(q.x,q.y,size*2.8,0,Math.PI*2);ctx.fill();}renderedStars.push({x:q.x,y:q.y,r:size,mag:star.mag});}
  ctx.globalAlpha=1;els.status.textContent=stars.length?`${renderedStars.length.toLocaleString('pt-BR')} estrelas acima do horizonte`:'Catálogo indisponível — prévia simplificada';
}

function formatCoord(v,pos,neg){return`${Math.abs(v).toFixed(4)}° ${v>=0?pos:neg}`;}
function formatDatePt(){const[y,m,d]=els.date.value.split('-').map(Number),months=['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'];return`${d} DE ${months[m-1]} DE ${y} · ${els.time.value}`;}
function updateCopy(){
  $('posterTitle').textContent=(els.title.value||'SEU MOMENTO').toUpperCase();$('posterMessage').textContent=(els.message.value||'ESCRITO NAS ESTRELAS').toUpperCase();$('posterPlace').textContent=(els.location.value||'LOCAL ESPECIAL').toUpperCase();$('posterDate').textContent=formatDatePt();$('posterCoords').textContent=`${formatCoord(Number(els.lat.value),'N','S')} · ${formatCoord(Number(els.lon.value),'L','O')}`;els.format.textContent=els.size.value==='60'?'42,4 × 60 cm':els.size.value;els.poster.style.aspectRatio={A4:'210/297',A3:'297/420','60':'424/600'}[els.size.value]||'210/297';
}
function render(){updateCopy();drawSky();}

async function loadSkyData(){try{const[s,l]=await Promise.all([fetch('/data/stars.6.json').then(r=>{if(!r.ok)throw new Error();return r.json()}),fetch('/data/constellations.lines.json').then(r=>{if(!r.ok)throw new Error();return r.json()})]);stars=s.features.map(f=>({ra:f.geometry.coordinates[0],dec:f.geometry.coordinates[1],mag:Number(f.properties.mag)}));const lines=[];(l.features||[]).forEach(f=>{const g=f.geometry;if(g.type==='LineString')lines.push(g.coordinates);if(g.type==='MultiLineString')g.coordinates.forEach(x=>lines.push(x));});constellationLines=lines;render();}catch{stars=demoStars();constellationLines=[];render();toast('A prévia abriu em modo simplificado. O catálogo local não carregou.');}}
function demoStars(){const a=[];let seed=918273;const rnd=()=>{seed=(seed*1664525+1013904223)%4294967296;return seed/4294967296};for(let i=0;i<900;i++)a.push({ra:rnd()*360,dec:deg(Math.asin(rnd()*2-1)),mag:1+rnd()*5});return a;}

async function searchLocation(){const q=els.location.value.trim();if(q.length<2)return;els.locationBtn.disabled=true;els.locationBtn.textContent='…';try{const r=await fetch(`/api/geocode?q=${encodeURIComponent(q)}`),data=await r.json();if(!r.ok)throw new Error(data.error||'Falha na busca');els.results.innerHTML='';if(!data.length){toast('Não encontrei esse lugar. Tente cidade + estado.');return;}data.forEach(item=>{const b=document.createElement('button');b.type='button';b.className='result-item';b.textContent=item.label;b.onclick=()=>{els.location.value=item.label;els.lat.value=Number(item.lat).toFixed(4);els.lon.value=Number(item.lon).toFixed(4);els.results.hidden=true;render();};els.results.appendChild(b);});els.results.hidden=false;}catch(e){toast(e.message||'Não foi possível buscar a localização.');}finally{els.locationBtn.disabled=false;els.locationBtn.textContent='⌕';}}

function escapeXml(s){return String(s).replace(/[<>&'\"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','\"':'&quot;'}[c]));}
function posterSpec(){return{w:990,h:1400};}
function makeSvg(){
  const{w,h}=posterSpec(),p=palette[currentTheme],mapSize=Math.min(w*.76,h*.57),cx=w/2,cy=h*.34,R=mapSize/2,lat=Number(els.lat.value),lon=Number(els.lon.value),date=dateUTC();
  const pr=(ra,dec)=>{const z=horizontal(ra,dec,date,lat,lon);if(z.alt<0)return null;const rr=(90-z.alt)/90*R*.965,a=rad(z.az);return{x:cx+rr*Math.sin(a),y:cy-rr*Math.cos(a)}};
  let grid='';if(els.grid.checked)[.25,.5,.75].forEach(k=>grid+=`<circle cx="${cx}" cy="${cy}" r="${R*.965*k}" fill="none" stroke="${p.fg}" stroke-opacity=".12" stroke-width="1"/>`);
  let lines='';if(els.constellation.checked)constellationLines.forEach(line=>{let pts=[];const flush=()=>{if(pts.length>1)lines+=`<polyline points="${pts.map(q=>`${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(' ')}" fill="none" stroke="${p.fg}" stroke-opacity=".22" stroke-width="1"/>`;pts=[]};line.forEach(([ra,dec])=>{const q=pr(ra,dec);if(q)pts.push(q);else flush()});flush();});
  let dots='';stars.forEach(s=>{const q=pr(s.ra,s.dec);if(!q)return;const rr=Math.max(.5,(4.9-s.mag*.7)*w/1200),op=Math.min(1,.35+(6-s.mag)*.11);dots+=`<circle cx="${q.x.toFixed(1)}" cy="${q.y.toFixed(1)}" r="${rr.toFixed(2)}" fill="${p.fg}" fill-opacity="${op.toFixed(2)}"/>`;});
  const font=els.font.value==='serif'?"'Cormorant Garamond', Georgia, serif":els.font.value==='modern'?"Montserrat, Arial, sans-serif":"Inter, Arial, sans-serif",title=escapeXml((els.title.value||'SEU MOMENTO').toUpperCase()),msg=escapeXml((els.message.value||'ESCRITO NAS ESTRELAS').toUpperCase()),place=escapeXml((els.location.value||'LOCAL ESPECIAL').toUpperCase()),dateText=escapeXml(formatDatePt()),coords=escapeXml(`${formatCoord(lat,'N','S')} · ${formatCoord(lon,'L','O')}`),y0=h*.755;
  return`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="100%" height="100%" fill="${p.bg}"/><defs><clipPath id="sky"><circle cx="${cx}" cy="${cy}" r="${R}"/></clipPath></defs><circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${p.fg}" stroke-width="1.5"/><g clip-path="url(#sky)">${grid}${lines}${dots}<!--CELESTIAL_OBJECTS--></g><circle cx="${cx}" cy="${cy}" r="${R*.94}" fill="none" stroke="${p.fg}" stroke-opacity=".24" stroke-width="1"/><g fill="${p.fg}" text-anchor="middle"><text x="${cx}" y="${y0}" font-family="${font}" font-size="${w*.058}" letter-spacing="${w*.007}" font-weight="500">${title}</text><text x="${cx}" y="${y0+h*.045}" font-family="Inter,Arial" font-size="${w*.014}" letter-spacing="${w*.003}" opacity=".78">${msg}</text><line x1="${w*.31}" y1="${y0+h*.082}" x2="${w*.47}" y2="${y0+h*.082}" stroke="${p.fg}" opacity=".35"/><text x="${cx}" y="${y0+h*.087}" font-size="${w*.012}">✦</text><line x1="${w*.53}" y1="${y0+h*.082}" x2="${w*.69}" y2="${y0+h*.082}" stroke="${p.fg}" opacity=".35"/><text x="${cx}" y="${y0+h*.125}" font-family="Inter,Arial" font-size="${w*.018}" letter-spacing="${w*.003}">${place}</text><text x="${cx}" y="${y0+h*.157}" font-family="Inter,Arial" font-size="${w*.013}" opacity=".74">${dateText}</text><text x="${cx}" y="${y0+h*.184}" font-family="Inter,Arial" font-size="${w*.012}" opacity=".7">${coords}</text></g></svg>`;
}
function downloadBlob(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1200);}
async function svgToPng(svg,width,height){const blob=new Blob([svg],{type:'image/svg+xml;charset=utf-8'}),url=URL.createObjectURL(blob),img=new Image();await new Promise((res,rej)=>{img.onload=res;img.onerror=rej;img.src=url});const c=document.createElement('canvas');c.width=width;c.height=height;c.getContext('2d').drawImage(img,0,0,width,height);URL.revokeObjectURL(url);return await new Promise(res=>c.toBlob(res,'image/png',1));}
async function downloadPreview(){try{const svg=makeSvg(),png=await svgToPng(svg,990,1400);downloadBlob(png,'minha-carta-celeste-previa.png');}catch{toast('Não consegui gerar a prévia.');}}

function getDesign(){return{title:els.title.value,message:els.message.value,location:els.location.value,lat:Number(els.lat.value),lon:Number(els.lon.value),date:els.date.value,time:els.time.value,tz:Number(els.tz.value),font:els.font.value,size:els.size.value,theme:currentTheme,constellations:els.constellation.checked,grid:els.grid.checked,sunStyle:els.sunStyle.value,moonStyle:els.moonStyle.value,planetsStyle:els.planetsStyle.value};}
async function buy(){
  if(secureDownloadUrl)return downloadFinal();
  const email=(els.email.value||'').trim();if(!email||!els.email.checkValidity()){els.email.focus();toast('Digite um e-mail válido para receber sua Carta Celeste.');return;}
  els.buy.disabled=true;els.buy.textContent='Abrindo Mercado Pago…';
  try{const r=await fetch('/api/checkout',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,design:getDesign()})}),data=await r.json();if(!r.ok)throw new Error(data.error||'Checkout indisponível');localStorage.setItem('mcc-buyer-email',email);window.location.href=data.url;}catch(e){toast(e.message||'Não foi possível iniciar o pagamento.');els.buy.disabled=false;els.buy.textContent='Comprar arquivo em alta';}
}
async function downloadFinal(){if(!secureDownloadUrl){toast('O arquivo em alta é liberado após o pagamento.');return;}els.buy.disabled=true;els.buy.textContent='Preparando arquivos…';try{const r=await fetch(secureDownloadUrl,{cache:'no-store'});if(!r.ok)throw new Error('Arquivo indisponível');const svg=await r.text();downloadBlob(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}),'minha-carta-celeste-alta.svg');const width=Number((svg.match(/width="(\d+)"/)||[])[1])||2480,height=Number((svg.match(/height="(\d+)"/)||[])[1])||3508;const png=await svgToPng(svg,width,height);if(png)downloadBlob(png,'minha-carta-celeste-alta.png');toast('Sua Carta Celeste foi preparada em SVG e PNG.');}catch(e){toast('Não consegui baixar agora. Use também o link enviado ao seu e-mail.');}finally{els.buy.disabled=false;els.buy.textContent='Baixar arquivos em alta';}}
async function verifyPayment(){
  const p=new URLSearchParams(location.search),state=p.get('payment'),paymentId=p.get('payment_id')||p.get('collection_id');
  if(state==='pending'){toast('Pagamento em processamento. Assim que for aprovado, enviaremos sua Carta por e-mail.');return;}if(state==='failure'){toast('O pagamento não foi concluído. Você pode tentar novamente.');return;}if(state!=='success'||!paymentId)return;
  els.buy.disabled=true;els.buy.textContent='Confirmando pagamento…';
  try{const r=await fetch(`/api/verify?payment_id=${encodeURIComponent(paymentId)}`,{cache:'no-store'}),data=await r.json();if(data.paid&&data.downloadUrl){secureDownloadUrl=data.downloadUrl;localStorage.setItem('mcc-download-url',secureDownloadUrl);els.buy.textContent='Baixar arquivos em alta';toast('Pagamento confirmado. Sua Carta está pronta e o e-mail está sendo enviado.');history.replaceState({},'',location.pathname);}else{toast('O pagamento ainda está sendo confirmado. Você receberá o link por e-mail assim que aprovar.');}}
  catch{toast('Não consegui confirmar pela página, mas o webhook continuará processando o pagamento.');}finally{els.buy.disabled=false;}
}

[els.title,els.message,els.location,els.lat,els.lon,els.date,els.time,els.tz,els.font,els.size,els.constellation,els.grid,els.sunStyle,els.moonStyle,els.planetsStyle].forEach(el=>el.addEventListener(el.tagName==='INPUT'&&el.type==='text'?'input':'change',render));
els.font.addEventListener('change',()=>{els.poster.classList.remove('font-serif','font-modern','font-clean');els.poster.classList.add('font-'+els.font.value)});
document.querySelectorAll('.swatch').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.swatch').forEach(x=>x.classList.remove('active'));b.classList.add('active');currentTheme=b.dataset.theme;els.poster.className=`poster theme-${currentTheme} font-${els.font.value}`;render()}));
els.locationBtn.addEventListener('click',searchLocation);els.location.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();searchLocation();}});document.addEventListener('click',e=>{if(!e.target.closest('.location-wrap'))els.results.hidden=true});els.previewDownload.addEventListener('click',downloadPreview);els.buy.addEventListener('click',buy);
if(localStorage.getItem('mcc-buyer-email'))els.email.value=localStorage.getItem('mcc-buyer-email');if(secureDownloadUrl)els.buy.textContent='Baixar arquivos em alta';updateCopy();loadSkyData();verifyPayment();
