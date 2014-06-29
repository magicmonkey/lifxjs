packet = {
}

packet.polyfill = function() {
	for (var i in packets) {
		var pkt = packets[i];
		packet[pkt.shortname] = function(pkt) {
			return function(p) {
				if (typeof p != 'object') {
					p = {};
				}
				p.type = pkt.shortname;
				return packet.fromParams(p);
			};
		}(pkt);
	}
}

packet.fromBytes = function(b) {
	var newPacket = {preamble:{}, payload:{}};

	// First parse the preamble
	var runningPlace = 0;
	for (var i=0; i<preambleFields.length; i++) {
		var f = preambleFields[i];
		newPacket.preamble[f.name] = f.type.parse(b, runningPlace);
		runningPlace += f.type.size;
	}

	// Now parse the packet-specific bytes
	var pParser = packets[newPacket.preamble.packetType];
	if (typeof pParser == 'undefined') {
		console.log("Unknown packet type "+newPacket.preamble.packetType);
	} else {
		newPacket.packetTypeName = pParser.name;
		newPacket.packetTypeShortName = pParser.shortname;
		for (var i=0; i<pParser.fields.length; i++) {
			var f = pParser.fields[i];
			newPacket.payload[f.name] = f.type.parse(b, runningPlace);
			runningPlace += f.type.size;
		}
	}

	//console.log(newPacket);
	return newPacket;
};

packet.fromParams = function(p) {
	if (typeof p.type == 'undefined') {
		console.log("Unknown packet type requested");
		return;
	}

	var pParser;
	for (var i in packets) {
		if (packets[i].shortname == p.type) {
			pParser = packets[i];
			pParser.packetType = i;
			break;
		}
	}

	var newPacket = new Buffer(36 + pParser.length);
	var newPacketPayload = newPacket.slice(36);

	// Generate packet-specific data
	var runningPlace = 0;
	for (var i=0; i<pParser.fields.length; i++) {
		pParser.fields[i].type.unparse(newPacketPayload, runningPlace, p[pParser.fields[i].name]);
		runningPlace += pParser.fields[i].type.size;
	}
	
	// Generate preamble
	var runningPlace = 0;
	for (var i=0; i<preambleFields.length; i++) {
		var f = preambleFields[i];
		var datum;
		switch (f.name) {
			case 'size':
				datum = 36 + pParser.length;
				break;
			case 'protocol':
				if (typeof p[f.name] == 'undefined') {
					datum = 0x3400;
				} else {
					datum = p[f.name];
				}
				break;
			case 'bulbAddress':
			case 'site':
				if (typeof p[f.name] == 'undefined') {
					datum = new Buffer([0,0,0,0,0,0]);
				} else {
					datum = p[f.name];
				}
				break;
			case 'reserved1':
			case 'reserved2':
			case 'reserved3':
			case 'reserved4':
			case 'timestamp':
				datum = new Buffer(f.type.size);
				datum.fill(0);
				break;
			case 'packetType':
				datum = pParser.packetType;
				break;
		}
		f.type.unparse(newPacket, runningPlace, datum);
		runningPlace += f.type.size;
	}
	return newPacket;
};

