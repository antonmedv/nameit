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

## Finder Quick Action

Rename files from Finder with right-click → **Quick Actions** → **Rename with AI**.

Scripts run from Shortcuts don't load your shell profile, so store the API key in the Keychain:

```sh
security add-generic-password -a "$USER" -s OPENAI_API_KEY -w "sk-..."
```

1. In Shortcuts → Settings → Advanced, turn on **Allow Running Scripts**.
2. Create a new shortcut named "Rename with AI".
3. In its **ⓘ** Details panel, turn on **Use as Quick Action** and select **Finder**.
4. Set it to receive **Files** from **Quick Actions**.
5. Add a **Run Shell Script** action. Set Shell to `zsh`, Input to `Shortcut Input` and Pass input to **as arguments**,
   and enter:

   ```sh
   export PATH=/opt/homebrew/bin:$PATH
   export OPENAI_API_KEY=$(security find-generic-password -s OPENAI_API_KEY -w)
   nameit "$@" 2>&1
   ```

6. Optional: add **Show Notification** with **Shell Script Result** to see the new names.

The first run asks for Keychain and folder access; choose **Always Allow**. For Anthropic, use `ANTHROPIC_API_KEY` in
place of `OPENAI_API_KEY` in both places.

To set a keyboard shortcut, go to System Settings → Keyboard → Keyboard Shortcuts → Services → Files and Folders.

## License

[MIT](LICENSE)
