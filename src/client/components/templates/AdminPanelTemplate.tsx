import React from 'react';
import { ShieldCheckIcon } from '@heroicons/react/24/outline';
import { UserProfile } from '../../services/api';
import { ROLE_LABELS } from '../../lib/landing';
import { PanelPageTemplate } from './PanelPageTemplate';

interface AdminPanelTemplateProps {
  user: UserProfile | null;
  title: string;
  description: string;
  onRefresh?: () => void;
  refreshing?: boolean;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Template halaman tata kelola `/admin/*`.
 *
 * Kerangka visualnya berasal dari `PanelPageTemplate`; komponen ini hanya
 * menetapkan label "Panel Administrasi ONE UNUSU" beserta nama peran pengguna,
 * sehingga perilaku dan tampilan panel tetap konsisten di seluruh rute admin.
 */
export const AdminPanelTemplate: React.FC<AdminPanelTemplateProps> = ({
  user,
  title,
  description,
  onRefresh,
  refreshing = false,
  headerAction,
  children,
}) => (
  <PanelPageTemplate
    badge="Panel Administrasi ONE UNUSU"
    badgeIcon={ShieldCheckIcon}
    badgeSuffix={user ? ROLE_LABELS[user.role] ?? user.role : undefined}
    title={title}
    description={description}
    onRefresh={onRefresh}
    refreshing={refreshing}
    headerAction={headerAction}
  >
    {children}
  </PanelPageTemplate>
);
