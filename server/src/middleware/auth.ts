import { Request, Response, NextFunction } from "express";
import { authenticateSession } from "../services/session.service.js";
import { getDb } from "../repositories/db.js";
import { userStorage } from "../context/userContext.js";

export function authenticateApi(req: Request, res: Response, next: NextFunction) {
  try {
    const cookie = req.headers.cookie?.split(";").map((value) => value.trim()).find((value) => value.startsWith("crm_session="))?.slice("crm_session=".length);
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, "") || (cookie ? decodeURIComponent(cookie) : "");
    const user = authenticateSession(token);
    const db = getDb();
    const level = db.accessLevels.find((item) => item.id === user.accessLevelId) || db.accessLevels.find((item) => item.id === (user.role === "ADMIN" ? "lvl-owner" : user.role === "MECHANIC" ? "lvl-master" : "lvl-manager"));
    const visible = (module: string) => level?.permissions[module]?.visible !== false;
    const edit = (module: string) => level?.permissions[module]?.canEdit !== false;
    const remove = (module: string) => level?.permissions[module]?.canDelete !== false;
    const route = req.path;
    const root = route.split("/")[1];
    const module = ({ dashboard: "dashboard", bikes: "bikes", batteries: "batteries", outfits: "outfits", clients: "clients", rentals: "rentals", repairs: "repairs", parts: "inventory", payments: "finance", users: "employees", employees: "employees", "access-levels": "employees", articles: "info", history: "history", loyalty: "loyalty", shop: "shop", reviews: "clients" } as Record<string, string>)[root];
    const readDependencies: Record<string, string[]> = { clients: ["rentals", "repairs", "shop", "loyalty"], bikes: ["rentals", "repairs", "shop"], batteries: ["rentals", "repairs", "bikes"], outfits: ["rentals", "shop"], parts: ["repairs"], rentals: ["clients"], loyalty: ["clients", "rentals", "shop", "repairs"] };
    const isRead = req.method === "GET";
    const allowedReference = isRead && (readDependencies[root] || []).some(visible);
    const globalRead = isRead && (root === "dashboard" || route === "/payments/settings" || route === "/system/state");
    if ((root === "users" || root === "employees" || root === "access-levels") && level?.canManageEmployees !== true) return res.status(403).json({ error: "Нет прав на управление сотрудниками" });
    if (root === "system" && route !== "/system/state" && level?.id !== "lvl-owner") return res.status(403).json({ error: "Системные операции доступны владельцу" });
    const createRelatedClient = !isRead && req.method === "POST" && route === "/clients" && ["rentals", "shop", "repairs"].some((item) => visible(item) && edit(item));
    const deleteEntity = req.method === "DELETE" && !route.startsWith('/bikes/photos/');
    if (module && !globalRead && !allowedReference && !createRelatedClient && (!visible(module) || (!isRead && !(deleteEntity ? remove(module) : edit(module))))) return res.status(403).json({ error: "Недостаточно прав для этой операции" });

    // Remove fields that the role cannot inspect while preserving reference data
    // required for repair, checkout and other permitted workflows.
    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      const sanitized = JSON.parse(JSON.stringify(body, (key, value) => {
        if (key === "passwordHash" || key === "password" || key === "authSigningKey") return undefined;
        if (level?.canSeeProfits !== true && ["netMargin", "profit"].includes(key)) return undefined;
        if (!visible("clients") && ["passportSerial", "passportNumber", "registrationAddress", "migrationCard", "patentNumber", "documentPhotoUrls"].includes(key)) return undefined;
        return value;
      }));
      return originalJson(sanitized);
    };
    const roleTitle = user.roleTitle || (user.role === "ADMIN" ? "Руководитель" : user.role === "MECHANIC" ? "Мастер" : "Менеджер");
    const current = { id: user.id, fullName: user.fullName, role: user.role, roleTitle, displayName: `${user.fullName} (${roleTitle})` };
    (req as any).currentUser = current;
    userStorage.run(current, next);
  } catch (error: any) {
    return res.status(401).json({ error: error.message || "Войдите в систему" });
  }
}
