"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controller_MAIN_1 = __importDefault(require("../controllers/MAIN/controller_MAIN"));
const constroller_ONLINE_1 = __importDefault(require("../controllers/ONLINE/constroller_ONLINE"));
const middleware_1 = __importDefault(require("../middleware/middleware"));
const router = (0, express_1.Router)();
// ====================
// Эндпоинты
// ====================
// ONLINE
router.post("/chat/load_message.json", middleware_1.default, constroller_ONLINE_1.default.load_message);
router.post("/try_load_players.json", middleware_1.default, constroller_ONLINE_1.default.try_load_players);
router.post("/chat/save_message.json", middleware_1.default, constroller_ONLINE_1.default.save_message);
router.post("/try_send_gift.json", middleware_1.default, constroller_ONLINE_1.default.try_send_gift);
router.post("/load_gift.json", middleware_1.default, constroller_ONLINE_1.default.load_gift);
router.post("/take_gift.json", middleware_1.default, constroller_ONLINE_1.default.take_gift);
// MAIN
router.post("/time.json", controller_MAIN_1.default.time);
router.post("/dead", middleware_1.default, controller_MAIN_1.default.dead);
router.post("/try_use_promocode.json", middleware_1.default, controller_MAIN_1.default.try_use_promocode);
router.post("/saves/try_load.json", middleware_1.default, controller_MAIN_1.default.try_load);
router.post("/saves/try_save.json", middleware_1.default, controller_MAIN_1.default.try_save);
router.post("/register_account.json", controller_MAIN_1.default.register_account);
router.post("/restore_account.json", middleware_1.default, controller_MAIN_1.default.restore_account);
router.post("/newname", middleware_1.default, controller_MAIN_1.default.newname);
router.get("/enemies2/:filename", controller_MAIN_1.default.enemy); // express.static(path.join(__dirname, "..", "static", "enemy")))
exports.default = router;
