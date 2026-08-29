const SoloPlaydate = ({ dataPoint }) => {
  const _styles = {
    cal: {},
  };

  const currentDate = new Date(dataPoint.date);
  return (
    <div
      // biome-ignore lint/a11y/noNoninteractiveTabindex: daisyUI collapse opens on focus - the tabindex is what makes the widget work
      tabIndex={0}
      className="collapse collapse-arrow border border-base-300 bg-base-100 rounded-box"
    >
      <div className="collapse-title text-s font-small">
        {currentDate.toLocaleString()}
      </div>
      <div className="collapse-content">
        <p>{dataPoint.body}</p>
      </div>
    </div>
  );
};

export default SoloPlaydate;
