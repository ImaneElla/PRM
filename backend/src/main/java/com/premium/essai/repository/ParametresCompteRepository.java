package com.premium.essai.repository;

import com.premium.essai.model.ParametresCompte;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ParametresCompteRepository extends JpaRepository<ParametresCompte, Long> {
    Optional<ParametresCompte> findFirstByOrderByIdAsc();

    default Optional<ParametresCompte> findGlobalSettings() {
        return findFirstByOrderByIdAsc();
    }
}