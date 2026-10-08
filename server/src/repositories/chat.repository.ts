import { getDb, saveDb, ChatMessageRecord } from './db.js';

export class ChatRepository {
  public static getMessages(limit = 100): ChatMessageRecord[] {
    const db = getDb();
    const messages = db.chatMessages || [];
    // Return sorted chronologically, but sliced to limit
    return [...messages]
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .slice(-limit);
  }

  public static createMessage(data: {
    senderId: string;
    senderName: string;
    senderRole?: string;
    text: string;
  }): ChatMessageRecord {
    const db = getDb();
    if (!db.chatMessages) {
      db.chatMessages = [];
    }

    const newMessage: ChatMessageRecord = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      senderId: data.senderId,
      senderName: data.senderName,
      senderRole: data.senderRole || 'USER',
      text: data.text.trim(),
      createdAt: new Date().toISOString(),
    };

    db.chatMessages.push(newMessage);
    // Keep max 500 messages in history
    if (db.chatMessages.length > 500) {
      db.chatMessages = db.chatMessages.slice(-500);
    }

    saveDb();
    return newMessage;
  }

  public static deleteMessage(id: string): boolean {
    const db = getDb();
    if (!db.chatMessages) return false;
    const initialLen = db.chatMessages.length;
    db.chatMessages = db.chatMessages.filter((m) => m.id !== id);
    if (db.chatMessages.length !== initialLen) {
      saveDb();
      return true;
    }
    return false;
  }
}
