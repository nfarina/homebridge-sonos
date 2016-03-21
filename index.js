var sonos = require('sonos');
var _ = require('underscore');
var inherits = require('util').inherits;
var Service, Characteristic, VolumeCharacteristic;
var devices = [];
var registeredSonosZoneCoordinators = new Map();

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;

  // we can only do this after we receive the homebridge API object
  makeVolumeCharacteristic();
  
  homebridge.registerAccessory("homebridge-sonos", "Sonos", SonosAccessory);
}


//
// Node-Sonos Functions to process device information
//

function getBridges (deviceList) {
  var bridges = [];
  deviceList.forEach(function (device) {
    if (device.CurrentZoneName == 'BRIDGE' && bridges.indexOf(device.ip + ':' + device.port) == -1) {
      bridges.push(device.ip + ':' + device.port);
    }
  });
  return bridges;
}

function getBridgeDevices (deviceList) {
  var bridgeDevices = [];
  deviceList.forEach(function (device) {
    if (device.CurrentZoneName == 'BRIDGE') {
      bridgeDevices.push(device);
    }
  });
  return bridgeDevices;
}

function getZones (deviceList) {
  var zones = [];
  deviceList.forEach(function (device) {
    if (zones.indexOf(device.CurrentZoneName) == -1 && device.CurrentZoneName != 'BRIDGE') {
      zones.push(device.CurrentZoneName);
    }
  });
  return zones;
}

function getZoneDevices (zone, deviceList) {
  var zoneDevices = [];
  deviceList.forEach(function (device) {
    if (device.CurrentZoneName == zone) {
      zoneDevices.push(device);
    }
  });
  return zoneDevices;
}

function getZoneCoordinator (zone, deviceList) {
  var coordinator;
  deviceList.forEach(function (device) {
    if (device.CurrentZoneName == zone && device.coordinator == 'true') {
      coordinator = device;
    }
  })
  return coordinator;
}

function gatherDevicesList(accessory) {
        var search = sonos.search(function(device, model) {
                var data = {ip: device.host, port: device.port, model: model};

                device.getZoneAttrs(function (err, attrs) {
                        if (!err) {
                                _.extend(data, attrs);
                        }
                        device.getZoneInfo(function (err, info) {
                                if (!err) {
                                        _.extend(data, info);
                                }
                                device.getTopology(function (err, info) {
                                        if (!err) {
                                                info.zones.forEach(function (group) {
                                                        if (group.location == 'http://' + data.ip + ':' + data.port + '/xml/device_description.xml') {
                                                                _.extend(data, group);
                                                        }
                                                });
                                        }
                                        devices.push(data);
                                });
                        });
                        accessory.search();
                });
        });
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
  
  // prepare list of devices and properties, then begin searching for a Sonos device with the given name
  gatherDevicesList(this);
  // begin searching for a Sonos device with the given name
  // this.search();
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
        var udn = description["UDN"];
         
        if (!SonosAccessory.zoneTypeIsPlayable(zoneType)) {
          this.log.debug("Sonos device %s is not playable (has an unknown zone type of %s); ignoring", host, zoneType);
          return;
        }
        
        if (roomName != this.room) {
          this.log.debug("Ignoring device %s because the room name '%s' does not match the desired name '%s'.", host, roomName, this.room);
          return;
        }
        
        var coordinator = getZoneCoordinator(roomName, devices);
        if (coordinator != undefined) {
                if (udn == "uuid:" + coordinator.uuid) {
                        if (registeredSonosZoneCoordinators.get(coordinator.uuid) == undefined) {
                                this.log("Found a playable coordinator device at %s for room '%s'", host, roomName);
                                this.device = device;
                                registeredSonosZoneCoordinators.set(coordinator.uuid, coordinator);
                                search.socket.close(); // we don't need to continue searching.
                        }
                }
        }
        
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
      this.device.pause(function(err, success) {
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
