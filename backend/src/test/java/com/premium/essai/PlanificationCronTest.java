package com.premium.essai;

import com.premium.essai.service.HistoriqueEmailService;
import com.premium.essai.service.NotificationEcheanceService;
import org.junit.jupiter.api.Test;
import org.springframework.aop.support.AopUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.scheduling.annotation.ScheduledAnnotationBeanPostProcessor;
import org.springframework.scheduling.config.CronTask;
import org.springframework.scheduling.config.FixedDelayTask;
import org.springframework.scheduling.config.ScheduledTask;
import org.springframework.scheduling.support.SimpleTriggerContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.AnnotationTransactionAttributeSource;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;


@SpringBootTest
@ActiveProfiles("test")
class PlanificationCronTest {

    private static final ZoneId CASABLANCA = ZoneId.of("Africa/Casablanca");

    @Autowired private ScheduledAnnotationBeanPostProcessor planificateur;
    @Autowired private NotificationEcheanceService cron;
    @Autowired private HistoriqueEmailService historiqueEmailService;

    private CronTask tacheCron() {
        List<CronTask> taches = planificateur.getScheduledTasks().stream()
                .map(ScheduledTask::getTask).filter(CronTask.class::isInstance).map(CronTask.class::cast).toList();
        assertEquals(1, taches.size(), "une seule tâche cron (rappels de 09 h)");
        return taches.get(0);
    }

    private FixedDelayTask tacheRetards() {
        List<FixedDelayTask> taches = planificateur.getScheduledTasks().stream()
                .map(ScheduledTask::getTask).filter(FixedDelayTask.class::isInstance).map(FixedDelayTask.class::cast).toList();
        assertEquals(1, taches.size(), "une seule tâche de détection des retards");
        return taches.get(0);
    }

    private Instant prochaineExecution(String maintenantUtc) {
        return tacheCron().getTrigger().nextExecution(new SimpleTriggerContext(Clock.fixed(Instant.parse(maintenantUtc), ZoneOffset.UTC)));
    }

    // ---------- Enregistrement par Spring ----------

    @Test
    void lesDeuxTachesPlanifieesSontEnregistreesParSpring() {
        assertEquals(2, planificateur.getScheduledTasks().size());
        assertTrue(tacheCron().getRunnable().toString().endsWith("NotificationEcheanceService.executerVerificationAutomatique"));
        assertTrue(tacheRetards().getRunnable().toString().endsWith("NotificationEcheanceService.detecterRetardsPeriodiquement"));
    }

    // ---------- Cron des rappels : expression et fuseau ----------

    @Test
    void cronDesRappelsLundiAVendrediA9hHeureDeCasablanca() {
        assertEquals("0 0 9 * * MON-FRI", tacheCron().getExpression());

        // Lundi 2 novembre 2026, 07:30 UTC : le prochain passage est à 09:00 à Casablanca (08:00 UTC), et non 09:00 UTC
        Instant lundi = prochaineExecution("2026-11-02T07:30:00Z");
        assertEquals(Instant.parse("2026-11-02T08:00:00Z"), lundi);
        assertEquals("09:00", lundi.atZone(CASABLANCA).toLocalTime().toString());

        // Une fois 09:00 passé, on attend le lendemain
        assertEquals(Instant.parse("2026-11-03T08:00:00Z"), prochaineExecution("2026-11-02T08:00:01Z"));
    }

    @Test
    void cronDesRappelsNeSeDeclenchePasLeWeekEnd() {
        Instant lundiSuivant = Instant.parse("2026-11-09T08:00:00Z");
        assertEquals(lundiSuivant, prochaineExecution("2026-11-06T09:00:00Z"));   // vendredi après 09 h
        assertEquals(lundiSuivant, prochaineExecution("2026-11-07T10:00:00Z"));   // samedi
        assertEquals(lundiSuivant, prochaineExecution("2026-11-08T10:00:00Z"));   // dimanche
    }

    // ---------- Détection des retards : délai initial et intervalle ----------

    @Test
    void detectionDesRetardsDemarreApres20SecondesPuisToutesLes5Minutes() {
        FixedDelayTask tache = tacheRetards();
        assertEquals(Duration.ofSeconds(20), tache.getInitialDelayDuration());
        assertEquals(Duration.ofMinutes(5), tache.getIntervalDuration());
    }

    // ---------- Week-ends et jours fériés marocains ----------

