import React, { useState, useEffect, useContext, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PostTile from './PostTile.jsx';
import PackMenu from './PackMenu.jsx';

const AllPostTiles = () => {
  var img =
    'https://hips.hearstapps.com/hmg-prod.s3.amazonaws.com/images/golden-retriever-royalty-free-image-506756303-1560962726.jpg?crop=0.672xw:1.00xh;0.166xw,0&resize=640:*';

  var content =
    'Lorem ipsum sum sum what yeah woof woof yueah woof woof yeah bark barkl wooohoooo im barking';

  var postedOn = '01/02/2023';

  var parentGroup = 'WolfPack';

  var styles = {
    posts: {
      display: 'flex',
      flexDirection: 'column',
      gapY: '25px'
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
          <PostTile />
          <PostTile />
          <PostTile />
        </div>
      </div>
    </>
  );
};

export default AllPostTiles;
