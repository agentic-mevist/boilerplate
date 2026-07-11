# lotosinbloom-growth — deep research & growth strategy

Глубокое исследование Instagram-аккаунта [@lotosinbloom](https://www.instagram.com/lotosinbloom/)
(ниша «психология и медитация для женщин»): аудит 43/100 по 10 измерениям, анализ 26 конкурентов
(1 140 постов), покадровый разбор 13 виральных reels через Gemini, стратегия роста, контент-план
и 6 готовых скриптов.

**📊 Отчёт (Cloudflare Pages): https://lotosinbloom-report.pages.dev** — закрыт паролем (`raccoon27`).
Видео и аватары стримятся из приватного R2-bucket `lotos-report-media` через Pages Functions.

## Структура репозитория

```
report/          → CF Pages проект: public/ (HTML) + functions/ (пароль-гейт, R2-стриминг)
docs/
  growth_strategy.md   → стратегия роста (позиционирование, воронка, KPI)
  content_plan.md      → контент-план на 4 недели
  content_scripts.md   → 6 скриптов контент-юнитов (полные, посекундные)
  process.md           → как делалось исследование (методология, грабли)
data/
  target/              → сырые данные @lotosinbloom (профиль, 100 постов)
  competitors/         → 26 конкурентов: профили + 1 040 постов
  videos/              → скачанные виральные reels (не в git; в R2)
  avatars/             → аватары 60 аккаунтов (не в git; в R2)
  analysis/
    audit_scores.json          → оценки 10 измерений с доказательствами
    target_summary.json        → статистика аккаунта
    target_content_analysis.json → Gemini-разбор 100 подписей
    competitor_summaries.json  → статистика 26 конкурентов
    patterns_tier{1,2,3}.json  → паттерны по ярусам (3 суб-агента)
    viral_taxonomy.json        → таксономия виральности ниши (топ-40 постов)
    trusted_circle.json        → круг доверия: 56 аккаунтов её графа, топ-6 коллабов
    reels/                     → покадровые разборы 13 виральных reels
scripts/
  apify_client.py      → клиент Apify (start/status/items/run)
  analyze_account.py   → расчёт метрик аккаунта по постам
  gemini_video.py      → скачивание + видео-анализ через Gemini Files API
  gemini_text.py       → текстовый анализ через Gemini
  batch_reel_analysis.py → батч-разбор топ-reels конкурентов
  reel_analysis_prompt.txt → структурный промпт видео-разбора
.claude/skills/
  ig-scrape/           → скилл: скрейпинг Instagram через Apify
  reel-analysis/       → скилл: анализ reels через Gemini
```

## Ключевые выводы (TL;DR)

1. **Диагноз:** аккаунт использует контент-решения (медитации) как верх воронки, а ниша
   раздаёт охват только контенту-болям. Отсюда 300 просмотров на инструкциях при
   собственном вирале 123k (провокационный POV).
2. **Потолка нет:** пиры того же размера (5-6k) пробивают 389k-885k просмотров.
3. **Формула ниши:** штамп авторитета + суперлатив с отложенной разгадкой + бытовая
   микро-сцена + рефрейм (@_rybakova: 43 поста → 49k подписчиков).
4. **Конверсия ниши:** комментарий-ключслово → DM-автоматика → Telegram → продукт.
   У аккаунта этот механизм отсутствует (TG = 75 подписчиков).
5. **План:** 4 поста/нед по слотам (боль/практика/провокация/личное), рубрика-сериал
   «Сигналы истощённой нервной системы», ключслово «ТИШИНА», починка лендинга.

## Воспроизведение

Нужны env: `APIFY_API_KEY`, `GEMINI_API_KEY`. Пайплайн описан в `docs/process.md`,
переиспользуемые рецепты — в `.claude/skills/`. Деплой отчёта:
`cd report && npx wrangler pages deploy --branch main` (конфиг в report/wrangler.toml: проект,
R2-биндинг MEDIA → bucket lotos-report-media).
