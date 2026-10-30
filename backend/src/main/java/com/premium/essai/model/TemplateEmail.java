package com.premium.essai.model;

import com.premium.essai.model.enums.TypeEmail;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "template_emails")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TemplateEmail {

    @Id
    private String id; // e.g. "email1", "email2", "email3"

    private String nom;

    private Integer delai;

    private String objet;

    @Column(columnDefinition = "TEXT")
    private String contenu;

    @Enumerated(EnumType.STRING)
    @Column(name = "type_email")
    private TypeEmail typeEmail;
}