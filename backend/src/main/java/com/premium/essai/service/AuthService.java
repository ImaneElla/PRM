package com.premium.essai.service;

import com.premium.essai.dto.AuthResponse;
import com.premium.essai.dto.LoginRequest;
import com.premium.essai.model.User;

public interface AuthService {
    AuthResponse login(LoginRequest request);

    /** Remplace le mot de passe (temporaire ou non) de l'utilisateur connecté. */
    AuthResponse changerMotDePasse(User user, String motDePasseActuel, String nouveauMotDePasse);

    /** Envoie un lien de réinitialisation si l'adresse correspond à un compte (sans jamais le révéler). */
    void demanderReinitialisation(String email);

    /** Définit un nouveau mot de passe à partir d'un jeton de réinitialisation valide. */
    void reinitialiserMotDePasse(String jeton, String nouveauMotDePasse);
}
