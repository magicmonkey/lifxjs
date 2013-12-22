# Observed LIFX network protocol

It is a work in progress and is not, in any way, affiliated or related to LIFX
Labs.

## Packet frame

The network protocol uses UDP and TCP in various places, but there seems to be
a common packet format used. Packet field data appears to be of mixed
endianness.

````c
packet
{
  uint16 size;              // LE
  uint16 protocol;
  uint32 reserved1;         // Always 0x0000
  byte   target_mac_address[6];
  uint16 reserved2;         // Always 0x00
  byte   site[6];           // MAC address of gateway PAN controller bulb
  uint16 reserved3;         // Always 0x00
  uint64 timestamp;
  uint16 packet_type;       // LE
  uint16 reserved4;         // Always 0x0000
  
  varies payload;
}
````

## Packet types

### Network management
 * 0x02 - app to bulb - get PAN gateway
 * 0x03 - bulb to app - device state<pan gateway>

### Power management
 * 0x15 - app to bulb - set state
 * 0x16 - bulb to app - power state
 * 0x20 - app to bulb - get state [?]

### Wireless management
 * 0x12d - app to bulb - get state
 * 0x12e - app to bulb - set state
 * 0x12f - bulb to app - wifi state
 * 0x130 - app to bulb - get access point
 * 0x131 - app to bulb - set access point
 * 0x132 - bulb to app - wifi state<access point>

### Labels and Tags
 * 0x17 - app to bulb - get label
 * 0x18 - app to bulb - set label
 * 0x19 - bulb to app - device state<label>
 * 0x1a - app to bulb - get tags
 * 0x1c - bulb to app - device state<tags>
 * 0x1d - app to bulb - get tag labels
 * 0x1f - bulb to app - device state<tag labels>

### Brightness and Colors
 * 0x65 - app to bulb - get color
 * 0x66 - app to bulb - set color
 * 0x67 - app to bulb - set waveform
 * 0x68 - app to bulb - set dim (absolute)
 * 0x69 - app to bulb - set dim (relative)
 * 0x6b - bulb to app - light state
 
## Discovery

The apps start by sending UDP "discovery" packets to the network broadcast
address, port 56700.  They do this repeatedly until a bulb responds by sending
a UDP packet back to you on port 56700. Packets are identified via its type (of
0x03).

The first response which matches this is what I'm using as the "controller"
bulb.  The controller appears to continue sending UDP packets, but I have not
yet dug in to these; my assumption is that they are general announcements to
the rest of the network in case there are multiple apps running which want to
control the bulbs.

### Packet type 0x02 - Discovery request

This is the discovery packet, and is sent by the apps via UDP to the network
broadcast address (either the LAN broadcast address or 255.255.255.255) on UDP
port 56700.  It has all of the address fields (bytes 10-15 and 18-23) set to
zeroes because it does not yet know about the gateway bulb.

 * Byte  32:      0x02
 * Bytes 33 - 35: Always zeroes.

Will hopefully cause a packet type 0x03 to be sent back; the apps should treat
the originator of this response as the gateway bulb for further communication.

### Packet type 0x03 - Device state response

This is the response to the discovery packet, and is sent by the gateway bulb
via UDP to port 56700 to the network broadcast address.

 * Byte  32:      0x02
 * Bytes 33 - 35: Always zeroes.
 * Byte  36:      Unknown, observed to be either 0x01 or 0x02.
 * Bytes 37 - 40: Unknown, always 0x7c 0xdd 0x00 0x00

After receiving this packet, I open a TCP connection to the originator on TCP
port 56700 for subsequent communication.

## Registration

An unconfigured bulb will listen at 172.16.0.1 and act as an access point,
hosting a secure network with the name "LIFX Bulb" and password of 'lifx1234'.

Configuration of a bulb involves connecting to the bulb's hosted network and
sending a "set access point" message to the bulb. This message contains the
information it needs to join your existing wireless network infrastructure
(such as SSID and password). Networks using WEP security are not supported.

After receipt of the message, the bulb will shut down the hosted network
and attempt connection to the existing wireless network infrastructure.

The "get access point" message can be used to enumerate wireless access points
visible by the bulb.


### Packet type 0x131 - Set Access Point

#### Payload (98 bytes)

````c
payload
{
  INTERFACE_MODE interface;
  char ssid[32];      // UTF-8 encoded string
  char password[64];  // UTF-8 encoded string
  SECURITY_PROTOCOL security_protocol; 
}

enum INTERFACE_MODE : byte
{
  SOFT_AP = 1, // listen + connect
  STATION      // connect
}

enum SECURITY_PROTOCOL : byte
{
   OPEN = 1,
   WEP_PSK, // Not officially supported
   WPA_TKIP_PSK,
   WPA_AES_PSK,
   WPA2_AES_PSK,
   WPA2_TKIP_PSK,
   WPA2_MIXED_PSK,
}
````

## Control

After finding a controller bulb, open a TCP connection to it on port 56700.
All commands are sent down this stream.

### Packet type 0x15 - On / off request

This packet type turns the bulbs on and off.

 * Byte  32:      0x15
 * Bytes 33 - 35: Always zeroes.
 * Bytes 36:      0x01 to turn on, or 0x00 to turn off
 * Bytes 37:      Always zero.

Will generally cause a packet 0x16 in response.

### Packet type 0x18 - Change name request

This packet type changes the name of a bulb

 * Byte  32:       0x18
 * Bytes 33 - 35:  Always zeroes.
 * Byte  36 - end: New name, standard ascii encoding. Max length unknown.

Generated responses of packet type 0x1b (over TCP to specific IPs), and 0x19
(over UDP to broadcast ip), and 0x6b

### Packet type 0x65 - Status request

This packet prompts the gateway bulb to send a status message for each bulb.

 * Byte  32:      0x65
 * Bytes 33 - 35: Always zeroes.

Will generally be followed by one or more 0x6b packets in response.

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

### Packet type 0x16 - On / off response

This is sent by the bulbs to the apps to say whether the bulbs are on or off.
It is generally sent as a result of an on/off command from the apps.

 * Byte  32:       0x16
 * Bytes 33 - 35:  Always zeroes.
 * Bytes 36 - 37:  On/off indicator; 0x0000 means the bulbs are off, and 0xffff
                   means that the bulbs are on.

### Packet type 0x19 - Change name response

This is sent by the bulbs to the apps to say when a name change has been
requested.
 * Byte  32:        0x16
 * Bytes 33 - 35:   Always zeroes.
 * Bytes 36 - end:  New name, standard ascii encoding. Max length unknown.

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

