package com.premium.essai.service;

import com.premium.essai.config.JwtUtils;
import com.premium.essai.dto.AuthResponse;
import com.premium.essai.dto.LoginRequest;
import com.premium.essai.model.User;
import com.premium.essai.repository.UserRepository;
import com.premium.essai.service.JetonUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthServiceImpl implements AuthService {

    private static final int DUREE_VALIDITE_JETON_MINUTES = 60;

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;
    private final AuthenticationManager authenticationManager;
    private final MailService mailService;

    @Override
    public AuthResponse login(LoginRequest request) {
        String email = normalizeEmail(request.getEmail());

        // Authenticate user credentials
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        email,
                        request.getPassword()
                )
        );

        // Find user by email
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new RuntimeException("User not found!"));

        return toAuthResponse(user);
    }

    @Override
    @Transactional
    public AuthResponse changerMotDePasse(User user, String motDePasseActuel, String nouveauMotDePasse) {
        User compte = userRepository.findById(user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Compte introuvable."));

        if (!passwordEncoder.matches(motDePasseActuel, compte.getPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Le mot de passe actuel est incorrect.");
        }
        if (passwordEncoder.matches(nouveauMotDePasse, compte.getPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Le nouveau mot de passe doit être différent de l'actuel.");
        }
        verifierRobustesse(nouveauMotDePasse);

        compte.setPassword(passwordEncoder.encode(nouveauMotDePasse));
        compte.setMustChangePassword(false);
        return toAuthResponse(userRepository.save(compte));
    }

    @Override
    @Transactional
    public void demanderReinitialisation(String email) {
        userRepository.findByEmailIgnoreCase(normalizeEmail(email)).filter(User::isEnabled).ifPresentOrElse(user -> {
            String jeton = JetonUtils.generer();
            user.setResetTokenHash(JetonUtils.empreinte(jeton));
            user.setResetTokenExpiry(LocalDateTime.now().plusMinutes(DUREE_VALIDITE_JETON_MINUTES));
            userRepository.save(user);
            if (!mailService.sendReinitialisationMotDePasse(user, jeton)) {
                log.error("Lien de réinitialisation non envoyé au compte {}", user.getId());
            }
        }, () -> log.info("Demande de réinitialisation pour une adresse sans compte."));
    }

    @Override
    @Transactional
    public void reinitialiserMotDePasse(String jeton, String nouveauMotDePasse) {
        User user = userRepository.findByResetTokenHash(JetonUtils.empreinte(jeton))
                .filter(User::isEnabled)
                .filter(u -> u.getResetTokenExpiry() != null && LocalDateTime.now().isBefore(u.getResetTokenExpiry()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Ce lien de réinitialisation est invalide ou a expiré. Faites une nouvelle demande."));
        verifierRobustesse(nouveauMotDePasse);

        user.setPassword(passwordEncoder.encode(nouveauMotDePasse));
        user.setMustChangePassword(false);
        // Lien à usage unique
        user.setResetTokenHash(null);
        user.setResetTokenExpiry(null);
        userRepository.save(user);
    }

    private AuthResponse toAuthResponse(User user) {
        return AuthResponse.builder()
                .token(jwtUtils.generateToken(user))
                .id(user.getId())
                .email(user.getEmail())
                .nom(user.getNom())
                .prenom(user.getPrenom())
                .role(user.getRole())
                .mustChangePassword(user.isMustChangePassword())
                .build();
    }

    private void verifierRobustesse(String motDePasse) {
        if (motDePasse == null || motDePasse.length() < 8
                || !motDePasse.matches(".*[A-Za-z].*") || !motDePasse.matches(".*\\d.*")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Le mot de passe doit contenir au moins 8 caractères, dont une lettre et un chiffre.");
        }
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
