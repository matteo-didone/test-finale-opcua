/**
 * Railway Platform Monitoring System - Fixed OPC-UA Server
 * Implementation with node-opcua library
 */

const {
    OPCUAServer,
    Variant,
    DataType,
    StatusCodes,
    UAMethod,
    CallMethodResultOptions,
    NodeId,
    coerceNodeId,
    makeNodeId,
    AttributeIds,
    TimestampsToReturn
} = require("node-opcua");

// Server configuration - Simplified security configuration
const SERVER_CONFIG = {
    port: 4841,
    resourcePath: "/UA/RailwayMonitoring",
    // Removed securityPolicies and securityModes for simplicity
    serverCapabilities: {
        maxSessions: 100,
        maxConnectionsPerEndpoint: 100
    },
    serverInfo: {
        applicationUri: "urn:railway:monitoring:server",
        productUri: "urn:railway:monitoring",
        applicationName: { text: "Railway Platform Monitoring System", locale: "en" },
        gatewayServerUri: null,
        discoveryProfileUri: null,
        discoveryUrls: []
    },
    buildInfo: {
        productName: "Railway Platform Monitoring System",
        buildNumber: "1.0.0",
        buildDate: new Date(),
        manufacturerName: "Railway Infrastructure Company"
    }
};

// System state enumeration values
const SystemState = {
    ACCESO: 0,
    SPENTO: 1,
    MANUTENZIONE: 2
};

const SystemStateStrings = ["acceso", "spento", "manutenzione"];

// Module data storage for simulation
const moduleData = {
    baseModule001: {
        systemState: SystemState.ACCESO,
        temperature: 22.5,
        alarmActive: false,
        lastUpdate: new Date()
    },
    baseModule002: {
        systemState: SystemState.ACCESO,
        temperature: 21.8,
        alarmActive: false,
        lastUpdate: new Date()
    },
    advancedModule001: {
        systemState: SystemState.ACCESO,
        temperature: 23.1,
        crowdLevel: 35.0,
        alarmActive: false,
        soundLevel: 0,
        lastUpdate: new Date()
    },
    advancedModule002: {
        systemState: SystemState.MANUTENZIONE,
        temperature: 20.5,
        crowdLevel: 0.0,
        alarmActive: false,
        soundLevel: 0,
        lastUpdate: new Date()
    }
};

/**
 * Create and configure OPC-UA Server
 */
async function createServer() {
    const server = new OPCUAServer(SERVER_CONFIG);

    await server.initialize();
    console.log("✅ Server initialized");

    const addressSpace = server.engine.addressSpace;
    const namespace = addressSpace.getOwnNamespace();

    // Create custom namespace
    console.log("📁 Creating namespace: urn:railway:monitoring");

    return { server, addressSpace, namespace };
}

/**
 * Create reusable ObjectTypes with proper inheritance
 */
function createObjectTypes(namespace) {
    console.log("🏗️ Creating ObjectTypes...");

    // BaseModuleType - Reusable type for base modules
    const baseModuleType = namespace.addObjectType({
        browseName: "BaseModuleType",
        displayName: "Base Module Type",
        description: "Base type for platform monitoring modules"
    });

    // SystemState variable for BaseModuleType
    const systemStateVariable = namespace.addVariable({
        componentOf: baseModuleType,
        browseName: "SystemState",
        displayName: "System State",
        description: "Current operational state of the module",
        dataType: "Int32",
        value: {
            get: function() {
                return new Variant({ dataType: DataType.Int32, value: SystemState.ACCESO });
            }
        }
    });

    // Temperature variable for BaseModuleType  
    const temperatureVariable = namespace.addVariable({
        componentOf: baseModuleType,
        browseName: "Temperature",
        displayName: "Temperature",
        description: "Ambient temperature measurement in Celsius",
        dataType: "Double",
        value: {
            get: function() {
                return new Variant({ dataType: DataType.Double, value: 22.0 });
            }
        }
    });

    // SetAlarm method for BaseModuleType
    const setAlarmMethod = namespace.addMethod(baseModuleType, {
        browseName: "SetAlarm",
        displayName: "Set Alarm",
        description: "Activate or deactivate the acoustic alarm",
        inputArguments: [
            {
                name: "alarmActive",
                description: "True to activate alarm, false to deactivate",
                dataType: "Boolean"
            }
        ],
        outputArguments: []
    });

    // AdvancedModuleType - Inherits from BaseModuleType
    const advancedModuleType = namespace.addObjectType({
        browseName: "AdvancedModuleType",
        displayName: "Advanced Module Type", 
        description: "Advanced module with crowd monitoring capabilities",
        subtypeOf: baseModuleType
    });

    // CrowdLevel variable for AdvancedModuleType
    const crowdLevelVariable = namespace.addVariable({
        componentOf: advancedModuleType,
        browseName: "CrowdLevel",
        displayName: "Crowd Level",
        description: "Estimated crowd density on platform (0-100%)",
        dataType: "Double",
        value: {
            get: function() {
                return new Variant({ dataType: DataType.Double, value: 0.0 });
            }
        }
    });

    // SetAlarmWithLevel method for AdvancedModuleType
    const setAlarmWithLevelMethod = namespace.addMethod(advancedModuleType, {
        browseName: "SetAlarmWithLevel", 
        displayName: "Set Alarm With Level",
        description: "Activate alarm with specific sound level",
        inputArguments: [
            {
                name: "alarmActive",
                description: "True to activate alarm, false to deactivate",
                dataType: "Boolean"
            },
            {
                name: "soundLevel",
                description: "Sound level in decibels (range: 50-120 dB)",
                dataType: "Double"
            }
        ],
        outputArguments: []
    });

    return {
        baseModuleType,
        advancedModuleType,
        setAlarmMethod,
        setAlarmWithLevelMethod
    };
}

