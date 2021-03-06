// o--------------->
// |  map  |       x
// |_______|
// |
// |
// v y

(function() {
  "use strict";

  function Engine2DCanvas(isMinimap, canvas, canvasID, items, worldInfo, gScale, gameInstance, connection, callback) {
    this.isMinimap = isMinimap;
    this.canvas = canvas;
    this.canvasID = canvasID;
    this.gameInstance = gameInstance;    
    this.fps = undefined; // will be defined by requestAnimFrame
    this.debugDraw = false;
    this.carFlameTicks = {};
    this.interpolator = this.gameInstance.interpolator;

    this.items = items;
    this.worldInfo = worldInfo;
    this.connection = connection;
    this.setGScale(gScale);
    this.$canvas = $(canvas);
    this.$canvas.focus();
    this.loaded();
    
    return this;
  }

  Engine2DCanvas.prototype.setGScale = function(gScaleValue) {
    this.gScaleValue = gScaleValue;
    this.gScaleList(this.worldInfo.staticItems);
    this.gScale(this.worldInfo.size);
  };

  Engine2DCanvas.prototype.scalePos = function(pos) {
    return {
      x: pos.x * this.gScaleValue,
      y: pos.y * this.gScaleValue,
      r: pos.r
    };
  };

  Engine2DCanvas.prototype.loadImages = function(callback) {

    var that = this;

    var imagesNumToLoad = Object.keys(this.worldInfo.staticItemTypes).length + 1;
    var imageNumLoaded = 0;

    function imageLoaded() {
      if (imageNumLoaded === imagesNumToLoad - 1) {
        if (KLib.isFunction(callback)) {
          return callback();
        }
      }
      imageNumLoaded += 1;
    }

    that.createBGPattern(imageLoaded);
    // enhance items with patterns

    var onLoadImage = function() {
      var img = this.img;
      if (this.patternType !== 'none') {
        var _pattern = that.ctx.createPattern(img, 'repeat');
        that.worldInfo.staticItemTypes[this.name].pattern = _pattern;
        that.worldInfo.staticItemTypes[this.name].img = img;
      } else {
        that.worldInfo.staticItemTypes[this.name].pattern = null;
      }
      imageLoaded();
    };

    for (var itemName in this.worldInfo.staticItemTypes) {
      var item = this.worldInfo.staticItemTypes[itemName];
      item.img = new Image();
      item.img.src = item.image.path;
      item.img.onload = onLoadImage.bind(item);
    }

  };

  Engine2DCanvas.prototype.createBGPattern = function(callback) {
    var that = this;
    // create background pattern
    var bgImage = new Image();
    bgImage.src = that.worldInfo.map.background.path;
    bgImage.onload = function() {
      var bgPattern = that.ctx.createPattern(this, 'repeat');
      that.backgroundPattern = bgPattern;
      return callback();
    };
  };

  Engine2DCanvas.prototype.gScaleList = function(list) {
    for (var i = list.length - 1; i >= 0; i--) {
      this.gScale(list[i]);
    }
  };


  Engine2DCanvas.prototype.gScale = function(e) {
    if (e === null) {
      return;
    }
    if (e.x) {
      e.x *= this.gScaleValue;
    }
    if (e.y) {
      e.y *= this.gScaleValue;
    }
    if (e.w) {
      e.w *= this.gScaleValue;
    }
    if (e.h) {
      e.h *= this.gScaleValue;
    }
  };

  Engine2DCanvas.prototype.init = function(callback) {
    this.ctx = this.canvas.getContext('2d');
    this.ctx.font = '10px Trebuchet MS';
    this.canvas.width = this.$canvas.width();
    this.canvas.height = this.$canvas.height();
    this.camera = new Karma.Camera(this.ctx, '#' + this.canvasID);
    this.camera.setWorldSize(this.worldInfo.size);
    this.explosionImage = new Image();
    this.explosionImage.src = '/sprites/explosion.png';
    this.rocketImage = new Image();
    this.rocketImage.src = '/sprites/rocket.png';
    this.gunFlameImage = new Image();
    this.gunFlameImage.src = '/sprites/gun_flame.png';
    this.$window = $(window);
    if (!this.isMinimap) {
      this.initExplosions();      
    }
    this.loadImages(callback);    
  };

  Engine2DCanvas.prototype.loaded = function() {
    Karma.Loading.remove();
  };

  Engine2DCanvas.prototype.resize = function() {
    var size = {
      w: this.$canvas.width(),
      h: this.$canvas.height()
    };
    if (!KLib.isUndefined(this.canvasSize)) {
      size = this.canvasSize;
    }
    this.camera.ctx.canvas.width = size.w;
    this.camera.ctx.canvas.height = size.h;
  };

  Engine2DCanvas.prototype.updateCameraCenter = function() {
    if (this.isMinimap === false && this.gameInstance) {
      var newCenter = this.oldCenter;
      if (this.gameInstance.myCar) {
        var pos = this.scalePos(this.gameInstance.myCar);
        newCenter = {
          x: pos.x,
          y: pos.y
        };
      }
      this.camera.update(newCenter);
      if (newCenter && newCenter != this.oldCenter) {
        this.oldCenter = newCenter;
      }
    }
  };

  Engine2DCanvas.prototype.draw = function() {
    if (this.worldInfo.staticItems.length > 0) {
      this.resize();
      this.updateCameraCenter();
    }
    this.drawItems();
  };

  var explosionWidth = 56;
  var explosionHeight = 51;

  Engine2DCanvas.prototype.drawExplosions = function(ctx) {
    if (this.isMinimap === true) {
      return;
    }
    if (this.items.explosions !== null) {
      ctx.fillStyle = '#FFFFFF';
      for (var i in this.items.explosions) {
        var c = this.items.explosions[i];
        var pos = {
          x: this.gScaleValue * c.x,
          y: this.gScaleValue * c.y
        };
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.r);
        var h = explosionHeight;
        var w = explosionWidth;
        ctx.globalAlpha = c.alpha;
        ctx.drawImage(this.explosionImage, 0, 0, w, h, -h / 2, -h / 2, w, h);
        ctx.restore();
      }
    }
  };


  Engine2DCanvas.prototype.drawProjectiles = function(ctx) {
    if (this.items.projectiles !== null) {
      for (var i = 0; i < this.items.projectiles.length; i++) {
        var c = this.items.projectiles[i];
        var pos = {
          x: c.x * this.gScaleValue,
          y: c.y * this.gScaleValue
        };
        switch (c.name) {
          case 'rocket launcher':
            this.drawRocket(c, ctx);
            break;
          default:
            this.drawBullet(c, ctx, pos);
            break;
        }
      }
    }
  };

  Engine2DCanvas.prototype.drawBullet = function(bullet, ctx, pos) {
    ctx.fillStyle = '#0F0';
    var c = bullet;
    ctx.save();
    ctx.beginPath();
    var a = c;
    ctx.translate(pos.x, pos.y);
    ctx.moveTo(0, 0);
    ctx.rotate(a.r);
    // ctx.moveTo(-320, 0);
    ctx.lineTo(320, 0);
    ctx.closePath();
    // ctx.stroke();

    ctx.restore();
  };

  Engine2DCanvas.prototype.drawRocket = function(rocket, ctx) {

    ctx.fillStyle = '#FFFFFF';
    var c = rocket;
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.r);
    ctx.drawImage(this.rocketImage, -c.w / 2, -c.h / 2, 40, 16);
    // ctx.drawImage(this.rocketImage, 0, 0, c.w, c.h);
    ctx.restore();

  };

  Engine2DCanvas.prototype.drawOutsideWalls = function(ctx) {
    var wThickness = this.gScaleValue;
    var s = this.camera.realWorldSize;
    if (this.debugDraw) {
      ctx.fillStyle = '#00FF00';
    } else {
      ctx.fillStyle = this.worldInfo.staticItemTypes.outsideWall.pattern;
    }

    // bot
    ctx.fillRect(-wThickness, s.h, s.w + 2 * wThickness, wThickness);
    // top
    ctx.fillRect(-wThickness, -wThickness, s.w + 2 * wThickness, wThickness);
    // left
    ctx.fillRect(-wThickness, 0, wThickness, s.h);
    // right
    ctx.fillRect(s.w, 0, wThickness, s.h);
  };

  Engine2DCanvas.prototype.drawStaticItems = function(ctx) {
    var that = this;
    if (that.worldInfo.staticItems !== null) {
      _.each(that.worldInfo.staticItems, function(c) {
        var staticItem = that.worldInfo.staticItemTypes[c.name];

        if (!KLib.isUndefined(staticItem) && !KLib.isUndefined(staticItem.pattern)) {
          if (staticItem.pattern === null) {
            ctx.drawImage(staticItem.img, c.x - c.w / 2, c.y - c.h / 2, c.w, c.h);
          } else {
            ctx.fillStyle = staticItem.pattern;
            ctx.fillRect(c.x - c.w / 2, c.y - c.h / 2, c.w, c.h);
          }
        }
      });
    }
  };

  Engine2DCanvas.prototype.drawBackground = function(ctx) {
    if (KLib.isUndefined(this.backgroundPattern)) {
      return;
    }
    ctx.fillStyle = this.backgroundPattern;
    ctx.fillRect(0, 0, this.camera.realWorldSize.w, this.camera.realWorldSize.h);
  };

  Engine2DCanvas.prototype.drawItems = function() {
    this.drawBackground(this.ctx);
    this.drawBodies(this.ctx);
    this.drawOutsideWalls(this.ctx);
    this.drawStaticItems(this.ctx);
    if ($('#show_most_up_to_date_myCar').is(':checked')) {
      this.drawMostUpToDateMyCar(this.ctx);
    }
    this.drawCars(this.ctx);
    if ($('#show_local_physics_engine_bodies').is(':checked')) {
      this.drawLocalPhysicsEngineBodies(this.ctx);
    }
    this.drawExplosions(this.ctx);
    // this.drawBullets(this.ctx);
    // this.drawRockets(this.ctx);
    this.drawProjectiles(this.ctx);

    if (this.gameInstance !== null && this.isMinimap === false) {
      this.gameInstance.pointsManager.draw(this.ctx, this.gScaleValue);
    }
    // this.drawCollisionPoints();
  };

  Engine2DCanvas.prototype.tickMinimap = function() {
    if (this.interpolator.interpData.ready) {
      this.draw();
    }
  };

  Engine2DCanvas.prototype.tickGameCanvas = function() {
    var now = Date.now();
    if (this.gameInstance) {
      if (this.interpolator.interpData.ready) {
        this.draw();
      }
    } else {
      this.draw();
    }
  };

  Engine2DCanvas.prototype.tick = function() {
    if (this.isMinimap) {
      this.tickMinimap();
    } else {
      this.tickGameCanvas();
    }
  };

  Karma.Engine2DCanvas = Engine2DCanvas;
}());