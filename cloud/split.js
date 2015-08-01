var names = require('all-the-package-names')

var biglist = []
var idx = 0
console.log(names.length)

names.forEach(function(name) {
  var parts = name.split(/[\.\_\-]+/)
    // .filter(function(str) {
    //   return str.match(/[a-z]+/i)
    // })
  parts.forEach(function(part) {
    biglist[idx++] = part
  })
})

var f = biglist.reduce(function(frequencies, word) {
  frequencies[word] = (frequencies[word] || 0) + 1
  return frequencies
}, {})

var freqs = Object.keys(f).map(function(key) {
  return { tagName: key, count: f[key] }
})

require('fs').writeFile('./words.txt', biglist.join(' '), function(err) {
  if (err) console.error(err)
})
// console.log(freqs.slice(0, 100))
// console.log(biglist.slice(0, 100))

function strip(str) {
  return str.replace(/[^a-z]/i, '')
}

function flatten(arr, b) {
  return arr.concat(b)
}