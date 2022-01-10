import * as THREE from './lib/three.module.js'
import { ratio, clock, pointHiDist } from './World.js'

const ptEyeVert = /*glsl*/`
#include <common>
#include <packing>
#include <lights_pars_begin>
// look up the shadow map in the vertex shader rather than fragment
#include <shadowmap_pars_fragment>

uniform mat4 directionalShadowMatrix[1];
uniform float time;
uniform vec2 vpSize;
attribute vec3 color;
attribute float mindist;
varying vec3 vColor;

// Axis rotation taken from tdhooper
void pR(inout vec2 p, float a) {
	p = cos(a)*p + sin(a)*vec2(p.y, -p.x);
}

void main() {
	vec4 worldPosition = modelMatrix * vec4(position, 1.0);
	vec3 windyPos = position;
	float yfac = min(1.0, position.y/60.0);
	float ytime = time + 5.0 + yfac*0.4 + worldPosition.z/70.0;
	float rot = (sin(ytime*0.71)*0.33 + sin(ytime*0.49)*0.33) * (sin(ytime*0.38)*0.5+0.5);
	rot = (rot*0.1 - 0.03)*yfac;
	pR(windyPos.xy, rot);
	vec4 viewPos = modelViewMatrix * vec4(windyPos, 1.0);
	gl_Position = projectionMatrix * viewPos;

	vColor = color;

	vec4 directionalShadowCoord = directionalShadowMatrix[0] * worldPosition;
	DirectionalLight directionalLight = directionalLights[0];
	DirectionalLightShadow directionalLightShadow = directionalLightShadows[0];
	vec3 shaded = vColor * (0.7 + 0.3 * getShadow(
		directionalShadowMap[0],
		directionalLightShadow.shadowMapSize,
		directionalLightShadow.shadowBias,
		directionalLightShadow.shadowRadius,// + 10.0,
		directionalShadowCoord
	));
	float d = distance(worldPosition.xz, cameraPosition.xz);
	float shade = smoothstep(1152.0*0.5, 1152.0*1.5, d);
	vColor = mix(shaded, vColor, shade);
	float fog = smoothstep(${(pointHiDist*0.5).toFixed(1)}, ${pointHiDist.toFixed(1)}, d);
	vColor = mix(vColor, vec3(0.61, 0.73, 0.86)*0.9, fog);

	float unitSz = 1.1;
	gl_PointSize = vpSize.y * (projectionMatrix[1][1] * unitSz / gl_Position.w + 0.003);

	if (d > mindist) {
		gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
	} else if (d > mindist * 0.9) {
		gl_PointSize *= (d - mindist) * -10.0 / mindist;
	}
	float edgeness = gl_Position.x / gl_Position.w;
	gl_PointSize *= edgeness*edgeness*0.5 + 1.0;
}
`

const ptEyeFrag = /*glsl*/`
varying vec3 vColor;
void main() {
	if (length(gl_PointCoord.xy - 0.5) > 0.5) {
		discard;
	}
	gl_FragColor = vec4(vColor, 1);
}
`

const ptSunVert = /*glsl*/`
// using RawShaderMaterial so we define everything
precision mediump float;
precision mediump int;

#include <packing>

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform vec2 smSize;

attribute vec3 position;

varying vec4 vColor;

void main() {
	vec4 viewPos = modelViewMatrix * vec4(position, 1.0);
	gl_Position = projectionMatrix * viewPos;
	float depth = 0.5 * gl_Position.z / gl_Position.w + 0.5;
	vColor = packDepthToRGBA(depth);
	
	float unitSz = 1.4;
	gl_PointSize = smSize.y * projectionMatrix[1][1] * unitSz / gl_Position.w;
}
`

const ptSunFrag = /*glsl*/`
precision mediump float;
precision mediump int;

varying vec4 vColor;

void main() {
	if (length(gl_PointCoord.xy - 0.5) > 0.5) {
		discard;
	}
	gl_FragColor = vColor;
}
`

export let leafMaterial, leafDepth

const initLeafMaterials = () => {
	leafMaterial = new THREE.ShaderMaterial({
		uniforms: THREE.UniformsUtils.merge([
			THREE.UniformsLib.lights,
			THREE.UniformsLib.fog,
			{
				vpSize: new THREE.Vector2(),
				time: { value: 1.0 }
			}
		]),
		vertexShader: ptEyeVert,
		fragmentShader: ptEyeFrag,
		fog: true,
		lights: true,
	})
	leafDepth = new THREE.RawShaderMaterial({
		uniforms: THREE.UniformsUtils.merge([
			{
				smSize: new THREE.Vector2()
			}
		] ),
		vertexShader: ptSunVert,
		fragmentShader: ptSunFrag,
	})
}

export const updateLeafSize = (dLight, container) => {
	if (!leafMaterial) initLeafMaterials()
	leafMaterial.uniforms.vpSize.value = new THREE.Vector2(
		container.innerWidth*ratio,
		container.innerHeight*ratio)
	const dim = dLight.shadow.mapSize.width
	leafDepth.uniforms.smSize.value = new THREE.Vector2(dim, dim)
}

export const updateLeafTime = () => {
	if (!leafMaterial) initLeafMaterials()
	leafMaterial.uniforms.time.value = clock.gfxTime;
}