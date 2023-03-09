/* eslint-disable */
import {react, useState, useEffect} from 'react';
import axios from 'axios';

// to do later:
// if profile logged in, render values in textinput as current values of profile

const ProfilePage = () => {
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [ownerLastname, setOwnerLastname] = useState('');
  const [dogName, setDogName] = useState('');
  const [breed, setBreed] = useState('');
  const [age, setAge] = useState(0);
  const [location, setLocation] = useState(0);
  const [vaccinated, setVaccinated] = useState(false);
  const [discoverable, setDiscoverable] = useState(false);
  const [likes1, setLikes1] = useState('');
  const [likes2, setLikes2] = useState('');
  const [likes3, setLikes3] = useState('');

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
        .post('http://localhost:3001/createProfile', sendObj)
        .then((results) => {
          console.log('succ post', results);
        })
        .catch((err) => {
          console.log('err', err);
        });
    }
  };
  return (
    <div className="flex card card-compact w-[700px] bg-base-100 shadow-xl ml-[500px] mt-44 max-w-3xl w-max">
  <form className="m-10">
    <label className="m-10">
    Owner First Name: <input onChange={(e) => {changeOwnerName(e.target.value)}} type="text" name="name" />
  </label><br />
  <label className="m-10">
    Owner Last Name: <input onChange={(e) => {changeOwnerLastname(e.target.value)}} type="text" name="name" />
  </label><br />
  <label className="m-10">
    Owner Email: <input onChange={(e) => {changeEmail(e.target.value)}} type="text" name="name" />
  </label><br />
  <label className="m-10">
    Dog Name: <input onChange={(e) => {changeDogName(e.target.value)}}  type="text" name="name" />
  </label><br />
  <label className="m-10">
    Breed <input onChange={(e) => {changeBreed(e.target.value)}}   type="text" name="name" />
  </label><br />
  <label className="m-10">
    Age <input onChange={(e) => {changeAge(e.target.value)}} type="text" name="name" />
  </label><br />
  <label className="m-10">
    Likes 1: <input placeholder='Chasing Squirrels' onChange={(e) => {changeLikes1(e.target.value)}} type="text" name="name" />
  </label><br />
  <label className="m-10">
    Likes 2: <input placeholder='Playing Fetch'  onChange={(e) => {changeLikes2(e.target.value)}} type="text" name="name" />
  </label><br />
  <label className="m-10">
    Likes 3: <input placeholder='Biting People' onChange={(e) => {changeLikes3(e.target.value)}} type="text" name="name" />
  </label><br />
  <label className="m-10">
    Location <input placeholder='Zip code' onChange={(e) => {changeLocation(e.target.value)}} type="text" name="name" />
  </label><br />

  <input onClick={() => changeVaccinated()} type="checkbox"/>
<label > Fully Vaccinated</label><br />
<input onClick={() => changeDiscoverable()} type="checkbox"/>
<label> Make Profile Discoverable</label><br />
<input className="ml-40"  onClick={(e) => handleSubmit(e)} type="submit" />
    </form>
    </div>
  );
};

export default ProfilePage;
