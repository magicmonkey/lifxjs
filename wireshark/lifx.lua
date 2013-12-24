local lifx = Proto("lifx", "LIFX wifi lightbulb")
local F = lifx.fields

function switch(t)
	t.case = function (self, pType, buffer, pinfo, tree)
		local f=self[pType]
		if packetNames[pType] then pinfo.cols.info = packetNames[pType] end
		if f then
			if type(f)=="function" then
				f(buffer, pinfo, tree, self)
			end
		end
	end
	return t
end

local onOffStrings = {
	[0x0000] = "Off",
	[0x0001] = "On",
	[0xffff] = "On"
}

packetNames = {
	[0x0002]   = "Get PAN Gateway",
	[0x0003]   = "Device state response",
	[0x0004]   = "Get time",
	[0x0005]   = "Set time",
	[0x0006]   = "Time state",
	[0x0007]   = "Get reset switch",
	[0x0008]   = "Reset switch state",
	[0x0009]   = "Get dummy load",
	[0x000a]   = "Set dummy load",
	[0x000b]   = "Dummy load",
	[0x000c]   = "Get mesh info",
	[0x000d]   = "Mesh info",
	[0x000e]   = "Get mesh firmware",
	[0x000f]   = "Mesh firmware state",
	[0x0010]   = "Get wifi info",
	[0x0011]   = "Wifi info",
	[0x0012]   = "Get wifi firmware state",
	[0x0013]   = "Wifi firmware state",
	[0x0014]   = "Get power state",
	[0x0015]   = "Set power state",
	[0x0016]   = "Power state",
	[0x0017]   = "Get bulb label",
	[0x0018]   = "Set bulb label",
	[0x0019]   = "Bulb label",
	[0x001a]   = "Get tags",
	[0x001c]   = "Tags",
	[0x001d]   = "Get tag labels",
	[0x001f]   = "Tag labels",
	[0x0020]   = "Get version",
	[0x0022]   = "Get info",
	[0x0023]   = "Info",
	[0x0024]   = "Get MCU rail voltage",
	[0x0025]   = "MCU rail voltage",
	[0x0026]   = "Reboot",
	[0x0065]   = "Get light state",
	[0x0066]   = "Set light color",
	[0x0067]   = "Set waveform",
	[0x0068]   = "Set dim (absolute)",
	[0x0069]   = "Set dim (relative)",
	[0x006b]   = "Light status",
	[0x012d]   = "Get wifi state",
	[0x012e]   = "Set wifi state",
	[0x012f]   = "Wifi state",
	[0x0130]   = "Get access points",
	[0x0131]   = "Set access point",
	[0x0132]   = "Access point"
}

function unknownPacket(buffer, pinfo, tree)
	print("Unknown packet "..buffer(0,2):uint().." in packet number "..pinfo.number)
end

function deviceState(buffer, pinfo, tree)
	tree:add(F.unknown1, buffer(0, 1))
	tree:add(F.unknown2, buffer(1, 4))
end

function onoffRequest(buffer, pinfo, tree)
	tree:add(F.onoffReq, buffer(0, 1))
end

function changeName(buffer, pinfo, tree)
	tree:add(F.bulbName, buffer(0))
end

function setBulbState(buffer, pinfo, tree)
	tree:add_le(F.hue, buffer(1,2))
	tree:add_le(F.saturation, buffer(3,2))
	tree:add_le(F.luminance,  buffer(5,2))
	tree:add_le(F.colourTemp, buffer(7,2))
	tree:add_le(F.fadeTime,   buffer(8,2))
end

function onoffResponse(buffer, pinfo, tree)
	tree:add(F.onoffRes, buffer(0, 2))
end

function changeNameResponse(buffer, pinfo, tree)
	tree:add(F.bulbName, buffer(0))
end

