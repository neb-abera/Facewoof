import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import App from './App';
import './api';
import './index.css';
import { UserProvider } from './context/user';

// BASE_URL is '/' normally, and '/facewoof/' when the app is built to be
// served under a path on another host. The router has to know, or every link
// would drop the prefix.
const basename = import.meta.env.BASE_URL.replace(/\/$/, '');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <UserProvider>
      <Router basename={basename}>
        <App />
      </Router>
    </UserProvider>
  </React.StrictMode>
);
