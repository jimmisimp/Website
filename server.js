require('dotenv').config(); // Load .env variables
const express = require('express');
const cors = require('cors');
const { DataAPIClient, vector } = require('@datastax/astra-db-ts');
const { OpenAI } = require('openai');

const app = express();
const port = process.env.PORT || 3001; // Use a port different from React's default (3000)

// --- Middleware ---
app.use(cors({ 
  origin: 'http://localhost:3000' // Allow requests only from your React app's origin
}));
app.use(express.json()); // Parse JSON request bodies

// --- Astra DB Client (Initialize once) ---
const astraToken = process.env.REACT_APP_ASTRA_DB_TOKEN;
const astraEndpoint = process.env.REACT_APP_ASTRA_DB_ID;

if (!astraToken || !astraEndpoint) {
  console.error("Missing Astra DB credentials in environment variables!");
  process.exit(1);
}

const astraClient = new DataAPIClient(astraToken);
const astraDb = astraClient.db(astraEndpoint);
let astraTable = null; // Will be initialized later

// --- OpenAI Client (Initialize once) ---
const openaiApiKey = process.env.REACT_APP_OPENAIKEY;
if (!openaiApiKey) {
  console.error("Missing OpenAI API key in environment variables!");
  process.exit(1);
}
const openai = new OpenAI({ apiKey: openaiApiKey });

// --- API Endpoints ---

// POST /api/record-round - Endpoint to receive round data and save to Astra
app.post('/api/record-round', async (req, res) => {
  console.log("Received request to /api/record-round");
  const { roundResults } = req.body; // Expecting the entire roundResults array

  if (!roundResults || !Array.isArray(roundResults) || roundResults.length === 0) {
    return res.status(400).json({ message: 'Missing or invalid roundResults data' });
  }

  try {
    // --- Embedding Logic (moved from frontend) ---
    const roundsMinusFirst = roundResults.slice(1);
    const userGuesses = roundsMinusFirst.map(result => result.userGuess);
    const roundsWithCorrect = roundsMinusFirst.map((result, idx) => ({
        ...result,
        correctGuess: userGuesses[idx+1] // Word the user guessed after this round
    }));

    const embeddingInput = roundsWithCorrect.map(result => 
        `${result.userGuess} + ${result.aiGuess} = ${result.correctGuess || result.userGuess}`
    ).join('\n');
    
    console.log("Generating embedding for input:", embeddingInput);
    const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: embeddingInput,
    });
    const embeddingVector = vector(embeddingResponse.data[0].embedding);
    console.log("Embedding generated, length:", embeddingVector.length);

    // --- Database Logic (moved from frontend) ---
    if (!astraTable) {
        // Initialize table on first request (or move to a startup function)
        console.log("Initializing Astra table...");
        const TableSchema = {
            columns: {
                id: 'int',
                user_word: 'text',
                ai_word: 'text',
                correct_guess: 'text',
                vector: { type: 'vector', dimension: embeddingVector.length },
            },
            primaryKey: 'id',
        };
        astraTable = await astraDb.createTable('round_data', 
            { 
                definition: TableSchema,
                ifNotExists: true,
            }
        );
        console.log("Creating vector index...");
        await astraTable.createVectorIndex('round_data_vector_idx', 'vector', 
            { options: { metric: 'cosine' }, ifNotExists: true }
        );
        console.log("Astra table and index ready.");
    }
    
    const rowsToInsert = roundsWithCorrect.map((result, index) => ({
        id: index, // Simple ID based on index in this batch
        user_word: result.userGuess,
        ai_word: result.aiGuess,
        correct_guess: result.correctGuess || result.userGuess, // Use winning guess if last
        vector: embeddingVector, // Use the same embedding for all rows in this game session
    }));

    console.log(`Attempting to insert ${rowsToInsert.length} rows...`);
    await astraTable.insertMany(rowsToInsert);
    console.log("Successfully inserted rows into Astra DB.");

    res.status(200).json({ message: 'Round recorded successfully' });

  } catch (error) {
    console.error("Error processing /api/record-round:", error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

app.get('/api/get-rounds', async (req, res) => {
	const { word } = req.query; // Get word from query parameters

	if (!word) {
		return res.status(400).json({ message: 'Missing "word" query parameter' });
	}

	astraTable = await astraDb.table('round_data');

	try {
		// 1. Generate embedding for the input word
		console.log(`Generating embedding for search word: "${word}"`);
		const embeddingResponse = await openai.embeddings.create({
				model: "text-embedding-3-small",
				input: word,
		});
		// const searchVector = vector(embeddingResponse.data[0].embedding); // Don't wrap for sorting
		const rawEmbedding = embeddingResponse.data[0].embedding;
		console.log("Search vector generated, length:", rawEmbedding.length);

		// 2. Perform vector search
		console.log("Performing vector search...");
		const cursor = await astraTable.find({}, {
			// sort: { $vector: searchVector }, // Pass the raw embedding array directly
			sort: { vector: rawEmbedding },
			includeSimilarity: true,
			limit: 3 // Limit to top 3 results
		});

		// 3. Extract correct_guess from results
		const topGuesses = [];
		const similarity = [];
		for await (const row of cursor) {
			console.log("Found match:", row); // Log the full row for debugging
			if (row.correct_guess) {
				topGuesses.push(row.correct_guess);
			}
			if (row['$similarity']) {
				similarity.push(row['$similarity']);
			}
		}
		console.log("Top guesses found:", topGuesses);

		// 4. Return results
		res.status(200).json({ topGuesses, similarity }); // Return the array of guesses

	} catch (error) {
		console.error("Error processing /api/get-rounds:", error);
		res.status(500).json({ message: 'Internal server error', error: error.message });
	}
});

// --- Start Server ---
app.listen(port, () => {
  console.log(`Backend server listening on http://localhost:${port}`);
}); 