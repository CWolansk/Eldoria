import {RenderRaces} from "./render-races.js";

class RacesSublistManager extends SublistManager {
	static _getRowTemplate () {
		return [
			new SublistCellTemplate({
				name: "Name",
				css: "bold ve-col-5 pl-0 pr-1",
				colStyle: "",
			}),
			new SublistCellTemplate({
				name: "Ability",
				css: "ve-col-5 px-1",
				colStyle: "",
			}),
			new SublistCellTemplate({
				name: "Size",
				css: "ve-col-2 ve-text-center pl-1 pr-0",
				colStyle: "text-center",
			}),
		];
	}

	pGetSublistItem (race, hash) {
		const cellsText = [
			race.name,
			new SublistCell({text: race._slAbility, css: race._slAbility === "Lineage" ? "italic" : ""}),
			(race.size || [Parser.SZ_VARIES]).map(sz => Parser.sizeAbvToFull(sz)).join("/"),
		];

		const $ele = $(`<div class="lst__row lst__row--sublist ve-flex-col">
				<a href="#${UrlUtil.autoEncodeHash(race)}" class="lst__row-border lst__row-inner">
					${this.constructor._getRowCellsHtml({values: cellsText})}
				</a>
			</div>
		`)
			.contextmenu(evt => this._handleSublistItemContextMenu(evt, listItem))
			.click(evt => this._listSub.doSelect(listItem, evt));

		const listItem = new ListItem(
			hash,
			$ele,
			race.name,
			{
				hash,
				page: race.page,
				ability: race._slAbility,
			},
			{
				entity: race,
				mdRow: [...cellsText],
			},
		);
		return listItem;
	}
}

class RacesPage extends ListPage {
	constructor () {
		const pageFilter = new PageFilterRaces();
		super({
			dataSource: DataUtil.race.loadJSON.bind(DataUtil.race, {isAddBaseRaces: true}),
			prereleaseDataSource: DataUtil.race.loadPrerelease.bind(DataUtil.race),
			brewDataSource: DataUtil.race.loadBrew.bind(DataUtil.race),

			pFnGetFluff: Renderer.race.pGetFluff.bind(Renderer.race),

			pageFilter,

			dataProps: ["race"],

			bookViewOptions: {
				nameSingular: "race",
				namePlural: "races",
				pageTitle: "Races Book View",
			},

			hasAudio: true,
		});
	}

	_addData (data) {
		if (data.race && data.race.length) super._addData(data);
		if (!data.subrace || !data.subrace.length) return;

		// Attach each subrace to a parent race, and recurse
		const nxtData = Renderer.race.adoptSubraces(this._dataList, data.subrace);

		if (nxtData.length) this._addData({race: Renderer.race.mergeSubraces(nxtData)});
	}

	getListItem (race, rcI, isExcluded) {
		const hash = UrlUtil.autoEncodeHash(race);
		if (this._seenHashes.has(hash)) return null;
		this._seenHashes.add(hash);

		this._pageFilter.mutateAndAddToFilters(race, isExcluded);

		const eleLi = document.createElement("div");
		eleLi.className = `lst__row ve-flex-col ${isExcluded ? "lst__row--blocklisted" : ""}`;

		const size = (race.size || [Parser.SZ_VARIES]).map(sz => Parser.sizeAbvToFull(sz)).join("/");
		const source = Parser.sourceJsonToAbv(race.source);

		eleLi.innerHTML = `<a href="#${hash}" class="lst__row-border lst__row-inner">
			<span class="bold ve-col-4 pl-0 pr-1">${race.name}</span>
			<span class="ve-col-4 px-1 ${race._slAbility === "Lineage" ? "italic" : ""}">${race._slAbility}</span>
			<span class="ve-col-2 px-1 ve-text-center">${size}</span>
			<span class="ve-col-2 ve-text-center ${Parser.sourceJsonToSourceClassname(race.source)} pl-1 pr-0" title="${Parser.sourceJsonToFull(race.source)}">${source}</span>
		</a>`;

		const listItem = new ListItem(
			rcI,
			eleLi,
			race.name,
			{
				hash,
				source,
				page: race.page,
				ability: race._slAbility,
				size,
				cleanName: PageFilterRaces.getInvertedName(race.name) || "",
				alias: PageFilterRaces.getListAliases(race),
			},
			{
				isExcluded,
			},
		);

		eleLi.addEventListener("click", (evt) => this._list.doSelect(listItem, evt));
		eleLi.addEventListener("contextmenu", (evt) => this._openContextMenu(evt, this._list, listItem));

		return listItem;
	}

