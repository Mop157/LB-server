// models.ts
import mongoose, { Document, model, Schema } from "mongoose";

/** Модель игрока */
export interface IPlayer extends Document {
  login: string;
  name: string;
  position: string; // JSON-строка с координатами, например: '{"x":4.41,"y":1.61}'
  power: string;
  caps: string;
  version: string;
  language: string;
  code: string;
  slot: string;
  lastUpdate: number;
  location: {
    type: "Point";
    coordinates: number[];
  };
}

const PlayerSchema: Schema = new Schema({
  login: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  position: { type: String, required: true },
  power: { type: String, required: true },
  caps: { type: String, required: true },
  version: { type: String, required: true },
  language: { type: String, required: true },
  slot: { type: String, required: true },
  // Поле для хранения координат в формате GeoJSON
  location: {
    type: { type: String, enum: ['Point'], required: true },
    coordinates: { type: [Number], required: true }
  },
  lastUpdate: { type: Number, required: true }
});

// Создаём геоспациальный индекс по полю location
PlayerSchema.index({ location: "2dsphere" });

export const Player = mongoose.model<IPlayer>("Player", PlayerSchema);

/** Модель пользователя */
export interface IUser extends Document {
  account: {
    login: string;
    name: string;
    newname: boolean;
    token: string;
    ID: string;   // Новое поле – идентификатор пользователя
    IP: string;   // Новое поле – IP-адрес
  };
}

const UserSchema: Schema = new Schema({
  account: {
    login: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    newname: { type: Boolean, default: false },
    token: { type: String, required: true },
    ID: { type: String, default: "null" },
    IP: { type: String, default: "null" }
  }
});

export const User = mongoose.model<IUser>("User", UserSchema);

export interface ISave extends Document {
  login: string;
  profile: any;
}

const SaveSchema: Schema = new Schema({
  login: { type: String, required: true, unique: true },
  profile: { type: Schema.Types.Mixed, required: true },
});

// Если модель уже скомпилирована, используем её
export const Save = mongoose.models.Save || mongoose.model<ISave>("Save", SaveSchema);

/** Модель сообщений чата.
 *  Для публичных каналов messages – массив сообщений,
 *  для приватных – может быть объектом с ключами по именам (в нижнем регистре).
 */
export interface IChatMessage extends Document {
  channel: string;
  messages: any[]; // Дополнительно можно типизировать структуру сообщений
}

const ChatMessageSchema: Schema = new Schema({
  channel: { type: String, required: true },
  messages: { 
    type: Schema.Types.Mixed, 
    default: function(this: any) {
      return (this.channel === "3" || this.channel === "4") ? {} : [];
    }
  }
});

export const ChatMessage = mongoose.model<IChatMessage>("ChatMessage", ChatMessageSchema);

/** Модель подарков пользователя */
export interface IUserGift extends Document {
  taker: string;
  gifts: any[]; // Массив подарков, каждый из которых может иметь произвольную структуру
}

const UserGiftSchema: Schema = new Schema({
  taker: { type: String, required: true, unique: true },
  gifts: { type: [Schema.Types.Mixed], default: [] }
});

export const UserGift = mongoose.model<IUserGift>("UserGift", UserGiftSchema);

/** Модель серверных событий.
 *  Используется для хранения произвольных данных.
 */
// models.ts (или models/ServerEvent.ts)
export interface IServerEvent extends Document {
  isEvent: boolean;
  message: {
    is: boolean;
    players: string[];
    playerAll: boolean;
    title: string;
    text: string;
  };
  item: {
    is: boolean;
    players: string[];
    playerAll: boolean;
    items: any;
  };
  itemGive: {
    is: boolean;
    players: string[];
    playerAll: boolean;
    items: any[];
  };
  promo: {
    is: boolean;
    listplayer: string[];
    list: Record<string, { text: string; count: number; items: any[] }>;
  };
  customEvent: {
    is: boolean;
    players: string[];
    playerAll: boolean;
    id: string;
    event: { title: string; text: string };
  };
  listtime: string[]; // новое поле для хранения логинов, которым уже отдано событие
}

const ServerEventSchema: Schema = new Schema(
  {
    // ваши существующие поля
    isEvent: { type: Boolean, default: false },
    message: { type: Object, default: {} },
    item: { type: Object, default: {} },
    itemGive: { type: Object, default: {} },
    promo: { type: Object, default: {} },
    customEvent: { type: Object, default: {} },
    listtime: { type: [String], default: [] },
  },
  { strict: false }
);

export const ServerEvent = mongoose.model<IServerEvent>("ServerEvent", ServerEventSchema);

/** Модель банов.
 *  Хранит массивы забаненных логинов, IP-адресов и идентификаторов.
 */
export interface IBan extends Document {
  login: string[];
  IP: string[];
  ID: string[];
  mute: string[];
  gift: string[];
}

const BanSchema: Schema = new Schema({
  login: { type: [String], default: [] },
  IP: { type: [String], default: [] },
  ID: { type: [String], default: [] },
  mute: { type: [String], default: [] },
  gift: { type: [String], default: [] }
});

export const Ban = mongoose.model<IBan>("Ban", BanSchema);

export interface IActiveCommand extends Document {
  login: string;
  command: {
    id: string;
    name?: string;
    count?: number;
  };
}

const ActiveCommandSchema: Schema = new Schema({
  login: { type: String, required: true, unique: true },
  command: {
    id: { type: String, required: true },
    name: { type: String },
    count: { type: Number }
  }
});

// Если модель уже существует – переиспользуем её
export const ActiveCommand = mongoose.models.ActiveCommand || mongoose.model<IActiveCommand>("ActiveCommand", ActiveCommandSchema);



export interface ICoinLog extends Document {
  login: string;
  userAgents: Array<{
    userAgent: string;
    count: number;
  }>;
}

const CoinLogSchema = new Schema<ICoinLog>({
  login:     { type: String, required: true, unique: true },
  userAgents:[{
    userAgent: { type: String, required: true },
    count:     { type: Number, required: true, default: 0 }
  }]
});

// Именованный экспорт вместо default
export const CoinLog = model<ICoinLog>("CoinLog", CoinLogSchema, "coins");