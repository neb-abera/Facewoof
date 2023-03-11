/* eslint-disable react/prop-types */
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ProfileCardGeneral from '../Shared/ProfileCardGeneral';
import CreatePackCard from './createPack';
import useUserContext from '../../hooks/useUserContext';
import './profile.css';

const FriendsList = ({ currentUser }) => {
  const [friendsName, setFriendsName] = useState([]);
  const [friendsData, setFriendsData] = useState([]);
  const [gotFriends, setGotFriends] = useState(false);
  const [gotPacks, setGotPacks] = useState(false);
  // const [packs, setPacks] = useState([]);
  const { userId, packs, setPacks, userData, /*friends, setFriends,*/ photos } = useUserContext();

  useEffect(() => {
    if (!gotFriends) {
      axios
        .get(`http://localhost:3001/getFriends?userId=${userId}`)
        .then((results) => {
          const friendos = results.data;
          const friendsArray = [];
          // console.log(friendos);
          friendos.forEach((friend) => {
            friendsArray.push(friend.dog_name);
            // friend.photos = [
            //   'https://i.imgflip.com/3nzkub.png?a465864',
            //   'https://i.imgflip.com/3nzkub.png?a465864'
            // ];
          });
          setFriendsName(friendsArray);
          setFriendsData(friendos);
          setGotFriends(true);
        })
        .catch((err) => {
          console.log('err', err);
        });
    }
  }, []);

  useEffect(() => {
    if (!gotPacks) {
      axios
        .get(`http://localhost:3001/api/getpacks?userId=${userId}`)
        .then((results) => {
          setPacks(results.data);
          setGotPacks(true);
        })
        .catch((err) => {
          console.log('err in getpacks', err);
        });
    }
  }, []);

  const addToPack = (packId) => {
    axios
      .put(`http://localhost:3001/api/addtopack?pack_id=${packId}&user_id=${userId}`)
      .then(() => {
        console.log('added to pack');
      })
      .catch(() => {
        alert('That user is already a part of that pack');
      });
  };

  return (
    <div className="card g-base-96 bg-[#fefcfc] shadow-xl max-w-fit max-h-fit mx-auto">
      <table className="table w-[470px]">
        <thead>
          <tr>
            <th>Friends List</th>
          </tr>
        </thead>
        <tbody>
          {friendsName.map((item, index) => {
            const hrefString = `#my-modal-${index}`;
            const hrefString2 = `#my-modal-${index + 10}`;
            const user = friendsData[index];
            return (
              <tr key={index} className="flex">
                <td className="bg-[#fefcfc]">
                  <label htmlFor={hrefString} className="btn btn-primary w-40 self-center">
                    {item}
                  </label>
                  {/* Put this part before </body> tag */}
                  <input type="checkbox" id={hrefString} className="modal-toggle" />
                  <span className="modal">
                    <span className="modal-box relative">
                      <label htmlFor={hrefString} className="btn btn-secondary mt-2.5 mr-3.5">
                        ✕
                      </label>
                      <ProfileCardGeneral user={user} />
                    </span>
                  </span>

                  {/* <a className="btn btn-outline btn-primary w-24 rounded-full mr-6 text-xs self-center">Add To Pack</a> */}
                  <span className="dropdown">
                    <label tabIndex={0} className="btn btn-secondary ml-2">
                      Add To Pack
                    </label>
                    <ul
                      tabIndex={0}
                      className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52"
                    >
                      {packs.map((pack, k) => {
                        const userId = user.user_id;
                        return (
                          <li key={k} onClick={() => {addToPack(pack.pack_id, userId)}}>
                            <a>{pack.name}</a>
                          </li>
                        );
                      })}
                    </ul>
                  </span>
                  <label htmlFor={hrefString2} className="ml-2 btn">
                    Create Pack
                  </label>

                  {/* Put this part before </body> tag */}
                  <input type="checkbox" id={hrefString2} className="modal-toggle" />
                  <span className="modal">
                    <span className="modal-box relative">
                      <label htmlFor={hrefString2} className="btn btn-sm btn-circle absolute right-2 top-2">
                        ✕
                      </label>
                      <CreatePackCard currentUser={currentUser} friend={user} />
                    </span>
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default FriendsList;
