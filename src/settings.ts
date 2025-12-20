import { App, PluginSettingTab, Setting, Modal, TextAreaComponent, Notice } from "obsidian";
import MyPlugin from "./main";

export interface MyPluginSettings {
	aspectRatioWidth: number;
	aspectRatioHeight: number;
	customStyles: Record<string, string>;
}

export const DEFAULT_SETTINGS: MyPluginSettings = {
	aspectRatioWidth: 5,
	aspectRatioHeight: 4,
	customStyles: {}
}

class CSSEditModal extends Modal {
	constructor(app: App, private initialCSS: string, private onSave: (css: string) => void) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl("h2", { text: "🎨 테마 스타일 편집" });
		contentEl.createEl("p", { text: "내부 요소의 CSS를 수정하세요. (저장 시 즉시 반영됩니다)" });

		const textArea = new TextAreaComponent(contentEl);
		textArea.inputEl.style.width = "100%";
		textArea.inputEl.style.height = "400px";
		textArea.inputEl.style.fontFamily = "monospace";
		textArea.setValue(this.initialCSS);

		new Setting(contentEl)
			.addButton(btn => btn
				.setButtonText("저장하기")
				.setCta()
				.onClick(() => {
					this.onSave(textArea.getValue());
					this.close();
				}))
			.addButton(btn => btn
				.setButtonText("취소")
				.onClick(() => this.close()));
	}
}

export class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	refreshMarkdownViews() {
		this.app.workspace.iterateAllLeaves((leaf) => {
			if (leaf.view.getViewType() === "markdown") {
				(leaf.view as any).previewMode?.rerender(true);
			}
		});
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.createEl('h2', { text: '🎨 커스텀 스타일 라이브러리' });

		new Setting(containerEl)
			.setName('새 테마 추가')
			.addButton(btn => btn
				.setButtonText('+ 추가')
				.setCta()
				.onClick(async () => {
					const newId = `theme_${Date.now()}`;
					this.plugin.settings.customStyles[newId] = defaultCss;
					await this.plugin.saveSettings();
					this.display();
				}));

		const styles = this.plugin.settings.customStyles;

		// [수정] Object.entries를 사용하여 id와 content를 동시에 안전하게 가져옵니다.
		Object.entries(styles).forEach(([id, initialContent]) => {
			let tempId = id;

			new Setting(containerEl)
				.addText(text => text
					.setPlaceholder('스타일 ID 입력')
					.setValue(id)
					.onChange((val) => {
						tempId = val.trim();
					}))
				.addButton(btn => btn
					.setButtonText("ID 변경")
					.setTooltip("ID를 확정 변경합니다.")
					.onClick(async () => {
						const finalId = (tempId || "").trim();
						if (finalId && finalId !== id) {
							const content = styles[id];
							if (content !== undefined) {
								delete styles[id];
								(this.plugin.settings.customStyles as any)[finalId] = content;
								await this.plugin.saveSettings();
								this.refreshMarkdownViews();
								this.display();
								new Notice(`ID가 '${finalId}'로 변경되었습니다.`);
							}
						}
					}))
				.addButton(btn => btn
					.setButtonText("CSS 편집")
					.setCta()
					.onClick(() => {
						// [에러 해결] styles[id]가 존재함을 보장하거나 기본값을 제공합니다.
						const currentCSS = styles[id] ?? "";
						new CSSEditModal(this.app, currentCSS, async (css) => {
							styles[id] = css;
							await this.plugin.saveSettings();
							this.refreshMarkdownViews();
							new Notice("스타일이 저장 및 반영되었습니다.");
						}).open();
					}))
				.addButton(btn => btn
					.setIcon('trash')
					.setWarning()
					.onClick(async () => {
						delete styles[id];
						await this.plugin.saveSettings();
						this.refreshMarkdownViews();
						this.display();
					}));
		});
	}
}

const defaultCss = `/* 1. [전체 컨테이너] */
.card-buttons-container { }
/* 2. [카드 외곽] */
.card-item { }
/* 3. [호버 액션] */
.card-item:hover { }
/* 4. [이미지 박스] */
.card-img-container { }
/* 5. [정보 영역] */
.card-info { }
/* 6. [제목] */
.card-title { }
/* 7. [설명] */
.card-desc { }
/* 8. [클릭 효과] */
.card-item:active { }`;