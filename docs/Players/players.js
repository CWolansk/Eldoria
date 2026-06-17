import { EldoriaApiClient } from "../api/apiClient/index.js";
const api = new EldoriaApiClient({
  baseUrl: "https://fn-eldoria-ahakafekhxczebhn.eastus-01.azurewebsites.net/api"
});

/**
 * 
 * @param {string} playerName 
 * @param {string} CharacterName 
 * @param {string} CharacterId 
 * @returns 
 */
function buildPlayerCard(playerName, CharacterName, CharacterId) {
    const card = document.createElement("div");
    card.className = "player-card";
    
    const CharacterSheetLinkHtml = document.createElement('a');
    CharacterSheetLinkHtml.href = `PlayerSheetTemplate/PlayerSheet.html?id=${CharacterId}`

    const CharacterNameHtml = document.createElement("h2");
    CharacterNameHtml.className = "character-name"
    CharacterNameHtml.textContent = "Character : " + CharacterName;

    const PlayerNameHtml = document.createElement("h3");
    PlayerNameHtml.className = "player-name"
    PlayerNameHtml.textContent = "Player : " + playerName;

    card.appendChild(CharacterSheetLinkHtml);
        

    CharacterSheetLinkHtml.appendChild(CharacterNameHtml);
    CharacterSheetLinkHtml.appendChild(PlayerNameHtml);

    return card;
}

async function bootPlayersPage() {
    const container = document.querySelector("#player-sheet-list");

    const result = await api.getPlayersManifest();
    const players = result.characters;

  for (const player of players) {
    console.log(player)
    const row = document.createElement("div");
    row.textContent = player.playerName + " " + player.characterName;
    container.appendChild(buildPlayerCard(player.playerName,
     player.characterName, 
     player.id));
  }
}
//Render players in character sheet page 
// Load players via API

bootPlayersPage();