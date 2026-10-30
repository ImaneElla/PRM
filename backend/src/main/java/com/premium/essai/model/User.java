package com.premium.essai.model;

import com.premium.essai.model.enums.UserRole;
import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Email
    @Column(nullable = false, unique = true)
    private String email;

    @NotBlank
    @Column(nullable = false)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserRole role;

    @Column(name = "nom")
    private String nom;

    @Column(name = "prenom")
    private String prenom;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "responsable_id")
    private Responsable responsable;

    // Vrai tant que le compte utilise le mot de passe temporaire de l'invitation
    @Column(name = "must_change_password", nullable = false)
    @Builder.Default
    private boolean mustChangePassword = false;

    // Faux = compte désactivé par un admin : connexion et accès API refusés
    @Column(name = "enabled", nullable = false)
    @Builder.Default
    private boolean enabled = true;

    // Empreinte SHA-256 du jeton de réinitialisation (le jeton lui-même n'est jamais stocké)
    @Column(name = "reset_token_hash")
    private String resetTokenHash;

    @Column(name = "reset_token_expiry")
    private LocalDateTime resetTokenExpiry;

    // Responsable auquel l'accès aux données est limité ; null pour un Admin RH (aucune restriction).
    // Un compte responsable sans responsable lié reçoit -1 : il ne correspond à rien (refus par défaut).
    public Long idResponsableRestreint() {
        if (role != UserRole.RESPONSABLE) return null;
        return responsable != null ? responsable.getId() : Long.valueOf(-1L);
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return enabled;
    }
}