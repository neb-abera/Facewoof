import React, { useState, useEffect, useContext, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const SoloPostTile = ({ img, content, postedOn, parentGroup }) => {
  var styles = {
    pfp: {
      borderRadius: '25%',
      maxWidth: '100px',
      maxHeight: '100px'
    },
    tile: {
      display: 'flex',
      flexDirection: 'row'
    },
    imageAndPostedOn: {
      display: 'flex',
      flexDirection: 'column',
      border: '2px solid blue',
      width: '25%'
    },
    parent: {
      height: '100%',
      width: '100%',
      border: '3px solid red'
    },
    content: {
      border: '3px solid grey',
      maxWidth: '85%',
      width: '85%'
    }
  };

  return (
    <>
      <div style={styles.parent}>
        <div className="card shadow-xl" style={styles.tile}>
          <figure style={styles.imageAndPostedOn}>
            <img style={styles.pfp} src={img}></img>
            <div className="card">Posted On: {postedOn}</div>
            <div className="">Part Of: {parentGroup}</div>
          </figure>
          <div className="card shadow-xl" style={styles.content}>
            {content}
          </div>
        </div>
      </div>
    </>
  );
};

export default SoloPostTile;
