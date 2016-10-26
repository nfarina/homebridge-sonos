var sonos = require('sonos');
var Sonos = require('sonos').Sonos;
var _ = require('underscore');
var inherits = require('util').inherits;
var Service, Characteristic, VolumeCharacteristic;
var sonosDevices = new Map();
var sonosAccessories = [];
var Listener = require('../homebridge-sonos/node_modules/sonos/lib/events/listener');

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
function getZoneGroupCoordinator (zone) {
        var coordinator;
        sonosDevices.forEach(function (device) {
                if (device.CurrentZoneName == zone && device.coordinator == 'true') {
                        coordinator = device;
                }
        });
        if (coordinator == undefined) {
                var zoneGroups = getZoneGroupNames(zone);
                zoneGroups.forEach(function (group) {
                        sonosDevices.forEach(function (device) {
                                if (device.group == group && device.coordinator == 'true') {
                                        coordinator = device;
                                }
                        });
                });
        }
        return coordinator;
}

function getZoneGroupNames(zone) {
        var groups = [];
        sonosDevices.forEach(function (device) {
                if (device.CurrentZoneName == zone) {
                        groups.push(device.group);
                }
        });
        return groups;
}

function listenGroupMgmtEvents(device) {
        var devListener = new Listener(device);
        devListener.listen(function (listenErr) {
                if (!listenErr) {
                        devListener.addService('/GroupManagement/Event', function (addServErr, sid) {
                                if (!addServErr) {
                                        devListener.on('serviceEvent', function (endpoint, sid, data) {
                                                sonosDevices.forEach(function (devData) {
                                                        var dev = new Sonos(devData.ip);
                                                        dev.getZoneAttrs(function (err, zoneAttrs) {
                                                                if (!err && zoneAttrs) {
                                                                        device.getTopology(function (err, topology) {
                                                                                if (!err && topology) {
                                                                                        var bChangeDetected = false;
                                                                                        topology.zones.forEach(function (group) {
                                                                                                if (group.location == 'http://' + devData.ip + ':' + devData.port + '/xml/device_description.xml') {
                                                                                                        if (zoneAttrs.CurrentZoneName != devData.CurrentZoneName) {
                                                                                                                devData.CurrentZoneName = zoneAttrs.CurrentZoneName;
                                                                                                        }
                                                                                                        if (group.coordinator != devData.coordinator || group.group != devData.group) {
                                                                                                                devData.coordinator = group.coordinator;
                                                                                                                devData.group = group.group;
                                                                                                                bChangeDetected = true;
                                                                                                        }
                                                                                                }
                                                                                                else {
                                                                                                        var grpDevIP = group.location.substring(7, group.location.lastIndexOf(":"));
                                                                                                        var grpDevData = sonosDevices.get(grpDevIP);
                                                                                                        if (grpDevData != undefined) {
                                                                                                                if (group.name != grpDevData.CurrentZoneName) {
                                                                                                                        grpDevData.CurrentZoneName = group.Name;
                                                                                                                }
                                                                                                                if (group.coordinator != grpDevData.coordinator || group.group != grpDevData.group) {
                                                                                                                        grpDevData.coordinator = group.coordinator;
                                                                                                                        grpDevData.group = group.group;
                                                                                                                        bChangeDetected = true;
                                                                                                                }
                                                                                                        }
                                                                                                }

                                                                                        });
                                                                                        if (bChangeDetected) {
                                                                                                sonosAccessories.forEach(function (accessory) {
                                                                                                        var coordinator = getZoneGroupCoordinator(accessory.room);
                                                                                                        accessory.log.debug("Target Zone Group Coordinator identified as: %s", JSON.stringify(coordinator));
                                                                                                        if (coordinator == undefined) {
                                                                                                                accessory.log.debug("Removing coordinator device from %s", JSON.stringify(accessory.device));
                                                                                                                accessory.device = coordinator;
                                                                                                        }
                                                                                                        else {
                                                                                                                var bUpdate = false;
                                                                                                                if (accessory.device != undefined) {
                                                                                                                        if (accessory.device.host != coordinator.ip) bUpdate = true;
                                                                                                                }
                                                                                                                else {
                                                                                                                        bUpdate = true;
                                                                                                                }
                                                                                                                if (bUpdate) {
                                                                                                                        accessory.log("Changing coordinator device from %s to %s (from sonos zone %s) for accessory '%s' in accessory room '%s'.", accessory.device.host, coordinator.ip, coordinator.CurrentZoneName, accessory.name, accessory.room);
                                                                                                                        accessory.device = new Sonos(coordinator.ip);
                                                                                                                }
                                                                                                                else {
                                                                                                                        accessory.log.debug("No coordinator device change required!");
                                                                                                                }
                                                                                                        }
                                                                                                });
                                                                                        }
                                                                                }
                                                                        });
                                                                }
                                                        });
                                                });
                                        });
                                }
                        });
                }
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

  this.service = new Service.Lightbulb(this.name);

  this.service
    .getCharacteristic(Characteristic.On)
    .on('get', this.getOn.bind(this))
    .on('set', this.setOn.bind(this));

  this.service
    .addCharacteristic(Brightness)
    .on('get', this.getVolume.bind(this))
    .on('set', this.setVolume.bind(this));

  this.search();
}

SonosAccessory.prototype.search = function() {

        sonosAccessories.push(this);

        var search = sonos.search(function(device, model) {
                this.log.debug("Found device at %s", device.host);

                var data = {ip: device.host, port: device.port, discoverycompleted: 'false'};
                device.getZoneAttrs(function (err, attrs) {
                        if (!err && attrs) {
                                _.extend(data, {CurrentZoneName: attrs.CurrentZoneName});
                        }
                        device.getTopology(function (err, topology) {
                                if (!err && topology) {
                                        topology.zones.forEach(function (group) {
                                                if (group.location == 'http://' + data.ip + ':' + data.port + '/xml/device_description.xml') {
                                                        _.extend(data, group);
                                                        data.discoverycompleted = 'true';
                                                }
                                                else {
                                                        var grpDevIP = group.location.substring(7, group.location.lastIndexOf(":"));
                                                        var grpDevData = {ip: grpDevIP, discoverycompleted: 'false', CurrentZoneName: group.name};
                                                        _.extend(grpDevData, group);
                                                        if (sonosDevices.get(grpDevIP) == undefined) {
                                                                sonosDevices.set(grpDevIP, grpDevData);
                                                        }
                                                }
                                        }.bind(this));
                                 }
                                 if (sonosDevices.get(data.ip) == undefined) {
                                        sonosDevices.set(data.ip, data);
                                }
                                else {
                                        if (sonosDevices.get(data.ip).discoverycompleted == 'false') {
                                                sonosDevices.set(data.ip, data);
                                        }
                                }
                                var coordinator = getZoneGroupCoordinator(this.room);
                                if (coordinator != undefined) {
                                        if (coordinator.ip == data.ip) {
                                                this.log("Found a playable coordinator device at %s in zone '%s' for accessory '%s' in accessory room '%s'", data.ip, data.CurrentZoneName, this.name, this.room);
                                                this.device = device;
                                                search.destroy(); // we don't need to continue searching.
                                        }
                                }

                                listenGroupMgmtEvents(device);

                        }.bind(this));
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
