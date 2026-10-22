import { Request, Response } from "express";
import { getDb, getSystemTime, UserRecord, UserRole, saveDb } from "../repositories/db.js";
import { HistoryRepository } from "../repositories/history.repository.js";
import { hashPassword } from "../services/session.service.js";
import { normalizePhone } from "../repositories/relations.js";

const historyRepo = new HistoryRepository();

export class UserController {
  async getAll(req: Request, res: Response) {
    try {
      const db = getDb();
      const accessLevels = db.accessLevels || [];
      const employees = db.employees || [];
      const payments = (db.payments || []).filter((p) => p.type === "SALARY_PAYMENT");
      const currentMonth = getSystemTime().toISOString().slice(0, 7);

      const users = (db.users || []).map((u) => {
        const lvl = accessLevels.find((l) => l.id === u.accessLevelId) || null;
        const emp = employees.find((employee) => employee.id === u.employeeId) || employees.find(
          (e) => (u.phone && e.phone === u.phone) || e.fullName.toLowerCase() === u.fullName.toLowerCase()
        ) || null;

        const empPayments = emp ? payments.filter((p) => p.employeeId === emp.id) : [];
        const thisMonthPaid = empPayments
          .filter((p) => p.createdAt && p.createdAt.slice(0, 7) === currentMonth)
          .reduce((sum, p) => sum + p.amount, 0);

        return {
          id: u.id,
          login: u.login || u.username || u.email.split("@")[0],
          username: u.username || u.login || u.email.split("@")[0],
          email: u.email,
          fullName: u.fullName,
          phone: u.phone,
          role: u.role,
          roleTitle: u.roleTitle || (u.role === "ADMIN" ? "Руководитель парка" : u.role === "MECHANIC" ? "Мастер СТО" : "Управляющий"),
          accessLevelId: u.accessLevelId || "lvl-owner",
          accessLevel: lvl,
          isActive: u.isActive !== false,
          lastLoginAt: u.lastLoginAt || null,
          employeeId: emp?.id || null,
          salaryAmount: emp ? (typeof emp.salaryAmount === "number" ? emp.salaryAmount : 0) : 0,
          salaryType: emp?.salaryType ?? "MONTHLY",
          thisMonthPaid: thisMonthPaid,
        };
      });
      res.json(users);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const db = getDb();
      const { fullName, login, password, phone, roleTitle, role, accessLevelId, salaryAmount, salaryType } = req.body;

      if (!fullName || !fullName.trim()) {
        return res.status(400).json({ error: "Укажите ФИО сотрудника" });
      }
      if (!login || !login.trim()) {
        return res.status(400).json({ error: "Укажите логин для входа" });
      }
      if (!password || !password.trim()) {
        return res.status(400).json({ error: "Укажите пароль для сотрудника" });
      }

      const cleanLogin = login.trim().toLowerCase();
      const existing = (db.users || []).find(
        (u) =>
          (u.login && u.login.toLowerCase() === cleanLogin) ||
          (u.username && u.username.toLowerCase() === cleanLogin) ||
          (u.email && u.email.toLowerCase() === `${cleanLogin}@ebike-crm.ru`)
      );

      if (existing) {
        return res.status(400).json({ error: `Сотрудник с логином "${cleanLogin}" уже существует` });
      }

      const chosenRole: UserRole = (role === "ADMIN" || role === "MANAGER" || role === "MECHANIC") ? role : "MANAGER";
      const targetAccessLevelId = accessLevelId || (chosenRole === "ADMIN" ? "lvl-owner" : chosenRole === "MECHANIC" ? "lvl-master" : "lvl-manager");

      const newUser: UserRecord = {
        id: `usr-${Date.now()}`,
        login: cleanLogin,
        username: cleanLogin,
        email: `${cleanLogin}@ebike-crm.ru`,
        passwordHash: hashPassword(password.trim()),
        fullName: fullName.trim(),
        phone: phone?.trim() || null,
        role: chosenRole,
        roleTitle: roleTitle?.trim() || (chosenRole === "ADMIN" ? "Администратор" : chosenRole === "MECHANIC" ? "Мастер СТО" : "Менеджер"),
        accessLevelId: targetAccessLevelId,
        isActive: true,
      };

      db.users.push(newUser);

      // Create or link matching EmployeeRecord in db.employees
      let matchedEmp = (db.employees || []).find(
        (e) => (newUser.phone && e.phone === newUser.phone) || e.fullName.toLowerCase() === newUser.fullName.toLowerCase()
      );
      if (!matchedEmp) {
        matchedEmp = {
          id: `emp-${Date.now()}`,
          fullName: newUser.fullName,
          phone: newUser.phone || "+7 (999) 000-00-00",
          email: newUser.email,
          role: newUser.roleTitle || "Сотрудник",
          salaryType: salaryType || "MONTHLY",
          salaryAmount: salaryAmount !== undefined ? Math.max(0, Number(salaryAmount) || 0) : 0,
          status: "ACTIVE",
          hiredAt: new Date().toISOString().slice(0, 10),
          notes: `Учетная запись: @${newUser.login}`,
        };
        db.employees.unshift(matchedEmp);
      } else if (salaryAmount !== undefined) {
        matchedEmp.salaryAmount = Number(salaryAmount);
        if (salaryType) matchedEmp.salaryType = salaryType;
      }
      newUser.employeeId = matchedEmp.id;

      saveDb();

      await HistoryRepository.logAction({
        category: "SYSTEM",
        action: "USER_CREATE",
        title: `Создан сотрудник: ${newUser.fullName} (@${newUser.login})`,
        details: `Должность: ${newUser.roleTitle}. Уровень доступа: ${targetAccessLevelId}`,
        badgeText: "Сотрудник",
        badgeColor: "emerald",
        entityId: newUser.id,
      });

      const lvl = (db.accessLevels || []).find((l) => l.id === newUser.accessLevelId) || null;

      res.status(201).json({
        id: newUser.id,
        login: newUser.login,
        username: newUser.username,
        email: newUser.email,
        fullName: newUser.fullName,
        phone: newUser.phone,
        role: newUser.role,
        roleTitle: newUser.roleTitle,
        accessLevelId: newUser.accessLevelId,
        accessLevel: lvl,
        isActive: newUser.isActive,
        employeeId: matchedEmp?.id || null,
        salaryAmount: matchedEmp?.salaryAmount ?? 0,
        salaryType: matchedEmp?.salaryType || "MONTHLY",
        thisMonthPaid: 0,
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const db = getDb();
      const user = (db.users || []).find((u) => u.id === req.params.id);
      if (!user) {
        return res.status(404).json({ error: "Сотрудник не найден" });
      }

      const { fullName, login, phone, roleTitle, role, accessLevelId, isActive, password, salaryAmount, salaryType } = req.body;
      const matchedEmp = db.employees.find((employee) => employee.id === user.employeeId) || db.employees.find((employee) => (user.phone && normalizePhone(employee.phone) === normalizePhone(user.phone)) || employee.fullName.toLowerCase() === user.fullName.toLowerCase());
      if (matchedEmp) user.employeeId = matchedEmp.id;
      if (user.id === "usr-bxleth" && (isActive === false || (accessLevelId && accessLevelId !== "lvl-owner") || (role && role !== "ADMIN"))) return res.status(403).json({ error: "Нельзя заблокировать или понизить доступ владельца" });

      if (login !== undefined && login.trim()) {
        const cleanLogin = login.trim().toLowerCase();
        // Check uniqueness against other users
        const exists = (db.users || []).find(
          (u) =>
            u.id !== user.id &&
            ((u.login && u.login.toLowerCase() === cleanLogin) ||
              (u.username && u.username.toLowerCase() === cleanLogin) ||
              (u.email && u.email.toLowerCase() === `${cleanLogin}@ebike-crm.ru`))
        );
        if (exists) {
          return res.status(400).json({ error: `Логин "${cleanLogin}" уже занят другим сотрудником` });
        }
        user.login = cleanLogin;
        user.username = cleanLogin;
        user.email = `${cleanLogin}@ebike-crm.ru`;
      }

      if (fullName !== undefined) user.fullName = fullName.trim();
      if (phone !== undefined) user.phone = phone.trim();
      if (roleTitle !== undefined) user.roleTitle = roleTitle.trim();
      if (role && (role === "ADMIN" || role === "MANAGER" || role === "MECHANIC")) {
        user.role = role;
      }
      if (accessLevelId !== undefined) user.accessLevelId = accessLevelId;
      if (isActive !== undefined) user.isActive = Boolean(isActive);
      if (password && password.trim()) user.passwordHash = hashPassword(password.trim());

      // Update linked employee record if present
      if (matchedEmp) {
        if (fullName !== undefined) matchedEmp.fullName = user.fullName;
        if (phone !== undefined) matchedEmp.phone = user.phone || "";
        if (roleTitle !== undefined) matchedEmp.role = user.roleTitle || "";
        if (salaryAmount !== undefined) matchedEmp.salaryAmount = Math.max(0, Number(salaryAmount) || 0);
        if (salaryType !== undefined) matchedEmp.salaryType = salaryType;
        if (isActive !== undefined) matchedEmp.status = isActive ? "ACTIVE" : "DISMISSED";
      }

      saveDb();

      await HistoryRepository.logAction({
        category: "SYSTEM",
        action: "USER_UPDATE",
        title: `Обновлен сотрудник: ${user.fullName}`,
        details: `Статус: ${user.isActive ? "Активен" : "Заблокирован"}. Уровень доступа: ${user.accessLevelId}`,
        badgeText: "Сотрудник",
        badgeColor: "sky",
        entityId: user.id,
      });

      const lvl = (db.accessLevels || []).find((l) => l.id === user.accessLevelId) || null;

      res.json({
        id: user.id,
        login: user.login || user.username || user.email.split("@")[0],
        username: user.username || user.login || user.email.split("@")[0],
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role,
        roleTitle: user.roleTitle,
        accessLevelId: user.accessLevelId,
        accessLevel: lvl,
        isActive: user.isActive,
        employeeId: matchedEmp?.id || null,
        salaryAmount: matchedEmp ? (typeof matchedEmp.salaryAmount === "number" ? matchedEmp.salaryAmount : 0) : 0,
        salaryType: matchedEmp?.salaryType || "MONTHLY",
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const db = getDb();
      const index = (db.users || []).findIndex((u) => u.id === req.params.id);
      if (index === -1) {
        return res.status(404).json({ error: "Сотрудник не найден" });
      }

      const target = db.users[index];
      if (target.id === "usr-bxleth" || target.login === "bxleth") {
        return res.status(403).json({ error: "Нельзя удалить учетную запись руководителя или главного администратора" });
      }

      db.users.splice(index, 1);

      // Also clean up linked employee
      const empIndex = db.employees.findIndex((employee) => employee.id === target.employeeId) !== -1 ? db.employees.findIndex((employee) => employee.id === target.employeeId) : (db.employees || []).findIndex(
        (e) => (target.phone && e.phone === target.phone) || e.fullName.toLowerCase() === target.fullName.toLowerCase()
      );
      if (empIndex !== -1) {
        db.employees[empIndex].status = "DISMISSED";
      }

      saveDb();

      await HistoryRepository.logAction({
        category: "SYSTEM",
        action: "USER_DELETE",
        title: `Удален сотрудник: ${target.fullName} (@${target.login})`,
        badgeText: "Удалено",
        badgeColor: "rose",
        entityId: target.id,
      });

      res.json({ success: true, message: "Сотрудник удален" });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
}
