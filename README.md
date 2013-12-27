# JS library for LIFX bulbs

A NodeJS client for the [LIFX bulbs](http://lifx.co) based on my observations
of the network protocol using tcpdump and Wireshark.  This is very much
experimental, so is most likely incorrect or inaccurate, although it seems to
work for me.  You have been warned.  Observations are documented in
[Protocol.md](Protocol.md).

This is based on my setup of 2 bulbs in a single group.  That may or may not
affect the network protocol.  Also, I've not looked at how the bulbs are
initially setup to hop onto your wireless network; I configured mine with the
iPhone app, and this library is (currently) for manipulating the bulbs once
they are already attached to your network.

_Bonus: There's a demo web app in the "web" dir which just displays a colour
        picker and sets the bulbs to the chosen colour, and a demo mqtt bridge
        in the "mqtt" dir which bridges between an MQTT broker and the bulbs_

## Install

To install from NPM, do ```npm install lifx```, or just clone the github repo
(but you'll need to run ```npm install``` in this dir to get the "clone"
dependency if you get from github).

If you install form NPM, then do ```require("lifx");```.  If you cloned the
github repo then you'll need to do something like ```require("./lifx");``` (ie
specify the path to the dir you cloned into).

If you want to run the web or mqtt app, you also need to run ```npm install```
in the respective dir to get their dependencies.

## Files

There is 1 main file (lifx.js) which is all you need plus some example CLI
apps:

  * cli.js which is an example CLI app using the library
  * cli2.js which lets you cycle through individual parameters to get a feel
    for what they mean
  * cli3.js controls individual bulbs

My observations of the network protocol are documented in [this
doc](Protocol.md).  Hopefully LIFXLabs will release an official spec for the
network protocol which will make this a lot easier.

## Usage

The file [cli.js](cli.js) is a working example.

In addition to the main "Lifx" object which acts as your agent to the Lifx
bulbs, there are 2 fundamental objects in the library; a "gateway" object which
represents the wifi interface (and can do things like discovery of the other
bulbs, send messages to a bulb etc) and a "bulb" object which is useful for
sending commands to individual bulbs.

To begin with, you must include the library and then call ```lifx.init()```
which will return a new ```Lifx``` object and initialise discovery of gateways
and bulbs.

```JavaScript
var lifx = require('./lifx');
var lx   = lifx.init();
```

The Lifx object is an EventEmitter, and emits a "bulb" event whenever a new bulb
is found and a "gateway" event whenever a new gateway is found.  Note that
multiple bulbs can be acting as gateways on your network, especially if they
haven't yet formed their mesh network.

Once you have the Lifx object, you can use it to send commands to all of the
bulbs in the mesh network:

```Javascript
lx.lightsOn();
lx.lightsOff();
lx.lightsColour(hue,    saturation, luminance, whiteColour, fadeTime);
lx.lightsColour(0xd49e, 0xffff,     0x028f,    0x0dac,      0x0513);
```

or to target an individual bulb, pass an optional parameter:

```Javascript
var bulb = lx.bulbs[0];
lx.lightsOn(bulb);
lx.lightsOff(bulb);
lx.lightsColour(hue,    saturation, luminance, whiteColour, fadeTime, bulb);
lx.lightsColour(0xd49e, 0xffff,     0x028f,    0x0dac,      0x0513,   bulb);
```

The params are always 16-bit numbers, which get their bytes shuffled around
before being sent over the network (see the [protocol](Protocol.md) doc for the
underlying details).

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

The "packet.js" module constructs each raw packet type, which can be sent to all
bulbs using something like ```lx.sendToAll(packet.getLightState())```.
Similarly, to send a raw command to an individual bulb, use
```lx.sendToOne(packet.getLightState(), bulb)``` passing in a bulb object from
the lx.bulbs array.

If you want to see debug messages (including network traffic) then call

```JavaScript
lifx.setDebug(true);
```

## Wireshark dissector

There is a wireshark dissector for the LIFX protocol in the "wireshark"
directory.  To load it, run Wireshark with:

```
/path/to/wireshark -X lua_script:/path/to/lifx.lua
```

