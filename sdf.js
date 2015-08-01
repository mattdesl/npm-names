var xtend = require('xtend')

module.exports = function(opt) {
  opt = opt||{}
  var opacity = typeof opt.opacity === 'number' ? opt.opacity : 1
  var alphaTest = typeof opt.alphaTest === 'number' ? opt.alphaTest : 0.06
  var smooth = typeof opt.smooth === 'number' ? opt.smooth : 1/16 
  return xtend({
    attributes: {
      zPos: { type: 'f', value: null },
      word: { type: 'f', value: null }
    },
    uniforms: {
      wordCount: { type: 'f', value: 1 },
      origin: { type: 'v3', value: new THREE.Vector3() },
      currentWord: { type: 'f', value: 0 },
      opacity: { type: 'f', value: opacity },
      smooth: { type: 'f', value: smooth },
      map: { type: 't', value: opt.map || new THREE.Texture() },
      color: { type: 'c', value: new THREE.Color(opt.color) }
    },
    vertexShader: [
      "attribute float zPos;",
      "attribute float word;",
      "varying vec2 vUv;",
      "uniform float currentWord;",
      "uniform float wordCount;",
      "uniform vec3 origin;",
      "varying float vFade;",
      "void main() {",
        "vUv = uv;",
        "vec4 mvmpos = vec4( position.xy, zPos, 1.0 );",
        "vFade = clamp(length(mvmpos.xyz - origin.xyz) / 50.0, 0.0, 1.0);",
        "vFade = smoothstep(0.2, 0.8, vFade);",
        "vFade *= 0.85;",
        "float amt = abs(word - currentWord);",
        "vFade = mix(vFade, 1.0, smoothstep(1.0, 0.0, amt));",
        "gl_Position = projectionMatrix * modelViewMatrix * mvmpos;",
      "}"
    ].join("\n"),
    fragmentShader: [   
      "#extension GL_OES_standard_derivatives : enable",
      "#define SQRT2 1.4142135623730951",
      "#define SQRT2_2 0.70710678118654757",
      "uniform float opacity;",
      "uniform vec3 color;",
      "uniform sampler2D map;",
      "uniform float smooth;",
      "varying float vFade;",
      "varying vec2 vUv;",
      "void main() {",
        "vec4 texColor = texture2D(map, vUv);",
        "float dst = texColor.a;", 
        "float afwidth = 1.0 * length(vec2(dFdx(dst), dFdy(dst))) * SQRT2_2;",
        "float alpha = smoothstep(0.5 - afwidth, 0.5 + afwidth, dst);",

        "gl_FragColor = vec4(color, opacity * alpha * vFade);",
        THREE.ShaderChunk["alphatest_fragment"],
      "}"
    ].join("\n"),
    defines: {
      "USE_MAP": "",
      "ALPHATEST": Number(alphaTest || 0).toFixed(1)
    }
  }, opt)
}