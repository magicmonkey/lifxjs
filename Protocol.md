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

In general, a 16 bit number looks to be least-significant byte first, then
most-significant-byte, for example the decimal number 2000 (0x7d0) would be
sent as the bytes 0xd0 0x07.

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

The commands to change the colour are sent with packet type 0x66.

### Packet type 0x66

 * Byte  32:      0x66
 * Bytes 33 - 36: Always zeroes.
 * Bytes 37 - 38: These are the "hue" (ie the colour), and are the only bytes
                  which change when rotating the colour wheel in the iPhone
                  app.  It wraps around at 0xff 0xff back to 0x00 0x00 which is
                  a primary red colour.
 * Bytes 39 - 40: Always 0xff 0xff (maybe saturation? ie the "amount" or depth
                  of the colour).
 * Bytes 41 - 42: These are the "luminance" (ie the brightness)
 * Bytes 43 - 44: Unknown, but these seem to always be 0xac 0x0d
 * Bytes 45 - 46: Unknown, but these seem to be 0x90 0x01 or 0x13 0x05
 * Bytes 47 - 48: Unknown, but always zeroes

I would guess that some of the unknown bytes (maybe 45,46?) are to do with how
fast the bulbs fade from their current state to the target state.

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


