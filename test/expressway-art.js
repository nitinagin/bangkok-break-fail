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
  ctx.fillStyle=lit?'rgba(255,238,199,.18)':'rgba(179,208,222,.10)';
  ctx.fillRect(x+2,y+1,2,8);
  ctx.fillStyle='rgba(5,13,21,.38)';ctx.fillRect(x+10,y+1,1,8);
  ctx.fillStyle='rgba(13,22,30,.53)';ctx.fillRect(x-2,y+11,26,2);
  if((row*7+col*11)%17===0){
   ctx.fillStyle='#65747b';ctx.fillRect(x+3,y+10,13,4);
   ctx.fillStyle='#29343c';for(let g=0;g<4;g++)ctx.fillRect(x+5+g*3,y+11,1,2);
  }
 }
 for(let floor=0;floor<32;floor+=8){
  ctx.fillStyle='rgba(13,22,31,.65)';ctx.fillRect(0,8+floor*15,256,4);
  ctx.fillStyle='rgba(179,191,195,.15)';ctx.fillRect(0,12+floor*15,256,1);
 }
 const windowTexture=new THREE.CanvasTexture(windowCanvas);windowTexture.colorSpace=THREE.SRGBColorSpace;
 const towerMat=new THREE.MeshStandardMaterial({map:windowTexture,roughness:.83,metalness:.13,emissive:0x8e7656,emissiveMap:windowTexture,emissiveIntensity:.13});
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
  towers.setColorAt(i,new THREE.Color(facadeTints[i%facadeTints.length]));
  if(i%3===0)rooftopMasts.push({x:dummy.position.x+dummy.scale.x*.12,y:height-2,z:dummy.position.z,height:1.2+(i%4)*.45});
 }
 towers.instanceMatrix.needsUpdate=true;
 if(towers.instanceColor)towers.instanceColor.needsUpdate=true;
 towers.frustumCulled=false;group.add(towers);
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
 const steel=new THREE.MeshStandardMaterial({color:0x69717a,roughness:.55,metalness:.65});
 const warm=new THREE.MeshBasicMaterial({color:0xffe6ac});
 const box=(w,h,d,mat,x,y,z)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);mesh.position.set(x,y,z);return mesh;};
 // Three instanced parts replace 48 individual lamp meshes on mobile.
 const lampCount=16,lampPositions=[];
 const lampPoles=new THREE.InstancedMesh(new THREE.BoxGeometry(.14,6.1,.14),steel,lampCount);
 const lampArms=new THREE.InstancedMesh(new THREE.BoxGeometry(1.35,.11,.16),steel,lampCount);
 const lampHeads=new THREE.InstancedMesh(new THREE.BoxGeometry(.8,.08,.22),warm,lampCount);
 const lampDummy=new THREE.Object3D();
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
  }
  lampPoles.instanceMatrix.needsUpdate=true;
  lampArms.instanceMatrix.needsUpdate=true;
  lampHeads.instanceMatrix.needsUpdate=true;
 }
 placeLamps();group.add(lampPoles,lampArms,lampHeads);
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
 const flyoverTexture=new THREE.CanvasTexture(flyoverCanvas);
 flyoverTexture.colorSpace=THREE.SRGBColorSpace;
 const flyoverConcrete=new THREE.MeshStandardMaterial({color:0xd1d2cd,map:flyoverTexture,roughness:.93,metalness:0});
 const flyoverZ=[-38,-98,-158];
 const flyoverPiers=new THREE.InstancedMesh(new THREE.BoxGeometry(.88,7.8,1.08),flyoverConcrete,6);
 const flyoverDecks=new THREE.InstancedMesh(new THREE.BoxGeometry(15.9,.75,2.6),flyoverConcrete,3);
 const flyoverParapets=new THREE.InstancedMesh(new THREE.BoxGeometry(15.9,.62,.18),flyoverConcrete,6);
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
   }
  }
  flyoverPiers.instanceMatrix.needsUpdate=true;
  flyoverDecks.instanceMatrix.needsUpdate=true;
  flyoverParapets.instanceMatrix.needsUpdate=true;
 }
 placeFlyovers();group.add(flyoverPiers,flyoverDecks,flyoverParapets);
 // Two reflective bilingual destination panels, one per lane.
 const signCanvas=document.createElement('canvas');signCanvas.width=512;signCanvas.height=160;
 const sc=signCanvas.getContext('2d');sc.fillStyle='#15513e';sc.fillRect(0,0,512,160);
 sc.strokeStyle='#e3eee5';sc.lineWidth=6;sc.strokeRect(7,7,498,146);
 sc.lineWidth=3;sc.beginPath();sc.moveTo(256,12);sc.lineTo(256,148);sc.stroke();
 sc.fillStyle='#f7faf7';sc.textAlign='center';
 for(const [x,thai,english] of [[132,'บางนา','BANG NA'],[380,'ดินแดง','DIN DAENG']]){
  sc.font='bold 30px sans-serif';sc.fillText(thai,x,48);
  sc.font='bold 22px sans-serif';sc.fillText(english,x,80);
  sc.font='bold 42px sans-serif';sc.fillText('↑',x,135);
 }
 const signTexture=new THREE.CanvasTexture(signCanvas);signTexture.colorSpace=THREE.SRGBColorSpace;
 const gantry=new THREE.Group();
 for(const side of [-1,1])gantry.add(box(.19,7,.19,steel,side*4.7,3.5,0));
 gantry.add(box(9.5,.18,.2,steel,0,7,0));
 const sign=new THREE.Mesh(new THREE.PlaneGeometry(6.8,2.13),new THREE.MeshBasicMaterial({map:signTexture,side:THREE.DoubleSide}));
 sign.position.set(0,5.7,.12);gantry.add(sign);gantry.position.z=-75;group.add(gantry);
 // Concrete Jersey shoulder barriers: 44 instances, two batched draw calls.
 const barrierCount=44,barrierLength=4.4;
 const concrete=new THREE.MeshStandardMaterial({color:0x9ca2a7,roughness:.94,metalness:0});
 const reflective=new THREE.MeshBasicMaterial({color:0xf4cb60});
 const profile=new THREE.Shape();
 profile.moveTo(-.42,0);profile.lineTo(.42,0);profile.lineTo(.42,.22);
 profile.lineTo(.24,1.04);profile.lineTo(-.24,1.04);profile.lineTo(-.42,.22);profile.closePath();
 const barrierGeometry=new THREE.ExtrudeGeometry(profile,{depth:barrierLength,bevelEnabled:false});
 const barriers=new THREE.InstancedMesh(barrierGeometry,concrete,barrierCount);
 const reflectorGeometry=new THREE.BoxGeometry(.48,.13,.2);
 const reflectors=new THREE.InstancedMesh(reflectorGeometry,reflective,barrierCount);
 const barrierDummy=new THREE.Object3D(),barrierZ=[];
 for(let i=0;i<barrierCount;i++)barrierZ.push(-5-Math.floor(i/2)*barrierLength*1.15);
 function placeBarriers(){
  for(let i=0;i<barrierCount;i++){
   const side=i%2===0?-1:1,z=barrierZ[i];
   barrierDummy.position.set(side*4.85,0,z);barrierDummy.rotation.set(0,0,0);barrierDummy.scale.set(1,1,1);
   barrierDummy.updateMatrix();barriers.setMatrixAt(i,barrierDummy.matrix);
   barrierDummy.position.set(side*4.55,.78,z+barrierLength*.5);
   barrierDummy.updateMatrix();reflectors.setMatrixAt(i,barrierDummy.matrix);
  }
  barriers.instanceMatrix.needsUpdate=true;reflectors.instanceMatrix.needsUpdate=true;
 }
 placeBarriers();group.add(barriers,reflectors);
 group.visible=false;
 return {group,update(dt,speed){
  const advance=dt*Math.min(95,30+speed*.12);
  for(const lamp of lampPositions){lamp.z+=advance;if(lamp.z>18)lamp.z-=168;}placeLamps();
  for(let i=0;i<flyoverZ.length;i++){flyoverZ[i]+=advance;if(flyoverZ[i]>26)flyoverZ[i]-=180;}placeFlyovers();
  gantry.position.z+=advance;if(gantry.position.z>24)gantry.position.z-=195;
  for(let i=0;i<barrierCount;i++){barrierZ[i]+=advance;if(barrierZ[i]>20)barrierZ[i]-=22*barrierLength*1.15;}placeBarriers();
 },dispose(){
  group.traverse(obj=>{if(obj.geometry)obj.geometry.dispose();});
  for(const material of [towerMat,mastMaterial,steel,warm,sign.material,concrete,reflective,flyoverConcrete])material.dispose();
  windowTexture.dispose();signTexture.dispose();flyoverTexture.dispose();
 }};
}
