import Aedes from "aedes";
import { createServer } from "net";
import { logger } from "./logger.js";
import { cfg } from "./config.js";

export function startMqttServer() {
    const aedes = new Aedes();
    const server = createServer(aedes.handle);
    const port = cfg.portMqtt;

    server.listen(port, cfg.host, () => {
        logger.info({ port }, "MQTT Broker listening");
    });

    aedes.on("client", (client) => {
        logger.info({ clientId: client.id }, "MQTT Client connected");
    });

    aedes.on("clientDisconnect", (client) => {
        logger.info({ clientId: client.id }, "MQTT Client disconnected");
    });

    aedes.on("publish", (packet, client) => {
        if (client) {
            logger.info({ 
                topic: packet.topic, 
                payload: packet.payload.toString(), 
                clientId: client.id 
            }, "MQTT Message published");
        }
    });

    return server;
}
