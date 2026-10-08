import { getDb } from "../repositories/db.js";

export class AuthService {
  static login(identifier: string, password?: string) {
    const db = getDb();
    const clean = (identifier || "").trim().toLowerCase();
    const user = db.users.find(
      (u) =>
        (u.login && u.login.toLowerCase() === clean) ||
        (u.username && u.username.toLowerCase() === clean) ||
        (u.email && u.email.toLowerCase() === clean) ||
        (u.fullName && u.fullName.toLowerCase() === clean)
    );

    if (!user) {
      throw new Error("Пользователь не найден. Проверьте логин или email.");
    }

    if (!user.isActive) {
      throw new Error("Учетная запись заблокирована администратором.");
    }

    if (!password || !password.trim()) {
      throw new Error("Введите пароль для входа в систему.");
    }

    const p = password.trim();
    const valid = p === user.passwordHash;
    if (!valid) {
      throw new Error("Неверный пароль. Проверьте правильность ввода или обратитесь к руководителю.");
    }

    user.lastLoginAt = new Date().toISOString();

    const accessLevel =
      (db.accessLevels || []).find((l) => l.id === user.accessLevelId) ||
      (db.accessLevels || []).find(
        (l) => l.id === (user.role === "ADMIN" ? "lvl-owner" : user.role === "MECHANIC" ? "lvl-master" : "lvl-manager")
      ) ||
      (db.accessLevels || [])[0];

    return {
      token: `jwt_session_${user.id}_${Date.now()}`,
      user: {
        id: user.id,
        login: user.login || user.username || user.email.split("@")[0],
        username: user.username || user.login || user.email.split("@")[0],
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        roleTitle:
          user.roleTitle ||
          (user.role === "ADMIN" ? "Руководитель парка" : user.role === "MECHANIC" ? "Мастер СТО" : "Управляющий"),
        phone: user.phone,
        accessLevelId: user.accessLevelId || accessLevel?.id || "lvl-owner",
        accessLevel,
        isActive: Boolean(user.isActive),
      },
    };
  }

  static getMe(userId?: string) {
    const db = getDb();
    let user: any;
    if (userId) {
      user = db.users.find((u) => u.id === userId);
      if (!user) {
        throw new Error(`Пользователь с ID "${userId}" не найден`);
      }
    } else {
      user = db.users.find((u) => u.id === "usr-twizzy") || db.users[0];
      if (!user) {
        throw new Error("В системе нет зарегистрированных пользователей");
      }
    }

    const accessLevel =
      (db.accessLevels || []).find((l) => l.id === user.accessLevelId) ||
      (db.accessLevels || []).find(
        (l) => l.id === (user.role === "ADMIN" ? "lvl-owner" : user.role === "MECHANIC" ? "lvl-master" : "lvl-manager")
      ) ||
      (db.accessLevels || [])[0];

    return {
      id: user.id,
      login: user.login || user.username || user.email.split("@")[0],
      username: user.username || user.login || user.email.split("@")[0],
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      roleTitle:
        user.roleTitle ||
        (user.role === "ADMIN" ? "Руководитель парка" : user.role === "MECHANIC" ? "Мастер СТО" : "Управляющий"),
      phone: user.phone,
      accessLevelId: user.accessLevelId || accessLevel?.id || "lvl-owner",
      accessLevel,
      isActive: Boolean(user.isActive),
    };
  }
}
