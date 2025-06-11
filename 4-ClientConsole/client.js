/**
 * Railway Platform Monitoring System - Auto-Discovery Client
 * Client che trova automaticamente l'endpoint corretto
 */

const {
    OPCUAClient,
    AttributeIds,
    TimestampsToReturn,
    ClientSubscription,
    ClientMonitoredItem,
    DataValue,
    Variant,
    DataType,
    StatusCodes,
    BrowseDirection,
    NodeClass,
    ReferenceTypeIds
} = require("node-opcua");

// Possible endpoints to try
const POSSIBLE_ENDPOINTS = [
    "opc.tcp://THINKPADMATTEO:4841/UA/RailwayMonitoring",
    "opc.tcp://localhost:4841/UA/RailwayMonitoring",
    "opc.tcp://127.0.0.1:4841/UA/RailwayMonitoring"
];

// Client configuration
const CLIENT_CONFIG = {
    applicationName: "Railway Monitoring Dynamic Client",
    connectionStrategy: {
        initialDelay: 1000,
        maxRetry: 1,
        maxDelay: 5000
    },
    securityMode: "None",
    securityPolicy: "None"
};

// System state mapping
const SystemStateStrings = ["acceso", "spento", "manutenzione"];

// Module mapping for better organization
const ModuleMapping = {
    'BaseModule_001': {
        systemState: 'ns=1;i=1015',
        temperature: 'ns=1;i=1016'
    },
    'BaseModule_002': {
        systemState: 'ns=1;i=1018', 
        temperature: 'ns=1;i=1019'
    },
    'AdvancedModule_001': {
        systemState: 'ns=1;i=1021',
        temperature: 'ns=1;i=1022',
        crowdLevel: 'ns=1;i=1023'
    },
    'AdvancedModule_002': {
        systemState: 'ns=1;i=1025',
        temperature: 'ns=1;i=1026', 
        crowdLevel: 'ns=1;i=1027'
    }
};

// Global variables
let client = null;
let session = null;
let subscription = null;
let moduleData = {};
let connectedEndpoint = null;

/**
 * Format timestamp for console output
 */
