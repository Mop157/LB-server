// import { Request, Response } from "express";
// import data from "../../database/database";
// import settingAdmin from "../../setting/settingAdmin";
// import setting from "../../setting/setting";
// import leoProfanity from 'leo-profanity';
// import {helps} from "../../setting/textHelp";
// import { logGeneral, logCommands, logPlayerInteraction, getPlayerLogDir } from "../../logger"
// import fs from "fs";
// import path from "path";

// leoProfanity.loadDictionary('ru');
// const bannedItems = setting.bannedItems;
// let listtime: string[] = [];

// interface Player {
//     power: string;
//     login: string;
//     name: string;
//     position: string;
//     caps: string;
//     version: string;
//     language: string;
//     code: string;
//     slot: string;
//     lastUpdate: number;
//   }

// interface Position {
//     x: number;
//     y: number;
//   }

// function getLastLinesFromFile(filePath: string, numLines: number): string[] {
//     try {
//       if (!fs.existsSync(filePath)) return [];
//       const content = fs.readFileSync(filePath, "utf8");
//       const lines = content.trim().split("\n");
//       return lines.slice(-numLines);
//     } catch (error) {
//       return [];
//     }
//   }
  

// function validatePlayerData(data: any): { valid: boolean; error?: string } {
//     if (typeof data.login !== "string" || !data.login.trim()) {
//       return { valid: false, error: "неправильный логин" };
//     }
//     if (typeof data.name !== "string" || !data.name.trim()) {
//       return { valid: false, error: "неправильный ник" };
//     }
//     try {
//       const pos = JSON.parse(data.position);
//       if (typeof pos.x !== "number" || typeof pos.y !== "number") {
//         return { valid: false, error: "неправильный формат кординат" };
//       }
//     } catch (e) {
//       return { valid: false, error: "неправильный формат кординат" };
//     }
//     const power = Number(data.power);
//     const caps = Number(data.caps);
//     if (isNaN(power) || power < 0) {
//       return { valid: false, error: "неправильный формат урона" };
//     }
//     if (isNaN(caps) || caps < 0) {
//       return { valid: false, error: "неправильный формат валюти" };
//     }
//     return { valid: true };
//   }

// function validateRequiredFields(req: Request, res: Response, fields: string[]): boolean {
//   for (const field of fields) {
//     if (!req.body[field]) {
//       res.status(400).json({ error: field });
//       return false;
//     }
//   }
//   return true;
// }

// function respondWithError(res: Response, status: number, text: string | undefined, title: string | undefined) {
//   res.status(status).json({ error: true, text, title });
// }

// function getNearbyPlayers(login: string, currentPlayer: any, players: any[]): any[] {
//   const halfRange = setting.halfRange
//   let currentPos: Position;
//   try {
//     currentPos = JSON.parse(currentPlayer.position);
//   } catch (error) {
//     logGeneral(login, `Ошибка парсинга позиции текущего игрока: ${error}`);
//     return players;
//   }
//   return players.filter((player) => {
//     if (player.login === currentPlayer.login) return false;
//     try {
//       const pos = JSON.parse(player.position);
//       return Math.abs(pos.x - currentPos.x) <= halfRange && Math.abs(pos.y - currentPos.y) <= halfRange;
//     } catch (e) {
//       return false;
//     }
//   });
// }

// export default class ONLINE {
  /**
   * POST /try_load_players.json
   * Обновляет или добавляет игрока и возвращает список активных игроков.
   */
//   static async try_load_players(req: Request, res: Response): Promise<void> {
    
//     const requiredFields = ["login", "name", "position", "power", "caps", "version", "language", "code", "slot"];
//     if (!validateRequiredFields(req, res, requiredFields)) return;

//     const validation = validatePlayerData(req.body);
//     if (!validation.valid) {
//         logGeneral(req.body.login, `пользователь непрошел проверку данных`, { ip: req.ip, userAgent: req.headers["user-agent"] });
//         res.status(400).json({ error: validation.error });
//     return;
//     }

//     const { login, name, position, power, caps, version, language, code, slot } = req.body;

//     if ((Number(caps) > 100000 || Number(power) > 100000) && !settingAdmin.admin[login]) {
//       data.ban.login.push(login);
//       if (req.ip) data.ban.IP.push(req.ip);
//       data.ban.ID.push(data.users[login].account.ID);
//       data.saveData("ban.json", data.ban);
//     }

//     const currentTime = Math.floor(Date.now() / 1000);
//     let player = data.players.find((p) => p.login === login);
//     if (player) {
//       Object.assign(player, { name, position, power, caps, version, language, code, slot, lastUpdate: currentTime });
//     } else {
//       player = { login, name, position, power, caps, version, language, code, slot, lastUpdate: currentTime };
//       data.players.push(player);
//     }
//     data.saveData("players.json", data.players);

//     const TIMEOUT = setting.TIMEOUT;
//     const safePlayers = data.players.filter(
//       (p) => p.lastUpdate && currentTime - p.lastUpdate <= TIMEOUT && p.login !== login
//     );
//     if (settingAdmin.admin[login]?.bot) {
//       const playerlist = data.players.map((p) =>
//         p.login === login ? { ...p, power: "0" } : p
//       );
//     //   logGeneral(login, `админ с включеним ботом`, { ip: req.ip, userAgent: req.headers["user-agent"] });
//       res.json({ playerlist });
//       return;
//     }
//     if (settingAdmin.userbot[login]?.bot) {
//         const playerlist = data.players.reduce((acc: Player[], p: Player) => {
//             if (p.lastUpdate && currentTime - p.lastUpdate <= TIMEOUT) {
//               if (p.login === login) {
//                 acc.push({ ...p, power: "0" });
//               } else {
//                 acc.push(p);
//               }
//             }
//             return acc;
//           }, [] as Player[]);
//         res.json({ playerlist });
//         return;
//       }

