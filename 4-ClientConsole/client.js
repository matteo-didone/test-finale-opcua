/**
 * Railway Platform Monitoring System - Dynamic OPC-UA Client
 * Client che scopre automaticamente la struttura del server
 * 
 * Features:
 * - Esplorazione automatica dell'address space
 * - Scoperta dinamica di oggetti, variabili e metodi
 * - Monitoraggio automatico di tutti i nodi trovati
 * - Non richiede NodeId hardcoded
 */

const {
    OPCUAClient,
    AttributeIds,
    TimestampsToReturn,
    MonitoringParametersOptions,
    ReadValueIdOptions,
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

// Client configuration
const CLIENT_CONFIG = {
    applicationName: "Railway Monitoring Dynamic Client",
    connectionStrategy: {
        initialDelay: 1000,
        maxRetry: 3,
        maxDelay: 10000
    },
    securityMode: "None",
    securityPolicy: "None",
    endpoint: "opc.tcp://THINKPADMATTEO:4841/UA/RailwayMonitoring"
};

// System state mapping
const SystemStateStrings = ["acceso", "spento", "manutenzione"];

// Global variables
let client = null;
let session = null;
let subscription = null;
let discoveredNodes = {
    objects: [],
    variables: [],
    methods: []
};

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
    console.log("🚂 RAILWAY MONITORING - DYNAMIC CLIENT CONSOLE");
    console.log("=".repeat(80));
    console.log(`📡 Connected to: ${CLIENT_CONFIG.endpoint}`);
    console.log(`⏰ Started at: ${formatTimestamp()}`);
    console.log("=".repeat(80));
    console.log("");
}

/**
 * Format value based on variable name
 */
function formatValue(value, browseName) {
    if (browseName.includes('SystemState')) {
        return `${SystemStateStrings[value] || 'unknown'} (${value})`;
    } else if (browseName.includes('Temperature')) {
        return `${value.toFixed(1)}°C`;
    } else if (browseName.includes('CrowdLevel')) {
        return `${value.toFixed(1)}%`;
    }
    return value;
}

/**
 * Get module icon based on name and state
 */
function getModuleIcon(browseName, systemState) {
    if (browseName.includes('Advanced')) {
        return systemState === 0 ? "🟦" : systemState === 2 ? "🔧" : "🔴";
    } else {
        return systemState === 0 ? "🟢" : systemState === 2 ? "🔧" : "🔴";
    }
}

/**
 * Create and configure OPC-UA client
 */
async function createClient() {
    console.log("🔌 Creating OPC-UA client...");
    
    client = OPCUAClient.create(CLIENT_CONFIG);
    
    client.on("connection_reestablished", () => {
        console.log(`🔄 ${formatTimestamp()} - Connection reestablished`);
    });
    
    client.on("connection_lost", () => {
        console.log(`❌ ${formatTimestamp()} - Connection lost`);
    });
    
    return client;
}

/**
 * Connect to server and create session
 */
async function connectToServer() {
    try {
        console.log("🤝 Connecting to server...");
        await client.connect(CLIENT_CONFIG.endpoint);
        console.log("✅ Connected to server");
        
        console.log("📋 Creating session...");
        session = await client.createSession();
        console.log("✅ Session created");
        
        return session;
    } catch (error) {
        console.error("❌ Connection failed:", error.message);
        throw error;
    }
}

/**
 * Browse recursively to discover all nodes
 */
async function browseRecursively(nodeId, level = 0, maxLevel = 3) {
    if (level > maxLevel) return;
    
    try {
        const browseResult = await session.browse({
            nodeId: nodeId,
            browseDirection: BrowseDirection.Forward,
            includeSubtypes: true,
            nodeClassMask: 0xFF // All node classes
        });
        
        if (browseResult.statusCode !== StatusCodes.Good) {
            return;
        }
        
        for (const reference of browseResult.references || []) {
            const targetNodeId = reference.nodeId;
            const browseName = reference.browseName ? reference.browseName.name : "Unknown";
            const nodeClass = reference.nodeClass;
            
            // Skip standard OPC-UA nodes - aggiustiamo la verifica
            if (!browseName || 
                browseName.startsWith('Server') || 
                browseName.startsWith('Namespace') ||
                browseName === 'Types' ||
                browseName === 'Views' ||
                browseName.includes('FolderType') ||
                browseName.includes('BaseObjectType')) {
                continue;
            }
            
            const nodeInfo = {
                nodeId: targetNodeId,
                browseName: browseName,
                displayName: (reference.displayName && reference.displayName.text) ? reference.displayName.text : browseName,
                nodeClass: nodeClass,
                level: level
            };
            
            // Categorize nodes
            if (nodeClass === NodeClass.Object) {
                discoveredNodes.objects.push(nodeInfo);
                console.log(`${'  '.repeat(level)}📁 Object: ${browseName} (${targetNodeId})`);
                
                // Browse deeper for objects
                await browseRecursively(targetNodeId, level + 1, maxLevel);
                
            } else if (nodeClass === NodeClass.Variable) {
                discoveredNodes.variables.push(nodeInfo);
                console.log(`${'  '.repeat(level)}📊 Variable: ${browseName} (${targetNodeId})`);
                
            } else if (nodeClass === NodeClass.Method) {
                discoveredNodes.methods.push(nodeInfo);
                console.log(`${'  '.repeat(level)}⚙️ Method: ${browseName} (${targetNodeId})`);
            }
        }
        
    } catch (error) {
        console.log(`${'  '.repeat(level)}❌ Browse error for ${nodeId}: ${error.message}`);
    }
}

