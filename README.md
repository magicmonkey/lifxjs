# JS library for LIFX bulbs

Some experimentation with trying to interpret the network protocol for [LIFX
bulbs](http://lifx.co).  This is very much observational, and an evolving
investigation, so there's not very much info here and what there is is most
likely incorrect or inaccurate.  You have been warned.

This is based on my setup of 2 bulbs in a single group.  That may or may not
affect the network protocol.

Ideally, I'll end up with a nice little NodeJS library which can be used to
build apps with.

## Files

There are 2 files:

  * lifx.js which is the actual library
  * cli.js which is an example CLI app using the library

The library is made up of network packets, observed by tcpdump'ing the traffic
from the official iPhone app.

My observations of the network protocol are documented in [this
doc](Protocol.md).  Hopefully LIFXLabs will release an official spec for the
network protocol which will make this a lot easier, or even not needed.

