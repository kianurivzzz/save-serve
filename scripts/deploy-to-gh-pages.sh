#!/bin/bash

# Скрипт для деплоя содержимого папки landing в ветку gh-pages
# Автор: nkarasyov

# Проверяет, есть ли несохраненные изменения
if [ -n "$(git status --porcelain)" ]; then
  echo "⚠️  В рабочей директории есть несохраненные изменения. Сохраните их перед деплоем."
  exit 1
fi

# Сохраняет текущую ветку
CURRENT_BRANCH=$(git symbolic-ref --short HEAD)
echo "📌 Текущая ветка: $CURRENT_BRANCH"

# Проверяет существование папки landing
if [ ! -d "landing" ]; then
  echo "❌ Папка landing не найдена. Убедитесь, что вы запускаете скрипт из корня проекта."
  exit 1
fi

echo "🔄 Начинаем процесс деплоя..."

# Создает временную директорию
TEMP_DIR=$(mktemp -d)
echo "📁 Создана временная директория: $TEMP_DIR"

# Копирует содержимое папки landing во временную директорию
cp -r landing/* "$TEMP_DIR"
echo "📋 Файлы из папки landing скопированы во временную директорию"

# Переключается на ветку gh-pages. Создаёт ее, если она не существует
if git show-ref --verify --quiet refs/heads/gh-pages; then
  echo "🔄 Переключаемся на существующую ветку gh-pages"
  git checkout gh-pages
else
  echo "🔄 Создаем новую ветку gh-pages"
  git checkout --orphan gh-pages
  git rm -rf . > /dev/null
fi

# Очищает ветку gh-pages
echo "🗑️ Очищаем ветку gh-pages"
find . -maxdepth 1 ! -name '.git' ! -name '.' -exec rm -rf {} \;

# Копирует файлы из временной директории в корень проекта
echo "📋 Копируем файлы в корень ветки gh-pages"
cp -r "$TEMP_DIR"/* .

# Добавляет все файлы в git
echo "➕ Добавляем файлы в git"
git add .

# Коммитит изменения
echo "💾 Создаем коммит"
git commit -m "Deploy to GitHub Pages: $(date)"

# Пушит изменения на удаленный репозиторий
echo "🚀 Пушим изменения в ветку gh-pages"
git push -u origin gh-pages

# Возвращает на исходную ветку
echo "🔄 Возвращает на ветку $CURRENT_BRANCH"
git checkout "$CURRENT_BRANCH"

# Удаляеь временную директорию
echo "🗑️ Удаляем временную директорию"
rm -rf "$TEMP_DIR"

echo "✅ Деплой успешно завершен!"
echo "🌐 Сайт будет доступен по адресу: https://$(git config --get remote.origin.url | sed 's/.*github.com[:\/]\([^\/]*\/[^\/]*\).*/\1/' | sed 's/\.git$//' | sed 's/\//.github.io\//')"
echo "⚠️  Может потребоваться несколько минут для обновления сайта."
echo ""
echo "📝 Не забудь активировать GitHub Pages в настройках репозитория:"
echo "   1. Открой настройки репозитория на GitHub"
echo "   2. Перейди в раздел 'Pages'"
echo "   3. В разделе 'Build and deployment' выбери 'Deploy from a branch'"
echo "   4. Выберите ветку 'gh-pages' и папку '/ (root)'"
echo "   5. Нажмите 'Save'"
