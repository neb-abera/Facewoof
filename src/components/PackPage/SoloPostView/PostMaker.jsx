import React, { useState, useEffect, useContext, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
axios.defaults.baseURL = 'http://localhost:3001';
import useUserContext from '../../../hooks/useUserContext';

const PostMaker = ({ viewing, viewingName, pfp }) => {
  const { userId } = useUserContext();
  // console.log('user_id', userId);
  var styles = {
    postMakerImg: {
      display: 'flex',
      flexDirection: 'row'
    },
    poster: {
      width: '100%',
      padding: '10px'
    },
    parent: {
      alignItems: 'stretch',
      padding: '10px',
      backgroundColor: '#d0f2f8'
    },
    button: {},
    textArea: {
      // borderRadius: '2.5%'
      // padding: '5px'
    }
  };
  var [body, setBody] = useState('');

  const makePost = () => {
    var packet = {};
    packet.body = body;
    packet.user_id = userId;
    packet.pack_id = viewing;
    setBody('');
    // $('#inputTextField')[0].reset();

    axios
      .get('/api/getPfp', {
        params: {
          userId: userId
        }
      })
      .then((resp) => {
        // console.log('received pfp', resp.data[0].url);
        packet.photo_url = resp.data[0].url;
        axios.post('/api/makePost', { packet: packet }).then(() => {
          // console.log('sent');
        });
      });
  };

  return (
    <>
      <div className="card bordered" style={styles.parent}>
        <div style={styles.postMakerImg}>
          <div className="avatar">
            <div className="w-24 rounded-full">
              <img src={pfp} />
            </div>
          </div>
          <div className="card" style={styles.poster}>
            Post To: {viewingName}
            {body.length <= 50 ? (
              <div>Characters Left: {50 - body.length}</div>
            ) : (
              <div>Minimum Reached</div>
            )}
            <textarea
              id="inputTextField"
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
