import { useEffect, useState } from "react";
import { api } from "../../../api";
import type { Pack } from "../../../types";
import PackName from "./PackName";

interface PackListProps {
  setViewing: (packId: number) => void;
  setViewingName: (name: string) => void;
}

const PackList = ({ setViewing, setViewingName }: PackListProps) => {
  const [packList, setPackList] = useState<Pack[]>([]);

  useEffect(() => {
    api
      .GET("/api/getUserPacks")
      .then(({ data }) => setPackList(data ?? []))
      .catch((err: unknown) =>
        console.error("could not load the pack list", err),
      );
  }, []);

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
