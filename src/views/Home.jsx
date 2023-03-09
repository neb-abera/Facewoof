/* eslint-disable react/jsx-indent-props */
import React, { useState, useEffect } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { useOktaAuth } from '@okta/okta-react';
import AuthForm from '../components/AuthForm/AuthForm';
import dogImage from '../assets/dog.jpg';
import useUserContext from '../hooks/useUserContext';
import OktaSignInWidget from './OktaSignInWidget';

const Home = () => {
  const { authState, oktaAuth } = useOktaAuth();
  const history = useHistory();
  const [userEmail, setUserEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const { loggedIn, setLoggedIn, setUserId, setUserData } = useUserContext();
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    if (!authState || !authState.isAuthenticated) {
      // When user isn't authenticated, forget any user info
      setLoggedIn(false);
      setUserInfo(null);
    } else {
      oktaAuth
        .getUser()
        .then((info) => {
          setUserInfo(info);
          setLoggedIn(true);
          setUserEmail(info.email);
          setFirstName(info.given_name);
          setLastName(info.family_name);
          history.push('/discover');

          // check if there is a user with a matching email
          // if yes
          // set userId, send them to discover page
          // if no
          // create userId with info, send them to signup page
        })
        .catch((err) => {
          console.error(err);
        });
    }
  }, [authState, oktaAuth, loggedIn]); // says setLoggedIn is missing from deps but it shouldn't be

  return (
    <div className="flex h-screen w-screen">
      <div className="relative w-[600px]">
        <Link
          to="/"
          className="absolute top-4 left-4 border border-0 px-12 py-2 bg-[#8d5426] rounded text-white"
        >
          Diggr
        </Link>
        {/* eslint-disable-next-line jsx-a11y/img-redundant-alt */}
        <img className="w-full h-full" src={dogImage} alt="dog-image" />
      </div>
      <div
        className="flex flex-col space-y-5 px-12 items-center justify-center"
        style={{ width: `--webkit-calc(100% - 600px)` }}
      >
        <h3 className="text-2xl text-center text-[#bb7c7c] font-medium my-3">Create An Account</h3>
        {/* <AuthForm action="signup" /> */}
        <p className="text-center text-[#bb7c7c]">
          Already Have An Account? &nbsp;
          <Link to="/login" className="font-bold text-success">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Home;
