# Test Finale Modulo OPC-UA - Sistema Monitoraggio Banchine Ferroviarie

## 📋 Panoramica del Progetto

Questo progetto implementa un sistema completo di monitoraggio per banchine ferroviarie utilizzando la tecnologia OPC-UA. Il sistema è composto da moduli di monitoraggio distribuiti su una banchina, collegati tramite un gateway di stazione che espone i dati via server OPC-UA.

### 🎯 Obiettivi del Sistema
- Controllare lo stato delle banchine in tempo reale
- Rilevare condizioni ambientali critiche (temperatura)
- Permettere interventi automatici o remoti (allarmi)
- Monitorare l'affollamento delle banchine (moduli avanzati)

### 🏗️ Architettura
Il sistema è strutturato con:
- **1 Gateway di Stazione** (server OPC-UA)
- **2 Moduli Base** per monitoraggio essenziale
- **2 Moduli Avanzati** con funzionalità estese
- **Client di monitoraggio** per supervisione remota

---

## 📊 Punto 1 - Information Model e Diagramma

### 🎯 Obiettivo
Progettare l'Information Model del sistema seguendo le convenzioni OPC-UA e creare la documentazione strutturale.

### 🔧 Implementazione

#### Struttura dell'Address Space
```
Objects/
└── StationGateway (Pordenone Centrale)
    ├── BaseModule_001 (Modulo Base)
    │   ├── SystemState: "acceso" | "spento" | "manutenzione"
    │   ├── Temperature: valore in °C (-40 a +85)
    │   └── SetAlarm(Boolean): attiva/disattiva allarme
    ├── BaseModule_002 (Modulo Base)
    ├── AdvancedModule_001 (Modulo Avanzato)
    │   ├── Tutte le funzionalità del modulo base
    │   ├── CrowdLevel: livello affollamento (0-100%)
    │   └── SetAlarmWithLevel(Boolean, Double): allarme con livello dB
    └── AdvancedModule_002 (Modulo Avanzato)
```

#### Tipi di Oggetto Progettati

**BaseModuleType**
- `SystemState` (Enumeration): stato operativo del modulo
- `Temperature` (Double): temperatura ambiente con engineering units
- `SetAlarm` (Method): comando per controllo allarme acustico

**AdvancedModuleType** (eredita da BaseModuleType)
- `CrowdLevel` (Double): percentuale di affollamento stimato
- `SetAlarmWithLevel` (Method): allarme con controllo volume (50-120 dB)

#### Decisioni di Design
- **Namespace personalizzato**: `urn:railway:monitoring`
- **Ereditarietà**: AdvancedModuleType estende BaseModuleType per riutilizzo del codice
- **Validazione**: range di valori definiti per ogni variabile
- **NodeId naming**: formato numeric per consistenza (`ns=1;i=1014`, `ns=1;i=1015`, ecc.)

### 📁 File Prodotti
- `1-DiagrammaInformationModel/information-model-specification.md`
- `1-DiagrammaInformationModel/README.md`

---

## 🛠️ Punto 2 - UAModeler Implementation

### 🎯 Obiettivo
Creare l'Information Model utilizzando UAModeler e generare i file di definizione standard OPC-UA.

### 🔧 Implementazione

#### File UANodeSet XML
Il file `RailwayMonitoringSystem.xml` contiene:

**Data Types**
- `SystemStateEnum`: enumerazione per stati sistema (acceso=0, spento=1, manutenzione=2)
- Engineering Units per temperature (°C) e percentuali (%)

**Variable Types**
- `TemperatureVariableType`: temperatura con unità e range (-40 a +85°C)
- `PercentageVariableType`: percentuale con range (0-100%)

**Object Types**
- `BaseModuleType`: tipo base con stato, temperatura e metodo SetAlarm
- `AdvancedModuleType`: tipo avanzato che eredita dal base + CrowdLevel + SetAlarmWithLevel

**Object Instances**
- StationGateway con 4 moduli istanziati e configurati

