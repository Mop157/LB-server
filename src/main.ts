
import "dotenv/config";

const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
const dbName = process.env.DB_NAME || 'mygame';

async function main() {
  const client = new MongoClient(uri, { useUnifiedTopology: true });
  try {
    await client.connect();
    const db = client.db(dbName);
    const coinsCol = db.collection('coins');
    const usersCol = db.collection('users');

    // 1) Получаем список login из coins.users, где users.userAgents.length > 4
    const pipeline = [
      // { $unwind: '$coins' },
      {
        $match: {
          $expr: { $gt: [ { $size: { $ifNull: ['$userAgents', []] } }, 4 ] }
        }
      },
      { $group: { _id: null, logins: { $addToSet: '$login' } } }
    ];

    const agg = await coinsCol.aggregate(pipeline).toArray();
    const logins = (agg[0] && agg[0].logins) ? agg[0].logins : [];

    console.log(`Найдено login'ов: ${logins.length}`);

    if (logins.length === 0) {
      console.log('Нет пользователей с userAgents.length > 4');
      return;
    }

    // 2) Для каждого login ищем документ в users по account.login
    // и выводим ник или "ник не найден".
    const checks = logins.map(async (login: any) => {
      let userDoc = await usersCol.findOne({ 'account.login': login });
      if (!userDoc) {
        login = `${login} BAN`
        userDoc = await usersCol.findOne({ 'account.login': login });

        if (!userDoc) {
          console.log(`${login} — ник не найден`);
          return { login, found: false };
        }
      }
    
      // пытаемся найти поле с ником (порядок приоритета: nick, nickname, username, name)
      const nickname =
        userDoc.account.name

      if (nickname) {
        console.log(`${login} -> ник: ${nickname}`);
        return { login, found: true, nickname };
      } else {
        console.log(`${login} -> найден пользователь, но поле ника отсутствует`);
        return { login, found: true, nickname: null };
      }
    });

    // дождёмся всех запросов (не падаем при ошибках отдельных запросов)
    const results = await Promise.allSettled(checks);
    // можно при желании обработать rejected
    const rejected = results.filter(r => r.status === 'rejected');
    if (rejected.length) {
      console.warn(`Имеются ошибки при обработке ${rejected.length} логинов.`);
    }

  } catch (err) {
    console.error('Ошибка:', err);
  } finally {
    await client.close();
  }
}

main();

