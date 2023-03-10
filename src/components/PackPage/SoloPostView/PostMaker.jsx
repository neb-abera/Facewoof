import React, { useState, useEffect, useContext, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
axios.defaults.baseURL = 'http://localhost:3001';
import useUserContext from '../../../hooks/useUserContext';

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
    button: {},
    textArea: {
      // borderRadius: '2.5%'
      padding: '5px'
    }
  };
  var [body, setBody] = useState('');

  const makePost = () => {
    var packet = {};
    packet.body = body;
    packet.groupId = viewing;
  };

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
            <textarea
              onChange={(e) => {
                setBody(e.target.value);
              }}
              className="textarea-bordered"
              placeholder="Make A Post"
              style={styles.textArea}
            ></textarea>
          </div>
        </div>
        <div style={styles.button}>
          <button
            className={'btn btn-block'}
            onClick={() => {
              body.length > 50 ? makePost() : null;
            }}
          >
            Post
          </button>
        </div>
      </div>
    </>
  );
};

export default PostMaker;
