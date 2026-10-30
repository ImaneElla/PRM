import { getToken } from "./authService";
import type { NotificationItem } from '../types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

interface NotificationBackendDTO {
  id: number;
  titre: string;
  message: string;
  type?: 'INFO' | 'WARNING' | 'ALERT' | 'SUCCESS' | null;
  priorite?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | null;
  dateCreation: string;
  estLue: boolean;
  cibleRole: 'ALL_RH';
  lienEcran?: string;
  targetId?: number;
}

function mapNotification(notification: NotificationBackendDTO): NotificationItem {
  const date = new Date(notification.dateCreation);
  const dateValide = !Number.isNaN(date.getTime());

  return {
    id: notification.id,
    titre: notification.titre,
    message: notification.message,
    type: notification.type === 'ALERT'
      ? 'RETARD'
      : notification.type === 'SUCCESS'
        ? 'VALIDATION'
        : notification.type === 'WARNING'
          ? 'CRON_SYSTEME'
          : 'EVALUATION',
    priorite: notification.priorite === 'CRITICAL'
      ? 'URGENTE'
      : notification.priorite === 'HIGH'
        ? 'HAUTE'
        : notification.priorite === 'LOW'
          ? 'BASSE'
          : 'MOYENNE',
    dateCreation: dateValide ? date.toLocaleDateString('fr-FR') : notification.dateCreation,
    heureCreation: dateValide
      ? date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      : '',
    estLue: notification.estLue,
    cibleRole: notification.cibleRole,
    lienEcran: notification.lienEcran,
    targetId: notification.targetId,
  };
}

async function ensureSuccessful(response: Response): Promise<void> {
  if (!response.ok) {
    const details = await response.text();
    throw new Error(details || `Erreur API notifications (${response.status})`);
  }
}


function authHeaders(): Record<string, string> {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const notificationService = {
  async getAllRH(): Promise<NotificationItem[]> {
    const response = await fetch(`${API_BASE_URL}/notifications`, { cache: 'no-store', headers: authHeaders() });
    await ensureSuccessful(response);
    const notifications: NotificationBackendDTO[] = await response.json();
    return notifications.map(mapNotification);
  },

  async markAsRead(id: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/notifications/${id}/read`, { method: 'PATCH', headers: authHeaders() });
    await ensureSuccessful(response);
  },

  async markAllAsRead(): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/notifications/read-all`, { method: 'PATCH', headers: authHeaders() });
    await ensureSuccessful(response);
  },
};
