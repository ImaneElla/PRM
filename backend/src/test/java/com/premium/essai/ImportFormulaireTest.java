package com.premium.essai;

import com.premium.essai.dto.ImportSalarieResultDTO;
import com.premium.essai.model.Direction;
import com.premium.essai.model.EvaluationDetail;
import com.premium.essai.model.PeriodeEvaluation;
import com.premium.essai.model.Salarie;
import com.premium.essai.model.enums.DecisionPeriode;
import com.premium.essai.model.enums.PeriodeType;
import com.premium.essai.model.enums.StatutEssai;
import com.premium.essai.model.enums.StatutPeriode;
import com.premium.essai.repository.DirectionRepository;
import com.premium.essai.repository.EvaluationDetailRepository;
import com.premium.essai.repository.PeriodeEvaluationRepository;
import com.premium.essai.repository.ResponsableRepository;
import com.premium.essai.repository.SalarieRepository;
import com.premium.essai.model.Responsable;
import com.premium.essai.service.ImportSalarieService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

// Fichier de suivi (colonnes de la feuille RH) : dates des périodes, validation, axes d'amélioration, accompagnement
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ImportFormulaireTest {

    @Autowired private ImportSalarieService importSalarieService;
    @Autowired private DirectionRepository directionRepository;
    @Autowired private ResponsableRepository responsableRepository;
    @Autowired private SalarieRepository salarieRepository;
    @Autowired private PeriodeEvaluationRepository periodeRepository;
    @Autowired private EvaluationDetailRepository detailRepository;

    @Test
    void importeLeSuiviDeLaPeriodeDEssai() {
        Direction direction = directionRepository.save(Direction.builder().name("Direction Générale").code("DG").description("DG").build());
        responsableRepository.save(Responsable.builder().firstName("Eric").lastName("Lefort").email("eric.lefort@exemple.com").poste("Manager").direction(direction).build());

        String csv = String.join("\n",
                "Matricule;Présentation nom prénom;Poste;Responsable;Date d'embauche;date de l'envoi fiche d'évaluation;Date de fin de période d'essai;"
                        + "date de l'envoi fiche d'évaluation;Date de fin de période d'essai;Validation période d'essai;Date d'effet validation;"
                        + "Axes d'amélioration;Accompagnement Manager;Accompagnement RH",
                "PRO000038;ACHRAF RAYK;Technicien Implant;ERIC LEFORT;19/01/2026;19-03-26;19-04-26;;;OUI;03-06-26;Formation Linde;x;",
                "SRM000606;YOUSSEF JENYEH;Technico commercial;ERIC LEFORT;19/01/2026;19-03-26;19-04-26;19-06-26;19-07-26;;;;;");
        List<ImportSalarieResultDTO> resultats = importSalarieService.importer(csv);
        resultats.forEach(r -> assertEquals("CREE", r.getStatut(), r.getMessage()));

        Salarie valide = salarieRepository.findByMatricule("PRO000038").orElseThrow();
        assertEquals(StatutEssai.VALIDE, valide.getStatutEssai());
        List<PeriodeEvaluation> p = periodeRepository.findBySalarieId(valide.getId());
        assertEquals(1, p.size());
        assertEquals(LocalDate.of(2026, 4, 19), p.get(0).getDateEcheance());
        assertEquals(DecisionPeriode.TITULARISATION, p.get(0).getDecisionFinale());
        assertEquals(StatutPeriode.VALIDEE_RH, p.get(0).getStatut());
        assertEquals(LocalDate.of(2026, 6, 3), p.get(0).getDateValidationRh());
        EvaluationDetail detail = detailRepository.findByPeriodeId(p.get(0).getId()).orElseThrow();
        assertEquals("Formation Linde", detail.getAxesAmelioration());
        assertTrue(detail.getCommentairesEvaluateur().contains("Accompagnement manager"));

        Salarie renouvele = salarieRepository.findByMatricule("SRM000606").orElseThrow();
        List<PeriodeEvaluation> deux = periodeRepository.findBySalarieId(renouvele.getId());
        assertEquals(2, deux.size());
        PeriodeEvaluation second = deux.stream().filter(x -> x.getTypePeriode() == PeriodeType.SIX_MOIS).findFirst().orElseThrow();
        assertEquals(LocalDate.of(2026, 7, 19), second.getDateEcheance());
        assertEquals(LocalDate.of(2026, 6, 19), second.getDateDeclenchementEmail());
        assertNotNull(deux.stream().filter(x -> x.getTypePeriode() == PeriodeType.TROIS_MOIS).findFirst().orElseThrow().getDecisionFinale());
    }
}
