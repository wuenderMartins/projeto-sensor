import { GATEWAYS, TalhaoConfig, MAX_READ_ATTEMPTS, RETRY_DELAY_MS } from "../config/config";
import { readTalhao } from "./talhao-client";
import { calculateAverage } from "./average-client";
import { log, delay } from "../shared/tcp-utils";
import { Reading, ReadingBatch, TalhaoReadingResponse } from "../shared/types";

const gatewayId = process.argv[2] || process.env.GATEWAY_ID || "G1";
const gatewayConfig = GATEWAYS[gatewayId];

if (!gatewayConfig) {
  console.error(
    `[Gateway] Configuracao nao encontrada para o gateway "${gatewayId}". ` +
      `Opcoes disponiveis: ${Object.keys(GATEWAYS).join(", ")}`
  );
  process.exit(1);
}

/**
 * Consulta um talhao com algumas tentativas de reconexao antes de
 * desistir. Uma falha aqui nunca derruba o processo do Gateway: o
 * talhao so fica fora do lote deste ciclo.
 */
async function readWithRetry(talhao: TalhaoConfig): Promise<TalhaoReadingResponse | null> {
  for (let attempt = 1; attempt <= MAX_READ_ATTEMPTS; attempt++) {
    if (attempt > 1) {
      log(gatewayId, `Tentativa ${attempt}/${MAX_READ_ATTEMPTS} de reconexao com ${talhao.id}...`);
    }

    try {
      const reading = await readTalhao(gatewayId, talhao);
      log(gatewayId, `Leitura recebida de ${talhao.id}`);
      return reading;
    } catch (err) {
      log(gatewayId, `Erro ao consultar ${talhao.id}: ${(err as Error).message}`);
      if (attempt < MAX_READ_ATTEMPTS) {
        await delay(RETRY_DELAY_MS);
      }
    }
  }

  log(gatewayId, `Talhao ${talhao.id} indisponivel apos ${MAX_READ_ATTEMPTS} tentativas`);
  return null;
}

/**
 * Um ciclo do Gateway: consulta os talhoes em paralelo via socket, monta
 * um lote com as leituras validas e pede a media ao microsservico de
 * calculo via gRPC.
 */
async function runCycle(): Promise<void> {
  log(gatewayId, `Consultando talhoes ${gatewayConfig.talhoes.map((t) => t.id).join(", ")}...`);

  const responses = await Promise.all(gatewayConfig.talhoes.map(readWithRetry));
  const readings: Reading[] = responses
    .filter((r): r is TalhaoReadingResponse => r !== null)
    .map((r) => ({
      talhao: r.talhao,
      timestamp: r.timestamp,
      temperature: r.temperature,
      humidity: r.humidity,
      solarRadiation: r.solarRadiation,
    }));

  if (readings.length === 0) {
    log(gatewayId, "Nenhum talhao respondeu neste ciclo");
    return;
  }

  const batch: ReadingBatch = { gateway: gatewayId, readings };
  log(gatewayId, `Enviando ${readings.length} leituras para o Average Service (gRPC)`);

  try {
    const result = await calculateAverage(batch);
    log(
      gatewayId,
      `Media recebida (${result.samples} talhoes): T=${result.averages.temperature}°C ` +
        `U=${result.averages.humidity}% IS=${result.averages.solarRadiation} W/m²`
    );
  } catch (err) {
    log(gatewayId, `Average Service indisponivel: ${(err as Error).message}`);
  }
}

// O proximo ciclo so e agendado quando o atual termina, para que talhoes
// lentos (com novas tentativas) nao facam ciclos se sobreporem.
function startPolling(): void {
  const tick = () => {
    runCycle()
      .catch((err) => log(gatewayId, `Erro inesperado no ciclo: ${err.message}`))
      .finally(() => setTimeout(tick, gatewayConfig.pollIntervalMs));
  };
  setTimeout(tick, gatewayConfig.pollIntervalMs);
}

log(
  gatewayId,
  `Gateway iniciado. Talhoes monitorados: ${gatewayConfig.talhoes
    .map((t) => t.id)
    .join(", ")} (intervalo de ${gatewayConfig.pollIntervalMs}ms)`
);

startPolling();
