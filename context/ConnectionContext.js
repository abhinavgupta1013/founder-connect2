/**
 * ConnectionContext.js
 * Context provider for managing connection states between users using Zilliz vector database
 */

const { createContext, useState, useEffect } = require('react');
const { ZillizClient } = require('@zilliz/milvus2-sdk-node');

// Create the Connection Context
const ConnectionContext = createContext();

// Connection Provider Component
const ConnectionProvider = ({ children }) => {
  const [connections, setConnections] = useState({});
  const [currentUserId, setCurrentUserId] = useState(null);

  // Initialize current user ID when component mounts
  useEffect(() => {
    // Get current user ID from the page
    const userId = document.getElementById('user-id')?.value;
    if (userId) {
      setCurrentUserId(userId);
    }
  }, []);

  // Function to update connection status for a specific user in Zilliz
  const updateConnection = async (userId, status) => {
    try {
      // Update local state
      setConnections(prev => ({
        ...prev,
        [userId]: status
      }));
      
      // Update in Zilliz
      if (currentUserId) {
        await zillizClient.connect();
        
        const collectionName = 'user_connections';
        
        // Check if collection exists, create if not
        const hasCollection = await zillizClient.hasCollection({
          collection_name: collectionName
        });
        
        if (!hasCollection) {
          // Create collection with schema
          await zillizClient.createCollection({
            collection_name: collectionName,
            fields: [
              {
                name: 'id',
                description: 'Connection ID',
                data_type: 'Int64',
                is_primary_key: true,
                autoID: true
              },
              {
                name: 'user_id',
                description: 'User ID',
                data_type: 'Int64'
              },
              {
                name: 'connected_user_id',
                description: 'Connected User ID',
                data_type: 'Int64'
              },
              {
                name: 'status',
                description: 'Connection Status',
                data_type: 'VarChar',
                max_length: 50
              }
            ]
          });
        }
        
        // Check if connection exists
        const searchParams = {
          collection_name: collectionName,
          expr: `user_id == ${currentUserId} && connected_user_id == ${userId}`
        };
        
        const searchResult = await zillizClient.search(searchParams);
        
        if (searchResult && searchResult.results && searchResult.results.length > 0) {
          // Update existing connection
          await zillizClient.update({
            collection_name: collectionName,
            expr: `user_id == ${currentUserId} && connected_user_id == ${userId}`,
            data: [{ status }]
          });
        } else {
          // Insert new connection
          await zillizClient.insert({
            collection_name: collectionName,
            data: [{
              user_id: parseInt(currentUserId),
              connected_user_id: parseInt(userId),
              status
            }]
          });
        }
      }
    } catch (error) {
      console.error('Error updating connection in Zilliz:', error);
    }
  };

  // Initialize Zilliz client
  const zillizClient = new ZillizClient({
    address: process.env.ZILLIZ_ENDPOINT || 'localhost:19530',
    username: process.env.ZILLIZ_USERNAME || '',
    password: process.env.ZILLIZ_PASSWORD || '',
    ssl: process.env.ZILLIZ_SSL === 'true'
  });

  // Load initial connection statuses from Zilliz
  useEffect(() => {
    if (currentUserId) {
      const fetchConnectionsFromZilliz = async () => {
        try {
          // Connect to Zilliz
          await zillizClient.connect();
          
          // Query the connections collection
          const collectionName = 'user_connections';
          
          // Check if collection exists, create if not
          const hasCollection = await zillizClient.hasCollection({
            collection_name: collectionName
          });
          
          if (!hasCollection) {
            console.log('Collection does not exist yet, initializing with empty data');
            setConnections({});
            return;
          }
          
          // Search for connections related to current user
          const searchParams = {
            collection_name: collectionName,
            expr: `user_id == ${currentUserId}`,
            output_fields: ['connected_user_id', 'status']
          };
          
          const searchResult = await zillizClient.search(searchParams);
          
          if (searchResult && searchResult.results) {
            // Transform results into the expected format
            const connectionData = {};
            searchResult.results.forEach(result => {
              connectionData[result.connected_user_id] = result.status;
            });
            
            setConnections(connectionData);
          }
        } catch (error) {
          console.error('Error loading connection statuses from Zilliz:', error);
          // Initialize with empty data on error
          setConnections({});
        }
      };
      
      fetchConnectionsFromZilliz();
    }
  }, [currentUserId]);

  return (
    <ConnectionContext.Provider value={{ connections, updateConnection, currentUserId }}>
      {children}
    </ConnectionContext.Provider>
  );
};

module.exports = { ConnectionContext, ConnectionProvider };