import React, { useState, useEffect, useContext, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import PostTile from './PostTile.jsx';
import './postTile.css';
import PackMenu from './PackMenu.jsx';

const AllPostTiles = ({ allPosts }) => {
  // var img = data.photo_url;

  // var content = data.body;

  // var postedOn = data.date;

  // var parentGroup = data.packId;
  // console.log('AllPostTiles received', data);
  const styles = {
    posts: {
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      width: '100%'
    },
    packHighest: {
      display: 'flex',
      flexDirection: 'row',
      width: '100%'
    }
  };
  // console.log('all posts', allPosts);
  allPosts = allPosts.sort((a, b) => {
    return new Date(b.date) - new Date(a.date);
  });

  return (
    <div className="card" style={styles.packHighest}>
      <div style={styles.posts}>
        {allPosts
          ? allPosts.map((each, key) => (
              <PostTile
                key={key}
                img={each.photo_url}
                content={each.body}
                postedOn={each.date}
                parentGroup={each.name}
              />
            ))
          : null}
      </div>
    </div>
  );
};

export default AllPostTiles;
