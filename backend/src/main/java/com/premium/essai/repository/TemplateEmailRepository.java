package com.premium.essai.repository;

import com.premium.essai.model.TemplateEmail;
import com.premium.essai.model.enums.TypeEmail;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TemplateEmailRepository extends JpaRepository<TemplateEmail, String> {
    Optional<TemplateEmail> findByTypeEmail(TypeEmail typeEmail);
}