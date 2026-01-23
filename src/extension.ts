import * as vscode from 'vscode'
import { Server } from './models/serverModel'
import { LocalizationService } from './services/localizationService'
import { ServerService } from './services/serverService'
import { SshService } from './services/sshService'
import { GroupForm } from './views/groupForm'
import { GroupWebviewForm } from './views/groupWebviewForm'
import { ServerForm } from './views/serverForm'
import {
	GroupTreeItem,
	ServerTreeItem,
	ServerTreeProvider,
	UngroupedServersItem
} from './views/serverTreeProvider'
import { ServerWebviewForm } from './views/serverWebviewForm'

interface ServerTreeItemLike {
	server: Server
}

interface CommandArgumentsLike {
	command?: { arguments?: Server[] }
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated

	// Инициализация локализации
	const localization = LocalizationService.getInstance()
	localization.setExtensionContext(context)

	// Получаем текущий язык и применяем его
	const language = localization.getCurrentLanguage()
	vscode.commands.executeCommand('setContext', 'save-serve.language', language)

	console.log(
		'Расширение активировано:',
		localization.localize('log.extensionActivated')
	)

	// Инициализация сервисов
	const serverService = new ServerService(context)
	const sshService = new SshService()

	// Создаем как старые, так и новые формы для возможности переключения
	const serverForm = new ServerForm(serverService)
	const groupForm = new GroupForm(serverService)
	const serverWebviewForm = new ServerWebviewForm(serverService, context)
	const groupWebviewForm = new GroupWebviewForm(serverService, context)

	// Регистрация представления серверов
	const serverTreeProvider = new ServerTreeProvider(serverService)
	const serversView = vscode.window.createTreeView('saveServeServers', {
		treeDataProvider: serverTreeProvider,
		showCollapseAll: false
	})
	context.subscriptions.push(serversView)

	// Добавляем прослушивание изменений конфигурации для обновления языка
	context.subscriptions.push(
		vscode.workspace.onDidChangeConfiguration((e) => {
			if (e.affectsConfiguration('save-serve.language')) {
				// Обновляем язык во всех компонентах UI
				const newLanguage = localization.getCurrentLanguage()
				vscode.commands.executeCommand(
					'setContext',
					'save-serve.language',
					newLanguage
				)
				// Обновляем дерево серверов для перерисовки с новым языком
				serverTreeProvider.refresh()
			}
		})
	)

