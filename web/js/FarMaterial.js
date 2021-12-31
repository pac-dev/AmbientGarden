import * as THREE from './lib/three.module.js'
import { mapcnv, terrainGlsl } from './World.js'

const farVert = /*glsl*/`
#include <common>

varying vec2 vCoord;
varying float vFog;
varying float vAlpha;

void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
	vec4 worldPosition = modelMatrix * vec4(position, 1.0);
	vCoord = worldPosition.xz;
	float d = distance(worldPosition.xz, cameraPosition.xz);
	vFog = smoothstep(1152.0*0.5, 1152.0*2.5, d);
	vAlpha = 1.0 - smoothstep(1152.0*2.0, 1152.0*5.0, d);
}
`

const farFrag = /*glsl*/`
#include <common>

uniform sampler2D maptex;
uniform float mapsz;
varying vec2 vCoord;
varying float vFog;
varying float vAlpha;

${terrainGlsl}

void main() {
	gl_FragColor = terrain(vCoord);
	gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.61, 0.73, 0.86)*0.9, vFog);
	gl_FragColor.a = vAlpha;
}
`

export const mkFarMaterial = () => {
	const maptex = new THREE.CanvasTexture(mapcnv)
	maptex.wrapS = THREE.MirroredRepeatWrapping
	maptex.wrapT = THREE.MirroredRepeatWrapping
	maptex.anisotropy = 4
	const ret = new THREE.ShaderMaterial({
		uniforms: THREE.UniformsUtils.merge([
			{
				maptex: { type: 't', value: maptex },
				mapsz: { type: 'f', value: mapcnv.width }
			},
		]),
		vertexShader: farVert,
		fragmentShader: farFrag,
		transparent: true,
	})
	return ret
}
