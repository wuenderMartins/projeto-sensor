import * as grpc from "@grpc/grpc-js";
import { AVERAGE_SERVICE_CONFIG, RESPONSE_TIMEOUT_MS } from "../config/config";
import { AverageService } from "../shared/grpc";
import { ReadingBatch, AverageResult } from "../shared/types";

// O proto-loader cria os metodos do cliente em tempo de execucao, entao
// o TypeScript nao os conhece; este tipo descreve o rpc que usamos.
type AverageClient = grpc.Client & {
  CalculateAverage(
    batch: ReadingBatch,
    options: grpc.CallOptions,
    callback: (err: grpc.ServiceError | null, result?: AverageResult) => void
  ): grpc.ClientUnaryCall;
};

// Diferente do socket da parte 01, o cliente gRPC mantem um canal HTTP/2
// que e reaproveitado entre as chamadas, por isso e criado uma unica vez.
const client = new AverageService(
  `${AVERAGE_SERVICE_CONFIG.host}:${AVERAGE_SERVICE_CONFIG.port}`,
  grpc.credentials.createInsecure()
) as unknown as AverageClient;

/**
 * Chama o rpc CalculateAverage. O deadline faz o papel do timeout de
 * resposta: se o servico nao responder a tempo, a chamada falha com
 * DEADLINE_EXCEEDED em vez de ficar pendurada.
 */
export function calculateAverage(batch: ReadingBatch): Promise<AverageResult> {
  return new Promise((resolve, reject) => {
    const options = { deadline: Date.now() + RESPONSE_TIMEOUT_MS };

    client.CalculateAverage(batch, options, (err, result) => {
      if (err) {
        reject(new Error(err.details || err.message));
        return;
      }
      resolve(result!);
    });
  });
}
