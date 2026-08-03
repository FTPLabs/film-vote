import { Router, type IRouter } from "express";
import { AdminLoginBody } from "@workspace/api-zod";
import { generateToken } from "../lib/auth";

const router: IRouter = Router();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin123";

router.post("/admin/login", async (req, res): Promise<void> => {
  const parsed = AdminLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  if (parsed.data.password !== ADMIN_PASSWORD) {
    res.status(401).json({ error: "Неверный пароль" });
    return;
  }

  res.json({ token: generateToken() });
});

export default router;
