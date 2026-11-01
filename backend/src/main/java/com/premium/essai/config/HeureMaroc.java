package com.premium.essai.config;

import java.time.LocalDate;
import java.time.ZoneId;

/* Date du jour à Casablanca : base de tous les calculs d'échéance, quel que soit le fuseau du serveur. */
public final class HeureMaroc {

    public static final ZoneId FUSEAU = ZoneId.of("Africa/Casablanca");

    private HeureMaroc() {
    }

    public static LocalDate aujourdhui() {
        return LocalDate.now(FUSEAU);
    }
}
