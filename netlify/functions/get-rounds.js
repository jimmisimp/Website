const { DataAPIClient } = require('@datastax/astra-db-ts');
const { OpenAI } = require('openai');

// Initialize clients outside handler for connection reuse
const astraToken = process.env.REACT_APP_ASTRA_DB_TOKEN;
const astraEndpoint = process.env.REACT_APP_ASTRA_DB_ID;
const openaiApiKey = process.env.REACT_APP_OPENAIKEY;

if (!astraToken || !astraEndpoint || !openaiApiKey) {
  console.error("Missing required environment variables!");
  throw new Error('Server configuration error.');
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
    const { userWord, aiWord } = event.queryStringParameters || {};

    if (!userWord || !aiWord) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing "userWord" and/or "aiWord" query parameters' })
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

    // Hybrid embedding strategy: query with word pair (primary) and individual words (secondary)
    const pairQuery = `${userWord} + ${aiWord}`;
    
    const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: [pairQuery, userWord, aiWord],
    });
    
    const pairEmbedding = embeddingResponse.data[0].embedding;
    const userEmbedding = embeddingResponse.data[1].embedding;
    const aiEmbedding = embeddingResponse.data[2].embedding;

    // Perform vector searches in parallel
    const [pairResults, userResults, aiResults] = await Promise.all([
      astraTable.find({}, {
        sort: { vector: pairEmbedding },
        includeSimilarity: true,
        limit: 5
      }).toArray(),
      astraTable.find({}, {
        sort: { vector: userEmbedding },
        includeSimilarity: true,
        limit: 3
      }).toArray(),
      astraTable.find({}, {
        sort: { vector: aiEmbedding },
        includeSimilarity: true,
        limit: 3
      }).toArray()
    ]);

    // Combine results with weighted scoring (pair matches weighted higher)
    const scoredGuesses = new Map();
    const currentWords = [userWord.toLowerCase(), aiWord.toLowerCase()];

    // Process pair matches (weight: 1.0)
    pairResults.forEach(row => {
      const guess = row.correctGuess?.toLowerCase();
      if (!guess) return;
      
      const isExcluded = currentWords.some(w => 
        guess === w || guess === w + 's' || guess === w + 'es' || 
        guess === w + 'ed' || guess === w + 'ing' || guess === w + 'ly' || guess === w + 'r'
      );
      
      if (!isExcluded) {
        const score = (row['$similarity'] || 0) * 1.0;
        scoredGuesses.set(guess, Math.max(scoredGuesses.get(guess) || 0, score));
      }
    });

    // Process individual word matches (weight: 0.5)
    [...userResults, ...aiResults].forEach(row => {
      const guess = row.correctGuess?.toLowerCase();
      if (!guess) return;
      
      const isExcluded = currentWords.some(w => 
        guess === w || guess === w + 's' || guess === w + 'es' || 
        guess === w + 'ed' || guess === w + 'ing' || guess === w + 'ly' || guess === w + 'r'
      );
      
      if (!isExcluded) {
        const score = (row['$similarity'] || 0) * 0.5;
        scoredGuesses.set(guess, Math.max(scoredGuesses.get(guess) || 0, score));
      }
    });

    // Sort by score and return top results
    const sortedGuesses = Array.from(scoredGuesses.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const topGuesses = sortedGuesses.map(([guess]) => guess);
    const similarity = sortedGuesses.map(([_, score]) => score);

    console.log(`Vector search for "${userWord} + ${aiWord}": Found ${topGuesses.length} suggestions`);

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
