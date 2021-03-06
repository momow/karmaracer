var Bullet = require('../Physics/Bodies/Bullet');
var KLib = require('./../KLib');

var Weapon = function(gameServer) {
  this.gameServer = gameServer;
  this.engine = this.gameServer.engine;
  this.name = 'anonymous';
  this.projectiles = {};
  this.accelerate = 500;
  this.lastShot = new Date();
  this.lastShotInterval = 0;
  this.startAcceleration = 1;
  this.ProjectileClass = Bullet;
  this.weaponEnergy = {
    cur: 50,
    max: 50
  };
}

Weapon.prototype.deleteDeads = function(deads) {
  for (var i = 0; i < deads.length; i++) {
    var id = deads[i];
    delete this.projectiles[id];
  };
};

Weapon.prototype.getProjectileVector = function(playerCar, angle) {
  var car = playerCar.car;
  var distanceFromCar = car.w;
  var pos = car.getVector({
    x: distanceFromCar,
    y: distanceFromCar
  }, angle);
  return pos;
};

Weapon.prototype.canShoot = function(playerCar, now) {
  if (this.weaponEnergy.cur <= 0 ||
    now - this.lastShot < this.lastShotInterval) {
    return false;
  } else {
    return true;
  }
};

Weapon.prototype.shoot = function(playerCar) {
  var now = (new Date()).getTime();
  var canShoot = this.canShoot(playerCar, now);
  if (!KLib.isUndefined(playerCar)) {
    this.removeEnergy(1);
    if (canShoot === true) {
      this.customShoot(playerCar);
      this.lastShot = now;
    }
  }
};

Weapon.prototype.removeEnergy = function(energy) {
  this.weaponEnergy.cur = Math.max(-1, this.weaponEnergy.cur - energy);
}

Weapon.prototype.customShoot = function(playerCar) {
  this.addProjectile(playerCar);
};

Weapon.prototype.addProjectile = function(playerCar, angle) {
  if (KLib.isUndefined(angle)) {
    angle = 0;
  }
  var pos = {
    x: playerCar.car.x,
    y: playerCar.car.y
  };
  var b = new this.ProjectileClass(playerCar, pos, playerCar.car.r + angle);
  var collision = this.engine.bulletCollision(b);

  var gScale = this.engine.gScale;
  if (collision !== null) {
    b.explode(collision.point);
    if (collision.body.name === 'car') {
      this.gameServer.carManager.projectileHitCar(b.playerCar, collision.body.playerCar, b)
    }
  }
};

Weapon.prototype.step = function() {
  var deads = [];

  if (this.weaponEnergy.cur <= this.weaponEnergy.max) {
    this.weaponEnergy.cur += 0.5;
  }

  for (var id in this.projectiles) {
    if (this.projectiles.hasOwnProperty(id)) {
      var projectile = this.projectiles[id];
      if (projectile.body === null) {
        deads.push(id);
      } else {
        projectile.life -= 1;
        if (projectile.life <= 0) {
          projectile.scheduleForDestroy();
          deads.push(id);
        }
      }
    }
  }
  this.deleteDeads(deads);
};

Weapon.prototype.getGraphics = function() {
  var that = this;
  var graphics = [];
  for (var id in this.projectiles) {
    if (this.projectiles.hasOwnProperty(id)) {
      var projectile = this.projectiles[id];
      var pShared = projectile.getShared();
      pShared.name = that.name;
      graphics.push(pShared);
    }
  }
  return graphics;
}

module.exports = Weapon;