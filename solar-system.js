// Solar System layer for Minha Carta Celeste.
// Adds the Sun, Moon phases and planets to the existing star map without a build step.
(() => {
  function solveKepler(Mdeg, e) {
    const M = rad(norm360(Mdeg));
    let E = M + e * Math.sin(M) * (1 + e * Math.cos(M));
    for (let i = 0; i < 6; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    return E;
  }

  function orbitalXYZ(el) {
    const E = solveKepler(el.M, el.e);
    const xv = el.a * (Math.cos(E) - el.e);
    const yv = el.a * Math.sqrt(1 - el.e * el.e) * Math.sin(E);
    const v = Math.atan2(yv, xv);
    const r = Math.hypot(xv, yv);
    const N = rad(el.N), i = rad(el.i), vw = v + rad(el.w);
    return {
      x: r * (Math.cos(N) * Math.cos(vw) - Math.sin(N) * Math.sin(vw) * Math.cos(i)),
      y: r * (Math.sin(N) * Math.cos(vw) + Math.cos(N) * Math.sin(vw) * Math.cos(i)),
      z: r * Math.sin(vw) * Math.sin(i),
      r
    };
  }

  function eclipticToEquatorial(x, y, z, d) {
    const eps = rad(23.4393 - 3.563e-7 * d);
    const ye = y * Math.cos(eps) - z * Math.sin(eps);
    const ze = y * Math.sin(eps) + z * Math.cos(eps);
    return { ra: norm360(deg(Math.atan2(ye, x))), dec: deg(Math.atan2(ze, Math.hypot(x, ye))) };
  }

  function solarElements(d) {
    return { N:0, i:0, w:282.9404 + 4.70935e-5*d, a:1, e:0.016709 - 1.151e-9*d, M:356.0470 + 0.9856002585*d };
  }

  function planetElements(name, d) {
    return {
      mercury: { N:48.3313+3.24587e-5*d, i:7.0047+5e-8*d, w:29.1241+1.01444e-5*d, a:0.387098, e:0.205635+5.59e-10*d, M:168.6562+4.0923344368*d },
      venus:   { N:76.6799+2.46590e-5*d, i:3.3946+2.75e-8*d, w:54.8910+1.38374e-5*d, a:0.723330, e:0.006773-1.302e-9*d, M:48.0052+1.6021302244*d },
      mars:    { N:49.5574+2.11081e-5*d, i:1.8497-1.78e-8*d, w:286.5016+2.92961e-5*d, a:1.523688, e:0.093405+2.516e-9*d, M:18.6021+0.5240207766*d },
      jupiter: { N:100.4542+2.76854e-5*d, i:1.3030-1.557e-7*d, w:273.8777+1.64505e-5*d, a:5.20256, e:0.048498+4.469e-9*d, M:19.8950+0.0830853001*d },
      saturn:  { N:113.6634+2.38980e-5*d, i:2.4886-1.081e-7*d, w:339.3939+2.97661e-5*d, a:9.55475, e:0.055546-9.499e-9*d, M:316.9670+0.0334442282*d },
      uranus:  { N:74.0005+1.3978e-5*d, i:0.7733+1.9e-8*d, w:96.6612+3.0565e-5*d, a:19.18171-1.55e-8*d, e:0.047318+7.45e-9*d, M:142.5905+0.011725806*d },
      neptune: { N:131.7806+3.0173e-5*d, i:1.7700-2.55e-7*d, w:272.8461-6.027e-6*d, a:30.05826+3.313e-8*d, e:0.008606+2.15e-9*d, M:260.2471+0.005995147*d }
    }[name];
  }

  function moonEcliptic(d, sun) {
    const N = 125.1228 - 0.0529538083*d;
    const i = 5.1454;
    const w = 318.0634 + 0.1643573223*d;
    const a = 60.2666;
    const e = 0.054900;
    const M = 115.3654 + 13.0649929509*d;
    const xyz = orbitalXYZ({N,i,w,a,e,M});
    let lon = norm360(deg(Math.atan2(xyz.y, xyz.x)));
    let lat = deg(Math.atan2(xyz.z, Math.hypot(xyz.x, xyz.y)));
    let dist = xyz.r;

    const Ms = norm360(sun.M), Ls = norm360(sun.lon), Lm = norm360(M + w + N);
    const D = norm360(Lm - Ls), F = norm360(Lm - N);
    const s = x => Math.sin(rad(x)), c = x => Math.cos(rad(x));

    lon += -1.274*s(M-2*D) + 0.658*s(2*D) - 0.186*s(Ms) - 0.059*s(2*M-2*D)
         - 0.057*s(M-2*D+Ms) + 0.053*s(M+2*D) + 0.046*s(2*D-Ms) + 0.041*s(M-Ms)
         - 0.035*s(D) - 0.031*s(M+Ms) - 0.015*s(2*F-2*D) + 0.011*s(M-4*D);
    lat += -0.173*s(F-2*D) - 0.055*s(M-F-2*D) - 0.046*s(M+F-2*D) + 0.033*s(F+2*D) + 0.017*s(2*M+F);
    dist += -0.58*c(M-2*D) - 0.46*c(2*D);

    const lr = rad(lon), br = rad(lat);
    return { x:dist*Math.cos(lr)*Math.cos(br), y:dist*Math.sin(lr)*Math.cos(br), z:dist*Math.sin(br), lon:norm360(lon) };
  }

  function bodies(date) {
    const d = julianDate(date) - 2451543.5;
    const se = solarElements(d), sunOrbit = orbitalXYZ(se);
    const sunLon = norm360(deg(Math.atan2(sunOrbit.y, sunOrbit.x)));
    const sunEq = eclipticToEquatorial(sunOrbit.x, sunOrbit.y, sunOrbit.z, d);
    const sun = { ...sunEq, kind:'sun', lon:sunLon, M:se.M };

    const moonEc = moonEcliptic(d, sun), moonEq = eclipticToEquatorial(moonEc.x, moonEc.y, moonEc.z, d);
    const elong = norm360(moonEc.lon - sunLon);
    const moon = { ...moonEq, kind:'moon', illumination:(1-Math.cos(rad(elong)))/2, waxing:elong<180 };

    const sizes = {mercury:.92, venus:1.16, mars:1.05, jupiter:1.22, saturn:1.16, uranus:.88, neptune:.84};
    const planets = Object.keys(sizes).map(name => {
      const hp = orbitalXYZ(planetElements(name,d));
      return { ...eclipticToEquatorial(hp.x+sunOrbit.x,hp.y+sunOrbit.y,hp.z+sunOrbit.z,d), kind:'planet', size:sizes[name] };
    });
    return [...planets, sun, moon];
  }

  function colors() {
    const light = currentTheme === 'ivory';
    return { sun:light ? '#333333' : '#ffffff', gray:light ? '#686868' : '#a4a4a4' };
  }

  function phasePoints(cx, cy, r, illumination, waxing, steps=40) {
    const f=Math.max(0,Math.min(1,illumination)), c=2*f-1, pts=[];
    for(let i=0;i<=steps;i++){
      const t=-1+2*i/steps, half=r*Math.sqrt(Math.max(0,1-t*t));
      pts.push([cx+(waxing?half:-half),cy+r*t]);
    }
    for(let i=steps;i>=0;i--){
      const t=-1+2*i/steps, half=r*Math.sqrt(Math.max(0,1-t*t));
      pts.push([cx+(waxing?-c*half:c*half),cy+r*t]);
    }
    return pts;
  }

  function drawCanvas(ctx,w,h,p) {
    const col=colors();
    bodies(dateUTC()).forEach(body=>{
      const q=project(body.ra,body.dec,w,h); if(!q)return;
      if(body.kind==='sun'){
        const r=Math.max(5.2,w*.0062);
        ctx.fillStyle=col.sun;ctx.beginPath();ctx.arc(q.x,q.y,r,0,Math.PI*2);ctx.fill();return;
      }
      if(body.kind==='moon'){
        const r=Math.max(6.4,w*.0074), pts=phasePoints(q.x,q.y,r,body.illumination,body.waxing);
        ctx.fillStyle=p.bg;ctx.beginPath();ctx.arc(q.x,q.y,r,0,Math.PI*2);ctx.fill();
        ctx.fillStyle=col.gray;ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i][0],pts[i][1]);ctx.closePath();ctx.fill();
        ctx.strokeStyle=col.gray;ctx.lineWidth=Math.max(1.2,w*.00125);ctx.beginPath();ctx.arc(q.x,q.y,r,0,Math.PI*2);ctx.stroke();return;
      }
      const r=Math.max(2.2,w*.0028)*body.size;
      ctx.fillStyle=col.gray;ctx.beginPath();ctx.arc(q.x,q.y,r,0,Math.PI*2);ctx.fill();
    });
  }

  function svgBodies(pr,w,p) {
    const col=colors(); let out='';
    bodies(dateUTC()).forEach(body=>{
      const q=pr(body.ra,body.dec);if(!q)return;
      if(body.kind==='sun'){
        const r=Math.max(5,w*.0062);out+=`<circle cx="${q.x.toFixed(2)}" cy="${q.y.toFixed(2)}" r="${r.toFixed(2)}" fill="${col.sun}"/>`;return;
      }
      if(body.kind==='moon'){
        const r=Math.max(6,w*.0074),pts=phasePoints(q.x,q.y,r,body.illumination,body.waxing,48);
        const path=pts.map((pt,i)=>`${i?'L':'M'}${pt[0].toFixed(2)},${pt[1].toFixed(2)}`).join(' ')+' Z';
        out+=`<circle cx="${q.x.toFixed(2)}" cy="${q.y.toFixed(2)}" r="${r.toFixed(2)}" fill="${p.bg}"/><path d="${path}" fill="${col.gray}"/><circle cx="${q.x.toFixed(2)}" cy="${q.y.toFixed(2)}" r="${r.toFixed(2)}" fill="none" stroke="${col.gray}" stroke-width="${Math.max(1.2,w*.00125).toFixed(2)}"/>`;return;
      }
      const r=Math.max(2.2,w*.0028)*body.size;
      out+=`<circle cx="${q.x.toFixed(2)}" cy="${q.y.toFixed(2)}" r="${r.toFixed(2)}" fill="${col.gray}"/>`;
    });
    return out;
  }

  const originalDrawSky=drawSky;
  drawSky=function(){
    originalDrawSky();
    const c=els.canvas,ctx=c.getContext('2d');
    ctx.globalAlpha=1;
    drawCanvas(ctx,c.width,c.height,palette[currentTheme]);
  };

  const originalMakeSvg=makeSvg;
  makeSvg=function(high=false){
    let svg=originalMakeSvg(high);
    const {w,h}=posterSpec(high),p=palette[currentTheme],mapSize=Math.min(w*.76,h*.57),cx=w/2,cy=h*.34,R=mapSize/2;
    const lat=Number(els.lat.value),lon=Number(els.lon.value),date=dateUTC();
    const pr=(ra,dec)=>{const z=horizontal(ra,dec,date,lat,lon);if(z.alt<0)return null;const rr=(90-z.alt)/90*R*.965,a=rad(z.az);return{x:cx+rr*Math.sin(a),y:cy-rr*Math.cos(a)}};
    return svg.replace('</g><circle cx=',svgBodies(pr,w,p)+'</g><circle cx=');
  };

  render();
})();
