import { useState } from "react";
import AllPostTiles from "../components/PackPage/AllPackView/AllPostTiles";
import PackMenu from "../components/PackPage/AllPackView/PackMenu";
import SoloPostTiles from "../components/PackPage/SoloPostView/SoloPostTiles";
import useUserContext from "../hooks/useUserContext";
import { useAllPosts } from "../queries";
import "./packFeed.css";

const PackFeed = () => {
  const { data: allPosts = [] } = useAllPosts();
  const { userId } = useUserContext();

  // The pack being viewed, or null for every pack's posts together.
  const [viewing, setViewing] = useState<number | null>(null);
  const [viewingName, setViewingName] = useState("");
  return (
    <div className="pack-feed">
      <PackMenu
        viewing={viewing}
        setViewing={setViewing}
        setViewingName={setViewingName}
        userIdentity={userId}
      />
      {viewing === null ? (
        <AllPostTiles allPosts={allPosts} />
      ) : (
        <SoloPostTiles viewing={viewing} viewingName={viewingName} />
      )}
    </div>
  );
};

export default PackFeed;
