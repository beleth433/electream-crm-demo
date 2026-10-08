import React from 'react';
import { AccessLevel, User } from '../../types';
import { api } from '../../services/api';
import { ShieldCheck, Plus, Edit2, Trash2, Users, Lock, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface AccessLevelsTabProps {
  accessLevels: AccessLevel[];
  users: User[];
  onOpenCreateModal: () => void;
  onOpenEditModal: (lvl: AccessLevel) => void;
  onRefresh: () => void;
  canManage: boolean;
}

export const AccessLevelsTab: React.FC<AccessLevelsTabProps> = ({
  accessLevels,
  users,
  onOpenCreateModal,
  onOpenEditModal,
  onRefresh,
  canManage,
}) => {
  const handleDeleteLevel = async (lvl: AccessLevel) => {
    if (lvl.id === 'lvl-owner' || lvl.id === 'lvl-admin') {
      toast.error('Уровень «Владелец / SuperAdmin» является ядром системы и защищен от удаления');
      return;
    }

    const assignedCount = users.filter((u) => u.accessLevelId === lvl.id).length;
    if (assignedCount > 0) {
      toast.error(`Нельзя удалить «${lvl.name}»: ${assignedCount} сотрудников привязаны к этому уровню. Сначала смените им уровень доступа.`);
      return;
    }

    if (window.confirm(`Вы действительно хотите удалить уровень доступа «${lvl.name}»?`)) {
      try {
        await api.deleteAccessLevel(lvl.id);
        toast.success(`Уровень доступа «${lvl.name}» удален`);
        onRefresh();
      } catch (err: any) {
        toast.error(err.message || 'Ошибка удаления уровня доступа');
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-50 dark:bg-[#0c1611] border border-slate-200 dark:border-emerald-500/15">
        <div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            Матрица уровней доступа и прав сотрудников
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Настройте персональные права: видимость модулей, редактирование, удаление и доступ к кассовой прибыли P&L
          </p>
        </div>

        {canManage && (
          <button
            onClick={onOpenCreateModal}
            className="min-h-[44px] px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Создать уровень доступа</span>
          </button>
        )}
      </div>

      {/* Grid of Access Levels */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accessLevels.map((lvl) => {
          const assignedUsers = users.filter((u) => u.accessLevelId === lvl.id);
          const perms = lvl.permissions || {};
          const visibleCount = Object.values(perms).filter((p) => p?.visible).length;
          const editCount = Object.values(perms).filter((p) => p?.canEdit).length;

          return (
            <div
              key={lvl.id}
              className="p-5 contour-card flex flex-col justify-between space-y-4 hover:border-emerald-500/40 transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">{lvl.name}</h4>
                    <span
                      className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        lvl.isSystem
                          ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}
                    >
                      {lvl.isSystem ? 'Системный уровень' : 'Пользовательский'}
                    </span>
                  </div>

                  <span className="flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
                    <Users className="w-3 h-3" />
                    <span>{assignedUsers.length}</span>
                  </span>
                </div>

                <p className="mt-2.5 text-xs text-slate-600 dark:text-slate-300 min-h-[2.5rem]">
                  {lvl.description || 'Индивидуальный набор разрешений для сотрудника'}
                </p>

                {/* Badges of special flags */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                      lvl.canManageEmployees
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-transparent'
                    }`}
                  >
                    🛡️ {lvl.canManageEmployees ? 'Настройка RBAC ролей' : 'Без настройки RBAC'}
                  </span>

                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                      lvl.canSeeProfits
                        ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-transparent'
                    }`}
                  >
                    💰 {lvl.canSeeProfits ? 'Видит P&L прибыль' : 'P&L прибыль скрыта'}
                  </span>
                </div>

                {/* Modules statistics */}
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-emerald-500/10 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                  <span>Доступно разделов:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {visibleCount} из 11 (правка: {editCount})
                  </span>
                </div>
              </div>

              {/* Actions */}
              {canManage && (
                <div className="pt-3 border-t border-slate-200 dark:border-emerald-500/10 flex items-center gap-2">
                  <button
                    onClick={() => onOpenEditModal(lvl)}
                    className="flex-1 min-h-[40px] flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Настроить права</span>
                  </button>

                  {lvl.id !== 'lvl-owner' && lvl.id !== 'lvl-admin' && (
                    <button
                      onClick={() => handleDeleteLevel(lvl)}
                      title="Удалить уровень доступа"
                      className="w-10 h-10 flex items-center justify-center border border-slate-200 dark:border-rose-500/20 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
