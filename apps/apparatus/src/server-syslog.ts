import dgram from "dgram";
import { logger } from "./logger.js";
import { cfg } from "./config.js";

export function startSyslogServer() {
    const port = cfg.portSyslog; // 514 is privileged
    const server = dgram.createSocket("udp4");

    server.on("error", (err) => {
        logger.error({ err }, "Syslog server error");
        server.close();
    });

    server.on("message", (msg, rinfo) => {
        logger.info({ 
            from: `${rinfo.address}:${rinfo.port}`,
            msg: msg.toString()
        }, "Syslog message received");
    });

    server.on("listening", () => {
        const address = server.address();
        logger.info({ port: address.port, protocol: "udp" }, "Syslog Receiver listening");
    });

    server.bind(port);
}
