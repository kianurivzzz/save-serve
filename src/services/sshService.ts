import * as crypto from 'crypto'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import * as vscode from 'vscode'
import { Server } from '../models/serverModel'

export class SshService {
	public async connectToServer(server: Server): Promise<void> {
		try {
			console.log('Подключение к серверу:', JSON.stringify(server, null, 2))

			// Проверяет, что все поля имеют значения
			if (!server || !server.host || !server.username) {
				throw new Error(
					'Не указаны обязательные параметры подключения. Хост или имя пользователя'
				)
			}

			// Создает терминал для подключения
			const terminal = vscode.window.createTerminal(`SSH: ${server.name}`)
			terminal.show()

			// Если используется пароль, подключается через скрипт автоматизации
			if (!server.usePrivateKey && server.password) {
				await this.connectWithPassword(terminal, server)
			}
			// Если используется ключ, подключается обычным способом
			else {
				await this.connectWithKey(terminal, server)
			}
		} catch (error) {
			console.error('Ошибка при подключении к серверу:', error)
			vscode.window.showErrorMessage(
				`Ошибка при подключении к серверу: ${error instanceof Error ? error.message : String(error)}`
			)
		}
	}

	/**
	 * Подключение с использованием пароля
	 */
	private async connectWithPassword(
		terminal: vscode.Terminal,
		server: Server
	): Promise<void> {
		const host = server.host
		const port = server.port || 22
		const username = server.username
		const password = server.password || ''

		// Информирует пользователя без лишних подробностей
		terminal.sendText(`echo "Подключение к ${server.name}..."`)

		// Определяет платформу для правильного выбора метода автоматизации
		const platform = os.platform()

		// На macOS и Linux можно использовать "expect" через AppleScript или "script"
		if (platform === 'darwin') {
			// На macOS используем AppleScript для надёжного ввода пароля
			await this.connectWithMacOSMethod(terminal, server)
		} else if (platform === 'linux') {
			// На Linux пробует использовать sshpass если установлен
			await this.connectWithLinuxMethod(terminal, server)
		} else if (platform === 'win32') {
			// На Windows используется PowerShell
			await this.connectWithWindowsMethod(terminal, server)
		} else {
			// Для неизвестных платформ просто показывается пароль
			terminal.sendText(`echo "Пароль для SSH: ${password}"`)

			// Формирует SSH команду
			let sshCommand = 'ssh'
			if (port !== 22) {
				sshCommand += ` -p ${port}`
			}
			sshCommand += ` -o StrictHostKeyChecking=no ${username}@${host}`

			terminal.sendText(sshCommand)
		}
	}

	private async connectWithMacOSMethod(
		terminal: vscode.Terminal,
		server: Server
	): Promise<void> {
		const port = server.port || 22
		const password = server.password || ''

		const sshCommand = this.buildSshCommand(server.host, port, server.username)
		const sessionId = crypto.randomBytes(8).toString('hex')
		const expectScriptPath = path.join(os.tmpdir(), `ss_expect_${sessionId}`)
		const expectScript = this.generateExpectScript(sshCommand, password, false)

		await this.executeExpectScript(
			terminal,
			expectScriptPath,
			expectScript,
			sshCommand,
			10000
		)
	}

	private async connectWithLinuxMethod(
		terminal: vscode.Terminal,
		server: Server
	): Promise<void> {
		const port = server.port || 22
		const password = server.password || ''

		const sshCommand = this.buildSshCommand(server.host, port, server.username)

		terminal.sendText(`if command -v sshpass >/dev/null 2>&1; then`)
		terminal.sendText(`  sshpass -p "${password}" ${sshCommand}`)
		terminal.sendText(`else`)

		const sessionId = crypto.randomBytes(8).toString('hex')
		const expectScriptPath = path.join(os.tmpdir(), `ss_expect_${sessionId}`)
		const expectScript = this.generateExpectScript(sshCommand, password, false)

		try {
			await fs.promises.writeFile(expectScriptPath, expectScript, {
				mode: 0o700
			})
			terminal.sendText(`  if command -v expect >/dev/null 2>&1; then`)
			terminal.sendText(`    "${expectScriptPath}"`)
			terminal.sendText(`  else`)
			terminal.sendText(`    ${sshCommand}`)
			terminal.sendText(`  fi`)

			setTimeout(() => {
				try {
					fs.unlinkSync(expectScriptPath)
				} catch (error) {
					console.log('Ошибка при удалении временного файла:', error)
				}
			}, 5000)
		} catch (error) {
			console.error('Ошибка при создании expect скрипта:', error)
			terminal.sendText(`  ${sshCommand}`)
		}

		terminal.sendText(`fi`)
	}

