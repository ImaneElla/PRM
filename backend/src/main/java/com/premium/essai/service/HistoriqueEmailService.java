package com.premium.essai.service;

import com.premium.essai.model.HistoriqueEmail;
import com.premium.essai.repository.HistoriqueEmailRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;


@Service
@RequiredArgsConstructor
public class HistoriqueEmailService {

    private final HistoriqueEmailRepository historiqueEmailRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void enregistrer(HistoriqueEmail historique) {
        historiqueEmailRepository.save(historique);
    }
}
