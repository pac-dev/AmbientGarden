import * as THREE from '../lib/three.module.js';
import { camera } from '../mainLoop.js';

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

${skyFrag}

void main() {
	vec3 rd = normalize(vWorldPos - cameraPosition);
	gl_FragColor = vec4(getSkyColor(rd, vScreenX), 1.0);
}`;

export const addSky = () => {
	const dist = 0.9 * camera.far;
	const geo = new THREE.PlaneBufferGeometry(dist*6,dist*2,1,1);
	const material = new THREE.ShaderMaterial({ vertexShader, fragmentShader });
	const mesh = new THREE.Mesh(geo, material);
	mesh.position.set(0,0,-dist);
	camera.add(mesh);
};