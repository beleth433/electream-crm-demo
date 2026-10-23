import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { Modal } from '../components/Modal';
import { PrintableContent } from '../components/PrintableContent';
import { Rental } from '../types';
import type { CrmDocument } from '../types/documents';
import { Printer, Download, CheckCircle2 } from 'lucide-react';

interface PrintableActModalProps {
  isOpen: boolean;
  onClose: () => void;
  rental: Rental | null;
  paymentDetails?: any;
  archivedDocument?: CrmDocument;
}

export const PrintableActModal: React.FC<PrintableActModalProps> = ({
  isOpen,
  onClose,
  rental: sourceRental,
  archivedDocument,
}) => {
  const { data: fetched, error, isLoading } = useQuery({ queryKey: ['document', `doc-handover_act-${sourceRental?.id}`], queryFn: () => api.getDocument(`doc-handover_act-${sourceRental!.id}`), enabled: isOpen && !!sourceRental && !archivedDocument, retry: false });
  const archived = archivedDocument || fetched;
  const rental = archived?.snapshot.rentalData;
  const paymentDetails = archived?.snapshot.issuer;
  if (!isOpen || !sourceRental) return null;
  if (!rental) return <Modal isOpen={isOpen} onClose={onClose} title="Акт выдачи техники"><p role={error ? 'alert' : 'status'}>{error ? error.message : isLoading ? 'Загрузка сохранённого документа…' : 'Данные документа недоступны'}</p></Modal>;

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

  const isBuyout = rental.type === 'RENT_TO_OWN';
  const startMs = new Date(rental.startedAt).getTime();
  const expMs = new Date(rental.expiresAt).getTime();
  const calculatedDays = Math.max(1, Math.round((expMs - startMs) / (1000 * 60 * 60 * 24)));
  const intervalDays = rental.paymentIntervalDays || rental.tariff?.paymentIntervalDays || 7;
  const buyoutTotal = rental.totalBuyoutPrice || rental.tariff?.totalBuyoutPrice || (rental.tariff?.price || 0);
  const installmentAmt = rental.installmentPayment || rental.tariff?.installmentPayment || rental.tariff?.price || 0;
  const initialPaid = rental.totalPaidForBuyout ?? 0;
  const remainingToPay = Math.max(0, buyoutTotal - initialPaid);

  // Универсальный расчет будущих платежей с учетом любого первого взноса (0, стандартный, повышенный)
  const futurePeriodsCount = installmentAmt > 0 && remainingToPay > 0
    ? Math.max(1, Math.ceil(remainingToPay / installmentAmt))
    : (remainingToPay === 0 ? 0 : 1);

  const regularFutureCount = Math.max(0, futurePeriodsCount - 1);
  const regularFutureTotal = regularFutureCount * installmentAmt;
  const finalFuturePayment = Math.max(0, remainingToPay - regularFutureTotal);

  const totalPeriods = initialPaid > 0 && initialPaid >= installmentAmt
    ? (1 + futurePeriodsCount)
    : Math.max(1, futurePeriodsCount);

  const totalDays = isBuyout
    ? (rental.tariff?.durationDays || (totalPeriods * intervalDays))
    : calculatedDays;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isBuyout ? "Акт приема-передачи (Аренда с правом выкупа)" : "Акт приема-передачи оборудования"}
      subtitle={`Договор ${isBuyout ? 'выкупа' : 'аренды'} ${rental.rentalNumber}`}
      maxWidth="4xl"
      mobileFullscreen
    >
      <div className="space-y-6">
        {/* Action bar for print */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 no-print">
          <div className="flex items-center gap-2 text-xs text-sky-800 dark:text-sky-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Договор успешно сформирован и зарегистрирован в системе</span>
          </div>
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all self-stretch sm:self-auto"
          >
            <Printer className="w-4 h-4 shrink-0" />
            Печать акта / Экспорт в PDF
          </button>
        </div>

        {/* Printable Document Area */}
        <PrintableContent
          className="p-4 sm:p-8 bg-white text-slate-900 rounded-xl border border-slate-200 shadow-sm text-xs leading-relaxed font-sans print:p-0 print:border-0 print:shadow-none"
        >
          {archived?.reconstructed && <p className="mb-3 text-xs">Восстановлен {new Date(archived.capturedAt).toLocaleDateString('ru-RU')} из доступных данных. Первоначальные данные могли отличаться.</p>}
          <div className="text-center pb-4 border-b border-slate-300">
            <h2 className="text-sm sm:text-base font-extrabold uppercase tracking-wide">
              {isBuyout
                ? 'АКТ ПРИЕМА-ПЕРЕДАЧИ ТРАНСПОРТНОГО СРЕДСТВА К ДОГОВОРУ АРЕНДЫ С ПРАВОМ ВЫКУПА'
                : 'АКТ ПРИЕМА-ПЕРЕДАЧИ ЭЛЕКТРОВЕЛОСИПЕДА И СОПУТСТВУЮЩЕГО ОБОРУДОВАНИЯ'}
            </h2>
            <p className="text-[11px] text-slate-600 mt-1">
              к Договору {isBuyout ? 'аренды с правом выкупа' : 'проката'} № <strong>{rental.rentalNumber}</strong> от {formattedDate}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 my-4 text-[11px]">
            <div>
              <p className="font-bold text-slate-800 mb-1">АРЕНДОДАТЕЛЬ:</p>
              <p>{paymentDetails?.recipientName || 'ELECTREAM PRO SAMOKAT'}</p>
              {paymentDetails?.inn && <p>ИНН {paymentDetails.inn}</p>}
              {paymentDetails?.bankName && <p>Банк: {paymentDetails.bankName}</p>}
              {paymentDetails?.accountNumber && <p>Расчётный счёт: {paymentDetails.accountNumber}</p>}
              {paymentDetails?.bik && <p>БИК: {paymentDetails.bik}</p>}
              <p>Менеджер: {rental.manager?.fullName || 'Администратор парка'}</p>
              {paymentDetails?.phoneNumber && <p>Телефон: {paymentDetails.phoneNumber}</p>}
            </div>
            <div>
              <p className="font-bold text-slate-800 mb-1">АРЕНДАТОР (КУРЬЕР):</p>
              <p><strong>{rental.client?.fullName}</strong></p>
              <p>Телефон: {rental.client?.phone}</p>
              <p>
                Гражданство: {rental.client?.citizenship || 'РФ'} | Паспорт:{' '}
                {rental.client?.passportSerial} {rental.client?.passportNumber}
              </p>
              {rental.client?.registrationAddress && <p>Прописка: {rental.client.registrationAddress}</p>}
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
            <div className="overflow-x-auto w-full">
              <table className="w-full border-collapse border border-slate-300 text-center text-[11px] min-w-[500px]">
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
                        ? `${rental.bike.battery.serialNumber} (${rental.bike.battery.voltage}V ${rental.bike.battery.capacityAh}Ah)`
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
          </div>

          <div className="my-4">
            <p className="font-bold mb-2">2. КОМПЛЕКТАЦИЯ ПРИ ВЫДАЧЕ:</p>
            <div className="overflow-x-auto w-full">
              <table className="w-full border-collapse border border-slate-300 text-left text-[11px] min-w-[500px]">
                <thead>
                  <tr className="bg-slate-100 font-semibold text-center">
                    <th className="border border-slate-300 p-1.5 w-10">№</th>
                    <th className="border border-slate-300 p-1.5">Наименование элемента</th>
                    <th className="border border-slate-300 p-1.5">Серийный / Идент. номер</th>
                    <th className="border border-slate-300 p-1.5 text-center">Состояние</th>
                    <th className="border border-slate-300 p-1.5 text-center">Отметка о передаче</th>
                  </tr>
                </thead>
                <tbody>
                  {(rental.batteries || []).map((battery, index) => <tr key={battery.id}>
                    <td className="border border-slate-300 p-1.5 text-center">{index + 1}</td>
                    <td className="border border-slate-300 p-1.5 font-medium">Аккумулятор {battery.voltage}V {battery.capacityAh}Ah</td>
                    <td className="border border-slate-300 p-1.5 font-mono text-center">
                      {battery.serialNumber}
                    </td>
                    <td className="border border-slate-300 p-1.5 text-center">Исправен / Заряжен</td>
                    <td className="border border-slate-300 p-1.5 text-center font-bold text-emerald-700">[ Передано ]</td>
                  </tr>)}
                </tbody>
              </table>
            </div>
          </div>

          {rental.outfits && rental.outfits.length > 0 && (
            <div className="my-4">
              <p className="font-bold mb-2">3. ДОПОЛНИТЕЛНАЯ ЭКИПИРОВКА И АКСЕССУАРЫ:</p>
              <div className="overflow-x-auto w-full">
                <table className="w-full border-collapse border border-slate-300 text-center text-[11px] min-w-[500px]">
                  <thead>
                    <tr className="bg-slate-100 font-semibold">
                      <th className="border border-slate-300 p-1.5">Наименование</th>
                      <th className="border border-slate-300 p-1.5">Инвентарный №</th>
                      <th className="border border-slate-300 p-1.5">Категория</th>
                      <th className="border border-slate-300 p-1.5">Оценочная стоимость / Залог</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rental.outfits.map((outfit) => (
                      <tr key={outfit.id}>
                        <td className="border border-slate-300 p-1.5 font-medium">{outfit.name}</td>
                        <td className="border border-slate-300 p-1.5 font-mono">
                          {outfit.inventoryNumber || '—'}
                        </td>
                        <td className="border border-slate-300 p-1.5">{outfit.category}</td>
                        <td className="border border-slate-300 p-1.5">
                          {outfit.depositValue.toLocaleString('ru-RU')} ₽
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="my-4 p-3 bg-slate-50 border border-slate-200 rounded">
            <p className="font-bold mb-1">
              4. ФИНАНСОВЫЕ УСЛОВИЯ {isBuyout ? 'И ПОРЯДОК ВЫКУПА (ст. 624 ГК РФ)' : ''}:
            </p>
            {isBuyout ? (
              <div className="space-y-2 text-[11px]">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  <div>
                    Форма договора: <strong>Аренда с правом выкупа (ст. 624 ГК РФ)</strong>
                  </div>
                  <div>
                    Срок договора: <strong>{totalDays} кал. дн. ({totalPeriods} расч. период{totalPeriods === 1 ? '' : totalPeriods < 5 ? 'а' : 'ов'} по {intervalDays} дн.)</strong>
                  </div>
                  <div>
                    Период действия: с {formattedDate} по {formattedExpiry} включительно
                  </div>
                  <div>
                    Полная выкупная цена: <strong className="text-purple-700">{buyoutTotal.toLocaleString('ru-RU')} ₽</strong>
                  </div>
                  <div>
                    Обеспечительный залог: <strong>{rental.depositAmount.toLocaleString('ru-RU')} ₽</strong>
                  </div>
                  <div>
                    Внесено при оформлении:{' '}
                    <strong className="text-emerald-700">
                      {initialPaid.toLocaleString('ru-RU')} ₽
                    </strong>{' '}
                    <span className="text-slate-500 text-[10px]">
                      {initialPaid === 0
                        ? '(без взноса)'
                        : initialPaid === installmentAmt
                        ? '(Платёж № 1)'
                        : '(Первонач. взнос)'}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200">
                  <div className="flex flex-wrap items-center justify-between gap-1 text-[11px]">
                    <span className="font-semibold text-slate-700">
                      График погашения остатка ({remainingToPay.toLocaleString('ru-RU')} ₽):
                    </span>
                    {remainingToPay === 0 ? (
                      <span className="text-emerald-600 font-bold">100% оплачено при выдаче</span>
                    ) : (
                      <span>
                        {futurePeriodsCount} {futurePeriodsCount === 1 ? 'платёж' : futurePeriodsCount < 5 ? 'платежа' : 'платежей'} каждые {intervalDays} дн.{' '}
                        {regularFutureCount > 0
                          ? `(платежи ${initialPaid > 0 ? 2 : 1}–${initialPaid > 0 ? (1 + regularFutureCount) : regularFutureCount}: по ${installmentAmt.toLocaleString('ru-RU')} ₽, финал: ${finalFuturePayment.toLocaleString('ru-RU')} ₽)`
                          : `(суммой ${finalFuturePayment.toLocaleString('ru-RU')} ₽)`}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-[11px]">
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
                  Форма аренды: <strong>Стандартный прокат</strong>
                </div>
              </div>
            )}
          </div>

          <div className="my-4 space-y-1 text-[10px] text-slate-600">
            {isBuyout && (
              <>
                <p>
                  • <strong>ПЕРЕХОД ПРАВА СОБСТВЕННОСТИ (ст. 624 ГК РФ):</strong> Право собственности на электровелосипед (инв. № {rental.bike?.inventoryNumber}) и комплектующие переходит к Арендатору исключительно после внесения полной выкупной стоимости ({buyoutTotal.toLocaleString('ru-RU')} ₽) в полном объеме. До момента окончательного расчета собственником оборудования является Арендодатель.
                </p>
                <p>
                  • <strong>ПОРЯДОК РАСЧЕТОВ И РАСТОРЖЕНИЕ:</strong> В случае нарушения графика платежей более чем на 3 (три) календарных дня Арендодатель вправе в одностороннем порядке расторгнуть настоящий договор и изъять технику. При этом ранее внесенные арендные платежи возврату не подлежат и признаются сторонами платой за фактическое временное пользование оборудованием.
                </p>
              </>
            )}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-10 mt-8 pt-4 border-t border-slate-300">
            <div>
              <p className="font-semibold mb-4 sm:mb-6">От Арендодателя:</p>
              <div className="flex items-center justify-between border-b border-slate-400 pb-1">
                <span>Менеджер: {rental.manager?.fullName || 'Администратор парка'}</span>
                <span className="italic text-[10px] text-slate-400">/ подпись / М.П.</span>
              </div>
            </div>
            <div>
              <p className="font-semibold mb-4 sm:mb-6">От Арендатора (Курьера):</p>
              <div className="flex items-center justify-between border-b border-slate-400 pb-1">
                <span>Курьер: {rental.client?.fullName}</span>
                <span className="italic text-[10px] text-slate-400">/ подпись /</span>
              </div>
            </div>
          </div>
        </PrintableContent>
      </div>
    </Modal>
  );
};
