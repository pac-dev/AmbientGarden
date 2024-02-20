/**
 * "Impressionist" sky material and object.
 * 
 * It's just a plane owned by the camera. All the dots are drawn in the fragment
 * shader. The dots feature reduced perspective distortion.
 */

import { events } from '../events.js';
import * as THREE from '../lib/three.module.js';
import { camera } from '../mainLoop.js';
import { ratio } from '../world.js';

export const skyFrag = /*glsl*/`
const vec3 eastColor = vec3(.97, .6, .51);
const vec3 westColor = vec3(.98, .72, .39);
const vec3 hiColor = vec3(.28, .24, .39);
const vec3 hazeColor = vec3(.7, .5, .5);
vec3 getSkyColor(vec3 rd, float screenX) {
	float ew = rd.x*.5+.5;
	vec3 loColor = mix(eastColor, westColor, ew*ew);
	vec3 ret = mix(loColor, hiColor, clamp(rd.y+screenX*screenX*.3, 0., 1.));
	ret = mix(hazeColor, ret, smoothstep(.05,.11,rd.y));
	return ret;
}
`;

const vertexShader = /*glsl*/`
varying vec3 vWorldPos;
varying float vScreenX;

void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
	vScreenX = gl_Position.x / gl_Position.w;
	vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
	vWorldPos = worldPosition.xyz;
}`;

const fragmentShader = /*glsl*/`
varying vec3 vWorldPos;
varying float vScreenX;
uniform vec2 vpSize;

${skyFrag}

#define M_PI 3.1415926535897932384626433832795

// Hash function by Dave_Hoskins on Shadertoy
vec4 hash42(vec2 p)
{
	vec4 p4 = fract(vec4(p.xyxy) * vec4(.1031, .1030, .0973, .1099));
	p4 += dot(p4, p4.wzxy+33.33);
	return fract((p4.xxyz+p4.yzzw)*p4.zywx);
}

void addLayer(vec2 plane, vec2 diskRatio, vec3 baseCol, inout vec3 workCol) {
	vec2 cellPt = floor(plane);
	vec2 innerPt = fract(plane) * 2.0 - 1.0;
	innerPt *= diskRatio;
	vec4 cellHash = hash42(cellPt);
	innerPt += cellHash.xy*2.-1.;
	float circleDist = length(innerPt);
	if (circleDist < 3.0) {
		workCol = baseCol+cellHash.xyz*.06-.03;
		workCol *= 1.+cellHash.w*0.08-0.05;
	}
}

void main() {
	vec3 rd = normalize(vWorldPos - cameraPosition);
	vec3 col = getSkyColor(rd, vScreenX);
	float phi = atan(rd.z, rd.x)/M_PI;
	vec2 plane = vec2(phi, rd.y*0.5);
	vec2 diskRatio = vec2(dFdx(plane.x), dFdy(plane.y));
	diskRatio = 1.0 / (diskRatio*vpSize.y);
	// make disks larger on the sides of the screen where they are farther apart
	if (diskRatio.x > diskRatio.y) diskRatio *= diskRatio.y/diskRatio.x;
	// fake perspective (smaller dots near the horizon)
	float persp = rd.y*0.66;
	if (rd.y > 0.2) persp = (0.2*0.66)+(rd.y-0.2)*1.4;
	diskRatio /= persp;
	plane *= 100.0;
	vec3 baseCol = col;
	addLayer(plane, diskRatio, baseCol, col);
	
	// more economical version:
	// addLayer(plane+2.33, diskRatio, baseCol, col);
	// addLayer(plane+5.66, diskRatio, baseCol, col);

	addLayer(plane+2.25, diskRatio, baseCol, col);
	addLayer(plane+5.5, diskRatio, baseCol, col);
	addLayer(plane+8.75, diskRatio, baseCol, col);

	gl_FragColor = vec4(col, 1.0);
}`;

export const addSky = (width, height) => {
	const dist = 0.9 * camera.far;
	const geo = new THREE.PlaneBufferGeometry(dist*6,dist*2,1,1);
	const material = new THREE.ShaderMaterial({
		vertexShader, fragmentShader,
		uniforms: { vpSize: new THREE.Vector2() }
	});
	const resize = ({width, height}) => {
		material.uniforms.vpSize.value = new THREE.Vector2(
			width * ratio,
			height * ratio
		);
	};
	resize({width, height});
	events.on('resize', resize);
	const mesh = new THREE.Mesh(geo, material);
	mesh.position.set(0,0,-dist);
	camera.add(mesh);
};