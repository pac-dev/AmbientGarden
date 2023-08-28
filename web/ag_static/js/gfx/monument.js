/**
 * A giant mysterious mesh based on icosahedral geometry.
 */

import * as THREE from '../lib/three.module.js';
import { mkFlatMaterial } from './flatMaterial.js';

const sqrt = Math.sqrt, pi = Math.PI;
const gold = (1+sqrt(5))/2;
const dihedral = Math.acos(-sqrt(5)/3) - pi; // icosahedron dihedral angle
const a = 100; // side length
const inRadius = (gold*gold*a)/(2*sqrt(3)); // icosahedron inner radius
const triOutRadius = a/sqrt(3); // triangle outer radius
const phiGap = 0.8; // dat phi gap
const radGap = 0.95;
const midGap = 0.975; // what's the exact value for this?
const raisedEdge = 2.2/2;

export const mkMonument = () => {
	const material = mkFlatMaterial(.8,.8,.8);
	let triangleGeo = new THREE.LatheGeometry([
		new THREE.Vector2(triOutRadius*phiGap,raisedEdge),
		new THREE.Vector2(triOutRadius*phiGap*radGap,inRadius*(radGap-1)),
		new THREE.Vector2(triOutRadius*radGap*midGap,inRadius*(radGap*midGap-1)),
		new THREE.Vector2(triOutRadius,0),
		new THREE.Vector2(triOutRadius*phiGap,raisedEdge),
	], 3);
	// change the origin for easier rotations:
	triangleGeo.translate(a/2,0,triOutRadius/2);
	// make it flat shaded as per https://github.com/mrdoob/three.js/issues/7130#issuecomment-770235574
	triangleGeo = triangleGeo.toNonIndexed();
	triangleGeo.computeVertexNormals();
	const monuMesh = new THREE.InstancedMesh(triangleGeo, material, 20);
	let workMat = new THREE.Matrix4();
	let stepI = 0;
	const step = (alt=0, show=true) => {
		workMat.multiply(new THREE.Matrix4().makeRotationFromEuler(
			// numbers i haven't figured out: episode -0.5172
			new THREE.Euler(dihedral*(alt?-0.5172:1), Math.PI*1/3, 0)
		));
		if (show) monuMesh.setMatrixAt(++stepI, workMat);
	};
	const skip = () => step(0,false);
	const flip = () => {
		workMat.multiply(new THREE.Matrix4().makeTranslation(a,0,0));
		workMat.multiply(new THREE.Matrix4().makeRotationY(-pi*2/3));
	};
	monuMesh.setMatrixAt(0, workMat);
	skip(); skip(); skip(); skip();
	flip(); step(); step(1); step();
	let rewind = workMat.clone();
	step(); flip(); step(); step(); step(1);
	workMat = rewind;
	flip(); step(1); step();
	rewind = workMat.clone();
	step();
	workMat = rewind;
	flip(); 
	workMat.multiply(new THREE.Matrix4().makeRotationY(pi*1/3));
	monuMesh.setMatrixAt(++stepI, workMat);
	// giant mesh shadows look bad because the "far material" ignores them
	// (is it worth adding shadows to the far material? is there a better way?)
	// monuMesh.castShadow = true;
	monuMesh.layers.enable(1);
	return monuMesh;
};