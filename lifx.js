var _    = require('underscore');
var dgram  = require('dgram');
var net    = require('net');
var util   = require('util');
var events = require('events');
var clone  = require('clone');

var packet = require('./packet');

var port = 56700;

var debug = false;

function init() {
	var l = new Lifx();
	l.startDiscovery();
	return l;
}

function Lifx() {
	events.EventEmitter.call(this);

	this.gateways = {};
	this.bulbs    = {};

	this._discoverInterval = 10000;
	this._intervalID = null;
}
Lifx.prototype.__proto__ = events.EventEmitter.prototype;

Lifx.prototype.startDiscovery = function() {
	var self = this;
	var udpClient = this._discoveryClient = dgram.createSocket("udp4");

	if (udpClient.unref) { // unref is not available in Node 0.8
		udpClient.unref(); // Stop this from preventing Node from ending
	}

	udpClient.on("error", function (err) {
		console.log("UDP error " + err);
	});

	udpClient.on("message", function (msg, rinfo) {
		if (debug) console.log(" U- " + msg.toString("hex"));
		var pkt = packet.fromBytes(msg);
		if (pkt.packetTypeShortName == 'panGateway' && pkt.payload.service == 1) {
			var gw = new Gateway(rinfo.address, pkt.payload.port, pkt.preamble.site);
			self.foundGateway(gw);
		}
	});

	udpClient.bind(port, "0.0.0.0", function() {
		udpClient.setBroadcast(true);
		self._scheduleDiscovery(1000);		// Now send the discovery packets
	});

};

Lifx.prototype._scheduleDiscovery = function(interval) {
	var self = this;
	if (this._intervalID) {
		clearInterval(this._intervalID);
	}

	this._intervalID = setInterval(function() {
		var message = packet.getPanGateway({protocol:21504});
		if (debug) console.log(" U+ " + message.toString("hex"));
		self._discoveryClient.send(message, 0, message.length, port, "255.255.255.255", function(err, bytes) {
		});
	}, interval);

};

Lifx.prototype.foundGateway = function(gw) {
	
	this._scheduleDiscovery(30000);			// slow down sending gateway discovery messages
	
	var gateway = this.gateways[gw.ipAddress.ip.toString('hex')];
	if (_.isObject(gateway)) {
		if ((Date.now() - gateway.lastHeard) > 10000) {
			if (debug) console.log('looking for bulb reconnecting bulb...');

			var bulb = this.bulbs[gateway.lifxAddress.toString('hex')];
			if (_.isObject(bulb)) {
				var offSeconds = (Date.now() - gateway.lastHeard) / 1000;
				if (debug) console.log("Bulb back online, was offline for " + offSeconds + " seconds");
				this.emit('bulbreconnect', clone(bulb), offSeconds);
			}
		}

		gateway.lastHeard = Date.now();
	} else {
		this.gateways[gw.ipAddress.ip.toString('hex')] = gw;
		// Look for bulbs on this gateway
		gw.connect();
		gw.on('_packet', this._getPacketHandler());
		gw.findBulbs();
		this.emit("gateway", gw);
	}
};

Lifx.prototype._getPacketHandler = function() {
	var self = this;
	return function(p, gw) {self._gotPacket(p, gw);};
};

Lifx.prototype._gotPacket = function(data, gw) {
	if (debug) console.log(" T- " + data.toString("hex"));
	var p = packet.fromBytes(data);

	if (debug) console.log("got packet: " + JSON.stringify(p));

	switch (p.packetTypeShortName) {
		case 'lightStatus':
			this.foundBulb(p, gw);
			break;
	}

	this.emit('packet', clone(p));
};

Lifx.prototype._gotPacket_old = function(data, gw) {
	if (debug) console.log(" T- " + data.toString("hex"));

	switch (data[32]) {

		case 0x6b:
			this.foundBulb(data, gw);
			break;

		case 0x16:
			var bulb = this.getBulbByLifxAddress(data.slice(8,14));
			if (data[37] == 0xff) {
				this.emit('bulbonoff', {bulb:clone(bulb),on:true});
				if (debug) console.log(" * Light is on");
			} else {
				this.emit('bulbonoff', {bulb:clone(bulb),on:false});
				if (debug) console.log(" * Light is off");
			}
			break;
	}
};

Lifx.prototype.foundBulb = function(bulb, gw) {

	var bulbName = bulb.payload.bulbLabel;
	var lifxAddress = bulb.preamble.bulbAddress;
	if (debug) console.log(" * Found a bulb: " + bulbName + " (address " + util.inspect(lifxAddress) + ")");

	var foundBulb = this.bulbs[lifxAddress.toString('hex')];

	if (!foundBulb) {
		var newBulb = new Bulb(lifxAddress, bulbName);
		if (debug) console.log("*** New bulb found (" + newBulb.name + ") by gateway " + gw.ipAddress.ip + " *** " + newBulb.address);
		this.bulbs[newBulb.address] = newBulb;
		this.emit('bulb', clone(newBulb));
		foundBulb = newBulb;
	}

	this.emit('bulbstate', {bulb:foundBulb, state:bulb.payload});
};

