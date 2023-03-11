/* eslint-disable react/jsx-indent-props */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-template */
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Modal from 'react-modal';
import useUserContext from '../hooks/useUserContext';
import useCalendar from '../hooks/useCalender';
import PlaydateCalendar from '../components/Calendar/PlaydateCalendar';
import ViewPlaydate from '../components/Calendar/ViewPlaydate';
import AddPlaydate from '../components/Calendar/AddPlaydate';
import '../components/Calendar/Playdate.css';

const Calendar = () => {
  const [editPlaydateModal, setEditPlaydateModal] = useState(false);
  const [addPlaydateModal, setAddPlaydateModal] = useState(false);
  // Add new Playdate States:
  const [playStartTime, setStartTime] = useState();
  const [playEndTime, setEndTime] = useState();
  // View Selected Playdate states
  const [selectedPlaydate, setSelectedPlaydate] = useState();

  const { userId, setPlaydates, loggedIn } = useUserContext();
  const { getPacks } = useCalendar();
  console.log('call hook useCalendar');

  Modal.setAppElement('#root');

  const openEditModal = () => {
    setEditPlaydateModal(true);
  };

  const closeEditModal = () => {
    setEditPlaydateModal(false);
  };
  const openAddModal = () => {
    setAddPlaydateModal(true);
  };

  const closeAddModal = () => {
    setAddPlaydateModal(false);
  };

  useEffect(() => {
    // console.log('function getPacks is called with userId as: ', userId);
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
      <Modal isOpen={editPlaydateModal} onRequestClose={closeEditModal} className="playdate-modal">
        <ViewPlaydate closeEditModal={closeEditModal} selectedPlaydate={selectedPlaydate} />
      </Modal>
      <Modal isOpen={addPlaydateModal} onRequestClose={closeAddModal} className="playdate-modal">
        <AddPlaydate
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
