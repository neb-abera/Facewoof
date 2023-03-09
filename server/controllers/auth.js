const { checkOrCreateUser } = require('../db');

const authUser = (req, res) => {
  const { email, name } = req.body;

  return checkOrCreateUser(email, name)
    .then((data) => {
      const insert = data[0].rowCount === 1;
      if (insert) {
        res.status(201).send(data[1].rows[0]);
      } else {
        res.status(200).send(data[1].rows[0]);
      }
    })
    .catch((err) => console.log(err));
};

module.exports = {
  authUser: authUser
};
