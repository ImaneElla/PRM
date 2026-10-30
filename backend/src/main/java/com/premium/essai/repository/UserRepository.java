package com.premium.essai.repository;

import com.premium.essai.model.User;
import com.premium.essai.model.enums.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    Optional<User> findByEmailIgnoreCase(String email);
    boolean existsByEmail(String email);
    List<User> findByRole(UserRole role);
    Optional<User> findByResetTokenHash(String resetTokenHash);
}