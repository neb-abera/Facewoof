import type { CSSProperties } from "react";
import type { PackPost } from "../../../types";
import LoadMore from "../../Shared/LoadMore";
import PostTile from "./PostTile";
import "./postTile.css";

const styles: Record<"posts" | "packHighest", CSSProperties> = {
  posts: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    width: "100%",
  },
  packHighest: {
    display: "flex",
    flexDirection: "row",
    width: "100%",
  },
};

interface AllPostTilesProps {
  allPosts: PackPost[];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
}

const AllPostTiles = ({
  allPosts,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: AllPostTilesProps) => {
  // No client-side sort. The query orders by (date DESC, post_id DESC), which
  // is stricter than the date-only sort this had, and pages arrive in that
  // order, so re-sorting the accumulated list every render bought nothing.
  const sorted = allPosts;

  return (
    <div className="card" style={styles.packHighest}>
      <div style={styles.posts}>
        {sorted.map((each) => (
          <PostTile
            key={each.post_id}
            img={each.photo_url}
            content={each.body}
            postedOn={each.date}
            parentGroup={each.name}
          />
        ))}
        <LoadMore
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          onClick={onLoadMore}
          label="posts"
        />
      </div>
    </div>
  );
};

export default AllPostTiles;
