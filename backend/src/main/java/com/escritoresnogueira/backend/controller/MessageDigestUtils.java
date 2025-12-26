package com.escritoresnogueira.backend.controller;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

public class MessageDigestUtils {
    public static boolean constantTimeEquals(String a, String b) {
        if (a == null) a = "";
        if (b == null) b = "";
        byte[] ba = a.getBytes(StandardCharsets.UTF_8);
        byte[] bb = b.getBytes(StandardCharsets.UTF_8);
        if (ba.length != bb.length) {
            // still run a loop to avoid timing differences
            int result = 0;
            int len = Math.max(ba.length, bb.length);
            for (int i = 0; i < len; i++) {
                byte xa = i < ba.length ? ba[i] : 0;
                byte xb = i < bb.length ? bb[i] : 0;
                result |= xa ^ xb;
            }
            return false;
        }
        int res = 0;
        for (int i = 0; i < ba.length; i++) res |= ba[i] ^ bb[i];
        return res == 0;
    }
}
