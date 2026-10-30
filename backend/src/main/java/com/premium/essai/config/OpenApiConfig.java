package com.premium.essai.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("AuditEssai RH - API Backend")
                        .version("1.0.0")
                        .description("Documentation interactive des APIs REST pour la gestion automatisée et conforme des périodes d'essai (Groupe Premium).")
                        .contact(new Contact()
                                .name("Pôle IT & Développement - Groupe Premium")
                                .email("dev@premium.africa")));
    }
}