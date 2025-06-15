# Backend Tests

This directory contains tests for the backend API endpoints.

## Running Tests

To run all backend tests:

```
npm run test:backend
```

## Test Files

- `get-all-words.test.js` - Tests for the `/api/get-all-words` endpoint that retrieves all unique words from the database without using vector search

## Test Structure

Each test file:
1. Mocks the necessary dependencies
2. Tests both successful and error scenarios
3. Verifies the correct API response format

## Adding New Tests

When adding new test files:
1. Place them in this directory
2. Follow the naming convention `endpoint-name.test.js`
3. Use Jest and Supertest for consistent testing 