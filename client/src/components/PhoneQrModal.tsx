import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Modal } from './Modal';
import { Copy, Check, Smartphone, Phone, Send, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface PhoneQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  phone: string;
  clientName: string;
  telegram?: string | null;
  details?: {
    rentalNumber?: string;
    bikeInventoryNumber?: string;
    daysOverdue?: number;
    courierService?: string;
    telegram?: string | null;
  };
}

export const PhoneQrModal: React.FC<PhoneQrModalProps> = ({
  isOpen,
  onClose,
  phone,
  clientName,
  telegram,
  details,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Normalize phone number to Russian / International standard
  const getNormalizedPhone = (raw: string) => {
    if (!raw) return { display: '', telUri: '', intl: '', digits: '' };

    const digitsOnly = raw.replace(/\D/g, '');
    let intlDigits = digitsOnly;

    // Convert Russian 8XXXXXXXXXX -> 7XXXXXXXXXX
    if (digitsOnly.length === 11 && digitsOnly.startsWith('8')) {
      intlDigits = '7' + digitsOnly.slice(1);
    } else if (digitsOnly.length === 10) {
      intlDigits = '7' + digitsOnly;
    } else if (digitsOnly.length === 11 && digitsOnly.startsWith('7')) {
      intlDigits = digitsOnly;
    }

    const fullIntl = `+${intlDigits}`;

    // Pretty format for display: +7 (912) 054-64-57
    let displayFormatted = raw;
    if (intlDigits.length === 11 && intlDigits.startsWith('7')) {
      displayFormatted = `+7 (${intlDigits.slice(1, 4)}) ${intlDigits.slice(4, 7)}-${intlDigits.slice(7, 9)}-${intlDigits.slice(9, 11)}`;
    }

    return {
      display: displayFormatted,
      intl: fullIntl,
      telUri: `tel:${fullIntl}`,
      digits: intlDigits,
    };
  };

  const phoneData = getNormalizedPhone(phone);

  // Telegram link resolution
  const tgValue = (telegram || details?.telegram || '').trim();
  let tgUrl = '';
  let tgDisplay = '';

  if (tgValue) {
    if (tgValue.startsWith('http://') || tgValue.startsWith('https://')) {
      tgUrl = tgValue;
      tgDisplay = tgValue.replace(/^https?:\/\/t\.me\//, '@');
      if (!tgDisplay.startsWith('@')) tgDisplay = `@${tgDisplay}`;
    } else if (tgValue.startsWith('@')) {
      tgUrl = `https://t.me/${tgValue.slice(1)}`;
      tgDisplay = tgValue;
    } else {
      tgUrl = `https://t.me/${tgValue}`;
      tgDisplay = `@${tgValue}`;
    }
  } else if (phoneData.digits) {
    // Fallback: direct telegram link by international phone
    tgUrl = `https://t.me/+${phoneData.digits}`;
    tgDisplay = 'в Telegram';
  }

  useEffect(() => {
    if (!isOpen || !phone) return;

    // Standard tel: URI with normalized +7 format for camera scanner dialers
    QRCode.toDataURL(phoneData.telUri, {
      width: 260,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#080d1a',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Failed to generate QR code', err));
  }, [isOpen, phone, phoneData.telUri]);

  const handleCopy = () => {
    if (!phone) return;
    navigator.clipboard.writeText(phoneData.intl || phone);
    setCopied(true);
    toast.success(`Номер скопирован: ${phoneData.display || phone}`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Связь с клиентом"
      subtitle={clientName ? `Курьер: ${clientName}` : 'Контакты и быстрый набор'}
      maxWidth="sm"
    >
      <div className="space-y-4 text-center">
        {/* Overdue Badge if applicable */}
        {details?.daysOverdue !== undefined && details.daysOverdue > 0 && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold text-xs border border-rose-500/20">
            <span>⚠️ Просрочка: {details.daysOverdue} дн.</span>
            {details.rentalNumber && <span>• {details.rentalNumber}</span>}
          </div>
        )}

        {/* Courier Info Pill if provided */}
        {(details?.courierService || details?.bikeInventoryNumber) && (
          <div className="flex flex-wrap items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            {details.courierService && (
              <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 font-medium">
                🚲 {details.courierService}
              </span>
            )}
            {details.bikeInventoryNumber && (
              <span className="px-2 py-0.5 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 font-bold">
                Байк: {details.bikeInventoryNumber}
              </span>
            )}
          </div>
        )}

        {/* QR Code Card for Scanning with Mobile Phone Camera */}
        <div className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-[#0d1712] rounded-2xl border border-slate-200 dark:border-emerald-500/20">
          <div className="p-2.5 bg-white rounded-xl shadow-md border border-slate-200/80 mb-2.5">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR код для звонка на номер ${phoneData.intl}`}
                className="w-48 h-48 sm:w-52 sm:h-52 rounded-lg"
              />
            ) : (
              <div className="w-48 h-48 sm:w-52 sm:h-52 flex items-center justify-center text-slate-400 text-xs">
                Генерация QR-кода...
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
            <Smartphone className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Наведите камеру смартфона для набора номера</span>
          </div>
        </div>

        {/* Action Buttons: Telegram & Direct Call */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Direct Telegram Button */}
          {tgUrl ? (
            <a
              href={tgUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] bg-[#229ED9] hover:bg-[#1E88E5] text-white text-xs font-bold rounded-xl shadow-sm transition active:scale-95"
            >
              <Send className="w-4 h-4 shrink-0" />
              <span className="truncate">Написать {tgDisplay}</span>
            </a>
          ) : (
            <button
              disabled
              className="flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] bg-slate-100 dark:bg-slate-800 text-slate-400 text-xs font-semibold rounded-xl cursor-not-allowed"
            >
              <Send className="w-4 h-4 shrink-0" />
              <span>Telegram не указан</span>
            </button>
          )}

          {/* Direct Call Button (tel:) */}
          <a
            href={phoneData.telUri}
            className="flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-sm transition active:scale-95"
          >
            <Phone className="w-4 h-4 shrink-0" />
            <span>Позвонить</span>
          </a>
        </div>

        {/* Phone number card with 1-click copy */}
        <div className="p-3 bg-slate-100 dark:bg-slate-800/80 rounded-xl flex items-center justify-between gap-3 border border-slate-200 dark:border-slate-700">
          <div className="text-left min-w-0">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Номер телефона:
            </span>
            <span className="font-mono font-black text-sm text-slate-900 dark:text-white truncate block">
              {phoneData.display || phone}
            </span>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-2 min-h-[38px] bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-600 transition shadow-2xs shrink-0"
            title="Скопировать номер телефона"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-500" />
                <span>Скопировано</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-400" />
                <span>Копировать</span>
              </>
            )}
          </button>
        </div>

        {/* Close Button */}
        <div className="pt-1">
          <button
            type="button"
            onClick={onClose}
            className="w-full px-4 py-2.5 min-h-[44px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs transition border border-slate-200 dark:border-slate-700"
          >
            Закрыть
          </button>
        </div>
      </div>
    </Modal>
  );
};

