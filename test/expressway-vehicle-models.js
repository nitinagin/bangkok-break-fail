// Bangkok Break Fail: reusable PBR expressway vehicle templates.
// Usage: import {makeExpresswayVehicle} from './expressway-vehicle-models.js';
// Add makeExpresswayVehicle(THREE,'sportsCar') or (THREE,'bus') to a scene.

// Bake weathered bus glazing once per shared vehicle template, not per hazard.
function makeBusGlazing(THREE){
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
 const ctx=canvas.getContext('2d'),g=ctx.createLinearGradient(0,0,256,256);
 g.addColorStop(0,'#4a6b7a');g.addColorStop(.24,'#243e4c');g.addColorStop(.7,'#132632');g.addColorStop(1,'#0c1a25');
 ctx.fillStyle=g;ctx.fillRect(0,0,256,256);
 // Warm interior silhouettes, tempered-glass reflections, and rain streaks.
 ctx.fillStyle='rgba(12,17,23,.8)';
 for(let i=0;i<3;i++){
  const x=43+i*82;ctx.beginPath();ctx.ellipse(x,151,18,24,0,0,Math.PI*2);ctx.fill();
  ctx.fillRect(x-21,170,42,80);
 }
 ctx.fillStyle='rgba(224,235,229,.17)';
 ctx.beginPath();ctx.moveTo(22,0);ctx.lineTo(57,0);ctx.lineTo(130,256);ctx.lineTo(111,256);ctx.fill();
 ctx.fillStyle='rgba(255,248,222,.07)';ctx.fillRect(0,21,256,8);
 for(let i=0;i<19;i++){
  const x=(i*53+11)%256,y=(i*37+19)%184;
  ctx.fillStyle=i%3===0?'rgba(211,224,232,.16)':'rgba(159,175,182,.09)';
  ctx.fillRect(x,y,1,18+(i%5)*9);
 }
 // Apply the laminated-glass sunshade BEFORE painting the interior LED route board;
 // otherwise the gradient obscures route 511 and makes the number unreadable.
 // Laminated-glass upper sunshade and subtle grime gradient: the bus now
 // reads as a working Bangkok vehicle rather than a uniformly blue glass slab.
 // Baked in the existing shared windscreen atlas, with zero extra draw calls.
 const shade=ctx.createLinearGradient(0,0,0,85);
 shade.addColorStop(0,'rgba(13,29,34,.76)');
 shade.addColorStop(.40,'rgba(24,46,50,.35)');
 shade.addColorStop(1,'rgba(24,46,50,0)');
 ctx.fillStyle=shade;ctx.fillRect(7,7,242,85);
 // Bangkok route display behind the windscreen: an amber LED destination
 // board with a legible Thai route number, baked into the shared glazing atlas.
 // No additional geometry, materials, lights or per-frame work.
 ctx.fillStyle='rgba(6,12,15,.94)';ctx.fillRect(64,29,128,39);
 ctx.strokeStyle='rgba(93,110,101,.72)';ctx.lineWidth=2;ctx.strokeRect(65,30,126,37);
 // Route-number-first Bangkok LED board: readable at mobile resolution.
 // All details are baked into the existing windshield atlas.
 ctx.textBaseline='middle';ctx.textAlign='left';ctx.fillStyle='#ffd179';
 ctx.font='bold 31px sans-serif';ctx.fillText('511',75,48);
 ctx.textAlign='right';ctx.fillStyle='#edb962';
 ctx.font='bold 14px sans-serif';ctx.fillText('สาย',182,49);
 // Amber LED diffuser dots and a thin bottom rail.
 ctx.fillStyle='rgba(255,195,86,.33)';
 for(let row=0;row<2;row++)for(let col=0;col<19;col++){
  ctx.fillRect(74+col*6,62+row*3,1,1);
 }
 ctx.fillStyle='rgba(248,191,88,.32)';ctx.fillRect(74,68,108,1);
 // Fine windshield dust gathers at the lower seal, outside the route board.
 const lowerDust=ctx.createLinearGradient(0,197,0,251);
 lowerDust.addColorStop(0,'rgba(119,113,96,0)');
 lowerDust.addColorStop(1,'rgba(119,113,96,.20)');
 ctx.fillStyle=lowerDust;ctx.fillRect(8,197,240,54);
 // Irregular wiping arcs reveal clearer glass around the two parked blades.
 ctx.save();ctx.strokeStyle='rgba(185,206,205,.095)';ctx.lineWidth=2;
 for(const [cx,cy,r,start,end] of [[45,234,142,-1.38,-.35],[211,234,142,-2.79,-1.76]]){
  ctx.beginPath();ctx.arc(cx,cy,r,start,end);ctx.stroke();
 }
 ctx.restore();
 // Bake two parked windscreen wipers and a weathered rubber surround
 // into the existing glass atlas: no extra draw calls or dynamic lights.
 ctx.strokeStyle='rgba(11,19,23,.85)';ctx.lineWidth=7;
 ctx.strokeRect(4,4,248,248);ctx.lineCap='round';
 for(const side of [-1,1]){
  const pivot=side<0?45:211,tip=side<0?133:123;
  ctx.strokeStyle='rgba(10,15,18,.92)';ctx.lineWidth=5;
  ctx.beginPath();ctx.moveTo(pivot,234);ctx.lineTo(tip,202);ctx.stroke();
  ctx.strokeStyle='rgba(185,196,194,.35)';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(pivot,231);ctx.lineTo(tip,199);ctx.stroke();
 }
 const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=2;
 return new THREE.MeshStandardMaterial({map,metalness:.18,roughness:.29});
}
// A raked, slightly bowed windshield replaces the square bus glass box.
// Eight segments, sixteen triangles, and the existing shared PBR glass atlas.
function makeBusCurvedWindshield(THREE,material){
 const positions=[],uvs=[],indices=[],segments=8;
 for(let row=0;row<=1;row++){
  const y=1.745+row*.83;
  for(let i=0;i<=segments;i++){
   const nx=i/segments*2-1,x=nx*.9;
   const z=2.335-row*.055+.028*(1-nx*nx);
   positions.push(x,y,z);uvs.push(i/segments,row);
  }
 }
 for(let i=0;i<segments;i++){
  const a=i,b=i+1,c=i+segments+1,d=c+1;
  indices.push(a,b,c,b,d,c);
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
 geometry.setIndex(indices);geometry.computeVertexNormals();
 const mesh=new THREE.Mesh(geometry,material);
 mesh.name='bangkok-bus-curved-pbr-windshield';
 return mesh;
}
// Paired Bangkok bus wing mirrors: curved support arms and broad vertical
// housings baked into one indexed vertex-colour PBR mesh (one draw call).
// Mirrors stay inside the decorative vehicle envelope; no collision changes.
function makeBusWingMirrors(THREE){
 const positions=[],colors=[],indices=[];
 const steel=new THREE.Color(0x414b50),housing=new THREE.Color(0x1c252b),
  glass=new THREE.Color(0x7c9ca6),glint=new THREE.Color(0xb9cbd0);
 function vertex(x,y,z,color){
  const id=positions.length/3;positions.push(x,y,z);
  colors.push(color.r,color.g,color.b);return id;
 }
 function quad(a,b,c,d,color){
  const start=positions.length/3;
  for(const p of [a,b,c,d])vertex(...p,color);
  indices.push(start,start+1,start+2,start,start+2,start+3);
 }
 for(const side of [-1,1]){
  // Two angled steel braces support each mirror at the front cab corner.
  for(const [y,z] of [[2.27,1.98],[2.05,2.08]]){
   const a=[side*1.025,y,z],b=[side*1.19,y+.065,z+.075];
   const width=.025;
   quad([a[0],a[1]-width,a[2]],[b[0],b[1]-width,b[2]],
    [b[0],b[1]+width,b[2]],[a[0],a[1]+width,a[2]],steel);
  }
  const x=side*1.195,z=2.14,y0=1.96,y1=2.45,half=.135;
  // Front/rear housing plus reflective insert, not a flat floating rectangle.
  quad([x-half,y0,z],[x+half,y0,z],[x+half,y1,z],[x-half,y1,z],housing);
  quad([x-half+.018,y0+.025,z+.012],[x+half-.018,y0+.025,z+.012],
   [x+half-.018,y1-.025,z+.012],[x-half+.018,y1-.025,z+.012],glass);
  quad([x-half+.03,y1-.12,z+.015],[x+half-.045,y1-.12,z+.015],
   [x+half-.055,y1-.045,z+.015],[x-half+.045,y1-.045,z+.015],glint);
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 geometry.setIndex(indices);geometry.computeVertexNormals();
 const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({
  vertexColors:true,metalness:.36,roughness:.48,side:THREE.DoubleSide
 }));
 mesh.name='bangkok-bus-paired-wing-mirrors';
 return mesh;
}
function makeBusRoutePanel(THREE,material){
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1.48,.23),material);
 mesh.position.set(0,2.7,2.315);
 mesh.name='bangkok-bus-front-route-panel';
 return mesh;
}
// Keep route 511 consistent on the windscreen, front destination and both flanks.
// This corrects the contradictory route 8/511 signage without new geometry or textures.
// A real bilingual route panel replaces an existing blank window: zero extra meshes.
function makeBusDestination(THREE){
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;
 const ctx=canvas.getContext('2d');
 ctx.fillStyle='#08161c';ctx.fillRect(0,0,512,128);
 ctx.fillStyle='#e0a74e';ctx.fillRect(0,0,512,5);ctx.fillRect(0,123,512,5);
 ctx.fillStyle='#f9d582';ctx.font='bold 76px sans-serif';ctx.textBaseline='middle';ctx.fillText('511',14,65);
 ctx.fillStyle='#ffe8a4';ctx.font='bold 54px sans-serif';ctx.fillText('กรุงเทพฯ',195,56);
 ctx.fillStyle='#cbd8c7';ctx.font='bold 25px sans-serif';ctx.fillText('BANGKOK',205,100);
 // Subtle dark LED pixel gaps on the existing destination sign atlas.
 // The sign stays readable and requires no extra mesh or texture.
 ctx.save();
 ctx.fillStyle='rgba(3,13,16,.42)';
 for(let y=9;y<119;y+=6){
  for(let x=9;x<503;x+=6)ctx.fillRect(x,y,1.5,1.5);
 }
 ctx.restore();
 const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=2;
 return new THREE.MeshBasicMaterial({map,toneMapped:false});
}
// One weathered Bangkok bus route/livery atlas for both flanks. The two panels
// share one PBR mesh/draw call and one 512x64 texture per cached bus template.
function makeBusSideLivery(THREE){
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=64;
 const ctx=canvas.getContext('2d');
 ctx.fillStyle='#e5dfcf';ctx.fillRect(0,0,512,64);
 ctx.fillStyle='#1e5874';ctx.fillRect(0,7,512,43);
 ctx.fillStyle='#d9b16a';ctx.fillRect(0,4,512,3);
 ctx.fillStyle='#f3d69a';ctx.fillRect(0,51,512,4);
 // Route number, Thai destination and an English identifier are painted on
 // the bus body rather than separate geometry or real-time text sprites.
 ctx.fillStyle='#f8e6b4';ctx.fillRect(10,11,74,34);
 ctx.fillStyle='#183b50';ctx.font='bold 26px sans-serif';
 ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('511',47,28);
 ctx.textAlign='left';ctx.fillStyle='#fff2d4';
 ctx.font='bold 23px sans-serif';ctx.fillText('กรุงเทพฯ',95,28);
 ctx.font='bold 13px sans-serif';ctx.fillText('BANGKOK CITY BUS',96,44);
 ctx.fillStyle='rgba(26,36,41,.15)';
 for(let i=0;i<54;i++){
  const x=(i*79+23)%512,y=(i*17+11)%64;
  ctx.fillRect(x,y,1+(i%3),1+(i%2));
 }
 // Weathered pressed-metal bodywork: panel joins, rivets and rain-borne
 // road grime baked into the existing livery atlas, with no extra geometry.
 // Keep destination lettering clear by placing streaks below the text band.
 ctx.fillStyle='rgba(11,28,37,.27)';
 for(const seam of [4,164,328,505])ctx.fillRect(seam,7,2,43);
 for(let i=0;i<36;i++){
  const x=(i*83+17)%512,y=47+(i*7)%6;
  ctx.fillStyle=i%3===0?'rgba(18,32,38,.28)':'rgba(93,80,63,.20)';
  ctx.fillRect(x,y,1+(i%3),3+(i%5));
 }
 ctx.fillStyle='rgba(228,230,218,.52)';
 for(const seam of [4,164,328,505])for(const y of [10,45]){
  ctx.beginPath();ctx.arc(seam+4,y,1.3,0,Math.PI*2);ctx.fill();
 }
 // Reflective amber side-marker strips and rear-quarter diagonal conspicuity
 // markings are baked into the existing bus livery atlas (no extra geometry).
 // Keep the route text band above y=45 unobstructed.
 ctx.fillStyle='rgba(255,205,105,.88)';
 for(const x of [18,250,470]){
  ctx.fillRect(x,55,18,4);
  ctx.fillStyle='rgba(255,241,183,.72)';ctx.fillRect(x+2,55,12,1);
  ctx.fillStyle='rgba(255,205,105,.88)';
 }
 ctx.save();ctx.beginPath();ctx.rect(405,55,60,7);ctx.clip();
 ctx.strokeStyle='rgba(255,218,124,.78)';ctx.lineWidth=4;
 for(let x=399;x<476;x+=12){ctx.beginPath();ctx.moveTo(x,63);ctx.lineTo(x+10,54);ctx.stroke();}
 ctx.restore();
 ctx.fillStyle='rgba(240,235,218,.12)';
 ctx.fillRect(270,10,6,38);ctx.fillRect(439,10,3,38);
 const map=new THREE.CanvasTexture(canvas);
 map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=2;
 const geometry=new THREE.BufferGeometry(),positions=[],uvs=[],indices=[];
 for(const side of [-1,1]){
  const start=positions.length/3,x=side*1.085,low=1.20,high=1.64,half=1.92;
  positions.push(x,low,-half,x,low,half,x,high,half,x,high,-half);
  // Flip U on the opposite flank so the route lettering reads outward.
  const u0=side<0?0:1,u1=1-u0;
  uvs.push(u0,0,u1,0,u1,1,u0,1);
  if(side<0)indices.push(start,start+1,start+2,start,start+2,start+3);
  else indices.push(start,start+2,start+1,start,start+3,start+2);
 }
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
 geometry.setIndex(indices);geometry.computeVertexNormals();
 const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({
  map,metalness:.08,roughness:.66,side:THREE.DoubleSide
 }));
 mesh.name='bangkok-bus-bilingual-side-livery';
 return mesh;
}
// Single textured front fascia: a two-triangle PBR replacement for two box lights.
// All details are baked once per cached bus, avoiding dynamic lighting.
function makeBusFrontFascia(THREE){
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=192;
 const ctx=canvas.getContext('2d'),body=ctx.createLinearGradient(0,0,0,192);
 body.addColorStop(0,'#e1dcd0');body.addColorStop(.55,'#b9b9b1');body.addColorStop(1,'#4c5961');
 ctx.fillStyle=body;ctx.fillRect(0,0,512,192);
 ctx.fillStyle='#24323a';ctx.fillRect(112,31,288,88);
 for(let i=0;i<7;i++){
  ctx.fillStyle=i%2?'#14242b':'#1b2d35';ctx.fillRect(119,45+i*10,274,5);
  ctx.fillStyle='rgba(221,231,229,.18)';ctx.fillRect(119,44+i*10,274,1);
 }
 // Integrated headlamps, projector lenses and amber indicators.
 for(const x of [12,408]){
  ctx.fillStyle='#202d35';ctx.fillRect(x,26,92,62);
  const lens=ctx.createLinearGradient(x,30,x+85,83);
  lens.addColorStop(0,'#e5e9e3');lens.addColorStop(.42,'#9baeb8');lens.addColorStop(1,'#405662');
  ctx.fillStyle=lens;ctx.fillRect(x+6,32,80,41);
  ctx.fillStyle='#f2c06c';ctx.fillRect(x+6,76,80,7);
  ctx.fillStyle='rgba(255,255,255,.55)';ctx.fillRect(x+11,36,64,3);
  // Dual inset projector bowls and chrome rings, baked into the existing atlas.
  // No extra geometry, texture or draw calls on mobile.
  for(const cx of [x+30,x+65]){
   const bowl=ctx.createRadialGradient(cx-3,52,2,cx,53,17);
   bowl.addColorStop(0,'#f9f5df');bowl.addColorStop(.28,'#b7d1d8');
   bowl.addColorStop(.55,'#344c59');bowl.addColorStop(.82,'#9eb1b6');
   bowl.addColorStop(1,'#182a34');
   ctx.fillStyle=bowl;ctx.beginPath();ctx.ellipse(cx,53,15,15,0,0,Math.PI*2);ctx.fill();
   ctx.strokeStyle='rgba(243,248,236,.85)';ctx.lineWidth=2;
   ctx.beginPath();ctx.ellipse(cx,53,12,12,0,0,Math.PI*2);ctx.stroke();
   ctx.fillStyle='rgba(255,255,245,.8)';
   ctx.beginPath();ctx.ellipse(cx-4,48,3,2,-.3,0,Math.PI*2);ctx.fill();
  }
 }
 // Recessed fog lamps and contoured bumper corners are baked into the same
 // fascia atlas: no extra meshes, lights, textures or mobile draw calls.
 for(const x of [13,443]){
  ctx.fillStyle='#34434b';
  ctx.beginPath();ctx.moveTo(x,105);ctx.lineTo(x+56,105);
  ctx.lineTo(x+50,128);ctx.lineTo(x+8,128);ctx.closePath();ctx.fill();
  ctx.fillStyle='#111e26';ctx.beginPath();ctx.ellipse(x+28,116,19,10,0,0,Math.PI*2);ctx.fill();
  const fog=ctx.createRadialGradient(x+25,113,1,x+28,116,16);
  fog.addColorStop(0,'#e6e6d4');fog.addColorStop(.45,'#a7b5b5');fog.addColorStop(1,'#3d535c');
  ctx.fillStyle=fog;ctx.beginPath();ctx.ellipse(x+28,116,14,7,0,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='rgba(230,234,228,.32)';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(x+8,103);ctx.lineTo(x+48,103);ctx.stroke();
 }
 // Dark recessed air intake with a sloped painted lip adds full-width depth.
 ctx.fillStyle='#53636b';ctx.beginPath();ctx.moveTo(114,110);
 ctx.lineTo(398,110);ctx.lineTo(389,125);ctx.lineTo(123,125);ctx.closePath();ctx.fill();
 ctx.fillStyle='#192b34';ctx.fillRect(129,113,254,8);
 for(let i=0;i<14;i++){
  ctx.fillStyle='rgba(199,207,206,.21)';ctx.fillRect(134+i*18,113,2,8);
 }
 // Steel bumper, tow sockets and fictional Bangkok plate.
 ctx.fillStyle='#303f49';ctx.fillRect(0,122,512,14);
 ctx.fillStyle='#89969a';ctx.fillRect(0,138,512,30);
 ctx.fillStyle='#d7dad2';ctx.fillRect(0,169,512,7);
 ctx.fillStyle='#1e2a31';ctx.fillRect(26,143,38,12);ctx.fillRect(448,143,38,12);
 ctx.fillStyle='#242d31';ctx.fillRect(201,132,110,47);
 ctx.fillStyle='#f1eee2';ctx.fillRect(207,137,98,37);
 ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#27363c';
 ctx.font='bold 18px sans-serif';ctx.fillText('กท ๘๐๘',256,150);
 ctx.font='11px sans-serif';ctx.fillText('กรุงเทพมหานคร',256,165);
 for(let i=0;i<40;i++){
  const x=(i*79+17)%512,y=108+(i*29)%75;
  ctx.fillStyle='rgba(32,37,36,.09)';ctx.fillRect(x,y,1+(i%3),1+(i%2));
 }
 const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=2;
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(2,.72),
  new THREE.MeshStandardMaterial({map,metalness:.23,roughness:.52}));
 mesh.position.set(0,.8,2.30);mesh.name='bangkok-bus-pbr-front-fascia';
 return mesh;
}

