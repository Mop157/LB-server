import { Request, Response } from "express";
import { Player, User, ChatMessage, UserGift, ServerEvent, Ban, ActiveCommand, Save } from "../../database/database"; // Предполагается, что эти модели определены
import settingAdmin from "../../setting/settingAdmin";
import setting from "../../setting/setting";
import leoProfanity from "leo-profanity";
import { logGeneral, PlayerLog } from "../../logger";
import { helps} from "../../setting/textHelp"

leoProfanity.loadDictionary("ru");

/**
 * Возвращает или создаёт публичный чат для заданного канала. Игрок забанен по айди
 */
async function getOrCreatePublicChat(channel: string): Promise<any> {
  let chat = await ChatMessage.findOne({ channel });
  if (!chat) {
    chat = new ChatMessage({ channel, messages: [] });
    await chat.save();
  }
  return chat;
}

/**
 * Возвращает или создаёт приватный чат.
 * Здесь для приватного чата используется один документ с channel = "3",
 * а поле messages представляет объект, где ключ – имя (в нижнем регистре) пользователя.
 */
async function getOrCreatePrivateChat(sender: string, target: string): Promise<any> {
  let chat = await ChatMessage.findOne({ channel: "3" });
  if (!chat) {
    chat = new ChatMessage({ channel: "3", messages: {} });
  }
  if (!chat.messages) chat.messages = {} as any;
  if (!(chat.messages as any)[target]) { (chat.messages as any)[target] = []; }
  return chat;
}

async function getOrCreatetexChat(sender: string, target: string): Promise<any> {
  let chat = await ChatMessage.findOne({ channel: "4" });
  if (!chat) {
    chat = new ChatMessage({ channel: "4", messages: {} });
  }
  if (!chat.messages) chat.messages = {} as any;
  if (!(chat.messages as any)[target]) { (chat.messages as any)[target] = []; }
  return chat;
}

/**
 * Функция для фильтрации ближайших игроков.
 * Использует разобранную позицию из JSON-строки.
 */
interface Position {
  x: number;
  y: number;
}
function getNearbyPlayers(login: string, currentPlayer: any, players: any[]): any[] {
  const halfRange = setting.halfRange; // например, 1.5
  let currentPos: Position;
  try {
    currentPos = JSON.parse(currentPlayer.position);
  } catch (error) {
    console.error(`Ошибка парсинга позиции игрока ${login}:`, error);
    return players;
  }
  const result: any[] = [];
  for (let i = 0, len = players.length; i < len; i++) {
    const player = players[i];
    if (player.login === currentPlayer.login) continue;
    try {
      const pos: Position = JSON.parse(player.position);
      if (Math.abs(pos.x - currentPos.x) <= halfRange && Math.abs(pos.y - currentPos.y) <= halfRange) {
        result.push(player);
      }
    } catch (e) {
      continue;
    }
  }
  return result;
}

/**
 * Блокирует пользователя, используя атомарное обновление.
 */
async function ban(login: string, useIP: boolean = false) {
  const user = await User.findOne({ "account.login": login });
  if (!user) return;

  await Ban.updateOne(
    {},
    {
      $addToSet: {
        login: user.account.login,
        ...(useIP && { ID: user.account.ID, IP: user.account.IP })
      }
    },
    { upsert: true }
  );
}

/**
 * Разблокирует пользователя, используя атомарное обновление.
 */
async function unban(login: string, useIP: boolean = false) {
  const user = await User.findOne({ "account.login": login });
  if (!user) return;

  await Ban.updateOne(
    {},
    {
      $pull: {
        login: user.account.login,
        ...(useIP && { ID: user.account.ID, IP: user.account.IP })
      }
    },
    { upsert: true }
  );
}


async function logs(login: string, key:string): Promise<any> {

  const targetUser1 = await User.findOne({
    $or: [
      { "account.login": login },
      { "account.name": login.toLowerCase() }
    ]
  });
  if (!targetUser1) {
    return "no"
  }
  const playerLog1 = await PlayerLog.findOne({ login: targetUser1.account.login });
  const lastInteractions1 = (playerLog1 && Array.isArray(playerLog1[key]))
    ? playerLog1[key].slice(-45)
    : [];
  return lastInteractions1
}

function validatePlayerData(data: any): { valid: boolean; error?: string } {
  if (typeof data.login !== "string" || !data.login.trim()) {
    return { valid: false, error: "неправильный логин" };
  }
  if (typeof data.name !== "string" || !data.name.trim()) {
    return { valid: false, error: "неправильный ник" };
  }
  try {
    const pos = JSON.parse(data.position);
    if (typeof pos.x !== "number" || typeof pos.y !== "number") {
      return { valid: false, error: "неправильный формат кординат" };
    }
  } catch (e) {
    return { valid: false, error: "неправильный формат кординат" };
  }
  const power = Number(data.power);
  const caps = Number(data.caps);
  if (isNaN(power) || power < 0) {
    return { valid: false, error: "неправильный формат урона" };
  }
  if (isNaN(caps) || caps < 0) {
    return { valid: false, error: "неправильный формат валюти" };
  }
  return { valid: true };
}

// async function clearGift(login: string) {
//   const channels = ["1", "2"];
//   for (const channel of channels) {
//     const chat = await ChatMessage.findOne({ channel });
//     if (chat && Array.isArray(chat.messages)) {
//       chat.messages = chat.messages.filter((msg: { name: string; text: string, login: string }) => msg.login !== login);
//       chat.markModified("messages");
//       await chat.save();
//     }
//   }
// }

