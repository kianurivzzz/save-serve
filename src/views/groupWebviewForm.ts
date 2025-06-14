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
                async (message) => {
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
            description: data.description || undefined
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

    private generateNonce(): string {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }
}
