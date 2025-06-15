// netlify/functions/record-round.js
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');
const { DataAPIClient, vector } = require('@datastax/astra-db-ts');
const { OpenAI } = require('openai');

// --- Initialize clients ---
const astraToken = 'AstraCS:fXArkexfGFQZjvbydhvCGYZk:75720366913a3380f476b220dc692249660f4e2d3cdfb99598f26f33302b4107'
const astraEndpoint = 'https://0c55d58d-a1b2-43ad-bab1-1375f4322934-us-east1.apps.astra.datastax.com'
const openaiApiKey = 'sk-proj-NQUKwdctzvji3lxjkMyfT3BlbkFJW5yhRwwFVTpMhFkADp0b'

// --- Basic validation ---
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

// --- Main processing function ---
async function processCsvAndUpload() {
	try {
		const astraTable = await initializeDatabaseIfNeeded(astraDb);
		if (!astraTable) {
			console.error('Database table could not be initialized.');
			return;
		}

		const results = [];
		const csvFilePath = path.join(__dirname, '..', '/utils/example_data.csv');

		if (!fs.existsSync(csvFilePath)) {
			console.error(`Error: CSV file not found at ${csvFilePath}`);
			return;
		}

		console.log(`Reading data from ${csvFilePath}...`);

		fs.createReadStream(csvFilePath)
			.pipe(csv())
			.on('data', (data) => results.push(data))
			.on('end', async () => {
				console.log(`Read ${results.length} rows from CSV.`);

				if (results.length === 0) {
					console.log("No data found in CSV.");
					return;
				}

				const rowsToInsert = [];
				let uniqueIdCounter = 0;

				console.log("Generating embeddings and preparing data for Astra DB...");
				for (const row of results) {
					if (!row.userWord || !row.aiWord || !row.correctGuess || row.roundNumber === undefined || row.roundNumber === null) {
						console.warn(`Skipping row due to missing data: ${JSON.stringify(row)}`);
						continue;
					}

					const embeddingInput = `${row.userWord} + ${row.aiWord} = ${row.correctGuess}`;

					try {
						console.log(`Generating embedding for ID ${uniqueIdCounter}...`);
						const embeddingResponse = await openai.embeddings.create({
							model: "text-embedding-3-small",
							input: embeddingInput,
						});

						if (!embeddingResponse.data || !embeddingResponse.data[0] || !embeddingResponse.data[0].embedding) {
							console.error(`Failed to get embedding structure for row: ${JSON.stringify(row)}`, embeddingResponse);
							continue;
						}

						const embeddingVector = vector(embeddingResponse.data[0].embedding);

						rowsToInsert.push({
							id: uniqueIdCounter++,
							roundNumber: parseInt(row.roundNumber, 10),
							userWord: row.userWord,
							aiWord: row.aiWord,
							correctGuess: row.correctGuess,
							vector: embeddingVector,
						});

					} catch (embeddingError) {
						console.error(`Failed to generate embedding for row ID ${uniqueIdCounter} (${JSON.stringify(row)}):`, embeddingError);
						continue;
					}
				}

				// --- Database Insertion ---
				if (rowsToInsert.length > 0) {
					console.log(`Attempting to insert ${rowsToInsert.length} prepared rows into Astra DB...`);
					try {
						const insertResult = await astraTable.insertMany(rowsToInsert);
						console.log("Rows inserted successfully:", insertResult);

					} catch (dbError) {
						console.error("Error inserting rows into Astra DB:", dbError);
						if (dbError.errors) {
							console.error("Astra DB Error Details:", dbError.errors);
						}
					}
				} else {
					console.log("No valid rows were prepared for insertion.");
				}
				console.log("CSV processing and database upload complete.");
			})
			.on('error', (error) => {
				console.error('Error reading or parsing CSV file:', error);
			});

	} catch (error) {
		console.error("Error during script execution:", error);
		if (error.response) {
			console.error("OpenAI API Error:", error.response.data);
		} else if (error.errors) {
			console.error("Astra DB Error:", error.errors);
		} else {
			console.error("General Error:", error.message);
		}
	}
}

processCsvAndUpload();
