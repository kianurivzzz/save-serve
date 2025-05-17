document.addEventListener('DOMContentLoaded', function () {
	// Функциональность переключения табов
	const tabButtons = document.querySelectorAll('.tab-btn');
	const tabPanes = document.querySelectorAll('.tab-pane');

	tabButtons.forEach(button => {
		button.addEventListener('click', function () {
			// Убираем активный класс со всех кнопок и панелей
			tabButtons.forEach(btn => btn.classList.remove('active'));
			tabPanes.forEach(pane => pane.classList.remove('active'));

			// Добавляем активный класс к текущей кнопке
			this.classList.add('active');

			// Находим соответствующую панель и делаем ее активной
			const targetTabId = this.getAttribute('data-tab');
			document.getElementById(targetTabId).classList.add('active');
		});
	});

	// Плавный скролл к секциям
	document.querySelectorAll('a[href^="#"]').forEach(anchor => {
		anchor.addEventListener('click', function (e) {
			e.preventDefault();

			const targetId = this.getAttribute('href');
			if (targetId === '#') return;

			const targetElement = document.querySelector(targetId);
			if (targetElement) {
				window.scrollTo({
					top: targetElement.offsetTop - 70, // -70px для учета фиксированной шапки
					behavior: 'smooth',
				});
			}
		});
	});

	// Анимация появления элементов при скролле
	function revealOnScroll() {
		const elements = document.querySelectorAll(
			'.feature-card, .step, .security-card, .group-feature'
		);

		elements.forEach(element => {
			const elementTop = element.getBoundingClientRect().top;
			const windowHeight = window.innerHeight;

			if (elementTop < windowHeight - 100) {
				element.style.opacity = '1';
				element.style.transform = 'translateY(0)';
			}
		});
	}

	// Применяем начальные стили для анимации
	document
		.querySelectorAll(
			'.feature-card, .step, .security-card, .group-feature'
		)
		.forEach(element => {
			element.style.opacity = '0';
			element.style.transform = 'translateY(20px)';
			element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
		});

	// Запускаем анимацию при загрузке и скролле
	revealOnScroll();
	window.addEventListener('scroll', revealOnScroll);

	// Эффект подсветки логотипа
	const logoImage = document.getElementById('logo-image');
	if (logoImage) {
		logoImage.addEventListener('mouseenter', () => {
			logoImage.style.filter = 'drop-shadow(0 0 5px var(--vscode-focus))';
		});

		logoImage.addEventListener('mouseleave', () => {
			logoImage.style.filter = 'none';
		});
	}

	// Работа с языковыми настройками
	const langSwitchElement = document.querySelector('.lang-switch');
	if (langSwitchElement) {
		langSwitchElement.addEventListener('click', function () {
			// При клике на переключатель сохраняем выбранный язык
			const targetLang = this.getAttribute('href').includes('index-en')
				? 'en'
				: 'ru';
			localStorage.setItem('save-serve-lang', targetLang);
		});

		// Проверяем сохраненный язык при загрузке страницы
		const savedLang = localStorage.getItem('save-serve-lang');
		const currentLang = document.documentElement.lang;

		// Если сохраненный язык отличается от текущего, перенаправляем
		if (savedLang && savedLang !== currentLang) {
			const targetPage =
				savedLang === 'en' ? 'index-en.html' : 'index.html';
			if (!window.location.href.includes(targetPage)) {
				window.location.href = targetPage;
			}
		}
	}
});
