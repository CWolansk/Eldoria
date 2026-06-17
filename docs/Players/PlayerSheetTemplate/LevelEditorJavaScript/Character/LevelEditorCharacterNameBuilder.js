import { PlayerSheetDtoHelper } from "../../PlayerSheetDtoHelper.js";
import {
    createElement,
    createField
} from "../../PlayerSheetHtmlHelper.js";

export function buildCharacterNameContent(context) {
    const fragment = document.createDocumentFragment();
    const dto = context.dto;
    const onChange = context.onChange;

    const input = document.createElement("input");
    input.className = "level-editor__input";
    input.type = "text";
    input.value = dto?.identity?.name || "";

    const applyButton = document.createElement("button");
    applyButton.className = "level-editor__button";
    applyButton.type = "button";
    applyButton.textContent = "Apply";

    applyButton.addEventListener("click", () => {
        if (typeof onChange !== "function") {
            return;
        }

        const nextDto = PlayerSheetDtoHelper.patch(dto, "identity.name", input.value);
        onChange(nextDto);
    });

    fragment.appendChild(createField("Character Name", input));
    fragment.appendChild(applyButton);

    return fragment;
}