//     if (settingAdmin.comandsActive[login]) {
//       const command = settingAdmin.comandsActive[login];
//       const responsePayload: any = { warning: true, message: false, promo: true };
//       if (command.id === "caps") {
//         responsePayload.giftItems = [["caps", command.count || 1, 0]];
//       } else if (command.id === "editname") {
//         responsePayload.giftItems = [[command.id, command.name || "", 0, command.count || 1]];
//       } else {
//         responsePayload.giftItems = [[command.id, command.name || ""]];
//       }
//       delete settingAdmin.comandsActive[login];
//       logGeneral(login, `команда для игрока: ${login}, команда: ${responsePayload}`, { ip: req.ip, userAgent: req.headers["user-agent"] });
//       logCommands(login, `команда для игрока: ${login}, команда: ${responsePayload}`, { ip: req.ip, userAgent: req.headers["user-agent"] })
//       res.json(responsePayload);
//       return;
//     }

//     const eventsCheck = await data.checkAndSendFiles();
//     if (eventsCheck) {
//       const events = eventsCheck["./data/serverEvent.json"];
//       if (listtime.includes(login) && events.isEvent) {
//         // logGeneral(login, `загрузка игроков`, { ip: req.ip, userAgent: req.headers["user-agent"] });
//         const nearbyPlayers = getNearbyPlayers(login, player, safePlayers);
//         res.json({ playerlist: nearbyPlayers, playercount: safePlayers.length + 1 });
//         return;
//       } else if (events.isEvent) {
//         if (events.message.is && (events.message.players.includes(login) || events.message.playerAll)) {
//           if (events.message.players.includes(login)) {
//             events.message.players = events.message.players.filter((p: string) => p !== login);
//             data.saveData("serverEvent.json", events)
//           }
//           if (events.message.playerAll) listtime.push(login);
//           logGeneral(login, `пользователю отправилось сообщение: ${events.message.title, events.message.text}`, { ip: req.ip, userAgent: req.headers["user-agent"] });
//           res.json({ custom: false, warning: true, message: true, title: events.message.title, text: events.message.text });
//           return;
//         } else if (events.item.is && (events.item.players.includes(login) || events.item.playerAll)) {
//             if (events.item.players.includes(login)) {
//                 events.item.players = events.item.players.filter((p: string) => p !== login);
//                 data.saveData("serverEvent.json", events)
//               }
//             if (events.item.playerAll) listtime.push(login);
//             logGeneral(login, `пользователю отправился предмет: ${events.item.items}`, { ip: req.ip, userAgent: req.headers["user-agent"] });
//             res.json({ custom: false, warning: true, message: false, promo: false, giftItems: events.item.items });
//             return;
//         } else if (events.itemGive.is && (events.itemGive.players.includes(login) || events.itemGive.playerAll)) {
//           if (events.itemGive.players.includes(login)) {
//                 events.itemGive.players = events.itemGive.players.filter((p: string) => p !== login);
//                 data.saveData("serverEvent.json", events)
//           }
//           if (events.itemGive.playerAll) listtime.push(login);
//           logGeneral(login, `пользователю отправилось собитые от сервера: ${events.itemGive.items}`, { ip: req.ip, userAgent: req.headers["user-agent"] });
//           res.json({ custom: false, warning: true, message: false, promo: true, giftItems: events.itemGive.items });
//           return;
//         } else if (events.customEvent.is && (events.customEvent.players.includes(login) || events.customEvent.playerAll)) {
//           if (events.customEvent.players.includes(login)) {
//                 events.customEvent.players = events.customEvent.players.filter((p: string) => p !== login);
//                 data.saveData("serverEvent.json", events)
//           }
//           if (events.customEvent.playerAll) listtime.push(login);
//           logGeneral(login, `пользователю отправился собитые от сервера (интерфейс): ${events.customEvent.event}`, { ip: req.ip, userAgent: req.headers["user-agent"] });
//           res.json({ custom: true, id: events.customEvent.id, event: events.customEvent.event });
//           return;
//         }
//       }
//     }
  
//     listtime = [];
//     const nearbyPlayers = getNearbyPlayers(login, player, safePlayers);
//     // logGeneral(login, `загрузка игроков`, { ip: req.ip, userAgent: req.headers["user-agent"] });
//     res.json({ playerlist: nearbyPlayers, playercount: safePlayers.length + 1 });
//   }

//   /**
//    * POST /chat/load_message.json
//    * Загружает сообщения чата с учетом публичных и приватных каналов.
//    */
//   static load_message(req: Request, res: Response): void {
//     if (!validateRequiredFields(req, res, ["name", "login"])) return;
//     const { name, login, test } = req.body;

//     if (test == "true") {
//       data.ban.login.push(login);
//       data.saveData("ban.json", data.ban);
//     }

//     const resultChat: { [channel: string]: any[] } = {};

//     ["1", "2", "4"].forEach((ch) => {
//       resultChat[ch] = data.chatMessages[ch]
//         ? data.chatMessages[ch].slice(0, setting.limitechatmessage)
//         : [];
//     });

//     if (data.mute.includes(login)) {
//       logGeneral(login, `игрок в муте`, { ip: req.ip, userAgent: req.headers["user-agent"] });
//       res.json({ chat: resultChat, time: Date.now(), mute: true, old_version: false });
//       return;
//     }

