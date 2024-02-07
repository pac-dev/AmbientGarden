import * as THREE from '../lib/three.module.js';
import { skyFrag } from './sky.js';
import { mapcnv, terrainGlsl } from '../world.js';

const farVert = /*glsl*/ `
#include <common>

varying vec3 vWorldPos;
varying float vFog;
varying float vSkyAmount;
varying float vScreenX;

void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
	vScreenX = gl_Position.x / gl_Position.w;
	vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
	float d = distance(vWorldPos.xz, cameraPosition.xz);
	vFog = smoothstep(1152.0*0.5, 1152.0*2.5, d);
	vSkyAmount = smoothstep(1152.0*2.0, 1152.0*5.0, d);
}
`;

const farFrag = /*glsl*/ `
#include <common>

uniform sampler2D maptex;
uniform float mapsz;
varying vec3 vWorldPos;
varying float vFog;
varying float vSkyAmount;
varying float vScreenX;

${skyFrag}

${terrainGlsl}

void main() {
	float dist = distance(vWorldPos.xz, cameraPosition.xz);
	if (dist < 600.) {
		discard;
	}
	vec3 rd = normalize(vWorldPos - cameraPosition);

	gl_FragColor = terrain(vWorldPos.xz);
	gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.53, 0.47, 0.54), vFog);

	gl_FragColor.rgb = mix(gl_FragColor.rgb, getSkyColor(rd, vScreenX), vSkyAmount);
	gl_FragColor.a = 1.;
}
`;

export const mkFarMaterial = () => {
	const maptex = new THREE.CanvasTexture(mapcnv);
	maptex.wrapS = THREE.MirroredRepeatWrapping;
	maptex.wrapT = THREE.MirroredRepeatWrapping;
	maptex.anisotropy = 4;
	const ret = new THREE.ShaderMaterial({
		uniforms: {
			maptex: { type: 't', value: maptex },
			mapsz: { type: 'f', value: mapcnv.width },
		},
		vertexShader: farVert,
		fragmentShader: farFrag,
	});
	return ret;
};
