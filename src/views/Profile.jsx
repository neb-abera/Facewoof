import { react, useState, useEffect } from 'react';
import ProfileDisplay from '../components/ProfilePage/ProfileDisplay.jsx';
import ProfilePage from '../components/ProfilePage/ProfilePage';
import useUserContext from '../hooks/useUserContext';


const Profile = () => {
 // if firstLogin then render editProfile page
 const { firstLogin } = useUserContext();

  return <div>{firstLogin ? <ProfilePage /> : <ProfileDisplay />}</div>;
};

export default Profile;
