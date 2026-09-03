(() => {
  const canvas=document.getElementById('ambientSky');if(!canvas)return;const ctx=canvas.getContext('2d');
  const names={Ori:'ÓRION',Cru:'CRUZEIRO DO SUL',Sco:'ESCORPIÃO',Cyg:'CISNE',Cas:'CASSIOPEIA',UMa:'URSA MAIOR',Tau:'TOURO',Leo:'LEÃO',Sgr:'SAGITÁRIO',Aql:'ÁGUIA'};
  const labelIds=new Set(Object.keys(names));let features=[],start=performance.now(),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  function resize(){const rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.max(1,Math.round(rect.width*dpr));canvas.height=Math.max(1,Math.round(rect.height*dpr));ctx.setTransform(dpr,0,0,dpr,0,0);}
  function xy(ra,dec,w,h,shift){let x=((ra+180+shift)%360+360)%360/360*w;return{x,y:h*(.52-dec/190)};}
  function draw(now){const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h){requestAnimationFrame(draw);return;}ctx.clearRect(0,0,w,h);const shift=reduced?28:28+(now-start)*.0014;
    const glow=ctx.createRadialGradient(w*.74,h*.42,0,w*.74,h*.42,w*.7);glow.addColorStop(0,'rgba(85,104,165,.13)');glow.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
    for(const f of features){const rank=Number(f.properties?.rank||3);if(rank>2)continue;ctx.strokeStyle=rank===1?'rgba(231,226,213,.21)':'rgba(231,226,213,.10)';ctx.fillStyle='rgba(244,238,221,.45)';ctx.lineWidth=rank===1?1:.7;const groups=f.geometry.type==='MultiLineString'?f.geometry.coordinates:[f.geometry.coordinates];let sx=0,sy=0,n=0;
      for(const line of groups){let prev=null;for(const [ra,dec] of line){const p=xy(ra,dec,w,h,shift);sx+=p.x;sy+=p.y;n++;if(prev&&Math.abs(p.x-prev.x)<w*.32){ctx.beginPath();ctx.moveTo(prev.x,prev.y);ctx.lineTo(p.x,p.y);ctx.stroke();}if(rank===1){ctx.beginPath();ctx.arc(p.x,p.y,1.15,0,Math.PI*2);ctx.fill();}prev=p;}}
      if(labelIds.has(f.id)&&n){const x=sx/n,y=sy/n;ctx.font='500 9px Inter, Arial';ctx.fillStyle='rgba(228,219,198,.42)';ctx.fillText(names[f.id],x+8,y-8);}
    }
    if(!reduced)requestAnimationFrame(draw);
  }
  fetch('/data/constellations.lines.json').then(r=>r.ok?r.json():Promise.reject()).then(data=>{features=data.features||[];resize();draw(performance.now());}).catch(()=>{features=[];resize();});
  addEventListener('resize',resize,{passive:true});
})();
