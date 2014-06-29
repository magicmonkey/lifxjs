var dgram = require('dgram');
var net = require('net');
var util = require('util');
var events = require('events');
var clone = require('clone');
var os = require('os');

var packet = require('./packet');

var port = 56700;

var debug = false;

function init() {
	var l = new Lifx();
	l.on('ready', function() {
		l.startDiscovery(1000);
	});
	return l;
}

function Lifx() {
	events.EventEmitter.call(this);
	this.gateways = [];
	this.bulbs = [];
	this.udpClient = dgram.createSocket("udp4");
	this._intervalID = null;
	this._localIPs = getMyIPs();
	this._initNetwork();
	this._setupPacketListener();
	this._setupGatewayListener();
}
Lifx.prototype.__proto__ = events.EventEmitter.prototype;

Lifx.prototype._initNetwork = function() {
	var self = this;
	this.udpClient.on("error", function (err) {
		console.error("*** UDP error " + err);
		self.emit('error', err);
	});
	this.udpClient.on("message", function (msg, rinfo) {
		// Check it didn't come from us
		if (self._localIPs.indexOf(rinfo.address) > -1) {
			return;
		}
		if (debug) console.log(" U- " + msg.toString("hex"));
		var pkt = packet.fromBytes(msg);
		self.emit('rawpacket', pkt, rinfo);
	});
	this.udpClient.bind(port, "0.0.0.0", function() {
		self.udpClient.setBroadcast(true);
		self.emit('ready');
	});
}

Lifx.prototype._sendPacket = function(dstIp, dstPort, packet) {
	if (debug) console.log(" U+ " + packet.toString("hex"));
	this.udpClient.send(packet, 0, packet.length, dstPort, dstIp, function(err, bytes) {
	});
}

Lifx.prototype.startDiscovery = function(interval) {
	// Now send the discovery packets
	var self = this;
	this._intervalID = setInterval(function() {
		self._sendPacket("255.255.255.255", port, packet.getPanGateway());
	}, interval);
};

Lifx.prototype.stopDiscovery = function() {
	clearInterval(this._intervalID);
};

Lifx.prototype._setupPacketListener = function() {
	var self = this;

	this.on('rawpacket', function(pkt, rinfo) {
		switch (pkt.packetTypeShortName) {

			case 'panGateway':
				// Got a notification of a gateway.  Check if it's new, using valid UDP, and if it is then handle accordingly
				if (pkt.payload.service == 1 && pkt.payload.port > 0) {
					var gw = {ip:rinfo.address, port:pkt.payload.port, site:pkt.preamble.site};
					var found = false;
					for (var i in self.gateways) {
						if (self.gateways[i].ip == gw.ip && self.gateways[i].port == gw.port) {
							found = true;
							break;
						}
					}
					if (!found) {
						self.gateways.push(gw);
						self.emit('gateway', gw);
					}
				}
				break;

			case 'lightStatus':
				// Got a notification of a light's status.  Check if it's a new light, and handle it accordingly.
				var bulb = {addr:pkt.preamble.bulbAddress, name:pkt.payload.bulbLabel};
				var found = false;
				for (var i in self.bulbs) {
					if (self.bulbs[i].addr == bulb.addr) {
						found = true;
						break;
					}
				}
				if (!found) {
					self.bulbs.push(bulb);
					self.emit('bulb', bulb);
				}

				// Even if it's not new, emit updated info about the state of the bulb
				self.emit('bulbstate', bulb);

				break;

			default:
				console.log('Unhandled packet of type ['+pkt.packetTypeShortName+']');
				console.log(pkt.payload);
				break;
		}
	});

};

Lifx.prototype._setupGatewayListener = function() {
	var self = this;
	self.on('gateway', function(gw) {
		// Ask the gateway for new bulbs
		self._sendPacket(gw.ip, gw.port, packet.getLightState({site:gw.site}));

		// Also slow down the discovery packets, to be polite to the network
		self.stopDiscovery();
		self.startDiscovery(10000);
	});
};

Lifx.prototype.close = function() {
	var self = this;
	// Remove things from the event loop and clean up
	this.stopDiscovery();
	this.udpClient.close();
};

Lifx.prototype._sendToOneOrAll = function(command, bulb) {
	var self = this;
	this.gateways.forEach(function(gw) {
		var siteAddress = gw.site;
		siteAddress.copy(command, 16);
		if (typeof bulb == 'undefined') {
			self._sendPacket(gw.ip, gw.port, command);
		} else {
			// Overwrite the bulb address here
			var target;
			if (Buffer.isBuffer(bulb)) {
				target = bulb;
			} else if (typeof bulb.addr != 'undefined') {
				target = bulb.addr;
			} else {
				// Check if it's a recognised bulb name
				var found = false;
				self.bulbs.forEach(function(b) {
					if (b.name == bulb) {
						target = b.addr;
						found = true;
					}
				});
				if (!found) {
					throw "Unknown bulb: " + bulb;
				}
			}
			target.copy(command, 8);
			self._sendPacket(gw.ip, gw.port, command);
		}
	});
};

Lifx.prototype.sendToAll = function(command) {
	this._sendToOneOrAll(command);
};

Lifx.prototype.sendToOne = function(command, bulb) {
	this._sendToOneOrAll(command, bulb);
};

/////////// Fun methods ////////////

// Turn lights on
Lifx.prototype.lightsOn = function(bulb) {
	this._sendToOneOrAll(packet.setPowerState({onoff:0xff}), bulb);
};

// Turn lights off
Lifx.prototype.lightsOff = function(bulb) {
	this._sendToOneOrAll(packet.setPowerState({onoff:0}), bulb);
};

// Set bulbs to a particular colour
// Pass in 16-bit numbers for each param - they will be byte shuffled as appropriate
Lifx.prototype.lightsColour = function(hue, sat, lum, whitecol, timing, bulb) {
	var params = {stream:0, hue:hue, saturation:sat, brightness:lum, kelvin:whitecol, fadeTime:timing};
	var message = packet.setLightColour(params);
	this._sendToOneOrAll(message, bulb);
};

// Request status from bulbs
Lifx.prototype.requestStatus = function() {
	this._sendToOneOrAll(packet.getLightState());
};

module.exports = {
	init:init,
	setDebug:function(d){debug=d;}
};

// Utility method to get a list of local IP addresses
function getMyIPs() {
	var ips = [];
	var ifs = os.networkInterfaces();
	for (var i in ifs) {
		for (var j in ifs[i]) {
			ips.push(ifs[i][j].address);
		}
	}
	return ips;
}
