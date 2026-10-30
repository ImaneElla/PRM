package com.premium.essai.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public final class MotDePasseRequests {

    private MotDePasseRequests() {
    }

    public record Oubli(
            @NotBlank(message = "L'email est obligatoire") @Email(message = "Format d'email invalide") String email
    ) {
    }

    public record Reinitialisation(
            @NotBlank(message = "Le lien de réinitialisation est incomplet") String token,
            @NotBlank(message = "Le nouveau mot de passe est obligatoire") String nouveauMotDePasse
    ) {
    }

    public record Changement(
            @NotBlank(message = "Le mot de passe actuel est obligatoire") String motDePasseActuel,
            @NotBlank(message = "Le nouveau mot de passe est obligatoire") String nouveauMotDePasse
    ) {
    }
}