type = {
	uint8: {
		size: 1,
		parse: function(b, start) {
			return b.readUInt8(start);
		},
		unparse: function(b, start, p) {
			return b.writeUInt8(p, start);
		}
	},
	uint16: {
		size: 2,
		parse: function(b, start) {
			return b.readUInt16BE(start);
		},
		unparse: function(b, start, p) {
			return b.writeUInt16BE(p, start);
		}
	},
	uint16_le: {
		size: 2,
		parse: function(b, start) {
			return b.readUInt16LE(start);
		},
		unparse: function(b, start, p) {
			return b.writeUInt16LE(p, start);
		}
	},
	uint32: {
		size: 4,
		parse: function(b, start) {
			return b.readUInt32BE(start);
		},
		unparse: function(b, start, p) {
			return b.writeUInt32BE(p, start);
		}
	},
	uint32_le: {
		size: 4,
		parse: function(b, start) {
			return b.readUInt32LE(start);
		},
		unparse: function(b, start, p) {
			return b.writeUInt32LE(p, start);
		}
	},
	uint64: {
		size: 8,
		parse: function(b, start) {
			var size = 8;
			return b.slice(start, start+size);
		},
		unparse: function(b, start, p) {
			return p.copy(b, start, 0, 8);
		}
	},
	uint64_le: { // TBD
		size: 8,
		parse: function(b, start) {
			var size = 8;
			return b.slice(start, start+size);
		},
		unparse: function(b, start, p) {
			return p.copy(b, start, 0, 8);
		}
	},
	float_le: {
		size: 4,
		parse: function(b, start) {
			var size = 4;
			return b.readFloatLE(start);
		},
		unparse: function(b, start, p) {
			return b.writeFloatLE(p, start);
		}
	},
	byte2: {
		size: 2,
		parse: function(b, start) {
			var size = 2;
			return b.slice(start, start+size);
		},
		unparse: function(b, start, p) {
			return p.copy(b, start, 0, 2);
		}
	},
	string3: {
		size: 3,
		parse: function(b, start) {
			var size = 3;
			return b.slice(start, start+size).toString().replace(/\0*$/, '');
		},
		unparse: function(b, start, p) {
			var b2 = new Buffer(p);
			return b2.copy(b, start, 0, 3);
		}
	},
	string3_le: {
		size: 3,
		parse: function(b, start) {
			var size = 3;
			var be = b.slice(start, start+size).toString().replace(/\0*$/, '');
			var le = be.split("").reverse().join(""); // reverse the string
			return le;
		},
		unparse: function(b, start, p) {
			var b2 = new Buffer(p);
			return b2.copy(b, start, 0, 3);
		}
	},
	byte4: {
		size: 4,
		parse: function(b, start) {
			var size = 4;
			return b.slice(start, start+size);
		},
		unparse: function(b, start, p) {
			return p.copy(b, start, 0, 4);
		}
	},
	byte6: {
		size: 6,
		parse: function(b, start) {
			var size = 6;
			return b.slice(start, start+size);
		},
		unparse: function(b, start, p) {
			return p.copy(b, start, 0, 6);
		}
	},
	byte16: {
		size: 16,
		parse: function(b, start) {
			var size = 16;
			return b.slice(start, start+size);
		},
		unparse: function(b, start, p) {
			return p.copy(b, start, 0, 16);
		}
	},
	byte32: {
		size: 32,
		parse: function(b, start) {
			var size = 32;
			return b.slice(start, start+size);
		},
		unparse: function(b, start, p) {
			return p.copy(b, start, 0, 32);
		}
	},
	string32: {
		size: 32,
		parse: function(b, start) {
			var size = 32;
			return b.slice(start, start+size).toString().replace(/\0*$/, '');
		},
		unparse: function(b, start, p) {
			var b2 = new Buffer(p);
			return b2.copy(b, start, 0, 32);
		}
	}
};

preambleFields = [
	{ name: "size"       , type:type.uint16_le },
	{ name: "protocol"   , type:type.uint16_le },
	{ name: "reserved1"  , type:type.byte4 }    ,
	{ name: "bulbAddress", type:type.byte6 }    ,
	{ name: "reserved2"  , type:type.byte2 }    ,
	{ name: "site"       , type:type.byte6 }    ,
	{ name: "reserved3"  , type:type.byte2 }    ,
	{ name: "timestamp"  , type:type.uint64 }   ,
	{ name: "packetType" , type:type.uint16_le },
	{ name: "reserved4"  , type:type.byte2 }    ,
];

