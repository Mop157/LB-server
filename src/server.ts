import "dotenv/config";
import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import morgan from "morgan";
import process from "process";
import serverRoutes from "./routes/serverRoutes";
import { startServerDiscovery } from "./serverDiscovery";
import setting from "./setting/setting";
import { ChatMessage, Player } from "./database/database";

const port = Number(process.env.PORT ?? setting.port);
const address = process.env.HOST ?? setting.adress;
const mongoUri = process.env.MONGO_URI ?? "mongodb://127.0.0.1:27017/mygame";
const discoveryPort = Number(process.env.DISCOVERY_PORT ?? 16262);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535");
}

if (!Number.isInteger(discoveryPort) || discoveryPort < 1 || discoveryPort > 65535) {
  throw new Error("DISCOVERY_PORT must be an integer between 1 and 65535");
}

const startServer = async () => {
  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB");

  const discoveryServer = startServerDiscovery(port, discoveryPort);
  const playerCleanup = setInterval(async () => {
    try {
      const currentTime = Math.floor(Date.now() / 1000);
      await Player.deleteMany({ lastUpdate: { $lt: currentTime - setting.TIMEOUT } });
    } catch (error) {
      console.error("Error cleaning stale players:", error);
    }
  }, 2 * 60 * 1000);

  const chatCleanup = setInterval(async () => {
    try {
      await ChatMessage.updateMany(
        { channel: { $in: ["1", "2"] } },
        [{ $set: { messages: { $slice: ["$messages", setting.limitechatmessage] } } }]
      );
    } catch (error) {
      console.error("Error trimming chat messages:", error);
    }
  }, 60 * 60 * 1000);

  const app = express();
  app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));
  app.use(bodyParser.json({ limit: "15mb" }));
  app.use(morgan("combined"));
  app.use("/api/", serverRoutes);

  app.use((req: Request, res: Response) => {
    res.status(404).json({ error: "Not found" });
  });

  const server = app.listen(port, address, () => {
    console.log(`Server is listening at http://${address}:${port}`);
  });

  let stopping = false;
  const stopServer = async (exitCode = 0) => {
    if (stopping) return;
    stopping = true;
    process.exitCode = exitCode;
    clearInterval(playerCleanup);
    clearInterval(chatCleanup);
    discoveryServer.close();
    if (server.listening) server.close();
    await mongoose.disconnect();
  };

  server.on("error", (error) => {
    console.error(`HTTP server failed to listen on ${address}:${port}:`, error);
    void stopServer(1).catch((shutdownError) => {
      console.error("Server shutdown failed:", shutdownError);
      process.exitCode = 1;
    });
  });

  process.once("SIGINT", () => void stopServer());
  process.once("SIGTERM", () => void stopServer());
};

void startServer().catch((error) => {
  console.error("Server startup failed:", error);
  process.exitCode = 1;
});
