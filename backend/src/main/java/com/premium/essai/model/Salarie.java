package com.premium.essai.model;

import com.premium.essai.model.enums.PeriodeType;
import com.premium.essai.model.enums.StatutEssai;
import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "salaries")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Salarie {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(nullable = false, unique = true)
    private String matricule;

    @NotBlank
    @Column(name = "first_name", nullable = false)
    private String firstName;

    @NotBlank
    @Column(name = "last_name", nullable = false)
    private String lastName;

    @Column(name = "nom")
    private String nom;

    @Column(name = "prenom")
    private String prenom;

    @PrePersist
    @PreUpdate
    public void syncNoms() {
        if (this.nom == null) this.nom = this.lastName;
        if (this.prenom == null) this.prenom = this.firstName;
        if (this.lastName == null) this.lastName = this.nom;
        if (this.firstName == null) this.firstName = this.prenom;
    }

    @NotBlank
    @Email
    @Column(nullable = false, unique = true)
    private String email;

    private String phone;

    private String poste;

    @Column(name = "societe", length = 3)
    private String societe;

    @Column(name = "date_integration")
    private LocalDate dateIntegration;

    @Column(name = "date_embauche")
    private LocalDate dateEmbauche;

    @Column(name = "duree_initiale_mois")
    private Integer dureeInitialeMois;

    @Column(name = "date_fin_previsionnelle")
    private LocalDate dateFinPrevisionnelle;

    @Enumerated(EnumType.STRING)
    @Column(name = "statut_essai", nullable = false)
    @Builder.Default
    private StatutEssai statutEssai = StatutEssai.EN_COURS;

    @Enumerated(EnumType.STRING)
    @Column(name = "periode_actuel")
    private PeriodeType periodeActuel;

    @Column(name = "bloque_emails")
    @Builder.Default
    private boolean bloqueEmails = false;

    @Column(nullable = false)
    @Builder.Default
    private boolean actif = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "direction_id", nullable = false)
    private Direction direction;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "responsable_id", nullable = false)
    private Responsable responsable;

    @OneToMany(mappedBy = "salarie", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<PeriodeEvaluation> periodesEvaluation = new ArrayList<>();
}