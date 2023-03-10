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

  // console.log('userdata', userData);

  useEffect(() => {
    axios.get(`http://localhost:3001/getCurrentUser?userId=${userId}`)
    .then((results) => {
    //  console.log('results son from get currentUser', results.data[0])
     setDummyText(results.data[0]);
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
    <div className="flex grid-cols-2">


  {/* <div className="ProfileCard card"> */}
  <div className="flex card card-compact w-96 bg-base-100 shadow-xl ml-28 mt-44 max-w-3xl w-max">

    <div className="avatar grid-cols-1 w-48 mb-1">
      <div className="w-32 rounded-full">
      <img className="profilePhoto" src="https://i.redd.it/vg9bk4f19lp71.jpg" alt="Italian Trulli"></img>
      </div>
      <div className='card-title absolute left-36 top-2'>{dummyText.dog_name}</div>
    </div>

    <div className="flex flex-row justify-items-stretch items-center absolute left-36 top-14">
      <div className='flex-auto justify-start'>{dummyText.age}</div>
      <div class="w-2 h-2 bg-black rounded-full mr-2 ml-2"></div>
      <div className='flex-auto justify-start'>{dummyText.dog_breed}</div>
      <div class="w-2 h-2 bg-black rounded-full mr-2 ml-2"></div>
      <div className='flex-auto justify-start'>{dummyText.location}</div>
    </div>
      <div className="flex grid-cols-2 items-center absolute left-36 top-24">
      <div class="w-4 h-4 bg-rose-300 rounded-full mr-2"></div>
      <div> {dummyText.vaccinated ? 'Vaccinated' : 'Unvaccinated' }</div>
    </div>

    <div className="flex grid-cols-3 items-end rounded-full">
    <div className="btn btn-outline btn-primary w-32 rounded-full mr-6">{fillerData.likes1}</div>
    <div className="btn btn-outline btn-primary w-32 rounded-full mr-6 ">{fillerData.likes2}</div>
    <div className="btn btn-outline btn-primary w-32 rounded-full mr-6">{fillerData.likes3}</div>
    </div>


    <div className="carousel carousel-center p-4 space-x-4 bg-blue rounded-box h-96 w-128">
      <div className="carousel-item">
      <img src="https://i.kym-cdn.com/photos/images/original/002/085/702/ba2.jpg" className="rounded-box" />
      </div>
    <div className="carousel-item">
      <img src="https://i.imgflip.com/4aylx8.jpg?a465912" className="rounded-box" />
      </div>
    <div className="carousel-item">
      <img src="https://i.kym-cdn.com/photos/images/facebook/002/035/687/1e8.png" className="rounded-box" />
      </div>
    <div className="carousel-item">
    <img src="https://static.boredpanda.com/blog/wp-content/uploads/2020/07/shiba-cheems-meme-dog-balltze-4-1.jpg" className="rounded-box" />
      </div>
    </div>
    <div>{fillerData.description}</div>



  </div>
    <FriendsList currentUser={dummyText}/>
  </div>
  );
};

export default Profile;
