"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const setting = {
    //server
    port: 16261,
    // port: 16261,
    adress: "0.0.0.0",
    // version
    version: "release1.18", // проходная версия игры
    error_version_text: "тех работы", // сообщение об ошибке подключения 
    // time
    type: String(Math.floor(Date.now() / 1000)), // формат отправляемого времени (не ебу зачем)
    ischech: true, // флаг на изменения таум-аута для сообщеный и посылок (true = server / false = player)
    limitMessage: 10, // таум-аут для сообщеный, в секундах
    limitGerf: 10, // таум-аут для посылки, в секундах
    // promokod or nickname
    errorPromo: {
        error1: {
            title: "ошибка",
            text: "вы не отправили промокод или у вас не обновленый АПК"
        },
        error2: {
            title: "ошибка ника",
            text: "у вашем нике обнаружено пробел, пожалуста вместо пробела используйте '_'"
        },
        error3: {
            title: "ошибка ника",
            text: "ник уже занят, пожалуста выберите другой"
        },
        error4: {
            title: "ошибка изменения ника",
            text: "пользователям даеться только в самом начале изменить себе ник"
        },
        error5: {
            title: "ошибка сервера",
            text: "ошибка на сервере, проверте подключение"
        },
        error6: {
            title: "ошибка ника",
            text: "Ваш ник слишком длинный или слишком короткий."
        },
        error7: {
            title: "ошибка ника",
            text: "Ваш ник содержить некультурную лексику."
        }
    },
    accorPromo: {
        title: "успех",
        text: "вы успешно установили ник"
    },
    minName: 4,
    maxName: 20,
    change_nickname: true, // флан на портовного изменения ника
    // players
    halfRange: 1.5 * 21100,
    TIMEOUT: 120, // там-аут на отключение от онлайна после неактивности в секундах
    // chat
    limitemessage: 300, // лимит по елементам в сообщении от серверной стороны
    limitechatmessage: 25, // лимит на сообщении в чате
    errorchatc: {
        error1: {
            title: "Eroor",
            text: "ошибка"
        }
    },
    // запрешение предметы для посылок
    bannedItems: [
        "uaz", "chitin_hands", "chitin_boots", "chitin_legs", "chitin_head", "chitin_armor",
        "instruments_kit", "instruments_kit3", "radio", "rpg7", "f_1", "nagant", "rpk74", "svd",
        "mosin", "moto", "broken_moto", "broken_moto_fuel", "vaz2101", "gaz24", "gaz24_black",
        "uaz452", "zil130", "pk", "kamaz", "broken_kamaz", "electro_mobile", "classic_mobile",
        "nuclear_battery", "medicine999", "caps", "book_steelArms", "book_thrownArms", "book_fireArms",
        "book_explosive", "book_mechanics", "book_chemistry", "book_chemistry", "book_survival",
        "book_sewing", "book_cookery", "book_blacksmith", "broken_bardak", "broken_mi24", "broken_t72",
        "bardak_parts", "t72_parts", "mi24_parts", "mi24_ammo", "t72_ammo", "bardak", "mi24", "t72",
        "diesel", "gas", "berserk", "t34", "premium_letter", "premium_letter2", "watch_silver", "watch_gold",
        "steel_hands", "steel_boots", "steel_legs", "steel_head", "steel_armor", "wolf_lvl1", "wolf_lvl2",
        "wolf_lvl3", "wolf_lvl4", "wolf_lvl5", "wolf_lvl6", "reactor_part", "belaz", "repair_kit_weapon",
        "repair_kit_transport", "closed_coupon", "pepsicola", "aquavit", "welder", "generator", "generator_fuel",
        "christmas_gift", "christmas_gift2"
    ]
};
exports.default = setting;
