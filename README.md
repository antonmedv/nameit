# nameit

Rename scanned bills (and other files) with AI.

```sh
npm i -g @medv/nameit
```

```sh
nameit ~/Downloads/Scanned_document.pdf
nameit ~/docs/*
```

```
Scanned_document.pdf → 2026-06-03 Mamut - Alena - Acrobatics - 360.00 CHF.pdf
scan_0042.pdf        → 2026-01-28 Werke am Zürichsee - Electricity - 384.20 CHF.pdf
```

## Naming

nameit tells bills apart from other documents. Bills get an amount, documents get a title:

```
YYYY-MM-DD Vendor - Person - Description - Amount Currency.ext   bills
YYYY-MM-DD Issuer - Person - Title.ext                           documents
```

```
2026-05-01 Helsana - Anton - 209.00 CHF.pdf
2026-01-28 Werke am Zürichsee - Electricity - 384.20 CHF.pdf
2026-03-14 Kanton Zürich - Anton - Tax Assessment 2025.pdf
2026-08-06 Hofer - Anton - Honda CB500 Purchase.pdf
```

- **Date**: the invoice or issue date.
- **Vendor/Issuer**: a short name.
- **Person**: the first name of the person the document is for, when it names one.
- **Description**: in English. For a bill it appears only when it adds something; a document always has a title.
- **Amount**: the total, bills only.

Missing parts are skipped. Vendor and person spellings follow the existing file names in the same folder, so repeat bills
stay consistent.

nameit never overwrites a file: if the name is taken, it appends ` (2)`, ` (3)` and so on.

PDFs and images (png, jpg, gif, webp) are read by the model. Text files are read as text. Any other file is named from its
file name alone.

## Options

```
-n, --dry-run      Print new names without renaming
-m, --model <id>   Model to use
```

## Configuration

| Variable            | Description                                                    |
| ------------------- | -------------------------------------------------------------- |
| `ANTHROPIC_API_KEY` | Use Anthropic, `claude-opus-5-5` (preferred when both are set) |
| `OPENAI_API_KEY`    | Use OpenAI, `gpt-5.5`                                          |
| `NAMEIT_PROVIDER`   | Force `anthropic` or `openai`                                  |
| `NAMEIT_MODEL`      | Override the model                                             |

## License

[MIT](LICENSE)
