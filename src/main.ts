import {
	App, Plugin, TFile, Notice, setIcon,
	MarkdownPostProcessorContext, MarkdownRenderChild
} from 'obsidian';
import {
	ViewUpdate, ViewPlugin, DecorationSet, Decoration,
	EditorView, WidgetType
} from "@codemirror/view";
import { DEFAULT_SETTINGS, MyPluginSettings, SampleSettingTab } from "./settings";

interface CardData {
	title?: string;
	desc?: string;
	picture?: string;
	action?: string;
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();
		this.registerEditorExtension(this.buildLivePreviewPlugin());
		this.registerMarkdownPostProcessor((el, ctx) => {
			const codes = el.querySelectorAll("code");
			codes.forEach((codeEl) => {
				const text = codeEl.innerText.trim();
				if (text.startsWith("[!") && text.endsWith("!]")) {
					ctx.addChild(new InlineButtonChild(codeEl as HTMLElement, this));
				}
			});
		});

		this.registerMarkdownCodeBlockProcessor("card-buttons", (source, el, ctx) => {
			const parts = source.split("[card]");
			const firstPart = parts[0] || "";
			const settingSource = firstPart.includes("[setting]") ? firstPart.replace("[setting]", "").trim() : "";
			const cardSections = parts.slice(1).map(s => s.trim()).filter(s => s !== "");

			let localRatio = "1 / 1";

			if (settingSource) {
				settingSource.split("\n").forEach(line => {
					if (!line.includes("|")) return;
					const segments = line.split("|").map(s => s.trim());
					if (segments.length >= 2) {
						const key = segments[0]?.toLowerCase();
						const value = segments[1];
						if (key === "ratio" && value) localRatio = value.replace(/\s/g, "").replace(":", " / ");
					}
				});
			}

			const container = el.createEl("div", { cls: "card-buttons-container" });
			container.style.gridTemplateColumns = `repeat(${cardSections.length || 1}, 1fr)`;

			cardSections.forEach((section) => {
				const data = this.parseSection(section);
				const cardEl = container.createEl("div", { cls: "card-item" });
				cardEl.style.setProperty("aspect-ratio", localRatio, "important");

				const rawPic = data.picture || "";
				const isOnlyImage = rawPic.includes("|only");
				const picPath = isOnlyImage ? rawPic.split("|only")[0]?.trim() : rawPic.trim();

				if (picPath) {
					const res = this.resolveImagePath(picPath);
					if (res) {
						const imgDiv = cardEl.createEl("div", {
							cls: isOnlyImage ? "card-img-container is-only-image" : "card-img-container"
						});
						imgDiv.createEl("img", { attr: { src: res }, cls: "card-img" });
					}
				}

				if (!isOnlyImage) {
					const infoEl = cardEl.createEl("div", { cls: "card-info" });
					if (data.title) infoEl.createEl("div", { text: data.title, cls: "card-title" });
					if (data.desc) infoEl.createEl("p", { text: data.desc, cls: "card-desc" });
				}

				if (data.action) {
					cardEl.addClass("is-clickable");
					cardEl.onClickEvent(() => this.handleAction(data.action!));
				}
			});
		});
		this.addSettingTab(new SampleSettingTab(this.app, this));
	}

	buildLivePreviewPlugin() {
		const plugin = this;
		return ViewPlugin.fromClass(class {
			decorations: DecorationSet;
			constructor(view: EditorView) { this.decorations = this.buildDecorations(view); }
			update(update: ViewUpdate) {
				if (update.docChanged || update.viewportChanged || update.selectionSet) {
					this.decorations = this.buildDecorations(update.view);
				}
			}
			buildDecorations(view: EditorView) {
				const decorations: any[] = [];
				const regex = /`\[!(.*?)!\]`/g;
				const text = view.state.doc.toString();
				const selection = view.state.selection.main;
				let match;
				while ((match = regex.exec(text)) !== null) {
					const start = match.index;
					const end = start + match[0].length;
					if (selection.from >= start && selection.to <= end) continue;
					const content = match[1];
					if (content) {
						decorations.push(Decoration.replace({
							widget: new InlineButtonWidget(content, plugin),
						}).range(start, end));
					}
				}
				return Decoration.set(decorations, true);
			}
		}, { decorations: v => v.decorations });
	}

	async handleAction(actionString: string) {
		const parts = actionString.split("|").map(s => s.trim());
		const type = parts[0];
		let value = parts[2] || parts[1];

		if (!type || !value) return;

		switch (type) {
			case "copy":
				await navigator.clipboard.writeText(value);
				new Notice(`복사되었습니다: ${value}`);
				break;
			case "command":
				// @ts-ignore
				this.app.commands.executeCommandById(value);
				break;
			case "url":
				window.open(value.startsWith("http") ? value : `https://${value}`);
				break;
			case "open":
				await this.app.workspace.openLinkText(value, "", true);
				break;
			case "search":
				const searchPlugin = (this.app as any).internalPlugins.getPluginById("global-search");
				if (searchPlugin) searchPlugin.instance.openGlobalSearch(value);
				else new Notice("검색 플러그인 비활성 상태");
				break;
			case "create":
				this.createNewFileFromTemplate(value);
				break;
			case "js":
				try {
					new Function('app', 'Notice', value)(this.app, Notice);
				} catch (e) {
					new Notice("JS 실행 오류");
				}
				break;
			default:
				new Notice(`알 수 없는 액션: ${type}`);
		}
	}

	async createNewFileFromTemplate(tPath: string) {
		try {
			const tFile = this.app.metadataCache.getFirstLinkpathDest(tPath, "");
			const content = tFile instanceof TFile ? await this.app.vault.read(tFile) : "";
			const fName = `New_${Date.now()}.md`;
			const nFile = await this.app.vault.create(fName, content);
			if (nFile) await this.app.workspace.getLeaf(true).openFile(nFile);
		} catch (e) { new Notice("파일 생성 중 오류 발생"); }
	}

	resolveImagePath(p: string) {
		const f = this.app.metadataCache.getFirstLinkpathDest(p, "");
		return f instanceof TFile ? this.app.vault.adapter.getResourcePath(f.path) : (p.startsWith("http") ? p : "");
	}

	parseSection(s: string) {
		const r: any = {};
		s.split("\n").forEach(l => {
			const i = l.indexOf(":");
			if (i !== -1) r[l.substring(0, i).trim()] = l.substring(i + 1).trim();
		});
		return r as CardData;
	}

	async loadSettings() { this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData()); }
	async saveSettings() { await this.saveData(this.settings); }
}

