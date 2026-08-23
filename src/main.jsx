import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import Modal from 'react-modal';
import App from './App';
import './api';
import './index.css';
import { UserProvider } from './context/user';

// BASE_URL is '/' normally, and '/facewoof/' when the app is built to be
// served under a path on another host. The router has to know, or every link
// would drop the prefix.
const basename = import.meta.env.BASE_URL.replace(/\/$/, '');

/*
 * Once, at startup. It was being called inside a view's render body, so it ran
 * on every render of that one page and no other page's dialogs were covered.
 * It tells react-modal what to hide from screen readers while a dialog is up.
 */
Modal.setAppElement('#root');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <UserProvider>
      <Router basename={basename}>
        <App />
      </Router>
    </UserProvider>
  </React.StrictMode>
);
