# Punto 4 - Client Console OPC-UA

## Descrizione
Client console con auto-discovery che monitora in tempo reale i cambiamenti di stato di tutti i moduli del sistema di monitoraggio banchine ferroviarie.

## Funzionalità

### 🔍 Auto-Discovery e Connessione
- **Endpoint Discovery**: Trova automaticamente l'endpoint server corretto
- **Connessione Robusta**: Prova multiple combinazioni di URL (THINKPADMATTEO, localhost, 127.0.0.1)
- **Gestione Certificati**: Ignora warning sui certificati per ambiente di test

### 📊 Monitoraggio Real-time
- **SystemState** di tutti i moduli (acceso/spento/manutenzione)
- **Temperature** di tutti i moduli (con simulazione variazioni ogni 5 secondi)
- **CrowdLevel** dei moduli avanzati (simulazione pattern ore di punta)

### 📱 Interfaccia Console Avanzata
- **Output pulito** con timestamp italiani
- **Icone colorate** per stato moduli (🟢🟦🔧🔴)
- **Solo cambiamenti** vengono mostrati (no spam iniziale)
- **Valori formattati** (°C, %, enum tradotti)

## Come usare

### 1. Prerequisiti
Assicurati che il server sia avviato:
```bash
cd ../3-ServerNodeJS
node server.js
```

### 2. Installa dipendenze
```bash
npm install node-opcua@latest
```

### 3. Avvia il client
```bash
# Client standard (richiede endpoint corretto)
node client.js

# OPPURE Client auto-discovery (raccomandato)
node client-auto.js
```

## Output Esempio
```
🚂 RAILWAY MONITORING - AUTO-DISCOVERY CLIENT
🔍 Auto-discovering server endpoint...
🔌 Trying endpoint: opc.tcp://THINKPADMATTEO:4841/UA/RailwayMonitoring
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

## Architettura

### Endpoint Auto-Discovery
Il client prova automaticamente questi endpoint:
- `opc.tcp://THINKPADMATTEO:4841/UA/RailwayMonitoring`
- `opc.tcp://localhost:4841/UA/RailwayMonitoring` 
- `opc.tcp://127.0.0.1:4841/UA/RailwayMonitoring`

### NodeIDs Monitorati
- **Station Info**: StationId (ns=1;i=1012), StationName (ns=1;i=1013)
- **BaseModule_001**: SystemState (ns=1;i=1015), Temperature (ns=1;i=1016)
- **BaseModule_002**: SystemState (ns=1;i=1018), Temperature (ns=1;i=1019)
- **AdvancedModule_001**: SystemState (ns=1;i=1021), Temperature (ns=1;i=1022), CrowdLevel (ns=1;i=1023)
- **AdvancedModule_002**: SystemState (ns=1;i=1025), Temperature (ns=1;i=1026), CrowdLevel (ns=1;i=1027)

### Subscription OPC-UA
- **Publishing Interval**: 1000ms
- **Monitoring**: Solo cambiamenti di valore
- **Reconnection**: Automatica con retry
- **Queue Size**: 10 per monitored item

## File Disponibili

### `client.js` - Client Standard
- Richiede endpoint corretto configurato
- Per ambienti con endpoint fisso

### `client-auto.js` - Client Auto-Discovery (Raccomandato)
- Trova automaticamente l'endpoint corretto
- Più robusto per ambienti di test
- Gestione automatica degli errori di connessione

## Risoluzione Problemi

### Se il client non si connette
1. **Verifica che il server sia avviato** e mostri l'endpoint
2. **Usa client-auto.js** per auto-discovery automatico
3. **Controlla i firewall** (Windows Defender, antivirus)

### Warning sui certificati
```
[NODE-OPCUA-W06] The certificate subjectAltName does not match
```
**Normale per ambiente di test** - non impedisce il funzionamento.

### Se non vedi aggiornamenti
- I valori cambiano ogni 5 secondi (simulazione server)
- Solo i **cambiamenti** vengono mostrati, non valori statici

## Note Tecniche
- **Security Mode**: None (per testing)
- **Connessione automatica** con gestione errori
- **Formattazione italiana** dei timestamp
- **Shutdown graceful** con Ctrl+C
- **Compatible** con server Node.js del Punto 3
- **Method testing**: Rimosso per focus su monitoring

## Performance
- **Memory usage**: ~50MB
- **CPU usage**: <1% durante monitoring
- **Network**: ~1KB/sec per subscription updates
- **Latency**: <100ms per aggiornamenti