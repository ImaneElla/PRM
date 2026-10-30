package com.premium.essai.repository;

import com.premium.essai.model.EvaluationDetail;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EvaluationDetailRepository extends JpaRepository<EvaluationDetail, Long> {
    Optional<EvaluationDetail> findByPeriodeEvaluationId(Long periodeId);

    default Optional<EvaluationDetail> findByPeriodeId(Long periodeId) {
        return findByPeriodeEvaluationId(periodeId);
    }
}