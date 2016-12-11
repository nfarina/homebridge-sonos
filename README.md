
# Sonos Platform

Example config.json:

    {
      "accessories": [
        {
          "accessory": "Sonos",
          "name": "Bedroom Speakers",
          "room": "Bedroom",
          "mute": true
        }
      ]
    }

The `room` parameter must match the room name in Sonos exactly.

Note that the name "Speakers" is used in the name for this example instead of something more intuitive like "Sonos" or "Music" or "Radio", as Siri has many stronger associations for those words. For instance, including "Sonos" in the name will likely cause Siri to just launch the Sonos app. And including "Music" in the name will cause Siri to launch the built-in Music app.

The "mute" parameter is optional.  Setting it to `true` will mute/unmute the speaker instead of a stop/play.

# Alternative

You also might check out this [fork of `homebridge-sonos`](https://github.com/dominicstelljes/homebridge-sonos) by [dominicstelljes](https://github.com/dominicstelljes) that exposes the Sonos as a "lightbulb" instead of a switch. This will allow you control the volume through Siri - "Set the Speakers to 50%" for example. But it will have some side-effects. Check out his README for more details.
