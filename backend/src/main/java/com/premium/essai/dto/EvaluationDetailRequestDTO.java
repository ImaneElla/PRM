package com.premium.essai.dto;

import com.premium.essai.model.enums.RecommandationEvaluateur;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EvaluationDetailRequestDTO {

    @NotNull(message = "La note des competences professionnelles est obligatoire")
    @Min(value = 1, message = "La note minimale est 1")
    @Max(value = 5, message = "La note maximale est 5")
    private Double noteCompetencesPro;

    @NotNull(message = "La note des aptitudes personnelles est obligatoire")
    @Min(value = 1, message = "La note minimale est 1")
    @Max(value = 5, message = "La note maximale est 5")
    private Double noteAptitudesPerso;

    @NotNull(message = "La note QSE est obligatoire")
    @Min(value = 1, message = "La note minimale est 1")
    @Max(value = 5, message = "La note maximale est 5")
    private Double noteQSE;

    private String pointsForts;
    private String axesAmelioration;
    private String commentairesEvaluateur;

    @NotNull(message = "La recommandation de l'evaluateur est obligatoire")
    private RecommandationEvaluateur recommandationEvaluateur;

    @NotBlank(message = "Le detail des reponses aux criteres (JSON) est obligatoire")
    private String jsonReponsesCriteres;
}
