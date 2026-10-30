package com.premium.essai.controller;

import com.premium.essai.model.Notification;
import com.premium.essai.model.User;
import com.premium.essai.model.enums.CibleRole;
import com.premium.essai.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

// Chacun ne voit que ses notifications : tous les Admin RH partagent les notifications RH, un responsable ne voit que les siennes
@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {
    private final NotificationService notificationService;

    @GetMapping
    public ResponseEntity<List<Notification>> lister(@AuthenticationPrincipal User utilisateur) {
        Long responsable = utilisateur.idResponsableRestreint();
        return ResponseEntity.ok(responsable == null
                ? notificationService.getNotifications(CibleRole.ALL_RH)
                : notificationService.getNotificationsResponsable(responsable));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<Void> marquerCommeLue(@PathVariable Long id, @AuthenticationPrincipal User utilisateur) {
        Long responsable = utilisateur.idResponsableRestreint();
        if (responsable == null) {
            notificationService.marquerCommeLue(id);
        } else {
            notificationService.marquerCommeLuePourResponsable(id, responsable);
        }
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/read-all")
    public ResponseEntity<Void> marquerToutesCommeLues(@AuthenticationPrincipal User utilisateur) {
        Long responsable = utilisateur.idResponsableRestreint();
        if (responsable == null) {
            notificationService.marquerToutesCommeLues(CibleRole.ALL_RH);
        } else {
            notificationService.marquerToutesCommeLuesPourResponsable(responsable);
        }
        return ResponseEntity.noContent().build();
    }
}
