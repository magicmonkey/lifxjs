# LIFX network protocol

This is based purely on observations from using tcpdump and Wireshark (which are
both excellent tools) whilst using the iPhone app.  I have 2 bulbs, and
(currently) have no idea what most of the bytes in the network protocol mean.
However, the hope is that documenting what I find here will help in some way.

It is a work in progress.

## Common elements

The network protocol uses UDP and TCP in various places, but there seems to be
a common packet format used inside both layers.

 * Byte  0:        The first byte is the packet length
 * Bytes 1 - 2:    The next 2 bytes This starts with the length of the packet, and
                   then (I think) has the type of packet.
 * Byte  3:        Appears to indicate direction of data; 0x34 = app to bulb,
                   0x54 = bulb to app
 * Bytes 4 - 7:    These always seem to be zero (could be padding on the previous
                   or subsequent fields)
 * Bytes 8 - 15:   These look like an address of some kind (maybe the destination
                   address?).  It is sometimes all zeroes, which could be a kind
                   of "broadcast" or something like that?
 * Bytes 16 - 23:  These look like an address of some kind (maybe the source
                   address?).
 * Bytes 24 - 31:  Always zeroes.
 * Byte  32:       Seem to be the packet type.
 * Bytes 33 - end: Depends on the packet type.

## Discovery

The apps start by sending UDP "discovery" packets to the network broadcast
address, port 56700.  They do this repeatedly until a bulb responds by sending
a UDP packet back to you on port 56700 - I identify these by the 33rd byte
containing 0x03.

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
also sends similar packets down the TCP connection.  These packets conform to
the common elements detailed above.

If you have more than one bulb, you will get a packet for each bulb with the
second address field changed to tell you which bulb the packet is referring to.

The packet types (byte 33) which I've seen so far:

 * 0x03 seems to be an introduction packet, which you get when first
   discovering a network
 * 0x16 seems to be an on/off indicator
 * 0x6b seems to be a complete status indicator, containing 15 bytes of config
   (maybe hue / sat / lum?) and then the rest is the name given to the bulb by
   the iPhone app


_More to come_


