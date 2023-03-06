import React, { useState, useEffect, useContext, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const PostTile = () => {
  var img =
    'https://hips.hearstapps.com/hmg-prod.s3.amazonaws.com/images/golden-retriever-royalty-free-image-506756303-1560962726.jpg?crop=0.672xw:1.00xh;0.166xw,0&resize=640:*';

  var content =
    'Lorem ipsum sum sum what yeah woof woof yueah woof woof yeah bark barkl wooohoooo im barking';

  var postedOn = '01/02/2023';

  var parentGroup = 'WolfPack';

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
      flexDirection: 'column'
    },
    parent: {
      // height: "100px"
    }
  };

  return (
    <>
      <div className="card shadow-xl card-bordered" style={styles.parent}>
        <div className="card shadow-xl" style={styles.tile}>
          <figure style={styles.imageAndPostedOn}>
            <img style={styles.pfp} src={img}></img>
            <div className="card">Posted On: {postedOn}</div>
            <div className="">Part Of: {parentGroup}</div>
          </figure>
          <div className="card shadow-xl card-bordered">{content}</div>
        </div>
      </div>
    </>
  );
};

export default PostTile;
