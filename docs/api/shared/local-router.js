const { URL } = require('url');
const { handleEntities, handlePlayers, handleSearch } = require('./public-data');

function handleLocalPublicApi(req, res) {
  if (!['GET', 'PATCH', 'OPTIONS'].includes(req.method) || !req.url.startsWith('/api/')) return false;

  const url = new URL(req.url, 'http://localhost');
  const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
  let result;

  if (parts[1] === 'players') {
    readJsonBody(req).then(body => {
      req.body = body;
      return handlePlayers({ slug: parts[2] }, Object.fromEntries(url.searchParams), req);
    }).then(response => sendJson(res, response)).catch(error => {
      sendJson(res, {
        status: 400,
        headers: { 'content-type': 'application/json; charset=utf-8' },
        body: { error: 'bad_request', message: error.message },
      });
    });
    return true;
  } else if (parts[1] === 'search') {
    result = handleSearch({}, Object.fromEntries(url.searchParams));
  } else if (parts[1] === 'entities') {
    result = handleEntities({ slug: parts[2] }, Object.fromEntries(url.searchParams));
  } else {
    result = {
      status: 404,
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: { error: 'not_found', message: 'Unknown API route.' },
    };
  }

  sendJson(res, result);
  return true;
}

function readJsonBody(req) {
  if (req.method !== 'PATCH') return Promise.resolve({});
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 32768) {
        reject(new Error('Request body is too large.'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!body.trim()) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error('Invalid JSON body.'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, result) {
  res.writeHead(result.status, result.headers);
  res.end(JSON.stringify(result.body || {}, null, 2));
}

module.exports = { handleLocalPublicApi };