#### Caratteristiche Tecniche
- **Versioning**: Model version 1.0.0 con data di pubblicazione
- **References**: relazioni corrette tra nodi (HasComponent, HasProperty, HasSubtype)
- **Default Values**: valori realistici per ogni istanza di modulo
- **Method Arguments**: parametri tipizzati con descrizioni

### 📁 File Prodotti
- `2-UAModeler/RailwayMonitoringSystem.xml` (NodeSet principale)
- `2-UAModeler/RailwayMonitoringSystem/railwaymonitoringsystem.tt2pro` (progetto UAModeler)

---

## 🖥️ Punto 3 - Server Node.js

### 🎯 Obiettivo
Implementare un server OPC-UA completamente funzionale con simulazione di dati realistici e metodi operativi.

### 🔧 Implementazione

#### Architettura del Server
```javascript
// Configurazione server ottimizzata per testing
const SERVER_CONFIG = {
    port: 4841,
    resourcePath: "/UA/RailwayMonitoring",
    maxSessions: 100,
    maxConnectionsPerEndpoint: 100
    // Security semplificata per ambiente di test
}
```

#### Features Implementate

**1. Creazione Dinamica dell'Address Space**
- ObjectTypes con ereditarietà completa
- Variable binding con getter/setter in tempo reale
- NodeId fissi e consistenti per compatibility

**2. Simulazione Dati Realistica**
```javascript
// Simulazione variazioni temperatura
moduleData[key].temperature = baseTemp + (Math.random() - 0.5);

// Simulazione pattern affollamento ore di punta
if (hour >= 7 && hour <= 9 || hour >= 17 && hour <= 19) {
    baseCrowd = 70; // Rush hour
}
```

**3. Metodi Funzionali**
- `SetAlarm`: attiva/disattiva allarme con logging
- `SetAlarmWithLevel`: controllo volume con validazione range (50-120 dB)
- Aggiornamento reale delle variabili interne

**4. Robustezza e Monitoring**
- Gestione errori completa con StatusCodes appropriati
- Logging strutturato di tutte le operazioni
- Graceful shutdown con cleanup risorse
- Aggiornamento automatico ogni 5 secondi

#### Endpoint e NodeID Mapping
- **Server Endpoint**: `opc.tcp://THINKPADMATTEO:4841/UA/RailwayMonitoring`
- **BaseModule_001**: Object (ns=1;i=1014), SystemState (ns=1;i=1015), Temperature (ns=1;i=1016)
- **BaseModule_002**: Object (ns=1;i=1017), SystemState (ns=1;i=1018), Temperature (ns=1;i=1019)
- **AdvancedModule_001**: Object (ns=1;i=1020), SystemState (ns=1;i=1021), Temperature (ns=1;i=1022), CrowdLevel (ns=1;i=1023)
- **AdvancedModule_002**: Object (ns=1;i=1024), SystemState (ns=1;i=1025), Temperature (ns=1;i=1026), CrowdLevel (ns=1;i=1027)

#### Valori di Default Realistici
- **BaseModule_001**: acceso, 22.5°C
- **BaseModule_002**: acceso, 21.8°C  
- **AdvancedModule_001**: acceso, 23.1°C, 35% affollamento
- **AdvancedModule_002**: manutenzione, 20.5°C, 0% affollamento

### 📁 File Prodotti
- `3-ServerNodeJS/server.js` (server completo ~500 righe)
- `3-ServerNodeJS/package.json` (dipendenze node-opcua)

---

## 🖥️ Punto 4 - Client Console

### 🎯 Obiettivo
Creare un client intelligente con auto-discovery che monitora automaticamente tutti i cambiamenti di stato del sistema.

### 🔧 Implementazione

#### Features Principali

**1. Auto-Discovery Endpoint**
```javascript
// Il client trova automaticamente l'endpoint corretto
const POSSIBLE_ENDPOINTS = [
    "opc.tcp://THINKPADMATTEO:4841/UA/RailwayMonitoring",
    "opc.tcp://localhost:4841/UA/RailwayMonitoring",
    "opc.tcp://127.0.0.1:4841/UA/RailwayMonitoring"
];
```

