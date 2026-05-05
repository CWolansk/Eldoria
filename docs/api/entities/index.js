const { handleEntities } = require('../shared/public-data');

module.exports = async function entities(context, req) {
  context.res = handleEntities(req.params || {}, req.query || {});
};