	// Регистрация команд для работы с серверами
	context.subscriptions.push(
		vscode.commands.registerCommand(
			'save-serve.addServer',
			async (item?: GroupTreeItem | UngroupedServersItem) => {
				console.log(localization.localize('log.addServerCommand'))

				// Используем новую webview-форму вместо старой последовательности диалогов
				const server = await serverWebviewForm.showAddServerWebview()

				// Если есть элемент и команда была вызвана на группе, добавляем сервер в эту группу
				if (server && item instanceof GroupTreeItem) {
					await serverService.moveServerToGroup(server.id, item.group.id)
				} else if (server && item instanceof UngroupedServersItem) {
					// Если это "Без группы", оставляем сервер без группы
					await serverService.moveServerToGroup(server.id, undefined)
				}

				serverTreeProvider.refresh()
			}
		),

		vscode.commands.registerCommand(
			'save-serve.editServer',
			async (item: ServerTreeItem) => {
				console.log(
					localization.localize('log.editServerCommand', item?.server?.id)
				)
				if (!item || !item.server) {
					console.error('Ошибка – не передан сервер для редактирования')
					vscode.window.showErrorMessage(
						localization.localize('error.cannotEdit')
					)
					return
				}
				// Используем новую webview-форму для редактирования
				await serverWebviewForm.showEditServerWebview(item.server)
				serverTreeProvider.refresh()
			}
		),

		vscode.commands.registerCommand(
			'save-serve.deleteServer',
			async (item: ServerTreeItem) => {
				console.log(
					localization.localize('log.deleteServerCommand', item?.server?.id)
				)
				if (!item || !item.server) {
					console.error('Ошибка – не передан сервер для удаления')
					vscode.window.showErrorMessage(
						localization.localize('error.cannotDelete')
					)
					return
				}

				const confirm = await vscode.window.showWarningMessage(
					localization.localize('warning.confirmDelete', item.server.name),
					{ modal: true },
					localization.localize('button.yes'),
					localization.localize('button.no')
				)

				if (confirm === localization.localize('button.yes')) {
					await serverService.deleteServer(item.server.id)
					serverTreeProvider.refresh()
					vscode.window.showInformationMessage(
						localization.localize('info.serverDeleted', item.server.name)
					)
				}
			}
		),

		vscode.commands.registerCommand(
			'save-serve.connectToServer',
			async (server: Server) => {
				console.log(localization.localize('log.connectServerCommand'))

				// Подробно логируем полученный объект для отладки
				console.log('Тип полученного объекта:', typeof server)
				console.log('Полученный объект:', server)

				// Проверяем разные форматы объекта
				if (!server) {
					console.error('Ошибка – не передан сервер для подключения')
					vscode.window.showErrorMessage(
						localization.localize('error.cannotConnect')
					)
					return
				}

				if ('server' in server) {
					console.log('Получен объект ServerTreeItem, извлекаем Server')
					server = (server as ServerTreeItemLike).server
				}

				if (
					'command' in server &&
					Array.isArray(
						(server as unknown as CommandArgumentsLike).command?.arguments
					)
				) {
					console.log(
						'Получен объект с аргументами команды, извлекаем Server из аргументов'
					)
					const args = (server as unknown as CommandArgumentsLike).command
						?.arguments
					if (args && args.length > 0) {
						server = args[0]
					}
				}

				console.log('Объект сервера после обработки:', server)

				// Дополнительная проверка полей сервера
				if (!server || !server.host || !server.username) {
					console.error(
						'Ошибка: не заполнены обязательные поля сервера',
						JSON.stringify(server, null, 2)
					)
					vscode.window.showErrorMessage(
						localization.localize('error.requiredFields')
					)
					return
				}

				try {
					await sshService.connectToServer(server)
					vscode.window.showInformationMessage(
						localization.localize(
							'info.connectionSuccess',
							server.name,
							server.username,
							server.host
						)
					)
				} catch (error) {
					console.error('Ошибка при подключении:', error)
					vscode.window.showErrorMessage(
						localization.localize(
							'error.connectionError',
							error instanceof Error ? error.message : String(error)
						)
					)
				}
			}
		),

		vscode.commands.registerCommand('save-serve.refreshServers', () => {
			console.log(localization.localize('log.refreshServersCommand'))
			serverTreeProvider.refresh()
		}),

		// Добавляем команду для смены языка
		vscode.commands.registerCommand('save-serve.changeLanguage', async () => {
			const currentLanguage = localization.getCurrentLanguage()
			const newLanguage = currentLanguage === 'ru' ? 'en' : 'ru'
			await localization.setLanguage(newLanguage)
			// Для применения новых параметров локализации пользователю нужно перезагрузить расширение
			const reload = await vscode.window.showInformationMessage(
				localization.localize('info.reloadRequired'),
				localization.localize('button.reload')
			)
			if (reload) {
				await vscode.commands.executeCommand('workbench.action.reloadWindow')
			}
		}),

		// Регистрация команды для пожертвований
		vscode.commands.registerCommand('save-serve.donate', async () => {
			console.log(localization.localize('log.donateCommand'))

			const options = ['BuyMeACoffee', 'CloudTips']

			const selectedOption = await vscode.window.showQuickPick(options, {
				placeHolder: localization.localize('donate.chooseDonationService')
			})

			if (selectedOption) {
				let url = ''
				if (selectedOption === 'BuyMeACoffee') {
					url = 'https://www.buymeacoffee.com/nkarasyov'
				} else if (selectedOption === 'CloudTips') {
					url = 'https://pay.cloudtips.ru/p/920f6d9e'
				}

				if (url) {
					vscode.env.openExternal(vscode.Uri.parse(url))
				}
			}
		}),

		vscode.commands.registerCommand('save-serve.quickConnect', async () => {
			console.log('Запущена команда быстрого подключения')

			const servers = await serverService.getServers()
			if (servers.length === 0) {
				vscode.window.showInformationMessage(
					localization.localize('info.noServers')
				)
				return
			}

			// Получаем группы заранее
			const groups = await serverService.getGroups()

			// Создаем список для QuickPick
			const serverItems = servers.map((server) => {
				const group = server.groupId
					? groups.find((g) => g.id === server.groupId)
					: null
				return {
					label: `$(server) ${server.name}`,
					description: `${server.username}@${server.host}:${server.port}`,
					detail: group ? `Группа: ${group.name}` : 'Без группы',
					server: server
				}
			})

			const selectedItem = await vscode.window.showQuickPick(serverItems, {
				placeHolder: localization.localize('quickConnect.selectServer'),
				matchOnDescription: true,
				matchOnDetail: true
			})

			if (selectedItem) {
				try {
					await sshService.connectToServer(selectedItem.server)
					vscode.window.showInformationMessage(
						localization.localize(
							'info.connectionSuccess',
							selectedItem.server.name,
							selectedItem.server.username,
							selectedItem.server.host
						)
					)
				} catch (error) {
					console.error('Ошибка при подключении:', error)
					vscode.window.showErrorMessage(
						localization.localize(
							'error.connectionError',
							error instanceof Error ? error.message : String(error)
						)
					)
				}
			}
		}),

		vscode.commands.registerCommand(
			'save-serve.duplicateServer',
			async (item: ServerTreeItem) => {
				console.log('Запущена команда дублирования сервера')
				if (!item || !item.server) {
					vscode.window.showErrorMessage(
						localization.localize('error.cannotDuplicate')
					)
					return
				}

				const originalServer = item.server
				const duplicatedServerData = {
					...originalServer,
					name: `${originalServer.name} (копия)`,
					id: undefined
				}

				try {
					await serverService.addServer(duplicatedServerData)
					serverTreeProvider.refresh()
					vscode.window.showInformationMessage(
						localization.localize('info.serverDuplicated', originalServer.name)
					)
				} catch (error) {
					console.error('Ошибка при дублировании сервера:', error)
					vscode.window.showErrorMessage(
						localization.localize(
							'error.duplicateError',
							error instanceof Error ? error.message : String(error)
						)
					)
				}
			}
		),

		vscode.commands.registerCommand(
			'save-serve.exportServer',
			async (item: ServerTreeItem) => {
				console.log('Запущена команда экспорта сервера')
				if (!item || !item.server) {
					vscode.window.showErrorMessage(
						localization.localize('error.cannotExport')
					)
					return
				}

				const server = item.server
				const exportData = {
					name: server.name,
					host: server.host,
					port: server.port,
					username: server.username,
					usePrivateKey: server.usePrivateKey,
					privateKeyPath: server.privateKeyPath,
					icon: server.icon,
					color: server.color,
					groupId: server.groupId
				}

				const jsonString = JSON.stringify(exportData, null, 2)

				try {
					await vscode.env.clipboard.writeText(jsonString)
					vscode.window.showInformationMessage(
						localization.localize('info.serverExported', server.name)
					)
				} catch (error) {
					console.error('Ошибка при экспорте сервера:', error)
					vscode.window.showErrorMessage(
						localization.localize(
							'error.exportError',
							error instanceof Error ? error.message : String(error)
						)
					)
				}
			}
		),

		vscode.commands.registerCommand(
			'save-serve.moveToGroup',
			async (item: ServerTreeItem) => {
				console.log('Запущена команда перемещения сервера')
				if (!item || !item.server) {
					vscode.window.showErrorMessage(
						localization.localize('error.cannotMove')
					)
					return
				}

				const server = item.server
				const groups = await serverService.getGroups()

				const groupItems = [
					{
						label: `$(folder-opened) ${localization.localize('form.noGroup')}`,
						description: localization.localize('moveToGroup.removeFromGroup'),
						groupId: undefined
					},
					...groups.map((group) => ({
						label: `$(folder) ${group.name}`,
						description: group.description || '',
						groupId: group.id
					}))
				]

				const selectedItem = await vscode.window.showQuickPick(groupItems, {
					placeHolder: localization.localize(
						'moveToGroup.selectGroup',
						server.name
					),
					matchOnDescription: true
				})

				if (selectedItem) {
					try {
						await serverService.moveServerToGroup(
							server.id,
							selectedItem.groupId
						)
						serverTreeProvider.refresh()
						const groupName = selectedItem.groupId
							? groups.find((g) => g.id === selectedItem.groupId)?.name ||
								localization.localize('form.noGroup')
							: localization.localize('form.noGroup')
						vscode.window.showInformationMessage(
							localization.localize('info.serverMoved', server.name, groupName)
						)
					} catch (error) {
						console.error('Ошибка при перемещении сервера:', error)
						vscode.window.showErrorMessage(
							localization.localize(
								'error.moveError',
								error instanceof Error ? error.message : String(error)
							)
						)
					}
				}
			}
		)
	)

