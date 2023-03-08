import React, { useState, useEffect, useContext, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
axios.defaults.baseURL = 'http://localhost:3001';

const PostMaker = ({ viewing, viewingName, pfp }) => {
  var styles = {
    postMakerImg: {
      display: 'flex',
      flexDirection: 'row'
    },
    poster: {
      width: '100%'
    },
    parent: {
      alignItems: 'stretch'
    },
    button: {}
  };
  var [body, setBody] = useState('');

  return (
    <>
      <div style={styles.parent}>
        <div style={styles.postMakerImg}>
          <div className="avatar">
            <div className="w-24 rounded-full">
              <img src={pfp} />
            </div>
          </div>
          <div className="card" style={styles.poster}>
            Post To: {viewingName}
            <input className="input" type="text" />
          </div>
        </div>
        <div style={styles.button}>
          <button className={'btn btn-block'}>Post</button>
        </div>
      </div>
    </>
  );
};

export default PostMaker;
