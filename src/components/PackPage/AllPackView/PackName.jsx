import React from 'react';

const PackName = ({ name, setViewing }) => {
  const styles = {};
  const click = () => {
    setViewing(name);
  };
  return <div onClick={click}>{name}</div>;
};

export default PackName;
