export interface TalhaoConfig {
  id: string;
  host: string;
  port: number;
}

export interface GatewayConfig {
  id: string;
  talhoes: TalhaoConfig[];
  pollIntervalMs: number;
}

// --- Talhoes (camada Edge) ---
// Cada talhao e um servidor TCP com tres sensores: Temperatura, Umidade
// e IS (irradiacao solar). Cada Gateway atende tres talhoes, como no
// diagrama da Smart Farm.
export const TALHOES: Record<string, TalhaoConfig> = {
  "G1-T01": { id: "G1-T01", host: "127.0.0.1", port: 5101 },
  "G1-T02": { id: "G1-T02", host: "127.0.0.1", port: 5102 },
  "G1-T03": { id: "G1-T03", host: "127.0.0.1", port: 5103 },
  "G2-T01": { id: "G2-T01", host: "127.0.0.1", port: 5201 },
  "G2-T02": { id: "G2-T02", host: "127.0.0.1", port: 5202 },
  "G2-T03": { id: "G2-T03", host: "127.0.0.1", port: 5203 },
};

// --- Gateways Edge ---
export const GATEWAYS: Record<string, GatewayConfig> = {
  G1: {
    id: "G1",
    talhoes: [TALHOES["G1-T01"], TALHOES["G1-T02"], TALHOES["G1-T03"]],
    pollIntervalMs: 2000,
  },
  G2: {
    id: "G2",
    talhoes: [TALHOES["G2-T01"], TALHOES["G2-T02"], TALHOES["G2-T03"]],
    pollIntervalMs: 2000,
  },
};

// --- Microsservico para calculo (gRPC) ---
export const AVERAGE_SERVICE_CONFIG = {
  host: "127.0.0.1",
  port: 50051,
};

// --- Parametros de rede e resiliencia ---
export const CONNECT_TIMEOUT_MS = 3000;
export const RESPONSE_TIMEOUT_MS = 3000;
export const MAX_READ_ATTEMPTS = 3;
export const RETRY_DELAY_MS = 1000;
