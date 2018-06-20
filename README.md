
# Sonos Accessory
Example config.json:

    {
      "accessories": [
        {
          "accessory": "Sonos",
          "name": "Living Room Speakers",
          "room": "Living Room"
        }
      ]
    }

The `room` parameter must match the "room name" in Sonos App exactly.

Note that the name "Speakers" is used in the name for this example instead of something more intuitive like "Sonos" or "Music" or "Radio", as Siri has many stronger associations for those words. For instance, including "Sonos" in the name will likely cause Siri to just launch the Sonos app. And including "Music" in the name will cause Siri to launch the built-in Music app.

IMPORTANT: This is a fork of the plugin from https://github.com/dominicstelljes/homebridge-sonos.<br> 
Changes:<br>
-- Recognition of the Sonos state when changed by different plugin (like Harmony).

INSTALATION: 
npm -g install https://github.com/msutara/homebridge-sonos.git