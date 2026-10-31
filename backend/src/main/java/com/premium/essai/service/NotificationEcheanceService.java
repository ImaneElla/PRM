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
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.web.server.ResponseStatusException;
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
                    notifierResponsable(periode, "Urgent : évaluation de " + nomSalarie(periode),
                            "L'évaluation de " + nomSalarie(periode) + " doit être remplie avant le " + dateFr(periode) + ".");
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
                    notifierResponsable(periode, "Rappel : évaluation de " + nomSalarie(periode),
                            "L'évaluation de " + nomSalarie(periode) + " n'est pas encore complétée. Échéance : " + dateFr(periode) + ".");
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
                    notifierResponsable(periode, "Évaluation à réaliser : " + nomSalarie(periode),
                            "L'évaluation de la période d'essai de " + nomSalarie(periode) + " est à réaliser avant le " + dateFr(periode) + ".");
                    periode.setStatut(StatutPeriode.EN_COURS);
                    periode.setDateDernierRappel(dateReference);
                    rappelsJ21++;
                } else {
                    log.error("[J-21] Envoi échoué pour {} : nouvelle tentative au prochain passage.", salarie.getMatricule());
                }
            }
            // J+1 OU APRÈS ÉCHÉANCE : Blocage strict + alerte retard + passage en attente décision RH
            // Les périodes en retard (échéance dépassée) sont traitées par detecterRetards(), appelé juste après la boucle

            periodeRepository.save(periode);
        }

        // Le retard est constaté en continu (voir detecterRetards) ; on s'assure ici qu'aucun dossier n'est oublié
        blocagesJ1 += detecterRetards(dateReference, true);

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

    private static final Set<StatutPeriode> STATUTS_CLOTURES = EnumSet.of(
            StatutPeriode.COMPLETEE, StatutPeriode.VALIDE, StatutPeriode.VALIDEE_RH, StatutPeriode.ROMPU,
            StatutPeriode.RUPTURE, StatutPeriode.RENOUVELE, StatutPeriode.TERMINE);

    /* Retard constaté sans attendre 09h00 : toutes les 5 minutes (et 20 s après chaque démarrage), tous les jours. */
    @Scheduled(initialDelay = 20_000, fixedDelay = 300_000)
    @Transactional
    public void detecterRetardsPeriodiquement() {
        int nouveaux = detecterRetards(LocalDate.now(), true);
        if (nouveaux > 0) log.info("[DÉTECTION RETARD] {} dossier(s) passé(s) en retard.", nouveaux);
    }

    /*
     * Constate les retards : une période ouverte dont l'échéance est dépassée passe immédiatement « en attente de décision RH »
     * (jours de retard mis à jour, dossier bloqué, alerte RH). Ne dépend ni de l'heure ni des jours ouvrables.
     * avecEmails = false pour un constat silencieux (création / import d'un historique) : aucun e-mail n'est envoyé au responsable.
     * Renvoie le nombre de dossiers nouvellement passés en retard.
     */
    @Transactional
    public int detecterRetards(LocalDate aujourdhui, boolean avecEmails) {
        int nouveaux = 0;
        for (PeriodeEvaluation periode : periodeRepository.findByDateEcheanceBefore(aujourdhui)) {
            if (constaterRetard(periode, aujourdhui, avecEmails)) nouveaux++;
        }
        return nouveaux;
    }

    /* Même constat, limité aux périodes d'un salarié (appelé dès sa création). */
    @Transactional
    public void detecterRetardsDuSalarie(Long salarieId, boolean avecEmails) {
        LocalDate aujourdhui = LocalDate.now();
        for (PeriodeEvaluation periode : periodeRepository.findBySalarieId(salarieId)) {
            if (periode.getDateEcheance() != null && periode.getDateEcheance().isBefore(aujourdhui)) {
                constaterRetard(periode, aujourdhui, avecEmails);
            }
        }
    }

    private boolean constaterRetard(PeriodeEvaluation periode, LocalDate aujourdhui, boolean avecEmails) {
        Salarie salarie = periode.getSalarie();
        if (STATUTS_CLOTURES.contains(periode.getStatut()) || periode.getDecisionFinale() != null || !salarie.isActif()) {
            return false;
        }
        int retard = (int) ChronoUnit.DAYS.between(periode.getDateEcheance(), aujourdhui);
        boolean nouveau = periode.getStatut() != StatutPeriode.EN_ATTENTE_DECISION_RH;
        boolean joursChanges = !Integer.valueOf(retard).equals(periode.getJoursRetard());
        if (!nouveau && !joursChanges) return false;

        periode.setJoursRetard(retard);
        if (nouveau) {
            log.warn("[RETARD / BLOCAGE J+1] Dossier {} bloqué (+{}j de retard).", salarie.getMatricule(), retard);
            periode.setStatut(StatutPeriode.EN_ATTENTE_DECISION_RH);
            salarie.setBloqueEmails(true);
            salarieRepository.save(salarie);

            if (avecEmails) {
                // Alerte retard envoyée au Manager ET à l'Admin RH (CC), et notification dans l'espace du responsable concerné
                mailService.sendAlerteRetard(periode, retard);
                notifierResponsable(periode, "Retard : évaluation de " + nomSalarie(periode),
                        "Échéance dépassée de " + retard + " jour(s). Le dossier est en attente de décision RH.");
            }
            notificationService.creerAlerte(
                    "BLOCAGE J+1 : Dossier " + salarie.getMatricule(),
                    "Délai dépassé de " + retard + " jour(s). Le dossier est en attente de décision RH.",
                    CibleRole.ALL_RH,
                    salarie.getId()
            );
        }
        periodeRepository.save(periode);
        return nouveau;
    }

    public record ResultatRelance(boolean envoye, String destinataire, String message) {
    }

    /*
     * Relance manuelle demandée par la RH (bouton « Relancer ») : envoie réellement l'e-mail au responsable concerné
     * (retard si l'échéance est dépassée, sinon rappel J-7 ou J-14 selon les jours restants) et le résultat reflète
     * l'envoi réel. Autorisée même si les relances automatiques sont bloquées pour ce dossier.
     */
    @Transactional
    public ResultatRelance relancerManuellement(Long periodeId) {
        PeriodeEvaluation periode = periodeRepository.findById(periodeId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Période introuvable."));
        Salarie salarie = periode.getSalarie();
        if (!salarie.isActif() || STATUTS_CLOTURES.contains(periode.getStatut()) || periode.getDecisionFinale() != null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ce dossier est clôturé : aucune relance à envoyer.");
        }
        if (periode.getResponsable() == null || periode.getResponsable().getEmail() == null
                || periode.getResponsable().getEmail().isBlank()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Aucun responsable avec une adresse e-mail n'est rattaché à ce dossier.");
        }

        String destinataire = periode.getResponsable().getEmail();
        long joursRestants = ChronoUnit.DAYS.between(LocalDate.now(), periode.getDateEcheance());
        boolean envoye;
        try {
            envoye = joursRestants < 0 ? mailService.sendAlerteRetard(periode, (int) -joursRestants)
                    : joursRestants <= 7 ? mailService.sendRappelJ7(periode)
                    : mailService.sendRappelJ14(periode);
        } catch (RuntimeException e) {
            log.error("Relance manuelle de la période {} impossible : {}", periodeId, e.getMessage());
            envoye = false;
        }

        if (envoye) {
            periode.setDateDernierRappel(LocalDate.now());
            periodeRepository.save(periode);
            notifierResponsable(periode, "Relance de la RH : " + nomSalarie(periode),
                    "La Direction RH vous relance au sujet de l'évaluation de " + nomSalarie(periode)
                            + " (échéance le " + dateFr(periode) + ").");
            return new ResultatRelance(true, destinataire, "Relance envoyée à " + destinataire + ".");
        }
        return new ResultatRelance(false, destinataire,
                "L'e-mail n'a pas pu être envoyé à " + destinataire + ". Vérifiez la configuration du serveur d'e-mail (MAIL_USERNAME / MAIL_PASSWORD).");
    }

    /* Relance toutes les périodes dont l'échéance est dépassée (bouton « Relancer tout »). */
    @Transactional
    public Map<String, Integer> relancerToutesLesPeriodesEnRetard() {
        int envoyees = 0;
        int echecs = 0;
        for (PeriodeEvaluation periode : periodeRepository.findByDateEcheanceBefore(LocalDate.now())) {
            if (!periode.getSalarie().isActif() || STATUTS_CLOTURES.contains(periode.getStatut()) || periode.getDecisionFinale() != null
                    || periode.getResponsable() == null) {
                continue;
            }
            try {
                if (relancerManuellement(periode.getId()).envoye()) envoyees++; else echecs++;
            } catch (ResponseStatusException e) {
                echecs++;
            }
        }
        return Map.of("envoyees", envoyees, "echecs", echecs);
    }

    private void notifierResponsable(PeriodeEvaluation periode, String titre, String message) {
        if (periode.getResponsable() == null) return;
        notificationService.creerAlerteResponsable(titre, message, periode.getResponsable().getId(), periode.getSalarie().getId());
    }

    private static String nomSalarie(PeriodeEvaluation periode) {
        return periode.getSalarie().getFirstName() + " " + periode.getSalarie().getLastName();
    }

    private static String dateFr(PeriodeEvaluation periode) {
        return periode.getDateEcheance().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy"));
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
