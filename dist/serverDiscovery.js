"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startServerDiscovery = startServerDiscovery;
const dgram_1 = __importDefault(require("dgram"));
const DISCOVERY_REQUEST = "GAME_SERVER_DISCOVER_V1";
const DISCOVERY_RESPONSE_PREFIX = "GAME_SERVER_HERE_V1:";
function startServerDiscovery(httpPort, discoveryPort) {
    const socket = dgram_1.default.createSocket("udp4");
    const lastUnknownPacketLog = new Map();
    let isBound = false;
    let isClosed = false;
    socket.on("error", (error) => {
        console.error("LAN discovery UDP error:", error);
        if (isBound && !isClosed) {
            isClosed = true;
            socket.close();
        }
        else {
            isClosed = true;
        }
    });
    socket.on("close", () => {
        isClosed = true;
    });
    socket.on("message", (message, remote) => {
        var _a;
        const request = message.toString("utf8");
        if (request !== DISCOVERY_REQUEST) {
            const currentTime = Date.now();
            if (currentTime - ((_a = lastUnknownPacketLog.get(remote.address)) !== null && _a !== void 0 ? _a : 0) >= 5000) {
                lastUnknownPacketLog.set(remote.address, currentTime);
                console.warn(`Unknown LAN discovery packet from ${remote.address}:${remote.port}: ${JSON.stringify(request.slice(0, 100))}`);
            }
            return;
        }
        console.log(`LAN discovery request received from ${remote.address}:${remote.port}`);
        const response = Buffer.from(`${DISCOVERY_RESPONSE_PREFIX}${httpPort}`);
        socket.send(response, remote.port, remote.address, (error) => {
            if (error) {
                console.error(`Could not reply to LAN discovery request from ${remote.address}:`, error);
            }
            else {
                console.log(`LAN discovery reply sent to ${remote.address}:${remote.port}`);
            }
        });
    });
    socket.bind(discoveryPort, "0.0.0.0", () => {
        isBound = true;
        console.log(`LAN discovery is listening on UDP port ${discoveryPort}`);
    });
    return {
        close: () => {
            if (isBound && !isClosed) {
                isClosed = true;
                socket.close();
            }
        }
    };
}
