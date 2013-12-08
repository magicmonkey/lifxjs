var dgram = require('dgram');
var net = require('net');
var util = require('util');

var UDPClient = dgram.createSocket("udp4");
var port = 56700;
var found = false;

module.exports = {

	discover: function(cb) {

		UDPClient.on("error", function (err) {
			console.log("UDP error " + err);
		});

		UDPClient.on("message", function (msg, rinfo) {

			console.log(" U- " + msg.toString("hex"));
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
					console.log(" U+ " + message.toString("hex"));
					UDPClient.send(message, 0, message.length, port, "255.255.255.255", function(err, bytes) {
						if (err) {
							cb(err);
						}
					});
				}
			}, 300);
		});

	},

	init: function(addr, cb) {
		var b = new bulb(addr);
		cb(null, b);
	},

	discoverAndInit: function(cb) {
		module.exports.discover(function(err, addr) {
			if (err) {
				cb(err);
			} else {
				module.exports.init(addr, cb);
			}
		});
	},

};

function bulb(addr) {

	this.address = null; // IP address of the gateway bulb
	this.port    = null; // IP port of the gateway bulb
	this.gwBulb  = null; // LIFX address of the gateway bulb
	var client   = null;

	if (typeof addr == 'object' && typeof addr.address == 'string' && typeof addr.port == 'number') {
		this.address = addr.address;
		this.port = addr.port;
		this.gwBulb = addr.gwBulb;
	}

	var self=this;
	function connect() {
		client = net.connect(self.port, self.address, function() { //'connect' listener
			//console.log('client connected');
		});
	}

	connect();

	client.on('data', function(data) {
		console.log(" T- " + data.toString("hex"));
		
		switch (data[32]) {

			case 0x6b:
				console.log(" * Found a bulb: " + data.slice(48).toString("ascii"));
				break;

			case 0x16:
				if (data[37] == 0xff) {
					console.log(" * Light is on");
				} else {
					console.log(" * Light is off");
				}
				break;
		}
	});
	client.on('end', function() {
		console.log('TCP client disconnected');
		//connect();
	});

	var self = this;

	var standardPrefix = new Buffer([0x00, 0x00, 0x34, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
	// Splice in the address of our discovered gateway bulb to replace these bytes --------------------------------------------^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
	this.gwBulb.copy(standardPrefix, 15);

	this.sendRawPacket = function(message) {
		var bLen = new Buffer([message.length + standardPrefix.length + 1]);
		var sendBuf = Buffer.concat([
			bLen,
			standardPrefix,
			message
		]);
		console.log(" T+ " + sendBuf.toString("hex"));
		client.write(sendBuf);
	};

	var i = 0;
	this.test1 = function() {
		i = (i+5) % 255; console.log("Colour value is " + i);
		self.sendRawPacket(new Buffer([0x66, 0x00, 0x00, 0x00, 0x00, 0x00, i,    0xff, 0xff, 0x00, 0x20, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]));
		//                                                           ^^^^^^^^^^  ^^^^^^^^^^  ^^^^^^^^^^  ^^^^^^^^^^  ^^^^^^^^^^
		//                                                              hue      saturation  luminance   white colour  timing
	};

	this.test2 = function() {
		i = (i+250) % 255; console.log("Colour value is " + i);
		self.sendRawPacket(new Buffer([0x66, 0x00, 0x00, 0x00, 0x00, 0x00, i,    0xff, 0xff, 0x00, 0x20, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]));
		//                                                           ^^^^^^^^^^  ^^^^^^^^^^  ^^^^^^^^^^  ^^^^^^^^^^  ^^^^^^^^^^
		//                                                              hue      saturation  luminance   white colour  timing
	};

	// Pass in 16-bit numbers for each param - they will be byte shuffled as appropriate
	this.lightsColour = function(hue, sat, lum, timing) {
		var message = new Buffer([0x66, 0x00, 0x00, 0x00, 0x00, 0x9e, 0xd4, 0xff, 0xff, 0x8f, 0x02, 0xac, 0x0d, 0x13, 0x05, 0x00, 0x00]);
		//                                                      ^^^^^^^^^^  ^^^^^^^^^^  ^^^^^^^^^^              ^^^^^^^^^^
		//                                                         hue      saturation  luminance                 timing
		message[5]  = (hue & 0x00ff);
		message[6]  = (hue & 0xff00) >> 8;
		message[7]  = (sat & 0x00ff);
		message[8]  = (sat & 0xff00) >> 8;
		message[9]  = (lum & 0x00ff);
		message[10] = (lum & 0xff00) >> 8;
		message[13] = (timing & 0x00ff);
		message[14] = (timing & 0xff00) >> 8;

		self.sendRawPacket(message);
		
	};

	this.lightsOn = function() {
		self.sendRawPacket(new Buffer([0x15, 0x00, 0x00, 0x00, 0x01, 0x00]));
	};

	this.lightsOff = function() {
		self.sendRawPacket(new Buffer([0x15, 0x00, 0x00, 0x00, 0x00, 0x00]));
	};

	this.red = function() {
		self.lightsColour(0xd49e, 0xffff, 0x028f, 0x0513);
	};

	this.purple = function() {
		self.lightsColour(0xcc15, 0xffff, 0x028f, 0x0513);
	};

	this.brightWhite = function() {
		self.sendRawPacket(new Buffer([0x66, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x83, 0x96, 0xf0, 0x0a, 0x90, 0x01, 0x00, 0x00]));
		//                                                           ^^^^^^^^^^  ^^^^^^^^^^  ^^^^^^^^^^              ^^^^^^^^^^
		//                                                              hue      saturation  luminance                 timing
	};

	this.getInfo = function() {
		self.sendRawPacket(new Buffer([0x65, 0x00, 0x00, 0x00]));
	};

	this.close = function() {
		UDPClient.close();
		client.end();
	};

}

