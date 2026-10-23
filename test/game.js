
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
const asphaltCanvas=document.createElement('canvas');asphaltCanvas.width=256;asphaltCanvas.height=256;const asphaltCtx=asphaltCanvas.getContext('2d');asphaltCtx.fillStyle='#b5b5b5';asphaltCtx.fillRect(0,0,256,256);for(let i=0;i<1900;i++){const px=Math.random()*256,py=Math.random()*256;asphaltCtx.fillStyle=i%3===0?'rgba(40,40,40,.23)':'rgba(255,255,255,.18)';asphaltCtx.fillRect(px,py,1+(i%3),1+(i%2));}const asphaltTexture=new THREE.CanvasTexture(asphaltCanvas);asphaltTexture.wrapS=asphaltTexture.wrapT=THREE.RepeatWrapping;asphaltTexture.repeat.set(2,26);M.road.map=asphaltTexture;M.road.needsUpdate=true;
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
const neonReflectionMaterials=[0xff4b59,0xf5bd64,0x2bd8ce].map(color=>new THREE.MeshBasicMaterial({
 map:neonReflectionTexture,color,transparent:true,opacity:.42,depthWrite:false,
 blending:THREE.AdditiveBlending,side:THREE.DoubleSide
}));
const neonReflectionGeometry=new THREE.PlaneGeometry(3.1,7.8);
const neonReflections=[];
for(let i=0;i<10;i++){
 const group=new THREE.Group();
 const glow=new THREE.Mesh(neonReflectionGeometry,neonReflectionMaterials[i%3]);
 glow.rotation.x=-Math.PI/2;
 glow.position.y=.077;
 group.add(glow);
 group.position.set(i%2===0?-4.1:4.1,0,-16-i*18);
 group.userData.startZ=group.position.z;
 scene.add(group);
 neonReflections.push(group);
}
const ground=cube(180,.1,230,M.grass,0,-.12,-60);scene.add(ground);// Milestone 1: physically based wet Yaowarat asphalt; dry concrete-tone Rama II.
// Reuse the existing asphalt texture and neon overlays to avoid new draw calls.
const wetAsphalt=new THREE.MeshStandardMaterial({color:0x777f8d,map:asphaltTexture,roughness:.38,metalness:.12});
const dryAsphalt=new THREE.MeshStandardMaterial({color:0x777f8d,map:asphaltTexture,roughness:.94,metalness:0});
const road=cube(11,.12,230,wetAsphalt,0,0,-60);scene.add(road);
const shoulderPaint=mat(0x4b4b4d),curbPaint=mat(0x8b776b);for(const side of [-1,1]){scene.add(cube(1.25,.11,230,shoulderPaint,side*6.2,-.015,-60));scene.add(cube(.22,.09,230,curbPaint,side*5.58,.08,-60));scene.add(cube(.1,.045,230,M.gold,side*5.37,.10,-60))}
const roadStuds=[];for(let i=0;i<12;i++){const stud=cube(.22,.025,.38,M.gold,0,.09,-i*19+10);scene.add(stud);roadStuds.push(stud)}const stripes=[];for(let i=0;i<23;i++){for(const x of [-1.85,1.85]){const s=cube(.18,.035,3.5,M.stripe,x,.09,-i*10+10);scene.add(s);stripes.push(s)}}
// Bangkok street set: shophouses, awnings, shutters, windows, signs and cables.
const props=[];const storyProps=[];let nightCount=0,grandmaTriggeredNight=0,grandmaChase=null;const nightLength=2400;const storyMat={wood:mat(0x7d4134),roof:mat(0xb52c35),gold:mat(0xf6c847),leaf:mat(0x5b9b39),cloth:mat(0xe85c4c),ghost:mat(0xd8d1ed)};
const shopPaint=[mat(0xb6534d),mat(0x9b7760),mat(0xd2aa77),mat(0x796f76),mat(0xb17865)];
const shopTrim=mat(0xfff5d1),shutter=mat(0x655781),shopShadow=mat(0x39365b),windowGlow=mat(0xffe7a1),awningColors=[mat(0xff366e),mat(0x00cba9),mat(0xff9f20)];
const signMaterials=[mat(0xff267a),mat(0x086bd8),mat(0x1cbf7a)];const neonSigns=[new THREE.MeshBasicMaterial({color:0xff3d96}),new THREE.MeshBasicMaterial({color:0x22ffe0}),new THREE.MeshBasicMaterial({color:0xffd64d})];const daySigns=signMaterials.slice();function applyDistrict(i){if(i===districtIndex)return;districtIndex=i;districtLabel.textContent=['☀️ BANGKOK DAYTIME','🌃 YAOWARAT NIGHT · TEST 6.9','🚧 RAMA II CONSTRUCTION · TEST 6.9','🛍️ JJ MARKET · CHATUCHAK · 8000+','🛣️ BANGKOK EXPRESSWAY · 12000+'][i];for(let k=0;k<3;k++)signMaterials[k]=i===1?neonSigns[k]:daySigns[k];for(const b of props){if(b.userData.sign)b.userData.sign.material=signMaterials[b.userData.signIndex%3]}const rama=i===2;M.grass.color.setHex(rama?0x78746d:0x34333b);M.road.color.setHex(rama?0x777b81:0x56535c);M.stripe.color.setHex(rama?0xe5e1d3:0xe2c579);shoulderPaint.color.setHex(rama?0x77736e:0x444148);curbPaint.color.setHex(rama?0x9d968b:0x756866);hint.textContent=['🛺 WELCOME TO BANGKOK!','🏮 WELCOME TO YAOWARAT!','🌇 SUNSET DRIVE!','🌿 JJ MARKET! WATCH THE TRAFFIC!','🛸 EXPRESSWAY! UFO LASERS INCOMING!'][i]}
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
function neonBlade(text){const c=document.createElement('canvas');c.width=192;c.height=512;const a=c.getContext('2d');a.fillStyle='#3b080e';a.fillRect(0,0,192,512);a.strokeStyle='#f7ae32';a.lineWidth=10;a.strokeRect(8,8,176,496);a.shadowColor='#ff3e15';a.shadowBlur=15;a.fillStyle='#ffd263';a.textAlign='center';a.textBaseline='middle';a.font='bold 66px sans-serif';[...text].slice(0,4).forEach((v,i)=>a.fillText(v,96,76+i*113));const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return new THREE.MeshBasicMaterial({map:t,side:THREE.DoubleSide})}
const neonBladeMaterials=['金龍海鮮','中國城','百年老店','永安藥房','大金行','潮州飯店','大華金行','廣東燒味'].map(neonBlade);
function building(x,z,i){
 const g=new THREE.Group(),h=7.9+(i%7)*1.1,paint=facadeMaterials[i%facadeMaterials.length];
 g.add(cube(3.9,h,5,paint,0,h/2,0));for(const edge of [-1,1])g.add(cube(.16,h,5.15,brickTrim,edge*1.94,h/2,0));for(let fy=3.1;fy<h;fy+=2.6)g.add(cube(4.05,.14,5.15,oldGold,0,fy,0));
 g.add(cube(4.15,.22,5.2,shopTrim,0,h+.08,0));if(i%4===0)g.add(cube(3.6,.75,.32,paint,0,h+.47,0));else if(i%4===1)g.add(cube(1.6,1.15,2.4,paint,-.85,h+.65,-.8));else if(i%4===2)for(const edge of [-1.65,1.65])g.add(cube(.12,.8,4.5,oldGold,edge,h+.52,0));g.add(cube(4.05,.17,5.05,M.purple,0,.22,0));
 // Facade faces the road, with ground floor shutter and striped awning.
 const front=x<0?2.56:-2.56;
 g.add(cube(2.6,2.0,.09,shutter,0,1.18,front));
 for(let j=0;j<3;j++)g.add(cube(2.55,.035,.11,shopTrim,0,.55+j*.62,front+(x<0?.06:-.06)));
 const canopy=cube(3.8,.12,1.0,awningColors[i%3],0,2.45,front+(x<0?.48:-.48));g.add(canopy);for(let k=-2;k<=2;k++){g.add(cube(.18,.14,1.04,shopTrim,k*.68,2.47,front+(x<0?.49:-.49)))}
 for(let floor=0;floor<2;floor++)for(let j=0;j<2;j++){
 const wy=3.65+floor*1.4;if(wy>h-.6)continue;
 g.add(cube(.95,.96,.075,shopShadow,j===0?-.85:.85,wy,front));g.add(cube(.83,.85,.09,shopWindowMaterials[(i+floor*2+j)%4],j===0?-.85:.85,wy,front+(x<0?.05:-.05)));
 g.add(cube(.9,.08,.12,shopTrim,j===0?-.85:.85,wy+.46,front));
 g.add(cube(.08,.9,.13,shopTrim,j===0?-.85:.85,wy,front));
 }
 // Procedural 3D Yaowarat shophouse detail: recessed balconies, railings and AC units.
 // Geometry stays attached to each existing scrolling building (no new spawn logic).
 const roadDir=x<0?1:-1;
 const balconyMetal=shopTrim,balconyShade=shopShadow,acBody=mat(0xc3c8c4),acVent=mat(0x515b60);
 for(let floor=0;floor<2;floor++){
  const by=4.15+floor*2.6;
  if(by>h-.65)continue;
  g.add(cube(3.35,.13,.64,balconyShade,0,by-.64,front+roadDir*.35));
  g.add(cube(3.25,.075,.08,balconyMetal,0,by+.02,front+roadDir*.67));
  for(let bar=-3;bar<=3;bar++)g.add(cube(.055,.68,.07,balconyMetal,bar*.49,by-.33,front+roadDir*.67));
  if((i+floor)%3===0){
   g.add(cube(.68,.48,.31,acBody,1.35,by+.45,front+roadDir*.22));
   g.add(cube(.52,.32,.025,acVent,1.35,by+.45,front+roadDir*.4));
  }
 }
 if(i%3===0){
  // Side-mounted rain pipe and a projecting ground-floor shop light.
  g.add(cube(.075,h-.6,.075,acVent,-1.78,h/2,front+roadDir*.11));
  g.add(cube(.46,.11,.4,shopTrim,-1.18,2.52,front+roadDir*.45));
  g.add(ball(.13,windowGlow,-1.18,2.38,front+roadDir*.47));
 }
 const sign=cube(2.7,.62,.12,signMaterials[i%3],0,2.94,front+(x<0?.07:-.07));g.add(sign);g.add(cube(2.85,.08,.19,M.gold,0,3.30,front+(x<0?.10:-.10)));g.userData.sign=sign;g.userData.signIndex=i;
 // Decorative shop lettering blocks avoid relying on device fonts.
 for(let k=0;k<3;k++)g.add(cube(k===1?.14:.34,.17,.14,shopTrim,-.66+k*.66,2.94,front+(x<0?.15:-.15)));if(i%2===0){g.add(cube(.13,.6,.13,M.gold,1.56,2.92,front));g.add(ball(.18,M.red,1.56,2.51,front))}
 if(i%3===0){g.add(cube(.14,1.7,.14,shopTrim,1.6,3.7,front));g.add(cube(.95,.12,.18,awningColors[i%3],1.1,4.45,front))}
 const plaque=new THREE.Mesh(new THREE.PlaneGeometry(2.65,1.05),shopSignMaterials[i%shopSignMaterials.length]);plaque.position.set(0,3.12,front+(x<0?.21:-.21));plaque.rotation.y=x<0?0:Math.PI;g.add(plaque);
if(i%2===0){const hanging=new THREE.Mesh(new THREE.PlaneGeometry(1.1,3.5),neonBladeMaterials[i%neonBladeMaterials.length]);hanging.position.set(x<0?1.75:-1.75,5.8,front+(x<0?-.8:.8));hanging.rotation.y=x<0?-.75:.75;g.add(hanging);g.add(cube(.09,.09,1.25,oldGold,x<0?1.75:-1.75,7.5,front));}
if(i%3===1){const grille=cube(2.9,2.1,.09,glassDark,0,1.17,front+(x<0?.12:-.12));g.add(grille);for(let q=-2;q<=2;q++)g.add(cube(.055,2.15,.13,oldGold,q*.52,1.17,front+(x<0?.2:-.2)))}if(i%3===0){const light=ball(.19,warmNeon,0,2.37,front+(x<0?.68:-.68));g.add(light)}if(i%5===0){const lantern=ball(.24,redNeon,0,2.15,front+(x<0?1.0:-1.0));g.add(lantern);g.add(cube(.06,.24,.06,oldGold,0,2.5,front+(x<0?1.0:-1.0)));}g.rotation.y=Math.PI/2;g.position.set(x,0,z);scene.add(g);props.push(g);if(i%3!==1&&!((x<0&&i===6)||(x>0&&i===23))){const blade=new THREE.Mesh(new THREE.PlaneGeometry(i%4===0?1.9:1.35,i%4===0?4.8:3.45),neonBladeMaterials[(i*3+(x>0?2:0))%neonBladeMaterials.length]);blade.position.set(x<0?-4.85:4.85,i%4===0?5.8:6.2,z+(i%4===0?1.8:-.7));blade.userData.neonReflectionAnchor=true;blade.userData.neonReflectionColorIndex=i%3;scene.add(blade);props.push(blade);}
}
for(let i=0;i<(mobile?31:34);i++){building(-8.4,-i*6.0+14,i);building(8.4,-i*6.0+14,i+2)}
// Align the existing ten rain-slick reflections with real scrolling neon shop signs.
// Anchor once at setup; no extra meshes, lights, textures or per-frame searches.
const reflectionSignAnchors=props.filter(p=>p.userData.neonReflectionAnchor);
for(let i=0;i<neonReflections.length;i++){
 const reflection=neonReflections[i],side=i%2===0?-1:1,targetZ=-16-i*18;
 let nearest=null,nearestDistance=Infinity;
 for(const sign of reflectionSignAnchors){
  if(Math.sign(sign.position.x)!==side)continue;
  const distance=Math.abs(sign.position.z-targetZ);
  if(distance<nearestDistance){nearest=sign;nearestDistance=distance;}
 }
 if(nearest){
  reflection.userData.signAnchor=nearest;
  reflection.position.set(nearest.position.x*.84,0,nearest.position.z+1.3);
  reflection.children[0].material=neonReflectionMaterials[nearest.userData.neonReflectionColorIndex];
 }
}

