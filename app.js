const $ = (id) => document.getElementById(id);

const els = {
  canvas: $('skyCanvas'), title: $('titleInput'), message: $('messageInput'), location: $('locationInput'),
  lat: $('latInput'), lon: $('lonInput'), date: $('dateInput'), time: $('timeInput'), tz: $('tzInput'),
  font: $('fontInput'), size: $('sizeInput'), constellation: $('constellationToggle'), grid: $('gridToggle'),
  poster: $('poster'), status: $('statusText'), format: $('formatText'), results: $('locationResults'),
  locationBtn: $('locationBtn'), previewDownload: $('previewDownloadBtn'), buy: $('buyBtn'), toast: $('toast')
};

const palette = {
  midnight: { bg: '#10182e', fg: '#f5ead5' }, black: { bg: '#101010', fg: '#f3efe8' },
  ivory: { bg: '#eee8dc', fg: '#22231f' }, terracotta: { bg: '#9b4f3f', fg: '#f7e8d7' },
  forest: { bg: '#173a31', fg: '#eee4cf' }
};

let currentTheme = 'midnight';
let stars = [];
let constellationLines = [];
let renderedStars = [];
let renderedLines = [];
let paidUnlocked = localStorage.getItem('mcc-paid-unlocked') === '1';

function toast(message) {
  els.toast.textContent = message;
  els.toast.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => els.toast.classList.remove('show'), 3600);
}

function pad(n) { return String(n).padStart(2, '0'); }
function rad(d) { return d * Math.PI / 180; }
function deg(r) { return r * 180 / Math.PI; }
function norm360(d) { return ((d % 360) + 360) % 360; }

function dateUTC() {
  const [y,m,d] = els.date.value.split('-').map(Number);
  const [hh,mm] = els.time.value.split(':').map(Number);
  const offset = Number(els.tz.value);
  return new Date(Date.UTC(y, m - 1, d, hh - offset, mm, 0));
}

function julianDate(date) { return date.getTime() / 86400000 + 2440587.5; }
function gmst(date) {
  const jd = julianDate(date);
  const T = (jd - 2451545.0) / 36525;
  return norm360(280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T*T - T*T*T / 38710000);
}

function horizontal(ra, dec, date, lat, lon) {
  const H = rad(norm360(gmst(date) + lon - ra));
  const dr = rad(dec), lr = rad(lat);
  const sinAlt = Math.sin(dr)*Math.sin(lr) + Math.cos(dr)*Math.cos(lr)*Math.cos(H);
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
  const y = -Math.sin(H) * Math.cos(dr);
  const x = Math.sin(dr)*Math.cos(lr) - Math.cos(dr)*Math.sin(lr)*Math.cos(H);
  return { alt: deg(alt), az: norm360(deg(Math.atan2(y, x))) };
}

function project(ra, dec, w, h) {
  const lat = Number(els.lat.value), lon = Number(els.lon.value), date = dateUTC();
  const p = horizontal(ra, dec, date, lat, lon);
  if (p.alt < 0) return null;
  const R = Math.min(w,h) * .48;
  const r = (90 - p.alt) / 90 * R;
  const a = rad(p.az);
  return { x: w/2 + r*Math.sin(a), y: h/2 - r*Math.cos(a), alt:p.alt, az:p.az };
}

