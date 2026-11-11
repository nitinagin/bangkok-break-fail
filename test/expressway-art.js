// Bangkok Break Fail / expressway visual asset module.
// Optional scene extension: const art=createExpresswayArt(THREE); scene.add(art.group);
// In the main update loop: art.group.visible=onExpressway; if(onExpressway)art.update(dt,speed).
// Keeps one draw call for 24 skyline towers; no realtime shadow maps or network assets.
export function createExpresswayArt(THREE){
 const group=new THREE.Group();group.name='BangkokExpresswayNight';
 // One shared 256x512 PBR facade atlas: real window recesses, concrete
 // mullions, uneven occupancy and air-con grilles instead of toy-block dots.
 // Baked once; all 24 buildings share this texture and one tower draw call.
 const windowCanvas=document.createElement('canvas');windowCanvas.width=256;windowCanvas.height=512;
 const ctx=windowCanvas.getContext('2d');
 // Emissive window atlas: lit rooms glow, concrete and empty rooms stay dark.
 const emissiveCanvas=document.createElement('canvas');
 emissiveCanvas.width=256;emissiveCanvas.height=512;
 const ec=emissiveCanvas.getContext('2d');
 ec.fillStyle='#000000';ec.fillRect(0,0,256,512);
 ctx.fillStyle='#384452';ctx.fillRect(0,0,256,512);
 for(let col=0;col<8;col++){
  const x=9+col*30;
  ctx.fillStyle=col%3===0?'#48525c':'#303c48';ctx.fillRect(x-4,0,27,512);
  ctx.fillStyle='rgba(181,193,198,.12)';ctx.fillRect(x-4,0,2,512);
 }
 for(let row=0;row<32;row++)for(let col=0;col<8;col++){
  const x=9+col*30,y=13+row*15;
  const lit=(row*19+col*31+row*col*7)%13<5;
  ctx.fillStyle='#111e2b';ctx.fillRect(x-1,y-1,23,12);
  ctx.fillStyle=lit?((row+col)%3===0?'#e4bb83':'#94aeba'):'#273a49';
  ctx.fillRect(x+1,y+1,19,8);
  if(lit){
   ec.fillStyle=(row+col)%3===0?'#e4bb83':'#94aeba';
   ec.fillRect(x+1,y+1,19,8);
   ec.fillStyle='rgba(255,242,210,.18)';
   ec.fillRect(x+2,y+1,2,8);
  }
  // Curtains and blinds vary occupied rooms; mask emissive glazing too.
  const room=(row*37+col*23+row*col*3)%19;
  if(room===2||room===8||room===14){
   const width=room===14?12:6;
   ctx.fillStyle=room===8?'rgba(79,67,66,.88)':'rgba(37,49,58,.91)';
   ctx.fillRect(x+1,y+1,width,8);
   ec.fillStyle='#000';ec.fillRect(x+1,y+1,width,8);
   ctx.fillStyle='rgba(185,173,153,.18)';ctx.fillRect(x+width,y+1,1,8);
  }else if(room===5||room===11){
   ctx.fillStyle='rgba(19,31,41,.75)';
   ec.fillStyle='#000';
   for(let blind=0;blind<4;blind++){
    ctx.fillRect(x+1,y+2+blind*2,19,1);
    ec.fillRect(x+1,y+2+blind*2,19,1);
   }
  }
  if(lit&&room===17){
   ctx.fillStyle='rgba(24,32,38,.82)';ctx.fillRect(x+13,y+4,4,5);
   ec.fillStyle='#000';ec.fillRect(x+13,y+4,4,5);
  }
  ctx.fillStyle=lit?'rgba(255,238,199,.18)':'rgba(179,208,222,.10)';
  ctx.fillRect(x+2,y+1,2,8);
  ctx.fillStyle='rgba(5,13,21,.38)';ctx.fillRect(x+10,y+1,1,8);
  ctx.fillStyle='rgba(13,22,30,.53)';ctx.fillRect(x-2,y+11,26,2);
  if((row*7+col*11)%17===0){
   ctx.fillStyle='#65747b';ctx.fillRect(x+3,y+10,13,4);
   ctx.fillStyle='#29343c';for(let g=0;g<4;g++)ctx.fillRect(x+5+g*3,y+11,1,2);
  }
 }
 // Bake occupied-room glow into the existing emissive atlas once.
 // No new WebGL lights, meshes, textures or draw calls.
 ec.save();
 ec.globalCompositeOperation='destination-over';
 for(let row=0;row<32;row++)for(let col=0;col<8;col++){
  if((row*19+col*31+row*col*7)%13>=5)continue;
  const x=19+col*30,y=18+row*15;
  const halo=ec.createRadialGradient(x,y,2,x,y,17);
  const warm=(row+col)%3===0;
  halo.addColorStop(0,warm?'rgba(235,171,92,.27)':'rgba(125,173,203,.22)');
  halo.addColorStop(1,'rgba(0,0,0,0)');
  ec.fillStyle=halo;ec.fillRect(x-17,y-17,34,34);
 }
 ec.restore();
 for(let floor=0;floor<32;floor+=8){
  ctx.fillStyle='rgba(13,22,31,.65)';ctx.fillRect(0,8+floor*15,256,4);
  ctx.fillStyle='rgba(179,191,195,.15)';ctx.fillRect(0,12+floor*15,256,1);
 }
 // Bangkok rooftop service floors: dark mechanical louvers, occasional warm
 // maintenance lamps and antenna shadows baked into the shared facade atlas.
 // These break the repetitive office-window grid without new meshes/textures.
 for(let band=0;band<4;band++){
  const y=band*120+3;
  ctx.fillStyle='rgba(9,17,23,.94)';ctx.fillRect(0,y,256,7);
  ctx.fillStyle='rgba(103,119,124,.42)';ctx.fillRect(0,y+7,256,1);
  for(let vent=0;vent<12;vent++){
   const x=3+vent*21+(band%2)*3;
   ctx.fillStyle='#263640';ctx.fillRect(x,y+1,15,5);
   ctx.fillStyle='rgba(4,11,17,.85)';
   for(let slit=0;slit<3;slit++)ctx.fillRect(x+2,y+2+slit,11,1);
   if((vent+band*3)%11===0){
    ctx.fillStyle='#bba06c';ctx.fillRect(x+16,y+2,2,2);
    ec.fillStyle='#a58a59';ec.fillRect(x+16,y+2,2,2);
   }
  }
 }
 // Broad rain-washed concrete streaks and rooftop runoff on the existing
 // facade atlas: irregular vertical stains break up the uniform tower grid.
 // Keep all stains on opaque concrete strips so lit glazing stays legible.
 for(let col=0;col<8;col++){
  const stripX=5+col*30;
  for(let streak=0;streak<3;streak++){
   const x=stripX+(streak*3+col)%5;
   const start=(col*71+streak*113)%420;
   const length=38+(col*17+streak*29)%85;
   const gradient=ctx.createLinearGradient(x,start,x,start+length);
   gradient.addColorStop(0,'rgba(13,23,30,.30)');
   gradient.addColorStop(.45,'rgba(15,26,33,.15)');
   gradient.addColorStop(1,'rgba(15,26,33,0)');
   ctx.fillStyle=gradient;ctx.fillRect(x,start,1+(streak%2),length);
  }
 }
 // Baked air-conditioner runoff and soot below selected office windows.
 // Existing facade atlas only: no new meshes, textures or per-frame cost.
 for(let row=1;row<31;row++)for(let col=0;col<8;col++){
  if((row*13+col*17)%23!==4)continue;
  const x=9+col*30,y=13+row*15;
  ctx.fillStyle='rgba(11,23,30,.48)';ctx.fillRect(x+4,y+11,12,2);
  ctx.fillStyle='rgba(13,26,32,.26)';ctx.fillRect(x+7,y+13,2,Math.min(12,512-y-13));
  ctx.fillStyle='rgba(168,186,183,.16)';ctx.fillRect(x+9,y+13,1,Math.min(8,512-y-13));
 }
 // Rain-darkened sill shadows and irregular dust on the glazing: baked
 // into the existing facade atlas, avoiding extra geometry or draw calls.
 // Keep the central glass clear so occupied-room emission stays legible.
 for(let row=0;row<32;row++)for(let col=0;col<8;col++){
  const x=9+col*30,y=13+row*15;
  const wear=(row*23+col*17+row*col*5)%11;
  ctx.fillStyle='rgba(8,17,23,.34)';
  ctx.fillRect(x,y+9,22,2);
  ctx.fillStyle='rgba(156,177,180,.14)';
  ctx.fillRect(x+2,y+8,17,1);
  if(wear<5){
   ctx.fillStyle='rgba(16,29,36,.19)';
   ctx.fillRect(x+3+wear*3,y+2,1,3+(row+col)%4);
  }
  if(wear===7||wear===9){
   ctx.fillStyle='rgba(190,198,194,.15)';
   ctx.fillRect(x+16,y+2,1,4);
  }
 }
 // Uneven mineral deposits at every eighth-floor concrete ledge.
 for(let floor=0;floor<32;floor+=8){
  const y=12+floor*15;
  for(let col=0;col<8;col++){
   const x=4+col*30;
   ctx.fillStyle='rgba(172,178,165,.16)';
   ctx.fillRect(x,y,8+(col*7+floor)%11,1);
  }
 }
 // Baked Bangkok apartment balcony railings and external AC condensers.
 // Select sparse window bays so office facades remain readable at distance;
 // all silhouettes and occlusion share the existing albedo/emissive atlases.
 for(let row=2;row<31;row++)for(let col=0;col<8;col++){
  const variant=(row*17+col*29+row*col*3)%23;
  if(variant!==2&&variant!==7&&variant!==13)continue;
  const x=9+col*30,y=13+row*15;
  // Dark balcony slab with narrow weathered top edge.
  ctx.fillStyle='rgba(10,20,27,.92)';ctx.fillRect(x-1,y+8,24,3);
  ctx.fillStyle='rgba(148,159,157,.55)';ctx.fillRect(x-1,y+8,24,1);
  ec.fillStyle='#000';ec.fillRect(x-1,y+8,24,3);
  // Thin steel balustrade with transparent gaps, not solid cartoon bars.
  ctx.fillStyle='rgba(105,121,127,.82)';ctx.fillRect(x,y+4,22,1);
  ctx.fillStyle='rgba(45,60,67,.92)';
  for(let rail=1;rail<22;rail+=5)ctx.fillRect(x+rail,y+4,1,5);
  if(variant===7){
   // Condenser grille and its wall bracket occupy the lower-right bay.
   ctx.fillStyle='#53636a';ctx.fillRect(x+12,y+3,9,6);
   ctx.fillStyle='#1a2a32';ctx.fillRect(x+13,y+4,7,4);
   ctx.fillStyle='rgba(172,185,181,.7)';
   for(let grille=0;grille<3;grille++)ctx.fillRect(x+13,y+4+grille*2,7,1);
   ec.fillStyle='#000';ec.fillRect(x+12,y+3,9,6);
  }
 }
 const windowTexture=new THREE.CanvasTexture(windowCanvas);windowTexture.colorSpace=THREE.SRGBColorSpace;
 const emissiveTexture=new THREE.CanvasTexture(emissiveCanvas);
 emissiveTexture.colorSpace=THREE.SRGBColorSpace;
 // Baked tangent-space facade relief: recessed glazing, raised concrete mullions
 // and horizontal floor ledges. One 256x512 normal texture, no extra geometry.
 const facadeNormals=document.createElement('canvas');facadeNormals.width=256;facadeNormals.height=512;
 const fn=facadeNormals.getContext('2d'),pixels=fn.createImageData(256,512);
 const relief=new Float32Array(256*512);
 for(let y=0;y<512;y++)for(let x=0;x<256;x++){
  const col=Math.floor((x-9)/30),row=Math.floor((y-13)/15);
  let h=.46;
  if(col>=0&&col<8&&row>=0&&row<32){
   const lx=x-(9+col*30),ly=y-(13+row*15);
   if(lx>=-1&&lx<22&&ly>=-1&&ly<12)h=.24;
   if(lx>=1&&lx<20&&ly>=1&&ly<9)h=.08;
  }
  if(y%120>=8&&y%120<12)h=.62;
  relief[y*256+x]=h;
 }
 for(let y=0;y<512;y++)for(let x=0;x<256;x++){
  const dx=(relief[y*256+Math.min(255,x+1)]-relief[y*256+Math.max(0,x-1)])*.9;
  const dy=(relief[Math.min(511,y+1)*256+x]-relief[Math.max(0,y-1)*256+x])*.9;
  const inv=1/Math.hypot(dx,dy,1),at=(y*256+x)*4;
  pixels.data[at]=Math.round(128-127*dx*inv);
  pixels.data[at+1]=Math.round(128-127*dy*inv);
  pixels.data[at+2]=Math.round(128+127*inv);
  pixels.data[at+3]=255;
 }
 fn.putImageData(pixels,0,0);
 const facadeNormalTexture=new THREE.CanvasTexture(facadeNormals);
 const towerMat=new THREE.MeshStandardMaterial({map:windowTexture,normalMap:facadeNormalTexture,normalScale:new THREE.Vector2(.34,.34),roughness:.83,metalness:.13,emissive:0xffffff,emissiveMap:emissiveTexture,emissiveIntensity:.42});
 // Stepped parapets and rooftop plant rooms give each scaled tower a
 // recognizable Bangkok high-rise silhouette, without adding tower meshes.
 const towerOutline=new THREE.Shape();
 towerOutline.moveTo(-.5,-.5);towerOutline.lineTo(.5,-.5);
 towerOutline.lineTo(.5,.36);towerOutline.lineTo(.43,.36);
 towerOutline.lineTo(.43,.43);towerOutline.lineTo(.21,.43);
 towerOutline.lineTo(.21,.5);towerOutline.lineTo(-.19,.5);
 towerOutline.lineTo(-.19,.44);towerOutline.lineTo(-.42,.44);
 towerOutline.lineTo(-.42,.37);towerOutline.lineTo(-.5,.37);
 towerOutline.closePath();
 const towerGeometry=new THREE.ExtrudeGeometry(towerOutline,{depth:1,steps:1,bevelEnabled:false,curveSegments:1});
 towerGeometry.translate(0,0,-.5);
 // ExtrudeGeometry defaults to world-coordinate UVs; normalize to [0,1]
 // so all facades display the full baked window atlas on both sides.
 const pos=towerGeometry.getAttribute('position'),norm=towerGeometry.getAttribute('normal'),uv=towerGeometry.getAttribute('uv');
 for(let vertex=0;vertex<pos.count;vertex++){
  const u=Math.abs(norm.getX(vertex))>.5?pos.getZ(vertex)+.5:pos.getX(vertex)+.5;
  uv.setXY(vertex,u,pos.getY(vertex)+.5);
 }
 uv.needsUpdate=true;
 const towers=new THREE.InstancedMesh(towerGeometry,towerMat,24);
 const dummy=new THREE.Object3D();
 const rooftopMasts=[];
 const facadeTints=[0xc6d0d8,0xe0d5c9,0xaebfcb,0xc6cbd0];
 for(let i=0;i<24;i++){
  const side=i%2===0?-1:1,row=Math.floor(i/2),height=10+(i*13%19);
  dummy.position.set(side*(12+(i*7%17)),height*.5-2,-15-row*9);
  dummy.scale.set(4+(i*5%7),height,5+(i*3%7));
  dummy.updateMatrix();towers.setMatrixAt(i,dummy.matrix);
  // Atmospheric perspective on the existing 24 instanced towers: distant
  // facades lose warm contrast in humid Bangkok night air. The cool haze
  // gradient is baked into instance colors (zero new meshes/draw calls).
  // Keep nearby buildings brighter so the player reads the street depth.
  const depthFade=Math.min(.42,row/11*.42);
  const facadeColor=new THREE.Color(facadeTints[i%facadeTints.length]);
  facadeColor.lerp(new THREE.Color(0x526579),depthFade);
  towers.setColorAt(i,facadeColor);
  if(i%3===0)rooftopMasts.push({x:dummy.position.x+dummy.scale.x*.12,y:height-2,z:dummy.position.z,height:1.2+(i%4)*.45});
 }
 towers.instanceMatrix.needsUpdate=true;
 if(towers.instanceColor)towers.instanceColor.needsUpdate=true;
 towers.frustumCulled=false;group.add(towers);
 // Rooftop mechanical plant rooms break up repeated tower silhouettes.
 // One instanced PBR mesh for 24 structures; no external assets or animation.
 const plantGeometry=new THREE.BoxGeometry(1,1,1);
 const plantMaterial=new THREE.MeshStandardMaterial({color:0x77818a,metalness:.38,roughness:.76});
 const roofPlants=new THREE.InstancedMesh(plantGeometry,plantMaterial,24);
 roofPlants.name='expressway-highrise-rooftop-mechanical-plant';
 for(let i=0;i<24;i++){
  const side=i%2===0?-1:1,height=10+(i*13%19);
  const width=4+(i*5%7),depth=5+(i*3%7);
  const plantHeight=.65+(i%4)*.22;
  dummy.position.set(side*(12+(i*7%17))+width*.23,
   height-2+plantHeight*.5,-15-Math.floor(i/2)*9-depth*.16);
  dummy.scale.set(width*.30,plantHeight,depth*.35);
  dummy.updateMatrix();roofPlants.setMatrixAt(i,dummy.matrix);
 }
 roofPlants.instanceMatrix.needsUpdate=true;
 roofPlants.frustumCulled=false;group.add(roofPlants);

 // Baked road-facing Thai skyline signage: one shared atlas and instanced draw call.
 const skylineThaiCanvas=document.createElement('canvas');skylineThaiCanvas.width=512;skylineThaiCanvas.height=256;
 const skylineThaiCtx=skylineThaiCanvas.getContext('2d');
 // Render Thai glyphs at 2x atlas resolution so highway signs stay legible
 // at oblique camera angles; preserve existing layout and one instanced draw call.
 skylineThaiCtx.scale(2,2);
 // Highway-green retroreflective direction board rather than a glowing
 // advertisement. All details are baked into the shared 512x256 atlas.
 skylineThaiCtx.fillStyle='#10251d';skylineThaiCtx.fillRect(0,0,256,128);
 skylineThaiCtx.fillStyle='#12613e';skylineThaiCtx.fillRect(6,6,244,116);
 skylineThaiCtx.strokeStyle='#e4e9dc';skylineThaiCtx.lineWidth=3;
 skylineThaiCtx.strokeRect(12,12,232,104);
 // Narrow mounting seams and rivets read as a real metal road sign.
 skylineThaiCtx.fillStyle='rgba(0,0,0,.22)';
 skylineThaiCtx.fillRect(8,105,240,3);
 skylineThaiCtx.fillStyle='#a9b6ad';
 for(const x of [19,237])for(const y of [19,109]){
  skylineThaiCtx.beginPath();skylineThaiCtx.arc(x,y,2,0,Math.PI*2);skylineThaiCtx.fill();
 }
 skylineThaiCtx.textAlign='center';skylineThaiCtx.textBaseline='middle';
 skylineThaiCtx.shadowBlur=0;
 skylineThaiCtx.font='bold 35px sans-serif';skylineThaiCtx.fillStyle='#f7f8ee';
 skylineThaiCtx.fillText('ทางด่วน',128,49);
 skylineThaiCtx.font='bold 18px sans-serif';
 skylineThaiCtx.fillText('EXPRESSWAY',128,82);
 // Route shield baked into the existing atlas; no new draw calls.
 skylineThaiCtx.fillStyle='#e8eee8';skylineThaiCtx.fillRect(207,20,30,29);
 skylineThaiCtx.fillStyle='#174f79';skylineThaiCtx.fillRect(210,23,24,23);
 skylineThaiCtx.fillStyle='#ffffff';skylineThaiCtx.font='bold 18px Arial,sans-serif';
 skylineThaiCtx.fillText('9',222,35);
 skylineThaiCtx.strokeStyle='#f7f8ee';skylineThaiCtx.lineWidth=5;
 skylineThaiCtx.lineCap='round';skylineThaiCtx.beginPath();
 skylineThaiCtx.moveTo(128,111);skylineThaiCtx.lineTo(128,95);
 skylineThaiCtx.moveTo(120,102);skylineThaiCtx.lineTo(128,94);
 skylineThaiCtx.lineTo(136,102);skylineThaiCtx.stroke();
 const skylineThaiTexture=new THREE.CanvasTexture(skylineThaiCanvas);skylineThaiTexture.colorSpace=THREE.SRGBColorSpace;
 const skylineThaiMaterial=new THREE.MeshBasicMaterial({map:skylineThaiTexture,side:THREE.DoubleSide});
 const skylineThaiSigns=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),skylineThaiMaterial,12);
 skylineThaiSigns.name='expressway-road-facing-thai-neon-signs';
 for(let i=0;i<12;i++){
  const tower=i*2+1,side=tower%2===0?-1:1,row=Math.floor(tower/2);
  const height=10+(tower*13%19),width=4+(tower*5%7);
  dummy.position.set(side*(12+(tower*7%17)-width*.51),height*.63-2,-15-row*9);
  dummy.rotation.set(0,side*Math.PI/2,0);
  dummy.scale.set(2.8,1.4,1);dummy.updateMatrix();skylineThaiSigns.setMatrixAt(i,dummy.matrix);
 }
 skylineThaiSigns.instanceMatrix.needsUpdate=true;skylineThaiSigns.frustumCulled=false;group.add(skylineThaiSigns);
 dummy.rotation.set(0,0,0);

 // Shared emissive rooftop aircraft-warning markers; one draw call, no dynamic lights.
 const skylineMarkerGeometry=new THREE.SphereGeometry(.16,6,4);
 const skylineMarkerMaterial=new THREE.MeshStandardMaterial({color:0xff3d2d,emissive:0xff1808,emissiveIntensity:1.8,metalness:.12,roughness:.38});
 const skylineMarkers=new THREE.InstancedMesh(skylineMarkerGeometry,skylineMarkerMaterial,24);
 for(let i=0;i<24;i++){
  const side=i%2===0?-1:1,row=Math.floor(i/2),height=10+(i*13%19);
  dummy.position.set(side*(12+(i*7%17)),height-1.46,-15-row*9);
  dummy.scale.setScalar(1);dummy.updateMatrix();skylineMarkers.setMatrixAt(i,dummy.matrix);
 }
 skylineMarkers.instanceMatrix.needsUpdate=true;
 skylineMarkers.name='expressway-highrise-aircraft-warning-markers';
 group.add(skylineMarkers);
 // Six Thai/English illuminated high-rise fascia panels. All 12 triangles
 // are batched into ONE PBR mesh; two small shared atlases are baked once.
 // No dynamic lights, shadow maps, external assets or per-frame updates.
 const neonCanvas=document.createElement('canvas'),neonEmission=document.createElement('canvas');
 neonCanvas.width=neonEmission.width=512;neonCanvas.height=neonEmission.height=256;
 const nc=neonCanvas.getContext('2d'),ne=neonEmission.getContext('2d');
 // District-specific bilingual signage replaces generic hotel branding.
 // Thai route names remain readable from the moving expressway camera.
 const neonRows=[
  ['ทางด่วน','EXPRESSWAY','#77e0d9','#d2faf1'],
  ['ดินแดง','DIN DAENG','#f091a4','#ffe1e5'],
  ['พระราม ๙','RAMA IX','#edc578','#fff0c8']
 ];
 ne.fillStyle='#000';ne.fillRect(0,0,512,256);
 for(let row=0;row<3;row++){
  const y=row*85,[thai,english,ink,light]=neonRows[row];
  const base=nc.createLinearGradient(0,y,0,y+85);
  base.addColorStop(0,'#354047');base.addColorStop(.25,'#121c23');
  base.addColorStop(1,'#26313a');
  nc.fillStyle=base;nc.fillRect(0,y,512,85);
  nc.fillStyle='#0b161d';nc.fillRect(12,y+8,488,69);
  nc.strokeStyle='#758185';nc.lineWidth=3;nc.strokeRect(12,y+8,488,69);
  nc.strokeStyle=ne.strokeStyle=ink;
  nc.lineWidth=ne.lineWidth=2;
  nc.strokeRect(19,y+14,474,57);ne.strokeRect(19,y+14,474,57);
  for(const x of [18,494])for(const dy of [17,65]){
   nc.fillStyle='#879399';nc.fillRect(x-2,y+dy,4,4);
  }
  nc.textAlign=ne.textAlign='center';
  nc.textBaseline=ne.textBaseline='middle';
  nc.font=ne.font='bold 36px "Noto Sans Thai", Tahoma, sans-serif';
  // Bake a soft two-pass neon halo into the existing emissive atlas.
  // This is texture-space bloom, not an extra transparent mesh or light.
  ne.save();
  ne.shadowColor=ink;ne.shadowBlur=13;
  ne.fillStyle=ink;ne.globalAlpha=.48;
  ne.fillText(thai,256,y+37,455);
  ne.globalAlpha=.7;ne.shadowBlur=5;
  ne.fillText(thai,256,y+37,455);
  ne.restore();
  nc.fillStyle=ne.fillStyle=light;
  nc.fillText(thai,256,y+37,455);ne.fillText(thai,256,y+37,455);
  nc.font=ne.font='bold 15px Arial,sans-serif';
  nc.fillStyle=ne.fillStyle=ink;
  nc.fillText(english,256,y+64,450);ne.fillText(english,256,y+64,450);
  for(let k=0;k<28;k++){
   nc.fillStyle='rgba(184,199,200,.09)';
   nc.fillRect((k*71+row*29)%486+13,y+9+(k*23)%65,1,2+k%6);
  }
 }
 const neonMap=new THREE.CanvasTexture(neonCanvas);
 const neonGlowMap=new THREE.CanvasTexture(neonEmission);
 neonMap.colorSpace=neonGlowMap.colorSpace=THREE.SRGBColorSpace;
 neonMap.anisotropy=neonGlowMap.anisotropy=2;
 const billboardPositions=[],billboardUV=[],billboardIndices=[];
 const billboardTowerIds=[0,1,4,5,8,9];
 for(let n=0;n<billboardTowerIds.length;n++){
  const i=billboardTowerIds[n],row=Math.floor(i/2);
  const side=i%2===0?-1:1,height=10+(i*13%19);
  const width=4+(i*5%7),depth=5+(i*3%7);
  const x=side*(12+(i*7%17)),y=height-3.25;
  const z=-15-row*9+depth*.5+.075,half=Math.min(4.8,width*.86)*.5;
  const start=billboardPositions.length/3;
  billboardPositions.push(x-half,y-.69,z,x+half,y-.69,z,
   x+half,y+.69,z,x-half,y+.69,z);
  const atlasRow=n%3,vBottom=1-(atlasRow+1)*85/256,vTop=1-atlasRow*85/256;
  billboardUV.push(0,vBottom,1,vBottom,1,vTop,0,vTop);
  billboardIndices.push(start,start+1,start+2,start,start+2,start+3);
 }
 const billboardGeometry=new THREE.BufferGeometry();
 billboardGeometry.setAttribute('position',new THREE.Float32BufferAttribute(billboardPositions,3));
 billboardGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(billboardUV,2));
 billboardGeometry.setIndex(billboardIndices);billboardGeometry.computeVertexNormals();
 const billboardMaterial=new THREE.MeshStandardMaterial({
  map:neonMap,emissive:0xffffff,emissiveMap:neonGlowMap,
  emissiveIntensity:.88,metalness:.22,roughness:.53,side:THREE.DoubleSide
 });
 const skylineBillboards=new THREE.Mesh(billboardGeometry,billboardMaterial);
 skylineBillboards.name='bangkok-skyline-batched-thai-neon-fascia';
 group.add(skylineBillboards);
 // Eight slender antennas are batched into one additional draw call,
 // all outside the drivable road; no shadows or dynamic lights.
 const mastMaterial=new THREE.MeshStandardMaterial({color:0x9ba9b3,metalness:.74,roughness:.44});
 const mastMesh=new THREE.InstancedMesh(new THREE.CylinderGeometry(.025,.065,1,6),mastMaterial,rooftopMasts.length);
 const mastDummy=new THREE.Object3D();
 for(let i=0;i<rooftopMasts.length;i++){
  const p=rooftopMasts[i];
  mastDummy.position.set(p.x,p.y+p.height*.5,p.z);
  mastDummy.scale.set(1,p.height,1);mastDummy.updateMatrix();
  mastMesh.setMatrixAt(i,mastDummy.matrix);
 }
 mastMesh.instanceMatrix.needsUpdate=true;group.add(mastMesh);
 // Twelve low-cost aviation warning lamps give tall Bangkok rooftops scale.
 // Single instanced draw call; no shadows, dynamic lights or animation.
 const beaconMaterial=new THREE.MeshBasicMaterial({color:0xff3025});
 const beaconGeometry=new THREE.SphereGeometry(.115,8,6);
 const beaconTowers=[1,3,5,7,9,11,13,15,17,19,21,23];
 const beacons=new THREE.InstancedMesh(beaconGeometry,beaconMaterial,beaconTowers.length);
 const beaconPose=new THREE.Object3D();
 for(let b=0;b<beaconTowers.length;b++){
  const i=beaconTowers[b],height=10+(i*13%19),side=i%2===0?-1:1;
  beaconPose.position.set(side*(12+(i*7%17)),height-1.34,-15-Math.floor(i/2)*9);
  beaconPose.updateMatrix();beacons.setMatrixAt(b,beaconPose.matrix);
 }
 beacons.instanceMatrix.needsUpdate=true;
 beacons.name='expressway-rooftop-aviation-beacons';
 group.add(beacons);
 const steel=new THREE.MeshStandardMaterial({color:0x69717a,roughness:.55,metalness:.65});
 const warm=new THREE.MeshBasicMaterial({color:0xffe6ac});
 const box=(w,h,d,mat,x,y,z)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);mesh.position.set(x,y,z);return mesh;};
 // Three instanced parts replace 48 individual lamp meshes on mobile.
 const lampCount=16,lampPositions=[];
 const lampPoles=new THREE.InstancedMesh(new THREE.BoxGeometry(.14,6.1,.14),steel,lampCount);
 const lampArms=new THREE.InstancedMesh(new THREE.BoxGeometry(1.35,.11,.16),steel,lampCount);
 const lampHeads=new THREE.InstancedMesh(new THREE.BoxGeometry(.8,.08,.22),warm,lampCount);
 const lampDummy=new THREE.Object3D();
 // Warm streetlight spill baked once, instanced to avoid per-lamp lights and draw calls.
 const poolCanvas=document.createElement('canvas');poolCanvas.width=128;poolCanvas.height=256;
 const pc=poolCanvas.getContext('2d');
 // Wet asphalt reflects sodium lamps as broken longitudinal highlights,
 // not circular orange decals. Entire effect is baked into the existing atlas.
 const poolGlow=pc.createRadialGradient(64,128,3,64,128,120);
 poolGlow.addColorStop(0,'rgba(255,237,192,.76)');
 poolGlow.addColorStop(.19,'rgba(255,211,141,.42)');
 poolGlow.addColorStop(.54,'rgba(245,184,109,.13)');
 poolGlow.addColorStop(1,'rgba(255,180,92,0)');
 pc.save();pc.translate(64,128);pc.scale(.42,1);
 pc.fillStyle=poolGlow;pc.fillRect(-155,-128,310,256);pc.restore();
 // Two broken wheel-track highlights anchor the sodium reflection to wet
 // asphalt rather than a floating glow. All marks are baked into the same
 // 128x256 canvas; zero new textures, meshes, lights or draw calls.
 for(let track=0;track<2;track++){
  const center=track===0?49:79;
  for(let j=0;j<23;j++){
   const y=9+j*11+((j*7+track*3)%7);
   const x=center+((j*13+track*11)%9)-4;
   const width=1+(j%3),length=3+((j*17)%12);
   const glint=pc.createLinearGradient(x,y,x,y+length);
   glint.addColorStop(0,'rgba(255,231,179,0)');
   glint.addColorStop(.36,'rgba(255,231,179,.28)');
   glint.addColorStop(.68,'rgba(255,244,210,.20)');
   glint.addColorStop(1,'rgba(255,231,179,0)');
   pc.fillStyle=glint;pc.fillRect(x,y,width,length);
  }
 }
 // Thin, discontinuous specular streaks follow the direction of travel.
 for(let i=0;i<32;i++){
  const x=64+((i*37)%49)-24,y=17+((i*53)%218);
  const w=1+(i%3),h=5+((i*11)%24);
  const fade=pc.createLinearGradient(x,y,x,y+h);
  fade.addColorStop(0,'rgba(255,225,169,0)');
  fade.addColorStop(.45,'rgba(255,225,169,.18)');
  fade.addColorStop(1,'rgba(255,225,169,0)');
  pc.fillStyle=fade;pc.fillRect(x,y,w,h);
 }
 // Wide, interrupted headlamp reflections on rain-soaked expressway asphalt.
 // Draw into the existing shared light-pool atlas, with no extra GPU resources.
 // The taper and gaps read as reflected beams instead of painted road lines.
 for(let beam=0;beam<2;beam++){
  const center=beam===0?27:101;
  for(let segment=0;segment<16;segment++){
   const y=18+segment*14+((segment*7+beam*3)%5);
   const span=4+(segment%4)*2;
   const x=center-Math.floor(span/2)+((segment*11)%7)-3;
   const alpha=.08+(segment%5)*.023;
   const sheen=pc.createLinearGradient(x,y,x,y+span);
   sheen.addColorStop(0,'rgba(222,235,243,0)');
   sheen.addColorStop(.4,'rgba(222,235,243,'+alpha.toFixed(3)+')');
   sheen.addColorStop(1,'rgba(222,235,243,0)');
   pc.fillStyle=sheen;pc.fillRect(x,y,2+(segment%3),span);
  }
 }
 // Cool LED and neon reflections break up the sodium-orange lamp pools.
 // Baked into the existing shared canvas: no extra textures or draw calls.
 // Short offset fragments suggest shallow puddles, not painted lane stripes.
 for(let bank=0;bank<2;bank++){
  const center=bank===0?37:91;
  for(let j=0;j<18;j++){
   const y=15+j*13+((j*5+bank*7)%9);
   const x=center+((j*17+bank*11)%17)-8;
   const width=1+(j%3),height=4+((j*7)%17);
   const glimmer=pc.createLinearGradient(x,y,x,y+height);
   const tint=(j+bank)%4===0?'157,213,255':'113,193,214';
   glimmer.addColorStop(0,'rgba('+tint+',0)');
   glimmer.addColorStop(.42,'rgba('+tint+',.22)');
   glimmer.addColorStop(.7,'rgba('+tint+',.12)');
   glimmer.addColorStop(1,'rgba('+tint+',0)');
   pc.fillStyle=glimmer;pc.fillRect(x,y,width,height);
  }
 }
 const poolTexture=new THREE.CanvasTexture(poolCanvas);poolTexture.colorSpace=THREE.SRGBColorSpace;
 const poolMaterial=new THREE.MeshBasicMaterial({
  map:poolTexture,color:0xffe8c5,transparent:true,opacity:.38,
  blending:THREE.AdditiveBlending,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1
 });
 const lightPools=new THREE.InstancedMesh(new THREE.PlaneGeometry(3.8,10.5),poolMaterial,lampCount);
 const poolDummy=new THREE.Object3D();lightPools.frustumCulled=false;
 for(let i=0;i<lampCount;i++){
  const side=i%2===0?-1:1;
  lampPositions.push({side,x:side*5.9,z:-7-Math.floor(i/2)*21});
 }
 function placeLamps(){
  for(let i=0;i<lampCount;i++){
   const p=lampPositions[i];
   lampDummy.position.set(p.x,3.05,p.z);lampDummy.updateMatrix();lampPoles.setMatrixAt(i,lampDummy.matrix);
   lampDummy.position.set(p.x-p.side*.61,6.05,p.z);lampDummy.updateMatrix();lampArms.setMatrixAt(i,lampDummy.matrix);
   lampDummy.position.set(p.x-p.side*1.03,5.97,p.z);lampDummy.updateMatrix();lampHeads.setMatrixAt(i,lampDummy.matrix);
   poolDummy.position.set(p.side*4.1,.135,p.z);poolDummy.rotation.x=-Math.PI/2;
   poolDummy.updateMatrix();lightPools.setMatrixAt(i,poolDummy.matrix);
  }
  lampPoles.instanceMatrix.needsUpdate=true;
  lampArms.instanceMatrix.needsUpdate=true;
  lampHeads.instanceMatrix.needsUpdate=true;
  lightPools.instanceMatrix.needsUpdate=true;
 }
 placeLamps();group.add(lampPoles,lampArms,lampHeads,lightPools);
 // Three elevated Bangkok interchange crossovers create real overhead depth
 // after 12,000 points. All concrete stays >=7.7m above the road and piers
 // stand outside the 11m carriageway, preserving the full dodge corridor.
 // Six piers, three decks and six safety parapets cost only 3 draw calls.
 const flyoverCanvas=document.createElement('canvas');flyoverCanvas.width=flyoverCanvas.height=128;
 const fc=flyoverCanvas.getContext('2d');fc.fillStyle='#a4a8a7';fc.fillRect(0,0,128,128);
 for(let i=0;i<240;i++){
  const x=(i*71+17)%128,y=(i*47+31)%128;
  fc.fillStyle=i%5===0?'rgba(48,55,58,.20)':'rgba(230,229,218,.13)';
  fc.fillRect(x,y,1+(i%4),3+(i%13));
 }
 // Long rain streaks and formwork seams read as weathered reinforced concrete.
 fc.fillStyle='rgba(54,61,65,.18)';
 for(let i=0;i<7;i++)fc.fillRect(0,17+i*19,128,1);
 // Elevated interchange expansion joints and water runoff: baked into the
 // existing shared PBR concrete atlas, with no added meshes or draw calls.
 // Uneven black bitumen seams and vertical rust runoff give the flyovers
 // the weathered scale of Bangkok's real elevated infrastructure.
 for(let joint=0;joint<3;joint++){
  const y=24+joint*43;
  fc.fillStyle='rgba(24,31,34,.63)';fc.fillRect(0,y,128,3);
  fc.fillStyle='rgba(221,215,202,.29)';fc.fillRect(0,y+3,128,1);
  for(let bolt=0;bolt<8;bolt++){
   const x=7+bolt*16;
   fc.fillStyle='rgba(47,42,37,.55)';fc.fillRect(x,y-2,3,2);
   fc.fillStyle='rgba(147,86,49,.35)';fc.fillRect(x+1,y+4,2,8+(bolt*7+joint*3)%16);
  }
 }
 for(let stain=0;stain<14;stain++){
  const x=(stain*41+19)%124,start=(stain*17+11)%93;
  const len=18+(stain*13)%34;
  const runoff=fc.createLinearGradient(x,start,x,start+len);
  runoff.addColorStop(0,'rgba(46,51,48,.32)');
  runoff.addColorStop(1,'rgba(46,51,48,0)');
  fc.fillStyle=runoff;fc.fillRect(x,start,2+(stain%3),len);
 }
 // Baked concrete pore normals, formwork joints and shallow rain erosion.
 // Shared by all flyover piers/decks: no extra geometry, lights or draw calls.
 const flyoverNormalCanvas=document.createElement('canvas');
 flyoverNormalCanvas.width=flyoverNormalCanvas.height=128;
 const fnctx=flyoverNormalCanvas.getContext('2d');
 const concreteHeight=(x,y)=>{
  const seam=(y%19===17||y%19===18)?-17:0;
  const pores=((x*73+y*151+x*y*7)%29)-14;
  const streak=(x%23<2&&y%19>3)?-6:0;
  return seam+pores*.72+streak;
 };
 const fnImage=fnctx.createImageData(128,128);
 for(let y=0;y<128;y++)for(let x=0;x<128;x++){
  const dx=concreteHeight((x+1)%128,y)-concreteHeight((x+127)%128,y);
  const dy=concreteHeight(x,(y+1)%128)-concreteHeight(x,(y+127)%128);
  const inv=1/Math.hypot(dx*.025,dy*.025,1);
  const i=(y*128+x)*4;
  fnImage.data[i]=Math.round(127.5*(1-dx*.025*inv));
  fnImage.data[i+1]=Math.round(127.5*(1-dy*.025*inv));
  fnImage.data[i+2]=Math.round(127.5*(1+inv));
  fnImage.data[i+3]=255;
 }
 fnctx.putImageData(fnImage,0,0);
 const flyoverNormalTexture=new THREE.CanvasTexture(flyoverNormalCanvas);
 const flyoverTexture=new THREE.CanvasTexture(flyoverCanvas);
 flyoverTexture.colorSpace=THREE.SRGBColorSpace;
 const flyoverConcrete=new THREE.MeshStandardMaterial({color:0xd1d2cd,map:flyoverTexture,normalMap:flyoverNormalTexture,normalScale:new THREE.Vector2(.42,.42),roughness:.93,metalness:0});
 const flyoverZ=[-38,-98,-158];
 // Chamfered, flared concrete interchange columns instead of box piers.
 // Six instances share one 96-triangle PBR geometry and the existing material.
 // Their nearest edge remains x=6.71m, outside the drivable corridor.
 const pierRings=[
  [-3.90,.86,1.05,.11],[-3.72,.94,1.12,.11],
  [2.50,.95,1.12,.12],[3.16,1.18,1.34,.14],
  [3.64,1.43,1.55,.16],[3.90,1.48,1.60,.16]
 ];
 function makeBangkokFlyoverPier(){
  const positions=[],uvs=[];
  const outline=([y,width,depth,cut])=>{
   const w=width/2,d=depth/2;
   return [[-w+cut,-d],[w-cut,-d],[w,-d+cut],[w,d-cut],
    [w-cut,d],[-w+cut,d],[-w,d-cut],[-w,-d+cut]]
    .map(([x,z])=>[x,y,z]);
  };
  const rings=pierRings.map(outline);
  function triangle(a,b,c,ua,ub,uc){
   for(const [point,uv] of [[a,ua],[b,ub],[c,uc]]){
    positions.push(...point);uvs.push(...uv);
   }
  }
  for(let level=0;level<rings.length-1;level++){
   const v0=(pierRings[level][0]+3.9)/7.8,v1=(pierRings[level+1][0]+3.9)/7.8;
   for(let edge=0;edge<8;edge++){
    const next=(edge+1)%8;
    const a=rings[level][edge],b=rings[level][next];
    const c=rings[level+1][edge],d=rings[level+1][next];
    triangle(a,c,b,[0,v0],[0,v1],[1,v0]);
    triangle(b,c,d,[1,v0],[0,v1],[1,v1]);
   }
  }
  const bottom=[0,-3.9,0],top=[0,3.9,0];
  for(let edge=0;edge<8;edge++){
   const next=(edge+1)%8;
   triangle(bottom,rings[0][edge],rings[0][next],[.5,.5],[0,0],[1,0]);
   triangle(top,rings[rings.length-1][next],rings[rings.length-1][edge],
    [.5,.5],[1,1],[0,1]);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  geometry.computeVertexNormals();
  return geometry;
 }
 const flyoverPiers=new THREE.InstancedMesh(makeBangkokFlyoverPier(),flyoverConcrete,6);
 const flyoverDecks=new THREE.InstancedMesh(new THREE.BoxGeometry(15.9,.75,2.6),flyoverConcrete,3);
 const flyoverParapets=new THREE.InstancedMesh(new THREE.BoxGeometry(15.9,.62,.18),flyoverConcrete,6);
 // Structural I-section girders under each crossover: shaped flanges/web,
 // not floating rectangular slabs. Six beams share one PBR draw call.
 // Lowest point is 7.36m, safely above every drivable lane.
 const girderProfile=new THREE.Shape();
 const girderPoints=[
  [-.18,-.19],[.18,-.19],[.18,-.135],[.045,-.135],
  [.045,.135],[.18,.135],[.18,.19],[-.18,.19],
  [-.18,.135],[-.045,.135],[-.045,-.135],[-.18,-.135]
 ];
 girderProfile.moveTo(...girderPoints[0]);
 for(let k=1;k<girderPoints.length;k++)girderProfile.lineTo(...girderPoints[k]);
 girderProfile.closePath();
 const girderGeometry=new THREE.ExtrudeGeometry(girderProfile,{
  depth:15.3,steps:1,bevelEnabled:false,curveSegments:1
 });
 girderGeometry.translate(0,0,-7.65);
 girderGeometry.rotateY(Math.PI/2);
 const flyoverGirders=new THREE.InstancedMesh(girderGeometry,steel,6);
 // Broad weathered concrete pier heads tie the uprights to the deck;
 // all six stay beyond the road edge, without collision or shadows.
 const flyoverPierCaps=new THREE.InstancedMesh(
  new THREE.BoxGeometry(1.72,.5,3.08),flyoverConcrete,6
 );
 const flyoverMatrix=new THREE.Matrix4();
 function placeFlyovers(){
  for(let i=0;i<flyoverZ.length;i++){
   const z=flyoverZ[i];
   flyoverMatrix.makeTranslation(0,8.15,z);
   flyoverDecks.setMatrixAt(i,flyoverMatrix);
   for(let j=0;j<2;j++){
    flyoverMatrix.makeTranslation(j?7.45:-7.45,3.9,z);
    flyoverPiers.setMatrixAt(i*2+j,flyoverMatrix);
    flyoverMatrix.makeTranslation(0,8.88,z+(j?1.19:-1.19));
    flyoverParapets.setMatrixAt(i*2+j,flyoverMatrix);
    flyoverMatrix.makeTranslation(0,7.55,z+(j?.87:-.87));
    flyoverGirders.setMatrixAt(i*2+j,flyoverMatrix);
    flyoverMatrix.makeTranslation(j?7.45:-7.45,7.45,z);
    flyoverPierCaps.setMatrixAt(i*2+j,flyoverMatrix);
   }
  }
  flyoverPiers.instanceMatrix.needsUpdate=true;
  flyoverDecks.instanceMatrix.needsUpdate=true;
  flyoverParapets.instanceMatrix.needsUpdate=true;
  flyoverGirders.instanceMatrix.needsUpdate=true;
  flyoverPierCaps.instanceMatrix.needsUpdate=true;
 }
 placeFlyovers();group.add(flyoverPiers,flyoverDecks,flyoverParapets,flyoverGirders,flyoverPierCaps);

 // The elevated crossovers now have a worn asphalt wearing course instead of
 // exposed pale concrete. One 256x128 baked PBR atlas provides faded paint,
 // tyre polish, repaired patches and expansion joints for all three decks.
 // Surface stays inside the concrete deck and 6mm below moving lamp pools.
 const bridgeAsphaltCanvas=document.createElement('canvas');
 bridgeAsphaltCanvas.width=256;bridgeAsphaltCanvas.height=128;
 const bac=bridgeAsphaltCanvas.getContext('2d');
 bac.fillStyle='#34383c';bac.fillRect(0,0,256,128);
 for(let i=0;i<920;i++){
  const x=(i*71+17)%256,y=(i*97+29)%128;
  bac.fillStyle=i%4===0?'rgba(173,170,158,.13)':'rgba(10,15,18,.13)';
  bac.fillRect(x,y,1+i%3,1+(i%5===0?2:0));
 }
 for(const y of [29,43,85,99]){
  const wear=bac.createLinearGradient(0,y-4,0,y+4);
  wear.addColorStop(0,'rgba(14,18,21,0)');
  wear.addColorStop(.5,'rgba(14,18,21,.20)');
  wear.addColorStop(1,'rgba(14,18,21,0)');
  bac.fillStyle=wear;bac.fillRect(0,y-4,256,8);
 }
 // Paired rain-darkened wheel ruts and intermittent oily sheen from heavy traffic.
 // Baked into the existing asphalt atlas, with no added geometry or draw calls.
 // Keep contrast low so lane markings and the dodge corridor remain readable.
 for(const trackY of [27,38,85,98]){
  const rut=bac.createLinearGradient(0,trackY-3,0,trackY+3);
  rut.addColorStop(0,'rgba(9,14,18,0)');
  rut.addColorStop(.45,'rgba(7,12,16,.26)');
  rut.addColorStop(.65,'rgba(8,14,18,.20)');
  rut.addColorStop(1,'rgba(9,14,18,0)');
  bac.fillStyle=rut;bac.fillRect(0,trackY-3,256,6);
  for(let section=0;section<9;section++){
   const x=section*31+(section%3)*4;
   bac.fillStyle=section%3===0?'rgba(132,150,152,.14)':'rgba(103,121,126,.08)';
   bac.fillRect(x,trackY+1,13+(section%4)*3,1);
  }
 }
 bac.fillStyle='rgba(207,208,196,.48)';
 bac.fillRect(0,8,256,2);bac.fillRect(0,118,256,2);
 for(let x=9;x<256;x+=43){
  bac.fillStyle='rgba(231,222,188,.53)';bac.fillRect(x,62,26,3);
  bac.fillStyle='rgba(53,57,59,.38)';bac.fillRect(x+4,63,7,1);
 }
 // Faded diagonal shoulder-hazard hatching on both edges of the elevated deck.
 // Painted directly into the shared asphalt atlas: no geometry, lighting or draw-call cost.
 // Low-opacity strokes preserve the worn, rain-darkened Bangkok road surface.
 bac.save();
 for(const shoulderY of [13,108]){
  bac.beginPath();bac.rect(0,shoulderY,256,10);bac.clip();
  for(let x=-20;x<276;x+=24){
   bac.beginPath();bac.moveTo(x,shoulderY+10);bac.lineTo(x+12,shoulderY);
   bac.strokeStyle='rgba(219,190,113,.35)';bac.lineWidth=4;bac.stroke();
   bac.beginPath();bac.moveTo(x+1,shoulderY+10);bac.lineTo(x+13,shoulderY);
   bac.strokeStyle='rgba(24,29,31,.24)';bac.lineWidth=1;bac.stroke();
  }
  bac.restore();bac.save();
 }
 bac.restore();
 bac.fillStyle='rgba(18,23,27,.18)';
 bac.fillRect(29,14,39,28);bac.fillRect(174,87,48,22);
 for(const x of [58,128,198]){
  bac.fillStyle='rgba(9,12,14,.62)';bac.fillRect(x,0,2,128);
  bac.fillStyle='rgba(156,153,145,.23)';bac.fillRect(x+2,0,1,128);
 }
 // Recessed amber/white road studs guide the shoulder at night.
 // Bake tiny retroreflective glints into the existing deck atlas rather than
 // creating emissive meshes or realtime lights. Alternate color and brightness
 // to suggest worn reflectors, with dark sockets anchored to the road surface.
 for(const shoulderY of [9,119]){
  for(let x=12,stud=0;x<256;x+=24,stud++){
   bac.fillStyle='rgba(8,12,14,.62)';
   bac.fillRect(x-2,shoulderY-2,7,5);
   const amber=(stud+Math.floor(shoulderY/100))%3===0;
   bac.fillStyle=amber?'rgba(239,174,74,.80)':'rgba(223,231,220,.72)';
   bac.fillRect(x,shoulderY-1,4,2);
   bac.fillStyle=amber?'rgba(255,214,129,.50)':'rgba(255,255,240,.45)';
   bac.fillRect(x+1,shoulderY-1,2,1);
  }
 }
 // Irregular sealed expansion cracks and patched pothole edges on the elevated deck.
 // Baked into the existing asphalt atlas: zero extra meshes, materials or draw calls.
 for(let seam=0;seam<7;seam++){
  const sx=13+seam*36,sy=15+(seam*23)%91;
  bac.beginPath();bac.moveTo(sx,sy);
  for(let step=1;step<=5;step++)bac.lineTo(sx+step*4,sy+Math.sin(step*1.7+seam)*3+step*.6);
  bac.strokeStyle='rgba(8,11,13,.62)';bac.lineWidth=2.3;bac.stroke();
  bac.strokeStyle='rgba(111,110,103,.30)';bac.lineWidth=.65;bac.stroke();
 }
 for(const patch of [[44,48,21,10],[153,18,30,8],[206,101,25,11]]){
  const [x,y,w,h]=patch;
  bac.fillStyle='rgba(17,22,25,.32)';bac.fillRect(x,y,w,h);
  bac.strokeStyle='rgba(119,114,103,.26)';bac.lineWidth=1;
  bac.strokeRect(x+.5,y+.5,w-1,h-1);
  for(let grain=0;grain<12;grain++){
   const gx=x+(grain*13+3)%w,gy=y+(grain*7+2)%h;
   bac.fillStyle=grain%3?'rgba(171,165,150,.12)':'rgba(5,9,12,.20)';
   bac.fillRect(gx,gy,2,1);
  }
 }
 // Curved braking scuffs near the interchange: paired, feathered tyre arcs
 // baked into the asphalt atlas. No runtime geometry, transparency or draw calls.
 // Keep the centre lane markings readable and leave the dodge corridor unchanged.
 bac.save();
 bac.lineCap='round';
 for(const [startX,startY,drift] of [[26,37,7],[142,91,-6]]){
  for(const offset of [-3,3]){
   bac.beginPath();
   bac.moveTo(startX,startY+offset);
   bac.bezierCurveTo(startX+18,startY+offset+drift*.22,
    startX+40,startY+offset+drift*.8,startX+62,startY+offset+drift);
   bac.strokeStyle='rgba(10,13,15,.24)';
   bac.lineWidth=2.8;bac.stroke();
   // Interrupted rubber deposit avoids a solid black cartoon stripe.
   bac.setLineDash([7,5,11,4]);
   bac.strokeStyle='rgba(7,10,12,.28)';
   bac.lineWidth=1.1;bac.stroke();
   bac.setLineDash([]);
  }
 }
 bac.restore();
 // Rain-fed runoff at the outside parapet: dark drainage channel, broken
 // silvery water edge and intermittent steel drain grates. This is painted
 // into the shared flyover asphalt atlas, not separate road geometry.
 // Both shoulders remain unobstructed and the driving lanes are untouched.
 for(const edgeY of [17,105]){
  const lip=bac.createLinearGradient(0,edgeY-3,0,edgeY+3);
  lip.addColorStop(0,'rgba(7,13,17,0)');
  lip.addColorStop(.38,'rgba(7,13,17,.42)');
  lip.addColorStop(.68,'rgba(12,22,28,.48)');
  lip.addColorStop(1,'rgba(7,13,17,0)');
  bac.fillStyle=lip;bac.fillRect(0,edgeY-3,256,6);
  for(let segment=0;segment<18;segment++){
   const x=segment*15+(segment%4)*2;
   bac.fillStyle=segment%3===0?'rgba(164,179,181,.28)':'rgba(111,133,141,.13)';
   bac.fillRect(x,edgeY+(segment%3)-1,7+(segment%4),1);
  }
  for(const drainX of [36,126,216]){
   bac.fillStyle='rgba(6,10,12,.78)';
   bac.fillRect(drainX,edgeY-2,17,5);
   bac.fillStyle='rgba(128,143,146,.45)';
   bac.fillRect(drainX,edgeY-2,17,1);
   for(let slot=0;slot<5;slot++){
    bac.fillStyle='rgba(2,5,7,.9)';
    bac.fillRect(drainX+2+slot*3,edgeY-1,1,3);
   }
  }
 }
 // Damp tyre-polished lanes catch headlamp glints without extra lights or meshes.
 // Broad translucent streaks are interrupted by dry gaps, avoiding a plastic sheen.
 for(const laneY of [33,91]){
  for(let segment=0;segment<9;segment++){
   const x=segment*31+(segment%3)*3;
   const width=16+(segment*7)%13;
   const sheen=bac.createLinearGradient(0,laneY-5,0,laneY+5);
   sheen.addColorStop(0,'rgba(148,158,166,0)');
   sheen.addColorStop(.42,'rgba(148,158,166,.13)');
   sheen.addColorStop(.56,'rgba(185,190,190,.17)');
   sheen.addColorStop(1,'rgba(148,158,166,0)');
   bac.fillStyle=sheen;bac.fillRect(x,laneY-5,width,10);
  }
 }
 // Rainwater gathers in shallow, irregular wheel-track depressions. Bake
 // broken amber/cool reflections into the existing road atlas rather than
 // adding transparent planes, lights, textures or per-frame animation.
 // Narrow discontinuous strokes avoid the mirror-like toy-road appearance.
 for(const [trackY,tint] of [[27,'191,171,128'],[38,'135,166,188'],[85,'191,171,128'],[98,'135,166,188']]){
  for(let segment=0;segment<16;segment++){
   const x=segment*17+(segment*11%7),span=5+(segment*13%12);
   const y=trackY+(segment*7%5)-2;
   const glow=bac.createLinearGradient(x,y,x+span,y);
   glow.addColorStop(0,'rgba('+tint+',0)');
   glow.addColorStop(.3,'rgba('+tint+',.22)');
   glow.addColorStop(.7,'rgba('+tint+',.12)');
   glow.addColorStop(1,'rgba('+tint+',0)');
   bac.fillStyle=glow;bac.fillRect(x,y,span,1+(segment%4===0?1:0));
  }
 }
 const bridgeAsphaltTexture=new THREE.CanvasTexture(bridgeAsphaltCanvas);
 bridgeAsphaltTexture.colorSpace=THREE.SRGBColorSpace;
 bridgeAsphaltTexture.anisotropy=2;
 // Rain-polished wheel tracks on the crossover deck: a tiny shared PBR
 // roughness atlas, generated once, gives wet ruts a different specular response.
 // No new meshes, lights, draw calls or per-frame canvas work.
 const bridgeRoughCanvas=document.createElement('canvas');
 bridgeRoughCanvas.width=256;bridgeRoughCanvas.height=128;
 const brc=bridgeRoughCanvas.getContext('2d');
 brc.fillStyle='#e1e1e1';brc.fillRect(0,0,256,128);
 for(const trackY of [39,47,81,89]){
  const damp=brc.createLinearGradient(0,trackY-7,0,trackY+7);
  damp.addColorStop(0,'rgba(30,30,30,0)');
  damp.addColorStop(.45,'rgba(30,30,30,.70)');
  damp.addColorStop(.65,'rgba(30,30,30,.58)');
  damp.addColorStop(1,'rgba(30,30,30,0)');
  brc.fillStyle=damp;brc.fillRect(0,trackY-7,256,14);
 }
 // Match the three repaired pothole patches in the albedo atlas with
 // smoother bitumen seams and coarse, high-roughness aggregate interiors.
 // This corrects a visible PBR mismatch without extra draw calls or textures.
 for(const [x,y,w,h] of [[44,48,21,10],[153,18,30,8],[206,101,25,11]]){
  brc.fillStyle='#c8c8c8';brc.fillRect(x,y,w,h);
  brc.strokeStyle='#505050';brc.lineWidth=2;
  brc.strokeRect(x+.5,y+.5,w-1,h-1);
  for(let grain=0;grain<24;grain++){
   const gx=x+(grain*13+3)%w,gy=y+(grain*7+2)%h;
   brc.fillStyle=grain%3?'rgba(255,255,255,.20)':'rgba(15,15,15,.12)';
   brc.fillRect(gx,gy,2,1);
  }
 }
 for(let i=0;i<720;i++){
  const x=(i*73+19)%256,y=(i*101+7)%128;
  brc.fillStyle=i%3?'rgba(255,255,255,.14)':'rgba(15,15,15,.15)';
  brc.fillRect(x,y,1+i%2,1);
 }
 const bridgeRoughTexture=new THREE.CanvasTexture(bridgeRoughCanvas);
 bridgeRoughTexture.anisotropy=2;
 const bridgeAsphaltMaterial=new THREE.MeshStandardMaterial({
  map:bridgeAsphaltTexture,roughnessMap:bridgeRoughTexture,roughness:.93,metalness:0
 });
 const bridgeAsphaltGeometry=new THREE.PlaneGeometry(15.65,2.44);
 bridgeAsphaltGeometry.rotateX(-Math.PI/2);
 const bridgeAsphalt=new THREE.InstancedMesh(bridgeAsphaltGeometry,bridgeAsphaltMaterial,flyoverZ.length);
 bridgeAsphalt.name='bangkok-flyover-worn-asphalt-and-lane-markings';
 for(let i=0;i<flyoverZ.length;i++){
  flyoverMatrix.makeTranslation(0,8.529,flyoverZ[i]);
  bridgeAsphalt.setMatrixAt(i,flyoverMatrix);
 }
 bridgeAsphalt.instanceMatrix.needsUpdate=true;
 group.add(bridgeAsphalt);

 // Elevated expressway cross-traffic: paired LED lenses, not toy-block car
 // bodies. Two instanced draw calls for 12 moving vehicles; all >8m above
 // the drivable road, with no new lights, collision meshes or network assets.
 const bridgeCarCount=12,bridgeLampCount=bridgeCarCount*2;
 const bridgeHeadMaterial=new THREE.MeshBasicMaterial({color:0xf0f4ff,toneMapped:false});
 const bridgeTailMaterial=new THREE.MeshBasicMaterial({color:0xff2417,toneMapped:false});
 const bridgeLensGeometry=new THREE.SphereGeometry(.13,8,6);
 const bridgeHeadlights=new THREE.InstancedMesh(bridgeLensGeometry,bridgeHeadMaterial,bridgeLampCount);
 const bridgeTaillights=new THREE.InstancedMesh(bridgeLensGeometry,bridgeTailMaterial,bridgeLampCount);
 // Moving cool headlamp / red taillamp reflections on the flyover deck.
 // 24 batched planes, one shared 128px texture, one draw call, zero real lights.
 const bridgeGlowCanvas=document.createElement('canvas');
 bridgeGlowCanvas.width=bridgeGlowCanvas.height=128;
 const bgc=bridgeGlowCanvas.getContext('2d');
 // Stretch the light falloff along the direction of travel: wet asphalt
 // produces broken longitudinal streaks, not circular glowing stickers.
 bgc.save();bgc.translate(64,64);bgc.scale(.34,1);
 const bridgeGlowGradient=bgc.createRadialGradient(0,0,2,0,0,64);
 bridgeGlowGradient.addColorStop(0,'rgba(255,255,255,.8)');
 bridgeGlowGradient.addColorStop(.22,'rgba(255,255,255,.45)');
 bridgeGlowGradient.addColorStop(.58,'rgba(255,255,255,.14)');
 bridgeGlowGradient.addColorStop(1,'rgba(255,255,255,0)');
 bgc.fillStyle=bridgeGlowGradient;bgc.fillRect(-192,-64,384,128);
 bgc.restore();
 // Broken longitudinal reflections from wet road grooves, baked once into
 // the existing glow texture; no extra geometry, draw calls or live lights.
 bgc.save();
 bgc.globalCompositeOperation='destination-out';
 for(let track=0;track<2;track++){
  const x=track===0?49:78;
  for(let n=0;n<8;n++){
   const y=15+n*14+(track?5:0);
   const width=3+(n*3+track)%5;
   bgc.fillStyle='rgba(0,0,0,'+(.32+(n%3)*.12)+')';
   bgc.fillRect(x-width/2,y,width,3+(n%2)*2);
  }
 }
 bgc.restore();
 const bridgeGlowTexture=new THREE.CanvasTexture(bridgeGlowCanvas);
 const bridgeGlowMaterial=new THREE.MeshBasicMaterial({
  map:bridgeGlowTexture,transparent:true,opacity:.43,
  blending:THREE.AdditiveBlending,depthWrite:false,
  polygonOffset:true,polygonOffsetFactor:-1,side:THREE.DoubleSide,
  toneMapped:false
 });
 const bridgeGlowGeometry=new THREE.PlaneGeometry(.85,2.3);
 bridgeGlowGeometry.rotateX(-Math.PI/2);
 const bridgeRoadGlows=new THREE.InstancedMesh(bridgeGlowGeometry,bridgeGlowMaterial,bridgeCarCount*2);
 bridgeRoadGlows.name='bangkok-flyover-moving-headlight-reflections';
 bridgeRoadGlows.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
 bridgeRoadGlows.frustumCulled=false;
 const bridgeGlowDummy=new THREE.Object3D();
 for(let i=0;i<bridgeCarCount;i++){
  bridgeRoadGlows.setColorAt(i*2,new THREE.Color(0xb9dcff));
  bridgeRoadGlows.setColorAt(i*2+1,new THREE.Color(0xff3620));
 }
 const bridgeLightDummy=new THREE.Object3D();
 const bridgeCarProgress=Array.from({length:bridgeCarCount},(_,i)=>((i*7)%13)/13);
 // Real shaded sedan silhouettes accompany the elevated traffic lights.
 // One extruded streamlined shell, side glass and wheel mesh shared by all
 // 12 cars: three instanced draw calls, no GLB fetches or shadow casters.
 // Geometry stays on the crossover deck above 8.5m, not in the dodge lanes.
 const carOutline=new THREE.Shape();
 carOutline.moveTo(-.68,.11);
 carOutline.lineTo(-.64,.28);carOutline.lineTo(-.42,.32);
 carOutline.lineTo(-.25,.55);carOutline.quadraticCurveTo(-.17,.61,-.06,.61);
 carOutline.lineTo(.20,.59);carOutline.lineTo(.42,.32);
 carOutline.lineTo(.64,.29);carOutline.lineTo(.70,.13);
 carOutline.quadraticCurveTo(.70,.09,.62,.09);
 carOutline.lineTo(-.61,.09);carOutline.closePath();
 const carShellGeometry=new THREE.ExtrudeGeometry(carOutline,{
  depth:.92,steps:1,bevelEnabled:true,bevelSegments:1,
  bevelThickness:.025,bevelSize:.025,curveSegments:2
 });
 carShellGeometry.translate(0,0,-.46);
 const carPaint=new THREE.MeshStandardMaterial({color:0xffffff,metalness:.53,roughness:.31});
 const bridgeCarBodies=new THREE.InstancedMesh(carShellGeometry,carPaint,bridgeCarCount);
 const carColors=[0x32b65a,0x282e36,0xf1d353,0x8a1824,0x3dbe6b,0x696e73]; // green/yellow Bangkok taxis
 for(let i=0;i<bridgeCarCount;i++)bridgeCarBodies.setColorAt(i,new THREE.Color(carColors[i%carColors.length]));
 if(bridgeCarBodies.instanceColor)bridgeCarBodies.instanceColor.needsUpdate=true;
 // Bangkok-specific elevated taxi fleet: six of the twelve crossing cars
 // now carry a lit TAXI-METER roof box and matching door livery. Both are
 // instanced (two draw calls total) and reuse one tiny baked atlas. The signs
 // follow the existing cars, stay above the 8m crossover, and never collide
 // with the drivable road or request external assets.
 const taxiCount=bridgeCarCount/2;
 const taxiCanvas=document.createElement('canvas');
 taxiCanvas.width=256;taxiCanvas.height=128;
 const tx=taxiCanvas.getContext('2d');
 tx.fillStyle='#e8e9d8';tx.fillRect(0,0,256,128);
 tx.fillStyle='#1b5b40';tx.fillRect(5,5,246,118);
 tx.fillStyle='#f4f1df';tx.fillRect(10,10,236,108);
 tx.fillStyle='#17613c';tx.fillRect(13,13,230,7);
 tx.fillStyle='#163f34';tx.font='bold 54px Arial,sans-serif';
 tx.textAlign='center';tx.textBaseline='middle';tx.fillText('TAXI',128,55);
 tx.fillStyle='#286d4b';tx.font='bold 22px Arial,sans-serif';
 tx.fillText('METER  BANGKOK',128,96);
 const taxiTexture=new THREE.CanvasTexture(taxiCanvas);
 taxiTexture.colorSpace=THREE.SRGBColorSpace;taxiTexture.anisotropy=2;
 const taxiLiveryMaterial=new THREE.MeshBasicMaterial({
  map:taxiTexture,side:THREE.DoubleSide,toneMapped:false
 });
 const bridgeTaxiRoofSigns=new THREE.InstancedMesh(
  new THREE.BoxGeometry(.45,.18,.20),taxiLiveryMaterial,taxiCount
 );
 const bridgeTaxiDoorSigns=new THREE.InstancedMesh(
  new THREE.PlaneGeometry(.42,.22),taxiLiveryMaterial,taxiCount*2
 );
 const taxiPose=new THREE.Object3D();
 const glassShape=new THREE.Shape();
 glassShape.moveTo(-.33,.33);glassShape.lineTo(-.20,.52);
 glassShape.lineTo(.16,.51);glassShape.lineTo(.34,.33);glassShape.closePath();
 const glassGeometry=new THREE.ShapeGeometry(glassShape);
 const carGlass=new THREE.MeshStandardMaterial({color:0x172c3a,metalness:.32,roughness:.19,side:THREE.DoubleSide});
 const bridgeCarWindows=new THREE.InstancedMesh(glassGeometry,carGlass,bridgeCarCount*2);
 const tyreGeometry=new THREE.CylinderGeometry(.105,.105,.08,8);
 tyreGeometry.rotateX(Math.PI/2);
 const tyreMaterial=new THREE.MeshStandardMaterial({color:0x101215,roughness:.95});
 const bridgeCarWheels=new THREE.InstancedMesh(tyreGeometry,tyreMaterial,bridgeCarCount*4);
 // Three realistic Bangkok cream/red city buses cross on the flyovers,
 // replacing every fourth tiny sedan rather than overlapping it. A single
 // PBR shell, shared baked window atlas and instanced tyres cost three draw
 // calls for all buses. They stay on the elevated decks, not the dodge lanes.
 const bridgeBusIndices=[3,7,11];
 const busSideProfile=new THREE.Shape();
 busSideProfile.moveTo(-1.24,.15);
 busSideProfile.lineTo(-1.24,1.02);
 busSideProfile.quadraticCurveTo(-1.24,1.16,-1.09,1.18);
 busSideProfile.lineTo(1.08,1.18);
 busSideProfile.quadraticCurveTo(1.25,1.16,1.25,1.01);
 busSideProfile.lineTo(1.25,.15);
 busSideProfile.closePath();
 const busShellGeometry=new THREE.ExtrudeGeometry(busSideProfile,{
  depth:.98,steps:1,bevelEnabled:true,bevelThickness:.025,
  bevelSize:.025,bevelSegments:1,curveSegments:3
 });
 busShellGeometry.translate(0,0,-.49);
 const busShellMaterial=new THREE.MeshStandardMaterial({
  color:0xe2d7b9,metalness:.14,roughness:.69
 });
 const bridgeBuses=new THREE.InstancedMesh(busShellGeometry,busShellMaterial,bridgeBusIndices.length);
 bridgeBuses.frustumCulled=false;
 bridgeBuses.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
 const busWindowCanvas=document.createElement('canvas');
 busWindowCanvas.width=256;busWindowCanvas.height=96;
 const bw=busWindowCanvas.getContext('2d');
 bw.fillStyle='#ad3a30';bw.fillRect(0,0,256,96);
 bw.fillStyle='#e5d7bb';bw.fillRect(0,5,256,10);
 for(let panel=0;panel<6;panel++){
  const x=8+panel*41;
  const tint=bw.createLinearGradient(x,17,x+34,76);
  tint.addColorStop(0,'#58717a');tint.addColorStop(.5,'#293d48');
  tint.addColorStop(1,'#152630');
  bw.fillStyle='#222e32';bw.fillRect(x-2,15,39,65);
  bw.fillStyle=tint;bw.fillRect(x,18,35,57);
  bw.fillStyle='rgba(246,223,174,.12)';bw.fillRect(x+2,19,31,9);
  bw.fillStyle='rgba(8,17,23,.48)';
  bw.beginPath();bw.arc(x+19,53,6,0,Math.PI*2);bw.fill();
  bw.fillRect(x+12,60,16,14);
  bw.fillStyle='rgba(197,228,231,.18)';
  bw.beginPath();bw.moveTo(x+7,19);bw.lineTo(x+15,19);
  bw.lineTo(x+7,74);bw.lineTo(x+3,74);bw.closePath();bw.fill();
 }
 bw.fillStyle='#e0c18c';bw.fillRect(0,81,256,4);
 const busWindowTexture=new THREE.CanvasTexture(busWindowCanvas);
 busWindowTexture.colorSpace=THREE.SRGBColorSpace;
 busWindowTexture.anisotropy=2;
 const busWindowMaterial=new THREE.MeshStandardMaterial({
  map:busWindowTexture,roughness:.38,metalness:.12,side:THREE.DoubleSide
 });
 const bridgeBusWindows=new THREE.InstancedMesh(
  new THREE.PlaneGeometry(2.36,.55),busWindowMaterial,bridgeBusIndices.length*2
 );
 bridgeBusWindows.frustumCulled=false;
 bridgeBusWindows.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
 const busTyreGeometry=new THREE.CylinderGeometry(.18,.18,.09,10);
 busTyreGeometry.rotateX(Math.PI/2);
 const busTyreMaterial=new THREE.MeshStandardMaterial({color:0x171b1d,roughness:.94});
 const bridgeBusTyres=new THREE.InstancedMesh(
  busTyreGeometry,busTyreMaterial,bridgeBusIndices.length*4
 );
 bridgeBusTyres.frustumCulled=false;
 bridgeBusTyres.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
 const busPose=new THREE.Object3D();
 const carDummy=new THREE.Object3D();
 function placeBridgeTraffic(){
  for(let i=0;i<bridgeCarCount;i++){
   const bridge=Math.floor(i/4),direction=(i%2===0?1:-1);
   const x=direction*(bridgeCarProgress[i]*13.2-6.6);
   const z=flyoverZ[bridge]+(i%4<2?-.48:.48);
   const vehicleHalfLength=i%4===3?1.16:.52;
   const frontX=x+direction*vehicleHalfLength,rearX=x-direction*vehicleHalfLength;
   carDummy.position.set(x,8.54,z);carDummy.rotation.set(0,0,0);
   const isBus=i%4===3;
   carDummy.scale.setScalar(isBus?0:1);carDummy.updateMatrix();
   bridgeCarBodies.setMatrixAt(i,carDummy.matrix);
   if(i%2===0){
    const taxiIndex=i/2;
    taxiPose.position.set(x,9.26,z);
    taxiPose.rotation.set(0,0,0);
    taxiPose.scale.set(1,1,1);
    taxiPose.updateMatrix();
    bridgeTaxiRoofSigns.setMatrixAt(taxiIndex,taxiPose.matrix);
    for(let flank=0;flank<2;flank++){
     taxiPose.position.set(x,8.79,z+(flank===0?-.483:.483));
     taxiPose.updateMatrix();
     bridgeTaxiDoorSigns.setMatrixAt(taxiIndex*2+flank,taxiPose.matrix);
    }
   }
   for(let side=0;side<2;side++){
    const sign=side===0?-1:1;
    carDummy.position.set(x,8.54,z+sign*.468);
    carDummy.updateMatrix();
    bridgeCarWindows.setMatrixAt(i*2+side,carDummy.matrix);
    for(let axle=0;axle<2;axle++){
     carDummy.position.set(x+(axle===0?-.44:.44),8.62,z+sign*.49);
     carDummy.updateMatrix();
     bridgeCarWheels.setMatrixAt(i*4+side*2+axle,carDummy.matrix);
    }
   }
   if(isBus){
    const busIndex=(i-3)/4;
    busPose.rotation.set(0,0,0);busPose.scale.set(1,1,1);
    busPose.position.set(x,8.54,z);busPose.updateMatrix();
    bridgeBuses.setMatrixAt(busIndex,busPose.matrix);
    for(let side=0;side<2;side++){
     const sign=side===0?-1:1;
     busPose.position.set(x,9.39,z+sign*.515);
     busPose.updateMatrix();
     bridgeBusWindows.setMatrixAt(busIndex*2+side,busPose.matrix);
     for(let axle=0;axle<2;axle++){
      busPose.position.set(x+(axle===0?-.91:.91),8.76,z+sign*.50);
      busPose.updateMatrix();
      bridgeBusTyres.setMatrixAt(busIndex*4+side*2+axle,busPose.matrix);
     }
    }
   }
   for(let side=0;side<2;side++){
    const index=i*2+side,offset=side===0?-.28:.28;
    bridgeLightDummy.position.set(frontX,isBus?8.82:8.63,z+offset);
    bridgeLightDummy.scale.set(1,.72,1);bridgeLightDummy.updateMatrix();
    bridgeHeadlights.setMatrixAt(index,bridgeLightDummy.matrix);
    bridgeLightDummy.position.set(rearX,isBus?8.82:8.63,z+offset);
    bridgeLightDummy.updateMatrix();
    bridgeTaillights.setMatrixAt(index,bridgeLightDummy.matrix);
   }
   // Deck top = 8.15 + .75/2 = 8.525m. 1cm offset avoids z-fighting.
   // Pools move with the cars and buses but never affect collisions.
   for(let lamp=0;lamp<2;lamp++){
    const front=lamp===0;
    bridgeGlowDummy.position.set(
     (front?frontX:rearX)+(front?direction*.22:-direction*.12),
     8.535,z
    );
    bridgeGlowDummy.scale.set(isBus?1.35:1,1,1);
    bridgeGlowDummy.updateMatrix();
    bridgeRoadGlows.setMatrixAt(i*2+lamp,bridgeGlowDummy.matrix);
   }
  }
  bridgeRoadGlows.instanceMatrix.needsUpdate=true;
  bridgeHeadlights.instanceMatrix.needsUpdate=true;
  bridgeTaillights.instanceMatrix.needsUpdate=true;
  bridgeCarBodies.instanceMatrix.needsUpdate=true;
  bridgeCarWindows.instanceMatrix.needsUpdate=true;
  bridgeCarWheels.instanceMatrix.needsUpdate=true;
  bridgeTaxiRoofSigns.instanceMatrix.needsUpdate=true;
  bridgeTaxiDoorSigns.instanceMatrix.needsUpdate=true;
  bridgeBuses.instanceMatrix.needsUpdate=true;
  bridgeBusWindows.instanceMatrix.needsUpdate=true;
  bridgeBusTyres.instanceMatrix.needsUpdate=true;
 }
 placeBridgeTraffic();
 group.add(bridgeCarBodies,bridgeCarWindows,bridgeCarWheels,bridgeHeadlights,bridgeTaillights,bridgeRoadGlows,bridgeTaxiRoofSigns,bridgeTaxiDoorSigns,bridgeBuses,bridgeBusWindows,bridgeBusTyres);

 // Roadside Bangkok expressway acoustic screens: weathered ribbed panels
 // and galvanized uprights. Opaque PBR prevents mobile alpha overdraw.
 // Screens stay outside lamp poles and the full drivable dodge corridor.
 const acousticCanvas=document.createElement('canvas');
 acousticCanvas.width=128;acousticCanvas.height=256;
 const ac=acousticCanvas.getContext('2d');
 const acousticBase=ac.createLinearGradient(0,0,128,0);
 acousticBase.addColorStop(0,'#738d8a');
 acousticBase.addColorStop(.5,'#b2c2b8');
 acousticBase.addColorStop(1,'#6c8785');
 ac.fillStyle=acousticBase;ac.fillRect(0,0,128,256);
 for(let x=0;x<128;x+=16){
  ac.fillStyle='rgba(24,46,47,.19)';ac.fillRect(x,0,3,256);
  ac.fillStyle='rgba(236,241,230,.22)';ac.fillRect(x+4,0,2,256);
 }
 for(let y=0;y<256;y+=63){
  ac.fillStyle='rgba(34,54,54,.31)';ac.fillRect(0,y,128,2);
  ac.fillStyle='rgba(220,227,213,.21)';ac.fillRect(0,y+3,128,1);
 }
 for(let i=0;i<90;i++){
  const x=(i*37+11)%128,y=(i*53+17)%256;
  ac.fillStyle=i%3===0?'rgba(31,49,47,.17)':'rgba(218,225,211,.15)';
  ac.fillRect(x,y,1+(i%3),9+(i%17));
 }
 const acousticTexture=new THREE.CanvasTexture(acousticCanvas);
 acousticTexture.colorSpace=THREE.SRGBColorSpace;
 // Baked PBR rib normals and patchy galvanized roughness match the existing
 // 16px panel corrugation. Two tiny 128x256 maps, no new draw calls or lights.
 const acousticNormalCanvas=document.createElement('canvas');
 const acousticRoughnessCanvas=document.createElement('canvas');
 acousticNormalCanvas.width=acousticRoughnessCanvas.width=128;
 acousticNormalCanvas.height=acousticRoughnessCanvas.height=256;
 const anc=acousticNormalCanvas.getContext('2d');
 const arc=acousticRoughnessCanvas.getContext('2d');
 const an=anc.createImageData(128,256),ar=arc.createImageData(128,256);
 for(let y=0;y<256;y++)for(let x=0;x<128;x++){
  const phase=(x%16)/16*Math.PI*2,seam=y%63<2;
  const sx=Math.cos(phase)*.34,sy=seam?.18:0;
  const inv=1/Math.hypot(sx,sy,1),i=(y*128+x)*4;
  an.data[i]=Math.round(128-127*sx*inv);
  an.data[i+1]=Math.round(128-127*sy*inv);
  an.data[i+2]=Math.round(128+127*inv);
  an.data[i+3]=255;
  const wear=205+((x*17+y*29)%19)-(Math.sin(phase)>.35?24:0)+(seam?25:0);
  ar.data[i]=ar.data[i+1]=ar.data[i+2]=Math.min(255,wear);
  ar.data[i+3]=255;
 }
 anc.putImageData(an,0,0);arc.putImageData(ar,0,0);
 const acousticNormalTexture=new THREE.CanvasTexture(acousticNormalCanvas);
 const acousticRoughnessTexture=new THREE.CanvasTexture(acousticRoughnessCanvas);
 const acousticMat=new THREE.MeshStandardMaterial({
  map:acousticTexture,normalMap:acousticNormalTexture,
  normalScale:new THREE.Vector2(.55,.55),roughnessMap:acousticRoughnessTexture,
  color:0xc4d0c9,metalness:.14,roughness:.88
 });
 const acousticCount=24,acousticZ=[];
 const acousticPanels=new THREE.InstancedMesh(
  new THREE.BoxGeometry(.12,2.6,5.72),acousticMat,acousticCount
 );
 const acousticPosts=new THREE.InstancedMesh(
  new THREE.BoxGeometry(.17,4.05,.19),steel,acousticCount
 );
 // Pressed W-profile steel rather than rectangular bars: two shallow corrugations
 // catch headlamp highlights while retaining one instanced draw call for 48 rails.
 // The cross-section stays within the previous .14m thickness and .19m height;
 // both rails remain at |x|=6.25, outside the playable dodge corridor.
 const railProfile=new THREE.Shape();
 const railPoints=[
  [-.07,-.095],[-.025,-.095],[.045,-.055],[.07,-.032],
  [.035,0],[.07,.032],[.045,.055],[-.025,.095],[-.07,.095],
  [-.07,.065],[.008,.035],[.025,.025],[-.005,0],
  [.025,-.025],[.008,-.035],[-.07,-.065]
 ];
 railProfile.moveTo(...railPoints[0]);
 for(let p=1;p<railPoints.length;p++)railProfile.lineTo(...railPoints[p]);
 railProfile.closePath();
 const railGeometry=new THREE.ExtrudeGeometry(railProfile,{
  depth:5.72,steps:1,bevelEnabled:false,curveSegments:1
 });
 railGeometry.translate(0,0,-2.86);
 const guardrails=new THREE.InstancedMesh(railGeometry,steel,acousticCount*2);
 guardrails.name='bangkok-expressway-galvanized-guardrails';
 guardrails.frustumCulled=false;
 const acousticDummy=new THREE.Object3D();
 for(let i=0;i<acousticCount;i++)acousticZ.push(-8-Math.floor(i/2)*5.9);
 function placeAcousticScreens(){
  for(let i=0;i<acousticCount;i++){
   const side=i%2===0?-1:1,z=acousticZ[i];
   acousticDummy.position.set(side*6.55,2.45,z);
   acousticDummy.updateMatrix();acousticPanels.setMatrixAt(i,acousticDummy.matrix);
   acousticDummy.position.set(side*6.55,2.025,z+2.86);
   acousticDummy.updateMatrix();acousticPosts.setMatrixAt(i,acousticDummy.matrix);
   for(let rail=0;rail<2;rail++){
    acousticDummy.position.set(side*6.25,.85+rail*.48,z);
    acousticDummy.updateMatrix();guardrails.setMatrixAt(i*2+rail,acousticDummy.matrix);
   }
  }
  acousticPanels.instanceMatrix.needsUpdate=true;
  acousticPosts.instanceMatrix.needsUpdate=true;
  guardrails.instanceMatrix.needsUpdate=true;
 }
 placeAcousticScreens();group.add(acousticPanels,acousticPosts,guardrails);
 // Amber reflector plates attached to both W-beam heights, outside dodge lanes.
 // One shared instanced mesh; no realtime lights or transparent overdraw.
 const railMarkerGeometry=new THREE.BoxGeometry(.04,.11,.16);
 const railMarkerMaterial=new THREE.MeshStandardMaterial({color:0xffb84d,metalness:.08,roughness:.34,emissive:0x8b3900,emissiveIntensity:.32});
 const railMarkers=new THREE.InstancedMesh(railMarkerGeometry,railMarkerMaterial,acousticCount*2);
 railMarkers.name='expressway-guardrail-amber-reflectors';
 railMarkers.frustumCulled=false;
 function placeRailMarkers(){
  for(let i=0;i<acousticCount;i++){
   const side=i%2===0?-1:1;
   for(let rail=0;rail<2;rail++){
    acousticDummy.position.set(side*6.20,.85+rail*.48,acousticZ[i]);
    acousticDummy.rotation.set(0,0,0);
    acousticDummy.updateMatrix();
    railMarkers.setMatrixAt(i*2+rail,acousticDummy.matrix);
   }
  }
  railMarkers.instanceMatrix.needsUpdate=true;
 }
 placeRailMarkers();group.add(railMarkers);
 // Galvanized hexagonal anchor heads on both W-beam tiers. The shared
 // instanced mesh follows the scrolling rails; no shadows or extra textures.
 const railBoltGeometry=new THREE.CylinderGeometry(.065,.065,.035,6);
 railBoltGeometry.rotateZ(Math.PI/2);
 const railBoltMaterial=new THREE.MeshStandardMaterial({color:0x89959b,metalness:.76,roughness:.48});
 const railBolts=new THREE.InstancedMesh(railBoltGeometry,railBoltMaterial,acousticCount*2);
 railBolts.name='expressway-wbeam-hex-anchor-bolts';
 railBolts.frustumCulled=false;
 function placeRailBolts(){
  for(let i=0;i<acousticCount;i++){
   const side=i%2===0?-1:1;
   for(let tier=0;tier<2;tier++){
    acousticDummy.position.set(side*6.165,.85+tier*.48,acousticZ[i]+.65);
    acousticDummy.rotation.set(0,0,0);
    acousticDummy.updateMatrix();
    railBolts.setMatrixAt(i*2+tier,acousticDummy.matrix);
   }
  }
  railBolts.instanceMatrix.needsUpdate=true;
 }
 placeRailBolts();group.add(railBolts);
 // Realistic retroreflective Thai-English lane sign. Baked once; no extra draw calls.
 // 1024x320 atlas matches the existing 6.8x2.13m overhead panel aspect ratio.
 const signCanvas=document.createElement('canvas');signCanvas.width=1024;signCanvas.height=320;
 const sc=signCanvas.getContext('2d');
 const sheeting=sc.createLinearGradient(0,0,1024,320);
 sheeting.addColorStop(0,'#155d46');sheeting.addColorStop(.5,'#0b4d39');sheeting.addColorStop(1,'#073c30');
 sc.fillStyle=sheeting;sc.fillRect(0,0,1024,320);
 // Fixed grain and rain streaks simulate weathered retroreflective film.
 sc.fillStyle='rgba(239,248,231,.055)';
 for(let i=0;i<220;i++)sc.fillRect(16+(i*137)%990,18+(i*71)%282,2,1);
 sc.fillStyle='rgba(9,32,26,.15)';
 for(let i=0;i<26;i++)sc.fillRect(24+(i*103)%970,29+(i*89)%260,1,16+(i%4)*9);
 sc.strokeStyle='#e6f0e4';sc.lineWidth=8;sc.strokeRect(13,13,998,294);
 sc.strokeStyle='rgba(237,247,233,.55)';sc.lineWidth=2;sc.strokeRect(25,25,974,270);
 sc.beginPath();sc.moveTo(512,29);sc.lineTo(512,293);sc.stroke();
 sc.textAlign='center';sc.textBaseline='middle';sc.fillStyle='#f7faf4';
 for(const [x,thai,english] of [[256,'บางนา','BANG NA'],[768,'ดินแดง','DIN DAENG']]){
  sc.font='bold 66px "Noto Sans Thai", Tahoma, sans-serif';
  sc.fillText(thai,x,91,435);
  sc.font='bold 45px Arial, sans-serif';
  sc.fillText(english,x,163,450);
  // Vector arrows do not depend on font glyph coverage in iPhone Safari.
  sc.strokeStyle='#f7faf4';sc.lineWidth=14;sc.lineCap='square';sc.lineJoin='miter';
  sc.beginPath();sc.moveTo(x,277);sc.lineTo(x,218);
  sc.moveTo(x-28,247);sc.lineTo(x,215);sc.lineTo(x+28,247);sc.stroke();
 }
 // Small baked metal rivets avoid separate geometry and overdraw.
 sc.fillStyle='#a6b9ad';
 for(const x of [39,497,527,985])for(const y of [40,280]){
  sc.beginPath();sc.arc(x,y,3.2,0,Math.PI*2);sc.fill();
 }
 const signTexture=new THREE.CanvasTexture(signCanvas);
 signTexture.colorSpace=THREE.SRGBColorSpace;signTexture.anisotropy=2;
 // Steel lattice sign gantry: the original short posts left the amber VMS
 // floating above the support beam. Extend the roadside uprights and brace
 // the two horizontal chords with 16 batched diagonals behind the signs.
 // Two additional draw calls, no shadows, and all members >=7m above the road
 // or beyond x=+/-4.7m, so the playable dodge corridor stays unobstructed.
 const gantry=new THREE.Group();
 gantry.name='bangkok-expressway-steel-truss-gantry';
 for(const side of [-1,1])gantry.add(box(.24,9.1,.24,steel,side*4.7,4.55,-.24));
 gantry.add(box(9.5,.18,.2,steel,0,7,-.24));
 gantry.add(box(9.5,.2,.2,steel,0,9,-.24));
 const trussBraceCount=16,trussSpan=9.2,trussStep=trussSpan/trussBraceCount;
 const trussBraces=new THREE.InstancedMesh(
  new THREE.CylinderGeometry(.045,.045,1,6),steel,trussBraceCount
 );
 const trussDummy=new THREE.Object3D();
 for(let i=0;i<trussBraceCount;i++){
  const x0=-trussSpan*.5+i*trussStep,x1=x0+trussStep;
  const y0=i%2===0?7.12:8.88,y1=i%2===0?8.88:7.12;
  const dx=x1-x0,dy=y1-y0;
  trussDummy.position.set((x0+x1)*.5,(y0+y1)*.5,-.30);
  trussDummy.rotation.set(0,0,-Math.atan2(dx,dy));
  trussDummy.scale.set(1,Math.hypot(dx,dy),1);
  trussDummy.updateMatrix();trussBraces.setMatrixAt(i,trussDummy.matrix);
 }
 trussBraces.instanceMatrix.needsUpdate=true;
 gantry.add(trussBraces);
 const sign=new THREE.Mesh(new THREE.PlaneGeometry(6.8,2.13),new THREE.MeshBasicMaterial({map:signTexture,side:THREE.DoubleSide}));
 sign.position.set(0,5.7,.12);gantry.add(sign);// Bangkok-style overhead variable-message sign: one 512x128 baked LED atlas,
// one additional draw call, no realtime lights. Mounted above the existing
// gantry, safely outside the vehicle clearance and dodge corridor.
const vmsCanvas=document.createElement('canvas');vmsCanvas.width=512;vmsCanvas.height=128;
const vc=vmsCanvas.getContext('2d');
vc.fillStyle='#10171a';vc.fillRect(0,0,512,128);
vc.fillStyle='#273138';vc.fillRect(0,0,512,7);vc.fillRect(0,121,512,7);
vc.fillStyle='#3d484e';vc.fillRect(5,5,502,2);vc.fillRect(5,121,502,2);
vc.fillStyle='#080d0e';vc.fillRect(10,11,492,106);
// Dark unlit LED cells give the panel depth without emissive point lights.
for(let y=17;y<113;y+=5)for(let x=16;x<499;x+=5){
 vc.fillStyle='rgba(106,68,26,.18)';vc.fillRect(x,y,2,2);
}
// Render Thai/English into a temporary canvas, then bake an amber LED matrix.
// No per-frame canvas updates, shadow blur or additional textures on the GPU.
const glyphCanvas=document.createElement('canvas');glyphCanvas.width=512;glyphCanvas.height=128;
const gc=glyphCanvas.getContext('2d');gc.fillStyle='#fff';gc.textAlign='center';gc.textBaseline='middle';
gc.font='bold 44px "Noto Sans Thai",Tahoma,sans-serif';
gc.fillText('ระวังรถชะลอตัว',256,46,468);
gc.font='bold 31px Arial,sans-serif';gc.fillText('SLOW TRAFFIC',256,91,460);
const glyphPixels=gc.getImageData(0,0,512,128).data;
for(let y=17;y<113;y+=5)for(let x=16;x<499;x+=5){
 if(glyphPixels[((y+1)*512+x+1)*4+3]<110)continue;
 vc.fillStyle='rgba(255,146,38,.22)';vc.fillRect(x-1,y-1,5,5);
 vc.fillStyle='#ffc05c';vc.fillRect(x,y,3,3);
}
const vmsTexture=new THREE.CanvasTexture(vmsCanvas);vmsTexture.colorSpace=THREE.SRGBColorSpace;
vmsTexture.anisotropy=2;
const vmsMaterial=new THREE.MeshBasicMaterial({map:vmsTexture,toneMapped:false,side:THREE.DoubleSide});
const vmsPanel=new THREE.Mesh(new THREE.PlaneGeometry(6.5,1.65),vmsMaterial);
vmsPanel.position.set(0,7.95,.16);vmsPanel.name='bangkok-expressway-amber-led-advisory';
gantry.add(vmsPanel);
gantry.position.z=-75;group.add(gantry);
 // Concrete Jersey shoulder barriers: 44 instances, two batched draw calls.
 const barrierCount=44,barrierLength=4.4;
 // One baked 128x256 PBR albedo for all 44 Jersey barriers. Deterministic
 // aggregate, casting seams, rain streaks and tyre scuffs replace flat grey
 // blocks without adding meshes, draw calls, external assets or runtime work.
 const barrierCanvas=document.createElement('canvas');
 barrierCanvas.width=128;barrierCanvas.height=256;
 const bc=barrierCanvas.getContext('2d');
 const barrierGrime=bc.createLinearGradient(0,0,0,256);
 barrierGrime.addColorStop(0,'#c5c7c2');
 barrierGrime.addColorStop(.48,'#afb4b1');
 barrierGrime.addColorStop(.76,'#969e9e');
 barrierGrime.addColorStop(1,'#6b7477');
 bc.fillStyle=barrierGrime;bc.fillRect(0,0,128,256);
 // Fixed pseudo-random pattern: no per-frame texture updates or flicker.
 for(let i=0;i<1900;i++){
  const px=(i*73+Math.floor(i/11)*19)%128;
  const py=(i*109+Math.floor(i/7)*43)%256;
  bc.fillStyle=i%4===0?'rgba(35,43,47,.17)':'rgba(235,233,220,.13)';
  bc.fillRect(px,py,1+i%3,1+(i%2));
 }
 // Weathered casting joints and shallow vertical water-runoff streaks.
 for(const y of [64,189]){
  bc.fillStyle='rgba(39,46,48,.24)';bc.fillRect(0,y,128,2);
  bc.fillStyle='rgba(241,238,223,.16)';bc.fillRect(0,y+3,128,1);
 }
 for(let i=0;i<26;i++){
  const px=(i*47+13)%128,py=(i*31+37)%170;
  bc.fillStyle='rgba(41,48,51,.12)';
  bc.fillRect(px,py,1+(i%2),26+(i%5)*8);
 }
 for(let i=0;i<14;i++){
  const px=(i*53+11)%126,py=180+(i*17)%65;
  bc.fillStyle='rgba(24,29,32,.15)';
  bc.fillRect(px,py,8+(i%3)*6,2+(i%2));
 }
 // Roadside impact scuffs: irregular rubber transfers at bumper height.
 // Baked into the existing concrete atlas, so no additional geometry or draw calls.
 // Restrict marks to the lower third; reflective warning plates remain unobscured.
 for(let i=0;i<9;i++){
  const x=8+(i*37)%107,y=176+(i*23)%55;
  bc.save();bc.translate(x,y);bc.rotate((i%5-2)*.12);
  const smear=bc.createLinearGradient(-15,0,22,0);
  smear.addColorStop(0,'rgba(20,25,28,0)');
  smear.addColorStop(.35,'rgba(22,27,30,.26)');
  smear.addColorStop(.75,'rgba(29,33,35,.14)');
  smear.addColorStop(1,'rgba(22,27,30,0)');
  bc.fillStyle=smear;
  bc.beginPath();bc.ellipse(0,0,17+(i%3)*5,2+(i%2),0,0,Math.PI*2);bc.fill();
  bc.restore();
 }
 const barrierTexture=new THREE.CanvasTexture(barrierCanvas);
 barrierTexture.colorSpace=THREE.SRGBColorSpace;
 barrierTexture.wrapS=barrierTexture.wrapT=THREE.RepeatWrapping;
 // ExtrudeGeometry side UVs use world units; repeat instead of smearing
 // the last texel over each 4.4m segment.
 barrierTexture.repeat.set(.26,.68);
 barrierTexture.anisotropy=2;
 const concrete=new THREE.MeshStandardMaterial({
  color:0xd5d5d2,map:barrierTexture,roughness:.94,metalness:0
 });
 // Weathered retroreflective hazard chevrons replace flat yellow blocks.
 // One shared 128px baked atlas for all 44 existing instanced shoulder markers:
 // no extra draw calls, lights, network fetches or per-frame texture updates.
 const reflectorCanvas=document.createElement('canvas');
 reflectorCanvas.width=reflectorCanvas.height=128;
 const rc=reflectorCanvas.getContext('2d');
 rc.fillStyle='#11191c';rc.fillRect(0,0,128,128);
 rc.fillStyle='#3b4445';rc.fillRect(5,5,118,118);
 rc.fillStyle='#d9d5c4';rc.fillRect(10,10,108,108);
 rc.save();rc.beginPath();rc.rect(10,10,108,108);rc.clip();
 for(let stripe=-128;stripe<256;stripe+=38){
  rc.fillStyle='#efac32';rc.beginPath();
  rc.moveTo(stripe,10);rc.lineTo(stripe+20,10);
  rc.lineTo(stripe+96,118);rc.lineTo(stripe+76,118);
  rc.closePath();rc.fill();
  rc.fillStyle='rgba(255,244,202,.26)';
  rc.fillRect(stripe+21,10,2,108);
 }
 rc.restore();
 // Riveted steel surround and rain/tyre grime stay in the same texture.
 rc.fillStyle='#222a2b';rc.fillRect(0,0,128,5);rc.fillRect(0,123,128,5);
 rc.fillRect(0,0,5,128);rc.fillRect(123,0,5,128);
 for(const x of [12,116])for(const y of [12,116]){
  rc.fillStyle='#343d3d';rc.beginPath();rc.arc(x,y,3,0,Math.PI*2);rc.fill();
  rc.fillStyle='#a9ada4';rc.fillRect(x-1,y-2,2,2);
 }
 for(let k=0;k<95;k++){
  const x=(k*53+17)%108+10,y=(k*71+29)%108+10;
  rc.fillStyle=k%3?'rgba(35,44,42,.10)':'rgba(250,248,228,.15)';
  rc.fillRect(x,y,1+(k%3),1+(k%5));
 }
 const reflectorTexture=new THREE.CanvasTexture(reflectorCanvas);
 reflectorTexture.colorSpace=THREE.SRGBColorSpace;
 const reflective=new THREE.MeshBasicMaterial({map:reflectorTexture,toneMapped:false});
 const profile=new THREE.Shape();
 profile.moveTo(-.42,0);profile.lineTo(.42,0);profile.lineTo(.42,.22);
 profile.lineTo(.24,1.04);profile.lineTo(-.24,1.04);profile.lineTo(-.42,.22);profile.closePath();
 const barrierGeometry=new THREE.ExtrudeGeometry(profile,{depth:barrierLength,bevelEnabled:false});
 const barriers=new THREE.InstancedMesh(barrierGeometry,concrete,barrierCount);
 // Upright flush plates face passing drivers on both inner barrier walls.
 const reflectorGeometry=new THREE.BoxGeometry(.055,.38,.64);
 const reflectors=new THREE.InstancedMesh(reflectorGeometry,reflective,barrierCount);
 const barrierDummy=new THREE.Object3D(),barrierZ=[];
 for(let i=0;i<barrierCount;i++)barrierZ.push(-5-Math.floor(i/2)*barrierLength*1.15);
 function placeBarriers(){
  for(let i=0;i<barrierCount;i++){
   const side=i%2===0?-1:1,z=barrierZ[i];
   barrierDummy.position.set(side*4.85,0,z);barrierDummy.rotation.set(0,0,0);barrierDummy.scale.set(1,1,1);
   barrierDummy.updateMatrix();barriers.setMatrixAt(i,barrierDummy.matrix);
   barrierDummy.position.set(side*4.55,.73,z+barrierLength*.5);
   barrierDummy.updateMatrix();reflectors.setMatrixAt(i,barrierDummy.matrix);
  }
  barriers.instanceMatrix.needsUpdate=true;reflectors.instanceMatrix.needsUpdate=true;
 }
 placeBarriers();group.add(barriers,reflectors);
 // Low-profile retroreflective shoulder studs: one instanced draw call for
 // nighttime road-edge depth cues. Studs stay below 6 cm high and outside
 // the ±3.35 m traffic-lane centres, so they cannot block a dodge lane.
 const studCount=72,studZ=[];
 const studMaterial=new THREE.MeshBasicMaterial({color:0xffe1a0,toneMapped:false});
 const studMesh=new THREE.InstancedMesh(new THREE.BoxGeometry(.13,.035,.25),studMaterial,studCount);
 const studDummy=new THREE.Object3D();
 for(let i=0;i<studCount;i++)studZ.push(-4-Math.floor(i/2)*5.35);
 function placeStuds(){
  for(let i=0;i<studCount;i++){
   const side=i%2===0?-1:1;
   studDummy.position.set(side*4.22,.035,studZ[i]);
   studDummy.updateMatrix();studMesh.setMatrixAt(i,studDummy.matrix);
  }
  studMesh.instanceMatrix.needsUpdate=true;
 }
 placeStuds();group.add(studMesh);
 // Expressway-only lane-direction arrows: weathered retroreflective paint on
 // the asphalt, not hovering signs or solid obstacles. Twelve arrows share
 // ONE instanced draw call and one 128px PBR atlas; no runtime allocations.
 // Every arrow stays inside its lane (±0.48m) and below 8cm above the road.
 const arrowPaintCanvas=document.createElement('canvas');
 arrowPaintCanvas.width=arrowPaintCanvas.height=128;
 const apc=arrowPaintCanvas.getContext('2d');
 const paintShade=apc.createLinearGradient(0,0,128,128);
 paintShade.addColorStop(0,'#f0eee4');paintShade.addColorStop(.55,'#deddd3');
 paintShade.addColorStop(1,'#c7c8bf');
 apc.fillStyle=paintShade;apc.fillRect(0,0,128,128);
 // Deterministic tyre-scuffed gaps reveal asphalt without alpha blending.
 apc.globalCompositeOperation='destination-out';
 for(let i=0;i<120;i++){
  const px=(i*47+Math.floor(i/11)*13+17)%128;
  const py=(i*71+Math.floor(i/7)*19+31)%128;
  apc.fillStyle=i%5===0?'rgba(0,0,0,.8)':'rgba(0,0,0,.43)';
  apc.fillRect(px,py,1+i%4,1+i%3);
 }
 apc.globalCompositeOperation='source-over';
 const arrowPaintTexture=new THREE.CanvasTexture(arrowPaintCanvas);
 arrowPaintTexture.colorSpace=THREE.SRGBColorSpace;
 arrowPaintTexture.anisotropy=2;
 const arrowPaintMaterial=new THREE.MeshStandardMaterial({
  map:arrowPaintTexture,roughness:.87,metalness:0,alphaTest:.4,
  polygonOffset:true,polygonOffsetFactor:-1,side:THREE.DoubleSide
 });
 const arrowOutline=new THREE.Shape();
 arrowOutline.moveTo(-.13,-1.05);arrowOutline.lineTo(.13,-1.05);
 arrowOutline.lineTo(.13,.12);arrowOutline.lineTo(.48,.12);
 arrowOutline.lineTo(0,1.05);arrowOutline.lineTo(-.48,.12);
 arrowOutline.lineTo(-.13,.12);arrowOutline.closePath();
 const arrowGeometry=new THREE.ShapeGeometry(arrowOutline);
 const arrowUV=arrowGeometry.getAttribute('uv');
 for(let i=0;i<arrowUV.count;i++){
  arrowUV.setXY(i,(arrowUV.getX(i)+.5),(.5+arrowUV.getY(i)/2.1));
 }
 arrowUV.needsUpdate=true;
 // Three.js ShapeGeometry faces +Z; rotate onto asphalt so +Y points forward (-Z).
 arrowGeometry.rotateX(-Math.PI/2);
 const arrowCount=12,arrowZ=[],arrowX=[-3.35,0,3.35];
 const laneArrows=new THREE.InstancedMesh(arrowGeometry,arrowPaintMaterial,arrowCount);
 laneArrows.name='bangkok-expressway-weathered-lane-arrows';
 laneArrows.frustumCulled=false;
 const arrowPose=new THREE.Object3D();
 const arrowTints=[0xf0eee6,0xd8d8d1,0xe3e2d9];
 for(let i=0;i<arrowCount;i++){
  arrowZ.push(-22-Math.floor(i/3)*42);
  laneArrows.setColorAt(i,new THREE.Color(arrowTints[i%3]));
 }
 function placeLaneArrows(){
  for(let i=0;i<arrowCount;i++){
   arrowPose.position.set(arrowX[i%3],.078,arrowZ[i]);
   arrowPose.updateMatrix();
   laneArrows.setMatrixAt(i,arrowPose.matrix);
  }
  laneArrows.instanceMatrix.needsUpdate=true;
 }
 placeLaneArrows();group.add(laneArrows);
 // Cast-iron storm drains along Bangkok's elevated expressway shoulders.
 // A shared 128px PBR atlas draws open slots, rust and worn raised ribs;
 // 32 grates use one instanced draw call and stay outside all dodge lanes.
 const drainCanvas=document.createElement('canvas');drainCanvas.width=drainCanvas.height=128;
 const dc=drainCanvas.getContext('2d');
 dc.fillStyle='#555c5c';dc.fillRect(0,0,128,128);
 for(let i=0;i<10;i++){
  const x=9+i*12;
  dc.fillStyle='#111b20';dc.fillRect(x,9,6,110);
  dc.fillStyle='#87908b';dc.fillRect(x-2,9,2,110);
  dc.fillStyle='#303d3d';dc.fillRect(x+6,9,2,110);
 }
 dc.fillStyle='#777a72';dc.fillRect(0,0,128,7);dc.fillRect(0,121,128,7);
 for(let i=0;i<85;i++){
  dc.fillStyle=i%3===0?'rgba(144,88,56,.35)':'rgba(23,28,28,.25)';
  dc.fillRect((i*47+13)%128,(i*73+19)%128,2+i%3,2);
 }
 const drainTexture=new THREE.CanvasTexture(drainCanvas);
 drainTexture.colorSpace=THREE.SRGBColorSpace;drainTexture.anisotropy=2;
 const drainMaterial=new THREE.MeshStandardMaterial({map:drainTexture,metalness:.68,roughness:.79,side:THREE.DoubleSide});
 const drainGeometry=new THREE.PlaneGeometry(.68,1.15);
 drainGeometry.rotateX(-Math.PI/2);
 const drainCount=32,drainZ=[];
 const drains=new THREE.InstancedMesh(drainGeometry,drainMaterial,drainCount);
 drains.name='expressway-shoulder-cast-iron-storm-drains';drains.frustumCulled=false;
 const drainPose=new THREE.Object3D();
 for(let i=0;i<drainCount;i++)drainZ.push(-12-Math.floor(i/2)*11);
 function placeDrains(){
  for(let i=0;i<drainCount;i++){
   drainPose.position.set(i%2===0?-5.12:5.12,.09,drainZ[i]);
   drainPose.updateMatrix();drains.setMatrixAt(i,drainPose.matrix);
  }
  drains.instanceMatrix.needsUpdate=true;
 }
 placeDrains();group.add(drains);
 group.visible=false;
 return {group,update(dt,speed){
  const advance=dt*Math.min(95,30+speed*.12);
  for(const lamp of lampPositions){lamp.z+=advance;if(lamp.z>18)lamp.z-=168;}placeLamps();
  for(let i=0;i<flyoverZ.length;i++){flyoverZ[i]+=advance;if(flyoverZ[i]>26)flyoverZ[i]-=180;}placeFlyovers();
   for(let i=0;i<bridgeCarCount;i++)bridgeCarProgress[i]=(bridgeCarProgress[i]+Math.min(dt,.05)*(.16+(i%4)*.035))%1;
   placeBridgeTraffic();
  for(let i=0;i<acousticCount;i++){acousticZ[i]+=advance;if(acousticZ[i]>24)acousticZ[i]-=12*5.9;}placeAcousticScreens();placeRailMarkers();placeRailBolts();
  for(let i=0;i<studCount;i++){studZ[i]+=advance;if(studZ[i]>18)studZ[i]-=36*5.35;}placeStuds();
  for(let i=0;i<arrowCount;i++){arrowZ[i]+=advance;if(arrowZ[i]>22)arrowZ[i]-=168;}placeLaneArrows();
  for(let i=0;i<drainCount;i++){drainZ[i]+=advance;if(drainZ[i]>20)drainZ[i]-=16*11;}placeDrains();
  gantry.position.z+=advance;if(gantry.position.z>24)gantry.position.z-=195;
  for(let i=0;i<barrierCount;i++){barrierZ[i]+=advance;if(barrierZ[i]>20)barrierZ[i]-=22*barrierLength*1.15;}placeBarriers();
 },dispose(){
  group.traverse(obj=>{if(obj.geometry)obj.geometry.dispose();});
  for(const material of [towerMat,mastMaterial,beaconMaterial,steel,warm,poolMaterial,sign.material,concrete,reflective,flyoverConcrete,acousticMat])material.dispose();
  bridgeAsphaltMaterial.dispose();bridgeAsphaltTexture.dispose();bridgeRoughTexture.dispose();
  studMaterial.dispose();studMesh.geometry.dispose();railMarkerMaterial.dispose();railBoltMaterial.dispose();
  arrowPaintMaterial.dispose();arrowPaintTexture.dispose();
  drainMaterial.dispose();drainTexture.dispose();
   bridgeHeadMaterial.dispose();bridgeTailMaterial.dispose();bridgeGlowMaterial.dispose();bridgeGlowTexture.dispose();
   carPaint.dispose();carGlass.dispose();tyreMaterial.dispose();
   taxiLiveryMaterial.dispose();taxiTexture.dispose();
   busShellMaterial.dispose();busWindowMaterial.dispose();busWindowTexture.dispose();busTyreMaterial.dispose();
  skylineMarkerMaterial.dispose();plantMaterial.dispose();
  windowTexture.dispose();emissiveTexture.dispose();facadeNormalTexture.dispose();poolTexture.dispose();signTexture.dispose();flyoverTexture.dispose();flyoverNormalTexture.dispose();acousticTexture.dispose();acousticNormalTexture.dispose();acousticRoughnessTexture.dispose();barrierTexture.dispose();reflectorTexture.dispose();vmsTexture.dispose();vmsMaterial.dispose();
  billboardMaterial.dispose();neonMap.dispose();neonGlowMap.dispose();
 }};
}
