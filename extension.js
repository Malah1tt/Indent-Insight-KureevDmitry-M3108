
const vscode = require('vscode');
const path = require('path');

// Цвета для подсветки уровней вложенности
const colors = [
    [255, 100, 100],
    [100, 200, 255],
    [130, 255, 150],
    [255, 200, 100]
];

// Количество пробелов на один уровень вложенности
const INDENT_SIZE = 4;

// Порог глубокой вложенности
const DEEP_LEVEL = 3;

// Прозрачность обычной и активной подсветки
const NORMAL_OPACITY = 0.15;
const FOCUS_OPACITY = 0.65;

// Создание цвета в формате RGBA
function makeColor(rgb, opacity) {
    return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${opacity})`;
}

// Определение уровня вложенности строки
function getIndentLevel(text) {
    // Поиск пробелов в начале строки
    const match = text.match(/^ */);
    const spaces = match[0].length;

    // Деление количества пробелов на размер отступа
    return Math.floor(spaces / INDENT_SIZE);
}

// Анализ статистики открытого документа
function analyzeDocument(document) {
    const distribution = [];
    let totalLines = 0;
    let maxDepth = 0;
    let deepLines = 0;

    // Перебор всех строк документа
    for (let i = 0; i < document.lineCount; i++) {
        const text = document.lineAt(i).text;

        // Пропуск пустых строк
        if (text.trim().length === 0) {
            continue;
        }

        // Определение уровня вложенности строки
        const level = getIndentLevel(text);

        // Увеличение общего количества непустых строк
        totalLines++;

        // Подсчёт количества строк на каждом уровне
        distribution[level] = (distribution[level] || 0) + 1;

        // Определение максимальной глубины вложенности
        if (level > maxDepth) {
            maxDepth = level;
        }

        // Подсчёт строк с глубокой вложенностью
        if (level > DEEP_LEVEL) {
            deepLines++;
        }
    }

    // Возвращение результатов анализа
    return {
        totalLines,
        maxDepth,
        deepLines,
        distribution
    };
}

// Экранирование специальных символов для HTML
function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Создание HTML-страницы со статистикой и графиками
function createStatisticsHtml(document) {
    // Получение статистики документа
    const stats = analyzeDocument(document);

    // Количество строк с обычной вложенностью
    const normalLines = stats.totalLines - stats.deepLines;

    // Вычисление процента глубоких строк
    const deepPercent = stats.totalLines === 0
        ? 0
        : (stats.deepLines / stats.totalLines) * 100;

    // Максимальное количество строк на одном уровне
    const maxCount = Math.max(
        1,
        ...stats.distribution.map(value => value || 0)
    );

    // Формирование столбчатой диаграммы
    let bars = '';

    for (let level = 0; level <= stats.maxDepth; level++) {
        const count = stats.distribution[level] || 0;

        // Ширина столбца относительно максимального значения
        const width = (count / maxCount) * 100;

        // Создание HTML-элемента для каждого уровня
        bars += `
            <div class="bar-row">
                <div class="level">Уровень ${level}</div>
                <div class="bar-track">
                    <div class="bar" style="width: ${width}%"></div>
                </div>
                <div class="count">${count}</div>
            </div>
        `;
    }

    // Получение имени анализируемого файла
    const fileName = escapeHtml(
        path.basename(document.fileName)
    );

    // Возвращение HTML-страницы
    return `
    <!DOCTYPE html>
    <html lang="ru">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport"
              content="width=device-width, initial-scale=1.0">

        <meta http-equiv="Content-Security-Policy"
              content="default-src 'none'; style-src 'unsafe-inline';">

        <title>Indent Insight Statistics</title>

        <style>
            /* Основное оформление страницы */
            body {
                font-family: var(--vscode-font-family);
                color: var(--vscode-foreground);
                background: var(--vscode-editor-background);
                padding: 25px;
            }

            h1 {
                margin-bottom: 5px;
            }

            h2 {
                margin-top: 35px;
                font-size: 18px;
            }

            .subtitle {
                color: var(--vscode-descriptionForeground);
                margin-bottom: 25px;
            }

            /* Карточки с числовыми показателями */
            .cards {
                display: flex;
                flex-wrap: wrap;
                gap: 15px;
            }

            .card {
                background: var(--vscode-editorWidget-background);
                border: 1px solid var(--vscode-panel-border);
                border-radius: 10px;
                padding: 20px;
                flex: 1;
                min-width: 120px;
                text-align: center;
            }

            .number {
                font-size: 32px;
                font-weight: bold;
                color: #64c8ff;
            }

            .label {
                margin-top: 8px;
                font-size: 13px;
            }

            /* Столбчатая диаграмма */
            .bar-row {
                display: flex;
                align-items: center;
                gap: 12px;
                margin: 12px 0;
            }

            .level {
                width: 90px;
                flex-shrink: 0;
                font-size: 13px;
            }

            .bar-track {
                flex: 1;
                background: var(--vscode-editorWidget-background);
                height: 22px;
                border-radius: 5px;
                overflow: hidden;
            }

            .bar {
                height: 100%;
                background: #64c8ff;
                border-radius: 5px;
            }

            .count {
                width: 35px;
                text-align: right;
            }

            /* Круговая диаграмма */
            .pie-container {
                display: flex;
                align-items: center;
                flex-wrap: wrap;
                gap: 30px;
                margin-top: 20px;
            }

            .pie {
                width: 170px;
                height: 170px;
                border-radius: 50%;
                background: conic-gradient(
                    #ff8585 0% ${deepPercent}%,
                    #64c8ff ${deepPercent}% 100%
                );
            }

            /* Обозначения цветов диаграммы */
            .legend {
                line-height: 2.2;
            }

            .square {
                display: inline-block;
                width: 12px;
                height: 12px;
                margin-right: 8px;
                border-radius: 3px;
            }

            .blue {
                background: #64c8ff;
            }

            .red {
                background: #ff8585;
            }

            .note {
                color: var(--vscode-descriptionForeground);
                font-size: 12px;
                margin-top: 25px;
            }
        </style>
    </head>

    <body>
        <h1>Indent Insight</h1>

        <div class="subtitle">
            Статистика файла: ${fileName}
        </div>

        <!-- Карточки статистики -->
        <div class="cards">
            <div class="card">
                <div class="number">${stats.totalLines}</div>
                <div class="label">Непустых строк</div>
            </div>

            <div class="card">
                <div class="number">${stats.maxDepth}</div>
                <div class="label">Макс. вложенность</div>
            </div>

            <div class="card">
                <div class="number">${stats.deepLines}</div>
                <div class="label">Глубоких строк</div>
            </div>
        </div>

        <!-- Столбчатая диаграмма -->
        <h2>Распределение по уровням вложенности</h2>

        <div class="chart">
            ${bars}
        </div>

        <!-- Круговая диаграмма -->
        <h2>Соотношение глубины вложенности</h2>

        <div class="pie-container">
            <div class="pie"></div>

            <div class="legend">
                <div>
                    <span class="square blue"></span>
                    Обычные строки: ${normalLines}
                </div>

                <div>
                    <span class="square red"></span>
                    Глубокие строки: ${stats.deepLines}
                </div>
            </div>
        </div>

        <div class="note">
            Глубокими считаются строки с уровнем
            вложенности больше ${DEEP_LEVEL}.
            Один уровень = ${INDENT_SIZE} пробела.
            Изменения в файле обновляют статистику автоматически.
        </div>
    </body>
    </html>
    `;
}

// Главная функция, вызываемая при активации расширения
function activate(context) {

    // Создание обычной цветной подсветки
    const normalDecorations = colors.map(color =>
        vscode.window.createTextEditorDecorationType({
            backgroundColor: makeColor(color, NORMAL_OPACITY)
        })
    );

    // Создание яркой подсветки для Focus Mode
    const focusDecorations = colors.map(color =>
        vscode.window.createTextEditorDecorationType({
            backgroundColor: makeColor(color, FOCUS_OPACITY)
        })
    );

    // Переменные для хранения панели и документа статистики
    let statisticsPanel = null;
    let statisticsDocument = null;
    let lastEditor = vscode.window.activeTextEditor;

    // Обновление подсветки отступов
    function updateDecorations(editor) {
        if (!editor) {
            return;
        }

        const document = editor.document;

        // Получение номера строки, на которой находится курсор
        const cursorLine = editor.selection.active.line;

        // Определение текущего уровня вложенности
        const activeLevel = getIndentLevel(
            document.lineAt(cursorLine).text
        );

        // Массивы диапазонов для обычной и яркой подсветки
        const normalRanges = colors.map(() => []);
        const focusRanges = colors.map(() => []);

        // Перебор строк открытого документа
        for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i).text;

            // Пропуск пустых строк
            if (line.trim().length === 0) {
                continue;
            }

            // Определение уровня вложенности строки
            const levels = getIndentLevel(line);

            // Перебор каждого уровня отступа
            for (let level = 0; level < levels; level++) {
                const start = level * INDENT_SIZE;
                const end = start + INDENT_SIZE;

                // Создание диапазона для подсветки
                const range = new vscode.Range(i, start, i, end);

                // Выбор цвета по уровню вложенности
                const colorIndex = level % colors.length;

                // Выделение активного уровня более ярким цветом
                if (level + 1 === activeLevel) {
                    focusRanges[colorIndex].push(range);
                } else {
                    normalRanges[colorIndex].push(range);
                }
            }
        }

        // Применение обычной подсветки
        normalDecorations.forEach((type, index) => {
            editor.setDecorations(type, normalRanges[index]);
        });

        // Применение яркой подсветки
        focusDecorations.forEach((type, index) => {
            editor.setDecorations(type, focusRanges[index]);
        });
    }

    // Обновление HTML-содержимого окна статистики
    function updateStatistics() {
        if (statisticsPanel && statisticsDocument) {
            statisticsPanel.webview.html =
                createStatisticsHtml(statisticsDocument);
        }
    }

    // Регистрация команды открытия статистики
    const showStatistics = vscode.commands.registerCommand(
        'indent-insight.showStatistics',
        () => {
            const editor = vscode.window.activeTextEditor || lastEditor;

            // Проверка наличия открытого документа
            if (!editor) {
                vscode.window.showWarningMessage(
                    'Сначала откройте файл с кодом.'
                );
                return;
            }

            statisticsDocument = editor.document;

            // Повторное использование существующей панели
            if (statisticsPanel) {
                updateStatistics();
                statisticsPanel.reveal(vscode.ViewColumn.Beside);
                return;
            }

            // Создание отдельной вкладки для статистики
            statisticsPanel = vscode.window.createWebviewPanel(
                'indentInsightStatistics',
                'Indent Insight — Statistics',
                vscode.ViewColumn.Beside,
                {
                    enableScripts: false
                }
            );

            // Первое заполнение вкладки статистикой
            updateStatistics();

            // Очистка ссылок после закрытия панели
            statisticsPanel.onDidDispose(() => {
                statisticsPanel = null;
                statisticsDocument = null;
            });
        }
    );

    // Добавление команды в список ресурсов расширения
    context.subscriptions.push(showStatistics);

    // Подсветка документа при запуске расширения
    updateDecorations(vscode.window.activeTextEditor);

    // Обновление при переключении между файлами
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor) {
                lastEditor = editor;
                updateDecorations(editor);
            }
        })
    );

    // Обновление при изменении содержимого документа
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(event => {
            const editor = vscode.window.activeTextEditor;

            if (editor && event.document === editor.document) {
                updateDecorations(editor);
            }

            // Обновление графиков при изменении анализируемого файла
            if (event.document === statisticsDocument) {
                updateStatistics();
            }
        })
    );

    // Обновление Focus Mode при перемещении курсора
    context.subscriptions.push(
        vscode.window.onDidChangeTextEditorSelection(event => {
            updateDecorations(event.textEditor);
        })
    );

    // Регистрация ресурсов для последующего освобождения
    context.subscriptions.push(
        ...normalDecorations,
        ...focusDecorations
    );
}

// Функция деактивации расширения
function deactivate() {}

// Экспорт функций для VS Code
module.exports = {
    activate,
    deactivate
};
