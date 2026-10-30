package com.premium.essai.config;

import com.premium.essai.model.User;
import com.premium.essai.model.enums.UserRole;
import com.premium.essai.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Locale;

// Crée le tout premier Admin RH à partir des variables d'environnement, uniquement si aucun n'existe.
// Les admins suivants sont invités par un admin existant (AdminController).
@Component
@Order(1)
@RequiredArgsConstructor
@Slf4j
public class AdminBootstrap implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${ADMIN_BOOTSTRAP_EMAIL:}")
    private String email;

    @Value("${ADMIN_BOOTSTRAP_PASSWORD:}")
    private String motDePasse;

    @Override
    public void run(String... args) {
        if (!userRepository.findByRole(UserRole.ADMIN_RH).isEmpty()) {
            return;
        }
        if (email.isBlank() || motDePasse.isBlank()) {
            log.warn("Aucun Admin RH n'existe. Définissez ADMIN_BOOTSTRAP_EMAIL et ADMIN_BOOTSTRAP_PASSWORD puis redémarrez.");
            return;
        }
        if (motDePasse.length() < 8 || !motDePasse.matches(".*[A-Za-z].*") || !motDePasse.matches(".*\\d.*")) {
            log.error("ADMIN_BOOTSTRAP_PASSWORD refusé : 8 caractères minimum, dont une lettre et un chiffre.");
            return;
        }
        String emailNormalise = email.trim().toLowerCase(Locale.ROOT);
        if (userRepository.findByEmailIgnoreCase(emailNormalise).isPresent()) {
            log.error("ADMIN_BOOTSTRAP_EMAIL {} correspond déjà à un compte qui n'est pas Admin RH : bootstrap ignoré.", emailNormalise);
            return;
        }
        userRepository.save(User.builder()
                .email(emailNormalise)
                .prenom("Admin")
                .nom("RH")
                .password(passwordEncoder.encode(motDePasse))
                .role(UserRole.ADMIN_RH)
                // Le mot de passe initial passe par l'environnement : il doit être changé dès la première connexion
                .mustChangePassword(true)
                .build());
        log.info("Premier Admin RH créé ({}). Changement de mot de passe exigé à la première connexion.", emailNormalise);
    }
}
