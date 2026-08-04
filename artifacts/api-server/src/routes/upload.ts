import { Router, type IRouter } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { verifyAdminToken } from "../lib/auth";

const router: IRouter = Router();

const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");
const CLIPS_DIR = path.join(UPLOADS_DIR, "clips");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(CLIPS_DIR)) fs.mkdirSync(CLIPS_DIR, { recursive: true });

const imageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const videoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, CLIPS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".mp4";
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const imageUpload = multer({
  storage: imageStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Только изображения"));
  },
});

const videoUpload = multer({
  storage: videoStorage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("video/")) cb(null, true);
    else cb(new Error("Только видеофайлы"));
  },
});

router.post("/upload", verifyAdminToken, imageUpload.single("image"), (req, res): void => {
  if (!req.file) { res.status(400).json({ error: "Файл не получен" }); return; }
  res.json({ url: `/uploads/${req.file.filename}` });
});

router.post("/upload/clip", verifyAdminToken, videoUpload.single("clip"), (req, res): void => {
  if (!req.file) { res.status(400).json({ error: "Файл не получен" }); return; }
  res.json({ url: `/uploads/clips/${req.file.filename}` });
});

export default router;
