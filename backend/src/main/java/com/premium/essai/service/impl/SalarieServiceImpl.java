package com.premium.essai.service.impl;

import com.premium.essai.dto.SalarieRequestDTO;
import com.premium.essai.dto.SalarieResponseDTO;
import com.premium.essai.model.Direction;
import com.premium.essai.model.PeriodeEvaluation;
import com.premium.essai.model.Responsable;
import com.premium.essai.model.Salarie;
import com.premium.essai.model.enums.StatutEssai;
import com.premium.essai.model.enums.StatutPeriode;
import com.premium.essai.model.enums.PeriodeType;
import com.premium.essai.repository.DirectionRepository;
import com.premium.essai.repository.EvaluationDetailRepository;
import com.premium.essai.repository.PeriodeEvaluationRepository;
import com.premium.essai.repository.ResponsableRepository;
import com.premium.essai.repository.SalarieRepository;
import com.premium.essai.repository.HistoriqueEmailRepository;
import com.premium.essai.repository.NotificationRepository;
import com.premium.essai.service.SalarieService;
import com.premium.essai.service.NotificationEcheanceService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SalarieServiceImpl implements SalarieService {
    private static final List<String> SOCIETE_PREFIXES = List.of("GRP", "PRO", "SRM", "AFI", "CCI", "SCP");
    private static final Set<StatutPeriode> STATUTS_CLOTURES = EnumSet.of(
            StatutPeriode.COMPLETEE, StatutPeriode.VALIDE, StatutPeriode.ROMPU, StatutPeriode.RUPTURE, StatutPeriode.VALIDEE_RH);

    private final SalarieRepository salarieRepository;
    private final DirectionRepository directionRepository;
    private final ResponsableRepository responsableRepository;
    private final PeriodeEvaluationRepository periodeRepository;
    private final HistoriqueEmailRepository historiqueEmailRepository;
    private final EvaluationDetailRepository evaluationDetailRepository;
    private final NotificationRepository notificationRepository;

    private final NotificationEcheanceService notificationEcheanceService;
    @Override
    @Transactional
    public SalarieResponseDTO createSalarie(SalarieRequestDTO dto) {
        migrateLegacyMatricules();
        String societe = normalizeSociete(dto.getSociete());
        Direction direction = null;
        if (dto.getDirectionId() != null) {
            direction = directionRepository.findById(dto.getDirectionId()).orElse(null);
        }
        if (direction == null) {
            direction = directionRepository.findAll().stream().findFirst().orElseGet(() ->
                    directionRepository.save(Direction.builder().name("Direction Générale").code("DG").description("Direction Générale").build())
            );
        }

        final Direction dirAssociee = direction;
        Responsable responsable = null;
        if (dto.getResponsableId() != null) {
            responsable = responsableRepository.findById(dto.getResponsableId()).orElse(null);
        }
        if (responsable == null) {
            responsable = responsableRepository.findAll().stream().findFirst().orElseThrow(() ->
                    new IllegalStateException("Aucun responsable n'existe : créez d'abord un responsable avant d'ajouter des salariés."));
        }

        String matricule = dto.getMatricule() == null || dto.getMatricule().isBlank()
                ? generateMatricule(societe)
                : matriculeFourni(dto.getMatricule().trim().toUpperCase(), societe);
        LocalDate dateEmbauche = dto.getDateEmbauche();
        LocalDate dateFinPrevisionnelle = dateEmbauche.plusMonths(6);

        Salarie salarie = Salarie.builder()
                .matricule(matricule)
                .firstName(dto.getFirstName())
                .lastName(dto.getLastName())
                .nom(dto.getLastName())
                .prenom(dto.getFirstName())
                .email(dto.getEmail())
                .phone(dto.getPhone())
                .poste(dto.getPoste())
                .societe(societe)
                .dateEmbauche(dateEmbauche)
                .dateFinPrevisionnelle(dateFinPrevisionnelle)
                .direction(direction)
                .responsable(responsable)
                .statutEssai(StatutEssai.EN_COURS)
                .bloqueEmails(false)
                .actif(true)
                .build();

        Salarie savedSalarie = salarieRepository.save(salarie);

        PeriodeEvaluation p1 = PeriodeEvaluation.builder()
                .salarie(savedSalarie)
                .responsable(responsable)
                .typePeriode(PeriodeType.TROIS_MOIS)
                .numeroPeriode(1)
                .dateEcheance(dateEmbauche.plusMonths(3))
                .statut(StatutPeriode.PLANIFIEE)
                .tokenAccesSalarie(UUID.randomUUID().toString())
                .build();

        PeriodeEvaluation savedPeriode = periodeRepository.save(p1);


        // Un salarié embauché il y a longtemps (import d'historique) peut avoir une échéance déjà dépassée : retard constaté tout de suite,
        // sans e-mail au responsable (constat silencieux)
        notificationEcheanceService.detecterRetardsDuSalarie(savedSalarie.getId(), false);
        return mapToResponseDTO(savedSalarie, savedPeriode.getId());
    }

    @Override
    @Transactional
    public SalarieResponseDTO getSalarieById(Long id) {
        migrateLegacyMatricules();
        Salarie salarie = salarieRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Salarie non trouve ID: " + id));
        return mapToResponseDTO(salarie);
    }

    @Override
    @Transactional
    public SalarieResponseDTO updateSociete(Long id, String requestedSociete) {
        migrateLegacyMatricules();
        Salarie salarie = salarieRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Salarie non trouve ID: " + id));
        String societe = normalizeSociete(requestedSociete);

        if (!societe.equals(salarie.getSociete())) {
            salarie.setSociete(societe);
            salarie.setMatricule(generateMatricule(societe));
            salarie = salarieRepository.save(salarie);
        }
        return mapToResponseDTO(salarie);
    }

    @Override
    @Transactional
    public List<SalarieResponseDTO> getAllSalariesActifs() {
        migrateLegacyMatricules();
        return salarieRepository.findByActifTrue().stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public List<SalarieResponseDTO> getAllSalaries() {
        migrateLegacyMatricules();
        return salarieRepository.findAll().stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void cloturerDemission(Long salarieId, String motif) {
        Salarie salarie = salarieRepository.findById(salarieId)
                .orElseThrow(() -> new RuntimeException("Salarie non trouve ID: " + salarieId));
        salarie.setActif(false);
        salarie.setBloqueEmails(true);
        salarie.setStatutEssai(StatutEssai.RUPTURE);
        salarie.setDateFinPrevisionnelle(LocalDate.now());
        salarieRepository.save(salarie);
    }

    @Override
    @Transactional
    public SalarieResponseDTO restaurerSalarie(Long salarieId) {
        Salarie salarie = salarieRepository.findById(salarieId)
                .orElseThrow(() -> new RuntimeException("Salarie non trouve ID: " + salarieId));
        if (salarie.isActif()) {
            throw new IllegalStateException("Ce salarié n'est pas archivé.");
        }

        salarie.setActif(true);
        salarie.setBloqueEmails(false);
        salarie.setStatutEssai(StatutEssai.EN_COURS);

        // Dernière période du dossier : si elle avait été clôturée par la rupture, on la rouvre.
        // Le cron recalcule ensuite son statut selon l'échéance (une échéance dépassée repasse en attente de décision RH).
        periodeRepository.findBySalarieId(salarieId).stream()
                .max(Comparator.comparing(PeriodeEvaluation::getDateEcheance, Comparator.nullsFirst(Comparator.naturalOrder())))
                .ifPresent(derniere -> {
                    salarie.setDateFinPrevisionnelle(derniere.getDateEcheance());
                    if (STATUTS_CLOTURES.contains(derniere.getStatut())) {
                        derniere.setStatut(StatutPeriode.EN_COURS);
                        derniere.setDecisionFinale(null);
                        derniere.setDateValidationRh(null);
                        derniere.setDateValidationEvaluateur(null);
                        derniere.setMotifDecision(null);
                        periodeRepository.save(derniere);
                    }
                });

        return mapToResponseDTO(salarieRepository.save(salarie));
    }

    @Override
    @Transactional
    public void deleteSalarie(Long id) {
        Salarie salarie = salarieRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Salarie non trouve ID: " + id));

        // Suppression définitive : aucune donnée liée au salarié ne doit subsister
        // 1. Supprimer l'historique de ses e-mails
        historiqueEmailRepository.deleteAll(historiqueEmailRepository.findBySalarieId(id));

        // 2. Supprimer ses notifications (les anciennes alertes, sans targetId, sont retrouvées par leur titre)
        String nomComplet = salarie.getFirstName() + " " + salarie.getLastName();
        notificationRepository.deleteAll(notificationRepository.findByTargetId(id));
        notificationRepository.deleteAll(notificationRepository.findByTargetIdIsNullAndTitreIn(List.of(
                "Evaluation completee : " + nomComplet,
                "Alerte J-7 : " + nomComplet,
                "BLOCAGE J+1 : Dossier " + salarie.getMatricule()
        )));

        // 3. Supprimer les détails d'évaluations et les périodes associées (éviter la contrainte FK)
        var periodes = periodeRepository.findBySalarieId(id);
        for (var p : periodes) {
            evaluationDetailRepository.findByPeriodeEvaluationId(p.getId())
                    .ifPresent(evaluationDetailRepository::delete);
        }
        periodeRepository.deleteAll(periodes);

        // 4. Supprimer le salarié
        salarieRepository.delete(salarie);
    }

    private String normalizeSociete(String societe) {
        String normalized = societe == null || societe.isBlank() ? "GRP" : societe.trim().toUpperCase();
        if (!SOCIETE_PREFIXES.contains(normalized)) {
            throw new IllegalArgumentException(
                    "Société invalide. Valeurs acceptées : " + String.join(", ", SOCIETE_PREFIXES)
            );
        }
        return normalized;
    }

    // Matricule conservé tel quel (import) : il doit commencer par la société et ne pas déjà exister
    private String matriculeFourni(String matricule, String societe) {
        if (!matricule.startsWith(societe)) {
            throw new IllegalArgumentException("Le matricule " + matricule + " ne correspond pas à la société " + societe + ".");
        }
        if (salarieRepository.existsByMatricule(matricule)) {
            throw new IllegalStateException("Le matricule " + matricule + " est déjà utilisé.");
        }
        return matricule;
    }

    private String generateMatricule(String societe) {
        long lastNumber = salarieRepository
                .findTopByMatriculeStartingWithOrderByMatriculeDesc(societe)
                .map(Salarie::getMatricule)
                .filter(matricule -> matricule.matches("^" + societe + "\\d{6}$"))
                .map(matricule -> Long.parseLong(matricule.substring(societe.length())))
                .orElse(0L);
        if (lastNumber >= 999_999) {
            throw new IllegalStateException("La séquence de matricules est épuisée pour " + societe);
        }
        return String.format("%s%06d", societe, lastNumber + 1);
    }

    private void migrateLegacyMatricules() {
        List<Salarie> salaries = salarieRepository.findAll();
        Map<Salarie, String> societies = new HashMap<>();
        Map<String, Long> lastNumbers = new HashMap<>();

        for (Salarie salarie : salaries) {
            String societe = resolveExistingSociete(salarie);
            societies.put(salarie, societe);
            String matricule = salarie.getMatricule();
            if (matricule != null && matricule.matches("^" + societe + "\\d{6}$")) {
                long number = Long.parseLong(matricule.substring(societe.length()));
                lastNumbers.merge(societe, number, Math::max);
            }
        }

        boolean changed = false;
        for (Salarie salarie : salaries) {
            String societe = societies.get(salarie);
            String matricule = salarie.getMatricule();
            if (!societe.equals(salarie.getSociete())) {
                salarie.setSociete(societe);
                changed = true;
            }
            if (matricule == null || !matricule.matches("^" + societe + "\\d{6}$")) {
                long nextNumber = lastNumbers.getOrDefault(societe, 0L) + 1;
                if (nextNumber > 999_999) {
                    throw new IllegalStateException("La séquence de matricules est épuisée pour " + societe);
                }
                salarie.setMatricule(String.format("%s%06d", societe, nextNumber));
                lastNumbers.put(societe, nextNumber);
                changed = true;
            }
        }
        if (changed) {
            salarieRepository.saveAll(salaries);
        }
    }

    private String resolveExistingSociete(Salarie salarie) {
        String societe = salarie.getSociete();
        String normalizedSociete = societe == null ? null : societe.trim().toUpperCase();
        if (normalizedSociete != null && SOCIETE_PREFIXES.contains(normalizedSociete)) {
            return normalizedSociete;
        }
        String matricule = salarie.getMatricule();
        if (matricule != null) {
            for (String prefix : SOCIETE_PREFIXES) {
                if (matricule.matches("^" + prefix + "\\d{6}$")) return prefix;
            }
        }
        return "GRP";
    }

    private SalarieResponseDTO mapToResponseDTO(Salarie salarie) {
        return mapToResponseDTO(salarie, null);
    }

    private SalarieResponseDTO mapToResponseDTO(Salarie salarie, Long periodeInitialeId) {
        return SalarieResponseDTO.builder()
                .id(salarie.getId())
                .matricule(salarie.getMatricule())
                .firstName(salarie.getFirstName())
                .lastName(salarie.getLastName())
                .email(salarie.getEmail())
                .phone(salarie.getPhone())
                .poste(salarie.getPoste())
                .societe(salarie.getSociete())
                .dateEmbauche(salarie.getDateEmbauche())
                .dateFinPrevisionnelle(salarie.getDateFinPrevisionnelle())
                .periodeInitialeId(periodeInitialeId)
                .directionId(salarie.getDirection() != null ? salarie.getDirection().getId() : null)
                .directionName(salarie.getDirection() != null ? salarie.getDirection().getName() : null)
                .responsableId(salarie.getResponsable() != null ? salarie.getResponsable().getId() : null)
                .responsableNomComplet(salarie.getResponsable() != null ?
                        salarie.getResponsable().getFirstName() + " " + salarie.getResponsable().getLastName() : null)
                .statutEssai(salarie.getStatutEssai().name())
                .actif(salarie.isActif())
                .build();
    }
}