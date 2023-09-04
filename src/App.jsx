/* eslint-disable prettier/prettier */
import React from 'react';
import { Route } from 'react-router-dom'; // useLocation was here
import Home from './views/Home';
import Login from './views/Login';
import Discover from './views/Discover';
import PackFeed from './views/PackFeed';
import PlaydateCalendar from './views/Calendar';
import Profile from './views/Profile';
import './App.css';
import Navbar from './components/Navbar/Navbar';

const App = () => {
  return (
    <div className="App">
      <header className="App-header">
        <Navbar />
        <Route path="/" exact component={Home} />
        <Route exact path="/login" render={() => <Login />} />
        <Route path="/calendar" render={() => <PlaydateCalendar />} />
        <Route path="/packFeed" render={() => <PackFeed />} />
        <Route path="/profile" render={() => <Profile />} />
        <Route path="/discover" render={() => <Discover />} />
      </header>
    </div>
  );
};

export default App;
