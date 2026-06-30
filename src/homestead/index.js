import { createCourtyardWall } from './courtyardWall.js?v=20260630-6';
import { createGroundWearDetails } from './groundWear.js?v=20260630-6';
import { createMainHouse } from './mainHouse.js?v=20260630-6';
import { createRearAnnex } from './rearAnnex.js?v=20260630-6';
import { createRearWorkingYard } from './rearYard.js?v=20260630-6';
import { createHouseSurfaceDetails } from './surfaceDetails.js?v=20260630-6';
import { createHomesteadYard } from './yard.js?v=20260630-6';

export function createHomestead(ctx) {
  const { THREE } = ctx;

  const homestead = new THREE.Group();
  homestead.name = 'Homestead';
  homestead.add(createHomesteadYard(ctx));
  homestead.add(createGroundWearDetails(ctx));

  const compound = new THREE.Group();
  compound.name = 'HomesteadCompound';
  compound.position.set(2.1, 0, 0);
  compound.add(createCourtyardWall(ctx));
  compound.add(createMainHouse(ctx));
  compound.add(createRearAnnex(ctx));
  compound.add(createRearWorkingYard(ctx));
  compound.add(createHouseSurfaceDetails(ctx));
  homestead.add(compound);

  return homestead;
}
