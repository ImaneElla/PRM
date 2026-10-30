package com.premium.essai.repository;

import com.premium.essai.model.PeriodeEvaluation;
import com.premium.essai.model.enums.StatutPeriode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface PeriodeEvaluationRepository extends JpaRepository<PeriodeEvaluation, Long> {

    List<PeriodeEvaluation> findBySalarieId(Long salarieId);
    List<PeriodeEvaluation> findByResponsableId(Long responsableId);
    boolean existsByResponsableId(Long responsableId);
    List<PeriodeEvaluation> findByStatut(StatutPeriode statut);
    long countByStatut(StatutPeriode statut);
    List<PeriodeEvaluation> findByDateEcheanceAndStatut(LocalDate dateEcheance, StatutPeriode statut);
    List<PeriodeEvaluation> findByStatutNot(StatutPeriode statut);
    Optional<PeriodeEvaluation> findByTokenAccesSalarie(String token);
    // Périodes dont l'échéance est strictement antérieure à la date (candidates au retard)
    List<PeriodeEvaluation> findByDateEcheanceBefore(LocalDate date);
}
