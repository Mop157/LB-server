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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const mongoose_1 = __importStar(require("mongoose"));
const mongoUri = (_a = process.env.MONGO_URI) !== null && _a !== void 0 ? _a : "mongodb://127.0.0.1:27017/mygame";
mongoose_1.default.connect(mongoUri)
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
});
const UserSchema = new mongoose_1.Schema({
    account: {
        login: { type: String, required: true, unique: true },
        name: { type: String, required: true },
        token: { type: String, required: true },
        ID: { type: String, default: "null" },
        IP: { type: String, default: "null" }
    },
    profile: { type: mongoose_1.Schema.Types.Mixed }
});
const User = mongoose_1.default.models.User || mongoose_1.default.model("User", UserSchema);
const SaveSchema = new mongoose_1.Schema({
    login: { type: String, required: true },
    profile: { type: mongoose_1.Schema.Types.Mixed, required: true }
});
const Save = mongoose_1.default.models.Save || mongoose_1.default.model("Save", SaveSchema);
// Функция миграции: перенос профиля и логина в коллекцию Save и удаление profile из User
function migrateProfileToSave() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Находим всех пользователей, у которых определено поле profile
            const usersToMigrate = yield User.find({ profile: { $exists: true, $ne: null } });
            console.log(`Найдено пользователей для миграции: ${usersToMigrate.length}`);
            for (const user of usersToMigrate) {
                const userLogin = user.account.login;
                const userProfile = user.profile;
                // Создаем новый документ Save
                const newSave = new Save({
                    login: userLogin,
                    profile: userProfile
                });
                yield newSave.save();
                console.log(`Создан документ Save для пользователя ${userLogin}`);
                // Обновляем пользователя, удаляя поле profile
                user.profile = undefined; // либо delete user.profile;
                yield user.save();
                console.log(`Поле profile удалено для пользователя ${userLogin}`);
            }
            console.log("Миграция завершена успешно.");
        }
        catch (error) {
            console.error("Ошибка миграции:", error);
        }
        finally {
            mongoose_1.default.connection.close();
        }
    });
}
migrateProfileToSave();
