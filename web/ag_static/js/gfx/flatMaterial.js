/**
 * Material for a flat-shaded mesh.
 */

import * as THREE from '../lib/three.module.js';
import { skyFrag } from './sky.js';

const shaderPrefix = `
varying float vScreenX;
varying vec4 vmvPosition;
`;

const vertMainChunk = `
vScreenX = gl_Position.x / gl_Position.w;
vmvPosition = mvPosition;
`;

const fragChunk = `
#include <dithering_fragment>
float fogAmt = smoothstep(1152.0*0.5, 1152.0*2.5, -vmvPosition.z);
float skyAmt = smoothstep(1152.0*2.0, 1152.0*5.0, -vmvPosition.z);
gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.53, 0.47, 0.54), fogAmt);
gl_FragColor.rgb = mix(gl_FragColor.rgb, getSkyColor(normalize( -vmvPosition.xyz ), vScreenX), skyAmt);
`;

export const mkFlatMaterial = (r, g, b) => {
	const ret = new THREE.MeshLambertMaterial({
		color: new THREE.Color(r,g,b),
	});
	ret.onBeforeCompile = (shader) => {
		shader.vertexShader = shaderPrefix + shader.vertexShader;
		shader.vertexShader = shader.vertexShader.replace(
			'#include <fog_vertex>', vertMainChunk
		);
		shader.fragmentShader = shaderPrefix + skyFrag + shader.fragmentShader;
		shader.fragmentShader = shader.fragmentShader.replace(
			'#include <dithering_fragment>', fragChunk
		);
		ret.userData.shader = shader;
	};
	return ret;
};
