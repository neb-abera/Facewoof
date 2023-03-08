const db = require('../db/database');

const testObj = {
  pack: { id: 3, name: 'Bigtax' },
  userId: 20,
  playdateBody: 'Testing adding playdate',
  time: '03/12/2023 12:00'
};

const createPlaydate = (playdateInfo) => {
  db.connect();
  // to format time correctly.... new Date(date of playdate).toLocaleString()
  const packId = playdateInfo.pack.id; // plan on pack being received as an object pack: { packName: 'nameOfPack', id: num}
  const { userId } = playdateInfo;
  const { playdateBody } = playdateInfo;
  const playdateTime = new Date(playdateInfo.time).toLocaleString();
  // console.log(packId, userId, playdateBody, playdateTime);
  return db.query(`INSERT INTO playdates (pack_id, user_id, body, date)
   VALUES (${packId}, ${userId}, '${playdateBody}', '${playdateTime}');`);
};

const getAllPlaydates = (userId) => {
  db.connect();
  return db.query(`select json_agg(json_build_object(
      'pack_id', pack_users.pack_id,
      'pack_name', packs.name,
      'playdate_date', playdates.date,
      'playdate_body', playdates.body)
	  ) as pack_playdates
		from pack_users
	  full outer join packs on packs.pack_id = pack_users.pack_id
	  full outer join playdates on playdates.pack_id = packs.pack_id
	  where pack_users.user_id = ${userId};`);
};

createPlaydate(testObj)
  .then(() => console.log('added'))
  .catch((err) => console.log(err));

// getAllPlaydates(1)
//   .then((data) => console.log(data.rows[0].pack_playdates))
//   .catch((err) => console.log(err));

module.exports = {
  createPlaydate: createPlaydate,
  getAllPlaydates: getAllPlaydates
};
