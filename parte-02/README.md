# Smart Farm — Parte 02

A Parte 01 (na raiz do repositório) liga sensores, gateways e um serviço de média usando **apenas socket TCP**.
A Parte 02 implementa o diagrama completo da Smart Farm, que acrescenta **RPC (gRPC)** e uma camada **FOG**:

- cada Gateway atende **3 talhões**, e cada talhão tem sensores de **Temperatura, Umidade e IS** (irradiação solar);
- o Gateway fala com o **Microsserviço para cálculo** via **gRPC**, e ele **retorna a média**;
- a **FOG** (servidor local) busca os dados nos Gateways via **socket** e chama o **Microsserviço de Análise de Anomalias** via **gRPC** (ex.: umidade baixa → ligar irrigação).

> **Status: em andamento.** A camada Edge já funciona de ponta a ponta. FOG e anomalias ainda não foram implementadas.

## O que já funciona

```
 Talhão (S) ◄──socket──► (C) Gateway (C) ──gRPC──► (S) Microsserviço para cálculo
  3 por gateway              G1 e G2                   devolve a média na resposta
```

| Parte do diagrama | Comunicação | Situação |
|---|---|---|
| Talhões 01–03 (Temperatura, Umidade, IS) | socket — talhão é o servidor (S) | Feito |
| Gateway consultando os talhões | socket — gateway é o cliente (C) | Feito |
| Gateway → Microsserviço para cálculo | gRPC — gateway é o cliente (C) | Feito |
| Gateway ↔ FOG | socket — gateway é o servidor (S), FOG é o cliente (C) | Falta |
| FOG → Microsserviço de Análise de Anomalias | gRPC — FOG é o cliente (C) | Falta |
| Gatilhos de anomalia (ex.: ligar irrigação) | — | Falta |

### Como um ciclo acontece

1. A cada 2 s, o Gateway abre uma conexão socket com cada um dos seus 3 talhões e envia `{"type":"READ_SENSORS"}`.
2. Cada talhão responde com `TALHAO_READING` (temperatura, umidade e IS). O protocolo é o mesmo da Parte 01: JSON terminado em `\n`.
3. O Gateway junta as leituras em um lote e chama `AverageService.CalculateAverage` via gRPC ([proto/average.proto](proto/average.proto)).
4. O microsserviço calcula a média do lote e devolve o resultado na própria resposta.

Se um talhão não responder, o Gateway tenta 3 vezes e segue sem ele. Se o microsserviço estiver fora do ar, o Gateway registra o erro e continua no próximo ciclo.

## Próximos passos

1. O Gateway guarda a última média recebida e abre um **servidor socket** para a FOG consultar.
2. Criar a **FOG**: um cliente socket que consulta os dois Gateways.
3. Criar `proto/anomaly.proto` e o **Microsserviço de Análise de Anomalias** (servidor gRPC) com as regras de gatilho.
4. A FOG envia as médias para análise e exibe as ações sugeridas (ex.: "ligar irrigação no G1").

## Como rodar

Requer Node.js 20 ou mais novo.

```bash
cd parte-02
npm install
npm run demo        # sobe o microsserviço, os 6 talhões e os 2 gateways
```

Ou cada processo em um terminal separado:

```bash
npm run average-service
npm run talhao -- G1-T01      # repetir para G1-T02, G1-T03, G2-T01, G2-T02, G2-T03
npm run gateway:g1
npm run gateway:g2
```

`npm run typecheck` verifica os tipos sem gerar build.

## Arquivos

| Arquivo | O que faz |
|---|---|
| [src/config/config.ts](src/config/config.ts) | Portas dos talhões (51xx e 52xx), gateways e microsserviço (50051) |
| [src/talhoes/talhao-server.ts](src/talhoes/talhao-server.ts) | Servidor socket de um talhão |
| [src/talhoes/sensor-generator.ts](src/talhoes/sensor-generator.ts) | Gera leituras simuladas de Temperatura, Umidade e IS |
| [src/gateways/gateway.ts](src/gateways/gateway.ts) | Ciclo do gateway: consulta os talhões e pede a média |
| [src/gateways/talhao-client.ts](src/gateways/talhao-client.ts) | Cliente socket que lê um talhão |
| [src/gateways/average-client.ts](src/gateways/average-client.ts) | Cliente gRPC do microsserviço para cálculo |
| [src/services/average-service.ts](src/services/average-service.ts) | Servidor gRPC que calcula a média |
| [proto/average.proto](proto/average.proto) | Contrato gRPC do microsserviço para cálculo |
| [src/shared/](src/shared/) | Utilitários de socket, validação de mensagens, tipos e carregamento do `.proto` |
| [scripts/run-demo.js](scripts/run-demo.js) | Sobe tudo com um comando |
