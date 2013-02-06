module.exports = init;

function init(mineflayer) {
  return function(bot, options) { return inject(mineflayer, bot, options) };
}

function inject(mineflayer, bot, options) {
  options = options || {};
  var path = require('path')
    , express = require('express')
    , app = express()
    , server = require('http').createServer(app)
    , io = require('socket.io').listen(server)
    , port = options.port || 0
    , host = options.host || '0.0.0.0'

  io.set('log level', 0);

  app.use(express.static(path.join(__dirname, 'public')));

  server.listen(port, function() {
    console.info("Listening at http://" + host + ":" + server.address().port);
  });

  var Vec3 = mineflayer.vec3.Vec3;
  var chunkSize = new Vec3(32, 32, 32);
  Vec3.prototype.chunkPosition = function() {
    var offset = this.modulus(chunkSize);
    return this.minus(offset).floored();
  }
  
  Vec3.prototype.toChunkCoordinate = function() {
    var offset = this.modulus(chunkSize);
    return this.minus(offset).scaled(1/32).floored();
  }
  
  Vec3.prototype.toVoxelCoordinate = function() {
    return this.scaled(32);
  }
  
  function getBlockInfo() {
    // get the highest block id
    var max = Object.keys(mineflayer.blocks)
      .map(function(v) { return parseInt(v, 10); })
      .reduce(function(max, other) { return Math.max(max, other) });
    // allocate array to hold the values
    var res = new Array(max+1);
    
    var blocks = mineflayer.blocks;
    for (var key in blocks) {
      if (blocks.hasOwnProperty(key)) {
        var obj = blocks[key];
        res[obj.id] = obj;
      }
    }

    return res;
  }
  
  // in chunk coordinates
  function getChunk(position) {
    var start = position.toVoxelCoordinate();
    var blocks = new Array(chunkSize.volume());
    // console.log('getChunk: '+start)
    var n = 0;
    for (z = 0; z < chunkSize.x; ++z) {
      for (y = 0; y < chunkSize.y; ++y) {
        for (x = 0; x < chunkSize.z; ++x, ++n) {
          var block = bot.blockAt(start.offset(x, y, z));
          if (!block) return undefined;
          blocks[n] = block.type;
        }
      }
    }
    
    var key = [position.x, position.y, position.z].join('|');
    
    return {
      position: start,
      key: key,
      blocks: blocks
    }
  }
  
  function sendSpawnChunks(socket, position) {
    var centerChunk = position.toChunkCoordinate();
    // console.log('centerChunk: '+centerChunk)
    var radius = 1;
    // var chunks = [];

    for (var x = -radius; x <= radius; ++x) {
      for (var y = -radius; y <= radius; ++y) {
        for (var z = -radius; z <= radius; ++z) {
          // console.log('chunk', [x,y,z])
          var chunk = getChunk(centerChunk.offset(x,y,z));
          if (chunk)
            socket.json.emit('chunkData', chunk);
          // console.log(mineflayer.vec3(x,y,z))
          // var chunk = getChunk(centerChunk.offset(x,y,z));
          // console.log('chunk', [x,y,z])
          // chunks.push(chunk);
        }
      }
    }
    
    // return chunks;
  }

  io.sockets.on('connection', function (socket) {
    console.log('bot.position: '+bot.entity.position)
    console.log('toChunkCoordinate: '+bot.entity.position.toChunkCoordinate())
    // socket.emit('spawn', serializedPosition(bot.entity.position));
    // var area = [2,2,2]
    // var botPosition = bot.entity.position.floored();
    // var chunkOffset = botPosition.modulus({x:32, y:32, z:32});
    // var chunkPosition = botPosition.minus(chunkOffset).scaled(1/32).floored();
    // console.log(botPosition, chunkOffset, chunkPosition);
    // console.log(bot.entity.position.chunkPosition())
    // process.exit(0)
    // var area = [32,32,32]
    // var start = bot.entity.position.offset(-area[0]/2, -area[1]/2, -area[2]/2).floored();
    // var buffer = {
    //   start: bot.entity,
    //   size: area,
    //   data: []
    // }
    // 
    // for (x = 0; x <= buffer.size[0]; ++x) {
    //   for (y = 0; y <= buffer.size[1]; ++y) {
    //     for (z = 0; z <= buffer.size[2]; ++z) {
    //       var pos = start.offset(x, y, z);
    //       var block = bot.blockAt(pos);
    //       // if (block.type !== 0) {
    //       //   socket.emit('blockUpdate', serializedBlock(block))
    //       // }
    //       // if (z === 0) console.log([buffer.start[0]+x, buffer.start[1]+y, buffer.start[2]+z])
    //       buffer.data.push(block.name);
    //     }
    //   }
    // }
    // setTimeout(function() {
      // socket.emit('blockMultiUpdate', buffer)
      // socket.emit
      // socket.emit('chunkData', getSpawnChunks(bot.entity.position));
      socket.json.emit('blockData', getBlockInfo());
      sendSpawnChunks(socket, bot.entity.position);
      socket.json.emit('spawn', serializedPosition(bot.entity.position));
    // }, 2000)

    bot.on('spawn', function() {
      socket.emit('spawn', serializedPosition(bot.entity.position));
    })
    
    bot.on('move', function() {
      socket.emit('entity', bot.entity);
    });

    bot.on('entitySpawn', function(entity) {
      socket.emit('entitySpawn', entity);
    });

    bot.on('entityGone', function(entity) {
      socket.emit('entityGone', entity);
    });

    bot.on('entityMoved', function(entity) {
      socket.emit('entityMoved', entity);
    });

    bot.on('blockUpdate', function(oldBlock, newBlock) {
      // console.log('blockUpdate new:'+(newBlock ? newBlock.name : '?')+' old:'+(oldBlock ? oldBlock.name : '?'))
      if (!newBlock) return;
      socket.emit('blockUpdate', serializedBlock(newBlock));
    })

    socket.on('controlState', function(state) {
      bot.setControlState(state.name, state.value);
    });

    socket.on('look', function(look) {
      bot.look(look.yaw, look.pitch);
    });

    socket.on('missingChunk', function(pos) {
      var chunk = getChunk(mineflayer.vec3(x,y,z));
      if (chunk)
        socket.json.emit('chunkData', chunk);
    })
    
    function serializedPosition(position) {
      return [position.x, position.y, position.z]
    }
    
    function serializedBlock(block) {
      return {
        name: block.name,
        position: serializedPosition(block.position)
      }
    }
    
  });
}
