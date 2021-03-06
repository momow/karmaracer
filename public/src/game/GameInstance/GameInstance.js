(function() {
  /*global G_mapName*/
  "use strict";

  function GameInstance() {
    this.config = undefined; // will be defined by onInitReceived
    this.snapshots = {};
    this.items = {};
    this.myCar = null;
    this.items.cars = [];
    this.items.explosions = {};
    this.items.myCar = null;
    this.items.projectiles = [];
    this.points = {};
    this.worldInfo = {};
    this.pointsID = 0;
    this.drawEngine = null;
    this.isMobile = false;
    this.frames = 0;
    this.timer = Date.now();    
    this.pointsManager = new Karma.PointsManager();
    this.scoreTable = Karma.ScoreTable;
    this.scoreTable.setup();
    this.clockSync = new Karma.ClockSync();
    this.interpolator = new Karma.Interpolator(this);
    this.socketManager = new Karma.SocketManager(this);

    this.socketManager.init(this.onInitReceived.bind(this));

    this.gv = new Karma.GunViewer($('body'), this.socketManager.connection);
    this.chat = new Karma.ChatController();
  }
  
  GameInstance.prototype.handReceivedGameInfo = function(gameInfo) {
    this.gameInfo = gameInfo;
    this.scoreTable.updateScoresHTML(gameInfo, this.items, this.myCar);
  };

  GameInstance.prototype.handleReceivedObjects = function(objects) {
    this.snapshots[objects.snapshot.stepNum] = objects.snapshot;
    if (typeof this.userCommandManager !== 'undefined') {
      this.userCommandManager.synchronizeMyCar(objects.myCar);
    }
    var myCar = objects.myCar;
    if (myCar) {
      var player = this.gameInfo[myCar.id];
      this.gv.show();
      this.gv.updateEnergy(player.weaponName, myCar.gunLife);      
    } else {
      this.gv.hide();
    }
    this.items.projectiles = objects.projectiles;
    this.items.collisionPoints = objects.collisionPoints;
  };  
  
  GameInstance.prototype.onInitReceived = function(err, initInfo) {
    var worldInfo = initInfo.worldInfo;
    var config = initInfo.config;
    var objects = initInfo.objects;
    
    this.config = config;
    Karma.TopBar.setTopBar(this.socketManager.connection);
    var that = this;
    this.worldInfo = worldInfo;
    this.engine = new Karma.Engine(worldInfo.map.size, worldInfo.map); // physics engine
    this.bullets = [];
    this.rockets = [];
    this.gameInfo = null; // is set from sockets
    
    this.handReceivedGameInfo(worldInfo.gameInfo);
    this.handleReceivedObjects(objects);
    
    var drawEngineType = window.G_defaultDrawEngineType;
    
    this.loadCars();
    
    if (drawEngineType == 'WEBGL' && $('#use_mouse_for_direction').is(':checked')) {
      $('#use_mouse_for_direction').attr('checked', false);
    }
    
    Karma.getDrawEngine(false, 'game-canvas', drawEngineType, that.items, that.worldInfo, 32, this, that.socketManager.connection, this.onDrawEngineReady.bind(this));

    if (that.isMobile === false) {
      this.minimap = new Karma.Minimap($('body'), G_mapName, that.socketManager.connection, that.items, that);
    }
  };
  
  GameInstance.prototype.onDrawEngineReady = function(err, drawEngine) {
    this.drawEngine = drawEngine;
    $('#loadingtext').html('');      
    this.userCommandManager = new Karma.UserCommandManager_client(this);
    this.keyboardHandler = new Karma.KeyboardHandler(this);
    document.onkeydown = this.keyboardHandler.handleKeyDown.bind(this.keyboardHandler);
    document.onkeyup = this.keyboardHandler.handleKeyUp.bind(this.keyboardHandler);
    this.tick();    
  };
  
  GameInstance.prototype.loadCars = function() {
    var that = this;

    var getCarFromDb = function(carDb) {
      carDb.image = new Image();
      carDb.image.src = carDb.path;
      return carDb;
    };

    var conn = this.socketManager.connection;

    if (!KLib.isUndefined(conn)) {
      conn.emit('getCars', function(err, cars) {
        if (err) {
          Karma.Log.error(err);
          return;
        }
        var _cars = {};
        for (var i = 0; i < cars.length; i++) {
          var car = cars[i];
          _cars[car.name] = getCarFromDb(car);
        }
        that.cars = _cars;
      });
    }
  };
  
  GameInstance.prototype.tick = function() {
    var now = Date.now();
    this.now = now;
    requestAnimFrame(this.tick.bind(this));

    var ucm = this.userCommandManager;
    if (ucm) {
      this.tickCptDrive = this.tickCptDrive === undefined ? 0 : this.tickCptDrive + 1;    
      if (this.tickCptDrive >= 3) {
        ucm.generateUserCommand(now);
        this.tickCptDrive = 0;
      }
      this.interpolator.getInterpData();
      ucm.updatePos(now);
    }        
    
    this.frames++;
    if (now - this.timer > 1000) {
      this.timer = now;
      this.fps = this.frames;
      $('#fps').html('fps: ' + this.fps);
      this.frames = 0;
    }    
    
    this.drawEngine.tick();    
    if (this.minimap) {
      this.minimap.tick();
    }
  };

  Karma.GameInstance = GameInstance;

}());