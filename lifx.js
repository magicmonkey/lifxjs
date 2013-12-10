var dgram = require('dgram');
var net = require('net');
var util = require('util');
var events = require('events');
var clone = require('clone');

var port = 56700;
var found = false;

var debug = false;

// This represents each individual bulb
function Bulb(_lifxAddress, _name) {
	this.lifxAddress = _lifxAddress;
	this.name        = _name;
}

// This represents the gateway, and its respective functions (eg discovery, send-to-all etc)
function Gateway(addr) {
	// TODO: validation...
	this.bulbs = new Array();
	this.ipAddress = {ip:addr.address, port:addr.port, family:addr.family};
	this.lifxAddress = addr.gwBulb;
	this.tcpClient = null;

	events.EventEmitter.call(this);
}

// Make the Gateway into an event emitter
Gateway.prototype.__proto__ = events.EventEmitter.prototype;

Gateway.prototype.debug = function(d) {
	debug = d;
};

Gateway.prototype.getBulbByLifxAddress = function(lifxAddress) {
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

Gateway.prototype.addDiscoveredBulb = function(lifxAddress, bulbName) {
	var strAddress = lifxAddress.toString('hex');

	// See if we've already got the bulb
	var gotBulb = this.getBulbByLifxAddress(lifxAddress);
	if (!gotBulb) {
		// It's a new bulb
		if (debug) console.log("*** New bulb found (" + bulbName + ") ***");
		var newBulb = new Bulb(lifxAddress, bulbName.toString('ascii').replace(/\0/g, ''));
		this.bulbs.push(newBulb);
		this.emit('bulb', clone(newBulb));
	}
};

// Open a control connection (over TCP) to the gateway node
Gateway.prototype.connect = function(cb) {
	var self = this;
	this.tcpClient = net.connect(this.ipAddress.port, this.ipAddress.ip, function() { //'connect' listener
		cb();
	});
	this.tcpClient.on('data', function(data) {
		if (debug) console.log(" T- " + data.toString("hex"));
		
		var lifxAddress = data.slice(8,16);
		var bulb = self.getBulbByLifxAddress(lifxAddress);

		switch (data[32]) {

			case 0x6b:
				var bulbName = data.slice(48);
				if (debug) console.log(" * Found a bulb: " + bulbName + " (address " + util.inspect(lifxAddress) + ")");
				self.addDiscoveredBulb(lifxAddress, bulbName);
				bulb = self.getBulbByLifxAddress(lifxAddress);
				var hue = (data[37] << 8) + data[36];
				var sat = (data[39] << 8) + data[38];
				var lum = (data[41] << 8) + data[40];
				var whi = (data[43] << 8) + data[42];
				var onoff = (data[46] > 0);
				var state = {hue:hue, saturation:sat, luminance:lum, colourTemp:whi, on:onoff, bulb:bulb};
				self.emit('bulbstate', clone(state));
				break;

			case 0x16:
				if (data[37] == 0xff) {
					self.emit('bulbonoff', {bulb:clone(bulb),on:true});
					if (debug) console.log(" * Light is on");
				} else {
					self.emit('bulbonoff', {bulb:clone(bulb),on:false});
					if (debug) console.log(" * Light is off");
				}
				break;
		}
	});
	this.tcpClient.on('end', function() {
		console.log('TCP client disconnected');
	});
}

// This method requests that the gateway tells about all of its bulbs
Gateway.prototype.findBulbs = function(cb) {
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
	if (Buffer.isBuffer(bulb)) {
		targetAddr = bulb;
	} else if (typeof bulb == 'string') {
		bulb = this.getBulbByLifxAddress(bulb);
		if (!bulb) {
			throw "Unknown thing been passed instead of a bulb: " + util.inspect(bulb);
		}
		targetAddr = bulb.lifxAddress;
	} else {
		if (typeof bulb.lifxAddress == 'undefined') {
			// No idea what we've been passed as a bulb.  Erm.
			throw "Unknown thing been passed instead of a bulb: " + util.inspect(bulb);
		}
		targetAddr = bulb.lifxAddress;
	}
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
	this.tcpClient.end();
};

// Initiate discovery of a gateway bulb on this network, and when one is found, initialise it
Gateway.discoverAndInit = function(cb) {
	Gateway.discover(function(err, addr) {
		if (err) {
			cb(err);
		} else {
			Gateway.init(addr, cb);
		}
	});
};

// Once a gateway bulb is found, initialise our connection to it
Gateway.init = function(addr, cb) {
	var g = new Gateway(addr);
	g.connect(function() {
		g.findBulbs();
	});
	cb(null, g);
};

// Find a gateway bulb on this network
Gateway.discover = function(cb) {

	var UDPClient = dgram.createSocket("udp4");
	UDPClient.unref(); // Stop this from preventing Node from ending
	
	UDPClient.on("error", function (err) {
		console.log("UDP error " + err);
	});

	UDPClient.on("message", function (msg, rinfo) {

		if (debug) console.log(" U- " + msg.toString("hex"));
		var gwBulb = msg.slice(16, 24);
		if (msg.length > 4 && msg[3] == 0x54 && msg[32] == 0x03) {
			if (!found) {
				found = true;
				cb(null, {address:rinfo.address, port:rinfo.port, family:rinfo.family, gwBulb:gwBulb} );
			}
		}
	});

	UDPClient.bind(port, function() {
		UDPClient.setBroadcast(true);
		var intervalID;
		// Now send the discovery packets
		intervalID = setInterval(function() {
			if (found) {
				clearInterval(intervalID);
			} else {
				var message = new Buffer([0x24, 0x00, 0x00, 0x34, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00]);
				if (debug) console.log(" U+ " + message.toString("hex"));
				UDPClient.send(message, 0, message.length, port, "255.255.255.255", function(err, bytes) {
					if (err) {
						cb(err);
					}
				});
			}
		}, 300);
	});
};

Gateway.prototype.sendToOneOrAll = function(command, /* optional */bulb) {
	if (typeof bulb == 'undefined') {
		this.sendToAll(command);
	} else {
		this.sendToOne(command, bulb);
	}
};

/////// Fun methods ////////

// Turn all lights on
Gateway.prototype.lightsOn = function(/* optional */bulb) {
	this.sendToOneOrAll(new Buffer([0x15, 0x00, 0x00, 0x00, 0x01, 0x00]), bulb);
};

// Turn all lights off
Gateway.prototype.lightsOff = function(/* optional */bulb) {
	this.sendToOneOrAll(new Buffer([0x15, 0x00, 0x00, 0x00, 0x00, 0x00]), bulb);
};

// Set all bulbs to a particular colour
// Pass in 16-bit numbers for each param - they will be byte shuffled as appropriate
Gateway.prototype.lightsColour = function(hue, sat, lum, whitecol, timing, /* optional */bulb) {
	var message = new Buffer([0x66, 0x00, 0x00, 0x00, 0x00, 0x9e, 0xd4, 0xff, 0xff, 0x8f, 0x02, 0xac, 0x0d, 0x13, 0x05, 0x00, 0x00]);
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
	Gateway:Gateway
};

