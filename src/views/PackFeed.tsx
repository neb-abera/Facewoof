import { useEffect, useState } from "react";
import { api } from "../api";
import AllPostTiles from "../components/PackPage/AllPackView/AllPostTiles";
import PackMenu from "../components/PackPage/AllPackView/PackMenu";
import SoloPostTiles from "../components/PackPage/SoloPostView/SoloPostTiles";
import useUserContext from "../hooks/useUserContext";
import type { PackPost } from "../types";
import "./packFeed.css";

const PackFeed = () => {
  const [allPosts, setAllPosts] = useState<PackPost[]>([]);
  const { userId } = useUserContext();

  // On mount: the view is behind the sign-in guard and remounts when the
  // account changes, so the feed is for this visit to the page.
  useEffect(() => {
    api
      .GET("/api/getAllPacksPostsForUser")
      .then(({ data }) => setAllPosts(data ?? []))
      .catch((err: unknown) =>
        console.error("could not load the pack feed", err),
      );
  }, []);

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
