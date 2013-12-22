local lifx = Proto("lifx", "LIFX wifi lightbulb")

local F = lifx.fields

F.size       = ProtoField.uint16("lifx.size"      , "Packet size"   , base.HEX)
F.protocol   = ProtoField.uint16("lifx.protocol"  , "LIFX protocol" , base.HEX)
F.reserved   = ProtoField.bytes("lifx.reserved"   , "Reserved"      , base.HEX)
F.targetAddr = ProtoField.bytes("lifx.targetAddr" , "Target address", base.HEX)
F.site       = ProtoField.bytes("lifx.site"       , "Site address"  , base.HEX)
F.timestamp  = ProtoField.uint64("lifx.timestamp" , "Timestamp"     , base.HEX)
F.packetType = ProtoField.uint16("lifx.packetType", "Packet type"   , base.HEX)

F.unknown1   = ProtoField.uint8("lifx.unknown1"    , "Unknown - always 1 or 2"     , base.HEX)
F.unknown2   = ProtoField.uint32("lifx.unknown2"   , "Unknown - always 7c dd 00 00", base.HEX)
F.onoffReq   = ProtoField.uint8("lifx.onoff"       , "On/off setting", base.HEX)
F.bulbName   = ProtoField.string("lifx.bulbName"   , "Bulb name"     , base.HEX)
F.hue        = ProtoField.uint16("lifx.hue"        , "Hue"           , base.HEX)
F.saturation = ProtoField.uint16("lifx.saturation" , "Saturation"    , base.HEX)
F.luminance  = ProtoField.uint16("lifx.luminance"  , "Luminance"     , base.HEX)
F.colourTemp = ProtoField.uint16("lifx.colourTemp" , "Colour temperature", base.HEX)
F.fadeTime   = ProtoField.uint16("lifx.fadeTime"   , "Fade time"     , base.HEX)
F.fadeTime   = ProtoField.uint16("lifx.fadeTime"   , "Fade time"     , base.HEX)
F.onoffRes   = ProtoField.uint16("lifx.onoffResponse", "On/off", base.HEX)

function switch(t)
	t.case = function (self, pType, buffer, pinfo, tree)
		local f=self[pType] or self.default
		if f then
			if type(f)=="function" then
				f(buffer, pinfo, tree, self)
			else
				error("case "..tostring(pType).." not a function")
			end
		end
	end
	return t
end

function unknownPacket(buffer, pinfo, tree)
	print("Unknown packet "..buffer(32,2):uint().." in packet number "..pinfo.number)
	tree:append_text(" (Unknown packet)")
end

-- 0x03 or 768
function deviceState(buffer, pinfo, tree)
	tree:append_text(" (Device state response)")
	tree:add(F.unknown1, buffer(36, 1))
	tree:add(F.unknown2, buffer(37, 4))
end

-- 0x02 or 512
function getPANgateway(buffer, pinfo, tree)
	tree:append_text(" (Get PAN gateway)")
end

-- 0x15 or 5376
function onoffRequest(buffer, pinfo, tree)
	tree:append_text(" (On/off request)")
	tree:add(F.onoffReq, buffer(36, 1))
	if (buffer(36, 1):uint() == 0) then tree:append_text(" (Off)") end
	if (buffer(36, 1):uint() == 1) then tree:append_text(" (On)") end
end

-- 0x18 or 6144
function changeName(buffer, pinfo, tree)
	tree:append_text(" (Change name request)")
	tree:add(F.bulbName, buffer(36))
end

-- 0x65 or 25856
function statusRequest(buffer, pinfo, tree)
	tree:append_text(" (Status request)")
end

-- 0x66 or 26112
function setBulbState(buffer, pinfo, tree)
	tree:append_text(" (Set bulb state)")
	tree:add_le(F.hue, buffer(37,2))
	tree:add_le(F.saturation, buffer(39,2))
	tree:add_le(F.luminance,  buffer(41,2))
	tree:add_le(F.colourTemp, buffer(43,2))
	tree:add_le(F.fadeTime,   buffer(45,2))
end

-- 0x16 or 5632
function onoffResponse(buffer, pinfo, tree)
	tree:append_text(" (On/off response)")
	tree:add(F.onoffRes, buffer(36, 2))
	if (buffer(36, 2):uint() == 0) then tree:append_text(" (Off)") end
	if (buffer(36, 2):uint() == 65535) then tree:append_text(" (On)") end
end

-- 0x19 or 6400
function changeNameResponse(buffer, pinfo, tree)
	tree:append_text(" (Change name response)")
	tree:add(F.bulbName, buffer(36))
end

-- 0x6b or 27392
function statusResponse(buffer, pinfo, tree)
	tree:append_text(" (Status response)")
	tree:add_le(F.hue       , buffer(36  , 2))
	tree:add_le(F.saturation, buffer(38  , 2))
	tree:add_le(F.luminance , buffer(40  , 2))
	tree:add_le(F.colourTemp, buffer(42  , 2))
	tree:add(F.reserved     , buffer(44  , 2))
	local onoffnode = tree:add(F.onoffRes     , buffer(46  , 2))
	if (buffer(46, 2):uint() == 0) then onoffnode:append_text(" (Off)") end
	if (buffer(46, 2):uint() == 65535) then onoffnode:append_text(" (On)") end
	tree:add(F.bulbName     , buffer(48))
end

-- 0x68 or 26624
function setDimAbsolute(buffer, pinfo, tree)
	tree:append_text(" (Set dim - absolute)")
end

-- 0x69 or 26880
function setDimRelative(buffer, pinfo, tree)
	tree:append_text(" (Set dim - relative)")
end

-- 0x12f or 12033
function wifiState(buffer, pinfo, tree)
	tree:append_text(" (Wifi state)")
end

packetTable = switch {
	[768]   = deviceState,
	[512]   = getPANgateway,
	[5376]  = onoffRequest,
	[6144]  = changeName,
	[25856] = statusRequest,
	[26112] = setBulbState,
	[5632]  = onoffResponse,
	[6400]  = changeNameResponse,
	[27392] = statusResponse,
	[26624] = setDimAbsolute,
	[26880] = setDimRelative,
	[12033] = wifiState,
	default = unknownPacket
}

function lifx.dissector(buffer, pinfo, tree)

	local subtree = tree:add("LIFX")
	subtree:add_le(F.size, buffer(0,2))
	subtree:add(F.protocol, buffer(2,2))
	subtree:add(F.reserved, buffer(4,4))
	subtree:add(F.targetAddr, buffer(8,6))
	subtree:add(F.reserved, buffer(14,2))
	subtree:add(F.site, buffer(16,6))
	subtree:add(F.reserved, buffer(22,2))
	subtree:add(F.timestamp, buffer(24,8))
	subtree:add_le(F.packetType, buffer(32,2))
	subtree:add(F.reserved, buffer(34,2))

	local pSubtree = subtree:add("LIFX packet type")
	-- print(buffer(32,2):uint())
	packetTable:case(buffer(32,2):uint(), buffer, pinfo, pSubtree)

end

local tcpTable = DissectorTable.get("tcp.port")
tcpTable:add(56700, lifx)
local udpTable = DissectorTable.get("udp.port")
udpTable:add(56700, lifx)

