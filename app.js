// "{"memory":{"programs":2,"geometries":1386,"textures":66},"render":{"calls":722,"vertices":212202,"faces":70734,"points":0}}"

var createGame = require('voxel-engine');
var highlight = require('voxel-highlight')
var voxelPlayer = require('voxel-player');
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
   // 'snow':0,
   /* 'rose':0,
    'flower':0,
    'sapling':0,
    'mushroom':0,
    'tallgrass':0,*/
    
    'stone': 1,
    'grass': 2,
    'dirt': 3,
    'stonebrick': 4,
   /* 'wood': 5,
    'bedrock': 7,
    'sand': 8,
    'gravel': 9,
    'oreGold': 10,
    'oreIron': 11,
    'oreCoal': 12,
    'oreLapis': 13,
    'oreDiamond': 14,*/
    'log': 15,
    //'leaves': 16,
    // 'glass': 17,
    // 'tallgrass': 18,
    // 'flower': 19,
    // 'rose': 20,
    // 'mushroom': 21,
    // 'torch': 22,
    // 'workbench': 22,
   // 'furnace': 23
  }[name]
  
  return mat !== undefined ? mat : 1;
}

socket.on('spawn', function(position) {
  pixelPosition = position.map(function(v) { return v*25; })
  pixelPosition[1] += 1.62*25;

  console.log('spawn:', position, pixelPosition);
  if (!window.game) {
    var game = createGame({
      generateVoxelChunk: voxelChunk_chuckCache,
      startingPosition: pixelPosition,
      worldOrigin: pixelPosition,

      texturePath: './assets/minecraft/textures/blocks/',
      materials: ['stone', ['grass_top', 'dirt', 'grass_side'], 'dirt', 'stonebrick', 'glass'],
      
      mesher: require('./transgreedy').mesher
    });
    game.gravity=[0, -0.0000036, 0];
      
    window.game = game;
    window.createVoxelPlayer = voxelPlayer(game);
      
    var container = document.querySelector('#gameCanvas')
    game.appendTo(container);

    // Blend top of grass with green color
    var biomeGreen = new game.THREE.Color(8368696);
    /*game.materials.get('grass_top')[2].color = biomeGreen;
    game.materials.get('leaves').forEach(function(material) {
      material.color = biomeGreen;
      material.ambient = biomeGreen;
      material.transparent = true;
    })*/
    
    highlight(game);
    game.on('mousedown', function (pos) {
      console.log(pos, game.getBlock(pos))
    });
    //game.view.renderer.sortObjects = false;

// Unmodifed    
// {"memory":{"programs":2,"geometries":695,"textures":60},
//  "render":{"calls":671,"vertices":238434,"faces":79478,"points":0}} 

// Material cache in texture
// {"memory":{"programs":2,"geometries":695,"textures":14},
//  "render":{"calls":671,"vertices":238434,"faces":79478,"points":0}} 

   /* setTimeout(function onStartupTimeout() {
      console.log(JSON.stringify(game.view.renderer.info));
    }, 1000);*/
  }
})

function lookAt(x, y, z) {
  var playerPosition = game.playerPosition();
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

window.vec3 = vec3
window.lookAt = lookAt
socket.on('entity', function onEntity(entity) {
  if (!window.bot) {
    console.log('Need to create me!')
    window.bot = createPlayer(entity);

    // Control the bot.
    game.control(window.bot)
    mountPoint = window.bot.avatar.cameraOutside
    mountPoint.add(game.camera)

    // -- control other object
    // var cameraGroup = new game.THREE.Object3D();
    // cameraGroup.position.copy(vec3(entity.position).offset(0,2,0).scaled(game.cubeSize));
    // 
    // var cameraEyes = new game.THREE.Object3D();
    // cameraEyes.name = 'eyes';
    // cameraEyes.position.set(0, 150, 0);
    // cameraEyes.rotation.x = -0.5
    // 
    // cameraGroup.add(cameraEyes);
    // cameraEyes.add(game.camera);
    // 
    // var physicalCamera = game.makePhysical(cameraGroup);
    // physicalCamera.subjectTo(new game.THREE.Vector3(0, -0.00009, 0));
    // physicalCamera.yaw = cameraGroup;
    // physicalCamera.pitch = cameraEyes;
    // 
    // game.scene.add(cameraGroup);
    // game.addItem(physicalCamera);
    // game.control(physicalCamera);
    
    // -- disconnected camera
    // game.camera.position.copy(vec3(entity.position).offset(0,10,0).scaled(game.cubeSize));
    // game.camera.rotation.x = -1.0;
    
    
  } else {
    setMobPosition(window.bot.avatar, entity);
  }
});

function createPlayer(entity) {
  if (!game) return;

  console.log('Creating '+entity.username);

  var player = createVoxelPlayer('/skins/'+entity.username+'.png');
  // player.possess
  setMobPosition(player, entity);
  return player;
}

function setMobPosition(mob, entity) {
  mob.position.copy(vec3(entity.position))
  // mob.rotation.y = entity.yaw+(Math.PI/2);
  mob.rotation.y = entity.yaw;
}

socket.on('entitySpawn', function onEntitySpawn(entity) {
  return;
  entities[entity.id] = entity;
  
  if (entity.type === 'player') {
    createPlayer(entity)
  }
});

socket.on('entityMoved', function onEntityMoved(entity) {
  return;
  if (entity.type === 'player') {
    var player = players[entity.id];
    if (!player) {
      player = createPlayer(entity);
      players[entity.id]=player;
    }
    if(player) setMobPosition(player.avatar, entity);
    // console.log(entity.username+' moved to '+vec3(player.avatar.position))
  }
  entities[entity.id] = entity;
});

socket.on('entityGone', function onEntityGone(entity) {
  delete entities[entity.id];
  var player = players[entity.id];
  if (player) {
    console.log('Removing '+entity.username)
    game.removeItem(player)
    game.scene.remove(player.avatar)
    delete players[entity.id];
  }
});

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

// New chunk loading mechanism
window.chunkCache = {};
socket.on('chunkData', function(chunk) {
  //console.log('chunkData', chunk.key, chunk.position, chunk.blocks.length);

  var voxels = new Int8Array(chunk.blocks.length);
  // var voxels = new Array(chunk.blocks.length);
  chunk.blocks.forEach(function(value, index) {
    voxels[index] = materialIndex(value);
  })

  chunkCache[chunk.key] = {
    position: [chunk.position.x/32, chunk.position.y/32, chunk.position.z/32],
    voxels: voxels,
    dims: [32,32,32]
  };
  
  if (window.game) {
    window.game.voxels.emit('missingChunk', [chunk.position.x/32, chunk.position.y/32, chunk.position.z/32]);
  }
})

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
