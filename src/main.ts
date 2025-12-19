import { App, Plugin, TFile, Notice } from 'obsidian';
import { DEFAULT_SETTINGS, MyPluginSettings, SampleSettingTab } from "./settings";

interface CardData {
	title?: string;
	desc?: string;
	icon?: string;
	picture?: string;
	action?: string;
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();

		this.registerMarkdownCodeBlockProcessor("card-buttons", (source, el, ctx) => {
			const container = el.createEl("div", { cls: "card-buttons-container" });

			const cardSections = source
				.split(/\[card\]/)
				.filter(s => s.trim() !== "")
				.slice(0, 6);

			cardSections.forEach((section) => {
				const data = this.parseSection(section);
				const cardEl = container.createEl("div", { cls: "card-item" });
				if (data.picture) {
					const resolvedPath = this.resolveImagePath(data.picture);
					if (resolvedPath) {
						const imgContainer = cardEl.createEl("div", { cls: "card-img-container" });
						imgContainer.createEl("img", {
							attr: { src: resolvedPath },
							cls: "card-img"
						});
					}
				}

				const infoEl = cardEl.createEl("div", { cls: "card-info" });
				if (data.title) infoEl.createEl("div", { text: data.title, cls: "card-title" });
				if (data.desc) infoEl.createEl("p", { text: data.desc, cls: "card-desc" });

				if (data.action) {
					cardEl.addClass("is-clickable");
					cardEl.onClickEvent(() => {
						this.handleAction(data.action!);
					});
				}
			});
		});

		this.addSettingTab(new SampleSettingTab(this.app, this));
	}

	resolveImagePath(sourcePath: string): string {
		const file = this.app.metadataCache.getFirstLinkpathDest(sourcePath, "");
		if (file instanceof TFile) {
			return this.app.vault.adapter.getResourcePath(file.path);
		}
		return sourcePath.startsWith("http") ? sourcePath : "";
	}

	parseSection(section: string): CardData {
		const lines = section.split("\n");
		const result: CardData = {};
		lines.forEach(line => {
			const colonIndex = line.indexOf(":");
			if (colonIndex !== -1) {
				const key = line.substring(0, colonIndex).trim();
				const value = line.substring(colonIndex + 1).trim();
				if (key in { title: 1, desc: 1, icon: 1, picture: 1, action: 1 }) {
					result[key as keyof CardData] = value;
				}
			}
		});
		return result;
	}

	async handleAction(action: string) {
		const [type, value] = action.split("|").map(s => s.trim());
		if (!type || !value) return;

		switch (type) {
			case "url":
				window.open(value.startsWith("http") ? value : `${value}`);
				break;
			case "open":// 파일 열기
				await this.app.workspace.openLinkText(value, "", true);
				break;

			case "create":// 파일 생성 로직
				this.createNewFileFromTemplate(value);
				break;

			default:
				new Notice(`알 수 없는 액션 타입: ${type}`);
		}
	}

	async createNewFileFromTemplate(templatePath: string) {
		try {
			const templateFile = this.app.metadataCache.getFirstLinkpathDest(templatePath, "");
			let content = "";

			if (templateFile instanceof TFile) {
				content = await this.app.vault.read(templateFile);
			} else {
				new Notice(`템플릿을 찾을 수 없습니다: ${templatePath}`);
				return; // 템플릿이 없으면 중단하거나 빈 파일 생성을 선택
			}

			const fileName = `무제 ${Date.now()}.md`;
			const newFile = await this.app.vault.create(fileName, content);

			await this.app.workspace.getLeaf(true).openFile(newFile);
			new Notice("템플릿이 적용된 새 메모가 생성되었습니다.");

		} catch (e: any) {
			console.error("파일 생성 실패:", e);
			if (e.message?.includes("already exists")) {
				new Notice("이미 동일한 이름의 파일이 존재합니다.");
			} else {
				new Notice("파일 생성 중 오류가 발생했습니다.");
			}
		}
	}

	onunload() { }

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}