//     resultChat["3"] = (data.chatMessages["3"] && data.chatMessages["3"][name.toLowerCase()]) || [];
//     // logGeneral(login, `загрузка чата`, { ip: req.ip, userAgent: req.headers["user-agent"] });
//     res.json({ chat: resultChat, time: Date.now(), mute: false, old_version: false });
//   }

//   /**
//    * POST /chat/save_message.json
//    * Сохраняет сообщение в указанном канале.
//    */
//   static save_message(req: Request, res: Response): void {
//     const { login, name, message, channel } = req.body;
//     if (!message || !channel || message.length > setting.limitemessage) {
//       logGeneral(login, `ошибка в чате игрока (отсуствые параметров или перевышение лимита севрера на отправку сообщеный)`, { ip: req.ip, userAgent: req.headers["user-agent"] });
//       res.json({
//         error: true,
//         text: setting.errorchatc.error1.text,
//         title: setting.errorchatc.error1.title,
//       });
//       return;
//     }

//     let message_valid;

//     if (message.includes("\r\r") || message.includes("\n\n") || message.includes("         ")) {
//       logGeneral(login, `мут за попытку навредить чату`, { ip: req.ip, userAgent: req.headers["user-agent"] });
//       data.mute.push(login);
//       data.saveData("mute.json", data.mute);
//       return;
//     } else if (/(\r\n|\r|\n)/.test(message)) {
//       logGeneral(login, `подозрительное сообщеные, содержить \ n`, { ip: req.ip, userAgent: req.headers["user-agent"] });
//       message_valid = message.replace(/(\r\n|\r|\n)/g, ',');
      
//     } else {
//       message_valid = message
//     }

//     if (leoProfanity.check(message_valid)) {
//         logGeneral(login, `пользователь отправил плохое слово: ${message_valid}`, { ip: req.ip, userAgent: req.headers["user-agent"] });
//         res.json({
//             error: true,
//             text: "Уважаемый пользователь,\nПожалуйста, не используйте нецензурную лексику в чате. Последующие проявления неэтичности с вашей стороны будут наказуемы.\n\nС уважением, администрация сервера",
//             title: "Администрация"
//           });
//           return;
//       }

//     if (channel === "3") {
//       const privateRegex = /\/to\s+(\S+)\s+\/m\s+(.+)/i;
//       const match = message_valid.match(privateRegex);
//       if (!match) {
//         res.status(400).json({ error: true, text: "В вашем сообщении ошибка", title: "Error" });
//         return;
//       }
//       const target = match[1].trim().toLowerCase();
//       if (!data.chatMessages["3"]) data.chatMessages["3"] = {};
//       if (!data.chatMessages["3"][target]) data.chatMessages["3"][target] = [];
//       if (!data.chatMessages["3"][name.toLowerCase()]) data.chatMessages["3"][name.toLowerCase()] = [];

//       const privateMsg = { name, text: message_valid };
//       data.chatMessages["3"][target].unshift(privateMsg);
//       data.chatMessages["3"][name.toLowerCase()].unshift(privateMsg);
//       data.saveData("chatMessages.json", data.chatMessages);
//       logPlayerInteraction(login, `пользователь отправил сообщение, пользователю: ${target}, сообщение: ${message_valid}`, { ip: req.ip, userAgent: req.headers["user-agent"] });
//       logGeneral(login, `пользователь успешно отправил сообщеные в личку: ${message_valid}`, { ip: req.ip, userAgent: req.headers["user-agent"] });
//       res.json({ status: "ok", error: false });
//       return;
//     }

//     if (data.chatMessages[channel] && data.chatMessages[channel].length >= 2) {
//       const recentMessages = data.chatMessages[channel].slice(0, 2);
//       const allSame = recentMessages.every((msg: { name: string; text: string }) => msg.name === name && msg.text === message_valid);
//       if (allSame) {
//         data.mute.push(login);
//         data.saveData("mute.json", data.mute);
//         logGeneral(login, `Спам: попытка отправить 3 одинаковых сообщения подряд: ${message_valid}`, { ip: req.ip, userAgent: req.headers["user-agent"] });
//         res.json({ error: true, text: "Спам: нельзя отправлять 3 одинаковых сообщения подряд", title: "Спам" });
//         return;
//       }
//     }

//     if (message_valid.startsWith(settingAdmin.aktivitecomand) && settingAdmin.admin[login]) {
//         logGeneral(login, `админ использовал команду: ${message_valid}`, { ip: req.ip, userAgent: req.headers["user-agent"] });
//         ONLINE.processAdminCommand(message_valid, login, res);
//         return;
//       }

//     if (!data.chatMessages[channel]) {
//       data.chatMessages[channel] = [];
//     }
//     if (settingAdmin.admin[login]?.name) {
//       data.chatMessages[channel].unshift({ name: data.users[login].account.name || name, text: message_valid, color: [ 0.5, 0.5, 1 ] });
//     } else {
//       data.chatMessages[channel].unshift({ name: data.users[login].account.name || name, text: message_valid });
//     }
//     data.saveData("chatMessages.json", data.chatMessages);
//     logGeneral(login, `пользователь успешно отправил сообщеные: ${message_valid}`, { ip: req.ip, userAgent: req.headers["user-agent"] });
//     res.json({ status: "ok" });
//   }

//   /**
//    * Вспомогательный метод для обработки команд администратора.
//    */
//   private static processAdminCommand(message: string, login: string, res: Response): void {
//     const command = message.split(" ");
//     const cmd = command[0];

