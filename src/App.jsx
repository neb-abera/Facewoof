import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Home from './views/Home';
import Login from './views/Login';
import PlaydateCalendar from './views/Calendar';
import './App.css';
import Playdate from './components/Calendar/EditPlaydate';

const App = () => {
  const location = useLocation();
  const background = location.state && location.state.background;

  return (
    <div className="App">
      <Routes location={background || location}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/calendar" element={<PlaydateCalendar />}>
          <Route path="calendar/editplaydate" element={<Playdate />} />
        </Route>
      </Routes>
      {background && (
        <Routes>
          <Route path="/editplaydate" element={<Playdate propTest="hi" />} />
        </Routes>
      )}
    </div>
  );
};

export default App;
