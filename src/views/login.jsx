import React, { useState, useEffect, useContext, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const Login = () => {
  return (
    <div>
      <input type="text" placeholder="username" />
      <input type="text" placeholder="password" />
      <button type="button">Go fetch</button>
    </div>
  );
};
// got to show a change for git
export default Login;
