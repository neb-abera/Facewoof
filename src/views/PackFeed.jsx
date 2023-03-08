import React, { useState, useEffect, useContext, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AllPostTiles from '../components/PackPage/AllPackView/AllPostTiles.jsx';
import PackMenu from '../components/PackPage/AllPackView/PackMenu.jsx';
import SoloPostTiles from '../components/PackPage/SoloPostView/SoloPostTiles.jsx';
import axios from 'axios';
axios.defaults.baseURL = 'http://localhost:3001';

const PackFeed = () => {
  var styles = {
    PackLayout: {
      display: 'flex',
      width: '100%',
      flexDirection: 'row',
      border: '3px solid blue',
      // marginLeft: '0px',
      boxSizing: 'content-box'
      // justifyContent: 'space-between'
    }
  };
  const [data, setData] = useState('');
  const [allPosts, setAllPosts] = useState([]);
  var userIdentity = 4;

  useEffect(() => {
    axios
      .post('/getAllPacksPostsForUser', {
        userId: userIdentity
      })
      .then((resp) => {
        // console.log('responses', resp.data);
        var allPosts = [];
        for (var i = 0; i < resp.data.length; i++) {
          for (var j = 0; j < resp.data[i].length; j++) {
            allPosts.push(resp.data[i][j]);
          }
        }
        setAllPosts(allPosts);
        // var
      }, []);
  }, []);

  var [viewing, setViewing] = useState('-1');
  var [viewingName, setViewingName] = useState('');
  return (
    <>
      <div style={styles.PackLayout}>
        <PackMenu
          setViewing={setViewing}
          setViewingName={setViewingName}
          userIdentity={userIdentity}
        />
        {viewing === '-1' ? (
          <AllPostTiles allPosts={allPosts} />
        ) : (
          <SoloPostTiles viewing={viewing} viewingName={viewingName} userIdentity={userIdentity} />
        )}
      </div>
    </>
  );
};

export default PackFeed;
