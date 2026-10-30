package com.premium.essai.model;

import com.premium.essai.model.enums.CategorieCritere;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Entity
@Table(name = "criteres_evaluation")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CritereEvaluation {

    @Id
    private String id; // e.g. "cp1", "ap1", "qse1"

    @NotBlank
    @Column(nullable = false)
    private String label;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CategorieCritere categorie;
}