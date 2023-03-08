/* eslint-disable react/prop-types */
/* eslint-disable no-shadow */
/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaDog } from 'react-icons/fa';
import axios from 'axios';

import ProfileCard from './ProfileCard';
import Match from './Match';
import Blank from './Blank';
import './cardStack.css';

const CardStack = ({ users }) => {
  const [front, setFront] = useState(null);
  const [back, setBack] = useState(null);

  const [data, setData] = useState([]);
  const [stack, setStack] = useState([]);
  const [user, setUser] = useState(null);

  const [out, setOut] = useState(null);
  const [pass, setPass] = useState(null);

  const [choice, setChoice] = useState(null);
  const [match, setMatch] = useState(false);
  const [matchOut, setMatchOut] = useState(false);

  const [currentUser, setCurrentUser] = useState({
    user_id: '27',
    dog_name: 'Murvyn',
    owner_name: 'Teodora Shearstone',
    dog_breed: 'Royal tern',
    age: 13,
    vaccination: true,
    discoverable: true,
    owner_email: 'sreapq@blogtalkradio.com',
    location: '10036',
    user1_choice: null,
    photos: [
      'http://dummyimage.com/122x100.png/5fa2dd/ffffff',
      'http://dummyimage.com/191x100.png/dddddd/000000',
      'http://dummyimage.com/181x100.png/ff4444/ffffff'
    ]
  });

  const exData = [
    {
      user_id: '27',
      dog_name: 'Murvyn',
      owner_name: 'Teodora Shearstone',
      dog_breed: 'Royal tern',
      age: 13,
      vaccination: true,
      discoverable: true,
      owner_email: 'sreapq@blogtalkradio.com',
      location: '10036',
      user1_choice: null,
      photos: [
        'http://dummyimage.com/122x100.png/5fa2dd/ffffff',
        'http://dummyimage.com/191x100.png/dddddd/000000',
        'http://dummyimage.com/181x100.png/ff4444/ffffff'
      ]
    },
    {
      user_id: '56',
      dog_name: 'Tierney',
      owner_name: 'Barbara Simons',
      dog_breed: 'Turtle, long-necked',
      age: 11,
      vaccination: false,
      discoverable: true,
      owner_email: 'efetherby1j@forbes.com',
      location: '10019',
      user1_choice: null,
      photos: [
        'http://dummyimage.com/148x100.png/cc0000/ffffff',
        'http://dummyimage.com/144x100.png/cc0000/ffffff',
        'http://dummyimage.com/229x100.png/cc0000/ffffff'
      ]
    },
    {
      user_id: '58',
      dog_name: 'Herold',
      owner_name: 'Corri Collinette',
      dog_breed: 'Killer whale',
      age: 4,
      vaccination: false,
      discoverable: true,
      owner_email: 'rstolberg1l@goo.gl',
      location: '10017',
      user1_choice: null,
      photos: [
        'http://dummyimage.com/128x100.png/dddddd/000000',
        'http://dummyimage.com/122x100.png/ff4444/ffffff',
        'http://dummyimage.com/221x100.png/cc0000/ffffff'
      ]
    },
    {
      user_id: '8',
      dog_name: 'Jobi',
      owner_name: 'Bevin Daine',
      dog_breed: 'Indian tree pie',
      age: 3,
      vaccination: true,
      discoverable: true,
      owner_email: 'cconsadine7@shutterfly.com',
      location: '10036',
      user1_choice: true,
      photos: [
        'http://dummyimage.com/154x100.png/ff4444/ffffff',
        'http://dummyimage.com/170x100.png/ff4444/ffffff',
        'http://dummyimage.com/204x100.png/ff4444/ffffff'
      ]
    },
    {
      user_id: '74',
      dog_name: 'Rodie',
      owner_name: 'Shauna Marzelo',
      dog_breed: 'Osprey',
      age: 12,
      vaccination: false,
      discoverable: true,
      owner_email: 'tveivers21@tripod.com',
      location: '07086',
      user1_choice: null,
      photos: [
        'http://dummyimage.com/229x100.png/5fa2dd/ffffff',
        'http://dummyimage.com/192x100.png/dddddd/000000',
        'http://dummyimage.com/113x100.png/ff4444/ffffff'
      ]
    },
    {
      user_id: '29',
      dog_name: 'Antoni',
      owner_name: 'Fina Headings',
      dog_breed: 'Superb starling',
      age: 6,
      vaccination: true,
      discoverable: true,
      owner_email: 'sniblocks@ebay.co.uk',
      location: '10029',
      user1_choice: null,
      photos: [
        'http://dummyimage.com/245x100.png/cc0000/ffffff',
        'http://dummyimage.com/115x100.png/dddddd/000000',
        'http://dummyimage.com/160x100.png/ff4444/ffffff'
      ]
    },
    {
      user_id: '68',
      dog_name: 'Nanni',
      owner_name: 'Roberta Bagshaw',
      dog_breed: 'Brown and yellow marshbird',
      age: 3,
      vaccination: false,
      discoverable: true,
      owner_email: 'kberka1v@ameblo.jp',
      location: '11240',
      user1_choice: null,
      photos: [
        'http://dummyimage.com/148x100.png/cc0000/ffffff',
        'http://dummyimage.com/178x100.png/dddddd/000000',
        'http://dummyimage.com/137x100.png/ff4444/ffffff'
      ]
    },
    {
      user_id: '34',
      dog_name: 'Noelani',
      owner_name: 'Jody Stockell',
      dog_breed: 'Aardwolf',
      age: 7,
      vaccination: true,
      discoverable: true,
      owner_email: 'ckrautx@mlb.com',
      location: '10021',
      user1_choice: null,
      photos: [
        'http://dummyimage.com/202x100.png/5fa2dd/ffffff',
        'http://dummyimage.com/114x100.png/ff4444/ffffff',
        'http://dummyimage.com/245x100.png/ff4444/ffffff'
      ]
    },
    {
      user_id: '51',
      dog_name: 'Brendis',
      owner_name: 'Clive Ourtic',
      dog_breed: 'Fox, pampa gray',
      age: 5,
      vaccination: true,
      discoverable: true,
      owner_email: 'djarmaine1e@ask.com',
      location: '10017',
      user1_choice: null,
      photos: [
        'http://dummyimage.com/213x100.png/5fa2dd/ffffff',
        'http://dummyimage.com/219x100.png/ff4444/ffffff',
        'http://dummyimage.com/173x100.png/5fa2dd/ffffff'
      ]
    },
    {
      user_id: '52',
      dog_name: 'Bartlett',
      owner_name: "Nate O'Grada",
      dog_breed: 'Crimson-breasted shrike',
      age: 1,
      vaccination: false,
      discoverable: true,
      owner_email: 'bkelf1f@eepurl.com',
      location: '10036',
      user1_choice: null,
      photos: [
        'http://dummyimage.com/219x100.png/ff4444/ffffff',
        'http://dummyimage.com/185x100.png/cc0000/ffffff',
        'http://dummyimage.com/123x100.png/cc0000/ffffff'
      ]
    },
    {
      user_id: '63',
      dog_name: 'Lowell',
      owner_name: 'Celie Andriveaux',
      dog_breed: 'Shrike, common boubou',
      age: 13,
      vaccination: true,
      discoverable: true,
      owner_email: 'tphilcox1q@xrea.com',
      location: '11240',
      user1_choice: null,
      photos: [
        'http://dummyimage.com/136x100.png/cc0000/ffffff',
        'http://dummyimage.com/152x100.png/dddddd/000000',
        'http://dummyimage.com/184x100.png/5fa2dd/ffffff'
      ]
    },
    {
      user_id: '10',
      dog_name: 'Guglielma',
      owner_name: 'Reuben Shortcliffe',
      dog_breed: 'Owl, australian masked',
      age: 12,
      vaccination: true,
      discoverable: true,
      owner_email: 'ameates9@harvard.edu',
      location: '10029',
      user1_choice: null,
      photos: [
        'http://dummyimage.com/245x100.png/dddddd/000000',
        'http://dummyimage.com/161x100.png/dddddd/000000',
        'http://dummyimage.com/167x100.png/ff4444/ffffff'
      ]
    },
    {
      user_id: '39',
      dog_name: 'Alanna',
      owner_name: 'Rivy Sleightholme',
      dog_breed: 'Small-toothed palm civet',
      age: 12,
      vaccination: false,
      discoverable: true,
      owner_email: 'dgreasty12@phpbb.com',
      location: '10017',
      user1_choice: null,
      photos: [
        'http://dummyimage.com/147x100.png/dddddd/000000',
        'http://dummyimage.com/192x100.png/ff4444/ffffff',
        'http://dummyimage.com/111x100.png/5fa2dd/ffffff'
      ]
    },
    {
      user_id: '36',
      dog_name: 'Euphemia',
      owner_name: 'Weidar Shuter',
      dog_breed: 'Shark, blue',
      age: 14,
      vaccination: false,
      discoverable: true,
      owner_email: 'scablez@businessinsider.com',
      location: '10011',
      user1_choice: null,
      photos: [
        'http://dummyimage.com/113x100.png/5fa2dd/ffffff',
        'http://dummyimage.com/231x100.png/ff4444/ffffff',
        'http://dummyimage.com/175x100.png/cc0000/ffffff'
      ]
    },
    {
      user_id: '31',
      dog_name: 'Martica',
      owner_name: 'Cookie Le Pruvost',
      dog_breed: 'Possum, common brushtail',
      age: 2,
      vaccination: false,
      discoverable: true,
      owner_email: 'mchristescuu@ovh.net',
      location: '10019',
      user1_choice: null,
      photos: [
        'http://dummyimage.com/132x100.png/ff4444/ffffff',
        'http://dummyimage.com/187x100.png/5fa2dd/ffffff',
        'http://dummyimage.com/191x100.png/5fa2dd/ffffff'
      ]
    },
    {
      user_id: '14',
      dog_name: 'Lemuel',
      owner_name: 'Judah Sydall',
      dog_breed: 'Macaque, rhesus',
      age: 4,
      vaccination: true,
      discoverable: true,
      owner_email: 'fsprakesd@telegraph.co.uk',
      location: '10036',
      user1_choice: null,
      photos: [
        'http://dummyimage.com/183x100.png/cc0000/ffffff',
        'http://dummyimage.com/174x100.png/dddddd/000000',
        'http://dummyimage.com/159x100.png/cc0000/ffffff'
      ]
    },
    {
      user_id: '22',
      dog_name: 'Siusan',
      owner_name: 'Jacintha Giraths',
      dog_breed: 'Vulture, egyptian',
      age: 2,
      vaccination: true,
      discoverable: true,
      owner_email: 'gtraversl@prnewswire.com',
      location: '10021',
      user1_choice: null,
      photos: [
        'http://dummyimage.com/189x100.png/cc0000/ffffff',
        'http://dummyimage.com/208x100.png/5fa2dd/ffffff',
        'http://dummyimage.com/160x100.png/5fa2dd/ffffff'
      ]
    },
    {
      user_id: '75',
      dog_name: 'Deck',
      owner_name: 'Dacia Couche',
      dog_breed: 'Groundhog',
      age: 8,
      vaccination: true,
      discoverable: true,
      owner_email: 'emactavish22@abc.net.au',
      location: '07087',
      user1_choice: null,
      photos: [
        'http://dummyimage.com/210x100.png/ff4444/ffffff',
        'http://dummyimage.com/218x100.png/dddddd/000000',
        'http://dummyimage.com/201x100.png/ff4444/ffffff'
      ]
    },
    {
      user_id: '42',
      dog_name: 'Frederic',
      owner_name: 'Damita Rabjohn',
      dog_breed: 'Golden eagle',
      age: 10,
      vaccination: true,
      discoverable: true,
      owner_email: 'cmatejka15@nsw.gov.au',
      location: '10029',
      user1_choice: null,
      photos: [
        'http://dummyimage.com/173x100.png/cc0000/ffffff',
        'http://dummyimage.com/229x100.png/ff4444/ffffff',
        'http://dummyimage.com/100x100.png/ff4444/ffffff'
      ]
    },
    {
      user_id: '46',
      dog_name: 'Vasily',
      owner_name: 'Aubrey Driver',
      dog_breed: 'Vulture, oriental white-backed',
      age: 1,
      vaccination: false,
      discoverable: true,
      owner_email: 'isnare19@smugmug.com',
      location: '10036',
      user1_choice: null,
      photos: [
        'http://dummyimage.com/201x100.png/cc0000/ffffff',
        'http://dummyimage.com/224x100.png/cc0000/ffffff',
        'http://dummyimage.com/180x100.png/cc0000/ffffff'
      ]
    },
    {
      user_id: '53',
      dog_name: 'Dyan',
      owner_name: 'Ara Londer',
      dog_breed: 'Goldeneye, common',
      age: 3,
      vaccination: true,
      discoverable: true,
      owner_email: 'vsenchenko1g@blog.com',
      location: '10021',
      user1_choice: null,
      photos: [
        'http://dummyimage.com/160x100.png/5fa2dd/ffffff',
        'http://dummyimage.com/237x100.png/ff4444/ffffff',
        'http://dummyimage.com/150x100.png/dddddd/000000'
      ]
    },
    {
      user_id: '38',
      dog_name: 'Holly',
      owner_name: 'Chandler LLelweln',
      dog_breed: 'Black-collared barbet',
      age: 1,
      vaccination: true,
      discoverable: true,
      owner_email: 'dkingsmill11@ask.com',
      location: '10011',
      user1_choice: null,
      photos: [
        'http://dummyimage.com/175x100.png/5fa2dd/ffffff',
        'http://dummyimage.com/189x100.png/dddddd/000000',
        'http://dummyimage.com/176x100.png/dddddd/000000'
      ]
    },
    {
      user_id: '26',
      dog_name: 'Christabel',
      owner_name: 'Vernen Skeete',
      dog_breed: 'Galapagos hawk',
      age: 10,
      vaccination: true,
      discoverable: true,
      owner_email: 'gpaginp@phoca.cz',
      location: '10017',
      user1_choice: null,
      photos: [
        'http://dummyimage.com/161x100.png/5fa2dd/ffffff',
        'http://dummyimage.com/209x100.png/cc0000/ffffff',
        'http://dummyimage.com/229x100.png/5fa2dd/ffffff'
      ]
    },
    {
      user_id: '12',
      dog_name: 'Sioux',
      owner_name: 'Karl Bonny',
      dog_breed: "Hoffman's sloth",
      age: 10,
      vaccination: false,
      discoverable: true,
      owner_email: 'jginnalyb@cdbaby.com',
      location: '10019',
      user1_choice: null,
      photos: [
        'http://dummyimage.com/149x100.png/ff4444/ffffff',
        'http://dummyimage.com/202x100.png/dddddd/000000',
        'http://dummyimage.com/112x100.png/5fa2dd/ffffff'
      ]
    },
    {
      user_id: '24',
      dog_name: 'Elspeth',
      owner_name: 'Chevalier Vsanelli',
      dog_breed: 'Heron, goliath',
      age: 6,
      vaccination: false,
      discoverable: true,
      owner_email: 'lstartenn@storify.com',
      location: '10011',
      user1_choice: null,
      photos: [
        'http://dummyimage.com/186x100.png/cc0000/ffffff',
        'http://dummyimage.com/186x100.png/5fa2dd/ffffff',
        'http://dummyimage.com/110x100.png/ff4444/ffffff'
      ]
    },
    {
      user_id: '19',
      dog_name: 'Iver',
      owner_name: 'Paxton Grinvalds',
      dog_breed: 'Cat, long-tailed spotted',
      age: 8,
      vaccination: false,
      discoverable: true,
      owner_email: 'adanseri@acquirethisname.com',
      location: '10011',
      user1_choice: null,
      photos: [
        'http://dummyimage.com/245x100.png/dddddd/000000',
        'http://dummyimage.com/142x100.png/ff4444/ffffff',
        'http://dummyimage.com/139x100.png/5fa2dd/ffffff'
      ]
    },
    {
      user_id: '21',
      dog_name: 'Melody',
      owner_name: 'Katti Prydie',
      dog_breed: 'Pelican, great white',
      age: 15,
      vaccination: false,
      discoverable: true,
      owner_email: 'chellensk@google.com.hk',
      location: '10036',
      user1_choice: null,
      photos: [
        'http://dummyimage.com/178x100.png/dddddd/000000',
        'http://dummyimage.com/243x100.png/dddddd/000000',
        'http://dummyimage.com/223x100.png/dddddd/000000'
      ]
    },
    {
      user_id: '49',
      dog_name: 'Jillane',
      owner_name: 'Jacquenette Blinder',
      dog_breed: 'Brocket, red',
      age: 14,
      vaccination: true,
      discoverable: true,
      owner_email: 'dgantz1c@ebay.com',
      location: '10011',
      user1_choice: null,
      photos: [
        'http://dummyimage.com/116x100.png/ff4444/ffffff',
        'http://dummyimage.com/119x100.png/5fa2dd/ffffff',
        'http://dummyimage.com/203x100.png/5fa2dd/ffffff'
      ]
    },
    {
      user_id: '17',
      dog_name: 'Bella',
      owner_name: 'Arabella MacGahey',
      dog_breed: 'Egyptian goose',
      age: 4,
      vaccination: true,
      discoverable: true,
      owner_email: 'mcapong@disqus.com',
      location: '10011',
      user1_choice: null,
      photos: [
        'http://dummyimage.com/204x100.png/ff4444/ffffff',
        'http://dummyimage.com/236x100.png/5fa2dd/ffffff',
        'http://dummyimage.com/102x100.png/dddddd/000000'
      ]
    },
    {
      user_id: '37',
      dog_name: 'Laurianne',
      owner_name: 'Kane Grouen',
      dog_breed: 'Nine-banded armadillo',
      age: 8,
      vaccination: false,
      discoverable: true,
      owner_email: 'sdobbs10@sogou.com',
      location: '10019',
      user1_choice: null,
      photos: [
        'http://dummyimage.com/210x100.png/ff4444/ffffff',
        'http://dummyimage.com/118x100.png/cc0000/ffffff',
        'http://dummyimage.com/142x100.png/5fa2dd/ffffff'
      ]
    },
    {
      user_id: '33',
      dog_name: 'Parry',
      owner_name: 'Rora Madre',
      dog_breed: 'Blue waxbill',
      age: 5,
      vaccination: false,
      discoverable: true,
      owner_email: 'fcrockettw@opensource.org',
      location: '10036',
      user1_choice: null,
      photos: [
        'http://dummyimage.com/203x100.png/5fa2dd/ffffff',
        'http://dummyimage.com/193x100.png/dddddd/000000',
        'http://dummyimage.com/189x100.png/5fa2dd/ffffff'
      ]
    },
    {
      user_id: '1',
      dog_name: 'Doloritas',
      owner_name: 'Darby Outhwaite',
      dog_breed: 'Capybara',
      age: 13,
      vaccination: false,
      discoverable: true,
      owner_email: 'gelsie0@friendfeed.com',
      location: '10017',
      user1_choice: null,
      photos: [
        'http://dummyimage.com/117x100.png/ff4444/ffffff',
        'http://dummyimage.com/204x100.png/ff4444/ffffff',
        'http://dummyimage.com/104x100.png/5fa2dd/ffffff'
      ]
    }
  ];

  function setRelationship(user1, user2, choice) {
    axios
      .post('https://localhost:3001/api/response', {
        currentUserId: user1.user_id,
        otherUserId: user2.user_id,
        currentUserChoice: choice,
        otherUserChoice: user2.user1_choice
      })
      .catch((err) => {
        console.log(err);
      });
  }

  useEffect(() => {
    // setData(users);
    setData(exData);
  }, []);

  useEffect(() => {
    if (data.length > 1 && (out !== null || pass !== null)) {
      setFront(data[1].user_id);
    }
    if (data.length > 2 && (out !== null || pass !== null)) {
      setBack(data[2].user_id);
    }
    setTimeout(() => {
      if (out !== null || pass !== null) {
        setData(data.slice(1));
      }
    }, 400);
  }, [out, pass]);

  useEffect(() => {
    setStack(data.slice(0, 3).reverse());
    setUser(data[0]);
  }, [data]);

  function handleVote(e) {
    setChoice(user);
    if (e.target.id === 'digg') {
      setOut(user.user_id);
      setRelationship(currentUser, choice, true);
      if (user.user1_choice === true) {
        setMatch(true);
      }
    } else {
      setRelationship(currentUser, choice, false);
      setPass(user.user_id);
    }
  }

  function handleContinue() {
    setMatch(false);
    setChoice(null);
  }

  return (
    <div>
      {match ? (
        <div className={matchOut ? 'match-out' : ''}>
          <Match handleContinue={handleContinue} user1={currentUser} user2={choice} />
        </div>
      ) : null}
      <div className="discover-cardview-parent">
        {stack.length > 0 ? (
          <div className="card-stack">
            {stack.map((user, index) => (
              <div
                key={`user${user.user_id}`}
                className={`profile-card
                  ${out === user.user_id ? 'unmount' : ''}
                  ${pass === user.user_id ? 'pass-unmount' : ''}
                  ${front === user.user_id ? 'mount' : ''}
                  ${back === user.user_id ? 'back-mount' : ''}
                  `}
              >
                <div className="card-wrapper">
                  <ProfileCard user={user} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Blank />
        )}
        <div className="buttons">
          <button
            id="pass"
            type="button"
            className="btn btn-active btn-accent vote-button pass"
            onClick={handleVote}
          >
            Pass
          </button>
          <button
              id="digg"
              type="button"
              className="btn btn-active btn-primary vote-button digg"
              onClick={handleVote}
          >
            Digg &apos;em
          </button>
        </div>
      </div>
    </div>
  );
};

export default CardStack;
