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
 * [0x03 - PAN gateway](#0x03) - bulb to app

### Power management
 * [0x14 - Get power state](#0x14) - app to bulb 
 * [0x15 - Set power state](#0x15) - app to bulb
 * [0x16 - Power state](#0x16) - bulb to app

### Wireless management
 * [0x10 - Get wifi info](#0x10) - app to bulb
 * [0x11 - Wifi info](#0x11) - bulb to app
 * [0x12 - Get wifi firmware state](#0x12) - app to bulb
 * [0x13 - Wifi firmware state](#0x13) - bulb to app
 * [0x12d - Get wifi state](#0x12d) - app to bulb
 * [0x12e - Set wifi state](#0x12e) - app to bulb
 * [0x12f - Wifi state](#0x12f) - bulb to app
 * [0x130 - Get access points](#0x130) - app to bulb
 * [0x131 - Set access point](#0x131) - app to bulb
 * [0x132 - Access point](#0x132) - bulb to app

### Labels and Tags
 * [0x17 - Get bulb label](#0x17) - app to bulb
 * [0x18 - Set bulb label](#0x18) - app to bulb
 * [0x19 - Bulb label](#0x19) - bulb to app
 * [0x1a - Get tags](#0x1a) - app to bulb
 * [0x1b - Set tags](#0x1b) - app to bulb
 * [0x1c - Tags](#0x1c) - bulb to app
 * [0x1d - Get tag labels](#0x1d) - app to bulb
 * [0x1e - Set tag labels](#0x1e) - app to bulb
 * [0x1f - Tag labels](#0x1f) - bulb to app

### Brightness and Colors
 * [0x65 - Get light state](#0x65) - app to bulb
 * [0x66 - Set light color](#0x66) - app to bulb
 * [0x67 - Set waveform](#0x67) - app to bulb
 * [0x68 - Set dim (absolute)](#0x68) - app to bulb
 * [0x69 - Set dim (relative)](#0x69) - app to bulb
 * [0x6b - Light status](#0x6b) - bulb to app

### Time
 * [0x04 - Get time](#0x04) - app to bulb
 * [0x05 - Set time](#0x05) - app to bulb
 * [0x06 - Time state](#0x06) - bulb to app

### Diagnostic
 * [0x07 - Get reset switch](#0x07) - app to bulb
 * [0x08 - Reset switch state](#0x08) - bulb to app
 * 0x09 - Get dummy load - app to bulb
 * 0x0a - Set dummy load - app to bulb
 * 0x0b - Dummy load - bulb to app
 * [0x0c - Get mesh info](#0x0c) - app to bulb
 * [0x0d - Mesh info](#0x0d) - bulb to app
 * [0x0e - Get mesh firmware](#0x0e) - app to bulb
 * [0x0f - Mesh firmware state](#0x0f) - bulb to app
 * [0x20 - Get version](#0x20) - app to bulb
 * [0x21 - Version state](#0x21) - bulb to app
 * [0x22 - Get info](#0x22) - app to bulb
 * [0x23 - Info](#0x23) - bulb to app
 * [0x24 - Get MCU rail voltage](#0x24) - app to bulb
 * [0x25 - MCU rail voltage](#0x25) - bulb to app
 * [0x26 - Reboot](#0x26) - app to bulb
 * [0x27 - Set Factory Test Mode](#0x27) - app to bulb
 * [0x28 - Disable Factory Test Mode](#0x28) - app to bulb

## Description of packet types
 
### <a name="0x02"></a>0x02 - Get PAN gateway

Sent to a network (UDP broadcast) or bulb (TCP direct) to retrieve its PAN
gateway state.

This packet is typically broadcast to discover gateway bulbs on the local
network. (UDP datagram, port 56700.) As the destination bulb is unknown,
the packet frame's address field is zeroed out.

#### Payload (0 bytes)

```c
payload {
  // None
}
```

#### Subsequent actions

Will hopefully cause a packet type [0x03](#0x03) to be sent back;
apps should treat the originator of this response as a PAN gateway bulb for
further communication.

### <a name="0x03"></a>0x03 - PAN gateway

Received from a gateway bulb after a request for its PAN gateway state
(direct or broadcast). One packet describes one gateway bulb (i.e. you will
receive a few of these packets).

#### Payload (5 bytes)

```c
payload {
  SERVICE service;
  uint32 port;     // LE
}

enum SERVICE : byte
{
  UDP = 1,
  TCP = 2
}
```

#### Subsequent actions

After receiving this packet, I open a TCP connection to the originator on TCP
port 56700 for subsequent communication.

### <a name="0x04"></a>0x04 - Get time

Sent to a bulb to get its internal time value.

#### Payload (0 bytes)

```c
payload {
  // None
}
```

### <a name="0x05"></a>0x05 - Set time

Sent to a bulb to set its internal time value.

#### Payload (8 bytes)

```c
payload {
  uint64 time; // LE; microseconds since 00:00:00 UTC on 1 January 1970
}
```

### <a name="0x06"></a>0x06 - Time state

Received from a bulb after a request for its current time value.

#### Payload (8 bytes)

```c
payload {
  uint64 time; // LE; microseconds since 00:00:00 UTC on 1 January 1970
}
```

### <a name="0x07"></a>0x07 - Get reset switch state

Sent to a bulb to get the position of the physical reset switch (up/down).

#### Payload (0 bytes)

```c
payload {
  // None
}
```

### <a name="0x08"></a>0x08 - Reset switch state

Received from a bulb after a request is made for the position of the physical
reset switch.

#### Payload (2 bytes)

```c
payload
{
  RESET_SWITCH_POSITION position;
}

enum RESET_SWITCH_POSITION: uint8
{
  UP = 0,
  DOWN = 1
}

```

### <a name="0x0c"></a>0x0c - Get mesh info

Sent to a bulb to retrieve wireless mesh info and other miscellany.

#### Payload (0 bytes)

```c
payload
{
  // None
}
```

### <a name="0x0d"></a>0x0d - Mesh info

Received from a bulb after a request is made for its mesh info.

#### Payload (14 bytes)

```c
payload
{
  float signal;          // LE
  int tx;                // LE
  int rx;                // LE
  short mcu_temperature;
}
```

### <a name="0x0e"></a>0x0e - Get mesh firmware

Sent to a bulb to retrieve wireless mesh firmware state.

#### Payload (0 bytes)

```c
payload
{
  // None
}
```

### <a name="0x0f"></a>0x0f - Mesh firmware state

Received from a bulb after a request is made for its firmware state.

#### Payload (20 bytes)

```c
payload
{
  LIFX_TIMESTAMP build;
  LIFX_TIMESTAMP install;
  uint32 version;          // LE?
}

struct LIFX_TIMESTAMP
{
  byte second;
  byte minute;
  byte hour;
  byte day;
  char month[3]; // LE; ASCII encoded
  byte year;
}
```

### <a name="0x10"></a>0x10 - Get wifi info

Sent to a bulb to retrieve its wifi info.

#### Payload (0 bytes)

```c
payload
{
  // None
}
```

### <a name="0x11"></a>0x11 - Wifi info

Received from a bulb after a request is made for its wifi info.

#### Payload (14 bytes)

```c
payload
{
  float signal;   // LE
  int tx;         // LE
  int rx;         // LE
  short mcu_temperature;
}
```

### <a name="0x12"></a>0x12 - Get wifi firmware state

Sent to a bulb to retrieve its wifi firmware [state? version?].

#### Payload (0 bytes)

```c
payload
{
  // None
}
```

### <a name="0x13"></a>0x13 - Wifi firmware state

Received from a bulb after a request is made for its firmware [state? version?].

#### Payload (20 bytes)

```c
payload
{
  LIFX_TIMESTAMP build;
  LIFX_TIMESTAMP install;
  uint32 version;           // LE?
}

struct LIFX_TIMESTAMP
{
  byte second;
  byte minute;
  byte hour;
  byte day;
  char month[3]; // LE; ASCII encoded
  byte year;
}
```

### <a name="0x14"></a>0x14 - Get power state

Sent to a bulb to retrieve its current power state (i.e. on or off). This
packet is of questionable value.

#### Payload (0 bytes)

```c
payload
{
  // None
}
```

### <a name="0x15"></a>0x15 - Set power state

Sent to a bulb to set its power state (i.e. on or off).

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

### <a name="0x16"></a>0x16 - Power state

Received from a bulb after a request for its power state.

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

### <a name="0x17"></a>0x17 - Get bulb label

Sent to a bulb to get its label.

#### Payload (0 bytes)

```c
payload {
  // None
}
```

### <a name="0x18"></a>0x18 - Set bulb label

Sent to a bulb to change its label.

#### Payload (32 bytes)

```c
payload
{
  char label[32]; // UTF-8 encoded string
}
```

#### Subsequent actions

Generated responses of packet type [0x1b](#0x1b) (over TCP to specific IPs), and
[0x19](#0x19) (over UDP to broadcast ip), and [0x6b](#0x6b).

### <a name="0x19"></a>0x19 - Bulb label

Received from a bulb after a label request or change is made.

#### Payload (32 bytes)

```c
payload
{
  char label[32]; // UTF-8 encoded string
}
```

### <a name="0x1a"></a>0x1a - Get tags

Sent to a bulb to request its tags.

#### Payload (0 bytes)

```c
payload
{
  // None
}
```

### <a name="0x1b"></a>0x1b - Set tags

Sent to a bulb to set its tags.

#### Payload (8 bytes)

```c
payload
{
  uint64 tags;
}
```

### <a name="0x1c"></a>0x1c - Tags

Received from a bulb after a request for its tags.

#### Payload (8 bytes)

```c
payload
{
  uint64 tags;
}
```

### <a name="0x1d"></a>0x1d - Get tag labels

Sent to a bulb to request its tag labels.

#### Payload (8 bytes)

```c
payload
{
  uint64 tags;
}
```

### <a name="0x1e"></a>0x1e - Set tag labels

Sent to a bulb to set its tag labels.

#### Payload (40 bytes)

```c
payload
{
  uint64 tags;
  char label[32]; // UTF-8 encoded string
}
```

### <a name="0x1f"></a>0x1f - Tag labels

Received from a bulb after a request for its tag labels.

#### Payload (40 bytes)

```c
payload
{
  uint64 tags;
  char label[32]; // UTF-8 encoded string
}
```


### <a name="0x20"></a>0x20 - Get version

Sent to a bulb to request its version state.

#### Payload (0 bytes)

```c
payload
{
  // None
}
```

### <a name="0x21"></a>0x21 - Version state

Received from a bulb after a request for its version state.

#### Payload (12 bytes)

```c
payload
{
  uint32 vendor;
  uint32 product;
  uint32 version;
}
```

### <a name="0x22"></a>0x22 - Get info

Sent to a bulb to request its [info?].

#### Payload (0 bytes)

```c
payload
{
  // None
}
```

### <a name="0x23"></a>0x23 - Info state

Received from a bulb in response to a request for info state.

#### Payload (24 bytes)

```c
payload
{
  uint64 time;      // LE
  uint64 uptime;    // LE
  uint64 downtime;  // LE
}
```

### <a name="0x24"></a>0x24 - Get MCU rail voltage

Sent to a bulb to receive its microcontroller (MCU) rail voltage.

#### Payload (0 bytes)

```c
payload
{
  // None
}
```

### <a name="0x25"></a>0x25 - MCU rail voltage

Received from a bulb after a microcontroller (MCU) rail voltage request.

#### Payload (4 bytes)

```c
payload
{
  uint32 voltage; // LE; in mV
}
```

### <a name="0x26"></a>0x26 - Reboot

Reboots a target bulb. It has been observed that some bulbs rebooted in this
manner reset their color and fail to reconnect to wireless infrastructure,
necessitating a hardware reset (could be a timing related bug).

#### Payload (0 bytes)

```c
payload
{
  // None
}
```

### <a name="0x27"></a>0x27 - Set Factory Test Mode

Sent to a bulb to set its factory test mode. Unless you know what you're doing,
we recommend you do not use this packet type. (You've been warned!)

#### Payload (1 byte)

```c
payload
{
  byte on; // Unknown
}
```

### <a name="0x28"></a>0x28 - Disable Factory Test Mode

Sent to a bulb to disable its factory test mode. Unless you know what you're
doing, we recommend you do not use this packet type. (You've been warned!)

#### Payload (0 bytes)

```c
payload
{
  // None
}
```


### <a name="0x65"></a>0x65 - Get light state

Sent to a bulb to request its current light state (which includes its color, dim
level, power level, label, and tags).

#### Payload (0 bytes)

```c
payload {
  // None
}
```

#### Subsequent actions

Will generally be followed by one or more [0x6b](#0x6b) packets in response.

### <a name="0x66"></a>0x66 - Set light color

Sent to a bulb to configure its light color. Upon receipt, the bulb will fade
towards the new color using specified timing information.

#### Payload (13 bytes)

```c
payload {
  byte stream;        // Unknown, potential "streaming" mode toggle? Set to
                      // 0x00 for now.
  uint16 hue;         // LE NOTE: Wraps around at 0xff 0xff back to 0x00 0x00
                      // which is a primary red colour.
  uint16 saturation;  // LE
  uint16 brightness;  // LE
  uint16 kelvin;      // LE i.e. colour temperature (whites wheel in apps)
  uint32 fade_time;   // LE Length of fade action, in seconds
}
```

Note that for the "whites", apps always sets hue and saturation to 0x00. 
The white colour appears to have a fairly narrow range, such that 0-10 is
very yellow, 14 is a natural white, then 15-30 fades to blue.  Anything
beyond that seems to be very blue.

### <a name="0x67"></a>0x67 - Set waveform

Sent to a bulb to configure its [waveform?]. [Advanced topic, needs expansion.]

#### Payload (21 bytes)

```c
payload {
  byte stream;
  byte transient;
  uint16 hue;        // LE
  uint16 saturation; // LE
  uint16 brightness; // LE
  uint16 kelvin;     // LE
  uint32 period;     // LE?
  float cycles;      // LE?
  uint16 duty_cycles;
  byte waveform;
}
```

### <a name="0x68"></a>0x68 - Set dim (absolute)

Sent to a bulb to set its dim level.

#### Payload (6 bytes)

```c
payload {
  int16 brightness; // LE
  uint32 duration;  // in seconds
}
```

### <a name="0x69"></a>0x69 - Set dim (relative)

Sent to a bulb to set its dim level, relative to the current value.

#### Payload (6 bytes)

```c
payload {
  int16 brightness; // LE
  uint32 duration; // in seconds
}
```

### <a name="0x6b"></a>0x6b - Light status

Sent by a bulb after a request for light state. If this packet is received
mid-fade, the packet represents a snapshot of light status at transmission time.

#### Payload (52 bytes)

```c
payload {
  uint16 hue;          // LE
  uint16 saturation;   // LE
  uint16 brightness;   // LE
  uint16 kelvin;       // LE
  uint16 dim;          // LE?
  uint16 power;
  char bulb_label[32]; // UTF-8 encoded string
  uint64 tags;
}
```

### <a name="0x12d"></a>0x12d - Get wifi state

Sent to a bulb to retrieve state on one of its wireless interfaces.

#### Payload (1 byte)

```c
payload
{
  INTERFACE interface;
}

enum INTERFACE : byte
{
  SOFT_AP = 1,
  STATION = 2
}
```

### <a name="0x12e"></a>0x12e - Set wifi state

Sent to a bulb to set a wireless interface's state.

#### Payload (22 byte)

```c
payload
{
  INTERFACE interface;
  WIFI_STATUS wifi_status; // Leave 0x00
  byte ip4_address[4]
  byte ip6_address[16];
}

enum INTERFACE : byte
{
  SOFT_AP = 1,
  STATION = 2
}
```

### <a name="0x12f"></a>0x12f - Wifi state

Received from a bulb after a request for a wireless interface's state.

#### Payload (22 bytes)

```c
payload
{
  INTERFACE interface;
  WIFI_STATUS wifi_status; // Only valid if interface == STATION
  byte ip4_address[4]
  byte ip6_address[16];
}

enum INTERFACE : byte
{
  SOFT_AP = 1,
  STATION = 2
}

enum WIFI_STATUS : byte
{
  CONNECTING = 0,
  CONNECTED = 1,
  FAILED = 2,
  OFF = 3
}
```

### <a name="0x130"></a>0x130 - Get access points

Sent to a bulb to request a list of nearby access points.

#### Payload (0 bytes)

```c
payload
{
  // None
}
```

### <a name="0x131"></a>0x131 - Set access point

Sent to a bulb to configure its wireless interface. (It's not yet clear if the
bulbs can act in both SOFT_AP and STA modes.)

#### Payload (98 bytes)

```c
payload
{
  INTERFACE interface;
  char ssid[32];      // UTF-8 encoded string
  char password[64];  // UTF-8 encoded string
  SECURITY_PROTOCOL security_protocol; 
}

enum INTERFACE : byte
{
  SOFT_AP = 1, // i.e. act as an access point
  STATION = 2  // i.e. connect to an existing access point
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

### <a name="0x132"></a>0x132 - Access point

Received from a bulb after a request for nearby access points. One packet
describes one access point (i.e. you will receive a bunch of these packets).

#### Payload (38 bytes)

```c
payload
{
  INTERFACE interface; // seems to always be 0x00, bug?
  char ssid[32];       // UTF-8 encoded string
  SECURITY_PROTOCOL security_protocol;
  uint16 strength;
  uint16 channel;
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