const roadGlow=new THREE.MeshBasicMaterial({color:0xa52842,transparent:true,opacity:.23,depthWrite:false});for(const side of [-1,1]){const glow=new THREE.Mesh(new THREE.PlaneGeometry(.48,205),roadGlow);glow.rotation.x=-Math.PI/2;glow.position.set(side*5.9,.072,-91);scene.add(glow);}for(let i=0;i<12;i++){const z=9-i*18;for(const side of [-1,1]){const lamp=new THREE.Group();lamp.add(cube(.065,5.4,.065,brickTrim,0,2.7,0));lamp.add(cube(1.15,.065,.065,brickTrim,-side*.55,5.4,0));lamp.add(ball(.16,warmNeon,-side*1.1,5.33,0));lamp.position.set(side*6.7,0,z);scene.add(lamp);props.push(lamp)}}
// Rama II segmented elevated highway: unfinished deck joint, precast girders and safety equipment.
const ramaStructures=[];
const bridgeConcrete=new THREE.MeshLambertMaterial({color:0x9da3a5,flatShading:false});
const bridgeUnderside=new THREE.MeshLambertMaterial({color:0x737b80,flatShading:false});
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
  viaduct.add(cube(13.2,.8,28,bridgeConcrete,0,9.1,z));
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
const siteConcrete=new THREE.MeshLambertMaterial({color:0xb9b4aa});
const siteWhite=new THREE.MeshLambertMaterial({color:0xe9e4d9});
const siteRed=new THREE.MeshLambertMaterial({color:0xd44735});
const siteSteel=new THREE.MeshLambertMaterial({color:0x666e70});
const siteCrane=new THREE.MeshLambertMaterial({color:0xe6a632});
const siteBarrierGeo=new THREE.BoxGeometry(.5,.9,3.65);
const siteStripeGeo=new THREE.BoxGeometry(.52,.3,1.12);
function ramaWorkZone(side,z){
 const g=new THREE.Group();
 // 14 barriers along the shoulder, striped alternately red and white.
 const barriers=new THREE.InstancedMesh(siteBarrierGeo,siteWhite,14);
 const stripes=new THREE.InstancedMesh(siteStripeGeo,siteRed,14);
 for(let i=0;i<14;i++){
  const zz=-26+i*4;
  barriers.setMatrixAt(i,new THREE.Matrix4().makeTranslation(side*6.05,.48,zz));
  stripes.setMatrixAt(i,new THREE.Matrix4().makeTranslation(side*5.76,.57,zz));
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


// Overhead utility wires, low polygon count and no textures.
const cableMat=mat(0x32313c);
for(const side of [-1,1])for(let i=0;i<9;i++){
 const z=10-i*22;
 const pole=cube(.11,8,.11,cableMat,side*6.95,4,z);scene.add(pole);
 for(let n=0;n<2;n++){
 const cable=new THREE.Mesh(new THREE.CylinderGeometry(.024,.024,22,5),cableMat);
 cable.rotation.x=Math.PI/2;cable.position.set(side*(6.95+n*.19),7.15-n*.34,z-11);scene.add(cable);
 }
}
const car=new THREE.Group();const cockpit=new THREE.Group();camera.add(cockpit);scene.add(camera);cockpit.scale.setScalar(.76);cockpit.position.y=-.22;const cockpitMat=new THREE.MeshLambertMaterial({color:0x1b2030});const cockpitChrome=new THREE.MeshLambertMaterial({color:0xc9d4db});cockpit.add(cube(2.2,.16,.5,cockpitMat,0,-.94,-1.2));cockpit.add(cube(1.35,.09,.12,cockpitChrome,0,-.57,-1.35));cockpit.add(cube(.10,.48,.1,cockpitChrome,0,-.8,-1.32));for(const side of [-1,1]){cockpit.add(cube(.075,1.25,.075,cockpitChrome,side*1.08,-.18,-1.4));cockpit.add(cube(.34,.43,.055,cockpitMat,side*1.12,-.22,-1.68))}
const cockpitBlue=new THREE.MeshLambertMaterial({color:0x0ab8c9}),cockpitGold=new THREE.MeshLambertMaterial({color:0xfbd44c}),cockpitRed=new THREE.MeshLambertMaterial({color:0xc73556});
function cockpitTube(pts,r,m){const path=new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p)));const o=new THREE.Mesh(new THREE.TubeGeometry(path,Math.max(8,pts.length*5),r,6,false),m);cockpit.add(o);return o}
cockpit.add(cube(2.45,.28,.5,cockpitBlue,0,-.99,-1.35));
cockpit.add(cube(1.6,.13,.36,cockpitGold,0,-.78,-1.48));
cockpitTube([[-.75,-.70,-1.36],[-.45,-.64,-1.42],[0,-.68,-1.48],[.45,-.64,-1.42],[.75,-.70,-1.36]],.046,cockpitChrome);
for(const side of [-1,1]){
 cockpit.add(cube(.33,.13,.19,cockpitMat,side*.76,-.70,-1.36));
 cockpitTube([[side*.9,-.92,-1.42],[side*1.03,.1,-1.55],[side*1.09,.71,-1.52]],.046,cockpitChrome);
 cockpit.add(cube(.38,.30,.075,cockpitChrome,side*1.12,.05,-1.55));
 cockpit.add(cube(.29,.22,.078,cockpitMat,side*1.12,.05,-1.60));
}
// Remove the overhead trim from the camera view; keep the lower dashboard and side frame.
// Upper windshield crossbar removed to expose the street.
const speedDial=new THREE.Group();speedDial.position.set(0,-.67,-1.37);cockpit.add(speedDial);
const dialFace=new THREE.Mesh(new THREE.CylinderGeometry(.18,.18,.045,20),cockpitMat);dialFace.rotation.x=Math.PI/2;speedDial.add(dialFace);
const dialRim=new THREE.Mesh(new THREE.TorusGeometry(.18,.025,6,22),cockpitGold);speedDial.add(dialRim);
const dialNeedle=cube(.018,.13,.016,cockpitRed,0,.05,.05);speedDial.add(dialNeedle);
const trim=mat(0xf6f0db),chrome=mat(0xb9d5d9),seat=mat(0x773a61),dark=mat(0x18283c);
function tube(points,r,m){const path=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));const mesh=new THREE.Mesh(new THREE.TubeGeometry(path,Math.max(8,points.length*5),r,7,false),m);car.add(mesh);return mesh}
function ellipsoid(x,y,z,sx,sy,sz,m){const o=ball(1,m,x,y,z);o.scale.set(sx,sy,sz);car.add(o);return o}
function cyl(r1,r2,h,m,x,y,z,rot=0){const o=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,14),m);o.position.set(x,y,z);o.rotation.z=rot;car.add(o);return o}
// Three-wheel chassis, rounded bonnet, passenger compartment and front mudguard
car.add(cube(1.65,.24,2.75,dark,0,.64,0));
ellipsoid(0,.91,-.78,.87,.42,.86,M.blue);
ellipsoid(0,.79,-1.25,.83,.25,.34,M.blue);
car.add(cube(1.78,.42,1.3,M.blue,0,.92,.73));
car.add(cube(1.55,.18,.76,seat,0,1.22,.78));
car.add(cube(1.7,.13,.3,M.gold,0,1.42,1.24));
for(const side of [-1,1]){
  // rear passenger wheels, side panels and arches
  cyl(.46,.46,.22,M.wheel,side*.91,.47,.84,Math.PI/2);
  cyl(.27,.27,.235,chrome,side*.91,.47,.84,Math.PI/2);
  ellipsoid(side*.88,.88,.83,.14,.35,.62,M.gold);
  tube([[side*.88,.85,-.72],[side*.95,1.35,-.75],[side*.99,2.14,-.55],[side*.96,2.36,-.1]],.047,chrome);
  tube([[side*.94,1.05,1.15],[side*.98,1.86,1.15],[side*.95,2.31,.87]],.047,chrome);
  // side step, handles, decorative stripe
  car.add(cube(.25,.1,1.3,chrome,side*1.04,.62,.55));
  car.add(cube(.09,.12,.24,M.gold,side*.96,1.38,-.34));
  // mirrors
  tube([[side*.81,1.39,-1.12],[side*1.17,1.55,-1.15]],.035,chrome);
  ellipsoid(side*1.22,1.59,-1.16,.16,.21,.08,dark);
}
// curved canopy with fabric overhang and arching ribs
const canopy=new THREE.Mesh(new THREE.SphereGeometry(1,18,10,0,Math.PI*2,0,Math.PI/2),M.pink);
canopy.scale.set(1.15,.37,1.67);canopy.position.set(0,2.23,.17);car.add(canopy);
car.add(cube(2.25,.12,3.03,M.pink,0,2.25,.15));
for(const z of [-1.3,1.6])tube([[-1.1,2.28,z],[-.75,2.49,z],[0,2.57,z],[.75,2.49,z],[1.1,2.28,z]],.055,M.gold);
// windshield and framing
const windshield=cube(1.57,.68,.065,M.glass,0,1.76,-.91);windshield.rotation.x=-.18;car.add(windshield);
tube([[-.84,1.38,-.95],[-.85,2.1,-.88],[.85,2.1,-.88],[.84,1.38,-.95]],.042,chrome);
car.add(cube(1.05,.08,.08,chrome,0,1.43,-1.04));
car.add(cube(.5,.12,.07,dark,0,1.51,-.99));
// front single wheel and rounded fender
cyl(.4,.4,.22,M.wheel,0,.42,-1.42,Math.PI/2);
cyl(.22,.22,.24,chrome,0,.42,-1.42,Math.PI/2);
ellipsoid(0,.69,-1.43,.45,.13,.5,M.gold);
// lamps, bumper, tail plate
for(const side of [-1,1]){
  ellipsoid(side*.58,1.02,-1.5,.22,.22,.12,chrome);
  ellipsoid(side*.58,1.02,-1.61,.15,.15,.045,M.white);
  ellipsoid(side*.73,1.05,1.4,.14,.14,.08,M.red);
}
tube([[-.82,.57,-1.48],[-.66,.5,-1.7],[.66,.5,-1.7],[.82,.57,-1.48]],.065,chrome);
car.add(cube(.62,.22,.08,M.gold,0,.93,1.49));
car.add(cube(.4,.12,.09,M.black,0,.93,1.55));
scene.add(car);
// V0.9 AI generated vehicle, using the procedural car until the GLB is ready.
// Fixed orientation verified from iPhone screenshot: rear of vehicle faces the camera.
// Vehicle heading now determined from model geometry, not a user-set angle.
const TUKTUK_GLB='https://v3b.fal.media/files/b/0aaedcfd/U0gjvaaq8RuKQVt3a8zrE_model.glb';
let realTukTuk=null;
new GLTFLoader().load(TUKTUK_GLB,glb=>{
 try{
  const raw=glb.scene;
  raw.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(raw),sz=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
  if(!Number.isFinite(sz.x)||!Number.isFinite(sz.y)||!Number.isFinite(sz.z)||Math.min(sz.x,sz.y,sz.z)<=.001)throw Error('invalid vehicle bounds');
  const mats=new Set();
  raw.traverse(o=>{if(!o.isMesh)return;o.frustumCulled=true;const mm=Array.isArray(o.material)?o.material:[o.material];for(const m of mm){if(!m)continue;for(const key of ['map','normalMap','roughnessMap','metalnessMap','aoMap']){const tex=m[key];if(!tex||mats.has(tex))continue;mats.add(tex);const im=tex.image;if(im&&im.width>768&&im.height>0){const f=Math.min(1,768/Math.max(im.width,im.height));if(f<1){const cv=document.createElement('canvas');cv.width=Math.round(im.width*f);cv.height=Math.round(im.height*f);try{cv.getContext('2d').drawImage(im,0,0,cv.width,cv.height);tex.image=cv;tex.needsUpdate=true}catch(e){}}}}}});
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
const hazards=[];function makeDurian(){const group=new THREE.Group();group.add(ball(.75,M.durian,0,.8,0));for(let i=0;i<15;i++){const a=i*Math.PI*2/15;const spike=new THREE.Mesh(new THREE.ConeGeometry(.23,.54,4),M.spike);spike.position.set(Math.cos(a)*.77,.85+Math.sin(a)*.4,Math.sin(a)*.77);spike.rotation.z=Math.PI/2-a;group.add(spike)}return group}
// V0.6 detailed lightweight procedural characters; no external asset downloads
const cream=mat(0xf3e6c9),gold2=mat(0xf7bc38),maroon=mat(0x9a294d),jade=mat(0x168b77),ink=mat(0x222139);
function part(g,o){g.add(o);return o}
function rod(g,a,b,r,m){const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),d=q.clone().sub(p),o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,d.length(),8),m);o.position.copy(p).add(q).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());g.add(o);return o}
// Bangkok bus classics: blue-white route 8 and red-cream route 203.
const busBlue=mat(0x287fbd),busCream=mat(0xf2efe0),busYellow=mat(0xf6d455),busGreen=mat(0x23884e),busDark=mat(0x203b4c),busLamp=mat(0xffe8a1);
function makeBus(variant='red'){const g=new THREE.Group(),blue=variant==='blue',main=blue?busCream:M.red,trim=blue?busBlue:busCream,accent=blue?busYellow:busGreen;
 part(g,cube(2.86,2.52,5.3,main,0,1.67,0));part(g,cube(2.96,.31,5.38,blue?busBlue:M.red,0,3.03,0));part(g,cube(2.89,.23,5.34,accent,0,1.31,0));part(g,cube(2.9,.27,5.35,trim,0,.71,0));
 for(const side of [-1,1]){for(let i=0;i<5;i++){part(g,cube(.06,.78,.72,busDark,side*1.47,2.35,-1.92+i*.91));part(g,cube(.075,.79,.045,trim,side*1.51,2.35,-1.52+i*.91))}for(const z of [-1.72,1.62]){const wh=new THREE.Mesh(new THREE.CylinderGeometry(.48,.48,.21,9),M.wheel);wh.rotation.z=Math.PI/2;wh.position.set(side*1.46,.49,z);part(g,wh)}part(g,cube(.22,.31,.17,busDark,side*1.56,2.42,2.37))}
 part(g,cube(2.35,.88,.085,busDark,0,2.28,2.7));part(g,cube(.075,.87,.09,trim,0,2.28,2.76));part(g,cube(2.43,.51,.13,trim,0,3.02,2.73));part(g,cube(.86,.39,.15,busCream,0,3.06,2.82));
 for(const dx of (blue?[0]:[-.21,0,.21]))part(g,cube(.105,.25,.05,blue?busDark:busBlue,dx,3.06,2.92));
 part(g,cube(1.62,.36,.10,busDark,0,1.12,2.74));for(let j=0;j<3;j++)part(g,cube(1.45,.035,.12,trim,0,1.02+j*.10,2.82));part(g,cube(2.64,.22,.18,busDark,0,.55,2.79));
 for(const side of [-1,1]){part(g,ball(.18,busLamp,side*.97,.98,2.81));part(g,cube(.24,.15,.11,M.gold,side*1.14,1.49,2.79))}
 if(blue){part(g,cube(2.6,.17,.13,busYellow,0,1.42,2.79));part(g,cube(2.5,.39,.13,busBlue,0,.82,2.78))}else{part(g,cube(2.65,.18,.14,busGreen,0,1.62,2.79));part(g,cube(2.45,.43,.12,busCream,0,.91,2.78))}
 return g
}
// Lightweight moving traffic: built from simple shared geometry, no new downloads.
// Mobile-friendly vehicle silhouettes: readable from behind, no additional GLB downloads.
// Performance-friendly traffic silhouettes with far fewer draw calls.
const taxiPink=mat(0xed3887),taxiGlass=mat(0x35596d),taxiTrim=mat(0xf5e8b6),bikeMetal=mat(0x27282e),bikeYellow=mat(0xeab029),bikeBlue=mat(0x28528a);
const taxiGreen=mat(0x008c71),taxiYellow=mat(0xffcb27),taxiLight=mat(0xfff5d8),taxiChrome=mat(0x9eb6c2),tukBlue=mat(0x0847bd),tukRed=mat(0xcf283c),tukRoof=mat(0x252632);
function makeTaxi(){const g=new THREE.Group();
part(g,cube(2.03,.63,3.48,taxiGreen,0,.82,0));part(g,cube(1.92,.18,3.38,taxiYellow,0,1.18,0));part(g,cube(1.63,.68,1.92,taxiYellow,0,1.48,-.13));
part(g,cube(1.48,.47,.07,taxiGlass,0,1.52,.88));part(g,cube(1.48,.42,.07,taxiGlass,0,1.52,-1.13));
for(const side of [-1,1]){part(g,cube(.055,.44,1.35,taxiGlass,side*.83,1.51,-.16));part(g,cube(.10,.12,.25,taxiYellow,side*1.06,1.4,.67));for(const z of [-1.1,1.12]){const w=new THREE.Mesh(new THREE.CylinderGeometry(.36,.36,.18,10),M.wheel);w.rotation.z=Math.PI/2;w.position.set(side*1.02,.44,z);part(g,w);const hub=new THREE.Mesh(new THREE.CylinderGeometry(.17,.17,.19,9),taxiChrome);hub.rotation.z=Math.PI/2;hub.position.copy(w.position);part(g,hub)}part(g,ball(.18,taxiLight,side*.72,1.05,1.78))}
part(g,cube(.72,.18,.42,taxiLight,0,1.91,-.19));part(g,cube(1.05,.22,.07,taxiChrome,0,.82,1.78));part(g,cube(1.82,.10,.08,taxiChrome,0,.49,1.77));part(g,cube(1.56,.10,.09,taxiChrome,0,.55,-1.76));for(const side of [-1,1]){part(g,cube(.22,.12,.07,taxiLight,side*.73,1.06,-1.77));part(g,cube(.09,.09,.7,taxiChrome,side*.91,1.16,.03));}part(g,cube(.75,.14,.09,taxiGreen,0,.56,1.8));return g}
function makeTukTuk(){const g=new THREE.Group();
part(g,cube(1.62,.75,2.55,tukBlue,0,.82,-.12));part(g,cube(1.68,.16,2.3,tukRed,0,1.15,-.16));part(g,cube(1.72,.16,2.43,tukRoof,0,2.43,-.19));
for(const side of [-1,1]){part(g,cube(.075,1.17,.08,taxiChrome,side*.79,1.83,.71));part(g,cube(.075,1.17,.08,taxiChrome,side*.79,1.83,-1.08));const wh=new THREE.Mesh(new THREE.CylinderGeometry(.35,.35,.19,10),M.wheel);wh.rotation.z=Math.PI/2;wh.position.set(side*.82,.42,-1.02);part(g,wh);part(g,ball(.15,taxiLight,side*.57,1.03,1.24))}
part(g,cube(1.38,.53,.07,taxiGlass,0,1.83,.79));part(g,cube(1.52,.08,.12,taxiChrome,0,2.28,.78));for(const side of [-1,1]){part(g,cube(.075,.55,.09,taxiChrome,side*.72,1.84,.78));part(g,cube(.11,.12,1.48,taxiChrome,side*.8,1.25,-.16));}part(g,cube(.72,.6,.8,tukBlue,0,.94,.91));part(g,cube(.72,.12,.12,taxiChrome,0,.66,1.32));part(g,cube(1.25,.32,.16,tukRed,0,.58,1.23));const front=new THREE.Mesh(new THREE.CylinderGeometry(.38,.38,.22,10),M.wheel);front.rotation.z=Math.PI/2;front.position.set(0,.39,1.32);part(g,front);part(g,cube(.63,.18,.3,taxiLight,0,2.53,.22));part(g,cube(1.46,.12,.09,taxiChrome,0,.55,1.27));part(g,cube(.85,.13,.55,tukRed,0,1.3,-.63));
// Distinctive Thai tuk-tuk silhouette: passenger bench, rear rail and twin mirrors.
part(g,cube(1.30,.16,.64,tukRed,0,1.32,-.62));
part(g,cube(1.30,.54,.14,tukBlue,0,1.66,-1.03));
part(g,cube(1.55,.09,.08,taxiChrome,0,1.35,-1.34));
for(const side of [-1,1]){
 part(g,cube(.07,.94,.07,taxiChrome,side*.79,1.93,-1.20));
 part(g,cube(.07,.44,.07,taxiChrome,side*.94,1.83,.69));
 part(g,cube(.31,.22,.07,taxiGlass,side*.96,2.08,.70));
 part(g,ball(.13,taxiLight,side*.57,.75,-1.42));
}
part(g,cube(1.42,.12,.16,taxiChrome,0,.68,-1.45));
return g}
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
let dancerTemplate=null,dancerLoading=true;
new GLTFLoader().load(DANCER_GLB,glb=>{
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
},undefined,err=>{console.warn('GLB unavailable, using procedural fallback',err);dancerLoading=false});
// Premium AI-generated Thai Yaksha; fallback stays available on slow connections.
const YAKSHA_GLB='https://v3b.fal.media/files/b/0aaedd6a/14yrGJ3Iq8XcawwVvTolz_model.glb';
let yakshaTemplate=null;
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
function cachedObstacle(type){if(!obstacleTemplates[type])obstacleTemplates[type]=type==='truck'?makeTruck():type==='checkpoint'?makeCheckpoint():type==='construction'?makeConstructionDebris():type==='durian'?makeDurian():type==='bus'?makeBus('red'):type==='busBlue'?makeBus('blue'):type==='tuktuk'?makeTukTuk():type==='taxi'?makeTaxi():type==='bike'?makeBike():type==='yaksha'?makeYaksha():makeDancer();const copy=obstacleTemplates[type].clone(true);if(type==='dancer'){const original=obstacleTemplates[type];const arms=original.userData.danceArms;if(Array.isArray(arms)){copy.userData.danceArms=arms.map(arm=>{let indices=[];let node=arm;while(node&&node!==original){const parent=node.parent;if(!parent)break;indices.unshift(parent.children.indexOf(node));node=parent}if(node!==original)return null;let target=copy;for(const i of indices){target=target.children[i];if(!target)return null}return target})}}return copy}let bossSpawned=false,bossBeaten=false,eventCount=0,lastEventMeters=-250;let spawnIndex=0;const intro=['tuktuk','taxi','bus','bike','tuktuk','taxi','bus','bike','durian'];function spawn(){if(meters+bonus>=12000){spawnExpresswayHazard();return;}if(meters+bonus>=8000){spawnMarketPedestrians();return;}const boss=nightCount>=1&&meters>=3200&&!bossSpawned;if(boss)bossSpawned=true;const chance=Math.random();const eventEligible=!boss&&spawnIndex>=intro.length&&meters>160&&meters-lastEventMeters>85&&Math.random()<.38;const madness=eventEligible?['rollingDurian','cuttingBus','wrongWayBike'][Math.floor(Math.random()*3)]:null;if(madness){eventCount++;lastEventMeters=meters}let type=boss?'yaksha':madness==='rollingDurian'?'durian':madness==='cuttingBus'?'bus':madness==='wrongWayBike'?'bike':spawnIndex<intro.length?intro[spawnIndex]:chance<.10?'construction':chance<.18?'durian':chance<.34?'bus':chance<.47?'yaksha':chance<.59?'dancer':chance<.78?'taxi':chance<.9?'tuktuk':'bike';if(nightCount===0&&(type==='yaksha'||type==='dancer'))type='taxi';if(nightCount>=1&&spawnIndex%9===0)type='yaksha';if(nightCount>=1&&spawnIndex%7===0)type='dancer';if(Math.floor(meters+bonus)<3000&&type==='construction')type='taxi';if(Math.floor(meters+bonus)>=3000&&spawnIndex%3===0)type='construction';if(Math.floor(meters+bonus)>=3000&&spawnIndex%13===5)type='checkpoint';if(Math.floor(meters+bonus)>=3000&&spawnIndex%8===3)type='truck';if(type==='bus'&&spawnIndex%2===0)type='busBlue';spawnIndex++;const jamFormation=!boss&&!madness&&spawnIndex>intro.length&&spawnIndex%5===0&&(type==='taxi'||type==='tuktuk');const jamLanes=[-3.35,0,3.35];const jamOpenLane=jamFormation?jamLanes[Math.floor(Math.random()*3)]:null;const jamOccupied=jamFormation?jamLanes.filter(v=>v!==jamOpenLane):null;let durianSide=0;if(type==='durian'){durianSide=Math.random()<.5?-1:1;if(storyProps.filter(p=>p.kind==='vendor').length<2)makeRoadsideStory('vendor',durianSide,-65)}const useDetailedDancer=type==='dancer'&&!mobile&&!!dancerTemplate&&!hazards.some(h=>h.type==='dancer'&&h.g.userData.detailedDancer);
const useDetailedTukTuk=type==='tuktuk'&&!jamFormation&&!!realTukTuk&&!hazards.some(h=>h.type==='tuktuk'&&h.g.userData.detailedTukTuk);
const g=!mobile&&type==='yaksha'&&yakshaTemplate&&!hazards.some(h=>h.type==='yaksha'&&h.g.userData.detailedYaksha)?yakshaTemplate.clone(true):useDetailedDancer?dancerTemplate.clone(true):useDetailedTukTuk?realTukTuk.clone(true):cachedObstacle(type);g.userData.detailedDancer=!!useDetailedDancer;g.userData.detailedTukTuk=!!useDetailedTukTuk;g.userData.detailedYaksha=type==='yaksha'&&!!yakshaTemplate&&g.children.length===1;const lane=jamFormation?jamOccupied[0]:type==='tuktuk'?([-1.1,0,1.1][spawnIndex%3]):type==='durian'?durianSide*3.35:boss?0:madness==='rollingDurian'?(Math.random()<.5?-3.35:3.35):[-3.35,0,3.35][Math.floor(Math.random()*3)];g.position.set(lane,0,type==='tuktuk'&&!jamFormation?-37:-65);if(type==='dancer')g.scale.setScalar(useDetailedDancer?1:1.55);if(type==='construction'){g.position.y=6;g.scale.setScalar(1.35);}if(type==='yaksha')g.scale.setScalar(boss?2.3:1.85);if(type==='bus'||type==='busBlue')g.scale.setScalar(1.04);if(type==='taxi')g.scale.setScalar(1.22);if(type==='truck')g.scale.setScalar(1.13);if(type==='tuktuk')g.scale.setScalar(jamFormation?1.75:useDetailedTukTuk?2.7:3.05);if(type==='bike')g.scale.setScalar(1.6);if(type==='checkpoint')g.scale.setScalar(1.15);if(madness==='rollingDurian')g.scale.setScalar(1.35);if(madness==='wrongWayBike')g.rotation.y=Math.PI;scene.add(g);if(jamFormation){
 // Exactly two aligned, non-swerving vehicles occupy two lanes; the third stays clear.
 const trafficLane=jamOccupied[1],jamType=type==='taxi'?'tuktuk':'taxi';
 const jam=cachedObstacle(jamType);
 jam.position.set(trafficLane,0,-65);
 jam.scale.setScalar(jamType==='taxi'?1.22:1.75);
 scene.add(jam);
 hazards.push({g:jam,type:jamType,madness:null,boss:false,durianSide:0,passed:false,hit:false,phase:0,baseX:trafficLane,announced:false,nearAwarded:false,swerve:0,swerveStart:-100});
}
hazards.push({g,type,madness,boss,durianSide,passed:false,hit:false,phase:Math.random()*6.28,baseX:lane,announced:false,nearAwarded:false,swerve:jamFormation?0:madness==='cuttingBus'?(lane===3.35?-1:lane===-3.35?1:(Math.random()<.5?-1:1)):Math.random()<.6?(Math.random()<.5?-1:1):0,swerveStart:madness==='cuttingBus'?-40:-23-Math.random()*15})}
let paused=false,challengeStage=0,challengeDisplay='',comboTime=0,active=false,meters=0,bonus=0,speed=120,x=0,tilt=0,neutral=null,lastGamma=null,hasMotion=false,smoothed=0,spawnClock=0,inv=0,flips=0,combo=0,misses=0,crashes=0,best=0,last=performance.now(),shake=0,missionDone=false,soundOn=true,audio=null;try{best=Number(localStorage.getItem('bbf-best3d')||0)}catch(e){}
function reset(){nightCount=0;expresswayArt.group.visible=false;grandmaTriggeredNight=0;if(grandmaChase){scene.remove(grandmaChase.g);grandmaChase=null}storyProps.forEach(p=>scene.remove(p.g));storyProps.length=0;visualRush=0;camera.fov=76;camera.updateProjectionMatrix();cockpit.position.y=-.22;paused=false;$('pauseBtn').textContent='⏸';bossSpawned=false;bossBeaten=false;for(const p of props)p.visible=true;for(const p of neonReflections){p.position.z=p.userData.startZ;p.visible=true;}for(const p of ramaStructures){p.visible=false;p.position.z=p.userData.startZ;}for(const shop of roadsideShops){shop.g.visible=shop.stage===1;shop.g.position.z=shop.startZ;}for(const stall of marketStalls){stall.visible=false;stall.position.z=stall.userData.startZ;}for(const tent of marketCanopies){tent.visible=false;tent.position.z=tent.userData.startZ;}for(const bump of marketBumps){bump.visible=false;bump.position.z=bump.userData.startZ;}for(const mesh of marketCrowdMeshes)mesh.visible=false;canalGroup.visible=false;districtIndex=-1;applyDistrict(1);scene.background.copy(districtSkies[1]);scene.fog.color.copy(districtSkies[1]);spawnIndex=0;eventCount=0;lastEventMeters=-250;active=true;meters=0;bonus=0;missionDone=false;shake=0;speed=120;x=0;tilt=0;neutral=lastGamma;smoothed=0;spawnClock=.45;inv=0;flips=0;combo=0;comboTime=0;challengeStage=0;challengeDisplay='';challenge.textContent='🎯 SURVIVE 500m · +250';misses=0;crashes=0;hazards.forEach(h=>scene.remove(h.g));hazards.length=0;overlay.style.display='none';hint.textContent='📱 SMALL TILTS TO STEER · 🎯 RECENTER'}
function finish(){active=false;const points=Math.floor(meters+bonus);if(points>best){best=points;try{localStorage.setItem('bbf-best3d',String(best))}catch(e){}}panel.innerHTML='<h1>💥 GAME OVER!</h1><p>SCORE '+points+' · BEST '+best+'</p><p>Near misses '+misses+' · Crashes '+crashes+'</p><p>'+(missionDone?'🏆 1000m mission complete!':'🎯 Reach 1000m for +500 points')+'</p><button id="again">TRY AGAIN</button><small>No brakes. No rules. Just Bangkok.</small>';overlay.style.display='grid';$('again').onclick=reset}
function sound(freq=240,duration=.12,type='square'){if(!soundOn)return;try{audio=audio||new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();const o=audio.createOscillator(),gain=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(55,freq*.55),audio.currentTime+duration);gain.gain.setValueAtTime(.075,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(gain);gain.connect(audio.destination);o.start();o.stop(audio.currentTime+duration)}catch(e){}}
// 8000-point stage: Chatuchak (JJ Market) craft, vintage and plant stalls.
// Lightweight geometry keeps the center road playable for tilt steering.
const marketStalls=[],marketCanopies=[],marketBumps=[];
// At 10,000 points the market's right edge becomes an open canal.
const canalGroup=new THREE.Group(),canalWater=mat(0x167c91),canalEdge=mat(0xb7ad92),canalBoat=mat(0x865337);
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
// Low-poly fruit boats and striped parasols make the canal readable on mobile.
const canalBoats=[];
// Shared translucent wake material adds moving V-trails without heavy particle effects.
const boatWakeMat=new THREE.MeshBasicMaterial({color:0xc8fff0,transparent:true,opacity:.63,depthWrite:false});
const fruitColors=[mat(0xe8b82f),mat(0xe65b37),mat(0x78b34c)],umbrellaColors=[mat(0xffd45c),mat(0xf26e83),mat(0x5bc6bb)];
for(let i=0;i<10;i++){
 const boat=new THREE.Group();
 boat.add(cube(1.2,.32,2.6,canalBoat,0,0,0));
 boat.add(cube(1.05,.12,2.25,mat(0xd2b078),0,.24,0));
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
const tentPalettes=[['#f2e5b8','#d59b68'],['#e8e5ce','#76a69a'],['#f3d9c9','#ca807e']];
const tentColors=tentPalettes.map(([light,dark])=>{
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
 const ctx=canvas.getContext('2d');ctx.fillStyle=light;ctx.fillRect(0,0,256,256);
 for(let x=0;x<256;x+=64){ctx.fillStyle=dark;ctx.fillRect(x,0,32,256);}
 ctx.strokeStyle='rgba(70,53,44,.22)';ctx.lineWidth=2;
 for(let x=0;x<=256;x+=32){ctx.beginPath();ctx.moveTo(x+.5,0);ctx.lineTo(x+.5,256);ctx.stroke();}
 for(const y of [7,249]){ctx.setLineDash([5,5]);ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(256,y);ctx.stroke();}
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=2;
 return new THREE.MeshLambertMaterial({map:texture,side:THREE.DoubleSide});
});
const tentRoofGeometry=new THREE.BoxGeometry(9.7,.12,10.5);
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
const expresswayConcrete=mat(0x9296a4),expresswaySteel=mat(0x3b5366),laserMat=new THREE.MeshBasicMaterial({color:0xff304f,transparent:true,opacity:.8});
for(const side of [-1,1]){const rail=cube(.3,.85,210,expresswayConcrete,side*4.35,.6,-90);expresswaySet.add(rail);for(let n=0;n<10;n++)expresswaySet.add(cube(.15,.45,1.5,expresswaySteel,side*4.35,1.2,-n*21));}
const ufo=new THREE.Group();ufo.add(new THREE.Mesh(new THREE.SphereGeometry(2.2,16,8),mat(0x9ab5c3)));ufo.add(new THREE.Mesh(new THREE.SphereGeometry(1.15,12,8),mat(0x39d9ed)));ufo.scale.y=.35;ufo.position.set(0,13,-42);expresswaySet.add(ufo);
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
function spawnExpresswayHazard(){
 const wave=++expresswayWave,kind=['sportsCar','bike','bus','protest','laser','sportsCar','bike'][wave%7],lane=(wave%2?1:-1)*1.55;
 const g=new THREE.Group();
 if(kind==='sportsCar'){try{g.add(expresswayVehicle('sportsCar'));}catch(error){console.warn('Sports car PBR fallback',error);g.add(cube(1.8,.48,3.4,mat(0xf23b69),0,.6,0));g.add(cube(1.4,.45,1.4,M.glass,0,1.05,-.2));for(const xx of [-.82,.82])for(const zz of [-1.05,1.05])g.add(ball(.35,M.wheel,xx,.34,zz));}}
 else if(kind==='bike'){g.add(cube(.55,.55,1.65,M.blue,0,.85,0));for(const zz of [-.68,.68])g.add(ball(.4,M.wheel,0,.4,zz));g.add(ball(.3,M.skin,0,1.85,0));}
 else if(kind==='bus'){try{g.add(expresswayVehicle('bus'));}catch(error){console.warn('Bus PBR fallback',error);g.add(cube(2.05,2.5,4.4,mat(0xf5a33b),0,1.55,0));g.add(cube(1.85,.9,.09,M.glass,0,2.1,2.23));}}
 else if(kind==='protest'){g.add(cube(.85,1.2,.5,M.pink,0,1.1,0));g.add(ball(.34,M.skin,0,1.92,0));g.add(cube(1.3,.65,.12,M.white,0,2.8,0));}
 else {g.add(cube(1.2,.08,7,laserMat,0,.23,0));g.add(cube(.16,9,.16,laserMat,0,4.5,0));}
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
function update(dt,t){if(!active||paused)return;speed+=dt*(3+Math.sqrt(Math.max(0,speed-60))*.16);meters+=dt*speed/3.6;const nextDistrict=Math.floor(meters+bonus)>=12000?4:Math.floor(meters+bonus)>=8000?3:Math.floor(meters+bonus)>=3000?2:1;const currentNight=Math.floor(meters/1600)+(meters%1600<800?1:0);if(currentNight>nightCount){nightCount=currentNight;if(nightCount>0){hint.textContent='🌙 NIGHT '+nightCount+' — SPIRITS AWAKEN';if(nightCount%2===0&&grandmaTriggeredNight!==nightCount){makeRoadsideStory('shrine',Math.random()<.5?-1:1,-70);grandmaTriggeredNight=nightCount}}}if(nextDistrict!==districtIndex){applyDistrict(nextDistrict);if(nextDistrict>=3){for(const h of hazards)scene.remove(h.g);hazards.length=0;spawnClock=.5;hint.textContent=nextDistrict===4?'🛣️ EXPRESSWAY! DODGE TRAFFIC AND UFO LASERS!':'🌞 JJ MARKET · TWO NARROW LANES!';}}const onRamaII=nextDistrict===2;const inMarket=nextDistrict===3;const onExpressway=nextDistrict===4;expresswaySet.visible=onExpressway;expresswayArt.group.visible=onExpressway;if(onExpressway)expresswayArt.update(dt,speed);if(onExpressway){ufo.position.x=Math.sin(t*.0012)*2.4;ufo.position.y=13+Math.sin(t*.002)*.8;ufo.rotation.y+=dt*.4;}if(inMarket&&meters+bonus>=10000&&meters+bonus-speed*dt/3.6<10000)hint.textContent='🚣 FLOATING MARKET RIGHT · DO NOT FALL INTO CANAL!';road.material=onRamaII||inMarket||onExpressway?dryAsphalt:wetAsphalt;road.scale.x+=((inMarket?.65:1)-road.scale.x)*Math.min(1,dt*3);for(const p of props)p.visible=!onRamaII&&!inMarket&&!onExpressway;for(const p of neonReflections)p.visible=!onRamaII&&!inMarket&&!onExpressway;for(const p of ramaStructures)p.visible=onRamaII;const canalVisible=inMarket&&meters+bonus>=9700;const canalActive=inMarket&&meters+bonus>=10000;canalGroup.visible=canalVisible;if(canalVisible)canalRippleTexture.offset.y=(t*.000025)%1;if(canalVisible){for(const boat of canalBoats){const phase=boat.userData.phase;boat.position.z=boat.userData.homeZ+((meters*.12+phase*3)%210);boat.position.y=-.02+Math.sin(t*.0017+phase)*.065;boat.rotation.z=Math.sin(t*.0011+phase)*.045;boat.userData.parasol.rotation.z=Math.sin(t*.0014+phase)*.035;for(let j=0;j<2;j++){const wake=boat.userData.wakes[j];wake.scale.z=.82+.18*Math.sin(t*.004+phase+j);wake.position.z=-1.95-.16*Math.sin(t*.0027+phase+j);}}}for(const stall of marketStalls)stall.visible=inMarket&&(!canalActive||stall.children[0].position.x<0);for(const tent of marketCanopies)tent.visible=inMarket&&!canalActive;for(const bump of marketBumps)bump.visible=inMarket;for(const mesh of marketCrowdMeshes)mesh.visible=inMarket;for(const shop of roadsideShops)shop.g.visible=!inMarket&&!onExpressway&&shop.stage===(onRamaII?2:1);const skyTarget=onExpressway?districtSkies[1]:inMarket?districtSkies[0]:districtSkies[nextDistrict];scene.background.lerp(skyTarget,Math.min(1,dt*.8));scene.fog.color.copy(scene.background);sun.intensity+=( (nextDistrict===1?.9:1.65)-sun.intensity)*Math.min(1,dt*1.2);const control=hasMotion?tilt:0;const steer=control===0?0:Math.sign(control)*Math.pow(Math.abs(control),.82);const desiredX=THREE.MathUtils.clamp(steer*4.1,-4.1,4.1);const oldX=x;x+=(desiredX-x)*(1-Math.exp(-dt*5.1));x=THREE.MathUtils.clamp(x,-4.3,4.3);if(canalActive&&x>2.85){hint.textContent='💦 FALLEN INTO THE FLOATING MARKET CANAL!';shake=1;finish();return;}smoothed+=(THREE.MathUtils.clamp((x-oldX)/Math.max(dt,.001)/5,-1,1)-smoothed)*(1-Math.exp(-dt*9));car.position.set(x,0,3);car.rotation.z=-smoothed*.10+Math.sin(t*.01)*.015+Math.sin(flips)*Math.exp(-flips*.45)*.85;car.rotation.x=Math.sin(flips*.8)*Math.exp(-flips*.45)*.65;car.position.y=Math.abs(Math.sin(flips*1.2))*Math.exp(-flips*.32)*.6;flips=Math.max(0,flips-dt*3);const visualSpeed=60+300*(1-Math.exp(-(speed-60)/240));const advance=dt*visualSpeed*.22;stripes.forEach(s=>{s.position.z+=advance;if(s.position.z>16)s.position.z-=230});roadStuds.forEach(s=>{s.position.z+=advance;if(s.position.z>16)s.position.z-=228});props.forEach(p=>{p.position.z+=advance;if(p.position.z>22)p.position.z-=198});if(!onRamaII)for(const p of neonReflections){const anchor=p.userData.signAnchor;if(anchor){p.position.z=anchor.position.z+1.3;p.position.x=anchor.position.x*.84;}else{p.position.z+=advance;if(p.position.z>22)p.position.z-=198;}}if(onRamaII)for(const p of ramaStructures){p.position.z+=advance;if(p.position.z>45)p.position.z-=198;}for(const stall of marketStalls)if(inMarket){stall.position.z+=advance;if(stall.position.z>25)stall.position.z-=192;}if(inMarket)updateMarketCrowd(t,canalActive);for(const tent of marketCanopies)if(inMarket){tent.position.z+=advance;if(tent.position.z>25)tent.position.z-=192;}for(const bump of marketBumps)if(inMarket){bump.position.z+=advance;if(bump.position.z>20)bump.position.z-=180;}for(const shop of roadsideShops)if(shop.stage===nextDistrict){shop.g.position.z+=advance;if(shop.g.position.z>25)shop.g.position.z-=205;}for(let i=storyProps.length-1;i>=0;i--){const p=storyProps[i];p.g.position.z+=advance;if(p.kind==='vendor'&&!p.triggered&&p.g.position.z>-48){p.triggered=true;p.dropTime=.8;hint.textContent='🌰 WATCH OUT! DURIAN FALLING!'}if(p.kind==='vendor'&&p.dropTime>0){p.dropTime=Math.max(0,p.dropTime-dt);const f=1-p.dropTime/.8;if(p.g.userData.vendorArm)p.g.userData.vendorArm.rotation.z=-Math.sin(f*Math.PI)*1.15;if(p.g.userData.vendorFruit){p.g.userData.vendorFruit.position.x=-.35+p.side*-f*1.1;p.g.userData.vendorFruit.position.y=1.65-f*1.25;p.g.userData.vendorFruit.rotation.z+=dt*8;if(p.dropTime===0)p.g.userData.vendorFruit.visible=false}}if(p.kind==='shrine'&&!p.triggered&&p.g.position.z>0){p.triggered=true;if(grandmaChase)scene.remove(grandmaChase.g);const g=makeGrandma();g.position.set(p.side*4.65,0,-14);scene.add(g);grandmaChase={g,side:p.side,time:5,elapsed:0,stepSound:0};hint.textContent='👵 GRANDMA SPEED! RUN!';sound(750,.22,'sawtooth')}if(p.g.position.z>22){scene.remove(p.g);storyProps.splice(i,1)}}if(grandmaChase){const q=grandmaChase;q.time-=dt;q.elapsed+=dt;q.stepSound-=dt;const rush=THREE.MathUtils.smoothstep(q.elapsed,0,1.1);q.g.position.z=THREE.MathUtils.lerp(-14,2.1,rush);q.g.position.x=x+q.side*(3.8-rush*.95)+Math.sin(t*.024)*.08;q.g.position.y=Math.abs(Math.sin(q.elapsed*22))*.22;q.g.rotation.y=q.side*(.2+Math.sin(q.elapsed*3)*.12);const stride=Math.sin(q.elapsed*22)*.7;for(let i=0;i<2;i++){const arm=q.g.userData.runArms?.[i],leg=q.g.userData.runLegs?.[i];if(arm)arm.rotation.x=(i===0?1:-1)*stride;if(leg)leg.rotation.x=(i===0?-1:1)*stride}if(q.stepSound<=0&&q.elapsed>1&&q.elapsed<3.5){sound(95,.055,'triangle');q.stepSound=.3}if(q.time<=0){scene.remove(q.g);grandmaChase=null}}spawnClock-=dt;if(spawnClock<=0){if(hazards.length<(inMarket?9:onExpressway?7:4))spawn();spawnClock=bossSpawned&&!bossBeaten&&hazards.some(h=>h.boss)?2.6:Math.max(.72,1.95-visualSpeed/230)}for(const h of hazards){h.g.position.z+=advance;if(!h.announced&&h.g.position.z>-47){h.announced=true;if(h.type==='laser')hint.textContent='🛸 UFO LASER! DODGE THE RED BEAM!';else if(h.type==='sportsCar')hint.textContent='🏎️ SPORTS CAR AHEAD!';else if(h.type==='protest')hint.textContent='📢 EXPRESSWAY PROTEST!';else if(h.type==='dog')hint.textContent='🐕 CANAL-SIDE DOG CHARGING! TILT LEFT!';else if(h.type==='police')hint.textContent='👮 POLICE AHEAD!';else if(h.type==='fruitCart')hint.textContent='🍉 JJ MARKET · FRUIT CART AHEAD!';else if(h.type==='pedestrian')hint.textContent='🚶 JJ MARKET · WATCH FOR SHOPPERS!';else hint.textContent=h.boss?'👹 BOSS YAKSHA! WATCH HIS MOVE!':h.madness?({rollingDurian:'🌰 DURIAN ROLLING ACROSS!',cuttingBus:'🚌 BUS CUTTING ACROSS!',wrongWayBike:'🏍️ WRONG-WAY BIKE!'})[h.madness]:({bus:'🚌 RED BUS AHEAD!',busBlue:'🚌 ROUTE 8 BLUE BUS!',taxi:'🚕 TAXI CUTTING IN!',bike:'🏍️ MOTORBIKE!',dancer:'👻 HAUNTED THAI DANCER!',construction:'🚧 RAMA II — FALLING CONCRETE!',yaksha:'👹 GIANT YAKSHA AHEAD!',durian:'🌰 GIANT DURIAN!'})[h.type]}if(h.type==='dog'){const charge=THREE.MathUtils.smoothstep(h.g.position.z,-36,-7);
 h.g.position.x=THREE.MathUtils.lerp(h.baseX,Math.max(.5,x),charge*.62);
 const stride=t*.022+h.phase;
 h.g.position.y=Math.abs(Math.sin(stride))*.085*(.4+charge*.6);
 h.g.rotation.z=Math.sin(stride)*.09;
 const legs=h.g.userData.runningLegs;
 if(legs)for(let k=0;k<legs.length;k++)legs[k].rotation.x=Math.sin(stride+(k===0||k===3?0:Math.PI))*.55;
 if(h.g.userData.runningTail)h.g.userData.runningTail.rotation.y=Math.sin(stride*.65)*.35;
}if(h.type==='police'){h.g.position.x=THREE.MathUtils.clamp(h.baseX+Math.sin(t*.0014+h.phase)*.55,-2.9,2.9);}if(h.type==='pedestrian'){h.g.position.x=THREE.MathUtils.clamp(h.baseX+Math.sin(t*.0011+h.phase)*.45,-3.1,3.1);h.g.rotation.z=Math.sin(t*.006+h.phase)*.07;}if(h.type==='construction'){const fall=THREE.MathUtils.smoothstep(h.g.position.z,-48,-20);h.g.position.y=6*(1-fall);h.g.rotation.z=(1-fall)*.18;}if(h.type==='durian'){h.g.rotation.z+=dt*(h.madness?7:3);if(h.g.position.z>-48){const f=THREE.MathUtils.smoothstep(h.g.position.z,-48,-5);h.g.position.x=THREE.MathUtils.lerp(h.baseX,h.durianSide?-h.durianSide*.9:-h.baseX*.85,f)}}if(h.type==='dancer'){h.g.rotation.y=Math.sin(t*.0016+h.phase)*.24;h.g.position.x=h.baseX+Math.sin(t*.0013+h.phase)*.32;h.g.position.y=.17+Math.sin(t*.0027+h.phase)*.16;if(h.g.userData.danceArms?.[0]?.rotation&&h.g.userData.danceArms?.[1]?.rotation){h.g.userData.danceArms[0].rotation.z=Math.sin(t*.003+h.phase)*.45;h.g.userData.danceArms[1].rotation.z=-Math.sin(t*.003+h.phase)*.45}}if((h.type==='bus'||h.type==='busBlue')&&h.g.position.z<0){const p=THREE.MathUtils.smoothstep(h.g.position.z,-38,-13);h.g.position.x=THREE.MathUtils.clamp(h.baseX+Math.sin(t*.001+h.phase)*.18+(h.swerve?p*h.swerve*(h.madness==='cuttingBus'?2.15:.8):0),-4.2,4.2);h.g.rotation.y=-h.swerve*Math.sin(p*Math.PI)*.09;}if((h.type==='taxi'||h.type==='bike')&&!h.madness&&h.g.position.z>h.swerveStart){const f=THREE.MathUtils.smoothstep(h.g.position.z,h.swerveStart,h.swerveStart+20);h.g.position.x=THREE.MathUtils.clamp(h.baseX+h.swerve*f*(h.type==='bike'?1.65:2.1),-4.2,4.2);h.g.rotation.y=-h.swerve*Math.sin(f*Math.PI)*.18}if(h.madness==='wrongWayBike'){h.g.rotation.y=Math.PI+Math.sin(t*.004+h.phase)*.08;h.g.position.z+=advance*.45}if(h.type==='yaksha'){h.g.rotation.y=Math.sin(t*.002+h.phase)*.35;if(h.boss&&h.g.position.z>-34){const f=THREE.MathUtils.smoothstep(h.g.position.z,-34,-8);h.g.position.x=Math.sin(f*Math.PI*1.1)*2.25;}}if(!h.passed&&h.g.position.z>4){h.passed=true;const dx=Math.abs(h.g.position.x-x);const collisionRadius=h.type==='dog'?.95:h.type==='police'?.8:h.type==='pedestrian'?.75:h.type==='laser'?.8:h.type==='protest'?.9:h.type==='bike'?1.05:h.type==='taxi'||h.type==='sportsCar'?1.55:1.8;if(h.boss&&!bossBeaten){bossBeaten=true;if(dx>=collisionRadius){bonus+=750;hint.textContent='🏆 YAKSHA BOSS CLEARED +750';sound(920,.3,'sine')}else{hint.textContent='👹 YAKSHA HIT! NO BOSS BONUS'}}if(dx<collisionRadius&&!h.hit&&inv<=0){if(h.type==='dog'&&canalActive){x=Math.min(4.3,x+.85);hint.textContent='🐕 DOG PUSH! STEER LEFT OR FALL IN!';if(x>2.85){shake=1;finish();return;}}h.hit=true;crashes++;combo=0;comboTime=0;inv=1.5;flips=5;shake=.55;sound(120,.28,'sawtooth');/* Broken brakes: collisions damage the tuk-tuk but never slow it down. */hint.textContent=h.type==='dog'&&canalActive?'🐕 DOG SHOVE! TILT LEFT — CANAL!':'💥 '+h.type.toUpperCase()+' ATTACK!';if(navigator.vibrate)navigator.vibrate(80);if(crashes>=3){finish();break}}else if(dx>=collisionRadius&&dx<collisionRadius+1.1&&inv<=0){misses++;combo=comboTime>0?Math.min(combo+1,5):1;comboTime=5;const reward=combo*50;bonus+=reward;sound(600+combo*120,.1,'sine');hint.textContent='🔥 NEAR MISS ×'+combo+'  +'+reward}}}for(let i=hazards.length-1;i>=0;i--)if(hazards[i].g.position.z>20){scene.remove(hazards[i].g);hazards.splice(i,1)}if(challengeStage===0&&meters>=500){challengeStage=1;bonus+=250;hint.textContent='🏆 500m SURVIVED +250';sound(760,.22,'sine')}if(challengeStage===1&&misses>=3){challengeStage=2;bonus+=400;hint.textContent='🏆 3 NEAR MISSES +400';sound(850,.24,'sine')}if(!missionDone&&meters>=1000){missionDone=true;bonus+=500;hint.textContent='🏆 1000m MISSION +500';sound(900,.32,'sine')}shake=Math.max(0,shake-dt);inv=Math.max(0,inv-dt);comboTime=Math.max(0,comboTime-dt);if(comboTime===0)combo=0;car.visible=false;const missionText=challengeStage===0?'🎯 SURVIVE '+Math.max(0,500-Math.floor(meters))+'m · +250':challengeStage===1?'🎯 NEAR MISSES '+Math.min(misses,3)+'/3 · +400':'🏆 CHALLENGES COMPLETE';if(challengeDisplay!==missionText){challengeDisplay=missionText;challenge.textContent=missionText}if(t-lastHudUpdate>110){lastHudUpdate=t;hud.textContent=Math.floor(meters+bonus)+' PTS'+(comboTime>0?'  🔥×'+combo:'');status.innerHTML=Math.floor(speed)+' KM/H<br>'+'❤️'.repeat(Math.max(0,3-crashes));}}
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
addEventListener('deviceorientation',e=>{if(Number.isFinite(e.gamma)){hasMotion=true;lastGamma=e.gamma;if(neutral===null)neutral=e.gamma;let difference=e.gamma-neutral;if(difference>180)difference-=360;if(difference< -180)difference+=360;const deadzone=3;const amount=Math.max(0,Math.abs(difference)-deadzone);const raw=THREE.MathUtils.clamp(Math.sign(difference)*amount/27,-1,1);tilt+=(raw-tilt)*.24}});
$('centerBtn').onclick=()=>{if(lastGamma===null){hint.textContent='⚠️ MOTION SENSOR NOT READY';return}neutral=lastGamma;tilt=0;hint.textContent='🎯 CENTERED · TILT GENTLY'};$('pauseBtn').onclick=()=>{if(!active)return;paused=!paused;$('pauseBtn').textContent=paused?'▶':'⏸';hint.textContent=paused?'⏸ PAUSED · TAP ▶ TO RESUME':'🛺 GO!';last=performance.now()};$('soundBtn').onclick=()=>{soundOn=!soundOn;$('soundBtn').textContent=soundOn?'🔊':'🔇'};document.addEventListener('visibilitychange',()=>{if(document.hidden&&active&&!paused){paused=true;$('pauseBtn').textContent='▶';hint.textContent='⏸ PAUSED · TAP ▶ TO RESUME'}});$('start').onclick=async()=>{reset();try{if(window.DeviceOrientationEvent&&typeof DeviceOrientationEvent.requestPermission==='function'){const permission=await DeviceOrientationEvent.requestPermission();if(permission!=='granted')hint.textContent='⚠️ MOTION OFF · ALLOW ACCESS IN SAFARI'}}catch(e){hint.textContent='⚠️ MOTION OFF · CHECK SAFARI PERMISSIONS'}};
