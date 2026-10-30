package com.premium.essai.dto;

import lombok.*;
import java.time.LocalDate;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SalarieResponseDTO {
    private Long id;
    private String matricule;
    private String firstName;
    private String lastName;
    private String email;
    private String phone;
    private String poste;
    private String societe;
    private LocalDate dateEmbauche;
    private LocalDate dateFinPrevisionnelle;
    private Long periodeInitialeId;
    private Long directionId;
    private String directionName;
    private Long responsableId;
    private String responsableNomComplet;
    private String statutEssai;
    private boolean actif;
}