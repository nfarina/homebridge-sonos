var sonos = require('sonos');
var inherits = require('util').inherits;
var Service, Characteristic, VolumeCharacteristic;

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;

  // we can only do this after we receive the homebridge API object
  makeVolumeCharacteristic();
  
  homebridge.registerAccessory("homebridge-sonos", "Sonos", SonosAccessory);
}

//
// Sonos Accessory
//

function SonosAccessory(log, config) {
  this.log = log;
  this.config = config;
  this.name = config["name"];
  this.room = config["room"];
  
  if (!this.room) throw new Error("You must provide a config value for 'room'.");
  
  this.service = new Service.Switch(this.name);

  this.service
    .getCharacteristic(Characteristic.On)
    .on('get', this.getOn.bind(this))
    .on('set', this.setOn.bind(this));
  
  this.service
    .addCharacteristic(VolumeCharacteristic)
    .on('get', this.getVolume.bind(this))
    .on('set', this.setVolume.bind(this));
  
  // begin searching for a Sonos device with the given name
  this.search();
}

SonosAccessory.zoneTypeIsPlayable = function(zoneType) {
  // 8 is the Sonos SUB, 4 is the Sonos Bridge, 11 is unknown
  return zoneType != '11' && zoneType != '8' && zoneType != '4';
}

SonosAccessory.prototype.search = function() {
  var search = sonos.search(function(device) {
    var host = device.host;
    this.log.debug("Found sonos device at %s", host);

    device.deviceDescription(function (err, description) {
        
        var zoneType = description["zoneType"];
        var roomName = description["roomName"];
        
        if (!SonosAccessory.zoneTypeIsPlayable(zoneType)) {
          this.log.debug("Sonos device %s is not playable (has an unknown zone type of %s); ignoring", host, zoneType);
          return;
        }
        
        if (roomName != this.room) {
          this.log.debug("Ignoring device %s because the room name '%s' does not match the desired name '%s'.", host, roomName, this.room);
          return;
        }
        
        this.log("Found a playable device at %s for room '%s'", host, roomName);
        this.device = device;
        search.socket.close(); // we don't need to continue searching.
        
    }.bind(this));
  }.bind(this));
}

SonosAccessory.prototype.getServices = function() {
  return [this.service];
}

SonosAccessory.prototype.getOn = function(callback) {
  if (!this.device) {
    this.log.warn("Ignoring request; Sonos device has not yet been discovered.");
    callback(new Error("Sonos has not been discovered yet."));
    return;
  }

  this.device.getCurrentState(function(err, state) {
    
    if (err) {
      callback(err);
    }
    else {
      var on = (state == "playing");
      callback(null, on);
    }
    
  }.bind(this));
}

SonosAccessory.prototype.setOn = function(on, callback) {
  if (!this.device) {
    this.log.warn("Ignoring request; Sonos device has not yet been discovered.");
    callback(new Error("Sonos has not been discovered yet."));
    return;
  }

  this.log("Setting power to " + on);
  
  if (on) {
    this.device.play(function(err, success) {
      this.log("Playback attempt with success: " + success);
      if (err) {
        callback(err);
      }
      else {
        callback(null);
      }
    }.bind(this));
  }
  else {
      this.device.stop(function(err, success) {
          this.log("Stop attempt with success: " + success);
          if (err) {
            callback(err);
          }
          else {
            callback(null);
          }
      }.bind(this));
  }
}

SonosAccessory.prototype.getVolume = function(callback) {
  if (!this.device) {
    this.log.warn("Ignoring request; Sonos device has not yet been discovered.");
    callback(new Error("Sonos has not been discovered yet."));
    return;
  }

  this.device.getVolume(function(err, volume) {
    
    if (err) {
      callback(err);
    }
    else {
      this.log("Current volume: %s", volume);
      callback(null, Number(volume));
    }
    
  }.bind(this));
}

SonosAccessory.prototype.setVolume = function(volume, callback) {
  if (!this.device) {
    this.log.warn("Ignoring request; Sonos device has not yet been discovered.");
    callback(new Error("Sonos has not been discovered yet."));
    return;
  }

  this.log("Setting volume to %s", volume);
  
  this.device.setVolume(volume + "", function(err, data) {
    this.log("Set volume response with data: " + data);
    if (err) {
      callback(err);
    }
    else {
      callback(null);
    }
  }.bind(this));
}


//
// Custom Characteristic for Volume
//

function makeVolumeCharacteristic() {

  VolumeCharacteristic = function() {
    Characteristic.call(this, 'Volume', '91288267-5678-49B2-8D22-F57BE995AA93');
    this.setProps({
      format: Characteristic.Formats.INT,
      unit: Characteristic.Units.PERCENTAGE,
      maxValue: 100,
      minValue: 0,
      minStep: 1,
      perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
    });
    this.value = this.getDefaultValue();
  };
  
  inherits(VolumeCharacteristic, Characteristic);
}