	_renderStats_doBuildStatsTab ({ent}) {
		this._$pgContent.empty().append(RenderRaces.$getRenderedRace(ent));
	}

	_pOnLoad_bindMiscButtons () {
		super._pOnLoad_bindMiscButtons();
		this._bindExportRacesJsonButton();
	}

	_bindExportRacesJsonButton () {
		$(`#btn-export-races-json`)
			.off("click")
			.on("click", () => this._pHandleClickExportRacesJson());
	}

	async _pHandleClickExportRacesJson () {
		const exportable = this._getExportableRacesJson();
		DataUtil.userDownload("races-page-full-normalized", exportable, {isSkipAdditionalMetadata: true});
		JqueryUtil.doToast(`Exported ${exportable.counts.races.toLocaleString()} races as JSON.`);
	}

	_getExportableRacesJson () {
		const races = this._dataList || [];
		const raceRefs = new WeakMap();

		races.forEach((race, i) => raceRefs.set(race, this._getExportableRacesJson_getRaceRef(race, i)));

		return {
			schema: "eldoria.5etools.races-page.normalized-export",
			schemaVersion: 1,
			generatedAt: new Date().toISOString(),
			generator: {
				name: "races-page-full-normalized-export",
				page: UrlUtil.PG_RACES,
				description: "All races loaded by the 5etools Races page after copy resolution, base-race generation, and subrace merging.",
			},
			counts: this._getExportableRacesJson_getCounts(races),
			races: races.map((race, i) => this._getExportableRacesJson_getCleanRace(race, {raceRefs, rootRace: race, path: `#/races/${i}`})),
		};
	}

	_getExportableRacesJson_getCounts (races) {
		const sources = new Set();
		races.forEach(race => {
			if (race.source) sources.add(race.source);
		});

		return {
			races: races.length,
			baseRaces: races.filter(race => race._isBaseRace).length,
			subraces: races.filter(race => race._baseName).length,
			sources: sources.size,
		};
	}

	_getExportableRacesJson_getRaceRef (race, ix) {
		const source = race.source || "";
		const hash = UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_RACES]({name: race.name, source});
		return {
			$ref: `#/races/${ix}`,
			name: race.name,
			source,
			hash,
		};
	}

	_getExportableRacesJson_getCleanRace (race, {raceRefs, rootRace, path}) {
		return this._getExportableRacesJson_getCleanValue(race, {
			raceRefs,
			rootRace,
			path,
			seen: new WeakMap(),
		});
	}

	_getExportableRacesJson_getCleanValue (value, {raceRefs, rootRace, path, seen}) {
		if (value == null || typeof value !== "object") return value;

		if (raceRefs.has(value) && value !== rootRace) return MiscUtil.copyFast(raceRefs.get(value));
		if (seen.has(value)) return {$ref: seen.get(value)};

		seen.set(value, path);

		if (value instanceof Array) {
			return value.map((it, i) => this._getExportableRacesJson_getCleanValue(it, {
				raceRefs,
				rootRace,
				path: `${path}/${i}`,
				seen,
			}));
		}

		return Object.entries(value)
			.mergeMap(([k, v]) => {
				if (typeof v === "function") return {};

				return {
					[k]: this._getExportableRacesJson_getCleanValue(v, {
						raceRefs,
						rootRace,
						path: `${path}/${this._getExportableRacesJson_getJsonPointerPart(k)}`,
						seen,
					}),
				};
			});
	}

	_getExportableRacesJson_getJsonPointerPart (part) {
		return `${part}`.replace(/~/g, "~0").replace(/\//g, "~1");
	}
}

const racesPage = new RacesPage();
racesPage.sublistManager = new RacesSublistManager();
window.addEventListener("load", () => racesPage.pOnLoad());

globalThis.dbg_page = racesPage;
