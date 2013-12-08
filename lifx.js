var dgram = require('dgram');
var net = require('net');
var util = require('util');

var port = 56700;
var found = false;

var debug = false;


// This represents each individual bulb, and the operations on that bulb
function Bulb(_lifxAddress) {
	this.lifxAddress = _lifxAddress;
}

// This represents the gateway, and its respective functions (eg discovery, send-to-all etc)
function Gateway(addr) {
	// TODO: validation...
	this.bulbs = {};
	this.ipAddress = {ip:addr.address, port:addr.port, family:addr.family};
	this.lifxAddress = addr.gwBulb;
	this.tcpClient = null;
}

Gateway.prototype.debug = function(d) {
	debug = d;
};

Gateway.prototype.addDiscoveredBulb = function(lifxAddress, bulbName) {
	var strAddress = lifxAddress.toString('hex');
	if (typeof this.bulbs[strAddress] == 'undefined') {
		// It's a new bulb
		console.log("*** New bulb found (" + bulbName + ") ***");
		this.bulbs[strAddress] = new Bulb(lifxAddress);
	}
};

Gateway.prototype.connect = function(cb) {
	var self = this;
	this.tcpClient = net.connect(this.ipAddress.port, this.ipAddress.ip, function() { //'connect' listener
		cb();
	});
	this.tcpClient.on('data', function(data) {
		if (debug) console.log(" T- " + data.toString("hex"));
		
		switch (data[32]) {

			case 0x6b:
				var lifxAddress = data.slice(8,16);
				var bulbName = data.slice(48);
				if (debug) console.log(" * Found a bulb: " + bulbName + " (address " + util.inspect(lifxAddress) + ")");
				self.addDiscoveredBulb(lifxAddress, bulbName);
				break;

			case 0x16:
				if (data[37] == 0xff) {
					if (debug) console.log(" * Light is on");
				} else {
					if (debug) console.log(" * Light is off");
				}
				break;
		}
	});
	this.tcpClient.on('end', function() {
		console.log('TCP client disconnected');
	});
}

Gateway.prototype.findBulbs = function(cb) {
	this.sendToAll(new Buffer([0x65, 0x00, 0x00, 0x00]));
};

Gateway.prototype.sendToAll = function(message) {
	var standardPrefix = new Buffer([0x00, 0x00, 0x34, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
	// Splice in the address of our discovered gateway bulb to replace these bytes --------------------------------------------^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
	this.lifxAddress.copy(standardPrefix, 15);

	var bLen = new Buffer([message.length + standardPrefix.length + 1]);
	var sendBuf = Buffer.concat([
		bLen,
		standardPrefix,
		message
	]);
	if (debug) console.log(" T+ " + sendBuf.toString("hex"));
	this.tcpClient.write(sendBuf);
};

Gateway.prototype.close = function() {
	this.tcpClient.end();
};

Gateway.discoverAndInit = function(cb) {
	Gateway.discover(function(err, addr) {
		if (err) {
			cb(err);
		} else {
			Gateway.init(addr, cb);
		}
	});
};

Gateway.init = function(addr, cb) {
	var g = new Gateway(addr);
	g.connect(function() {
		g.findBulbs();
	});
	cb(null, g);
};

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

Gateway.prototype.lightsOn = function() {
	this.sendToAll(new Buffer([0x15, 0x00, 0x00, 0x00, 0x01, 0x00]));
};

Gateway.prototype.lightsOff = function() {
	this.sendToAll(new Buffer([0x15, 0x00, 0x00, 0x00, 0x00, 0x00]));
};

// Pass in 16-bit numbers for each param - they will be byte shuffled as appropriate
Gateway.prototype.lightsColour = function(hue, sat, lum, whitecol, timing) {
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

	this.sendToAll(message);
};

module.exports = {
	Gateway:Gateway
};

