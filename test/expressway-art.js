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
 const lamps=[];
 for(let i=0;i<16;i++){
  const side=i%2===0?-1:1,lamp=new THREE.Group();
  lamp.add(box(.14,6.1,.14,steel,0,3.05,0));
  lamp.add(box(1.35,.11,.16,steel,-side*.61,6.05,0));
  lamp.add(box(.8,.08,.22,warm,-side*1.03,5.97,0));
  lamp.position.set(side*5.9,0,-7-Math.floor(i/2)*21);
  group.add(lamp);lamps.push(lamp);
 }
 const signCanvas=document.createElement('canvas');signCanvas.width=512;signCanvas.height=160;
 const sc=signCanvas.getContext('2d');sc.fillStyle='#175646';sc.fillRect(0,0,512,160);
 sc.strokeStyle='#d4e5d7';sc.lineWidth=7;sc.strokeRect(7,7,498,146);
 sc.fillStyle='#fff';sc.textAlign='center';sc.font='bold 34px sans-serif';
 sc.fillText('ทางด่วน  /  EXPRESSWAY',256,65);
 sc.font='bold 25px sans-serif';sc.fillText('บางนา  /  BANG NA   ↑',256,112);
 const signTexture=new THREE.CanvasTexture(signCanvas);signTexture.colorSpace=THREE.SRGBColorSpace;
 const gantry=new THREE.Group();
 for(const side of [-1,1])gantry.add(box(.19,7,.19,steel,side*4.7,3.5,0));
 gantry.add(box(9.5,.18,.2,steel,0,7,0));
 const sign=new THREE.Mesh(new THREE.PlaneGeometry(6.8,2.13),new THREE.MeshBasicMaterial({map:signTexture,side:THREE.DoubleSide}));
 sign.position.set(0,5.7,.12);gantry.add(sign);gantry.position.z=-75;group.add(gantry);
 group.visible=false;
 return {group,update(dt,speed){
  const advance=dt*Math.min(95,30+speed*.12);
  for(const lamp of lamps){lamp.position.z+=advance;if(lamp.position.z>18)lamp.position.z-=168;}
  gantry.position.z+=advance;if(gantry.position.z>24)gantry.position.z-=195;
 },dispose(){
  group.traverse(obj=>{if(obj.geometry)obj.geometry.dispose();});
  for(const material of [towerMat,steel,warm,sign.material])material.dispose();
  windowTexture.dispose();signTexture.dispose();
 }};
}
