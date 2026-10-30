package com.premium.essai;

import com.premium.essai.dto.*;
import com.premium.essai.exception.EvaluationVerrouilleeException;
import com.premium.essai.model.*;
import com.premium.essai.model.enums.*;
import com.premium.essai.repository.*;
import com.premium.essai.service.EvaluationService;
import com.premium.essai.service.SalarieService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
public class ServiceUnitTest {

    @Autowired
    private SalarieService salarieService;

    @Autowired
    private EvaluationService evaluationService;

    @Autowired
    private DirectionRepository directionRepository;

    @Autowired
    private ResponsableRepository responsableRepository;

    @Autowired
    private PeriodeEvaluationRepository periodeRepository;

    @Autowired
    private SalarieRepository salarieRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    private Long directionId;
    private Long responsableId;

    @BeforeEach
    void init() {
        Direction dir = directionRepository.save(Direction.builder().code("DIR-IT").name("Direction IT").build());
        Responsable respo = responsableRepository.save(Responsable.builder()
                .firstName("Karim")
                .lastName("Bennani")
                .email("k.bennani@groupepremium.ma")
                .poste("Manager IT")
                .direction(dir)
                .build());

        directionId = dir.getId();
        responsableId = respo.getId();
    }

    @Test
    @DisplayName("1. Test création salarié avec matricule GRP à six chiffres")
    void testCreateSalarie() {
        SalarieRequestDTO dto = SalarieRequestDTO.builder()
                .firstName("Imane")
                .lastName("Ellaouzi")
                .email("imane@example.com")
                .poste("Développeuse IT")
                .dateEmbauche(LocalDate.now())
                .directionId(directionId)
                .responsableId(responsableId)
                .build();

        SalarieResponseDTO salarie = salarieService.createSalarie(dto);

        assertEquals("GRP000001", salarie.getMatricule());
        assertEquals("GRP", salarie.getSociete());
        
        List<PeriodeEvaluation> periodes = periodeRepository.findAll();
        assertEquals(1, periodes.size());
        assertEquals(PeriodeType.TROIS_MOIS, periodes.get(0).getTypePeriode());
        assertEquals(periodes.get(0).getId(), salarie.getPeriodeInitialeId());
    }

    @Test
    @DisplayName("Matricules incrémentés séparément par société")
    void testMatriculeSequencePerSociete() {
        SalarieResponseDTO firstPro = salarieService.createSalarie(SalarieRequestDTO.builder()
                .firstName("Sara")
                .lastName("Pro")
                .email("sara.pro@example.com")
                .poste("Consultante")
                .dateEmbauche(LocalDate.now())
                .directionId(directionId)
                .responsableId(responsableId)
                .societe("PRO")
                .build());
        SalarieResponseDTO secondPro = salarieService.createSalarie(SalarieRequestDTO.builder()
                .firstName("Youssef")
                .lastName("Pro")
                .email("youssef.pro@example.com")
                .poste("Analyste")
                .dateEmbauche(LocalDate.now())
                .directionId(directionId)
                .responsableId(responsableId)
                .societe("PRO")
                .build());
        SalarieResponseDTO firstSrm = salarieService.createSalarie(SalarieRequestDTO.builder()
                .firstName("Imane")
                .lastName("Srm")
                .email("imane.srm@example.com")
                .poste("Technicienne")
                .dateEmbauche(LocalDate.now())
                .directionId(directionId)
                .responsableId(responsableId)
                .societe("SRM")
                .build());

        assertEquals("PRO000001", firstPro.getMatricule());
        assertEquals("PRO000002", secondPro.getMatricule());
        assertEquals("SRM000001", firstSrm.getMatricule());
    }

    @Test
    @DisplayName("Changer la société régénère le matricule avec le nouveau préfixe")
    void testUpdateSocieteRegeneratesMatricule() {
        SalarieResponseDTO created = salarieService.createSalarie(SalarieRequestDTO.builder()
                .firstName("Youssef")
                .lastName("Tazi")
                .email("youssef.tazi@example.com")
                .poste("Technicien")
                .dateEmbauche(LocalDate.now())
                .directionId(directionId)
                .responsableId(responsableId)
                .societe("GRP")
                .build());

        SalarieResponseDTO updated = salarieService.updateSociete(created.getId(), "SRM");

        assertEquals("SRM", updated.getSociete());
        assertEquals("SRM000001", updated.getMatricule());
    }

