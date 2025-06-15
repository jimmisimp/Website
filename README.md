# React Vector Search App

A React application with vector search capabilities, built with Create React App and deployed on Netlify.

## Development Setup

### Prerequisites
- Node.js (v16 or higher)
- npm

### Installation
```bash
npm install
```

### Running the Application

#### Local Development (Recommended)
Use Netlify Dev to run both the frontend and serverless functions:
```bash
npx netlify dev
```
This will start:
- React app on port 3000
- Netlify dev server on port 8888 (with functions)
- Access your app at: http://localhost:8888

#### Alternative: Run Frontend and Backend Separately
```bash
# Start both frontend and backend
npm start

# Or run individually:
npm run start:frontend  # React app on port 3000
npm run start:backend   # Express server
```

### Important Notes
- **Always use `npx netlify dev`**
- The project has `netlify` as a dependency but requires `npx` to access the CLI commands
- Netlify functions are located in `netlify/functions/`

### Available Scripts
- `npm start` - Run both frontend and backend concurrently
- `npm run start:frontend` - Run only the React development server
- `npm run start:backend` - Run only the Express backend server
- `npm run build` - Build the app for production
- `npm test` - Run tests
- `npx netlify dev` - Run Netlify development server with functions

### Project Structure
```
src/
  app/           # Main application components
  assets/        # Static assets
  lib/
    components/  # Reusable components
netlify/
  functions/     # Serverless functions
public/          # Public assets
```

### Technologies Used
- React 18
- TypeScript
- Material-UI
- Netlify Functions
- Express.js
- OpenAI API
- DataStax Astra DB
