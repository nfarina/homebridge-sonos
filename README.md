
# Sonos Platform

Example config.json:

    {
      "accessories": [
        {
          "accessory": "Sonos",
          "name": "Bedroom Speakers",
          "room": "Bedroom"
        }
      ]
    }

The `room` parameter must match the room name in Sonos exactly.

Note that the name "Speakers" is used in the name for this example instead of something more intuitive like "Sonos" or "Music" or "Radio", as Siri has many stronger associations for those words. For instance, including "Sonos" in the name will likely cause Siri to just launch the Sonos app. And including "Music" in the name will cause Siri to launch the built-in Music app.

IMPORTANT: This is a fork of the original plugin by https://github.com/nfarina.<br> 
Changes:<br>
-- You can make Siri change the volume<br>
-- You can change the volume in the Home App<br>
-- Sonos will pause the music instead of stop<br>

BUT:<br>
-- Siri will turn off sonos if you say "Turn off the lights" or change the volume if you say "Dim the lights to 20%".