function drawSky() {
  const c = els.canvas, ctx = c.getContext('2d');
  const w = c.width, h = c.height;
  const p = palette[currentTheme];
  ctx.clearRect(0,0,w,h);
  ctx.fillStyle = p.bg; ctx.fillRect(0,0,w,h);
  renderedStars = []; renderedLines = [];

  if (els.grid.checked) {
    ctx.strokeStyle = p.fg + '22'; ctx.lineWidth = 1;
    [0.25,0.5,0.75].forEach(k => { ctx.beginPath(); ctx.arc(w/2,h/2,w*.48*k,0,Math.PI*2); ctx.stroke(); });
    for (let a=0;a<360;a+=45) { const ar=rad(a), R=w*.48; ctx.beginPath();ctx.moveTo(w/2,h/2);ctx.lineTo(w/2+R*Math.sin(ar),h/2-R*Math.cos(ar));ctx.stroke(); }
  }

  if (els.constellation.checked && constellationLines.length) {
    ctx.strokeStyle = p.fg + '38'; ctx.lineWidth = 1.25;
    constellationLines.forEach(line => {
      let segment=[];
      line.forEach(([ra,dec]) => {
        const q=project(ra,dec,w,h);
        if(q) segment.push(q); else { drawSegment(segment); segment=[]; }
      });
      drawSegment(segment);
    });
  }
  function drawSegment(seg){
    if(seg.length<2)return;
    ctx.beginPath();ctx.moveTo(seg[0].x,seg[0].y);
    for(let i=1;i<seg.length;i++)ctx.lineTo(seg[i].x,seg[i].y);
    ctx.stroke(); renderedLines.push(seg.map(q=>({x:q.x,y:q.y})));
  }

  ctx.fillStyle = p.fg;
  stars.forEach(star => {
    const q = project(star.ra, star.dec, w, h); if(!q)return;
    const size = Math.max(.65, 4.9 - star.mag*.7);
    ctx.globalAlpha = Math.min(1, .35 + (6-star.mag)*.11);
    ctx.beginPath(); ctx.arc(q.x,q.y,size,0,Math.PI*2); ctx.fill();
    if(star.mag < 1.2){ctx.globalAlpha=.22;ctx.beginPath();ctx.arc(q.x,q.y,size*2.8,0,Math.PI*2);ctx.fill();}
    renderedStars.push({x:q.x,y:q.y,r:size,mag:star.mag});
  });
  ctx.globalAlpha=1;
  els.status.textContent = stars.length ? `${renderedStars.length.toLocaleString('pt-BR')} estrelas visíveis neste horizonte` : 'Catálogo indisponível — usando demonstração';
}

function formatCoord(v, positive, negative) { return `${Math.abs(v).toFixed(4)}° ${v >= 0 ? positive : negative}`; }
function formatDatePt() {
  const [y,m,d] = els.date.value.split('-').map(Number);
  const months=['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'];
  return `${d} DE ${months[m-1]} DE ${y} · ${els.time.value}`;
}
function updateCopy() {
  $('posterTitle').textContent = (els.title.value || 'SEU MOMENTO').toUpperCase();
  $('posterMessage').textContent = (els.message.value || 'ESCRITO NAS ESTRELAS').toUpperCase();
  $('posterPlace').textContent = (els.location.value || 'LOCAL ESPECIAL').toUpperCase();
  $('posterDate').textContent = formatDatePt();
  $('posterCoords').textContent = `${formatCoord(Number(els.lat.value),'N','S')} · ${formatCoord(Number(els.lon.value),'L','O')}`;
  els.format.textContent = els.size.value;
  const ratios={A4:'210/297',A3:'297/420','30x40':'3/4','40x50':'4/5','50x70':'5/7'};
  els.poster.style.aspectRatio=ratios[els.size.value]||'210/297';
}
function render(){updateCopy();drawSky();}

async function loadSkyData(){
  try{
    const [s,l]=await Promise.all([
      fetch('https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data/stars.6.json').then(r=>{if(!r.ok)throw new Error();return r.json()}),
      fetch('https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data/constellations.lines.json').then(r=>{if(!r.ok)throw new Error();return r.json()})
    ]);
    stars=s.features.map(f=>({ra:f.geometry.coordinates[0],dec:f.geometry.coordinates[1],mag:Number(f.properties.mag)}));
    const lines=[];
    (l.features||[]).forEach(f=>{
      const g=f.geometry;
      if(g.type==='LineString')lines.push(g.coordinates);
      if(g.type==='MultiLineString')g.coordinates.forEach(x=>lines.push(x));
    });
    constellationLines=lines; render();
  }catch(e){
    stars=demoStars(); constellationLines=[]; render();
    toast('Não consegui carregar o catálogo completo agora. A prévia está em modo demonstração.');
  }
}
function demoStars(){
  const a=[]; let seed=918273;
  const rnd=()=>{seed=(seed*1664525+1013904223)%4294967296;return seed/4294967296};
  for(let i=0;i<900;i++)a.push({ra:rnd()*360,dec:deg(Math.asin(rnd()*2-1)),mag:1+rnd()*5});
  return a;
}

