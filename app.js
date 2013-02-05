var createGame = require('voxel-engine')
  var io = window.io
  , socket = io.connect(undefined, {reconnect:false})
  , botEntity
  , entities = {}

socket.on('spawn', function(position) {
  pixelPosition = position.map(function(v) { return v*25; })
  pixelPosition[1] += 1.62*25;
  console.log('spawn:', position, pixelPosition);
  if (!window.game) {
    var game = createGame({
      // generate: function() { return 0; },
      generate: generate_blockCache,
      startingPosition: pixelPosition,
      worldOrigin: pixelPosition,

      texturePath: './textures/blocks/',
      materials: ['dirt', ['grass_top', 'dirt', 'grass_side'], ['tree_top', 'tree_top', 'tree_side'], 'leaves', 'stone', 'wood'],
      materialParams: { transparent: false }
    })
      
    var container = document.querySelector('#gameCanvas')
    game.appendTo(container)
    container.addEventListener('click', function() {
      game.requestPointerLock(container)
    });
      
    window.game = game;
  }

  // Look down at the ground
  // window.game.controls.pitchObject.rotation.x = -1.5

  var groundPos = window.game.tilespaceToWorldspace(position[0], position[1] - 1, position[2])
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
  
socket.on('blockUpdate', function(block) {
  var type = materialIndex(block.name);
  var pos = positionToVector3(block.position);
  if (type !== -1) {
    var voxel = window.game.voxels.voxelAtPosition(pos);
    if (!voxel) {
      window.game.voxels.requestMissingChunks(pos);
    }

    window.game.setBlock(positionToVector3(block.position), type);
  } else {
    console.log('blockUpdate: '+block.name+' ('+type+')', pos);
  }
})
  
var blockCache = {}
window.blockCache = blockCache
window.hits = 0;
socket.on('blockMultiUpdate', function(data) {
  window._testdata = data
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
    window.hits ++;
    material = materialIndex(cachedBlock.name);
    if (material === -1) material = 0;
  }
  return material;
}

function positionToVector3(position) {
  var cubeSize = window.game !== undefined ? window.game.cubeSize : 25;
  return {
    x: position[0]*cubeSize,
    y: position[1]*cubeSize, 
    z: position[2]*cubeSize
  }
}

function materialIndex(name) {
  return {
    'air':0,
    'snow':0,
    'dirt': 1,
    'grass': 2,
    'log': 3,
    'leaves': 4,
    'stone': 5,
    'wood': 6
  }[name] || -1;
}

function getPlayerPosition() {
  var cs = window.game.cubeSize;
  var pos = window.game.controls.yawObject.position;
  return {
    x: pos.x / cs,
    y: pos.y / cs - 1.5,
    z: pos.z / cs
  };
}

function noop() {}