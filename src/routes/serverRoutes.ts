import { Router, Request, Response, NextFunction } from 'express';
import MAIN from '../controllers/MAIN/controller_MAIN'
import ONLINE from '../controllers/ONLINE/constroller_ONLINE'
import check from '../middleware/middleware'

const router = Router();

// ====================
// Эндпоинты
// ====================

// ONLINE
router.post("/chat/load_message.json", check, ONLINE.load_message)
router.post("/try_load_players.json", check, ONLINE.try_load_players)
router.post("/chat/save_message.json", check, ONLINE.save_message)
router.post("/try_send_gift.json", check, ONLINE.try_send_gift)
router.post("/load_gift.json", check, ONLINE.load_gift)
router.post("/take_gift.json", check, ONLINE.take_gift)

// MAIN
router.post("/time.json", MAIN.time)
router.post("/dead", check, MAIN.dead)
router.post("/try_use_promocode.json", check, MAIN.try_use_promocode)
router.post("/saves/try_load.json", check, MAIN.try_load)
router.post("/saves/try_save.json", check, MAIN.try_save)
router.post("/register_account.json", MAIN.register_account)
router.post("/restore_account.json", check, MAIN.restore_account)
router.post("/newname", check, MAIN.newname)
router.get("/enemies2/:filename", MAIN.enemy) // express.static(path.join(__dirname, "..", "static", "enemy")))

export default router;
