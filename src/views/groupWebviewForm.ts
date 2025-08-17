import * as vscode from 'vscode';
import { ServerGroup } from '../models/serverModel';
import { LocalizationService } from '../services/localizationService';
import { ServerService } from '../services/serverService';

export class GroupWebviewForm {
    private localization = LocalizationService.getInstance();
    private currentPanel?: vscode.WebviewPanel;

    constructor(private serverService: ServerService, private context: vscode.ExtensionContext) {}

    async showAddGroupWebview(): Promise<ServerGroup | undefined> {
        return this.showGroupWebview(undefined);
    }

    async showEditGroupWebview(group: ServerGroup): Promise<ServerGroup | undefined> {
        return this.showGroupWebview(group);
    }

    private async showGroupWebview(existingGroup?: ServerGroup): Promise<ServerGroup | undefined> {
        const isEdit = !!existingGroup;
        const title = isEdit
            ? this.localization.localize('form.editGroup', existingGroup!.name)
            : this.localization.localize('form.addGroup');

        // Закрываем предыдущую панель, если она открыта
        if (this.currentPanel) {
            this.currentPanel.dispose();
        }

        // Создаем новую webview панель
        this.currentPanel = vscode.window.createWebviewPanel(
            'groupForm',
            title,
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true, // Ключевой параметр для сохранения состояния
                localResourceRoots: []
            }
        );

        // Устанавливаем HTML содержимое
        this.currentPanel.webview.html = this.getWebviewContent(existingGroup);

        // Обрабатываем сообщения от webview
        return new Promise((resolve) => {
            if (!this.currentPanel) {
                resolve(undefined);
                return;
            }

            this.currentPanel.webview.onDidReceiveMessage(
                async (message: any) => {
                    switch (message.type) {
                        case 'submit':
                            try {
                                const groupData = message.data;
                                console.log('Получены данные группы:', JSON.stringify(groupData, null, 2));

                                const group = await this.processGroupData(groupData, existingGroup);

                                if (this.currentPanel) {
                                    this.currentPanel.dispose();
                                    this.currentPanel = undefined;
                                }

                                resolve(group);
                            } catch (error) {
                                console.error('Ошибка при обработке данных группы:', error);
                                this.currentPanel?.webview.postMessage({
                                    type: 'error',
                                    message: error instanceof Error ? error.message : String(error)
                                });
                            }
                            break;

                        case 'cancel':
                            if (this.currentPanel) {
                                this.currentPanel.dispose();
                                this.currentPanel = undefined;
                            }
                            resolve(undefined);
                            break;
                    }
                },
                undefined,
                this.context.subscriptions
            );

            // Обрабатываем закрытие панели
            this.currentPanel.onDidDispose(() => {
                this.currentPanel = undefined;
                resolve(undefined);
            });
        });
    }

    private async processGroupData(data: any, existingGroup?: ServerGroup): Promise<ServerGroup> {
        const groupData = {
            name: data.name,
            description: data.description || undefined,
            icon: data.groupIcon || 'folder',
            color: data.groupColor || undefined
        };

        if (existingGroup) {
            // Обновляем существующую группу
            const updatedGroup: ServerGroup = { ...groupData, id: existingGroup.id };
            await this.serverService.updateGroup(updatedGroup);
            vscode.window.showInformationMessage(
                this.localization.localize('form.groupUpdated', groupData.name)
            );
            return updatedGroup;
        } else {
            // Создаем новую группу
            const group = await this.serverService.addGroup(groupData.name, groupData.description);
            vscode.window.showInformationMessage(
                this.localization.localize('form.groupAdded', groupData.name)
            );
            return group;
        }
    }

    private getWebviewContent(existingGroup?: ServerGroup): string {
        const isEdit = !!existingGroup;
        const nonce = this.generateNonce();

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <title>${isEdit ? this.localization.localize('form.editGroup', existingGroup!.name) : this.localization.localize('form.addGroup')}</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            margin: 0;
        }

        .form-container {
            max-width: 500px;
            margin: 0 auto;
        }

        .form-group {
            margin-bottom: 15px;
        }

        label {
            display: block;
            margin-bottom: 5px;
            font-weight: 600;
            color: var(--vscode-input-foreground);
        }

        input[type="text"], textarea {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid var(--vscode-input-border);
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border-radius: 3px;
            font-size: inherit;
            font-family: inherit;
            box-sizing: border-box;
        }

        input:focus, textarea:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }

        textarea {
            resize: vertical;
            min-height: 60px;
        }

        .button-group {
            display: flex;
            gap: 10px;
            justify-content: flex-end;
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid var(--vscode-input-border);
        }

        button {
            padding: 8px 16px;
            border: none;
            border-radius: 3px;
            cursor: pointer;
            font-size: inherit;
            font-family: inherit;
            min-width: 80px;
        }

        .btn-primary {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }

        .btn-primary:hover {
            background-color: var(--vscode-button-hoverBackground);
        }

        .btn-secondary {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }

        .btn-secondary:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }

        .error-message {
            color: var(--vscode-errorForeground);
            font-size: 12px;
            margin-top: 5px;
        }

        .required {
            color: var(--vscode-errorForeground);
        }

        .icon-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(40px, 1fr));
            gap: 5px;
            margin-top: 10px;
            max-height: 120px;
            overflow-y: auto;
            border: 1px solid var(--vscode-input-border);
            border-radius: 3px;
            padding: 10px;
        }

        .icon-option {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 8px;
            border: 1px solid transparent;
            border-radius: 3px;
            cursor: pointer;
            font-size: 11px;
        }

        .icon-option:hover {
            background-color: var(--vscode-list-hoverBackground);
        }

        .icon-option.selected {
            border-color: var(--vscode-focusBorder);
            background-color: var(--vscode-list-activeSelectionBackground);
        }

        .color-grid {
            display: grid;
            grid-template-columns: repeat(8, 1fr);
            gap: 5px;
            margin-top: 10px;
        }

        .color-option {
            width: 30px;
            height: 30px;
            border-radius: 50%;
            cursor: pointer;
            border: 2px solid transparent;
        }

        .color-option:hover {
            border-color: var(--vscode-focusBorder);
        }

        .color-option.selected {
            border-color: var(--vscode-focusBorder);
            box-shadow: 0 0 0 2px var(--vscode-focusBorder);
        }
    </style>