	/**
	 * Метод подключения для Windows
	 */
	private async connectWithWindowsMethod(
		terminal: vscode.Terminal,
		server: Server
	): Promise<void> {
		const host = server.host
		const port = server.port || 22
		const username = server.username
		const password = server.password || ''

		// Создаём уникальные имена файлов
		const sessionId = crypto.randomBytes(8).toString('hex')
		const tmpDir = os.tmpdir()
		const pwdFilePath = path.join(tmpDir, `ss_pwd_${sessionId}.txt`)
		const batScriptPath = path.join(tmpDir, `ss_connect_${sessionId}.bat`)

		try {
			// Создаём временный файл с паролем
			await fs.promises.writeFile(pwdFilePath, password)

			// Создаём batch скрипт для скрытой передачи пароля
			const batScriptContent = `@echo off
echo Подключение к ${server.name}...

rem Создаём временную переменную с паролем
for /f "delims=" %%i in ('type "${pwdFilePath}"') do set "SSH_PASSWORD=%%i"

rem Удаляем файл с паролем сразу после чтения
del /q "${pwdFilePath}" 2>nul

rem Используем echo для передачи пароля в SSH через pipe
echo %SSH_PASSWORD% | ssh ${port !== 22 ? `-p ${port} ` : ''}-o StrictHostKeyChecking=no -o PasswordAuthentication=yes ${username}@${host}

rem Если SSH завершился неудачно, попробуем ещё раз интерактивно
if %ERRORLEVEL% neq 0 (
    echo Повторная попытка подключения...
    ssh ${port !== 22 ? `-p ${port} ` : ''}-o StrictHostKeyChecking=no ${username}@${host}
)

rem Очищаем переменную с паролем
set "SSH_PASSWORD="

rem Удаляем этот скрипт
del /q "${batScriptPath}" 2>nul
`

			// Записываем batch скрипт
			await fs.promises.writeFile(batScriptPath, batScriptContent)

			// Запускаем скрипт
			terminal.sendText(`call "${batScriptPath}"`)

			// Резервная очистка временных файлов
			setTimeout(() => {
				try {
					if (fs.existsSync(pwdFilePath)) {
						fs.unlinkSync(pwdFilePath)
					}
					if (fs.existsSync(batScriptPath)) {
						fs.unlinkSync(batScriptPath)
					}
					console.log('Временные файлы очищены')
				} catch (error) {
					console.log('Предупреждение при очистке файлов:', error)
				}
			}, 10000)
		} catch (error) {
			console.error('Ошибка при создании Windows SSH скрипта:', error)

			// Fallback - обычное SSH подключение
			terminal.sendText(
				`ssh ${port !== 22 ? `-p ${port} ` : ''}-o StrictHostKeyChecking=no ${username}@${host}`
			)
		}
	}

	private buildSshCommand(
		host: string,
		port: number,
		username: string,
		keyPath?: string
	): string {
		let cmd = 'ssh'
		if (port !== 22) {
			cmd += ` -p ${port}`
		}
		if (keyPath) {
			cmd += ` -i "${keyPath}"`
		}
		cmd += ` -o StrictHostKeyChecking=no ${username}@${host}`
		return cmd
	}

	private generateExpectScript(
		sshCommand: string,
		secret: string,
		isPassphrase: boolean = false
	): string {
		const timeout = isPassphrase ? 30 : 60
		const secretPatterns = isPassphrase
			? `    "passphrase" { send "${secret}\\r" }
    "Enter passphrase" { send "${secret}\\r" }
    "Введите парольную фразу" { send "${secret}\\r" }`
			: `    "password:" { send "${secret}\\r" }
    "Password:" { send "${secret}\\r" }
    "пароль:" { send "${secret}\\r" }
    "Пароль:" { send "${secret}\\r" }`

		return `#!/usr/bin/expect -f
set timeout ${timeout}
spawn ${sshCommand}
expect {
    "yes/no" { send "yes\\r"; exp_continue }
${secretPatterns}
    timeout { exit 1 }
    eof { exit 1 }
}
interact
`
	}

	private async executeExpectScript(
		terminal: vscode.Terminal,
		scriptPath: string,
		scriptContent: string,
		fallbackCommand: string,
		cleanupDelay: number = 5000
	): Promise<void> {
		try {
			await fs.promises.writeFile(scriptPath, scriptContent, { mode: 0o700 })

			terminal.sendText(`if command -v expect >/dev/null 2>&1; then`)
			terminal.sendText(`  chmod +x "${scriptPath}" && "${scriptPath}"`)
			terminal.sendText(`else`)
			terminal.sendText(`  ${fallbackCommand}`)
			terminal.sendText(`fi`)

			setTimeout(() => {
				try {
					fs.unlinkSync(scriptPath)
				} catch (error) {
					console.log('Ошибка при удалении временного файла:', error)
				}
			}, cleanupDelay)
		} catch (error) {
			console.error('Ошибка при создании expect скрипта:', error)
			terminal.sendText(fallbackCommand)
		}
	}

	private async connectWithKey(
		terminal: vscode.Terminal,
		server: Server
	): Promise<void> {
		const port = server.port || 22
		let keyPath = server.privateKeyPath || ''

		if (keyPath.endsWith('.pub')) {
			keyPath = keyPath.substring(0, keyPath.length - 4)
			console.log(`Исправлен путь к ключу: ${keyPath}`)
		}

		const sshCommand = this.buildSshCommand(
			server.host,
			port,
			server.username,
			keyPath
		)

		if (server.usePrivateKey && server.privateKeyPassword) {
			const sessionId = crypto.randomBytes(8).toString('hex')
			const expectScriptPath = path.join(os.tmpdir(), `ss_key_${sessionId}`)
			const expectScript = this.generateExpectScript(
				sshCommand,
				server.privateKeyPassword,
				true
			)

			await this.executeExpectScript(
				terminal,
				expectScriptPath,
				expectScript,
				sshCommand
			)
		} else {
			terminal.sendText(sshCommand)
		}
	}
}
