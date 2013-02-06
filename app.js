var createGame = require('voxel-engine');
var highlight = require('voxel-highlight')
var vec3 = require('vec3');

  var io = window.io
  , socket = io.connect(undefined, {reconnect:false})
  , botEntity
  , entities = {}

var blocks;
socket.on('blockData', function(blockData) {
  blocks = blockData;
})

function materialIndex(name) {
  if (typeof name === 'number') {
    return materialIndex(blocks[name].name);
  }
  
  var mat = {
    'air':0,
    'snow':0,
    'stone': 1,
    'grass': 2,
    'dirt': 3,
    'stonebrick': 4,
    'wood': 5,
    'sapling': 6,
    'bedrock': 7,
    'log': 8,
    'leaves': 9,
  }[name]
  
  return mat !== undefined ? mat : 10; // cauldron bottom?
}

socket.on('spawn', function(position) {
  pixelPosition = position.map(function(v) { return v*25; })
  pixelPosition[1] += 1.62*25;
  console.log('spawn:', position, pixelPosition);
  if (!window.game) {
    var game = createGame({
      // generate: function() { return 0; },
      // generate: generate_blockCache,
      // generateVoxelChunk: function() { console.log('generateVoxelChunk', Array.prototype.slice.call(arguments)); return window.game.voxels.generate(low, high, generate_blockCache) },
      generateVoxelChunk: voxelChunk_chuckCache,
      startingPosition: pixelPosition,
      worldOrigin: pixelPosition,

      texturePath: './textures/blocks/',
      materials: ['stone', ['grass_top', 'dirt', 'grass_side'], 'dirt', 'stonebrick', 'wood', 'sapling', 'bedrock', ['tree_top', 'tree_top', 'tree_side'], 'leaves', 'cauldron_bottom'],
      // materialParams: { transparent: false }
      
      // controlOptions: {
      //   gravityEnabled: false
      // }
    })
      
    var container = document.querySelector('#gameCanvas')
    game.appendTo(container)
    container.addEventListener('click', function() {
      game.requestPointerLock(container)
    });
      
    window.game = game;
    
    highlight(game);
    game.on('mousedown', function (pos) {
      var vertexPos = vec3(pos).scaled(1/25).floored();
      var chunkPos = vertexPos.scaled(1/32).floored();
      console.log('mousedown', pos, vertexPos, chunkPos);
      var key = [chunkPos.x, chunkPos.y, chunkPos.z].join('|');
      console.log(key)
    });
  }

  // Look down at the ground
  window.game.controls.pitchObject.rotation.x = -1.5

  var groundPos = window.game.tilespaceToWorldspace(position[0], position[1] - 1, position[2])
  console.log('ground: ',groundPos)
  window.game.setBlock(groundPos, 1);
})

socket.on('entity', function (newEntity) {
  botEntity = newEntity;
});

socket.on('entitySpawn', function (newEntity) {
  entities[newEntity.id] = newEntity;
});

socket.on('entityMoved', function (newEntity) {
  entities[newEntity.id] = newEntity;
});

socket.on('entityGone', function(oldEntity) {
  delete entities[oldEntity.id];
});
  
// socket.on('blockUpdate', function(block) {
//   var type = materialIndex(block.name);
//   var pos = vec3(block.position);
//   if (type !== -1) {
//     var voxel = window.game.voxels.voxelAtPosition(pos);
//     if (!voxel) {
//       window.game.voxels.requestMissingChunks(pos);
//     }
// 
//     window.game.setBlock(vec3(block.position), type);
//   } else {
//     console.log('blockUpdate: '+block.name+' ('+type+')', pos);
//   }
// })
  
// var blockCache = {}
window.blockCache = {}
socket.on('blockMultiUpdate', function(data) {
  console.log('blockMultiUpdate', data)
  // var start = positionToVector3(data.start);
  var size = data.size;
  var i = 0;
  for (x = 0; x <= data.size[0]; ++x) {
    for (y = 0; y <= data.size[1]; ++y) {
      for (z = 0; z <= data.size[2]; ++z) {
        var pos = positionToVector3([data.start[0]+x, data.start[1]+y, data.start[2]+z]);
        var cachePos = [data.start[0]+x, data.start[1]+y, data.start[2]+z].map(function(v) {return Math.floor(v)}).join('|');
        var obj = {position:pos, name:data.data[i++]}
        blockCache[cachePos] = obj;
      }
    }
  }
})

function generate_blockCache(x,y,z) {
  var cachePos = [x,y,z].join('|');
  var cachedBlock = blockCache[cachePos];
  var material = 0;
  if (cachedBlock) {
    material = materialIndex(cachedBlock.name);
    if (material === -1) material = 0;
  }
  return material;
}


function getPlayerPosition() {
  var cs = window.game.cubeSize;
  var pos = window.game.controls.yawObject.position;
  return {
    x: pos.x / cs,
    y: pos.y / cs - 1.62,
    z: pos.z / cs
  };
}

// New chunk loading mechanism
window.chunkCache = {};
socket.on('chunkData', function(chunk) {
  console.log('chunkData', chunk.key, chunk.position, chunk.blocks.length);

  var voxels = new Int8Array(chunk.blocks.length);
  chunk.blocks.forEach(function(value, index) {
    voxels[index] = materialIndex(value);
  })

  chunkCache[chunk.key] = {
    voxels:voxels,
    dims:[32,32,32]
  };
  
  if (window.game) {
    window.game.voxels.emit('missingChunk', chunk.position.x/32, chunk.position.y/32, chunk.position.z/32);
  }
  // if (game && game.voxels.chunks[chunk.key] && game.voxels.chunks[chunk.key].tempChunk === true) {
  //   
  // }
})

// generateVoxelChunk: function() { console.log('generateVoxelChunk', Array.prototype.slice.call(arguments)); return window.game.voxels.generate(low, high, generate_blockCache) },
function voxelChunk_chuckCache(low, high, x, y, z) {
  console.log('generateVoxelChunk', Array.prototype.slice.call(arguments));
  var key = [x,y,z].join('|');
  // console.log('key: '+key)
  var chunk = chunkCache[key];
  if (!chunk) {
    // console.log('Missing chunk: '+key);
    socket.json.emit('missingChunk', [x,y,z])
    chunk = {
      voxels:new Int8Array(32*32*32),
      dims:[32,32,32],
      tempChunk:true
    };
    
    chunk.voxels[32*32*16] = 1;
  }
  
  return chunk;
  // from https://github.com/mikolalysenko/mikolalysenko.github.com/blob/master/MinecraftMeshes2/js/testdata.js#L4
  // function generate(l, h, f) {
  //   var d = [ h[0]-l[0], h[1]-l[1], h[2]-l[2] ]
  //   var v = new Int8Array(d[0]*d[1]*d[2])
  //   var n = 0
  //   for(var k=l[2]; k<h[2]; ++k)
  //   for(var j=l[1]; j<h[1]; ++j)
  //   for(var i=l[0]; i<h[0]; ++i, ++n) {
  //     v[n] = f(i,j,k,n)
  //   }
  //   return {voxels:v, dims:d}
  // }
}

function noop() {}