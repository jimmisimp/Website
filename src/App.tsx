import React from 'react';
import './stylesheet.sass';
import { TextGenerator } from './components/TextGenerator.tsx' 

function App() {
  return (
    <div className="center-wrapper">

      <img src={"face_logo.svg"} className="face-logo" alt="logo" />
      <div className='name'>
        adam yuras
      </div>
      <TextGenerator/>

    </div>
  );
}

export default App;
