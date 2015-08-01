var packages = require('./top-modules-trunc')
var random = require('gl-vec3/random')
var COUNT = 4000

global.THREE = require('three')
var createOrbitViewer = require('three-orbit-viewer')(THREE)
var createText = require('three-bmfont-text')
var Shader = require('./sdf')
var loadBmFont = require('load-bmfont')
var tweenr = require('tweenr')()
var easing = require('eases/expo-in-out')
var $ = document.querySelector.bind(document)

function loadFont(opt, cb) {
  loadBmFont(opt.font, function(err, font) {
    if (err)
      throw err
    THREE.ImageUtils.loadTexture(opt.image, undefined, function(tex) {
      cb(font, tex)
    })  
  })
}

//load up a 'fnt' and texture
loadFont({ 
  font: 'assets/KelsonSans.fnt',
  image: 'assets/KelsonSans.png'
}, start)

function event(elem, fn) {
  var clicker = function (ev) {
    ev.preventDefault()
    ev.stopPropagation()
    fn(ev)
  }
  elem.addEventListener('click', clicker)
  elem.addEventListener('touchstart', clicker)
}

function start(font, texture) {
  var link = $('#link')
  var startPos = new THREE.Vector3(0, 0, -30)
  
  var app = createOrbitViewer({
      clearColor: 'rgb(40, 40, 40)',
      clearAlpha: 1.0,
      fov: 55,
      contextAttributes: {
        antialias: true,
        depth: true,
        alpha: false
      },
      position: startPos
  })
  
  event($('#shuffle'), function () {
    change()
  })
  event($('#zoom'), function () {
    transitionTo(app.camera.position, startPos)
  })
  
  var gl = app.renderer.getContext()
  var hasInt = gl.getExtension('OES_element_index_uint')
  if (!hasInt) {
    // could be more exact here for older devices
    // w/o uint32
    COUNT = Math.min(COUNT, 1000)
  }
  
  var maxAni = app.renderer.getMaxAnisotropy()

  //setup our texture with some nice mipmapping etc
  texture.needsUpdate = true
  texture.minFilter = THREE.LinearMipMapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.generateMipmaps = true
  texture.anisotropy = maxAni


  //here we use 'three-bmfont-text/shaders/sdf'
  //to help us build a shader material
  var material = new THREE.RawShaderMaterial(Shader({
    map: texture,
    smooth: 1/32, //the smooth value for SDF
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
    depthRead: false,
    depthTest: false,
    color: 'rgb(255, 255, 255)'
  }))
  
  var positionLookup = {}
  packages = packages.slice(0, COUNT)
  var charCount = packages.reduce(function (prev, a) {
    return prev + a.length
  }, 0)
  var posCount = 4 * 2 * charCount
  
  var radius = 2
  var allPositions = new Float32Array(posCount)
  var allUvs = new Float32Array(posCount)
  var allWordIndices = new Float32Array(4 * charCount)
  var allZPos = new Float32Array(4 * charCount)
  
  var tris = charCount * 6
  var type = (hasInt && tris > 21845) ? 'uint32' : 'uint16'
  
  var allIndices = require('quad-indices')({
    count: charCount,
    type: type
  })
  
  var offsetPos = 0
  var scale = -0.009
  var detailLookup = {}
  material.uniforms.wordCount.value = packages.length
  
  console.log("Total Glyphs", charCount)
  console.log("Tip:\n  window.change('lodash')")
  packages.forEach(function (name, index) {
    //create our text geometry
    var geom = createText({
      align: 'center',
      mode: 'pre',
      text: name,  //the string to render
      font: font,  //the bitmap font definition
    })
    
    var layout = geom.layout
    var positions = geom.attributes.position.array
    var uvs = geom.attributes.uv.array
    
    var relative = ((1 - index / (packages.length-1)) + 0.025) * (radius*1.025)
    var moduleScale = scale * 1
    var rnd = random([], 10)
    var rndPos = new THREE.Vector3().fromArray(rnd)
    var obj = new THREE.Object3D()
    obj.position.copy(rndPos)
    obj.lookAt(new THREE.Vector3())
    obj.updateMatrix()
    var targetPos = obj.position.clone()
    positionLookup[name] = targetPos
    detailLookup[name] = {
      layout: [ layout.width, layout.height ],
      scale: moduleScale,
      index: index,
      count: positions.length
    }
    // positionLookup[name] = [ rnd[0] * scale, rnd[1] * scale, rnd[2] * scale ]
    
    for (var i=0; i < positions.length/2; i++) {
      // model position
      positions[i * 2 + 0] -= layout.width/2
      positions[i * 2 + 1] += layout.height/2
      positions[i * 2 + 0] *= moduleScale
      positions[i * 2 + 1] *= moduleScale
      
      var newPos = new THREE.Vector3()
      newPos.set(positions[i * 2 + 0], positions[i * 2 + 1], 0)
      newPos.applyMatrix4(obj.matrix)
      
      positions[i * 2 + 0] = newPos.x
      positions[i * 2 + 1] = newPos.y
      allZPos[i + offsetPos / 2] = newPos.z
      allWordIndices[i + offsetPos / 2] = index
    }
    
    rnd = null
    geom = null
    layout = null
    allPositions.set(positions, offsetPos)
    allUvs.set(uvs, offsetPos)
    offsetPos += positions.length
  })
  
  var allText = new THREE.BufferGeometry()
  var posBuf = new THREE.BufferAttribute(allPositions, 2)
  var uvBuf = new THREE.BufferAttribute(allUvs, 2)
  var indexBuf = new THREE.BufferAttribute(allIndices, 1)
  var zPosBuf = new THREE.BufferAttribute(allZPos, 1)
  var wordBuf = new THREE.BufferAttribute(allWordIndices, 1)
  posBuf.needsUpdate = true
  uvBuf.needsUpdate = true
  zPosBuf.needsUpdate = true
  wordBuf.needsUpdate = true
  indexBuf.needsUpdate = true
  allText.addAttribute('position', posBuf)
  allText.addAttribute('word', wordBuf)
  allText.addAttribute('zPos', zPosBuf)
  allText.addAttribute('uv', uvBuf)
  allText.addAttribute('index', indexBuf)
  
  var mesh = new THREE.Mesh(allText, material)
  app.scene.add(mesh)
  
  var looker = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshBasicMaterial())
  app.scene.add(looker)
  looker.scale.multiplyScalar(0.1)
  looker.visible = false
  
  change(packages[Math.floor(Math.random()*packages.length)])
  
  app.once('tick', function () {
    $('#loading').setAttribute('hidden', true)
    $('#buttons').removeAttribute('hidden')
  })
  
  app.on('tick', function () {
    material.uniforms.origin.value.copy(app.camera.position)
  })
  
  window.change = change
  function change(name) {
    if (!name) {
      name = packages[Math.floor(Math.random()*packages.length)]
    }
    
    var lastIdx = material.uniforms.currentWord.value
    var idx = packages.indexOf(name)
    
    var pos = positionLookup[name]
    if (!pos) {
      console.log("No module by name ", name)
      return
    }
    
    link.setAttribute('href', 'https://npmjs.org/package/' + name)
    looker.position.copy(pos)
    material.uniforms.currentWord.value = idx
    
    var target = looker.position
    var end = target.clone()
    var dir = target.clone().normalize()
    var dist = radius * 2.05
    end.add(dir.multiplyScalar(dist))
    transitionTo(app.camera.position, end,
        lastIdx, idx)
  }
  
  function transitionTo(start, target) {
    
    var anim = {
      value: start.toArray(),
    }
    tweenr.to(anim, { 
      duration: 1, 
      ease: easing, 
      value: target.toArray(),
    })
      .on('update', function () {
        app.camera.position.fromArray(anim.value)
        app.controls.update()
        app.camera.updateProjectionMatrix()
      })
  }
}