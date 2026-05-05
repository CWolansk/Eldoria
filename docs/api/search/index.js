const { handleSearch } = require('../shared/public-data');

module.exports = async function search(context, req) {
  context.res = handleSearch(req.params || {}, req.query || {});
};
