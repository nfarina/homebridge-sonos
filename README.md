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

The "mute" parameter is optional. Setting it to `true` will mute/unmute the speaker instead of a stop/play.

The `room` parameter must match the room name in Sonos *exactly*.

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

# Run Homebridge:

    $ homebridge

# Notes

The name "Speakers" is used in the name for the above example configurations instead of something more intuitive like "Sonos" or "Music" or "Radio".

This is because Siri has many stronger associations for those words. For instance, including "Sonos" in the name will likely cause Siri to just launch the Sonos app. And including "Music" in the name will cause Siri to launch the built-in Music app.

You could of course pick any other unique name, like "Turn on the croissants" if you want. Or add it to a Scene with a custom phrase.

# Alternative

You also might check out this [fork of `homebridge-sonos`](https://github.com/dominicstelljes/homebridge-sonos) by [dominicstelljes](https://github.com/dominicstelljes) that exposes the Sonos as a "lightbulb" instead of a switch. This will allow you control the volume through Siri - "Set the Speakers to 50%" for example. But it will have some side-effects. Check out his README for more details.