async function searchLocation(){
  const q=els.location.value.trim(); if(q.length<2)return;
  els.locationBtn.disabled=true; els.locationBtn.textContent='…';
  try{
    const r=await fetch(`/api/geocode?q=${encodeURIComponent(q)}`); const data=await r.json();
    if(!r.ok)throw new Error(data.error||'Falha na busca');
    els.results.innerHTML='';
    if(!data.length){toast('Não encontrei esse lugar. Tente cidade + estado.');return;}
    data.forEach(item=>{
      const b=document.createElement('button');b.type='button';b.className='result-item';b.textContent=item.label;
      b.onclick=()=>{els.location.value=item.label;els.lat.value=Number(item.lat).toFixed(4);els.lon.value=Number(item.lon).toFixed(4);els.results.hidden=true;render();};
      els.results.appendChild(b);
    }); els.results.hidden=false;
  }catch(e){toast(e.message||'Não foi possível buscar a localização.');}
  finally{els.locationBtn.disabled=false;els.locationBtn.textContent='⌕';}
}

function escapeXml(s){return String(s).replace(/[<>&'\"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','\"':'&quot;'}[c]));}
function posterSpec(high=false){
  const sizes={A4:[2480,3508],A3:[3508,4961],'30x40':[3000,4000],'40x50':[3200,4000],'50x70':[3500,4900]};
  let [w,h]=sizes[els.size.value]||sizes.A4;if(!high){const k=1400/h;w=Math.round(w*k);h=1400;}return {w,h};
}
function makeSvg(high=false){
  const {w,h}=posterSpec(high), p=palette[currentTheme], mapSize=Math.min(w*.76,h*.57), cx=w/2, cy=h*.34, R=mapSize/2;
  const lat=Number(els.lat.value),lon=Number(els.lon.value),date=dateUTC();
  const pr=(ra,dec)=>{const z=horizontal(ra,dec,date,lat,lon);if(z.alt<0)return null;const rr=(90-z.alt)/90*R*.965,a=rad(z.az);return{x:cx+rr*Math.sin(a),y:cy-rr*Math.cos(a)}};
  let grid='';if(els.grid.checked){[.25,.5,.75].forEach(k=>grid+=`<circle cx="${cx}" cy="${cy}" r="${R*.965*k}" fill="none" stroke="${p.fg}" stroke-opacity=".12" stroke-width="1"/>`);}
  let lines='';if(els.constellation.checked) constellationLines.forEach(line=>{let pts=[];const flush=()=>{if(pts.length>1)lines+=`<polyline points="${pts.map(q=>`${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(' ')}" fill="none" stroke="${p.fg}" stroke-opacity=".22" stroke-width="${Math.max(1,w/1800)}"/>`;pts=[]};line.forEach(([ra,dec])=>{const q=pr(ra,dec);if(q)pts.push(q);else flush()});flush();});
  let dots='';stars.forEach(s=>{const q=pr(s.ra,s.dec);if(!q)return;const rr=Math.max(w/3000,(4.9-s.mag*.7)*w/1200);const op=Math.min(1,.35+(6-s.mag)*.11);dots+=`<circle cx="${q.x.toFixed(1)}" cy="${q.y.toFixed(1)}" r="${rr.toFixed(2)}" fill="${p.fg}" fill-opacity="${op.toFixed(2)}"/>`;});
  const font=els.font.value==='serif'?"'Cormorant Garamond', Georgia, serif":els.font.value==='modern'?"Montserrat, Arial, sans-serif":"Inter, Arial, sans-serif";
  const title=escapeXml((els.title.value||'SEU MOMENTO').toUpperCase()),msg=escapeXml((els.message.value||'ESCRITO NAS ESTRELAS').toUpperCase()),place=escapeXml((els.location.value||'LOCAL ESPECIAL').toUpperCase());
  const dateText=escapeXml(formatDatePt()),coords=escapeXml(`${formatCoord(lat,'N','S')} · ${formatCoord(lon,'L','O')}`);
  const y0=h*.755;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="100%" height="100%" fill="${p.bg}"/><defs><clipPath id="sky"><circle cx="${cx}" cy="${cy}" r="${R}"/></clipPath></defs><circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${p.fg}" stroke-width="${Math.max(2,w/1200)}"/><g clip-path="url(#sky)">${grid}${lines}${dots}</g><circle cx="${cx}" cy="${cy}" r="${R*.94}" fill="none" stroke="${p.fg}" stroke-opacity=".24" stroke-width="1"/><g fill="${p.fg}" text-anchor="middle"><text x="${cx}" y="${y0}" font-family="${font}" font-size="${w*.058}" letter-spacing="${w*.007}" font-weight="500">${title}</text><text x="${cx}" y="${y0+h*.045}" font-family="Inter,Arial" font-size="${w*.014}" letter-spacing="${w*.003}" opacity=".78">${msg}</text><line x1="${w*.31}" y1="${y0+h*.082}" x2="${w*.47}" y2="${y0+h*.082}" stroke="${p.fg}" opacity=".35"/><text x="${cx}" y="${y0+h*.087}" font-size="${w*.012}">✦</text><line x1="${w*.53}" y1="${y0+h*.082}" x2="${w*.69}" y2="${y0+h*.082}" stroke="${p.fg}" opacity=".35"/><text x="${cx}" y="${y0+h*.125}" font-family="Inter,Arial" font-size="${w*.018}" letter-spacing="${w*.003}">${place}</text><text x="${cx}" y="${y0+h*.157}" font-family="Inter,Arial" font-size="${w*.013}" letter-spacing="${w*.002}" opacity=".74">${dateText}</text><text x="${cx}" y="${y0+h*.184}" font-family="Inter,Arial" font-size="${w*.012}" letter-spacing="${w*.0017}" opacity=".7">${coords}</text></g></svg>`;
}
function downloadBlob(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
async function svgToPng(svg,high=false){
  const {w,h}=posterSpec(high),blob=new Blob([svg],{type:'image/svg+xml;charset=utf-8'}),url=URL.createObjectURL(blob),img=new Image();
  await new Promise((res,rej)=>{img.onload=res;img.onerror=rej;img.src=url});
  const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');ctx.drawImage(img,0,0,w,h);URL.revokeObjectURL(url);
  return await new Promise(res=>c.toBlob(res,'image/png',1));
}
async function downloadPreview(){try{const png=await svgToPng(makeSvg(false),false);downloadBlob(png,'minha-carta-celeste-previa.png');}catch{toast('Não consegui gerar a prévia.');}}
async function downloadFinal(){
  if(!paidUnlocked){toast('O arquivo em alta é liberado depois do pagamento.');return;}
  els.buy.disabled=true;els.buy.textContent='Gerando arquivo…';
  try{const svg=makeSvg(true);downloadBlob(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}),'minha-carta-celeste-alta.svg');const png=await svgToPng(svg,true);downloadBlob(png,'minha-carta-celeste-alta.png');toast('Arquivos em alta gerados: SVG vetorial + PNG.');}
  finally{els.buy.disabled=false;els.buy.textContent='Baixar arquivos em alta';}
}
async function buy(){
  if(paidUnlocked)return downloadFinal();
  els.buy.disabled=true;els.buy.textContent='Abrindo pagamento…';
  try{const r=await fetch('/api/checkout',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({title:els.title.value,size:els.size.value})});const data=await r.json();if(!r.ok)throw new Error(data.error||'Checkout indisponível');window.location.href=data.url;}
  catch(e){toast(e.message||'Não foi possível iniciar o pagamento.');els.buy.disabled=false;els.buy.textContent='Comprar arquivo em alta';}
}
async function verifyPayment(){
  const p=new URLSearchParams(location.search),sid=p.get('session_id');if(p.get('payment')!=='success'||!sid)return;
  try{const r=await fetch(`/api/verify?session_id=${encodeURIComponent(sid)}`),data=await r.json();if(data.paid){paidUnlocked=true;localStorage.setItem('mcc-paid-unlocked','1');els.buy.textContent='Baixar arquivos em alta';toast('Pagamento confirmado. Seus arquivos em alta estão liberados.');history.replaceState({},'',location.pathname);}}
  catch{}
}

[els.title,els.message,els.location,els.lat,els.lon,els.date,els.time,els.tz,els.font,els.size,els.constellation,els.grid].forEach(el=>el.addEventListener(el.tagName==='INPUT'&&el.type==='text'?'input':'change',render));
els.font.addEventListener('change',()=>{els.poster.classList.remove('font-serif','font-modern','font-clean');els.poster.classList.add('font-'+els.font.value)});
document.querySelectorAll('.swatch').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.swatch').forEach(x=>x.classList.remove('active'));b.classList.add('active');currentTheme=b.dataset.theme;els.poster.className=`poster theme-${currentTheme} font-${els.font.value}`;render()}));
els.locationBtn.addEventListener('click',searchLocation);els.location.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();searchLocation();}});document.addEventListener('click',e=>{if(!e.target.closest('.location-wrap'))els.results.hidden=true});
els.previewDownload.addEventListener('click',downloadPreview);els.buy.addEventListener('click',buy);

if(paidUnlocked)els.buy.textContent='Baixar arquivos em alta';
updateCopy();loadSkyData();verifyPayment();
