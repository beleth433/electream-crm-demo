import React, { useState, useEffect } from 'react';
import { Bike, Battery, RepairFaultType } from '../types';
import { api } from '../services/api';
import { Modal } from './Modal';
import { Wrench, ShieldCheck, UserX, Bike as BikeIcon, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { getNextSequentialNumber, getStoredPrefix } from '../utils/numbering';

interface QuickSendToRepairModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  target: { type: 'BIKE'; item: Bike } | { type: 'BATTERY'; item: Battery } | null;
}

export const QuickSendToRepairModal: React.FC<QuickSendToRepairModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  target,
}) => {
  const [orderNumber, setOrderNumber] = useState('');
  const [description, setDescription] = useState('');
  const [faultType, setFaultType] = useState<RepairFaultType>('COMPANY_EXPENSE');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && target) {
      setDescription('');
      setFaultType('COMPANY_EXPENSE');
      api
        .getRepairs()
        .then((existingRepairs) => {
          const prefix = getStoredPrefix('repair', 'ЗН-');
          const nextNum = getNextSequentialNumber(
            existingRepairs.map((r) => r.orderNumber),
            prefix,
            3
          );
          setOrderNumber(nextNum);
        })
        .catch(() => {
          setOrderNumber(`ЗН-${Date.now().toString().slice(-4)}`);
        });
    }
  }, [isOpen, target]);

  if (!target) return null;

  const isBike = target.type === 'BIKE';
  const itemName = isBike
    ? `Байк ${target.item.inventoryNumber} (${target.item.model?.name || 'Электровелосипед'})`
    : `АКБ ${target.item.serialNumber} (${target.item.model?.name || `${target.item.voltage}V ${target.item.capacityAh}Ah`})`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      toast.error('Укажите причину отправки или описание неисправности');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.createRepair({
        itemType: target.type,
        bikeId: isBike ? target.item.id : null,
        batteryId: !isBike ? target.item.id : null,
        orderNumber: orderNumber.trim(),
        faultType,
        description: description.trim(),
        laborCost: 0,
      });

      toast.success(
        `Заказ-наряд ${orderNumber} создан! ${isBike ? 'Байк' : 'АКБ'} передан в мастерскую СТО.`
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Ошибка отправки в СТО');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isBike ? 'Отправить электровелосипед на ТО в СТО' : 'Отправить аккумулятор на ТО в СТО'}
      subtitle={`Быстрое оформление заказ-наряда для ${itemName}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Target Info Banner */}
        <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold text-base">
              {isBike ? <BikeIcon className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
            </div>
            <div>
              <span className="font-bold text-slate-900 dark:text-white text-xs block">
                {itemName}
              </span>
              <span className="text-[10px] text-slate-400">
                {isBike
                  ? `Локация: ${target.item.currentLocation || 'Центральный склад'}`
                  : `Химия: ${target.item.chemistry || 'Li-ion'} • Вольтаж: ${target.item.voltage}V`}
              </span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-slate-950 uppercase tracking-wider">
            В ремонт
          </span>
        </div>

        {/* Order Number */}
        <div>
          <label className="block text-slate-500 dark:text-slate-400 mb-1 font-medium">
            Номер заказ-наряда *
          </label>
          <input
            type="text"
            required
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            className="w-full px-3 py-2 bg-white dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 rounded-xl font-mono font-bold text-xs"
          />
        </div>

        {/* Description / Defect */}
        <div>
          <label className="block text-slate-500 dark:text-slate-400 mb-1 font-medium">
            Причина обращения / описание дефекта *
          </label>
          <textarea
            required
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={
              isBike
                ? 'Например: замена колодок, восьмерка на колесе, люфт руля, плановое ТО...'
                : 'Например: поврежден разъем XT60, быстро теряет зарядку, балансировка ячеек BMS...'
            }
            className="w-full px-3 py-2 bg-white dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 rounded-xl text-xs custom-scrollbar resize-none"
          />
        </div>

        {/* Responsibility / Fault Type */}
        <div>
          <label className="block text-slate-500 dark:text-slate-400 mb-1 font-medium">
            Тип ответственности / Оплата работ
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setFaultType('COMPANY_EXPENSE')}
              className={`p-2.5 rounded-xl border text-left flex flex-col gap-0.5 transition-all ${
                faultType === 'COMPANY_EXPENSE'
                  ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/30'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                Сервис компании
              </span>
              <span className="text-[10px] text-slate-400">Плановое ТО, естественный износ</span>
            </button>

            <button
              type="button"
              onClick={() => setFaultType('CLIENT_FAULT')}
              className={`p-2.5 rounded-xl border text-left flex flex-col gap-0.5 transition-all ${
                faultType === 'CLIENT_FAULT'
                  ? 'border-rose-500 bg-rose-50/20 dark:bg-rose-950/30'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <UserX className="w-3.5 h-3.5 text-rose-500" />
                По вине клиента
              </span>
              <span className="text-[10px] text-slate-400">ДТП, физический дефект, возмещение</span>
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-emerald-500/15">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl shadow-md shadow-amber-500/20 transition flex items-center gap-1.5"
          >
            <Wrench className="w-4 h-4" />
            {isSubmitting ? 'Отправка...' : 'Отправить в мастерскую СТО'}
          </button>
        </div>
      </form>
    </Modal>
  );
};