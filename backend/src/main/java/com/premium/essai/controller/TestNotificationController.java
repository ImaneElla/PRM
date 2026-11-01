package com.premium.essai.controller;

import com.premium.essai.config.HeureMaroc;
import com.premium.essai.service.NotificationEcheanceService;
import com.premium.essai.service.NotificationEcheanceService.RapportExecution;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/test")
@RequiredArgsConstructor
@Tag(name = "5. Tests & Déclencheurs Manuels", description = "Endpoints de test pour le développement local et la simulation")
public class TestNotificationController {

    private final NotificationEcheanceService notificationEcheanceService;

    @GetMapping("/trigger-cron")
    @Operation(summary = "Déclencher manuellement la vérification des échéances", 
               description = "Permet d'exécuter immédiatement le batch des rappels J-21, J-14, J-7 et blocage J+1 sans attendre 09h00")
    public ResponseEntity<RapportExecution> triggerCronManuellement(
            @RequestParam(required = false, defaultValue = "true") boolean forcer,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateSimulation
    ) {
        LocalDate date = (dateSimulation != null) ? dateSimulation : HeureMaroc.aujourdhui();
        RapportExecution rapport = notificationEcheanceService.traiterEcheances(date, forcer);
        return ResponseEntity.ok(rapport);
    }
}