    @Test
    void weekEndsEtJoursFeriesNationauxNeSontPasOuvrables() {
        assertFalse(cron.estJourOuvrable(LocalDate.of(2026, 11, 7)), "samedi");
        assertFalse(cron.estJourOuvrable(LocalDate.of(2026, 11, 8)), "dimanche");
        // Fêtes nationales (dates fixes), vérifiées sur plusieurs années, y compris quand elles tombent un jour de semaine
        for (int annee : new int[]{2026, 2027, 2028}) {
            for (int[] jourMois : new int[][]{{1, 1}, {1, 11}, {1, 14}, {5, 1}, {7, 30}, {8, 14}, {8, 20}, {8, 21}, {11, 6}, {11, 18}}) {
                LocalDate fete = LocalDate.of(annee, jourMois[0], jourMois[1]);
                assertFalse(cron.estJourOuvrable(fete), "fête nationale " + fete);
                assertTrue(cron.estJourFerie(fete), "fête nationale " + fete);
            }
        }
    }

    @Test
    void feteReligieusesOfficiellesPrevisionnellesDe2026Et2027SontExclues() {
        List<LocalDate> fetes = List.of(
                LocalDate.of(2026, 3, 20), LocalDate.of(2026, 3, 21), LocalDate.of(2026, 5, 27), LocalDate.of(2026, 5, 28),
                LocalDate.of(2026, 6, 17), LocalDate.of(2026, 8, 26), LocalDate.of(2026, 8, 27),
                LocalDate.of(2027, 3, 10), LocalDate.of(2027, 3, 11), LocalDate.of(2027, 5, 17), LocalDate.of(2027, 5, 18),
                LocalDate.of(2027, 6, 7), LocalDate.of(2027, 8, 16), LocalDate.of(2027, 8, 17));
        for (LocalDate fete : fetes) {
            assertTrue(cron.estJourFerie(fete), "férié " + fete);
            assertFalse(cron.estFeteEstimee(fete), "date prévisionnelle déjà saisie, pas une estimation : " + fete);
        }
    }

    @Test
    void feteReligieusesDe2028SontEstimeesEtDistinguees() {
        List<LocalDate> estimees = List.of(
                LocalDate.of(2028, 2, 27), LocalDate.of(2028, 2, 28), LocalDate.of(2028, 5, 6), LocalDate.of(2028, 5, 7),
                LocalDate.of(2028, 5, 26), LocalDate.of(2028, 8, 4), LocalDate.of(2028, 8, 5));
        for (LocalDate date : estimees) {
            assertTrue(cron.estJourFerie(date), "férié estimé " + date);
            assertTrue(cron.estFeteEstimee(date), "signalé comme ESTIMÉ " + date);
        }
        // Les jours ordinaires et les fêtes officielles ne sont jamais signalés comme estimés
        assertFalse(cron.estFeteEstimee(LocalDate.of(2026, 11, 9)));
        assertFalse(cron.estFeteEstimee(LocalDate.of(2027, 5, 17)));
    }

    @Test
    void unJourOrdinaireDeSemaineEstOuvrable() {
        assertTrue(cron.estJourOuvrable(LocalDate.of(2026, 11, 9)), "lundi ordinaire");
        assertTrue(cron.estJourOuvrable(LocalDate.of(2026, 11, 10)), "mardi ordinaire");
        assertTrue(cron.estJourOuvrable(LocalDate.of(2028, 3, 1)), "mercredi ordinaire en 2028");
    }

    @Test
    void executionUnJourNonOuvrableEstIgnoreeSansForcer() {
        var rapport = cron.traiterEcheances(LocalDate.of(2026, 11, 7), false);   // samedi
        assertEquals("IGNORE_JOUR_NON_OUVRABLE", rapport.getStatut());
        var ferie = cron.traiterEcheances(LocalDate.of(2026, 11, 6), false);     // vendredi férié (Marche Verte)
        assertEquals("IGNORE_JOUR_NON_OUVRABLE", ferie.getStatut());
    }

    // ---------- Historique des e-mails : transaction indépendante ----------

    @Test
    void historiqueEmailEstUnBeanSpringEnTransactionIndependante() throws Exception {
        assertTrue(AopUtils.isAopProxy(historiqueEmailService), "bean distinct, passant par le proxy transactionnel");
        var methode = HistoriqueEmailService.class.getMethod("enregistrer", com.premium.essai.model.HistoriqueEmail.class);
        var attribut = new AnnotationTransactionAttributeSource().getTransactionAttribute(methode, HistoriqueEmailService.class);
        assertEquals(TransactionDefinition.PROPAGATION_REQUIRES_NEW, attribut.getPropagationBehavior());
    }
}
