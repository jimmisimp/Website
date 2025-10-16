const { DataAPIClient } = require('@datastax/astra-db-ts');

// Initialize clients outside handler for connection reuse
const astraToken = process.env.REACT_APP_ASTRA_DB_TOKEN;
const astraEndpoint = process.env.REACT_APP_ASTRA_DB_ID;

if (!astraToken || !astraEndpoint) {
	console.error("Missing required environment variables!");
	throw new Error('Server configuration error.');
}

const astraClient = new DataAPIClient(astraToken);
const astraDb = astraClient.db(astraEndpoint);
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
		const astraTable = await astraDb.table(ASTRA_TABLE_NAME);
		if (!astraTable) {
			console.error("Astra table not initialized. Cannot get words.");
			return {
				statusCode: 500,
				body: JSON.stringify({ message: 'Database not ready' }),
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*',
				}
			};
		}

		// Use projection to fetch only word fields, not vectors (much more efficient)
		const cursor = astraTable.find({}, {
			projection: { userWord: 1, aiWord: 1, correctGuess: 1 },
			limit: 10000
		});

		const uniqueWords = new Set();
		let rowCount = 0;
		
		for await (const row of cursor) {
			rowCount++;
			
			// Extract word fields
			if (row.userWord && typeof row.userWord === 'string') {
				uniqueWords.add(row.userWord.toLowerCase());
			}
			if (row.aiWord && typeof row.aiWord === 'string') {
				uniqueWords.add(row.aiWord.toLowerCase());
			}
			if (row.correctGuess && typeof row.correctGuess === 'string') {
				uniqueWords.add(row.correctGuess.toLowerCase());
			}
		}
		
		console.log(`Scanned ${rowCount} rows, extracted ${uniqueWords.size} unique words`);

		return {
			statusCode: 200, 
			body: JSON.stringify({ uniqueWords: Array.from(uniqueWords) }),
			headers: {
				'Content-Type': 'application/json',
				'Access-Control-Allow-Origin': '*',
			}
		};
	} catch (error) {
		console.error("Error processing get-all-words:", error);
		return {
			statusCode: 500, 
			body: JSON.stringify({ message: 'Internal server error', error: error.message }),
			headers: {
				'Content-Type': 'application/json',
				'Access-Control-Allow-Origin': '*',
			}
		};
	}
}