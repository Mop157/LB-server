"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a, _b, _c, _d;
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const mongoose_1 = __importDefault(require("mongoose"));
const morgan_1 = __importDefault(require("morgan"));
const process_1 = __importDefault(require("process"));
const serverRoutes_1 = __importDefault(require("./routes/serverRoutes"));
const serverDiscovery_1 = require("./serverDiscovery");
const setting_1 = __importDefault(require("./setting/setting"));
const database_1 = require("./database/database");
const port = Number((_a = process_1.default.env.PORT) !== null && _a !== void 0 ? _a : setting_1.default.port);
const address = (_b = process_1.default.env.HOST) !== null && _b !== void 0 ? _b : setting_1.default.adress;
const mongoUri = (_c = process_1.default.env.MONGO_URI) !== null && _c !== void 0 ? _c : "mongodb://127.0.0.1:27017/mygame";
const discoveryPort = Number((_d = process_1.default.env.DISCOVERY_PORT) !== null && _d !== void 0 ? _d : 16262);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535");
}
if (!Number.isInteger(discoveryPort) || discoveryPort < 1 || discoveryPort > 65535) {
    throw new Error("DISCOVERY_PORT must be an integer between 1 and 65535");
}
const startServer = () => __awaiter(void 0, void 0, void 0, function* () {
    yield mongoose_1.default.connect(mongoUri);
    console.log("Connected to MongoDB");
    const discoveryServer = (0, serverDiscovery_1.startServerDiscovery)(port, discoveryPort);
    const playerCleanup = setInterval(() => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const currentTime = Math.floor(Date.now() / 1000);
            yield database_1.Player.deleteMany({ lastUpdate: { $lt: currentTime - setting_1.default.TIMEOUT } });
        }
        catch (error) {
            console.error("Error cleaning stale players:", error);
        }
    }), 2 * 60 * 1000);
    const chatCleanup = setInterval(() => __awaiter(void 0, void 0, void 0, function* () {
        try {
            yield database_1.ChatMessage.updateMany({ channel: { $in: ["1", "2"] } }, [{ $set: { messages: { $slice: ["$messages", setting_1.default.limitechatmessage] } } }]);
        }
        catch (error) {
            console.error("Error trimming chat messages:", error);
        }
    }), 60 * 60 * 1000);
    const app = (0, express_1.default)();
    app.use(body_parser_1.default.urlencoded({ extended: true, limit: "10mb" }));
    app.use(body_parser_1.default.json({ limit: "15mb" }));
    app.use((0, morgan_1.default)("combined"));
    app.use("/api/", serverRoutes_1.default);
    app.use((req, res) => {
        res.status(404).json({ error: "Not found" });
    });
    const server = app.listen(port, address, () => {
        console.log(`Server is listening at http://${address}:${port}`);
    });
    let stopping = false;
    const stopServer = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (exitCode = 0) {
        if (stopping)
            return;
        stopping = true;
        process_1.default.exitCode = exitCode;
        clearInterval(playerCleanup);
        clearInterval(chatCleanup);
        discoveryServer.close();
        if (server.listening)
            server.close();
        yield mongoose_1.default.disconnect();
    });
    server.on("error", (error) => {
        console.error(`HTTP server failed to listen on ${address}:${port}:`, error);
        void stopServer(1).catch((shutdownError) => {
            console.error("Server shutdown failed:", shutdownError);
            process_1.default.exitCode = 1;
        });
    });
    process_1.default.once("SIGINT", () => void stopServer());
    process_1.default.once("SIGTERM", () => void stopServer());
});
void startServer().catch((error) => {
    console.error("Server startup failed:", error);
    process_1.default.exitCode = 1;
});
