package com.premium.essai.controller;

import com.premium.essai.model.Notification;
import com.premium.essai.model.enums.CibleRole;
import com.premium.essai.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    public ResponseEntity<List<Notification>> getNotificationsRH() {
        return ResponseEntity.ok(notificationService.getNotifications(CibleRole.ALL_RH));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<Void> marquerCommeLue(@PathVariable Long id) {
        notificationService.marquerCommeLue(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/read-all")
    public ResponseEntity<Void> marquerToutesCommeLues() {
        notificationService.marquerToutesCommeLues(CibleRole.ALL_RH);
        return ResponseEntity.noContent().build();
    }
}
