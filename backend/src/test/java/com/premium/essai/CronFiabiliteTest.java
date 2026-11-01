package com.premium.essai;

import com.premium.essai.dto.SalarieRequestDTO;
import com.premium.essai.dto.SalarieResponseDTO;
import com.premium.essai.model.Direction;
import com.premium.essai.model.PeriodeEvaluation;
import com.premium.essai.model.Responsable;
import com.premium.essai.model.enums.CibleRole;
import com.premium.essai.model.enums.StatutPeriode;
import com.premium.essai.repository.DirectionRepository;
import com.premium.essai.repository.PeriodeEvaluationRepository;
import com.premium.essai.repository.ResponsableRepository;
import com.premium.essai.repository.SalarieRepository;
import com.premium.essai.service.MailService;
import com.premium.essai.service.NotificationEcheanceService;
import com.premium.essai.service.NotificationEcheanceService.RapportExecution;
import com.premium.essai.service.NotificationService;
import com.premium.essai.service.SalarieService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@SpringBootTest
@ActiveProfiles("test")
class CronFiabiliteTest {

    @Autowired private DirectionRepository directionRepository;
    @Autowired private ResponsableRepository responsableRepository;
    @Autowired private SalarieRepository salarieRepository;
    @Autowired private PeriodeEvaluationRepository periodeRepository;
    @Autowired private SalarieService salarieService;
    @Autowired private NotificationEcheanceService cron;

    @MockBean private MailService mailService;
    @MockBean private NotificationService notificationService;

    private Direction direction;
    private Responsable responsable;
    private final List<Long> salariesCrees = new ArrayList<>();

    @BeforeEach
    void init() {
        direction = directionRepository.save(Direction.builder().code("DIR-" + UUID.randomUUID().toString().substring(0, 8)).name("Direction Cron").build());
        responsable = responsableRepository.save(Responsable.builder()
                .firstName("Resp").lastName("Cron")
                .email("resp-cron-" + UUID.randomUUID() + "@example.com")
                .poste("Manager").direction(direction).build());
        when(mailService.sendRappelJ21(any())).thenReturn(true);
        when(mailService.sendRappelJ14(any())).thenReturn(true);
        when(mailService.sendRappelJ7(any())).thenReturn(true);
        when(mailService.sendAlerteRetard(any(), org.mockito.ArgumentMatchers.anyInt())).thenReturn(true);
    }

    @AfterEach
    void nettoyer() {
        for (Long salarieId : salariesCrees) {
            periodeRepository.deleteAll(periodeRepository.findBySalarieId(salarieId));
            salarieRepository.deleteById(salarieId);
        }
        responsableRepository.deleteById(responsable.getId());
        directionRepository.deleteById(direction.getId());
    }

    private SalarieResponseDTO creerSalarie(LocalDate dateEmbauche) {
        SalarieResponseDTO salarie = salarieService.createSalarie(SalarieRequestDTO.builder()
                .firstName("Sal").lastName("Cron")
                .email("sal-cron-" + UUID.randomUUID() + "@example.com")
                .poste("Dev").dateEmbauche(dateEmbauche)
                .directionId(direction.getId()).responsableId(responsable.getId()).build());
        salariesCrees.add(salarie.getId());
        return salarie;
    }

    private PeriodeEvaluation premierePeriode(SalarieResponseDTO salarie) {
        return periodeRepository.findBySalarieId(salarie.getId()).get(0);
    }

    @Test
    void echecDeNotificationApresEnvoiNeAnnulePasEtapeNiNeRenvoieEmail() {
        // Échéance dans ~20 jours : le rappel J-21 est dû aujourd'hui
        SalarieResponseDTO salarie = creerSalarie(LocalDate.now().minusMonths(3).plusDays(20));
        PeriodeEvaluation periode = premierePeriode(salarie);
        doThrow(new IllegalStateException("notification indisponible"))
                .when(notificationService).creerAlerteResponsable(anyString(), anyString(), anyLong(), anyLong());

        RapportExecution premier = cron.traiterEcheances(LocalDate.now(), true);

        assertEquals("SUCCES", premier.getStatut());
        verify(mailService, times(1)).sendRappelJ21(any());
        // L'étape est bien validée en base malgré l'échec de la notification
        PeriodeEvaluation enBase = periodeRepository.findById(periode.getId()).orElseThrow();
        assertEquals(StatutPeriode.EN_COURS, enBase.getStatut());
        assertNotNull(enBase.getDateDernierRappel());

        // Passage suivant : aucun nouvel e-mail
        cron.traiterEcheances(LocalDate.now(), true);
        verify(mailService, times(1)).sendRappelJ21(any());
    }

    @Test
    void echecDeNotificationRhApresRappelJ7NeRenvoiePasEmail() {
        // Échéance dans ~5 jours : alerte critique J-7 due aujourd'hui
        SalarieResponseDTO salarie = creerSalarie(LocalDate.now().minusMonths(3).plusDays(5));
        PeriodeEvaluation periode = premierePeriode(salarie);
        doThrow(new IllegalStateException("notification indisponible"))
                .when(notificationService).creerAlerte(anyString(), anyString(), any(), anyLong());
        doThrow(new IllegalStateException("notification indisponible"))
                .when(notificationService).creerAlerteResponsable(anyString(), anyString(), anyLong(), anyLong());

        cron.traiterEcheances(LocalDate.now(), true);

        verify(mailService, times(1)).sendRappelJ7(any());
        assertEquals(StatutPeriode.EN_RETARD_CRITIQUE, periodeRepository.findById(periode.getId()).orElseThrow().getStatut());

        cron.traiterEcheances(LocalDate.now(), true);
        verify(mailService, times(1)).sendRappelJ7(any());
    }

