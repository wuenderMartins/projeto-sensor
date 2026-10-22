import net from "node:net";
import { TALHOES } from "../config/config";
import { generateSensorSample } from "./sensor-generator";
import { sendMessage, createLineReader, log, timestamp } from "../shared/tcp-utils";
import { parseJsonLine, isReadSensorsRequest } from "../shared/protocol";
import { TalhaoReadingResponse, ErrorResponse } from "../shared/types";

const talhaoId = process.argv[2] || process.env.TALHAO_ID || "G1-T01";
const talhaoConfig = TALHOES[talhaoId];

if (!talhaoConfig) {
  console.error(
    `[Talhao] Configuracao nao encontrada para o talhao "${talhaoId}". ` +
      `Opcoes disponiveis: ${Object.keys(TALHOES).join(", ")}`
  );
  process.exit(1);
}

// No diagrama, o talhao e o lado servidor (S) da conexao socket: ele so
// responde quando o Gateway (C) pede uma leitura.
const server = net.createServer((socket) => {
  const remote = `${socket.remoteAddress}:${socket.remotePort}`;

  createLineReader(socket, (line) => {
    let message: unknown;

    try {
      message = parseJsonLine(line);
    } catch {
      log(talhaoId, `Mensagem JSON invalida recebida de ${remote}: ${line}`);
      const errorResponse: ErrorResponse = {
        type: "ERROR",
        message: "JSON invalido",
      };
      sendMessage(socket, errorResponse);
      return;
    }

    if (!isReadSensorsRequest(message)) {
      log(talhaoId, `Tipo de requisicao desconhecido recebido de ${remote}`);
      const errorResponse: ErrorResponse = {
        type: "ERROR",
        message: "Tipo de requisicao desconhecido",
      };
      sendMessage(socket, errorResponse);
      return;
    }

    const requester = message.gateway ?? remote;
    log(talhaoId, `Solicitacao recebida de ${requester}`);

    const sample = generateSensorSample();
    const response: TalhaoReadingResponse = {
      type: "TALHAO_READING",
      talhao: talhaoId,
      timestamp: timestamp(),
      ...sample,
    };

    log(
      talhaoId,
      `T=${sample.temperature}°C U=${sample.humidity}% IS=${sample.solarRadiation} W/m²`
    );

    sendMessage(socket, response);
  });

  socket.on("error", (err) => {
    log(talhaoId, `Conexao com ${remote} encerrada com erro: ${err.message}`);
  });
});

server.on("error", (err) => {
  console.error(`[${talhaoId}] Erro no servidor TCP: ${err.message}`);
});

server.listen(talhaoConfig.port, talhaoConfig.host, () => {
  log(talhaoId, `Talhao iniciado na porta ${talhaoConfig.port}`);
});
