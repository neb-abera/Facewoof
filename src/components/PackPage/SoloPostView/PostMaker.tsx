import { type CSSProperties, useState } from "react";
import { useMakePost } from "../../../queries";

interface PostMakerProps {
  /* The pack being posted to. */
  viewing: number;
  viewingName: string;
  /* The author's profile photo URL, shown beside the box and on the post. */
  pfp: string | null;
}

const styles: Record<"postMakerImg" | "poster" | "parent", CSSProperties> = {
  postMakerImg: {
    display: "flex",
    flexDirection: "row",
  },
  poster: {
    width: "100%",
    padding: "10px",
  },
  parent: {
    alignItems: "stretch",
    padding: "10px",
    backgroundColor: "var(--color-base-300)",
  },
};

// A post has to be longer than this. Kept from the original; the counter
// below counts down to it.
const MIN_LENGTH = 50;

const PostMaker = ({ viewing, viewingName, pfp }: PostMakerProps) => {
  const [body, setBody] = useState("");
  // The feeds that show the post refresh themselves when it lands.
  const post = useMakePost();

  const makePost = async () => {
    const text = body;
    setBody("");
    try {
      // The photo on the post is the author's profile photo.
      await post.mutateAsync({ pack_id: viewing, body: text, photo_url: pfp });
    } catch (err) {
      console.error("could not post", err);
    }
  };

  return (
    <div className="card bordered" style={styles.parent}>
      <div style={styles.postMakerImg}>
        <div className="avatar">
          <div className="w-24 rounded-full">
            <img src={pfp ?? undefined} alt="Your avatar" />
          </div>
        </div>
        <div className="card" style={styles.poster}>
          Post To: {viewingName}
          {body.length <= MIN_LENGTH ? (
            <div>Characters Left: {MIN_LENGTH - body.length}</div>
          ) : (
            <div>Minimum Reached</div>
          )}
          <textarea
            id="inputTextField"
            onChange={(e) => setBody(e.target.value)}
            className="textarea-bordered"
            placeholder="Make A Post"
            value={body}
          />
        </div>
      </div>
      <div>
        <button
          type="button"
          className="btn btn-block"
          disabled={body.length <= MIN_LENGTH}
          onClick={() => {
            if (body.length > MIN_LENGTH) makePost();
          }}
        >
          Post
        </button>
      </div>
    </div>
  );
};

export default PostMaker;
