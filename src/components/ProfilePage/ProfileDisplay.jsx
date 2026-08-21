/* eslint-disable */
import { react, useState, useEffect } from 'react';
import './profile.css';
import FriendsList from './FriendsList.jsx';
import axios from 'axios';
import useUserContext from '../../hooks/useUserContext';
const Profile = () => {
  // const userId = 1
  const [dummyText, setDummyText] = useState({});
  const { userId, loggedIn, packs, userData, friends, setFriends, photos, setFirstLogin } =
    useUserContext();
  const [profilePhoto, setProfilePhoto] = useState('https://i.redd.it/vg9bk4f19lp71.jpg');
  const [photosArray, setPhotosArray] = useState([]);

  // console.log('userdata', userData);

  useEffect(() => {
    axios
      .get(`/api/currentuser?userId=${userId}`)
      .then((results) => {
        // Falls back to {} so a profile that no longer exists (an expired guest,
        // say) renders empty rather than crashing the whole app on .dog_name.
        setDummyText(results.data[0] || {});
      })
      .catch((err) => {
        console.log('er in get current user', err);
      });
  }, [userId, loggedIn]);

  useEffect(() => {
    axios
      .get(`/api/profilephoto?userId=${userId}`)
      .then((results) => {
        const rows = results.data || [];
        if (rows.length) setProfilePhoto(rows[0].url);
        setPhotosArray(rows.slice(1));
      })
      .catch((err) => {
        console.log('er in get current user', err);
      });
  }, [userId, loggedIn]);

  const describe = () => {
    const { dog_name, age, dog_breed, owner_name, location } = dummyText;
    if (!dog_name) return '';
    const bits = [age && `${age} year old`, dog_breed].filter(Boolean).join(' ');
    return `${dog_name} is a ${bits}${location ? ` around ${location}` : ''}${
      owner_name ? `, out with ${owner_name}` : ''
    }.`;
  };

  const handleButtonClick = () => {
    setFirstLogin(true);
  };

  return (
    <div className="container mx-auto my-2 grid gap-4 grid-cols-1 lg:grid-cols-2 items-start min-h-fit">
      <div className="card shadow-xl min-h-fit mx-auto bg-[#fefcfc]">
        <div className="avatar flex flex-wrap gap-3 mb-auto place-content-baseline">
          <div className="justify-self-start ml-3.5 mt-1.5">
            {/** this is profile photo */}
            <img
              className="profilePhoto max-h-32 rounded-full"
              src={profilePhoto}
              alt="Italian Trulli"
            ></img>
          </div>
          <div className="ml-3.5 mt-2.5 flex-grow">
            <div className="card-title">{dummyText.dog_name}</div>
            <div className="flex flex-row justify-start items-center mt-1.5">
              <div className="flex-auto justify-start max-w-fit">{dummyText.age}</div>
              <div className="w-2 h-2 bg-black rounded-full mr-2 ml-2 "></div>
              <div className="flex-auto max-w-fit justify-start">{dummyText.dog_breed}</div>
              <div className="w-2 h-2 bg-black rounded-full mr-2 ml-2"></div>
              <div className="flex-auto justify-start">{dummyText.location}</div>
            </div>
            <div className="flex grid-cols-2 items-center mt-1.5">
              <div className="w-4 h-4 bg-rose-300 rounded-full mr-2"></div>
              <div> {dummyText.vaccination ? 'Vaccinated' : 'Unvaccinated'}</div>
            </div>
          </div>
          <div className="mt-2.5 mr-3.5">
            <button onClick={handleButtonClick} className="btn">
              Edit Profile
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 items-end rounded-full ml-3.5">
          <div className="btn btn-outline btn-primary w-32 rounded-full">{dummyText.likes_one}</div>
          <div className="btn btn-outline btn-primary w-32 rounded-full">{dummyText.likes_two}</div>
          <div className="btn btn-outline btn-primary w-32 rounded-full">
            {dummyText.likes_three}
          </div>
        </div>

        <div className="carousel carousel-center mr-3.5 p-4 space-x-4 bg-blue rounded-box h-96 max-w-max overflow-x-scroll">
          {photosArray.map((photo, index) => {
            return (
              <div id={String(index)} key={index} className="carousel-item max-w-max">
                <img src={photo.url} className="rounded-box mx-auto" />
              </div>
            );
          })}
        </div>
        <div className="flex justify-center max-w-min mx-auto py-2 gap-2">
          {photosArray.map((photo, index) => {
            return (
              <a href={`#${index}`} key={index} className="btn btn-xs">
                {index + 1}
              </a>
            );
          })}
        </div>
        <div className="min-h-fit max-w-prose ml-3.5 mb-2.5">{describe()}</div>
      </div>
      {/* <div> */}
      <FriendsList currentUser={dummyText} />
      {/* </div> */}
    </div>
  );
};

export default Profile;
