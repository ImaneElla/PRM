package com.premium.essai.controller;

import com.premium.essai.dto.DashboardStatsResponseDTO;
import com.premium.essai.dto.HistoriqueEmailResponseDTO;
import com.premium.essai.model.HistoriqueEmail;
import com.premium.essai.model.enums.StatutPeriode;
import com.premium.essai.repository.HistoriqueEmailRepository;
import com.premium.essai.repository.PeriodeEvaluationRepository;
import com.premium.essai.repository.SalarieRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
@Tag(name = "4. Dashboard & KPIs RH", description = "APIs de pilotage et statistiques globales")
public class DashboardController {

    private final SalarieRepository salarieRepository;
    private final PeriodeEvaluationRepository periodeRepository;
    private final HistoriqueEmailRepository historiqueEmailRepository;

    @GetMapping("/stats")
    @Operation(summary = "Statistiques Dashboard RH")
    public ResponseEntity<DashboardStatsResponseDTO> getDashboardStats() {
        long totalSalariesActifs = salarieRepository.countByActifTrue();
        long totalEnCours = periodeRepository.countByStatut(StatutPeriode.EN_COURS);
        long totalEnRelance = periodeRepository.countByStatut(StatutPeriode.EN_RELANCE);
        long totalEnRetard = periodeRepository.countByStatut(StatutPeriode.EN_RETARD_CRITIQUE);
        long totalCompletees = periodeRepository.countByStatut(StatutPeriode.COMPLETEE);

        // Calcul exact des Titularisations & Ruptures
        long totalTitularises = salarieRepository.findAll().stream()
                .filter(s -> s.getStatutEssai() == com.premium.essai.model.enums.StatutEssai.VALIDE
                        || s.getStatutEssai() == com.premium.essai.model.enums.StatutEssai.Titulaire)
                .count();

        long totalRuptures = salarieRepository.findAll().stream()
                .filter(s -> s.getStatutEssai() == com.premium.essai.model.enums.StatutEssai.RUPTURE)
                .count();

        long totalFinalisees = totalTitularises + totalRuptures;
        double tauxTitularisation = totalFinalisees > 0 ? Math.round(((double) totalTitularises / totalFinalisees) * 100.0) : 0.0;
        double tauxRupture = totalFinalisees > 0 ? Math.round(((double) totalRuptures / totalFinalisees) * 100.0) : 0.0;

        Map<String, Long> repartition = salarieRepository.findByActifTrue().stream()
                .collect(Collectors.groupingBy(
                        s -> s.getSociete() == null || s.getSociete().isBlank() ? "GRP" : s.getSociete(),
                        Collectors.counting()
                ));

        List<HistoriqueEmailResponseDTO> derniersEmails = historiqueEmailRepository
                .findAll(PageRequest.of(0, 10, Sort.by(Sort.Direction.DESC, "dateEnvoi", "heureEnvoi")))
                .getContent().stream()
                .map(this::mapToHistoriqueDTO)
                .collect(Collectors.toList());

        // Evolution mensuelle calculée depuis la base de données
        int currentYear = java.time.LocalDate.now().getYear();
        String[] MOIS = new String[]{"Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"};
        List<com.premium.essai.model.Salarie> allSalaries = salarieRepository.findAll();

        List<Map<String, Object>> evolutionMensuelle = new java.util.ArrayList<>();
        for (int m = 1; m <= 12; m++) {
            final int monthIndex = m;
            long tituMois = allSalaries.stream().filter(s -> {
                boolean isTitu = s.getStatutEssai() == com.premium.essai.model.enums.StatutEssai.VALIDE
                        || s.getStatutEssai() == com.premium.essai.model.enums.StatutEssai.Titulaire;
                if (!isTitu) return false;
                java.time.LocalDate d = s.getDateFinPrevisionnelle() != null ? s.getDateFinPrevisionnelle() : s.getDateEmbauche();
                return d != null && d.getYear() == currentYear && d.getMonthValue() == monthIndex;
            }).count();

            long ruptMois = allSalaries.stream().filter(s -> {
                if (s.getStatutEssai() != com.premium.essai.model.enums.StatutEssai.RUPTURE) return false;
                java.time.LocalDate d = s.getDateFinPrevisionnelle() != null ? s.getDateFinPrevisionnelle() : s.getDateEmbauche();
                return d != null && d.getYear() == currentYear && d.getMonthValue() == monthIndex;
            }).count();

            Map<String, Object> mapMois = new java.util.HashMap<>();
            mapMois.put("mois", MOIS[m - 1]);
            mapMois.put("titularisation", tituMois);
            mapMois.put("ruptures", ruptMois);
            evolutionMensuelle.add(mapMois);
        }

        DashboardStatsResponseDTO stats = DashboardStatsResponseDTO.builder()
                .totalSalariesActifs(totalSalariesActifs)
                .totalEvaluationsEnCours(totalEnCours)
                .totalEvaluationsEnRelance(totalEnRelance)
                .totalEvaluationsEnRetardCritique(totalEnRetard)
                .totalEvaluationsCompletees(totalCompletees)
                .totalFinalisees(totalFinalisees)
                .totalTitularises(totalTitularises)
                .totalRuptures(totalRuptures)
                .tauxTitularisation(tauxTitularisation)
                .tauxRupture(tauxRupture)
                .repartitionParSociete(repartition)
                .derniersEmailsEnvoyes(derniersEmails)
                .evolutionMensuelle(evolutionMensuelle)
                .build();

        return ResponseEntity.ok(stats);
    }

    @GetMapping("/audit-emails")
    @Operation(summary = "Piste d'audit des e-mails envoyes")
    public ResponseEntity<List<HistoriqueEmailResponseDTO>> getHistoriqueEmails() {
        List<HistoriqueEmailResponseDTO> historique = historiqueEmailRepository
                .findAll(Sort.by(Sort.Direction.DESC, "dateEnvoi", "heureEnvoi")).stream()
                .map(this::mapToHistoriqueDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(historique);
    }

    private HistoriqueEmailResponseDTO mapToHistoriqueDTO(HistoriqueEmail histo) {
        return HistoriqueEmailResponseDTO.builder()
                .id(histo.getId())
                .salarieNom(histo.getSalarieNom())
                .destinataire(histo.getDestinataire())
                .destinataireNom(histo.getDestinataireNom())
                .roleDestinataire(histo.getRoleDestinataire() != null ? histo.getRoleDestinataire().name() : null)
                .objet(histo.getObjet())
                .typeEmail(histo.getTypeEmail() != null ? histo.getTypeEmail().name() : null)
                .dateEnvoi(histo.getDateEnvoi())
                .heureEnvoi(histo.getHeureEnvoi())
                .statut(histo.getStatut())
                .batchCron(histo.isBatchCron())
                .build();
    }
}