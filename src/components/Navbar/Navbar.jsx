import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const Navbar = () => {
  const location = useLocation();
  const [navBarStyle, setNavBarStyle] = useState(null);

  useEffect(() => {
    if (location.pathname === '/') {
      setNavBarStyle({
        display: 'none'
      });
    }
  }, [location]);

  return <div style={navBarStyle}>Navbar</div>;
};

export default Navbar;
