const { DataAPIClient } = require('@datastax/astra-db-ts');

// Initialize clients
const astraToken = process.env.REACT_APP_ASTRA_DB_TOKEN;
const astraEndpoint = process.env.REACT_APP_ASTRA_DB_ID;

if (!astraToken || !astraEndpoint) {
	console.error("Missing required environment variables!");
	return {
		statusCode: 500,
		body: JSON.stringify({ message: 'Server configuration error.' }),
	};
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
		// Initialize astraTable
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

		// Simply query all rows without vector search
		const cursor = await astraTable.find({});

		const uniqueWords = new Set();
		let rowCount = 0;
		
		for await (const row of cursor) {
			rowCount++;
			
			// Extract all string values from the row that aren't id, vector, or roundNumber
			Object.entries(row).forEach(([key, value]) => {
				if (key !== 'id' && key !== 'vector' && key !== 'roundNumber' && key !== '$similarity' && typeof value === 'string') {
					uniqueWords.add(value.toLowerCase());
				}
			});
		}
		
		console.log(`Found ${rowCount} rows in database, extracted ${uniqueWords.size} unique words`);

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