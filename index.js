module.exports = init;

function init(mineflayer) {
  return inject;
}

function inject(bot, options) {
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

  io.sockets.on('connection', function (socket) {
    // socket.emit('spawn', serializedPosition(bot.entity.position));
    // var area = [2,2,2]
    var area = [16,16,16]
    var start = bot.entity.position.offset(-area[0]/2, -area[1]/2, -area[2]/2).floored();
    var buffer = {
      start: serializedPosition(start),
      size: area,
      data: []
    }

    for (x = 0; x <= buffer.size[0]; ++x) {
      for (y = 0; y <= buffer.size[1]; ++y) {
        for (z = 0; z <= buffer.size[2]; ++z) {
          var pos = start.offset(x, y, z);
          var block = bot.blockAt(pos);
          // if (block.type !== 0) {
          //   socket.emit('blockUpdate', serializedBlock(block))
          // }
          // if (z === 0) console.log([buffer.start[0]+x, buffer.start[1]+y, buffer.start[2]+z])
          buffer.data.push(block.name);
        }
      }
    }
    // setTimeout(function() {
      socket.emit('blockMultiUpdate', buffer)
      socket.emit('spawn', serializedPosition(bot.entity.position));
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
