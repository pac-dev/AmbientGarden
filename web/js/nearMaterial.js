import * as THREE from './lib/three.module.js';
import { mapcnv, terrainGlsl } from './world.js';

/**
 * "Impressionist" terrain material.
 * 
 * This material is used on the nearby terrain layer only. Dots are drawn in the
 * fragment shader, using voxel traversal to simulate depth. Each dot is drawn
 * roughly in screen space, which reduces perspective distortion, and makes the
 * terrain look more like individual dots and less like a stretched-out texture.
 * 
 * I tried to integrate as well as possible with THREE.js features. This mostly
 * involves using the THREE.js shader sources as reference. They're
 * undocumented, so debugging and source-digging is the best way of figuring
 * things out.
 * 
 */

const nearVert = /*glsl*/ `
#include <common>
#include <normal_pars_vertex>
#include <packing>
#include <lights_pars_begin>
#include <shadowmap_pars_vertex>

uniform float aspect;

varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying vec4 vFirstShadowCoord;
varying vec2 vScreenPos;

void main() {
	#include <beginnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
	vec4 worldPosition = modelMatrix * vec4(position, 1.0);
	vWorldPos = worldPosition.xyz;
	vScreenPos = gl_Position.xy / gl_Position.w;
	vScreenPos.x *= aspect;
	vWorldNormal = inverseTransformDirection(normal, viewMatrix);
	vFirstShadowCoord = directionalShadowMatrix[0] * worldPosition;
}
`;