    @Test
    void plusieursNotificationsEnFileSontCreeesUneSeuleFoisChacune() {
        // Alerte critique J-7 : une notification pour le responsable ET une pour la RH
        SalarieResponseDTO salarie = creerSalarie(LocalDate.now().minusMonths(3).plusDays(5));
        PeriodeEvaluation periode = premierePeriode(salarie);

        cron.traiterEcheances(LocalDate.now(), true);
        cron.traiterEcheances(LocalDate.now(), true);   // 2e passage : rien de plus

        verify(notificationService, times(1)).creerAlerteResponsable(anyString(), anyString(), org.mockito.ArgumentMatchers.eq(responsable.getId()), org.mockito.ArgumentMatchers.eq(salarie.getId()));
        verify(notificationService, times(1)).creerAlerte(anyString(), anyString(), org.mockito.ArgumentMatchers.eq(CibleRole.ALL_RH), org.mockito.ArgumentMatchers.eq(salarie.getId()));
        assertEquals(StatutPeriode.EN_RETARD_CRITIQUE, periodeRepository.findById(periode.getId()).orElseThrow().getStatut());
    }

    @Test
    void echecDeLaPremiereNotificationNEmpechePasLaSuivante() {
        SalarieResponseDTO salarie = creerSalarie(LocalDate.now().minusMonths(3).plusDays(5));
        doThrow(new IllegalStateException("notification responsable indisponible"))
                .when(notificationService).creerAlerteResponsable(anyString(), anyString(), anyLong(), anyLong());

        cron.traiterEcheances(LocalDate.now(), true);

        // La notification RH, placée après celle du responsable, est quand même créée
        verify(notificationService, times(1)).creerAlerte(anyString(), anyString(), org.mockito.ArgumentMatchers.eq(CibleRole.ALL_RH), org.mockito.ArgumentMatchers.eq(salarie.getId()));
    }

    @Test
    void uneExceptionSurUnePeriodeNeBloquePasLeTraitementDesAutres() {
        SalarieResponseDTO premier = creerSalarie(LocalDate.now().minusMonths(3).plusDays(20));
        SalarieResponseDTO second = creerSalarie(LocalDate.now().minusMonths(3).plusDays(20));
        // Le 1er envoi lève une exception, les suivants réussissent
        java.util.concurrent.atomic.AtomicInteger appels = new java.util.concurrent.atomic.AtomicInteger();
        when(mailService.sendRappelJ21(any())).thenAnswer(invocation -> {
            if (appels.incrementAndGet() == 1) throw new IllegalStateException("erreur simulée sur une période");
            return true;
        });

        RapportExecution rapport = cron.traiterEcheances(LocalDate.now(), true);

        assertEquals("SUCCES", rapport.getStatut());
        verify(mailService, times(2)).sendRappelJ21(any());          // la 2e période a bien été traitée
        assertEquals(1, rapport.getRappelsJ21Envoyes());
        assertTrue(rapport.getMessage().contains("1 période(s) en erreur"), rapport.getMessage());
        List<StatutPeriode> statuts = List.of(
                periodeRepository.findById(premierePeriode(premier).getId()).orElseThrow().getStatut(),
                periodeRepository.findById(premierePeriode(second).getId()).orElseThrow().getStatut());
        assertEquals(1, statuts.stream().filter(st -> st == StatutPeriode.EN_COURS).count(), "une seule période a avancé : " + statuts);
        assertEquals(1, statuts.stream().filter(st -> st != StatutPeriode.EN_COURS).count(), "la période en erreur n'a pas avancé : " + statuts);
    }

    @Test
    void totalPeriodesTraiteesCompteLesPeriodesExamineesAvecOuSansEmail() {
        // Référence : état de la base avant nos données (même date, aucun e-mail n'est réellement envoyé)
        RapportExecution avant = cron.traiterEcheances(LocalDate.now(), true);

        SalarieResponseDTO avecRappel = creerSalarie(LocalDate.now().minusMonths(3).plusDays(20));   // J-21 : e-mail
        SalarieResponseDTO sansRappel = creerSalarie(LocalDate.now());                                 // échéance dans 3 mois : rien à envoyer
        SalarieResponseDTO termine = creerSalarie(LocalDate.now().minusMonths(3).plusDays(20));        // clôturé : ignoré
        PeriodeEvaluation periodeTerminee = premierePeriode(termine);
        periodeTerminee.setStatut(StatutPeriode.COMPLETEE);
        periodeRepository.save(periodeTerminee);

        RapportExecution apres = cron.traiterEcheances(LocalDate.now(), true);

        // +2 : la période avec rappel et celle sans rappel ; la période terminée n'est pas comptée
        assertEquals(avant.getTotalPeriodesTraitees() + 2, apres.getTotalPeriodesTraitees());
        assertEquals(1, apres.getRappelsJ21Envoyes());
        assertEquals(0, apres.getRappelsJ14Envoyes());
        assertEquals(0, apres.getAlertesJ7Envoyees());
        assertEquals(StatutPeriode.EN_COURS, periodeRepository.findById(premierePeriode(avecRappel).getId()).orElseThrow().getStatut());
        assertNotEquals(StatutPeriode.EN_COURS, periodeRepository.findById(premierePeriode(sansRappel).getId()).orElseThrow().getStatut());
    }
}
