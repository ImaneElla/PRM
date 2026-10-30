package com.premium.essai.controller;

import com.premium.essai.dto.DecisionRHRequestDTO;
import com.premium.essai.dto.EvaluationDetailRequestDTO;
import com.premium.essai.dto.EvaluationDetailResponseDTO;
import com.premium.essai.model.User;
import com.premium.essai.repository.PeriodeEvaluationRepository;
import com.premium.essai.service.EvaluationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestController
@RequestMapping("/api/evaluations")
@RequiredArgsConstructor
@Tag(name = "2. Évaluations", description = "APIs pour les formulaires managers et la prise de décision RH")
public class EvaluationController {

    private final EvaluationService evaluationService;
    private final PeriodeEvaluationRepository periodeRepository;

    // Un responsable ne peut lire ou remplir que les évaluations de ses propres salariés
    private void verifierAcces(User utilisateur, Long periodeId) {
        Long restreint = utilisateur.idResponsableRestreint();
        if (restreint == null) return;
        boolean autorise = periodeRepository.findById(periodeId)
                .map(p -> p.getResponsable() != null && restreint.equals(p.getResponsable().getId()))
                .orElse(false);
        if (!autorise) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cette évaluation n'est pas affectée à votre équipe.");
        }
    }

    @GetMapping("/access/{token}")
    @Operation(summary = "Accès au formulaire manager par Token sécurisé", description = "Renvoie une erreur si l'échéance est dépassée (Règle strict J+1)")
    public ResponseEntity<EvaluationDetailResponseDTO> getEvaluationByToken(@PathVariable String token,
                                                                           @AuthenticationPrincipal User utilisateur) {
        resoudreLien(utilisateur, token);
        return ResponseEntity.ok(evaluationService.getEvaluationByToken(token));
    }

    // Lien reçu par e-mail : renvoie la période visée afin d'ouvrir le bon formulaire après connexion
    @GetMapping("/lien/{token}")
    @Operation(summary = "Résoudre le lien d'évaluation reçu par e-mail")
    public ResponseEntity<Map<String, Long>> resoudreLienEvaluation(@PathVariable String token,
                                                                   @AuthenticationPrincipal User utilisateur) {
        return ResponseEntity.ok(Map.of("periodeId", resoudreLien(utilisateur, token)));
    }

    // Le jeton ne suffit pas : un responsable ne peut ouvrir que les liens de ses propres salariés
    private Long resoudreLien(User utilisateur, String token) {
        Long periodeId = periodeRepository.findByTokenAccesSalarie(token)
                .map(p -> p.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Lien d'évaluation invalide ou expiré."));
        verifierAcces(utilisateur, periodeId);
        return periodeId;
    }

    @PostMapping("/{periodeId}/soumettre")
    @Operation(summary = "Soumission de la grille par le Manager (24 critères)", description = "Calcule la moyenne /5, applique la cascade P1 -> P2 ou le blocage rupture, et alerte les Admins RH")
    public ResponseEntity<EvaluationDetailResponseDTO> soumettreEvaluation(
            @PathVariable Long periodeId,
            @Valid @RequestBody EvaluationDetailRequestDTO dto,
            @AuthenticationPrincipal User utilisateur) {
        verifierAcces(utilisateur, periodeId);
        return ResponseEntity.ok(evaluationService.soumettreEvaluation(periodeId, dto));
    }

    @GetMapping("/periode/{periodeId}")
    @Operation(summary = "Consulter le détail d'une évaluation par ID de période")
    public ResponseEntity<EvaluationDetailResponseDTO> getEvaluationByPeriodeId(@PathVariable Long periodeId,
                                                                               @AuthenticationPrincipal User utilisateur) {
        verifierAcces(utilisateur, periodeId);
        return ResponseEntity.ok(evaluationService.getEvaluationByPeriodeId(periodeId));
    }

    @PostMapping("/{periodeId}/decision-directe-rh")
    @Operation(summary = "Décision RH (titularisation, renouvellement ou arrêt de contrat) enregistrée sur une période")
    public ResponseEntity<Void> priseDeDecisionDirecteRH(
            @PathVariable Long periodeId,
            @Valid @RequestBody DecisionRHRequestDTO dto) {
        evaluationService.priseDeDecisionDirecteRH(periodeId, dto);
        return ResponseEntity.ok().build();
    }
}