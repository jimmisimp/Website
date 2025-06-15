// Simple script to query the /api/get-all-words endpoint and display results
const API_URL = 'http://localhost:3001/api/get-all-words';

async function queryAllWords() {
  console.log(`Querying endpoint: ${API_URL}`);
  
  try {
    const response = await fetch(API_URL);
    const data = await response.json();
    
    console.log('Status:', response.status);
    console.log('Response:');
    
    if (data.uniqueWords && Array.isArray(data.uniqueWords)) {
      console.log(`Found ${data.uniqueWords.length} unique words:`);
      if (data.uniqueWords.length === 0) {
        console.log('  No words found in the database.');
      } else {
        data.uniqueWords.forEach((word, index) => {
          console.log(`  ${index + 1}. ${word}`);
        });
      }
    } else {
      console.log('Unexpected response format:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('Error querying endpoint:');
    console.error('Error:', error.message);
    console.error('Make sure the server is running with: npm run start:backend');
  }
  
  // Add a delay to ensure we see all output
  console.log("\nQuery complete. You may need to add some sample data to see more results.");
}

// Run the query
queryAllWords(); 