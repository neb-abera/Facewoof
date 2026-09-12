import type { CSSProperties } from "react";
import type { PackPost } from "../../../types";
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

const AllPostTiles = ({ allPosts }: { allPosts: PackPost[] }) => {
  // Newest first. A copy: sorting a prop in place mutated the parent's state.
  const sorted = [...allPosts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

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
      </div>
    </div>
  );
};

export default AllPostTiles;
