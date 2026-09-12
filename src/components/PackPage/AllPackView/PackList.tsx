import { usePacks } from "../../../queries";
import type { Pack } from "../../../types";
import PackName from "./PackName";

interface PackListProps {
  setViewing: (packId: number) => void;
  setViewingName: (name: string) => void;
}

const PackList = ({ setViewing, setViewingName }: PackListProps) => {
  // Shared with the calendar's form and the friends list: one request, and
  // a pack created anywhere shows up here at once.
  const { data: packList = [] } = usePacks();

  const click = (pack: Pack) => {
    setViewing(pack.pack_id);
    setViewingName(pack.name);
  };

  return (
    <>
      {packList.map((pack) => (
        <li key={pack.pack_id}>
          <button type="button" onClick={() => click(pack)}>
            <PackName name={pack.name} />
          </button>
        </li>
      ))}
    </>
  );
};

export default PackList;
