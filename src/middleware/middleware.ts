import { NextFunction, Response, Request } from "express";
import setting from "../setting/setting";
import { logGeneral } from "../logger";
import { User, Ban } from "../database/database"; // Предполагается, что модели User и Ban определены в models.ts

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

const check = async (req: Request, res: Response, next: NextFunction) => {
  const { code, login, version } = req.body;
  if (!code || !login || !version || version !== setting.version) {
    res.status(421).json({ error: "Missing token", text: "обновите апк или у вас ошибка входа в акк" });
    return;
  }
  try {
    const banData = await Ban.findOne({}).lean();
    if (
      (Array.isArray(banData?.login) && banData.login.includes(login)) ||
      (req.ip && Array.isArray(banData?.IP) && banData.IP.includes(req.ip))
    ) {
      logGeneral(login, "logs", "Игрок забанен", { ip: req.ip, userAgent: req.headers["user-agent"] });
      res.status(401).json({ error: true, text: "вы в бане" });
      return;
    }

    const user = await User.findOne({ "account.login": login });
    if (user && user.account.token === code) {
      req.body.user = user;
      next();
    } else {
      res.status(401).json({ error: true, text: "ошибка входа в акк" });
    }
  } catch (error) {
    console.error("Authentication check failed:", error);
    res.status(500).json({ error: true, text: "ошибка сервера авторизации" });
  }
};

export default check;
