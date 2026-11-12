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
Object.defineProperty(exports, "__esModule", { value: true });
const setting_1 = __importDefault(require("../setting/setting"));
const logger_1 = require("../logger");
const database_1 = require("../database/database"); // Предполагается, что модели User и Ban определены в models.ts
// const check = async (req: Request, res: Response, next: NextFunction) => {
//   const { code, login, version } = req.body;
//   if (!code || !login || !version || version !== setting.version) {
//     res.status(400).json({ error: "Missing token", text: "обновите апк или у вас ошибка входа в акк" });
//     return;
//   }
//   try {
//     // Проверяем, забанен ли пользователь
//     const banData = await Ban.findOne({}).lean(); // Предполагается, что в коллекции Ban хранится один документ с массивами
//     if (banData && Array.isArray(banData.login) && banData.login.includes(login)) {
//       logGeneral(login, "Игрок забанен", { ip: req.ip, userAgent: req.headers["user-agent"] });
//       res.status(401).json({ error: true, text: "вы в бане" });
//       return;
//     }
//     if (req.ip && banData && Array.isArray(banData.IP) && banData.IP.includes(req.ip)) {
//       logGeneral(login, "Игрок с ip адресом забанен", { ip: req.ip, userAgent: req.headers["user-agent"] });
//       res.status(401).json({ error: true, text: "вы в бане" });
//       return;
//     }
//     // Находим пользователя в базе
//     const user = await User.findOne({ "account.login": login }).lean();
//     if (user && user.account.token === code) {
//       next();
//     } else {
//       res.status(401).json({ error: true, text: "ошибка входа в акк" });
//     }
//   } catch {
//     res.status(401).json({ error: true, text: "ошибка входа в акк" });
//   }
// };
const check = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { code, login, version } = req.body;
    if (!code || !login || !version || version !== setting_1.default.version) {
        res.status(421).json({ error: "Missing token", text: "обновите апк или у вас ошибка входа в акк" });
        return;
    }
    try {
        const banData = yield database_1.Ban.findOne({}).lean();
        if ((Array.isArray(banData === null || banData === void 0 ? void 0 : banData.login) && banData.login.includes(login)) ||
            (req.ip && Array.isArray(banData === null || banData === void 0 ? void 0 : banData.IP) && banData.IP.includes(req.ip))) {
            (0, logger_1.logGeneral)(login, "logs", "Игрок забанен", { ip: req.ip, userAgent: req.headers["user-agent"] });
            res.status(401).json({ error: true, text: "вы в бане" });
            return;
        }
        const user = yield database_1.User.findOne({ "account.login": login });
        if (user && user.account.token === code) {
            req.body.user = user;
            next();
        }
        else {
            res.status(401).json({ error: true, text: "ошибка входа в акк" });
        }
    }
    catch (error) {
        console.error("Authentication check failed:", error);
        res.status(500).json({ error: true, text: "ошибка сервера авторизации" });
    }
});
exports.default = check;
