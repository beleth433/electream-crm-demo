import React from 'react';
import { RetailOrder } from '../types';
import { Printer, X, ShieldCheck, ShoppingBag, CheckCircle } from 'lucide-react';

interface PrintableSaleReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: RetailOrder | null;
}

export const PrintableSaleReceiptModal: React.FC<PrintableSaleReceiptModalProps> = ({
  isOpen,
  onClose,
  order,
}) => {
  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  const paymentMethodLabels: Record<string, string> = {
    CASH: 'Наличные',
    CARD: 'Банковская карта',
    SBP: 'СБП (Система быстрых платежей)',
    BANK_TRANSFER: 'Банковский перевод (р/с)',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 print:p-0 print:bg-white">
      <div className="bg-white dark:bg-[#0c1612] text-slate-900 dark:text-slate-100 rounded-2xl shadow-2xl border border-slate-200 dark:border-emerald-500/30 max-w-2xl w-full overflow-hidden print:border-none print:shadow-none print:w-full print:max-w-none print:text-black">
        {/* Modal Top Bar (hidden when printing) */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-emerald-500/20 flex items-center justify-between print:hidden bg-slate-50 dark:bg-[#08100c]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Товарный чек и гарантийный талон
              </h3>
              <p className="text-[11px] text-slate-500">Чек № {order.orderNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-500/20"
            >
              <Printer className="w-4 h-4" />
              Распечатать чек
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div className="p-8 space-y-6 text-xs print:p-4 print:text-[11px] text-slate-800 dark:text-slate-200 print:text-black">
          {/* Header */}
          <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-base text-emerald-600 dark:text-emerald-400 tracking-tight">
                  COURIER E-BIKE HUB & SERVICE
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Сервисный центр и магазин электровелосипедов для служб доставки
              </p>
              <p className="text-[10px] text-slate-400">
                Москва, ул. Новодмитровская, 5А • Тел: +7 (495) 120-55-90 • ebike-crm.ru
              </p>
            </div>
            <div className="text-right">
              <span className="inline-block px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-bold text-xs">
                {order.orderNumber}
              </span>
              <p className="text-[11px] text-slate-500 mt-1">
                Дата: {new Date(order.createdAt).toLocaleString('ru-RU')}
              </p>
            </div>
          </div>

          {/* Customer & Payment Info */}
          <div className="grid grid-cols-2 gap-4 p-3.5 rounded-xl bg-slate-50 dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 print:bg-slate-50 print:border-slate-300">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                Покупатель:
              </span>
              <p className="font-bold text-sm text-slate-900 dark:text-white print:text-black mt-0.5">
                {order.customerName}
              </p>
              {order.customerPhone && (
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                  Тел: {order.customerPhone}
                </p>
              )}
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                Способ оплаты:
              </span>
              <p className="font-bold text-xs text-emerald-600 dark:text-emerald-400 print:text-black mt-0.5">
                {paymentMethodLabels[order.paymentMethod] || order.paymentMethod}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5 flex items-center justify-end gap-1">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500 inline" />
                Оплачено полностью
              </p>
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 uppercase">
                <th className="py-2 px-1">№</th>
                <th className="py-2 px-2">Товар / Оборудование</th>
                <th className="py-2 px-2 text-center">Тип</th>
                <th className="py-2 px-2 text-center">Кол-во</th>
                <th className="py-2 px-2 text-right">Цена</th>
                <th className="py-2 px-1 text-right">Сумма</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {order.items.map((item, idx) => (
                <tr key={idx} className="py-2">
                  <td className="py-2 px-1 text-slate-400">{idx + 1}</td>
                  <td className="py-2 px-2 font-semibold text-slate-900 dark:text-white print:text-black">
                    {item.name}
                  </td>
                  <td className="py-2 px-2 text-center">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 print:border print:border-slate-300">
                      {item.itemType === 'BIKE'
                        ? 'Электробайк'
                        : item.itemType === 'BATTERY'
                        ? 'Аккумулятор'
                        : item.itemType === 'PART'
                        ? 'Запчасть'
                        : 'Экипировка'}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-center font-bold">{item.quantity} шт.</td>
                  <td className="py-2 px-2 text-right text-slate-600 dark:text-slate-300 print:text-black">
                    {item.price.toLocaleString('ru-RU')} ₽
                  </td>
                  <td className="py-2 px-1 text-right font-bold text-slate-900 dark:text-white print:text-black">
                    {(item.price * item.quantity).toLocaleString('ru-RU')} ₽
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Order Total */}
          <div className="flex justify-end pt-2 border-t-2 border-slate-200 dark:border-slate-800">
            <div className="w-64 space-y-1.5 text-right">
              <div className="flex justify-between text-xs text-slate-500">
                <span>Итого позиций:</span>
                <span>{order.items.reduce((sum, it) => sum + it.quantity, 0)} шт.</span>
              </div>
              <div className="flex justify-between text-base font-black text-slate-900 dark:text-white print:text-black pt-1 border-t border-slate-200 dark:border-slate-800">
                <span>ИТОГО К ОПЛАТЕ:</span>
                <span className="text-emerald-600 dark:text-emerald-400 print:text-black">
                  {order.totalAmount.toLocaleString('ru-RU')} ₽
                </span>
              </div>
            </div>
          </div>

          {/* Warranty Terms */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0a140f] border border-slate-200 dark:border-emerald-500/15 text-[10px] text-slate-600 dark:text-slate-400 space-y-1 print:bg-transparent print:border-slate-400">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200 print:text-black uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Гарантийные обязательства сервисного центра:
            </div>
            <ul className="list-disc list-inside space-y-0.5">
              <li>На электровелосипеды б/у: гарантия 14 календарных дней на раму и мотор-колесо.</li>
              <li>На новые запчасти и зарядные устройства: гарантия 30 дней со дня покупки.</li>
              <li>
                Гарантия не распространяется на механические повреждения при падении, следы вскрытия
                BMS аккумулятора и естественный износ тормозных колодок.
              </li>
            </ul>
          </div>

          {/* Signatures */}
          <div className="pt-6 grid grid-cols-2 gap-8 text-[11px]">
            <div>
              <p className="font-semibold text-slate-600 dark:text-slate-400">Продавец (кассир):</p>
              <div className="mt-6 border-b border-slate-400 flex justify-between items-end pb-1">
                <span className="text-[10px] text-slate-400">Иван Ковалев (Менеджер)</span>
                <span className="text-[10px] text-slate-400">/ подпись /</span>
              </div>
            </div>
            <div>
              <p className="font-semibold text-slate-600 dark:text-slate-400">
                Покупатель (с условиями гарантии ознакомлен):
              </p>
              <div className="mt-6 border-b border-slate-400 flex justify-between items-end pb-1">
                <span className="text-[10px] text-slate-400">{order.customerName}</span>
                <span className="text-[10px] text-slate-400">/ подпись /</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
