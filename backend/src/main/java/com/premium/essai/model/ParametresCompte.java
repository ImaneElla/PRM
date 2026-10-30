package com.premium.essai.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Entity
@Table(name = "parametres_compte")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ParametresCompte {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(name = "nom_expediteur", nullable = false)
    private String nomExpediteur;

    @NotBlank
    @Email
    @Column(name = "email_expediteur", nullable = false)
    private String emailExpediteur;
}