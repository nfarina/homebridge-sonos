
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
