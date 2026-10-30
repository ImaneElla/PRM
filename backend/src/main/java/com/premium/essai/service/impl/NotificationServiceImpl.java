package com.premium.essai.service.impl;

import com.premium.essai.model.Notification;
import com.premium.essai.model.enums.CibleRole;
import com.premium.essai.model.enums.NotificationPriority;
import com.premium.essai.model.enums.NotificationType;
import com.premium.essai.repository.NotificationRepository;
import com.premium.essai.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;

    @Override
    @Transactional
    public void creerAlerte(String titre, String message, CibleRole cibleRole) {
        creerAlerte(titre, message, cibleRole, null);
    }

    @Override
    @Transactional
    public void creerAlerte(String titre, String message, CibleRole cibleRole, Long targetId) {
        Notification notification = Notification.builder()
                .titre(titre)
                .message(message)
                .type(NotificationType.SUCCESS)
                .priorite(NotificationPriority.HIGH)
                .cibleRole(cibleRole)
                .targetId(targetId)
                .estLue(false)
                .dateCreation(LocalDateTime.now())
                .build();
        notificationRepository.save(notification);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Notification> getNotifications(CibleRole cibleRole) {
        return notificationRepository.findByCibleRoleOrderByDateCreationDesc(cibleRole);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Notification> getNotificationsNonLues(CibleRole cibleRole) {
        return notificationRepository.findByCibleRoleAndEstLueFalse(cibleRole);
    }

    @Override
    @Transactional
    public void marquerCommeLue(Long notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("Notification non trouvee ID: " + notificationId));
        notification.setEstLue(true);
        notificationRepository.save(notification);
    }

    @Override
    @Transactional
    public void marquerToutesCommeLues(CibleRole cibleRole) {
        List<Notification> notifications = notificationRepository.findByCibleRoleAndEstLueFalse(cibleRole);
        notifications.forEach(notification -> notification.setEstLue(true));
        notificationRepository.saveAll(notifications);
    }
}
