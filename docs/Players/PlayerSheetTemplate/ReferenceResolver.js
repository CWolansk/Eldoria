import { CatalogCache } from "./CatalogCache.js";
import { PlayerSheetDtoHelper } from "./PlayerSheetDtoHelper.js";
import {
    createBackgroundDto,
    createClassDto,
    createFeatDto,
    createRaceDto,
    createSubclassDto,
    getCatalogDisplayName,
    getCatalogSource,
    toArray,
    toNumber
} from "./LevelEditorJavaScript/Core/LevelEditorShared.js";
import {
    buildBackgroundProfile,
    buildClassProfile,
    buildFeatProfile,
    buildSubclassProfile
} from "./LevelEditorJavaScript/CatalogProfile/Builder.js";
import { buildRaceProfile } from "./LevelEditorJavaScript/Race/LevelEditorRaceProfile.js";
import { expandCatalogRecords } from "./LevelEditorJavaScript/Catalog/LevelEditorCatalogChoiceResolver.js";

function clone(value) {
    if (value == null) {
        return value;
    }

    if (typeof structuredClone === "function") {
        return structuredClone(value);
    }

    return JSON.parse(JSON.stringify(value));
}

function normalizeText(value) {
    return String(value || "").trim();
}

function getPath(target, path) {
    return path.split(".").reduce((current, part) => current?.[part], target);
}

function setPath(target, path, value) {
    const parts = path.split(".");
    let current = target;

    for (let index = 0; index < parts.length - 1; index += 1) {
        const part = parts[index];
        if (!current[part] || typeof current[part] !== "object") {
            current[part] = /^\d+$/u.test(parts[index + 1]) ? [] : {};
        }
        current = current[part];
    }

    current[parts.at(-1)] = value;
}

function getIdentityIds(identity) {
    return [
        identity?.options?.catalogId,
        identity?.catalogId,
        identity?.id,
        identity?.refId,
        identity?.sourceId,
        identity?.options?.refId,
        identity?.options?.sourceId,
        identity?.options?.ref
    ].map(normalizeText).filter(Boolean);
}

async function resolveIdentity(catalog, kind, identity) {
    if (!catalog || !identity) {
        return null;
    }

    for (const id of getIdentityIds(identity)) {
        try {
            const record = await catalog.getById(kind, id);
            if (record) {
                return record;
            }
        } catch (_error) {
            // Keep trying explicit structured identifiers before falling back.
        }
    }

    const name = normalizeText(identity.name || identity.options?.displayName);
    if (name) {
        try {
            return await catalog.getByName(kind, name, identity.source || "", { limit: 30 });
        } catch (_error) {
            return null;
        }
    }

    return null;
}

function mergeIdentity(baseIdentity, resolvedIdentity, extras = {}) {
    if (!baseIdentity && !resolvedIdentity) {
        return null;
    }

    const base = clone(baseIdentity || {});
    const resolved = clone(resolvedIdentity || {});
    const merged = {
        ...resolved,
        ...base,
        options: {
            ...(resolved.options || {}),
            ...(base.options || {})
        },
        ...clone(extras)
    };

    if (!Object.keys(merged.options).length) {
        delete merged.options;
    }

    return merged;
}

function hydrateRace(identity, record) {
    if (!record) {
        return identity;
    }

    return mergeIdentity(identity, createRaceDto(record), {
        profile: buildRaceProfile(record)
    });
}

function hydrateBackground(identity, record) {
    if (!record) {
        return identity;
    }

    const dto = createBackgroundDto(record);
    return mergeIdentity(identity, dto, {
        feature: identity?.feature || dto.feature || record.feature || "",
        grantedFeats: toArray(identity?.grantedFeats).length ? identity.grantedFeats : toArray(dto.grantedFeats),
        grants: clone(record.grants || null),
        profile: buildBackgroundProfile(record)
    });
}

function hydrateClass(identity, record, linkedRecords = []) {
    if (!record) {
        return identity;
    }

    const classLevel = toNumber(identity?.classLevel, 1) || 1;
    return mergeIdentity(identity, createClassDto(record, classLevel), {
        classFeatures: clone(record.classFeatures || record.raw?.classFeatures || []),
        featureRefs: clone(record.featureRefs || record.features || []),
        profile: buildClassProfile(record, { linkedRecords })
    });
}