    @Test
    @DisplayName("Supprimer un salarié supprime aussi ses périodes et ses évaluations")
    void testDeleteSalarieRemovesDatabaseRecords() {
        SalarieResponseDTO created = salarieService.createSalarie(SalarieRequestDTO.builder()
                .firstName("Aya")
                .lastName("Baboucha")
                .email("aya.delete@example.com")
                .poste("Testeuse")
                .dateEmbauche(LocalDate.now())
                .directionId(directionId)
                .responsableId(responsableId)
                .societe("SRM")
                .build());

        assertTrue(salarieRepository.existsById(created.getId()));
        assertEquals(1, periodeRepository.findBySalarieId(created.getId()).size());

        salarieService.deleteSalarie(created.getId());

        assertFalse(salarieRepository.existsById(created.getId()));
        assertTrue(periodeRepository.findBySalarieId(created.getId()).isEmpty());
    }

    @Test
    @DisplayName("La société renseignée prévaut sur un ancien préfixe de matricule")
    void testMigrationPreservesExplicitSociete() {
        SalarieResponseDTO created = salarieService.createSalarie(SalarieRequestDTO.builder()
                .firstName("Aya")
                .lastName("Baboucha")
                .email("aya.baboucha@example.com")
                .poste("Testeuse")
                .dateEmbauche(LocalDate.now())
                .directionId(directionId)
                .responsableId(responsableId)
                .societe("SRM")
                .build());

        Salarie salarie = salarieRepository.findById(created.getId()).orElseThrow();
        salarie.setMatricule("GRP000002");
        salarieRepository.save(salarie);

        SalarieResponseDTO refreshed = salarieService.getSalarieById(created.getId());

        assertEquals("SRM", refreshed.getSociete());
        assertEquals("SRM000001", refreshed.getMatricule());
    }

    @Test
    @DisplayName("2. Test Soumission Evaluation + Cascade P1 vers P2 (6 mois)")
    void testCascadeP1P2() {
        SalarieRequestDTO dto = SalarieRequestDTO.builder()
                .firstName("Sara")
                .lastName("Ahmadi")
                .email("sara@example.com")
                .poste("Consultante")
                .dateEmbauche(LocalDate.now())
                .directionId(directionId)
                .responsableId(responsableId)
                .build();

        SalarieResponseDTO salarie = salarieService.createSalarie(dto);
        PeriodeEvaluation p1 = periodeRepository.findAll().get(0);
        assertEquals(p1.getId(), salarie.getPeriodeInitialeId());

        EvaluationDetailRequestDTO evalDto = EvaluationDetailRequestDTO.builder()
                .noteCompetencesPro(4.0)
                .noteAptitudesPerso(4.5)
                .noteQSE(5.0)
                .recommandationEvaluateur(RecommandationEvaluateur.CONFIRMATION_CDI)
                .jsonReponsesCriteres("{}")
                .build();

        EvaluationDetailResponseDTO result = evaluationService.soumettreEvaluation(p1.getId(), evalDto);

        List<PeriodeEvaluation> periodes = periodeRepository.findAll();
        assertEquals(2, periodes.size()); // P1 + P2 générée !
        assertEquals(StatutPeriode.COMPLETEE, p1.getStatut());
        PeriodeEvaluation p2 = periodes.stream()
                .filter(periode -> periode.getTypePeriode() == PeriodeType.SIX_MOIS)
                .findFirst()
                .orElseThrow();
        assertEquals(2, p2.getNumeroPeriode());
        assertEquals(p2.getId(), result.getPeriodeSuivanteId());
        assertEquals(p2.getDateEcheance(), result.getDateEcheancePeriodeSuivante());
        assertEquals(1, notificationRepository.findByCibleRoleAndEstLueFalse(CibleRole.ALL_RH).size());
    }

    @Test
    @DisplayName("3. Test Sécurité J+1 : Blocage du lien si la date est dépassée")
    void testBlocageJPlus1() {
        SalarieRequestDTO dto = SalarieRequestDTO.builder()
                .firstName("Youssef")
                .lastName("Alaoui")
                .email("youssef@example.com")
                .poste("Analyste")
                .dateEmbauche(LocalDate.now().minusMonths(4))
                .directionId(directionId)
                .responsableId(responsableId)
                .build();

        salarieService.createSalarie(dto);
        PeriodeEvaluation p1 = periodeRepository.findAll().get(0);
        p1.setDateEcheance(LocalDate.now().minusDays(1)); // Échéance hier
        periodeRepository.save(p1);

        assertThrows(EvaluationVerrouilleeException.class, () -> {
            evaluationService.getEvaluationByToken(p1.getTokenAccesSalarie());
        });
    }
}