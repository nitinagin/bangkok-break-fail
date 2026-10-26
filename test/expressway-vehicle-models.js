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
 const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=2;
 return new THREE.MeshStandardMaterial({map,metalness:.18,roughness:.29});
}
// A real bilingual route panel replaces an existing blank window: zero extra meshes.
function makeBusDestination(THREE){
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;
 const ctx=canvas.getContext('2d');
 ctx.fillStyle='#08161c';ctx.fillRect(0,0,512,128);
 ctx.fillStyle='#e0a74e';ctx.fillRect(0,0,512,5);ctx.fillRect(0,123,512,5);
 ctx.fillStyle='#f9d582';ctx.font='bold 106px sans-serif';ctx.textBaseline='middle';ctx.fillText('8',20,65);
 ctx.fillStyle='#ffe8a4';ctx.font='bold 54px sans-serif';ctx.fillText('กรุงเทพฯ',142,56);
 ctx.fillStyle='#cbd8c7';ctx.font='bold 25px sans-serif';ctx.fillText('BANGKOK',153,100);
 const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=2;
 return new THREE.MeshBasicMaterial({map,toneMapped:false});
}
export function makeExpresswayVehicle(THREE,type='sportsCar'){
 const isBus=type==='bus',group=new THREE.Group(),w=isBus?2.05:1.8,length=isBus?4.45:3.55;
 const paint=isBus?new THREE.MeshStandardMaterial({color:0xf0e6d4,metalness:.15,roughness:.65}):new THREE.MeshPhysicalMaterial({color:0xb12438,metalness:.62,roughness:.26,clearcoat:.75,clearcoatRoughness:.22});
 const glass=new THREE.MeshStandardMaterial({color:0x173542,metalness:.2,roughness:.16});
 const rubber=new THREE.MeshStandardMaterial({color:0x171a1c,roughness:.96});
 const stripe=new THREE.MeshStandardMaterial({color:0xc72b35,roughness:.55});
 const lamps=new THREE.MeshBasicMaterial({color:0xffedc1});
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
  box(0,2.16,2.25,1.8,.83,.05,busGlazing);
  box(0,2.7,2.29,1.48,.23,.025,destination);
  for(const side of [-1,1])for(let n=0;n<4;n++)box(side*1.05,2.17,-1.44+n*.96,.05,.65,.76,busGlazing);
 }else{
  // Dark transparent glazing reveals a seated driver instead of an empty car.
  const windshield=new THREE.MeshStandardMaterial({color:0x244451,metalness:.05,roughness:.16,transparent:true,opacity:.34,depthWrite:false,side:THREE.DoubleSide});
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
  box(0,1.28,.43,1.4,.035,.63,windshield);
  box(0,1.28,-.65,1.4,.035,.43,windshield);

  // Sports-car grille, splitter, rear wing, supports and side ducts:
  // seven carbon-finish pieces in one instanced draw call, no texture upload.
  const carbon=new THREE.MeshStandardMaterial({color:0x111820,metalness:.24,roughness:.54});
  const aero=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),carbon,7);
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
  aero.instanceMatrix.needsUpdate=true;
  group.add(aero);
  // Two LED running lights share one draw call; no dynamic lighting.
  const led=new THREE.InstancedMesh(new THREE.BoxGeometry(.45,.045,.04),
   new THREE.MeshBasicMaterial({color:0xccefff,toneMapped:false}),2);
  for(let i=0;i<2;i++){
   aeroMatrix.makeTranslation((i?1:-1)*.57,.76,1.785);
   led.setMatrixAt(i,aeroMatrix);
  }
  led.instanceMatrix.needsUpdate=true;
  group.add(led);
 }
 const tailLamps=new THREE.MeshStandardMaterial({color:0xff3028,emissive:0xee1308,emissiveIntensity:.9,roughness:.28});
 // Instanced tires and machined hubs add exterior detail without extra wheel draw calls.
 const tireGeo=new THREE.CylinderGeometry(isBus?.43:.37,isBus?.43:.37,.18,12);tireGeo.rotateZ(Math.PI/2);
 const hubGeo=new THREE.CylinderGeometry(isBus?.26:.22,isBus?.26:.22,.025,12);hubGeo.rotateZ(Math.PI/2);
 const hubMetal=new THREE.MeshStandardMaterial({color:0x9da9b1,metalness:.8,roughness:.3});
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
  box(side*w*.37,.8,length/2+.04,.27,.14,.06,lamps);
  box(side*w*.37,.8,-length/2-.04,.27,.14,.06,tailLamps);
 }
 group.add(tires,hubs,mirrorBodies,mirrorFaces);
 group.userData.type=type;
 return group;
}
