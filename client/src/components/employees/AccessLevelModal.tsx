import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { AccessLevel, AccessLevelModulePermission } from '../../types';
import { api } from '../../services/api';
import { ShieldCheck, Eye, Edit2, Trash2, CheckSquare, Square, Lock } from 'lucide-react';
import { toast } from 'sonner';

interface AccessLevelModalProps {
  isOpen: boolean;
  onClose: () => void;
  level: AccessLevel | null;
  onSuccess: () => void;
}

const CRM_MODULES = [
  { id: 'dashboard', label: 'Дашборд и ключевые KPI' },
  { id: 'rentals', label: 'Аренда электровелосипедов' },
  { id: 'bikes', label: 'Парк техники (электробайки)' },
  { id: 'batteries', label: 'Аккумуляторы (АКБ)' },
  { id: 'clients', label: 'База клиентов и курьеров' },
  { id: 'repairs', label: 'Мастерская / СТО' },
  { id: 'inventory', label: 'Склад запчастей' },
  { id: 'finance', label: 'Касса и финансы' },
  { id: 'employees', label: 'Команда и сотрудники (кадры, зарплаты)' },
  { id: 'info', label: 'База знаний («Информация»)' },
  { id: 'history', label: 'Журнал аудита («История»)' },
] as const;