//     switch (cmd) {
//         case settingAdmin.comands.comand0.name:
//           logCommands(login, `команда: ${cmd}, успешно выполнена`)
//           if (command[0]) {
//             if (helps[command[1]]) {
//                 respondWithError(res, 200, helps[command[1]], command[1]);
//             } else {
//                 respondWithError(res, 200, settingAdmin.comands.comand0.text, settingAdmin.comands.comand0.title);
//             }
//           } else {
//             respondWithError(res, 200, settingAdmin.comands.comand0.text, settingAdmin.comands.comand0.title);
//           }
//           return;
//         case settingAdmin.comands.comand1.name:
//           if (settingAdmin.admin[login]?.bot) {
//             settingAdmin.admin[login].bot = true;
//           } else {
//             settingAdmin.userbot[login].bot = true;
//           }
//           logCommands(login, `команда: ${cmd}, успешно выполнена`)
//           respondWithError(res, 200, settingAdmin.comands.comand1.text, settingAdmin.comands.comand1.title);
//           return;
//         case settingAdmin.comands.comand2.name:
//             if (settingAdmin.admin[login]?.bot) {
//                 settingAdmin.admin[login].bot = false;
//             } else {
//                 settingAdmin.userbot[login].bot = false;
//             }
//           logCommands(login, `команда: ${cmd}, успешно выполнена`)
//           respondWithError(res, 200, settingAdmin.comands.comand2.text, settingAdmin.comands.comand2.title);
//           return;
//         case settingAdmin.comands.comand3.name:
//           if (command[1]) {
//             for (const key in data.users) {
//               if (data.users[key]?.account?.name === command[1]) {
//                 data.ban.login.push(data.users[key].account.login);
//                 data.saveData("ban.json", data.ban);
//                 const channels = ["1", "2", "4"];
//                 channels.forEach((channel) => {
//                   if (data.chatMessages[channel]) {
//                     data.chatMessages[channel] = data.chatMessages[channel].filter((msg: { name: string; text: string }) => msg.name !== data.users[key].account.name);
//                   }
//                 });
                
//                 data.saveData("chatMessages.json", data.chatMessages);
//                 for (const recipient in data.userGifts) {
//                   if (data.userGifts.hasOwnProperty(recipient)) {
                   
//                     data.userGifts[recipient] = data.userGifts[recipient].filter((gift: { sender: string }) => gift.sender !== data.users[key].account.login);
//                   }
//                 }
                
//                 data.saveData("userGifts.json", data.userGifts);
//                 logCommands(login, `команда: ${cmd}, успешно выполнена`)
//                 respondWithError(
//                   res,
//                   200,
//                   settingAdmin.comands.comand3.text,
//                   `${settingAdmin.comands.comand3.title} ${data.users[key].account.name}`
//                 );
//                 return;
//               }
//             }
//             logCommands(login, `команду: ${cmd}, неудалось выполнить по причине: ${settingAdmin.comands.comand3.errortext1}`)
//             respondWithError(res, 200, settingAdmin.comands.comand3.errortext1, settingAdmin.comands.comand3.errortitle1);
//           } else {
//             logCommands(login, `команду: ${cmd}, неудалось выполнить по причине: ${settingAdmin.comands.comand3.errortext2}`)
//             respondWithError(res, 200, settingAdmin.comands.comand3.errortext2, settingAdmin.comands.comand3.errortitle2);
//           }
//           break;
//         case settingAdmin.comands.comand4.name:
//           if (command[1]) {
//             for (const key in data.users) {
//               if (data.users[key]?.account?.name === command[1]) {
//                 const filteredBansL = data.ban.login.filter(player => player !== data.users[key].account.login);
      
//                 if (filteredBansL.length === data.ban.login.length) {
//                   logCommands(login, `команду: ${cmd}, неудалось выполнить по причине: ${settingAdmin.comands.comand4.errortext1}`)
//                   respondWithError(res, 200, settingAdmin.comands.comand4.errortext1, settingAdmin.comands.comand4.errortitle1);
//                   return;
//                 }
//                 data.ban.login = filteredBansL;
                
//                 data.saveData("ban.json", data.ban);
//                 logCommands(login, `команда: ${cmd}, успешно выполнена`)
//                 respondWithError(
//                   res,
//                   200,
//                   settingAdmin.comands.comand4.text,
//                   `${settingAdmin.comands.comand4.title} ${data.users[key].account.name}`
//                 );
//                 return;
//               }
//             }
//             logCommands(login, `команду: ${cmd}, неудалось выполнить по причине: ${settingAdmin.comands.comand4.errortext1}`)
//             respondWithError(res, 200, settingAdmin.comands.comand4.errortext1, settingAdmin.comands.comand4.errortitle1);
//           } else {
//             logCommands(login, `команду: ${cmd}, неудалось выполнить по причине: ${settingAdmin.comands.comand4.errortext2}`)
//             respondWithError(res, 200, settingAdmin.comands.comand4.errortext2, settingAdmin.comands.comand4.errortitle2);
//           }
//           break;
//         case settingAdmin.comands.comand5.name:
//               if (!command[1]) {
//                 respondWithError(res, 200, "Missing parameter", "Error");
//                 return;
//               }
            
//               const subParam = command[1].toLowerCase();
            
//               if (subParam === "gift") {
//                 // Формат: /info gift <playerName>
//                 if (!command[2]) {
//                   respondWithError(res, 200, "Missing player name for gift logs", "Error");
//                   return;
//                 }
//                 // Ищем логин игрока по имени (с приведением к нижнему регистру)
//                 let targetLogin: string | null = null;
//                 for (const key in data.users) {
//                   if (data.users[key]?.account?.name === command[2].toLowerCase()) {
//                     targetLogin = data.users[key].account.login;
//                     break;
//                   }
//                 }
//                 console.log(targetLogin)
//                 if (!targetLogin) {
//                   respondWithError(res, 200, "Player not found", "Error");
//                   return;
//                 }
//                 const playerDir = getPlayerLogDir(targetLogin);

