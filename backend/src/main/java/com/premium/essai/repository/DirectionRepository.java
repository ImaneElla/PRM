package com.premium.essai.repository;

import com.premium.essai.model.Direction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DirectionRepository extends JpaRepository<Direction, Long> {
    Optional<Direction> findByCode(String code);
    boolean existsByCode(String code);
    boolean existsByName(String name);
}