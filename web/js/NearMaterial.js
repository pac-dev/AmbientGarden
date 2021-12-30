import * as THREE from './lib/three.module.js'
import { mapcnv } from './World.js'
import { terrainGlsl } from './mapgen.js'

const nearVert = /*glsl*/`
#include <common>
#include <normal_pars_vertex>
#include <packing>
#include <lights_pars_begin>
#include <shadowmap_pars_vertex>

varying vec3 wPos;
varying vec4 vFirstShadowCoord;
varying float vCamDist;
varying float vAlpha;

void main() {
	#include <beginnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
	vec4 worldPosition = modelMatrix * vec4(position, 1.0);
	wPos = worldPosition.xyz;
	vFirstShadowCoord = directionalShadowMatrix[0] * worldPosition;
	vCamDist = distance(worldPosition.xz, cameraPosition.xz);
	vAlpha = 1.0 - smoothstep(192.0*3.0, 192.0*5.0, vCamDist);
}
`

const nearFrag = /*glsl*/`
#include <common>
#include <normal_pars_fragment>
#include <packing>
#include <lights_pars_begin>
#include <shadowmap_pars_fragment>

uniform sampler2D maptex;
uniform float mapsz;
varying vec3 wPos;
varying vec4 vFirstShadowCoord;
varying float vCamDist;
varying float vAlpha;

float linePointDistance(vec3 a, vec3 b, vec3 v) {
	vec3 ab  = b - a;
	vec3 av  = v - a;
	return length(cross(ab, av)) / length(ab);
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

vec3 cell2col(vec3 c, float ofs) {
	vec2 mapPos = world2mapPos(c.xz);
	vec3 ret = texture2D(maptex, mapPos).rgb;
	ret = badShift(ret, hash2d(c.xz+ofs)*0.5-0.25);
	return ret*(1.0+hash2d(c.xz-99.0+ofs)*0.4-0.2);
}

mat3 calcLookAtMatrix(vec3 target, float roll) {
  vec3 rr = vec3(sin(roll), cos(roll), 0.0);
  vec3 ww = normalize(target);
  vec3 uu = normalize(cross(ww, rr));
  vec3 vv = normalize(cross(uu, ww));

  return mat3(uu, vv, ww);
}

vec2 safeNormalize(vec2 v) {
	float len = length(v);
	return (len == 0.0) ? vec2(1.0, 0.0) : v / len;
}

float yangle(vec2 v) {
	return acos(dot(vec2(0.0,1.0), safeNormalize(v)));
}

void pR(inout vec2 p, float a) {
	p = cos(a)*p + sin(a)*vec2(p.y, -p.x);
}

const float csz = 3.0;
const float hsz = csz * 0.5;
const float psz = csz * 0.45;

vec3 cell2jitter(vec3 c) {
	vec3 ret = vec3(hash2d(c.xz), 0.5, hash2d(c.xz+113.0));
	return (ret - 0.5) * csz * 0.45;
}

void pretrav(vec3 normal, out vec3 rd, out vec3 rStep, out vec3 delta) {

	// float a1 = yangle(normal.xy);
	// float a2 = yangle(normal.zy);
	// vec3 rotcam = cameraPosition - wPos;
	// pR(rotcam.xy, -a1);
	// pR(rotcam.zy, -a2);
	// rotcam += wPos;

	// prevent up/downhill stretch
	// horribly inefficient
	// also not working, seems orientation-dependent
	vec3 relcam = cameraPosition - wPos;
	float no = yangle(normal.xz);
	vec3 n2 = normal;
	pR(n2.xz, -no);
	float na = yangle(n2.zy);
	// na = max(0.05, na);
	// dbg = dot(vec2(0.0,1.0), safeNormalize(normal.xz));
	pR(relcam.xz, -no);
	pR(relcam.zy, -na);
	pR(relcam.xz, no);
	relcam = normalize(relcam);

	// prevent <= 0 ray/plane angle
	relcam.y = sqrt(relcam.y*relcam.y+0.05);
	vec3 rotcam = relcam + wPos;
	
	// vec3 tgt = normal.xzy;
	// mat3 rot = calcLookAtMatrix(tgt, 0.0);
	// vec3 rotcam = cameraPosition - wPos;
	// rotcam = rotcam.xzy * rot;
	// rotcam = rotcam.xzy + wPos;
	
	
	rd = normalize(wPos - rotcam);

	rStep = sign(rd)*csz;
	delta = abs(1.0/rd)/csz;
}

void traverse(vec3 ro, vec3 rd, vec3 rStep, vec3 delta, out vec3 cell1, out float dist1, out int iter1) {

	vec3 cell = vec3(floor(ro.x/csz)*csz, ro.y - csz*0.75, floor(ro.z/csz)*csz);
	vec3 cellmid = cell + hsz + cell2jitter(cell);
	float y0 = cell.y;

	vec3 r2 = ro + rd;
	float dist = linePointDistance(ro, r2, cellmid);
	vec2 mapPos = world2mapPos(cellmid.xz);
	float rdist = mapPos2roadDist(miwrap(mapPos)*mapsz);
	if (dist < psz && rdist > rthreshin) {
		cell1 = cell;
		dist1 = dist;
		iter1 = -1;
		return;
	}
	vec3 sideDist = sign(rd)*((cell - ro) + sign(rd)*hsz+hsz)*delta/csz;
	bvec3 mask = lessThanEqual(sideDist.xyz, min(sideDist.yxx, sideDist.zzy));

	for (int i=0; i<4; i++) {
		cell += vec3(mask) * rStep;
		if (cell.y < y0 - hsz) {
			break;
		}
		cellmid = cell + hsz + cell2jitter(cell);
		dist = linePointDistance(ro, r2, cellmid);
		vec2 mapPos = world2mapPos(cellmid.xz);
		float rdist = mapPos2roadDist(miwrap(mapPos)*mapsz);
		if (dist < psz && rdist > rthreshin) {
			cell1 = cell;
			dist1 = dist;
			iter1 = i;
			break;
		}
	    sideDist += vec3(mask) * delta;
	    mask = lessThanEqual(sideDist.xyz, min(sideDist.yxx, sideDist.zzy));
	}
}

void main() {
	#include <normal_fragment_begin>
	float camVar = abs(dFdy(vCamDist))*0.8;

	gl_FragColor = terrain(wPos.xz);
	gl_FragColor.a = vAlpha;

	vec3 worldNormal = inverseTransformDirection(normal, viewMatrix);
	vec3 rd;
	vec3 rStep;
	vec3 delta;
	pretrav(worldNormal, rd, rStep, delta);
	
	vec3 cellA1 = vec3(1.0, 0.0, 0.0);
	float distA1 = 12.0;
	int iterA1 = 100;
	traverse(wPos, rd, rStep, delta, cellA1, distA1, iterA1);
	
	vec3 cellB1 = vec3(1.0, 0.0, 0.0);
	float distB1 = 12.0;
	int iterB1 = 100;
	traverse(wPos + vec3(0.5, 0.0, 0.5)*csz, rd, rStep, delta, cellB1, distB1, iterB1);
	
	gl_FragColor.rgb = mix(cell2col(cellA1, 0.0), gl_FragColor.rgb, smoothstep(psz - camVar*0.5, psz, distA1));
	gl_FragColor.rgb = mix(cell2col(cellB1, 66.0), gl_FragColor.rgb, smoothstep(psz - camVar*1.33, psz, distB1));

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
	// gl_FragColor.rgb = worldNormal*0.5+0.5;

	// gl_FragColor.r = step(0.0, dbg);

	// gl_FragColor.r = 0.0;
	// if (isnan(dbg)) {
	// 	gl_FragColor.r = 1.0;
	// }
	// gl_FragColor.gb *= 0.2;
}
`

export const mkNearMaterial = () => {
	const maptex = new THREE.CanvasTexture(mapcnv)
	maptex.wrapS = THREE.MirroredRepeatWrapping
	maptex.wrapT = THREE.MirroredRepeatWrapping
	const ret = new THREE.ShaderMaterial({
		uniforms: THREE.UniformsUtils.merge([
			{
				maptex: { type: 't', value: maptex },
				mapsz: { type: 'f', value: mapcnv.width }
			},
			THREE.UniformsLib.lights,
			THREE.UniformsLib.fog
		]),
		vertexShader: nearVert,
		fragmentShader: nearFrag,
		lights: true,
		transparent: true,
		// polygonOffset: true,
		// polygonOffsetFactor: 400.0,
		// polygonOffsetUnits: 400.0
	})
	return ret
}
