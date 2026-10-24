export interface AssistantTask {
  id: string; module: 'clients' | 'bikes' | 'batteries'; entityId: string;
  label: string; title: string; field: string; createdAt: string;
}
export interface AssistantJob {
  id: string; text: string; createdAt: string;
  status: 'QUEUED' | 'PROCESSING' | 'READY' | 'ERROR' | 'APPLIED' | 'CANCELLED';
  summary?: string; questions: string[]; canApply: boolean;
  preview?: string[]; warnings?: string[]; error?: string;
  results?: { module: string; id: string; label: string }[];
}
export interface AssistantStatus {
  devices: { id: string; name: string; createdAt: string; lastSeenAt?: string }[];
  jobs: AssistantJob[]; tasks: AssistantTask[];
}
