package com.premium.essai.repository;

import com.premium.essai.model.Salarie;
import com.premium.essai.model.enums.StatutEssai;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SalarieRepository extends JpaRepository<Salarie, Long> {
    Optional<Salarie> findByMatricule(String matricule);
    Optional<Salarie> findTopByMatriculeStartingWithOrderByMatriculeDesc(String prefix);
    Optional<Salarie> findByEmail(String email);
    List<Salarie> findByDirectionId(Long directionId);
    List<Salarie> findByResponsableId(Long responsableId);
    List<Salarie> findByStatutEssai(StatutEssai statutEssai);
    List<Salarie> findByActifTrue();
    long countByActifTrue();
    boolean existsByMatricule(String matricule);
    boolean existsByEmail(String email);
    boolean existsByResponsableId(Long responsableId);
}