</head>
<body>
    <div class="form-container">
        <h2>${isEdit ? this.localization.localize('form.editGroup', existingGroup!.name) : this.localization.localize('form.addGroup')}</h2>

        <form id="groupForm">
            <div class="form-group">
                <label for="name">${this.localization.localize('form.newGroupName')} <span class="required">*</span></label>
                <input type="text" id="name" name="name" value="${existingGroup?.name || ''}" required>
                <div class="error-message" id="nameError"></div>
            </div>

            <div class="form-group">
                <label for="description">${this.localization.localize('form.groupDescription')}</label>
                <textarea id="description" name="description" rows="3" placeholder="${this.localization.localize('form.groupDescriptionPlaceholder') || 'Введите описание группы (необязательно)'}">${existingGroup?.description || ''}</textarea>
            </div>

            <div class="form-group">
                <label>Иконка группы</label>
                <div class="icon-grid">
                    ${this.getGroupIconOptions(existingGroup?.icon)}
                </div>
                <input type="hidden" id="groupIcon" name="groupIcon" value="${existingGroup?.icon || 'folder'}">
            </div>

            <div class="form-group">
                <label>Цвет группы</label>
                <div class="color-grid">
                    ${this.getColorOptions(existingGroup?.color)}
                </div>
                <input type="hidden" id="groupColor" name="groupColor" value="${existingGroup?.color || ''}">
            </div>

            <div class="button-group">
                <button type="button" id="cancelBtn" class="btn-secondary">${this.localization.localize('button.cancel')}</button>
                <button type="submit" id="submitBtn" class="btn-primary">${isEdit ? this.localization.localize('button.update') : this.localization.localize('button.add')}</button>
            </div>
        </form>
    </div>

    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();

        // Восстанавливаем состояние формы
        const state = vscode.getState();
        if (state) {
            restoreFormData(state);
        }

        // Сохраняем состояние при изменении полей
        document.querySelectorAll('input, textarea').forEach(element => {
            element.addEventListener('input', saveFormState);
        });

        // Отправка формы
        document.getElementById('groupForm').addEventListener('submit', function(e) {
            e.preventDefault();

            if (validateForm()) {
                const formData = new FormData(this);
                const data = Object.fromEntries(formData.entries());

                vscode.postMessage({
                    type: 'submit',
                    data: data
                });

                // Очищаем сохраненное состояние
                vscode.setState(null);
            }
        });

        // Отмена
        document.getElementById('cancelBtn').addEventListener('click', function() {
            vscode.postMessage({ type: 'cancel' });
        });

        function saveFormState() {
            const formData = new FormData(document.getElementById('groupForm'));
            const data = Object.fromEntries(formData.entries());
            vscode.setState(data);
        }

        function restoreFormData(data) {
            Object.keys(data).forEach(key => {
                const element = document.querySelector('[name="' + key + '"]');
                if (element) {
                    element.value = data[key];
                }
            });
        }

        // Инициализация обработчиков событий для иконок и цветов
        document.addEventListener('DOMContentLoaded', function() {
            // Обработка выбора иконок
            document.querySelectorAll('.icon-option').forEach(option => {
                option.addEventListener('click', function() {
                    document.querySelectorAll('.icon-option').forEach(o => o.classList.remove('selected'));
                    this.classList.add('selected');
                    document.getElementById('groupIcon').value = this.dataset.icon;
                    saveFormState();
                });
            });

            // Обработка выбора цветов
            document.querySelectorAll('.color-option').forEach(option => {
                option.addEventListener('click', function() {
                    document.querySelectorAll('.color-option').forEach(o => o.classList.remove('selected'));
                    this.classList.add('selected');
                    document.getElementById('groupColor').value = this.dataset.color;
                    saveFormState();
                });
            });
        });

        function validateForm() {
            let isValid = true;

            // Очищаем предыдущие ошибки
            document.querySelectorAll('.error-message').forEach(error => {
                error.textContent = '';
            });

            // Проверяем имя группы
            const name = document.getElementById('name').value;
            if (!name.trim()) {
                document.getElementById('nameError').textContent = '${this.localization.localize('form.fieldRequired')}';
                isValid = false;
            }

            return isValid;
        }
    </script>