function renderInlineButton(el: HTMLElement, content: string, plugin: MyPlugin) {
	const parts = content.split("|").map(p => p.trim());
	const type = parts[0] || "";
	const label = parts[1] || "";
	const value = parts[2] || parts[1] || "";
	const iconColor = parts[3];
	const bgColor = parts[4];

	el.addClass("inline-card-button");
	if (bgColor) el.style.backgroundColor = bgColor;

	const iconMap: Record<string, string> = {
		copy: "copy", command: "terminal", url: "external-link",
		open: "file-text", search: "search", create: "plus-square", js: "code-2"
	};
	const iconId = type.includes("-") || type.length > 10 ? type : (iconMap[type] || type || "square-asterisk");

	const iconSpan = el.createEl("span", { cls: "inline-button-icon" });
	setIcon(iconSpan, iconId);

	const displayText = label || value;
	const textSpan = el.createEl("span", { text: displayText, cls: "inline-button-text" });

	if (iconColor) {
		iconSpan.style.color = iconColor;
		textSpan.style.color = iconColor;
	}

	el.onclick = (e) => {
		e.preventDefault(); e.stopPropagation();
		plugin.handleAction(content);
	};
}

class InlineButtonWidget extends WidgetType {
	constructor(readonly content: string, readonly plugin: MyPlugin) { super(); }
	toDOM() {
		const span = document.createElement("span");
		renderInlineButton(span, this.content, this.plugin);
		return span;
	}
}

class InlineButtonChild extends MarkdownRenderChild {
	constructor(containerEl: HTMLElement, public plugin: MyPlugin) { super(containerEl); }
	onload() {
		const rawText = this.containerEl.innerText.trim();
		const match = rawText.match(/^\[!(.*)!\]$/);
		if (match && match[1]) {
			this.containerEl.empty();
			this.containerEl.removeClass("cm-inline-code");
			renderInlineButton(this.containerEl, match[1], this.plugin);
		}
	}
}