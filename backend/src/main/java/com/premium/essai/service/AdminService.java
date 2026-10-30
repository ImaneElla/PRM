package com.premium.essai.service;

import com.premium.essai.dto.AdminDTO;
import com.premium.essai.model.User;
import com.premium.essai.model.enums.UserRole;
import com.premium.essai.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

// Gestion des comptes Admin RH : invitation par lien à usage unique, désactivation, réactivation
@Service
@RequiredArgsConstructor
@Slf4j
public class AdminService {

    public static final int VALIDITE_INVITATION_HEURES = 48;
    private static final Pattern EMAIL = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final MailService mailService;

    @Value("${application.frontend-url:http://localhost:3000}")
    private String frontendUrl;

    @Transactional(readOnly = true)
    public List<AdminDTO> lister() {
        return userRepository.findByRole(UserRole.ADMIN_RH).stream()
                .sorted(Comparator.comparing(User::getEmail))
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public AdminDTO inviter(String prenom, String nom, String email) {
        if (estVide(prenom) || estVide(nom) || estVide(email)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Le nom, le prénom et l'email sont obligatoires.");
        }
        String emailNormalise = email.trim().toLowerCase(Locale.ROOT);
        if (!EMAIL.matcher(emailNormalise).matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Adresse e-mail invalide : " + email.trim());
        }
        if (userRepository.findByEmailIgnoreCase(emailNormalise).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Un compte existe déjà pour " + emailNormalise + ".");
        }

        // Mot de passe aléatoire que personne ne connaît : le compte ne devient utilisable qu'à l'activation
        User admin = User.builder()
                .email(emailNormalise)
                .prenom(prenom.trim())
                .nom(nom.trim())
                .password(passwordEncoder.encode(JetonUtils.generer()))
                .role(UserRole.ADMIN_RH)
                .mustChangePassword(true)
                .build();
        return envoyerInvitation(userRepository.save(admin), "Invitation envoyée.");
    }

    @Transactional
    public AdminDTO renvoyerInvitation(Long id) {
        User admin = trouver(id);
        if (!admin.isMustChangePassword()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cet administrateur a déjà activé son compte.");
        }
        return envoyerInvitation(admin, "Nouvelle invitation envoyée (l'ancien lien n'est plus valable).");
    }

    @Transactional
    public AdminDTO desactiver(Long id, User demandeur) {
        User admin = trouver(id);
        if (admin.getId().equals(demandeur.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Vous ne pouvez pas désactiver votre propre compte.");
        }
        if (admin.isEnabled() && !admin.isMustChangePassword() && adminsActifs() <= 1) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Impossible de désactiver le dernier administrateur actif.");
        }
        admin.setEnabled(false);
        // Un lien d'invitation encore en circulation ne doit plus servir
        admin.setResetTokenHash(null);
        admin.setResetTokenExpiry(null);
        log.info("Admin {} désactivé par {}", admin.getEmail(), demandeur.getEmail());
        return toDto(userRepository.save(admin));
    }

    @Transactional
    public AdminDTO reactiver(Long id, User demandeur) {
        User admin = trouver(id);
        admin.setEnabled(true);
        log.info("Admin {} réactivé par {}", admin.getEmail(), demandeur.getEmail());
        return toDto(userRepository.save(admin));
    }

    private AdminDTO envoyerInvitation(User admin, String messageSucces) {
        String jeton = JetonUtils.generer();
        admin.setResetTokenHash(JetonUtils.empreinte(jeton));
        admin.setResetTokenExpiry(LocalDateTime.now().plusHours(VALIDITE_INVITATION_HEURES));
        userRepository.save(admin);

        boolean envoye = mailService.sendInvitationAdmin(admin, jeton);
        if (!envoye) {
            log.warn("Invitation admin non envoyée par e-mail au compte {}", admin.getId());
        }
        AdminDTO dto = toDto(admin);
        dto.setEmailEnvoye(envoye);
        dto.setLienActivation(envoye ? null : frontendUrl + "/reinitialiser-mot-de-passe?token=" + jeton + "&invitation=1");
        dto.setMessage(envoye ? messageSucces
                : "Compte créé, mais l'e-mail n'a pas pu être envoyé : transmettez le lien d'activation à la personne.");
        return dto;
    }

    private long adminsActifs() {
        return userRepository.findByRole(UserRole.ADMIN_RH).stream()
                .filter(u -> u.isEnabled() && !u.isMustChangePassword())
                .count();
    }

    private User trouver(Long id) {
        return userRepository.findById(id)
                .filter(u -> u.getRole() == UserRole.ADMIN_RH)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Administrateur introuvable."));
    }

    private AdminDTO toDto(User admin) {
        String statut = !admin.isEnabled() ? "DESACTIVE" : admin.isMustChangePassword() ? "INVITE" : "ACTIF";
        return AdminDTO.builder()
                .id(admin.getId())
                .email(admin.getEmail())
                .nom(admin.getNom())
                .prenom(admin.getPrenom())
                .statut(statut)
                .build();
    }

    private static boolean estVide(String valeur) {
        return valeur == null || valeur.isBlank();
    }
}
