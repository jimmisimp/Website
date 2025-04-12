require('dotenv').config();
const { DataAPIClient, vector } = require('@datastax/astra-db-ts');
const { OpenAI } = require('openai');

// Initialize clients
const astraToken = process.env.REACT_APP_ASTRA_DB_TOKEN;
const astraEndpoint = process.env.REACT_APP_ASTRA_DB_ID;
const openaiApiKey = process.env.REACT_APP_OPENAIKEY;

// Basic validation
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
const OPENAI_EMBEDDING_DIMENSION = 1536;

// --- Database Initialization Function ---
async function initializeDatabaseIfNeeded(db) {
	try {
		const table = await db.createTable(ASTRA_TABLE_NAME, {
			definition: {
				columns: {
					id: 'int',
					user_word: 'text',
					ai_word: 'text',
					correct_guess: 'text',
					vector: { type: 'vector', dimension: OPENAI_EMBEDDING_DIMENSION },
				},
				primaryKey: 'id',
			},
			ifNotExists: true,
		});
		const indexName = `${ASTRA_TABLE_NAME}_vector_idx`;
		await table.createVectorIndex(indexName, 'vector', {
			options: { metric: 'cosine' },
			ifNotExists: true,
		});
		return table;
	} catch (error) {
		console.error("Failed to initialize Astra DB table or index:", error);
		throw error;
	}
}


exports.handler = async (event, context) => {
	// Only allow POST requests
	if (event.httpMethod !== 'POST') {
		return {
			statusCode: 405,
			body: JSON.stringify({ message: 'Method Not Allowed' }),
			headers: { 'Allow': 'POST' }
		};
	}

	try {
		const { roundResults } = JSON.parse(event.body || '{}'); // Parse body

		if (!roundResults || !Array.isArray(roundResults) || roundResults.length === 0) {
			return {
				statusCode: 400,
				body: JSON.stringify({ message: 'Missing or invalid roundResults data' })
			};
		}

		const astraTable = await initializeDatabaseIfNeeded(astraDb);
		if (!astraTable) {
			return { statusCode: 500, body: JSON.stringify({ message: 'Database table could not be initialized.' }) };
		}


		// --- Embedding Logic ---
		const roundsMinusFirst = roundResults.slice(1);
		if (roundsMinusFirst.length === 0) {
			return {
				statusCode: 200,
				body: JSON.stringify({ message: 'No rounds to embed (only initial round received)' })
			};
		}

		// TODO: Fix final round not using final correctGuess (should be the winning word, needs to be included in post body)
		const userGuesses = roundsMinusFirst.map(result => result.userGuess);
		const roundsWithCorrect = roundsMinusFirst.map((result, idx) => ({
			...result,
			correctGuess: userGuesses[idx + 1] || result.userGuess
		}));

		const embeddingInput = roundsWithCorrect.map(result =>
			`${result.userGuess} + ${result.aiGuess} = ${result.correctGuess}`
		).join('\n');

		const embeddingResponse = await openai.embeddings.create({
			model: "text-embedding-3-small",
			input: embeddingInput,
		});
		const embeddingVector = vector(embeddingResponse.data[0].embedding);

		// --- Database Logic (Insert Only) ---
		const rowsToInsert = roundsWithCorrect.map((result, index) => ({
			id:  index,
			user_word: result.userGuess,
			ai_word: result.aiGuess,
			correct_guess: result.correctGuess,
			vector: embeddingVector,
		}));

		try {
			await astraTable.insertMany(rowsToInsert);
		} catch (error) {
			console.error("Error inserting rows into Astra DB:", error);
			return {
				statusCode: 500,
				body: JSON.stringify({ message: 'Error inserting rows into Astra DB' }),
			};
		}

		return {
			statusCode: 200,
			body: JSON.stringify({ message: 'Round recorded successfully' }),
			headers: {
				'Content-Type': 'application/json',
				'Access-Control-Allow-Origin': '*',
			}
		};

	} catch (error) {
		console.error("Error processing /api/record-round:", error);
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