//                 // Файл с логами взаимодействий называется "player.txt"
//                 const playerLogFile = path.join(playerDir, "player.txt");
//                 const lastLines = getLastLinesFromFile(playerLogFile, 30);
//                 console.log(lastLines)
//                 respondWithError(
//                     res,
//                     200,
//                     `${lastLines}`,
//                     `${settingAdmin.comands.comand5.title} ${data.users[targetLogin].account.name}`
//                   );
//                 // res.json({ title: , logs: lastLines });
//                 return;
//               } else if (subParam === "logs") {
//                 // Формат: /info logs <playerName>
//                 if (!command[2]) {
//                   respondWithError(res, 200, "Missing player name for logs", "Error");
//                   return;
//                 }
//                 let targetLogin: string | null = null;
//                 for (const key in data.users) {
//                   if (data.users[key]?.account?.name === command[2].toLowerCase()) {
//                     targetLogin = data.users[key].account.login;
//                     break;
//                   }
//                 }
//                 if (!targetLogin) {
//                   respondWithError(res, 200, "Player not found", "Error");
//                   return;
//                 }
//                 const playerDir = getPlayerLogDir(targetLogin);
//                 // Файл с общими логами теперь называется "logs.txt"
//                 const logsFile = path.join(playerDir, "log.txt");
//                 const lastLines = getLastLinesFromFile(logsFile, 30);
//                 respondWithError(
//                     res,
//                     200,
//                     `${lastLines}`,
//                     `${settingAdmin.comands.comand5.title} ${data.users[targetLogin].account.name}`
//                   );
//                 // res.json({ error: false, logs: lastLines });
//                 return;
//               } else {
//                 // Если подкоманда не указана, считаем, что передан просто player name для вывода профиля
//                 let found = false;
//                 for (const key in data.users) {
//                   if (data.users[key]?.account?.name === command[1].toLowerCase()) {
//                     // Здесь, как и ранее, возвращаем профиль игрока
//                     respondWithError(
//                       res,
//                       200,
//                       `${data.users[key].profile}`,
//                       `${settingAdmin.comands.comand5.title} ${data.users[key].account.name}`
//                     );
//                     found = true;
//                     break;
//                   }
//                 }
//                 if (!found) {
//                   respondWithError(
//                     res,
//                     200,
//                     settingAdmin.comands.comand5.errortext1,
//                     settingAdmin.comands.comand5.errortitle1
//                   );
//                 }
//                 return;
//             }

