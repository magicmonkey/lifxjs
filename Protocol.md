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

_More to come_


