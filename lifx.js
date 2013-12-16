var dgram = require('dgram');
var net = require('net');
var util = require('util');
var events = require('events');
var clone = require('clone');

var port = 56700;

var debug = false;

function init() {
	var l = new Lifx();
	l.startDiscovery();
	return l;
}

function Lifx() {
	events.EventEmitter.call(this);
	this.gateways = [];
	this.bulbs = [];
}
Lifx.prototype.__proto__ = events.EventEmitter.prototype;

Lifx.prototype.foundGateway = function(gw) {
	var found = false;
	for (var i in this.gateways) {
		if (this.gateways[i].ipAddress.ip == gw.ipAddress.ip) {
			found = true;
		}
	}
	if (!found) {
		this.gateways.push(gw);
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

Lifx.prototype.foundBulb = function(data, gw) {
	// Find the end of the name
	var endPos = 49;
	for (var i=48; i<data.length; i++) {
		if (data[i] == 0) {
			endPos = i;
			break;
		}
	}

	var bulbName = data.slice(48, endPos).toString('ascii').replace(/\0/g, '');
	var lifxAddress = data.slice(8,14);
	if (debug) console.log(" * Found a bulb: " + bulbName + " (address " + util.inspect(lifxAddress) + ")");

	var found = false;
	for (var i in this.bulbs) {
		if (this.bulbs[i].lifxAddress.toString("hex") == lifxAddress.toString("hex")) {
			found = true;
		}
	}

	if (!found) {
		var newBulb = new Bulb(lifxAddress, bulbName);
		if (debug) console.log("*** New bulb found (" + newBulb.name + ") by gateway " + gw.ipAddress.ip + " ***");
		this.bulbs.push(newBulb);
		this.emit('bulb', clone(newBulb));
	}

	var bulb = this.getBulbByLifxAddress(lifxAddress);
	var hue = (data[37] << 8) + data[36];
	var sat = (data[39] << 8) + data[38];
	var lum = (data[41] << 8) + data[40];
	var whi = (data[43] << 8) + data[42];
	var onoff = (data[46] > 0);
	var state = {hue:hue, saturation:sat, luminance:lum, colourTemp:whi, on:onoff, bulb:bulb};
	this.emit('bulbstate', clone(state));
};

Lifx.prototype.startDiscovery = function() {
	var self = this;
	var UDPClient = dgram.createSocket("udp4");
	UDPClient.unref(); // Stop this from preventing Node from ending
	
	UDPClient.on("error", function (err) {
		console.log("UDP error " + err);
	});

	UDPClient.on("message", function (msg, rinfo) {
		if (debug) console.log(" U- " + msg.toString("hex"));
		var gwBulb = msg.slice(16, 22);
		if (msg.length > 4 && msg[3] == 0x54 && msg[32] == 0x03) {
			self.foundGateway(new Gateway({address:rinfo.address, port:rinfo.port, family:rinfo.family, gwBulb:gwBulb}));
		}
	});

	UDPClient.bind(port, "0.0.0.0", function() {
		UDPClient.setBroadcast(true);
		var intervalID;
		// Now send the discovery packets
		intervalID = setInterval(function() {
			var message = new Buffer([0x24, 0x00, 0x00, 0x34, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00]);
			if (debug) console.log(" U+ " + message.toString("hex"));
			UDPClient.send(message, 0, message.length, port, "255.255.255.255", function(err, bytes) {
			});
		}, 1000);
	});

};

// This represents each individual bulb
function Bulb(_lifxAddress, _name) {
	this.lifxAddress = _lifxAddress;
	this.name        = _name;
}

// This represents the gateway, and its respective functions (eg discovery, send-to-all etc)
function Gateway(addr) {
	// TODO: validation...
	this.ipAddress = {ip:addr.address, port:addr.port, family:addr.family};
	this.lifxAddress = addr.gwBulb;
	this.tcpClient = null;
	this.reconnect = true;
	events.EventEmitter.call(this);
}

// Make the Gateway into an event emitter
Gateway.prototype.__proto__ = events.EventEmitter.prototype;

Lifx.prototype.getBulbByLifxAddress = function(lifxAddress) {
	var addrToSearch = lifxAddress;
	if (typeof lifxAddress != 'string') {
		addrToSearch = lifxAddress.toString('hex');
	}
	for (var i in this.bulbs) {
		if (this.bulbs[i].lifxAddress.toString('hex') == addrToSearch) {
			return this.bulbs[i];
		}
	}
	return false;
};

// Open a control connection (over TCP) to the gateway node
Gateway.prototype.connect = function(cb) {
	var self = this;
	this.tcpClient = net.connect(this.ipAddress.port, this.ipAddress.ip, function() { //'connect' listener
		if (typeof cb == 'function') {
			cb();
		}
	});
	this.tcpClient.on('data', function(data) {
		self.emit('_packet', data, self);
	});
	this.tcpClient.on('end', function() {
		console.log('TCP client disconnected');
		self.tcpClient.destroy();
		if (self.reconnect) {
			self.connect();
		}
	});
}

Lifx.prototype.findBulbs = function() {
	this.gateways.forEach(function(g) {
		g.findBulbs();
	});
};

// This method requests that the gateway tells about all of its bulbs
Gateway.prototype.findBulbs = function() {
	this.sendToAll(new Buffer([0x65, 0x00, 0x00, 0x00]));
};

// Send a raw command - targetAddr should be a buffer containing an 8-byte address.  Use zeroes to send to all bulbs.
Gateway.prototype.send = function(message, targetAddr) {
	var standardPrefix = new Buffer([0x00, 0x00, 0x34, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
	// Splice in the address of our discovered gateway bulb to replace these bytes --------------------------------------------^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
	// Splice in the address of this bulb to replace these bytes --------------^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
	this.lifxAddress.copy(standardPrefix, 15);
	targetAddr.copy(standardPrefix, 7);

	var bLen = new Buffer([message.length + standardPrefix.length + 1]);
	var sendBuf = Buffer.concat([
		bLen,
		standardPrefix,
		message
	]);
	if (debug) console.log(" T+ " + sendBuf.toString("hex"));
	this.tcpClient.write(sendBuf);
};

// Send a raw command to an individual bulb
Gateway.prototype.sendToOne = function(message, bulb) {
	var targetAddr;
	if (typeof bulb.lifxAddress == 'undefined') {
		// No idea what we've been passed as a bulb.  Erm.
		throw "Unknown thing been passed instead of a bulb: " + util.inspect(bulb);
	}
	targetAddr = bulb.lifxAddress;
	this.send(message, targetAddr);
};

// Send a raw command to all bulbs attached to this gateway
Gateway.prototype.sendToAll = function(message) {
	var targetAddr = new Buffer(8);
	targetAddr.fill(0);
	this.send(message, targetAddr);
};

// Close the connection to this gateway
Gateway.prototype.close = function() {
	this.reconnect = false;
	this.tcpClient.end();
};

Lifx.prototype.close = function() {
	this.gateways.forEach(function(g) {
		g.close();
	});
};

Lifx.prototype.sendToOneOrAll = function(command, bulb) {
	this.gateways.forEach(function(g) {
		if (typeof bulb == 'undefined') {
			g.sendToAll(command);
		} else {
			g.sendToOne(command, bulb);
		}
	});
};

/////// Fun methods ////////

// Turn all lights on
Lifx.prototype.lightsOn = function(bulb) {
	this.sendToOneOrAll(new Buffer([0x15, 0x00, 0x00, 0x00, 0x01, 0x00]), bulb);
};

// Turn all lights off
Lifx.prototype.lightsOff = function(bulb) {
	this.sendToOneOrAll(new Buffer([0x15, 0x00, 0x00, 0x00, 0x00, 0x00]), bulb);
};

// Set all bulbs to a particular colour
// Pass in 16-bit numbers for each param - they will be byte shuffled as appropriate
Lifx.prototype.lightsColour = function(hue, sat, lum, whitecol, timing, bulb) {
	var message = new Buffer([0x66, 0x00, 0x00, 0x00, 0x00, 0x9e, 0xd4, 0xff, 0xff, 0x30, 0x00, 0xac, 0x0d, 0x13, 0x05, 0x00, 0x00]);
	//                                                      ^^^^^^^^^^  ^^^^^^^^^^  ^^^^^^^^^^  ^^^^^^^^^^  ^^^^^^^^^^
	//                                                         hue      saturation  luminance  white colour   timing
	message[5]  = (hue & 0x00ff);
	message[6]  = (hue & 0xff00) >> 8;
	message[7]  = (sat & 0x00ff);
	message[8]  = (sat & 0xff00) >> 8;
	message[9]  = (lum & 0x00ff);
	message[10] = (lum & 0xff00) >> 8;
	message[11] = (whitecol & 0x00ff);
	message[12] = (whitecol & 0xff00) >> 8;
	message[13] = (timing & 0x00ff);
	message[14] = (timing & 0xff00) >> 8;

	this.sendToOneOrAll(message, bulb);
};

module.exports = {
	init:init,
	setDebug:function(d){debug=d;}
};

