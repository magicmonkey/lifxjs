# Observed LIFX network protocol

It is a work in progress and is not, in any way, affiliated or related to LIFX
Labs.

## Description of the various stages

### Discovery

The apps start by sending UDP "discovery" packets to the network broadcast
address, port 56700.  They do this repeatedly until a bulb responds by sending
a UDP packet back to you on port 56700. Packets are identified via its type (of
0x03).

The first response which matches this is what I'm using as the "controller"
bulb.  The controller appears to continue sending UDP packets, but I have not
yet dug in to these; my assumption is that they are general announcements to
the rest of the network in case there are multiple apps running which want to
control the bulbs.

### Registration

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

### Control

After finding a controller bulb, open a TCP connection to it on port 56700.
All commands are sent down this stream.

### Feedback messages

The controller bulb appears to send data to the network as UDP packets, but it
also sends similar packets down the TCP connection.  These packets conform to
the common elements detailed above.

If you have more than one bulb, you will get a packet for each bulb with the
second address field changed to tell you which bulb the packet is referring to.

## Packet frame

The network protocol uses UDP and TCP in various places, but there seems to be
a common packet format used. Packet field data appears to be of mixed
endianness.

```c
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

  varies payload;           // Documented below per packet type
}
```

## List of packet types

### Network management
 * [0x02 - Get PAN gateway](#0x02) - app to bulb
 * [0x03 - Device state response](#0x03) - bulb to app

### Power management
 * [0x15 - Set on / off](#0x15) - app to bulb
 * [0x16 - On / off status](#0x16) - bulb to app
 * 0x20 - Request on / off status - app to bulb

### Wireless management
 * 0x12d - Request wifi state - app to bulb
 * 0x12e - Set wifi state - app to bulb
 * 0x12f - Wifi state - bulb to app
 * 0x130 - Request access points - app to bulb
 * [0x131 - Set access point](#0x131) - app to bulb
 * 0x132 - Access points - bulb to app

### Labels and Tags
 * 0x17 - Request bulb name - app to bulb
 * [0x18 - Set bulb name](#0x18) - app to bulb
 * [0x19 - Bulb name](#0x19) - bulb to app
 * 0x1a - Request tags - app to bulb
 * 0x1c - Tags - bulb to app
 * 0x1d - Request tag labels - app to bulb
 * 0x1f - Tag labels - bulb to app

### Brightness and Colors
 * [0x65 - Get bulb status](#0x65) - app to bulb
 * [0x66 - Set bulb state](#0x66) - app to bulb
 * 0x67 - Set waveform - app to bulb
 * 0x68 - Set dim (absolute) - app to bulb
 * 0x69 - Set dim (relative) - app to bulb
 * [0x6b - Bulb status](#0x6b) - bulb to app

## Description of packet types
 
### <a name="0x02"></a>0x02 - Get PAN gateway

This is the discovery packet, and is sent by the apps via UDP to the network
broadcast address (either the LAN broadcast address or 255.255.255.255) on UDP
port 56700.  It has all of the address fields (bytes 10-15 and 18-23) set to
zeroes because it does not yet know about the gateway bulb.

#### Payload (0 bytes)

```c
payload {
  // None
}
```

#### Subsequent actions

Will hopefully cause a packet type 0x03 to be sent back; the apps should treat
the originator of this response as the PAN gateway bulb for further
communication.

### <a name="0x03"></a>0x03 - Device state response

This is the response to the discovery packet, and is sent by the gateway bulb
via UDP to port 56700 to the network broadcast address.  There will be one
packet per PAN gateway on the network.

#### Payload (3 bytes)

```c
payload {
  uint8  unknown1;  // observed to be either 1 or 2
  uint16 unknown2;  // observed to always be 0x7c 0xdd 0x00 0x00
}
```

#### Subsequent actions

After receiving this packet, I open a TCP connection to the originator on TCP
port 56700 for subsequent communication.

### <a name="0x131"></a>0x131 - Set access point

#### Payload (98 bytes)

```c
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
  STATION = 2  // connect
}

enum SECURITY_PROTOCOL : byte
{
   OPEN           = 1,
   WEP_PSK        = 2, // Not officially supported
   WPA_TKIP_PSK   = 3,
   WPA_AES_PSK    = 4,
   WPA2_AES_PSK   = 5,
   WPA2_TKIP_PSK  = 6,
   WPA2_MIXED_PSK = 7
}
```

### <a name="0x15"></a>0x15 - Set on / off

This packet type turns the bulbs on and off.

#### Payload (2 bytes)

```c
payload
{
  ONOFF onoff;
}

enum ONOFF : uint16
{
  OFF = 0,
  ON  = 1
}
```

#### Subsequent actions

Will generally cause a packet [0x16](#0x16) in response.

### <a name="0x18"></a>0x18 - Set bulb name

This packet type changes the name of a bulb

#### Payload (variable bytes)

```c
payload
{
  char newName[]; // New name, standard ascii encoding. Max length unknown.
}
```

#### Subsequent actions

Generated responses of packet type [0x1b](#0x1b) (over TCP to specific IPs), and
[0x19](#0x19) (over UDP to broadcast ip), and [0x6b](#0x6b).

### <a name="0x65"></a>0x65 - Get bulb status

This packet prompts the gateway bulb to send a status message for each bulb.

#### Payload (0 bytes)

```c
payload {
  // None
}
```

#### Subsequent actions

Will generally be followed by one or more [0x6b](#0x6b) packets in response.

### <a name="0x66"></a>Packet type 0x66 - Set bulb state

These packets are used by the apps to send a target state to the bulbs; the
bulbs then execute their own fade towards this state.

#### Payload (13 bytes)

```c
payload {
  uint8  reserved1;   // Always 0
  uint16 hue;         // LE the "hue" (ie the colour), the only bytes which change
                      // when rotating the colour wheel in the iPhone app.  It
                      // wraps around at 0xff 0xff back to 0x00 0x00 which is a
                      // primary red colour.
  uint16 saturation;  // LE the "saturation" (ie the amount or depth of the
                      // colour)
  uint16 luminance;   // LE the "luminance" (ie the brightness)
  uint16 whiteColour; // LE the "white colour", basically the colour
                      // temperature.  It's what is changed by the "whites"
                      // wheel in the iPhone app.
  uint16 fadeTime;    // LE how long the fade to this colour should take
  uint16 reserved2;   // Always 0
}
```

Note that for the "whites", the app always sets hue and saturation (bytes 37,
38, 39, and 40) to 0x00.  The white colour appears to have a fairly narrow
range, such that 0-10 is very yellow, 14 is a natural white, then 15-30 fades
to blue.  Anything beyond that seems to be very blue.

#### Subsequent actions

None

### <a name="0x16"></a>0x16 - On / off status

This is sent by the bulbs to the apps to say whether the bulbs are on or off.
It is generally sent as a result of an on/off command from the apps.

#### Payload (2 bytes)

```c
payload
{
  ONOFF onoff;
}

enum ONOFF : uint16
{
  OFF = 0x0000,
  ON  = 0xffff
}
```

#### Subsequent actions

None

### <a name="0x19"></a>0x19 - Bulb name

This is sent by the bulbs to the apps to report their name, generally after a
name change has been requested to confirm the new name.

#### Payload (variable bytes)

```c
payload
{
  char newName[]; // New name, standard ascii encoding. Max length unknown.
}
```

#### Subsequent actions

None

### <a name="0x6b"></a>0x6b - Bulb status

This is sent by the bulbs to the apps to indicate the current state of the
bulbs.  If mid-fade, then this packet will show a snapshot of where the
bulbs are at the present time.

#### Payload (variable bytes)

```c
payload {
  uint16 hue;         // LE the "hue"
  uint16 saturation;  // LE the "saturation"
  uint16 luminance;   // LE the "luminance"
  uint16 whiteColour; // LE the "white colour"
  uint16 unknown1;    //
  char bulbName[];    // The name of the bulb
}
```

