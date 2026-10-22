import { Request, Response } from "express";
import { AuthService } from "../services/auth.service.js";
import { LoginDto } from "../dtos/schemas.dto.js";
import { getCurrentUser } from "../context/userContext.js";

export class AuthController {
  static login(req: Request, res: Response) {
    try {
      const parsed = LoginDto.parse(req.body);
      const result = AuthService.login(parsed.email, parsed.password, parsed.rememberDevice);
      res.cookie("crm_session", result.token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 30 * 86400000 });
      return res.json(result);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || "Ошибка авторизации" });
    }
  }

  static trustedLogin(req: Request, res: Response) {
    try {
      const result = AuthService.trustedLogin(String(req.body.token || ""));
      res.cookie("crm_session", result.token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 30 * 86400000 });
      return res.json(result);
    } catch (error: any) {
      return res.status(401).json({ error: error.message });
    }
  }

  static logout(req: Request, res: Response) {
    res.clearCookie("crm_session");
    return res.json({ success: true });
  }

  static getMe(req: Request, res: Response) {
    try {
      const userId = getCurrentUser()?.id;
      if (!userId) return res.status(401).json({ error: "Войдите в систему" });
      const user = AuthService.getMe(userId);
      return res.json(user);
    } catch (err: any) {
      return res.status(404).json({ error: err.message || "Пользователь не найден" });
    }
  }
}
