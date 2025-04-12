require('dotenv').config(); // Load .env variables
const express = require('express');
const cors = require('cors');
const { DataAPIClient, vector } = require('@datastax/astra-db-ts');
const { OpenAI } = require('openai');

const app = express();
const port = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// --- Environment Variable Checks ---
const astraToken = process.env.REACT_APP_ASTRA_DB_TOKEN;
const astraEndpoint = process.env.REACT_APP_ASTRA_DB_ID;
const openaiApiKey = process.env.REACT_APP_OPENAIKEY;
const frontendOrigin = process.env.FRONTEND_ORIGIN; // Needed for production CORS

if (!astraToken || !astraEndpoint) {
  console.error("Missing Astra DB credentials!");
  process.exit(1);
}
if (!openaiApiKey) {
  console.error("Missing OpenAI API key!");
  process.exit(1);
}
if (isProduction && !frontendOrigin) {
    console.warn("Missing FRONTEND_ORIGIN environment variable for production CORS. Requests might be blocked.");
    // Allow any origin in production if FRONTEND_ORIGIN is not set (less secure, but avoids blocking)
    // For better security, set FRONTEND_ORIGIN in your production environment.
}

// --- Middleware ---
const corsOrigin = isProduction ? frontendOrigin : 'http://localhost:3000';
console.log(`Configuring CORS for origin: ${corsOrigin || 'Any (Production without FRONTEND_ORIGIN)'}`);
app.use(cors({
  origin: corsOrigin // Dynamically set origin
}));
app.use(express.json());

// --- Clients (Initialize once) ---
const astraClient = new DataAPIClient(astraToken);
const astraDb = astraClient.db(astraEndpoint);
const openai = new OpenAI({ apiKey: openaiApiKey });

// --- Global Variable for Astra Table ---
let astraTable = null;
const ASTRA_TABLE_NAME = 'round_data';
const OPENAI_EMBEDDING_DIMENSION = 1536; // text-embedding-3-small dimension

// --- Database Initialization Function ---
async function initializeDatabase() {
    try {
        console.log(`Initializing Astra table "${ASTRA_TABLE_NAME}"...`);
        const TableSchema = {
            columns: {
                id: 'int', // Consider using 'uuid' or 'timeuuid' for better uniqueness
                user_word: 'text',
                ai_word: 'text',
                correct_guess: 'text',
                vector: { type: 'vector', dimension: OPENAI_EMBEDDING_DIMENSION }, // Use fixed dimension
            },
            // If using 'int' as primary key, ensure uniqueness or handle potential collisions
            primaryKey: 'id',
        };

        astraTable = await astraDb.createTable(ASTRA_TABLE_NAME, {
            definition: TableSchema,
            ifNotExists: true,
        });
        console.log(`Table "${ASTRA_TABLE_NAME}" ready.`);

        console.log("Creating vector index (if it doesn't exist)...");
        // Index name needs to be unique within the keyspace
        const indexName = `${ASTRA_TABLE_NAME}_vector_idx`;
        await astraTable.createVectorIndex(indexName, 'vector', {
            options: { metric: 'cosine' },
            ifNotExists: true,
        });
        console.log(`Vector index "${indexName}" ready.`);

    } catch (error) {
        console.error("Failed to initialize Astra DB table or index:", error);
        throw error; // Re-throw to prevent server startup if DB init fails
    }
}


// --- API Endpoints ---

