module.exports = init;

var child_process = require('child_process');
var http = require('http');
var fs = require('fs');

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
    , host = options.host || '0.0.0.0';

  io.set('log level', 0);

  if (!options.disableLogging) {
    app.use(require("morgan")('tiny'));
  }

  // Serve out textures and such
  app.use(express.static(path.join(__dirname, 'public')));
  
  // Browservify the voxel code
  app.get('/client.js', function(req, res){
    res.writeHead(200, {'Content-Type':'application/javascript'});
    browserify = child_process.spawn('browserify', [path.join(__dirname, 'app.js')]);
    browserify.stdout.pipe(res);
    browserify.stderr.pipe(process.stdout)
    browserify.on('exit', function (code, signal) {
      console.log('child process terminated due to receipt of signal '+signal+', and code '+code);
    });
    
  });
  
  // Proxy skin requests
  app.get('/skin/:username.png', function(req, res) {
    var skinUrl = 'http://skins.minecraft.net/MinecraftSkins/'+req.params.username+'.png';
    http.get(skinUrl, function(mojang_res) {
      if (mojang_res.statusCode === 200) {
        res.writeHead(200, {'content-type':'image/png'});
        mojang_res.pipe(res);
      } else {
        fs.readFile(path.join(__dirname, 'public/char.png'), function(err, data) {
          if (err) {
            res.writeHead(404);
            res.end();
          } else {
            res.writeHead(200, {'content-type':'image/png'});
            res.write(data);
            res.end();
          }
        })
      }
    });
  });

  server.listen(port, function() {
    console.info("Listening at http://" + host + ":" + server.address().port);
  });

  var Vec3 = mineflayer.vec3.Vec3;
  var chunkSize = new Vec3(32, 32, 32);
  Vec3.prototype.chunkPosition = function() {
    var offset = this.modulus(chunkSize);
    return this.minus(offset).floored();
  };
  
  Vec3.prototype.toChunkCoordinate = function() {
    var offset = this.modulus(chunkSize);
    return this.minus(offset).scaled(1/32).floored();
  };
  
  Vec3.prototype.toVoxelCoordinate = function() {
    return this.scaled(32);
  };
  
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
          if (chunk) {
            socket.json.emit('chunkData', chunk);
          }
        }
      }
    }
    
    // return chunks;
  }

  io.sockets.on('connection', function (socket) {
    socket.json.emit('blockData', getBlockInfo());
    sendSpawnChunks(socket, bot.entity.position);
    socket.json.emit('spawn', serializedPosition(bot.entity.position));

    bot.on('spawn', function() {
      socket.emit('spawn', serializedPosition(bot.entity.position));
    });
    
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
    });

    socket.on('controlState', function(state) {
      bot.setControlState(state.name, state.value);
    });

    socket.on('look', function(look) {
      bot.look(look.yaw, look.pitch);
    });

    socket.on('missingChunk', function(pos) {
      var chunk = getChunk(mineflayer.vec3(pos[0],pos[1],pos[2]));
      if (chunk)
        socket.json.emit('chunkData', chunk);
    });
    
    function serializedPosition(position) {
      return [position.x, position.y, position.z]
    }
    
    function serializedBlock(block) {
      return {
        name: block.name,
        type: block.type,
        position: serializedPosition(block.position)
      }
    }
    
  });
}