**2. Monitoraggio Real-time Ottimizzato**
- Subscription OPC-UA per variabili specifiche
- Visualizzazione solo dei cambiamenti (no spam)
- Formattazione intelligente dei valori (°C, %, enum)
- Mapping diretto dei NodeID per performance

**3. Interface Utente Avanzata**
```javascript
// Icone colorate per stato moduli
🟢 BaseModule (acceso)    🟦 AdvancedModule (acceso)
🔧 Modulo (manutenzione)  🔴 Modulo (spento)

// Output formattato con timestamp italiani
🌡️ 11/06/2025, 12:03:45 | BaseModule_001.temperature: 22.3°C
👥 11/06/2025, 12:03:45 | AdvancedModule_001.crowdLevel: 34.9%
```

**4. Gestione Robusta degli Errori**
- Auto-discovery con fallback automatico
- Gestione certificati per ambiente di test
- Reconnection automatica in caso di perdita connessione
- Output pulito senza noise da variabili di sistema

#### Caratteristiche Tecniche
- **Security Mode**: None (per testing)
- **Endpoint Discovery**: Automatico con multiple opzioni
- **Grouping intelligente** delle variabili per modulo
- **Graceful shutdown** con Ctrl+C
- **Performance ottimizzate**: mapping diretto invece di browsing

#### Output Esempio Reale
```
🚂 RAILWAY MONITORING - AUTO-DISCOVERY CLIENT
🔍 Auto-discovering server endpoint...
✅ Successfully connected to: opc.tcp://THINKPADMATTEO:4841/UA/RailwayMonitoring

🏗️ Station: Pordenone Centrale (ID: STN_001)

📊 Initial Module States:
🟢 BaseModule_001: acceso (0) | 22.9°C
🟢 BaseModule_002: acceso (0) | 22.2°C  
🟦 AdvancedModule_001: acceso (0) | 23.4°C | 34.1%
🔧 AdvancedModule_002: manutenzione (2) | 20.5°C | 0.0%

🔍 Live Monitoring (changes will be shown):
🌡️ 11/06/2025, 12:03:45 | BaseModule_001.temperature: 22.3°C
👥 11/06/2025, 12:03:45 | AdvancedModule_001.crowdLevel: 34.9%
```

### 📁 File Prodotti
- `4-ClientConsole/client.js` (client standard)
- `4-ClientConsole/client-auto.js` (client auto-discovery raccomandato)
- `4-ClientConsole/README.md` (documentazione aggiornata)

---

## 🚀 Come Eseguire il Progetto

### Prerequisiti
- Node.js v14+ installato
- UAModeler (per visualizzare i file del punto 2)

### Istruzioni Step-by-Step

**1. Setup del Server**
```bash
cd 3-ServerNodeJS
npm install node-opcua@latest
node server.js
```

**Output Atteso Server:**
```
✅ Server started successfully!
📡 Server endpoint: opc.tcp://THINKPADMATTEO:4841/UA/RailwayMonitoring
📋 Available Modules:
  • BaseModule_001 (ns=1;i=1014) - acceso, 22.5°C
📊 Starting data simulation...
```

**2. Avvio del Client (in un altro terminale)**
```bash
cd 4-ClientConsole
npm install node-opcua@latest

# Client auto-discovery (raccomandato)
node client-auto.js

# OPPURE client standard
node client.js
```

## 🛠️ Tecnologie Utilizzate

- **OPC-UA**: Protocollo di comunicazione industriale
- **Node.js**: Runtime per server e client
- **node-opcua**: Libreria OPC-UA per JavaScript
- **UAModeler**: Tool di modellazione OPC-UA
- **XML**: Format per NodeSet OPC-UA standard

---

## 👥 Autore

**Matteo Didonè**  
Corso Digital Solutions 4.0 - OPC-UA  
Pordenone, 11/06/2025