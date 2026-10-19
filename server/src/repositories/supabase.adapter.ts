import { createClient, SupabaseClient } from "@supabase/supabase-js";
import pg from "pg";
import type { DBStore } from "./db.js";

export type StorageMode = "LOCAL_FILE" | "SUPABASE_POSTGRES" | "SUPABASE_REST";

export interface StorageStatus {
  mode: StorageMode;
  connected: boolean;
  provider: "supabase" | "postgres" | "local";
  lastSyncedAt?: string;
  error?: string | null;
  envCheck?: {
    hasDatabaseUrl: boolean;
    hasSupabaseUrl: boolean;
    hasServiceRoleKey: boolean;
    hasAnonKey: boolean;
    isVercel: boolean;
  };
}

function getCleanDatabaseUrl(): string {
  const raw = (
    process.env.DATABASE_URL ||
    process.env.database_url ||
    process.env.DATEBASE_URL ||
    process.env.datebase_url ||
    process.env.POSTGRES_URL ||
    process.env.postgres_url ||
    process.env.SUPABASE_DB_URL ||
    process.env.supabase_db_url ||
    ""
  ).trim();

  let cleaned = raw;
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }

  // Auto-encode special characters like '#' in password if user pasted raw password
  cleaned = cleaned.replace(/^(postgres(?:ql)?:\/\/[^:]+:)(.+)(@[^@]+)$/, (_, prefix, pass, suffix) => {
    const encodedPass = pass.replace(/#/g, "%23");
    return `${prefix}${encodedPass}${suffix}`;
  });

  return cleaned;
}

class SupabaseAdapter {
  private pgPool: pg.Pool | null = null;
  private supabaseClient: SupabaseClient | null = null;
  private mode: StorageMode = "LOCAL_FILE";
  private isConnected = false;
  private lastSyncedAt: string | null = null;
  private lastError: string | null = null;
  private initPromise: Promise<boolean> | null = null;
  private pendingFlushPromise: Promise<void> | null = null;
  private savePromiseChain: Promise<void> = Promise.resolve();

  constructor() {
    this.detectMode();
  }

  public detectMode(): StorageMode {
    const dbUrl = getCleanDatabaseUrl();

    const supabaseUrl = process.env.SUPABASE_URL || process.env.supabase_url;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.supabase_service_role_key ||
      process.env.SUPABASE_KEY ||
      process.env.supabase_key ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.supabase_anon_key;

    if (dbUrl && (dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://"))) {
      this.mode = "SUPABASE_POSTGRES";
    } else if (supabaseUrl && supabaseKey) {
      this.mode = "SUPABASE_REST";
    } else {
      this.mode = "LOCAL_FILE";
    }

    return this.mode;
  }

  public getStatus(): StorageStatus {
    const rawDbUrl = getCleanDatabaseUrl();
    const rawSupabaseUrl = (process.env.SUPABASE_URL || process.env.supabase_url || "").trim();
    const rawServiceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.supabase_service_role_key || "").trim();
    const rawAnonKey = (process.env.SUPABASE_ANON_KEY || process.env.supabase_anon_key || process.env.SUPABASE_KEY || process.env.supabase_key || "").trim();

    return {
      mode: this.mode,
      connected: this.isConnected,
      provider:
        this.mode === "SUPABASE_POSTGRES"
          ? "postgres"
          : this.mode === "SUPABASE_REST"
          ? "supabase"
          : "local",
      lastSyncedAt: this.lastSyncedAt || undefined,
      error: this.lastError,
      envCheck: {
        hasDatabaseUrl: Boolean(rawDbUrl),
        hasSupabaseUrl: Boolean(rawSupabaseUrl),
        hasServiceRoleKey: Boolean(rawServiceRoleKey),
        hasAnonKey: Boolean(rawAnonKey),
        isVercel: Boolean(process.env.VERCEL),
      },
    };
  }

  public async init(seedFallback: () => DBStore): Promise<DBStore | null> {
    if (this.initPromise) {
      await this.initPromise;
      return null;
    }

    this.initPromise = (async () => {
      this.detectMode();

      if (this.mode === "LOCAL_FILE") {
        console.log("[Storage] 📁 Режим локального JSON-хранилища (server/data/crm_db.json)");
        this.isConnected = true;
        return true;
      }

      if (this.mode === "SUPABASE_POSTGRES") {
        return await this.initPostgres(seedFallback);
      }

      if (this.mode === "SUPABASE_REST") {
        return await this.initRest(seedFallback);
      }

      return false;
    })();

    const success = await this.initPromise;
    if (success && this.mode !== "LOCAL_FILE") {
      return await this.loadFromCloud();
    }
    return null;
  }

