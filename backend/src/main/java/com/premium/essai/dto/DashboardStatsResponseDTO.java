package com.premium.essai.dto;

import lombok.*;
import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DashboardStatsResponseDTO {
    private long totalSalariesActifs;
    private long totalEvaluationsEnCours;
    private long totalEvaluationsEnRelance;
    private long totalEvaluationsEnRetardCritique;
    private long totalEvaluationsCompletees;

    // Nouveaux KPI globaux partagés en temps réel
    private long totalFinalisees;
    private long totalTitularises;
    private long totalRuptures;
    private double tauxTitularisation;
    private double tauxRupture;

    private Map<String, Long> repartitionParSociete;
    private List<HistoriqueEmailResponseDTO> derniersEmailsEnvoyes;
    private List<Map<String, Object>> evolutionMensuelle;
}
