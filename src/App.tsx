import React from 'react';
import './stylesheet.sass';
import { TextGenerator } from './components/TextGenerator.tsx'
import MindMeld from './components/MindMeld.tsx';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={
          <div className="main-wrapper center-wrapper">
            <img src={"face_logo.svg"} className="face-logo" alt="Website logo" />
            <div className='name'>
              adam yuras
            </div>
            <TextGenerator />
          </div>
        } />
        <Route path="/mindmeld" element={
          <div className="mind-meld-wrapper center-wrapper">
            <MindMeld />
          </div>} />
      </Routes>
    </Router >
  );
}

export default App;
