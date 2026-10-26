
import * as THREE from "three";
import {GLTFLoader} from "three/addons/loaders/GLTFLoader.js";
import {createExpresswayArt} from "./expressway-art.js";
import {makeExpresswayVehicle} from "./expressway-vehicle-models.js";
const $=id=>document.getElementById(id),hud=$('score'),status=$('status'),hint=$('hint'),challenge=$('challenge'),districtLabel=$('district'),overlay=$('overlay'),panel=$('panel');
let renderer;try{renderer=new THREE.WebGLRenderer({antialias:false,powerPreference:'high-performance'});}catch(e){$('error').style.display='block';throw e}
const mobile=/iPhone|iPad|iPod|Android/i.test(navigator.userAgent);let mobilePixelRatio=Math.min(devicePixelRatio||1,mobile?1.05:1.25);renderer.setPixelRatio(mobilePixelRatio);renderer.setSize(innerWidth,innerHeight);renderer.setClearColor(0x20104e);document.body.insertBefore(renderer.domElement,document.body.firstChild);
const scene=new THREE.Scene();scene.background=new THREE.Color(0x20104e);scene.fog=new THREE.Fog(0x20104e,48,145);const districtSkies=[new THREE.Color(0x56cfff),new THREE.Color(0x131d30),new THREE.Color(0x8797a3)];let districtIndex=-1;
const camera=new THREE.PerspectiveCamera(76,innerWidth/innerHeight,.1,180);camera.position.set(0,2.15,3.15);
scene.add(new THREE.HemisphereLight(0xffffff,0x656c70,1.65));const sun=new THREE.DirectionalLight(0xfff5e6,1.25);sun.position.set(-12,20,8);scene.add(sun);
const mat=(c)=>new THREE.MeshLambertMaterial({color:c,flatShading:true});const M={road:mat(0x484b52),stripe:mat(0xe2c579),grass:mat(0x34333b),blue:mat(0x18c5d2),gold:mat(0xffd64b),pink:mat(0xf56d85),black:mat(0x252333),glass:mat(0x4d91b9),wheel:mat(0x22212b),durian:mat(0x70b525),spike:mat(0xffe157),skin:mat(0xffcb95),white:mat(0xffffff),red:mat(0xe65a4e),green:mat(0x42ad76),purple:mat(0x8869b6)};
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
wetRoadRoughnessCtx.fillStyle='rgba(242,242,242,.32)';
for(let i=0;i<180;i++){
 const px=(i*73+17)%256,py=(i*47+29)%256;
 wetRoadRoughnessCtx.fillRect(px,py,1+(i%3),1+(i%2));
}
const wetRoadRoughnessTexture=new THREE.CanvasTexture(wetRoadRoughnessCanvas);
wetRoadRoughnessTexture.wrapS=wetRoadRoughnessTexture.wrapT=THREE.RepeatWrapping;
wetRoadRoughnessTexture.repeat.set(2,26);
const asphaltTexture=new THREE.CanvasTexture(asphaltCanvas);asphaltTexture.wrapS=asphaltTexture.wrapT=THREE.RepeatWrapping;asphaltTexture.repeat.set(2,26);M.road.map=asphaltTexture;M.road.needsUpdate=true;
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
const wetAsphalt=new THREE.MeshStandardMaterial({color:0x777f8d,map:asphaltTexture,roughnessMap:wetRoadRoughnessTexture,roughness:.52,metalness:.12});
const dryAsphalt=new THREE.MeshStandardMaterial({color:0x777f8d,map:asphaltTexture,roughness:.94,metalness:0});
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
const expresswayRoadTexture=new THREE.CanvasTexture(expresswayRoadCanvas);
expresswayRoadTexture.colorSpace=THREE.SRGBColorSpace;
expresswayRoadTexture.wrapS=expresswayRoadTexture.wrapT=THREE.RepeatWrapping;
expresswayRoadTexture.repeat.set(1,18);
const expresswayRoughnessTexture=new THREE.CanvasTexture(expresswayRoughCanvas);
expresswayRoughnessTexture.wrapS=expresswayRoughnessTexture.wrapT=THREE.RepeatWrapping;
expresswayRoughnessTexture.repeat.set(1,18);
const expresswayAsphalt=new THREE.MeshStandardMaterial({
 color:0xc5c8ca,map:expresswayRoadTexture,roughnessMap:expresswayRoughnessTexture,
 roughness:.9,metalness:.03
});
const road=cube(11,.12,230,wetAsphalt,0,0,-60);scene.add(road);
const shoulderPaint=mat(0x4b4b4d),curbPaint=mat(0x8b776b);for(const side of [-1,1]){scene.add(cube(1.25,.11,230,shoulderPaint,side*6.2,-.015,-60));scene.add(cube(.22,.09,230,curbPaint,side*5.58,.08,-60));scene.add(cube(.1,.045,230,M.gold,side*5.37,.10,-60))}
const roadStuds=[];for(let i=0;i<12;i++){const stud=cube(.22,.025,.38,M.gold,0,.09,-i*19+10);scene.add(stud);roadStuds.push(stud)}const stripes=[];for(let i=0;i<23;i++){for(const x of [-1.85,1.85]){const s=cube(.18,.035,3.5,M.stripe,x,.09,-i*10+10);scene.add(s);stripes.push(s)}}
// Bangkok street set: shophouses, awnings, shutters, windows, signs and cables.
const props=[];const storyProps=[];let nightCount=0,grandmaTriggeredNight=0,grandmaChase=null;const nightLength=2400;const storyMat={wood:mat(0x7d4134),roof:mat(0xb52c35),gold:mat(0xf6c847),leaf:mat(0x5b9b39),cloth:mat(0xe85c4c),ghost:mat(0xd8d1ed)};
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
const signMaterials=[mat(0xff267a),mat(0x086bd8),mat(0x1cbf7a)];const neonSigns=[new THREE.MeshBasicMaterial({color:0xff3d96}),new THREE.MeshBasicMaterial({color:0x22ffe0}),new THREE.MeshBasicMaterial({color:0xffd64d})];const daySigns=signMaterials.slice();function applyDistrict(i){if(i===districtIndex)return;districtIndex=i;districtLabel.textContent=['☀️ BANGKOK DAYTIME','🌃 YAOWARAT NIGHT · TEST 6.9','🚧 RAMA II CONSTRUCTION · TEST 6.9','🛍️ JJ MARKET · CHATUCHAK · 8000+','🛣️ BANGKOK EXPRESSWAY · 12000+','🌈 PATTAYA WALKING STREET · 16000+'][i];for(let k=0;k<3;k++)signMaterials[k]=i===1?neonSigns[k]:daySigns[k];for(const b of props){if(b.userData.sign)b.userData.sign.material=signMaterials[b.userData.signIndex%3]}const rama=i===2;M.grass.color.setHex(rama?0x78746d:0x34333b);M.road.color.setHex(rama?0x777b81:0x56535c);M.stripe.color.setHex(rama?0xe5e1d3:0xe2c579);shoulderPaint.color.setHex(rama?0x77736e:0x444148);curbPaint.color.setHex(rama?0x9d968b:0x756866);hint.textContent=['🛺 WELCOME TO BANGKOK!','🏮 WELCOME TO YAOWARAT!','🌇 SUNSET DRIVE!','🌿 JJ MARKET! WATCH THE TRAFFIC!','🛸 EXPRESSWAY! UFO LASERS INCOMING!','🌈 PATTAYA WALKING STREET!'][i]}
function makeRoadsideStory(kind,side,z){const g=new THREE.Group();if(kind==='shrine'){g.add(cube(1.5,.25,1.3,storyMat.wood,0,.55,0));for(const sx of [-.53,.53])for(const sz of [-.42,.42])g.add(cube(.12,1.55,.12,storyMat.gold,sx,1.4,sz));g.add(cube(1.9,.3,1.65,storyMat.roof,0,2.25,0));g.add(cube(.55,.8,.52,storyMat.gold,0,1.4,0))}else{g.add(cube(2.4,.95,1.45,storyMat.wood,0,.7,0));g.add(cube(2.65,.15,1.8,storyMat.cloth,0,1.65,0));for(let i=0;i<5;i++){const d=new THREE.Mesh(new THREE.IcosahedronGeometry(.24,0),M.durian);d.position.set((i-2)*.38,1.3,(i%2)*.34-.2);g.add(d)}const vendor=new THREE.Group();vendor.add(cube(.45,.8,.34,storyMat.cloth,0,1.48,0));vendor.add(ball(.34,M.skin,0,2.07,0));vendor.add(ball(.37,M.black,0,2.36,.02));vendor.add(ball(.08,M.white,-.13,2.1,-.29));vendor.add(ball(.08,M.white,.13,2.1,-.29));const arm=cube(.13,.63,.14,M.skin,-.37,1.55,0);vendor.add(arm);vendor.position.x=-.85;g.add(vendor);g.userData.vendorArm=arm;g.userData.vendorFruit=ball(.29,M.durian,-.35,1.65,-.4);g.add(g.userData.vendorFruit)}g.position.set(side*7.35,0,z);scene.add(g);storyProps.push({g,kind,side,triggered:false,dropTime:0});return g}
function makeGrandma(){const g=new THREE.Group();g.add(cube(.72,1.25,.48,storyMat.ghost,0,1.18,0));g.add(ball(.44,M.skin,0,2.06,0));g.add(ball(.49,storyMat.ghost,0,2.37,.06));g.add(ball(.10,M.black,-.13,2.08,-.30));g.add(ball(.10,M.black,.13,2.08,-.30));g.add(cube(.23,.045,.05,M.red,0,1.88,-.34));const arms=[],legs=[];for(const side of [-1,1]){const leg=cube(.16,.86,.18,storyMat.ghost,side*.25,.52,0);g.add(leg);legs.push(leg);const arm=cube(.13,.82,.16,M.skin,side*.49,1.35,0);g.add(arm);arms.push(arm)}g.userData.runArms=arms;g.userData.runLegs=legs;return g}
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
 return new THREE.MeshBasicMaterial({map:t,side:THREE.DoubleSide});
}
const shopSignMaterials=[
 ['金龍海鮮','ภัตตาคารมังกรทอง'],
 ['海鮮酒樓','อาหารทะเลสด'],
 ['中華飯店','ภัตตาคารจีน'],
 ['永安藥房','ร้านขายยา'],
 ['大金行','ห้างทองเยาวราช']
].map(([cn,th])=>streetSignMaterial(cn,th));
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
 // The existing bilingual enamel plaque carries readable lettering; omit toy-like block glyphs.
 if(i%2===0){g.add(cube(.13,.6,.13,M.gold,1.56,2.92,front));g.add(ball(.18,M.red,1.56,2.51,front))}
 if(i%3===0){g.add(cube(.14,1.7,.14,shopTrim,1.6,3.7,front));g.add(cube(.95,.12,.18,awningColors[i%3],1.1,4.45,front))}
 const plaque=new THREE.Mesh(new THREE.PlaneGeometry(2.65,1.05),shopSignMaterials[i%shopSignMaterials.length]);plaque.position.set(0,3.12,front+(x<0?.21:-.21));plaque.rotation.y=x<0?0:Math.PI;g.add(plaque);
