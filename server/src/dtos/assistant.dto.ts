import { z } from 'zod';

const text = z.string().trim().max(500).nullable().optional();
const numbers = z.array(z.string().trim().min(1).max(100)).max(50).nullable().optional();
export const AssistantActionDto = z.object({
  kind: z.enum(['create_client', 'update_client', 'add_bikes', 'add_batteries']),
  clientId: text, fullName: text, phone: text,
  clientType: z.enum(['COURIER', 'RETAIL']).nullable().optional(),
  courierService: text, registrationAddress: text, passportSerial: text, passportNumber: text,
  citizenship: z.enum(['РФ', 'СНГ']).nullable().optional(), migrationCard: text, patentNumber: text,
  modelId: text, quantity: z.number().int().min(1).max(50).nullable().optional(),
  purchasePrice: z.number().finite().min(0).nullable().optional(),
  inventoryNumbers: numbers, serialNumbers: numbers, frameNumbers: numbers, motorNumbers: numbers,
}).strict();
export const AssistantPlanDto = z.object({
  summary: z.string().trim().min(1).max(2000),
  questions: z.array(z.string().trim().min(1).max(500)).max(60),
  actions: z.array(AssistantActionDto).max(20),
}).strict();
export type AssistantAction = z.infer<typeof AssistantActionDto>;
export type AssistantPlan = z.infer<typeof AssistantPlanDto>;

export interface AssistantDevice {
  id: string; userId: string; name: string; tokenHash: string; fingerprint: string;
  createdAt: string; lastSeenAt?: string; revokedAt?: string;
}
export interface AssistantPairing { userId: string; codeHash: string; expiresAt: number }
export interface AssistantTask {
  id: string; userId: string; module: 'clients' | 'bikes' | 'batteries';
  entityId: string; label: string; field: string; title: string; createdAt: string; resolvedAt?: string;
}
export interface AssistantJob {
  id: string; userId: string; text: string; createdAt: string;
  status: 'QUEUED' | 'PROCESSING' | 'READY' | 'ERROR' | 'APPLIED' | 'CANCELLED';
  deviceId?: string; lease?: string; leaseUntil?: number; attempts: number;
  plan?: AssistantPlan; preview?: string[]; warnings?: string[]; error?: string;
  baseline?: string;
  appliedAt?: string; results?: { module: string; id: string; label: string }[];
}
export interface AssistantStore {
  devices: AssistantDevice[]; pairings: AssistantPairing[]; jobs: AssistantJob[]; tasks: AssistantTask[];
}
