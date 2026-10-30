package com.premium.essai.controller;

import com.premium.essai.dto.PeriodeResponseDTO;
import com.premium.essai.model.EvaluationDetail;
import com.premium.essai.model.PeriodeEvaluation;
import com.premium.essai.model.Responsable;
import com.premium.essai.model.Salarie;
import com.premium.essai.model.User;
import com.premium.essai.model.enums.PeriodeType;
import com.premium.essai.model.enums.RecommandationEvaluateur;
import com.premium.essai.model.enums.StatutEssai;
import com.premium.essai.model.enums.StatutPeriode;
import com.premium.essai.repository.PeriodeEvaluationRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/periodes")
@RequiredArgsConstructor
@Tag(name = "5. Périodes d'évaluation", description = "Consultation des périodes d'essai enregistrées en base")
public class PeriodeController {

    private static final Set<StatutPeriode> STATUTS_CLOTURES = EnumSet.of(
            StatutPeriode.COMPLETEE, StatutPeriode.VALIDE, StatutPeriode.ROMPU, StatutPeriode.RENOUVELE,
            StatutPeriode.TERMINE, StatutPeriode.VALIDEE_RH, StatutPeriode.RUPTURE
    );

    private final PeriodeEvaluationRepository periodeRepository;

    @GetMapping
    @Transactional(readOnly = true)
    @Operation(summary = "Lister toutes les périodes d'évaluation", description = "Inclut la décision (RENOUVELEE, CONFIRMEE, RUPTURE) des périodes clôturées")
    public ResponseEntity<List<PeriodeResponseDTO>> getAllPeriodes(@AuthenticationPrincipal User utilisateur) {
        Long restreint = utilisateur.idResponsableRestreint();
        // Un responsable ne voit que les périodes de ses propres salariés
        return ResponseEntity.ok(periodeRepository.findAll().stream()
                .filter(p -> restreint == null || (p.getResponsable() != null && restreint.equals(p.getResponsable().getId())))
                .map(this::mapToDTO)
                .collect(Collectors.toList()));
    }

    private PeriodeResponseDTO mapToDTO(PeriodeEvaluation p) {
        Salarie s = p.getSalarie();
        Responsable r = p.getResponsable();
        return PeriodeResponseDTO.builder()
                .id(p.getId())
                .salarieId(s.getId())
                .salarieNom(s.getFirstName() + " " + s.getLastName())
                .salarieEmail(s.getEmail())
                .salariePoste(s.getPoste())
                .responsableId(r != null ? r.getId() : null)
                .responsableNom(r != null ? r.getFirstName() + " " + r.getLastName() : null)
                .responsableEmail(r != null ? r.getEmail() : null)
                .directionName(p.getDirectionName())
                .typePeriode(p.getTypePeriode().name())
                .numeroPeriode(numeroPeriode(p))
                .dateEcheance(p.getDateEcheance())
                .dateDeclenchementEmail(p.getDateDeclenchementEmail())
                .heureDeclenchement(p.getHeureDeclenchement() != null ? p.getHeureDeclenchement().toString() : null)
                .dateDernierRappel(p.getDateDernierRappel())
                .dateValidationEvaluateur(p.getDateValidationEvaluateur())
                .dateValidationRH(p.getDateValidationRh())
                .statut(p.getStatut().name())
                .decision(STATUTS_CLOTURES.contains(p.getStatut()) ? decisionPeriode(p) : null)
                .joursRetard(p.getJoursRetard())
                .noteGlobale(p.getNoteGlobale())
                .motifDecision(p.getMotifDecision())
                .tokenAccesSalarie(p.getTokenAccesSalarie())
                .emailsEnvoyes(p.getEmailsEnvoyes())
                .etapeValide(p.getEtapeValide())
                .etapeEV(p.getEtapeEV())
                .etapeEvaluation(p.getEtapeEvaluation())
                .etapeSH(p.getEtapeSH())
                .build();
    }

    private int numeroPeriode(PeriodeEvaluation p) {
        if (p.getNumeroPeriode() != null) return p.getNumeroPeriode();
        return p.getTypePeriode() == PeriodeType.TROIS_MOIS ? 1 : 2;
    }

  
    private String decisionPeriode(PeriodeEvaluation p) {
        if (p.getDecisionFinale() != null) {
            return switch (p.getDecisionFinale()) {
                case RUPTURE -> "RUPTURE";
                case RENOUVELLEMENT -> "RENOUVELEE";
                case TITULARISATION -> "CONFIRMEE";
            };
        }
        if (p.getStatut() == StatutPeriode.ROMPU || p.getStatut() == StatutPeriode.RUPTURE) return "RUPTURE";
        if (p.getStatut() == StatutPeriode.RENOUVELE) return "RENOUVELEE";

        EvaluationDetail detail = p.getEvaluationDetail();
        if (detail != null && detail.getRecommandationEvaluateur() == RecommandationEvaluateur.RUPTURE_CONTRAT) {
            return "RUPTURE";
        }
        // Anciennes décisions RH directes : ni évaluation ni décision enregistrée
        if (detail == null && p.getSalarie().getStatutEssai() == StatutEssai.RUPTURE) return "RUPTURE";

        return numeroPeriode(p) == 1 ? "RENOUVELEE" : "CONFIRMEE";
    }
}
