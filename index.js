var Sonos = require('sonos');
var _ = require('underscore');
var inherits = require('util').inherits;
var Service, Characteristic, VolumeCharacteristic;
var sonosDevices = new Map();
var sonosAccessories = [];

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;

  homebridge.registerAccessory("homebridge-sonos", "Sonos", SonosAccessory);

  // Not expected by Homebridge, but enables easy testing via test/init.js
  return SonosAccessory;
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
  this.mute = config["mute"];

  // cache lifetimes
  this.groupCacheLifetime = (config["groupCacheLifetime"] || 15) * 1000;
  this.deviceCacheLifetime = (config["deviceCacheLifetime"] || 3600) * 1000;

  if (!this.room) throw new Error("You must provide a config value for 'room'.");

  this.service = new Service.Switch(this.name);

  this.service
    .getCharacteristic(Characteristic.On)
    .on('get', this.getOn.bind(this))
    .on('set', this.setOn.bind(this));

  this.service
    .addCharacteristic(Characteristic.Volume)
    .on('get', this.getVolume.bind(this))
    .on('set', this.setVolume.bind(this));

  this.search();
}

SonosAccessory.zoneTypeIsPlayable = function(zoneType) {
  // 8 is the Sonos SUB, 4 is the Sonos Bridge, 11 is unknown
  return zoneType != '11' && zoneType != '8' && zoneType != '4';
}

SonosAccessory.prototype.search = function() {
  var search = Sonos.DeviceDiscovery({ timeout: 30000 });
  search.on('DeviceAvailable', function (device, model) {
    var host = device.host;
    this.log.debug("Found sonos device at %s", host);

    this.getDeviceDescription(device).then(description => {
    
        if (description == undefined) {
            this.log.debug('Ignoring callback because description is undefined.');
            return;
        }

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

        if (null == this.device) { // avoid multiple call of search.destroy in multi-device rooms
          this.log("Found a playable device at %s for room '%s'", host, roomName);
          this.device = device;
          search.destroy(); // we don't need to continue searching.
        }
    })
    .catch(reason => this.log.debug("Unexpected error getting device description: " + reason));
  }.bind(this));
}

SonosAccessory.prototype.oldSearch = function() {

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

// Device and description cache.
// Although this format should be 'static' and shared
// across SonosAccessory instances, HomeBridge seems
// to instantiate plugins in a way that keeps them entirely
// separate, so this cache is distinct per instance.
// However, the cache is still valuable to the individual
// instance using it.
SonosAccessory.deviceCache = {
  groups: {
    groups: null,
    lastUpdate: 0
  },
  descriptions: {}
};

SonosAccessory.prototype.getGroups = function() {
  if (Date.now() < SonosAccessory.deviceCache.groups.lastUpdate + (this.groupCacheLifetime)) {
    // return cached group status if it was refreshed less than the configured lifetime ago
    return Promise.resolve(SonosAccessory.deviceCache.groups.groups);
  }

  this.log.debug("Refreshing group cache");
  return this.device.getAllGroups().then(groups => {
    SonosAccessory.deviceCache.groups.lastUpdate = Date.now();
    SonosAccessory.deviceCache.groups.groups = groups;
    return groups;
  });
}

SonosAccessory.prototype.getDeviceDescription = function(device) {
  // use cached description if it's available and refreshed less than the configured lifetime ago
  var cacheKey = `${device.host}:${device.port}`;
  var desc = SonosAccessory.deviceCache.descriptions[cacheKey];
  if (desc != undefined && desc.lastUpdate > Date.now() - this.deviceCacheLifetime) {
    return Promise.resolve(desc.desc);
  }

  this.log.debug("Refreshing cached description for device %s", cacheKey);
  return device.deviceDescription().then(desc => {
    SonosAccessory.deviceCache.descriptions[cacheKey] = {
      desc: desc,
      lastUpdate: Date.now()
    };
    return desc;
  })
}

SonosAccessory.prototype.getGroupCoordinator = function() {
  return this.getGroups().then(groups => {
    var myGroup = groups.find(group =>
      group.ZoneGroupMember.some(
        member => member.ZoneName == this.room));
    if (myGroup) {
      var coordinator = myGroup.CoordinatorDevice();
      this.getDeviceDescription(coordinator).then(desc => {
        if (desc["roomName"] != this.room) {
          this.log.debug("Found group coordinator " + desc["roomName"]);
        }
      })
      return coordinator;
    }
    else {
      return Promise.reject("Coordinator could not be found.");
    }
  });
}

SonosAccessory.prototype.getOn = function(callback) {
  if (!this.device) {
    this.log.warn("Ignoring request; Sonos device has not yet been discovered.");
    callback(new Error("Sonos has not been discovered yet."));
    return;
  }

  if (!this.mute) {
    this.getGroupCoordinator().then(coordinator => {
      coordinator.getCurrentState().then(state => {
        this.log.warn("Current state for Sonos: " + state);
        var on = (state == "playing");
        callback(null, on);
      })
      .catch(reason => callback(reason));
    })
    .catch(reason => callback(reason));
  }
  else {
    this.device.getMuted().then(muted => {
      this.log.warn("Current state for Sonos: " + (muted ? "muted" : "unmuted"));
      callback(null, !muted);
    })
    .catch(reason => callback(reason));
  }
}

SonosAccessory.prototype.setOn = function(on, callback) {
  if (!this.device) {
    this.log.warn("Ignoring request; Sonos device has not yet been discovered.");
    callback(new Error("Sonos has not been discovered yet."));
    return;
  }

  var action = this.mute ? (on ? "Unmute" : "Mute") : (on ? "Play" : "Pause");
  this.log("Setting status to " + action);

  if (!this.mute){
    this.getGroupCoordinator().then(coordinator => {
      if (on) {
        coordinator.play().then(success => {
          this.log("Playback attempt with success: " + success);
          callback(null);
        })
        .catch(reason => callback(reason));
      }
      else {
        coordinator.pause().then(success => {
          this.log("Pause attempt with success: " + success);
          callback(null);
        })
        .catch(reason => callback(reason));
      }
    })
    .catch(reason => callback(reason));
  }
  else {
    this.device.setMuted(!on).then(result => {
      // The node-sonos library seems to return an empty object (i.e. {})
      // after muting/unmuting, so we can only check what's in the object
      // to see if there's anything unexpected.
      if (result && (typeof(result) == 'object' && Object.entries(result).length == 0)
          || result == true) {
        this.log(action + " attempt succeeded.");
        callback(null);
      }
      else {
        this.log(`Unexpected result trying to ${action}: ${JSON.stringify(result)}`);
        callback(result);
      }
    })
    .catch(reason => callback(reason));
  }
}

SonosAccessory.prototype.getVolume = function(callback) {
  if (!this.device) {
    this.log.warn("Ignoring request; Sonos device has not yet been discovered.");
    callback(new Error("Sonos has not been discovered yet."));
    return;
  }

  this.device.getVolume().then(volume => {
    this.log("Current volume: %s", volume);
    callback(null, Number(volume));
  })
  .catch(reason => callback(reason));
}

SonosAccessory.prototype.setVolume = function(volume, callback) {
  if (!this.device) {
    this.log.warn("Ignoring request; Sonos device has not yet been discovered.");
    callback(new Error("Sonos has not been discovered yet."));
    return;
  }

  this.log("Setting volume to %s", volume);

  this.device.setVolume(volume + "").then(data => {
    this.log("Set volume response with data: " + data);
    callback(null);
  })
  .catch(reason => callback(reason));
}
