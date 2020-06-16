var HomebridgeSonos = require('../index.js');

// Config to pass to instance of accessory created.
// Modify to reflect your setup for testing.
var config = {
    "name": "Bedroom Speaker",
    "room": "Bedroom",
    "mute": false,
    "groupCacheExpiration": 15,
    "deviceCacheExpiration": 3600
  };

// Control what log levels are visible during testing
var logLevelsEnabled = {
    warn: true,
    error: true,
    debug: true
};

function mockHomebridgeOutput(message, ...parameters) {
    // Simple logging function to demonstrate plugin performing setup with Homebridge.
    // Comment line below to suppress these messages.
    console.log("Mock homebridge: " + message, ...parameters);
};

// Mock logger to pass to plugin
var log = (msg, ...parameters) => console.log(msg, ...parameters);
log.info = log;
log.warn = (msg, ...parameters) => { if (logLevelsEnabled.warn) console.log("WARN: " + msg, ...parameters); };
log.error = (msg, ...parameters) => { if (logLevelsEnabled.error) console.log("ERROR: " + msg, ...parameters); };
log.debug = (msg, ...parameters) => { if (logLevelsEnabled.debug) console.log("DEBUG: " + msg, ...parameters); };

// Mock Homebridge - just a placeholder structure to satisfy requirements of SonosAccessory.
// May need to be expanded in case further Homebridge functionality is used in plugin later.
var homebridge = {
    registerAccessory: (pluginName, accessoryName, accessoryPluginConstructor) =>
        mockHomebridgeOutput(`registered plugin=${pluginName}, accessory=${accessoryName}, constructor=${accessoryPluginConstructor.name}.`),
    hap: {
        Service: {
            Switch: function (name) {
                var eventActions = {};
                function onEvent(event, boundFunction) {
                    mockHomebridgeOutput(`adding action for event ${event}.`);
                    eventActions[event] = boundFunction;
                    return {
                        on: onEvent
                    };
                };
                return {
                    getCharacteristic: (characteristic) => {
                        mockHomebridgeOutput(`getting Characteristic.${characteristic}.`);
                        return {
                            on: onEvent
                        };
                    },
                    addCharacteristic: (characteristic) => {
                        mockHomebridgeOutput(`adding for Characteristic.${characteristic}.`);
                        return {
                            on: onEvent
                        };
                    }
                };
            }
        },
        Characteristic: {
            On: "On",
            Volume: "Volume"
        }
    }
};

// Instantiate an instance of a plugin accessory
var SonosAccessory = HomebridgeSonos(homebridge);
var sonos = new SonosAccessory(log, config);

// Simple callback to pass to plugin actions to observe what is happening
function callback(err, r) { console.log(`callback: result=${r}; error=${err}`); };

module.exports = {

    // The instantiated plugin, to invoke directly
    sonos: sonos,

    // Exposing shorthands to plugin functionality
    getOn: function() { sonos.getOn(callback); },
    setOn: function(on) { sonos.setOn(on, callback); },

    // Additional exports for playing around with in the console,
    // with ability to dynamically update accessory behavior
    log: log,
    config: config,
    logLevels: logLevelsEnabled,

    // Export constructor directly so additional accessories can be created on-the-fly if desired
    Sonos: SonosAccessory
}
