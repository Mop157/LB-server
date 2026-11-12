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
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const { MongoClient } = require('mongodb');
const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
const dbName = process.env.DB_NAME || 'mygame';
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const client = new MongoClient(uri, { useUnifiedTopology: true });
        try {
            yield client.connect();
            const db = client.db(dbName);
            const coinsCol = db.collection('coins');
            const usersCol = db.collection('users');
            // 1) Получаем список login из coins.users, где users.userAgents.length > 4
            const pipeline = [
                // { $unwind: '$coins' },
                {
                    $match: {
                        $expr: { $gt: [{ $size: { $ifNull: ['$userAgents', []] } }, 4] }
                    }
                },
                { $group: { _id: null, logins: { $addToSet: '$login' } } }
            ];
            const agg = yield coinsCol.aggregate(pipeline).toArray();
            const logins = (agg[0] && agg[0].logins) ? agg[0].logins : [];
            console.log(`Найдено login'ов: ${logins.length}`);
            if (logins.length === 0) {
                console.log('Нет пользователей с userAgents.length > 4');
                return;
            }
            // 2) Для каждого login ищем документ в users по account.login
            // и выводим ник или "ник не найден".
            const checks = logins.map((login) => __awaiter(this, void 0, void 0, function* () {
                let userDoc = yield usersCol.findOne({ 'account.login': login });
                if (!userDoc) {
                    login = `${login} BAN`;
                    userDoc = yield usersCol.findOne({ 'account.login': login });
                    if (!userDoc) {
                        console.log(`${login} — ник не найден`);
                        return { login, found: false };
                    }
                }
                // пытаемся найти поле с ником (порядок приоритета: nick, nickname, username, name)
                const nickname = userDoc.account.name;
                if (nickname) {
                    console.log(`${login} -> ник: ${nickname}`);
                    return { login, found: true, nickname };
                }
                else {
                    console.log(`${login} -> найден пользователь, но поле ника отсутствует`);
                    return { login, found: true, nickname: null };
                }
            }));
            // дождёмся всех запросов (не падаем при ошибках отдельных запросов)
            const results = yield Promise.allSettled(checks);
            // можно при желании обработать rejected
            const rejected = results.filter(r => r.status === 'rejected');
            if (rejected.length) {
                console.warn(`Имеются ошибки при обработке ${rejected.length} логинов.`);
            }
        }
        catch (err) {
            console.error('Ошибка:', err);
        }
        finally {
            yield client.close();
        }
    });
}
main();
