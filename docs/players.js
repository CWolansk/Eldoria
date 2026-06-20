// Legacy top-level players route. The current roster lives under docs/Players/.
const playersRosterUrl = new URL("Players/players.html", window.location.href);
window.location.replace(playersRosterUrl.href);
