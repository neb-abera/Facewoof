/* eslint-disable */
import {react, useState, useEffect} from 'react';
import axios from 'axios';
import useUserContext from '../../hooks/useUserContext.js';

// to do later:
// if profile logged in, render values in textinput as current values of profile

const ProfilePage = () => {
  const [ownerName, setOwnerName] = useState(''); // should get pull from userData
  const [email, setEmail] = useState(''); // should get pull from userData
  const [ownerLastname, setOwnerLastname] = useState(''); // should get pull from userData
  const [dogName, setDogName] = useState('');
  const [breed, setBreed] = useState('');
  const [age, setAge] = useState(0);
  const [location, setLocation] = useState(0);
  const [vaccinated, setVaccinated] = useState(false);
  const [discoverable, setDiscoverable] = useState(false);
  const [likes1, setLikes1] = useState('');
  const [likes2, setLikes2] = useState('');
  const [likes3, setLikes3] = useState('');

  const { userData, firstLogin } = useUserContext();

  const changeOwnerName = (e) => {
    console.log('firstname', e);
    setOwnerName(e);
  };

  const changeEmail = (e) => {
    console.log('email', e);
    setEmail(e);
  };
  const changeOwnerLastname = (e) => {
    console.log('lastname', e);
    setOwnerLastname(e);
  };
  const changeDogName = (e) => {
    console.log('dogname', e);
    setDogName(e);
  };
  const changeBreed = (e) => {
    console.log('breed', e);
    setBreed(e);
  };
  const changeAge = (e) => {
    console.log('age', e);
    setAge(Number(e));
  };
  const changeLocation = (e) => {
    console.log('loc', e);
    setLocation(Number(e));
  };
  const changeVaccinated = () => {
    console.log('vacc', vaccinated);
    setVaccinated(!vaccinated);
  };
  const changeDiscoverable = () => {
    console.log('discoverable', discoverable);
    setDiscoverable(!discoverable);
  };
  const changeLikes1 = (e) => {
    console.log('likes1', e);
    setLikes1(e);
  };
  const changeLikes2 = (e) => {
    console.log('likes2', e);
    setLikes2(e);
  };
  const changeLikes3 = (e) => {
    console.log('likes3', e);
    setLikes3(e);
  };
  const handleSubmit = (e) => {
    e.preventDefault();
    const sendObj = {
      ownerName: ` ${ownerName} ${ownerLastname}`,
      dogName: dogName,
      breed: breed,
      age: age,
      location: location,
      vaccinated: vaccinated,
      discoverable: discoverable,
      likes1: likes1,
      like2: likes2,
      likes3: likes3,
      email: email
    };

    if (
      ownerName.length === 0 ||
      ownerLastname.length === 0 ||
      dogName.length === 0 ||
      breed.length === 0 ||
      email.length === 0
    ) {
      // eslint-disable-next-line no-alert
      console.log('Please make sure all required forms are filled out!!! Gosh!!!', sendObj);
    } else if (typeof age !== 'number') {
      // eslint-disable-next-line no-alert
      alert('Please make sure age is a number');
    } else if (typeof location !== 'number') {
      // eslint-disable-next-line no-alert
      alert('Please make sure location is your zip code');
    } else {
      console.log('success!!');
      axios
        .put('http://localhost:3001/editUser', sendObj)
        .then((results) => {
          console.log('succ post', results);
        })
        .catch((err) => {
          console.log('err', err);
        });
    }
  };
  // card w-96 bg-base-100 shadow-xl top-15 mx-auto overflow-auto scroll-auto
  // flex card card-compact w-[700px] bg-base-100 shadow-xl ml-[500px] mt-44 max-w-3xl w-max
  return (
    <div className="card w-10/12 max-w-7xl bg-base-10 shadow-xl mx-auto">
      <div className="card-body">
        <h2 className="card-title">{firstLogin ?  'Create Your Profile' : 'Edit Your Profile'}</h2>
        <form >
          <div class="columns-3">
            <div>
              <label className="label">
              Owner First Name:
              </label>
              <input className="input input-bordered w-full max-w-xs" onChange={(e) => {changeOwnerName(e.target.value)}} type="text" name="name" />
              <label className="label">
                Owner Last Name:
              </label>
              <input className="input input-bordered w-full max-w-xs" onChange={(e) => {changeOwnerLastname(e.target.value)}} type="text" name="name" />
              <label className="label">
                Owner Email:
              </label>
              <input className="input input-bordered w-full max-w-xs" onChange={(e) => {changeEmail(e.target.value)}} type="text" name="name" />
              <label className="label">
                Location
              </label>
              <input className="input input-bordered w-full max-w-xs" placeholder='Zip code' onChange={(e) => {changeLocation(e.target.value)}} type="text" name="name" />
              <label className="label break-after-column"> Make Profile Discoverable<input className="checkbox" onClick={() => changeDiscoverable()} type="checkbox"/></label>
            </div>
            <div>
              <label className="label">
                Dog Name:
              </label>
              <input className="input input-bordered w-full max-w-xs" onChange={(e) => {changeDogName(e.target.value)}}  type="text" name="name" />
              <label className="label">
                Age:
              </label>
              <input className="input input-bordered w-full max-w-xs" onChange={(e) => {changeAge(e.target.value)}} type="text" name="name" />
              <label className="label">
                Breed:
              </label>
              <input className="input input-bordered w-full max-w-xs" onChange={(e) => {changeBreed(e.target.value)}}   type="text" name="name" />
              <label className="label break-after-column"> Fully Vaccinated<input className="checkbox" onClick={() => changeVaccinated()} type="checkbox"/></label>
            </div>
            <div>
              <label className="label">
                Likes 1:
              </label>
              <input className="input input-bordered w-full max-w-xs" placeholder='Chasing Squirrels' onChange={(e) => {changeLikes1(e.target.value)}} type="text" name="name" />
              <br />
              <label className="label">
                Likes 2:
              </label>
              <input className="input input-bordered w-full max-w-xs" placeholder='Playing Fetch'  onChange={(e) => {changeLikes2(e.target.value)}} type="text" name="name" />
              <br />
              <label className="label">
                Likes 3:
              </label>
              <input className="input input-bordered w-full max-w-xs" placeholder='Biting People' onChange={(e) => {changeLikes3(e.target.value)}} type="text" name="name" />
            </div>
          </div>
          <label class="block">
            <span class="sr-only">Choose profile photo</span>
            <input type="file" className="file-input file-input-bordered file-input-primary w-full max-w-xs" />
          </label>
          <div className="card-actions justify-end">
            <input className="btn btn-active btn-primary"  onClick={(e) => handleSubmit(e)} type="submit" />
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;
