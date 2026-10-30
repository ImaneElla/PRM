package com.premium.essai.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@Order(0)
@RequiredArgsConstructor
@Slf4j
public class SchemaUpdater implements CommandLineRunner {

    private static final String[] INSTRUCTIONS = {
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS enabled BOOLEAN NOT NULL DEFAULT TRUE",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_hash VARCHAR(255)",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP",
            "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS destinataire_responsable_id BIGINT",
    };

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) {
        for (String instruction : INSTRUCTIONS) {
            jdbcTemplate.execute(instruction);
        }
        log.info("Schéma vérifié : colonnes de gestion des mots de passe présentes.");
    }
}
