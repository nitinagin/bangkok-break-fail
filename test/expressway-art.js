// Bangkok Break Fail / expressway visual asset module.
// Optional scene extension: const art=createExpresswayArt(THREE); scene.add(art.group);
// In the main update loop: art.group.visible=onExpressway; if(onExpressway)art.update(dt,speed).
// Keeps one draw call for 24 skyline towers; no realtime shadow maps or network assets.
export function createExpresswayArt(THREE){
 const group=new THREE.Group();group.name='BangkokExpresswayNight';
 const windowCanvas=document.createElement('canvas');windowCanvas.width=128;windowCanvas.height=256;
 const ctx=windowCanvas.getContext('2d');
 ctx.fillStyle='#202b3a';ctx.fillRect(0,0,128,256);
 for(let row=0;row<22;row++)for(let col=0;col<7;col++){
  const lit=(row*19+col*31+row*col*7)%11<4;
  ctx.fillStyle=lit?((row+col)%3===0?'#f7d19b':'#9cbac7'):'#344558';
  ctx.fillRect(8+col*17,7+row*11,10,6);
 }
 const windowTexture=new THREE.CanvasTexture(windowCanvas);windowTexture.colorSpace=THREE.SRGBColorSpace;
 const towerMat=new THREE.MeshStandardMaterial({map:windowTexture,roughness:.83,metalness:.13,emissive:0x8e7656,emissiveMap:windowTexture,emissiveIntensity:.13});
 const towers=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),towerMat,24);
 const dummy=new THREE.Object3D();
 for(let i=0;i<24;i++){
  const side=i%2===0?-1:1,row=Math.floor(i/2),height=10+(i*13%19);
  dummy.position.set(side*(12+(i*7%17)),height*.5-2,-15-row*9);
  dummy.scale.set(4+(i*5%7),height,5+(i*3%7));
  dummy.updateMatrix();towers.setMatrixAt(i,dummy.matrix);
 }
 towers.instanceMatrix.needsUpdate=true;towers.frustumCulled=false;group.add(towers);
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
  gantry.position.z+=advance;if(gantry.position.z>24)gantry.position.z-=195;
  for(let i=0;i<barrierCount;i++){barrierZ[i]+=advance;if(barrierZ[i]>20)barrierZ[i]-=22*barrierLength*1.15;}placeBarriers();
 },dispose(){
  group.traverse(obj=>{if(obj.geometry)obj.geometry.dispose();});
  for(const material of [towerMat,steel,warm,sign.material,concrete,reflective])material.dispose();
  windowTexture.dispose();signTexture.dispose();
 }};
}
