# Observed LIFX network protocol

This is based purely on observations from using tcpdump and Wireshark (which are
both excellent tools) whilst using the iPhone app.  I have 2 bulbs, and
(currently) have no idea what most of the bytes in the network protocol mean.
However, the hope is that documenting what I find here will help in some way.

It is a work in progress, and not in any way affiliated or related to LIFXlabs.

## Common elements

The network protocol uses UDP and TCP in various places, but there seems to be
a common packet format used inside both layers.

 * Byte  0:        The first byte is the packet length.
 * Bytes 1 - 2:    The next 2 bytes are always zero; they could be the packet
                   length for longer packets (ie >255 bytes).
 * Byte  3:        Appears to indicate direction of data; 0x14 = app to one
                   bulb, 0x34 = app to all bulbs, 0x54 = bulb to app
 * Bytes 4 - 7:    These always seem to be zero (could be padding on the
                   previous or subsequent fields)
 * Bytes 8 - 15:   The address of the target bulb (if byte 3 is 0x14), or all
                   zeroes if the target is all bulbs (ie byte 3 is 0x34).
 * Bytes 16 - 23:  These look like the address of the gateway bulb, ie the one
                   which is talking to the wifi network and the iPhone app.
 * Bytes 24 - 31:  Always zeroes.
 * Byte  32:       Seem to be the packet type.
 * Bytes 33 - end: Depends on the packet type.

In general, a 16 bit number looks to be least-significant byte first, then
most-significant-byte, for example the decimal number 2000 (0x7d0) would be
sent as the bytes 0xd0 0x07.

## Discovery

The apps start by sending UDP "discovery" packets to the network broadcast
address, port 56700.  They do this repeatedly until a bulb responds by sending
a UDP packet back to you on port 56700 - I identify these by the packet type
(ie byte 32) containing 0x03.

The first response which matches this is what I'm using as the "controller"
bulb.  The controller appears to continue sending UDP packets, but I have not
yet dug in to these; my assumption is that they are general announcements to
the rest of the network in case there are multiple apps running which want to
control the bulbs.

### Packet type 0x02 - Discovery request

This is the discovery packet, and is sent by the apps via UDP to the network
broadcast address (either the LAN broadcast address or 255.255.255.255) on UDP
port 56700.  It has all of the address fields (bytes 8-15 and 16-23) set to
zeroes because it does not yet know about the gateway bulb.

 * Byte  32:      0x02
 * Bytes 33 - 35: Always zeroes.

Will hopefully cause a packet type 0x03 to be sent back; the apps should treat
the originator of this response as the gateway bulb for further communication.

### Packet type 0x03 - Discovery response

This is the response to the discovery packet, and is sent by the gateway bulb
via UDP to port 56700 to the network broadcast address.

 * Byte  32:      0x02
 * Bytes 33 - 35: Always zeroes.
 * Byte  36:      Unknown, observed to be either 0x01 or 0x02.
 * Bytes 37 - 40: Unknown, always 0x7c 0xdd 0x00 0x00

After receiving this packet, I open a TCP connection to the originator on TCP
port 56700 for subsequent communication.

## Control

After finding a controller bulb, open a TCP connection to it on port 56700.
All commands are sent down this stream.

The packet types (byte 32) which I've seen so far:

 * 0x16 sets the on/off status of a bulb
 * 0x18 changes the name of a bult
 * 0x65 requests 0x6b packets for each bulb
 * 0x66 changes the color and brightness of a bulb

### Packet type 0x66 - Set bulb state request

