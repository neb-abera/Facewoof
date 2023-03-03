
import React, {
  useState, useEffect, useContext, useRef,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function Login() {
  return (
    <div>
      <input type="text" placeholder="username" />
      <input type="text" placeholder="password" />
      <button type="button">Go fetch</button>
    </div>
  )
}