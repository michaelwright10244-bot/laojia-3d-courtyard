export function createRearAnnex(ctx) {
  const { THREE, materials, box, cylinder, applyShadows, createFacadeOpening, createShedRoof, createSmokeTrail } = ctx;
  const group = new THREE.Group();
  // 从背立面看厨房在右侧凸出；对应模型局部坐标为主屋后侧偏左。
  group.position.set(-5.15, 0.12, -6.8);
  group.add(box(3.85, 2.58, 3.35, materials.smoothWall, 0, 1.29, 0));
  group.add(box(3.96, 0.2, 3.48, materials.concrete, 0, 0.1, 0));
  const roof = createShedRoof(4.15, 3.78, 0.48, 0.16);
  roof.position.set(0, 2.58, 0.03);
  group.add(roof);
  const chimney = cylinder(0.12, 0.14, 0.72, materials.dark, 16);
  chimney.position.set(-1.28, 3.2, -1.04);
  const chimneyCap = box(0.38, 0.07, 0.32, materials.ridge, -1.28, 3.58, -1.04);
  const smoke = createSmokeTrail();
  smoke.position.set(-1.28, 3.62, -1.04);
  group.add(chimney, chimneyCap, smoke);
  const rearWindow = createFacadeOpening(1.32, 1.12, { frameColor: '#1f252c', trimColor: '#7ecfe0' });
  rearWindow.position.set(0, 1.4, -1.74);
  rearWindow.rotation.y = Math.PI;
  group.add(rearWindow);
  const sinkWindow = createFacadeOpening(0.92, 0.86, { frameColor: '#1f252c', trimColor: '#7ecfe0' });
  sinkWindow.rotation.y = Math.PI / 2;
  sinkWindow.position.set(1.96, 1.32, -0.42);
  group.add(sinkWindow);
  const vent = cylinder(0.18, 0.18, 0.08, materials.frame, 22);
  vent.rotation.x = Math.PI / 2;
  vent.position.set(1.99, 2.08, -1.15);
  group.add(vent);
  group.add(box(1.15, 0.78, 0.2, materials.concrete, 0.8, 0.55, -1.86));
  group.add(box(0.36, 0.08, 0.24, materials.frame, 0.55, 0.98, -1.98));
  group.add(box(0.36, 0.08, 0.24, materials.frame, 0.98, 0.98, -1.98));
  return applyShadows(group);
}
