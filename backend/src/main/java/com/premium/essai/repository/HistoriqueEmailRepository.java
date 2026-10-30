package com.premium.essai.repository;

import com.premium.essai.model.HistoriqueEmail;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface HistoriqueEmailRepository extends JpaRepository<HistoriqueEmail, Long> {
    List<HistoriqueEmail> findBySalarieId(Long salarieId);

    List<HistoriqueEmail> findByDestinataire(String destinataire);

    List<HistoriqueEmail> findByDestinataireAndDateEnvoi(String destinataire, LocalDate dateEnvoi);
}