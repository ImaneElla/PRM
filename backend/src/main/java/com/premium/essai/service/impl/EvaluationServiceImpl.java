package com.premium.essai.service.impl;

import com.premium.essai.dto.DecisionRHRequestDTO;
import com.premium.essai.dto.EvaluationDetailRequestDTO;
import com.premium.essai.dto.EvaluationDetailResponseDTO;
import com.premium.essai.model.EvaluationDetail;
import com.premium.essai.model.PeriodeEvaluation;
import com.premium.essai.model.Salarie;
import com.premium.essai.model.enums.CibleRole;
import com.premium.essai.model.enums.DecisionPeriode;
import com.premium.essai.model.enums.RecommandationEvaluateur;
import com.premium.essai.model.enums.StatutEssai;
import com.premium.essai.model.enums.StatutPeriode;
import com.premium.essai.exception.EvaluationVerrouilleeException;
import com.premium.essai.model.enums.PeriodeType;
import com.premium.essai.repository.EvaluationDetailRepository;
import com.premium.essai.repository.PeriodeEvaluationRepository;
import com.premium.essai.repository.SalarieRepository;
import com.premium.essai.service.EvaluationService;
import com.premium.essai.service.MailService;
import com.premium.essai.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class EvaluationServiceImpl implements EvaluationService {

    private final PeriodeEvaluationRepository periodeRepository;
    private final EvaluationDetailRepository evaluationDetailRepository;
    private final SalarieRepository salarieRepository;
    private final MailService mailService;
    private final NotificationService notificationService;

    @Override
    @Transactional(readOnly = true)
    public EvaluationDetailResponseDTO getEvaluationByToken(String token) {
        PeriodeEvaluation periode = periodeRepository.findByTokenAccesSalarie(token)
                .orElseThrow(() -> new RuntimeException("Lien d'evaluation invalide ou expire."));

        boolean estDepasse = periode.getDateEcheance() != null && LocalDate.now().isAfter(periode.getDateEcheance().plusDays(com.premium.essai.service.NotificationEcheanceService.DELAI_APRES_ECHEANCE_JOURS));
        boolean estEnAttenteRH = periode.getStatut() == StatutPeriode.EN_ATTENTE_DECISION_RH;

        if ((estDepasse || estEnAttenteRH) && periode.getStatut() != StatutPeriode.COMPLETEE) {
            log.warn("Tentative d'accès à une évaluation verrouillée par le manager pour le salarié {}", periode.getSalarie().getMatricule());
            throw new EvaluationVerrouilleeException(
                    "ACCÈS VERROUILLÉ : La date limite d'évaluation (" + periode.getDateEcheance() + ") est dépassée. " +
                    "Ce dossier est désormais sous le contrôle exclusif de la Direction RH. " +
                    "Veuillez contacter le pôle RH."
            );
        }

        EvaluationDetail detail = evaluationDetailRepository.findByPeriodeEvaluationId(periode.getId()).orElse(null);
        return detail != null ? mapToResponseDTO(detail) : null;
    }

    @Override
    @Transactional
    public EvaluationDetailResponseDTO soumettreEvaluation(Long periodeId, EvaluationDetailRequestDTO dto) {
        PeriodeEvaluation periode = periodeRepository.findById(periodeId)
                .orElseThrow(() -> new RuntimeException("Periode d'evaluation non trouvee ID: " + periodeId));

        Salarie salarie = periode.getSalarie();

        if (salarie.isBloqueEmails() || !salarie.isActif()) {
            throw new IllegalStateException("Impossible d'evaluer un salarie inactif ou en rupture.");
        }

        // Une fois la décision RH enregistrée, l'évaluation est figée : le lien ne permet plus de la modifier
        if (periode.getDecisionFinale() != null || periode.getStatut() == StatutPeriode.VALIDEE_RH) {
            throw new IllegalStateException("Une décision RH a déjà été enregistrée pour cette période : l'évaluation ne peut plus être modifiée.");
        }

        boolean estDepasse = periode.getDateEcheance() != null && LocalDate.now().isAfter(periode.getDateEcheance().plusDays(com.premium.essai.service.NotificationEcheanceService.DELAI_APRES_ECHEANCE_JOURS));
        boolean estEnAttenteRH = periode.getStatut() == StatutPeriode.EN_ATTENTE_DECISION_RH;

        if (estDepasse || estEnAttenteRH) {
            log.warn("Tentative de soumission d'une évaluation verrouillée pour le salarié {}", salarie.getMatricule());
            throw new EvaluationVerrouilleeException(
                    "SOUMISSION IMPOSSIBLE : Le délai d'évaluation est dépassé. Ce dossier est placé sous le contrôle exclusif de la Direction RH."
            );
        }

        double noteGlobale = (dto.getNoteCompetencesPro() + dto.getNoteAptitudesPerso() + dto.getNoteQSE()) / 3.0;

        var existingDetailOpt = evaluationDetailRepository.findByPeriodeEvaluationId(periodeId);
        EvaluationDetail detail;
        if (existingDetailOpt.isPresent()) {
            detail = existingDetailOpt.get();
            detail.setNoteCompetencesPro(dto.getNoteCompetencesPro());
            detail.setNoteAptitudesPerso(dto.getNoteAptitudesPerso());
            detail.setNoteQSE(dto.getNoteQSE());
            detail.setNoteGlobale(noteGlobale);
            detail.setPointsForts(dto.getPointsForts());
            detail.setAxesAmelioration(dto.getAxesAmelioration());
            detail.setCommentairesEvaluateur(dto.getCommentairesEvaluateur());
            detail.setRecommandationEvaluateur(dto.getRecommandationEvaluateur());
            detail.setJsonReponsesCriteres(dto.getJsonReponsesCriteres());
            detail.setDateSoumission(LocalDate.now());
        } else {
            detail = EvaluationDetail.builder()
                    .periodeEvaluation(periode)
                    .noteCompetencesPro(dto.getNoteCompetencesPro())
                    .noteAptitudesPerso(dto.getNoteAptitudesPerso())
                    .noteQSE(dto.getNoteQSE())
                    .noteGlobale(noteGlobale)
                    .pointsForts(dto.getPointsForts())
                    .axesAmelioration(dto.getAxesAmelioration())
                    .commentairesEvaluateur(dto.getCommentairesEvaluateur())
                    .recommandationEvaluateur(dto.getRecommandationEvaluateur())
                    .jsonReponsesCriteres(dto.getJsonReponsesCriteres())
                    .dateSoumission(LocalDate.now())
                    .build();
        }

        EvaluationDetail savedDetail = evaluationDetailRepository.save(detail);

        periode.setNoteGlobale(noteGlobale);
        periode.setDateValidationEvaluateur(LocalDate.now());
        periode.setStatut(StatutPeriode.COMPLETEE);
        periodeRepository.save(periode);

        RecommandationEvaluateur recommandation = dto.getRecommandationEvaluateur();

        PeriodeEvaluation periodeSuivante = null;
        if (recommandation == RecommandationEvaluateur.CONFIRMATION_CDI || recommandation == RecommandationEvaluateur.PROLONGATION_ESSAI) {
            if (periode.getTypePeriode() == PeriodeType.TROIS_MOIS) {
                periodeSuivante = creerPeriodeSuivante(salarie);
            } else {
                salarie.setStatutEssai(StatutEssai.VALIDE);
                salarie.setDateFinPrevisionnelle(LocalDate.now());
                salarieRepository.save(salarie);
            }
        } else if (recommandation == RecommandationEvaluateur.RUPTURE_CONTRAT) {
            salarie.setStatutEssai(StatutEssai.RUPTURE);
            salarie.setDateFinPrevisionnelle(LocalDate.now());
            salarie.setActif(false);
            salarie.setBloqueEmails(true);
            salarieRepository.save(salarie);
            log.warn("Arret du contrat pour {}. Emails bloques.", salarie.getMatricule());
        }

        String nomSalarie = salarie.getFirstName() + " " + salarie.getLastName();
        String nomManager = periode.getResponsable().getFirstName() + " " + periode.getResponsable().getLastName();

        notificationService.creerAlerte(
                "Evaluation completee : " + nomSalarie,
                "Le responsable " + nomManager + " a rempli l'evaluation. Décision : " + libelleRecommandation(recommandation),
                CibleRole.ALL_RH,
                salarie.getId()
        );

        // Responsable concerné : notification dans son espace + confirmation par e-mail ; tous les admins : e-mail
        notificationService.creerAlerteResponsable(
                "Évaluation enregistrée : " + nomSalarie,
                "Votre évaluation a bien été transmise à la Direction RH. Recommandation : " + recommandation.name() + ".",
                periode.getResponsable().getId(),
                salarie.getId()
        );
        mailService.sendConfirmationSoumissionAuResponsable(periode);
        mailService.sendNotificationFormulaireRempliAuxAdmins(periode, recommandation);

        return mapToResponseDTO(savedDetail, periodeSuivante);
    }

    @Override
    @Transactional(readOnly = true)
    public EvaluationDetailResponseDTO getEvaluationByPeriodeId(Long periodeId) {
        EvaluationDetail detail = evaluationDetailRepository.findByPeriodeEvaluationId(periodeId)
                .orElseThrow(() -> new RuntimeException("Detail d'evaluation introuvable pour la periode ID: " + periodeId));
        return mapToResponseDTO(detail);
    }

    @Override
    @Transactional
    public void validerDecisionRH(Long periodeId, DecisionRHRequestDTO dto) {
        // Optionnel pour regularisation RH
    }

    @Override
    @Transactional
    public void priseDeDecisionDirecteRH(Long periodeId, DecisionRHRequestDTO dto) {
        PeriodeEvaluation periode = periodeRepository.findById(periodeId)
                .orElseThrow(() -> new RuntimeException("Periode d'evaluation non trouvee ID: " + periodeId));

        Salarie salarie = periode.getSalarie();
        StatutEssai statutActuel = salarie.getStatutEssai();
        if (statutActuel == StatutEssai.RUPTURE || statutActuel == StatutEssai.VALIDE || statutActuel == StatutEssai.Titulaire) {
            throw new IllegalStateException("Le dossier de ce salarié est déjà clôturé (titularisation ou arrêt de contrat).");
        }
        if (periode.getDecisionFinale() != null) {
            throw new IllegalStateException("Une décision a déjà été enregistrée pour cette période.");
        }

        LocalDate aujourdhui = LocalDate.now();
        if (periode.getNoteGlobale() == null) periode.setNoteGlobale(3.0);
        if (periode.getDateValidationEvaluateur() == null) periode.setDateValidationEvaluateur(aujourdhui);
        periode.setDateValidationRh(aujourdhui);
        periode.setMotifDecision(dto.getCommentaireRH());
        periode.setStatut(StatutPeriode.COMPLETEE);

        switch (dto.getDecisionFinale()) {
            case RUPTURE -> {
                periode.setDecisionFinale(DecisionPeriode.RUPTURE);
                salarie.setStatutEssai(StatutEssai.RUPTURE);
                salarie.setDateFinPrevisionnelle(aujourdhui);
                salarie.setActif(false);
                salarie.setBloqueEmails(true);
            }
            case VALIDATION -> {
                periode.setDecisionFinale(DecisionPeriode.TITULARISATION);
                salarie.setStatutEssai(StatutEssai.VALIDE);
                salarie.setDateFinPrevisionnelle(aujourdhui);
            }
            case RENOUVELLEMENT -> {
                periode.setDecisionFinale(DecisionPeriode.RENOUVELLEMENT);
                if (periode.getTypePeriode() == PeriodeType.TROIS_MOIS) {
                    creerPeriodeSuivante(salarie);
                }
            }
        }

        salarieRepository.save(salarie);
        periodeRepository.save(periode);
        log.info("Décision RH {} enregistrée pour {}", dto.getDecisionFinale(), salarie.getMatricule());

        // Le responsable concerné est prévenu de la décision prise par la RH
        String decision = switch (dto.getDecisionFinale()) {
            case RUPTURE -> "arrêt du contrat";
            case VALIDATION -> "titularisation";
            case RENOUVELLEMENT -> "renouvellement de la période d'essai";
        };
        notificationService.creerAlerteResponsable(
                "Décision RH : " + salarie.getFirstName() + " " + salarie.getLastName(),
                "La Direction RH a enregistré la décision suivante : " + decision + ".",
                periode.getResponsable() != null ? periode.getResponsable().getId() : null,
                salarie.getId()
        );
    }

    private PeriodeEvaluation creerPeriodeSuivante(Salarie salarie) {
        return periodeRepository.findBySalarieId(salarie.getId()).stream()
                .filter(p -> p.getTypePeriode() == PeriodeType.SIX_MOIS)
                .findFirst()
                .orElseGet(() -> {
                    PeriodeEvaluation periodeSuivante = periodeRepository.save(PeriodeEvaluation.builder()
                            .salarie(salarie)
                            .responsable(salarie.getResponsable())
                            .typePeriode(PeriodeType.SIX_MOIS)
                            .numeroPeriode(2)
                            .dateEcheance(salarie.getDateEmbauche().plusMonths(6))
                            .statut(StatutPeriode.PLANIFIEE)
                            .tokenAccesSalarie(UUID.randomUUID().toString())
                            .build());
                    log.info("Periode 2 (6 mois) generee automatiquement pour {}", salarie.getMatricule());
                    return periodeSuivante;
                });
    }

    private EvaluationDetailResponseDTO mapToResponseDTO(EvaluationDetail detail) {
        return mapToResponseDTO(detail, null);
    }

    private EvaluationDetailResponseDTO mapToResponseDTO(EvaluationDetail detail, PeriodeEvaluation periodeSuivante) {
        return EvaluationDetailResponseDTO.builder()
                .id(detail.getId())
                .periodeId(detail.getPeriodeEvaluation().getId())
                .periodeSuivanteId(periodeSuivante != null ? periodeSuivante.getId() : null)
                .dateEcheancePeriodeSuivante(periodeSuivante != null ? periodeSuivante.getDateEcheance() : null)
                .noteCompetencesPro(detail.getNoteCompetencesPro())
                .noteAptitudesPerso(detail.getNoteAptitudesPerso())
                .noteQSE(detail.getNoteQSE())
                .noteGlobale(detail.getNoteGlobale())
                .pointsForts(detail.getPointsForts())
                .axesAmelioration(detail.getAxesAmelioration())
                .commentairesEvaluateur(detail.getCommentairesEvaluateur())
                .recommandationEvaluateur(detail.getRecommandationEvaluateur().name())
                .dateSoumission(detail.getDateSoumission())
                .jsonReponsesCriteres(detail.getJsonReponsesCriteres())
                .build();
    }

    // Texte lisible d'une recommandation (affiché dans les notifications)
    private static String libelleRecommandation(RecommandationEvaluateur recommandation) {
        return switch (recommandation) {
            case CONFIRMATION_CDI -> "Confirmation CDI";
            case PROLONGATION_ESSAI -> "Prolongation essai";
            case RUPTURE_CONTRAT -> "Rupture contrat";
        };
    }
}
