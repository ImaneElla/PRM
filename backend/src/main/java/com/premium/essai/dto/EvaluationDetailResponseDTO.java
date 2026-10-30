package com.premium.essai.dto;

import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EvaluationDetailResponseDTO {

    private Long id;
    private Long periodeId;
    private Long periodeSuivanteId;
    private LocalDate dateEcheancePeriodeSuivante;

    private Double noteCompetencesPro;
    private Double noteAptitudesPerso;
    private Double noteQSE;
    private Double noteGlobale;

    private String pointsForts;
    private String axesAmelioration;
    private String commentairesEvaluateur;
    private String recommandationEvaluateur;

    private LocalDate dateSoumission;

    private String jsonReponsesCriteres;
}