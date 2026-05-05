const { handlePlayers } = require('../shared/public-data');

module.exports = async function players(context, req) {
  context.res = await handlePlayers(req.params || {}, req.query || {}, req);
};