These packets are used by the apps to send a target state to the bulbs; the
bulbs then execute their own fade towards this state.

 * Byte  32:      0x66
 * Bytes 33 - 36: Always zeroes.
 * Bytes 37 - 38: These are the "hue" (ie the colour), and are the only bytes
                  which change when rotating the colour wheel in the iPhone
                  app.  It wraps around at 0xff 0xff back to 0x00 0x00 which is
                  a primary red colour.
 * Bytes 39 - 40: Always 0xff 0xff (maybe saturation? ie the "amount" or depth
                  of the colour).
 * Bytes 41 - 42: These are the "luminance" (ie the brightness)
 * Bytes 43 - 44: These are hue of the white light, basically the colour
                  temperature.  It's what is changed by the "whites" wheel in
                  the iPhone app.
 * Bytes 45 - 46: These say how long the fade should take.
 * Bytes 47 - 48: Unknown, but always zeroes

Note that for the "whites", the app always sets hue and saturation (bytes 37,
38, 39, and 40) to 0x00.  The white colour appears to have a fairly narrow
range, such that 0-10 is very yellow, 14 is a natural white, then 15-30 fades
to blue.  Anything beyond that seems to be very blue.

### Packet type 0x65 - Status request

This packet prompts the gateway bulb to send a status message for each bulb.

 * Byte  32:      0x65
 * Bytes 33 - 35: Always zeroes.

Will generally be followed by one or more 0x6b packets in response.

### Packet type 0x15 - On / off request

This packet type turns the bulbs on and off.

 * Byte  32:      0x15
 * Bytes 33 - 35: Always zeroes.
 * Bytes 36:      0x01 to turn on, or 0x00 to turn off
 * Bytes 37:      Always zero.

Will generally cause a packet 0x16 in response.

### Packet type 0x18 - Change Name

This packet type changes the name of a bulb

 * Byte  32:       0x18
 * Bytes 33 - 35:  Always zeroes.
 * Byte  36 - end: New name, standard ascii encoding. Max length unknown.

Generated responses of packet type 0x1b (over TCP to specific IPs), and 0x19
(over UDP to broadcast ip), and 0x6b

## Feedback messages

The controller bulb appears to send data to the network as UDP packets, but it
also sends similar packets down the TCP connection.  These packets conform to
the common elements detailed above.

If you have more than one bulb, you will get a packet for each bulb with the
second address field changed to tell you which bulb the packet is referring to.

The packet types (byte 32) which I've seen so far:

 * 0x16 seems to be an on/off indicator
 * 0x19 seems to be a name change indicator
 * 0x6b seems to be a complete status indicator

### Packet type 0x6b - Status response

This is sent by the bulbs to the apps to indicate the current state of the
bulbs.  If mid-fade, then this packet will show a snapshot of where the
bulbs are at the present time.

 * Byte  32:       0x6b
 * Bytes 33 - 35:  Always zeroes.
 * Bytes 36 - 37:  The "hue" (ie the colour).  It wraps around at 0xff 0xff back
                   to 0x00 0x00 which is a primary red colour.
 * Bytes 38 - 39:  The "saturation" (generally 0x00 for whites, ramping to
 *                 0xffff for a deep colour.
 * Bytes 40 - 41:  The "luminance" (ie the brightness).
 * Bytes 42 - 43:  The colour temperature (ie the "white colour")
 * Bytes 44 - 45:  Unknown, but these seem to be zeroes.
 * Bytes 46 - 47:  On/off - 0xffff means on, and 0x0000 means off.
 * Bytes 48 - end: The name of the bulb as set by the iPhone app.

### Packet type 0x16 - On / off response

This is sent by the bulbs to the apps to say whether the bulbs are on or off.
It is generally sent as a result of an on/off command from the apps.

 * Byte  32:       0x16
 * Bytes 33 - 35:  Always zeroes.
 * Bytes 36 - 37:  On/off indicator; 0x0000 means the bulbs are off, and 0xffff
                   means that the bulbs are on.

### Packet type 0x19 - Name Change response

This is sent by the bulbs to the apps to say when a name change has been requested.
 * Byte  32:        0x16
 * Bytes 33 - 35:   Always zeroes.
 * Bytes 36 - end:  New name, standard ascii encoding. Max length unknown.

_More to come_

