const { DataAPIClient } = require('@datastax/astra-db-ts');
const { OpenAI } = require('openai');

// Initialize clients
const astraToken = process.env.REACT_APP_ASTRA_DB_TOKEN;
const astraEndpoint = process.env.REACT_APP_ASTRA_DB_ID;
const openaiApiKey = process.env.REACT_APP_OPENAIKEY;

if (!astraToken || !astraEndpoint || !openaiApiKey) {
  console.error("Missing required environment variables!");
  return {
    statusCode: 500,
    body: JSON.stringify({ message: 'Server configuration error.' }),
  };
}

const astraClient = new DataAPIClient(astraToken);
const astraDb = astraClient.db(astraEndpoint);
const openai = new OpenAI({ apiKey: openaiApiKey });

const ASTRA_TABLE_NAME = 'round_data';

exports.handler = async (event, context) => {
  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method Not Allowed' }),
      headers: { 'Allow': 'GET' }
    };
  }

  try {
    const { word } = event.queryStringParameters || {};

    if (!word) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing "word" query parameter' })
      };
    }

    let astraTable;
     try {
         astraTable = await astraDb.table(ASTRA_TABLE_NAME);
         if (!astraTable) throw new Error(`Table ${ASTRA_TABLE_NAME} not found.`);
     } catch (tableError) {
         console.error(`Failed to get table ${ASTRA_TABLE_NAME}:`, tableError);
         return { statusCode: 500, body: JSON.stringify({ message: 'Database table not available.' }) };
     }

    // 1. Generate embedding for the input word
    const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: word,
    });
    const rawEmbedding = embeddingResponse.data[0].embedding;

    // 2. Perform vector search
    const cursor = await astraTable.find({}, {
        sort: { vector: rawEmbedding },
        includeSimilarity: true,
        limit: 5
    });

    // 3. Extract correctGuess from results
    const topGuesses = [];
    const similarity = [];
    const currentWords = word.split('+').map(w => w.trim());

    for await (const row of cursor) {
        console.log(`Found match (Similarity: ${row['$similarity']?.toFixed(4)}):`, row.correctGuess);
        const guess = row.correctGuess;
        // Check if the guess matches any word in currentWords or its simple plural/variant forms
        const isExcluded = currentWords.some(w => guess === w || guess === w + 's' || guess === w + 'es' || guess === w + 'ed' || guess === w + 'ing' || guess === w + 'ly' || guess === w + 'r');
        console.log(`Filtering ${guess}: ${isExcluded}`);

        if (!isExcluded) {
            topGuesses.push(guess);
            similarity.push(row['$similarity']);
        }
    }
    console.log("Top guesses found:", topGuesses);

    // 4. Return results
    return {
      statusCode: 200,
      body: JSON.stringify({ topGuesses, similarity }),
      headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
      }
    };

  } catch (error) {
    console.error("Error processing /api/get-rounds:", error);
    let errorMessage = 'Internal server error';
     if (error.response) {
         console.error("OpenAI API Error:", error.response.data);
          errorMessage = error.response.data?.error?.message || errorMessage;
     } else if (error.errors) {
         console.error("Astra DB Error:", error.errors);
          errorMessage = error.errors[0]?.message || errorMessage;
     } else {
        errorMessage = error.message || errorMessage;
     }
    return {
      statusCode: 500,
      body: JSON.stringify({ message: errorMessage }),
       headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
      }
    };
  }
};
