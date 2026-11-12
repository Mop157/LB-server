"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoinLog = exports.ActiveCommand = exports.Ban = exports.ServerEvent = exports.UserGift = exports.ChatMessage = exports.Save = exports.User = exports.Player = void 0;
// models.ts
const mongoose_1 = __importStar(require("mongoose"));
const PlayerSchema = new mongoose_1.Schema({
    login: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    position: { type: String, required: true },
    power: { type: String, required: true },
    caps: { type: String, required: true },
    version: { type: String, required: true },
    language: { type: String, required: true },
    slot: { type: String, required: true },
    // Поле для хранения координат в формате GeoJSON
    location: {
        type: { type: String, enum: ['Point'], required: true },
        coordinates: { type: [Number], required: true }
    },
    lastUpdate: { type: Number, required: true }
});
// Создаём геоспациальный индекс по полю location
PlayerSchema.index({ location: "2dsphere" });
exports.Player = mongoose_1.default.model("Player", PlayerSchema);
const UserSchema = new mongoose_1.Schema({
    account: {
        login: { type: String, required: true, unique: true },
        name: { type: String, required: true },
        newname: { type: Boolean, default: false },
        token: { type: String, required: true },
        ID: { type: String, default: "null" },
        IP: { type: String, default: "null" }
    }
});
exports.User = mongoose_1.default.model("User", UserSchema);
const SaveSchema = new mongoose_1.Schema({
    login: { type: String, required: true, unique: true },
    profile: { type: mongoose_1.Schema.Types.Mixed, required: true },
});
// Если модель уже скомпилирована, используем её
exports.Save = mongoose_1.default.models.Save || mongoose_1.default.model("Save", SaveSchema);
const ChatMessageSchema = new mongoose_1.Schema({
    channel: { type: String, required: true },
    messages: {
        type: mongoose_1.Schema.Types.Mixed,
        default: function () {
            return (this.channel === "3" || this.channel === "4") ? {} : [];
        }
    }
});
exports.ChatMessage = mongoose_1.default.model("ChatMessage", ChatMessageSchema);
const UserGiftSchema = new mongoose_1.Schema({
    taker: { type: String, required: true, unique: true },
    gifts: { type: [mongoose_1.Schema.Types.Mixed], default: [] }
});
exports.UserGift = mongoose_1.default.model("UserGift", UserGiftSchema);
const ServerEventSchema = new mongoose_1.Schema({
    // ваши существующие поля
    isEvent: { type: Boolean, default: false },
    message: { type: Object, default: {} },
    item: { type: Object, default: {} },
    itemGive: { type: Object, default: {} },
    promo: { type: Object, default: {} },
    customEvent: { type: Object, default: {} },
    listtime: { type: [String], default: [] },
}, { strict: false });
exports.ServerEvent = mongoose_1.default.model("ServerEvent", ServerEventSchema);
const BanSchema = new mongoose_1.Schema({
    login: { type: [String], default: [] },
    IP: { type: [String], default: [] },
    ID: { type: [String], default: [] },
    mute: { type: [String], default: [] },
    gift: { type: [String], default: [] }
});
exports.Ban = mongoose_1.default.model("Ban", BanSchema);
const ActiveCommandSchema = new mongoose_1.Schema({
    login: { type: String, required: true, unique: true },
    command: {
        id: { type: String, required: true },
        name: { type: String },
        count: { type: Number }
    }
});
// Если модель уже существует – переиспользуем её
exports.ActiveCommand = mongoose_1.default.models.ActiveCommand || mongoose_1.default.model("ActiveCommand", ActiveCommandSchema);
const CoinLogSchema = new mongoose_1.Schema({
    login: { type: String, required: true, unique: true },
    userAgents: [{
            userAgent: { type: String, required: true },
            count: { type: Number, required: true, default: 0 }
        }]
});
// Именованный экспорт вместо default
exports.CoinLog = (0, mongoose_1.model)("CoinLog", CoinLogSchema, "coins");
