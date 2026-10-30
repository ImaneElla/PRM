package com.premium.essai.repository;

import com.premium.essai.model.Responsable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ResponsableRepository extends JpaRepository<Responsable, Long> {
    Optional<Responsable> findByEmail(String email);
    List<Responsable> findByDirectionId(Long directionId);
    boolean existsByEmail(String email);
}