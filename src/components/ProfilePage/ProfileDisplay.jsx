/* eslint-disable */
import { react, useState, useEffect } from 'react';
import './profile.css';
import FriendsList from './FriendsList.jsx';
import axios from 'axios';
import useUserContext from '../../hooks/useUserContext';
const Profile = () => {
  // const userId = 1
  const [dummyText, setDummyText] = useState({})
  const { userId, packs, userData, friends, setFriends, photos } = useUserContext();
  const [profilePhoto, setProfilePhoto] = useState("https://i.redd.it/vg9bk4f19lp71.jpg");
  const [photosArray, setPhotosArray] = useState([]);

  // console.log('userdata', userData);

  useEffect(() => {
    axios.get(`http://localhost:3001/getCurrentUser?userId=${userId}`)
    .then((results) => {
     console.log('results son from get currentUser', results.data[0])
     setDummyText(results.data[0]);
    })
    .catch((err) => {
     console.log('er in get current user', err);
    })
  }, []);


  useEffect(() => {
    axios.get(`http://localhost:3001/getProfilePhoto?userId=${userId}`)
    .then((results) => {
     console.log('results son from get profilephoto', results.data.rows)
     setProfilePhoto(results.data.rows[0].url);
     const slice = results.data.rows.slice(1);
     console.log('SLICE', slice);
     setPhotosArray(slice);
    })
    .catch((err) => {
     console.log('er in get current user', err);
    })
  }, []);

  const fillerData = {

    likes1: 'Playing Fetch',
    likes2: 'Digging out of trash can',
    likes3: 'Wrestling',
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nam rutrum enim magna, sed sodales purus porta eget. Fusce vel posuere odio. Suspendisse potenti. Maecenas sapien nulla, ultricies nec fermentum non, aliquam eget elit. In nec nulla urna. Integer non felis ac est scelerisque porta. Etiam tempor sem quam, nec viverra lorem accumsan vitae.'
  };


  return (
    <div className="container mx-auto my-2 columns-2 min-h-fit">
      <div className="card shadow-xl min-h-fit mx-auto bg-[#fefcfc]">
        <div className="avatar columns-2 mb-auto  max-h-40 place-content-baseline">
            <div className="justify-self-start ml-3.5 mt-1.5">{/** this is profile photo */}
              <img className="profilePhoto max-h-32 rounded-full" src={profilePhoto} alt="Italian Trulli"></img>
            </div>
            <div className='ml-3.5 mt-2.5'>
              <div className='card-title'>
                {dummyText.dog_name}
              </div>
              <div className="flex flex-row justify-items-stretch items-center mt-1.5">
                <div className='flex-auto justify-start'>
                  {dummyText.age}
                </div>
                <div class="w-2 h-2 bg-black rounded-full mr-2 ml-2"></div>
                <div className='flex-auto justify-start'>
                  {dummyText.dog_breed}
                </div>
                <div class="w-2 h-2 bg-black rounded-full mr-2 ml-2"></div>
                <div className='flex-auto justify-start'>
                  {dummyText.location}
                </div>
              </div>
              <div className="flex grid-cols-2 items-center mt-1.5">
                <div class="w-4 h-4 bg-rose-300 rounded-full mr-2"></div>
                <div> {dummyText.vaccinated ? 'Vaccinated' : 'Unvaccinated' }</div>
              </div>
          </div>
        </div>

        <div className="flex grid-cols-3 items-end rounded-full ml-3.5">
          <div className="btn btn-outline btn-primary w-32 rounded-full mr-6">
            {dummyText.likes_one}
          </div>
          <div className="btn btn-outline btn-primary w-32 rounded-full mr-6 ">
            {dummyText.likes_two}
          </div>
          <div className="btn btn-outline btn-primary w-32 rounded-full mr-6">
            {dummyText.likes_three}
          </div>
        </div>


        <div className="carousel carousel-center mr-3.5 p-4 space-x-4 bg-blue rounded-box h-96 max-w-max overflow-x-scroll">
          {photosArray.map((photo, index) => {
            return (
              <div id={String(index)} className="carousel-item max-w-max">
              <img src={photo.url} className="rounded-box mx-auto" />
              </div>
            )}
            )}
        </div>
        <div className="flex justify-center max-w-min mx-auto py-2 gap-2">
        {photosArray.map((photo, index) => {
            return (
              <a href={`#${index}`} className="btn btn-xs">{index + 1}</a>
            )}
            )}
        </div>
        <div className="min-h-fit max-w-prose ml-3.5 mb-2.5 break-after-column">{fillerData.description}</div>
      </div>
    {/* <div> */}
      <FriendsList currentUser={dummyText}/>
    {/* </div> */}
    </div>
  );
};

export default Profile;
