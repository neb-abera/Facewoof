import axios from "axios";
import { useEffect, useState } from "react";
import useUserContext from "../../hooks/useUserContext";
import ProfileCardGeneral from "../Shared/ProfileCardGeneral";
import CreatePackCard from "./createPack";
import "./profile.css";

const FriendsList = ({ currentUser }) => {
  const [friendsData, setFriendsData] = useState([]);
  // setPacks comes from the context too. It was called here without ever
  // being taken from it, so every mount threw ReferenceError inside the
  // promise chain, the catch below logged it, and the "Add To Pack" menu only
  // ever had packs in it if the calendar page had happened to load them
  // first. Lint was not watching: a stray src/package.json kept Biome's React
  // rules off for the whole client until it was removed.
  const { packs, setPacks } = useUserContext();

  // Once, on mount: the list is for this visit to the page.
  useEffect(() => {
    axios
      .get("/api/friends")
      .then((results) => setFriendsData(results.data))
      .catch((err) => {
        console.log("err", err);
      });
  }, []);

  useEffect(() => {
    axios
      .get("/api/getpacks")
      .then((results) => setPacks(results.data))
      .catch((err) => {
        console.log("err in getpacks", err);
      });
  }, [setPacks]);

  const addToPack = (packId) => {
    axios
      .put("/api/addtopack", { pack_id: packId })
      .then(() => {
        console.log("added to pack");
      })
      .catch(() => {
        alert("That user is already a part of that pack");
      });
  };

  return (
    <div className="card g-base-96 bg-base-200 shadow-xl max-w-fit max-h-fit mx-auto">
      <table className="table w-[470px]">
        <thead>
          <tr>
            <th>Friends List</th>
          </tr>
        </thead>
        <tbody>
          {friendsData.map((user, index) => {
            // Ids, not CSS selectors. These were `#my-modal-N`, and a label's
            // htmlFor matches an element id literally, so the leading # made
            // every one of these buttons a no-op.
            const hrefString = `my-modal-${index}`;
            const hrefString2 = `my-modal-${index + 10}`;
            return (
              <tr key={user.user_id} className="flex">
                <td className="bg-base-200">
                  <label
                    htmlFor={hrefString}
                    className="btn btn-primary w-40 self-center"
                  >
                    {user.dog_name}
                  </label>
                  {/* Put this part before </body> tag */}
                  <input
                    type="checkbox"
                    id={hrefString}
                    className="modal-toggle"
                  />
                  <span className="modal">
                    <span className="modal-box relative">
                      <label
                        htmlFor={hrefString}
                        className="btn btn-secondary mt-2.5 mr-3.5"
                      >
                        ✕
                      </label>
                      <ProfileCardGeneral user={user} />
                    </span>
                  </span>

                  {/* <a className="btn btn-outline btn-primary w-24 rounded-full mr-6 text-xs self-center">Add To Pack</a> */}
                  <span className="dropdown">
                    {/* biome-ignore lint/a11y/noLabelWithoutControl: daisyUI dropdown trigger - focus on this label opens the menu */}
                    {/* biome-ignore lint/a11y/noNoninteractiveTabindex: daisyUI dropdowns are focus-driven; both tabindexes are functional */}
                    <label tabIndex={0} className="btn btn-secondary ml-2">
                      Add To Pack
                    </label>
                    <ul
                      // biome-ignore lint/a11y/noNoninteractiveTabindex: daisyUI dropdowns are focus-driven
                      tabIndex={0}
                      className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52"
                    >
                      {packs.map((pack) => {
                        const userId = user.user_id;
                        return (
                          <li key={pack.pack_id}>
                            <button
                              type="button"
                              onClick={() => {
                                addToPack(pack.pack_id, userId);
                              }}
                            >
                              {pack.name}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </span>
                  <label htmlFor={hrefString2} className="ml-2 btn">
                    Create Pack
                  </label>

                  {/* Put this part before </body> tag */}
                  <input
                    type="checkbox"
                    id={hrefString2}
                    className="modal-toggle"
                  />
                  <span className="modal">
                    <span className="modal-box relative">
                      <label
                        htmlFor={hrefString2}
                        className="btn btn-sm btn-circle absolute right-2 top-2"
                      >
                        ✕
                      </label>
                      <CreatePackCard currentUser={currentUser} friend={user} />
                    </span>
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default FriendsList;
