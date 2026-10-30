package com.premium.essai.service;

import com.premium.essai.model.Notification;
import com.premium.essai.model.enums.CibleRole;

import java.util.List;

public interface NotificationService {
    void creerAlerte(String titre, String message, CibleRole cibleRole);
    void creerAlerte(String titre, String message, CibleRole cibleRole, Long targetId);
    List<Notification> getNotifications(CibleRole cibleRole);
    List<Notification> getNotificationsNonLues(CibleRole cibleRole);
    void marquerCommeLue(Long notificationId);
    void marquerToutesCommeLues(CibleRole cibleRole);
}
