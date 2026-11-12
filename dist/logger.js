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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlayerLog = void 0;
exports.logGeneral = logGeneral;
exports.logSaveData = logSaveData;
const mongoose_1 = __importStar(require("mongoose"));
const database_1 = require("./database/database");
const LogEntrySchema = new mongoose_1.Schema({
    timestamp: { type: Date, default: Date.now },
    message: { type: String, required: true },
    additional: { type: Object, default: {} },
});
const PlayerLogSchema = new mongoose_1.Schema({
    login: { type: String, required: true, unique: true },
    saves: [LogEntrySchema],
    logs: [LogEntrySchema],
    save_game: [LogEntrySchema],
    chat: [LogEntrySchema],
    privat_chat: [LogEntrySchema],
    chat_tex: [LogEntrySchema],
    gift: [LogEntrySchema],
    name: [LogEntrySchema],
    command: [LogEntrySchema],
    server: [LogEntrySchema],
    warning: [LogEntrySchema],
    ban: [LogEntrySchema],
});
// Используем уже существующую модель, если она определена
exports.PlayerLog = mongoose_1.default.models.PlayerLog || mongoose_1.default.model("PlayerLog", PlayerLogSchema);
// export async function logGeneral(login: string, logKey: string | number | symbol, message: string, additionalInfo?: Record<string, any>): Promise<void> {
//   // return
//   try {
//     await PlayerLog.updateOne(
//       { login },
//       { $push: { [logKey]: { message, additional: additionalInfo || {} } } },
//       { upsert: true }
//     );
//   } catch (error) {
//     console.error("Error logging general message:", error);
//   }
// }
function logGeneral(login, logKey, message, additionalInfo) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const ua = additionalInfo === null || additionalInfo === void 0 ? void 0 : additionalInfo.userAgent;
            if (ua && logKey == "save_game") {
                // 1) Сначала пытаемся ++count в coins.userAgents
                const incResult = yield database_1.CoinLog.updateOne({ login, "userAgents.userAgent": ua }, { $inc: { "userAgents.$.count": 1 } });
                // 2) Если не нашли — пушим новый элемент
                if (incResult.matchedCount === 0) {
                    yield database_1.CoinLog.updateOne({ login }, { $push: { userAgents: { userAgent: ua, count: 1 } } }, { upsert: true });
                }
                // (Опционально) Можно залогировать факт в playerlogs, если нужно
                yield exports.PlayerLog.updateOne({ login }, { $push: { [logKey]: { message, additional: additionalInfo } } }, { upsert: true });
            }
            else {
                // Поведение по‑умолчанию — пушим в playerlogs
                yield exports.PlayerLog.updateOne({ login }, { $push: { [logKey]: { message, additional: additionalInfo || {} } } }, { upsert: true });
            }
        }
        catch (error) {
            console.error("Error logging general message:", error);
        }
    });
}
function logSaveData(login, saveDataStr, additionalInfo) {
    return __awaiter(this, void 0, void 0, function* () {
        // return
        try {
            const parsedData = JSON.parse(saveDataStr);
            yield exports.PlayerLog.updateOne({ login }, { $push: { saves: { message: "Save data", additional: parsedData } } }, { upsert: true });
        }
        catch (error) {
            console.error("Error logging save data:", error);
        }
    });
}
