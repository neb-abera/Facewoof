import React from 'react';
import PropTypes from 'prop-types';

/*
 * Catches a render error in one view instead of letting it unmount the whole
 * app. Without this, a single bad field (a profile that no longer exists, a
 * post with no author) left the visitor staring at a blank white page with the
 * only explanation in the browser console.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    console.error('view failed to render', error, info);
  }

  render() {
    const { failed } = this.state;
    const { children } = this.props;

    if (!failed) return children;

    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 px-6 text-center">
        <h2 className="text-2xl font-bold">Something went wrong on this page.</h2>
        <p className="opacity-75">The rest of Facewoof is still working.</p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => this.setState({ failed: false })}
        >
          Try again
        </button>
      </div>
    );
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired
};

export default ErrorBoundary;