function statusResponse(buffer, pinfo, tree)
	tree:add_le(F.hue       , buffer(0 , 2))
	tree:add_le(F.saturation, buffer(2 , 2))
	tree:add_le(F.luminance , buffer(4 , 2))
	tree:add_le(F.colourTemp, buffer(6 , 2))
	tree:add(F.reserved     , buffer(8 , 2))
	tree:add(F.onoffRes     , buffer(10, 2))
	tree:add(F.bulbName     , buffer(12))
end

packetTable = switch {
	[0x0003] = deviceState,
	[0x0015] = onoffRequest,
	[0x0018] = changeName,
	[0x0066] = setBulbState,
	[0x0016] = onoffResponse,
	[0x0019] = changeNameResponse,
	[0x006b] = statusResponse
}

F.size       = ProtoField.uint16("lifx.size"         , "Packet size"                 , base.HEX)
F.protocol   = ProtoField.uint16("lifx.protocol"     , "LIFX protocol"               , base.HEX)
F.reserved   = ProtoField.bytes("lifx.reserved"      , "Reserved"                    , base.HEX)
F.targetAddr = ProtoField.ether("lifx.targetAddr"    , "Target address"              , base.HEX)
F.site       = ProtoField.ether("lifx.site"          , "Site address"                , base.HEX)
F.timestamp  = ProtoField.uint64("lifx.timestamp"    , "Timestamp"                   , base.HEX)
F.packetType = ProtoField.uint16("lifx.packetType"   , "Packet type"                 , base.HEX, packetNames)

F.unknown1   = ProtoField.uint8("lifx.unknown1"      , "Unknown - always 1 or 2"     , base.HEX)
F.unknown2   = ProtoField.uint32("lifx.unknown2"     , "Unknown - always 7c dd 00 00", base.HEX)
F.onoffReq   = ProtoField.uint8("lifx.onoff"         , "On/off setting"              , base.HEX, onOffStrings)
F.bulbName   = ProtoField.string("lifx.bulbName"     , "Bulb name"                   , base.HEX)
F.hue        = ProtoField.uint16("lifx.hue"          , "Hue"                         , base.HEX)
F.saturation = ProtoField.uint16("lifx.saturation"   , "Saturation"                  , base.HEX)
F.luminance  = ProtoField.uint16("lifx.luminance"    , "Luminance"                   , base.HEX)
F.colourTemp = ProtoField.uint16("lifx.colourTemp"   , "Colour temperature"          , base.HEX)
F.fadeTime   = ProtoField.uint16("lifx.fadeTime"     , "Fade time"                   , base.HEX)
F.onoffRes   = ProtoField.uint16("lifx.onoffResponse", "On/off"                      , base.HEX, onOffStrings)

function lifx.dissector(buffer, pinfo, tree)
	analyse(buffer, pinfo, tree)
end

function analyse(buffer, pinfo, tree)
	pinfo.cols.info = "LIFX"

	-- LE maths on the packet length
	local lifxlength = buffer(0,2):le_uint()

	local subtree = tree:add(buffer(0, lifxlength), "LIFX packet")
	subtree:add_le(F.size, buffer(0,2))
	subtree:add(F.protocol, buffer(2,2))
	subtree:add(F.reserved, buffer(4,4))
	subtree:add(F.targetAddr, buffer(8,6))
	subtree:add(F.reserved, buffer(14,2))
	subtree:add(F.site, buffer(16,6))
	subtree:add(F.reserved, buffer(22,2))
	subtree:add(F.timestamp, buffer(24,8))
	local packetPayload = subtree:add_le(F.packetType, buffer(32,2))
	subtree:add(F.reserved, buffer(34,2))

	-- Call the packet-specific handler
	packetTable:case(buffer(32,2):le_uint(), buffer(36), pinfo, packetPayload)

	-- Check if there's another LIFX packet inside this TCP packet
	if (lifxlength > 0 and buffer:len() > lifxlength) then
		analyse(buffer(lifxlength), pinfo, tree)
	end


end

local tcpTable = DissectorTable.get("tcp.port")
tcpTable:add(56700, lifx)
local udpTable = DissectorTable.get("udp.port")
udpTable:add(56700, lifx)