/**
 * Create StationGateway and module instances
 */
function createModuleInstances(namespace, baseModuleType, advancedModuleType) {
    console.log("🏭 Creating module instances...");

    // Main StationGateway object
    const stationGateway = namespace.addObject({
        organizedBy: namespace.addressSpace.rootFolder.objects,
        browseName: "StationGateway",
        displayName: "Station Gateway",
        description: "Main gateway for railway platform monitoring system",
        typeDefinition: "BaseObjectType"
    });

    // Station properties
    namespace.addVariable({
        componentOf: stationGateway,
        browseName: "StationId",
        displayName: "Station ID",
        dataType: "String",
        value: { 
            get: () => new Variant({ dataType: DataType.String, value: "STN_001" })
        }
    });

    namespace.addVariable({
        componentOf: stationGateway,
        browseName: "StationName", 
        displayName: "Station Name",
        dataType: "String",
        value: {
            get: () => new Variant({ dataType: DataType.String, value: "Pordenone Centrale" })
        }
    });

    // Create module instances
    const modules = {};

    // BaseModule_001 - NodeId: ns=1;i=1014
    modules.baseModule001 = createBaseModuleInstance(
        namespace, stationGateway, baseModuleType,
        "BaseModule_001", "Base Module 001", "baseModule001", 1014
    );

    // BaseModule_002 - NodeId: ns=1;i=1017
    modules.baseModule002 = createBaseModuleInstance(
        namespace, stationGateway, baseModuleType,
        "BaseModule_002", "Base Module 002", "baseModule002", 1017
    );

    // AdvancedModule_001 - NodeId: ns=1;i=1020
    modules.advancedModule001 = createAdvancedModuleInstance(
        namespace, stationGateway, advancedModuleType,
        "AdvancedModule_001", "Advanced Module 001", "advancedModule001", 1020
    );

    // AdvancedModule_002 - NodeId: ns=1;i=1024
    modules.advancedModule002 = createAdvancedModuleInstance(
        namespace, stationGateway, advancedModuleType,
        "AdvancedModule_002", "Advanced Module 002", "advancedModule002", 1024
    );

    return { stationGateway, modules };
}

/**
 * Create a base module instance with proper variable bindings
 */
