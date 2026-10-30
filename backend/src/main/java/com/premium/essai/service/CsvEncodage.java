package com.premium.essai.service;

import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.nio.charset.Charset;

// Excel (version française) enregistre souvent les CSV en Windows-1252 : on essaie l'UTF-8 strict, sinon Windows-1252.
public final class CsvEncodage {

    private static final Charset WINDOWS_1252 = Charset.forName("windows-1252");

    private CsvEncodage() {
    }

    public static String decoder(byte[] octets) {
        try {
            return StandardCharsets.UTF_8.newDecoder()
                    .onMalformedInput(CodingErrorAction.REPORT)
                    .onUnmappableCharacter(CodingErrorAction.REPORT)
                    .decode(ByteBuffer.wrap(octets))
                    .toString();
        } catch (CharacterCodingException e) {
            return new String(octets, WINDOWS_1252);
        }
    }
}