/**
 * Discover all nodes in the server
 */
async function discoverNodes() {
    console.log("🔍 Discovering server nodes...");
    console.log("-".repeat(80));
    
    // Reset discovered nodes
    discoveredNodes = { objects: [], variables: [], methods: [] };
    
    // Try browsing from Objects folder first
    const objectsNodeId = "i=85"; // Standard Objects folder
    await browseRecursively(objectsNodeId);
    
    // If no nodes found, try alternative approach with known patterns
    if (discoveredNodes.objects.length === 0 && discoveredNodes.variables.length === 0) {
        console.log("🔄 No nodes found via browsing, trying direct approach...");
        await tryDirectNodeAccess();
    }
    
    console.log("-".repeat(80));
    console.log(`📊 Discovery complete: ${discoveredNodes.objects.length} objects, ${discoveredNodes.variables.length} variables, ${discoveredNodes.methods.length} methods`);
    console.log("");
    
    return discoveredNodes;
}

/**
 * Try to access known node patterns directly
 */
async function tryDirectNodeAccess() {
    const potentialNodes = [
        // Station Gateway (trovato dal test)
        { nodeId: "ns=1;i=1011", type: "object", name: "StationGateway" },
        { nodeId: "ns=1;i=1012", type: "variable", name: "StationId" },
        { nodeId: "ns=1;i=1013", type: "variable", name: "StationName" },
        
        // Base modules (dai risultati del test)
        { nodeId: "ns=1;i=1014", type: "object", name: "BaseModule_001" },
        { nodeId: "ns=1;i=1017", type: "object", name: "BaseModule_002" },
        
        // Advanced modules (dai risultati del test)
        { nodeId: "ns=1;i=1020", type: "object", name: "AdvancedModule_001" },
        { nodeId: "ns=1;i=1024", type: "object", name: "AdvancedModule_002" },
        
        // Prova anche le variabili che abbiamo trovato
        { nodeId: "ns=1;i=1001", type: "variable", name: "SystemState_1" },
        { nodeId: "ns=1;i=1002", type: "variable", name: "Temperature_1" },
        
        // Tentiamo range di ID per trovare altre variabili
        { nodeId: "ns=1;i=1003", type: "variable", name: "Variable_1003" },
        { nodeId: "ns=1;i=1004", type: "variable", name: "Variable_1004" },
        { nodeId: "ns=1;i=1005", type: "variable", name: "Variable_1005" },
        { nodeId: "ns=1;i=1006", type: "variable", name: "Variable_1006" },
        { nodeId: "ns=1;i=1007", type: "variable", name: "Variable_1007" },
        { nodeId: "ns=1;i=1008", type: "variable", name: "Variable_1008" },
        { nodeId: "ns=1;i=1009", type: "variable", name: "Variable_1009" },
        { nodeId: "ns=1;i=1010", type: "variable", name: "Variable_1010" },
        
        // Continua il range per i moduli
        { nodeId: "ns=1;i=1015", type: "variable", name: "Variable_1015" },
        { nodeId: "ns=1;i=1016", type: "variable", name: "Variable_1016" },
        { nodeId: "ns=1;i=1018", type: "variable", name: "Variable_1018" },
        { nodeId: "ns=1;i=1019", type: "variable", name: "Variable_1019" },
        { nodeId: "ns=1;i=1021", type: "variable", name: "Variable_1021" },
        { nodeId: "ns=1;i=1022", type: "variable", name: "Variable_1022" },
        { nodeId: "ns=1;i=1023", type: "variable", name: "Variable_1023" },
        { nodeId: "ns=1;i=1025", type: "variable", name: "Variable_1025" },
        { nodeId: "ns=1;i=1026", type: "variable", name: "Variable_1026" },
        { nodeId: "ns=1;i=1027", type: "variable", name: "Variable_1027" },
        { nodeId: "ns=1;i=1028", type: "variable", name: "Variable_1028" },
        { nodeId: "ns=1;i=1029", type: "variable", name: "Variable_1029" },
        { nodeId: "ns=1;i=1030", type: "variable", name: "Variable_1030" }
    ];
    
    for (const node of potentialNodes) {
        try {
            // Prima prova a leggere il valore
            const valueResult = await session.read({
                nodeId: node.nodeId,
                attributeId: AttributeIds.Value
            });
            
            if (valueResult.statusCode === StatusCodes.Good) {
                // Poi leggi il NodeClass per categorizzare correttamente
                const classResult = await session.read({
                    nodeId: node.nodeId,
                    attributeId: AttributeIds.NodeClass
                });
                
                // E anche il BrowseName per avere il nome corretto
                const nameResult = await session.read({
                    nodeId: node.nodeId,
                    attributeId: AttributeIds.BrowseName
                });
                
                const realName = nameResult.statusCode === StatusCodes.Good ? 
                    nameResult.value.value.name : node.name;
                
                const nodeInfo = {
                    nodeId: node.nodeId,
                    browseName: realName,
                    displayName: realName,
                    nodeClass: classResult.statusCode === StatusCodes.Good ? classResult.value.value : 1,
                    level: 1
                };
                
                if (node.type === "object" || nodeInfo.nodeClass === 1) {
                    discoveredNodes.objects.push(nodeInfo);
                    console.log(`📁 Found Object: ${realName} (${node.nodeId})`);
                } else if (node.type === "variable" || nodeInfo.nodeClass === 2) {
                    discoveredNodes.variables.push(nodeInfo);
                    console.log(`📊 Found Variable: ${realName} = ${valueResult.value.value} (${node.nodeId})`);
                } else if (node.type === "method" || nodeInfo.nodeClass === 4) {
                    discoveredNodes.methods.push(nodeInfo);
                    console.log(`⚙️ Found Method: ${realName} (${node.nodeId})`);
                }
            }
        } catch (error) {
            // Node doesn't exist or can't be read, continue silently
        }
    }
    
    // Anche prova a fare browse sui moduli che abbiamo trovato
    const moduleIds = ["ns=1;i=1014", "ns=1;i=1017", "ns=1;i=1020", "ns=1;i=1024"];
    
    for (const moduleId of moduleIds) {
        try {
            const browseResult = await session.browse(moduleId);
            if (browseResult.statusCode === StatusCodes.Good) {
                console.log(`🔍 Browsing module ${moduleId}:`);
                for (const ref of browseResult.references || []) {
                    const browseName = ref.browseName ? ref.browseName.name : "Unknown";
                    console.log(`  └─ ${browseName} (${ref.nodeId})`);
                    
                    // Aggiungi ai nodi scoperti
                    const nodeInfo = {
                        nodeId: ref.nodeId,
                        browseName: browseName,
                        displayName: browseName,
                        nodeClass: ref.nodeClass,
                        level: 2
                    };
                    
                    if (ref.nodeClass === 2) { // Variable
                        discoveredNodes.variables.push(nodeInfo);
                    } else if (ref.nodeClass === 4) { // Method
                        discoveredNodes.methods.push(nodeInfo);
                    }
                }
            }
        } catch (error) {
            // Continue if browse fails
        }
    }
}

