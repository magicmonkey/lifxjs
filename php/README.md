# A PHP deamon for a REST like interface to the lifx bulbs
This creates a php daemon that should be started via a cron job or some other such manager. The daemon initiates discovery, and once a connection to the gateway bulb is initiated, a server is started on port 56701. If you are running this on a localhost, you would access it at http://localhost:56701/lifx. EG: http://localhost:56701/lifx/turn/on

We provide a REST like interface to the lifx bulbs. What we mean by REST like is:
* The response may or may not be returned as a response to the initial request
* The response may contain responses for other commands sent by smartphone apps, or other commands issued by the API

This is caused by the fact that the current command system for LiFx bulbs does not provide a synchronous command language, but a series of seperate command/replies
The response will contain an array of response objects using json encoding

## Commands
### /noop
Issues no commands to the LiFx bulbs, but will return any pending responses
### /status
Get the status of all current bulbs in the network
### /turn/on
Turns on all bulbs
### /turn/on/BULB_ADDRESS
Turns on a specific bulb with an address of BULB_ADDRESS. This address can be gathered by a response to the /status command
### /turn/off
Turns off all bulbs
### /newname/BULB_ADDRESS/NEW_NAME
Sets the name for the bulb located at BULB_ADDRESS with the new name NEW_NAME. NEW_NAME must be <=32 characters long
### /set/HUE/SATURATION/LUMINANCE/WHITECOLOR/FADE_DELAY
Sets the status of all bulbs to be the above colors and with the above time delays.
* hue represents the colour to use, and is manipulated by the colour wheel in
  the iPhone app.
* saturation represents how much of the colour to use, and is generally either
  0xffff (if using the "Colors" screen in the iPhone app) or 0x0000 (if using
  the "Whites" screen in the iPhone app).
* luminance is how bright the bulbs should be.
* whiteColour is something like the colour temperatue, and is the wheel used in
  the "Whites" screen in the iPhone app.
* fadeTime says how quickly the bulbs should move to the given state, and seem
  to roughly be in milliseconds.  Use 0 for an immediate change.

The params are always 16-bit numbers, which get their bytes shuffled around
before being sent over the network (see the [protocol](../Protocol.md) doc for the
underlying details).

### /set/HUE/SATURATION/LUMINANCE/WHITECOLOR/FADE_DELAY/BULB_ADDRESS
Sets the status of the bulb located at BULB_ADDRESS. See the above command for how to use the other parameters

## Responses
All of the responses are json objects with a type parameter equal the the name of the response. A single command issued to the REST interface may return multiple responses, and there may be mutiple types of responses generated.

### gateway
* ip The IP of the Gateway bulb
* addr The LiFx address of the gateway bulb.

### status
Generated in response to a /status command. There should be one response per bulb in the network
* bulb The LiFx address of the bulb
* color Also refered to above a Hue
* sat The saturation
* lum The Luminance to use
* temp The color of white to use
* status: on or off, depending if the bulb is on or off
* name: The name for the bulb. This is only an aid to the person, and has no effect on commands

### on/off
Generated in response to issuing a /turn/on or /turn/off command. There should be one response per bulb in the network
* bulb The LiFx address of the bulb
* status: on or off, depending if the bulb is on or off

### name
Generated in response to issuing a /newname command
* bulb The LiFx address of the bulb
* name: The name for the bulb. This is only an aid to the person, and has no effect on commands
