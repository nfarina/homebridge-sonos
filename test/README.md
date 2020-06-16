# Simple Test Environment for Development

init.js is a setup script for quick and easy testing of the plugin during development. The script sets up a test environment that mocks Homebridge, allowing development without the overhead of actually running homebridge. It then allows the control of real world Sonos devices through the plugin to test scenarios and validate functionality.

Example usage:

    $> node

    > var sonos = require('./init.js');
    Mock homebridge: registered plugin=homebridge-sonos, accessory=Sonos, constructor=SonosAccessory.
    Mock homebridge: getting Characteristic.On.
    Mock homebridge: adding action for event get.
    Mock homebridge: adding action for event set.
    Mock homebridge: adding for Characteristic.Volume.
    Mock homebridge: adding action for event get.
    Mock homebridge: adding action for event set.
    DEBUG: Found sonos device at 192.168.1.1
    DEBUG: Refreshing cached description for device 192.168.1.1:1400
    Found a playable device at 192.168.1.1 for room 'Bedroom'

    > sonos.getOn()
    DEBUG: Refreshing group cache
    WARN: Current state for Sonos: stopped
    callback: result=false; error=null

    > sonos.setOn(true)
    Setting power to true
    Playback attempt with success: true
    callback: result=undefined; error=null

    > sonos.getOn()
    WARN: Current state for Sonos: playing
    callback: result=true; error=null

    > sonos.setOn(false)
    Setting power to false
    Pause attempt with success: true
    callback: result=undefined; error=null

# Requirements

Although this test environment avoids the requirement of running homebridge, it does require actually having Sonos devices on the same network with the development machine. The test environment allows real control of Sonos devices through the plugin, so without any devices, there will be nothing to control.

# Options

## Configuration

The initialization script contains a configuration object that is passed to the plugin so it can be configured for the specific Sonos setup of the developer. Values can be set to anything desired for testing purposes.

    var config = {
        "name": "Bedroom Speaker",
        "room": "Bedroom",
        "mute": false,
        "groupCacheExpiration": 15,
        "deviceCacheExpiration": 3600
    };

## Logging

A logger is passed to the plugin so full logging works. Deeper logging levels (warn, error, debug) can be suppressed by setting that level to `false`.

    var logLevelsEnabled = {
        warn: true,
        error: true,
        debug: true
    }

## Mock Homebridge Initialization Messages

A function defines the console output of plugin initialization with Homebridge (or the mock, in this case). If seeing these messages is not desired, just comment out the console.log() line.

    function mockHomebridgeOutput(message, ...parameters) {
        // Simple logging function to demonstrate plugin performing setup with Homebridge.
        // Comment line below to suppress these messages.
        console.log("Mock homebridge: " + message, ...parameters);
    };

# Testing Ideas

## Direct Accessory Access and Shortcuts

By default, the automatically-initialized accessory is exported to invoke directly, as well as simple shortcut functions into the accessory, just to reduce the amount of typing necessary when testing.

    > sonos.sonos.getOn()

is equivalent to

    > sonos.getOn()

## On-The-Fly Log Levels

 The log level structure is exported to allow on-the-fly customization of what logs are printed while testing. This makes it possible to, for example, initialize the test environment with the bare-minimum logs output, then enable all the levels again to see what's going on in invocations of other features later.

    > var sonos = require('./init.js');
    Found a playable device at 192.168.1.1 for room 'Bedroom'

    > sonos.logLevels.debug = sonos.logLevels.warn = true
    true
    
    > sonos.getOn()
    DEBUG: Refreshing group cache
    WARN: Current state for Sonos: stopped
    callback: result=false; error=null

## Additional Accessories

The logger is also exported, along with the SonosAccessory() constructor, to allow creating a second (and third, and...) instance of an accessory directly from the console.

    > var config2 = { "name": "Kitchen Speaker", "room": "Kitchen" }
    > var device2 = new sonos.SonosAccessory(sonos.log, config2)
    Found a playable device at 192.168.1.2 for room 'Kitchen'
    
    > sonos.getOn()
    WARN: Current state for Sonos: playing
    callback: result=true; error=null