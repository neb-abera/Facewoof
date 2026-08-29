import PropTypes from "prop-types";

/*
 * A pack's name in the sidebar.
 *
 * Display only. It used to carry its own onClick that called
 * setViewing(name) — the pack's *name*, where every consumer expects its
 * numeric id — and being the inner element it won the click over the list
 * item's correct handler. Selecting a pack therefore set `viewing` to a string,
 * the posts request asked for packId='Chelsea Morning Crew', and nothing
 * happened. The list item owns the click now.
 */
const PackName = ({ name }) => <div>{name}</div>;

PackName.propTypes = {
  name: PropTypes.string.isRequired,
};

export default PackName;
