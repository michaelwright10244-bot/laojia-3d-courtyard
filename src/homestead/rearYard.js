export function createRearWorkingYard(ctx) {
  const { THREE } = ctx;
  const group = new THREE.Group();
  const uniformConcrete = new THREE.MeshStandardMaterial({ color: '#c8c2b5', roughness: 0.98 });
  const yardGeom = new THREE.BufferGeometry();
  yardGeom.setAttribute('position', new THREE.Float32BufferAttribute([
    -7.5, 0.085, -5.55,
    7.5, 0.085, -5.55,
    7.5, 0.085, -9.28,
    -7.5, 0.085, -9.2
  ], 3));
  yardGeom.setIndex([0, 1, 2, 0, 2, 3]);
  yardGeom.computeVertexNormals();
  const cementYard = new THREE.Mesh(yardGeom, uniformConcrete);
  cementYard.receiveShadow = true;
  group.add(cementYard);
  return group;
}
