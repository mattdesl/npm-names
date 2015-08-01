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
      "precision mediump float;",
      "uniform mat4 modelViewMatrix;",
      "uniform mat4 projectionMatrix;",
      "attribute vec4 position;",
      "attribute vec2 uv;",
      "attribute float zPos;",
      "attribute float word;",
      "varying vec2 vUv;",
      "uniform float currentWord;",
      "uniform float wordCount;",
      "uniform vec3 origin;",
      "varying float vSelect;",
      "varying float vFade;",
      "void main() {",
        "vUv = uv;",
        "vec4 mvmpos = vec4( position.xy, zPos, 1.0 );",
        "vFade = clamp(length(mvmpos.xyz - origin.xyz) / 50.0, 0.0, 1.0);",
        "vFade = smoothstep(0.06, 0.15, vFade);",
        "vFade *= 0.5;",
        "float amt = abs(floor(word) - floor(currentWord));",
        // "if (word == currentWord) { vFade = 1.0; }",
        "vSelect = smoothstep(1.0, 0.0, amt);",
        "vFade = mix(vFade, 1.0, vSelect);",
        "gl_Position = projectionMatrix * modelViewMatrix * mvmpos;",
      "}"
    ].join("\n"),
    fragmentShader: [   
      "#extension GL_OES_standard_derivatives : enable",
      "precision mediump float;",
      "#define SQRT2 1.4142135623730951",
      "#define SQRT2_2 0.70710678118654757",
      "uniform float opacity;",
      "uniform vec3 color;",
      "uniform sampler2D map;",
      "uniform float smooth;",
      "varying float vSelect;",
      "varying float vFade;",
      "varying vec2 vUv;",
      "const vec2 shadowOffset = vec2(-1.0/512.0);",
      "const vec4 glowColor = vec4(vec3(0.1), 1.0);",
      "const float glowMin = 0.4;",
      "const float glowMax = 0.8;",
      "void main() {",
        "vec4 texColor = texture2D(map, vUv);",
        "float dst = texColor.a;", 
        "float contrast = mix(0.1, 0.0, vSelect);",
        "float afwidth = contrast + length(vec2(dFdx(dst), dFdy(dst))) * SQRT2_2;",
        "float alpha = smoothstep(0.5 - afwidth, 0.5 + afwidth, dst);",
        "vec4 base = vec4(color, opacity * alpha * vFade);",
        
        // "float glowDst = texture2D(map, vUv + shadowOffset).a;",
        // "vec4 glow = glowColor * smoothstep(glowMin, glowMax, glowDst);",
        // "float mask = 1.0-alpha;",
        "gl_FragColor = base;",
        // THREE.ShaderChunk["alphatest_fragment"],
      "}"
    ].join("\n"),
    defines: {
      "USE_MAP": "",
      "ALPHATEST": Number(alphaTest || 0).toFixed(1)
    }
  }, opt)
}