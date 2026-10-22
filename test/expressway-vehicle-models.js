// Bangkok Break Fail: reusable PBR expressway vehicle templates.
// Usage: import {makeExpresswayVehicle} from './expressway-vehicle-models.js';
// Add makeExpresswayVehicle(THREE,'sportsCar') or (THREE,'bus') to a scene.
export function makeExpresswayVehicle(THREE,type='sportsCar'){
 const isBus=type==='bus',group=new THREE.Group(),w=isBus?2.05:1.8,length=isBus?4.45:3.55;
 const paint=new THREE.MeshStandardMaterial({color:isBus?0xf0e6d4:0xb12438,metalness:isBus?.15:.65,roughness:isBus?.65:.3});
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
  box(0,1.07,0,2.07,.25,4.4,stripe);box(0,2.16,2.25,1.8,.83,.05,glass);
  box(0,2.7,2.25,1.48,.23,.06,glass);
  for(const side of [-1,1])for(let n=0;n<4;n++)box(side*1.05,2.17,-1.44+n*.96,.05,.65,.76,glass);
 }else{
  box(0,1.04,.11,1.4,.035,.63,glass);box(0,1.04,-.65,1.4,.035,.43,glass);
 }
 const tireGeo=new THREE.CylinderGeometry(isBus?.43:.37,isBus?.43:.37,.18,12);tireGeo.rotateZ(Math.PI/2);
 for(const side of [-1,1])for(const axle of [-1,1]){
  const wheel=new THREE.Mesh(tireGeo,rubber);wheel.position.set(side*w*.48,.4,axle*(isBus?1.42:1.1));group.add(wheel);
  box(side*w*.37,.8,length/2+.04,.27,.14,.06,lamps);
 }
 group.userData.type=type;
 return group;
}
