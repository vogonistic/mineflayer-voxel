// "{"memory":{"programs":2,"geometries":1386,"textures":66},"render":{"calls":722,"vertices":212202,"faces":70734,"points":0}}"

var createGame = require('voxel-engine');
var highlight = require('voxel-highlight')
var skin = require('minecraft-skin');
var vec3 = require('vec3');

  var io = window.io
  , socket = io.connect(undefined, {reconnect:false})
  , botEntity
  , entities = {}
  , players = {}

  window.players= players;

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
    'rose':0,
    'flower':0,
    'sapling':0,
    'mushroom':0,
    'tallgrass':0,
    
    'stone': 1,
    'grass': 2,
    'dirt': 3,
    'stonebrick': 4,
    'wood': 5,
    'bedrock': 7,
    'sand': 8,
    'gravel': 9,
    'oreGold': 10,
    'oreIron': 11,
    'oreCoal': 12,
    'oreLapis': 13,
    'oreDiamond': 14,
    'log': 15,
    'leaves': 16,
    // 'glass': 17,
    // 'tallgrass': 18,
    // 'flower': 19,
    // 'rose': 20,
    // 'mushroom': 21,
    // 'torch': 22,
    // 'workbench': 22,
    'furnace': 23
  }[name]
  
  return mat !== undefined ? mat : 1;
}

socket.on('spawn', function(position) {
  pixelPosition = position.map(function(v) { return v*25; })
  pixelPosition[1] += 1.62*25;

  console.log('spawn:', position, pixelPosition);
  if (!window.game) {
    var game = createGame({
      // generate: function() { return 0; },
      generateVoxelChunk: voxelChunk_chuckCache,
      startingPosition: pixelPosition,
      worldOrigin: pixelPosition,

      texturePath: './textures/blocks/',
      materials: ['stone', ['grass_top', 'dirt', 'grass_side'], 'dirt', 'stonebrick', 'wood', 'sapling', 'bedrock', 'sand', 'gravel', 'oreGold', 'oreIron', 'oreCoal', 'oreLapis', 'oreDiamond', ['tree_top', 'tree_top', 'tree_side'], 'leaves', 'glass', 'tallgrass', 'flower', 'rose', 'mushroom_brown', 'torch', ['workbench_top', 'workbench_top', 'workbench_side'], ['furnace_top', 'furnace_side', 'furnace_front']],
      // materialParams: { transparent: false }
      
      mesher: require('./transgreedy').mesher,
      // controlOptions: {
      //   gravityEnabled: false
      // }
    })
      
    game.renderer.sortObjects = false
      
    var container = document.querySelector('#gameCanvas')
    game.appendTo(container)
    container.addEventListener('click', function() {
      game.requestPointerLock(container)
    });
      
    window.game = game;

    // Blend top of grass with green color
    var biomeGreen = new game.THREE.Color(8368696);
    game.materials.get('grass_top')[2].color = new game.THREE.Color(8368696)
    game.materials.get('leaves').forEach(function(material) {
      material.color = biomeGreen;
      material.ambient = biomeGreen;
      material.transparent = true;
    })
    
    highlight(game);
    game.on('mousedown', function (pos) {
      // var vertexPos = vec3(pos).scaled(1/25).floored();
      // var chunkPos = vertexPos.scaled(1/32).floored();
      // console.log('mousedown', pos, vertexPos, chunkPos);
      // var key = [chunkPos.x, chunkPos.y, chunkPos.z].join('|');
      // console.log(key)
      console.log(pos, game.getBlock(pos))
    });
  }

  // Look down at the ground
  // window.game.controls.pitchObject.rotation.x = -1.5

  var groundPos = window.game.tilespaceToWorldspace(position[0], position[1] - 1, position[2])
  console.log('ground: ',groundPos)
  window.game.setBlock(groundPos, 1);
})

function lookAt(x, y, z) {
  var playerPosition = getPlayerPosition();
  var target = vec3(x, y, z);
  var delta = target.minus(playerPosition);
  // var delta = playerPosition.minus(target)
  
  // var delta = point.minus(bot.entity.position.offset(0, bot.entity.height, 0));
  var yaw = Math.atan2(-delta.x, -delta.z);
  var groundDistance = Math.sqrt(delta.x * delta.x + delta.z * delta.z);
  var pitch = Math.atan2(delta.y, groundDistance);

  lookIn(yaw, pitch)
}

