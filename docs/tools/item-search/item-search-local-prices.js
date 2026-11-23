// Item search: beside an item's catalog price, what it costs where the party is.
//
// Asks the open prices route once, in the background. If there is no answer, no town,
// or the item does not follow any good, nothing at all is added. Searching itself is
// untouched: this only fills an empty line that each item card already carries.

import { localPriceFor } from "../town/local-prices.js";

const LINE_SELECTOR = ".item-local-price";

export function decorateCard(card, answer) {
  const line = card.querySelector(LINE_SELECTOR);
  if (!line) return;
  const local = localPriceFor(answer, {
    id: card.dataset.catalogId,
    rarity: card.dataset.itemRarity,
    type: card.dataset.itemType,
    value: card.dataset.itemValue
  });
  if (!local) {
    line.hidden = true;
    line.textContent = "";
    return;
  }
  line.textContent = local.line;
  line.dataset.direction = local.direction;
  line.hidden = false;
}

export function decorateAll(root, answer) {
  root.querySelectorAll(".item-card[data-catalog-id]").forEach((card) => decorateCard(card, answer));
}

export async function startLocalPrices(root, getClient) {
  let answer = null;
  try {
    const api = await getClient();
    answer = await api.getWorldPublicPrices();
  } catch (_error) {
    return null; // No prices to show; the search page works exactly as before.
  }
  if (!answer?.place?.name || !Array.isArray(answer.prices) || !answer.prices.length) {
    return null;
  }

  decorateAll(root, answer);
  if (typeof MutationObserver === "function") {
    new MutationObserver(() => decorateAll(root, answer)).observe(root, { childList: true, subtree: true });
  }
  return answer;
}

if (typeof document !== "undefined" && typeof window !== "undefined") {
  const root = document.querySelector("#item-search");
  const features = window.EldoriaFeatureSource;
  if (root && typeof features?.createRulesApiClient === "function") {
    void startLocalPrices(root, () => features.createRulesApiClient(features.rulesSearchConfigs?.items || {}));
  }
}
