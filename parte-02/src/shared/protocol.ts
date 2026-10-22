import { ReadSensorsRequest, TalhaoReadingResponse } from "./types";

/**
 * Faz o parse de uma linha (ja sem o "\n" delimitador) como JSON.
 * Lanca excecao se a linha nao for um JSON valido — quem chama deve
 * tratar esse erro e responder com uma mensagem de protocolo ERROR.
 */
export function parseJsonLine<T = unknown>(line: string): T {
  return JSON.parse(line) as T;
}

export function isReadSensorsRequest(msg: any): msg is ReadSensorsRequest {
  return !!msg && typeof msg === "object" && msg.type === "READ_SENSORS";
}

export function isValidTalhaoReading(msg: any): msg is TalhaoReadingResponse {
  return (
    !!msg &&
    typeof msg === "object" &&
    msg.type === "TALHAO_READING" &&
    typeof msg.talhao === "string" &&
    typeof msg.timestamp === "string" &&
    typeof msg.temperature === "number" &&
    Number.isFinite(msg.temperature) &&
    typeof msg.humidity === "number" &&
    Number.isFinite(msg.humidity) &&
    typeof msg.solarRadiation === "number" &&
    Number.isFinite(msg.solarRadiation)
  );
}
