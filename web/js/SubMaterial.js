import * as THREE from './lib/three.module.js'

const subVert = /*glsl*/`
#include <common>
#include <packing>
#include <lights_pars_begin>
#include <shadowmap_pars_vertex>

varying vec2 vCoord;
varying vec4 vFirstShadowCoord;

void main() {
	vCoord = position.xz;
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
	vec4 worldPosition = modelMatrix * vec4(position, 1.0);
	vFirstShadowCoord = directionalShadowMatrix[0] * worldPosition;
}
`

const subFrag = /*glsl*/`
#include <common>
#include <packing>
#include <lights_pars_begin>
#include <shadowmap_pars_fragment>

varying vec2 vCoord;
varying vec4 vFirstShadowCoord;

vec2 random2(vec2 p) {
	return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453);
}

void main() {
	gl_FragColor = vec4(
		0.2,
		0.5 + 0.3*random2(floor(vCoord)).x,
		0.2,
		1.0
	);
	DirectionalLight directionalLight = directionalLights[0];
	DirectionalLightShadow directionalLightShadow = directionalLightShadows[0];
	vec4 sCoord = vFirstShadowCoord;
	sCoord.xyz /= sCoord.w;
	sCoord.z -= 0.01;
	bvec4 inFrustumVec = bvec4(sCoord.x >= 0.0, sCoord.x <= 1.0, sCoord.y >= 0.0, sCoord.y <= 1.0);
	bool inFrustum = all(inFrustumVec);
	bvec2 frustumTestVec = bvec2(inFrustum, sCoord.z <= 1.0);
	bool frustumTest = all(frustumTestVec);
	float shadow = 1.0;
	if (frustumTest) {
		shadow = texture2DCompare(directionalShadowMap[0], sCoord.xy, sCoord.z);
	}
	gl_FragColor.rgb *= shadow;
}
`

const mkSubMaterial = () => {
	const ret = new THREE.ShaderMaterial({
		uniforms: THREE.UniformsUtils.merge([
			THREE.UniformsLib.lights,
			THREE.UniformsLib.fog
		]),
		vertexShader: subVert,
		fragmentShader: subFrag,
		lights: true,
		polygonOffset: true,
		polygonOffsetFactor: 400.0,
		polygonOffsetUnits: 400.0
	})
	return ret
}

export const subMaterial = mkSubMaterial()