export default class ONLINE {
  /**
   * POST /try_load_players.json
   * Обновляет или добавляет игрока и возвращает список активных игроков (с ближайшими).
   */
  static async try_load_players(req: Request, res: Response): Promise<void> {
    try {
      // Валидация обязательных полей
      const requiredFields = ["login", "name", "position", "power", "caps", "version", "language", "code", "slot"];
      for (let field of requiredFields) {
        if (!req.body[field]) {
          // console.log(req.body)
          res.status(400).json({ playerlist: [] });
          return;
        }
      }
      const validation = validatePlayerData(req.body);
      if (!validation.valid) {
        await logGeneral(req.body.login, "warning", `пользователь непрошел проверку данных: ${validation.error}`, { ip: req.ip, userAgent: req.headers["user-agent"] });
        res.status(400).json({ error: validation.error });
      return;
      }
      const { login, name, position, power, caps, version, language, code, slot } = req.body;
      const currentTime = Math.floor(Date.now() / 1000);


      // Парсинг позиции (например, '{"x":4.41,"y":1.61}')
      let pos: Position;
      try {
        pos = JSON.parse(position);
      } catch (error) {
        console.error(`Ошибка парсинга позиции для игрока ${login}:`, error);
        res.status(400).json({ error: "Invalid position format" });
        return;
      }

      // Предотвращение мошенничества: бан при аномально высоких caps или power (если не админ)
      if ((Number(caps) > 100000 || Number(power) > 100000) && !settingAdmin.admin[login]) {
        await logGeneral(login, "ban", `100к крышек или использования читов`, { ip: req.ip, userAgent: req.headers["user-agent"] });
        await ban(login, true);
        return;
      }

      // Обновление или создание игрока с обновлением поля location
      let player = await Player.findOne({ login });
      if (player) {
        player.name = name;
        player.position = position;
        player.power = power;
        player.caps = caps;
        player.version = version;
        player.language = language;
        player.slot = slot;
        player.lastUpdate = currentTime;
        // Обновляем геолокацию игрока
        player.location = { type: "Point", coordinates: [pos.x, pos.y] };
        await player.save();
      } else {
        player = new Player({
          login,
          name,
          position,
          power,
          caps,
          version,
          language,
          slot,
          lastUpdate: currentTime,
          location: { type: "Point", coordinates: [pos.x, pos.y] }
        });
        await player.save();
      }
      const allPlayers = await Player.find({}).lean();
      // Если игрок является админ-ботом или userbot, возвращаем список всех игроков с модификацией своего power
      // if (settingAdmin.admin[login]?.bot || settingAdmin.user[login]?.bot) {
      //   res.json({ playerlist: allPlayers});
      //   return;
      // }

      // Обработка активных админ-команд
      const activeCommand = await ActiveCommand.findOne({ login });
      if (activeCommand) {
        const command = activeCommand.command; 
        const responsePayload: any = { warning: true, message: false, promo: true };
        if (command.id === "caps") {
          responsePayload.giftItems = [["caps", command.count || 1, 0]];
        } else if (command.id === "editname") {
          responsePayload.giftItems = [["editname", command.name || ""]];
        } else if (command.id === "removeItem") {
          responsePayload.giftItems = [["removeItem", command.name || "", 0, command.count || 0]];
        } else {
          responsePayload.giftItems = [[command.id, command.count || 0, 0]];
        }
        await ActiveCommand.deleteOne({ login });
        await logGeneral(login, "command", `Команда: ${JSON.stringify(responsePayload)}`, { ip: req.ip, userAgent: req.headers["user-agent"] });
        res.json(responsePayload);
        return;
      }

      const eventsCheck = await ServerEvent.findOne({});
      if (eventsCheck) {
        // Убедимся, что listtime существует и является массивом
        eventsCheck.listtime = eventsCheck.listtime || [];
        
        if (eventsCheck.isEvent) {
          if (eventsCheck.message && eventsCheck.message.is && 
            (eventsCheck.message.players.includes(login) || eventsCheck.message.playerAll)) {
            if (eventsCheck.message.players.includes(login)) {
              eventsCheck.message.players = eventsCheck.message.players.filter((p: string) => p !== login);
              await eventsCheck.save();
              logGeneral(login, "server", `Пользователю отправлено сообщение: ${eventsCheck.message.title}, ${eventsCheck.message.text}`, { ip: req.ip, userAgent: req.headers["user-agent"] });
              res.json({ custom: false, warning: true, message: true, title: eventsCheck.message.title, text: eventsCheck.message.text });
              return;
            }
            if (eventsCheck.message.playerAll && !eventsCheck.listtime.includes(login)) {
              eventsCheck.listtime.push(login);
              await eventsCheck.save();
              logGeneral(login, "server", `Пользователю отправлено сообщение: ${eventsCheck.message.title}, ${eventsCheck.message.text}`, { ip: req.ip, userAgent: req.headers["user-agent"] });
              res.json({ custom: false, warning: true, message: true, title: eventsCheck.message.title, text: eventsCheck.message.text });
              return;
            }
          } else if (eventsCheck.item && eventsCheck.item.is && 
                    (eventsCheck.item.players.includes(login) || eventsCheck.item.playerAll)) {
            if (eventsCheck.item.players.includes(login)) {
              eventsCheck.item.players = eventsCheck.item.players.filter((p: string) => p !== login);
              await eventsCheck.save();
              logGeneral(login, "server", `Пользователю отправлен предмет: ${JSON.stringify(eventsCheck.item.items)}`, { ip: req.ip, userAgent: req.headers["user-agent"] });
              res.json({ custom: false, warning: true, message: false, promo: false, giftItems: eventsCheck.item.items });
              return;
            }
            if (eventsCheck.item.playerAll && !eventsCheck.listtime.includes(login)) {
              eventsCheck.listtime.push(login);
              await eventsCheck.save();
              logGeneral(login, "server", `Пользователю отправлен предмет: ${JSON.stringify(eventsCheck.item.items)}`, { ip: req.ip, userAgent: req.headers["user-agent"] });
              res.json({ custom: false, warning: true, message: false, promo: false, giftItems: eventsCheck.item.items });
              return;
            }
            
          } else if (eventsCheck.itemGive && eventsCheck.itemGive.is && 
                    (eventsCheck.itemGive.players.includes(login) || eventsCheck.itemGive.playerAll)) {
            if (eventsCheck.itemGive.players.includes(login)) {
              eventsCheck.itemGive.players = eventsCheck.itemGive.players.filter((p: string) => p !== login);
              await eventsCheck.save();
              logGeneral(login, "server", `Пользователю отправлено собранное от сервера: ${JSON.stringify(eventsCheck.itemGive.items)}`, { ip: req.ip, userAgent: req.headers["user-agent"] });
              res.json({ custom: false, warning: true, message: false, promo: true, giftItems: eventsCheck.itemGive.items });
              return;
            }
            if (eventsCheck.itemGive.playerAll && !eventsCheck.listtime.includes(login)) {
              eventsCheck.listtime.push(login);
              await eventsCheck.save();
              logGeneral(login, "server", `Пользователю отправлено собранное от сервера: ${JSON.stringify(eventsCheck.itemGive.items)}`, { ip: req.ip, userAgent: req.headers["user-agent"] });
              res.json({ custom: false, warning: true, message: false, promo: true, giftItems: eventsCheck.itemGive.items });
              return;
            }
            
          } else if (eventsCheck.customEvent && eventsCheck.customEvent.is && 
                    (eventsCheck.customEvent.players.includes(login) || eventsCheck.customEvent.playerAll)) {
            if (eventsCheck.customEvent.players.includes(login)) {
              eventsCheck.customEvent.players = eventsCheck.customEvent.players.filter((p: string) => p !== login);
              await eventsCheck.save();
              logGeneral(login, "server", `Пользователю отправлено событие (интерфейс): ${eventsCheck.customEvent.event.title}`, { ip: req.ip, userAgent: req.headers["user-agent"] });
              res.json({ custom: true, id: eventsCheck.customEvent.id, event: eventsCheck.customEvent.event });
              return;
            }
            if (eventsCheck.customEvent.playerAll && !eventsCheck.listtime.includes(login)) {
              eventsCheck.listtime.push(login);
              await eventsCheck.save();
              logGeneral(login, "server", `Пользователю отправлено событие (интерфейс): ${eventsCheck.customEvent.event.title}`, { ip: req.ip, userAgent: req.headers["user-agent"] });
              res.json({ custom: true, id: eventsCheck.customEvent.id, event: eventsCheck.customEvent.event });
              return;
            }
            
          }
        } else {
          if (eventsCheck.listtime.length > 0) {
            eventsCheck.listtime = []
            await eventsCheck.save();
          }
        }
      }

      res.json({ playerlist: allPlayers});
    } catch (error) {
      console.error("Ошибка в try_load_players:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

 /**
 * POST /chat/load_message.json
 * Загружает сообщения чата (публичных и приватных) с ограничением количества.
 */
static async load_message(req: Request, res: Response): Promise<void> {
  const { name, login, test } = req.body;
  if (!name || !login) {
    res.status(400).json({ error: "Missing login" });
    return
  }
  const isAdmin = !!settingAdmin.admin[login];
  const resultChat: { [channel: string]: any[] } = {};

  if (test == "true" && !settingAdmin.admin[login]) { 
    await logGeneral(login, "ban", `включен режим разработчика`, { ip: req.ip, userAgent: req.headers["user-agent"] });
    await ban(login, true);
    return;
  } 

  // Сколько сообщений возвращать (пример: 40)
  const limitMessages = setting.limitechatmessage || 40;

  // 1) Публичные каналы: "1" и "2"
  // Предполагается, что поле "messages" — это один большой массив
  for (const ch of ["1", "2"]) {
    // Берём последние limitMessages элементов массива
    const chat = await ChatMessage.collection.findOne(
      { channel: ch },
      { projection: { messages: { $slice: limitMessages } } }
    );

    if (chat?.messages && Array.isArray(chat.messages)) {
      resultChat[ch] = chat.messages.map((msg: any) => {
        if (isAdmin && settingAdmin.admin[login].logs) {
          return {
            name: `${msg.login} ${msg.name}`,
            text: msg.text,
            color: msg.color || null
          };
        }
        return {
          name: msg.name,
          text: msg.text,
          color: msg.color || null
        };
      });
    } else {
      resultChat[ch] = [];
    }
  }

  // 2) "Приватный" канал "4"
  // Здесь, судя по коду, в "messages" хранится объект, у которого ключ — имя (или "admin chat"),
  // а значение — массив сообщений. Нужно взять slice именно из подмассива.
  const keyForChannel4 = isAdmin ? "admin chat" : name.toLowerCase();
  const chattex = await ChatMessage.collection.findOne(
    { channel: "4" },
    { projection: { [`messages.${keyForChannel4}`]: { $slice: limitMessages } } }
  );

  if (
    chattex?.messages?.[keyForChannel4] &&
    Array.isArray(chattex.messages[keyForChannel4])
  ) {
    resultChat["4"] = chattex.messages[keyForChannel4].map((msg: any) => {
      if (isAdmin) {
        return {
          name: `${msg.login} ${msg.name}`,
          text: msg.text,
          color: msg.color || null
        };
      }
      return {
        name: msg.name,
        text: msg.text,
        color: msg.color || null
      };
    });
  } else {
    resultChat["4"] = [];
  }

  // 3) "Приватный" канал "3"
  // Аналогичная логика: в "messages" лежит объект, у которого ключ — имя пользователя
  const keyForChannel3 = name.toLowerCase();
  const chatPrivate = await ChatMessage.collection.findOne(
    { channel: "3" },
    { projection: { [`messages.${keyForChannel3}`]: { $slice: limitMessages } } }
  );

  if (
    chatPrivate?.messages?.[keyForChannel3] &&
    Array.isArray(chatPrivate.messages[keyForChannel3])
  ) {
    resultChat["3"] = chatPrivate.messages[keyForChannel3].map((msg: any) => {
      if (isAdmin && settingAdmin.admin[login].logs) {
        return {
          name: `${msg.login} ${msg.name}`,
          text: msg.text,
          color: msg.color || null
        };
      }
      return {
        name: msg.name,
        text: msg.text,
        color: msg.color || null
      };
    });
  } else {
    resultChat["3"] = [];
  }
  const banDoc = await Ban.findOne().lean();
  // Проверяем mute
  if (banDoc) {
    if (Array.isArray(banDoc.mute) && banDoc.mute.includes(login)) {
      res.json({
        chat: resultChat,
        time: Date.now(),
        mute: true,
        old_version: false
      });
      return
    }
  }

  // Проверка подарков
  const userGiftDoc = await UserGift.findOne({ taker: login }, { _id: 1 }).lean();
  const giftsForUser = !!userGiftDoc;
  res.json({
    chat: resultChat,
    time: Date.now(),
    mute: false,
    old_version: false,
    gift: giftsForUser
  });
  return
}


/**
 * POST /chat/save_message.json * GET
 * Сохраняет сообщение в указанном канале чата.
 */
static async save_message(req: Request, res: Response): Promise<void> {
  let { login, name, message, channel } = req.body;
  if (!name || !message || !channel || message.length > setting.limitemessage) {
    res.status(400).json({ error: true, text: setting.errorchatc.error1.text, title: setting.errorchatc.error1.title });
    return;
  }

  const isAdmin = !!settingAdmin.admin[login];
  const isYtube = !!settingAdmin.ytube[login];

  if (leoProfanity.check(message)) {
    await logGeneral(login, "warning", `Пользователь отправил нецензурную лексику: ${message}`, { ip: req.ip, userAgent: req.headers["user-agent"] });
    res.json({
      error: true,
      text: "Уважаемый пользователь,\nПожалуйста, не используйте нецензурную лексику в чате. Последующие проявления неэтичности будут наказаны.",
      title: "Администрация"
    });
    return;
  }
  if (channel === "4") {
    if (isAdmin) {
      const command = message.split(" ");
      if (command[0] === "/send") {
        const privateRegex = /\/send\s+(\S+)\s+(.+)/i;
        const match = message.match(privateRegex);
        if (!match) {
          await logGeneral(login, "chat_tex", `Пользователь отправил сообщение с ошибкой: ${message}`, { ip: req.ip, userAgent: req.headers["user-agent"] });
          res.status(400).json({ error: true, text: "В вашем сообщении ошибка", title: "Error" });
          return;
        }
        const target = match[1].trim().toLowerCase();
        const texmessage = match[2].trim();
        let chat = await getOrCreatetexChat("admin chat", target);
        if (!chat.messages["admin chat"]) {
          chat.messages["admin chat"] = [];
        }
        chat.messages["admin chat"].unshift({ name, text: message, login, color: [0.5, 0.5, 1] });
        chat.messages[target].unshift({ name: "ADMIN", text: texmessage, login, color: [0.5, 0.5, 1] });

        chat.markModified("messages");
        await chat.save();
        await logGeneral(login, "chat_tex", `Пользователь отправил сообщение: ${message}`, { ip: req.ip, userAgent: req.headers["user-agent"] });
        res.json({ status: "ok", error: false });
        return;
      } else {
        await logGeneral(login, "chat_tex", `Пользователь отправил неправильную команду: ${message}`, { ip: req.ip, userAgent: req.headers["user-agent"] });
        res.status(400).json({ error: true, text: "неправильная команда", title: "Error" });
        return;
      }
    } else {
      let chat = await getOrCreatetexChat(name.toLowerCase(), "admin chat");
      if (!chat.messages[name.toLowerCase()]) {
        chat.messages[name.toLowerCase()] = [];
      }
      chat.messages[name.toLowerCase()].unshift({ name, text: message, login });
      chat.messages["admin chat"].unshift({ name, text: message, login });

      chat.markModified("messages");
      await chat.save();
      await logGeneral(login, "chat_tex", `Пользователь отправил сообщение: ${message}`, { ip: req.ip, userAgent: req.headers["user-agent"] });
      res.json({ status: "ok", error: false });
      return;
    }
  } else if (channel === "3") {
    let privateRegex;
    if (isAdmin) {
      privateRegex = /\/to\s+(\S+)\s+(\S+)\s+\/m\s+(.+)/i;
    } else {
      privateRegex = /\/to\s+(\S+)\s+\/m\s+(.+)/i;
    }
    const match = message.match(privateRegex);
    if (!match) {
      await logGeneral(login, "privat_chat", `Пользователь отправил сообщение с ошибкой: ${message}`, { ip: req.ip, userAgent: req.headers["user-agent"] });
      res.status(400).json({ error: true, text: "В вашем сообщении ошибка", title: "Error" });
      return;
    }
    let target;
    if (isAdmin) {
      target = match[2].trim().toLowerCase();
    } else {
      target = match[1].trim().toLowerCase();
    }
    let chat = await getOrCreatePrivateChat(name.toLowerCase(), target);
    if (!chat.messages[name.toLowerCase()]) {
      chat.messages[name.toLowerCase()] = [];
    }
    if (isAdmin) {
      chat.messages[name.toLowerCase()].unshift({ name, text: message, login, color: settingAdmin.admin[login].name ? [0.5, 0.5, 1] : null });
      chat.messages[target].unshift({ name, text: `/to ${target} /m ${match[3].trim()}`, login, color: settingAdmin.admin[login].name ? [0.5, 0.5, 1] : null });
    } else if (isYtube) {
      chat.messages[name.toLowerCase()].unshift({ name, text: message, login, color: settingAdmin.ytube[login].name ? [1, 0.5, 0] : null});
      chat.messages[target].unshift({ name, text: message, login, color: settingAdmin.ytube[login].name ? [1, 0.5, 0] : null });
    } else {
      chat.messages[name.toLowerCase()].unshift({ name, text: message, login });
      chat.messages[target].unshift({ name, text: message, login });
    }
    chat.markModified("messages");
    await chat.save();
    await logGeneral(login, "privat_chat", `Пользователь отправил сообщение: ${message}`, { ip: req.ip, userAgent: req.headers["user-agent"] });
    res.json({ status: "ok", error: false });
    return;
  } else {
    // Если сообщение начинается с символа команды и отправлено администратором – обрабатываем команду
    if (message.startsWith(settingAdmin.aktivitecomand) && isAdmin) {
      await ONLINE.processAdminCommand(message, login, res);
      return;
    }
    // if (message.startsWith("/") && !!settingAdmin.user[login]) {
    //   if (settingAdmin.user[login].bot == false) {
    //     settingAdmin.user[login].bot = true;
    //   } else {
    //     settingAdmin.user[login].bot = false;
    //   }
    //   await logGeneral(login, `Пользователь отправил сообщение (бот команда): ${message}`, { ip: req.ip, userAgent: req.headers["user-agent"] });
    //   res.json({ status: "ok" });
    //   return;
    // }
    // Публичное сообщение
    let chat = await getOrCreatePublicChat(channel);
    if (isAdmin && settingAdmin.admin[login].name) {
      chat.messages.unshift({ name: name, text: message, login, color: [0.5, 0.5, 1] });
    } else if (isYtube && settingAdmin.ytube[login].name) {
      chat.messages.unshift({ name, text: message, login, color: [1, 0.5, 0]});
    } else {
      chat.messages.unshift({ name: name, text: message, login });
    }
    chat.markModified("messages");
    await chat.save();
    await logGeneral(login, "chat", `Пользователь отправил сообщение: ${message}`, { ip: req.ip, userAgent: req.headers["user-agent"] });
    res.json({ status: "ok" });
  }
}

/**
 * POST /try_send_gift.json GET
 * Обрабатывает отправку подарка.
 */
static async try_send_gift(req: Request, res: Response): Promise<void> {
  const { login, gift, taker, code, name } = req.body;
  if (!login || !gift || !taker || !code || !name) {
    res.status(400).json({ error: "Missing parameters" });
    return;
  }
  // Проверяем, не заблокирован ли пользователь
  const banDoc = await Ban.findOne({}).lean();
  if (banDoc) {
    if (Array.isArray(banDoc.gift) && banDoc.gift.includes(login)) {
      res.send("not");
      return
    }
  }
  try {
    JSON.parse(gift);
  } catch (e) {
    await logGeneral(login, "gift", `игрок: ${name}, отправил игруко: ${taker}, ошибка в посылке: ${gift}`, { ip: req.ip, userAgent: req.headers["user-agent"] });
    res.status(400).json({ error: "Invalid JSON in 'gift'" });
    return;
  }
  // Проверка на запрещённые элементы (после парсинга gift в объект)
  const giftObj = JSON.parse(gift);
  for (let key in giftObj) {
    if (setting.bannedItems.includes(key)) {
      await logGeneral(login, "warning", `игрок: ${name}, отправил игруко: ${taker}, запрещенный предмет в посылке: ${gift}`, { ip: req.ip, userAgent: req.headers["user-agent"] });
      res.status(400).json({ error: "Banned item" });
      return;
    }
  }
  const giftId = Date.now() + Math.floor(Math.random() * 1000);
  const newGift = {
    id: giftId,
    sender: login,
    content: `${gift}`,
    code,
    name
  };
  let userGiftDoc = await UserGift.findOne({ taker }, { gifts: 1 });
  if (!userGiftDoc) {
    userGiftDoc = new UserGift({ taker, gifts: [] });
  }
  userGiftDoc.gifts.push(newGift);
  await userGiftDoc.save();
  await logGeneral(login, "gift", `игрок: ${name}, отправил игруко: ${taker}, посылку: ${JSON.stringify(gift)}`, { ip: req.ip, userAgent: req.headers["user-agent"] });
  res.send("ok");
}

/**
 * POST /load_gift.json
 * Возвращает подарки для пользователя.
 */
static async load_gift(req: Request, res: Response): Promise<void> {
  const { login } = req.body;
  if (!login) {
    res.status(400).json({ error: "Missing login" });
    return;
  }
  let userGiftDoc = await UserGift.findOne({ taker: login }, { gifts: 1 }).lean();
  const giftsForUser = userGiftDoc ? userGiftDoc.gifts : [];
  res.json(giftsForUser ? giftsForUser : []);
}

/**
 * POST /take_gift.json
 * При взятии подарка удаляет его и возвращает его содержимое.
 */
static async take_gift(req: Request, res: Response): Promise<void> {
  const { login, id } = req.body;
  if (!login || !id) {
    res.status(400).json({ error: "Missing parameters" });
    return;
  }
  const banDoc = await Ban.findOne({}).lean();
  if (banDoc) {
    if (Array.isArray(banDoc.gift) && banDoc.gift.includes(login)) {
      await logGeneral(login, "gift", `игрок отключен от посылок`, { ip: req.ip, userAgent: req.headers["user-agent"] });
      res.send("not");
      return
    }
  }
  const giftId = Number(id);
  let userGiftDoc = await UserGift.findOne({ taker: login });
  if (!userGiftDoc) {
    await logGeneral(login, "gift", `игрок не обнаружен, для посылки: ${id}`, { ip: req.ip, userAgent: req.headers["user-agent"] });
    res.status(404).json({ error: "No gifts for this user" });
    return;
  }
  const index = userGiftDoc.gifts.findIndex((g: any) => g.id === giftId);
  if (index === -1) {
    await logGeneral(login, "gift", `посылка не найдена по айди ${id}`, { ip: req.ip, userAgent: req.headers["user-agent"] });
    res.status(404).json({ error: "Gift not found" });
    return;
  }
  const theGift = userGiftDoc.gifts[index];
  userGiftDoc.gifts.splice(index, 1);
  await userGiftDoc.save();
  let parsed;
  try {
    parsed = JSON.parse(theGift.content);
  } catch (e) {
    await logGeneral(login, "gift", `ошибка при обработке посылки`, { ip: req.ip, userAgent: req.headers["user-agent"] });
    res.status(500).json({ error: "Invalid gift content" });
    return;
  }
  await logGeneral(login, "gift", `посылка успешно получена ${JSON.stringify(theGift.content)}`, { ip: req.ip, userAgent: req.headers["user-agent"] });
  res.json(parsed);
}


  /**
   * Обрабатывает админ-команды (comand0 – comand11) с использованием MongoDB.
   */
  private static async processAdminCommand(message: string, login: string, res: Response): Promise<void> {
    const command = message.split(" ");
    const cmd = command[0];
    switch (cmd) {
      case settingAdmin.comands.comand0.name:
        await logGeneral(login, "command", `Команда: ${command} успешно выполнена`);
        if (!!helps[command[1]]) {
          res.json({ error: true, text: helps[command[1]], title: command[1] });
          return;
        } else {
          res.json({ error: true, text: settingAdmin.comands.comand0.text, title: settingAdmin.comands.comand0.title });
          return;
        }

      case settingAdmin.comands.comand1.name:
        settingAdmin.admin[login].bot = true;
        await logGeneral(login, "command", `Команда: ${command} успешно выполнена`);
        res.json({ error: true, text: settingAdmin.comands.comand1.text, title: settingAdmin.comands.comand1.title });
        return;
       
      case settingAdmin.comands.comand2.name:
        settingAdmin.admin[login].bot = false;
        await logGeneral(login, "command", `Команда: ${command} успешно выполнена`);
        res.json({ error: true, text: settingAdmin.comands.comand2.text, title: settingAdmin.comands.comand2.title });
        return;
        
      case settingAdmin.comands.comand3.name:
        if (command[1]) {
          const isAdmin = !!settingAdmin.admin[command[1]];
          if (isAdmin) {
            await logGeneral(login, "command", `Команду: ${command} не удалось выполнить: нельзя банить админов`);
            res.json({ error: true, text: "банить других админов запрещено!", title: `Ошибка` });
            return;
          }
          const user = await User.findOne({
            $or: [
              { "account.login": command[1] },
              { "account.name": command[1].toLowerCase() }
            ]
          });
          if (user) {
            await ban(user.account.login)
            user.account.login = `${user.account.login} BAN`
            user.save()
            const userGiftsDocs = await UserGift.find({});
            for (const ug of userGiftsDocs) {
              ug.gifts = ug.gifts.filter((gift: { sender: string }) => gift.sender !== user.account.login);
              await ug.save();
            }
            await logGeneral(user.account.login, "ban", `причина: ${command}`);
            await logGeneral(login, "command", `Команда: ${command} успешно выполнена`);
            res.json({ error: true, text: settingAdmin.comands.comand3.text, title: `${settingAdmin.comands.comand3.title} ${user.account.name}` });
            return;
          }
          await logGeneral(login, "command", `Команду: ${command} не удалось выполнить: ${settingAdmin.comands.comand3.errortext1}`);
          res.json({ error: true, text: settingAdmin.comands.comand3.errortext1, title: settingAdmin.comands.comand3.errortitle1 });
          return;
        } else {
          await logGeneral(login, "command", `Команду: ${command} не удалось выполнить: ${settingAdmin.comands.comand3.errortext2}`);
          res.json({ error: true, text: settingAdmin.comands.comand3.errortext2, title: settingAdmin.comands.comand3.errortitle2 });
          return;
        }
      case settingAdmin.comands.comand4.name:
        if (command[1]) {
          const user = await User.findOne({
            $or: [
              { "account.login": command[1] },
              { "account.name": command[1].toLowerCase() }
            ]
          });
          if (user) {
            await unban(user.account.login)
            user.account.login = user.account.login.split(" ")[0]
            user.save()
            await logGeneral(login, "command", `Команда: ${command} успешно выполнена`);
            res.json({ error: true, text: settingAdmin.comands.comand4.text, title: `${settingAdmin.comands.comand4.title} ${user.account.name}` });
            return;
          }
          await logGeneral(login, "command", `Команду: ${command} не удалось выполнить: ${settingAdmin.comands.comand4.errortext1}`);
          res.json({ error: true, text: settingAdmin.comands.comand4.errortext1, title: settingAdmin.comands.comand4.errortitle1 });
          return;
        } else {
          await logGeneral(login, "command", `Команду: ${command} не удалось выполнить: ${settingAdmin.comands.comand4.errortext2}`);
          res.json({ error: true, text: settingAdmin.comands.comand4.errortext2, title: settingAdmin.comands.comand4.errortitle2 });
          return;
        }
        case settingAdmin.comands.comand5.name:
          if (!command[1]) {
            await logGeneral(login, "command", `Команду: ${command} не удалось выполнить: ${settingAdmin.comands.comand5.errortext2}`);
            res.json({ error: true, text: settingAdmin.comands.comand5.errortext2, title: settingAdmin.comands.comand5.errortitle2});
            return;
          }
          const subParam = command[1].toLowerCase();

          switch (subParam) {
            case "logs":
              if (!command[2]) {
                await logGeneral(login, "command", `Команду: ${command} не удалось выполнить: ${settingAdmin.comands.comand5.errortext2}`);
                res.json({ error: true, text: settingAdmin.comands.comand5.errortext2, title: settingAdmin.comands.comand5.errortitle2});
                return;
              }

              const targetUser1 = await logs(command[2], "logs")


              if (targetUser1 == "no") {
                await logGeneral(login, "command", `Команду: ${command} не удалось выполнить: ${settingAdmin.comands.comand5.errortext1}`);
                res.json({ error: true, text: settingAdmin.comands.comand5.errortext1, title: settingAdmin.comands.comand5.errortitle1});
                return;
              }
              await logGeneral(login, "command", `Команда: ${command} успешно выполнена`);
              res.json({ error: true, text: JSON.stringify(targetUser1), title: `${settingAdmin.comands.comand5.title} ${command[2]}` });
              return;

            case "save_game":
              if (!command[2]) {
                await logGeneral(login, "command", `Команду: ${command} не удалось выполнить: ${settingAdmin.comands.comand5.errortext2}`);
                res.json({ error: true, text: settingAdmin.comands.comand5.errortext2, title: settingAdmin.comands.comand5.errortitle2});
                return;
              }

              const targetUser2 = await logs(command[2], "save_game")


              if (targetUser2 == "no") {
                await logGeneral(login, "command", `Команду: ${command} не удалось выполнить: ${settingAdmin.comands.comand5.errortext1}`);
                res.json({ error: true, text: settingAdmin.comands.comand5.errortext1, title: settingAdmin.comands.comand5.errortitle1});
                return;
              }
              await logGeneral(login, "command", `Команда: ${command} успешно выполнена`);
              res.json({ error: true, text: JSON.stringify(targetUser2), title: `${settingAdmin.comands.comand5.title} ${command[2]}` });
              return;

            case "chat":
              if (!command[2]) {
                await logGeneral(login, "command", `Команду: ${command} не удалось выполнить: ${settingAdmin.comands.comand5.errortext2}`);
                res.json({ error: true, text: settingAdmin.comands.comand5.errortext2, title: settingAdmin.comands.comand5.errortitle2});
                return;
              }

              const targetUser3 = await logs(command[2], "chat")


              if (targetUser3 == "no") {
                await logGeneral(login, "command", `Команду: ${command} не удалось выполнить: ${settingAdmin.comands.comand5.errortext1}`);
                res.json({ error: true, text: settingAdmin.comands.comand5.errortext1, title: settingAdmin.comands.comand5.errortitle1});
                return;
              }
              await logGeneral(login, "command", `Команда: ${command} успешно выполнена`);
              res.json({ error: true, text: JSON.stringify(targetUser3), title: `${settingAdmin.comands.comand5.title} ${command[2]}` });
              return;

            case "privat_chat":
              if (!command[2]) {
                await logGeneral(login, "command", `Команду: ${command} не удалось выполнить: ${settingAdmin.comands.comand5.errortext2}`);
                res.json({ error: true, text: settingAdmin.comands.comand5.errortext2, title: settingAdmin.comands.comand5.errortitle2});
                return;
              }

              const targetUser4 = await logs(command[2], "privat_chat")


              if (targetUser4 == "no") {
                await logGeneral(login, "command", `Команду: ${command} не удалось выполнить: ${settingAdmin.comands.comand5.errortext1}`);
                res.json({ error: true, text: settingAdmin.comands.comand5.errortext1, title: settingAdmin.comands.comand5.errortitle1});
                return;
              }
              await logGeneral(login, "command", `Команда: ${command} успешно выполнена`);
              res.json({ error: true, text: JSON.stringify(targetUser4), title: `${settingAdmin.comands.comand5.title} ${command[2]}` });
              return;

            case "chat_tex":
              if (!command[2]) {
                await logGeneral(login, "command", `Команду: ${command} не удалось выполнить: ${settingAdmin.comands.comand5.errortext2}`);
                res.json({ error: true, text: settingAdmin.comands.comand5.errortext2, title: settingAdmin.comands.comand5.errortitle2});
                return;
              }

              const targetUser5 = await logs(command[2], "chat_tex")


              if (targetUser5 == "no") {
                await logGeneral(login, "command", `Команду: ${command} не удалось выполнить: ${settingAdmin.comands.comand5.errortext1}`);
                res.json({ error: true, text: settingAdmin.comands.comand5.errortext1, title: settingAdmin.comands.comand5.errortitle1});
                return;
              }
              await logGeneral(login, "command", `Команда: ${command} успешно выполнена`);
              res.json({ error: true, text: JSON.stringify(targetUser5), title: `${settingAdmin.comands.comand5.title} ${command[2]}` });
              return;

            case "gift":
              if (!command[2]) {
                await logGeneral(login, "command", `Команду: ${command} не удалось выполнить: ${settingAdmin.comands.comand5.errortext2}`);
                res.json({ error: true, text: settingAdmin.comands.comand5.errortext2, title: settingAdmin.comands.comand5.errortitle2});
                return;
              }

              const targetUser6 = await logs(command[2], "gift")


              if (targetUser6 == "no") {
                await logGeneral(login, "command", `Команду: ${command} не удалось выполнить: ${settingAdmin.comands.comand5.errortext1}`);
                res.json({ error: true, text: settingAdmin.comands.comand5.errortext1, title: settingAdmin.comands.comand5.errortitle1});
                return;
              }
              await logGeneral(login, "command", `Команда: ${command} успешно выполнена`);
              res.json({ error: true, text: JSON.stringify(targetUser6), title: `${settingAdmin.comands.comand5.title} ${command[2]}` });
              return;

            case "name":
              if (!command[2]) {
                await logGeneral(login, "command", `Команду: ${command} не удалось выполнить: ${settingAdmin.comands.comand5.errortext2}`);
                res.json({ error: true, text: settingAdmin.comands.comand5.errortext2, title: settingAdmin.comands.comand5.errortitle2});
                return;
              }

              const targetUser7 = await logs(command[2], "name")


              if (targetUser7 == "no") {
                await logGeneral(login, "command", `Команду: ${command} не удалось выполнить: ${settingAdmin.comands.comand5.errortext1}`);
                res.json({ error: true, text: settingAdmin.comands.comand5.errortext1, title: settingAdmin.comands.comand5.errortitle1});
                return;
              }
              await logGeneral(login, "command", `Команда: ${command} успешно выполнена`);
              res.json({ error: true, text: JSON.stringify(targetUser7), title: `${settingAdmin.comands.comand5.title} ${command[2]}` });
              return;

            case "command":
              if (!command[2]) {
                await logGeneral(login, "command", `Команду: ${command} не удалось выполнить: ${settingAdmin.comands.comand5.errortext2}`);
                res.json({ error: true, text: settingAdmin.comands.comand5.errortext2, title: settingAdmin.comands.comand5.errortitle2});
                return;
              }

              const targetUser8 = await logs(command[2], "command")


              if (targetUser8 == "no") {
                await logGeneral(login, "command", `Команду: ${command} не удалось выполнить: ${settingAdmin.comands.comand5.errortext1}`);
                res.json({ error: true, text: settingAdmin.comands.comand5.errortext1, title: settingAdmin.comands.comand5.errortitle1});
                return;
              }
              await logGeneral(login, "command", `Команда: ${command} успешно выполнена`);
              res.json({ error: true, text: JSON.stringify(targetUser8), title: `${settingAdmin.comands.comand5.title} ${command[2]}` });
              return;

            case "server":
              if (!command[2]) {
                await logGeneral(login, "command", `Команду: ${command} не удалось выполнить: ${settingAdmin.comands.comand5.errortext2}`);
                res.json({ error: true, text: settingAdmin.comands.comand5.errortext2, title: settingAdmin.comands.comand5.errortitle2});
                return;
              }

              const targetUser9 = await logs(command[2], "server")


              if (targetUser9 == "no") {
                await logGeneral(login, "command", `Команду: ${command} не удалось выполнить: ${settingAdmin.comands.comand5.errortext1}`);
                res.json({ error: true, text: settingAdmin.comands.comand5.errortext1, title: settingAdmin.comands.comand5.errortitle1});
                return;
              }
              await logGeneral(login, "command", `Команда: ${command} успешно выполнена`);
              res.json({ error: true, text: JSON.stringify(targetUser9), title: `${settingAdmin.comands.comand5.title} ${command[2]}` });
              return;

            case "warning":
              if (!command[2]) {
                await logGeneral(login, "command", `Команду: ${command} не удалось выполнить: ${settingAdmin.comands.comand5.errortext2}`);
                res.json({ error: true, text: settingAdmin.comands.comand5.errortext2, title: settingAdmin.comands.comand5.errortitle2});
                return;
              }

              const targetUser10 = await logs(command[2], "warning")


              if (targetUser10 == "no") {
                await logGeneral(login, "command", `Команду: ${command} не удалось выполнить: ${settingAdmin.comands.comand5.errortext1}`);
                res.json({ error: true, text: settingAdmin.comands.comand5.errortext1, title: settingAdmin.comands.comand5.errortitle1});
                return;
              }
              await logGeneral(login, "command", `Команда: ${command} успешно выполнена`);
              res.json({ error: true, text: JSON.stringify(targetUser10), title: `${settingAdmin.comands.comand5.title} ${command[2]}` });
              return;

            case "ban":
              if (!command[2]) {
                await logGeneral(login, "command", `Команду: ${command} не удалось выполнить: ${settingAdmin.comands.comand5.errortext2}`);
                res.json({ error: true, text: settingAdmin.comands.comand5.errortext2, title: settingAdmin.comands.comand5.errortitle2});
                return;
              }

              const targetUser11 = await logs(command[2], "ban")


              if (targetUser11 == "no") {
                await logGeneral(login, "command", `Команду: ${command} не удалось выполнить: ${settingAdmin.comands.comand5.errortext1}`);
                res.json({ error: true, text: settingAdmin.comands.comand5.errortext1, title: settingAdmin.comands.comand5.errortitle1});
                return;
              }
              await logGeneral(login, "command", `Команда: ${command} успешно выполнена`);
              res.json({ error: true, text: JSON.stringify(targetUser11), title: `${settingAdmin.comands.comand5.title} ${command[2]}` });
              return;
          
            default:
              await logGeneral(login, "command", `Команду: ${command} не удалось выполнить: ${settingAdmin.comands.comand5.errortext1}`);
              res.json({ error: true, text: settingAdmin.comands.comand5.errortext1, title: settingAdmin.comands.comand5.errortitle1});
              return;
          }
          
          // if (subParam === "gift") {
          //   // Формат: /info gift <playerName>
          //   if (!command[2]) {
          //     await logGeneral(login, "command", `Команду: ${command} не удалось выполнить: ${settingAdmin.comands.comand5.errortext2}`);
          //     res.json({ error: true, text: settingAdmin.comands.comand5.errortext2, title: settingAdmin.comands.comand5.errortitle2});
          //     return;
          //   }
          //   const targetUser = await User.findOne({
          //     $or: [
          //       { "account.login": command[1] },
          //       { "account.name": command[1].toLowerCase() }
          //     ]
          //   });
          //   if (!targetUser) {
          //     await logGeneral(login, "command", `Команду: ${command} не удалось выполнить: ${settingAdmin.comands.comand5.errortext1}`);
          //     res.json({ error: true, text: settingAdmin.comands.comand5.errortext1, title: settingAdmin.comands.comand5.errortitle1});
          //     return;
          //   }
          //   const playerLog = await PlayerLog.findOne({ login: targetUser.account.login });
          //   const lastInteractions = (playerLog && Array.isArray(playerLog.interactions))
          //     ? playerLog.interactions.slice(-45)
          //     : [];
          //   await logGeneral(login, "command", `Команда: ${command} успешно выполнена`);
          //   res.json({ error: true, text: JSON.stringify(lastInteractions), title: `${settingAdmin.comands.comand5.title} ${targetUser.account.name}` });
          //   return;
          // } else if (subParam === "logs") {
          //   // Формат: /info logs <playerName>
          //   if (!command[2]) {
          //     await logGeneral(login, "command", `Команду: ${command} не удалось выполнить: ${settingAdmin.comands.comand5.errortext2}`);
          //     res.json({ error: true, text: settingAdmin.comands.comand5.errortext2, title: settingAdmin.comands.comand5.errortitle2});
          //     return;
          //   }
          //   const targetUser = await User.findOne({
          //     $or: [
          //       { "account.login": command[1] },
          //       { "account.name": command[1].toLowerCase() }
          //     ]
          //   });
          //   if (!targetUser) {
          //     await logGeneral(login, "command", `Команду: ${command} не удалось выполнить: ${settingAdmin.comands.comand5.errortext1}`);
          //     res.json({ error: true, text: settingAdmin.comands.comand5.errortext1, title: settingAdmin.comands.comand5.errortitle1});
          //     return;
          //   }
          //   const playerLog = await PlayerLog.findOne({ login: targetUser.account.login });
          //   const lastLogs = (playerLog && Array.isArray(playerLog.logs))
          //     ? playerLog.logs.slice(-45)
          //     : [];
          //   await logGeneral(login, "command", `Команда: ${command} успешно выполнена`);
          //   res.json({ error: true, text: JSON.stringify(lastLogs), title: `${settingAdmin.comands.comand5.title} ${targetUser.account.name}` });
          //   return;
          // } else if (subParam === "name") {
          //   // const target = command[2].trim();
          //   // // Создаем регулярное выражение для точного совпадения, без учета регистра.
          //   // const regex = new RegExp(`^${target}$`, "i");
            
          //   // try {
          //   //   const logs = await PlayerLog.find({
          //   //     $or: [
          //   //       { "additional.oldname": { $regex: regex } },
          //   //       { "additional.newname": { $regex: regex } }
          //   //     ]
          //   //   });
          //   //   res.json({ error: true, text: targetUser.profile, title: `${settingAdmin.comands.comand5.title} ${targetUser.account.name}`});
          //   //   return logs;
          //   // } catch (error) {
          //   //   console.error("Error querying logs by nickname:", error);
          //   //   return [];
          //   // }
          // } else {
          //   const targetUser1 = await User.findOne({
          //     $or: [
          //       { "account.login": command[1] },
          //       { "account.name": command[1].toLowerCase() }
          //     ]
          //   });
          //   if (!targetUser1) {
          //     await logGeneral(login, "command", `Команду: ${command} не удалось выполнить: ${settingAdmin.comands.comand5.errortext1}`);
          //     res.json({ error: true, text: settingAdmin.comands.comand5.errortext1, title: settingAdmin.comands.comand5.errortitle1});
          //     return;
          //   }
          //   // Если подкоманда не указана, считаем, что передан просто player name для вывода профиля
          //   const targetUser = await Save.findOne({ "login": targetUser1.account.login });
          //   if (targetUser) {
          //     await logGeneral(login, "command", `Команда: ${command} успешно выполнена`);
          //     res.json({ error: true, text: targetUser.profile, title: `${settingAdmin.comands.comand5.title} ${targetUser.account.name}`});
          //   } else {
          //     await logGeneral(login, "command", `Команду: ${command} не удалось выполнить: ${settingAdmin.comands.comand5.errortext1}`);
          //     res.json({ error: true, text: settingAdmin.comands.comand5.errortext1, title: settingAdmin.comands.comand5.errortitle1});
          //   }
          //   return;
          // }

        // Команда 6: Добавить в список mute
        case settingAdmin.comands.comand6.name:
            if (command[1]) {
              const targetUser = await User.findOne({
                $or: [
                  { "account.login": command[1] },
                  { "account.name": command[1].toLowerCase() }
                ]
              });
              if (targetUser) {
                const banDoc = await Ban.findOne({}) || new Ban();
                if (!Array.isArray(banDoc.mute)) {
                  banDoc.mute = [];
                }
                if (!banDoc.mute.includes(targetUser.account.login)) {
                  banDoc.mute.push(targetUser.account.login);
                  await banDoc.save();
                }
                await logGeneral(targetUser.account.login, "ban", `причина: ${command}`);
                await logGeneral(login, "command", `Команда: ${command} успешно выполнена`);
                res.json({ error: true, text: settingAdmin.comands.comand6.text, title: `${settingAdmin.comands.comand6.title} ${targetUser.account.login}`});
                return;
              }
              await logGeneral(login, "command", `Команду: ${command} не удалось выполнить: ${settingAdmin.comands.comand6.errortext1}`);
              res.json({ error: true, text: settingAdmin.comands.comand6.errortext1, title: settingAdmin.comands.comand6.errortitle1});
            } else {
              await logGeneral(login, "command", `Команду: ${command} не удалось выполнить: ${settingAdmin.comands.comand6.errortext2}`);
              res.json({ error: true, text: settingAdmin.comands.comand6.errortext2, title: settingAdmin.comands.comand6.errortitle2});
            }
            break;

      // Команда 7: Убрать из списка mute
      case settingAdmin.comands.comand7.name:
        if (command[1]) {
          const targetUser = await User.findOne({
            $or: [
              { "account.login": command[1] },
              { "account.name": command[1].toLowerCase() }
            ]
          });
          if (targetUser) {
            const banDoc = await Ban.findOne({}) || new Ban();
            if (!Array.isArray(banDoc.mute)) {
              banDoc.mute = [];
            }
            const filteredMute = banDoc.mute.filter((p: string) => p !== targetUser.account.login);
            if (filteredMute.length === banDoc.mute.length) {
              await logGeneral(login, "command", `Команду: ${command} не удалось выполнить: ${settingAdmin.comands.comand7.errortext1}`);
              res.json({ error: true, text: settingAdmin.comands.comand7.errortext1, title: settingAdmin.comands.comand7.errortitle1});
              return;
            }
            banDoc.mute = filteredMute;
            await banDoc.save();
            await logGeneral(login, "command", `Команда: ${command} успешно выполнена`);
            res.json({ error: true, text: settingAdmin.comands.comand7.text, title: `${settingAdmin.comands.comand7.title} ${targetUser.account.login}`});
            return;
          }
          await logGeneral(login, "command", `Команду: ${command} не удалось выполнить: ${settingAdmin.comands.comand7.errortext1}`);
          res.json({ error: true, text: settingAdmin.comands.comand7.errortext1, title: settingAdmin.comands.comand7.errortitle1});
        } else {
          await logGeneral(login, "command", `Команду: ${command} не удалось выполнить: ${settingAdmin.comands.comand7.errortext2}`);
          res.json({ error: true, text: settingAdmin.comands.comand7.errortext2, title: settingAdmin.comands.comand7.errortitle2});
        }
        break;

      // Команда 8: Установить активную команду (edit item) для пользователя через ActiveCommand
      case settingAdmin.comands.comand8.name:
        if (!command[1]) {
          await logGeneral(login, "command", `Команду: ${command} не удалось выполнить: ${settingAdmin.comands.comand8.errortext2}`);
          res.json({ error: true, text: settingAdmin.comands.comand8.errortext2, title: settingAdmin.comands.comand8.errortitle2});
          return;
        }
        if (!command[2]) {
          await logGeneral(login, "command", `Команду: ${command} не удалось выполнить: ${settingAdmin.comands.comand8.errortext3}`);
          res.json({ error: true, text: settingAdmin.comands.comand8.errortext3, title: settingAdmin.comands.comand8.errortitle3});
          return;
        }
        if (!command[3]) {
          await logGeneral(login, "command", `Команду: ${command} не удалось выполнить: ${settingAdmin.comands.comand8.errortext4}`);
          res.json({ error: true, text: settingAdmin.comands.comand8.errortext4, title: settingAdmin.comands.comand8.errortitle4});
          return;
        }
        const targetUser8 = await User.findOne({
          $or: [
            { "account.login": command[1] },
            { "account.name": command[1].toLowerCase() }
          ]
        });
        if (targetUser8) {
          if (command[2] === "caps") {
            await ActiveCommand.findOneAndUpdate(
              { login: targetUser8.account.login },
              { command: { id: "caps", count: Number(command[3]) } },
              { upsert: true, new: true }
            );
          } else {
            await ActiveCommand.findOneAndUpdate(
              { login: targetUser8.account.login },
              { command: { id: command[2], count: Number(command[3]) } },
              { upsert: true, new: true }
            );
          }
          await logGeneral(login, "command", `Команда: ${command} успешно выполнена`);
          res.json({ error: true, text: settingAdmin.comands.comand8.text, title: `${settingAdmin.comands.comand8.title} ${targetUser8.account.login}`});
          return;
        }
        await logGeneral(login, "command", `Команду: ${command} не удалось выполнить: ${settingAdmin.comands.comand8.errortext1}`);
        res.json({ error: true, text: settingAdmin.comands.comand8.errortext1, title: settingAdmin.comands.comand8.errortitle1});
        break;

      // Команда 9: Установить активную команду (remove item) для пользователя через ActiveCommand
      case settingAdmin.comands.comand9.name:
        if (!command[1]) {
          await logGeneral(login, "command", `Команду: ${command} не удалось выполнить: ${settingAdmin.comands.comand9.errortext2}`);
          res.json({ error: true, text: settingAdmin.comands.comand9.errortext2, title: settingAdmin.comands.comand9.errortitle2});
          return;
        }
        if (!command[2]) {
          await logGeneral(login, "command", `Команду: ${command} не удалось выполнить: ${settingAdmin.comands.comand9.errortext3}`);
          res.json({ error: true, text: settingAdmin.comands.comand9.errortext3, title: settingAdmin.comands.comand9.errortitle3});
          return;
        }
        if (!command[3]) {
          await logGeneral(login, "command", `Команду: ${command} не удалось выполнить: ${settingAdmin.comands.comand9.errortext4}`);
          res.json({ error: true, text: settingAdmin.comands.comand9.errortext4, title: settingAdmin.comands.comand9.errortitle4});
          return;
        }
        const targetUser9 = await User.findOne({
          $or: [
            { "account.login": command[1] },
            { "account.name": command[1].toLowerCase() }
          ]
        });
        if (targetUser9) {
          await ActiveCommand.findOneAndUpdate(
            { login: targetUser9.account.login },
            { command: { id: "removeItem", name: command[2], count: Number(command[3]) } },
            { upsert: true, new: true }
          );
          await logGeneral(login, "command", `Команда: ${command} успешно выполнена`);
          res.json({ error: true, text: settingAdmin.comands.comand9.text, title: `${settingAdmin.comands.comand9.title} ${targetUser9.account.login}`});
          return;
        }
        await logGeneral(login, "command", `Команду: ${command} не удалось выполнить: ${settingAdmin.comands.comand9.errortext1}`);
        res.json({ error: true, text: settingAdmin.comands.comand9.errortext1, title: settingAdmin.comands.comand9.errortitle1});
        break;

      // Команда 10: Удалить активную команду для пользователя (remove all items)
      case settingAdmin.comands.comand10.name:
        if (command[1]) {
          const targetUser10 = await User.findOne({ "account.login": command[1].toLowerCase() });
          if (targetUser10) {
            await ActiveCommand.deleteOne({ login: targetUser10.account.login });
            await logGeneral(login, "command", `Команда: ${command} успешно выполнена`);
            res.json({ error: true, text: settingAdmin.comands.comand10.text, title: `${settingAdmin.comands.comand10.title} ${targetUser10.account.login}`});
            return;
          }
          await logGeneral(login, "command", `Команду: ${command} не удалось выполнить: ${settingAdmin.comands.comand10.errortext1}`);
          res.json({ error: true, text: settingAdmin.comands.comand10.errortext1, title: settingAdmin.comands.comand10.errortitle1});
        } else {
          await logGeneral(login, "command", `Команду: ${command} не удалось выполнить: ${settingAdmin.comands.comand10.errortext2}`);
          res.json({ error: true, text: settingAdmin.comands.comand10.errortext2, title: settingAdmin.comands.comand10.errortitle2});
        }
        break;

      // Команда 11: Изменить логин пользователя (смена ника)
      case settingAdmin.comands.comand11.name:
        if (!command[1]) {
          await logGeneral(login, "command", `Команду: ${command} не удалось выполнить: ${settingAdmin.comands.comand11.errortext2}`);
          res.json({ error: true, text: settingAdmin.comands.comand11.errortext2, title: settingAdmin.comands.comand11.errortitle2});
          return;
        }
        if (!command[2]) {
          await logGeneral(login, "command", `Команду: ${command} не удалось выполнить: ${settingAdmin.comands.comand11.errortext3}`);
          res.json({ error: true, text: settingAdmin.comands.comand11.errortext3, title: settingAdmin.comands.comand11.errortitle3});
          return;
        }
        const targetUser11 = await User.findOne({ "account.login": command[1] });
        if (targetUser11) {
          const allUsers = await User.findOne({ "account.name": command[2].toLowerCase() });
          
          if (allUsers) {
            await logGeneral(login, "command", `Команду: ${command} не удалось выполнить: ${settingAdmin.comands.comand11.errortext4}`);
            res.json({ error: true, text: settingAdmin.comands.comand11.errortext4, title: settingAdmin.comands.comand11.errortitle4});
            return;
          }
          targetUser11.account.name = command[2].toLowerCase();
          await ActiveCommand.findOneAndUpdate(
            { login: targetUser11.account.login },
            { command: { id: "editname", name: command[2] } },
            { upsert: true, new: true }
          );
          await targetUser11.save();
          await logGeneral(login, "command", `Команда: ${command} успешно выполнена`);
          res.json({ error: true, text: settingAdmin.comands.comand11.text, title: `${settingAdmin.comands.comand11.title} ${targetUser11.account.login}`});
          return;
        }
        await logGeneral(login, "command", `Команду: ${command} не удалось выполнить: ${settingAdmin.comands.comand11.errortext1}`);
        res.json({ error: true, text: settingAdmin.comands.comand11.errortext1, title: settingAdmin.comands.comand11.errortitle1});
        break;

      // Команда 12: Бан пользователя
      case settingAdmin.comands.comand12.name:
        if (command[1]) {
          const targetUser12 = await User.findOne({
            $or: [
              { "account.login": command[1] },
              { "account.name": command[1].toLowerCase() }
            ]
          });
          if (targetUser12) {
            await ban(targetUser12.account.login, true)
            targetUser12.account.login = `${targetUser12.account.login} BAN`
            targetUser12.save()
            const userGiftsDocs = await UserGift.find({});
            for (const ug of userGiftsDocs) {
              ug.gifts = ug.gifts.filter((gift: { sender: string }) => gift.sender !== targetUser12.account.login);
              await ug.save();
            }
            await logGeneral(targetUser12.account.login, "ban", `причина: ${command}`);
            await logGeneral(login, "command", `Команда: ${command} успешно выполнена`);
            res.json({ error: true, text: settingAdmin.comands.comand12.text, title: `${settingAdmin.comands.comand12.title} ${targetUser12.account.login}`});
            return;
          }
          await logGeneral(login, "command", `Команду: ${command} не удалось выполнить: ${settingAdmin.comands.comand3.errortext1}`);
          res.json({ error: true, text: settingAdmin.comands.comand12.errortext1, title: settingAdmin.comands.comand12.errortitle1});
        } else {
          await logGeneral(login, "command", `Команду: ${command} не удалось выполнить: ${settingAdmin.comands.comand3.errortext2}`);
          res.json({ error: true, text: settingAdmin.comands.comand12.errortext2, title: settingAdmin.comands.comand12.errortitle2});
        }
        break;

      // Команда 13: Разбан (удаление из бан-листа)
      case settingAdmin.comands.comand13.name:
        if (command[1]) {
          const targetUser13 = await User.findOne({
            $or: [
              { "account.login": command[1] },
              { "account.name": command[1].toLowerCase() }
            ]
          });
          if (targetUser13) {
            await unban(targetUser13.account.login, true);
            targetUser13.account.login = targetUser13.account.login.split(" ")[0]
            targetUser13.save()
            await logGeneral(login, "command", `Команда: ${command} успешно выполнена`);
            res.json({ error: true, text: settingAdmin.comands.comand13.text, title: `${settingAdmin.comands.comand13.title} ${targetUser13.account.login}`});
            return;

          } else {
            await logGeneral(login, "command", `Команду: ${command} не удалось выполнить: ${settingAdmin.comands.comand13.errortext1}`);
            res.json({ error: true, text: settingAdmin.comands.comand13.errortext1, title: settingAdmin.comands.comand13.errortitle1});
            return;
          }
        } else {
          await logGeneral(login, "command", `Команду: ${command} не удалось выполнить: ${settingAdmin.comands.comand13.errortext2}`);
          res.json({ error: true, text: settingAdmin.comands.comand13.errortext2, title: settingAdmin.comands.comand13.errortitle2});
        }
        break;

      // Команда 14: Удаление сообщений чата по логину
      case settingAdmin.comands.comand14.name:
        if (command[1]) {
          const targetLoginForChat = command[1]
          const channels = ["1", "2"];
          for (const channel of channels) {
            const chat = await ChatMessage.findOne({ channel });
            if (chat && Array.isArray(chat.messages)) {
              chat.messages = chat.messages.filter((msg: { name: string; text: string, login: string }) => msg.login !== targetLoginForChat);
              chat.markModified("messages");
              await chat.save();
            }
          }
          await logGeneral(login, "command", `Команда: ${command} успешно выполнена`);
          res.json({ error: true, text: settingAdmin.comands.comand14.text, title: settingAdmin.comands.comand14.title});
          return;
        }  else {
          await logGeneral(login, "command", `Команду: ${command} не удалось выполнить: ${settingAdmin.comands.comand14.errortext2}`);
          res.json({ error: true, text: settingAdmin.comands.comand14.errortext2, title: settingAdmin.comands.comand14.errortitle2});
          return
        }

      // Команда 15: Удаление подарков, отправленных пользователем
      case settingAdmin.comands.comand15.name:
        if (command[1]) {
          const targetUser15 = await User.findOne({
            $or: [
              { "account.login": command[1] },
              { "account.name": command[1].toLowerCase() }
            ]
          });
          if (targetUser15) {
            const userGiftsDocs = await UserGift.find({});
            for (const ug of userGiftsDocs) {
              ug.gifts = ug.gifts.filter((gift: { sender: string }) => gift.sender !== targetUser15.account.login);
              await ug.save();
            }
            await logGeneral(login, "command", `Команда: ${command} успешно выполнена`);
            res.json({ error: true, text: settingAdmin.comands.comand15.text, title: settingAdmin.comands.comand15.title});
            return;
          } else {
            await logGeneral(login, "command", `Команду: ${command} не удалось выполнить: ${settingAdmin.comands.comand4.errortext1}`);
            res.json({ error: true, text: settingAdmin.comands.comand15.errortext1, title: settingAdmin.comands.comand15.errortitle1});
          }
        } else {
          await logGeneral(login, "command", `Команду: ${command} не удалось выполнить: ${settingAdmin.comands.comand4.errortext2}`);
          res.json({ error: true, text: settingAdmin.comands.comand15.errortext2, title: settingAdmin.comands.comand15.errortitle2});
        }
        break;

      // Команда 16: Включение флага для админа (установка admin.name = true)
      case settingAdmin.comands.comand16.name:
        if (settingAdmin.admin[login]) {
          settingAdmin.admin[login].name = true;
        }
        await logGeneral(login, "command", `Команда: ${command} успешно выполнена`);
        res.json({ error: true, text: settingAdmin.comands.comand16.text, title: settingAdmin.comands.comand16.title});
        return;

      // Команда 17: Выключение флага для админа (установка admin.name = false)
      case settingAdmin.comands.comand17.name:
        if (settingAdmin.admin[login]) {
          settingAdmin.admin[login].name = false;
        }
        await logGeneral(login, "command", `Команда: ${command} успешно выполнена`);
        res.json({ error: true, text: settingAdmin.comands.comand17.text, title: settingAdmin.comands.comand17.title});
        return;

      // Команда 18: отключения посылок
      case settingAdmin.comands.comand18.name:
        if (command[1]) {
          const targetUser = await User.findOne({
            $or: [
              { "account.login": command[1] },
              { "account.name": command[1].toLowerCase() }
            ]
          });
          if (targetUser) {
            const banDoc = await Ban.findOne({}) || new Ban();
            if (!Array.isArray(banDoc.gift)) {
              banDoc.gift = [];
            }
            if (!banDoc.gift.includes(targetUser.account.login)) {
              banDoc.gift.push(targetUser.account.login);
              await banDoc.save();
            }
            await logGeneral(targetUser.account.login, "ban", `причина: ${command}`);
            await logGeneral(login, "command", `Команда: ${command} успешно выполнена`);
            res.json({ error: true, text: settingAdmin.comands.comand18.text, title: `${settingAdmin.comands.comand18.title} ${targetUser.account.login}`});
            return;
          }
          await logGeneral(login, "command", `Команду: ${command} не удалось выполнить: ${settingAdmin.comands.comand18.errortext1}`);
          res.json({ error: true, text: settingAdmin.comands.comand18.errortext1, title: settingAdmin.comands.comand18.errortitle1});
        } else {
          await logGeneral(login, "command", `Команду: ${command} не удалось выполнить: ${settingAdmin.comands.comand18.errortext2}`);
          res.json({ error: true, text: settingAdmin.comands.comand18.errortext2, title: settingAdmin.comands.comand18.errortitle2});
        }
        break;

      // Команда 19: включение передачи посылок
      case settingAdmin.comands.comand19.name:
        if (command[1]) {
          const targetUser = await User.findOne({
            $or: [
              { "account.login": command[1] },
              { "account.name": command[1].toLowerCase() }
            ]
          });
          if (targetUser) {
            const banDoc = await Ban.findOne({}) || new Ban();
            if (!Array.isArray(banDoc.gift)) {
              banDoc.gift = [];
            }
            const filteredMute = banDoc.gift.filter((p: string) => p !== targetUser.account.login);
            if (filteredMute.length === banDoc.gift.length) {
              await logGeneral(login, "command", `Команду: ${command} не удалось выполнить: ${settingAdmin.comands.comand19.errortext1}`);
              res.json({ error: true, text: settingAdmin.comands.comand19.errortext1, title: settingAdmin.comands.comand19.errortitle1});
              return;
            }
            banDoc.gift = filteredMute;
            await banDoc.save();
            await logGeneral(login, "command", `Команда: ${command} успешно выполнена`);
            res.json({ error: true, text: settingAdmin.comands.comand19.text, title: `${settingAdmin.comands.comand19.title} ${targetUser.account.login}`});
            return;
          }
          await logGeneral(login, "command", `Команду: ${command} не удалось выполнить: ${settingAdmin.comands.comand19.errortext1}`);
          res.json({ error: true, text: settingAdmin.comands.comand19.errortext1, title: settingAdmin.comands.comand19.errortitle1});
        } else {
          await logGeneral(login, "command", `Команду: ${command} не удалось выполнить: ${settingAdmin.comands.comand19.errortext2}`);
          res.json({ error: true, text: settingAdmin.comands.comand19.errortext2, title: settingAdmin.comands.comand19.errortitle2});
        }
        break;

      // Команда 20: Включение флага для админа (установка admin.logs = true)
      case settingAdmin.comands.comand20.name:
        if (settingAdmin.admin[login]) {
          settingAdmin.admin[login].logs = true;
        }
        await logGeneral(login, "command", `Команда: ${command} успешно выполнена`);
        res.json({ error: true, text: settingAdmin.comands.comand20.text, title: settingAdmin.comands.comand20.title});
        return;

      // Команда 21: Выключение флага для админа (установка admin.logs = false)
      case settingAdmin.comands.comand21.name:
        if (settingAdmin.admin[login]) {
          settingAdmin.admin[login].logs = false;
        }
        await logGeneral(login, "command", `Команда: ${command} успешно выполнена`);
        res.json({ error: true, text: settingAdmin.comands.comand21.text, title: settingAdmin.comands.comand21.title});
        return;

      default:
        res.json({ error: true, text: settingAdmin.comands.errorComand.text, title: settingAdmin.comands.errorComand.title });
        return;
    }
  }
}
