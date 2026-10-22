import { getDb, saveDb, PresenceRecord } from './db.js';
import { getCurrentUser } from '../context/userContext.js';

// Consider users active if heartbeat received within 45 seconds
const INACTIVITY_TIMEOUT_MS = 45 * 1000;

export class PresenceRepository {
  public static getOnline(timeoutMs: number = INACTIVITY_TIMEOUT_MS): PresenceRecord[] {
    const db = getDb();
    const list = db.presence || [];
    const now = Date.now();
    return list
      .filter((p) => {
        const lastSeen = new Date(p.lastSeenAt).getTime();
        return !isNaN(lastSeen) && now - lastSeen <= timeoutMs;
      })
      .sort((a, b) => new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime());
  }

  public static heartbeat(data: {
    userId: string;
    userName: string;
    userRole?: string;
    roleTitle?: string;
    deviceInfo?: string;
  }): PresenceRecord[] {
    const db = getDb();
    const current = getCurrentUser();
    if (current) data = { ...data, userId: current.id, userName: current.fullName, userRole: current.role, roleTitle: current.roleTitle };
    if (!db.presence) {
      db.presence = [];
    }

    const now = Date.now();
    const nowIso = new Date(now).toISOString();

    // Clean up stale records older than 10 minutes to keep database compact
    db.presence = db.presence.filter((p) => {
      const lastSeen = new Date(p.lastSeenAt).getTime();
      return !isNaN(lastSeen) && now - lastSeen <= 10 * 60 * 1000;
    });

    const existingIdx = db.presence.findIndex((p) => p.userId === data.userId);
    if (existingIdx >= 0) {
      db.presence[existingIdx] = {
        ...db.presence[existingIdx],
        userName: data.userName || db.presence[existingIdx].userName,
        userRole: data.userRole || db.presence[existingIdx].userRole,
        roleTitle: data.roleTitle !== undefined ? data.roleTitle : db.presence[existingIdx].roleTitle,
        deviceInfo: data.deviceInfo !== undefined ? data.deviceInfo : db.presence[existingIdx].deviceInfo,
        lastSeenAt: nowIso,
      };
    } else {
      db.presence.push({
        userId: data.userId,
        userName: data.userName,
        userRole: data.userRole || 'USER',
        roleTitle: data.roleTitle,
        deviceInfo: data.deviceInfo,
        lastSeenAt: nowIso,
      });
    }

    saveDb();
    return this.getOnline();
  }

  public static logout(userId: string): boolean {
    userId = getCurrentUser()?.id || userId;
    const db = getDb();
    if (!db.presence) return false;
    const initialLen = db.presence.length;
    db.presence = db.presence.filter((p) => p.userId !== userId);
    if (db.presence.length !== initialLen) {
      saveDb();
      return true;
    }
    return false;
  }
}
