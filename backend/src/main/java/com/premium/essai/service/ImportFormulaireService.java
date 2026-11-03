package com.premium.essai.service;

import com.premium.essai.model.EvaluationDetail;
import com.premium.essai.model.PeriodeEvaluation;
import com.premium.essai.model.Salarie;
import com.premium.essai.model.enums.DecisionPeriode;
import com.premium.essai.model.enums.PeriodeType;
import com.premium.essai.model.enums.StatutEssai;
import com.premium.essai.model.enums.StatutPeriode;
import com.premium.essai.repository.EvaluationDetailRepository;
import com.premium.essai.repository.PeriodeEvaluationRepository;
import com.premium.essai.repository.SalarieRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

// Applique à un salarié importé les données de son suivi (dates des périodes, validation, axes d'amélioration, accompagnement).
// Import d'historique : aucun e-mail ni notification n'est envoyé.
@Service
@RequiredArgsConstructor
public class ImportFormulaireService {

    public record DonneesFormulaire(LocalDate envoi1, LocalDate fin1, LocalDate envoi2, LocalDate fin2,
                                    Boolean validation, LocalDate dateEffet, String axes,
                                    boolean accompagnementManager, boolean accompagnementRh) {

        public boolean vide() {
            return envoi1 == null && fin1 == null && envoi2 == null && fin2 == null && validation == null
                    && dateEffet == null && (axes == null || axes.isBlank()) && !accompagnementManager && !accompagnementRh;
        }
    }

    private final SalarieRepository salarieRepository;
    private final PeriodeEvaluationRepository periodeRepository;
    private final EvaluationDetailRepository detailRepository;

    @Transactional
    public void appliquer(Long salarieId, DonneesFormulaire d) {
        if (d.vide()) return;
        Salarie salarie = salarieRepository.findById(salarieId).orElseThrow();
        PeriodeEvaluation p1 = periodeRepository.findBySalarieId(salarieId).stream()
                .filter(p -> p.getTypePeriode() == PeriodeType.TROIS_MOIS)
                .findFirst().orElseThrow();

        if (d.fin1() != null) p1.setDateEcheance(d.fin1());
        if (d.envoi1() != null) p1.setDateDeclenchementEmail(d.envoi1());

        PeriodeEvaluation p2 = null;
        if (d.fin2() != null || d.envoi2() != null) {
            LocalDate fin2 = d.fin2() != null ? d.fin2() : salarie.getDateEmbauche().plusMonths(6);
            p2 = periodeRepository.save(PeriodeEvaluation.builder()
                    .salarie(salarie)
                    .responsable(salarie.getResponsable())
                    .typePeriode(PeriodeType.SIX_MOIS)
                    .numeroPeriode(2)
                    .dateEcheance(fin2)
                    .dateDeclenchementEmail(d.envoi2())
                    .statut(StatutPeriode.PLANIFIEE)
                    .tokenAccesSalarie(UUID.randomUUID().toString())
                    .build());
            salarie.setDateFinPrevisionnelle(fin2);
            // La 1re période est terminée puisqu'une 2e existe : essai renouvelé
            cloturer(p1, DecisionPeriode.RENOUVELLEMENT, d.fin1());
        }

        PeriodeEvaluation cible = p2 != null ? p2 : p1;
        if (Boolean.TRUE.equals(d.validation())) {
            LocalDate effet = d.dateEffet() != null ? d.dateEffet() : cible.getDateEcheance();
            cloturer(cible, DecisionPeriode.TITULARISATION, effet);
            salarie.setStatutEssai(StatutEssai.VALIDE);
        }

        if ((d.axes() != null && !d.axes().isBlank()) || d.accompagnementManager() || d.accompagnementRh()) {
            List<String> commentaires = new ArrayList<>();
            if (d.accompagnementManager()) commentaires.add("Accompagnement manager : oui");
            if (d.accompagnementRh()) commentaires.add("Accompagnement RH : oui");
            EvaluationDetail detail = detailRepository.findByPeriodeId(cible.getId())
                    .orElseGet(() -> EvaluationDetail.builder().periode(cible).build());
            if (d.axes() != null && !d.axes().isBlank()) detail.setAxesAmelioration(d.axes().trim());
            if (!commentaires.isEmpty()) detail.setCommentairesEvaluateur(String.join("\n", commentaires));
            detailRepository.save(detail);
        }

        salarieRepository.save(salarie);
        periodeRepository.save(p1);
    }

    private void cloturer(PeriodeEvaluation periode, DecisionPeriode decision, LocalDate date) {
        periode.setDecisionFinale(decision);
        periode.setStatut(StatutPeriode.VALIDEE_RH);
        periode.setDateValidationRh(date);
        periode.setJoursRetard(0);
        periodeRepository.save(periode);
    }
}
