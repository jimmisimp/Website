// Script to insert sample data for testing the get-all-words endpoint
const { DataAPIClient } = require('@datastax/astra-db-ts');
require('dotenv').config();

// Environment Variables
const astraToken = process.env.REACT_APP_ASTRA_DB_TOKEN;
const astraEndpoint = process.env.REACT_APP_ASTRA_DB_ID;

if (!astraToken || !astraEndpoint) {
  console.error("Missing Astra DB credentials in .env file!");
  process.exit(1);
}

async function insertSampleData() {
  console.log("Connecting to Astra DB...");
  
  try {
    // Initialize Astra client
    const astraClient = new DataAPIClient(astraToken);
    const astraDb = astraClient.db(astraEndpoint);
    
    // Get the table
    const tableName = 'round_data';
    const table = await astraDb.table(tableName);
    console.log(`Connected to table: ${tableName}`);
    
    // Sample words to insert with correct column names from error message:
    // id(int), "aiWord"(text), "correctGuess"(text), "roundNumber"(int), "userWord"(text)
    const sampleWords = [
      { id: 1001, userWord: "elephant", aiWord: "animal", correctGuess: "mammal", roundNumber: 1 },
      { id: 1002, userWord: "banana", aiWord: "fruit", correctGuess: "yellow", roundNumber: 1 },
      { id: 1003, userWord: "computer", aiWord: "device", correctGuess: "electronic", roundNumber: 1 },
      { id: 1004, userWord: "ocean", aiWord: "water", correctGuess: "blue", roundNumber: 1 },
      { id: 1005, userWord: "mountain", aiWord: "tall", correctGuess: "climb", roundNumber: 1 },
      { id: 1006, userWord: "elephant", aiWord: "trunk", correctGuess: "gray", roundNumber: 1 } // Duplicate word to test deduplication
    ];
    
    console.log(`Inserting ${sampleWords.length} sample records...`);
    
    // Insert the records one by one
    for (const record of sampleWords) {
      await table.insertOne(record);
      console.log(`Inserted: ${record.userWord}`);
    }
    
    console.log("Sample data inserted successfully!");
    console.log("\nYou can now run: node scripts/query-all-words.js");
    
  } catch (error) {
    console.error("Error inserting sample data:", error);
    if (error.errors) {
      console.error("Astra DB Error details:", error.errors);
    }
  }
}

// Run the insertion
insertSampleData(); 