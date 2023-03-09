/* eslint-disable react/jsx-indent-props */
/* eslint-disable react/prop-types */
import React from 'react';

const SearchBar = ({ radius, onSetRadius, location, onSetLocation, onSearch }) => {
  return (
    <form
      className="flex space-x-6 bg-primary py-3 px-14 items-center"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch();
      }}
    >
      <input
        type="text"
        placeholder="City or zip code"
        className="input w-48 max-w-xs focus:outline-none h-7 rounded-xl placeholder:text-sm"
        value={location}
        onChange={(e) => onSetLocation(e.target.value)}
      />
      <select
        className="select max-w-xs select-sm w-24 focus:outline-none rounded-xl w-24 min-h-0 h-[1.7rem] leading-none"
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
        className="btn btn-sm btn-rounded"
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
