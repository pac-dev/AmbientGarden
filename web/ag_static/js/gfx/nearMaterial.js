/**
 * "Impressionist" terrain material.
 * 
 * This material is used on the nearby terrain layer only. Dots are drawn in the
 * fragment shader, using voxel traversal to simulate depth. This also
 * integrates with THREE.js shadows, assuming a single directional light.
 */

import * as THREE from '../lib/three.module.js';
import { mapcnv, terrainGlsl } from '../world.js';

const nearVert = /*glsl*/ `
#include <common>
#include <normal_pars_vertex>
#include <packing>
#include <lights_pars_begin>
#include <shadowmap_pars_vertex>

varying vec3 vPos;
varying float vCamDist;

void main() {
	#include <beginnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
	vec4 worldPosition = modelMatrix * vec4(position, 1.0);
	vPos = worldPosition.xyz;
	vCamDist = distance(worldPosition.xyz, cameraPosition.xyz);
}
`;

const nearFrag = /*glsl*/ `
#include <common>
#include <normal_pars_fragment>
#include <packing>
#include <lights_pars_begin>
#include <shadowmap_pars_fragment>
uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];

uniform sampler2D maptex;
uniform float mapsz;
varying vec3 vPos;
varying float vCamDist;

float rayPointDistance(vec3 ro, vec3 rd, vec3 pt) {
	return length(cross(rd, pt - ro));
}

// https://gist.github.com/mairod/a75e7b44f68110e1576d77419d608786
vec3 badShift(vec3 color, float hue) {
	const vec3 k = vec3(0.57735, 0.57735, 0.57735);
	float cosAngle = cos(hue);
	return vec3(color * cosAngle + cross(k, color) * sin(hue) + k * dot(k, color) * (1.0 - cosAngle));
}

float hash2d(vec2 v) {
	return fract(sin(dot(
		v.xy*0.1,
		vec2(12.9898,78.233)
	))*43758.5453123);
}

${terrainGlsl}

vec3 cell2col(vec2 mapPos, float ofs) {
	vec3 ret = texture2D(maptex, mapPos).rgb;
	ret = badShift(ret, hash2d(mapPos+ofs)*0.5-0.25);
	return ret*(1.0+hash2d(mapPos-99.0+ofs)*0.4-0.2);
}

const float psz = 0.5;
const float cellScale = 0.35;
const float iCellScale = 1./cellScale;
DirectionalLightShadow directionalLightShadow;

vec3 cell2jitter(vec3 c) {
	vec3 ret = vec3(hash2d(c.xz), 0.5, hash2d(c.xz+113.0));
	return (ret - 0.5) * 0.5;
}

// parts of this function come from Shane's "Voxel Corridor"
vec4 voxelTrace(vec3 hit, vec3 rd, vec3 normal, float camAA) {
	hit *= cellScale;
	// align vertically with zero-level (eg. for road transition)
	hit -= rd;
	// stick the top layer to the terrain
	vec3 tophit = vec3(hit.x, -0.01, hit.z);
	// perspective trick for angled terrain
	rd = refract(rd, normal, 0.75);
	vec4 col = vec4(0.);
	vec3 cell = floor(tophit) + .5;
	vec3 dRd = 1./abs(rd);
	vec3 sRd = sign(rd);
	vec3 side = dRd*(sRd*(cell - tophit) + .5);
	vec3 mask = vec3(0);
	// optional shadow fade at the edge of near material:
	// float shadowFade = 1.-clamp((vCamDist-192.0*2.5)/(192.0*4.0-192.0*2.5), 0., 1.);
	for (int i = 0; i < 4; i++) {
		vec2 mapPos = world2mapPos(cell.xz*iCellScale);
		float rdist = mapPos2roadDist(miwrap(mapPos)*mapsz);
		// hide lower layers near the road
		float rthresh = rthreshin - cell.y*0.1 - 0.05;
		float dist = rayPointDistance(tophit, rd, cell + cell2jitter(cell));
		vec3 wCell = (cell + vec3(0., hit.y, 0.))*iCellScale;
		vec4 sCoord = directionalShadowMatrix[0] * vec4(wCell, 1.0);
		sCoord.xyz /= sCoord.w;
		sCoord.z += directionalLightShadow.shadowBias;
		float shadow = texture2DCompare(directionalShadowMap[0], sCoord.xy, sCoord.z);
		// shadow = mix(1., shadow, shadowFade);
		if (dist < psz && rdist < rthresh) {
			float alpha = (1.-smoothstep(psz - camAA, psz, dist))*(0.5-0.3*shadow);
			alpha = (1.-col.a)*alpha;
			col += vec4(vec3(0.6)*alpha*(0.75+0.25*shadow), alpha);
		} else if (dist < psz) {
			float alpha = 1.-smoothstep(psz - camAA, psz, dist);
			alpha = (1.-col.a)*alpha;
			col += vec4(cell2col(mapPos, 0.)*alpha*(0.75+0.25*shadow), alpha);
			if (col.a > 0.9) break;
		}
		mask = step(side, side.yzx)*(1. - step(side.zxy, side));
		side += mask*dRd;
		cell += mask*sRd;
	}
	return col;
}

float rangeBrightness(float camDist) {
	float ret = max(0., 1. - abs(1. - camDist));
	return ret*ret*clamp((1. - camDist)*40., -1., 1.);
}

void main() {
	#include <normal_fragment_begin>
	gl_FragColor.a = 1.0 - smoothstep(192.0*3.0, 192.0*5.0, vCamDist);
	vec3 worldNormal = inverseTransformDirection(normal, viewMatrix);
	directionalLightShadow = directionalLightShadows[0];

	// anti-aliasing heuristic: how much distance is covered over 1 pixel?
	float camAA = abs(dFdy(vCamDist))*0.3;
	vec4 ter = terrain(vPos.xz);
	vec3 rd = normalize(vPos - cameraPosition);
	vec4 col = voxelTrace(vPos, rd, worldNormal, camAA);
	col.xyz += ter.xyz * (1.-col.a);
	gl_FragColor.rgb = col.xyz;

	float br = rangeBrightness(length(vPos.xz - cameraPosition.xz)/250.);
	gl_FragColor.rgb *= 1.+br*0.2;

	// let's assume the near material is always in the shadow frustum:
	vec4 sCoord = directionalShadowMatrix[0] * vec4(vPos, 1.);
	sCoord.xyz /= sCoord.w;
	sCoord.z += directionalLightShadow.shadowBias;
	float shadow = texture2DCompare(directionalShadowMap[0], sCoord.xy, sCoord.z);
	// you could also use the library shadow function:
	// float shadow = getShadow( directionalShadowMap[0], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vFirstShadowCoord );

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
