/**
 * Material for a flat-shaded mesh.
 */

import * as THREE from '../lib/three.module.js';
import { skyFrag } from './sky.js';
import { events } from '../events.js';
import { clock } from '../world.js';

const shaderPrefix = /*glsl*/`
varying float vScreenX;
varying vec4 vmvPosition;
uniform float time;
uniform float sprite;
float hash2d(vec2 v) {
	return fract(sin(dot(
		v.xy*0.1,
		vec2(12.9898,78.233)
	))*43758.5453123);
}
`;

const vertChunk = /*glsl*/`
vScreenX = gl_Position.x / gl_Position.w;
vmvPosition = mvPosition;
`;

const fragChunk = /*glsl*/`
#include <dithering_fragment>
float fogAmt = smoothstep(1152.0*0.5, 1152.0*2.5, -vmvPosition.z);
float skyAmt = smoothstep(1152.0*2.0, 1152.0*5.0, -vmvPosition.z);
vec3 sky = getSkyColor(normalize( -vmvPosition.xyz ), vScreenX);
gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.53, 0.47, 0.54), fogAmt);
gl_FragColor.rgb = mix(gl_FragColor.rgb, sky, skyAmt);
float det = hash2d(vec2(gl_FragCoord.x, floor(gl_FragCoord.y*0.02+sin(gl_FragCoord.x)*11.11-time*90.)));
float det2 = fract(det*13.13);
float thresh = 1.-smoothstep(-350., 800., vmvPosition.y);
thresh = thresh*thresh*thresh*thresh;
thresh = mix(thresh, .05, 1.-smoothstep(100., 1000., -vmvPosition.z));
if (sprite > 0.5) {
	thresh += (1.-thresh)*(0.5 + 0.5*smoothstep(50., 1000., -vmvPosition.z));
	det2 = 1.;
}
if (det < thresh) {
	if (det2 < 0.3) {
		gl_FragColor.rgb = mix(gl_FragColor.rgb, sky, det2);
	} else {
		discard;
	}
}
`;

export const mkFlatMaterial = (r, g, b, sprite=false) => {
	const params = { color: new THREE.Color(0, 0, 0) }
	if (sprite) { params.emissive = new THREE.Color(r,g,b) }
	else { params.color = new THREE.Color(r,g,b) }
	const ret = new THREE.MeshLambertMaterial(params);
	ret.onBeforeCompile = (shader) => {
		shader.uniforms.time = { value: 0 };
		shader.uniforms.sprite = { value: sprite ? 1 : 0 };
		shader.vertexShader = shaderPrefix + shader.vertexShader;
		shader.vertexShader = shader.vertexShader.replace(
			'#include <fog_vertex>', vertChunk
		);
		shader.fragmentShader = shaderPrefix + skyFrag + shader.fragmentShader;
		shader.fragmentShader = shader.fragmentShader.replace(
			'#include <dithering_fragment>', fragChunk
		);
		ret.userData.shader = shader;
	};
	events.on('timestep', () => {
		if (!ret.userData?.shader) return;
		ret.userData.shader.uniforms.time.value = clock.gfxTime;
	});
	return ret;
};