export const AccessLevelModal: React.FC<AccessLevelModalProps> = ({
  isOpen,
  onClose,
  level,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [canManageEmployees, setCanManageEmployees] = useState(false);
  const [canSeeProfits, setCanSeeProfits] = useState(false);
  const [permissions, setPermissions] = useState<Record<string, AccessLevelModulePermission>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (level) {
        setName(level.name);
        setDescription(level.description || '');
        setCanManageEmployees(Boolean(level.canManageEmployees));
        setCanSeeProfits(Boolean(level.canSeeProfits));
        const initialPerms: Record<string, AccessLevelModulePermission> = {};
        CRM_MODULES.forEach((m) => {
          initialPerms[m.id] = level.permissions?.[m.id] || {
            visible: true,
            canEdit: false,
            canDelete: false,
          };
        });
        setPermissions(initialPerms);
      } else {
        setName('');
        setDescription('');
        setCanManageEmployees(false);
        setCanSeeProfits(false);
        const defaultPerms: Record<string, AccessLevelModulePermission> = {};
        CRM_MODULES.forEach((m) => {
          defaultPerms[m.id] = {
            visible: m.id !== 'finance' && m.id !== 'employees',
            canEdit: m.id === 'rentals' || m.id === 'repairs' || m.id === 'inventory',
            canDelete: false,
          };
        });
        setPermissions(defaultPerms);
      }
    }
  }, [isOpen, level]);

  const togglePerm = (moduleId: string, field: keyof AccessLevelModulePermission) => {
    setPermissions((prev) => {
      const current = prev[moduleId] || { visible: false, canEdit: false, canDelete: false };
      const nextVal = !current[field];
      const updated = { ...current, [field]: nextVal };
      // If edit or delete is enabled, visible must also be enabled
      if ((field === 'canEdit' || field === 'canDelete') && nextVal) {
        updated.visible = true;
      }
      // If visible is disabled, edit and delete must also be disabled
      if (field === 'visible' && !nextVal) {
        updated.canEdit = false;
        updated.canDelete = false;
      }
      return { ...prev, [moduleId]: updated };
    });
  };

  const applyPreset = (preset: 'all' | 'readonly' | 'none') => {
    const updated: Record<string, AccessLevelModulePermission> = {};
    CRM_MODULES.forEach((m) => {
      if (preset === 'all') {
        updated[m.id] = { visible: true, canEdit: true, canDelete: true };
      } else if (preset === 'readonly') {
        updated[m.id] = { visible: true, canEdit: false, canDelete: false };
      } else {
        updated[m.id] = { visible: false, canEdit: false, canDelete: false };
      }
    });
    setPermissions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Укажите название уровня доступа');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        name: name.trim(),
        description: description.trim(),
        canManageEmployees,
        canSeeProfits,
        permissions,
      };

      if (level) {
        await api.updateAccessLevel(level.id, payload);
        toast.success(`Уровень доступа "${name}" обновлен`);
      } else {
        await api.createAccessLevel(payload);
        toast.success(`Уровень доступа "${name}" успешно создан`);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Ошибка сохранения уровня доступа');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={level ? `Редактировать: ${level.name}` : 'Конструктор уровня доступа (RBAC)'}
      subtitle="Владелец CRM настраивает видимость, редактирование и удаление для каждого модуля"
      maxWidth="3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name and Description */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Название уровня доступа *
            </label>
            <input
              type="text"
              required
              placeholder="Например: Менеджер склада, Старший мастер"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-11 px-3 bg-slate-50 dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 rounded-xl text-[16px] sm:text-sm font-bold text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Краткое описание прав
            </label>
            <input
              type="text"
              placeholder="Для кого предназначен данный уровень"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-11 px-3 bg-slate-50 dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 rounded-xl text-[16px] sm:text-sm text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Global Privileges */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0c1611] border border-slate-200 dark:border-emerald-500/15 space-y-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Особые привилегии безопасности
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex items-center gap-3 p-2.5 rounded-lg bg-white dark:bg-[#121f19] border border-slate-200 dark:border-emerald-500/10 cursor-pointer hover:border-emerald-500/30 transition-colors">
              <input
                type="checkbox"
                checked={canManageEmployees}
                onChange={(e) => setCanManageEmployees(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500"
              />
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  🛡️ Настройка уровней доступа (RBAC)
                </span>
                <span className="text-[10px] text-slate-400">
                  Создание, редактирование и удаление ролей и матриц прав системы
                </span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-2.5 rounded-lg bg-white dark:bg-[#121f19] border border-slate-200 dark:border-emerald-500/10 cursor-pointer hover:border-emerald-500/30 transition-colors">
              <input
                type="checkbox"
                checked={canSeeProfits}
                onChange={(e) => setCanSeeProfits(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500"
              />
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  💰 Доступ к чистой прибыли (P&L)
                </span>
                <span className="text-[10px] text-slate-400">
                  Отображение маржи и постоянных расходов базы
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Matrix Header & Presets */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs font-bold text-slate-900 dark:text-white">
            Матрица разрешений по 11 разделам CRM:
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => applyPreset('all')}
              className="px-2 py-1 text-[10px] font-bold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-emerald-500 transition-colors"
            >
              Выбрать всё
            </button>
            <button
              type="button"
              onClick={() => applyPreset('readonly')}
              className="px-2 py-1 text-[10px] font-bold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-sky-500 transition-colors"
            >
              Только просмотр
            </button>
            <button
              type="button"
              onClick={() => applyPreset('none')}
              className="px-2 py-1 text-[10px] font-bold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-rose-500 transition-colors"
            >
              Снять всё
            </button>
          </div>
        </div>

        {/* Permissions Table / List */}
        <div className="border border-slate-200 dark:border-emerald-500/15 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-emerald-500/10 max-h-[340px] overflow-y-auto">
          {CRM_MODULES.map((m) => {
            const p = permissions[m.id] || { visible: false, canEdit: false, canDelete: false };
            return (
              <div
                key={m.id}
                className="p-2.5 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-[#0e1a14] transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-semibold text-slate-900 dark:text-white block truncate">
                    {m.label}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">{m.id}</span>
                </div>

                <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer min-h-[36px] px-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                    <input
                      type="checkbox"
                      checked={p.visible}
                      onChange={() => togglePerm(m.id, 'visible')}
                      className="w-4 h-4 rounded text-emerald-500"
                    />
                    <Eye className="w-3.5 h-3.5 text-slate-400" />
                    <span className="hidden sm:inline">Видит</span>
                  </label>

                  <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer min-h-[36px] px-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                    <input
                      type="checkbox"
                      checked={p.canEdit}
                      onChange={() => togglePerm(m.id, 'canEdit')}
                      className="w-4 h-4 rounded text-sky-500"
                    />
                    <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                    <span className="hidden sm:inline">Правка</span>
                  </label>

                  <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer min-h-[36px] px-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                    <input
                      type="checkbox"
                      checked={p.canDelete}
                      onChange={() => togglePerm(m.id, 'canDelete')}
                      className="w-4 h-4 rounded text-rose-500"
                    />
                    <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                    <span className="hidden sm:inline">Удаление</span>
                  </label>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-emerald-500/15">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="min-h-[44px] px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-sm transition-all"
          >
            {isSubmitting ? 'Сохранение...' : level ? 'Сохранить права' : 'Создать уровень'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
