import type { CSSProperties } from "react";

interface SoloPostTileProps {
  img: string | null;
  content: string | null;
  postedOn: string;
  parentGroup: string;
}

const styles: Record<
  "pfp" | "tile" | "imageAndPostedOn" | "parent" | "content",
  CSSProperties
> = {
  pfp: {
    borderRadius: "25%",
    maxWidth: "100px",
    maxHeight: "100px",
  },
  tile: {
    display: "flex",
    flexDirection: "row",
    padding: "10px",
  },
  imageAndPostedOn: {
    display: "flex",
    flexDirection: "column",
    width: "25%",
  },
  parent: {
    height: "100%",
    width: "100%",
    padding: "15px",
  },
  content: {
    padding: "10px",
    maxWidth: "85%",
    width: "85%",
  },
};

const SoloPostTile = ({
  img,
  content,
  postedOn,
  parentGroup,
}: SoloPostTileProps) => {
  const currentDate = new Date(postedOn);

  return (
    <div style={styles.parent}>
      <div className="card shadow-xl" style={styles.tile}>
        <figure style={styles.imageAndPostedOn}>
          {img ? (
            <img style={styles.pfp} src={img} alt="What was posted" />
          ) : null}
          <div className="card">Posted On: {currentDate.toLocaleString()}</div>
          <div className="">Part Of: {parentGroup}</div>
        </figure>
        <div className="card shadow-xl" style={styles.content}>
          {content}
        </div>
      </div>
    </div>
  );
};

export default SoloPostTile;