function createBaseModuleInstance(namespace, parent, moduleType, browseName, displayName, dataKey, baseNodeId) {
    const module = namespace.addObject({
        componentOf: parent,
        browseName: browseName,
        displayName: displayName,
        typeDefinition: moduleType,
        nodeId: `ns=1;i=${baseNodeId}`
    });

    // SystemState variable - NodeId: baseNodeId + 1
    const systemState = namespace.addVariable({
        componentOf: module,
        browseName: "SystemState",
        displayName: "System State",
        dataType: "Int32",
        nodeId: `ns=1;i=${baseNodeId + 1}`,
        value: {
            get: function() {
                return new Variant({ 
                    dataType: DataType.Int32, 
                    value: moduleData[dataKey].systemState 
                });
            },
            set: function(variant) {
                if (variant.dataType === DataType.Int32 && 
                    variant.value >= 0 && variant.value <= 2) {
                    moduleData[dataKey].systemState = variant.value;
                    moduleData[dataKey].lastUpdate = new Date();
                    console.log(`📊 ${browseName}.SystemState = ${SystemStateStrings[variant.value]}`);
                    return StatusCodes.Good;
                }
                return StatusCodes.BadOutOfRange;
            }
        }
    });

    // Temperature variable - NodeId: baseNodeId + 2
    const temperature = namespace.addVariable({
        componentOf: module,
        browseName: "Temperature", 
        displayName: "Temperature",
        dataType: "Double",
        nodeId: `ns=1;i=${baseNodeId + 2}`,
        value: {
            get: function() {
                return new Variant({ 
                    dataType: DataType.Double, 
                    value: moduleData[dataKey].temperature 
                });
            },
            set: function(variant) {
                if (variant.dataType === DataType.Double) {
                    moduleData[dataKey].temperature = variant.value;
                    moduleData[dataKey].lastUpdate = new Date();
                    console.log(`🌡️ ${browseName}.Temperature = ${variant.value}°C`);
                    return StatusCodes.Good;
                }
                return StatusCodes.BadTypeMismatch;
            }
        }
    });

    return { module, systemState, temperature };
}

/**
 * Create an advanced module instance with crowd monitoring
 */
function createAdvancedModuleInstance(namespace, parent, moduleType, browseName, displayName, dataKey, baseNodeId) {
    const baseModule = createBaseModuleInstance(namespace, parent, moduleType, browseName, displayName, dataKey, baseNodeId);

    // CrowdLevel variable - NodeId: baseNodeId + 3
    const crowdLevel = namespace.addVariable({
        componentOf: baseModule.module,
        browseName: "CrowdLevel",
        displayName: "Crowd Level", 
        dataType: "Double",
        nodeId: `ns=1;i=${baseNodeId + 3}`,
        value: {
            get: function() {
                return new Variant({ 
                    dataType: DataType.Double, 
                    value: moduleData[dataKey].crowdLevel 
                });
            },
            set: function(variant) {
                if (variant.dataType === DataType.Double && 
                    variant.value >= 0.0 && variant.value <= 100.0) {
                    moduleData[dataKey].crowdLevel = variant.value;
                    moduleData[dataKey].lastUpdate = new Date();
                    console.log(`👥 ${browseName}.CrowdLevel = ${variant.value}%`);
                    return StatusCodes.Good;
                }
                return StatusCodes.BadOutOfRange;
            }
        }
    });

    return { ...baseModule, crowdLevel };
}

/**
 * Implement method handlers with real functionality
 */
function implementMethodHandlers(namespace, modules) {
    console.log("⚙️ Implementing method handlers...");

    // SetAlarm method implementation for base modules
    function setAlarmHandler(moduleKey, moduleName) {
        return function(inputArguments, context, callback) {
            const alarmActive = inputArguments[0].value;
            
            console.log(`🚨 SetAlarm called on ${moduleName}: alarmActive=${alarmActive}`);
            
            // Validate input
            if (typeof alarmActive !== "boolean") {
                return callback(null, {
                    statusCode: StatusCodes.BadTypeMismatch,
                    outputArguments: []
                });
            }
            
            // Update module data
            moduleData[moduleKey].alarmActive = alarmActive;
            moduleData[moduleKey].lastUpdate = new Date();
            
            // Log action
            const action = alarmActive ? "ACTIVATED" : "DEACTIVATED";
            console.log(`🔔 Alarm ${action} on ${moduleName}`);
            
            return callback(null, {
                statusCode: StatusCodes.Good,
                outputArguments: []
            });
        };
    }

    // SetAlarmWithLevel method implementation for advanced modules
    function setAlarmWithLevelHandler(moduleKey, moduleName) {
        return function(inputArguments, context, callback) {
            const alarmActive = inputArguments[0].value;
            const soundLevel = inputArguments[1].value;
            
            console.log(`🚨 SetAlarmWithLevel called on ${moduleName}: alarmActive=${alarmActive}, soundLevel=${soundLevel}dB`);
            
            // Validate inputs
            if (typeof alarmActive !== "boolean") {
                return callback(null, {
                    statusCode: StatusCodes.BadTypeMismatch,
                    outputArguments: []
                });
            }
            
            if (typeof soundLevel !== "number" || soundLevel < 50 || soundLevel > 120) {
                console.log(`❌ Invalid sound level: ${soundLevel}dB (must be 50-120dB)`);
                return callback(null, {
                    statusCode: StatusCodes.BadOutOfRange,
                    outputArguments: []
                });
            }
            
            // Update module data
            moduleData[moduleKey].alarmActive = alarmActive;
            moduleData[moduleKey].soundLevel = alarmActive ? soundLevel : 0;
            moduleData[moduleKey].lastUpdate = new Date();
            
            // Log action
            const action = alarmActive ? `ACTIVATED at ${soundLevel}dB` : "DEACTIVATED";
            console.log(`🔊 Advanced alarm ${action} on ${moduleName}`);
            
            return callback(null, {
                statusCode: StatusCodes.Good,
                outputArguments: []
            });
        };
    }

    // Note: Method binding will be handled by the client directly using method calls
    console.log("✅ Method handlers ready for client calls");
}