function lookIn(yaw, pitch) {
  game.controls.yawObject.rotation.y = yaw;
  game.controls.pitchObject.rotation.x = pitch;
}

function setCameraPosition(controls, entity) {
  controls.pitchObject.rotation.x = entity.pitch;
  controls.yawObject.rotation.y = entity.yaw;
  
  var newPosition = vec3(entity.position).offset(0, game.playerHeight, 0).scaled(game.cubeSize);
  controls.yawObject.position.copy(newPosition);
}

window.vec3 = vec3
window.lookAt = lookAt
window.getPlayerPosition = getPlayerPosition
socket.on('entity', function (entity) {
  if (!window.bot) {
    window.bot = createPlayer(entity);
  }
  setMobPosition(window.bot, entity);

  // botEntity = newEntity;
  // setCameraPosition(game.controls, botEntity);
});

function createPlayer(entity) {
  if (!game) return;

  console.log('Creating '+entity.username);
  var player = skin(game.THREE, '/skins/'+entity.username+'.png');
  setMobPosition(player, entity);
  player.mesh.scale.set(1.4, 1.4, 1.4)
  game.scene.add(player.mesh);
  players[entity.id] = player;
  
  return player;
}

function setMobPosition(mob, entity) {
  mob.mesh.position.copy(vec3(entity.position).offset(0,mob.mesh.scale.y/2,0).scaled(game.cubeSize));
  mob.mesh.rotation.y = entity.yaw+(Math.PI/2);
  // mob.mesh.position.set(7100, 2050, 6547)
}

socket.on('entitySpawn', function (entity) {
  entities[entity.id] = entity;
  
  if (entity.type === 'player') {
    createPlayer(entity)
  }
});

socket.on('entityMoved', function (entity) {
  if (entity.type === 'player') {
    var player = players[entity.id];
    if (!player) {
      player = createPlayer(entity)
    }
    setMobPosition(player, entity);
    console.log(entity.username+' moved to '+vec3(player.mesh.position))
  }
  entities[entity.id] = entity;
});

socket.on('entityGone', function(oldEntity) {
  delete entities[oldEntity.id];
});
  
socket.on('blockUpdate', function(block) {
  // console.log('blockUpdate', block)
  var type = materialIndex(block.name);
  var pos = vec3(block.position).scaled(game.cubeSize);
  if (type !== -1) {
    game.setBlock(pos, type);
  }
})
  
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
  return vec3(pos.x / cs, pos.y / cs, pos.z / cs);
}

// New chunk loading mechanism
window.chunkCache = {};
socket.on('chunkData', function(chunk) {
  console.log('chunkData', chunk.key, chunk.position, chunk.blocks.length);

  var voxels = new Int8Array(chunk.blocks.length);
  // var voxels = new Array(chunk.blocks.length);
  chunk.blocks.forEach(function(value, index) {
    voxels[index] = materialIndex(value);
  })

  chunkCache[chunk.key] = {
    position: chunk.position,
    voxels: voxels,
    dims: [32,32,32]
  };
  
  if (window.game) {
    window.game.voxels.emit('missingChunk', chunk.position.x/32, chunk.position.y/32, chunk.position.z/32);
  }
})

// generateVoxelChunk: function() { console.log('generateVoxelChunk', Array.prototype.slice.call(arguments)); return window.game.voxels.generate(low, high, generate_blockCache) },
function voxelChunk_chuckCache(low, high, x, y, z) {
  // console.log('generateVoxelChunk', Array.prototype.slice.call(arguments));
  var key = [x,y,z].join('|');
  // console.log('key: '+key)
  var chunk = chunkCache[key];
  if (!chunk) {
    // console.log('Missing chunk: '+key);
    socket.json.emit('missingChunk', [x,y,z])
    chunk = {
      position:[x,y,z],
      voxels:new Int8Array(32*32*32),
      dims:[32,32,32],
      empty:true
    };
  }
  
  return chunk;
}

function noop() {}
