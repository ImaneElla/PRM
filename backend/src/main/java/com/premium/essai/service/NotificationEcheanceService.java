package com.premium.essai.service;

import com.premium.essai.model.PeriodeEvaluation;
import com.premium.essai.model.Salarie;
import com.premium.essai.model.enums.CibleRole;
import com.premium.essai.model.enums.StatutPeriode;
import com.premium.essai.repository.PeriodeEvaluationRepository;
import com.premium.essai.repository.SalarieRepository;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.MonthDay;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationEcheanceService {

    private final PeriodeEvaluationRepository periodeRepository;
    private final SalarieRepository salarieRepository;
    private final MailService mailService;
    private final NotificationService notificationService;

    // Fêtes nationales fixes marocaines
    private static final Set<MonthDay> FETES_NATIONALES_MAROC = Set.of(
            MonthDay.of(1, 1),   // Nouvel An
            MonthDay.of(1, 11),  // Manifeste de l'Indépendance
            MonthDay.of(1, 14),  // Nouvel An Amazigh
            MonthDay.of(5, 1),   // Fête du Travail
            MonthDay.of(7, 30),  // Fête du Trône
            MonthDay.of(8, 14),  // Allégeance Oued Ed-Dahab
            MonthDay.of(8, 20),  // Révolution du Roi et du Peuple
            MonthDay.of(8, 21),  // Fête de la Jeunesse
            MonthDay.of(11, 6),  // Marche Verte
            MonthDay.of(11, 18)  // Fête de l'Indépendance
    );

    // Fêtes religieuses marocaines (dates officielles prévisionnelles 2026/2027)
    private static final Set<LocalDate> FETES_RELIGIEUSES_MAROC = Set.of(
            // 2026
            LocalDate.of(2026, 3, 20), LocalDate.of(2026, 3, 21), // Aïd Al-Fitr
            LocalDate.of(2026, 5, 27), LocalDate.of(2026, 5, 28), // Aïd Al-Adha
            LocalDate.of(2026, 6, 17),                             // 1er Moharram
            LocalDate.of(2026, 8, 26), LocalDate.of(2026, 8, 27), // Aïd Al-Mawlid
            // 2027
            LocalDate.of(2027, 3, 10), LocalDate.of(2027, 3, 11), // Aïd Al-Fitr
            LocalDate.of(2027, 5, 17), LocalDate.of(2027, 5, 18), // Aïd Al-Adha
            LocalDate.of(2027, 6, 7),                              // 1er Moharram
            LocalDate.of(2027, 8, 16), LocalDate.of(2027, 8, 17)  // Aïd Al-Mawlid
    );

    /* Tâche planifiée automatique du Lundi au Vendredi à 09h00 (Heure de Casablanca). */
    @Scheduled(cron = "0 0 9 * * MON-FRI", zone = "Africa/Casablanca")
    @Transactional
    public void executerVerificationAutomatique() {
        log.info("--- [CRON 09:00 CASABLANCA] Début de la vérification quotidienne des échéances ---");
        LocalDate aujourdhui = LocalDate.now();

        if (!estJourOuvrable(aujourdhui)) {
            log.info("Aujourd'hui ({}) est un jour non ouvrable (week-end ou jour férié marocain). Exécution ignorée.", aujourdhui);
            return;
        }

        traiterEcheances(aujourdhui, false);
        log.info("--- [CRON 09:00 CASABLANCA] Fin de la vérification quotidienne ---");
    }

    /* Méthode d'exécution (manuelle ou planifiée) renvoyant un rapport détaillé.*/
    @Transactional
    public RapportExecution traiterEcheances(LocalDate dateReference, boolean forcerExecution) {
        if (!forcerExecution && !estJourOuvrable(dateReference)) {
            return RapportExecution.builder()
                    .dateExecution(dateReference)
                    .statut("IGNORE_JOUR_NON_OUVRABLE")
                    .message("Date non ouvrable (week-end ou jour férié marocain).")
                    .build();
        }

        int totalTraites = 0;
        int rappelsJ21 = 0;
        int rappelsJ14 = 0;
        int alertesJ7 = 0;
        int blocagesJ1 = 0;

        List<PeriodeEvaluation> toutesPeriodes = periodeRepository.findAll();

        for (PeriodeEvaluation periode : toutesPeriodes) {
            Salarie salarie = periode.getSalarie();

            if (periode.getStatut() == StatutPeriode.COMPLETEE ||
                periode.getStatut() == StatutPeriode.VALIDE ||
                periode.getStatut() == StatutPeriode.VALIDEE_RH ||
                periode.getStatut() == StatutPeriode.ROMPU ||
                periode.getStatut() == StatutPeriode.RUPTURE ||
                !salarie.isActif()) {
                continue;
            }

            LocalDate dateEcheance = periode.getDateEcheance();
            if (dateEcheance == null) {
                continue;
            }

            totalTraites++;
            long joursRestants = ChronoUnit.DAYS.between(dateReference, dateEcheance);

            // Les rappels sont envoyés par tranche (et non un jour exact) : si le jour J tombe un week-end,
            // un jour férié ou que le serveur était arrêté, le rappel part au prochain passage.
            // L'étape déjà envoyée est mémorisée dans le statut ; un envoi qui échoue sera retenté le jour ouvrable suivant.
            int etapeEnvoyee = etapeEnvoyee(periode.getStatut());

            // J-7 à J0 : Alerte critique avec copie CC Direction RH
            if (joursRestants >= 0 && joursRestants <= 7 && etapeEnvoyee < 3 && !salarie.isBloqueEmails()) {
                log.info("[J-7] Envoi alerte critique (CC RH) pour {}", salarie.getMatricule());
                if (mailService.sendRappelJ7(periode)) {
                    periode.setStatut(StatutPeriode.EN_RETARD_CRITIQUE);
                    periode.setDateDernierRappel(dateReference);
                    alertesJ7++;

                    notificationService.creerAlerte(
                            "Alerte J-7 : " + salarie.getFirstName() + " " + salarie.getLastName(),
                            "L'évaluation arrive à échéance dans 7 jours. Action requise d'urgence.",
                            CibleRole.ALL_RH,
                            salarie.getId()
                    );
                } else {
                    log.error("[J-7] Envoi échoué pour {} : nouvelle tentative au prochain passage.", salarie.getMatricule());
                }
            }
            // J-14 à J-8 : Première relance
            else if (joursRestants > 7 && joursRestants <= 14 && etapeEnvoyee < 2 && !salarie.isBloqueEmails()) {
                log.info("[J-14] Envoi email relance pour {}", salarie.getMatricule());
                if (mailService.sendRappelJ14(periode)) {
                    periode.setStatut(StatutPeriode.EN_RELANCE);
                    periode.setDateDernierRappel(dateReference);
                    rappelsJ14++;
                } else {
                    log.error("[J-14] Envoi échoué pour {} : nouvelle tentative au prochain passage.", salarie.getMatricule());
                }
            }
            // J-21 à J-15 : Initial
            else if (joursRestants > 14 && joursRestants <= 21 && etapeEnvoyee < 1 && !salarie.isBloqueEmails()) {
                log.info("[J-21] Envoi email initial pour {}", salarie.getMatricule());
                if (mailService.sendRappelJ21(periode)) {
                    periode.setStatut(StatutPeriode.EN_COURS);
                    periode.setDateDernierRappel(dateReference);
                    rappelsJ21++;
                } else {
                    log.error("[J-21] Envoi échoué pour {} : nouvelle tentative au prochain passage.", salarie.getMatricule());
                }
            }
            // J+1 OU APRÈS ÉCHÉANCE : Blocage strict + alerte retard + passage en attente décision RH
            else if (joursRestants < 0) {
                int retard = (int) Math.abs(joursRestants);
                periode.setJoursRetard(retard);

                if (periode.getStatut() != StatutPeriode.EN_ATTENTE_DECISION_RH) {
                    log.warn("[RETARD CRITIQUE / BLOCAGE J+1] Dossier {} bloqué (+{}j de retard).", salarie.getMatricule(), retard);
                    periode.setStatut(StatutPeriode.EN_ATTENTE_DECISION_RH);
                    salarie.setBloqueEmails(true);
                    salarieRepository.save(salarie);

                    // Alerte retard envoyée au Manager ET à l'Admin RH (CC)
                    mailService.sendAlerteRetard(periode, retard);

                    notificationService.creerAlerte(
                            "BLOCAGE J+1 : Dossier " + salarie.getMatricule(),
                            "Délai dépassé de " + retard + " jour(s). Le dossier est en attente de décision RH.",
                            CibleRole.ALL_RH,
                            salarie.getId()
                    );
                    blocagesJ1++;
                }
            }

            periodeRepository.save(periode);
        }

        return RapportExecution.builder()
                .dateExecution(dateReference)
                .statut("SUCCES")
                .totalPeriodesTraitees(totalTraites)
                .rappelsJ21Envoyes(rappelsJ21)
                .rappelsJ14Envoyes(rappelsJ14)
                .alertesJ7Envoyees(alertesJ7)
                .dossiersBloquesJ1(blocagesJ1)
                .message("Traitement des échéances complété avec succès.")
                .build();
    }

    /* Dernière étape de rappel déjà envoyée : 0 = aucune, 1 = J-21, 2 = J-14, 3 = J-7. */
    private int etapeEnvoyee(StatutPeriode statut) {
        return switch (statut) {
            case EN_COURS -> 1;
            case EN_RELANCE -> 2;
            case EN_RETARD_CRITIQUE -> 3;
            default -> 0;
        };
    }

    /* Vérifie si la date correspond à un jour ouvrable (hors week-end et hors jours fériés marocains).*/
    public boolean estJourOuvrable(LocalDate date) {
        DayOfWeek dow = date.getDayOfWeek();
        if (dow == DayOfWeek.SATURDAY || dow == DayOfWeek.SUNDAY) {
            return false;
        }
        return !estJourFerie(date);
    }

    /* Vérifie si la date est un jour férié marocain (fêtes nationales et fêtes religieuses). */
    public boolean estJourFerie(LocalDate date) {
        MonthDay md = MonthDay.of(date.getMonth(), date.getDayOfMonth());
        if (FETES_NATIONALES_MAROC.contains(md)) {
            return true;
        }
        return FETES_RELIGIEUSES_MAROC.contains(date);
    }

    @Data
    @Builder
    public static class RapportExecution {
        private LocalDate dateExecution;
        private String statut;
        private int totalPeriodesTraitees;
        private int rappelsJ21Envoyes;
        private int rappelsJ14Envoyes;
        private int alertesJ7Envoyees;
        private int dossiersBloquesJ1;
        private String message;
    }
}
