(function(Engine2DCanvas) {
  "use strict";

  var maxFlameTick = 12;

  Engine2DCanvas.prototype.drawLifeBar = function(ctx, c, player, w) {
    ctx.save();
    ctx.translate(-w / 2, -40);
    var maxLifeSize = w;
    ctx.fillStyle = '#0F0';
    ctx.fillRect(0, 0, maxLifeSize, 5);
    ctx.fillStyle = '#F00';
    var ratioSize = maxLifeSize * (c.life / player.maxLife);
    ctx.fillRect(ratioSize, 0, maxLifeSize - ratioSize, 5);
    ctx.restore();
  };

  Engine2DCanvas.prototype.drawSingleGunFlame = function(ctx, car, angle, distance, size) {
    var ratio = 1.5;
    ctx.rotate(angle);
    var w = size.w / 2;
    var h = size.h / 2;
    if (car.flame > maxFlameTick / 2) {
      ctx.drawImage(this.gunFlameImage, 0, 0, 135, 125, distance, -h / 2, w, h);
    } else {
      ctx.drawImage(this.gunFlameImage, 0, 0, 135, 125, distance, -h / 2 / ratio, w / ratio, h / ratio);
    }
    ctx.rotate(-angle);
  };

  Engine2DCanvas.prototype.drawGunFlame = function(ctx, car, size) {
    var w = size.w;

    if (KLib.isUndefined(this.carFlameTicks[car.id])) {
      this.carFlameTicks[car.id] = 0;
    }
    car.flame = this.carFlameTicks[car.id];

    switch (car.shootingWithWeapon) {
      case '90AngleMachineGun':
        this.drawSingleGunFlame(ctx, car, 0, w / 2, size);
        this.drawSingleGunFlame(ctx, car, Math.PI / 2, w / 4, size);
        this.drawSingleGunFlame(ctx, car, -Math.PI / 2, w / 4, size);
        break;
      case 'SuperMachineGun':
        this.drawSingleGunFlame(ctx, car, 0, w / 2, size);
        this.drawSingleGunFlame(ctx, car, Math.PI / 4, w / 4, size);
        this.drawSingleGunFlame(ctx, car, -Math.PI / 4, w / 4, size);
        break;
      case 'MachineGun':
        this.drawSingleGunFlame(ctx, car, 0, w / 2, size);
        break;
      default:
        this.drawSingleGunFlame(ctx, car, 0, w / 2, size);
        break;
    }
    this.carFlameTicks[car.id] = (this.carFlameTicks[car.id] + 1) % maxFlameTick;
  };

  Engine2DCanvas.prototype.drawCarForMinimap = function(ctx, c, player, pos) {
    ctx.strokeStyle = 'white';
    var mycar = this.gameInstance.myCar;
    if (mycar !== null && c.id === mycar.id) {
      ctx.fillStyle = 'black';
    } else if (player.isBot === true) { //bots
      ctx.fillStyle = 'white';
    } else { //player
      ctx.fillStyle = 'red';
      ctx.strokeStyle = 'red';
    }
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 2, 0, 2 * Math.PI, false);
    ctx.fill();
    ctx.stroke();
    ctx.closePath();
  };

  Engine2DCanvas.prototype.interpPosOfCar = function(carIndex) {
    var interpData = this.interpolator.interpData;
    var carBefore = interpData.snapBefore.cars[carIndex];
    var carAfter = interpData.snapAfter.cars[carIndex];
    return this.interpolator.interpPos(carBefore, carAfter, interpData.interpPercent);
  };

  Engine2DCanvas.prototype._drawCar = function(ctx, c, pos) {
    if (!pos || c.dead) {
      return;
    }
    var player = this.gameInstance.gameInfo[c.id];
    if (typeof player === 'undefined') {
      // we don't have enough data to draw this car
      return;
    }
    var car = this.gameInstance.cars[player.carImageName];
    c.playerName = player.playerName;
    c.w = car.w;
    c.h = car.h;
    var size = {
      w: this.gScaleValue * c.w,
      h: this.gScaleValue * c.h
    };
    if (this.isMinimap === true) {
      this.drawCarForMinimap(ctx, c, player, pos);
    } else {
      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.rotate(pos.r);

      ctx.drawImage(car.image, 0, 0, car.imageSize.w, car.imageSize.h, -size.w / 2, -size.h / 2, size.w, size.h);

      // gun flammes
      if (c.shootingWithWeapon !== null) {
        this.drawGunFlame(ctx, c, size);
      }
      ctx.restore();

      //name
      var textSize = ctx.measureText(c.playerName);
      var textPad = 25;
      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.fillStyle = 'white';
      ctx.fillText(c.playerName, -textSize.width / 2, -textPad);
      this.drawLifeBar(ctx, c, player, size.w);
      ctx.restore();

      // bullet
      this.drawBullet(c, ctx, pos);
    }
  };

  Engine2DCanvas.prototype.drawCars = function(ctx) {
    if (this.gameInstance === null) {
      return;
    }
    var interpData = this.interpolator.interpData;
    ctx.font = '10px Trebuchet MS';
    var cars = interpData.snapAfter.cars;
    var str = "";
    for (var i in cars) {
      str += " " + cars[i].id;
    }
    if (cars !== null) {
      for (var j in cars) {
        if (typeof interpData.snapBefore.cars[j] !== 'undefined' &&
            typeof interpData.snapAfter.cars[j] !== 'undefined') {
              var car = this.interpPosOfCar(j);
              var id = interpData.snapAfter.cars[j].id;
              car.id = id;

              var player = this.gameInstance.gameInfo[id];
              if (typeof player === 'undefined') {
                // we don't have enough data to draw this car
                continue;
              }
              var carImage = this.gameInstance.cars[player.carImageName];
              car.w = carImage.w;
              car.h = carImage.h;
              this.gameInstance.engine.replaceCarBody(car);
              var pos = this.scalePos(car);
              this._drawCar(ctx, cars[j], pos);
        } else {
          // we don't have enough data to draw this car yet
        }
      }
    }
    if (this.gameInstance.myCar !== null) {
      // draw the car
      var myPos = this.scalePos(this.gameInstance.myCar);
      this._drawCar(ctx, this.gameInstance.myCar, myPos);
    }
  };

}(Karma.Engine2DCanvas));