const nearFrag = /*glsl*/ `
#include <common>
#include <packing>
#include <lights_pars_begin>
#include <shadowmap_pars_fragment>

uniform sampler2D maptex;
uniform float mapsz;
uniform float aspect;
uniform mat4 projectionMatrix;

varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying vec4 vFirstShadowCoord;
varying vec2 vScreenPos;

// https://gist.github.com/mairod/a75e7b44f68110e1576d77419d608786
vec3 badShift(vec3 color, float hue) {
	const vec3 k = vec3(0.57735, 0.57735, 0.57735);
	float cosAngle = cos(hue);
	return vec3(color * cosAngle + cross(k, color) * sin(hue) + k * dot(k, color) * (1.0 - cosAngle));
}

// Hash function by Dave_Hoskins on Shadertoy
float hash2d(vec2 v) {
	return fract(sin(dot(
		v.xy*0.1,
		vec2(12.9898,78.233)
	))*43758.5453123);
}

${terrainGlsl}

const float dotSize = 0.5;
const float cellScale = 0.3;
const float iCellScale = 1./cellScale;

vec3 cell2jitter(vec3 c) {
	vec3 ret = vec3(hash2d(c.xz), 0.5, hash2d(c.xz+113.0));
	return (ret - 0.5) * 0.5;
}

vec3 cell2col(vec2 mapPos, float ofs) {
	vec3 ret = texture2D(maptex, mapPos).rgb;
	ret = badShift(ret, hash2d(mapPos+ofs)*0.5-0.25);
	return ret*(1.0+hash2d(mapPos-99.0+ofs)*0.4-0.2);
}

vec2 world2screen(vec3 pos, mat4 worldToClip) {
	// reminder that the '*' is not commutative here
	vec4 clipPos =  worldToClip * vec4(pos, 1.);
	vec2 screenPos = clipPos.xy / clipPos.w;
	screenPos.x *= aspect;
	return screenPos;
}

// parts of this function come from Shane's "Voxel Corridor"
vec4 voxelTrace(vec3 hit, vec3 rd, float camDist) {
	// anti-aliasing heuristic: how much distance is covered over 1 pixel?
	float dvCamDist = dFdy(camDist);
	float camAA = abs(dvCamDist)*0.8;
	mat4 worldToClip = projectionMatrix * viewMatrix;

	hit *= cellScale;
	// align vertically with zero-level (eg. for road transition)
	hit -= rd;
	// stick the top layer to the terrain
	vec3 pos = vec3(hit.x, -0.01, hit.z);
	// is the terrain facing us?
	vec3 azimuth = normalize(vec3(rd.x, 0., rd.z));
	float faceness = 1.-clamp(-dot(vWorldNormal, azimuth)*2., 0., 0.2);
	// fix(ish) the perspective on angled terrain
	rd = refract(rd, vWorldNormal, 0.9);
	// voxel traversal
	vec4 col = vec4(0.);
	vec3 cell = floor(pos) + .5;
	vec3 dRd = 1./abs(rd);
	vec3 sRd = sign(rd);
	vec3 side = dRd*(sRd*(cell - pos) + .5);
	vec3 mask = vec3(0);
	for (int i = 0; i < 5; i++) {
		vec2 mapPos = world2mapPos(cell.xz*iCellScale);
		float rdist = mapPos2roadDist(miwrap(mapPos)*mapsz);
		// hide lower layers near the road
		float rthresh = rthreshin - cell.y*0.1 - 0.05;
		// start converting back to screen coordinates
		vec3 backtrack = cell + cell2jitter(cell);
		backtrack += vec3(0.,hit.y,0.)-rd*distance(pos, cell)*.5;
		vec2 screenPoint = world2screen(backtrack*iCellScale, worldToClip);
		vec2 dif = vScreenPos - screenPoint;
		// fix stretching when facing angled terrain
		dif.y /= faceness;
		float dist = length(dif);
		float psz2 = (1.+0.4*abs(vScreenPos.x))*dotSize*5./camDist;
		if (dist < psz2 && rdist > rthresh) {
			float dens = 1.-smoothstep(psz2 - camAA*0.005, psz2, dist);
			float a2 = (1.-col.a)*dens;
			col += vec4(cell2col(mapPos, 0.)*a2, a2);
			if (col.a > 0.9) break;
		}
		mask = step(side, side.yzx)*(1. - step(side.zxy, side));
		side += mask*dRd;
		cell += mask*sRd;
	}
	return col;
}

void main() {
	vec4 ter = terrain(vWorldPos.xz);
	vec3 rd = normalize(vWorldPos - cameraPosition);
	float camDist = distance(vWorldPos, cameraPosition.xyz);
	vec4 col = voxelTrace(vWorldPos, rd, camDist);
	col.xyz += ter.xyz * (1.-col.a);
	gl_FragColor.rgb = col.xyz;
	gl_FragColor.a = 1.0 - smoothstep(192.0*3.0, 192.0*5.0, camDist);

	DirectionalLight directionalLight = directionalLights[0];
	DirectionalLightShadow directionalLightShadow = directionalLightShadows[0];
	vec4 sCoord = vFirstShadowCoord;
	sCoord.xyz /= sCoord.w;
	sCoord.z += directionalLightShadow.shadowBias;
	bvec4 inFrustumVec = bvec4(sCoord.x >= 0.0, sCoord.x <= 1.0, sCoord.y >= 0.0, sCoord.y <= 1.0);
	bool inFrustum = all(inFrustumVec);
	bvec2 frustumTestVec = bvec2(inFrustum, sCoord.z <= 1.0);
	bool frustumTest = all(frustumTestVec);
	float shadow = 1.0;
	if (frustumTest) {
		shadow = texture2DCompare(directionalShadowMap[0], sCoord.xy, sCoord.z);
	}
	gl_FragColor.rgb *= 0.8 + 0.2 * shadow;
}
`;

export const mkNearMaterial = () => {
	const maptex = new THREE.CanvasTexture(mapcnv);
	maptex.wrapS = THREE.MirroredRepeatWrapping;
	maptex.wrapT = THREE.MirroredRepeatWrapping;
	const ret = new THREE.ShaderMaterial({
		uniforms: THREE.UniformsUtils.merge([
			{
				maptex: { type: 't', value: maptex },
				mapsz: { type: 'f', value: mapcnv.width },
				aspect: { type: 'f', value: window.innerWidth / window.innerHeight },
			},
			THREE.UniformsLib.lights,
			THREE.UniformsLib.fog,
		]),
		vertexShader: nearVert,
		fragmentShader: nearFrag,
		lights: true,
		// transparent: for near-terrain to fade onto far-terrain
		transparent: true,
	});
	return ret;
};
