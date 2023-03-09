/* eslint-disable react/jsx-indent-props */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-template */
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Modal from 'react-modal';
import useUserContext from '../hooks/useUserContext';
import PlaydateCalendar from '../components/Calendar/PlaydateCalendar';
import EditPlaydate from '../components/Calendar/EditPlaydate';
import AddPlaydate from '../components/Calendar/AddPlaydate';
import '../components/Calendar/Playdate.css';

const Calendar = () => {
  const [editPlaydateModal, setEditPlaydateModal] = useState(false);
  const [addPlaydateModal, setAddPlaydateModal] = useState(false);
  // Add new Playdate States:
  const [playStartTime, setStartTime] = useState();
  const [playEndTime, setEndTime] = useState();

  const { playdates, setPlaydates, handleSetPlaydates, setPacks } = useUserContext();

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
    axios
      .get(`http://localhost:3001/api/playdates?userId=${7}`)
      .then((data) => {
        const arr = data.data;
        const playdateArr = [];
        arr.forEach((obj, i) => {
          const pdObj = {};
          pdObj.id = i;
          pdObj.title = obj.pack_name + ': ' + obj.playdate_body;
          const startTime = new Date(obj.playdate_start_date);
          pdObj.start = startTime;
          const endTime = new Date(obj.playdate_end_date);
          pdObj.end = new Date(endTime);
          playdateArr.push(pdObj);
        });
        setPlaydates(playdateArr);
      })
      .then(() => axios.get(`http://localhost:3001/api/getpacks?userId=${7}`))
      .then((packData) => {
        // console.log(packData.data);
        setPacks(packData.data);
      });
  }, []);

  return (
    <div id="calendar">
      <h3>Playdate Calendar</h3>
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
      />
      <Modal isOpen={editPlaydateModal} onRequestClose={closeEditModal}>
        <EditPlaydate closeEditModal={closeEditModal} />
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
