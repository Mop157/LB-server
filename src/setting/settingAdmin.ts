import {help} from "./textHelp";

interface comandAction {
  id?: string;
  count?: number;
  name?: string;
}

interface Setting {
  ytube: {
      [key: string]: {
        name: boolean
      };
    }
    user: { [key: string]: {
      bot: boolean
    }}
    admin: {
      [key: string]: {
        bot: boolean
        name: boolean
        logs: boolean
      };
    };
    list: string[];
    black_list: string[];
    red_list: string[]
    aktivitecomand: string
    comandsActive: {
      [key: string]: comandAction
    }
    comands: {
      [key: string]: {
        name?: string,
        text?: string,
        title?: string,
        errortext1?: string,
        errortitle1?: string
        errortext2?: string,
        errortitle2?: string
        errortext3?: string,
        errortitle3?: string
        errortext4?: string,
        errortitle4?: string
      };
    }
  }

const setting: Setting = {
    ytube: {
      "You lohin": {
        "name": true
      }
    },

    user: {
      "You login": {
        "bot": false
      }
    },

    admin: {
        
        "You login": { // админ 1
            "bot": false,
            "name": true,
            "logs": true
        },
    },
    list: ["admin1", "admin2"],  // список админов (хз работает или нет)
    black_list: ["user1", "user2"], // черный сисл (хз работает или нет)
    red_list: [], // красный лист (жестокий бан)
    comandsActive: {},

    // команды
    aktivitecomand: "/",

    comands: {
      comand0: {
        name: "/help",
        text: help,
        title: ")==]|•-=> (Команды) <=-•|[==(",

      },
      comand1: {
        name: "/true",
        text: "бот включен",
        title: "бот",

      },
      comand2: {
        name: "/false",
        text: "бот виключен",
        title: "бот",

      },
      comand3: {
        name: "/ban",
        text: `игрок забанен`,
        title: "игрок: ",
        errortext1: "Игрок не найден",
        errortitle1: "ошибка",
        errortext2: "Игрок не задан",
        errortitle2: "ошибка"
      },
      comand4: {
        name: "/unban",
        text: `игрок разбанен`,
        title: "игрок: ",
        errortext1: "Игрок не найден",
        errortitle1: "ошибка",
        errortext2: "Игрок не задан",
        errortitle2: "ошибка"
      },
      comand5: {
        name: "/info",
        title: "игрок: ",
        errortext1: "Игрок не найден",
        errortitle1: "ошибка",
        errortext2: "Игрок не задан",
        errortitle2: "ошибка"
      },
      comand6: {
        name: "/mute",
        text: `игрок в муте`,
        title: "игрок: ",
        errortext1: "Игрок не найден",
        errortitle1: "ошибка",
        errortext2: "Игрок не задан",
        errortitle2: "ошибка"
      },
      comand7: {
        name: "/unmute",
        text: `игрок убран от мута`,
        title: "игрок: ",
        errortext1: "Игрок не найден",
        errortitle1: "ошибка",
        errortext2: "Игрок не задан",
        errortitle2: "ошибка"
      },
      comand8: {
        name: "/give",
        text: `игроку выдался предмет`,
        title: "игрок: ",
        errortext1: "Игрок не найден",
        errortitle1: "ошибка",
        errortext2: "Игрок не задан",
        errortitle2: "ошибка",
        errortext3: "предмет не задан",
        errortitle3: "ошибка",
        errortext4: "количество не задано",
        errortitle4: "ошибка"
      },
      comand9: {
        name: "/delitem",
        text: `от игрока удалился предмет`,
        title: "игрок: ",
        errortext1: "Игрок не найден",
        errortitle1: "ошибка",
        errortext2: "Игрок не задан",
        errortitle2: "ошибка",
        errortext3: "предмет не задан",
        errortitle3: "ошибка",
        errortext4: "количество не задано",
        errortitle4: "ошибка"
      },
      comand10: {
        name: "/clearinventory15",
        text: `инвентарь игрока очистился`,
        title: "игрок: ",
        errortext1: "Игрок не найден",
        errortitle1: "ошибка",
        errortext2: "Игрок не задан",
        errortitle2: "ошибка",
      },
      comand11: {
        name: "/name",
        text: `ник игрока изменен`,
        title: "игрок: ",
        errortext1: "Игрок не найден",
        errortitle1: "ошибка",
        errortext2: "старый ник не задан",
        errortitle2: "ошибка",
        errortext3: "новый ник не задан",
        errortitle3: "ошибка",
        errortext4: "новый ник уже занят, выберите другой",
        errortitle4: "ошибка"
      },
      comand12: {
        name: "/banid",
        text: `игрок забанен`,
        title: "игрок: ",
        errortext1: "Игрок не найден",
        errortitle1: "ошибка",
        errortext2: "Игрок не задан",
        errortitle2: "ошибка"
      },
      comand13: {
        name: "/unbanid",
        text: `игрок разбанен`,
        title: "игрок: ",
        errortext1: "Игрок не найден",
        errortitle1: "ошибка",
        errortext2: "Игрок не задан",
        errortitle2: "ошибка"
      },
      comand14: {
        name: "/clear",
        title: "игрок: ",
        text: "сообщения удалены",
        errortext1: "Игрок не найден",
        errortitle1: "ошибка",
        errortext2: "Игрок не задан",
        errortitle2: "ошибка"
      },
      comand15: {
        name: "/delgift",
        title: "игрок: ",
        text: "посылки удалены",
        errortext1: "Игрок не найден",
        errortitle1: "ошибка",
        errortext2: "Игрок не задан",
        errortitle2: "ошибка"
      },
      comand16: {
        name: "/truename",
        text: "цвет ника включен",
        title: "ник",

      },
      comand17: {
        name: "/falsename",
        text: "цвет ника виключен",
        title: "ник",

      },
      comand18: {
        name: "/offgift",
        text: `игрок больше не может отправлять посылки`,
        title: "игрок: ",
        errortext1: "Игрок не найден",
        errortitle1: "ошибка",
        errortext2: "Игрок не задан",
        errortitle2: "ошибка"
      },
      comand19: {
        name: "/ongift",
        text: `игроку включена возможность отправлять посылки`,
        title: "игрок: ",
        errortext1: "Игрок не найден",
        errortitle1: "ошибка",
        errortext2: "Игрок не задан",
        errortitle2: "ошибка"
      },
      comand20: {
        name: "/onlogs",
        text: "логи включены",
        title: "логи",

      },
      comand21: {
        name: "/offlogs",
        text: "логи виключены",
        title: "логи",

      },
      errorComand: {
        text: "команда не обнаружена",
        title: "ошибка"
      }
    }

}

export default setting