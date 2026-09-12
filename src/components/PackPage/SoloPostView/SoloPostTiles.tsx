import type { CSSProperties } from "react";
import { usePackPosts, usePhotos } from "../../../queries";
import PostMaker from "./PostMaker";
import SoloPostTile from "./SoloPostTile";

interface SoloPostTilesProps {
  viewing: number;
  viewingName: string;
}

const styles: Record<"posts" | "packHighest", CSSProperties> = {
  posts: {
    display: "flex",
    flexDirection: "column",
    maxWidth: "100vw",
    minWidth: "80vw",
  },
  packHighest: {
    display: "flex",
    flexDirection: "column",
  },
};

const SoloPostTiles = ({ viewing, viewingName }: SoloPostTilesProps) => {
  const { data: posts = [] } = usePackPosts(viewing);
  const { data: photos = [] } = usePhotos();
  const pfp = photos[0] ?? null;

  // Newest first.
  const sorted = [...posts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  return (
    <div className="card" style={styles.packHighest}>
      <div>
        <PostMaker pfp={pfp} viewing={viewing} viewingName={viewingName} />
      </div>
      <div style={styles.posts}>
        {sorted.map((each) => (
          <SoloPostTile
            key={each.post_id}
            img={each.photo_url}
            content={each.body}
            postedOn={each.date}
            parentGroup={viewingName}
          />
        ))}
      </div>
    </div>
  );
};

export default SoloPostTiles;
