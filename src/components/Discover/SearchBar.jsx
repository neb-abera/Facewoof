/* eslint-disable react/jsx-indent-props */
/* eslint-disable react/prop-types */
import React from 'react';

const SearchBar = ({ radius, onSetRadius, location, onSetLocation, onSearch }) => {
  return (
    <form
      className="relative z-10 flex flex-wrap gap-4 bg-base-200 border-b border-base-300 py-3 px-6 sm:px-14 items-center"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch();
      }}
    >
      <input
        type="text"
        placeholder="City or zip code"
        className="input input-sm input-bordered w-48 max-w-xs placeholder:text-sm"
        value={location}
        onChange={(e) => onSetLocation(e.target.value)}
      />
      <select
        className="select select-sm select-bordered w-28"
        onChange={(e) => onSetRadius(e.target.value)}
      >
        <option defaultValue={radius}>5 miles</option>
        <option value={10}>10 miles</option>
        <option value={15}>15 miles</option>
        <option value={20}>20 miles</option>
        <option value={25}>25 miles</option>
        <option value={50}>50 miles</option>
      </select>
      {/* eslint-disable-next-line react/button-has-type */}
      <button
        className="btn btn-sm btn-primary"
        onClick={(event) => {
          event.preventDefault();
          onSearch();
        }}
      >
        Search
      </button>
    </form>
  );
};

export default SearchBar;
