export function box(THREE, width, height, depth, material, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function cylinder(THREE, rt, rb, h, material, segments = 18) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, segments), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function roundedPlane(THREE, width, depth, radius, material) {
  const shape = new THREE.Shape();
  const hw = width / 2;
  const hd = depth / 2;
  shape.moveTo(-hw + radius, -hd);
  shape.lineTo(hw - radius, -hd);
  shape.quadraticCurveTo(hw, -hd, hw, -hd + radius);
  shape.lineTo(hw, hd - radius);
  shape.quadraticCurveTo(hw, hd, hw - radius, hd);
  shape.lineTo(-hw + radius, hd);
  shape.quadraticCurveTo(-hw, hd, -hw, hd - radius);
  shape.lineTo(-hw, -hd + radius);
  shape.quadraticCurveTo(-hw, -hd, -hw + radius, -hd);
  const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  return mesh;
}

export function applyShadows(group) {
  group.traverse(child => {
    if (child.isMesh && !child.userData.noShadow) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  return group;
}
