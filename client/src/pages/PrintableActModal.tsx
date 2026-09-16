import React from 'react';
import { Modal } from '../components/Modal';
import { Rental } from '../types';
import { Printer, Download, CheckCircle2 } from 'lucide-react';

interface PrintableActModalProps {
  isOpen: boolean;
  onClose: () => void;
  rental: Rental | null;
}

export const PrintableActModal: React.FC<PrintableActModalProps> = ({
  isOpen,
  onClose,
  rental,
}) => {
  if (!rental) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(rental.startedAt).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const formattedExpiry = new Date(rental.expiresAt).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Акт приема-передачи оборудования"
      subtitle={`Договор аренды ${rental.rentalNumber}`}
      maxWidth="4xl"
    >
      <div className="space-y-6">
        {/* Action bar for print */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 no-print">
          <div className="flex items-center gap-2 text-xs text-sky-800 dark:text-sky-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Договор успешно сформирован и зарегистрирован в системе</span>
          </div>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
          >
            <Printer className="w-4 h-4" />
            Печать акта / Экспорт в PDF
          </button>
        </div>

        {/* Printable Document Area */}
        <div
          id="printable-act"
          className="p-8 bg-white text-slate-900 rounded-xl border border-slate-200 shadow-sm text-xs leading-relaxed font-sans print:p-0 print:border-0 print:shadow-none"
        >
          <div className="text-center pb-4 border-b border-slate-300">
            <h2 className="text-base font-extrabold uppercase tracking-wide">
              АКТ ПРИЕМА-ПЕРЕДАЧИ ЭЛЕКТРОВЕЛОСИПЕДА И СОПУТСТВУЮЩЕГО ОБОРУДОВАНИЯ
            </h2>
            <p className="text-[11px] text-slate-600 mt-1">
              к Договору проката № <strong>{rental.rentalNumber}</strong> от {formattedDate} г.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6 my-4 text-[11px]">
            <div>
              <p className="font-bold text-slate-800 mb-1">АРЕНДОДАТЕЛЬ:</p>
              <p>ООО «Курьер Электро Транспорт»</p>
              <p>ИНН 7701984210 / КПП 770101001</p>
              <p>Адрес базы: г. Москва, Дмитровский пр., д. 10</p>
              <p>Менеджер: {rental.manager?.fullName || 'Иван Ковалев'}</p>
              <p>Тел. диспетчерской: +7 (495) 120-40-50</p>
            </div>
            <div>
              <p className="font-bold text-slate-800 mb-1">АРЕНДАТОР (КУРЬЕР):</p>
              <p><strong>{rental.client?.fullName}</strong></p>
              <p>Телефон: {rental.client?.phone}</p>
              <p>
                Гражданство: {rental.client?.citizenship || 'РФ'} | Паспорт:{' '}
                {rental.client?.passportSerial} {rental.client?.passportNumber}
              </p>
              {rental.client?.patentNumber && (
                <p>Патент / ЕАЭС: {rental.client?.patentNumber}</p>
              )}
              {rental.client?.courierService && (
                <p>Сервис доставки: <strong>{rental.client.courierService}</strong></p>
              )}
            </div>
          </div>

          <div className="my-4">
            <p className="font-bold mb-2">1. СВЕДЕНИЯ О ТРАНСПОРТНОМ СРЕДСТВЕ:</p>
            <table className="w-full border-collapse border border-slate-300 text-center text-[11px]">
              <thead>
                <tr className="bg-slate-100 font-semibold">
                  <th className="border border-slate-300 p-1.5">Инвентарный №</th>
                  <th className="border border-slate-300 p-1.5">Модель</th>
                  <th className="border border-slate-300 p-1.5">Серийный № АКБ</th>
                  <th className="border border-slate-300 p-1.5">Мощность электромотора</th>
                  <th className="border border-slate-300 p-1.5">№ Рамы</th>
                  <th className="border border-slate-300 p-1.5">№ Мотор-колеса</th>
                  <th className="border border-slate-300 p-1.5">Пробег на момент выдачи</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-slate-300 p-1.5 font-bold text-sky-800">
                    {rental.bike?.inventoryNumber}
                  </td>
                  <td className="border border-slate-300 p-1.5">{rental.bike?.model?.name}</td>
                  <td className="border border-slate-300 p-1.5 font-mono font-bold text-emerald-800">
                    {rental.bike?.battery
                      ? `${rental.bike.battery.serialNumber} (${rental.bike.battery.voltage}V ${rental.bike.battery.capacityAh}Ah, SoH ${rental.bike.battery.healthPercent}%)`
                      : 'Без аккумулятора'}
                  </td>
                  <td className="border border-slate-300 p-1.5">
                    {rental.bike?.model?.powerWatts}W
                  </td>
                  <td className="border border-slate-300 p-1.5 font-mono text-[10px]">
                    {rental.bike?.frameNumber || '—'}
                  </td>
                  <td className="border border-slate-300 p-1.5 font-mono text-[10px]">
                    {rental.bike?.motorNumber || '—'}
                  </td>
                  <td className="border border-slate-300 p-1.5">{rental.bike?.mileageKm || 0} км</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="my-4">
            <p className="font-bold mb-2">2. СОПУТСТВУЮЩАЯ ЭКИПИРОВКА И АКСЕССУАРЫ:</p>
            {rental.outfits && rental.outfits.length > 0 ? (
              <table className="w-full border-collapse border border-slate-300 text-left text-[11px]">
                <thead>
                  <tr className="bg-slate-100 font-semibold text-center">
                    <th className="border border-slate-300 p-1.5 w-10">№</th>
                    <th className="border border-slate-300 p-1.5">Наименование</th>
                    <th className="border border-slate-300 p-1.5">Инв. номер</th>
                    <th className="border border-slate-300 p-1.5">Категория</th>
                    <th className="border border-slate-300 p-1.5">Залоговая ст-ть</th>
                    <th className="border border-slate-300 p-1.5 text-center">Отметка о выдаче</th>
                  </tr>
                </thead>
                <tbody>
                  {rental.outfits.map((outfit, idx) => (
                    <tr key={outfit.id}>
                      <td className="border border-slate-300 p-1.5 text-center">{idx + 1}</td>
                      <td className="border border-slate-300 p-1.5 font-medium">{outfit.name}</td>
                      <td className="border border-slate-300 p-1.5 font-mono text-center">
                        {outfit.inventoryNumber || '—'}
                      </td>
                      <td className="border border-slate-300 p-1.5">{outfit.category}</td>
                      <td className="border border-slate-300 p-1.5 text-right font-medium">
                        {outfit.depositValue.toLocaleString('ru-RU')} ₽
                      </td>
                      <td className="border border-slate-300 p-1.5 text-center font-bold text-emerald-700">
                        [ Выдано ]
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="italic text-slate-500">Дополнительная экипировка не выдавалась.</p>
            )}
          </div>

          <div className="my-4 p-3 bg-slate-50 border border-slate-200 rounded">
            <p className="font-bold mb-1">3. ФИНАНСОВЫЕ УСЛОВИЯ:</p>
            <div className="grid grid-cols-3 gap-2 text-[11px]">
              <div>
                Тариф: <strong>{rental.tariff?.name}</strong>
              </div>
              <div>
                Период: с {formattedDate} по {formattedExpiry}
              </div>
              <div>
                Сумма тарифа: <strong>{rental.tariff?.price.toLocaleString('ru-RU')} ₽</strong>
              </div>
              <div>
                Обеспечительный залог: <strong>{rental.depositAmount.toLocaleString('ru-RU')} ₽</strong>
              </div>
              <div>
                Форма аренды: <strong>{rental.type === 'RENT_TO_OWN' ? 'Аренда с выкупом' : 'Стандартный прокат'}</strong>
              </div>
            </div>
          </div>

          <div className="my-4 space-y-1 text-[10px] text-slate-600">
            <p>
              • Арендатор подтверждает, что электровелосипед и экипировка осмотрены лично, находятся в исправном техническом состоянии, видимых повреждений рамы, колес, тормозов и проводки не имеют.
            </p>
            <p>
              • Арендатор обязуется не мыть электровелосипед мойками высокого давления (Керхер) в узлы контроллера и мотор-колеса, а также не заряжать холодный аккумулятор на морозе без отогрева в теплом помещении.
            </p>
            <p>
              • В случае ДТП или падения Арендатор обязуется незамедлительно уведомить диспетчера и компенсировать стоимость поврежденных деталей согласно прайсу СТО.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-10 mt-8 pt-4 border-t border-slate-300">
            <div>
              <p className="font-semibold mb-6">От Арендодателя:</p>
              <div className="flex items-center justify-between border-b border-slate-400 pb-1">
                <span>Менеджер: {rental.manager?.fullName || 'Иван Ковалев'}</span>
                <span className="italic text-[10px] text-slate-400">/ подпись / М.П.</span>
              </div>
            </div>
            <div>
              <p className="font-semibold mb-6">От Арендатора (Курьера):</p>
              <div className="flex items-center justify-between border-b border-slate-400 pb-1">
                <span>Курьер: {rental.client?.fullName}</span>
                <span className="italic text-[10px] text-slate-400">/ подпись /</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
