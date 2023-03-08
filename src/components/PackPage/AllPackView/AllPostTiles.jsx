import React, { useState, useEffect, useContext, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PostTile from './PostTile.jsx';
import PackMenu from './PackMenu.jsx';

const AllPostTiles = ({ allPosts }) => {
  // var img = data.photo_url;

  // var content = data.body;

  // var postedOn = data.date;

  // var parentGroup = data.packId;
  // console.log('AllPostTiles received', data);
  var styles = {
    posts: {
      display: 'flex',
      flexDirection: 'column',
      maxWidth: '65vw',
      gapY: '25px',
      border: '3px solid black'
    },
    packHighest: {
      display: 'flex',
      flexDirection: 'row'
    }
  };

  return (
    <>
      <div className="card" style={styles.packHighest}>
        <div style={styles.posts}>
          {allPosts
            ? allPosts.map((each, key) => (
                <PostTile
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

export default AllPostTiles;
