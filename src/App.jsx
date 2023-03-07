import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './views/Home';
import Login from './views/Login';
import Discover from './views/Discover';
import Navbar from './components/Navbar/Navbar';
import './App.css';

function App() {
  return (
    <div className="App">
      <Router>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/discover" element={<Discover />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
