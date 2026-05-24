import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export type AuthRequest = Request & { userId?: string };

export function signToken(userId: string) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET ?? "dev-secret", {
    expiresIn: "7d"
  });
}

export function auth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    res.status(401).json({ message: "Token ausente" });
    return;
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET ?? "dev-secret") as { sub: string };
    req.userId = payload.sub;
    next();
  } catch {
    res.status(401).json({ message: "Token inválido" });
  }
}
