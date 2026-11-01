package com.premium.essai;

import com.premium.essai.model.HistoriqueEmail;
import com.premium.essai.repository.HistoriqueEmailRepository;
import com.premium.essai.service.HistoriqueEmailService;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.transaction.annotation.Transactional;


@TestConfiguration
public class HistoriqueEmailTestConfig {

    static class HistoriqueDansLaTransactionDuTest extends HistoriqueEmailService {
        HistoriqueDansLaTransactionDuTest(HistoriqueEmailRepository repository) {
            super(repository);
        }

        @Override
        @Transactional
        public void enregistrer(HistoriqueEmail historique) {
            super.enregistrer(historique);
        }
    }

    @Bean
    @Primary
    HistoriqueEmailService historiqueEmailDansLaTransactionDuTest(HistoriqueEmailRepository repository) {
        return new HistoriqueDansLaTransactionDuTest(repository);
    }
}
