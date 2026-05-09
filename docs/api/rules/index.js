const { handleRules } = require('../shared/rules-data');

module.exports = async function rules(context, req) {
  context.res = await handleRules(req.params || {}, req.query || {}, req);
};
