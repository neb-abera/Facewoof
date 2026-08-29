import axios from "axios";
import { useEffect, useState } from "react";
import SoloPlaydate from "./SoloPlaydate";

const SoloPlaydates = ({ setViewing }) => {
  // var listNames = ['Woofram Alpha', 'Barkalona', 'Bark Simpson'];

  const [playdates, setPlaydates] = useState([]);

  useEffect(() => {
    axios.get("/api/getUserPlaydates").then((data) => {
      // console.log('data', data.data);
      const input = data.data;
      // var packs = [];
      // for (var i = 0; i < input.length; i++) {
      //   packs.push({input[i], });
      // }
      setPlaydates(input);
      // console.log('playdates state', playdates);
    });
  }, []);

  const _styles = {
    playdates: {
      width: "100%",
      backgroundColor: "transparent",
      // flexGrow: 2
    },
  };

  return (
    <div>
      {/* {console.log('within code', typeof playdates)} */}
      {playdates
        ? playdates.map((playdate) => (
            <li key={playdate.playdate_id}>
              <div>
                <SoloPlaydate dataPoint={playdate} setViewing={setViewing} />
              </div>
            </li>
          ))
        : null}

      {/* <li>
          <PackName name={listNames[1]} setViewing={setViewing} />
        </li>
        <li>
          <PackName name={listNames[2]} setViewing={setViewing} />
        </li> */}
    </div>
  );
};

export default SoloPlaydates;
