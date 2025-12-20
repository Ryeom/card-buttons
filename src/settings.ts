import { App, PluginSettingTab, Setting, Modal, TextAreaComponent } from "obsidian";
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
		contentEl.createEl("h2", { text: "테마 스타일 편집" });
		contentEl.createEl("p", { text: "내부 요소의 CSS를 자유롭게 수정할 수 있습니다." });

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

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.createEl('h2', { text: '커스텀 스타일 라이브러리' });

		new Setting(containerEl)
			.setName('새 테마 추가')
			.addButton(btn => btn
				.setButtonText('+ 추가')
				.setCta()
				.onClick(async (e) => {
					const newId = `theme_${Object.keys(this.plugin.settings.customStyles).length + 1}`;
					this.plugin.settings.customStyles[newId] = defaultCss

					await this.plugin.saveSettings();
					this.display();
				}));

		const styles = this.plugin.settings.customStyles;
		Object.keys(styles).forEach((id) => {
			new Setting(containerEl)
				.addText(text => text
					.setPlaceholder('스타일 ID')
					.setValue(id)
					.onChange(async (newId: string) => {
						const validatedId = (newId || "").trim();
						if (validatedId && validatedId !== id) {
							const content = styles[id];
							delete styles[id];
							(this.plugin.settings.customStyles as any)[validatedId] = content;
							await this.plugin.saveSettings();
						}
					}))
				.addButton(btn => btn
					.setButtonText("CSS 편집")
					.onClick(() => {
						const currentCSS = styles[id] || "";
						new CSSEditModal(this.app, currentCSS, async (css) => {
							styles[id] = css;
							await this.plugin.saveSettings();
						}).open();
					}))
				.addButton(btn => btn
					.setIcon('trash')
					.setWarning()
					.onClick(async () => {
						delete styles[id];
						await this.plugin.saveSettings();
						this.display();
					}));
		});
	}
}

const defaultCss = `/* 1. [전체 컨테이너] 카드들의 배치와 간격을 조절합니다 */
.card-buttons-container {
    /* gap: 20px; -> 카드 사이의 간격을 넓힐 때 사용 */
}

/* 2. [카드 외곽] 카드의 배경, 테두리, 그림자를 결정합니다 */
.card-item {
    /* padding: 10px; -> 내부 여백을 주어 이미지를 띄울 때 유용 */
}

/* 3. [호버 액션] 마우스를 올렸을 때의 변화를 정의합니다 */
.card-item:hover {
    
}

/* 4. [이미지 박스] 이미지가 담긴 영역의 크기와 곡률을 조절합니다 */
.card-img-container {
    
}

/* 5. [정보 영역] 글자가 들어가는 하단 박스의 배경과 패딩을 조절합니다 */
.card-info {
    
}

/* 6. [제목] 글꼴 크기, 색상, 정렬을 담당합니다 */
.card-title {
    
}

/* 7. [설명] 부가 설명의 스타일을 정의합니다 */
.card-desc {
    
}

/* 8. [클릭 효과] 클릭하는 순간의 시각적 피드백을 줍니다 */
.card-item:active {
    
}`