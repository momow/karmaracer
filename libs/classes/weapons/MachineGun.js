var Bullet = require('../Physics/Bodies/Bullet');
var KLib = require('./../KLib');
var Weapon = require('./Weapon');

var MachineGun = function(gameServer) {
    KLib.extend(Weapon, this, gameServer);
    this.name = 'MachineGun';
    this.lastShotInterval = 32;
    this.ProjectileClass = Bullet;
    this.startAcceleration = 2;
  }

module.exports = MachineGun;