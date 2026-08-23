import React from 'react';
import PropTypes from 'prop-types';

/*
 * One post in the pack feed.
 *
 * It used to be a row split 25/85 — which overflows on its own — with the
 * photo, the timestamp and the pack name stacked in a narrow left column and
 * the message stranded in a card far to the right. The message is the point of
 * the post, so it leads; the timestamp and pack read as a caption underneath.
 */
const PostTile = ({ img, content, postedOn, parentGroup }) => {
  const posted = new Date(postedOn);
  const when = Number.isNaN(posted.getTime()) ? null : posted.toLocaleString();

  return (
    <article className="post-tile">
      {img ? <img className="post-tile__photo" src={img} alt="" /> : null}
      <div className="post-tile__body">
        <p className="post-tile__content">{content}</p>
        <p className="post-tile__meta">
          {parentGroup ? <span className="post-tile__pack">{parentGroup}</span> : null}
          {when ? <span>{when}</span> : null}
        </p>
      </div>
    </article>
  );
};

PostTile.propTypes = {
  img: PropTypes.string,
  content: PropTypes.string,
  postedOn: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.instanceOf(Date)]),
  parentGroup: PropTypes.string
};

PostTile.defaultProps = {
  img: undefined,
  content: '',
  postedOn: undefined,
  parentGroup: undefined
};

export default PostTile;
