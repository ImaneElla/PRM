package com.premium.essai.dto;

import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SalarieRequestDTO {
    @NotBlank
    private String firstName;

    @NotBlank
    private String lastName;

    @Email
    @NotBlank
    private String email;

    private String phone;
    
    @NotBlank
    private String poste;

    @NotNull
    private LocalDate dateEmbauche;

    @Pattern(regexp = "GRP|PRO|SRM|AFI|CCI|SCP", message = "Société invalide")
    private String societe;

    private Long directionId;

    private Long responsableId;

    // Facultatif : matricule déjà attribué (import d'un fichier existant). Sinon il est généré automatiquement.
    @Pattern(regexp = "^(GRP|PRO|SRM|AFI|CCI|SCP)\\d{6}$", message = "Matricule invalide")
    private String matricule;
}