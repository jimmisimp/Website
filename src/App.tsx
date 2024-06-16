import React from 'react';
import logo from './face_logo.svg';
import './stylesheet.sass';
import { TextGenerator } from './components/TextGenerator.tsx' 

function App() {
  return (
    <div className="center-wrapper">

      <img src={logo} className="face-logo" alt="logo" />
      <div className='name'>
        adam yuras
      </div>
      <TextGenerator/>

    </div>
  );
}

export default App;
