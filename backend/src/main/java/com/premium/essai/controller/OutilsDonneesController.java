package com.premium.essai.controller;

import com.premium.essai.model.User;
import com.premium.essai.model.enums.UserRole;
import com.premium.essai.repository.DirectionRepository;
import com.premium.essai.repository.EvaluationDetailRepository;
import com.premium.essai.repository.HistoriqueEmailRepository;
import com.premium.essai.repository.NotificationRepository;
import com.premium.essai.repository.PeriodeEvaluationRepository;
import com.premium.essai.repository.ResponsableRepository;
import com.premium.essai.repository.SalarieRepository;
import com.premium.essai.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/outils/donnees")
@RequiredArgsConstructor
@Slf4j
public class OutilsDonneesController {

    public static final String PHRASE_CONFIRMATION = "VIDER";

    public record ViderRequest(String confirmation) {
    }

    private final HistoriqueEmailRepository historiqueEmailRepository;
    private final NotificationRepository notificationRepository;
    private final EvaluationDetailRepository evaluationDetailRepository;
    private final PeriodeEvaluationRepository periodeRepository;
    private final SalarieRepository salarieRepository;
    private final UserRepository userRepository;
    private final ResponsableRepository responsableRepository;
    private final DirectionRepository directionRepository;

    @Value("${application.outils.reinitialisation-donnees:false}")
    private boolean actif;

    @GetMapping("/etat")
    public Map<String, Object> etat() {
        return Map.of("actif", actif);
    }

    @PostMapping("/vider")
    @Transactional
    public Map<String, Long> vider(@RequestBody ViderRequest requete, @AuthenticationPrincipal User admin) {
        if (!actif) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Outil désactivé.");
        }
        if (requete == null || !PHRASE_CONFIRMATION.equals(requete.confirmation())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Confirmation incorrecte : saisissez exactement « " + PHRASE_CONFIRMATION + " ».");
        }

        // Ordre imposé par les clés étrangères : dépendances d'abord
        Map<String, Long> supprimes = new LinkedHashMap<>();
        supprimes.put("emails", historiqueEmailRepository.count());
        historiqueEmailRepository.deleteAllInBatch();
        supprimes.put("notifications", notificationRepository.count());
        notificationRepository.deleteAllInBatch();
        supprimes.put("evaluations", evaluationDetailRepository.count());
        evaluationDetailRepository.deleteAllInBatch();
        supprimes.put("periodes", periodeRepository.count());
        periodeRepository.deleteAllInBatch();
        supprimes.put("salaries", salarieRepository.count());
        salarieRepository.deleteAllInBatch();
        List<User> comptesResponsables = userRepository.findByRole(UserRole.RESPONSABLE);
        supprimes.put("comptesResponsables", (long) comptesResponsables.size());
        userRepository.deleteAllInBatch(comptesResponsables);
        supprimes.put("responsables", responsableRepository.count());
        responsableRepository.deleteAllInBatch();
        supprimes.put("directions", directionRepository.count());
        directionRepository.deleteAllInBatch();

        log.warn("[OUTIL TEMPORAIRE] Données vidées par {} : {}", admin.getEmail(), supprimes);
        return supprimes;
    }
}
