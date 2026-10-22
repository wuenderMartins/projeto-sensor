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
