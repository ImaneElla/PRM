package com.premium.essai.service;

import com.premium.essai.model.Notification;
import com.premium.essai.model.enums.CibleRole;

import java.util.List;

public interface NotificationService {
    void creerAlerte(String titre, String message, CibleRole cibleRole);
    void creerAlerte(String titre, String message, CibleRole cibleRole, Long targetId);
    /* Notification destinée au seul responsable concerné (visible dans son espace). */
    void creerAlerteResponsable(String titre, String message, Long responsableId, Long targetId);
    List<Notification> getNotificationsResponsable(Long responsableId);
    void marquerCommeLuePourResponsable(Long notificationId, Long responsableId);
    void marquerToutesCommeLuesPourResponsable(Long responsableId);
    List<Notification> getNotifications(CibleRole cibleRole);
    List<Notification> getNotificationsNonLues(CibleRole cibleRole);
    void marquerCommeLue(Long notificationId);
    void marquerToutesCommeLues(CibleRole cibleRole);
}
