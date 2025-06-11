# Punto 1 - Information Model e Diagramma

## Descrizione
Progettazione dell'Information Model per il sistema di monitoraggio delle banchine ferroviarie secondo le specifiche OPC-UA.

## Contenuto della cartella
- `information-model-specification.md` - Specifica completa dell'Information Model in formato ad albero

## Architettura del Sistema
Il sistema è strutturato attorno a un **StationGateway** che gestisce 4 moduli di monitoraggio:
- 2 **Moduli Base** (BaseModule_001, BaseModule_002)
- 2 **Moduli Avanzati** (AdvancedModule_001, AdvancedModule_002)

## Funzionalità Principali

### Moduli Base
- Monitoraggio stato sistema (acceso/spento/manutenzione)
- Rilevazione temperatura ambiente
- Comando allarme acustico on/off

### Moduli Avanzati
- Tutte le funzionalità dei moduli base
- Monitoraggio livello affollamento (0-100%)
- Comando allarme con controllo livello sonoro (dB)

## Convenzioni Adottate
- **Namespace**: `urn:railway:monitoring`
- **NodeId**: formato string-based (`ns=2;s=...`)
- **Metodi**: implementati con validazione parametri e StatusCode di ritorno
- **Variabili**: tipizzate secondo standard OPC-UA (String, Double, Boolean)

## Note Tecniche
- Ereditarietà: AdvancedModuleType estende BaseModuleType
- Validazione: range di valori definiti per temperatura, affollamento e livello sonoro
- Stato di default: moduli principalmente "acceso", uno in "manutenzione" per test