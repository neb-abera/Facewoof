import axios from "axios";
import { useEffect, useState } from "react";
import PackName from "./PackName.jsx";

const PackList = ({ setViewing, setViewingName }) => {
  var _listNames = ["Woofram Alpha", "Barkalona", "Bark Simpson"];

  var [packList, setPackList] = useState([]);

  useEffect(() => {
    axios
      .get("/api/getUserPacks")
      .then((data) => setPackList(data.data || []))
      .catch((err) => console.error("could not load the pack list", err));
  }, []);

  var click = (packData) => {
    // console.log('data in question', packData);
    setViewing(packData.pack_id);
    setViewingName(packData.name);
  };

  var _styles = {
    packList: {
      width: "100%",
      backgroundColor: "transparent",
    },
  };

  return (
    <>
      {packList
        ? packList.map((packName) => (
            <li key={packName.name}>
              <button
                type="button"
                onClick={() => {
                  click(packName);
                }}
              >
                <PackName name={packName.name} />
              </button>
            </li>
          ))
        : null}
    </>
  );
};

export default PackList;
