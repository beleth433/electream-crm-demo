import { Request, Response } from "express";
import { AuthService } from "../services/auth.service.js";
import { LoginDto } from "../dtos/schemas.dto.js";

export class AuthController {
  static login(req: Request, res: Response) {
    try {
      const parsed = LoginDto.parse(req.body);
      const result = AuthService.login(parsed.email, parsed.password);
      return res.json(result);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || "Ошибка авторизации" });
    }
  }

  static getMe(req: Request, res: Response) {
    try {
      const user = AuthService.getMe();
      return res.json(user);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }
}
