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
public class AdminDTO {

    private Long id;
    private String email;
    private String nom;
    private String prenom;
    private String statut;
    private Boolean emailEnvoye;
    private String lienActivation;
    private String message;
}
