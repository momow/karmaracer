var config = require('./../config');
var botNames = require('./botNames');
var Bot = require('./classes/Bot/Bot');
var DummyBot = require('./classes/Bot/DummyBot');

var BotManager = function(gameServer) {
  this.gameServer = gameServer;
  this.bots = {};
  if(!config.noBots) {
    this.initBots();
  }
}

BotManager.prototype.resetBots = function() {
  for(var i in this.bots) {
    var bot = this.bots[i];
    bot.playerCar.reset();
  }
};

BotManager.prototype.initBots = function() {
  var mapSize = this.gameServer.map.size.w * this.gameServer.map.size.h;
  var botDensity = config.botDensity;
  var numBots = Math.ceil(mapSize * botDensity) + 3;
  var interval = 0;
  numBots = config.botsPerMap;
  for(var i = 0; i < numBots; ++i) {
    if (config.performanceTest) {
      this.addBot();
    } else {
      setTimeout(function() {
        this.addBot();
      }.bind(this), interval);
      interval += 500;
    }
  }
}

BotManager.prototype.tick = function() {
  for(var i in this.bots) {
    var bot = this.bots[i];
    bot.tick();
  }
}

BotManager.prototype.getBotName = function() {
  var botName;
  var usedBotNames = Object.keys(this.bots);
  while(!botName || usedBotNames.indexOf(botName) != -1) {
    var index = Math.floor(Math.random() * botNames.length);
    botName = botNames[index];
  }
  return botName;
}

BotManager.prototype.addBotWithClass = function(botClass) {
  var b, name;
  name = this.getBotName();
  b = new botClass(this.gameServer, name);
  this.bots[b.id] = b;
}

BotManager.prototype.addBot = function() {
  this.addBotWithClass(Bot);
}

BotManager.prototype.addDummyBot = function() {
  this.addBotWithClass(DummyBot);
}

BotManager.prototype.removeBot = function(gameServer) {
  // remove the first bot added
  for(var id in this.bots) {
    this.bots[id].playerCar.car.scheduleForDestroy();
    delete this.bots[id];
    return;
  }
}

module.exports = BotManager;