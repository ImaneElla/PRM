package com.premium.essai.config;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.security.SecureRandom;
import java.util.Date;
import java.util.HexFormat;
import java.util.function.Function;

@Component
@Slf4j
public class JwtUtils {

    private static final int TAILLE_MIN_SECRET_OCTETS = 32;

    @Value("${application.security.jwt.secret-key:}")
    private String jwtSecret;

    @Value("${application.security.jwt.expiration-hours:12}")
    private long jwtExpirationHours;

    private Key signKey;

    @PostConstruct
    void initialiserCle() {
        if (jwtSecret == null || jwtSecret.isBlank()) {
            // Aucun secret fourni : on en tire un aléatoire (jamais un secret connu du code source).
            // Les sessions ne survivent pas à un redémarrage : définissez JWT_SECRET en production.
            byte[] aleatoire = new byte[64];
            new SecureRandom().nextBytes(aleatoire);
            jwtSecret = HexFormat.of().formatHex(aleatoire);
            log.warn("JWT_SECRET non défini : secret aléatoire généré pour cette exécution. Définissez JWT_SECRET en production.");
        }
        if (jwtSecret.getBytes(StandardCharsets.UTF_8).length < TAILLE_MIN_SECRET_OCTETS) {
            throw new IllegalStateException("JWT_SECRET trop court : " + TAILLE_MIN_SECRET_OCTETS + " caractères minimum.");
        }
        signKey = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
    }

    private Key getSignKey() {
        return signKey;
    }

    public String generateToken(UserDetails userDetails) {
        long maintenant = System.currentTimeMillis();
        return Jwts.builder()
                .setSubject(userDetails.getUsername())
                .setIssuedAt(new Date(maintenant))
                .setExpiration(new Date(maintenant + jwtExpirationHours * 3_600_000L))
                .signWith(getSignKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSignKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    public boolean validateToken(String token, UserDetails userDetails) {
        final String username = extractUsername(token);
        return (username.equals(userDetails.getUsername()) && !isTokenExpired(token));
    }

    private boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }
}