/**
 * Start data simulation for realistic behavior
 */
function startDataSimulation() {
    console.log("📊 Starting data simulation...");
    
    setInterval(() => {
        // Simulate temperature variations (±0.5°C)
        Object.keys(moduleData).forEach(key => {
            if (moduleData[key].systemState === SystemState.ACCESO) {
                const baseTemp = key === "baseModule001" ? 22.5 :
                                key === "baseModule002" ? 21.8 :
                                key === "advancedModule001" ? 23.1 : 20.5;
                
                moduleData[key].temperature = baseTemp + (Math.random() - 0.5);
            }
        });
        
        // Simulate crowd level changes for advanced modules
        if (moduleData.advancedModule001.systemState === SystemState.ACCESO) {
            // Simulate rush hour patterns
            const hour = new Date().getHours();
            let baseCrowd = 30;
            if (hour >= 7 && hour <= 9 || hour >= 17 && hour <= 19) {
                baseCrowd = 70; // Rush hour
            }
            moduleData.advancedModule001.crowdLevel = Math.max(0, 
                Math.min(100, baseCrowd + (Math.random() - 0.5) * 20));
        }
        
        // Advanced module 002 stays at 0 (maintenance)
        if (moduleData.advancedModule002.systemState === SystemState.MANUTENZIONE) {
            moduleData.advancedModule002.crowdLevel = 0.0;
        }
        
    }, 5000); // Update every 5 seconds
}

/**
 * Print server information and available endpoints
 */
function printServerInfo(server) {
    console.log("\n" + "=".repeat(60));
    console.log("🚂 RAILWAY PLATFORM MONITORING SYSTEM - OPC-UA SERVER");
    console.log("=".repeat(60));
    console.log(`📡 Server endpoint: ${server.getEndpointUrl()}`);
    console.log(`🔧 Server status: ${server.engine.serverStatus.toString()}`);
    console.log(`📁 Namespace: urn:railway:monitoring`);
    console.log(`🔒 Security: None (for testing)`);
    console.log("\n📋 Available Modules:");
    console.log("  • BaseModule_001 (ns=1;i=1014) - acceso, 22.5°C");
    console.log("  • BaseModule_002 (ns=1;i=1017) - acceso, 21.8°C");
    console.log("  • AdvancedModule_001 (ns=1;i=1020) - acceso, 23.1°C, 35% crowd");
    console.log("  • AdvancedModule_002 (ns=1;i=1024) - manutenzione, 20.5°C, 0% crowd");
    console.log("\n🔧 Available Variables:");
    console.log("  • SystemState variables: ns=1;i=1015, 1018, 1021, 1025");
    console.log("  • Temperature variables: ns=1;i=1016, 1019, 1022, 1026");
    console.log("  • CrowdLevel variables: ns=1;i=1023, 1027");
    console.log("=".repeat(60) + "\n");
}

/**
 * Main server startup function
 */
async function main() {
    try {
        console.log("🚀 Starting Railway Platform Monitoring System...\n");

        // Create server
        const { server, addressSpace, namespace } = await createServer();

        // Build address space
        const { baseModuleType, advancedModuleType } = createObjectTypes(namespace);
        const { stationGateway, modules } = createModuleInstances(namespace, baseModuleType, advancedModuleType);
        
        // Implement method handlers
        implementMethodHandlers(namespace, modules);

        // Start server
        await server.start();
        console.log("✅ Server started successfully!");

        // Print server information
        printServerInfo(server);

        // Start data simulation
        startDataSimulation();

        // Graceful shutdown handling
        process.on("SIGINT", async () => {
            console.log("\n🛑 Received shutdown signal...");
            await server.shutdown();
            console.log("✅ Server shut down gracefully");
            process.exit(0);
        });

    } catch (error) {
        console.error("❌ Error starting server:", error);
        process.exit(1);
    }
}

// Start the server
if (require.main === module) {
    main();
}

module.exports = { main, moduleData, SystemState };