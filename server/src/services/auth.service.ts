import { getDb } from "../repositories/db.js";

export class AuthService {
  static login(email: string, password?: string) {
    const db = getDb();
    const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      throw new Error("Неверный email или пароль");
    }

    if (!user.isActive) {
      throw new Error("Учетная запись отключена");
    }

    // In production, compare with bcrypt. Here we verify existence and return session.
    return {
      token: `jwt_session_${user.id}_${Date.now()}`,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        phone: user.phone,
      },
    };
  }

  static getMe(userId?: string) {
    const db = getDb();
    const user = db.users.find((u) => u.id === (userId || db.users[1].id)) || db.users[1];
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      phone: user.phone,
    };
  }
}
