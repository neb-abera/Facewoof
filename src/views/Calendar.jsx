import { useEffect, useState } from "react";
import Modal from "react-modal";
import AddPlaydate from "../components/Calendar/AddPlaydate";
import PlaydateCalendar from "../components/Calendar/PlaydateCalendar";
import ViewPlaydate from "../components/Calendar/ViewPlaydate";
import useCalendar from "../hooks/useCalender";
import useUserContext from "../hooks/useUserContext";
import "../components/Calendar/Playdate.css";
import "../components/Shared/modal.css";

const Calendar = () => {
  const [editPlaydateModal, setEditPlaydateModal] = useState(false);
  const [addPlaydateModal, setAddPlaydateModal] = useState(false);
  // Add new Playdate States:
  const [playStartTime, setStartTime] = useState();
  const [playEndTime, setEndTime] = useState();
  // View Selected Playdate states
  const [, setSelectedPlaydate] = useState();

  const { userId, loggedIn } = useUserContext();
  const { getPacks } = useCalendar();

  const openEditModal = () => {
    setEditPlaydateModal(true);
  };

  const closeEditModal = () => {
    setEditPlaydateModal(false);
  };
  /*
   * Open the add form with sensible times already in it.
   *
   * It opened with every date field blank, so the first thing anyone had to do
   * was type a full date and time twice before they could do anything. The
   * next whole hour, running an hour, is right far more often than not, and
   * both are still editable.
   */
  const openAddModal = () => {
    if (!playStartTime) {
      const start = new Date();
      start.setMinutes(0, 0, 0);
      start.setHours(start.getHours() + 1);
      const end = new Date(start);
      end.setHours(end.getHours() + 1);
      setStartTime(start);
      setEndTime(end);
    }
    setAddPlaydateModal(true);
  };

  const closeAddModal = () => {
    setAddPlaydateModal(false);
  };

  useEffect(() => {
    getPacks();
  }, [userId, loggedIn]);

  return (
    <div id="calendar">
      {/* <h3>Playdate Calendar</h3> */}
      <PlaydateCalendar
        openEditModal={openEditModal}
        setEditPlaydateModal={setEditPlaydateModal}
        closeEditModal={closeEditModal}
        openAddModal={openAddModal}
        setAddPlaydateModal={setAddPlaydateModal}
        closeAddModal={closeAddModal}
        playStartTime={playStartTime}
        setStartTime={setStartTime}
        playEndTime={playEndTime}
        setEndTime={setEndTime}
        setSelectedPlaydate={setSelectedPlaydate}
      />
      <Modal
        isOpen={editPlaydateModal}
        onRequestClose={closeEditModal}
        className="app-modal"
        overlayClassName="app-modal__overlay"
      >
        <ViewPlaydate
          closeEditModal={closeEditModal}
          selectedPlaydate={selectedPlaydate}
        />
      </Modal>
      <Modal
        isOpen={addPlaydateModal}
        onRequestClose={closeAddModal}
        className="app-modal"
        overlayClassName="app-modal__overlay"
      >
        <AddPlaydate
          onAdded={getPacks}
          closeAddModal={closeAddModal}
          playStartTime={playStartTime}
          setStartTime={setStartTime}
          playEndTime={playEndTime}
          setEndTime={setEndTime}
        />
      </Modal>
    </div>
  );
};

export default Calendar;
