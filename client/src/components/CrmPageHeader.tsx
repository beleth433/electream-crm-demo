import React from 'react';

interface CrmPageHeaderProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export function CrmPageHeader({ title, description, icon, action }: CrmPageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-1.5">
        <h2 className="crm-page-title">
          {icon && <span className="shrink-0 text-emerald-600 dark:text-emerald-400">{icon}</span>}
          {title}
        </h2>
        <p className="crm-page-description">{description}</p>
      </div>
      {action && <div className="shrink-0 self-start">{action}</div>}
    </div>
  );
}
