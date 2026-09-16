import React, { useState } from 'react';
import { Modal } from '../components/Modal';
import { Rental } from '../types';
import { api } from '../services/api';
import {
  CheckCircle,
  AlertTriangle,
  Wrench,
  ShieldCheck,
  RotateCcw,
  Banknote,
  DollarSign,
} from 'lucide-react';
import { toast } from 'sonner';

interface RentalCloseModalProps {
  isOpen: boolean;
  onClose: () => void;
  rental: Rental | null;
  onSuccess: () => void;
}

export const RentalCloseModal: React.FC<RentalCloseModalProps> = ({
  isOpen,
  onClose,
  rental,
  onSuccess,
}) => {
  if (!rental) return null;

  const [isLoading, setIsLoading] = useState(false);
  const [bikeCondition, setBikeCondition] = useState<'OK' | 'NEEDS_REPAIR'>('OK');
  const [bikeMileageKm, setBikeMileageKm] = useState<number>(rental.bike?.mileageKm || 0);
  const [defectDescription, setDefectDescription] = useState('');
  const [faultType, setFaultType] = useState<'COMPANY_EXPENSE' | 'CLIENT_FAULT'>('CLIENT_FAULT');

  // Track outfit returns condition & deductions
  const [outfitReturns, setOutfitReturns] = useState<{
    [outfitId: string]: {
      condition: 'OK' | 'DAMAGED' | 'LOST';
      deductionAmount: number;
    };
  }>(() => {
    const initial: any = {};
    (rental.outfits || []).forEach((o) => {
      initial[o.id] = { condition: 'OK', deductionAmount: 0 };
    });
    return initial;
  });

  const [refundMethod, setRefundMethod] = useState<'CASH' | 'CARD' | 'SBP' | 'BANK_TRANSFER'>('CASH');
  const [notes, setNotes] = useState('');

  const handleOutfitConditionChange = (
    outfitId: string,
    condition: 'OK' | 'DAMAGED' | 'LOST',
    depositValue: number
  ) => {
    let deduction = 0;
    if (condition === 'DAMAGED') deduction = Math.round(depositValue * 0.5) || 500;
    if (condition === 'LOST') deduction = depositValue;

    setOutfitReturns((prev) => ({
      ...prev,
      [outfitId]: {
        condition,
        deductionAmount: deduction,
      },
    }));
  };

  // Compute total deduction and net deposit refund
  const initialDeposit = rental.depositAmount || 0;
  const totalDeductions = Object.values(outfitReturns).reduce(
    (sum, item) => sum + (item.deductionAmount || 0),
    0
  );
  const netRefund = Math.max(0, initialDeposit - totalDeductions);

  const handleSubmitClose = async () => {
    try {
      setIsLoading(true);

      const outfitReturnsPayload = Object.entries(outfitReturns).map(([outfitId, item]) => ({
        outfitId,
        condition: item.condition,
        deductionAmount: item.deductionAmount,
      }));

      const res = await api.closeRental(rental.id, {
        bikeCondition,
        bikeMileageKm: Number(bikeMileageKm),
        defectDescription: bikeCondition === 'NEEDS_REPAIR' ? defectDescription : undefined,
        faultType: bikeCondition === 'NEEDS_REPAIR' ? faultType : undefined,
        outfitReturns: outfitReturnsPayload,
        refundMethod,
        notes,
      });

      if (res.repairOrder) {
        toast.warning(
          `Аренда закрыта. Создан заказ-наряд СТО ${res.repairOrder.orderNumber}, байк переведен на ремонт.`
        );
      } else {
        toast.success(`Аренда ${rental.rentalNumber} закрыта, байк доступен на складе!`);
      }

      if (netRefund > 0) {
        toast.info(`Залог в размере ${netRefund.toLocaleString('ru-RU')} ₽ возвращен курьеру.`);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Ошибка закрытия аренды');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Приемка техники и закрытие аренды"
      subtitle={`Договор № ${rental.rentalNumber} • Курьер: ${rental.client?.fullName}`}
      maxWidth="2xl"
    >
      <div className="space-y-5 text-xs">
        {/* 1. Bike Return Inspection */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-sky-500" />
              1. Состояние электровелосипеда ({rental.bike?.inventoryNumber})
            </span>
            <div className="flex items-center gap-2">
              <label className="text-slate-500">Пробег при сдаче (км):</label>
              <input
                type="number"
                value={bikeMileageKm}
                onChange={(e) => setBikeMileageKm(Number(e.target.value))}
                className="w-24 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-center font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label
              onClick={() => setBikeCondition('OK')}
              className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                bikeCondition === 'OK'
                  ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 ring-1 ring-emerald-400'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
              }`}
            >
              <CheckCircle
                className={`w-5 h-5 ${
                  bikeCondition === 'OK' ? 'text-emerald-600' : 'text-slate-300'
                }`}
              />
              <div>
                <p className="font-bold text-slate-900 dark:text-white">Исправен, без дефектов</p>
                <p className="text-[10px] text-slate-400">
                  Байк перейдет в статус AVAILABLE (готов к выдаче)
                </p>
              </div>
            </label>

            <label
              onClick={() => setBikeCondition('NEEDS_REPAIR')}
              className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                bikeCondition === 'NEEDS_REPAIR'
                  ? 'border-rose-500 bg-rose-50/70 dark:bg-rose-950/40 ring-1 ring-rose-400'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
              }`}
            >
              <Wrench
                className={`w-5 h-5 ${
                  bikeCondition === 'NEEDS_REPAIR' ? 'text-rose-600' : 'text-slate-300'
                }`}
              />
              <div>
                <p className="font-bold text-slate-900 dark:text-white">Требуется ремонт / СТО</p>
                <p className="text-[10px] text-slate-400">
                  Автосоздание RepairOrder и статус IN_MAINTENANCE
                </p>
              </div>
            </label>
          </div>

          {bikeCondition === 'NEEDS_REPAIR' && (
            <div className="space-y-2 p-3 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900">
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                  Описание выявленных дефектов и повреждений *
                </label>
                <textarea
                  rows={2}
                  value={defectDescription}
                  onChange={(e) => setDefectDescription(e.target.value)}
                  placeholder="Например: разбита фара LED, погнут тормозной диск, следы удара о бордюр..."
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                  Ответственность за оплату ремонта:
                </label>
                <select
                  value={faultType}
                  onChange={(e) => setFaultType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                >
                  <option value="CLIENT_FAULT">Вина курьера (CLIENT_FAULT) — удержание из залога / счет</option>
                  <option value="COMPANY_EXPENSE">Естественный износ / Брак (COMPANY_EXPENSE) — за счет сервиса</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* 2. Outfit Return Checklist */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3">
          <span className="font-bold text-slate-800 dark:text-slate-200">
            2. Чек-лист возврата сопутствующей экипировки:
          </span>

          {(!rental.outfits || rental.outfits.length === 0) ? (
            <p className="text-slate-400 italic">Экипировка по данному договору не выдавалась.</p>
          ) : (
            <div className="space-y-2">
              {rental.outfits.map((outfit) => {
                const currentReturn = outfitReturns[outfit.id] || { condition: 'OK', deductionAmount: 0 };
                return (
                  <div
                    key={outfit.id}
                    className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{outfit.name}</p>
                      <p className="text-[10px] text-slate-400">
                        Инв: {outfit.inventoryNumber || '—'} • Залоговая стоимость:{' '}
                        {outfit.depositValue} ₽
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={currentReturn.condition}
                        onChange={(e) =>
                          handleOutfitConditionChange(
                            outfit.id,
                            e.target.value as any,
                            outfit.depositValue
                          )
                        }
                        className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold"
                      >
                        <option value="OK">Цел (Сдан на склад)</option>
                        <option value="DAMAGED">Поврежден (Штраф 50%)</option>
                        <option value="LOST">Утерян (Списание 100%)</option>
                      </select>

                      {currentReturn.condition !== 'OK' && (
                        <div className="flex items-center gap-1 text-rose-600 font-bold">
                          <span>Удержание:</span>
                          <input
                            type="number"
                            min="0"
                            value={currentReturn.deductionAmount}
                            onChange={(e) =>
                              setOutfitReturns((prev) => ({
                                ...prev,
                                [outfit.id]: {
                                  ...prev[outfit.id],
                                  deductionAmount: Number(e.target.value),
                                },
                              }))
                            }
                            className="w-20 px-2 py-1 bg-white dark:bg-slate-900 border border-rose-300 rounded text-center text-xs text-rose-600"
                          />
                          <span>₽</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 3. Deposit Refund Settlement Box */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 text-white space-y-2">
          <span className="font-bold text-sky-400">3. Финансовый взаиморасчет по залогу:</span>

          <div className="flex justify-between items-center text-slate-300">
            <span>Внесенный обеспечительный залог:</span>
            <span>{initialDeposit.toLocaleString('ru-RU')} ₽</span>
          </div>
          <div className="flex justify-between items-center text-slate-300">
            <span>Сумма удержаний (за повреждения / утерю):</span>
            <span className="text-rose-400 font-bold">
              -{totalDeductions.toLocaleString('ru-RU')} ₽
            </span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-slate-700 text-sm font-extrabold text-emerald-400">
            <span>СУММА К ВОЗВРАТУ КУРЬЕРУ:</span>
            <span>{netRefund.toLocaleString('ru-RU')} ₽</span>
          </div>

          <div className="pt-2 flex items-center justify-between text-xs">
            <span className="text-slate-400">Метод возврата залога:</span>
            <select
              value={refundMethod}
              onChange={(e) => setRefundMethod(e.target.value as any)}
              className="px-2 py-1 bg-slate-800 border border-slate-600 rounded text-white text-xs"
            >
              <option value="CASH">Наличные из кассы</option>
              <option value="SBP">СБП / На карту курьера</option>
              <option value="CARD">Возврат на карту (эквайринг)</option>
              <option value="BANK_TRANSFER">Банковский перевод</option>
            </select>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-slate-500 mb-1">Примечание к возврату</label>
          <input
            type="text"
            placeholder="Комментарий менеджера при закрытии договора"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-xs font-semibold rounded-xl"
          >
            Отмена
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={handleSubmitClose}
            className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-sky-600/30 transition-all flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            {isLoading ? 'Завершение...' : 'Завершить аренду и выплатить залог'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
