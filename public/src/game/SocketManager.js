/*global prompt,io, G_mapName, G_fbid*/
(function(io) {
  "use strict";

  function SocketManager(gameInstance) {
    this.gameInstance = gameInstance;
    this.init_done = false;
    this.socketCounter = 0;
    this.counterGameInfo = 0;
    this.timestamp = new Date().getTime();
    this.msg_id = 0;
    this.$socketps = $('#socketps');        
    
    return this;
  }
  
  SocketManager.prototype.init = function(onInitCallback) {
    var host = window.location.hostname;
    this.onInitCallback = onInitCallback;
    this.connection = io.connect(host);
    this.connection.on('connect', this.onConnected.bind(this));
  };
    
  SocketManager.prototype.handReceivedGameInfo = function(gameInfo) {
    this.gameInstance.handReceivedGameInfo(gameInfo);
    this.counterGameInfo += 1;
  };

  SocketManager.prototype.handleReceivedObjects = function(objects) {
    this.gameInstance.handleReceivedObjects(objects);

    $('#debug-sockets').html(JSON.stringify(_.map(objects, function(list) {
      return list ? list.length : 0;
    }).concat([this.counterGameInfo])));
    
    var now = Date.now();
    if (now - this.timestamp > 1000) {
      this.timestamp = now;
      this.$socketps.html('socket/ps: ' + this.socketCounter);
      this.socketCounter = 0;
    }
    this.socketCounter += 1;
  };

  SocketManager.prototype.onConnected = function() {
    this.setupHandlers();  

    if (!_.isUndefined(G_mapName)) {
      if (!Karma.LocalStorage.get('playerName') || Karma.LocalStorage.get('playerName').length === 0) {
        Karma.LocalStorage.set('playerName', prompt('Welcome to Karmaracer !\nWhat\'s your name ?'));
      }
      this.connection.emit('enter_map', G_mapName, Karma.LocalStorage.get('playerName'));
      announce($.i18n.prop('game_startmessage') + '</br>' + Karma.TopBar.getHelps(), 'blue');
    }
    
    clearInterval(this.pingInterval);
    this.ping();
    this.pingInterval = setInterval(this.ping.bind(this), 1000);
  };

  SocketManager.prototype.onInit = function(initInfo) {
    var that = this;

    this.connection.emit('init_done');

    $(window).on('beforeunload', function() {
      that.connection.emit('disconnect');
    });

    function setupBotMenu() {
      var $botmenu = $('#botMenu');
      var $addBot = $('<button id="#addBot" class="nativeTouchEnabled">' + $.i18n.prop('bots_add') + '</button>');
      var $removeBot = $('<button id="#removeBot"  class="nativeTouchEnabled">' + $.i18n.prop('bots_remove') + '</button>');

      $botmenu.append($addBot);
      $botmenu.append($removeBot);
      $addBot.click(function() {
        that.connection.emit('add bot');
      });
      $removeBot.click(function() {
        that.connection.emit('remove bot');
      });
    }

    setupBotMenu();    
    this.init_done = true;
    this.onInitCallback(null, initInfo);
  };
  
  SocketManager.prototype.ping = function() {
    var that = this;
    var clock = that.gameInstance.clockSync;
    var req = {
      clientSent: Date.now()
    };
    this.connection.emit('ping', req, function(err, res) {
      if (!err) {
        res.clientReceived = Date.now();
        clock.pong(res);
      }
    });
  };

  SocketManager.prototype.getConnection = function() {
    return this.connection;
  };

  SocketManager.prototype.emit = function(key, data) {
    this.connection.emit(key, data);
  };
  
  SocketManager.prototype.setupHandlers = function() {
    var that = this;
    
    this.connection.on('init', this.onInit.bind(this));
    
    this.connection.on('chat_msg', function(msg) {
      that.gameInstance.chat.onChatMsgReceived(msg);
    });

    this.connection.on('car_killed', function(data) {
      var msg = $.i18n.prop('game_take_soul_broadcast', data.attacker.name, data.victim.name);
      if (data.victim.fbId !== 0) {
        Karma.Facebook.takeSoul(data.victim.fbId);
      }
      that.gameInstance.pointsManager.add(data.victim);
      that.gameInstance.chat.onChatMsgReceived(msg, 'gameMessage');
    });
    
    this.connection.on('moneyUpdated', function(user) {
      Karma.TopBar.setKarma(user);
    });

    this.connection.on('dead', function() {
      announce($.i18n.prop('game_playerdie'), 'red');
    });

    this.connection.on('game end', function(d) {
      $('table.scores').addClass('big').removeClass('default');
      // $('#topBar').toggleClass('init');

      var removeBigScore = function() {
        $('table.scores').removeClass('big').addClass('default');
      };

      var updateScoreInTopBar = function() {
        Karma.FB.updateScoreInTopBar(G_fbid);
      };

      var msg = $.i18n.prop('game_winsthegame', d.winnerName);
      announce(msg, 'black', 'freeze');
      announceIn('2', 'red', 3, 'freeze', updateScoreInTopBar);
      announceIn('1', 'orange', 4, 'freeze', removeBigScore);
      announceIn($.i18n.prop('game_go'), 'green', 5, '');

    });

    this.connection.on('gameInfo', this.handReceivedGameInfo.bind(this));
    
    this.connection.on('objects', this.handleReceivedObjects.bind(this));

    this.connection.on('explosion', function(explosion) {
      if (that.gameInstance.drawEngine) {
        that.gameInstance.drawEngine.addExplosion(explosion);        
      }
    });
  };

  function announce(text, color, extraClass) {
    if (KLib.isUndefined(extraClass)) {
      extraClass = '';
    }
    $('#announce').remove();
    var div = $('<div id="announce" class="announce ' + extraClass + ' announce-' + color + '"><span>' + text + '</span></div>');
    div.appendTo($('body'));
    setTimeout(function() {
      $('#announce').fadeOut(function() {
        $('#announce').remove();
      });
    }, 4000);
  }

  function announceIn(msg, color, timeInSeconds, extraClass, callback) {
    setTimeout(function() {
      announce(msg, color, extraClass);
      if (KLib.isFunction(callback)) {
        return callback(null);
      }
    }, timeInSeconds * 1000);
  }

  Karma.SocketManager = SocketManager;
}(io));