//         case settingAdmin.comands.comand6.name:
//           if (command[1]) {
//             for (const key in data.users) {
//               if (data.users[key]?.account?.name === command[1]) {
//                 data.mute.push(data.users[key].account.login);
//                 data.saveData("mute.json", data.mute);
//                 logCommands(login, `команда: ${cmd}, успешно выполнена`)
//                 respondWithError(
//                   res,
//                   200,
//                   settingAdmin.comands.comand6.text,
//                   `${settingAdmin.comands.comand6.title} ${data.users[key].account.name}`
//                 );
//                 return;
//               }
//             }
//             logCommands(login, `команду: ${cmd}, неудалось выполнить по причине: ${settingAdmin.comands.comand6.errortext1}`)
//             respondWithError(res, 200, settingAdmin.comands.comand6.errortext1, settingAdmin.comands.comand6.errortitle1);
//           } else {
//             logCommands(login, `команду: ${cmd}, неудалось выполнить по причине: ${settingAdmin.comands.comand6.errortext2}`)
//             respondWithError(res, 200, settingAdmin.comands.comand6.errortext2, settingAdmin.comands.comand6.errortitle2);
//           }
//           break;
//         case settingAdmin.comands.comand7.name:
//           if (command[1]) {
//             for (const key in data.users) {
//               if (data.users[key]?.account?.name === command[1]) {
//                 const filteredMute = data.mute.filter(player => player !== data.users[key].account.name);
//                 if (filteredMute.length === data.mute.length) {
//                     logCommands(login, `команду: ${cmd}, неудалось выполнить по причине: ${settingAdmin.comands.comand7.errortext1}`)
//                     respondWithError(res, 200, settingAdmin.comands.comand7.errortext1, settingAdmin.comands.comand7.errortitle1);
//                     return;
//                 }
//                 data.mute = filteredMute;
//                 data.saveData("mute.json", data.mute);
//                 logCommands(login, `команда: ${cmd}, успешно выполнена`)
//                 respondWithError(
//                   res,
//                   200,
//                   settingAdmin.comands.comand7.text,
//                   `${settingAdmin.comands.comand7.title} ${data.users[key].account.name}`
//                 );
//                 return;
//               }
//             }
//             logCommands(login, `команду: ${cmd}, неудалось выполнить по причине: ${settingAdmin.comands.comand7.errortext1}`)
//             respondWithError(res, 200, settingAdmin.comands.comand7.errortext1, settingAdmin.comands.comand7.errortitle1);
//           } else {
//             logCommands(login, `команду: ${cmd}, неудалось выполнить по причине: ${settingAdmin.comands.comand7.errortext2}`)
//             respondWithError(res, 200, settingAdmin.comands.comand7.errortext2, settingAdmin.comands.comand7.errortitle2);
//           }
//           break;
//         case settingAdmin.comands.comand8.name:
//           if (!command[1]) {
//             logCommands(login, `команду: ${cmd}, неудалось выполнить по причине: ${settingAdmin.comands.comand8.errortext2}`)
//             respondWithError(res, 200, settingAdmin.comands.comand8.errortext2, settingAdmin.comands.comand8.errortitle2);
//             return;
//           }
//           if (!command[2]) {
//             logCommands(login, `команду: ${cmd}, неудалось выполнить по причине: ${settingAdmin.comands.comand8.errortext3}`)
//             respondWithError(res, 200, settingAdmin.comands.comand8.errortext3, settingAdmin.comands.comand8.errortitle3);
//             return;
//           }
//           if (!command[3]) {
//             logCommands(login, `команду: ${cmd}, неудалось выполнить по причине: ${settingAdmin.comands.comand8.errortext4}`)
//             respondWithError(res, 200, settingAdmin.comands.comand8.errortext4, settingAdmin.comands.comand8.errortitle4);
//             return;
//           }
//           for (const key in data.users) {
//             if (data.users[key]?.account?.name === command[1]) {
//               if (command[2] === "caps") {
//                 settingAdmin.comandsActive[data.users[key].account.login] = { id: "caps", count: Number(command[3]) };
//               } else {
//                 settingAdmin.comandsActive[data.users[key].account.login] = { id: "addItem", name: command[2], count: Number(command[3]) };
//               }
//               logCommands(login, `команда: ${cmd}, успешно выполнена`)
//               respondWithError(res, 200, settingAdmin.comands.comand8.text, `${settingAdmin.comands.comand8.title} ${data.users[key].account.name}`);
//               return;
//             }
//           }
//           logCommands(login, `команду: ${cmd}, неудалось выполнить по причине: ${settingAdmin.comands.comand8.errortext1}`)
//           respondWithError(res, 200, settingAdmin.comands.comand8.errortext1, settingAdmin.comands.comand8.errortitle1);
//           break;
//         case settingAdmin.comands.comand9.name:
//           if (!command[1]) {
//             logCommands(login, `команду: ${cmd}, неудалось выполнить по причине: ${settingAdmin.comands.comand9.errortext2}`)
//             respondWithError(res, 200, settingAdmin.comands.comand9.errortext2, settingAdmin.comands.comand9.errortitle2);
//             return;
//           }
//           if (!command[2]) {
//             logCommands(login, `команду: ${cmd}, неудалось выполнить по причине: ${settingAdmin.comands.comand9.errortext3}`)
//             respondWithError(res, 200, settingAdmin.comands.comand9.errortext3, settingAdmin.comands.comand9.errortitle3);
//             return;
//           }
//           if (!command[3]) {
//             logCommands(login, `команду: ${cmd}, неудалось выполнить по причине: ${settingAdmin.comands.comand9.errortext4}`)
//             respondWithError(res, 200, settingAdmin.comands.comand9.errortext4, settingAdmin.comands.comand9.errortitle4);
//             return;
//           }
//           for (const key in data.users) {
//             if (data.users[key]?.account?.name === command[1]) {
//               settingAdmin.comandsActive[data.users[key].account.login] = { id: "removeItem", name: command[2], count: Number(command[3]) };
//               logCommands(login, `команда: ${cmd}, успешно выполнена`)
//               respondWithError(res, 200, settingAdmin.comands.comand9.text, `${settingAdmin.comands.comand9.title} ${data.users[key].account.name}`);
//               return;
//             }
//           }
//           logCommands(login, `команду: ${cmd}, неудалось выполнить по причине: ${settingAdmin.comands.comand9.errortext1}`)
//           respondWithError(res, 200, settingAdmin.comands.comand9.errortext1, settingAdmin.comands.comand9.errortitle1);
//           break;
//         case settingAdmin.comands.comand10.name:
//           if (command[1]) {
//             for (const key in data.users) {
//               if (data.users[key]?.account?.name === command[1]) {
//                 // settingAdmin.comandsActive[data.users[key].account.login] = { id: "removeAllItem" };
//                 logCommands(login, `команда: ${cmd}, успешно выполнена`)
//                 respondWithError(res, 200, settingAdmin.comands.comand10.text, `${settingAdmin.comands.comand10.title} ${data.users[key].account.name}`);
//                 return;
//               }
//             }
//             logCommands(login, `команду: ${cmd}, неудалось выполнить по причине: ${settingAdmin.comands.comand10.errortext1}`)
//             respondWithError(res, 200, settingAdmin.comands.comand10.errortext1, settingAdmin.comands.comand10.errortitle1);
//           } else {
//             logCommands(login, `команду: ${cmd}, неудалось выполнить по причине: ${settingAdmin.comands.comand10.errortext2}`)
//             respondWithError(res, 200, settingAdmin.comands.comand10.errortext2, settingAdmin.comands.comand10.errortitle2);
//           }
//           break;
//         case settingAdmin.comands.comand11.name:
//           if (!command[1]) {
//             logCommands(login, `команду: ${cmd}, неудалось выполнить по причине: ${settingAdmin.comands.comand11.errortext2}`)
//             respondWithError(res, 200, settingAdmin.comands.comand11.errortext2, settingAdmin.comands.comand11.errortitle2);
//             return;
//           }
//           if (!command[2]) {
//             logCommands(login, `команду: ${cmd}, неудалось выполнить по причине: ${settingAdmin.comands.comand11.errortext3}`)
//             respondWithError(res, 200, settingAdmin.comands.comand11.errortext3, settingAdmin.comands.comand11.errortitle3);
//             return;
//           }
//           for (const key in data.users) {
//             if (data.users[key]?.account?.name === command[1]) {
//               let nameExists = false;
//               for (const userKey in data.users) {
//                 if (data.users[userKey]?.account?.name === command[2].toLowerCase()) {
//                   nameExists = true;
//                   break;
//                 }
//               }
//               if (nameExists) {
//                 logCommands(login, `команду: ${cmd}, неудалось выполнить по причине: ${settingAdmin.comands.comand11.errortext4}`)
//                 respondWithError(res, 200, settingAdmin.comands.comand9.errortext4, settingAdmin.comands.comand11.errortitle4);
//                 return;
//               }
//               data.users[key].account.name = command[2].toLowerCase();
//               settingAdmin.comandsActive[data.users[key].account.login] = { id: "editname", name: command[2] };
//               data.saveData("users.json", data.users);
//               logCommands(login, `команда: ${cmd}, успешно выполнена`)
//               respondWithError(res, 200, settingAdmin.comands.comand11.text, `${settingAdmin.comands.comand11.title} ${data.users[key].account.name}`);
//               return;
//             }
//           }
//           logCommands(login, `команду: ${cmd}, неудалось выполнить по причине: ${settingAdmin.comands.comand11.errortext1}`)
//           respondWithError(res, 200, settingAdmin.comands.comand9.errortext1, settingAdmin.comands.comand11.errortitle1);
//           break;
//         case settingAdmin.comands.comand12.name:
//           if (command[1]) {
//             for (const key in data.users) {
//               if (data.users[key]?.account?.name === command[1]) {
//                 data.ban.login.push(data.users[key].account.login);
//                 data.ban.IP.push(data.users[key].account.IP);
//                 data.ban.ID.push(data.users[key].account.ID);
//                 data.saveData("ban.json", data.ban);
//                 logCommands(login, `команда: ${cmd}, успешно выполнена`)
//                 respondWithError(
//                   res,
//                   200,
//                   settingAdmin.comands.comand3.text,
//                   `${settingAdmin.comands.comand3.title} ${data.users[key].account.name}`
//                 );
//                 return;
//               }
//             }
//             logCommands(login, `команду: ${cmd}, неудалось выполнить по причине: ${settingAdmin.comands.comand3.errortext1}`)
//             respondWithError(res, 200, settingAdmin.comands.comand3.errortext1, settingAdmin.comands.comand3.errortitle1);
//           } else {
//             logCommands(login, `команду: ${cmd}, неудалось выполнить по причине: ${settingAdmin.comands.comand3.errortext2}`)
//             respondWithError(res, 200, settingAdmin.comands.comand3.errortext2, settingAdmin.comands.comand3.errortitle2);
//           }
//           break;
//         case settingAdmin.comands.comand13.name:
//           if (command[1]) {
//             for (const key in data.users) {
//               if (data.users[key]?.account?.name === command[1]) {
//                 const filteredBansL = data.ban.login.filter(player => player !== data.users[key].account.login);
//                 const filteredBansP = data.ban.IP.filter(player => player !== data.users[key].account.IP);
//                 const filteredBansD = data.ban.ID.filter(player => player !== data.users[key].account.ID);
//                 if (filteredBansL.length === data.ban.login.length && filteredBansD.length === data.ban.login.length && filteredBansP.length === data.ban.login.length) {
//                   logCommands(login, `команду: ${cmd}, неудалось выполнить по причине: ${settingAdmin.comands.comand4.errortext1}`)
//                   respondWithError(res, 200, settingAdmin.comands.comand4.errortext1, settingAdmin.comands.comand4.errortitle1);
//                   return;
//                 }
//                 data.ban.login = filteredBansL;
//                 data.ban.IP = filteredBansP;
//                 data.ban.ID = filteredBansD;
//                 data.saveData("ban.json", data.ban);
//                 logCommands(login, `команда: ${cmd}, успешно выполнена`)
//                 respondWithError(
//                   res,
//                   200,
//                   settingAdmin.comands.comand4.text,
//                   `${settingAdmin.comands.comand4.title} ${data.users[key].account.name}`
//                 );
//                 return;
//               }
//             }
//             logCommands(login, `команду: ${cmd}, неудалось выполнить по причине: ${settingAdmin.comands.comand4.errortext1}`)
//             respondWithError(res, 200, settingAdmin.comands.comand4.errortext1, settingAdmin.comands.comand4.errortitle1);
//           } else {
//             logCommands(login, `команду: ${cmd}, неудалось выполнить по причине: ${settingAdmin.comands.comand4.errortext2}`)
//             respondWithError(res, 200, settingAdmin.comands.comand4.errortext2, settingAdmin.comands.comand4.errortitle2);
//           }
//           break;
//         case settingAdmin.comands.comand14.name:
//           if (command[1]) {
//             const channels = ["1", "2", "4"];
//             channels.forEach((channel) => {
//               if (data.chatMessages[channel]) {
//                 data.chatMessages[channel] = data.chatMessages[channel].filter((msg: { name: string; text: string }) => msg.name !== command[1]);
//               }
//             });
                
