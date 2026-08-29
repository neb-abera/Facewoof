import PropTypes from "prop-types";
import { useState } from "react";
import CreatePackModal from "../PackModals/CreatePackModal.jsx";
import PackList from "./PackList.jsx";
import Playdates from "./Playdates.jsx";
import "./packMenu.css";

/*
 * The pack feed sidebar: which packs you are in, and what is coming up.
 *
 * Previously a stack of inline styles with a hardcoded 25vw column and two
 * panes pinned to 40vh and 50vh, each with its own scrollbar. The headings
 * carried no weight or contrast, so "Your Packs" read as stray text rather
 * than a label, and on a narrow window the buttons were pushed out of reach.
 * The layout lives in packMenu.css now and the sidebar scrolls as one piece.
 */
const PackMenu = ({ viewing, setViewing, userIdentity, setViewingName }) => {
  const [creatingPack, setCreatingPack] = useState(false);

  return (
    <>
      <CreatePackModal
        userIdentity={userIdentity}
        isOpen={creatingPack}
        onClose={() => setCreatingPack(false)}
      />
      <aside className="pack-menu">
        <div className="pack-menu__section">
          <p className="pack-menu__heading">Your packs</p>
          <ul className="pack-menu__list">
            <PackList
              setViewing={setViewing}
              setViewingName={setViewingName}
              userIdentity={userIdentity}
            />
          </ul>
        </div>

        <div className="pack-menu__section pack-menu__actions">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setCreatingPack(true)}
          >
            Create pack
          </button>
          {viewing !== "-1" ? (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setViewing("-1")}
            >
              View all posts
            </button>
          ) : null}
        </div>

        <div className="pack-menu__section">
          <p className="pack-menu__heading">Coming up</p>
          <Playdates userIdentity={userIdentity} />
        </div>
      </aside>
    </>
  );
};

PackMenu.propTypes = {
  viewing: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  setViewing: PropTypes.func.isRequired,
  setViewingName: PropTypes.func.isRequired,
  userIdentity: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

PackMenu.defaultProps = {
  userIdentity: undefined,
};

export default PackMenu;
