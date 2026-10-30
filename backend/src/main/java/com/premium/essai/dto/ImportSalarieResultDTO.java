package com.premium.essai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ImportSalarieResultDTO {

    private String statut;
    private Integer ligne;
    private Long salarieId;
    private String matricule;
    private String email;
    private String nomComplet;
    private String message;
}
