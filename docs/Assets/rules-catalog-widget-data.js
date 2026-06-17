// Normalized rules catalog adapter for Obsidian CustomJS lookup widgets.
// Keeps the old CSV row shape so existing renderers can migrate data sources
// without changing their display code.

(function () {
    const DEFAULT_CATALOG_BASE_PATHS = [
        'docs/character-sheets/v1/data',
        'character-sheets/v1/data',
        '../character-sheets/v1/data'
    ];

    const DEFAULT_CSV_PATHS = {
        items: [
            'docs/data/items.csv',
            'data/items.csv',
            '../data/items.csv'
        ],
        spells: [
            'docs/data/spells.csv',
            'data/spells.csv',
            '../data/spells.csv'
        ],
        races: [
            'docs/data/races.csv',
            'data/races.csv',
            '../data/races.csv'
        ],
        backgrounds: [
            'docs/data/backgrounds.csv',
            'data/backgrounds.csv',
            '../data/backgrounds.csv'
        ],
        feats: [
            'docs/data/feats.csv',
            'data/feats.csv',
            '../data/feats.csv'
        ]
    };

    const CATALOG_FILES = {
        items: ['items.json', 'item-properties.json', 'magic-variants.json'],
        spells: ['spells.json'],
        races: ['races.json'],
        backgrounds: ['backgrounds.json'],
        feats: ['feats.json']
    };

    const SPELL_SCHOOLS = {
        A: 'Abjuration',
        C: 'Conjuration',
        D: 'Divination',
        E: 'Enchantment',
        V: 'Evocation',
        I: 'Illusion',
        N: 'Necromancy',
        T: 'Transmutation'
    };

    function toArray(value) {
        return Array.isArray(value) ? value : [];
    }

    function isObject(value) {
        return value && typeof value === 'object' && !Array.isArray(value);
    }

    function normalizeString(value) {
        return String(value ?? '').trim();
    }

    function titleCase(value) {
        return normalizeString(value)
            .replaceAll(/[_-]+/g, ' ')
            .replaceAll(/\s+/g, ' ')
            .replaceAll(/\b\w/g, char => char.toUpperCase());
    }

    function sentenceCase(value) {
        const text = normalizeString(value);
        return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
    }

    const ABILITY_LABELS = {
        str: 'Strength',
        dex: 'Dexterity',
        con: 'Constitution',
        int: 'Intelligence',
        wis: 'Wisdom',
        cha: 'Charisma'
    };

    const ABILITY_SHORT_LABELS = {
        str: 'Str',
        dex: 'Dex',
        con: 'Con',
        int: 'Int',
        wis: 'Wis',
        cha: 'Cha'
    };

    const SIZE_LABELS = {
        T: 'Tiny',
        S: 'Small',
        M: 'Medium',
        L: 'Large',
        H: 'Huge',
        G: 'Gargantuan',
        V: 'Varies'
    };

    function dedupe(values) {
        return [...new Set(values.map(normalizeString).filter(Boolean))];
    }

    function joinPath(basePath, fileName) {
        const base = normalizeString(basePath).replaceAll('\\', '/').replace(/\/+$/, '');
        const file = normalizeString(fileName).replaceAll('\\', '/').replace(/^\/+/, '');
        return base ? `${base}/${file}` : file;
    }

    function makePathList(basePaths, fileName) {
        return toArray(basePaths).map(basePath => joinPath(basePath, fileName));
    }

    function parseCSV(text) {
        const rows = [];
        let row = [];
        let current = '';
        let inQuotes = false;

        for (let index = 0; index < text.length; index++) {
            const char = text[index];
            const next = text[index + 1];

            if (char === '"') {
                if (inQuotes && next === '"') {
                    current += '"';
                    index++;
                } else {
                    inQuotes = !inQuotes;
                }
                continue;
            }

            if (char === ',' && !inQuotes) {
                row.push(current);
                current = '';
                continue;
            }

            if ((char === '\n' || char === '\r') && !inQuotes) {
                if (char === '\r' && next === '\n') {
                    index++;
                }
                row.push(current);
                if (row.some(cell => normalizeString(cell))) {
                    rows.push(row);
                }
                row = [];
                current = '';
                continue;
            }

            current += char;
        }

        row.push(current);
        if (row.some(cell => normalizeString(cell))) {
            rows.push(row);
        }

        const headers = rows.shift() ?? [];
        return rows.map(values => {
            const entry = {};
            headers.forEach((header, index) => {
                entry[header] = values[index] ?? '';
            });
            return entry;
        });
    }

    function cleanRulesText(value, variables = {}) {
        if (Array.isArray(value)) {
            return value.map(entry => cleanRulesText(entry, variables)).filter(Boolean).join(' ');
        }

        if (isObject(value)) {
            const name = normalizeString(value.name);
            const body = cleanRulesText(value.entries ?? value.items ?? value.entry ?? value.caption ?? '', variables);
            const heading = name ? (/[.:]$/.test(name) ? name : `${name}.`) : '';
            return [heading, body].filter(Boolean).join(' ');
        }

        return normalizeString(value)
            .replace(/\{=([^}]+)\}/g, (_match, key) => normalizeString(variables[key]) || key)
            .replace(/\{@dc\s+([^}]+)\}/g, 'DC $1')
            .replace(/\{@(?:damage|dice|hit|d20|scaledice|scaledamage)\s+([^|}]+)(?:\|[^}]*)?\}/g, '$1')
            .replace(/\{@([a-zA-Z0-9_-]+)\s+([^}]+)\}/g, (_match, tag, body) => {
                const parts = body.split('|').map(normalizeString);
                if (tag === 'filter') {
                    return parts[0] || tag;
                }
                if (parts.length > 2) {
                    return parts[parts.length - 1] || parts[0];
                }
                return parts[0] || tag;
            })
            .replace(/\s+/g, ' ')
            .trim();
    }

    function formatEntryText(entries) {
        return cleanRulesText(entries)
            .replace(/\s+\./g, '.')
            .replace(/\s+,/g, ',')
            .trim();
    }

    function formatAbilityKey(key, short = false) {
        const normalized = normalizeString(key).toLowerCase();
        return short
            ? (ABILITY_SHORT_LABELS[normalized] || titleCase(normalized))
            : (ABILITY_LABELS[normalized] || titleCase(normalized));
    }

    function formatAbilityChoice(choice = {}) {
        const from = toArray(choice.from).map(value => formatAbilityKey(value, true)).filter(Boolean);
        const count = Number(choice.count ?? 1);
        const amount = Number(choice.amount ?? 1);
        const amountLabel = Number.isFinite(amount) && amount > 0 ? `+${amount}` : 'increase';
        const countLabel = Number.isFinite(count) && count > 1 ? `${count} abilities` : 'one ability';
        return from.length
            ? `Choose ${amountLabel} to ${countLabel} from ${from.join(', ')}`
            : `Choose ${amountLabel} to ${countLabel}`;
    }

    function formatAbilityScores(grants = {}) {
        return toArray(grants.ability).flatMap(abilityBlock => {
            const fixed = Object.entries(isObject(abilityBlock) ? abilityBlock : {})
                .filter(([key]) => key !== 'choose')
                .map(([key, value]) => {
                    const amount = Number(value);
                    return `${formatAbilityKey(key, true)} ${Number.isFinite(amount) && amount > 0 ? `+${amount}` : normalizeString(value)}`;
                });

            if (isObject(abilityBlock?.choose)) {
                fixed.push(formatAbilityChoice(abilityBlock.choose));
            }

            return fixed;
        }).filter(Boolean).join(', ');
    }

    function formatSize(size) {
        return toArray(size)
            .map(value => SIZE_LABELS[normalizeString(value).toUpperCase()] || titleCase(value))
            .filter(Boolean)
            .join(', ');
    }

    function formatSpeed(speed) {
        if (typeof speed === 'number') {
            return `${speed} ft.`;
        }

        if (!isObject(speed)) {
            return normalizeString(speed);
        }

        const entries = Object.entries(speed)
            .filter(([, value]) => value != null && value !== false)
            .map(([key, value]) => {
                if (typeof value === 'number') {
                    return key === 'walk' ? `${value} ft.` : `${titleCase(key)} ${value} ft.`;
                }
                if (isObject(value) && value.number != null) {
                    return `${titleCase(key)} ${value.number} ft.`;
                }
                if (value === true) {
                    return titleCase(key);
                }
                return `${titleCase(key)} ${normalizeString(value)}`;
            });

        return entries.join(', ');
    }

    function formatPipeRef(value) {
        const parts = normalizeString(value).split('|').map(normalizeString).filter(Boolean);
        return titleCase(parts[parts.length - 1] || parts[0]);
    }

    function formatPrerequisitePart(key, value) {
        if (key === 'other') {
            return cleanRulesText(value);
        }

        if (key === 'level') {
            return `Level ${value}`;
        }

        if (key === 'feat') {
            return `Feat: ${toArray(value).map(formatPipeRef).join(', ')}`;
        }

        if (key === 'race') {
            return `Race: ${toArray(value).map(race => {
                const name = normalizeString(race?.name ?? race);
                const subrace = normalizeString(race?.subrace);
                return subrace ? `${titleCase(name)} (${titleCase(subrace)})` : titleCase(name);
            }).join(', ')}`;
        }

        if (key === 'ability') {
            return toArray(value).map(abilityBlock => Object.entries(abilityBlock ?? {})
                .map(([ability, score]) => `${formatAbilityKey(ability)} ${score}`)
                .join(', ')).filter(Boolean).join('; ');
        }

        if (key === 'spellcasting' || key === 'spellcasting2020' || key === 'spellcastingFeature') {
            return 'Spellcasting';
        }

        if (key === 'campaign') {
            return `Campaign: ${toArray(value).join(', ')}`;
        }

        return `${titleCase(key)}: ${cleanRulesText(value)}`;
    }

    function formatPrerequisites(prerequisites) {
        const parts = toArray(prerequisites).flatMap(prerequisite => Object.entries(prerequisite ?? {})
            .map(([key, value]) => formatPrerequisitePart(key, value)));
        return parts.filter(Boolean).join('; ') || 'None';
    }

    function makeFiveToolsLink(kind, name, source) {
        const page = {
            race: 'races',
            background: 'backgrounds',
            feat: 'feats'
        }[kind];
        if (!page || !name || !source) {
            return '';
        }
        return `https://5e.tools/${page}.html#${encodeURIComponent(`${name}_${source}`.toLowerCase())}`;
    }

    function ordinal(value) {
        const number = Number(value);
        if (!Number.isFinite(number)) {
            return '';
        }
        if (number === 0) {
            return 'Cantrip';
        }
        const suffix = number === 1 ? 'st' : number === 2 ? 'nd' : number === 3 ? 'rd' : 'th';
        return `${number}${suffix}`;
    }

    function formatRange(range) {
        if (!isObject(range)) {
            return normalizeString(range);
        }

        const distance = range.distance;
        if (isObject(distance)) {
            if (distance.type === 'self') return 'Self';
            if (distance.type === 'touch') return 'Touch';
            if (distance.type === 'special') return 'Special';
            if (distance.amount != null && distance.type) {
                return `${distance.amount} ${distance.type}`;
            }
            return titleCase(distance.type);
        }

        return titleCase(range.type);
    }

    function formatSpellTime(timeEntries) {
        return toArray(timeEntries).map(time => {
            const unit = titleCase(time?.unit);
            const number = Number(time?.number ?? 1);
            const label = number && number !== 1 ? `${number} ${unit}${unit.endsWith('s') ? '' : 's'}` : unit;
            return [label, normalizeString(time?.condition)].filter(Boolean).join(', ');
        }).filter(Boolean).join('; ');
    }

    function formatSpellDuration(durationEntries) {
        return toArray(durationEntries).map(duration => {
            if (duration?.type === 'instant') {
                return 'Instantaneous';
            }

            if (duration?.type === 'special') {
                return 'Special';
            }

            if (duration?.type === 'permanent') {
                const ends = toArray(duration.ends).map(titleCase).join(' or ');
                return ends ? `Until ${ends}` : 'Permanent';
            }

            if (duration?.type === 'timed' && isObject(duration.duration)) {
                const amount = Number(duration.duration.amount ?? 1);
                const unit = normalizeString(duration.duration.type);
                const label = `${amount} ${unit}${amount === 1 || unit.endsWith('s') ? '' : 's'}`;
                return duration.concentration ? `Concentration, up to ${label}` : label;
            }

            return titleCase(duration?.type);
        }).filter(Boolean).join('; ');
    }

    function formatSpellComponents(components) {
        if (!isObject(components)) {
            return normalizeString(components);
        }

        const parts = [];
        if (components.v) parts.push('V');
        if (components.s) parts.push('S');
        if (components.m) {
            const material = isObject(components.m)
                ? normalizeString(components.m.text)
                : normalizeString(components.m);
            parts.push(material ? `M (${material})` : 'M');
        }
        return parts.join(', ');
    }

    function formatSpellClasses(spell, key) {
        const groups = spell?.classes?.[key] ?? spell?.raw?.classes?.[key];
        return toArray(groups).map(entry => {
            const name = normalizeString(entry?.name ?? entry?.className ?? entry);
            const source = normalizeString(entry?.source ?? entry?.classSource);
            return source ? `${name} (${source})` : name;
        }).filter(Boolean).join(', ');
    }

    function formatSpellHigherLevel(spell) {
        return cleanRulesText(spell.entriesHigherLevel ?? spell.raw?.entriesHigherLevel ?? '');
    }

    function spellToRow(spell) {
        return {
            Name: normalizeString(spell.name),
            Source: normalizeString(spell.source),
            Page: spell.page == null ? '' : String(spell.page),
            Level: ordinal(spell.level),
            'Casting Time': formatSpellTime(spell.time),
            Duration: formatSpellDuration(spell.duration),
            School: titleCase(spell.school?.name ?? SPELL_SCHOOLS[spell.school?.code] ?? spell.school),
            Range: formatRange(spell.range),
            Components: formatSpellComponents(spell.components),
            Classes: formatSpellClasses(spell, 'fromClassList'),
            'Optional/Variant Classes': formatSpellClasses(spell, 'fromClassListVariant'),
            Subclasses: formatSpellClasses(spell, 'fromSubclass'),
            Text: cleanRulesText(spell.entries),
            'At Higher Levels': formatSpellHigherLevel(spell),
            _catalogRef: normalizeString(spell.ref),
            _catalogKind: 'spell'
        };
    }

    function formatAttunement(attunement) {
        if (!attunement?.required) {
            return '';
        }

        const text = normalizeString(attunement.text);
        return text && text !== 'required' ? `requires attunement ${text}` : 'requires attunement';
    }

    function formatWeight(value) {
        if (value == null || value === '') {
            return '';
        }
        return `${value} lb.`;
    }

    function formatCopperValue(value) {
        const cp = Number(value);
        if (!Number.isFinite(cp) || cp <= 0) {
            return '';
        }

        if (cp % 100 === 0) {
            return `${(cp / 100).toLocaleString()} gp`;
        }
        if (cp % 10 === 0) {
            return `${(cp / 10).toLocaleString()} sp`;
        }
        return `${cp.toLocaleString()} cp`;
    }

    function formatItemValue(item) {
        return normalizeString(item.valueLabel ?? item._l_value) || formatCopperValue(item.value);
    }

    function formatItemType(item) {
        if (toArray(item._typeListText).length) {
            return toArray(item._typeListText).map(value => normalizeString(value).toLowerCase()).filter(Boolean).join(', ');
        }

        if (item._typeHtml) {
            return normalizeString(item._typeHtml).replace(/<[^>]+>/g, '').toLowerCase();
        }

        const parts = [];
        if (item.tags?.wondrous) {
            parts.push('wondrous item');
        }

        if (item.weapon) {
            parts.push('weapon');
            if (item.weapon.category) parts.push(`${item.weapon.category} weapon`);
            if (item.type?.name) parts.push(item.type.name.toLowerCase());
        } else if (item.armor) {
            parts.push('armor');
            if (item.type?.name) parts.push(item.type.name.toLowerCase());
        } else if (item.type?.name) {
            parts.push(item.type.name.toLowerCase());
        }

        if (item.typeAlt?.name) {
            parts.push(item.typeAlt.name.toLowerCase());
        }

        return dedupe(parts).join(', ') || 'item';
    }

    const ITEM_DAMAGE_TYPES = {
        A: 'acid',
        B: 'bludgeoning',
        C: 'cold',
        F: 'fire',
        O: 'force',
        L: 'lightning',
        N: 'necrotic',
        P: 'piercing',
        I: 'poison',
        Y: 'psychic',
        R: 'radiant',
        S: 'slashing',
        T: 'thunder'
    };

    function formatItemAttunement(item) {
        if (item.attunement?.required) {
            return formatAttunement(item.attunement);
        }

        if (item.reqAttune) {
            const text = normalizeString(item.reqAttune);
            return text === 'true' ? 'requires attunement' : `requires attunement ${text}`;
        }

        return normalizeString(item._attunement).replace(/[()]/g, '');
    }

    function formatItemDamage(item) {
        if (item.dmg1) {
            const damageType = ITEM_DAMAGE_TYPES[normalizeString(item.dmgType).toUpperCase()] || normalizeString(item.dmgType);
            return [item.dmg1, damageType].filter(Boolean).join(' ');
        }

        const damage = item.weapon?.damage;
        if (!damage?.primary) {
            return '';
        }
        return [damage.primary, damage.type?.name || damage.type?.code].filter(Boolean).join(' ');
    }

    function formatItemProperties(item) {
        if (toArray(item._fProperties).length) {
            return toArray(item._fProperties).map(value => normalizeString(value).toLowerCase()).filter(Boolean).join(', ');
        }

        const damage = item.weapon?.damage ?? {};
        return toArray(item.weapon?.properties).map(property => {
            const name = normalizeString(property.name || property.code).toLowerCase();
            const code = normalizeString(property.code || property.abbreviation).toUpperCase();
            if (code === 'V' && damage.versatile) {
                return `${name} (${damage.versatile})`;
            }
            if ((code === 'A' || code === 'AF' || code === 'T') && item.weapon?.range?.raw) {
                return `${name} (${item.weapon.range.raw})`;
            }
            if (code === 'RLD' && item.weapon?.reload) {
                return `${name} (${item.weapon.reload} shots)`;
            }
            return name;
        }).filter(Boolean).join(', ');
    }

    function makePropertyLookup(itemPropertiesCatalog) {
        const lookup = new Map();
        for (const property of toArray(itemPropertiesCatalog?.itemProperties)) {
            const keys = [
                property.abbreviation,
                property.name,
                property.ref,
                property.refId
            ].map(value => normalizeString(value).toLowerCase()).filter(Boolean);

            for (const key of keys) {
                if (!lookup.has(key)) {
                    lookup.set(key, property);
                }
            }
        }
        return lookup;
    }

    function getItemPropertyEntries(item, propertyLookup) {
        if (!propertyLookup || typeof propertyLookup.get !== 'function') {
            return [];
        }

        return toArray(item.weapon?.properties).flatMap(property => {
            const keys = [
                property.abbreviation,
                property.code,
                property.name,
                property.ref,
                property.refId
            ].map(value => normalizeString(value).toLowerCase()).filter(Boolean);

            const catalogProperty = keys.map(key => propertyLookup.get(key)).find(Boolean);
            return catalogProperty ? toArray(catalogProperty.entries).concat(toArray(catalogProperty.entriesTemplate)) : [];
        });
    }

    function formatItemText(item, propertyLookup) {
        const variables = {
            ...item.bonuses,
            bonusWeapon: item.bonuses?.bonusWeapon ?? item.bonusWeapon,
            bonusAc: item.bonuses?.bonusAc ?? item.bonusAc
        };

        if (toArray(item._fullEntries).length) {
            return cleanRulesText(item._fullEntries, variables);
        }

        const entries = [
            ...toArray(item.entries),
            ...getItemPropertyEntries(item, propertyLookup)
        ];
        return cleanRulesText(entries, variables);
    }

    function getRequirementValue(value) {
        if (Array.isArray(value)) {
            return value.map(getRequirementValue);
        }
        if (isObject(value)) {
            return value.name ?? value.code ?? value.abbreviation ?? value.source ?? '';
        }
        return value;
    }

    function matchesRequirementValue(actual, expected) {
        const expectedValues = toArray(expected).length ? toArray(expected) : [expected];
        const actualText = normalizeString(actual).toLowerCase();
        return expectedValues.some(value => {
            const expectedText = normalizeString(getRequirementValue(value)).toLowerCase();
            return expectedText && actualText === expectedText;
        });
    }

    function getItemPropertyCodes(item) {
        return toArray(item.weapon?.properties)
            .map(property => [
                property.code,
                property.abbreviation,
                property.name
            ].map(value => normalizeString(value).toLowerCase()).filter(Boolean))
            .flat();
    }

    function itemMatchesRequirement(item, key, expected) {
        const normalizedKey = normalizeString(key);
        if (expected === false) {
            return !itemMatchesRequirement(item, key, true);
        }

        if (normalizedKey === 'type') {
            return matchesRequirementValue([
                item.type?.code,
                item.type?.abbreviation,
                item.type?.name
            ].filter(Boolean).join('|'), expected)
                || matchesRequirementValue(item.type?.code, expected)
                || matchesRequirementValue(item.type?.abbreviation, expected)
                || matchesRequirementValue(item.type?.name, expected);
        }

        if (normalizedKey === 'weapon') {
            return Boolean(item.weapon || item.tags?.weapon);
        }

        if (normalizedKey === 'armor') {
            return Boolean(item.armor || item.tags?.armor);
        }

        if (normalizedKey === 'weaponCategory') {
            return matchesRequirementValue(item.weapon?.category, expected);
        }

        if (normalizedKey === 'property') {
            const propertyKeys = getItemPropertyCodes(item);
            return toArray(expected).length
                ? toArray(expected).some(value => propertyKeys.includes(normalizeString(getRequirementValue(value)).toLowerCase()))
                : propertyKeys.includes(normalizeString(getRequirementValue(expected)).toLowerCase());
        }

        if (normalizedKey === 'dmgType') {
            return matchesRequirementValue(item.weapon?.damage?.type?.code, expected)
                || matchesRequirementValue(item.weapon?.damage?.type?.name, expected);
        }

        if (normalizedKey === 'name') {
            return matchesRequirementValue(item.name, expected);
        }

        if (normalizedKey === 'source') {
            return matchesRequirementValue(item.source, expected);
        }

        if (normalizedKey === 'scfType') {
            return matchesRequirementValue(item.mechanics?.scfType, expected);
        }

        if (expected === true) {
            return Boolean(item.tags?.[normalizedKey] || item.weapon?.tags?.[normalizedKey] || item.raw?.[normalizedKey]);
        }

        return matchesRequirementValue(
            item.tags?.[normalizedKey] ?? item.weapon?.tags?.[normalizedKey] ?? item.raw?.[normalizedKey],
            expected
        );
    }

    function itemMatchesRequirementSet(item, requirement) {
        return Object.entries(requirement ?? {}).every(([key, expected]) => itemMatchesRequirement(item, key, expected));
    }

    function itemMatchesVariant(item, variant) {
        const requirements = toArray(variant.requires);
        const requirementMatch = requirements.length === 0 || requirements.some(requirement => itemMatchesRequirementSet(item, requirement));
        if (!requirementMatch) {
            return false;
        }

        const excludes = variant.excludes;
        if (isObject(excludes) && Object.keys(excludes).length && itemMatchesRequirementSet(item, excludes)) {
            return false;
        }

        return true;
    }

    function mergeVariantProperties(baseProperties, inherits) {
        const byCode = new Map();
        for (const property of toArray(baseProperties)) {
            const code = normalizeString(property.code || property.abbreviation || property.name).toUpperCase();
            if (code) {
                byCode.set(code, property);
            }
        }

        for (const property of toArray(inherits.propertyAdd)) {
            const code = normalizeString(property.code || property.abbreviation || property.name).toUpperCase();
            if (code) {
                byCode.set(code, property);
            }
        }

        for (const property of toArray(inherits.propertyRemove)) {
            const code = normalizeString(property.code || property.abbreviation || property.name || property).toUpperCase();
            if (code) {
                byCode.delete(code);
            }
        }

        return [...byCode.values()];
    }

    function hasMeaningfulValue(value) {
        if (value == null || value === '') {
            return false;
        }
        if (Array.isArray(value)) {
            return value.length > 0;
        }
        if (isObject(value)) {
            return Object.values(value).some(hasMeaningfulValue);
        }
        return true;
    }

    function mergeMeaningful(base, patch) {
        const merged = { ...(isObject(base) ? base : {}) };
        for (const [key, value] of Object.entries(isObject(patch) ? patch : {})) {
            if (isObject(value) && isObject(merged[key])) {
                merged[key] = mergeMeaningful(merged[key], value);
            } else if (hasMeaningfulValue(value)) {
                merged[key] = value;
            }
        }
        return merged;
    }

    function composeItemWithVariant(baseItem, variant) {
        const inherits = variant.inherits ?? {};
        const prefix = inherits.namePrefix == null ? '' : String(inherits.namePrefix);
        const suffix = inherits.nameSuffix == null ? '' : String(inherits.nameSuffix);
        if (!prefix && !suffix) {
            return null;
        }

        const weapon = baseItem.weapon
            ? {
                ...mergeMeaningful(baseItem.weapon, inherits.weapon),
                damage: mergeMeaningful(baseItem.weapon.damage, inherits.weapon?.damage),
                range: mergeMeaningful(baseItem.weapon.range, inherits.weapon?.range),
                bonuses: {
                    ...baseItem.weapon.bonuses,
                    ...inherits.weapon?.bonuses
                },
                tags: {
                    ...baseItem.weapon.tags,
                    ...inherits.weapon?.tags
                },
                properties: mergeVariantProperties(baseItem.weapon.properties, inherits)
            }
            : null;

        return {
            ...baseItem,
            name: `${prefix}${baseItem.name}${suffix}`,
            source: normalizeString(inherits.source || variant.source || baseItem.source),
            page: inherits.page ?? variant.page ?? baseItem.page,
            rarity: normalizeString(inherits.rarity) || baseItem.rarity,
            attunement: inherits.attunement?.required ? inherits.attunement : baseItem.attunement,
            bonuses: {
                ...baseItem.bonuses,
                ...inherits.bonuses
            },
            weapon,
            armor: baseItem.armor || inherits.armor
                ? {
                    ...baseItem.armor,
                    ...inherits.armor
                }
                : null,
            mechanics: {
                ...baseItem.mechanics,
                ...inherits.mechanics
            },
            conditionalDamage: [
                ...toArray(baseItem.conditionalDamage),
                ...toArray(variant.conditionalDamage),
                ...toArray(inherits.conditionalDamage)
            ],
            entries: [
                ...toArray(variant.entries),
                ...toArray(inherits.entries),
                ...toArray(baseItem.entries)
            ],
            _catalogRef: normalizeString(baseItem.ref),
            _variantCatalogRef: normalizeString(variant.ref),
            kind: 'composedMagicVariant'
        };
    }

    function composeMagicVariantRows(items, variants, propertyLookup) {
        const baseItems = toArray(items).filter(item => item.kind === 'baseItem');
        const rows = [];
        const seen = new Set();

        for (const variant of toArray(variants)) {
            for (const baseItem of baseItems) {
                if (!itemMatchesVariant(baseItem, variant)) {
                    continue;
                }

                const composed = composeItemWithVariant(baseItem, variant);
                if (!composed) {
                    continue;
                }

                const key = `${composed.name}|${composed.source}`.toLowerCase();
                if (seen.has(key)) {
                    continue;
                }

                seen.add(key);
                rows.push({
                    ...itemToRow(composed, propertyLookup),
                    _catalogKind: 'composedMagicVariant',
                    _baseCatalogRef: normalizeString(baseItem.ref),
                    _variantCatalogRef: normalizeString(variant.ref)
                });
            }
        }

        return rows;
    }

    function itemToRow(item, propertyLookup) {
        return {
            Name: normalizeString(item.name),
            Source: normalizeString(item.source),
            Page: item.page == null ? '' : String(item.page),
            Rarity: normalizeString(item.rarity) || 'common',
            Type: formatItemType(item),
            Attunement: formatItemAttunement(item),
            Damage: formatItemDamage(item),
            Properties: formatItemProperties(item),
            Mastery: normalizeString(item.mastery),
            Weight: normalizeString(item._l_weight) || formatWeight(item.weight),
            Value: formatItemValue(item),
            Text: formatItemText(item, propertyLookup),
            _catalogRef: normalizeString(item.ref || item.id || item.baseItem),
            _catalogKind: normalizeString(item.kind || item.__prop) || 'item'
        };
    }

    function magicVariantToRow(variant) {
        const inherits = variant.inherits ?? {};
        const variables = {
            ...inherits.bonuses,
            bonusWeapon: inherits.bonuses?.bonusWeapon,
            bonusAc: inherits.bonuses?.bonusAc
        };
        return {
            Name: normalizeString(variant.name),
            Source: normalizeString(variant.source || inherits.source),
            Page: (variant.page ?? inherits.page) == null ? '' : String(variant.page ?? inherits.page),
            Rarity: normalizeString(inherits.rarity) || 'common',
            Type: normalizeString(variant.type?.name).toLowerCase() || 'generic variant',
            Attunement: formatAttunement(inherits.attunement),
            Damage: '',
            Properties: toArray(inherits.propertyAdd).map(property => normalizeString(property.name).toLowerCase()).filter(Boolean).join(', '),
            Mastery: '',
            Weight: '',
            Value: normalizeString(inherits.valueExpression),
            Text: cleanRulesText(toArray(variant.entries).concat(toArray(inherits.entries)), variables),
            _catalogRef: normalizeString(variant.ref),
            _catalogKind: 'magicVariant'
        };
    }

    function raceToRow(race) {
        return {
            Name: normalizeString(race.name),
            Source: normalizeString(race.source),
            Page: race.page == null ? '' : String(race.page),
            'Ability Scores': formatAbilityScores(race.grants || { ability: race.ability }),
            Size: formatSize(race.size),
            Speed: formatSpeed(race.speed),
            Description: formatEntryText(race.entries),
            '5etools Link': makeFiveToolsLink('race', race.name, race.source),
            _catalogRef: normalizeString(race.ref),
            _catalogKind: 'race'
        };
    }

    function backgroundToRow(background) {
        return {
            Name: normalizeString(background.name),
            Source: normalizeString(background.source),
            Page: background.page == null ? '' : String(background.page),
            Description: formatEntryText(background.entries),
            '5etools Link': makeFiveToolsLink('background', background.name, background.source),
            _catalogRef: normalizeString(background.ref),
            _catalogKind: 'background'
        };
    }

    function featToRow(feat) {
        return {
            Name: normalizeString(feat.name),
            Source: normalizeString(feat.source),
            Page: feat.page == null ? '' : String(feat.page),
            Prerequisites: formatPrerequisites(feat.prerequisite),
            'Ability Scores': formatAbilityScores(feat.grants),
            Repeatable: feat.repeatable ? 'Yes' : 'No',
            Description: formatEntryText(feat.entries),
            '5etools Link': makeFiveToolsLink('feat', feat.name, feat.source),
            _catalogRef: normalizeString(feat.ref),
            _catalogKind: 'feat'
        };
    }

    class RulesCatalogWidgetData {
        constructor(options = {}) {
            this.catalogBasePaths = toArray(options.catalogBasePaths).length
                ? toArray(options.catalogBasePaths)
                : DEFAULT_CATALOG_BASE_PATHS;
            this.csvPaths = {
                items: toArray(options.csvPaths?.items).length ? toArray(options.csvPaths.items) : DEFAULT_CSV_PATHS.items,
                spells: toArray(options.csvPaths?.spells).length ? toArray(options.csvPaths.spells) : DEFAULT_CSV_PATHS.spells,
                races: toArray(options.csvPaths?.races).length ? toArray(options.csvPaths.races) : DEFAULT_CSV_PATHS.races,
                backgrounds: toArray(options.csvPaths?.backgrounds).length ? toArray(options.csvPaths.backgrounds) : DEFAULT_CSV_PATHS.backgrounds,
                feats: toArray(options.csvPaths?.feats).length ? toArray(options.csvPaths.feats) : DEFAULT_CSV_PATHS.feats
            };
            this.loadText = typeof options.loadText === 'function' ? options.loadText : null;
            this.cache = new Map();
        }

        static getDefault() {
            if (!this.defaultInstance) {
                this.defaultInstance = new RulesCatalogWidgetData();
            }
            return this.defaultInstance;
        }

        async loadRows(kind, options = {}) {
            const normalizedKind = kind === 'item'
                ? 'items'
                : kind === 'spell'
                    ? 'spells'
                    : kind === 'race'
                        ? 'races'
                        : kind === 'background'
                            ? 'backgrounds'
                            : kind === 'feat'
                                ? 'feats'
                                : kind;
            try {
                const catalogs = await this.loadCatalogs(normalizedKind, options);
                const rows = this.catalogsToRows(normalizedKind, catalogs);

                if (rows.length) {
                    return {
                        rows,
                        source: 'normalized-catalog',
                        catalogs
                    };
                }
            } catch (error) {
                console.warn(`Rules catalog unavailable for ${normalizedKind}; falling back to CSV. ${error.message}`);
            }

            const rows = await this.loadCsvRows(normalizedKind, options);
            return {
                rows,
                source: 'csv-fallback',
                catalogs: {}
            };
        }

        async loadCatalogs(kind, options = {}) {
            const basePaths = toArray(options.catalogBasePaths).length ? toArray(options.catalogBasePaths) : this.catalogBasePaths;
            const catalogs = {};

            for (const fileName of CATALOG_FILES[kind] ?? []) {
                const key = fileName.replace(/\.json$/i, '');
                catalogs[key] = await this.loadJsonFromPaths(makePathList(basePaths, fileName), options.dv);
            }

            return catalogs;
        }

        catalogItemsToRows(catalogs) {
            const propertyLookup = makePropertyLookup(catalogs['item-properties']);
            const items = toArray(catalogs.items?.items);
            const variants = toArray(catalogs['magic-variants']?.magicVariants);
            const hasItemsPageExport = items.some(item => item?._isEnhanced || item?.__prop);
            const hasPreGeneratedCombinations = Number(catalogs.items?.counts?.preGeneratedCombinations ?? 0) > 0;
            const rows = [
                ...items.map(item => itemToRow(item, propertyLookup)),
                ...(hasItemsPageExport ? [] : variants.map(magicVariantToRow)),
                ...(hasItemsPageExport || hasPreGeneratedCombinations ? [] : composeMagicVariantRows(items, variants, propertyLookup))
            ];
            const seen = new Set();
            return rows.filter(row => {
                if (!row.Name) {
                    return false;
                }

                const key = `${normalizeString(row.Name).toLowerCase()}|${normalizeString(row.Source).toLowerCase()}`;
                if (seen.has(key)) {
                    return false;
                }

                seen.add(key);
                return true;
            });
        }

        catalogSpellsToRows(catalogs) {
            return toArray(catalogs.spells?.spells).map(spellToRow).filter(row => row.Name);
        }

        catalogRacesToRows(catalogs) {
            return toArray(catalogs.races?.races).map(raceToRow).filter(row => row.Name);
        }

        catalogBackgroundsToRows(catalogs) {
            return toArray(catalogs.backgrounds?.backgrounds).map(backgroundToRow).filter(row => row.Name);
        }

        catalogFeatsToRows(catalogs) {
            return toArray(catalogs.feats?.feats).map(featToRow).filter(row => row.Name);
        }

        catalogsToRows(kind, catalogs) {
            if (kind === 'items') {
                return this.catalogItemsToRows(catalogs);
            }
            if (kind === 'spells') {
                return this.catalogSpellsToRows(catalogs);
            }
            if (kind === 'races') {
                return this.catalogRacesToRows(catalogs);
            }
            if (kind === 'backgrounds') {
                return this.catalogBackgroundsToRows(catalogs);
            }
            if (kind === 'feats') {
                return this.catalogFeatsToRows(catalogs);
            }
            return [];
        }

        async loadCsvRows(kind, options = {}) {
            const csvPaths = toArray(options.csvPaths).length ? toArray(options.csvPaths) : this.csvPaths[kind];
            const text = await this.loadTextFromPaths(csvPaths, options.dv);
            return parseCSV(text);
        }

        async loadJsonFromPaths(paths, dv) {
            const text = await this.loadTextFromPaths(paths, dv);
            return JSON.parse(text);
        }

        async loadTextFromPaths(paths, dv) {
            const errors = [];
            for (const path of paths) {
                const cacheKey = `text:${path}`;
                if (this.cache.has(cacheKey)) {
                    return this.cache.get(cacheKey);
                }

                try {
                    const text = await this.tryLoadText(path, dv);
                    if (text != null && text !== '') {
                        this.cache.set(cacheKey, text);
                        return text;
                    }
                } catch (error) {
                    errors.push(`${path}: ${error.message}`);
                }
            }

            throw new Error(errors.length ? errors.join('; ') : `No readable paths: ${paths.join(', ')}`);
        }

        async tryLoadText(path, dv) {
            if (this.loadText) {
                return this.loadText(path);
            }

            if (dv?.io?.load) {
                return dv.io.load(path);
            }

            if (typeof fetch === 'function') {
                const response = await fetch(path);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                return response.text();
            }

            throw new Error('No text loader available.');
        }
    }

    globalThis.RulesCatalogWidgetData = RulesCatalogWidgetData;
    if (typeof window !== 'undefined') {
        window.RulesCatalogWidgetData = RulesCatalogWidgetData;
    }
})();
