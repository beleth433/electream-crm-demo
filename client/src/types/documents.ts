import type { PaymentDetails, Rental, RetailOrder } from './index';

export type DocumentType = 'RENTAL_CONTRACT' | 'HANDOVER_ACT' | 'RETURN_ACT' | 'BUYOUT_ACT' | 'SALE_RECEIPT' | 'REPAIR_ORDER' | 'REPAIR_ACT';
export type DocumentModule = 'rentals' | 'shop' | 'repairs';
export interface CrmDocument {
  id: string; type: DocumentType; number: string; title: string;
  sourceModule: DocumentModule; sourceId: string; sourceNumber: string;
  clientId?: string | null; clientName: string; clientPhone: string; bikeNumber: string;
  issuedAt: string; capturedAt: string; reconstructed: boolean; amount: number;
  snapshot: {
    issuer: PaymentDetails;
    client: { fullName: string; phone: string; passportSerial?: string | null; passportNumber?: string | null; registrationAddress?: string | null; citizenship?: string | null; patentNumber?: string | null; courierService?: string | null };
    actor: string; equipment: Array<{ name: string; number: string }>;
    items: Array<{ name: string; quantity: number; price: number }>;
    details: Array<{ label: string; value: string }>; notes: string;
    rentalData?: Rental; saleData?: RetailOrder;
  };
}
export type DocumentSummary = Omit<CrmDocument, 'snapshot'>;
export interface DocumentFilters { search?: string; type?: string; from?: string; to?: string; sourceId?: string; sourceModule?: DocumentModule; page?: number }
export interface DocumentList { items: DocumentSummary[]; total: number; page: number; pageSize: number }
export const DOCUMENT_TYPES: Record<DocumentType, string> = {
  RENTAL_CONTRACT: 'Договор аренды / выкупа', HANDOVER_ACT: 'Акт выдачи техники', RETURN_ACT: 'Акт возврата техники',
  BUYOUT_ACT: 'Акт завершения выкупа', SALE_RECEIPT: 'Товарный чек', REPAIR_ORDER: 'Заказ-наряд СТО', REPAIR_ACT: 'Акт выполненных работ СТО',
};
