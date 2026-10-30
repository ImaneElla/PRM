package com.premium.essai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PeriodeResponseDTO {
    private Long id;
    private Long salarieId;
    private String salarieNom;
    private String salarieEmail;
    private String salariePoste;
    private Long responsableId;
    private String responsableNom;
    private String responsableEmail;
    private String directionName;
    private String typePeriode;
    private Integer numeroPeriode;
    private LocalDate dateEcheance;
    private LocalDate dateDeclenchementEmail;
    private String heureDeclenchement;
    private LocalDate dateDernierRappel;
    private LocalDate dateValidationEvaluateur;
    private LocalDate dateValidationRH;
    private String statut;
    // Décision d'une période clôturée : RENOUVELEE, CONFIRMEE ou RUPTURE (null si la période est en cours)
    private String decision;
    private Integer joursRetard;
    private Double noteGlobale;
    private String motifDecision;
    private String tokenAccesSalarie;
    private String emailsEnvoyes;
    private Boolean etapeValide;
    private Boolean etapeEV;
    private Boolean etapeEvaluation;
    private Boolean etapeSH;
}
