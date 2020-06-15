# Sonos accessory

This accessory allows you to turn Sonos speakers on and off using Siri and/or a HomeKit enabled iOS app.

 * _Siri, turn Bedroom Speakers on._
 * _Siri, turn Bedroom Speakers off._

# Installation

Homebridge is published through [NPM](https://www.npmjs.com/package/homebridge) and should be installed "globally" by typing:

    sudo npm install -g homebridge
    sudo npm install -g homebridge-sonos

If you don't have Homebridge installed, [check the repository](https://github.com/nfarina/homebridge) for detailed setup instructions.

# Configuration

The plugin is configured as part of your Homebridge `config.json` file.

## Example addition to existing config.json:

    ,{
      "accessories": [
        {
          "accessory": "Sonos",
          "name": "Bedroom Speakers",
          "room": "Bedroom",
          "mute": true
        }
      ]
    }

The `name` parameter is how the device will apear in Apple Homekit.

The `room` parameter must match the room name in Sonos *exactly*.

The `mute` parameter is optional. Setting it to `true` will mute/unmute the speaker instead of a pause/play. (More information about how this parameter affects devices in groups can be found [below](#Device-Behavior-When-Grouped).)

## Example new config.json:

    {
    	"bridge": {
    		"name": "Homebridge",
    		"pin": "000-00-001"
    	},

    	"description": "Example config for sonos only.",

    	"accessories": [{
    		"accessory": "Sonos",
    		"name": "Bedroom Speakers",
    		"room": "Bedroom"
    	}]
    }

## Advanced Configuration Values:

These are additional (and optional) configuration parameters available, with their default values.

          "groupCacheLifetime": 15,
          "deviceCacheLifetime": 3600,

`groupCacheLifetime` is the maximum amount of time (in seconds) the current Sonos group configuration will be cached in this plugin. The group configuration is how the devices on the current Sonos network are grouped (controlled via the Sonos app).

Note: This setting is currently only used if `mute` is `false`. If `mute` is `true`, Sonos group information isn't used.

`deviceCacheLifetime` is the maximum amount of time (in seconds) the information about each Sonos device discovered on the network will be cached.

For the curious, an explanation of what these configurations do can be found [below](#Advanced-Configuration-explained).

# Run Homebridge:

    $ homebridge

# Notes

The name "Speakers" is used in the name for the above example configurations instead of something more intuitive like "Sonos" or "Music" or "Radio".

This is because Siri has many stronger associations for those words. For instance, including "Sonos" in the name will likely cause Siri to just launch the Sonos app. And including "Music" in the name will cause Siri to launch the built-in Music app.

You could of course pick any other unique name, like "Turn on the croissants" if you want. Or add it to a Scene with a custom phrase.

## Device Behavior When Grouped

### When `mute` is `false`
The device status displayed in Homekit will reflect the status of the group the device is part of. On/off commands will result in the entire group being played or paused.

### When `mute` is `true`
The device status displayed in Homekit will reflect the status of the individual device. On/off commands will apply only to the individual device.

# Alternative

You also might check out this [fork of `homebridge-sonos`](https://github.com/dominicstelljes/homebridge-sonos) by [dominicstelljes](https://github.com/dominicstelljes) that exposes the Sonos as a "lightbulb" instead of a switch. This will allow you control the volume through Siri - "Set the Speakers to 50%" for example. But it will have some side-effects. Check out his README for more details.

# Advanced Configuration explained:

Additional network calls to Sonos devices are required to get detailed descriptions of each device and information about groups. If `mute` is `false` (using pause/play for control instead of mute/unmute), this information is used whenever Homekit requests status updates of devices and when requests to turn on/off (play/pause) are made from Homekit. Typically, Homekit will additionally request another status update for the device after a command is issued to play or pause the device.

Requesting these details from Sonos devices every time simple actions are performed in Homekit are unnecessary, so the details retrieved from devices are cached to be used in the next lookup.

Detailed device descriptions are unlikely to change often, so these can be cached for a longer period of time. The lifetime of this cache is controlled by `deviceCacheLifetime`, and is set to 1 hour by default. In most networks that are unlikely to change, this can practically be any large amount of time with no consequences.

Groups, however, may change frequently or infrequently depending on the preferences of the user, and updates through the Sonos app will not be updated in this plugin until the group cache is refreshed. The lifetime of this cache is controlled by `groupCacheLifetime`. The default value of 15 seconds is long enough to ensure a single network call is enough to get the information for multiple uses instead of making the request every time, but (ideally) short enough to make the delay between group updates in Sonos app and the information being discovered in this plugin negligible.
