import React from 'react';
import ReactDOM from 'react-dom/client';
import './stylesheet.sass';
import { Main } from './app';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Main />
  </React.StrictMode>
);
