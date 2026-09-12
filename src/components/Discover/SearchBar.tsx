const RADII = [5, 10, 15, 20, 25, 50];

interface SearchBarProps {
  radius: number;
  onSetRadius: (miles: number) => void;
  location: string;
  onSetLocation: (location: string) => void;
  onSearch: () => void;
}

const SearchBar = ({
  radius,
  onSetRadius,
  location,
  onSetLocation,
  onSearch,
}: SearchBarProps) => {
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
        value={radius}
        onChange={(e) => onSetRadius(Number(e.target.value))}
      >
        {RADII.map((miles) => (
          <option key={miles} value={miles}>
            {miles} miles
          </option>
        ))}
      </select>
      <button type="submit" className="btn btn-sm btn-primary">
        Search
      </button>
    </form>
  );
};

export default SearchBar;