//             data.saveData("chatMessages.json", data.chatMessages);
//             respondWithError(res, 200, settingAdmin.comands.comand14.text, settingAdmin.comands.comand14.title);
//             return;
//           }
//         case settingAdmin.comands.comand15.name:
//             if (command[1]) {
//               for (const key in data.users) {
//                 if (data.users[key]?.account?.name === command[1]) {
//                   for (const recipient in data.userGifts) {
//                     if (data.userGifts.hasOwnProperty(recipient)) {
                    
//                       data.userGifts[recipient] = data.userGifts[recipient].filter((gift: { sender: string }) => gift.sender !== data.users[key].account.login);
//                       data.saveData("userGifts.json", data.userGifts);
//                       respondWithError(res, 200, settingAdmin.comands.comand15.text, settingAdmin.comands.comand15.title);
//                       return
//                     }
//                   }
//                 }
//               }
//                 logCommands(login, `команду: ${cmd}, неудалось выполнить по причине: ${settingAdmin.comands.comand4.errortext1}`)
//                 respondWithError(res, 200, settingAdmin.comands.comand4.errortext1, settingAdmin.comands.comand4.errortitle1);
//               } else {
//                 logCommands(login, `команду: ${cmd}, неудалось выполнить по причине: ${settingAdmin.comands.comand4.errortext2}`)
//                 respondWithError(res, 200, settingAdmin.comands.comand4.errortext2, settingAdmin.comands.comand4.errortitle2);
//               }
              
