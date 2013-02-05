var mineflayer = require('mineflayer');
var vec3 = mineflayer.vec3;
var navigatePlugin = require('mineflayer-navigate')(mineflayer);
var voxelPlugin = require('./index.js')(mineflayer);
var bot = mineflayer.createBot();

navigatePlugin(bot);
voxelPlugin(bot, {port: 13333});

bot.navigate.on('pathPartFound', function (path) {
  bot.chat("Going " + path.length + " meters in the general direction for now.");
});
bot.navigate.on('pathFound', function (path) {
  bot.chat("I can get there in " + path.length + " moves.");
});
bot.navigate.on('cannotFind', function () {
  bot.chat("unable to find path");
});
bot.navigate.on('arrived', function () {
  bot.chat("I have arrived");
});
bot.navigate.on('stop', function() {
  bot.chat("stopping");
});
var lookInterval, lookTarget;
bot.on('chat', function(username, message) {
  if (username === bot.username) return;
  var target = bot.players[username].entity;
  if (message === 'come') {
    bot.navigate.to(target.position);
  } else if (message === 'stop') {
    bot.navigate.stop();
    bot.clearControlStates();
    clearInterval(lookInterval);
  } else if (message === 'watch') {
    clearInterval(lookInterval);
    lookInterval = setInterval(look, 100);
    lookTarget = target;
  }
});

function look() {
  bot.lookAt(lookTarget.position.offset(0, lookTarget.height, 0));
}
