import net from "node:net";
import { TalhaoConfig, CONNECT_TIMEOUT_MS, RESPONSE_TIMEOUT_MS } from "../config/config";
import { sendMessage, createLineReader } from "../shared/tcp-utils";
import { parseJsonLine, isValidTalhaoReading } from "../shared/protocol";
import { TalhaoReadingResponse, ErrorResponse } from "../shared/types";

/**
 * Abre uma conexao TCP curta com um talhao, envia uma requisicao
 * READ_SENSORS e resolve com a leitura recebida. A conexao e fechada
 * assim que a resposta chega (ou em caso de erro/timeout).
 */
export function readTalhao(
  gatewayId: string,
  talhao: TalhaoConfig
): Promise<TalhaoReadingResponse> {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let settled = false;

    const timeoutTimer = setTimeout(() => {
      finish(new Error(`Timeout aguardando resposta de ${talhao.id}`));
    }, RESPONSE_TIMEOUT_MS);

    function finish(err: Error | null, data?: TalhaoReadingResponse) {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutTimer);
      socket.destroy();
      if (err) reject(err);
      else resolve(data!);
    }

    socket.setTimeout(CONNECT_TIMEOUT_MS);

    socket.connect(talhao.port, talhao.host, () => {
      sendMessage(socket, { type: "READ_SENSORS", gateway: gatewayId });
    });

    createLineReader(socket, (line) => {
      let message: unknown;
      try {
        message = parseJsonLine<TalhaoReadingResponse | ErrorResponse>(line);
      } catch {
        finish(new Error(`Resposta JSON invalida do talhao ${talhao.id}`));
        return;
      }

      const parsed = message as { type?: string; message?: string };
      if (parsed.type === "ERROR") {
        finish(new Error(`Talhao ${talhao.id} retornou erro: ${parsed.message}`));
        return;
      }

      if (!isValidTalhaoReading(message)) {
        finish(new Error(`Leitura invalida recebida do talhao ${talhao.id}`));
        return;
      }

      finish(null, message);
    });

    socket.on("timeout", () => {
      finish(new Error(`Timeout de conexao com ${talhao.id} (${talhao.host}:${talhao.port})`));
    });

    socket.on("error", (err) => {
      finish(new Error(`Falha de conexao com ${talhao.id}: ${err.message}`));
    });

    socket.on("close", () => {
      if (!settled) {
        finish(new Error(`Conexao com ${talhao.id} encerrada inesperadamente`));
      }
    });
  });
}
