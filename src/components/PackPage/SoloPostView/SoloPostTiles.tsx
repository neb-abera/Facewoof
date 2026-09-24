import type { CSSProperties } from "react";
import { usePackPosts, usePhotos } from "../../../queries";
import LoadMore from "../../Shared/LoadMore";
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
  const { data, hasNextPage, isFetchingNextPage, fetchNextPage } =
    usePackPosts(viewing);
  const { data: photos = [] } = usePhotos();
  const pfp = photos[0] ?? null;

  // No client-side sort. The query orders by (date DESC, post_id DESC) and
  // pages arrive in that order, so the flattened list is already newest first.
  const sorted = data?.pages.flatMap((page) => page.posts) ?? [];

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
        <LoadMore
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          onClick={() => void fetchNextPage()}
          label="posts"
        />
      </div>
    </div>
  );
};

export default SoloPostTiles;