</body>
</html>`;
    }

    private getGroupIconOptions(selectedIcon?: string): string {
        const groupIcons = [
            { id: 'folder', name: 'Папка' },
            { id: 'folder-opened', name: 'Открытая папка' },
            { id: 'organization', name: 'Организация' },
            { id: 'package', name: 'Пакет' },
            { id: 'tag', name: 'Тег' },
            { id: 'workspace', name: 'Рабочая область' },
            { id: 'project', name: 'Проект' },
            { id: 'symbol-namespace', name: 'Пространство имён' },
            { id: 'symbol-misc', name: 'Разное' },
            { id: 'layers', name: 'Слои' },
            { id: 'group-by-ref-type', name: 'Группировка' },
            { id: 'archive', name: 'Архив' }
        ];

        return groupIcons.map(icon =>
            `<div class="icon-option ${selectedIcon === icon.id ? 'selected' : ''}" data-icon="${icon.id}">
                <div style="font-size: 16px;">$(${icon.id})</div>
                <div>${icon.name}</div>
            </div>`
        ).join('');
    }

    private getColorOptions(selectedColor?: string): string {
        const colors = [
            { id: '', color: 'transparent', name: 'По умолчанию' },
            { id: 'charts.red', color: '#ff6b6b', name: 'Красный' },
            { id: 'charts.orange', color: '#ffa726', name: 'Оранжевый' },
            { id: 'charts.yellow', color: '#ffeb3b', name: 'Жёлтый' },
            { id: 'charts.green', color: '#4caf50', name: 'Зелёный' },
            { id: 'charts.blue', color: '#2196f3', name: 'Синий' },
            { id: 'charts.purple', color: '#9c27b0', name: 'Фиолетовый' },
            { id: 'charts.pink', color: '#e91e63', name: 'Розовый' }
        ];

        return colors.map(color =>
            `<div class="color-option ${selectedColor === color.id ? 'selected' : ''}"
                  data-color="${color.id}"
                  style="background-color: ${color.color};"
                  title="${color.name}">
            </div>`
        ).join('');
    }

    private generateNonce(): string {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }
}
