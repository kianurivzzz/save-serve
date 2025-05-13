import * as vscode from 'vscode';
import { ServerGroup } from '../models/serverModel';
import { LocalizationService } from '../services/localizationService';
import { ServerService } from '../services/serverService';

export class GroupForm {
    private localization = LocalizationService.getInstance();

    constructor(private serverService: ServerService) {}

    async showAddGroupForm(): Promise<ServerGroup | undefined> {
        try {
            console.log(this.localization.localize('log.addGroupCommand'));
            const groupData = await this.collectGroupInfo();
            if (groupData) {
                console.log('Данные группы собраны:', JSON.stringify(groupData, null, 2));
                const newGroup = await this.serverService.addGroup(groupData.name, groupData.description);
                vscode.window.showInformationMessage(this.localization.localize('form.groupAdded', groupData.name));
                return newGroup;
            } else {
                console.log('Добавление группы отменено');
                return undefined;
            }
        } catch (error) {
            console.error('Ошибка при добавлении группы:', error);
            vscode.window.showErrorMessage(this.localization.localize('form.groupAddError', error instanceof Error ? error.message : String(error)));
            return undefined;
        }
    }

    async showEditGroupForm(groupToEdit: ServerGroup): Promise<ServerGroup | undefined> {
        try {
            console.log(this.localization.localize('log.editGroupCommand', groupToEdit.id));
            const groupData = await this.collectGroupInfo(groupToEdit);
            if (groupData) {
                console.log('Данные группы обновлены:', JSON.stringify(groupData, null, 2));
                const updatedGroup: ServerGroup = { ...groupData, id: groupToEdit.id };
                await this.serverService.updateGroup(updatedGroup);
                vscode.window.showInformationMessage(this.localization.localize('form.groupUpdated', groupData.name));
                return updatedGroup;
            } else {
                console.log('Редактирование группы отменено');
                return undefined;
            }
        } catch (error) {
            console.error('Ошибка при обновлении группы:', error);
            vscode.window.showErrorMessage(this.localization.localize('form.groupUpdateError', error instanceof Error ? error.message : String(error)));
            return undefined;
        }
    }

    private async collectGroupInfo(existingGroup?: ServerGroup): Promise<Omit<ServerGroup, 'id'> | undefined> {
        // Имя группы
        const name = await vscode.window.showInputBox({
            prompt: this.localization.localize('form.newGroupName'),
            value: existingGroup?.name || '',
            validateInput: (value: string) => value ? null : this.localization.localize('form.groupNameValidation')
        });
        if (name === undefined) {
            return undefined;
        }

        // Описание группы (необязательное)
        const description = await vscode.window.showInputBox({
            prompt: this.localization.localize('form.groupDescription'),
            value: existingGroup?.description || ''
        });
        if (description === undefined) {
            return undefined;
        }

        return {
            name,
            description: description || undefined
        };
    }
}
