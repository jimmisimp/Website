// netlify/functions/record-round.js
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') }); // Load .env from root for local testing
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
					roundNumber: 'int',
					userWord: 'text',
					aiWord: 'text',
					correctGuess: 'text',
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
		// Ensure event.body is parsed
		let requestBody;
		try {
			requestBody = JSON.parse(event.body || '{}');
		} catch (parseError) {
			console.error("Error parsing request body:", parseError);
			return {
				statusCode: 400,
				body: JSON.stringify({ message: 'Invalid JSON in request body' })
			};
		}

		const { roundResults, finalCorrectGuess } = requestBody;

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


		// --- Embedding & Database Logic (Row by Row) ---

		// Determine correct guesses. Assumes roundResults are ordered.
		// The final correct guess needs special handling - passed via `finalCorrectGuess`.
		const roundsWithCorrect = roundResults.map((result, idx) => {
			let correctGuessForRow = '';
			if (idx < roundResults.length - 1) {
				correctGuessForRow = roundResults[idx + 1]?.userGuess || ''; // Use next user guess
			} else {
				correctGuessForRow = finalCorrectGuess || ''
			}
			return {
				...result, // Contains userGuess, aiGuess, potentially roundNumber
				correctGuess: correctGuessForRow,
				roundNumber: result.roundNumber !== undefined ? parseInt(result.roundNumber, 10) : idx + 1 // Use provided or derive
			};
		}).filter(r => !isNaN(r.roundNumber)); // Filter out rounds where roundNumber is invalid


		if (roundsWithCorrect.length === 0) {
			return {
				statusCode: 200,
				body: JSON.stringify({ message: 'No valid rounds to process after calculating correct guesses.' })
			};
		}

		// --- Fetch Max ID ---
		let nextId = 0;
		try {
			console.log("Finding max existing ID...");
			const maxIdResult = await astraTable.findOne({}, { projection: { 'id': 1 }, sort: { 'id': -1 } });
			if (maxIdResult && typeof maxIdResult.id === 'number') {
				nextId = maxIdResult.id + 1;
				console.log(`Found max ID ${maxIdResult.id}. Starting next ID from ${nextId}`);
			} else {
				console.log("No existing data found or couldn't retrieve max ID. Starting ID from 0.");
			}
		} catch (findError) {
			console.warn("Could not determine max existing ID. Starting from 0. Error:", findError);
		}

		const rowsToInsert = [];
		console.log(`Processing ${roundsWithCorrect.length} rounds for embedding and insertion...`);

		for (const round of roundsWithCorrect) {
			const currentId = nextId; // ID for this specific round

			// Validate data needed for embedding
			if (!round.userGuess || !round.aiGuess || !round.correctGuess) {
				console.warn(`Skipping round number ${round.roundNumber} due to missing guess data: ${JSON.stringify(round)}`);
				continue;
			}

			const embeddingInput = `${round.userGuess} + ${round.aiGuess} = ${round.correctGuess}`;

			try {
				// Generate embedding for this specific round
				const embeddingResponse = await openai.embeddings.create({
					model: "text-embedding-3-small",
					input: embeddingInput,
				});

				if (!embeddingResponse.data || !embeddingResponse.data[0] || !embeddingResponse.data[0].embedding) {
					console.error(`Failed to get valid embedding structure for round number ${round.roundNumber}: ${JSON.stringify(round)}`, embeddingResponse);
					continue; // Skip row if embedding structure is invalid
				}
				const embeddingVector = vector(embeddingResponse.data[0].embedding);

				// Prepare row using camelCase keys
				rowsToInsert.push({
					id: currentId,
					roundNumber: round.roundNumber,
					userWord: round.userGuess, // Ensure consistent naming
					aiWord: round.aiGuess,     // Ensure consistent naming
					correctGuess: round.correctGuess, // Ensure consistent naming
					vector: embeddingVector,
				});
				nextId++; // Increment ID for the next round

			} catch (embeddingError) {
				console.error(`Failed to generate embedding for round number ${round.roundNumber} (ID ${currentId}):`, embeddingError);
				// Optionally skip this round or halt execution
				continue;
			}
		}

		// --- Batch Insert into Database ---
		if (rowsToInsert.length > 0) {
			console.log(`Attempting to insert ${rowsToInsert.length} prepared rows into Astra DB...`);
			try {
				const batchSize = 20; // Astra DB recommended batch size
				let insertedCount = 0;
				for (let i = 0; i < rowsToInsert.length; i += batchSize) {
					const batch = rowsToInsert.slice(i, i + batchSize);
					console.log(`Inserting batch ${Math.floor(i / batchSize) + 1} (${batch.length} rows)...`);
					const insertResult = await astraTable.insertMany(batch);
					insertedCount += batch.length; // Assume success if no error
					console.log(`Batch ${Math.floor(i / batchSize) + 1} inserted.`);
				}
				console.log(`Successfully inserted ${insertedCount} rows in total.`);

			} catch (dbError) {
				console.error("Error inserting rows into Astra DB:", dbError);
				if (dbError.errors) {
					console.error("Astra DB Error Details:", JSON.stringify(dbError.errors, null, 2));
				}
				// Return 500 on database insertion failure
				return {
					statusCode: 500,
					body: JSON.stringify({ message: 'Error inserting rows into Astra DB' }),
				};
			}
		} else {
			console.log("No valid rows were prepared for insertion.");
		}

		return {
			statusCode: 200,
			body: JSON.stringify({ message: `Learning ${rowsToInsert.length} correct guesses: ${JSON.stringify(rowsToInsert.map(r => `${r.userWord} | ${r.aiWord} => ${r.correctGuess}`))}` }),
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
