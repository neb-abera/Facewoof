/* eslint-disable react/no-array-index-key */
/* eslint-disable react/prop-types */
/* eslint-disable jsx-a11y/alt-text */
import { react, useState, useEffect } from 'react';
import '../Discover/profileCard.css';
import axios from 'axios';

const CreatePackCard = ({ currentUser, friend }) => {
  // console.log('currentUser friend', currentUser, friend);
  const userId = currentUser.user_id;
  const friendId = currentUser.user_id;
  const [packName, setPackName] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const changePackName = (e) => {
    console.log('packname', e);
    setPackName(e);
  };
  const createPack = () => {
    axios
      .post('http://localhost:3001/createPack', {
        data: {
          packName: packName
        }
      })
      .then((results) => {
        console.log('sucessfully created pack', results.data.rows[0].pack_id);
        const packId = results.data.rows[0].pack_id;
        axios
          .post('http://localhost:3001/addToPack', {
            data: {
              packId: packId,
              userId: userId
            }
          })
          .then((res) => {
            console.log('success adding user to pack', res);
            axios
              .post('http://localhost:3001/addToPack', {
                data: {
                  packId: packId,
                  userId: friendId
                }
              })
              .then((reesults) => {
                console.log('success final', reesults);
                setShowSuccess(true);
              });
          });
      })
      .catch((err) => {
        console.log('err in creating pack', err);
      });
    // create pack axios

    // insert dogs into pack axios
  };
  // console.log('users', currentUser, friend)
  // const submitText = `Create Pack with ${user.dog_name} and ${friend.dog_name}`
  const submitText = `Create Pack with ${currentUser.dog_name} and ${friend.dog_name}`;
  const successText = `${packName} with ${currentUser.dog_name} and ${friend.dog_name} has been created!!`;
  // console.log('user', user);
  return (
    <div>
      <div className="profile-card-parent">
        <div className="card">
          <div> {showSuccess? <div className="alert alert-success shadow-lg">
          <div>
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>{successText}</span>
                </div>
        </div> : ''}</div>
          <label className="" htmlFor="fname">
            Pack Name
          </label>
          <input onChange={(e) => {changePackName(e.target.value)}} type="text" id="fname" name="fname" />
          <br />
          <input
            onClick={() => createPack()}
            className="btn-secondary"
            type="submit"
            value={submitText}
          />
        </div>
      </div>
    </div>
  );
};

export default CreatePackCard;