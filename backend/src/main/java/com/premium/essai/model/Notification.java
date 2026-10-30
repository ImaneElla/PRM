package com.premium.essai.model;

import com.premium.essai.model.enums.CibleRole;
import com.premium.essai.model.enums.NotificationPriority;
import com.premium.essai.model.enums.NotificationType;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "notifications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String titre;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String message;

    @Enumerated(EnumType.STRING)
    private NotificationType type;

    @Enumerated(EnumType.STRING)
    private NotificationPriority priorite;

    @Column(name = "date_creation")
    private LocalDateTime dateCreation;

    @Column(name = "est_lue")
    @Builder.Default
    private Boolean estLue = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "cible_role")
    private CibleRole cibleRole;

    @Column(name = "lien_ecran")
    private String lienEcran;

    @Column(name = "target_id")
    private Long targetId;
}
