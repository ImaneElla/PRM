package com.premium.essai.model;

import com.premium.essai.model.enums.RoleDestinataire;
import com.premium.essai.model.enums.TypeEmail;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(name = "historique_emails")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HistoriqueEmail {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "salarie_id")
    private Salarie salarie;

    @Column(name = "salarie_nom")
    private String salarieNom;

    private String destinataire;

    @Column(name = "destinataire_nom")
    private String destinataireNom;

    @Enumerated(EnumType.STRING)
    @Column(name = "role_destinataire")
    private RoleDestinataire roleDestinataire;

    private String objet;

    @Enumerated(EnumType.STRING)
    @Column(name = "type_email")
    private TypeEmail typeEmail;

    @Column(name = "date_envoi")
    private LocalDate dateEnvoi;

    @Column(name = "heure_envoi")
    private LocalTime heureEnvoi;

    private String statut;

    @Column(name = "batch_cron")
    private boolean batchCron;

    @Column(name = "contenu_corps", columnDefinition = "TEXT")
    private String contenuCorps;

    @Column(name = "lien_securise")
    private String lienSecurise;
}
