export function getValue(obj, path, fallback = undefined) {
  const parts = path.split(".");

  let current = obj;

  for (const part of parts) {
    if (current == null) {
      return fallback;
    }

    current = current[part];
  }

  return current === undefined ? fallback : current;
}

export function setValue(obj, path, value) {
  const parts = path.split(".");

  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];

    if (current[part] == null || typeof current[part] !== "object") {
      current[part] = {};
    }

    current = current[part];
  }

  current[parts[parts.length - 1]] = value;

  return obj;
}