// Four side windows are baked into one weathered PBR atlas per expressway bus.
// Two planes replace eight separate glazing boxes: six fewer draw calls per bus.
function makeBusSideWindows(THREE){
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;
 const ctx=canvas.getContext('2d');
 ctx.fillStyle='#d8d1c4';ctx.fillRect(0,0,512,128);
 for(let i=0;i<4;i++){
  const x=i*128,glaze=ctx.createLinearGradient(x+7,9,x+119,115);
  glaze.addColorStop(0,'#627c87');glaze.addColorStop(.45,'#2b4350');glaze.addColorStop(1,'#101f2a');
  // Painted window pillars and inset rubber seals are part of the atlas.
  ctx.fillStyle='#313a40';ctx.fillRect(x+3,3,122,122);
  ctx.fillStyle=glaze;ctx.fillRect(x+10,10,108,108);
  // Recessed warm cabin light: varied occupied/unoccupied windows on a night bus.
  // Painted into the existing atlas, so there are no new meshes or lights.
  if(i!==2){
   const cabin=ctx.createLinearGradient(x+10,12,x+10,113);
   cabin.addColorStop(0,'rgba(247,193,105,.27)');
   cabin.addColorStop(.48,'rgba(209,145,75,.09)');
   cabin.addColorStop(1,'rgba(209,145,75,0)');
   ctx.fillStyle=cabin;ctx.fillRect(x+11,11,106,102);
   ctx.fillStyle='rgba(255,220,152,.35)';
   ctx.fillRect(x+37,14,52,2);
  }
  // Streetlight reflection and rain tracks baked into existing bus window atlas.
  const lamp=ctx.createLinearGradient(x+16,0,x+110,0);
  lamp.addColorStop(0,'rgba(255,214,151,0)');
  lamp.addColorStop(.30,'rgba(255,214,151,.14)');
  lamp.addColorStop(.38,'rgba(255,231,185,.25)');
  lamp.addColorStop(.52,'rgba(255,214,151,0)');
  lamp.addColorStop(1,'rgba(255,214,151,0)');
  ctx.fillStyle=lamp;ctx.fillRect(x+14,13,96,98);
  for(let streak=0;streak<9;streak++){
   const sx=x+15+(streak*37+i*11)%95;
   const sy=18+(streak*19+i*7)%48;
   ctx.fillStyle=streak%3===0?'rgba(211,224,225,.18)':'rgba(173,196,204,.10)';
   ctx.fillRect(sx,sy,1,11+(streak*7)%30);
  }
  // Low-contrast seats and heads give the glazing depth without geometry.
  const cx=x+42+(i%2)*37;
  ctx.fillStyle='rgba(12,20,26,.52)';
  ctx.beginPath();ctx.ellipse(cx,80,14,17,0,0,Math.PI*2);ctx.fill();
  ctx.fillRect(cx-19,91,38,26);
  ctx.fillStyle='rgba(211,230,233,.16)';
  ctx.beginPath();ctx.moveTo(x+20,12);ctx.lineTo(x+43,12);
  ctx.lineTo(x+22,114);ctx.lineTo(x+12,114);ctx.closePath();ctx.fill();
  ctx.strokeStyle='rgba(217,229,230,.12)';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(x+93,13);ctx.lineTo(x+67,112);ctx.stroke();
  // Weathered lower sill, drip marks and fine rubber trim.
  ctx.fillStyle='rgba(173,156,128,.16)';ctx.fillRect(x+10,111,108,7);
  for(let j=0;j<9;j++){
   const px=x+14+(j*37+i*11)%100,py=14+(j*23+i*7)%91;
   ctx.fillStyle='rgba(197,208,208,.10)';ctx.fillRect(px,py,1,4+j%7);
  }
 }
 const map=new THREE.CanvasTexture(canvas);
 map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=2;
 return new THREE.MeshStandardMaterial({
  map,metalness:.12,roughness:.36,side:THREE.DoubleSide
 });
}
// One 256x64 baked rear light/plate atlas replaces two separate car tail lamps.
// The texture is created once per shared template, not on each hazard spawn.
function makeSportsCarRearFascia(THREE){
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=64;
 const ctx=canvas.getContext('2d');
 const panel=ctx.createLinearGradient(0,0,0,64);
 panel.addColorStop(0,'#2d3034');panel.addColorStop(.42,'#0e131a');panel.addColorStop(1,'#25282b');
 ctx.fillStyle=panel;ctx.fillRect(0,0,256,64);
 for(const left of [true,false]){
  const x=left?7:181;
  ctx.fillStyle='#420c15';ctx.fillRect(x,9,68,31);
  ctx.fillStyle='#9b1822';ctx.fillRect(x+3,12,62,23);
  for(let j=0;j<4;j++){
   const lx=x+6+j*15;
   ctx.fillStyle='#ff3c3a';ctx.fillRect(lx,14,11,6);
   ctx.fillStyle='#f5242c';ctx.fillRect(lx,23,11,7);
   ctx.fillStyle='rgba(255,202,174,.46)';ctx.fillRect(lx,14,11,1);
  }
  ctx.fillStyle='rgba(255,242,225,.28)';ctx.fillRect(x+4,11,60,1);
  ctx.fillStyle='#5a1017';ctx.fillRect(x+3,34,62,3);
 }
 // Fictional Thai plate with a dark recessed mounting panel.
 ctx.fillStyle='#080c11';ctx.fillRect(86,10,84,43);
 ctx.fillStyle='#e5e5d8';ctx.fillRect(91,14,74,34);
 ctx.fillStyle='#182c35';ctx.font='bold 15px Tahoma, sans-serif';
 ctx.textAlign='center';ctx.fillText('กท 918',128,31);
 ctx.font='8px Tahoma, sans-serif';ctx.fillText('กรุงเทพฯ',128,42);
 ctx.fillStyle='#717c80';ctx.fillRect(119,4,18,3);
 ctx.fillStyle='#4d5558';ctx.fillRect(4,52,248,3);
 const map=new THREE.CanvasTexture(canvas);
 map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=2;
 return new THREE.MeshBasicMaterial({map,toneMapped:false});
}
// Bangkok city bus: pressed-steel wheel with inset vent slots, eight lug nuts,
// brake dust and subtle oxidized edges. One 128px PBR albedo is shared by all
// four existing instanced hubs; no additional meshes, draw calls or downloads.
function makeBusStampedSteelWheel(THREE){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
 const ctx=canvas.getContext('2d');ctx.translate(64,64);
 const disc=(radius,fill)=>{ctx.fillStyle=fill;ctx.beginPath();ctx.arc(0,0,radius,0,Math.PI*2);ctx.fill();};
 const rim=ctx.createRadialGradient(-14,-18,4,0,0,63);
 rim.addColorStop(0,'#d5d7d1');rim.addColorStop(.43,'#a5adb0');
 rim.addColorStop(.79,'#5a666d');rim.addColorStop(1,'#222b31');
 disc(63,'#13191d');disc(58,rim);
 ctx.strokeStyle='#c8d0cd';ctx.lineWidth=2;
 ctx.beginPath();ctx.arc(0,0,54,0,Math.PI*2);ctx.stroke();
 disc(48,'#465057');disc(43,'#8f999b');disc(37,'#68757b');
 // Dark oval cooling vents in the pressed steel; each gets a metal lip.
 for(let i=0;i<10;i++){
  const a=i*Math.PI/5;
  ctx.save();ctx.rotate(a);ctx.translate(0,-29);
  ctx.fillStyle='#b7bebb';ctx.beginPath();ctx.ellipse(0,0,7.3,11,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#19252b';ctx.beginPath();ctx.ellipse(0,-1,5.2,8.6,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='rgba(221,225,219,.30)';ctx.fillRect(-4,-8,1.2,10);
  ctx.restore();
 }
 // Brake dust stays close to the recessed rim, not a uniform cartoon outline.
 for(let i=0;i<76;i++){
  const a=i*2.39996,r=40+(i*17%15);
  ctx.fillStyle=i%4===0?'rgba(69,43,30,.16)':'rgba(17,27,32,.12)';
  ctx.beginPath();ctx.arc(Math.cos(a)*r,Math.sin(a)*r,.6+i%3*.3,0,Math.PI*2);ctx.fill();
 }
 disc(18,'#313d44');disc(15,'#b9c2c0');disc(9,'#64737b');
 for(let i=0;i<8;i++){
  const a=i*Math.PI/4,x=Math.cos(a)*13,y=Math.sin(a)*13;
  ctx.fillStyle='#253139';ctx.beginPath();ctx.arc(x,y,3.1,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#d9ded7';ctx.beginPath();ctx.arc(x-.6,y-.6,1.55,0,Math.PI*2);ctx.fill();
 }
 disc(4,'#252e34');
 const map=new THREE.CanvasTexture(canvas);
 map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=2;
 return new THREE.MeshStandardMaterial({map,metalness:.72,roughness:.43});
}
// Five twin-spoke cast alloy wheels, baked once per sports-car template.
// All four instanced hubs share one 128px PBR atlas: zero extra draw calls.
function makeSportsCarAlloyWheel(THREE){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
 const ctx=canvas.getContext('2d');ctx.translate(64,64);
 const circle=(r,color)=>{ctx.fillStyle=color;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();};
 // Machined rim, dark recess and drilled ventilated brake rotor.
 circle(63,'#0b1016');circle(59,'#5d6973');circle(56,'#b5c1c7');
 circle(52,'#172029');circle(46,'#67737c');circle(43,'#27333d');
 ctx.strokeStyle='#a4adb3';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,51,0,Math.PI*2);ctx.stroke();
 for(let i=0;i<20;i++){
  const a=i*Math.PI/10;
  ctx.fillStyle='#111b24';ctx.beginPath();
  ctx.arc(Math.cos(a)*39,Math.sin(a)*39,2.4,0,Math.PI*2);ctx.fill();
 }
 // Tapered paired spokes with highlighted edges and recessed gaps.
 for(let i=0;i<5;i++){
  ctx.save();ctx.rotate(i*Math.PI*2/5);
  for(const side of [-1,1]){
   ctx.beginPath();ctx.moveTo(side*2,-10);ctx.lineTo(side*5,-44);
   ctx.lineTo(side*12,-43);ctx.lineTo(side*9,-12);ctx.closePath();
   ctx.fillStyle='#b8c4cc';ctx.fill();ctx.strokeStyle='#edf0ee';ctx.lineWidth=1.1;ctx.stroke();
  }
  ctx.fillStyle='#0c151c';ctx.fillRect(-1,-43,2,27);
  ctx.restore();
 }
 // Baked red brake caliper, center cap and five lug bolts.
 ctx.save();ctx.rotate(-.7);ctx.fillStyle='#8d2630';ctx.fillRect(35,-11,9,24);
 ctx.fillStyle='#cf5260';ctx.fillRect(36,-9,2,18);ctx.restore();
 circle(13,'#19232c');circle(10,'#a9b7bf');circle(7,'#394955');
 for(let i=0;i<5;i++){
  const a=i*Math.PI*2/5;ctx.fillStyle='#dce2e4';ctx.beginPath();
  ctx.arc(Math.cos(a)*15,Math.sin(a)*15,2,0,Math.PI*2);ctx.fill();
 }
 const map=new THREE.CanvasTexture(canvas);
 map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=2;
 return new THREE.MeshStandardMaterial({map,metalness:.68,roughness:.35});
}
// One baked PBR grille atlas and a contoured nose surface; no dynamic lights.
// The low-poly bumper keeps its air ducts visible below the existing LEDs.
function makeSportsCarFrontIntake(THREE){
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=128;
 const ctx=canvas.getContext('2d'),paint=ctx.createLinearGradient(0,0,0,128);
 paint.addColorStop(0,'#76283b');paint.addColorStop(.25,'#401e2b');
 paint.addColorStop(.78,'#141920');paint.addColorStop(1,'#4d2331');
 ctx.fillStyle=paint;ctx.fillRect(0,0,256,128);
 // Three dark recesses: central radiator grille and side brake-cooling ducts.
 for(const [x,w] of [[10,47],[65,126],[199,47]]){
  ctx.fillStyle='#080d12';ctx.fillRect(x,23,w,76);
  ctx.fillStyle='#39434a';ctx.fillRect(x+2,26,w-4,3);
  ctx.fillStyle='#18222a';ctx.fillRect(x+3,92,w-6,4);
  ctx.save();ctx.beginPath();ctx.rect(x+4,31,w-8,59);ctx.clip();
  ctx.strokeStyle='rgba(126,144,150,.33)';ctx.lineWidth=1;
  for(let line=-75;line<w+75;line+=9){
   ctx.beginPath();ctx.moveTo(x+line,31);ctx.lineTo(x+line+48,90);ctx.stroke();
   ctx.beginPath();ctx.moveTo(x+line+48,31);ctx.lineTo(x+line,90);ctx.stroke();
  }
  ctx.restore();
 }
 ctx.fillStyle='#a63c4f';ctx.fillRect(58,19,5,84);ctx.fillRect(193,19,5,84);
 ctx.fillStyle='rgba(220,224,223,.40)';ctx.fillRect(65,24,126,2);
 ctx.fillStyle='#50565b';ctx.fillRect(7,102,242,4);
 ctx.fillStyle='rgba(226,129,140,.21)';ctx.fillRect(0,8,256,5);
 const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=2;
 const positions=[],uvs=[],indices=[],cols=8,rows=2;
 for(let row=0;row<=rows;row++)for(let col=0;col<=cols;col++){
  const u=col/cols,v=row/rows,x=(u-.5)*1.48,y=.49+v*.19;
  positions.push(x,y,1.835+.021*(1-Math.pow(Math.abs(x)/.74,2))+.008*(1-v));
  uvs.push(u,v);
 }
 for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
  const a=row*(cols+1)+col,b=a+cols+1;
  indices.push(a,a+1,b,a+1,b+1,b);
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
 geometry.setIndex(indices);geometry.computeVertexNormals();
 const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({
  map,metalness:.24,roughness:.48,side:THREE.DoubleSide
 }));
 mesh.name='sports-car-contoured-front-intake';
 return mesh;
}
// Low-poly projector headlamps replace the two rectangular front lamp boxes.
// One shared 256x128 baked lens atlas and eight triangles for both swept housings.
// No runtime lighting, texture fetches, or per-hazard allocations (template is cloned).
function makeSportsCarProjectorHeadlights(THREE){
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=128;
 const ctx=canvas.getContext('2d');
 const housing=ctx.createLinearGradient(0,0,0,128);
 housing.addColorStop(0,'#455660');housing.addColorStop(.16,'#17252e');
 housing.addColorStop(.76,'#0b121a');housing.addColorStop(1,'#3e4951');
 ctx.fillStyle=housing;ctx.fillRect(0,0,256,128);
 // Inset lens surround and chrome bowls; baked highlights suggest curved glass.
 ctx.fillStyle='#080d13';ctx.fillRect(7,12,242,103);
 ctx.strokeStyle='#7e919d';ctx.lineWidth=4;ctx.strokeRect(8,13,240,101);
 for(const cx of [72,176]){
  const reflector=ctx.createRadialGradient(cx-10,47,3,cx,61,43);
  reflector.addColorStop(0,'#d7e3e5');reflector.addColorStop(.27,'#7d98a6');
  reflector.addColorStop(.64,'#263e4d');reflector.addColorStop(1,'#090e15');
  ctx.fillStyle=reflector;ctx.beginPath();ctx.ellipse(cx,63,40,37,0,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#9eb0b8';ctx.lineWidth=2;ctx.stroke();
  ctx.fillStyle='#0d2637';ctx.beginPath();ctx.ellipse(cx,65,19,22,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#9fc2d1';ctx.beginPath();ctx.ellipse(cx-5,56,6,9,-.3,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='rgba(231,242,239,.46)';ctx.lineWidth=2;
  ctx.beginPath();ctx.arc(cx,63,29,3.75,5.7);ctx.stroke();
 }
 // Swept left/right DRL clusters with a real grille gap, rather than
 // a single toy-like LED strip crossing the entire nose. Atlas-only detail.
 for(const mirror of [false,true]){
  ctx.save();
  if(mirror){ctx.translate(256,0);ctx.scale(-1,1);}
  ctx.strokeStyle='#e5f2ed';ctx.lineWidth=5;ctx.lineJoin='round';
  ctx.beginPath();ctx.moveTo(13,35);ctx.lineTo(22,24);
  ctx.lineTo(59,20);ctx.lineTo(109,26);ctx.stroke();
  ctx.strokeStyle='rgba(154,207,221,.68)';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(17,42);ctx.lineTo(26,31);
  ctx.lineTo(59,28);ctx.lineTo(108,33);ctx.stroke();
  ctx.restore();
 }
 // Central shut-line makes the twin projector housings read as separate units.
 ctx.strokeStyle='rgba(10,17,22,.70)';ctx.lineWidth=3;
 ctx.beginPath();ctx.moveTo(128,15);ctx.lineTo(128,105);ctx.stroke();
 ctx.fillStyle='rgba(200,217,222,.20)';ctx.fillRect(14,101,228,4);
 const map=new THREE.CanvasTexture(canvas);
 map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=2;
 const positions=[],uvs=[],indices=[];
 for(const side of [-1,1]){
  const first=positions.length/3;
  const bottom=[[.45,.78,1.855],[.62,.775,1.83],[.80,.765,1.79]];
  const top=[[.46,.91,1.852],[.62,.895,1.825],[.78,.865,1.785]];
  for(const [row,vertices] of [[0,bottom],[1,top]]){
   for(let i=0;i<3;i++){
    const [x,y,z]=vertices[i];positions.push(side*x,y,z);
    uvs.push(i/2,row);
   }
  }
  for(let i=0;i<2;i++){
   const a=first+i,b=first+3+i;
   indices.push(a,b,a+1,a+1,b,b+1);
  }
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
 geometry.setIndex(indices);geometry.computeVertexNormals();
 const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({
  map,metalness:.30,roughness:.23,side:THREE.DoubleSide,
  emissive:0x13222b,emissiveIntensity:.25
 }));
 mesh.name='sports-car-swept-projector-headlamps';
 return mesh;
}
// Curved sheet-metal bus roof and low-profile rooftop HVAC: one indexed PBR
// mesh/draw call, no textures or runtime allocations. Kept above the original
// body so collision footprint and side-window visibility remain unchanged.
function makeBusCurvedRoofHVAC(THREE){
 const positions=[],colors=[],indices=[];
 const palette={
  roof:new THREE.Color(0xd9d6ca),ridge:new THREE.Color(0xe5e1d4),
  shell:new THREE.Color(0xb7b9b3),edge:new THREE.Color(0x78858a),
  grille:new THREE.Color(0x29353b)
 };
 function vertex(x,y,z,c){
  positions.push(x,y,z);colors.push(c.r,c.g,c.b);
  return positions.length/3-1;
 }
 function quad(a,b,c,d,color){
  const i=vertex(...a,color),j=vertex(...b,color);
  const k=vertex(...c,color),l=vertex(...d,color);
  indices.push(i,j,k,i,k,l);
 }
 function box(x0,x1,y0,y1,z0,z1,top,side){
  quad([x0,y1,z0],[x1,y1,z0],[x1,y1,z1],[x0,y1,z1],top);
  quad([x0,y0,z0],[x0,y1,z0],[x0,y1,z1],[x0,y0,z1],side);
  quad([x1,y0,z0],[x1,y0,z1],[x1,y1,z1],[x1,y1,z0],side);
  quad([x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0],side);
  quad([x0,y0,z1],[x0,y1,z1],[x1,y1,z1],[x1,y0,z1],side);
 }
 const across=[-1,-.82,-.48,0,.48,.82,1],stations=[-2.01,-1.52,-1,0,1,1.52,2.01];
 const roofIds=[];
 for(const z of stations){
  for(const nx of across){
   const y=2.875+.068*(1-nx*nx);
   roofIds.push(vertex(nx,y,z,Math.abs(nx)<.5?palette.ridge:palette.roof));
  }
 }
 for(let row=0;row<stations.length-1;row++)
  for(let col=0;col<across.length-1;col++){
   const a=roofIds[row*across.length+col],b=roofIds[(row+1)*across.length+col];
   indices.push(a,b,a+1,a+1,b,b+1);
  }
 // Air-conditioning enclosure and recessed ventilation grille. No rooftop
 // projections extend beyond the bus width or the existing front/rear ends.
 // Two low-profile rooftop A/C pods, as seen on Bangkok city buses.
 // Both are baked into this existing vertex-colour roof mesh: one draw call.
 for(const centerZ of [-.94,.91]){
  box(-.68,.68,2.93,3.13,centerZ-.52,centerZ+.52,palette.shell,palette.edge);
  // Recessed fan panels with transverse ventilation slats.
  box(-.53,.53,3.132,3.137,centerZ-.39,centerZ+.39,palette.grille,palette.grille);
  for(let n=0;n<5;n++){
   const z=centerZ-.34+n*.16;
   quad([-.47,3.14,z], [.47,3.14,z],
        [.47,3.14,z+.035],[-.47,3.14,z+.035],palette.edge);
  }
  // End cap folds distinguish pressed sheet metal from a toy block.
  quad([-.68,3.13,centerZ-.52],[.68,3.13,centerZ-.52],
       [.53,3.17,centerZ-.43],[-.53,3.17,centerZ-.43],palette.ridge);
 }
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 geo.setIndex(indices);geo.computeVertexNormals();
 const mesh=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({
  vertexColors:true,metalness:.24,roughness:.71,side:THREE.DoubleSide
 }));
 mesh.name='bangkok-bus-curved-roof-hvac';
 return mesh;
}
// Shared 256px night-glass atlas: front windscreen in the upper half,
// rear heated glass in the lower half. Baked neon/rain reflections and seals
// replace featureless transparent quads without lights or extra draw calls.
function makeSportsCarLaminatedGlass(THREE){
 const canvas=document.createElement('canvas');
 canvas.width=canvas.height=256;
 const ctx=canvas.getContext('2d');
 for(const rear of [false,true]){
  const y0=rear?128:0;
  ctx.save();ctx.translate(0,y0);
  const tint=ctx.createLinearGradient(0,0,256,128);
  tint.addColorStop(0,rear?'#253946':'#405e6c');
  tint.addColorStop(.46,'#19313e');
  tint.addColorStop(1,'#0a1b28');
  ctx.fillStyle=tint;ctx.fillRect(0,0,256,128);
  // Restrained Bangkok neon reflections are part of the glass, not lamps.
  ctx.fillStyle='rgba(95,177,202,.19)';
  ctx.beginPath();ctx.moveTo(25,4);ctx.lineTo(46,4);
  ctx.lineTo(114,123);ctx.lineTo(98,123);ctx.closePath();ctx.fill();
  ctx.fillStyle='rgba(244,160,105,.13)';
  ctx.beginPath();ctx.moveTo(193,4);ctx.lineTo(207,4);
  ctx.lineTo(159,124);ctx.lineTo(148,124);ctx.closePath();ctx.fill();
  ctx.strokeStyle='rgba(10,17,23,.88)';ctx.lineWidth=7;
  ctx.strokeRect(4,4,248,120);
  ctx.strokeStyle='rgba(186,210,211,.25)';ctx.lineWidth=1;
  ctx.strokeRect(9,9,238,110);
  if(rear){
   // Thin rear defogger wires: no implausible front wipers on the back glass.
   ctx.strokeStyle='rgba(194,162,119,.29)';ctx.lineWidth=.8;
   for(let y=27;y<113;y+=11){
    ctx.beginPath();ctx.moveTo(12,y);ctx.lineTo(244,y);ctx.stroke();
   }
   ctx.fillStyle='rgba(198,176,135,.21)';
   ctx.fillRect(15,22,2,91);ctx.fillRect(239,22,2,91);
  }else{
   // Parked wipers and faint wiped arcs are baked into the existing pane.
   ctx.lineCap='round';
   for(const side of [-1,1]){
    const pivot=side<0?40:216,tip=side<0?121:135;
    ctx.strokeStyle='rgba(8,15,20,.89)';ctx.lineWidth=4;
    ctx.beginPath();ctx.moveTo(pivot,112);ctx.lineTo(tip,85);ctx.stroke();
    ctx.strokeStyle='rgba(206,222,220,.29)';ctx.lineWidth=.8;
    ctx.beginPath();ctx.moveTo(pivot,109);ctx.lineTo(tip,82);ctx.stroke();
    ctx.strokeStyle='rgba(191,211,215,.12)';ctx.lineWidth=1;
    ctx.beginPath();ctx.arc(pivot,112,91,Math.PI*1.18,Math.PI*1.88);ctx.stroke();
   }
  }
  // Sparse fixed rain tracks; deterministic, no frame-time texture updates.
  for(let i=0;i<30;i++){
   const x=15+(i*73+11)%226,y=15+(i*43+7)%91;
   ctx.fillStyle=i%3===0?'rgba(224,232,227,.19)':'rgba(150,188,200,.12)';
   ctx.fillRect(x,y,1,3+i%8);
  }
  ctx.restore();
 }
 const map=new THREE.CanvasTexture(canvas);
 map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=2;
 return new THREE.MeshPhysicalMaterial({
  map,color:0xe0ecf1,metalness:0,roughness:.21,
  clearcoat:.62,clearcoatRoughness:.14,
  transparent:true,opacity:.53,depthWrite:false,side:THREE.DoubleSide
 });
}
// Rear-facing bus fascia: rain-streaked glass, Thai route, brake lamps and
// registration are baked into one 256px PBR atlas. The matching emissive mask
// lights only the lamps and route, not the cream bodywork. No dynamic lights.
function makeBusRearFascia(THREE){
 const canvas=document.createElement('canvas'),emission=document.createElement('canvas');
 canvas.width=emission.width=256;canvas.height=emission.height=256;
 const ctx=canvas.getContext('2d'),ec=emission.getContext('2d');
 ctx.fillStyle='#d8d2c2';ctx.fillRect(0,0,256,256);
 ec.fillStyle='#000';ec.fillRect(0,0,256,256);
 // Pressed steel seams and a weathered rear window with an interior silhouette.
 ctx.fillStyle='#303d46';ctx.fillRect(11,30,234,111);
 const glass=ctx.createLinearGradient(0,30,0,140);
 glass.addColorStop(0,'#506978');glass.addColorStop(.44,'#263f4c');
 glass.addColorStop(1,'#111e28');ctx.fillStyle=glass;ctx.fillRect(17,35,222,100);
 ctx.fillStyle='rgba(7,13,19,.58)';
 for(const x of [65,126,187]){
  ctx.beginPath();ctx.ellipse(x,106,12,16,0,0,Math.PI*2);ctx.fill();
  ctx.fillRect(x-14,117,28,17);
 }
 ctx.fillStyle='rgba(212,226,221,.15)';
 ctx.beginPath();ctx.moveTo(30,35);ctx.lineTo(52,35);ctx.lineTo(110,135);
 ctx.lineTo(91,135);ctx.closePath();ctx.fill();
 ctx.strokeStyle='rgba(199,215,211,.32)';ctx.lineWidth=2;
 ctx.beginPath();ctx.moveTo(32,129);ctx.lineTo(124,106);ctx.stroke();
 ctx.fillStyle='#19272f';ctx.fillRect(124,35,5,100);
 // Route board and illuminated destination.
 ctx.fillStyle='#07151b';ctx.fillRect(72,6,112,25);
 ctx.fillStyle='#f3c878';ctx.font='bold 21px Tahoma,sans-serif';
 ctx.textAlign='center';ctx.fillText('8  กรุงเทพฯ',128,25);
 ec.fillStyle='#bd8b39';ec.fillRect(72,6,112,25);
 ec.fillStyle='#ffdc8a';ec.font='bold 21px Tahoma,sans-serif';
 ec.textAlign='center';ec.fillText('8  กรุงเทพฯ',128,25);
 // Faded cream/red livery, inspection hatch, engine ventilation and seams.
 ctx.fillStyle='#a92d36';ctx.fillRect(8,144,240,37);
 ctx.fillStyle='#c9c0ad';ctx.fillRect(8,181,240,57);
 ctx.strokeStyle='#807f79';ctx.lineWidth=2;ctx.strokeRect(9,181,238,57);
 ctx.fillStyle='#4d5558';ctx.fillRect(73,186,110,16);
 ctx.fillStyle='#161e23';
 for(let i=0;i<14;i++)ctx.fillRect(79+i*7,189,3,10);
 ctx.fillStyle='#242e34';ctx.fillRect(9,239,238,11);
 // Two wide, three-section red/amber rear clusters.
 for(const x of [17,205]){
  ctx.fillStyle='#1b2026';ctx.fillRect(x-3,151,37,55);
  ctx.fillStyle='#9f111d';ctx.fillRect(x,154,31,20);
  ctx.fillStyle='#e8a02f';ctx.fillRect(x,176,31,10);
  ctx.fillStyle='#7e1019';ctx.fillRect(x,188,31,15);
  ctx.fillStyle='rgba(255,228,202,.38)';ctx.fillRect(x+3,156,4,15);
  ec.fillStyle='#ee1822';ec.fillRect(x+1,155,29,18);
  ec.fillStyle='#422016';ec.fillRect(x+1,177,29,8);
 }
 ctx.fillStyle='#eee9d8';ctx.fillRect(86,208,84,29);
 ctx.strokeStyle='#353d3e';ctx.lineWidth=2;ctx.strokeRect(86,208,84,29);
 ctx.fillStyle='#1a282d';ctx.font='bold 15px Tahoma,sans-serif';
 ctx.fillText('10-4821',128,226);
 ctx.font='9px Tahoma,sans-serif';ctx.fillText('กรุงเทพมหานคร',128,235);
 // Deterministic grime at the lower tailgate; no per-frame texture uploads.
 for(let i=0;i<90;i++){
  const x=(i*53+17)%256,y=178+(i*31)%62;
  ctx.fillStyle=i%3===0?'rgba(27,27,26,.13)':'rgba(84,74,61,.10)';
  ctx.fillRect(x,y,1+i%3,2+i%8);
 }
 const map=new THREE.CanvasTexture(canvas),glow=new THREE.CanvasTexture(emission);
 map.colorSpace=THREE.SRGBColorSpace;glow.colorSpace=THREE.SRGBColorSpace;
 map.anisotropy=glow.anisotropy=2;
 const material=new THREE.MeshStandardMaterial({
  map,roughness:.65,metalness:.13,emissive:0xffffff,
  emissiveMap:glow,emissiveIntensity:.65,side:THREE.DoubleSide
 });
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1.90,2.14),material);
 mesh.rotation.y=Math.PI;mesh.name='bangkok-bus-weathered-rear-fascia';
 return mesh;
}
export function makeExpresswayVehicle(THREE,type='sportsCar'){
 const isBus=type==='bus',group=new THREE.Group(),w=isBus?2.05:1.8,length=isBus?4.45:3.55;
 const paint=isBus?new THREE.MeshStandardMaterial({color:0xf0e6d4,metalness:.15,roughness:.65}):new THREE.MeshPhysicalMaterial({color:0xb12438,metalness:.62,roughness:.26,clearcoat:.75,clearcoatRoughness:.22});
 const glass=new THREE.MeshStandardMaterial({color:0x173542,metalness:.2,roughness:.16});
 const rubber=new THREE.MeshStandardMaterial({color:0x171a1c,roughness:.96});
 const stripe=new THREE.MeshStandardMaterial({color:0xc72b35,roughness:.55});
 const shape=new THREE.Shape();
 if(isBus){shape.moveTo(-2.22,.43);shape.lineTo(-2.22,2.62);shape.lineTo(-2.04,2.86);shape.lineTo(2.04,2.86);shape.lineTo(2.22,2.62);shape.lineTo(2.22,.43);}
 else{shape.moveTo(-1.77,.4);shape.lineTo(-1.55,.65);shape.lineTo(-.73,.74);shape.lineTo(-.31,1.2);shape.lineTo(.6,1.2);shape.lineTo(1.07,.73);shape.lineTo(1.55,.64);shape.lineTo(1.77,.4);}
 shape.closePath();
 const geometry=new THREE.ExtrudeGeometry(shape,{depth:w,bevelEnabled:true,bevelSize:.035,bevelThickness:.035,bevelSegments:1});
 geometry.rotateY(Math.PI/2);geometry.translate(-w/2,0,0);
 group.add(new THREE.Mesh(geometry,paint));
 function box(x,y,z,a,b,c,material){const m=new THREE.Mesh(new THREE.BoxGeometry(a,b,c),material);m.position.set(x,y,z);group.add(m);}
 if(isBus){
  const busGlazing=makeBusGlazing(THREE),destination=makeBusDestination(THREE);
  box(0,1.07,0,2.07,.25,4.4,stripe);
  group.add(makeBusSideLivery(THREE));
  // Pressed lower body panels with a continuous recessed beltline and
  // chamfered sill. Both flanks share one indexed PBR mesh and one draw call.
  // Decorative overlay stays inside the existing vehicle collision envelope.
  const skirtPositions=[],skirtColors=[],skirtIndices=[];
  const skirtRows=[
   [.47,1.064,0x333b40], // road-dirt shadow at sill
   [.53,1.080,0x8d3436], // rolled lower edge
   [.61,1.088,0xb43b3d], // outward pressed shoulder
   [.85,1.088,0xb8393b], // red painted panel
   [1.00,1.072,0x8e292f], // recessed beltline seam
   [1.045,1.080,0xc64a45] // highlight beneath cream body
  ];
  const skirtStations=[-2.10,-1.72,-1.28,-.72,0,.72,1.28,1.72,2.10];
  for(const side of [-1,1]){
   const offset=skirtPositions.length/3;
   for(let row=0;row<skirtRows.length;row++){
    const [y,depth,color]=skirtRows[row];
    for(const z of skirtStations){
     const endTaper=Math.max(0,(Math.abs(z)-1.72)/.38);
     skirtPositions.push(side*(depth-.018*endTaper),y,z);
     const tint=new THREE.Color(color).multiplyScalar(
      1-.055*Math.abs(z)/2.1);
     skirtColors.push(tint.r,tint.g,tint.b);
    }
   }
   for(let row=0;row<skirtRows.length-1;row++){
    for(let col=0;col<skirtStations.length-1;col++){
     const a=offset+row*skirtStations.length+col,b=a+skirtStations.length;
     if(side>0)skirtIndices.push(a,a+1,b,a+1,b+1,b);
     else skirtIndices.push(a,b,a+1,a+1,b,b+1);
    }
   }
  }
  const skirtGeo=new THREE.BufferGeometry();
  skirtGeo.setAttribute('position',new THREE.Float32BufferAttribute(skirtPositions,3));
  skirtGeo.setAttribute('color',new THREE.Float32BufferAttribute(skirtColors,3));
  skirtGeo.setIndex(skirtIndices);skirtGeo.computeVertexNormals();
  const skirtMesh=new THREE.Mesh(skirtGeo,new THREE.MeshStandardMaterial({
   vertexColors:true,metalness:.22,roughness:.58,side:THREE.DoubleSide
  }));
  skirtMesh.name='bangkok-bus-pressed-lower-body';
  group.add(skirtMesh);

  // Weathered flexible rear mudflaps: a single indexed PBR mesh for both
  // rear wheels, inside the bus silhouette and outside collision logic.
  const flapPos=[],flapCol=[],flapIdx=[];
  function flapQuad(points,color){
   const start=flapPos.length/3,shade=new THREE.Color(color);
   for(const point of points){flapPos.push(...point);flapCol.push(shade.r,shade.g,shade.b);}
   flapIdx.push(start,start+1,start+2,start,start+2,start+3);
  }
  for(const side of [-1,1]){
   const x=side*.78,z=-1.93;
   flapQuad([[x-.23,.47,z],[x+.23,.47,z],[x+.21,.13,z-.045],[x-.21,.13,z-.045]],0x1a1d1e);
   flapQuad([[x+.21,.13,z-.049],[x-.21,.13,z-.049],[x-.23,.47,z-.004],[x+.23,.47,z-.004]],0x242728);
   flapQuad([[x-.19,.18,z-.052],[x+.19,.18,z-.052],[x+.19,.205,z-.049],[x-.19,.205,z-.049]],0x55524b);
   flapQuad([[x-.13,.36,z-.052],[x+.13,.36,z-.052],[x+.13,.405,z-.05],[x-.13,.405,z-.05]],0x9b292b);
  }
  const flapGeo=new THREE.BufferGeometry();
  flapGeo.setAttribute('position',new THREE.Float32BufferAttribute(flapPos,3));
  flapGeo.setAttribute('color',new THREE.Float32BufferAttribute(flapCol,3));
  flapGeo.setIndex(flapIdx);flapGeo.computeVertexNormals();
  const mudflaps=new THREE.Mesh(flapGeo,new THREE.MeshStandardMaterial({
   vertexColors:true,roughness:.94,metalness:0,side:THREE.DoubleSide
  }));
  mudflaps.name='bangkok-bus-rear-rubber-mudflaps';
  group.add(mudflaps);
  group.add(makeBusCurvedRoofHVAC(THREE));
  group.add(makeBusFrontFascia(THREE));
  // Front-facing route sign and curved glass replace texture-stretched boxes.
  // Vehicle footprint, collision and stage behavior are unchanged.
  group.add(makeBusCurvedWindshield(THREE,busGlazing));
  group.add(makeBusWingMirrors(THREE));
  group.add(makeBusRoutePanel(THREE,destination));
  // Shared, UV-baked window strip follows the bus flank at the original height.
  const sideGlazing=makeBusSideWindows(THREE);
  const sideWindowGeometry=new THREE.PlaneGeometry(3.82,.65);
  for(const side of [-1,1]){
   const pane=new THREE.Mesh(sideWindowGeometry,sideGlazing);
   pane.rotation.y=side*Math.PI/2;
   pane.position.set(side*1.082,2.17,0);
   group.add(pane);
  }
  // The rear faces approaching drivers; keep the fascia within the existing
  // bus silhouette and away from collision logic.
  const rearFascia=makeBusRearFascia(THREE);
  rearFascia.position.set(0,1.65,-length/2-.09);
  group.add(rearFascia);
  // Four wheel wells share one low-poly PBR mesh: dark brake-dust liner,
  // worn steel lip and red pressed-metal shoulder. Decorative only; no
  // change to collision, lane clearance, lighting or external downloads.
  const busArchPositions=[],busArchColors=[],busArchIndices=[];
  const busArchRadii=[.435,.476,.515],busArchSegments=16;
  const busArchPalette=[0x161d22,0x6b6661,0xae3431].map(c=>new THREE.Color(c));
  for(const side of [-1,1])for(const axle of [-1,1]){
   const start=busArchPositions.length/3;
   for(let band=0;band<busArchRadii.length;band++){
    const radius=busArchRadii[band],shade=busArchPalette[band];
    for(let step=0;step<=busArchSegments;step++){
     const angle=Math.PI*step/busArchSegments;
     busArchPositions.push(side*(w*.5+.08),.4+Math.sin(angle)*radius,
      axle*1.42+Math.cos(angle)*radius);
     busArchColors.push(shade.r,shade.g,shade.b);
    }
   }
   for(let band=0;band<busArchRadii.length-1;band++){
    for(let step=0;step<busArchSegments;step++){
     const a=start+band*(busArchSegments+1)+step,b=a+busArchSegments+1;
     busArchIndices.push(a,b,a+1,a+1,b,b+1);
    }
   }
  }
  const busArchGeometry=new THREE.BufferGeometry();
  busArchGeometry.setAttribute('position',new THREE.Float32BufferAttribute(busArchPositions,3));
  busArchGeometry.setAttribute('color',new THREE.Float32BufferAttribute(busArchColors,3));
  busArchGeometry.setIndex(busArchIndices);
  busArchGeometry.computeVertexNormals();
  const busArchMesh=new THREE.Mesh(busArchGeometry,new THREE.MeshStandardMaterial({
   vertexColors:true,metalness:.24,roughness:.76,side:THREE.DoubleSide
  }));
  busArchMesh.name='bangkok-bus-pressed-wheel-arches';
  group.add(busArchMesh);
 }else{
  // Dark transparent glazing reveals a seated driver instead of an empty car.
  const windshield=makeSportsCarLaminatedGlass(THREE);
  const seatMat=new THREE.MeshStandardMaterial({color:0x171b23,roughness:.88});
  const jacket=new THREE.MeshStandardMaterial({color:0x293746,roughness:.9});
  const skin=new THREE.MeshStandardMaterial({color:0xc38a65,roughness:.92});
  const hair=new THREE.MeshStandardMaterial({color:0x171414,roughness:1});
  // Right-hand-drive position for Bangkok traffic; all parts stay inside the cabin.
  box(.38,.83,-.1,.47,.28,.46,seatMat);
  const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.18,.34,4,8),jacket);
  torso.position.set(.38,1.02,-.1);group.add(torso);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.16,10,8),skin);
  head.position.set(.38,1.36,-.06);group.add(head);
  const cap=new THREE.Mesh(new THREE.SphereGeometry(.165,10,6,0,Math.PI*2,0,Math.PI*.43),hair);
  cap.position.set(.38,1.40,-.06);group.add(cap);
  const steering=new THREE.Mesh(new THREE.TorusGeometry(.19,.035,6,12),rubber);
  steering.position.set(.38,1.04,.38);steering.rotation.x=.3;group.add(steering);
  // Follow the hood/roof and roof/deck slopes instead of laying glass flat.
  // Two lightweight trapezoids replace the two horizontal box panes (4 triangles total).
  // Slightly offset from the painted body so the tinted PBR glass remains visible.
  function slopedGlass(lowerZ,upperZ,rear=false){
   const positions=[],uvs=[],indices=[],cols=8,rows=3;
   for(let row=0;row<=rows;row++){
    const v=row/rows,halfWidth=.73-.12*v;
    for(let col=0;col<=cols;col++){
     const u=col/cols,nx=2*u-1;
     // A subtle outward bow catches the baked street-light glints.
     const bow=(rear?-1:1)*.026*(1-nx*nx)*Math.sin(Math.PI*v);
     positions.push(nx*halfWidth,.83+.395*v,
      lowerZ+(upperZ-lowerZ)*v+bow);
     uvs.push(u,(rear?0:.5)+v*.5);
    }
   }
   for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
    const a=row*(cols+1)+col,b=a+cols+1;
    indices.push(a,a+1,b,a+1,b+1,b);
   }
   const geometry=new THREE.BufferGeometry();
   geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
   geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
   geometry.setIndex(indices);geometry.computeVertexNormals();
   group.add(new THREE.Mesh(geometry,windshield));
  }
  slopedGlass(1.00,.30);        // front: hood to roof
  slopedGlass(-1.055,-.585,true); // rear: deck to roof

  // Four flush side panes (two per flank) replace the solid, toy-like cabin.
  // Bake reflections once and draw all eight triangles in a single PBR mesh.
  const sideCanvas=document.createElement('canvas');
  sideCanvas.width=sideCanvas.height=128;
  const sideCtx=sideCanvas.getContext('2d');
  const sideGradient=sideCtx.createLinearGradient(0,0,128,128);
  sideGradient.addColorStop(0,'#56717c');
  sideGradient.addColorStop(.38,'#243e4b');
  sideGradient.addColorStop(1,'#0d1d28');
  sideCtx.fillStyle=sideGradient;sideCtx.fillRect(0,0,128,128);
  sideCtx.fillStyle='rgba(220,238,237,.19)';
  sideCtx.beginPath();sideCtx.moveTo(15,0);sideCtx.lineTo(33,0);
  sideCtx.lineTo(86,128);sideCtx.lineTo(65,128);sideCtx.closePath();sideCtx.fill();
  sideCtx.fillStyle='rgba(194,219,224,.09)';
  sideCtx.beginPath();sideCtx.moveTo(101,0);sideCtx.lineTo(111,0);
  sideCtx.lineTo(73,128);sideCtx.lineTo(65,128);sideCtx.closePath();sideCtx.fill();
  sideCtx.strokeStyle='rgba(203,221,220,.11)';sideCtx.lineWidth=1;
  for(let streak=0;streak<6;streak++){
   const sx=12+streak*19;
   sideCtx.beginPath();sideCtx.moveTo(sx,18);sideCtx.lineTo(sx-5,82);sideCtx.stroke();
  }
  const sideMap=new THREE.CanvasTexture(sideCanvas);
  sideMap.colorSpace=THREE.SRGBColorSpace;sideMap.anisotropy=2;
  const sideGlass=new THREE.MeshStandardMaterial({
   map:sideMap,metalness:.18,roughness:.24,side:THREE.DoubleSide
  });
  const sidePositions=[],sideUvs=[];
  function sidePane(side,nearZ,farZ,nearTop,farTop){
   const x=side*.945;
   const corners=[
    [x,.865,nearZ],[x,.88,farZ],[x,farTop,farZ],[x,nearTop,nearZ]
   ];
   for(const vertex of [0,1,2,0,2,3]){
    sidePositions.push(...corners[vertex]);
    const uv=[[0,0],[1,0],[1,1],[0,1]][vertex];
    sideUvs.push(...uv);
   }
  }
  for(const side of [-1,1]){
   sidePane(side,.27,-.035,1.17,1.205); // front door glass
   sidePane(side,-.125,-.545,1.205,1.165); // rear quarter glass
  }
  const sideGeometry=new THREE.BufferGeometry();
  sideGeometry.setAttribute('position',new THREE.Float32BufferAttribute(sidePositions,3));
  sideGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(sideUvs,2));
  sideGeometry.computeVertexNormals();
  group.add(new THREE.Mesh(sideGeometry,sideGlass));


  // Sculpted bonnet: tapered nose, raised centre ridge and pressed shoulder creases.
  // One 96-triangle painted PBR mesh replaces the flat, toy-like hood silhouette.
  // Geometry is built only once for the shared sports-car template.
  const hoodStations=[
   [0.84,.785,.81],[.96,.778,.81],[1.08,.768,.805],
   [1.20,.753,.795],[1.32,.739,.785],[1.44,.725,.775],
   [1.56,.710,.765],[1.68,.693,.75],[1.73,.683,.735]
  ];
  const hoodAcross=[-1,-.82,-.57,0,.57,.82,1];
  const hoodVertices=[],hoodIndices=[];
  for(const [z,y,halfWidth] of hoodStations){
   for(const across of hoodAcross){
    const shoulder=Math.exp(-Math.pow((Math.abs(across)-.70)/.19,2))*.022;
    const crown=(1-Math.abs(across))*.031;
    hoodVertices.push(across*halfWidth,y+shoulder+crown,z);
   }
  }
  for(let row=0;row<hoodStations.length-1;row++){
   for(let col=0;col<hoodAcross.length-1;col++){
    const a=row*hoodAcross.length+col,b=a+hoodAcross.length;
    hoodIndices.push(a,b,a+1,a+1,b,b+1);
   }
  }
  const hoodGeo=new THREE.BufferGeometry();
  hoodGeo.setAttribute('position',new THREE.Float32BufferAttribute(hoodVertices,3));
  hoodGeo.setIndex(hoodIndices);
  hoodGeo.computeVertexNormals();
  const hood=new THREE.Mesh(hoodGeo,paint);
  hood.name='sports-car-sculpted-bonnet';
  group.add(hood);

  // Four sculpted fender lips and dark wheel liners in one PBR draw call.
  // Each 12-segment arch follows its existing axle; no extra textures or lights.
  const archPositions=[],archColors=[],archIndices=[];
  const archPalette=[
   new THREE.Color(0x111820), // recessed tire-side liner
   new THREE.Color(0x32343a), // shadowed metal transition
   new THREE.Color(0xb12438)  // body-colored outer fender shoulder
  ];
  const archRadii=[.385,.423,.47],archSegments=12;
  for(const side of [-1,1]){
   for(const axle of [-1,1]){
    const start=archPositions.length/3;
    for(let band=0;band<archRadii.length;band++){
     const radius=archRadii[band];
     for(let step=0;step<=archSegments;step++){
      const angle=Math.PI*step/archSegments;
      archPositions.push(side*(w*.5+.065),.4+Math.sin(angle)*radius,
       axle*1.1+Math.cos(angle)*radius);
      const color=archPalette[band];
      archColors.push(color.r,color.g,color.b);
     }
    }
    for(let band=0;band<2;band++){
     for(let step=0;step<archSegments;step++){
      const a=start+band*(archSegments+1)+step,b=a+archSegments+1;
      if(side>0)archIndices.push(a,b,a+1,a+1,b,b+1);
      else archIndices.push(a,a+1,b,a+1,b+1,b);
     }
    }
   }
  }
  const archGeo=new THREE.BufferGeometry();
  archGeo.setAttribute('position',new THREE.Float32BufferAttribute(archPositions,3));
  archGeo.setAttribute('color',new THREE.Float32BufferAttribute(archColors,3));
  archGeo.setIndex(archIndices);
  archGeo.computeVertexNormals();
  const archMesh=new THREE.Mesh(archGeo,new THREE.MeshStandardMaterial({
   vertexColors:true,metalness:.32,roughness:.46
  }));
  archMesh.name='sports-car-contoured-wheel-arches';
  group.add(archMesh);

  // Stamped coupe door skins: a shallow shoulder crease and recessed rocker
  // replace the flat box-like sides without any texture fetch or extra lights.
  // Both sides, their shut-lines and handles share ONE low-poly PBR mesh.
  const doorVertices=[],doorColors=[],doorIndices=[];
  const doorZ=[-.59,-.48,-.16,.16,.48,.59];
  const doorY=[.49,.55,.64,.72,.825];
  const doorPalette=[0x421e2a,0x842535,0xac2d40,0xc34555,0x922b3d];
  function doorQuad(side,x,z0,z1,y0,y1,color){
   const first=doorVertices.length/3;
   doorVertices.push(side*x,y0,z0,side*x,y0,z1,side*x,y1,z1,side*x,y1,z0);
   const shade=new THREE.Color(color);
   for(let k=0;k<4;k++)doorColors.push(shade.r,shade.g,shade.b);
   doorIndices.push(first,first+1,first+2,first,first+2,first+3);
  }
  for(const side of [-1,1]){
   const start=doorVertices.length/3;
   for(let row=0;row<doorY.length;row++){
    const y=doorY[row],shoulder=Math.sin((y-.49)/.335*Math.PI);
    for(const z of doorZ){
     const x=.945+.020*shoulder+.012*(1-Math.abs(z)/.59);
     doorVertices.push(side*x,y,z);
     const shade=new THREE.Color(doorPalette[row]);
     doorColors.push(shade.r,shade.g,shade.b);
    }
   }
   for(let row=0;row<doorY.length-1;row++){
    for(let col=0;col<doorZ.length-1;col++){
     const a=start+row*doorZ.length+col,b=a+doorZ.length;
     doorIndices.push(a,b,a+1,a+1,b,b+1);
    }
   }
   // Flush dark rocker, narrow rear door shut-line and satin-metal handle.
   doorQuad(side,.984,-.59,.59,.492,.519,0x171d23);
   doorQuad(side,.985,-.407,-.395,.536,.819,0x401d28);
   doorQuad(side,.989,-.30,-.16,.786,.804,0x9aabb2);
  }
  const doorGeo=new THREE.BufferGeometry();
  doorGeo.setAttribute('position',new THREE.Float32BufferAttribute(doorVertices,3));
  doorGeo.setAttribute('color',new THREE.Float32BufferAttribute(doorColors,3));
  doorGeo.setIndex(doorIndices);doorGeo.computeVertexNormals();
  const doorMesh=new THREE.Mesh(doorGeo,new THREE.MeshStandardMaterial({
   vertexColors:true,metalness:.47,roughness:.34,side:THREE.DoubleSide
  }));
  doorMesh.name='sports-car-sculpted-door-skins';
  group.add(doorMesh);

  // Folded coupe door mirrors: aerodynamic painted shells, dark stems and
  // inset reflective glass. Both mirrors use one indexed PBR mesh; the
  // geometry is shared by cloned hazards and never animated per frame.
  const mirrorPositions=[],mirrorColors=[],mirrorIndices=[];
  function mirrorQuad(points,hex){
   const base=mirrorPositions.length/3,color=new THREE.Color(hex);
   for(const point of points){
    mirrorPositions.push(...point);
    mirrorColors.push(color.r,color.g,color.b);
   }
   mirrorIndices.push(base,base+1,base+2,base,base+2,base+3);
  }
  for(const side of [-1,1]){
   const x=side*1.045,z=.38;
   // Stalk meets the door just below the leading side window.
   mirrorQuad([
    [side*.945,.87,z-.045],[x,.91,z-.045],
    [x,.94,z+.045],[side*.945,.88,z+.045]
   ],0x252c32);
   // Tapered upper shell and underslung dark edge.
   mirrorQuad([
    [x,.90,z-.15],[side*1.24,.94,z-.11],
    [side*1.24,1.025,z+.09],[x,1.00,z+.13]
   ],0x9c293b);
   mirrorQuad([
    [x,.90,z-.15],[side*1.24,.94,z-.11],
    [side*1.24,.955,z-.095],[x,.915,z-.13]
   ],0x171c22);
   // Visible reflective insert facing rearward.
   mirrorQuad([
    [side*1.08,.935,z-.153],[side*1.21,.96,z-.125],
    [side*1.21,1.008,z-.117],[side*1.08,.987,z-.145]
   ],0x7f9ea8);
  }
  const mirrorGeometry=new THREE.BufferGeometry();
  mirrorGeometry.setAttribute('position',new THREE.Float32BufferAttribute(mirrorPositions,3));
  mirrorGeometry.setAttribute('color',new THREE.Float32BufferAttribute(mirrorColors,3));
  mirrorGeometry.setIndex(mirrorIndices);
  mirrorGeometry.computeVertexNormals();
  const mirrorMesh=new THREE.Mesh(mirrorGeometry,new THREE.MeshStandardMaterial({
   vertexColors:true,metalness:.38,roughness:.34,side:THREE.DoubleSide
  }));
  mirrorMesh.name='sports-car-aerodynamic-door-mirrors';
  group.add(mirrorMesh);

  // Contoured fastback roof and three sloping window pillars per side.
  // A single shared PBR mesh gives the coupe a rounded greenhouse silhouette,
  // replacing the flat-looking roof edge without extra textures or animation.
  const roofStations=[
   [-.62,.47,1.205],[-.49,.59,1.238],[-.31,.65,1.262],
   [-.08,.67,1.274],[.16,.66,1.266],[.35,.59,1.241],[.56,.46,1.205]
  ];
  const roofAcross=[-1,-.76,-.46,0,.46,.76,1];
  const roofVertices=[],roofColors=[],roofIndices=[];
  const roofPaint=new THREE.Color(0xb12438);
  for(const [z,halfWidth,centerY] of roofStations){
   for(const across of roofAcross){
    const edge=Math.pow(Math.abs(across),1.6);
    roofVertices.push(across*halfWidth,centerY+.024*(1-edge)-.046*edge,z);
    const tint=roofPaint.clone().multiplyScalar(1.02-.13*edge);
    roofColors.push(tint.r,tint.g,tint.b);
   }
  }
  for(let row=0;row<roofStations.length-1;row++){
   for(let col=0;col<roofAcross.length-1;col++){
    const a=row*roofAcross.length+col,b=a+roofAcross.length;
    roofIndices.push(a,b,a+1,a+1,b,b+1);
   }
  }
  // Pillars slope inward from the door shoulders to the narrower roof.
  // The B-pillar aligns with the existing front/rear quarter-glass gap.
  function roofPillar(side,bottomZ,topZ,bottomY,topY,width){
   const first=roofVertices.length/3;
   roofVertices.push(
    side*.951,bottomY,bottomZ-width/2,
    side*.951,bottomY,bottomZ+width/2,
    side*.625,topY,topZ+width/2,
    side*.625,topY,topZ-width/2
   );
   const trim=new THREE.Color(0x26313a);
   for(let k=0;k<4;k++)roofColors.push(trim.r,trim.g,trim.b);
   roofIndices.push(first,first+1,first+2,first,first+2,first+3);
  }
  for(const side of [-1,1]){
   roofPillar(side,.65,.35,.87,1.24,.065); // swept front A-pillar
   roofPillar(side,-.08,-.08,.87,1.27,.048); // central B-pillar
   roofPillar(side,-.65,-.49,.87,1.24,.075); // fastback C-pillar
  }
  const roofGeo=new THREE.BufferGeometry();
  roofGeo.setAttribute('position',new THREE.Float32BufferAttribute(roofVertices,3));
  roofGeo.setAttribute('color',new THREE.Float32BufferAttribute(roofColors,3));
  roofGeo.setIndex(roofIndices);roofGeo.computeVertexNormals();
  const roofMesh=new THREE.Mesh(roofGeo,new THREE.MeshStandardMaterial({
   vertexColors:true,metalness:.48,roughness:.30,side:THREE.DoubleSide
  }));
  roofMesh.name='sports-car-fastback-greenhouse';
  group.add(roofMesh);

  // Sports-car grille, splitter, rear wing, supports and side ducts:
  // Nine carbon-finish pieces in one instanced draw call, no texture upload.
  const carbon=new THREE.MeshStandardMaterial({color:0x111820,metalness:.24,roughness:.54});
  const aero=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),carbon,9);
  const aeroMatrix=new THREE.Matrix4();
  function aeroPart(i,x,y,z,sx,sy,sz){
   aeroMatrix.makeScale(sx,sy,sz);
   aeroMatrix.setPosition(x,y,z);
   aero.setMatrixAt(i,aeroMatrix);
  }
  aeroPart(0,0,.54,1.79,1.32,.18,.05); // grille
  aeroPart(1,0,.42,1.81,1.66,.06,.18); // front splitter
  aeroPart(2,0,.99,-1.48,1.61,.065,.24); // rear wing
  aeroPart(3,-.52,.86,-1.46,.08,.23,.09); // wing supports
  aeroPart(4,.52,.86,-1.46,.08,.23,.09);
  aeroPart(5,-.91,.69,-.30,.035,.18,.55); // side intakes
  aeroPart(6,.91,.69,-.30,.035,.18,.55);
  // Low-profile hood extractor slits share the existing carbon draw call.
  aeroPart(7,-.48,.788,1.16,.115,.012,.27);
  aeroPart(8,.48,.788,1.16,.115,.012,.27);
  aero.instanceMatrix.needsUpdate=true;
  group.add(aero);
  // Baked cooling ducts curve across the front, above the splitter.
  group.add(makeSportsCarFrontIntake(THREE));
   group.add(makeSportsCarProjectorHeadlights(THREE));
  // Two LED running lights share one draw call; no dynamic lighting.
  const led=new THREE.InstancedMesh(new THREE.BoxGeometry(.45,.045,.04),
   new THREE.MeshBasicMaterial({color:0xccefff,toneMapped:false}),2);
  for(let i=0;i<2;i++){
   aeroMatrix.makeTranslation((i?1:-1)*.57,.76,1.785);
   led.setMatrixAt(i,aeroMatrix);
  }
  led.instanceMatrix.needsUpdate=true;
  group.add(led);
  // Baked rear lamps replace two separate rear lamp meshes.
  const rearFascia=new THREE.Mesh(new THREE.PlaneGeometry(1.62,.32),makeSportsCarRearFascia(THREE));
  rearFascia.rotation.y=Math.PI;rearFascia.position.set(0,.8,-length/2-.09);
   rearFascia.name='sports-car-rear-fascia';
  group.add(rearFascia);
 }
 const tailLamps=new THREE.MeshStandardMaterial({color:0xff3028,emissive:0xee1308,emissiveIntensity:.9,roughness:.28});
 // Instanced tires and machined hubs add exterior detail without extra wheel draw calls.
 const tireGeo=new THREE.CylinderGeometry(isBus?.43:.37,isBus?.43:.37,.18,12);tireGeo.rotateZ(Math.PI/2);
 const hubGeo=new THREE.CylinderGeometry(isBus?.26:.22,isBus?.26:.22,.025,12);hubGeo.rotateZ(Math.PI/2);
 const hubMetal=isBus?makeBusStampedSteelWheel(THREE):makeSportsCarAlloyWheel(THREE);
 const mirrorShell=new THREE.MeshStandardMaterial({color:0x20272d,metalness:.2,roughness:.48});
 const mirrorGlass=new THREE.MeshStandardMaterial({color:0x8aabb8,metalness:.65,roughness:.16});
 const tires=new THREE.InstancedMesh(tireGeo,rubber,4);
 const hubs=new THREE.InstancedMesh(hubGeo,hubMetal,4);
 const mirrorBodies=new THREE.InstancedMesh(new THREE.BoxGeometry(isBus?.36:.28,isBus?.25:.18,.15),mirrorShell,2);
 const mirrorFaces=new THREE.InstancedMesh(new THREE.BoxGeometry(isBus?.29:.22,isBus?.19:.12,.012),mirrorGlass,2);
 const matrix=new THREE.Matrix4();
 let wheelIndex=0,mirrorIndex=0;
 for(const side of [-1,1]){
  for(const axle of [-1,1]){
   const wheelZ=axle*(isBus?1.42:1.1);
   matrix.makeTranslation(side*w*.48,.4,wheelZ);tires.setMatrixAt(wheelIndex,matrix);
   matrix.makeTranslation(side*(w*.48+.108),.4,wheelZ);hubs.setMatrixAt(wheelIndex,matrix);
   wheelIndex++;
  }
  const mirrorX=side*(w/2+.12),mirrorY=isBus?2.12:1.18,mirrorZ=isBus?1.96:.63;
  matrix.makeTranslation(mirrorX,mirrorY,mirrorZ);mirrorBodies.setMatrixAt(mirrorIndex,matrix);
  matrix.makeTranslation(mirrorX,mirrorY,mirrorZ-.081);mirrorFaces.setMatrixAt(mirrorIndex,matrix);
  mirrorIndex++;
  // Keep distinct front and rear lamps.
  if(isBus)box(side*w*.37,.8,-length/2-.04,.27,.14,.06,tailLamps);
 }
 group.add(tires,hubs,mirrorBodies,mirrorFaces);
 group.userData.type=type;
 // At expressway approach distance, detailed cabin/interior/aero parts are
 // smaller than a mobile pixel. Keep the recognisable body, roof, wheels and
 // red rear lamps, sharing their existing geometries and PBR materials.
 // The near car stays fully detailed; collision and lane logic are untouched.
 if(isBus){
  // Distant buses retain their curved body, rooftop HVAC and wheels, but
  // omit subpixel interior, lettering and glass detail beyond 42 metres.
  // Clones share geometry/material with the near model: no extra textures.
  const distant=new THREE.Group();
  const roof=group.children.find(node=>node.name==='bangkok-bus-curved-roof-hvac');
  if(!roof)throw new Error('Bus LOD is missing its rooftop silhouette');
  for(const part of [group.children[0],roof,tires,hubs]){
   if(!part)throw new Error('Bus LOD is missing a silhouette part');
   distant.add(part.clone());
  }
  const lod=new THREE.LOD();
  lod.addLevel(group,0,.08);
  lod.addLevel(distant,42,.08);
  lod.userData.type=type;
  return lod;
 }
 if(!isBus){
  const distant=new THREE.Group();
  const roof=group.children.find(node=>node.name==='sports-car-fastback-greenhouse');
  const rear=group.children.find(node=>node.name==='sports-car-rear-fascia');
  for(const part of [group.children[0],roof,rear,tires,hubs]){
   if(!part)throw new Error('Sports-car LOD is missing a silhouette part');
   distant.add(part.clone());
  }
  const lod=new THREE.LOD();
  lod.addLevel(group,0,.08);
  lod.addLevel(distant,36,.08);
  lod.userData.type=type;
  return lod;
 }
 return group;
}
