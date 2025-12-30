import {
    App, TFile,
    Editor, EditorPosition, EditorSuggest, EditorSuggestContext, EditorSuggestTriggerInfo,
} from 'obsidian';

interface ActionKeyword {
    label: string;
    value: string;
    desc: string;
}

export default class ActionSuggest extends EditorSuggest<ActionKeyword> {
    private actionList: ActionKeyword[] = [
        { label: "url", value: "url | ", desc: "외부 웹사이트 연결 (데스크탑/모바일 대응)" },
        { label: "create", value: "create | ", desc: "템플릿 기반 새 파일 생성 및 속성 주입" },
        { label: "open", value: "open | ", desc: "옵시디언 내부 파일 또는 링크 열기" },
        { label: "copy", value: "copy | ", desc: "지정한 텍스트를 클립보드에 복사" },
        { label: "command", value: "command | ", desc: "옵시디언 명령(Command) 실행" },
        { label: "search", value: "search | ", desc: "전체 검색창 열기 및 검색어 입력" },
        { label: "js", value: "js | ", desc: "커스텀 자바스크립트 코드 실행" }
    ];

    constructor(app: App) { super(app); }

    onTrigger(cursor: EditorPosition, editor: Editor, file: TFile): EditorSuggestTriggerInfo | null {
        const line = editor.getLine(cursor.line);
        const sub = line.substring(0, cursor.ch);
        const match = sub.match(/action\s*[:|]\s*$/);

        if (match) {
            return {
                start: { line: cursor.line, ch: sub.length },
                end: cursor,
                query: ""
            };
        }
        return null;
    }

    getSuggestions(context: EditorSuggestContext): ActionKeyword[] {
        return this.actionList;
    }

    renderSuggestion(item: ActionKeyword, el: HTMLElement): void {
        el.createEl("div", {
            text: "⚡ " + item.label,
            cls: "action-suggestion-title",
            attr: { style: "font-weight: bold; color: var(--text-accent);" }
        });
        el.createEl("small", {
            text: item.desc,
            cls: "action-suggestion-desc",
            attr: { style: "display: block; font-size: 0.8em; opacity: 0.7;" }
        });
    }

    selectSuggestion(item: ActionKeyword, evt: MouseEvent | KeyboardEvent): void {
        const context = this.context;
        if (context) {
            context.editor.replaceRange(item.value, context.start, context.end);
        }
    }
}