if(i%2===0){const hanging=new THREE.Mesh(new THREE.PlaneGeometry(1.1,3.5),neonBladeMaterials[i%neonBladeMaterials.length]);hanging.position.set(x<0?1.75:-1.75,5.8,front+(x<0?-.8:.8));hanging.rotation.y=x<0?-.75:.75;g.add(hanging);g.add(cube(.09,.09,1.25,oldGold,x<0?1.75:-1.75,7.5,front));}
if(i%3===1){const grille=cube(2.9,2.1,.09,glassDark,0,1.17,front+(x<0?.12:-.12));g.add(grille);for(let q=-2;q<=2;q++)g.add(cube(.055,2.15,.13,oldGold,q*.52,1.17,front+(x<0?.2:-.2)))}if(i%3===0){const light=ball(.19,warmNeon,0,2.37,front+(x<0?.68:-.68));g.add(light)}if(i%5===0){const lantern=ball(.24,redNeon,0,2.15,front+(x<0?1.0:-1.0));g.add(lantern);g.add(cube(.06,.24,.06,oldGold,0,2.5,front+(x<0?1.0:-1.0)));}g.rotation.y=Math.PI/2;g.position.set(x,0,z);scene.add(g);props.push(g);if(i%3!==1&&!((x<0&&i===6)||(x>0&&i===23))){const blade=new THREE.Mesh(new THREE.PlaneGeometry(i%4===0?1.9:1.35,i%4===0?4.8:3.45),neonBladeMaterials[(i*3+(x>0?2:0))%neonBladeMaterials.length]);blade.position.set(x<0?-4.85:4.85,i%4===0?5.8:6.2,z+(i%4===0?1.8:-.7));blade.userData.neonReflectionAnchor=true;blade.userData.neonReflectionColorIndex=(i*3+(x>0?2:0))%neonBladePalettes.length;scene.add(blade);props.push(blade);}
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
const siteCrane=new THREE.MeshLambertMaterial({color:0xe6a632});
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
const siteStripeMaterial=new THREE.MeshStandardMaterial({
 map:barrierStripeTexture,metalness:.04,roughness:.48,
 emissive:0x35130b,emissiveIntensity:.14,side:THREE.DoubleSide
});
const siteStripeGeo=new THREE.PlaneGeometry(2.75,.36);
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
 // A separate unfinished pier, behind the barriers and clear of the roadway.
 g.add(cube(2.4,.7,2.4,siteConcrete,side*10,.35,-6));
 g.add(cube(1.7,10,1.7,siteConcrete,side*10,5.35,-6));
 g.add(cube(3.3,.65,3.1,siteConcrete,side*10,10.65,-6));
 for(const dx of [-.58,.58])for(const dz of [-.58,.58])
  g.add(cube(.09,2.8,.09,siteSteel,side*10+dx,12.35,-6+dz));
 // Crane tower and diagonal jib: visible above the viaduct, not across the road.
 g.add(cube(.55,17,.55,siteCrane,side*14,8.5,-15));
 const jib=cube(.35,.35,13,siteCrane,side*14,16.5,-20);
 jib.rotation.x=-.08;g.add(jib);
 g.add(cube(.06,5,.06,siteSteel,side*14,13.7,-25));
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
const cockpitFinishTexture=new THREE.CanvasTexture(cockpitFinishCanvas);
cockpitFinishTexture.colorSpace=THREE.SRGBColorSpace;
cockpitFinishTexture.anisotropy=mobile?2:4;
const cockpitBlue=new THREE.MeshPhysicalMaterial({color:0x1693a3,map:cockpitFinishTexture,metalness:.4,roughness:.48,clearcoat:.35,clearcoatRoughness:.36});
const cockpitGold=new THREE.MeshStandardMaterial({color:0xe6b958,map:cockpitFinishTexture,metalness:.6,roughness:.39});
const cockpitRed=new THREE.MeshStandardMaterial({color:0xc73556,metalness:.18,roughness:.58});
// Baked, intentionally soft night-street reflections in the existing side-mirror faces.
// No secondary camera, render target, additional geometry or per-frame allocations.
const cockpitMirrorCanvas=document.createElement('canvas');
cockpitMirrorCanvas.width=192;cockpitMirrorCanvas.height=128;
const mirrorCtx=cockpitMirrorCanvas.getContext('2d');
const mirrorSky=mirrorCtx.createLinearGradient(0,0,0,128);
mirrorSky.addColorStop(0,'#293c4b');mirrorSky.addColorStop(.58,'#1a2936');mirrorSky.addColorStop(1,'#30383b');
mirrorCtx.fillStyle=mirrorSky;mirrorCtx.fillRect(0,0,192,128);
mirrorCtx.fillStyle='#17232b';
for(let i=0;i<13;i++){
 const bx=i*17-8,bh=26+(i*29)%52;
 mirrorCtx.fillRect(bx,88-bh,15,bh);
 mirrorCtx.fillStyle=i%3===0?'#f26e4b':'#c5a15d';
 mirrorCtx.fillRect(bx+3,91-bh,2,Math.min(20,bh-4));
 mirrorCtx.fillStyle='#17232b';
}
const mirrorRoad=mirrorCtx.createLinearGradient(0,85,0,128);
mirrorRoad.addColorStop(0,'#4a5050');mirrorRoad.addColorStop(1,'#151e26');
mirrorCtx.fillStyle=mirrorRoad;mirrorCtx.fillRect(0,85,192,43);
for(let i=0;i<19;i++){
 const x=(i*43+13)%192,y=89+(i*17)%35;
 mirrorCtx.fillStyle=i%3===0?'rgba(244,69,82,.48)':'rgba(244,177,93,.28)';
 mirrorCtx.fillRect(x,y,2+(i%3),4+(i%9));
}
const mirrorHaze=mirrorCtx.createLinearGradient(0,0,192,0);
mirrorHaze.addColorStop(0,'rgba(205,223,224,.29)');
mirrorHaze.addColorStop(.4,'rgba(205,223,224,0)');
mirrorHaze.addColorStop(1,'rgba(205,223,224,.16)');
mirrorCtx.fillStyle=mirrorHaze;mirrorCtx.fillRect(0,0,192,128);
const cockpitMirrorTexture=new THREE.CanvasTexture(cockpitMirrorCanvas);
cockpitMirrorTexture.colorSpace=THREE.SRGBColorSpace;
cockpitMirrorTexture.anisotropy=mobile?2:4;
const cockpitMirrorMaterial=new THREE.MeshPhysicalMaterial({map:cockpitMirrorTexture,metalness:.12,roughness:.19,clearcoat:.55,clearcoatRoughness:.18});
function cockpitTube(pts,r,m){const path=new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p)));const o=new THREE.Mesh(new THREE.TubeGeometry(path,Math.max(8,pts.length*5),r,6,false),m);cockpit.add(o);return o}
cockpit.add(cube(2.45,.28,.5,cockpitBlue,0,-.99,-1.35));
cockpit.add(cube(1.6,.13,.36,cockpitGold,0,-.78,-1.48));
cockpitTube([[-.75,-.70,-1.36],[-.45,-.64,-1.42],[0,-.68,-1.48],[.45,-.64,-1.42],[.75,-.70,-1.36]],.046,cockpitChrome);
for(const side of [-1,1]){
 cockpit.add(cube(.33,.13,.19,cockpitMat,side*.76,-.70,-1.36));
 cockpitTube([[side*.9,-.92,-1.42],[side*1.03,.1,-1.55],[side*1.09,.71,-1.52]],.046,cockpitChrome);
 cockpit.add(cube(.38,.30,.075,cockpitChrome,side*1.12,.05,-1.55));
 cockpit.add(cube(.29,.22,.078,cockpitMirrorMaterial,side*1.12,.05,-1.60));
}
// Remove the overhead trim from the camera view; keep the lower dashboard and side frame.
// Upper windshield crossbar removed to expose the street.
const speedDial=new THREE.Group();speedDial.position.set(0,-.67,-1.37);cockpit.add(speedDial);
const dialFace=new THREE.Mesh(new THREE.CylinderGeometry(.18,.18,.045,20),cockpitMat);dialFace.rotation.x=Math.PI/2;speedDial.add(dialFace);
const dialRim=new THREE.Mesh(new THREE.TorusGeometry(.18,.025,6,22),cockpitGold);speedDial.add(dialRim);
const dialNeedle=cube(.018,.13,.016,cockpitRed,0,.05,.05);speedDial.add(dialNeedle);
// Shared physically based finishes for the always-available player tuk-tuk.
// No extra geometry, lights or per-frame allocations: mobile-friendly GLB fallback.
const playerPaint=new THREE.MeshPhysicalMaterial({color:0x078a9b,metalness:.42,roughness:.32,clearcoat:.65,clearcoatRoughness:.24});
const playerBrass=new THREE.MeshStandardMaterial({color:0xc6a04b,metalness:.66,roughness:.34});
const playerChrome=new THREE.MeshStandardMaterial({color:0xbcc8ce,metalness:.85,roughness:.22});
const playerRubber=new THREE.MeshStandardMaterial({color:0x171a1e,metalness:0,roughness:.94});
const playerFabric=new THREE.MeshStandardMaterial({color:0x8e3042,metalness:0,roughness:.91,side:THREE.DoubleSide});
const playerGlass=new THREE.MeshPhysicalMaterial({color:0x93b9c3,metalness:0,roughness:.16,transparent:true,opacity:.58,depthWrite:false,side:THREE.DoubleSide});
const playerSeat=new THREE.MeshStandardMaterial({color:0x513c43,metalness:0,roughness:.82});
const playerDark=new THREE.MeshStandardMaterial({color:0x18242b,metalness:.18,roughness:.68});
const playerHeadlight=new THREE.MeshStandardMaterial({color:0xf5efdc,emissive:0xd8bd85,emissiveIntensity:.18,roughness:.34});
const playerTaillight=new THREE.MeshStandardMaterial({color:0x9b2427,emissive:0x9b1010,emissiveIntensity:.28,roughness:.36});
const chrome=playerChrome,seat=playerSeat,dark=playerDark;
function tube(points,r,m){const path=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));const mesh=new THREE.Mesh(new THREE.TubeGeometry(path,Math.max(8,points.length*5),r,7,false),m);car.add(mesh);return mesh}
function ellipsoid(x,y,z,sx,sy,sz,m){const o=ball(1,m,x,y,z);o.scale.set(sx,sy,sz);car.add(o);return o}
function cyl(r1,r2,h,m,x,y,z,rot=0){const o=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,14),m);o.position.set(x,y,z);o.rotation.z=rot;car.add(o);return o}
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
const canopyCanvas=document.createElement('canvas');canopyCanvas.width=canopyCanvas.height=256;
const canopyCtx=canopyCanvas.getContext('2d');
canopyCtx.fillStyle='#783848';canopyCtx.fillRect(0,0,256,256);
for(let i=0;i<256;i+=4){
 canopyCtx.fillStyle=i%8===0?'rgba(250,220,200,.055)':'rgba(15,9,15,.065)';
 canopyCtx.fillRect(i,0,1,256);canopyCtx.fillRect(0,i,256,1);
}
for(const x of [22,234]){
 canopyCtx.fillStyle='rgba(24,15,18,.38)';canopyCtx.fillRect(x-3,0,6,256);
 canopyCtx.fillStyle='rgba(221,172,144,.44)';canopyCtx.fillRect(x,0,1,256);
 for(let y=3;y<256;y+=10){canopyCtx.fillStyle='rgba(235,198,160,.65)';canopyCtx.fillRect(x-1,y,2,4)}
}
for(let i=0;i<9;i++){
 const x=(i*79+31)%256,y=(i*47+19)%256;
 const stain=canopyCtx.createRadialGradient(x,y,1,x,y,34+i%3*12);
 stain.addColorStop(0,'rgba(25,20,23,.18)');stain.addColorStop(1,'rgba(25,20,23,0)');
 canopyCtx.fillStyle=stain;canopyCtx.fillRect(x-52,y-52,104,104);
}
const canopyTexture=new THREE.CanvasTexture(canopyCanvas);
canopyTexture.colorSpace=THREE.SRGBColorSpace;canopyTexture.anisotropy=mobile?2:4;
const canopyFabric=new THREE.MeshStandardMaterial({map:canopyTexture,roughness:.95,metalness:0,side:THREE.DoubleSide});
const canopyVertices=[],canopyUVs=[],canopyIndices=[],roofRows=8,roofCols=8;
for(let j=0;j<=roofRows;j++){
 const v=j/roofRows,z=-1.40+3.06*v;
 for(let i=0;i<=roofCols;i++){
  const u=i/roofCols,x=(u-.5)*2.24;
  const y=2.27+.23*(1-(x/1.12)**2)-.035*Math.sin(Math.PI*v);
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
  canopyVertices.push(side*1.12,y,z,side*1.12,y-.16,z);
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
// windshield and framing
const windshield=cube(1.57,.68,.065,playerGlass,0,1.76,-.91);windshield.rotation.x=-.18;car.add(windshield);
tube([[-.84,1.38,-.95],[-.85,2.1,-.88],[.85,2.1,-.88],[.84,1.38,-.95]],.042,chrome);
car.add(cube(1.05,.08,.08,chrome,0,1.43,-1.04));
car.add(cube(.5,.12,.07,dark,0,1.51,-.99));
// front single wheel and rounded fender
cyl(.4,.4,.22,playerRubber,0,.42,-1.42,Math.PI/2);
cyl(.22,.22,.24,chrome,0,.42,-1.42,Math.PI/2);
ellipsoid(0,.69,-1.43,.45,.13,.5,playerBrass);
// lamps, bumper, tail plate
for(const side of [-1,1]){
  ellipsoid(side*.58,1.02,-1.5,.22,.22,.12,chrome);
  ellipsoid(side*.58,1.02,-1.61,.15,.15,.045,playerHeadlight);
  ellipsoid(side*.73,1.05,1.4,.14,.14,.08,playerTaillight);
}
tube([[-.82,.57,-1.48],[-.66,.5,-1.7],[.66,.5,-1.7],[.82,.57,-1.48]],.065,chrome);
car.add(cube(.62,.22,.08,playerBrass,0,.93,1.49));
car.add(cube(.4,.12,.09,playerDark,0,.93,1.55));
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
const hazards=[];function makeDurian(){const group=new THREE.Group();group.add(ball(.75,M.durian,0,.8,0));for(let i=0;i<15;i++){const a=i*Math.PI*2/15;const spike=new THREE.Mesh(new THREE.ConeGeometry(.23,.54,4),M.spike);spike.position.set(Math.cos(a)*.77,.85+Math.sin(a)*.4,Math.sin(a)*.77);spike.rotation.z=Math.PI/2-a;group.add(spike)}return group}
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
const busFrontGlassPane=new THREE.PlaneGeometry(2.35,.88);
const busRearGlassPane=new THREE.PlaneGeometry(2.32,.78);
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
function makeBus(variant='red'){
 const g=new THREE.Group(),blue=variant==='blue',main=blue?busCream:busRed,trim=blue?busBlue:busCream,accent=blue?busYellow:busGreen;
 const body=new THREE.Mesh(busBodyGeometry,main);
 body.position.set(0,1.67,-2.65);part(g,body);
 part(g,cube(2.96,.31,5.38,blue?busBlue:busRed,0,3.03,0));
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
 // Bangkok buses board from the left; the opposite side stays uninterrupted.
 const door=new THREE.Mesh(busDoorPane,busDoorMaterial);
 door.rotation.y=-Math.PI/2;door.position.set(-1.516,1.81,1.67);part(g,door);
 const frontGlass=new THREE.Mesh(busFrontGlassPane,busWindshield);frontGlass.position.set(0,2.28,2.748);part(g,frontGlass);
 part(g,cube(.075,.87,.09,trim,0,2.28,2.76));
 part(g,cube(2.43,.51,.13,trim,0,3.02,2.73));
 part(g,cube(.86,.39,.15,busCream,0,3.06,2.82));
 const frontRoute=new THREE.Mesh(busRoutePane,blue?busRouteSigns.blue:busRouteSigns.red);
 frontRoute.position.set(0,3.06,2.916);part(g,frontRoute);
 part(g,cube(1.62,.36,.10,busDark,0,1.12,2.74));
 for(let j=0;j<3;j++)part(g,cube(1.45,.035,.12,trim,0,1.02+j*.10,2.82));
 part(g,cube(2.64,.22,.18,busDark,0,.55,2.79));
 for(const side of [-1,1]){
  part(g,ball(.18,busLamp,side*.97,.98,2.81));
  part(g,cube(.24,.15,.11,M.gold,side*1.14,1.49,2.79));
  part(g,cube(.25,.36,.095,busTailLamp,side*1.18,1.17,-2.74));
 }
 // The rear is visible while approaching from behind in the POV game.
 const rearGlass=new THREE.Mesh(busRearGlassPane,busWindshield);rearGlass.rotation.y=Math.PI;rearGlass.position.set(0,2.28,-2.748);part(g,rearGlass);
 part(g,cube(2.43,.48,.12,trim,0,3.01,-2.73));
 const rearRoute=new THREE.Mesh(busRoutePane,blue?busRouteSigns.blue:busRouteSigns.red);
 rearRoute.rotation.y=Math.PI;rearRoute.position.set(0,3.05,-2.805);part(g,rearRoute);
 part(g,cube(2.56,.19,.13,busDark,0,.58,-2.77));
 if(blue){part(g,cube(2.6,.17,.13,busYellow,0,1.42,2.79));part(g,cube(2.5,.39,.13,busBlue,0,.82,2.78))}
 else{part(g,cube(2.65,.18,.14,busGreen,0,1.62,2.79));part(g,cube(2.45,.43,.12,busCream,0,.91,2.78))}
 // The rear panel is below the window, inside the tail lamps and above the bumper.
 const rearPanel=new THREE.Mesh(busRearPanelGeometry,blue?busRearPanels.blue:busRearPanels.red);
 rearPanel.rotation.y=Math.PI;rearPanel.position.set(0,1.31,-2.785);part(g,rearPanel);
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
 const frontGlass=new THREE.Mesh(new THREE.PlaneGeometry(1.42,.49),taxiReflectiveGlass);
 frontGlass.position.set(0,1.51,.83);frontGlass.rotation.x=-.48;g.add(frontGlass);
 const rearGlass=new THREE.Mesh(new THREE.PlaneGeometry(1.39,.44),taxiReflectiveGlass);
 rearGlass.position.set(0,1.51,-.91);rearGlass.rotation.x=.45;g.add(rearGlass);
 // Distinct Bangkok TAXI-METER roof sign, painted once for all traffic clones.
 const signCanvas=document.createElement('canvas');signCanvas.width=256;signCanvas.height=128;
 const ctx=signCanvas.getContext('2d');
 ctx.fillStyle='#f8f2d7';ctx.fillRect(0,0,256,128);
 ctx.fillStyle='#11654b';ctx.fillRect(6,6,244,116);
 ctx.fillStyle='#fff8dd';ctx.font='bold 41px sans-serif';ctx.textAlign='center';ctx.fillText('TAXI',128,55);
 ctx.font='bold 25px sans-serif';ctx.fillText('แท็กซี่',128,95);
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
tukCanvas.map=tukRoofTexture;tukCanvas.needsUpdate=true;
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
const tukTailLensTexture=makeTukLampLensTexture(true);
const tukLamp=new THREE.MeshPhysicalMaterial({
 map:tukHeadLensTexture,color:0xfff8ed,emissive:0x99764b,
 emissiveIntensity:.3,metalness:.06,roughness:.23,
 clearcoat:.75,clearcoatRoughness:.16
});
const tukTail=new THREE.MeshPhysicalMaterial({
 map:tukTailLensTexture,color:0xffd6d2,emissive:0x8c171b,
 emissiveIntensity:.24,metalness:0,roughness:.29,
 clearcoat:.65,clearcoatRoughness:.19
});
const tukEngineSteel=new THREE.MeshStandardMaterial({color:0x51565a,metalness:.66,roughness:.72});
const tukEngineUnitBox=new THREE.BoxGeometry(1,1,1);
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
function makeTukTuk(){
 const g=new THREE.Group();
 // The tapered pressed-metal nose and rear wheel arch have rounded bevels.
 function sideShell(points,width,material){
  const outline=new THREE.Shape();
  points.forEach(([z,y],i)=>i?outline.lineTo(-z,y):outline.moveTo(-z,y));
  outline.closePath();
  const geo=new THREE.ExtrudeGeometry(outline,{depth:width-.07,steps:1,bevelEnabled:true,bevelThickness:.035,bevelSize:.035,bevelSegments:2,curveSegments:3});
  const mesh=new THREE.Mesh(geo,material);
  mesh.rotation.y=Math.PI/2;mesh.position.x=-(width-.07)/2;g.add(mesh);
 }
 sideShell([[-1.32,.55],[1.32,.55],[1.47,.81],[1.27,1.24],[.94,1.47],[.44,1.34],[-.65,1.08],[-1.29,1.04]],1.5,tukPaint);
 sideShell([[.62,1.12],[1.26,1.14],[1.32,1.22],[.84,1.31]],1.54,tukAccent);
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
  const mirror=cube(.29,.19,.07,tukWindow,side*.91,1.98,1.04);mirror.rotation.y=side*.12;g.add(mirror);
  g.add(ball(.12,tukTail,side*.57,.84,-1.36));
 }
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
  const topY=.4+.45*Math.cos(angle),topZ=1.41+.45*Math.sin(angle);
  for(let col=0;col<4;col++){
   const rolledEdge=(col===0||col===3)?-.045:0;
   guardVertices.push(guardWidths[col],topY+rolledEdge,topZ);
   guardUV.push(col/3,step/guardSteps);
  }
 }
 for(let step=0;step<guardSteps;step++)for(let col=0;col<3;col++){
  const a=step*4+col,b=a+4;
  // Winding points outward toward the upper visible surface.
  guardIndices.push(a,b,a+1,a+1,b,b+1);
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
 // Tapered, lightly reflective windscreen with a baked seal and parked wiper.
 // Custom four-vertex pane follows the cab uprights without additional draw calls.
 const windscreenGeometry=new THREE.BufferGeometry();
 windscreenGeometry.setAttribute('position',new THREE.Float32BufferAttribute([
  -.71,-.335,0, .71,-.335,0, -.65,.335,0, .65,.335,0
 ],3));
 windscreenGeometry.setAttribute('uv',new THREE.Float32BufferAttribute([
  0,0, 1,0, 0,1, 1,1
 ],2));
 windscreenGeometry.setIndex([0,1,2,1,3,2]);
 windscreenGeometry.computeVertexNormals();
 const glass=new THREE.Mesh(windscreenGeometry,tukWindscreen);
 glass.position.set(0,1.88,.79);glass.rotation.x=-.15;g.add(glass);
 rod(g,[-.7,1.53,.85],[-.7,2.23,.72],.027,tukTrim);
 rod(g,[.7,1.53,.85],[.7,2.23,.72],.027,tukTrim);
 g.add(cube(1.46,.055,.055,tukTrim,0,2.24,.72));
 // Curved cloth canopy: a single low-poly strip instead of a flat slab.
 const vertices=[],indices=[],uvs=[],nx=8,nz=3;
 for(let iz=0;iz<=nz;iz++)for(let ix=0;ix<=nx;ix++){
  const x=-.86+ix*1.72/nx,z=-1.38+iz*2.16/nz;
  vertices.push(x,2.34+.16*(1-(x/.86)*(x/.86)),z);uvs.push(ix/nx,iz/nz);
 }
 for(let iz=0;iz<nz;iz++)for(let ix=0;ix<nx;ix++){
  const a=iz*(nx+1)+ix,b=a+nx+1;indices.push(a,b,a+1,b,b+1,a+1);
 }
 const roofGeometry=new THREE.BufferGeometry();
 roofGeometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
 roofGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
 roofGeometry.setIndex(indices);roofGeometry.computeVertexNormals();
 g.add(new THREE.Mesh(roofGeometry,tukCanvas));
 // Three curved transverse bows and two full-length edge rails make the
 // weathered canvas canopy read as tensioned fabric on a real steel frame.
 // The roof and handlebar share 21 chrome tube instances in one draw call.
 const frame=new THREE.InstancedMesh(tukCanopyFrameGeometry,tukTrim,21);
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
 const canopyY=x=>2.305+.16*(1-(x/.86)*(x/.86));
 for(const z of [-1.33,-.30,.72]){
  for(let ix=0;ix<4;ix++){
   const x0=-.86+ix*.43,x1=x0+.43;
   addCanopyTube(x0,canopyY(x0),z,x1,canopyY(x1),z);
  }
 }
 for(const x of [-.85,.85])addCanopyTube(x,canopyY(x),-1.38,x,canopyY(x),.78);
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
 return g;
}
function makeBike(){
 const g=new THREE.Group();
 const orange=new THREE.MeshStandardMaterial({color:0xf4511e,roughness:.48});
 const dark=new THREE.MeshStandardMaterial({color:0x20232b,roughness:.85});
 const skin=new THREE.MeshStandardMaterial({color:0xe9ae86,roughness:.94});
 const pink=new THREE.MeshStandardMaterial({color:0xf02d79,roughness:.78});
 const helmet=new THREE.MeshStandardMaterial({color:0xff6728,roughness:.32});
 const hairBike=new THREE.MeshStandardMaterial({color:0x482322,roughness:.9});
 for(const z of [-.83,.88]){
  const w=new THREE.Mesh(new THREE.CylinderGeometry(.43,.43,.16,14),dark);w.rotation.z=Math.PI/2;w.position.set(0,.44,z);part(g,w);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(.29,.035,6,16),bikeMetal);rim.rotation.y=Math.PI/2;rim.position.set(.09,.44,z);part(g,rim);
 }
 part(g,cube(.31,.19,1.5,bikeMetal,0,.66,0));
 part(g,cube(.64,.43,.85,orange,0,.97,.32));
 part(g,cube(.5,.16,.85,dark,0,1.12,-.36));
 part(g,cube(.53,.66,.21,orange,0,1.03,.76));
 part(g,cube(.56,.12,.12,bikeMetal,0,1.55,.91));
 part(g,ball(.16,M.white,0,1.22,.9));
 // Dek waen driver: orange helmet, dark clothes and hands on bars.
 part(g,cube(.45,.66,.34,dark,0,1.64,.06));
 part(g,ball(.27,skin,0,2.12,.22));
 part(g,ball(.32,helmet,0,2.36,.2));
 part(g,cube(.35,.09,.09,dark,0,2.32,.46));
 for(const x of [-.23,.23]){
  const arm=part(g,cube(.13,.53,.13,skin,x,1.66,.46));arm.rotation.x=-.48;
  part(g,cube(.16,.49,.17,dark,x,1.05,-.18));
 }
 // Skoy passenger: pink shirt, orange helmet and flowing hair.
 part(g,cube(.4,.56,.31,pink,0,1.66,-.59));
 part(g,ball(.25,skin,0,2.13,-.58));
 part(g,ball(.31,helmet,0,2.36,-.59));
 for(const x of [-.28,.28]){
  const lock=part(g,ball(.19,hairBike,x,2.12,-.77));lock.scale.set(.65,1.55,.65);
  const leg=part(g,cube(.14,.68,.14,skin,x,1.02,-.83));leg.rotation.x=.45;
  part(g,cube(.22,.11,.33,dark,x,.72,-.56));
 }
 part(g,cube(.5,.25,.25,orange,0,1.1,-.88));
 return g
}
function makeYaksha(){const g=new THREE.Group();
const torso=part(g,cube(1.65,1.85,.9,jade,0,2.18,0));part(g,cube(1.85,.3,1.05,gold2,0,1.45,0));
for(const side of [-1,1]){
 part(g,cube(.54,1.55,.64,M.purple,side*.46,.78,0));
 part(g,ball(.49,gold2,side*1.0,2.85,0));
 const arm=part(g,cube(.43,1.55,.45,jade,side*1.06,2.25,0));arm.rotation.z=side*.35;
 part(g,ball(.29,gold2,side*1.32,1.57,0));
}
part(g,ball(.78,jade,0,3.55,.05));
for(const side of [-1,1]){
 part(g,ball(.21,M.white,side*.31,3.64,.7));
 part(g,ball(.10,ink,side*.31,3.64,.88));
 part(g,ball(.18,M.gold,side*.72,3.65,0));
 const tusk=new THREE.Mesh(new THREE.ConeGeometry(.13,.52,7),cream);tusk.position.set(side*.37,3.15,.76);part(g,tusk)}
part(g,cube(.68,.16,.08,maroon,0,3.24,.78));
const crown=part(g,new THREE.Mesh(new THREE.ConeGeometry(.72,1.2,8),gold2));crown.position.y=4.6;
for(let i=0;i<8;i++){const a=i*Math.PI/4;part(g,ball(.11,M.red,Math.cos(a)*.55,4.05,Math.sin(a)*.55))}
part(g,cube(1.8,.2,1.15,gold2,0,2.94,0));return g}
// V0.7 art pass: curved silhouette, patterned cloth, facial features and articulated dance
function silkTexture(){const c=document.createElement('canvas');c.width=256;c.height=512;const q=c.getContext('2d');const grad=q.createLinearGradient(0,0,256,0);grad.addColorStop(0,'#6d154a');grad.addColorStop(.35,'#d34987');grad.addColorStop(.7,'#f07ba3');grad.addColorStop(1,'#721b55');q.fillStyle=grad;q.fillRect(0,0,256,512);q.strokeStyle='#f6c55d';q.lineWidth=5;for(let x=18;x<256;x+=44){q.beginPath();q.moveTo(x,0);q.bezierCurveTo(x+20,130,x-16,290,x+12,512);q.stroke()}for(let y=50;y<512;y+=86){q.strokeStyle='#ffdd8a';q.lineWidth=2;q.beginPath();for(let x=0;x<256;x+=8){const yy=y+Math.sin(x/15)*8;if(x===0)q.moveTo(x,yy);else q.lineTo(x,yy)}q.stroke()}const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t}
const silk=new THREE.MeshBasicMaterial({map:silkTexture(),side:THREE.DoubleSide});
const pearl=new THREE.MeshStandardMaterial({color:0xffe5a5,metalness:.65,roughness:.3});
const skinShade=new THREE.MeshStandardMaterial({color:0xc6ced6,roughness:.9});const ghostWhite=new THREE.MeshBasicMaterial({color:0xf5f6ed});const ghostBlack=new THREE.MeshBasicMaterial({color:0x100c1a});const ghostRed=new THREE.MeshBasicMaterial({color:0xb30722});
const hair=new THREE.MeshStandardMaterial({color:0x201728,roughness:.72});
function makeDancer(){const g=new THREE.Group();
const profile=[[0,0],[.65,0],[.93,.13],[.82,.45],[.65,.85],[.46,1.35],[.32,1.78],[.31,1.95]].map(p=>new THREE.Vector2(...p));
const dress=part(g,new THREE.Mesh(new THREE.LatheGeometry(profile,32),silk));dress.position.y=.04;
const sash=part(g,new THREE.Mesh(new THREE.TorusGeometry(.38,.055,7,32),pearl));sash.rotation.x=Math.PI/2;sash.position.y=1.92;
const torso=part(g,new THREE.Mesh(new THREE.SphereGeometry(1,18,14),new THREE.MeshStandardMaterial({color:0x542635,roughness:.85})));torso.scale.set(.43,.66,.28);torso.position.y=2.38;
for(const side of [-1,1]){const ep=part(g,ball(.22,pearl,side*.36,2.69,0));ep.scale.set(1.3,.65,1.3)}
const neck=part(g,new THREE.Mesh(new THREE.CylinderGeometry(.14,.15,.25,12),skinShade));neck.position.y=3.03;
const face=part(g,new THREE.Mesh(new THREE.SphereGeometry(.44,18,14),ghostWhite));face.scale.set(.85,1.14,.76);face.position.set(0,3.4,.05);
const bun=part(g,ball(.42,hair,0,3.61,-.19));bun.scale.set(.95,.85,.8);
const fringe=part(g,ball(.33,hair,0,3.73,.16));fringe.scale.set(1.05,.32,.85);
for(const side of [-1,1]){
 const eye=part(g,ball(.145,ghostBlack,side*.18,3.44,.365));eye.scale.set(1.16,1.18,.45);part(g,ball(.092,ghostWhite,side*.18,3.44,.421));part(g,ball(.058,ghostBlack,side*.18,3.44,.483));
 const brow=rod(g,[side*.08,3.65,.41],[side*.29,3.64,.38],.037,ghostBlack);
 part(g,ball(.09,pearl,side*.34,3.26,.1));
}
const lips=part(g,ball(.12,ghostRed,0,3.19,.40));lips.scale.set(1.05,.35,.28);
const headdress=part(g,new THREE.Mesh(new THREE.CylinderGeometry(.19,.38,.32,16),pearl));headdress.position.y=3.98;
for(let i=0;i<5;i++){const tip=part(g,new THREE.Mesh(new THREE.ConeGeometry(.12,.62+(2-Math.abs(i-2))*.18,9),pearl));tip.position.set((i-2)*.17,4.35+(2-Math.abs(i-2))*.09,0)}
for(const side of [-1,1]){const curl=part(g,new THREE.Mesh(new THREE.TorusGeometry(.22,.045,8,20,Math.PI*1.35),pearl));curl.position.set(side*.31,4.02,.12);curl.rotation.z=side*.3}
const arms=[];for(const side of [-1,1]){
 const pivot=new THREE.Group();pivot.position.set(side*.39,2.68,0);g.add(pivot);
 rod(pivot,[0,0,0],[side*.44,-.08,.2],.12,skinShade);
 rod(pivot,[side*.44,-.08,.2],[side*.63,.33,.42],.095,skinShade);
 const hand=part(pivot,ball(.14,skinShade,side*.63,.36,.43));hand.scale.set(.8,1.5,.5);
 for(let i=0;i<3;i++)rod(pivot,[side*.6,.43,.43],[side*(.65+i*.045),.59+i*.04,.43],.022,skinShade);
 part(pivot,ball(.14,pearl,side*.45,-.08,.2));arms.push(pivot)}
g.userData.danceArms=arms;g.userData.dance=true;return g}
// AI-generated GLB: remote preview asset. Replace with a permanent repo-hosted asset for release.
const DANCER_GLB='https://v3b.fal.media/files/b/0aaedcc4/8RK96n7S6Aiz1KkcI1Z6Q_model.glb';
let dancerTemplate=null,dancerLoading=false;
function loadDancerAsset(){
dancerLoading=true;
new GLTFLoader().load(DANCER_GLB,glb=>{
 try{
 const root=glb.scene;
 // Clamp oversized PBR textures to 1024px to reduce GPU memory on phones.
 const processed=new Set();root.traverse(obj=>{if(!obj.isMesh)return;obj.frustumCulled=true;const mats=Array.isArray(obj.material)?obj.material:[obj.material];for(const m of mats){if(!m)continue;for(const key of ['map','normalMap','roughnessMap','metalnessMap','emissiveMap','aoMap']){const tex=m[key];if(!tex||processed.has(tex))continue;processed.add(tex);const img=tex.image;if(img&&img.width>768&&img.height>0&&typeof document!=='undefined'){const ratio=Math.min(1,768/Math.max(img.width,img.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.width*ratio));canvas.height=Math.max(1,Math.round(img.height*ratio));try{canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);tex.image=canvas;tex.needsUpdate=true}catch(e){}}}}});
 root.updateMatrixWorld(true);
 const bounds=new THREE.Box3().setFromObject(root),size=bounds.getSize(new THREE.Vector3());
 if(!Number.isFinite(size.y)||size.y<=0)throw Error('Invalid dancer model bounds');
 const center=bounds.getCenter(new THREE.Vector3());
 root.position.sub(center);root.position.y+=size.y/2;
 const normalized=new THREE.Group();normalized.add(root);normalized.scale.setScalar(4.25/size.y);
 dancerTemplate=normalized;dancerLoading=false;
 }catch(error){dancerLoading=false;console.warn('Dancer GLB invalid; procedural fallback retained',error)}
},undefined,err=>{console.warn('GLB unavailable, using procedural fallback',err);dancerLoading=false});
}
// Premium AI-generated Thai Yaksha; fallback stays available on slow connections.
const YAKSHA_GLB='https://v3b.fal.media/files/b/0aaedd6a/14yrGJ3Iq8XcawwVvTolz_model.glb';
let yakshaTemplate=null;
function loadYakshaAsset(){
new GLTFLoader().load(YAKSHA_GLB,glb=>{
 try{
 const root=glb.scene;root.updateMatrixWorld(true);
 const box=new THREE.Box3().setFromObject(root),sz=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
 if(!Number.isFinite(sz.y)||sz.y<=0)throw Error('Invalid yaksha geometry');
 root.position.sub(center);root.position.y+=sz.y/2;
 const group=new THREE.Group();group.add(root);group.scale.setScalar(4.8/sz.y);
 root.traverse(o=>{if(o.isMesh)o.frustumCulled=true});
 yakshaTemplate=group;
 }catch(e){console.warn('Yaksha fallback',e)}
},undefined,e=>console.warn('Yaksha GLB load failed; using fallback',e));
}
// Optional preview GLBs must not compete with the first playable frame.
// Load the vehicle after play starts; desktop-only character GLBs are staggered.
// Mobile uses the existing procedural dancer/yaksha, so never download unused models.
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
const obstacleTemplates={};function makeConstructionDebris(){const g=new THREE.Group(),concrete=mat(0x9c9b94),steel=mat(0x9a5c32);part(g,cube(2.6,.85,1.45,concrete,0,.44,0));for(const side of [-1,1]){part(g,cube(.12,.9,.12,steel,side*.7,.85,0));part(g,cube(.13,.15,1.2,steel,side*.58,.75,0));}return g}
// Rama II police checkpoint: cones, wheeled red barricades and traffic officers.
function makeCheckpoint(){
 const g=new THREE.Group();
 const red=mat(0xd62828),white=mat(0xf0eee7),orange=mat(0xff681e),uniform=mat(0xa48b6a),vest=mat(0xd2ed45),black=mat(0x222b32);
 for(const x of [-1.65,1.65]){
  const cone=part(g,new THREE.Mesh(new THREE.ConeGeometry(.27,.95,8),orange));cone.position.set(x,.5,.1);
  part(g,cube(.38,.1,.38,white,x,.2,.1));
  part(g,cube(.46,.1,.14,white,x,.6,.1));
 }
 // Barrier leaves room to steer around either side.
 for(const z of [-.25,.25])part(g,cube(2.55,.09,.08,red,0,.9,z));
 for(const x of [-1.25,1.25])part(g,cube(.09,1.25,.1,red,x,.64,0));
 part(g,cube(.68,.68,.05,white,0,1.04,.31));
 const sign=part(g,new THREE.Mesh(new THREE.TorusGeometry(.31,.065,6,16),red));sign.position.set(0,1.04,.35);
 for(const x of [-1.16,1.16])for(const z of [-.28,.28])part(g,ball(.14,black,x,.16,z));
 // Two police silhouettes beside the barrier.
 for(const x of [-2.15,2.15]){
  part(g,cube(.37,.65,.25,uniform,x,1.32,-.6));
  part(g,cube(.39,.2,.27,vest,x,1.53,-.6));
  part(g,ball(.23,uniform,x,1.86,-.6));
  part(g,cube(.46,.12,.35,uniform,x,2.12,-.6));
  for(const dx of [-.12,.12])part(g,cube(.12,.63,.12,black,x+dx,.69,-.6));
 }
 return g
}
// Rama II cargo truck: large Thai-style six-wheeler with cargo box and rear safety stripes.
function makeTruck(){
 const g=new THREE.Group(),body=mat(0xe9e7df),cab=mat(0xf5f2e8),chassis=mat(0x353b40),glass=mat(0x345e70),red=mat(0xc93a2b),yellow=mat(0xe8b83c);
 g.add(cube(2.55,.3,6.4,chassis,0,.9,-.15));
 g.add(cube(2.55,2.55,3.75,body,0,2.45,-1.13));
 g.add(cube(2.45,1.95,1.8,cab,0,1.96,2.05));
 g.add(cube(2.2,.8,.07,glass,0,2.35,2.98));
 g.add(cube(2.28,.28,.12,chassis,0,1.18,3.02));
 for(const z of [-2.55,-.7,2.38])for(const side of [-1,1]){
  const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.53,.53,.22,12),M.wheel);
  wheel.rotation.z=Math.PI/2;wheel.position.set(side*1.24,.56,z);g.add(wheel);
 }
 for(const x of [-.84,.84])g.add(cube(.35,.2,.08,yellow,x,1.48,3.02));
 for(let i=0;i<6;i++)g.add(cube(.29,.17,.09,i%2?yellow:red,-1.03+i*.41,1.06,-3.07));
 g.add(cube(2.4,.15,.14,chassis,0,.86,-3.1));
 return g
}
function cachedObstacle(type){if(!obstacleTemplates[type])obstacleTemplates[type]=type==='truck'?makeTruck():type==='checkpoint'?makeCheckpoint():type==='construction'?makeConstructionDebris():type==='durian'?makeDurian():type==='bus'?makeBus('red'):type==='busBlue'?makeBus('blue'):type==='tuktuk'?makeTukTuk():type==='taxi'?makeTaxi():type==='bike'?makeBike():type==='yaksha'?makeYaksha():makeDancer();const copy=obstacleTemplates[type].clone(true);if(type==='dancer'){const original=obstacleTemplates[type];const arms=original.userData.danceArms;if(Array.isArray(arms)){copy.userData.danceArms=arms.map(arm=>{let indices=[];let node=arm;while(node&&node!==original){const parent=node.parent;if(!parent)break;indices.unshift(parent.children.indexOf(node));node=parent}if(node!==original)return null;let target=copy;for(const i of indices){target=target.children[i];if(!target)return null}return target})}}return copy}let bossSpawned=false,bossBeaten=false,eventCount=0,lastEventMeters=-250;let spawnIndex=0;const intro=['tuktuk','taxi','bus','bike','tuktuk','taxi','bus','bike','durian'];function spawn(){if(meters+bonus>=16000){spawnPattayaHazard();return;}if(meters+bonus>=12000){spawnExpresswayHazard();return;}if(meters+bonus>=8000){spawnMarketPedestrians();return;}const boss=nightCount>=1&&meters>=3200&&!bossSpawned;if(boss)bossSpawned=true;const chance=Math.random();const eventEligible=!boss&&spawnIndex>=intro.length&&meters>160&&meters-lastEventMeters>85&&Math.random()<.38;const madness=eventEligible?['rollingDurian','cuttingBus','wrongWayBike'][Math.floor(Math.random()*3)]:null;if(madness){eventCount++;lastEventMeters=meters}let type=boss?'yaksha':madness==='rollingDurian'?'durian':madness==='cuttingBus'?'bus':madness==='wrongWayBike'?'bike':spawnIndex<intro.length?intro[spawnIndex]:chance<.10?'construction':chance<.18?'durian':chance<.34?'bus':chance<.47?'yaksha':chance<.59?'dancer':chance<.78?'taxi':chance<.9?'tuktuk':'bike';if(nightCount===0&&(type==='yaksha'||type==='dancer'))type='taxi';if(nightCount>=1&&spawnIndex%9===0)type='yaksha';if(nightCount>=1&&spawnIndex%7===0)type='dancer';if(Math.floor(meters+bonus)<3000&&type==='construction')type='taxi';if(Math.floor(meters+bonus)>=3000&&spawnIndex%3===0)type='construction';if(Math.floor(meters+bonus)>=3000&&spawnIndex%13===5)type='checkpoint';if(Math.floor(meters+bonus)>=3000&&spawnIndex%8===3)type='truck';if(type==='bus'&&spawnIndex%2===0)type='busBlue';spawnIndex++;const jamFormation=!boss&&!madness&&spawnIndex>intro.length&&spawnIndex%5===0&&(type==='taxi'||type==='tuktuk');const jamLanes=[-3.35,0,3.35];const jamOpenLane=jamFormation?jamLanes[Math.floor(Math.random()*3)]:null;const jamOccupied=jamFormation?jamLanes.filter(v=>v!==jamOpenLane):null;let durianSide=0;if(type==='durian'){durianSide=Math.random()<.5?-1:1;if(storyProps.filter(p=>p.kind==='vendor').length<2)makeRoadsideStory('vendor',durianSide,-65)}const useDetailedDancer=type==='dancer'&&!mobile&&!!dancerTemplate&&!hazards.some(h=>h.type==='dancer'&&h.g.userData.detailedDancer);
const useDetailedTukTuk=type==='tuktuk'&&!jamFormation&&!!realTukTuk&&!hazards.some(h=>h.type==='tuktuk'&&h.g.userData.detailedTukTuk);
const g=!mobile&&type==='yaksha'&&yakshaTemplate&&!hazards.some(h=>h.type==='yaksha'&&h.g.userData.detailedYaksha)?yakshaTemplate.clone(true):useDetailedDancer?dancerTemplate.clone(true):useDetailedTukTuk?realTukTuk.clone(true):cachedObstacle(type);g.userData.detailedDancer=!!useDetailedDancer;g.userData.detailedTukTuk=!!useDetailedTukTuk;g.userData.detailedYaksha=type==='yaksha'&&!!yakshaTemplate&&g.children.length===1;const lane=jamFormation?jamOccupied[0]:type==='tuktuk'?([-1.1,0,1.1][spawnIndex%3]):type==='durian'?durianSide*3.35:boss?0:madness==='rollingDurian'?(Math.random()<.5?-3.35:3.35):[-3.35,0,3.35][Math.floor(Math.random()*3)];g.position.set(lane,0,type==='tuktuk'&&!jamFormation?-37:-65);if(type==='dancer')g.scale.setScalar(useDetailedDancer?1:1.55);if(type==='construction'){g.position.y=6;g.scale.setScalar(1.35);}if(type==='yaksha')g.scale.setScalar(boss?2.3:1.85);if(type==='bus'||type==='busBlue')g.scale.setScalar(1.04);if(type==='taxi')g.scale.setScalar(1.22);if(type==='truck')g.scale.setScalar(1.13);/* GLB is already normalized to road-sized metres; procedural traffic needs a modest scale. */if(type==='tuktuk')g.scale.setScalar(jamFormation?1.75:useDetailedTukTuk?1:1.7);if(type==='bike')g.scale.setScalar(1.6);if(type==='checkpoint')g.scale.setScalar(1.15);if(madness==='rollingDurian')g.scale.setScalar(1.35);if(madness==='wrongWayBike')g.rotation.y=Math.PI;scene.add(g);if(jamFormation){
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
function reset(){updateYaowaratWires(0,true);nightCount=0;expresswayArt.group.visible=false;pattayaStreet.visible=false;pattayaWave=0;for(let i=0;i<pattayaShops.length;i++)pattayaShops[i].position.z=-8-i*9.6;updatePattayaReflections();grandmaTriggeredNight=0;if(grandmaChase){scene.remove(grandmaChase.g);grandmaChase=null}storyProps.forEach(p=>scene.remove(p.g));storyProps.length=0;visualRush=0;camera.fov=76;camera.updateProjectionMatrix();cockpit.position.y=-.22;paused=false;$('pauseBtn').textContent='⏸';bossSpawned=false;bossBeaten=false;for(const p of props)p.visible=true;neonReflections.visible=true;for(const mesh of streetLampMeshes)mesh.visible=true;updateYaowaratStreetlights();updateYaowaratReflections();for(const p of ramaStructures){p.visible=false;p.position.z=p.userData.startZ;}for(const shop of roadsideShops){shop.g.visible=shop.stage===1;shop.g.position.z=shop.startZ;}for(const stall of marketStalls){stall.visible=false;stall.position.z=stall.userData.startZ;}for(const tent of marketCanopies){tent.visible=false;tent.position.z=tent.userData.startZ;}for(const bump of marketBumps){bump.visible=false;bump.position.z=bump.userData.startZ;}for(const mesh of marketCrowdMeshes)mesh.visible=false;canalGroup.visible=false;districtIndex=-1;applyDistrict(1);scene.background.copy(districtSkies[1]);scene.fog.color.copy(districtSkies[1]);spawnIndex=0;eventCount=0;lastEventMeters=-250;active=true;queueOptionalModels();meters=0;bonus=0;missionDone=false;shake=0;speed=120;x=0;tilt=0;fallbackKeySteer=0;fallbackDragSteer=0;fallbackLeft=false;fallbackRight=false;fallbackPointer=null;neutral=lastGamma;smoothed=0;spawnClock=.45;inv=0;flips=0;combo=0;comboTime=0;challengeStage=0;challengeDisplay='';challenge.textContent='🎯 SURVIVE 500m · +250';misses=0;crashes=0;hazards.forEach(h=>scene.remove(h.g));hazards.length=0;overlay.style.display='none';hint.textContent='📱 SMALL TILTS TO STEER · 🎯 RECENTER'}
function finish(){active=false;const points=Math.floor(meters+bonus);if(points>best){best=points;try{localStorage.setItem('bbf-best3d',String(best))}catch(e){}}panel.innerHTML='<h1>💥 GAME OVER!</h1><p>SCORE '+points+' · BEST '+best+'</p><p>Near misses '+misses+' · Crashes '+crashes+'</p><p>'+(missionDone?'🏆 1000m mission complete!':'🎯 Reach 1000m for +500 points')+'</p><button id="again">TRY AGAIN</button><small>No brakes. No rules. Just Bangkok.</small>';overlay.style.display='grid';$('again').onclick=reset}
function sound(freq=240,duration=.12,type='square'){if(!soundOn)return;try{audio=audio||new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();const o=audio.createOscillator(),gain=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(55,freq*.55),audio.currentTime+duration);gain.gain.setValueAtTime(.075,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(gain);gain.connect(audio.destination);o.start();o.stop(audio.currentTime+duration)}catch(e){}}
// 8000-point stage: Chatuchak (JJ Market) craft, vintage and plant stalls.
// Lightweight geometry keeps the center road playable for tilt steering.
const marketStalls=[],marketCanopies=[],marketBumps=[];
// At 10,000 points the market's right edge becomes an open canal.
const canalGroup=new THREE.Group(),canalWater=mat(0x167c91),canalEdge=mat(0xb7ad92);
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
  rippleCtx.strokeStyle=row%3===0?'rgba(235,255,239,.55)':'rgba(119,220,224,.38)';
  rippleCtx.lineWidth=row%3===0?2.8:1.7;
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
  new THREE.MeshBasicMaterial({map:canalRippleTexture,transparent:true,opacity:.78,depthWrite:false,side:THREE.DoubleSide})
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
const boatWoodMaterial=new THREE.MeshStandardMaterial({map:boatWoodTexture,roughness:.83,metalness:0,side:THREE.DoubleSide});
// One shared hull geometry includes sloped exterior, gunwales, recessed walls and floor.
function makeMarketBoatHull(){
 const zs=[-1.65,-1.35,-.8,0,.8,1.35,1.65],ws=[.10,.45,.63,.68,.63,.45,.10];
 const positions=[],uvs=[];
 function tri(a,b,c){for(const p of [a,b,c]){positions.push(...p);uvs.push((p[0]+.85)/1.7,(p[2]+1.7)/3.4)}}
 function quad(a,b,c,d){tri(a,b,c);tri(a,c,d)}
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
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
 geometry.computeVertexNormals();return geometry;
}
const boatHullGeometry=makeMarketBoatHull();
// Real tapered fruit boats replace box silhouettes without per-frame allocations.
const canalBoats=[];
// Shared translucent wake material adds moving V-trails without heavy particle effects.
const boatWakeMat=new THREE.MeshBasicMaterial({color:0xc8fff0,transparent:true,opacity:.63,depthWrite:false});
const fruitColors=[mat(0xe8b82f),mat(0xe65b37),mat(0x78b34c)],umbrellaColors=[mat(0xffd45c),mat(0xf26e83),mat(0x5bc6bb)];
for(let i=0;i<10;i++){
 const boat=new THREE.Group();
 boat.add(new THREE.Mesh(boatHullGeometry,boatWoodMaterial));
 for(let j=0;j<6;j++)boat.add(ball(.18,fruitColors[(i+j)%3],(j%2?1:-1)*.27,.45,(Math.floor(j/2)-1)*.57));
 boat.add(cube(.055,1.65,.055,canalEdge,0,1.17,0));
 const parasol=new THREE.Group();
 for(let k=0;k<6;k++){const panel=new THREE.Mesh(new THREE.ConeGeometry(.87,.44,3,1),umbrellaColors[(i+k)%3]);panel.rotation.y=k*Math.PI/3;panel.position.y=0;panel.scale.set(.68,1,.68);parasol.add(panel);}
 parasol.position.y=2.06;boat.add(parasol);
 boat.position.set(6.5+(i%3)*1.2,-.02,-12-i*19);
 const wakes=[];
 for(const side of [-1,1]){const wake=cube(.065,.012,1.55,boatWakeMat,side*.49,-.105,-1.95);wake.rotation.y=side*.29;boat.add(wake);wakes.push(wake);}
 boat.userData.wakes=wakes;
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
const marketRoofs=[mat(0xb08d5d),mat(0x598a65),mat(0xc06d5c)];
for(let n=0;n<16;n++)for(const side of [-1,1]){
 const stall=new THREE.Group(),x=side*(4.65+(n%3)*.15),roof=marketRoofs[n%3];
 stall.add(cube(2.5,.22,3.6,roof,x,3.05,0));
 stall.add(cube(2.15,.16,2.7,mat(0x72513d),x,1.22,0));
 for(const dz of [-1.35,1.35])stall.add(cube(.1,2.9,.1,mat(0xd5c4a4),x,1.55,dz));
 for(let k=0;k<3;k++){
  // Rotating Chatuchak merchandise: plants, vintage shirts and handmade ceramics.
  const px=x+side*.1,pz=-.7+k*.7;
  if(n%3===0){stall.add(cube(.35,.3,.35,mat(0x9d684a),px,1.5,pz));stall.add(ball(.35,mat(0x4d9854),px,1.94,pz));}
  else if(n%3===1){stall.add(cube(.48,.65,.12,marketRoofs[(n+k+1)%3],px,1.78,pz));}
  else{stall.add(ball(.28,mat(0xe1d0a7),px,1.54,pz));}
 }
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
const tentPoleGeometry=new THREE.BoxGeometry(.1,5,.1);
const tentPoleMaterial=mat(0x9a8d79);
for(let n=0;n<16;n++){
 const tent=new THREE.Group();
 // Striped awnings shade the passage without creating extra draw calls per roof.
 const canopy=new THREE.Mesh(tentRoofGeometry,tentColors[n%3]);canopy.position.set(0,5.15,0);tent.add(canopy);
 for(const side of [-1,1])for(const dz of [-4.7,4.7]){const pole=new THREE.Mesh(tentPoleGeometry,tentPoleMaterial);pole.position.set(side*4.7,2.55,dz);tent.add(pole);}
 tent.position.z=-12-n*12;tent.userData.startZ=tent.position.z;tent.visible=false;scene.add(tent);marketCanopies.push(tent);
 const bump=cube(2.1,.045,1.4,mat(n%2?0x827d72:0xaaa397),n%2?-1.5:1.4,.12,-15-n*11);
 bump.userData.startZ=bump.position.z;bump.visible=false;scene.add(bump);marketBumps.push(bump);
}
const pedestrianSkin=mat(0xe4af8e),pedestrianPants=mat(0x414a63),pedestrianClothes=[mat(0xf59c62),mat(0x4b9bb1),mat(0xc75b9e),mat(0x79a969),mat(0xe3c75c)];
// Instanced roadside crowd: 64 animated shoppers, only four draw calls on mobile.
const marketCrowdCount=marketStalls.length*2,marketCrowdDummy=new THREE.Object3D();
const marketCrowdHeads=new THREE.InstancedMesh(new THREE.SphereGeometry(.25,7,5),pedestrianSkin,marketCrowdCount);
const marketCrowdShirts=new THREE.InstancedMesh(new THREE.BoxGeometry(.54,.72,.33),mat(0xffffff),marketCrowdCount);
const marketCrowdLegs=new THREE.InstancedMesh(new THREE.BoxGeometry(.15,.66,.18),pedestrianPants,marketCrowdCount*2);
const marketCrowdArms=new THREE.InstancedMesh(new THREE.BoxGeometry(.14,.57,.14),pedestrianSkin,marketCrowdCount*2);
const marketCrowdMeshes=[marketCrowdHeads,marketCrowdShirts,marketCrowdLegs,marketCrowdArms];
for(const mesh of marketCrowdMeshes){mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;mesh.visible=false;scene.add(mesh);}
const marketCrowdColors=[0xf59c62,0x4b9bb1,0xc75b9e,0x79a969,0xe3c75c].map(hex=>new THREE.Color(hex));
for(let i=0;i<marketCrowdCount;i++)marketCrowdShirts.setColorAt(i,marketCrowdColors[(i*7+Math.floor(i/2))%marketCrowdColors.length]);
marketCrowdShirts.instanceColor.needsUpdate=true;
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
  put(marketCrowdShirts,i,x,1.22+bob,z,0,size);
  for(let leg=0;leg<2;leg++){
   const sign=leg?1:-1,j=i*2+leg;
   put(marketCrowdLegs,j,x+sign*.16,.47+bob,z+sign*.04,sign*step*.16,size);
   put(marketCrowdArms,j,x+sign*.36,1.18+bob,z-sign*.04,-sign*step*.2,size);
  }
 }
 for(const mesh of marketCrowdMeshes)mesh.instanceMatrix.needsUpdate=true;
}
function makeMarketWalker(style){const g=new THREE.Group(),shirt=pedestrianClothes[style%5];
 g.add(ball(.27,pedestrianSkin,0,1.78,0));g.add(cube(.58,.75,.32,shirt,0,1.22,0));
 for(const side of [-1,1]){g.add(cube(.18,.67,.19,pedestrianPants,side*.17,.5,0));g.add(cube(.15,.66,.15,pedestrianSkin,side*.4,1.18,0));}
 if(style===2){g.add(cube(.76,.35,.1,mat(0xe2c4a2),0,1.42,.2));g.add(ball(.3,mat(0x4b273e),0,2.04,0));}
 if(style===3){g.add(cube(.95,.52,.56,mat(0x977450),.52,1.02,0));}
 if(style===4){g.add(cube(.55,.7,.5,mat(0xb98a4f),-.48,1.0,0));}
 return g;}
// Thai fruit pushcarts at Chatuchak, keeping one escape lane open.
const cartWood=mat(0x9b5833),cartMetal=mat(0x555c65),cartWheel=mat(0x242831);
const cartFruits=[mat(0xf0bc32),mat(0xe95731),mat(0x72a743),mat(0xe6d456)];
function makeFruitPushcart(){const g=new THREE.Group();
 g.add(cube(1.55,.2,1.05,cartWood,0,.93,0));g.add(cube(1.48,.14,.98,cartMetal,0,.78,0));
 for(const side of [-1,1]){g.add(cube(.08,.85,.08,cartMetal,side*.64,.44,-.35));
  for(const dz of [-.36,.36]){const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.23,.23,.12,10),cartWheel);wheel.rotation.z=Math.PI/2;wheel.position.set(side*.79,.27,dz);g.add(wheel);}}
 for(const side of [-1,1])g.add(cube(.09,.75,.09,cartMetal,side*.65,1.25,.44));
 g.add(cube(1.45,.08,.08,cartMetal,0,1.62,.44));
 for(let i=0;i<12;i++){const x=((i%4)-1.5)*.32,z=(Math.floor(i/4)-1)*.29;g.add(ball(.15,cartFruits[(i+Math.floor(i/4))%4],x,1.14,z));}
 return g;}
