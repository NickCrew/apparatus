import https from "https";
import express from "express";
import fs from "fs";
import * as jose from "jose";
import { logger } from "./logger.js";
import { echoHandler } from "./echoHandler.js";
import { cfg } from "./config.js";

// Generate a fresh, untrusted self-signed cert on startup
async function generateBadCert() {
    const { publicKey, privateKey } = await jose.generateKeyPair("RS256");
    const pkcs8Pem = await jose.exportPKCS8(privateKey);
    const spkiPem = await jose.exportSPKI(publicKey);
    
    // Note: real self-signed cert generation in Node usually requires 'forge' or 'openssl' CLI.
    // 'jose' creates keys but not X.509 certificates directly easily without other deps.
    // To keep deps low, we'll use a "fake" approach or rely on the existing certs 
    // but serve them on a different port where they are NOT expected (Wrong CN).
    // If the main cert is for "localhost", serving it here is fine, it's still "Bad" 
    // if the client expects a valid root CA. 
    // BUT to be "extra bad", let's just reuse the main certs. 
    // Most clients will fail anyway because it's self-signed.
    
    // For a "Wrong CN" test, we'd need a cert with CN=example.com.
    // Since we don't have 'node-forge', we will skip explicit generation and 
    // reuse the existing config certs but serve on a port meant for "bad" traffic.
    return { key: cfg.tlsKeyPath, cert: cfg.tlsCertPath };
}

// Actually, to make it distinct, let's just start another HTTPS server.
// The "Badness" usually comes from the client not trusting the CA.
export function startBadSslServer() {
    // If certs don't exist (e.g. running without make certs), this might fail.
    // We assume they exist as per main server.
    
    const app = express();
    app.get("*", echoHandler);

    try {
        const options = {
            key: fs.readFileSync(cfg.tlsKeyPath),
            cert: fs.readFileSync(cfg.tlsCertPath)
        };

        const port = cfg.portBadSsl;
        https.createServer(options, app).listen(port, cfg.host, () => {
            logger.info({ port }, "Bad SSL Server listening (Self-signed/Untrusted)");
        });
    } catch (e: any) {
        logger.warn({ err: e.message }, "Skipping Bad SSL Server (Certs missing?)");
    }
}
