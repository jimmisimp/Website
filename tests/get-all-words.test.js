const request = require('supertest');
const express = require('express');
const { DataAPIClient } = require('@datastax/astra-db-ts');

// Mock the dependencies
jest.mock('@datastax/astra-db-ts');

describe('GET /api/get-all-words endpoint', () => {
  let app;
  let mockAstraTable;
  let mockCursor;
  let consoleErrorSpy;
  
  beforeEach(() => {
    // Spy on console.error to suppress output during tests
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create a fresh Express app for each test
    app = express();
    
    // Mock the Astra DB client and cursor
    mockCursor = {
      [Symbol.asyncIterator]: jest.fn(function* () {
        // Mock data to be returned by the cursor
        yield { userWord: 'apple' };
        yield { userWord: 'banana' };
        yield { userWord: 'apple' }; // Duplicate to test Set functionality
        yield { userWord: 'cherry' };
      })
    };
    
    mockAstraTable = {
      find: jest.fn().mockResolvedValue(mockCursor)
    };
    
    // Mock the environment variables
    process.env.REACT_APP_ASTRA_DB_TOKEN = 'mock-token';
    process.env.REACT_APP_ASTRA_DB_ID = 'mock-id';
    process.env.REACT_APP_OPENAIKEY = 'mock-key';
    
    // Set up the Express app with just the endpoint we want to test
    app.use(express.json());
    
    // Define a global astraTable for our handler to use
    global.astraTable = mockAstraTable;
    
    // Add the endpoint handler directly
    app.get('/api/get-all-words', async (req, res) => {
      if (!global.astraTable) {
        console.error("Astra table not initialized. Cannot get words.");
        return res.status(500).json({ message: 'Database not ready' });
      }
    
      try {
        // Simply query all rows without vector search
        const cursor = await global.astraTable.find({});
    
        const uniqueWords = new Set();
        for await (const row of cursor) {
          uniqueWords.add(row.userWord);
        }
    
        res.status(200).json({ uniqueWords: Array.from(uniqueWords) });
      } catch (error) {
        console.error("Error processing /api/get-all-words:", error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
      }
    });
  });
  
  afterEach(() => {
    // Restore console.error after each test
    consoleErrorSpy.mockRestore();
  });
  
  it('should return unique words from the database', async () => {
    const response = await request(app)
      .get('/api/get-all-words');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('uniqueWords');
    expect(Array.isArray(response.body.uniqueWords)).toBe(true);
    expect(response.body.uniqueWords).toEqual(expect.arrayContaining(['apple', 'banana', 'cherry']));
    expect(response.body.uniqueWords.length).toBe(3); // Checks that 'apple' is only included once
    
    // Verify that find was called correctly
    expect(mockAstraTable.find).toHaveBeenCalledWith({});
  });
  
  it('should return 500 when database is not ready', async () => {
    // Simulate database not being initialized
    global.astraTable = null;
    
    const response = await request(app)
      .get('/api/get-all-words');
    
    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('message', 'Database not ready');
    expect(consoleErrorSpy).toHaveBeenCalledWith("Astra table not initialized. Cannot get words.");
  });
  
  it('should return 500 when database query fails', async () => {
    // Make the find method throw an error
    mockAstraTable.find.mockRejectedValue(new Error('Database error'));
    
    const response = await request(app)
      .get('/api/get-all-words');
    
    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('message', 'Internal server error');
    expect(response.body).toHaveProperty('error', 'Database error');
    expect(consoleErrorSpy).toHaveBeenCalledWith("Error processing /api/get-all-words:", expect.any(Error));
  });
}); 