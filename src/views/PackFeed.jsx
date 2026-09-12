import axios from "axios";
import { useEffect, useState } from "react";
import AllPostTiles from "../components/PackPage/AllPackView/AllPostTiles";
import PackMenu from "../components/PackPage/AllPackView/PackMenu";
import SoloPostTiles from "../components/PackPage/SoloPostView/SoloPostTiles";
import useUserContext from "../hooks/useUserContext";
import "./packFeed.css";

const PackFeed = () => {
  const [allPosts, setAllPosts] = useState([]);
  const { userId } = useUserContext();
  const userIdentity = userId;

  // On mount: the view is behind the sign-in guard and remounts when the
  // account changes, so the feed is for this visit to the page.
  useEffect(() => {
    axios
      .get("/api/getAllPacksPostsForUser")
      .then((resp) => setAllPosts(resp.data || []))
      .catch((err) => console.error("could not load the pack feed", err));
  }, []);

  const [viewing, setViewing] = useState("-1");
  const [viewingName, setViewingName] = useState("");
  return (
    <div className="pack-feed">
      <PackMenu
        viewing={viewing}
        setViewing={setViewing}
        setViewingName={setViewingName}
        userIdentity={userIdentity}
      />
      {viewing === "-1" ? (
        <AllPostTiles allPosts={allPosts} />
      ) : (
        <SoloPostTiles
          viewing={viewing}
          viewingName={viewingName}
          userIdentity={userIdentity}
        />
      )}
    </div>
  );
};

export default PackFeed;
