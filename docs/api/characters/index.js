const { handleCharacters } = require('../shared/character-builds');

module.exports = async function characters(context, req) {
  context.res = await handleCharacters(req.params || {}, req.query || {}, req);
};
