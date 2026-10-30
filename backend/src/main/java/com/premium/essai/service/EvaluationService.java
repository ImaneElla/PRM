package com.premium.essai.service;

import com.premium.essai.dto.DecisionRHRequestDTO;
import com.premium.essai.dto.EvaluationDetailRequestDTO;
import com.premium.essai.dto.EvaluationDetailResponseDTO;

public interface EvaluationService {
    EvaluationDetailResponseDTO getEvaluationByToken(String token);
    EvaluationDetailResponseDTO soumettreEvaluation(Long periodeId, EvaluationDetailRequestDTO dto);
    EvaluationDetailResponseDTO getEvaluationByPeriodeId(Long periodeId);
    void validerDecisionRH(Long periodeId, DecisionRHRequestDTO dto);
    void priseDeDecisionDirecteRH(Long periodeId, DecisionRHRequestDTO dto);
}