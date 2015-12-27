# Sonos accessory 
This accessory allows you to turn sonos speakers on and off using Siri and a homekit enabled iOS app. 

 * _Siri, turn Bedroom Speakers on._
 * _Siri, turn Bedroom Speakers off._

# Installation

Homebridge is published through [NPM](https://www.npmjs.com/package/homebridge) and should be installed "globally" by typing:

    sudo npm install -g homebridge
    sudo npm install -g homebridge-sonos
    

# Configuration 
Add the following to your config.json. 

Example addition to existing config.json:

    ,{
      "accessories": [
        {
          "accessory": "Sonos",
          "name": "Bedroom Speakers",
          "room": "Bedroom"
        }
      ]
    }
    
Example new config.json
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

The `room` parameter must match the room name in Sonos *exactly*.

*Note:* the name "Speakers" is used in the name for this example instead of something more intuitive like "Sonos" or "Music" or "Radio", as Siri has many stronger associations for those words. For instance, including "Sonos" in the name will likely cause Siri to just launch the Sonos app. And including "Music" in the name will cause Siri to launch the built-in Music app.


# Run Homebridge:

    $ homebridge

