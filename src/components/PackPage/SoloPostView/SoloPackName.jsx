import React from 'react';

const SoloPackName = ({ name, setViewing }) => {
  const styles = {};
  // console.log(name);
  const click = () => {
    setViewing(name);
    // console.log('clicked', name);
  };
  return <div onClick={click}>{name}</div>;
};

export default SoloPackName;