const dogFur=mat(0xa46c38),dogEar=mat(0x583b2c),policeBrown=mat(0x765642),policeVest=mat(0xc9db58);
function makeMarketDog(){const g=new THREE.Group(),legs=[];
 g.add(cube(.65,.5,1,dogFur,0,.56,0));g.add(ball(.36,dogFur,0,.83,-.48));
 for(const side of [-1,1]){g.add(ball(.19,dogEar,side*.22,1.09,-.53));
  for(const dz of [-.3,.3]){const leg=cube(.15,.44,.16,dogFur,side*.25,.25,dz);g.add(leg);legs.push(leg);}}
 g.add(ball(.17,dogEar,0,.7,-.82));
 const tail=cube(.13,.13,.48,dogFur,0,.75,.68);g.add(tail);
 g.userData.runningLegs=legs;g.userData.runningTail=tail;return g;}
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
function expresswayVehicle(type){
 if(!expresswayVehicleTemplates){
  expresswayVehicleTemplates={
   sportsCar:makeExpresswayVehicle(THREE,'sportsCar'),
   bus:makeExpresswayVehicle(THREE,'bus')
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
 function spawnPattayaHazard(){
  const wave=++pattayaWave,type=['flagParade','bottle','pattayaDancer','watermelon'][wave%4],
        lane=(wave%2?1:-1)*1.55,g=new THREE.Group();
  if(type==='flagParade'){
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
 const heads=new THREE.InstancedMesh(new THREE.SphereGeometry(.23,10,8),skin,count);
 const torsos=new THREE.InstancedMesh(new THREE.CapsuleGeometry(.24,.62,4,8),fabric,count);
 const arms=new THREE.InstancedMesh(new THREE.CapsuleGeometry(.085,.54,3,6),fabric,count*2);
 const legs=new THREE.InstancedMesh(new THREE.CapsuleGeometry(.11,.66,3,6),denim,count*2);
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
 const wave=++expresswayWave,kind=['sportsCar','bike','bus','protest','laser','sportsCar','bike'][wave%7],lane=(wave%2?1:-1)*1.55;
 const g=new THREE.Group();
 if(kind==='sportsCar'){try{g.add(expresswayVehicle('sportsCar'));}catch(error){console.warn('Sports car PBR fallback',error);g.add(cube(1.8,.48,3.4,mat(0xf23b69),0,.6,0));g.add(cube(1.4,.45,1.4,M.glass,0,1.05,-.2));for(const xx of [-.82,.82])for(const zz of [-1.05,1.05])g.add(ball(.35,M.wheel,xx,.34,zz));}}
 else if(kind==='bike'){try{g.add(makeExpresswayMotorcycle());}catch(error){console.warn('Expressway motorcycle PBR fallback',error);g.add(cachedObstacle('bike'));}}
 else if(kind==='bus'){try{g.add(expresswayVehicle('bus'));}catch(error){console.warn('Bus PBR fallback',error);g.add(cube(2.05,2.5,4.4,mat(0xf5a33b),0,1.55,0));g.add(cube(1.85,.9,.09,M.glass,0,2.1,2.23));}}
 else if(kind==='protest'){try{g.add(makeExpresswayProtest());}catch(error){console.warn('Expressway crowd fallback',error);g.add(cube(.85,1.2,.5,M.pink,0,1.1,0));g.add(ball(.34,M.skin,0,1.92,0));g.add(cube(1.3,.65,.12,M.white,0,2.8,0));}}
 else {g.add(expresswayLaserTemplate.clone(true));}
 g.position.set(lane,0,-65);scene.add(g);
 hazards.push({g,type:kind,madness:null,boss:false,durianSide:0,passed:false,hit:false,phase:wave,baseX:lane,announced:false,nearAwarded:false,swerve:0,swerveStart:100});
}
function spawnMarketPedestrians(){
 const wave=++marketPedestrianIndex,floatingMarket=meters+bonus>=10000;
 const kind=floatingMarket&&wave%3===0?'dog':wave%6===0?'police':wave%5===0?'fruitCart':'pedestrian';
 // Dogs always charge from the canal (right); the left escape lane stays clear.
 const side=kind==='dog'?1:wave%2===1?1:-1,lane=side*1.45,style=(wave+side+5)%5;
 // Build only the actual hazard: previously the unused opposite-side model was built then discarded.
 const g=kind==='dog'?makeMarketDog():kind==='police'?makeMarketPolice():kind==='fruitCart'?makeFruitPushcart():makeMarketWalker(style);
 g.position.set(lane,0,-65);scene.add(g);
 hazards.push({g,type:kind,madness:null,boss:false,durianSide:0,passed:false,hit:false,phase:wave,baseX:lane,announced:false,nearAwarded:false,swerve:0,swerveStart:-100});
}
function update(dt,t){if(!active||paused)return;speed+=dt*(3+Math.sqrt(Math.max(0,speed-60))*.16);meters+=dt*speed/3.6;const nextDistrict=Math.floor(meters+bonus)>=16000?5:Math.floor(meters+bonus)>=12000?4:Math.floor(meters+bonus)>=8000?3:Math.floor(meters+bonus)>=3000?2:1;const currentNight=Math.floor(meters/1600)+(meters%1600<800?1:0);if(currentNight>nightCount){nightCount=currentNight;if(nightCount>0){hint.textContent='🌙 NIGHT '+nightCount+' — SPIRITS AWAKEN';if(nightCount%2===0&&grandmaTriggeredNight!==nightCount){makeRoadsideStory('shrine',Math.random()<.5?-1:1,-70);grandmaTriggeredNight=nightCount}}}if(nextDistrict!==districtIndex){applyDistrict(nextDistrict);if(nextDistrict>=3){for(const h of hazards)scene.remove(h.g);hazards.length=0;spawnClock=.5;hint.textContent=nextDistrict===5?'🌈 PATTAYA WALKING STREET!':nextDistrict===4?'🛣️ EXPRESSWAY! DODGE TRAFFIC AND UFO LASERS!':'🌞 JJ MARKET · TWO NARROW LANES!';}}const onRamaII=nextDistrict===2;const inMarket=nextDistrict===3;const onExpressway=nextDistrict===4,inPattaya=nextDistrict===5;pattayaStreet.visible=inPattaya;if(inPattaya){for(let i=0;i<pattayaShops.length;i++){const g=pattayaShops[i];g.position.z+=dt*(60+300*(1-Math.exp(-(speed-60)/240)))*.22;if(g.position.z>26)g.position.z-=192;}updatePattayaReflections();}expresswaySet.visible=onExpressway;expresswayArt.group.visible=onExpressway;if(onExpressway)expresswayArt.update(dt,speed);if(onExpressway){ufo.position.x=Math.sin(t*.0012)*2.4;ufo.position.y=13+Math.sin(t*.002)*.8;ufo.rotation.y+=dt*.4;}if(inMarket&&meters+bonus>=10000&&meters+bonus-speed*dt/3.6<10000)hint.textContent='🚣 FLOATING MARKET RIGHT · DO NOT FALL INTO CANAL!';road.material=onExpressway?expresswayAsphalt:onRamaII||inMarket?dryAsphalt:wetAsphalt;road.scale.x+=((inMarket?.65:1)-road.scale.x)*Math.min(1,dt*3);for(const p of props)p.visible=!onRamaII&&!inMarket&&!onExpressway&&!inPattaya;neonReflections.visible=nextDistrict===1;for(const mesh of streetLampMeshes)mesh.visible=nextDistrict===1;facadeBounce.visible=nextDistrict===1;for(const glow of roadsideNeonGlow)glow.visible=nextDistrict===1;for(const p of ramaStructures)p.visible=onRamaII;const canalVisible=inMarket&&meters+bonus>=9700;const canalActive=inMarket&&meters+bonus>=10000;canalGroup.visible=canalVisible;if(canalVisible)canalRippleTexture.offset.y=(t*.000025)%1;if(canalVisible){for(const boat of canalBoats){const phase=boat.userData.phase;boat.position.z=boat.userData.homeZ+((meters*.12+phase*3)%210);boat.position.y=-.02+Math.sin(t*.0017+phase)*.065;boat.rotation.z=Math.sin(t*.0011+phase)*.045;boat.userData.parasol.rotation.z=Math.sin(t*.0014+phase)*.035;for(let j=0;j<2;j++){const wake=boat.userData.wakes[j];wake.scale.z=.82+.18*Math.sin(t*.004+phase+j);wake.position.z=-1.95-.16*Math.sin(t*.0027+phase+j);}}}for(const stall of marketStalls)stall.visible=inMarket&&(!canalActive||stall.children[0].position.x<0);for(const tent of marketCanopies)tent.visible=inMarket&&!canalActive;for(const bump of marketBumps)bump.visible=inMarket;for(const mesh of marketCrowdMeshes)mesh.visible=inMarket;for(const shop of roadsideShops)shop.g.visible=!inMarket&&!onExpressway&&!inPattaya&&shop.stage===(onRamaII?2:1);const skyTarget=inPattaya?districtSkies[1]:onExpressway?districtSkies[1]:inMarket?districtSkies[0]:districtSkies[nextDistrict];scene.background.lerp(skyTarget,Math.min(1,dt*.8));scene.fog.color.copy(scene.background);sun.intensity+=( (nextDistrict===1?.9:1.65)-sun.intensity)*Math.min(1,dt*1.2);const control=hasMotion?tilt:(fallbackKeySteer||fallbackDragSteer);const steer=control===0?0:Math.sign(control)*Math.pow(Math.abs(control),.82);const desiredX=THREE.MathUtils.clamp(steer*4.1,-4.1,4.1);const oldX=x;x+=(desiredX-x)*(1-Math.exp(-dt*5.1));x=THREE.MathUtils.clamp(x,-4.3,4.3);if(canalActive&&x>2.85){hint.textContent='💦 FALLEN INTO THE FLOATING MARKET CANAL!';shake=1;finish();return;}smoothed+=(THREE.MathUtils.clamp((x-oldX)/Math.max(dt,.001)/5,-1,1)-smoothed)*(1-Math.exp(-dt*9));car.position.set(x,0,3);car.rotation.z=-smoothed*.10+Math.sin(t*.01)*.015+Math.sin(flips)*Math.exp(-flips*.45)*.85;car.rotation.x=Math.sin(flips*.8)*Math.exp(-flips*.45)*.65;car.position.y=Math.abs(Math.sin(flips*1.2))*Math.exp(-flips*.32)*.6;flips=Math.max(0,flips-dt*3);const visualSpeed=60+300*(1-Math.exp(-(speed-60)/240));const advance=dt*visualSpeed*.22;if(onExpressway){const roadScroll=advance*18/230;expresswayRoadTexture.offset.y-=roadScroll;expresswayRoughnessTexture.offset.y=expresswayRoadTexture.offset.y;}const wiresVisible=nextDistrict===1;for(const mesh of [wirePoles,wireArms,wireRuns])mesh.visible=wiresVisible;if(wiresVisible)updateYaowaratWires(advance);stripes.forEach(s=>{s.position.z+=advance;if(s.position.z>16)s.position.z-=230});roadStuds.forEach(s=>{s.position.z+=advance;if(s.position.z>16)s.position.z-=228});props.forEach(p=>{p.position.z+=advance;if(p.position.z>22)p.position.z-=198});if(nextDistrict===1){updateYaowaratStreetlights();updateYaowaratReflections();updateYaowaratFacadeBounce();}if(onRamaII)for(const p of ramaStructures){p.position.z+=advance;if(p.position.z>45)p.position.z-=198;}for(const stall of marketStalls)if(inMarket){stall.position.z+=advance;if(stall.position.z>25)stall.position.z-=192;}if(inMarket)updateMarketCrowd(t,canalActive);for(const tent of marketCanopies)if(inMarket){tent.position.z+=advance;if(tent.position.z>25)tent.position.z-=192;}for(const bump of marketBumps)if(inMarket){bump.position.z+=advance;if(bump.position.z>20)bump.position.z-=180;}for(const shop of roadsideShops)if(shop.stage===nextDistrict){shop.g.position.z+=advance;if(shop.g.position.z>25)shop.g.position.z-=205;}for(let i=storyProps.length-1;i>=0;i--){const p=storyProps[i];p.g.position.z+=advance;if(p.kind==='vendor'&&!p.triggered&&p.g.position.z>-48){p.triggered=true;p.dropTime=.8;hint.textContent='🌰 WATCH OUT! DURIAN FALLING!'}if(p.kind==='vendor'&&p.dropTime>0){p.dropTime=Math.max(0,p.dropTime-dt);const f=1-p.dropTime/.8;if(p.g.userData.vendorArm)p.g.userData.vendorArm.rotation.z=-Math.sin(f*Math.PI)*1.15;if(p.g.userData.vendorFruit){p.g.userData.vendorFruit.position.x=-.35+p.side*-f*1.1;p.g.userData.vendorFruit.position.y=1.65-f*1.25;p.g.userData.vendorFruit.rotation.z+=dt*8;if(p.dropTime===0)p.g.userData.vendorFruit.visible=false}}if(p.kind==='shrine'&&!p.triggered&&p.g.position.z>0){p.triggered=true;if(grandmaChase)scene.remove(grandmaChase.g);const g=makeGrandma();g.position.set(p.side*4.65,0,-14);scene.add(g);grandmaChase={g,side:p.side,time:5,elapsed:0,stepSound:0};hint.textContent='👵 GRANDMA SPEED! RUN!';sound(750,.22,'sawtooth')}if(p.g.position.z>22){scene.remove(p.g);storyProps.splice(i,1)}}if(grandmaChase){const q=grandmaChase;q.time-=dt;q.elapsed+=dt;q.stepSound-=dt;const rush=THREE.MathUtils.smoothstep(q.elapsed,0,1.1);q.g.position.z=THREE.MathUtils.lerp(-14,2.1,rush);q.g.position.x=x+q.side*(3.8-rush*.95)+Math.sin(t*.024)*.08;q.g.position.y=Math.abs(Math.sin(q.elapsed*22))*.22;q.g.rotation.y=q.side*(.2+Math.sin(q.elapsed*3)*.12);const stride=Math.sin(q.elapsed*22)*.7;for(let i=0;i<2;i++){const arm=q.g.userData.runArms?.[i],leg=q.g.userData.runLegs?.[i];if(arm)arm.rotation.x=(i===0?1:-1)*stride;if(leg)leg.rotation.x=(i===0?-1:1)*stride}if(q.stepSound<=0&&q.elapsed>1&&q.elapsed<3.5){sound(95,.055,'triangle');q.stepSound=.3}if(q.time<=0){scene.remove(q.g);grandmaChase=null}}spawnClock-=dt;if(spawnClock<=0){if(hazards.length<(inMarket?9:onExpressway?7:4))spawn();spawnClock=bossSpawned&&!bossBeaten&&hazards.some(h=>h.boss)?2.6:Math.max(.72,1.95-visualSpeed/230)}for(const h of hazards){h.g.position.z+=advance;if(!h.announced&&h.g.position.z>-47){h.announced=true;if(h.type==='flagParade')hint.textContent='🌈 PRIDE PARADE! DODGE SAFELY!';else if(h.type==='bottle')hint.textContent='🍾 DRUNK TOURIST THROWS A BOTTLE!';else if(h.type==='watermelon')hint.textContent='🍉 FRUIT VENDOR THROWS A WATERMELON!';else if(h.type==='pattayaDancer')hint.textContent='👻 HAUNTED DANCER!';else if(h.type==='laser')hint.textContent='🛸 UFO LASER! DODGE THE RED BEAM!';else if(h.type==='sportsCar')hint.textContent='🏎️ SPORTS CAR AHEAD!';else if(h.type==='protest')hint.textContent='📢 EXPRESSWAY PROTEST!';else if(h.type==='dog')hint.textContent='🐕 CANAL-SIDE DOG CHARGING! TILT LEFT!';else if(h.type==='police')hint.textContent='👮 POLICE AHEAD!';else if(h.type==='fruitCart')hint.textContent='🍉 JJ MARKET · FRUIT CART AHEAD!';else if(h.type==='pedestrian')hint.textContent='🚶 JJ MARKET · WATCH FOR SHOPPERS!';else hint.textContent=h.boss?'👹 BOSS YAKSHA! WATCH HIS MOVE!':h.madness?({rollingDurian:'🌰 DURIAN ROLLING ACROSS!',cuttingBus:'🚌 BUS CUTTING ACROSS!',wrongWayBike:'🏍️ WRONG-WAY BIKE!'})[h.madness]:({bus:'🚌 RED BUS AHEAD!',busBlue:'🚌 ROUTE 8 BLUE BUS!',taxi:'🚕 TAXI CUTTING IN!',bike:'🏍️ MOTORBIKE!',dancer:'👻 HAUNTED THAI DANCER!',construction:'🚧 RAMA II — FALLING CONCRETE!',yaksha:'👹 GIANT YAKSHA AHEAD!',durian:'🌰 GIANT DURIAN!'})[h.type]}if(h.type==='dog'){const charge=THREE.MathUtils.smoothstep(h.g.position.z,-36,-7);
 h.g.position.x=THREE.MathUtils.lerp(h.baseX,Math.max(.5,x),charge*.62);
 const stride=t*.022+h.phase;
 h.g.position.y=Math.abs(Math.sin(stride))*.085*(.4+charge*.6);
 h.g.rotation.z=Math.sin(stride)*.09;
 const legs=h.g.userData.runningLegs;
 if(legs)for(let k=0;k<legs.length;k++)legs[k].rotation.x=Math.sin(stride+(k===0||k===3?0:Math.PI))*.55;
 if(h.g.userData.runningTail)h.g.userData.runningTail.rotation.y=Math.sin(stride*.65)*.35;
}if(h.type==='police'){h.g.position.x=THREE.MathUtils.clamp(h.baseX+Math.sin(t*.0014+h.phase)*.55,-2.9,2.9);}if(h.type==='pedestrian'){h.g.position.x=THREE.MathUtils.clamp(h.baseX+Math.sin(t*.0011+h.phase)*.45,-3.1,3.1);h.g.rotation.z=Math.sin(t*.006+h.phase)*.07;}if(h.type==='construction'){const fall=THREE.MathUtils.smoothstep(h.g.position.z,-48,-20);h.g.position.y=6*(1-fall);h.g.rotation.z=(1-fall)*.18;}if((h.type==='bottle'||h.type==='watermelon')&&h.g.userData.pattayaProjectile){const flight=THREE.MathUtils.smoothstep(h.g.position.z,-54,-13),p=h.g.userData.pattayaProjectile,a=h.g.userData.pattayaActor,arm=h.g.userData.pattayaArm;p.position.x=THREE.MathUtils.lerp(a.position.x,0,flight);p.position.y=(h.type==='watermelon'?.72:.4)+1.5*Math.sin(Math.PI*flight);p.rotation.z+=dt*6;if(arm)arm.rotation.z=-.5-1.25*Math.sin(Math.PI*flight);a.rotation.z=Math.sin(t*.004+h.phase)*(h.type==='bottle'?.11:.035);}if(h.type==='pattayaDancer'){h.g.rotation.y=Math.sin(t*.002+h.phase)*.32;}if(h.type==='durian'){h.g.rotation.z+=dt*(h.madness?7:3);if(h.g.position.z>-48){const f=THREE.MathUtils.smoothstep(h.g.position.z,-48,-5);h.g.position.x=THREE.MathUtils.lerp(h.baseX,h.durianSide?-h.durianSide*.9:-h.baseX*.85,f)}}if(h.type==='dancer'){h.g.rotation.y=Math.sin(t*.0016+h.phase)*.24;h.g.position.x=h.baseX+Math.sin(t*.0013+h.phase)*.32;h.g.position.y=.17+Math.sin(t*.0027+h.phase)*.16;if(h.g.userData.danceArms?.[0]?.rotation&&h.g.userData.danceArms?.[1]?.rotation){h.g.userData.danceArms[0].rotation.z=Math.sin(t*.003+h.phase)*.45;h.g.userData.danceArms[1].rotation.z=-Math.sin(t*.003+h.phase)*.45}}if((h.type==='bus'||h.type==='busBlue')&&h.g.position.z<0){const p=THREE.MathUtils.smoothstep(h.g.position.z,-38,-13);h.g.position.x=THREE.MathUtils.clamp(h.baseX+Math.sin(t*.001+h.phase)*.18+(h.swerve?p*h.swerve*(h.madness==='cuttingBus'?2.15:.8):0),-4.2,4.2);h.g.rotation.y=-h.swerve*Math.sin(p*Math.PI)*.09;}if((h.type==='taxi'||h.type==='bike')&&!h.madness&&h.g.position.z>h.swerveStart){const f=THREE.MathUtils.smoothstep(h.g.position.z,h.swerveStart,h.swerveStart+20);h.g.position.x=THREE.MathUtils.clamp(h.baseX+h.swerve*f*(h.type==='bike'?1.65:2.1),-4.2,4.2);h.g.rotation.y=-h.swerve*Math.sin(f*Math.PI)*.18}if(h.madness==='wrongWayBike'){h.g.rotation.y=Math.PI+Math.sin(t*.004+h.phase)*.08;h.g.position.z+=advance*.45}if(h.type==='yaksha'){h.g.rotation.y=Math.sin(t*.002+h.phase)*.35;if(h.boss&&h.g.position.z>-34){const f=THREE.MathUtils.smoothstep(h.g.position.z,-34,-8);h.g.position.x=Math.sin(f*Math.PI*1.1)*2.25;}}if(!h.passed&&h.g.position.z>4){h.passed=true;const dx=Math.abs(h.g.position.x-x);const collisionRadius=h.type==='dog'?.95:h.type==='police'?.8:h.type==='pedestrian'?.75:h.type==='laser'?.8:h.type==='bottle'?.7:h.type==='watermelon'?.85:h.type==='flagParade'?.85:h.type==='pattayaDancer'?.95:h.type==='protest'?.9:h.type==='bike'?1.05:h.type==='taxi'||h.type==='sportsCar'?1.55:1.8;if(h.boss&&!bossBeaten){bossBeaten=true;if(dx>=collisionRadius){bonus+=750;hint.textContent='🏆 YAKSHA BOSS CLEARED +750';sound(920,.3,'sine')}else{hint.textContent='👹 YAKSHA HIT! NO BOSS BONUS'}}if(dx<collisionRadius&&!h.hit&&inv<=0){if(h.type==='dog'&&canalActive){x=Math.min(4.3,x+.85);hint.textContent='🐕 DOG PUSH! STEER LEFT OR FALL IN!';if(x>2.85){shake=1;finish();return;}}h.hit=true;crashes++;combo=0;comboTime=0;inv=1.5;flips=5;shake=.55;sound(120,.28,'sawtooth');/* Broken brakes: collisions damage the tuk-tuk but never slow it down. */hint.textContent=h.type==='dog'&&canalActive?'🐕 DOG SHOVE! TILT LEFT — CANAL!':'💥 '+h.type.toUpperCase()+' ATTACK!';if(navigator.vibrate)navigator.vibrate(80);if(crashes>=3){finish();break}}else if(dx>=collisionRadius&&dx<collisionRadius+1.1&&inv<=0){misses++;combo=comboTime>0?Math.min(combo+1,5):1;comboTime=5;const reward=combo*50;bonus+=reward;sound(600+combo*120,.1,'sine');hint.textContent='🔥 NEAR MISS ×'+combo+'  +'+reward}}}updateTaxiNeonGlints();updateTukNeonGlints();for(let i=hazards.length-1;i>=0;i--)if(hazards[i].g.position.z>20){scene.remove(hazards[i].g);hazards.splice(i,1)}if(challengeStage===0&&meters>=500){challengeStage=1;bonus+=250;hint.textContent='🏆 500m SURVIVED +250';sound(760,.22,'sine')}if(challengeStage===1&&misses>=3){challengeStage=2;bonus+=400;hint.textContent='🏆 3 NEAR MISSES +400';sound(850,.24,'sine')}if(!missionDone&&meters>=1000){missionDone=true;bonus+=500;hint.textContent='🏆 1000m MISSION +500';sound(900,.32,'sine')}shake=Math.max(0,shake-dt);inv=Math.max(0,inv-dt);comboTime=Math.max(0,comboTime-dt);if(comboTime===0)combo=0;car.visible=false;const missionText=challengeStage===0?'🎯 SURVIVE '+Math.max(0,500-Math.floor(meters))+'m · +250':challengeStage===1?'🎯 NEAR MISSES '+Math.min(misses,3)+'/3 · +400':'🏆 CHALLENGES COMPLETE';if(challengeDisplay!==missionText){challengeDisplay=missionText;challenge.textContent=missionText}if(t-lastHudUpdate>110){lastHudUpdate=t;hud.textContent=Math.floor(meters+bonus)+' PTS'+(comboTime>0?'  🔥×'+combo:'');status.innerHTML=Math.floor(speed)+' KM/H<br>'+'❤️'.repeat(Math.max(0,3-crashes));}}
let lastRender=0,lastHudUpdate=0,graphicsLost=false,frameFailures=0,visualRush=0;let perfFrames=0,perfStart=0;
function recoveryScreen(message){paused=true;panel.innerHTML='<h1>🛺 GAME INTERRUPTED</h1><p>'+message+'</p><button id="recover">RESTART GAME</button><small>Version 2.7 · Freeze diagnostics</small>';overlay.style.display='grid';$('recover').onclick=()=>location.reload()}
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();graphicsLost=true;recoveryScreen('Safari paused the 3D graphics. Tap to restart.')},false);
renderer.domElement.addEventListener('webglcontextrestored',()=>{graphicsLost=false;recoveryScreen('Graphics restored. Tap to restart safely.')},false);
addEventListener('error',e=>{if(active)recoveryScreen('Game error: '+String(e.message||'unknown').slice(0,100))});
addEventListener('unhandledrejection',e=>{console.warn('Optional asset failed:',e.reason);hint.textContent='🛺 USING LIGHTWEIGHT GRAPHICS'});
function frame(t){requestAnimationFrame(frame);if(graphicsLost)return;if(mobile&&t-lastRender<32)return;lastRender=t;try{const dt=Math.min((t-last)/1000,.07);last=t;update(dt,t);camera.position.x+=(x-camera.position.x)*(1-Math.exp(-dt*11));const rushTarget=active&&!paused?Math.min(1,Math.log1p(Math.max(0,speed-90)/250)):0;visualRush+=(rushTarget-visualRush)*(1-Math.exp(-dt*2.4));const newFov=76+visualRush*7;if(Math.abs(newFov-camera.fov)>.07){camera.fov=newFov;camera.updateProjectionMatrix()}cockpit.position.y=-.22+(active&&!paused?Math.sin(t*.018)*visualRush*.018:0);camera.position.y=2.42+(shake>0?(Math.random()-.5)*shake*.16:0)+(active&&!paused?Math.sin(t*.024)*visualRush*.016:0);camera.position.z=3.15-visualRush*.12;dialNeedle.rotation.z=-.9+(Math.log1p(speed/60)/Math.log1p(2000/60))*1.8;camera.lookAt(camera.position.x+smoothed*.26,1.72,-18);renderer.render(scene,camera);
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
