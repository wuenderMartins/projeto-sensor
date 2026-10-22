import path from "node:path";
import * as grpc from "@grpc/grpc-js";
import { loadSync } from "@grpc/proto-loader";

const PROTO_DIR = path.resolve(__dirname, "../../proto");

/**
 * Carrega um arquivo .proto em tempo de execucao (sem gerar codigo),
 * do mesmo jeito do exemplo grpc-tads6. Com "defaults: true" os campos
 * ausentes chegam com o valor padrao do proto3 (0, "" ou lista vazia).
 */
function loadPackage(file: string, packageName: string): grpc.GrpcObject {
  const definition = loadSync(path.join(PROTO_DIR, file), {
    keepCase: false,
    defaults: true,
  });
  return grpc.loadPackageDefinition(definition)[packageName] as grpc.GrpcObject;
}

export const AverageService = loadPackage("average.proto", "average")
  .AverageService as grpc.ServiceClientConstructor;
