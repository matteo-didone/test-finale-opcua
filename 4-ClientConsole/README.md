# Punto 4 - Client Console OPC-UA

## Descrizione
Client console che monitora in tempo reale i cambiamenti di stato di tutti i moduli del sistema di monitoraggio banchine ferroviarie.

## Funzionalità

### 🔍 Monitoraggio Real-time
- **SystemState** di tutti i moduli (acceso/spento/manutenzione)
- **Temperature** di tutti i moduli (con simulazione variazioni)
- **CrowdLevel** dei moduli avanzati (simulazione pattern ore di punta)

### 🚨 Test dei Metodi
- **SetAlarm** sui moduli base
- **SetAlarmWithLevel** sui moduli avanzati
- Validazione parametri e logging risultati

### 📊 Interfaccia Console
- Output formattato con timestamp
- Icone colorate per stato moduli
- Solo i cambiamenti vengono mostrati (no spam)
- Valori formattati (°C, %, enum)

## Come usare

### 1. Prerequisiti
Assicurati che il server sia avviato:
```bash
cd ../3-ServerNodeJS
npm start
```

### 2. Installa dipendenze
```bash
npm install
```

### 3. Avvia il client
```bash
node client.js
```

## Output Esempio
```
🚂 RAILWAY PLATFORM MONITORING - CLIENT CONSOLE
📡 Connected to: opc.tcp://THINKPADMATTEO:4841/UA/RailwayMonitoring
⏰ Started at: 11/06/2025, 09:05:30

🏗️ Station: Pordenone Centrale (ID: STN_001)

📊 Initial Module States:
🟢 BaseModule_001: acceso (0) | 22.5°C
🟢 BaseModule_002: acceso (0) | 21.8°C  
🟦 AdvancedModule_001: acceso (0) | 23.1°C | 35.0%
🔧 AdvancedModule_002: manutenzione (2) | 20.5°C | 0.0%

🔍 Live Monitoring (only changes will be shown):
📊 11/06/2025, 09:05:35 | BaseModule_001.Temperature: 22.3°C
📊 11/06/2025, 09:05:35 | AdvancedModule_001.CrowdLevel: 37.2%
🚨 11/06/2025, 09:05:40 | Testing SetAlarm on BaseModule_001...
✅ SetAlarm(true) executed successfully on BaseModule_001
```

## Architettura

### Node IDs Monitorati
- Station Gateway informazioni
- Tutti i moduli base (SystemState, Temperature)
- Tutti i moduli avanzati (+ CrowdLevel)
- Metodi per test funzionalità

### Subscription OPC-UA
- **Publishing Interval**: 1000ms
- **Monitoring**: Solo cambiamenti di valore
- **Reconnection**: Automatica con retry

### Test Automatici
- Dopo 10 secondi: test SetAlarm su BaseModule_001
- Dopo 15 secondi: test SetAlarmWithLevel su AdvancedModule_001
- Logging completo di tutti i risultati

## Note Tecniche
- Connessione sicura con gestione errori
- Formattazione valori automatica
- Shutdown graceful con Ctrl+C
- Compatible con il server Node.js del Punto 3