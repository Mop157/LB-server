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
const crypto_1 = __importDefault(require("crypto"));
const settingAdmin_1 = __importDefault(require("../../setting/settingAdmin"));
const setting_1 = __importDefault(require("../../setting/setting"));
const leo_profanity_1 = __importDefault(require("leo-profanity"));
const logger_1 = require("../../logger");
const database_1 = require("../../database/database"); // Импорт моделей
const path_1 = __importDefault(require("path"));
leo_profanity_1.default.loadDictionary("ru");
const listplayer = [];
function validateRequiredFields(req, res, fields) {
    for (const field of fields) {
        if (!req.body[field]) {
            res.status(400).json({ errors: `Missing parameter: ${field}` });
            return false;
        }
    }
    return true;
}
class MAIN {
    /**
     * POST /api/register_account.json Игрок забанен по айди
     * Регистрирует новый аккаунт и возвращает объект { login, name, token }.
     */
    static register_account(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { version, token } = req.body;
            if (version !== setting_1.default.version || !req.ip) {
                res.status(400).json({ error: "Invalid version or missing IP" });
                return;
            }
            const banData = yield database_1.Ban.findOne().lean();
            if (banData) {
                if ((Array.isArray(banData.ID) && banData.ID.includes(token)) || (Array.isArray(banData.IP) && banData.IP.includes(req.ip))) {
                    res.status(501).json({ error: true, text: "вы в бане по айпи" });
                    return;
                }
            }
            let login;
            let tokenP;
            while (true) {
                const randomNum = Math.floor(Math.random() * 10000000);
                login = "u" + randomNum;
                tokenP = crypto_1.default.randomBytes(16).toString("hex");
                const existing = yield database_1.User.findOne({ "account.login": login }).lean();
                if (!existing)
                    break;
            }
            const newAccount = { login, name: "null", token: tokenP, ID: token, IP: req.ip };
            const newUser = new database_1.User({ account: newAccount });
            try {
                yield newUser.save();
                yield (0, logger_1.logGeneral)(newAccount.login, "logs", `Новый пользователь: ${JSON.stringify(newAccount)}`, { ip: req.ip, userAgent: req.headers["user-agent"] });
                res.json(newAccount);
            }
            catch (err) {
                res.status(500).json({ error: "Registration failed" });
            }
        });
    }
    /**
     * POST /api/restore_account.json
     * Восстанавливает аккаунт по token, возвращая { login, name, token } или сообщение об ошибке.
     */
    static restore_account(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!validateRequiredFields(req, res, ["code", "login", "version", "tokenI"]))
                return;
            const { code, version, login, tokenI, user } = req.body;
            if (version !== setting_1.default.version || !req.ip) {
                (0, logger_1.logGeneral)(login, "warning", "Игрок с устаревшей версией игры", { ip: req.ip, userAgent: req.headers["user-agent"] });
                res.status(400).json({ error: true, text: setting_1.default.error_version_text });
                return;
            }
            try {
                // const user = await User.findOne({ "account.token": code }).lean();
                // const user = await User.findOne({ "account.token": code })
                const banData = yield database_1.Ban.findOne().lean();
                if (banData) {
                    if ((Array.isArray(banData.ID) && banData.ID.includes(tokenI))) {
                        (0, logger_1.logGeneral)(login, "ban", "Игрок забанен по айди", { ip: req.ip, userAgent: req.headers["user-agent"] });
                        res.status(401).json({ error: true, text: "вы в бане по айпи" });
                        return;
                    }
                }
                if (user.account.IP == "null" && req.ip) {
                    user.account.IP = req.ip;
                    yield user.save();
                }
                (0, logger_1.logGeneral)(user.account.login, "logs", "Успешный вход в игру", { ip: req.ip, userAgent: req.headers["user-agent"] });
                res.json({ login: user.account.login, name: user.account.name, token: user.account.token, error: false });
            }
            catch (err) {
                res.status(500).json({ error: true, text: "ошибка 500, что-то случилось" });
            }
        });
    }
    static dead(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            let userGiftDoc = yield database_1.UserGift.findOne({ taker: req.body.login });
            if (!userGiftDoc) {
                (0, logger_1.logGeneral)(req.body.login, "logs", "Игрок с 0 посылок умер", { ip: req.ip, userAgent: req.headers["user-agent"] });
                res.status(200).send("yes");
                return;
            }
            userGiftDoc.gifts = [];
            yield userGiftDoc.save();
            (0, logger_1.logGeneral)(req.body.login, "logs", "Игрок умер", { ip: req.ip, userAgent: req.headers["user-agent"] });
            res.status(200).send("yes");
        });
    }
    /**
     * POST /time.json
     * Возвращает данные времени сервера и некоторые настройки.
     */
    static time(req, res) {
        var _a;
        if (((_a = req.body) === null || _a === void 0 ? void 0 : _a.version) === setting_1.default.version) {
            try {
                if (settingAdmin_1.default.admin[req.body.login]) {
                    res.json({
                        time: setting_1.default.type,
                        iscetch: true,
                        limitMessage: 0,
                        limitGerf: 0
                    });
                    return;
                }
            }
            catch (err) {
                res.json({
                    time: setting_1.default.type,
                    iscetch: setting_1.default.ischech,
                    limitMessage: setting_1.default.limitMessage,
                    limitGerf: setting_1.default.limitGerf
                });
            }
        }
        res.json({
            time: setting_1.default.type,
            iscetch: setting_1.default.ischech,
            limitMessage: setting_1.default.limitMessage,
            limitGerf: setting_1.default.limitGerf
        });
    }
    /**
     * POST /saves/try_load.json
     * Загружает данные сохранения для пользователя (profile и пр.).
     */
    static try_load(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!validateRequiredFields(req, res, ["login"]))
                return;
            const { login } = req.body;
            if (login == "null") {
                res.send("no");
                return;
            }
            try {
                const user = yield database_1.Save.findOne({ "login": login });
                (0, logger_1.logGeneral)(login, "save_game", "Загрузил сохранение с сервера", { ip: req.ip, userAgent: req.headers["user-agent"] });
                // console.log(user?.profile)
                res.send((user && user.profile) ? user.profile : "no");
            }
            catch (err) {
                (0, logger_1.logGeneral)(login, "save_game", "Загрузил не прошла успешно!!!", { ip: req.ip, userAgent: req.headers["user-agent"] });
                res.status(500).json({ error: "Server error" });
            }
        });
    }
    /**
     * POST /enemy/...json
     * Загружает изображения.
     */
    static enemy(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const filename = req.params.filename;
            const enemyDirectory = path_1.default.resolve(__dirname, "..", "..", "..", "static", "enemy");
            const filePath = path_1.default.resolve(enemyDirectory, filename);
            if (path_1.default.dirname(filePath) !== enemyDirectory || !filename.endsWith(".png")) {
                res.status(404).send("File not found");
                return;
            }
            res.sendFile(filePath, (error) => {
                if (error && !res.headersSent)
                    res.status(404).send("File not found");
            });
        });
    }
    /**
     * POST /newname
     * Изменяет ник пользователя.
     */
    static newname(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!validateRequiredFields(req, res, ["login", "name", "version", "Player_name"]))
                return;
            const { login, name, version, Player_name, user } = req.body;
            if (version !== setting_1.default.version || login === "null") {
                (0, logger_1.logGeneral)(login, "warning", "старая версия игры", { ip: req.ip, userAgent: req.headers["user-agent"] });
                res.json({ error: "not", text: setting_1.default.errorPromo.error1.text, title: setting_1.default.errorPromo.error1.title });
                return;
            }
            try {
                const command = name.split(" ");
                if (command[1]) {
                    (0, logger_1.logGeneral)(login, "logs", "пробел в нике", { ip: req.ip, userAgent: req.headers["user-agent"] });
                    res.json({ error: "not", text: setting_1.default.errorPromo.error2.text, title: setting_1.default.errorPromo.error2.title });
                    return;
                }
                if (Player_name === "null" || setting_1.default.change_nickname) {
                    if (command[0].length < setting_1.default.minName || command[0].length > setting_1.default.maxName) {
                        (0, logger_1.logGeneral)(login, "logs", "менше, больше нужнего лимита", { ip: req.ip, userAgent: req.headers["user-agent"] });
                        res.json({ error: "not", text: setting_1.default.errorPromo.error6.text, title: setting_1.default.errorPromo.error6.title });
                        return;
                    }
                    const existingUser = yield database_1.User.findOne({ "account.name": command[0].toLowerCase() });
                    if (existingUser) {
                        (0, logger_1.logGeneral)(login, "logs", "старый ник не найден", { ip: req.ip, userAgent: req.headers["user-agent"] });
                        res.json({ error: "not", text: setting_1.default.errorPromo.error3.text, title: setting_1.default.errorPromo.error3.title });
                        return;
                    }
                    if (leo_profanity_1.default.check(command[0].toLowerCase())) {
                        (0, logger_1.logGeneral)(login, "warning", "проверка на маты не прошла", { ip: req.ip, userAgent: req.headers["user-agent"] });
                        res.json({ error: "not", text: setting_1.default.errorPromo.error7.text, title: setting_1.default.errorPromo.error7.title });
                        return;
                    }
                    if (!user) {
                        (0, logger_1.logGeneral)(login, "logs", "игрок не найден", { ip: req.ip, userAgent: req.headers["user-agent"] });
                        res.json({ error: "not", text: "User not found", title: "Error" });
                        return;
                    }
                    user.account.name = command[0].toLowerCase();
                    yield user.save();
                    (0, logger_1.logGeneral)(login, "name", `Пользователь установил ник: ${command[0].toLowerCase()}`, { ip: req.ip, userAgent: req.headers["user-agent"] });
                    res.json({ error: "yes", text: `${setting_1.default.accorPromo.text}\n${command[0].toLowerCase()}\nваш токен:\n${user.account.token}\nваш логин:\n${user.account.login}`, title: setting_1.default.accorPromo.title });
                }
                else {
                    (0, logger_1.logGeneral)(login, "logs", "игрок попытался еще раз изменить себе ник", { ip: req.ip, userAgent: req.headers["user-agent"] });
                    res.json({ error: "not", text: setting_1.default.errorPromo.error4.text, title: setting_1.default.errorPromo.error4.title });
                }
            }
            catch (_a) {
                (0, logger_1.logGeneral)(login, "logs", "ошибка в смене ника", { ip: req.ip, userAgent: req.headers["user-agent"] });
                res.json({ error: "not", text: setting_1.default.errorPromo.error5.text, title: setting_1.default.errorPromo.error5.title });
            }
        });
    }
    /**
     * POST /saves/try_save.json
     * Сохраняет данные (profile) пользователя.
     */
    static try_save(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!validateRequiredFields(req, res, ["login", "save"]))
                return;
            const { login, save: saveDataStr, options } = req.body;
            if (login === "null") {
                res.send("no");
                return;
            }
            try {
                // Пытаемся найти существующий документ
                let user = yield database_1.Save.findOne({ login });
                if (!user) {
                    // Если нет — создаём новый
                    user = new database_1.Save({
                        login,
                        profile: saveDataStr,
                    });
                    yield user.save();
                    (0, logger_1.logGeneral)(login, "save_game", "Создан новый профиль и сохранён", { ip: req.ip, userAgent: req.headers["user-agent"], option: options });
                    res.send("ok");
                    return;
                }
                // Если есть — обновляем
                user.profile = saveDataStr;
                yield user.save();
                (0, logger_1.logGeneral)(login, "save_game", "Обновление сохранения профиля", { ip: req.ip, userAgent: req.headers["user-agent"], option: options });
                res.send("ok");
            }
            catch (error) {
                console.error("Save error:", error);
                (0, logger_1.logGeneral)(login, "save_game", "Ошибка сохранения профиля", { ip: req.ip, userAgent: req.headers["user-agent"], option: options });
                res.send("error");
            }
        });
    }
    /**
     * POST /try_use_promocode.json
     * Обрабатывает использование промокода и возвращает результат (набор действий или error).
     */
    static try_use_promocode(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!validateRequiredFields(req, res, ["codep", "login", "name", "version"]))
                return;
            const { codep, login, name, version, user } = req.body;
            if (version !== setting_1.default.version) {
                (0, logger_1.logGeneral)(login, "warning", "Пользователь с неподходящей версией игры", { ip: req.ip, userAgent: req.headers["user-agent"] });
                res.json({ error: true, text: setting_1.default.errorPromo.error1.text, title: setting_1.default.errorPromo.error1.title });
                return;
            }
            try {
                const command = codep.split(" ");
                if (command[2]) {
                    (0, logger_1.logGeneral)(login, "logs", "Ошибка: пробел в промокоде для смены ника", { ip: req.ip, userAgent: req.headers["user-agent"] });
                    res.json({ error: true, text: setting_1.default.errorPromo.error2.text, title: setting_1.default.errorPromo.error2.title });
                    return;
                }
                if (command[0] === "/name") {
                    if (name === "null" || setting_1.default.change_nickname) {
                        if (command[1].length < setting_1.default.minName || command[1].length > setting_1.default.maxName) {
                            (0, logger_1.logGeneral)(login, "logs", "Ник имеет недопустимую длину", { ip: req.ip, userAgent: req.headers["user-agent"] });
                            res.json({ error: "not", text: setting_1.default.errorPromo.error6.text, title: setting_1.default.errorPromo.error6.title });
                            return;
                        }
                        const existingUser = yield database_1.User.findOne({ "account.login": command[1].toLowerCase() }).lean();
                        if (existingUser) {
                            (0, logger_1.logGeneral)(login, "warning", `Попытка установки уже существующего ника: ${command[1]}`, { ip: req.ip, userAgent: req.headers["user-agent"] });
                            res.json({ error: "not", text: setting_1.default.errorPromo.error3.text, title: setting_1.default.errorPromo.error3.title });
                            return;
                        }
                        if (leo_profanity_1.default.check(command[1].toLowerCase())) {
                            (0, logger_1.logGeneral)(login, "warning", `Попытка установки недопустимого ника: ${command[1]}`, { ip: req.ip, userAgent: req.headers["user-agent"] });
                            res.json({ error: "not", text: setting_1.default.errorPromo.error7.text, title: setting_1.default.errorPromo.error7.title });
                            return;
                        }
                        if (!user) {
                            res.json({ error: "not", text: "Пользователя нету", title: "Error" });
                            return;
                        }
                        if (user.account.newname) {
                            res.json({ error: "not", text: "вы уже использовали возможность измненения ника, ждите следующей возможности", title: "Error" });
                            return;
                        }
                        // Сохраним старый ник для обновления приватного чата
                        const oldNickname = user.account.name.toLowerCase();
                        // Обновляем ник в документе пользователя
                        user.account.name = command[1].toLowerCase();
                        user.account.newname = true;
                        yield user.save();
                        (0, logger_1.logGeneral)(login, "name", `пользователь: ${name}, поставил себе ник ${command[1].toLowerCase()}`, { ip: req.ip, userAgent: req.headers["user-agent"], oldname: name, newname: command[1].toLowerCase() });
                        // Обновляем приватный чат (channel "3"):
                        let privateChatDoc = yield database_1.ChatMessage.findOne({ channel: "3" });
                        if (privateChatDoc && privateChatDoc.messages) {
                            // Приводим messages к типу any для индексирования
                            const messagesObj = privateChatDoc.messages;
                            // Если существует ключ, соответствующий старому нику, переименуем его
                            if (messagesObj[oldNickname]) {
                                messagesObj[command[1].toLowerCase()] = messagesObj[oldNickname];
                                delete messagesObj[oldNickname];
                                privateChatDoc.markModified("messages");
                                yield privateChatDoc.save();
                            }
                        }
                        yield database_1.ActiveCommand.findOneAndUpdate({ login: user.account.login }, { command: { id: "editname", name: command[1].toLowerCase() } }, { upsert: true, new: true });
                        res.json({ error: "not", text: `Вы успешно обновили себе ник на: ${user.account.name}`, title: setting_1.default.accorPromo.title });
                    }
                    else {
                        (0, logger_1.logGeneral)(login, "logs", `Попытка смены ника недопустимым способом: ${command[1]}`, { ip: req.ip, userAgent: req.headers["user-agent"] });
                        res.json({ error: "not", text: setting_1.default.errorPromo.error4.text, title: setting_1.default.errorPromo.error4.title });
                    }
                }
                else if (command[0] === "/token") {
                    // res.json({ error: true, text: "команда выключена", title: "ERROR"})
                    let user = yield database_1.User.findOne({ "account.login": login });
                    if (!user) {
                        res.json({ error: true, text: "Пожалуста зарегиструйтесь или войдите в онлайн", title: "Error" });
                        return;
                    }
                    res.json({ error: "yes", text: `Ваш логин:\n${user.account.login}\n\nВаш токен:\n${user.account.token}`, title: setting_1.default.accorPromo.title });
                }
                else {
                    // Обработка промокода, не начинающегося с "/name"
                    const serverEvent = yield database_1.ServerEvent.findOne({ "promo.is": true });
                    if (serverEvent && serverEvent.promo && serverEvent.promo.list) {
                        const promoList = serverEvent.promo.list;
                        for (const id in promoList) {
                            if (promoList[id].text === codep) {
                                console.log(serverEvent.promo.listplayer.includes(login));
                                if (promoList[id].count > 0 && !serverEvent.promo.listplayer.includes(login) && login !== "null") {
                                    console.log(122222222222222222222222222222222222222222222222222222222222222222222222222222222);
                                    serverEvent.promo.listplayer.push(login);
                                    serverEvent.promo.list[id].count -= 1;
                                    serverEvent.markModified('promo.list');
                                    serverEvent.markModified('promo.listplayer');
                                    // serverEvent.markModified('promo.listplayer');
                                    yield serverEvent.save();
                                    (0, logger_1.logGeneral)(login, "logs", `Пользователь использовал промокод: ${codep}`, { ip: req.ip, userAgent: req.headers["user-agent"] });
                                    res.json({ error: false, item: promoList[id].items });
                                    return;
                                }
                                else {
                                    (0, logger_1.logGeneral)(login, "logs", `Пользователь использовал промокод: ${codep}, но промокод исчерпан`, { ip: req.ip, userAgent: req.headers["user-agent"] });
                                    res.json({ error: "no" });
                                    return;
                                }
                            }
                        }
                        (0, logger_1.logGeneral)(login, "logs", `Пользователь ввел несуществующий промокод: ${codep}`, { ip: req.ip, userAgent: req.headers["user-agent"] });
                        res.json({ error: "no" });
                    }
                    else {
                        // if (serverEvent) {
                        //   // if (serverEvent.promo.listplayer.length > 0) {
                        //   //   serverEvent.promo.listplayer = []
                        //   //   await serverEvent.save();
                        //   // }
                        // }
                        (0, logger_1.logGeneral)(login, "logs", `Пользователь ввел промокод: ${codep}, но промо-событие не активно`, { ip: req.ip, userAgent: req.headers["user-agent"] });
                        res.json({ error: "no" });
                    }
                }
            }
            catch (_a) {
                (0, logger_1.logGeneral)(login, "logs", `Ошибка при использовании промокода: ${codep}`, { ip: req.ip, userAgent: req.headers["user-agent"] });
                res.json({ error: true, text: setting_1.default.errorPromo.error5.text, title: setting_1.default.errorPromo.error5.title });
            }
        });
    }
}
exports.default = MAIN;
