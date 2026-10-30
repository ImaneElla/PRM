package com.premium.essai.repository;

import com.premium.essai.model.CritereEvaluation;
import com.premium.essai.model.enums.CategorieCritere;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CritereEvaluationRepository extends JpaRepository<CritereEvaluation, String> {
    List<CritereEvaluation> findByCategorie(CategorieCritere categorie);
}