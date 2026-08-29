import axios from "axios";
import { useEffect, useState } from "react";
import PackName from "../AllPackView/PackName.jsx";

const SoloPackList = ({ setViewing }) => {
  const _listNames = ["Woofram Alpha", "Barkalona", "Bark Simpson"];

  const [packList, setPackList] = useState([]);

  useEffect(() => {
    axios.get("/api/getUserPacks").then((data) => {
      // console.log('data', data.data);
      const input = data.data;
      const packs = [];
      for (let i = 0; i < input.length; i++) {
        packs.push(input[i].name);
      }
      setPackList(packs);
      // console.log(packList);
    });
  }, []);

  const click = (packName) => {
    setViewing(packName);
    console.log("clicked", packName);
  };

  const _styles = {
    packList: {
      width: "100vw",
      backgroundColor: "transparent",
      // flexGrow: 2
    },
  };

  return (
    <div>
      {packList
        ? packList.map((packName) => (
            <li key={packName}>
              <button
                type="button"
                onClick={() => {
                  click(packName);
                }}
              >
                <PackName name={packName} setViewing={setViewing} />
              </button>
            </li>
          ))
        : null}
    </div>
  );
};

export default SoloPackList;