	// Регистрация команд для работы с группами
	context.subscriptions.push(
		vscode.commands.registerCommand('save-serve.addGroup', async () => {
			console.log(localization.localize('log.addGroupCommand'))
			await groupForm.showAddGroupForm()
			serverTreeProvider.refresh()
		}),

		vscode.commands.registerCommand(
			'save-serve.editGroup',
			async (item: GroupTreeItem) => {
				console.log(
					localization.localize('log.editGroupCommand', item?.group?.id)
				)
				if (!item || !item.group) {
					console.error('Ошибка – не передана группа для редактирования')
					vscode.window.showErrorMessage(
						localization.localize('error.cannotEditGroup')
					)
					return
				}
				await groupForm.showEditGroupForm(item.group)
				serverTreeProvider.refresh()
			}
		),

		vscode.commands.registerCommand(
			'save-serve.deleteGroup',
			async (item: GroupTreeItem) => {
				console.log(
					localization.localize('log.deleteGroupCommand', item?.group?.id)
				)
				if (!item || !item.group) {
					console.error('Ошибка – не передана группа для удаления')
					vscode.window.showErrorMessage(
						localization.localize('error.cannotDeleteGroup')
					)
					return
				}

				// Получаем серверы в группе, чтобы определить, есть ли они
				const serversInGroup = await serverService.getServersInGroup(
					item.group.id
				)

				if (serversInGroup.length > 0) {
					// Если есть серверы, спрашиваем, что с ними делать
					const confirm = await vscode.window.showWarningMessage(
						localization.localize(
							'warning.confirmDeleteGroupWithServers',
							item.group.name
						),
						{ modal: true },
						localization.localize('button.deleteServers'),
						localization.localize('button.keepServers'),
						localization.localize('button.no')
					)

					if (confirm === localization.localize('button.deleteServers')) {
						// Удаляем группу вместе с серверами
						await serverService.deleteGroup(item.group.id, true)
						serverTreeProvider.refresh()
						vscode.window.showInformationMessage(
							localization.localize('info.groupDeleted', item.group.name)
						)
					} else if (confirm === localization.localize('button.keepServers')) {
						// Сохраняем серверы, но удаляем группу
						await serverService.deleteGroup(item.group.id, false)
						serverTreeProvider.refresh()
						vscode.window.showInformationMessage(
							localization.localize('info.groupDeleted', item.group.name)
						)
					}
				} else {
					// Если нет серверов, просто спрашиваем о подтверждении
					const confirm = await vscode.window.showWarningMessage(
						localization.localize(
							'warning.confirmDeleteGroup',
							item.group.name
						),
						{ modal: true },
						localization.localize('button.yes'),
						localization.localize('button.no')
					)

					if (confirm === localization.localize('button.yes')) {
						await serverService.deleteGroup(item.group.id)
						serverTreeProvider.refresh()
						vscode.window.showInformationMessage(
							localization.localize('info.groupDeleted', item.group.name)
						)
					}
				}
			}
		)
	)
}

// This method is called when your extension is deactivated
export function deactivate() {
	const localization = LocalizationService.getInstance()
	console.log(localization.localize('log.extensionDeactivated'))
}