packets = {
	0x02: {
		name:"Get PAN gateway",
		shortname:"getPanGateway",
		length:0,
		fields:[]
	},
	0x03: {
		name:"PAN gateway",
		shortname:"panGateway",
		length:5,
		fields:[
			{name:"service", type:type.uint8}    ,
			{name:"port"   , type:type.uint32_le}
		]
	},
	0x04: {
		name:"Get time",
		shortname:"getTime",
		length:0,
		fields:[]
	},
	0x05: {
		name:"Set time",
		shortname:"setTime",
		length:8,
		fields:[
			{name:"time", type:type.uint64_le}
		]
	},
	0x06: {
		name:"Time state",
		shortname:"timeState",
		length:8,
		fields:[
			{name:"time", type:type.uint64_le}
		]
	},
	0x07: {
		name:"Get reset switch state",
		shortname:"getResetSwitchState",
		length:0,
		fields:[]
	},
	0x08: {
		name:"Reset switch state",
		shortname:"resetSwitchState",
		length:2,
		fields:[
			{name:"position", type:type.uint8}
		]
	},
	0x0c: {
		name:"Get mesh info",
		shortname:"getMeshInfo",
		length:0,
		fields:[]
	},
	0x0d: {
		name:"Mesh info",
		shortname:"meshInfo",
		length:14,
		fields:[
			{name:"signal"        , type:type.float_le} ,
			{name:"tx"            , type:type.uint32_le},
			{name:"rx"            , type:type.uint32_le},
			{name:"mcuTemperature", type:type.uint16}
		]
	},
	0x0e: {
		name:"Get mesh firmware",
		shortname:"getMeshFirmware",
		length:0,
		fields:[]
	},
	0x0f: {
		name:"Mesh firmware",
		shortname:"meshFirmware",
		length:20,
		fields:[
			{name:"build_second"  , type:type.uint8},
			{name:"build_minute"  , type:type.uint8},
			{name:"build_hour"    , type:type.uint8},
			{name:"build_day"     , type:type.uint8},
			{name:"build_month"   , type:type.string3_le},
			{name:"build_year"    , type:type.uint8},
			{name:"install_second", type:type.uint8},
			{name:"install_minute", type:type.uint8},
			{name:"install_hour"  , type:type.uint8},
			{name:"install_day"   , type:type.uint8},
			{name:"install_month" , type:type.string3_le},
			{name:"install_year"  , type:type.uint8},
			{name:"version"       , type:type.uint32_le}
		]
	},
	0x10: {
		name:"Get wifi info",
		shortname:"getWifiInfo",
		length:0,
		fields:[]
	},
	0x11: {
		name:"Wifi info",
		shortname:"wifiInfo",
		length:14,
		fields:[
			{name:"signal"        , type:type.float_le} ,
			{name:"tx"            , type:type.uint32_le},
			{name:"rx"            , type:type.uint32_le},
			{name:"mcuTemperature", type:type.uint16}
		]
	},
	0x12: {
		name:"Get wifi firmware state",
		shortname:"getWifiFirmwareState",
		length:0,
		fields:[]
	},
	0x13: {
		name:"Wifi firmware state",
		shortname:"wifiFirmwareState",
		length:20,
		fields:[
			{name:"build_second"  , type:type.uint8},
			{name:"build_minute"  , type:type.uint8},
			{name:"build_hour"    , type:type.uint8},
			{name:"build_day"     , type:type.uint8},
			{name:"build_month"   , type:type.string3_le},
			{name:"build_year"    , type:type.uint8},
			{name:"install_second", type:type.uint8},
			{name:"install_minute", type:type.uint8},
			{name:"install_hour"  , type:type.uint8},
			{name:"install_day"   , type:type.uint8},
			{name:"install_month" , type:type.string3_le},
			{name:"install_year"  , type:type.uint8},
			{name:"version"       , type:type.uint32_le}
		]
	},
	0x14: {
		name:"Get power state",
		shortname:"getPowerState",
		length:0,
		fields:[]
	},
	0x15: {
		name:"Set power state",
		shortname:"setPowerState",
		length:2,
		fields:[
			{name:"onoff", type:type.uint16},
		]
	},
	0x16: {
		name:"Power state",
		shortname:"powerState",
		length:2,
		fields:[
			{name:"onoff", type:type.uint16},
		]
	},
	0x17: {
		name:"Get bulb label",
		shortname:"getBulbLabel",
		length:0,
		fields:[]
	},
	0x18: {
		name:"Set bulb label",
		shortname:"setBulbLabel",
		length:32,
		fields:[
			{name:"label", type:type.string32},
		]
	},
	0x19: {
		name:"Bulb label",
		shortname:"bulbLabel",
		length:32,
		fields:[
			{name:"label", type:type.string32},
		]
	},
	0x1a: {
		name:"Get tags",
		shortname:"getTags",
		length:0,
		fields:[]
	},
	0x1b: {
		name:"Set tags",
		shortname:"setTags",
		length:8,
		fields:[
			{name:"tags", type:type.uint64},
		]
	},
	0x1c: {
		name:"Tags",
		shortname:"tags",
		length:8,
		fields:[
			{name:"tags", type:type.uint64},
		]
	},
	0x1d: {
		name:"Get tag labels",
		shortname:"getTagLabels",
		length:8,
		fields:[
			{name:"tags", type:type.uint64},
		]
	},
	0x1e: {
		name:"Set tag labels",
		shortname:"setTagLabels",
		length:40,
		fields:[
			{name:"tags", type:type.uint64},
			{name:"label", type:type.string32},
		]
	},
	0x1f: {
		name:"Tag labels",
		shortname:"tagLabels",
		length:40,
		fields:[
			{name:"tags", type:type.uint64},
			{name:"label", type:type.string32},
		]
	},
	0x20: {
		name:"Get version",
		shortname:"getVersion",
		length:0,
		fields:[]
	},
	0x21: {
		name:"Version state",
		shortname:"versionState",
		length:12,
		fields:[
			{name:"vendor",  type:type.uint32},
			{name:"product", type:type.uint32},
			{name:"version", type:type.uint32}
		]
	},
	0x22: {
		name:"Get info",
		shortname:"getInfo",
		length:0,
		fields:[]
	},
	0x23: {
		name:"Info state",
		shortname:"infoState",
		length:24,
		fields:[
			{name:"time"    , type:type.uint64_le},
			{name:"uptime"  , type:type.uint64_le},
			{name:"downtime", type:type.uint64_le}
		]
	},
	0x24: {
		name:"Get MCU rail voltage",
		shortname:"getMcuRailVoltage",
		length:0,
		fields:[]
	},
	0x25: {
		name:"MCU rail voltage",
		shortname:"mcuRailVoltage",
		length:4,
		fields:[
			{name:"voltage", type:type.uint32_le},
		]
	},
	0x26: {
		name:"Reboot",
		shortname:"reboot",
		length:0,
		fields:[]
	},
	0x27: {
		name:"Set factory test mode",
		shortname:"setFactoryTestMode",
		length:1,
		fields:[
			{name:"on", type:type.uint8},
		]
	},
	0x28: {
		name:"Disable factory test mode",
		shortname:"disableFactoryTestMode",
		length:0,
		fields:[]
	},
	0x65: {
		name:"Get light state",
		shortname:"getLightState",
		length:0,
		fields:[]
	},
	0x66: {
		name:"Set light colour",
		shortname:"setLightColour",
		length:13,
		fields:[
			{name:"stream"    , type:type.uint8}    ,
			{name:"hue"       , type:type.uint16_le},
			{name:"saturation", type:type.uint16_le},
			{name:"brightness", type:type.uint16_le},
			{name:"kelvin"    , type:type.uint16_le},
			{name:"fadeTime"  , type:type.uint32_le},
		]
	},
	0x67: {
		name:"Set waveform",
		shortname:"setWaveform",
		length:21,
		fields:[
			{name:"stream"    , type:type.uint8}    ,
			{name:"transient" , type:type.uint8}    ,
			{name:"hue"       , type:type.uint16_le},
			{name:"saturation", type:type.uint16_le},
			{name:"brightness", type:type.uint16_le},
			{name:"kelvin"    , type:type.uint16_le},
			{name:"period"    , type:type.uint32_le},
			{name:"cycles"    , type:type.float}    ,
			{name:"dutyCycles", type:type.uint16}   ,
			{name:"waveform"  , type:type.uint8}    ,
		]
	},
	0x68: {
		name:"Set dim (absolute)",
		shortname:"setDimAbsolute",
		length:6,
		fields:[
			{name:"brightness", type:type.uint16_le},
			{name:"duration"  , type:type.uint32}   ,
		]
	},
	0x69: {
		name:"Set dim (relative)",
		shortname:"setDimRelative",
		length:6,
		fields:[
			{name:"brightness", type:type.uint16_le},
			{name:"duration"  , type:type.uint32}   ,
		]
	},
	0x6b: {
		name:"Light status",
		shortname:"lightStatus",
		length:52,
		fields:[
			{name:"hue"       , type:type.uint16_le},
			{name:"saturation", type:type.uint16_le},
			{name:"brightness", type:type.uint16_le},
			{name:"kelvin"    , type:type.uint16_le},
			{name:"dim"       , type:type.uint16_le},
			{name:"power"     , type:type.uint16_le},
			{name:"bulbLabel" , type:type.string32} ,
			{name:"tags"      , type:type.uint64}   ,
		]
	},
	0x12d: {
		name:"Get wifi state",
		shortname:"getWifiState",
		length:1,
		fields:[
			{name:"interface", type:type.uint8},
		]
	},
	0x12e: {
		name:"Set wifi state",
		shortname:"setWifiState",
		length:22,
		fields:[
			{name:"interface", type:type.uint8},
			{name:"wifiStatus", type:type.uint8},
			{name:"ip4Address", type:type.byte4},
			{name:"ip6Address", type:type.byte16},
		]
	},
	0x12f: {
		name:"Wifi state",
		shortname:"wifiState",
		length:22,
		fields:[
			{name:"interface" , type:type.uint8} ,
			{name:"wifiStatus", type:type.uint8} ,
			{name:"ip4Address", type:type.byte4} ,
			{name:"ip6Address", type:type.byte16},
		]
	},
	0x130: {
		name:"Get access points",
		shortname:"getAccessPoints",
		length:0,
		fields:[]
	},
	0x131: {
		name:"Set access point",
		shortname:"setAccessPoints",
		length:98,
		fields:[
			{name:"interface"       , type:type.uint8}   ,
			{name:"ssid"            , type:type.string32},
			{name:"password"        , type:type.string64},
			{name:"securityProtocol", type:type.uint8}   ,
		]
	},
	0x132: {
		name:"Access point",
		shortname:"accessPoint",
		length:38,
		fields:[
			{name:"interface"       , type:type.uint8}   ,
			{name:"ssid"            , type:type.string32},
			{name:"securityProtocol", type:type.uint8}   ,
			{name:"strength"        , type:type.uint16}  ,
			{name:"channel"         , type:type.uint16}  ,
		]
	},
};

packet.polyfill();

module.exports = packet;

