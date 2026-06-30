export function createMainHouse(ctx) {
  const { THREE, materials, box, cylinder, applyShadows, createDoorAssembly, createFacadeOpening, createRoof } = ctx;
  const group = new THREE.Group();
  const width = 15.0;
  const depth = 11.2;
  const wallHeight = 4.28;
  const roofRise = 1.66;
  const baseTop = 0.48;
  const lowerFrontZ = depth / 2 + 0.02;
  const upperFrontZ = depth / 2 + 0.68;

  group.add(box(15.3, 0.52, 11.9, materials.concrete, 0, 0.26, 0));
  group.add(box(width, wallHeight, depth, materials.smoothWall, 0, baseTop + wallHeight / 2, 0));
  group.add(box(width - 0.08, 2.95, 0.16, materials.tileWall, 0, baseTop + 1.48, lowerFrontZ));
  group.add(box(width + 0.25, 1.34, 0.68, materials.tileWall, 0, baseTop + 3.56, depth / 2 + 0.34));
  group.add(box(width + 0.36, 0.18, 0.9, materials.trim, 0, baseTop + 2.78, depth / 2 + 0.36));
  group.add(box(width + 0.18, 0.05, 0.08, materials.dark, 0, baseTop + 2.76, depth / 2 - 0.03));
  group.add(box(width - 0.15, 0.05, 0.12, materials.trim, 0, baseTop + 2.95, lowerFrontZ + 0.09));

  const portal = box(2.46, 2.82, 0.24, materials.portal, 0, baseTop + 1.42, lowerFrontZ + 0.06);
  group.add(portal);
  const door = createDoorAssembly();
  door.scale.set(0.92, 0.92, 1);
  door.position.set(0, baseTop + 1.33, lowerFrontZ + 0.16);
  group.add(door);

  [-1.38, 1.38].forEach(x => group.add(box(0.24, 2.15, 0.04, materials.red, x, baseTop + 1.38, lowerFrontZ + 0.26)));
  group.add(box(1.38, 0.28, 0.04, materials.red, 0, baseTop + 2.55, lowerFrontZ + 0.26));
  group.add(box(width + 0.5, 0.16, 0.14, materials.eave, 0, baseTop + 2.66, upperFrontZ + 0.24));

  [-5.05, 0, 5.05].forEach(x => {
    const brace = box(0.14, 0.88, 0.14, materials.trim, x, baseTop + 2.34, lowerFrontZ + 0.16);
    brace.rotation.x = THREE.MathUtils.degToRad(34);
    group.add(brace);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 10), new THREE.MeshStandardMaterial({ color: '#f7f1df', emissive: '#ffbe63', emissiveIntensity: 0.15, roughness: 0.35 }));
    lamp.position.set(x, baseTop + 2.48, depth / 2 + 0.72);
    group.add(lamp);
  });

  [-7.18, 7.18].forEach(x => {
    const downPipe = cylinder(0.035, 0.035, 3.2, materials.pipe, 12);
    downPipe.position.set(x, baseTop + 1.6, lowerFrontZ + 0.19);
    const elbow = cylinder(0.03, 0.03, 0.52, materials.pipe, 12);
    elbow.rotation.z = Math.PI / 2;
    elbow.position.set(x - Math.sign(x) * 0.22, baseTop + 3.18, lowerFrontZ + 0.2);
    group.add(downPipe, elbow);
  });

  group.add(box(2.8, 0.12, 0.92, materials.concrete, 0, 0.06, lowerFrontZ + 0.52));

  const leftWindow = createFacadeOpening(1.85, 1.62);
  leftWindow.position.set(-4.9, baseTop + 1.48, lowerFrontZ + 0.03);
  const rightWindow = createFacadeOpening(1.85, 1.62);
  rightWindow.position.set(4.9, baseTop + 1.48, lowerFrontZ + 0.03);
  group.add(leftWindow, rightWindow);

  [-4.85, 0, 4.85].forEach(x => {
    const upper = createFacadeOpening(1.36, 0.82, { frameColor: '#23272c', trimColor: '#79d5e2' });
    upper.position.set(x, baseTop + 3.55, upperFrontZ + 0.09);
    group.add(upper);
  });

  const backOpenings = [
    { x: -4.55, z: -depth / 2 - 0.02, w: 1.55, h: 1.45 },
    { x: 0.65, z: -depth / 2 - 0.02, w: 1.18, h: 2.05 }
  ];
  backOpenings.forEach((item, index) => {
    const opening = index === 1 ? createDoorAssembly() : createFacadeOpening(item.w, item.h, { frameColor: '#23272c', trimColor: '#7ecfe0' });
    opening.scale.set(index === 1 ? 0.56 : 1, index === 1 ? 0.76 : 1, 1);
    opening.position.set(item.x, baseTop + (index === 1 ? 1.35 : 1.48), item.z);
    opening.rotation.y = Math.PI;
    group.add(opening);
  });

  const gableHeight = roofRise - 0.18;
  const gableHalfSpan = depth / 2 + 0.18;
  const gableShape = new THREE.Shape();
  gableShape.moveTo(-gableHalfSpan, 0);
  gableShape.lineTo(0, gableHeight);
  gableShape.lineTo(gableHalfSpan, 0);
  gableShape.lineTo(-gableHalfSpan, 0);
  const gableGeom = new THREE.ExtrudeGeometry(gableShape, { depth: 0.18, bevelEnabled: false, steps: 1 });
  const leftTriangle = new THREE.Mesh(gableGeom, materials.smoothWall);
  leftTriangle.rotation.y = Math.PI / 2;
  leftTriangle.position.set(-width / 2 - 0.11, baseTop + wallHeight, 0);
  const rightTriangle = leftTriangle.clone();
  rightTriangle.position.x *= -1;
  rightTriangle.rotation.y = -Math.PI / 2;
  group.add(leftTriangle, rightTriangle);

  const leftGableWindow = createFacadeOpening(0.92, 0.82, { frameColor: '#22272d', trimColor: '#7ecfe0' });
  leftGableWindow.rotation.y = Math.PI / 2;
  leftGableWindow.position.set(-width / 2 - 0.15, baseTop + 2.08, -2.4);
  const rightGableWindow = createFacadeOpening(0.92, 0.82, { frameColor: '#22272d', trimColor: '#7ecfe0' });
  rightGableWindow.rotation.y = -Math.PI / 2;
  rightGableWindow.position.set(width / 2 + 0.15, baseTop + 2.08, 2.15);
  group.add(leftGableWindow, rightGableWindow);

  const roof = createRoof(width + 0.22, depth, roofRise, 0.82);
  roof.position.set(0, baseTop + wallHeight - 0.08, 0);
  group.add(roof);
  return applyShadows(group);
}
