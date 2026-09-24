import { useState } from "react";
import AllPostTiles from "../components/PackPage/AllPackView/AllPostTiles";
import PackMenu from "../components/PackPage/AllPackView/PackMenu";
import SoloPostTiles from "../components/PackPage/SoloPostView/SoloPostTiles";
import useUserContext from "../hooks/useUserContext";
import { useAllPosts } from "../queries";
import "./packFeed.css";

const PackFeed = () => {
  const {
    data: allPages,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useAllPosts();
  const allPosts = allPages?.pages.flatMap((page) => page.posts) ?? [];
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
        <AllPostTiles
          allPosts={allPosts}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          onLoadMore={fetchNextPage}
        />
      ) : (
        <SoloPostTiles viewing={viewing} viewingName={viewingName} />
      )}
    </div>
  );
};

export default PackFeed;
