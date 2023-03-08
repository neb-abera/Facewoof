import React, { useState, useEffect, useContext, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
axios.defaults.baseURL = 'http://localhost:3001';

const PostMaker = ({ viewing, viewingName, pfp }) => {
  // console.log('viewing', viewing);
  var styles = {
    postMakerImg: {
      // border: '1px solid black',
      display: 'flex',
      flexDirection: 'row'
    },
    poster: {
      width: '100%'
      // border: '1px solid green'
    },
    parent: {
      // border: '1px solid grey',
      alignItems: 'stretch'
    },
    button: {
      border: '1px solid white'
      // margin: '0px',
      // padding: '0px'
      // alignItems: ''
      // backgroundColor: 'white'
    }
  };
  var [body, setBody] = useState('');
  // console.log('viewing', viewing);
  // console.log('viewing name', viewingName);

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