/**
 * Read values from all discovered variables
 */
async function readAllValues() {
    if (discoveredNodes.variables.length === 0) {
        console.log("❌ No variables discovered");
        return;
    }
    
    try {
        console.log("📖 Reading values from all discovered variables...");
        
        const readRequest = discoveredNodes.variables.map(variable => ({
            nodeId: variable.nodeId,
            attributeId: AttributeIds.Value
        }));
        
        const results = await session.read(readRequest);
        
        console.log("\n📊 Current Values:");
        console.log("-".repeat(80));
        
        // Group by parent object
        const groupedVariables = {};
        
        for (let i = 0; i < discoveredNodes.variables.length; i++) {
            const variable = discoveredNodes.variables[i];
            const result = results[i];
            
            if (result.statusCode === StatusCodes.Good && result.value) {
                const value = result.value.value;
                const formattedValue = formatValue(value, variable.browseName);
                
                // Extract parent object name from browseName or nodeId
                let parentName = "Unknown";
                if (variable.browseName.includes('Module')) {
                    // Try to extract module name from context
                    const objectNode = discoveredNodes.objects.find(obj => 
                        variable.nodeId.toString().includes(obj.browseName)
                    );
                    if (objectNode) {
                        parentName = objectNode.browseName;
                    }
                } else {
                    // Look for parent in nodeId string
                    const nodeIdStr = variable.nodeId.toString();
                    const match = nodeIdStr.match(/s=([^.]+)/);
                    if (match) {
                        parentName = match[1];
                    }
                }
                
                if (!groupedVariables[parentName]) {
                    groupedVariables[parentName] = [];
                }
                
                groupedVariables[parentName].push({
                    name: variable.browseName,
                    value: formattedValue,
                    rawValue: value
                });
            }
        }
        
        // Display grouped results
        for (const [parentName, variables] of Object.entries(groupedVariables)) {
            const systemStateVar = variables.find(v => v.name.includes('SystemState'));
            const icon = systemStateVar ? getModuleIcon(parentName, systemStateVar.rawValue) : "📊";
            
            const valueStr = variables.map(v => `${v.name}: ${v.value}`).join(' | ');
            console.log(`${icon} ${parentName}: ${valueStr}`);
        }
        
        console.log("-".repeat(80));
        console.log("");
        
    } catch (error) {
        console.error("❌ Failed to read values:", error.message);
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
            console.log("✅ Subscription started - monitoring all variables");
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
 * Monitor all discovered variables
 */
async function monitorAllVariables() {
    for (const variable of discoveredNodes.variables) {
        try {
            const monitoredItem = ClientMonitoredItem.create(
                subscription,
                { nodeId: variable.nodeId, attributeId: AttributeIds.Value },
                { samplingInterval: 1000, discardOldest: true, queueSize: 10 },
                TimestampsToReturn.Both
            );
            
            monitoredItem.on("changed", (dataValue) => {
                if (dataValue.statusCode === StatusCodes.Good) {
                    const timestamp = formatTimestamp();
                    const value = formatValue(dataValue.value.value, variable.browseName);
                    
                    // Get icon for display
                    const isSystemState = variable.browseName.includes('SystemState');
                    const icon = isSystemState ? getModuleIcon(variable.browseName, dataValue.value.value) : "📊";
                    
                    console.log(`${icon} ${timestamp} | ${variable.browseName}: ${value}`);
                }
            });
            
        } catch (error) {
            console.log(`❌ Failed to monitor ${variable.browseName}: ${error.message}`);
        }
    }
}

/**
 * Test discovered methods
 */
async function testMethods() {
    if (discoveredNodes.methods.length === 0) {
        console.log("❌ No methods discovered to test");
        return;
    }
    
    console.log("\n🧪 Testing discovered methods in 10 seconds...");
    
    setTimeout(async () => {
        for (const method of discoveredNodes.methods.slice(0, 2)) { // Test first 2 methods
            try {
                console.log(`\n🚨 Testing method: ${method.browseName}`);
                
                // Find parent object
                const parentObject = discoveredNodes.objects.find(obj => 
                    method.nodeId.toString().includes(obj.browseName)
                );
                
                if (!parentObject) {
                    console.log(`❌ Could not find parent object for ${method.browseName}`);
                    continue;
                }
                
                // Prepare input arguments based on method name
                let inputArguments = [];
                if (method.browseName.includes('SetAlarm')) {
                    if (method.browseName.includes('WithLevel')) {
                        inputArguments = [
                            { dataType: DataType.Boolean, value: true },
                            { dataType: DataType.Double, value: 75.0 }
                        ];
                    } else {
                        inputArguments = [
                            { dataType: DataType.Boolean, value: true }
                        ];
                    }
                }
                
                const result = await session.call({
                    objectId: parentObject.nodeId,
                    methodId: method.nodeId,
                    inputArguments: inputArguments
                });
                
                if (result.statusCode === StatusCodes.Good) {
                    console.log(`✅ Method ${method.browseName} executed successfully`);
                } else {
                    console.log(`❌ Method ${method.browseName} failed: ${result.statusCode}`);
                }
                
            } catch (error) {
                console.log(`❌ Method ${method.browseName} error: ${error.message}`);
            }
        }
    }, 10000);
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
        
        // Create client and connect
        await createClient();
        await connectToServer();
        
        // Discover all nodes dynamically
        await discoverNodes();
        
        // Read initial values
        await readAllValues();
        
        // Set up real-time monitoring
        await createSubscription();
        await monitorAllVariables();
        
        // Test methods
        await testMethods();
        
        console.log("\n💡 Press Ctrl+C to exit");
        
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