function hydrateSubclass(identity, record, linkedRecords = []) {
    if (!record) {
        return identity;
    }

    return mergeIdentity(identity, createSubclassDto(record), {
        subclassFeatures: clone(record.subclassFeatures || record.raw?.subclassFeatures || []),
        featureRefs: clone(record.featureRefs || record.features || []),
        profile: buildSubclassProfile(record, { linkedRecords })
    });
}

function hydrateFeat(identity, record) {
    if (!record) {
        return identity;
    }

    return mergeIdentity(identity, createFeatDto(record, {
        choices: identity?.choices,
        choiceSummary: identity?.choiceSummary,
        spellcastingAbility: identity?.spellcastingAbility
    }), {
        prerequisite: clone(record.prerequisite || []),
        profile: buildFeatProfile(record)
    });
}

function hydrateItem(item, record) {
    if (!record) {
        return item;
    }

    return {
        ...clone(item),
        name: item.name || getCatalogDisplayName(record, ""),
        source: item.source || getCatalogSource(record),
        snapshot: clone(record)
    };
}

function collectReferenceTargets(dto) {
    const targets = [
        { path: "baseChoices.race", kind: "races", hydrate: hydrateRace },
        { path: "baseChoices.subrace", kind: "subraces", hydrate: hydrateRace },
        { path: "baseChoices.background", kind: "backgrounds", hydrate: hydrateBackground }
    ];

    toArray(dto.levels).forEach((_level, index) => {
        targets.push(
            { path: `levels.${index}.class`, kind: "classes", hydrate: hydrateClass },
            { path: `levels.${index}.subclass`, kind: "subclasses", hydrate: hydrateSubclass },
            { path: `levels.${index}.feat`, kind: "feats", hydrate: hydrateFeat }
        );
    });

    toArray(dto.inventory?.items).forEach((_item, index) => {
        targets.push({
            path: `inventory.items.${index}.catalog`,
            ownerPath: `inventory.items.${index}`,
            kind: "items",
            hydrateItem
        });
    });

    return targets;
}

export async function resolvePlayerSheetReferences(dtoInput, api) {
    const dto = PlayerSheetDtoHelper.toSaveDto(dtoInput);
    const byPath = {};
    const failures = [];

    if (!api) {
        return {
            ok: true,
            byPath,
            failures,
            resolvedAt: new Date().toISOString()
        };
    }

    const catalog = new CatalogCache(api);
    await Promise.all(collectReferenceTargets(dto).map(async (target) => {
        const identity = getPath(dto, target.path);
        if (!identity) {
            return;
        }

        try {
            const record = await resolveIdentity(catalog, target.kind, identity);
            if (record) {
                byPath[target.path] = record;
                if (target.kind === "classes" || target.kind === "subclasses") {
                    const expanded = await expandCatalogRecords({ api }, [record], {
                        includeLinkedFeatures: true,
                        recursive: true
                    });
                    byPath[`${target.path}.__linked`] = expanded.slice(1);
                }
            }
        } catch (error) {
            failures.push({
                path: target.path,
                kind: target.kind,
                message: error?.message || String(error)
            });
        }
    }));

    return {
        ok: failures.length === 0,
        byPath,
        failures,
        resolvedAt: new Date().toISOString()
    };
}

export function applyResolvedReferencesToDto(dtoInput, references = {}) {
    const dto = PlayerSheetDtoHelper.toSaveDto(dtoInput);
    const runtimeDto = clone(dto);
    const recordsByPath = references.byPath || {};

    for (const target of collectReferenceTargets(dto)) {
        const record = recordsByPath[target.path];
        if (!record) {
            continue;
        }

        if (target.ownerPath && typeof target.hydrateItem === "function") {
            const item = getPath(runtimeDto, target.ownerPath);
            setPath(runtimeDto, target.ownerPath, target.hydrateItem(item, record));
            continue;
        }

        const identity = getPath(runtimeDto, target.path);
        if (typeof target.hydrate === "function") {
            setPath(runtimeDto, target.path, target.hydrate(
                identity,
                record,
                recordsByPath[`${target.path}.__linked`] || []
            ));
        }
    }

    return runtimeDto;
}

