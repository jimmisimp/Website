import '@/stylesheet.sass';
import { TextGenerator, MindMeld } from '@/app'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={
          <div className="main-wrapper center-wrapper">
            <img src={"guy_white.svg"} className="guy" alt="Website logo" />
            <div className='name'>
              adam yuras
            </div>
            <div className='subheader'>
                is creating ai-powered experiences
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
