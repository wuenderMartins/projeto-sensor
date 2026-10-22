// Mensagens trocadas entre Gateway e Talhao (socket TCP, JSON por linha)

export interface ReadSensorsRequest {
  type: "READ_SENSORS";
  gateway?: string;
}

export interface TalhaoReadingResponse {
  type: "TALHAO_READING";
  talhao: string;
  timestamp: string;
  temperature: number;
  humidity: number;
  solarRadiation: number;
}

export interface ErrorResponse {
  type: "ERROR";
  message: string;
}

export type TalhaoServerRequest = ReadSensorsRequest;
export type TalhaoServerResponse = TalhaoReadingResponse | ErrorResponse;

// Mensagens do contrato gRPC (proto/average.proto) entre Gateway e
// microsservico de calculo. O proto-loader converte os campos em
// snake_case do .proto para camelCase (solar_radiation -> solarRadiation).

export interface Reading {
  talhao: string;
  timestamp: string;
  temperature: number;
  humidity: number;
  solarRadiation: number;
}

export interface ReadingBatch {
  gateway: string;
  readings: Reading[];
}

export interface AverageResult {
  gateway: string;
  samples: number;
  averages: {
    temperature: number;
    humidity: number;
    solarRadiation: number;
  };
  calculatedAt: string;
}
