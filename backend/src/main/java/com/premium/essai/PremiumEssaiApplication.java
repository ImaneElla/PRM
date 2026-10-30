package com.premium.essai;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling 
public class PremiumEssaiApplication {

    public static void main(String[] args) {
        Dotenv dotenv = Dotenv.configure().ignoreIfMissing().load();
        dotenv.entries().forEach(entry -> System.setProperty(entry.getKey(), entry.getValue()));

        SpringApplication.run(PremiumEssaiApplication.class, args);
    }

    @Bean
    CommandLineRunner testConnexionPostgreSQL() {
        return args -> {
            System.out.println("==================================================");
            System.out.println("Test connexion PostgreSQL. IT IS WORKING ...");
            System.out.println("==================================================");
        };
    }
}