// This represents each individual bulb
function Bulb(_lifxAddress, _name) {
	this.lifxAddress = _lifxAddress;
	this.name        = _name;
	this.address     = _lifxAddress.toString('hex');
}

// This represents the gateway, and its respective functions (eg discovery, send-to-all etc)
function Gateway(ipAddress, port, site) {
	// TODO: validation...
	this.ipAddress   = {ip:ipAddress, port:port};
	this.lifxAddress = site;
	this.address     = ipAddress.toString('hex');
	this.udpClient   = null;
	this.reconnect   = true;
	this.lastHeard   = Date.now();
	events.EventEmitter.call(this);
}

// Make the Gateway into an event emitter
Gateway.prototype.__proto__ = events.EventEmitter.prototype;

Lifx.prototype.getBulbByLifxAddress = function(lifxAddress) {
	var addrToSearch = lifxAddress;
	if (typeof lifxAddress != 'string') {
		addrToSearch = lifxAddress.toString('hex');
	}

	return this.bulbs[addrToSearch] || false;
};

// Open a control connection (over TCP) to the gateway node
Gateway.prototype.connect = function() {
	var self = this;
	if (debug) console.log("Connecting to " + this.ipAddress.ip + ":" + this.ipAddress.port);

	var udpClient = this.udpClient = dgram.createSocket("udp4");

	this.udpClient.bind(this.ipAddress.port, function() {
		if (debug) console.log("LIFX Gateway: socket bound");
	});

	this.udpClient.on("message", function(msg, rinfo) {
		self.emit('_packet', msg, self);
	});
	this.udpClient.on("error", function(exception) {
		console.log("LIFX Gateway client error: " + exception);
		try { udpClient.close();     } catch(ex) { console.log('close: '     + ex.message); }
		if ((err.code === 'ECONNRESET') && (self.reconnect)) self.connect();
	});
	this.udpClient.on("close", function() {
		console.log('LIFX Gateway client disconnected');
		if (self.reconnect) {
			self.connect();
		}
	});

};

Lifx.prototype.findBulbs = function() {
	_(this.gateways).invoke('findBulbs');

};

// This method requests that the gateway tells about all of its bulbs
Gateway.prototype.findBulbs = function() {
	var self = this;
	self._sendToAll(packet.getLightState());
	setTimeout(function() {
		var p = { tags: new Buffer([255, 255, 255, 255, 255, 255, 255, 255]) };
		self._sendToAll(packet.getTagLabels(p));
	}, 1500);
	setTimeout(function() {
		self._sendToAll(packet.getLightState());
	}, 3000);
};

// Send a raw command
Gateway.prototype.send = function(sendBuf) {
	if (!this.udpClient) return;

	if (debug) console.log(" T+ " + sendBuf.toString("hex"));

	this.udpClient.send(sendBuf, 0, sendBuf.length, this.ipAddress.port, this.ipAddress.ip, function() {
	});
};

Gateway.prototype._sendToAll = function(command) {
	this.lifxAddress.copy(command, 16);
	this.send(command);
};

// Close the connection to this gateway
Gateway.prototype.close = function() {
	this.reconnect = false;
	if (!!this.udpClient) this.udpClient.close();
};

Lifx.prototype.close = function() {
	clearInterval(this._intervalID);
	_(this.gateways).invoke('close');
};

Lifx.prototype.sendToAll = function(command) {
	this._sendToOneOrAll(command);
};

Lifx.prototype.sendToOne = function(command, bulb) {
	this._sendToOneOrAll(command, bulb);
};

Lifx.prototype._sendToOneOrAll = function(command, bulb) {
	_(this.gateways).each(function (g) {
		var siteAddress = g.lifxAddress;
		siteAddress.copy(command, 16);
		if (typeof bulb == 'undefined') {
			g.send(command);
		} else {
			// Overwrite the bulb address here
			var target;
			if (Buffer.isBuffer(bulb)) {
				target = bulb;
			} else if (typeof bulb.lifxAddress != 'undefined') {
				target = bulb.lifxAddress;
			} else {
				throw "Unknown bulb";
			}
			target.copy(command, 8);
			g.send(command);
		}
	});
};

/////// Fun methods ////////

// Turn all lights on
Lifx.prototype.lightsOn = function(bulb) {
	this._sendToOneOrAll(packet.setPowerState({onoff:1}), bulb);
};

// Turn all lights off
Lifx.prototype.lightsOff = function(bulb) {
	this._sendToOneOrAll(packet.setPowerState({onoff:0}), bulb);
};

// Set all bulbs to a particular colour
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
