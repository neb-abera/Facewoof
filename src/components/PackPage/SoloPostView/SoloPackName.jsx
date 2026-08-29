const SoloPackName = ({ name, setViewing }) => {
  const _styles = {};
  // console.log(name);
  const click = () => {
    setViewing(name);
    // console.log('clicked', name);
  };
  return (
    <button type="button" onClick={click}>
      {name}
    </button>
  );
};

export default SoloPackName;
