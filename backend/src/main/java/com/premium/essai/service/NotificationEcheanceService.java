package com.premium.essai.service;

import com.premium.essai.config.HeureMaroc;
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
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
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
    private final PlatformTransactionManager transactionManager;

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


    private static final Set<LocalDate> FETES_RELIGIEUSES_ESTIMEES = Set.of(
            LocalDate.of(2028, 2, 27), LocalDate.of(2028, 2, 28),  // Aïd Al-Fitr (estimé)
            LocalDate.of(2028, 5, 6), LocalDate.of(2028, 5, 7),    // Aïd Al-Adha (estimé)
            LocalDate.of(2028, 5, 26),                              // 1er Moharram (estimé)
            LocalDate.of(2028, 8, 4), LocalDate.of(2028, 8, 5)     // Aïd Al-Mawlid (estimé)
    );

    /* Tâche planifiée automatique du Lundi au Vendredi à 09h00 (Heure de Casablanca). */
    @Scheduled(cron = "0 0 9 * * MON-FRI", zone = "Africa/Casablanca")
    public void executerVerificationAutomatique() {
        LocalDate aujourdhui = HeureMaroc.aujourdhui();
        log.info("--- [CRON 09:00 CASABLANCA] Début de la vérification quotidienne des échéances ({}) ---", aujourdhui);
        try {
            if (!estJourOuvrable(aujourdhui)) {
                log.info("Aujourd'hui ({}) est un jour non ouvrable (week-end ou jour férié marocain). Exécution ignorée.", aujourdhui);
                if (estFeteEstimee(aujourdhui)) {
                    log.warn("[CRON] Ce jour férié repose sur une date ESTIMÉE (non officielle) : à vérifier auprès du Ministère des Habous.");
                }
                return;
            }
            RapportExecution rapport = traiterEcheances(aujourdhui, false);
            log.info("[CRON 09:00 CASABLANCA] Résultat : {} période(s) examinée(s), J-21={}, J-14={}, J-7={}, retards={}.",
                    rapport.getTotalPeriodesTraitees(), rapport.getRappelsJ21Envoyes(), rapport.getRappelsJ14Envoyes(),
                    rapport.getAlertesJ7Envoyees(), rapport.getDossiersBloquesJ1());
        } catch (RuntimeException e) {
            // Ne jamais laisser une erreur interrompre la planification : le prochain jour ouvrable sera exécuté normalement
            log.error("[CRON 09:00 CASABLANCA] Échec de la vérification quotidienne : {}", e.toString(), e);
        }
        log.info("--- [CRON 09:00 CASABLANCA] Fin de la vérification quotidienne ---");
    }


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
        int erreurs = 0;

        List<Long> idsPeriodes = periodeRepository.findAll().stream().map(PeriodeEvaluation::getId).toList();

        for (Long periodeId : idsPeriodes) {
            List<AlerteDifferee> alertes = new ArrayList<>();
            try {
                Integer resultat = transaction().execute(statut ->
                        periodeRepository.findById(periodeId).map(p -> traiterPeriode(p, dateReference, alertes)).orElse(ETAPE_IGNOREE));
                if (resultat == null || resultat == ETAPE_IGNOREE) continue;
                // Étape enregistrée et validée : les notifications viennent ensuite, chacune isolée
                publier(alertes);
                totalTraites++;
                switch (resultat) {
                    case 1 -> rappelsJ21++;
                    case 2 -> rappelsJ14++;
                    case 3 -> alertesJ7++;
                    default -> { }
                }
            } catch (RuntimeException e) {
                erreurs++;
                log.error("[ÉCHÉANCES] Période {} non traitée, passage au dossier suivant : {}", periodeId, e.toString(), e);
            }
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
                .message(erreurs == 0
                        ? "Traitement des échéances complété avec succès."
                        : "Traitement des échéances complété : " + erreurs + " période(s) en erreur (voir les journaux du serveur).")
                .build();
    }

    private static final int ETAPE_IGNOREE = -1;

    /* Traite une période (dans la transaction ouverte par l'appelant). Renvoie -1 si ignorée, 0 si rien à envoyer, sinon 1 (J-21), 2 (J-14) ou 3 (J-7). */
    private int traiterPeriode(PeriodeEvaluation periode, LocalDate dateReference, List<AlerteDifferee> alertes) {
        Salarie salarie = periode.getSalarie();

        if (periode.getStatut() == StatutPeriode.COMPLETEE ||
            periode.getStatut() == StatutPeriode.VALIDE ||
            periode.getStatut() == StatutPeriode.VALIDEE_RH ||
            periode.getStatut() == StatutPeriode.ROMPU ||
            periode.getStatut() == StatutPeriode.RUPTURE ||
            !salarie.isActif()) {
            return ETAPE_IGNOREE;
        }

        LocalDate dateEcheance = periode.getDateEcheance();
        if (dateEcheance == null) {
            return ETAPE_IGNOREE;
        }

        long joursRestants = ChronoUnit.DAYS.between(dateReference, dateEcheance);

        // Les rappels sont envoyés par tranche (et non un jour exact) : si le jour J tombe un week-end,
        // un jour férié ou que le serveur était arrêté, le rappel part au prochain passage.
        // L'étape déjà envoyée est mémorisée dans le statut ; un envoi qui échoue sera retenté le jour ouvrable suivant.
        int etapeEnvoyee = etapeEnvoyee(periode.getStatut());
        int envoye = 0;

        // J-7 à J0 : Alerte critique avec copie CC Direction RH
        if (joursRestants >= 0 && joursRestants <= 7 && etapeEnvoyee < 3 && !salarie.isBloqueEmails()) {
            log.info("[J-7] Envoi alerte critique (CC RH) pour {}", salarie.getMatricule());
            if (mailService.sendRappelJ7(periode)) {
                // Étape mémorisée dès l'envoi réussi ; elle est validée avec la transaction de la période, avant toute notification
                periode.setStatut(StatutPeriode.EN_RETARD_CRITIQUE);
                periode.setDateDernierRappel(dateReference);
                periodeRepository.saveAndFlush(periode);
                envoye = 3;

                differerResponsable(alertes, periode, "Urgent : évaluation de " + nomSalarie(periode),
                        "L'évaluation de " + nomSalarie(periode) + " doit être remplie avant le " + dateFr(periode) + ".");
                differerRH(alertes, salarie, "Alerte J-7 : " + salarie.getFirstName() + " " + salarie.getLastName(),
                        "L'évaluation arrive à échéance dans 7 jours. Action requise d'urgence.");
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
                periodeRepository.saveAndFlush(periode);
                envoye = 2;

                differerResponsable(alertes, periode, "Rappel : évaluation de " + nomSalarie(periode),
                        "L'évaluation de " + nomSalarie(periode) + " n'est pas encore complétée. Échéance : " + dateFr(periode) + ".");
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
                periodeRepository.saveAndFlush(periode);
                envoye = 1;

                differerResponsable(alertes, periode, "Évaluation à réaliser : " + nomSalarie(periode),
                        "L'évaluation de la période d'essai de " + nomSalarie(periode) + " est à réaliser avant le " + dateFr(periode) + ".");
            } else {
                log.error("[J-21] Envoi échoué pour {} : nouvelle tentative au prochain passage.", salarie.getMatricule());
            }
        }

        periodeRepository.save(periode);
        return envoye;
    }

    private TransactionTemplate transaction() {
        return new TransactionTemplate(transactionManager);
    }

    public static final int DELAI_APRES_ECHEANCE_JOURS = 0;

    private static final Set<StatutPeriode> STATUTS_CLOTURES = EnumSet.of(
            StatutPeriode.COMPLETEE, StatutPeriode.VALIDE, StatutPeriode.VALIDEE_RH, StatutPeriode.ROMPU,
            StatutPeriode.RUPTURE, StatutPeriode.RENOUVELE, StatutPeriode.TERMINE);

    /* Retard constaté sans attendre 09h00 : toutes les 5 minutes (et 20 s après chaque démarrage), tous les jours. */
    @Scheduled(initialDelay = 20_000, fixedDelay = 300_000)
    public void detecterRetardsPeriodiquement() {
        LocalDate aujourdhui = HeureMaroc.aujourdhui();
        log.info("[DÉTECTION RETARD] Début de la détection des retards ({}).", aujourdhui);
        try {
            int nouveaux = detecterRetards(aujourdhui, true);
            log.info("[DÉTECTION RETARD] Fin de la détection : {} dossier(s) nouvellement en retard.", nouveaux);
        } catch (RuntimeException e) {
            log.error("[DÉTECTION RETARD] Échec de la détection : {}", e.toString(), e);
        }
    }


    public int detecterRetards(LocalDate aujourdhui, boolean avecEmails) {
        int nouveaux = 0;
        List<Long> ids = periodeRepository.findByDateEcheanceBefore(aujourdhui).stream().map(PeriodeEvaluation::getId).toList();
        for (Long id : ids) {
            List<AlerteDifferee> alertes = new ArrayList<>();
            try {
                Boolean nouveau = transaction().execute(statut ->
                        periodeRepository.findById(id).map(p -> constaterRetard(p, aujourdhui, avecEmails, alertes)).orElse(false));
                publier(alertes);
                if (Boolean.TRUE.equals(nouveau)) nouveaux++;
            } catch (RuntimeException e) {
                log.error("[RETARD] Période {} non traitée, passage au dossier suivant : {}", id, e.toString(), e);
            }
        }
        return nouveaux;
    }

    /* Même constat, limité aux périodes d'un salarié (appelé dès sa création). */
    @Transactional
    public void detecterRetardsDuSalarie(Long salarieId, boolean avecEmails) {
        LocalDate aujourdhui = HeureMaroc.aujourdhui();
        List<AlerteDifferee> alertes = new ArrayList<>();
        for (PeriodeEvaluation periode : periodeRepository.findBySalarieId(salarieId)) {
            if (periode.getDateEcheance() != null && periode.getDateEcheance().isBefore(aujourdhui)) {
                constaterRetard(periode, aujourdhui, avecEmails, alertes);
            }
        }
        publier(alertes);
    }

    private boolean constaterRetard(PeriodeEvaluation periode, LocalDate aujourdhui, boolean avecEmails, List<AlerteDifferee> alertes) {
        Salarie salarie = periode.getSalarie();
        if (STATUTS_CLOTURES.contains(periode.getStatut()) || periode.getDecisionFinale() != null || !salarie.isActif()) {
            return false;
        }
        int retard = (int) ChronoUnit.DAYS.between(periode.getDateEcheance(), aujourdhui);
        // Jusqu'à 14 jours après l'échéance : « En relance », formulaire encore ouvert. Au-delà : « Décision RH », dossier bloqué.
        boolean decisionRequise = retard > DELAI_APRES_ECHEANCE_JOURS;
        // Premier constat : le compteur de retard est encore vide ou à 0 (valeur par défaut)
        boolean premiereDetection = periode.getJoursRetard() == null || periode.getJoursRetard() <= 0;
        boolean nouveauBlocage = decisionRequise && periode.getStatut() != StatutPeriode.EN_ATTENTE_DECISION_RH;
        // Dossier encore dans le délai mais bloqué par l'ancienne règle (blocage dès le lendemain de l'échéance) : on le rouvre
        boolean aDebloquer = !decisionRequise && periode.getStatut() == StatutPeriode.EN_ATTENTE_DECISION_RH;
        boolean joursChanges = !Integer.valueOf(retard).equals(periode.getJoursRetard());
        if (!premiereDetection && !nouveauBlocage && !aDebloquer && !joursChanges) return false;

        periode.setJoursRetard(retard);

        if (aDebloquer) {
            log.info("[RETARD] Dossier {} remis « En relance » (+{}j, dans le délai de {} jours).",
                    salarie.getMatricule(), retard, DELAI_APRES_ECHEANCE_JOURS);
            periode.setStatut(StatutPeriode.EN_RELANCE);
            if (salarie.isBloqueEmails()) {
                salarie.setBloqueEmails(false);
                salarieRepository.save(salarie);
            }
        }

        if (premiereDetection) {
            log.warn("[RETARD] Dossier {} : échéance dépassée de {} jour(s).", salarie.getMatricule(), retard);
            if (avecEmails) {
                // Alerte retard envoyée au Manager ET à l'Admin RH (CC), et notification dans l'espace du responsable concerné
                mailService.sendAlerteRetard(periode, retard);
                differerResponsable(alertes, periode, "Retard : évaluation de " + nomSalarie(periode),
                        decisionRequise
                                ? "Échéance dépassée de " + retard + " jour(s). Le dossier est transmis à la Direction RH pour décision."
                                : "Échéance dépassée de " + retard + " jour(s). Vous pouvez encore remplir l'évaluation pendant "
                                        + DELAI_APRES_ECHEANCE_JOURS + " jours après l'échéance.");
            }
            if (!decisionRequise) {
                differerRH(alertes, salarie, "RETARD : Dossier " + salarie.getMatricule(),
                        "Échéance dépassée de " + retard + " jour(s). Le responsable est relancé ; décision RH après "
                                + DELAI_APRES_ECHEANCE_JOURS + " jours de retard.");
            }
        }

        if (nouveauBlocage) {
            log.warn("[DÉCISION RH] Dossier {} bloqué (+{}j de retard).", salarie.getMatricule(), retard);
            periode.setStatut(StatutPeriode.EN_ATTENTE_DECISION_RH);
            salarie.setBloqueEmails(true);
            salarieRepository.save(salarie);
            if (avecEmails && !premiereDetection) {
                differerResponsable(alertes, periode, "Décision RH requise : " + nomSalarie(periode),
                        "Le délai est dépassé de " + retard + " jour(s) : le dossier est transmis à la Direction RH pour décision.");
            }
            differerRH(alertes, salarie, "DÉCISION RH requise : Dossier " + salarie.getMatricule(),
                    "Délai dépassé de " + retard + " jour(s). Le dossier est en attente de décision RH.");
        }
        periodeRepository.save(periode);
        return premiereDetection || nouveauBlocage;
    }

    public record ResultatRelance(boolean envoye, String destinataire, String message) {
    }

 
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
        long joursRestants = ChronoUnit.DAYS.between(HeureMaroc.aujourdhui(), periode.getDateEcheance());
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
            periode.setDateDernierRappel(HeureMaroc.aujourdhui());
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
        for (PeriodeEvaluation periode : periodeRepository.findByDateEcheanceBefore(HeureMaroc.aujourdhui())) {
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

    /* Notification à créer une fois l'étape de la période validée (responsableId nul = alerte pour la RH). */
    private record AlerteDifferee(String titre, String message, Long responsableId, Long salarieId) {
    }

    private static void differerResponsable(List<AlerteDifferee> alertes, PeriodeEvaluation periode, String titre, String message) {
        if (periode.getResponsable() == null) return;
        alertes.add(new AlerteDifferee(titre, message, periode.getResponsable().getId(), periode.getSalarie().getId()));
    }

    private static void differerRH(List<AlerteDifferee> alertes, Salarie salarie, String titre, String message) {
        alertes.add(new AlerteDifferee(titre, message, null, salarie.getId()));
    }

    private void publier(List<AlerteDifferee> alertes) {
        for (AlerteDifferee alerte : alertes) {
            try {
                transaction().executeWithoutResult(statut -> {
                    if (alerte.responsableId() == null) {
                        notificationService.creerAlerte(alerte.titre(), alerte.message(), CibleRole.ALL_RH, alerte.salarieId());
                    } else {
                        notificationService.creerAlerteResponsable(alerte.titre(), alerte.message(), alerte.responsableId(), alerte.salarieId());
                    }
                });
            } catch (RuntimeException e) {
                log.error("[NOTIFICATION] Création impossible (« {} ») : {}", alerte.titre(), e.toString(), e);
            }
        }
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
        return FETES_RELIGIEUSES_MAROC.contains(date) || FETES_RELIGIEUSES_ESTIMEES.contains(date);
    }

    /* Vrai si la date est un jour férié religieux seulement ESTIMÉ (non officiel). */
    public boolean estFeteEstimee(LocalDate date) {
        return FETES_RELIGIEUSES_ESTIMEES.contains(date);
    }

    @Data
    @Builder
    public static class RapportExecution {
        private LocalDate dateExecution;
        private String statut;
        /* Périodes éligibles examinées (ouvertes, salarié actif, échéance renseignée), avec ou sans e-mail envoyé ; hors périodes en erreur. */
        private int totalPeriodesTraitees;
        private int rappelsJ21Envoyes;
        private int rappelsJ14Envoyes;
        private int alertesJ7Envoyees;
        private int dossiersBloquesJ1;
        private String message;
    }
}
