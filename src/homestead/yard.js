import { createLifeDetails } from './lifeDetails.js?v=20260630-6';

export function createHomesteadYard(ctx) {
  const { THREE, materials, box, roundedPlane, addVegetables, createFruitTree } = ctx;
  const yard = new THREE.Group();
  yard.name = 'HomesteadYard';

  yard.add(box(17.8, 0.3, 20.4, materials.concrete, 2.1, 0.07, 4.25));
  const pad = roundedPlane(15.4, 3.05, 0.06, materials.concrete);
  pad.position.set(2.1, 0.26, 7.35);
  yard.add(pad);
  const frontField = box(14.2, 0.12, 3.85, materials.soil, 2.35, 0.19, 10.15);
  yard.add(frontField);

  for (let x = -5.4; x < 9.4; x += 1.2) {
    yard.add(box(0.035, 0.012, 2.72, new THREE.MeshStandardMaterial({ color: '#bbb3a7', roughness: 1 }), x, 0.28, 7.35));
  }
  [6.25, 7.35, 8.45].forEach(z => yard.add(box(14.8, 0.012, 0.035, new THREE.MeshStandardMaterial({ color: '#bbb3a7', roughness: 1 }), 2.1, 0.281, z)));

  addVegetables(yard, 2.35, 10.15, 13.7, 3.55, 5, 13, 0.25);
  addVegetables(yard, -11.9, 2.0, 6.2, 18.0, 10, 6, 0.2);

  const sidePath = roundedPlane(0.68, 12.6, 0.04, materials.concrete);
  sidePath.position.set(-5.95, 0.205, 1.05);
  yard.add(sidePath);

  [[-6.9, 8.4, 1.1], [-4.4, 8.35, 0.78], [11.7, 8.5, 1.05], [-11.4, -5.5, 1.0], [13.4, -4.8, 1.12]].forEach(([x, z, s]) => {
    const tree = createFruitTree(s);
    tree.position.set(x, 0.16, z);
    yard.add(tree);
  });

  yard.add(createLifeDetails(ctx));
  return yard;
}
