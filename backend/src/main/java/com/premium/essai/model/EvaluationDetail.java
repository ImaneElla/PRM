package com.premium.essai.model;

import com.premium.essai.model.enums.RecommandationDecision;
import com.premium.essai.model.enums.RecommandationEvaluateur;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name = "evaluation_details")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EvaluationDetail {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "periode_id", nullable = false, unique = true)
    private PeriodeEvaluation periodeEvaluation;

    @Column(name = "competences_techniques", columnDefinition = "TEXT")
    private String competencesTechniques;

    @Column(name = "integration_equipe", columnDefinition = "TEXT")
    private String integrationEquipe;

    @Column(name = "autonomie_rigueur", columnDefinition = "TEXT")
    private String autonomieRigueur;

    @Column(name = "atteinte_objectifs", columnDefinition = "TEXT")
    private String atteinteObjectifs;

    @Column(name = "points_forts", columnDefinition = "TEXT")
    private String pointsForts;

    @Column(name = "axes_amelioration", columnDefinition = "TEXT")
    private String axesAmelioration;

    @Column(name = "avis_responsable", columnDefinition = "TEXT")
    private String avisResponsable;

    @Column(name = "avis_salarie", columnDefinition = "TEXT")
    private String avisSalarie;

    @Enumerated(EnumType.STRING)
    private RecommandationDecision recommandation;

    @Column(name = "date_evaluation")
    private LocalDate dateEvaluation;

    @Column(name = "signature_responsable")
    private Boolean signatureResponsable;

    @Column(name = "signature_salarie")
    private Boolean signatureSalarie;

    @Column(name = "donnees_formulaire_complet", columnDefinition = "TEXT")
    private String donneesFormulaireComplet;

    @Column(name = "note_competences_pro")
    private Double noteCompetencesPro;

    @Column(name = "note_aptitudes_perso")
    private Double noteAptitudesPerso;

    @Column(name = "note_qse")
    private Double noteQSE;

    @Column(name = "note_globale")
    private Double noteGlobale;

    @Column(name = "commentaires_evaluateur", columnDefinition = "TEXT")
    private String commentairesEvaluateur;

    @Enumerated(EnumType.STRING)
    @Column(name = "recommandation_evaluateur")
    private RecommandationEvaluateur recommandationEvaluateur;

    @Column(name = "date_soumission")
    private LocalDate dateSoumission;

    @Column(name = "json_reponses_criteres", columnDefinition = "TEXT")
    private String jsonReponsesCriteres;

    public PeriodeEvaluation getPeriode() {
        return this.periodeEvaluation;
    }

    public void setPeriode(PeriodeEvaluation periode) {
        this.periodeEvaluation = periode;
    }

    public static class EvaluationDetailBuilder {
        public EvaluationDetailBuilder periode(PeriodeEvaluation periode) {
            this.periodeEvaluation = periode;
            return this;
        }
    }
}