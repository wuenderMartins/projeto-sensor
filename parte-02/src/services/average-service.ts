import * as grpc from "@grpc/grpc-js";
import { AVERAGE_SERVICE_CONFIG } from "../config/config";
import { AverageService } from "../shared/grpc";
import { log, timestamp } from "../shared/tcp-utils";
import { ReadingBatch, AverageResult } from "../shared/types";

function average(values: number[]): number {
  const sum = values.reduce((acc, v) => acc + v, 0);
  return +(sum / values.length).toFixed(2);
}

/**
 * Implementacao do rpc CalculateAverage. Diferente da parte 01, o
 * servico nao acumula leituras nem grava em disco: ele recebe o lote
 * do Gateway, calcula a media e devolve o resultado na propria resposta.
 */
function calculateAverage(
  call: grpc.ServerUnaryCall<ReadingBatch, AverageResult>,
  callback: grpc.sendUnaryData<AverageResult>
): void {
  const { gateway, readings } = call.request;

  if (readings.length === 0) {
    log("Average Service", `Lote vazio recebido de ${gateway || "gateway desconhecido"}`);
    callback({ code: grpc.status.INVALID_ARGUMENT, details: "Lote de leituras vazio" });
    return;
  }

  log("Average Service", `${readings.length} leituras recebidas de ${gateway}`);

  const result: AverageResult = {
    gateway,
    samples: readings.length,
    averages: {
      temperature: average(readings.map((r) => r.temperature)),
      humidity: average(readings.map((r) => r.humidity)),
      solarRadiation: average(readings.map((r) => r.solarRadiation)),
    },
    calculatedAt: timestamp(),
  };

  log(
    "Average Service",
    `Media de ${gateway}: T=${result.averages.temperature}°C ` +
      `U=${result.averages.humidity}% IS=${result.averages.solarRadiation} W/m²`
  );

  callback(null, result);
}

const server = new grpc.Server();
server.addService(AverageService.service, { CalculateAverage: calculateAverage });

const address = `${AVERAGE_SERVICE_CONFIG.host}:${AVERAGE_SERVICE_CONFIG.port}`;

server.bindAsync(address, grpc.ServerCredentials.createInsecure(), (err, port) => {
  if (err) {
    console.error(`[Average Service] Erro ao iniciar o servidor gRPC: ${err.message}`);
    process.exit(1);
  }
  log("Average Service", `Servico gRPC iniciado na porta ${port}`);
});