  private async initPostgres(seedFallback: () => DBStore): Promise<boolean> {
    const connectionString = getCleanDatabaseUrl();

    const isLocal =
      connectionString.includes("localhost") ||
      connectionString.includes("127.0.0.1");

    try {
      console.log("[Storage] 🔌 Подключение к PostgreSQL (Supabase / Pooler)...");

      this.pgPool = new pg.Pool({
        connectionString,
        ssl: isLocal ? false : { rejectUnauthorized: false },
        max: 3,
        idleTimeoutMillis: 5000,
        connectionTimeoutMillis: 8000,
      });

      this.pgPool.on("error", (err) => {
        console.error("[Storage] PG Pool idle client error (handled):", err.message);
      });

      // Auto-create storage table if it does not exist
      await this.pgPool.query(`
        CREATE TABLE IF NOT EXISTS crm_store (
          id TEXT PRIMARY KEY,
          data JSONB NOT NULL,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      this.isConnected = true;
      this.lastError = null;
      console.log("[Storage] ✅ Подключение к Supabase PostgreSQL успешно. Таблица 'crm_store' готова.");

      // Check if we need initial seed
      const checkRes = await this.pgPool.query(
        "SELECT id FROM crm_store WHERE id = 'main' LIMIT 1"
      );
      if (checkRes.rows.length === 0) {
        console.log("[Storage] 🚀 База Supabase пуста. Загрузка начальных данных CRM в облако...");
        const initialData = seedFallback();
        await this.saveToPostgres(initialData);
        console.log("[Storage] ✅ Начальные данные успешно сохранены в Supabase!");
      }

      return true;
    } catch (err: any) {
      this.isConnected = false;
      this.lastError = err.message;
      console.error("[Storage] ❌ Ошибка подключения к Supabase PostgreSQL:", err.message);
      console.warn("[Storage] ⚠️ Переключение на резервное локальное хранилище данных.");
      this.mode = "LOCAL_FILE";
      return false;
    }
  }

  private async initRest(seedFallback: () => DBStore): Promise<boolean> {
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = (
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_KEY ||
      process.env.SUPABASE_ANON_KEY
    )!;

    try {
      console.log(`[Storage] 🔌 Подключение к Supabase REST API (${supabaseUrl})...`);
      this.supabaseClient = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false },
      });

      // Verify connection by reading crm_store
      const { data, error } = await this.supabaseClient
        .from("crm_store")
        .select("id")
        .eq("id", "main")
        .maybeSingle();

      if (error) {
        // Table might not exist yet
        console.warn("[Storage] ⚠️ Таблица 'crm_store' не найдена в Supabase. Создайте её через SQL Editor:", error.message);
        this.lastError = error.message;
        return false;
      }

      this.isConnected = true;
      this.lastError = null;
      console.log("[Storage] ✅ Подключение к Supabase REST API успешно!");

      if (!data) {
        console.log("[Storage] 🚀 Облачная запись 'main' отсутствует. Сохраняем начальные данные в Supabase...");
        const initialData = seedFallback();
        await this.saveToRest(initialData);
      }

      return true;
    } catch (err: any) {
      this.isConnected = false;
      this.lastError = err.message;
      console.error("[Storage] ❌ Ошибка подключения к Supabase REST API:", err.message);
      return false;
    }
  }

  private lastSyncCheckTime = 0;

  public async syncIfOutdated(force = false): Promise<DBStore | null> {
    if (!this.isConnected || this.mode === "LOCAL_FILE") {
      return null;
    }

    const now = Date.now();
    if (!force && now - this.lastSyncCheckTime < 250) {
      return null;
    }
    this.lastSyncCheckTime = now;

    try {
      if (this.mode === "SUPABASE_POSTGRES" && this.pgPool) {
        const checkRes = await this.pgPool.query(
          "SELECT updated_at FROM crm_store WHERE id = 'main' LIMIT 1"
        );
        if (checkRes.rows.length === 0) return null;

        const cloudUpdatedAt = checkRes.rows[0].updated_at
          ? new Date(checkRes.rows[0].updated_at).toISOString()
          : null;

        if (!cloudUpdatedAt) return null;

        if (!this.lastSyncedAt || cloudUpdatedAt !== this.lastSyncedAt) {
          const fullRes = await this.pgPool.query(
            "SELECT data, updated_at FROM crm_store WHERE id = 'main' LIMIT 1"
          );
          if (fullRes.rows.length > 0 && fullRes.rows[0].data) {
            this.lastSyncedAt = fullRes.rows[0].updated_at
              ? new Date(fullRes.rows[0].updated_at).toISOString()
              : cloudUpdatedAt;
            console.log(`[Storage] 🔄 Обнаружены свежие данные в Supabase (версия: ${this.lastSyncedAt}), синхронизируем.`);
            return fullRes.rows[0].data as DBStore;
          }
        }
        return null;
      }

      if (this.mode === "SUPABASE_REST" && this.supabaseClient) {
        const { data, error } = await this.supabaseClient
          .from("crm_store")
          .select("updated_at")
          .eq("id", "main")
          .maybeSingle();

        if (error || !data || !data.updated_at) return null;

        if (!this.lastSyncedAt || data.updated_at !== this.lastSyncedAt) {
          const { data: fullData } = await this.supabaseClient
            .from("crm_store")
            .select("data, updated_at")
            .eq("id", "main")
            .maybeSingle();

          if (fullData && fullData.data) {
            this.lastSyncedAt = fullData.updated_at || data.updated_at;
            console.log(`[Storage] 🔄 Обнаружены свежие данные в Supabase REST (версия: ${this.lastSyncedAt}), синхронизируем.`);
            return fullData.data as DBStore;
          }
        }
      }
    } catch (err: any) {
      console.error("[Storage] ⚠️ Ошибка проверки синхронизации:", err.message);
    }

    return null;
  }

  public async loadFromCloud(): Promise<DBStore | null> {
    if (!this.isConnected || this.mode === "LOCAL_FILE") {
      return null;
    }

    try {
      if (this.mode === "SUPABASE_POSTGRES" && this.pgPool) {
        const res = await this.pgPool.query(
          "SELECT data, updated_at FROM crm_store WHERE id = 'main' LIMIT 1"
        );
        if (res.rows.length > 0 && res.rows[0].data) {
          this.lastSyncedAt = new Date(res.rows[0].updated_at || Date.now()).toISOString();
          console.log(`[Storage] 📥 Данные успешно загружены из Supabase PostgreSQL (синхронизировано: ${this.lastSyncedAt})`);
          return res.rows[0].data as DBStore;
        }
      }

      if (this.mode === "SUPABASE_REST" && this.supabaseClient) {
        const { data, error } = await this.supabaseClient
          .from("crm_store")
          .select("data, updated_at")
          .eq("id", "main")
          .maybeSingle();

        if (error) {
          console.error("[Storage] Ошибка чтения из Supabase REST:", error.message);
          return null;
        }

        if (data && data.data) {
          this.lastSyncedAt = data.updated_at || new Date().toISOString();
          console.log(`[Storage] 📥 Данные успешно загружены из Supabase REST (синхронизировано: ${this.lastSyncedAt})`);
          return data.data as DBStore;
        }
      }
    } catch (err: any) {
      console.error("[Storage] ❌ Исключение при загрузке из облака:", err.message);
      this.lastError = err.message;
    }

    return null;
  }

  public async saveToCloud(store: DBStore): Promise<void> {
    if (!this.isConnected || this.mode === "LOCAL_FILE") {
      return;
    }

    // Sequence saves one after another to prevent concurrent UPSERT locks on 'main' row in PostgreSQL
    this.savePromiseChain = this.savePromiseChain
      .catch(() => {})
      .then(async () => {
        try {
          if (this.mode === "SUPABASE_POSTGRES" && this.pgPool) {
            await this.saveToPostgres(store);
          } else if (this.mode === "SUPABASE_REST" && this.supabaseClient) {
            await this.saveToRest(store);
          }
          this.lastError = null;
        } catch (err: any) {
          console.error("[Storage] ❌ Ошибка сохранения в облако Supabase:", err.message);
          this.lastError = err.message;
          throw err;
        }
      });

    this.pendingFlushPromise = this.savePromiseChain;
    await this.savePromiseChain;
  }

  private async saveToPostgres(store: DBStore): Promise<void> {
    if (!this.pgPool) return;
    const jsonString = JSON.stringify(store);
    const res = await this.pgPool.query(
      `
      INSERT INTO crm_store (id, data, updated_at)
      VALUES ('main', $1::jsonb, NOW())
      ON CONFLICT (id) DO UPDATE SET
        data = EXCLUDED.data,
        updated_at = NOW()
      RETURNING updated_at;
      `,
      [jsonString]
    );
    if (res.rows.length > 0 && res.rows[0].updated_at) {
      this.lastSyncedAt = new Date(res.rows[0].updated_at).toISOString();
    }
  }

  private async saveToRest(store: DBStore): Promise<void> {
    if (!this.supabaseClient) return;
    const nowIso = new Date().toISOString();
    const { data, error } = await this.supabaseClient
      .from("crm_store")
      .upsert({
        id: "main",
        data: store,
        updated_at: nowIso,
      })
      .select("updated_at")
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }
    if (data && data.updated_at) {
      this.lastSyncedAt = data.updated_at;
    } else {
      this.lastSyncedAt = nowIso;
    }
  }

  public async flush(): Promise<void> {
    if (this.savePromiseChain) {
      await this.savePromiseChain.catch(() => {});
    }
  }
}

export const supabaseAdapter = new SupabaseAdapter();
