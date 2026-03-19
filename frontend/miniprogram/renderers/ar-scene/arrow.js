const updateArrowMesh = (THREE, arrowMesh, sample) => {
  if (!THREE || !arrowMesh || !sample) {
    return;
  }

  arrowMesh.position.set(sample.position.x, sample.position.y + 0.2, sample.position.z);
  const target = new THREE.Vector3(
    sample.position.x + sample.direction.x,
    sample.position.y + sample.direction.y,
    sample.position.z + sample.direction.z
  );
  arrowMesh.lookAt(target);
};

module.exports = {
  updateArrowMesh
};
