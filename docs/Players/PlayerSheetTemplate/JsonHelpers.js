export const ABILITIES = [
    { key: "str", label: "STR" },
    { key: "dex", label: "DEX" },
    { key: "con", label: "CON" },
    { key: "int", label: "INT" },
    { key: "wis", label: "WIS" },
    { key: "cha", label: "CHA" }
];

export function GetJsonPathValues(obj, path){
    const parts = path.split(".");

    let current = obj;

    for(const part of parts)
    {
        if(current == null) {
            return undefined;
        }

        current = current[part]
    }

    return current; 
}

export function createTextHTML(tag, text, className = null){
    const element = document.createElement(tag);
    element.textContent = text;

    if(className != null) {
        element.className = className;
    }

    return element;
}

export function getAbilityModifier(score){
    return Math.floor((Number(score) - 10) / 2);
}

export function formatModifier(value){
    return (value >= 0 ? "+" : "") + value;
}
