# OPC-UA Information Model - Sistema Monitoraggio Banchine Ferroviarie

## Namespace
- **URI**: `urn:railway:monitoring`
- **Server Endpoint**: `opc.tcp://localhost:4840`

## Struttura Address Space

```
Objects/
└── StationGateway (Object)
    ├── BaseModule_001/
    │   ├── SystemState (String, Readable)
    │   ├── Temperature (Double, Readable) [°C]
    │   └── SetAlarm (Method) → (Boolean alarmActive)
    ├── BaseModule_002/
    │   ├── SystemState (String, Readable)
    │   ├── Temperature (Double, Readable) [°C]
    │   └── SetAlarm (Method) → (Boolean alarmActive)
    ├── AdvancedModule_001/
    │   ├── SystemState (String, Readable)
    │   ├── Temperature (Double, Readable) [°C]
    │   ├── CrowdLevel (Double, Readable) [0-100%]
    │   └── SetAlarmWithLevel (Method) → (Boolean alarmActive, Double soundLevel_dB)
    └── AdvancedModule_002/
        ├── SystemState (String, Readable)
        ├── Temperature (Double, Readable) [°C]
        ├── CrowdLevel (Double, Readable) [0-100%]
        └── SetAlarmWithLevel (Method) → (Boolean alarmActive, Double soundLevel_dB)
```

## Definizioni dei Tipi

### BaseModuleType (ObjectType)
```
BaseModuleType (ObjectType)
├── SystemState (String, Readable)
│   └── Valori possibili: "acceso", "spento", "manutenzione"
├── Temperature (Double, Readable)
│   └── Unità: °C, Range: -40.0 a +85.0
└── SetAlarm (Method)
    ├── Input Arguments: alarmActive (Boolean)
    └── Output Arguments: StatusCode
```

### AdvancedModuleType (ObjectType)
```
AdvancedModuleType (ObjectType) [eredita da BaseModuleType]
├── SystemState (String, Readable)
│   └── Valori possibili: "acceso", "spento", "manutenzione"
├── Temperature (Double, Readable)
│   └── Unità: °C, Range: -40.0 a +85.0
├── CrowdLevel (Double, Readable)
│   └── Unità: %, Range: 0.0 a 100.0
└── SetAlarmWithLevel (Method)
    ├── Input Arguments: 
    │   ├── alarmActive (Boolean)
    │   └── soundLevel (Double) [dB, Range: 50.0-120.0]
    └── Output Arguments: StatusCode
```

## Istanze dei Moduli

### Moduli Base
- **BaseModule_001**: `ns=2;s=StationGateway.BaseModule_001`
- **BaseModule_002**: `ns=2;s=StationGateway.BaseModule_002`

### Moduli Avanzati  
- **AdvancedModule_001**: `ns=2;s=StationGateway.AdvancedModule_001`
- **AdvancedModule_002**: `ns=2;s=StationGateway.AdvancedModule_002`

## NodeId Examples
```
ns=2;s=StationGateway
ns=2;s=StationGateway.BaseModule_001
ns=2;s=StationGateway.BaseModule_001.SystemState
ns=2;s=StationGateway.BaseModule_001.Temperature
ns=2;s=StationGateway.BaseModule_001.SetAlarm
ns=2;s=StationGateway.AdvancedModule_001.CrowdLevel
ns=2;s=StationGateway.AdvancedModule_001.SetAlarmWithLevel
```

## Valori di Default delle Variabili

### Moduli Base
- **BaseModule_001**: SystemState="acceso", Temperature=22.5°C
- **BaseModule_002**: SystemState="acceso", Temperature=21.8°C

### Moduli Avanzati
- **AdvancedModule_001**: SystemState="acceso", Temperature=23.1°C, CrowdLevel=35.0%
- **AdvancedModule_002**: SystemState="manutenzione", Temperature=20.5°C, CrowdLevel=0.0%

## Metodi Implementati

### SetAlarm (BaseModuleType)
```javascript
function setAlarm(alarmActive) {
    // Logica per attivare/disattivare allarme acustico
    // Aggiorna variabile interna del modulo
    return StatusCodes.Good;
}
```

### SetAlarmWithLevel (AdvancedModuleType)
```javascript
function setAlarmWithLevel(alarmActive, soundLevel) {
    // Valida range soundLevel (50-120 dB)
    // Logica per attivare/disattivare allarme con livello specifico
    // Aggiorna variabili interne del modulo
    return StatusCodes.Good;
}
```