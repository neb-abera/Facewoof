const db = require('./database');

const getPacks = (userId) => {
  return db.query(`SELECT json_agg(packobj) FROM 
  (SELECT pack_users.pack_id, packs.name FROM pack_users
    INNER JOIN packs ON packs.pack_id = pack_users.pack_id
    WHERE pack_users.user_id = ${userId}) as packobj;`);
};

const createPlaydate = (playdateInfo) => {
  // to format time correctly.... new Date(date of playdate).toLocaleString()
  const packId = playdateInfo.pack.id; // plan on pack being received as an object pack: { packName: 'nameOfPack', id: num}
  const { userId } = playdateInfo;
  const { playdateBody } = playdateInfo;
  // need to fix this to have start_date and end_date
  const playdateTime = new Date(playdateInfo.time).toLocaleString();
  // console.log(packId, userId, playdateBody, playdateTime);
  return db.query(`INSERT INTO playdates (pack_id, user_id, body, start_date, end_date)
   VALUES (${packId}, ${userId}, '${playdateBody}', '${playdateTime}', 'ADD END_DATE HERE');`);
};

const getAllPlaydates = (userId) => {
  return db.query(`select json_agg(json_build_object(
      'pack_id', pack_users.pack_id,
      'pack_name', packs.name,
      'playdate_start_date', playdates.start_date,
      'playdate_end_date', playdates.end_date,
      'playdate_body', playdates.body)
	  ) as pack_playdates
		from pack_users
	  full outer join packs on packs.pack_id = pack_users.pack_id
	  full outer join playdates on playdates.pack_id = packs.pack_id
	  where pack_users.user_id = ${userId};`);
};

module.exports = {
  getPacks: getPacks,
  createPlaydate: createPlaydate,
  getAllPlaydates: getAllPlaydates
};
