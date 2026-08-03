import type { Request, Response, NextFunction } from "express";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin123";
const ADMIN_SECRET = `filmvote_admin_${ADMIN_PASSWORD}`;

export function generateToken(): string {
  return Buffer.from(ADMIN_SECRET).toString("base64");
}

export function verifyToken(token: string): boolean {
  const expected = Buffer.from(ADMIN_SECRET).toString("base64");
  return token === expected;
}

export function verifyAdminToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = authHeader.slice(7);
  if (!verifyToken(token)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}
