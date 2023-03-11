/* eslint-disable object-shorthand */
import { useState, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { useOktaAuth } from '@okta/okta-react';
import axios from 'axios';
import useUserContext from './useUserContext';

const useAuth = () => {
  const [loading, setLoading] = useState(false);
  const { authState, oktaAuth } = useOktaAuth();
  const { setLoggedIn, setUserData, setUserId } = useUserContext();

  const history = useHistory();

  const checkAuth = useCallback(() => {
    if (!authState || !authState.isAuthenticated) {
      // When user isn't authenticated, forget any user info
      setLoggedIn(false);
      setUserId(null);
      setUserData(null);
      history.push('/login');
    } else {
      setLoading(true);
      oktaAuth
        .getUser()
        .then((info) => {
          setLoggedIn(true);
          axios
            .put('/api/authuser', { email: 'pyekel6@marketwatch.com', name: 'Abdel Dandie' })
            .then((res) => {
              const user = {
                user_id: res.data.user_id,
                dog_name: res.data.dog_name,
                owner_name: res.data.owner_name,
                owner_first_name: info.given_name,
                owner_last_name: info.family_name,
                dog_breed: res.data.dog_breed,
                age: res.data.age,
                vaccination: res.data.vaccination,
                discoverable: res.data.discoverable,
                owner_email: res.data.owner_email,
                location: res.data.location,
                likes_one: res.data.likes_one,
                likes_two: res.data.likes_two,
                likes_three: res.data.likes_three
              };
              setUserId(res.data.user_id);
              setUserData(user);
              setLoading(false);
              history.push('/discover');
            });

          // uncomment the below to activate production (user creation and redirect to signup page)
          // const name = `${info.given_name} ${info.family_name}`;
          // // check if there is a user with a matching email
          // axios.put('/api/authuser', { email: info.email, name: name }).then((res) => {
          //   if (res.data.age !== null) {
          //     // need to verify what returns to indicate user exists and if it contains correct data
          //     setFirstLogin(false);
          //     // console.log('response from db query', res.data);
          //     setUserId(res.data.user_id);
          //     const user = {
          //       user_id: res.data.user_id,
          //       dog_name: res.data.dog_name,
          //       owner_name: res.data.owner_name,
          //       owner_first_name: info.given_name,
          //       owner_last_name: info.family_name,
          //       dog_breed: res.data.dog_breed,
          //       age: res.data.age,
          //       vaccination: res.data.vaccination,
          //       discoverable: res.data.discoverable,
          //       owner_email: res.data.owner_email,
          //       location: res.data.location,
          //       likes_one: res.data.likes_one,
          //       likes_two: res.data.likes_two,
          //       likes_three: res.data.likes_three
          //     };
          //     setUserData(user);
          //     history.push('/discover');
          //   } else {
          //     // if user hasn't filled signup form, redirect to signup page
          //     setFirstLogin(true);
          //     const user = {
          //       user_id: res.data.user_id,
          //       owner_name: name,
          //       owner_first_name: info.given_name,
          //       owner_last_name: info.family_name,
          //       owner_email: info.email
          //     };
          //     setUserId(res.data.user_id);
          //     setUserData(user);
          //     history.push('/signup');
          //   }
          // });
        })
        .catch((err) => console.error(err));
    }
  }, [authState, oktaAuth]);

  return { loading, checkAuth };
};

export default useAuth;
