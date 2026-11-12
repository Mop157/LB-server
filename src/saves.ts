import "dotenv/config";
import mongoose, { Schema, Document } from "mongoose";

const mongoUri = process.env.MONGO_URI ?? "mongodb://127.0.0.1:27017/mygame";
mongoose.connect(mongoUri)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

// Модель пользователя (User)
interface IUser extends Document {
  account: {
    login: string;
    name: string;
    token: string;
    ID: string;
    IP: string;
  };
  profile?: any;
}
const UserSchema: Schema = new Schema({
  account: {
    login: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    token: { type: String, required: true },
    ID: { type: String, default: "null" },
    IP: { type: String, default: "null" }
  },
  profile: { type: Schema.Types.Mixed }
});
const User = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

// Новая модель для сохранений (Save)
interface ISave extends Document {
  login: string;
  profile: any;
}
const SaveSchema: Schema = new Schema({
  login: { type: String, required: true },
  profile: { type: Schema.Types.Mixed, required: true }
});
const Save = mongoose.models.Save || mongoose.model<ISave>("Save", SaveSchema);

// Функция миграции: перенос профиля и логина в коллекцию Save и удаление profile из User
async function migrateProfileToSave() {
  try {
    // Находим всех пользователей, у которых определено поле profile
    const usersToMigrate = await User.find({ profile: { $exists: true, $ne: null } });
    console.log(`Найдено пользователей для миграции: ${usersToMigrate.length}`);
    
    for (const user of usersToMigrate) {
      const userLogin = user.account.login;
      const userProfile = user.profile;
      
      // Создаем новый документ Save
      const newSave = new Save({
        login: userLogin,
        profile: userProfile
      });
      await newSave.save();
      console.log(`Создан документ Save для пользователя ${userLogin}`);
      
      // Обновляем пользователя, удаляя поле profile
      user.profile = undefined; // либо delete user.profile;
      await user.save();
      console.log(`Поле profile удалено для пользователя ${userLogin}`);
    }
    
    console.log("Миграция завершена успешно.");
  } catch (error) {
    console.error("Ошибка миграции:", error);
  } finally {
    mongoose.connection.close();
  }
}

migrateProfileToSave();
