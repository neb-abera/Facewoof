import React, { useState, useEffect } from 'react';
import axios from 'axios';
import SoloPostTile from './SoloPostTile';
import PostMaker from './PostMaker';

const SoloPostTiles = ({ viewing, userIdentity, viewingName }) => {
  const styles = {
    posts: {
      display: 'flex',
      flexDirection: 'column',
      maxWidth: '100vw',
      minWidth: '80vw',
      gapY: '25px'
      // border: '3px solid black'
    },
    packHighest: {
      display: 'flex',
      flexDirection: 'column'
    }
  };

  let [data, setData] = useState([]);
  const [pfp, setPfp] = useState([]);

  useEffect(() => {
    axios
      .get('/api/getSoloPosts', {
        params: { userId: userIdentity, packId: viewing }
      })
      .then((packet) => {
        // console.log('data', packet.data);
        const input = packet.data;
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

  if (data) {
    data = data.sort((a, b) => {
      return new Date(b.date) - new Date(a.date);
    });
  }

  return (
    <div className="card" style={styles.packHighest}>
      <div>
        <PostMaker pfp={pfp} viewing={viewing} viewingName={viewingName} />
      </div>
      <div style={styles.posts}>
        {data
          ? data.map((each, key) => (
              <SoloPostTile
                // eslint-disable-next-line prettier/prettier
                  key={`${key + 1}`}
                img={each.photo_url}
                content={each.body}
                postedOn={each.date}
                parentGroup={viewingName}
              />
            ))
          : null}
      </div>
    </div>
  );
};

export default SoloPostTiles;
