var dgram = require('dgram');
var net = require('net');
var util = require('util');

module.exports = {

	discover: function(cb) {
		var c = dgram.createSocket("udp4");
		var port = 56700;
		var found = false;
		c.on("error", function (err) {
			console.log("DGram error " + err);
		});
		c.on("message", function (msg, rinfo) {
			if (msg.length > 4 && msg[3] == 0x54) {
				found = true;
				c.close(); // Don't do this when we want ongoing status messages
				cb(null, {address:rinfo.address, port:rinfo.port, family:rinfo.family} );
			}
		});
		c.bind(port, function() {
			c.setBroadcast(true);
			var intervalID;
			// Now send the discovery packets
			intervalID = setInterval(function() {
				if (found) {
					clearInterval(intervalID);
				} else {
					var message = new Buffer([0x24, 0x00, 0x00, 0x34, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00]);
					c.send(message, 0, message.length, port, "255.255.255.255", function(err, bytes) {
						if (err) {
							cb(err);
						}
					});
				}
			}, 100);
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

	this.address = null;
	this.port = null;
	var client = null;

	if (typeof addr == 'object' && typeof addr.address == 'string' && typeof addr.port == 'number') {
		this.address = addr.address;
		this.port = addr.port;
	}

	client = net.connect(56700, '10.1.0.80', function() { //'connect' listener
		//console.log('client connected');
	});
	client.on('data', function(data) {
		console.log("  - " + "TCP got data (" + data.length + " bytes)");
		console.log("  - " + data.toString("hex"));
	});
	client.on('end', function() {
		console.log('TCP client disconnected');
	});

	var self = this;

	var standardPrefix = new Buffer([0x00, 0x00, 0x34, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xd0, 0x73, 0xd5, 0x00, 0x23, 0x9d, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);

	this.sendRawPacket = function(message) {
		var bLen = new Buffer([message.length + standardPrefix.length + 1]);
		var sendBuf = Buffer.concat([
			bLen,
			standardPrefix,
			message
		]);
		client.write(sendBuf);
	};

	this.lightsOn = function() {
		self.sendRawPacket(new Buffer([0x15, 0x00, 0x00, 0x00, 0x01, 0x00]));
	};

	this.lightsOff = function() {
		self.sendRawPacket(new Buffer([0x15, 0x00, 0x00, 0x00, 0x00, 0x00]));
	};

	this.red = function() {
		self.sendRawPacket(new Buffer([0x66, 0x00, 0x00, 0x00, 0x00, 0x9e, 0xd4, 0xff, 0xff, 0x8f, 0x02, 0xac, 0x0d, 0x13, 0x05, 0x00, 0x00]));
	};

	this.purple = function() {
		self.sendRawPacket(new Buffer([0x66, 0x00, 0x00, 0x00, 0x00, 0x15, 0xcc, 0xff, 0xff, 0x8f, 0x02, 0xac, 0x0d, 0x13, 0x05, 0x00, 0x00]));
	};

	this.brightWhite = function() {
		self.sendRawPacket(new Buffer([0x66, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x83, 0x96, 0xf0, 0x0a, 0x90, 0x01, 0x00, 0x00]));
	};

	this.getInfo = function() {
		self.sendRawPacket(new Buffer([0x65, 0x00, 0x00, 0x00]));
	};

	this.close = function() {
		client.end();
	};

}
