import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export class LocalizationService {
    private static instance: LocalizationService;
    private messages: { [key: string]: { [key: string]: string } } = {
        'ru': {},
        'en': {}
    };
    private currentLanguage: string = 'ru';
    private extensionContext?: vscode.ExtensionContext;

    private constructor() {
        // Загрузка произойдет после установки контекста
    }

    public static getInstance(): LocalizationService {
        if (!LocalizationService.instance) {
            LocalizationService.instance = new LocalizationService();
        }
        return LocalizationService.instance;
    }

    /**
     * Устанавливает контекст расширения и загружает локализации
     */
    public setExtensionContext(context: vscode.ExtensionContext): void {
        this.extensionContext = context;
        this.loadLanguages();
    }

    private loadLanguages(): void {
        try {
            // Получаем текущий язык из настроек
            this.currentLanguage = this.getCurrentLanguage();

            // Проверяем, установлен ли контекст расширения
            if (!this.extensionContext) {
                console.error('Контекст расширения не установлен');
                return;
            }

            // Получаем путь к директории расширения
            const extensionPath = this.extensionContext.extensionUri.fsPath;

            // Загружаем файлы локализации
            const ruPath = path.join(extensionPath, 'l10n', 'bundle.l10n.ru.json');
            const enPath = path.join(extensionPath, 'l10n', 'bundle.l10n.en.json');

            if (fs.existsSync(ruPath)) {
                const ruContent = fs.readFileSync(ruPath, 'utf8');
                this.messages['ru'] = JSON.parse(ruContent);
                console.log('Загружен файл русской локализации');
            } else {
                console.error('Файл русской локализации не найден:', ruPath);
            }

            if (fs.existsSync(enPath)) {
                const enContent = fs.readFileSync(enPath, 'utf8');
                this.messages['en'] = JSON.parse(enContent);
                console.log('Загружен файл английской локализации');
            } else {
                console.error('Файл английской локализации не найден:', enPath);
            }

            // Выводим отладочную информацию
            console.log(`Текущий язык: ${this.currentLanguage}`);
            console.log(`Количество ключей для текущего языка: ${Object.keys(this.messages[this.currentLanguage] || {}).length}`);
        } catch (error) {
            console.error('Ошибка при загрузке локализации:', error);
        }
    }

    /**
     * Локализует строку
     * @param key Ключ локализации
     * @param args Аргументы для подстановки в строку
     * @returns Локализованная строка
     */
    public localize(key: string, ...args: any[]): string {
        try {
            // Проверяем, есть ли ключ в текущем языке
            const lang = this.currentLanguage === 'ru' ? 'ru' : 'en';
            let message = this.messages[lang][key] || key;

            // Если ключ не найден, пробуем найти в другом языке
            if (message === key && lang === 'ru') {
                message = this.messages['en'][key] || key;
            } else if (message === key && lang === 'en') {
                message = this.messages['ru'][key] || key;
            }

            // Форматируем строку с параметрами
            return this.formatString(message, args);
        } catch (error) {
            console.error(`Ошибка локализации для ключа "${key}":`, error);
            // В случае ошибки также форматируем строку с параметрами
            return this.formatString(key, args);
        }
    }

    // Вспомогательный метод для форматирования строки с параметрами
    private formatString(message: string, args: any[]): string {
        if (!args || args.length === 0) {
            return message;
        }

        let result = message;
        for (let i = 0; i < args.length; i++) {
            const placeholder = new RegExp('\\{' + i + '\\}', 'g');
            result = result.replace(placeholder, args[i] !== undefined ? args[i].toString() : '');
        }
        return result;
    }

    /**
     * Возвращает текущий язык расширения
     * @returns Текущий язык (ru или en)
     */
    public getCurrentLanguage(): string {
        return vscode.workspace.getConfiguration('save-serve').get('language', 'ru');
    }

    /**
     * Устанавливает язык расширения
     * @param language Язык – ru или en
     */
    public async setLanguage(language: string): Promise<void> {
        await vscode.workspace.getConfiguration('save-serve').update('language', language, true);
        this.currentLanguage = language;
        // Обновляем локализацию
        this.loadLanguages();

        // Показываем сообщение на текущем языке
        const message = this.localize('info.languageChanged');
        vscode.window.showInformationMessage(message);
    }
}
