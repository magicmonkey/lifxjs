# LIFX network protocol

This is based purely on observations from using tcpdump and Wireshark (which are
both excellent tools) whilst using the iPhone app.  I have 2 bulbs, and
(currently) have no idea what most of the bytes in the network protocol mean.
However, the hope is that documenting what I find here will help in some way.

It is a work in progress.

## Common elements

The network protocol uses UDP and TCP in various places, but there seems to be
a common packet format used inside both layers.  This starts with the length of
the packet, and then (I think) has the type of packet.

## Discovery

The apps start by sending UDP "discovery" packets to the network broadcast
address, port 56700.  They do this repeatedly until a bulb responds by sending
a UDP packet back to you on port 56700 - I identify these by the 4th byte
containing 0x54.

The first response which matches this is what I'm using as the "controller"
bulb.  The controller appears to continue sending UDP packets, but I have not
yet dug in to these; my assumption is that they are general announcements to
the rest of the network in case there are multiple apps running which want to
control the bulbs.

## Control

After finding a controller bulb, open a TCP connection to it on port 56700.
All commands are sent down this stream.

## Feedback messages

The controller bulb appears to send data to the network as UDP packets, but it
also sends similar packets down the TCP connection.  These packets seem to have
the first 8 bytes or so as a header (including the packet length at the start)
and then the next 24 bytes as a bulb address.  If you have more than one bulb,
you will get a packet for each bulb with this address field changed to tell you
which bulb the packet is referring to.

The next byte (33) seems to be a packet type indicator, and the data after this
depends on what this byte is.

 * Packet type 0x16 seems to be an on/off indicator
 * Packet type 0x6b seems to be a complete status indicator, containing 15
   bytes of config (maybe hue / sat / lum?) and then the rest is the name given
   to the bulb by the iPhone app

_More to come_