//         case settingAdmin.comands.comand16.name:
//           if (settingAdmin.admin[login]) {
//             settingAdmin.admin[login].name = true;
//           }
//           logCommands(login, `команда: ${cmd}, успешно выполнена`)
//           respondWithError(res, 200, settingAdmin.comands.comand16.text, settingAdmin.comands.comand16.title);
//           return;
//         case settingAdmin.comands.comand17.name:
//           if (settingAdmin.admin[login]) {
//             settingAdmin.admin[login].name = false;
//           }
//           logCommands(login, `команда: ${cmd}, успешно выполнена`)
//           respondWithError(res, 200, settingAdmin.comands.comand17.text, settingAdmin.comands.comand17.title);
//           return;
//         default:
//           logCommands(login, `команда: ${cmd}, нету в списке доступных команд`)
//           respondWithError(res, 200, settingAdmin.comands.errorComand.text, settingAdmin.comands.errorComand.title);
//           break;
//       }
//     }

//   /**
//    * POST /try_send_gift.json
//    * Симулирует отправку подарка.
//    */
//   static try_send_gift(req: Request, res: Response): void {
//     const requiredFields = ["login", "gift", "taker", "code", "name"];
//     if (!validateRequiredFields(req, res, requiredFields)) return;

//     const { login, gift, taker, code, name } = req.body;

//     let parsedGift;
//     try {
//       parsedGift = JSON.parse(gift);
//       if (typeof parsedGift !== "object" || Array.isArray(parsedGift)) {
//         throw new Error("Gift must be an object");
//       }
//     } catch (e) {
//       logGeneral(login, `пользователь неправильно отправил запрос посылки`, { ip: req.ip, userAgent: req.headers["user-agent"] });
//       res.status(400).json({ error: "Invalid JSON in 'gift'" });
//       return;
//     }

//     for (const key in parsedGift) {
//       if (bannedItems.includes(key)) {
//         logPlayerInteraction(login, `в посылке пользователя обнаружен запрешеный предмет: ${key}, его посылка: ${gift}, получатель: ${taker}`, { ip: req.ip, userAgent: req.headers["user-agent"] });
//         logGeneral(login, `в посылке пользователя обнаружен запрешеный предмет: ${key}, его посылка: ${gift}`, { ip: req.ip, userAgent: req.headers["user-agent"] });
//         res.status(400).json({ error: "Banned item" });
//         return;
//       }
//     }

//     const giftId = Date.now() + Math.floor(Math.random() * 1000);
//     const newGift = {
//       id: giftId,
//       sender: login,
//       content: gift,
//       name,
//     };

//     if (!data.userGifts[taker]) {
//       data.userGifts[taker] = [];
//     }
//     data.userGifts[taker].push(newGift);
//     data.saveData("userGifts.json", data.userGifts);
//     logPlayerInteraction(login, `его посылка: ${gift}, получатель: ${taker}`, { ip: req.ip, userAgent: req.headers["user-agent"] });
//     logGeneral(login, `пользователь успешно отправил посылку, его посылка: ${gift}`, { ip: req.ip, userAgent: req.headers["user-agent"] });
//     res.send("ok");
//   }

//   /**
//    * POST /load_gift.json
//    * Возвращает список подарков для пользователя.
//    */
//   static load_gift(req: Request, res: Response): void {
//     if (!validateRequiredFields(req, res, ["login"])) return;
//     const { login } = req.body;
//     const giftsForUser = data.userGifts[login] || [];
//     // logGeneral(login, `пользователь отримал список посылок`, { ip: req.ip, userAgent: req.headers["user-agent"] });
//     res.json(giftsForUser);
//   }

//   /**
//    * POST /take_gift.json
//    * При взятии подарка возвращает объект с полученными предметами.
//    */
//   static take_gift(req: Request, res: Response): void {
//     if (!validateRequiredFields(req, res, ["login", "id"])) return;
//     const { login, id } = req.body;
//     const giftId = Number(id);

//     if (!data.userGifts[login]) {
//       logGeneral(login, `пользователь захотел отримать несушествующую посылку`, { ip: req.ip, userAgent: req.headers["user-agent"] });
//       res.status(404).json({ error: "No gifts for this user" });
//       return;
//     }

//     const index = data.userGifts[login].findIndex((g) => g.id === giftId);
//     if (index === -1) {
//       logGeneral(login, `пользователь захотел получить посылку под айди: ${giftId}, но ее несушествует`, { ip: req.ip, userAgent: req.headers["user-agent"] });
//       res.status(404).json({ error: "Gift not found" });
//       return;
//     }

//     const theGift = data.userGifts[login][index];
//     data.userGifts[login].splice(index, 1);
//     data.saveData("userGifts.json", data.userGifts);

//     let parsed;
//     try {
//       parsed = JSON.parse(theGift.content);
//     } catch (e) {
//       logGeneral(login, `неудалось получить посылку пользователя, айди посылки: ${giftId}`, { ip: req.ip, userAgent: req.headers["user-agent"] });
//       res.status(500).json({ error: "Invalid gift content" });
//       return;
//     }
//     logGeneral(login, `пользователь успешно получил посылку, посылка: ${parsed}`, { ip: req.ip, userAgent: req.headers["user-agent"] });
//     res.json(parsed);
//   }
// }

