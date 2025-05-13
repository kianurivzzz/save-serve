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
            const defaultPath = path.join(extensionPath, 'l10n', 'bundle.l10n.json');

            // Сначала загружаем базовый файл локализации, который будет использоваться как запасной вариант
            if (fs.existsSync(defaultPath)) {
                const defaultContent = fs.readFileSync(defaultPath, 'utf8');
                const defaultMessages = JSON.parse(defaultContent);
                // Добавляем базовые сообщения в обе локализации для обеспечения отказоустойчивости
                this.messages['ru'] = { ...defaultMessages };
                this.messages['en'] = { ...defaultMessages };
                console.log('Загружен базовый файл локализации');
            } else {
                console.error('Базовый файл локализации не найден:', defaultPath);
            }

            if (fs.existsSync(ruPath)) {
                const ruContent = fs.readFileSync(ruPath, 'utf8');
                this.messages['ru'] = { ...this.messages['ru'], ...JSON.parse(ruContent) };
                console.log('Загружен файл русской локализации');
            } else {
                console.error('Файл русской локализации не найден:', ruPath);
            }

            if (fs.existsSync(enPath)) {
                const enContent = fs.readFileSync(enPath, 'utf8');
                this.messages['en'] = { ...this.messages['en'], ...JSON.parse(enContent) };
                console.log('Загружен файл английской локализации');
            } else {
                console.error('Файл английской локализации не найден:', enPath);
            }

            // Выводим отладочную информацию
            console.log(`Текущий язык: ${this.currentLanguage}`);
            console.log(`Количество ключей для ru: ${Object.keys(this.messages['ru'] || {}).length}`);
            console.log(`Количество ключей для en: ${Object.keys(this.messages['en'] || {}).length}`);

            // Установка контекста для VS Code, чтобы UI компоненты тоже знали о текущем языке
            vscode.commands.executeCommand('setContext', 'save-serve.language', this.currentLanguage);
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
            // Проверяем наличие ключа в текущем языке
            let lang = this.currentLanguage;

            // Если текущий язык не ru и не en, используем en как запасной вариант
            if (lang !== 'ru' && lang !== 'en') {
                lang = 'en';
            }

            let message = this.messages[lang][key];

            // Если ключ не найден в текущем языке, ищем в другом языке
            if (!message && lang === 'ru') {
                message = this.messages['en'][key];
            } else if (!message && lang === 'en') {
                message = this.messages['ru'][key];
            }

            // Если ключ не найден ни в одном языке, возвращаем сам ключ
            if (!message) {
                console.warn(`Ключ локализации не найден: ${key}`);
                return this.formatString(key, args);
            }

            // Форматируем строку с параметрами
            return this.formatString(message, args);
        } catch (error) {
            console.error(`Ошибка локализации для ключа "${key}":`, error);
            // В случае ошибки возвращаем ключ
            return key;
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
        const language = vscode.workspace.getConfiguration('save-serve').get('language');

        // Проверяем, что значение языка допустимое
        if (language === 'ru' || language === 'en') {
            return language;
        }

        // Если значение не установлено или недопустимое, используем язык интерфейса VS Code
        const vscodeLanguage = vscode.env.language;
        if (vscodeLanguage.startsWith('ru')) {
            return 'ru';
        }

        // По умолчанию используем английский
        return 'en';
    }

    /**
     * Устанавливает язык расширения
     * @param language Язык – ru или en
     */
    public async setLanguage(language: string): Promise<void> {
        if (language !== 'ru' && language !== 'en') {
            console.error(`Недопустимый язык: ${language}`);
            return;
        }

        await vscode.workspace.getConfiguration('save-serve').update('language', language, true);
        this.currentLanguage = language;
        // Обновляем локализацию
        this.loadLanguages();

        // Показываем сообщение на текущем языке
        const message = this.localize('info.languageChanged');
        vscode.window.showInformationMessage(message);
    }
}
