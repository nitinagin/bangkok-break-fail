
import * as THREE from "three";
import {GLTFLoader} from "three/addons/loaders/GLTFLoader.js";
import {clone as cloneSkinnedScene} from "three/addons/utils/SkeletonUtils.js";
import {createExpresswayArt} from "./expressway-art.js";
import {makeExpresswayVehicle} from "./expressway-vehicle-models.js";
const $=id=>document.getElementById(id),hud=$('score'),status=$('status'),hint=$('hint'),challenge=$('challenge'),districtLabel=$('district'),overlay=$('overlay'),panel=$('panel');
let renderer;try{renderer=new THREE.WebGLRenderer({antialias:false,powerPreference:'high-performance'});}catch(e){$('error').style.display='block';throw e}
const mobile=/iPhone|iPad|iPod|Android/i.test(navigator.userAgent);let mobilePixelRatio=Math.min(devicePixelRatio||1,mobile?1.05:1.25);renderer.setPixelRatio(mobilePixelRatio);renderer.setSize(innerWidth,innerHeight);renderer.setClearColor(0x20104e);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;document.body.insertBefore(renderer.domElement,document.body.firstChild);
const scene=new THREE.Scene();scene.background=new THREE.Color(0x20104e);scene.fog=new THREE.Fog(0x20104e,48,145);const districtSkies=[new THREE.Color(0x56cfff),new THREE.Color(0x131d30),new THREE.Color(0x8797a3)];const darkRoadSky=new THREE.Color(0x010308);
// District-specific nocturnal atmosphere: urban light pollution remains visible
// above Yaowarat, JJ and the expressway; Rama II and Dark Road stay unlit.
// Colors are reused; no new textures, lights, meshes or draw calls.
const districtNightSkies=[
 new THREE.Color(0x131d30),new THREE.Color(0x101b2b),
 new THREE.Color(0x03060c),new THREE.Color(0x1a2230),
 new THREE.Color(0x0b1a2d),new THREE.Color(0x1b112b),darkRoadSky
];
const districtFogRanges=[[7,52],[10,78],[7,52],[12,86],[16,138],[12,90],[7,52]];
let districtIndex=-1;
const camera=new THREE.PerspectiveCamera(76,innerWidth/innerHeight,.1,180);camera.position.set(0,2.15,3.15);
// Keep a single hemisphere + directional light and grade them per district.
// Night scenes previously inherited full midday sun, washing out neon and PBR depth.
const skyFill=new THREE.HemisphereLight(0xffffff,0x656c70,1.65);scene.add(skyFill);
const sun=new THREE.DirectionalLight(0xfff5e6,1.25);sun.position.set(-12,20,8);scene.add(sun);
// One shadow-free headlamp, switched off outside Dark Road for mobile performance.
const darkHeadlight=new THREE.SpotLight(0xffedce,36,58,Math.PI/7,.6,1.3);
darkHeadlight.position.set(0,1.6,3.1);darkHeadlight.target.position.set(0,.35,-25);
darkHeadlight.castShadow=false;darkHeadlight.visible=false;scene.add(darkHeadlight,darkHeadlight.target);
// Headlight-visible airborne dust: one shared 32px soft sprite and one instanced
// draw call, with deterministic motes (no particles, allocations or random() in
// the animation loop). Hidden in every district except the 23,000+ Dark Road.
const darkDustCanvas=document.createElement('canvas');
darkDustCanvas.width=darkDustCanvas.height=32;
const darkDustCtx=darkDustCanvas.getContext('2d');
const darkDustGlow=darkDustCtx.createRadialGradient(16,16,0,16,16,16);
darkDustGlow.addColorStop(0,'rgba(255,246,217,.72)');
darkDustGlow.addColorStop(.32,'rgba(255,237,196,.24)');
darkDustGlow.addColorStop(1,'rgba(255,227,181,0)');
darkDustCtx.fillStyle=darkDustGlow;darkDustCtx.fillRect(0,0,32,32);
const darkDustTexture=new THREE.CanvasTexture(darkDustCanvas);
darkDustTexture.colorSpace=THREE.SRGBColorSpace;
const darkDustCount=mobile?36:60;
const darkDust=new THREE.InstancedMesh(
 new THREE.PlaneGeometry(1,1),
 new THREE.MeshBasicMaterial({map:darkDustTexture,transparent:true,opacity:.30,
  depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending}),
 darkDustCount
);
darkDust.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
darkDust.frustumCulled=false;darkDust.visible=false;scene.add(darkDust);
const darkDustPose=new THREE.Object3D();
const darkDustMotes=Array.from({length:darkDustCount},(_,i)=>({
 x:((i*37+11)%101)/101*7.2-3.6,
 y:.35+((i*59+23)%97)/97*2.15,
 z:-2-((i*71+7)%103)/103*32,
 size:.10+((i*17+3)%31)/31*.24
}));
function updateDarkDust(advance,driverX){
 for(let i=0;i<darkDustCount;i++){
  const p=darkDustMotes[i];
  p.z+=advance*.82;
  if(p.z>1.4)p.z-=34;
  // Keep the motes in the moving headlight beam, not across the whole map.
  const beam=Math.max(.16,1-Math.abs(p.x)/4.2);
  darkDustPose.position.set(driverX+p.x,p.y,p.z);
  darkDustPose.scale.setScalar(p.size*beam);
  darkDustPose.updateMatrix();
  darkDust.setMatrixAt(i,darkDustPose.matrix);
 }
 darkDust.instanceMatrix.needsUpdate=true;
}

// [hemisphere intensity, sun intensity, sky fill, ground bounce, key light]
// Reusing these two lights adds zero lights/draw calls/textures and avoids per-frame work.
const districtLightPresets=[
 [.10,.045,0x657386,0x080a0d,0x8c98a4], // fallback
 [.23,.085,0x7387a0,0x1a1118,0xe7b2a0], // Yaowarat: neon and shopfront bounce
 [.075,.035,0x536173,0x080a0d,0x8c98a4], // Rama II: blackout construction
 [.25,.105,0x8b9eaf,0x1b1918,0xe8c9a7], // JJ Market: warm stalls
 [.20,.085,0x7488a0,0x15171d,0xffc68b], // expressway: sodium-vapor spill
 [.22,.080,0x88769e,0x1b1022,0xffb3d6], // Pattaya: colored nightlife bounce
 [.075,.035,0x536173,0x080a0d,0x8c98a4] // Dark Road: headlight only
];
const mat=(c)=>new THREE.MeshLambertMaterial({color:c,flatShading:true});const M={road:mat(0x484b52),stripe:new THREE.MeshStandardMaterial({color:0xe2c579,roughness:.92,metalness:0}),grass:mat(0x34333b),blue:mat(0x18c5d2),gold:mat(0xffd64b),pink:mat(0xf56d85),black:mat(0x252333),glass:mat(0x4d91b9),wheel:mat(0x22212b),durian:mat(0x70b525),spike:mat(0xffe157),skin:mat(0xffcb95),white:mat(0xffffff),red:mat(0xe65a4e),green:mat(0x42ad76),purple:mat(0x8869b6)};
function cube(w,h,d,m,x=0,y=0,z=0){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);return o}
function ball(r,m,x=0,y=0,z=0){const o=new THREE.Mesh(new THREE.SphereGeometry(r,9,7),m);o.position.set(x,y,z);return o}
function wheel(x,z){const o=new THREE.Mesh(new THREE.CylinderGeometry(.38,.38,.22,12),M.wheel);o.rotation.z=Math.PI/2;o.position.set(x,.38,z);return o}
// A single reusable procedural asphalt texture gives the long road fine grain without extra draw calls.
const asphaltCanvas=document.createElement('canvas');asphaltCanvas.width=256;asphaltCanvas.height=256;const asphaltCtx=asphaltCanvas.getContext('2d');asphaltCtx.fillStyle='#b5b5b5';asphaltCtx.fillRect(0,0,256,256);for(let i=0;i<1900;i++){const px=Math.random()*256,py=Math.random()*256;asphaltCtx.fillStyle=i%3===0?'rgba(40,40,40,.23)':'rgba(255,255,255,.18)';asphaltCtx.fillRect(px,py,1+(i%3),1+(i%2));}
// Shared 256px puddle albedo and PBR roughness mask for rain-slick Yaowarat.
// Matte aggregate and glossy standing water use the same UVs and no extra draw calls.
const wetRoadRoughnessCanvas=document.createElement('canvas');
wetRoadRoughnessCanvas.width=wetRoadRoughnessCanvas.height=256;
const wetRoadRoughnessCtx=wetRoadRoughnessCanvas.getContext('2d');
wetRoadRoughnessCtx.fillStyle='#d5d5d5';
wetRoadRoughnessCtx.fillRect(0,0,256,256);
for(let i=0;i<6;i++){
 const px=37+(i*67)%181,py=39+(i*43)%175;
 const radiusX=12+(i*7)%13,radiusY=24+(i*11)%19;
 // Both baked gradients use identical footprints, so darker asphalt is glossier.
 for(const [ctx,inner,outer] of [
  [asphaltCtx,'rgba(13,21,29,.22)','rgba(13,21,29,0)'],
  [wetRoadRoughnessCtx,'#575757','#d5d5d5']
 ]){
  ctx.save();ctx.translate(px,py);ctx.scale(radiusX,radiusY);
  const pool=ctx.createRadialGradient(0,0,.05,0,0,1);
  pool.addColorStop(0,inner);pool.addColorStop(.58,inner);
  pool.addColorStop(1,outer);
  ctx.fillStyle=pool;ctx.fillRect(-1,-1,2,2);ctx.restore();
 }
}
// Baked asphalt repair seams: irregular joins in the existing road PBR atlases.
// No new geometry, textures, lights or work inside the render loop.
for(let patch=0;patch<5;patch++){
 const x=22+(patch*53)%204,y=28+(patch*41)%194;
 const width=22+(patch*7)%21,height=13+(patch*11)%18;
 asphaltCtx.fillStyle='rgba(27,32,37,.18)';
 asphaltCtx.fillRect(x,y,width,height);
 wetRoadRoughnessCtx.fillStyle='rgba(232,232,232,.30)';
 wetRoadRoughnessCtx.fillRect(x,y,width,height);
 asphaltCtx.strokeStyle='rgba(10,13,17,.34)';
 asphaltCtx.lineWidth=1;asphaltCtx.beginPath();
 asphaltCtx.moveTo(x,y+2);asphaltCtx.lineTo(x+width*.35,y);
 asphaltCtx.lineTo(x+width,y+3);asphaltCtx.lineTo(x+width-2,y+height);
 asphaltCtx.lineTo(x+width*.55,y+height-1);asphaltCtx.lineTo(x,y+height-3);
 asphaltCtx.closePath();asphaltCtx.stroke();
}
// Rain-polished twin wheel tracks: subtle longitudinal darkened rubber wear
// and fragmented glossy water in the existing Yaowarat PBR atlases.
// Baked once; no geometry, extra draw calls or frame-time updates.
for(let track=0;track<2;track++){
 const center=track===0?76:180;
 for(let y=0;y<256;y+=3){
  const sway=Math.sin(y*.036+track*.8)*2.2;
  const gap=((y+track*29)%47)<7;
  if(gap)continue;
  const x=center+sway;
  asphaltCtx.fillStyle='rgba(13,20,25,.13)';
  asphaltCtx.fillRect(x-7,y,14,2);
  asphaltCtx.fillStyle='rgba(14,19,23,.12)';
  asphaltCtx.fillRect(x-3,y,6,3);
  wetRoadRoughnessCtx.fillStyle='rgba(36,36,36,.11)';
  wetRoadRoughnessCtx.fillRect(x-5,y,10,3);
 }
}
// Weathered Thai shophouse neon reflections: narrow, vertically broken light
// streaks baked into the existing asphalt albedo, not extra lights or meshes.
// The staggered bands are aligned with the roadway UV direction and avoid
// bright, continuous toy-like stripes on rain-slick Yaowarat pavement.
for(let sign=0;sign<12;sign++){
 const center=18+(sign*47)%220;
 const start=11+(sign*31)%193;
 const tint=['rgba(255,54,68,.29)','rgba(255,187,69,.25)',
  'rgba(43,209,215,.24)','rgba(240,76,174,.26)'][sign%4];
 asphaltCtx.fillStyle=tint;
 for(let segment=0;segment<7;segment++){
  const y=(start+segment*8+(sign*3)%5)%256;
  const width=2+(segment+sign)%6;
  asphaltCtx.fillRect(center-width/2+(segment%3-1)*2,y,width,2+segment%2);
 }
}
// Baked broken neon storefront reflections in the existing wet-road atlas.
// Generated once at startup; no new textures, lights or draw calls.
for(let i=0;i<24;i++){
 const x=(i*83+19)%256,y=(i*47+31)%256;
 asphaltCtx.fillStyle=['rgba(245,65,115,.24)','rgba(45,192,235,.20)','rgba(255,182,76,.19)'][i%3];
 for(let j=0;j<4;j++){
  const width=2+((i+j*3)%9),offset=(j*17+i*5)%23;
  asphaltCtx.fillRect(x-width/2+offset*.12,y+j*7,width,1+(j%2));
 }
}
wetRoadRoughnessCtx.fillStyle='rgba(242,242,242,.32)';
for(let i=0;i<180;i++){
 const px=(i*73+17)%256,py=(i*47+29)%256;
 wetRoadRoughnessCtx.fillRect(px,py,1+(i%3),1+(i%2));
}
const wetRoadRoughnessTexture=new THREE.CanvasTexture(wetRoadRoughnessCanvas);
wetRoadRoughnessTexture.wrapS=wetRoadRoughnessTexture.wrapT=THREE.RepeatWrapping;
wetRoadRoughnessTexture.repeat.set(2,26);

 // Yaowarat rain-slick road: tileable 256px tangent-space PBR normals.
 // Puddles use the EXACT footprints of the albedo/roughness masks above.
 // Water is nearly flat; exposed aggregate catches the passing neon.
 // Baked once at startup, with no additional meshes, lights or animation work.
 const wetRoadNormalCanvas=document.createElement('canvas');
 wetRoadNormalCanvas.width=wetRoadNormalCanvas.height=256;
 const wetRoadNormalCtx=wetRoadNormalCanvas.getContext('2d');
 const wetRoadHeight=new Float32Array(256*256);
 const wetRoadTau=Math.PI*2;
 for(let py=0;py<256;py++)for(let px=0;px<256;px++){
  let puddle=0;
  for(let i=0;i<6;i++){
   const cx=37+(i*67)%181,cy=39+(i*43)%175;
   const rx=12+(i*7)%13,ry=24+(i*11)%19;
   const dx=(px-cx)/rx,dy=(py-cy)/ry;
   puddle=Math.max(puddle,Math.max(0,1-dx*dx-dy*dy));
  }
  // Integer spatial frequencies tile without seams at UV boundaries.
  const aggregate=.18*Math.sin(wetRoadTau*19*px/256)*Math.cos(wetRoadTau*23*py/256)
   +.065*Math.sin(wetRoadTau*(41*px+13*py)/256);
  wetRoadHeight[py*256+px]=aggregate*(1-puddle*.94)-puddle*.18;
 }
 const wetRoadNormalPixels=wetRoadNormalCtx.createImageData(256,256);
 for(let py=0;py<256;py++)for(let px=0;px<256;px++){
  const left=wetRoadHeight[py*256+((px+255)&255)];
  const right=wetRoadHeight[py*256+((px+1)&255)];
  const up=wetRoadHeight[((py+255)&255)*256+px];
  const down=wetRoadHeight[((py+1)&255)*256+px];
  const sx=(right-left)*1.15,sy=(down-up)*1.15;
  const inverseLength=1/Math.hypot(sx,sy,1),at=(py*256+px)*4;
  wetRoadNormalPixels.data[at]=Math.round(128-127*sx*inverseLength);
  wetRoadNormalPixels.data[at+1]=Math.round(128-127*sy*inverseLength);
  wetRoadNormalPixels.data[at+2]=Math.round(128+127*inverseLength);
  wetRoadNormalPixels.data[at+3]=255;
 }
 wetRoadNormalCtx.putImageData(wetRoadNormalPixels,0,0);
 const wetRoadNormalTexture=new THREE.CanvasTexture(wetRoadNormalCanvas);
 wetRoadNormalTexture.wrapS=wetRoadNormalTexture.wrapT=THREE.RepeatWrapping;
 wetRoadNormalTexture.repeat.set(2,26);
 wetRoadNormalTexture.anisotropy=Math.min(2,renderer.capabilities.getMaxAnisotropy());

const asphaltTexture=new THREE.CanvasTexture(asphaltCanvas);asphaltTexture.colorSpace=THREE.SRGBColorSpace;asphaltTexture.wrapS=asphaltTexture.wrapT=THREE.RepeatWrapping;asphaltTexture.repeat.set(2,26);M.road.map=asphaltTexture;M.road.needsUpdate=true;
// V6.7: inexpensive wet-road neon reflections for Yaowarat night.
// One shared gradient texture and two materials; no dynamic lights or downloads.
const neonReflectionCanvas=document.createElement('canvas');
neonReflectionCanvas.width=128;neonReflectionCanvas.height=256;
const neonReflectionCtx=neonReflectionCanvas.getContext('2d');
// Elongated, broken reflections read as rain-slick asphalt rather than circular neon blobs.
// Baked once into the existing shared texture: no extra meshes, lights or per-frame drawing.
const reflectionHaze=neonReflectionCtx.createLinearGradient(0,0,128,0);
reflectionHaze.addColorStop(0,'rgba(255,255,255,0)');
reflectionHaze.addColorStop(.26,'rgba(255,255,255,.055)');
reflectionHaze.addColorStop(.48,'rgba(255,255,255,.24)');
reflectionHaze.addColorStop(.56,'rgba(255,255,255,.19)');
reflectionHaze.addColorStop(.79,'rgba(255,255,255,.04)');
reflectionHaze.addColorStop(1,'rgba(255,255,255,0)');
neonReflectionCtx.fillStyle=reflectionHaze;neonReflectionCtx.fillRect(0,0,128,256);
// Uneven streak fragments simulate neon reflected by shallow puddles and worn asphalt.
for(let k=0;k<44;k++){
 const px=45+((k*37)%39),py=13+((k*59)%225);
 const width=1+(k%4),length=7+(k*7)%27;
 neonReflectionCtx.fillStyle=k%5===0?'rgba(255,255,255,.43)':'rgba(255,255,255,.16)';
 neonReflectionCtx.fillRect(px,py,width,length);
}
// Fade both ends so the shared plane never has a visible rectangular boundary.
const reflectionFade=neonReflectionCtx.createLinearGradient(0,0,0,256);
reflectionFade.addColorStop(0,'rgba(255,255,255,0)');
reflectionFade.addColorStop(.18,'rgba(255,255,255,.4)');
reflectionFade.addColorStop(.43,'rgba(255,255,255,.95)');
reflectionFade.addColorStop(.67,'rgba(255,255,255,.6)');
reflectionFade.addColorStop(1,'rgba(255,255,255,0)');
neonReflectionCtx.globalCompositeOperation='destination-in';
neonReflectionCtx.fillStyle=reflectionFade;neonReflectionCtx.fillRect(0,0,128,256);
neonReflectionCtx.globalCompositeOperation='source-over';
const neonReflectionTexture=new THREE.CanvasTexture(neonReflectionCanvas);
// One instanced transparent overlay replaces ten separate draw calls.
// Each instance inherits the exact four-color palette of its associated neon sign.
const neonReflectionPalette=[0xff4b36,0xffbb4b,0x25d8c8,0xff4c9c];
const neonReflectionMaterial=new THREE.MeshBasicMaterial({
 map:neonReflectionTexture,color:0xffffff,transparent:true,opacity:.42,
 depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide
});
const neonReflectionGeometry=new THREE.PlaneGeometry(3.1,7.8);
const neonReflectionCount=10;
const neonReflections=new THREE.InstancedMesh(neonReflectionGeometry,neonReflectionMaterial,neonReflectionCount);
neonReflections.frustumCulled=false;
const neonReflectionDummy=new THREE.Object3D();
const neonReflectionAnchors=new Array(neonReflectionCount).fill(null);
scene.add(neonReflections);
const ground=cube(180,.1,230,M.grass,0,-.12,-60);scene.add(ground);// Milestone 1: physically based wet Yaowarat asphalt; dry concrete-tone Rama II.
// Reuse the existing asphalt texture and neon overlays to avoid new draw calls.
const wetAsphalt=new THREE.MeshStandardMaterial({color:0x777f8d,map:asphaltTexture,roughnessMap:wetRoadRoughnessTexture,normalMap:wetRoadNormalTexture,normalScale:new THREE.Vector2(.38,.38),roughness:.52,metalness:.12});
const dryAsphalt=new THREE.MeshStandardMaterial({color:0x777f8d,map:asphaltTexture,roughness:.94,metalness:0});
// Rama II construction-zone asphalt: 256px baked PBR albedo, shared by the road.
// Truck-worn tracks, dusty edges, tar seals and repairs add depth with no new draw calls.
const ramaRoadCanvas=document.createElement('canvas');
ramaRoadCanvas.width=ramaRoadCanvas.height=256;
const ramaRoadCtx=ramaRoadCanvas.getContext('2d');
ramaRoadCtx.fillStyle='#898b87';ramaRoadCtx.fillRect(0,0,256,256);
// Deterministic aggregate avoids changing noise patterns between reloads.
for(let i=0;i<1800;i++){
 const px=(i*73+i*i*17+11)%256,py=(i*131+i*i*23+37)%256;
 ramaRoadCtx.fillStyle=i%5===0?'rgba(223,212,186,.24)':i%3===0?'rgba(37,41,40,.18)':'rgba(117,104,84,.17)';
 ramaRoadCtx.fillRect(px,py,1+i%3,1+i%2);
}
// Dust from construction traffic collects along the two road shoulders.
for(const [start,end] of [[0,43],[211,256]]){
 const dust=ramaRoadCtx.createLinearGradient(start,0,end,0);
 if(start===0){dust.addColorStop(0,'rgba(178,151,112,.48)');dust.addColorStop(1,'rgba(178,151,112,0)');}
 else{dust.addColorStop(0,'rgba(178,151,112,0)');dust.addColorStop(1,'rgba(178,151,112,.48)');}
 ramaRoadCtx.fillStyle=dust;ramaRoadCtx.fillRect(start,0,end-start,256);
}
// Feathered tire-polished paths, not hard painted stripes.
for(const x of [63,82,173,192]){
 const rut=ramaRoadCtx.createLinearGradient(x-10,0,x+10,0);
 rut.addColorStop(0,'rgba(27,30,31,0)');
 rut.addColorStop(.5,'rgba(25,29,30,.23)');
 rut.addColorStop(1,'rgba(27,30,31,0)');
 ramaRoadCtx.fillStyle=rut;ramaRoadCtx.fillRect(x-10,0,20,256);
}
// Patchwork resurfacing and thin transverse tar joints.
for(let i=0;i<5;i++){
 const px=42+(i*53)%151,py=17+(i*41)%188,w=15+(i*11)%27,h=16+(i*17)%31;
 ramaRoadCtx.fillStyle='rgba(42,45,43,.31)';ramaRoadCtx.fillRect(px,py,w,h);
 ramaRoadCtx.strokeStyle='rgba(23,26,26,.45)';
 ramaRoadCtx.lineWidth=1.2;ramaRoadCtx.strokeRect(px+.5,py+.5,w-1,h-1);
}
ramaRoadCtx.strokeStyle='rgba(30,32,32,.36)';ramaRoadCtx.lineWidth=1.6;
for(const y of [54,169]){
 ramaRoadCtx.beginPath();ramaRoadCtx.moveTo(0,y);
 ramaRoadCtx.lineTo(77,y+2);ramaRoadCtx.lineTo(142,y-2);
 ramaRoadCtx.lineTo(211,y+3);ramaRoadCtx.lineTo(256,y+1);ramaRoadCtx.stroke();
}
// Sparse muddy scuffs near worksite entrances, never blocking dodge lanes.
ramaRoadCtx.strokeStyle='rgba(111,81,53,.24)';ramaRoadCtx.lineWidth=3;
for(let i=0;i<8;i++){
 const x=i%2===0?27:224,y=15+i*29;
 ramaRoadCtx.beginPath();ramaRoadCtx.moveTo(x,y);
 ramaRoadCtx.lineTo(x+(i%2===0?12:-12),y+7);ramaRoadCtx.stroke();
}
const ramaRoadTexture=new THREE.CanvasTexture(ramaRoadCanvas);
ramaRoadTexture.colorSpace=THREE.SRGBColorSpace;
ramaRoadTexture.wrapS=ramaRoadTexture.wrapT=THREE.RepeatWrapping;
ramaRoadTexture.repeat.set(1,18);
const ramaRoadAsphalt=new THREE.MeshStandardMaterial({
 color:0xd5d3ce,map:ramaRoadTexture,roughness:.82,metalness:.025
});
// Expressway-only PBR atlas: patched asphalt, tire-polished lanes and tar joints.
// Bake two 256px textures once; no additional geometry, lights or draw calls.
const expresswayRoadCanvas=document.createElement('canvas');
expresswayRoadCanvas.width=expresswayRoadCanvas.height=256;
const er=expresswayRoadCanvas.getContext('2d');
er.fillStyle='#777b7e';er.fillRect(0,0,256,256);
// Deterministic fine aggregate avoids temporal shimmer on mobile GPUs.
for(let i=0;i<1350;i++){
 const px=(i*73+31*i*i+17)%256,py=(i*137+19*i*i+43)%256;
 er.fillStyle=i%4===0?'rgba(20,26,29,.22)':i%3===0?'rgba(212,214,207,.20)':'rgba(40,44,47,.12)';
 er.fillRect(px,py,1+i%2,1+i%2);
}
for(const x of [31,58,110,139,191,218]){
 const wear=er.createLinearGradient(x-12,0,x+12,0);
 wear.addColorStop(0,'rgba(23,28,32,0)');
 wear.addColorStop(.5,'rgba(20,26,29,.22)');
 wear.addColorStop(1,'rgba(23,28,32,0)');
 er.fillStyle=wear;er.fillRect(x-12,0,24,256);
}
// Irregular repair patches and sealed joints, never a repeating checkerboard.
for(let i=0;i<5;i++){
 const px=12+(i*59)%195,py=17+(i*47)%192,w=25+(i*7)%25,h=28+(i*11)%31;
 er.fillStyle='rgba(36,41,45,.26)';er.fillRect(px,py,w,h);
 er.strokeStyle='rgba(21,25,28,.48)';er.lineWidth=1.2;er.strokeRect(px+.5,py+.5,w-1,h-1);
}
er.strokeStyle='rgba(25,28,30,.36)';er.lineWidth=1.3;
for(let i=0;i<3;i++){
 const y=51+i*84;er.beginPath();er.moveTo(0,y);
 er.lineTo(66,y+2);er.lineTo(125,y-1);er.lineTo(194,y+3);er.lineTo(256,y+1);er.stroke();
}
const expresswayRoughCanvas=document.createElement('canvas');
expresswayRoughCanvas.width=expresswayRoughCanvas.height=256;
const err=expresswayRoughCanvas.getContext('2d');
err.fillStyle='#e2e2e2';err.fillRect(0,0,256,256);
for(const x of [31,58,110,139,191,218]){
 const polished=err.createLinearGradient(x-13,0,x+13,0);
 polished.addColorStop(0,'#e2e2e2');polished.addColorStop(.5,'#999999');polished.addColorStop(1,'#e2e2e2');
 err.fillStyle=polished;err.fillRect(x-13,0,26,256);
}
for(let i=0;i<5;i++){
 const px=12+(i*59)%195,py=17+(i*47)%192,w=25+(i*7)%25,h=28+(i*11)%31;
 err.fillStyle='#c6c6c6';err.fillRect(px,py,w,h);
}
// Baked expressway micro-normal map from existing asphalt pixels.
// Reuses the albedo's tar seams and aggregate; no runtime frame work or meshes.
const expresswayNormalCanvas=document.createElement('canvas');
expresswayNormalCanvas.width=expresswayNormalCanvas.height=256;
const en=expresswayNormalCanvas.getContext('2d');
const erPixels=er.getImageData(0,0,256,256).data;
const enImage=en.createImageData(256,256),enPixels=enImage.data;
function expresswayHeight(x,y){
 const i=((y&255)*256+(x&255))*4;
 return (erPixels[i]*.299+erPixels[i+1]*.587+erPixels[i+2]*.114)/255;
}
for(let y=0;y<256;y++)for(let x=0;x<256;x++){
 const dx=expresswayHeight(x+1,y)-expresswayHeight(x-1,y);
 const dy=expresswayHeight(x,y+1)-expresswayHeight(x,y-1);
 const nx=-dx*.9,ny=-dy*.9,nz=1;
 const inv=1/Math.hypot(nx,ny,nz),i=(y*256+x)*4;
 enPixels[i]=Math.round(127.5*(nx*inv+1));
 enPixels[i+1]=Math.round(127.5*(ny*inv+1));
 enPixels[i+2]=Math.round(127.5*(nz*inv+1));
 enPixels[i+3]=255;
}
en.putImageData(enImage,0,0);
const expresswayNormalTexture=new THREE.CanvasTexture(expresswayNormalCanvas);
expresswayNormalTexture.wrapS=expresswayNormalTexture.wrapT=THREE.RepeatWrapping;
expresswayNormalTexture.repeat.set(1,18);
const expresswayRoadTexture=new THREE.CanvasTexture(expresswayRoadCanvas);
expresswayRoadTexture.colorSpace=THREE.SRGBColorSpace;
expresswayRoadTexture.wrapS=expresswayRoadTexture.wrapT=THREE.RepeatWrapping;
expresswayRoadTexture.repeat.set(1,18);
const expresswayRoughnessTexture=new THREE.CanvasTexture(expresswayRoughCanvas);
expresswayRoughnessTexture.wrapS=expresswayRoughnessTexture.wrapT=THREE.RepeatWrapping;
expresswayRoughnessTexture.repeat.set(1,18);
const expresswayAsphalt=new THREE.MeshStandardMaterial({
 color:0xc5c8ca,map:expresswayRoadTexture,roughnessMap:expresswayRoughnessTexture,
 normalMap:expresswayNormalTexture,normalScale:new THREE.Vector2(.24,.24),
 roughness:.9,metalness:.03
});
// Dark Road: dedicated mobile-budget PBR asphalt. The old shared daytime road
// looked pale and smooth under the low beam. Bake worn aggregate, shoulder dust,
// polished wheel tracks and sealed repairs into ONE 256px albedo map.
// No new meshes, lights, per-frame canvas work or draw calls.
const darkRoadCanvas=document.createElement('canvas');
darkRoadCanvas.width=darkRoadCanvas.height=256;
const darkRoadCtx=darkRoadCanvas.getContext('2d');
darkRoadCtx.fillStyle='#65696c';darkRoadCtx.fillRect(0,0,256,256);
for(let i=0;i<1700;i++){
 const px=(i*73+i*i*19+11)%256,py=(i*139+i*i*7+29)%256;
 darkRoadCtx.fillStyle=i%5===0?'rgba(198,199,188,.19)':
  i%3===0?'rgba(23,27,29,.25)':'rgba(38,41,42,.13)';
 darkRoadCtx.fillRect(px,py,1+i%2,1+i%2);
}
// Gravel and windblown soil collect outside the usable center driving lanes.
for(const [x0,x1,reverse] of [[0,35,false],[221,256,true]]){
 const dust=darkRoadCtx.createLinearGradient(x0,0,x1,0);
 dust.addColorStop(0,reverse?'rgba(107,98,83,0)':'rgba(107,98,83,.49)');
 dust.addColorStop(1,reverse?'rgba(107,98,83,.49)':'rgba(107,98,83,0)');
 darkRoadCtx.fillStyle=dust;darkRoadCtx.fillRect(x0,0,x1-x0,256);
}
// Subtle rubber-polished tracks appear only where headlights strike the road.
for(const x of [69,92,164,187]){
 const rut=darkRoadCtx.createLinearGradient(x-12,0,x+12,0);
 rut.addColorStop(0,'rgba(21,25,27,0)');
 rut.addColorStop(.5,'rgba(21,25,27,.23)');
 rut.addColorStop(1,'rgba(21,25,27,0)');
 darkRoadCtx.fillStyle=rut;darkRoadCtx.fillRect(x-12,0,24,256);
}
for(let i=0;i<4;i++){
 const x=47+(i*43)%150,y=19+(i*61)%177,w=22+i*4,h=29+i*5;
 darkRoadCtx.fillStyle='rgba(38,42,44,.32)';
 darkRoadCtx.fillRect(x,y,w,h);
 darkRoadCtx.strokeStyle='rgba(21,24,26,.36)';
 darkRoadCtx.lineWidth=1;darkRoadCtx.strokeRect(x+.5,y+.5,w-1,h-1);
}
darkRoadCtx.strokeStyle='rgba(23,27,29,.32)';
darkRoadCtx.lineWidth=1.3;
for(let i=0;i<5;i++){
 const x=42+(i*41)%171,y=17+(i*47)%204;
 darkRoadCtx.beginPath();darkRoadCtx.moveTo(x,y);
 darkRoadCtx.lineTo(x+7,y+11);darkRoadCtx.lineTo(x+3,y+22);
 darkRoadCtx.lineTo(x+13,y+31);darkRoadCtx.stroke();
}
const darkRoadTexture=new THREE.CanvasTexture(darkRoadCanvas);
darkRoadTexture.colorSpace=THREE.SRGBColorSpace;
darkRoadTexture.wrapS=darkRoadTexture.wrapT=THREE.RepeatWrapping;
darkRoadTexture.repeat.set(1,18);
darkRoadTexture.anisotropy=Math.min(2,renderer.capabilities.getMaxAnisotropy());
// Dark Road: tileable 128px PBR surface response to the moving headlamp.
// A single baked normal map gives gravel and tire-worn ruts depth; a matching
// roughness map adds a few shallow damp patches without meshes, lights or draw calls.
// Periodic height fields and wrapped derivatives avoid seams on the long road.
const darkRoadPbrSize=128,darkRoadPbrHeight=new Float32Array(darkRoadPbrSize*darkRoadPbrSize);
const darkRoadPbrNormalCanvas=document.createElement('canvas');
const darkRoadPbrRoughCanvas=document.createElement('canvas');
darkRoadPbrNormalCanvas.width=darkRoadPbrNormalCanvas.height=darkRoadPbrSize;
darkRoadPbrRoughCanvas.width=darkRoadPbrRoughCanvas.height=darkRoadPbrSize;
const darkRoadPbrNormalCtx=darkRoadPbrNormalCanvas.getContext('2d');
const darkRoadPbrRoughCtx=darkRoadPbrRoughCanvas.getContext('2d');
const darkRoadPbrNormalPixels=darkRoadPbrNormalCtx.createImageData(darkRoadPbrSize,darkRoadPbrSize);
const darkRoadPbrRoughPixels=darkRoadPbrRoughCtx.createImageData(darkRoadPbrSize,darkRoadPbrSize);
const darkRoadPbrWet=new Float32Array(darkRoadPbrSize*darkRoadPbrSize);
for(let py=0;py<darkRoadPbrSize;py++)for(let px=0;px<darkRoadPbrSize;px++){
 const u=px/darkRoadPbrSize,v=py/darkRoadPbrSize,tau=Math.PI*2;
 const gravel=.17*Math.sin(tau*19*u)*Math.cos(tau*23*v)
  +.09*Math.sin(tau*(37*u+11*v))+.035*Math.cos(tau*(47*u-31*v));
 const rut=.075*Math.cos(tau*2*u);
 let wet=0;
 for(const [cx,cy,rx,ry] of [[.23,.28,.12,.08],[.74,.63,.16,.055],[.47,.88,.09,.09]]){
  const dx=Math.min(Math.abs(u-cx),1-Math.abs(u-cx))/rx;
  const dy=Math.min(Math.abs(v-cy),1-Math.abs(v-cy))/ry;
  wet=Math.max(wet,Math.max(0,1-dx*dx-dy*dy));
 }
 const at=py*darkRoadPbrSize+px;
 darkRoadPbrWet[at]=wet;
 darkRoadPbrHeight[at]=(gravel+rut)*(1-.92*wet)-.10*wet;
}
for(let py=0;py<darkRoadPbrSize;py++)for(let px=0;px<darkRoadPbrSize;px++){
 const at=py*darkRoadPbrSize+px,k=at*4;
 const left=darkRoadPbrHeight[py*darkRoadPbrSize+((px+127)&127)];
 const right=darkRoadPbrHeight[py*darkRoadPbrSize+((px+1)&127)];
 const up=darkRoadPbrHeight[((py+127)&127)*darkRoadPbrSize+px];
 const down=darkRoadPbrHeight[((py+1)&127)*darkRoadPbrSize+px];
 const nx=(left-right)*.95,ny=(up-down)*.95;
 const inverse=1/Math.sqrt(nx*nx+ny*ny+1);
 darkRoadPbrNormalPixels.data[k]=Math.round(128+127*nx*inverse);
 darkRoadPbrNormalPixels.data[k+1]=Math.round(128+127*ny*inverse);
 darkRoadPbrNormalPixels.data[k+2]=Math.round(128+127*inverse);
 darkRoadPbrNormalPixels.data[k+3]=255;
 const rough=Math.round(224-158*darkRoadPbrWet[at]);
 darkRoadPbrRoughPixels.data[k]=rough;
 darkRoadPbrRoughPixels.data[k+1]=rough;
 darkRoadPbrRoughPixels.data[k+2]=rough;
 darkRoadPbrRoughPixels.data[k+3]=255;
}
darkRoadPbrNormalCtx.putImageData(darkRoadPbrNormalPixels,0,0);
darkRoadPbrRoughCtx.putImageData(darkRoadPbrRoughPixels,0,0);
const darkRoadNormalTexture=new THREE.CanvasTexture(darkRoadPbrNormalCanvas);
const darkRoadRoughnessTexture=new THREE.CanvasTexture(darkRoadPbrRoughCanvas);
for(const texture of [darkRoadNormalTexture,darkRoadRoughnessTexture]){
 texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
 texture.repeat.copy(darkRoadTexture.repeat);
 texture.anisotropy=2;
}
const darkRoadAsphalt=new THREE.MeshStandardMaterial({
 color:0xbfc2c4,map:darkRoadTexture,roughnessMap:darkRoadRoughnessTexture,
 normalMap:darkRoadNormalTexture,normalScale:new THREE.Vector2(.48,.48),
 roughness:.94,metalness:.01
});
const road=cube(11,.12,230,wetAsphalt,0,0,-60);scene.add(road);
const shoulderPaint=mat(0x4b4b4d),curbPaint=mat(0x8b776b);for(const side of [-1,1]){scene.add(cube(1.25,.11,230,shoulderPaint,side*6.2,-.015,-60));scene.add(cube(.22,.09,230,curbPaint,side*5.58,.08,-60));scene.add(cube(.1,.045,230,M.gold,side*5.37,.10,-60))}
const roadStuds=[];for(let i=0;i<12;i++){const stud=cube(.22,.025,.38,M.gold,0,.09,-i*19+10);scene.add(stud);roadStuds.push(stud)}// Baked weathered PBR paint, batched into one instanced draw call (formerly 46).
const stripeCanvas=document.createElement('canvas');
stripeCanvas.width=stripeCanvas.height=128;
const stripeCtx=stripeCanvas.getContext('2d');
stripeCtx.fillStyle='#f0efea';stripeCtx.fillRect(0,0,128,128);
let stripeSeed=0x20261102;
for(let i=0;i<310;i++){
 stripeSeed=(Math.imul(stripeSeed,1664525)+1013904223)>>>0;
 const x=stripeSeed%128;
 stripeSeed=(Math.imul(stripeSeed,1664525)+1013904223)>>>0;
 const y=stripeSeed%128;
 stripeCtx.fillStyle=i%4===0?'rgba(57,58,56,.27)':'rgba(98,96,88,.14)';
 stripeCtx.fillRect(x,y,1+i%3,1+i%4);
}
const stripeTexture=new THREE.CanvasTexture(stripeCanvas);
stripeTexture.colorSpace=THREE.SRGBColorSpace;
stripeTexture.anisotropy=Math.min(2,renderer.capabilities.getMaxAnisotropy());
M.stripe.map=stripeTexture;M.stripe.needsUpdate=true;
const stripeCount=46,stripeZ=new Float32Array(stripeCount);
const laneStripeMesh=new THREE.InstancedMesh(new THREE.BoxGeometry(.18,.035,3.5),M.stripe,stripeCount);
laneStripeMesh.name='weathered-instanced-lane-paint';
laneStripeMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
laneStripeMesh.frustumCulled=false;
const stripePose=new THREE.Object3D();
function placeLaneStripes(){
 for(let i=0;i<stripeCount;i++){
  stripePose.position.set(i%2===0?-1.85:1.85,.09,stripeZ[i]);
  stripePose.updateMatrix();
  laneStripeMesh.setMatrixAt(i,stripePose.matrix);
 }
 laneStripeMesh.instanceMatrix.needsUpdate=true;
}
for(let i=0;i<stripeCount;i++)stripeZ[i]=10-Math.floor(i/2)*10;
placeLaneStripes();scene.add(laneStripeMesh);

 // Yaowarat: two weathered, correctly proportioned Thai zebra crossings.
 // A shared 512x128 alpha-cut PBR paint atlas and only two planes keep mobile draw calls low.
 // Crossing paint is visual only: it cannot block the dodge lane or alter collisions.
 const zebraCanvas=document.createElement('canvas');
 zebraCanvas.width=512;zebraCanvas.height=128;
 const zebraCtx=zebraCanvas.getContext('2d');
 for(let bar=0;bar<11;bar++){
  const left=21+bar*44;
  zebraCtx.fillStyle='rgba(224,221,210,.93)';
  zebraCtx.fillRect(left,8,30,112);
  zebraCtx.fillStyle='rgba(106,105,99,.12)';
  zebraCtx.fillRect(left+3,8,2,112);
 }
 // Seeded flecks keep paint wear stable between restarts and devices.
 let zebraSeed=0x7a0b2026;
 for(let chip=0;chip<1150;chip++){
  zebraSeed=(Math.imul(zebraSeed,1664525)+1013904223)>>>0;
  const px=zebraSeed%512;
  zebraSeed=(Math.imul(zebraSeed,1664525)+1013904223)>>>0;
  const py=zebraSeed%128;
  if(px>=21&&px<491&&(px-21)%44<30&&py>=8&&py<120){
   zebraCtx.clearRect(px,py,1+(chip%3),1+(chip%2));
  }
 }
 const zebraTexture=new THREE.CanvasTexture(zebraCanvas);
 zebraTexture.colorSpace=THREE.SRGBColorSpace;
 zebraTexture.anisotropy=Math.min(2,renderer.capabilities.getMaxAnisotropy());
 const zebraMaterial=new THREE.MeshStandardMaterial({
  map:zebraTexture,color:0xffffff,roughness:.82,metalness:0,
  alphaTest:.3,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1
 });
 const zebraGeometry=new THREE.PlaneGeometry(9.2,3.0);
 const yaowaratCrosswalks=[-32,-128].map(z=>{
  const crossing=new THREE.Mesh(zebraGeometry,zebraMaterial);
  crossing.rotation.x=-Math.PI/2;
  crossing.position.set(0,.115,z);
  crossing.userData.startZ=z;
  scene.add(crossing);
  return crossing;
 });

 // Dark Road: real Thai two-lane paint geometry, baked into ONE PBR draw call.
 // Center broken white line and worn solid edge lines replace 46 bright toy blocks
 // and 12 road studs after 23,000m; no new per-frame meshes or lights.
 const darkRoadPaintCanvas=document.createElement('canvas');
 darkRoadPaintCanvas.width=darkRoadPaintCanvas.height=256;
 const darkRoadPaintCtx=darkRoadPaintCanvas.getContext('2d');
 const darkRoadPaintPixels=darkRoadPaintCtx.createImageData(256,256);
 for(let py=0;py<256;py++)for(let px=0;px<256;px++){
  const edge=Math.min(Math.abs(px-10),Math.abs(px-246));
  const center=Math.abs(px-128);
  const isEdge=edge<2.5,isDash=center<3.0&&py<72;
  const index=(py*256+px)*4;
  if(!isEdge&&!isDash)continue;
  // Irregular missing flecks, muted reflectance and softened paint edges.
  const grain=(px*37+py*19+px*py*7)%113;
  const chip=(px*11+py*23+(px*py)%47)%101<12;
  const fade=Math.max(0,1-(isEdge?edge/2.5:center/3.0)**2);
  darkRoadPaintPixels.data[index]=220;
  darkRoadPaintPixels.data[index+1]=218;
  darkRoadPaintPixels.data[index+2]=207;
  darkRoadPaintPixels.data[index+3]=chip?0:Math.round((164+grain*.56)*fade);
 }
 darkRoadPaintCtx.putImageData(darkRoadPaintPixels,0,0);
 const darkRoadPaintTexture=new THREE.CanvasTexture(darkRoadPaintCanvas);
 darkRoadPaintTexture.colorSpace=THREE.SRGBColorSpace;
 darkRoadPaintTexture.wrapS=darkRoadPaintTexture.wrapT=THREE.RepeatWrapping;
 darkRoadPaintTexture.repeat.set(1,18);
 darkRoadPaintTexture.anisotropy=Math.min(2,renderer.capabilities.getMaxAnisotropy());
 const darkRoadPaint=new THREE.Mesh(
  new THREE.PlaneGeometry(11,230),
  new THREE.MeshStandardMaterial({map:darkRoadPaintTexture,transparent:true,
   depthWrite:false,roughness:.83,metalness:0,side:THREE.DoubleSide})
 );
 darkRoadPaint.rotation.x=-Math.PI/2;
 darkRoadPaint.position.set(0,.077,-60);
 darkRoadPaint.visible=false;
 darkRoadPaint.frustumCulled=false;
 scene.add(darkRoadPaint);

// Dark Road: a pair of softly overlapping low-beam footprints on the asphalt.
// One 192x256 baked alpha texture and one transparent mesh (one draw call).
// No shadow maps, extra lights, frame-time canvas writes or network assets.
const lowBeamCanvas=document.createElement('canvas');
lowBeamCanvas.width=192;lowBeamCanvas.height=256;
const lowBeamCtx=lowBeamCanvas.getContext('2d');
const lowBeamPixels=lowBeamCtx.createImageData(192,256);
for(let py=0;py<256;py++)for(let px=0;px<192;px++){
 // Soft dual headlamp cones plus narrow wet-asphalt highlights. All work
 // is baked into the existing 192x256 atlas once, not calculated per frame.
 const distance=1-py/255; // Canvas top = far road; bottom = near road.
 const lateral=(px-95.5)/95.5;
 const beamWidth=.11+.35*distance,beamOffset=.08+.13*distance;
 const left=Math.exp(-Math.pow((lateral+beamOffset)/beamWidth,2));
 const right=Math.exp(-Math.pow((lateral-beamOffset)/beamWidth,2));
 const streakWidth=.038+.06*distance;
 const wetLeft=Math.exp(-Math.pow((lateral+beamOffset)/streakWidth,2));
 const wetRight=Math.exp(-Math.pow((lateral-beamOffset)/streakWidth,2));
 const distanceFade=Math.pow(Math.max(0,Math.sin(Math.PI*distance)),.82);
 const nearBounce=.20*Math.exp(-Math.pow((distance-.17)/.13,2));
 // Low-contrast asphalt grain breaks up a synthetic-looking solid light blob.
 const grain=.94+.06*Math.sin(distance*113+lateral*27)*Math.sin(distance*57-lateral*11);
 // An asymmetric dipped-beam cutoff keeps the oncoming side darker; narrow,
 // discontinuous specular streaks read as rain-wet asphalt rather than fog.
 const cutoff=.73+.27*Math.max(0,Math.min(1,(lateral+.12)*2.1));
 const puddleBreak=.76+.24*Math.pow(Math.sin(distance*89+lateral*15),2);
 const tireTrack=.85+.15*Math.pow(Math.sin(lateral*31+distance*9),2);
 // Broken longitudinal glints from shallow ruts: three narrow, fading
 // highlights inside the existing headlamp atlas, not extra light sources.
 // Their staggered interruptions keep wet asphalt from reading as a flat glow.
 const glintCenter=.18*Math.sin(distance*6.5)+.025*Math.sin(distance*31);
 const glintWidth=.012+.014*distance;
 const glint=Math.exp(-Math.pow((lateral-glintCenter)/glintWidth,2));
 const glintBreak=Math.pow(Math.max(0,Math.sin(distance*38+3*Math.sin(distance*11))),3);
 const wetGlint=.22*glint*glintBreak*(1-distance*.55);
 // Irregular transverse tar repairs interrupt reflections across the road.
 // Baked into the existing atlas; no geometry, texture or frame-time cost.
 const seamPhase=distance*21+.19*Math.sin(lateral*17)+.08*Math.sin(lateral*43);
 const seamDistance=Math.abs(Math.sin(Math.PI*seamPhase));
 const seamMask=1-.30*Math.pow(Math.max(0,1-seamDistance/.105),2);
 const alpha=Math.round(Math.min(155,Math.max(0,
  125*(distanceFade+nearBounce)*(.58*(left+right)*cutoff+
  .28*(wetLeft+wetRight)*puddleBreak+wetGlint)*grain*tireTrack*seamMask)));
 const k=(py*192+px)*4;
 // Headlamp color warms in the near pool and cools toward the distant cutoff.
 // Baked channel variation adds depth without dynamic lighting or extra meshes.
 const warm=Math.max(0,1-distance);
 lowBeamPixels.data[k]=255;
 lowBeamPixels.data[k+1]=Math.round(218+18*warm);
 lowBeamPixels.data[k+2]=Math.round(170+27*warm);
 lowBeamPixels.data[k+3]=alpha;
}
lowBeamCtx.putImageData(lowBeamPixels,0,0);
const lowBeamTexture=new THREE.CanvasTexture(lowBeamCanvas);
lowBeamTexture.colorSpace=THREE.SRGBColorSpace;
lowBeamTexture.anisotropy=mobile?1:2;
const darkRoadLowBeam=new THREE.Mesh(
 new THREE.PlaneGeometry(11,37),
 new THREE.MeshBasicMaterial({map:lowBeamTexture,transparent:true,
  opacity:.57,blending:THREE.AdditiveBlending,depthWrite:false,
  polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1})
);
darkRoadLowBeam.rotation.x=-Math.PI/2;
darkRoadLowBeam.position.set(0,.087,-13);
darkRoadLowBeam.visible=false;
darkRoadLowBeam.frustumCulled=false;
scene.add(darkRoadLowBeam);

// Bangkok street set: shophouses, awnings, shutters, windows, signs and cables.
const props=[];const storyProps=[];let nightCount=0,grandmaTriggeredNight=0,grandmaChase=null,nextDarkGrandmaScore=24000;const nightLength=2400;const storyMat={wood:mat(0x7d4134),roof:mat(0xb52c35),gold:mat(0xf6c847),leaf:mat(0x5b9b39),cloth:mat(0xe85c4c),ghost:mat(0xd8d1ed)};
const shopPaint=[mat(0xb6534d),mat(0x9b7760),mat(0xd2aa77),mat(0x796f76),mat(0xb17865)];
// Baked, shared ground-floor PBR storefronts: realistic shutter corrugation and warm glass displays.
function makeShopfrontMaterial(glazed){
 const c=document.createElement('canvas');c.width=c.height=256;
 const p=c.getContext('2d');
 if(glazed){
  const gradient=p.createLinearGradient(0,0,256,256);
  gradient.addColorStop(0,'#71817e');gradient.addColorStop(.42,'#253e48');gradient.addColorStop(1,'#101d29');
  p.fillStyle=gradient;p.fillRect(0,0,256,256);
  // Baked warm shop interior: deep shelving, product silhouettes and pools of light.
  // All detail lives in the existing 256px albedo; no new geometry, lights or textures.
  const interior=p.createLinearGradient(0,38,0,222);
  interior.addColorStop(0,'#15242a');interior.addColorStop(.55,'#3d332d');interior.addColorStop(1,'#11191c');
  p.fillStyle=interior;p.fillRect(12,40,232,181);
  for(let lamp=0;lamp<3;lamp++){
   const lx=48+lamp*79;
   const glow=p.createRadialGradient(lx,59,2,lx,99,64);
   glow.addColorStop(0,'rgba(255,201,119,.44)');
   glow.addColorStop(.5,'rgba(235,159,83,.13)');
   glow.addColorStop(1,'rgba(235,159,83,0)');
   p.fillStyle=glow;p.fillRect(lx-65,38,130,126);
   p.fillStyle='#d6a36c';p.fillRect(lx-8,49,16,3);
  }
  for(let row=0;row<3;row++){
   const shelfY=100+row*37;
   p.fillStyle='#171b1c';p.fillRect(20,shelfY+22,216,6);
   p.fillStyle='rgba(190,144,88,.45)';p.fillRect(20,shelfY+22,216,2);
   for(let col=0;col<8;col++){
    const px=25+col*27,ph=11+(row*5+col*7)%13;
    if((row+col)%3===0){
     // Narrow jars and bottles, not oversized toy-like cubes.
     p.fillStyle=(col%2?'#61726a':'#986a48');p.fillRect(px+5,shelfY+20-ph,10,ph);
     p.fillStyle='#c1a17a';p.fillRect(px+8,shelfY+17-ph,4,3);
     p.fillStyle='rgba(231,201,153,.4)';p.fillRect(px+6,shelfY+22-ph,2,ph-4);
    }else{
     p.fillStyle=(col%2?'#86674a':'#4e6260');p.fillRect(px,shelfY+21-ph,19,ph);
     p.fillStyle='rgba(232,194,136,.28)';p.fillRect(px+2,shelfY+23-ph,15,2);
    }
   }
  }
  // Yaowarat gold-shop window lettering, baked into the shared storefront atlas.
  // A subtle gold foil sign and its dark backing read as a real shop, not a glowing toy cube.
  p.fillStyle='rgba(19,29,30,.91)';p.fillRect(17,13,222,25);
  p.strokeStyle='rgba(189,143,68,.75)';p.lineWidth=1;p.strokeRect(18,14,220,23);
  p.textAlign='center';p.textBaseline='middle';
  p.font='bold 17px "Noto Sans Thai",Tahoma,sans-serif';
  p.fillStyle='#d9b76c';p.fillText('ห้างทอง เยาวราช',128,26,204);
  p.fillStyle='rgba(255,225,154,.30)';p.fillRect(22,16,212,1);
  // Baked gold-shop hanging ornaments and wet glazing, no extra meshes.
  for(let charm=0;charm<5;charm++){
   const x=38+charm*45,drop=52+(charm%2)*9;
   p.strokeStyle='rgba(174,129,66,.75)';p.lineWidth=1;
   p.beginPath();p.moveTo(x,40);p.lineTo(x,drop);p.stroke();
   p.fillStyle='rgba(192,132,51,.83)';
   p.beginPath();p.moveTo(x,drop);p.lineTo(x+5,drop+7);
   p.lineTo(x,drop+14);p.lineTo(x-5,drop+7);p.closePath();p.fill();
   p.fillStyle='rgba(255,222,146,.7)';p.fillRect(x-1,drop+3,2,5);
  }
  for(let streak=0;streak<24;streak++){
   const x=14+(streak*73)%228,y=45+(streak*31)%110;
   const length=14+(streak*17)%61;
   p.strokeStyle=streak%4===0?'rgba(225,237,226,.22)':'rgba(187,202,201,.12)';
   p.lineWidth=streak%5===0?1.5:.65;
   p.beginPath();p.moveTo(x,y);
   p.bezierCurveTo(x-2,y+length*.3,x+2,y+length*.7,x-1,y+length);
   p.stroke();
  }
  // Dark counter edge and glass door remain legible behind exterior reflections.
  p.fillStyle='rgba(17,20,21,.72)';p.fillRect(12,216,232,18);
  const glare=p.createLinearGradient(0,0,256,0);
  glare.addColorStop(0,'rgba(225,235,230,.36)');glare.addColorStop(.28,'rgba(225,235,230,.02)');
  glare.addColorStop(.64,'rgba(225,235,230,.17)');glare.addColorStop(1,'rgba(225,235,230,.02)');
  p.fillStyle=glare;p.fillRect(0,0,256,256);
  p.fillStyle='#6e6554';p.fillRect(0,0,10,256);p.fillRect(246,0,10,256);
  p.fillRect(125,0,7,256);p.fillRect(0,0,256,11);p.fillRect(0,245,256,11);
  p.fillStyle='#bba989';p.fillRect(116,130,3,32);p.fillRect(139,130,3,32);
 }else{
  const steel=p.createLinearGradient(0,0,256,0);
  steel.addColorStop(0,'#4d4c4a');steel.addColorStop(.48,'#89857e');steel.addColorStop(1,'#494845');
  p.fillStyle=steel;p.fillRect(0,0,256,256);
  for(let y=0;y<256;y+=16){
   p.fillStyle='rgba(14,22,27,.45)';p.fillRect(0,y,256,3);
   p.fillStyle='rgba(237,226,200,.24)';p.fillRect(0,y+4,256,2);
   p.fillStyle='rgba(22,30,35,.17)';p.fillRect(0,y+12,256,2);
  }
  for(let k=0;k<80;k++){
   p.fillStyle=k%3===0?'rgba(94,48,29,.23)':'rgba(25,28,29,.16)';
   p.fillRect((k*79+19)%252,(k*47+7)%248,1+k%4,2+k%8);
  }
  // Yaowarat shutter hand-painted lettering: aged Thai shop signage baked into
  // the shared corrugated-steel albedo, with no extra draw calls or GPU textures.
  p.save();
  p.translate(128,112);
  p.rotate(-.025);
  p.fillStyle='rgba(43,35,30,.64)';p.fillRect(-105,-33,210,70);
  p.strokeStyle='rgba(190,146,89,.58)';p.lineWidth=2;p.strokeRect(-103,-31,206,66);
  p.textAlign='center';p.textBaseline='middle';
  p.font='bold 25px "Noto Sans Thai",Tahoma,sans-serif';
  p.fillStyle='rgba(226,195,133,.88)';p.fillText('ร้านค้าเยาวราช',0,-8,192);
  p.font='bold 13px Tahoma,sans-serif';
  p.fillStyle='rgba(215,199,165,.77)';p.fillText('เปิดทุกวัน  08:00 - 22:00',0,21,186);
  // Scrapes reveal the underlying ribbed steel and prevent a flat digital-sign look.
  for(let n=0;n<27;n++){
   const sx=-96+(n*43)%192,sy=-28+(n*19)%60;
   p.fillStyle=n%3===0?'rgba(43,35,30,.60)':'rgba(119,113,102,.34)';
   p.fillRect(sx,sy,5+n%11,1+n%2);
  }
  p.restore();
  p.fillStyle='rgba(28,25,24,.3)';p.fillRect(0,0,13,256);p.fillRect(243,0,13,256);
 }
 const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;
 const material=new THREE.MeshStandardMaterial({map:texture,metalness:glazed?.22:.57,roughness:glazed?.32:.72});
 if(!glazed){
  // Shared 256px tangent-space normal map: corrugated shutter ribs catch
  // passing neon without 3D slats or additional draw calls.
  const normalCanvas=document.createElement('canvas');
  normalCanvas.width=normalCanvas.height=256;
  const normalCtx=normalCanvas.getContext('2d');
  const normalPixels=normalCtx.createImageData(256,256);
  for(let y=0;y<256;y++){
   const ribSlope=Math.cos((y+2)*Math.PI/8)*36;
   for(let x=0;x<256;x++){
    const at=(y*256+x)*4;
    normalPixels.data[at]=128;
    normalPixels.data[at+1]=Math.round(128+ribSlope);
    normalPixels.data[at+2]=250;
    normalPixels.data[at+3]=255;
   }
  }
  normalCtx.putImageData(normalPixels,0,0);
  material.normalMap=new THREE.CanvasTexture(normalCanvas);
  material.normalScale.set(.48,.48);
 }
 return material;
}
const shopfrontMaterials={shutter:makeShopfrontMaterial(false),glass:makeShopfrontMaterial(true)};

// Yaowarat: distant apartment towers behind the shophouses. Baked weathered
// PBR facades, AC bands and uneven lit windows, not flat toy-block colors.
// Two shared instanced batches, two 256px textures, no new lights or collisions.
const skylineFacadeCanvas=document.createElement('canvas');
const skylineEmissionCanvas=document.createElement('canvas');
skylineFacadeCanvas.width=skylineFacadeCanvas.height=256;
skylineEmissionCanvas.width=skylineEmissionCanvas.height=256;
const skylineFacadeCtx=skylineFacadeCanvas.getContext('2d');
const skylineEmissionCtx=skylineEmissionCanvas.getContext('2d');
const skylineConcrete=skylineFacadeCtx.createLinearGradient(0,0,256,0);
skylineConcrete.addColorStop(0,'#353b43');
skylineConcrete.addColorStop(.44,'#6a6b67');
skylineConcrete.addColorStop(1,'#303943');
skylineFacadeCtx.fillStyle=skylineConcrete;
skylineFacadeCtx.fillRect(0,0,256,256);
skylineEmissionCtx.fillStyle='#000';
skylineEmissionCtx.fillRect(0,0,256,256);
let skylineSeed=0x20261102;
function skylineRandom(){
 skylineSeed=(Math.imul(skylineSeed,1664525)+1013904223)>>>0;
 return skylineSeed/4294967296;
}
for(let col=0;col<8;col++){
 const bx=8+col*31;
 skylineFacadeCtx.fillStyle='rgba(18,22,27,.22)';
 skylineFacadeCtx.fillRect(bx-4,0,2,256);
 for(let row=0;row<15;row++){
  const wx=bx+2,wy=5+row*17,lit=skylineRandom()>.73;
  skylineFacadeCtx.fillStyle='#202a32';
  skylineFacadeCtx.fillRect(wx-2,wy-2,23,14);
  skylineFacadeCtx.fillStyle=lit?(row%3===0?'#a5a08a':'#b8a18a'):'#293d49';
  skylineFacadeCtx.fillRect(wx,wy,19,10);
  skylineFacadeCtx.fillStyle=lit?'rgba(248,204,144,.55)':'rgba(150,181,190,.14)';
  skylineFacadeCtx.fillRect(wx+2,wy+1,4,8);
  skylineFacadeCtx.fillStyle='rgba(13,18,21,.5)';
  skylineFacadeCtx.fillRect(wx+9,wy,1,10);
  if(lit){
   skylineEmissionCtx.fillStyle=row%3===0?'#b6a67d':'#f5c28a';
   skylineEmissionCtx.fillRect(wx,wy,19,10);
  }
  if((row+col*3)%7===0){
   skylineFacadeCtx.fillStyle='#565d60';
   skylineFacadeCtx.fillRect(wx+3,wy+11,14,3);
   skylineFacadeCtx.fillStyle='#252d32';
   skylineFacadeCtx.fillRect(wx+4,wy+12,12,1);
  }
 }
}
for(let k=0;k<75;k++){
 const x=Math.floor(skylineRandom()*256),y=Math.floor(skylineRandom()*256);
 skylineFacadeCtx.fillStyle=k%3===0?'rgba(23,25,27,.13)':'rgba(171,164,147,.08)';
 skylineFacadeCtx.fillRect(x,y,1+k%3,7+k%21);
}
// Baked balcony railings and external AC grilles on apartment facades.
// Reuses the existing skyline albedo atlas: zero new draw calls.
for(let col=0;col<8;col++){
 const bx=8+col*31;
 for(let row=0;row<15;row++){
  if((col*5+row*3)%4===0)continue;
  const x=bx+1,y=5+row*17;
  skylineFacadeCtx.fillStyle='rgba(12,19,23,.72)';
  skylineFacadeCtx.fillRect(x-2,y+10,23,3);
  skylineFacadeCtx.fillStyle='rgba(159,162,152,.55)';
  skylineFacadeCtx.fillRect(x-2,y+10,23,1);
  skylineFacadeCtx.fillStyle='rgba(93,110,113,.72)';
  skylineFacadeCtx.fillRect(x,y+6,1,5);
  skylineFacadeCtx.fillRect(x+18,y+6,1,5);
  skylineFacadeCtx.fillRect(x,y+7,19,1);
  if((col+row)%3===0){
   skylineFacadeCtx.fillStyle='#737b7a';
   skylineFacadeCtx.fillRect(x+11,y+8,7,5);
   skylineFacadeCtx.fillStyle='#293438';
   for(let slat=0;slat<3;slat++)skylineFacadeCtx.fillRect(x+12,y+9+slat,5,1);
  }
 }
}
const skylineFacadeTexture=new THREE.CanvasTexture(skylineFacadeCanvas);
skylineFacadeTexture.colorSpace=THREE.SRGBColorSpace;
const skylineEmissionTexture=new THREE.CanvasTexture(skylineEmissionCanvas);
skylineEmissionTexture.colorSpace=THREE.SRGBColorSpace;
for(const texture of [skylineFacadeTexture,skylineEmissionTexture])
 texture.anisotropy=Math.min(2,renderer.capabilities.getMaxAnisotropy());
const skylineMaterial=new THREE.MeshStandardMaterial({
 map:skylineFacadeTexture,emissiveMap:skylineEmissionTexture,
 emissive:0xffd4a5,emissiveIntensity:.72,roughness:.86,metalness:.08
});
const skylineRoofMaterial=new THREE.MeshStandardMaterial({
 color:0x555d60,roughness:.79,metalness:.35
});
const skylineCount=mobile?18:24;
const skylineTowers=new THREE.InstancedMesh(
 new THREE.BoxGeometry(1,1,1),skylineMaterial,skylineCount
);
const skylineRooftops=new THREE.InstancedMesh(
 new THREE.BoxGeometry(1,1,1),skylineRoofMaterial,skylineCount
);
for(const batch of [skylineTowers,skylineRooftops]){
 batch.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
 batch.frustumCulled=false;
 scene.add(batch);
}
const skylineBuildings=Array.from({length:skylineCount},(_,i)=>{
 const row=Math.floor(i/2),side=i%2===0?-1:1;
 return {
  x:side*(11.8+(row%3)*1.55),
  startZ:-18-row*7.4-(side>0?3.7:0),
  z:0,
  height:12+(row*7+i*3)%17,
  width:4.1+(row%3)*.75,
  depth:4.7+(row%4)*.52
 };
});
const skylineSpan=skylineCount/2*7.4;
const skylinePose=new THREE.Object3D();
function updateYaowaratSkyline(advance,visible,resetPositions=false){
 skylineTowers.visible=skylineRooftops.visible=visible;
 if(!visible)return;
 for(let i=0;i<skylineCount;i++){
  const tower=skylineBuildings[i];
  tower.z=resetPositions?tower.startZ:tower.z+advance;
  if(tower.z>18)tower.z-=skylineSpan;
  skylinePose.rotation.set(0,0,0);
  skylinePose.position.set(tower.x,tower.height/2,tower.z);
  skylinePose.scale.set(tower.width,tower.height,tower.depth);
  skylinePose.updateMatrix();
  skylineTowers.setMatrixAt(i,skylinePose.matrix);
  skylinePose.position.set(tower.x,tower.height+.23,tower.z);
  skylinePose.scale.set(tower.width*.65,.46,tower.depth*.58);
  skylinePose.updateMatrix();
  skylineRooftops.setMatrixAt(i,skylinePose.matrix);
 }
 skylineTowers.instanceMatrix.needsUpdate=true;
 skylineRooftops.instanceMatrix.needsUpdate=true;
}
updateYaowaratSkyline(0,true,true);

const shopTrim=mat(0xfff5d1),shopShadow=mat(0x39365b),windowGlow=mat(0xffe7a1);
// Three shared PBR canvas awnings: woven stripes, folds, stitched hems and rain grime.
// Reuse the existing shophouse meshes: zero additional draw calls or per-frame work.
function makeYaowaratAwning(variant){
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=128;
 const ctx=canvas.getContext('2d');
 const palettes=[
  ['#77333c','#e2c6a9','#4c202a'],
  ['#276e68','#d8d3ba','#174b49'],
  ['#a06b32','#e9d6a9','#674323']
 ];
 const [stripe,cream,shadow]=palettes[variant];
 ctx.fillStyle=cream;ctx.fillRect(0,0,256,128);
 for(let panel=0;panel<8;panel++){
  const x=panel*32;
  ctx.fillStyle=panel%2===0?stripe:cream;ctx.fillRect(x,0,32,128);
  const fold=ctx.createLinearGradient(x,0,x+32,0);
  fold.addColorStop(0,'rgba(14,15,16,.21)');
  fold.addColorStop(.3,'rgba(255,255,240,.09)');
  fold.addColorStop(.72,'rgba(255,255,240,.015)');
  fold.addColorStop(1,'rgba(11,13,15,.18)');
  ctx.fillStyle=fold;ctx.fillRect(x,0,32,128);
  ctx.strokeStyle='rgba(240,225,192,.4)';ctx.lineWidth=1;
  ctx.setLineDash([3,4]);ctx.beginPath();ctx.moveTo(x+1,3);ctx.lineTo(x+1,125);ctx.stroke();ctx.setLineDash([]);
 }
 ctx.fillStyle=shadow;ctx.fillRect(0,117,256,11);
 ctx.fillStyle='rgba(238,221,184,.55)';ctx.fillRect(0,117,256,1);
 ctx.strokeStyle='rgba(244,231,201,.55)';ctx.setLineDash([4,5]);
 ctx.beginPath();ctx.moveTo(3,122);ctx.lineTo(253,122);ctx.stroke();ctx.setLineDash([]);
 for(let k=0;k<140;k++){
  const x=(k*73+variant*29)%256,y=(k*41+variant*17)%118;
  ctx.fillStyle=k%3===0?'rgba(41,35,28,.13)':'rgba(236,221,194,.075)';
  ctx.fillRect(x,y,1+k%3,2+k%9);
 }
 const texture=new THREE.CanvasTexture(canvas);
 texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=mobile?2:4;
 return new THREE.MeshStandardMaterial({map:texture,roughness:.89,metalness:0});
}
const awningColors=Array.from({length:3},(_,i)=>makeYaowaratAwning(i));
// Shared slender steel supports for all Yaowarat shop awnings: no per-building geometry allocations.
const yaowaratAwningRibGeometry=new THREE.BoxGeometry(.042,.045,1.06);
const yaowaratAwningRibMetal=new THREE.MeshStandardMaterial({color:0x66645e,metalness:.52,roughness:.77});
const yaowaratAwningRibMatrix=new THREE.Matrix4();
const signMaterials=[mat(0xff267a),mat(0x086bd8),mat(0x1cbf7a)];const neonSigns=[new THREE.MeshBasicMaterial({color:0xff3d96}),new THREE.MeshBasicMaterial({color:0x22ffe0}),new THREE.MeshBasicMaterial({color:0xffd64d})];const daySigns=signMaterials.slice();function applyDistrict(i){if(i===districtIndex)return;districtIndex=i;paintCockpitMirrorDistrict(i);cockpitMirrorTexture.needsUpdate=true;paintCockpitFinishDistrict(i);
 const light=districtLightPresets[i]||districtLightPresets[0];
 skyFill.intensity=light[0];sun.intensity=light[1];
 skyFill.color.setHex(light[2]);skyFill.groundColor.setHex(light[3]);sun.color.setHex(light[4]);const fogRange=districtFogRanges[i]||districtFogRanges[0];scene.fog.near=fogRange[0];scene.fog.far=fogRange[1];districtLabel.textContent=['☀️ BANGKOK DAYTIME','🌃 YAOWARAT NIGHT · TEST 6.9','🌑 RAMA II · BLACKOUT CONSTRUCTION','🛍️ JJ MARKET · CHATUCHAK · 8000+','🛣️ BANGKOK EXPRESSWAY · 12000+','🌈 PATTAYA WALKING STREET · 16000+','🌑 DARK ROAD · 23000+'][i];for(let k=0;k<3;k++)signMaterials[k]=i===1?neonSigns[k]:daySigns[k];for(const b of props){if(b.userData.sign)b.userData.sign.material=signMaterials[b.userData.signIndex%3]}if(i===2)queueRamaExcavatorModel();const rama=i===2;M.grass.color.setHex(rama?0x78746d:0x34333b);M.road.color.setHex(rama?0x777b81:0x56535c);M.stripe.color.setHex(rama?0xe5e1d3:0xe2c579);shoulderPaint.color.setHex(rama?0x77736e:0x444148);curbPaint.color.setHex(rama?0x9d968b:0x756866);hint.textContent=['🛺 WELCOME TO BANGKOK!','🏮 WELCOME TO YAOWARAT!','🌇 SUNSET DRIVE!','🌿 JJ MARKET! WATCH THE TRAFFIC!','🛸 EXPRESSWAY! UFO LASERS INCOMING!','🌈 PATTAYA WALKING STREET!','🔦 DARK ROAD! HEADLIGHTS ONLY!'][i]}
function makeRoadsideStory(kind,side,z){const g=new THREE.Group();if(kind==='shrine'){g.add(cube(1.5,.25,1.3,storyMat.wood,0,.55,0));for(const sx of [-.53,.53])for(const sz of [-.42,.42])g.add(cube(.12,1.55,.12,storyMat.gold,sx,1.4,sz));g.add(cube(1.9,.3,1.65,storyMat.roof,0,2.25,0));g.add(cube(.55,.8,.52,storyMat.gold,0,1.4,0))}else{g.add(cube(2.4,.95,1.45,storyMat.wood,0,.7,0));g.add(cube(2.65,.15,1.8,storyMat.cloth,0,1.65,0));for(let i=0;i<5;i++){const d=new THREE.Mesh(new THREE.IcosahedronGeometry(.24,0),M.durian);d.position.set((i-2)*.38,1.3,(i%2)*.34-.2);g.add(d)}const vendor=new THREE.Group();vendor.add(cube(.45,.8,.34,storyMat.cloth,0,1.48,0));vendor.add(ball(.34,M.skin,0,2.07,0));vendor.add(ball(.37,M.black,0,2.36,.02));vendor.add(ball(.08,M.white,-.13,2.1,-.29));vendor.add(ball(.08,M.white,.13,2.1,-.29));const arm=cube(.13,.63,.14,M.skin,-.37,1.55,0);vendor.add(arm);vendor.position.x=-.85;g.add(vendor);g.userData.vendorArm=arm;g.userData.vendorFruit=ball(.29,M.durian,-.35,1.65,-.4);g.add(g.userData.vendorFruit)}g.position.set(side*7.35,0,z);scene.add(g);storyProps.push({g,kind,side,triggered:false,dropTime:0});return g}
// Mobile-budget PBR Speed Grandma: curved silhouette and human-scale features,
 // not the previous flat-shaded box character. No external assets or skinning.
 // Bake one deterministic 256x512 worn-fabric PBR albedo at startup.
 // The same atlas dresses the skirt, sleeves and shawl without additional draw calls.
 const grandmaFabricCanvas=document.createElement('canvas');
 grandmaFabricCanvas.width=256;grandmaFabricCanvas.height=512;
 const grandmaFabricCtx=grandmaFabricCanvas.getContext('2d');
 grandmaFabricCtx.fillStyle='#d9d7d1';grandmaFabricCtx.fillRect(0,0,256,512);
 for(let column=0;column<256;column++){
  const fold=Math.sin(column*.085+Math.sin(column*.019)*1.7)*.055+
   Math.sin(column*.21)*.022;
  grandmaFabricCtx.fillStyle=fold<0?
   'rgba(29,30,33,'+(-fold*2.4).toFixed(3)+')':
   'rgba(255,248,228,'+(fold*1.1).toFixed(3)+')';
  grandmaFabricCtx.fillRect(column,0,1,512);
 }
 // Fine woven threads, repaired seams and weathering are baked, never animated.
 for(let row=1;row<512;row+=4){
  grandmaFabricCtx.fillStyle='rgba(39,43,48,.038)';
  grandmaFabricCtx.fillRect(0,row,256,1);
 }
 for(let i=0;i<1150;i++){
  const px=(i*73+i*i*17)%256,py=(i*131+i*i*11)%512;
  grandmaFabricCtx.fillStyle=i%3===0?'rgba(32,34,37,.095)':'rgba(255,252,234,.11)';
  grandmaFabricCtx.fillRect(px,py,1+i%2,1);
 }
 for(const seamX of [28,128,228]){
  grandmaFabricCtx.fillStyle='rgba(34,36,39,.12)';
  grandmaFabricCtx.fillRect(seamX,0,2,512);
  grandmaFabricCtx.fillStyle='rgba(246,239,221,.13)';
  grandmaFabricCtx.fillRect(seamX+3,0,1,512);
 }
 const grandmaFabricTexture=new THREE.CanvasTexture(grandmaFabricCanvas);
 grandmaFabricTexture.colorSpace=THREE.SRGBColorSpace;
 grandmaFabricTexture.wrapS=grandmaFabricTexture.wrapT=THREE.RepeatWrapping;
 grandmaFabricTexture.anisotropy=Math.min(2,renderer.capabilities.getMaxAnisotropy());
 const grandmaDress=new THREE.MeshStandardMaterial({color:0x525b63,map:grandmaFabricTexture,roughness:.96,side:THREE.DoubleSide});
 const grandmaShawl=new THREE.MeshStandardMaterial({color:0x99968d,map:grandmaFabricTexture,roughness:.94});
 const grandmaSkin=new THREE.MeshStandardMaterial({color:0xa88c7b,roughness:.91});

 // Mobile PBR portrait atlas: the front of SphereGeometry (+Z) is near U=.25.
 // Paint subtle age marks into one 512x256 albedo instead of five separate
 // wrinkle tube meshes. Better human facial depth at fewer draw calls.
 const grandmaFaceCanvas=document.createElement('canvas');
 grandmaFaceCanvas.width=512;grandmaFaceCanvas.height=256;
 const grandmaFaceCtx=grandmaFaceCanvas.getContext('2d');
 grandmaFaceCtx.fillStyle='#ae9381';grandmaFaceCtx.fillRect(0,0,512,256);
 const faceLight=grandmaFaceCtx.createRadialGradient(128,116,5,128,123,160);
 faceLight.addColorStop(0,'rgba(240,208,182,.16)');
 faceLight.addColorStop(.65,'rgba(226,192,164,.06)');
 faceLight.addColorStop(1,'rgba(74,53,47,0)');
 grandmaFaceCtx.fillStyle=faceLight;grandmaFaceCtx.fillRect(0,0,512,256);
 // Deterministic pores and age pigmentation, baked once rather than animated.
 for(let i=0;i<1900;i++){
  const px=(i*131+i*i*17+31)%512,py=(i*71+i*i*11+17)%256;
  grandmaFaceCtx.fillStyle=i%3===0?'rgba(76,51,45,.055)':'rgba(240,216,190,.07)';
  grandmaFaceCtx.fillRect(px,py,1+(i%2),1);
 }
 for(let i=0;i<36;i++){
  const px=76+(i*37)%105,py=69+(i*47)%132;
  grandmaFaceCtx.fillStyle='rgba(90,57,48,.085)';
  grandmaFaceCtx.beginPath();grandmaFaceCtx.ellipse(px,py,1.2+i%3,.8+i%2,i*.3,0,Math.PI*2);grandmaFaceCtx.fill();
 }
 // Fine, irregular wrinkles follow the forehead, lower eyelids and cheeks.
 // Keep strokes translucent: this is skin relief, not cartoon line art.
 function grandmaFaceLine(points,alpha=.22,width=1){
  grandmaFaceCtx.beginPath();grandmaFaceCtx.moveTo(points[0][0],points[0][1]);
  for(let i=1;i<points.length-1;i++){
   const a=points[i],b=points[i+1];
   grandmaFaceCtx.quadraticCurveTo(a[0],a[1],(a[0]+b[0])*.5,(a[1]+b[1])*.5);
  }
  const last=points[points.length-1];
  grandmaFaceCtx.lineTo(last[0],last[1]);
  grandmaFaceCtx.strokeStyle='rgba(83,53,48,'+alpha+')';
  grandmaFaceCtx.lineWidth=width;grandmaFaceCtx.lineCap='round';grandmaFaceCtx.stroke();
 }
 grandmaFaceLine([[89,80],[111,77],[139,78],[166,83]],.18,1.1);
 grandmaFaceLine([[94,91],[117,89],[145,90],[163,94]],.15,.9);
 for(const side of [-1,1]){
  const eyeX=128+side*37;
  grandmaFaceLine([[eyeX-side*14,129],[eyeX,134],[eyeX+side*13,130]],.23,1.25);
  grandmaFaceLine([[eyeX+side*12,119],[eyeX+side*21,122],[eyeX+side*27,126]],.18,.9);
  grandmaFaceLine([[eyeX+side*11,126],[eyeX+side*20,130],[eyeX+side*25,135]],.14,.85);
  grandmaFaceLine([[128+side*17,158],[128+side*25,165],[128+side*28,173]],.16,.85);
 }
 grandmaFaceLine([[108,189],[128,192],[149,189]],.12,.8);
 const grandmaFaceTexture=new THREE.CanvasTexture(grandmaFaceCanvas);
 grandmaFaceTexture.colorSpace=THREE.SRGBColorSpace;
 grandmaFaceTexture.anisotropy=Math.min(2,renderer.capabilities.getMaxAnisotropy());
 const grandmaFace=new THREE.MeshStandardMaterial({map:grandmaFaceTexture,roughness:.88,metalness:0});
 const grandmaHair=new THREE.MeshStandardMaterial({color:0x8e9292,roughness:.98});
 const grandmaEyes=new THREE.MeshStandardMaterial({color:0x25272b,roughness:.67});
 function makeGrandma(){
  const g=new THREE.Group();
  const skirt=new THREE.Mesh(new THREE.LatheGeometry([
   new THREE.Vector2(.37,.11),new THREE.Vector2(.45,.2),new THREE.Vector2(.38,.65),
   new THREE.Vector2(.29,1.18),new THREE.Vector2(.27,1.48)],14),grandmaDress);g.add(skirt);
  const torso=new THREE.Mesh(new THREE.CylinderGeometry(.25,.3,.57,12),grandmaDress);
  torso.position.y=1.46;g.add(torso);
  const shoulders=new THREE.Mesh(new THREE.SphereGeometry(.38,12,8),grandmaShawl);
  shoulders.scale.set(1,.22,.67);shoulders.position.set(0,1.75,0);g.add(shoulders);
  const neck=new THREE.Mesh(new THREE.CylinderGeometry(.105,.13,.24,9),grandmaSkin);
  neck.position.y=1.89;g.add(neck);
  // A subtly sculpted jaw, temples and cheekbones avoid the toy-like perfect sphere.
  // Geometry remains under 500 vertices, with no new character draw calls.
  const headGeometry=new THREE.SphereGeometry(.27,24,18);
  const headPositions=headGeometry.getAttribute('position');
  for(let i=0;i<headPositions.count;i++){
   const px=headPositions.getX(i),py=headPositions.getY(i),pz=headPositions.getZ(i);
   const jaw=Math.max(0,-py/.27);
   const cheek=pz>0?Math.exp(-Math.pow((py-.012)/.095,2))*.038:0;
   const forehead=Math.max(0,py/.27)*.045;
   headPositions.setX(i,px*(1-jaw*.16+cheek-forehead));
   if(pz>0)headPositions.setZ(i,pz*(1+cheek*.34-jaw*.045));
  }
  headPositions.needsUpdate=true;headGeometry.computeVertexNormals();
  const head=new THREE.Mesh(headGeometry,grandmaFace);
  head.scale.set(.83,1.07,.92);head.position.set(0,2.14,.04);g.add(head);
  const hair=new THREE.Mesh(new THREE.SphereGeometry(.27,14,10),grandmaHair);
  hair.scale.set(.92,.52,.93);hair.position.set(0,2.38,.015);g.add(hair);
  const bun=new THREE.Mesh(new THREE.SphereGeometry(.17,12,9),grandmaHair);
  bun.position.set(0,2.34,-.25);g.add(bun);
  for(const side of [-1,1]){
   const eye=new THREE.Mesh(new THREE.SphereGeometry(.024,8,7),grandmaEyes);
   eye.position.set(side*.103,2.17,.276);g.add(eye);
   const brow=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,.14,6),grandmaHair);
   brow.rotation.z=Math.PI/2+side*.15;brow.position.set(side*.103,2.25,.268);g.add(brow);
  }
  // Fine age creases are now baked into grandmaFaceTexture (no extra meshes).
  const nose=new THREE.Mesh(new THREE.SphereGeometry(.055,8,6),grandmaSkin);
  nose.scale.set(.68,1.1,1.1);nose.position.set(0,2.09,.292);g.add(nose);
  const mouth=new THREE.Mesh(new THREE.SphereGeometry(.062,8,6),grandmaEyes);
  mouth.scale.set(1,.13,.16);mouth.position.set(0,1.997,.276);g.add(mouth);
  const arms=[],legs=[];
  for(const side of [-1,1]){
   const arm=new THREE.Group();arm.position.set(side*.32,1.7,0);
   const sleeve=new THREE.Mesh(new THREE.CylinderGeometry(.105,.09,.42,9),grandmaDress);
   sleeve.position.set(side*.085,-.19,0);sleeve.rotation.z=side*.26;arm.add(sleeve);
   const forearm=new THREE.Mesh(new THREE.CylinderGeometry(.072,.059,.32,9),grandmaSkin);
   forearm.position.set(side*.16,-.51,.05);forearm.rotation.z=side*.17;arm.add(forearm);
   const hand=new THREE.Mesh(new THREE.SphereGeometry(.088,9,7),grandmaSkin);
   hand.scale.set(.8,1.18,.72);hand.position.set(side*.19,-.69,.09);arm.add(hand);
   g.add(arm);arms.push(arm);
   const leg=new THREE.Group();leg.position.set(side*.18,.73,0);
   const calf=new THREE.Mesh(new THREE.CylinderGeometry(.095,.073,.61,9),grandmaSkin);
   calf.position.y=-.31;leg.add(calf);
   const shoe=new THREE.Mesh(new THREE.SphereGeometry(.15,10,7),grandmaEyes);
   shoe.scale.set(.85,.44,1.3);shoe.position.set(0,-.64,.085);leg.add(shoe);
   g.add(leg);legs.push(leg);
  }
  g.userData.runArms=arms;g.userData.runLegs=legs;
  return g;
 }
 function startGrandmaChase(side){
  if(grandmaChase)scene.remove(grandmaChase.g);
  const g=makeGrandma();g.position.set(side*4.65,0,-14);scene.add(g);
  grandmaChase={g,side,time:3,elapsed:0,stepSound:0,mirrorTaken:false};
  hint.textContent='👵 GRANDMA SPEED! WATCH YOUR MIRROR!';
  sound(750,.22,'sawtooth');
 }
// Eight shared, weathered Yaowarat plaster facades: PBR response without extra meshes or textures.
function facadeMaterial(seed){
 const c=document.createElement('canvas');c.width=256;c.height=512;
 const a=c.getContext('2d');
 const colors=['#b18a69','#94745c','#9b8370','#b8a58b','#827365'];
 const plaster=a.createLinearGradient(0,0,256,512);
 plaster.addColorStop(0,colors[seed%colors.length]);
 plaster.addColorStop(1,['#735b4d','#625246','#6b5c50','#807469','#594d48'][seed%5]);
 a.fillStyle=plaster;a.fillRect(0,0,256,512);
 // Fine mineral grain and chipped paint are baked once, not generated during animation.
 for(let k=0;k<1550;k++){
  const px=(k*73+seed*19)%256,py=(k*137+seed*31)%512;
  a.fillStyle=k%3===0?'rgba(38,29,24,.11)':'rgba(255,235,197,.075)';
  a.fillRect(px,py,1+(k%3),1+(k%2));
 }
 // Rain streaks and soot under ledges break up the flat toy-like wall finish.
 for(let k=0;k<65;k++){
  const x=(k*53+seed*37)%256,y=(k*89+seed*13)%440;
  a.fillStyle='rgba(29,27,26,.065)';
  a.fillRect(x,y,1+(k%2),16+(k%7)*7);
 }
 // Layer irregular mineral deposits, chipped plaster and fine hairline cracks into the
 // existing eight facade albedo canvases. Deterministic, baked at startup: no new
 // materials, textures, meshes, draw calls, lights or per-frame work.
 for(let patch=0;patch<12;patch++){
  const cx=(seed*41+patch*79+23)%256,cy=(seed*29+patch*97+51)%512;
  const rx=10+(patch*7)%22,ry=7+(patch*11)%26;
  a.beginPath();
  for(let edge=0;edge<11;edge++){
   const angle=edge*Math.PI*2/11;
   const wobble=.72+((patch*13+edge*17+seed*7)%13)/25;
   const px=cx+Math.cos(angle)*rx*wobble;
   const py=cy+Math.sin(angle)*ry*wobble;
   if(edge===0)a.moveTo(px,py);else a.lineTo(px,py);
  }
  a.closePath();
  a.fillStyle=patch%3===0?'rgba(39,38,35,.17)':patch%3===1?'rgba(228,211,179,.19)':'rgba(100,83,70,.19)';
  a.fill();
  a.strokeStyle=patch%3===1?'rgba(244,225,193,.24)':'rgba(45,40,36,.18)';
  a.lineWidth=1.1;a.stroke();
 }
 // Thin branching cracks are irregular and low contrast, not geometric block outlines.
 for(let crack=0;crack<11;crack++){
  let x=(seed*53+crack*67+15)%256,y=(seed*17+crack*91+34)%490;
  a.beginPath();a.moveTo(x,y);
  for(let step=0;step<5;step++){
   x+=((crack*5+step*7+seed)%9)-4;
   y+=4+((crack*3+step*11)%8);
   a.lineTo(x,y);
  }
  a.strokeStyle='rgba(37,34,32,.24)';a.lineWidth=.8;a.stroke();
 }
 // Dark capillary stains trail down beneath the old shophouse window sills.
 for(let floor=0;floor<4;floor++)for(let col=0;col<2;col++){
  const x=37+col*115+((floor*11+seed*7)%41),y=26+floor*112+86;
  const stain=a.createLinearGradient(x,y,x,y+33);
  stain.addColorStop(0,'rgba(35,39,36,.24)');
  stain.addColorStop(1,'rgba(35,39,36,0)');
  a.fillStyle=stain;
  a.fillRect(x,y,2+(seed+floor+col)%3,33);
 }
 for(let floor=0;floor<4;floor++){
  const y=26+floor*112;
  a.fillStyle='rgba(32,25,22,.15)';a.fillRect(0,y+89,256,7);
  a.fillStyle='rgba(242,213,176,.26)';a.fillRect(0,y+97,256,2);
  for(let col=0;col<2;col++){
   const x=28+col*115;
   a.fillStyle='rgba(24,22,24,.3)';a.fillRect(x-8,y-8,98,93);
   a.fillStyle='#c8b39b';a.fillRect(x-5,y-5,91,88);
   a.fillStyle='#242a32';a.fillRect(x,y,81,77);
   const lit=(floor+col+seed)%3===0;
   a.fillStyle=lit?'#765d42':'#29353c';a.fillRect(x+5,y+5,71,66);
   if(lit){
    const glow=a.createLinearGradient(x+6,y,x+70,y);
    glow.addColorStop(0,'rgba(255,205,107,.6)');
    glow.addColorStop(1,'rgba(239,158,79,.08)');
    a.fillStyle=glow;a.fillRect(x+8,y+8,60,61);
   }else{
    a.fillStyle='rgba(151,186,190,.14)';a.fillRect(x+10,y+8,9,56);
   }
   a.fillStyle='rgba(214,198,169,.78)';a.fillRect(x+38,y,5,77);a.fillRect(x,y+37,81,4);
   // Weathered upper-floor sunshade and partially closed timber shutters.
   // Baked into the existing shared facade atlas, no new draw calls.
   a.fillStyle='rgba(16,20,22,.55)';a.fillRect(x-12,y-13,106,8);
   a.fillStyle='rgba(85,65,51,.95)';a.fillRect(x-12,y-16,106,5);
   a.fillStyle='rgba(208,174,132,.42)';a.fillRect(x-11,y-16,104,1);
   if((seed+floor+col)%2===0){
    const shutterX=col===0?x+2:x+59;
    a.fillStyle='rgba(29,29,28,.72)';a.fillRect(shutterX,y+3,20,72);
    a.fillStyle='#665748';a.fillRect(shutterX+2,y+3,17,70);
    for(let slat=0;slat<10;slat++){
     const sy=y+8+slat*6;
     a.fillStyle='rgba(17,23,25,.54)';a.fillRect(shutterX+3,sy,15,2);
     a.fillStyle='rgba(192,164,127,.35)';a.fillRect(shutterX+3,sy-1,15,1);
    }
   }
   a.fillStyle='rgba(28,25,25,.28)';a.fillRect(x-9,y+83,100,5);
   a.fillStyle='rgba(238,222,194,.6)';a.fillRect(x-10,y+82,101,2);
  }
 }
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=2;
 return new THREE.MeshStandardMaterial({map:t,roughness:.91,metalness:0});
}
const facadeMaterials=Array.from({length:8},(_,i)=>facadeMaterial(i));

// Four shared PBR glass variants, baked once for all scrolling Yaowarat shophouses.
// Lit rooms, reflected sky and rain streaks replace flat opaque blue/yellow windows.
function makeShopWindowMaterial(variant){
 const c=document.createElement('canvas');c.width=128;c.height=128;
 const p=c.getContext('2d'),lit=variant<2;
 const glass=p.createLinearGradient(0,0,128,128);
 glass.addColorStop(0,lit?'#8c745d':'#3b5b68');
 glass.addColorStop(.48,lit?'#453c39':'#182f3b');
 glass.addColorStop(1,lit?'#1b2830':'#101d2a');
 p.fillStyle=glass;p.fillRect(0,0,128,128);
 if(lit){
  const room=p.createRadialGradient(61,55,4,61,60,82);
  room.addColorStop(0,'rgba(255,197,116,.75)');
  room.addColorStop(.65,'rgba(206,115,55,.24)');
  room.addColorStop(1,'rgba(35,31,31,0)');
  p.fillStyle=room;p.fillRect(0,0,128,128);
  p.fillStyle='rgba(39,29,31,.74)';p.fillRect(variant===0?8:100,4,20,124);
  p.fillStyle='rgba(18,22,28,.54)';p.fillRect(48,70,35,58);
  p.fillStyle='rgba(240,197,133,.18)';p.fillRect(28,12,4,106);
 }else{
  p.fillStyle='rgba(115,171,187,.12)';p.fillRect(variant===2?13:88,6,18,115);
  p.fillStyle='rgba(8,17,27,.44)';p.fillRect(6,91,116,31);
 }
 p.save();p.transform(1,0,-.32,1,22,0);
 const sheen=p.createLinearGradient(18,0,53,0);
 sheen.addColorStop(0,'rgba(181,222,226,0)');
 sheen.addColorStop(.48,'rgba(189,224,225,.26)');
 sheen.addColorStop(1,'rgba(189,224,225,0)');
 p.fillStyle=sheen;p.fillRect(18,0,35,128);p.restore();
 for(let k=0;k<18;k++){
  const x=(k*43+variant*17)%128,y=(k*29+variant*11)%110;
  p.fillStyle=k%3===0?'rgba(209,224,224,.09)':'rgba(15,23,28,.12)';
  p.fillRect(x,y,1,8+(k%5)*5);
 }
 p.fillStyle='rgba(16,19,23,.33)';p.fillRect(0,115,128,13);
 // Baked, slender steel mullions, rubber seals and sill grime make each window
 // read as recessed old Bangkok glazing, with no extra geometry or draw calls.
 p.fillStyle='rgba(4,12,17,.82)';p.fillRect(61,3,6,119);p.fillRect(3,66,122,6);
 p.fillStyle='rgba(110,129,130,.68)';p.fillRect(63,4,2,116);p.fillRect(4,68,120,2);
 p.strokeStyle='rgba(9,19,22,.85)';p.lineWidth=5;p.strokeRect(3,3,122,122);
 p.strokeStyle='rgba(113,124,121,.62)';p.lineWidth=2;p.strokeRect(7,7,114,114);
 // Dust collects below the crossbar and in the lower corners after rain.
 const sillDirt=p.createLinearGradient(0,96,0,128);
 sillDirt.addColorStop(0,'rgba(28,27,24,0)');
 sillDirt.addColorStop(1,'rgba(29,25,21,.46)');
 p.fillStyle=sillDirt;p.fillRect(8,96,112,32);
 for(let k=0;k<10;k++){
  const x=12+(k*31+variant*7)%104,y=74+(k*17)%44;
  p.fillStyle=k%3===0?'rgba(173,170,143,.18)':'rgba(10,20,21,.19)';
  p.fillRect(x,y,1+(k%2),4+(k%6)*3);
 }
 const texture=new THREE.CanvasTexture(c);
 texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=2;
 return new THREE.MeshStandardMaterial({
  map:texture,metalness:.12,roughness:lit?.33:.2,
  emissive:lit?0x5c2c12:0x0b1722,emissiveIntensity:lit?.3:.08
 });
}
const shopWindowMaterials=Array.from({length:4},(_,i)=>makeShopWindowMaterial(i));
// Shared bilingual Yaowarat enamel shop signs: baked lettering and grime, zero per-frame work.
function streetSignMaterial(cn,th,bg='#6d080c'){
 const c=document.createElement('canvas');c.width=512;c.height=256;
 const a=c.getContext('2d');
 const enamel=a.createLinearGradient(0,0,0,256);
 enamel.addColorStop(0,'#421016');enamel.addColorStop(.48,bg);enamel.addColorStop(1,'#24090c');
 a.fillStyle=enamel;a.fillRect(0,0,512,256);
 // Fine weathered enamel scratches and brass trim, all baked into the existing texture.
 for(let k=0;k<30;k++){a.fillStyle='rgba(240,204,151,.035)';a.fillRect(15,(k*47)%240,482,1)}
 a.strokeStyle='#ad8341';a.lineWidth=7;a.strokeRect(8,8,496,240);
 a.strokeStyle='rgba(255,222,150,.4)';a.lineWidth=2;a.strokeRect(17,17,478,222);
 for(const x of [25,487])for(const y of [26,230]){a.beginPath();a.arc(x,y,4,0,Math.PI*2);a.fillStyle='#c2a16b';a.fill()}
 a.textAlign='center';a.textBaseline='middle';
 a.shadowColor='rgba(255,177,76,.6)';a.shadowBlur=6;
 a.fillStyle='#f2c16d';a.font='700 84px "PingFang SC","Noto Sans CJK SC",sans-serif';
 a.fillText(cn,256,96,452);
 a.shadowBlur=0;a.fillStyle='rgba(237,201,144,.7)';a.fillRect(90,150,332,2);
 a.fillStyle='#f2e2c3';a.font='600 37px "Thonburi","Noto Sans Thai",sans-serif';
 a.fillText(th,256,193,450);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
 // Weathered enamel reacts to street lighting while subtle self-illumination keeps lettering visible at night.
 // Reuses the existing atlas: no new textures, lights, meshes or draw calls.
 return new THREE.MeshStandardMaterial({map:t,emissiveMap:t,emissive:0x242020,roughness:.48,metalness:.18,side:THREE.DoubleSide});
}
const shopSignMaterials=[
 ['金龍海鮮','ภัตตาคารมังกรทอง'],
 ['海鮮酒樓','อาหารทะเลสด'],
 ['中華飯店','ภัตตาคารจีน'],
 ['永安藥房','ร้านขายยา'],
 ['大金行','ห้างทองเยาวราช']
].map(([cn,th])=>{const material=streetSignMaterial(cn,th);material.side=THREE.DoubleSide;return material;});
const oldGold=new THREE.MeshStandardMaterial({color:0xb68a40,metalness:.68,roughness:.38}),warmNeon=new THREE.MeshBasicMaterial({color:0xffb84e}),redNeon=new THREE.MeshBasicMaterial({color:0xf02032}),glassDark=new THREE.MeshStandardMaterial({color:0x273c44,metalness:.3,roughness:.2}),brickTrim=new THREE.MeshLambertMaterial({color:0x4c3934});
// The shared PBR road surface stays exposed: no opaque Lambert overlay or extra asphalt canvas.
// Baked neon-tube signage: one 192x512 canvas per existing sign, no new meshes or runtime lights.
const neonBladePalettes=[
 {halo:'#ff3821',outer:'rgba(255,52,32,.5)',tube:'#ff863b',core:'#ffe9a1',trim:'rgba(255,183,92,.46)',wash:'rgba(255,102,56,.22)',rim:'rgba(255,96,37,.12)'},
 {halo:'#ffae23',outer:'rgba(255,167,43,.52)',tube:'#ffca57',core:'#fff0b9',trim:'rgba(255,206,113,.55)',wash:'rgba(255,177,57,.18)',rim:'rgba(255,169,43,.12)'},
 {halo:'#00d5c5',outer:'rgba(23,212,199,.52)',tube:'#53f0dd',core:'#d8fff3',trim:'rgba(95,229,213,.46)',wash:'rgba(19,161,161,.2)',rim:'rgba(16,178,168,.13)'},
 {halo:'#fa3f9e',outer:'rgba(242,56,145,.5)',tube:'#ff80bd',core:'#ffe0ef',trim:'rgba(242,121,179,.46)',wash:'rgba(189,52,117,.19)',rim:'rgba(173,40,100,.13)'}
];
function neonBlade(text,paletteIndex=0,thaiLabel='เยาวราช'){
 const palette=neonBladePalettes[paletteIndex%neonBladePalettes.length];
 const c=document.createElement('canvas');c.width=192;c.height=512;
 const a=c.getContext('2d');
 const panel=a.createLinearGradient(0,0,192,0);
 panel.addColorStop(0,'#180c13');panel.addColorStop(.12,'#40121a');
 panel.addColorStop(.52,'#29090e');panel.addColorStop(.88,'#40111b');
 panel.addColorStop(1,'#120c13');
 a.fillStyle=panel;a.fillRect(0,0,192,512);
 // A metal lightbox, inset neon channel and slightly uneven old enamel.
 a.fillStyle='#0a1119';a.fillRect(3,3,186,506);
 a.fillStyle='#42141b';a.fillRect(12,12,168,488);
 const inset=a.createLinearGradient(12,0,180,0);
 inset.addColorStop(0,palette.wash);
 inset.addColorStop(.35,'rgba(25,5,12,0)');
 inset.addColorStop(1,palette.rim);
 a.fillStyle=inset;a.fillRect(12,12,168,488);
 for(let k=0;k<24;k++){
  const x=15+(k*53)%159,y=17+(k*79)%475;
  a.fillStyle=k%3===0?'rgba(236,153,91,.1)':'rgba(9,8,11,.3)';
  a.fillRect(x,y,1+(k%3),3+(k%13));
 }
 a.lineJoin='round';
 a.strokeStyle='#77523d';a.lineWidth=5;a.strokeRect(9,9,174,494);
 a.strokeStyle=palette.trim;a.lineWidth=2;a.strokeRect(16,16,160,480);
 for(const y of [21,491])for(const x of [21,171]){
  a.beginPath();a.arc(x,y,4,0,Math.PI*2);a.fillStyle='#9b7861';a.fill();
  a.fillStyle='#302b2b';a.fillRect(x-2,y,4,1);
 }
 a.textAlign='center';a.textBaseline='middle';
 a.font='bold 65px "PingFang TC","Noto Sans CJK TC",sans-serif';
 const glyphs=[...text].slice(0,4);
 for(let i=0;i<glyphs.length;i++){
  const x=96,y=78+i*112;
  // Baked outer bloom and tube core: glow without a costly dynamic light.
  a.save();a.shadowColor=palette.halo;a.shadowBlur=22;
  a.strokeStyle=palette.outer;a.lineWidth=11;
  a.strokeText(glyphs[i],x,y,152);
  a.shadowColor=palette.tube;a.shadowBlur=13;
  a.strokeStyle=palette.tube;a.lineWidth=5;
  a.strokeText(glyphs[i],x,y,152);
  a.shadowBlur=4;a.strokeStyle=palette.core;a.lineWidth=2.2;
  a.strokeText(glyphs[i],x,y,152);
  a.fillStyle=palette.core;a.fillText(glyphs[i],x,y,152);
  a.restore();
 }
 // Exposed tube supports and old electrical conduit are painted, not extra geometry.
 a.strokeStyle='rgba(105,90,78,.8)';a.lineWidth=2;
 a.beginPath();a.moveTo(169,30);a.lineTo(169,477);a.stroke();
 for(const y of [125,237,349,461]){
  a.fillStyle='#8b7771';a.fillRect(164,y,9,3);
 }
 // Bilingual Thai shop-name inset, baked into the existing vertical neon atlas.
 // The fourth Chinese glyph ends above this panel; no added meshes, lights or textures.
 a.fillStyle='rgba(8,11,17,.95)';a.fillRect(21,449,150,40);
 a.strokeStyle=palette.trim;a.lineWidth=1.5;a.strokeRect(22,449,148,39);
 a.font='600 25px "Thonburi","Noto Sans Thai",sans-serif';
 a.textAlign='center';a.textBaseline='middle';
 a.shadowColor=palette.halo;a.shadowBlur=5;
 a.fillStyle=palette.core;a.fillText(thaiLabel,96,469,140);
 a.shadowBlur=0;
 const t=new THREE.CanvasTexture(c);
 t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=2;
 return new THREE.MeshBasicMaterial({map:t,side:THREE.DoubleSide});
}
const neonBladeMaterials=[
 ['金龍海鮮','ซีฟู้ดมังกรทอง'],['中國城','ไชน่าทาวน์'],
 ['百年老店','ร้านเก่าแก่'],['永安藥房','ร้านขายยา'],
 ['大金行','ห้างทอง'],['潮州飯店','อาหารแต้จิ๋ว'],
 ['大華金行','ร้านทอง'],['廣東燒味','เป็ดย่าง']
].map(([label,thai],i)=>neonBlade(label,i%neonBladePalettes.length,thai));
// Yaowarat facade detail: one shared baked AC grille for all scrolling buildings.
// Fan, stamped louvers, grime and rust live in a 128px PBR texture, not extra meshes.
const yaowaratACCanvas=document.createElement('canvas');
yaowaratACCanvas.width=yaowaratACCanvas.height=128;
const yaowaratACPaint=yaowaratACCanvas.getContext('2d');
const acMetal=yaowaratACPaint.createLinearGradient(0,0,128,128);
acMetal.addColorStop(0,'#9ca9ac');acMetal.addColorStop(.55,'#5d6a70');acMetal.addColorStop(1,'#29373d');
yaowaratACPaint.fillStyle=acMetal;yaowaratACPaint.fillRect(0,0,128,128);
yaowaratACPaint.fillStyle='#222e33';yaowaratACPaint.fillRect(7,8,114,112);
for(let y=13;y<119;y+=8){
 yaowaratACPaint.fillStyle='#839094';yaowaratACPaint.fillRect(11,y,106,2);
 yaowaratACPaint.fillStyle='#121e23';yaowaratACPaint.fillRect(11,y+2,106,4);
}
yaowaratACPaint.fillStyle='#17272d';yaowaratACPaint.beginPath();yaowaratACPaint.arc(64,65,35,0,Math.PI*2);yaowaratACPaint.fill();
yaowaratACPaint.strokeStyle='#b0bab9';yaowaratACPaint.lineWidth=3;
for(let ring=13;ring<=34;ring+=10){yaowaratACPaint.beginPath();yaowaratACPaint.arc(64,65,ring,0,Math.PI*2);yaowaratACPaint.stroke();}
for(let spoke=0;spoke<8;spoke++){
 const a=spoke*Math.PI/4;
 yaowaratACPaint.beginPath();yaowaratACPaint.moveTo(64,65);
 yaowaratACPaint.lineTo(64+34*Math.cos(a),65+34*Math.sin(a));yaowaratACPaint.stroke();
}
yaowaratACPaint.fillStyle='#d1d4cd';yaowaratACPaint.fillRect(61,62,6,6);
for(let k=0;k<12;k++){
 const x=10+(k*37)%109,y=8+(k*23)%113;
 yaowaratACPaint.fillStyle=k%3===0?'rgba(139,70,35,.4)':'rgba(16,28,29,.25)';
 yaowaratACPaint.fillRect(x,y,2+(k%3),6+(k%9));
}
yaowaratACPaint.strokeStyle='#c2c9c4';yaowaratACPaint.lineWidth=4;
yaowaratACPaint.strokeRect(3,3,122,122);
const yaowaratACTexture=new THREE.CanvasTexture(yaowaratACCanvas);
yaowaratACTexture.colorSpace=THREE.SRGBColorSpace;yaowaratACTexture.anisotropy=2;
const yaowaratACBody=new THREE.MeshStandardMaterial({color:0xb8c2c1,metalness:.32,roughness:.74});
const yaowaratACGrille=new THREE.MeshStandardMaterial({map:yaowaratACTexture,metalness:.26,roughness:.78});
const yaowaratRainPipe=new THREE.MeshStandardMaterial({color:0x566368,metalness:.5,roughness:.72});

// Weathered powder-coated steel replaces bright cream balcony bars.
// Seven identical rail uprights are batched into one InstancedMesh per balcony.
const yaowaratBalconySteel=new THREE.MeshStandardMaterial({color:0x687277,metalness:.58,roughness:.67});
const yaowaratBalconyBarGeometry=new THREE.BoxGeometry(.055,.68,.07);
const yaowaratBalconyBarMatrix=new THREE.Matrix4();
// Distant Yaowarat shophouses use three shared baked PBR facade atlases.
 // Close buildings keep every balcony, shutter, AC unit and neon sign; distant
 // buildings retain their solid silhouettes and one richly detailed facade.
 // This reduces hundreds of off-screen/fogged draw calls on mobile without
 // changing street geometry, spawn logic, collision or steering.
const yaowaratDistantFacadeGeometry=new THREE.PlaneGeometry(4.05,1);
const yaowaratDistantFacades=Array.from({length:3},(_,variant)=>{
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=512;
 const ctx=canvas.getContext('2d'),base=['#8b7568','#756e71','#9b8771'][variant];
 ctx.fillStyle=base;ctx.fillRect(0,0,256,512);
 // Weathered plaster, rain streaks and uneven window recesses.
 for(let i=0;i<280;i++){
  const x=(i*83+variant*47)%256,y=(i*113+variant*29)%512;
  ctx.fillStyle=i%3===0?'rgba(21,24,29,.13)':'rgba(236,218,183,.11)';
  ctx.fillRect(x,y,1+i%3,4+i%29);
 }
 for(const level of [66,184]){
  ctx.fillStyle='#4c4a46';ctx.fillRect(0,level+102,256,7);
  for(const x of [29,139]){
   ctx.fillStyle='#343b3e';ctx.fillRect(x-5,level-5,94,101);
   const glow=ctx.createLinearGradient(x,level,x+85,level+90);
   glow.addColorStop(0,'#334b51');glow.addColorStop(.6,'#1d3038');
   glow.addColorStop(1,variant===1?'#766046':'#3c4240');
   ctx.fillStyle=glow;ctx.fillRect(x,level,84,91);
   ctx.fillStyle='rgba(198,216,213,.19)';
   ctx.beginPath();ctx.moveTo(x+8,level+3);ctx.lineTo(x+21,level+3);
   ctx.lineTo(x+58,level+90);ctx.lineTo(x+48,level+90);ctx.fill();
   ctx.fillStyle='#777b74';ctx.fillRect(x+40,level,4,91);
   ctx.fillRect(x,level+43,84,3);
  }
  ctx.fillStyle='#343d40';ctx.fillRect(10,level+88,236,7);
  for(let bar=0;bar<17;bar++)ctx.fillRect(12+bar*14,level+65,3,27);
 }
 // Street-level storefront with recessed display and aged enamel sign.
 ctx.fillStyle='#262d30';ctx.fillRect(13,336,230,157);
 const interior=ctx.createLinearGradient(0,345,0,493);
 interior.addColorStop(0,'#7e6651');interior.addColorStop(.35,'#35434a');
 interior.addColorStop(1,'#131d22');
 ctx.fillStyle=interior;ctx.fillRect(20,351,216,132);
 for(let row=0;row<3;row++){
  const y=386+row*31;
  ctx.fillStyle='#141d21';ctx.fillRect(24,y+17,208,5);
  for(let col=0;col<10;col++){
   ctx.fillStyle=['#a3875d','#69776c','#806b58'][(col+row+variant)%3];
   ctx.fillRect(28+col*20,y-3-(col%3)*5,13,18+(col%3)*5);
  }
 }
 ctx.fillStyle=['#8d3535','#265c56','#735334'][variant];
 ctx.fillRect(8,314,240,33);
 ctx.fillStyle='#f5dfaf';ctx.font='bold 21px sans-serif';
 ctx.textAlign='center';ctx.fillText(['ร้านทอง เยาวราช','อาหารจีน เยาวราช','ตลาดเก่า กรุงเทพ'][variant],128,338,228);
 ctx.fillStyle='rgba(10,13,17,.36)';ctx.fillRect(8,347,240,5);
 // Fabric awning stripe and its shaded hem.
 for(let panel=0;panel<12;panel++){
  ctx.fillStyle=panel%2?'#cfb89a':['#783b42','#366d67','#8e643e'][variant];
  ctx.fillRect(panel*22,354,22,18);
 }
 ctx.fillStyle='rgba(15,17,20,.32)';ctx.fillRect(0,371,256,5);
 const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
 map.anisotropy=mobile?1:2;
 return new THREE.MeshStandardMaterial({map,metalness:.04,roughness:.88,side:THREE.DoubleSide});
});
function building(x,z,i){
 const g=new THREE.Group(),h=7.9+(i%7)*1.1,paint=facadeMaterials[i%facadeMaterials.length];
 g.add(cube(3.9,h,5,paint,0,h/2,0));for(const edge of [-1,1])g.add(cube(.16,h,5.15,brickTrim,edge*1.94,h/2,0));for(let fy=3.1;fy<h;fy+=2.6)g.add(cube(4.05,.14,5.15,oldGold,0,fy,0));
 g.add(cube(4.15,.22,5.2,shopTrim,0,h+.08,0));if(i%4===0)g.add(cube(3.6,.75,.32,paint,0,h+.47,0));else if(i%4===1)g.add(cube(1.6,1.15,2.4,paint,-.85,h+.65,-.8));else if(i%4===2)for(const edge of [-1.65,1.65])g.add(cube(.12,.8,4.5,oldGold,edge,h+.52,0));g.add(cube(4.05,.17,5.05,M.purple,0,.22,0));
 // Facade faces the road, with ground floor shutter and striped awning.
 const front=x<0?2.56:-2.56;
 // Reuse the existing frontage mesh; 25% shuttered shops, 75% glazed displays.
 const closedShop=i%4===0;
 g.add(cube(2.6,2.0,.09,closedShop?shopfrontMaterials.shutter:shopfrontMaterials.glass,0,1.18,front));
 if(closedShop){
  // Reuse the former three trim meshes for actual shutter hardware:
  // two recessed steel guide channels and one bottom locking rail.
  const shutterFace=front+(x<0?.065:-.065);
  for(const edge of [-1,1])g.add(cube(.085,2.04,.16,yaowaratAwningRibMetal,edge*1.28,1.18,shutterFace));
  g.add(cube(2.53,.095,.16,yaowaratAwningRibMetal,0,.22,shutterFace));
 }else{
  // Three frame pieces replace three shutter strips; no extra storefront draw calls.
  g.add(cube(.055,2.03,.13,oldGold,0,1.18,front+(x<0?.06:-.06)));
  for(const y of [.2,2.16])g.add(cube(2.58,.06,.13,oldGold,0,y,front+(x<0?.06:-.06)));
 }
 const canopy=cube(3.8,.12,1.0,awningColors[i%3],0,2.45,front+(x<0?.48:-.48));g.add(canopy);
  // Five slim, weathered metal awning ribs replace oversized toy-like cream blocks.
  // Shared geometry and one instanced draw call per storefront (previously five).
  const awningRibs=new THREE.InstancedMesh(yaowaratAwningRibGeometry,yaowaratAwningRibMetal,5);
  for(let rib=0;rib<5;rib++){
   yaowaratAwningRibMatrix.makeTranslation((rib-2)*.68,2.47,front+(x<0?.49:-.49));
   awningRibs.setMatrixAt(rib,yaowaratAwningRibMatrix);
  }
  awningRibs.instanceMatrix.needsUpdate=true;
  awningRibs.computeBoundingSphere();
  g.add(awningRibs);
 for(let floor=0;floor<2;floor++)for(let j=0;j<2;j++){
 const wy=3.65+floor*1.4;if(wy>h-.6)continue;
 // Dark recessed reveal and narrow weathered steel frame, using existing meshes.
 g.add(cube(.95,.96,.075,glassDark,j===0?-.85:.85,wy,front));g.add(cube(.83,.85,.09,shopWindowMaterials[(i+floor*2+j)%4],j===0?-.85:.85,wy,front+(x<0?.035:-.035)));
 g.add(cube(.9,.08,.12,yaowaratBalconySteel,j===0?-.85:.85,wy+.46,front));
 g.add(cube(.08,.9,.13,yaowaratBalconySteel,j===0?-.85:.85,wy,front));
 }
 // Procedural 3D Yaowarat shophouse detail: recessed balconies, railings and AC units.
 // Geometry stays attached to each existing scrolling building (no new spawn logic).
 const roadDir=x<0?1:-1;
 const balconyMetal=yaowaratBalconySteel,balconyShade=shopShadow,acBody=yaowaratACBody,acVent=yaowaratACGrille;
 for(let floor=0;floor<2;floor++){
  const by=4.15+floor*2.6;
  if(by>h-.65)continue;
  g.add(cube(3.35,.13,.64,balconyShade,0,by-.64,front+roadDir*.35));
  g.add(cube(3.25,.075,.08,balconyMetal,0,by+.02,front+roadDir*.67));
  // Seven vertical bars share one geometry and one GPU draw call per balcony.
  const railBars=new THREE.InstancedMesh(yaowaratBalconyBarGeometry,balconyMetal,7);
  for(let bar=0;bar<7;bar++){
   yaowaratBalconyBarMatrix.makeTranslation((bar-3)*.49,by-.33,front+roadDir*.67);
   railBars.setMatrixAt(bar,yaowaratBalconyBarMatrix);
  }
  railBars.instanceMatrix.needsUpdate=true;
  railBars.computeBoundingSphere();
  g.add(railBars);
  if((i+floor)%3===0){
   g.add(cube(.68,.48,.31,acBody,1.35,by+.45,front+roadDir*.22));
   g.add(cube(.52,.32,.025,acVent,1.35,by+.45,front+roadDir*.4));
  }
 }
 if(i%3===0){
  // Side-mounted rain pipe and a projecting ground-floor shop light.
  g.add(cube(.075,h-.6,.075,yaowaratRainPipe,-1.78,h/2,front+roadDir*.11));
  g.add(cube(.46,.11,.4,shopTrim,-1.18,2.52,front+roadDir*.45));
  g.add(ball(.13,windowGlow,-1.18,2.38,front+roadDir*.47));
 }
 const sign=cube(2.7,.62,.12,signMaterials[i%3],0,2.94,front+(x<0?.07:-.07));g.add(sign);g.add(cube(2.85,.08,.19,M.gold,0,3.30,front+(x<0?.10:-.10)));g.userData.sign=sign;g.userData.signIndex=i;
 // Perpendicular, double-sided hanging shop sign: a real 3D silhouette above the
 // sidewalk instead of another flat facade decal. Reuse the bilingual sign atlas.
 // Only one in four buildings gets a projecting blade to bound mobile draw calls.
 if(i%4===1){
  // Thin solid enamel blade, not a paper-flat plane; reuses the bilingual sign material.
  const blade=new THREE.Mesh(new THREE.BoxGeometry(.88,1.38,.065),shopSignMaterials[i%shopSignMaterials.length]);
  blade.rotation.y=Math.PI/2;
  blade.position.set(roadDir*1.40,4.05,front+roadDir*.82);
  g.add(blade);
  // Short steel cantilever visually attaches the blade to the shophouse wall.
  g.add(cube(.055,.055,.88,yaowaratBalconySteel,roadDir*1.40,4.78,front+roadDir*.44));
 }
 // The existing bilingual enamel plaque carries readable lettering; omit toy-like block glyphs.
 if(i%2===0){g.add(cube(.13,.6,.13,M.gold,1.56,2.92,front));g.add(ball(.18,M.red,1.56,2.51,front))}
 if(i%3===0){g.add(cube(.14,1.7,.14,shopTrim,1.6,3.7,front));g.add(cube(.95,.12,.18,awningColors[i%3],1.1,4.45,front))}
 const plaque=new THREE.Mesh(new THREE.PlaneGeometry(2.65,1.05),shopSignMaterials[i%shopSignMaterials.length]);plaque.position.set(0,3.12,front+(x<0?.21:-.21));plaque.rotation.y=x<0?0:Math.PI;g.add(plaque);
if(i%2===0){const hanging=new THREE.Mesh(new THREE.PlaneGeometry(1.1,3.5),neonBladeMaterials[i%neonBladeMaterials.length]);hanging.position.set(x<0?1.75:-1.75,5.8,front+(x<0?-.8:.8));hanging.rotation.y=x<0?-.75:.75;g.add(hanging);g.add(cube(.09,.09,1.25,oldGold,x<0?1.75:-1.75,7.5,front));}
if(i%3===1){const grille=cube(2.9,2.1,.09,glassDark,0,1.17,front+(x<0?.12:-.12));g.add(grille);for(let q=-2;q<=2;q++)g.add(cube(.055,2.15,.13,oldGold,q*.52,1.17,front+(x<0?.2:-.2)))}if(i%3===0){const light=ball(.19,warmNeon,0,2.37,front+(x<0?.68:-.68));g.add(light)}if(i%5===0){const lantern=ball(.24,redNeon,0,2.15,front+(x<0?1.0:-1.0));g.add(lantern);g.add(cube(.06,.24,.06,oldGold,0,2.5,front+(x<0?1.0:-1.0)));}// A single LOD switch per building hides dozens of detailed meshes in fog.
 // Keep the first three shell/edge meshes and all near-field detail intact.
 const nearFacade=new THREE.Group();
 for(const child of g.children.slice(3))nearFacade.add(child);
 g.add(nearFacade);
 const distantFacade=new THREE.Mesh(yaowaratDistantFacadeGeometry,yaowaratDistantFacades[i%3]);
 distantFacade.scale.y=h;
 distantFacade.position.set(0,h/2,front+roadDir*.13);
 distantFacade.rotation.y=x<0?0:Math.PI;
 g.add(distantFacade);
 g.userData.facadeNear=nearFacade;
 g.userData.facadeFar=distantFacade;
 nearFacade.visible=z>-(mobile?54:78);
 distantFacade.visible=!nearFacade.visible;
 g.rotation.y=Math.PI/2;g.position.set(x,0,z);scene.add(g);props.push(g);if(i%3!==1&&!((x<0&&i===6)||(x>0&&i===23))){const blade=new THREE.Mesh(new THREE.PlaneGeometry(i%4===0?1.9:1.35,i%4===0?4.8:3.45),neonBladeMaterials[(i*3+(x>0?2:0))%neonBladeMaterials.length]);blade.position.set(x<0?-4.85:4.85,i%4===0?5.8:6.2,z+(i%4===0?1.8:-.7));blade.userData.neonReflectionAnchor=true;blade.userData.neonReflectionColorIndex=(i*3+(x>0?2:0))%neonBladePalettes.length;scene.add(blade);props.push(blade);}
}
for(let i=0;i<(mobile?31:34);i++){building(-8.4,-i*6.0+14,i);building(8.4,-i*6.0+14,i+2)}
// Align the existing ten rain-slick reflections with real scrolling neon shop signs.
// Anchor once at setup; no extra meshes, lights, textures or per-frame searches.
const reflectionSignAnchors=props.filter(p=>p.userData.neonReflectionAnchor);
for(let i=0;i<neonReflectionCount;i++){
 const side=i%2===0?-1:1,targetZ=-16-i*18;
 let nearest=null,nearestDistance=Infinity;
 for(const sign of reflectionSignAnchors){
  if(Math.sign(sign.position.x)!==side)continue;
  const distance=Math.abs(sign.position.z-targetZ);
  if(distance<nearestDistance){nearest=sign;nearestDistance=distance;}
 }
 neonReflectionAnchors[i]=nearest;
 const paletteIndex=nearest?nearest.userData.neonReflectionColorIndex:i%neonReflectionPalette.length;
 neonReflections.setColorAt(i,new THREE.Color(neonReflectionPalette[paletteIndex]));
}
if(neonReflections.instanceColor)neonReflections.instanceColor.needsUpdate=true;
// Updating ten instance matrices follows the already-scrolling signs with one GPU draw.
function updateYaowaratReflections(){
 for(let i=0;i<neonReflectionCount;i++){
  const anchor=neonReflectionAnchors[i];
  neonReflectionDummy.position.set(anchor?anchor.position.x*.84:(i%2===0?-4.1:4.1),
   .077,anchor?anchor.position.z+1.3:-16-i*18);
  neonReflectionDummy.rotation.set(-Math.PI/2,0,0);
  neonReflectionDummy.updateMatrix();
  neonReflections.setMatrixAt(i,neonReflectionDummy.matrix);
 }
 neonReflections.instanceMatrix.needsUpdate=true;
}
updateYaowaratReflections();

// Night-only neon glints on the front windscreens of passing Bangkok taxis.
// Reuse the existing Yaowarat reflection atlas and palette: one instanced
// draw call for all visible taxis, no new textures, dynamic lights or clones.
const taxiNeonGlints=new THREE.InstancedMesh(
 new THREE.PlaneGeometry(1.22,.36),
 new THREE.MeshBasicMaterial({
  map:neonReflectionTexture,transparent:true,opacity:.24,
  blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide
 }),6
);
taxiNeonGlints.visible=false;
taxiNeonGlints.frustumCulled=false;
taxiNeonGlints.renderOrder=2; // Draw after transparent taxi glass.
scene.add(taxiNeonGlints);
const taxiGlintDummy=new THREE.Object3D(),taxiGlintColor=new THREE.Color();
function updateTaxiNeonGlints(){
 if(districtIndex!==1){taxiNeonGlints.visible=false;return;}
 let count=0;
 for(const h of hazards){
  if(h.type!=='taxi'||count>=taxiNeonGlints.count)continue;
  let nearest=null,bestDistance=Infinity;
  for(const sign of reflectionSignAnchors){
   const distance=Math.abs(sign.position.z-h.g.position.z);
   if(distance<bestDistance){bestDistance=distance;nearest=sign;}
  }
  // The glint only appears when the taxi passes an actual neon shop sign.
  if(!nearest||bestDistance>=23)continue;
  const intensity=Math.max(.12,1-bestDistance/23);
  const heading=h.g.rotation.y;
  taxiGlintDummy.position.set(
   h.g.position.x+Math.sin(heading)*.87,
   h.g.position.y+1.51,
   h.g.position.z+Math.cos(heading)*.87
  );
  taxiGlintDummy.rotation.set(-.48,heading,0,'YXZ');
  taxiGlintDummy.scale.set(1.22,.36,1);
  taxiGlintDummy.updateMatrix();
  taxiNeonGlints.setMatrixAt(count,taxiGlintDummy.matrix);
  taxiGlintColor.setHex(neonReflectionPalette[nearest.userData.neonReflectionColorIndex]);
  taxiGlintColor.multiplyScalar(.32+.68*intensity);
  taxiNeonGlints.setColorAt(count,taxiGlintColor);
  count++;
 }
 // Hide unused instances rather than leaving stale glints floating on the road.
 for(let i=count;i<taxiNeonGlints.count;i++){
  taxiGlintDummy.position.set(0,-100,0);
  taxiGlintDummy.scale.set(.001,.001,.001);
  taxiGlintDummy.updateMatrix();
  taxiNeonGlints.setMatrixAt(i,taxiGlintDummy.matrix);
 }
 taxiNeonGlints.visible=count>0;
 if(count){taxiNeonGlints.instanceMatrix.needsUpdate=true;if(taxiNeonGlints.instanceColor)taxiNeonGlints.instanceColor.needsUpdate=true;}
}

// Dynamic, localized neon glints on the painted SIDE PANELS of Bangkok traffic tuk-tuks.
// Share the existing Yaowarat reflection atlas: one instanced draw call, no new texture or light.
// Skip optional GLBs with unknown geometry; their native PBR materials remain intact.
const tukNeonGlints=new THREE.InstancedMesh(
 new THREE.PlaneGeometry(.78,.31),
 new THREE.MeshBasicMaterial({
  map:neonReflectionTexture,transparent:true,opacity:.21,
  blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide
 }),6
);
tukNeonGlints.visible=false;
tukNeonGlints.frustumCulled=false;
tukNeonGlints.renderOrder=2;
scene.add(tukNeonGlints);
const tukGlintDummy=new THREE.Object3D(),tukGlintColor=new THREE.Color();
function updateTukNeonGlints(){
 if(districtIndex!==1){tukNeonGlints.visible=false;return;}
 let count=0;
 for(const h of hazards){
  if(h.type!=='tuktuk'||h.g.userData.detailedTukTuk||count>=tukNeonGlints.count)continue;
  let nearest=null,bestDistance=Infinity;
  for(const sign of reflectionSignAnchors){
   const distance=Math.abs(sign.position.z-h.g.position.z);
   if(distance<bestDistance){bestDistance=distance;nearest=sign;}
  }
  if(!nearest||bestDistance>=22)continue;
  const side=nearest.position.x>0?1:-1;
  const heading=h.g.rotation.y,scale=h.g.scale.x;
  const localX=side*.83*scale,localZ=.17*scale;
  tukGlintDummy.position.set(
   h.g.position.x+Math.cos(heading)*localX+Math.sin(heading)*localZ,
   h.g.position.y+1.04*scale,
   h.g.position.z-Math.sin(heading)*localX+Math.cos(heading)*localZ
  );
  tukGlintDummy.rotation.set(0,heading+side*Math.PI/2,0);
  tukGlintDummy.scale.setScalar(scale);
  tukGlintDummy.updateMatrix();
  tukNeonGlints.setMatrixAt(count,tukGlintDummy.matrix);
  tukGlintColor.setHex(neonReflectionPalette[nearest.userData.neonReflectionColorIndex]);
  tukGlintColor.multiplyScalar(.25+.75*(1-bestDistance/22));
  tukNeonGlints.setColorAt(count,tukGlintColor);
  count++;
 }
 // Collapse unused slots to prevent stale reflections from recycled hazards.
 for(let i=count;i<tukNeonGlints.count;i++){
  tukGlintDummy.position.set(0,-100,0);
  tukGlintDummy.scale.set(.001,.001,.001);
  tukGlintDummy.updateMatrix();
  tukNeonGlints.setMatrixAt(i,tukGlintDummy.matrix);
 }
 tukNeonGlints.visible=count>0;
 if(count){
  tukNeonGlints.instanceMatrix.needsUpdate=true;
  if(tukNeonGlints.instanceColor)tukNeonGlints.instanceColor.needsUpdate=true;
 }
}

// Baked, colored neon bounce on the Yaowarat shophouse facades.
// One instanced draw call follows the existing neon sign anchors as buildings scroll.
// The wash sits just in front of the x=+/-5.84 storefront plane, behind the
// projecting signs; its feathered alpha avoids hard-edged glowing rectangles.
const facadeBounceCanvas=document.createElement('canvas');
facadeBounceCanvas.width=128;facadeBounceCanvas.height=256;
const facadeBounceCtx=facadeBounceCanvas.getContext('2d');
const facadeBounceGradient=facadeBounceCtx.createRadialGradient(64,125,6,64,125,120);
facadeBounceGradient.addColorStop(0,'rgba(255,255,255,.52)');
facadeBounceGradient.addColorStop(.32,'rgba(255,255,255,.29)');
facadeBounceGradient.addColorStop(.72,'rgba(255,255,255,.07)');
facadeBounceGradient.addColorStop(1,'rgba(255,255,255,0)');
facadeBounceCtx.fillStyle=facadeBounceGradient;
facadeBounceCtx.fillRect(0,0,128,256);
// The radial mask is elliptical after the 3m x 3.6m plane transform;
// soften horizontal edges further to prevent seams between shopfronts.
const facadeBounceEdge=facadeBounceCtx.createLinearGradient(0,0,128,0);
facadeBounceEdge.addColorStop(0,'rgba(255,255,255,0)');
facadeBounceEdge.addColorStop(.22,'rgba(255,255,255,1)');
facadeBounceEdge.addColorStop(.78,'rgba(255,255,255,1)');
facadeBounceEdge.addColorStop(1,'rgba(255,255,255,0)');
facadeBounceCtx.globalCompositeOperation='destination-in';
facadeBounceCtx.fillStyle=facadeBounceEdge;
facadeBounceCtx.fillRect(0,0,128,256);
facadeBounceCtx.globalCompositeOperation='source-over';
const facadeBounceTexture=new THREE.CanvasTexture(facadeBounceCanvas);
const facadeBounceMaterial=new THREE.MeshBasicMaterial({
 map:facadeBounceTexture,color:0xffffff,transparent:true,opacity:.22,
 blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide
});
const facadeBounce=new THREE.InstancedMesh(
 new THREE.PlaneGeometry(3.0,3.6),facadeBounceMaterial,neonReflectionCount
);
facadeBounce.frustumCulled=false;
scene.add(facadeBounce);
const facadeBounceDummy=new THREE.Object3D();
for(let i=0;i<neonReflectionCount;i++){
 const anchor=neonReflectionAnchors[i];
 const paletteIndex=anchor?anchor.userData.neonReflectionColorIndex:i%neonReflectionPalette.length;
 facadeBounce.setColorAt(i,new THREE.Color(neonReflectionPalette[paletteIndex]));
}
if(facadeBounce.instanceColor)facadeBounce.instanceColor.needsUpdate=true;
function updateYaowaratFacadeBounce(){
 for(let i=0;i<neonReflectionCount;i++){
  const anchor=neonReflectionAnchors[i];
  const side=anchor?Math.sign(anchor.position.x):(i%2===0?-1:1);
  facadeBounceDummy.position.set(side*5.73,4.9,anchor?anchor.position.z:-16-i*18);
  facadeBounceDummy.rotation.set(0,side<0?Math.PI/2:-Math.PI/2,0);
  facadeBounceDummy.updateMatrix();
  facadeBounce.setMatrixAt(i,facadeBounceDummy.matrix);
 }
 facadeBounce.instanceMatrix.needsUpdate=true;
}
updateYaowaratFacadeBounce();

// Feathered shop-light spill: one baked alpha texture, two reused planes, no dynamic lights.
const neonGlowCanvas=document.createElement('canvas');neonGlowCanvas.width=64;neonGlowCanvas.height=256;
const neonGlowCtx=neonGlowCanvas.getContext('2d');
const neonGlowCrossfade=neonGlowCtx.createLinearGradient(0,0,64,0);
for(const [stop,alpha] of [[0,0],[.28,.24],[.5,.85],[.72,.24],[1,0]])neonGlowCrossfade.addColorStop(stop,'rgba(255,255,255,'+alpha+')');
neonGlowCtx.fillStyle=neonGlowCrossfade;neonGlowCtx.fillRect(0,0,64,256);
const neonGlowEndFade=neonGlowCtx.createLinearGradient(0,0,0,256);
for(const [stop,alpha] of [[0,0],[.12,1],[.88,1],[1,0]])neonGlowEndFade.addColorStop(stop,'rgba(255,255,255,'+alpha+')');
neonGlowCtx.globalCompositeOperation='destination-in';neonGlowCtx.fillStyle=neonGlowEndFade;neonGlowCtx.fillRect(0,0,64,256);
neonGlowCtx.globalCompositeOperation='source-over';
const neonGlowTexture=new THREE.CanvasTexture(neonGlowCanvas);
const roadGlow=new THREE.MeshBasicMaterial({map:neonGlowTexture,color:0xe13f57,transparent:true,opacity:.35,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
const roadsideNeonGlow=[];
for(const side of [-1,1]){const glow=new THREE.Mesh(new THREE.PlaneGeometry(1.05,205),roadGlow);glow.rotation.x=-Math.PI/2;glow.position.set(side*5.9,.072,-91);scene.add(glow);roadsideNeonGlow.push(glow);}// Yaowarat streetlights: replace 72 individual meshes with five shared batches.
// Four PBR/illuminated lamp components plus one baked amber pavement glow.
// The glow is a small static alpha texture; no dynamic lights, shadows or per-frame canvas work.
const streetLampAnchors=[];
for(let i=0;i<12;i++)for(const side of [-1,1]){
 const anchor=new THREE.Object3D();
 anchor.position.set(side*6.7,0,9-i*18);
 scene.add(anchor);props.push(anchor);streetLampAnchors.push({anchor,side});
}
const streetLampMetal=new THREE.MeshStandardMaterial({color:0x58616a,metalness:.64,roughness:.52});
const streetLampLens=new THREE.MeshBasicMaterial({color:0xffd4a0});
const streetLampCount=streetLampAnchors.length;
const streetLampPoles=new THREE.InstancedMesh(new THREE.BoxGeometry(.085,5.4,.085),streetLampMetal,streetLampCount);
const streetLampArms=new THREE.InstancedMesh(new THREE.BoxGeometry(1.15,.085,.085),streetLampMetal,streetLampCount);
const streetLampShades=new THREE.InstancedMesh(new THREE.CylinderGeometry(.13,.24,.19,10),streetLampMetal,streetLampCount);
const streetLampLenses=new THREE.InstancedMesh(new THREE.SphereGeometry(.155,12,8),streetLampLens,streetLampCount);
const streetLampPoolCanvas=document.createElement('canvas');
streetLampPoolCanvas.width=streetLampPoolCanvas.height=128;
const streetLampPoolCtx=streetLampPoolCanvas.getContext('2d');
const streetLampFalloff=streetLampPoolCtx.createRadialGradient(64,64,4,64,64,63);
streetLampFalloff.addColorStop(0,'rgba(255,255,255,.72)');
streetLampFalloff.addColorStop(.35,'rgba(255,255,255,.30)');
streetLampFalloff.addColorStop(.7,'rgba(255,255,255,.07)');
streetLampFalloff.addColorStop(1,'rgba(255,255,255,0)');
streetLampPoolCtx.fillStyle=streetLampFalloff;streetLampPoolCtx.fillRect(0,0,128,128);
const streetLampPools=new THREE.InstancedMesh(new THREE.PlaneGeometry(3.6,7.4),
 new THREE.MeshBasicMaterial({
  map:new THREE.CanvasTexture(streetLampPoolCanvas),color:0xffb66f,
  transparent:true,opacity:.26,blending:THREE.AdditiveBlending,
  depthWrite:false,side:THREE.DoubleSide
 }),streetLampCount);
const streetLampMeshes=[streetLampPoles,streetLampArms,streetLampShades,streetLampLenses,streetLampPools];
for(const mesh of streetLampMeshes){mesh.frustumCulled=false;scene.add(mesh);}
const streetLampDummy=new THREE.Object3D();
function updateYaowaratStreetlights(){
 for(let i=0;i<streetLampCount;i++){
  const {anchor,side}=streetLampAnchors[i],x=anchor.position.x,z=anchor.position.z;
  streetLampDummy.rotation.set(0,0,0);streetLampDummy.scale.set(1,1,1);
  streetLampDummy.position.set(x,2.7,z);
  streetLampDummy.updateMatrix();streetLampPoles.setMatrixAt(i,streetLampDummy.matrix);
  streetLampDummy.position.set(x-side*.55,5.4,z);
  streetLampDummy.updateMatrix();streetLampArms.setMatrixAt(i,streetLampDummy.matrix);
  streetLampDummy.position.set(x-side*1.1,5.43,z);
  streetLampDummy.updateMatrix();streetLampShades.setMatrixAt(i,streetLampDummy.matrix);
  streetLampDummy.scale.set(1,.52,1);
  streetLampDummy.position.set(x-side*1.1,5.28,z);
  streetLampDummy.updateMatrix();streetLampLenses.setMatrixAt(i,streetLampDummy.matrix);
  streetLampDummy.scale.set(1,1,1);streetLampDummy.rotation.set(-Math.PI/2,0,0);
  streetLampDummy.position.set(side*5.1,.116,z);
  streetLampDummy.updateMatrix();streetLampPools.setMatrixAt(i,streetLampDummy.matrix);
 }
 for(const mesh of streetLampMeshes)mesh.instanceMatrix.needsUpdate=true;
}
updateYaowaratStreetlights();
// Rama II: deterministic shared weathered-concrete PBR textures, baked only once.
// Fine aggregate, rain streaks, board-form seams, tie holes and hairline cracks replace flat blocks.
const ramaConcreteCanvas=document.createElement('canvas');
ramaConcreteCanvas.width=ramaConcreteCanvas.height=256;
const ramaConcreteCtx=ramaConcreteCanvas.getContext('2d');
const ramaRoughnessCanvas=document.createElement('canvas');
ramaRoughnessCanvas.width=ramaRoughnessCanvas.height=256;
const ramaRoughnessCtx=ramaRoughnessCanvas.getContext('2d');
ramaConcreteCtx.fillStyle='#c5c4bf';ramaConcreteCtx.fillRect(0,0,256,256);
ramaRoughnessCtx.fillStyle='#ededed';ramaRoughnessCtx.fillRect(0,0,256,256);
let ramaTextureSeed=92831;
function ramaTextureRandom(){
 ramaTextureSeed=(Math.imul(ramaTextureSeed,1664525)+1013904223)>>>0;
 return ramaTextureSeed/4294967296;
}
for(let i=0;i<2400;i++){
 const px=ramaTextureRandom()*256,py=ramaTextureRandom()*256;
 const dark=ramaTextureRandom()<.58;
 ramaConcreteCtx.fillStyle=dark?'rgba(47,53,55,.12)':'rgba(255,255,248,.18)';
 ramaConcreteCtx.fillRect(px,py,.6+ramaTextureRandom()*1.7,.6+ramaTextureRandom()*1.7);
}
for(let i=0;i<20;i++){
 const x=ramaTextureRandom()*256,y=ramaTextureRandom()*230,w=2+ramaTextureRandom()*13;
 const stain=ramaConcreteCtx.createLinearGradient(x,y,x,y+18+ramaTextureRandom()*45);
 stain.addColorStop(0,'rgba(57,64,65,.13)');
 stain.addColorStop(1,'rgba(57,64,65,0)');
 ramaConcreteCtx.fillStyle=stain;ramaConcreteCtx.fillRect(x,y,w,55);
 ramaRoughnessCtx.fillStyle='rgba(112,112,112,.12)';
 ramaRoughnessCtx.fillRect(x,y,w,18);
}
for(const y of [12,132,248]){
 ramaConcreteCtx.fillStyle='rgba(62,69,69,.16)';
 ramaConcreteCtx.fillRect(0,y,256,1);
 ramaConcreteCtx.fillStyle='rgba(255,255,255,.12)';
 ramaConcreteCtx.fillRect(0,y+1,256,1);
}
for(const x of [45,209])for(const y of [51,186]){
 ramaConcreteCtx.beginPath();ramaConcreteCtx.arc(x,y,2.6,0,Math.PI*2);
 ramaConcreteCtx.fillStyle='rgba(53,58,59,.34)';ramaConcreteCtx.fill();
 ramaConcreteCtx.beginPath();ramaConcreteCtx.arc(x-.5,y-.5,1,0,Math.PI*2);
 ramaConcreteCtx.fillStyle='rgba(30,33,34,.25)';ramaConcreteCtx.fill();
}
for(let i=0;i<5;i++){
 let x=ramaTextureRandom()*256,y=ramaTextureRandom()*220;
 ramaConcreteCtx.beginPath();ramaConcreteCtx.moveTo(x,y);
 for(let j=0;j<5;j++){x+=ramaTextureRandom()*8-4;y+=4+ramaTextureRandom()*8;ramaConcreteCtx.lineTo(x,y)}
 ramaConcreteCtx.strokeStyle='rgba(49,56,57,.19)';
 ramaConcreteCtx.lineWidth=.65;ramaConcreteCtx.stroke();
}
const ramaConcreteMap=new THREE.CanvasTexture(ramaConcreteCanvas);
ramaConcreteMap.colorSpace=THREE.SRGBColorSpace;
ramaConcreteMap.wrapS=ramaConcreteMap.wrapT=THREE.RepeatWrapping;
const ramaConcreteRoughness=new THREE.CanvasTexture(ramaRoughnessCanvas);
ramaConcreteRoughness.wrapS=ramaConcreteRoughness.wrapT=THREE.RepeatWrapping;
// Dedicated UV tiling prevents a single concrete stain stretching across the 28m deck.
const ramaDeckMap=ramaConcreteMap.clone();ramaDeckMap.repeat.set(3,8);ramaDeckMap.needsUpdate=true;
const ramaDeckRoughness=ramaConcreteRoughness.clone();
ramaDeckRoughness.repeat.set(3,8);ramaDeckRoughness.needsUpdate=true;
// Rama II segmented elevated highway: unfinished deck joint, precast girders and safety equipment.
const ramaStructures=[];
const bridgeConcrete=new THREE.MeshStandardMaterial({color:0xd6d9d8,map:ramaConcreteMap,roughnessMap:ramaConcreteRoughness,roughness:.96,metalness:0});
const bridgeUnderside=new THREE.MeshStandardMaterial({color:0xabb1b2,map:ramaConcreteMap,roughnessMap:ramaConcreteRoughness,roughness:.99,metalness:0});
const bridgeDeckConcrete=new THREE.MeshStandardMaterial({color:0xd4d7d6,map:ramaDeckMap,roughnessMap:ramaDeckRoughness,roughness:.96,metalness:0});
const bridgeRail=mat(0x888b88),workOrange=mat(0xd86b36);
const bridgeJoint=mat(0x454a4b),bridgeSteel=mat(0x775d4c);
const bridgeReflector=new THREE.MeshBasicMaterial({color:0xffe6b0});
const coneWhite=new THREE.MeshBasicMaterial({color:0xf8eee0});
const reflectorGeo=new THREE.BoxGeometry(.14,.19,.72);
const coneGeo=new THREE.ConeGeometry(.38,1.05,7);
const coneBandGeo=new THREE.CylinderGeometry(.22,.29,.19,7);
for(let k=0;k<2;k++){
 const viaduct=new THREE.Group();
 // Piers and cap beams stay outside the driving lanes.
 for(const z of [-25,0,25]){
  for(const side of [-1,1]){
   viaduct.add(cube(2.1,.65,2.3,bridgeUnderside,side*6.9,.32,z));
   viaduct.add(cube(1.1,8.2,1.2,bridgeConcrete,side*6.9,4.1,z));
  }
  viaduct.add(cube(14,.55,1.5,bridgeConcrete,0,8.25,z));
 }
 // The two precast spans leave an unfinished expansion gap.
 for(const z of [-15,15]){
  viaduct.add(cube(13.2,.8,28,bridgeDeckConcrete,0,9.1,z));
  for(const x of [-4.1,0,4.1])viaduct.add(cube(.58,.62,27.2,bridgeUnderside,x,8.4,z));
  for(const side of [-1,1])viaduct.add(cube(.22,.35,28,bridgeConcrete,side*6.5,9.75,z));
  viaduct.add(cube(12.9,.035,.18,bridgeJoint,0,9.52,z<0?-1.25:1.25));
 }
 // Starter bars protrude into the gap, rather than a solid crossbar.
 for(const x of [-4,-2,0,2,4])viaduct.add(cube(.09,.09,2.4,bridgeSteel,x,9.18,0));
 // Reflective markers on elevated edges share a single draw call.
 const reflectors=new THREE.InstancedMesh(reflectorGeo,bridgeReflector,12);
 let ri=0;for(const z of [-24,-15,-6,6,15,24])for(const side of [-1,1])
  reflectors.setMatrixAt(ri++,new THREE.Matrix4().makeTranslation(side*6.65,9.84,z));
 reflectors.instanceMatrix.needsUpdate=true;viaduct.add(reflectors);
 // Roadwork cones remain outside the drivable asphalt.
 const cones=new THREE.InstancedMesh(coneGeo,workOrange,6);
 const bands=new THREE.InstancedMesh(coneBandGeo,coneWhite,6);
 let ci=0;for(const z of [-23,0,23])for(const side of [-1,1]){
  cones.setMatrixAt(ci,new THREE.Matrix4().makeTranslation(side*8.0,.54,z));
  bands.setMatrixAt(ci,new THREE.Matrix4().makeTranslation(side*8.0,.57,z));
  ci++;
 }
 cones.instanceMatrix.needsUpdate=true;bands.instanceMatrix.needsUpdate=true;
 viaduct.add(cones,bands);
 viaduct.position.z=-45-k*99;viaduct.userData.startZ=viaduct.position.z;
 viaduct.visible=false;scene.add(viaduct);ramaStructures.push(viaduct);
}
// Rama II construction corridor: road-edge Jersey barriers, work platforms,
// unfinished rebar cages and crane silhouettes. All outside the playable lanes.
const siteConcrete=new THREE.MeshStandardMaterial({color:0xe3d9cb,map:ramaConcreteMap,roughnessMap:ramaConcreteRoughness,roughness:.98,metalness:0});
const siteSteel=new THREE.MeshLambertMaterial({color:0x666e70});
const siteCrane=new THREE.MeshStandardMaterial({color:0xc78e30,metalness:.42,roughness:.72});
// Shared 128px woven construction net: open diamond holes, UV-stable fibers and
// faded stripes. Alpha testing avoids costly transparent-layer overdraw on iPhone.
const ramaSafetyNetCanvas=document.createElement('canvas');
ramaSafetyNetCanvas.width=ramaSafetyNetCanvas.height=128;
const ramaSafetyNetCtx=ramaSafetyNetCanvas.getContext('2d');
ramaSafetyNetCtx.clearRect(0,0,128,128);
ramaSafetyNetCtx.strokeStyle='rgba(48,104,73,.93)';
ramaSafetyNetCtx.lineWidth=1.6;
for(let k=-128;k<256;k+=12){
 ramaSafetyNetCtx.beginPath();ramaSafetyNetCtx.moveTo(k,0);ramaSafetyNetCtx.lineTo(k+128,128);ramaSafetyNetCtx.stroke();
 ramaSafetyNetCtx.beginPath();ramaSafetyNetCtx.moveTo(k,128);ramaSafetyNetCtx.lineTo(k+128,0);ramaSafetyNetCtx.stroke();
}
ramaSafetyNetCtx.strokeStyle='rgba(115,150,107,.9)';
ramaSafetyNetCtx.lineWidth=2;
for(const x of [1,64,126]){ramaSafetyNetCtx.beginPath();ramaSafetyNetCtx.moveTo(x,0);ramaSafetyNetCtx.lineTo(x,128);ramaSafetyNetCtx.stroke();}
const ramaSafetyNetTexture=new THREE.CanvasTexture(ramaSafetyNetCanvas);
ramaSafetyNetTexture.colorSpace=THREE.SRGBColorSpace;
ramaSafetyNetTexture.wrapS=THREE.RepeatWrapping;
ramaSafetyNetTexture.wrapT=THREE.RepeatWrapping;
ramaSafetyNetTexture.repeat.set(2,3);
ramaSafetyNetTexture.anisotropy=Math.min(2,renderer.capabilities.getMaxAnisotropy());
const ramaSafetyNetMaterial=new THREE.MeshStandardMaterial({
 map:ramaSafetyNetTexture,alphaTest:.45,transparent:false,side:THREE.DoubleSide,
 roughness:.96,metalness:0,depthWrite:true
});
const ramaSafetyNetGeometry=new THREE.PlaneGeometry(3.2,6.8);
const ramaScaffoldPostGeometry=new THREE.BoxGeometry(.075,7.6,.075);
const ramaScaffoldCrossbarGeometry=new THREE.BoxGeometry(.075,.075,14.5);
// A real Jersey barrier has a wide toe, a sloping impact face and a narrow crown.
// Share one extruded profile across all 28 barriers per work zone (no extra draw calls).
const barrierProfile=new THREE.Shape();
barrierProfile.moveTo(-.39,-.47);
barrierProfile.lineTo(.39,-.47);
barrierProfile.lineTo(.39,-.27);
barrierProfile.lineTo(.22,.22);
barrierProfile.lineTo(.22,.47);
barrierProfile.lineTo(-.22,.47);
barrierProfile.lineTo(-.22,.22);
barrierProfile.lineTo(-.39,-.27);
barrierProfile.closePath();
const siteBarrierGeo=new THREE.ExtrudeGeometry(barrierProfile,{depth:3.65,steps:1,bevelEnabled:false});
siteBarrierGeo.translate(0,0,-1.825);
// Diagonal reflective red/white chevrons are baked into one tiny shared atlas.
// A flat plane replaces the old thick red cuboid; there are still only two
// instanced draw calls per work zone and nothing enters the dodge lanes.
const barrierStripeCanvas=document.createElement('canvas');
barrierStripeCanvas.width=128;barrierStripeCanvas.height=64;
const barrierStripeCtx=barrierStripeCanvas.getContext('2d');
barrierStripeCtx.fillStyle='#ece9df';barrierStripeCtx.fillRect(0,0,128,64);
for(let sx=-80;sx<192;sx+=42){
 barrierStripeCtx.fillStyle='#bb3d2d';
 barrierStripeCtx.beginPath();
 barrierStripeCtx.moveTo(sx,0);barrierStripeCtx.lineTo(sx+22,0);
 barrierStripeCtx.lineTo(sx+80,64);barrierStripeCtx.lineTo(sx+58,64);
 barrierStripeCtx.closePath();barrierStripeCtx.fill();
}
for(let i=0;i<64;i++){
 const px=(i*53+17)%128,py=(i*29+7)%64;
 barrierStripeCtx.fillStyle=i%3?'rgba(39,35,30,.13)':'rgba(255,255,255,.22)';
 barrierStripeCtx.fillRect(px,py,1+(i%3),1);
}
const barrierStripeTexture=new THREE.CanvasTexture(barrierStripeCanvas);
barrierStripeTexture.colorSpace=THREE.SRGBColorSpace;
barrierStripeTexture.anisotropy=mobile?2:4;
// Headlamp-readable retroreflective chevrons: preserve the PBR concrete and
// blackout while lifting only the red/white safety tape (zero extra draw calls).
const siteStripeMaterial=new THREE.MeshStandardMaterial({
 map:barrierStripeTexture,metalness:.04,roughness:.38,
 emissive:0xffffff,emissiveMap:barrierStripeTexture,emissiveIntensity:.62,
 side:THREE.DoubleSide
});
const siteStripeGeo=new THREE.PlaneGeometry(2.75,.36);
// Exposed reinforcement at the unfinished pier: rusted PBR steel and one
// shared instanced box instead of four individual rods plus separate ties.
const ramaRebarGeometry=new THREE.BoxGeometry(1,1,1);
const ramaRebarMaterial=new THREE.MeshStandardMaterial({
 color:0x805b43,metalness:.62,roughness:.78
});
// One unit-box geometry and one PBR steel material for every crane strut.
// Triangulated silhouette replaces three toy-like solid beams, without shadows
// or per-frame animation; safe for the iPhone's limited draw-call budget.
const ramaCraneStrutGeometry=new THREE.BoxGeometry(1,1,1);
const ramaCraneUp=new THREE.Vector3(0,1,0);
function addRamaLatticeCrane(g,side){
 const x=side*14,z=-15,parts=[],pose=new THREE.Object3D();
 function strut(ax,ay,az,bx,by,bz,width=.085){
  const dx=bx-ax,dy=by-ay,dz=bz-az,length=Math.hypot(dx,dy,dz);
  if(length<.001)throw Error('Zero-length crane strut');
  pose.position.set((ax+bx)*.5,(ay+by)*.5,(az+bz)*.5);
  pose.quaternion.setFromUnitVectors(ramaCraneUp,new THREE.Vector3(dx/length,dy/length,dz/length));
  pose.scale.set(width,length,width);
  pose.updateMatrix();parts.push(pose.matrix.clone());
 }
 // Four open steel legs with cross-ties and alternating diagonal bracing.
 for(const ox of [-.36,.36])for(const oz of [-.36,.36])
  strut(x+ox,0,z+oz,x+ox,16.4,z+oz,.13);
 for(let level=0;level<=8;level++){
  const y=level*2.05;
  for(const oz of [-.36,.36])strut(x-.36,y,z+oz,x+.36,y,z+oz,.09);
  for(const ox of [-.36,.36])strut(x+ox,y,z-.36,x+ox,y,z+.36,.09);
  if(level===8)continue;
  const y2=y+2.05,flip=level%2===0;
  for(const oz of [-.36,.36])
   strut(x+(flip?-.36:.36),y,z+oz,x+(flip?.36:-.36),y2,z+oz,.075);
  for(const ox of [-.36,.36])
   strut(x+ox,y,z+(flip?-.36:.36),x+ox,y2,z+(flip?.36:-.36),.075);
 }
 // A triangular lattice boom extends along the road, not over its dodge lanes.
 const tip=z-13,boomY=16.25,topY=17.12;
 for(const ox of [-.42,.42])strut(x+ox,boomY,z,x+ox,boomY,tip,.14);
 strut(x,topY,z,x,topY,tip,.12);
 for(let i=0;i<=8;i++){
  const z0=z-i*13/8;
  strut(x-.42,boomY,z0,x+.42,boomY,z0,.085);
  if(i===8)continue;
  const z1=z-(i+1)*13/8;
  for(const ox of [-.42,.42]){
   strut(x+ox,boomY,z0,x,topY,z1,.085);
   strut(x,topY,z0,x+ox,boomY,z1,.075);
  }
 }
 // Short rear counter-jib balances the boom; the cable ends behind barriers.
 for(const ox of [-.4,.4])strut(x+ox,16.25,z,x+ox,16.25,z+4.4,.13);
 strut(x,17.12,z,x,17.12,z+4.4,.12);
 for(let i=0;i<3;i++){
  const z0=z+i*4.4/3,z1=z+(i+1)*4.4/3;
  for(const ox of [-.4,.4])strut(x+ox,16.25,z0,x,17.12,z1,.09);
 }
 // Fixed yellow hook block; steel hoist cable is one separate thin mesh.
 strut(x,10.95,tip+1.9,x,11.35,tip+1.9,.22);
 // Rama II crane operator cabin: framed steel cab with PBR tinted glazing.
 // Offset outward from the tower so the cab stays behind the road barriers.
 // Reuse the crane's existing instanced yellow steel draw call for the cab frame,
 // floor and roof: no additional structural-steel draw calls.
 const cabX=x+side*1.10,cabFront=z-1.25,cabRear=z+.30;
 const cabBottom=14.40,cabTop=16.20;
 for(const cx of [cabX-.46,cabX+.46])for(const cz of [cabFront,cabRear])
  strut(cx,cabBottom,cz,cx,cabTop,cz,.085);
 for(const cy of [cabBottom,cabTop]){
  for(const cz of [cabFront,cabRear])
   strut(cabX-.46,cy,cz,cabX+.46,cy,cz,.085);
  for(const cx of [cabX-.46,cabX+.46])
   strut(cx,cy,cabFront,cx,cy,cabRear,.085);
 }
 // Shallow opaque sheet-metal floor and overhanging roof, same instance batch.
 for(const cy of [cabBottom-.055,cabTop+.075]){
  pose.position.set(cabX,cy,(cabFront+cabRear)*.5);
  pose.quaternion.identity();pose.scale.set(1.04,.13,1.76);
  pose.updateMatrix();parts.push(pose.matrix.clone());
 }
 const lattice=new THREE.InstancedMesh(ramaCraneStrutGeometry,siteCrane,parts.length);
 for(let i=0;i<parts.length;i++)lattice.setMatrixAt(i,parts[i]);
 lattice.instanceMatrix.needsUpdate=true;
 lattice.computeBoundingSphere();
 g.add(lattice);
 g.add(cube(.045,5.05,.045,siteSteel,x,13.9,tip+1.9));
 // Suspended precast I-girder makes the tower crane a working construction
 // machine rather than a bare silhouette. Its entire load is beyond x=+/-13,
 // well outside the playable road; two batched meshes, no dynamic lighting.
 const loadZ=tip+1.9;
 const girder=new THREE.InstancedMesh(ramaCraneStrutGeometry,bridgeConcrete,3);
 const girderParts=[
  [x,9.25,loadZ,1.5,.18,4.5], // top flange
  [x,8.39,loadZ,1.5,.18,4.5], // bottom flange
  [x,8.82,loadZ,.28,.72,4.5] // recessed I-section web
 ];
 for(let i=0;i<girderParts.length;i++){
  const [px,py,pz,w,h,d]=girderParts[i];
  pose.position.set(px,py,pz);pose.quaternion.identity();pose.scale.set(w,h,d);
  pose.updateMatrix();girder.setMatrixAt(i,pose.matrix);
 }
 girder.instanceMatrix.needsUpdate=true;girder.computeBoundingSphere();
 // Two steel lifting slings converge on the existing crane hook.
 const slings=new THREE.InstancedMesh(ramaCraneStrutGeometry,siteSteel,2);
 for(let i=0;i<2;i++){
  const endZ=loadZ+(i===0?-1.55:1.55);
  const delta=new THREE.Vector3(0,9.34-10.95,endZ-loadZ);
  pose.position.set(x,(10.95+9.34)*.5,(loadZ+endZ)*.5);
  pose.quaternion.setFromUnitVectors(ramaCraneUp,delta.clone().normalize());
  pose.scale.set(.035,delta.length(),.035);pose.updateMatrix();
  slings.setMatrixAt(i,pose.matrix);
 }
 slings.instanceMatrix.needsUpdate=true;slings.computeBoundingSphere();
 g.add(girder,slings);
 // Opaque blue-grey PBR glass avoids mobile alpha sorting and overdraw.
 // Three windows share one plane geometry, one material and one draw call.
 const cabGlassMaterial=new THREE.MeshStandardMaterial({
  color:0x29485a,metalness:.28,roughness:.19,side:THREE.DoubleSide
 });
 const cabWindows=new THREE.InstancedMesh(
  new THREE.PlaneGeometry(1,1),cabGlassMaterial,3
 );
 const cabWindowY=(cabBottom+cabTop)*.5;
 pose.quaternion.identity();
 pose.position.set(cabX,cabWindowY,cabFront-.012);
 pose.scale.set(.76,1.53,1);pose.updateMatrix();
 cabWindows.setMatrixAt(0,pose.matrix);
 for(let i=0;i<2;i++){
  pose.rotation.set(0,Math.PI/2,0);
  pose.position.set(cabX+(i===0?-.467:.467),cabWindowY,(cabFront+cabRear)*.5);
  pose.scale.set(1.35,1.53,1);pose.updateMatrix();
  cabWindows.setMatrixAt(i+1,pose.matrix);
 }
 cabWindows.instanceMatrix.needsUpdate=true;
 cabWindows.computeBoundingSphere();
 cabWindows.name='rama2-crane-operator-cabin-pbr-glazing';
 g.add(cabWindows);
}
// Static roadside tracked excavator: articulated boom, hydraulic rams, cab glass,
// rubber tracks and a scooped bucket. Five shared-material draw calls per work zone;
// no animation, external assets, dynamic lights or road-lane collision geometry.
const ramaExcavatorUnit=new THREE.BoxGeometry(1,1,1);
const ramaExcavatorTrackGeo=new THREE.CapsuleGeometry(.45,2.05,4,8);
// Recessed idler/sprocket and lower bogie wheels make the tracked chassis read
// as heavy construction machinery. Shared low-poly geometry, one instanced draw
// per parked excavator, no moving parts, lights or external model downloads.
const ramaExcavatorWheelGeo=new THREE.CylinderGeometry(.32,.32,.13,12);
// Mobile-budget PBR weathering for the Rama II excavators: one 128px shared
// paint/roughness atlas, baked once. The existing instanced parts retain their
// draw-call count and stay safely behind the construction barriers.
const excavatorPaintCanvas=document.createElement('canvas');
const excavatorRoughCanvas=document.createElement('canvas');
excavatorPaintCanvas.width=excavatorPaintCanvas.height=128;
excavatorRoughCanvas.width=excavatorRoughCanvas.height=128;
const excavatorPaintCtx=excavatorPaintCanvas.getContext('2d');
const excavatorRoughCtx=excavatorRoughCanvas.getContext('2d');
excavatorPaintCtx.fillStyle='#c79a36';excavatorPaintCtx.fillRect(0,0,128,128);
excavatorRoughCtx.fillStyle='rgb(174,188,174)';excavatorRoughCtx.fillRect(0,0,128,128);
// Thin pressed-metal seams, dusty lower edges and small rubbed steel chips.
for(let x=7;x<128;x+=40){
 excavatorPaintCtx.fillStyle='rgba(60,50,32,.33)';
 excavatorPaintCtx.fillRect(x,0,2,128);
 excavatorPaintCtx.fillStyle='rgba(255,224,139,.25)';
 excavatorPaintCtx.fillRect(x+3,0,1,128);
}
const excavatorDust=excavatorPaintCtx.createLinearGradient(0,0,0,128);
excavatorDust.addColorStop(0,'rgba(48,45,37,.10)');
excavatorDust.addColorStop(.56,'rgba(48,45,37,0)');
excavatorDust.addColorStop(1,'rgba(57,49,36,.46)');
excavatorPaintCtx.fillStyle=excavatorDust;excavatorPaintCtx.fillRect(0,0,128,128);
for(let i=0;i<92;i++){
 const px=(i*73+19*i*i)%126,py=(i*47+11*i*i)%126;
 const len=2+i%8;
 excavatorPaintCtx.fillStyle=i%4===0?'rgba(53,58,59,.57)':'rgba(239,216,159,.24)';
 excavatorPaintCtx.fillRect(px,py,len,1);
 excavatorRoughCtx.fillStyle=i%4===0?'rgb(113,113,113)':'rgb(214,214,214)';
 excavatorRoughCtx.fillRect(px,py,len,1+i%2);
}
const excavatorPaintMap=new THREE.CanvasTexture(excavatorPaintCanvas);
excavatorPaintMap.colorSpace=THREE.SRGBColorSpace;
const excavatorRoughMap=new THREE.CanvasTexture(excavatorRoughCanvas);
excavatorPaintMap.anisotropy=excavatorRoughMap.anisotropy=2;
const ramaExcavatorPaint=new THREE.MeshStandardMaterial({
 color:0xffffff,map:excavatorPaintMap,roughnessMap:excavatorRoughMap,
 metalness:.28,roughness:.86
});
// Shared 128px PBR tread atlas gives the Rama II excavator tracks
// rubber ribs and construction dust without new meshes or draw calls.
const ramaTrackCanvas=document.createElement('canvas');
ramaTrackCanvas.width=ramaTrackCanvas.height=128;
const rtc=ramaTrackCanvas.getContext('2d');
rtc.fillStyle='#282d2c';rtc.fillRect(0,0,128,128);
for(let y=0;y<128;y+=16){
 rtc.fillStyle='#141a1b';rtc.fillRect(0,y,128,4);
 rtc.fillStyle='#454b47';rtc.fillRect(0,y+5,128,2);
 rtc.fillStyle='rgba(157,139,109,.25)';rtc.fillRect(0,y+11,128,3);
}
for(let n=0;n<170;n++){
 const px=(n*59+17)%128,py=(n*43+Math.floor(n/9)*13)%128;
 rtc.fillStyle=n%3?'rgba(163,143,111,.15)':'rgba(12,16,17,.31)';
 rtc.fillRect(px,py,1+n%3,1+n%2);
}
const ramaTrackMap=new THREE.CanvasTexture(ramaTrackCanvas);
ramaTrackMap.colorSpace=THREE.SRGBColorSpace;
ramaTrackMap.wrapS=ramaTrackMap.wrapT=THREE.RepeatWrapping;
ramaTrackMap.repeat.set(2,3);ramaTrackMap.anisotropy=2;
const ramaExcavatorRubber=new THREE.MeshStandardMaterial({
 color:0xffffff,map:ramaTrackMap,metalness:.12,roughness:.93
});
const ramaExcavatorGlass=new THREE.MeshStandardMaterial({color:0x253b43,metalness:.18,roughness:.22});
const ramaExcavatorSteel=new THREE.MeshStandardMaterial({color:0x555a5b,metalness:.66,roughness:.72});
// Separate polished piston rods from the dusty steel cylinder housings.
// One shared PBR material and one extra instanced draw per parked excavator.
const ramaExcavatorChrome=new THREE.MeshStandardMaterial({color:0xc5d1d5,metalness:.88,roughness:.27});
const ramaExcavatorBucketProfile=new THREE.Shape();
ramaExcavatorBucketProfile.moveTo(-.65,.36);
ramaExcavatorBucketProfile.lineTo(.48,.29);
ramaExcavatorBucketProfile.lineTo(.68,-.28);
ramaExcavatorBucketProfile.quadraticCurveTo(.08,-.68,-.58,-.42);
ramaExcavatorBucketProfile.closePath();
const ramaExcavatorBucketGeo=new THREE.ExtrudeGeometry(
 ramaExcavatorBucketProfile,{depth:1.25,steps:1,bevelEnabled:false}
);
ramaExcavatorBucketGeo.translate(0,0,-.625);
ramaExcavatorBucketGeo.rotateY(Math.PI/2);
const ramaExcavatorUp=new THREE.Vector3(0,1,0);
function addRamaExcavator(g,side){
 const x=side*10.9,z=15.2,pose=new THREE.Object3D();
 const painted=[],steel=[],glass=[],chrome=[];
 function box(list,px,py,pz,w,h,d){
  pose.position.set(px,py,pz);pose.quaternion.identity();pose.scale.set(w,h,d);
  pose.updateMatrix();list.push(pose.matrix.clone());
 }
 function beam(list,ax,ay,az,bx,by,bz,width,depth){
  const dx=bx-ax,dy=by-ay,dz=bz-az,length=Math.hypot(dx,dy,dz);
  if(length<.001)throw Error('Invalid excavator hydraulic/boom segment');
  pose.position.set((ax+bx)/2,(ay+by)/2,(az+bz)/2);
  pose.quaternion.setFromUnitVectors(ramaExcavatorUp,new THREE.Vector3(dx/length,dy/length,dz/length));
  pose.scale.set(width,length,depth);pose.updateMatrix();list.push(pose.matrix.clone());
 }
 function batch(geometry,material,parts){
  const mesh=new THREE.InstancedMesh(geometry,material,parts.length);
  for(let i=0;i<parts.length;i++)mesh.setMatrixAt(i,parts[i]);
  mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();g.add(mesh);
 }
 // Rounded track loops are parallel to the work-zone road, not crossing it.
 const tracks=new THREE.InstancedMesh(ramaExcavatorTrackGeo,ramaExcavatorRubber,2);
 for(let i=0;i<2;i++){
  pose.position.set(x+(i? .73:-.73),.55,z);
  pose.rotation.set(Math.PI/2,0,0);pose.scale.set(1,1,1);pose.updateMatrix();
  tracks.setMatrixAt(i,pose.matrix);
 }
 tracks.instanceMatrix.needsUpdate=true;tracks.computeBoundingSphere();g.add(tracks);
 // Steel idler/sprocket discs and three lower bogie rollers per rubber track.
 // Cylinder axes point outward; wheel faces just peek through the track sides.
 // All ten wheels share one draw call and stay behind the roadwork barriers.
 const trackWheels=new THREE.InstancedMesh(ramaExcavatorWheelGeo,ramaExcavatorSteel,10);
 let trackWheelIndex=0;
 for(const trackSide of [-1,1]){
  for(const wheel of [
   [-1.00,.55,.31],[1.00,.55,.31],
   [-.52,.43,.20],[0,.43,.20],[.52,.43,.20]
  ]){
   pose.position.set(x+trackSide*1.16,wheel[1],z+wheel[0]);
   pose.rotation.set(0,0,Math.PI/2);
   pose.scale.set(wheel[2]/.32,1,wheel[2]/.32);
   pose.updateMatrix();
   trackWheels.setMatrixAt(trackWheelIndex++,pose.matrix);
  }
 }
 if(trackWheelIndex!==10)throw Error('Rama II excavator wheel count mismatch');
 trackWheels.instanceMatrix.needsUpdate=true;
 trackWheels.computeBoundingSphere();g.add(trackWheels);
 // Heavy tracked undercarriage: sloped mudguards, side wear plates and
 // visible cross-bracing. These reuse the existing instanced PBR steel batch,
 // stay outside the playable lane and add no draw calls or textures.
 for(const trackSide of [-1,1]){
  const outerX=x+trackSide*1.24;
  // Long steel skirt hides the toy-like gap above each continuous track.
  box(steel,outerX,.94,z, .075,.20,2.05);
  // Angled front/rear guards follow the track's rising end silhouette.
  beam(steel,outerX,.87,z-1.00,outerX,1.06,z-.72,.095,.11);
  beam(steel,outerX,1.06,z+.72,outerX,.87,z+1.00,.095,.11);
  // Recessed bogie carrier and two substantial vertical supports.
  box(steel,x+trackSide*.91,.79,z,.14,.14,1.72);
  for(const zz of [z-.58,z+.58])
   box(steel,x+trackSide*.94,.97,zz,.15,.40,.14);
 }
 // The lower chassis remains aligned with the track loops, not the road.
 box(steel,x,.73,z-.66,1.55,.16,.15);
 box(steel,x,.73,z+.66,1.55,.16,.15);
 // Painted turntable, rear counterweight, offset operator cab and roof.
 box(steel,x,.83,z,1.15,.24,1.95); // undercarriage frame between the tracks
 box(painted,x,1.2,z,1.88,.5,2.25);
 // Tapered rear counterweight silhouette: bevelled upper shoulder and
 // reinforced lower edge. Reuse the existing painted/steel instanced batches.
 box(painted,x,1.54,z+.8,1.95,.43,.9);
 beam(painted,x-.84,1.75,z+.82,x-.62,1.96,z+.82,.34,.48);
 beam(painted,x+.84,1.75,z+.82,x+.62,1.96,z+.82,.34,.48);
 box(painted,x,1.83,z+.8,1.24,.24,.88);
 box(steel,x,1.31,z+1.265,1.68,.09,.055);
 box(painted,x-side*.42,2.15,z+.25,.96,1.05,1.25);
 box(painted,x-side*.42,2.82,z+.25,1.1,.13,1.38);
 box(painted,x+side*.37,1.83,z-.3,.75,.52,1.0);
 // Raked windscreen and sloping roadside door glass replace the cuboid cab.
 // Both panes use the existing instanced glass batch; frames stay aligned with
 // the slope and make the operator compartment legible from the road.
 beam(glass,x-side*.92,2.04,z+.25,x-side*.82,2.68,z+.25,.055,1.04);
 beam(glass,x-side*.42,2.03,z-.49,x-side*.42,2.68,z-.27,.88,.055);
 // Lower/upper sill rails and the angled A-pillars share the steel batch.
 box(steel,x-side*.955,2.00,z+.25,.085,.055,1.12);
 box(steel,x-side*.82,2.70,z+.25,.085,.055,1.12);
 box(steel,x-side*.42,2.00,z-.49,.98,.055,.085);
 box(steel,x-side*.42,2.70,z-.27,.98,.055,.085);
 for(const zz of [z-.32,z+.82])
  beam(steel,x-side*.955,2.04,zz,x-side*.82,2.68,zz,.07,.07);
 for(const xx of [x-side*.9,x+side*.06])
  beam(steel,xx,2.04,z-.49,xx,2.68,z-.27,.07,.07);
 // Door seam, centre windscreen mullion and parked wiper.
 beam(steel,x-side*.955,2.04,z+.18,x-side*.82,2.68,z+.18,.045,.045);
 beam(steel,x-side*.42,2.04,z-.49,x-side*.42,2.68,z-.27,.045,.045);
 beam(steel,x-side*.80,2.07,z-.50,x-side*.22,2.30,z-.42,.035,.035);
 // Roadside mirror, engine ventilation grille and vertical exhaust stack.
 beam(steel,x-side*.97,2.53,z-.12,x-side*1.17,2.53,z-.12,.045,.045);
 box(steel,x-side*1.17,2.53,z-.12,.07,.24,.18);
 box(steel,x+side*.76,1.83,z-.30,.03,.46,.84);
 for(let i=0;i<9;i++)
  box(chrome,x+side*.785,1.65+i*.045,z-.30,.025,.012,.76);
 box(steel,x+side*.64,2.34,z+.71,.12,.92,.12);
 box(steel,x+side*.64,2.82,z+.71,.18,.07,.18);
 // Open steel access ladder and counterweight grab rail, batched with existing steel.
 // These components remain beyond the road barriers and add no draw calls.
 for(let step=0;step<4;step++)
  box(steel,x-side*1.00,1.16+step*.27,z+.68,.10,.045,.48);
 for(const zz of [z+.45,z+.91])
  beam(steel,x-side*1.00,1.05,zz,x-side*1.00,2.26,zz,.045,.045);
 beam(steel,x-side*.84,2.08,z+1.17,x-side*.84,2.08,z+.55,.045,.045);
 for(const zz of [z+.55,z+1.17])
  beam(steel,x-side*.84,1.72,zz,x-side*.84,2.08,zz,.045,.045);
 // Main boom and dipper stick form an unmistakable raised excavator profile.
 beam(painted,x,2.05,z-.68,x,5.0,z-2.72,.37,.43);
 beam(painted,x,5.0,z-2.72,x,1.85,z-5.28,.27,.31);
 // Two-stage hydraulic actuators: broad steel barrels plus narrow reflective
 // exposed piston rods, following both articulated boom sections.
 beam(steel,x+side*.29,2.15,z-.8,x+side*.29,3.34,z-1.62,.135,.135);
 beam(chrome,x+side*.29,3.30,z-1.59,x+side*.29,4.18,z-2.18,.07,.07);
 beam(steel,x+side*.22,4.57,z-2.82,x+side*.22,3.74,z-3.61,.115,.115);
 beam(chrome,x+side*.22,3.77,z-3.58,x+side*.22,2.98,z-4.31,.065,.065);
 // Routed hydraulic return lines and steel retaining clamps on the boom/dipper.
 // Existing instanced steel batch: no new draw calls, materials or textures.
 // The lines remain entirely inside the roadside excavator work zone.
 for(const offset of [-.16,.16]){
  beam(steel,x+offset,2.34,z-.88,x+offset,4.82,z-2.62,.035,.035);
  beam(steel,x+offset,4.84,z-2.66,x+offset,2.08,z-5.05,.03,.03);
 }
 for(const [yy,zz] of [[3.0,-1.36],[4.13,-2.12],[4.28,-3.30],[3.03,-4.28]]){
  box(steel,x,yy,z+zz,.47,.055,.075);
 }
 // Sixty-four steel track shoes follow the upper, lower and curved end
 // runs. All are batched into the existing steel InstancedMesh draw call.
 for(let i=0;i<12;i++)for(const dx of [-.73,.73]){
  const zz=z-1.27+i*.23;
  box(steel,x+dx,.99,zz,.54,.065,.115);
  box(steel,x+dx,.11,zz,.54,.065,.115);
 }
 for(const dx of [-.73,.73])for(const end of [-1,1])for(let k=0;k<4;k++){
  const angle=(k-1.5)*Math.PI/5;
  pose.position.set(x+dx,.55+.45*Math.sin(angle),z+end*(1.025+.45*Math.cos(angle)));
  pose.rotation.set(-Math.PI/2-end*angle,0,0);
  pose.scale.set(.54,.065,.115);pose.updateMatrix();
  steel.push(pose.matrix.clone());
 }
 // Hardened bucket cutting edge and five pointed digging teeth:
 // all reuse the existing steel InstancedMesh and stay behind barriers.
 box(steel,x,1.00,z-5.99,1.34,.12,.16);
 for(let i=0;i<5;i++){
  const toothX=x+(i-2)*.285;
  beam(steel,toothX,1.04,z-6.00,toothX,.83,z-6.27,.095,.13);
  box(steel,toothX,1.09,z-5.86,.14,.16,.24);
 }
 // Bucket cheek plates visibly connect the dipper to its cutting lip.
 for(const cheek of [-.55,.55])
  beam(steel,x+cheek,1.48,z-5.44,x+cheek,1.04,z-5.95,.10,.11);
 batch(ramaExcavatorUnit,ramaExcavatorPaint,painted);
 batch(ramaExcavatorUnit,ramaExcavatorGlass,glass);
 batch(ramaExcavatorUnit,ramaExcavatorSteel,steel);
 batch(ramaExcavatorUnit,ramaExcavatorChrome,chrome);
 const bucket=new THREE.Mesh(ramaExcavatorBucketGeo,ramaExcavatorSteel);
 bucket.position.set(x,1.25,z-5.4);g.add(bucket);
 // Nearest body edge remains beyond x=+/-9.9, behind barriers at +/-6.05.
}
// Optional local glTF excavator: five merged PBR primitives and a low triangle
// budget. Lazy-load only when Rama II begins; keep the complete procedural
// fallback if loading, validation or mobile data-saver checks fail.
const ramaExcavatorSlots=[];
let ramaExcavatorRequested=false;
function queueRamaExcavatorModel(){
 if(ramaExcavatorRequested||navigator.connection?.saveData)return;
 ramaExcavatorRequested=true;
 new GLTFLoader().load('./assets/rama2-excavator.gltf',({scene:template})=>{
  try{
   let meshes=0,draws=0,triangles=0;
   template.traverse(o=>{
    if(!o.isMesh)return;
    meshes++;
    const parts=Array.isArray(o.material)?o.material:[o.material];
    draws+=parts.length;
    const geom=o.geometry;
    if(!geom?.attributes?.position)throw Error('Excavator glTF has no geometry');
    triangles+=(geom.index?.count||geom.attributes.position.count)/3;
   });
   const size=new THREE.Box3().setFromObject(template).getSize(new THREE.Vector3());
   if(!meshes||meshes>5||draws>6||triangles>2500||
      size.x<1.8||size.x>3.5||size.y<4.5||size.y>6||
      size.z<5.5||size.z>8.2)throw Error('Excavator glTF failed mobile budgets');
   for(const {slot,side} of ramaExcavatorSlots){
    const machine=template.clone(true);
    machine.position.set(side*10.9,0,15.2);
    machine.scale.x=side;
    machine.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;}});
    slot.clear();slot.add(machine);
   }
  }catch(error){console.warn('Rama II excavator glTF rejected; retaining fallback',error);}
 },undefined,error=>console.warn('Rama II excavator glTF unavailable; retaining fallback',error));
}
// Rama II: alternating amber construction beacons sit on the concrete barrier crowns.
// One shared low-poly cylinder + one instanced draw per work zone; no extra lights,
// network assets, shadows or objects in the player's dodge lane.
const ramaBeaconGeometry=new THREE.CylinderGeometry(.115,.14,.24,8);
const ramaBeaconMaterial=new THREE.MeshBasicMaterial({color:0xffffff,toneMapped:false});
const ramaBeaconMeshes=[];
let ramaBeaconPhase=-1;
function updateRamaBeacons(now){
 const phase=Math.floor(now/650)%2;
 if(phase===ramaBeaconPhase)return;
 ramaBeaconPhase=phase;
 for(const lamps of ramaBeaconMeshes){
  for(let i=0;i<lamps.count;i++)
   lamps.setColorAt(i,new THREE.Color((i+phase)%2===0?0xffa92b:0x483622));
  lamps.instanceColor.needsUpdate=true;
 }
}
// Rama II night construction: retroreflective Thai/English warning boards.
// One baked 512x256 PBR atlas, three instanced signs per work zone.
// Signs are at x=+/-7.35, entirely behind the x=+/-6.05 barriers.
const ramaWarningCanvas=document.createElement('canvas');
ramaWarningCanvas.width=512;ramaWarningCanvas.height=256;
const ramaWarningCtx=ramaWarningCanvas.getContext('2d');
ramaWarningCtx.fillStyle='#e9a42e';ramaWarningCtx.fillRect(0,0,512,256);
ramaWarningCtx.fillStyle='#191c20';ramaWarningCtx.fillRect(0,0,512,24);
ramaWarningCtx.fillRect(0,232,512,24);
for(let i=0;i<10;i++){
 ramaWarningCtx.fillStyle=i%2?'#e9a42e':'#191c20';
 ramaWarningCtx.beginPath();ramaWarningCtx.moveTo(i*56-15,0);
 ramaWarningCtx.lineTo(i*56+13,0);ramaWarningCtx.lineTo(i*56+35,24);
 ramaWarningCtx.lineTo(i*56+7,24);ramaWarningCtx.closePath();ramaWarningCtx.fill();
}
ramaWarningCtx.strokeStyle='#202024';ramaWarningCtx.lineWidth=9;
ramaWarningCtx.strokeRect(8,31,496,194);
ramaWarningCtx.textAlign='center';ramaWarningCtx.textBaseline='middle';
ramaWarningCtx.fillStyle='#101317';
ramaWarningCtx.font='bold 49px sans-serif';
ramaWarningCtx.fillText('ระวังเขตก่อสร้าง',256,93,470);
ramaWarningCtx.font='bold 40px Arial,sans-serif';
ramaWarningCtx.fillText('ROAD WORK AHEAD',256,166,480);
ramaWarningCtx.font='bold 21px Arial,sans-serif';
ramaWarningCtx.fillText('RAMA II  •  SLOW DOWN',256,208,480);
const ramaWarningTexture=new THREE.CanvasTexture(ramaWarningCanvas);
ramaWarningTexture.colorSpace=THREE.SRGBColorSpace;
ramaWarningTexture.anisotropy=2;
const ramaWarningMaterial=new THREE.MeshStandardMaterial({
 map:ramaWarningTexture,roughness:.63,metalness:.03,
 emissive:0xffffff,emissiveMap:ramaWarningTexture,emissiveIntensity:.42,
 side:THREE.DoubleSide
});
const ramaWarningGeometry=new THREE.PlaneGeometry(2.35,1.18);
const ramaWarningPostGeometry=new THREE.BoxGeometry(.075,.85,.075);
// Three portable floodlight masts per work zone. Amber ground spill is baked,
// not a real-time light: the entire effect uses four shared instanced draws per
// zone, one 64px texture, and no animation or shadows on mobile.
const ramaFloodPoleGeo=new THREE.BoxGeometry(.10,4.55,.10);
const ramaFloodHeadGeo=new THREE.BoxGeometry(.62,.36,.20);
const ramaFloodLensGeo=new THREE.PlaneGeometry(.52,.28);
const ramaFloodPoolGeo=new THREE.PlaneGeometry(3.0,4.4);
const ramaFloodHeadMat=new THREE.MeshStandardMaterial({color:0x575c60,metalness:.62,roughness:.48});
const ramaFloodLensMat=new THREE.MeshBasicMaterial({color:0xffe4aa,side:THREE.DoubleSide});
const ramaFloodCanvas=document.createElement('canvas');
ramaFloodCanvas.width=ramaFloodCanvas.height=64;
const ramaFloodCtx=ramaFloodCanvas.getContext('2d');
const ramaFloodGradient=ramaFloodCtx.createRadialGradient(32,32,2,32,32,32);
ramaFloodGradient.addColorStop(0,'rgba(255,211,128,.46)');
ramaFloodGradient.addColorStop(.45,'rgba(255,186,96,.20)');
ramaFloodGradient.addColorStop(1,'rgba(255,168,70,0)');
ramaFloodCtx.fillStyle=ramaFloodGradient;
ramaFloodCtx.fillRect(0,0,64,64);
const ramaFloodTexture=new THREE.CanvasTexture(ramaFloodCanvas);
ramaFloodTexture.colorSpace=THREE.SRGBColorSpace;
const ramaFloodPoolMat=new THREE.MeshBasicMaterial({
 map:ramaFloodTexture,transparent:true,depthWrite:false,
 blending:THREE.AdditiveBlending,polygonOffset:true,polygonOffsetFactor:-1
});
// Rama II weathered corrugated-steel site hoarding. Two shared 256x128
// PBR atlases and one opaque instanced draw per work zone, off the road.
const ramaHoardPaint=document.createElement('canvas');
const ramaHoardRough=document.createElement('canvas');
ramaHoardPaint.width=ramaHoardRough.width=256;
ramaHoardPaint.height=ramaHoardRough.height=128;
const rhp=ramaHoardPaint.getContext('2d'),rhr=ramaHoardRough.getContext('2d');
rhp.fillStyle='#53696b';rhp.fillRect(0,0,256,128);
rhr.fillStyle='#dfdfdf';rhr.fillRect(0,0,256,128);
// Raised metal ribs, faded paint, corroded fasteners and dirt streaks.
for(let x=0;x<256;x+=12){
 rhp.fillStyle='#344b4e';rhp.fillRect(x,0,2,128);
 rhp.fillStyle='#879393';rhp.fillRect(x+3,0,2,128);
 rhp.fillStyle='#627a7c';rhp.fillRect(x+5,0,5,128);
 rhr.fillStyle='#bdbdbd';rhr.fillRect(x+3,0,2,128);
 for(const y of [11,116]){
  rhp.fillStyle='#6e4935';rhp.fillRect(x+5,y,4,4);
  rhp.fillStyle='#b69a76';rhp.fillRect(x+6,y,1,1);
 }
}
for(let i=0;i<220;i++){
 const px=(i*73+19)%256,py=(i*47+11)%128;
 rhp.fillStyle=i%4===0?'rgba(132,81,51,.24)':'rgba(24,32,33,.13)';
 rhp.fillRect(px,py,1+i%3,2+i%6);
}
const ramaHoardMap=new THREE.CanvasTexture(ramaHoardPaint);
ramaHoardMap.colorSpace=THREE.SRGBColorSpace;
const ramaHoardRoughMap=new THREE.CanvasTexture(ramaHoardRough);
const ramaHoardMaterial=new THREE.MeshStandardMaterial({
 color:0xffffff,map:ramaHoardMap,roughnessMap:ramaHoardRoughMap,
 roughness:.9,metalness:.28,side:THREE.FrontSide
});
const ramaHoardGeometry=new THREE.PlaneGeometry(6.35,2.9);
function ramaWorkZone(side,z){
 const g=new THREE.Group();
 // Fourteen weathered precast barriers and inward-facing hazard chevrons.
 const barriers=new THREE.InstancedMesh(siteBarrierGeo,siteConcrete,14);
 const stripes=new THREE.InstancedMesh(siteStripeGeo,siteStripeMaterial,14);
 const stripeMatrix=new THREE.Matrix4().makeRotationY(-side*Math.PI/2);
 for(let i=0;i<14;i++){
  const zz=-26+i*4;
  barriers.setMatrixAt(i,new THREE.Matrix4().makeTranslation(side*6.05,.48,zz));
  stripeMatrix.setPosition(side*5.72,.62,zz);
  stripes.setMatrixAt(i,stripeMatrix);
 }
 barriers.instanceMatrix.needsUpdate=true;stripes.instanceMatrix.needsUpdate=true;
 g.add(barriers,stripes);
 // Seven retroreflective amber warning lamps, spaced every 8m along the barrier.
 const beacons=new THREE.InstancedMesh(ramaBeaconGeometry,ramaBeaconMaterial,7);
 for(let i=0;i<7;i++)
  beacons.setMatrixAt(i,new THREE.Matrix4().makeTranslation(side*6.05,1.08,-26+i*8));
 beacons.instanceMatrix.needsUpdate=true;
 beacons.computeBoundingSphere();
 g.add(beacons);ramaBeaconMeshes.push(beacons);
 // Portable amber construction floodlights illuminate the parked machinery
 // without adding shadow-casting lights or spilling into the player's dodge lane.
 const floodPoles=new THREE.InstancedMesh(ramaFloodPoleGeo,siteSteel,3);
 const floodHeads=new THREE.InstancedMesh(ramaFloodHeadGeo,ramaFloodHeadMat,3);
 const floodLenses=new THREE.InstancedMesh(ramaFloodLensGeo,ramaFloodLensMat,3);
 const floodPools=new THREE.InstancedMesh(ramaFloodPoolGeo,ramaFloodPoolMat,3);
 const floodPose=new THREE.Object3D();
 for(let i=0;i<3;i++){
  const zz=-17+i*17,xx=side*8.15;
  floodPose.rotation.set(0,0,0);
  floodPose.position.set(xx,2.275,zz);
  floodPose.updateMatrix();floodPoles.setMatrixAt(i,floodPose.matrix);
  floodPose.rotation.set(0,-side*Math.PI/2,0);
  floodPose.position.set(xx,4.56,zz);
  floodPose.updateMatrix();floodHeads.setMatrixAt(i,floodPose.matrix);
  // The lens faces inward toward the road, but stays behind x=+/-6.05.
  floodPose.position.set(xx-side*.115,4.56,zz);
  floodPose.updateMatrix();floodLenses.setMatrixAt(i,floodPose.matrix);
  floodPose.rotation.set(-Math.PI/2,0,0);
  floodPose.position.set(side*7.85,.075,zz);
  floodPose.updateMatrix();floodPools.setMatrixAt(i,floodPose.matrix);
 }
 for(const mesh of [floodPoles,floodHeads,floodLenses,floodPools]){
  mesh.instanceMatrix.needsUpdate=true;
  mesh.computeBoundingSphere();
  g.add(mesh);
 }
 // Three roadside Thai/English roadwork boards use one instanced draw call.
 // Mounting posts stay entirely behind the concrete barriers, never in a dodge lane.
 const warningBoards=new THREE.InstancedMesh(ramaWarningGeometry,ramaWarningMaterial,3);
 const warningPosts=new THREE.InstancedMesh(ramaWarningPostGeometry,siteSteel,6);
 for(let i=0;i<3;i++){
  const signZ=-20+i*20,signX=side*7.35;
  warningBoards.setMatrixAt(i,new THREE.Matrix4().makeTranslation(signX,2.20,signZ));
  for(let p=0;p<2;p++)warningPosts.setMatrixAt(i*2+p,
   new THREE.Matrix4().makeTranslation(signX+(p?-.69:.69),1.33,signZ-.045));
 }
 for(const mesh of [warningBoards,warningPosts]){
  mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();g.add(mesh);
 }

 // Corrugated construction hoarding stands behind the x=+/-6.05
 // barriers at x=+/-8.45, never in a playable dodge lane.
 const hoarding=new THREE.InstancedMesh(ramaHoardGeometry,ramaHoardMaterial,8);
 const hoardPose=new THREE.Object3D();
 for(let i=0;i<8;i++){
  hoardPose.position.set(side*8.45,1.54,-22.4+i*6.4);
  hoardPose.rotation.set(0,side===1?-Math.PI/2:Math.PI/2,0);
  hoardPose.updateMatrix();hoarding.setMatrixAt(i,hoardPose.matrix);
 }
 hoarding.instanceMatrix.needsUpdate=true;
 hoarding.computeBoundingSphere();g.add(hoarding);
 // A separate unfinished pier, behind the barriers and clear of the roadway.
 g.add(cube(2.4,.7,2.4,siteConcrete,side*10,.35,-6));
 g.add(cube(1.7,10,1.7,siteConcrete,side*10,5.35,-6));
 g.add(cube(3.3,.65,3.1,siteConcrete,side*10,10.65,-6));
 // A real reinforcement cage has four upright bars and six closed
 // rectangular stirrups. All 28 pieces render in ONE instanced draw call.
 // The entire cage remains behind the x=+/-6.05 roadside barriers.
 const rebar=new THREE.InstancedMesh(ramaRebarGeometry,ramaRebarMaterial,28);
 const rebarPose=new THREE.Object3D();
 let rebarIndex=0;
 function addRebar(px,py,pz,w,h,d){
  rebarPose.position.set(px,py,pz);
  rebarPose.scale.set(w,h,d);
  rebarPose.updateMatrix();
  rebar.setMatrixAt(rebarIndex++,rebarPose.matrix);
 }
 for(const dx of [-.58,.58])for(const dz of [-.58,.58])
  addRebar(side*10+dx,12.35,-6+dz,.075,2.8,.075);
 for(let level=0;level<6;level++){
  const y=11.15+level*.43;
  for(const dz of [-.59,.59])
   addRebar(side*10,y,-6+dz,1.18,.055,.055);
  for(const dx of [-.59,.59])
   addRebar(side*10+dx,y,-6,.055,.055,1.18);
 }
 if(rebarIndex!==28)throw Error('Rama II rebar instance count mismatch');
 rebar.instanceMatrix.needsUpdate=true;
 rebar.computeBoundingSphere();
 g.add(rebar);
 // Shared-geometry lattice crane: open tower, triangulated jib and counter-jib.
 // It stays at x=+/-14, behind the x=+/-6.05 barriers; one yellow draw call.
 addRamaLatticeCrane(g,side);
 // Parked excavator: local glTF swaps in only after it passes geometry budgets.
 // The procedural machine remains visible and playable on slow/offline devices.
 const excavatorSlot=new THREE.Group();g.add(excavatorSlot);
 addRamaExcavator(excavatorSlot,side);
 ramaExcavatorSlots.push({slot:excavatorSlot,side});
 // Weathered green construction safety mesh encloses the unfinished pier.
 // Perforated alpha-test fabric (no alpha blending) is baked once and instanced;
 // all scaffolding remains beyond x=+/-8.7, well outside the drivable lanes.
 const safetyScreens=new THREE.InstancedMesh(ramaSafetyNetGeometry,ramaSafetyNetMaterial,4);
 const scaffoldUprights=new THREE.InstancedMesh(ramaScaffoldPostGeometry,siteSteel,5);
 const scaffoldCrossbars=new THREE.InstancedMesh(ramaScaffoldCrossbarGeometry,siteSteel,2);
 const safetyMatrix=new THREE.Matrix4().makeRotationY(Math.PI/2);
 for(let i=0;i<4;i++){
  safetyMatrix.setPosition(side*8.7,5.7,-12+i*3.2);
  safetyScreens.setMatrixAt(i,safetyMatrix);
 }
 for(let i=0;i<5;i++){
  scaffoldUprights.setMatrixAt(i,new THREE.Matrix4().makeTranslation(side*8.7,5.6,-13.6+i*3.2));
 }
 for(let i=0;i<2;i++){
  scaffoldCrossbars.setMatrixAt(i,new THREE.Matrix4().makeTranslation(side*8.7,i===0?2.1:9.1,-7.2));
 }
 for(const mesh of [safetyScreens,scaffoldUprights,scaffoldCrossbars]){
  mesh.instanceMatrix.needsUpdate=true;
  mesh.computeBoundingSphere();
  g.add(mesh);
 }
 g.position.z=z;g.visible=false;scene.add(g);
 ramaStructures.push(g);
}
ramaWorkZone(-1,-44);
ramaWorkZone(1,-142);
// Lightweight roadside shops: shared canvas materials, no external assets.
const roadsideShops=[];
function shopBillboard(text,bg,fg){const c=document.createElement('canvas');c.width=512;c.height=160;const p=c.getContext('2d');p.fillStyle=bg;p.fillRect(0,0,512,160);p.fillStyle=fg;p.font='bold 70px sans-serif';p.textAlign='center';p.textBaseline='middle';p.fillText(text,256,84,488);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return new THREE.MeshBasicMaterial({map:t,side:THREE.DoubleSide})}
// A compact storefront-mounted 7-Eleven lightbox. No freestanding building.
function sevenFacadeMaterial(){
 const c=document.createElement('canvas');c.width=512;c.height=220;const p=c.getContext('2d');
 p.fillStyle='#f7f7ee';p.fillRect(0,0,512,220);
 p.fillStyle='#00834b';p.fillRect(0,0,512,24);p.fillRect(0,195,512,25);
 p.fillStyle='#e85e24';p.fillRect(0,25,512,16);p.fillRect(0,178,512,16);
 p.fillStyle='#e62930';p.fillRect(0,42,512,10);
 p.fillStyle='#e62930';p.font='bold 112px sans-serif';p.textAlign='center';p.textBaseline='middle';p.fillText('7',105,115);
 p.fillStyle='#087447';p.font='bold 72px sans-serif';p.fillText('ELEVEN',318,119);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
 return new THREE.MeshBasicMaterial({map:t,side:THREE.DoubleSide});
}
const convenienceSign=sevenFacadeMaterial(),lotusSign=shopBillboard('Lotus’s','#1761aa','#ffffff'),dormSign=shopBillboard('หอพักหญิง','#a6428b','#ffffff');
function roadsideStore(kind,side,z,stage){
 const g=new THREE.Group(),isYaowarat=stage===1;
 const sign=kind==='lotus'?lotusSign:kind==='dorm'?dormSign:convenienceSign;
 const width=isYaowarat?2.75:kind==='lotus'?4.5:kind==='dorm'?3.6:3.1;
 const board=new THREE.Mesh(new THREE.PlaneGeometry(width,isYaowarat?1.16:1.4),sign);
 // Yaowarat facades run along the road (Z), not across it (X).
 // Mount the board flush with the existing shophouse frontage at x=+/-5.84.
 if(isYaowarat){
  board.rotation.y=side<0?Math.PI/2:-Math.PI/2;
  board.position.set(side*5.70,3.12,0);
  // Thin backing parallel to the wall, rather than a box protruding into the street.
  g.add(cube(.08,1.25,width+.08,mat(0x24242b),side*5.77,3.12,0));
 }else{
  board.position.set(side*8.3,5.2,0);
 }
 g.add(board);
 if(!isYaowarat && kind==='lotus'){
  // Rama II supermarket: place a real storefront behind the sign instead of a floating billboard.
  const facadeX=side*9.45,wall=mat(0xe8eceb),glass=mat(0x387b84),roof=mat(0x168d78);
  g.add(cube(3.6,4.5,11,wall,facadeX,2.3,0));
  g.add(cube(.12,2.8,8.8,glass,side*7.58,1.7,0));
  g.add(cube(4.1,.35,11.6,roof,facadeX,4.65,0));
  g.add(cube(.7,.18,9.5,roof,side*7.35,3.22,0));
  // Keep the sign anchored to the shop frontage, not on a freestanding pole.
  board.rotation.y=side<0?Math.PI/2:-Math.PI/2;
  board.position.set(side*7.48,4.02,0);
 }
 if(!isYaowarat && kind!=='lotus'){
  const pole=mat(0x737c7e);
  g.add(cube(.13,4.65,.13,pole,side*8.3,2.35,0));
 }
 g.position.z=z;g.visible=false;scene.add(g);
 roadsideShops.push({g,stage,startZ:z});
}
roadsideStore('seven',-1,-22,1);
roadsideStore('seven',1,-112,1);
// Additional wall-mounted shop signs: repeated along the scrolling street.
roadsideStore('seven',1,-58,1);
roadsideStore('seven',-1,-158,1);
roadsideStore('seven',-1,-35,2);
roadsideStore('seven',1,-132,2);
roadsideStore('lotus',1,-83,2);
roadsideStore('dorm',-1,-145,2);
// Rama II roadside Thai temple: stylized ordination hall, layered gables and chedi.
function roadsideTemple(side,z){const g=new THREE.Group(),ivory=mat(0xf2dfb1),roof=mat(0x9e2933),gold=mat(0xe8b64b),trim=mat(0xf7d66a);g.add(cube(6.8,.55,10,ivory,0,.35,0));g.add(cube(5.6,4.2,8.5,ivory,0,2.75,0));for(const x of [-2.5,2.5])for(const zz of [-3.5,-1.2,1.2,3.5])g.add(cube(.27,3.8,.27,gold,x,2.6,zz));for(let tier=0;tier<3;tier++){const w=7.4-tier*.9,y=5.05+tier*.75;const left=cube(w/2,.25,10.2-tier*.6,roof,-w/4,y,0),right=cube(w/2,.25,10.2-tier*.6,roof,w/4,y,0);left.rotation.z=.33;right.rotation.z=-.33;g.add(left,right);g.add(cube(.17,.24,10.2-tier*.6,trim,0,y+.47,0))}g.add(cube(1.45,2.8,.12,gold,0,1.9,4.32));for(const x of [-1.7,1.7])g.add(cube(.8,1.25,.12,mat(0x4d6a85),x,2.6,4.33));const chedi=new THREE.Group();chedi.add(cube(2.6,1.2,2.6,ivory,0,.6,0));const spire=new THREE.Mesh(new THREE.ConeGeometry(1.25,6,8),gold);spire.position.y=4.2;chedi.add(spire);chedi.position.set(-5.3,0,-1.7);g.add(chedi);g.rotation.y=side<0?Math.PI/2:-Math.PI/2;g.position.set(side*11.6,0,z);g.scale.setScalar(1.28);g.visible=false;scene.add(g);roadsideShops.push({g,stage:2,startZ:z});}
roadsideTemple(1,-62);roadsideTemple(-1,-157);
const landmarkNeon=new THREE.MeshBasicMaterial({color:0xff4338}),landmarkGold=new THREE.MeshBasicMaterial({color:0xf5bd55}),landmarkWhite=new THREE.MeshLambertMaterial({color:0xe9e2d5}),landmarkStone=new THREE.MeshLambertMaterial({color:0xddd9cc}),landmarkGreen=new THREE.MeshLambertMaterial({color:0x116d56});
function labelTexture(lines,bg,fg){const c=document.createElement('canvas');c.width=512;c.height=256;const ctx=c.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,512,256);ctx.strokeStyle='#ffd66c';ctx.lineWidth=12;ctx.strokeRect(8,8,496,240);ctx.fillStyle=fg;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 65px sans-serif';lines.forEach((line,i)=>ctx.fillText(line,256,lines.length===1?128:77+i*103,480));const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return new THREE.MeshBasicMaterial({map:t,side:THREE.DoubleSide})}
const chineseSigns=[labelTexture(['中國城'],'#a10e14','#ffd44a'),labelTexture(['海鮮','酒樓'],'#751114','#ffcb4d'),labelTexture(['CHINA TOWN'],'#aa191c','#f8e0a4')];
const roadSigns=[labelTexture(['มหาชัย','MAHA CHAI'],'#08734c','#ffffff'),labelTexture(['สมุทรสาคร','SAMUT SAKHON'],'#08734c','#ffffff')];
function makeLandmark(kind,x,z){const g=new THREE.Group();if(kind==='yaowarat'){for(let i=0;i<3;i++){const board=new THREE.Mesh(new THREE.PlaneGeometry(2.2,3.5),chineseSigns[i]);board.position.set((i-1)*1.4,5.5+i*1.65,0);board.rotation.y=x<0?Math.PI/2:-Math.PI/2;g.add(board);g.add(cube(.16,3.8,.15,landmarkGold,(i-1)*1.4,5.5+i*1.65,-.15))}for(let i=0;i<4;i++)g.add(ball(.2,landmarkNeon,(i-1.5)*.65,4.3,-.35))}
else if(kind==='palace'){g.add(cube(2.8,3.3,8.2,landmarkWhite,0,1.65,0));for(let i=0;i<4;i++){g.add(cube(.46,4.1,.5,landmarkStone,0,2.2,(i-1.5)*2));const spire=new THREE.Mesh(new THREE.ConeGeometry(.35,1.8,6),landmarkGold);spire.position.set(0,5.1,(i-1.5)*2);g.add(spire)}g.add(cube(2.95,.32,8.5,landmarkGold,0,3.45,0))}
else if(kind==='highway'){g.add(cube(2.1,8,1.3,landmarkStone,0,4,0));g.add(cube(5,.9,18,landmarkStone,0,8.2,0));g.add(cube(5.1,.2,18,landmarkGold,0,8.7,0))}
else if(kind==='direction'){const board=new THREE.Mesh(new THREE.PlaneGeometry(5,2),roadSigns[Math.abs(Math.round(z))%2]);board.position.set(0,7,0);board.rotation.y=x<0?Math.PI/2:-Math.PI/2;g.add(board);g.add(cube(.14,6.5,.14,landmarkStone,0,3.5,0))}
g.position.set(x,0,z);scene.add(g);props.push(g);return g}
for(let i=0;i<4;i++){const z=-18-i*42;makeLandmark('yaowarat',i%2?-12:12,z);if(i%2===0)makeLandmark('palace',-14,z-18);else makeLandmark('direction',14,z-18);if(i===2)makeLandmark('direction',-8,z-10)}

// Large, road-facing set pieces: visible from the player's forward camera.
const yaowaratGate=new THREE.Group();
yaowaratGate.add(cube(.32,7,.32,landmarkGold,-6.35,3.5,0));
yaowaratGate.add(cube(.32,7,.32,landmarkGold,6.35,3.5,0));
yaowaratGate.add(cube(13,.25,.35,landmarkGold,0,7,0));
const chinaBoard=new THREE.Mesh(new THREE.PlaneGeometry(10.8,2.2),chineseSigns[0]);chinaBoard.position.set(0,6.05,.22);yaowaratGate.add(chinaBoard);
const chinaBoardBack=chinaBoard.clone();chinaBoardBack.rotation.y=Math.PI;chinaBoardBack.position.z=-.22;yaowaratGate.add(chinaBoardBack);
yaowaratGate.position.z=-24;scene.add(yaowaratGate);props.push(yaowaratGate);
const palaceWall=new THREE.Group();palaceWall.add(cube(.85,3.6,33,landmarkWhite,0,1.8,0));palaceWall.add(cube(1.15,.27,33.2,landmarkGold,0,3.6,0));
for(let i=0;i<5;i++){const zz=-13+i*6.5;palaceWall.add(cube(1.2,4.6,1.1,landmarkStone,0,2.3,zz));const tip=new THREE.Mesh(new THREE.ConeGeometry(.72,1.8,6),landmarkGold);tip.position.set(0,5.5,zz);palaceWall.add(tip)}
palaceWall.position.set(-7.55,0,-83);scene.add(palaceWall);props.push(palaceWall);
const highwaySpan=new THREE.Group();highwaySpan.add(cube(.9,8,.9,landmarkStone,-7,4,0));highwaySpan.add(cube(.9,8,.9,landmarkStone,7,4,0));highwaySpan.add(cube(16,.9,4.2,landmarkStone,0,8.2,0));
const highwayBoard=new THREE.Mesh(new THREE.PlaneGeometry(9.5,2.7),roadSigns[1]);highwayBoard.position.set(0,6.9,2.15);highwaySpan.add(highwayBoard);
// Keep the highway gantry out of Yaowarat: it obstructed the camera and looked like a giant yellow beam.
// highwaySpan intentionally not added to the scene.


// Yaowarat utility poles and sagging power/telecom lines. Three shared instanced
// meshes replace 54 separate draw calls; the cables scroll with the streetscape.
const cableMat=new THREE.MeshStandardMaterial({color:0x292d32,metalness:.12,roughness:.91});
const cablePoleGeo=new THREE.CylinderGeometry(.07,.095,8,6);
const cableArmGeo=new THREE.BoxGeometry(.85,.085,.12);
const cableCurve=new THREE.QuadraticBezierCurve3(
 new THREE.Vector3(0,0,0),new THREE.Vector3(0,-1.2,-11),new THREE.Vector3(0,0,-22)
);
const cableSpanGeo=new THREE.TubeGeometry(cableCurve,16,.021,4,false);
const wirePoles=new THREE.InstancedMesh(cablePoleGeo,cableMat,18);
const wireArms=new THREE.InstancedMesh(cableArmGeo,cableMat,18);
const wireRuns=new THREE.InstancedMesh(cableSpanGeo,cableMat,54);
const wireMatrix=new THREE.Matrix4();
const wireSegments=Array.from({length:9},(_,i)=>10-i*22);
for(const mesh of [wirePoles,wireArms,wireRuns]){
 mesh.frustumCulled=false;mesh.visible=true;scene.add(mesh);
}
function updateYaowaratWires(advance=0,resetPositions=false){
 for(let i=0;i<wireSegments.length;i++){
  if(resetPositions)wireSegments[i]=10-i*22;
  else if(advance){wireSegments[i]+=advance;if(wireSegments[i]>32)wireSegments[i]-=198;}
  const z=wireSegments[i];
  for(let s=0;s<2;s++){
   const side=s===0?-1:1,idx=i*2+s;
   wireMatrix.makeTranslation(side*6.95,4,z);wirePoles.setMatrixAt(idx,wireMatrix);
   wireMatrix.makeTranslation(side*6.95,7.2,z);wireArms.setMatrixAt(idx,wireMatrix);
   for(let n=0;n<3;n++){
    wireMatrix.makeTranslation(side*(6.75+n*.2),7.12-n*.11,z);
    wireRuns.setMatrixAt(idx*3+n,wireMatrix);
   }
  }
 }
 wirePoles.instanceMatrix.needsUpdate=true;
 wireArms.instanceMatrix.needsUpdate=true;
 wireRuns.instanceMatrix.needsUpdate=true;
}
updateYaowaratWires();
const car=new THREE.Group();const cockpit=new THREE.Group();camera.add(cockpit);scene.add(camera);cockpit.scale.setScalar(.76);cockpit.position.y=-.22;// PBR driver cockpit: reuse existing meshes, with no extra draw calls.
const cockpitMat=new THREE.MeshStandardMaterial({color:0x1b2030,metalness:.08,roughness:.83});
const cockpitChrome=new THREE.MeshStandardMaterial({color:0xbac7ce,metalness:.76,roughness:.29});cockpit.add(cube(2.2,.16,.5,cockpitMat,0,-.94,-1.2));cockpit.add(cube(1.35,.09,.12,cockpitChrome,0,-.57,-1.35));cockpit.add(cube(.10,.48,.1,cockpitChrome,0,-.8,-1.32));for(const side of [-1,1]){cockpit.add(cube(.075,1.25,.075,cockpitChrome,side*1.08,-.18,-1.4));cockpit.add(cube(.34,.43,.055,cockpitMat,side*1.12,-.22,-1.68))}
// Shared 256x128 weathered metal finish on the always-visible dashboard.
const cockpitFinishCanvas=document.createElement('canvas');
cockpitFinishCanvas.width=256;cockpitFinishCanvas.height=128;
const cockpitFinishCtx=cockpitFinishCanvas.getContext('2d');
const cockpitFinishGradient=cockpitFinishCtx.createLinearGradient(0,0,0,128);
cockpitFinishGradient.addColorStop(0,'#f0f0ed');
cockpitFinishGradient.addColorStop(.48,'#d4d4d0');
cockpitFinishGradient.addColorStop(1,'#a6a6a1');
cockpitFinishCtx.fillStyle=cockpitFinishGradient;
cockpitFinishCtx.fillRect(0,0,256,128);
for(let i=0;i<310;i++){
 const px=(i*73+11)%256,py=(i*47+19)%128;
 cockpitFinishCtx.fillStyle=i%5===0?'rgba(55,48,41,.16)':'rgba(255,255,255,.13)';
 cockpitFinishCtx.fillRect(px,py,2+(i%6),1);
}
for(const px of [13,243]){
 for(const py of [15,113]){
  cockpitFinishCtx.fillStyle='#737573';cockpitFinishCtx.beginPath();
  cockpitFinishCtx.arc(px,py,4,0,Math.PI*2);cockpitFinishCtx.fill();
  cockpitFinishCtx.strokeStyle='#dedfd9';cockpitFinishCtx.lineWidth=1;
  cockpitFinishCtx.beginPath();cockpitFinishCtx.moveTo(px-2,py);cockpitFinishCtx.lineTo(px+2,py);cockpitFinishCtx.stroke();
 }
}
// Baked tuk-tuk instrument cluster: two recessed analogue dials and worn
// chrome bezels on the existing cockpit atlas. Zero extra meshes/draw calls.
// Keep the numerals inside the dashboard rather than obscuring the road.
for(const [cx,r] of [[96,31],[160,25]]){
 const cy=66;
 cockpitFinishCtx.fillStyle='#293038';
 cockpitFinishCtx.beginPath();cockpitFinishCtx.arc(cx,cy,r+5,0,Math.PI*2);cockpitFinishCtx.fill();
 cockpitFinishCtx.strokeStyle='#aab1ae';cockpitFinishCtx.lineWidth=3;
 cockpitFinishCtx.beginPath();cockpitFinishCtx.arc(cx,cy,r+3,0,Math.PI*2);cockpitFinishCtx.stroke();
 cockpitFinishCtx.strokeStyle='rgba(255,255,255,.26)';cockpitFinishCtx.lineWidth=1;
 cockpitFinishCtx.beginPath();cockpitFinishCtx.arc(cx,cy,r,Math.PI*1.05,Math.PI*1.95);cockpitFinishCtx.stroke();
 for(let tick=0;tick<=10;tick++){
  const angle=Math.PI*(1.12+tick*.176);
  const inner=r-(tick%2===0?10:6),outer=r-3;
  cockpitFinishCtx.strokeStyle=tick>7?'#ce7658':'#d9d8c5';
  cockpitFinishCtx.lineWidth=tick%2===0?2:1;
  cockpitFinishCtx.beginPath();
  cockpitFinishCtx.moveTo(cx+Math.cos(angle)*inner,cy+Math.sin(angle)*inner);
  cockpitFinishCtx.lineTo(cx+Math.cos(angle)*outer,cy+Math.sin(angle)*outer);
  cockpitFinishCtx.stroke();
 }
 cockpitFinishCtx.strokeStyle='#e6b866';cockpitFinishCtx.lineWidth=2.5;
 cockpitFinishCtx.beginPath();cockpitFinishCtx.moveTo(cx,cy);
 cockpitFinishCtx.lineTo(cx+Math.cos(3.72)*(r-11),cy+Math.sin(3.72)*(r-11));
 cockpitFinishCtx.stroke();
 cockpitFinishCtx.fillStyle='#b5b8b1';
 cockpitFinishCtx.beginPath();cockpitFinishCtx.arc(cx,cy,3,0,Math.PI*2);cockpitFinishCtx.fill();
}
cockpitFinishCtx.textAlign='center';cockpitFinishCtx.textBaseline='middle';
cockpitFinishCtx.font='bold 9px sans-serif';cockpitFinishCtx.fillStyle='#d9d8c5';
cockpitFinishCtx.fillText('km/h',96,81);cockpitFinishCtx.fillText('FUEL',160,79);
const cockpitFinishTexture=new THREE.CanvasTexture(cockpitFinishCanvas);
cockpitFinishTexture.colorSpace=THREE.SRGBColorSpace;
cockpitFinishTexture.anisotropy=mobile?2:4;
 // Repaint the existing 256x128 PBR dashboard map only on district changes.
 // Real Bangkok shop neon glances across the two bonnet shoulders; blackout
 // roads restore the original brushed-metal finish. No new texture/draw call.
 const cockpitFinishBasePixels=cockpitFinishCtx.getImageData(0,0,256,128);
 function paintCockpitFinishDistrict(stage){
  cockpitFinishCtx.putImageData(cockpitFinishBasePixels,0,0);
  const colors=stage===1?['rgba(229,47,73,.36)','rgba(27,191,204,.28)','rgba(233,159,57,.23)','rgba(218,54,96,.32)']:
   stage===2?['rgba(200,117,42,.10)','rgba(221,153,69,.09)']:
   stage===3?['rgba(180,126,73,.14)','rgba(121,158,142,.11)']:
   stage===4?['rgba(230,165,79,.18)','rgba(190,214,222,.11)']:
   stage===5?['rgba(220,54,151,.30)','rgba(61,161,220,.26)','rgba(222,121,63,.17)','rgba(188,68,184,.25)']:[];
  const shoulders=[23,57,201,233];
  for(let i=0;i<colors.length;i++){
   const x=shoulders[i];
   const glow=cockpitFinishCtx.createLinearGradient(x-24,0,x+24,0);
   glow.addColorStop(0,'rgba(0,0,0,0)');
   glow.addColorStop(.5,colors[i]);
   glow.addColorStop(1,'rgba(0,0,0,0)');
   cockpitFinishCtx.fillStyle=glow;
   cockpitFinishCtx.fillRect(x-24,8,48,106);
  }
  // A short soft wet highlight sits below the windscreen, not over the road.
  if(stage===1||stage===5){
   const edge=cockpitFinishCtx.createLinearGradient(0,0,0,18);
   edge.addColorStop(0,'rgba(233,238,245,.21)');
   edge.addColorStop(1,'rgba(233,238,245,0)');
   cockpitFinishCtx.fillStyle=edge;
   cockpitFinishCtx.fillRect(0,0,256,18);
  }
  cockpitFinishTexture.needsUpdate=true;
 }
 paintCockpitFinishDistrict(1);
const cockpitBlue=new THREE.MeshPhysicalMaterial({color:0x1693a3,map:cockpitFinishTexture,metalness:.4,roughness:.48,clearcoat:.35,clearcoatRoughness:.36});
const cockpitGold=new THREE.MeshStandardMaterial({color:0xe6b958,map:cockpitFinishTexture,metalness:.6,roughness:.39});
const cockpitRed=new THREE.MeshStandardMaterial({color:0xc73556,metalness:.18,roughness:.58});
// Baked, intentionally soft night-street reflections in the existing side-mirror faces.
// No secondary camera, render target, additional geometry or per-frame allocations.
const cockpitMirrorCanvas=document.createElement('canvas');
cockpitMirrorCanvas.width=192;cockpitMirrorCanvas.height=128;
const mirrorCtx=cockpitMirrorCanvas.getContext('2d');
// Paint the SAME side-mirror atlas only when the district changes. The old
// permanently neon-lit skyline looked wrong in the Rama II blackout and Dark
// Road. Baked location-specific reflections cost no camera, render target,
// draw call, per-frame canvas work or additional GPU texture.
function paintCockpitMirrorDistrict(stage){
 const blackout=stage===2||stage===6;
 const yaowarat=stage===1,market=stage===3,expressway=stage===4,pattaya=stage===5;
 const sky=mirrorCtx.createLinearGradient(0,0,0,128);
 const top=stage===6?'#03070b':stage===2?'#0c1118':yaowarat?'#293c4b':market?'#34404a':expressway?'#243447':pattaya?'#2e2542':'#6d8292';
 const horizon=stage===6?'#0a1013':stage===2?'#20252b':market?'#57483b':pattaya?'#39243c':'#26343d';
 sky.addColorStop(0,top);sky.addColorStop(.68,horizon);sky.addColorStop(1,'#151d25');
 mirrorCtx.fillStyle=sky;mirrorCtx.fillRect(0,0,192,128);
 // Near-black treeline / temporary construction silhouettes for unlit roads;
 // Bangkok buildings and warm street-fronts only where those actually exist.
 mirrorCtx.fillStyle=blackout?'#080e12':'#14232d';
 for(let i=0;i<13;i++){
  const bx=i*17-8,bh=blackout?11+(i*17)%23:26+(i*29)%52;
  if(stage===6){
   mirrorCtx.beginPath();mirrorCtx.moveTo(bx,88);mirrorCtx.lineTo(bx+7,88-bh);
   mirrorCtx.lineTo(bx+16,88);mirrorCtx.fill();
  }else{
   mirrorCtx.fillRect(bx,88-bh,stage===2?5:15,bh);
  }
 }
 if(stage===2){
  // Sparse construction gantries and one amber safety beacon, not shop neon.
  mirrorCtx.strokeStyle='#424a4d';mirrorCtx.lineWidth=2;
  for(const bx of [27,109,171]){
   mirrorCtx.beginPath();mirrorCtx.moveTo(bx,72);mirrorCtx.lineTo(bx,37);
   mirrorCtx.lineTo(bx+24,37);mirrorCtx.stroke();
  }
  mirrorCtx.fillStyle='#bd6e30';mirrorCtx.fillRect(109,34,3,3);
 }else if(yaowarat||pattaya){
  const lights=yaowarat?['#f25d64','#e7b454','#35bfc0']:['#e34fa4','#5ab8ed','#d1a04f'];
  for(let i=0;i<9;i++){
   const bx=5+i*21,by=27+(i*17)%35;
   mirrorCtx.fillStyle=lights[i%lights.length];
   mirrorCtx.fillRect(bx,by,3+(i%3)*2,13+(i%4)*3);
   mirrorCtx.fillStyle='rgba(255,238,199,.45)';
   mirrorCtx.fillRect(bx+1,by+2,1,4);
  }
 }else if(market){
  for(let i=0;i<7;i++){
   const bx=i*31-6;
   mirrorCtx.fillStyle=i%2?'#6d5141':'#a68a58';
   mirrorCtx.beginPath();mirrorCtx.moveTo(bx,76);
   mirrorCtx.lineTo(bx+16,63);mirrorCtx.lineTo(bx+32,76);mirrorCtx.fill();
   mirrorCtx.fillStyle='#d2a866';mirrorCtx.fillRect(bx+12,77,5,4);
  }
 }else if(expressway){
  for(let i=0;i<6;i++){
   const bx=8+i*34;
   mirrorCtx.fillStyle='#d2a46d';mirrorCtx.fillRect(bx,60,2,20);
   mirrorCtx.fillStyle='rgba(255,218,149,.70)';mirrorCtx.fillRect(bx-2,58,6,2);
  }
 }
 const road=mirrorCtx.createLinearGradient(0,84,0,128);
 road.addColorStop(0,blackout?'#262a2b':'#4a5050');
 road.addColorStop(1,'#101820');
 mirrorCtx.fillStyle=road;mirrorCtx.fillRect(0,85,192,43);
 // Headlight/taillight streaks remain subdued in the blackout stages.
 for(let i=0;i<(blackout?5:19);i++){
  const px=(i*43+13)%192,py=89+(i*17)%35;
  mirrorCtx.fillStyle=blackout?'rgba(207,195,159,.11)':
   i%3===0?'rgba(244,69,82,.48)':'rgba(244,177,93,.28)';
  mirrorCtx.fillRect(px,py,2+(i%3),4+(i%9));
 }
 const haze=mirrorCtx.createLinearGradient(0,0,192,0);
 haze.addColorStop(0,blackout?'rgba(161,177,183,.08)':'rgba(205,223,224,.29)');
 haze.addColorStop(.4,'rgba(205,223,224,0)');
 haze.addColorStop(1,blackout?'rgba(161,177,183,.04)':'rgba(205,223,224,.16)');
 mirrorCtx.fillStyle=haze;mirrorCtx.fillRect(0,0,192,128);
}
paintCockpitMirrorDistrict(1);
const cockpitMirrorTexture=new THREE.CanvasTexture(cockpitMirrorCanvas);
cockpitMirrorTexture.colorSpace=THREE.SRGBColorSpace;
cockpitMirrorTexture.anisotropy=mobile?2:4;
const cockpitMirrorMaterial=new THREE.MeshPhysicalMaterial({map:cockpitMirrorTexture,metalness:.12,roughness:.19,clearcoat:.55,clearcoatRoughness:.18});
function cockpitTube(pts,r,m){const path=new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p)));const o=new THREE.Mesh(new THREE.TubeGeometry(path,Math.max(8,pts.length*5),r,6,false),m);cockpit.add(o);return o}
// Sculpt the driver-visible bonnet from the existing single PBR panel: a
// softly crowned, tapered metal pressing rather than a flat toy-like box.
// Same mesh/material count, and all vertex work happens once at startup.
const cockpitCowlGeometry=new THREE.BoxGeometry(2.45,.28,.5,12,2,3);
const cowlPositions=cockpitCowlGeometry.attributes.position;
for(let i=0;i<cowlPositions.count;i++){
 const px=cowlPositions.getX(i),py=cowlPositions.getY(i),pz=cowlPositions.getZ(i);
 // Pressed-steel bonnet: crowned centre ridge, narrowing nose and rolled shoulders.
 // Deform the existing subdivided box; no new meshes, materials or draw calls.
 const frontFactor=THREE.MathUtils.clamp((.25-pz)/.5,0,1);
 const taper=1-.13*frontFactor;
 cowlPositions.setX(i,px*taper);
 if(py>0){
  const normalizedX=Math.abs(px)/1.225;
  const crown=.105*Math.max(0,1-normalizedX*normalizedX);
  const ridge=.035*Math.exp(-Math.pow(px/.25,2));
  const shoulder=-.028*Math.pow(normalizedX,6);
  cowlPositions.setY(i,py+crown+ridge+shoulder+.026*frontFactor);
 }
}
cowlPositions.needsUpdate=true;cockpitCowlGeometry.computeVertexNormals();
const cockpitCowl=new THREE.Mesh(cockpitCowlGeometry,cockpitBlue);
cockpitCowl.position.set(0,-.99,-1.35);cockpit.add(cockpitCowl);
cockpit.add(cube(1.6,.13,.36,cockpitGold,0,-.78,-1.48));

 // A rain-speckled driver windscreen is visible only on wet Yaowarat/Rama II.
 // Two narrow edge panels share one draw call and never cover the centre lane.
 // All texture painting and geometry creation happen once, outside the frame loop.
const cockpitRainCanvas=document.createElement('canvas');
cockpitRainCanvas.width=128;cockpitRainCanvas.height=256;
const rainPaint=cockpitRainCanvas.getContext('2d');
rainPaint.clearRect(0,0,128,256);
for(let i=0;i<76;i++){
 const px=5+(i*47+19)%118,py=6+(i*73+31)%242,r=1+(i%4)*.55;
 // Backlit beads have a dark refracted rim, offset specular highlight and
 // gravity streak; keep the centre of the windscreen completely unobstructed.
 rainPaint.fillStyle='rgba(9,21,30,.20)';
 rainPaint.beginPath();rainPaint.ellipse(px+.35,py+.55,r*.86,r*1.13,0,0,Math.PI*2);rainPaint.fill();
 rainPaint.fillStyle=i%3===0?'rgba(191,222,235,.33)':'rgba(151,188,208,.22)';
 rainPaint.beginPath();rainPaint.ellipse(px,py,r*.67,r,0,0,Math.PI*2);rainPaint.fill();
 rainPaint.fillStyle='rgba(239,249,255,.62)';
 rainPaint.beginPath();rainPaint.ellipse(px-r*.22,py-r*.36,Math.max(.35,r*.18),Math.max(.45,r*.28),-.35,0,Math.PI*2);rainPaint.fill();
 if(i%4===0){
  rainPaint.strokeStyle='rgba(169,199,215,.22)';rainPaint.lineWidth=.65;
  rainPaint.beginPath();rainPaint.moveTo(px,py+r);
  rainPaint.bezierCurveTo(px+.6,py+r+3,px-1.2,py+r+6,px-.5,py+r+7+i%11);rainPaint.stroke();
 }
}
const cockpitRainTexture=new THREE.CanvasTexture(cockpitRainCanvas);
cockpitRainTexture.colorSpace=THREE.SRGBColorSpace;
cockpitRainTexture.anisotropy=mobile?2:4;
const rainEdgePositions=[],rainEdgeUVs=[],rainEdgeIndices=[];
for(const side of [-1,1]){
 const base=rainEdgePositions.length/3;
 const x0=side<0?-.66:.46,x1=side<0?-.46:.66;
 rainEdgePositions.push(x0,-.46,-1.72,x1,-.46,-1.72,
  x0*.98,.56,-1.79,x1*.98,.56,-1.79);
 rainEdgeUVs.push(0,0,1,0,0,1,1,1);
 rainEdgeIndices.push(base,base+1,base+2,base+1,base+3,base+2);
}
const rainEdgeGeometry=new THREE.BufferGeometry();
rainEdgeGeometry.setAttribute('position',new THREE.Float32BufferAttribute(rainEdgePositions,3));
rainEdgeGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(rainEdgeUVs,2));
rainEdgeGeometry.setIndex(rainEdgeIndices);rainEdgeGeometry.computeVertexNormals();
const cockpitRainGlints=new THREE.Mesh(rainEdgeGeometry,
 new THREE.MeshBasicMaterial({map:cockpitRainTexture,transparent:true,opacity:.58,
  depthWrite:false,side:THREE.DoubleSide}));
cockpitRainGlints.name='cockpit-rain-edge-glints';
cockpitRainGlints.renderOrder=3;cockpit.add(cockpitRainGlints);
 // Driver-visible rain wipers: two narrow articulated PBR arms sweep only the
 // outer lower windscreen, preserving the clear central dodge-lane sightline.
 // Reuse existing metal/rubber materials; no textures, lights or network fetches.
 const cockpitWipers=new THREE.Group();
 cockpitWipers.visible=false;cockpit.add(cockpitWipers);
 const cockpitWiperPivots=[];
 for(const side of [-1,1]){
  const pivot=new THREE.Group();
  pivot.position.set(side*.59,-.50,-1.675);
  const arm=cube(.021,.31,.023,cockpitChrome,-side*.065,.14,0);
  arm.rotation.z=side*.27;pivot.add(arm);
  const blade=cube(.36,.024,.033,cockpitMat,-side*.16,.29,-.005);
  blade.rotation.z=side*.08;pivot.add(blade);
  cockpitWipers.add(pivot);cockpitWiperPivots.push({side,pivot});
 }


cockpitTube([[-.75,-.70,-1.36],[-.45,-.64,-1.42],[0,-.68,-1.48],[.45,-.64,-1.42],[.75,-.70,-1.36]],.046,cockpitChrome);

// Curved stamped-steel windscreen uprights give the tuk-tuk a recognisable
// canopy silhouette while keeping the central dodge lane unobstructed.
// One shared six-sided tube instanced twice: one draw call, no frame work.
const canopyUprightCurve=new THREE.CatmullRomCurve3([
 new THREE.Vector3(.78,-.74,-1.39),new THREE.Vector3(.84,-.30,-1.62),
 new THREE.Vector3(.88,.22,-1.73),new THREE.Vector3(.83,.74,-1.78)
]);
const canopyUprights=new THREE.InstancedMesh(
 new THREE.TubeGeometry(canopyUprightCurve,18,.035,6,false),cockpitChrome,2);
const canopyUprightPose=new THREE.Object3D();
for(let i=0;i<2;i++){
 canopyUprightPose.scale.set(i===0?-1:1,1,1);
 canopyUprightPose.updateMatrix();
 canopyUprights.setMatrixAt(i,canopyUprightPose.matrix);
}
canopyUprights.instanceMatrix.needsUpdate=true;
canopyUprights.computeBoundingSphere();
canopyUprights.name='tuktuk-curved-windscreen-uprights';
cockpit.add(canopyUprights);

// Rolled front canopy lip: a shallow crowned steel rain gutter joining the
// windscreen pillars. It sits above the forward sightline, preserving dodge
// visibility while giving the driver a recognisable pressed-metal roof edge.
// One static PBR tube, no textures, lighting changes or per-frame allocations.
const canopyLipCurve=new THREE.CatmullRomCurve3([
 new THREE.Vector3(-.83,.74,-1.78),
 new THREE.Vector3(-.43,.80,-1.80),
 new THREE.Vector3(0,.83,-1.81),
 new THREE.Vector3(.43,.80,-1.80),
 new THREE.Vector3(.83,.74,-1.78)
]);
const canopyLip=new THREE.Mesh(
 new THREE.TubeGeometry(canopyLipCurve,20,.046,6,false),cockpitChrome);
canopyLip.name='tuktuk-crowned-pressed-steel-canopy-rain-gutter';
cockpit.add(canopyLip);

// Shaped canvas canopy above the driver: a gently arched fabric roof with a
// rolled front edge instead of an exposed toy-like metal frame. The canopy
// stays above the windshield sightline and is baked into one static PBR mesh.
const tukCanopyGeometry=new THREE.BoxGeometry(1.83,.055,1.08,12,1,4);
const tukCanopyVertices=tukCanopyGeometry.attributes.position;
for(let i=0;i<tukCanopyVertices.count;i++){
 const x=tukCanopyVertices.getX(i),z=tukCanopyVertices.getZ(i);
 // Pressed vinyl tapers toward the nose and rounds down at the corners.
 // Reuse the existing subdivided canopy mesh: no new materials or draw calls.
 const nose=(z+.54)/1.08;
 const taperedX=x*(.94+.06*(1-nose));
 const arch=.15*(1-Math.pow(Math.abs(x)/.915,2));
 const frontLift=.035*(.54-z)/1.08;
 const cornerDrop=.045*Math.pow(Math.abs(x)/.915,4);
 tukCanopyVertices.setXYZ(i,taperedX,tukCanopyVertices.getY(i)+arch+frontLift-cornerDrop,z);
}
tukCanopyVertices.needsUpdate=true;
tukCanopyGeometry.computeVertexNormals();
// Weathered stitched vinyl canopy: baked canvas weave, tension ribs and edge
// binding in a single 256px PBR albedo. No extra meshes, draw calls or frame work.
const canopyCanvas=document.createElement('canvas');
canopyCanvas.width=canopyCanvas.height=256;
const canopyCtx=canopyCanvas.getContext('2d');
canopyCtx.fillStyle='#29343b';canopyCtx.fillRect(0,0,256,256);
for(let y=0;y<256;y+=3){
 canopyCtx.strokeStyle=y%9===0?'rgba(161,171,168,.095)':'rgba(4,9,13,.12)';
 canopyCtx.lineWidth=1;canopyCtx.beginPath();
 canopyCtx.moveTo(0,y+.5);canopyCtx.lineTo(256,y+.5);canopyCtx.stroke();
}
for(let x=0;x<256;x+=4){
 canopyCtx.fillStyle='rgba(191,195,181,.045)';
 for(let y=(x%8)*.5;y<256;y+=8)canopyCtx.fillRect(x,y,1,2);
}
// Baked sun-faded folds and rain-darkened edges, without extra draw calls.
for(let panel=0;panel<5;panel++){
 const x=panel*52-14;
 const fade=canopyCtx.createLinearGradient(x,0,x+55,0);
 fade.addColorStop(0,'rgba(7,12,16,.17)');
 fade.addColorStop(.28,'rgba(150,160,153,.065)');
 fade.addColorStop(.72,'rgba(185,181,164,.095)');
 fade.addColorStop(1,'rgba(5,10,14,.13)');
 canopyCtx.fillStyle=fade;canopyCtx.fillRect(Math.max(0,x),0,Math.min(55,256-Math.max(0,x)),256);
}
const rainStain=canopyCtx.createLinearGradient(0,0,0,256);
rainStain.addColorStop(0,'rgba(4,9,12,.22)');
rainStain.addColorStop(.18,'rgba(12,17,19,.04)');
rainStain.addColorStop(.78,'rgba(148,146,128,.035)');
rainStain.addColorStop(1,'rgba(4,9,12,.27)');
canopyCtx.fillStyle=rainStain;canopyCtx.fillRect(0,0,256,256);
// Subtle fabric tension ribs run front-to-back; stitched seams avoid toy stripes.
for(const x of [18,128,238]){
 const rib=canopyCtx.createLinearGradient(x-7,0,x+7,0);
 rib.addColorStop(0,'rgba(0,0,0,0)');
 rib.addColorStop(.43,'rgba(0,0,0,.16)');
 rib.addColorStop(.58,'rgba(169,176,168,.12)');
 rib.addColorStop(1,'rgba(0,0,0,0)');
 canopyCtx.fillStyle=rib;canopyCtx.fillRect(x-7,0,14,256);
 canopyCtx.fillStyle='rgba(178,174,153,.32)';
 for(let y=5;y<253;y+=9)canopyCtx.fillRect(x+3,y,1,3);
}
for(const x of [2,252]){
 canopyCtx.fillStyle='rgba(9,14,18,.55)';canopyCtx.fillRect(x,0,2,256);
}
const canopyTexture=new THREE.CanvasTexture(canopyCanvas);
canopyTexture.colorSpace=THREE.SRGBColorSpace;
canopyTexture.anisotropy=Math.min(2,renderer.capabilities.getMaxAnisotropy());
const tukCanopyFabric=new THREE.Mesh(tukCanopyGeometry,new THREE.MeshStandardMaterial({
 color:0xc4c9c7,map:canopyTexture,roughness:.88,metalness:0,side:THREE.DoubleSide
}));
tukCanopyFabric.position.set(0,.91,-1.24);
tukCanopyFabric.name='tuktuk-arched-canvas-roof';
cockpit.add(tukCanopyFabric);

// Driver-visible motorcycle-style tuk-tuk steering bar, not a car steering wheel.
// A curved chrome bar and two instanced textured-rubber grips stay below the
// road sightline. All geometry is created once; only the group rotates per frame.
const cockpitSteering=new THREE.Group();
cockpitSteering.position.set(0,-.94,-1.25);
cockpit.add(cockpitSteering);
const cockpitBarCurve=new THREE.CatmullRomCurve3([
 [-.46,.11,0],[-.31,.13,-.025],[-.12,.035,-.04],
 [.12,.035,-.04],[.31,.13,-.025],[.46,.11,0]
].map(p=>new THREE.Vector3(...p)));
cockpitSteering.add(new THREE.Mesh(
 new THREE.TubeGeometry(cockpitBarCurve,32,.024,7,false),cockpitChrome));
const cockpitGripRubber=new THREE.MeshStandardMaterial({
 color:0x191d20,metalness:0,roughness:.94
});
const cockpitGripGeometry=new THREE.CylinderGeometry(.043,.043,.22,12);
const cockpitGrips=new THREE.InstancedMesh(cockpitGripGeometry,cockpitGripRubber,2);
const cockpitGripPose=new THREE.Object3D();
for(let i=0;i<2;i++){
 cockpitGripPose.position.set((i===0?-1:1)*.53,.11,0);
 cockpitGripPose.rotation.set(0,0,Math.PI/2);
 cockpitGripPose.updateMatrix();
 cockpitGrips.setMatrixAt(i,cockpitGripPose.matrix);
}
cockpitGrips.instanceMatrix.needsUpdate=true;
cockpitGrips.computeBoundingSphere();
cockpitSteering.add(cockpitGrips);
const cockpitBarClamp=cube(.15,.09,.13,cockpitChrome,0,.035,-.045);
const cockpitThrottleHousing=cube(.12,.10,.11,cockpitMat,.37,.11,-.015);
cockpitSteering.add(cockpitBarClamp,cockpitThrottleHousing);

// Curved, forward-facing mirrors replace the flat box housings. Geometry and
// materials are shared across both sides; the lens faces the driver's camera
// (+Z), so the existing baked night-street reflection is actually visible.
// Keep housing and glass separately addressable for Grandma Speed's tear-off.
const cockpitMirrorShellGeometry=new THREE.SphereGeometry(1,20,12);
const cockpitMirrorLensGeometry=new THREE.CircleGeometry(1,24);
const cockpitMirrorGasket=new THREE.MeshStandardMaterial({color:0x14191c,metalness:0,roughness:.87});
const cockpitSideMirrors=[];
for(const side of [-1,1]){
 cockpit.add(cube(.33,.13,.19,cockpitMat,side*.76,-.70,-1.36));
 cockpitTube([[side*.9,-.92,-1.42],[side*1.01,-.31,-1.50],[side*1.06,-.04,-1.54],[side*1.12,.05,-1.55]],.033,cockpitChrome);
 const housing=new THREE.Group();
 housing.position.set(side*1.12,.05,-1.55);
 const shell=new THREE.Mesh(cockpitMirrorShellGeometry,cockpitChrome);
 shell.scale.set(.205,.172,.068);
 const gasket=new THREE.Mesh(cockpitMirrorLensGeometry,cockpitMirrorGasket);
 gasket.scale.set(.177,.143,1);gasket.position.z=.071;
 housing.add(shell,gasket);
 const glass=new THREE.Mesh(cockpitMirrorLensGeometry,cockpitMirrorMaterial);
 glass.scale.set(.161,.129,1);glass.position.set(side*1.12,.05,-1.474);
 cockpit.add(housing,glass);cockpitSideMirrors.push({side,housing,glass});
}
// Parked tuk-tuk windshield wipers below the driver's sightline, instanced for mobile.
const wiperMetal=new THREE.MeshStandardMaterial({color:0x303538,metalness:.62,roughness:.52});
const wiperRubber=new THREE.MeshStandardMaterial({color:0x101416,roughness:.94});
const wiperArms=new THREE.InstancedMesh(new THREE.BoxGeometry(.52,.018,.022),wiperMetal,2);
const wiperBlades=new THREE.InstancedMesh(new THREE.BoxGeometry(.60,.025,.025),wiperRubber,2);
const wiperPose=new THREE.Object3D();
for(let i=0;i<2;i++){
 const side=i===0?-1:1;
 wiperPose.position.set(side*.49,-.59,-1.40);
 wiperPose.rotation.set(0,0,side*.13);
 wiperPose.updateMatrix();wiperArms.setMatrixAt(i,wiperPose.matrix);
 wiperPose.position.set(side*.50,-.574,-1.408);
 wiperPose.updateMatrix();wiperBlades.setMatrixAt(i,wiperPose.matrix);
}
wiperArms.instanceMatrix.needsUpdate=true;
wiperBlades.instanceMatrix.needsUpdate=true;
cockpit.add(wiperArms,wiperBlades);
// Remove the overhead trim from the camera view; keep the lower dashboard and side frame.
// Upper windshield crossbar removed to expose the street.
const speedDial=new THREE.Group();speedDial.position.set(0,-.67,-1.37);cockpit.add(speedDial);
// Baked 256px illuminated analog speedometer replaces the blank black dial.
// Tick marks, numerals and subtle backlight share one PBR mesh, no new draw calls.
const speedometerCanvas=document.createElement('canvas');
speedometerCanvas.width=speedometerCanvas.height=256;
const dialPaint=speedometerCanvas.getContext('2d');
const dialGround=dialPaint.createRadialGradient(128,122,9,128,128,127);
dialGround.addColorStop(0,'#243443');dialGround.addColorStop(.72,'#111c27');
dialGround.addColorStop(1,'#050b13');
dialPaint.fillStyle=dialGround;dialPaint.fillRect(0,0,256,256);
dialPaint.strokeStyle='rgba(183,207,215,.24)';dialPaint.lineWidth=2;
dialPaint.beginPath();dialPaint.arc(128,128,116,0,Math.PI*2);dialPaint.stroke();
 // Redline is a baked instrument marking, not a second mesh or animated texture.
 // It follows the same 0–240 km/h sweep as the live needle.
 dialPaint.strokeStyle='#cb493d';dialPaint.lineWidth=5;dialPaint.lineCap='round';
 dialPaint.beginPath();
 for(let kmh=180;kmh<=240;kmh+=4){
  const angle=Math.PI*.72*(1-kmh/120);
  const px=128-Math.sin(angle)*117,py=128-Math.cos(angle)*117;
  if(kmh===180)dialPaint.moveTo(px,py);else dialPaint.lineTo(px,py);
 }
 dialPaint.stroke();dialPaint.lineCap='butt';
 // Two restrained satin-metal concentric rings provide depth at no draw-call cost.
 dialPaint.strokeStyle='rgba(190,205,209,.13)';dialPaint.lineWidth=1;
 for(const radius of [88,92]){
  dialPaint.beginPath();dialPaint.arc(128,128,radius,0,Math.PI*2);dialPaint.stroke();
 }
for(let kmh=0;kmh<=240;kmh+=10){
 const a=Math.PI*.72*(1-kmh/120),dx=-Math.sin(a),dy=-Math.cos(a);
 const major=kmh%40===0,outer=111,inner=major?94:103;
 dialPaint.strokeStyle=major?'#e6d7ad':'#8797a0';
 dialPaint.lineWidth=major?3:1.5;
 dialPaint.beginPath();
 dialPaint.moveTo(128+dx*inner,128+dy*inner);
 dialPaint.lineTo(128+dx*outer,128+dy*outer);
 dialPaint.stroke();
 if(major){
  dialPaint.font='bold 17px system-ui, sans-serif';
  dialPaint.fillStyle='#d7e3e6';dialPaint.textAlign='center';dialPaint.textBaseline='middle';
  dialPaint.fillText(String(kmh),128+dx*78,128+dy*78);
 }
}
dialPaint.fillStyle='#7da5b6';dialPaint.textAlign='center';
dialPaint.font='bold 15px system-ui, sans-serif';dialPaint.fillText('km/h',128,175);
dialPaint.fillStyle='#b3b9b8';dialPaint.font='11px system-ui, sans-serif';
dialPaint.fillText('BANGKOK',128,193);
 // Bake subtle curved instrument-glass reflections into the existing 256px map.
 // Keep numerals readable, especially on dim iPhone screens.
 dialPaint.save();
 dialPaint.beginPath();dialPaint.arc(128,128,112,0,Math.PI*2);dialPaint.clip();
 const dialGlare=dialPaint.createLinearGradient(28,23,204,216);
 dialGlare.addColorStop(0,'rgba(230,247,255,.13)');
 dialGlare.addColorStop(.34,'rgba(220,243,255,.025)');
 dialGlare.addColorStop(.60,'rgba(210,234,255,0)');
 dialGlare.addColorStop(1,'rgba(158,185,199,.06)');
 dialPaint.fillStyle=dialGlare;dialPaint.fillRect(0,0,256,256);
 dialPaint.strokeStyle='rgba(237,246,252,.10)';dialPaint.lineWidth=9;
 dialPaint.beginPath();dialPaint.ellipse(94,67,68,16,-.42,Math.PI*.98,Math.PI*1.96);dialPaint.stroke();
 dialPaint.restore();
const speedometerTexture=new THREE.CanvasTexture(speedometerCanvas);
speedometerTexture.colorSpace=THREE.SRGBColorSpace;
speedometerTexture.anisotropy=mobile?2:4;
const dialFace=new THREE.Mesh(new THREE.CircleGeometry(.166,32),
 new THREE.MeshStandardMaterial({map:speedometerTexture,emissive:0x88aab9,
  emissiveMap:speedometerTexture,emissiveIntensity:.2,metalness:.08,roughness:.56}));
dialFace.position.z=.027;speedDial.add(dialFace);
const dialRim=new THREE.Mesh(new THREE.TorusGeometry(.18,.025,6,22),cockpitGold);speedDial.add(dialRim);
const dialNeedlePivot=new THREE.Group();dialNeedlePivot.position.z=.056;
const dialNeedle=cube(.018,.13,.016,cockpitRed,0,.054,0);
dialNeedlePivot.add(dialNeedle);speedDial.add(dialNeedlePivot);
// Shared physically based finishes for the always-available player tuk-tuk.
// No extra geometry, lights or per-frame allocations: mobile-friendly GLB fallback.
const playerPaint=new THREE.MeshPhysicalMaterial({color:0x078a9b,metalness:.42,roughness:.32,clearcoat:.65,clearcoatRoughness:.24});
const playerBrass=new THREE.MeshStandardMaterial({color:0xc6a04b,metalness:.66,roughness:.34});
const playerChrome=new THREE.MeshStandardMaterial({color:0xbcc8ce,metalness:.85,roughness:.22});
// Shared baked tyre sidewall/tread micro-relief for the procedural tuk-tuk.
// One 128x64 bump texture for all three wheels; no extra geometry or draw calls.
const tyreBumpCanvas=document.createElement('canvas');
tyreBumpCanvas.width=128;tyreBumpCanvas.height=64;
const tyreBumpCtx=tyreBumpCanvas.getContext('2d');
tyreBumpCtx.fillStyle='#777';tyreBumpCtx.fillRect(0,0,128,64);
// Directional V-chevron tread replaces toy-like straight stripes.
// Bake once into the existing 128x64 bump map; zero extra draw calls.
tyreBumpCtx.lineCap='square';
tyreBumpCtx.lineJoin='bevel';
for(let x=-16;x<144;x+=16){
 for(const side of [-1,1]){
  tyreBumpCtx.beginPath();
  tyreBumpCtx.moveTo(x,32);
  tyreBumpCtx.lineTo(x+8,32+side*13);
  tyreBumpCtx.lineWidth=4;
  tyreBumpCtx.strokeStyle='#b8b8b8';
  tyreBumpCtx.stroke();
  tyreBumpCtx.beginPath();
  tyreBumpCtx.moveTo(x+3,32);
  tyreBumpCtx.lineTo(x+11,32+side*13);
  tyreBumpCtx.lineWidth=2;
  tyreBumpCtx.strokeStyle='#414141';
  tyreBumpCtx.stroke();
 }
}
for(const y of [9,14,49,54]){
 tyreBumpCtx.fillStyle='#555';
 tyreBumpCtx.fillRect(0,y,128,1);
}
const tyreBumpTexture=new THREE.CanvasTexture(tyreBumpCanvas);
tyreBumpTexture.wrapS=THREE.RepeatWrapping;
tyreBumpTexture.anisotropy=mobile?2:4;
const playerRubber=new THREE.MeshStandardMaterial({color:0x171a1e,metalness:0,roughness:.94,bumpMap:tyreBumpTexture,bumpScale:.028});
const playerFabric=new THREE.MeshStandardMaterial({color:0x8e3042,metalness:0,roughness:.91,side:THREE.DoubleSide});
const playerGlass=new THREE.MeshPhysicalMaterial({color:0x93b9c3,metalness:0,roughness:.16,transparent:true,opacity:.58,depthWrite:false,side:THREE.DoubleSide});
const playerSeat=new THREE.MeshStandardMaterial({color:0x513c43,metalness:0,roughness:.82});
const playerDark=new THREE.MeshStandardMaterial({color:0x18242b,metalness:.18,roughness:.68});
const playerHeadlight=new THREE.MeshStandardMaterial({color:0xf5efdc,emissive:0xd8bd85,emissiveIntensity:.18,roughness:.34});
const playerTaillight=new THREE.MeshStandardMaterial({color:0x9b2427,emissive:0x9b1010,emissiveIntensity:.28,roughness:.36});
const chrome=playerChrome,seat=playerSeat,dark=playerDark;
function tube(points,r,m){const path=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));const mesh=new THREE.Mesh(new THREE.TubeGeometry(path,Math.max(8,points.length*5),r,7,false),m);car.add(mesh);return mesh}
function ellipsoid(x,y,z,sx,sy,sz,m){const o=ball(1,m,x,y,z);o.scale.set(sx,sy,sz);car.add(o);return o}
// Player tuk-tuk: shared rounded tyre and recessed pressed-steel hub profiles.
// Six wheel meshes retain their existing draw calls and positions, while 24
// radial segments and shallow circumferential tread grooves replace toy cylinders.
// Geometry is allocated once, before the optional GLB; the fallback stays playable.
const playerTyreProfile=[
 [.54,-.50],[.72,-.50],[.85,-.47],[.96,-.39],
 [1,-.31],[.974,-.24],[1,-.18],[1,-.08],
 [.986,0],[1,.08],[1,.18],[.974,.24],
 [1,.31],[.96,.39],[.85,.47],[.72,.50],[.54,.50]
];
const playerHubProfile=[
 [0,-.39],[.34,-.39],[.60,-.46],[.84,-.50],
 [1,-.37],[.93,-.22],[.76,0],[.93,.22],
 [1,.37],[.84,.50],[.60,.46],[.34,.39],[0,.39]
];
const playerTyreGeometry=new THREE.LatheGeometry(
 playerTyreProfile.map(([r,y])=>new THREE.Vector2(r,y)),24);
const playerHubGeometry=new THREE.LatheGeometry(
 playerHubProfile.map(([r,y])=>new THREE.Vector2(r,y)),24);
function cyl(r1,r2,h,m,x,y,z,rot=0){
 // This helper only builds the three player wheels; retain a cylinder fallback
 // for any future non-wheel call that requires unequal end radii.
 const wheelProfile=r1===r2?(m===playerRubber?playerTyreGeometry:m===chrome?playerHubGeometry:null):null;
 const o=new THREE.Mesh(wheelProfile||new THREE.CylinderGeometry(r1,r2,h,14),m);
 if(wheelProfile)o.scale.set(r1,h,r1);
 o.position.set(x,y,z);o.rotation.z=rot;car.add(o);return o;
}
// Three-wheel chassis, rounded bonnet, passenger compartment and front mudguard
car.add(cube(1.65,.24,2.75,dark,0,.64,0));
ellipsoid(0,.91,-.78,.87,.42,.86,playerPaint);
ellipsoid(0,.79,-1.25,.83,.25,.34,playerPaint);
car.add(cube(1.78,.42,1.3,playerPaint,0,.92,.73));
car.add(cube(1.55,.18,.76,seat,0,1.22,.78));
car.add(cube(1.7,.13,.3,playerBrass,0,1.42,1.24));
for(const side of [-1,1]){
  // rear passenger wheels, side panels and arches
  cyl(.46,.46,.22,playerRubber,side*.91,.47,.84,Math.PI/2);
  cyl(.27,.27,.235,chrome,side*.91,.47,.84,Math.PI/2);
  ellipsoid(side*.88,.88,.83,.14,.35,.62,playerBrass);
  tube([[side*.88,.85,-.72],[side*.95,1.35,-.75],[side*.99,2.14,-.55],[side*.96,2.36,-.1]],.047,chrome);
  tube([[side*.94,1.05,1.15],[side*.98,1.86,1.15],[side*.95,2.31,.87]],.047,chrome);
  // side step, handles, decorative stripe
  car.add(cube(.25,.1,1.3,chrome,side*1.04,.62,.55));
  car.add(cube(.09,.12,.24,playerBrass,side*.96,1.38,-.34));
  // mirrors
  tube([[side*.81,1.39,-1.12],[side*1.17,1.55,-1.15]],.035,chrome);
  ellipsoid(side*1.22,1.59,-1.16,.16,.21,.08,dark);
}
// Weathered, curved canvas canopy: one low-poly roof replaces sphere + box.
// Stitching, weave and rain stains are baked once; no new lights or frame work.
const playerCanopyCanvas=document.createElement('canvas');playerCanopyCanvas.width=playerCanopyCanvas.height=256;
const playerCanopyCtx=playerCanopyCanvas.getContext('2d');
playerCanopyCtx.fillStyle='#783848';playerCanopyCtx.fillRect(0,0,256,256);
for(let i=0;i<256;i+=4){
 playerCanopyCtx.fillStyle=i%8===0?'rgba(250,220,200,.055)':'rgba(15,9,15,.065)';
 playerCanopyCtx.fillRect(i,0,1,256);playerCanopyCtx.fillRect(0,i,256,1);
}
for(const x of [22,234]){
 playerCanopyCtx.fillStyle='rgba(24,15,18,.38)';playerCanopyCtx.fillRect(x-3,0,6,256);
 playerCanopyCtx.fillStyle='rgba(221,172,144,.44)';playerCanopyCtx.fillRect(x,0,1,256);
 for(let y=3;y<256;y+=10){playerCanopyCtx.fillStyle='rgba(235,198,160,.65)';playerCanopyCtx.fillRect(x-1,y,2,4)}
}
for(let i=0;i<9;i++){
 const x=(i*79+31)%256,y=(i*47+19)%256;
 const stain=playerCanopyCtx.createRadialGradient(x,y,1,x,y,34+i%3*12);
 stain.addColorStop(0,'rgba(25,20,23,.18)');stain.addColorStop(1,'rgba(25,20,23,0)');
 playerCanopyCtx.fillStyle=stain;playerCanopyCtx.fillRect(x-52,y-52,104,104);
}
const playerCanopyTexture=new THREE.CanvasTexture(playerCanopyCanvas);
playerCanopyTexture.colorSpace=THREE.SRGBColorSpace;playerCanopyTexture.anisotropy=mobile?2:4;
const canopyFabric=new THREE.MeshStandardMaterial({map:playerCanopyTexture,roughness:.95,metalness:0,side:THREE.DoubleSide});
const canopyVertices=[],canopyUVs=[],canopyIndices=[],roofRows=8,roofCols=8;
for(let j=0;j<=roofRows;j++){
 const v=j/roofRows,z=-1.40+3.06*v;
 for(let i=0;i<=roofCols;i++){
  // Tapered canvas roof widens towards the passenger compartment.
  // Reuse the original 8x8 canopy geometry and material draw call.
  const u=i/roofCols,halfWidth=1.05+.13*v;
  const x=(2*u-1)*halfWidth;
  const y=2.27+.23*(1-(x/halfWidth)**2)-.035*Math.sin(Math.PI*v);
  canopyVertices.push(x,y,z);canopyUVs.push(u,v);
 }
}
for(let j=0;j<roofRows;j++)for(let i=0;i<roofCols;i++){
 const a=j*(roofCols+1)+i,b=a+roofCols+1;
 canopyIndices.push(a,b,a+1,b,b+1,a+1);
}
// Side hems belong to the same geometry and draw call as the roof.
for(const side of [-1,1]){
 const base=canopyVertices.length/3;
 for(let j=0;j<=roofRows;j++){
  const v=j/roofRows,z=-1.40+3.06*v,y=2.27-.035*Math.sin(Math.PI*v);
  const edgeX=side*(1.05+.13*v);
  canopyVertices.push(edgeX,y,z,edgeX,y-.16,z);
  canopyUVs.push(side<0?0:1,v,side<0?0:1,v+.05);
 }
 for(let j=0;j<roofRows;j++){
  const a=base+2*j;canopyIndices.push(a,a+2,a+1,a+2,a+3,a+1);
 }
}
const canopyGeometry=new THREE.BufferGeometry();
canopyGeometry.setAttribute('position',new THREE.Float32BufferAttribute(canopyVertices,3));
canopyGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(canopyUVs,2));
canopyGeometry.setIndex(canopyIndices);canopyGeometry.computeVertexNormals();
car.add(new THREE.Mesh(canopyGeometry,canopyFabric));
for(const z of [-1.3,1.6])tube([[-1.1,2.28,z],[-.75,2.49,z],[0,2.57,z],[.75,2.49,z],[1.1,2.28,z]],.055,playerBrass);
// A gently curved, tapered windscreen replaces the toy-box glass slab.
// One double-sided 8x4 PBR pane (64 triangles) keeps the original glass draw
// call; the frame follows its narrower top edge. No external asset dependency.
const windshieldPositions=[],windshieldUVs=[],windshieldIndices=[];
const windCols=8,windRows=4;
for(let j=0;j<=windRows;j++){
 const v=j/windRows,halfWidth=.82-.06*v;
 for(let i=0;i<=windCols;i++){
  const u=i/windCols,side=2*u-1;
  // Pressed curved glass: arched upper edge, swept side pillars and a shallow
  // convex centre. All shaping stays in the existing 8x4 pane / draw call.
  const crown=.045*v*(1-side*side);
  const sweptSide=.025*v*v*side;
  windshieldPositions.push(side*halfWidth+sweptSide,1.42+.68*v+crown,-.95+.07*v-.065*(1-side*side));
  windshieldUVs.push(u,v);
 }
}
for(let j=0;j<windRows;j++)for(let i=0;i<windCols;i++){
 const a=j*(windCols+1)+i,b=a+windCols+1;
 windshieldIndices.push(a,a+1,b,a+1,b+1,b);
}
const windshieldGeometry=new THREE.BufferGeometry();
windshieldGeometry.setAttribute('position',new THREE.Float32BufferAttribute(windshieldPositions,3));
windshieldGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(windshieldUVs,2));
windshieldGeometry.setIndex(windshieldIndices);
windshieldGeometry.computeVertexNormals();
car.add(new THREE.Mesh(windshieldGeometry,playerGlass));
tube([[-.84,1.38,-.95],[-.76,2.1,-.88],[0,2.1,-.915],[.76,2.1,-.88],[.84,1.38,-.95]],.042,chrome);
// Single parked rubber wiper, low against the glass, not across the sightline.
tube([[.08,1.43,-1.025],[.05,1.51,-1.02],[-.52,1.58,-1.01]],.018,playerDark);
car.add(cube(1.05,.08,.08,chrome,0,1.43,-1.04));
car.add(cube(.5,.12,.07,dark,0,1.51,-.99));
// Pressed-steel front ventilation grille on the always-playable tuk-tuk.
// Bake slotted louvers, fasteners and weathering into one compact PBR panel;
// no external GLB dependency, per-frame work or dynamic lighting.
const grilleCanvas=document.createElement('canvas');
grilleCanvas.width=128;grilleCanvas.height=128;
const grilleCtx=grilleCanvas.getContext('2d');
const grilleBase=grilleCtx.createLinearGradient(0,0,128,128);
grilleBase.addColorStop(0,'#6b8587');grilleBase.addColorStop(.5,'#25383c');
grilleBase.addColorStop(1,'#101e24');
grilleCtx.fillStyle=grilleBase;grilleCtx.fillRect(0,0,128,128);
grilleCtx.strokeStyle='#b5b9ad';grilleCtx.lineWidth=5;
grilleCtx.strokeRect(6,7,116,114);
for(let i=0;i<7;i++){
 const x=17+i*15;
 grilleCtx.fillStyle='#09141a';grilleCtx.fillRect(x,21,9,86);
 grilleCtx.fillStyle='rgba(181,206,203,.48)';grilleCtx.fillRect(x,21,2,86);
 grilleCtx.fillStyle='rgba(3,8,12,.65)';grilleCtx.fillRect(x+7,21,2,86);
}
for(const x of [12,116])for(const y of [13,115]){
 grilleCtx.fillStyle='#b9a884';grilleCtx.beginPath();
 grilleCtx.arc(x,y,2.5,0,Math.PI*2);grilleCtx.fill();
}
const grilleTexture=new THREE.CanvasTexture(grilleCanvas);
grilleTexture.colorSpace=THREE.SRGBColorSpace;
const grilleMaterial=new THREE.MeshStandardMaterial({
 map:grilleTexture,metalness:.58,roughness:.48,side:THREE.DoubleSide
});
const grillePositions=[],grilleUVs=[],grilleIndices=[];
for(let row=0;row<=4;row++){
 const v=row/4,y=.80+row*.065;
 for(let col=0;col<=8;col++){
  const u=col/8,x=(u-.5)*.70;
  grillePositions.push(x,y,-1.586+.075*Math.pow(x/.35,2)+.014*(v-.5)**2);
  grilleUVs.push(u,v);
 }
}
for(let row=0;row<4;row++)for(let col=0;col<8;col++){
 const a=row*9+col,b=a+9;
 grilleIndices.push(a,b,a+1,b,b+1,a+1);
}
const grilleGeometry=new THREE.BufferGeometry();
grilleGeometry.setAttribute('position',new THREE.Float32BufferAttribute(grillePositions,3));
grilleGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(grilleUVs,2));
grilleGeometry.setIndex(grilleIndices);grilleGeometry.computeVertexNormals();
const grilleMesh=new THREE.Mesh(grilleGeometry,grilleMaterial);
grilleMesh.name='player-tuktuk-curved-pressed-steel-front-grille';
car.add(grilleMesh);
// front single wheel and rounded fender
cyl(.4,.4,.22,playerRubber,0,.42,-1.42,Math.PI/2);
cyl(.22,.22,.24,chrome,0,.42,-1.42,Math.PI/2);
// Formed steel front mudguard: arched over tyre, tapering toward both ends.
const guardVerts=[],guardFaces=[],guardRings=16,guardStrips=6;
for(let ring=0;ring<=guardRings;ring++){
 const angle=-Math.PI*.46+ring/guardRings*Math.PI*.92;
 const z=-1.43-.49*Math.sin(angle),height=.44+.39*Math.cos(angle);
 const width=.38*(.77+.23*Math.cos(angle));
 for(let strip=0;strip<=guardStrips;strip++){
  const u=strip/guardStrips*2-1;
  guardVerts.push(u*width,height+.095*(1-u*u),z+.012*u*u);
 }
}
for(let ring=0;ring<guardRings;ring++)for(let strip=0;strip<guardStrips;strip++){
 const a=ring*(guardStrips+1)+strip,b=a+guardStrips+1;
 guardFaces.push(a,a+1,b,a+1,b+1,b);
}
const guardGeometry=new THREE.BufferGeometry();
guardGeometry.setAttribute('position',new THREE.Float32BufferAttribute(guardVerts,3));
guardGeometry.setIndex(guardFaces);guardGeometry.computeVertexNormals();
const frontMudguard=new THREE.Mesh(guardGeometry,playerBrass);
frontMudguard.name='player-tuktuk-formed-steel-front-mudguard';
car.add(frontMudguard);
// Fluted glass headlamp lenses: baked radial optics on the existing lamp
// meshes. Shared texture/material, no additional draw calls or real-time lights.
const headlampCanvas=document.createElement('canvas');
headlampCanvas.width=headlampCanvas.height=128;
const headlampCtx=headlampCanvas.getContext('2d');
const lampGlow=headlampCtx.createRadialGradient(64,64,4,64,64,64);
lampGlow.addColorStop(0,'#fffef0');
lampGlow.addColorStop(.48,'#f5eac9');
lampGlow.addColorStop(.85,'#a6a99d');
lampGlow.addColorStop(1,'#3a4549');
headlampCtx.fillStyle=lampGlow;headlampCtx.fillRect(0,0,128,128);
headlampCtx.save();headlampCtx.beginPath();headlampCtx.arc(64,64,58,0,Math.PI*2);headlampCtx.clip();
for(let x=9;x<124;x+=9){
 headlampCtx.strokeStyle=x%2?'rgba(255,255,245,.38)':'rgba(41,55,60,.22)';
 headlampCtx.lineWidth=2;headlampCtx.beginPath();headlampCtx.moveTo(x,8);
 headlampCtx.quadraticCurveTo(x+7,64,x,120);headlampCtx.stroke();
}
headlampCtx.restore();
const headlampTexture=new THREE.CanvasTexture(headlampCanvas);
headlampTexture.colorSpace=THREE.SRGBColorSpace;
const headlampGlass=new THREE.MeshStandardMaterial({
 map:headlampTexture,metalness:.08,roughness:.23,
 emissive:new THREE.Color('#c6b88b'),emissiveIntensity:.18
});
// lamps, bumper, tail plate
for(const side of [-1,1]){
  ellipsoid(side*.58,1.02,-1.5,.22,.22,.12,chrome);
  ellipsoid(side*.58,1.02,-1.61,.15,.15,.045,headlampGlass);

}
// Baked three-chamber rear lamps for the always-playable player tuk-tuk.
// A shared PBR atlas gives amber turn indicators, fluted red brake lenses and
// a pale reversing segment. Two lamps use ONE instanced draw call, no lights,
// no external assets, and no animation allocations on mobile.
const playerLampCanvas=document.createElement('canvas');
playerLampCanvas.width=128;playerLampCanvas.height=256;
const playerLampCtx=playerLampCanvas.getContext('2d');
playerLampCtx.fillStyle='#11171b';playerLampCtx.fillRect(0,0,128,256);
const playerLampChambers=[
 {top:8,bottom:70,light:'#f8bd5b',mid:'#bb6426',dark:'#713d24'},
 {top:77,bottom:191,light:'#f76550',mid:'#9e211f',dark:'#54151a'},
 {top:198,bottom:248,light:'#d7e6e6',mid:'#879ea5',dark:'#465860'}
];
for(const chamber of playerLampChambers){
 const lens=playerLampCtx.createLinearGradient(8,chamber.top,120,chamber.bottom);
 lens.addColorStop(0,chamber.dark);lens.addColorStop(.22,chamber.mid);
 lens.addColorStop(.49,chamber.light);lens.addColorStop(.7,chamber.mid);
 lens.addColorStop(1,chamber.dark);
 playerLampCtx.fillStyle=lens;
 playerLampCtx.fillRect(9,chamber.top,110,chamber.bottom-chamber.top);
 playerLampCtx.fillStyle='rgba(255,247,220,.16)';
 for(let y=chamber.top+3;y<chamber.bottom-2;y+=6)playerLampCtx.fillRect(11,y,106,1);
 playerLampCtx.fillStyle='rgba(13,16,19,.25)';
 playerLampCtx.fillRect(9,chamber.bottom-3,110,3);
 playerLampCtx.strokeStyle='rgba(228,226,206,.40)';
 playerLampCtx.lineWidth=2;playerLampCtx.strokeRect(10,chamber.top+1,108,chamber.bottom-chamber.top-3);
}
playerLampCtx.strokeStyle='#59646a';playerLampCtx.lineWidth=5;
playerLampCtx.strokeRect(4,4,120,248);
playerLampCtx.fillStyle='rgba(255,255,255,.20)';
playerLampCtx.beginPath();playerLampCtx.moveTo(20,15);playerLampCtx.lineTo(41,15);
playerLampCtx.lineTo(99,237);playerLampCtx.lineTo(88,237);playerLampCtx.closePath();
playerLampCtx.fill();
const playerLampTexture=new THREE.CanvasTexture(playerLampCanvas);
playerLampTexture.colorSpace=THREE.SRGBColorSpace;
playerLampTexture.anisotropy=mobile?2:4;
const playerLampGeometry=new THREE.PlaneGeometry(.28,.40,4,6);
const playerLampPositions=playerLampGeometry.attributes.position;
for(let i=0;i<playerLampPositions.count;i++){
 const x=playerLampPositions.getX(i);
 playerLampPositions.setZ(i,.018*(1-(x/.14)**2));
}
playerLampPositions.needsUpdate=true;
playerLampGeometry.computeVertexNormals();
const playerLampMaterial=new THREE.MeshPhysicalMaterial({
 map:playerLampTexture,emissiveMap:playerLampTexture,emissive:0x925d51,
 emissiveIntensity:.28,metalness:.08,roughness:.28,clearcoat:.42,
 clearcoatRoughness:.22,side:THREE.DoubleSide
});
const playerRearLamps=new THREE.InstancedMesh(playerLampGeometry,playerLampMaterial,2);
const playerLampPose=new THREE.Object3D();
for(let i=0;i<2;i++){
 playerLampPose.position.set(i===0?-.74:.74,1.055,1.67);
 playerLampPose.updateMatrix();
 playerRearLamps.setMatrixAt(i,playerLampPose.matrix);
}
playerRearLamps.instanceMatrix.needsUpdate=true;
playerRearLamps.computeBoundingSphere();
playerRearLamps.name='player-tuktuk-pbr-three-chamber-rear-lamps';
car.add(playerRearLamps);
tube([[-.82,.57,-1.48],[-.66,.5,-1.7],[.66,.5,-1.7],[.82,.57,-1.48]],.065,chrome);
// One baked rear engine cover with pressed louvers and a fictional Thai plate.
// Replaces two blank cubes with one PBR panel; no frame-time canvas work.
const playerRearCanvas=document.createElement('canvas');
playerRearCanvas.width=512;playerRearCanvas.height=192;
const playerRearCtx=playerRearCanvas.getContext('2d');
const rearEnamel=playerRearCtx.createLinearGradient(0,0,0,192);
rearEnamel.addColorStop(0,'#167a88');
rearEnamel.addColorStop(.48,'#0b6170');
rearEnamel.addColorStop(1,'#193f4c');
playerRearCtx.fillStyle=rearEnamel;playerRearCtx.fillRect(0,0,512,192);
playerRearCtx.fillStyle='#172d34';playerRearCtx.fillRect(0,10,512,8);
playerRearCtx.fillStyle='#9ba9a6';playerRearCtx.fillRect(0,20,512,3);
playerRearCtx.fillStyle='#24333b';playerRearCtx.fillRect(0,164,512,13);
playerRearCtx.fillStyle='#9ca7a1';playerRearCtx.fillRect(0,178,512,5);
playerRearCtx.fillStyle='rgba(232,224,194,.25)';playerRearCtx.fillRect(10,31,492,2);
for(let i=0;i<6;i++){
 const y=42+i*13;
 playerRearCtx.fillStyle='#102a33';playerRearCtx.fillRect(173,y,166,8);
 playerRearCtx.fillStyle='rgba(175,206,204,.56)';playerRearCtx.fillRect(175,y,162,2);
 playerRearCtx.fillStyle='rgba(4,14,19,.42)';playerRearCtx.fillRect(175,y+7,162,2);
}
playerRearCtx.fillStyle='#14252a';playerRearCtx.fillRect(173,114,166,50);
playerRearCtx.fillStyle='#e7d9aa';playerRearCtx.fillRect(178,118,156,41);
playerRearCtx.strokeStyle='#6e684d';playerRearCtx.lineWidth=2;
playerRearCtx.strokeRect(181,121,150,35);
playerRearCtx.textAlign='center';playerRearCtx.textBaseline='middle';
playerRearCtx.fillStyle='#283334';playerRearCtx.font='bold 14px sans-serif';
playerRearCtx.fillText('กรุงเทพมหานคร',256,131);
playerRearCtx.font='bold 23px sans-serif';playerRearCtx.fillText('1 กข 2549',256,149);
for(const x of [25,487])for(const y of [37,154]){
 playerRearCtx.fillStyle='#111c23';playerRearCtx.beginPath();
 playerRearCtx.arc(x,y,6,0,Math.PI*2);playerRearCtx.fill();
 playerRearCtx.fillStyle='#a4b2ae';playerRearCtx.fillRect(x-2,y-1,4,2);
}
for(let i=0;i<210;i++){
 const px=(i*89+17)%512,py=(i*47+29)%192;
 playerRearCtx.fillStyle=i%4?'rgba(9,17,20,.13)':'rgba(223,205,163,.10)';
 playerRearCtx.fillRect(px,py,1+i%3,1+i%2);
}
const playerRearTexture=new THREE.CanvasTexture(playerRearCanvas);
playerRearTexture.colorSpace=THREE.SRGBColorSpace;
playerRearTexture.anisotropy=mobile?2:4;
const playerRearPanel=new THREE.Mesh(
 new THREE.PlaneGeometry(1.62,.42),
 new THREE.MeshPhysicalMaterial({map:playerRearTexture,metalness:.28,roughness:.49,
  clearcoat:.34,clearcoatRoughness:.42,side:THREE.DoubleSide})
);
playerRearPanel.name='player-tuktuk-weathered-rear-fascia';
playerRearPanel.position.set(0,.97,1.54);
car.add(playerRearPanel);
scene.add(car);
// V0.9 AI generated vehicle, using the procedural car until the GLB is ready.
// Fixed orientation verified from iPhone screenshot: rear of vehicle faces the camera.
// Vehicle heading now determined from model geometry, not a user-set angle.
const TUKTUK_GLB='https://v3b.fal.media/files/b/0aaedcfd/U0gjvaaq8RuKQVt3a8zrE_model.glb';
let realTukTuk=null;
function loadTukTukAsset(){
new GLTFLoader().load(TUKTUK_GLB,glb=>{
 try{
  const raw=glb.scene;
  // Reject oversized preview geometry before uploading it to the GPU.
  // Keep the lightweight procedural tuk-tuk when this optional GLB is too heavy.
  // Account for each mesh draw call even when multiple meshes share geometry.
  // Optional GLBs that exceed mobile budgets must never replace the playable fallback.
  let triangles=0,meshCount=0,drawCalls=0;
  const textures=new Set(),colorMaps=new Set();
  const textureKeys=['map','normalMap','roughnessMap','metalnessMap','aoMap','emissiveMap','alphaMap','bumpMap','clearcoatMap','clearcoatNormalMap','clearcoatRoughnessMap'];
  raw.traverse(o=>{
   if(!o.isMesh)return;
   meshCount++;
   const geo=o.geometry;
   if(!geo)throw Error('vehicle GLB mesh has no geometry');
   const index=geo.getIndex(),positions=geo.getAttribute('position');
   const vertexCount=index?index.count:(positions?positions.count:0);
   if(!Number.isFinite(vertexCount)||vertexCount<3)throw Error('vehicle GLB invalid mesh');
   triangles+=vertexCount/3;
   const materials=Array.isArray(o.material)?o.material:[o.material];
   // A multi-material GLB mesh may require one draw call per geometry group.
   drawCalls+=materials.length>1&&geo.groups.length?geo.groups.length:1;
   for(const material of materials)if(material){
    if(material.map)colorMaps.add(material.map);
    for(const key of textureKeys)if(material[key])textures.add(material[key]);
   }
  });
  if(!meshCount||meshCount>(mobile?80:160)||drawCalls>(mobile?80:160)||!Number.isFinite(triangles)||triangles>(mobile?120000:300000))throw Error('vehicle GLB exceeds draw-call/mesh/triangle budget');
  // The former width-only resize missed portrait textures. Preserve each PBR
  // map's color space and aspect ratio, with sharper 1024px desktop previews.
  const maxEdge=mobile?768:1024;
  if(textures.size>(mobile?18:30))throw Error('vehicle GLB exceeds texture count budget');
  let estimatedTexels=0;
  const textureSizes=new Map();
  for(const tex of textures){
   const image=tex.image;
   if(!image)continue;
   const w=image.width,h=image.height;
   if(!Number.isFinite(w)||!Number.isFinite(h)||w<1||h<1)throw Error('vehicle GLB invalid texture size');
   const scale=Math.min(1,maxEdge/Math.max(w,h));
   const targetW=Math.max(1,Math.round(w*scale)),targetH=Math.max(1,Math.round(h*scale));
   estimatedTexels+=targetW*targetH;
   textureSizes.set(tex,{image,w,h,targetW,targetH});
  }
  if(estimatedTexels>(mobile?9000000:24000000))throw Error('vehicle GLB exceeds texture memory budget');
  const resizedImages=new Map();
  for(const [tex,{image,w,h,targetW,targetH}] of textureSizes){
   if(w<=maxEdge&&h<=maxEdge)continue;
   let canvas=resizedImages.get(image);
   if(!canvas){
    canvas=document.createElement('canvas');canvas.width=targetW;canvas.height=targetH;
    const context=canvas.getContext('2d');
    if(!context)throw Error('vehicle GLB texture resize unavailable');
    context.drawImage(image,0,0,targetW,targetH);
    resizedImages.set(image,canvas);
   }
   tex.image=canvas;tex.needsUpdate=true;
  }
  // Keep paint and decals legible at oblique camera angles with bounded filtering.
  const anisotropy=Math.min(mobile?2:4,renderer.capabilities.getMaxAnisotropy());
  for(const map of colorMaps){if((map.anisotropy||1)<anisotropy){map.anisotropy=anisotropy;map.needsUpdate=true}}
  raw.traverse(o=>{if(o.isMesh)o.frustumCulled=true});
  raw.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(raw),sz=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
  if(!Number.isFinite(sz.x)||!Number.isFinite(sz.y)||!Number.isFinite(sz.z)||Math.min(sz.x,sz.y,sz.z)<=.001)throw Error('invalid vehicle bounds');
  raw.position.sub(center);raw.position.y+=sz.y/2;
  // Normalize the longest horizontal dimension to the road's Z axis.
  // Tripo's local axes are not guaranteed to match Three.js vehicle axes.
  const lengthAlongX=sz.x>sz.z;
  const holder=new THREE.Group();holder.add(raw);
  holder.rotation.y=lengthAlongX?Math.PI/2:0;
  const longitudinal=Math.max(sz.x,sz.z),width=Math.min(sz.x,sz.z);
  const scale=Math.min(2.65/width,2.8/sz.y,3.75/longitudinal);
  holder.scale.setScalar(scale);
  car.add(holder);realTukTuk=holder;
  console.info('Tuk-tuk axis aligned', {lengthAlongX, width, longitudinal});
  for(const child of car.children){if(child!==holder)child.visible=false}
  console.info('V0.9 real tuk-tuk loaded');
 }catch(e){console.warn('Vehicle GLB invalid; fallback retained',e)}
},undefined,e=>console.warn('Vehicle GLB unavailable; fallback retained',e));
}
const hazards=[];
// Shared soft contact shadows ground traffic and street dogs on the asphalt.
// A single 64px alpha atlas and ONE instanced draw call replace per-hazard shadow meshes.
// No real-time lights, external downloads, collision changes, or per-frame canvas work.
const trafficShadowCanvas=document.createElement('canvas');
trafficShadowCanvas.width=trafficShadowCanvas.height=64;
const trafficShadowCtx=trafficShadowCanvas.getContext('2d');
const trafficShadowFalloff=trafficShadowCtx.createRadialGradient(32,32,3,32,32,31);
trafficShadowFalloff.addColorStop(0,'rgba(9,12,16,.64)');
trafficShadowFalloff.addColorStop(.45,'rgba(9,12,16,.43)');
trafficShadowFalloff.addColorStop(.8,'rgba(9,12,16,.11)');
trafficShadowFalloff.addColorStop(1,'rgba(9,12,16,0)');
trafficShadowCtx.fillStyle=trafficShadowFalloff;
trafficShadowCtx.fillRect(0,0,64,64);
const trafficShadowTexture=new THREE.CanvasTexture(trafficShadowCanvas);
const trafficContactShadows=new THREE.InstancedMesh(
 new THREE.PlaneGeometry(1,1),
 new THREE.MeshBasicMaterial({
  map:trafficShadowTexture,transparent:true,opacity:.82,depthWrite:false,
  polygonOffset:true,polygonOffsetFactor:-1,side:THREE.DoubleSide
 }),16
);
trafficContactShadows.count=0;
trafficContactShadows.frustumCulled=false;
trafficContactShadows.renderOrder=1;
scene.add(trafficContactShadows);
const trafficShadowPose=new THREE.Object3D();
const trafficShadowFootprints={
 tuktuk:[2.15,3.3],taxi:[2.45,4.1],bus:[3.0,6.0],busBlue:[3.0,6.0],
 truck:[3.15,6.6],bike:[1.05,2.2],sportsCar:[2.25,4.15],
 dog:[.85,1.45],yaksha:[3.1,2.75],dancer:[1.2,1.1],
 pedestrian:[.8,.85],police:[.8,.85],fruitCart:[1.55,1.65],
 protest:[1.55,1.7],checkpoint:[2.6,2.4],pattayaDancer:[1.1,1.1]
};
function updateTrafficContactShadows(){
 let used=0;
 for(const h of hazards){
  if(used>=16)break;
  // Projectiles, the UFO laser and rolling durian already have dedicated ground effects.
  if(['laser','durian','bottle','watermelon'].includes(h.type))continue;
  const [width,depth]=trafficShadowFootprints[h.type]||[1.5,1.8];
  trafficShadowPose.position.set(h.g.position.x,.076,h.g.position.z);
  trafficShadowPose.rotation.set(-Math.PI/2,0,-h.g.rotation.y);
  trafficShadowPose.scale.set(width,depth,1);
  trafficShadowPose.updateMatrix();
  trafficContactShadows.setMatrixAt(used++,trafficShadowPose.matrix);
 }
 trafficContactShadows.count=used;
 if(used)trafficContactShadows.instanceMatrix.needsUpdate=true;
}
// Rain-slick Bangkok traffic: soft tyre spray trails the real moving hazards.
// One shared 64px alpha atlas and one instanced draw call (max 24 quads).
// Spray is cosmetic, outside the collision model, and absent on dry/dark stages.
const tyreSprayCanvas=document.createElement('canvas');
tyreSprayCanvas.width=tyreSprayCanvas.height=64;
const tyreSprayCtx=tyreSprayCanvas.getContext('2d');
const tyreSprayGradient=tyreSprayCtx.createRadialGradient(32,43,3,32,34,31);
tyreSprayGradient.addColorStop(0,'rgba(221,229,231,.46)');
tyreSprayGradient.addColorStop(.38,'rgba(190,205,211,.28)');
tyreSprayGradient.addColorStop(.78,'rgba(162,183,194,.075)');
tyreSprayGradient.addColorStop(1,'rgba(153,174,185,0)');
tyreSprayCtx.fillStyle=tyreSprayGradient;
tyreSprayCtx.fillRect(0,0,64,64);
const tyreSprayTexture=new THREE.CanvasTexture(tyreSprayCanvas);
const tyreSpray=new THREE.InstancedMesh(
 new THREE.PlaneGeometry(1,1),
 new THREE.MeshBasicMaterial({map:tyreSprayTexture,transparent:true,
  opacity:.6,depthWrite:false,side:THREE.DoubleSide}),24
);
tyreSpray.name='wet-bangkok-traffic-tyre-spray';
tyreSpray.count=0;tyreSpray.visible=false;tyreSpray.frustumCulled=false;
tyreSpray.renderOrder=1;
scene.add(tyreSpray);
const tyreSprayPose=new THREE.Object3D();
function updateTyreSpray(){
 // The JJ/floating market, expressway, Pattaya and Dark Road are not wet
 // traffic streets. Keep their visibility, dodge lanes and darkness intact.
 if(districtIndex!==1&&districtIndex!==2){
  tyreSpray.count=0;tyreSpray.visible=false;return;
 }
 let used=0;
 for(const h of hazards){
  if(!['taxi','bus','busBlue','tuktuk','truck'].includes(h.type))continue;
  const z=h.g.position.z;
  if(z < -48 || z > 9)continue;
  const scale=h.g.scale.x;
  const width=h.type==='bus'||h.type==='busBlue'||h.type==='truck'?.93:.72;
  const rear=h.type==='bus'||h.type==='busBlue'||h.type==='truck'?-2.1:-1.12;
  for(const side of [-1,1]){
   if(used>=tyreSpray.instanceMatrix.count)break;
   tyreSprayPose.position.set(h.g.position.x+side*width*scale,.40*scale,
    z+rear*scale);
   tyreSprayPose.rotation.set(0,0,side*.12);
   tyreSprayPose.scale.set(.78*scale,1.05*scale,1);
   tyreSprayPose.updateMatrix();
   tyreSpray.setMatrixAt(used++,tyreSprayPose.matrix);
  }
  if(used>=tyreSpray.instanceMatrix.count)break;
 }
 tyreSpray.count=used;tyreSpray.visible=used>0;
 if(used)tyreSpray.instanceMatrix.needsUpdate=true;
}
// Low-cost night headlight bloom makes oncoming Bangkok traffic legible without
// real-time point lights, extra model downloads or changes to collision geometry.
// A single 64px baked halo and one instanced draw call cover all visible vehicles.
const trafficLampCanvas=document.createElement('canvas');
trafficLampCanvas.width=trafficLampCanvas.height=64;
const trafficLampCtx=trafficLampCanvas.getContext('2d');
const trafficLampGradient=trafficLampCtx.createRadialGradient(32,32,2,32,32,32);
trafficLampGradient.addColorStop(0,'rgba(255,251,223,.95)');
trafficLampGradient.addColorStop(.20,'rgba(255,235,174,.67)');
trafficLampGradient.addColorStop(.55,'rgba(255,195,104,.17)');
trafficLampGradient.addColorStop(1,'rgba(255,169,81,0)');
trafficLampCtx.fillStyle=trafficLampGradient;
trafficLampCtx.fillRect(0,0,64,64);
const trafficLampTexture=new THREE.CanvasTexture(trafficLampCanvas);
const trafficHeadlightGlows=new THREE.InstancedMesh(
 new THREE.PlaneGeometry(1,1),
 new THREE.MeshBasicMaterial({
  map:trafficLampTexture,color:0xffeed4,transparent:true,opacity:.72,
  depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide
 }),32
);
trafficHeadlightGlows.count=0;
trafficHeadlightGlows.visible=false;
trafficHeadlightGlows.frustumCulled=false;
trafficHeadlightGlows.renderOrder=2;
scene.add(trafficHeadlightGlows);
const trafficLampPose=new THREE.Object3D();
// Local-space front lamp centres; negative Z is the rear of these procedural vehicles.
const trafficLampPositions={
 taxi:[.71,.99,1.81],bus:[.97,.98,2.88],busBlue:[.97,.98,2.88],
 truck:[.88,1.66,3.20],tuktuk:[0,1.15,1.50],
 bike:[0,1.12,1.45],sportsCar:[.68,.68,1.78]
};
function updateTrafficHeadlightGlows(){
 // JJ Market is daylight; Pattaya has its own neon and projectile effects.
 if(districtIndex===3||districtIndex===5){
  trafficHeadlightGlows.visible=false;trafficHeadlightGlows.count=0;return;
 }
 let used=0;
 for(const h of hazards){
  const spec=trafficLampPositions[h.type];
  // Imported GLBs have unverified lamp axes: never place a glow in mid-air.
  if(!spec||h.g.userData.detailedTukTuk)continue;
  const scale=h.g.scale.x,yaw=h.g.rotation.y,cos=Math.cos(yaw),sin=Math.sin(yaw);
  const sides=spec[0]===0?[0]:[-1,1];
  for(const side of sides){
   if(used>=trafficHeadlightGlows.instanceMatrix.count)break;
   const localX=side*spec[0]*scale,localZ=spec[2]*scale;
   trafficLampPose.position.set(
    h.g.position.x+localX*cos+localZ*sin,
    h.g.position.y+spec[1]*scale,
    h.g.position.z-localX*sin+localZ*cos
   );
   trafficLampPose.rotation.set(0,yaw,0);
   const diameter=(side===0?.62:.53)*scale;
   trafficLampPose.scale.set(diameter,diameter,1);
   trafficLampPose.updateMatrix();
   trafficHeadlightGlows.setMatrixAt(used++,trafficLampPose.matrix);
  }
  if(used>=trafficHeadlightGlows.instanceMatrix.count)break;
 }
 trafficHeadlightGlows.count=used;
 trafficHeadlightGlows.visible=used>0;
 if(used)trafficHeadlightGlows.instanceMatrix.needsUpdate=true;
}
// Night-traffic headlamps streak across wet asphalt without expensive shadow-casting
// lights or secondary render passes. Reuse the existing 64px lamp atlas and draw
// all projected light pools in ONE instanced transparent mesh (mobile-friendly).
const trafficRoadGlows=new THREE.InstancedMesh(
 new THREE.PlaneGeometry(1,1),
 new THREE.MeshBasicMaterial({
  map:trafficLampTexture,color:0xffd7a1,transparent:true,opacity:.20,
  depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide
 }),32
);
trafficRoadGlows.count=0;
trafficRoadGlows.visible=false;
trafficRoadGlows.frustumCulled=false;
trafficRoadGlows.renderOrder=1;
scene.add(trafficRoadGlows);
const trafficRoadGlowPose=new THREE.Object3D();
trafficRoadGlowPose.rotation.x=-Math.PI/2;
function updateTrafficRoadGlows(){
 // Never project fake traffic beams across the daytime market or Pattaya scene.
 const nighttime=districtIndex===1||districtIndex===2||districtIndex===4||districtIndex===6;
 if(!nighttime){trafficRoadGlows.count=0;trafficRoadGlows.visible=false;return;}
 // Dry construction asphalt scatters less specular light than Yaowarat puddles.
 trafficRoadGlows.material.opacity=districtIndex===1?.25:districtIndex===2?.11:districtIndex===6?.16:.19;
 let used=0;
 for(const h of hazards){
  const lamp=trafficLampPositions[h.type];
  if(!lamp||h.g.userData.detailedTukTuk)continue;
  const scale=h.g.scale.x,yaw=h.g.rotation.y,cos=Math.cos(yaw),sin=Math.sin(yaw);
  for(const side of lamp[0]===0?[0]:[-1,1]){
   if(used>=trafficRoadGlows.instanceMatrix.count)break;
   const lx=side*lamp[0]*scale,lz=(lamp[2]+1.35)*scale;
   const px=h.g.position.x+lx*cos+lz*sin;
   // Keep projected reflections inside the drivable road, not on sidewalks.
   if(Math.abs(px)>5.05)continue;
   trafficRoadGlowPose.position.set(px,.077,h.g.position.z-lx*sin+lz*cos);
   trafficRoadGlowPose.scale.set((side===0?1.05:.82)*scale,3.35*scale,1);
   trafficRoadGlowPose.updateMatrix();
   trafficRoadGlows.setMatrixAt(used++,trafficRoadGlowPose.matrix);
  }
  if(used>=trafficRoadGlows.instanceMatrix.count)break;
 }
 trafficRoadGlows.count=used;
 trafficRoadGlows.visible=used>0;
 if(used)trafficRoadGlows.instanceMatrix.needsUpdate=true;
}
// Rolling durian: textured oval fruit + one instanced thorn draw call.
// The rolling body is centered at its axle, while its ground shadow stays still.
function makeDurian(){
 const group=new THREE.Group(),body=new THREE.Group();
 body.position.y=.77;
 group.add(body);
 const canvas=document.createElement('canvas');canvas.width=128;canvas.height=64;
 const ctx=canvas.getContext('2d');
 const pixels=ctx.createImageData(128,64);
 for(let y=0;y<64;y++)for(let x=0;x<128;x++){
  const i=(y*128+x)*4;
  const seed=Math.sin(x*127.1+y*311.7)*43758.5453;
  const noise=seed-Math.floor(seed);
  const mottled=Math.sin(x*.41)*Math.sin(y*.72)*13+(noise-.5)*31;
  pixels.data[i]=Math.max(25,Math.min(125,74+mottled));
  pixels.data[i+1]=Math.max(65,Math.min(158,112+mottled));
  pixels.data[i+2]=Math.max(15,Math.min(72,35+mottled*.65));
  pixels.data[i+3]=255;
 }
 ctx.putImageData(pixels,0,0);
 const skinMap=new THREE.CanvasTexture(canvas);skinMap.colorSpace=THREE.SRGBColorSpace;
 const fruit=new THREE.Mesh(new THREE.SphereGeometry(.72,24,16),new THREE.MeshStandardMaterial({map:skinMap,roughness:.92,metalness:0}));
 fruit.scale.set(1,.9,1.08);body.add(fruit);
 const count=84,spikes=new THREE.InstancedMesh(
  new THREE.ConeGeometry(.105,.29,5),
  new THREE.MeshStandardMaterial({color:0x829735,roughness:.91,metalness:0}),count
 );
 const dummy=new THREE.Object3D(),up=new THREE.Vector3(0,1,0),normal=new THREE.Vector3();
 for(let i=0;i<count;i++){
  const y=1-2*(i+.5)/count,phi=i*2.399963229728653;
  const radial=Math.sqrt(1-y*y);
  normal.set(Math.cos(phi)*radial,y,Math.sin(phi)*radial);
  dummy.position.set(normal.x*.72,normal.y*.65,normal.z*.77);
  dummy.quaternion.setFromUnitVectors(up,normal);
  const length=.76+((i*37)%17)/40;
  dummy.scale.set(1,length,1);dummy.updateMatrix();
  spikes.setMatrixAt(i,dummy.matrix);
 }
 spikes.instanceMatrix.needsUpdate=true;body.add(spikes);
 const shadow=new THREE.Mesh(new THREE.CircleGeometry(.66,20),new THREE.MeshBasicMaterial({color:0x0c1611,transparent:true,opacity:.26,depthWrite:false}));
 shadow.rotation.x=-Math.PI/2;shadow.position.y=.016;group.add(shadow);
 return group;
}
// V0.6 detailed lightweight procedural characters; no external asset downloads
const cream=mat(0xf3e6c9),gold2=mat(0xf7bc38),maroon=mat(0x9a294d),jade=mat(0x168b77),ink=mat(0x222139);
function part(g,o){g.add(o);return o}
function rod(g,a,b,r,m){const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),d=q.clone().sub(p),o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,d.length(),8),m);o.position.copy(p).add(q).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());g.add(o);return o}
// Bangkok bus classics: blue-white route 8 and red-cream route 203.
// Shared PBR bus finishes: baked details rather than per-vehicle lights or shaders.
const busBlue=new THREE.MeshPhysicalMaterial({color:0x287fbd,metalness:.22,roughness:.4,clearcoat:.42,clearcoatRoughness:.28});
const busCream=new THREE.MeshStandardMaterial({color:0xf2efe0,metalness:.06,roughness:.68});
const busRed=new THREE.MeshPhysicalMaterial({color:0xbd342f,metalness:.18,roughness:.43,clearcoat:.34});
const busYellow=new THREE.MeshStandardMaterial({color:0xf6d455,metalness:.08,roughness:.58});
const busGreen=new THREE.MeshStandardMaterial({color:0x23884e,metalness:.12,roughness:.5});
const busDark=new THREE.MeshStandardMaterial({color:0x203b4c,metalness:.12,roughness:.38});
const busLamp=new THREE.MeshStandardMaterial({color:0xffe8a1,emissive:0x493817,emissiveIntensity:.22,roughness:.24});
const busTailLamp=new THREE.MeshStandardMaterial({color:0xaf2028,emissive:0x50070a,emissiveIntensity:.3,roughness:.28});
// Shared baked windscreen: rubber gasket, rain haze, reflections and twin
// wiper sweeps add depth without per-bus meshes, lights or frame-time canvas work.
const busGlassCanvas=document.createElement('canvas');busGlassCanvas.width=512;busGlassCanvas.height=192;
const busGlassCtx=busGlassCanvas.getContext('2d');
const busGlassGradient=busGlassCtx.createLinearGradient(0,0,512,192);
busGlassGradient.addColorStop(0,'#617d8b');busGlassGradient.addColorStop(.38,'#2c4759');
busGlassGradient.addColorStop(1,'#142936');
busGlassCtx.fillStyle='#18232c';busGlassCtx.fillRect(0,0,512,192);
busGlassCtx.fillStyle=busGlassGradient;busGlassCtx.fillRect(13,12,486,168);
busGlassCtx.fillStyle='rgba(208,226,229,.15)';
busGlassCtx.beginPath();busGlassCtx.moveTo(60,13);busGlassCtx.lineTo(180,13);
busGlassCtx.lineTo(100,179);busGlassCtx.lineTo(27,179);busGlassCtx.closePath();busGlassCtx.fill();
busGlassCtx.fillStyle='rgba(201,224,232,.075)';
busGlassCtx.beginPath();busGlassCtx.moveTo(352,13);busGlassCtx.lineTo(408,13);
busGlassCtx.lineTo(334,179);busGlassCtx.lineTo(291,179);busGlassCtx.closePath();busGlassCtx.fill();
// Fine rain streaks are baked, never simulated per frame.
busGlassCtx.strokeStyle='rgba(197,216,221,.13)';busGlassCtx.lineWidth=1;
for(let i=0;i<35;i++){
 const x=21+(i*137)%470,y=17+(i*53)%133;
 busGlassCtx.beginPath();busGlassCtx.moveTo(x,y);busGlassCtx.lineTo(x-2,y+9+(i%13));busGlassCtx.stroke();
}
busGlassCtx.strokeStyle='#111b21';busGlassCtx.lineWidth=5;busGlassCtx.lineCap='round';
for(const [x0,y0,x1,y1] of [[88,168,241,105],[426,168,271,105]]){
 busGlassCtx.beginPath();busGlassCtx.moveTo(x0,y0);busGlassCtx.lineTo(x1,y1);busGlassCtx.stroke();
}
busGlassCtx.strokeStyle='rgba(186,201,205,.5)';busGlassCtx.lineWidth=1.5;
for(const [x0,y0,x1,y1] of [[88,168,241,105],[426,168,271,105]]){
 busGlassCtx.beginPath();busGlassCtx.moveTo(x0,y0-3);busGlassCtx.lineTo(x1,y1-3);busGlassCtx.stroke();
}
const busGlassTexture=new THREE.CanvasTexture(busGlassCanvas);busGlassTexture.colorSpace=THREE.SRGBColorSpace;
busGlassTexture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
const busWindshield=new THREE.MeshPhysicalMaterial({map:busGlassTexture,metalness:0,roughness:.28,clearcoat:.55,clearcoatRoughness:.19,side:THREE.DoubleSide});
// A shallow crowned, rearward-raked front windscreen follows the bus roof
// rather than reading as a flat toy-like rectangle. Shared by both liveries.
const busFrontGlassPane=new THREE.BufferGeometry();
const busGlassPositions=[],busGlassUVs=[],busGlassIndices=[];
for(let column=0;column<5;column++){
 const x=-1.175+column*(2.35/4);
 for(let row=0;row<2;row++){
  const t=row,edge=Math.pow(x/1.175,2);
  busGlassPositions.push(x,1.84+.88*t,2.82-.08*t-.06*edge);
  busGlassUVs.push(column/4,t);
 }
}
for(let column=0;column<4;column++){
 const left=column*2,right=left+2;
 busGlassIndices.push(left,right,left+1,right,right+1,left+1);
}
busFrontGlassPane.setAttribute('position',new THREE.Float32BufferAttribute(busGlassPositions,3));
busFrontGlassPane.setAttribute('uv',new THREE.Float32BufferAttribute(busGlassUVs,2));
busFrontGlassPane.setIndex(busGlassIndices);
busFrontGlassPane.computeVertexNormals();
// Side A-pillars, centre mullion and lower rubber seal are one shared mesh.
// Their surface follows the same rake and crown as the glazing, preserving
// the original one-draw-call frame budget without extra lights or textures.
const busFrontFrameGeometry=new THREE.BufferGeometry();
const busFramePositions=[],busFrameIndices=[];
function addBusFrontFrameQuad(x0,y0,x1,y1){
 const base=busFramePositions.length/3;
 for(const [x,y] of [[x0,y0],[x1,y0],[x0,y1],[x1,y1]]){
  busFramePositions.push(x,y,2.847-.08*((y-1.84)/.88)-.06*Math.pow(x/1.175,2));
 }
 busFrameIndices.push(base,base+1,base+2,base+1,base+3,base+2);
}
for(const x of [-1.175,0,1.175]){
 const halfWidth=x===0?.035:.06;
 addBusFrontFrameQuad(x-halfWidth,1.82,x+halfWidth,2.74);
}
for(let i=0;i<4;i++){
 const x0=-1.21+i*.605;
 addBusFrontFrameQuad(x0,1.80,x0+.605,1.86);
}
busFrontFrameGeometry.setAttribute('position',new THREE.Float32BufferAttribute(busFramePositions,3));
busFrontFrameGeometry.setIndex(busFrameIndices);
busFrontFrameGeometry.computeVertexNormals();
const busRearGlassPane=new THREE.PlaneGeometry(2.32,.78);

// Rear bus glazing faces the player most often; it should not reuse the
// FRONT windscreen's painted wipers. A small shared baked rear-window atlas
// adds heater wires, seat shadows, gasket and Bangkok night reflections.
// One 256x128 texture is shared by both bus liveries, with zero new meshes,
// draw calls, dynamic lights or per-frame canvas updates.
const busRearGlassCanvas=document.createElement('canvas');
busRearGlassCanvas.width=256;busRearGlassCanvas.height=128;
const busRearGlassCtx=busRearGlassCanvas.getContext('2d');
const rearTint=busRearGlassCtx.createLinearGradient(0,0,0,128);
rearTint.addColorStop(0,'#536c79');rearTint.addColorStop(.45,'#273f4e');
rearTint.addColorStop(1,'#101e2a');
busRearGlassCtx.fillStyle='#11191f';busRearGlassCtx.fillRect(0,0,256,128);
busRearGlassCtx.fillStyle=rearTint;busRearGlassCtx.fillRect(7,7,242,114);
// Dim seat backs/headrests behind tinted glass, visible at driving distance.
busRearGlassCtx.fillStyle='rgba(9,17,24,.40)';
for(const cx of [70,185]){
 busRearGlassCtx.beginPath();busRearGlassCtx.ellipse(cx,79,16,19,0,0,Math.PI*2);busRearGlassCtx.fill();
 busRearGlassCtx.fillRect(cx-24,92,48,30);
}
// Slanted sky and street-neon reflections, baked rather than screen-space.
busRearGlassCtx.fillStyle='rgba(209,231,232,.12)';
busRearGlassCtx.beginPath();busRearGlassCtx.moveTo(29,9);
busRearGlassCtx.lineTo(80,9);busRearGlassCtx.lineTo(45,119);
busRearGlassCtx.lineTo(12,119);busRearGlassCtx.closePath();busRearGlassCtx.fill();
busRearGlassCtx.fillStyle='rgba(246,118,82,.09)';
busRearGlassCtx.beginPath();busRearGlassCtx.moveTo(199,8);
busRearGlassCtx.lineTo(219,8);busRearGlassCtx.lineTo(181,120);
busRearGlassCtx.lineTo(168,120);busRearGlassCtx.closePath();busRearGlassCtx.fill();
// Thin rear defogger wires and two vertical feed strips, not front wipers.
busRearGlassCtx.strokeStyle='rgba(180,145,106,.31)';
busRearGlassCtx.lineWidth=.8;
for(let y=27;y<=110;y+=12){
 busRearGlassCtx.beginPath();busRearGlassCtx.moveTo(10,y);
 busRearGlassCtx.lineTo(246,y);busRearGlassCtx.stroke();
}
busRearGlassCtx.strokeStyle='rgba(191,168,137,.33)';
busRearGlassCtx.lineWidth=1.6;
for(const x of [12,244]){
 busRearGlassCtx.beginPath();busRearGlassCtx.moveTo(x,22);
 busRearGlassCtx.lineTo(x,112);busRearGlassCtx.stroke();
}
// Rubber seal and subtle dirt along the lower edge.
busRearGlassCtx.strokeStyle='#131b20';busRearGlassCtx.lineWidth=7;
busRearGlassCtx.strokeRect(3.5,3.5,249,121);
busRearGlassCtx.fillStyle='rgba(154,145,128,.12)';
for(let i=0;i<48;i++){
 const x=12+(i*71)%233,y=108+(i*13)%12;
 busRearGlassCtx.fillRect(x,y,1+(i%2),1);
}
const busRearGlassTexture=new THREE.CanvasTexture(busRearGlassCanvas);
busRearGlassTexture.colorSpace=THREE.SRGBColorSpace;
busRearGlassTexture.anisotropy=Math.min(2,renderer.capabilities.getMaxAnisotropy());
const busRearWindowMaterial=new THREE.MeshPhysicalMaterial({
 map:busRearGlassTexture,metalness:0,roughness:.34,
 clearcoat:.45,clearcoatRoughness:.25,side:THREE.DoubleSide
});

// A single shared PBR side-glazing atlas per bus livery replaces twenty
// individual window/frame meshes per vehicle. Painted frames, passenger
// silhouettes, grime and reflections are baked once at startup.
function makeBusSideGlazing(blue){
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;
 const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
 ctx.fillStyle=blue?'#e5e1d5':'#e7e1cc';ctx.fillRect(0,0,w,h);
 for(let i=0;i<5;i++){
  const x=11+i*99,grad=ctx.createLinearGradient(x,9,x+90,113);
  grad.addColorStop(0,'#536d7c');grad.addColorStop(.35,'#233b4b');grad.addColorStop(1,'#101e2a');
  ctx.fillStyle='#292e36';ctx.fillRect(x-4,4,94,119);
  ctx.fillStyle=grad;ctx.fillRect(x,9,86,105);
  // Bangkok bus interior baked into the existing shared PBR window atlas:
  // warm ceiling light, grab rails, hand straps and vinyl seat backs.
  // No additional meshes, materials, draw calls or per-frame canvas work.
  const interiorGlow=ctx.createLinearGradient(0,13,0,57);
  interiorGlow.addColorStop(0,'rgba(255,221,150,.24)');
  interiorGlow.addColorStop(1,'rgba(255,221,150,0)');
  ctx.fillStyle=interiorGlow;ctx.fillRect(x+2,12,82,45);
  ctx.strokeStyle='rgba(191,207,204,.53)';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(x+4,31);ctx.lineTo(x+82,31);ctx.stroke();
  for(const railX of [x+19,x+71]){
   ctx.strokeStyle='rgba(169,193,196,.43)';ctx.lineWidth=2;
   ctx.beginPath();ctx.moveTo(railX,31);ctx.lineTo(railX,107);ctx.stroke();
  }
  for(const strapX of [x+39,x+59]){
   ctx.strokeStyle='rgba(226,217,190,.52)';ctx.lineWidth=1.6;
   ctx.beginPath();ctx.moveTo(strapX,31);ctx.lineTo(strapX,42);
   ctx.ellipse(strapX,48,4,6,0,0,Math.PI*2);ctx.stroke();
  }
  for(const seatX of [x+5,x+49]){
   ctx.fillStyle='rgba(81,61,54,.67)';
   ctx.beginPath();ctx.roundRect(seatX,83,29,27,5);ctx.fill();
   ctx.fillStyle='rgba(177,116,78,.34)';ctx.fillRect(seatX+3,85,23,3);
   ctx.strokeStyle='rgba(28,31,33,.55)';ctx.lineWidth=1;
   ctx.strokeRect(seatX+1,85,27,23);
  }
  // Interior shadows and seated passenger silhouettes stay subtle at speed.
  ctx.fillStyle='rgba(10,19,26,.44)';
  ctx.beginPath();ctx.ellipse(x+30+(i%2)*24,78,14,20,0,0,Math.PI*2);ctx.fill();
  ctx.fillRect(x+17+(i%2)*24,90,28,25);
  ctx.fillStyle='rgba(203,224,229,.18)';
  ctx.beginPath();ctx.moveTo(x+7,17);ctx.lineTo(x+31,17);ctx.lineTo(x+13,110);ctx.lineTo(x+2,110);ctx.closePath();ctx.fill();
  ctx.strokeStyle='rgba(192,215,223,.20)';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(x+65,13);ctx.lineTo(x+39,108);ctx.stroke();
  ctx.fillStyle='rgba(202,196,172,.19)';
  for(let k=0;k<9;k++){const xx=x+((k*31+i*17)%85),yy=12+((k*29+i*13)%99);ctx.fillRect(xx,yy,2,1);}
 }
 // Fine gasket trim and weathered lower sill.
 ctx.fillStyle=blue?'#2a6790':'#7d3a36';ctx.fillRect(0,121,w,5);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
 return new THREE.MeshStandardMaterial({map:texture,metalness:.14,roughness:.36,side:THREE.DoubleSide});
}
const busSideGlazing={red:makeBusSideGlazing(false),blue:makeBusSideGlazing(true)};
const busSidePane=new THREE.PlaneGeometry(4.88,.84);

// Route and left-side entry door are baked into three small shared textures,
// so traffic clones reuse the same geometry and avoid per-frame canvas work.
function makeBusRouteMaterial(route){
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=96;
 const ctx=canvas.getContext('2d');
 ctx.fillStyle='#101a24';ctx.fillRect(0,0,256,96);
 ctx.strokeStyle='#d5c7a2';ctx.lineWidth=4;ctx.strokeRect(3,3,250,90);
 ctx.fillStyle='#fff0b9';ctx.textAlign='center';
 ctx.font=route==='203'?'bold 57px sans-serif':'bold 68px sans-serif';
 ctx.fillText(route,128,65);
 ctx.font='17px sans-serif';ctx.fillText('กรุงเทพฯ',128,88);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 return new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide});
}
const busRouteSigns={red:makeBusRouteMaterial('203'),blue:makeBusRouteMaterial('8')};
const busRoutePane=new THREE.PlaneGeometry(.81,.32);
const busDoorCanvas=document.createElement('canvas');busDoorCanvas.width=128;busDoorCanvas.height=256;
const busDoorCtx=busDoorCanvas.getContext('2d');
busDoorCtx.fillStyle='#222b33';busDoorCtx.fillRect(0,0,128,256);
for(const dx of [8,66]){
 const grad=busDoorCtx.createLinearGradient(dx,10,dx+50,163);
 grad.addColorStop(0,'#577587');grad.addColorStop(.45,'#263f4e');grad.addColorStop(1,'#15252f');
 busDoorCtx.fillStyle=grad;busDoorCtx.fillRect(dx,12,52,145);
 busDoorCtx.fillStyle='rgba(210,225,227,.18)';
 busDoorCtx.beginPath();busDoorCtx.moveTo(dx+8,17);busDoorCtx.lineTo(dx+19,17);
 busDoorCtx.lineTo(dx+7,150);busDoorCtx.lineTo(dx+3,150);busDoorCtx.closePath();busDoorCtx.fill();
}
busDoorCtx.fillStyle='#8c9497';busDoorCtx.fillRect(0,163,128,6);
busDoorCtx.fillStyle='#505e65';busDoorCtx.fillRect(6,174,116,73);
busDoorCtx.fillStyle='#c6c8bb';busDoorCtx.fillRect(62,5,4,246);
busDoorCtx.fillStyle='#c2c8c4';busDoorCtx.fillRect(0,0,128,7);busDoorCtx.fillRect(0,249,128,7);
const busDoorTexture=new THREE.CanvasTexture(busDoorCanvas);busDoorTexture.colorSpace=THREE.SRGBColorSpace;
const busDoorMaterial=new THREE.MeshStandardMaterial({map:busDoorTexture,metalness:.12,roughness:.45,side:THREE.DoubleSide});
const busDoorPane=new THREE.PlaneGeometry(.79,1.7);
// Shared weathered rear atlases: one textured plane per bus instead of
// individual vent, access hatch, bolt and license plate meshes.
function makeBusRearPanelMaterial(blue){
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;
 const ctx=canvas.getContext('2d');
 const paint=ctx.createLinearGradient(0,0,0,256);
 paint.addColorStop(0,blue?'#e6e2d7':'#b63a34');
 paint.addColorStop(.7,blue?'#d6d1c5':'#a92e2d');
 paint.addColorStop(1,blue?'#8b9aa0':'#6f3433');
 ctx.fillStyle=paint;ctx.fillRect(0,0,512,256);
 // Pressed metal service hatch, recessed louvers and trim are all baked.
 ctx.lineWidth=3;ctx.strokeStyle=blue?'#6b7373':'#672d2b';ctx.strokeRect(22,15,468,222);
 ctx.lineWidth=1;ctx.strokeStyle='rgba(240,236,220,.48)';ctx.strokeRect(27,19,458,214);
 ctx.fillStyle=blue?'#2b668a':'#e7d9c2';ctx.fillRect(0,126,512,11);
 ctx.fillStyle=blue?'#d4b950':'#477456';ctx.fillRect(0,137,512,5);
 for(let row=0;row<7;row++){
  const y=35+row*12;
  ctx.fillStyle='rgba(16,28,32,.55)';ctx.fillRect(74,y,364,5);
  ctx.fillStyle='rgba(239,233,217,.34)';ctx.fillRect(74,y+5,364,2);
 }
 for(const x of [35,477])for(const y of [29,115,157,222]){
  ctx.fillStyle='#3b4549';ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='rgba(241,237,222,.55)';ctx.fillRect(x-1,y-2,2,1);
 }
 // Deterministic grime; no animation or random per-frame texture work.
 ctx.fillStyle='rgba(23,30,31,.16)';
 for(let i=0;i<125;i++)ctx.fillRect(17+(i*173)%480,148+(i*67)%100,1+i%3,1+i%2);
 ctx.fillStyle='#f1e8cf';ctx.fillRect(175,172,162,56);
 ctx.strokeStyle='#49525a';ctx.lineWidth=3;ctx.strokeRect(175,172,162,56);
 ctx.textAlign='center';ctx.fillStyle='#202a2d';
 ctx.font='bold 28px sans-serif';ctx.fillText(blue?'กท 008':'กท 203',256,203);
 ctx.font='14px sans-serif';ctx.fillText('กรุงเทพมหานคร',256,221);
 ctx.textAlign='left';ctx.font='bold 17px sans-serif';
 ctx.fillStyle=blue?'#173e57':'#f1dfb7';ctx.fillText('รถโดยสาร',37,178);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 texture.anisotropy=Math.min(2,renderer.capabilities.getMaxAnisotropy());
 return new THREE.MeshStandardMaterial({map:texture,metalness:.12,roughness:.65,side:THREE.DoubleSide});
}
const busRearPanels={red:makeBusRearPanelMaterial(false),blue:makeBusRearPanelMaterial(true)};
const busRearPanelGeometry=new THREE.PlaneGeometry(2.25,1.10);
// Baked Bangkok bus rear lamp assemblies: red stop lamps, amber turn signals,
// clear reverse lenses, stamped chrome rims and fine lens ribbing.
// Both liveries share one 512x128 atlas; no lights or per-frame allocations.
const busRearLampCanvas=document.createElement('canvas');
busRearLampCanvas.width=512;busRearLampCanvas.height=128;
const busRearLampCtx=busRearLampCanvas.getContext('2d');
for(const cx of [43,469]){
 const ctx=busRearLampCtx;
 ctx.fillStyle='rgba(14,19,23,.96)';ctx.fillRect(cx-25,10,50,108);
 ctx.fillStyle='#626c70';ctx.fillRect(cx-21,13,42,102);
 ctx.fillStyle='#1c2329';ctx.fillRect(cx-18,16,36,96);
 for(const lens of [
  {y:19,h:49,top:'#f04c48',bottom:'#760e16'},
  {y:70,h:20,top:'#f4c05e',bottom:'#a95615'},
  {y:92,h:17,top:'#c6e3e6',bottom:'#647e85'}
 ]){
  const grad=ctx.createLinearGradient(0,lens.y,0,lens.y+lens.h);
  grad.addColorStop(0,lens.top);grad.addColorStop(1,lens.bottom);
  ctx.fillStyle=grad;ctx.fillRect(cx-15,lens.y,30,lens.h);
  ctx.fillStyle='rgba(255,255,255,.28)';ctx.fillRect(cx-12,lens.y+3,3,lens.h-6);
  ctx.strokeStyle='rgba(30,28,28,.35)';ctx.lineWidth=1;
  for(let y=lens.y+6;y<lens.y+lens.h-2;y+=7){
   ctx.beginPath();ctx.moveTo(cx-13,y);ctx.lineTo(cx+13,y);ctx.stroke();
  }
 }
 ctx.fillStyle='rgba(228,230,222,.7)';
 ctx.fillRect(cx-23,20,2,3);ctx.fillRect(cx+21,106,2,3);
}
const busRearLampAtlas=new THREE.CanvasTexture(busRearLampCanvas);
busRearLampAtlas.colorSpace=THREE.SRGBColorSpace;
busRearLampAtlas.anisotropy=Math.min(2,renderer.capabilities.getMaxAnisotropy());
const busRearLampMaterial=new THREE.MeshStandardMaterial({
 map:busRearLampAtlas,transparent:true,alphaTest:.15,depthWrite:false,
 metalness:.12,roughness:.43,emissive:0x38100b,emissiveIntensity:.18,
 side:THREE.DoubleSide
});
const busRearLampPane=new THREE.PlaneGeometry(2.85,.56);

// Shared Bangkok bus front grille: stamped mesh, brushed-metal slats,
// rubber surround and fasteners baked into one 256x128 PBR atlas at startup.
// The grille fits between existing headlamps; no collision or light changes.
const busFrontFasciaCanvas=document.createElement('canvas');
busFrontFasciaCanvas.width=256;busFrontFasciaCanvas.height=128;
const fasciaCtx=busFrontFasciaCanvas.getContext('2d');
fasciaCtx.fillStyle='#141a20';fasciaCtx.fillRect(0,0,256,128);
const fasciaBorder=fasciaCtx.createLinearGradient(0,0,0,128);
fasciaBorder.addColorStop(0,'#a9b3b3');fasciaBorder.addColorStop(.45,'#3c4a50');
fasciaBorder.addColorStop(1,'#758184');
fasciaCtx.fillStyle=fasciaBorder;fasciaCtx.fillRect(3,4,250,120);
fasciaCtx.fillStyle='#141d23';fasciaCtx.fillRect(11,12,234,104);
fasciaCtx.fillStyle='#25323a';fasciaCtx.fillRect(17,19,222,91);
// Fine diamond grille mesh; slats catch overhead highlights without extra geometry.
fasciaCtx.strokeStyle='rgba(6,12,17,.7)';fasciaCtx.lineWidth=1.2;
for(let x=-110;x<365;x+=10){
 fasciaCtx.beginPath();fasciaCtx.moveTo(x,20);fasciaCtx.lineTo(x+104,109);fasciaCtx.stroke();
 fasciaCtx.beginPath();fasciaCtx.moveTo(x,109);fasciaCtx.lineTo(x+104,20);fasciaCtx.stroke();
}
for(const y of [28,52,76,100]){
 const metal=fasciaCtx.createLinearGradient(0,y,0,y+10);
 metal.addColorStop(0,'#aeb8b8');metal.addColorStop(.25,'#65727a');
 metal.addColorStop(.8,'#28343c');metal.addColorStop(1,'#111a21');
 fasciaCtx.fillStyle=metal;fasciaCtx.fillRect(17,y,222,9);
 fasciaCtx.fillStyle='rgba(238,240,230,.25)';fasciaCtx.fillRect(20,y,216,1);
}
// Recessed badge and oxidized fasteners are printed, not extra meshes.
fasciaCtx.fillStyle='#b6bfbb';fasciaCtx.beginPath();
fasciaCtx.arc(128,65,17,0,Math.PI*2);fasciaCtx.fill();
fasciaCtx.fillStyle='#283b44';fasciaCtx.beginPath();
fasciaCtx.arc(128,65,13,0,Math.PI*2);fasciaCtx.fill();
fasciaCtx.fillStyle='#d4d6ce';fasciaCtx.fillRect(120,62,16,3);
for(const x of [9,247])for(const y of [10,118]){
 fasciaCtx.fillStyle='#18262e';fasciaCtx.beginPath();
 fasciaCtx.arc(x,y,2.3,0,Math.PI*2);fasciaCtx.fill();
}
for(let i=0;i<110;i++){
 fasciaCtx.fillStyle=i%3?'rgba(8,14,19,.14)':'rgba(224,207,177,.1)';
 fasciaCtx.fillRect(16+(i*71)%223,20+(i*37)%89,1+(i%2),1);
}
const busFrontFasciaTexture=new THREE.CanvasTexture(busFrontFasciaCanvas);
busFrontFasciaTexture.colorSpace=THREE.SRGBColorSpace;
busFrontFasciaTexture.anisotropy=Math.min(2,renderer.capabilities.getMaxAnisotropy());
const busFrontFasciaMaterial=new THREE.MeshStandardMaterial({
 map:busFrontFasciaTexture,metalness:.3,roughness:.58,side:THREE.DoubleSide
});
const busFrontFasciaPane=new THREE.PlaneGeometry(1.75,.56);
// Shared Bangkok bus wheel atlas: sidewall, steel rim, lug nuts and tyre tread
// on a single PBR mesh per wheel (no extra draw calls or per-bus geometry).
const busWheelCanvas=document.createElement('canvas');
busWheelCanvas.width=busWheelCanvas.height=256;
const busWheelCtx=busWheelCanvas.getContext('2d');
busWheelCtx.fillStyle='#1c2024';busWheelCtx.fillRect(0,0,256,256);
// Narrow atlas strip for the cylindrical tread; the lower region is the hub face.
busWheelCtx.fillStyle='#282b2e';busWheelCtx.fillRect(0,0,256,55);
for(let x=0;x<256;x+=16){
 busWheelCtx.fillStyle='#121517';busWheelCtx.fillRect(x,0,3,55);
 busWheelCtx.strokeStyle='#44474a';busWheelCtx.lineWidth=2;
 busWheelCtx.beginPath();busWheelCtx.moveTo(x+4,4);busWheelCtx.lineTo(x+12,25);
 busWheelCtx.lineTo(x+4,51);busWheelCtx.stroke();
}
const wheelCx=128,wheelCy=156;
function busWheelRing(radius,color,width=0){
 busWheelCtx.beginPath();busWheelCtx.arc(wheelCx,wheelCy,radius,0,Math.PI*2);
 if(width){busWheelCtx.strokeStyle=color;busWheelCtx.lineWidth=width;busWheelCtx.stroke();}
 else{busWheelCtx.fillStyle=color;busWheelCtx.fill();}
}
busWheelRing(96,'#111519');busWheelRing(86,'#363a3e',3);
busWheelRing(75,'#22282d',2);busWheelRing(63,'#0d1115',7);
busWheelRing(54,'#9a9e9e');busWheelRing(46,'#6d7477',4);
busWheelRing(36,'#b0b5b2');busWheelRing(24,'#777e82',4);
busWheelRing(17,'#454b4e');
for(let n=0;n<6;n++){
 const a=n*Math.PI/3;
 busWheelCtx.beginPath();busWheelCtx.arc(wheelCx+33*Math.cos(a),wheelCy+33*Math.sin(a),5,0,Math.PI*2);
 busWheelCtx.fillStyle='#34383b';busWheelCtx.fill();
 busWheelCtx.strokeStyle='#d0d0c7';busWheelCtx.lineWidth=1.5;busWheelCtx.stroke();
}
const busWheelTexture=new THREE.CanvasTexture(busWheelCanvas);
busWheelTexture.colorSpace=THREE.SRGBColorSpace;
busWheelTexture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
const busWheelMaterial=new THREE.MeshStandardMaterial({map:busWheelTexture,metalness:.22,roughness:.76});
const busWheelGeometry=new THREE.CylinderGeometry(.48,.48,.21,18);
// Shared pressed-rubber wheel-arch lips soften the bus side silhouette.
// Four upper semicircles reuse one PBR material and geometry: one draw call per bus.
// The road-facing body and collision bounds stay unchanged.
const busWheelArchGeometry=new THREE.TorusGeometry(.57,.052,6,24,Math.PI);
const busWheelArchMaterial=new THREE.MeshStandardMaterial({color:0x24282b,metalness:.14,roughness:.73});
// CylinderGeometry has separate vertices for tread and both caps; pack UVs
// into their respective atlas regions while keeping one material/draw call.
const busWheelUV=busWheelGeometry.attributes.uv,busWheelIndex=busWheelGeometry.index;
const busWheelMappedVertices=new Set();
for(const group of busWheelGeometry.groups){
 for(let i=group.start;i<group.start+group.count;i++){
  const vertex=busWheelIndex.getX(i);
  if(busWheelMappedVertices.has(vertex))continue;
  busWheelMappedVertices.add(vertex);
  const v=busWheelUV.getY(vertex);
  busWheelUV.setY(vertex,group.materialIndex===0?.78+v*.22:v*.78);
 }
}
busWheelUV.needsUpdate=true;
// Shared rounded pressed-metal bus shell replaces the toy-like rectangular body.
// Keep the original 2.86 x 2.52 x 5.3 m collision silhouette and one body mesh.
// Eight short corner arcs soften both Bangkok bus liveries; geometry is built once.
const busBodyOutline=new THREE.Shape();
busBodyOutline.moveTo(-1.27,-1.26);
busBodyOutline.lineTo(1.27,-1.26);
busBodyOutline.quadraticCurveTo(1.43,-1.26,1.43,-1.10);
busBodyOutline.lineTo(1.43,1.10);
busBodyOutline.quadraticCurveTo(1.43,1.26,1.27,1.26);
busBodyOutline.lineTo(-1.27,1.26);
busBodyOutline.quadraticCurveTo(-1.43,1.26,-1.43,1.10);
busBodyOutline.lineTo(-1.43,-1.10);
busBodyOutline.quadraticCurveTo(-1.43,-1.26,-1.27,-1.26);
const busBodyGeometry=new THREE.ExtrudeGeometry(busBodyOutline,{
 depth:5.3,steps:1,bevelEnabled:false,curveSegments:4
});
// A shared crowned, pressed-metal roof replaces the flat rectangular bus lid.
// The narrow rolled edges read as rain gutters; no extra meshes, lights, or textures.
// One extrusion is reused by both liveries, and stays outside the collision logic.
const busRoofProfile=new THREE.Shape();
busRoofProfile.moveTo(-1.48,2.91);
busRoofProfile.lineTo(-1.48,3.055);
busRoofProfile.lineTo(-1.435,3.08);
busRoofProfile.lineTo(-1.38,3.055);
busRoofProfile.quadraticCurveTo(-1.28,3.18,0,3.27);
busRoofProfile.quadraticCurveTo(1.28,3.18,1.38,3.055);
busRoofProfile.lineTo(1.435,3.08);
busRoofProfile.lineTo(1.48,3.055);
busRoofProfile.lineTo(1.48,2.91);
busRoofProfile.closePath();
const busRoofGeometry=new THREE.ExtrudeGeometry(busRoofProfile,{
 depth:5.38,steps:1,bevelEnabled:false,curveSegments:8
});
busRoofGeometry.translate(0,0,-2.69);
function makeBus(variant='red'){
 const g=new THREE.Group(),blue=variant==='blue',main=blue?busCream:busRed,trim=blue?busBlue:busCream,accent=blue?busYellow:busGreen;
 const body=new THREE.Mesh(busBodyGeometry,main);
 body.position.set(0,1.67,-2.65);part(g,body);
 part(g,new THREE.Mesh(busRoofGeometry,blue?busBlue:busRed));
 part(g,cube(2.89,.23,5.34,accent,0,1.31,0));
 part(g,cube(2.9,.27,5.35,trim,0,.71,0));
 for(const side of [-1,1]){
  const glazing=new THREE.Mesh(busSidePane,blue?busSideGlazing.blue:busSideGlazing.red);
  glazing.rotation.y=side*Math.PI/2;glazing.position.set(side*1.495,2.35,0);
  part(g,glazing);
  // All four wheels share one geometry, PBR atlas and instanced draw call.
  // Matrices are static because traffic obstacles translate as whole groups.
  part(g,cube(.22,.31,.17,busDark,side*1.56,2.42,2.37));
 }
 const busWheels=new THREE.InstancedMesh(busWheelGeometry,busWheelMaterial,4);
 const busWheelPose=new THREE.Object3D();
 busWheelPose.rotation.z=Math.PI/2;
 let busWheelIndex=0;
 for(const side of [-1,1])for(const z of [-1.72,1.62]){
  busWheelPose.position.set(side*1.46,.49,z);
  busWheelPose.updateMatrix();
  busWheels.setMatrixAt(busWheelIndex++,busWheelPose.matrix);
 }
 busWheels.instanceMatrix.needsUpdate=true;
 busWheels.frustumCulled=false;
 g.add(busWheels);
 // Wheel-arch lips sit just outside the body and follow the four tyre centres.
 // Static instancing avoids separate draw calls and keeps the drivable lane intact.
 const busWheelArches=new THREE.InstancedMesh(busWheelArchGeometry,busWheelArchMaterial,4);
 const busArchPose=new THREE.Object3D();
 let archIndex=0;
 for(const side of [-1,1])for(const z of [-1.72,1.62]){
  busArchPose.position.set(side*1.585,.49,z);
  busArchPose.rotation.y=side*Math.PI/2;
  busArchPose.updateMatrix();
  busWheelArches.setMatrixAt(archIndex++,busArchPose.matrix);
 }
 busWheelArches.instanceMatrix.needsUpdate=true;
 busWheelArches.frustumCulled=false;
 g.add(busWheelArches);
 // Bangkok buses board from the left; the opposite side stays uninterrupted.
 const door=new THREE.Mesh(busDoorPane,busDoorMaterial);
 door.rotation.y=-Math.PI/2;door.position.set(-1.516,1.81,1.67);part(g,door);
 const frontGlass=new THREE.Mesh(busFrontGlassPane,busWindshield);part(g,frontGlass);
 part(g,new THREE.Mesh(busFrontFrameGeometry,trim));
 part(g,cube(2.43,.51,.13,trim,0,3.02,2.73));
 part(g,cube(.86,.39,.15,busCream,0,3.06,2.82));
 const frontRoute=new THREE.Mesh(busRoutePane,blue?busRouteSigns.blue:busRouteSigns.red);
 frontRoute.position.set(0,3.06,2.916);part(g,frontRoute);
 // A single textured PBR grille replaces four rectangular meshes.
 const frontFascia=new THREE.Mesh(busFrontFasciaPane,busFrontFasciaMaterial);
 frontFascia.position.set(0,1.12,2.854);part(g,frontFascia);
 part(g,cube(2.64,.22,.18,busDark,0,.55,2.79));
 for(const side of [-1,1]){
  part(g,ball(.18,busLamp,side*.97,.98,2.81));
  part(g,cube(.24,.15,.11,M.gold,side*1.14,1.49,2.79));
  // Rear light clusters are baked into a single shared PBR atlas.
 }
 // The rear is visible while approaching from behind in the POV game.
 const rearGlass=new THREE.Mesh(busRearGlassPane,busRearWindowMaterial);rearGlass.rotation.y=Math.PI;rearGlass.position.set(0,2.28,-2.748);part(g,rearGlass);
 part(g,cube(2.43,.48,.12,trim,0,3.01,-2.73));
 const rearRoute=new THREE.Mesh(busRoutePane,blue?busRouteSigns.blue:busRouteSigns.red);
 rearRoute.rotation.y=Math.PI;rearRoute.position.set(0,3.05,-2.805);part(g,rearRoute);
 part(g,cube(2.56,.19,.13,busDark,0,.58,-2.77));
 if(blue){part(g,cube(2.6,.17,.13,busYellow,0,1.42,2.79));part(g,cube(2.5,.39,.13,busBlue,0,.82,2.78))}
 else{part(g,cube(2.65,.18,.14,busGreen,0,1.62,2.79));part(g,cube(2.45,.43,.12,busCream,0,.91,2.78))}
 // The rear panel is below the window, inside the tail lamps and above the bumper.
 const rearPanel=new THREE.Mesh(busRearPanelGeometry,blue?busRearPanels.blue:busRearPanels.red);
 rearPanel.rotation.y=Math.PI;rearPanel.position.set(0,1.31,-2.785);part(g,rearPanel);
 const rearLamps=new THREE.Mesh(busRearLampPane,busRearLampMaterial);
 rearLamps.rotation.y=Math.PI;rearLamps.position.set(0,1.17,-2.91);part(g,rearLamps);
 return g;
}
// Lightweight moving traffic: built from simple shared geometry, no new downloads.
// Mobile-friendly vehicle silhouettes: readable from behind, no additional GLB downloads.
// Performance-friendly traffic silhouettes with far fewer draw calls.
const taxiPink=mat(0xed3887),taxiGlass=mat(0x35596d),taxiTrim=mat(0xf5e8b6),bikeMetal=mat(0x27282e),bikeYellow=mat(0xeab029),bikeBlue=mat(0x28528a);
const taxiGreen=mat(0x008c71),taxiYellow=mat(0xffcb27),taxiLight=mat(0xfff5d8),taxiChrome=mat(0x9eb6c2),tukBlue=mat(0x0847bd),tukRed=mat(0xcf283c),tukRoof=mat(0x252632);
// A rounded, two-tone Thai metered taxi instead of stacked cuboids.
// Built once in cachedObstacle('taxi'): cloned traffic shares all PBR materials and geometry.
const taxiPaintGreen=new THREE.MeshPhysicalMaterial({color:0x087d5a,metalness:.27,roughness:.32,clearcoat:.55,clearcoatRoughness:.23});
const taxiPaintYellow=new THREE.MeshPhysicalMaterial({color:0xf3c62d,metalness:.22,roughness:.34,clearcoat:.55,clearcoatRoughness:.25});

 // Shared 128px PBR bodywork detail for both Thai taxi liveries.
 // Fine orange-peel grain, vertical rain streaks and lower-panel road dust
 // are baked once, with no per-frame updates or additional geometry.
 const taxiPaintSize=128;
 const taxiPaintColorCanvas=document.createElement('canvas');
 const taxiPaintRoughCanvas=document.createElement('canvas');
 taxiPaintColorCanvas.width=taxiPaintColorCanvas.height=taxiPaintSize;
 taxiPaintRoughCanvas.width=taxiPaintRoughCanvas.height=taxiPaintSize;
 const taxiPaintColorCtx=taxiPaintColorCanvas.getContext('2d');
 const taxiPaintRoughCtx=taxiPaintRoughCanvas.getContext('2d');
 const taxiPaintColorPixels=taxiPaintColorCtx.createImageData(taxiPaintSize,taxiPaintSize);
 const taxiPaintRoughPixels=taxiPaintRoughCtx.createImageData(taxiPaintSize,taxiPaintSize);
 for(let y=0;y<taxiPaintSize;y++)for(let x=0;x<taxiPaintSize;x++){
  const offset=(y*taxiPaintSize+x)*4;
  const grain=((x*73+y*151+(x*y)%97)%23)-11;
  const roadDust=Math.max(0,(y-82)/46);
  const rainStreak=(x%29===0&&y>22)?8:0;
  const albedo=Math.max(193,Math.min(255,Math.round(248+grain*.65-roadDust*29-rainStreak)));
  const roughness=Math.max(0,Math.min(255,Math.round(185+Math.abs(grain)*2+roadDust*40+rainStreak*2)));
  for(let channel=0;channel<3;channel++){
   taxiPaintColorPixels.data[offset+channel]=albedo;
   taxiPaintRoughPixels.data[offset+channel]=roughness;
  }
  taxiPaintColorPixels.data[offset+3]=255;
  taxiPaintRoughPixels.data[offset+3]=255;
 }
 taxiPaintColorCtx.putImageData(taxiPaintColorPixels,0,0);
 taxiPaintRoughCtx.putImageData(taxiPaintRoughPixels,0,0);
 const taxiPaintColorMap=new THREE.CanvasTexture(taxiPaintColorCanvas);
 taxiPaintColorMap.colorSpace=THREE.SRGBColorSpace;
 const taxiPaintRoughnessMap=new THREE.CanvasTexture(taxiPaintRoughCanvas);
 for(const texture of [taxiPaintColorMap,taxiPaintRoughnessMap]){
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.repeat.set(1.5,1.5);
  texture.anisotropy=1;
 }
 for(const material of [taxiPaintGreen,taxiPaintYellow]){
  material.map=taxiPaintColorMap;
  material.roughnessMap=taxiPaintRoughnessMap;
 }

const taxiTintedGlass=new THREE.MeshPhysicalMaterial({color:0x263f4b,metalness:.12,roughness:.16,clearcoat:.75,clearcoatRoughness:.14,transparent:true,opacity:.89,side:THREE.DoubleSide,depthWrite:false});
// Shared 256x128 reflective taxi glass: baked sky, Bangkok shopfronts and rain grime.
// One atlas for six windows; no environment probes, new meshes or per-frame work.
const taxiGlassCanvas=document.createElement('canvas');
taxiGlassCanvas.width=256;taxiGlassCanvas.height=128;
const taxiGlassCtx=taxiGlassCanvas.getContext('2d');
const taxiGlassSky=taxiGlassCtx.createLinearGradient(0,0,0,128);
taxiGlassSky.addColorStop(0,'#678696');
taxiGlassSky.addColorStop(.38,'#344f60');
taxiGlassSky.addColorStop(1,'#101c29');
taxiGlassCtx.fillStyle=taxiGlassSky;taxiGlassCtx.fillRect(0,0,256,128);
for(let i=0;i<6;i++){
 const x=19+i*43,reflection=taxiGlassCtx.createLinearGradient(x,0,x+25,0);
 reflection.addColorStop(0,'rgba(164,208,223,0)');
 reflection.addColorStop(.42,i%3===0?'rgba(232,154,115,.23)':'rgba(173,218,225,.26)');
 reflection.addColorStop(1,'rgba(164,208,223,0)');
 taxiGlassCtx.fillStyle=reflection;taxiGlassCtx.fillRect(x,7,25,109);
}
for(let i=0;i<42;i++){
 const x=8+(i*59)%241,y=10+(i*31)%68;
 taxiGlassCtx.fillStyle=i%3===0?'rgba(220,234,231,.17)':'rgba(8,17,24,.15)';
 taxiGlassCtx.fillRect(x,y,1,12+(i*7)%37);
}
taxiGlassCtx.strokeStyle='rgba(8,14,19,.93)';
taxiGlassCtx.lineWidth=7;taxiGlassCtx.strokeRect(3.5,3.5,249,121);
taxiGlassCtx.strokeStyle='rgba(144,161,164,.4)';
taxiGlassCtx.lineWidth=1.5;taxiGlassCtx.strokeRect(8,8,240,112);
const taxiGlassTexture=new THREE.CanvasTexture(taxiGlassCanvas);
taxiGlassTexture.colorSpace=THREE.SRGBColorSpace;
taxiGlassTexture.anisotropy=Math.min(2,renderer.capabilities.getMaxAnisotropy());
const taxiReflectiveGlass=new THREE.MeshPhysicalMaterial({
 map:taxiGlassTexture,color:0xffffff,metalness:.04,roughness:.2,
 clearcoat:.78,clearcoatRoughness:.13,transparent:true,opacity:.94,
 side:THREE.DoubleSide,depthWrite:false
});
const taxiRubber=new THREE.MeshStandardMaterial({color:0x1d252b,roughness:.92});
const taxiBrakeLens=new THREE.MeshStandardMaterial({color:0xb52431,emissive:0x4b0710,emissiveIntensity:.28,metalness:.08,roughness:.34});
// Shared Bangkok plate texture and grille materials: built once for all taxi clones.
const taxiPlateCanvas=document.createElement('canvas');taxiPlateCanvas.width=256;taxiPlateCanvas.height=128;
const taxiPlateCtx=taxiPlateCanvas.getContext('2d');
taxiPlateCtx.fillStyle='#f3f0df';taxiPlateCtx.fillRect(0,0,256,128);
taxiPlateCtx.strokeStyle='#2b3436';taxiPlateCtx.lineWidth=5;taxiPlateCtx.strokeRect(4,4,248,120);
taxiPlateCtx.fillStyle='#151d21';taxiPlateCtx.textAlign='center';
taxiPlateCtx.font='bold 58px sans-serif';taxiPlateCtx.fillText('กท 4821',128,73);
taxiPlateCtx.font='23px sans-serif';taxiPlateCtx.fillText('กรุงเทพมหานคร',128,108);
const taxiPlateTexture=new THREE.CanvasTexture(taxiPlateCanvas);taxiPlateTexture.colorSpace=THREE.SRGBColorSpace;
const taxiPlateMaterial=new THREE.MeshBasicMaterial({map:taxiPlateTexture,side:THREE.DoubleSide});
const taxiGrilleMaterial=new THREE.MeshStandardMaterial({color:0x17232b,metalness:.3,roughness:.65});
// Shared contoured Bangkok taxi windscreen PBR atlas. Front glass carries
// two resting wipers and faint wiped arcs; rear glass has heater traces.
// One 512x256 texture and one material serve both panes across all taxi clones.
const taxiWindshieldCanvas=document.createElement('canvas');
taxiWindshieldCanvas.width=512;taxiWindshieldCanvas.height=256;
const taxiWindshieldCtx=taxiWindshieldCanvas.getContext('2d');
for(let panel=0;panel<2;panel++){
 const ctx=taxiWindshieldCtx;
 ctx.save();ctx.translate(panel*256,0);
 const glass=ctx.createLinearGradient(0,0,0,256);
 glass.addColorStop(0,'#7899a7');glass.addColorStop(.34,'#3d6275');
 glass.addColorStop(.72,'#213b4a');glass.addColorStop(1,'#14242d');
 ctx.fillStyle=glass;ctx.fillRect(0,0,256,256);
 for(let i=0;i<4;i++){
  const x=27+i*57,reflection=ctx.createLinearGradient(x,0,x+36,0);
  reflection.addColorStop(0,'rgba(188,222,229,0)');
  reflection.addColorStop(.4,i%2?'rgba(239,153,103,.18)':'rgba(189,223,229,.26)');
  reflection.addColorStop(1,'rgba(188,222,229,0)');
  ctx.fillStyle=reflection;ctx.fillRect(x,12,36,217);
 }
 ctx.strokeStyle='#151d23';ctx.lineWidth=13;ctx.strokeRect(7,7,242,242);
 ctx.strokeStyle='rgba(146,161,162,.6)';ctx.lineWidth=2;ctx.strokeRect(15,15,226,226);
 if(panel===0){
  ctx.strokeStyle='rgba(204,218,213,.19)';ctx.lineWidth=3;
  for(const cx of [69,187]){
   ctx.beginPath();ctx.arc(cx,220,133,Math.PI*1.13,Math.PI*1.87);ctx.stroke();
  }
  ctx.strokeStyle='#1a252a';ctx.lineWidth=6;ctx.lineCap='round';
  for(const [ax,ay,bx,by] of [[34,219,119,174],[222,219,139,175]]){
   ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.stroke();
   ctx.strokeStyle='rgba(173,187,181,.5)';ctx.lineWidth=1.5;
   ctx.beginPath();ctx.moveTo(ax+3,ay-3);ctx.lineTo(bx,by-3);ctx.stroke();
   ctx.strokeStyle='#1a252a';ctx.lineWidth=6;
  }
 }else{
  ctx.strokeStyle='rgba(178,132,91,.32)';ctx.lineWidth=1.4;
  for(let y=56;y<218;y+=21){
   ctx.beginPath();ctx.moveTo(21,y);ctx.lineTo(235,y);ctx.stroke();
  }
 }
 ctx.restore();
}
const taxiWindshieldTexture=new THREE.CanvasTexture(taxiWindshieldCanvas);
taxiWindshieldTexture.colorSpace=THREE.SRGBColorSpace;
taxiWindshieldTexture.anisotropy=Math.min(2,renderer.capabilities.getMaxAnisotropy());
const taxiWindshieldMaterial=new THREE.MeshPhysicalMaterial({
 map:taxiWindshieldTexture,metalness:.06,roughness:.19,
 clearcoat:.8,clearcoatRoughness:.12,transparent:true,opacity:.95,
 side:THREE.DoubleSide,depthWrite:false
});
function taxiWindshieldShape(rear=false){
 // Narrower at the roof, using one half of the shared texture per pane.
 const bottom=rear?1.45:1.51,top=rear?1.22:1.27,height=rear?.52:.56;
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute([
  -bottom/2,-height/2,0, bottom/2,-height/2,0,
  -top/2,height/2,0, top/2,height/2,0
 ],3));
 const u0=rear?.5:0,u1=rear?1:.5;
 geometry.setAttribute('uv',new THREE.Float32BufferAttribute([
  u0,0,u1,0,u0,1,u1,1
 ],2));
 geometry.setIndex([0,1,2,1,3,2]);
 geometry.computeVertexNormals();
 return geometry;
}
const taxiFrontWindshieldGeometry=taxiWindshieldShape();
const taxiRearWindshieldGeometry=taxiWindshieldShape(true);
// Thai taxi door markings, baked once for every near-field traffic taxi.
// A shared 256x128 alpha decal gives the green lower doors authentic meter
// lettering and fleet registration without extra lights or per-frame drawing.
const taxiDoorCanvas=document.createElement('canvas');
taxiDoorCanvas.width=256;taxiDoorCanvas.height=128;
const taxiDoorCtx=taxiDoorCanvas.getContext('2d');
taxiDoorCtx.textAlign='center';taxiDoorCtx.textBaseline='middle';
taxiDoorCtx.shadowColor='rgba(0,0,0,.72)';taxiDoorCtx.shadowBlur=3;
taxiDoorCtx.font='bold 29px system-ui,sans-serif';
taxiDoorCtx.fillStyle='#f5f3dd';taxiDoorCtx.fillText('TAXI-METER',128,37,236);
taxiDoorCtx.shadowBlur=0;
taxiDoorCtx.fillStyle='rgba(255,219,111,.88)';taxiDoorCtx.fillRect(34,58,188,2);
taxiDoorCtx.font='bold 25px Tahoma,system-ui,sans-serif';
taxiDoorCtx.fillStyle='#f7f3e4';taxiDoorCtx.fillText('แท็กซี่มิเตอร์',128,83,236);
taxiDoorCtx.font='bold 15px Tahoma,system-ui,sans-serif';
taxiDoorCtx.fillStyle='#e4e3d4';taxiDoorCtx.fillText('กท 4821',128,112,210);
const taxiDoorTexture=new THREE.CanvasTexture(taxiDoorCanvas);
taxiDoorTexture.colorSpace=THREE.SRGBColorSpace;
taxiDoorTexture.anisotropy=Math.min(2,renderer.capabilities.getMaxAnisotropy());
const taxiDoorMaterial=new THREE.MeshStandardMaterial({
 map:taxiDoorTexture,transparent:true,alphaTest:.08,depthWrite:false,
 roughness:.78,metalness:0,side:THREE.DoubleSide,polygonOffset:true,
 polygonOffsetFactor:-1
});
const taxiDoorGeometry=new THREE.PlaneGeometry(1.08,.37);
function makeTaxi(){
 const g=new THREE.Group();
 // Extrude a sedan side profile along X; rounded bevels replace toy-like box edges.
 function profile(points,width,material){
  const outline=new THREE.Shape();
  points.forEach(([z,y],i)=>i?outline.lineTo(-z,y):outline.moveTo(-z,y));
  outline.closePath();
  const geometry=new THREE.ExtrudeGeometry(outline,{depth:width-.08,steps:1,bevelEnabled:true,bevelThickness:.04,bevelSize:.04,bevelSegments:1,curveSegments:2});
  const mesh=new THREE.Mesh(geometry,material);
  mesh.rotation.y=Math.PI/2;mesh.position.x=-(width-.08)/2;
  g.add(mesh);return mesh;
 }
 profile([[-1.72,.58],[1.72,.58],[1.75,.93],[1.52,1.17],[.93,1.23],[-1.36,1.23],[-1.7,1.13]],1.98,taxiPaintGreen);
 profile([[-1.12,1.2],[-.8,1.78],[-.52,1.92],[.43,1.92],[.87,1.2]],1.59,taxiPaintYellow);
 // Sculpted bonnet and boot replace the flat sedan silhouette seen from the
 // driver's lane. Both pressed-metal skins are batched into ONE shared mesh,
 // using the taxi's existing weathered green PBR paint and 128px maps.
 // This is purely visual: no hitbox, speed, steering or spawning changes.
 const taxiPanelPositions=[],taxiPanelUvs=[],taxiPanelIndices=[];
 const taxiPanelAcross=[-.94,-.78,-.5,-.22,0,.22,.5,.78,.94];
 function pressedTaxiPanel(stations){
  const start=taxiPanelPositions.length/3;
  for(let row=0;row<stations.length;row++){
   const [z,baseY]=stations[row];
   for(let col=0;col<taxiPanelAcross.length;col++){
    const across=taxiPanelAcross[col],edge=Math.abs(across)/.94;
    // Crown, twin pressed shoulder lines and a shallow center crease
    // catch shopfront reflections without extra lights or textures.
    const shoulder=.008*Math.exp(-Math.pow((Math.abs(across)-.62)/.11,2));
    const crown=.019*(1-edge*edge)+shoulder-.004*Math.exp(-Math.pow(across/.12,2));
    taxiPanelPositions.push(across*.98,baseY+crown,z);
    taxiPanelUvs.push((across/.94+1)*.5,row/(stations.length-1));
   }
  }
  for(let row=0;row<stations.length-1;row++){
   for(let col=0;col<taxiPanelAcross.length-1;col++){
    const a=start+row*taxiPanelAcross.length+col;
    const b=a+taxiPanelAcross.length;
    taxiPanelIndices.push(a,b,a+1,a+1,b,b+1);
   }
  }
 }
 // +Z is the approaching taxi's nose; the boot is behind the passenger cabin.
 // All vertices sit above the existing extruded body surface to avoid z-fighting.
 pressedTaxiPanel([[.89,1.255],[1.05,1.252],[1.25,1.244],[1.45,1.215],[1.62,1.187],[1.72,1.159]]);
 pressedTaxiPanel([[-1.68,1.165],[-1.56,1.206],[-1.42,1.246],[-1.28,1.254],[-1.13,1.256]]);
 const taxiPanelGeometry=new THREE.BufferGeometry();
 taxiPanelGeometry.setAttribute('position',new THREE.Float32BufferAttribute(taxiPanelPositions,3));
 taxiPanelGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(taxiPanelUvs,2));
 taxiPanelGeometry.setIndex(taxiPanelIndices);
 taxiPanelGeometry.computeVertexNormals();
 const taxiPressedPanels=new THREE.Mesh(taxiPanelGeometry,taxiPaintGreen);
 taxiPressedPanels.name='bangkok-taxi-pressed-hood-and-boot';
 g.add(taxiPressedPanels);

 // Four side panes follow the actual sloped roofline, not rectangular stickers.
 function sideWindow(points,side){
  const shape=new THREE.Shape();
  points.forEach(([z,y],i)=>i?shape.lineTo(-z,y):shape.moveTo(-z,y));
  shape.closePath();
  const geometry=new THREE.ShapeGeometry(shape);
  // ShapeGeometry UVs use world coordinates; fit the shared atlas to each pane.
  geometry.computeBoundingBox();
  const bounds=geometry.boundingBox,position=geometry.getAttribute('position'),uv=geometry.getAttribute('uv');
  const width=Math.max(.001,bounds.max.x-bounds.min.x),height=Math.max(.001,bounds.max.y-bounds.min.y);
  for(let i=0;i<uv.count;i++)uv.setXY(i,(position.getX(i)-bounds.min.x)/width,(position.getY(i)-bounds.min.y)/height);
  uv.needsUpdate=true;
  const glass=new THREE.Mesh(geometry,taxiReflectiveGlass);
  glass.rotation.y=Math.PI/2;glass.position.x=side*.835;
  g.add(glass);
 }
 for(const side of [-1,1]){
  sideWindow([[-.77,1.39],[-.59,1.73],[-.13,1.75],[-.13,1.39]],side);
  sideWindow([[-.06,1.39],[-.06,1.75],[.4,1.75],[.68,1.39]],side);
  part(g,cube(.045,.51,.06,taxiRubber,side*.855,1.59,-.09));
  // Lower door beltline and door handles.
  part(g,cube(.045,.045,1.48,taxiChrome,side*1.005,1.21,-.08));
  for(const z of [-.54,.47])part(g,cube(.045,.055,.2,taxiChrome,side*1.015,1.13,z));
  // Tyres and wheel-arch lips are instanced below for fewer mobile draw calls.
  part(g,cube(.2,.12,.29,taxiPaintYellow,side*1.04,1.42,.68));
  part(g,cube(.13,.065,.14,taxiTintedGlass,side*1.15,1.44,.71));
  part(g,cube(.34,.16,.075,taxiLight,side*.71,.99,1.76));
  part(g,cube(.3,.16,.075,taxiBrakeLens,side*.73,.97,-1.75));
 }
 // One instanced draw call for both lower-door decals; near-field LOD only.
 // Planes face outwards on each side, with identical readable local UVs.
 const doorDecals=new THREE.InstancedMesh(taxiDoorGeometry,taxiDoorMaterial,2);
 const decalPose=new THREE.Object3D();
 for(let i=0;i<2;i++){
  const side=i===0?-1:1;
  decalPose.position.set(side*1.016,.91,-.06);
  decalPose.rotation.set(0,side*Math.PI/2,0);
  decalPose.updateMatrix();
  doorDecals.setMatrixAt(i,decalPose.matrix);
 }
 doorDecals.instanceMatrix.needsUpdate=true;
 doorDecals.frustumCulled=false;
 doorDecals.renderOrder=2;
 g.add(doorDecals);
 // Wheel-arch lips break up the sedan's slab-like lower silhouette.
 // The four narrow rubber seams and four existing tyre atlas wheels each
 // render in one draw call instead of eight individual meshes.
 const taxiWheels=new THREE.InstancedMesh(busWheelGeometry,busWheelMaterial,4);
 const taxiArchGeometry=new THREE.TorusGeometry(.43,.021,5,20,Math.PI);
 const taxiArches=new THREE.InstancedMesh(taxiArchGeometry,taxiRubber,4);
 const taxiWheelPose=new THREE.Object3D(),taxiArchPose=new THREE.Object3D();
 taxiWheelPose.rotation.z=Math.PI/2;
 taxiWheelPose.scale.set(.37/.48,.2/.21,.37/.48);
 taxiArchPose.rotation.y=Math.PI/2;
 let taxiWheelIndex=0;
 for(const side of [-1,1])for(const z of [-1.08,1.1]){
  taxiWheelPose.position.set(side*1.02,.43,z);
  taxiWheelPose.updateMatrix();
  taxiWheels.setMatrixAt(taxiWheelIndex,taxiWheelPose.matrix);
  taxiArchPose.position.set(side*1.06,.43,z);
  taxiArchPose.updateMatrix();
  taxiArches.setMatrixAt(taxiWheelIndex++,taxiArchPose.matrix);
 }
 for(const wheels of [taxiWheels,taxiArches]){
  wheels.instanceMatrix.needsUpdate=true;
  wheels.frustumCulled=false;
  g.add(wheels);
 }
 const frontGlass=new THREE.Mesh(taxiFrontWindshieldGeometry,taxiWindshieldMaterial);
 frontGlass.position.set(0,1.55,.67);frontGlass.rotation.x=-.62;g.add(frontGlass);
 // Two parked windscreen wipers, fitted to the sloped glass rather than
 // floating in world space. Two instanced draws, shared across near-field
 // Bangkok taxi clones; distant traffic LOD omits them entirely.
 const wiperPose=new THREE.Object3D(),wiperUp=new THREE.Vector3(0,1,0);
 const wiperArmGeometry=new THREE.CylinderGeometry(.012,.015,1,6);
 const wiperBladeGeometry=new THREE.CylinderGeometry(.018,.018,1,6);
 const wiperArms=new THREE.InstancedMesh(wiperArmGeometry,taxiRubber,2);
 const wiperBlades=new THREE.InstancedMesh(wiperBladeGeometry,taxiRubber,2);
 for(let i=0;i<2;i++){
  const side=i===0?-1:1;
  const pivot=new THREE.Vector3(side*.47,-.235,.025);
  const tip=new THREE.Vector3(side*.15,.035,.025);
  const arm=tip.clone().sub(pivot);
  wiperPose.position.copy(pivot).add(tip).multiplyScalar(.5);
  wiperPose.quaternion.setFromUnitVectors(wiperUp,arm.clone().normalize());
  wiperPose.scale.set(1,arm.length(),1);wiperPose.updateMatrix();
  wiperArms.setMatrixAt(i,wiperPose.matrix);
  const bladeVector=new THREE.Vector3(side*.19,.18,0);
  wiperPose.position.copy(tip);
  wiperPose.quaternion.setFromUnitVectors(wiperUp,bladeVector.clone().normalize());
  wiperPose.scale.set(1,bladeVector.length(),1);wiperPose.updateMatrix();
  wiperBlades.setMatrixAt(i,wiperPose.matrix);
 }
 for(const wiper of [wiperArms,wiperBlades]){
  wiper.instanceMatrix.needsUpdate=true;
  wiper.computeBoundingSphere();
  frontGlass.add(wiper);
 }
 const rearGlass=new THREE.Mesh(taxiRearWindshieldGeometry,taxiWindshieldMaterial);
 rearGlass.position.set(0,1.55,-.83);rearGlass.rotation.x=.62;g.add(rearGlass);
 // Distinct Bangkok TAXI-METER roof sign, painted once for all traffic clones.
 const signCanvas=document.createElement('canvas');signCanvas.width=256;signCanvas.height=128;
 const ctx=signCanvas.getContext('2d');
 // Baked backlit taxi-meter roof light: metal rim and Thai lettering.
 const rim=ctx.createLinearGradient(0,0,0,128);
 rim.addColorStop(0,'#e8e9e2');rim.addColorStop(.16,'#626f68');rim.addColorStop(.85,'#384c46');rim.addColorStop(1,'#c7cec3');
 ctx.fillStyle=rim;ctx.fillRect(0,0,256,128);
 const diffuser=ctx.createLinearGradient(0,8,0,118);
 diffuser.addColorStop(0,'#237c58');diffuser.addColorStop(.38,'#52b78b');diffuser.addColorStop(.65,'#1a7555');diffuser.addColorStop(1,'#0a4235');
 ctx.fillStyle=diffuser;ctx.fillRect(7,9,242,108);
 ctx.fillStyle='rgba(255,255,255,.22)';ctx.fillRect(12,13,232,5);
 ctx.strokeStyle='rgba(5,30,26,.6)';ctx.lineWidth=2;ctx.strokeRect(8,10,240,106);
 ctx.textAlign='center';ctx.textBaseline='middle';
 ctx.shadowColor='#f5ffdb';ctx.shadowBlur=9;
 ctx.fillStyle='#fffce5';ctx.font='bold 39px sans-serif';ctx.fillText('TAXI-METER',128,46,230);
 ctx.font='bold 30px sans-serif';ctx.fillText('แท็กซี่มิเตอร์',128,89,230);
 ctx.shadowBlur=0;
 ctx.fillStyle='rgba(0,0,0,.14)';ctx.fillRect(13,108,230,3);
 const signTexture=new THREE.CanvasTexture(signCanvas);
 signTexture.colorSpace=THREE.SRGBColorSpace;signTexture.anisotropy=1;
 const signMaterial=new THREE.MeshBasicMaterial({map:signTexture,side:THREE.DoubleSide});
 part(g,cube(.8,.29,.25,taxiLight,0,2.08,-.07));
 for(const z of [-.201,.061]){
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(.74,.23),signMaterial);
  sign.position.set(0,2.08,z);if(z<0)sign.rotation.y=Math.PI;
  g.add(sign);
 }
 // Narrow radiator grille and Bangkok registration plates replace blank bumpers.
 part(g,cube(.86,.16,.055,taxiGrilleMaterial,0,.99,1.81));
 part(g,cube(.9,.025,.067,taxiChrome,0,1.08,1.815));
 for(const z of [1.865,-1.865]){
  const plate=new THREE.Mesh(new THREE.PlaneGeometry(.49,.245),taxiPlateMaterial);
  plate.position.set(0,.7,z);if(z<0)plate.rotation.y=Math.PI;
  g.add(plate);
 }
 part(g,cube(1.58,.14,.09,taxiRubber,0,.55,1.79));
 part(g,cube(1.56,.12,.09,taxiRubber,0,.55,-1.79));
 return g;
}
// Bangkok three-wheel taxi traffic: curved metal cowl, open passenger cabin,
// arched canvas roof, correct three-wheel layout and PBR paint. Created once by
// cachedObstacle('tuktuk'), so every traffic clone shares geometries/materials.
// Traffic tuk-tuk enamel now uses the existing taxi's 128px weathered PBR maps.
// Shared color/roughness textures reveal paint grain, rain streaks and road dust
// on the pressed-metal shell and trim without another GPU texture or draw call.
const tukPaint=new THREE.MeshPhysicalMaterial({color:0x125a9c,metalness:.38,roughness:.35,clearcoat:.58,clearcoatRoughness:.26,map:taxiPaintColorMap,roughnessMap:taxiPaintRoughnessMap});
const tukAccent=new THREE.MeshPhysicalMaterial({color:0xc92e3c,metalness:.29,roughness:.4,clearcoat:.47,clearcoatRoughness:.31,map:taxiPaintColorMap,roughnessMap:taxiPaintRoughnessMap});
// Weathered woven canopy for traffic tuk-tuks: one shared 256px sRGB texture.
// UV-mapped to the curved roof, so stitched seams and rain-worn cloth are visible
// without extra meshes, dynamic lights or per-frame canvas work.
const tukCanvas=new THREE.MeshStandardMaterial({color:0x9ba5aa,metalness:0,roughness:.91,side:THREE.DoubleSide});
const tukRoofPattern=document.createElement('canvas');
tukRoofPattern.width=tukRoofPattern.height=256;
const tukRoofCtx=tukRoofPattern.getContext('2d');
tukRoofCtx.fillStyle='#50545b';tukRoofCtx.fillRect(0,0,256,256);
// Fine cross-weave and irregular grime are baked once, not rendered each frame.
for(let i=0;i<256;i+=4){
 tukRoofCtx.fillStyle='rgba(225,227,221,.075)';tukRoofCtx.fillRect(i,0,1,256);
 tukRoofCtx.fillStyle='rgba(14,17,20,.10)';tukRoofCtx.fillRect(0,i,256,1);
}
for(let i=0;i<1100;i++){
 const px=(i*137+Math.floor(i/11)*29)%256,py=(i*73+Math.floor(i/17)*41)%256;
 tukRoofCtx.fillStyle=i%5===0?'rgba(188,174,145,.18)':'rgba(9,12,14,.13)';
 tukRoofCtx.fillRect(px,py,1+i%3,1+i%2);
}
// Heat-welded diagonal reinforcement seams baked into the vinyl canopy.
// No added meshes, textures, or draw calls on mobile.
tukRoofCtx.save();
tukRoofCtx.lineCap='round';
for(const offset of [-72,72]){
 tukRoofCtx.beginPath();tukRoofCtx.moveTo(108+offset,0);tukRoofCtx.lineTo(148+offset,256);
 tukRoofCtx.strokeStyle='rgba(9,12,15,.38)';tukRoofCtx.lineWidth=7;tukRoofCtx.stroke();
 tukRoofCtx.beginPath();tukRoofCtx.moveTo(111+offset,0);tukRoofCtx.lineTo(151+offset,256);
 tukRoofCtx.strokeStyle='rgba(190,190,178,.20)';tukRoofCtx.lineWidth=2;tukRoofCtx.stroke();
}
tukRoofCtx.restore();
// Broad, uneven sun-faded vinyl bands follow the roof's length. These
// break up the flat charcoal canopy silhouette without new geometry or GPU work.
// Keep the middle panel brighter and the outer edges rain-darkened.
const tukFade=tukRoofCtx.createLinearGradient(0,0,256,0);
tukFade.addColorStop(0,'rgba(12,18,21,.38)');
tukFade.addColorStop(.18,'rgba(157,151,135,.055)');
tukFade.addColorStop(.48,'rgba(205,196,169,.19)');
tukFade.addColorStop(.78,'rgba(145,142,133,.055)');
tukFade.addColorStop(1,'rgba(12,18,21,.36)');
tukRoofCtx.fillStyle=tukFade;tukRoofCtx.fillRect(0,0,256,256);
// Longitudinal waterproofed seams with a narrow worn stitch highlight.
for(const x of [48,208]){
 tukRoofCtx.fillStyle='rgba(14,19,22,.48)';tukRoofCtx.fillRect(x-3,7,6,242);
 tukRoofCtx.strokeStyle='rgba(194,187,165,.47)';tukRoofCtx.lineWidth=1;
 tukRoofCtx.setLineDash([4,5]);
 tukRoofCtx.beginPath();tukRoofCtx.moveTo(x+2,9);tukRoofCtx.lineTo(x+2,247);tukRoofCtx.stroke();
 tukRoofCtx.setLineDash([]);
}
// Directional rain runoff on the weathered canopy: tapered water tracks
// and intermittent specular glints follow the roof fabric, baked into the
// existing 256px PBR albedo rather than allocating geometry or lights.
for(let i=0;i<34;i++){
 const x=16+(i*71+Math.floor(i/7)*19)%224;
 const y=12+(i*43)%176;
 const len=19+(i*17)%56;
 const wet=tukRoofCtx.createLinearGradient(x,y,x+2,y+len);
 wet.addColorStop(0,'rgba(203,218,215,.03)');
 wet.addColorStop(.32,'rgba(194,211,207,.19)');
 wet.addColorStop(1,'rgba(28,39,44,0)');
 tukRoofCtx.fillStyle=wet;
 tukRoofCtx.beginPath();
 tukRoofCtx.moveTo(x,y);tukRoofCtx.lineTo(x+1.8,y+len*.55);
 tukRoofCtx.lineTo(x+.5,y+len);tukRoofCtx.lineTo(x-.8,y+len*.48);
 tukRoofCtx.closePath();tukRoofCtx.fill();
}
// Reinforced hems and double-stitched transverse canopy panels.
tukRoofCtx.strokeStyle='rgba(12,16,19,.62)';tukRoofCtx.lineWidth=5;
tukRoofCtx.strokeRect(5,5,246,246);
tukRoofCtx.strokeStyle='rgba(172,174,166,.6)';tukRoofCtx.lineWidth=1.5;
tukRoofCtx.strokeRect(9,9,238,238);
for(const y of [63,128,193]){
 tukRoofCtx.fillStyle='rgba(17,20,24,.4)';tukRoofCtx.fillRect(10,y-3,236,7);
 tukRoofCtx.strokeStyle='rgba(188,187,171,.62)';tukRoofCtx.lineWidth=1;
 tukRoofCtx.setLineDash([3,5]);
 tukRoofCtx.beginPath();tukRoofCtx.moveTo(12,y-4);tukRoofCtx.lineTo(244,y-4);
 tukRoofCtx.moveTo(12,y+4);tukRoofCtx.lineTo(244,y+4);tukRoofCtx.stroke();
 tukRoofCtx.setLineDash([]);
}
const tukRoofTexture=new THREE.CanvasTexture(tukRoofPattern);
tukRoofTexture.colorSpace=THREE.SRGBColorSpace;
tukRoofTexture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
// Separate linear roughness mask: waterproofed seams and rain pools catch neon
// while dry woven vinyl stays matte. Baked once; no additional draw calls.
const tukRoughCanvas=document.createElement('canvas');
tukRoughCanvas.width=tukRoughCanvas.height=256;
const tukRoughCtx=tukRoughCanvas.getContext('2d');
tukRoughCtx.fillStyle='#ededed';tukRoughCtx.fillRect(0,0,256,256);
for(const x of [48,208]){
 tukRoughCtx.fillStyle='#686868';tukRoughCtx.fillRect(x-3,7,6,242);
}
for(const y of [63,128,193]){
 tukRoughCtx.fillStyle='#797979';tukRoughCtx.fillRect(10,y-3,236,7);
}
for(let i=0;i<34;i++){
 const x=16+(i*71+Math.floor(i/7)*19)%224;
 const y=12+(i*43)%176;
 const len=19+(i*17)%56;
 const wet=tukRoughCtx.createLinearGradient(x,y,x+2,y+len);
 wet.addColorStop(0,'rgba(91,91,91,0)');
 wet.addColorStop(.32,'rgba(91,91,91,.9)');
 wet.addColorStop(1,'rgba(91,91,91,0)');
 tukRoughCtx.fillStyle=wet;
 tukRoughCtx.fillRect(x-2,y,5,len);
}
const tukRoughMap=new THREE.CanvasTexture(tukRoughCanvas);
tukRoughMap.colorSpace=THREE.NoColorSpace;
tukRoughMap.anisotropy=Math.min(2,renderer.capabilities.getMaxAnisotropy());
tukCanvas.map=tukRoofTexture;
tukCanvas.roughnessMap=tukRoughMap;
tukCanvas.needsUpdate=true;
const tukTrim=new THREE.MeshStandardMaterial({color:0xb6b9ad,metalness:.74,roughness:.29});
// Shared, baked windscreen for traffic tuk-tuks: subtle street-light reflections,
// rubber gasket and a parked wiper. One 256x128 map, no per-frame work or meshes.
const tukWindscreenCanvas=document.createElement('canvas');
tukWindscreenCanvas.width=256;tukWindscreenCanvas.height=128;
const tukWindscreenCtx=tukWindscreenCanvas.getContext('2d');
const tukGlassGradient=tukWindscreenCtx.createLinearGradient(0,0,256,128);
tukGlassGradient.addColorStop(0,'#476b78');
tukGlassGradient.addColorStop(.46,'#284451');
tukGlassGradient.addColorStop(1,'#152e3b');
tukWindscreenCtx.fillStyle=tukGlassGradient;
tukWindscreenCtx.fillRect(0,0,256,128);
// Narrow reflected building edges and overhead signs; baked, not dynamic lights.
tukWindscreenCtx.fillStyle='rgba(203,224,223,.17)';
tukWindscreenCtx.beginPath();
tukWindscreenCtx.moveTo(39,3);tukWindscreenCtx.lineTo(67,3);
tukWindscreenCtx.lineTo(105,125);tukWindscreenCtx.lineTo(88,125);
tukWindscreenCtx.closePath();tukWindscreenCtx.fill();
tukWindscreenCtx.fillStyle='rgba(249,214,151,.10)';
tukWindscreenCtx.fillRect(187,7,5,109);
tukWindscreenCtx.fillRect(200,8,2,108);
// Baked Yaowarat neon reflected across the outer edges of tuk-tuk glass.
// Shared atlas only: no extra draw calls, textures, or per-frame updates.
tukWindscreenCtx.save();
tukWindscreenCtx.globalCompositeOperation='screen';
for(const [x,rgb] of [[24,'255,72,122'],[207,'65,192,238']]){
 const glow=tukWindscreenCtx.createLinearGradient(x-14,4,x+30,120);
 glow.addColorStop(0,'rgba('+rgb+',0)');
 glow.addColorStop(.4,'rgba('+rgb+',.2)');
 glow.addColorStop(1,'rgba('+rgb+',0)');
 tukWindscreenCtx.fillStyle=glow;
 tukWindscreenCtx.beginPath();
 tukWindscreenCtx.moveTo(x,8);tukWindscreenCtx.lineTo(x+8,8);
 tukWindscreenCtx.lineTo(x+30,117);tukWindscreenCtx.lineTo(x+19,117);
 tukWindscreenCtx.closePath();tukWindscreenCtx.fill();
}
tukWindscreenCtx.restore();
// A broad, faint wiper-cleared arc cuts through the dirty windshield film.
// This is baked into the existing atlas rather than another transparent mesh.
tukWindscreenCtx.save();
tukWindscreenCtx.beginPath();
tukWindscreenCtx.arc(122,116,98,Math.PI*1.08,Math.PI*1.91);
tukWindscreenCtx.strokeStyle='rgba(204,225,223,.23)';
tukWindscreenCtx.lineWidth=13;tukWindscreenCtx.stroke();
tukWindscreenCtx.beginPath();
tukWindscreenCtx.arc(122,116,86,Math.PI*1.08,Math.PI*1.91);
tukWindscreenCtx.strokeStyle='rgba(22,37,44,.14)';
tukWindscreenCtx.lineWidth=2;tukWindscreenCtx.stroke();
tukWindscreenCtx.restore();
// Baked weathered rubber seal and bottom-mounted wiper, avoiding extra draw calls.
tukWindscreenCtx.strokeStyle='rgba(12,17,21,.85)';
tukWindscreenCtx.lineWidth=9;tukWindscreenCtx.strokeRect(4.5,4.5,247,119);
tukWindscreenCtx.strokeStyle='rgba(140,156,155,.48)';
tukWindscreenCtx.lineWidth=1.5;tukWindscreenCtx.strokeRect(10,10,236,108);
tukWindscreenCtx.beginPath();
tukWindscreenCtx.moveTo(122,117);tukWindscreenCtx.lineTo(45,79);
tukWindscreenCtx.strokeStyle='rgba(12,19,22,.88)';
tukWindscreenCtx.lineWidth=3;tukWindscreenCtx.stroke();
tukWindscreenCtx.beginPath();
tukWindscreenCtx.moveTo(45,79);tukWindscreenCtx.lineTo(121,116);
tukWindscreenCtx.strokeStyle='rgba(192,198,190,.43)';
tukWindscreenCtx.lineWidth=.8;tukWindscreenCtx.stroke();
const tukWindscreenTexture=new THREE.CanvasTexture(tukWindscreenCanvas);
tukWindscreenTexture.colorSpace=THREE.SRGBColorSpace;
tukWindscreenTexture.anisotropy=2;
const tukWindscreen=new THREE.MeshPhysicalMaterial({
 map:tukWindscreenTexture,color:0xb0c3c9,metalness:0,roughness:.2,
 clearcoat:.55,clearcoatRoughness:.16,transparent:true,opacity:.83,
 depthWrite:false,side:THREE.DoubleSide
});
const tukWindow=new THREE.MeshStandardMaterial({color:0x426c80,metalness:.18,roughness:.21,transparent:true,opacity:.7,side:THREE.DoubleSide});
// Shared 256px weathered vinyl for traffic tuk-tuk seats: stitched channels,
// sun-faded highlights and darker seams baked once; no new lights or draw calls.
const tukSeatCanvas=document.createElement('canvas');
tukSeatCanvas.width=tukSeatCanvas.height=256;
const tukSeatCtx=tukSeatCanvas.getContext('2d');
const tukSeatGradient=tukSeatCtx.createLinearGradient(0,0,256,256);
tukSeatGradient.addColorStop(0,'#ab7869');
tukSeatGradient.addColorStop(.5,'#895849');
tukSeatGradient.addColorStop(1,'#613e35');
tukSeatCtx.fillStyle=tukSeatGradient;tukSeatCtx.fillRect(0,0,256,256);
// Deterministic worn grain avoids per-frame noise and visible tiling patterns.
for(let i=0;i<900;i++){
 const px=(i*71+Math.floor(i/19)*13)%256,py=(i*139+Math.floor(i/17)*23)%256;
 tukSeatCtx.fillStyle=i%4===0?'rgba(240,204,174,.10)':'rgba(28,19,19,.09)';
 tukSeatCtx.fillRect(px,py,1+i%3,1);
}
for(const x of [65,128,191]){
 tukSeatCtx.fillStyle='rgba(25,16,16,.45)';tukSeatCtx.fillRect(x-3,0,6,256);
 tukSeatCtx.fillStyle='rgba(215,159,131,.28)';tukSeatCtx.fillRect(x+4,0,2,256);
 for(let y=8;y<256;y+=11){
  tukSeatCtx.fillStyle='rgba(229,189,151,.6)';
  tukSeatCtx.fillRect(x-1,y,2,5);
 }
}
const tukSeatTexture=new THREE.CanvasTexture(tukSeatCanvas);
tukSeatTexture.colorSpace=THREE.SRGBColorSpace;
tukSeatTexture.anisotropy=2;
const tukSeat=new THREE.MeshStandardMaterial({map:tukSeatTexture,color:0xffffff,metalness:0,roughness:.84});
// Rounded cushions use the same two draw calls as the previous square bench.
// Shape UVs are normalized so stitching follows the upholstered faces.
function makeTukCushion(width,height,depth){
 const x=width/2,y=height/2,r=.065;
 const shape=new THREE.Shape();
 shape.moveTo(-x+r,-y);shape.lineTo(x-r,-y);
 shape.quadraticCurveTo(x,-y,x,-y+r);shape.lineTo(x,y-r);
 shape.quadraticCurveTo(x,y,x-r,y);shape.lineTo(-x+r,y);
 shape.quadraticCurveTo(-x,y,-x,y-r);shape.lineTo(-x,-y+r);
 shape.quadraticCurveTo(-x,-y,-x+r,-y);
 const uv={
  generateTopUV:(geo,verts,a,b,c)=>[a,b,c].map(i=>new THREE.Vector2(verts[i*3]/width+.5,verts[i*3+1]/height+.5)),
  generateSideWallUV:(geo,verts,a,b,c,d)=>[a,b,c,d].map(i=>new THREE.Vector2(verts[i*3]/width+.5,verts[i*3+2]/(depth+.05)))
 };
 return new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:.025,bevelThickness:.02,bevelSegments:1,curveSegments:3,UVGenerator:uv});
}
// One-time 128px optical lens textures for the existing traffic tuk-tuk lamps.
// Baked concentric fluting, lens-edge gasket and reflected highlights: no extra
// geometry, draw calls, dynamic lights or per-frame canvas updates.
function makeTukLampLensTexture(rear){
 const canvas=document.createElement('canvas');
 canvas.width=canvas.height=128;
 const ctx=canvas.getContext('2d');
 const base=ctx.createRadialGradient(45,40,5,64,64,76);
 if(rear){
  base.addColorStop(0,'#f85a50');base.addColorStop(.58,'#b91b20');base.addColorStop(.86,'#681116');base.addColorStop(1,'#200c0d');
 }else{
  base.addColorStop(0,'#fff8d8');base.addColorStop(.55,'#c5d3cb');base.addColorStop(.86,'#6b7779');base.addColorStop(1,'#22282a');
 }
 ctx.fillStyle=base;ctx.fillRect(0,0,128,128);
 ctx.save();ctx.beginPath();ctx.arc(64,64,55,0,Math.PI*2);ctx.clip();
 for(let i=0;i<13;i++){
  ctx.beginPath();ctx.arc(64,64,5+i*4,0,Math.PI*2);
  ctx.lineWidth=i%3===0?2:1;
  ctx.strokeStyle=rear?'rgba(255,155,115,.24)':'rgba(255,255,241,.27)';
  ctx.stroke();
 }
 for(let x=14;x<115;x+=9){
  ctx.beginPath();ctx.moveTo(x,12);ctx.lineTo(x,116);
  ctx.lineWidth=1;ctx.strokeStyle=rear?'rgba(75,4,9,.24)':'rgba(40,54,58,.16)';ctx.stroke();
 }
 // Asymmetric dipped-beam optic: a warm projector hotspot, horizontal
 // cutoff and small reflector facets, baked into the existing lamp atlas.
 // Keeps the traffic tuk-tuk lens readable at night without another light.
 if(!rear){
  const beam=ctx.createRadialGradient(49,48,2,53,53,36);
  beam.addColorStop(0,'rgba(255,255,244,.92)');
  beam.addColorStop(.32,'rgba(255,247,209,.65)');
  beam.addColorStop(1,'rgba(255,240,193,0)');
  ctx.fillStyle=beam;ctx.fillRect(14,14,100,100);
  ctx.fillStyle='rgba(35,47,51,.24)';
  ctx.fillRect(19,76,90,3);
  for(let j=0;j<7;j++){
   const a=(j/7)*Math.PI*2;
   const x=64+Math.cos(a)*39,y=64+Math.sin(a)*39;
   ctx.save();ctx.translate(x,y);ctx.rotate(a);
   ctx.fillStyle='rgba(255,255,230,.15)';
   ctx.fillRect(-3,-8,6,16);ctx.restore();
  }
  // Vintage prismatic pressed-glass ribs, baked into the shared 128px lens.
  // No extra meshes, textures, dynamic lights or draw calls.
  for(let rib=0;rib<11;rib++){
   const x=27+rib*7;
   const glint=ctx.createLinearGradient(x-2,0,x+3,0);
   glint.addColorStop(0,'rgba(12,29,36,.19)');
   glint.addColorStop(.46,'rgba(255,252,221,.30)');
   glint.addColorStop(1,'rgba(20,35,39,.10)');
   ctx.fillStyle=glint;
   ctx.fillRect(x,28+(rib%3)*3,3,70-(rib%4)*4);
  }
  // Shielded projector and Fresnel rim, baked once into existing lens atlas.
  ctx.beginPath();ctx.arc(64,64,46,-2.65,-.35);
  ctx.lineWidth=3;ctx.strokeStyle='rgba(255,251,225,.52)';ctx.stroke();
  ctx.beginPath();ctx.arc(64,64,46,.22,2.55);
  ctx.lineWidth=2;ctx.strokeStyle='rgba(19,32,37,.43)';ctx.stroke();
  ctx.beginPath();ctx.ellipse(53,54,15,11,-.24,0,Math.PI*2);
  ctx.strokeStyle='rgba(40,53,57,.57)';ctx.lineWidth=3;ctx.stroke();
  ctx.beginPath();ctx.moveTo(38,58);ctx.quadraticCurveTo(53,62,69,57);
  ctx.strokeStyle='rgba(36,48,52,.65)';ctx.lineWidth=2;ctx.stroke();
  ctx.beginPath();ctx.ellipse(43,36,12,5,-.45,0,Math.PI*2);
  ctx.fillStyle='rgba(255,255,255,.46)';ctx.fill();
 }
 ctx.restore();
 ctx.beginPath();ctx.arc(64,64,57,0,Math.PI*2);
 ctx.lineWidth=6;ctx.strokeStyle=rear?'#4c1418':'#51575a';ctx.stroke();
 ctx.beginPath();ctx.arc(64,64,53,0,Math.PI*2);
 ctx.lineWidth=1.5;ctx.strokeStyle=rear?'rgba(255,184,139,.5)':'rgba(241,247,230,.58)';ctx.stroke();
 const texture=new THREE.CanvasTexture(canvas);
 texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=2;
 return texture;
}
const tukHeadLensTexture=makeTukLampLensTexture(false);
const tukLamp=new THREE.MeshPhysicalMaterial({
 map:tukHeadLensTexture,color:0xfff8ed,emissive:0x99764b,
 emissiveIntensity:.3,metalness:.06,roughness:.23,
 clearcoat:.75,clearcoatRoughness:.16
});
const tukEngineSteel=new THREE.MeshStandardMaterial({color:0x51565a,metalness:.66,roughness:.72});
const tukEngineUnitBox=new THREE.BoxGeometry(1,1,1);
// Baked pressed-steel engine service hatch for both tuk-tuk flanks. One
// shared 128px PBR decal and a single two-instance mesh per cached vehicle:
// stamped louvers, retaining bolts and oily wear replace plain toy-box sides.
const tukServiceCanvas=document.createElement('canvas');
tukServiceCanvas.width=tukServiceCanvas.height=128;
const tukServiceCtx=tukServiceCanvas.getContext('2d');
const serviceBase=tukServiceCtx.createLinearGradient(0,0,128,128);
serviceBase.addColorStop(0,'#496a79');serviceBase.addColorStop(.55,'#304a58');
serviceBase.addColorStop(1,'#182e39');
tukServiceCtx.fillStyle=serviceBase;tukServiceCtx.fillRect(0,0,128,128);
tukServiceCtx.fillStyle='#13242b';tukServiceCtx.fillRect(7,9,114,110);
tukServiceCtx.strokeStyle='rgba(189,210,211,.72)';
tukServiceCtx.lineWidth=2;tukServiceCtx.strokeRect(9,11,110,106);
// Pressed ventilation slots: beveled lips, recessed shadows and uneven
// workshop grime are baked once into the existing shared PBR decal.
for(let row=0;row<5;row++){
 const y=27+row*17;
 const lip=tukServiceCtx.createLinearGradient(0,y,0,y+12);
 lip.addColorStop(0,'#9baeb2');lip.addColorStop(.16,'#526f7b');
 lip.addColorStop(.32,'#101d24');lip.addColorStop(.8,'#071117');
 lip.addColorStop(1,'#344d58');
 tukServiceCtx.fillStyle=lip;tukServiceCtx.fillRect(22,y,84,12);
 tukServiceCtx.fillStyle='rgba(3,8,11,.65)';tukServiceCtx.fillRect(26,y+4,76,5);
 tukServiceCtx.fillStyle='rgba(205,219,217,.33)';tukServiceCtx.fillRect(24,y+1,80,1);
 tukServiceCtx.fillStyle='rgba(5,10,12,.35)';tukServiceCtx.fillRect(22,y+11,84,2);
}
// Grease runs down from the lower louvers, with deterministic variation.
for(let i=0;i<18;i++){
 const x=25+(i*37)%78,y=91+(i*11)%12;
 tukServiceCtx.fillStyle=i%3===0?'rgba(8,13,15,.26)':'rgba(13,21,24,.14)';
 tukServiceCtx.fillRect(x,y,1+(i%2),6+(i*7)%15);
}
for(const px of [15,113])for(const py of [17,111]){
 tukServiceCtx.fillStyle='#a7b6b5';
 tukServiceCtx.beginPath();tukServiceCtx.arc(px,py,3,0,Math.PI*2);tukServiceCtx.fill();
 tukServiceCtx.strokeStyle='#253039';tukServiceCtx.lineWidth=1;
 tukServiceCtx.beginPath();tukServiceCtx.moveTo(px-2,py);tukServiceCtx.lineTo(px+2,py);tukServiceCtx.stroke();
}
for(let i=0;i<140;i++){
 const px=(i*47+19)%128,py=(i*71+23)%128;
 tukServiceCtx.fillStyle=i%3?'rgba(6,12,16,.11)':'rgba(208,197,169,.09)';
 tukServiceCtx.fillRect(px,py,1+(i%3),1+(i%2));
}
// Oxidized pressed-steel edges and chipped enamel: baked into the existing
// service-hatch atlas, so every traffic tuk-tuk gains weathering at zero
// additional draw calls or runtime allocations.
for(let i=0;i<64;i++){
 const x=12+(i*53)%104, y=(i%2===0?14:112)+((i*17)%7-3);
 const length=2+(i*11)%9;
 tukServiceCtx.strokeStyle=i%3===0?'rgba(143,76,39,.52)':'rgba(196,157,112,.38)';
 tukServiceCtx.lineWidth=i%5===0?2:1;
 tukServiceCtx.beginPath();tukServiceCtx.moveTo(x,y);
 tukServiceCtx.lineTo(Math.min(117,x+length),y+(i%3-1));tukServiceCtx.stroke();
}
for(let i=0;i<36;i++){
 const x=(i%2===0?12:116)+((i*7)%5-2), y=17+(i*37)%94;
 tukServiceCtx.fillStyle=i%3===0?'rgba(126,61,30,.48)':'rgba(209,174,123,.32)';
 tukServiceCtx.fillRect(x,y,1+(i%3),2+(i%4));
}
const tukServiceTexture=new THREE.CanvasTexture(tukServiceCanvas);
tukServiceTexture.colorSpace=THREE.SRGBColorSpace;
tukServiceTexture.anisotropy=2;
const tukServiceMaterial=new THREE.MeshStandardMaterial({
 map:tukServiceTexture,metalness:.38,roughness:.58,side:THREE.DoubleSide
});
const tukServiceGeometry=new THREE.PlaneGeometry(.55,.30);
// One shared six-sided steel tube for every traffic tuk-tuk canopy support.
// The frame is assembled once per cached model, not in the render loop.
const tukCanopyFrameGeometry=new THREE.CylinderGeometry(.026,.026,1,6);
// A single baked instrument face and two rubber grips for the traffic tuk-tuk.
// All cockpit assets are allocated once and shared by obstacle clones.
const tukHandleGripMaterial=new THREE.MeshStandardMaterial({color:0x202426,metalness:.04,roughness:.88});
const tukGaugeCanvas=document.createElement('canvas');
tukGaugeCanvas.width=tukGaugeCanvas.height=128;
const tukGaugeCtx=tukGaugeCanvas.getContext('2d');
tukGaugeCtx.fillStyle='#242a2c';tukGaugeCtx.fillRect(0,0,128,128);
const tukDialGradient=tukGaugeCtx.createRadialGradient(54,49,5,64,64,66);
tukDialGradient.addColorStop(0,'#242b2d');
tukDialGradient.addColorStop(.77,'#121719');
tukDialGradient.addColorStop(1,'#50595a');
tukGaugeCtx.fillStyle=tukDialGradient;tukGaugeCtx.fillRect(3,3,122,122);
tukGaugeCtx.beginPath();tukGaugeCtx.arc(64,64,52,0,Math.PI*2);
tukGaugeCtx.fillStyle='#151b1d';tukGaugeCtx.fill();
tukGaugeCtx.lineWidth=5;tukGaugeCtx.strokeStyle='#8d9692';tukGaugeCtx.stroke();
tukGaugeCtx.lineWidth=1;tukGaugeCtx.strokeStyle='#d6d8cb';
tukGaugeCtx.beginPath();tukGaugeCtx.arc(64,64,45,0,Math.PI*2);tukGaugeCtx.stroke();
for(let i=0;i<=12;i++){
 const angle=Math.PI*.75+i*Math.PI*1.5/12;
 const radius=i%3===0?32:37;
 tukGaugeCtx.beginPath();
 tukGaugeCtx.moveTo(64+radius*Math.cos(angle),64+radius*Math.sin(angle));
 tukGaugeCtx.lineTo(64+43*Math.cos(angle),64+43*Math.sin(angle));
 tukGaugeCtx.lineWidth=i%3===0?2:1;
 tukGaugeCtx.strokeStyle='#e6e6dc';tukGaugeCtx.stroke();
}
tukGaugeCtx.beginPath();tukGaugeCtx.moveTo(64,64);tukGaugeCtx.lineTo(88,40);
tukGaugeCtx.lineWidth=2.8;tukGaugeCtx.strokeStyle='#ce4a36';tukGaugeCtx.stroke();
tukGaugeCtx.beginPath();tukGaugeCtx.arc(64,64,4,0,Math.PI*2);
tukGaugeCtx.fillStyle='#b9c0b8';tukGaugeCtx.fill();
tukGaugeCtx.font='11px sans-serif';tukGaugeCtx.textAlign='center';
tukGaugeCtx.fillStyle='#b4bcb5';tukGaugeCtx.fillText('km/h',64,92);
const tukGaugeTexture=new THREE.CanvasTexture(tukGaugeCanvas);
tukGaugeTexture.colorSpace=THREE.SRGBColorSpace;tukGaugeTexture.anisotropy=2;
const tukGaugeMaterial=new THREE.MeshStandardMaterial({map:tukGaugeTexture,metalness:.08,roughness:.53,side:THREE.DoubleSide});
// One baked Bangkok tuk-tuk registration plate atlas, reused at both ends of
// every cached traffic model. Thai lettering, weathered yellow enamel and
// rivets are texture details rather than individual meshes or dynamic decals.
const tukPlateCanvas=document.createElement('canvas');
tukPlateCanvas.width=256;tukPlateCanvas.height=128;
const tukPlateCtx=tukPlateCanvas.getContext('2d');
const tukPlateBase=tukPlateCtx.createLinearGradient(0,0,0,128);
tukPlateBase.addColorStop(0,'#f6db72');
tukPlateBase.addColorStop(.55,'#e5bd45');
tukPlateBase.addColorStop(1,'#ad832c');
tukPlateCtx.fillStyle=tukPlateBase;tukPlateCtx.fillRect(0,0,256,128);
tukPlateCtx.strokeStyle='#54452d';tukPlateCtx.lineWidth=5;
tukPlateCtx.strokeRect(7,7,242,114);
tukPlateCtx.strokeStyle='rgba(255,246,183,.65)';tukPlateCtx.lineWidth=2;
tukPlateCtx.strokeRect(13,13,230,102);
for(const x of [19,237])for(const y of [20,108]){
 tukPlateCtx.fillStyle='#716143';tukPlateCtx.beginPath();
 tukPlateCtx.arc(x,y,3.5,0,Math.PI*2);tukPlateCtx.fill();
 tukPlateCtx.fillStyle='rgba(255,255,230,.5)';tukPlateCtx.fillRect(x-1,y-2,2,2);
}
tukPlateCtx.textAlign='center';
tukPlateCtx.fillStyle='#272923';
tukPlateCtx.font='bold 25px sans-serif';
tukPlateCtx.fillText('กรุงเทพมหานคร',128,48);
tukPlateCtx.font='bold 45px sans-serif';
tukPlateCtx.fillText('1 กข 2549',128,98);
for(let i=0;i<105;i++){
 const x=(i*83+17)%244+6,y=(i*47+13)%112+8;
 tukPlateCtx.fillStyle=i%3===0?'rgba(63,49,22,.11)':'rgba(255,248,196,.18)';
 tukPlateCtx.fillRect(x,y,1+i%2,1);
}
const tukPlateTexture=new THREE.CanvasTexture(tukPlateCanvas);
tukPlateTexture.colorSpace=THREE.SRGBColorSpace;
tukPlateTexture.anisotropy=mobile?2:4;
const tukPlateMaterial=new THREE.MeshStandardMaterial({
 map:tukPlateTexture,metalness:.08,roughness:.59,side:THREE.DoubleSide
});
const tukPlateGeometry=new THREE.PlaneGeometry(.46,.23);
// Shared, baked three-chamber Bangkok tuk-tuk rear lamps. Amber indicators,
// ribbed red stop lenses and pale reversing lenses replace featureless red
// spheres. All reflections, dust and housing seams live in one tiny atlas;
// traffic clones share its PBR material, geometry and GPU texture.
const tukRearLampCanvas=document.createElement('canvas');
tukRearLampCanvas.width=128;tukRearLampCanvas.height=256;
const tukRearLampCtx=tukRearLampCanvas.getContext('2d');
tukRearLampCtx.fillStyle='#191c20';tukRearLampCtx.fillRect(0,0,128,256);
for(const [y,h,light,dark] of [
 [12,65,'#ffc35e','#a84a13'],  // amber turn signal
 [82,104,'#ff5d4c','#750f1b'], // red brake and tail lamp
 [192,52,'#d9e4df','#64716f']  // reversing lens
]){
 const lens=tukRearLampCtx.createLinearGradient(12,y,114,y+h);
 lens.addColorStop(0,light);lens.addColorStop(.47,dark);lens.addColorStop(1,light);
 tukRearLampCtx.fillStyle=lens;tukRearLampCtx.fillRect(12,y,104,h);
 tukRearLampCtx.strokeStyle='rgba(15,18,21,.75)';tukRearLampCtx.lineWidth=4;
 tukRearLampCtx.strokeRect(12,y,104,h);
 tukRearLampCtx.strokeStyle='rgba(255,247,221,.25)';tukRearLampCtx.lineWidth=1;
 for(let rib=y+7;rib<y+h-3;rib+=7){
  tukRearLampCtx.beginPath();tukRearLampCtx.moveTo(18,rib);
  tukRearLampCtx.lineTo(110,rib);tukRearLampCtx.stroke();
 }
}
tukRearLampCtx.strokeStyle='#55595c';tukRearLampCtx.lineWidth=5;
tukRearLampCtx.strokeRect(5,5,118,246);
for(const y of [9,247])for(const x of [9,119]){
 tukRearLampCtx.fillStyle='#9a9990';tukRearLampCtx.beginPath();
 tukRearLampCtx.arc(x,y,2.5,0,Math.PI*2);tukRearLampCtx.fill();
}
for(let i=0;i<85;i++){
 const x=(i*47+19)%128,y=(i*71+13)%256;
 tukRearLampCtx.fillStyle=i%3?'rgba(26,20,16,.14)':'rgba(255,242,203,.15)';
 tukRearLampCtx.fillRect(x,y,1+i%2,1);
}
const tukRearLampTexture=new THREE.CanvasTexture(tukRearLampCanvas);
tukRearLampTexture.colorSpace=THREE.SRGBColorSpace;
tukRearLampTexture.anisotropy=mobile?2:4;
const tukRearLampMaterial=new THREE.MeshPhysicalMaterial({
 map:tukRearLampTexture,emissiveMap:tukRearLampTexture,
 emissive:0x663323,emissiveIntensity:.19,metalness:0,roughness:.3,
 clearcoat:.58,clearcoatRoughness:.23
});
// A slightly convex lens catches the existing scene lights without another
// realtime light or draw call. Two rear lamps are instanced per tuk-tuk.
const tukRearLampGeometry=new THREE.PlaneGeometry(.23,.42,4,6);
const tukRearLampPositions=tukRearLampGeometry.attributes.position;
for(let i=0;i<tukRearLampPositions.count;i++){
 const x=tukRearLampPositions.getX(i);
 tukRearLampPositions.setZ(i,.014*(1-(x/.115)**2));
}
tukRearLampPositions.needsUpdate=true;
tukRearLampGeometry.computeVertexNormals();
function makeTukTuk(){
 const g=new THREE.Group();
 // The tapered pressed-metal nose and rear wheel arch have rounded bevels.
 function sideShell(points,width,material){
  const outline=new THREE.Shape();
  // Rounded stamped-steel shoulder, using the existing shell and material.
  points.forEach(([z,y],i)=>{
   const next=points[(i+1)%points.length],after=points[(i+2)%points.length];
   const x=-z,nx=-next[0],ax=-after[0],ny=next[1];
   if(i===0)outline.moveTo(x*.82+nx*.18,y*.82+ny*.18);
   outline.lineTo(x*.18+nx*.82,y*.18+ny*.82);
   outline.quadraticCurveTo(nx,ny,nx*.82+ax*.18,ny*.82+after[1]*.18);
  });
  outline.closePath();
  const geo=new THREE.ExtrudeGeometry(outline,{depth:width-.07,steps:1,bevelEnabled:true,bevelThickness:.035,bevelSize:.035,bevelSegments:2,curveSegments:3});
  const mesh=new THREE.Mesh(geo,material);
  mesh.rotation.y=Math.PI/2;mesh.position.x=-(width-.07)/2;g.add(mesh);
 }
 sideShell([[-1.32,.55],[1.32,.55],[1.47,.81],[1.27,1.24],[.94,1.47],[.44,1.34],[-.65,1.08],[-1.29,1.04]],1.5,tukPaint);
 sideShell([[.62,1.12],[1.26,1.14],[1.32,1.22],[.84,1.31]],1.54,tukAccent);
 // Rounded cast-metal mirror housings and inset PBR reflective lenses.
 // Allocate geometry once per cached obstacle template, never per animation frame.
 const tukMirrorShellGeometry=new THREE.SphereGeometry(1,12,8);
 tukMirrorShellGeometry.scale(.155,.105,.055);
 const tukMirrorGlassGeometry=new THREE.SphereGeometry(1,12,8,0,Math.PI*2,0,Math.PI);
 tukMirrorGlassGeometry.scale(.132,.084,.012);
 const tukMirrorGlassMaterial=new THREE.MeshPhysicalMaterial({color:0x8aaebd,metalness:.65,roughness:.16,clearcoat:.8,clearcoatRoughness:.1});
 // Open-sided passenger compartment: no solid toy-box walls above the beltline.
 for(const side of [-1,1]){
  g.add(cube(.065,.45,1.12,tukPaint,side*.73,1.03,-.63));
  g.add(cube(.045,.09,1.23,tukAccent,side*.765,1.28,-.61));
  // One shared atlas-mapped PBR wheel per side: tread, sidewall, steel rim and lug nuts.
  // Reuses the taxi/bus wheel geometry and material without extra textures or draw calls.
  const wheel=new THREE.Mesh(busWheelGeometry,busWheelMaterial);
  wheel.rotation.z=Math.PI/2;
  wheel.scale.set(.37/.48,.19/.21,.37/.48);
  wheel.position.set(side*.81,.42,-.96);g.add(wheel);
  rod(g,[side*.73,1.27,-1.23],[side*.76,2.35,-1.21],.032,tukTrim);
  rod(g,[side*.74,1.32,.58],[side*.77,2.36,.7],.032,tukTrim);
  // Handlebar mirrors project beyond the narrow front cab.
  rod(g,[side*.61,1.45,.89],[side*.9,1.93,1.03],.027,tukTrim);
  // Rounded mirror shell and inset silver-blue glass replace the toy-box mirror.
  // Shared sphere geometry/materials are reused across both sides and clones.
  const mirrorShell=new THREE.Mesh(tukMirrorShellGeometry,tukTrim);
  mirrorShell.position.set(side*.91,1.98,1.04);
  mirrorShell.rotation.y=side*.12;
  g.add(mirrorShell);
  const mirrorGlass=new THREE.Mesh(tukMirrorGlassGeometry,tukMirrorGlassMaterial);
  mirrorGlass.position.set(side*.91,1.98,1.083);
  mirrorGlass.rotation.y=side*.12;
  g.add(mirrorGlass);
 }
 // The lower recessed grille below is the single front ventilation assembly.
 // Avoid a second overlapping five-slat grille that caused z-fighting and
 // an unnecessary draw call on mobile traffic clones.
 // Both rear lamp clusters face following traffic; the shared 128x256 atlas
 // renders brake, indicator and reversing lenses in one draw call per vehicle.
 const rearLamps=new THREE.InstancedMesh(tukRearLampGeometry,tukRearLampMaterial,2);
 const rearLampPose=new THREE.Object3D();
 for(const [i,side] of [-1,1].entries()){
  rearLampPose.position.set(side*.59,.94,-1.53);
  rearLampPose.rotation.set(0,Math.PI,0);
  rearLampPose.updateMatrix();
  rearLamps.setMatrixAt(i,rearLampPose.matrix);
 }
 rearLamps.instanceMatrix.needsUpdate=true;
 rearLamps.computeBoundingSphere();
 rearLamps.name='bangkok-tuktuk-three-chamber-tail-lamps';
 g.add(rearLamps);
 // Two flexible rear mudflaps: visible real-world silhouette behind the tyres.
 // Instanced in one draw call; no texture, dynamic lighting or collision edits.
 const flapOutline=new THREE.Shape();
 flapOutline.moveTo(-.18,.12);flapOutline.lineTo(.18,.12);
 flapOutline.lineTo(.15,-.26);flapOutline.quadraticCurveTo(0,-.29,-.15,-.26);
 flapOutline.closePath();
 const flapGeometry=new THREE.ShapeGeometry(flapOutline,3);
 const flapMaterial=new THREE.MeshStandardMaterial({color:0x17191b,roughness:.96,metalness:0,side:THREE.DoubleSide});
 const splashFlaps=new THREE.InstancedMesh(flapGeometry,flapMaterial,2);
 const flapPose=new THREE.Object3D();
 for(const [i,side] of [-1,1].entries()){
  flapPose.position.set(side*.81,.48,-1.34);
  flapPose.rotation.set(0,Math.PI,side*.06);
  flapPose.updateMatrix();
  splashFlaps.setMatrixAt(i,flapPose.matrix);
 }
 splashFlaps.instanceMatrix.needsUpdate=true;
 splashFlaps.computeBoundingSphere();
 splashFlaps.name='bangkok-tuktuk-rear-rubber-mudflaps';
 g.add(splashFlaps);
 // Recessed stamped engine inspection hatches on both exterior side skirts.
 // One instanced draw call, shared texture, and no change to obstacle bounds.
 const serviceHatches=new THREE.InstancedMesh(tukServiceGeometry,tukServiceMaterial,2);
 const hatchPose=new THREE.Object3D();
 for(const [i,side] of [-1,1].entries()){
  hatchPose.position.set(side*.774,1.025,-.76);
  hatchPose.rotation.set(0,side*Math.PI/2,0);
  hatchPose.updateMatrix();
  serviceHatches.setMatrixAt(i,hatchPose.matrix);
 }
 serviceHatches.instanceMatrix.needsUpdate=true;
 serviceHatches.computeBoundingSphere();
 g.add(serviceHatches);
 // Single front wheel shares the same PBR tyre/rim atlas as both rear wheels.
 const frontWheel=new THREE.Mesh(busWheelGeometry,busWheelMaterial);
 frontWheel.rotation.z=Math.PI/2;
 frontWheel.scale.set(.37/.48,1,.37/.48);
 frontWheel.position.set(0,.4,1.41);g.add(frontWheel);
 // Pressed-steel wheel arches replace the flattened toy-like front fender.
 // Rolled edges follow the tyres; 14 arc segments keep the fallback mobile-safe.
 // Rear arches share one instanced draw call and the existing PBR paint.
 const guardVertices=[],guardUV=[],guardIndices=[];
 const guardSteps=14,guardWidths=[-.27,-.235,.235,.27];
 for(let step=0;step<=guardSteps;step++){
  const angle=-1.27+2.54*step/guardSteps;
  // A pressed-steel Thai tuk-tuk mudguard rises over the tyre and tapers
  // into the fork at each end; a constant-width semicircle looked toy-like.
  const crown=Math.pow(Math.max(0,Math.cos(angle)),.65);
  const radius=.425+.042*crown;
  const topY=.4+radius*Math.cos(angle),topZ=1.41+radius*Math.sin(angle);
  const halfWidth=.16+.12*crown;
  for(let col=0;col<4;col++){
   const side=col<2?-1:1;
   const outerLip=col===0||col===3;
   const x=side*(outerLip?halfWidth:halfWidth-.038);
   // A continuous transverse crown rolls down into the pressed outer lips.
   // The wheel arch reads as curved sheet steel rather than a flat ribbon;
   // vertex count, PBR material and draw calls remain unchanged.
   const transverseCrown=.028*(1-(x/halfWidth)**2)*crown;
   const rolledEdge=outerLip?-.037:0;
   guardVertices.push(x,topY+transverseCrown+rolledEdge,topZ);
   guardUV.push(col/3,step/guardSteps);
  }
 }
 for(let step=0;step<guardSteps;step++)for(let col=0;col<3;col++){
  const a=step*4+col,b=a+4;
  // Winding points outward toward the upper visible surface.
  guardIndices.push(a,b,a+1,a+1,b,b+1);
 }
 // Fold both exposed longitudinal edges into shallow sheet-metal returns.
 // The continuous lips add silhouette depth without extra materials or draw calls.
 const lipBase=guardVertices.length/3;
 for(let step=0;step<=guardSteps;step++)for(const edge of [0,3]){
  const source=step*4+edge;
  guardVertices.push(guardVertices[source*3],guardVertices[source*3+1]-.052,guardVertices[source*3+2]);
  guardUV.push(edge/3,step/guardSteps);
 }
 for(let step=0;step<guardSteps;step++)for(let side=0;side<2;side++){
  const upper=step*4+(side===0?0:3),nextUpper=upper+4;
  const lower=lipBase+step*2+side,nextLower=lower+2;
  if(side===0)guardIndices.push(upper,lower,nextUpper,nextUpper,lower,nextLower);
  else guardIndices.push(upper,nextUpper,lower,nextUpper,nextLower,lower);
 }
 const guardGeometry=new THREE.BufferGeometry();
 guardGeometry.setAttribute('position',new THREE.Float32BufferAttribute(guardVertices,3));
 guardGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(guardUV,2));
 guardGeometry.setIndex(guardIndices);
 guardGeometry.computeVertexNormals();
 g.add(new THREE.Mesh(guardGeometry,tukPaint));
 const rearGuards=new THREE.InstancedMesh(guardGeometry,tukPaint,2);
 const guardDummy=new THREE.Object3D();
 for(const [index,side] of [-1,1].entries()){
  guardDummy.position.set(side*.81,.02,-2.37);
  guardDummy.scale.set(.82,1,1);
  guardDummy.updateMatrix();
  rearGuards.setMatrixAt(index,guardDummy.matrix);
 }
 rearGuards.instanceMatrix.needsUpdate=true;
 rearGuards.computeBoundingSphere();
 g.add(rearGuards);
 g.add(ball(.23,tukTrim,0,1.15,1.44));
 g.add(ball(.18,tukLamp,0,1.15,1.57));
 g.add(cube(.95,.075,.09,tukTrim,0,.61,1.44));
 // Recessed pressed-metal nose grille: six thin ventilation louvers and
 // two rolled side rails, not a flat toy-like painted rectangle.
 // One shared box geometry and a single InstancedMesh for all eight chrome
 // pieces; the inset uses the existing dark engine steel PBR material.
 g.add(cube(.72,.235,.025,tukEngineSteel,0,.862,1.502));
 const grilleGeometry=tukEngineUnitBox;
 const grille=new THREE.InstancedMesh(grilleGeometry,tukTrim,8);
 const grillePart=new THREE.Object3D();
 for(let i=0;i<6;i++){
  grillePart.position.set(0,.776+i*.035,1.532);
  grillePart.rotation.set(0,0,0);
  grillePart.scale.set(.61+Math.sin(i/5*Math.PI)*.065,.013,.026);
  grillePart.updateMatrix();
  grille.setMatrixAt(i,grillePart.matrix);
 }
 for(const [index,side] of [-1,1].entries()){
  grillePart.position.set(side*.345,.862,1.532);
  grillePart.rotation.set(0,0,0);
  grillePart.scale.set(.018,.232,.027);
  grillePart.updateMatrix();
  grille.setMatrixAt(index+6,grillePart.matrix);
 }
 grille.instanceMatrix.needsUpdate=true;
 grille.computeBoundingSphere();
 g.add(grille);
// Front and rear Thai registration plates share one InstancedMesh draw call.
// Both face outward; keep them above the bumper and clear of the headlamp.
 const tukPlates=new THREE.InstancedMesh(tukPlateGeometry,tukPlateMaterial,2);
 const tukPlatePose=new THREE.Object3D();
 for(const [index,z,angle] of [[0,1.53,0],[1,-1.54,Math.PI]]){
  tukPlatePose.position.set(0,.89,z);
  tukPlatePose.rotation.set(0,angle,0);
  tukPlatePose.updateMatrix();
  tukPlates.setMatrixAt(index,tukPlatePose.matrix);
 }
 tukPlates.instanceMatrix.needsUpdate=true;
 tukPlates.computeBoundingSphere();
 g.add(tukPlates);
 // Open cabin with stitched, rounded vinyl cushions (two shared-material meshes).
 // The front-facing backrest and horizontal bench retain the original clearances.
 const bench=new THREE.Mesh(makeTukCushion(1.31,.7,.14),tukSeat);
 bench.rotation.x=-Math.PI/2;bench.position.set(0,1.27,-.75);g.add(bench);
 const backrest=new THREE.Mesh(makeTukCushion(1.31,.56,.10),tukSeat);
 backrest.position.set(0,1.68,-1.17);g.add(backrest);
 g.add(cube(1.43,.08,.09,tukTrim,0,1.38,-1.32));
 // Exposed rear-mounted engine, cooling fins and soot-darkened exhaust.
 // All eleven steel parts share one InstancedMesh draw call per traffic tuk-tuk.
 // The geometry/material are shared by cached obstacle clones; no runtime textures.
 const engineParts=[
  [.57,.73,-1.31,.55,.37,.46], // engine crankcase behind passenger bench
  [.81,.73,-1.31,.11,.3,.43],  // removable side cover
  [.18,.6,-1.43,.35,.23,.3],   // gearbox
  [.57,.49,-1.58,.2,.16,.49],  // rear silencer
  [.57,.49,-1.84,.13,.09,.17]  // exhaust outlet
 ];
 for(let i=0;i<6;i++)engineParts.push([.89,.59+i*.054,-1.31,.055,.032,.49]);
 const engineMesh=new THREE.InstancedMesh(tukEngineUnitBox,tukEngineSteel,engineParts.length);
 const enginePart=new THREE.Object3D();
 engineParts.forEach(([px,py,pz,w,h,d],i)=>{
  enginePart.position.set(px,py,pz);
  enginePart.scale.set(w,h,d);
  enginePart.updateMatrix();
  engineMesh.setMatrixAt(i,enginePart.matrix);
 });
 engineMesh.instanceMatrix.needsUpdate=true;
 g.add(engineMesh);
 // The fallback traffic tuk-tuk now has a gently bowed, tapered glass pane
 // instead of a flat toy-like quad. Preserve the existing weathered PBR glass
 // atlas, rubber seal and wiper, with exactly one windshield draw call.
 // Thirteen columns and five rows resolve the bowed windscreen silhouette
 // and rain-lit PBR normals without adding a mesh, material or draw call (65 vertices / 96 triangles).
 const windscreenGeometry=new THREE.BufferGeometry();
 const paneColumns=12,paneRows=4,paneVertices=[],paneUvs=[],paneIndices=[];
 for(let row=0;row<=paneRows;row++){
  const v=row/paneRows,halfWidth=.71-.06*v;
  for(let col=0;col<=paneColumns;col++){
   const u=col/paneColumns,nx=2*u-1;
   // Rounded top corners create a realistic trapezoidal tuk-tuk windscreen.
   const cornerInset=v>.66?.055*Math.pow((v-.66)/.34,2)*Math.pow(Math.abs(nx),6):0;
   const glassX=nx*(halfWidth-cornerInset);
   // Lean the upper glass rearward while retaining its subtle central bow.
   const bow=.072*(1-nx*nx)*Math.sin(Math.PI*(.12+.76*v))-.065*v;
   paneVertices.push(glassX,-.335+.67*v,bow);
   paneUvs.push(u,v);
  }
 }
 for(let row=0;row<paneRows;row++)for(let col=0;col<paneColumns;col++){
  const a=row*(paneColumns+1)+col,b=a+1,c=a+paneColumns+1,d=c+1;
  paneIndices.push(a,b,c,b,d,c);
 }
 windscreenGeometry.setAttribute('position',new THREE.Float32BufferAttribute(paneVertices,3));
 windscreenGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(paneUvs,2));
 windscreenGeometry.setIndex(paneIndices);
 windscreenGeometry.computeVertexNormals();
 const glass=new THREE.Mesh(windscreenGeometry,tukWindscreen);
 glass.position.set(0,1.88,.79);glass.rotation.x=-.15;g.add(glass);
 rod(g,[-.7,1.53,.85],[-.7,2.23,.72],.027,tukTrim);
 rod(g,[.7,1.53,.85],[.7,2.23,.72],.027,tukTrim);
 // Contoured windscreen header follows the tapered, bowed glass instead of
 // a straight toy-like box beam. Nine points share one low-poly tube mesh.
 const headerPoints=[];
 for(let i=0;i<=8;i++){
  const x=-.65+i*(1.30/8),nx=x/.65;
  headerPoints.push(new THREE.Vector3(x,2.235+.018*(1-nx*nx),.72+.015*(1-nx*nx)));
 }
 const headerCurve=new THREE.CatmullRomCurve3(headerPoints);
 const header=new THREE.Mesh(new THREE.TubeGeometry(headerCurve,8,.028,5,false),tukTrim);
 header.name='tuktuk-contoured-windscreen-header';g.add(header);
// Extended front canopy lip by 27cm: Bangkok-style rain/sun visor over the windscreen.
 // The curved roof, side valances and front hem share the same indexed mesh,
 // preserving the original single draw call and clear driving collision bounds.
 // Curved cloth canopy: a single low-poly strip instead of a flat slab.
 const vertices=[],indices=[],uvs=[],nx=8,nz=3;
 for(let iz=0;iz<=nz;iz++)for(let ix=0;ix<=nx;ix++){
  const x=-.86+ix*1.72/nx,z=-1.38+iz*2.43/nz;
  // Sculpt the canvas in both axes: taut transverse crown, gentle longitudinal
  // tension and a dipped rain-shedding front visor. Same mesh/triangle count.
  // A raised central canvas ridge sheds rain toward both rolled side edges.
  // The deeper front lip reads as a real Bangkok tuk-tuk rain visor at night.
  // Preserve the existing indexed canopy mesh and its single draw call.
  const transverseCrown=.235*(1-(x/.86)*(x/.86));
  const lengthTension=.055*Math.sin(Math.PI*iz/nz)*(1-.35*Math.abs(x/.86));
  const visorDip=iz===nz?-.115:0;
  vertices.push(x,2.34+transverseCrown+lengthTension+visorDip,z);
  uvs.push(ix/nx,iz/nz);
 }
 for(let iz=0;iz<nz;iz++)for(let ix=0;ix<nx;ix++){
  const a=iz*(nx+1)+ix,b=a+nx+1;indices.push(a,b,a+1,b,b+1,a+1);
 }
 // Real Bangkok tuk-tuks have a tensioned canvas valance, not a bare roof edge.
 // Add scalloped side skirts and shallow front/rear hems to the EXISTING
 // indexed roof mesh: one shared weathered PBR atlas, one draw call, no lights.
 // The open passenger sides, windshield clearance and obstacle bounds remain.
 for(const side of [-1,1]){
  const base=vertices.length/3,segments=12;
  for(let iz=0;iz<=segments;iz++){
   const v=iz/segments,z=-1.38+2.43*v;
   const scallop=.018*(1-Math.cos(6*Math.PI*v))*.5;
   vertices.push(side*.86,2.34,z,side*.86,2.17+scallop,z);
   uvs.push(side<0?.09:.91,v,side<0?.02:.98,v);
  }
  for(let iz=0;iz<segments;iz++){
   const a=base+2*iz;indices.push(a,a+2,a+1,a+2,a+3,a+1);
  }
 }
 for(const end of [-1,1]){
  const base=vertices.length/3,z=end<0?-1.38:1.05,segments=8;
  for(let ix=0;ix<=segments;ix++){
   const u=ix/segments,x=-.86+1.72*u;
   // Match the front visor dip to the roof surface to avoid a visible seam.
   const roofY=2.34+.235*(1-(x/.86)**2)+(end>0?-.115:0);
   vertices.push(x,roofY,z,x,roofY-.11,z);
   uvs.push(u,end<0?.07:.93,u,end<0?.01:.99);
  }
  for(let ix=0;ix<segments;ix++){
   const a=base+2*ix;indices.push(a,a+2,a+1,a+2,a+3,a+1);
  }
 }
 const roofGeometry=new THREE.BufferGeometry();
 roofGeometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
 roofGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
 roofGeometry.setIndex(indices);roofGeometry.computeVertexNormals();
 g.add(new THREE.Mesh(roofGeometry,tukCanvas));
 // Three curved transverse bows and two full-length edge rails make the
 // weathered canvas canopy read as tensioned fabric on a real steel frame.
 // Roof bows, handlebar and four triangulated canopy stays share one instanced steel draw call.
 const frame=new THREE.InstancedMesh(tukCanopyFrameGeometry,tukTrim,25);
 const framePart=new THREE.Object3D();
 const frameStart=new THREE.Vector3(),frameEnd=new THREE.Vector3();
 const frameDirection=new THREE.Vector3(),frameUp=new THREE.Vector3(0,1,0);
 let frameIndex=0;
 function addCanopyTube(ax,ay,az,bx,by,bz){
  frameStart.set(ax,ay,az);frameEnd.set(bx,by,bz);
  frameDirection.subVectors(frameEnd,frameStart);
  const length=frameDirection.length();
  framePart.position.copy(frameStart).add(frameEnd).multiplyScalar(.5);
  framePart.quaternion.setFromUnitVectors(frameUp,frameDirection.multiplyScalar(1/length));
  framePart.scale.set(1,length,1);
  framePart.updateMatrix();
  frame.setMatrixAt(frameIndex++,framePart.matrix);
 }
 const canopyY=x=>2.34+.235*(1-(x/.86)*(x/.86))+.055*Math.sin(Math.PI/3)*(1-.35*Math.abs(x/.86));
 for(const z of [-1.33,-.30,.72]){
  for(let ix=0;ix<4;ix++){
   const x0=-.86+ix*.43,x1=x0+.43;
   addCanopyTube(x0,canopyY(x0),z,x1,canopyY(x1),z);
  }
 }
 for(const x of [-.85,.85])addCanopyTube(x,canopyY(x),-1.38,x,canopyY(x),.78);
 // Sloping front/rear support stays create the recognizable open-sided Bangkok
 // tuk-tuk silhouette; four extra instances, still one shared steel draw call.
 for(const side of [-1,1]){
  addCanopyTube(side*.85,1.23,-.96,side*.85,canopyY(side*.85),-1.33);
  addCanopyTube(side*.85,1.23,.39,side*.85,canopyY(side*.85),.72);
 }
 // The same instanced chrome tubes form the motorcycle-style handlebar,
 // steering stem and brake levers (7 parts, no additional steel draw call).
 const handlebarSegments=[
  [0,1.02,1.03,0,1.42,.85],
  [0,1.42,.85,-.34,1.49,.87],
  [0,1.42,.85,.34,1.49,.87],
  [-.34,1.49,.87,-.51,1.47,.87],
  [.34,1.49,.87,.51,1.47,.87],
  [-.33,1.48,.87,-.47,1.38,.98],
  [.33,1.48,.87,.47,1.38,.98]
 ];
 for(const segment of handlebarSegments)addCanopyTube(...segment);
 frame.instanceMatrix.needsUpdate=true;
 frame.computeBoundingSphere();
 g.add(frame);
 // Two rubber handgrips share a single draw call and the existing tube geometry.
 const grips=new THREE.InstancedMesh(tukCanopyFrameGeometry,tukHandleGripMaterial,2);
 for(const [i,side] of [-1,1].entries()){
  frameStart.set(side*.38,1.485,.87);frameEnd.set(side*.52,1.47,.87);
  frameDirection.subVectors(frameEnd,frameStart);
  const length=frameDirection.length();
  framePart.position.copy(frameStart).add(frameEnd).multiplyScalar(.5);
  framePart.quaternion.setFromUnitVectors(frameUp,frameDirection.multiplyScalar(1/length));
  framePart.scale.set(1.65,length,1.65);
  framePart.updateMatrix();grips.setMatrixAt(i,framePart.matrix);
 }
 grips.instanceMatrix.needsUpdate=true;grips.computeBoundingSphere();g.add(grips);
 // Baked analogue speedometer behind the windscreen: no animated textures.
 const instrument=new THREE.Mesh(new THREE.PlaneGeometry(.33,.29),tukGaugeMaterial);
 instrument.position.set(0,1.34,.97);instrument.rotation.x=-.22;g.add(instrument);
 // A seated Bangkok tuk-tuk driver is visible through the existing curved
 // windscreen. One seven-instance PBR mesh adds a recognisable human silhouette
 // (navy shirt, skin, dark hair, arms reaching the handlebars) without seven
 // individual draw calls, external assets, animated bones or collision changes.
 // Keep all parts inside the 1.5m-wide cabin and below the canopy.
 const driverParts=new THREE.InstancedMesh(
  new THREE.CapsuleGeometry(.17,.25,3,6),
  new THREE.MeshStandardMaterial({color:0xffffff,metalness:0,roughness:.88}),
  7
 );
 const driverPose=new THREE.Object3D();
 const driverColors=[0x283f54,0xb88768,0x242326,0x283f54,0x283f54,0xb88768,0xb88768];
 const driverDimensions=[
  [0,1.49,.19,1.55,1.18,1.05,0,0], // work shirt and shoulders
  [0,1.98,.28,.88,.66,.88,0,0],     // face
  [0,2.125,.27,.88,.20,.90,0,0],    // short dark hair
  [-.285,1.51,.46,.47,.88,.47,-.66,-.27],
  [.285,1.51,.46,.47,.88,.47,-.66,.27],
  [-.40,1.425,.72,.31,.34,.31,-.55,-.16],
  [.40,1.425,.72,.31,.34,.31,-.55,.16]
 ];
 driverDimensions.forEach(([px,py,pz,sx,sy,sz,rx,rz],i)=>{
  driverPose.position.set(px,py,pz);
  driverPose.rotation.set(rx,0,rz);
  driverPose.scale.set(sx,sy,sz);
  driverPose.updateMatrix();
  driverParts.setMatrixAt(i,driverPose.matrix);
  driverParts.setColorAt(i,new THREE.Color(driverColors[i]));
 });
 driverParts.instanceMatrix.needsUpdate=true;
 driverParts.instanceColor.needsUpdate=true;
 driverParts.computeBoundingSphere();
 driverParts.name='bangkok-tuktuk-seated-driver';
 g.add(driverParts);
 // Passenger silhouette gives the rear bench a recognisable occupied Bangkok
 // tuk-tuk profile. Five tinted instances share one draw call and geometry;
 // no new lights, animation, collision volume or per-frame allocations.
 const passenger=new THREE.InstancedMesh(
  new THREE.CapsuleGeometry(.17,.24,3,6),
  new THREE.MeshStandardMaterial({color:0xffffff,roughness:.89,metalness:0}),5
 );
 const passengerPose=new THREE.Object3D();
 const passengerShapes=[
  [-.25,1.47,-.65,1.35,1.13,1.03,0,0,0x9e5364], // torso
  [-.25,1.94,-.61,.83,.68,.83,0,0,0xb9886d],    // face
  [-.25,2.085,-.62,.89,.28,.89,0,0,0x26262b],  // hair
  [-.54,1.51,-.56,.42,.88,.42,-.12,0,0x9e5364], // left arm
  [.04,1.51,-.56,.42,.88,.42,-.12,0,0x9e5364]  // right arm
 ];
 passengerShapes.forEach(([x,y,z,sx,sy,sz,rx,rz,color],i)=>{
  passengerPose.position.set(x,y,z);
  passengerPose.rotation.set(rx,0,rz);
  passengerPose.scale.set(sx,sy,sz);
  passengerPose.updateMatrix();
  passenger.setMatrixAt(i,passengerPose.matrix);
  passenger.setColorAt(i,new THREE.Color(color));
 });
 passenger.instanceMatrix.needsUpdate=true;
 passenger.instanceColor.needsUpdate=true;
 passenger.computeBoundingSphere();
 passenger.name='bangkok-tuktuk-rear-passenger';
 g.add(passenger);
 return g;
}
// PBR Thai street scooter: swept body panels, real tyre profiles and human-shaped riders.
// All meshes are cached in obstacleTemplates and cloned with shared geometries/materials;
// the dodge-lane footprint and existing spawn/collision logic stay unchanged.
function makeBike(){
 const g=new THREE.Group();
 const orange=new THREE.MeshPhysicalMaterial({color:0xd84b22,metalness:.22,roughness:.36,clearcoat:.5,clearcoatRoughness:.26});
 const dark=new THREE.MeshStandardMaterial({color:0x20252a,roughness:.88,metalness:.06});
 const seat=new THREE.MeshStandardMaterial({color:0x28262b,roughness:.92,metalness:0});
 const skin=new THREE.MeshStandardMaterial({color:0xc99c7c,roughness:.95});
 const pink=new THREE.MeshStandardMaterial({color:0xb92b69,roughness:.84});
 const helmet=new THREE.MeshPhysicalMaterial({color:0xe76625,roughness:.28,metalness:.16,clearcoat:.72,clearcoatRoughness:.18});
 const visor=new THREE.MeshPhysicalMaterial({color:0x1b303b,metalness:.25,roughness:.19,clearcoat:.6,clearcoatRoughness:.17});
 const hair=new THREE.MeshStandardMaterial({color:0x282022,roughness:.95});
 const lamp=new THREE.MeshStandardMaterial({color:0xf0e9c8,emissive:0x67512c,emissiveIntensity:.32,roughness:.3});
 const tyreGeometry=new THREE.TorusGeometry(.35,.095,8,18);
 const hubGeometry=new THREE.CylinderGeometry(.18,.18,.16,12);
 const hubMat=new THREE.MeshStandardMaterial({color:0x8c9699,metalness:.76,roughness:.41});
 for(const z of [-.84,.88]){
  const tyre=new THREE.Mesh(tyreGeometry,dark);tyre.rotation.y=Math.PI/2;tyre.position.set(0,.43,z);g.add(tyre);
  const hub=new THREE.Mesh(hubGeometry,hubMat);hub.rotation.z=Math.PI/2;hub.position.set(0,.43,z);g.add(hub);
 }
 function sideShell(points,width,material){
  const shape=new THREE.Shape();
  points.forEach(([z,y],i)=>i?shape.lineTo(-z,y):shape.moveTo(-z,y));
  shape.closePath();
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:width-.05,steps:1,bevelEnabled:true,bevelThickness:.025,bevelSize:.03,bevelSegments:2,curveSegments:3});
  const mesh=new THREE.Mesh(geometry,material);mesh.rotation.y=Math.PI/2;
  mesh.position.x=-(width-.05)/2;g.add(mesh);return mesh;
 }
 // Tapered step-through scooter frame and raked front leg shield.
 sideShell([[-1.08,.59],[.95,.59],[1.05,.78],[.82,1.18],[.58,1.25],[.21,1.04],[-.46,1.04],[-.85,1.12],[-1.08,.91]],.63,orange);
 sideShell([[.55,.73],[1.05,.78],[1.09,1.41],[.91,1.49],[.69,1.29]],.72,orange);
 sideShell([[-.96,1.04],[-.61,1.29],[.17,1.32],[.38,1.18]],.58,seat);
 const footwell=part(g,cube(.55,.08,.86,dark,0,.73,.03));
 footwell.rotation.x=-.06;
 // Instanced street-scooter road kit: curved mudguards, stalk mirrors,
 // reflective glass, amber indicators and a visible engine casing.
 // Created once per cached obstacle template; no frame-loop work.
 const pose=new THREE.Object3D();
 const fenders=new THREE.InstancedMesh(new THREE.TorusGeometry(.455,.066,6,20,Math.PI),orange,2);
 for(let i=0;i<2;i++){
  pose.position.set(0,.43,i===0?-.84:.88);
  pose.rotation.set(0,Math.PI/2,0);pose.scale.set(1,1,1);
  pose.updateMatrix();fenders.setMatrixAt(i,pose.matrix);
 }
 fenders.instanceMatrix.needsUpdate=true;fenders.computeBoundingSphere();g.add(fenders);
 const stalks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.018,.022,1,6),bikeMetal,2);
 const shells=new THREE.InstancedMesh(new THREE.SphereGeometry(1,10,8),dark,2);
 const mirrorFinish=new THREE.MeshPhysicalMaterial({color:0x8babb9,metalness:.72,roughness:.13,clearcoat:.9,clearcoatRoughness:.12});
 const glasses=new THREE.InstancedMesh(new THREE.SphereGeometry(1,10,8),mirrorFinish,2);
 for(let i=0;i<2;i++){
  const side=i===0?-1:1;
  const base=new THREE.Vector3(side*.26,1.46,.85),tip=new THREE.Vector3(side*.51,1.76,.95);
  const delta=tip.clone().sub(base);
  pose.position.copy(base).add(tip).multiplyScalar(.5);
  pose.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.clone().normalize());
  pose.scale.set(1,delta.length(),1);
  pose.updateMatrix();stalks.setMatrixAt(i,pose.matrix);
  pose.quaternion.identity();pose.position.set(side*.52,1.78,.96);
  pose.scale.set(.185,.115,.055);pose.updateMatrix();shells.setMatrixAt(i,pose.matrix);
  pose.position.z+=.044;pose.scale.set(.151,.089,.014);
  pose.updateMatrix();glasses.setMatrixAt(i,pose.matrix);
 }
 for(const mesh of [stalks,shells,glasses]){
  mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();g.add(mesh);
 }
 const amber=new THREE.MeshStandardMaterial({color:0xf2a336,emissive:0x9a4706,emissiveIntensity:.36,roughness:.35});
 const blinkers=new THREE.InstancedMesh(new THREE.SphereGeometry(1,10,8),amber,4);
 for(let i=0;i<4;i++){
  const side=i%2===0?-1:1,front=i<2;
  pose.quaternion.identity();
  pose.position.set(side*(front?.32:.30),front?1.23:1.05,front?1.11:-1.11);
  pose.scale.set(.12,.065,.055);pose.updateMatrix();blinkers.setMatrixAt(i,pose.matrix);
 }
 blinkers.instanceMatrix.needsUpdate=true;blinkers.computeBoundingSphere();g.add(blinkers);
 const engineCovers=new THREE.InstancedMesh(new THREE.SphereGeometry(1,12,8),hubMat,2);
 for(let i=0;i<2;i++){
  pose.quaternion.identity();pose.position.set(i===0?-.35:.35,.76,-.58);
  pose.scale.set(.075,.22,.36);pose.updateMatrix();engineCovers.setMatrixAt(i,pose.matrix);
 }
 engineCovers.instanceMatrix.needsUpdate=true;engineCovers.computeBoundingSphere();g.add(engineCovers);
 // Forks, front brake and handlebar use slim PBR metal rather than square slabs.
 for(const side of [-1,1]){
  rod(g,[side*.16,.52,.87],[side*.24,1.47,.84],.035,bikeMetal);
  rod(g,[side*.23,1.47,.82],[side*.36,1.5,.9],.026,bikeMetal);
 }
 rod(g,[-.38,1.5,.9],[.38,1.5,.9],.027,bikeMetal);
 const headlamp=part(g,new THREE.Mesh(new THREE.SphereGeometry(.17,12,8),lamp));
 headlamp.position.set(0,1.2,1.06);headlamp.scale.set(1,.68,.35);
 const taillamp=part(g,new THREE.Mesh(new THREE.SphereGeometry(.12,10,8),
  new THREE.MeshStandardMaterial({color:0xa51b20,emissive:0x5b090c,emissiveIntensity:.35})));
 taillamp.position.set(0,1.05,-1.11);taillamp.scale.set(1,.7,.35);
 // Smooth torso, tapered limbs and rounded helmets: no block-bodied passengers.
 function oval(x,y,z,sx,sy,sz,material){
  const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,12,9),material);
  mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);g.add(mesh);return mesh;
 }
 function limb(a,b,r0,r1,material){
  const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),direction=to.clone().sub(from);
  const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r1,r0,direction.length(),8),material);
  mesh.position.copy(from).add(to).multiplyScalar(.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());
  g.add(mesh);
 }
 function rider(z,shirt,passenger){
  const torso=oval(0,1.73,z,.33,.42,.25,shirt);torso.rotation.x=passenger?-.11:.16;
  oval(0,2.25,z+.07,.245,.26,.245,skin);
  oval(0,2.38,z+.055,.29,.26,.285,helmet);
  oval(0,2.36,z+.31,.235,.105,.085,visor);
  // Thin rear helmet trim reads clearly from the approaching driver's POV.
  oval(0,2.33,z-.215,.21,.037,.025,hubMat);
  for(const side of [-1,1]){
   const sx=side*.27;
   limb([sx,1.96,z+.07],[side*.36,1.68,z+.3],.105,.082,shirt);
   limb([side*.36,1.68,z+.3],[side*.31,1.5,passenger?z+.38:.88],.082,.055,skin);
   limb([side*.19,1.43,z-.06],[side*.25,.98,z-.22],.14,.105,dark);
   limb([side*.25,.98,z-.22],[side*.27,.74,z+.02],.10,.07,dark);
   oval(side*.27,.72,z+.06,.14,.08,.24,seat);
  }
  if(passenger){
   for(const side of [-1,1]){
    const lock=oval(side*.22,2.09,z-.22,.095,.29,.10,hair);
    lock.rotation.z=side*.16;
   }
  }
 }
 rider(.24,dark,false);
 rider(-.53,pink,true);
 return g;
}
// Sculpted, PBR-lit Yaksha fallback for when the optional remote GLB is unavailable.
// Tapered armor, articulated limbs and layered Thai guardian crown replace toy-box cubes.
// A tiny, deterministic two-map PBR atlas for the offline Yaksha fallback.
// Generate once (not per spawn), share across cloned meshes and avoid network fetches.
let yakshaPatinaCache=null;
function getYakshaPatina(){
 if(yakshaPatinaCache)return yakshaPatinaCache;
 const size=mobile?128:256;
 const colorCanvas=document.createElement('canvas'),heightCanvas=document.createElement('canvas');
 colorCanvas.width=colorCanvas.height=heightCanvas.width=heightCanvas.height=size;
 const colorCtx=colorCanvas.getContext('2d'),heightCtx=heightCanvas.getContext('2d');
 const colorPixels=colorCtx.createImageData(size,size),heightPixels=heightCtx.createImageData(size,size);
 let seed=0x71acb35;
 const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const i=(y*size+x)*4;
  const broad=Math.sin(x*.087)*Math.cos(y*.113)*12+Math.sin((x+y)*.038)*9;
  const grain=(rand()-.5)*22,pit=rand()<.035?-(24+rand()*39):0;
  const shade=broad+grain+pit;
  colorPixels.data[i]=Math.max(0,Math.min(255,214+shade));
  colorPixels.data[i+1]=Math.max(0,Math.min(255,201+shade*.93));
  colorPixels.data[i+2]=Math.max(0,Math.min(255,175+shade*.85));
  colorPixels.data[i+3]=255;
  const height=Math.max(0,Math.min(255,128+broad*.8+grain+pit*1.4));
  heightPixels.data[i]=heightPixels.data[i+1]=heightPixels.data[i+2]=height;
  heightPixels.data[i+3]=255;
 }
 colorCtx.putImageData(colorPixels,0,0);
 heightCtx.putImageData(heightPixels,0,0);
 // Broad oxidation and thin age cracks break up smooth, toy-like geometry.
 for(let i=0;i<19;i++){
  const x=rand()*size,y=rand()*size,r=(.02+rand()*.085)*size;
  colorCtx.fillStyle=i%3===0?'rgba(48,72,56,.22)':'rgba(62,39,21,.19)';
  colorCtx.beginPath();colorCtx.ellipse(x,y,r,r*(.3+rand()*.8),rand()*Math.PI,0,Math.PI*2);colorCtx.fill();
 }
 for(let i=0;i<12;i++){
  const x=rand()*size,y=rand()*size;
  colorCtx.strokeStyle='rgba(49,31,19,.28)';colorCtx.lineWidth=.6+rand()*.6;
  colorCtx.beginPath();colorCtx.moveTo(x,y);
  colorCtx.bezierCurveTo(x+size*.018,y+size*.015,x-size*.01,y+size*.05,x+size*.027,y+size*.08);
  colorCtx.stroke();
 }
 const map=new THREE.CanvasTexture(colorCanvas),bump=new THREE.CanvasTexture(heightCanvas);
 map.colorSpace=THREE.SRGBColorSpace;
 for(const texture of [map,bump]){
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.repeat.set(2,2);
  texture.anisotropy=2;
 }
 yakshaPatinaCache={map,bump};
 return yakshaPatinaCache;
}
// All geometry is constructed once in obstacleTemplates and shared by spawned clones.
function makeYaksha(){
 const g=new THREE.Group();
 // Aged-gold temple guardian turned skeletal apparition: no toy-green skin.
 const patina=getYakshaPatina();
 const worn=(color,metalness,roughness,bumpScale)=>new THREE.MeshStandardMaterial({
  color,metalness,roughness,map:patina.map,bumpMap:patina.bump,bumpScale
 });
 const enamel=worn(0x806947,.23,.79,.045);
 const armor=worn(0x4a3b30,.35,.74,.06);
 const darkGold=worn(0x9a753d,.56,.57,.04);
 const skullGold=worn(0xd8b37d,.18,.86,.055);
 const crownGold=worn(0xbba06a,.61,.53,.025);
 const porcelain=new THREE.MeshStandardMaterial({color:0xe7d9b5,roughness:.54});
 const socket=new THREE.MeshStandardMaterial({color:0x100e0d,roughness:.97,metalness:0});
 const add=(mesh,x=0,y=0,z=0)=>{mesh.position.set(x,y,z);g.add(mesh);return mesh};
 const lathe=(profile,material,x=0,y=0,z=0)=>add(new THREE.Mesh(
  new THREE.LatheGeometry(profile.map(p=>new THREE.Vector2(p[0],p[1])),16),material),x,y,z);
 const orb=(radius,material,x,y,z,sx=1,sy=1,sz=1)=>{
  const mesh=add(new THREE.Mesh(new THREE.SphereGeometry(radius,14,10),material),x,y,z);
  mesh.scale.set(sx,sy,sz);return mesh;
 };
 const limb=(a,b,r1,r2,material)=>{
  const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b);
  const delta=to.clone().sub(from);
  const mesh=add(new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,delta.length(),12),material),
   (a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
  return mesh;
 };
 // A human-shaped silhouette, with tapered waist, flared armored shoulders and a cloth skirt.
 lathe([[0,0],[.48,0],[.69,.18],[.73,.52],[.6,.84],[.57,1.2],[.78,1.55],[.88,1.75],[.65,1.9],[0,1.94]],enamel,0,1.32);
 lathe([[0,0],[.62,0],[.78,.15],[.67,.7],[.47,1.05],[0,1.09]],armor,0,.55);
 const waist=add(new THREE.Mesh(new THREE.TorusGeometry(.62,.075,8,24),crownGold),0,1.49,0);
 waist.rotation.x=Math.PI/2;
 const chestBand=add(new THREE.Mesh(new THREE.TorusGeometry(.72,.048,8,24),darkGold),0,2.45,0);
 chestBand.rotation.x=Math.PI/2;
 for(const side of [-1,1]){
  limb([side*.43,.27,0],[side*.48,1.38,0],.28,.34,armor);
  orb(.27,darkGold,side*.48,.3,.08,1,.45,1.5);
  orb(.47,crownGold,side*.86,2.86,0,1.25,.48,1.1);
  limb([side*.9,2.8,0],[side*1.18,2.14,.05],.27,.34,enamel);
  limb([side*1.18,2.14,.05],[side*1.06,1.65,.32],.21,.25,enamel);
  orb(.26,darkGold,side*1.18,2.13,.05,1,.8,1);
  orb(.21,enamel,side*1.06,1.57,.34,.9,1.3,.72);
  // Thai guardian's curled ear ornaments and angular, dark brow ridges.
  orb(.25,crownGold,side*.68,3.58,.05,.42,1.35,.75);
  limb([side*.13,3.76,.59],[side*.44,3.72,.51],.065,.09,darkGold);
  // Recessed black eye sockets, not friendly round cartoon eyes.
  orb(.19,socket,side*.3,3.55,.655,1.25,1.17,.48);
  const fang=add(new THREE.Mesh(new THREE.ConeGeometry(.11,.43,9),porcelain),side*.31,3.14,.64);
  fang.rotation.z=side*.19;
 }
 // Cheekbones, broad jaw, long nose and a non-cartoon mouth.
 orb(.76,skullGold,0,3.51,.03,.86,1.04,.79);
 orb(.39,skullGold,0,3.19,.4,1.2,.48,.85);
 orb(.19,skullGold,0,3.43,.66,.65,1.6,.8);
 // Hollow nose and open dark jaw; one instanced row of sharp teeth adds one draw.
 orb(.12,socket,0,3.31,.804,.74,.78,.22);
 orb(.34,socket,0,3.08,.683,1,.2,.27);
 const teeth=new THREE.InstancedMesh(new THREE.ConeGeometry(.067,.20,7),porcelain,8);
 const toothPose=new THREE.Object3D();
 for(let i=0;i<8;i++){
  toothPose.position.set((i-3.5)*.085,3.055+(i%2)*.012,.763);
  toothPose.rotation.z=Math.PI;
  toothPose.scale.set(1,i===1||i===6?1.3:.85,1);
  toothPose.updateMatrix();teeth.setMatrixAt(i,toothPose.matrix);
 }
 teeth.instanceMatrix.needsUpdate=true;teeth.computeBoundingSphere();g.add(teeth);
 // Layered, pointed chada crown and embossed gold forehead band.
 lathe([[0,0],[.68,0],[.73,.12],[.58,.27],[.52,.49],[.35,.65],[.28,.94],[.16,1.23],[0,1.56]],crownGold,0,4.09);
 const rim=add(new THREE.Mesh(new THREE.TorusGeometry(.65,.075,8,24),darkGold),0,4.11,0);
 rim.rotation.x=Math.PI/2;
 const studs=new THREE.InstancedMesh(new THREE.SphereGeometry(.09,8,6),darkGold,8);
 const dummy=new THREE.Object3D();
 for(let i=0;i<8;i++){
  const angle=i*Math.PI/4;
  dummy.position.set(Math.cos(angle)*.67,4.19,Math.sin(angle)*.67);
  dummy.scale.set(1,1.2,.7);dummy.updateMatrix();studs.setMatrixAt(i,dummy.matrix);
 }
 studs.instanceMatrix.needsUpdate=true;studs.computeBoundingSphere();g.add(studs);
 // Fine relief follows the armor without adding a texture download.
 for(const side of [-1,1]){
  limb([side*.24,2.08,.65],[side*.47,2.67,.51],.035,.035,darkGold);
 }
 g.userData.proceduralYaksha=true;
 return g;
}
// V0.7 art pass: curved silhouette, patterned cloth, facial features and articulated dance
function silkTexture(){const c=document.createElement('canvas');c.width=256;c.height=512;const q=c.getContext('2d');const grad=q.createLinearGradient(0,0,256,0);grad.addColorStop(0,'#360b19');grad.addColorStop(.35,'#86172d');grad.addColorStop(.7,'#b92b3d');grad.addColorStop(1,'#400b1c');q.fillStyle=grad;q.fillRect(0,0,256,512);q.strokeStyle='#f6c55d';q.lineWidth=5;for(let x=18;x<256;x+=44){q.beginPath();q.moveTo(x,0);q.bezierCurveTo(x+20,130,x-16,290,x+12,512);q.stroke()}for(let y=50;y<512;y+=86){q.strokeStyle='#ffdd8a';q.lineWidth=2;q.beginPath();for(let x=0;x<256;x+=8){const yy=y+Math.sin(x/15)*8;if(x===0)q.moveTo(x,yy);else q.lineTo(x,yy)}q.stroke()}const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t}
const silk=new THREE.MeshStandardMaterial({map:silkTexture(),roughness:.64,metalness:.12,side:THREE.DoubleSide});
const pearl=new THREE.MeshStandardMaterial({color:0xffe5a5,metalness:.65,roughness:.3});
const skinShade=new THREE.MeshStandardMaterial({color:0xb8b3ae,roughness:.86});const ghostWhite=new THREE.MeshStandardMaterial({color:0xc9c5bd,roughness:.82});const eyeIvory=new THREE.MeshStandardMaterial({color:0xded8ce,roughness:.67});const ghostBlack=new THREE.MeshStandardMaterial({color:0x20161b,roughness:.68});const ghostRed=new THREE.MeshStandardMaterial({color:0x6f2634,roughness:.66});
const hair=new THREE.MeshStandardMaterial({color:0x201728,roughness:.72});
function makeDancer(){const g=new THREE.Group();
const profile=[[0,0],[.65,0],[.93,.13],[.82,.45],[.65,.85],[.46,1.35],[.32,1.78],[.31,1.95]].map(p=>new THREE.Vector2(...p));
const dress=part(g,new THREE.Mesh(new THREE.LatheGeometry(profile,32),silk));dress.position.y=.04;
const sash=part(g,new THREE.Mesh(new THREE.TorusGeometry(.38,.055,7,32),pearl));sash.rotation.x=Math.PI/2;sash.position.y=1.92;
const torso=part(g,new THREE.Mesh(new THREE.SphereGeometry(1,18,14),new THREE.MeshStandardMaterial({color:0x542635,roughness:.85})));torso.scale.set(.43,.66,.28);torso.position.y=2.38;
for(const side of [-1,1]){const ep=part(g,ball(.22,pearl,side*.36,2.69,0));ep.scale.set(1.3,.65,1.3)}
const neck=part(g,new THREE.Mesh(new THREE.CylinderGeometry(.14,.15,.25,12),skinShade));neck.position.y=3.03;
// Head is a separate lightweight pivot so the spirit can track the passing player.
const headStart=g.children.length;
const face=part(g,new THREE.Mesh(new THREE.SphereGeometry(.44,24,18),ghostWhite));face.scale.set(.85,1.14,.76);face.position.set(0,3.4,.05);
const bun=part(g,ball(.42,hair,0,3.61,-.19));bun.scale.set(.95,.85,.8);
const fringe=part(g,ball(.33,hair,0,3.73,.16));fringe.scale.set(1.05,.32,.85);
// Smaller, shaded eyes and eyelids replace the oversized cartoon stare.
for(const side of [-1,1]){
 const eye=part(g,ball(.085,eyeIvory,side*.17,3.44,.352));eye.scale.set(1.12,.58,.38);
 const iris=part(g,ball(.045,ghostBlack,side*.17,3.44,.386));iris.scale.set(.84,1,.45);
 rod(g,[side*.075,3.495,.36],[side*.255,3.485,.35],.022,ghostBlack);
 rod(g,[side*.085,3.59,.335],[side*.27,3.6,.31],.027,ghostBlack);
 part(g,ball(.065,pearl,side*.34,3.26,.1));
}
const nose=part(g,new THREE.Mesh(new THREE.ConeGeometry(.065,.16,8),ghostWhite));nose.rotation.x=Math.PI/2;nose.position.set(0,3.29,.37);
const lips=part(g,ball(.095,ghostRed,0,3.18,.36));lips.scale.set(1.45,.36,.32);
const headdress=part(g,new THREE.Mesh(new THREE.CylinderGeometry(.19,.38,.32,16),pearl));headdress.position.y=3.98;
for(let i=0;i<5;i++){const tip=part(g,new THREE.Mesh(new THREE.ConeGeometry(.12,.62+(2-Math.abs(i-2))*.18,9),pearl));tip.position.set((i-2)*.17,4.35+(2-Math.abs(i-2))*.09,0)}
for(const side of [-1,1]){const curl=part(g,new THREE.Mesh(new THREE.TorusGeometry(.22,.045,8,20,Math.PI*1.35),pearl));curl.position.set(side*.31,4.02,.12);curl.rotation.z=side*.3}
const headPivot=new THREE.Group();headPivot.position.y=3.1;
for(const piece of g.children.slice(headStart)){g.remove(piece);piece.position.y-=3.1;headPivot.add(piece)}
g.add(headPivot);
const arms=[];for(const side of [-1,1]){
 const pivot=new THREE.Group();pivot.position.set(side*.39,2.68,0);g.add(pivot);
 rod(pivot,[0,0,0],[side*.44,-.08,.2],.12,skinShade);
 rod(pivot,[side*.44,-.08,.2],[side*.63,.33,.42],.095,skinShade);
 const hand=part(pivot,ball(.14,skinShade,side*.63,.36,.43));hand.scale.set(.8,1.5,.5);
 for(let i=0;i<3;i++)rod(pivot,[side*.6,.43,.43],[side*(.65+i*.045),.59+i*.04,.43],.022,skinShade);
 part(pivot,ball(.14,pearl,side*.45,-.08,.2));
 if(side===1){const palm=part(pivot,new THREE.Mesh(new THREE.BoxGeometry(.24,.30,.065),skinShade));palm.position.set(.63,.44,.5);palm.rotation.z=-.12;}
 arms.push(pivot)}
g.userData.danceArms=arms;g.userData.danceHead=headPivot;g.userData.dance=true;return g}
// AI-generated GLB: remote preview asset. Replace with a permanent repo-hosted asset for release.
const DANCER_GLB='https://v3b.fal.media/files/b/0aaedcc4/8RK96n7S6Aiz1KkcI1Z6Q_model.glb';
let dancerTemplate=null,dancerLoading=false,dancerAttempted=false;
function loadDancerAsset(){
 if(dancerAttempted)return;
 dancerAttempted=true;dancerLoading=true;
 new GLTFLoader().load(DANCER_GLB,glb=>{
  try{
   const root=glb.scene;
   if(!root)throw Error('Dancer GLB has no scene');
   let triangles=0,meshCount=0,drawCalls=0;
   const textures=new Set();
   const textureKeys=['map','normalMap','roughnessMap','metalnessMap','emissiveMap','aoMap','alphaMap','bumpMap'];
   root.traverse(obj=>{
    if(!obj.isMesh)return;
    meshCount++;obj.frustumCulled=true;
    const geometry=obj.geometry,positions=geometry?.getAttribute('position');
    if(!positions||positions.count<3)throw Error('Dancer GLB invalid mesh');
    const count=geometry.getIndex()?.count||positions.count;
    triangles+=count/3;
    const mats=Array.isArray(obj.material)?obj.material:[obj.material];
    drawCalls+=mats.length>1&&geometry.groups.length?geometry.groups.length:1;
    for(const material of mats)if(material)for(const key of textureKeys)if(material[key])textures.add(material[key]);
   });
   if(!meshCount||meshCount>(mobile?85:180)||drawCalls>(mobile?90:180)||!Number.isFinite(triangles)||triangles>(mobile?150000:300000))throw Error('Dancer GLB exceeds mesh/draw/triangle budget');
   if(textures.size>(mobile?18:32))throw Error('Dancer GLB exceeds texture count budget');
   const maxEdge=mobile?512:768,textureSizes=[],resized=new Map();
   let texels=0;
   for(const tex of textures){
    const img=tex.image;if(!img)continue;
    const w=img.width,h=img.height;
    if(!Number.isFinite(w)||!Number.isFinite(h)||w<1||h<1)throw Error('Dancer GLB invalid texture');
    const ratio=Math.min(1,maxEdge/Math.max(w,h));
    const tw=Math.max(1,Math.round(w*ratio)),th=Math.max(1,Math.round(h*ratio));
    texels+=tw*th;textureSizes.push({tex,img,w,h,tw,th});
   }
   if(texels>(mobile?6500000:16000000))throw Error('Dancer GLB exceeds texture budget');
   for(const {tex,img,w,h,tw,th} of textureSizes){
    if(w<=maxEdge&&h<=maxEdge)continue;
    let canvas=resized.get(img);
    if(!canvas){
     canvas=document.createElement('canvas');canvas.width=tw;canvas.height=th;
     const ctx=canvas.getContext('2d');if(!ctx)throw Error('Dancer GLB resize unavailable');
     ctx.drawImage(img,0,0,tw,th);resized.set(img,canvas);
    }
    tex.image=canvas;tex.needsUpdate=true;
   }
   root.updateMatrixWorld(true);
   const bounds=new THREE.Box3().setFromObject(root),size=bounds.getSize(new THREE.Vector3());
   if(!Number.isFinite(size.y)||size.y<=.001)throw Error('Invalid dancer model bounds');
   const center=bounds.getCenter(new THREE.Vector3());
   root.position.sub(center);root.position.y+=size.y/2;
   const normalized=new THREE.Group();normalized.add(root);normalized.scale.setScalar(4.25/size.y);
   dancerTemplate=normalized;
   console.info('Optional detailed dancer ready', {triangles:Math.round(triangles),meshCount,drawCalls});
  }catch(error){console.warn('Dancer GLB rejected; retaining animated procedural fallback',error)}
  finally{dancerLoading=false}
 },undefined,error=>{console.warn('Dancer GLB unavailable; retaining animated procedural fallback',error);dancerLoading=false});
}
// Premium AI-generated Thai Yaksha; fallback stays available on slow connections.
const YAKSHA_GLB='https://v3b.fal.media/files/b/0aaedd6a/14yrGJ3Iq8XcawwVvTolz_model.glb';
let yakshaTemplate=null,yakshaAttempted=false;
function loadYakshaAsset(){
 if(yakshaAttempted)return;
 yakshaAttempted=true;
 new GLTFLoader().load(YAKSHA_GLB,glb=>{
  try{
   const root=glb.scene;
   if(!root)throw Error('Yaksha GLB has no scene');
   // Validate the complete rig and PBR texture budget before allocating resize canvases.
   // A preview GLB must never overwhelm mobile Safari or remove the playable guardian.
   let triangles=0,meshCount=0,drawCalls=0;
   const textures=new Set();
   const textureKeys=['map','normalMap','roughnessMap','metalnessMap','emissiveMap','aoMap','alphaMap','bumpMap','clearcoatMap','clearcoatNormalMap','clearcoatRoughnessMap'];
   root.traverse(o=>{
    if(!o.isMesh)return;
    meshCount++;o.frustumCulled=true;
    const geometry=o.geometry,positions=geometry?.getAttribute('position');
    if(!positions||positions.count<3)throw Error('Yaksha GLB invalid mesh');
    const count=geometry.getIndex()?.count||positions.count;
    if(!Number.isFinite(count)||count<3)throw Error('Yaksha GLB invalid geometry');
    triangles+=count/3;
    const materials=Array.isArray(o.material)?o.material:[o.material];
    drawCalls+=materials.length>1&&geometry.groups.length?geometry.groups.length:1;
    for(const material of materials)if(material){
     for(const key of textureKeys)if(material[key])textures.add(material[key]);
    }
   });
   if(!meshCount||meshCount>(mobile?80:160)||drawCalls>(mobile?90:180)||
      !Number.isFinite(triangles)||triangles>(mobile?200000:400000))
    throw Error('Yaksha GLB exceeds mesh/draw/triangle budget');
   if(textures.size>(mobile?18:32))throw Error('Yaksha GLB exceeds texture count budget');
   const maxEdge=mobile?512:1024,textureSizes=[];
   let texels=0;
   for(const tex of textures){
    const img=tex.image;
    if(!img)continue;
    const w=img.width,h=img.height;
    if(!Number.isFinite(w)||!Number.isFinite(h)||w<1||h<1)
     throw Error('Yaksha GLB invalid texture dimensions');
    const scale=Math.min(1,maxEdge/Math.max(w,h));
    const tw=Math.max(1,Math.round(w*scale)),th=Math.max(1,Math.round(h*scale));
    texels+=tw*th;textureSizes.push({tex,img,w,h,tw,th});
   }
   if(texels>(mobile?6500000:16000000))
    throw Error('Yaksha GLB exceeds texture memory budget');
   // Reuse resized images across normal/albedo/roughness maps when they share a source.
   // Preserve each texture's color space and sampler settings.
   const resized=new Map();
   for(const {tex,img,w,h,tw,th} of textureSizes){
    if(w<=maxEdge&&h<=maxEdge)continue;
    let canvas=resized.get(img);
    if(!canvas){
     canvas=document.createElement('canvas');canvas.width=tw;canvas.height=th;
     const ctx=canvas.getContext('2d');
     if(!ctx)throw Error('Yaksha GLB texture resize unavailable');
     ctx.drawImage(img,0,0,tw,th);
     resized.set(img,canvas);
    }
    tex.image=canvas;tex.needsUpdate=true;
   }
   root.updateMatrixWorld(true);
   const box=new THREE.Box3().setFromObject(root),sz=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
   if(!Number.isFinite(sz.y)||sz.y<=0)throw Error('Invalid yaksha geometry');
   root.position.sub(center);root.position.y+=sz.y/2;
   const group=new THREE.Group();group.add(root);group.scale.setScalar(4.8/sz.y);
   yakshaTemplate=group;
   console.info('Detailed Yaksha ready for future spawns',{triangles:Math.round(triangles),meshCount,drawCalls,textures:textures.size});
  }catch(error){console.warn('Yaksha fallback retained',error)}
 },undefined,error=>console.warn('Yaksha GLB unavailable; keeping playable guardian',error));
}
// Optional preview GLBs must not compete with the first playable frame.
// Load the vehicle after play starts; desktop character GLBs are staggered.
// Mobile requests detailed dancers only after gameplay progress, with strict budgets and fallbacks.
let optionalModelsQueued=false;
function queueOptionalModels(){
 if(optionalModelsQueued)return;
 optionalModelsQueued=true;
 if(navigator.connection?.saveData){
  console.info('Data saver enabled; keeping lightweight procedural GLB fallbacks');
  return;
 }
 setTimeout(loadTukTukAsset,1800);
 if(!mobile){
  setTimeout(loadDancerAsset,5200);
  setTimeout(loadYakshaAsset,8600);
 }
}
// Rama II falling debris: fractured concrete, weathered aggregate and exposed rebar.
// Shared 128px PBR albedo; geometry is built only once through obstacleTemplates.
const ramaDebrisCanvas=document.createElement('canvas');
ramaDebrisCanvas.width=ramaDebrisCanvas.height=128;
const ramaDebrisCtx=ramaDebrisCanvas.getContext('2d');
ramaDebrisCtx.fillStyle='#9e9c95';ramaDebrisCtx.fillRect(0,0,128,128);
for(let i=0;i<1700;i++){
 const px=(i*73+Math.floor(i/13)*19)%128,py=(i*41+Math.floor(i/11)*31)%128;
 ramaDebrisCtx.fillStyle=i%5===0?'rgba(42,40,35,.23)':i%3===0?'rgba(243,239,227,.24)':'rgba(82,77,67,.12)';
 ramaDebrisCtx.fillRect(px,py,1+i%3,1+i%2);
}
ramaDebrisCtx.strokeStyle='rgba(55,52,46,.35)';ramaDebrisCtx.lineWidth=1;
for(let i=0;i<5;i++){
 ramaDebrisCtx.beginPath();ramaDebrisCtx.moveTo((i*29+9)%128,0);
 ramaDebrisCtx.lineTo((i*29+17)%128,46);ramaDebrisCtx.lineTo((i*29+7)%128,128);ramaDebrisCtx.stroke();
}
const ramaDebrisTexture=new THREE.CanvasTexture(ramaDebrisCanvas);
ramaDebrisTexture.colorSpace=THREE.SRGBColorSpace;
ramaDebrisTexture.anisotropy=mobile?2:4;
const ramaDebrisConcrete=new THREE.MeshStandardMaterial({map:ramaDebrisTexture,color:0xffffff,roughness:.94,metalness:0,side:THREE.DoubleSide});
const ramaDebrisRebar=new THREE.MeshStandardMaterial({color:0x6c5446,roughness:.83,metalness:.68});
const obstacleTemplates={};
function makeConstructionDebris(){
 const g=new THREE.Group();
 // Irregular broken outline keeps the same 2.6m-wide collision silhouette.
 const outline=new THREE.Shape();
 const perimeter=[[-1.24,-.58],[-.92,-.74],[-.38,-.64],[.14,-.77],[.67,-.61],[1.29,-.7],[1.2,-.19],[1.33,.26],[1.1,.68],[.41,.62],[-.23,.77],[-.82,.57],[-1.3,.3]];
 perimeter.forEach(([px,pz],i)=>i?outline.lineTo(px,pz):outline.moveTo(px,pz));
 outline.closePath();
 const slabGeometry=new THREE.ExtrudeGeometry(outline,{depth:.68,steps:1,bevelEnabled:true,bevelThickness:.035,bevelSize:.035,bevelSegments:1,curveSegments:1});
 slabGeometry.rotateX(-Math.PI/2);
 const slab=new THREE.Mesh(slabGeometry,ramaDebrisConcrete);slab.position.y=.09;g.add(slab);
 // Low-profile reflective survey markings make broken concrete readable in
 // headlight-only stages. One shared PBR draw per debris clone, no new assets.
 // Keep the markings within the slab footprint: collision geometry is unchanged.
 const tapePositions=[],tapeColors=[],tapeIndices=[];
 const tapeAmber=new THREE.Color(0xe6b44e),tapeWhite=new THREE.Color(0xd8dee2);
 for(let i=0;i<perimeter.length;i++){
  const a=perimeter[i],b=perimeter[(i+1)%perimeter.length];
  const color=i%2?tapeWhite:tapeAmber,base=tapePositions.length/3;
  for(const [point,scale] of [[a,.96],[b,.96],[b,.84],[a,.84]]){
   tapePositions.push(point[0]*scale,.805,-point[1]*scale);
   tapeColors.push(color.r,color.g,color.b);
  }
  tapeIndices.push(base,base+1,base+2,base,base+2,base+3);
 }
 const tapeGeometry=new THREE.BufferGeometry();
 tapeGeometry.setAttribute('position',new THREE.Float32BufferAttribute(tapePositions,3));
 tapeGeometry.setAttribute('color',new THREE.Float32BufferAttribute(tapeColors,3));
 tapeGeometry.setIndex(tapeIndices);
 tapeGeometry.computeVertexNormals();
 const tapeMaterial=new THREE.MeshStandardMaterial({
  vertexColors:true,roughness:.32,metalness:.03,
  emissive:0x16140f,emissiveIntensity:.24,side:THREE.DoubleSide
 });
 g.add(new THREE.Mesh(tapeGeometry,tapeMaterial));
 // Bent reinforcement protrudes through the shattered edge; one instanced draw.
 const rebar=new THREE.InstancedMesh(new THREE.CylinderGeometry(.033,.033,.8,6),ramaDebrisRebar,6);
 const dummy=new THREE.Object3D();
 for(let i=0;i<6;i++){
  const side=i<3?-1:1,j=i%3;
  dummy.position.set(side*(.42+j*.3),.82,(j-1)*.35);
  dummy.rotation.set(.25*(j-1),0,side*(.2+j*.19));
  dummy.scale.set(1,1,1);dummy.updateMatrix();rebar.setMatrixAt(i,dummy.matrix);
 }
 rebar.instanceMatrix.needsUpdate=true;rebar.computeBoundingSphere();g.add(rebar);
 // Chipped fragments break the smooth rectangular silhouette without extra materials.
 const chips=new THREE.InstancedMesh(new THREE.TetrahedronGeometry(.15,0),ramaDebrisConcrete,6);
 for(let i=0;i<6;i++){
  dummy.position.set((i-2.5)*.42,.18+(i%3)*.08,i%2?.7:-.68);
  dummy.rotation.set(i*.7,i*.37,i*.23);
  dummy.scale.set(1+(i%3)*.3,.65+(i%2)*.4,.9);dummy.updateMatrix();chips.setMatrixAt(i,dummy.matrix);
 }
 chips.instanceMatrix.needsUpdate=true;chips.computeBoundingSphere();g.add(chips);
 return g;
}
// Rama II police checkpoint: cones, wheeled red barricades and traffic officers.
// Reflective Rama II diversion panel: Thai lettering and high-vis chevrons are
// baked into one shared 512x160 atlas, avoiding dozens of separate sign meshes.
const checkpointWarningCanvas=document.createElement('canvas');
checkpointWarningCanvas.width=512;checkpointWarningCanvas.height=160;
const checkpointWarningCtx=checkpointWarningCanvas.getContext('2d');
const warningPaint=checkpointWarningCtx.createLinearGradient(0,0,0,160);
warningPaint.addColorStop(0,'#f8b548');warningPaint.addColorStop(.5,'#ed8b23');warningPaint.addColorStop(1,'#a9561b');
checkpointWarningCtx.fillStyle=warningPaint;checkpointWarningCtx.fillRect(0,0,512,160);
checkpointWarningCtx.fillStyle='#161b20';
for(const side of [0,1]){
 const offset=side?432:0;
 checkpointWarningCtx.save();checkpointWarningCtx.beginPath();
 checkpointWarningCtx.rect(offset,0,80,160);checkpointWarningCtx.clip();
 for(let x=-150;x<200;x+=42){
  checkpointWarningCtx.beginPath();
  checkpointWarningCtx.moveTo(offset+x,0);
  checkpointWarningCtx.lineTo(offset+x+24,0);
  checkpointWarningCtx.lineTo(offset+x+112,160);
  checkpointWarningCtx.lineTo(offset+x+88,160);
  checkpointWarningCtx.closePath();checkpointWarningCtx.fill();
 }
 checkpointWarningCtx.restore();
}
checkpointWarningCtx.fillStyle='#24282b';checkpointWarningCtx.fillRect(83,12,346,136);
checkpointWarningCtx.strokeStyle='#f8db81';checkpointWarningCtx.lineWidth=4;
checkpointWarningCtx.strokeRect(89,18,334,124);
checkpointWarningCtx.textAlign='center';checkpointWarningCtx.textBaseline='middle';
checkpointWarningCtx.fillStyle='#fff1c4';
checkpointWarningCtx.font='bold 57px sans-serif';
checkpointWarningCtx.fillText('ทางเบี่ยง',256,69,312);
checkpointWarningCtx.fillStyle='#ffbf63';
checkpointWarningCtx.font='bold 29px sans-serif';
checkpointWarningCtx.fillText('ลดความเร็ว',256,117,300);
const checkpointWarningTexture=new THREE.CanvasTexture(checkpointWarningCanvas);
checkpointWarningTexture.colorSpace=THREE.SRGBColorSpace;
checkpointWarningTexture.anisotropy=mobile?2:4;
const checkpointWarningMaterial=new THREE.MeshStandardMaterial({
 map:checkpointWarningTexture,metalness:.04,roughness:.43,
 emissive:0x4b2c0b,emissiveIntensity:.22,side:THREE.DoubleSide
});
const checkpointWarningGeometry=new THREE.PlaneGeometry(2.45,.76);
const checkpointConeReflectorMaterial=new THREE.MeshStandardMaterial({
 color:0xf6f2da,metalness:.04,roughness:.33,
 emissive:0x37372b,emissiveIntensity:.22,side:THREE.DoubleSide
});
const checkpointConeReflectorGeometry=new THREE.CylinderGeometry(.16,.19,.14,10,1,true);
function makeCheckpoint(){
 const g=new THREE.Group();
 const red=mat(0xd62828),white=mat(0xf0eee7),orange=mat(0xff681e),uniform=mat(0xa48b6a),vest=mat(0xd2ed45),black=mat(0x222b32);
 for(const x of [-1.65,1.65]){
  const cone=part(g,new THREE.Mesh(new THREE.ConeGeometry(.27,.95,8),orange));cone.position.set(x,.5,.1);
  part(g,cube(.38,.1,.38,white,x,.2,.1));
 }
 // Two reflective collars on each cone share one geometry and one draw call.
 const collars=new THREE.InstancedMesh(checkpointConeReflectorGeometry,checkpointConeReflectorMaterial,4);
 const collarPose=new THREE.Object3D();
 let collarIndex=0;
 for(const x of [-1.65,1.65])for(const [height,scale] of [[.42,1],[.65,.61]]){
  collarPose.position.set(x,height,.1);collarPose.rotation.set(0,0,0);
  collarPose.scale.set(scale,scale,scale);collarPose.updateMatrix();
  collars.setMatrixAt(collarIndex++,collarPose.matrix);
 }
 collars.instanceMatrix.needsUpdate=true;collars.computeBoundingSphere();g.add(collars);
 // Keep the existing physical barrier footprint and dodge space unchanged.
 for(const z of [-.25,.25])part(g,cube(2.55,.09,.08,red,0,.9,z));
 for(const x of [-1.25,1.25])part(g,cube(.09,1.25,.1,red,x,.64,0));
 const warningPanel=new THREE.Mesh(checkpointWarningGeometry,checkpointWarningMaterial);
 warningPanel.position.set(0,1.04,.345);g.add(warningPanel);
 for(const x of [-1.16,1.16])for(const z of [-.28,.28])part(g,ball(.14,black,x,.16,z));
 // Two human-proportioned roadside officers replace box-figure silhouettes.
 // Rounded uniforms, tapered limbs, skin, boots and retroreflective vest bands
 // share five instanced draws for both officers; no per-frame animation or GLB.
 // Keep all parts outside the centre barricade's original collision footprint.
 const officerCylinder=new THREE.CylinderGeometry(.5,.5,1,10);
 const officerSphere=new THREE.SphereGeometry(.5,10,8);
 const officerStripe=new THREE.BoxGeometry(1,1,1);
 const officerSkin=new THREE.MeshStandardMaterial({color:0xb78d73,roughness:.94,metalness:0});
 const officerReflector=new THREE.MeshStandardMaterial({
  color:0xf2eee0,roughness:.32,metalness:.03,
  emissive:0x4c4831,emissiveIntensity:.35
 });
 const uniforms=[],vests=[],darkParts=[],skinParts=[],stripes=[];
 for(const x of [-2.15,2.15]){
  // Body and sleeves slope naturally from the shoulders.
  uniforms.push([x,1.35,-.6,.39,.68,.29,0]);
  vests.push([x,1.48,-.6,.43,.38,.33,0]);
  skinParts.push([x,1.9,-.6,.42,.45,.41,0]);
  for(const side of [-1,1]){
   uniforms.push([x+side*.31,1.32,-.6,.16,.57,.17,side*.15]);
   skinParts.push([x+side*.38,1.015,-.6,.15,.19,.15,0]);
   darkParts.push([x+side*.13,.69,-.6,.17,.73,.19,side*.035]);
   darkParts.push([x+side*.13,.28,-.47,.19,.16,.34,0]);
  }
  // Low-profile police cap and brim; no floating cube above the head.
  darkParts.push([x,2.15,-.6,.44,.12,.37,0]);
  darkParts.push([x,2.195,-.6,.34,.18,.32,0]);
  // Horizontal retroreflective bands are visible under Rama II headlights.
  for(const y of [1.40,1.58])stripes.push([x,y,-.773,.77,.045,.018,0]);
 }
 const addOfficerInstances=(geometry,material,parts)=>{
  const mesh=new THREE.InstancedMesh(geometry,material,parts.length);
  const pose=new THREE.Object3D();
  parts.forEach(([px,py,pz,sx,sy,sz,angle],index)=>{
   pose.position.set(px,py,pz);pose.rotation.set(0,0,angle);
   pose.scale.set(sx,sy,sz);pose.updateMatrix();mesh.setMatrixAt(index,pose.matrix);
  });
  mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();g.add(mesh);
 };
 addOfficerInstances(officerCylinder,uniform,uniforms);
 addOfficerInstances(officerCylinder,vest,vests);
 addOfficerInstances(officerCylinder,black,darkParts);
 addOfficerInstances(officerSphere,officerSkin,skinParts);
 addOfficerInstances(officerStripe,officerReflector,stripes);
 return g
}
// Rama II cargo truck: large Thai-style six-wheeler with cargo box and rear safety stripes.
function makeTruck(){
 const g=new THREE.Group();
 // Rama II six-wheeler: PBR tail/marker lamps and reflective strips retain
 // a small night-time glow, while the cargo box stays mostly unlit.
 // Reuse existing meshes/materials: zero additional lights or draw calls.
 // Sloped stamped-metal cab, corrugated freight box and
 // rear safety fittings. This is the local, playable fallback (no GLB download).
 // cachedObstacle('truck') builds it once; clones share geometry and PBR maps.
 const cabPaint=new THREE.MeshPhysicalMaterial({color:0xe7e3d7,metalness:.24,roughness:.55,clearcoat:.3,clearcoatRoughness:.38});
 const chassis=new THREE.MeshStandardMaterial({color:0x252b30,metalness:.48,roughness:.77});
 const rubber=new THREE.MeshStandardMaterial({color:0x1d2328,metalness:0,roughness:.95});
 const glass=new THREE.MeshPhysicalMaterial({color:0x34566b,metalness:.18,roughness:.24,clearcoat:.72,clearcoatRoughness:.17,side:THREE.DoubleSide});
 const red=new THREE.MeshStandardMaterial({color:0xa92524,metalness:.1,roughness:.48,emissive:0x690a07,emissiveIntensity:.68});
 const amber=new THREE.MeshStandardMaterial({color:0xd99a32,metalness:.08,roughness:.43,emissive:0x693006,emissiveIntensity:.52});
 const reflector=new THREE.MeshStandardMaterial({color:0xe4dfca,metalness:.05,roughness:.38,emissive:0x5e4d30,emissiveIntensity:.65});
 // One 256px atlas for ribbed aluminium, grime and worn paint. No per-frame work.
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
 const ctx=canvas.getContext('2d');
 ctx.fillStyle='#b4b8b3';ctx.fillRect(0,0,256,256);
 for(let x=0;x<256;x+=15){
  ctx.fillStyle='rgba(34,43,48,.28)';ctx.fillRect(x,0,2,256);
  ctx.fillStyle='rgba(245,246,238,.4)';ctx.fillRect(x+3,0,3,256);
  ctx.fillStyle='rgba(90,100,104,.11)';ctx.fillRect(x+8,0,5,256);
 }
 const grime=ctx.createLinearGradient(0,0,0,256);
 grime.addColorStop(0,'rgba(38,44,44,.12)');
 grime.addColorStop(.55,'rgba(44,42,38,0)');
 grime.addColorStop(1,'rgba(60,53,41,.37)');
 ctx.fillStyle=grime;ctx.fillRect(0,0,256,256);
 for(let i=0;i<90;i++){
  const px=(i*47+13*i*i)%256,py=(i*83+17*i*i)%256;
  ctx.fillStyle=i%3?'rgba(60,58,50,.12)':'rgba(245,240,222,.19)';
  ctx.fillRect(px,py,2+i%4,2+i%3);
 }
 const cargoMap=new THREE.CanvasTexture(canvas);cargoMap.colorSpace=THREE.SRGBColorSpace;
 cargoMap.anisotropy=Math.min(2,renderer.capabilities.getMaxAnisotropy());
 // Baked tangent-space corrugation normals give the aluminium box ribbed
 // highlights under headlights. One tiny texture shared by the cached truck,
 // no new meshes, lights, draw calls or animation-loop work.
 const ribNormalCanvas=document.createElement('canvas');ribNormalCanvas.width=ribNormalCanvas.height=256;
 const ribNormalCtx=ribNormalCanvas.getContext('2d');
 for(let x=0;x<256;x++){
  const slope=Math.cos((x%15)/15*Math.PI*2)*.34;
  const nx=Math.max(-1,Math.min(1,slope));
  const nz=Math.sqrt(1-nx*nx);
  ribNormalCtx.fillStyle='rgb('+Math.round(128+127*nx)+',128,'+Math.round(128+127*nz)+')';
  ribNormalCtx.fillRect(x,0,1,256);
 }
 const ribNormalMap=new THREE.CanvasTexture(ribNormalCanvas);
 ribNormalMap.anisotropy=Math.min(2,renderer.capabilities.getMaxAnisotropy());
 const cargoPaint=new THREE.MeshStandardMaterial({map:cargoMap,normalMap:ribNormalMap,normalScale:new THREE.Vector2(.45,.45),color:0xd7d9d5,metalness:.35,roughness:.73,emissive:0x141719,emissiveIntensity:.22});
 g.add(cube(2.55,.26,6.25,chassis,0,.92,-.05));
 // Freight compartment ends at z=-3.05; the front cab extends to z=3.08.
 g.add(cube(2.5,2.45,3.8,cargoPaint,0,2.32,-1.15));
 for(const side of [-1,1]){
  g.add(cube(.065,.11,3.9,chassis,side*1.29,1.13,-1.15));
  g.add(cube(.075,.09,3.85,reflector,side*1.30,3.51,-1.15));
 }
 // The cabin is extruded from a raked profile rather than stacked toy boxes.
 const outline=new THREE.Shape();
 const profile=[[1.02,1.09],[3.06,1.09],[3.06,1.91],[2.77,2.87],[1.31,2.87],[1.02,2.63]];
 profile.forEach(([z,y],i)=>i?outline.lineTo(-z,y):outline.moveTo(-z,y));
 outline.closePath();
 const cabGeometry=new THREE.ExtrudeGeometry(outline,{depth:2.36,steps:1,bevelEnabled:true,bevelThickness:.045,bevelSize:.045,bevelSegments:1});
 const cabShell=new THREE.Mesh(cabGeometry,cabPaint);cabShell.rotation.y=Math.PI/2;cabShell.position.x=-1.18;g.add(cabShell);
 const windshield=new THREE.Mesh(new THREE.PlaneGeometry(2.11,.76),glass);
 windshield.rotation.x=-.29;windshield.position.set(0,2.37,2.91);g.add(windshield);
 // Side glazing follows the cabin rake; the mirrored panes share geometry.
 const windowShape=new THREE.Shape();
 windowShape.moveTo(-.52,0);windowShape.lineTo(.46,0);windowShape.lineTo(.18,.73);windowShape.lineTo(-.51,.73);windowShape.closePath();
 const windowGeometry=new THREE.ShapeGeometry(windowShape);
 for(const side of [-1,1]){
  const pane=new THREE.Mesh(windowGeometry,glass);
  pane.rotation.y=side*Math.PI/2;pane.position.set(side*1.239,1.98,2.26);g.add(pane);
  g.add(cube(.07,.045,.72,chassis,side*1.26,1.96,2.2));
  // Mirror arms and glass sit outside the cab but inside roadside clearances.
  g.add(cube(.31,.035,.04,chassis,side*1.34,2.22,2.89));
  g.add(cube(.21,.3,.08,glass,side*1.48,2.24,2.89));
 }
 // One instanced draw for all six PBR wheels, including the rear tandem axle.
 const wheels=new THREE.InstancedMesh(busWheelGeometry,busWheelMaterial,6);
 const wheelPose=new THREE.Object3D();wheelPose.rotation.z=Math.PI/2;
 let wi=0;
 for(const side of [-1,1])for(const z of [-2.45,-1.12,2.21]){
  wheelPose.position.set(side*1.33,.53,z);wheelPose.scale.set(1.08,1.1,1.08);
  wheelPose.updateMatrix();wheels.setMatrixAt(wi++,wheelPose.matrix);
 }
 wheels.instanceMatrix.needsUpdate=true;wheels.computeBoundingSphere();g.add(wheels);
 // Rear cargo doors, locking bars and reflective hazard chevrons face the player.
 const doors=new THREE.Mesh(new THREE.PlaneGeometry(2.32,2.23),cargoPaint);
 doors.rotation.y=Math.PI;doors.position.set(0,2.37,-3.065);g.add(doors);
 for(const x of [-.53,.53])g.add(cube(.047,1.95,.055,chassis,x,2.36,-3.12));
 g.add(cube(.035,2.22,.055,chassis,0,2.37,-3.13));
 g.add(cube(2.45,.19,.18,chassis,0,.91,-3.12));
 for(const side of [-1,1]){
  g.add(cube(.31,.18,.07,red,side*.96,1.17,-3.17));
  g.add(cube(.25,.11,.075,amber,side*.96,1.33,-3.17));
  g.add(cube(.45,.1,.055,reflector,side*.85,.91,-3.22));
 }
 // Front bumper, grille and headlamps: no real-time lights or extra textures.
 g.add(cube(2.35,.23,.13,chassis,0,1.15,3.12));
 g.add(cube(1.12,.36,.055,rubber,0,1.52,3.12));
 for(const side of [-1,1]){
  g.add(cube(.36,.19,.07,reflector,side*.88,1.66,3.14));
  g.add(cube(.15,.14,.07,amber,side*1.12,1.63,3.14));
 }
 return g;
}
// Camera-distance traffic LOD: retain detailed PBR buses/taxis up close, but
// draw only their shared silhouette, glazing and wheels while far down the road.
// THREE.LOD updates in the renderer; no per-frame JS loop or extra downloads.
// The outer hazard transform/collision lane remains unchanged.
function makeTrafficLOD(type){
 const taxi=type==='taxi',blue=type==='busBlue';
 const detailed=taxi?makeTaxi():makeBus(blue?'blue':'red');
 const distant=new THREE.Group();
 // Reuse the exact rounded shell/roof geometry and PBR paint of the near model.
 distant.add(detailed.children[0].clone(),detailed.children[1].clone());
 const wheels=detailed.children.find(child=>child.isInstancedMesh&&child.count===4);
 if(wheels)distant.add(wheels.clone());
 if(taxi){
  const rear=new THREE.Mesh(taxiRearWindshieldGeometry,taxiWindshieldMaterial);
  rear.position.set(0,1.55,-.83);rear.rotation.x=.62;distant.add(rear);
  distant.add(cube(.8,.29,.25,taxiLight,0,2.08,-.07));
 }else{
  for(const side of [-1,1]){
   const pane=new THREE.Mesh(busSidePane,blue?busSideGlazing.blue:busSideGlazing.red);
   pane.rotation.y=side*Math.PI/2;pane.position.set(side*1.495,2.35,0);
   distant.add(pane);
  }
  const rear=new THREE.Mesh(busRearGlassPane,busRearWindowMaterial);
  rear.rotation.y=Math.PI;rear.position.set(0,2.28,-2.748);distant.add(rear);
  const route=new THREE.Mesh(busRoutePane,blue?busRouteSigns.blue:busRouteSigns.red);
  route.rotation.y=Math.PI;route.position.set(0,3.05,-2.805);distant.add(route);
 }
 const lod=new THREE.LOD();
 lod.addLevel(detailed,0,.08);
 lod.addLevel(distant,38,.08);
 return lod;
}
// Three.js clones child transforms but userData references still point to the template.
// Rebind the dancer's head/arms to each spawned copy before animating them.
function clonedObstacleNode(original,copy,node){
 if(!node)return null;
 const path=[];let cursor=node;
 while(cursor&&cursor!==original){if(!cursor.parent)return null;path.unshift(cursor.parent.children.indexOf(cursor));cursor=cursor.parent}
 if(cursor!==original)return null;
 let target=copy;for(const index of path){target=target.children[index];if(!target)return null}
 return target;
}
function cachedObstacle(type){
 // Use the detailed guardian once loaded; share GLB geometry and materials across clones.
 // Limit simultaneous high-detail guardians, especially on iPhone.
 if(type==='yaksha'&&yakshaTemplate){
  const detailedCount=hazards.reduce((count,h)=>count+(h.type==='yaksha'&&h.g.userData.premiumYaksha?1:0),0);
  // One detailed guardian at a time on either platform keeps the GPU budget predictable.
  if(detailedCount<1){
   try{
    // Standard clone(true) does not reliably rebind SkinnedMesh skeletons.
    // Match the dancer pipeline: use SkeletonUtils only when a real rig exists.
    let hasSkin=false;
    yakshaTemplate.traverse(node=>{if(node.isSkinnedMesh)hasSkin=true});
    const detailed=hasSkin?cloneSkinnedScene(yakshaTemplate):yakshaTemplate.clone(true);
    if(!detailed||!detailed.children.length)throw Error('Empty detailed Yaksha clone');
    detailed.userData.premiumYaksha=true;
    return detailed;
   }catch(error){console.warn('Yaksha rig clone failed; keeping procedural guardian',error)}
  }
 }
 if(!obstacleTemplates[type])obstacleTemplates[type]=type==='truck'?makeTruck():type==='checkpoint'?makeCheckpoint():type==='construction'?makeConstructionDebris():type==='durian'?makeDurian():type==='bus'?makeTrafficLOD('bus'):type==='busBlue'?makeTrafficLOD('busBlue'):type==='tuktuk'?makeTukTuk():type==='taxi'?makeTrafficLOD('taxi'):type==='bike'?makeBike():type==='yaksha'?makeYaksha():makeDancer();
 const original=obstacleTemplates[type],copy=original.clone(true);
 if(type==='dancer'){
  copy.userData.danceArms=original.userData.danceArms.map(arm=>clonedObstacleNode(original,copy,arm));
  copy.userData.danceHead=clonedObstacleNode(original,copy,original.userData.danceHead);
 }
 return copy;
}
let bossSpawned=false,bossBeaten=false,eventCount=0,lastEventMeters=-250;let spawnIndex=0;const intro=['tuktuk','taxi','bus','bike','tuktuk','taxi','bus','bike','durian'];function spawn(){if(meters+bonus>=23000){spawnDarkRoadHazard();return;}if(meters+bonus>=16000){spawnPattayaHazard();return;}if(meters+bonus>=12000){spawnExpresswayHazard();return;}if(meters+bonus>=8000){spawnMarketPedestrians();return;}const boss=nightCount>=1&&meters>=3200&&!bossSpawned;if(boss)bossSpawned=true;const chance=Math.random();const eventEligible=!boss&&spawnIndex>=intro.length&&meters>160&&meters-lastEventMeters>85&&Math.random()<.38;const madness=eventEligible?['rollingDurian','cuttingBus','wrongWayBike'][Math.floor(Math.random()*3)]:null;if(madness){eventCount++;lastEventMeters=meters}let type=boss?'yaksha':madness==='rollingDurian'?'durian':madness==='cuttingBus'?'bus':madness==='wrongWayBike'?'bike':spawnIndex<intro.length?intro[spawnIndex]:chance<.10?'construction':chance<.18?'durian':chance<.34?'bus':chance<.47?'yaksha':chance<.59?'dancer':chance<.78?'taxi':chance<.9?'tuktuk':'bike';if(nightCount===0&&(type==='yaksha'||type==='dancer'))type='taxi';if(nightCount>=1&&spawnIndex%9===0)type='yaksha';if(nightCount>=1&&spawnIndex%7===0)type='dancer';if(Math.floor(meters+bonus)<3000&&type==='construction')type='taxi';if(Math.floor(meters+bonus)>=3000&&spawnIndex%3===0)type='construction';if(Math.floor(meters+bonus)>=3000&&spawnIndex%13===5)type='checkpoint';if(Math.floor(meters+bonus)>=3000&&Math.floor(meters+bonus)<8000&&spawnIndex%7===4)type='whiteGhost';if(Math.floor(meters+bonus)>=3000&&Math.floor(meters+bonus)<8000&&spawnIndex%11===6)type='krasue';if(Math.floor(meters+bonus)>=3000&&spawnIndex%8===3)type='truck';if(type==='bus'&&spawnIndex%2===0)type='busBlue';spawnIndex++;const jamFormation=!boss&&!madness&&spawnIndex>intro.length&&spawnIndex%5===0&&(type==='taxi'||type==='tuktuk');const jamLanes=[-3.35,0,3.35];const jamOpenLane=jamFormation?jamLanes[Math.floor(Math.random()*3)]:null;const jamOccupied=jamFormation?jamLanes.filter(v=>v!==jamOpenLane):null;let durianSide=0;if(type==='durian'){durianSide=Math.random()<.5?-1:1;if(storyProps.filter(p=>p.kind==='vendor').length<2)makeRoadsideStory('vendor',durianSide,-65)}// A skinned GLB needs its own correctly rebound bones. Object3D.clone(true)
// copies the skinned mesh without reliably remapping its skeleton to cloned bones.
// Static GLBs keep the cheaper standard clone; either path shares GPU geometry.
function cloneDancerWithRig(){
 if(!dancerTemplate)return null;
 try{
  let hasSkin=false;
  dancerTemplate.traverse(node=>{if(node.isSkinnedMesh)hasSkin=true});
  const copy=hasSkin?cloneSkinnedScene(dancerTemplate):dancerTemplate.clone(true);
  if(!copy||!copy.children.length)throw Error('Empty detailed dancer clone');
  return copy;
 }catch(error){
  console.warn('Detailed dancer rig clone failed; retaining animated fallback',error);
  return null;
 }
}
// Use named humanoid bones when a detailed GLB actually has a rig.
// Preserve each bone's bind/rest rotation; unrigged GLBs keep the warning-hand fallback.
function bindDancerGestureRig(dancer){
 const bones=[];dancer.traverse(node=>{if(node.isBone)bones.push(node)});
 const named=bones.map(bone=>({bone,name:bone.name.toLowerCase().replace(/[^a-z0-9]/g,'')}));
 const arm=named.find(entry=>/(rightupperarm|upperarmr|rupperarm|rightarm|armr)/.test(entry.name)&&!/forearm|lowerarm|hand|finger|twist/.test(entry.name))?.bone||null;
 const forearm=named.find(entry=>/(rightforearm|forearmr|rforearm|rightlowerarm|lowerarmr|rlowerarm)/.test(entry.name)&&!/twist|finger/.test(entry.name))?.bone||null;
 const hand=named.find(entry=>/(righthand|handr|rhand)/.test(entry.name)&&!/finger|thumb|index|middle|ring|pinky/.test(entry.name))?.bone||null;
 const head=named.find(entry=>entry.name.endsWith('head')&&!/headtop|headend|headnub/.test(entry.name))?.bone||null;
 if(!arm&&!head)return null;
 const rig={arm,head,armRest:arm?.quaternion.clone(),headRest:head?.quaternion.clone(),
  armDelta:new THREE.Quaternion(),headDelta:new THREE.Quaternion(),
  armAxis:new THREE.Vector3(0,0,1),headAxis:new THREE.Vector3(0,1,0),
  armPose:null,forearm:null,forearmRest:null,forearmPose:null};
 // Derive the stop gesture from actual bone directions, not a hard-coded local Z
 // rotation. This supports common Mixamo/Blender humanoid rigs with different
 // bind-pose axes. All poses are calculated once, not in the render loop.
 function aimBoneAt(bone,child,targetWorld){
  if(!bone.parent||!child||child.parent!==bone)return null;
  bone.parent.updateWorldMatrix(true,false);
  const restDirection=child.position.clone().applyQuaternion(bone.quaternion);
  if(restDirection.lengthSq()<1e-6)return null;
  const parentWorld=bone.parent.getWorldQuaternion(new THREE.Quaternion());
  const targetParent=targetWorld.clone().applyQuaternion(parentWorld.invert()).normalize();
  return new THREE.Quaternion().setFromUnitVectors(restDirection.normalize(),targetParent).multiply(bone.quaternion.clone());
 }
 if(arm&&forearm?.parent===arm){
  rig.armPose=aimBoneAt(arm,forearm,new THREE.Vector3(.24,.78,.58));
  if(rig.armPose&&hand?.parent===forearm){
   arm.quaternion.copy(rig.armPose);
   arm.updateWorldMatrix(true,true);
   rig.forearmPose=aimBoneAt(forearm,hand,new THREE.Vector3(.12,.58,.82));
   arm.quaternion.copy(rig.armRest);
   arm.updateWorldMatrix(true,true);
   if(rig.forearmPose){rig.forearm=forearm;rig.forearmRest=forearm.quaternion.clone();}
  }
 }
 if(head?.parent){
  head.parent.updateWorldMatrix(true,false);
  rig.headAxis=new THREE.Vector3(0,1,0).applyQuaternion(head.parent.getWorldQuaternion(new THREE.Quaternion()).invert()).normalize();
 }
 return rig;
}
const useDetailedDancer=type==='dancer'&&!!dancerTemplate&&!hazards.some(h=>h.type==='dancer'&&h.g.userData.detailedDancer);
const useDetailedTukTuk=type==='tuktuk'&&!jamFormation&&!!realTukTuk&&!hazards.some(h=>h.type==='tuktuk'&&h.g.userData.detailedTukTuk);
const detailedDancer=useDetailedDancer?cloneDancerWithRig():null;
const g=type==='whiteGhost'?makeDarkRoadGhost():type==='krasue'?makeKrasue():detailedDancer|| (useDetailedTukTuk?realTukTuk.clone(true):cachedObstacle(type));
g.userData.detailedDancer=!!detailedDancer;
if(detailedDancer){
 // Animate the real upper-arm/head bones if the GLB supplies them.
 // Only draw the spectral arm when there is no recognizable right-arm bone.
 const rig=bindDancerGestureRig(g);
 g.userData.danceRig=rig;
 if(!rig?.arm){
  if(!obstacleTemplates.dancer)obstacleTemplates.dancer=makeDancer();
  const gesture=obstacleTemplates.dancer.userData.danceArms[1].clone(true);
  const ghostGestureMaterial=new THREE.MeshStandardMaterial({color:0xc3d4ca,roughness:.86,transparent:true,opacity:.72,depthWrite:false});
  gesture.traverse(o=>{if(o.isMesh)o.material=ghostGestureMaterial});
  gesture.visible=false;g.add(gesture);
  g.userData.danceArms=[null,gesture];g.userData.spectralArm=gesture;
 }
}
g.userData.detailedTukTuk=!!useDetailedTukTuk;g.userData.detailedYaksha=type==='yaksha'&&!!g.userData.premiumYaksha;const lane=jamFormation?jamOccupied[0]:type==='tuktuk'?([-1.1,0,1.1][spawnIndex%3]):type==='durian'?durianSide*3.35:boss?0:madness==='rollingDurian'?(Math.random()<.5?-3.35:3.35):[-3.35,0,3.35][Math.floor(Math.random()*3)];g.position.set(lane,0,type==='tuktuk'&&!jamFormation?-37:-65);if(type==='dancer')g.scale.setScalar(detailedDancer?1:1.55);if(type==='construction'){g.position.y=6;g.scale.setScalar(1.35);}if(type==='yaksha'){
 // Preserve the existing road footprint while allowing the guardian to loom
 // toward the windscreen. This works for both the detailed GLB and fallback.
 const guardianBaseScale=boss?2.3:1.85;
 g.scale.setScalar(guardianBaseScale);
 g.userData.guardianBaseScale=guardianBaseScale;
}if(type==='bus'||type==='busBlue')g.scale.setScalar(1.04);if(type==='taxi')g.scale.setScalar(1.22);if(type==='truck')g.scale.setScalar(1.13);/* GLB is already normalized to road-sized metres; procedural traffic needs a modest scale. */if(type==='tuktuk')g.scale.setScalar(jamFormation?1.75:useDetailedTukTuk?1:1.7);if(type==='bike')g.scale.setScalar(1.6);if(type==='checkpoint')g.scale.setScalar(1.15);if(madness==='rollingDurian')g.scale.setScalar(1.35);if(madness==='wrongWayBike')g.rotation.y=Math.PI;scene.add(g);if(jamFormation){
 // Exactly two aligned, non-swerving vehicles occupy two lanes; the third stays clear.
 const trafficLane=jamOccupied[1],jamType=type==='taxi'?'tuktuk':'taxi';
 const jam=cachedObstacle(jamType);
 jam.position.set(trafficLane,0,-65);
 jam.scale.setScalar(jamType==='taxi'?1.22:1.75);
 scene.add(jam);
 hazards.push({g:jam,type:jamType,madness:null,boss:false,durianSide:0,passed:false,hit:false,phase:0,baseX:trafficLane,announced:false,nearAwarded:false,swerve:0,swerveStart:-100});
}
hazards.push({g,type,madness,boss,durianSide,passed:false,hit:false,phase:Math.random()*6.28,baseX:lane,announced:false,nearAwarded:false,swerve:jamFormation?0:madness==='cuttingBus'?(lane===3.35?-1:lane===-3.35?1:(Math.random()<.5?-1:1)):Math.random()<.6?(Math.random()<.5?-1:1):0,swerveStart:madness==='cuttingBus'?-40:-23-Math.random()*15})}
let fallbackKeySteer=0,fallbackDragSteer=0,fallbackLeft=false,fallbackRight=false;
let paused=false,challengeStage=0,challengeDisplay='',comboTime=0,active=false,meters=0,bonus=0,speed=120,x=0,tilt=0,neutral=null,lastGamma=null,hasMotion=false,smoothed=0,spawnClock=0,inv=0,flips=0,combo=0,misses=0,crashes=0,best=0,last=performance.now(),shake=0,missionDone=false,soundOn=true,audio=null;try{best=Number(localStorage.getItem('bbf-best3d')||0)}catch(e){}
// Screen-space laminated windshield damage: pre-render only on impact/resize, no 3D draw calls.
const windshield=document.createElement('canvas');
windshield.setAttribute('aria-hidden','true');
Object.assign(windshield.style,{position:'fixed',inset:'0',width:'100%',height:'100%',pointerEvents:'none',zIndex:'1'});
document.body.appendChild(windshield);
let windshieldHits=0;
function paintWindshield(){
 const dpr=Math.min(devicePixelRatio||1,1.5),w=Math.max(1,innerWidth),h=Math.max(1,innerHeight);
 windshield.width=Math.round(w*dpr);windshield.height=Math.round(h*dpr);
 const c=windshield.getContext('2d');c.scale(dpr,dpr);
 if(!windshieldHits)return;
 const impactPoints=[[.77,.27],[.25,.40],[.53,.48]];
 for(let k=0;k<Math.min(windshieldHits,3);k++){
  const [px,py]=impactPoints[k],cx=w*px,cy=h*py;
  const radius=Math.min(w,h)*(k===0?.17:k===1?.29:.48);
  c.save();c.lineCap='round';c.lineJoin='round';
  // Radial laminated cracks, subtle double edges, and concentric broken rings.
  for(let ray=0;ray<18+k*9;ray++){
   const angle=ray*2.399963+k*.7;
   const length=radius*(.55+((ray*17+k*11)%13)/21);
   c.beginPath();c.moveTo(cx,cy);
   for(let step=1;step<=5;step++){
    const r=length*step/5,offset=Math.sin(ray*4.3+step*2.7)*radius*.025;
    c.lineTo(cx+Math.cos(angle)*r+Math.cos(angle+Math.PI/2)*offset,cy+Math.sin(angle)*r+Math.sin(angle+Math.PI/2)*offset);
   }
   c.strokeStyle='rgba(5,13,23,.62)';c.lineWidth=2.3;c.stroke();
   c.strokeStyle='rgba(229,244,255,.78)';c.lineWidth=.9;c.stroke();
  }
  for(let ring=1;ring<=3+k;ring++){
   c.beginPath();
   const r=radius*(.14+ring*.15);
   for(let a=0;a<=30;a++){
    const theta=a*Math.PI*2/30,dist=r*(1+.10*Math.sin(theta*9+k*3));
    const xx=cx+Math.cos(theta)*dist,yy=cy+Math.sin(theta)*dist;
    if(a===0)c.moveTo(xx,yy);else c.lineTo(xx,yy);
   }
   c.strokeStyle='rgba(225,240,250,.48)';c.lineWidth=1.1;c.stroke();
  }
  c.restore();
 }
 if(windshieldHits>=3){
  // Final collision: laminated glass fractures into irregular interlocking shards.
  // Draw once on the existing 2D overlay; no per-frame work or WebGL draw calls.
  // Triangulated safety-glass fragments: irregular facets instead of a toy-like square grid.
  // Deterministic shared edge vertices prevent gaps and keep the overlay cheap on mobile.
  const cols=11,rows=7,cellW=w/cols,cellH=h/rows;
  const vertices=[];
  for(let row=0;row<=rows;row++){
   const line=[];
   for(let col=0;col<=cols;col++){
    const seed=(row*71+col*43)%29;
    line.push([
     col*cellW+(col===0||col===cols?0:((seed%7)-3)*cellW*.13),
     row*cellH+(row===0||row===rows?0:((seed%5)-2)*cellH*.16)
    ]);
   }
   vertices.push(line);
  }
  for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
   const a=vertices[row][col],b=vertices[row][col+1],
    d=vertices[row+1][col],e=vertices[row+1][col+1];
   const triangles=(row+col)%2===0?[[a,b,e],[a,e,d]]:[[a,b,d],[b,e,d]];
   for(let shard=0;shard<2;shard++){
    const tri=triangles[shard];
    c.beginPath();c.moveTo(...tri[0]);c.lineTo(...tri[1]);c.lineTo(...tri[2]);c.closePath();
    c.fillStyle=(row+col+shard)%4===0?'rgba(196,219,234,.22)':'rgba(214,232,243,.12)';
    c.fill();
    c.strokeStyle='rgba(8,18,30,.82)';c.lineWidth=1.7;c.stroke();
    c.strokeStyle='rgba(241,249,255,.75)';c.lineWidth=.65;c.stroke();
   }
   if((row+col)%3===0){
    c.beginPath();c.moveTo(a[0]+cellW*.15,a[1]+cellH*.12);
    c.lineTo(a[0]+cellW*.54,a[1]+cellH*.58);
    c.lineTo(a[0]+cellW*.89,a[1]+cellH*.77);
    c.strokeStyle='rgba(232,245,255,.65)';c.lineWidth=.85;c.stroke();
   }
  }
  c.fillStyle='rgba(5,12,21,.22)';c.fillRect(0,0,w,h);
 }
}
addEventListener('resize',paintWindshield);
// Layered glass chime: short and brighter on the final shatter; shared WebAudio context.
function glassImpactSound(severity){
 if(!soundOn)return;
 try{
  audio=audio||new (window.AudioContext||window.webkitAudioContext)();
  if(audio.state==='suspended')audio.resume().catch(()=>{});
  const now=audio.currentTime;
  const tones=severity>=3?[1460,2180,2970,3650]:severity===2?[1670,2490]:[1880];
  tones.forEach((frequency,i)=>{
   const oscillator=audio.createOscillator(),envelope=audio.createGain();
   oscillator.type='triangle';
   oscillator.frequency.setValueAtTime(frequency,now);
   oscillator.frequency.exponentialRampToValueAtTime(frequency*.62,now+.11+i*.025);
   envelope.gain.setValueAtTime(.0001,now);
   envelope.gain.exponentialRampToValueAtTime(.035/(i+1),now+.008);
   envelope.gain.exponentialRampToValueAtTime(.0001,now+.16+i*.045);
   oscillator.connect(envelope);envelope.connect(audio.destination);
   oscillator.start(now);oscillator.stop(now+.18+i*.045);
  });
 }catch(e){/* Audio blocked: visuals and controls remain functional. */}
}
function crackWindshield(){
 windshieldHits=Math.min(3,windshieldHits+1);
 paintWindshield();
 glassImpactSound(windshieldHits);
}
function reset(){windshieldHits=0;paintWindshield();for(const crossing of yaowaratCrosswalks){crossing.position.z=crossing.userData.startZ;crossing.visible=true;}updateYaowaratWires(0,true);updateYaowaratSkyline(0,true,true);nightCount=0;expresswayArt.group.visible=false;pattayaStreet.visible=false;darkRoadMarkers.visible=false;darkRoadReflectors.visible=false;darkRoadFoliage.visible=false;darkHeadlight.visible=false;darkRoadPaint.visible=false;darkRoadLowBeam.visible=false;darkRoadPaintTexture.offset.y=0;darkRoadWave=0;for(let i=0;i<darkMarkerZ.length;i++)darkMarkerZ[i]=9-i*8;updateDarkRoadMarkers(0);for(let i=0;i<darkRoadFoliageZ.length;i++)darkRoadFoliageZ[i]=10-i*7.5;updateDarkRoadFoliage(0);darkRoadTexture.offset.y=0;darkRoadNormalTexture.offset.y=0;darkRoadRoughnessTexture.offset.y=0;pattayaWave=0;for(let i=0;i<pattayaShops.length;i++)pattayaShops[i].position.z=-8-i*9.6;updatePattayaReflections();grandmaTriggeredNight=0;nextDarkGrandmaScore=24000;for(const mirror of cockpitSideMirrors){mirror.housing.visible=true;mirror.glass.visible=true}if(grandmaChase){scene.remove(grandmaChase.g);grandmaChase=null}storyProps.forEach(p=>scene.remove(p.g));storyProps.length=0;visualRush=0;camera.fov=76;camera.updateProjectionMatrix();cockpit.position.y=-.22;paused=false;$('pauseBtn').textContent='⏸';bossSpawned=false;bossBeaten=false;for(const p of props)p.visible=true;neonReflections.visible=true;for(const mesh of streetLampMeshes)mesh.visible=true;updateYaowaratStreetlights();updateYaowaratReflections();ramaBeaconPhase=-1;for(const p of ramaStructures){p.visible=false;p.position.z=p.userData.startZ;}for(const shop of roadsideShops){shop.g.visible=shop.stage===1;shop.g.position.z=shop.startZ;}for(const stall of marketStalls){stall.visible=false;stall.position.z=stall.userData.startZ;}for(const tent of marketCanopies){tent.visible=false;tent.position.z=tent.userData.startZ;}for(const bump of marketBumps){bump.visible=false;bump.position.z=bump.userData.startZ;}for(const mesh of marketCrowdMeshes)mesh.visible=false;canalGroup.visible=false;districtIndex=-1;applyDistrict(1);scene.background.copy(districtSkies[1]);scene.fog.color.copy(districtSkies[1]);spawnIndex=0;eventCount=0;lastEventMeters=-250;active=true;queueOptionalModels();meters=0;bonus=(new URLSearchParams(window.location.search).get('stage')==='dark-road'||window.location.pathname.endsWith('/dark-road.html'))?23000:0;missionDone=false;shake=0;speed=120;dialNeedlePivot.rotation.z=0;x=0;tilt=0;fallbackKeySteer=0;fallbackDragSteer=0;fallbackLeft=false;fallbackRight=false;fallbackPointer=null;neutral=lastGamma;smoothed=0;spawnClock=.45;inv=0;flips=0;combo=0;comboTime=0;challengeStage=0;challengeDisplay='';challenge.textContent='🎯 SURVIVE 500m · +250';misses=0;crashes=0;hazards.forEach(h=>scene.remove(h.g));hazards.length=0;trafficContactShadows.count=0;trafficRoadGlows.count=0;tyreSpray.count=0;tyreSpray.visible=false;trafficRoadGlows.visible=false;overlay.style.display='none';hint.textContent=bonus>=23000?'🌑 DARK ROAD · HEADLIGHTS ONLY · TILT TO STEER':'📱 SMALL TILTS TO STEER · 🎯 RECENTER'}
function finish(){
 active=false;
 const points=Math.floor(meters+bonus);
 if(points>best){best=points;try{localStorage.setItem('bbf-best3d',String(best))}catch(e){}}
 // Stage boundaries match the live score-based stage transitions.
 const stages=[
  {at:0,name:'YAOWARAT'},{at:3000,name:'RAMA II'},
  {at:8000,name:'JJ MARKET'},{at:10000,name:'FLOATING MARKET'},
  {at:12000,name:'EXPRESSWAY'},{at:16000,name:'PATTAYA'},
  {at:23000,name:'DARK ROAD'}
 ];
 let stageIndex=0;
 for(let i=1;i<stages.length;i++)if(points>=stages[i].at)stageIndex=i;
 const stage=stages[stageIndex],next=stages[stageIndex+1];
 const percent=next?Math.max(0,Math.min(100,Math.round((points-stage.at)/(next.at-stage.at)*100))):100;
 const nextLabel=next?(next.at-points).toLocaleString('en-US')+' PTS TO '+next.name:'ALL STAGES UNLOCKED';
 panel.innerHTML='<h1>💥 GAME OVER</h1>'+
  '<div class="result-score">'+points.toLocaleString('en-US')+'</div>'+
  '<div class="result-caption">YOUR SCORE</div>'+
  '<div class="result-best">🏆 PERSONAL BEST '+best.toLocaleString('en-US')+'</div>'+
  '<div class="result-stage">📍 '+stage.name+'</div>'+
  '<div class="result-progress" role="progressbar" aria-label="Progress to next stage" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+percent+'"><span style="width:'+percent+'%"></span></div>'+
  '<div class="result-next">'+nextLabel+'</div>'+
  '<div class="result-stats">NEAR MISSES <strong>'+misses+'</strong><span>·</span> CRASHES <strong>'+crashes+'</strong></div>'+
  '<p class="result-mission">'+(missionDone?'🏆 1000m MISSION COMPLETE':'🎯 SURVIVE 1000m FOR +500')+'</p>'+
  '<button id="again">TRY AGAIN</button><small>No brakes. No rules. Just Bangkok.</small>';
 overlay.style.display='grid';
 $('again').onclick=reset;
}
function sound(freq=240,duration=.12,type='square'){if(!soundOn)return;try{audio=audio||new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();const o=audio.createOscillator(),gain=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(55,freq*.55),audio.currentTime+duration);gain.gain.setValueAtTime(.075,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(gain);gain.connect(audio.destination);o.start();o.stop(audio.currentTime+duration)}catch(e){}}
// 8000-point stage: Chatuchak (JJ Market) craft, vintage and plant stalls.
// Lightweight geometry keeps the center road playable for tilt steering.
const marketStalls=[],marketCanopies=[],marketBumps=[];
// At 10,000 points the market's right edge becomes an open canal.
const canalGroup=new THREE.Group(),canalEdge=mat(0xb7ad92);
// Baked, tileable PBR khlong water: muddy green-brown instead of flat turquoise.
// Two shared 256px maps, no runtime lights, particles or additional draw calls.
const canalWaterCanvas=document.createElement('canvas');
const canalWaterNormalCanvas=document.createElement('canvas');
canalWaterCanvas.width=canalWaterCanvas.height=256;
canalWaterNormalCanvas.width=canalWaterNormalCanvas.height=256;
const canalWaterCtx=canalWaterCanvas.getContext('2d');
const canalWaterNormalCtx=canalWaterNormalCanvas.getContext('2d');
const canalWaterColor=canalWaterCtx.createImageData(256,256);
const canalWaterNormal=canalWaterNormalCtx.createImageData(256,256);
const canalWaterHeights=new Float32Array(256*256);
const canalTau=Math.PI*2;
for(let y=0;y<256;y++)for(let x=0;x<256;x++){
 const i=y*256+x;
 // Integer-frequency waves tile seamlessly across both edges.
 const a=canalTau*(4*x+y)/256,b=canalTau*(9*x-3*y)/256;
 const c=canalTau*(15*x+7*y)/256;
 const wave=.54*Math.sin(a)+.3*Math.sin(b)+.16*Math.sin(c);
 canalWaterHeights[i]=wave;
 const reflection=Math.pow(Math.max(0,Math.sin(canalTau*(3*x+y)/256)),16);
 const silt=Math.sin(canalTau*(2*x+5*y)/256)*3;
 const p=i*4;
 canalWaterColor.data[p]=Math.round(46+wave*9+silt+reflection*34);
 canalWaterColor.data[p+1]=Math.round(71+wave*11+silt+reflection*29);
 canalWaterColor.data[p+2]=Math.round(59+wave*9+silt+reflection*18);
 canalWaterColor.data[p+3]=255;
}
for(let y=0;y<256;y++)for(let x=0;x<256;x++){
 const i=y*256+x,p=i*4;
 const dx=canalWaterHeights[y*256+((x+1)&255)]-canalWaterHeights[y*256+((x+255)&255)];
 const dy=canalWaterHeights[((y+1)&255)*256+x]-canalWaterHeights[((y+255)&255)*256+x];
 canalWaterNormal.data[p]=Math.round(128-dx*35);
 canalWaterNormal.data[p+1]=Math.round(128-dy*35);
 canalWaterNormal.data[p+2]=252;
 canalWaterNormal.data[p+3]=255;
}
canalWaterCtx.putImageData(canalWaterColor,0,0);
canalWaterNormalCtx.putImageData(canalWaterNormal,0,0);
const canalWaterTexture=new THREE.CanvasTexture(canalWaterCanvas);
canalWaterTexture.colorSpace=THREE.SRGBColorSpace;
canalWaterTexture.wrapS=canalWaterTexture.wrapT=THREE.RepeatWrapping;
canalWaterTexture.repeat.set(2,18);
canalWaterTexture.anisotropy=Math.min(2,renderer.capabilities.getMaxAnisotropy());
const canalWaterNormalTexture=new THREE.CanvasTexture(canalWaterNormalCanvas);
canalWaterNormalTexture.wrapS=canalWaterNormalTexture.wrapT=THREE.RepeatWrapping;
canalWaterNormalTexture.repeat.copy(canalWaterTexture.repeat);
const canalWater=new THREE.MeshStandardMaterial({
 map:canalWaterTexture,normalMap:canalWaterNormalTexture,
 normalScale:new THREE.Vector2(.18,.18),roughness:.44,metalness:.06
});
canalGroup.add(cube(9,.07,220,canalWater,8.2,-.16,-86));
canalGroup.add(cube(.28,.38,220,canalEdge,3.65,.12,-86));
 // One scrolling translucent texture creates moving canal ripples at a fixed GPU cost.
 // Reuse a single plane/material rather than adding per-frame particles or meshes.
 const canalRippleCanvas=document.createElement('canvas');
 canalRippleCanvas.width=256;canalRippleCanvas.height=512;
 const rippleCtx=canalRippleCanvas.getContext('2d');
 rippleCtx.clearRect(0,0,256,512);
 for(let row=0;row<12;row++){
  const ry=16+row*43,shift=(row*37)%75;
  rippleCtx.strokeStyle=row%3===0?'rgba(207,220,188,.27)':'rgba(147,186,167,.21)';
  rippleCtx.lineWidth=row%3===0?1.9:1.15;
  for(let col=0;col<3;col++){
   const rx=14+col*88+shift%21;
   rippleCtx.beginPath();
   rippleCtx.moveTo(rx,ry);
   rippleCtx.quadraticCurveTo(rx+17,ry-5,rx+37,ry+1);
   rippleCtx.quadraticCurveTo(rx+46,ry+4,rx+56,ry);
   rippleCtx.stroke();
  }
 }
 const canalRippleTexture=new THREE.CanvasTexture(canalRippleCanvas);
 canalRippleTexture.wrapS=THREE.RepeatWrapping;canalRippleTexture.wrapT=THREE.RepeatWrapping;
 canalRippleTexture.repeat.set(1,9);
 const canalRippleSurface=new THREE.Mesh(
  new THREE.PlaneGeometry(8.65,219),
  new THREE.MeshBasicMaterial({map:canalRippleTexture,transparent:true,opacity:.38,depthWrite:false,side:THREE.DoubleSide})
 );
 canalRippleSurface.rotation.x=-Math.PI/2;
 canalRippleSurface.position.set(8.2,-.118,-86);
 canalRippleSurface.renderOrder=1;
 canalGroup.add(canalRippleSurface);
// Shared 128x256 weathered wood atlas and tapered open Thai market hulls.
const boatWoodCanvas=document.createElement('canvas');boatWoodCanvas.width=128;boatWoodCanvas.height=256;
const boatWoodCtx=boatWoodCanvas.getContext('2d');
const boatWoodGradient=boatWoodCtx.createLinearGradient(0,0,128,256);
boatWoodGradient.addColorStop(0,'#a0774e');boatWoodGradient.addColorStop(.55,'#755238');boatWoodGradient.addColorStop(1,'#48382d');
boatWoodCtx.fillStyle=boatWoodGradient;boatWoodCtx.fillRect(0,0,128,256);
for(let i=0;i<230;i++){
 const x=(i*43+Math.floor(i/7)*19)%128,y=(i*79+Math.floor(i/11)*13)%256;
 boatWoodCtx.fillStyle=i%4===0?'rgba(217,178,117,.15)':'rgba(30,23,19,.14)';
 boatWoodCtx.fillRect(x,y,1+i%3,4+i%29);
}
for(const x of [14,43,72,101]){
 boatWoodCtx.fillStyle='rgba(29,22,18,.48)';boatWoodCtx.fillRect(x,0,2,256);
 boatWoodCtx.fillStyle='rgba(201,165,112,.22)';boatWoodCtx.fillRect(x+3,0,1,256);
}
const boatWoodTexture=new THREE.CanvasTexture(boatWoodCanvas);
boatWoodTexture.colorSpace=THREE.SRGBColorSpace;
boatWoodTexture.anisotropy=Math.min(2,renderer.capabilities.getMaxAnisotropy());
const boatWoodMaterial=new THREE.MeshStandardMaterial({map:boatWoodTexture,vertexColors:true,roughness:.83,metalness:0,side:THREE.DoubleSide});

 // Eight small, weathered timber landing stages along the road-side canal bank.
 // All deck planks, cross-beams and mooring posts share one box geometry,
 // one PBR wood atlas and ONE instanced draw call (104 pieces total).
 // The closest plank begins at x=3.84, beyond the x=3.65 canal lip;
 // the outermost post ends at x=5.48, short of the fruit boats at x>=5.82.
 const canalPierCount=8,canalPierPieces=13;
 // One small, shared 256x128 weathered-plank PBR albedo atlas. Grain runs
 // along the boards (texture U), with split fibres and recessed nail heads.
 // Drawn once at startup: no added meshes, draw calls or external downloads.
 const pierWoodCanvas=document.createElement('canvas');
 pierWoodCanvas.width=256;pierWoodCanvas.height=128;
 const pierWoodCtx=pierWoodCanvas.getContext('2d');
 const pierWoodBase=pierWoodCtx.createLinearGradient(0,0,0,128);
 pierWoodBase.addColorStop(0,'#947552');
 pierWoodBase.addColorStop(.28,'#806447');
 pierWoodBase.addColorStop(.6,'#6c563f');
 pierWoodBase.addColorStop(1,'#8b6b49');
 pierWoodCtx.fillStyle=pierWoodBase;
 pierWoodCtx.fillRect(0,0,256,128);
 // Fine uneven grain is drawn horizontally, matching the long axis of
 // each pier board rather than stretching the boat hull's vertical atlas.
 for(let grain=0;grain<84;grain++){
  const y=(grain*37+Math.floor(grain/9)*13)%128;
  const sway=Math.sin(grain*1.71)*3.2;
  pierWoodCtx.strokeStyle=grain%5===0?'rgba(31,27,23,.28)':'rgba(208,179,131,.17)';
  pierWoodCtx.lineWidth=grain%7===0?1.3:.55;
  pierWoodCtx.beginPath();
  pierWoodCtx.moveTo(-4,y);
  pierWoodCtx.bezierCurveTo(66,y+sway,177,y-sway*.7,260,y+Math.sin(grain)*2);
  pierWoodCtx.stroke();
 }
 // Long dark checks, lighter exposed fibres and scattered worn patches.
 for(let crack=0;crack<13;crack++){
  const x=17+(crack*41)%179,y=10+(crack*23)%107;
  pierWoodCtx.strokeStyle='rgba(32,27,23,.48)';
  pierWoodCtx.lineWidth=crack%4===0?1.8:1;
  pierWoodCtx.beginPath();
  pierWoodCtx.moveTo(x,y);
  pierWoodCtx.lineTo(x+12+(crack%4)*7,y+(crack%3-1)*1.5);
  pierWoodCtx.lineTo(x+24+(crack%4)*9,y+.6);
  pierWoodCtx.stroke();
  pierWoodCtx.strokeStyle='rgba(198,166,119,.25)';
  pierWoodCtx.lineWidth=.7;
  pierWoodCtx.beginPath();
  pierWoodCtx.moveTo(x+1,y+2);
  pierWoodCtx.lineTo(x+18+(crack%4)*8,y+2.2);
  pierWoodCtx.stroke();
 }
 // Small oxidized fasteners near both board ends; four per atlas tile.
 for(const nx of [15,241])for(const ny of [27,101]){
  pierWoodCtx.fillStyle='rgba(28,25,23,.65)';
  pierWoodCtx.beginPath();pierWoodCtx.arc(nx,ny,3.7,0,Math.PI*2);pierWoodCtx.fill();
  pierWoodCtx.fillStyle='#6b675e';
  pierWoodCtx.beginPath();pierWoodCtx.arc(nx-.4,ny-.4,2.1,0,Math.PI*2);pierWoodCtx.fill();
  pierWoodCtx.strokeStyle='rgba(22,22,20,.72)';
  pierWoodCtx.lineWidth=.8;
  pierWoodCtx.beginPath();pierWoodCtx.moveTo(nx-1.1,ny+1);pierWoodCtx.lineTo(nx+1.1,ny-1);pierWoodCtx.stroke();
 }
 const pierWoodTexture=new THREE.CanvasTexture(pierWoodCanvas);
 pierWoodTexture.colorSpace=THREE.SRGBColorSpace;
 pierWoodTexture.anisotropy=Math.min(2,renderer.capabilities.getMaxAnisotropy());
 const canalPierMaterial=new THREE.MeshStandardMaterial({
  map:pierWoodTexture,color:0xd2b996,roughness:.91,metalness:0
 });
 const canalPierDecks=new THREE.InstancedMesh(
  new THREE.BoxGeometry(1,1,1),canalPierMaterial,canalPierCount*canalPierPieces
 );
 const pierPose=new THREE.Object3D();
 const pierWoodTints=[0xc8a57a,0xa8835e,0x896746,0xb4936a].map(c=>new THREE.Color(c));
 let pierPiece=0;
 function placePierTimber(x,y,z,width,height,depth,shade){
  pierPose.position.set(x,y,z);
  pierPose.rotation.set(0,0,0);
  pierPose.scale.set(width,height,depth);
  pierPose.updateMatrix();
  canalPierDecks.setMatrixAt(pierPiece,pierPose.matrix);
  canalPierDecks.setColorAt(pierPiece,pierWoodTints[shade%pierWoodTints.length]);
  pierPiece++;
 }
 for(let i=0;i<canalPierCount;i++){
  const z=-14-i*23;
  // Separated weathered boards leave narrow drainage gaps visible from above.
  for(let board=0;board<7;board++){
   placePierTimber(4.65,.18,z+(board-3)*.22,1.62,.12,.18,i+board);
  }
  // Four pilings continue below the waterline, with exposed darkened ends.
  for(const px of [3.91,5.41])for(const pz of [-.73,.73]){
   placePierTimber(px,-.14,z+pz,.14,1.05,.14,i+2);
  }
  for(const pz of [-.76,.76]){
   placePierTimber(4.65,-.01,z+pz,1.68,.13,.12,i+1);
  }
 }
 if(pierPiece!==canalPierCount*canalPierPieces)throw new Error('Canal pier instance count mismatch');
 canalPierDecks.instanceMatrix.needsUpdate=true;
 canalPierDecks.instanceColor.needsUpdate=true;
 canalPierDecks.computeBoundingSphere();
 canalGroup.add(canalPierDecks);

// Weathered bamboo mooring stakes with natural growth nodes on the canal bank.
// 24 tapered stalks and 72 collars use only TWO instanced PBR draw calls.
// x=5.59 stays beyond the pier decking and clear of fruit-boat hulls.
const bambooStakeCount=canalPierCount*3;
const bambooStakeMaterial=new THREE.MeshStandardMaterial({
 color:0xb3a36b,roughness:.88,metalness:0
});
const bambooNodeMaterial=new THREE.MeshStandardMaterial({
 color:0x665b3a,roughness:.94,metalness:0
});
const bambooStakeMesh=new THREE.InstancedMesh(
 new THREE.CylinderGeometry(.045,.064,1.5,8,1),bambooStakeMaterial,bambooStakeCount
);
const bambooNodeMesh=new THREE.InstancedMesh(
 new THREE.TorusGeometry(.059,.011,4,8),bambooNodeMaterial,bambooStakeCount*3
);
const bambooPose=new THREE.Object3D();
const bambooTints=[0xb8ad72,0x998b54,0x8c9563,0xc0a97a].map(c=>new THREE.Color(c));
let bambooStalkIndex=0,bambooCollarIndex=0;
for(let pier=0;pier<canalPierCount;pier++){
 const pierZ=-14-pier*23;
 for(let stake=0;stake<3;stake++){
  const z=pierZ+(stake-1)*1.32;
  const lean=((pier*3+stake)%5-2)*.017;
  const stalkX=5.59;
  bambooPose.position.set(stalkX,.31,z);
  bambooPose.rotation.set(0,0,lean);
  bambooPose.scale.set(1,1,1);
  bambooPose.updateMatrix();
  bambooStakeMesh.setMatrixAt(bambooStalkIndex,bambooPose.matrix);
  bambooStakeMesh.setColorAt(bambooStalkIndex,bambooTints[(pier+stake)%bambooTints.length]);
  bambooStalkIndex++;
  for(const y of [-.12,.33,.77]){
   bambooPose.position.set(stalkX-lean*(y-.31),y,z);
   bambooPose.rotation.set(Math.PI/2,0,0);
   bambooPose.scale.set(1,1,1);
   bambooPose.updateMatrix();
   bambooNodeMesh.setMatrixAt(bambooCollarIndex++,bambooPose.matrix);
  }
 }
}
if(bambooStalkIndex!==bambooStakeCount||bambooCollarIndex!==bambooStakeCount*3){
 throw new Error('Canal bamboo stake instance count mismatch');
}
for(const mesh of [bambooStakeMesh,bambooNodeMesh]){
 mesh.instanceMatrix.needsUpdate=true;
 mesh.computeBoundingSphere();
 canalGroup.add(mesh);
}
bambooStakeMesh.instanceColor.needsUpdate=true;

// Eight weathered hemp mooring lines lie coiled on the pier planks and
// finish at the matching bamboo stakes. Bake all curved tubes into ONE
// static PBR mesh (one draw call, no animation or extra texture downloads).
// The nearest strand stays beyond x=4.2, safely outside the driving lanes.
const canalRopePositions=[],canalRopeNormals=[],canalRopeColors=[];
const ropeLight=new THREE.Color(0xbda67e),ropeDark=new THREE.Color(0x786448);
for(let pier=0;pier<canalPierCount;pier++){
 const z=-14-pier*23;
 // A loose loop on the landing, followed by a slightly sagging tie-off.
 const knots=[
  [4.33,.282,z-.29],[4.55,.282,z-.38],[4.84,.282,z-.26],
  [4.89,.282,z+.02],[4.67,.282,z+.17],[4.46,.282,z+.02],
  [4.51,.282,z-.20],[4.89,.282,z-.14],[5.13,.27,z-.08],
  [5.36,.245,z-.025],[5.52,.36,z],[5.59,.50,z]
 ];
 const curve=new THREE.CatmullRomCurve3(knots.map(p=>new THREE.Vector3(...p)),false,'centripetal');
 const tube=new THREE.TubeGeometry(curve,44,.019,5,false);
 const positions=tube.getAttribute('position'),normals=tube.getAttribute('normal'),indices=tube.getIndex();
 for(let i=0;i<indices.count;i++){
  const v=indices.getX(i),tint=(Math.floor(i/30)+pier)%9===0?ropeDark:ropeLight;
  canalRopePositions.push(positions.getX(v),positions.getY(v),positions.getZ(v));
  canalRopeNormals.push(normals.getX(v),normals.getY(v),normals.getZ(v));
  canalRopeColors.push(tint.r,tint.g,tint.b);
 }
 tube.dispose();
}
const canalRopeGeometry=new THREE.BufferGeometry();
canalRopeGeometry.setAttribute('position',new THREE.Float32BufferAttribute(canalRopePositions,3));
canalRopeGeometry.setAttribute('normal',new THREE.Float32BufferAttribute(canalRopeNormals,3));
canalRopeGeometry.setAttribute('color',new THREE.Float32BufferAttribute(canalRopeColors,3));
canalRopeGeometry.computeBoundingSphere();
const canalMooringRopes=new THREE.Mesh(canalRopeGeometry,new THREE.MeshStandardMaterial({
 vertexColors:true,roughness:.96,metalness:0
}));
canalGroup.add(canalMooringRopes);

// One shared hull geometry includes sloped exterior, gunwales, recessed walls and floor.
function makeMarketBoatHull(){
 const zs=[-1.65,-1.35,-.8,0,.8,1.35,1.65],ws=[.10,.45,.63,.68,.63,.45,.10];
 const positions=[],uvs=[],colors=[];
 // Vertex colour lets woven bamboo trays share the boat's existing PBR draw call.
 function tri(a,b,c,tint=[1,1,1]){
  for(const p of [a,b,c]){
   positions.push(...p);uvs.push((p[0]+.85)/1.7,(p[2]+1.7)/3.4);
   colors.push(...tint);
  }
 }
 function quad(a,b,c,d,tint){tri(a,b,c,tint);tri(a,c,d,tint)}
 for(let j=0;j<zs.length-1;j++)for(const side of [-1,1]){
  const v=(k,m,y)=>[side*ws[k]*m,y,zs[k]];
  const a=v(j,1,.31),b=v(j+1,1,.31);
  quad(a,b,v(j+1,.72,-.13),v(j,.72,-.13));
  const e=v(j,.84,.23),f=v(j+1,.84,.23);
  quad(a,e,f,b);
  const g=v(j,.61,.07),h=v(j+1,.61,.07);
  quad(e,g,h,f);
  if(side===1)quad(g,h,[-ws[j+1]*.61,.07,zs[j+1]],[-ws[j]*.61,.07,zs[j]]);
 }
 // Two shallow, woven bamboo produce trays under the existing six mangoes.
 // They are baked into the hull BufferGeometry: no new meshes or draw calls.
 const bamboo=[1.48,1.27,.94],darkWeave=[.93,.74,.51],rim=[1.66,1.43,1.08];
 function basket(cx){
  const y0=.165,y1=.365,w0=.175,w1=.235,l0=.72,l1=.85;
  quad([cx-w0,y0,-l0],[cx+w0,y0,-l0],[cx+w0,y0,l0],[cx-w0,y0,l0],bamboo);
  for(const side of [-1,1]){
   const bx=cx+side*w0,tx=cx+side*w1;
   quad([bx,y0,-l0],[bx,y0,l0],[tx,y1,l1],[tx,y1,-l1],bamboo);
   // Four horizontal wicker courses with raised, narrow slats.
   for(const t of [.20,.43,.66,.89]){
    const y=y0+(y1-y0)*t,w=w0+(w1-w0)*t,l=l0+(l1-l0)*t,x=cx+side*(w+.007);
    quad([x,y-.009,-l],[x,y-.009,l],[x,y+.009,l],[x,y+.009,-l],darkWeave);
   }
   // Cross-weave strips follow the taper rather than floating off the wall.
   for(let k=0;k<8;k++){
    const z=-.69+k*.195,shift=k%2?.008:-.008;
    quad([bx+side*.009,y0,z-.012],[bx+side*.009,y0,z+.012],
     [tx+side*.009,y1,z+shift+.014],[tx+side*.009,y1,z+shift-.014],rim);
   }
   quad([tx+side*.012,y1-.016,-l1],[tx+side*.012,y1-.016,l1],
    [tx+side*.012,y1+.017,l1],[tx+side*.012,y1+.017,-l1],rim);
  }
  for(const end of [-1,1]){
   const bz=end*l0,tz=end*l1;
   quad([cx-w0,y0,bz],[cx+w0,y0,bz],[cx+w1,y1,tz],[cx-w1,y1,tz],bamboo);
   for(const t of [.28,.57,.86]){
    const y=y0+(y1-y0)*t,w=w0+(w1-w0)*t,z=end*(l0+(l1-l0)*t+.007);
    quad([cx-w,y-.009,z],[cx+w,y-.009,z],[cx+w,y+.009,z],[cx-w,y+.009,z],darkWeave);
   }
   quad([cx-w1,y1-.017,tz+end*.012],[cx+w1,y1-.017,tz+end*.012],
    [cx+w1,y1+.017,tz+end*.012],[cx-w1,y1+.017,tz+end*.012],rim);
  }
 }
 basket(-.27);basket(.27);
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
 geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 geometry.computeVertexNormals();return geometry;
}
const boatHullGeometry=makeMarketBoatHull();
// Real tapered fruit boats replace box silhouettes without per-frame allocations.
const canalBoats=[];
// Broken, translucent V-shaped foam trails replace two opaque box wakes per boat.
// One shared 128x256 texture and 40 triangles; one draw call instead of two.
const boatWakeCanvas=document.createElement('canvas');
boatWakeCanvas.width=128;boatWakeCanvas.height=256;
const boatWakeCtx=boatWakeCanvas.getContext('2d');
for(let streak=0;streak<9;streak++){
 const sx=9+streak*14,w=streak%3-1;
 boatWakeCtx.beginPath();boatWakeCtx.moveTo(sx,8);
 boatWakeCtx.bezierCurveTo(sx+w*8,70,sx-w*10,155,sx+w*6,246);
 boatWakeCtx.strokeStyle=streak%3===0?'rgba(222,234,209,.68)':'rgba(173,205,186,.35)';
 boatWakeCtx.lineWidth=streak%3===0?3:1.5;boatWakeCtx.stroke();
}
const wakeFade=boatWakeCtx.createLinearGradient(0,0,0,256);
wakeFade.addColorStop(0,'rgba(255,255,255,0)');
wakeFade.addColorStop(.12,'rgba(255,255,255,1)');
wakeFade.addColorStop(.73,'rgba(255,255,255,.8)');
wakeFade.addColorStop(1,'rgba(255,255,255,0)');
boatWakeCtx.globalCompositeOperation='destination-in';
boatWakeCtx.fillStyle=wakeFade;boatWakeCtx.fillRect(0,0,128,256);
const boatWakeTexture=new THREE.CanvasTexture(boatWakeCanvas);
boatWakeTexture.colorSpace=THREE.SRGBColorSpace;
boatWakeTexture.anisotropy=Math.min(2,renderer.capabilities.getMaxAnisotropy());
const boatWakeMaterial=new THREE.MeshBasicMaterial({
 map:boatWakeTexture,transparent:true,opacity:.68,depthWrite:false,
 side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1
});
const boatWakePositions=[],boatWakeUVs=[];
for(const side of [-1,1])for(let segment=0;segment<10;segment++){
 const t0=segment/10,t1=(segment+1)/10;
 for(const [t,u] of [[t0,0],[t0,1],[t1,0],[t0,1],[t1,1],[t1,0]]){
  const width=.12+.18*t;
  boatWakePositions.push(side*(.40+.72*t)+(u-.5)*width,0,-1.1-2.75*t);
  boatWakeUVs.push(u,t);
 }
}
const boatWakeGeometry=new THREE.BufferGeometry();
boatWakeGeometry.setAttribute('position',new THREE.Float32BufferAttribute(boatWakePositions,3));
boatWakeGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(boatWakeUVs,2));
boatWakeGeometry.computeVertexNormals();
// Floating-market fruit boats: a shared tapered mango mesh and tiny stem mesh
// replace six separate spherical draw calls per boat. Per-instance colours
// suggest ripe mangoes and green produce without extra texture downloads.
const boatMangoGeometry=new THREE.SphereGeometry(.18,12,9);
const mangoPositions=boatMangoGeometry.getAttribute('position');
for(let v=0;v<mangoPositions.count;v++){
 const y=mangoPositions.getY(v),height=y/.18;
 mangoPositions.setXYZ(v,
  mangoPositions.getX(v)*(1-.17*height)+.024*height*height,
  y*1.18,
  mangoPositions.getZ(v)*.88);
}
mangoPositions.needsUpdate=true;
boatMangoGeometry.computeVertexNormals();
const boatMangoCanvas=document.createElement('canvas');
boatMangoCanvas.width=boatMangoCanvas.height=64;
const boatMangoCtx=boatMangoCanvas.getContext('2d');
boatMangoCtx.fillStyle='#f2f0dc';boatMangoCtx.fillRect(0,0,64,64);
for(let p=0;p<140;p++){
 const px=(p*37+11)%64,py=(p*53+7)%64;
 boatMangoCtx.fillStyle=p%3===0?'rgba(100,82,47,.13)':'rgba(255,255,255,.17)';
 boatMangoCtx.fillRect(px,py,1+(p%2),1);
}
const boatMangoTexture=new THREE.CanvasTexture(boatMangoCanvas);
boatMangoTexture.colorSpace=THREE.SRGBColorSpace;
const boatMangoMaterial=new THREE.MeshStandardMaterial({
 map:boatMangoTexture,roughness:.82,metalness:0
});
const boatMangoColors=[0xe8b82f,0xe65b37,0x78b34c].map(c=>new THREE.Color(c));
const boatMangoStemGeometry=new THREE.CylinderGeometry(.011,.015,.085,5);
const boatMangoStemMaterial=new THREE.MeshStandardMaterial({
 color:0x59472e,roughness:.94,metalness:0
});
// Shared curved fabric canopy with scalloped hem: one draw per boat instead of six.
// Vertex-colored stripes avoid texture downloads and keep the mobile budget small.
function makeBoatCanopyGeometry(){
 const positions=[],colors=[],segments=12,radii=[0,.53,.94],heights=[.38,.22,-.04];
 const palette=[0xe8bc62,0xd46753,0x3c9185].map(c=>new THREE.Color(c));
 function point(sector,ring){
  const angle=sector*Math.PI*2/segments;
  const scallop=ring===2?(sector%2===0?.018:-.018):0;
  return [Math.cos(angle)*radii[ring],heights[ring]+scallop,Math.sin(angle)*radii[ring]];
 }
 function triangle(a,b,c,color){
  for(const vertex of [a,b,c]){positions.push(...vertex);colors.push(color.r,color.g,color.b)}
 }
 for(let sector=0;sector<segments;sector++){
  const color=palette[Math.floor(sector/2)%palette.length];
  const center=point(sector,0),innerA=point(sector,1),innerB=point(sector+1,1);
  const edgeA=point(sector,2),edgeB=point(sector+1,2);
  triangle(center,innerB,innerA,color);
  triangle(innerA,innerB,edgeB,color);
  triangle(innerA,edgeB,edgeA,color);
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 geometry.computeVertexNormals();return geometry;
}
const boatCanopyGeometry=makeBoatCanopyGeometry();
const boatCanopyMaterial=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.94,metalness:0,side:THREE.DoubleSide});
for(let i=0;i<10;i++){
 const boat=new THREE.Group();
 boat.add(new THREE.Mesh(boatHullGeometry,boatWoodMaterial));
 // One instanced mango draw and one instanced stem draw per boat:
 // twelve detailed pieces now cost two calls instead of six spherical calls.
 const mangoes=new THREE.InstancedMesh(boatMangoGeometry,boatMangoMaterial,6);
 const stems=new THREE.InstancedMesh(boatMangoStemGeometry,boatMangoStemMaterial,6);
 const fruitPose=new THREE.Object3D();
 for(let j=0;j<6;j++){
  const fx=(j%2?1:-1)*.27,fz=(Math.floor(j/2)-1)*.57;
  fruitPose.position.set(fx,.46,fz);
  fruitPose.rotation.set(0,(i*3+j)*.61,(j%2?1:-1)*.09);
  fruitPose.scale.setScalar(.9+(j%3)*.065);
  fruitPose.updateMatrix();mangoes.setMatrixAt(j,fruitPose.matrix);
  mangoes.setColorAt(j,boatMangoColors[(i+j)%boatMangoColors.length]);
  fruitPose.position.set(fx+.024,.687,fz);
  fruitPose.rotation.set(0,0,(j%2?1:-1)*.15);
  fruitPose.scale.set(1,1,1);
  fruitPose.updateMatrix();stems.setMatrixAt(j,fruitPose.matrix);
 }
 mangoes.instanceMatrix.needsUpdate=true;
 mangoes.instanceColor.needsUpdate=true;
 stems.instanceMatrix.needsUpdate=true;
 mangoes.computeBoundingSphere();stems.computeBoundingSphere();
 boat.add(mangoes,stems);
 boat.add(cube(.055,1.65,.055,canalEdge,0,1.17,0));
 const parasol=new THREE.Mesh(boatCanopyGeometry,boatCanopyMaterial);
 parasol.rotation.y=i*Math.PI/6;parasol.position.y=2.06;boat.add(parasol);
 boat.position.set(6.5+(i%3)*1.2,-.02,-12-i*19);
 // Wake stays at the canal surface while the boat gently bobs.
 const wake=new THREE.Mesh(boatWakeGeometry,boatWakeMaterial);
 wake.position.y=-.085;wake.renderOrder=2;boat.add(wake);
 boat.userData.wake=wake;
 boat.userData.homeZ=boat.position.z;boat.userData.phase=i*1.37;boat.userData.parasol=parasol;canalBoats.push(boat);
 canalGroup.add(boat);
}
canalGroup.visible=false;scene.add(canalGroup);
// Four shared bilingual storefront textures: no external fonts or network assets.
const marketSignStyles=[
 ['ตลาดจตุจักร','JJ CHATUCHAK','#233a45','#ffe5a5'],
 ['ร้านต้นไม้','TROPICAL PLANTS','#265f46','#d7f5b1'],
 ['เสื้อวินเทจ','VINTAGE WEAR','#613e70','#ffdfb6'],
 ['งานคราฟต์','LOCAL CRAFTS','#86503e','#ffe4c0']
];
const marketSigns=marketSignStyles.map(([thai,english,bg,fg])=>{
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=160;
 const ctx=canvas.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,512,160);
 ctx.strokeStyle=fg;ctx.lineWidth=7;ctx.strokeRect(8,8,496,144);
 ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=fg;
 ctx.font='bold 57px sans-serif';ctx.fillText(thai,256,62,470);
 ctx.font='bold 28px sans-serif';ctx.fillText(english,256,119,470);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 return new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide});
});
// Shared weathered fabric roofs for all 32 Chatuchak stalls: one roof mesh
// per stall, with no new lights, network assets, or per-frame texture updates.
const jjStallRoofPalettes=[['#cbb68b','#92744f'],['#8fb29a','#5a8273'],['#d6a496','#a9695d']];
const jjStallRoofMaterials=jjStallRoofPalettes.map(([light,dark],variant)=>{
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
 const ctx=canvas.getContext('2d');
 ctx.fillStyle=light;ctx.fillRect(0,0,128,128);
 for(let x=0;x<128;x+=32){
  ctx.fillStyle=dark;ctx.fillRect(x,0,16,128);
  const fold=ctx.createLinearGradient(x,0,x+32,0);
  fold.addColorStop(0,'rgba(18,24,21,.22)');
  fold.addColorStop(.45,'rgba(255,250,225,.18)');
  fold.addColorStop(1,'rgba(18,24,21,.15)');
  ctx.fillStyle=fold;ctx.fillRect(x,0,32,128);
  ctx.strokeStyle='rgba(236,227,199,.48)';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(x+.5,0);ctx.lineTo(x+.5,128);ctx.stroke();
 }
 ctx.strokeStyle='rgba(237,227,205,.55)';ctx.setLineDash([3,4]);
 for(const y of [6,122]){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(128,y);ctx.stroke();}
 ctx.setLineDash([]);
 for(let k=0;k<80;k++){
  const x=(k*47+variant*13)%128,y=(k*83+variant*17)%128;
  ctx.fillStyle=k%3===0?'rgba(54,44,35,.12)':'rgba(248,233,207,.13)';
  ctx.fillRect(x,y,1+k%3,1+k%4);
 }
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 texture.anisotropy=1;
 return new THREE.MeshStandardMaterial({map:texture,metalness:0,roughness:.94,side:THREE.DoubleSide});
});
function makeJjStallRoofGeometry(){
 const positions=[],uvs=[],indices=[],xs=6,zs=8;
 const crown=(x,z)=>.12*(1-(x/1.25)**2)-.02*Math.cos(z/1.8*Math.PI);
 for(let iz=0;iz<=zs;iz++)for(let ix=0;ix<=xs;ix++){
  const x=-1.25+2.5*ix/xs,z=-1.8+3.6*iz/zs;
  positions.push(x,crown(x,z),z);uvs.push(ix/xs,iz/zs);
 }
 for(let iz=0;iz<zs;iz++)for(let ix=0;ix<xs;ix++){
  const a=iz*(xs+1)+ix,b=a+1,c=a+xs+1,d=c+1;
  indices.push(a,c,b,b,c,d);
 }
 function hem(a,b,segment){
  const start=positions.length/3,drop=.11+(segment%2===0?.035:0);
  positions.push(...a,...b,b[0],b[1]-drop,b[2],a[0],a[1]-drop,a[2]);
  uvs.push(0,0,1,0,1,1,0,1);
  indices.push(start,start+1,start+2,start,start+2,start+3);
 }
 for(let iz=0;iz<zs;iz++){
  const z0=-1.8+3.6*iz/zs,z1=-1.8+3.6*(iz+1)/zs;
  for(const x of [-1.25,1.25])hem([x,crown(x,z0),z0],[x,crown(x,z1),z1],iz);
 }
 for(let ix=0;ix<xs;ix++){
  const x0=-1.25+2.5*ix/xs,x1=-1.25+2.5*(ix+1)/xs;
  for(const z of [-1.8,1.8])hem([x0,crown(x0,z),z],[x1,crown(x1,z),z],ix);
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
 geometry.setIndex(indices);geometry.computeVertexNormals();
 return geometry;
}
const jjStallRoofGeometry=makeJjStallRoofGeometry();
// Chatuchak close-up LOD: shaped, shared PBR merchandise replaces box/sphere
// placeholders. Only merchandise is culled at distance; roofs, signs, stalls
// and their collision-free roadside placement remain visible at every range.
// A single lathed terracotta pot includes its lip and tapered body.
const jjPotGeometry=new THREE.LatheGeometry([
 new THREE.Vector2(0,-.14),new THREE.Vector2(.13,-.14),
 new THREE.Vector2(.15,-.12),new THREE.Vector2(.18,.09),
 new THREE.Vector2(.205,.10),new THREE.Vector2(.205,.14),
 new THREE.Vector2(.17,.14),new THREE.Vector2(.16,.10)
],12);
const jjPotMaterial=new THREE.MeshStandardMaterial({color:0x9f674e,roughness:.92});
// Two staggered layers of broad, drooping leaves replace the toy-like
// dodecahedron shrubs. Every plant reuses one geometry and one PBR material;
// the existing near-camera merchandise LOD and draw-call count are unchanged.
function makeJjFoliageGeometry(){
 const positions=[],colors=[],indices=[],leavesPerTier=11;
 for(let tier=0;tier<2;tier++)for(let i=0;i<leavesPerTier;i++){
  const theta=Math.PI*2*(i+(tier?.43:0))/leavesPerTier;
  const dx=Math.cos(theta),dz=Math.sin(theta),sideX=-dz,sideZ=dx;
  const reach=tier?.28:.43,baseY=tier?-.015:-.19;
  const midY=tier?.29:.17,tipY=tier?.16:-.11;
  const width=tier?.077:.105,base=positions.length/3;
  const vertices=[
   [.022*dx,baseY,.022*dz],
   [reach*.54*dx-width*sideX,midY-.055,reach*.54*dz-width*sideZ],
   [reach*.60*dx,midY,reach*.60*dz],
   [reach*.54*dx+width*sideX,midY-.055,reach*.54*dz+width*sideZ],
   [reach*dx,tipY,reach*dz]
  ];
  const shade=(i*7+tier*3)%5;
  for(let v=0;v<vertices.length;v++){
   positions.push(...vertices[v]);
   const light=v===2?.10:v===4?-.045:0;
   colors.push(.16+shade*.015+light,.32+shade*.018+light,.13+shade*.013+light*.6);
  }
  indices.push(base,base+1,base+2,base,base+2,base+3,
   base+1,base+4,base+2,base+2,base+4,base+3);
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 geometry.setIndex(indices);geometry.computeVertexNormals();
 return geometry;
}
const jjFoliageGeometry=makeJjFoliageGeometry();
const jjFoliageMaterial=new THREE.MeshStandardMaterial({
 vertexColors:true,roughness:.89,metalness:0,side:THREE.DoubleSide
});
const jjShirtOutline=new THREE.Shape();
jjShirtOutline.moveTo(-.17,.32);
jjShirtOutline.lineTo(-.32,.23);jjShirtOutline.lineTo(-.38,.07);
jjShirtOutline.lineTo(-.25,.02);jjShirtOutline.lineTo(-.22,-.32);
jjShirtOutline.lineTo(.22,-.32);jjShirtOutline.lineTo(.25,.02);
jjShirtOutline.lineTo(.38,.07);jjShirtOutline.lineTo(.32,.23);
jjShirtOutline.lineTo(.17,.32);jjShirtOutline.lineTo(.09,.23);
jjShirtOutline.lineTo(-.09,.23);jjShirtOutline.closePath();
// Vintage-wear stalls: one instanced set of thick fabric shirts and one of
// shaped wire hangers. Shared meshes/materials replace three separate flat
// shirt draw calls without increasing per-stall draw calls or network assets.
const jjShirtGeometry=new THREE.ExtrudeGeometry(jjShirtOutline,{
 depth:.045,bevelEnabled:false,curveSegments:1
});
// Front/back UVs follow the garment silhouette, so one tiny baked fabric
// texture adds seams, drape and a faded chest print without extra meshes.
const jjShirtPositions=jjShirtGeometry.getAttribute('position');
const jjShirtUvs=jjShirtGeometry.getAttribute('uv');
for(let i=0;i<jjShirtPositions.count;i++){
 jjShirtUvs.setXY(i,(jjShirtPositions.getX(i)+.38)/.76,(jjShirtPositions.getY(i)+.32)/.64);
}
jjShirtUvs.needsUpdate=true;
const jjShirtCanvas=document.createElement('canvas');
jjShirtCanvas.width=jjShirtCanvas.height=128;
const jjShirtCtx=jjShirtCanvas.getContext('2d');
jjShirtCtx.fillStyle='#e9e5df';jjShirtCtx.fillRect(0,0,128,128);
const jjFabricFold=jjShirtCtx.createLinearGradient(0,0,128,0);
jjFabricFold.addColorStop(0,'rgba(31,26,24,.26)');
jjFabricFold.addColorStop(.22,'rgba(255,255,255,.16)');
jjFabricFold.addColorStop(.48,'rgba(39,32,29,.09)');
jjFabricFold.addColorStop(.76,'rgba(255,255,255,.12)');
jjFabricFold.addColorStop(1,'rgba(31,26,24,.24)');
jjShirtCtx.fillStyle=jjFabricFold;jjShirtCtx.fillRect(0,0,128,128);
for(let i=0;i<256;i++){
 const x=(i*53+11)%128,y=(i*71+29)%128;
 jjShirtCtx.fillStyle=i%3?'rgba(255,255,255,.10)':'rgba(45,40,35,.055)';
 jjShirtCtx.fillRect(x,y,1,2);
}
jjShirtCtx.strokeStyle='rgba(62,53,48,.29)';jjShirtCtx.lineWidth=1.2;
jjShirtCtx.beginPath();jjShirtCtx.moveTo(48,17);jjShirtCtx.lineTo(64,33);
jjShirtCtx.lineTo(80,17);jjShirtCtx.stroke();
jjShirtCtx.setLineDash([3,3]);jjShirtCtx.strokeStyle='rgba(65,56,51,.25)';
jjShirtCtx.beginPath();jjShirtCtx.moveTo(26,118);jjShirtCtx.lineTo(102,118);jjShirtCtx.stroke();
jjShirtCtx.setLineDash([]);
jjShirtCtx.fillStyle='rgba(59,52,47,.16)';
jjShirtCtx.fillRect(53,52,22,14);
jjShirtCtx.fillStyle='rgba(243,238,225,.35)';
jjShirtCtx.fillRect(56,55,16,8);
const jjShirtTexture=new THREE.CanvasTexture(jjShirtCanvas);
jjShirtTexture.colorSpace=THREE.SRGBColorSpace;
jjShirtTexture.anisotropy=1;
const jjShirtMaterial=new THREE.MeshStandardMaterial({
 color:0xffffff,map:jjShirtTexture,roughness:.97,metalness:0
});
const jjShirtColors=[0x98705c,0x668a77,0x6f7490].map(hex=>new THREE.Color(hex));
const jjRackGeometry=new THREE.CylinderGeometry(.018,.018,2.05,6);
const jjRackMaterial=new THREE.MeshStandardMaterial({color:0x777f83,metalness:.7,roughness:.58});
function makeJjWireHangerGeometry(){
 const positions=[],indices=[],width=.012;
 const addWire=(points)=>{
  for(let i=1;i<points.length;i++){
   const [ax,ay]=points[i-1],[bx,by]=points[i],dx=bx-ax,dy=by-ay;
   const len=Math.hypot(dx,dy),nx=-dy/len*width,ny=dx/len*width;
   const base=positions.length/3;
   positions.push(ax-nx,ay-ny,0,ax+nx,ay+ny,0,bx-nx,by-ny,0,bx+nx,by+ny,0);
   indices.push(base,base+1,base+2,base+1,base+3,base+2);
  }
 };
 addWire([[-.22,-.09],[0,.05],[.22,-.09],[-.22,-.09]]);
 addWire([[0,.05],[0,.14],[.045,.19],[.075,.15]]);
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.setIndex(indices);geometry.computeVertexNormals();
 return geometry;
}
const jjHangerGeometry=makeJjWireHangerGeometry();
// JJ ceramic stalls: kiln-fired vase silhouette with a proper hollow rim,
// subtle shared glazed texture and six instanced pieces per display. One draw
// call per pottery stall instead of three separate vase meshes.
const jjVaseGeometry=new THREE.LatheGeometry([
 new THREE.Vector2(0,0),new THREE.Vector2(.105,0),
 new THREE.Vector2(.14,.022),new THREE.Vector2(.205,.095),
 new THREE.Vector2(.195,.19),new THREE.Vector2(.14,.31),
 new THREE.Vector2(.125,.35),new THREE.Vector2(.158,.37),
 new THREE.Vector2(.158,.393),new THREE.Vector2(.118,.393),
 new THREE.Vector2(.109,.355)
],16);
const jjCeramicCanvas=document.createElement('canvas');
jjCeramicCanvas.width=jjCeramicCanvas.height=128;
const jjCeramicCtx=jjCeramicCanvas.getContext('2d');
jjCeramicCtx.fillStyle='#e9e5dc';jjCeramicCtx.fillRect(0,0,128,128);
const jjGlazeFade=jjCeramicCtx.createLinearGradient(0,0,0,128);
jjGlazeFade.addColorStop(0,'rgba(255,255,255,.22)');
jjGlazeFade.addColorStop(.5,'rgba(77,66,54,.07)');
jjGlazeFade.addColorStop(1,'rgba(54,43,34,.18)');
jjCeramicCtx.fillStyle=jjGlazeFade;jjCeramicCtx.fillRect(0,0,128,128);
jjCeramicCtx.fillStyle='rgba(39,61,68,.28)';
jjCeramicCtx.fillRect(0,18,128,4);
jjCeramicCtx.fillStyle='rgba(255,255,255,.32)';
jjCeramicCtx.fillRect(0,24,128,2);
for(let i=0;i<190;i++){
 const px=(i*59+17)%128,py=(i*41+13)%128;
 jjCeramicCtx.fillStyle=i%3===0?'rgba(51,47,42,.13)':'rgba(255,255,255,.15)';
 jjCeramicCtx.fillRect(px,py,1,1);
}
const jjCeramicTexture=new THREE.CanvasTexture(jjCeramicCanvas);
jjCeramicTexture.colorSpace=THREE.SRGBColorSpace;
jjCeramicTexture.anisotropy=1;
const jjVaseMaterial=new THREE.MeshStandardMaterial({
 color:0xffffff,map:jjCeramicTexture,roughness:.34,metalness:0
});
const jjCeramicColors=[0x91b6b8,0xcfa781,0xa4a0bf,0x88ad99,0xb5c3c3,0xcab99b].map(c=>new THREE.Color(c));
for(let n=0;n<16;n++)for(const side of [-1,1]){
 const stall=new THREE.Group(),x=side*(4.65+(n%3)*.15),roof=jjStallRoofMaterials[n%3];
 // Keep roof as child[0]: the canal-side stall visibility check reads its X.
 const stallRoof=new THREE.Mesh(jjStallRoofGeometry,roof);
 stallRoof.position.set(x,3.05,0);stall.add(stallRoof);
 stall.add(cube(2.15,.16,2.7,mat(0x72513d),x,1.22,0));
 for(const dz of [-1.35,1.35])stall.add(cube(.1,2.9,.1,mat(0xd5c4a4),x,1.55,dz));
 const merchandise=new THREE.Group();
 for(let k=0;k<3;k++){
  const px=x+side*.1,pz=-.7+k*.7;
  if(n%3===0){
   const pot=new THREE.Mesh(jjPotGeometry,jjPotMaterial);
   pot.position.set(px,1.49,pz);merchandise.add(pot);
   const foliage=new THREE.Mesh(jjFoliageGeometry,jjFoliageMaterial);
   foliage.position.set(px,1.92,pz);foliage.scale.set(.94,1.23,.94);merchandise.add(foliage);
  }else if(n%3===1){
   // Build once per stall; each shirt and hanger is an instance, not a mesh.
   if(k===0){
    const rack=new THREE.Mesh(jjRackGeometry,jjRackMaterial);
    rack.rotation.x=Math.PI/2;
    rack.position.set(px,2.44,0);merchandise.add(rack);
    const shirts=new THREE.InstancedMesh(jjShirtGeometry,jjShirtMaterial,3);
    const hangers=new THREE.InstancedMesh(jjHangerGeometry,jjRackMaterial,3);
    const pose=new THREE.Object3D();
    // Face the road: XY shirts previously appeared edge-on from the player's
    // central lane. Rotation keeps every garment within the roadside stall.
    pose.rotation.y=side>0?-Math.PI/2:Math.PI/2;
    for(let i=0;i<3;i++){
     const garmentZ=-.7+i*.7;
     pose.position.set(px,1.78,garmentZ);pose.updateMatrix();
     shirts.setMatrixAt(i,pose.matrix);
     shirts.setColorAt(i,jjShirtColors[(n+i)%jjShirtColors.length]);
     pose.position.set(px,2.23,garmentZ);pose.updateMatrix();
     hangers.setMatrixAt(i,pose.matrix);
    }
    shirts.instanceMatrix.needsUpdate=true;
    shirts.instanceColor.needsUpdate=true;
    hangers.instanceMatrix.needsUpdate=true;
    shirts.computeBoundingSphere();hangers.computeBoundingSphere();
    merchandise.add(shirts,hangers);
   }
  }else if(k===0){
   // Two compact rows of glazed pottery remain on the roadside counter.
   // A single instanced draw call keeps dense JJ craft stalls mobile-friendly.
   const vases=new THREE.InstancedMesh(jjVaseGeometry,jjVaseMaterial,6);
   const pose=new THREE.Object3D();
   for(let i=0;i<6;i++){
    pose.position.set(px+(i<3?-.24:.24),1.34,-.72+(i%3)*.72);
    const size=.83+((n+i)%3)*.12;
    pose.scale.set(size,size*(.87+(i%2)*.14),size);
    pose.rotation.y=(n*7+i)*.51;
    pose.updateMatrix();
    vases.setMatrixAt(i,pose.matrix);
    vases.setColorAt(i,jjCeramicColors[(n+i)%jjCeramicColors.length]);
   }
   vases.instanceMatrix.needsUpdate=true;
   vases.instanceColor.needsUpdate=true;
   vases.computeBoundingSphere();
   merchandise.add(vases);
  }
 }
 stall.add(merchandise);stall.userData.merchandise=merchandise;
 const sign=new THREE.Mesh(new THREE.PlaneGeometry(2.35,.73),marketSigns[n%4]);
 sign.rotation.y=side<0?Math.PI/2:-Math.PI/2;sign.position.set(x-side*1.3,2.55,0);stall.add(sign);
 stall.position.z=-12-n*12;stall.userData.startZ=stall.position.z;stall.visible=false;scene.add(stall);marketStalls.push(stall);
}
// Two-lane daytime JJ Market: fabric canopy, rough pavement and pedestrian-only hazards.
// Shared canvas-striped tarpaulin: three market awning palettes, zero downloaded assets.
// Weathered, stitched Chatuchak tarpaulin: three shared PBR canvases, baked once.
// Fabric folds, sun-faded stripes, rain staining and weave grain replace flat toy-like tents.
const tentPalettes=[['#e2d5ae','#ae825c'],['#d8d9c6','#6f9385'],['#e4c6b6','#b77770']];
const tentColors=tentPalettes.map(([light,dark],variant)=>{
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
 const ctx=canvas.getContext('2d');ctx.fillStyle=light;ctx.fillRect(0,0,256,256);
 for(let x=0;x<256;x+=64){
  ctx.fillStyle=dark;ctx.fillRect(x,0,32,256);
  // The narrow highlight and edge shadow suggest folds without extra geometry.
  const fold=ctx.createLinearGradient(x,0,x+64,0);
  fold.addColorStop(0,'rgba(30,26,22,.24)');
  fold.addColorStop(.19,'rgba(255,249,225,.12)');
  fold.addColorStop(.47,'rgba(0,0,0,.10)');
  fold.addColorStop(.72,'rgba(255,252,228,.16)');
  fold.addColorStop(1,'rgba(34,30,24,.23)');
  ctx.fillStyle=fold;ctx.fillRect(x,0,64,256);
 }
 // Reproducible small-scale dirt and canvas fibers; never redrawn per frame.
 let seed=(variant+1)*2317;
 const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<1700;i++){
  const px=rand()*256,py=rand()*256,grain=rand();
  ctx.fillStyle=grain<.55?'rgba(64,53,43,.095)':'rgba(255,251,224,.13)';
  ctx.fillRect(px,py,1+rand()*1.5,.5+rand()*1.2);
 }
 for(let i=0;i<85;i++){
  const px=rand()*256,py=rand()*256;
  ctx.fillStyle='rgba(79,66,49,.07)';
  ctx.fillRect(px,py,2+rand()*8,1+rand()*3);
 }
 const edgeWear=ctx.createLinearGradient(0,0,0,256);
 edgeWear.addColorStop(0,'rgba(54,46,37,.21)');
 edgeWear.addColorStop(.13,'rgba(54,46,37,0)');
 edgeWear.addColorStop(.83,'rgba(54,46,37,0)');
 edgeWear.addColorStop(1,'rgba(54,46,37,.27)');
 ctx.fillStyle=edgeWear;ctx.fillRect(0,0,256,256);
 ctx.strokeStyle='rgba(59,52,45,.31)';ctx.lineWidth=1.5;
 for(let x=0;x<=256;x+=32){
  ctx.setLineDash([3,5]);ctx.beginPath();ctx.moveTo(x+.5,0);ctx.lineTo(x+.5,256);ctx.stroke();
 }
 ctx.setLineDash([]);
 for(const y of [7,249]){
  ctx.strokeStyle='rgba(240,229,200,.43)';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(256,y);ctx.stroke();
 }
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=2;
 return new THREE.MeshStandardMaterial({map:texture,roughness:.94,metalness:0,side:THREE.DoubleSide});
});
// One shared pitched canvas roof replaces 16 flat toy-block slabs.
// Ridge, gentle longitudinal sag and hanging fabric hems are baked into a
// single double-sided mesh; no extra draw calls, textures or frame-time work.
function makeMarketTentRoofGeometry(){
 const xs=[-4.85,-2.425,0,2.425,4.85];
 const zs=[-5.25,-2.625,0,2.625,5.25];
 const rise=[-.08,.13,.31,.13,-.08];
 const positions=[],uvs=[],indices=[];
 const vertex=(x,y,z,u,v)=>{
  positions.push(x,y,z);uvs.push(u,v);return positions.length/3-1;
 };
 const roofY=(xi,zi)=>rise[xi]-.05*(1-Math.abs(zs[zi])/5.25);
 for(let zi=0;zi<zs.length;zi++)for(let xi=0;xi<xs.length;xi++){
  vertex(xs[xi],roofY(xi,zi),zs[zi],xi/4,zi/4);
 }
 for(let zi=0;zi<4;zi++)for(let xi=0;xi<4;xi++){
  const a=zi*5+xi,b=a+1,c=a+5,d=c+1;
  indices.push(a,c,b,b,c,d);
 }
 // Side and end valances are part of the same geometry, not separate meshes.
 const hem=(ax,ay,az,bx,by,bz,u0,u1)=>{
  const a=vertex(ax,ay,az,u0,0),b=vertex(bx,by,bz,u1,0);
  const c=vertex(ax,ay-.24,az,u0,1),d=vertex(bx,by-.24,bz,u1,1);
  indices.push(a,c,b,b,c,d);
 };
 for(let zi=0;zi<4;zi++)for(const xi of [0,4]){
  hem(xs[xi],roofY(xi,zi),zs[zi],xs[xi],roofY(xi,zi+1),zs[zi+1],zi/4,(zi+1)/4);
 }
 for(let xi=0;xi<4;xi++)for(const zi of [0,4]){
  hem(xs[xi],roofY(xi,zi),zs[zi],xs[xi+1],roofY(xi+1,zi),zs[zi],xi/4,(xi+1)/4);
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
 geometry.setIndex(indices);geometry.computeVertexNormals();
 return geometry;
}
const tentRoofGeometry=makeMarketTentRoofGeometry();

 // JJ Market: 16 overhead tarpaulin canopies cast a single batched, soft shadow
 // onto the road. A 128px baked alpha mask replaces 16 real-time shadow maps.
 // The centre remains readable for dodge hazards; no collision geometry changes.
 const marketShadeCanvas=document.createElement('canvas');
 marketShadeCanvas.width=marketShadeCanvas.height=128;
 const marketShadeCtx=marketShadeCanvas.getContext('2d');
 const marketShadeFalloff=marketShadeCtx.createRadialGradient(64,64,14,64,64,88);
 marketShadeFalloff.addColorStop(0,'rgba(14,18,21,.64)');
 marketShadeFalloff.addColorStop(.58,'rgba(14,18,21,.48)');
 marketShadeFalloff.addColorStop(.84,'rgba(14,18,21,.18)');
 marketShadeFalloff.addColorStop(1,'rgba(14,18,21,0)');
 marketShadeCtx.fillStyle=marketShadeFalloff;
 marketShadeCtx.fillRect(0,0,128,128);
 // Soft fabric-panel seams give the shade a broad, non-uniform silhouette.
 marketShadeCtx.fillStyle='rgba(8,12,16,.055)';
 for(let seam=32;seam<128;seam+=32)marketShadeCtx.fillRect(seam-2,12,4,104);
 const marketShadeTexture=new THREE.CanvasTexture(marketShadeCanvas);
 marketShadeTexture.colorSpace=THREE.SRGBColorSpace;
 marketShadeTexture.minFilter=THREE.LinearFilter;
 marketShadeTexture.magFilter=THREE.LinearFilter;
 const marketShadeMaterial=new THREE.MeshBasicMaterial({
  map:marketShadeTexture,transparent:true,opacity:.48,depthWrite:false,
  polygonOffset:true,polygonOffsetFactor:-1,side:THREE.DoubleSide
 });
 const marketCanopyShadows=new THREE.InstancedMesh(
  new THREE.PlaneGeometry(8.9,9.6),marketShadeMaterial,16
 );
 marketCanopyShadows.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
 marketCanopyShadows.frustumCulled=false;
 marketCanopyShadows.visible=false;
 marketCanopyShadows.renderOrder=2;
 const marketShadePose=new THREE.Object3D();
 marketShadePose.rotation.x=-Math.PI/2;
 scene.add(marketCanopyShadows);

// Galvanized tubular JJ-market tent frames: four upright poles and four
// eaves rails per canopy. One PBR instanced draw call replaces four box poles;
// all horizontal rails are above the tuk-tuk's driving clearance.
const tentFrameGeometry=new THREE.CylinderGeometry(.052,.052,1,8);
const tentFrameMaterial=new THREE.MeshStandardMaterial({color:0x777e7c,metalness:.64,roughness:.72});
const tentFrameUp=new THREE.Vector3(0,1,0);
for(let n=0;n<16;n++){
 const tent=new THREE.Group();
 const canopy=new THREE.Mesh(tentRoofGeometry,tentColors[n%3]);canopy.position.set(0,5.15,0);tent.add(canopy);
 const frame=new THREE.InstancedMesh(tentFrameGeometry,tentFrameMaterial,8);
 const framePose=new THREE.Object3D();
 let frameIndex=0;
 function frameTube(ax,ay,az,bx,by,bz){
  const delta=new THREE.Vector3(bx-ax,by-ay,bz-az),length=delta.length();
  if(length<.001)throw Error('Invalid JJ canopy frame tube');
  framePose.position.set((ax+bx)*.5,(ay+by)*.5,(az+bz)*.5);
  framePose.quaternion.setFromUnitVectors(tentFrameUp,delta.multiplyScalar(1/length));
  framePose.scale.set(1,length,1);framePose.updateMatrix();
  frame.setMatrixAt(frameIndex++,framePose.matrix);
 }
 for(const side of [-1,1])for(const dz of [-4.7,4.7])
  frameTube(side*4.7,.05,dz,side*4.7,5.02,dz);
 // Roof perimeter bracing follows the canvas eaves, clear of the road below.
 for(const dz of [-4.7,4.7])frameTube(-4.7,5.02,dz,4.7,5.02,dz);
 for(const side of [-1,1])frameTube(side*4.7,5.02,-4.7,side*4.7,5.02,4.7);
 if(frameIndex!==8)throw Error('JJ canopy frame instance count mismatch');
 frame.instanceMatrix.needsUpdate=true;frame.computeBoundingSphere();
 tent.add(frame);
 tent.position.z=-12-n*12;tent.userData.startZ=tent.position.z;tent.visible=false;scene.add(tent);marketCanopies.push(tent);
 const bump=cube(2.1,.045,1.4,mat(n%2?0x827d72:0xaaa397),n%2?-1.5:1.4,.12,-15-n*11);
 bump.userData.startZ=bump.position.z;bump.visible=false;scene.add(bump);marketBumps.push(bump);
}
const pedestrianSkin=mat(0xe4af8e),pedestrianPants=mat(0x414a63),pedestrianClothes=[mat(0xf59c62),mat(0x4b9bb1),mat(0xc75b9e),mat(0x79a969),mat(0xe3c75c)];
// Chatuchak shoppers: shaped shoulders, waist and tapered limbs replace block
// silhouettes. All 64 shoppers still render in just four instanced draw calls;
// geometry/materials are shared and no lights, textures or network assets added.
function makeMarketCrowdTorsoGeometry(){
 const rings=[
  {y:-.36,w:.205,d:.135}, // waist
  {y:.07,w:.265,d:.17},   // chest
  {y:.27,w:.29,d:.155},  // shoulders
  {y:.36,w:.17,d:.12}    // collar, beneath the head
 ];
 const positions=[],indices=[];
 for(const ring of rings){
  for(const [sx,sz] of [[-1,-1],[1,-1],[1,1],[-1,1]])
   positions.push(sx*ring.w,ring.y,sz*ring.d);
 }
 for(let r=0;r<rings.length-1;r++)for(let k=0;k<4;k++){
  const a=r*4+k,b=r*4+(k+1)%4,c=(r+1)*4+k,d=(r+1)*4+(k+1)%4;
  indices.push(a,c,b,b,c,d);
 }
 indices.push(0,1,2,0,2,3);
 const top=(rings.length-1)*4;
 indices.push(top,top+2,top+1,top,top+3,top+2);
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.setIndex(indices);geometry.computeVertexNormals();
 return geometry;
}
// JJ Market shoppers: instanced hair silhouettes and varied skin tones replace
// identical bald mannequin heads. One additional draw call, no new textures.
const marketCrowdSkin=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.88,metalness:0});
const marketCrowdHairMaterial=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.9,metalness:0,side:THREE.DoubleSide});
const marketCrowdFabric=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.93,metalness:0});
const marketCrowdDenim=new THREE.MeshStandardMaterial({color:0x414a63,roughness:.96,metalness:0});
const marketCrowdCount=marketStalls.length*2,marketCrowdDummy=new THREE.Object3D();
const marketCrowdHeads=new THREE.InstancedMesh(new THREE.SphereGeometry(.25,9,7),marketCrowdSkin,marketCrowdCount);
const marketCrowdHair=new THREE.InstancedMesh(new THREE.SphereGeometry(.258,9,7,0,Math.PI*2,0,Math.PI*.56),marketCrowdHairMaterial,marketCrowdCount);
const marketCrowdShirts=new THREE.InstancedMesh(makeMarketCrowdTorsoGeometry(),marketCrowdFabric,marketCrowdCount);
const marketCrowdLegs=new THREE.InstancedMesh(new THREE.CylinderGeometry(.095,.075,.66,7),marketCrowdDenim,marketCrowdCount*2);
const marketCrowdArms=new THREE.InstancedMesh(new THREE.CylinderGeometry(.085,.065,.57,7),marketCrowdSkin,marketCrowdCount*2);
const marketCrowdMeshes=[marketCrowdHeads,marketCrowdHair,marketCrowdShirts,marketCrowdLegs,marketCrowdArms];
for(const mesh of marketCrowdMeshes){mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;mesh.visible=false;scene.add(mesh);}
const marketCrowdColors=[0xf59c62,0x4b9bb1,0xc75b9e,0x79a969,0xe3c75c].map(hex=>new THREE.Color(hex));
const marketCrowdSkinTones=[0xe5b18e,0xc78c6e,0xf0c6a2,0xb77959,0xdba17c].map(hex=>new THREE.Color(hex));
const marketCrowdHairTones=[0x181718,0x30251f,0x473228,0x22242b,0x554437].map(hex=>new THREE.Color(hex));
for(let i=0;i<marketCrowdCount;i++){
 marketCrowdShirts.setColorAt(i,marketCrowdColors[(i*7+Math.floor(i/2))%marketCrowdColors.length]);
 const skin=marketCrowdSkinTones[(i*3+Math.floor(i/2))%marketCrowdSkinTones.length];
 marketCrowdHeads.setColorAt(i,skin);
 marketCrowdHair.setColorAt(i,marketCrowdHairTones[(i*7+Math.floor(i/3))%marketCrowdHairTones.length]);
 marketCrowdArms.setColorAt(i*2,skin);marketCrowdArms.setColorAt(i*2+1,skin);
}
for(const mesh of [marketCrowdShirts,marketCrowdHeads,marketCrowdHair,marketCrowdArms])mesh.instanceColor.needsUpdate=true;
function updateMarketCrowd(t,canalActive){
 const put=(mesh,index,px,py,pz,angle,size)=>{
  marketCrowdDummy.position.set(px,py,pz);marketCrowdDummy.rotation.set(angle,0,0);
  marketCrowdDummy.scale.setScalar(size);marketCrowdDummy.updateMatrix();
  mesh.setMatrixAt(index,marketCrowdDummy.matrix);
 };
 for(let i=0;i<marketCrowdCount;i++){
  const stall=marketStalls[i>>1],side=stall.children[0].position.x>0?1:-1,offset=i%2;
  const x=side*(4.05+offset*.38),z=stall.position.z+(offset?-1.05:1.05);
  const step=Math.sin(t*.004+i*1.7),bob=Math.abs(step)*.045;
  // At 10,000 points the right-hand shops become canal, so their shoppers leave too.
  const size=canalActive&&side>0?.001:1;
  put(marketCrowdHeads,i,x,1.82+bob,z,0,size);
  put(marketCrowdHair,i,x,1.84+bob,z,0,size);
  put(marketCrowdShirts,i,x,1.22+bob,z,0,size);
  for(let leg=0;leg<2;leg++){
   const sign=leg?1:-1,j=i*2+leg;
   put(marketCrowdLegs,j,x+sign*.16,.47+bob,z+sign*.04,sign*step*.16,size);
   put(marketCrowdArms,j,x+sign*.36,1.18+bob,z-sign*.04,-sign*step*.2,size);
  }
 }
 for(const mesh of marketCrowdMeshes)mesh.instanceMatrix.needsUpdate=true;
}
// JJ Market hazard walkers share all rounded geometry and PBR materials.
// Tapered clothing, articulated limbs, hair, shoes and bags replace toy cubes.
// Each spawn creates only Object3D transforms; geometry and materials stay cached.
const walkerTorsoGeometry=makeMarketCrowdTorsoGeometry();
const walkerHeadGeometry=new THREE.SphereGeometry(.245,12,9);
const walkerHairGeometry=new THREE.SphereGeometry(.253,12,9,0,Math.PI*2,0,Math.PI*.57);
const walkerNeckGeometry=new THREE.CylinderGeometry(.075,.085,.15,9);
const walkerArmGeometry=new THREE.CylinderGeometry(.093,.066,.6,9);
const walkerLegGeometry=new THREE.CylinderGeometry(.115,.083,.67,9);
const walkerHandGeometry=new THREE.SphereGeometry(.086,9,7);
const walkerShoeGeometry=new THREE.SphereGeometry(1,10,8);
const walkerBagGeometry=new THREE.SphereGeometry(1,10,8);
const walkerHatGeometry=new THREE.SphereGeometry(.263,12,8,0,Math.PI*2,0,Math.PI*.48);
const walkerBrimGeometry=new THREE.CylinderGeometry(.31,.31,.025,12);
const walkerSkinMaterials=marketCrowdSkinTones.map(color=>new THREE.MeshStandardMaterial({color,roughness:.87,metalness:0}));
const walkerHairMaterials=marketCrowdHairTones.map(color=>new THREE.MeshStandardMaterial({color,roughness:.95,metalness:0,side:THREE.DoubleSide}));
const walkerShoeMaterial=new THREE.MeshStandardMaterial({color:0x26292b,roughness:.92,metalness:0});
const walkerBagMaterials=[0x77634b,0x484d46,0x95664a].map(color=>new THREE.MeshStandardMaterial({color,roughness:.91,metalness:0}));
const walkerHatMaterial=new THREE.MeshStandardMaterial({color:0xaaa184,roughness:.94,metalness:0});
function makeMarketWalker(style){
 const g=new THREE.Group(),variant=style%5;
 const skin=walkerSkinMaterials[(variant*3+1)%walkerSkinMaterials.length];
 const hair=walkerHairMaterials[(variant*2+1)%walkerHairMaterials.length];
 const torso=new THREE.Mesh(walkerTorsoGeometry,pedestrianClothes[variant]);
 torso.position.y=1.3;g.add(torso);
 const neck=new THREE.Mesh(walkerNeckGeometry,skin);neck.position.y=1.69;g.add(neck);
 const head=new THREE.Mesh(walkerHeadGeometry,skin);head.position.y=1.88;g.add(head);
 const hairCap=new THREE.Mesh(walkerHairGeometry,hair);hairCap.position.y=1.88;g.add(hairCap);
 const legs=[],arms=[];
 for(const side of [-1,1]){
  // Hip and shoulder pivots animate without creating or disposing geometry.
  const leg=new THREE.Group();leg.position.set(side*.15,.95,0);
  const trouser=new THREE.Mesh(walkerLegGeometry,pedestrianPants);
  trouser.position.y=-.335;leg.add(trouser);
  const shoe=new THREE.Mesh(walkerShoeGeometry,walkerShoeMaterial);
  shoe.position.set(0,-.735,.09);shoe.scale.set(.135,.105,.235);leg.add(shoe);
  g.add(leg);legs.push(leg);
  const arm=new THREE.Group();arm.position.set(side*.31,1.54,0);
  const sleeve=new THREE.Mesh(walkerArmGeometry,pedestrianClothes[variant]);
  sleeve.position.set(side*.025,-.3,0);arm.add(sleeve);
  const hand=new THREE.Mesh(walkerHandGeometry,skin);
  hand.position.set(side*.035,-.63,0);arm.add(hand);
  g.add(arm);arms.push(arm);
 }
 // A market cap or practical shopping bag gives each silhouette a distinct profile.
 if(variant===2){
  const cap=new THREE.Mesh(walkerHatGeometry,walkerHatMaterial);
  cap.position.y=1.945;g.add(cap);
  const brim=new THREE.Mesh(walkerBrimGeometry,walkerHatMaterial);
  brim.position.set(0,2.035,.14);g.add(brim);
 }
 if(variant===3||variant===4){
  const bag=new THREE.Mesh(walkerBagGeometry,walkerBagMaterials[variant===3?0:2]);
  bag.position.set(variant===3?.46:-.45,1.01,.06);
  bag.scale.set(.24,.32,.18);g.add(bag);
 }
 g.userData.walkLegs=legs;g.userData.walkArms=arms;
 return g;
}
// Reusable Chatuchak fruit cart: curved striped canvas, open metal frame,
// tyre/hub instancing and real fruit silhouettes replace the toy-block cart.
let fruitCartTemplate=null;
function makeFruitPushcart(){
 if(fruitCartTemplate)return fruitCartTemplate.clone(true);
 const g=new THREE.Group();
 const wood=new THREE.MeshStandardMaterial({color:0x936c46,roughness:.87});
 const steel=new THREE.MeshStandardMaterial({color:0x636d70,roughness:.47,metalness:.68});
 const rubber=new THREE.MeshStandardMaterial({color:0x202327,roughness:.94});
 const hubMetal=new THREE.MeshStandardMaterial({color:0xb7b5a7,roughness:.38,metalness:.75});
 g.add(cube(1.48,.09,.98,steel,0,.78,0));
 g.add(cube(1.50,.12,1.00,wood,0,.88,0));
 for(let i=0;i<5;i++)g.add(cube(1.42,.025,.055,wood,0,.967,-.4+i*.2));
 for(const side of [-1,1]){
  g.add(cube(.055,.16,1.01,steel,side*.74,1.0,0));
  for(const z of [-.39,.39])rod(g,[side*.61,.72,z],[side*.61,.24,z],.035,steel);
  rod(g,[side*.68,.94,.46],[side*.73,1.37,.63],.035,steel);
 }
 rod(g,[-.73,1.37,.63],[.73,1.37,.63],.04,steel);
 // Four tyres and four hubs take two instanced draw calls.
 const tyres=new THREE.InstancedMesh(new THREE.TorusGeometry(.22,.07,8,16),rubber,4);
 const hubs=new THREE.InstancedMesh(new THREE.CylinderGeometry(.085,.085,.055,12),hubMetal,4);
 const pose=new THREE.Object3D();let wheelIndex=0;
 for(const side of [-1,1])for(const z of [-.37,.37]){
  pose.position.set(side*.8,.28,z);pose.rotation.set(0,Math.PI/2,0);
  pose.scale.set(1,1,1);pose.updateMatrix();tyres.setMatrixAt(wheelIndex,pose.matrix);
  pose.rotation.set(0,0,Math.PI/2);pose.updateMatrix();hubs.setMatrixAt(wheelIndex,pose.matrix);
  wheelIndex++;
 }
 tyres.instanceMatrix.needsUpdate=true;hubs.instanceMatrix.needsUpdate=true;
 tyres.computeBoundingSphere();hubs.computeBoundingSphere();g.add(tyres,hubs);
 // One canvas-textured, pitched striped fabric roof; no extra lights or downloads.
 const clothCanvas=document.createElement('canvas');clothCanvas.width=64;clothCanvas.height=64;
 const cc=clothCanvas.getContext('2d');cc.fillStyle='#eee1c9';cc.fillRect(0,0,64,64);
 cc.fillStyle='#a73535';cc.fillRect(0,0,32,64);
 for(let i=0;i<64;i+=4){cc.fillStyle='rgba(44,26,19,.045)';cc.fillRect(0,i,64,1)}
 const clothTex=new THREE.CanvasTexture(clothCanvas);clothTex.colorSpace=THREE.SRGBColorSpace;
 clothTex.wrapS=THREE.RepeatWrapping;clothTex.repeat.set(4,1);clothTex.anisotropy=mobile?2:4;
 const cloth=new THREE.MeshStandardMaterial({map:clothTex,roughness:.98,side:THREE.DoubleSide});
 const verts=[],uv=[],indices=[],segments=8;
 for(let j=0;j<=1;j++)for(let i=0;i<=segments;i++){
  const x=-.96+i*1.92/segments,edge=Math.abs(x)/.96;
  verts.push(x,2.27-.23*Math.pow(edge,1.45),j?-.68:.68);uv.push(i/segments,j);
 }
 for(let i=0;i<segments;i++){
  const a=i,b=i+1,c=i+segments+1,d=i+segments+2;indices.push(a,c,b,b,c,d);
 }
 const roofGeo=new THREE.BufferGeometry();
 roofGeo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
 roofGeo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 roofGeo.setIndex(indices);roofGeo.computeVertexNormals();g.add(new THREE.Mesh(roofGeo,cloth));
 for(const side of [-1,1])for(const z of [-.56,.56])
  rod(g,[side*.7,.97,z],[side*.7,2.12,z],.023,steel);
 const valance=new THREE.Mesh(new THREE.PlaneGeometry(1.92,.18),cloth);
 valance.position.set(0,1.97,.685);g.add(valance);
 // 24 mango, citrus and guava shapes in only three instanced draw calls.
 const fruitGeometry=new THREE.SphereGeometry(1,12,9);
 const produce=[{color:0xd5a32b,scale:[.15,.13,.19]},
  {color:0x6b943b,scale:[.13,.17,.13]},{color:0xe17a3d,scale:[.13,.13,.13]}];
 for(let k=0;k<produce.length;k++){
  const item=produce[k],material=new THREE.MeshStandardMaterial({color:item.color,roughness:.79});
  const fruits=new THREE.InstancedMesh(fruitGeometry,material,8);
  for(let i=0;i<8;i++){
   const slot=k*8+i;
   pose.position.set(((slot%6)-2.5)*.235,1.14+(slot%3)*.035,(Math.floor(slot/6)-1.5)*.21);
   pose.rotation.set(.13*(slot%3),.55*slot,.09*(slot%4));
   pose.scale.set(...item.scale);pose.updateMatrix();fruits.setMatrixAt(i,pose.matrix);
  }
  fruits.instanceMatrix.needsUpdate=true;fruits.computeBoundingSphere();g.add(fruits);
 }
 fruitCartTemplate=g;return g.clone(true);
}
// Shared PBR coat and low-poly anatomical geometry for canal-side soi dogs.
// These replace the rectangular toy-block body, ears and legs without changing
// the existing dog charge, collision radius, steering or animation interfaces.
const dogCoatCanvas=document.createElement('canvas');
dogCoatCanvas.width=dogCoatCanvas.height=128;
const dogCoatCtx=dogCoatCanvas.getContext('2d');
dogCoatCtx.fillStyle='#b9a58d';dogCoatCtx.fillRect(0,0,128,128);
for(let i=0;i<440;i++){
 const px=(i*73+Math.floor(i/17)*19)%128,py=(i*41+Math.floor(i/13)*31)%128;
 dogCoatCtx.fillStyle=i%3===0?'rgba(59,41,28,.15)':'rgba(248,226,189,.13)';
 dogCoatCtx.fillRect(px,py,1+i%2,1);
}
const dogCoatTexture=new THREE.CanvasTexture(dogCoatCanvas);
dogCoatTexture.colorSpace=THREE.SRGBColorSpace;
dogCoatTexture.anisotropy=2;
const dogFur=new THREE.MeshStandardMaterial({map:dogCoatTexture,color:0xe0c3a0,roughness:.94,metalness:0});
const dogEar=new THREE.MeshStandardMaterial({color:0x604734,roughness:.96});
const dogNose=new THREE.MeshStandardMaterial({color:0x25211f,roughness:.72});
const dogOvalGeometry=new THREE.SphereGeometry(1,12,9);
const dogEarGeometry=new THREE.ConeGeometry(.12,.29,7);
const dogLegGeometry=new THREE.CapsuleGeometry(.09,.25,3,7);
const dogTailGeometry=new THREE.CylinderGeometry(.055,.09,.38,7);
const policeBrown=mat(0x765642),policeVest=mat(0xc9db58);
function makeMarketDog(){
 const g=new THREE.Group(),legs=[];
 const oval=(material,x,y,z,sx,sy,sz)=>{
  const mesh=new THREE.Mesh(dogOvalGeometry,material);
  mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);g.add(mesh);return mesh;
 };
 // A low-slung street-dog torso, forward neck, defined muzzle and black nose.
 oval(dogFur,0,.68,0,.37,.29,.57);
 oval(dogFur,0,.87,-.48,.3,.29,.32);
 oval(dogFur,0,.75,-.79,.19,.14,.24);
 oval(dogNose,0,.79,-1.005,.083,.062,.066);
 // Both ears and eyes are instanced, so they cost two draws, not four.
 const ears=new THREE.InstancedMesh(dogEarGeometry,dogEar,2);
 const eyes=new THREE.InstancedMesh(dogOvalGeometry,dogNose,2);
 const pose=new THREE.Object3D();
 for(let i=0;i<2;i++){
  const side=i===0?-1:1;
  pose.position.set(side*.225,1.16,-.58);
  pose.rotation.set(-.14,0,side*.19);
  pose.scale.set(1,1,1);pose.updateMatrix();ears.setMatrixAt(i,pose.matrix);
  pose.position.set(side*.185,.955,-.756);
  pose.rotation.set(0,0,0);pose.scale.set(.054,.059,.043);
  pose.updateMatrix();eyes.setMatrixAt(i,pose.matrix);
 }
 ears.instanceMatrix.needsUpdate=true;eyes.instanceMatrix.needsUpdate=true;
 ears.computeBoundingSphere();eyes.computeBoundingSphere();
 g.add(ears,eyes);
 // Animate shoulder/hip pivots rather than rotating each entire leg at its centre.
 for(const side of [-1,1])for(const z of [-.35,.36]){
  const pivot=new THREE.Group();pivot.position.set(side*.25,.56,z);
  const limb=new THREE.Mesh(dogLegGeometry,dogFur);
  limb.position.y=-.25;pivot.add(limb);g.add(pivot);legs.push(pivot);
 }
 const tail=new THREE.Group();tail.position.set(0,.76,.53);
 const tailMesh=new THREE.Mesh(dogTailGeometry,dogFur);
 tailMesh.rotation.x=1.16;tailMesh.position.set(0,.08,.18);
 tail.add(tailMesh);g.add(tail);
 g.userData.runningLegs=legs;g.userData.runningTail=tail;
 return g;
}
function makeMarketPolice(){const g=makeMarketWalker(1);g.children[1].material=policeBrown;g.add(cube(.66,.28,.35,policeVest,0,1.47,-.02));g.add(cube(.6,.12,.44,policeBrown,0,2.09,0));return g;}
let marketPedestrianIndex=0;
// Expressway hazards use a single lane per wave, preserving a clear dodge route.
let expresswayWave=0;
const expresswaySet=new THREE.Group();scene.add(expresswaySet);
// Shared PBR skyline, Thai gantries and moving lamp posts; only visible beyond 12,000 points.
const expresswayArt=createExpresswayArt(THREE);scene.add(expresswayArt.group);
const expresswayConcrete=mat(0x9296a4),expresswaySteel=mat(0x3b5366);
for(const side of [-1,1]){const rail=cube(.3,.85,210,expresswayConcrete,side*4.35,.6,-90);expresswaySet.add(rail);for(let n=0;n<10;n++)expresswaySet.add(cube(.15,.45,1.5,expresswaySteel,side*4.35,1.2,-n*21));}
// Shared PBR saucer and instanced navigation lamps: no dynamic lights or per-frame textures.
const ufo=new THREE.Group();
const hullMetal=new THREE.MeshStandardMaterial({color:0x8499a8,metalness:.82,roughness:.3});
const hullDark=new THREE.MeshStandardMaterial({color:0x263443,metalness:.75,roughness:.45});
const domeGlass=new THREE.MeshStandardMaterial({color:0x146b83,metalness:.4,roughness:.17,emissive:0x0a738b,emissiveIntensity:.85});
const rimGlow=new THREE.MeshBasicMaterial({color:0x2ae9f1,toneMapped:false});
const hull=new THREE.Mesh(new THREE.SphereGeometry(2.25,28,12),hullMetal);hull.scale.y=.23;ufo.add(hull);
const belly=new THREE.Mesh(new THREE.SphereGeometry(1.73,24,10),hullDark);belly.scale.y=.22;belly.position.y=-.25;ufo.add(belly);
const dome=new THREE.Mesh(new THREE.SphereGeometry(1.08,24,12),domeGlass);dome.scale.y=.68;dome.position.y=.37;ufo.add(dome);
const rim=new THREE.Mesh(new THREE.TorusGeometry(2.17,.075,6,36),rimGlow);rim.rotation.x=Math.PI/2;ufo.add(rim);
const lamps=new THREE.InstancedMesh(new THREE.SphereGeometry(.105,7,5),rimGlow,12);
const lampTransform=new THREE.Object3D();
for(let i=0;i<12;i++){const a=i*Math.PI/6;lampTransform.position.set(Math.cos(a)*2.04,-.08,Math.sin(a)*2.04);lampTransform.updateMatrix();lamps.setMatrixAt(i,lampTransform.matrix);}
lamps.instanceMatrix.needsUpdate=true;lamps.frustumCulled=false;ufo.add(lamps);
ufo.position.set(0,13,-42);expresswaySet.add(ufo);
// Shared laser template: bright core, translucent halo, and 1.2m ground warning.
// All geometry/materials are reused between waves; the opposite lane stays open.
const laserGround=new THREE.MeshBasicMaterial({color:0xff294b,transparent:true,opacity:.6,depthWrite:false,side:THREE.DoubleSide});
const laserCore=new THREE.MeshBasicMaterial({color:0xffc1c5,toneMapped:false});
const laserHalo=new THREE.MeshBasicMaterial({color:0xff234e,transparent:true,opacity:.23,depthWrite:false,side:THREE.DoubleSide});
const expresswayLaserTemplate=new THREE.Group();
expresswayLaserTemplate.add(cube(1.2,.035,7,laserGround,0,.065,0));
const beamCore=new THREE.Mesh(new THREE.CylinderGeometry(.085,.085,9,8),laserCore);beamCore.position.y=4.5;expresswayLaserTemplate.add(beamCore);
const beamHalo=new THREE.Mesh(new THREE.CylinderGeometry(.42,.42,9,10,1,true),laserHalo);beamHalo.position.y=4.5;expresswayLaserTemplate.add(beamHalo);
// Lazy templates share geometry and PBR materials across hazard waves (no per-spawn GPU uploads).
let expresswayVehicleTemplates=null;
// Optional local glTF bus replaces the procedural bus only after validated loading.
 // Failed or slow asset loads retain the original playable PBR fallback.
 let optimizedExpresswayBus=null;
 let expresswayBusLoadQueued=false;
 const EXPRESSWAY_BUS_GLTF='./assets/bangkok-city-bus.gltf';
 // Start loading only once play reaches JJ Market, ahead of the 12000-point
 // expressway. The first frame stays free of unnecessary glTF parsing and
 // texture decoding. Data-saver users keep the procedural bus instead.
 function queueExpresswayBusModel(){
  if(expresswayBusLoadQueued||navigator.connection?.saveData)return;
  expresswayBusLoadQueued=true;
  new GLTFLoader().load(EXPRESSWAY_BUS_GLTF,({scene:bus})=>{
  try{
   bus.updateMatrixWorld(true);
   const size=new THREE.Box3().setFromObject(bus).getSize(new THREE.Vector3());
   let meshes=0,triangles=0;
   bus.traverse(o=>{
    if(!o.isMesh)return;
    meshes++;
    const g=o.geometry;
    triangles+=(g.index?g.index.count:g.attributes.position.count)/3;
   });
   if(meshes<1||meshes>20||triangles>4500||
      size.x<1.8||size.x>2.6||size.y<2.4||size.y>3.3||
      size.z<4.0||size.z>5.0)return;
   bus.traverse(o=>{if(o.isMesh)o.frustumCulled=true;});
   optimizedExpresswayBus=bus;
   if(expresswayVehicleTemplates)expresswayVehicleTemplates.bus=bus;
  }catch(e){/* Keep the original bus fallback. */}
  },undefined,()=>{/* Keep the original bus fallback. */});
 }
function expresswayVehicle(type){
 if(type==='bus')queueExpresswayBusModel();
 if(!expresswayVehicleTemplates){
  expresswayVehicleTemplates={
   sportsCar:makeExpresswayVehicle(THREE,'sportsCar'),
   bus:optimizedExpresswayBus||makeExpresswayVehicle(THREE,'bus')
  };
 }
 return expresswayVehicleTemplates[type].clone(true);
}

 // Pattaya Walking Street: lightweight night facades with shared PBR neon materials.
 const pattayaStreet=new THREE.Group();scene.add(pattayaStreet);pattayaStreet.visible=false;

 // Two weathered plaster and two layered glass textures shared by twenty shops.
 // All detail is baked at startup: no additional meshes, lights or frame-time painting.
 function pattayaWallMaterial(seed){
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=512;
  const ctx=canvas.getContext('2d'),gradient=ctx.createLinearGradient(0,0,256,512);
  const colors=seed?['#716257','#4d4543','#30323a']:['#59575a','#353841','#222b32'];
  gradient.addColorStop(0,colors[0]);gradient.addColorStop(.55,colors[1]);gradient.addColorStop(1,colors[2]);
  ctx.fillStyle=gradient;ctx.fillRect(0,0,256,512);
  // Stucco grain, rain streaks, soot, patch repairs and concrete floor seams.
  for(let k=0;k<1300;k++){
   const x=(k*73+seed*41)%256,y=(k*137+seed*59)%512;
   ctx.fillStyle=k%4===0?'rgba(12,15,19,.17)':'rgba(211,203,182,.075)';
   ctx.fillRect(x,y,1+k%3,1+k%2);
  }
  for(let k=0;k<65;k++){
   const x=(k*47+seed*17)%256,y=(k*83+seed*29)%470;
   ctx.fillStyle='rgba(12,16,23,.1)';ctx.fillRect(x,y,1+k%2,15+(k*7)%70);
  }
  for(let row=1;row<5;row++){
   const y=row*103+seed*7;
   ctx.fillStyle='rgba(12,16,23,.27)';ctx.fillRect(0,y,256,5);
   ctx.fillStyle='rgba(192,184,164,.15)';ctx.fillRect(0,y+5,256,2);
  }
  for(let k=0;k<14;k++){
   const x=(k*67+seed*23)%236,y=(k*97+seed*11)%480;
   ctx.fillStyle='rgba(177,160,144,.11)';ctx.fillRect(x,y,7+k%13,4+k%19);
  }
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=2;
  return new THREE.MeshStandardMaterial({map,roughness:.91,metalness:.02});
 }
 function pattayaGlassMaterial(seed){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;
  const ctx=canvas.getContext('2d'),interior=ctx.createLinearGradient(0,0,0,256);
  interior.addColorStop(0,seed?'#172734':'#332b31');
  interior.addColorStop(.58,seed?'#1c3542':'#51413a');
  interior.addColorStop(1,'#101c28');
  ctx.fillStyle=interior;ctx.fillRect(0,0,512,256);
  // Shelves and shop silhouettes behind the glazing.
  for(let k=0;k<9;k++){
   const x=17+k*59;
   ctx.fillStyle='rgba(8,12,19,.58)';ctx.fillRect(x,117+(k%3)*11,33,122);
   ctx.fillStyle='rgba(190,145,98,.23)';ctx.fillRect(x+4,153,25,4);
   ctx.fillStyle='rgba(190,145,98,.16)';ctx.fillRect(x+4,192,25,4);
  }
  const lightX=seed?365:145,glow=ctx.createRadialGradient(lightX,45,4,lightX,80,185);
  glow.addColorStop(0,seed?'rgba(78,197,218,.32)':'rgba(255,195,121,.39)');
  glow.addColorStop(1,'rgba(18,36,49,0)');
  ctx.fillStyle=glow;ctx.fillRect(0,0,512,256);
  // Aluminium mullions, lower threshold, glass scratches and faint reflections.
  for(let k=0;k<=4;k++){
   const x=k*128;
   ctx.fillStyle='#161d27';ctx.fillRect(x,0,9,256);
   ctx.fillStyle='rgba(182,194,201,.24)';ctx.fillRect(x+9,0,2,256);
  }
  ctx.fillStyle='rgba(17,23,29,.9)';ctx.fillRect(0,242,512,14);
  for(let k=0;k<35;k++){
   const x=(k*79+seed*41)%506,y=(k*53+seed*17)%240;
   ctx.fillStyle='rgba(172,204,218,.07)';ctx.fillRect(x,y,2,11+k%21);
  }
  for(let k=0;k<4;k++){
   const x=39+k*129,reflection=ctx.createLinearGradient(x,0,x+22,0);
   reflection.addColorStop(0,'rgba(133,184,203,0)');
   reflection.addColorStop(.55,'rgba(159,203,222,.16)');
   reflection.addColorStop(1,'rgba(133,184,203,0)');
   ctx.fillStyle=reflection;ctx.fillRect(x,15,22,218);
  }
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=2;
  return new THREE.MeshStandardMaterial({map,roughness:.27,metalness:.19});
 }
 const pattayaWalls=[pattayaWallMaterial(0),pattayaWallMaterial(1)];
 const pattayaGlazing=[pattayaGlassMaterial(0),pattayaGlassMaterial(1)];

 // Correct street-facing facades: storefronts face inward along X, not toward Z.
 // Four bilingual signs share four baked textures across twenty storefronts.
 const pattayaNeon=[0xff3caa,0x18dfff,0xffd05a,0xa873ff].map(c=>new THREE.MeshStandardMaterial({color:c,emissive:c,emissiveIntensity:1.4,roughness:.38}));
 const pattayaSignCopy=[
  ['WALKING STREET','ถนนคนเดิน','#ff65b9'],
  ['LIVE MUSIC','ดนตรีสด','#48e7ff'],
  ['SEAFOOD','อาหารทะเล','#ffd676'],
  ['PATTAYA NIGHT','พัทยา','#b68bff']
 ];
 const pattayaSigns=pattayaSignCopy.map(([english,thai,color])=>{
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=192;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='#111525';ctx.fillRect(0,0,512,192);
  const panel=ctx.createLinearGradient(0,0,512,0);
  panel.addColorStop(0,'#18202e');panel.addColorStop(.5,'#10131e');panel.addColorStop(1,'#242032');
  ctx.fillStyle=panel;ctx.fillRect(12,12,488,168);
  ctx.strokeStyle=color;ctx.lineWidth=7;ctx.strokeRect(9,9,494,174);
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.shadowColor=color;
  ctx.shadowBlur=12;ctx.fillStyle=color;
  ctx.font='bold 54px Arial, sans-serif';ctx.fillText(english,256,78,468);
  ctx.shadowBlur=8;ctx.font='bold 36px "Noto Sans Thai", sans-serif';
  ctx.fillText(thai,256,143,464);ctx.shadowBlur=0;
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
  return new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide});
 });
 const pattayaShops=[],pattayaSignPlane=new THREE.PlaneGeometry(4.15,1.55);
 for(let i=0;i<20;i++){
  const g=new THREE.Group(),side=i%2?1:-1;
  g.add(cube(4.5,5.4,7,pattayaWalls[i%2],0,2.7,0));
  g.add(cube(.12,2.7,5.7,pattayaGlazing[(i>>1)%2],-side*2.32,1.7,0));
  g.add(cube(.58,.15,6.1,pattayaNeon[i%4],-side*2.48,3.23,0));
  const sign=new THREE.Mesh(pattayaSignPlane,pattayaSigns[i%4]);
  sign.position.set(-side*2.39,4.25,0);sign.rotation.y=-side*Math.PI/2;
  g.add(sign);g.position.set(side*8.7,0,-8-i*9.6);
  pattayaStreet.add(g);pattayaShops.push(g);
 }
 // Instanced neon puddle streaks follow the actual scrolling Pattaya shopfronts.
 // Reuse the existing shared reflection texture: one draw call, zero extra lights.
 const pattayaReflectionMaterial=new THREE.MeshBasicMaterial({
  map:neonReflectionTexture,color:0xffffff,transparent:true,opacity:.34,
  depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide
 });
 const pattayaReflections=new THREE.InstancedMesh(neonReflectionGeometry,pattayaReflectionMaterial,pattayaShops.length);
 pattayaReflections.frustumCulled=false;
 pattayaStreet.add(pattayaReflections);
 const pattayaReflectionDummy=new THREE.Object3D();
 const pattayaReflectionColors=[0xff3caa,0x18dfff,0xffd05a,0xa873ff];
 for(let i=0;i<pattayaShops.length;i++)pattayaReflections.setColorAt(i,new THREE.Color(pattayaReflectionColors[i%4]));
 if(pattayaReflections.instanceColor)pattayaReflections.instanceColor.needsUpdate=true;
 function updatePattayaReflections(){
  for(let i=0;i<pattayaShops.length;i++){
   const shop=pattayaShops[i],side=i%2?1:-1;
   pattayaReflectionDummy.position.set(side*3.65,.079,shop.position.z);
   pattayaReflectionDummy.rotation.set(-Math.PI/2,0,0);
   pattayaReflectionDummy.scale.set(1,1,1);
   pattayaReflectionDummy.updateMatrix();
   pattayaReflections.setMatrixAt(i,pattayaReflectionDummy.matrix);
  }
  pattayaReflections.instanceMatrix.needsUpdate=true;
 }
 updatePattayaReflections();
 let pattayaWave=0;
 const pattayaSkin=new THREE.MeshStandardMaterial({color:0xc99570,roughness:.85});
 const pattayaCloth=new THREE.MeshStandardMaterial({color:0x30344c,roughness:.9});
 const pattayaRainbow=[0xe83e5b,0xff9633,0xf6db4b,0x3abf7b,0x388ef5,0x9856d5].map(c=>new THREE.MeshStandardMaterial({color:c,roughness:.8}));

 // Shared rounded PBR tourist/vendor actors and projectile geometry are built
 // once; each wave clones the template rather than allocating new GPU meshes.
 const pattayaTouristShirt=new THREE.MeshStandardMaterial({color:0x7bb5c8,roughness:.88});
 const pattayaTouristShorts=new THREE.MeshStandardMaterial({color:0x303c52,roughness:.93});
 const pattayaVendorApron=new THREE.MeshStandardMaterial({color:0xdb594b,roughness:.9});
 const pattayaHair=new THREE.MeshStandardMaterial({color:0x171922,roughness:.96});
 const pattayaBottleGlass=new THREE.MeshStandardMaterial({color:0x31734e,roughness:.24,metalness:.1,transparent:true,opacity:.86});
 const pattayaBottleLabel=new THREE.MeshStandardMaterial({color:0xe5d9ac,roughness:.82});
 const pattayaMelonRind=new THREE.MeshStandardMaterial({color:0x257743,roughness:.82});
 const pattayaMelonStripe=new THREE.MeshStandardMaterial({color:0x8ec75c,roughness:.88});
 const pattayaThrowTemplates={};
 function makePattayaThrower(type){
  const root=new THREE.Group(),actor=new THREE.Group(),vendor=type==='watermelon';
  actor.position.x=3.5;root.add(actor);
  const shirt=vendor?pattayaVendorApron:pattayaTouristShirt;
  const torso=new THREE.Mesh(new THREE.CylinderGeometry(.33,.39,1.08,10),shirt);
  torso.position.y=1.27;actor.add(torso);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.32,12,9),pattayaSkin);
  head.position.y=2.1;actor.add(head);
  if(vendor){
   const hair=new THREE.Mesh(new THREE.SphereGeometry(.32,12,8),pattayaHair);
   hair.position.set(0,2.29,.1);hair.scale.set(1,.48,.85);actor.add(hair);
   actor.add(cube(.48,.65,.09,pattayaCloth,0,1.15,-.36));
  }
  for(const side of [-1,1]){
   const leg=new THREE.Mesh(new THREE.CylinderGeometry(.13,.16,.88,8),vendor?pattayaCloth:pattayaTouristShorts);
   leg.position.set(side*.2,.43,0);actor.add(leg);
  }
  const arm=new THREE.Group();arm.name='throwArm';arm.position.set(-.32,1.76,0);
  const sleeve=new THREE.Mesh(new THREE.CylinderGeometry(.115,.09,.68,8),pattayaSkin);
  sleeve.position.set(-.2,-.28,0);sleeve.rotation.z=-.5;arm.add(sleeve);actor.add(arm);
  const projectile=new THREE.Group();projectile.name='throwProjectile';root.add(projectile);
  if(vendor){
   const melon=new THREE.Mesh(new THREE.SphereGeometry(.62,14,10),pattayaMelonRind);
   melon.scale.set(1,1,1.08);projectile.add(melon);
   for(let i=0;i<5;i++){
    const stripe=new THREE.Mesh(new THREE.TorusGeometry(.46-i*.055,.025,5,16),pattayaMelonStripe);
    stripe.rotation.x=Math.PI/2;stripe.position.y=-.22+i*.11;projectile.add(stripe);
   }
  }else{
   const body=new THREE.Mesh(new THREE.CylinderGeometry(.14,.19,.65,10),pattayaBottleGlass);
   projectile.add(body);
   const neck=new THREE.Mesh(new THREE.CylinderGeometry(.065,.08,.24,10),pattayaBottleGlass);
   neck.position.y=.42;projectile.add(neck);
   const label=new THREE.Mesh(new THREE.CylinderGeometry(.191,.192,.15,10),pattayaBottleLabel);
   label.position.y=-.09;projectile.add(label);
  }
  return root;
 }

 // Dark Road: empty roadside, fog, headlamp and instanced reflective markers.
 // A single instanced mesh avoids 28 draw calls on iPhone.
 const darkMarkerGeometry=new THREE.BoxGeometry(.14,.42,.09);
 const darkMarkerMaterial=new THREE.MeshStandardMaterial({color:0xe5e2d5,roughness:.68,metalness:.06});
 const darkRoadMarkers=new THREE.InstancedMesh(darkMarkerGeometry,darkMarkerMaterial,28);
 darkRoadMarkers.frustumCulled=false;darkRoadMarkers.visible=false;scene.add(darkRoadMarkers);
 // Paired roadside retroreflectors: white on the left, amber on the right.
 // 28 tiny PBR faces in ONE instanced draw call; they brighten only when
 // reached by the existing moving headlight, preserving the unlit darkness.
 const darkReflectorGeometry=new THREE.PlaneGeometry(.11,.13);
 const darkReflectorMaterial=new THREE.MeshStandardMaterial({
  color:0xffffff,roughness:.32,metalness:.08,emissive:0x181818,emissiveIntensity:.2,
  side:THREE.DoubleSide
 });
 const darkRoadReflectors=new THREE.InstancedMesh(darkReflectorGeometry,darkReflectorMaterial,28);
 darkRoadReflectors.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
 for(let i=0;i<28;i++)darkRoadReflectors.setColorAt(i,new THREE.Color(i%2?0xffb457:0xeaf3ff));
 darkRoadReflectors.instanceColor.needsUpdate=true;
 darkRoadReflectors.frustumCulled=false;darkRoadReflectors.visible=false;
 scene.add(darkRoadReflectors);
 const darkMarkerPose=new THREE.Object3D(),darkMarkerZ=Array.from({length:14},(_,i)=>9-i*8);
 function updateDarkRoadMarkers(distance){
  for(let i=0;i<darkMarkerZ.length;i++){
   darkMarkerZ[i]+=distance;
   if(darkMarkerZ[i]>20)darkMarkerZ[i]-=112;
   for(let side=0;side<2;side++){
    darkMarkerPose.position.set(side?5.52:-5.52,.36,darkMarkerZ[i]);
    darkMarkerPose.rotation.set(0,0,0);darkMarkerPose.scale.set(1,1,1);
    darkMarkerPose.updateMatrix();darkRoadMarkers.setMatrixAt(i*2+side,darkMarkerPose.matrix);
    // The reflector is mounted on the front face, safely outside both lanes.
    darkMarkerPose.position.y=.44;
    darkMarkerPose.position.z+=.051;
    darkMarkerPose.updateMatrix();
    darkRoadReflectors.setMatrixAt(i*2+side,darkMarkerPose.matrix);
   }
  }
  darkRoadMarkers.instanceMatrix.needsUpdate=true;
  darkRoadReflectors.instanceMatrix.needsUpdate=true;
 }
 updateDarkRoadMarkers(0);

// Dark Road roadside scrub: crossed alpha-cutout PBR foliage, instanced as one
// draw call. A 128px baked atlas replaces toy-block bushes and avoids 32
// separate transparent meshes/sorts. All plants stay outside the road edge.
const darkFoliageCanvas=document.createElement('canvas');
darkFoliageCanvas.width=darkFoliageCanvas.height=128;
const darkFoliageCtx=darkFoliageCanvas.getContext('2d');
let darkFoliageSeed=3917;
const darkFoliageRandom=()=>((darkFoliageSeed=(Math.imul(darkFoliageSeed,1664525)+1013904223)>>>0)/4294967296);
// Twigs remain visible through small gaps in the naturally uneven canopy.
darkFoliageCtx.lineCap='round';
for(let i=0;i<19;i++){
 const tx=64+(darkFoliageRandom()-.5)*92,ty=22+darkFoliageRandom()*65;
 darkFoliageCtx.strokeStyle=i%3?'#3c3b2c':'#4a4431';
 darkFoliageCtx.lineWidth=.7+darkFoliageRandom()*2;
 darkFoliageCtx.beginPath();darkFoliageCtx.moveTo(64,127);
 darkFoliageCtx.quadraticCurveTo(62+(tx-64)*.27,86,tx,ty);
 darkFoliageCtx.stroke();
}
for(let i=0;i<490;i++){
 const u=darkFoliageRandom()*2-1,v=darkFoliageRandom()*2-1;
 if(u*u/.96+v*v/.79>1)continue;
 const px=64+u*52,py=55+v*39;
 const leaf=darkFoliageRandom();
 darkFoliageCtx.fillStyle=leaf<.33?'#343e30':leaf<.68?'#46513a':'#586249';
 darkFoliageCtx.beginPath();
 darkFoliageCtx.ellipse(px,py,1.8+darkFoliageRandom()*3.4,1.1+darkFoliageRandom()*2.3,
  darkFoliageRandom()*Math.PI,0,Math.PI*2);
 darkFoliageCtx.fill();
}
const darkFoliageTexture=new THREE.CanvasTexture(darkFoliageCanvas);
darkFoliageTexture.colorSpace=THREE.SRGBColorSpace;
darkFoliageTexture.anisotropy=1;
const darkFoliagePositions=[],darkFoliageUvs=[],darkFoliageIndices=[];
for(const angle of [0,Math.PI/2]){
 const dx=Math.cos(angle)*.5,dz=Math.sin(angle)*.5,base=darkFoliagePositions.length/3;
 darkFoliagePositions.push(-dx,0,-dz,dx,0,dz,dx,1,dz,-dx,1,-dz);
 darkFoliageUvs.push(0,0,1,0,1,1,0,1);
 darkFoliageIndices.push(base,base+1,base+2,base,base+2,base+3);
}
const darkFoliageGeometry=new THREE.BufferGeometry();
darkFoliageGeometry.setAttribute('position',new THREE.Float32BufferAttribute(darkFoliagePositions,3));
darkFoliageGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(darkFoliageUvs,2));
darkFoliageGeometry.setIndex(darkFoliageIndices);
darkFoliageGeometry.computeVertexNormals();
const darkFoliageMaterial=new THREE.MeshStandardMaterial({
 map:darkFoliageTexture,color:0xb8b9ad,alphaTest:.28,
 roughness:.98,metalness:0,side:THREE.DoubleSide
});
const darkRoadFoliage=new THREE.InstancedMesh(darkFoliageGeometry,darkFoliageMaterial,32);
darkRoadFoliage.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
darkRoadFoliage.frustumCulled=false;
darkRoadFoliage.visible=false;
scene.add(darkRoadFoliage);
const darkRoadFoliagePose=new THREE.Object3D();
const darkRoadFoliageZ=Array.from({length:16},(_,i)=>10-i*7.5);
function updateDarkRoadFoliage(advance){
 for(let i=0;i<darkRoadFoliageZ.length;i++){
  darkRoadFoliageZ[i]+=advance;
  if(darkRoadFoliageZ[i]>20)darkRoadFoliageZ[i]-=120;
  for(let side=0;side<2;side++){
   const direction=side?1:-1,variation=((i*11+side*7)%7);
   const width=1.75+((i*5+side*3)%7)*.19;
   const height=1.65+((i*3+side*5)%9)*.22;
   darkRoadFoliagePose.position.set(direction*(7.55+variation*.27),.015,darkRoadFoliageZ[i]);
   darkRoadFoliagePose.rotation.set(0,i*.77+side*.39,0);
   darkRoadFoliagePose.scale.set(width,height,width);
   darkRoadFoliagePose.updateMatrix();
   darkRoadFoliage.setMatrixAt(i*2+side,darkRoadFoliagePose.matrix);
  }
 }
 darkRoadFoliage.instanceMatrix.needsUpdate=true;
}
updateDarkRoadFoliage(0);
 let darkRoadWave=0;
 const ghostCloth=new THREE.MeshStandardMaterial({color:0xc9d0cb,roughness:.97,side:THREE.DoubleSide});
 const ghostSkin=new THREE.MeshStandardMaterial({color:0xc2c6c1,roughness:.94});
 const ghostHair=new THREE.MeshStandardMaterial({color:0x101319,roughness:.96});
 const ghostEye=new THREE.MeshStandardMaterial({color:0x111419,roughness:.98});
 // A local, compact PBR glTF character replaces the sphere/cylinder ghost once loaded.
 // Async loading is optional: the original procedural woman remains playable offline.
 let darkRoadWomanModel=null;
 new GLTFLoader().load('./assets/dark-road-woman.gltf',({scene:model})=>{
  model.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;}});
  darkRoadWomanModel=model;
 },undefined,()=>{/* Keep the lightweight fallback if the model is unavailable. */});
 // Lightweight fallback is used until the local glTF is ready (or if it fails).
 function makeDarkRoadGhost(){
  if(darkRoadWomanModel){
   const ghost=darkRoadWomanModel.clone(true);
   // Rebind glTF nodes on each clone; do not animate the shared template.
   ghost.userData.darkDress=ghost.getObjectByName('dress');
   ghost.userData.darkHair=ghost.getObjectByName('hair');
   return ghost;
  }
  const g=new THREE.Group();
  const dress=new THREE.Mesh(new THREE.LatheGeometry([
   new THREE.Vector2(.39,0),new THREE.Vector2(.52,.17),
   new THREE.Vector2(.40,.8),new THREE.Vector2(.27,1.48),
   new THREE.Vector2(.24,1.88)],12),ghostCloth);dress.name='dress';g.add(dress);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.27,12,10),ghostSkin);
  head.scale.set(.84,1.06,.78);head.position.set(0,2.13,.015);g.add(head);
  const hair=new THREE.Mesh(new THREE.SphereGeometry(.30,12,9),ghostHair);
  hair.scale.set(1,.62,.9);hair.position.set(0,2.36,.045);hair.name='hair';g.add(hair);
  for(const side of [-1,1]){
   const lock=new THREE.Mesh(new THREE.CylinderGeometry(.07,.095,1.04,7),ghostHair);
   lock.position.set(side*.25,1.85,.09);lock.rotation.z=side*.10;g.add(lock);
   const sleeve=new THREE.Mesh(new THREE.CylinderGeometry(.095,.13,.8,8),ghostCloth);
   sleeve.position.set(side*.34,1.45,.01);sleeve.rotation.z=side*.18;g.add(sleeve);
   const eye=new THREE.Mesh(new THREE.SphereGeometry(.025,7,6),ghostEye);
   eye.position.set(side*.105,2.15,.217);g.add(eye);
  }
  g.userData.darkDress=dress;
  g.userData.darkHair=hair;
  return g;
 }
 function makeKrasue(){
 const g=new THREE.Group();
 const skin=new THREE.MeshStandardMaterial({color:0x8fae82,roughness:.88});
 const hairMat=new THREE.MeshStandardMaterial({color:0x101317,roughness:.94,side:THREE.DoubleSide});
 const red=new THREE.MeshStandardMaterial({color:0x9c1428,emissive:0x4a0712,emissiveIntensity:.45,roughness:.8});
 const glow=new THREE.PointLight(0xff3146,1.15,5,2);glow.position.y=1.35;g.add(glow);
 const head=new THREE.Mesh(new THREE.SphereGeometry(.36,16,12),skin);
 head.scale.set(.88,1.08,.86);head.position.y=2.75;g.add(head);
 const hair=new THREE.Mesh(new THREE.SphereGeometry(.42,16,12),hairMat);
 hair.scale.set(1,.82,.92);hair.position.set(0,2.96,-.09);g.add(hair);
 const face=new THREE.Mesh(new THREE.SphereGeometry(.30,14,10),skin);
 face.scale.set(.95,.95,.28);face.position.set(0,2.70,.26);g.add(face);
 for(const side of [-1,1]){
  const eye=new THREE.Mesh(new THREE.SphereGeometry(.055,8,6),new THREE.MeshBasicMaterial({color:0xffe1a6}));
  eye.position.set(side*.13,2.78,.345);g.add(eye);
  const strand=new THREE.Mesh(new THREE.CylinderGeometry(.075,.035,1.18,7),hairMat);
  strand.position.set(side*.34,2.38,-.08);strand.rotation.z=side*.16;g.add(strand);
  const trail=new THREE.Mesh(new THREE.CylinderGeometry(.105,.055,1.35,8),red);
  trail.position.set(side*.13,1.48,0);trail.rotation.z=side*.12;g.add(trail);
 }
 const core=new THREE.Mesh(new THREE.SphereGeometry(.21,10,8),red);
 core.scale.set(.9,1.6,.8);core.position.y=1.72;g.add(core);
 g.userData.krasueGlow=glow;
 return g;
}
function spawnDarkRoadHazard(){
  const wave=++darkRoadWave,type=wave%5===1?'krasue':wave%4===1?'whiteGhost':'durian';
  const lane=(wave%2?1:-1)*2.05;
  const g=type==='durian'?cachedObstacle('durian'):type==='krasue'?makeKrasue():makeDarkRoadGhost();
  g.position.set(lane,0,-42);scene.add(g);
  hazards.push({g,type,madness:null,boss:false,durianSide:0,passed:false,hit:false,
   phase:wave,baseX:lane,announced:false,nearAwarded:false,swerve:0,swerveStart:-100});
 }
 function spawnPattayaHazard(){
  const wave=++pattayaWave,type=wave%6===0?'durian':['flagParade','bottle','pattayaDancer','watermelon'][wave%4],
        lane=(wave%2?1:-1)*1.55;
  // Keep the durian's animated fruit and stationary ground shadow as direct children.
  // A wrapper would make the shared rolling update spin the entire shadow as well.
  const g=type==='durian'?cachedObstacle('durian'):new THREE.Group();
  if(type==='durian'){/* Already built as a root obstacle, no wrapper. */}
  else if(type==='flagParade'){
   g.add(cube(.7,1.1,.4,pattayaCloth,0,1.1,0));
   g.add(ball(.33,pattayaSkin,0,1.93,0));
   g.add(cube(.05,2,.05,M.white,.5,1.8,0));
   for(let i=0;i<6;i++)g.add(cube(.8,.13,.05,pattayaRainbow[i],.95,2.75-i*.13,0));
  }else if(type==='bottle'||type==='watermelon'){
   if(!pattayaThrowTemplates[type])pattayaThrowTemplates[type]=makePattayaThrower(type);
   const thrown=pattayaThrowTemplates[type].clone(true);
   const actor=thrown.children[0],projectile=thrown.getObjectByName('throwProjectile');
   // Tourist or fruit vendor stays beside the selected lane, never in the escape lane.
   actor.position.x=Math.sign(lane)*5.1-lane;
   projectile.position.set(actor.position.x,2.0,0);
   g.add(thrown);
   g.userData.pattayaProjectile=projectile;
   g.userData.pattayaActor=actor;
   g.userData.pattayaArm=thrown.getObjectByName('throwArm');
  }else{g.add(makeDancer());g.scale.set(.8,.8,.8);}
  g.position.set(lane,0,-65);scene.add(g);
  hazards.push({g,type,madness:null,boss:false,durianSide:0,passed:false,hit:false,
   phase:wave,baseX:lane,announced:false,nearAwarded:false,swerve:0,swerveStart:100});
 }
// Expressway motorcycle: a reusable, road-proportioned PBR sport bike with a
// rider, real axle-aligned tyres, fork, engine, exhaust and fitted fairings.
// Constructed once on the first bike wave; every subsequent wave clones shared
// geometries/materials instead of uploading new GPU resources.
let expresswayMotorcycleTemplate=null;
function makeExpresswayMotorcycle(){
 if(expresswayMotorcycleTemplate)return expresswayMotorcycleTemplate.clone(true);
 const g=new THREE.Group();
 const paint=new THREE.MeshStandardMaterial({color:0x293f59,metalness:.58,roughness:.34});
 const trim=new THREE.MeshStandardMaterial({color:0x111b25,metalness:.24,roughness:.55});
 const tyre=new THREE.MeshStandardMaterial({color:0x17191d,roughness:.96});
 const alloy=new THREE.MeshStandardMaterial({color:0x8c9aa2,metalness:.84,roughness:.31});
 const jacket=new THREE.MeshStandardMaterial({color:0x343c48,roughness:.89});
 const trousers=new THREE.MeshStandardMaterial({color:0x20252d,roughness:.93});
 const helmet=new THREE.MeshStandardMaterial({color:0x6b252a,metalness:.32,roughness:.31});
 const visor=new THREE.MeshStandardMaterial({color:0x172d3b,metalness:.38,roughness:.19});
 const headlamp=new THREE.MeshStandardMaterial({color:0xffebc7,emissive:0xffcc75,emissiveIntensity:.55,roughness:.24});
 const tailLamp=new THREE.MeshStandardMaterial({color:0xd3272b,emissive:0xb50a0c,emissiveIntensity:.7});
 // Open-profile tyres expose the fork and brake assembly instead of solid toy discs.
 // Two annular tyres, four small hubs and twenty cast spokes share three draw calls.
 // All matrices are baked once into the cached motorcycle template, not per frame.
 const tyreGeometry=new THREE.TorusGeometry(.325,.105,8,20);
 tyreGeometry.rotateY(Math.PI/2);
 const hubGeometry=new THREE.CylinderGeometry(.105,.105,.035,12);
 hubGeometry.rotateZ(Math.PI/2);
 const tyres=new THREE.InstancedMesh(tyreGeometry,tyre,2);
 const hubs=new THREE.InstancedMesh(hubGeometry,alloy,4);
 const spokes=new THREE.InstancedMesh(new THREE.BoxGeometry(.043,.038,.31),alloy,20);
 const matrix=new THREE.Matrix4();
 for(let i=0;i<2;i++){
  const z=i===0?-1.02:1.02;
  matrix.makeTranslation(0,.46,z);tyres.setMatrixAt(i,matrix);
  for(let side=0;side<2;side++){
   const faceX=side===0?-.107:.107;
   matrix.makeTranslation(faceX,.46,z);
   hubs.setMatrixAt(i*2+side,matrix);
   for(let spoke=0;spoke<5;spoke++){
    const angle=spoke*Math.PI*2/5;
    matrix.makeRotationX(angle-Math.PI/2);
    matrix.setPosition(faceX,.46+Math.cos(angle)*.205,z+Math.sin(angle)*.205);
    spokes.setMatrixAt(i*10+side*5+spoke,matrix);
   }
  }
 }
 tyres.instanceMatrix.needsUpdate=true;
 hubs.instanceMatrix.needsUpdate=true;
 spokes.instanceMatrix.needsUpdate=true;
 g.add(tyres,hubs,spokes);
 // Disc brakes inside both sport-bike tyres: two PBR rotor rings and two
 // compact calipers share two instanced draws, without new textures or lights.
 // .202m rotor outer radius fits the .22m tyre opening; .119m inner radius
 // clears the .105m wheel hub. All parts are cached with the bike template.
 const brakeRotorGeometry=new THREE.RingGeometry(.119,.202,24,2);
 brakeRotorGeometry.rotateY(Math.PI/2);
 const brakeRotorMaterial=new THREE.MeshStandardMaterial({
  color:0xb6bec1,metalness:.83,roughness:.32,side:THREE.DoubleSide
 });
 const brakeCaliperMaterial=new THREE.MeshStandardMaterial({
  color:0x414a52,metalness:.65,roughness:.43
 });
 const brakeRotors=new THREE.InstancedMesh(brakeRotorGeometry,brakeRotorMaterial,2);
 const brakeCalipers=new THREE.InstancedMesh(
  new THREE.BoxGeometry(.072,.155,.12),brakeCaliperMaterial,2
 );
 for(let i=0;i<2;i++){
  const z=i===0?-1.02:1.02,side=i===0?-1:1;
  matrix.makeTranslation(side*.124,.46,z);
  brakeRotors.setMatrixAt(i,matrix);
  matrix.makeTranslation(side*.163,.59,z+.04);
  brakeCalipers.setMatrixAt(i,matrix);
 }
 brakeRotors.instanceMatrix.needsUpdate=true;
 brakeCalipers.instanceMatrix.needsUpdate=true;
 brakeRotors.computeBoundingSphere();
 brakeCalipers.computeBoundingSphere();
 g.add(brakeRotors,brakeCalipers);
 function mesh(geometry,material,x,y,z,sx=1,sy=1,sz=1){
  const m=new THREE.Mesh(geometry,material);
  m.position.set(x,y,z);m.scale.set(sx,sy,sz);g.add(m);return m;
 }
 function strut(a,b,r,material){
  const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),delta=q.clone().sub(p);
  const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,delta.length(),7),material);
  m.position.copy(p).add(q).multiplyScalar(.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
  g.add(m);
 }
 // Triangulated exposed frame and paired telescopic front forks.
 strut([0,.7,-.95],[0,1.2,.36],.065,alloy);
 strut([0,1.2,.36],[0,.75,.82],.055,trim);
 for(const side of [-1,1]){
  strut([side*.24,.47,1.02],[side*.27,1.48,.64],.045,alloy);
  strut([side*.19,1.12,-.35],[side*.35,.8,-.77],.07,trousers);
  strut([side*.2,1.85,-.04],[side*.42,1.51,.65],.075,jacket);
 }
 mesh(new THREE.BoxGeometry(.61,.46,.57),alloy,0,.91,-.04);
 mesh(new THREE.SphereGeometry(1,14,10),paint,0,1.28,.31,.54,.29,.55);
 mesh(new THREE.SphereGeometry(1,12,8),paint,0,1.29,.85,.43,.38,.23);
 mesh(new THREE.BoxGeometry(.56,.13,.77),trim,0,1.3,-.48);
 mesh(new THREE.BoxGeometry(.36,.19,.44),paint,0,.94,-.91);
 strut([.39,.79,-.23],[.46,.76,-1.1],.095,alloy);
 strut([-.48,1.53,.64],[.48,1.53,.64],.035,alloy);
 // Forward-leaning rider, full-face helmet and dark visor.
 const torso=mesh(new THREE.CapsuleGeometry(.23,.5,4,8),jacket,0,1.73,-.14);
 torso.rotation.x=.28;
 mesh(new THREE.SphereGeometry(.32,14,10),helmet,0,2.22,.1);
 mesh(new THREE.SphereGeometry(1,12,8),visor,0,2.23,.39,.25,.15,.065);
 mesh(new THREE.SphereGeometry(.15,10,8),headlamp,0,1.29,1.07);
 mesh(new THREE.BoxGeometry(.35,.11,.07),tailLamp,0,1.09,-1.18);
 g.userData.expresswayMotorcycle=true;
 expresswayMotorcycleTemplate=g;
 return g.clone(true);
}
// Expressway protest: four road-proportioned PBR pedestrians and two bilingual
// placards. Six instanced draw calls per wave; one cached template/texture.
// Keep the group entirely on the hazard-side lane so the opposite lane stays open.
let expresswayProtestTemplate=null;
function makeExpresswayProtest(){
 if(expresswayProtestTemplate)return expresswayProtestTemplate.clone(true);
 const g=new THREE.Group(),count=4,dummy=new THREE.Object3D();
 const skin=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.92});
 const fabric=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.97});
 const denim=new THREE.MeshStandardMaterial({color:0x263b51,roughness:.96});
 const poleMetal=new THREE.MeshStandardMaterial({color:0x66727a,metalness:.72,roughness:.43});
 // Realistic tailored crowd silhouettes replace capsule-shaped bodies in the
 // 12,000+ expressway protest. Three shared PBR geometries keep the existing
 // six instanced draw calls; no new textures, collision or runtime allocations.
 function crowdCloth(stations,segments=10){
  const positions=[],uvs=[],indices=[];
  for(let row=0;row<stations.length;row++){
   const [y,rx,rz]=stations[row];
   for(let side=0;side<=segments;side++){
    const a=side*Math.PI*2/segments;
    positions.push(Math.cos(a)*rx,y,Math.sin(a)*rz);
    uvs.push(side/segments,row/(stations.length-1));
   }
  }
  for(let row=0;row<stations.length-1;row++)for(let side=0;side<segments;side++){
   const a=row*(segments+1)+side,b=a+segments+1;
   indices.push(a,b,a+1,b,b+1,a+1);
  }
  const bottom=positions.length/3;
  positions.push(0,stations[0][0],0);uvs.push(.5,0);
  const top=positions.length/3;
  positions.push(0,stations[stations.length-1][0],0);uvs.push(.5,1);
  for(let side=0;side<segments;side++){
   indices.push(bottom,side,side+1);
   const row=(stations.length-1)*(segments+1);
   indices.push(top,row+side+1,row+side);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  geometry.setIndex(indices);geometry.computeVertexNormals();
  return geometry;
 }
 const crowdTorso=crowdCloth([[-.55,.18,.13],[-.40,.22,.16],[-.14,.25,.16],[.20,.34,.18],[.37,.33,.17],[.52,.13,.11]]);
 const crowdSleeve=crowdCloth([[-.36,.065,.07],[-.22,.077,.079],[.15,.10,.105],[.37,.125,.125]]);
 const crowdTrouser=crowdCloth([[-.45,.075,.095],[-.30,.087,.11],[.04,.12,.13],[.36,.145,.145],[.47,.145,.14]]);

 const heads=new THREE.InstancedMesh(new THREE.SphereGeometry(.23,10,8),skin,count);
 const torsos=new THREE.InstancedMesh(crowdTorso,fabric,count);
 const arms=new THREE.InstancedMesh(crowdSleeve,fabric,count*2);
 const legs=new THREE.InstancedMesh(crowdTrouser,denim,count*2);
 const posterCanvas=document.createElement('canvas');
 posterCanvas.width=512;posterCanvas.height=256;
 const ctx=posterCanvas.getContext('2d');
 ctx.fillStyle='#e8e3d3';ctx.fillRect(0,0,512,256);
 ctx.strokeStyle='#a33d37';ctx.lineWidth=16;ctx.strokeRect(9,9,494,238);
 ctx.textAlign='center';ctx.textBaseline='middle';
 ctx.fillStyle='#253b48';ctx.font='bold 57px system-ui, sans-serif';
 ctx.fillText('ถนนปลอดภัย',256,100,460);
 ctx.font='bold 39px system-ui, sans-serif';
 ctx.fillText('SAFE STREETS',256,180,460);
 const posterTexture=new THREE.CanvasTexture(posterCanvas);
 posterTexture.colorSpace=THREE.SRGBColorSpace;
 const posterMaterial=new THREE.MeshStandardMaterial({map:posterTexture,side:THREE.DoubleSide,roughness:.89,metalness:0});
 const posters=new THREE.InstancedMesh(new THREE.PlaneGeometry(1.12,.56),posterMaterial,2);
 const poles=new THREE.InstancedMesh(new THREE.CylinderGeometry(.025,.025,1.35,6),poleMetal,2);
 const set=(mesh,index,x,y,z,rotation=0,scale=1)=>{
  dummy.position.set(x,y,z);dummy.rotation.set(0,0,rotation);
  dummy.scale.setScalar(scale);dummy.updateMatrix();mesh.setMatrixAt(index,dummy.matrix);
 };
 const side=1; // Mirror the group at spawn, without widening the blocked lane.
 const shirtColors=[0x697b83,0xb1a395,0x6d7971,0x8b6e66];
 const skinColors=[0xb88763,0xe1b18c,0x986a50,0xc89573];
 for(let i=0;i<count;i++){
  const x=side*(i*.34),z=[-.15,-.63,.32,-.83][i],size=[1,.94,1.05,.97][i];
  set(heads,i,x,2.02*size,z,0,size);
  set(torsos,i,x,1.34*size,z,(i%2?-.045:.045),size);
  heads.setColorAt(i,new THREE.Color(skinColors[i]));
  torsos.setColorAt(i,new THREE.Color(shirtColors[i]));
  for(const armSide of [-1,1]){
   const j=i*2+(armSide+1)/2;
   set(arms,j,x+armSide*.32*size,1.38*size,z,armSide*(i%2?.18:-.12),size);
   arms.setColorAt(j,new THREE.Color(shirtColors[i]));
   set(legs,j,x+armSide*.14*size,.51*size,z+armSide*.06,armSide*(i%2?.11:-.08),size);
  }
 }
 for(let i=0;i<2;i++){
  const person=i*2,x=person*.34+.22,z=[-.15,.32][i];
  set(posters,i,x,2.79,z+.08,i===0?-.06:.07);
  set(poles,i,x,2.15,z+.06);
 }
 for(const mesh of [heads,torsos,arms,legs,posters,poles]){
  mesh.instanceMatrix.needsUpdate=true;mesh.frustumCulled=false;g.add(mesh);
 }
 for(const mesh of [heads,torsos,arms])if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
 // Visual footprint: x=0..1.3 relative to hazard centre, safely away from opposite lane.
 expresswayProtestTemplate=g;
 return g.clone(true);
}
function spawnExpresswayHazard(){
 const wave=++expresswayWave,kind=wave%6===0?'durian':['sportsCar','bike','bus','protest','laser','sportsCar','bike'][wave%7],lane=(wave%2?1:-1)*1.55;
 // Durian must use the same root hierarchy as the early districts:
 // child[0] is the rolling fruit, child[1] is the stationary contact shadow.
 const g=kind==='durian'?cachedObstacle('durian'):new THREE.Group();
 if(kind==='sportsCar'){try{g.add(expresswayVehicle('sportsCar'));}catch(error){console.warn('Sports car PBR fallback',error);g.add(cube(1.8,.48,3.4,mat(0xf23b69),0,.6,0));g.add(cube(1.4,.45,1.4,M.glass,0,1.05,-.2));for(const xx of [-.82,.82])for(const zz of [-1.05,1.05])g.add(ball(.35,M.wheel,xx,.34,zz));}}
 else if(kind==='bike'){try{g.add(makeExpresswayMotorcycle());}catch(error){console.warn('Expressway motorcycle PBR fallback',error);g.add(cachedObstacle('bike'));}}
 else if(kind==='bus'){try{g.add(expresswayVehicle('bus'));}catch(error){console.warn('Bus PBR fallback',error);g.add(cube(2.05,2.5,4.4,mat(0xf5a33b),0,1.55,0));g.add(cube(1.85,.9,.09,M.glass,0,2.1,2.23));}}
 else if(kind==='protest'){try{g.add(makeExpresswayProtest());}catch(error){console.warn('Expressway crowd fallback',error);g.add(cube(.85,1.2,.5,M.pink,0,1.1,0));g.add(ball(.34,M.skin,0,1.92,0));g.add(cube(1.3,.65,.12,M.white,0,2.8,0));}}
 else if(kind==='durian'){/* Root durian already built above. */}
 else {g.add(expresswayLaserTemplate.clone(true));}
 g.position.set(lane,0,-65);scene.add(g);
 hazards.push({g,type:kind,madness:null,boss:false,durianSide:0,passed:false,hit:false,phase:wave,baseX:lane,announced:false,nearAwarded:false,swerve:0,swerveStart:100});
}
function spawnMarketPedestrians(){
 const wave=++marketPedestrianIndex,floatingMarket=meters+bonus>=10000;
 const kind=wave%7===0?'durian':floatingMarket&&wave%3===0?'dog':wave%6===0?'police':wave%5===0?'fruitCart':'pedestrian';
 // Dogs always charge from the canal (right); the left escape lane stays clear.
 const side=kind==='dog'?1:wave%2===1?1:-1,lane=side*1.45,style=(wave+side+5)%5;
 // Build only the actual hazard: previously the unused opposite-side model was built then discarded.
 const g=kind==='durian'?cachedObstacle('durian'):kind==='dog'?makeMarketDog():kind==='police'?makeMarketPolice():kind==='fruitCart'?makeFruitPushcart():makeMarketWalker(style);
 g.position.set(lane,0,-65);scene.add(g);
 hazards.push({g,type:kind,madness:null,boss:false,durianSide:0,passed:false,hit:false,phase:wave,baseX:lane,announced:false,nearAwarded:false,swerve:0,swerveStart:-100});
}
function update(dt,t){if(!active||paused)return;speed+=dt*(3+Math.sqrt(Math.max(0,speed-60))*.16);meters+=dt*speed/3.6;
// Needle follows actual speed; clamp only its display, never the game speed.
dialNeedlePivot.rotation.z=Math.PI*.72*(1-2*Math.min(speed,240)/240);
// Defer the optional detailed guardian on mobile until the player has progressed.
// Respect data-saving / very slow connections and retain the procedural guardian.
if(mobile&&meters+bonus>=1000&&!yakshaAttempted&&!navigator.connection?.saveData&&!['slow-2g','2g'].includes(navigator.connection?.effectiveType))loadYakshaAsset();
// Avoid downloading both detailed character assets at the same early-game moment.
if(mobile&&meters+bonus>=2200&&!dancerAttempted&&!navigator.connection?.saveData&&!['slow-2g','2g'].includes(navigator.connection?.effectiveType))loadDancerAsset();
if(meters+bonus>=8000)queueExpresswayBusModel();const nextDistrict=Math.floor(meters+bonus)>=23000?6:Math.floor(meters+bonus)>=16000?5:Math.floor(meters+bonus)>=12000?4:Math.floor(meters+bonus)>=8000?3:Math.floor(meters+bonus)>=3000?2:1;const currentNight=Math.floor(meters/1600)+(meters%1600<800?1:0);if(currentNight>nightCount){nightCount=currentNight;if(nightCount>0){hint.textContent='🌙 NIGHT '+nightCount+' — SPIRITS AWAKEN';if(nextDistrict!==6&&nightCount%2===0&&grandmaTriggeredNight!==nightCount){makeRoadsideStory('shrine',Math.random()<.5?-1:1,-70);grandmaTriggeredNight=nightCount}}}if(nextDistrict!==districtIndex){applyDistrict(nextDistrict);if(nextDistrict>=3){for(const h of hazards)scene.remove(h.g);hazards.length=0;spawnClock=.5;hint.textContent=nextDistrict===6?'🌑 DARK ROAD! ONLY YOUR HEADLIGHTS!':nextDistrict===5?'🌈 PATTAYA WALKING STREET!':nextDistrict===4?'🛣️ EXPRESSWAY! DODGE TRAFFIC AND UFO LASERS!':'🌞 JJ MARKET · TWO NARROW LANES!';}}const onRamaII=nextDistrict===2;const inMarket=nextDistrict===3;const onExpressway=nextDistrict===4,inPattaya=nextDistrict===5,inDarkRoad=nextDistrict===6;pattayaStreet.visible=inPattaya;darkRoadMarkers.visible=inDarkRoad;darkRoadReflectors.visible=inDarkRoad;darkRoadFoliage.visible=inDarkRoad;darkHeadlight.visible=true; // Vehicle headlamps illuminate the road in every playable district, including Rama II.
 darkHeadlight.intensity=inDarkRoad?36:onRamaII?28:20;darkDust.visible=inDarkRoad;cockpitRainGlints.visible=nextDistrict===1||nextDistrict===2;
 // Wipers operate only in wet Yaowarat and Rama II. Two small pivot rotations
 // reuse the same four meshes; no per-frame allocations or visibility flicker.
 cockpitWipers.visible=cockpitRainGlints.visible;
 if(cockpitWipers.visible){
  const sweep=.08+.48*(.5+.5*Math.sin(t*.0036));
  for(const wiper of cockpitWiperPivots)wiper.pivot.rotation.z=-wiper.side*sweep;
 }

 // Reuse the baked two-lobe headlight pool on Yaowarat and Rama II too:
 // wet asphalt catches warm light, while blackout scenery stays unlit.
 // The existing low-beam road projection must follow the tuk-tuk in EVERY district.
 // Keep the daytime beam subtle, Rama II readable, and Dark Road atmospheric.
 // Reuses the same mesh and texture; no extra lights or geometry.
 darkRoadLowBeam.visible=true;
 darkRoadLowBeam.material.opacity=inDarkRoad?.57:onRamaII?.82:nextDistrict===1?.48:inMarket?.34:onExpressway?.42:inPattaya?.40:.18;if(inPattaya){for(let i=0;i<pattayaShops.length;i++){const g=pattayaShops[i];g.position.z+=dt*(60+300*(1-Math.exp(-(speed-60)/240)))*.22;if(g.position.z>26)g.position.z-=192;}updatePattayaReflections();}expresswaySet.visible=onExpressway;expresswayArt.group.visible=onExpressway;if(onExpressway)expresswayArt.update(dt,speed);if(onExpressway){ufo.position.x=Math.sin(t*.0012)*2.4;ufo.position.y=13+Math.sin(t*.002)*.8;ufo.rotation.y+=dt*.4;}if(inMarket&&meters+bonus>=10000&&meters+bonus-speed*dt/3.6<10000)hint.textContent='🚣 FLOATING MARKET RIGHT · DO NOT FALL INTO CANAL!';road.material=onExpressway?expresswayAsphalt:onRamaII?ramaRoadAsphalt:inDarkRoad?darkRoadAsphalt:inMarket?dryAsphalt:wetAsphalt;darkRoadPaint.visible=inDarkRoad;if(inDarkRoad)darkRoadPaintTexture.offset.y=((meters+bonus-23000)*18/230)%1;road.scale.x+=((inMarket?.65:1)-road.scale.x)*Math.min(1,dt*3);for(const p of props)p.visible=!onRamaII&&!inMarket&&!onExpressway&&!inPattaya&&!inDarkRoad;neonReflections.visible=nextDistrict===1;for(const mesh of streetLampMeshes)mesh.visible=nextDistrict===1;facadeBounce.visible=nextDistrict===1;for(const glow of roadsideNeonGlow)glow.visible=nextDistrict===1;for(const p of ramaStructures)p.visible=onRamaII;if(onRamaII)updateRamaBeacons(t);const canalVisible=inMarket&&meters+bonus>=9700;const canalActive=inMarket&&meters+bonus>=10000;canalGroup.visible=canalVisible;if(canalVisible)canalRippleTexture.offset.y=(t*.000025)%1;if(canalVisible){for(const boat of canalBoats){const phase=boat.userData.phase;boat.position.z=boat.userData.homeZ+((meters*.12+phase*3)%210);boat.position.y=-.02+Math.sin(t*.0017+phase)*.065;boat.rotation.z=Math.sin(t*.0011+phase)*.045;boat.userData.parasol.rotation.z=Math.sin(t*.0014+phase)*.035;const wake=boat.userData.wake;wake.scale.z=.91+.09*Math.sin(t*.004+phase);wake.position.z=-.12*Math.sin(t*.0027+phase);wake.position.y=-.085-(boat.position.y+.02);}}for(const stall of marketStalls){
 stall.visible=inMarket&&(!canalActive||stall.children[0].position.x<0);
 // Cull only small display goods beyond ~43 m; retain silhouettes and signs.
 // This avoids rendering up to 192 tiny meshes in the distant JJ market.
 if(stall.visible)stall.userData.merchandise.visible=stall.position.z>-43;
}for(const tent of marketCanopies)tent.visible=inMarket&&!canalActive;marketCanopyShadows.visible=inMarket&&!canalActive;for(const bump of marketBumps)bump.visible=inMarket;for(const mesh of marketCrowdMeshes)mesh.visible=inMarket;for(const shop of roadsideShops)shop.g.visible=!inMarket&&!onExpressway&&!inPattaya&&!inDarkRoad&&shop.stage===(onRamaII?2:1);const skyTarget=districtNightSkies[nextDistrict]||darkRoadSky;scene.background.lerp(skyTarget,Math.min(1,dt*.8));scene.fog.color.copy(scene.background);// Follow the district's PBR key-light preset. The old 1.65 daytime override
 // washed out Yaowarat and expressway neon within seconds of a stage change.
 sun.intensity+=(districtLightPresets[nextDistrict][1]-sun.intensity)*Math.min(1,dt*1.2);const control=hasMotion?tilt:(fallbackKeySteer||fallbackDragSteer);const steer=control===0?0:Math.sign(control)*Math.pow(Math.abs(control),.82);const desiredX=THREE.MathUtils.clamp(steer*4.1,-4.1,4.1);const oldX=x;x+=(desiredX-x)*(1-Math.exp(-dt*5.1));x=THREE.MathUtils.clamp(x,-4.3,4.3);// Keep the real spotlight aligned with the tuk-tuk in every district, not only Dark Road.
 // A small steering lead lights the dodge lane without swinging the beam off-road.
 darkHeadlight.position.x=x;
 darkHeadlight.target.position.x=THREE.MathUtils.clamp(x+smoothed*.65,-4.5,4.5);if(canalActive&&x>2.85){hint.textContent='💦 FALLEN INTO THE FLOATING MARKET CANAL!';shake=1;finish();return;}smoothed+=(THREE.MathUtils.clamp((x-oldX)/Math.max(dt,.001)/5,-1,1)-smoothed)*(1-Math.exp(-dt*9));car.position.set(x,0,3);car.rotation.z=-smoothed*.10+Math.sin(t*.01)*.015+Math.sin(flips)*Math.exp(-flips*.45)*.85;car.rotation.x=Math.sin(flips*.8)*Math.exp(-flips*.45)*.65;car.position.y=Math.abs(Math.sin(flips*1.2))*Math.exp(-flips*.32)*.6;flips=Math.max(0,flips-dt*3);const visualSpeed=60+300*(1-Math.exp(-(speed-60)/240));const advance=dt*visualSpeed*.22;if(inDarkRoad){updateDarkRoadMarkers(advance);updateDarkRoadFoliage(advance);updateDarkDust(advance,x);darkRoadTexture.offset.y-=advance*18/230;darkRoadNormalTexture.offset.y=darkRoadTexture.offset.y;darkRoadRoughnessTexture.offset.y=darkRoadTexture.offset.y;}if(onRamaII)ramaRoadTexture.offset.y-=advance*18/230;if(onExpressway){const roadScroll=advance*18/230;expresswayRoadTexture.offset.y-=roadScroll;expresswayRoughnessTexture.offset.y=expresswayRoadTexture.offset.y;}const wiresVisible=nextDistrict===1;for(const mesh of [wirePoles,wireArms,wireRuns])mesh.visible=wiresVisible;if(wiresVisible)updateYaowaratWires(advance);updateYaowaratSkyline(advance,wiresVisible);laneStripeMesh.visible=!inDarkRoad;if(!inDarkRoad){for(let i=0;i<stripeCount;i++){stripeZ[i]+=advance;if(stripeZ[i]>16)stripeZ[i]-=230;}placeLaneStripes();}for(const crossing of yaowaratCrosswalks){crossing.visible=nextDistrict===1;if(crossing.visible){crossing.position.z+=advance;if(crossing.position.z>18)crossing.position.z-=190;}}roadStuds.forEach(s=>{s.visible=!inDarkRoad;s.position.z+=advance;if(s.position.z>16)s.position.z-=228});props.forEach(p=>{
 p.position.z+=advance;if(p.position.z>22)p.position.z-=198;
 if(p.userData.facadeNear){
  const close=p.position.z>-(mobile?54:78);
  if(p.userData.facadeNear.visible!==close){
   p.userData.facadeNear.visible=close;
   p.userData.facadeFar.visible=!close;
  }
 }
});if(nextDistrict===1){updateYaowaratStreetlights();updateYaowaratReflections();updateYaowaratFacadeBounce();}if(onRamaII)for(const p of ramaStructures){p.position.z+=advance;if(p.position.z>45)p.position.z-=198;}for(const stall of marketStalls)if(inMarket){stall.position.z+=advance;if(stall.position.z>25)stall.position.z-=192;}if(inMarket)updateMarketCrowd(t,canalActive);if(inMarket){
 let canopyIndex=0;
 for(const tent of marketCanopies){
  tent.position.z+=advance;
  if(tent.position.z>25)tent.position.z-=192;
  // Offset with the afternoon key light; stays flat just above road top (y=.06).
  marketShadePose.position.set(.75,.073,tent.position.z-.6);
  marketShadePose.updateMatrix();
  marketCanopyShadows.setMatrixAt(canopyIndex++,marketShadePose.matrix);
 }
 marketCanopyShadows.instanceMatrix.needsUpdate=true;
}for(const bump of marketBumps)if(inMarket){bump.position.z+=advance;if(bump.position.z>20)bump.position.z-=180;}for(const shop of roadsideShops)if(shop.stage===nextDistrict){shop.g.position.z+=advance;if(shop.g.position.z>25)shop.g.position.z-=205;}for(let i=storyProps.length-1;i>=0;i--){const p=storyProps[i];p.g.position.z+=advance;if(p.kind==='vendor'&&!p.triggered&&p.g.position.z>-48){p.triggered=true;p.dropTime=.8;hint.textContent='🌰 WATCH OUT! DURIAN FALLING!'}if(p.kind==='vendor'&&p.dropTime>0){p.dropTime=Math.max(0,p.dropTime-dt);const f=1-p.dropTime/.8;if(p.g.userData.vendorArm)p.g.userData.vendorArm.rotation.z=-Math.sin(f*Math.PI)*1.15;if(p.g.userData.vendorFruit){p.g.userData.vendorFruit.position.x=-.35+p.side*-f*1.1;p.g.userData.vendorFruit.position.y=1.65-f*1.25;p.g.userData.vendorFruit.rotation.z+=dt*8;if(p.dropTime===0)p.g.userData.vendorFruit.visible=false}}if(p.kind==='shrine'&&!p.triggered&&p.g.position.z>0){p.triggered=true;startGrandmaChase(p.side)}if(p.g.position.z>22){scene.remove(p.g);storyProps.splice(i,1)}}if(inDarkRoad&&!grandmaChase&&meters+bonus>=nextDarkGrandmaScore){
 const available=cockpitSideMirrors.find(m=>m.housing.visible);
 startGrandmaChase(available?available.side:(darkRoadWave%2?1:-1));
 nextDarkGrandmaScore=Math.floor(meters+bonus)+2600;
}if(grandmaChase){const q=grandmaChase;q.time-=dt;q.elapsed+=dt;q.stepSound-=dt;const rush=THREE.MathUtils.smoothstep(q.elapsed,0,.65);const cling=THREE.MathUtils.smoothstep(q.elapsed,.5,.85);// Run -> leap -> cling: settle into a believable human-sized grip instead of
// continuing a running cycle while enlarged to nearly twice her height.
const pull=THREE.MathUtils.smoothstep(q.elapsed,1.05,1.55)*(1-THREE.MathUtils.smoothstep(q.elapsed,2.2,2.65));
q.g.position.z=THREE.MathUtils.lerp(-14,-1.7,rush);
q.g.position.x=x+q.side*THREE.MathUtils.lerp(3.8,1.20,cling)+Math.sin(t*.024)*.04*(1-cling);
q.g.position.y=(1-cling)*Math.abs(Math.sin(q.elapsed*22))*.12+cling*.12;
q.g.scale.setScalar(1+cling*.10);
q.g.rotation.y=q.side*(.2+cling*.25);
q.g.rotation.z=-q.side*cling*.22+q.side*pull*Math.sin(q.elapsed*15)*.045;
q.g.rotation.x=cling*.14;
const stride=Math.sin(q.elapsed*22)*.7;
for(let i=0;i<2;i++){
 const arm=q.g.userData.runArms?.[i],leg=q.g.userData.runLegs?.[i];
 if(arm){arm.rotation.x=THREE.MathUtils.lerp((i===0?1:-1)*stride,-.7,cling);arm.rotation.z=THREE.MathUtils.lerp(0,i===0?-.32:.32,cling);}
 if(leg){leg.rotation.x=THREE.MathUtils.lerp((i===0?-1:1)*stride,i===0?-.38:.52,cling);leg.rotation.z=cling*(i===0?-.08:.08);}
}if(q.elapsed>1.05&&q.elapsed<2.35){const pullingArm=q.g.userData.runArms?.[q.side===1?1:0];if(pullingArm)pullingArm.rotation.x=-1.1+Math.sin(q.elapsed*15)*.22;}
if(!q.mirrorTaken&&q.elapsed>=1.55){
 q.mirrorTaken=true;
 const mirror=cockpitSideMirrors.find(m=>m.side===q.side&&m.housing.visible);
 if(mirror){
  mirror.housing.visible=false;mirror.glass.visible=false;
  const stolen=new THREE.Group(),housing=mirror.housing.clone(),glass=mirror.glass.clone();
  housing.visible=true;glass.visible=true;housing.position.set(0,0,0);glass.position.set(0,0,.076);
  stolen.add(housing,glass);stolen.position.set(q.side*.42,1.18,.42);
  stolen.scale.setScalar(1.25);q.g.add(stolen);q.g.userData.stolenMirror=stolen;
  hint.textContent='👵 GRANDMA SPEED TORE OFF A SIDE MIRROR!';
  sound(175,.16,'sawtooth');
 }
}
if(q.g.userData.stolenMirror){const piece=q.g.userData.stolenMirror;piece.rotation.z=q.side*(.15+Math.sin(q.elapsed*10)*.08);piece.position.y=1.18+Math.sin(q.elapsed*10)*.045;}
if(q.stepSound<=0&&q.elapsed>.5&&q.elapsed<2.8){sound(95,.055,'triangle');q.stepSound=.3}if(q.time<=0){scene.remove(q.g);grandmaChase=null}}spawnClock-=dt;if(spawnClock<=0){if(hazards.length<(inMarket?11:onExpressway?9:inPattaya?8:inDarkRoad?8:7))spawn();spawnClock=bossSpawned&&!bossBeaten&&hazards.some(h=>h.boss)?2.2:Math.max(.56,1.48-visualSpeed/300)}for(const h of hazards){h.g.position.z+=advance;if(!h.announced&&h.g.position.z>-47){h.announced=true;if(h.type==='flagParade')hint.textContent='🌈 PRIDE PARADE! DODGE SAFELY!';else if(h.type==='bottle')hint.textContent='🍾 DRUNK TOURIST THROWS A BOTTLE!';else if(h.type==='watermelon')hint.textContent='🍉 FRUIT VENDOR THROWS A WATERMELON!';else if(h.type==='pattayaDancer')hint.textContent='👻 HAUNTED DANCER!';else if(h.type==='whiteGhost')hint.textContent='👻 WOMAN IN WHITE! KEEP YOUR DISTANCE!';else if(h.type==='krasue')hint.textContent='👻 KRASUE! FLOATING ACROSS THE ROAD!';else if(h.type==='laser')hint.textContent='🛸 UFO LASER! DODGE THE RED BEAM!';else if(h.type==='sportsCar')hint.textContent='🏎️ SPORTS CAR AHEAD!';else if(h.type==='protest')hint.textContent='📢 EXPRESSWAY PROTEST!';else if(h.type==='dog')hint.textContent='🐕 CANAL-SIDE DOG CHARGING! TILT LEFT!';else if(h.type==='police')hint.textContent='👮 POLICE AHEAD!';else if(h.type==='fruitCart')hint.textContent='🍉 JJ MARKET · FRUIT CART AHEAD!';else if(h.type==='pedestrian')hint.textContent='🚶 JJ MARKET · WATCH FOR SHOPPERS!';else hint.textContent=h.boss?'👹 BOSS YAKSHA! WATCH HIS MOVE!':h.madness?({rollingDurian:'🌰 DURIAN ROLLING ACROSS!',cuttingBus:'🚌 BUS CUTTING ACROSS!',wrongWayBike:'🏍️ WRONG-WAY BIKE!'})[h.madness]:({bus:'🚌 RED BUS AHEAD!',busBlue:'🚌 ROUTE 8 BLUE BUS!',taxi:'🚕 TAXI CUTTING IN!',bike:'🏍️ MOTORBIKE!',dancer:'👻 HAUNTED THAI DANCER!',construction:'🚧 RAMA II — FALLING CONCRETE!',yaksha:'👹 GIANT YAKSHA AHEAD!',durian:'🌰 GIANT DURIAN!'})[h.type]}if(h.type==='krasue'){
 const floatTime=t*.0021+h.phase;
 h.g.position.y=.4+Math.sin(floatTime)*.48;
 h.g.position.x=h.baseX+Math.sin(floatTime*.7)*.85;
 h.g.rotation.y=Math.sin(floatTime*.55)*.24;
 if(h.g.userData.krasueGlow)h.g.userData.krasueGlow.intensity=1+Math.sin(floatTime*2)*.3;
}if(h.type==='whiteGhost'){
 // Dark Road apparition: she slowly turns toward the moving driver while
 // headlamp-visible fabric and hair sway subtly. This works on both the PBR
 // glTF and procedural fallback, without new geometry, textures or draw calls.
 const reveal=THREE.MathUtils.smoothstep(h.g.position.z,-39,-11);
 const gaze=THREE.MathUtils.clamp((x-h.baseX)*.10,-.23,.23);
 h.g.position.y=.035+Math.sin(t*.0016+h.phase)*.028;
 h.g.rotation.y=gaze+Math.sin(t*.00085+h.phase)*.035;
 const dress=h.g.userData.darkDress,hair=h.g.userData.darkHair;
 if(dress)dress.rotation.z=Math.sin(t*.0014+h.phase)*.017*reveal;
 if(hair)hair.rotation.z=Math.sin(t*.0021+h.phase+.7)*.025*reveal;
}if(h.type==='dog'){const charge=THREE.MathUtils.smoothstep(h.g.position.z,-36,-7);
 h.g.position.x=THREE.MathUtils.lerp(h.baseX,Math.max(.5,x),charge*.62);
 const stride=t*.022+h.phase;
 h.g.position.y=Math.abs(Math.sin(stride))*.085*(.4+charge*.6);
 h.g.rotation.z=Math.sin(stride)*.09;
 const legs=h.g.userData.runningLegs;
 if(legs)for(let k=0;k<legs.length;k++)legs[k].rotation.x=Math.sin(stride+(k===0||k===3?0:Math.PI))*.55;
 if(h.g.userData.runningTail)h.g.userData.runningTail.rotation.y=Math.sin(stride*.65)*.35;
}if(h.type==='police'){h.g.position.x=THREE.MathUtils.clamp(h.baseX+Math.sin(t*.0014+h.phase)*.55,-2.9,2.9);}if(h.type==='pedestrian'){
 h.g.position.x=THREE.MathUtils.clamp(h.baseX+Math.sin(t*.0011+h.phase)*.45,-3.1,3.1);
 const step=t*.009+h.phase;
 h.g.rotation.z=Math.sin(t*.006+h.phase)*.045;
 h.g.position.y=Math.abs(Math.sin(step))*.028;
 const legs=h.g.userData.walkLegs,arms=h.g.userData.walkArms;
 if(legs&&arms)for(let k=0;k<2;k++){
  legs[k].rotation.x=Math.sin(step+k*Math.PI)*.42;
  arms[k].rotation.x=-Math.sin(step+k*Math.PI)*.29;
 }
}if(h.type==='construction'){const fall=THREE.MathUtils.smoothstep(h.g.position.z,-48,-20);h.g.position.y=6*(1-fall);h.g.rotation.z=(1-fall)*.18;}if((h.type==='bottle'||h.type==='watermelon')&&h.g.userData.pattayaProjectile){const flight=THREE.MathUtils.smoothstep(h.g.position.z,-54,-13),p=h.g.userData.pattayaProjectile,a=h.g.userData.pattayaActor,arm=h.g.userData.pattayaArm;p.position.x=THREE.MathUtils.lerp(a.position.x,0,flight);p.position.y=(h.type==='watermelon'?.72:.4)+1.5*Math.sin(Math.PI*flight);p.rotation.z+=dt*6;if(arm)arm.rotation.z=-.5-1.25*Math.sin(Math.PI*flight);a.rotation.z=Math.sin(t*.004+h.phase)*(h.type==='bottle'?.11:.035);}if(h.type==='pattayaDancer'){h.g.rotation.y=Math.sin(t*.002+h.phase)*.32;}if(h.type==='durian'){
 const previousX=h.g.position.x;
 if(h.g.position.z>-48){
  const f=THREE.MathUtils.smoothstep(h.g.position.z,-48,-5);
  h.g.position.x=THREE.MathUtils.lerp(h.baseX,h.durianSide?-h.durianSide*.9:-h.baseX*.85,f);
 }
 // Roll the centered fruit, not its ground-anchored group; rotation follows travel.
 const rollingBody=h.g.children[0];
 rollingBody.rotation.x+=advance/.77;
 rollingBody.rotation.z-=(h.g.position.x-previousX)/.77;
}if(h.type==='dancer'){
 const z=h.g.position.z;
 // Lift the right hand as the tuk-tuk approaches, hold the glare as it passes,
 // and lower the hand only after the vehicle has moved beyond the spirit.
 const approach=THREE.MathUtils.smoothstep(z,-24,-7);
 const hold=1-THREE.MathUtils.smoothstep(z,10,20);
 const warning=approach*hold;
 const driverAngle=Math.atan2(x-h.g.position.x,3.15-z);
 h.g.rotation.y=Math.sin(t*.0016+h.phase)*.10+(h.g.userData.detailedDancer?THREE.MathUtils.clamp(driverAngle,-.7,.7)*approach*.4:0);
 h.g.position.x=h.baseX+Math.sin(t*.0013+h.phase)*.25;
 h.g.position.y=.17+Math.sin(t*.0027+h.phase)*.16;
 const arms=h.g.userData.danceArms;
 if(arms?.[0])arms[0].rotation.z=Math.sin(t*.003+h.phase)*.20;
 if(arms?.[1]){
  arms[1].rotation.z=THREE.MathUtils.lerp(-Math.sin(t*.003+h.phase)*.20,1.12,warning);
  arms[1].rotation.x=THREE.MathUtils.lerp(0,-.38,warning);
 }
 if(h.g.userData.spectralArm)h.g.userData.spectralArm.visible=warning>.06;
 const rig=h.g.userData.danceRig;
 if(rig?.arm){
  // Blend the imported shoulder and elbow toward a forward-facing stop pose.
  // An unrecognized rig still uses the original lightweight shoulder gesture.
  if(rig.armPose){
   rig.arm.quaternion.slerpQuaternions(rig.armRest,rig.armPose,warning);
   if(rig.forearmPose)rig.forearm.quaternion.slerpQuaternions(rig.forearmRest,rig.forearmPose,warning);
  }else{
   rig.armDelta.setFromAxisAngle(rig.armAxis,warning*.78);
   rig.arm.quaternion.copy(rig.armRest).multiply(rig.armDelta);
  }
 }
 if(rig?.head){
  const gaze=THREE.MathUtils.clamp(driverAngle-h.g.rotation.y,-.65,.65)*approach;
  rig.headDelta.setFromAxisAngle(rig.headAxis,gaze);
  rig.head.quaternion.copy(rig.headDelta).multiply(rig.headRest);
 }
 const head=h.g.userData.danceHead;
 if(head){
  const towardDriver=Math.atan2(x-h.g.position.x,3.15-z);
  const target=THREE.MathUtils.clamp(towardDriver-h.g.rotation.y,-.9,.9)*approach;
  head.rotation.y+=(target-head.rotation.y)*(1-Math.exp(-dt*8));
  head.rotation.x=THREE.MathUtils.lerp(.10,-.12,warning);
 }
}if((h.type==='bus'||h.type==='busBlue')&&h.g.position.z<0){const p=THREE.MathUtils.smoothstep(h.g.position.z,-38,-13);h.g.position.x=THREE.MathUtils.clamp(h.baseX+Math.sin(t*.001+h.phase)*.18+(h.swerve?p*h.swerve*(h.madness==='cuttingBus'?2.15:.8):0),-4.2,4.2);h.g.rotation.y=-h.swerve*Math.sin(p*Math.PI)*.09;}if((h.type==='taxi'||h.type==='bike')&&!h.madness&&h.g.position.z>h.swerveStart){const f=THREE.MathUtils.smoothstep(h.g.position.z,h.swerveStart,h.swerveStart+20);h.g.position.x=THREE.MathUtils.clamp(h.baseX+h.swerve*f*(h.type==='bike'?1.65:2.1),-4.2,4.2);h.g.rotation.y=-h.swerve*Math.sin(f*Math.PI)*.18}if(h.madness==='wrongWayBike'){h.g.rotation.y=Math.PI+Math.sin(t*.004+h.phase)*.08;h.g.position.z+=advance*.45}if(h.type==='yaksha'){
 // The guardian becomes visibly larger and bends forward only on approach.
 // No new meshes, lights, network assets or extra render passes on iPhone.
 const approach=THREE.MathUtils.smoothstep(h.g.position.z,-42,-10);
 const breath=Math.sin(t*.0019+h.phase);
 h.g.scale.setScalar((h.g.userData.guardianBaseScale||1.85)*(1+.16*approach));
 h.g.rotation.x=-.025-.105*approach+.012*breath;
 h.g.rotation.y=Math.sin(t*.002+h.phase)*.28+
  THREE.MathUtils.clamp((x-h.g.position.x)*.025*approach,-.12,.12);
 if(h.boss&&h.g.position.z>-34){
  const f=THREE.MathUtils.smoothstep(h.g.position.z,-34,-8);
  h.g.position.x=Math.sin(f*Math.PI*1.1)*2.25;
 }
}if(!h.passed&&h.g.position.z>4){h.passed=true;const dx=Math.abs(h.g.position.x-x);const collisionRadius=h.type==='whiteGhost'?.85:h.type==='dog'?.95:h.type==='police'?.8:h.type==='pedestrian'?.75:h.type==='laser'?.8:h.type==='bottle'?.7:h.type==='watermelon'?.85:h.type==='flagParade'?.85:h.type==='pattayaDancer'?.95:h.type==='protest'?.9:h.type==='bike'?1.05:h.type==='taxi'||h.type==='sportsCar'?1.55:1.8;if(h.boss&&!bossBeaten){bossBeaten=true;if(dx>=collisionRadius){bonus+=750;hint.textContent='🏆 YAKSHA BOSS CLEARED +750';sound(920,.3,'sine')}else{hint.textContent='👹 YAKSHA HIT! NO BOSS BONUS'}}if(dx<collisionRadius&&!h.hit&&inv<=0){if(h.type==='dog'&&canalActive){x=Math.min(4.3,x+.85);hint.textContent='🐕 DOG PUSH! STEER LEFT OR FALL IN!';if(x>2.85){shake=1;finish();return;}}h.hit=true;crashes++;crackWindshield();combo=0;comboTime=0;inv=1.5;flips=5;shake=.55;sound(120,.28,'sawtooth');/* Broken brakes: collisions damage the tuk-tuk but never slow it down. */hint.textContent=h.type==='dog'&&canalActive?'🐕 DOG SHOVE! TILT LEFT — CANAL!':'💥 '+h.type.toUpperCase()+' ATTACK!';if(navigator.vibrate)navigator.vibrate(80);if(crashes>=3){shake=.95;finish();break}}else if(dx>=collisionRadius&&dx<collisionRadius+1.1&&inv<=0){misses++;combo=comboTime>0?Math.min(combo+1,5):1;comboTime=5;const reward=combo*50;bonus+=reward;sound(600+combo*120,.1,'sine');hint.textContent='🔥 NEAR MISS ×'+combo+'  +'+reward}}}updateTaxiNeonGlints();updateTukNeonGlints();updateTrafficContactShadows();updateTrafficHeadlightGlows();updateTrafficRoadGlows();updateTyreSpray();for(let i=hazards.length-1;i>=0;i--)if(hazards[i].g.position.z>20){scene.remove(hazards[i].g);hazards.splice(i,1)}if(challengeStage===0&&meters>=500){challengeStage=1;bonus+=250;hint.textContent='🏆 500m SURVIVED +250';sound(760,.22,'sine')}if(challengeStage===1&&misses>=3){challengeStage=2;bonus+=400;hint.textContent='🏆 3 NEAR MISSES +400';sound(850,.24,'sine')}if(!missionDone&&meters>=1000){missionDone=true;bonus+=500;hint.textContent='🏆 1000m MISSION +500';sound(900,.32,'sine')}shake=Math.max(0,shake-dt);inv=Math.max(0,inv-dt);comboTime=Math.max(0,comboTime-dt);if(comboTime===0)combo=0;car.visible=false;const missionText=challengeStage===0?'🎯 SURVIVE '+Math.max(0,500-Math.floor(meters))+'m · +250':challengeStage===1?'🎯 NEAR MISSES '+Math.min(misses,3)+'/3 · +400':'🏆 CHALLENGES COMPLETE';if(challengeDisplay!==missionText){challengeDisplay=missionText;challenge.textContent=missionText}if(t-lastHudUpdate>110){lastHudUpdate=t;hud.textContent=Math.floor(meters+bonus)+' PTS'+(comboTime>0?'  🔥×'+combo:'');status.innerHTML=Math.floor(speed)+' KM/H<br>'+'❤️'.repeat(Math.max(0,3-crashes));}}
let lastRender=0,lastHudUpdate=0,graphicsLost=false,frameFailures=0,visualRush=0;let perfFrames=0,perfStart=0;
function recoveryScreen(message){paused=true;panel.innerHTML='<h1>🛺 GAME INTERRUPTED</h1><p>'+message+'</p><button id="recover">RESTART GAME</button><small>Version 2.7 · Freeze diagnostics</small>';overlay.style.display='grid';$('recover').onclick=()=>location.reload()}
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();graphicsLost=true;recoveryScreen('Safari paused the 3D graphics. Tap to restart.')},false);
renderer.domElement.addEventListener('webglcontextrestored',()=>{graphicsLost=false;recoveryScreen('Graphics restored. Tap to restart safely.')},false);
addEventListener('error',e=>{if(active)recoveryScreen('Game error: '+String(e.message||'unknown').slice(0,100))});
addEventListener('unhandledrejection',e=>{console.warn('Optional asset failed:',e.reason);hint.textContent='🛺 USING LIGHTWEIGHT GRAPHICS'});
function frame(t){requestAnimationFrame(frame);if(graphicsLost)return;if(mobile&&t-lastRender<32)return;lastRender=t;try{const dt=Math.min((t-last)/1000,.07);last=t;update(dt,t);camera.position.x+=(x-camera.position.x)*(1-Math.exp(-dt*11));const rushTarget=active&&!paused?Math.min(1,Math.log1p(Math.max(0,speed-90)/250)):0;visualRush+=(rushTarget-visualRush)*(1-Math.exp(-dt*2.4));const newFov=76+visualRush*7;if(Math.abs(newFov-camera.fov)>.07){camera.fov=newFov;camera.updateProjectionMatrix()}cockpit.position.y=-.22+(active&&!paused?Math.sin(t*.018)*visualRush*.018:0);const impactShake=shake>0&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches?shake:0;camera.position.x+=Math.sin(t*.087)*impactShake*.11;camera.position.y=2.42+Math.sin(t*.113)*impactShake*.12+(active&&!paused?Math.sin(t*.024)*visualRush*.016:0);if(!active&&shake>0)shake=Math.max(0,shake-dt*1.8);camera.position.z=3.15-visualRush*.12;dialNeedle.rotation.z=-.9+(Math.log1p(speed/60)/Math.log1p(2000/60))*1.8;cockpitSteering.rotation.y=THREE.MathUtils.clamp(smoothed,-1,1)*.22;camera.lookAt(camera.position.x+smoothed*.26,1.72,-18);
// Dark Road low beam must travel with the driver's cockpit, not stay fixed at
// world X=0. Follow the smoothed camera to avoid a jittering light pool while
// steering, and gently sweep its aim into the turn. Reuse the existing single
// shadow-free spotlight: zero extra draw calls, meshes or texture allocations.
if(darkHeadlight.visible){
 const lampX=camera.position.x;
 darkHeadlight.position.x=lampX;
 darkHeadlight.target.position.x=lampX+smoothed*1.15;
 // Keep the existing baked twin-beam reflection aligned with steering.
 // The small yaw preserves a visible dodge lane without extra lights or meshes.
 darkRoadLowBeam.position.x=lampX+smoothed*.45;
 darkRoadLowBeam.rotation.y=smoothed*.045;
}
renderer.render(scene,camera);
 // Keep the scene crisp on fast phones and lower resolution only if FPS drops.
 if(mobile&&active&&!paused){
  if(!perfStart)perfStart=t;
  perfFrames++;
  if(perfFrames>=90){
   const fps=perfFrames*1000/Math.max(1,t-perfStart);
   const next=fps<25?Math.max(.82,mobilePixelRatio-.12):fps>29.3?Math.min(1.2,mobilePixelRatio+.04):mobilePixelRatio;
   if(Math.abs(next-mobilePixelRatio)>.015){mobilePixelRatio=next;renderer.setPixelRatio(mobilePixelRatio)}
   perfFrames=0;perfStart=t;
  }
 }else{perfFrames=0;perfStart=0}
 frameFailures=0}catch(e){frameFailures++;if(frameFailures===1){console.error(e);recoveryScreen('Rendering error: '+String(e.message||e).slice(0,100))}}}requestAnimationFrame(frame);
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
// Sensor-free fallback: drag horizontally on the game canvas or use A/D and arrow keys.
// It is inactive when real iPhone tilt data exists; no onscreen steering buttons are added.
let fallbackPointer=null,fallbackPointerX=0;
renderer.domElement.addEventListener('pointerdown',e=>{
 if(!active||hasMotion||fallbackPointer!==null)return;
 fallbackPointer=e.pointerId;fallbackPointerX=e.clientX;fallbackDragSteer=0;
 try{renderer.domElement.setPointerCapture(e.pointerId)}catch(error){}
});
renderer.domElement.addEventListener('pointermove',e=>{
 if(hasMotion||fallbackPointer!==e.pointerId)return;
 fallbackDragSteer=THREE.MathUtils.clamp((e.clientX-fallbackPointerX)/Math.max(140,innerWidth*.26),-1,1);
});
function releaseFallbackPointer(e){
 if(fallbackPointer!==e.pointerId)return;
 fallbackPointer=null;fallbackDragSteer=0;
}
renderer.domElement.addEventListener('pointerup',releaseFallbackPointer);
renderer.domElement.addEventListener('pointercancel',releaseFallbackPointer);
function fallbackKeyboard(e,pressed){
 if(!['ArrowLeft','ArrowRight','a','A','d','D'].includes(e.key))return;
 if(hasMotion)return;
 e.preventDefault();
 if(e.key==='ArrowLeft'||e.key.toLowerCase()==='a')fallbackLeft=pressed;
 else fallbackRight=pressed;
 fallbackKeySteer=Number(fallbackRight)-Number(fallbackLeft);
}
addEventListener('keydown',e=>fallbackKeyboard(e,true));
addEventListener('keyup',e=>fallbackKeyboard(e,false));
addEventListener('blur',()=>{fallbackKeySteer=0;fallbackDragSteer=0;fallbackLeft=false;fallbackRight=false;fallbackPointer=null});

addEventListener('deviceorientation',e=>{if(Number.isFinite(e.gamma)){hasMotion=true;lastGamma=e.gamma;if(neutral===null)neutral=e.gamma;let difference=e.gamma-neutral;if(difference>180)difference-=360;if(difference< -180)difference+=360;const deadzone=3;const amount=Math.max(0,Math.abs(difference)-deadzone);const raw=THREE.MathUtils.clamp(Math.sign(difference)*amount/27,-1,1);tilt+=(raw-tilt)*.24}});
$('centerBtn').onclick=()=>{if(lastGamma===null){hint.textContent='⚠️ MOTION SENSOR NOT READY';return}neutral=lastGamma;tilt=0;hint.textContent='🎯 CENTERED · TILT GENTLY'};$('pauseBtn').onclick=()=>{if(!active)return;paused=!paused;$('pauseBtn').textContent=paused?'▶':'⏸';hint.textContent=paused?'⏸ PAUSED · TAP ▶ TO RESUME':'🛺 GO!';last=performance.now()};$('soundBtn').onclick=()=>{soundOn=!soundOn;$('soundBtn').textContent=soundOn?'🔊':'🔇'};document.addEventListener('visibilitychange',()=>{if(document.hidden&&active&&!paused){paused=true;$('pauseBtn').textContent='▶';hint.textContent='⏸ PAUSED · TAP ▶ TO RESUME'}});$('start').onclick=async()=>{reset();try{if(window.DeviceOrientationEvent&&typeof DeviceOrientationEvent.requestPermission==='function'){const permission=await DeviceOrientationEvent.requestPermission();if(permission!=='granted')hint.textContent='⚠️ MOTION OFF · SWIPE TO STEER'}}catch(e){hint.textContent='⚠️ MOTION OFF · SWIPE TO STEER'}};
