package com.premium.essai.service.impl;

import com.premium.essai.model.Notification;
import com.premium.essai.model.enums.CibleRole;
import com.premium.essai.model.enums.NotificationPriority;
import com.premium.essai.model.enums.NotificationType;
import com.premium.essai.repository.NotificationRepository;
import com.premium.essai.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
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
    @Transactional
    public void creerAlerteResponsable(String titre, String message, Long responsableId, Long targetId) {
        if (responsableId == null) return;
        notificationRepository.save(Notification.builder()
                .titre(titre)
                .message(message)
                .type(NotificationType.INFO)
                .priorite(NotificationPriority.HIGH)
                .cibleRole(CibleRole.MANAGER)
                .destinataireResponsableId(responsableId)
                .targetId(targetId)
                .estLue(false)
                .dateCreation(LocalDateTime.now())
                .build());
    }

    @Override
    @Transactional(readOnly = true)
    public List<Notification> getNotificationsResponsable(Long responsableId) {
        return notificationRepository.findByDestinataireResponsableIdOrderByDateCreationDesc(responsableId);
    }

    @Override
    @Transactional
    public void marquerCommeLuePourResponsable(Long notificationId, Long responsableId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification introuvable."));
        // Un responsable ne peut marquer que ses propres notifications
        if (!responsableId.equals(notification.getDestinataireResponsableId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cette notification ne vous est pas destinée.");
        }
        notification.setEstLue(true);
        notificationRepository.save(notification);
    }

    @Override
    @Transactional
    public void marquerToutesCommeLuesPourResponsable(Long responsableId) {
        List<Notification> notifications = notificationRepository.findByDestinataireResponsableIdAndEstLueFalse(responsableId);
        notifications.forEach(notification -> notification.setEstLue(true));
        notificationRepository.saveAll(notifications);
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