function formatTimestamp() {
    return new Date().toLocaleString('it-IT', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

/**
 * Print formatted header
 */
function printHeader() {
    console.clear();
    console.log("=".repeat(80));
    console.log("🚂 RAILWAY MONITORING - AUTO-DISCOVERY CLIENT");
    console.log("=".repeat(80));
    console.log(`⏰ Started at: ${formatTimestamp()}`);
    console.log("=".repeat(80));
    console.log("");
}

/**
 * Format value based on variable type
 */
function formatValue(value, variableType) {
    if (variableType === 'systemState') {
        return `${SystemStateStrings[value] || 'unknown'} (${value})`;
    } else if (variableType === 'temperature') {
        return `${value.toFixed(1)}°C`;
    } else if (variableType === 'crowdLevel') {
        return `${value.toFixed(1)}%`;
    }
    return value;
}

/**
 * Get module icon based on name and state
 */
function getModuleIcon(moduleName, systemState) {
    if (moduleName.includes('Advanced')) {
        return systemState === 0 ? "🟦" : systemState === 2 ? "🔧" : "🔴";
    } else {
        return systemState === 0 ? "🟢" : systemState === 2 ? "🔧" : "🔴";
    }
}

/**
 * Try to connect to different endpoints automatically
 */
async function findAndConnectToServer() {
    console.log("🔍 Auto-discovering server endpoint...");
    
    for (const endpoint of POSSIBLE_ENDPOINTS) {
        try {
            console.log(`🔌 Trying endpoint: ${endpoint}`);
            
            // Create new client for each attempt
            client = OPCUAClient.create({
                ...CLIENT_CONFIG,
                endpoint: endpoint
            });
            
            // Try to connect
            await client.connect(endpoint);
            console.log(`✅ Successfully connected to: ${endpoint}`);
            
            connectedEndpoint = endpoint;
            return endpoint;
            
        } catch (error) {
            console.log(`❌ Failed to connect to ${endpoint}: ${error.message.split('\n')[0]}`);
            
            // Cleanup failed client
            if (client) {
                try {
                    await client.disconnect();
                } catch (e) {
                    // Ignore cleanup errors
                }
                client = null;
            }
        }
    }
    
    throw new Error("Could not connect to any available endpoint");
}

/**
 * Create session after successful connection
 */
async function createSession() {
    try {
        console.log("📋 Creating session...");
        session = await client.createSession();
        console.log("✅ Session created");
        
        console.log(`📡 Connected to: ${connectedEndpoint}`);
        console.log("");
        
        return session;
    } catch (error) {
        console.error("❌ Session creation failed:", error.message);
        throw error;
    }
}

/**
 * Read station information
 */
async function readStationInfo() {
    try {
        const stationData = await session.read([
            { nodeId: "ns=1;i=1012", attributeId: AttributeIds.Value }, // StationId
            { nodeId: "ns=1;i=1013", attributeId: AttributeIds.Value }  // StationName
        ]);
        
        if (stationData[0].statusCode === StatusCodes.Good && 
            stationData[1].statusCode === StatusCodes.Good) {
            
            const stationId = stationData[0].value.value;
            const stationName = stationData[1].value.value;
            
            console.log(`🏗️ Station: ${stationName} (ID: ${stationId})`);
            console.log("");
        }
    } catch (error) {
        console.log("❌ Could not read station information");
    }
}

/**
 * Read all module data
 */
async function readAllModuleData() {
    try {
        console.log("📖 Reading module data...");
        console.log("");
        
        // Read all variables for all modules
        const readRequests = [];
        const nodeMapping = [];
        
        for (const [moduleName, variables] of Object.entries(ModuleMapping)) {
            for (const [variableType, nodeId] of Object.entries(variables)) {
                readRequests.push({
                    nodeId: nodeId,
                    attributeId: AttributeIds.Value
                });
                nodeMapping.push({ moduleName, variableType });
            }
        }
        
        const results = await session.read(readRequests);
        
        // Process results and organize by module
        moduleData = {};
        
        for (let i = 0; i < results.length; i++) {
            const result = results[i];
            const { moduleName, variableType } = nodeMapping[i];
            
            if (result.statusCode === StatusCodes.Good) {
                if (!moduleData[moduleName]) {
                    moduleData[moduleName] = {};
                }
                moduleData[moduleName][variableType] = result.value.value;
            }
        }
        
        // Display organized module data
        console.log("📊 Initial Module States:");
        console.log("-".repeat(80));
        
        for (const [moduleName, data] of Object.entries(moduleData)) {
            const icon = getModuleIcon(moduleName, data.systemState);
            const stateStr = formatValue(data.systemState, 'systemState');
            const tempStr = formatValue(data.temperature, 'temperature');
            
            let output = `${icon} ${moduleName}: ${stateStr} | ${tempStr}`;
            
            if (data.crowdLevel !== undefined) {
                const crowdStr = formatValue(data.crowdLevel, 'crowdLevel');
                output += ` | ${crowdStr}`;
            }
            
            console.log(output);
        }
        
        console.log("-".repeat(80));
        console.log("");
        
    } catch (error) {
        console.error("❌ Failed to read module data:", error.message);
    }
}

/**
 * Create subscription for monitoring changes
 */
async function createSubscription() {
    try {
        console.log("📡 Creating subscription for monitoring...");
        
        subscription = ClientSubscription.create(session, {
            requestedPublishingInterval: 1000,
            requestedLifetimeCount: 1000,
            requestedMaxKeepAliveCount: 12,
            maxNotificationsPerPublish: 1000,
            publishingEnabled: true,
            priority: 10
        });
        
        subscription.on("started", () => {
            console.log("✅ Subscription started - monitoring changes only");
            console.log("\n🔍 Live Monitoring (changes will be shown):");
            console.log("-".repeat(80));
        });
        
        return subscription;
    } catch (error) {
        console.error("❌ Failed to create subscription:", error);
        throw error;
    }
}

/**
 * Monitor all module variables
 */
async function monitorModuleVariables() {
    for (const [moduleName, variables] of Object.entries(ModuleMapping)) {
        for (const [variableType, nodeId] of Object.entries(variables)) {
            try {
                const monitoredItem = ClientMonitoredItem.create(
                    subscription,
                    { nodeId: nodeId, attributeId: AttributeIds.Value },
                    { samplingInterval: 1000, discardOldest: true, queueSize: 10 },
                    TimestampsToReturn.Both
                );
                
                monitoredItem.on("changed", (dataValue) => {
                    if (dataValue.statusCode === StatusCodes.Good) {
                        const timestamp = formatTimestamp();
                        const value = formatValue(dataValue.value.value, variableType);
                        
                        // Update internal data
                        if (!moduleData[moduleName]) moduleData[moduleName] = {};
                        moduleData[moduleName][variableType] = dataValue.value.value;
                        
                        // Get appropriate icon
                        let icon = "📊";
                        if (variableType === 'systemState') {
                            icon = getModuleIcon(moduleName, dataValue.value.value);
                        } else if (variableType === 'crowdLevel') {
                            icon = "👥";
                        } else if (variableType === 'temperature') {
                            icon = "🌡️";
                        }
                        
                        console.log(`${icon} ${timestamp} | ${moduleName}.${variableType}: ${value}`);
                    }
                });
                
            } catch (error) {
                console.log(`❌ Failed to monitor ${moduleName}.${variableType}: ${error.message}`);
            }
        }
    }
}

/**
 * Graceful shutdown
 */
async function shutdown() {
    console.log("\n🛑 Shutting down client...");
    
    try {
        if (subscription) {
            await subscription.terminate();
            console.log("✅ Subscription terminated");
        }
        
        if (session) {
            await session.close();
            console.log("✅ Session closed");
        }
        
        if (client) {
            await client.disconnect();
            console.log("✅ Client disconnected");
        }
        
        console.log("👋 Client shutdown complete");
        process.exit(0);
    } catch (error) {
        console.error("❌ Error during shutdown:", error.message);
        process.exit(1);
    }
}

/**
 * Main client function
 */
async function main() {
    try {
        printHeader();
        
        // Auto-discover and connect to server
        await findAndConnectToServer();
        await createSession();
        
        // Read station information
        await readStationInfo();
        
        // Read and display all module data
        await readAllModuleData();
        
        // Set up real-time monitoring
        await createSubscription();
        await monitorModuleVariables();
        
        console.log("\n💡 Press Ctrl+C to exit");
        console.log("🔧 Note: Method testing removed for simplicity");
        console.log("📊 Monitoring temperature and crowd level changes...");
        
        // Handle graceful shutdown
        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);
        
    } catch (error) {
        console.error("❌ Client error:", error.message);
        await shutdown();
    }
}

// Start the client
if (require.main === module) {
    main();
}

module.exports = { main };