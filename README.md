
# Sonos Platform

Example config.json:

    {
      "accessories": [
        {
          "accessory": "Sonos",
          "enable_speaker_service": true,
          "firmware_revision": "1.2.3",
          "hardware_revision": "1.2.3",
          "model": "Play:1",
          "name": "Living Room Speaker",
          "room": "Living Room",
          "serial_number": "12345"
        }
      ]
    }

The `room` parameter must match the room name in Sonos exactly.
