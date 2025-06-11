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
- **NodeId naming**: formato string-based per leggibilità (`ns=1;s=StationGateway.BaseModule_001`)

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
// Configurazione server con capacità produzione
const SERVER_CONFIG = {
    port: 4841,
    resourcePath: "/UA/RailwayMonitoring",
    maxSessions: 100,
    maxConnectionsPerEndpoint: 100
}
```

#### Features Implementate

**1. Creazione Dinamica dell'Address Space**
- ObjectTypes con ereditarietà completa
- Variable binding con getter/setter in tempo reale
- Method handlers con validazione parametri

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
Creare un client intelligente che monitora automaticamente tutti i cambiamenti di stato del sistema.

### 🔧 Implementazione

#### Features Principali

**1. Discovery Automatico**
```javascript
// Il client esplora automaticamente l'address space
await browseRecursively(objectsNodeId);
await tryDirectNodeAccess(); // Fallback per nodi specifici
```

**2. Monitoraggio Real-time**
- Subscription OPC-UA per tutti i nodi scoperti
- Visualizzazione solo dei cambiamenti (no spam)
- Formattazione intelligente dei valori (°C, %, enum)

**3. Interface Utente Avanzata**
```javascript
// Icone colorate per stato moduli
🟢 BaseModule (acceso)    🟦 AdvancedModule (acceso)
🔧 Modulo (manutenzione)  🔴 Modulo (spento)

// Output formattato con timestamp
📊 11/06/2025, 09:05:35 | BaseModule_001.Temperature: 22.3°C
👥 11/06/2025, 09:05:40 | AdvancedModule_001.CrowdLevel: 37.2%
```

**4. Test Automatici**
- Test di SetAlarm sui moduli base dopo 10 secondi
- Test di SetAlarmWithLevel sui moduli avanzati dopo 15 secondi
- Logging completo dei risultati

#### Caratteristiche Tecniche
- **Reconnection automatica** in caso di perdita connessione
- **Gestione errori robusta** per nodi non disponibili
- **Grouping intelligente** delle variabili per modulo
- **Graceful shutdown** con Ctrl+C

#### Output Esempio
```
🚂 RAILWAY MONITORING - DYNAMIC CLIENT CONSOLE
📡 Connected to: opc.tcp://localhost:4841/UA/RailwayMonitoring
⏰ Started at: 11/06/2025, 09:05:30

🟢 BaseModule_001: acceso (0) | 22.5°C
🟢 BaseModule_002: acceso (0) | 21.8°C  
🟦 AdvancedModule_001: acceso (0) | 23.1°C | 35.0%
🔧 AdvancedModule_002: manutenzione (2) | 20.5°C | 0.0%

🔍 Live Monitoring (changes will be shown):
📊 11/06/2025, 09:05:35 | BaseModule_001.Temperature: 22.3°C
🚨 11/06/2025, 09:05:40 | Testing SetAlarm on BaseModule_001...
✅ SetAlarm(true) executed successfully
```

### 📁 File Prodotti
- `4-ClientConsole/client.js` (client dinamico ~400 righe)
- `4-ClientConsole/README.md` (documentazione d'uso)

---

## 🚀 Come Eseguire il Progetto

### Prerequisiti
- Node.js v14+ installato
- UAModeler (per visualizzare i file del punto 2)

### Istruzioni Step-by-Step

**1. Setup del Server**
```bash
cd 3-ServerNodeJS
npm install
node server.js
```

**2. Avvio del Client (in un altro terminale)**
```bash
cd 4-ClientConsole
npm install
node client.js
```

**3. Test delle Funzionalità**
- Il server simula automaticamente variazioni di temperatura e affollamento
- Il client mostra i cambiamenti in tempo reale
- I metodi vengono testati automaticamente dopo 10-15 secondi

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