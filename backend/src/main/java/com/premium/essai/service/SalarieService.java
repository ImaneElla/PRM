package com.premium.essai.service;

import com.premium.essai.dto.SalarieRequestDTO;
import com.premium.essai.dto.SalarieResponseDTO;

import java.util.List;

public interface SalarieService {
    SalarieResponseDTO createSalarie(SalarieRequestDTO dto);
    List<SalarieResponseDTO> getAllSalariesActifs();
    List<SalarieResponseDTO> getAllSalaries();
    SalarieResponseDTO getSalarieById(Long id);
    SalarieResponseDTO updateSociete(Long id, String societe);
    void deleteSalarie(Long id);
    void cloturerDemission(Long salarieId, String motif);

    /* Réactive un dossier archivé (rupture ou démission) et rouvre sa dernière période si elle avait été clôturée. */
    SalarieResponseDTO restaurerSalarie(Long salarieId);
}