// POST /api/record-round - Endpoint to receive round data and save to Astra
app.post('/api/record-round', async (req, res) => {
  console.log("Received request to /api/record-round");
  const { roundResults } = req.body;

  if (!astraTable) {
      console.error("Astra table not initialized. Cannot record round.");
      return res.status(500).json({ message: 'Database not ready' });
  }

  if (!roundResults || !Array.isArray(roundResults) || roundResults.length === 0) {
    return res.status(400).json({ message: 'Missing or invalid roundResults data' });
  }

  try {
    // --- Embedding Logic ---
    const roundsMinusFirst = roundResults.slice(1);
    // Ensure there's at least one round to process after slicing
    if (roundsMinusFirst.length === 0) {
        console.log("No rounds to process after slicing the first one.");
        // Decide how to handle this: maybe return success, maybe an error?
        return res.status(200).json({ message: 'No rounds to embed (only initial round received)' });
    }

    const userGuesses = roundsMinusFirst.map(result => result.userGuess);
    const roundsWithCorrect = roundsMinusFirst.map((result, idx) => ({
        ...result,
        // Use the user's guess from the *next* round as the 'correct' guess for *this* round
        correctGuess: userGuesses[idx + 1] || result.userGuess // Fallback for the last actual guess
    }));

    // Adjust embedding input logic if needed based on roundsWithCorrect
    const embeddingInput = roundsWithCorrect.map(result =>
        `${result.userGuess} + ${result.aiGuess} = ${result.correctGuess}` // Use the calculated correctGuess
    ).join('\n');

    console.log("Generating embedding for input:", embeddingInput);
    const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: embeddingInput,
    });
    const embeddingVector = vector(embeddingResponse.data[0].embedding); // Keep using vector() for insertion
    console.log("Embedding generated, length:", embeddingVector.length); // Should match OPENAI_EMBEDDING_DIMENSION

    // --- Database Logic (Insert Only) ---
    // Generate unique IDs - simple index might collide across different game sessions
    const uniqueOffset = Date.now(); // Use timestamp for pseudo-uniqueness in this batch
    const rowsToInsert = roundsWithCorrect.map((result, index) => ({
        id: uniqueOffset + index, // Create a more unique ID
        user_word: result.userGuess,
        ai_word: result.aiGuess,
        correct_guess: result.correctGuess,
        vector: embeddingVector, // Use the same embedding for all related rows in this game session
    }));

    console.log(`Attempting to insert ${rowsToInsert.length} rows...`);
    await astraTable.insertMany(rowsToInsert);
    console.log("Successfully inserted rows into Astra DB.");

    res.status(200).json({ message: 'Round recorded successfully' });

  } catch (error) {
    console.error("Error processing /api/record-round:", error);
    // Check for specific error types if needed
    if (error.response) {
        console.error("OpenAI API Error:", error.response.data);
    } else if (error.errors) { // Astra DB specific errors
        console.error("Astra DB Error:", error.errors);
    }
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

app.get('/api/get-rounds', async (req, res) => {
	const { word } = req.query;

    if (!astraTable) {
        console.error("Astra table not initialized. Cannot get rounds.");
        return res.status(500).json({ message: 'Database not ready' });
    }

	if (!word) {
		return res.status(400).json({ message: 'Missing "word" query parameter' });
	}

	// No need to re-initialize astraTable here, use the global one

	try {
		// 1. Generate embedding for the input word
		console.log(`Generating embedding for search word: "${word}"`);
		const embeddingResponse = await openai.embeddings.create({
				model: "text-embedding-3-small",
				input: word,
		});
		const rawEmbedding = embeddingResponse.data[0].embedding; // Use raw array for sorting
		console.log("Search vector generated, length:", rawEmbedding.length);

		// 2. Perform vector search using the initialized astraTable
		console.log("Performing vector search...");
		const cursor = await astraTable.find({}, {
			sort: { vector: rawEmbedding }, // Pass the raw embedding array directly
			includeSimilarity: true,
			limit: 3 // Limit to top 3 results
		});

		// 3. Extract correct_guess from results
		const topGuesses = [];
		const similarity = [];
		for await (const row of cursor) {
			console.log(`Found match (Similarity: ${row['$similarity']?.toFixed(4)}):`, row.correct_guess);
			if (row.correct_guess) {
				topGuesses.push(row.correct_guess);
			}
			if (row['$similarity']) {
				similarity.push(row['$similarity']);
			}
		}
		console.log("Top guesses found:", topGuesses);

		// 4. Return results
		res.status(200).json({ topGuesses, similarity });

	} catch (error) {
		console.error("Error processing /api/get-rounds:", error);
        if (error.response) {
            console.error("OpenAI API Error:", error.response.data);
        } else if (error.errors) { // Astra DB specific errors
            console.error("Astra DB Error:", error.errors);
        }
		res.status(500).json({ message: 'Internal server error', error: error.message });
	}
});

// --- Start Server ---
async function startServer() {
    try {
        await initializeDatabase(); // Initialize DB before starting listener

        const host = isProduction ? '0.0.0.0' : 'localhost';
        app.listen(port, host, () => {
            console.log(`Backend server listening on http://${host}:${port}`);
            console.log(`Environment: ${isProduction ? 'production' : 'development'}`);
        });
    } catch (error) {
        console.error("Server failed to start:", error);
        process.exit(1); // Exit if server cannot start (e.g., DB init failed)
    }
}

startServer(); // Execute the async function to start the server 