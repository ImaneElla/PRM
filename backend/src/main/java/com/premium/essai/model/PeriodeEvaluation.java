package com.premium.essai.model;

import com.premium.essai.model.enums.DecisionPeriode;
import com.premium.essai.model.enums.PeriodeType;
import com.premium.essai.model.enums.StatutPeriode;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(name = "periode_evaluations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PeriodeEvaluation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "salarie_id", nullable = false)
    private Salarie salarie;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "responsable_id", nullable = false)
    private Responsable responsable;

    @Column(name = "direction_name")
    private String directionName;

    @Enumerated(EnumType.STRING)
    @Column(name = "type_periode", nullable = false)
    private PeriodeType typePeriode;

    @Column(name = "numero_periode")
    private Integer numeroPeriode;

    @Column(name = "date_echeance")
    private LocalDate dateEcheance;

    @Column(name = "date_declenchement_email")
    private LocalDate dateDeclenchementEmail;

    @Column(name = "heure_declenchement")
    private LocalTime heureDeclenchement;

    @Column(name = "date_dernier_rappel")
    private LocalDate dateDernierRappel;

    @Column(name = "date_validation_evaluateur")
    private LocalDate dateValidationEvaluateur;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private StatutPeriode statut = StatutPeriode.PLANIFIEE;

    @Column(name = "jours_retard")
    @Builder.Default
    private Integer joursRetard = 0;

    @Column(name = "note_globale")
    private Double noteGlobale;

    @Enumerated(EnumType.STRING)
    @Column(name = "decision_finale")
    private DecisionPeriode decisionFinale;

    @Column(name = "motif_decision", columnDefinition = "TEXT")
    private String motifDecision;

    @Column(name = "date_validation_rh")
    private LocalDate dateValidationRh;

    @Column(name = "token_acces_salarie")
    private String tokenAccesSalarie;

    @Column(name = "emails_envoyes", columnDefinition = "TEXT")
    private String emailsEnvoyes;

    @Column(name = "etape_valide")
    private Boolean etapeValide;

    @Column(name = "etape_ev")
    private Boolean etapeEV;

    @Column(name = "etape_evaluation")
    private Boolean etapeEvaluation;

    @Column(name = "etape_sh")
    private Boolean etapeSH;

    @OneToOne(mappedBy = "periodeEvaluation", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private EvaluationDetail evaluationDetail;
}