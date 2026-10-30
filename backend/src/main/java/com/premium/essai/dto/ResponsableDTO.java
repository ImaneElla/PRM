package com.premium.essai.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ResponsableDTO {
    private Long id;

    @NotBlank
    private String firstName;

    @NotBlank
    private String lastName;

    @NotBlank
    @Email
    private String email;

    private String phone;
    private String poste;
    private String societe;
    // Compte de connexion : AUCUN, INVITE (mot de passe temporaire) ou ACTIF (lecture seule)
    private String statutCompte;
}
