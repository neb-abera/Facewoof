/* eslint-disable react/jsx-indent-props */
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AllPostTiles from '../components/PackPage/AllPackView/AllPostTiles';
import PackMenu from '../components/PackPage/AllPackView/PackMenu';
import SoloPostTiles from '../components/PackPage/SoloPostView/SoloPostTiles';
import useUserContext from '../hooks/useUserContext';

axios.defaults.baseURL = 'http://localhost:3001';

const PackFeed = () => {
  const styles = {
    PackLayout: {
      display: 'flex',
      width: '100%',
      flexDirection: 'row',
      // border: '3px solid blue',
      // marginLeft: '0px',
      boxSizing: 'content-box'
      // justifyContent: 'space-between'
    }
  };

  const [allPosts, setAllPosts] = useState([]);
  const { userId } = useUserContext();
  const userIdentity = userId;

  useEffect(() => {
    axios
      .get('/api/getAllPacksPostsForUser', {
        params: { userId: userIdentity }
      })
      .then((resp) => {
        // console.log('responses', resp.data.rows);
        setAllPosts(resp.data.rows[0].json_agg);
      }, []);
  }, []);

  const [viewing, setViewing] = useState('-1');
  const [viewingName, setViewingName] = useState('');
  return (
    <div style={styles.PackLayout}>
      <PackMenu
        viewing={viewing}
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
  );
};

export default PackFeed;
