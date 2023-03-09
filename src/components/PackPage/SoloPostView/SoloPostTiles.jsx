import React, { useState, useEffect, useContext, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import SoloPostTile from './SoloPostTile.jsx';
import SoloPackMenu from './SoloPackMenu.jsx';
import PostMaker from './PostMaker.jsx';
import axios from 'axios';

const SoloPostTiles = ({ viewing, userIdentity, viewingName }) => {
  var styles = {
    posts: {
      display: 'flex',
      flexDirection: 'column',
      maxWidth: '100vw',
      gapY: '25px',
      border: '3px solid black'
    },
    packHighest: {
      display: 'flex',
      flexDirection: 'column'
    }
  };

  var [data, setData] = useState([]);
  var [pfp, setPfp] = useState([]);

  useEffect(() => {
    axios
      .get('/api/getSoloPosts', {
        params: { userId: userIdentity, packId: viewing }
      })
      .then((packet) => {
        // console.log('data', packet.data);
        var input = packet.data;
        setData(input);
      })
      .then(() => {
        axios
          .get('/api/getPfp', {
            params: { userId: userIdentity }
          })
          .then((resp) => {
            setPfp(resp.data[0].url);
            // console.log('pfp', resp.data[0].url);
          });
      });
  }, [viewing]);

  return (
    <>
      <div className="card" style={styles.packHighest}>
        <div>
          <PostMaker pfp={pfp} viewing={viewing} viewingName={viewingName} />
        </div>
        <div style={styles.posts}>
          {data
            ? data.map((each, key) => (
                <SoloPostTile
                  key={key}
                  img={each.photo_url}
                  content={each.body}
                  postedOn={each.date}
                  parentGroup={each.pack_id}
                />
              ))
            : null}
        </div>
      </div>
    </>
  );
};

export default SoloPostTiles;
