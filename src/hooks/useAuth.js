/* eslint-disable object-shorthand */
import { useState, useCallback } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useOktaAuth } from '@okta/okta-react';
import axios from 'axios';
import useCalendar from './useCalender';
import useUserContext from './useUserContext';

const useAuth = () => {
  const [loading, setLoading] = useState(false);
  const { authState, oktaAuth } = useOktaAuth();
  const { userId, setLoggedIn, setUserData, setUserId } = useUserContext();
  const history = useHistory();
  const location = useLocation();
  const { getPacks } = useCalendar();

  const checkAuth = useCallback(() => {
    const token = JSON.parse(window.localStorage.getItem('okta-token-storage'));
    let destination;
    if (location.pathname.includes('calendar')) destination = '/calender';
    else if (location.pathname.includes('packFeed')) destination = '/packFeed';
    else if (location.pathname.includes('profile')) destination = '/profile';
    else destination = '/discover';
    if (token.idToken) {
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
              // history.push('/discover');
              console.log('routing to ', destination);
              // history.push(destination);
            });
        })
        .catch((err) => console.error(err));
    } else {
      setLoggedIn(false);
      setUserId(null);
      setUserData(null);
      history.push('/login');
    }
  }, [authState, oktaAuth]);
  return { loading, checkAuth };
};

export default useAuth;
